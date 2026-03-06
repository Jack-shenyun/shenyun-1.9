import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ClipboardList, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, CheckCircle, AlertTriangle,
  Thermometer, Package, Wind, Star,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

type RecordType = "general" | "temperature_humidity" | "material_usage" | "clean_room" | "first_piece";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  in_progress: { label: "生产中", variant: "default" },
  completed:   { label: "已完成", variant: "secondary" },
  abnormal:    { label: "异常",   variant: "destructive" },
};

const recordTypeMap: Record<RecordType, { label: string; icon: any; color: string }> = {
  general:             { label: "通用记录",   icon: ClipboardList, color: "text-gray-600" },
  temperature_humidity:{ label: "温湿度记录", icon: Thermometer,   color: "text-blue-600" },
  material_usage:      { label: "材料使用记录",icon: Package,       color: "text-green-600" },
  clean_room:          { label: "清场记录",   icon: Wind,          color: "text-purple-600" },
  first_piece:         { label: "首件检验记录",icon: Star,          color: "text-amber-600" },
};

const emptyForm = {
  recordNo: "",
  recordType: "general" as RecordType,
  productionOrderId: "",
  productionOrderNo: "",
  productId: "",
  productName: "",
  batchNo: "",
  workstationName: "",
  recordDate: "",
  plannedQty: "",
  actualQty: "",
  scrapQty: "0",
  status: "in_progress" as "in_progress" | "completed" | "abnormal",
  remark: "",
  // 温湿度
  temperature: "",
  humidity: "",
  temperatureLimit: "",
  humidityLimit: "",
  // 材料使用
  materialCode: "",
  materialName: "",
  materialSpec: "",
  usedQty: "",
  usedUnit: "",
  materialBatchNo: "",
  // 清场
  cleanedBy: "",
  checkedBy: "",
  cleanResult: "" as "" | "pass" | "fail",
  // 首件检验
  firstPieceResult: "" as "" | "qualified" | "unqualified",
  firstPieceInspector: "",
};

export default function ProductionRecordPage() {
  const { canDelete } = usePermission();
  const { data: records = [], isLoading, refetch } = trpc.productionRecords.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});

  const createMutation = trpc.productionRecords.create.useMutation({
    onSuccess: () => { refetch(); toast.success("生产记录单已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.productionRecords.update.useMutation({
    onSuccess: () => { refetch(); toast.success("记录已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.productionRecords.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("记录已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const allRecords = records as any[];

  const getFilteredByTab = (tab: string) => {
    return allRecords.filter((r) => {
      const matchSearch = !searchTerm ||
        String(r.recordNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchType = tab === "all" || r.recordType === tab;
      return matchSearch && matchStatus && matchType;
    });
  };

  const genNo = (type: RecordType = "general") => {
    const prefix: Record<RecordType, string> = {
      general: "PR", temperature_humidity: "TH", material_usage: "MU", clean_room: "CR", first_piece: "FP",
    };
    const now = new Date();
    return `${prefix[type]}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({ ...emptyForm, recordNo: genNo("general"), recordDate: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  };

  const handleRecordTypeChange = (type: RecordType) => {
    setFormData((f) => ({ ...f, recordType: type, recordNo: genNo(type) }));
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      recordNo: record.recordNo,
      recordType: record.recordType || "general",
      productionOrderId: record.productionOrderId ? String(record.productionOrderId) : "",
      productionOrderNo: record.productionOrderNo || "",
      productId: record.productId ? String(record.productId) : "",
      productName: record.productName || "",
      batchNo: record.batchNo || "",
      workstationName: record.workstationName || "",
      recordDate: record.recordDate ? String(record.recordDate).split("T")[0] : "",
      plannedQty: record.plannedQty || "",
      actualQty: record.actualQty || "",
      scrapQty: record.scrapQty || "0",
      status: record.status || "in_progress",
      remark: record.remark || "",
      temperature: record.temperature || "",
      humidity: record.humidity || "",
      temperatureLimit: record.temperatureLimit || "",
      humidityLimit: record.humidityLimit || "",
      materialCode: record.materialCode || "",
      materialName: record.materialName || "",
      materialSpec: record.materialSpec || "",
      usedQty: record.usedQty || "",
      usedUnit: record.usedUnit || "",
      materialBatchNo: record.materialBatchNo || "",
      cleanedBy: record.cleanedBy || "",
      checkedBy: record.checkedBy || "",
      cleanResult: record.cleanResult || "",
      firstPieceResult: record.firstPieceResult || "",
      firstPieceInspector: record.firstPieceInspector || "",
    });
    setDialogOpen(true);
  };

  const handleView = (record: any) => { setViewingRecord(record); setViewDialogOpen(true); };
  const handleDelete = (record: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: record.id });
  };

  const handleProductionOrderChange = (poId: string) => {
    const po = (productionOrders as any[]).find((p) => String(p.id) === poId);
    setFormData((f) => ({
      ...f, productionOrderId: poId, productionOrderNo: po?.orderNo || "",
      productId: po?.productId ? String(po.productId) : f.productId,
      batchNo: po?.batchNo || f.batchNo, plannedQty: po?.plannedQty || f.plannedQty,
    }));
  };

  const handleProductChange = (productId: string) => {
    const product = (products as any[]).find((p) => String(p.id) === productId);
    setFormData((f) => ({ ...f, productId, productName: product?.name || "" }));
  };

  const handleSubmit = () => {
    if (!formData.recordNo) { toast.error("请填写记录单号"); return; }
    const payload: any = {
      recordNo: formData.recordNo,
      recordType: formData.recordType,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      productId: formData.productId ? Number(formData.productId) : undefined,
      productName: formData.productName || undefined,
      batchNo: formData.batchNo || undefined,
      workstationName: formData.workstationName || undefined,
      recordDate: formData.recordDate || undefined,
      plannedQty: formData.plannedQty || undefined,
      actualQty: formData.actualQty || undefined,
      scrapQty: formData.scrapQty || "0",
      status: formData.status,
      remark: formData.remark || undefined,
    };
    if (formData.recordType === "temperature_humidity") {
      payload.temperature = formData.temperature || undefined;
      payload.humidity = formData.humidity || undefined;
      payload.temperatureLimit = formData.temperatureLimit || undefined;
      payload.humidityLimit = formData.humidityLimit || undefined;
    }
    if (formData.recordType === "material_usage") {
      payload.materialCode = formData.materialCode || undefined;
      payload.materialName = formData.materialName || undefined;
      payload.materialSpec = formData.materialSpec || undefined;
      payload.usedQty = formData.usedQty || undefined;
      payload.usedUnit = formData.usedUnit || undefined;
      payload.materialBatchNo = formData.materialBatchNo || undefined;
    }
    if (formData.recordType === "clean_room") {
      payload.cleanedBy = formData.cleanedBy || undefined;
      payload.checkedBy = formData.checkedBy || undefined;
      payload.cleanResult = formData.cleanResult || undefined;
    }
    if (formData.recordType === "first_piece") {
      payload.firstPieceResult = formData.firstPieceResult || undefined;
      payload.firstPieceInspector = formData.firstPieceInspector || undefined;
    }
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const counts = {
    all: allRecords.length,
    temperature_humidity: allRecords.filter((r) => r.recordType === "temperature_humidity").length,
    material_usage: allRecords.filter((r) => r.recordType === "material_usage").length,
    clean_room: allRecords.filter((r) => r.recordType === "clean_room").length,
    first_piece: allRecords.filter((r) => r.recordType === "first_piece").length,
  };

  const renderTable = (tab: string) => {
    const filtered = getFilteredByTab(tab);
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>记录单号</TableHead>
                <TableHead>记录类型</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>批号</TableHead>
                {tab === "temperature_humidity" && <><TableHead>温度(℃)</TableHead><TableHead>湿度(%)</TableHead></>}
                {tab === "material_usage" && <><TableHead>材料名称</TableHead><TableHead>用量</TableHead><TableHead>材料批号</TableHead></>}
                {tab === "clean_room" && <><TableHead>清场人</TableHead><TableHead>检查人</TableHead><TableHead>清场结果</TableHead></>}
                {tab === "first_piece" && <><TableHead>检验人</TableHead><TableHead>检验结果</TableHead></>}
                {tab === "all" && <><TableHead className="text-right">实际数量</TableHead><TableHead className="text-right">报废数量</TableHead></>}
                <TableHead>记录日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无记录</TableCell></TableRow>
              ) : filtered.map((record: any) => {
                const typeInfo = recordTypeMap[record.recordType as RecordType] || recordTypeMap.general;
                const Icon = typeInfo.icon;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium font-mono">{record.recordNo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Icon className={`h-3.5 w-3.5 ${typeInfo.color}`} />
                        <span className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>{record.productName || "-"}</TableCell>
                    <TableCell className="font-mono">{record.batchNo || "-"}</TableCell>
                    {tab === "temperature_humidity" && <><TableCell>{record.temperature ?? "-"}</TableCell><TableCell>{record.humidity ?? "-"}</TableCell></>}
                    {tab === "material_usage" && <><TableCell>{record.materialName || "-"}</TableCell><TableCell>{record.usedQty ? `${record.usedQty} ${record.usedUnit || ""}` : "-"}</TableCell><TableCell className="font-mono">{record.materialBatchNo || "-"}</TableCell></>}
                    {tab === "clean_room" && <><TableCell>{record.cleanedBy || "-"}</TableCell><TableCell>{record.checkedBy || "-"}</TableCell><TableCell>{record.cleanResult === "pass" ? <Badge variant="secondary" className="text-green-600">通过</Badge> : record.cleanResult === "fail" ? <Badge variant="destructive">不通过</Badge> : "-"}</TableCell></>}
                    {tab === "first_piece" && <><TableCell>{record.firstPieceInspector || "-"}</TableCell><TableCell>{record.firstPieceResult === "qualified" ? <Badge variant="secondary" className="text-green-600">合格</Badge> : record.firstPieceResult === "unqualified" ? <Badge variant="destructive">不合格</Badge> : "-"}</TableCell></>}
                    {tab === "all" && <><TableCell className="text-right">{record.actualQty || "-"}</TableCell><TableCell className="text-right">{record.scrapQty || "0"}</TableCell></>}
                    <TableCell>{record.recordDate ? String(record.recordDate).split("T")[0] : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[record.status]?.variant || "outline"}>{statusMap[record.status]?.label || record.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(record)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                          {record.status === "in_progress" && (
                            <>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: record.id, data: { status: "completed" } })}><CheckCircle className="h-4 w-4 mr-2" />标记完成</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: record.id, data: { status: "abnormal" } })} className="text-destructive"><AlertTriangle className="h-4 w-4 mr-2" />标记异常</DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDelete(record)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />删除</DropdownMenuItem>
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
    );
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">生产记录管理</h2>
              <p className="text-sm text-muted-foreground">统一录入、按类型查询的生产过程记录</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />新建记录单</Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">全部记录</p><p className="text-2xl font-bold">{counts.all}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3 text-blue-600" />温湿度</p><p className="text-2xl font-bold text-blue-600">{counts.temperature_humidity}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3 text-green-600" />材料使用</p><p className="text-2xl font-bold text-green-600">{counts.material_usage}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><Wind className="h-3 w-3 text-purple-600" />清场</p><p className="text-2xl font-bold text-purple-600">{counts.clean_room}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-amber-600" />首件检验</p><p className="text-2xl font-bold text-amber-600">{counts.first_piece}</p></CardContent></Card>
        </div>

        {/* 搜索筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索记录单号、产品名称、批号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="in_progress">生产中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="abnormal">异常</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 分类 Tab 视图 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">全部记录</TabsTrigger>
            <TabsTrigger value="temperature_humidity" className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" />温湿度</TabsTrigger>
            <TabsTrigger value="material_usage" className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />材料使用</TabsTrigger>
            <TabsTrigger value="clean_room" className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" />清场</TabsTrigger>
            <TabsTrigger value="first_piece" className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />首件检验</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderTable("all")}</TabsContent>
          <TabsContent value="temperature_humidity">{renderTable("temperature_humidity")}</TabsContent>
          <TabsContent value="material_usage">{renderTable("material_usage")}</TabsContent>
          <TabsContent value="clean_room">{renderTable("clean_room")}</TabsContent>
          <TabsContent value="first_piece">{renderTable("first_piece")}</TabsContent>
        </Tabs>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRecord ? "编辑生产记录单" : "新建生产记录单"}</DialogTitle>
              <DialogDescription>统一录入各类生产过程记录</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* 记录类型 */}
              <div className="space-y-2">
                <Label>记录类型 *</Label>
                <Select value={formData.recordType} onValueChange={(v) => handleRecordTypeChange(v as RecordType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">通用记录</SelectItem>
                    <SelectItem value="temperature_humidity">温湿度记录</SelectItem>
                    <SelectItem value="material_usage">材料使用记录</SelectItem>
                    <SelectItem value="clean_room">清场记录</SelectItem>
                    <SelectItem value="first_piece">首件检验记录</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 基础字段 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>记录单号 *</Label>
                  <Input value={formData.recordNo} onChange={(e) => setFormData({ ...formData, recordNo: e.target.value })} readOnly={!!editingRecord} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>记录日期</Label>
                  <Input type="date" value={formData.recordDate} onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>关联生产指令</Label>
                <Select value={formData.productionOrderId || "__NONE__"} onValueChange={(v) => handleProductionOrderChange(v === "__NONE__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="选择生产指令（可选）" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">不关联</SelectItem>
                    {(productionOrders as any[]).map((po: any) => (
                      <SelectItem key={po.id} value={String(po.id)}>{po.orderNo} {po.batchNo ? `[${po.batchNo}]` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品</Label>
                  <Select value={formData.productId} onValueChange={handleProductChange}>
                    <SelectTrigger><SelectValue placeholder="选择产品" /></SelectTrigger>
                    <SelectContent>
                      {(products as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>生产批号</Label>
                  <Input value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} placeholder="批号" className="font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>工序/工位</Label>
                <Input value={formData.workstationName} onChange={(e) => setFormData({ ...formData, workstationName: e.target.value })} placeholder="如：装配工序、检验工序" />
              </div>

              {/* 通用数量字段（通用/清场/首件显示） */}
              {(formData.recordType === "general" || formData.recordType === "clean_room" || formData.recordType === "first_piece") && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>计划数量</Label><Input type="number" value={formData.plannedQty} onChange={(e) => setFormData({ ...formData, plannedQty: e.target.value })} /></div>
                  <div className="space-y-2"><Label>实际数量</Label><Input type="number" value={formData.actualQty} onChange={(e) => setFormData({ ...formData, actualQty: e.target.value })} /></div>
                  <div className="space-y-2"><Label>报废数量</Label><Input type="number" value={formData.scrapQty} onChange={(e) => setFormData({ ...formData, scrapQty: e.target.value })} /></div>
                </div>
              )}

              {/* 温湿度专项字段 */}
              {formData.recordType === "temperature_humidity" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="space-y-2"><Label className="text-blue-700">温度 (℃)</Label><Input type="number" step="0.1" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} placeholder="如: 22.5" /></div>
                  <div className="space-y-2"><Label className="text-blue-700">湿度 (%)</Label><Input type="number" step="0.1" value={formData.humidity} onChange={(e) => setFormData({ ...formData, humidity: e.target.value })} placeholder="如: 55.0" /></div>
                  <div className="space-y-2"><Label className="text-blue-700">温度限制要求</Label><Input value={formData.temperatureLimit} onChange={(e) => setFormData({ ...formData, temperatureLimit: e.target.value })} placeholder="如: 18-26℃" /></div>
                  <div className="space-y-2"><Label className="text-blue-700">湿度限制要求</Label><Input value={formData.humidityLimit} onChange={(e) => setFormData({ ...formData, humidityLimit: e.target.value })} placeholder="如: 45-65%" /></div>
                </div>
              )}

              {/* 材料使用专项字段 */}
              {formData.recordType === "material_usage" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="space-y-2"><Label className="text-green-700">材料编号</Label><Input value={formData.materialCode} onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })} placeholder="材料编号" /></div>
                  <div className="space-y-2"><Label className="text-green-700">材料名称</Label><Input value={formData.materialName} onChange={(e) => setFormData({ ...formData, materialName: e.target.value })} placeholder="材料名称" /></div>
                  <div className="space-y-2"><Label className="text-green-700">材料规格</Label><Input value={formData.materialSpec} onChange={(e) => setFormData({ ...formData, materialSpec: e.target.value })} placeholder="规格型号" /></div>
                  <div className="space-y-2"><Label className="text-green-700">材料批号</Label><Input value={formData.materialBatchNo} onChange={(e) => setFormData({ ...formData, materialBatchNo: e.target.value })} placeholder="材料批号" className="font-mono" /></div>
                  <div className="space-y-2"><Label className="text-green-700">实际用量</Label><Input type="number" value={formData.usedQty} onChange={(e) => setFormData({ ...formData, usedQty: e.target.value })} placeholder="用量" /></div>
                  <div className="space-y-2"><Label className="text-green-700">用量单位</Label><Input value={formData.usedUnit} onChange={(e) => setFormData({ ...formData, usedUnit: e.target.value })} placeholder="如: 个、kg、m" /></div>
                </div>
              )}

              {/* 清场专项字段 */}
              {formData.recordType === "clean_room" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="space-y-2"><Label className="text-purple-700">清场人</Label><Input value={formData.cleanedBy} onChange={(e) => setFormData({ ...formData, cleanedBy: e.target.value })} placeholder="清场人姓名" /></div>
                  <div className="space-y-2"><Label className="text-purple-700">检查人</Label><Input value={formData.checkedBy} onChange={(e) => setFormData({ ...formData, checkedBy: e.target.value })} placeholder="检查人姓名" /></div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-purple-700">清场结果</Label>
                    <Select value={formData.cleanResult} onValueChange={(v) => setFormData({ ...formData, cleanResult: v as any })}>
                      <SelectTrigger><SelectValue placeholder="选择清场结果" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">通过</SelectItem>
                        <SelectItem value="fail">不通过</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 首件检验专项字段 */}
              {formData.recordType === "first_piece" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="space-y-2"><Label className="text-amber-700">检验人</Label><Input value={formData.firstPieceInspector} onChange={(e) => setFormData({ ...formData, firstPieceInspector: e.target.value })} placeholder="检验人姓名" /></div>
                  <div className="space-y-2">
                    <Label className="text-amber-700">检验结果</Label>
                    <Select value={formData.firstPieceResult} onValueChange={(v) => setFormData({ ...formData, firstPieceResult: v as any })}>
                      <SelectTrigger><SelectValue placeholder="选择检验结果" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualified">合格</SelectItem>
                        <SelectItem value="unqualified">不合格</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">生产中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="abnormal">异常</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? "保存修改" : "创建记录单"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情 */}
        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>生产记录详情</DialogTitle>
              <DialogDescription>{viewingRecord?.recordNo}</DialogDescription>
            </DialogHeader>
            {viewingRecord && (
              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-semibold">{viewingRecord.productName || `产品#${viewingRecord.productId}`}</p>
                    <p className="text-sm text-muted-foreground">批号：{viewingRecord.batchNo || "-"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusMap[viewingRecord.status]?.variant || "outline"}>{statusMap[viewingRecord.status]?.label || viewingRecord.status}</Badge>
                    {viewingRecord.recordType && (
                      <span className={`text-xs ${recordTypeMap[viewingRecord.recordType as RecordType]?.color || ""}`}>
                        {recordTypeMap[viewingRecord.recordType as RecordType]?.label || viewingRecord.recordType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground">关联生产指令</p><p className="font-medium">{viewingRecord.productionOrderNo || "-"}</p></div>
                  <div><p className="text-muted-foreground">工序/工位</p><p className="font-medium">{viewingRecord.workstationName || "-"}</p></div>
                  <div><p className="text-muted-foreground">计划数量</p><p className="font-medium">{viewingRecord.plannedQty || "-"}</p></div>
                  <div><p className="text-muted-foreground">实际数量</p><p className="font-medium">{viewingRecord.actualQty || "-"}</p></div>
                  <div><p className="text-muted-foreground">报废数量</p><p className="font-medium">{viewingRecord.scrapQty || "0"}</p></div>
                  <div><p className="text-muted-foreground">记录日期</p><p className="font-medium">{viewingRecord.recordDate ? String(viewingRecord.recordDate).split("T")[0] : "-"}</p></div>
                  {viewingRecord.temperature && <div><p className="text-muted-foreground">温度</p><p className="font-medium">{viewingRecord.temperature}℃</p></div>}
                  {viewingRecord.humidity && <div><p className="text-muted-foreground">湿度</p><p className="font-medium">{viewingRecord.humidity}%</p></div>}
                  {viewingRecord.materialName && <div><p className="text-muted-foreground">材料名称</p><p className="font-medium">{viewingRecord.materialName}</p></div>}
                  {viewingRecord.usedQty && <div><p className="text-muted-foreground">用量</p><p className="font-medium">{viewingRecord.usedQty} {viewingRecord.usedUnit || ""}</p></div>}
                  {viewingRecord.cleanedBy && <div><p className="text-muted-foreground">清场人</p><p className="font-medium">{viewingRecord.cleanedBy}</p></div>}
                  {viewingRecord.cleanResult && <div><p className="text-muted-foreground">清场结果</p><p className="font-medium">{viewingRecord.cleanResult === "pass" ? "通过" : "不通过"}</p></div>}
                  {viewingRecord.firstPieceInspector && <div><p className="text-muted-foreground">首件检验人</p><p className="font-medium">{viewingRecord.firstPieceInspector}</p></div>}
                  {viewingRecord.firstPieceResult && <div><p className="text-muted-foreground">首件结果</p><p className="font-medium">{viewingRecord.firstPieceResult === "qualified" ? "合格" : "不合格"}</p></div>}
                </div>
                {viewingRecord.remark && (
                  <div><p className="text-sm text-muted-foreground mb-1">备注</p><p className="text-sm">{viewingRecord.remark}</p></div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
              <Button onClick={() => { setViewDialogOpen(false); if (viewingRecord) handleEdit(viewingRecord); }}>编辑</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
