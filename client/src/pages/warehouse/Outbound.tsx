import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import {
  PackageMinus, Plus, Search, Eye, Edit, Trash2, MoreHorizontal,
  Printer, CheckCircle, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DraggableDialog } from "@/components/DraggableDialog";
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
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DeliveryNotePrint } from "@/components/print";

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

type FormData = {
  documentNo: string;
  type: string;
  relatedOrderId: string;
  productId: string;
  batchNo: string;
  sterilizationBatchNo: string;
  quantity: string;
  unit: string;
  warehouseId: string;
  remark: string;
};

// ==================== 主组件 ====================
export default function OutboundPage() {
  const { canDelete } = usePermission();

  // ---- 对话框状态 ----
  const [formOpen, setFormOpen]               = useState(false);
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
    productId: "",
    batchNo: "",
    sterilizationBatchNo: "",
    quantity: "",
    unit: "",
    warehouseId: "",
    remark: "",
  });

  // ---- 销售订单选择弹窗 ----
  const [soDialogOpen, setSoDialogOpen] = useState(false);
  const [soSearch, setSoSearch]         = useState("");

  // ==================== 数据查询 ====================
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: productList = [] }   = trpc.products.list.useQuery({ limit: 1000 });

  // 销售订单列表（已审批 + 待发货 状态）
  const { data: approvedOrders = [] } = trpc.salesOrders.list.useQuery({ status: "approved", limit: 200 });
  const { data: readyOrders = [] }    = trpc.salesOrders.list.useQuery({ status: "ready_to_ship", limit: 200 });
  const salesOrderList: SalesOrderOption[] = [
    ...(approvedOrders as SalesOrderOption[]),
    ...(readyOrders as SalesOrderOption[]),
  ];

  // 出库记录列表
  const { data: rawData = [], refetch } = trpc.inventoryTransactions.list.useQuery({ limit: 200 });
  const data: OutboundRecord[] = (rawData as OutboundRecord[]).filter((r) =>
    ["sales_out", "production_out", "return_out", "other_out"].includes(r.type)
  );

  const products = (productList as ProductOption[]) || [];
  const productsById = new Map(products.map((p) => [p.id, p]));

  // ==================== Mutations ====================
  const createMutation = trpc.inventoryTransactions.create.useMutation({
    onSuccess: () => { toast.success("出库单已创建"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("创建失败：" + e.message),
  });
  const updateMutation = trpc.inventoryTransactions.update.useMutation({
    onSuccess: () => { toast.success("出库单已更新"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("更新失败：" + e.message),
  });
  const deleteMutation = trpc.inventoryTransactions.delete.useMutation({
    onSuccess: () => { toast.success("出库单已删除"); refetch(); },
    onError: (e) => toast.error("删除失败：" + e.message),
  });
  // 发货确认：更新销售订单状态为 shipped
  const updateSalesOrderMutation = trpc.salesOrders.update.useMutation({
    onSuccess: () => {
      toast.success("发货确认成功，销售订单已更新为已发货");
      refetch();
      setDetailOpen(false);
    },
    onError: (e) => toast.error("发货确认失败：" + e.message),
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
      shipped: "已发货",
      completed: "已完成",
      cancelled: "已取消",
    };
    return map[status] || status;
  };

  // ==================== 表单操作 ====================
  const buildDefaultDocumentNo = () =>
    `OUT-${new Date().getFullYear()}-${String(data.length + 1).padStart(4, "0")}`;

  const resetForm = () => {
    setFormData({
      documentNo: buildDefaultDocumentNo(),
      type: "sales_out",
      relatedOrderId: "",
      productId: "",
      batchNo: "",
      sterilizationBatchNo: "",
      quantity: "",
      unit: "",
      warehouseId: "",
      remark: "",
    });
  };

  const handleAdd = () => {
    setEditingRecord(null);
    resetForm();
    setFormOpen(true);
  };

  const handleEdit = (record: OutboundRecord) => {
    setEditingRecord(record);
    setFormData({
      documentNo: record.documentNo || "",
      type: record.type,
      relatedOrderId: record.relatedOrderId ? String(record.relatedOrderId) : "",
      productId: record.productId ? String(record.productId) : "",
      batchNo: record.batchNo || "",
      sterilizationBatchNo: record.sterilizationBatchNo || "",
      quantity: record.quantity || "",
      unit: record.unit || "",
      warehouseId: record.warehouseId ? String(record.warehouseId) : "",
      remark: record.remark || "",
    });
    setFormOpen(true);
  };

  const handleView = (record: OutboundRecord) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };

  const handleDelete = (record: OutboundRecord) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: record.id });
  };

  // 选择销售订单后自动填充
  const handleSelectSalesOrder = (order: SalesOrderOption) => {
    setSoDialogOpen(false);
    setFormData((prev) => ({
      ...prev,
      relatedOrderId: String(order.id),
    }));
  };

  // 产品变更时自动填充单位
  const handleProductChange = (productId: string) => {
    const product = productsById.get(Number(productId));
    setFormData((prev) => ({
      ...prev,
      productId,
      unit: product?.unit || prev.unit,
    }));
  };

  const handleSubmit = () => {
    if (!formData.productId) { toast.error("请选择物料"); return; }
    if (!formData.warehouseId) { toast.error("请选择出库仓库"); return; }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error("请输入有效的出库数量"); return;
    }
    const selectedProduct = productsById.get(Number(formData.productId));
    if (!selectedProduct) { toast.error("请选择产品库中的物料"); return; }
    if (selectedProduct.isMedicalDevice && !formData.sterilizationBatchNo.trim()) {
      toast.error("医疗器械必须填写灭菌批号"); return;
    }
    const payload = {
      productId: selectedProduct.id,
      warehouseId: Number(formData.warehouseId),
      type: formData.type as any,
      documentNo: formData.documentNo || undefined,
      itemName: selectedProduct.name,
      batchNo: formData.batchNo || undefined,
      sterilizationBatchNo: formData.sterilizationBatchNo || undefined,
      quantity: String(formData.quantity),
      unit: formData.unit || selectedProduct.unit || undefined,
      remark: formData.remark || undefined,
      relatedOrderId: formData.relatedOrderId ? Number(formData.relatedOrderId) : undefined,
    };
    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          documentNo: payload.documentNo,
          productId: payload.productId,
          itemName: payload.itemName,
          batchNo: payload.batchNo,
          sterilizationBatchNo: payload.sterilizationBatchNo,
          quantity: payload.quantity,
          unit: payload.unit,
          remark: payload.remark,
          relatedOrderId: payload.relatedOrderId,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  // 发货确认
  const handleConfirmShipment = (record: OutboundRecord) => {
    if (!record.relatedOrderId) {
      toast.error("该出库单未关联销售订单，无法执行发货确认");
      return;
    }
    updateSalesOrderMutation.mutate({
      id: record.relatedOrderId,
      data: { status: "shipped" },
    });
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

  // ==================== 选中产品信息 ====================
  const selectedProduct = productsById.get(Number(formData.productId));
  const isMedicalDevice = selectedProduct?.isMedicalDevice ?? false;

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
        <div className="rounded-lg border overflow-hidden">
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
                    {parseFloat(String(record.quantity || 0)).toLocaleString()} {record.unit || ""}
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
                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString("zh-CN") : "-"}
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
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "编辑出库单" : "新建出库单"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 第一行：出库单号 + 出库类型 + 出库仓库 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>出库单号</Label>
                <Input
                  value={formData.documentNo}
                  onChange={(e) => setFormData((p) => ({ ...p, documentNo: e.target.value }))}
                  placeholder="系统自动生成或手动输入"
                />
              </div>
              <div className="space-y-1.5">
                <Label>出库类型 <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, type: v, relatedOrderId: "" }))
                  }
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
              <div className="space-y-1.5">
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
            </div>

            {/* 关联销售订单（仅销售出库显示） */}
            {formData.type === "sales_out" && (
              <div className="space-y-1.5">
                <Label>关联销售订单</Label>
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
                    placeholder="点击右侧按钮选择销售订单"
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
                      onClick={() => setFormData((p) => ({ ...p, relatedOrderId: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 第二行：物料名称 + 批次号 + 灭菌批号（医疗器械） */}
            <div className={`grid gap-4 ${isMedicalDevice ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-1.5">
                <Label>物料名称 <span className="text-destructive">*</span></Label>
                <Select value={formData.productId} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        products.length > 0 ? "请选择产品库物料" : "请先在产品管理维护产品"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.code} - {p.name}
                        {p.specification ? `（${p.specification}）` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>批次号</Label>
                <Input
                  value={formData.batchNo}
                  onChange={(e) => setFormData((p) => ({ ...p, batchNo: e.target.value }))}
                  placeholder="请输入批次号"
                />
              </div>
              {isMedicalDevice && (
                <div className="space-y-1.5">
                  <Label>灭菌批号 <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.sterilizationBatchNo}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sterilizationBatchNo: e.target.value }))
                    }
                    placeholder="医疗器械必填"
                  />
                </div>
              )}
            </div>

            {/* 第三行：数量 + 单位 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>出库数量 <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                  placeholder="请输入出库数量"
                />
              </div>
              <div className="space-y-1.5">
                <Label>单位</Label>
                <Input
                  value={formData.unit}
                  readOnly
                  placeholder="自动从产品带入"
                  className="bg-muted/50"
                />
              </div>
            </div>

            {/* 备注 */}
            <div className="space-y-1.5">
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
        </DialogContent>
      </Dialog>

      {/* ==================== 销售订单选择弹窗 ==================== */}
      <Dialog open={soDialogOpen} onOpenChange={setSoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
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
        </DialogContent>
      </Dialog>

      {/* ==================== 出库单详情对话框 ==================== */}
      <DraggableDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        defaultWidth={860}
        defaultHeight={680}
      >
        {viewingRecord &&
          (() => {
            const relatedOrder = getRelatedOrder(viewingRecord.relatedOrderId);
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
                          {parseFloat(String(viewingRecord.quantity || 0)).toLocaleString()}{" "}
                          {viewingRecord.unit || ""}
                        </FieldRow>
                        <FieldRow label="变动前库存">
                          {viewingRecord.beforeQty
                            ? `${parseFloat(viewingRecord.beforeQty).toLocaleString()} ${viewingRecord.unit || ""}`
                            : "-"}
                        </FieldRow>
                        <FieldRow label="变动后库存">
                          {viewingRecord.afterQty
                            ? `${parseFloat(viewingRecord.afterQty).toLocaleString()} ${viewingRecord.unit || ""}`
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
                      {viewingRecord.createdAt
                        ? new Date(viewingRecord.createdAt).toLocaleString("zh-CN")
                        : "-"}
                    </FieldRow>
                  </div>

                  {/* 操作按钮区 */}
                  <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                    <div className="flex gap-2 flex-wrap">
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
                      {/* 发货确认：仅当关联了销售订单且订单尚未发货时显示 */}
                      {viewingRecord.relatedOrderId &&
                        relatedOrder &&
                        relatedOrder.status !== "shipped" &&
                        relatedOrder.status !== "completed" &&
                        relatedOrder.status !== "cancelled" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleConfirmShipment(viewingRecord)}
                            disabled={updateSalesOrderMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />发货确认
                          </Button>
                        )}
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
