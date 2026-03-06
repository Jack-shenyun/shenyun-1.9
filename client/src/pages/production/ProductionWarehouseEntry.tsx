import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
import {
  Warehouse, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, Bell, Calculator, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  draft:     { label: "草稿",   variant: "outline" },
  pending:   { label: "待审批", variant: "default" },
  approved:  { label: "已审批", variant: "secondary" },
  completed: { label: "已入库", variant: "secondary" },
  rejected:  { label: "已拒绝", variant: "destructive" },
};

const emptyForm = {
  entryNo: "",
  productionOrderId: "",
  productionOrderNo: "",
  sterilizationOrderId: "",
  sterilizationOrderNo: "",
  productId: "",
  productName: "",
  batchNo: "",
  sterilizationBatchNo: "",
  // 公式字段
  sterilizedQty: "",       // 灭菌后数量
  inspectionRejectQty: "", // 检验报废数量
  sampleQty: "",           // 留样数量
  quantity: "",            // 入库数量（可手动修改）
  quantityModifyReason: "", // 修改原因
  unit: "件",
  targetWarehouseId: "",
  applicationDate: "",
  remark: "",
};

export default function ProductionWarehouseEntryPage() {
  const { canDelete } = usePermission();
  const { data: entries = [], isLoading, refetch } = trpc.productionWarehouseEntries.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: sterilizationOrders = [] } = trpc.sterilizationOrders.list.useQuery({});
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});

  const createMutation = trpc.productionWarehouseEntries.create.useMutation({
    onSuccess: () => { refetch(); toast.success("入库申请已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.productionWarehouseEntries.update.useMutation({
    onSuccess: () => { refetch(); toast.success("入库申请已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.productionWarehouseEntries.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("入库申请已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [viewingEntry, setViewingEntry] = useState<any>(null);
  const [quantityManuallyEdited, setQuantityManuallyEdited] = useState(false);
  const focusHandledRef = useRef(false);

  const [formData, setFormData] = useState({ ...emptyForm });

  // 自动计算入库数量公式：灭菌后数量 - 检验报废数量 - 留样数量
  useEffect(() => {
    if (quantityManuallyEdited) return; // 手动修改后不再自动覆盖
    const s = parseFloat(formData.sterilizedQty) || 0;
    const r = parseFloat(formData.inspectionRejectQty) || 0;
    const sp = parseFloat(formData.sampleQty) || 0;
    if (s > 0) {
      const calc = Math.max(0, s - r - sp);
      setFormData((f) => ({ ...f, quantity: String(calc) }));
    }
  }, [formData.sterilizedQty, formData.inspectionRejectQty, formData.sampleQty, quantityManuallyEdited]);

  const filteredEntries = (entries as any[]).filter((e) => {
    const matchSearch = !searchTerm ||
      String(e.entryNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const genNo = () => {
    const now = new Date();
    return `WE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
  };

  const handleAdd = () => {
    setEditingEntry(null);
    setQuantityManuallyEdited(false);
    setFormData({ ...emptyForm, entryNo: genNo(), applicationDate: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setQuantityManuallyEdited(true); // 编辑时不自动覆盖
    setFormData({
      entryNo: entry.entryNo,
      productionOrderId: entry.productionOrderId ? String(entry.productionOrderId) : "",
      productionOrderNo: entry.productionOrderNo || "",
      sterilizationOrderId: entry.sterilizationOrderId ? String(entry.sterilizationOrderId) : "",
      sterilizationOrderNo: entry.sterilizationOrderNo || "",
      productId: entry.productId ? String(entry.productId) : "",
      productName: entry.productName || "",
      batchNo: entry.batchNo || "",
      sterilizationBatchNo: entry.sterilizationBatchNo || "",
      sterilizedQty: entry.sterilizedQty || "",
      inspectionRejectQty: entry.inspectionRejectQty || "",
      sampleQty: entry.sampleQty || "",
      quantity: entry.quantity || "",
      quantityModifyReason: entry.quantityModifyReason || "",
      unit: entry.unit || "件",
      targetWarehouseId: entry.targetWarehouseId ? String(entry.targetWarehouseId) : "",
      applicationDate: entry.applicationDate ? String(entry.applicationDate).split("T")[0] : "",
      remark: entry.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (entry: any) => { setViewingEntry(entry); setViewDialogOpen(true); };
  const handleDelete = (entry: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: entry.id });
  };

  const handleProductionOrderChange = (poId: string) => {
    const po = (productionOrders as any[]).find((p) => String(p.id) === poId);
    setFormData((f) => ({
      ...f,
      productionOrderId: poId,
      productionOrderNo: po?.orderNo || "",
      productId: po?.productId ? String(po.productId) : f.productId,
      batchNo: po?.batchNo || f.batchNo,
    }));
  };

  const handleSterilizationOrderChange = (soId: string) => {
    const so = (sterilizationOrders as any[]).find((s) => String(s.id) === soId);
    setFormData((f) => ({
      ...f,
      sterilizationOrderId: soId,
      sterilizationOrderNo: so?.orderNo || "",
      sterilizationBatchNo: so?.sterilizationBatchNo || f.sterilizationBatchNo,
      productName: so?.productName || f.productName,
      batchNo: so?.batchNo || f.batchNo,
      sterilizedQty: so?.quantity || f.sterilizedQty, // 灭菌后数量默认取灭菌单数量
      unit: so?.unit || f.unit,
    }));
    setQuantityManuallyEdited(false);
  };

  const handleProductChange = (productId: string) => {
    const product = (products as any[]).find((p) => String(p.id) === productId);
    setFormData((f) => ({ ...f, productId, productName: product?.name || "" }));
  };

  // 判断入库数量是否被手动修改（与公式计算值不同）
  const calcQty = () => {
    const s = parseFloat(formData.sterilizedQty) || 0;
    const r = parseFloat(formData.inspectionRejectQty) || 0;
    const sp = parseFloat(formData.sampleQty) || 0;
    return s > 0 ? Math.max(0, s - r - sp) : null;
  };
  const isQtyModified = () => {
    const calc = calcQty();
    if (calc === null) return false;
    return parseFloat(formData.quantity) !== calc;
  };

  const handleSubmit = () => {
    if (!formData.entryNo || !formData.quantity) {
      toast.error("请填写必填项", { description: "入库单号和数量为必填" });
      return;
    }
    if (isQtyModified() && !formData.quantityModifyReason.trim()) {
      toast.error("请填写修改原因", { description: "入库数量与公式计算值不同，需填写修改原因" });
      return;
    }
    const payload = {
      entryNo: formData.entryNo,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      sterilizationOrderId: formData.sterilizationOrderId ? Number(formData.sterilizationOrderId) : undefined,
      sterilizationOrderNo: formData.sterilizationOrderNo || undefined,
      productId: formData.productId ? Number(formData.productId) : undefined,
      productName: formData.productName || undefined,
      batchNo: formData.batchNo || undefined,
      sterilizationBatchNo: formData.sterilizationBatchNo || undefined,
      sterilizedQty: formData.sterilizedQty || undefined,
      inspectionRejectQty: formData.inspectionRejectQty || undefined,
      sampleQty: formData.sampleQty || undefined,
      quantity: formData.quantity,
      quantityModifyReason: isQtyModified() ? formData.quantityModifyReason : undefined,
      unit: formData.unit || undefined,
      targetWarehouseId: formData.targetWarehouseId ? Number(formData.targetWarehouseId) : undefined,
      applicationDate: formData.applicationDate || undefined,
      status: "draft" as const,
      remark: formData.remark || undefined,
    };
    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        data: {
          quantity: payload.quantity,
          sterilizedQty: payload.sterilizedQty,
          inspectionRejectQty: payload.inspectionRejectQty,
          sampleQty: payload.sampleQty,
          quantityModifyReason: payload.quantityModifyReason,
          targetWarehouseId: payload.targetWarehouseId,
          remark: payload.remark,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  // 确认入库 → 通知销售部
  const handleCompleteEntry = (entry: any) => {
    updateMutation.mutate(
      { id: entry.id, data: { status: "completed" } },
      {
        onSuccess: () => {
          refetch();
          toast.success("入库完成，已通知销售部", {
            description: `产品「${entry.productName || "-"}」批号 ${entry.batchNo || "-"}，数量 ${entry.quantity} ${entry.unit} 已入库，销售部待办已创建`,
            duration: 6000,
          });
        },
      }
    );
  };

  const draftCount = (entries as any[]).filter((e) => e.status === "draft").length;
  const pendingCount = (entries as any[]).filter((e) => e.status === "pending").length;
  const completedCount = (entries as any[]).filter((e) => e.status === "completed").length;

  useEffect(() => {
    if (focusHandledRef.current) return;
    const raw = new URLSearchParams(window.location.search).get("focusId");
    const focusId = Number(raw);
    if (!Number.isFinite(focusId) || focusId <= 0) return;
    const entry = (entries as any[]).find((item: any) => Number(item?.id) === focusId);
    if (!entry) return;
    focusHandledRef.current = true;
    handleView(entry);
    const next = new URL(window.location.href);
    next.searchParams.delete("focusId");
    window.history.replaceState({}, "", `${next.pathname}${next.search}`);
  }, [entries]);
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
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Warehouse className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">生产入库申请</h2>
              <p className="text-sm text-muted-foreground">入库数量 = 灭菌后数量 − 检验报废数量 − 留样数量，入库完成后自动通知销售部</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />新建入库申请</Button>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">草稿/待审批</p><p className="text-2xl font-bold text-amber-600">{draftCount + pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已入库</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总申请数</p><p className="text-2xl font-bold">{(entries as any[]).length}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索入库单号、产品名称、批号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="approved">已审批</SelectItem>
                  <SelectItem value="completed">已入库</SelectItem>
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
                  <TableHead className="text-center font-bold">入库单号</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">批号</TableHead>
                  <TableHead className="text-center font-bold">灭菌批号</TableHead>
                  <TableHead className="text-center font-bold">入库数量</TableHead>
                  <TableHead className="text-center font-bold">目标仓库</TableHead>
                  <TableHead className="text-center font-bold">关联灭菌单</TableHead>
                  <TableHead className="text-center font-bold">申请日期</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无入库申请</TableCell></TableRow>
                ) : filteredEntries.map((entry: any) => {
                  const warehouse = (warehouseList as any[]).find((w) => w.id === entry.targetWarehouseId);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center font-medium font-mono">{entry.entryNo}</TableCell>
                      <TableCell className="text-center">{entry.productName || "-"}</TableCell>
                      <TableCell className="text-center font-mono">{entry.batchNo || "-"}</TableCell>
                      <TableCell className="text-center">
                        {entry.sterilizationBatchNo
                          ? <span className="font-mono text-orange-600 text-xs">{entry.sterilizationBatchNo}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{entry.quantity}</span>
                        <span className="text-muted-foreground ml-1 text-xs">{entry.unit}</span>
                        {entry.quantityModifyReason && (
                          <AlertCircle className="h-3 w-3 inline ml-1 text-amber-500" title={`已修改：${entry.quantityModifyReason}`} />
                        )}
                      </TableCell>
                      <TableCell className="text-center">{warehouse?.name || "-"}</TableCell>
                      <TableCell className="text-center text-muted-foreground text-xs">{entry.sterilizationOrderNo || "-"}</TableCell>
                      <TableCell className="text-center">{entry.applicationDate ? String(entry.applicationDate).split("T")[0] : "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[entry.status]?.variant || "outline"} className={getStatusSemanticClass(entry.status, statusMap[entry.status]?.label)}>
                          {statusMap[entry.status]?.label || entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(entry)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                            {entry.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(entry)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: entry.id, data: { status: "pending" } })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />提交审批
                                </DropdownMenuItem>
                              </>
                            )}
                            {entry.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: entry.id, data: { status: "approved" } })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />审批通过
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: entry.id, data: { status: "rejected" } })} className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />拒绝
                                </DropdownMenuItem>
                              </>
                            )}
                            {entry.status === "approved" && (
                              <DropdownMenuItem onClick={() => handleCompleteEntry(entry)} className="text-green-600 font-medium">
                                <Bell className="h-4 w-4 mr-2" />确认入库 · 通知销售部
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => handleDelete(entry)} className="text-destructive">
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
          <DraggableDialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "编辑入库申请" : "新建生产入库申请"}</DialogTitle>
              <DialogDescription>入库数量 = 灭菌后数量 − 检验报废数量 − 留样数量（可手动修改，需填写原因）</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>入库单号 *</Label>
                  <Input value={formData.entryNo} onChange={(e) => setFormData({ ...formData, entryNo: e.target.value })} readOnly={!!editingEntry} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>申请日期</Label>
                  <Input type="date" value={formData.applicationDate} onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>关联生产任务</Label>
                  <Select value={formData.productionOrderId || "__NONE__"} onValueChange={(v) => handleProductionOrderChange(v === "__NONE__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="选择生产任务" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">不关联</SelectItem>
                      {(productionOrders as any[]).map((po: any) => (
                        <SelectItem key={po.id} value={String(po.id)}>{po.orderNo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>关联灭菌单（合格）</Label>
                  <Select value={formData.sterilizationOrderId || "__NONE__"} onValueChange={(v) => handleSterilizationOrderChange(v === "__NONE__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="选择灭菌单" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">不关联</SelectItem>
                      {(sterilizationOrders as any[]).filter((s: any) => s.status === "qualified" || s.status === "arrived").map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.orderNo} - {s.productName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品</Label>
                  <Select value={formData.productId || "__NONE__"} onValueChange={(v) => handleProductChange(v === "__NONE__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="选择产品" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">不选择</SelectItem>
                      {(products as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>生产批号</Label>
                  <Input value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} placeholder="生产批号" className="font-mono" />
                </div>
              </div>
              {formData.sterilizationBatchNo && (
                <div className="p-2 bg-orange-50 rounded border border-orange-100 text-sm text-orange-700">
                  灭菌批号：<span className="font-mono font-medium">{formData.sterilizationBatchNo}</span>
                </div>
              )}

              {/* 入库数量公式区域 */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <Calculator className="h-4 w-4" />
                  入库数量计算公式
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">灭菌后数量</Label>
                    <Input
                      type="number"
                      value={formData.sterilizedQty}
                      onChange={(e) => { setFormData({ ...formData, sterilizedQty: e.target.value }); setQuantityManuallyEdited(false); }}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">检验报废数量</Label>
                    <Input
                      type="number"
                      value={formData.inspectionRejectQty}
                      onChange={(e) => { setFormData({ ...formData, inspectionRejectQty: e.target.value }); setQuantityManuallyEdited(false); }}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">留样数量</Label>
                    <Input
                      type="number"
                      value={formData.sampleQty}
                      onChange={(e) => { setFormData({ ...formData, sampleQty: e.target.value }); setQuantityManuallyEdited(false); }}
                      placeholder="0"
                    />
                  </div>
                </div>
                {calcQty() !== null && (
                  <p className="text-xs text-blue-600">
                    公式计算值：{formData.sterilizedQty || 0} − {formData.inspectionRejectQty || 0} − {formData.sampleQty || 0} = <strong>{calcQty()}</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    入库数量 *
                    {isQtyModified() && <AlertCircle className="h-3 w-3 text-amber-500" />}
                  </Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => { setFormData({ ...formData, quantity: e.target.value }); setQuantityManuallyEdited(true); }}
                    className={isQtyModified() ? "border-amber-400" : ""}
                  />
                  {isQtyModified() && <p className="text-xs text-amber-600">已偏离公式计算值，需填写修改原因</p>}
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>目标仓库</Label>
                  <Select value={formData.targetWarehouseId || "__NONE__"} onValueChange={(v) => setFormData({ ...formData, targetWarehouseId: v === "__NONE__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">不选择</SelectItem>
                      {(warehouseList as any[]).map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isQtyModified() && (
                <div className="space-y-2">
                  <Label className="text-amber-700">修改原因 * <span className="text-xs font-normal text-muted-foreground">（入库数量偏离公式计算值时必填）</span></Label>
                  <Textarea
                    value={formData.quantityModifyReason}
                    onChange={(e) => setFormData({ ...formData, quantityModifyReason: e.target.value })}
                    placeholder="请说明修改入库数量的原因..."
                    rows={2}
                    className="border-amber-300"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEntry ? "保存修改" : "创建入库申请"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingEntry && (
      <div className="space-y-4">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">生产入库申请详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingEntry.entryNo}
            {viewingEntry.status && (
              <>
                {' '}
                ·
                <Badge
                  variant={statusMap[viewingEntry.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(viewingEntry.status, statusMap[viewingEntry.status]?.label)}`}
                >
                  {statusMap[viewingEntry.status]?.label || String(viewingEntry.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div className="space-y-4 py-2">
          {/* 基本信息分区 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="产品名称">{viewingEntry.productName || "-"}</FieldRow>
                <FieldRow label="生产批号">{viewingEntry.batchNo ? <span className="font-mono">{viewingEntry.batchNo}</span> : "-"}</FieldRow>
                <FieldRow label="灭菌批号">
                  {viewingEntry.sterilizationBatchNo ? (
                    <span className="font-mono text-orange-600 text-xs">{viewingEntry.sterilizationBatchNo}</span>
                  ) : (
                    "-"
                  )}
                </FieldRow>
              </div>
              <div>
                <FieldRow label="申请日期">{viewingEntry.applicationDate ? String(viewingEntry.applicationDate).split("T")[0] : "-"}</FieldRow>
                <FieldRow label="关联生产任务">{viewingEntry.productionOrderNo || "-"}</FieldRow>
                <FieldRow label="关联灭菌单">{viewingEntry.sterilizationOrderNo || "-"}</FieldRow>
              </div>
            </div>
          </div>

          {/* 数量信息分区 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">数量信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="灭菌后数量">{viewingEntry.sterilizedQty || "-"}</FieldRow>
                <FieldRow label="检验报废">{viewingEntry.inspectionRejectQty || "0"}</FieldRow>
                <FieldRow label="留样数量">{viewingEntry.sampleQty || "0"}</FieldRow>
              </div>
              <div>
                <FieldRow label="入库数量">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-medium text-lg">{viewingEntry.quantity}</span>
                    <span className="text-muted-foreground text-xs">{viewingEntry.unit}</span>
                    {viewingEntry.quantityModifyReason && (
                      <AlertCircle className="h-3 w-3 text-amber-500" title={`已修改: ${viewingEntry.quantityModifyReason}`} />
                    )}
                  </div>
                </FieldRow>
                <FieldRow label="目标仓库">{(warehouseList as any[]).find((w: any) => w.id === viewingEntry.targetWarehouseId)?.name || "-"}</FieldRow>
              </div>
            </div>
          </div>

          {/* 数量修改原因 */}
          {viewingEntry.quantityModifyReason && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">数量修改原因</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingEntry.quantityModifyReason}</p>
            </div>
          )}

          {/* 备注 */}
          {viewingEntry.remark && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingEntry.remark}</p>
            </div>
          )}

          {viewingEntry.status === "completed" && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-green-700">
              <Bell className="h-4 w-4 inline mr-1" />已入库完成，销售部已收到通知
            </div>
          )}
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            {viewingEntry?.status === "draft" && (
              <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); if (viewingEntry) handleEdit(viewingEntry); }}>编辑</Button>
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
