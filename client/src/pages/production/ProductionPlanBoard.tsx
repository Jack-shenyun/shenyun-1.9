import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LayoutDashboard, Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Play, CheckCircle, AlertTriangle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  pending:     { label: "待排产", variant: "outline" },
  scheduled:   { label: "已排产", variant: "default" },
  in_progress: { label: "生产中", variant: "default" },
  completed:   { label: "已完成", variant: "secondary" },
  cancelled:   { label: "已取消", variant: "destructive" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low:    { label: "低",   color: "text-muted-foreground" },
  normal: { label: "普通", color: "text-blue-600" },
  high:   { label: "高",   color: "text-orange-500" },
  urgent: { label: "紧急", color: "text-red-600 font-bold" },
};

const planTypeMap: Record<string, string> = {
  sales_driven: "销售计划",
  internal:     "内部计划",
};

export default function ProductionPlanBoardPage() {
  const { canDelete } = usePermission();
  const { data: plans = [], isLoading, refetch } = trpc.productionPlans.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});
  const { data: salesOrders = [] } = trpc.salesOrders.list.useQuery({});

  const createMutation = trpc.productionPlans.create.useMutation({
    onSuccess: () => { refetch(); toast.success("生产计划已创建"); setDialogOpen(false); },
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

  const filteredPlans = (plans as any[]).filter((p) => {
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
    return `PP-${y}${m}${d}-${String(Date.now()).slice(-4)}`;
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
      plannedStartDate: plan.plannedStartDate ? String(plan.plannedStartDate).split("T")[0] : "",
      plannedEndDate: plan.plannedEndDate ? String(plan.plannedEndDate).split("T")[0] : "",
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

  const handleSchedule = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "scheduled" } });
    toast.success("已排产");
  };

  const handleStart = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "in_progress" } });
    toast.success("已开始生产");
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

  const pendingCount = (plans as any[]).filter((p) => p.status === "pending").length;
  const inProgressCount = (plans as any[]).filter((p) => p.status === "in_progress").length;
  const completedCount = (plans as any[]).filter((p) => p.status === "completed").length;
  const urgentCount = (plans as any[]).filter((p) => p.priority === "urgent" && p.status !== "completed").length;

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
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">生产计划看板</h2>
              <p className="text-sm text-muted-foreground">销售订单驱动排产，按交期优先级管理生产计划</p>
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
              <p className="text-sm text-muted-foreground">待排产</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">生产中</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已完成</p>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索计划编号、产品名称、销售订单..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="计划类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="sales_driven">销售计划</SelectItem>
                  <SelectItem value="internal">内部计划</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[120px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待排产</SelectItem>
                  <SelectItem value="scheduled">已排产</SelectItem>
                  <SelectItem value="in_progress">生产中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
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
                  <TableHead className="text-center font-bold">计划编号</TableHead>
                  <TableHead className="text-center font-bold">类型</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
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
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无生产计划</TableCell></TableRow>
                ) : filteredPlans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-center font-medium">{plan.planNo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{planTypeMap[plan.planType] || plan.planType}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{plan.productName || `产品#${plan.productId}`}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{plan.salesOrderNo || "-"}</TableCell>
                    <TableCell className="text-center">{plan.plannedQty} {plan.unit}</TableCell>
                    <TableCell className="text-center">
                      <span className={priorityMap[plan.priority]?.color || ""}>
                        {priorityMap[plan.priority]?.label || plan.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{plan.plannedEndDate ? String(plan.plannedEndDate).split("T")[0] : "-"}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleSchedule(plan)}>
                              <RefreshCw className="h-4 w-4 mr-2" />确认排产
                            </DropdownMenuItem>
                          )}
                          {plan.status === "scheduled" && (
                            <DropdownMenuItem onClick={() => handleStart(plan)}>
                              <Play className="h-4 w-4 mr-2" />开始生产
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
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "编辑生产计划" : "新建生产计划"}</DialogTitle>
              <DialogDescription>
                {editingPlan ? "修改生产计划信息" : "创建新的生产计划，销售计划需关联销售订单"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>计划编号 *</Label>
                  <Input
                    value={formData.planNo}
                    onChange={(e) => setFormData({ ...formData, planNo: e.target.value })}
                    placeholder="计划编号"
                    readOnly={!!editingPlan}
                  />
                </div>
                <div className="space-y-2">
                  <Label>计划类型 *</Label>
                  <Select
                    value={formData.planType}
                    onValueChange={(v) => setFormData({ ...formData, planType: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_driven">销售计划（由销售订单驱动）</SelectItem>
                      <SelectItem value="internal">内部计划（备货/研发等）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.planType === "sales_driven" && (
                <div className="space-y-2">
                  <Label>关联销售订单 *</Label>
                  <Select
                    value={formData.salesOrderId}
                    onValueChange={handleSalesOrderChange}
                  >
                    <SelectTrigger><SelectValue placeholder="选择销售订单" /></SelectTrigger>
                    <SelectContent>
                      {(salesOrders as any[]).filter((s) => s.status !== "cancelled").map((so: any) => (
                        <SelectItem key={so.id} value={String(so.id)}>
                          {so.orderNo} - {so.customerName || "客户"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                      <span className="font-mono text-xs">{(products as any[]).find((p: any) => String(p.id) === formData.productId)?.code}</span>
                      <span>{formData.productName}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">点击选择产品...</span>
                  )}
                </Button>
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
                  ]}
                  rows={(products as any[]).filter((p: any) => p.sourceType === "production" && p.status === "active")}
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
                <div className="space-y-2">
                  <Label>生产批号</Label>
                  <Input
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    placeholder="批号"
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
                  <Label>交期（计划完成）</Label>
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
          <h2 className="text-lg font-semibold">生产计划详情</h2>
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
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="产品名称">{viewingPlan.productName || `-`}</FieldRow>
                <FieldRow label="计划数量">{viewingPlan.plannedQty} {viewingPlan.unit}</FieldRow>
                <FieldRow label="计划开始">{viewingPlan.plannedStartDate ? String(viewingPlan.plannedStartDate).split("T")[0] : "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="计划类型">{planTypeMap[viewingPlan.planType] || '-'}</FieldRow>
                <FieldRow label="生产批号">{viewingPlan.batchNo || "-"}</FieldRow>
                <FieldRow label="计划交期">{viewingPlan.plannedEndDate ? String(viewingPlan.plannedEndDate).split("T")[0] : "-"}</FieldRow>
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
                  <span className={priorityMap[viewingPlan.priority]?.color}>
                    {priorityMap[viewingPlan.priority]?.label || viewingPlan.priority}
                  </span>
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
