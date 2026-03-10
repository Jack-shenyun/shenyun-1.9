import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { formatDateTime, formatDateValue } from "@/lib/formatters";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { ClipboardList, Plus, Search, Eye, Trash2, CheckCircle, XCircle, Send, MoreHorizontal } from "lucide-react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

// ── 类型定义 ──────────────────────────────────────────────
interface MaterialRequestItem {
  id?: number;
  requestId?: number;
  productId?: number | null;
  materialName: string;
  specification?: string;
  quantity: string;
  unit?: string;
  estimatedPrice?: string;
  remark?: string;
}

interface MaterialRequest {
  id: number;
  requestNo: string;
  department: string;
  requesterId: number;
  requesterName?: string;
  requestDate: string;
  urgency: "normal" | "urgent" | "critical";
  reason?: string;
  totalAmount?: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "purchasing" | "completed" | "cancelled";
  approvedBy?: number;
  approvedAt?: string;
  remark?: string;
  createdAt: string;
  items?: MaterialRequestItem[];
}

// ── 状态映射 ──────────────────────────────────────────────
const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive" }> = {
  draft:            { label: "草稿",   variant: "outline" },
  pending_approval: { label: "审批中", variant: "default" },
  approved:         { label: "已审批", variant: "secondary" },
  rejected:         { label: "已驳回", variant: "destructive" },
  purchasing:       { label: "采购中", variant: "default" },
  completed:        { label: "已完成", variant: "secondary" },
  cancelled:        { label: "已取消", variant: "outline" },
};

const urgencyMap: Record<string, { label: string; color: string }> = {
  normal:   { label: "普通", color: "text-gray-600" },
  urgent:   { label: "紧急", color: "text-amber-600" },
  critical: { label: "特急", color: "text-red-600" },
};

// ── 字段行组件 ────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-dashed border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{children ?? "-"}</span>
    </div>
  );
}

// ── 空行 ──────────────────────────────────────────────────
function EmptyRow({ item, index, onChange, onRemove }: {
  item: MaterialRequestItem; index: number;
  onChange: (i: number, field: keyof MaterialRequestItem, val: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <TableRow>
      <TableCell className="text-center text-muted-foreground text-xs">{index + 1}</TableCell>
      <TableCell>
        <Input value={item.materialName} onChange={e => onChange(index, "materialName", e.target.value)} placeholder="物料名称*" className="h-8 text-sm" />
      </TableCell>
      <TableCell>
        <Input value={item.specification ?? ""} onChange={e => onChange(index, "specification", e.target.value)} placeholder="规格型号" className="h-8 text-sm" />
      </TableCell>
      <TableCell>
        <Input type="number" value={item.quantity} onChange={e => onChange(index, "quantity", e.target.value)} placeholder="数量*" className="h-8 text-sm w-24" />
      </TableCell>
      <TableCell>
        <Input value={item.unit ?? ""} onChange={e => onChange(index, "unit", e.target.value)} placeholder="单位" className="h-8 text-sm w-20" />
      </TableCell>
      <TableCell>
        <Input type="number" value={item.estimatedPrice ?? ""} onChange={e => onChange(index, "estimatedPrice", e.target.value)} placeholder="预估单价" className="h-8 text-sm w-28" />
      </TableCell>
      <TableCell>
        <Input value={item.remark ?? ""} onChange={e => onChange(index, "remark", e.target.value)} placeholder="备注" className="h-8 text-sm" />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => onRemove(index)}>×</Button>
      </TableCell>
    </TableRow>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export default function MaterialRequestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<MaterialRequest | null>(null);
  const { canDelete, isAdmin, isGM } = usePermission();

  // 表单状态
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    department: "", requestDate: today, urgency: "normal" as "normal" | "urgent" | "critical",
    reason: "", remark: "",
  });
  const [items, setItems] = useState<MaterialRequestItem[]>([
    { materialName: "", specification: "", quantity: "1", unit: "", estimatedPrice: "", remark: "" },
  ]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  // ── tRPC ──────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: listData, isLoading } = trpc.materialRequests.list.useQuery({
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
  });
  const { data: productsData = [] } = trpc.products.list.useQuery();

  const createMutation = trpc.materialRequests.create.useMutation({
    onSuccess: () => { toast.success("采购申请已创建"); setFormOpen(false); resetForm(); utils.materialRequests.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.materialRequests.update.useMutation({
    onSuccess: () => { toast.success("操作成功"); utils.materialRequests.list.invalidate(); if (selected) setSelected(prev => prev ? { ...prev } : null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.materialRequests.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.materialRequests.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // 生成申请单号
  const genNo = () => {
    const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0");
    return `MR-${y}${m}-${String(Math.floor(Math.random()*9000)+1000)}`;
  };

  function resetForm() {
    setForm({ department: "", requestDate: today, urgency: "normal", reason: "", remark: "" });
    setItems([{ materialName: "", specification: "", quantity: "1", unit: "", estimatedPrice: "", remark: "" }]);
    setSelectedProductIds([]);
    setProductSearch("");
  }

  function handleItemChange(i: number, field: keyof MaterialRequestItem, val: string) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }
  function addItem() {
    setItems(prev => [...prev, { materialName: "", specification: "", quantity: "1", unit: "", estimatedPrice: "", remark: "" }]);
  }
  function removeItem(i: number) {
    if (items.length <= 1) return toast.warning("至少保留一条明细");
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  const filteredProducts = (productsData as any[]).filter((p) => {
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [p.code, p.name, p.specification]
      .map((x) => String(x || "").toLowerCase())
      .some((x) => x.includes(keyword));
  });

  function openProductPicker() {
    const existing = items
      .map((x) => (typeof x.productId === "number" ? x.productId : null))
      .filter((x): x is number => x !== null);
    setSelectedProductIds(existing);
    setProductPickerOpen(true);
  }

  function toggleProductSelection(id: number, checked: boolean) {
    setSelectedProductIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((x) => x !== id);
    });
  }

  function confirmProductSelection() {
    const productMap = new Map<number, any>((productsData as any[]).map((p) => [Number(p.id), p]));
    const existingById = new Map<number, MaterialRequestItem>();
    items.forEach((item) => {
      if (typeof item.productId === "number") {
        existingById.set(item.productId, item);
      }
    });

    const nextItems: MaterialRequestItem[] = selectedProductIds.map((id) => {
      const existing = existingById.get(id);
      if (existing) return existing;
      const product = productMap.get(id);
      return {
        productId: id,
        materialName: String(product?.name || ""),
        specification: String(product?.specification || ""),
        quantity: "1",
        unit: String(product?.unit || ""),
        estimatedPrice: "",
        remark: "",
      };
    });

    setItems(nextItems.length > 0 ? nextItems : [{ materialName: "", specification: "", quantity: "1", unit: "", estimatedPrice: "", remark: "" }]);
    setProductPickerOpen(false);
  }

  function handleSubmit() {
    if (!form.department) return toast.error("请填写申请部门");
    if (!form.requestDate) return toast.error("请选择申请日期");
    const validItems = items.filter(i => i.materialName.trim() && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) return toast.error("请至少填写一条有效明细（物料名称+数量）");

    const totalAmount = validItems.reduce((sum, i) => {
      const qty = parseFloat(i.quantity) || 0;
      const price = parseFloat(i.estimatedPrice ?? "0") || 0;
      return sum + qty * price;
    }, 0);

    createMutation.mutate({
      requestNo: genNo(),
      department: form.department,
      requestDate: form.requestDate,
      urgency: form.urgency,
      reason: form.reason || undefined,
      remark: form.remark || undefined,
      totalAmount: totalAmount > 0 ? String(totalAmount.toFixed(2)) : undefined,
      items: validItems.map(i => ({
        materialName: i.materialName,
        specification: i.specification || undefined,
        quantity: i.quantity,
        unit: i.unit || undefined,
        estimatedPrice: i.estimatedPrice || undefined,
        remark: i.remark || undefined,
      })),
    });
  }

  function handleStatusChange(id: number, status: MaterialRequest["status"]) {
    updateMutation.mutate({ id, data: { status } });
  }

  function handleView(record: MaterialRequest) {
    setSelected(record); setViewOpen(true);
  }

  const records: MaterialRequest[] = (listData as any) ?? [];

  // 统计
  const totalCount = records.length;
  const pendingCount = records.filter(r => r.status === "pending_approval").length;
  const approvedCount = records.filter(r => r.status === "approved" || r.status === "purchasing").length;
  const urgentCount = records.filter(r => r.urgency === "critical" || r.urgency === "urgent").length;

  return (
    <ERPLayout>
      <div className="p-6 space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" /> 采购申请
            </h1>
            <p className="text-sm text-muted-foreground mt-1">管理物料采购申请单，支持多级审批流转</p>
          </div>
          <Button onClick={() => { resetForm(); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> 新建申请
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "申请总数", value: totalCount, icon: "📋", color: "" },
            { label: "待审批", value: pendingCount, icon: "⏳", color: "text-amber-600" },
            { label: "已批准", value: approvedCount, icon: "✅", color: "text-green-600" },
            { label: "紧急/特急", value: urgentCount, icon: "⚠️", color: "text-red-600" },
          ].map(c => (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.icon}</span>
                  <div>
                    <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                    <div className="text-xs text-muted-foreground">{c.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 搜索过滤 */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索申请单号、部门..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* 列表 */}
        <div className="border rounded-lg overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申请单号</TableHead>
                <TableHead>申请部门</TableHead>
                <TableHead>申请日期</TableHead>
                <TableHead>紧急程度</TableHead>
                <TableHead>预估金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">暂无采购申请数据</TableCell></TableRow>
              ) : records.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{r.requestNo}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateValue(r.requestDate)}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${urgencyMap[r.urgency]?.color}`}>
                      {urgencyMap[r.urgency]?.label ?? r.urgency}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.totalAmount ? `¥${parseFloat(r.totalAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusMap[r.status]?.variant ?? "outline"} className={getStatusSemanticClass(r.status, statusMap[r.status]?.label)}>
                      {statusMap[r.status]?.label ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(r)}><Eye className="w-4 h-4 mr-2" />查看详情</DropdownMenuItem>
                        {r.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(r.id, "pending_approval")}>
                            <Send className="w-4 h-4 mr-2" />提交审批
                          </DropdownMenuItem>
                        )}
                        {r.status === "pending_approval" && (isAdmin || isGM) && (<>
                          <DropdownMenuItem onClick={() => handleStatusChange(r.id, "approved")} className="text-green-600">
                            <CheckCircle className="w-4 h-4 mr-2" />审批通过
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(r.id, "rejected")} className="text-red-600">
                            <XCircle className="w-4 h-4 mr-2" />驳回
                          </DropdownMenuItem>
                        </>)}
                        {r.status === "approved" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(r.id, "purchasing")}>
                            <ClipboardList className="w-4 h-4 mr-2" />开始采购
                          </DropdownMenuItem>
                        )}
                        {r.status === "purchasing" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(r.id, "completed")} className="text-green-600">
                            <CheckCircle className="w-4 h-4 mr-2" />标记完成
                          </DropdownMenuItem>
                        )}
                        {(r.status === "draft" || r.status === "rejected") && canDelete && (
                          <DropdownMenuItem onClick={() => deleteMutation.mutate({ id: r.id })} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />删除
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

      {/* ── 新建弹窗 ── */}
      <DraggableDialog open={formOpen} onOpenChange={setFormOpen}>
        <DraggableDialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>新建采购申请</DialogTitle></DialogHeader>
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>申请部门 <span className="text-red-500">*</span></Label>
                <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="如：生产部" />
              </div>
              <div className="space-y-1.5">
                <Label>申请日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.requestDate} onChange={e => setForm(p => ({ ...p, requestDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>紧急程度</Label>
                <Select value={form.urgency} onValueChange={v => setForm(p => ({ ...p, urgency: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                    <SelectItem value="critical">特急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>申请理由</Label>
                <Input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="简述申请原因" />
              </div>
            </div>

            {/* 明细 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">申请明细</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={openProductPicker} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> 选择产品（多选）
                  </Button>
                  <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> 添加行
                  </Button>
                </div>
              </div>
              <div className="border rounded-md overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>物料名称*</TableHead>
                      <TableHead>规格型号</TableHead>
                      <TableHead className="w-24">数量*</TableHead>
                      <TableHead className="w-20">单位</TableHead>
                      <TableHead className="w-28">预估单价</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <EmptyRow key={i} item={item} index={i} onChange={handleItemChange} onRemove={removeItem} />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                预估总金额：¥{items.reduce((s, i) => s + (parseFloat(i.quantity)||0)*(parseFloat(i.estimatedPrice||"0")||0), 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>备注</Label>
              <Textarea value={form.remark} onChange={e => setForm(p => ({ ...p, remark: e.target.value }))} placeholder="其他说明" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "提交中..." : "创建申请"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 产品库选择弹窗（多选） */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-5xl">
          <div className="space-y-3">
            <h3 className="text-base font-semibold">选择产品（可多选）</h3>
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="搜索产品编码、名称、规格..."
            />
            <div className="max-h-[420px] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">选择</TableHead>
                    <TableHead>产品编码</TableHead>
                    <TableHead>产品名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead className="w-24">单位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                        暂无可选产品
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p: any) => {
                      const id = Number(p.id);
                      const checked = selectedProductIds.includes(id);
                      return (
                        <TableRow key={id}>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleProductSelection(id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>{p.code || "-"}</TableCell>
                          <TableCell className="font-medium">{p.name || "-"}</TableCell>
                          <TableCell>{p.specification || "-"}</TableCell>
                          <TableCell>{p.unit || "-"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setProductPickerOpen(false)}>取消</Button>
              <Button onClick={confirmProductSelection}>确认选择（{selectedProductIds.length}）</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 详情弹窗 ── */}
      <DraggableDialog open={viewOpen} onOpenChange={setViewOpen}>
        <DraggableDialogContent className="max-w-3xl">
          {selected && (
            <div className="space-y-4">
              {/* 标准头部 */}
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">采购申请详情</h2>
                <p className="text-sm text-muted-foreground">
                  {selected.requestNo}
                  {" · "}
                  <Badge variant={statusMap[selected.status]?.variant ?? "outline"} className={getStatusSemanticClass(selected.status, statusMap[selected.status]?.label)}>
                    {statusMap[selected.status]?.label ?? selected.status}
                  </Badge>
                  {" · "}
                  <span className={`font-medium ${urgencyMap[selected.urgency]?.color}`}>{urgencyMap[selected.urgency]?.label}</span>
                </p>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {/* 基本信息 */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="申请单号">{selected.requestNo}</FieldRow>
                      <FieldRow label="申请部门">{selected.department}</FieldRow>
                      <FieldRow label="申请日期">{formatDateValue(selected.requestDate)}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="紧急程度">
                        <span className={urgencyMap[selected.urgency]?.color}>{urgencyMap[selected.urgency]?.label}</span>
                      </FieldRow>
                      <FieldRow label="预估总额">
                        {selected.totalAmount ? `¥${parseFloat(selected.totalAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` : "-"}
                      </FieldRow>
                      <FieldRow label="创建时间">{formatDateTime(selected.createdAt)}</FieldRow>
                    </div>
                  </div>
                </div>

                {/* 申请理由 */}
                {selected.reason && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">申请理由</h3>
                    <p className="text-sm bg-muted/40 rounded-lg px-4 py-3">{selected.reason}</p>
                  </div>
                )}

                {/* 明细表格 */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">申请明细</h3>
                  {selected.items && selected.items.length > 0 ? (
                    <div className="border rounded-md overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-10 text-center">#</TableHead>
                            <TableHead>物料名称</TableHead>
                            <TableHead>规格型号</TableHead>
                            <TableHead className="text-right">数量</TableHead>
                            <TableHead>单位</TableHead>
                            <TableHead className="text-right">预估单价</TableHead>
                            <TableHead className="text-right">小计</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.items.map((item, i) => {
                            const qty = parseFloat(item.quantity) || 0;
                            const price = parseFloat(item.estimatedPrice ?? "0") || 0;
                            return (
                              <TableRow key={i}>
                                <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                                <TableCell className="font-medium">{item.materialName}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{item.specification ?? "-"}</TableCell>
                                <TableCell className="text-right">{qty}</TableCell>
                                <TableCell>{item.unit ?? "-"}</TableCell>
                                <TableCell className="text-right">{price > 0 ? `¥${price.toFixed(2)}` : "-"}</TableCell>
                                <TableCell className="text-right font-medium">{qty > 0 && price > 0 ? `¥${(qty * price).toFixed(2)}` : "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无明细数据</p>
                  )}
                </div>

                {/* 审批信息 */}
                {(selected.approvedBy || selected.approvedAt) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">审批信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <FieldRow label="审批时间">{formatDateValue(selected.approvedAt, true)}</FieldRow>
                    </div>
                  </div>
                )}

                {selected.remark && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                    <p className="text-sm bg-muted/40 rounded-lg px-4 py-3">{selected.remark}</p>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                <div className="flex gap-2 flex-wrap">
                  {selected.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => { handleStatusChange(selected.id, "pending_approval"); setViewOpen(false); }}>
                      <Send className="w-4 h-4 mr-1" /> 提交审批
                    </Button>
                  )}
                  {selected.status === "pending_approval" && (isAdmin || isGM) && (<>
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300"
                      onClick={() => { handleStatusChange(selected.id, "approved"); setViewOpen(false); }}>
                      <CheckCircle className="w-4 h-4 mr-1" /> 审批通过
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300"
                      onClick={() => { handleStatusChange(selected.id, "rejected"); setViewOpen(false); }}>
                      <XCircle className="w-4 h-4 mr-1" /> 驳回
                    </Button>
                  </>)}
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewOpen(false)}>关闭</Button>
              </div>
            </div>
          )}
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
