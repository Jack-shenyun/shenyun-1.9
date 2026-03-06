import { formatDateValue } from "@/lib/formatters";
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
  Ship,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { getStatusSemanticClass } from "@/lib/statusStyle";

interface CustomsRecord {
  id: number;
  declarationNo: string;
  orderNo: string;
  customerName: string;
  productName: string;
  quantity: number;
  unit: string;
  currency: string;
  amount: number;
  destination: string;
  portOfLoading: string;
  portOfDischarge: string;
  shippingMethod: string;
  hsCode: string;
  status: "preparing" | "submitted" | "cleared" | "shipped";
  declarationDate: string;
  clearanceDate: string;
  shippingDate: string;
  trackingNo: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  preparing: { label: "准备中", variant: "outline" as const },
  submitted: { label: "已申报", variant: "secondary" as const },
  cleared: { label: "已通关", variant: "default" as const },
  shipped: { label: "已发运", variant: "secondary" as const },
};



const currencyOptions = ["USD", "EUR", "GBP", "JPY", "CNY"];
const shippingMethodOptions = ["海运", "空运", "陆运", "快递"];
const portOptions = ["上海港", "深圳港", "宁波港", "青岛港", "天津港", "广州港"];

export default function CustomsPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.customs.list.useQuery();
  const createMutation = trpc.customs.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.customs.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.customs.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const records = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustomsRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<CustomsRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    declarationNo: "",
    orderNo: "",
    customerName: "",
    productName: "",
    quantity: 0,
    unit: "台",
    currency: "USD",
    amount: 0,
    destination: "",
    portOfLoading: "",
    portOfDischarge: "",
    shippingMethod: "海运",
    hsCode: "",
    status: "preparing",
    declarationDate: "",
    clearanceDate: "",
    shippingDate: "",
    trackingNo: "",
    remarks: "",
  });

  const filteredRecords = records.filter((r: any) => {
    const matchesSearch =
      String(r.declarationNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.orderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.customerName ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingRecord(null);
    const nextNo = records.length + 1;
    setFormData({
      declarationNo: `CD-2026-${String(nextNo).padStart(3, "0")}`,
      orderNo: "",
      customerName: "",
      productName: "",
      quantity: 0,
      unit: "台",
      currency: "USD",
      amount: 0,
      destination: "",
      portOfLoading: "",
      portOfDischarge: "",
      shippingMethod: "海运",
      hsCode: "",
      status: "preparing",
      declarationDate: new Date().toISOString().split("T")[0],
      clearanceDate: "",
      shippingDate: "",
      trackingNo: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: CustomsRecord) => {
    setEditingRecord(record);
    setFormData({
      declarationNo: record.declarationNo,
      orderNo: record.orderNo,
      customerName: record.customerName,
      productName: record.productName,
      quantity: record.quantity,
      unit: record.unit,
      currency: record.currency,
      amount: record.amount,
      destination: record.destination,
      portOfLoading: record.portOfLoading,
      portOfDischarge: record.portOfDischarge,
      shippingMethod: record.shippingMethod,
      hsCode: record.hsCode,
      status: record.status,
      declarationDate: record.declarationDate,
      clearanceDate: record.clearanceDate,
      shippingDate: record.shippingDate,
      trackingNo: record.trackingNo,
      remarks: record.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (record: CustomsRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: CustomsRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除报关记录" });
      return;
    }
    deleteMutation.mutate({ id: record.id });
    toast.success("报关记录已删除");
  };

  const handleClearance = (record: CustomsRecord) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        status: "cleared",
        clearanceDate: new Date().toISOString().split("T")[0],
      },
    });
    toast.success("报关已通关");
  };

  const handleShip = (record: CustomsRecord) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        status: "shipped",
        shippingDate: new Date().toISOString().split("T")[0],
      },
    });
    toast.success("货物已发运");
  };

  // Issue 9: 生成报关单据（委托书、装箱单、商业发票）
  const handleGenerateDocument = (record: CustomsRecord, docType: "委托书" | "装箱单" | "商业发票") => {
    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("zh-CN") : new Date().toLocaleDateString("zh-CN");
    let content = "";
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥" };
    const currSymbol = symbols[record.currency] || record.currency;

    if (docType === "委托书") {
      content = [
        "报关委托书",
        "=".repeat(40),
        `委托编号: ${record.declarationNo}`,
        `委托日期: ${formatDate(record.declarationDate)}`,
        "",
        "一、委托方信息",
        `公司名称: 神韵医疗科技有限公司`,
        "",
        "二、报关商品信息",
        `商品名称: ${record.productName}`,
        `数    量: ${record.quantity} ${record.unit}`,
        `金    额: ${currSymbol}${record.amount?.toLocaleString?.() ?? "0"}`,
        `HS编码: ${record.hsCode || "待填"}`,
        `目的地: ${record.destination}`,
        "",
        "三、运输信息",
        `运输方式: ${record.shippingMethod}`,
        `起运港: ${record.portOfLoading || "待填"}`,
        `目的港: ${record.portOfDischarge || "待填"}`,
        "",
        "四、客户信息",
        `客户名称: ${record.customerName}`,
        `关联订单: ${record.orderNo}`,
        "",
        `备注: ${record.remarks || "无"}`,
      ].join("\n");
    } else if (docType === "装箱单") {
      content = [
        "PACKING LIST (装箱单)",
        "=".repeat(40),
        `单据编号: PL-${record.declarationNo}`,
        `日    期: ${formatDate(record.declarationDate)}`,
        "",
        `发货人: 神韵医疗科技有限公司`,
        `收货人: ${record.customerName}`,
        `目的地: ${record.destination}`,
        "",
        "-".repeat(60),
        `品名          数量      单位      备注`,
        "-".repeat(60),
        `${record.productName}    ${record.quantity}    ${record.unit}    `,
        "-".repeat(60),
        "",
        `运输方式: ${record.shippingMethod}`,
        `起运港: ${record.portOfLoading || "待填"}`,
        `目的港: ${record.portOfDischarge || "待填"}`,
      ].join("\n");
    } else {
      content = [
        "COMMERCIAL INVOICE (商业发票)",
        "=".repeat(40),
        `发票编号: INV-${record.declarationNo}`,
        `日    期: ${formatDate(record.declarationDate)}`,
        "",
        `卖方: 神韵医疗科技有限公司`,
        `买方: ${record.customerName}`,
        "",
        "-".repeat(60),
        `品名          数量    单位    单价       金额`,
        "-".repeat(60),
        `${record.productName}    ${record.quantity}    ${record.unit}    ${currSymbol}${(record.amount / (record.quantity || 1)).toFixed(2)}    ${currSymbol}${record.amount?.toLocaleString?.() ?? "0"}`,
        "-".repeat(60),
        `合计: ${currSymbol}${record.amount?.toLocaleString?.() ?? "0"}`,
        "",
        `货币: ${record.currency}`,
        `目的地: ${record.destination}`,
        `关联订单: ${record.orderNo}`,
        `HS编码: ${record.hsCode || "待填"}`,
      ].join("\n");
    }

    // 下载文件
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}_${record.declarationNo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${docType}已生成并下载`);
  };

  const handleSubmit = () => {
    if (!formData.orderNo || !formData.customerName || !formData.destination) {
      toast.error("请填写必填项", { description: "关联订单、客户名称、目的地为必填" });
      return;
    }

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          ...formData,
          quantity: Number(formData.quantity),
          amount: Number(formData.amount),
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        quantity: Number(formData.quantity),
        amount: Number(formData.amount),
      } as any);
    }
    setDialogOpen(false);
  };

  const formatAmount = (currency: string, amount: number) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥" };
    return `${symbols[currency] || currency}${amount?.toLocaleString?.() ?? "0"}`;
  };

  const clearedCount = records.filter((r: any) => r.status === "cleared").length;
  const pendingCount = records.filter((r: any) => r.status === "submitted").length;
  const totalAmount = records.reduce((sum: any, r: any) => sum + r.amount, 0);

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
              <Ship className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">报关管理</h2>
              <p className="text-sm text-muted-foreground">管理出口订单的报关流程和单据</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建报关
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本月报关</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">报关总额</p>
              <p className="text-2xl font-bold text-green-600">${(totalAmount / 1000).toFixed(0)}K</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待通关</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-2xl font-bold text-blue-600">{clearedCount}</p>
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
                  placeholder="搜索报关单号、订单号、客户..."
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
                  <SelectItem value="preparing">准备中</SelectItem>
                  <SelectItem value="submitted">已申报</SelectItem>
                  <SelectItem value="cleared">已通关</SelectItem>
                  <SelectItem value="shipped">已发运</SelectItem>
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
                  <TableHead className="w-[120px] text-center font-bold">报关单号</TableHead>
                  <TableHead className="w-[130px] text-center font-bold">关联订单</TableHead>
                  <TableHead className="text-center font-bold">客户名称</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">报关金额</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">目的地</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">报关日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center font-medium">{record.declarationNo}</TableCell>
                      <TableCell className="text-center">{record.orderNo}</TableCell>
                      <TableCell className="text-center">{record.customerName}</TableCell>
                      <TableCell className="text-center">{formatAmount(record.currency, record.amount)}</TableCell>
                      <TableCell className="text-center">{record.destination}</TableCell>
                      <TableCell className="text-center">
                      <Badge
                        variant={statusMap[record.status]?.variant || "outline"}
                        className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}
                      >
                        {statusMap[record.status]?.label || String(record.status ?? "-")}
                      </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatDateValue(record.declarationDate)}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(record)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            {record.status === "submitted" && (
                              <DropdownMenuItem onClick={() => handleClearance(record)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                确认通关
                              </DropdownMenuItem>
                            )}
                            {record.status === "cleared" && (
                              <DropdownMenuItem onClick={() => handleShip(record)}>
                                <Truck className="h-4 w-4 mr-2" />
                                确认发运
                              </DropdownMenuItem>
                            )}
                            {/* Issue 9: 报关单据生成 */}
                            <DropdownMenuItem onClick={() => handleGenerateDocument(record, "委托书")}>
                              📄 生成委托书
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateDocument(record, "装箱单")}>
                              📦 生成装箱单
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateDocument(record, "商业发票")}>
                              🧾 生成商业发票
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(record)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecord ? "编辑报关信息" : "新建报关"}</DialogTitle>
              <DialogDescription>
                {editingRecord ? "修改报关单据信息" : "录入新的报关单据"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>报关单号</Label>
                  <Input value={formData.declarationNo} disabled />
                </div>
                <div className="space-y-2">
                  <Label>关联订单 *</Label>
                  <Input
                    value={formData.orderNo}
                    onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                    placeholder="销售订单号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>客户名称 *</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="客户名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>目的地 *</Label>
                  <Input
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="目的国家/地区"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>产品名称</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="出口产品名称"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>数量</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>币种</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((c: any) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>金额</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HS编码</Label>
                  <Input
                    value={formData.hsCode}
                    onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
                    placeholder="海关商品编码"
                  />
                </div>
                <div className="space-y-2">
                  <Label>运输方式</Label>
                  <Select
                    value={formData.shippingMethod}
                    onValueChange={(value) => setFormData({ ...formData, shippingMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethodOptions.map((m: any) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>起运港</Label>
                  <Select
                    value={formData.portOfLoading}
                    onValueChange={(value) => setFormData({ ...formData, portOfLoading: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择起运港" />
                    </SelectTrigger>
                    <SelectContent>
                      {portOptions.map((p: any) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>目的港</Label>
                  <Input
                    value={formData.portOfDischarge}
                    onChange={(e) => setFormData({ ...formData, portOfDischarge: e.target.value })}
                    placeholder="目的港口"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>报关日期</Label>
                  <Input
                    type="date"
                    value={formData.declarationDate}
                    onChange={(e) => setFormData({ ...formData, declarationDate: e.target.value })}
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
                      <SelectItem value="preparing">准备中</SelectItem>
                      <SelectItem value="submitted">已申报</SelectItem>
                      <SelectItem value="cleared">已通关</SelectItem>
                      <SelectItem value="shipped">已发运</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>运单号</Label>
                  <Input
                    value={formData.trackingNo}
                    onChange={(e) => setFormData({ ...formData, trackingNo: e.target.value })}
                    placeholder="物流运单号"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="其他备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingRecord ? "保存修改" : "创建报关"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {
  /* 查看详情对话框 */
}
{viewingRecord && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent>
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">报关详情</h2>
        <p className="text-sm text-muted-foreground">
          {viewingRecord.declarationNo}
          {viewingRecord.status && (
            <>
              {" "}
              ·{" "}
              <Badge
                variant={statusMap[viewingRecord.status]?.variant || "outline"}
                className={`ml-1 ${getStatusSemanticClass(
                  viewingRecord.status,
                  statusMap[viewingRecord.status]?.label
                )}`}
              >
                {statusMap[viewingRecord.status]?.label ||
                  String(viewingRecord.status ?? "-")}
              </Badge>
            </>
          )}
        </p>
      </div>

      <div className="space-y-6 py-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            基本信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="客户名称">{viewingRecord.customerName}</FieldRow>
              <FieldRow label="关联订单">{viewingRecord.orderNo}</FieldRow>
              <FieldRow label="目的地">{viewingRecord.destination}</FieldRow>
            </div>
            <div>
              <FieldRow label="报关金额">
                {formatAmount(viewingRecord.currency, viewingRecord.amount)}
              </FieldRow>
              <FieldRow label="报关日期">
                {formatDateValue(viewingRecord.declarationDate)}
              </FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            产品信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品名称">
                {viewingRecord.productName || "-"}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="数量">
                {viewingRecord.quantity} {viewingRecord.unit}
              </FieldRow>
              <FieldRow label="HS编码">{viewingRecord.hsCode || "-"}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            物流信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="运输方式">{viewingRecord.shippingMethod}</FieldRow>
              <FieldRow label="起运港">
                {viewingRecord.portOfLoading || "-"}
              </FieldRow>
              <FieldRow label="目的港">
                {viewingRecord.portOfDischarge || "-"}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="运单号">{viewingRecord.trackingNo || "-"}</FieldRow>
              <FieldRow label="通关日期">
                {formatDateValue(viewingRecord.clearanceDate)}
              </FieldRow>
              <FieldRow label="发运日期">
                {formatDateValue(viewingRecord.shippingDate)}
              </FieldRow>
            </div>
          </div>
        </div>

        {viewingRecord.remarks && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              备注
            </h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
              {viewingRecord.remarks}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap">{/* 左侧功能按钮 */}</div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewDialogOpen(false)}
          >
            关闭
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setViewDialogOpen(false);
              if (viewingRecord) handleEdit(viewingRecord);
            }}
          >
            编辑
          </Button>
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
