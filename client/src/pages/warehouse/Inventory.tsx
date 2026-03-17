import { formatDate, formatDateTime, formatDisplayNumber } from "@/lib/formatters";
import { useEffect, useMemo, useState } from "react";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_OPTIONS } from "@shared/productCategories";
import {
  Boxes,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpDown,
  AlertTriangle,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useLocation } from "wouter";

const statusMap: Record<string, any> = {
  qualified: { label: "正常", variant: "default" as const },
  quarantine: { label: "待检", variant: "secondary" as const },
  unqualified: { label: "不合格", variant: "destructive" as const },
  reserved: { label: "预留", variant: "outline" as const },
};

// 产品分类映射
const productCategoryMap: Record<string, string> = {
  ...PRODUCT_CATEGORY_LABELS,
};

// 产品属性映射（与产品管理 category 一致）
const categoryMap: Record<string, string> = {
  nmpa: "NMPA注册",
  fda: "FDA注册",
  ce: "CE注册",
  oem: "OEM代工",
  other: "其他",
};

// 来源类型映射
const sourceTypeMap: Record<string, string> = {
  production: "自制",
  purchase: "采购",
};

function calcDisplayStatus(quantity: number, safetyStock: number) {
  if (!safetyStock || safetyStock <= 0) return "normal";
  if (quantity < safetyStock * 0.5) return "warning";
  if (quantity < safetyStock) return "low";
  return "normal";
}

function calcAggregateStatus(items: any[]) {
  const statuses = items.map((item) => String(item.status || ""));
  if (statuses.includes("unqualified")) return "unqualified";
  if (statuses.includes("quarantine")) return "quarantine";
  if (statuses.includes("reserved")) return "reserved";
  return statuses[0] || "qualified";
}

const units = ["kg", "g", "m", "个", "支", "盒", "箱", "卷", "套", "片", "米", "PCS", "50PCS/箱"];

function isStagingWarehouse(warehouse: any) {
  const text = `${String(warehouse?.name || "")} ${String(warehouse?.code || "")}`.toLowerCase();
  return text.includes("暂存") || text.includes("staging");
}

export default function InventoryPage() {
  const [location] = useLocation();
  const isSalesInventoryBoard = location === "/inventory-board";
  const isStagingAreaPage = location === "/production/staging-area";
  const { canDelete } = usePermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("all"); // 产品分类筛选
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");           // 来源类型筛选
  const [productNameFilter, setProductNameFilter] = useState<string>("");             // 产品名称筛选
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(true);                 // 默认隐藏零库存/负库存
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const [adjustType, setAdjustType] = useState<"in" | "out">("in");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    if (!isSalesInventoryBoard) return;
    setProductCategoryFilter("finished");
    setSourceTypeFilter("all");
    setWarehouseFilter("all");
    setHideZeroStock(true);
  }, [isSalesInventoryBoard]);

  useEffect(() => {
    if (!isStagingAreaPage) return;
    setWarehouseFilter("all");
    setHideZeroStock(true);
  }, [isStagingAreaPage]);

  const [formData, setFormData] = useState({
    productId: "",
    materialCode: "",
    itemName: "",
    batchNo: "",
    warehouseId: "",
    quantity: "",
    unit: "kg",
    safetyStock: "",
    status: "qualified" as "qualified" | "quarantine" | "unqualified" | "reserved",
    remark: "",
  });

  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: products = [] } = trpc.products.list.useQuery({ limit: 1000 });
  const stagingWarehouses = useMemo(
    () => (warehouseList as any[]).filter((warehouse: any) => isStagingWarehouse(warehouse)),
    [warehouseList]
  );
  const selectableWarehouses = isStagingAreaPage ? stagingWarehouses : (warehouseList as any[]);
  const stagingWarehouseIds = useMemo(
    () => new Set(stagingWarehouses.map((warehouse: any) => Number(warehouse.id))),
    [stagingWarehouses]
  );

  const { data: inventoryList = [], refetch } = trpc.inventory.list.useQuery({
    search: searchTerm || undefined,
    warehouseId: warehouseFilter !== "all" ? Number(warehouseFilter) : undefined,
  });

  // 构建 productId -> product 映射，用于关联产品信息
  const productMap = useMemo(() => {
    const map: Record<number, any> = {};
    (products as any[]).forEach((p: any) => { map[p.id] = p; });
    return map;
  }, [products]);

  // 库存列表附加产品信息（规格、分类、产品类型、产品属性、来源类型）
  const inventoryWithProduct = useMemo(() => {
    return (inventoryList as any[]).map((item: any) => {
      const product = item.productId ? productMap[item.productId] : null;
      return {
        ...item,
        // 物料编码优先用产品 code，其次用 inventory.materialCode
        displayCode: product?.code || item.materialCode || "-",
        specification: product?.specification || item.specification || "-",
        productCategory: product?.productCategory || null,
        category: product?.category || null,
        isMedicalDevice: typeof product?.isMedicalDevice === "boolean" ? product.isMedicalDevice : null,
        sourceType: product?.sourceType || null,
      };
    });
  }, [inventoryList, productMap]);

  // 前端多维度筛选
  const filteredInventory = useMemo(() => {
    return inventoryWithProduct.filter((item: any) => {
      if (isStagingAreaPage && !stagingWarehouseIds.has(Number(item.warehouseId))) return false;
      if (isSalesInventoryBoard && (item.productCategory !== "finished" || item.isMedicalDevice !== true)) return false;
      // 零库存/负库存过滤（默认隐藏）
      if (hideZeroStock && (parseFloat(String(item.quantity)) || 0) <= 0) return false;
      // 产品名称筛选
      if (productNameFilter && !item.itemName?.toLowerCase().includes(productNameFilter.toLowerCase())) return false;
      // 产品分类筛选
      if (productCategoryFilter !== "all" && item.productCategory !== productCategoryFilter) return false;
      // 来源类型筛选
      if (sourceTypeFilter !== "all" && item.sourceType !== sourceTypeFilter) return false;
      return true;
    });
  }, [inventoryWithProduct, isSalesInventoryBoard, isStagingAreaPage, stagingWarehouseIds, productNameFilter, productCategoryFilter, sourceTypeFilter, hideZeroStock]);

  const displayInventory = useMemo(() => {
    const grouped = new Map<string, any>();

    filteredInventory.forEach((item: any) => {
      const groupKey = `${item.productId || item.displayCode || item.itemName}-${item.warehouseId}`;
      const existing = grouped.get(groupKey);
      const qty = parseFloat(String(item.quantity || 0)) || 0;
      const safetyQty = parseFloat(String(item.safetyStock || 0)) || 0;

      if (!existing) {
        grouped.set(groupKey, {
          ...item,
          id: `group-${groupKey}`,
          quantity: qty,
          safetyStock: safetyQty,
          batchNo: item.batchNo || "-",
          batchCount: 1,
          batchItems: [item],
          inventoryIds: [item.id],
          latestCreatedAt: item.createdAt,
        });
        return;
      }

      const batchItems = [...existing.batchItems, item].sort((a: any, b: any) => {
        const aTime = new Date(String(a.createdAt || 0)).getTime();
        const bTime = new Date(String(b.createdAt || 0)).getTime();
        return bTime - aTime;
      });

      grouped.set(groupKey, {
        ...existing,
        quantity: (parseFloat(String(existing.quantity || 0)) || 0) + qty,
        safetyStock: Math.max(parseFloat(String(existing.safetyStock || 0)) || 0, safetyQty),
        status: calcAggregateStatus(batchItems),
        batchCount: batchItems.length,
        batchNo: batchItems.length > 1 ? `${batchItems.length} 个批次` : (batchItems[0]?.batchNo || "-"),
        batchItems,
        inventoryIds: batchItems.map((row: any) => row.id),
        latestCreatedAt: batchItems[0]?.createdAt || existing.latestCreatedAt,
      });
    });

    return Array.from(grouped.values()).sort((a: any, b: any) => {
      const aTime = new Date(String(a.latestCreatedAt || 0)).getTime();
      const bTime = new Date(String(b.latestCreatedAt || 0)).getTime();
      return bTime - aTime;
    });
  }, [filteredInventory]);

  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: () => { toast.success("库存记录创建成功"); refetch(); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => { toast.success("库存信息已更新"); refetch(); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => { toast.success("库存记录已删除"); refetch(); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });


  const createTxMutation = trpc.inventoryTransactions.create.useMutation({
    onSuccess: () => { toast.success(`库存${adjustType === "in" ? "调入" : "调出"}成功`); refetch(); setAdjustDialogOpen(false); },
    onError: (e) => toast.error("调整失败", { description: e.message }),
  });
  const updateForAdjust = trpc.inventory.update.useMutation({
    onError: (e) => console.warn("更新库存数量失败:", e.message),
  });

  const filteredProducts = (products as any[]).filter((p: any) => {
    const kw = materialSearch.trim().toLowerCase();
    if (!kw) return true;
    return (
      String(p.code || "").toLowerCase().includes(kw) ||
      String(p.name || "").toLowerCase().includes(kw) ||
      String(p.specification || "").toLowerCase().includes(kw)
    );
  });

  const pickProduct = (product: any) => {
    setFormData((prev) => ({
      ...prev,
      productId: String(product.id),
      materialCode: product.code || "",
      itemName: product.name || "",
      unit: product.unit || prev.unit || "kg",
    }));
    setMaterialPickerOpen(false);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      productId: "",
      materialCode: "",
      itemName: "",
      batchNo: "",
      warehouseId: selectableWarehouses[0]?.id ? String((selectableWarehouses[0] as any).id) : "",
      quantity: "",
      unit: "kg",
      safetyStock: "",
      status: "qualified",
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      productId: item.productId ? String(item.productId) : "",
      materialCode: item.materialCode || "",
      itemName: item.itemName || "",
      batchNo: item.batchNo || "",
      warehouseId: String(item.warehouseId || ""),
      quantity: String(item.quantity || ""),
      unit: item.unit || "kg",
      safetyStock: String(item.safetyStock || ""),
      status: item.status || "qualified",
      remark: item.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (item: any) => {
    setViewingItem(item);
    setViewDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除库存记录" });
      return;
    }
    deleteMutation.mutate({ id: item.id });
  };

  const handleAdjust = (item: any) => {
    setAdjustingItem(item);
    setAdjustType("in");
    setAdjustQuantity("");
    setAdjustReason("");
    setAdjustDialogOpen(true);
  };

  const handleConfirmAdjust = () => {
    if (!adjustingItem) return;
    const qty = parseFloat(adjustQuantity) || 0;
    if (qty <= 0) { toast.error("请输入有效的调整数量"); return; }
    if (!adjustReason) { toast.error("请填写调整原因"); return; }

    const currentQty = parseFloat(String(adjustingItem.quantity)) || 0;
    const newQty = adjustType === "in" ? currentQty + qty : Math.max(0, currentQty - qty);

    updateForAdjust.mutate({ id: adjustingItem.id, data: { quantity: String(newQty) } });

    createTxMutation.mutate({
      warehouseId: adjustingItem.warehouseId,
      inventoryId: adjustingItem.id,
      productId: adjustingItem.productId || undefined,
      type: adjustType === "in" ? "other_in" : "other_out",
      itemName: adjustingItem.itemName,
      batchNo: adjustingItem.batchNo || undefined,
      quantity: String(qty),
      unit: adjustingItem.unit || undefined,
      beforeQty: String(currentQty),
      afterQty: String(newQty),
      remark: adjustReason,
    });
  };

  const handleSubmit = () => {
    if (!formData.itemName) { toast.error("请填写必填项", { description: "物料名称为必填" }); return; }
    if (!formData.warehouseId) { toast.error("请选择仓库"); return; }

    const payload = {
      warehouseId: Number(formData.warehouseId),
      productId: formData.productId ? Number(formData.productId) : undefined,
      materialCode: formData.materialCode || undefined,
      itemName: formData.itemName,
      batchNo: formData.batchNo || undefined,
      quantity: formData.quantity || "0",
      unit: formData.unit || undefined,
      safetyStock: formData.safetyStock || undefined,
      status: formData.status,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getWarehouseName = (warehouseId: number) => {
    const wh = (warehouseList as any[]).find((w: any) => w.id === warehouseId);
    return wh ? wh.name : `仓库${warehouseId}`;
  };

  const normalCount = displayInventory.filter((i: any) => i.status === "qualified").length;
  const quarantineCount = displayInventory.filter((i: any) => i.status === "quarantine").length;
  const unqualifiedCount = displayInventory.filter((i: any) => i.status === "unqualified").length;

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
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {isStagingAreaPage ? "暂存区管理" : isSalesInventoryBoard ? "库存看板" : "库存台账"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isStagingAreaPage
                  ? "生产领料进入暂存区、采购入暂存区的物料统一在这里管理"
                  : isSalesInventoryBoard
                    ? "销售查看医疗器械成品库存状态，仅展示医疗器械成品库存数据"
                    : "实时监控库存状态，支持安全库存预警和库存分析"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />刷新
            </Button>
            {!isSalesInventoryBoard && (
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />新增库存
              </Button>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">库存总数</p><p className="text-2xl font-bold">{displayInventory.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">合格品</p><p className="text-2xl font-bold text-green-600">{normalCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待检品</p><p className="text-2xl font-bold text-amber-600">{quarantineCount}</p></CardContent></Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-2">
              <div>
                <p className="text-sm text-muted-foreground">不合格品</p>
                <p className="text-2xl font-bold text-red-600">{unqualifiedCount}</p>
              </div>
              {unqualifiedCount > 0 && <AlertTriangle className="h-5 w-5 text-red-500 ml-auto" />}
            </CardContent>
          </Card>
        </div>

        {isStagingAreaPage && selectableWarehouses.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              暂未找到“暂存区”仓库，请先到仓库管理里新增名称包含“暂存区”的仓库。
            </CardContent>
          </Card>
        )}

        {/* 搜索和筛选 */}
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          {/* 物料编码/批号搜索 */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索物料编码、批次号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 产品名称筛选 */}
          <div className="relative min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="产品名称..."
              value={productNameFilter}
              onChange={(e) => setProductNameFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {!isSalesInventoryBoard && (
            <>
              {/* 来源类型筛选（自制/采购） */}
              <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="来源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  <SelectItem value="production">自制</SelectItem>
                  <SelectItem value="purchase">采购</SelectItem>
                </SelectContent>
              </Select>

              {/* 产品分类筛选 */}
              <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="产品分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* 仓库筛选 */}
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="仓库筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部仓库</SelectItem>
              {selectableWarehouses.map((w: any) => (
                <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isSalesInventoryBoard && (
            <Button
              variant={hideZeroStock ? "secondary" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setHideZeroStock((v) => !v)}
            >
              {hideZeroStock ? (
                <><Eye className="h-4 w-4 mr-1.5" />隐藏零库存</>
              ) : (
                <><EyeOff className="h-4 w-4 mr-1.5" />显示零库存</>
              )}
            </Button>
          )}
        </div>

        {/* 库存表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">物料编码</TableHead>
                  <TableHead className="text-center font-bold">物料名称</TableHead>
                  <TableHead className="text-center font-bold">型号规格</TableHead>
                  <TableHead className="text-center font-bold">产品分类</TableHead>
                  <TableHead className="text-center font-bold">产品类型</TableHead>
                  <TableHead className="text-center font-bold">产品属性</TableHead>
                  <TableHead className="text-center font-bold">批次号</TableHead>
                  <TableHead className="text-center font-bold">仓库</TableHead>
                  <TableHead className="text-center font-bold">
                    <div className="flex items-center justify-center gap-1">
                      库存数量 <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-bold">安全库存</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      暂无库存记录
                    </TableCell>
                  </TableRow>
                ) : (
                  displayInventory.map((item: any) => {
                    const qty = parseFloat(String(item.quantity)) || 0;
                    const safetyQty = parseFloat(String(item.safetyStock)) || 0;
                    const displayStatus = calcDisplayStatus(qty, safetyQty);
                    const canDirectOperate = !item.batchItems || item.batchItems.length === 1;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-center font-mono text-sm">{item.displayCode}</TableCell>
                        <TableCell className="text-center font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{item.specification}</TableCell>
                        <TableCell className="text-center text-sm">
                          {item.productCategory ? (
                            <Badge variant="outline" className="text-xs">
                              {productCategoryMap[item.productCategory] || item.productCategory}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <Badge variant={item.isMedicalDevice ? "default" : "secondary"} className="text-xs">
                            {item.isMedicalDevice ? "医疗器械" : "非医疗器械"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {item.category ? (
                            <Badge variant="outline" className="text-xs">
                              {categoryMap[item.category] || item.category}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-center text-sm font-mono">{item.batchNo || "-"}</TableCell>
                        <TableCell className="text-center text-sm">{getWarehouseName(item.warehouseId)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-medium ${displayStatus === "warning" ? "text-red-600" : displayStatus === "low" ? "text-amber-600" : ""}`}>
                              {qty?.toLocaleString?.() ?? "0"} {item.unit || ""}
                            </span>
                            {safetyQty > 0 && (
                              <Progress value={Math.min((qty / safetyQty) * 100, 100)} className="h-1 w-16" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {safetyQty > 0 ? `${safetyQty?.toLocaleString?.() ?? "0"} ${item.unit || ""}` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusMap[item.status as keyof typeof statusMap]?.variant || "outline"}
                            className={getStatusSemanticClass(item.status, statusMap[item.status as keyof typeof statusMap]?.label)}>
                            {statusMap[item.status as keyof typeof statusMap]?.label || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(item)}>
                                <Eye className="h-4 w-4 mr-2" />查看详情
                              </DropdownMenuItem>
                              {!isSalesInventoryBoard && canDirectOperate && (
                                <>
                                  <DropdownMenuItem onClick={() => handleAdjust(item)}>
                                    <ArrowUpDown className="h-4 w-4 mr-2" />库存调整
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(item)}>
                                    <Edit className="h-4 w-4 mr-2" />编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item)}>
                                    <Trash2 className="h-4 w-4 mr-2" />删除
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新增/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen} className="max-w-2xl">
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "编辑库存记录" : "新增库存记录"}</DialogTitle>
              <DialogDescription>{editingItem ? "修改库存信息" : "填写新库存记录信息"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>物料编码</Label>
                  <Input value={formData.materialCode} readOnly placeholder="选择物料后自动填入" />
                </div>
                <div className="space-y-2">
                  <Label>物料名称 *</Label>
                  <div className="flex gap-2">
                    <Input value={formData.itemName} readOnly placeholder="请选择物料" />
                    <Button variant="outline" onClick={() => setMaterialPickerOpen(true)}>选择物料</Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>批次号</Label>
                  <Input value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} placeholder="批次号" />
                </div>
                <div className="space-y-2">
                  <Label>仓库 *</Label>
                  <Select value={formData.warehouseId} onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}>
                    <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                    <SelectContent>
                      {selectableWarehouses.map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>当前库存</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="库存数量" />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {units.map((u: any) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>安全库存</Label>
                  <Input type="number" value={formData.safetyStock} onChange={(e) => setFormData({ ...formData, safetyStock: e.target.value })} placeholder="安全库存数量" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualified">合格品</SelectItem>
                    <SelectItem value="quarantine">待检品</SelectItem>
                    <SelectItem value="unqualified">不合格品</SelectItem>
                    <SelectItem value="reserved">预留</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? "保存修改" : "创建记录"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 物料选择弹窗 */}
        <DraggableDialog open={materialPickerOpen} onOpenChange={setMaterialPickerOpen} className="max-w-4xl">
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>选择物料</DialogTitle>
              <DialogDescription>可按物料编码、名称、规格快速筛选</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} placeholder="搜索编码/名称/规格..." className="pl-9" />
              </div>
              <div className="max-h-[420px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-[120px] text-center font-bold">物料编码</TableHead>
                      <TableHead className="text-center font-bold">物料名称</TableHead>
                      <TableHead className="w-[180px] text-center font-bold">型号规格</TableHead>
                      <TableHead className="w-[90px] text-center font-bold">产品分类</TableHead>
                      <TableHead className="w-[90px] text-center font-bold">产品类型</TableHead>
                      <TableHead className="w-[90px] text-center font-bold">产品属性</TableHead>
                      <TableHead className="w-[70px] text-center font-bold">单位</TableHead>
                      <TableHead className="w-[70px] text-center font-bold">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">未找到匹配物料</TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-center font-mono text-xs">{p.code || "-"}</TableCell>
                          <TableCell className="text-center font-medium">{p.name || "-"}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{p.specification || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {productCategoryMap[p.productCategory] || p.productCategory || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={p.isMedicalDevice ? "default" : "secondary"} className="text-xs">
                              {p.isMedicalDevice ? "医疗器械" : "非医疗器械"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={p.sourceType === "production" ? "secondary" : "outline"} className="text-xs">
                              {categoryMap[p.category] || p.category || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{p.unit || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" onClick={() => pickProduct(p)}>
                              <Check className="h-3.5 w-3.5 mr-1" />选择
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaterialPickerOpen(false)}>关闭</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 库存调整对话框 */}
        <DraggableDialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>库存调整</DialogTitle>
              <DialogDescription>
                {adjustingItem?.displayCode || adjustingItem?.materialCode} - {adjustingItem?.itemName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between text-sm p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">当前库存</span>
                <span className="font-medium">
                  {parseFloat(String(adjustingItem?.quantity || 0))?.toLocaleString?.() ?? "0"} {adjustingItem?.unit}
                </span>
              </div>
              <div className="space-y-2">
                <Label>调整类型</Label>
                <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "in" | "out")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">调入（增加库存）</SelectItem>
                    <SelectItem value="out">调出（减少库存）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>调整数量 *</Label>
                <Input type="number" value={adjustQuantity} onChange={(e) => setAdjustQuantity(e.target.value)} placeholder={`输入${adjustType === "in" ? "调入" : "调出"}数量`} />
              </div>
              <div className="space-y-2">
                <Label>调整原因 *</Label>
                <Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="请填写调整原因" rows={2} />
              </div>
              {adjustQuantity && (
                <div className="flex justify-between text-sm p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">调整后库存</span>
                  <span className="font-medium">
                    {(adjustType === "in"
                      ? (parseFloat(String(adjustingItem?.quantity || 0))) + (parseFloat(adjustQuantity) || 0)
                      : Math.max(0, (parseFloat(String(adjustingItem?.quantity || 0))) - (parseFloat(adjustQuantity) || 0))
                    )?.toLocaleString?.() ?? "0"} {adjustingItem?.unit}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>取消</Button>
              <Button onClick={handleConfirmAdjust} disabled={createTxMutation.isPending}>确认调整</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
        {/* InventoryDetailContent 组件在文件末尾定义 */}
        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} defaultWidth={860} defaultHeight={680}>
          <DraggableDialogContent>
            {viewingItem && (
              <InventoryDetailContent
                item={viewingItem}
                statusMap={statusMap}
                productCategoryMap={productCategoryMap}
                categoryMap={categoryMap}
                sourceTypeMap={sourceTypeMap}
                getWarehouseName={getWarehouseName}
                onClose={() => setViewDialogOpen(false)}
                onEdit={() => { setViewDialogOpen(false); handleEdit(viewingItem); }}
                onAdjust={() => { setViewDialogOpen(false); handleAdjust(viewingItem); }}
                readonly={isSalesInventoryBoard}
              />
            )}
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}

// ==================== 库存详情内容组件（含出入库明细表）====================
const txTypeMap: Record<string, { label: string; color: string }> = {
  purchase_in:    { label: "采购入库", color: "text-green-600" },
  production_in:  { label: "生产入库", color: "text-blue-600" },
  return_in:      { label: "退货入库", color: "text-teal-600" },
  other_in:       { label: "其他入库", color: "text-cyan-600" },
  production_out: { label: "生产领料", color: "text-orange-600" },
  sales_out:      { label: "销售出库", color: "text-red-600" },
  return_out:     { label: "采购退货", color: "text-rose-600" },
  other_out:      { label: "其他出库", color: "text-pink-600" },
  transfer:       { label: "调拨",     color: "text-purple-600" },
  adjust:         { label: "库存调整", color: "text-amber-600" },
};

function InventoryDetailContent({
  item,
  statusMap,
  productCategoryMap,
  categoryMap,
  sourceTypeMap,
  getWarehouseName,
  onClose,
  onEdit,
  onAdjust,
  readonly = false,
}: {
  item: any;
  statusMap: Record<string, any>;
  productCategoryMap: Record<string, string>;
  categoryMap: Record<string, string>;
  sourceTypeMap: Record<string, string>;
  getWarehouseName: (id: number) => string;
  onClose: () => void;
  onEdit: () => void;
  onAdjust: () => void;
  readonly?: boolean;
}) {
  const batchItems = item?.batchItems?.length ? item.batchItems : [item];
  const isAggregated = batchItems.length > 1;
  const isStagingWarehouse = String(getWarehouseName(item.warehouseId) || "").includes("暂存");
  const { data: txList = [], isLoading: txLoading } = trpc.inventoryTransactions.list.useQuery(
    item?.id
      ? isAggregated
        ? {
            productId: item.productId || undefined,
            warehouseId: item.warehouseId,
            limit: 300,
          }
        : {
            inventoryId: batchItems[0]?.id,
            limit: 100,
          }
      : undefined,
    { enabled: !!item?.id }
  );

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  const inTypes = ["purchase_in", "production_in", "return_in", "other_in"];
  const totalIn = (txList as any[]).filter((t: any) => inTypes.includes(t.type)).reduce((s: number, t: any) => s + (parseFloat(String(t.quantity)) || 0), 0);
  const totalOut = (txList as any[]).filter((t: any) => !inTypes.includes(t.type) && t.type !== "adjust" && t.type !== "transfer").reduce((s: number, t: any) => s + (parseFloat(String(t.quantity)) || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* 标题 */}
      <div className="border-b pb-3 shrink-0">
        <h2 className="text-lg font-semibold">库存详情</h2>
        <p className="text-sm text-muted-foreground">
          {item.displayCode || item.materialCode}
          {item.status && (
            <> · <Badge
              variant={statusMap[item.status]?.variant || "outline"}
              className={`ml-1 ${getStatusSemanticClass(item.status, statusMap[item.status]?.label)}`}
            >
              {statusMap[item.status]?.label || String(item.status ?? "-")}
            </Badge></>
          )}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {/* 基本信息 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="物料名称">{item.itemName}</FieldRow>
              <FieldRow label="物料编码">{item.displayCode || item.materialCode || "-"}</FieldRow>
              <FieldRow label="型号规格">{item.specification || "-"}</FieldRow>
              <FieldRow label="批次号">{item.batchNo || "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="产品分类">{item.productCategory ? (productCategoryMap[item.productCategory] || item.productCategory) : "-"}</FieldRow>
              <FieldRow label="产品类型">{item.isMedicalDevice ? "医疗器械" : "非医疗器械"}</FieldRow>
              <FieldRow label="产品属性">{item.category ? (categoryMap[item.category] || item.category) : "-"}</FieldRow>
              <FieldRow label="来源类型">{item.sourceType ? (sourceTypeMap[item.sourceType] || item.sourceType) : "-"}</FieldRow>
              <FieldRow label="仓库">{getWarehouseName(item.warehouseId)}</FieldRow>
              <FieldRow label="单位">{item.unit || "-"}</FieldRow>
              <FieldRow label="批次数">{batchItems.length}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            批次明细
            <span className="ml-2 text-xs font-normal text-muted-foreground normal-case">
              共 {batchItems.length} 个批次
            </span>
          </h3>
          <div className="rounded-lg border overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center text-xs">批次号</TableHead>
                  <TableHead className="text-center text-xs">库存数量</TableHead>
                  <TableHead className="text-center text-xs">安全库存</TableHead>
                  <TableHead className="text-center text-xs">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchItems.map((batch: any) => (
                  <TableRow key={batch.id}>
                    <TableCell className="text-center text-xs font-mono">{batch.batchNo || "-"}</TableCell>
                    <TableCell className="text-center text-sm">
                      {formatDisplayNumber(batch.quantity)} {batch.unit || ""}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {batch.safetyStock ? `${formatDisplayNumber(batch.safetyStock)} ${batch.unit || ""}` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={statusMap[batch.status]?.variant || "outline"}
                        className={getStatusSemanticClass(batch.status, statusMap[batch.status]?.label)}
                      >
                        {statusMap[batch.status]?.label || batch.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 库存水平 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">库存水平</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">累计入库</p>
              <p className="text-base font-bold text-green-600">{formatDisplayNumber(totalIn)} {item.unit || ""}</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">累计出库</p>
              <p className="text-base font-bold text-red-600">{formatDisplayNumber(totalOut)} {item.unit || ""}</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">当前库存</p>
              <p className="text-base font-bold text-primary">{formatDisplayNumber(item.quantity)} {item.unit || ""}</p>
            </div>
          </div>
          {item.safetyStock && parseFloat(String(item.safetyStock)) > 0 && (
            <div className="mt-2 space-y-1">
              <Progress value={Math.min((parseFloat(String(item.quantity)) / parseFloat(String(item.safetyStock))) * 100, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">安全库存: {formatDisplayNumber(item.safetyStock)} {item.unit || ""}</p>
            </div>
          )}
        </div>

        {/* 出入库明细表 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            出入库明细
            <span className="ml-2 text-xs font-normal text-muted-foreground normal-case">
              共 {(txList as any[]).length} 条记录
            </span>
          </h3>
          <div className="rounded-lg border overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center text-xs">时间</TableHead>
                  <TableHead className="text-center text-xs">类型</TableHead>
                  <TableHead className="text-center text-xs">单据号</TableHead>
                  <TableHead className="text-right text-xs">数量</TableHead>
                  <TableHead className="text-right text-xs">变动前</TableHead>
                  <TableHead className="text-right text-xs">变动后</TableHead>
                  <TableHead className="text-center text-xs">备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : (txList as any[]).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                      暂无出入库记录
                    </TableCell>
                  </TableRow>
                ) : (
                  (txList as any[]).map((tx: any) => {
                    const txInfo = (() => {
                      if (isStagingWarehouse && tx.type === "other_in") {
                        return { label: "领料入暂存区", color: "text-cyan-600" };
                      }
                      if (isStagingWarehouse && tx.type === "production_out") {
                        return { label: "工序使用", color: "text-orange-600" };
                      }
                      return txTypeMap[tx.type] || { label: tx.type, color: "text-foreground" };
                    })();
                    const isIn = inTypes.includes(tx.type);
                    const qty = parseFloat(String(tx.quantity)) || 0;
                    return (
                      <TableRow key={tx.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {tx.createdAt ? formatDate(new Date(tx.createdAt)) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-xs ${txInfo.color}`}>
                            {txInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono text-muted-foreground">
                          {tx.documentNo || "-"}
                        </TableCell>
                        <TableCell className={`text-right text-sm font-medium ${isIn ? "text-green-600" : "text-red-600"}`}>
                          {isIn ? "+" : "-"}{formatDisplayNumber(qty)} {item.unit || ""}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {tx.beforeQty != null ? formatDisplayNumber(tx.beforeQty) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {tx.afterQty != null ? formatDisplayNumber(tx.afterQty) : "-"}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground max-w-[120px] truncate">
                          {tx.remark || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>关闭</Button>
        {!readonly && !isAggregated && <Button variant="outline" size="sm" onClick={onEdit}>编辑</Button>}
        {!readonly && !isAggregated && <Button size="sm" onClick={onAdjust}>库存调整</Button>}
      </div>
    </div>
  );
}
