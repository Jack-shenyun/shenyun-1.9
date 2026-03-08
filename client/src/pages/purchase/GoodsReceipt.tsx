import { useState, useEffect } from "react";
import ERPLayout from "@/components/ERPLayout";
import {
  PackageCheck, Plus, Search, Eye, Trash2, MoreHorizontal, X,
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

// ==================== 类型 ====================
type ReceiptLine = {
  key: string;
  itemId: number;
  productId: number;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;       // 历史已收货数量
  pendingQty: number;        // 待收货数量
  thisReceiptQty: string;    // 本次到货数量
  batchNo: string;
  sterilizationBatchNo: string;
  isMedicalDevice: boolean;
  isSterilized: boolean;
};

type FormData = {
  documentNo: string;
  orderId: string;
  orderNo: string;
  supplierName: string;
  warehouseId: string;
  receiptDate: string;
  remark: string;
};

// ==================== 主组件 ====================
export default function GoodsReceiptPage() {
  const { canDelete } = usePermission();

  // ---- 对话框状态 ----
  const [formOpen, setFormOpen]             = useState(false);
  const [formMaximized, setFormMaximized]   = useState(false);
  const [detailOpen, setDetailOpen]         = useState(false);
  const [viewingRecord, setViewingRecord]   = useState<any | null>(null);

  // ---- 搜索 ----
  const [searchText, setSearchText] = useState("");

  // ---- 表单状态 ----
  const [formData, setFormData] = useState<FormData>({
    documentNo: "",
    orderId: "",
    orderNo: "",
    supplierName: "",
    warehouseId: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    remark: "",
  });
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);

  // ---- 采购订单选择弹窗 ----
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [poSearch, setPoSearch]         = useState("");

  // ==================== 数据查询 ====================
  const { data: warehouseList = [] }  = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: productList = [] }    = trpc.products.list.useQuery({ limit: 1000 });

  // 入库记录（purchase_in 类型，用于展示到货历史）
  const { data: rawTx = [], refetch } = trpc.inventoryTransactions.list.useQuery({ limit: 500 });
  const receiptHistory = (rawTx as any[]).filter((r) => r.type === "purchase_in");

  // 采购订单（可到货状态）
  const { data: poApproved = [] }        = trpc.purchaseOrders.list.useQuery({ status: "approved", limit: 200 });
  const { data: poOrdered = [] }         = trpc.purchaseOrders.list.useQuery({ status: "ordered", limit: 200 });
  const { data: poPartial = [] }         = trpc.purchaseOrders.list.useQuery({ status: "partial_received", limit: 200 });
  const availablePOs = [...(poApproved as any[]), ...(poOrdered as any[]), ...(poPartial as any[])];

  const products = (productList as any[]);
  const productsById = new Map(products.map((p: any) => [p.id, p]));

  // 选中采购订单详情
  const selectedPoId = formData.orderId ? Number(formData.orderId) : null;
  const { data: poDetail } = trpc.purchaseOrders.getById.useQuery(
    { id: selectedPoId! },
    { enabled: !!selectedPoId }
  );

  // 采购订单选择后自动加载明细行
  useEffect(() => {
    if (poDetail?.items && selectedPoId) {
      const lines: ReceiptLine[] = (poDetail.items as any[]).map((item: any, idx: number) => {
        const product = item.productId ? productsById.get(Number(item.productId)) : null;
        const ordered = parseFloat(item.quantity || "0");
        const received = parseFloat(item.receivedQty || "0");
        const pending = Math.max(0, ordered - received);
        return {
          key: `po-${selectedPoId}-${item.id || idx}`,
          itemId: item.id || 0,
          productId: item.productId ? Number(item.productId) : 0,
          materialCode: item.materialCode || product?.code || "",
          materialName: item.materialName || product?.name || "",
          specification: item.specification || product?.specification || "",
          unit: item.unit || product?.unit || "",
          orderedQty: ordered,
          receivedQty: received,
          pendingQty: pending,
          thisReceiptQty: String(pending),
          batchNo: "",
          sterilizationBatchNo: "",
          isMedicalDevice: product?.isMedicalDevice ?? false,
          isSterilized: product?.isSterilized ?? false,
        };
      });
      setReceiptLines(lines);
    }
  }, [poDetail, selectedPoId]);

  // ==================== Mutations ====================
  const createMutation = trpc.inventoryTransactions.create.useMutation({
    onSuccess: () => {},
    onError: (e) => toast.error("创建失败：" + e.message),
  });
  const deleteMutation = trpc.inventoryTransactions.delete.useMutation({
    onSuccess: () => { toast.success("到货记录已删除"); refetch(); },
    onError: (e) => toast.error("删除失败：" + e.message),
  });
  const syncReceiptMutation = trpc.purchaseOrders.syncReceiptStatus.useMutation({
    onError: (e) => console.warn("同步收货状态失败：", e.message),
  });

  // ==================== 辅助函数 ====================
  const getWarehouseName = (warehouseId: number) => {
    const wh = (warehouseList as any[]).find((w: any) => w.id === warehouseId);
    return wh ? wh.name : `仓库${warehouseId}`;
  };

  const buildDefaultDocumentNo = () => {
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    return `GR-${ymd}-${String(receiptHistory.length + 1).padStart(3, "0")}`;
  };

  const resetForm = () => {
    setFormData({
      documentNo: buildDefaultDocumentNo(),
      orderId: "",
      orderNo: "",
      supplierName: "",
      warehouseId: "",
      receiptDate: new Date().toISOString().slice(0, 10),
      remark: "",
    });
    setReceiptLines([]);
  };

  // ==================== 表单操作 ====================
  const handleAdd = () => {
    resetForm();
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
        if (record.relatedOrderId) {
          syncReceiptMutation.mutate({ orderId: record.relatedOrderId });
        }
      },
    });
  };

  // 选择采购订单
  const handleSelectPO = (order: any) => {
    setPoDialogOpen(false);
    setFormData((prev) => ({
      ...prev,
      orderId: String(order.id),
      orderNo: order.orderNo || "",
      supplierName: order.supplierName || "",
    }));
  };

  // 更新明细行
  const updateLine = (key: string, field: keyof ReceiptLine, value: string) => {
    setReceiptLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, [field]: value } : line))
    );
  };

  const handleSubmit = () => {
    if (!formData.warehouseId) { toast.error("请选择入库仓库"); return; }
    if (!formData.orderId) { toast.error("请选择采购订单"); return; }

    const validLines = receiptLines.filter((line) => parseFloat(line.thisReceiptQty) > 0);
    if (validLines.length === 0) { toast.error("请至少填写一条到货数量"); return; }

    for (const line of validLines) {
      if (line.isMedicalDevice && line.isSterilized && !line.sterilizationBatchNo.trim()) {
        toast.error(`${line.materialName} 为需灭菌医疗器械，必须填写灭菌批号`);
        return;
      }
    }

    let successCount = 0;
    let errorCount = 0;
    const total = validLines.length;

    validLines.forEach((line, idx) => {
      const docNo = total > 1
        ? `${formData.documentNo}-${String(idx + 1).padStart(2, "0")}`
        : formData.documentNo;

      createMutation.mutate({
        productId: line.productId || undefined,
        warehouseId: Number(formData.warehouseId),
        type: "purchase_in",
        documentNo: docNo,
        itemName: line.materialName,
        batchNo: line.batchNo || undefined,
        sterilizationBatchNo: line.sterilizationBatchNo || undefined,
        quantity: String(line.thisReceiptQty),
        unit: line.unit || undefined,
        remark: formData.remark || undefined,
        relatedOrderId: Number(formData.orderId),
      }, {
        onSuccess: () => {
          successCount++;
          if (successCount + errorCount === total) {
            // 同步采购订单收货状态
            syncReceiptMutation.mutate({ orderId: Number(formData.orderId) }, {
              onSettled: () => { refetch(); },
            });
            setFormOpen(false);
            if (errorCount > 0) toast.warning(`${successCount} 条到货成功，${errorCount} 条失败`);
            else toast.success(`到货单已创建，共 ${successCount} 条明细`);
          }
        },
        onError: () => {
          errorCount++;
          if (successCount + errorCount === total) {
            refetch();
            if (successCount > 0) toast.warning(`${successCount} 条到货成功，${errorCount} 条失败`);
          }
        },
      });
    });
  };

  // ==================== 过滤数据 ====================
  const filteredHistory = receiptHistory.filter((r) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (r.documentNo || "").toLowerCase().includes(q) ||
      r.itemName.toLowerCase().includes(q);
  });

  const filteredPO = availablePOs.filter((o: any) => {
    if (!poSearch) return true;
    const q = poSearch.toLowerCase();
    return (o.orderNo || "").toLowerCase().includes(q) ||
      (o.supplierName || "").toLowerCase().includes(q);
  });

  const poStatusMap: Record<string, string> = {
    approved: "已审批",
    ordered: "已下单",
    partial_received: "部分收货",
  };

  // ==================== 渲染 ====================
  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">采购到货</h1>
              <p className="text-sm text-muted-foreground">基于采购订单创建到货记录，自动同步收货数量和订单状态</p>
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />新建到货单
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "到货记录总数", value: receiptHistory.length },
            { label: "待收货订单", value: availablePOs.length },
            { label: "今日到货", value: receiptHistory.filter((r: any) => {
              const d = new Date(r.createdAt);
              const today = new Date();
              return d.toDateString() === today.toDateString();
            }).length },
            { label: "本月到货", value: receiptHistory.filter((r: any) => {
              const d = new Date(r.createdAt);
              const now = new Date();
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* 搜索 */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索到货单号、物料名称..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 到货记录列表 */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>到货单号</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead>批次号</TableHead>
                <TableHead>灭菌批号</TableHead>
                <TableHead className="text-right">到货数量</TableHead>
                <TableHead>入库仓库</TableHead>
                <TableHead>关联采购订单</TableHead>
                <TableHead>到货时间</TableHead>
                <TableHead className="w-[60px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    暂无到货记录
                  </TableCell>
                </TableRow>
              ) : filteredHistory.map((record: any) => (
                <TableRow
                  key={record.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => handleView(record)}
                >
                  <TableCell className="font-mono text-sm">{record.documentNo || "-"}</TableCell>
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

      {/* ==================== 新建到货单弹窗 ==================== */}
      <DraggableDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultWidth={960}
        defaultHeight={740}
        isMaximized={formMaximized}
        onMaximizedChange={setFormMaximized}
      >
        <DraggableDialogContent isMaximized={formMaximized}>
          <DialogHeader>
            <DialogTitle>新建到货单</DialogTitle>
            {formData.documentNo && (
              <p className="text-sm text-muted-foreground">单据号：{formData.documentNo}</p>
            )}
          </DialogHeader>

          <div className="space-y-6 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-medium mb-3">基本信息</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>到货单号</Label>
                  <Input
                    value={formData.documentNo}
                    onChange={(e) => setFormData((p) => ({ ...p, documentNo: e.target.value }))}
                    placeholder="系统自动生成"
                  />
                </div>
                <div className="space-y-2">
                  <Label>到货日期</Label>
                  <Input
                    type="date"
                    value={formData.receiptDate}
                    onChange={(e) => setFormData((p) => ({ ...p, receiptDate: e.target.value }))}
                  />
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
              </div>

              {/* 采购订单选择 */}
              <div className="mt-4 space-y-2">
                <Label>关联采购订单 <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {formData.orderId ? (
                      <span className="font-medium">
                        {formData.orderNo}
                        {formData.supplierName && (
                          <span className="text-muted-foreground ml-2">（{formData.supplierName}）</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">尚未选择采购订单</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setPoSearch(""); setPoDialogOpen(true); }}
                  >
                    选择采购订单
                  </Button>
                  {formData.orderId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData((p) => ({ ...p, orderId: "", orderNo: "", supplierName: "" }));
                        setReceiptLines([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 到货明细 */}
            <div>
              <h3 className="text-sm font-medium mb-3">到货明细</h3>
              {receiptLines.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                  请先选择采购订单，系统将自动带入物料明细
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">物料编码</TableHead>
                        <TableHead className="text-xs">物料名称</TableHead>
                        <TableHead className="text-xs">规格</TableHead>
                        <TableHead className="text-xs">单位</TableHead>
                        <TableHead className="text-xs text-right">订单数量</TableHead>
                        <TableHead className="text-xs text-right">已收货</TableHead>
                        <TableHead className="text-xs text-right">待收货</TableHead>
                        <TableHead className="text-xs">批次号</TableHead>
                        <TableHead className="text-xs">灭菌批号</TableHead>
                        <TableHead className="text-xs">本次到货数量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptLines.map((line) => (
                        <TableRow key={line.key}>
                          <TableCell className="text-sm font-mono">{line.materialCode || "-"}</TableCell>
                          <TableCell className="text-sm font-medium">{line.materialName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{line.specification || "-"}</TableCell>
                          <TableCell className="text-sm">{line.unit || "-"}</TableCell>
                          <TableCell className="text-right text-sm">{line.orderedQty}</TableCell>
                          <TableCell className="text-right text-sm text-green-600">{line.receivedQty}</TableCell>
                          <TableCell className="text-right text-sm text-amber-600 font-medium">{line.pendingQty}</TableCell>

                          {/* 批次号 */}
                          <TableCell>
                            <Input
                              className="h-8 text-xs w-28"
                              value={line.batchNo}
                              onChange={(e) => updateLine(line.key, "batchNo", e.target.value)}
                              placeholder="输入批次号"
                            />
                          </TableCell>

                          {/* 灭菌批号 */}
                          <TableCell>
                            {line.isMedicalDevice && line.isSterilized ? (
                              <Input
                                className="h-8 text-xs w-28"
                                value={line.sterilizationBatchNo}
                                onChange={(e) => updateLine(line.key, "sterilizationBatchNo", e.target.value)}
                                placeholder="灭菌批号 *"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* 本次到货数量 */}
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                min="0"
                                className="h-8 text-xs w-24"
                                value={line.thisReceiptQty}
                                onChange={(e) => updateLine(line.key, "thisReceiptQty", e.target.value)}
                                placeholder="数量"
                              />
                              {line.pendingQty > 0 && parseFloat(line.thisReceiptQty) > line.pendingQty && (
                                <p className="text-[10px] text-amber-500">超出待收量</p>
                              )}
                            </div>
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
              disabled={createMutation.isPending}
            >
              确认到货
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
              value={poSearch}
              onChange={(e) => setPoSearch(e.target.value)}
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
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPO.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无待收货的采购订单
                    </TableCell>
                  </TableRow>
                ) : filteredPO.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleSelectPO(order)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{order.orderNo}</TableCell>
                    <TableCell className="text-sm">{order.supplierName || "-"}</TableCell>
                    <TableCell className="text-sm">{formatDate(order.orderDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(order.expectedDate) || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {order.totalAmount
                        ? `${order.currency || "CNY"} ${parseFloat(order.totalAmount).toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {poStatusMap[order.status as string] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleSelectPO(order)}>
                        选择
                      </Button>
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
              <DialogTitle>到货详情 - {viewingRecord.documentNo || viewingRecord.id}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {[
                { label: "到货单号", value: viewingRecord.documentNo || "-" },
                { label: "物料名称", value: viewingRecord.itemName },
                { label: "批次号", value: viewingRecord.batchNo || "-" },
                { label: "灭菌批号", value: viewingRecord.sterilizationBatchNo || "-" },
                { label: "到货数量", value: `${parseFloat(String(viewingRecord.quantity || 0)).toLocaleString()} ${viewingRecord.unit || ""}` },
                { label: "入库仓库", value: getWarehouseName(viewingRecord.warehouseId) },
                { label: "关联采购订单", value: viewingRecord.relatedOrderId ? `#${viewingRecord.relatedOrderId}` : "-" },
                { label: "到货时间", value: formatDateTime(viewingRecord.createdAt) },
                { label: "备注", value: viewingRecord.remark || "-" },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ERPLayout>
  );
}
