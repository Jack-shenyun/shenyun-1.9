import { formatDateValue, toSafeNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
  Handshake,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface PaymentRecord {
  id: number;
  paymentNo: string;
  orderNo: string;
  supplierName: string;
  supplierCode: string;
  totalAmount: number;
  paidAmount: number;
  invoiceNo: string;
  invoiceAmount: number;
  paymentMethod: string;
  bankAccount: string;
  dueDate: string;
  paymentDate: string;
  applicant: string;
  approver: string;
  status: "pending" | "partial" | "paid" | "overdue";
  remarks: string;
}

const statusMap: Record<string, any> = {
  pending: { label: "待付款", variant: "outline" as const },
  partial: { label: "部分付款", variant: "secondary" as const },
  paid: { label: "已付款", variant: "default" as const },
  overdue: { label: "已逾期", variant: "destructive" as const },
};

const paymentMethods = ["银行转账", "电汇", "支票", "承兑汇票", "现金"];



export default function PurchaseFinancePage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.paymentRecords.list.useQuery();
  const createMutation = trpc.paymentRecords.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.paymentRecords.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.paymentRecords.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const payments = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [viewingPayment, setViewingPayment] = useState<PaymentRecord | null>(null);
  const [payingPayment, setPayingPayment] = useState<PaymentRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    paymentNo: "",
    orderNo: "",
    supplierName: "",
    supplierCode: "",
    totalAmount: "",
    paidAmount: "",
    invoiceNo: "",
    invoiceAmount: "",
    paymentMethod: "银行转账",
    bankAccount: "",
    dueDate: "",
    paymentDate: "",
    applicant: "",
    approver: "",
    status: "pending",
    remarks: "",
  });

  const filteredPayments = payments.filter((p: any) => {
    const matchesSearch =
      String(p.paymentNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.supplierName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.orderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingPayment(null);
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "").substring(0, 8);
    const nextNo = payments.length + 1;
    setFormData({
      paymentNo: `PAY-${dateStr.substring(0, 4)}-${String(nextNo).padStart(4, "0")}`,
      orderNo: "",
      supplierName: "",
      supplierCode: "",
      totalAmount: "",
      paidAmount: "0",
      invoiceNo: "",
      invoiceAmount: "",
      paymentMethod: "银行转账",
      bankAccount: "",
      dueDate: "",
      paymentDate: "",
      applicant: "",
      approver: "",
      status: "pending",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setFormData({
      paymentNo: payment.paymentNo,
      orderNo: payment.orderNo,
      supplierName: payment.supplierName,
      supplierCode: payment.supplierCode,
      totalAmount: String(payment.totalAmount),
      paidAmount: String(payment.paidAmount),
      invoiceNo: payment.invoiceNo,
      invoiceAmount: String(payment.invoiceAmount),
      paymentMethod: payment.paymentMethod,
      bankAccount: payment.bankAccount,
      dueDate: payment.dueDate,
      paymentDate: payment.paymentDate,
      applicant: payment.applicant,
      approver: payment.approver,
      status: payment.status,
      remarks: payment.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (payment: PaymentRecord) => {
    setViewingPayment(payment);
    setViewDialogOpen(true);
  };

  const handleDelete = (payment: PaymentRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除付款记录" });
      return;
    }
    deleteMutation.mutate({ id: payment.id });
    toast.success("付款记录已删除");
  };

  const handlePay = (payment: PaymentRecord) => {
    setPayingPayment(payment);
    setPayAmount(String(toSafeNumber(payment.totalAmount) - toSafeNumber(payment.paidAmount)));
    setPayDialogOpen(true);
  };

  const handleConfirmPay = () => {
    if (!payingPayment) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      toast.error("请输入有效的付款金额");
      return;
    }

    const newPaidAmount = toSafeNumber(payingPayment.paidAmount) + amount;
    const newStatus: PaymentRecord["status"] =
      newPaidAmount >= toSafeNumber(payingPayment.totalAmount) ? "paid" : "partial";

    toast.success(`已付款 ¥${amount?.toLocaleString?.() ?? "0"}`);
    setPayDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.paymentNo || !formData.supplierName || !formData.totalAmount) {
      toast.error("请填写必填项", { description: "付款单号、供应商名称、付款金额为必填" });
      return;
    }

    if (editingPayment) {
      toast.success("付款记录已更新");
    } else {
      const newPayment: PaymentRecord = {
        id: Math.max(...payments.map((p: any) => p.id)) + 1,
        ...formData,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        paidAmount: parseFloat(formData.paidAmount) || 0,
        invoiceAmount: parseFloat(formData.invoiceAmount) || 0,
        status: formData.status as PaymentRecord["status"],
      };
      toast.success("付款申请创建成功");
    }
    setDialogOpen(false);
  };

  const formatCurrency = (value: unknown) =>
    `¥${toSafeNumber(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pendingTotal = payments.filter((p: any) => p.status === "pending" || p.status === "partial")
    .reduce((sum: any, p: any) => sum + (toSafeNumber(p.totalAmount) - toSafeNumber(p.paidAmount)), 0);
  const paidThisMonth = payments.filter((p: any) => p.status === "paid" || p.status === "partial")
    .reduce((sum: any, p: any) => sum + toSafeNumber(p.paidAmount), 0);
  const pendingCount = payments.filter((p: any) => p.status === "pending").length;
  const overdueCount = payments.filter((p: any) => {
    if (p.status === "paid") return false;
    return new Date(p.dueDate) < new Date();
  }).length;
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
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">财务协同</h2>
              <p className="text-sm text-muted-foreground">采购与财务的协同管理，实现发票核对和付款跟踪</p>
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
              <p className="text-sm text-muted-foreground">待付款总额</p>
              <p className="text-2xl font-bold">{formatCurrency(pendingTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本月已付</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(paidThisMonth)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待付款单</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已逾期</p>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
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
                  placeholder="搜索付款单号、供应商、采购单号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
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
                  <TableHead className="w-[130px] text-center font-bold">付款单号</TableHead>
                  <TableHead className="w-[120px] text-center font-bold">采购单号</TableHead>
                  <TableHead className="text-center font-bold">供应商名称</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">付款金额</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">已付金额</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">到期日</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment: any) => {
                  const isOverdue = payment.status !== "paid" && new Date(payment.dueDate) < new Date();
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="text-center font-medium">{payment.paymentNo}</TableCell>
                      <TableCell className="text-center">{payment.orderNo}</TableCell>
                      <TableCell className="text-center">{payment.supplierName}</TableCell>
                      <TableCell className="text-center">{formatCurrency(payment.totalAmount)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(payment.paidAmount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1">
                          {formatDateValue(payment.dueDate)}
                          {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[payment.status]?.variant || "outline"} className={getStatusSemanticClass(payment.status, statusMap[payment.status]?.label)}>
                          {statusMap[payment.status]?.label || String(payment.status ?? "-")}
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
                            <DropdownMenuItem onClick={() => handleView(payment)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(payment)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            {(payment.status === "pending" || payment.status === "partial") && (
                              <DropdownMenuItem onClick={() => handlePay(payment)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                付款
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(payment)}
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{editingPayment ? "编辑付款申请" : "新建付款申请"}</DialogTitle>
              <DialogDescription>
                {editingPayment ? "修改付款信息" : "创建新的付款申请"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>付款单号 *</Label>
                  <Input
                    value={formData.paymentNo}
                    onChange={(e) => setFormData({ ...formData, paymentNo: e.target.value })}
                    placeholder="付款单号"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>供应商名称 *</Label>
                  <Input
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    placeholder="供应商名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>供应商编码</Label>
                  <Input
                    value={formData.supplierCode}
                    onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                    placeholder="供应商编码"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>付款金额 *</Label>
                  <Input
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    placeholder="付款金额"
                  />
                </div>
                <div className="space-y-2">
                  <Label>已付金额</Label>
                  <Input
                    type="number"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    placeholder="已付金额"
                  />
                </div>
                <div className="space-y-2">
                  <Label>付款方式</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m: any) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>发票号</Label>
                  <Input
                    value={formData.invoiceNo}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    placeholder="发票号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>发票金额</Label>
                  <Input
                    type="number"
                    value={formData.invoiceAmount}
                    onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                    placeholder="发票金额"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>银行账号</Label>
                  <Input
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="收款银行账号"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>申请人</Label>
                  <Input
                    value={formData.applicant}
                    onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
                    placeholder="申请人"
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待付款</SelectItem>
                      <SelectItem value="partial">部分付款</SelectItem>
                      <SelectItem value="paid">已付款</SelectItem>
                      <SelectItem value="overdue">已逾期</SelectItem>
                    </SelectContent>
                  </Select>
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
                {editingPayment ? "保存修改" : "创建付款"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 付款对话框 */}
        <DraggableDialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>确认付款</DialogTitle>
              <DialogDescription>
                {payingPayment?.paymentNo} - {payingPayment?.supplierName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">应付金额</span>
                <span className="font-medium">{formatCurrency(payingPayment?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">已付金额</span>
                <span className="font-medium">{formatCurrency(payingPayment?.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">待付金额</span>
                <span className="font-medium text-amber-600">
                  {formatCurrency((payingPayment?.totalAmount || 0) - (payingPayment?.paidAmount || 0))}
                </span>
              </div>
              <div className="space-y-2">
                <Label>本次付款金额</Label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="输入付款金额"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmPay}>
                确认付款
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingPayment && (
      <div className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">付款详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingPayment.paymentNo}
            {viewingPayment.status && (
              <> · <Badge variant={statusMap[viewingPayment.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingPayment.status, statusMap[viewingPayment.status]?.label)}`}>
                {statusMap[viewingPayment.status]?.label || String(viewingPayment.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="供应商">{viewingPayment.supplierName}</FieldRow>
                <FieldRow label="采购单">{viewingPayment.orderNo}</FieldRow>
              </div>
              <div>
                <FieldRow label="申请人">{viewingPayment.applicant || "-"}</FieldRow>
                <FieldRow label="付款日期">{formatDateValue(viewingPayment.paymentDate)}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">财务信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="付款金额">{formatCurrency(viewingPayment.totalAmount)}</FieldRow>
                <FieldRow label="已付金额">{formatCurrency(viewingPayment.paidAmount)}</FieldRow>
                <FieldRow label="待付金额">{formatCurrency(viewingPayment.totalAmount - viewingPayment.paidAmount)}</FieldRow>
                <FieldRow label="发票号">{viewingPayment.invoiceNo || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="付款方式">{viewingPayment.paymentMethod}</FieldRow>
                <FieldRow label="银行账号">{viewingPayment.bankAccount || "-"}</FieldRow>
                <FieldRow label="到期日">{formatDateValue(viewingPayment.dueDate)}</FieldRow>
              </div>
            </div>
          </div>

          {viewingPayment.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingPayment.remarks}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => {
              setViewDialogOpen(false);
              if (viewingPayment) handleEdit(viewingPayment);
            }}>编辑</Button>
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
