import { formatDate } from "@/lib/formatters";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ShoppingCart, Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  CheckCircle, AlertTriangle, RefreshCw, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  pending:     { label: "待采购", variant: "outline" },
  purchased:   { label: "已采购", variant: "default" },
  inspecting:  { label: "检验中", variant: "default" },
  warehoused:  { label: "已入库", variant: "secondary" },
  completed:   { label: "已完成", variant: "secondary" },
  cancelled:   { label: "已取消", variant: "destructive" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low:      { label: "低",   color: "text-muted-foreground" },
  normal:   { label: "普通", color: "text-green-600" },
  high:     { label: "高",   color: "text-orange-500" },
  urgent:   { label: "紧急", color: "text-yellow-500 font-bold" },
  critical: { label: "加急", color: "text-red-600 font-bold" },
};

// 动态优先级判定：根据剩余交期天数计算
const calcDynamicPriority = (plan: any): string => {
  if (!plan.plannedEndDate) return plan.priority || "normal";
  const due = new Date(String(plan.plannedEndDate));
  due.setMinutes(due.getMinutes() + due.getTimezoneOffset());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= 5) return "urgent";
  if (daysLeft > 10) return "normal";
  return "high";
};

const planTypeMap: Record<string, string> = {
  sales_driven: "销售计划",
  internal:     "内部计划",
};

// 时区安全的日期格式化
const formatDate = (val: unknown) => {
  if (!val) return "-";
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return "-";
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

export default function PurchasePlanBoardPage() {
  const { canDelete } = usePermission();
  const { data: plans = [], isLoading, refetch } = trpc.productionPlans.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});
  const { data: salesOrders = [] } = trpc.salesOrders.list.useQuery({});

  const createMutation = trpc.productionPlans.create.useMutation({
    onSuccess: () => { refetch(); toast.success("采购计划已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.productionPlans.update.useMutation({
    onSuccess: () => { refetch(); toast.success("计划已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.productionPlans.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("计划已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [viewingPlan, setViewingPlan] = useState<any>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const [formData, setFormData] = useState({
    planNo: "",
    planType: "sales_driven" as "sales_driven" | "internal",
    salesOrderId: "",
    salesOrderNo: "",
    productId: "",
    productName: "",
    plannedQty: "",
    unit: "件",
    batchNo: "",
    plannedStartDate: "",
    plannedEndDate: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    remark: "",
  });

  // 只显示采购来源的产品计划
  const filteredPlans = (plans as any[]).filter((p) => {
    if (p.productSourceType !== "purchase") return false;
    const matchSearch = !searchTerm ||
      String(p.planNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.salesOrderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchType = typeFilter === "all" || p.planType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const genPlanNo = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `CP-${y}${m}${d}-${String(Date.now()).slice(-4)}`;
  };

  const handleAdd = () => {
    setEditingPlan(null);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      planNo: genPlanNo(),
      planType: "sales_driven",
      salesOrderId: "",
      salesOrderNo: "",
      productId: "",
      productName: "",
      plannedQty: "",
      unit: "件",
      batchNo: "",
      plannedStartDate: today,
      plannedEndDate: "",
      priority: "normal",
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      planNo: plan.planNo,
      planType: plan.planType,
      salesOrderId: plan.salesOrderId ? String(plan.salesOrderId) : "",
      salesOrderNo: plan.salesOrderNo || "",
      productId: plan.productId ? String(plan.productId) : "",
      productName: plan.productName || "",
      plannedQty: plan.plannedQty || "",
      unit: plan.unit || "件",
      batchNo: plan.batchNo || "",
      plannedStartDate: plan.plannedStartDate ? formatDate(plan.plannedStartDate) : "",
      plannedEndDate: plan.plannedEndDate ? formatDate(plan.plannedEndDate) : "",
      priority: plan.priority || "normal",
      remark: plan.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (plan: any) => {
    setViewingPlan(plan);
    setViewDialogOpen(true);
  };

  const handleDelete = (plan: any) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: plan.id });
  };

  const handlePurchased = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "purchased" } });
    toast.success("已标记为已采购");
  };

  const handleInspecting = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "inspecting" } });
    toast.success("已进入检验中");
  };

  const handleWarehoused = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "warehoused" } });
    toast.success("已入库");
  };

  const handleComplete = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "completed" } });
    toast.success("采购已完成");
  };

  const handleProductChange = (productId: string) => {
    const product = (products as any[]).find((p) => String(p.id) === productId);
    setFormData((f) => ({
      ...f,
      productId,
      productName: product?.name || "",
      unit: product?.unit || f.unit,
    }));
  };

  const handleSalesOrderChange = (soId: string) => {
    const so = (salesOrders as any[]).find((s) => String(s.id) === soId);
    setFormData((f) => ({
      ...f,
      salesOrderId: soId,
      salesOrderNo: so?.orderNo || "",
    }));
  };

  const handleSubmit = () => {
    if (!formData.planNo || !formData.productId || !formData.plannedQty) {
      toast.error("请填写必填项", { description: "计划编号、产品、计划数量为必填" });
      return;
    }
    if (formData.planType === "sales_driven" && !formData.salesOrderId) {
      toast.error("销售计划必须关联销售订单");
      return;
    }
    const payload = {
      planNo: formData.planNo,
      planType: formData.planType,
      salesOrderId: formData.salesOrderId ? Number(formData.salesOrderId) : undefined,
      salesOrderNo: formData.salesOrderNo || undefined,
      productId: Number(formData.productId),
      productName: formData.productName || undefined,
      plannedQty: formData.plannedQty,
      unit: formData.unit || undefined,
      batchNo: formData.batchNo || undefined,
      plannedStartDate: formData.plannedStartDate || undefined,
      plannedEndDate: formData.plannedEndDate || undefined,
      priority: formData.priority,
      remark: formData.remark || undefined,
    };
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: payload });
    } else {
      createMutation.mutate({ ...payload, status: "pending" });
    }
  };

  const pendingCount = filteredPlans.filter((p) => p.status === "pending").length;
  const inProgressCount = filteredPlans.filter((p) => p.status === "purchased" || p.status === "inspecting").length;
  const completedCount = filteredPlans.filter((p) => p.status === "completed" || p.status === "warehoused").length;
  const urgentCount = filteredPlans.filter((p) => { const dp = calcDynamicPriority(p); return (dp === "urgent" || dp === "critical") && p.status !== "completed"; }).length;

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
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">采购计划看板</h2>
              <p className="text-sm text-muted-foreground">销售订单驱动采购，按交期优先级管理外购物料计划</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建计划
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待采购</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">进行中</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已入库/已完成</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">紧急任务</p>
              <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索计划编号、产品名称、销售订单..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="sales_driven">销售计划</SelectItem>
              <SelectItem value="internal">内部计划</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待采购</SelectItem>
              <SelectItem value="purchased">已采购</SelectItem>
              <SelectItem value="inspecting">检验中</SelectItem>
              <SelectItem value="warehoused">已入库</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 计划列表 */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center font-bold">计划编号</TableHead>
                <TableHead className="text-center font-bold">类型</TableHead>
                <TableHead className="text-center font-bold">产品名称</TableHead>
                <TableHead className="text-center font-bold">规格型号</TableHead>
                <TableHead className="text-center font-bold">单位</TableHead>
                <TableHead className="text-center font-bold">关联销售单</TableHead>
                <TableHead className="text-center font-bold">计划数量</TableHead>
                <TableHead className="text-center font-bold">优先级</TableHead>
                <TableHead className="text-center font-bold">交期</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : filteredPlans.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">暂无采购计划</TableCell></TableRow>
              ) : filteredPlans.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell className="text-center font-medium">{plan.planNo}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{planTypeMap[plan.planType] || plan.planType}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{plan.productName || `产品#${plan.productId}`}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{(plan as any).productSpecification || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{(plan as any).productUnit || plan.unit || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{plan.salesOrderNo || "-"}</TableCell>
                  <TableCell className="text-center">{plan.plannedQty} {plan.unit}</TableCell>
                  <TableCell className="text-center">
                    {(() => { const dp = calcDynamicPriority(plan); return <span className={priorityMap[dp]?.color || ""}>{priorityMap[dp]?.label || dp}</span>; })()}
                  </TableCell>
                  <TableCell className="text-center">{formatDate(plan.plannedEndDate)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusMap[plan.status]?.variant || "outline"} className={getStatusSemanticClass(plan.status, statusMap[plan.status]?.label)}>
                      {statusMap[plan.status]?.label || plan.status}
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
                        <DropdownMenuItem onClick={() => handleView(plan)}>
                          <Eye className="h-4 w-4 mr-2" />查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(plan)}>
                          <Edit className="h-4 w-4 mr-2" />编辑
                        </DropdownMenuItem>
                        {plan.status === "pending" && (
                          <DropdownMenuItem onClick={() => handlePurchased(plan)}>
                            <Truck className="h-4 w-4 mr-2" />标记已采购
                          </DropdownMenuItem>
                        )}
                        {plan.status === "purchased" && (
                          <DropdownMenuItem onClick={() => handleInspecting(plan)}>
                            <RefreshCw className="h-4 w-4 mr-2" />进入检验
                          </DropdownMenuItem>
                        )}
                        {plan.status === "inspecting" && (
                          <DropdownMenuItem onClick={() => handleWarehoused(plan)}>
                            <CheckCircle className="h-4 w-4 mr-2" />确认入库
                          </DropdownMenuItem>
                        )}
                        {plan.status === "warehoused" && (
                          <DropdownMenuItem onClick={() => handleComplete(plan)}>
                            <CheckCircle className="h-4 w-4 mr-2" />标记完成
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />删除
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "编辑采购计划" : "新建采购计划"}</DialogTitle>
              <DialogDescription>填写采购计划信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>计划编号 *</Label>
                  <Input
                    value={formData.planNo}
                    onChange={(e) => setFormData({ ...formData, planNo: e.target.value })}
                    placeholder="CP-YYYYMMDD-XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>计划类型</Label>
                  <Select
                    value={formData.planType}
                    onValueChange={(v) => setFormData({ ...formData, planType: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_driven">销售计划</SelectItem>
                      <SelectItem value="internal">内部计划</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.planType === "sales_driven" && (
                <div className="space-y-2">
                  <Label>关联销售订单 *</Label>
                  <Select value={formData.salesOrderId} onValueChange={handleSalesOrderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择销售订单" />
                    </SelectTrigger>
                    <SelectContent>
                      {(salesOrders as any[]).filter((s) => s.status !== "cancelled").map((so: any) => (
                        <SelectItem key={so.id} value={String(so.id)}>
                          {so.orderNo} - {so.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>产品 *</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={formData.productName || (formData.productId ? `产品#${formData.productId}` : "")}
                    placeholder="点击选择产品"
                    className="flex-1 cursor-pointer"
                    onClick={() => setProductPickerOpen(true)}
                  />
                  <Button type="button" variant="outline" onClick={() => setProductPickerOpen(true)}>选择</Button>
                </div>
                <EntityPickerDialog
                  open={productPickerOpen}
                  onOpenChange={setProductPickerOpen}
                  title="选择产品"
                  columns={[
                    { key: "code", title: "产品编码", render: (p) => <span className="font-mono font-medium">{p.code}</span> },
                    { key: "name", title: "产品名称", render: (p) => <span className="font-medium">{p.name}</span> },
                    { key: "specification", title: "规格型号", render: (p) => <span className="text-muted-foreground">{p.specification || "-"}</span> },
                    { key: "unit", title: "单位" },
                  ]}
                  rows={(products as any[]).filter((p: any) => p.sourceType === "purchase" && p.status === "active")}
                  selectedId={formData.productId}
                  filterFn={(p, q) => {
                    const lower = q.toLowerCase();
                    return p.code?.toLowerCase().includes(lower) || p.name?.toLowerCase().includes(lower) || p.specification?.toLowerCase().includes(lower);
                  }}
                  onSelect={(p) => {
                    handleProductChange(String(p.id));
                    setProductPickerOpen(false);
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>计划数量 *</Label>
                  <Input
                    type="number"
                    value={formData.plannedQty}
                    onChange={(e) => setFormData({ ...formData, plannedQty: e.target.value })}
                    placeholder="数量"
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="件/套/个"
                  />
                </div>

              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>计划开始日期</Label>
                  <Input
                    type="date"
                    value={formData.plannedStartDate}
                    onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>交期（到货日期）</Label>
                  <Input
                    type="date"
                    value={formData.plannedEndDate}
                    onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="normal">普通</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="urgent">紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingPlan ? "保存修改" : "创建计划"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent>
            {viewingPlan && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-lg font-semibold">采购计划详情</h2>
                  <p className="text-sm text-muted-foreground">
                    {viewingPlan.planNo}
                    {viewingPlan.status && (
                      <> · <Badge variant={statusMap[viewingPlan.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingPlan.status, statusMap[viewingPlan.status]?.label)}`}>
                        {statusMap[viewingPlan.status]?.label || String(viewingPlan.status ?? "-")}
                      </Badge></>
                    )}
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">产品信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="产品名称">{viewingPlan.productName || `-`}</FieldRow>
                        <FieldRow label="产品编码">{(viewingPlan as any).productCode || "-"}</FieldRow>
                        <FieldRow label="规格型号">{(viewingPlan as any).productSpecification || "-"}</FieldRow>
                        <FieldRow label="计量单位">{(viewingPlan as any).productUnit || viewingPlan.unit || "-"}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="生产厂家">{(viewingPlan as any).productManufacturer || "-"}</FieldRow>
                        <FieldRow label="注册证号">{(viewingPlan as any).productRegistrationNo || "-"}</FieldRow>
                        <FieldRow label="产品分类">{{ finished: "成品", semi_finished: "半成品", raw_material: "原材料", auxiliary: "辅料", other: "其他" }[(viewingPlan as any).productCategory as string] || "-"}</FieldRow>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">采购信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="采购数量">{viewingPlan.plannedQty} {viewingPlan.unit}</FieldRow>
                        <FieldRow label="计划开始">{formatDate(viewingPlan.plannedStartDate)}</FieldRow>
                        <FieldRow label="到货交期">{formatDate(viewingPlan.plannedEndDate)}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="计划类型">{planTypeMap[viewingPlan.planType] || '-'}</FieldRow>
                        {viewingPlan.remark && <FieldRow label="采购备注">{viewingPlan.remark}</FieldRow>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">关联信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="关联销售单">{viewingPlan.salesOrderNo || "-"}</FieldRow>
                      </div>
                      <div>
                <FieldRow label="优先级">
                  {(() => { const dp = calcDynamicPriority(viewingPlan); return <span className={priorityMap[dp]?.color}>{priorityMap[dp]?.label || dp}</span>; })()}
                </FieldRow>
                      </div>
                    </div>
                  </div>

                  {viewingPlan.remark && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                      <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingPlan.remark}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                  <div className="flex gap-2 flex-wrap"></div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                    <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(viewingPlan); }}>编辑</Button>
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
