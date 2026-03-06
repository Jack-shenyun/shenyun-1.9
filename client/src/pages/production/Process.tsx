import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Settings2, Plus, Search, Edit, Trash2, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface ProductionProcess {
  id: number;
  processCode: string;
  processName: string;
  processType: "assembly" | "inspection" | "packaging" | "sterilization" | "other";
  sortOrder: number;
  standardTime: number; // 标准工时（分钟）
  workstation: string;
  operator: string;
  qualityCheckRequired: boolean;
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
}

const processTypeMap: Record<string, { label: string; color: string }> = {
  assembly: { label: "装配", color: "text-blue-600 bg-blue-50" },
  inspection: { label: "检验", color: "text-purple-600 bg-purple-50" },
  packaging: { label: "包装", color: "text-teal-600 bg-teal-50" },
  sterilization: { label: "灭菌", color: "text-orange-600 bg-orange-50" },
  other: { label: "其他", color: "text-gray-600 bg-gray-50" },
};

export default function ProductionProcessPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductionProcess | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [processes, setProcesses] = useState<ProductionProcess[]>([
    { id: 1, processCode: "P001", processName: "来料检验", processType: "inspection", sortOrder: 1, standardTime: 30, workstation: "IQC检验台", operator: "质检员", qualityCheckRequired: true, description: "对原材料进行来料检验，确认规格和质量", status: "active", createdAt: "2026-01-01" },
    { id: 2, processCode: "P002", processName: "零件装配", processType: "assembly", sortOrder: 2, standardTime: 60, workstation: "装配线A", operator: "装配工", qualityCheckRequired: false, description: "按照BOM清单进行零件装配", status: "active", createdAt: "2026-01-01" },
    { id: 3, processCode: "P003", processName: "首件检验", processType: "inspection", sortOrder: 3, standardTime: 20, workstation: "IPQC检验台", operator: "质检员", qualityCheckRequired: true, description: "对首件产品进行全项检验", status: "active", createdAt: "2026-01-01" },
    { id: 4, processCode: "P004", processName: "成品包装", processType: "packaging", sortOrder: 4, standardTime: 15, workstation: "包装线", operator: "包装工", qualityCheckRequired: false, description: "按照包装规范进行成品包装", status: "active", createdAt: "2026-01-01" },
    { id: 5, processCode: "P005", processName: "灭菌处理", processType: "sterilization", sortOrder: 5, standardTime: 480, workstation: "灭菌室", operator: "灭菌员", qualityCheckRequired: true, description: "对包装后产品进行环氧乙烷灭菌处理", status: "active", createdAt: "2026-01-01" },
    { id: 6, processCode: "P006", processName: "出厂检验", processType: "inspection", sortOrder: 6, standardTime: 45, workstation: "OQC检验台", operator: "质检员", qualityCheckRequired: true, description: "对灭菌后产品进行出厂检验", status: "active", createdAt: "2026-01-01" },
  ]);

  const [formData, setFormData] = useState({
    processCode: "",
    processName: "",
    processType: "assembly" as ProductionProcess["processType"],
    sortOrder: "",
    standardTime: "",
    workstation: "",
    operator: "",
    qualityCheckRequired: false,
    description: "",
    status: "active" as "active" | "inactive",
  });

  const handleAdd = () => {
    setIsEditing(false);
    const nextOrder = Math.max(...processes.map(p => p.sortOrder), 0) + 1;
    setFormData({
      processCode: `P${String(processes.length + 1).padStart(3, "0")}`,
      processName: "",
      processType: "assembly",
      sortOrder: String(nextOrder),
      standardTime: "",
      workstation: "",
      operator: "",
      qualityCheckRequired: false,
      description: "",
      status: "active",
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: ProductionProcess) => {
    setIsEditing(true);
    setSelectedRecord(record);
    setFormData({
      processCode: record.processCode,
      processName: record.processName,
      processType: record.processType,
      sortOrder: String(record.sortOrder),
      standardTime: String(record.standardTime),
      workstation: record.workstation,
      operator: record.operator,
      qualityCheckRequired: record.qualityCheckRequired,
      description: record.description || "",
      status: record.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.processCode || !formData.processName || !formData.workstation) {
      toast.error("请填写必填字段");
      return;
    }
    if (isEditing && selectedRecord) {
      setProcesses(prev => prev.map(p => p.id === selectedRecord.id ? {
        ...p, ...formData,
        sortOrder: parseInt(formData.sortOrder) || p.sortOrder,
        standardTime: parseInt(formData.standardTime) || p.standardTime,
      } : p));
      toast.success("工序已更新");
    } else {
      const newProcess: ProductionProcess = {
        id: Date.now(),
        processCode: formData.processCode,
        processName: formData.processName,
        processType: formData.processType,
        sortOrder: parseInt(formData.sortOrder) || processes.length + 1,
        standardTime: parseInt(formData.standardTime) || 0,
        workstation: formData.workstation,
        operator: formData.operator,
        qualityCheckRequired: formData.qualityCheckRequired,
        description: formData.description || undefined,
        status: formData.status,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setProcesses(prev => [...prev, newProcess].sort((a, b) => a.sortOrder - b.sortOrder));
      toast.success("工序已添加");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
    toast.success("工序已删除");
  };

  const handleMoveUp = (id: number) => {
    setProcesses(prev => {
      const sorted = [...prev].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex(p => p.id === id);
      if (idx <= 0) return prev;
      const temp = sorted[idx].sortOrder;
      sorted[idx].sortOrder = sorted[idx - 1].sortOrder;
      sorted[idx - 1].sortOrder = temp;
      return [...sorted];
    });
  };

  const handleMoveDown = (id: number) => {
    setProcesses(prev => {
      const sorted = [...prev].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex(p => p.id === id);
      if (idx >= sorted.length - 1) return prev;
      const temp = sorted[idx].sortOrder;
      sorted[idx].sortOrder = sorted[idx + 1].sortOrder;
      sorted[idx + 1].sortOrder = temp;
      return [...sorted];
    });
  };

  const filtered = [...processes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(p =>
      p.processCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.workstation.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalStdTime = processes.filter(p => p.status === "active").reduce((sum, p) => sum + p.standardTime, 0);

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              生产工序管理
            </h1>
            <p className="text-muted-foreground mt-1">定义和维护生产流程中的标准工序</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />新增工序
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{processes.length}</div>
            <div className="text-sm text-muted-foreground">工序总数</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{processes.filter(p => p.status === "active").length}</div>
            <div className="text-sm text-muted-foreground">启用中</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{processes.filter(p => p.qualityCheckRequired).length}</div>
            <div className="text-sm text-muted-foreground">需质量检验</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{totalStdTime >= 60 ? `${Math.floor(totalStdTime / 60)}h${totalStdTime % 60}m` : `${totalStdTime}m`}</div>
            <div className="text-sm text-muted-foreground">标准总工时</div>
          </CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索工序编码、名称、工作站..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">序号</TableHead>
                <TableHead>工序编码</TableHead>
                <TableHead>工序名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>工作站</TableHead>
                <TableHead>操作人员</TableHead>
                <TableHead className="text-right">标准工时</TableHead>
                <TableHead>质检</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((process, idx) => (
                <TableRow key={process.id}>
                  <TableCell className="text-center font-bold text-muted-foreground">{process.sortOrder}</TableCell>
                  <TableCell className="font-mono">{process.processCode}</TableCell>
                  <TableCell className="font-medium">{process.processName}</TableCell>
                  <TableCell>
                    <Badge className={processTypeMap[process.processType]?.color || ""}>{processTypeMap[process.processType]?.label}</Badge>
                  </TableCell>
                  <TableCell>{process.workstation}</TableCell>
                  <TableCell>{process.operator}</TableCell>
                  <TableCell className="text-right">{process.standardTime >= 60 ? `${Math.floor(process.standardTime / 60)}h${process.standardTime % 60}m` : `${process.standardTime}min`}</TableCell>
                  <TableCell>{process.qualityCheckRequired ? <Badge className="bg-purple-50 text-purple-700">需检验</Badge> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                  <TableCell>
                    <Badge variant={process.status === "active" ? "default" : "outline"}>{process.status === "active" ? "启用" : "停用"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleMoveUp(process.id)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleMoveDown(process.id)} disabled={idx === filtered.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedRecord(process); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(process)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(process.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 新增/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑工序" : "新增工序"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>工序编码 *</Label>
                  <Input value={formData.processCode} onChange={e => setFormData({ ...formData, processCode: e.target.value })} placeholder="如: P001" />
                </div>
                <div className="space-y-2">
                  <Label>工序名称 *</Label>
                  <Input value={formData.processName} onChange={e => setFormData({ ...formData, processName: e.target.value })} placeholder="如: 零件装配" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>工序类型</Label>
                  <Select value={formData.processType} onValueChange={v => setFormData({ ...formData, processType: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assembly">装配</SelectItem>
                      <SelectItem value="inspection">检验</SelectItem>
                      <SelectItem value="packaging">包装</SelectItem>
                      <SelectItem value="sterilization">灭菌</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>排序序号</Label>
                  <Input type="number" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>工作站 *</Label>
                  <Input value={formData.workstation} onChange={e => setFormData({ ...formData, workstation: e.target.value })} placeholder="如: 装配线A" />
                </div>
                <div className="space-y-2">
                  <Label>操作人员</Label>
                  <Input value={formData.operator} onChange={e => setFormData({ ...formData, operator: e.target.value })} placeholder="如: 装配工" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>标准工时(分钟)</Label>
                  <Input type="number" value={formData.standardTime} onChange={e => setFormData({ ...formData, standardTime: e.target.value })} placeholder="如: 60" />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="qc" checked={formData.qualityCheckRequired} onChange={e => setFormData({ ...formData, qualityCheckRequired: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="qc">此工序需要质量检验</Label>
              </div>
              <div className="space-y-2">
                <Label>工序描述</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="描述该工序的操作要点和注意事项" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>保存</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>工序详情 — {selectedRecord?.processCode}</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">工序编码</span><p className="font-medium font-mono">{selectedRecord.processCode}</p></div>
                  <div><span className="text-muted-foreground">工序名称</span><p className="font-medium">{selectedRecord.processName}</p></div>
                  <div><span className="text-muted-foreground">类型</span><p><Badge className={processTypeMap[selectedRecord.processType]?.color}>{processTypeMap[selectedRecord.processType]?.label}</Badge></p></div>
                  <div><span className="text-muted-foreground">排序</span><p className="font-medium">{selectedRecord.sortOrder}</p></div>
                  <div><span className="text-muted-foreground">工作站</span><p className="font-medium">{selectedRecord.workstation}</p></div>
                  <div><span className="text-muted-foreground">操作人员</span><p className="font-medium">{selectedRecord.operator}</p></div>
                  <div><span className="text-muted-foreground">标准工时</span><p className="font-medium">{selectedRecord.standardTime >= 60 ? `${Math.floor(selectedRecord.standardTime / 60)}小时${selectedRecord.standardTime % 60}分钟` : `${selectedRecord.standardTime}分钟`}</p></div>
                  <div><span className="text-muted-foreground">质量检验</span><p className="font-medium">{selectedRecord.qualityCheckRequired ? "需要" : "不需要"}</p></div>
                  {selectedRecord.description && <div className="col-span-2"><span className="text-muted-foreground">工序描述</span><p className="font-medium">{selectedRecord.description}</p></div>}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
