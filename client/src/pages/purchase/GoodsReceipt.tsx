import { useState, useEffect } from "react";
import ERPLayout from "@/components/ERPLayout";
import {
  PackageCheck, Plus, Search, Eye, Trash2, MoreHorizontal, CheckCircle, XCircle, ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate } from "@/lib/formatters";

// ==================== 类型 ====================
type ReceiptLine = {
  key: string;
  purchaseOrderItemId?: number;
  productId?: number;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  orderedQty: number;
  alreadyReceivedQty: number;
  pendingQty: number;
  thisReceiptQty: string;
  batchNo: string;
  sterilizationBatchNo: string;
  isMedicalDevice: boolean;
  isSterilized: boolean;
};

type FormData = {
  receiptNo: string;
  purchaseOrderId: number | null;
  purchaseOrderNo: string;
  supplierId: number | null;
  supplierName: string;
  warehouseId: number | null;
  receiptDate: string;
  remark: string;
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_inspection: { label: "待质检", variant: "secondary" },
  inspecting:        { label: "质检中", variant: "default" },
  passed:            { label: "质检合格", variant: "default" },
  failed:            { label: "质检不合格", variant: "destructive" },
  warehoused:        { label: "已入库", variant: "outline" },
};

// ==================== 主组件 ====================
export default function GoodsReceiptPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 新建弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    receiptNo: "", purchaseOrderId: null, purchaseOrderNo: "",
    supplierId: null, supplierName: "", warehouseId: null,
    receiptDate: new Date().toISOString().slice(0, 10), remark: "",
  });
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 选择采购订单弹窗
  const [showPoDialog, setShowPoDialog] = useState(false);
  const [poSearch, setPoSearch] = useState("");

  // 详情弹窗
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // 质检弹窗
  const [inspectId, setInspectId] = useState<number | null>(null);
  const [showInspect, setShowInspect] = useState(false);
  const [inspectForm, setInspectForm] = useState({
    inspectorName: "",
    inspectionDate: new Date().toISOString().slice(0, 10),
    inspectionRemark: "",
    items: [] as Array<{ qualifiedQty: string; unqualifiedQty: string }>,
  });

  // ==================== 数据查询 ====================
  const { data: receiptList = [], refetch } = trpc.goodsReceipts.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    limit: 200,
  });
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: productList = [] } = trpc.products.list.useQuery({ limit: 1000 });
  const { data: poApproved = [] } = trpc.purchaseOrders.list.useQuery({ status: "approved", limit: 200 });
  const { data: poOrdered = [] } = trpc.purchaseOrders.list.useQuery({ status: "ordered", limit: 200 });
  const { data: poPartial = [] } = trpc.purchaseOrders.list.useQuery({ status: "partial_received", limit: 200 });
  const { data: poDetail } = trpc.purchaseOrders.getById.useQuery(
    { id: formData.purchaseOrderId! },
    { enabled: !!formData.purchaseOrderId }
  );
  const { data: detailData } = trpc.goodsReceipts.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId && showDetail }
  );
  const { data: inspectData } = trpc.goodsReceipts.getById.useQuery(
    { id: inspectId! },
    { enabled: !!inspectId && showInspect }
  );

  const products = productList as any[];
  const productsById = new Map(products.map((p: any) => [p.id, p]));

  const createMutation = trpc.goodsReceipts.create.useMutation({
    onSuccess: () => {
      toast.success("到货单创建成功，已通知质量部检验");
      refetch();
      resetForm();
      setShowCreate(false);
      setSubmitting(false);
    },
    onError: (e) => { toast.error("创建失败：" + e.message); setSubmitting(false); },
  });
  const updateMutation = trpc.goodsReceipts.update.useMutation({
    onSuccess: () => { toast.success("质检登记成功"); refetch(); setShowInspect(false); },
    onError: (e) => toast.error("操作失败：" + e.message),
  });
  const deleteMutation = trpc.goodsReceipts.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
    onError: (e) => toast.error("删除失败：" + e.message),
  });

  // ==================== 采购订单列表 ====================
  const allPOs = [...(poApproved as any[]), ...(poOrdered as any[]), ...(poPartial as any[])];
  const filteredPOs = allPOs.filter((po) => {
    if (!poSearch) return true;
    const s = poSearch.toLowerCase();
    return (po.orderNo ?? "").toLowerCase().includes(s) ||
      ((po as any).supplierName ?? "").toLowerCase().includes(s);
  });

  // ==================== 选择采购订单 ====================
  function handleSelectPO(po: any) {
    setFormData((prev) => ({
      ...prev,
      purchaseOrderId: po.id,
      purchaseOrderNo: po.orderNo,
      supplierId: po.supplierId ?? null,
      supplierName: (po as any).supplierName ?? "",
    }));
    setLines([]); // 清空旧明细，等 poDetail 加载后自动填充
    setShowPoDialog(false);
    setPoSearch("");
  }

  // 当 poDetail 加载后自动填充明细行
  useEffect(() => {
    if (!poDetail || !formData.purchaseOrderId) return;
    const items = (poDetail as any).items ?? [];
    const newLines: ReceiptLine[] = items.map((item: any, idx: number) => {
      const product = item.productId ? productsById.get(Number(item.productId)) : null;
      const ordered = Number(item.quantity ?? 0);
      const received = Number(item.receivedQty ?? 0);
      const pending = Math.max(0, ordered - received);
      return {
        key: `line-${idx}`,
        purchaseOrderItemId: item.id,
        productId: item.productId ? Number(item.productId) : undefined,
        materialCode: item.materialCode ?? product?.code ?? "",
        materialName: item.materialName ?? product?.name ?? "",
        specification: item.specification ?? product?.specification ?? "",
        unit: item.unit ?? product?.unit ?? "",
        orderedQty: ordered,
        alreadyReceivedQty: received,
        pendingQty: pending,
        thisReceiptQty: String(pending),
        batchNo: "",
        sterilizationBatchNo: "",
        isMedicalDevice: product?.isMedicalDevice ?? false,
        isSterilized: product?.isSterilized ?? false,
      };
    });
    setLines(newLines);
  }, [poDetail?.order?.id, formData.purchaseOrderId]);

  function resetForm() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const seq = String((receiptList as any[]).length + 1).padStart(4, "0");
    setFormData({
      receiptNo: `GR-${y}${m}${d}-${seq}`,
      purchaseOrderId: null, purchaseOrderNo: "",
      supplierId: null, supplierName: "", warehouseId: null,
      receiptDate: now.toISOString().slice(0, 10), remark: "",
    });
    setLines([]);
  }

  function openCreate() {
    resetForm();
    setShowCreate(true);
  }

  // ==================== 提交 ====================
  function handleSubmit() {
    if (!formData.purchaseOrderId) return toast.error("请选择采购订单");
    if (!formData.warehouseId) return toast.error("请选择到货仓库");
    if (!formData.receiptDate) return toast.error("请填写到货日期");
    if (lines.length === 0) return toast.error("请先选择采购订单以加载明细");
    const validLines = lines.filter((l) => Number(l.thisReceiptQty) > 0);
    if (validLines.length === 0) return toast.error("请填写本次到货数量");
    for (const l of validLines) {
      if (l.isMedicalDevice && l.isSterilized && !l.sterilizationBatchNo) {
        return toast.error(`${l.materialName} 需填写灭菌批号`);
      }
    }
    setSubmitting(true);
    createMutation.mutate({
      receiptNo: formData.receiptNo,
      purchaseOrderId: formData.purchaseOrderId!,
      purchaseOrderNo: formData.purchaseOrderNo,
      supplierId: formData.supplierId ?? undefined,
      supplierName: formData.supplierName || undefined,
      warehouseId: formData.warehouseId!,
      receiptDate: formData.receiptDate,
      remark: formData.remark || undefined,
      items: validLines.map((l) => ({
        purchaseOrderItemId: l.purchaseOrderItemId,
        productId: l.productId,
        materialCode: l.materialCode || undefined,
        materialName: l.materialName,
        specification: l.specification || undefined,
        unit: l.unit || undefined,
        orderedQty: String(l.orderedQty),
        receivedQty: l.thisReceiptQty,
        batchNo: l.batchNo || undefined,
        sterilizationBatchNo: l.sterilizationBatchNo || undefined,
      })),
    });
  }

  // ==================== 质检提交 ====================
  function openInspect(id: number) {
    setInspectId(id);
    setInspectForm({
      inspectorName: "",
      inspectionDate: new Date().toISOString().slice(0, 10),
      inspectionRemark: "",
      items: [],
    });
    setShowInspect(true);
  }

  function handleInspectSubmit(result: "pass" | "fail") {
    if (!inspectId) return;
    if (!inspectForm.inspectorName) return toast.error("请填写质检员姓名");
    const items = (inspectData as any)?.items ?? [];
    updateMutation.mutate({
      id: inspectId,
      status: result === "pass" ? "passed" : "failed",
      inspectorName: inspectForm.inspectorName,
      inspectionDate: inspectForm.inspectionDate,
      inspectionResult: result,
      inspectionRemark: inspectForm.inspectionRemark || undefined,
      items: items.map((item: any, idx: number) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        orderedQty: String(item.orderedQty),
        receivedQty: String(item.receivedQty),
        batchNo: item.batchNo,
        sterilizationBatchNo: item.sterilizationBatchNo,
        qualifiedQty: inspectForm.items[idx]?.qualifiedQty ?? String(item.receivedQty),
        unqualifiedQty: inspectForm.items[idx]?.unqualifiedQty ?? "0",
      })),
    });
  }

  // ==================== 统计 ====================
  const rl = receiptList as any[];
  const stats = {
    total: rl.length,
    pending: rl.filter((r) => r.status === "pending_inspection").length,
    passed: rl.filter((r) => r.status === "passed").length,
    warehoused: rl.filter((r) => r.status === "warehoused").length,
  };

  // ==================== 渲染 ====================
  return (
    <ERPLayout>
      <div className="p-6 space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PackageCheck className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold">采购到货管理</h1>
              <p className="text-sm text-gray-500">记录采购到货，通知质量部检验，合格后方可入库</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> 新建到货单
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "到货单总数", value: stats.total, color: "text-gray-700" },
            { label: "待质检", value: stats.pending, color: "text-yellow-600" },
            { label: "质检合格", value: stats.passed, color: "text-green-600" },
            { label: "已入库", value: stats.warehoused, color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="搜索到货单号、采购订单号、供应商..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending_inspection">待质检</SelectItem>
              <SelectItem value="inspecting">质检中</SelectItem>
              <SelectItem value="passed">质检合格</SelectItem>
              <SelectItem value="failed">质检不合格</SelectItem>
              <SelectItem value="warehoused">已入库</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 列表 */}
        <div className="bg-white rounded-lg border overflow-x-auto" style={{WebkitOverflowScrolling:'touch'}}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>到货单号</TableHead>
                <TableHead>采购订单</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>到货日期</TableHead>
                <TableHead>到货仓库</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>质检员</TableHead>
                <TableHead>质检日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rl.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-400 py-12">暂无到货记录</TableCell>
                </TableRow>
              ) : rl.map((r) => {
                const wh = (warehouseList as any[]).find((w: any) => w.id === r.warehouseId);
                const st = STATUS_MAP[r.status] ?? { label: r.status, variant: "outline" as const };
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.receiptNo}</TableCell>
                    <TableCell className="font-mono text-sm">{r.purchaseOrderNo}</TableCell>
                    <TableCell>{r.supplierName ?? "-"}</TableCell>
                    <TableCell>{formatDate(r.receiptDate)}</TableCell>
                    <TableCell>{wh?.name ?? "-"}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell>{r.inspectorName ?? "-"}</TableCell>
                    <TableCell>{r.inspectionDate ? formatDate(r.inspectionDate) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setDetailId(r.id); setShowDetail(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> 查看详情
                          </DropdownMenuItem>
                          {(r.status === "pending_inspection" || r.status === "inspecting") && (
                            <DropdownMenuItem onClick={() => openInspect(r.id)}>
                              <ClipboardCheck className="w-4 h-4 mr-2" /> 质检登记
                            </DropdownMenuItem>
                          )}
                          {r.status === "pending_inspection" && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => { if (confirm("确认删除此到货单？")) deleteMutation.mutate({ id: r.id }); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> 删除
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
        </div>
      </div>

      {/* ==================== 新建到货单弹窗 ==================== */}
      <DraggableDialog open={showCreate} onOpenChange={setShowCreate} defaultWidth={920} defaultHeight={700}>
        <DraggableDialogContent title="新建到货单">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>到货单号 <span className="text-red-500">*</span></Label>
                  <Input value={formData.receiptNo} onChange={(e) => setFormData((p) => ({ ...p, receiptNo: e.target.value }))} placeholder="GR-20260308-0001" />
                </div>
                <div>
                  <Label>到货日期 <span className="text-red-500">*</span></Label>
                  <Input type="date" value={formData.receiptDate} onChange={(e) => setFormData((p) => ({ ...p, receiptDate: e.target.value }))} />
                </div>
                <div>
                  <Label>采购订单 <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={formData.purchaseOrderNo ? `${formData.purchaseOrderNo}（${formData.supplierName}）` : ""}
                      placeholder="请选择采购订单"
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => setShowPoDialog(true)}>选择订单</Button>
                    {formData.purchaseOrderId && (
                      <Button variant="ghost" size="icon" onClick={() => {
                        setFormData((p) => ({ ...p, purchaseOrderId: null, purchaseOrderNo: "", supplierId: null, supplierName: "" }));
                        setLines([]);
                      }}>
                        <XCircle className="w-4 h-4 text-gray-400" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label>到货仓库 <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.warehouseId ? String(formData.warehouseId) : ""}
                    onValueChange={(v) => setFormData((p) => ({ ...p, warehouseId: Number(v) }))}
                  >
                    <SelectTrigger><SelectValue placeholder="请选择仓库" /></SelectTrigger>
                    <SelectContent>
                      {(warehouseList as any[]).map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 明细行 */}
              {lines.length > 0 && (
                <div>
                  <Label className="mb-2 block">到货明细</Label>
                  <div className="border rounded overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>物料名称</TableHead>
                          <TableHead>规格</TableHead>
                          <TableHead className="text-right">订单数量</TableHead>
                          <TableHead className="text-right">已收货</TableHead>
                          <TableHead className="text-right">待收货</TableHead>
                          <TableHead className="w-28">本次到货 <span className="text-red-500">*</span></TableHead>
                          <TableHead>批次号</TableHead>
                          <TableHead>灭菌批号</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, idx) => (
                          <TableRow key={line.key}>
                            <TableCell className="font-medium">{line.materialName}</TableCell>
                            <TableCell className="text-gray-500 text-sm">{line.specification}</TableCell>
                            <TableCell className="text-right">{line.orderedQty} {line.unit}</TableCell>
                            <TableCell className="text-right text-gray-500">{line.alreadyReceivedQty}</TableCell>
                            <TableCell className="text-right text-blue-600">{line.pendingQty}</TableCell>
                            <TableCell>
                              <Input
                                type="number" min="0"
                                className="w-24 text-right"
                                value={line.thisReceiptQty}
                                onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, thisReceiptQty: e.target.value } : l))}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="w-28"
                                placeholder="批次号"
                                value={line.batchNo}
                                onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, batchNo: e.target.value } : l))}
                              />
                            </TableCell>
                            <TableCell>
                              {line.isMedicalDevice && line.isSterilized ? (
                                <Input
                                  className="w-28 border-amber-300 focus:border-amber-500"
                                  placeholder="必填 *"
                                  value={line.sterilizationBatchNo}
                                  onChange={(e) => setLines((prev) => prev.map((l, i) => i === idx ? { ...l, sterilizationBatchNo: e.target.value } : l))}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {formData.purchaseOrderId && lines.length === 0 && (
                <div className="text-center py-6 text-gray-400 border rounded-lg">
                  正在加载采购订单明细...
                </div>
              )}

              <div>
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))} placeholder="到货备注..." rows={2} />
              </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={submitting}>创建到货单</Button>
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ==================== 选择采购订单弹窗 ==================== */}
      <DraggableDialog open={showPoDialog} onOpenChange={setShowPoDialog} defaultWidth={700} defaultHeight={500}>
        <DraggableDialogContent title="选择采购订单">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="搜索订单号、供应商名称..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>订单日期</TableHead>
                    <TableHead>预计到货</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po: any) => (
                    <TableRow key={po.id} className="cursor-pointer hover:bg-blue-50" onClick={() => handleSelectPO(po)}>
                      <TableCell className="font-mono text-sm">{po.orderNo}</TableCell>
                      <TableCell>{(po as any).supplierName ?? "-"}</TableCell>
                      <TableCell>{formatDate(po.orderDate)}</TableCell>
                      <TableCell>{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {po.status === "approved" ? "已审批" : po.status === "ordered" ? "已下单" : "部分收货"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPOs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">暂无可选采购订单</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ==================== 详情弹窗 ==================== */}
      <DraggableDialog open={showDetail} onOpenChange={setShowDetail} defaultWidth={800} defaultHeight={600}>
        <DraggableDialogContent title={`到货单详情 - ${(detailData as any)?.receiptNo ?? ""}`}>
          {detailData && (
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">到货单号：</span>{(detailData as any).receiptNo}</div>
                <div><span className="text-gray-500">采购订单：</span>{(detailData as any).purchaseOrderNo}</div>
                <div><span className="text-gray-500">供应商：</span>{(detailData as any).supplierName ?? "-"}</div>
                <div><span className="text-gray-500">到货日期：</span>{formatDate((detailData as any).receiptDate)}</div>
                <div>
                  <span className="text-gray-500">状态：</span>
                  <Badge variant={STATUS_MAP[(detailData as any).status]?.variant ?? "outline"} className="ml-1">
                    {STATUS_MAP[(detailData as any).status]?.label ?? (detailData as any).status}
                  </Badge>
                </div>
                <div><span className="text-gray-500">质检员：</span>{(detailData as any).inspectorName ?? "-"}</div>
                <div><span className="text-gray-500">质检日期：</span>{(detailData as any).inspectionDate ? formatDate((detailData as any).inspectionDate) : "-"}</div>
                <div>
                  <span className="text-gray-500">质检结果：</span>
                  {(detailData as any).inspectionResult === "pass" ? "合格" :
                    (detailData as any).inspectionResult === "fail" ? "不合格" : "-"}
                </div>
                {(detailData as any).inspectionRemark && (
                  <div className="col-span-2"><span className="text-gray-500">质检备注：</span>{(detailData as any).inspectionRemark}</div>
                )}
                {(detailData as any).inboundDocumentNo && (
                  <div><span className="text-gray-500">入库单号：</span>{(detailData as any).inboundDocumentNo}</div>
                )}
                {(detailData as any).remark && (
                  <div className="col-span-2"><span className="text-gray-500">备注：</span>{(detailData as any).remark}</div>
                )}
              </div>
              <div>
                <h3 className="font-medium mb-2">到货明细</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料名称</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead className="text-right">订单数量</TableHead>
                      <TableHead className="text-right">本次到货</TableHead>
                      <TableHead className="text-right">合格数量</TableHead>
                      <TableHead>批次号</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((detailData as any).items ?? []).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.materialName}</TableCell>
                        <TableCell className="text-gray-500 text-sm">{item.specification}</TableCell>
                        <TableCell className="text-right">{item.orderedQty} {item.unit}</TableCell>
                        <TableCell className="text-right">{item.receivedQty}</TableCell>
                        <TableCell className="text-right">{item.qualifiedQty ?? "-"}</TableCell>
                        <TableCell>{item.batchNo ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ==================== 质检登记弹窗 ==================== */}
      <Dialog open={showInspect} onOpenChange={setShowInspect}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>质检登记</DialogTitle>
          </DialogHeader>
          {inspectData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>质检员姓名 <span className="text-red-500">*</span></Label>
                  <Input
                    value={inspectForm.inspectorName}
                    onChange={(e) => setInspectForm((p) => ({ ...p, inspectorName: e.target.value }))}
                    placeholder="请输入质检员姓名"
                  />
                </div>
                <div>
                  <Label>质检日期</Label>
                  <Input
                    type="date"
                    value={inspectForm.inspectionDate}
                    onChange={(e) => setInspectForm((p) => ({ ...p, inspectionDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">明细质检数量</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料名称</TableHead>
                      <TableHead className="text-right">到货数量</TableHead>
                      <TableHead className="text-right">合格数量</TableHead>
                      <TableHead className="text-right">不合格数量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((inspectData as any).items ?? []).map((item: any, idx: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.materialName}</TableCell>
                        <TableCell className="text-right">{item.receivedQty} {item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number" min="0"
                            className="w-24 text-right"
                            value={inspectForm.items[idx]?.qualifiedQty ?? String(item.receivedQty)}
                            onChange={(e) => {
                              const newItems = [...inspectForm.items];
                              while (newItems.length <= idx) newItems.push({ qualifiedQty: String(item.receivedQty), unqualifiedQty: "0" });
                              const qualified = Number(e.target.value);
                              const unqualified = Math.max(0, Number(item.receivedQty) - qualified);
                              newItems[idx] = { qualifiedQty: e.target.value, unqualifiedQty: String(unqualified) };
                              setInspectForm((p) => ({ ...p, items: newItems }));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {inspectForm.items[idx]?.unqualifiedQty ?? "0"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <Label>质检备注</Label>
                <Textarea
                  value={inspectForm.inspectionRemark}
                  onChange={(e) => setInspectForm((p) => ({ ...p, inspectionRemark: e.target.value }))}
                  placeholder="质检说明..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowInspect(false)}>取消</Button>
            <Button variant="destructive" onClick={() => handleInspectSubmit("fail")}>
              <XCircle className="w-4 h-4 mr-1" /> 判定不合格
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleInspectSubmit("pass")}>
              <CheckCircle className="w-4 h-4 mr-1" /> 判定合格
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ERPLayout>
  );
}
