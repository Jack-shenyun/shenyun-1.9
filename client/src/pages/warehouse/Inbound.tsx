import { useState, useEffect } from "react";
import ERPLayout from "@/components/ERPLayout";
import {
  PackagePlus, Plus, Search, Eye, Edit, Trash2, MoreHorizontal, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatDateTime } from "@/lib/formatters";

// ==================== 常量 ====================
const typeMap: Record<string, string> = {
  purchase_in: "采购入库",
  production_in: "生产入库",
  return_in: "销售退货",
  other_in: "其他入库",
};

const inboundTypeOptions = [
  { label: "采购入库", value: "purchase_in" },
  { label: "生产入库", value: "production_in" },
  { label: "销售退货", value: "return_in" },
  { label: "其他入库", value: "other_in" },
];

const salesOrderStatusMap: Record<string, string> = {
  draft: "草稿",
  pending_review: "待审批",
  approved: "已审批",
  pending_payment: "待付款",
  confirmed: "已确认",
  in_production: "生产中",
  ready_to_ship: "待发货",
  partial_shipped: "部分发货",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
};

// ==================== 类型 ====================
type ProductOption = {
  id: number;
  code: string;
  name: string;
  specification?: string | null;
  unit?: string | null;
  isMedicalDevice: boolean;
  isSterilized: boolean;
};

type InboundDetailLine = {
  key: string;
  productId: number;
  productCode: string;
  productName: string;
  specification: string;
  unit: string;
  sourceQty: number;       // 来源单据数量（采购订单数量 / 申请入库数量）
  receivedQty: number;     // 已收货/已入库数量
  inboundQty: string;      // 本次入库数量
  batchNo: string;
  sterilizationBatchNo: string;
  isMedicalDevice: boolean;
  isSterilized: boolean;
};

type FormData = {
  documentNo: string;
  type: string;
  warehouseId: string;
  relatedOrderId: string;         // 采购订单ID / 销售订单ID
  relatedEntryId: string;         // 生产入库申请ID
  supplierName: string;           // 采购入库时的供应商名称
  remark: string;
};

// ==================== 主组件 ====================
export default function InboundPage() {
  const { canDelete } = usePermission();

  // ---- 对话框状态 ----
  const [formOpen, setFormOpen]             = useState(false);
  const [formMaximized, setFormMaximized]   = useState(false);
  const [detailOpen, setDetailOpen]         = useState(false);
  const [editingRecord, setEditingRecord]   = useState<any | null>(null);
  const [viewingRecord, setViewingRecord]   = useState<any | null>(null);

  // ---- 搜索 & 筛选 ----
  const [searchText, setSearchText]   = useState("");
  const [filterType, setFilterType]   = useState<string>("all");

  // ---- 表单状态 ----
  const [formData, setFormData] = useState<FormData>({
    documentNo: "",
    type: "purchase_in",
    warehouseId: "",
    relatedOrderId: "",
    relatedEntryId: "",
    supplierName: "",
    remark: "",
  });
  const [detailLines, setDetailLines] = useState<InboundDetailLine[]>([]);

  // ---- 来源单据选择弹窗 ----
  const [poDialogOpen, setPoDialogOpen]   = useState(false);  // 采购订单弹窗
  const [soDialogOpen, setSoDialogOpen]   = useState(false);  // 销售订单弹窗（退货）
  const [pweDialogOpen, setPweDialogOpen] = useState(false);  // 生产入库申请弹窗
  const [sourceSearch, setSourceSearch]   = useState("");

  // ==================== 数据查询 ====================
  const { data: warehouseList = [] }  = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: productList = [] }    = trpc.products.list.useQuery({ limit: 1000 });
  const { data: rawData = [], refetch } = trpc.inventoryTransactions.list.useQuery({ limit: 200 });

  // 采购订单（已审批/已下单/部分收货）
  const { data: poApproved = [] }         = trpc.purchaseOrders.list.useQuery({ status: "approved", limit: 200 });
  const { data: poOrdered = [] }          = trpc.purchaseOrders.list.useQuery({ status: "ordered", limit: 200 });
  const { data: poPartialReceived = [] }  = trpc.purchaseOrders.list.useQuery({ status: "partial_received", limit: 200 });
  const purchaseOrderList = [
    ...(poApproved as any[]),
    ...(poOrdered as any[]),
    ...(poPartialReceived as any[]),
  ];

  // 销售订单（已发货/部分发货/已完成，用于退货）
  const { data: soShipped = [] }    = trpc.salesOrders.list.useQuery({ status: "shipped", limit: 200 });
  const { data: soCompleted = [] }  = trpc.salesOrders.list.useQuery({ status: "completed", limit: 200 });
  const { data: soPartial = [] }    = trpc.salesOrders.list.useQuery({ status: "partial_shipped", limit: 200 });
  const salesOrderList = [
    ...(soShipped as any[]),
    ...(soCompleted as any[]),
    ...(soPartial as any[]),
  ];

  // 生产入库申请（已审批）
  const { data: pweList = [] } = trpc.productionWarehouseEntries.list.useQuery({ status: "approved", limit: 200 });

  const data = (rawData as any[]).filter((r) =>
    ["purchase_in", "production_in", "return_in", "other_in"].includes(r.type)
  );

  const products = (productList as ProductOption[]) || [];
  const productsById = new Map(products.map((p) => [p.id, p]));

  // 选中采购订单详情
  const selectedPoId = formData.relatedOrderId && formData.type === "purchase_in"
    ? Number(formData.relatedOrderId) : null;
  const { data: poDetail } = trpc.purchaseOrders.getById.useQuery(
    { id: selectedPoId! },
    { enabled: !!selectedPoId }
  );

  // 选中销售订单详情（退货）
  const selectedSoId = formData.relatedOrderId && formData.type === "return_in"
    ? Number(formData.relatedOrderId) : null;
  const { data: soDetail } = trpc.salesOrders.getById.useQuery(
    { id: selectedSoId! },
    { enabled: !!selectedSoId }
  );

  // 采购订单选择后自动加载明细
  useEffect(() => {
    if (poDetail?.items && formData.type === "purchase_in" && selectedPoId) {
      const lines: InboundDetailLine[] = (poDetail.items as any[]).map((item: any, idx: number) => {
        const product = item.productId ? productsById.get(Number(item.productId)) : null;
        return {
          key: `po-${selectedPoId}-${item.id || idx}`,
          productId: item.productId ? Number(item.productId) : 0,
          productCode: item.materialCode || product?.code || "",
          productName: item.materialName || product?.name || "",
          specification: item.specification || product?.specification || "",
          unit: item.unit || product?.unit || "",
          sourceQty: parseFloat(item.quantity || "0"),
          receivedQty: parseFloat(item.receivedQty || "0"),
          inboundQty: String(Math.max(0, parseFloat(item.quantity || "0") - parseFloat(item.receivedQty || "0"))),
          batchNo: "",
          sterilizationBatchNo: "",
          isMedicalDevice: product?.isMedicalDevice ?? false,
          isSterilized: product?.isSterilized ?? false,
        };
      });
      setDetailLines(lines);
    }
  }, [poDetail, selectedPoId, formData.type]);

  // 销售订单选择后自动加载明细（退货）
  useEffect(() => {
    if (soDetail?.items && formData.type === "return_in" && selectedSoId) {
      const lines: InboundDetailLine[] = (soDetail.items as any[]).map((item: any, idx: number) => {
        const product = productsById.get(Number(item.productId));
        return {
          key: `so-${selectedSoId}-${item.id || idx}`,
          productId: Number(item.productId),
          productCode: product?.code || "",
          productName: item.productName || product?.name || "",
          specification: item.specification || product?.specification || "",
          unit: item.unit || product?.unit || "",
          sourceQty: parseFloat(item.quantity || "0"),
          receivedQty: parseFloat(item.deliveredQty || "0"),
          inboundQty: "",
          batchNo: "",
          sterilizationBatchNo: "",
          isMedicalDevice: product?.isMedicalDevice ?? false,
          isSterilized: product?.isSterilized ?? false,
        };
      });
      setDetailLines(lines);
    }
  }, [soDetail, selectedSoId, formData.type]);

  // ==================== Mutations ====================
  const createMutation = trpc.inventoryTransactions.create.useMutation({
    onSuccess: () => { toast.success("入库单已创建"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("创建失败：" + e.message),
  });
  const updateMutation = trpc.inventoryTransactions.update.useMutation({
    onSuccess: () => { toast.success("入库单已更新"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("更新失败：" + e.message),
  });
  const deleteMutation = trpc.inventoryTransactions.delete.useMutation({
    onSuccess: () => { toast.success("入库单已删除"); refetch(); },
    onError: (e) => toast.error("删除失败：" + e.message),
  });
  const syncShipmentStatusMutation = trpc.salesOrders.syncShipmentStatus.useMutation();

  // ==================== 辅助函数 ====================
  const getWarehouseName = (warehouseId: number) => {
    const wh = (warehouseList as any[]).find((w: any) => w.id === warehouseId);
    return wh ? wh.name : `仓库${warehouseId}`;
  };

  const buildDefaultDocumentNo = () =>
    `IN-${new Date().getFullYear()}-${String(data.length + 1).padStart(4, "0")}`;

  const resetForm = () => {
    setFormData({
      documentNo: buildDefaultDocumentNo(),
      type: "purchase_in",
      warehouseId: "",
      relatedOrderId: "",
      relatedEntryId: "",
      supplierName: "",
      remark: "",
    });
    setDetailLines([]);
  };

  // ==================== 表单操作 ====================
  const handleAdd = () => {
    setEditingRecord(null);
    resetForm();
    setFormOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      documentNo: record.documentNo || "",
      type: record.type,
      warehouseId: record.warehouseId ? String(record.warehouseId) : "",
      relatedOrderId: record.relatedOrderId ? String(record.relatedOrderId) : "",
      relatedEntryId: "",
      supplierName: "",
      remark: record.remark || "",
    });
    const product = record.productId ? productsById.get(record.productId) : null;
    setDetailLines([{
      key: `edit-${record.id}`,
      productId: record.productId || 0,
      productCode: product?.code || "",
      productName: record.itemName,
      specification: product?.specification || "",
      unit: record.unit || product?.unit || "",
      sourceQty: 0,
      receivedQty: 0,
      inboundQty: record.quantity || "",
      batchNo: record.batchNo || "",
      sterilizationBatchNo: record.sterilizationBatchNo || "",
      isMedicalDevice: product?.isMedicalDevice ?? false,
      isSterilized: product?.isSterilized ?? false,
    }]);
    setFormOpen(true);
  };

  const handleView = (record: any) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };

  const handleDelete = (record: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: record.id }, {
      onSuccess: () => {
        // 销售退货删除后同步销售订单状态
        if (record.type === "return_in" && record.relatedOrderId) {
          syncShipmentStatusMutation.mutate({ orderId: record.relatedOrderId });
        }
      },
    });
  };

  // 选择采购订单
  const handleSelectPurchaseOrder = (order: any) => {
    setPoDialogOpen(false);
    setFormData((prev) => ({
      ...prev,
      relatedOrderId: String(order.id),
      supplierName: order.supplierName || "",
    }));
  };

  // 选择销售订单（退货）
  const handleSelectSalesOrder = (order: any) => {
    setSoDialogOpen(false);
    setFormData((prev) => ({
      ...prev,
      relatedOrderId: String(order.id),
    }));
  };

  // 选择生产入库申请
  const handleSelectPWE = (entry: any) => {
    setPweDialogOpen(false);
    setFormData((prev) => ({
      ...prev,
      relatedEntryId: String(entry.id),
    }));
    // 直接加载生产入库申请明细（单条）
    const product = entry.productId ? productsById.get(Number(entry.productId)) : null;
    setDetailLines([{
      key: `pwe-${entry.id}`,
      productId: entry.productId ? Number(entry.productId) : 0,
      productCode: product?.code || "",
      productName: entry.productName || product?.name || "",
      specification: product?.specification || "",
      unit: entry.unit || product?.unit || "",
      sourceQty: parseFloat(entry.quantity || "0"),
      receivedQty: 0,
      inboundQty: entry.quantity || "",
      batchNo: entry.batchNo || "",
      sterilizationBatchNo: entry.sterilizationBatchNo || "",
      isMedicalDevice: product?.isMedicalDevice ?? false,
      isSterilized: product?.isSterilized ?? false,
    }]);
  };

  // 更新明细行
  const updateDetailLine = (key: string, field: keyof InboundDetailLine, value: string) => {
    setDetailLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, [field]: value } : line))
    );
  };

  // 手动添加明细行（其他入库/销售退货无订单时）
  const addManualLine = () => {
    setDetailLines((prev) => [...prev, {
      key: `manual-${Date.now()}`,
      productId: 0,
      productCode: "",
      productName: "",
      specification: "",
      unit: "",
      sourceQty: 0,
      receivedQty: 0,
      inboundQty: "",
      batchNo: "",
      sterilizationBatchNo: "",
      isMedicalDevice: false,
      isSterilized: false,
    }]);
  };

  const handleSubmit = () => {
    if (!formData.warehouseId) { toast.error("请选择入库仓库"); return; }
    const validLines = detailLines.filter((line) => parseFloat(line.inboundQty) > 0);
    if (validLines.length === 0) { toast.error("请至少填写一条入库明细"); return; }

    for (const line of validLines) {
      if (line.isMedicalDevice && line.isSterilized && !line.sterilizationBatchNo.trim()) {
        toast.error(`${line.productName} 为需灭菌医疗器械，必须填写灭菌批号`);
        return;
      }
    }

    if (editingRecord) {
      const line = validLines[0];
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          documentNo: formData.documentNo || undefined,
          productId: line.productId || undefined,
          itemName: line.productName,
          batchNo: line.batchNo || undefined,
          sterilizationBatchNo: line.sterilizationBatchNo || undefined,
          quantity: String(line.inboundQty),
          unit: line.unit || undefined,
          remark: formData.remark || undefined,
        },
      });
    } else {
      let successCount = 0;
      let errorCount = 0;
      const total = validLines.length;

      validLines.forEach((line, idx) => {
        const docNo = total > 1
          ? `${formData.documentNo || buildDefaultDocumentNo()}-${String(idx + 1).padStart(2, "0")}`
          : formData.documentNo || buildDefaultDocumentNo();

        createMutation.mutate({
          productId: line.productId || undefined,
          warehouseId: Number(formData.warehouseId),
          type: formData.type as any,
          documentNo: docNo,
          itemName: line.productName,
          batchNo: line.batchNo || undefined,
          sterilizationBatchNo: line.sterilizationBatchNo || undefined,
          quantity: String(line.inboundQty),
          unit: line.unit || undefined,
          remark: formData.remark || undefined,
          relatedOrderId: formData.relatedOrderId ? Number(formData.relatedOrderId) : undefined,
        }, {
          onSuccess: () => {
            successCount++;
            if (successCount + errorCount === total) {
              // 销售退货：同步销售订单发货状态（deliveredQty 减少，状态回退）
              if (formData.type === "return_in" && formData.relatedOrderId) {
                syncShipmentStatusMutation.mutate(
                  { orderId: Number(formData.relatedOrderId) },
                  { onSettled: () => { refetch(); } }
                );
              } else {
                refetch();
              }
              setFormOpen(false);
              if (errorCount > 0) toast.warning(`${successCount} 条创建成功，${errorCount} 条失败`);
              else toast.success("入库单已创建");
            }
          },
          onError: () => {
            errorCount++;
            if (successCount + errorCount === total) {
              refetch();
              if (successCount > 0) toast.warning(`${successCount} 条创建成功，${errorCount} 条失败`);
            }
          },
        });
      });
    }
  };

  // ==================== 过滤数据 ====================
  const filteredData = data.filter((r) => {
    const matchSearch = !searchText ||
      (r.documentNo || "").toLowerCase().includes(searchText.toLowerCase()) ||
      r.itemName.toLowerCase().includes(searchText.toLowerCase());
    const matchType = filterType === "all" || r.type === filterType;
    return matchSearch && matchType;
  });

  // 来源弹窗搜索过滤
  const filteredPO = purchaseOrderList.filter((o: any) => {
    if (!sourceSearch) return true;
    const q = sourceSearch.toLowerCase();
    return o.orderNo?.toLowerCase().includes(q) || (o.supplierName || "").toLowerCase().includes(q);
  });
  const filteredSO = salesOrderList.filter((o: any) => {
    if (!sourceSearch) return true;
    const q = sourceSearch.toLowerCase();
    return o.orderNo?.toLowerCase().includes(q) || (o.customerName || "").toLowerCase().includes(q);
  });
  const filteredPWE = (pweList as any[]).filter((e: any) => {
    if (!sourceSearch) return true;
    const q = sourceSearch.toLowerCase();
    return e.entryNo?.toLowerCase().includes(q) || (e.productName || "").toLowerCase().includes(q);
  });

  // 获取当前关联单据显示名称
  const getRelatedLabel = () => {
    if (formData.type === "purchase_in" && formData.relatedOrderId) {
      const po = purchaseOrderList.find((o: any) => String(o.id) === formData.relatedOrderId);
      return po ? `${(po as any).orderNo}（${(po as any).supplierName || ""}）` : `#${formData.relatedOrderId}`;
    }
    if (formData.type === "return_in" && formData.relatedOrderId) {
      const so = salesOrderList.find((o: any) => String(o.id) === formData.relatedOrderId);
      return so ? `${(so as any).orderNo}（${(so as any).customerName || ""}）` : `#${formData.relatedOrderId}`;
    }
    if (formData.type === "production_in" && formData.relatedEntryId) {
      const entry = (pweList as any[]).find((e: any) => String(e.id) === formData.relatedEntryId);
      return entry ? `${entry.entryNo}（${entry.productName || ""}）` : `#${formData.relatedEntryId}`;
    }
    return "";
  };

  // ==================== 渲染 ====================
  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackagePlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">入库管理</h1>
              <p className="text-sm text-muted-foreground">管理采购入库、生产入库、销售退货等各类入库业务</p>
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />新建入库
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "入库总数", value: data.length, color: "text-foreground" },
            { label: "采购入库", value: data.filter((d: any) => d.type === "purchase_in").length, color: "text-blue-600" },
            { label: "生产入库", value: data.filter((d: any) => d.type === "production_in").length, color: "text-green-600" },
            { label: "销售退货", value: data.filter((d: any) => d.type === "return_in").length, color: "text-amber-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* 搜索 & 筛选 */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索入库单号、物料名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="入库类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {inboundTypeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>入库单号</TableHead>
                <TableHead>入库类型</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead>批次号</TableHead>
                <TableHead>灭菌批号</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>入库仓库</TableHead>
                <TableHead>关联单据</TableHead>
                <TableHead>入库时间</TableHead>
                <TableHead className="w-[60px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    暂无入库记录
                  </TableCell>
                </TableRow>
              ) : filteredData.map((record: any) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => handleView(record)}
                >
                  <TableCell className="font-mono text-sm">{record.documentNo || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={record.type === "return_in" ? "destructive" : "outline"}>
                      {typeMap[record.type] || record.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{record.itemName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.batchNo || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.sterilizationBatchNo || "-"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {parseFloat(String(record.quantity || 0)).toLocaleString()} {record.unit || ""}
                  </TableCell>
                  <TableCell className="text-sm">{getWarehouseName(record.warehouseId)}</TableCell>
                  <TableCell>
                    {record.relatedOrderId ? (
                      <Badge variant="secondary">#{record.relatedOrderId}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(record.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(record)}>
                          <Eye className="h-4 w-4 mr-2" />查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(record)}>
                          <Edit className="h-4 w-4 mr-2" />编辑
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(record)}
                          >
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
      </div>

      {/* ==================== 新建/编辑入库单弹窗 ==================== */}
      <DraggableDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultWidth={920}
        defaultHeight={720}
        isMaximized={formMaximized}
        onMaximizedChange={setFormMaximized}
      >
        <DraggableDialogContent isMaximized={formMaximized}>
          <DialogHeader>
            <DialogTitle>{editingRecord ? "编辑入库单" : "新建入库单"}</DialogTitle>
            {!editingRecord && formData.documentNo && (
              <p className="text-sm text-muted-foreground">单据号：{formData.documentNo}</p>
            )}
          </DialogHeader>

          <div className="space-y-6 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-medium mb-3">基本信息</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>入库单号</Label>
                  <Input
                    value={formData.documentNo}
                    onChange={(e) => setFormData((p) => ({ ...p, documentNo: e.target.value }))}
                    placeholder="系统自动生成或手动输入"
                  />
                </div>
                <div className="space-y-2">
                  <Label>入库类型 <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => {
                      setFormData((p) => ({ ...p, type: v, relatedOrderId: "", relatedEntryId: "", supplierName: "" }));
                      setDetailLines([]);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {inboundTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>入库仓库 <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.warehouseId}
                    onValueChange={(v) => setFormData((p) => ({ ...p, warehouseId: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="请选择仓库" /></SelectTrigger>
                    <SelectContent>
                      {(warehouseList as any[]).map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 采购入库：供应商名称（只读，从采购订单带入） */}
                {formData.type === "purchase_in" && (
                  <div className="space-y-2">
                    <Label>供应商</Label>
                    <Input value={formData.supplierName} readOnly placeholder="选择采购订单后自动带入" className="bg-muted/30" />
                  </div>
                )}
              </div>

              {/* 来源单据选择行 */}
              {(formData.type === "purchase_in" || formData.type === "return_in" || formData.type === "production_in") && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {getRelatedLabel() || (
                      <span className="text-muted-foreground">
                        {formData.type === "purchase_in" && "尚未选择采购订单"}
                        {formData.type === "return_in" && "尚未选择销售订单"}
                        {formData.type === "production_in" && "尚未选择生产入库申请"}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSourceSearch("");
                      if (formData.type === "purchase_in") setPoDialogOpen(true);
                      else if (formData.type === "return_in") setSoDialogOpen(true);
                      else if (formData.type === "production_in") setPweDialogOpen(true);
                    }}
                  >
                    {formData.type === "purchase_in" && "选择采购订单"}
                    {formData.type === "return_in" && "选择销售订单"}
                    {formData.type === "production_in" && "选择入库申请"}
                  </Button>
                  {(formData.relatedOrderId || formData.relatedEntryId) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData((p) => ({ ...p, relatedOrderId: "", relatedEntryId: "", supplierName: "" }));
                        setDetailLines([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* 入库明细 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">入库明细</h3>
                {(formData.type === "other_in" || formData.type === "return_in") && (
                  <Button type="button" variant="outline" size="sm" onClick={addManualLine} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />添加明细
                  </Button>
                )}
              </div>

              {detailLines.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                  {formData.type === "purchase_in" && "请先选择采购订单，系统将自动带入物料明细"}
                  {formData.type === "production_in" && "请先选择生产入库申请，系统将自动带入产品信息"}
                  {formData.type === "return_in" && "请选择销售订单或手动添加退货明细"}
                  {formData.type === "other_in" && "请点击「添加明细」手动添加入库物料"}
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {formData.type !== "other_in" && <TableHead className="text-xs">物料编码</TableHead>}
                        <TableHead className="text-xs">物料名称</TableHead>
                        <TableHead className="text-xs">规格</TableHead>
                        <TableHead className="text-xs">单位</TableHead>
                        {(formData.type === "purchase_in" || formData.type === "return_in") && (
                          <>
                            <TableHead className="text-xs text-right">
                              {formData.type === "purchase_in" ? "订单数量" : "发货数量"}
                            </TableHead>
                            <TableHead className="text-xs text-right">
                              {formData.type === "purchase_in" ? "已收货" : "已发货"}
                            </TableHead>
                          </>
                        )}
                        {formData.type === "production_in" && (
                          <TableHead className="text-xs text-right">申请数量</TableHead>
                        )}
                        <TableHead className="text-xs">批次号</TableHead>
                        <TableHead className="text-xs">灭菌批号</TableHead>
                        <TableHead className="text-xs">本次入库数量</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailLines.map((line) => (
                        <TableRow key={line.key}>
                          {/* 物料编码（手动行可编辑） */}
                          {formData.type !== "other_in" && (
                            <TableCell className="text-sm font-mono">{line.productCode || "-"}</TableCell>
                          )}

                          {/* 物料名称 */}
                          <TableCell>
                            {(formData.type === "other_in" || (formData.type === "return_in" && !formData.relatedOrderId)) ? (
                              <Select
                                value={line.productId ? String(line.productId) : undefined}
                                onValueChange={(v) => {
                                  const p = productsById.get(Number(v));
                                  if (p) {
                                    setDetailLines((prev) => prev.map((l) => l.key === line.key ? {
                                      ...l,
                                      productId: p.id,
                                      productCode: p.code,
                                      productName: p.name,
                                      specification: p.specification || "",
                                      unit: p.unit || "",
                                      isMedicalDevice: p.isMedicalDevice,
                                      isSterilized: p.isSterilized,
                                    } : l));
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs min-w-[140px]">
                                  <SelectValue placeholder="选择产品" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                      {p.code} - {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm font-medium">{line.productName}</span>
                            )}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">{line.specification || "-"}</TableCell>
                          <TableCell className="text-sm">{line.unit || "-"}</TableCell>

                          {/* 来源数量列 */}
                          {(formData.type === "purchase_in" || formData.type === "return_in") && (
                            <>
                              <TableCell className="text-right text-sm">{line.sourceQty || "-"}</TableCell>
                              <TableCell className="text-right text-sm">{line.receivedQty || "-"}</TableCell>
                            </>
                          )}
                          {formData.type === "production_in" && (
                            <TableCell className="text-right text-sm">{line.sourceQty || "-"}</TableCell>
                          )}

                          {/* 批次号 */}
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-28"
                              value={line.batchNo}
                              onChange={(e) => updateDetailLine(line.key, "batchNo", e.target.value)}
                              placeholder="输入批次号"
                            />
                          </TableCell>

                          {/* 灭菌批号 */}
                          <TableCell>
                            {line.isMedicalDevice && line.isSterilized ? (
                              <Input
                                className="h-8 text-xs w-28"
                                value={line.sterilizationBatchNo}
                                onChange={(e) => updateDetailLine(line.key, "sterilizationBatchNo", e.target.value)}
                                placeholder="灭菌批号 *"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* 本次入库数量 */}
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                className="h-8 text-xs w-24"
                                value={line.inboundQty}
                                onChange={(e) => updateDetailLine(line.key, "inboundQty", e.target.value)}
                                placeholder="数量"
                              />
                              {formData.type === "purchase_in" && line.sourceQty > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  待收：{Math.max(0, line.sourceQty - line.receivedQty)}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* 删除 */}
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDetailLines((prev) => prev.filter((l) => l.key !== line.key))}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* 备注 */}
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={formData.remark}
                onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))}
                placeholder="请输入备注信息"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingRecord ? "保存修改" : "创建入库单"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ==================== 采购订单选择弹窗 ==================== */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择采购订单</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索订单号、供应商名称..."
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>订单号</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>订单日期</TableHead>
                  <TableHead>预计到货</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPO.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无待收货的采购订单
                    </TableCell>
                  </TableRow>
                ) : filteredPO.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleSelectPurchaseOrder(order)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{order.orderNo}</TableCell>
                    <TableCell className="text-sm">{order.supplierName || "-"}</TableCell>
                    <TableCell className="text-sm">{formatDate(order.orderDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(order.expectedDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {{ approved: "已审批", ordered: "已下单", partial_received: "部分收货" }[order.status as string] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleSelectPurchaseOrder(order)}>选择</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== 销售订单选择弹窗（退货） ==================== */}
      <Dialog open={soDialogOpen} onOpenChange={setSoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择退货销售订单</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索订单号、客户名称..."
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>订单号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSO.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      暂无可退货的销售订单
                    </TableCell>
                  </TableRow>
                ) : filteredSO.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleSelectSalesOrder(order)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{order.orderNo}</TableCell>
                    <TableCell className="text-sm">{order.customerName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{salesOrderStatusMap[order.status] || order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleSelectSalesOrder(order)}>选择</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== 生产入库申请选择弹窗 ==================== */}
      <Dialog open={pweDialogOpen} onOpenChange={setPweDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择生产入库申请</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索申请单号、产品名称..."
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>申请单号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>批次号</TableHead>
                  <TableHead className="text-right">申请数量</TableHead>
                  <TableHead>申请日期</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPWE.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无已审批的生产入库申请
                    </TableCell>
                  </TableRow>
                ) : filteredPWE.map((entry: any) => (
                  <TableRow
                    key={entry.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleSelectPWE(entry)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{entry.entryNo}</TableCell>
                    <TableCell className="text-sm">{entry.productName || "-"}</TableCell>
                    <TableCell className="text-sm">{entry.batchNo || "-"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {parseFloat(entry.quantity || "0").toLocaleString()} {entry.unit || ""}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(entry.applicationDate)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleSelectPWE(entry)}>选择</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== 详情弹窗 ==================== */}
      {viewingRecord && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>入库单详情 - {viewingRecord.documentNo || viewingRecord.id}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {[
                { label: "入库单号", value: viewingRecord.documentNo || "-" },
                { label: "入库类型", value: <Badge variant={viewingRecord.type === "return_in" ? "destructive" : "outline"}>{typeMap[viewingRecord.type] || viewingRecord.type}</Badge> },
                { label: "物料名称", value: viewingRecord.itemName },
                { label: "批次号", value: viewingRecord.batchNo || "-" },
                { label: "灭菌批号", value: viewingRecord.sterilizationBatchNo || "-" },
                { label: "数量", value: `${parseFloat(String(viewingRecord.quantity || 0)).toLocaleString()} ${viewingRecord.unit || ""}` },
                { label: "入库仓库", value: getWarehouseName(viewingRecord.warehouseId) },
                { label: "关联单据", value: viewingRecord.relatedOrderId ? `#${viewingRecord.relatedOrderId}` : "-" },
                { label: "入库时间", value: formatDateTime(viewingRecord.createdAt) },
                { label: "备注", value: viewingRecord.remark || "-" },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDetailOpen(false); handleEdit(viewingRecord); }}>
                编辑入库单
              </Button>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ERPLayout>
  );
}
