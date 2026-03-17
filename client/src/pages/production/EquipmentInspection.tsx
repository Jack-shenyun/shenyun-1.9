import { useEffect, useMemo, useRef, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { defaultEquipmentRecords, normalizeEquipmentRecord, type Equipment } from "./Equipment";

interface EquipmentInspectionDetailItem {
  itemName: string;
  standard: string;
  method: string;
  result: string;
  abnormalDesc: string;
  actionRequired: string;
  remark: string;
}

interface EquipmentInspectionRecord {
  id: number;
  inspectionNo: string;
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentModel: string;
  equipmentLocation: string;
  equipmentDepartment: string;
  equipmentResponsible: string;
  inspectionDate: string;
  inspectionType: "daily" | "shift" | "weekly" | "monthly" | "special";
  inspector: string;
  reviewer: string;
  result: "normal" | "abnormal" | "shutdown";
  status: "draft" | "completed";
  detailItems: EquipmentInspectionDetailItem[];
  remark: string;
}

const PAGE_SIZE = 10;

const inspectionTypeMap: Record<EquipmentInspectionRecord["inspectionType"], string> = {
  daily: "日点检",
  shift: "班次点检",
  weekly: "周点检",
  monthly: "月点检",
  special: "专项点检",
};

const resultMap: Record<EquipmentInspectionRecord["result"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  normal: { label: "正常", variant: "default" },
  abnormal: { label: "异常", variant: "secondary" },
  shutdown: { label: "停机", variant: "destructive" },
};

const statusMap: Record<EquipmentInspectionRecord["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "草稿", variant: "outline" },
  completed: { label: "已完成", variant: "default" },
};

const createEmptyDetailItem = (): EquipmentInspectionDetailItem => ({
  itemName: "",
  standard: "",
  method: "",
  result: "",
  abnormalDesc: "",
  actionRequired: "",
  remark: "",
});

const toDateInputValue = (value?: string | Date | null) => {
  return formatDateValue(value) || "";
};

const buildNextInspectionNo = (records: EquipmentInspectionRecord[]) => {
  const year = new Date().getFullYear();
  const prefix = `DJ-${year}-`;
  const maxNo = records.reduce((max, record) => {
    const match = String(record.inspectionNo || "").match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) return max;
    return Math.max(max, Number(match[1] || 0));
  }, 0);
  return `${prefix}${String(maxNo + 1).padStart(4, "0")}`;
};

export default function EquipmentInspectionPage() {
  const { canDelete } = usePermission();
  const { data: inspectionData = [], isLoading, refetch } = trpc.equipmentInspections.list.useQuery();
  const { data: equipmentData = [] } = trpc.equipment.list.useQuery();
  const createMutation = trpc.equipmentInspections.create.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("点检记录已保存");
    },
  });
  const updateMutation = trpc.equipmentInspections.update.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("点检记录已更新");
    },
  });
  const deleteMutation = trpc.equipmentInspections.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("点检记录已删除");
    },
  });

  const inspections = useMemo<EquipmentInspectionRecord[]>(
    () => ((inspectionData as any[]) || []).map((record: any) => ({
      ...record,
      inspectionDate: toDateInputValue(record.inspectionDate),
      detailItems: Array.isArray(record.detailItems) ? record.detailItems : [],
    })),
    [inspectionData]
  );

  const equipmentRows = useMemo<Equipment[]>(
    () =>
      (((equipmentData as any[]) || []).length > 0
        ? (equipmentData as any[]).map(normalizeEquipmentRecord)
        : defaultEquipmentRecords) as Equipment[],
    [equipmentData]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [equipmentPickerOpen, setEquipmentPickerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EquipmentInspectionRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<EquipmentInspectionRecord | null>(null);
  const autoCreateHandledRef = useRef(false);
  const [formData, setFormData] = useState<EquipmentInspectionRecord>({
    id: 0,
    inspectionNo: "",
    equipmentId: 0,
    equipmentCode: "",
    equipmentName: "",
    equipmentModel: "",
    equipmentLocation: "",
    equipmentDepartment: "",
    equipmentResponsible: "",
    inspectionDate: "",
    inspectionType: "daily",
    inspector: "",
    reviewer: "",
    result: "normal",
    status: "draft",
    detailItems: [createEmptyDetailItem()],
    remark: "",
  });
  const selectedEquipment = useMemo(
    () => equipmentRows.find((item) => item.id === formData.equipmentId) || null,
    [equipmentRows, formData.equipmentId]
  );

  const filteredRecords = inspections.filter((record) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      String(record.inspectionNo || "").toLowerCase().includes(keyword) ||
      String(record.equipmentCode || "").toLowerCase().includes(keyword) ||
      String(record.equipmentName || "").toLowerCase().includes(keyword) ||
      String(record.inspector || "").toLowerCase().includes(keyword);
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesResult = resultFilter === "all" || record.result === resultFilter;
    return matchesSearch && matchesStatus && matchesResult;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, resultFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      id: 0,
      inspectionNo: buildNextInspectionNo(inspections),
      equipmentId: 0,
      equipmentCode: "",
      equipmentName: "",
      equipmentModel: "",
      equipmentLocation: "",
      equipmentDepartment: "",
      equipmentResponsible: "",
      inspectionDate: new Date().toISOString().slice(0, 10),
      inspectionType: "daily",
      inspector: "",
      reviewer: "",
      result: "normal",
      status: "draft",
      detailItems: [createEmptyDetailItem()],
      remark: "",
    });
    setDialogOpen(true);
  };

  useEffect(() => {
    if (autoCreateHandledRef.current || isLoading || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "new") return;
    autoCreateHandledRef.current = true;
    handleAdd();
    window.history.replaceState({}, "", window.location.pathname);
  }, [isLoading, inspections]);

  const handleEdit = (record: EquipmentInspectionRecord) => {
    setEditingRecord(record);
    setFormData({
      ...record,
      inspectionDate: toDateInputValue(record.inspectionDate),
      detailItems: record.detailItems.length > 0 ? record.detailItems.map((item) => ({ ...item })) : [createEmptyDetailItem()],
    });
    setDialogOpen(true);
  };

  const handleView = (record: EquipmentInspectionRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: EquipmentInspectionRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  const applyEquipment = (equipment: Equipment) => {
    setFormData((prev) => ({
      ...prev,
      equipmentId: equipment.id,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      equipmentModel: equipment.model,
      equipmentLocation: equipment.location,
      equipmentDepartment: equipment.department,
      equipmentResponsible: equipment.responsible,
    }));
    setEquipmentPickerOpen(false);
  };

  const updateDetailItem = (index: number, field: keyof EquipmentInspectionDetailItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      detailItems: prev.detailItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addDetailItem = () => {
    setFormData((prev) => ({
      ...prev,
      detailItems: [...prev.detailItems, createEmptyDetailItem()],
    }));
  };

  const removeDetailItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      detailItems: prev.detailItems.length > 1 ? prev.detailItems.filter((_, itemIndex) => itemIndex !== index) : [createEmptyDetailItem()],
    }));
  };

  const handleSubmit = () => {
    if (!formData.equipmentId || !formData.equipmentName) {
      toast.error("请先选择设备");
      return;
    }

    const payload = {
      inspectionNo: formData.inspectionNo,
      equipmentId: formData.equipmentId,
      equipmentCode: formData.equipmentCode,
      equipmentName: formData.equipmentName,
      equipmentModel: formData.equipmentModel,
      equipmentLocation: formData.equipmentLocation,
      equipmentDepartment: formData.equipmentDepartment,
      equipmentResponsible: formData.equipmentResponsible,
      inspectionDate: formData.inspectionDate,
      inspectionType: formData.inspectionType,
      inspector: formData.inspector,
      reviewer: formData.reviewer,
      result: formData.result,
      status: formData.status,
      detailItems: formData.detailItems.map((item) => ({ ...item })),
      remark: formData.remark,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalCount = inspections.length;
  const completedCount = inspections.filter((item) => item.status === "completed").length;
  const abnormalCount = inspections.filter((item) => item.result === "abnormal").length;
  const shutdownCount = inspections.filter((item) => item.result === "shutdown").length;

  const FieldRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{value == null || value === "" ? "-" : value}</span>
    </div>
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">设备点检</h2>
              <p className="text-sm text-muted-foreground">按设备建立点检记录，支持弹窗选择设备并自动带出设备信息</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增点检
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">点检总数</p><p className="text-2xl font-bold">{totalCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已完成</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">异常记录</p><p className="text-2xl font-bold text-amber-600">{abnormalCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">停机记录</p><p className="text-2xl font-bold text-red-600">{shutdownCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                  placeholder="搜索点检单号、设备编号、设备名称、点检人..."
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="结果" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部结果</SelectItem>
                  <SelectItem value="normal">正常</SelectItem>
                  <SelectItem value="abnormal">异常</SelectItem>
                  <SelectItem value="shutdown">停机</SelectItem>
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
                  <TableHead className="text-center font-bold">点检单号</TableHead>
                  <TableHead className="text-center font-bold">设备</TableHead>
                  <TableHead className="text-center font-bold">点检类型</TableHead>
                  <TableHead className="text-center font-bold">点检日期</TableHead>
                  <TableHead className="text-center font-bold">结果</TableHead>
                  <TableHead className="text-center font-bold">点检人</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      {isLoading ? "加载中..." : "暂无点检记录"}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center font-mono">{record.inspectionNo}</TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium">{record.equipmentName}</div>
                        <div className="text-xs text-muted-foreground">{record.equipmentCode || "-"}</div>
                      </TableCell>
                      <TableCell className="text-center">{inspectionTypeMap[record.inspectionType]}</TableCell>
                      <TableCell className="text-center">{formatDateValue(record.inspectionDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={resultMap[record.result].variant} className={getStatusSemanticClass(record.result, resultMap[record.result].label)}>
                          {resultMap[record.result].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{record.inspector || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[record.status].variant}>{statusMap[record.status].label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(record)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            {canDelete ? (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(record)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TablePaginationFooter total={filteredRecords.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? "编辑设备点检" : "新增设备点检"}</DialogTitle>
              <DialogDescription>选择设备后自动带出设备信息，再维护点检明细</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>点检单号</Label>
                  <Input value={formData.inspectionNo} onChange={(event) => setFormData({ ...formData, inspectionNo: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>点检日期</Label>
                  <DateTextInput value={formData.inspectionDate} onChange={(value) => setFormData({ ...formData, inspectionDate: value })} />
                </div>
                <div className="space-y-2">
                  <Label>点检类型</Label>
                  <Select value={formData.inspectionType} onValueChange={(value) => setFormData({ ...formData, inspectionType: value as EquipmentInspectionRecord["inspectionType"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">日点检</SelectItem>
                      <SelectItem value="shift">班次点检</SelectItem>
                      <SelectItem value="weekly">周点检</SelectItem>
                      <SelectItem value="monthly">月点检</SelectItem>
                      <SelectItem value="special">专项点检</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">设备信息</p>
                    <p className="text-sm text-muted-foreground">从设备管理中弹窗选择设备</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setEquipmentPickerOpen(true)}>
                    <Wrench className="h-4 w-4 mr-1" />
                    {formData.equipmentName ? "重新选择设备" : "选择设备"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">设备编号</div>
                    <div className="font-medium">{formData.equipmentCode || "-"}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">设备名称</div>
                    <div className="font-medium">{formData.equipmentName || "-"}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">型号规格</div>
                    <div className="font-medium">{formData.equipmentModel || "-"}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">安装位置</div>
                    <div className="font-medium">{formData.equipmentLocation || "-"}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">使用部门</div>
                    <div className="font-medium">{formData.equipmentDepartment || "-"}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">责任人</div>
                    <div className="font-medium">{formData.equipmentResponsible || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>点检要求</Label>
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm whitespace-pre-wrap min-h-[84px]">
                  {selectedEquipment?.inspectionRequirement || "该设备暂未维护点检要求"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>点检人</Label>
                  <Input value={formData.inspector} onChange={(event) => setFormData({ ...formData, inspector: event.target.value })} placeholder="点检人" />
                </div>
                <div className="space-y-2">
                  <Label>复核人</Label>
                  <Input value={formData.reviewer} onChange={(event) => setFormData({ ...formData, reviewer: event.target.value })} placeholder="复核人" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>点检结果</Label>
                  <Select value={formData.result} onValueChange={(value) => setFormData({ ...formData, result: value as EquipmentInspectionRecord["result"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="abnormal">异常</SelectItem>
                      <SelectItem value="shutdown">停机</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>单据状态</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as EquipmentInspectionRecord["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>点检明细</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addDetailItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    新增明细
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>点检项目</TableHead>
                        <TableHead>点检标准</TableHead>
                        <TableHead>点检方法</TableHead>
                        <TableHead>点检结果</TableHead>
                        <TableHead>异常描述</TableHead>
                        <TableHead>处理要求</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead className="w-[70px] text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.detailItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell><Input value={item.itemName} onChange={(event) => updateDetailItem(index, "itemName", event.target.value)} placeholder="如：电源/气压/外观" /></TableCell>
                          <TableCell><Input value={item.standard} onChange={(event) => updateDetailItem(index, "standard", event.target.value)} placeholder="标准要求" /></TableCell>
                          <TableCell><Input value={item.method} onChange={(event) => updateDetailItem(index, "method", event.target.value)} placeholder="点检方法" /></TableCell>
                          <TableCell><Input value={item.result} onChange={(event) => updateDetailItem(index, "result", event.target.value)} placeholder="结果" /></TableCell>
                          <TableCell><Input value={item.abnormalDesc} onChange={(event) => updateDetailItem(index, "abnormalDesc", event.target.value)} placeholder="异常描述" /></TableCell>
                          <TableCell><Input value={item.actionRequired} onChange={(event) => updateDetailItem(index, "actionRequired", event.target.value)} placeholder="处理要求" /></TableCell>
                          <TableCell><Input value={item.remark} onChange={(event) => updateDetailItem(index, "remark", event.target.value)} placeholder="备注" /></TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeDetailItem(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(event) => setFormData({ ...formData, remark: event.target.value })} rows={3} placeholder="补充说明" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? "保存修改" : "保存点检"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {viewingRecord ? (
          <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">设备点检详情</h2>
                <p className="text-sm text-muted-foreground">
                  {viewingRecord.inspectionNo}
                  <span className="mx-2">·</span>
                  {viewingRecord.equipmentName}
                </p>
              </div>

              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">设备信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="设备编号" value={viewingRecord.equipmentCode} />
                      <FieldRow label="设备名称" value={viewingRecord.equipmentName} />
                      <FieldRow label="型号规格" value={viewingRecord.equipmentModel} />
                    </div>
                    <div>
                      <FieldRow label="安装位置" value={viewingRecord.equipmentLocation} />
                      <FieldRow label="使用部门" value={viewingRecord.equipmentDepartment} />
                      <FieldRow label="责任人" value={viewingRecord.equipmentResponsible} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">点检信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="点检日期" value={formatDateValue(viewingRecord.inspectionDate)} />
                      <FieldRow label="点检类型" value={inspectionTypeMap[viewingRecord.inspectionType]} />
                      <FieldRow label="点检人" value={viewingRecord.inspector} />
                    </div>
                    <div>
                      <FieldRow label="复核人" value={viewingRecord.reviewer} />
                      <FieldRow label="点检结果" value={<Badge variant={resultMap[viewingRecord.result].variant}>{resultMap[viewingRecord.result].label}</Badge>} />
                      <FieldRow label="单据状态" value={<Badge variant={statusMap[viewingRecord.status].variant}>{statusMap[viewingRecord.status].label}</Badge>} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">点检明细</h3>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>点检项目</TableHead>
                          <TableHead>点检标准</TableHead>
                          <TableHead>点检方法</TableHead>
                          <TableHead>结果</TableHead>
                          <TableHead>异常描述</TableHead>
                          <TableHead>处理要求</TableHead>
                          <TableHead>备注</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingRecord.detailItems.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">暂无点检明细</TableCell></TableRow>
                        ) : (
                          viewingRecord.detailItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.itemName || "-"}</TableCell>
                              <TableCell>{item.standard || "-"}</TableCell>
                              <TableCell>{item.method || "-"}</TableCell>
                              <TableCell>{item.result || "-"}</TableCell>
                              <TableCell>{item.abnormalDesc || "-"}</TableCell>
                              <TableCell>{item.actionRequired || "-"}</TableCell>
                              <TableCell>{item.remark || "-"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {viewingRecord.remark ? (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingRecord.remark}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setViewDialogOpen(false);
                  handleEdit(viewingRecord);
                }}>编辑</Button>
              </div>
            </DraggableDialogContent>
          </DraggableDialog>
        ) : null}

        <EntityPickerDialog
          open={equipmentPickerOpen}
          onOpenChange={setEquipmentPickerOpen}
          title="选择设备"
          searchPlaceholder="搜索设备编号、名称、型号..."
          columns={[
            { key: "code", title: "设备编号", render: (row: Equipment) => <span className="font-mono font-medium">{row.code || "-"}</span> },
            { key: "name", title: "设备名称", render: (row: Equipment) => <span className="font-medium">{row.name || "-"}</span> },
            { key: "model", title: "型号规格", render: (row: Equipment) => <span>{row.model || "-"}</span> },
            { key: "location", title: "安装位置", render: (row: Equipment) => <span>{row.location || "-"}</span> },
          ]}
          rows={equipmentRows}
          selectedId={formData.equipmentId || null}
          onSelect={applyEquipment}
          filterFn={(row: Equipment, query: string) => {
            const lower = query.toLowerCase();
            return [row.code, row.name, row.model, row.location]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="设备管理中暂无可选设备"
        />
      </div>
    </ERPLayout>
  );
}
