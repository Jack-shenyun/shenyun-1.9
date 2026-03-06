import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Thermometer, Plus, Search, Edit, Trash2, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getStatusSemanticClass } from "@/lib/statusStyle";

interface EnvironmentRecord {
  id: number;
  recordNo: string;
  roomName: string;
  roomCode: string;
  recordDate: string;
  recordTime: string;
  temperature: number;
  humidity: number;
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
  isNormal: boolean;
  abnormalDesc?: string;
  correctionAction?: string;
  recorder: string;
  productionOrderNo?: string;
  remark?: string;
}

const roomOptions = [
  { value: "cleanroom_10k", label: "万级洁净室" },
  { value: "cleanroom_100k", label: "十万级洁净室" },
  { value: "assembly", label: "装配车间" },
  { value: "packaging", label: "包装车间" },
  { value: "warehouse", label: "成品仓库" },
];

export default function ProductionEnvironmentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EnvironmentRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [records, setRecords] = useState<EnvironmentRecord[]>([
    {
      id: 1,
      recordNo: "ENV-20260306-001",
      roomName: "万级洁净室",
      roomCode: "cleanroom_10k",
      recordDate: "2026-03-06",
      recordTime: "08:00",
      temperature: 22.5,
      humidity: 45,
      tempMin: 18,
      tempMax: 26,
      humidityMin: 35,
      humidityMax: 65,
      isNormal: true,
      recorder: "张三",
      productionOrderNo: "PO-2026030101",
    },
  ]);

  const [formData, setFormData] = useState({
    roomCode: "",
    recordDate: new Date().toISOString().split("T")[0],
    recordTime: new Date().toTimeString().slice(0, 5),
    temperature: "",
    humidity: "",
    tempMin: "18",
    tempMax: "26",
    humidityMin: "35",
    humidityMax: "65",
    abnormalDesc: "",
    correctionAction: "",
    productionOrderNo: "",
    remark: "",
  });

  const checkNormal = (temp: number, humidity: number, tempMin: number, tempMax: number, humMin: number, humMax: number) => {
    return temp >= tempMin && temp <= tempMax && humidity >= humMin && humidity <= humMax;
  };

  const handleAdd = () => {
    setIsEditing(false);
    setFormData({
      roomCode: "",
      recordDate: new Date().toISOString().split("T")[0],
      recordTime: new Date().toTimeString().slice(0, 5),
      temperature: "",
      humidity: "",
      tempMin: "18",
      tempMax: "26",
      humidityMin: "35",
      humidityMax: "65",
      abnormalDesc: "",
      correctionAction: "",
      productionOrderNo: "",
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: EnvironmentRecord) => {
    setIsEditing(true);
    setSelectedRecord(record);
    setFormData({
      roomCode: record.roomCode,
      recordDate: record.recordDate,
      recordTime: record.recordTime,
      temperature: String(record.temperature),
      humidity: String(record.humidity),
      tempMin: String(record.tempMin),
      tempMax: String(record.tempMax),
      humidityMin: String(record.humidityMin),
      humidityMax: String(record.humidityMax),
      abnormalDesc: record.abnormalDesc || "",
      correctionAction: record.correctionAction || "",
      productionOrderNo: record.productionOrderNo || "",
      remark: record.remark || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.roomCode || !formData.temperature || !formData.humidity) {
      toast.error("请填写必填字段");
      return;
    }
    const temp = parseFloat(formData.temperature);
    const hum = parseFloat(formData.humidity);
    const tempMin = parseFloat(formData.tempMin);
    const tempMax = parseFloat(formData.tempMax);
    const humMin = parseFloat(formData.humidityMin);
    const humMax = parseFloat(formData.humidityMax);
    const isNormal = checkNormal(temp, hum, tempMin, tempMax, humMin, humMax);
    const roomLabel = roomOptions.find(r => r.value === formData.roomCode)?.label || formData.roomCode;

    if (isEditing && selectedRecord) {
      setRecords(prev => prev.map(r => r.id === selectedRecord.id ? {
        ...r, ...formData, roomName: roomLabel,
        temperature: temp, humidity: hum,
        tempMin, tempMax, humidityMin: humMin, humidityMax: humMax, isNormal,
      } : r));
      toast.success("记录已更新");
    } else {
      const newRecord: EnvironmentRecord = {
        id: Date.now(),
        recordNo: `ENV-${formData.recordDate.replace(/-/g, "")}-${String(records.length + 1).padStart(3, "0")}`,
        roomName: roomLabel,
        roomCode: formData.roomCode,
        recordDate: formData.recordDate,
        recordTime: formData.recordTime,
        temperature: temp,
        humidity: hum,
        tempMin, tempMax,
        humidityMin: humMin, humidityMax: humMax,
        isNormal,
        abnormalDesc: formData.abnormalDesc || undefined,
        correctionAction: formData.correctionAction || undefined,
        recorder: "当前用户",
        productionOrderNo: formData.productionOrderNo || undefined,
        remark: formData.remark || undefined,
      };
      setRecords(prev => [newRecord, ...prev]);
      if (!isNormal) toast.warning("⚠️ 温湿度超出正常范围，请及时处理！");
      else toast.success("环境记录已保存");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success("记录已删除");
  };

  const filtered = records.filter(r =>
    r.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productionOrderNo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const abnormalCount = records.filter(r => !r.isNormal).length;
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Thermometer className="h-6 w-6" />
              生产环境管理
            </h1>
            <p className="text-muted-foreground mt-1">记录和监控生产车间温湿度等环境参数</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />新增记录
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{records.length}</div>
            <div className="text-sm text-muted-foreground">总记录数</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{records.filter(r => r.isNormal).length}</div>
            <div className="text-sm text-muted-foreground">正常</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{abnormalCount}</div>
            <div className="text-sm text-muted-foreground">异常</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{roomOptions.length}</div>
            <div className="text-sm text-muted-foreground">监控区域</div>
          </CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索记录编号、车间名称、生产指令..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">记录编号</TableHead>
                <TableHead className="text-center font-bold">车间/区域</TableHead>
                <TableHead className="text-center font-bold">记录时间</TableHead>
                <TableHead className="text-center font-bold">温度(℃)</TableHead>
                <TableHead className="text-center font-bold">湿度(%)</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">关联指令</TableHead>
                <TableHead className="text-center font-bold">记录人</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="text-center font-mono text-sm">{record.recordNo}</TableCell>
                  <TableCell className="text-center">{record.roomName}</TableCell>
                  <TableCell className="text-center">{record.recordDate} {record.recordTime}</TableCell>
                  <TableCell className="text-center font-medium">
                    <span className={record.temperature < record.tempMin || record.temperature > record.tempMax ? "text-red-600" : ""}>
                      {record.temperature}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    <span className={record.humidity < record.humidityMin || record.humidity > record.humidityMax ? "text-red-600" : ""}>
                      {record.humidity}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {record.isNormal ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />正常</Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />异常</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">{record.productionOrderNo || "-"}</TableCell>
                  <TableCell className="text-center">{record.recorder}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedRecord(record); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 新增/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑环境记录" : "新增环境记录"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>车间/区域 *</Label>
                  <Select value={formData.roomCode} onValueChange={v => setFormData({ ...formData, roomCode: v })}>
                    <SelectTrigger><SelectValue placeholder="选择区域" /></SelectTrigger>
                    <SelectContent>{roomOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>关联生产指令</Label>
                  <Input value={formData.productionOrderNo} onChange={e => setFormData({ ...formData, productionOrderNo: e.target.value })} placeholder="如: PO-2026030101" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>记录日期 *</Label>
                  <Input type="date" value={formData.recordDate} onChange={e => setFormData({ ...formData, recordDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>记录时间 *</Label>
                  <Input type="time" value={formData.recordTime} onChange={e => setFormData({ ...formData, recordTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>温度(℃) * <span className="text-muted-foreground text-xs">范围: {formData.tempMin}~{formData.tempMax}</span></Label>
                  <Input type="number" step="0.1" value={formData.temperature} onChange={e => setFormData({ ...formData, temperature: e.target.value })} placeholder="如: 22.5" />
                </div>
                <div className="space-y-2">
                  <Label>湿度(%) * <span className="text-muted-foreground text-xs">范围: {formData.humidityMin}~{formData.humidityMax}</span></Label>
                  <Input type="number" step="0.1" value={formData.humidity} onChange={e => setFormData({ ...formData, humidity: e.target.value })} placeholder="如: 45" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>温度范围(℃)</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={formData.tempMin} onChange={e => setFormData({ ...formData, tempMin: e.target.value })} placeholder="最小" />
                    <Input type="number" value={formData.tempMax} onChange={e => setFormData({ ...formData, tempMax: e.target.value })} placeholder="最大" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>湿度范围(%)</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={formData.humidityMin} onChange={e => setFormData({ ...formData, humidityMin: e.target.value })} placeholder="最小" />
                    <Input type="number" value={formData.humidityMax} onChange={e => setFormData({ ...formData, humidityMax: e.target.value })} placeholder="最大" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>异常描述</Label>
                <Textarea value={formData.abnormalDesc} onChange={e => setFormData({ ...formData, abnormalDesc: e.target.value })} placeholder="如有异常，请描述具体情况" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>纠正措施</Label>
                <Textarea value={formData.correctionAction} onChange={e => setFormData({ ...formData, correctionAction: e.target.value })} placeholder="针对异常采取的纠正措施" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={e => setFormData({ ...formData, remark: e.target.value })} rows={2} />
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
    {selectedRecord && (
      <div className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">环境记录详情</h2>
          <p className="text-sm text-muted-foreground">
            {selectedRecord.recordNo}
            <Badge variant={selectedRecord.isNormal ? "outline" : "destructive"} className={`ml-2 ${selectedRecord.isNormal ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              {selectedRecord.isNormal ? '正常' : '异常'}
            </Badge>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="车间/区域">{selectedRecord.roomName}</FieldRow>
                <FieldRow label="记录时间">{selectedRecord.recordDate} {selectedRecord.recordTime}</FieldRow>
                <FieldRow label="记录人">{selectedRecord.recorder}</FieldRow>
              </div>
              <div>
                <FieldRow label="关联指令">{selectedRecord.productionOrderNo || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">环境参数</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="温度">{selectedRecord.temperature} ℃</FieldRow>
                <FieldRow label="温度范围">{selectedRecord.tempMin} ~ {selectedRecord.tempMax} ℃</FieldRow>
              </div>
              <div>
                <FieldRow label="湿度">{selectedRecord.humidity} %</FieldRow>
                <FieldRow label="湿度范围">{selectedRecord.humidityMin} ~ {selectedRecord.humidityMax} %</FieldRow>
              </div>
            </div>
          </div>

          {!selectedRecord.isNormal && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">异常与纠正</h3>
              {selectedRecord.abnormalDesc && (
                <div className="mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">异常描述</p>
                  <p className="text-sm text-red-600 bg-muted/40 rounded-lg px-4 py-3 mt-1">{selectedRecord.abnormalDesc}</p>
                </div>
              )}
              {selectedRecord.correctionAction && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">纠正措施</p>
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 mt-1">{selectedRecord.correctionAction}</p>
                </div>
              )}
            </div>
          )}

          {selectedRecord.remark && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remark}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
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
