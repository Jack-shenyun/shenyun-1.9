import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import { Cog, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, Play, CheckCircle } from "lucide-react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

type OrderType = "finished" | "semi_finished" | "rework";

interface ProductionOrderRow {
  id: number;
  orderNo: string;
  orderType: OrderType;
  productId: number;
  productName?: string;
  productCode?: string;
  productSpec?: string;
  plannedQty: string;
  completedQty: string | null;
  unit: string | null;
  batchNo: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  productionDate: string | null;
  expiryDate: string | null;
  planId: number | null;
  status: "draft" | "planned" | "in_progress" | "completed" | "cancelled";
  salesOrderId: number | null;
  remark: string | null;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive"; color: string }> = {
  draft: { label: "草稿", variant: "outline", color: "text-gray-600" },
  planned: { label: "已计划", variant: "secondary", color: "text-blue-600" },
  in_progress: { label: "生产中", variant: "default", color: "text-amber-600" },
  completed: { label: "已完成", variant: "secondary", color: "text-green-600" },
  cancelled: { label: "已取消", variant: "destructive", color: "text-red-600" },
};

const orderTypeMap: Record<OrderType, { label: string; color: string; badge: "outline" | "secondary" | "default" | "destructive" }> = {
  finished:     { label: "成品",   color: "text-green-700",  badge: "secondary" },
  semi_finished:{ label: "半成品", color: "text-blue-700",   badge: "outline" },
  rework:       { label: "返工",   color: "text-orange-700", badge: "destructive" },
};

/**
 * 根据指令类型生成批次号
 * 成品:   YYYYMMDDNN  (如 2026031101)
 * 半成品: B + YY + MMDD + NN  (如 B26031101)
 * 返工:   F + YY + MMDD + NN  (如 F26031101)
 */
function generateBatchNo(orderType: OrderType, existingOrders: any[]): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  let prefix = "";
  let dateStr = "";
  if (orderType === "finished") {
    prefix = "";
    dateStr = `${yyyy}${mm}${dd}`;
  } else if (orderType === "semi_finished") {
    prefix = "B";
    dateStr = `${yy}${mm}${dd}`;
  } else {
    prefix = "F";
    dateStr = `${yy}${mm}${dd}`;
  }

  const fullDateStr = `${prefix}${dateStr}`;
  const todayBatches = (existingOrders as any[])
    .map((o: any) => o.batchNo || "")
    .filter((b: string) => b.startsWith(fullDateStr));

  let seq = 1;
  for (const b of todayBatches) {
    const suffix = b.replace(fullDateStr, "");
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num >= seq) seq = num + 1;
  }
  return `${fullDateStr}${String(seq).padStart(2, "0")}`;
}

/** 根据生产日期和保质期（月）计算有效期至 */
function calcExpiryDate(productionDate: string, shelfLifeMonths: number): string {
  if (!productionDate || !shelfLifeMonths) return "";
  const d = new Date(productionDate);
  d.setMonth(d.getMonth() + shelfLifeMonths);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export default function ProductionOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductionOrderRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { canDelete } = usePermission();

  // 弹窗选择器状态
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const { data: ordersRaw = [], isLoading, refetch } = trpc.productionOrders.list.useQuery(
    { search: searchTerm || undefined, status: statusFilter !== "all" ? statusFilter : undefined }
  );
  const { data: productsData = [] } = trpc.products.list.useQuery();
  const { data: productionPlansData = [] } = trpc.productionPlans.list.useQuery();
  const createMutation = trpc.productionOrders.create.useMutation({ onSuccess: () => { refetch(); toast.success("生产指令已创建"); setFormDialogOpen(false); } });
  const updateMutation = trpc.productionOrders.update.useMutation({ onSuccess: () => { refetch(); toast.success("生产指令已更新"); setFormDialogOpen(false); setViewDialogOpen(false); } });
  const deleteMutation = trpc.productionOrders.delete.useMutation({ onSuccess: () => { refetch(); toast.success("生产指令已删除"); } });

  const data: ProductionOrderRow[] = (ordersRaw as any[])
    .filter((o: any) => typeFilter === "all" || o.orderType === typeFilter)
    .map((o: any) => {
      const product = (productsData as any[]).find((p: any) => p.id === o.productId);
      return {
        ...o,
        orderType: o.orderType || "finished",
        productName: product?.name || "-",
        productCode: product?.code || "-",
        productSpec: product?.specification || "",
      };
    });

  const availablePlans = (productionPlansData as any[]).filter(
    (p: any) => p.status !== "completed" && p.status !== "cancelled"
  );

  const [formData, setFormData] = useState({
    orderType: "finished" as OrderType,
    planId: 0,
    planNo: "",
    productId: 0,
    productName: "",
    productCode: "",
    productSpec: "",
    productDescription: "",
    batchNo: "",
    plannedQty: "",
    unit: "",
    plannedStartDate: "",
    plannedEndDate: "",
    productionDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    status: "draft" as ProductionOrderRow["status"],
    remark: "",
  });

  const today = new Date().toISOString().split("T")[0];

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    const batchNo = generateBatchNo("finished", ordersRaw as any[]);
    setFormData({
      orderType: "finished",
      planId: 0,
      planNo: "",
      productId: 0,
      productName: "",
      productCode: "",
      productSpec: "",
      productDescription: "",
      batchNo,
      plannedQty: "",
      unit: "",
      plannedStartDate: today,
      plannedEndDate: "",
      productionDate: today,
      expiryDate: "",
      status: "draft",
      remark: "",
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: ProductionOrderRow) => {
    setIsEditing(true);
    setSelectedRecord(record);
    const product = (productsData as any[]).find((p: any) => p.id === record.productId);
    setFormData({
      orderType: record.orderType || "finished",
      planId: record.planId || 0,
      planNo: "",
      productId: record.productId,
      productName: product?.name || "",
      productCode: product?.code || "",
      productSpec: product?.specification || "",
      productDescription: product?.description || "",
      batchNo: record.batchNo || "",
      plannedQty: record.plannedQty,
      unit: record.unit || "",
      plannedStartDate: record.plannedStartDate ? String(record.plannedStartDate).split("T")[0] : "",
      plannedEndDate: record.plannedEndDate ? String(record.plannedEndDate).split("T")[0] : "",
      productionDate: record.productionDate ? String(record.productionDate).split("T")[0] : today,
      expiryDate: record.expiryDate ? String(record.expiryDate).split("T")[0] : "",
      status: record.status,
      remark: record.remark || "",
    });
    setFormDialogOpen(true);
  };

  const handleView = (record: ProductionOrderRow) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: ProductionOrderRow) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: record.id });
  };

  // 切换指令类型时自动重新生成批号
  const handleOrderTypeChange = (type: OrderType) => {
    const batchNo = generateBatchNo(type, ordersRaw as any[]);
    setFormData((f) => ({ ...f, orderType: type, batchNo, planId: 0, planNo: "", productId: 0, productName: "", productCode: "" }));
  };

  // 选择生产计划后自动带入产品信息
  const handlePlanSelect = (plan: any) => {
    const product = (productsData as any[]).find((p: any) => p.id === plan.productId);
    const newProductionDate = formData.productionDate || today;
    const expiryDate = product?.shelfLife ? calcExpiryDate(newProductionDate, Number(product.shelfLife)) : "";
    setFormData({
      ...formData,
      planId: plan.id,
      planNo: plan.planNo,
      productId: plan.productId,
      productName: product?.name || plan.productName || "",
      productCode: product?.code || "",
      productSpec: product?.specification || "",
      productDescription: product?.description || "",
      plannedQty: plan.plannedQty || "",
      unit: plan.unit || product?.unit || "",
      plannedEndDate: plan.plannedEndDate ? String(plan.plannedEndDate).split("T")[0] : "",
      expiryDate,
      remark: plan.salesOrderNo ? `关联销售订单: ${plan.salesOrderNo}` : formData.remark,
    });
    setPlanPickerOpen(false);
  };

  // 选择产品后自动带入信息
  const handleProductSelect = (product: any) => {
    const newProductionDate = formData.productionDate || today;
    const expiryDate = product?.shelfLife ? calcExpiryDate(newProductionDate, Number(product.shelfLife)) : "";
    setFormData({
      ...formData,
      productId: product.id,
      productName: product.name || "",
      productCode: product.code || "",
      productSpec: product.specification || "",
      productDescription: product.description || "",
      unit: product.unit || formData.unit,
      expiryDate,
    });
    setProductPickerOpen(false);
  };

  // 生产日期变化时重新计算有效期至
  const handleProductionDateChange = (date: string) => {
    const product = (productsData as any[]).find((p: any) => p.id === formData.productId);
    const expiryDate = product?.shelfLife ? calcExpiryDate(date, Number(product.shelfLife)) : formData.expiryDate;
    setFormData({ ...formData, productionDate: date, expiryDate });
  };

  const handleSubmit = () => {
    if (!formData.productId || !formData.plannedQty) {
      toast.error("请选择产品并填写计划数量");
      return;
    }
    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          orderType: formData.orderType,
          productId: formData.productId,
          plannedQty: formData.plannedQty,
          unit: formData.unit || undefined,
          batchNo: formData.batchNo || undefined,
          plannedStartDate: formData.plannedStartDate || undefined,
          plannedEndDate: formData.plannedEndDate || undefined,
          productionDate: formData.productionDate || undefined,
          expiryDate: formData.expiryDate || undefined,
          planId: formData.planId || undefined,
          status: formData.status,
          remark: formData.remark || undefined,
        },
      });
    } else {
      const orderNo = `MO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      createMutation.mutate({
        orderNo,
        orderType: formData.orderType,
        productId: formData.productId,
        plannedQty: formData.plannedQty,
        unit: formData.unit || undefined,
        batchNo: formData.batchNo || undefined,
        plannedStartDate: formData.plannedStartDate || undefined,
        plannedEndDate: formData.plannedEndDate || undefined,
        productionDate: formData.productionDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        planId: formData.planId || undefined,
        status: formData.status,
        remark: formData.remark || undefined,
      });
    }
  };

  const handleStatusChange = (record: ProductionOrderRow, newStatus: ProductionOrderRow["status"]) => {
    const updates: any = { status: newStatus };
    if (newStatus === "in_progress" && !record.actualStartDate) updates.actualStartDate = new Date().toISOString().split("T")[0];
    if (newStatus === "completed") { updates.actualEndDate = new Date().toISOString().split("T")[0]; updates.completedQty = record.plannedQty; }
    updateMutation.mutate({ id: record.id, data: updates });
  };

  const stats = {
    total: (ordersRaw as any[]).length,
    finished: (ordersRaw as any[]).filter((r: any) => r.orderType === "finished").length,
    semiFinished: (ordersRaw as any[]).filter((r: any) => r.orderType === "semi_finished").length,
    rework: (ordersRaw as any[]).filter((r: any) => r.orderType === "rework").length,
    inProgress: (ordersRaw as any[]).filter((r: any) => r.status === "in_progress").length,
  };

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">生产指令</h1>
              <p className="text-sm text-muted-foreground">管理成品、半成品及返工生产指令</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />新建生产指令</Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">全部指令</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{stats.finished}</div><div className="text-sm text-muted-foreground">成品</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-blue-600">{stats.semiFinished}</div><div className="text-sm text-muted-foreground">半成品</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-600">{stats.rework}</div><div className="text-sm text-muted-foreground">返工</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div><div className="text-sm text-muted-foreground">生产中</div></CardContent></Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索指令单号、批次号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="指令类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="finished">成品</SelectItem>
              <SelectItem value="semi_finished">半成品</SelectItem>
              <SelectItem value="rework">返工</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="planned">已计划</SelectItem>
              <SelectItem value="in_progress">生产中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">指令单号</TableHead>
                <TableHead className="text-center font-bold">指令类型</TableHead>
                <TableHead className="text-center font-bold">批次号</TableHead>
                <TableHead className="text-center font-bold">产品名称</TableHead>
                <TableHead className="text-center font-bold">生产进度</TableHead>
                <TableHead className="text-center font-bold">生产日期</TableHead>
                <TableHead className="text-center font-bold">有效期至</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record: any) => {
                const planned = Number(record.plannedQty || 0);
                const completed = Number(record.completedQty || 0);
                const progress = planned > 0 ? (completed / planned) * 100 : 0;
                const typeInfo = orderTypeMap[record.orderType as OrderType] || orderTypeMap.finished;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono">{record.orderNo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={typeInfo.badge} className={typeInfo.color}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium font-mono">{record.batchNo || "-"}</TableCell>
                    <TableCell className="text-center">
                      <div>
                        <div className="font-medium">{record.productName}</div>
                        {record.productCode && <div className="text-xs text-muted-foreground font-mono">{record.productCode}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1 w-32">
                        <div className="flex items-center justify-between text-xs">
                          <span>{completed?.toLocaleString?.() ?? "0"}</span>
                          <span className="text-muted-foreground">/ {planned?.toLocaleString?.() ?? "0"}</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{record.productionDate ? String(record.productionDate).split("T")[0] : "-"}</TableCell>
                    <TableCell className="text-center">{record.expiryDate ? String(record.expiryDate).split("T")[0] : "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                        {statusMap[record.status]?.label || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(record)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                          {record.status === "planned" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(record, "in_progress")}><Play className="h-4 w-4 mr-2" />开始生产</DropdownMenuItem>
                          )}
                          {record.status === "in_progress" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(record, "completed")}><CheckCircle className="h-4 w-4 mr-2" />完成生产</DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(record)}><Trash2 className="h-4 w-4 mr-2" />删除</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isLoading ? "加载中..." : "暂无数据"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 新建/编辑表单对话框 */}
        <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DraggableDialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑生产指令" : "新建生产指令"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">

              {/* 第一行：指令类型 + 批次号 + 状态 + 关联生产计划 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>指令类型 *</Label>
                  <Select value={formData.orderType} onValueChange={(v) => handleOrderTypeChange(v as OrderType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished">成品</SelectItem>
                      <SelectItem value="semi_finished">半成品</SelectItem>
                      <SelectItem value="rework">返工</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>批次号（自动生成）</Label>
                  <Input
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    placeholder="批次号"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ProductionOrderRow["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="planned">已计划</SelectItem>
                      <SelectItem value="in_progress">生产中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 关联生产计划（仅成品类型且新建时显示） */}
                {!isEditing && formData.orderType === "finished" ? (
                  <div className="space-y-2">
                    <Label>关联生产计划</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal text-sm"
                      onClick={() => setPlanPickerOpen(true)}
                    >
                      {formData.planId ? (
                        <span className="flex items-center gap-1">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs">{formData.planNo}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择计划...</span>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>计划开始日期</Label>
                    <Input type="date" value={formData.plannedStartDate} onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })} />
                  </div>
                )}
              </div>

              {/* 第二行：产品名称（弹窗选择） */}
              <div className="space-y-2">
                <Label>产品名称 *</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                  onClick={() => setProductPickerOpen(true)}
                >
                  {formData.productId ? (
                    <span className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="font-mono text-xs text-muted-foreground">{formData.productCode}</span>
                      <span className="font-medium">{formData.productName}</span>
                      {formData.productSpec && <span className="text-muted-foreground text-xs">· {formData.productSpec}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">点击选择产品...</span>
                  )}
                </Button>
              </div>

              {/* 产品信息展示（只读） */}
              {formData.productId > 0 && (formData.productSpec || formData.productDescription) && (
                <div className="rounded-md bg-muted/50 p-3 grid grid-cols-2 gap-2 text-sm">
                  {formData.productSpec && (
                    <div><span className="text-muted-foreground">规格型号：</span><span>{formData.productSpec}</span></div>
                  )}
                  {formData.productDescription && (
                    <div className="col-span-2"><span className="text-muted-foreground">产品描述：</span><span>{formData.productDescription}</span></div>
                  )}
                </div>
              )}

              {/* 第三行：计划数量 + 单位 + 计划开始 + 计划完成 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>计划数量 *</Label>
                  <Input type="number" value={formData.plannedQty} onChange={(e) => setFormData({ ...formData, plannedQty: e.target.value })} placeholder="数量" />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="个/套/件" />
                </div>
                <div className="space-y-2">
                  <Label>计划开始日期</Label>
                  <Input type="date" value={formData.plannedStartDate} onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>计划完成日期</Label>
                  <Input type="date" value={formData.plannedEndDate} onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })} />
                </div>
              </div>

              {/* 第四行：生产日期 + 有效期至 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>生产日期</Label>
                  <Input
                    type="date"
                    value={formData.productionDate}
                    onChange={(e) => handleProductionDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>有效期至</Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    placeholder="根据保质期自动计算"
                  />
                  {formData.productId > 0 && (() => {
                    const product = (productsData as any[]).find((p: any) => p.id === formData.productId);
                    return product?.shelfLife ? (
                      <p className="text-xs text-muted-foreground">保质期 {product.shelfLife} 个月，自动计算</p>
                    ) : null;
                  })()}
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} placeholder="输入备注信息" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>{isEditing ? "保存" : "创建"}</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 关联生产计划弹窗选择器 */}
        <EntityPickerDialog
          open={planPickerOpen}
          onOpenChange={setPlanPickerOpen}
          title="选择生产计划"
          searchPlaceholder="搜索计划编号、产品名称..."
          columns={[
            { key: "planNo", title: "计划编号", render: (p) => <span className="font-mono font-medium">{p.planNo}</span> },
            { key: "productName", title: "产品名称", render: (p) => <span className="font-medium">{p.productName || "-"}</span> },
            { key: "plannedQty", title: "计划数量", render: (p) => <span>{p.plannedQty} {p.unit}</span> },
            { key: "plannedEndDate", title: "交期", render: (p) => <span>{p.plannedEndDate ? String(p.plannedEndDate).split("T")[0] : "-"}</span> },
            { key: "salesOrderNo", title: "销售订单", render: (p) => <span className="text-muted-foreground">{p.salesOrderNo || "内部计划"}</span> },
          ]}
          rows={availablePlans}
          selectedId={formData.planId ? String(formData.planId) : ""}
          filterFn={(p, q) => {
            const lower = q.toLowerCase();
            return String(p.planNo || "").toLowerCase().includes(lower) ||
              String(p.productName || "").toLowerCase().includes(lower);
          }}
          onSelect={handlePlanSelect}
        />

        {/* 产品选择弹窗 */}
        <EntityPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          title="选择产品"
          searchPlaceholder="搜索产品编码、名称、规格..."
          columns={[
            { key: "code", title: "产品编码", render: (p) => <span className="font-mono font-medium">{p.code}</span> },
            { key: "name", title: "产品名称", render: (p) => <span className="font-medium">{p.name}</span> },
            { key: "specification", title: "规格型号", render: (p) => <span className="text-muted-foreground">{p.specification || "-"}</span> },
            { key: "unit", title: "单位" },
            { key: "shelfLife", title: "保质期", render: (p) => <span>{p.shelfLife ? `${p.shelfLife}个月` : "-"}</span> },
          ]}
          rows={(productsData as any[]).filter((p: any) => p.status === "active")}
          selectedId={formData.productId ? String(formData.productId) : ""}
          filterFn={(p, q) => {
            const lower = q.toLowerCase();
            return String(p.code || "").toLowerCase().includes(lower) ||
              String(p.name || "").toLowerCase().includes(lower) ||
              String(p.specification || "").toLowerCase().includes(lower);
          }}
          onSelect={handleProductSelect}
        />

        {/* 查看详情 */}
{selectedRecord && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent>
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">生产指令详情</h2>
        <p className="text-sm text-muted-foreground">
          {selectedRecord.orderNo}
          {selectedRecord.status && (
            <> · <Badge variant={statusMap[selectedRecord.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(selectedRecord.status, statusMap[selectedRecord.status]?.label)}`}>
              {statusMap[selectedRecord.status]?.label || String(selectedRecord.status ?? "-")}
            </Badge></>
          )}
        </p>
      </div>

      <div className="py-4 space-y-6 max-h-[65vh] overflow-y-auto pr-2">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品名称">{selectedRecord.productName}</FieldRow>
              <FieldRow label="产品编码">{selectedRecord.productCode}</FieldRow>
              <FieldRow label="规格型号">{selectedRecord.productSpec || '-'}</FieldRow>
            </div>
            <div>
              <FieldRow label="指令类型">
                <Badge variant={orderTypeMap[selectedRecord.orderType].badge} className={orderTypeMap[selectedRecord.orderType].color}>
                  {orderTypeMap[selectedRecord.orderType].label}
                </Badge>
              </FieldRow>
              <FieldRow label="批次号">{selectedRecord.batchNo || '-'}</FieldRow>
              <FieldRow label="关联计划">{selectedRecord.planId || '-'}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">生产进度</h3>
          <div className="space-y-2">
            <Progress value={(Number(selectedRecord.completedQty || 0) / Number(selectedRecord.plannedQty)) * 100} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {Number(selectedRecord.completedQty || 0).toLocaleString()} / <span className="text-muted-foreground">{Number(selectedRecord.plannedQty).toLocaleString()} {selectedRecord.unit}</span>
              </span>
              <span className="font-bold text-lg">
                {((Number(selectedRecord.completedQty || 0) / Number(selectedRecord.plannedQty)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">时间安排</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="计划开始">{selectedRecord.plannedStartDate ? String(selectedRecord.plannedStartDate).split("T")[0] : "-"}</FieldRow>
              <FieldRow label="计划完成">{selectedRecord.plannedEndDate ? String(selectedRecord.plannedEndDate).split("T")[0] : "-"}</FieldRow>
              <FieldRow label="生产日期">{selectedRecord.productionDate ? String(selectedRecord.productionDate).split("T")[0] : "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="实际开始">{selectedRecord.actualStartDate ? String(selectedRecord.actualStartDate).split("T")[0] : "-"}</FieldRow>
              <FieldRow label="实际完成">{selectedRecord.actualEndDate ? String(selectedRecord.actualEndDate).split("T")[0] : "-"}</FieldRow>
              <FieldRow label="有效期至">{selectedRecord.expiryDate ? String(selectedRecord.expiryDate).split("T")[0] : "-"}</FieldRow>
            </div>
          </div>
        </div>

        {selectedRecord.remark && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remark}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap">
          {selectedRecord.status === "planned" && (
            <Button size="sm" onClick={() => handleStatusChange(selectedRecord, "in_progress")}><Play className="h-4 w-4 mr-2" />开始生产</Button>
          )}
          {selectedRecord.status === "in_progress" && (
            <Button size="sm" onClick={() => handleStatusChange(selectedRecord, "completed")}><CheckCircle className="h-4 w-4 mr-2" />完成生产</Button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedRecord)}>删除</Button>
          )}
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
