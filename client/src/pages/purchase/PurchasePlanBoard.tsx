import { formatDate, formatDisplayNumber as formatUnifiedNumber } from "@/lib/formatters";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
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
import { PRODUCT_CATEGORY_LABELS } from "@shared/productCategories";
import { useLocation } from "wouter";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  pending:     { label: "待采购", variant: "outline" },
  scheduled:   { label: "已采购", variant: "default" },
  purchase_submitted: { label: "采购中", variant: "secondary" },
  in_progress: { label: "进行中", variant: "default" },
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
  sales_driven: "生产计划",
  internal:     "内部计划",
};

const getSourceProductionPlanNo = (plan: any) => {
  const remark = String(plan?.remark || "");
  const match = remark.match(/来自(PP-\d{8}-\d{4})/);
  return match?.[1] || "";
};

const formatDisplayNumber = (value: unknown) => {
  return formatUnifiedNumber(value);
};

export default function PurchasePlanBoardPage() {
  const PAGE_SIZE = 10;
  const { canDelete } = usePermission();
  const [, setLocation] = useLocation();
  const trpcUtils = trpc.useUtils();
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
  const createPurchaseOrderMutation = trpc.purchaseOrders.create.useMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [viewingPlan, setViewingPlan] = useState<any>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  const isPurchasablePlan = (plan: any) =>
    String(plan?.productSourceType || "") === "purchase" ||
    String(plan?.productProcurePermission || "") === "purchasable";

  // 只显示可采购的产品计划
  const filteredPlans = (plans as any[]).filter((p) => {
    if (!String(p.planNo || "").startsWith("CP-")) return false;
    if (!isPurchasablePlan(p)) return false;
    const matchSearch = !searchTerm ||
      String(p.planNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.salesOrderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchType = typeFilter === "all" || p.planType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / PAGE_SIZE));
  const pagedPlans = filteredPlans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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

  const handleGoToProduct = (plan: any) => {
    const productId = Number(plan?.productId || 0);
    if (!productId) {
      toast.error("当前计划未关联产品");
      return;
    }
    setLocation(`/rd/products?editId=${productId}&returnTo=${encodeURIComponent("/purchase/plan")}`);
  };

  const handleDelete = (plan: any) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: plan.id });
  };

  const handlePurchased = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "scheduled" } });
    toast.success("已标记为已采购");
  };

  const handleSinglePurchase = async (plan: any) => {
    if (plan.status !== "pending") {
      toast.info("当前计划不是待采购状态");
      return;
    }

    const supplierId = Number(plan.supplierId || 0);
    if (!supplierId) {
      toast.error("当前计划未配置默认供应商");
      return;
    }

    try {
      const orderId = await createPurchaseOrderMutation.mutateAsync({
        supplierId,
        orderDate: new Date().toISOString().split("T")[0],
        expectedDate: plan.plannedEndDate ? String(plan.plannedEndDate).split("T")[0] : undefined,
        totalAmount: "0",
        currency: "CNY",
        status: "draft",
        remark: `由采购计划单独采购生成：${plan.planNo}`,
        items: [{
          productId: Number(plan.productId || 0) || undefined,
          materialCode: String(plan.productCode || ""),
          materialName: String(plan.productName || `产品#${plan.productId}`),
          specification: String(plan.productSpecification || ""),
          quantity: String(plan.plannedQty || "0"),
          unit: String(plan.productUnit || plan.unit || "件"),
          unitPrice: "0",
          amount: "0",
          remark: plan.planNo ? `来源采购计划：${plan.planNo}` : undefined,
        }],
      });

      await updateMutation.mutateAsync({ id: plan.id, data: { status: "scheduled" } });
      await trpcUtils.purchaseOrders.list.invalidate();
      await trpcUtils.productionPlans.list.invalidate();
      toast.success("已生成采购草稿单");
      setLocation(`/purchase/orders?focusId=${orderId}`);
    } catch (e: any) {
      toast.error("单独采购失败", { description: e?.message || "请稍后重试" });
    }
  };

  const handleBatchPurchased = async () => {
    const pendingPlans = filteredPlans.filter((plan: any) => plan.status === "pending");
    if (pendingPlans.length === 0) {
      toast.info("当前没有可采购的待采购计划");
      return;
    }

    try {
      const groupedPlans = new Map<number, any[]>();
      const missingSupplierPlans: any[] = [];

      pendingPlans.forEach((plan: any) => {
        const supplierId = Number(plan.supplierId || 0);
        if (!supplierId) {
          missingSupplierPlans.push(plan);
          return;
        }
        const list = groupedPlans.get(supplierId) || [];
        list.push(plan);
        groupedPlans.set(supplierId, list);
      });

      if (groupedPlans.size === 0) {
        toast.error("没有可生成草稿的计划", { description: "请先在产品里配置默认供应商" });
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const createdCountByPlan = { value: 0 };

      for (const [supplierId, supplierPlans] of groupedPlans.entries()) {
        const items = supplierPlans.map((plan: any) => ({
          materialCode: String(plan.productCode || ""),
          materialName: String(plan.productName || `产品#${plan.productId}`),
          specification: String(plan.productSpecification || ""),
          quantity: String(plan.plannedQty || "0"),
          unit: String(plan.productUnit || plan.unit || "件"),
          unitPrice: "0",
          amount: "0",
          remark: plan.planNo ? `来源采购计划：${plan.planNo}` : undefined,
        }));

        await createPurchaseOrderMutation.mutateAsync({
          supplierId,
          orderDate: today,
          expectedDate: supplierPlans
            .map((plan: any) => plan.plannedEndDate)
            .filter(Boolean)
            .map((value: any) => String(value).split("T")[0])
            .sort()[0],
          totalAmount: "0",
          currency: "CNY",
          status: "draft",
          remark: `由采购计划一键采购生成：${supplierPlans.map((plan: any) => plan.planNo).filter(Boolean).join("、")}`,
          items,
        });
        createdCountByPlan.value += supplierPlans.length;
      }

      await Promise.all(
        pendingPlans
          .filter((plan: any) => Number(plan.supplierId || 0) > 0)
          .map((plan: any) =>
            updateMutation.mutateAsync({ id: plan.id, data: { status: "scheduled" } })
          )
      );

      await trpcUtils.purchaseOrders.list.invalidate();
      await trpcUtils.productionPlans.list.invalidate();

      if (missingSupplierPlans.length > 0) {
        toast.success(`已生成 ${groupedPlans.size} 张采购草稿单`, {
          description: `${createdCountByPlan.value} 条计划已进草稿库，${missingSupplierPlans.length} 条未配置默认供应商`,
        });
      } else {
        toast.success(`已生成 ${groupedPlans.size} 张采购草稿单`, {
          description: `${createdCountByPlan.value} 条计划已进入草稿库`,
        });
      }
      setLocation("/purchase/orders");
    } catch (e: any) {
      toast.error("一键采购失败", { description: e?.message || "请稍后重试" });
    }
  };

  const handleInspecting = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "in_progress" } });
    toast.success("已进入检验中");
  };

  const handleWarehoused = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "completed" } });
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
  const inProgressCount = filteredPlans.filter((p) => p.status === "scheduled" || p.status === "in_progress" || p.status === "purchase_submitted").length;
  const completedCount = filteredPlans.filter((p) => p.status === "completed").length;
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
          <div className="flex gap-2">
            <Button
              onClick={handleBatchPurchased}
              disabled={updateMutation.isPending || createPurchaseOrderMutation.isPending || pendingCount === 0}
            >
              <Truck className="h-4 w-4 mr-1" />
              一键采购
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              新建计划
            </Button>
          </div>
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
              <SelectItem value="sales_driven">生产计划</SelectItem>
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
              <SelectItem value="scheduled">已采购</SelectItem>
              <SelectItem value="purchase_submitted">采购中</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
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
                <TableHead className="text-center font-bold">来源</TableHead>
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
              ) : pagedPlans.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell className="text-center font-medium">{getSourceProductionPlanNo(plan) || plan.planNo}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{planTypeMap[plan.planType] || plan.planType}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      className="mx-auto flex max-w-[220px] flex-col items-center text-center"
                      onClick={() => handleGoToProduct(plan)}
                    >
                      <span className="font-medium text-primary hover:underline">
                        {plan.productName || `产品#${plan.productId}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        修改默认供应商
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{(plan as any).productSpecification || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{(plan as any).productUnit || plan.unit || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{plan.salesOrderNo || "-"}</TableCell>
                  <TableCell className="text-center">{formatDisplayNumber(plan.plannedQty)} {plan.unit}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleSinglePurchase(plan)}>
                            <Truck className="h-4 w-4 mr-2" />单独采购
                          </DropdownMenuItem>
                        )}
                        {plan.status === "pending" && (
                          <DropdownMenuItem onClick={() => handlePurchased(plan)}>
                            <Truck className="h-4 w-4 mr-2" />标记已采购
                          </DropdownMenuItem>
                        )}
                        {plan.status === "scheduled" && (
                          <DropdownMenuItem onClick={() => handleInspecting(plan)}>
                            <RefreshCw className="h-4 w-4 mr-2" />进入检验
                          </DropdownMenuItem>
                        )}
                        {plan.status === "in_progress" && (
                          <DropdownMenuItem onClick={() => handleWarehoused(plan)}>
                            <CheckCircle className="h-4 w-4 mr-2" />确认入库
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
          <TablePaginationFooter
            total={filteredPlans.length}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
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
                  <Label>来源</Label>
                  <Select
                    value={formData.planType}
                    onValueChange={(v) => setFormData({ ...formData, planType: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_driven">生产计划</SelectItem>
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
                  rows={(products as any[]).filter((p: any) =>
                    (p.sourceType === "purchase" || p.procurePermission === "purchasable") &&
                    p.status === "active"
                  )}
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
                    {getSourceProductionPlanNo(viewingPlan) || viewingPlan.planNo}
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
                        <FieldRow label="产品分类">{PRODUCT_CATEGORY_LABELS[(viewingPlan as any).productCategory as keyof typeof PRODUCT_CATEGORY_LABELS] || "-"}</FieldRow>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">采购信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="采购数量">{formatDisplayNumber(viewingPlan.plannedQty)} {viewingPlan.unit}</FieldRow>
                        <FieldRow label="计划开始">{formatDate(viewingPlan.plannedStartDate)}</FieldRow>
                        <FieldRow label="到货交期">{formatDate(viewingPlan.plannedEndDate)}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="来源">{planTypeMap[viewingPlan.planType] || '-'}</FieldRow>
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
