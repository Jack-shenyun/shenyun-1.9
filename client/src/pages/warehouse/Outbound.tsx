import { useState, useEffect, useRef } from "react";
import ERPLayout from "@/components/ERPLayout";
import {
  PackageMinus, Plus, Search, Eye, Edit, Trash2, MoreHorizontal,
  Printer, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue, formatDateTime, formatDisplayNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DeliveryNotePrint } from "@/components/print";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

// ==================== 常量 ====================
const typeMap: Record<string, string> = {
  sales_out: "销售出库",
  production_out: "生产领料",
  return_out: "采购退货",
  other_out: "其他出库",
};

const outboundTypeOptions = [
  { label: "销售出库", value: "sales_out" },
  { label: "生产领料", value: "production_out" },
  { label: "采购退货", value: "return_out" },
  { label: "其他出库", value: "other_out" },
];

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

type SalesOrderOption = {
  id: number;
  orderNo: string;
  customerName?: string | null;
  status: string;
  shippingAddress?: string | null;
  shippingContact?: string | null;
  shippingPhone?: string | null;
};

type OutboundRecord = {
  id: number;
  documentNo?: string | null;
  type: string;
  warehouseId: number;
  productId?: number | null;
  itemName: string;
  batchNo?: string | null;
  sterilizationBatchNo?: string | null;
  quantity: string;
  unit?: string | null;
  beforeQty?: string | null;
  afterQty?: string | null;
  relatedOrderId?: number | null;
  remark?: string | null;
  createdAt: string;
};

// 出库明细行
type OutboundDetailLine = {
  key: string; // 唯一标识
  productId: number;
  productCode: string;
  productName: string;
  specification: string;
  unit: string;
  orderQty: number;       // 订单数量
  deliveredQty: number;   // 已发数量
  outboundQty: string;    // 本次出库数量
  batchNo: string;        // 批号
  sterilizationBatchNo: string; // 灭菌批号
  isMedicalDevice: boolean;
  isSterilized: boolean;  // 是否需要灭菌（仅当 isMedicalDevice && isSterilized 同时为 true 时才需要填写灭菌批号）
};

type FormData = {
  documentNo: string;
  type: string;
  relatedOrderId: string;
  warehouseId: string;
  hasShipping: string; // "yes" | "no" | ""
  shippingFee: string;
  logisticsSupplierId: string;
  logisticsSupplierName: string;
  remark: string;
};

// ==================== 主组件 ====================
export default function OutboundPage() {
  const { canDelete } = usePermission();

  // ---- 对话框状态 ----
  const [formOpen, setFormOpen]               = useState(false);
  const [formMaximized, setFormMaximized]     = useState(false);
  const [detailOpen, setDetailOpen]           = useState(false);
  const [editingRecord, setEditingRecord]     = useState<OutboundRecord | null>(null);
  const [viewingRecord, setViewingRecord]     = useState<OutboundRecord | null>(null);
  const [printDeliveryOpen, setPrintDeliveryOpen] = useState(false);

  // ---- 搜索 & 筛选 ----
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // ---- 表单状态 ----
  const [formData, setFormData] = useState<FormData>({
    documentNo: "",
    type: "sales_out",
    relatedOrderId: "",
    warehouseId: "",
    hasShipping: "",
    shippingFee: "",
    logisticsSupplierId: "",
    logisticsSupplierName: "",
    remark: "",
  });

  // ---- 明细行 ----
  const [detailLines, setDetailLines] = useState<OutboundDetailLine[]>([]);

  // ---- 销售订单选择弹窗 ----
  const [soDialogOpen, setSoDialogOpen] = useState(false);
  const [soSearch, setSoSearch]         = useState("");

  // ==================== 数据查询 ====================
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: productList = [] }   = trpc.products.list.useQuery({ limit: 1000 });

  // 销售订单列表（已审批 + 待发货 + 部分发货 状态）
  const { data: approvedOrders = [] }       = trpc.salesOrders.list.useQuery({ status: "approved", limit: 200 });
  const { data: readyOrders = [] }          = trpc.salesOrders.list.useQuery({ status: "ready_to_ship", limit: 200 });
  const { data: partialShippedOrders = [] } = trpc.salesOrders.list.useQuery({ status: "partial_shipped", limit: 200 });
  const salesOrderList: SalesOrderOption[] = [
    ...(approvedOrders as SalesOrderOption[]),
    ...(readyOrders as SalesOrderOption[]),
    ...(partialShippedOrders as SalesOrderOption[]),
  ];

  // 库存列表（用于获取批号）
  const { data: inventoryList = [] } = trpc.inventory.list.useQuery({ limit: 2000 });

  // 物流供应商列表（type=service 的供应商）
  const { data: supplierList = [] } = trpc.suppliers.list.useQuery({ limit: 500 });
  const logisticsSuppliers = (supplierList as any[]).filter((s: any) => s.type === 'service' && s.status === 'qualified');

  // 出库记录列表
  const { data: rawData = [], refetch } = trpc.inventoryTransactions.list.useQuery({ limit: 200 });
  const data: OutboundRecord[] = (rawData as OutboundRecord[]).filter((r) =>
    ["sales_out", "production_out", "return_out", "other_out"].includes(r.type)
  );

  const products = (productList as ProductOption[]) || [];
  const productsById = new Map(products.map((p) => [p.id, p]));

  // 选中的销售订单详情查询
  const selectedOrderId = formData.relatedOrderId ? Number(formData.relatedOrderId) : null;
  const { data: orderDetail } = trpc.salesOrders.getById.useQuery(
    { id: selectedOrderId! },
    { enabled: !!selectedOrderId && formData.type === "sales_out" }
  );

  // 当选择订单后，自动加载明细
  useEffect(() => {
    if (orderDetail?.items && formData.type === "sales_out" && selectedOrderId) {
      const lines: OutboundDetailLine[] = (orderDetail.items as any[]).map((item: any, idx: number) => {
        const product = productsById.get(Number(item.productId));
        return {
          key: `${selectedOrderId}-${item.productId}-${idx}`,
          productId: Number(item.productId),
          productCode: item.productCode || product?.code || "",
          productName: item.productName || product?.name || "",
          specification: item.specification || product?.specification || "",
          unit: item.unit || product?.unit || "",
          orderQty: parseFloat(item.quantity || "0"),
          deliveredQty: parseFloat(item.deliveredQty || "0"),
          outboundQty: String(Math.max(0, parseFloat(item.quantity || "0") - parseFloat(item.deliveredQty || "0"))),
          batchNo: "",
          sterilizationBatchNo: "",
          isMedicalDevice: product?.isMedicalDevice ?? false,
          isSterilized: product?.isSterilized ?? false,
        };
      });
      setDetailLines(lines);
    }
  }, [orderDetail, selectedOrderId, formData.type]);

  // ==================== Mutations ====================
  const createMutation = trpc.inventoryTransactions.create.useMutation({
    onSuccess: () => { toast.success("出库单已创建"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("创建失败：" + e.message),
  });
  const updateMutation = trpc.inventoryTransactions.update.useMutation({
    onSuccess: () => { toast.success("出库单已更新"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("更新失败：" + e.message),
  });
  const syncShipmentStatusMutation = trpc.salesOrders.syncShipmentStatus.useMutation();
  const deleteMutation = trpc.inventoryTransactions.delete.useMutation({
    onSuccess: () => {
      toast.success("出库单已删除");
      refetch();
    },
    onError: (e) => toast.error("删除失败：" + e.message),
  });
  // ==================== 辅助函数 ====================
  const getWarehouseName = (warehouseId: number) => {
    const wh = (warehouseList as any[]).find((w: any) => w.id === warehouseId);
    return wh ? wh.name : `仓库${warehouseId}`;
  };

  const getRelatedOrder = (relatedOrderId: number | null | undefined): SalesOrderOption | undefined => {
    if (!relatedOrderId) return undefined;
    return salesOrderList.find((o) => o.id === relatedOrderId);
  };

  const getRelatedOrderNo = (relatedOrderId: number | null | undefined) => {
    const o = getRelatedOrder(relatedOrderId);
    return o ? o.orderNo : relatedOrderId ? `#${relatedOrderId}` : "-";
  };

  const getSalesOrderStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      approved: "已审批",
      ready_to_ship: "待发货",
      partial_shipped: "部分发货",
      shipped: "已发货",
      completed: "已完成",
      cancelled: "已取消",
    };
    return map[status] || status;
  };

  // 获取某个产品在指定仓库的可用批号列表
  const getBatchOptions = (productId: number, warehouseId: number) => {
    // 显示该产品在该仓库的所有批次记录（包括库存为 0 或负数的情况），
    // 以支持流程倒置（如退货、调整）或库存修正场景
    return (inventoryList as any[]).filter(
      (inv: any) =>
        inv.productId === productId &&
        inv.warehouseId === warehouseId
    );
  };

  // ==================== 表单操作 ====================
  const resetForm = () => {
    setFormData({
      documentNo: "",
      type: "sales_out",
      relatedOrderId: "",
      warehouseId: "",
      hasShipping: "",
      shippingFee: "",
      logisticsSupplierId: "",
      logisticsSupplierName: "",
      remark: "",
    });
    setDetailLines([]);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    resetForm();
    setFormOpen(true);
  };

  const handleEdit = (record: OutboundRecord) => {
    setEditingRecord(record);
    const recShippingFee = (record as any).shippingFee || "";
    const recLogisticsId = (record as any).logisticsSupplierId ? String((record as any).logisticsSupplierId) : "";
    setFormData({
      documentNo: record.documentNo || "",
      type: record.type,
      relatedOrderId: record.relatedOrderId ? String(record.relatedOrderId) : "",
      warehouseId: record.warehouseId ? String(record.warehouseId) : "",
      hasShipping: (recShippingFee || recLogisticsId) ? "yes" : "no",
      shippingFee: recShippingFee,
      logisticsSupplierId: recLogisticsId,
      logisticsSupplierName: (record as any).logisticsSupplierName || "",
      remark: record.remark || "",
    });
    // 编辑时加载单条明细
    const product = record.productId ? productsById.get(record.productId) : null;
    setDetailLines([{
      key: `edit-${record.id}`,
      productId: record.productId || 0,
      productCode: product?.code || "",
      productName: record.itemName,
      specification: product?.specification || "",
      unit: record.unit || product?.unit || "",
      orderQty: 0,
      deliveredQty: 0,
      outboundQty: record.quantity || "",
      batchNo: record.batchNo || "",
      sterilizationBatchNo: record.sterilizationBatchNo || "",
      isMedicalDevice: product?.isMedicalDevice ?? false,
      isSterilized: product?.isSterilized ?? false,
    }]);
    setFormOpen(true);
  };

  const handleView = (record: OutboundRecord) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };

  const handleDelete = (record: OutboundRecord) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    // 删除出库记录，删除成功后如果是 sales_out 且有关联订单，立即触发状态同步
    deleteMutation.mutate({ id: record.id }, {
      onSuccess: () => {
        if (record.type === "sales_out" && record.relatedOrderId) {
          syncShipmentStatusMutation.mutate({ orderId: record.relatedOrderId });
        }
      },
    });
  };

  // 选择销售订单后自动填充
  const handleSelectSalesOrder = (order: SalesOrderOption) => {
    setSoDialogOpen(false);
    setFormData((prev) => ({
      ...prev,
      relatedOrderId: String(order.id),
    }));
    // 明细会通过 useEffect 自动加载
  };

  // 更新明细行
  const updateDetailLine = (key: string, field: keyof OutboundDetailLine, value: string) => {
    setDetailLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, [field]: value } : line))
    );
  };

  const handleSubmit = () => {
    if (!formData.warehouseId) { toast.error("请选择出库仓库"); return; }

    // 过滤出有效的明细行（出库数量 > 0）
    const validLines = detailLines.filter((line) => parseFloat(line.outboundQty) > 0);
    if (validLines.length === 0) {
      toast.error("请至少填写一条出库明细");
      return;
    }

    // 验证医疗器械灭菌批号（仅当产品同时满足「是医疗器械」且「需要灭菌」时才要求）
    for (const line of validLines) {
      if (line.isMedicalDevice && line.isSterilized && !line.sterilizationBatchNo.trim()) {
        toast.error(`${line.productName} 为需灭菌医疗器械，必须填写灭菌批号`);
        return;
      }
    }

    // ===== 库存数量校验（硬性限制：出库数量不能超过库存数量）=====
    for (const line of validLines) {
      if (!line.productId || !formData.warehouseId) continue;
      const outQty = parseFloat(line.outboundQty);

      // 根据批号匹配对应库存记录
      const batchOptions = getBatchOptions(line.productId, Number(formData.warehouseId));
      if (batchOptions.length > 0) {
        // 已选批号时，校验该批次的库存
        if (line.batchNo) {
          const matchedInv = batchOptions.find(
            (inv: any) => (inv.batchNo || `inv-${inv.id}`) === line.batchNo
          );
          if (matchedInv) {
            const availableQty = parseFloat(String(matchedInv.quantity || "0"));
            if (outQty > availableQty) {
              toast.error(
                `「${line.productName}」批次 ${line.batchNo} 库存不足！` +
                `当前库存 ${availableQty} ${line.unit || ""}，出库数量 ${outQty} ${line.unit || ""}，无法创建出库单。`
              );
              return;
            }
          }
        } else {
          // 未选批号时，校验该产品在仓库的总库存
          const totalInvQty = batchOptions.reduce(
            (sum: number, inv: any) => sum + parseFloat(String(inv.quantity || "0")),
            0
          );
          if (outQty > totalInvQty) {
            toast.error(
              `「${line.productName}」库存不足！` +
              `当前总库存 ${totalInvQty} ${line.unit || ""}，出库数量 ${outQty} ${line.unit || ""}，无法创建出库单。`
            );
            return;
          }
        }
      }
    }

    // ===== 订单数量校验（软性警告：出库数量超过订单剩余数量时提示，但允许继续）=====
    if (formData.type === "sales_out") {
      const overOrderLines: string[] = [];
      for (const line of validLines) {
        const outQty = parseFloat(line.outboundQty);
        const remainQty = line.orderQty - line.deliveredQty;
        if (outQty > remainQty && remainQty >= 0) {
          overOrderLines.push(
            `「${line.productName}」订单剩余 ${remainQty} ${line.unit || ""}，本次出库 ${outQty} ${line.unit || ""}`
          );
        }
      }
      if (overOrderLines.length > 0) {
        toast.warning(
          `以下产品出库数量超过订单剩余数量，已超额发货：\n${overOrderLines.join("；\n")}`,
          { duration: 5000 }
        );
        // 超出订单数量仅警告，不阻止提交，继续执行
      }
    }

    if (editingRecord) {
      // 编辑模式：只更新第一条
      const line = validLines[0];
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          documentNo: formData.documentNo || undefined,
          productId: line.productId,
          itemName: line.productName,
          batchNo: line.batchNo || undefined,
          sterilizationBatchNo: line.sterilizationBatchNo || undefined,
          quantity: String(line.outboundQty),
          unit: line.unit || undefined,
          remark: formData.remark || undefined,
          relatedOrderId: formData.relatedOrderId ? Number(formData.relatedOrderId) : undefined,
        },
      });
    } else {
      // 新建模式：为每条明细创建一条出库记录
      let successCount = 0;
      let errorCount = 0;
      const total = validLines.length;

      validLines.forEach((line) => {
        createMutation.mutate({
          productId: line.productId,
          warehouseId: Number(formData.warehouseId),
          type: formData.type as any,
          documentNo: formData.documentNo || undefined,
          itemName: line.productName,
          batchNo: line.batchNo || undefined,
          sterilizationBatchNo: line.sterilizationBatchNo || undefined,
          quantity: String(line.outboundQty),
          unit: line.unit || undefined,
          remark: formData.remark || undefined,
          relatedOrderId: formData.relatedOrderId ? Number(formData.relatedOrderId) : undefined,
          shippingFee: formData.shippingFee || undefined,
          logisticsSupplierId: formData.logisticsSupplierId ? Number(formData.logisticsSupplierId) : undefined,
          logisticsSupplierName: formData.logisticsSupplierName || undefined,
        }, {
          onSuccess: () => {
            successCount++;
            if (successCount + errorCount === total) {
              // 所有明细全部插入完成，统一触发一次订单状态同步
              if (formData.relatedOrderId && formData.type === "sales_out") {
                syncShipmentStatusMutation.mutate(
                  { orderId: Number(formData.relatedOrderId) },
                  { onSettled: () => { refetch(); } }
                );
              } else {
                refetch();
              }
              setFormOpen(false);
              if (errorCount > 0) {
                toast.warning(`${successCount} 条创建成功，${errorCount} 条失败`);
              }
            }
          },
          onError: () => {
            errorCount++;
            if (successCount + errorCount === total) {
              refetch();
              if (successCount > 0) {
                toast.warning(`${successCount} 条创建成功，${errorCount} 条失败`);
              }
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

  // ==================== 销售订单弹窗过滤 ====================
  const filteredSalesOrders = salesOrderList.filter((o) => {
    if (!soSearch) return true;
    const q = soSearch.toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(q) ||
      (o.customerName || "").toLowerCase().includes(q)
    );
  });

  // ==================== 渲染 ====================
  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageMinus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">出库管理</h1>
              <p className="text-sm text-muted-foreground">管理销售出库、生产领料、采购退货等各类出库业务</p>
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />新建出库
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "出库总数", value: data.length, color: "text-foreground" },
            { label: "销售出库", value: data.filter((d) => d.type === "sales_out").length, color: "text-blue-600" },
            { label: "生产领料", value: data.filter((d) => d.type === "production_out").length, color: "text-green-600" },
            { label: "采购退货", value: data.filter((d) => d.type === "return_out").length, color: "text-amber-600" },
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
              placeholder="搜索出库单号、物料名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="出库类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {outboundTypeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <div className="rounded-lg border overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>出库单号</TableHead>
                <TableHead>出库类型</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead>批次号</TableHead>
                <TableHead>灭菌批号</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>出库仓库</TableHead>
                <TableHead>关联订单</TableHead>
                <TableHead>出库时间</TableHead>
                <TableHead className="w-[60px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    暂无出库记录
                  </TableCell>
                </TableRow>
              ) : filteredData.map((record) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => handleView(record)}
                >
                  <TableCell className="font-mono text-sm">{record.documentNo || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeMap[record.type] || record.type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{record.itemName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.batchNo || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.sterilizationBatchNo || "-"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatDisplayNumber(record.quantity)} {record.unit || ""}
                  </TableCell>
                  <TableCell className="text-sm">{getWarehouseName(record.warehouseId)}</TableCell>
                  <TableCell>
                    {record.relatedOrderId ? (
                      <Badge variant="secondary">{getRelatedOrderNo(record.relatedOrderId)}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateValue(record.createdAt)}
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

      {/* ==================== 新建/编辑出库单对话框 ==================== */}
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
            <DialogTitle>{editingRecord ? "编辑出库单" : "新建出库单"}</DialogTitle>
            {!editingRecord && formData.documentNo && (
              <p className="text-sm text-muted-foreground">单据号：{formData.documentNo}</p>
            )}
          </DialogHeader>
          <div className="space-y-6 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-medium mb-3">基本信息</h3>
              {/* 第一行：出库单号、出库类型、出库仓库、是否含运费 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>出库单号</Label>
                  <Input
                    value={formData.documentNo}
                    onChange={(e) => setFormData((p) => ({ ...p, documentNo: e.target.value }))}
                    placeholder="保存后系统生成"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label>出库类型 <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => {
                      setFormData((p) => ({ ...p, type: v, relatedOrderId: "" }));
                      setDetailLines([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {outboundTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>出库仓库 <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.warehouseId}
                    onValueChange={(v) => setFormData((p) => ({ ...p, warehouseId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择仓库" />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouseList as any[]).map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>是否含运费 <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.hasShipping}
                    onValueChange={(v) => {
                      setFormData((p) => ({
                        ...p,
                        hasShipping: v,
                        // 选择「否」时清空运费相关字段
                        ...(v === "no" ? { shippingFee: "", logisticsSupplierId: "", logisticsSupplierName: "" } : {}),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">是</SelectItem>
                      <SelectItem value="no">否</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* 含运费时展开：物流供应商 + 运费 */}
              {formData.hasShipping === "yes" && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="space-y-2 col-span-3">
                    <Label>物流供应商</Label>
                    <Select
                      value={formData.logisticsSupplierId}
                      onValueChange={(v) => {
                        const supplier = logisticsSuppliers.find((s: any) => String(s.id) === v);
                        setFormData((p) => ({
                          ...p,
                          logisticsSupplierId: v,
                          logisticsSupplierName: supplier ? supplier.name : "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择物流供应商" />
                      </SelectTrigger>
                      <SelectContent>
                        {logisticsSuppliers.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>运费（元）</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="请输入运费金额"
                      value={formData.shippingFee}
                      onChange={(e) => setFormData((p) => ({ ...p, shippingFee: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 关联销售订单（仅销售出库显示） */}
            {formData.type === "sales_out" && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-3">关联销售订单</h3>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={
                        formData.relatedOrderId
                          ? (() => {
                              const o = salesOrderList.find(
                                (x) => x.id === Number(formData.relatedOrderId)
                              );
                              return o
                                ? `${o.orderNo}${o.customerName ? ` - ${o.customerName}` : ""}`
                                : `#${formData.relatedOrderId}`;
                            })()
                          : ""
                      }
                      placeholder="点击右侧按钮选择销售订单，选择后自动加载产品明细"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSoDialogOpen(true)}
                    >
                      选择订单
                    </Button>
                    {formData.relatedOrderId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFormData((p) => ({ ...p, relatedOrderId: "" }));
                          setDetailLines([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* ==================== 出库明细表 ==================== */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">出库明细 <span className="text-destructive">*</span></h3>
                {formData.type !== "sales_out" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailLines((prev) => [
                        ...prev,
                        {
                          key: `manual-${Date.now()}`,
                          productId: 0,
                          productCode: "",
                          productName: "",
                          specification: "",
                          unit: "",
                          orderQty: 0,
                          deliveredQty: 0,
                          outboundQty: "",
                          batchNo: "",
                          sterilizationBatchNo: "",
                          isMedicalDevice: false,
                          isSterilized: false,
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />添加明细
                  </Button>
                )}
              </div>

              {detailLines.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  {formData.type === "sales_out"
                    ? "请先选择销售订单，系统将自动加载订单产品明细"
                    : "请点击「添加明细」按钮添加出库物料"}
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[50px]">序号</TableHead>
                        {formData.type !== "sales_out" && (
                          <TableHead className="min-w-[160px]">产品 <span className="text-destructive">*</span></TableHead>
                        )}
                        {formData.type === "sales_out" && (
                          <TableHead>产品编码</TableHead>
                        )}
                        <TableHead>产品名称</TableHead>
                        <TableHead>规格型号</TableHead>
                        <TableHead>单位</TableHead>
                        {formData.type === "sales_out" && (
                          <>
                            <TableHead className="text-right">订单数量</TableHead>
                            <TableHead className="text-right">已发数量</TableHead>
                          </>
                        )}
                        <TableHead className="min-w-[100px]">
                          批号
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          灭菌批号
                          <span className="text-xs text-muted-foreground ml-1">(灭菌器械必填)</span>
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                          出库数量 <span className="text-destructive">*</span>
                        </TableHead>
                        <TableHead className="w-[50px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailLines.map((line, idx) => {
                        const batchOptions = line.productId && formData.warehouseId
                          ? getBatchOptions(line.productId, Number(formData.warehouseId))
                          : [];
                        return (
                          <TableRow key={line.key}>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {idx + 1}
                            </TableCell>

                            {/* 非销售出库：手动选择产品 */}
                            {formData.type !== "sales_out" && (
                              <TableCell>
                                <Select
                                  value={line.productId ? String(line.productId) : ""}
                                  onValueChange={(v) => {
                                    const product = productsById.get(Number(v));
                                    if (product) {
                                      setDetailLines((prev) =>
                                        prev.map((l) =>
                                          l.key === line.key
                                            ? {
                                                ...l,
                                                productId: product.id,
                                                productCode: product.code,
                                                productName: product.name,
                                                specification: product.specification || "",
                                                unit: product.unit || "",
                                                isMedicalDevice: product.isMedicalDevice,
                                                isSterilized: product.isSterilized,
                                                // 切换产品时清空灭菌批号
                                                sterilizationBatchNo: "",
                                              }
                                            : l
                                        )
                                      );
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
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
                              </TableCell>
                            )}

                            {/* 销售出库：显示产品编码 */}
                            {formData.type === "sales_out" && (
                              <TableCell className="text-sm font-mono">{line.productCode}</TableCell>
                            )}

                            <TableCell className="text-sm font-medium">{line.productName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{line.specification || "-"}</TableCell>
                            <TableCell className="text-sm">{line.unit || "-"}</TableCell>

                            {formData.type === "sales_out" && (
                              <>
                                <TableCell className="text-right text-sm">{line.orderQty}</TableCell>
                                <TableCell className="text-right text-sm">{line.deliveredQty}</TableCell>
                              </>
                            )}

                            {/* 批号选择 */}
                            <TableCell>
                              {batchOptions.length > 0 ? (
                                <Select
                                  value={line.batchNo}
                                  onValueChange={(v) => updateDetailLine(line.key, "batchNo", v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="选择批号" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {batchOptions.map((inv: any) => (
                                      <SelectItem key={inv.id} value={inv.batchNo || `inv-${inv.id}`}>
                                        {inv.batchNo || `批次${inv.id}`}
                                        {` (库存: ${formatDisplayNumber(inv.quantity)})`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  className="h-8 text-xs"
                                  value={line.batchNo}
                                  onChange={(e) => updateDetailLine(line.key, "batchNo", e.target.value)}
                                  placeholder="输入批号"
                                />
                              )}
                            </TableCell>

                            {/* 灭菌批号（仅当产品是医疗器械且需灭菌时显示） */}
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

                            {/* 出库数量 */}
                            <TableCell>
                              {(() => {
                                const outQty = parseFloat(line.outboundQty) || 0;
                                // 计算可用库存
                                let availableQty: number | null = null;
                                let stockLabel = "";
                                if (line.productId && formData.warehouseId) {
                                  const opts = getBatchOptions(line.productId, Number(formData.warehouseId));
                                  if (opts.length > 0) {
                                    if (line.batchNo) {
                                      const matched = opts.find((inv: any) => (inv.batchNo || `inv-${inv.id}`) === line.batchNo);
                                      if (matched) {
                                        availableQty = parseFloat(String(matched.quantity || "0"));
                                        stockLabel = `库存: ${availableQty}`;
                                      }
                                    } else {
                                      availableQty = opts.reduce((s: number, inv: any) => s + parseFloat(String(inv.quantity || "0")), 0);
                                      stockLabel = `总库存: ${availableQty}`;
                                    }
                                  }
                                }
                                // 订单剩余数量
                                const remainQty = line.orderQty - line.deliveredQty;
                                const overStock = availableQty !== null && outQty > availableQty;
                                const overOrder = formData.type === "sales_out" && outQty > remainQty && remainQty >= 0;
                                return (
                                  <div className="space-y-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      className={`h-8 text-xs w-24 ${
                                        overStock
                                          ? "border-destructive focus-visible:ring-destructive"
                                          : overOrder
                                          ? "border-amber-400 focus-visible:ring-amber-400"
                                          : ""
                                      }`}
                                      value={line.outboundQty}
                                      onChange={(e) => updateDetailLine(line.key, "outboundQty", e.target.value)}
                                      placeholder="数量"
                                    />
                                    {stockLabel && (
                                      <p className={`text-[10px] leading-tight ${
                                        overStock ? "text-destructive font-medium" : "text-muted-foreground"
                                      }`}>
                                        {stockLabel}
                                        {overStock && " ❗库存不足"}
                                      </p>
                                    )}
                                    {overOrder && !overStock && (
                                      <p className="text-[10px] leading-tight text-amber-500 font-medium">
                                        订单剩余 {remainQty} ❗超额
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>

                            {/* 删除 */}
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  setDetailLines((prev) => prev.filter((l) => l.key !== line.key))
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
              {editingRecord ? "保存修改" : "创建出库单"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ==================== 销售订单选择弹窗 ==================== */}
      <DraggableDialog open={soDialogOpen} onOpenChange={setSoDialogOpen} defaultWidth={800} defaultHeight={500}>
        <DraggableDialogContent>
          <DialogHeader>
            <DialogTitle>选择关联销售订单</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索订单号、客户名称..."
              value={soSearch}
              onChange={(e) => setSoSearch(e.target.value)}
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
                {filteredSalesOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      暂无待发货的销售订单
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalesOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleSelectSalesOrder(order)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {order.orderNo}
                      </TableCell>
                      <TableCell className="text-sm">{order.customerName || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusSemanticClass(
                            order.status,
                            getSalesOrderStatusLabel(order.status)
                          )}
                        >
                          {getSalesOrderStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSalesOrder(order);
                          }}
                        >
                          选择
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>
      {/* ==================== 出库单详情对话框框 ==================== */}
      <DraggableDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        defaultWidth={860}
        defaultHeight={680}
      >
        {viewingRecord &&
          (() => {
            const relatedOrder = getRelatedOrder(viewingRecord.relatedOrderId);
            const outboundPrintData = {
              outboundNo: viewingRecord.documentNo || `OUT-${viewingRecord.id}`,
              outboundDate: viewingRecord.createdAt ? formatDateTime(viewingRecord.createdAt).slice(0, 10) : "",
              sourceNo: getRelatedOrderNo(viewingRecord.relatedOrderId),
              outboundType: typeMap[viewingRecord.type] || viewingRecord.type,
              recipientName:
                relatedOrder?.customerName
                || (viewingRecord.type === "production_out" ? "生产部" : "")
                || (viewingRecord.type === "return_out" ? "采购部" : "")
                || "",
              handlerName: "",
              warehouseName: getWarehouseName(viewingRecord.warehouseId),
              items: [
                {
                  materialCode: viewingRecord.productId ? productsById.get(Number(viewingRecord.productId))?.code || "" : "",
                  materialName: viewingRecord.itemName || "",
                  specification: viewingRecord.productId ? productsById.get(Number(viewingRecord.productId))?.specification || "" : "",
                  quantity: Number(viewingRecord.quantity || 0) || 0,
                  unit: viewingRecord.unit || "",
                  batchNo: viewingRecord.batchNo || "",
                  location: getWarehouseName(viewingRecord.warehouseId),
                },
              ],
            };
            const FieldRow = ({
              label,
              children,
            }: {
              label: string;
              children: React.ReactNode;
            }) => (
              <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
                <span className="flex-1 text-sm break-all">{children}</span>
              </div>
            );
            return (
              <div className="px-8 py-6 space-y-5">
                {/* 头部 */}
                <div className="border-b pb-3">
                  <h2 className="text-lg font-semibold">出库单详情</h2>
                  <p className="text-sm text-muted-foreground">
                    {viewingRecord.documentNo || `#${viewingRecord.id}`}
                    {" · "}
                    <Badge variant="outline">
                      {typeMap[viewingRecord.type] || viewingRecord.type}
                    </Badge>
                  </p>
                </div>

                <div className="space-y-5">
                  {/* 基本信息：3 列 */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                      基本信息
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                      <div>
                        <FieldRow label="出库单号">
                          <span className="font-mono">{viewingRecord.documentNo || "-"}</span>
                        </FieldRow>
                        <FieldRow label="出库类型">
                          {typeMap[viewingRecord.type] || viewingRecord.type}
                        </FieldRow>
                        <FieldRow label="出库仓库">
                          {getWarehouseName(viewingRecord.warehouseId)}
                        </FieldRow>
                      </div>
                      <div>
                        <FieldRow label="物料名称">{viewingRecord.itemName}</FieldRow>
                        <FieldRow label="批次号">{viewingRecord.batchNo || "-"}</FieldRow>
                        <FieldRow label="灭菌批号">
                          {viewingRecord.sterilizationBatchNo || "-"}
                        </FieldRow>
                      </div>
                      <div>
                        <FieldRow label="出库数量">
                          {formatDisplayNumber(viewingRecord.quantity)}{" "}
                          {viewingRecord.unit || ""}
                        </FieldRow>
                        <FieldRow label="变动前库存">
                          {viewingRecord.beforeQty
                            ? `${formatDisplayNumber(viewingRecord.beforeQty)} ${viewingRecord.unit || ""}`
                            : "-"}
                        </FieldRow>
                        <FieldRow label="变动后库存">
                          {viewingRecord.afterQty
                            ? `${formatDisplayNumber(viewingRecord.afterQty)} ${viewingRecord.unit || ""}`
                            : "-"}
                        </FieldRow>
                      </div>
                    </div>
                  </div>

                  {/* 关联销售订单信息 */}
                  {relatedOrder && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                        关联销售订单
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                        <div>
                          <FieldRow label="订单号">
                            <span className="font-mono">{relatedOrder.orderNo}</span>
                          </FieldRow>
                          <FieldRow label="客户名称">
                            {relatedOrder.customerName || "-"}
                          </FieldRow>
                        </div>
                        <div>
                          <FieldRow label="收货联系人">
                            {relatedOrder.shippingContact || "-"}
                          </FieldRow>
                          <FieldRow label="收货电话">
                            {relatedOrder.shippingPhone || "-"}
                          </FieldRow>
                        </div>
                        <div>
                          <FieldRow label="收货地址">
                            {relatedOrder.shippingAddress || "-"}
                          </FieldRow>
                          <FieldRow label="订单状态">
                            <Badge
                              variant="outline"
                              className={getStatusSemanticClass(
                                relatedOrder.status,
                                getSalesOrderStatusLabel(relatedOrder.status)
                              )}
                            >
                              {getSalesOrderStatusLabel(relatedOrder.status)}
                            </Badge>
                          </FieldRow>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 备注 */}
                  {viewingRecord.remark && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                        备注
                      </h3>
                      <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                        {viewingRecord.remark}
                      </p>
                    </div>
                  )}

                  {/* 出库时间 */}
                  <div>
                    <FieldRow label="出库时间">
                      {viewingRecord.createdAt ? formatDateTime(viewingRecord.createdAt) : "-"}
                    </FieldRow>
                  </div>

                  {/* 操作按钮区 */}
                  <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                    <div className="flex gap-2 flex-wrap">
                      <TemplatePrintPreviewButton
                        templateKey="warehouse_out"
                        data={outboundPrintData}
                        title={`出库单打印预览 - ${viewingRecord.documentNo || `#${viewingRecord.id}`}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrintDeliveryOpen(true)}
                      >
                        <Printer className="h-4 w-4 mr-1.5" />打印发货单
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailOpen(false)}
                      >
                        关闭
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailOpen(false);
                          handleEdit(viewingRecord);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1.5" />编辑出库单
                      </Button>

                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </DraggableDialog>

      {/* ==================== 打印发货单 ==================== */}
      {viewingRecord && (
        <DeliveryNotePrint
          open={printDeliveryOpen}
          onClose={() => setPrintDeliveryOpen(false)}
          order={{
            orderNumber: viewingRecord.documentNo || `OUT-${viewingRecord.id}`,
            deliveryDate: viewingRecord.createdAt
              ? new Date(viewingRecord.createdAt).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            customerName: (() => {
              const o = getRelatedOrder(viewingRecord.relatedOrderId);
              return o?.customerName || "-";
            })(),
            shippingAddress: (() => {
              const o = getRelatedOrder(viewingRecord.relatedOrderId);
              return o?.shippingAddress || "";
            })(),
            shippingContact: (() => {
              const o = getRelatedOrder(viewingRecord.relatedOrderId);
              return o?.shippingContact || "";
            })(),
            shippingPhone: (() => {
              const o = getRelatedOrder(viewingRecord.relatedOrderId);
              return o?.shippingPhone || "";
            })(),
            items: [
              {
                productName: viewingRecord.itemName,
                quantity: parseFloat(String(viewingRecord.quantity || 0)),
                unit: viewingRecord.unit || "件",
                batchNumber: viewingRecord.batchNo || undefined,
              },
            ],
            notes: viewingRecord.remark || "",
          }}
        />
      )}
    </ERPLayout>
  );
}
