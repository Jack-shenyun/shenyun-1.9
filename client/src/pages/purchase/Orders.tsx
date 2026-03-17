import { formatDate, formatDateTime, formatDisplayNumber } from "@/lib/formatters";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DraftDrawer, { DraftItem } from "@/components/DraftDrawer";
import ERPLayout from "@/components/ERPLayout";
import MaterialMultiSelect, { SelectedMaterial, Material } from "@/components/MaterialMultiSelect";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";
import { ShoppingBag, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, Layers, Printer, CheckCircle, XCircle, UserCheck, GitBranch, Download, Upload } from "lucide-react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface PurchaseOrder {
  id: number;
  orderNo: string;
  supplierId: number;
  supplierCode: string | null;
  supplierName: string | null;
  contactPerson: string | null;
  phone: string | null;
  orderDate: string;
  expectedDate: string | null;
  totalAmount: string | null;
  currency: string | null;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "issued" | "ordered" | "partial_received" | "received" | "completed" | "cancelled";
  paymentStatus: string | null;
  remark: string | null;
  buyerId: number | null;
  createdAt: string;
}

interface OrderFormMaterial extends SelectedMaterial {
  productId?: number | null;
  itemId?: number;
  remark?: string;
}

const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive"; color: string }> = {
  draft: { label: "草稿", variant: "outline", color: "text-gray-600" },
  pending_approval: { label: "审批中", variant: "default", color: "text-amber-600" },
  approved: { label: "已下达", variant: "secondary", color: "text-purple-600" },
  rejected: { label: "已驳回", variant: "destructive", color: "text-red-600" },
  issued: { label: "已下达", variant: "secondary", color: "text-purple-600" },
  ordered: { label: "已下单", variant: "default", color: "text-purple-600" },
  partial_received: { label: "部分收货", variant: "secondary", color: "text-teal-600" },
  received: { label: "已收货", variant: "secondary", color: "text-green-600" },
  completed: { label: "已完成", variant: "default", color: "text-green-700" },
  cancelled: { label: "已取消", variant: "destructive", color: "text-red-600" },
};

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
};

export default function PurchaseOrdersPage() {
  const PAGE_SIZE = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PurchaseOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editInitialized, setEditInitialized] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [tempSupplierId, setTempSupplierId] = useState<number>(0);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { canDelete, isAdmin, isGM } = usePermission();
  const trpcUtils = trpc.useUtils();

  // ===== 数据库查询 =====
  const { data: ordersData = [], isLoading, refetch } = trpc.purchaseOrders.list.useQuery(
    { search: searchTerm || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
    { staleTime: 0, refetchOnMount: "always" }
  );
  const { data: draftOrdersData = [], isLoading: draftLoading } = trpc.purchaseOrders.list.useQuery({
    status: "draft",
    limit: 200,
  }, { staleTime: 0, refetchOnMount: "always" });
  const { data: suppliersData = [] } = trpc.suppliers.list.useQuery();
  const { data: productsData = [] } = trpc.products.list.useQuery();
  const { data: inventoryData = [] } = trpc.inventory.list.useQuery({ limit: 5000 });
  const { data: purchaseOrderFormCatalog } = trpc.workflowSettings.getFormCatalogItem.useQuery({
    module: "采购部",
    formType: "业务单据",
    formName: "采购订单",
  });
  const createMutation = trpc.purchaseOrders.create.useMutation({
    onError: (error: any) => {
      toast.error(String(error?.message || "采购单创建失败"));
    },
  });
  const updateMutation = trpc.purchaseOrders.update.useMutation({
    onError: (error: any) => {
      toast.error(String(error?.message || "采购单更新失败"));
    },
  });
  const submitForApprovalMutation = trpc.purchaseOrders.submitForApproval.useMutation({
    onError: (error: any) => {
      toast.error(String(error?.message || "采购单提交审核失败"));
    },
  });
  const approveMutation = trpc.purchaseOrders.approve.useMutation();
  const rejectMutation = trpc.purchaseOrders.reject.useMutation();
  const deleteMutation = trpc.purchaseOrders.delete.useMutation({ onSuccess: () => { refetch(); toast.success("采购单已删除"); } });
  const setFormApprovalEnabledMutation = trpc.workflowSettings.setFormApprovalEnabled.useMutation();

  const stockMaps = useMemo(() => {
    const byProductId = new Map<number, number>();
    const byCode = new Map<string, number>();
    const byName = new Map<string, number>();

    (inventoryData as any[]).forEach((inv: any) => {
      const qty = Number(inv?.quantity || 0);
      if (!Number.isFinite(qty)) return;
      if (String(inv?.status || "") === "unqualified") return;

      const productId = Number(inv?.productId || 0);
      if (productId > 0) {
        byProductId.set(productId, (byProductId.get(productId) || 0) + qty);
      }

      const code = String(inv?.materialCode || "").trim().toLowerCase();
      if (code) {
        byCode.set(code, (byCode.get(code) || 0) + qty);
      }

      const name = String(inv?.itemName || "").trim().toLowerCase();
      if (name) {
        byName.set(name, (byName.get(name) || 0) + qty);
      }
    });

    return { byProductId, byCode, byName };
  }, [inventoryData]);

  // 将产品数据转为 Material 接口供 MaterialMultiSelect 使用（库存与库存台账联动）
  const materialsFromDb: Material[] = useMemo(
    () =>
      (productsData as any[]).map((p: any) => {
        const productId = Number(p.id || 0);
        const code = String(p.code || "").trim().toLowerCase();
        const name = String(p.name || "").trim().toLowerCase();
        const stock =
          (productId > 0 ? stockMaps.byProductId.get(productId) : undefined) ??
          (code ? stockMaps.byCode.get(code) : undefined) ??
          (name ? stockMaps.byName.get(name) : undefined) ??
          0;

        return {
          id: p.id,
          code: p.code || "",
          name: p.name || "",
          spec: p.specification || "",
          unit: p.unit || "个",
          price: 0,
          category: p.category || "",
          stock,
        };
      }),
    [productsData, stockMaps]
  );

  // 查看详情时加载明细
  const focusHandledRef = useRef(false);
  const getByIdQuery = trpc.purchaseOrders.getById.useQuery(
    { id: selectedRecord?.id || 0 },
    { enabled: !!selectedRecord && viewDialogOpen }
  );
  const { data: approvalState } = trpc.purchaseOrders.getApprovalState.useQuery(
    { id: selectedRecord?.id || 0 },
    { enabled: !!selectedRecord?.id && viewDialogOpen && selectedRecord?.status === "pending_approval" }
  );

  const data = ordersData as unknown as PurchaseOrder[];
  const { data: purchaseOrderItemsRows = [] } = trpc.purchaseOrders.getItemsByOrderIds.useQuery(
    { orderIds: data.map((order) => Number(order.id)).filter((id) => Number.isFinite(id) && id > 0) },
    {
      enabled: data.length > 0,
      refetchOnWindowFocus: false,
    }
  );
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pagedData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const toInputDate = (value: string | Date | null | undefined) => {
    const formatted = formatDate(value ?? null);
    return formatted === "-" ? "" : formatted;
  };

  const [formData, setFormData] = useState({
    supplierId: 0,
    orderDate: "",
    expectedDate: "",
    currency: "CNY",
    status: "draft" as PurchaseOrder["status"],
    remark: "",
    materials: [] as OrderFormMaterial[],
  });

  const mapOrderItemsToFormMaterials = (items: any[]): OrderFormMaterial[] =>
    items.map((item: any, index: number) => ({
      id: Number(item.productId || item.id || index + 1),
      itemId: Number(item.id || 0) || undefined,
      productId: item.productId ? Number(item.productId) : undefined,
      code: item.materialCode || "",
      name: item.materialName || "",
      spec: item.specification || "",
      unit: item.unit || "个",
      price: Number(item.unitPrice || 0),
      quantity: Number(item.quantity || 0) || 1,
      amount: Number(item.amount || 0),
      remark: item.remark || undefined,
    }));

  const handleAdd = () => {
    setIsEditing(false);
    setEditInitialized(false);
    setSelectedRecord(null);
    setFormData({
      supplierId: 0,
      orderDate: new Date().toISOString().split("T")[0],
      expectedDate: "",
      currency: "CNY",
      status: "draft",
      remark: "",
      materials: [],
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: PurchaseOrder) => {
    setFormDialogOpen(false);
    setViewDialogOpen(true);
    setIsEditing(true);
    setEditInitialized(false);
    setSelectedRecord(record);
    setFormData({
      supplierId: record.supplierId,
      orderDate: toInputDate(record.orderDate),
      expectedDate: toInputDate(record.expectedDate),
      currency: record.currency || "CNY",
      status: record.status,
      remark: record.remark || "",
      materials:
        selectedRecord?.id === record.id
          ? mapOrderItemsToFormMaterials(detailItems as any[])
          : [],
    });
  };

  const handleView = (record: PurchaseOrder) => {
    setIsEditing(false);
    setEditInitialized(false);
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: PurchaseOrder) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  const validatePurchaseForm = () => {
    if (!formData.supplierId) {
      toast.error("请选择供应商");
      return false;
    }
    if (!formData.expectedDate) {
      toast.error("请填写交货日期");
      return false;
    }
    if (formData.materials.length === 0) {
      toast.error("请添加采购物料");
      return false;
    }
    const invalidMaterial = formData.materials.find((item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return quantity <= 0 || price <= 0;
    });
    if (invalidMaterial) {
      toast.error(
        `物料「${invalidMaterial.name || invalidMaterial.code || "-"}」请填写大于 0 的数量和单价`
      );
      return false;
    }
    return true;
  };

  const handleSubmit = (submitForReview = false) => {
    if (!validatePurchaseForm()) {
      return;
    }

    const totalAmount = formData.materials.reduce(
      (sum, m) => sum + m.quantity * m.price,
      0
    );

    const items = formData.materials.map((m: any) => ({
      productId: m.productId || undefined,
      materialCode: m.code,
      materialName: m.name,
      specification: m.spec,
      quantity: String(m.quantity),
      unit: m.unit,
      unitPrice: String(m.price),
      amount: String(m.quantity * m.price),
      remark: m.remark || undefined,
    }));
    const nextReviewStatus: PurchaseOrder["status"] = approvalEnabled ? "pending_approval" : "issued";

    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          supplierId: formData.supplierId,
          orderDate: formData.orderDate,
          expectedDate: formData.expectedDate || undefined,
          totalAmount: String(totalAmount),
          currency: formData.currency,
          status: submitForReview && selectedRecord.status === "draft" ? nextReviewStatus : undefined,
          remark: formData.remark || undefined,
        },
        items,
      }, {
        onSuccess: (result: any) => {
          refetch();
          getByIdQuery.refetch();
          setSelectedRecord((prev) =>
            prev
              ? {
                  ...prev,
                  supplierId: formData.supplierId,
                  supplierCode: selectedSupplier?.code || null,
                  supplierName: selectedSupplier?.name || getSupplierName(formData.supplierId),
                  contactPerson: selectedSupplier?.contactPerson || null,
                  phone: selectedSupplier?.phone || null,
                  orderDate: formData.orderDate,
                  expectedDate: formData.expectedDate || null,
                  currency: formData.currency,
                  status: submitForReview && prev.status === "draft" ? nextReviewStatus : prev.status,
                  remark: formData.remark || null,
                  totalAmount: String(totalAmount),
                }
              : prev
          );
          setIsEditing(false);
          setEditInitialized(false);
          const restoredCount = result?.restoredPlanNos?.length || 0;
          if (submitForReview && selectedRecord.status === "draft") {
            toast.success(approvalEnabled ? "已提交审核" : "采购单已下达");
          } else {
            toast.success(
              restoredCount > 0 ? `采购单已更新，${restoredCount} 条物料已退回采购计划` : "采购单已更新"
            );
          }
        },
      });
    } else {
      createMutation.mutate({
        supplierId: formData.supplierId,
        orderDate: formData.orderDate,
        expectedDate: formData.expectedDate || undefined,
        totalAmount: String(totalAmount),
        currency: formData.currency,
        status: submitForReview ? nextReviewStatus : formData.status,
        remark: formData.remark || undefined,
        items,
      }, {
        onSuccess: () => {
          refetch();
          toast.success(submitForReview ? "采购单已创建并提交审核" : "采购单已创建");
          setFormDialogOpen(false);
        },
      });
    }
  };

  const handleStatusChange = (record: PurchaseOrder, newStatus: PurchaseOrder["status"]) => {
    updateMutation.mutate({
      id: record.id,
      data: { status: newStatus },
    }, {
      onSuccess: () => {
        refetch();
        setSelectedRecord((prev) => (prev ? { ...prev, status: newStatus } : prev));
        toast.success("采购单状态已更新");
      },
    });
  };

  const handleSubmitForApproval = (record: PurchaseOrder) => {
    submitForApprovalMutation.mutate(
      { id: record.id },
      {
        onSuccess: async () => {
          await Promise.all([refetch(), getByIdQuery.refetch()]);
          setSelectedRecord((prev) =>
            prev
              ? {
                  ...prev,
                  status: approvalEnabled ? "pending_approval" : "issued",
                }
              : prev
          );
          toast.success(approvalEnabled ? "采购单已提交审核" : "采购单已下达");
        },
      }
    );
  };

  // 统计信息
  const stats = {
    total: data.length,
    totalAmount: data.reduce((sum: any, r: any) => sum + Number(r.totalAmount || 0), 0),
    pending: data.filter((r: any) => r.status === "pending_approval").length,
    toReceive: data.filter((r: any) => r.status === "approved" || r.status === "issued" || r.status === "ordered").length,
  };

  // 获取供应商名称
  const getSupplierName = (supplierId: number) => {
    const s = (suppliersData as any[]).find((s: any) => s.id === supplierId);
    return s?.name || "-";
  };

  const filteredSuppliers = (suppliersData as any[]).filter((s: any) => {
    const keyword = supplierSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [s.name, s.code, s.contactPerson, s.phone]
      .map((v) => String(v || "").toLowerCase())
      .some((v) => v.includes(keyword));
  });

  const selectedSupplierName = formData.supplierId ? getSupplierName(formData.supplierId) : "";
  const approvalEnabled = Boolean((purchaseOrderFormCatalog as any)?.approvalEnabled);
  const draftOrders = draftOrdersData as unknown as PurchaseOrder[];
  const draftItems: DraftItem[] = draftOrders
    .filter((record) => record.status === "draft")
    .map((record) => ({
      id: record.id,
      title: record.orderNo,
      subtitle: record.supplierName || getSupplierName(record.supplierId),
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    }));

  const openSupplierPicker = () => {
    setTempSupplierId(formData.supplierId || 0);
    setSupplierSearch("");
    setSupplierPickerOpen(true);
  };

  const confirmSupplierPicker = () => {
    if (tempSupplierId > 0) {
      setFormData((prev) => ({ ...prev, supplierId: tempSupplierId }));
    }
    setSupplierPickerOpen(false);
  };

  const handleDraftEdit = (item: DraftItem) => {
    const record = draftOrders.find((order) => order.id === item.id) || data.find((order) => order.id === item.id);
    if (!record) {
      toast.error("草稿不存在");
      return;
    }
    handleEdit(record);
  };

  const handleDraftDelete = (item: DraftItem) => {
    const record = draftOrders.find((order) => order.id === item.id) || data.find((order) => order.id === item.id);
    if (!record) {
      toast.error("草稿不存在");
      return;
    }
    handleDelete(record);
  };

  const handleToggleApprovalEnabled = async () => {
    if (!isAdmin) return;
    await setFormApprovalEnabledMutation.mutateAsync({
      module: "采购部",
      formType: "业务单据",
      formName: "采购订单",
      path: "/purchase/orders",
      approvalEnabled: !approvalEnabled,
    });
    await trpcUtils.workflowSettings.getFormCatalogItem.invalidate({
      module: "采购部",
      formType: "业务单据",
      formName: "采购订单",
    });
    await trpcUtils.workflowSettings.formCatalog.invalidate();
    toast.success(!approvalEnabled ? "已开启审批流程" : "已关闭审批流程");
  };

  // 获取详情明细
  const detailItems = getByIdQuery.data?.items || [];
  const purchasePrintData = useMemo(
    () =>
      selectedRecord
        ? {
            orderNo: selectedRecord.orderNo || "",
            orderDate: selectedRecord.orderDate || "",
            deliveryDate: selectedRecord.expectedDate || "",
            supplierName: selectedRecord.supplierName || getSupplierName(selectedRecord.supplierId) || "",
            contactPerson: selectedRecord.contactPerson || "",
            contactPhone: selectedRecord.phone || "",
            paymentTerms: selectedRecord.currency || "CNY",
            status: statusMap[selectedRecord.status]?.label || selectedRecord.status || "",
            totalAmount: Number(selectedRecord.totalAmount || 0),
            remark: selectedRecord.remark || "",
            items: detailItems.map((item: any) => ({
              productName: item.materialName || "",
              productCode: item.materialCode || "",
              specification: item.specification || "",
              quantity: Number(item.quantity || 0),
              unit: item.unit || "",
              unitPrice: Number(item.unitPrice || 0),
              amount: Number(item.amount || 0),
            })),
          }
        : null,
    [detailItems, selectedRecord],
  );
  const purchaseOrderItemMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const row of purchaseOrderItemsRows as any[]) {
      const orderId = Number(row?.orderId || 0);
      if (!orderId) continue;
      const current = map.get(orderId) || [];
      current.push(row);
      map.set(orderId, current);
    }
    return map;
  }, [purchaseOrderItemsRows]);

  useEffect(() => {
    if (!selectedRecord || !viewDialogOpen || !isEditing || editInitialized || getByIdQuery.isLoading) return;
    setFormData({
      supplierId: selectedRecord.supplierId,
      orderDate: toInputDate(selectedRecord.orderDate),
      expectedDate: toInputDate(selectedRecord.expectedDate),
      currency: selectedRecord.currency || "CNY",
      status: selectedRecord.status,
      remark: selectedRecord.remark || "",
      materials: mapOrderItemsToFormMaterials(detailItems as any[]),
    });
    setEditInitialized(true);
  }, [selectedRecord, viewDialogOpen, isEditing, editInitialized, getByIdQuery.isLoading, detailItems]);

  useEffect(() => {
    if (focusHandledRef.current) return;
    const raw = new URLSearchParams(window.location.search).get("focusId");
    const focusId = Number(raw);
    if (!Number.isFinite(focusId) || focusId <= 0) return;
    const record = data.find((item) => item.id === focusId);
    if (!record) return;
    focusHandledRef.current = true;
    handleView(record);
    const next = new URL(window.location.href);
    next.searchParams.delete("focusId");
    window.history.replaceState({}, "", `${next.pathname}${next.search}`);
  }, [data]);
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );
  const selectedSupplier = (suppliersData as any[]).find((s: any) => Number(s.id) === Number(formData.supplierId || selectedRecord?.supplierId || 0));
  const editableMaterials = formData.materials;
  const editableTotalAmount = editableMaterials.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const updateEditableMaterial = (index: number, field: "price" | "quantity", value: string) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: Math.max(0, Number(value || 0)),
            }
          : item
      ),
    }));
  };
  const removeEditableMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleExportOrders = () => {
    if (data.length === 0) {
      toast.warning("暂无可导出数据");
      return;
    }

    const paymentStatusLabelMap: Record<string, string> = {
      unpaid: "未付款",
      partial: "部分付款",
      paid: "已付款",
    };

    const rows = data.flatMap((order) => {
      const items = purchaseOrderItemMap.get(Number(order.id)) || [];
      const orderRows = items.length > 0 ? items : [{}];
      return orderRows.map((item: any) => [
        order.orderNo || "",
        order.supplierCode || "",
        order.supplierName || "",
        formatDate(order.orderDate) === "-" ? "" : formatDate(order.orderDate),
        formatDate(order.expectedDate) === "-" ? "" : formatDate(order.expectedDate),
        order.currency || "CNY",
        statusMap[String(order.status || "")]?.label || order.status || "",
        paymentStatusLabelMap[String(order.paymentStatus || "")] || order.paymentStatus || "",
        item.materialCode || "",
        item.materialName || "",
        item.specification || "",
        item.unit || "",
        item.quantity || "",
        item.unitPrice || "",
        item.amount || "",
        item.remark || "",
        order.remark || "",
      ].map(escapeCsvCell).join(","));
    });

    const headers = [
      "采购单号",
      "供应商编码",
      "供应商名称",
      "下单日期",
      "交货日期",
      "币种",
      "采购状态",
      "付款状态",
      "物料编码",
      "物料名称",
      "规格型号",
      "单位",
      "数量",
      "单价",
      "金额",
      "行备注",
      "整单备注",
    ];

    const csv = [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = url;
    a.download = `采购订单_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("采购订单已导出");
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportOrders = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("仅支持 CSV 导入，请先导出模板后再导入");
        return;
      }

      const text = (await file.text()).replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length <= 1) {
        toast.warning("导入文件没有有效数据");
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const colIndex = (name: string) => headers.findIndex((header) => header.trim() === name);
      const readCol = (row: string[], name: string) => {
        const index = colIndex(name);
        if (index < 0) return "";
        return String(row[index] ?? "").trim();
      };

      const supplierByCode = new Map(
        (suppliersData as any[])
          .filter((supplier: any) => supplier?.code)
          .map((supplier: any) => [String(supplier.code).trim(), supplier])
      );
      const supplierByName = new Map(
        (suppliersData as any[])
          .filter((supplier: any) => supplier?.name)
          .map((supplier: any) => [String(supplier.name).trim(), supplier])
      );
      const productByCode = new Map(
        (productsData as any[])
          .filter((product: any) => product?.code)
          .map((product: any) => [String(product.code).trim(), product])
      );
      const productByName = new Map(
        (productsData as any[])
          .filter((product: any) => product?.name)
          .map((product: any) => [String(product.name).trim(), product])
      );

      const statusReverseMap: Record<string, PurchaseOrder["status"]> = {
        草稿: "draft",
        部门审核中: "draft",
        总经理审批中: "draft",
        已审批: "issued",
        已下达: "issued",
        已下单: "ordered",
        部分收货: "partial_received",
        已收货: "received",
        已完成: "completed",
        已取消: "cancelled",
        draft: "draft",
        approved: "issued",
        ordered: "ordered",
        partial_received: "partial_received",
        received: "received",
        completed: "completed",
        cancelled: "cancelled",
      };
      const paymentStatusReverseMap: Record<string, "unpaid" | "partial" | "paid"> = {
        未付款: "unpaid",
        部分付款: "partial",
        已付款: "paid",
        unpaid: "unpaid",
        partial: "partial",
        paid: "paid",
      };

      const groupedOrders = new Map<string, any>();

      for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const supplierCode = readCol(row, "供应商编码");
        const supplierName = readCol(row, "供应商名称");
        const supplier = supplierByCode.get(supplierCode) || supplierByName.get(supplierName);
        if (!supplier) {
          throw new Error(`第${i + 1}行: 未找到供应商 ${supplierCode || supplierName || "-"}`);
        }

        const quantity = Number(readCol(row, "数量") || 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`第${i + 1}行: 数量必须大于 0`);
        }

        const materialCode = readCol(row, "物料编码");
        const materialName = readCol(row, "物料名称");
        const product = productByCode.get(materialCode) || productByName.get(materialName);
        const unitPrice = Number(readCol(row, "单价") || 0);
        const amount = Number(readCol(row, "金额") || quantity * unitPrice || 0);
        const importOrderNo = readCol(row, "采购单号");
        const orderGroupKey = importOrderNo || `AUTO-PO-ROW-${i + 1}`;

        if (!groupedOrders.has(orderGroupKey)) {
          groupedOrders.set(orderGroupKey, {
            orderNo: importOrderNo || "",
            supplierId: Number(supplier.id),
            supplierName: supplier.name || undefined,
            orderDate: readCol(row, "下单日期") || new Date().toISOString().split("T")[0],
            expectedDate: readCol(row, "交货日期") || undefined,
            currency: readCol(row, "币种") || "CNY",
            status: statusReverseMap[readCol(row, "采购状态")] || "draft",
            paymentStatus: paymentStatusReverseMap[readCol(row, "付款状态")] || undefined,
            remark: readCol(row, "整单备注") || undefined,
            items: [],
          });
        }

        groupedOrders.get(orderGroupKey).items.push({
          productId: product?.id ? Number(product.id) : undefined,
          materialCode: materialCode || product?.code || "",
          materialName: materialName || product?.name || "",
          specification: readCol(row, "规格型号") || product?.specification || undefined,
          quantity: String(quantity),
          unit: readCol(row, "单位") || product?.unit || "个",
          unitPrice: String(unitPrice),
          amount: String(amount),
          remark: readCol(row, "行备注") || undefined,
        });
      }

      let success = 0;
      const errors: string[] = [];
      for (const order of Array.from(groupedOrders.values())) {
        try {
          const totalAmount = order.items.reduce(
            (sum: number, item: any) => sum + Number(item.amount || 0),
            0
          );
          await createMutation.mutateAsync({
            ...order,
            totalAmount: String(totalAmount),
          });
          success += 1;
        } catch (error: any) {
          errors.push(`${order.orderNo}: ${error?.message || "导入失败"}`);
        }
      }

      await refetch();
      if (success > 0) {
        toast.success(`导入成功 ${success} 笔采购单`);
      }
      if (errors.length > 0) {
        toast.error(`导入失败 ${errors.length} 笔`, {
          description: errors.slice(0, 2).join("；"),
        });
      }
    } catch (error: any) {
      toast.error(error?.message || "导入失败");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">采购执行</h1>
              <p className="text-sm text-muted-foreground">
                从采购申请到订单下达、收货入库的完整采购闭环
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportOrders}>
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" />
              导入
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportOrders}
            />
            <DraftDrawer
              count={draftItems.length}
              drafts={draftItems}
              moduleName="采购单"
              onEdit={handleDraftEdit}
              onDelete={handleDraftDelete}
              loading={isLoading || draftLoading}
              variant="default"
              size="default"
            />
            {isAdmin ? (
              <Button
                variant={approvalEnabled ? "default" : "outline"}
                onClick={handleToggleApprovalEnabled}
                disabled={setFormApprovalEnabledMutation.isPending}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                {approvalEnabled ? "审批已开启" : "开启审批"}
              </Button>
            ) : null}
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              新建采购单
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">采购单总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                ¥{formatDisplayNumber(stats.totalAmount / 10000, { maximumFractionDigits: 1 })}万
              </div>
              <div className="text-sm text-muted-foreground">采购金额</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">待审批</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.toReceive}</div>
              <div className="text-sm text-muted-foreground">待收货</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索采购单号、供应商..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="pending_approval">审批中</SelectItem>
              <SelectItem value="issued">已下达</SelectItem>
              <SelectItem value="ordered">已下单</SelectItem>
              <SelectItem value="partial_received">部分收货</SelectItem>
              <SelectItem value="received">已收货</SelectItem>
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
                <TableHead className="text-center font-bold">采购单号</TableHead>
                <TableHead className="text-center font-bold">供应商名称</TableHead>
                <TableHead className="text-center font-bold">采购金额</TableHead>
                <TableHead className="text-center font-bold">下单日期</TableHead>
                <TableHead className="text-center font-bold">交货日期</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedData.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="text-center font-mono">{record.orderNo}</TableCell>
                  <TableCell className="text-center font-medium">{record.supplierName || getSupplierName(record.supplierId)}</TableCell>
                  <TableCell className="text-center font-medium">
                    ¥{formatDisplayNumber(record.totalAmount)}
                  </TableCell>
                  <TableCell className="text-center">{formatDate(record.orderDate)}</TableCell>
                  <TableCell className="text-center">{formatDate(record.expectedDate)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                      {statusMap[record.status]?.label || record.status}
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
                        <DropdownMenuItem onClick={() => handleView(record)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(record)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(record)}
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
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePaginationFooter
            total={data.length}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </Card>

        {/* 新建/编辑表单对话框 */}
        <DraggableDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          defaultWidth={1180}
          defaultHeight={760}
          maxWidth="96vw"
          maxHeight="92vh"
        >
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑采购单" : "新建采购单"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[76vh] overflow-y-auto pr-1">
              {/* 供应商信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">供应商信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>供应商 *</Label>
                    <Button type="button" variant="outline" className="w-full justify-start font-normal" onClick={openSupplierPicker}>
                      {selectedSupplierName || "选择供应商"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>货币</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                        <SelectItem value="USD">美元 (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 采购信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">采购信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>下单日期</Label>
                    <Input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>交货日期 *</Label>
                    <Input
                      type="date"
                      value={formData.expectedDate}
                      onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>采购状态</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as PurchaseOrder["status"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="issued">已下达</SelectItem>
                        <SelectItem value="ordered">已下单</SelectItem>
                        <SelectItem value="partial_received">部分收货</SelectItem>
                        <SelectItem value="received">已收货</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                        <SelectItem value="cancelled">已取消</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 物料选择 */}
              <div>
                <h3 className="text-sm font-medium mb-3">采购物料 *</h3>
                <MaterialMultiSelect
                  materials={materialsFromDb}
                  selectedMaterials={formData.materials}
                  onSelectionChange={(materials) => setFormData({
                    ...formData,
                    materials: materials.map((material) => ({
                      ...material,
                      productId: Number(material.id),
                    })),
                  })}
                  title="选择物料"
                  showPrice={true}
                  showStock={true}
                />
              </div>

              <Separator />

              {/* 备注 */}
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="输入备注信息"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={() => handleSubmit()}>{isEditing ? "保存" : "创建"}</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 供应商选择弹窗 */}
        <Dialog open={supplierPickerOpen} onOpenChange={setSupplierPickerOpen}>
          <DialogContent className="max-w-4xl">
            <div className="space-y-3">
              <h3 className="text-base font-semibold">选择供应商</h3>
              <Input
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="搜索供应商名称、编码、联系人、电话..."
              />
              <div className="max-h-[420px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">选择</TableHead>
                      <TableHead>供应商名称</TableHead>
                      <TableHead>供应商编码</TableHead>
                      <TableHead>联系人</TableHead>
                      <TableHead>联系电话</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                          暂无匹配供应商
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuppliers.map((s: any) => {
                        const id = Number(s.id);
                        const checked = tempSupplierId === id;
                        return (
                          <TableRow key={id} className="cursor-pointer" onClick={() => setTempSupplierId(id)}>
                            <TableCell className="text-center">
                              <input
                                type="radio"
                                name="supplier-picker"
                                checked={checked}
                                onChange={() => setTempSupplierId(id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{s.name || "-"}</TableCell>
                            <TableCell>{s.code || "-"}</TableCell>
                            <TableCell>{s.contactPerson || "-"}</TableCell>
                            <TableCell>{s.phone || "-"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSupplierPickerOpen(false)}>取消</Button>
                <Button onClick={confirmSupplierPicker} disabled={!tempSupplierId}>确认供应商</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={(open) => {
  setViewDialogOpen(open);
  if (!open) {
    setIsEditing(false);
    setEditInitialized(false);
  }
}} printable={false}>
  <DraggableDialogContent>
    {selectedRecord && (
      <div className="space-y-4">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">采购单详情</h2>
          <p className="text-sm text-muted-foreground">
            {selectedRecord.orderNo}
            {selectedRecord.status && (
              <>
                {' '}
                ·
                <Badge
                  variant={statusMap[selectedRecord.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(selectedRecord.status, statusMap[selectedRecord.status]?.label)}`}
                >
                  {statusMap[selectedRecord.status]?.label || String(selectedRecord.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div className="space-y-6 py-2">
          {/* 供应商与采购信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="供应商编码">{isEditing ? (selectedSupplier?.code || "-") : (selectedRecord.supplierCode || "-")}</FieldRow>
                <FieldRow label="供应商名称">
                  {isEditing ? (
                    <Button type="button" variant="outline" size="sm" className="min-w-[220px] justify-start" onClick={openSupplierPicker}>
                      {selectedSupplier?.name || "选择供应商"}
                    </Button>
                  ) : (
                    selectedRecord.supplierName || getSupplierName(selectedRecord.supplierId)
                  )}
                </FieldRow>
                <FieldRow label="联系人">{isEditing ? (selectedSupplier?.contactPerson || "-") : (selectedRecord.contactPerson || "-")}</FieldRow>
                <FieldRow label="联系电话">{isEditing ? (selectedSupplier?.phone || "-") : (selectedRecord.phone || "-")}</FieldRow>
              </div>
              <div>
                <FieldRow label="下单日期">
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, orderDate: e.target.value }))}
                      className="h-8 max-w-[180px] ml-auto"
                    />
                  ) : (
                    formatDate(selectedRecord.orderDate)
                  )}
                </FieldRow>
                <FieldRow label="交货日期 *">
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.expectedDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, expectedDate: e.target.value }))}
                      className="h-8 max-w-[180px] ml-auto"
                    />
                  ) : (
                    formatDate(selectedRecord.expectedDate)
                  )}
                </FieldRow>
                <FieldRow label="货币">
                  {isEditing ? (
                    <Select value={formData.currency} onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}>
                      <SelectTrigger className="h-8 max-w-[180px] ml-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    selectedRecord.currency || "CNY"
                  )}
                </FieldRow>
                {selectedRecord.status === "pending_approval" && !isEditing && (
                  <FieldRow label="当前审批">{(approvalState as any)?.stageLabel || "审批中"}</FieldRow>
                )}
                <FieldRow label="创建时间">{formatDateTime(selectedRecord.createdAt)}</FieldRow>
              </div>
            </div>
          </div>

          {/* 物料明细 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">物料明细</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">物料编码</TableHead>
                  <TableHead className="text-center font-bold">物料名称</TableHead>
                  <TableHead className="text-center font-bold">规格</TableHead>
                  <TableHead className="text-center font-bold">单位</TableHead>
                  <TableHead className="text-center font-bold">单价</TableHead>
                  <TableHead className="text-center font-bold">数量</TableHead>
                  <TableHead className="text-center font-bold">金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isEditing ? editableMaterials : detailItems).map((item: any, index: number) => (
                  <TableRow key={item.itemId || item.id}>
                    <TableCell className="text-center font-mono">{isEditing ? item.code : item.materialCode}</TableCell>
                    <TableCell className="text-center font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <span>{isEditing ? item.name : item.materialName}</span>
                        {isEditing && selectedRecord.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeEditableMaterial(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{isEditing ? (item.spec || "-") : (item.specification || "-")}</TableCell>
                    <TableCell className="text-center">{item.unit || "-"}</TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={item.price}
                          onChange={(e) => updateEditableMaterial(index, "price", e.target.value)}
                          className="h-8 w-24 mx-auto text-center"
                        />
                      ) : (
                        `¥${formatDisplayNumber(item.unitPrice)}`
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={item.quantity}
                          onChange={(e) => updateEditableMaterial(index, "quantity", e.target.value)}
                          className="h-8 w-24 mx-auto text-center"
                        />
                      ) : (
                        formatDisplayNumber(item.quantity)
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      ¥{formatDisplayNumber(
                        isEditing ? Number(item.quantity || 0) * Number(item.price || 0) : item.amount || 0,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="text-right font-medium">采购合计：</TableCell>
                  <TableCell className="text-center font-bold text-primary text-lg">
                    ¥{formatDisplayNumber(isEditing ? editableTotalAmount : selectedRecord.totalAmount || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 备注 */}
          {(selectedRecord.remark || isEditing) && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              {isEditing ? (
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="输入备注信息"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remark}</p>
              )}
            </div>
          )}
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap">
            {/* 左侧功能按钮 */}
            {!isEditing && selectedRecord.status === "draft" && (
              <Button
                variant="outline"
                className="text-amber-600 border-amber-300"
                size="sm"
                onClick={() => handleSubmitForApproval(selectedRecord)}
                disabled={submitForApprovalMutation.isPending}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                {submitForApprovalMutation.isPending ? "提交中..." : "提交审核"}
              </Button>
            )}
            {!isEditing && selectedRecord.status === "pending_approval" && Boolean((approvalState as any)?.canApprove) && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  size="sm"
                  onClick={() => {
                    rejectMutation.mutate(
                      { id: selectedRecord.id, comment: "审批驳回" },
                      {
                        onSuccess: async () => {
                          await Promise.all([refetch(), getByIdQuery.refetch()]);
                          setSelectedRecord((prev) => (prev ? { ...prev, status: "rejected" } : prev));
                          toast.success("采购订单已驳回");
                        },
                        onError: (error: any) => toast.error(String(error?.message || "驳回失败")),
                      }
                    );
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />退回修改
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    approveMutation.mutate(
                      { id: selectedRecord.id },
                      {
                        onSuccess: async () => {
                          await Promise.all([refetch(), getByIdQuery.refetch()]);
                          const nextState = await trpcUtils.purchaseOrders.getApprovalState.fetch({ id: selectedRecord.id });
                          setSelectedRecord((prev) => (
                            prev
                              ? {
                                  ...prev,
                                  status: String((nextState as any)?.status || "") === "approved" ? "issued" : "pending_approval",
                                }
                              : prev
                          ));
                          toast.success(String((nextState as any)?.status || "") === "approved" ? "采购订单已审批并下达" : "已进入下一审批节点");
                        },
                        onError: (error: any) => toast.error(String(error?.message || "审批失败")),
                      }
                    );
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />审批通过
                </Button>
              </>
            )}
            {!isEditing && (selectedRecord.status === "issued" || selectedRecord.status === "ordered") && (
              <Button size="sm" onClick={() => handleStatusChange(selectedRecord, "received")}>
                确认收货
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditInitialized(false); }}>取消编辑</Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmit(selectedRecord?.status === "draft")}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending
                    ? "提交中..."
                    : selectedRecord?.status === "draft"
                      ? "提交审核"
                      : "保存修改"}
                </Button>
              </>
            ) : (
              <>
                <TemplatePrintPreviewButton
                  templateKey="purchase_order"
                  data={purchasePrintData}
                  title={selectedRecord ? `采购单打印预览 - ${selectedRecord.orderNo}` : "采购单打印预览"}
                  variant="outline"
                  size="sm"
                  disabled={!purchasePrintData}
                >
                  打印预览
                </TemplatePrintPreviewButton>
                <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
              </>
            )}
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
