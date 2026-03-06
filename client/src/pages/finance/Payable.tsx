import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue, formatNumber, safeLower, toSafeNumber } from "@/lib/formatters";

interface PayableRecord {
  id: number;
  invoiceNo: string;
  supplierName: string;
  orderNo: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: "pending" | "partial" | "paid" | "overdue";
  paymentMethod: string;
  remarks: string;
  paymentDate: string;
}

function getStatusMeta(status: unknown) {
  return statusMap[String(status ?? "")] ?? statusMap.pending;
}

const statusMap: Record<string, any> = {
  pending: { label: "待付款", variant: "outline" as const },
  partial: { label: "部分付款", variant: "secondary" as const },
  paid: { label: "已付款", variant: "default" as const },
  overdue: { label: "已逾期", variant: "destructive" as const },
};



export default function PayablePage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.accountsPayable.list.useQuery();
  const createMutation = trpc.accountsPayable.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.accountsPayable.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.accountsPayable.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const payables = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<PayableRecord | null>(null);
  const [viewingPayable, setViewingPayable] = useState<PayableRecord | null>(null);
  const [payingRecord, setPayingRecord] = useState<PayableRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    invoiceNo: "",
    supplierName: "",
    orderNo: "",
    amount: "",
    dueDate: "",
    remarks: "",
  });

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "银行转账",
    paymentDate: "",
    remarks: "",
  });

  const filteredPayables = payables.filter((p: any) => {
    const matchesSearch =
      safeLower(p.invoiceNo).includes(safeLower(searchTerm)) ||
      safeLower(p.supplierName).includes(safeLower(searchTerm));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingPayable(null);
    const today = new Date();
    const nextNo = payables.length + 1;
    setFormData({
      invoiceNo: `SINV-${today.getFullYear()}-${String(nextNo).padStart(4, "0")}`,
      supplierName: "",
      orderNo: "",
      amount: "",
      dueDate: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (payable: PayableRecord) => {
    setEditingPayable(payable);
    setFormData({
      invoiceNo: payable.invoiceNo,
      supplierName: payable.supplierName,
      orderNo: payable.orderNo,
      amount: String(payable.amount),
      dueDate: payable.dueDate,
      remarks: payable.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (payable: PayableRecord) => {
    setViewingPayable(payable);
    setViewDialogOpen(true);
  };

  const handleDelete = (payable: PayableRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除应付记录" });
      return;
    }
    deleteMutation.mutate({ id: payable.id });
    toast.success("应付记录已删除");
  };

  const handlePay = (payable: PayableRecord) => {
    setPayingRecord(payable);
    setPaymentData({
      amount: String(payable.amount - payable.paidAmount),
      paymentMethod: "银行转账",
      paymentDate: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setPaymentDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.invoiceNo || !formData.supplierName || !formData.amount) {
      toast.error("请填写必填项", { description: "发票号、供应商名称和金额为必填" });
      return;
    }

    if (editingPayable) {
      toast.success("应付记录已更新");
    } else {
      const newPayable: PayableRecord = {
        id: Math.max(...payables.map((p: any) => p.id)) + 1,
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        paidAmount: 0,
        status: "pending",
        paymentMethod: "",
        paymentDate: "",
      };
      toast.success("应付记录创建成功");
    }
    setDialogOpen(false);
  };

  const handlePaymentSubmit = () => {
    if (!payingRecord || !paymentData.amount) {
      toast.error("请填写付款金额");
      return;
    }

    const payAmount = parseFloat(paymentData.amount) || 0;
    const newPaidAmount = toSafeNumber(payingRecord.paidAmount) + payAmount;
    let newStatus: PayableRecord["status"] = "partial";
    
    if (newPaidAmount >= toSafeNumber(payingRecord.amount)) {
      newStatus = "paid";
    }

    toast.success(`付款 ¥${formatNumber(payAmount)} 成功`);
    setPaymentDialogOpen(false);
  };

  const totalAmount = payables.reduce((sum: any, p: any) => sum + toSafeNumber(p.amount), 0);
  const paidAmount = payables.reduce((sum: any, p: any) => sum + toSafeNumber(p.paidAmount), 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueAmount = payables
    .filter((p: any) => p.status === "overdue")
    .reduce((sum: any, p: any) => sum + (toSafeNumber(p.amount) - toSafeNumber(p.paidAmount)), 0);
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">应付管理</h2>
              <p className="text-sm text-muted-foreground">管理采购发票、应付账款和付款核销</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建付款
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">应付总额</p>
              <p className="text-2xl font-bold">¥{(totalAmount / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已付金额</p>
              <p className="text-2xl font-bold text-green-600">¥{(paidAmount / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待付金额</p>
              <p className="text-2xl font-bold text-amber-600">¥{(pendingAmount / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">逾期金额</p>
              <p className="text-2xl font-bold text-red-600">¥{(overdueAmount / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索发票号、供应商..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待付款</SelectItem>
                  <SelectItem value="partial">部分付款</SelectItem>
                  <SelectItem value="paid">已付款</SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[130px] text-center font-bold">发票号</TableHead>
                  <TableHead className="text-center font-bold">供应商名称</TableHead>
                  <TableHead className="w-[130px] text-center font-bold">采购单号</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">应付金额</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">已付金额</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">到期日</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayables.map((payable: any) => (
                  <TableRow key={payable.id}>
                    <TableCell className="text-center font-medium">{payable.invoiceNo}</TableCell>
                    <TableCell className="text-center">{payable.supplierName}</TableCell>
                    <TableCell className="text-center">{payable.orderNo}</TableCell>
                    <TableCell className="text-center">¥{formatNumber(payable.amount)}</TableCell>
                    <TableCell className="text-center">¥{formatNumber(payable.paidAmount)}</TableCell>
                    <TableCell className="text-center">{formatDateValue(payable.dueDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusMeta(payable.status).variant} className={getStatusSemanticClass(payable.status, getStatusMeta(payable.status).label)}>
                        {getStatusMeta(payable.status).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(payable)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(payable)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {payable.status !== "paid" && (
                            <DropdownMenuItem onClick={() => handlePay(payable)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              付款
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(payable)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{editingPayable ? "编辑应付记录" : "新建应付记录"}</DialogTitle>
              <DialogDescription>
                {editingPayable ? "修改应付账款信息" : "创建新的应付账款记录"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>发票号 *</Label>
                  <Input
                    value={formData.invoiceNo}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    placeholder="发票号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>采购单号</Label>
                  <Input
                    value={formData.orderNo}
                    onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                    placeholder="关联采购单号"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>供应商名称 *</Label>
                <Input
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="供应商名称"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>应付金额 *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>到期日</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingPayable ? "保存修改" : "创建记录"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 付款对话框 */}
        <DraggableDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>付款登记</DialogTitle>
              <DialogDescription>
                {payingRecord?.invoiceNo} - {payingRecord?.supplierName}
              </DialogDescription>
            </DialogHeader>
            {payingRecord && (
              <div className="grid gap-4 py-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>应付金额</span>
                    <span className="font-medium">¥{formatNumber(payingRecord.amount)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>已付金额</span>
                    <span className="font-medium">¥{formatNumber(payingRecord.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between mt-1 text-primary">
                    <span>待付金额</span>
                    <span className="font-medium">¥{formatNumber(toSafeNumber(payingRecord.amount) - toSafeNumber(payingRecord.paidAmount))}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>本次付款金额 *</Label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>付款方式</Label>
                    <Select
                      value={paymentData.paymentMethod}
                      onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="银行转账">银行转账</SelectItem>
                        <SelectItem value="支票">支票</SelectItem>
                        <SelectItem value="现金">现金</SelectItem>
                        <SelectItem value="承兑汇票">承兑汇票</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>付款日期</Label>
                    <Input
                      type="date"
                      value={paymentData.paymentDate}
                      onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                    placeholder="付款备注"
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handlePaymentSubmit}>
                确认付款
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingPayable && (
      <>
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">应付详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingPayable.invoiceNo}
            {viewingPayable.status && (
              <> · <Badge variant={statusMap[viewingPayable.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingPayable.status, statusMap[viewingPayable.status]?.label)}`}>
                {statusMap[viewingPayable.status]?.label || String(viewingPayable.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div className="py-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="供应商">{viewingPayable.supplierName}</FieldRow>
                <FieldRow label="采购单号">{viewingPayable.orderNo || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="到期日">{formatDateValue(viewingPayable.dueDate)}</FieldRow>
                <FieldRow label="付款方式">{viewingPayable.paymentMethod || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">金额信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="应付金额">¥{formatNumber(viewingPayable.amount)}</FieldRow>
                <FieldRow label="已付金额">¥{formatNumber(viewingPayable.paidAmount)}</FieldRow>
              </div>
              <div>
                <FieldRow label="待付金额">¥{formatNumber(toSafeNumber(viewingPayable.amount) - toSafeNumber(viewingPayable.paidAmount))}</FieldRow>
                 <FieldRow label="最近付款日">{formatDateValue(viewingPayable.paymentDate)}</FieldRow>
              </div>
            </div>
          </div>

          {viewingPayable.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingPayable.remarks}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(viewingPayable)}>编辑</Button>
            {viewingPayable.status !== "paid" && (
              <Button size="sm" onClick={() => {
                setViewDialogOpen(false);
                handlePay(viewingPayable);
              }}>
                <DollarSign className="h-4 w-4 mr-1" />
                付款
              </Button>
            )}
          </div>
        </div>
      </>
    )}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
