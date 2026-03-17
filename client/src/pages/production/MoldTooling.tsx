import { useEffect, useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Edit, MoreHorizontal, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue } from "@/lib/formatters";

export type MoldToolingStatus = "active" | "maintenance" | "idle" | "scrapped";
export type MoldToolingType = "mold" | "tooling";

export interface MoldToolingRecord {
  id: number;
  code: string;
  name: string;
  type: MoldToolingType;
  model: string;
  applicableProcess: string;
  applicableProduct: string;
  cavityCount: number;
  material: string;
  location: string;
  responsible: string;
  status: MoldToolingStatus;
  lastCheckDate: string;
  remarks: string;
}

export const MOLD_TOOLING_STORAGE_KEY = "production-mold-tooling-v1";
const PAGE_SIZE = 10;

const statusMap: Record<MoldToolingStatus, { label: string; className: string }> = {
  active: { label: "启用", className: "bg-green-100 text-green-700" },
  maintenance: { label: "保养中", className: "bg-amber-100 text-amber-700" },
  idle: { label: "闲置", className: "bg-slate-100 text-slate-700" },
  scrapped: { label: "报废", className: "bg-rose-100 text-rose-700" },
};

const typeMap: Record<MoldToolingType, string> = {
  mold: "模具",
  tooling: "工装",
};

export const defaultMoldToolingRecords: MoldToolingRecord[] = [
  {
    id: 1,
    code: "MJ-001",
    name: "挤出模具 A",
    type: "mold",
    model: "EX-01",
    applicableProcess: "挤出",
    applicableProduct: "胃管",
    cavityCount: 1,
    material: "SKD11",
    location: "挤出车间",
    responsible: "许大志",
    status: "active",
    lastCheckDate: "2026-03-12",
    remarks: "主产线使用模具",
  },
  {
    id: 2,
    code: "MJ-002",
    name: "挤出模具 B",
    type: "mold",
    model: "EX-02",
    applicableProcess: "挤出",
    applicableProduct: "胃管",
    cavityCount: 1,
    material: "SKD11",
    location: "挤出车间",
    responsible: "许大志",
    status: "idle",
    lastCheckDate: "2026-03-10",
    remarks: "备用模具",
  },
  {
    id: 3,
    code: "MJ-003",
    name: "打孔模具 A",
    type: "mold",
    model: "DK-01",
    applicableProcess: "打孔",
    applicableProduct: "胃管",
    cavityCount: 2,
    material: "Cr12MoV",
    location: "模压车间",
    responsible: "王丽",
    status: "active",
    lastCheckDate: "2026-03-11",
    remarks: "标准孔径版本",
  },
  {
    id: 4,
    code: "MJ-004",
    name: "打孔模具 B",
    type: "mold",
    model: "DK-02",
    applicableProcess: "打孔",
    applicableProduct: "胃管",
    cavityCount: 2,
    material: "Cr12MoV",
    location: "模压车间",
    responsible: "王丽",
    status: "maintenance",
    lastCheckDate: "2026-03-08",
    remarks: "待修边处理",
  },
  {
    id: 5,
    code: "MJ-005",
    name: "印刷定位模具 A",
    type: "mold",
    model: "YS-01",
    applicableProcess: "印刷",
    applicableProduct: "胃管",
    cavityCount: 4,
    material: "铝合金",
    location: "印刷车间",
    responsible: "张敏",
    status: "active",
    lastCheckDate: "2026-03-09",
    remarks: "条码版定位专用",
  },
  {
    id: 6,
    code: "MJ-006",
    name: "裁切模具 A",
    type: "mold",
    model: "CQ-01",
    applicableProcess: "裁切",
    applicableProduct: "胃管",
    cavityCount: 1,
    material: "高速钢",
    location: "组装车间",
    responsible: "赵峰",
    status: "active",
    lastCheckDate: "2026-03-12",
    remarks: "长度控制使用",
  },
  {
    id: 7,
    code: "MJ-007",
    name: "封口模具 A",
    type: "mold",
    model: "FK-01",
    applicableProcess: "封口",
    applicableProduct: "胃管",
    cavityCount: 2,
    material: "钨钢",
    location: "组装车间",
    responsible: "赵峰",
    status: "active",
    lastCheckDate: "2026-03-12",
    remarks: "封口参数稳定",
  },
  {
    id: 8,
    code: "MJ-008",
    name: "成型模具 A",
    type: "mold",
    model: "CX-01",
    applicableProcess: "成型",
    applicableProduct: "导尿管",
    cavityCount: 2,
    material: "SKH51",
    location: "组装车间",
    responsible: "刘超",
    status: "idle",
    lastCheckDate: "2026-03-07",
    remarks: "次产线使用",
  },
  {
    id: 9,
    code: "MJ-009",
    name: "成型模具 B",
    type: "mold",
    model: "CX-02",
    applicableProcess: "成型",
    applicableProduct: "导尿管",
    cavityCount: 2,
    material: "SKH51",
    location: "组装车间",
    responsible: "刘超",
    status: "active",
    lastCheckDate: "2026-03-11",
    remarks: "良率较高",
  },
  {
    id: 10,
    code: "MJ-010",
    name: "压合模具 A",
    type: "mold",
    model: "YH-01",
    applicableProcess: "包装压合",
    applicableProduct: "胃管",
    cavityCount: 1,
    material: "硬质合金",
    location: "包装车间",
    responsible: "陈静",
    status: "active",
    lastCheckDate: "2026-03-10",
    remarks: "包装定型专用",
  },
];

export const loadInitialMoldToolingRecords = (): MoldToolingRecord[] => {
  if (typeof window === "undefined") return defaultMoldToolingRecords;
  try {
    const raw = window.localStorage.getItem(MOLD_TOOLING_STORAGE_KEY);
    if (!raw) return defaultMoldToolingRecords;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultMoldToolingRecords;
  } catch {
    return defaultMoldToolingRecords;
  }
};

export default function MoldToolingPage() {
  const { canDelete } = usePermission();
  const [records, setRecords] = useState<MoldToolingRecord[]>(loadInitialMoldToolingRecords);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MoldToolingRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MoldToolingRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<Omit<MoldToolingRecord, "id">>({
    code: "",
    name: "",
    type: "mold",
    model: "",
    applicableProcess: "",
    applicableProduct: "",
    cavityCount: 1,
    material: "",
    location: "",
    responsible: "",
    status: "active",
    lastCheckDate: "",
    remarks: "",
  });

  useEffect(() => {
    window.localStorage.setItem(MOLD_TOOLING_STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const keyword = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          [
            record.code,
            record.name,
            record.model,
            record.applicableProcess,
            record.applicableProduct,
            record.location,
            record.responsible,
          ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(keyword));
        const matchesStatus = statusFilter === "all" || record.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [records, searchTerm, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const activeCount = records.filter((record) => record.status === "active").length;
  const maintenanceCount = records.filter((record) => record.status === "maintenance").length;
  const idleCount = records.filter((record) => record.status === "idle").length;

  const nextCode = useMemo(() => {
    const maxCode = records.reduce((maxValue, record) => {
      const matched = String(record.code || "").match(/^MJ-(\d+)$/);
      return matched ? Math.max(maxValue, Number(matched[1])) : maxValue;
    }, 0);
    return `MJ-${String(maxCode + 1).padStart(3, "0")}`;
  }, [records]);

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      code: nextCode,
      name: "",
      type: "mold",
      model: "",
      applicableProcess: "",
      applicableProduct: "",
      cavityCount: 1,
      material: "",
      location: "",
      responsible: "",
      status: "active",
      lastCheckDate: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: MoldToolingRecord) => {
    setEditingRecord(record);
    setFormData({
      code: record.code,
      name: record.name,
      type: record.type,
      model: record.model,
      applicableProcess: record.applicableProcess,
      applicableProduct: record.applicableProduct,
      cavityCount: record.cavityCount,
      material: record.material,
      location: record.location,
      responsible: record.responsible,
      status: record.status,
      lastCheckDate: record.lastCheckDate,
      remarks: record.remarks,
    });
    setDialogOpen(true);
  };

  const handleDelete = (record: MoldToolingRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    toast.success("模具工装已删除");
  };

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("请填写必填项");
      return;
    }
    const payload: MoldToolingRecord = {
      id: editingRecord?.id || Date.now(),
      ...formData,
      code: formData.code.trim(),
      name: formData.name.trim(),
      model: formData.model.trim(),
      applicableProcess: formData.applicableProcess.trim(),
      applicableProduct: formData.applicableProduct.trim(),
      material: formData.material.trim(),
      location: formData.location.trim(),
      responsible: formData.responsible.trim(),
      remarks: formData.remarks.trim(),
    };
    if (editingRecord) {
      setRecords((prev) => prev.map((item) => (item.id === editingRecord.id ? payload : item)));
      toast.success("模具工装已更新");
    } else {
      setRecords((prev) => [payload, ...prev]);
      toast.success("模具工装已新增");
    }
    setDialogOpen(false);
  };

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => {
    const renderValue = (value: React.ReactNode): React.ReactNode => {
      if (value == null || value === "") return "-";
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (Array.isArray(value)) {
        const items = value
          .map((item) => item instanceof Date ? item.toISOString().slice(0, 10) : item)
          .filter((item) => item != null && item !== "");
        return items.length > 0 ? items.join(" ") : "-";
      }
      return value;
    };

    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
        <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
        <span className="flex-1 text-sm text-right break-all">{renderValue(children)}</span>
      </div>
    );
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">模具工装</h2>
              <p className="text-sm text-muted-foreground">统一维护生产模具工装档案，支持工序配置引用</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增模具工装
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">档案总数</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">启用中</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">保养中</p>
              <p className="text-2xl font-bold text-amber-600">{maintenanceCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">闲置</p>
              <p className="text-2xl font-bold text-slate-600">{idleCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索编号、名称、工序、产品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="maintenance">保养中</SelectItem>
                  <SelectItem value="idle">闲置</SelectItem>
                  <SelectItem value="scrapped">报废</SelectItem>
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
                  <TableHead className="w-[100px] text-center font-bold">编号</TableHead>
                  <TableHead className="text-center font-bold">名称</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">类型</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">型号</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">适用工序</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">所在位置</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-medium">{record.code}</TableCell>
                    <TableCell className="text-center">{record.name}</TableCell>
                    <TableCell className="text-center">{typeMap[record.type]}</TableCell>
                    <TableCell className="text-center">{record.model || "-"}</TableCell>
                    <TableCell className="text-center">{record.applicableProcess || "-"}</TableCell>
                    <TableCell className="text-center">{record.location || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusMap[record.status].className}>
                        {statusMap[record.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewingRecord(record); setViewDialogOpen(true); }}>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <TablePaginationFooter
          total={filteredRecords.length}
          page={currentPage}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? "编辑模具工装" : "新增模具工装"}</DialogTitle>
              <DialogDescription>
                {editingRecord ? "修改模具工装档案" : "新建模具工装基础数据"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>编号 *</Label>
                  <Input value={formData.code} onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>名称 *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as MoldToolingType }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mold">模具</SelectItem>
                      <SelectItem value="tooling">工装</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>型号</Label>
                  <Input value={formData.model} onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>适用工序</Label>
                  <Input value={formData.applicableProcess} onChange={(e) => setFormData((prev) => ({ ...prev, applicableProcess: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>适用产品</Label>
                  <Input value={formData.applicableProduct} onChange={(e) => setFormData((prev) => ({ ...prev, applicableProduct: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>模腔数</Label>
                  <Input type="number" value={formData.cavityCount} onChange={(e) => setFormData((prev) => ({ ...prev, cavityCount: Number(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>材质</Label>
                  <Input value={formData.material} onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>所在位置</Label>
                  <Input value={formData.location} onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>责任人</Label>
                  <Input value={formData.responsible} onChange={(e) => setFormData((prev) => ({ ...prev, responsible: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as MoldToolingStatus }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="maintenance">保养中</SelectItem>
                      <SelectItem value="idle">闲置</SelectItem>
                      <SelectItem value="scrapped">报废</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>最近点检日期</Label>
                  <DateTextInput value={formData.lastCheckDate} onChange={(value) => setFormData((prev) => ({ ...prev, lastCheckDate: value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea rows={3} value={formData.remarks} onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>{editingRecord ? "保存修改" : "新增模具工装"}</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {viewingRecord ? (
          <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">模具工装详情</h2>
                <p className="text-sm text-muted-foreground">
                  {viewingRecord.code}
                  <span className="mx-2">·</span>
                  {viewingRecord.name}
                </p>
              </div>

              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="名称">{viewingRecord.name}</FieldRow>
                      <FieldRow label="类型">{typeMap[viewingRecord.type]}</FieldRow>
                      <FieldRow label="型号">{viewingRecord.model || "-"}</FieldRow>
                      <FieldRow label="模腔数">{viewingRecord.cavityCount}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="适用工序">{viewingRecord.applicableProcess || "-"}</FieldRow>
                      <FieldRow label="适用产品">{viewingRecord.applicableProduct || "-"}</FieldRow>
                      <FieldRow label="材质">{viewingRecord.material || "-"}</FieldRow>
                      <FieldRow label="状态">
                        <Badge className={statusMap[viewingRecord.status].className}>
                          {statusMap[viewingRecord.status].label}
                        </Badge>
                      </FieldRow>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">位置与责任</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="位置">{viewingRecord.location || "-"}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="责任人">{viewingRecord.responsible || "-"}</FieldRow>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">点检信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="最近点检">{formatDateValue(viewingRecord.lastCheckDate)}</FieldRow>
                    </div>
                  </div>
                </div>

                {viewingRecord.remarks ? (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingRecord.remarks}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setViewDialogOpen(false);
                  handleEdit(viewingRecord);
                }}>
                  编辑
                </Button>
              </div>
            </DraggableDialogContent>
          </DraggableDialog>
        ) : null}
      </div>
    </ERPLayout>
  );
}
