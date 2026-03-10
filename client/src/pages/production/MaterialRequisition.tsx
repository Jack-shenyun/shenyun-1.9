import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { formatDate } from "@/lib/formatters";
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
import { Separator } from "@/components/ui/separator";
import {
  PackageOpen, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, Truck, RefreshCw,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  draft:    { label: "草稿",   variant: "outline" },
  pending:  { label: "待审批", variant: "default" },
  approved: { label: "已审批", variant: "secondary" },
  issued:   { label: "已发料", variant: "secondary" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

interface MaterialItem {
  materialCode: string;
  materialName: string;
  specification: string;
  requiredQty: number;
  unit: string;
  actualQty: number;
  batchNo: string;       // 物料批号
  availableQty: number;  // 该批次库存可用数量（参考）
  remark: string;
}

export default function MaterialRequisitionPage() {
  const { canDelete } = usePermission();
  const { data: orders = [], isLoading, refetch } = trpc.materialRequisitionOrders.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({});
  const { data: productsData = [] } = trpc.products.list.useQuery();

  const createMutation = trpc.materialRequisitionOrders.create.useMutation({
    onSuccess: () => { refetch(); toast.success("领料单已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.materialRequisitionOrders.update.useMutation({
    onSuccess: () => { refetch(); toast.success("领料单已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.materialRequisitionOrders.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("领料单已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [items, setItems] = useState<MaterialItem[]>([]);

  // 自主领料模式（true = 自主领料，false = 关联生产指令）
  const [selfServiceMode, setSelfServiceMode] = useState(false);

  // 弹窗选择器状态
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);

  // 自主领料 - 从库存选产品弹窗
  const [inventoryPickerOpen, setInventoryPickerOpen] = useState(false);
  const [inventoryPickerSearch, setInventoryPickerSearch] = useState("");
  const [inventoryPickerSelected, setInventoryPickerSelected] = useState<Set<number>>(new Set()); // 多选状态

  // 批号选择器状态
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [batchPickerItemIdx, setBatchPickerItemIdx] = useState<number>(-1); // 当前正在选择批号的行索引
  const [batchSearchCode, setBatchSearchCode] = useState<string>(""); // 用于查询库存的物料编码

  // 当前选中的生产指令对应的 productId（用于查询 BOM）
  const [selectedProductId, setSelectedProductId] = useState<number>(0);

  // 查询选中产品的 BOM 物料明细
  const { data: bomItems = [], refetch: refetchBom } = trpc.bom.getByProductId.useQuery(
    { productId: selectedProductId },
    { enabled: selectedProductId > 0 }
  );

  // 查询库存中该物料的所有批次（批号选择器用）
  const { data: inventoryBatches = [] } = trpc.inventory.list.useQuery(
    { search: batchSearchCode },
    { enabled: batchPickerOpen && batchSearchCode.length > 0 }
  );

  // 自主领料 - 查询库存列表（产品选择器用）
  const { data: inventoryForPicker = [] } = trpc.inventory.list.useQuery(
    { search: inventoryPickerSearch, limit: 200 },
    { enabled: inventoryPickerOpen }
  );

  const [formData, setFormData] = useState({
    requisitionNo: "",
    productionOrderId: "",
    productionOrderNo: "",
    productName: "",
    productSpec: "",
    productDescription: "",
    batchNo: "",
    plannedQty: "",
    unit: "",
    warehouseId: "",
    applicationDate: "",
    remark: "",
    // 自主领料 - 选中的库存产品信息
    selfServiceItemName: "",
    selfServiceItemSpec: "",
    selfServiceItemCode: "",
    selfServiceInventoryId: "",
  });

  const filteredOrders = (orders as any[]).filter((o) => {
    const matchSearch = !searchTerm ||
      String(o.requisitionNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.productionOrderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const genNo = () => {
    const now = new Date();
    return `MR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
  };

  const handleAdd = () => {
    setEditingOrder(null);
    setSelectedProductId(0);
    setItems([]);
    setFormData({
      requisitionNo: genNo(),
      productionOrderId: "",
      productionOrderNo: "",
      productName: "",
      productSpec: "",
      productDescription: "",
      batchNo: "",
      plannedQty: "",
      unit: "",
      warehouseId: "",
      applicationDate: new Date().toISOString().split("T")[0],
      remark: "",
      selfServiceItemName: "",
      selfServiceItemSpec: "",
      selfServiceItemCode: "",
      selfServiceInventoryId: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    let parsedItems: MaterialItem[] = [];
    try {
      // 优先从独立 items 字段读取，兼容旧数据
      if (order.items) { parsedItems = JSON.parse(order.items) || []; }
      else { const extra = JSON.parse(order.remark || "{}"); parsedItems = extra.items || []; }
    } catch {}
    setItems(parsedItems.length > 0 ? parsedItems : []);
    setSelectedProductId(0);
    setFormData({
      requisitionNo: order.requisitionNo,
      productionOrderId: order.productionOrderId ? String(order.productionOrderId) : "",
      productionOrderNo: order.productionOrderNo || "",
      productName: "",
      productSpec: "",
      productDescription: "",
      batchNo: "",
      plannedQty: "",
      unit: "",
      warehouseId: order.warehouseId ? String(order.warehouseId) : "",
      applicationDate: order.applicationDate ? String(order.applicationDate).split("T")[0] : "",
      remark: "",
      selfServiceItemName: "",
      selfServiceItemSpec: "",
      selfServiceItemCode: "",
      selfServiceInventoryId: "",
    });
    setDialogOpen(true);
  };

  const handleView = (order: any) => {
    setViewingOrder(order);
    setViewDialogOpen(true);
  };

  const handleDelete = (order: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: order.id });
  };

  const handleApprove = (order: any) => {
    updateMutation.mutate({ id: order.id, data: { status: "approved" } });
  };

  const handleIssue = (order: any) => {
    updateMutation.mutate({ id: order.id, data: { status: "issued" } });
    toast.success("已发料");
  };

  // 选择生产指令后自动带入产品信息
  const handleProductionOrderSelect = (po: any) => {
    const product = (productsData as any[]).find((p: any) => p.id === po.productId);
    const newProductId = po.productId || 0;
    setFormData((f) => ({
      ...f,
      productionOrderId: String(po.id),
      productionOrderNo: po.orderNo || "",
      productName: product?.name || po.productName || "",
      productSpec: product?.specification || "",
      productDescription: product?.description || "",
      batchNo: po.batchNo || "",
      plannedQty: po.plannedQty || "",
      unit: po.unit || product?.unit || "",
    }));
    setSelectedProductId(newProductId);
    setOrderPickerOpen(false);
    // 延迟一下再提示，等 BOM 查询触发
    setTimeout(() => {
      if (newProductId > 0) {
        toast.info("正在根据 BOM 自动带出物料明细...");
      }
    }, 300);
  };

  // 自主领料 - 从库存选择产品后处理
  const handleInventoryProductSelect = (inv: any) => {
    // 单选模式（兼容旧逻辑，实际已改为多选，此函数保留备用）
    const product = (productsData as any[]).find((p: any) => p.id === inv.productId);
    const spec = product?.specification || inv.specification || inv.spec || "";
    setFormData((f) => ({
      ...f,
      selfServiceItemName: inv.itemName || "",
      selfServiceItemSpec: spec,
      selfServiceItemCode: inv.materialCode || "",
      selfServiceInventoryId: String(inv.id),
      unit: inv.unit || product?.unit || "",
    }));
    setInventoryPickerOpen(false);
    setInventoryPickerSelected(new Set());
    const newItem: MaterialItem = {
      materialCode: inv.materialCode || "",
      materialName: inv.itemName || "",
      specification: spec,
      requiredQty: 0,
      unit: inv.unit || product?.unit || "",
      actualQty: 0,
      batchNo: inv.batchNo || inv.lotNo || "",
      availableQty: Number(inv.quantity) || 0,
      remark: "",
    };
    setItems([newItem]);
    toast.success(`已选择产品：${inv.itemName}，已自动填入一行物料明细`);
  };

  // 多选确认：将所有勾选的库存记录批量添加到物料明细
  const handleInventoryMultiConfirm = () => {
    if (inventoryPickerSelected.size === 0) {
      toast.warning("请至少勾选一条记录");
      return;
    }
    const selectedInvList = (inventoryWithSpec as any[]).filter((inv: any) => inventoryPickerSelected.has(inv.id));
    const newItems: MaterialItem[] = selectedInvList.map((inv: any) => {
      const product = (productsData as any[]).find((p: any) => p.id === inv.productId);
      const spec = product?.specification || inv.specification || inv.spec || "";
      return {
        materialCode: inv.materialCode || "",
        materialName: inv.itemName || "",
        specification: spec,
        requiredQty: 0,
        unit: inv.unit || product?.unit || "",
        actualQty: 0,
        batchNo: inv.batchNo || inv.lotNo || "",
        availableQty: Number(inv.quantity) || 0,
        remark: "",
      };
    });
    // 用第一条记录更新产品信息卡片
    if (selectedInvList.length > 0) {
      const first = selectedInvList[0];
      const product = (productsData as any[]).find((p: any) => p.id === first.productId);
      const spec = product?.specification || first.specification || first.spec || "";
      setFormData((f) => ({
        ...f,
        selfServiceItemName: first.itemName || "",
        selfServiceItemSpec: spec,
        selfServiceItemCode: first.materialCode || "",
        selfServiceInventoryId: String(first.id),
        unit: first.unit || product?.unit || "",
      }));
    }
    setItems((prev) => [...prev, ...newItems]);
    setInventoryPickerOpen(false);
    setInventoryPickerSelected(new Set());
    toast.success(`已添加 ${newItems.length} 条物料明细`);
  };

  // 当 BOM 数据加载完成时，自动填充物料明细（扣减已领数量）
  const handleLoadBomItems = () => {
    if ((bomItems as any[]).length === 0) {
      toast.warning("该产品暂无 BOM 数据，请手动添加物料");
      return;
    }
    const plannedQty = Number(formData.plannedQty) || 1;
    const poId = formData.productionOrderId ? Number(formData.productionOrderId) : 0;
    const issuedForPo = issuedQtyMap[poId] || {};
    // 只取 level=2 的物料（二级组件/半成品）和 level=3 的原材料
    const rawMaterials = (bomItems as any[]).filter((b: any) => b.level === 3 || b.level === 2);
    const newItems: MaterialItem[] = rawMaterials.map((b: any) => {
      const bomQtyPerUnit = Number(b.quantity) || 0;
      const totalNeeded = bomQtyPerUnit * plannedQty; // 总需求量
      const key = b.materialCode || b.materialName;
      const alreadyIssued = issuedForPo[key] || 0;
      const remaining = Math.max(0, totalNeeded - alreadyIssued); // 剩余需领
      return {
        materialCode: b.materialCode || "",
        materialName: b.materialName || "",
        specification: b.specification || "",
        requiredQty: remaining,
        unit: b.unit || "",
        actualQty: remaining,
        batchNo: "",
        availableQty: 0,
        remark: alreadyIssued > 0 ? `已领${alreadyIssued}，总需${totalNeeded}` : "",
      };
    }).filter((item) => item.requiredQty > 0); // 过滤已领完的物料
    if (newItems.length === 0) {
      toast.success("所有物料均已领完，无需再次领料");
      return;
    }
    setItems(newItems);
    toast.success(`已从 BOM 带出 ${newItems.length} 条待领物料（已扣减已领数量）`);
  };

  const addItem = () => {
    setItems([...items, { materialCode: "", materialName: "", specification: "", requiredQty: 0, unit: "件", actualQty: 0, batchNo: "", availableQty: 0, remark: "" }]);
  };

  // 复制一行（用于同一物料选不同批次）
  const duplicateItem = (idx: number) => {
    const item = items[idx];
    const newItem = { ...item, batchNo: "", availableQty: 0, actualQty: 0 };
    const newItems = [...items];
    newItems.splice(idx + 1, 0, newItem);
    setItems(newItems);
  };

  // 打开批号选择弹窗
  const openBatchPicker = (idx: number) => {
    const item = items[idx];
    setBatchPickerItemIdx(idx);
    // 优先用物料编码搜索，若无编码则用物料名称
    // 后端 search 字段同时匹配 itemName / batchNo / materialCode
    setBatchSearchCode(item.materialCode || item.materialName || "");
    setBatchPickerOpen(true);
  };

  // 选择批号
  const handleBatchSelect = (batch: any) => {
    if (batchPickerItemIdx < 0) return;
    updateItem(batchPickerItemIdx, "batchNo", batch.batchNo || batch.lotNo || "");
    updateItem(batchPickerItemIdx, "availableQty", Number(batch.quantity) || 0);
    setBatchPickerOpen(false);
    setBatchPickerItemIdx(-1);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof MaterialItem, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = () => {
    if (!formData.requisitionNo) {
      toast.error("请填写领料单号");
      return;
    }
    // items 单独存入 items 字段（JSON 字符串），remark 存备注 + selfServiceMode 元数据
    const itemsJson = JSON.stringify(items);
    const remarkMeta = JSON.stringify({ selfServiceMode, note: formData.remark });
    const payload = {
      requisitionNo: formData.requisitionNo,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      warehouseId: formData.warehouseId ? Number(formData.warehouseId) : undefined,
      requisitionDate: formData.applicationDate || undefined,
      status: "draft" as const,
      items: itemsJson,
      remark: remarkMeta,
    };
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data: { items: itemsJson, remark: remarkMeta } });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getViewItems = (order: any): MaterialItem[] => {
    try {
      // 优先从独立的 items 字段读取，兼容旧数据（存在 remark.items 中）
      if (order.items) return JSON.parse(order.items) || [];
      const extra = JSON.parse(order.remark || "{}");
      return extra.items || [];
    } catch { return []; }
  };

  const draftCount = (orders as any[]).filter((o) => o.status === "draft").length;
  const pendingCount = (orders as any[]).filter((o) => o.status === "pending").length;
  const issuedCount = (orders as any[]).filter((o) => o.status === "issued").length;

  // ── 领料状态计算 ──────────────────────────────────────────────
  // 对每个生产指令，汇总所有「已发料」领料单中各物料的已领数量
  // 返回 { poId -> { materialCode -> issuedQty } }
  const issuedQtyMap = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    (orders as any[]).filter((o: any) => o.status === "issued").forEach((o: any) => {
      const poId = o.productionOrderId;
      if (!poId) return;
      try {
        // 优先从独立 items 字段读取，兼容旧数据
        let items: MaterialItem[] = [];
        if (o.items) { items = JSON.parse(o.items) || []; }
        else { const extra = JSON.parse(o.remark || "{}"); items = extra.items || []; }
        if (!map[poId]) map[poId] = {};
        items.forEach((item) => {
          const key = item.materialCode || item.materialName;
          map[poId][key] = (map[poId][key] || 0) + Number(item.actualQty || item.requiredQty || 0);
        });
      } catch {}
    });
    return map;
  }, [orders]);

  // 计算生产指令的领料状态：none/partial/full
  const getRequisitionStatus = (po: any): "none" | "partial" | "full" => {
    const poId = po.id;
    const issued = issuedQtyMap[poId];
    if (!issued || Object.keys(issued).length === 0) return "none";
    // 检查是否有任何领料单关联此指令
    const hasAny = (orders as any[]).some((o: any) => o.productionOrderId === poId && o.status === "issued");
    if (!hasAny) return "none";
    // 简化判断：若累计已领数量 >= 计划数量，则视为已领完
    const plannedQty = Number(po.plannedQty || 0);
    const totalIssued = Object.values(issued).reduce((a, b) => a + b, 0);
    // 按物料数量判断：若已领总量 >= 计划数量（粗略判断），视为已领完
    if (plannedQty > 0 && totalIssued >= plannedQty) return "full";
    return "partial";
  };

  // 生产指令列表（用于弹窗选择），附加领料状态
  const availableOrders = (productionOrders as any[])
    .filter((po: any) => po.status !== "cancelled" && po.status !== "completed")
    .map((po: any) => {
      const product = (productsData as any[]).find((p: any) => p.id === po.productId);
      const reqStatus = getRequisitionStatus(po);
      return { ...po, productName: product?.name || "-", productSpec: product?.specification || "", reqStatus };
    });

  // 库存产品列表（用于自主领料弹窗选择），附加规格
  const inventoryWithSpec = useMemo(() => {
    return (inventoryForPicker as any[]).map((inv: any) => {
      const product = (productsData as any[]).find((p: any) => p.id === inv.productId);
      return {
        ...inv,
        specification: product?.specification || inv.specification || inv.spec || "",
      };
    });
  }, [inventoryForPicker, productsData]);

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">领料单</h2>
              <p className="text-sm text-muted-foreground">生产指令领取原材料申请管理</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />新建领料单</Button>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">草稿</p><p className="text-2xl font-bold">{draftCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待审批</p><p className="text-2xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已发料</p><p className="text-2xl font-bold text-green-600">{issuedCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索领料单号、生产指令号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="approved">已审批</SelectItem>
                  <SelectItem value="issued">已发料</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">领料单号</TableHead>
                  <TableHead className="text-center font-bold">关联生产指令</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">申请日期</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无领料单</TableCell></TableRow>
                ) : filteredOrders.map((order: any) => {
                  const po = (productionOrders as any[]).find((p: any) => p.id === order.productionOrderId);
                  const product = po ? (productsData as any[]).find((p: any) => p.id === po.productId) : null;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-center font-medium font-mono">{order.requisitionNo}</TableCell>
                      <TableCell className="text-center font-mono">{order.productionOrderNo || "-"}</TableCell>
                      <TableCell className="text-center">{product?.name || "-"}</TableCell>
                      <TableCell className="text-center">{formatDate(order.applicationDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[order.status]?.variant || "outline"} className={getStatusSemanticClass(order.status, statusMap[order.status]?.label)}>
                          {statusMap[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(order)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                            {order.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(order)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "pending" } })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />提交审批
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(order)}><CheckCircle className="h-4 w-4 mr-2" />审批通过</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "rejected" } })} className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />拒绝
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "approved" && (
                              <DropdownMenuItem onClick={() => handleIssue(order)}><Truck className="h-4 w-4 mr-2" />确认发料</DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => handleDelete(order)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />删除
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
          <DraggableDialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle>{editingOrder ? "编辑领料单" : "新建领料单"}</DialogTitle>
                  <DialogDescription>填写领料申请信息及物料明细</DialogDescription>
                </div>
                {/* 自主领料切换按钮 */}
                <button
                  type="button"
                  onClick={() => {
                    setSelfServiceMode(!selfServiceMode);
                    // 切换模式时清空关联信息
                    setFormData((f) => ({
                      ...f,
                      productionOrderId: "",
                      productionOrderNo: "",
                      productName: "",
                      productSpec: "",
                      productDescription: "",
                      batchNo: "",
                      plannedQty: "",
                      selfServiceItemName: "",
                      selfServiceItemSpec: "",
                      selfServiceItemCode: "",
                      selfServiceInventoryId: "",
                    }));
                    setSelectedProductId(0);
                    setItems([]);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                    selfServiceMode
                      ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {selfServiceMode ? (
                    <ToggleRight className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                  )}
                  自主领料
                </button>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">

              {/* 第一行：领料单号 + 申请日期 + 领料仓库 + 状态 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>领料单号 *</Label>
                  <Input
                    value={formData.requisitionNo}
                    onChange={(e) => setFormData({ ...formData, requisitionNo: e.target.value })}
                    readOnly={!!editingOrder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>申请日期</Label>
                  <Input type="date" value={formData.applicationDate} onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>领料仓库</Label>
                  <Select value={formData.warehouseId} onValueChange={(v) => setFormData({ ...formData, warehouseId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                    <SelectContent>
                      {(warehouseList as any[]).map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>计划数量</Label>
                  <Input
                    value={formData.plannedQty}
                    onChange={(e) => setFormData({ ...formData, plannedQty: e.target.value })}
                    placeholder="自动带入"
                  />
                </div>
              </div>

              {/* 第二行：根据模式切换 - 关联生产指令 or 选择产品 */}
              {!selfServiceMode ? (
                /* 普通模式：关联生产指令 */
                <div className="space-y-2">
                  <Label>关联生产指令</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                    onClick={() => setOrderPickerOpen(true)}
                  >
                    {formData.productionOrderId ? (
                      <span className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="font-mono text-xs text-muted-foreground">{formData.productionOrderNo}</span>
                        {formData.productName && <span className="font-medium">{formData.productName}</span>}
                        {formData.batchNo && <span className="text-muted-foreground text-xs">批次: {formData.batchNo}</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">点击选择生产指令...</span>
                    )}
                  </Button>
                </div>
              ) : (
                /* 自主领料模式：从仓库选择产品 */
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>选择产品</Label>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">自主领料</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                    onClick={() => {
                      setInventoryPickerSearch("");
                      setInventoryPickerOpen(true);
                    }}
                  >
                    {formData.selfServiceInventoryId ? (
                      <span className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        {formData.selfServiceItemCode && (
                          <span className="font-mono text-xs text-muted-foreground">{formData.selfServiceItemCode}</span>
                        )}
                        <span className="font-medium">{formData.selfServiceItemName}</span>
                        {formData.selfServiceItemSpec && (
                          <span className="text-muted-foreground text-xs">规格: {formData.selfServiceItemSpec}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">点击从仓库选择产品...</span>
                    )}
                  </Button>
                </div>
              )}

              {/* 产品信息展示（只读，选择后自动带入） */}
              {!selfServiceMode && formData.productionOrderId && (formData.productName || formData.productSpec) && (
                <div className="rounded-md bg-muted/50 p-3 grid grid-cols-4 gap-3 text-sm">
                  {formData.productName && (
                    <div><span className="text-muted-foreground text-xs">产品名称</span><p className="font-medium">{formData.productName}</p></div>
                  )}
                  {formData.productSpec && (
                    <div><span className="text-muted-foreground text-xs">规格型号</span><p>{formData.productSpec}</p></div>
                  )}
                  {formData.batchNo && (
                    <div><span className="text-muted-foreground text-xs">生产批号</span><p className="font-mono">{formData.batchNo}</p></div>
                  )}
                  {formData.unit && (
                    <div><span className="text-muted-foreground text-xs">单位</span><p>{formData.unit}</p></div>
                  )}
                  {formData.productDescription && (
                    <div className="col-span-4"><span className="text-muted-foreground text-xs">产品描述</span><p>{formData.productDescription}</p></div>
                  )}
                </div>
              )}

              {/* 自主领料模式 - 产品信息展示 */}
              {selfServiceMode && formData.selfServiceInventoryId && (formData.selfServiceItemName || formData.selfServiceItemSpec) && (
                <div className="rounded-md bg-blue-50/60 border border-blue-100 p-3 grid grid-cols-4 gap-3 text-sm">
                  {formData.selfServiceItemName && (
                    <div><span className="text-muted-foreground text-xs">产品名称</span><p className="font-medium">{formData.selfServiceItemName}</p></div>
                  )}
                  {formData.selfServiceItemSpec && (
                    <div><span className="text-muted-foreground text-xs">规格型号</span><p>{formData.selfServiceItemSpec}</p></div>
                  )}
                  {formData.selfServiceItemCode && (
                    <div><span className="text-muted-foreground text-xs">物料编码</span><p className="font-mono">{formData.selfServiceItemCode}</p></div>
                  )}
                  {formData.unit && (
                    <div><span className="text-muted-foreground text-xs">单位</span><p>{formData.unit}</p></div>
                  )}
                </div>
              )}

              <Separator />

              {/* 物料明细 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>物料明细</Label>
                  <div className="flex gap-2">
                    {!selfServiceMode && selectedProductId > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadBomItems}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        从 BOM 带出物料
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" />手动添加
                    </Button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
                    {selfServiceMode
                      ? "请先选择产品，或直接手动添加物料"
                      : selectedProductId > 0
                        ? "点击「从 BOM 带出物料」自动填充，或手动添加物料"
                        : "可选择关联生产指令（可选），或直接手动添加物料"}
                  </div>
                ) : (
                  <div className="border rounded-md overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60 text-xs">
                          <TableHead className="font-bold py-2 pl-3">物料编码</TableHead>
                          <TableHead className="font-bold py-2">物料名称</TableHead>
                          <TableHead className="font-bold py-2">规格</TableHead>
                          <TableHead className="font-bold py-2">批号</TableHead>
                          <TableHead className="text-right font-bold py-2">需求数量</TableHead>
                          <TableHead className="text-right font-bold py-2">实领数量</TableHead>
                          <TableHead className="font-bold py-2">单位</TableHead>
                          <TableHead className="w-[70px] text-center font-bold py-2">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx} className="text-xs hover:bg-muted/30">
                            <TableCell className="py-2 pl-3 font-mono text-muted-foreground">{item.materialCode || <span className="text-gray-300">-</span>}</TableCell>
                            <TableCell className="py-2 font-medium">{item.materialName || <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell className="py-2 text-muted-foreground">{item.specification || "-"}</TableCell>
                            <TableCell className="py-2">
                              <button
                                type="button"
                                className={`text-xs px-2 py-1 rounded border transition-colors ${
                                  item.batchNo
                                    ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                    : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                                }`}
                                onClick={() => openBatchPicker(idx)}
                              >
                                {item.batchNo || "选批号"}
                                {item.availableQty > 0 && <span className="ml-1 text-gray-400 text-[10px]">/{item.availableQty}</span>}
                              </button>
                            </TableCell>
                            <TableCell className="py-2 text-right text-muted-foreground">{item.requiredQty > 0 ? item.requiredQty : "-"}</TableCell>
                            <TableCell className="py-2 text-right">
                              <Input
                                type="number"
                                value={item.actualQty}
                                onChange={(e) => updateItem(idx, "actualQty", Number(e.target.value))}
                                className="h-7 w-20 text-xs text-right ml-auto"
                              />
                            </TableCell>
                            <TableCell className="py-2 text-muted-foreground">{item.unit || "-"}</TableCell>
                            <TableCell className="py-2 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  title="复制此行（选不同批次）"
                                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600"
                                  onClick={() => duplicateItem(idx)}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-red-300 hover:text-red-500"
                                  onClick={() => removeItem(idx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingOrder ? "保存修改" : "创建领料单"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 关联生产指令弹窗选择器 */}
        <EntityPickerDialog
          open={orderPickerOpen}
          onOpenChange={setOrderPickerOpen}
          title="选择生产指令"
          searchPlaceholder="搜索指令单号、批次号、产品名称..."
          columns={[
            { key: "orderNo", title: "指令单号", render: (po) => <span className="font-mono font-medium">{po.orderNo}</span> },
            { key: "productName", title: "产品名称", render: (po) => <span className="font-medium">{po.productName}</span> },
            { key: "productSpec", title: "规格型号", render: (po) => <span className="text-muted-foreground">{po.productSpec || "-"}</span> },
            { key: "batchNo", title: "生产批号", render: (po) => <span className="font-mono">{po.batchNo || "-"}</span> },
            { key: "plannedQty", title: "计划数量", render: (po) => <span>{po.plannedQty} {po.unit}</span> },
            { key: "status", title: "状态", render: (po) => {
              const statusLabels: Record<string, string> = { draft: "草稿", planned: "已计划", in_progress: "生产中", completed: "已完成", cancelled: "已取消" };
              return <span>{statusLabels[po.status] || po.status}</span>;
            }},
            { key: "reqStatus", title: "领料状态", render: (po) => {
              if (po.reqStatus === "full") return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">已领完</span>;
              if (po.reqStatus === "partial") return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">部分已领</span>;
              return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">未领料</span>;
            }},
          ]}
          rows={availableOrders.filter((po: any) => po.reqStatus !== "full")}
          filterFn={(po, q) => {
            const lower = q.toLowerCase();
            return String(po.orderNo || "").toLowerCase().includes(lower) ||
              String(po.productName || "").toLowerCase().includes(lower) ||
              String(po.batchNo || "").toLowerCase().includes(lower);
          }}
          onSelect={handleProductionOrderSelect}
        />

        {/* 自主领料 - 从仓库选择产品弹窗 */}
        <DraggableDialog open={inventoryPickerOpen} onOpenChange={(open) => { setInventoryPickerOpen(open); if (!open) setInventoryPickerSelected(new Set()); }}>
          <DraggableDialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>从仓库选择产品</DialogTitle>
              <DialogDescription>从库存中选择需要领取的产品（支持多选）</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
                  placeholder="搜索产品名称、物料编码、批号..."
                  value={inventoryPickerSearch}
                  onChange={(e) => setInventoryPickerSearch(e.target.value)}
                />
              </div>
              <div className="border rounded-md overflow-x-auto max-h-[50vh] overflow-y-auto" style={{WebkitOverflowScrolling:"touch"}}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 text-xs sticky top-0">
                      <TableHead className="py-2 pl-3 w-8">
                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          checked={inventoryWithSpec.length > 0 && inventoryWithSpec.every((inv: any) => inventoryPickerSelected.has(inv.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInventoryPickerSelected(new Set((inventoryWithSpec as any[]).map((inv: any) => inv.id)));
                            } else {
                              setInventoryPickerSelected(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="py-2">产品名称</TableHead>
                      <TableHead className="py-2">物料编码</TableHead>
                      <TableHead className="py-2">规格型号</TableHead>
                      <TableHead className="py-2">批号</TableHead>
                      <TableHead className="py-2 text-right">库存数量</TableHead>
                      <TableHead className="py-2">单位</TableHead>
                      <TableHead className="py-2">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryWithSpec.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">
                          {inventoryPickerSearch ? "暂无匹配的库存记录" : "加载中..."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryWithSpec.map((inv: any) => (
                        <TableRow
                          key={inv.id}
                          className={`text-xs cursor-pointer hover:bg-muted/50 ${
                            inventoryPickerSelected.has(inv.id) ? "bg-blue-50" : ""
                          }`}
                          onClick={() => {
                            setInventoryPickerSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(inv.id)) next.delete(inv.id);
                              else next.add(inv.id);
                              return next;
                            });
                          }}
                        >
                          <TableCell className="py-1.5 pl-3 w-8" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="cursor-pointer"
                              checked={inventoryPickerSelected.has(inv.id)}
                              onChange={() => {
                                setInventoryPickerSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(inv.id)) next.delete(inv.id);
                                  else next.add(inv.id);
                                  return next;
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="py-1.5 font-medium">{inv.itemName}</TableCell>
                          <TableCell className="py-1.5 font-mono text-muted-foreground">{inv.materialCode || "-"}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground">{inv.specification || "-"}</TableCell>
                          <TableCell className="py-1.5 font-mono text-blue-600">{inv.batchNo || inv.lotNo || "-"}</TableCell>
                          <TableCell className="py-1.5 text-right font-medium">{Number(inv.quantity).toFixed(4)}</TableCell>
                          <TableCell className="py-1.5">{inv.unit || "-"}</TableCell>
                          <TableCell className="py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              inv.status === "qualified" ? "bg-green-100 text-green-700" :
                              inv.status === "quarantine" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {inv.status === "qualified" ? "合格" : inv.status === "quarantine" ? "待检" : "不合格"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {inventoryPickerSelected.size > 0 ? (
                  <span className="text-blue-600 font-medium">已勾选 {inventoryPickerSelected.size} 条</span>
                ) : "点击行或勾选复选框可多选"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setInventoryPickerOpen(false); setInventoryPickerSelected(new Set()); }}>取消</Button>
                <Button
                  onClick={handleInventoryMultiConfirm}
                  disabled={inventoryPickerSelected.size === 0}
                  className="bg-primary text-primary-foreground"
                >
                  确认添加（{inventoryPickerSelected.size}）
                </Button>
              </div>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情 */}
        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent>
            {viewingOrder && (
              <div className="space-y-4">
                {/* 标准头部 */}
                <div className="border-b pb-3">
                  <h2 className="text-lg font-semibold">领料单详情</h2>
                  <p className="text-sm text-muted-foreground">
                    {viewingOrder.requisitionNo}
                    {viewingOrder.status && (
                      <> · <Badge variant={statusMap[viewingOrder.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingOrder.status, statusMap[viewingOrder.status]?.label)}`}>
                        {statusMap[viewingOrder.status]?.label || String(viewingOrder.status ?? "-")}
                      </Badge></>
                    )}
                  </p>
                </div>

                <div className="space-y-6 py-2">
                  {/* 基本信息分区 */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="关联任务">{viewingOrder.productionOrderNo || "-"}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="申请日期">{formatDate(viewingOrder.applicationDate)}</FieldRow>
                      </div>
                    </div>
                  </div>

                  {/* 物料明细分区 */}
                  {getViewItems(viewingOrder).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">物料明细 ({getViewItems(viewingOrder).length} 项)</h3>
                      <div className="border rounded-md overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/60">
                              <TableHead className="text-center font-bold">物料编码</TableHead>
                              <TableHead className="text-center font-bold">物料名称</TableHead>
                              <TableHead className="text-center font-bold">规格</TableHead>
                              <TableHead className="text-center font-bold">需求数量</TableHead>
                              <TableHead className="text-center font-bold">单位</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getViewItems(viewingOrder).map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-center font-mono">{item.materialCode}</TableCell>
                                <TableCell className="text-center">{item.materialName}</TableCell>
                                <TableCell className="text-center text-muted-foreground">{item.specification || "-"}</TableCell>
                                <TableCell className="text-center">{item.requiredQty}</TableCell>
                                <TableCell className="text-center">{item.unit}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>

                {/* 标准操作按钮 */}
                <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                  <div className="flex gap-2 flex-wrap"></div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(viewingOrder)}>编辑</Button>
                  </div>
                </div>
              </div>
            )}
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 批号选择弹窗 */}
        <DraggableDialog open={batchPickerOpen} onOpenChange={(open) => { setBatchPickerOpen(open); if (!open) setBatchPickerItemIdx(-1); }}>
          <DraggableDialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>选择物料批号</DialogTitle>
              <DialogDescription>
                {batchPickerItemIdx >= 0 && items[batchPickerItemIdx] && (
                  <span>物料：<strong>{items[batchPickerItemIdx].materialName}</strong>  编码：<span className="font-mono">{items[batchPickerItemIdx].materialCode}</span></span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
                  placeholder="搜索物料名称、编码或批号..."
                  value={batchSearchCode}
                  onChange={(e) => setBatchSearchCode(e.target.value)}
                />
              </div>
              <div className="border rounded-md overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 text-xs">
                      <TableHead className="py-2">物料名称</TableHead>
                      <TableHead className="py-2">物料编码</TableHead>
                      <TableHead className="py-2">规格</TableHead>
                      <TableHead className="py-2">批号</TableHead>
                      <TableHead className="py-2">库存数量</TableHead>
                      <TableHead className="py-2">单位</TableHead>
                      <TableHead className="py-2">状态</TableHead>
                      <TableHead className="py-2">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inventoryBatches as any[]).length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6 text-sm">暂无匹配的库存批次</TableCell></TableRow>
                    ) : (
                      (inventoryBatches as any[]).map((batch: any) => (
                        <TableRow key={batch.id} className="text-xs cursor-pointer hover:bg-muted/50">
                          <TableCell className="py-1.5">{batch.itemName}</TableCell>
                          <TableCell className="py-1.5 font-mono">{batch.materialCode || "-"}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground">{batch.specification || batch.spec || "-"}</TableCell>
                          <TableCell className="py-1.5 font-mono text-blue-600">{batch.batchNo || batch.lotNo || "-"}</TableCell>
                          <TableCell className="py-1.5 font-medium">{Number(batch.quantity).toFixed(4)}</TableCell>
                          <TableCell className="py-1.5">{batch.unit || "-"}</TableCell>
                          <TableCell className="py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              batch.status === "qualified" ? "bg-green-100 text-green-700" :
                              batch.status === "quarantine" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {batch.status === "qualified" ? "合格" : batch.status === "quarantine" ? "待检" : "不合格"}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => handleBatchSelect(batch)}>选择</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchPickerOpen(false)}>取消</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
