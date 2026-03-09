import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, Search, Eye, RefreshCw, CheckCircle, AlertTriangle, Clock, MoreHorizontal, FileText } from "lucide-react";
import { toast } from "sonner";

interface ReportRecord {
  id: number;
  reportNo: string;
  productName: string;
  udiDi: string;
  batchNo: string;
  platform: "NMPA" | "FDA" | "EUDAMED";
  reportType: "new" | "update" | "cancel";
  status: "pending" | "submitted" | "accepted" | "rejected";
  submittedAt?: string;
  acceptedAt?: string;
  operator: string;
  remark?: string;
}

const MOCK_RECORDS: ReportRecord[] = [
  { id: 1, reportNo: "RP-2024-001", productName: "一次性使用无菌注射器", udiDi: "06901234567890", batchNo: "20240301", platform: "NMPA", reportType: "new", status: "accepted", submittedAt: "2024-03-05", acceptedAt: "2024-03-08", operator: "张三" },
  { id: 2, reportNo: "RP-2024-002", productName: "一次性使用输液器", udiDi: "06901234567891", batchNo: "20240315", platform: "NMPA", reportType: "new", status: "submitted", submittedAt: "2024-03-18", operator: "李四" },
  { id: 3, reportNo: "RP-2024-003", productName: "医用外科口罩", udiDi: "06901234567892", batchNo: "20240320", platform: "NMPA", reportType: "update", status: "pending", operator: "王五" },
];

const statusMap = {
  pending:   { label: "待上报", icon: Clock, color: "text-orange-600 border-orange-300" },
  submitted: { label: "已提交", icon: Upload, color: "text-blue-600 border-blue-300" },
  accepted:  { label: "已受理", icon: CheckCircle, color: "text-green-600 border-green-200 bg-green-50" },
  rejected:  { label: "已驳回", icon: AlertTriangle, color: "text-red-600 border-red-200 bg-red-50" },
};

const platformMap = {
  NMPA: { label: "国家药监局", color: "bg-red-50 text-red-700 border-red-200" },
  FDA: { label: "FDA（美国）", color: "bg-blue-50 text-blue-700 border-blue-200" },
  EUDAMED: { label: "EUDAMED（欧盟）", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

const reportTypeMap = {
  new: "新增上报",
  update: "变更上报",
  cancel: "注销上报",
};

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-dashed border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{children ?? "-"}</span>
    </div>
  );
}

export default function UDIReportPage() {
  const [records, setRecords] = useState<ReportRecord[]>(MOCK_RECORDS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<ReportRecord | null>(null);
  const [form, setForm] = useState({
    productName: "", udiDi: "", batchNo: "",
    platform: "NMPA" as "NMPA" | "FDA" | "EUDAMED",
    reportType: "new" as "new" | "update" | "cancel",
    operator: "", remark: "",
  });

  const filtered = records.filter(r => {
    const matchSearch = !search || r.productName.includes(search) || r.udiDi.includes(search) || r.reportNo.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchPlatform = platformFilter === "all" || r.platform === platformFilter;
    return matchSearch && matchStatus && matchPlatform;
  });

  const total = records.length;
  const pending = records.filter(r => r.status === "pending").length;
  const submitted = records.filter(r => r.status === "submitted").length;
  const accepted = records.filter(r => r.status === "accepted").length;

  function handleCreate() {
    if (!form.productName || !form.udiDi) return toast.error("请填写产品名称和UDI-DI");
    const newRecord: ReportRecord = {
      id: Date.now(),
      reportNo: `RP-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, "0")}`,
      productName: form.productName, udiDi: form.udiDi, batchNo: form.batchNo,
      platform: form.platform, reportType: form.reportType,
      status: "pending", operator: form.operator || "当前用户",
      remark: form.remark || undefined,
    };
    setRecords(prev => [newRecord, ...prev]);
    toast.success("上报记录已创建");
    setFormOpen(false);
  }

  function handleSubmit(r: ReportRecord) {
    setRecords(prev => prev.map(x => x.id === r.id
      ? { ...x, status: "submitted" as const, submittedAt: new Date().toISOString().split("T")[0] }
      : x));
    toast.success("已提交上报");
  }

  return (
    <ERPLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="w-6 h-6" /> UDI上报记录
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">追踪UDI数据向NMPA/FDA/EUDAMED的上报状态</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            <FileText className="w-4 h-4" /> 新建上报记录
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "上报总数", value: total, icon: FileText, color: "text-gray-800" },
            { label: "待上报", value: pending, icon: Clock, color: "text-orange-500" },
            { label: "已提交", value: submitted, icon: Upload, color: "text-blue-600" },
            { label: "已受理", value: accepted, icon: CheckCircle, color: "text-green-600" },
          ].map(c => (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <c.icon className={`w-8 h-8 ${c.color}`} />
                <div>
                  <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索记录编号、产品名称、UDI-DI..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="全部平台" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              <SelectItem value="NMPA">国家药监局</SelectItem>
              <SelectItem value="FDA">FDA</SelectItem>
              <SelectItem value="EUDAMED">EUDAMED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="全部状态" /></SelectTrigger>
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
                <TableHead>产品名称</TableHead>
                <TableHead>UDI-DI</TableHead>
                <TableHead>上报平台</TableHead>
                <TableHead>上报类型</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无上报记录</TableCell></TableRow>
              ) : filtered.map(r => {
                const s = statusMap[r.status];
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-medium">{r.reportNo}</TableCell>
                    <TableCell>{r.productName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.udiDi}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${platformMap[r.platform].color}`}>
                        {platformMap[r.platform].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{reportTypeMap[r.reportType]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.submittedAt ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${s.color}`}>
                        {s.label}
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
                          {r.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleSubmit(r)} className="text-blue-600">
                              <Upload className="w-4 h-4 mr-2" />提交上报
                            </DropdownMenuItem>
                          )}
                          {r.status === "submitted" && (
                            <DropdownMenuItem onClick={() => {
                              setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: "accepted" as const, acceptedAt: new Date().toISOString().split("T")[0] } : x));
                              toast.success("已标记为受理");
                            }} className="text-green-600">
                              <CheckCircle className="w-4 h-4 mr-2" />标记受理
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

      {/* 新建弹窗 */}
      <DraggableDialog open={formOpen} onOpenChange={setFormOpen}>
        <DraggableDialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建上报记录</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>产品名称 <span className="text-red-500">*</span></Label>
                <Input value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} placeholder="产品名称" />
              </div>
              <div className="space-y-1.5">
                <Label>UDI-DI <span className="text-red-500">*</span></Label>
                <Input value={form.udiDi} onChange={e => setForm(p => ({ ...p, udiDi: e.target.value }))} placeholder="UDI-DI编码" />
              </div>
              <div className="space-y-1.5">
                <Label>生产批号</Label>
                <Input value={form.batchNo} onChange={e => setForm(p => ({ ...p, batchNo: e.target.value }))} placeholder="批号" />
              </div>
              <div className="space-y-1.5">
                <Label>上报平台</Label>
                <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NMPA">国家药监局（NMPA）</SelectItem>
                    <SelectItem value="FDA">FDA（美国）</SelectItem>
                    <SelectItem value="EUDAMED">EUDAMED（欧盟）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>上报类型</Label>
                <Select value={form.reportType} onValueChange={v => setForm(p => ({ ...p, reportType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">新增上报</SelectItem>
                    <SelectItem value="update">变更上报</SelectItem>
                    <SelectItem value="cancel">注销上报</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>经办人</Label>
                <Input value={form.operator} onChange={e => setForm(p => ({ ...p, operator: e.target.value }))} placeholder="经办人姓名" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleCreate}>创建记录</Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 详情弹窗 */}
      <DraggableDialog open={viewOpen} onOpenChange={setViewOpen}>
        <DraggableDialogContent className="max-w-md">
          {selected && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">上报记录详情</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm text-muted-foreground">{selected.reportNo}</span>
                  <Badge variant="outline" className={`text-xs ${statusMap[selected.status].color}`}>
                    {statusMap[selected.status].label}
                  </Badge>
                </div>
              </div>
              <div className="max-h-[55vh] overflow-y-auto space-y-1">
                <FieldRow label="产品名称">{selected.productName}</FieldRow>
                <FieldRow label="UDI-DI">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{selected.udiDi}</span>
                </FieldRow>
                <FieldRow label="生产批号">{selected.batchNo}</FieldRow>
                <FieldRow label="上报平台">
                  <Badge variant="outline" className={`text-xs ${platformMap[selected.platform].color}`}>
                    {platformMap[selected.platform].label}
                  </Badge>
                </FieldRow>
                <FieldRow label="上报类型">{reportTypeMap[selected.reportType]}</FieldRow>
                <FieldRow label="经办人">{selected.operator}</FieldRow>
                <FieldRow label="提交时间">{selected.submittedAt ?? "未提交"}</FieldRow>
                <FieldRow label="受理时间">{selected.acceptedAt ?? "-"}</FieldRow>
                {selected.remark && <FieldRow label="备注">{selected.remark}</FieldRow>}
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
