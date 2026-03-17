import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wrench,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue } from "@/lib/formatters";
import { loadInitialMoldToolingRecords, type MoldToolingRecord } from "./MoldTooling";

export interface Equipment {
  id: number;
  code: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNo: string;
  certNo?: string;
  equipmentCategory?: "equipment" | "instrument";
  purchaseDate: string;
  warrantyDate: string;
  location: string;
  department: string;
  responsible: string;
  inspectionRequirement?: string;
  maintenanceRequirement?: string;
  inspectionTemplate?: string;
  maintenanceTemplate?: string;
  status: "normal" | "maintenance" | "repair" | "scrapped";
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceCycle: number;
  calibrationCycle?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  assetValue: number;
  remarks: string;
}

const statusMap: Record<string, any> = {
  normal: { label: "正常", variant: "default" as const },
  maintenance: { label: "保养中", variant: "secondary" as const },
  repair: { label: "维修中", variant: "outline" as const },
  scrapped: { label: "已报废", variant: "destructive" as const },
};

const moldToolingStatusMap: Record<string, { label: string; className: string }> = {
  active: { label: "启用", className: "bg-green-100 text-green-700" },
  maintenance: { label: "保养中", className: "bg-amber-100 text-amber-700" },
  idle: { label: "闲置", className: "bg-slate-100 text-slate-700" },
  scrapped: { label: "报废", className: "bg-rose-100 text-rose-700" },
};

const assetTypeMap: Record<string, string> = {
  equipment: "设备",
  mold: "模具",
  tooling: "工装",
};

const equipmentCategoryMap: Record<string, string> = {
  equipment: "设备",
  instrument: "仪表",
};



const departmentOptions = ["生产部", "质量部", "研发部", "仓储部", "设备部"];
const locationOptions = ["生产车间A区", "生产车间B区", "灭菌车间", "包装车间", "检验室", "仓库"];

export const defaultEquipmentRecords: Equipment[] = [
  {
    id: 1,
    code: "EQ-001",
    name: "挤出机 A",
    model: "EX-180",
    manufacturer: "苏州精工",
    serialNo: "EXA-202601",
    purchaseDate: "2025-01-10",
    warrantyDate: "2027-01-10",
    location: "生产车间A区",
    department: "生产部",
    responsible: "许大志",
    status: "normal",
    lastMaintenance: "2026-02-20",
    nextMaintenance: "2026-03-20",
    maintenanceCycle: 30,
    assetValue: 180000,
    remarks: "主挤出产线设备",
  },
  {
    id: 2,
    code: "EQ-002",
    name: "挤出机 B",
    model: "EX-200",
    manufacturer: "苏州精工",
    serialNo: "EXB-202602",
    purchaseDate: "2025-01-20",
    warrantyDate: "2027-01-20",
    location: "生产车间A区",
    department: "生产部",
    responsible: "许大志",
    status: "normal",
    lastMaintenance: "2026-02-18",
    nextMaintenance: "2026-03-18",
    maintenanceCycle: 30,
    assetValue: 195000,
    remarks: "备用挤出设备",
  },
  {
    id: 3,
    code: "EQ-003",
    name: "冷却水系统",
    model: "CW-90",
    manufacturer: "昆山冷机",
    serialNo: "CW-202603",
    purchaseDate: "2025-02-01",
    warrantyDate: "2027-02-01",
    location: "生产车间A区",
    department: "生产部",
    responsible: "王丽",
    status: "normal",
    lastMaintenance: "2026-02-25",
    nextMaintenance: "2026-03-25",
    maintenanceCycle: 30,
    assetValue: 68000,
    remarks: "挤出冷却辅助设备",
  },
  {
    id: 4,
    code: "EQ-004",
    name: "精洗机",
    model: "QX-120",
    manufacturer: "无锡净化",
    serialNo: "QX-202604",
    purchaseDate: "2025-02-15",
    warrantyDate: "2027-02-15",
    location: "生产车间B区",
    department: "生产部",
    responsible: "张敏",
    status: "normal",
    lastMaintenance: "2026-02-28",
    nextMaintenance: "2026-03-30",
    maintenanceCycle: 30,
    assetValue: 86000,
    remarks: "精洗工序使用",
  },
  {
    id: 5,
    code: "EQ-005",
    name: "粗洗机",
    model: "CX-100",
    manufacturer: "无锡净化",
    serialNo: "CX-202605",
    purchaseDate: "2025-02-12",
    warrantyDate: "2027-02-12",
    location: "生产车间B区",
    department: "生产部",
    responsible: "张敏",
    status: "normal",
    lastMaintenance: "2026-02-26",
    nextMaintenance: "2026-03-26",
    maintenanceCycle: 30,
    assetValue: 74000,
    remarks: "粗洗工序使用",
  },
  {
    id: 6,
    code: "EQ-006",
    name: "混炼机",
    model: "HL-80",
    manufacturer: "上海混炼",
    serialNo: "HL-202606",
    purchaseDate: "2025-03-01",
    warrantyDate: "2027-03-01",
    location: "生产车间A区",
    department: "生产部",
    responsible: "赵峰",
    status: "normal",
    lastMaintenance: "2026-03-01",
    nextMaintenance: "2026-03-31",
    maintenanceCycle: 30,
    assetValue: 122000,
    remarks: "混炼工序主设备",
  },
  {
    id: 7,
    code: "EQ-007",
    name: "印刷机",
    model: "YS-60",
    manufacturer: "常州印机",
    serialNo: "YS-202607",
    purchaseDate: "2025-03-05",
    warrantyDate: "2027-03-05",
    location: "包装车间",
    department: "生产部",
    responsible: "陈静",
    status: "maintenance",
    lastMaintenance: "2026-03-05",
    nextMaintenance: "2026-04-04",
    maintenanceCycle: 30,
    assetValue: 98000,
    remarks: "印刷参数调校中",
  },
  {
    id: 8,
    code: "EQ-008",
    name: "封口机",
    model: "FK-50",
    manufacturer: "常州印机",
    serialNo: "FK-202608",
    purchaseDate: "2025-03-08",
    warrantyDate: "2027-03-08",
    location: "包装车间",
    department: "生产部",
    responsible: "陈静",
    status: "normal",
    lastMaintenance: "2026-03-02",
    nextMaintenance: "2026-04-01",
    maintenanceCycle: 30,
    assetValue: 56000,
    remarks: "封口工序使用",
  },
  {
    id: 9,
    code: "EQ-009",
    name: "纯化水系统",
    model: "PW-300",
    manufacturer: "苏州水处理",
    serialNo: "PW-202609",
    purchaseDate: "2025-03-10",
    warrantyDate: "2027-03-10",
    location: "生产车间B区",
    department: "生产部",
    responsible: "刘超",
    status: "normal",
    lastMaintenance: "2026-03-01",
    nextMaintenance: "2026-03-29",
    maintenanceCycle: 28,
    assetValue: 150000,
    remarks: "清洗供水设备",
  },
  {
    id: 10,
    code: "EQ-010",
    name: "空压机",
    model: "KY-75",
    manufacturer: "苏州动力",
    serialNo: "KY-202610",
    purchaseDate: "2025-03-12",
    warrantyDate: "2027-03-12",
    location: "生产车间A区",
    department: "生产部",
    responsible: "刘超",
    status: "repair",
    lastMaintenance: "2026-02-15",
    nextMaintenance: "2026-03-15",
    maintenanceCycle: 30,
    assetValue: 88000,
    remarks: "待更换阀组",
  },
];

export function normalizeEquipmentRecord(record: any): Equipment {
  return {
    id: Number(record?.id || 0),
    code: String(record?.code || ""),
    name: String(record?.name || ""),
    model: String(record?.model || ""),
    manufacturer: String(record?.manufacturer || ""),
    serialNo: String(record?.serialNo || ""),
    purchaseDate: formatDateValue(record?.purchaseDate) || "",
    warrantyDate: formatDateValue(record?.warrantyDate) || "",
    location: String(record?.location || ""),
    department: String(record?.department || ""),
    responsible: String(record?.responsible || ""),
    inspectionRequirement: String(record?.inspectionRequirement || ""),
    maintenanceRequirement: String(record?.maintenanceRequirement || ""),
    inspectionTemplate: record?.inspectionTemplate ? String(record.inspectionTemplate) : undefined,
    maintenanceTemplate: record?.maintenanceTemplate ? String(record.maintenanceTemplate) : undefined,
    status: (record?.status || "normal") as Equipment["status"],
    lastMaintenance: record?.lastMaintenance
      ? (formatDateValue(record.lastMaintenance) || "")
      : record?.lastMaintenanceDate
        ? (formatDateValue(record.lastMaintenanceDate) || "")
        : "",
    nextMaintenance: record?.nextMaintenance
      ? (formatDateValue(record.nextMaintenance) || "")
      : record?.nextMaintenanceDate
        ? (formatDateValue(record.nextMaintenanceDate) || "")
        : "",
    maintenanceCycle: Number(record?.maintenanceCycle || 30),
    calibrationCycle: record?.calibrationCycle ? String(record.calibrationCycle) : undefined,
    lastCalibrationDate: record?.lastCalibrationDate ? (formatDateValue(record.lastCalibrationDate) || undefined) : undefined,
    nextCalibrationDate: record?.nextCalibrationDate ? (formatDateValue(record.nextCalibrationDate) || undefined) : undefined,
    certNo: record?.certNo ? String(record.certNo) : undefined,
    equipmentCategory: (record?.equipmentCategory === "instrument" ? "instrument" : "equipment") as "equipment" | "instrument",
    assetValue: Number(record?.assetValue || 0),
    remarks: String(record?.remarks || record?.remark || ""),
  };
}

export default function EquipmentPage() {
  const PAGE_SIZE = 10;
  const { data: _dbData = [], isLoading, refetch } = trpc.equipment.list.useQuery();
  const { data: inspectionData = [] } = trpc.equipmentInspections.list.useQuery();
  const { data: maintenanceData = [] } = trpc.equipmentMaintenances.list.useQuery();
  const createMutation = trpc.equipment.create.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("创建成功");
    },
  });
  const updateMutation = trpc.equipment.update.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("更新成功");
    },
  });
  const deleteMutation = trpc.equipment.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("删除成功");
    },
  });
  const equipments = useMemo<Equipment[]>(
    () =>
      (((_dbData as any[]) || []).length > 0
        ? (_dbData as any[]).map(normalizeEquipmentRecord)
        : defaultEquipmentRecords) as Equipment[],
    [_dbData]
  );
  const [moldToolingRecords] = useState<MoldToolingRecord[]>(loadInitialMoldToolingRecords);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null);
  const [viewingMoldTooling, setViewingMoldTooling] = useState<MoldToolingRecord | null>(null);
  const [moldToolingViewDialogOpen, setMoldToolingViewDialogOpen] = useState(false);
  const { canDelete } = usePermission();
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    model: "",
    manufacturer: "",
    serialNo: "",
    certNo: "",
    equipmentCategory: "equipment" as "equipment" | "instrument",
    purchaseDate: "",
    warrantyDate: "",
    location: "",
    department: "",
    responsible: "",
    inspectionRequirement: "",
    maintenanceRequirement: "",
    inspectionTemplate: "",
    maintenanceTemplate: "",
    status: "normal",
    lastMaintenance: "",
    nextMaintenance: "",
    maintenanceCycle: 30,
    calibrationCycle: "",
    lastCalibrationDate: "",
    nextCalibrationDate: "",
    assetValue: 0,
    remarks: "",
  });

  const assets = useMemo(
    () => [
      ...equipments.map((equipment) => ({
        id: `equipment-${equipment.id}`,
        assetType: (equipment.equipmentCategory === "instrument" ? "instrument" : "equipment") as string,
        code: equipment.code,
        name: equipment.name,
        model: equipment.model,
        location: equipment.location,
        status: equipment.status,
        responsibleField: equipment.department || "-",
        dateField: equipment.equipmentCategory === "instrument"
          ? (formatDateValue(equipment.nextCalibrationDate) || "-")
          : formatDateValue(equipment.nextMaintenance),
        raw: equipment,
      })),
      ...moldToolingRecords.map((record) => ({
        id: `mold-${record.id}`,
        assetType: record.type,
        code: record.code,
        name: record.name,
        model: record.model,
        location: record.location,
        status: record.status,
        responsibleField: record.applicableProcess || "-",
        dateField: formatDateValue(record.lastCheckDate),
        raw: record,
      })),
    ],
    [equipments, moldToolingRecords]
  );

  const filteredAssets = assets.filter((asset) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      String(asset.code ?? "").toLowerCase().includes(keyword) ||
      String(asset.name ?? "").toLowerCase().includes(keyword) ||
      String(asset.model ?? "").toLowerCase().includes(keyword) ||
      String(asset.location ?? "").toLowerCase().includes(keyword) ||
      String(asset.responsibleField ?? "").toLowerCase().includes(keyword);
    const matchesType = assetTypeFilter === "all" || asset.assetType === assetTypeFilter;
    const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const pagedAssets = filteredAssets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, assetTypeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const equipmentInspectionRows = useMemo(
    () =>
      ((inspectionData as any[]) || []).map((record: any) => ({
        ...record,
        inspectionDate: formatDateValue(record?.inspectionDate) || "",
        detailItems: Array.isArray(record?.detailItems) ? record.detailItems : [],
      })),
    [inspectionData]
  );

  const equipmentMaintenanceRows = useMemo(
    () =>
      ((maintenanceData as any[]) || []).map((record: any) => ({
        ...record,
        maintenanceDate: formatDateValue(record?.maintenanceDate) || "",
        nextMaintenanceDate: formatDateValue(record?.nextMaintenanceDate) || "",
        detailItems: Array.isArray(record?.detailItems) ? record.detailItems : [],
      })),
    [maintenanceData]
  );

  const handleAdd = () => {
    setEditingEquipment(null);
    const nextNo = equipments.length + 1;
    setFormData({
      code: `EQ-${String(nextNo).padStart(3, "0")}`,
      name: "",
      model: "",
      manufacturer: "",
      serialNo: "",
      certNo: "",
      equipmentCategory: "equipment" as "equipment" | "instrument",
      purchaseDate: "",
      warrantyDate: "",
      location: "",
      department: "",
      responsible: "",
      inspectionRequirement: "",
      maintenanceRequirement: "",
      inspectionTemplate: "",
      maintenanceTemplate: "",
      status: "normal",
      lastMaintenance: "",
      nextMaintenance: "",
      maintenanceCycle: 30,
      calibrationCycle: "",
      lastCalibrationDate: "",
      nextCalibrationDate: "",
      assetValue: 0,
      remarks: "",
    });
    setDialogOpen(true);
  };
  const handleEdit = (equipment: Equipment) => {{
    setEditingEquipment(equipment);
    setFormData({
      code: equipment.code,
      name: equipment.name,
      model: equipment.model,
      manufacturer: equipment.manufacturer,
      serialNo: equipment.serialNo,
      certNo: equipment.certNo || "",
      equipmentCategory: (equipment.equipmentCategory || "equipment") as "equipment" | "instrument",
      purchaseDate: equipment.purchaseDate,
      warrantyDate: equipment.warrantyDate,
      location: equipment.location,
      department: equipment.department,
      responsible: equipment.responsible,
      inspectionRequirement: equipment.inspectionRequirement || "",
      maintenanceRequirement: equipment.maintenanceRequirement || "",
      inspectionTemplate: equipment.inspectionTemplate || "",
      maintenanceTemplate: equipment.maintenanceTemplate || "",
      status: equipment.status,
      lastMaintenance: equipment.lastMaintenance,
      nextMaintenance: equipment.nextMaintenance,
      maintenanceCycle: equipment.maintenanceCycle,
      calibrationCycle: equipment.calibrationCycle || "",
      lastCalibrationDate: equipment.lastCalibrationDate || "",
      nextCalibrationDate: equipment.nextCalibrationDate || "",
      assetValue: equipment.assetValue,
      remarks: equipment.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (equipment: Equipment) => {
    setViewingEquipment(equipment);
    setViewDialogOpen(true);
  };

  const handleDelete = (equipment: Equipment) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除设备" });
      return;
    }
    deleteMutation.mutate({ id: equipment.id });
  };

  const handleInspection = () => {
    window.location.href = "/production/equipment-inspection";
  };

  const handleMaintenance = () => {
    window.location.href = "/production/equipment-maintenance";
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      toast.error("请填写必填项", { description: "设备编号和设备名称为必填" });
      return;
    }

    if (editingEquipment) {
      updateMutation.mutate({
        id: editingEquipment.id,
        data: {
          code: formData.code,
          name: formData.name,
          model: formData.model,
          manufacturer: formData.manufacturer,
          serialNo: formData.serialNo,
          purchaseDate: formData.purchaseDate || undefined,
          warrantyDate: formData.warrantyDate || undefined,
          location: formData.location,
          department: formData.department,
          responsible: formData.responsible,
          inspectionRequirement: formData.inspectionRequirement,
          maintenanceRequirement: formData.maintenanceRequirement,
          inspectionTemplate: formData.inspectionTemplate || undefined,
          maintenanceTemplate: formData.maintenanceTemplate || undefined,
          status: formData.status as Equipment["status"],
          lastMaintenanceDate: formData.lastMaintenance || undefined,
          nextMaintenanceDate: formData.nextMaintenance || undefined,
          maintenanceCycle: Number(formData.maintenanceCycle || 30),
          assetValue: Number(formData.assetValue || 0),
          certNo: formData.certNo || undefined,
          equipmentCategory: formData.equipmentCategory,
          calibrationCycle: formData.calibrationCycle || undefined,
          lastCalibrationDate: formData.lastCalibrationDate || undefined,
          nextCalibrationDate: formData.nextCalibrationDate || undefined,
          remark: formData.remarks,
        },
      });
    } else {
      createMutation.mutate({
        code: formData.code,
        name: formData.name,
        model: formData.model,
        manufacturer: formData.manufacturer,
        serialNo: formData.serialNo,
        certNo: formData.certNo || undefined,
        equipmentCategory: formData.equipmentCategory,
        purchaseDate: formData.purchaseDate || undefined,
        warrantyDate: formData.warrantyDate || undefined,
        location: formData.location,
        department: formData.department,
        responsible: formData.responsible,
        inspectionRequirement: formData.inspectionRequirement,
        maintenanceRequirement: formData.maintenanceRequirement,
        inspectionTemplate: formData.inspectionTemplate || undefined,
        maintenanceTemplate: formData.maintenanceTemplate || undefined,
        status: formData.status as Equipment["status"],
        lastMaintenanceDate: formData.lastMaintenance || undefined,
        nextMaintenanceDate: formData.nextMaintenance || undefined,
        maintenanceCycle: Number(formData.maintenanceCycle || 30),
        calibrationCycle: formData.calibrationCycle || undefined,
        lastCalibrationDate: formData.lastCalibrationDate || undefined,
        nextCalibrationDate: formData.nextCalibrationDate || undefined,
        assetValue: Number(formData.assetValue || 0),
        remark: formData.remarks,
      });
    }
  };

  const normalCount = equipments.filter((e: any) => e.status === "normal").length;
  const moldToolingCount = moldToolingRecords.length;

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => {
    const renderValue = (value: React.ReactNode): React.ReactNode => {
      if (value == null || value === "") return "-";
      if (value instanceof Date) return formatDateValue(value) || "-";
      if (Array.isArray(value)) {
        const items = value
          .map((item) => item instanceof Date ? (formatDateValue(item) || "-") : item)
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
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">设备管理</h2>
              <p className="text-sm text-muted-foreground">建立全面的设备和工装模具档案，实现全生命周期电子化管理</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增设备
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">档案总数</p>
              <p className="text-2xl font-bold">{assets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">设备数量</p>
              <p className="text-2xl font-bold">{equipments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">模具工装</p>
              <p className="text-2xl font-bold text-green-600">{moldToolingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">设备正常运行</p>
              <p className="text-2xl font-bold text-green-600">{normalCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Tabs value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                <TabsList className="grid w-full grid-cols-5 md:w-[520px]">
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="equipment">设备</TabsTrigger>
                  <TabsTrigger value="instrument">仪表</TabsTrigger>
                  <TabsTrigger value="mold">模具</TabsTrigger>
                  <TabsTrigger value="tooling">工装</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索编号、名称、型号、位置..."
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
                  <SelectItem value="normal">正常</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="maintenance">保养中</SelectItem>
                  <SelectItem value="repair">维修中</SelectItem>
                  <SelectItem value="idle">闲置</SelectItem>
                  <SelectItem value="scrapped">已报废</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[90px] text-center font-bold">资产编号</TableHead>
                  <TableHead className="text-center font-bold">资产名称</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">类别</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">型号规格</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">位置</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">部门/工序</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">下次保养/校准</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedAssets.map((asset: any) => {
                  const isEquipment = asset.assetType === "equipment" || asset.assetType === "instrument";
                  const equipment = isEquipment ? asset.raw as Equipment : null;
                  const moldTooling = !isEquipment ? asset.raw as MoldToolingRecord : null;
                  const nextDate = isEquipment && equipment?.nextMaintenance ? new Date(equipment.nextMaintenance) : null;
                  const today = new Date();
                  const diffDays = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;
                  const isNearMaintenance = isEquipment && diffDays <= 7 && equipment?.status === "normal";
                  
                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="text-center font-medium">{asset.code}</TableCell>
                      <TableCell className="text-center">{asset.name}</TableCell>
                      <TableCell className="text-center">
                        {asset.assetType === "instrument" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">仪表</span>
                        ) : asset.assetType === "equipment" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">设备</span>
                        ) : (assetTypeMap[asset.assetType] || "-")}
                      </TableCell>
                      <TableCell className="text-center">{asset.model}</TableCell>
                      <TableCell className="text-center">{asset.location}</TableCell>
                      <TableCell className="text-center">{asset.responsibleField}</TableCell>
                      <TableCell className="text-center">
                        {isEquipment ? (
                          <Badge variant={statusMap[equipment?.status || ""]?.variant || "outline"} className={getStatusSemanticClass(equipment?.status, statusMap[equipment?.status || ""]?.label)}>
                            {statusMap[equipment?.status || ""]?.label || String(equipment?.status ?? "-")}
                          </Badge>
                        ) : (
                          <Badge className={moldToolingStatusMap[moldTooling?.status || ""]?.className}>
                            {moldToolingStatusMap[moldTooling?.status || ""]?.label || String(moldTooling?.status ?? "-")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1">
                          {asset.dateField}
                          {isNearMaintenance && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                if (isEquipment && equipment) {
                                  handleView(equipment);
                                  return;
                                }
                                if (moldTooling) {
                                  setViewingMoldTooling(moldTooling);
                                  setMoldToolingViewDialogOpen(true);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            {isEquipment && equipment ? (
                              <DropdownMenuItem onClick={() => handleInspection()}>
                                <Plus className="h-4 w-4 mr-2" />
                                新增点检
                              </DropdownMenuItem>
                            ) : null}
                            {isEquipment && equipment ? (
                              <DropdownMenuItem onClick={() => handleEdit(equipment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                            ) : null}
                            {isEquipment && equipment?.status !== "scrapped" ? (
                              <DropdownMenuItem onClick={() => handleMaintenance()}>
                                <Settings className="h-4 w-4 mr-2" />
                                新增保养
                              </DropdownMenuItem>
                            ) : null}
                            {canDelete && isEquipment && equipment ? (
                              <DropdownMenuItem
                                onClick={() => handleDelete(equipment)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            ) : null}
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
        <TablePaginationFooter total={filteredAssets.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEquipment ? "编辑设备" : "新增设备"}</DialogTitle>
              <DialogDescription>
                {editingEquipment ? "修改设备信息" : "添加新的设备到系统"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>设备编号 *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="设备编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>设备名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="设备名称"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>型号规格</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="型号规格"
                  />
                </div>
                <div className="space-y-2">
                  <Label>制造商</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="制造商"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>出厂编号</Label>
                  <Input
                    value={formData.serialNo}
                    onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                    placeholder="出厂编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>证书编号</Label>
                  <Input
                    value={formData.certNo}
                    onChange={(e) => setFormData({ ...formData, certNo: e.target.value })}
                    placeholder="校准/检定证书编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>设备类型</Label>
                  <Select
                    value={formData.equipmentCategory}
                    onValueChange={(value) => setFormData({ ...formData, equipmentCategory: value as "equipment" | "instrument" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">设备</SelectItem>
                      <SelectItem value="instrument">仪表</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.equipmentCategory === "instrument" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="space-y-2">
                    <Label>校准/检定周期</Label>
                    <Input
                      value={formData.calibrationCycle}
                      onChange={(e) => setFormData({ ...formData, calibrationCycle: e.target.value })}
                      placeholder="如：12个月"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>上次校准日期</Label>
                    <DateTextInput
                      value={formData.lastCalibrationDate}
                      onChange={(value) => setFormData({ ...formData, lastCalibrationDate: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>下次校准日期</Label>
                    <DateTextInput
                      value={formData.nextCalibrationDate}
                      onChange={(value) => setFormData({ ...formData, nextCalibrationDate: value })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>资产价値 (元)</Label>
                  <Input
                    type="number"
                    value={formData.assetValue}
                    onChange={(e) => setFormData({ ...formData, assetValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>购置日期</Label>
                  <DateTextInput
                    value={formData.purchaseDate}
                    onChange={(value) => setFormData({ ...formData, purchaseDate: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>保修截止</Label>
                  <DateTextInput
                    value={formData.warrantyDate}
                    onChange={(value) => setFormData({ ...formData, warrantyDate: value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>安装位置</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择位置" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((l: any) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>使用部门</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((d: any) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>责任人</Label>
                  <Input
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                    placeholder="设备责任人"
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="maintenance">保养中</SelectItem>
                      <SelectItem value="repair">维修中</SelectItem>
                      <SelectItem value="scrapped">已报废</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>上次保养</Label>
                  <DateTextInput
                    value={formData.lastMaintenance}
                    onChange={(value) => setFormData({ ...formData, lastMaintenance: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>下次保养</Label>
                  <DateTextInput
                    value={formData.nextMaintenance}
                    onChange={(value) => setFormData({ ...formData, nextMaintenance: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>保养周期 (天)</Label>
                  <Input
                    type="number"
                    value={formData.maintenanceCycle}
                    onChange={(e) => setFormData({ ...formData, maintenanceCycle: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>点检要求</Label>
                  <Textarea
                    value={formData.inspectionRequirement}
                    onChange={(e) => setFormData({ ...formData, inspectionRequirement: e.target.value })}
                    placeholder="填写该设备的点检要求，如开机前检查电源、气压、润滑、紧固件等"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>保养要求</Label>
                  <Textarea
                    value={formData.maintenanceRequirement}
                    onChange={(e) => setFormData({ ...formData, maintenanceRequirement: e.target.value })}
                    placeholder="填写该设备的保养要求，如清洁、润滑、更换耗材、空载试运行等"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="其他备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingEquipment ? "保存修改" : "添加设备"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
{/* 查看详情对话框 */}
{viewingEquipment && (
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    <div className="border-b pb-3">
      <h2 className="text-lg font-semibold">设备详情</h2>
      <p className="text-sm text-muted-foreground">
        {viewingEquipment.code}
        {viewingEquipment.status && (
          <> · <Badge variant={statusMap[viewingEquipment.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingEquipment.status, statusMap[viewingEquipment.status]?.label)}`}>
            {statusMap[viewingEquipment.status]?.label || String(viewingEquipment.status ?? "-")}
          </Badge></>
        )}
      </p>
    </div>

    <div className="space-y-6 py-4">
      {(() => {
        const inspectionRecords = equipmentInspectionRows
          .filter((record: any) => Number(record.equipmentId) === Number(viewingEquipment.id))
          .slice(0, 5);
        const maintenanceRecords = equipmentMaintenanceRows
          .filter((record: any) => Number(record.equipmentId) === Number(viewingEquipment.id))
          .slice(0, 5);

        return (
          <>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="设备名称">{viewingEquipment.name}</FieldRow>
                  <FieldRow label="型号规格">{viewingEquipment.model}</FieldRow>
                  <FieldRow label="制造商">{viewingEquipment.manufacturer}</FieldRow>
                  <FieldRow label="设备类型">{equipmentCategoryMap[viewingEquipment.equipmentCategory || "equipment"] || "-"}</FieldRow>
                </div>
                <div>
                  <FieldRow label="出厂编号">{viewingEquipment.serialNo}</FieldRow>
                  <FieldRow label="证书编号">{viewingEquipment.certNo || "-"}</FieldRow>
                  <FieldRow label="资产价値">¥{viewingEquipment.assetValue?.toLocaleString?.() ?? "0"}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">位置与责任</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="安装位置">{viewingEquipment.location}</FieldRow>
                  <FieldRow label="使用部门">{viewingEquipment.department}</FieldRow>
                </div>
                <div>
                  <FieldRow label="责任人">{viewingEquipment.responsible}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">日期信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="购置日期">{formatDateValue(viewingEquipment.purchaseDate)}</FieldRow>
                </div>
                <div>
                  <FieldRow label="保修截止">{formatDateValue(viewingEquipment.warrantyDate)}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">保养信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="上次保养">{formatDateValue(viewingEquipment.lastMaintenance)}</FieldRow>
                  <FieldRow label="保养周期">{viewingEquipment.maintenanceCycle} 天</FieldRow>
                </div>
                <div>
                  <FieldRow label="下次保养">{formatDateValue(viewingEquipment.nextMaintenance)}</FieldRow>
                </div>
              </div>
            </div>

            {viewingEquipment.equipmentCategory === "instrument" && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">校准/检定信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <FieldRow label="校准周期">{viewingEquipment.calibrationCycle || "-"}</FieldRow>
                    <FieldRow label="上次校准">{formatDateValue(viewingEquipment.lastCalibrationDate) || "-"}</FieldRow>
                  </div>
                  <div>
                    <FieldRow label="下次校准">{formatDateValue(viewingEquipment.nextCalibrationDate) || "-"}</FieldRow>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">点检要求</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 whitespace-pre-wrap">
                {viewingEquipment.inspectionRequirement || "未维护点检要求"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">保养要求</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 whitespace-pre-wrap">
                {viewingEquipment.maintenanceRequirement || "未维护保养要求"}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">点检明细</h3>
                <Button variant="outline" size="sm" onClick={() => handleInspection()}>
                  <Plus className="h-4 w-4 mr-1" />
                  新增点检
                </Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>点检日期</TableHead>
                      <TableHead>点检类型</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead>点检人</TableHead>
                      <TableHead>点检项目</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspectionRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">暂无点检记录</TableCell>
                      </TableRow>
                    ) : (
                      inspectionRecords.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDateValue(record.inspectionDate)}</TableCell>
                          <TableCell>{record.inspectionType ? ({ daily: "日点检", shift: "班次点检", weekly: "周点检", monthly: "月点检", special: "专项点检" } as Record<string, string>)[record.inspectionType] || record.inspectionType : "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record.result === "shutdown" ? "destructive" : record.result === "abnormal" ? "secondary" : "default"}>
                              {record.result === "shutdown" ? "停机" : record.result === "abnormal" ? "异常" : "正常"}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.inspector || "-"}</TableCell>
                          <TableCell>{Array.isArray(record.detailItems) && record.detailItems.length > 0 ? record.detailItems.map((item: any) => item.itemName).filter(Boolean).join("、") : "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">保养明细</h3>
                <Button variant="outline" size="sm" onClick={() => handleMaintenance()}>
                  <Plus className="h-4 w-4 mr-1" />
                  新增保养
                </Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>保养日期</TableHead>
                      <TableHead>保养类型</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead>执行人</TableHead>
                      <TableHead>保养项目</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">暂无保养记录</TableCell>
                      </TableRow>
                    ) : (
                      maintenanceRecords.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDateValue(record.maintenanceDate)}</TableCell>
                          <TableCell>{record.maintenanceType ? ({ routine: "日常保养", periodic: "周期保养", annual: "年度保养", special: "专项保养" } as Record<string, string>)[record.maintenanceType] || record.maintenanceType : "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record.result === "need_repair" ? "destructive" : record.result === "pass" ? "default" : "outline"}>
                              {record.result === "need_repair" ? "需维修" : record.result === "pass" ? "通过" : "待确认"}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.executor || "-"}</TableCell>
                          <TableCell>{Array.isArray(record.detailItems) && record.detailItems.length > 0 ? record.detailItems.map((item: any) => item.itemName).filter(Boolean).join("、") : "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {viewingEquipment.remarks && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingEquipment.remarks}</p>
              </div>
            )}
          </>
        );
      })()}
    </div>

    <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
      <div className="flex gap-2 flex-wrap"></div>
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        <Button variant="outline" size="sm" onClick={() => {
          setViewDialogOpen(false);
          if (viewingEquipment) handleEdit(viewingEquipment);
        }}>编辑</Button>
      </div>
    </div>
</DraggableDialogContent>
</DraggableDialog>
)}

        {viewingMoldTooling && (
          <DraggableDialog open={moldToolingViewDialogOpen} onOpenChange={setMoldToolingViewDialogOpen}>
            <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">模具工装详情</h2>
                <p className="text-sm text-muted-foreground">
                  {viewingMoldTooling.code}
                  <span className="mx-2">·</span>
                  {viewingMoldTooling.name}
                </p>
              </div>

              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="名称">{viewingMoldTooling.name}</FieldRow>
                      <FieldRow label="类别">{assetTypeMap[viewingMoldTooling.type]}</FieldRow>
                      <FieldRow label="型号规格">{viewingMoldTooling.model || "-"}</FieldRow>
                      <FieldRow label="模腔数">{viewingMoldTooling.cavityCount}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="适用工序">{viewingMoldTooling.applicableProcess || "-"}</FieldRow>
                      <FieldRow label="适用产品">{viewingMoldTooling.applicableProduct || "-"}</FieldRow>
                      <FieldRow label="材质">{viewingMoldTooling.material || "-"}</FieldRow>
                      <FieldRow label="状态">
                        <Badge className={moldToolingStatusMap[viewingMoldTooling.status]?.className}>
                          {moldToolingStatusMap[viewingMoldTooling.status]?.label || viewingMoldTooling.status}
                        </Badge>
                      </FieldRow>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">位置与责任</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="位置">{viewingMoldTooling.location || "-"}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="责任人">{viewingMoldTooling.responsible || "-"}</FieldRow>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">点检信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="最近点检">{formatDateValue(viewingMoldTooling.lastCheckDate)}</FieldRow>
                    </div>
                  </div>
                </div>

                {viewingMoldTooling.remarks ? (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingMoldTooling.remarks}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setMoldToolingViewDialogOpen(false)}>关闭</Button>
              </div>
            </DraggableDialogContent>
          </DraggableDialog>
        )}
      </div>
    </ERPLayout>
  );
}
