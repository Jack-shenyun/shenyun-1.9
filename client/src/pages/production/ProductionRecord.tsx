import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ClipboardList, Plus, Search, Eye, Trash2, MoreHorizontal, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

// ── 类型 ──────────────────────────────────────────────────
interface ProductionRecord {
  id: number;
  recordNo: string;
  recordType: string;
  productionOrderNo?: string;
  productName?: string;
  batchNo?: string;
  workstationName?: string;
  recordDate?: string;
  plannedQty?: string;
  actualQty?: string;
  scrapQty?: string;
  status: string;
  specification?: string;
  processType?: string;
  processName?: string;
  workshopName?: string;
  productionTeam?: string;
  operator?: string;
  inspector?: string;
  temperature?: string;
  humidity?: string;
  temperatureLimit?: string;
  humidityLimit?: string;
  cleanlinessLevel?: string;
  pressureDiff?: string;
  materialCode?: string;
  materialName?: string;
  materialSpec?: string;
  usedQty?: string;
  usedUnit?: string;
  materialBatchNo?: string;
  storageArea?: string;
  issuedQty?: string;
  qualifiedQty?: string;
  cleanedBy?: string;
  checkedBy?: string;
  cleanResult?: string;
  firstPieceResult?: string;
  firstPieceInspector?: string;
  firstPieceBasis?: string;
  firstPieceBasisVersion?: string;
  detailItems?: string;
  equipmentItems?: string;
  moldItems?: string;
  documentVersion?: string;
  remark?: string;
  createdAt: string;
}

const recordTypeMap: Record<string, string> = {
  general: "通用记录",
  temperature_humidity: "温湿度记录",
  material_usage: "材料使用记录",
  clean_room: "清场记录",
  first_piece: "首件检验记录",
};

const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive" }> = {
  in_progress: { label: "进行中", variant: "default" },
  completed:   { label: "已完成", variant: "secondary" },
  abnormal:    { label: "异常",   variant: "destructive" },
};

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-dashed border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{children ?? "-"}</span>
    </div>
  );
}

export default function ProductionRecordPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<ProductionRecord | null>(null);
  const { canDelete } = usePermission();

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    recordType: "general",
    productionOrderNo: "", productName: "", batchNo: "",
    workstationName: "", recordDate: today,
    plannedQty: "", actualQty: "", scrapQty: "0",
    specification: "", processType: "", processName: "",
    workshopName: "", productionTeam: "", operator: "", inspector: "",
    status: "in_progress",
    temperature: "", humidity: "", temperatureLimit: "", humidityLimit: "",
    cleanlinessLevel: "", pressureDiff: "",
    materialCode: "", materialName: "", materialSpec: "",
    usedQty: "", usedUnit: "", materialBatchNo: "",
    storageArea: "", issuedQty: "", qualifiedQty: "",
    cleanedBy: "", checkedBy: "", cleanResult: "" as "" | "pass" | "fail",
    firstPieceResult: "" as "" | "qualified" | "unqualified",
    firstPieceInspector: "", firstPieceBasis: "", firstPieceBasisVersion: "",
    documentVersion: "", remark: "",
  });

  const utils = trpc.useUtils();
  const { data: listData, isLoading } = trpc.productionRecords.list.useQuery({
    search: searchTerm || undefined,
    recordType: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
  });
  const createMutation = trpc.productionRecords.create.useMutation({
    onSuccess: () => { toast.success("生产记录已创建"); setFormOpen(false); resetForm(); utils.productionRecords.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.productionRecords.update.useMutation({
    onSuccess: () => { toast.success("操作成功"); utils.productionRecords.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.productionRecords.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.productionRecords.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const records: ProductionRecord[] = (listData as any) ?? [];

  const genNo = () => {
    const d = new Date();
    return `PR-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;
  };

  function resetForm() {
    setForm({
      recordType: "general", productionOrderNo: "", productName: "", batchNo: "",
      workstationName: "", recordDate: today, plannedQty: "", actualQty: "", scrapQty: "0",
      specification: "", processType: "", processName: "", workshopName: "", productionTeam: "",
      operator: "", inspector: "", status: "in_progress",
      temperature: "", humidity: "", temperatureLimit: "", humidityLimit: "",
      cleanlinessLevel: "", pressureDiff: "",
      materialCode: "", materialName: "", materialSpec: "",
      usedQty: "", usedUnit: "", materialBatchNo: "",
      storageArea: "", issuedQty: "", qualifiedQty: "",
      cleanedBy: "", checkedBy: "", cleanResult: "",
      firstPieceResult: "", firstPieceInspector: "", firstPieceBasis: "", firstPieceBasisVersion: "",
      documentVersion: "", remark: "",
    });
  }

  function handleSubmit() {
    if (!form.productName) return toast.error("请填写产品名称");
    createMutation.mutate({
      recordNo: genNo(),
      recordType: form.recordType as any,
      productionOrderNo: form.productionOrderNo || undefined,
      productName: form.productName,
      batchNo: form.batchNo || undefined,
      workstationName: form.workstationName || undefined,
      recordDate: form.recordDate || undefined,
      plannedQty: form.plannedQty || undefined,
      actualQty: form.actualQty || undefined,
      scrapQty: form.scrapQty || undefined,
      specification: form.specification || undefined,
      processType: form.processType || undefined,
      processName: form.processName || undefined,
      workshopName: form.workshopName || undefined,
      productionTeam: form.productionTeam || undefined,
      operator: form.operator || undefined,
      inspector: form.inspector || undefined,
      status: form.status as any,
      temperature: form.temperature || undefined,
      humidity: form.humidity || undefined,
      temperatureLimit: form.temperatureLimit || undefined,
      humidityLimit: form.humidityLimit || undefined,
      cleanlinessLevel: form.cleanlinessLevel || undefined,
      pressureDiff: form.pressureDiff || undefined,
      materialCode: form.materialCode || undefined,
      materialName: form.materialName || undefined,
      materialSpec: form.materialSpec || undefined,
      usedQty: form.usedQty || undefined,
      usedUnit: form.usedUnit || undefined,
      materialBatchNo: form.materialBatchNo || undefined,
      storageArea: form.storageArea || undefined,
      issuedQty: form.issuedQty || undefined,
      qualifiedQty: form.qualifiedQty || undefined,
      cleanedBy: form.cleanedBy || undefined,
      checkedBy: form.checkedBy || undefined,
      cleanResult: form.cleanResult || undefined,
      firstPieceResult: form.firstPieceResult || undefined,
      firstPieceInspector: form.firstPieceInspector || undefined,
      firstPieceBasis: form.firstPieceBasis || undefined,
      firstPieceBasisVersion: form.firstPieceBasisVersion || undefined,
      documentVersion: form.documentVersion || undefined,
      remark: form.remark || undefined,
    });
  }

  const total = records.length;
  const inProgress = records.filter(r => r.status === "in_progress").length;
  const completed = records.filter(r => r.status === "completed").length;
  const abnormal = records.filter(r => r.status === "abnormal").length;

  const filtered = records.filter(r => {
    const matchSearch = !searchTerm || r.recordNo.includes(searchTerm) || (r.productName ?? "").includes(searchTerm) || (r.batchNo ?? "").includes(searchTerm);
    const matchType = typeFilter === "all" || r.recordType === typeFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <ERPLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" /> 生产记录单
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">记录生产过程中的各类操作数据</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> 新建记录
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "记录总数", value: total, color: "text-gray-800", icon: "📋" },
            { label: "进行中",   value: inProgress, color: "text-blue-600", icon: "⏳" },
            { label: "已完成",   value: completed, color: "text-green-600", icon: "✅" },
            { label: "异常",     value: abnormal, color: "text-red-600", icon: "⚠️" },
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

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索记录编号、产品名称、批号..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(recordTypeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>记录编号</TableHead>
                <TableHead>记录类型</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>批号</TableHead>
                <TableHead>工序/工位</TableHead>
                <TableHead>记录日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无生产记录数据</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{r.recordNo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{recordTypeMap[r.recordType] ?? r.recordType}</Badge>
                  </TableCell>
                  <TableCell>{r.productName ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.batchNo ?? "-"}</TableCell>
                  <TableCell className="text-sm">{r.workstationName ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateValue(r.recordDate)}</TableCell>
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
                        <DropdownMenuItem onClick={() => { setSelected(r); setViewOpen(true); }}>
                          <Eye className="w-4 h-4 mr-2" />查看详情
                        </DropdownMenuItem>
                        {r.status === "in_progress" && (
                          <DropdownMenuItem onClick={() => updateMutation.mutate({ id: r.id, data: { status: "completed" } })} className="text-green-600">
                            <CheckCircle className="w-4 h-4 mr-2" />标记完成
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
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
          <DialogHeader><DialogTitle>新建生产记录</DialogTitle></DialogHeader>
          <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>记录类型 <span className="text-red-500">*</span></Label>
                <Select value={form.recordType} onValueChange={v => setForm(p => ({ ...p, recordType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(recordTypeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>记录日期</Label>
                <Input type="date" value={form.recordDate} onChange={e => setForm(p => ({ ...p, recordDate: e.target.value }))} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">基本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>产品名称 <span className="text-red-500">*</span></Label>
                  <Input value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} placeholder="产品名称" />
                </div>
                <div className="space-y-1.5">
                  <Label>型号规格</Label>
                  <Input value={form.specification} onChange={e => setForm(p => ({ ...p, specification: e.target.value }))} placeholder="型号规格" />
                </div>
                <div className="space-y-1.5">
                  <Label>生产批号</Label>
                  <Input value={form.batchNo} onChange={e => setForm(p => ({ ...p, batchNo: e.target.value }))} placeholder="批号" />
                </div>
                <div className="space-y-1.5">
                  <Label>生产指令号</Label>
                  <Input value={form.productionOrderNo} onChange={e => setForm(p => ({ ...p, productionOrderNo: e.target.value }))} placeholder="关联生产指令号" />
                </div>
                <div className="space-y-1.5">
                  <Label>车间名称</Label>
                  <Input value={form.workshopName} onChange={e => setForm(p => ({ ...p, workshopName: e.target.value }))} placeholder="车间" />
                </div>
                <div className="space-y-1.5">
                  <Label>生产班组</Label>
                  <Input value={form.productionTeam} onChange={e => setForm(p => ({ ...p, productionTeam: e.target.value }))} placeholder="班组" />
                </div>
                <div className="space-y-1.5">
                  <Label>工序类别</Label>
                  <Select value={form.processType || "none"} onValueChange={v => setForm(p => ({ ...p, processType: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="选择工序类别" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      <SelectItem value="常规">常规</SelectItem>
                      <SelectItem value="特殊">特殊</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>工序/工位</Label>
                  <Input value={form.workstationName} onChange={e => setForm(p => ({ ...p, workstationName: e.target.value }))} placeholder="工序名称" />
                </div>
                <div className="space-y-1.5">
                  <Label>操作人</Label>
                  <Input value={form.operator} onChange={e => setForm(p => ({ ...p, operator: e.target.value }))} placeholder="操作人" />
                </div>
                <div className="space-y-1.5">
                  <Label>检验/审核人</Label>
                  <Input value={form.inspector} onChange={e => setForm(p => ({ ...p, inspector: e.target.value }))} placeholder="检验人" />
                </div>
                <div className="space-y-1.5">
                  <Label>计划数量</Label>
                  <Input type="number" value={form.plannedQty} onChange={e => setForm(p => ({ ...p, plannedQty: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>实际数量</Label>
                  <Input type="number" value={form.actualQty} onChange={e => setForm(p => ({ ...p, actualQty: e.target.value }))} placeholder="0" />
                </div>
              </div>
            </div>

            {form.recordType === "temperature_humidity" && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">温湿度记录</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>温度 (℃)</Label><Input type="number" value={form.temperature} onChange={e => setForm(p => ({ ...p, temperature: e.target.value }))} placeholder="如：23.5" /></div>
                  <div className="space-y-1.5"><Label>湿度 (%)</Label><Input type="number" value={form.humidity} onChange={e => setForm(p => ({ ...p, humidity: e.target.value }))} placeholder="如：55" /></div>
                  <div className="space-y-1.5"><Label>温度要求</Label><Input value={form.temperatureLimit} onChange={e => setForm(p => ({ ...p, temperatureLimit: e.target.value }))} placeholder="如：18-26℃" /></div>
                  <div className="space-y-1.5"><Label>湿度要求</Label><Input value={form.humidityLimit} onChange={e => setForm(p => ({ ...p, humidityLimit: e.target.value }))} placeholder="如：45-65%" /></div>
                  <div className="space-y-1.5"><Label>洁净级别</Label><Input value={form.cleanlinessLevel} onChange={e => setForm(p => ({ ...p, cleanlinessLevel: e.target.value }))} placeholder="如：十万级" /></div>
                  <div className="space-y-1.5"><Label>压差 (Pa)</Label><Input type="number" value={form.pressureDiff} onChange={e => setForm(p => ({ ...p, pressureDiff: e.target.value }))} placeholder="如：5" /></div>
                </div>
              </div>
            )}

            {form.recordType === "material_usage" && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">材料使用记录</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>材料编号</Label><Input value={form.materialCode} onChange={e => setForm(p => ({ ...p, materialCode: e.target.value }))} placeholder="材料编号" /></div>
                  <div className="space-y-1.5"><Label>材料名称</Label><Input value={form.materialName} onChange={e => setForm(p => ({ ...p, materialName: e.target.value }))} placeholder="材料名称" /></div>
                  <div className="space-y-1.5"><Label>材料规格</Label><Input value={form.materialSpec} onChange={e => setForm(p => ({ ...p, materialSpec: e.target.value }))} placeholder="规格" /></div>
                  <div className="space-y-1.5"><Label>材料批号</Label><Input value={form.materialBatchNo} onChange={e => setForm(p => ({ ...p, materialBatchNo: e.target.value }))} placeholder="批号" /></div>
                  <div className="space-y-1.5"><Label>领用数量</Label><Input type="number" value={form.issuedQty} onChange={e => setForm(p => ({ ...p, issuedQty: e.target.value }))} placeholder="0" /></div>
                  <div className="space-y-1.5"><Label>实际用量</Label><Input type="number" value={form.usedQty} onChange={e => setForm(p => ({ ...p, usedQty: e.target.value }))} placeholder="0" /></div>
                  <div className="space-y-1.5"><Label>合格数量</Label><Input type="number" value={form.qualifiedQty} onChange={e => setForm(p => ({ ...p, qualifiedQty: e.target.value }))} placeholder="0" /></div>
                  <div className="space-y-1.5"><Label>用量单位</Label><Input value={form.usedUnit} onChange={e => setForm(p => ({ ...p, usedUnit: e.target.value }))} placeholder="如：个/套/kg" /></div>
                  <div className="space-y-1.5"><Label>放置区域</Label><Input value={form.storageArea} onChange={e => setForm(p => ({ ...p, storageArea: e.target.value }))} placeholder="放置区域" /></div>
                </div>
              </div>
            )}

            {form.recordType === "clean_room" && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">清场记录</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>清场人</Label><Input value={form.cleanedBy} onChange={e => setForm(p => ({ ...p, cleanedBy: e.target.value }))} placeholder="清场人姓名" /></div>
                  <div className="space-y-1.5"><Label>检查人</Label><Input value={form.checkedBy} onChange={e => setForm(p => ({ ...p, checkedBy: e.target.value }))} placeholder="检查人姓名" /></div>
                  <div className="space-y-1.5">
                    <Label>清场结果</Label>
                    <Select value={form.cleanResult || "none"} onValueChange={v => setForm(p => ({ ...p, cleanResult: v === "none" ? "" : v as any }))}>
                      <SelectTrigger><SelectValue placeholder="选择结果" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="pass">合格</SelectItem>
                        <SelectItem value="fail">不合格</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {form.recordType === "first_piece" && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">首件检验记录</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>检验依据文件</Label><Input value={form.firstPieceBasis} onChange={e => setForm(p => ({ ...p, firstPieceBasis: e.target.value }))} placeholder="文件编号" /></div>
                  <div className="space-y-1.5"><Label>文件版本</Label><Input value={form.firstPieceBasisVersion} onChange={e => setForm(p => ({ ...p, firstPieceBasisVersion: e.target.value }))} placeholder="版本号" /></div>
                  <div className="space-y-1.5"><Label>检验人</Label><Input value={form.firstPieceInspector} onChange={e => setForm(p => ({ ...p, firstPieceInspector: e.target.value }))} placeholder="检验人" /></div>
                  <div className="space-y-1.5">
                    <Label>检验结果</Label>
                    <Select value={form.firstPieceResult || "none"} onValueChange={v => setForm(p => ({ ...p, firstPieceResult: v === "none" ? "" : v as any }))}>
                      <SelectTrigger><SelectValue placeholder="选择结果" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="qualified">合格</SelectItem>
                        <SelectItem value="unqualified">不合格</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="abnormal">异常</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Textarea value={form.remark} onChange={e => setForm(p => ({ ...p, remark: e.target.value }))} placeholder="其他说明" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "提交中..." : "创建记录"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ── 详情弹窗 ── */}
      <DraggableDialog open={viewOpen} onOpenChange={setViewOpen}>
        <DraggableDialogContent className="max-w-3xl">
          {selected && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">生产记录详情</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <span className="font-mono">{selected.recordNo}</span>
                  <Badge variant="outline" className="text-xs">{recordTypeMap[selected.recordType] ?? selected.recordType}</Badge>
                  <Badge variant={statusMap[selected.status]?.variant ?? "outline"} className={getStatusSemanticClass(selected.status, statusMap[selected.status]?.label)}>
                    {statusMap[selected.status]?.label ?? selected.status}
                  </Badge>
                </p>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="产品名称">{selected.productName}</FieldRow>
                      <FieldRow label="型号规格">{selected.specification}</FieldRow>
                      <FieldRow label="生产批号">{selected.batchNo}</FieldRow>
                      <FieldRow label="生产指令号">{selected.productionOrderNo}</FieldRow>
                      <FieldRow label="记录日期">{formatDateValue(selected.recordDate)}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="车间名称">{selected.workshopName}</FieldRow>
                      <FieldRow label="生产班组">{selected.productionTeam}</FieldRow>
                      <FieldRow label="工序类别">{selected.processType}</FieldRow>
                      <FieldRow label="工序/工位">{selected.workstationName}</FieldRow>
                      <FieldRow label="操作人">{selected.operator}</FieldRow>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mt-1">
                    <FieldRow label="检验/审核人">{selected.inspector}</FieldRow>
                    <FieldRow label="计划/实际数量">{selected.plannedQty} / {selected.actualQty}</FieldRow>
                  </div>
                </div>

                {selected.recordType === "temperature_humidity" && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">温湿度记录</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="温度 (℃)">{selected.temperature}</FieldRow>
                        <FieldRow label="温度要求">{selected.temperatureLimit}</FieldRow>
                        <FieldRow label="洁净级别">{selected.cleanlinessLevel}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="湿度 (%)">{selected.humidity}</FieldRow>
                        <FieldRow label="湿度要求">{selected.humidityLimit}</FieldRow>
                        <FieldRow label="压差 (Pa)">{selected.pressureDiff}</FieldRow>
                      </div>
                    </div>
                  </div>
                )}

                {selected.recordType === "material_usage" && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">材料使用记录</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="材料编号">{selected.materialCode}</FieldRow>
                        <FieldRow label="材料名称">{selected.materialName}</FieldRow>
                        <FieldRow label="材料规格">{selected.materialSpec}</FieldRow>
                        <FieldRow label="材料批号">{selected.materialBatchNo}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="领用数量">{selected.issuedQty}</FieldRow>
                        <FieldRow label="实际用量">{selected.usedQty} {selected.usedUnit}</FieldRow>
                        <FieldRow label="合格数量">{selected.qualifiedQty}</FieldRow>
                        <FieldRow label="放置区域">{selected.storageArea}</FieldRow>
                      </div>
                    </div>
                  </div>
                )}

                {selected.recordType === "clean_room" && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">清场记录</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <FieldRow label="清场人">{selected.cleanedBy}</FieldRow>
                      <FieldRow label="检查人">{selected.checkedBy}</FieldRow>
                      <FieldRow label="清场结果">
                        {selected.cleanResult === "pass" ? <span className="text-green-600 font-medium">合格</span>
                          : selected.cleanResult === "fail" ? <span className="text-red-600 font-medium">不合格</span> : "-"}
                      </FieldRow>
                    </div>
                  </div>
                )}

                {selected.recordType === "first_piece" && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">首件检验记录</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="检验依据文件">{selected.firstPieceBasis}</FieldRow>
                        <FieldRow label="文件版本">{selected.firstPieceBasisVersion}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="检验人">{selected.firstPieceInspector}</FieldRow>
                        <FieldRow label="检验结果">
                          {selected.firstPieceResult === "qualified" ? <span className="text-green-600 font-medium">合格</span>
                            : selected.firstPieceResult === "unqualified" ? <span className="text-red-600 font-medium">不合格</span> : "-"}
                        </FieldRow>
                      </div>
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
              <div className="flex justify-end pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setViewOpen(false)}>关闭</Button>
              </div>
            </div>
          )}
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
