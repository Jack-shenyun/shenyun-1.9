import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { formatDate, formatDisplayNumber, roundToDigits } from "@/lib/formatters";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import DateTextInput from "@/components/DateTextInput";
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
import { Separator } from "@/components/ui/separator";
import {
  PackageOpen, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, Truck, RefreshCw,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

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
  inventoryId?: number;
  warehouseId?: number;
  warehouseName?: string;
  batchNo: string;       // 物料批号
  availableQty: number;  // 该批次库存可用数量（参考）
  remark: string;
}

type MaterialRequisitionSignature = {
  id: string;
  action: "create" | "approve";
  signerName: string;
  signedAt: string;
};

function parseMaterialRequisitionRemark(raw: unknown): { selfServiceMode: boolean; note: string; signatures: MaterialRequisitionSignature[] } {
  if (!raw) return { selfServiceMode: false, note: "", signatures: [] };
  try {
    const parsed = JSON.parse(String(raw));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        selfServiceMode: Boolean((parsed as any).selfServiceMode),
        note: String((parsed as any).note || ""),
        signatures: Array.isArray((parsed as any).signatures)
          ? (parsed as any).signatures.map((item: any) => ({
              id: String(item?.id || `${Date.now()}`),
              action: String(item?.action || "create") === "approve" ? "approve" : "create",
              signerName: String(item?.signerName || ""),
              signedAt: String(item?.signedAt || ""),
            }))
          : [],
      };
    }
  } catch {
    return { selfServiceMode: false, note: String(raw), signatures: [] };
  }
  return { selfServiceMode: false, note: String(raw), signatures: [] };
}

function buildMaterialRequisitionRemark(params: {
  selfServiceMode: boolean;
  note: string;
  signatures?: MaterialRequisitionSignature[];
}) {
  return JSON.stringify({
    selfServiceMode: params.selfServiceMode,
    note: params.note || "",
    signatures: params.signatures || [],
  });
}

function createMaterialRequisitionSignature(action: "create" | "approve", signerName: string): MaterialRequisitionSignature {
  return {
    id: `${action}-${Date.now()}`,
    action,
    signerName,
    signedAt: new Date().toISOString(),
  };
}

function formatWholeNumber(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const num = Number(text);
  if (Number.isFinite(num)) return formatDisplayNumber(num);
  return text.includes(".") ? text.split(".")[0] : text;
}

function formatDisplayQty(value: unknown, digits = 4) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  const num = Number(text);
  if (!Number.isFinite(num)) return text;
  return formatDisplayNumber(num, { maximumFractionDigits: Math.min(digits, 2) });
}

export default function MaterialRequisitionPage() {
  const PAGE_SIZE = 10;
  const { canDelete } = usePermission();
  const { user } = useAuth();
  const trpcUtils = trpc.useUtils();
  const { data: orders = [], isLoading, refetch } = trpc.materialRequisitionOrders.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: productionPlans = [] } = trpc.productionPlans.list.useQuery({});
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({});
  const { data: productsData = [] } = trpc.products.list.useQuery();
  const { data: allQualifiedInventory = [] } = trpc.inventory.list.useQuery({ status: "qualified", limit: 3000 });

  const createMutation = trpc.materialRequisitionOrders.create.useMutation({
    onSuccess: () => { refetch(); toast.success("领料单已保存"); setDialogOpen(false); },
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
  const [currentPage, setCurrentPage] = useState(1);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordAction, setPasswordAction] = useState<"create" | "approve" | null>(null);
  const [pendingApproveOrder, setPendingApproveOrder] = useState<any>(null);
  const verifyPasswordMutation = trpc.auth.verifyPassword.useMutation();

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
  const [batchPickerSelected, setBatchPickerSelected] = useState<Set<number>>(new Set());

  // 当前选中的生产指令对应的 productId（用于查询 BOM）
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
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

  const appendSignatureToRemark = (remarkText: unknown, action: "create" | "approve") => {
    const meta = parseMaterialRequisitionRemark(remarkText);
    const signerName = String((user as any)?.name || "当前用户");
    return buildMaterialRequisitionRemark({
      selfServiceMode: meta.selfServiceMode,
      note: meta.note,
      signatures: [...meta.signatures, createMaterialRequisitionSignature(action, signerName)],
    });
  };

  // 查询选中产品的 BOM 物料明细
  const { data: bomItems = [], refetch: refetchBom } = trpc.bom.getByProductId.useQuery(
    { productId: selectedProductId },
    { enabled: selectedProductId > 0 }
  );
  const selectedProductionOrder = useMemo(
    () => (productionOrders as any[]).find((po: any) => Number(po.id) === Number(formData.productionOrderId)),
    [productionOrders, formData.productionOrderId],
  );
  const currentProductId = Number(selectedProductionOrder?.productId || selectedProductId || 0);
  const sourcePlanProductId = useMemo(() => {
    if (!selectedProductionOrder?.planId) return 0;
    const sourcePlan = (productionPlans as any[]).find((plan: any) => Number(plan.id) === Number(selectedProductionOrder.planId));
    return Number(sourcePlan?.productId || 0);
  }, [productionPlans, selectedProductionOrder]);
  const { data: sourcePlanBomItems = [] } = trpc.bom.list.useQuery(
    { productId: sourcePlanProductId },
    {
      enabled:
        Number(formData.productionOrderId) > 0 &&
        selectedProductionOrder?.orderType === "semi_finished" &&
        sourcePlanProductId > 0 &&
        sourcePlanProductId !== selectedProductId,
    }
  );

  const warehouseNameMap = useMemo(
    () =>
      Object.fromEntries(
        (warehouseList as any[]).map((warehouse: any) => [Number(warehouse.id), String(warehouse.name || "")])
      ) as Record<number, string>,
    [warehouseList]
  );

  const materialWarehouseOptions = useMemo(
    () =>
      (warehouseList as any[]).filter((warehouse: any) => {
        const text = `${String(warehouse?.name || "")} ${String(warehouse?.code || "")}`.toLowerCase();
        return text.includes("原料") || text.includes("raw") || text.includes("暂存") || text.includes("staging");
      }),
    [warehouseList]
  );

  const getWarehouseName = (warehouseId?: number | string) => {
    const id = Number(warehouseId || 0);
    return id > 0 ? warehouseNameMap[id] || "" : "";
  };

  // 查询库存中该物料的所有批次（批号选择器用）
  const { data: inventoryBatches = [] } = trpc.inventory.list.useQuery(
    { search: batchSearchCode },
    { enabled: batchPickerOpen && batchSearchCode.length > 0 }
  );
  const availableInventoryBatches = useMemo(
    () => (inventoryBatches as any[]).filter((batch: any) => Number(batch.quantity || 0) > 0),
    [inventoryBatches],
  );
  const inventoryBatchesWithMeta = useMemo(
    () =>
      availableInventoryBatches
        .map((batch: any) => ({
          ...batch,
          warehouseName: getWarehouseName(batch?.warehouseId),
        }))
        .sort((a: any, b: any) => {
          const aTime = new Date(String(a.inboundDate || a.createdAt || a.updatedAt || 0)).getTime();
          const bTime = new Date(String(b.inboundDate || b.createdAt || b.updatedAt || 0)).getTime();
          if (aTime !== bTime) return aTime - bTime;
          return String(a.batchNo || a.lotNo || "").localeCompare(String(b.batchNo || b.lotNo || ""), "zh-CN");
        }),
    [availableInventoryBatches, warehouseNameMap],
  );
  const materialWarehouseIdSet = useMemo(
    () => new Set(materialWarehouseOptions.map((warehouse: any) => Number(warehouse.id))),
    [materialWarehouseOptions],
  );
  const qualifiedInventoryWithMeta = useMemo(
    () =>
      ((allQualifiedInventory as any[]) || [])
        .filter((item: any) => Number(item.quantity || 0) > 0 && materialWarehouseIdSet.has(Number(item.warehouseId || 0)))
        .map((item: any) => {
          const matchedProduct = (productsData as any[]).find((product: any) => Number(product.id) === Number(item.productId));
          return {
            ...item,
            warehouseName: getWarehouseName(item?.warehouseId),
            specification: matchedProduct?.specification || "",
          };
        })
        .sort((a: any, b: any) => {
          const aTime = new Date(String(a.productionDate || a.createdAt || a.updatedAt || 0)).getTime();
          const bTime = new Date(String(b.productionDate || b.createdAt || b.updatedAt || 0)).getTime();
          if (aTime !== bTime) return aTime - bTime;
          return String(a.batchNo || a.lotNo || "").localeCompare(String(b.batchNo || b.lotNo || ""), "zh-CN");
        }),
    [allQualifiedInventory, getWarehouseName, materialWarehouseIdSet, productsData],
  );
  const visibleBatchOptions = useMemo(
    () => {
      const currentItem = batchPickerItemIdx >= 0 ? items[batchPickerItemIdx] : null;
      return inventoryBatchesWithMeta.filter((batch: any) => {
        if (Number(batch.quantity || 0) <= 0.000001) return false;
        if (currentItem?.warehouseId && Number(batch.warehouseId || 0) !== Number(currentItem.warehouseId)) return false;
        return true;
      });
    },
    [batchPickerItemIdx, inventoryBatchesWithMeta, items],
  );

  // 自主领料 - 查询库存列表（产品选择器用）
  const { data: inventoryForPicker = [] } = trpc.inventory.list.useQuery(
    { search: inventoryPickerSearch, limit: 200 },
    { enabled: inventoryPickerOpen }
  );

  const normalizeMaterialItem = (item: any, fallbackWarehouseId?: number | string): MaterialItem => {
    const resolvedWarehouseId = Number(item?.warehouseId || fallbackWarehouseId || 0);
    return {
      materialCode: String(item?.materialCode || ""),
      materialName: String(item?.materialName || ""),
      specification: String(item?.specification || ""),
      requiredQty: Number(item?.requiredQty || 0),
      unit: String(item?.unit || ""),
      actualQty: Number(item?.actualQty || 0),
      inventoryId: item?.inventoryId == null ? undefined : Number(item.inventoryId),
      warehouseId: resolvedWarehouseId || undefined,
      warehouseName: String(item?.warehouseName || getWarehouseName(resolvedWarehouseId) || ""),
      batchNo: String(item?.batchNo || ""),
      availableQty: Number(item?.availableQty || 0),
      remark: String(item?.remark || ""),
    };
  };

  const filteredOrders = (orders as any[]).filter((o) => {
    const matchSearch = !searchTerm ||
      String(o.requisitionNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.productionOrderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filteredOrders.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (selectedProductionOrder?.productId && Number(selectedProductionOrder.productId) !== Number(selectedProductId)) {
      setSelectedProductId(Number(selectedProductionOrder.productId));
    }
  }, [selectedProductionOrder, selectedProductId]);

  const handleAdd = () => {
    setEditingOrder(null);
    setSelectedProductId(0);
    setItems([]);
    setFormData({
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
    const remarkMeta = parseMaterialRequisitionRemark(order.remark);
    const linkedProductionOrder = (productionOrders as any[]).find((po: any) => Number(po.id) === Number(order.productionOrderId));
    const linkedProduct = linkedProductionOrder
      ? (productsData as any[]).find((p: any) => Number(p.id) === Number(linkedProductionOrder.productId))
      : null;
    const firstSelfServiceItem = parsedItems[0];
    setItems(parsedItems.length > 0 ? parsedItems.map((item) => normalizeMaterialItem(item, order.warehouseId)) : []);
    setSelfServiceMode(remarkMeta.selfServiceMode);
    setSelectedProductId(Number(linkedProductionOrder?.productId || 0));
    setFormData({
      requisitionNo: order.requisitionNo,
      productionOrderId: order.productionOrderId ? String(order.productionOrderId) : "",
      productionOrderNo: order.productionOrderNo || "",
      productName: linkedProduct?.name || linkedProductionOrder?.productName || "",
      productSpec: linkedProduct?.specification || "",
      productDescription: linkedProduct?.description || "",
      batchNo: linkedProductionOrder?.batchNo || "",
      plannedQty: formatWholeNumber(linkedProductionOrder?.plannedQty),
      unit: remarkMeta.selfServiceMode ? firstSelfServiceItem?.unit || "" : linkedProductionOrder?.unit || linkedProduct?.unit || "",
      warehouseId: order.warehouseId ? String(order.warehouseId) : "",
      applicationDate: order.requisitionDate
        ? String(order.requisitionDate).split("T")[0]
        : order.applicationDate
          ? String(order.applicationDate).split("T")[0]
          : "",
      remark: remarkMeta.note,
      selfServiceItemName: remarkMeta.selfServiceMode ? firstSelfServiceItem?.materialName || "" : "",
      selfServiceItemSpec: remarkMeta.selfServiceMode ? firstSelfServiceItem?.specification || "" : "",
      selfServiceItemCode: remarkMeta.selfServiceMode ? firstSelfServiceItem?.materialCode || "" : "",
      selfServiceInventoryId: remarkMeta.selfServiceMode && firstSelfServiceItem ? "__existing__" : "",
    });
    setDialogOpen(true);
  };

  const handleView = (order: any) => {
    setViewingOrder(order);
    setViewDialogOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focusId = Number(params.get("focusId") || 0);
    if (!focusId || viewDialogOpen) return;
    const matchedOrder = (orders as any[]).find((order: any) => Number(order.id) === focusId);
    if (!matchedOrder) return;
    setViewingOrder(matchedOrder);
    setViewDialogOpen(true);
    params.delete("focusId");
    const nextQuery = params.toString();
    window.history.replaceState({}, "", nextQuery ? `/production/material-requisition?${nextQuery}` : "/production/material-requisition");
  }, [orders, viewDialogOpen]);

  const handleDelete = (order: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: order.id });
  };

  const openPasswordConfirm = (action: "create" | "approve", order?: any) => {
    setPasswordAction(action);
    setPendingApproveOrder(order || null);
    setPasswordValue("");
    setPasswordDialogOpen(true);
  };

  const handleIssue = (order: any) => {
    openPasswordConfirm("approve", order);
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
      plannedQty: formatWholeNumber(po.plannedQty),
      unit: po.unit || product?.unit || "",
    }));
    setSelectedProductId(newProductId);
    setOrderPickerOpen(false);
    // 延迟一下再提示，等 BOM 查询触发
    setTimeout(() => {
      if (!selfServiceMode && newProductId > 0) {
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
      inventoryId: Number(inv.id || 0) || undefined,
      warehouseId: Number(inv.warehouseId || 0) || undefined,
      warehouseName: getWarehouseName(inv.warehouseId),
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
        inventoryId: Number(inv.id || 0) || undefined,
        warehouseId: Number(inv.warehouseId || 0) || undefined,
        warehouseName: getWarehouseName(inv.warehouseId),
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
  const handleLoadBomItems = async () => {
    const productionOrderId = Number(formData.productionOrderId || 0);
    if (productionOrderId <= 0) {
      toast.warning("请先选择生产指令");
      return;
    }
    try {
      const suggestedItems = await trpcUtils.materialRequisitionOrders.getSuggestedItems.fetch({ productionOrderId });
      const newItems = (suggestedItems as MaterialItem[])
        .filter((item) => Number(item.requiredQty || 0) > 0)
        .map((item) => normalizeMaterialItem(item, formData.warehouseId));
      if (newItems.length === 0) {
        toast.warning("该生产指令暂无可带出的 BOM 物料");
        return;
      }
      setItems(newItems);
      toast.success(`已从 BOM 带出 ${newItems.length} 条待领物料`);
    } catch (error) {
      console.error("加载 BOM 物料失败", error);
      toast.error("带出 BOM 物料失败");
    }
  };

  const findMatchingInventoryRows = (item: MaterialItem) => {
    const code = String(item.materialCode || "").trim();
    const name = String(item.materialName || "").trim();
    const specification = String(item.specification || "").trim();
    return qualifiedInventoryWithMeta.filter((inventory: any) => {
      const inventoryCode = String(inventory.materialCode || "").trim();
      const inventoryName = String(inventory.itemName || "").trim();
      const inventorySpec = String(inventory.specification || "").trim();
      if (code && inventoryCode === code) return true;
      if (name && inventoryName === name) {
        if (!specification) return true;
        return !inventorySpec || inventorySpec === specification;
      }
      return false;
    });
  };

  const autoAssignWarehouseAndBatch = (sourceItems: MaterialItem[]) => {
    const inventoryRemainMap = new Map<number, number>();
    qualifiedInventoryWithMeta.forEach((inventory: any) => {
      inventoryRemainMap.set(Number(inventory.id), Number(inventory.quantity || 0) || 0);
    });

    const nextItems: MaterialItem[] = [];
    const missingMaterials: string[] = [];
    const insufficientMaterials: string[] = [];

    sourceItems.forEach((item) => {
      if (!item.materialCode && !item.materialName) {
        nextItems.push(item);
        return;
      }

      const targetQty = Number(item.actualQty || item.requiredQty || 0);
      if (targetQty <= 0) {
        nextItems.push({
          ...item,
          inventoryId: undefined,
          warehouseId: undefined,
          warehouseName: "",
          batchNo: "",
          availableQty: 0,
        });
        return;
      }

      const matchedInventoryRows = findMatchingInventoryRows(item);
      if (matchedInventoryRows.length === 0) {
        missingMaterials.push(item.materialName || item.materialCode);
        nextItems.push({
          ...item,
          inventoryId: undefined,
          warehouseId: undefined,
          warehouseName: "",
          batchNo: "",
          availableQty: 0,
        });
        return;
      }

      let remainingQty = roundToDigits(targetQty, 4);

      matchedInventoryRows.forEach((inventory: any) => {
        if (remainingQty <= 0) return;
        const inventoryId = Number(inventory.id || 0);
        const availableQty = Number(inventoryRemainMap.get(inventoryId) || 0);
        if (availableQty <= 0) return;

        const allocatedQty = Math.min(remainingQty, availableQty);
        if (allocatedQty <= 0) return;

        nextItems.push({
          ...item,
          inventoryId: inventoryId || undefined,
          warehouseId: Number(inventory.warehouseId || 0) || undefined,
          warehouseName: inventory.warehouseName || getWarehouseName(inventory.warehouseId),
          batchNo: inventory.batchNo || inventory.lotNo || "",
          availableQty: Number(inventory.quantity || 0) || 0,
          requiredQty: roundToDigits(allocatedQty, 4),
          actualQty: roundToDigits(allocatedQty, 4),
        });

        inventoryRemainMap.set(inventoryId, roundToDigits(availableQty - allocatedQty, 4));
        remainingQty = roundToDigits(remainingQty - allocatedQty, 4);
      });

      if (remainingQty > 0) {
        insufficientMaterials.push(`${item.materialName || item.materialCode} 缺 ${remainingQty}`);
        nextItems.push({
          ...item,
          inventoryId: undefined,
          warehouseId: undefined,
          warehouseName: "",
          batchNo: "",
          availableQty: 0,
          requiredQty: remainingQty,
          actualQty: remainingQty,
          remark: [item.remark, `库存不足，剩余待分配 ${remainingQty}`].filter(Boolean).join("；"),
        });
      }
    });

    return { nextItems, missingMaterials, insufficientMaterials };
  };

  const handleAutoFillWarehouseAndBatch = async () => {
    const productionOrderId = Number(formData.productionOrderId || 0);
    if (productionOrderId <= 0) {
      toast.warning("请先选择生产指令");
      return;
    }

    try {
      let sourceItems = items;
      if (sourceItems.length === 0) {
        const suggestedItems = await trpcUtils.materialRequisitionOrders.getSuggestedItems.fetch({ productionOrderId });
        sourceItems = (suggestedItems as MaterialItem[])
          .filter((item) => Number(item.requiredQty || 0) > 0)
          .map((item) => normalizeMaterialItem(item, formData.warehouseId));
      }

      if (sourceItems.length === 0) {
        toast.warning("该生产指令暂无可带出的 BOM 物料");
        return;
      }

      const { nextItems, missingMaterials, insufficientMaterials } = autoAssignWarehouseAndBatch(sourceItems);
      setItems(nextItems);

      if (missingMaterials.length > 0) {
        toast.warning(`以下物料暂无可用库存：${missingMaterials.join("、")}`);
        return;
      }

      if (insufficientMaterials.length > 0) {
        toast.warning(`已按先进先出分配，部分库存不足：${insufficientMaterials.join("、")}`);
        return;
      }

      toast.success("已按先进先出自动带入仓库和批号");
    } catch (error) {
      console.error("自动带入仓库批号失败", error);
      toast.error("自动带入仓库批号失败");
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        materialCode: "",
        materialName: "",
        specification: "",
        requiredQty: 0,
        unit: "件",
        actualQty: 0,
        inventoryId: undefined,
        warehouseId: formData.warehouseId ? Number(formData.warehouseId) : undefined,
        warehouseName: getWarehouseName(formData.warehouseId),
        batchNo: "",
        availableQty: 0,
        remark: "",
      },
    ]);
  };

  // 复制一行（用于同一物料选不同批次）
  const duplicateItem = (idx: number) => {
    const item = items[idx];
    const newItem = { ...item, inventoryId: undefined, batchNo: "", availableQty: 0, actualQty: 0 };
    const newItems = [...items];
    newItems.splice(idx + 1, 0, newItem);
    setItems(newItems);
  };

  // 打开批号选择弹窗
  const openBatchPicker = (idx: number) => {
    const item = items[idx];
    setBatchPickerItemIdx(idx);
    setBatchPickerSelected(item.inventoryId ? new Set([Number(item.inventoryId)]) : new Set());
    // 优先用物料编码搜索，若无编码则用物料名称
    // 后端 search 字段同时匹配 itemName / batchNo / materialCode
    setBatchSearchCode(item.materialCode || item.materialName || "");
    setBatchPickerOpen(true);
  };

  const handleBatchToggle = (batchId: number) => {
    setBatchPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  const handleBatchConfirm = () => {
    if (batchPickerItemIdx < 0) return;
    if (batchPickerSelected.size === 0) {
      toast.warning("请至少选择一个批次");
      return;
    }
    const selectedBatches = visibleBatchOptions.filter((batch: any) => batchPickerSelected.has(Number(batch.id)));
    if (selectedBatches.length === 0) {
      toast.warning("未找到已选批次");
      return;
    }

    setItems((prev) => {
      const currentItem = prev[batchPickerItemIdx];
      if (!currentItem) return prev;
      const nextRows = selectedBatches.map((batch: any, index: number) => ({
        ...currentItem,
        inventoryId: Number(batch.id || 0) || undefined,
        warehouseId: Number(batch.warehouseId || 0) || undefined,
        warehouseName: getWarehouseName(batch.warehouseId),
        batchNo: batch.batchNo || batch.lotNo || "",
        availableQty: Number(batch.quantity) || 0,
        actualQty: index === 0 ? currentItem.actualQty : 0,
        requiredQty: index === 0 ? currentItem.requiredQty : 0,
      }));
      const next = [...prev];
      next.splice(batchPickerItemIdx, 1, ...nextRows);
      return next;
    });

    setBatchPickerOpen(false);
    setBatchPickerItemIdx(-1);
    setBatchPickerSelected(new Set());
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof MaterialItem, value: any) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleItemWarehouseChange = (idx: number, warehouseId: string) => {
    const nextWarehouseId = warehouseId ? Number(warehouseId) : undefined;
    const nextWarehouseName = getWarehouseName(nextWarehouseId);
    setItems((prev) =>
      prev.map((item, itemIdx) =>
        itemIdx === idx
          ? {
              ...item,
              warehouseId: nextWarehouseId,
              warehouseName: nextWarehouseName,
              batchNo: "",
              availableQty: 0,
            }
          : item
      )
    );
  };

  const getOrderWarehouseIdFromItems = () => {
    const firstMatched = items.find((item) => Number(item.warehouseId || 0) > 0);
    return firstMatched?.warehouseId ? Number(firstMatched.warehouseId) : (formData.warehouseId ? Number(formData.warehouseId) : undefined);
  };

  const submitCreateOrUpdate = () => {
    if (selfServiceMode && !formData.productionOrderId) {
      toast.error("自主领料必须关联生产指令");
      return;
    }
    // items 单独存入 items 字段（JSON 字符串），remark 存备注 + selfServiceMode 元数据
    const itemsJson = JSON.stringify(items);
    const baseRemarkMeta = buildMaterialRequisitionRemark({ selfServiceMode, note: formData.remark });
    const remarkMeta = appendSignatureToRemark(baseRemarkMeta, "create");
    const orderWarehouseId = getOrderWarehouseIdFromItems();
    const payload = {
      requisitionNo: formData.requisitionNo || undefined,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      warehouseId: orderWarehouseId,
      requisitionDate: formData.applicationDate || undefined,
      status: "draft" as const,
      items: itemsJson,
      remark: remarkMeta,
    };
    if (editingOrder) {
      updateMutation.mutate({
        id: editingOrder.id,
        data: {
          productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
          productionOrderNo: formData.productionOrderNo || undefined,
          warehouseId: orderWarehouseId,
          requisitionDate: formData.applicationDate || undefined,
          status: "draft",
          items: itemsJson,
          remark: remarkMeta,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSubmit = () => {
    openPasswordConfirm("create");
  };

  const handlePasswordConfirm = async () => {
    if (!passwordValue.trim()) {
      toast.error("请输入密码");
      return;
    }
    try {
      await verifyPasswordMutation.mutateAsync({ password: passwordValue });
      if (passwordAction === "create") {
        submitCreateOrUpdate();
      } else if (passwordAction === "approve" && pendingApproveOrder) {
        const remarkMeta = appendSignatureToRemark(pendingApproveOrder.remark, "approve");
        updateMutation.mutate({
          id: pendingApproveOrder.id,
          data: {
            status: "issued",
            remark: remarkMeta,
          },
        });
      }
      setPasswordDialogOpen(false);
      setPasswordValue("");
      setPasswordAction(null);
      setPendingApproveOrder(null);
    } catch (error: any) {
      toast.error(error?.message || "密码校验失败");
    }
  };

  const getViewItems = (order: any): MaterialItem[] => {
    try {
      // 优先从独立的 items 字段读取，兼容旧数据（存在 remark.items 中）
      if (order.items) return (JSON.parse(order.items) || []).map((item: any) => normalizeMaterialItem(item, order.warehouseId));
      const extra = JSON.parse(order.remark || "{}");
      return (extra.items || []).map((item: any) => normalizeMaterialItem(item, order.warehouseId));
    } catch { return []; }
  };

  const draftCount = (orders as any[]).filter((o) => o.status === "draft").length;
  const pendingCount = (orders as any[]).filter((o) => o.status === "pending" || o.status === "approved").length;
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
    })
    .filter((po: any) => po.reqStatus !== "full");

  // 库存产品列表（用于自主领料弹窗选择），附加规格
  const inventoryWithSpec = useMemo(() => {
    return (inventoryForPicker as any[]).map((inv: any) => {
      const product = (productsData as any[]).find((p: any) => p.id === inv.productId);
      return {
        ...inv,
        specification: product?.specification || inv.specification || inv.spec || "",
        warehouseName: getWarehouseName(inv?.warehouseId),
      };
    });
  }, [inventoryForPicker, productsData, warehouseNameMap]);

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => {
    const renderValue = (value: React.ReactNode): React.ReactNode => {
      if (value == null || value === "") return "-";
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (Array.isArray(value)) {
        const items = value
          .map((item) => item instanceof Date ? item.toISOString().slice(0, 10) : item)
          .filter((item) => item != null && item !== "");
        return items.length > 0 ? items.join(" ") : "-";
      }
      return value;
    };

    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
        <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
        <span className="flex-1 text-sm text-right break-all">{renderValue(children)}</span>
      </div>
    );
  };


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
                ) : pagedOrders.map((order: any) => {
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
                                <DropdownMenuItem onClick={() => handleIssue(order)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />审核通过并发料
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => handleIssue(order)}><Truck className="h-4 w-4 mr-2" />审核通过并发料</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "rejected" } })} className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />拒绝
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "approved" && (
                              <DropdownMenuItem onClick={() => handleIssue(order)}><Truck className="h-4 w-4 mr-2" />审核通过并发料</DropdownMenuItem>
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
        <TablePaginationFooter total={filteredOrders.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto text-sm [&_input]:text-sm [&_label]:text-sm [&_[role=combobox]]:text-sm [&_textarea]:text-sm">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight">{editingOrder ? "编辑领料单" : "新建领料单"}</DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">填写领料申请信息及物料明细</DialogDescription>
                </div>
                {/* 自主领料切换按钮 */}
                <button
                  type="button"
                  onClick={() => {
                    setSelfServiceMode(!selfServiceMode);
                    // 切换模式时保留生产指令，仅清空自主选料缓存和明细，避免两种模式数据互串
                    setFormData((f) => ({
                      ...f,
                      selfServiceItemName: "",
                      selfServiceItemSpec: "",
                      selfServiceItemCode: "",
                      selfServiceInventoryId: "",
                    }));
                    setItems([]);
                  }}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
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
            <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-1">

              {/* 第一行：领料单号 + 申请日期 + 计划数量 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">领料单号 *</Label>
                  <Input
                    className="h-10"
                    value={formData.requisitionNo}
                    onChange={(e) => setFormData({ ...formData, requisitionNo: e.target.value })}
                    placeholder="保存后系统生成"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">申请日期</Label>
                  <DateTextInput className="h-10" value={formData.applicationDate} onChange={(value) => setFormData({ ...formData, applicationDate: value })} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">计划数量</Label>
                  <Input
                    className="h-10"
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
                  <Label className="font-semibold">关联生产指令</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-start text-sm font-normal"
                    onClick={() => setOrderPickerOpen(true)}
                  >
                    {formData.productionOrderId ? (
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span className="font-mono text-xs text-muted-foreground">{formData.productionOrderNo}</span>
                        {formData.productName && <span className="font-medium">{formData.productName}</span>}
                        {formData.batchNo && <span className="text-xs text-muted-foreground">批次: {formData.batchNo}</span>}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">点击选择生产指令...</span>
                    )}
                  </Button>
                </div>
              ) : (
                /* 自主领料模式：先关联生产指令，再从仓库选择产品 */
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="font-semibold">关联生产指令</Label>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">自主领料</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start text-sm font-normal"
                      onClick={() => setOrderPickerOpen(true)}
                    >
                      {formData.productionOrderId ? (
                        <span className="flex items-center gap-2 text-sm">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs text-muted-foreground">{formData.productionOrderNo}</span>
                          {formData.productName && <span className="font-medium">{formData.productName}</span>}
                          {formData.batchNo && <span className="text-xs text-muted-foreground">批次: {formData.batchNo}</span>}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">点击选择生产指令...</span>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">选择产品</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start text-sm font-normal"
                      onClick={() => {
                        if (!formData.productionOrderId) {
                          toast.error("请先关联生产指令");
                          return;
                        }
                        setInventoryPickerSearch("");
                        setInventoryPickerOpen(true);
                      }}
                    >
                      {formData.selfServiceInventoryId ? (
                        <span className="flex items-center gap-2 text-sm">
                          <span className="text-green-600">✓</span>
                          {formData.selfServiceItemCode && (
                            <span className="font-mono text-xs text-muted-foreground">{formData.selfServiceItemCode}</span>
                          )}
                          <span className="font-medium">{formData.selfServiceItemName}</span>
                          {formData.selfServiceItemSpec && (
                            <span className="text-xs text-muted-foreground">规格: {formData.selfServiceItemSpec}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">点击从仓库选择产品...</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* 产品信息展示（只读，选择后自动带入） */}
              {!selfServiceMode && formData.productionOrderId && (formData.productName || formData.productSpec) && (
                <div className="grid grid-cols-4 gap-3 rounded-md bg-muted/50 p-4 text-sm">
                  {formData.productName && (
                    <div><span className="text-xs text-muted-foreground">产品名称</span><p className="mt-1 font-medium">{formData.productName}</p></div>
                  )}
                  {formData.productSpec && (
                    <div><span className="text-xs text-muted-foreground">规格型号</span><p className="mt-1">{formData.productSpec}</p></div>
                  )}
                  {formData.batchNo && (
                    <div><span className="text-xs text-muted-foreground">生产批号</span><p className="mt-1 font-mono">{formData.batchNo}</p></div>
                  )}
                  {formData.unit && (
                    <div><span className="text-xs text-muted-foreground">单位</span><p className="mt-1">{formData.unit}</p></div>
                  )}
                  {formData.productDescription && (
                    <div className="col-span-4"><span className="text-xs text-muted-foreground">产品描述</span><p className="mt-1">{formData.productDescription}</p></div>
                  )}
                </div>
              )}

              {/* 自主领料模式 - 产品信息展示 */}
              {selfServiceMode && formData.selfServiceInventoryId && (formData.selfServiceItemName || formData.selfServiceItemSpec) && (
                <div className="grid grid-cols-4 gap-3 rounded-md border border-blue-100 bg-blue-50/60 p-4 text-sm">
                  {formData.selfServiceItemName && (
                    <div><span className="text-xs text-muted-foreground">产品名称</span><p className="mt-1 font-medium">{formData.selfServiceItemName}</p></div>
                  )}
                  {formData.selfServiceItemSpec && (
                    <div><span className="text-xs text-muted-foreground">规格型号</span><p className="mt-1">{formData.selfServiceItemSpec}</p></div>
                  )}
                  {formData.selfServiceItemCode && (
                    <div><span className="text-xs text-muted-foreground">物料编码</span><p className="mt-1 font-mono">{formData.selfServiceItemCode}</p></div>
                  )}
                  {formData.unit && (
                    <div><span className="text-xs text-muted-foreground">单位</span><p className="mt-1">{formData.unit}</p></div>
                  )}
                </div>
              )}

              <Separator />

              {/* 物料明细 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">物料明细</Label>
                  <div className="flex gap-2">
                    {!selfServiceMode && selectedProductId > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoFillWarehouseAndBatch}
                        className="h-9 text-sm"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        一键带入仓库批号
                      </Button>
                    )}
                    {!selfServiceMode && selectedProductId > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadBomItems}
                        className="h-9 text-sm text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        从 BOM 带出物料
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" className="h-9 text-sm" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" />手动添加
                    </Button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                    {selfServiceMode
                      ? "请先关联生产指令，再选择产品，或直接手动添加物料"
                      : selectedProductId > 0
                        ? "点击「从 BOM 带出物料」自动填充，或手动添加物料"
                        : "可选择关联生产指令（可选），或直接手动添加物料"}
                  </div>
                ) : (
                  <div className="border rounded-md overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                      <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60 text-sm">
                          <TableHead className="py-3 text-sm font-bold">物料名称</TableHead>
                          <TableHead className="w-[120px] py-3 text-sm font-bold">规格</TableHead>
                          <TableHead className="w-[92px] py-3 text-sm font-bold">领料仓库</TableHead>
                          <TableHead className="py-3 text-sm font-bold">批号</TableHead>
                          <TableHead className="w-[60px] py-3 text-right text-sm font-bold">需求数量</TableHead>
                          <TableHead className="w-[68px] py-3 text-right text-sm font-bold">实领数量</TableHead>
                          <TableHead className="w-[56px] py-3 text-sm font-bold">单位</TableHead>
                          <TableHead className="w-[56px] py-3 text-center text-sm font-bold">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx} className="text-sm hover:bg-muted/30">
                            <TableCell className="py-3 text-sm font-medium">{item.materialName || <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell className="max-w-[120px] py-3 text-sm text-muted-foreground truncate" title={item.specification || "-"}>
                              {item.specification || "-"}
                            </TableCell>
                            <TableCell className="py-2">
                              <Select
                                value={item.warehouseId ? String(item.warehouseId) : "__none__"}
                                onValueChange={(value) => handleItemWarehouseChange(idx, value === "__none__" ? "" : value)}
                              >
                                <SelectTrigger className="h-9 min-w-[82px] text-sm">
                                  <SelectValue placeholder="选择仓库" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">未选择</SelectItem>
                                  {materialWarehouseOptions.map((w: any) => (
                                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-2">
                              <button
                                type="button"
                                className={`rounded border px-2.5 py-1.5 text-sm transition-colors ${
                                  item.batchNo
                                    ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                    : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                                }`}
                                onClick={() => openBatchPicker(idx)}
                              >
                                {item.batchNo ? (
                                  <span>{item.availableQty > 0 ? formatDisplayNumber(item.availableQty) : "-"}</span>
                                ) : (
                                  "选批号"
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="py-3 text-right text-sm text-muted-foreground">{item.requiredQty > 0 ? item.requiredQty : "-"}</TableCell>
                            <TableCell className="py-2 text-right">
                              <Input
                                type="number"
                                value={item.actualQty}
                                onChange={(e) => updateItem(idx, "actualQty", Number(e.target.value))}
                                className="ml-auto h-9 w-14 text-sm text-right"
                              />
                            </TableCell>
                            <TableCell className="py-3 text-sm text-muted-foreground">{item.unit || "-"}</TableCell>
                            <TableCell className="py-3 text-center">
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
                <Label className="font-semibold">备注</Label>
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

        <DraggableDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DraggableDialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{passwordAction === "approve" ? "审核通过并确认发料" : "电子签名确认"}</DialogTitle>
              <DialogDescription>
                按 FDA 电子记录要求，请由当前登录用户输入密码完成本次{passwordAction === "approve" ? "审核/发料" : "保存"}确认
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>当前用户</Label>
                <Input value={String((user as any)?.name || "")} readOnly className="bg-muted/40" />
              </div>
              <div className="space-y-2">
                <Label>密码</Label>
                <Input
                  type="password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="请输入当前用户密码"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handlePasswordConfirm();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>取消</Button>
              <Button onClick={handlePasswordConfirm} disabled={verifyPasswordMutation.isPending}>
                确认
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
            { key: "plannedQty", title: "计划数量", render: (po) => <span>{formatWholeNumber(po.plannedQty)} {po.unit}</span> },
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
          rows={availableOrders}
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
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
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
                      <TableHead className="py-2">仓库</TableHead>
                      <TableHead className="py-2">批号</TableHead>
                      <TableHead className="py-2 text-right">库存数量</TableHead>
                      <TableHead className="py-2">单位</TableHead>
                      <TableHead className="py-2">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryWithSpec.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-sm">
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
                          <TableCell className="py-1.5">{inv.warehouseName || "-"}</TableCell>
                          <TableCell className="py-1.5 font-mono text-blue-600">{inv.batchNo || inv.lotNo || "-"}</TableCell>
                          <TableCell className="py-1.5 text-right font-medium">{formatDisplayQty(inv.quantity)}</TableCell>
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
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            {viewingOrder && (
              (() => {
                const linkedProductionOrder = (productionOrders as any[]).find((po: any) => Number(po.id) === Number(viewingOrder.productionOrderId));
                const linkedProduct = linkedProductionOrder
                  ? (productsData as any[]).find((product: any) => Number(product.id) === Number(linkedProductionOrder.productId))
                  : null;
                const viewItems = getViewItems(viewingOrder);
                const remarkMeta = parseMaterialRequisitionRemark(viewingOrder.remark);
                const materialRequisitionPrintData = {
                  requisitionNo: viewingOrder.requisitionNo || "",
                  department: "生产部",
                  applicantName: remarkMeta.signatures.find((item) => item.action === "create")?.signerName || "",
                  applyDate: viewingOrder.applicationDate || "",
                  productionOrderNo: viewingOrder.productionOrderNo || "",
                  status: statusMap[viewingOrder.status]?.label || viewingOrder.status || "",
                  items: viewItems.map((item) => ({
                    materialCode: item.materialCode || "",
                    materialName: item.materialName || "",
                    specification: item.specification || "",
                    quantity: Number(item.requiredQty || 0),
                    unit: item.unit || "",
                    remark: item.remark || "",
                  })),
                };

                return (
                  <div className="space-y-4">
                    <div className="border-b pb-3">
                      <h2 className="text-lg font-semibold">领料单详情</h2>
                      <p className="text-sm text-muted-foreground">
                        {viewingOrder.requisitionNo}
                        {viewingOrder.status && (
                          <>
                            {" "}·{" "}
                            <Badge
                              variant={statusMap[viewingOrder.status]?.variant || "outline"}
                              className={getStatusSemanticClass(viewingOrder.status, statusMap[viewingOrder.status]?.label)}
                            >
                              {statusMap[viewingOrder.status]?.label || String(viewingOrder.status ?? "-")}
                            </Badge>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="py-4 space-y-6 max-h-[65vh] overflow-y-auto pr-2">
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                          <div>
                            <FieldRow label="领料单号">
                              <span className="font-mono">{viewingOrder.requisitionNo || "-"}</span>
                            </FieldRow>
                            <FieldRow label="关联任务">{viewingOrder.productionOrderNo || "-"}</FieldRow>
                            <FieldRow label="申请日期">{formatDate(viewingOrder.applicationDate)}</FieldRow>
                          </div>
                          <div>
                            <FieldRow label="产品名称">{linkedProduct?.name || viewingOrder.productName || "-"}</FieldRow>
                            <FieldRow label="规格型号">{linkedProduct?.specification || "-"}</FieldRow>
                            <FieldRow label="生产批号">{linkedProductionOrder?.batchNo || viewingOrder.batchNo || "-"}</FieldRow>
                          </div>
                        </div>
                        {linkedProduct?.description ? (
                          <div className="mt-2 pt-2 border-t border-border/40">
                            <span className="text-sm text-muted-foreground">产品描述：</span>
                            <span className="text-sm">{linkedProduct.description}</span>
                          </div>
                        ) : null}
                      </div>

                      {viewItems.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">物料明细</h3>
                          <div className="border rounded-md overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/60">
                                  <TableHead className="text-center font-bold">物料名称</TableHead>
                                  <TableHead className="w-[120px] text-center font-bold">规格</TableHead>
                                  <TableHead className="w-[92px] text-center font-bold">领料仓库</TableHead>
                                  <TableHead className="text-center font-bold">批号</TableHead>
                                  <TableHead className="w-[88px] text-center font-bold">需求数量</TableHead>
                                  <TableHead className="w-[88px] text-center font-bold">实领数量</TableHead>
                                  <TableHead className="text-center font-bold">单位</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {viewItems.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-center">{item.materialName || "-"}</TableCell>
                                    <TableCell className="max-w-[120px] text-center text-muted-foreground truncate" title={item.specification || "-"}>
                                      {item.specification || "-"}
                                    </TableCell>
                                    <TableCell className="text-center">{item.warehouseName || getWarehouseName(item.warehouseId) || "-"}</TableCell>
                                    <TableCell className="text-center font-mono">{item.batchNo || "-"}</TableCell>
                                    <TableCell className="text-center">{item.requiredQty}</TableCell>
                                    <TableCell className="text-center">{item.actualQty}</TableCell>
                                    <TableCell className="text-center">{item.unit || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {remarkMeta.note ? (
                        <div>
                          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{remarkMeta.note}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                      <div className="flex gap-2 flex-wrap" />
                      <div className="flex gap-2 flex-wrap justify-end">
                        {viewingOrder.status !== "issued" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              handleIssue(viewingOrder);
                              setViewDialogOpen(false);
                            }}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            确认发料
                          </Button>
                        ) : null}
                        <TemplatePrintPreviewButton
                          templateKey="material_requisition"
                          data={materialRequisitionPrintData}
                          title={`领料单打印预览 - ${viewingOrder.requisitionNo}`}
                        />
                        <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(viewingOrder)}>编辑</Button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 批号选择弹窗 */}
        <DraggableDialog open={batchPickerOpen} onOpenChange={(open) => { setBatchPickerOpen(open); if (!open) { setBatchPickerItemIdx(-1); setBatchPickerSelected(new Set()); } }}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
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
                      <TableHead className="py-2 w-8" />
                      <TableHead className="py-2">物料名称</TableHead>
                      <TableHead className="py-2">物料编码</TableHead>
                      <TableHead className="py-2">规格</TableHead>
                      <TableHead className="py-2">仓库</TableHead>
                      <TableHead className="py-2">批号</TableHead>
                      <TableHead className="py-2">库存数量</TableHead>
                      <TableHead className="py-2">单位</TableHead>
                      <TableHead className="py-2">状态</TableHead>
                      <TableHead className="py-2">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleBatchOptions.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6 text-sm">暂无可用库存批次</TableCell></TableRow>
                    ) : (
                      visibleBatchOptions.map((batch: any) => (
                        <TableRow
                          key={batch.id}
                          className={`text-xs cursor-pointer hover:bg-muted/50 ${batchPickerSelected.has(Number(batch.id)) ? "bg-blue-50" : ""}`}
                          onClick={() => handleBatchToggle(Number(batch.id))}
                        >
                          <TableCell className="py-1.5">
                            <input
                              type="checkbox"
                              className="cursor-pointer"
                              checked={batchPickerSelected.has(Number(batch.id))}
                              onChange={() => handleBatchToggle(Number(batch.id))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="py-1.5">{batch.itemName}</TableCell>
                          <TableCell className="py-1.5 font-mono">{batch.materialCode || "-"}</TableCell>
                          <TableCell className="py-1.5 text-muted-foreground">{batch.specification || batch.spec || "-"}</TableCell>
                          <TableCell className="py-1.5">{batch.warehouseName || "-"}</TableCell>
                          <TableCell className="py-1.5 font-mono text-blue-600">{batch.batchNo || batch.lotNo || "-"}</TableCell>
                          <TableCell className="py-1.5 font-medium">{formatDisplayQty(batch.quantity)}</TableCell>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBatchToggle(Number(batch.id));
                              }}
                            >
                              {batchPickerSelected.has(Number(batch.id)) ? "已选" : "选择"}
                            </Button>
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
                {batchPickerSelected.size > 0 ? `已选择 ${batchPickerSelected.size} 个批次` : "可多选批次后确认"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setBatchPickerOpen(false); setBatchPickerItemIdx(-1); setBatchPickerSelected(new Set()); }}>取消</Button>
                <Button onClick={handleBatchConfirm} disabled={batchPickerSelected.size === 0}>确认</Button>
              </div>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
