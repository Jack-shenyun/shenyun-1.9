import { useEffect, useMemo, useRef, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ClipboardList, Plus, Search, Edit, Trash2, Eye, AlertTriangle, CheckCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatDateValue, formatDisplayNumber, roundToDigits } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { openEnglishPrintPreviewWindow } from "@/lib/printPreview";
import { useLocation } from "wouter";

interface EnvironmentRecord {
  id: number | string;
  recordNo: string;
  roomName: string;
  roomCode: string;
  recordDate: string;
  recordTime: string;
  temperature: number | null;
  humidity: number | null;
  tempMin: number | null;
  tempMax: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  isNormal: boolean;
  abnormalDesc?: string;
  correctionAction?: string;
  recorder: string;
  productionOrderNo?: string;
  productName?: string;
  batchNo?: string;
  processName?: string;
  productionTeam?: string;
  moduleType?: string;
  sourceType?: "manual" | "production";
  detailItems?: Array<{ itemName?: string; requirement?: string; conclusion?: string; inputValue?: string; category?: string }>;
  equipmentItems?: Array<{ name?: string; used?: boolean }>;
  remark?: string;
}

interface ProductionRecordListItem {
  id: number | string;
  recordNo: string;
  recordType: string;
  recordDate: string;
  recordTime?: string;
  productName?: string;
  batchNo?: string;
  processName?: string;
  workshopName?: string;
  productionTeam?: string;
  plannedQty?: string;
  actualQty?: string;
  scrapQty?: string;
  status: string;
  aggregatedActualQty?: string;
  aggregatedScrapQty?: string;
  detailItems?: Array<{ itemName?: string; requirement?: string; conclusion?: string; inputValue?: string; category?: string }>;
  equipmentItems?: Array<{ name?: string; used?: boolean }>;
  moldItems?: Array<{ name?: string }>;
  remark?: string;
}

interface EquipmentInspectionRecordListItem {
  id: number | string;
  inspectionNo: string;
  equipmentCode: string;
  equipmentName: string;
  inspectionType: string;
  inspectionDate: string;
  inspector: string;
  result: string;
  status: string;
  detailItems?: Array<{ itemName?: string; standard?: string; method?: string; result?: string; abnormalDesc?: string; actionRequired?: string; remark?: string }>;
  remark?: string;
}

interface EquipmentMaintenanceRecordListItem {
  id: number | string;
  maintenanceNo: string;
  equipmentCode: string;
  equipmentName: string;
  maintenanceType: string;
  maintenanceDate: string;
  nextMaintenanceDate: string;
  executor: string;
  reviewer: string;
  result: string;
  status: string;
  detailItems?: Array<{ itemName?: string; content?: string; standard?: string; result?: string; replacedPart?: string; remark?: string }>;
  remark?: string;
}

const roomOptions = [
  { value: "cleanroom_10k", label: "万级洁净室" },
  { value: "cleanroom_100k", label: "十万级洁净室" },
  { value: "assembly", label: "装配车间" },
  { value: "packaging", label: "包装车间" },
  { value: "warehouse", label: "成品仓库" },
];

function parseJsonArray(raw: unknown) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseNumberValue(value: unknown) {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
}

function formatWholeNumber(value: unknown) {
  const num = parseNumberValue(value);
  return formatDisplayNumber(num);
}

function normalizeQuantityInputValue(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const num = Number(text);
  if (!Number.isFinite(num)) return text;
  return formatDisplayNumber(num);
}

function buildRecordTimestamp(recordDate?: unknown, recordTime?: unknown) {
  return new Date(`${String(recordDate || "1970-01-01").slice(0, 10)}T${String(recordTime || "00:00") || "00:00"}`).getTime();
}

function toDateInputValue(value?: string | Date | null) {
  return formatDateValue(value) || "";
}

function getProcessRecordGroupKey(batchNo?: unknown, processName?: unknown) {
  return `${String(batchNo || "").trim()}::${String(processName || "").trim()}`;
}

function deriveAutoProcessStatus(totalActualQty: unknown, plannedQty: unknown, hasAbnormal = false) {
  const actual = parseNumberValue(totalActualQty);
  const planned = parseNumberValue(plannedQty);
  if (planned > 0 && actual >= planned) return "completed";
  if (hasAbnormal) return "abnormal";
  return "in_progress";
}

function normalizeDetailCategory(value: unknown) {
  const text = String(value || "");
  if (text.includes("清场")) return "清场";
  if (text.includes("质控")) return "质控点";
  if (text.includes("首件") || text.includes("检验")) return "首件";
  return text;
}

function getChildProductionRecordTypeLabel(record: ProductionRecordListItem) {
  const categories = new Set(
    (record.detailItems || []).map((item) => normalizeDetailCategory(item?.category || ""))
  );

  if (record.recordType === "clean_room" || categories.has("清场")) return "清场记录";
  if ((record.moldItems || []).length > 0) return "模具记录";
  if (record.recordType === "material_usage") return "材料使用记录";
  if (record.recordType === "temperature_humidity") return "温湿度记录";
  if ((record.equipmentItems || []).length > 0) return "设备记录";
  if (categories.has("质控点")) return "质控点记录";
  if (record.recordType === "first_piece" || categories.has("首件")) return "首件记录";
  return "";
}

function shouldIncludeChildProductionRecord(record: ProductionRecordListItem) {
  const label = getChildProductionRecordTypeLabel(record);
  if (!label) return false;
  return label !== "首件记录";
}

const inspectionTypeLabelMap: Record<string, string> = {
  daily: "日点检",
  shift: "班次点检",
  weekly: "周点检",
  monthly: "月点检",
  special: "专项点检",
};

const maintenanceTypeLabelMap: Record<string, string> = {
  routine: "日常保养",
  periodic: "周期保养",
  annual: "年度保养",
  special: "专项保养",
};

export default function ProductionEnvironmentPage() {
  const PAGE_SIZE = 10;
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: listData = [], isLoading } = trpc.environmentRecords.list.useQuery({ limit: 500 });
  const { data: productionListData = [], isLoading: isProductionLoading } = trpc.productionRecords.list.useQuery({ limit: 500 });
  const { data: inspectionListData = [] } = trpc.equipmentInspections.list.useQuery();
  const { data: maintenanceListData = [] } = trpc.equipmentMaintenances.list.useQuery();
  const translateToEnglishMutation = trpc.ra.ai.translateToEnglish.useMutation();
  const createMutation = trpc.environmentRecords.create.useMutation({
    onSuccess: () => {
      utils.environmentRecords.list.invalidate();
      toast.success("环境记录已保存");
      setDialogOpen(false);
    },
    onError: (error) => toast.error("保存失败", { description: error.message }),
  });
  const updateMutation = trpc.environmentRecords.update.useMutation({
    onSuccess: () => {
      utils.environmentRecords.list.invalidate();
      toast.success("记录已更新");
      setDialogOpen(false);
    },
    onError: (error) => toast.error("更新失败", { description: error.message }),
  });
  const deleteMutation = trpc.environmentRecords.delete.useMutation({
    onSuccess: () => {
      utils.environmentRecords.list.invalidate();
      toast.success("记录已删除");
    },
    onError: (error) => toast.error("删除失败", { description: error.message }),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("production");
  const [selectedRecord, setSelectedRecord] = useState<EnvironmentRecord | null>(null);
  const [selectedProductionRecord, setSelectedProductionRecord] = useState<ProductionRecordListItem | null>(null);
  const [selectedInspectionRecord, setSelectedInspectionRecord] = useState<EquipmentInspectionRecordListItem | null>(null);
  const [selectedMaintenanceRecord, setSelectedMaintenanceRecord] = useState<EquipmentMaintenanceRecordListItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const detailPrintRef = useRef<HTMLDivElement | null>(null);

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

  const records = useMemo<EnvironmentRecord[]>(
    () =>
      ((listData as any[]) || []).map((record: any) => ({
        id: record.id,
        recordNo: String(record.recordNo || ""),
        roomName: String(record.roomName || ""),
        roomCode: String(record.roomCode || ""),
        recordDate: formatDateValue(record.recordDate) || "",
        recordTime: String(record.recordTime || ""),
        temperature: record.temperature !== undefined && record.temperature !== null && record.temperature !== "" ? Number(record.temperature) : null,
        humidity: record.humidity !== undefined && record.humidity !== null && record.humidity !== "" ? Number(record.humidity) : null,
        tempMin: record.tempMin !== undefined && record.tempMin !== null && record.tempMin !== "" ? Number(record.tempMin) : null,
        tempMax: record.tempMax !== undefined && record.tempMax !== null && record.tempMax !== "" ? Number(record.tempMax) : null,
        humidityMin: record.humidityMin !== undefined && record.humidityMin !== null && record.humidityMin !== "" ? Number(record.humidityMin) : null,
        humidityMax: record.humidityMax !== undefined && record.humidityMax !== null && record.humidityMax !== "" ? Number(record.humidityMax) : null,
        isNormal: record.isNormal === true || record.isNormal === 1 || String(record.isNormal) === "1",
        abnormalDesc: record.abnormalDesc ? String(record.abnormalDesc) : "",
        correctionAction: record.correctionAction ? String(record.correctionAction) : "",
        recorder: String(record.recorder || ""),
        productionOrderNo: String(record.productionOrderNo || ""),
        productName: String(record.productName || ""),
        batchNo: String(record.batchNo || ""),
        processName: String(record.processName || ""),
        productionTeam: String(record.productionTeam || ""),
        moduleType: String(record.moduleType || ""),
        sourceType: (record.sourceType || "manual") as "manual" | "production",
        detailItems: parseJsonArray(record.detailItems),
        equipmentItems: parseJsonArray(record.equipmentItems),
        remark: String(record.remark || ""),
      })).sort((a, b) => {
        const aTime = new Date(`${a.recordDate || "1970-01-01"}T${a.recordTime || "00:00"}`).getTime();
        const bTime = new Date(`${b.recordDate || "1970-01-01"}T${b.recordTime || "00:00"}`).getTime();
        return bTime - aTime;
      }),
    [listData]
  );

  const productionRecords = useMemo<ProductionRecordListItem[]>(
    () =>
      ((productionListData as any[]) || [])
        .map((record: any) => ({
          id: record.id,
          recordNo: String(record.recordNo || ""),
          recordType: String(record.recordType || ""),
          recordDate: formatDateValue(record.recordDate) || "",
          recordTime: String(record.recordTime || ""),
          productName: String(record.productName || ""),
          batchNo: String(record.batchNo || ""),
          processName: String(record.processName || record.workstationName || ""),
          workshopName: String(record.workshopName || ""),
          productionTeam: String(record.productionTeam || ""),
          plannedQty: normalizeQuantityInputValue(record.plannedQty),
          actualQty: normalizeQuantityInputValue(record.actualQty),
          scrapQty: normalizeQuantityInputValue(record.scrapQty),
          status: String(record.status || ""),
          detailItems: parseJsonArray(record.detailItems),
          equipmentItems: parseJsonArray(record.equipmentItems),
          moldItems: parseJsonArray(record.moldItems),
          remark: String(record.remark || ""),
        }))
        .sort((a, b) => {
          const aTime = new Date(`${a.recordDate || "1970-01-01"}T00:00`).getTime();
          const bTime = new Date(`${b.recordDate || "1970-01-01"}T00:00`).getTime();
          return bTime - aTime;
        }),
    [productionListData]
  );

  const equipmentInspectionRecords = useMemo<EquipmentInspectionRecordListItem[]>(
    () =>
      ((inspectionListData as any[]) || []).map((record: any) => ({
        id: record.id,
        inspectionNo: String(record.inspectionNo || ""),
        equipmentCode: String(record.equipmentCode || ""),
        equipmentName: String(record.equipmentName || ""),
        inspectionType: String(record.inspectionType || ""),
        inspectionDate: toDateInputValue(record.inspectionDate),
        inspector: String(record.inspector || ""),
        result: String(record.result || ""),
        status: String(record.status || ""),
        detailItems: Array.isArray(record.detailItems) ? record.detailItems : [],
        remark: String(record.remark || ""),
      })),
    [inspectionListData]
  );

  const equipmentMaintenanceRecords = useMemo<EquipmentMaintenanceRecordListItem[]>(
    () =>
      ((maintenanceListData as any[]) || []).map((record: any) => ({
        id: record.id,
        maintenanceNo: String(record.maintenanceNo || ""),
        equipmentCode: String(record.equipmentCode || ""),
        equipmentName: String(record.equipmentName || ""),
        maintenanceType: String(record.maintenanceType || ""),
        maintenanceDate: toDateInputValue(record.maintenanceDate),
        nextMaintenanceDate: toDateInputValue(record.nextMaintenanceDate),
        executor: String(record.executor || ""),
        reviewer: String(record.reviewer || ""),
        result: String(record.result || ""),
        status: String(record.status || ""),
        detailItems: Array.isArray(record.detailItems) ? record.detailItems : [],
        remark: String(record.remark || ""),
      })),
    [maintenanceListData]
  );

  const productionProcessAggregateMap = useMemo(() => {
    const aggregateMap = new Map<string, {
      plannedQty: number;
      totalActualQty: number;
      totalScrapQty: number;
      hasAbnormal: boolean;
      status: string;
    }>();

    [...productionRecords]
      .sort((a, b) => buildRecordTimestamp(a.recordDate, a.recordTime) - buildRecordTimestamp(b.recordDate, b.recordTime))
      .forEach((record) => {
        const key = getProcessRecordGroupKey(record.batchNo, record.processName);
        if (!String(record.batchNo || "").trim() || !String(record.processName || "").trim()) return;

        const existing = aggregateMap.get(key);
        const plannedQty = parseNumberValue(record.plannedQty);
        const actualQty = parseNumberValue(record.actualQty);
        const scrapQty = parseNumberValue(record.scrapQty);
        const hasAbnormal = String(record.status || "") === "abnormal";

        if (!existing) {
          aggregateMap.set(key, {
            plannedQty,
            totalActualQty: actualQty,
            totalScrapQty: scrapQty,
            hasAbnormal,
            status: "in_progress",
          });
          return;
        }

        existing.plannedQty = Math.max(existing.plannedQty, plannedQty);
        existing.totalActualQty = roundToDigits(existing.totalActualQty + actualQty, 4);
        existing.totalScrapQty = roundToDigits(existing.totalScrapQty + scrapQty, 4);
        existing.hasAbnormal = existing.hasAbnormal || hasAbnormal;
      });

    aggregateMap.forEach((item) => {
      item.status = deriveAutoProcessStatus(item.totalActualQty, item.plannedQty, item.hasAbnormal);
    });

    return aggregateMap;
  }, [productionRecords]);

  const syncedProductionRecords = useMemo(
    () =>
      productionRecords.map((record) => {
        const aggregate = productionProcessAggregateMap.get(
          getProcessRecordGroupKey(record.batchNo, record.processName),
        );
        if (!aggregate) return record;
        return {
          ...record,
          status: aggregate.status,
          aggregatedActualQty: String(aggregate.totalActualQty),
          aggregatedScrapQty: String(aggregate.totalScrapQty),
        };
      }),
    [productionProcessAggregateMap, productionRecords],
  );

  const childProductionRecords = useMemo(
    () => syncedProductionRecords.filter(shouldIncludeChildProductionRecord),
    [syncedProductionRecords]
  );

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
      updateMutation.mutate({
        id: Number(selectedRecord.id),
        data: {
          roomName: roomLabel,
          roomCode: formData.roomCode,
          recordDate: formData.recordDate,
          recordTime: formData.recordTime,
          temperature: String(temp),
          humidity: String(hum),
          tempMin: String(tempMin),
          tempMax: String(tempMax),
          humidityMin: String(humMin),
          humidityMax: String(humMax),
          isNormal,
          abnormalDesc: formData.abnormalDesc || undefined,
          correctionAction: formData.correctionAction || undefined,
          productionOrderNo: formData.productionOrderNo || undefined,
          remark: formData.remark || undefined,
        },
      });
    } else {
      createMutation.mutate({
        sourceType: "manual",
        recordNo: `ENV-${formData.recordDate.replace(/-/g, "")}-${String(Date.now()).slice(-4)}`,
        moduleType: "手工环境记录",
        roomName: roomLabel,
        roomCode: formData.roomCode,
        recordDate: formData.recordDate,
        recordTime: formData.recordTime,
        temperature: String(temp),
        humidity: String(hum),
        tempMin: String(tempMin),
        tempMax: String(tempMax),
        humidityMin: String(humMin),
        humidityMax: String(humMax),
        isNormal,
        abnormalDesc: formData.abnormalDesc || undefined,
        correctionAction: formData.correctionAction || undefined,
        productionOrderNo: formData.productionOrderNo || undefined,
        remark: formData.remark || undefined,
      });
      if (!isNormal) toast.warning("⚠️ 温湿度超出正常范围，请及时处理！");
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const environmentOnlyRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          !["清场记录", "清洗记录", "消毒记录", "设备使用记录"].includes(String(record.moduleType || ""))
      ),
    [records]
  );

  const cleaningRecords = useMemo(
    () => records.filter((record) => record.moduleType === "清场记录"),
    [records]
  );

  const washingRecords = useMemo(
    () => records.filter((record) => record.moduleType === "清洗记录"),
    [records]
  );

  const disinfectionRecords = useMemo(
    () => records.filter((record) => record.moduleType === "消毒记录"),
    [records]
  );

  const equipmentRunRecords = useMemo(
    () => records.filter((record) => record.moduleType === "设备使用记录"),
    [records]
  );

  const filteredProductionRecords = childProductionRecords.filter((record) =>
    record.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.batchNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.processName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    getChildProductionRecordTypeLabel(record).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEnvironmentRecords = environmentOnlyRecords.filter(r =>
    r.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productionOrderNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.processName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.moduleType || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCleaningRecords = cleaningRecords.filter(r =>
    r.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productionOrderNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.processName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.moduleType || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWashingRecords = washingRecords.filter(r =>
    r.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productionOrderNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.processName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.moduleType || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDisinfectionRecords = disinfectionRecords.filter(r =>
    r.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productionOrderNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.processName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.moduleType || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEquipmentRunRecords = equipmentRunRecords.filter(r =>
    r.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productionOrderNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.processName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.moduleType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.equipmentItems || []).some((item) => String(item.name || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEquipmentInspectionRecords = equipmentInspectionRecords.filter((record) =>
    record.inspectionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.equipmentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.inspector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEquipmentMaintenanceRecords = equipmentMaintenanceRecords.filter((record) =>
    record.maintenanceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.equipmentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.executor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentTotal =
    activeTab === "production"
      ? filteredProductionRecords.length
      : activeTab === "environment"
        ? filteredEnvironmentRecords.length
        : activeTab === "cleaning"
          ? filteredCleaningRecords.length
          : activeTab === "washing"
            ? filteredWashingRecords.length
            : activeTab === "disinfection"
              ? filteredDisinfectionRecords.length
              : activeTab === "equipment_inspection"
                ? filteredEquipmentInspectionRecords.length
                : activeTab === "equipment_maintenance"
                  ? filteredEquipmentMaintenanceRecords.length
                  : filteredEquipmentRunRecords.length;

  const totalPages = Math.max(1, Math.ceil(currentTotal / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = currentPage * PAGE_SIZE;
  const pagedProductionRecords = filteredProductionRecords.slice(pageStart, pageEnd);
  const pagedEnvironmentRecords = filteredEnvironmentRecords.slice(pageStart, pageEnd);
  const pagedCleaningRecords = filteredCleaningRecords.slice(pageStart, pageEnd);
  const pagedWashingRecords = filteredWashingRecords.slice(pageStart, pageEnd);
  const pagedDisinfectionRecords = filteredDisinfectionRecords.slice(pageStart, pageEnd);
  const pagedEquipmentInspectionRecords = filteredEquipmentInspectionRecords.slice(pageStart, pageEnd);
  const pagedEquipmentMaintenanceRecords = filteredEquipmentMaintenanceRecords.slice(pageStart, pageEnd);
  const pagedEquipmentRunRecords = filteredEquipmentRunRecords.slice(pageStart, pageEnd);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const currentSearchPlaceholder =
    activeTab === "production"
      ? "搜索记录编号、产品、工序、批号..."
      : activeTab === "environment"
        ? "搜索环境记录编号、区域、指令、产品..."
        : activeTab === "cleaning"
          ? "搜索清场记录编号、区域、指令..."
          : activeTab === "washing"
            ? "搜索清洗记录编号、区域、指令..."
            : activeTab === "disinfection"
              ? "搜索消毒记录编号、区域、指令..."
              : activeTab === "equipment_inspection"
                ? "搜索点检单号、设备编号、设备名称、点检人..."
                : activeTab === "equipment_maintenance"
                  ? "搜索保养单号、设备编号、设备名称、执行人..."
                  : "搜索设备运行记录编号、设备名称、工序、区域...";

  const createActionMap: Record<string, { label: string; route?: string }> = {
    production: { label: "新增生产记录", route: "/production/records?action=new" },
    environment: { label: "新增环境记录" },
    cleaning: { label: "新增清场记录", route: "/production/records?action=new&processCategory=%E6%B8%85%E5%9C%BA&recordType=clean_room" },
    washing: { label: "新增洁净服/鞋清洗消毒记录", route: "/production/cleaning-records?action=new" },
    disinfection: { label: "新增消毒剂配制记录", route: "/production/disinfection-records?action=new" },
    equipment_inspection: { label: "新增设备点检", route: "/production/equipment-inspection?action=new" },
    equipment_maintenance: { label: "新增设备保养", route: "/production/equipment-maintenance?action=new" },
    equipment_run: { label: "新增设备运行记录", route: "/production/records?action=new&processCategory=%E8%AE%BE%E5%A4%87" },
  };

  const currentCreateAction = createActionMap[activeTab] || createActionMap.environment;

  const handleCreateEntry = () => {
    if (activeTab === "environment") {
      handleAdd();
      return;
    }
    if (currentCreateAction.route) {
      setLocation(currentCreateAction.route);
      return;
    }
    handleAdd();
  };

  const currentStatCards = useMemo(() => {
    if (activeTab === "production") {
      return [
        { label: "生产记录", value: childProductionRecords.length, color: "" },
        { label: "已完成", value: childProductionRecords.filter((item) => item.status === "completed").length, color: "text-green-600" },
        { label: "进行中", value: childProductionRecords.filter((item) => item.status === "in_progress").length, color: "text-blue-600" },
        { label: "异常记录", value: childProductionRecords.filter((item) => item.status === "abnormal").length, color: "text-red-600" },
      ];
    }
    if (activeTab === "environment") {
      return [
        { label: "环境记录", value: environmentOnlyRecords.length, color: "" },
        { label: "正常记录", value: environmentOnlyRecords.filter((item) => item.isNormal).length, color: "text-green-600" },
        { label: "异常记录", value: environmentOnlyRecords.filter((item) => !item.isNormal).length, color: "text-red-600" },
        { label: "今日记录", value: environmentOnlyRecords.filter((item) => item.recordDate === new Date().toISOString().slice(0, 10)).length, color: "text-blue-600" },
      ];
    }
    if (activeTab === "cleaning") {
      return [
        { label: "清场记录", value: cleaningRecords.length, color: "" },
        { label: "正常记录", value: cleaningRecords.filter((item) => item.isNormal).length, color: "text-green-600" },
        { label: "异常记录", value: cleaningRecords.filter((item) => !item.isNormal).length, color: "text-red-600" },
        { label: "今日记录", value: cleaningRecords.filter((item) => item.recordDate === new Date().toISOString().slice(0, 10)).length, color: "text-blue-600" },
      ];
    }
    if (activeTab === "washing") {
      return [
        { label: "清洗记录", value: washingRecords.length, color: "" },
        { label: "正常记录", value: washingRecords.filter((item) => item.isNormal).length, color: "text-green-600" },
        { label: "异常记录", value: washingRecords.filter((item) => !item.isNormal).length, color: "text-red-600" },
        { label: "今日记录", value: washingRecords.filter((item) => item.recordDate === new Date().toISOString().slice(0, 10)).length, color: "text-blue-600" },
      ];
    }
    if (activeTab === "disinfection") {
      return [
        { label: "消毒记录", value: disinfectionRecords.length, color: "" },
        { label: "正常记录", value: disinfectionRecords.filter((item) => item.isNormal).length, color: "text-green-600" },
        { label: "异常记录", value: disinfectionRecords.filter((item) => !item.isNormal).length, color: "text-red-600" },
        { label: "今日记录", value: disinfectionRecords.filter((item) => item.recordDate === new Date().toISOString().slice(0, 10)).length, color: "text-blue-600" },
      ];
    }
    if (activeTab === "equipment_inspection") {
      return [
        { label: "点检总数", value: equipmentInspectionRecords.length, color: "" },
        { label: "已完成", value: equipmentInspectionRecords.filter((item) => item.status === "completed").length, color: "text-green-600" },
        { label: "异常记录", value: equipmentInspectionRecords.filter((item) => item.result === "abnormal").length, color: "text-amber-600" },
        { label: "停机记录", value: equipmentInspectionRecords.filter((item) => item.result === "shutdown").length, color: "text-red-600" },
      ];
    }
    if (activeTab === "equipment_maintenance") {
      return [
        { label: "保养总数", value: equipmentMaintenanceRecords.length, color: "" },
        { label: "已完成", value: equipmentMaintenanceRecords.filter((item) => item.status === "completed").length, color: "text-green-600" },
        { label: "进行中", value: equipmentMaintenanceRecords.filter((item) => item.status === "in_progress").length, color: "text-blue-600" },
        { label: "需维修", value: equipmentMaintenanceRecords.filter((item) => item.result === "need_repair").length, color: "text-red-600" },
      ];
    }
    return [
      { label: "设备运行记录", value: equipmentRunRecords.length, color: "" },
      { label: "使用设备数", value: equipmentRunRecords.reduce((sum, item) => sum + (item.equipmentItems || []).length, 0), color: "text-blue-600" },
      { label: "异常记录", value: equipmentRunRecords.filter((item) => !item.isNormal).length, color: "text-red-600" },
      { label: "今日记录", value: equipmentRunRecords.filter((item) => item.recordDate === new Date().toISOString().slice(0, 10)).length, color: "text-green-600" },
    ];
  }, [
    activeTab,
    childProductionRecords,
    cleaningRecords,
    washingRecords,
    disinfectionRecords,
    environmentOnlyRecords,
    equipmentInspectionRecords,
    equipmentMaintenanceRecords,
    equipmentRunRecords,
  ]);
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => {
    const renderValue = (value: React.ReactNode): React.ReactNode => {
      if (value == null || value === "") return "-";
      if (value instanceof Date) return formatDateValue(value);
      if (Array.isArray(value)) {
        const items = value
          .map((item) => renderValue(item))
          .filter((item) => item !== "-" && item !== "");
        return items.length > 0 ? items.join(" ") : "-";
      }
      if (typeof value === "object" && !React.isValidElement(value)) {
        return String(value);
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

  const productionStatusMap: Record<string, string> = {
    in_progress: "进行中",
    completed: "已完成",
    abnormal: "异常",
  };

  const handlePrintEnglish = async (title: string) => {
    if (!detailPrintRef.current) {
      toast.error("暂无可打印内容");
      return;
    }

    toast.info("正在生成英文版打印预览...");
    const opened = await openEnglishPrintPreviewWindow({
      title,
      element: detailPrintRef.current,
      aiTranslate: async (text) => {
        const result = await translateToEnglishMutation.mutateAsync({
          content: text,
          context: "生产记录英文打印。要求：已有英文保持不变；优先使用 FDA/QSR 常用简称；医疗器械和生产质量术语使用专业英文。",
        });
        return result.translatedContent || "";
      },
    });

    if (!opened) {
      toast.error("英文打印预览打开失败");
    }
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              记录管理
            </h1>
            <p className="text-muted-foreground mt-1">统一查看生产、环境、清场、消毒、设备点检、设备保养和设备运行记录</p>
          </div>
          <Button onClick={handleCreateEntry}>
            <Plus className="h-4 w-4 mr-2" />
            {currentCreateAction.label}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentStatCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${card.color}`.trim()}>{card.value}</div>
                <div className="text-sm text-muted-foreground">{card.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-300 bg-transparent px-0 py-0">
              <TabsTrigger value="production" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">生产记录</TabsTrigger>
              <TabsTrigger value="environment" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">环境记录</TabsTrigger>
              <TabsTrigger value="cleaning" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">清场记录</TabsTrigger>
              <TabsTrigger value="washing" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">清洗记录</TabsTrigger>
              <TabsTrigger value="disinfection" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">消毒记录</TabsTrigger>
              <TabsTrigger value="equipment_inspection" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">设备点检</TabsTrigger>
              <TabsTrigger value="equipment_maintenance" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">设备保养</TabsTrigger>
              <TabsTrigger value="equipment_run" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">设备运行</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={currentSearchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          {activeTab === "production" ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">记录编号</TableHead>
                  <TableHead className="text-center font-bold">记录类型</TableHead>
                  <TableHead className="text-center font-bold">产品信息</TableHead>
                  <TableHead className="text-center font-bold">工序信息</TableHead>
                  <TableHead className="text-center font-bold">数量</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">记录日期</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProductionRecords.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono text-sm">{record.recordNo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{getChildProductionRecordTypeLabel(record)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>{record.productName || "-"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{record.batchNo || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>{record.processName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{record.workshopName || record.productionTeam || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <div>计划：{record.plannedQty ? formatWholeNumber(record.plannedQty) : "-"}</div>
                      <div>合格：{record.aggregatedActualQty ? formatWholeNumber(record.aggregatedActualQty) : (record.actualQty ? formatWholeNumber(record.actualQty) : "-")}</div>
                      <div>报废：{record.aggregatedScrapQty ? formatWholeNumber(record.aggregatedScrapQty) : (record.scrapQty ? formatWholeNumber(record.scrapQty) : "-")}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={record.status === "completed" ? "default" : record.status === "abnormal" ? "destructive" : "outline"}>
                        {productionStatusMap[record.status] || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(record.recordDate)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProductionRecord(record);
                          setSelectedRecord(null);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProductionRecords.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isProductionLoading ? "加载中..." : "暂无数据"}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          ) : activeTab === "equipment_inspection" ? (
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
                {pagedEquipmentInspectionRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono text-sm">{record.inspectionNo}</TableCell>
                    <TableCell className="text-center">
                      <div>{record.equipmentName || "-"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{record.equipmentCode || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">{inspectionTypeLabelMap[record.inspectionType] || record.inspectionType || "-"}</TableCell>
                    <TableCell className="text-center">{formatDateValue(record.inspectionDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={record.result === "shutdown" ? "destructive" : record.result === "abnormal" ? "secondary" : "outline"}>
                        {record.result === "normal" ? "正常" : record.result === "abnormal" ? "异常" : record.result === "shutdown" ? "停机" : record.result || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{record.inspector || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={record.status === "completed" ? "default" : "outline"}>
                        {record.status === "completed" ? "已完成" : record.status === "draft" ? "草稿" : record.status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInspectionRecord(record);
                          setSelectedMaintenanceRecord(null);
                          setSelectedProductionRecord(null);
                          setSelectedRecord(null);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEquipmentInspectionRecords.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无点检记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          ) : activeTab === "equipment_maintenance" ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">保养单号</TableHead>
                  <TableHead className="text-center font-bold">设备</TableHead>
                  <TableHead className="text-center font-bold">保养类型</TableHead>
                  <TableHead className="text-center font-bold">保养日期</TableHead>
                  <TableHead className="text-center font-bold">下次保养</TableHead>
                  <TableHead className="text-center font-bold">结果</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedEquipmentMaintenanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono text-sm">{record.maintenanceNo}</TableCell>
                    <TableCell className="text-center">
                      <div>{record.equipmentName || "-"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{record.equipmentCode || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">{maintenanceTypeLabelMap[record.maintenanceType] || record.maintenanceType || "-"}</TableCell>
                    <TableCell className="text-center">{formatDateValue(record.maintenanceDate)}</TableCell>
                    <TableCell className="text-center">{formatDateValue(record.nextMaintenanceDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={record.result === "need_repair" ? "destructive" : record.result === "pass" ? "default" : "outline"}>
                        {record.result === "pass" ? "通过" : record.result === "need_repair" ? "需维修" : record.result === "pending" ? "待确认" : record.result || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={record.status === "completed" ? "default" : record.status === "in_progress" ? "secondary" : "outline"}>
                        {record.status === "completed" ? "已完成" : record.status === "in_progress" ? "进行中" : record.status === "planned" ? "计划中" : record.status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMaintenanceRecord(record);
                          setSelectedInspectionRecord(null);
                          setSelectedProductionRecord(null);
                          setSelectedRecord(null);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEquipmentMaintenanceRecords.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无保养记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">记录编号</TableHead>
                  <TableHead className="text-center font-bold">记录类型</TableHead>
                  <TableHead className="text-center font-bold">车间/区域</TableHead>
                  <TableHead className="text-center font-bold">产品信息</TableHead>
                  <TableHead className="text-center font-bold">工序信息</TableHead>
                  <TableHead className="text-center font-bold">记录内容</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">记录时间</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "environment"
                  ? pagedEnvironmentRecords
                  : activeTab === "cleaning"
                    ? pagedCleaningRecords
                    : activeTab === "washing"
                      ? pagedWashingRecords
                    : activeTab === "disinfection"
                      ? pagedDisinfectionRecords
                      : pagedEquipmentRunRecords).map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono text-sm">{record.recordNo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {record.moduleType ||
                          (activeTab === "cleaning"
                            ? "清场记录"
                            : activeTab === "washing"
                              ? "清洗记录"
                            : activeTab === "disinfection"
                              ? "消毒记录"
                              : activeTab === "equipment_run"
                                ? "设备使用记录"
                                : "环境记录")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{record.roomName || "-"}</TableCell>
                    <TableCell className="text-center">
                      <div>{record.productName || "-"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{record.batchNo || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>{record.processName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{record.productionTeam || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {record.temperature !== null || record.humidity !== null ? (
                        <div className="space-y-1">
                          <div>温度：{record.temperature ?? "-"}</div>
                          <div>湿度：{record.humidity ?? "-"}</div>
                        </div>
                      ) : record.detailItems && record.detailItems.length > 0 ? (
                        <div>{record.detailItems.length} 项记录</div>
                      ) : record.equipmentItems && record.equipmentItems.length > 0 ? (
                        <div>{record.equipmentItems.length} 台设备</div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.isNormal ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />正常</Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />异常</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(record.recordDate)} {record.recordTime}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record);
                            setSelectedProductionRecord(null);
                            setSelectedInspectionRecord(null);
                            setSelectedMaintenanceRecord(null);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {activeTab === "environment" && record.sourceType !== "production" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(record.id as number)}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {currentTotal === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isLoading ? "加载中..." : "暂无数据"}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
        <TablePaginationFooter total={currentTotal} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        {/* 新增/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
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
                  <DateTextInput value={formData.recordDate} onChange={(value) => setFormData({ ...formData, recordDate: value })} />
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
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    {selectedProductionRecord ? (
      <div className="space-y-4">
        <div ref={detailPrintRef} className="space-y-4" data-print-title="Production Record">
          <div className="border-b pb-3">
            <h2 className="text-lg font-semibold">生产记录详情</h2>
            <p className="text-sm text-muted-foreground">
                {selectedProductionRecord.recordNo}
                <Badge variant="outline" className="ml-2">
                {getChildProductionRecordTypeLabel(selectedProductionRecord)}
                </Badge>
            </p>
          </div>

          <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="记录类型">{getChildProductionRecordTypeLabel(selectedProductionRecord)}</FieldRow>
                <FieldRow label="记录日期">{formatDateValue(selectedProductionRecord.recordDate)}</FieldRow>
                <FieldRow label="状态">{productionStatusMap[selectedProductionRecord.status] || selectedProductionRecord.status}</FieldRow>
              </div>
              <div>
                <FieldRow label="产品名称">{selectedProductionRecord.productName || "-"}</FieldRow>
                <FieldRow label="生产批号">{selectedProductionRecord.batchNo || "-"}</FieldRow>
                <FieldRow label="工序信息">{selectedProductionRecord.processName || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">数量信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="计划数量">{selectedProductionRecord.plannedQty ? formatWholeNumber(selectedProductionRecord.plannedQty) : "-"}</FieldRow>
                <FieldRow label="合格数量">{selectedProductionRecord.actualQty ? formatWholeNumber(selectedProductionRecord.actualQty) : "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="报废数量">{selectedProductionRecord.scrapQty ? formatWholeNumber(selectedProductionRecord.scrapQty) : "-"}</FieldRow>
                <FieldRow label="车间/班组">{selectedProductionRecord.workshopName || selectedProductionRecord.productionTeam || "-"}</FieldRow>
              </div>
            </div>
          </div>

          {selectedProductionRecord.detailItems && selectedProductionRecord.detailItems.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">记录明细</h3>
              <div className="space-y-2">
                {selectedProductionRecord.detailItems.map((item, index) => (
                  <div key={`${selectedProductionRecord.id}-${index}`} className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.itemName || "-"}</div>
                      <Badge variant="outline">{item.category || "-"}</Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">要求：{item.requirement || "-"}</div>
                    <div className="mt-1 text-muted-foreground">录入：{item.inputValue || "-"}</div>
                    <div className="mt-1 text-muted-foreground">结论：{item.conclusion || "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {selectedProductionRecord.remark ? (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedProductionRecord.remark}</p>
            </div>
          ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => void handlePrintEnglish("Production Record")}>
            <Printer className="h-4 w-4 mr-1" />
            打印英文版
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        </div>
      </div>
    ) : selectedInspectionRecord ? (
      <div className="space-y-4">
        <div ref={detailPrintRef} className="space-y-4" data-print-title="Equipment Inspection">
          <div className="border-b pb-3">
            <h2 className="text-lg font-semibold">设备点检详情</h2>
            <p className="text-sm text-muted-foreground">
              {selectedInspectionRecord.inspectionNo}
              <Badge variant={selectedInspectionRecord.result === "shutdown" ? "destructive" : selectedInspectionRecord.result === "abnormal" ? "secondary" : "outline"} className="ml-2">
                {selectedInspectionRecord.result === "normal" ? "正常" : selectedInspectionRecord.result === "abnormal" ? "异常" : selectedInspectionRecord.result === "shutdown" ? "停机" : selectedInspectionRecord.result || "-"}
              </Badge>
            </p>
          </div>

          <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="点检单号">{selectedInspectionRecord.inspectionNo}</FieldRow>
                <FieldRow label="设备编号">{selectedInspectionRecord.equipmentCode || "-"}</FieldRow>
                <FieldRow label="设备名称">{selectedInspectionRecord.equipmentName || "-"}</FieldRow>
                <FieldRow label="点检类型">{inspectionTypeLabelMap[selectedInspectionRecord.inspectionType] || selectedInspectionRecord.inspectionType || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="点检日期">{formatDateValue(selectedInspectionRecord.inspectionDate)}</FieldRow>
                <FieldRow label="点检人">{selectedInspectionRecord.inspector || "-"}</FieldRow>
                <FieldRow label="结果">{selectedInspectionRecord.result === "normal" ? "正常" : selectedInspectionRecord.result === "abnormal" ? "异常" : selectedInspectionRecord.result === "shutdown" ? "停机" : selectedInspectionRecord.result || "-"}</FieldRow>
                <FieldRow label="状态">{selectedInspectionRecord.status === "completed" ? "已完成" : selectedInspectionRecord.status === "draft" ? "草稿" : selectedInspectionRecord.status || "-"}</FieldRow>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInspectionRecord.detailItems && selectedInspectionRecord.detailItems.length > 0 ? (
                    selectedInspectionRecord.detailItems.map((item, index) => (
                      <TableRow key={`${selectedInspectionRecord.id}-${index}`}>
                        <TableCell>{item.itemName || "-"}</TableCell>
                        <TableCell>{item.standard || "-"}</TableCell>
                        <TableCell>{item.method || "-"}</TableCell>
                        <TableCell>{item.result || "-"}</TableCell>
                        <TableCell>{item.abnormalDesc || "-"}</TableCell>
                        <TableCell>{item.actionRequired || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">暂无点检明细</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {selectedInspectionRecord.remark && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedInspectionRecord.remark}</p>
            </div>
          )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => void handlePrintEnglish("Equipment Inspection")}>
            <Printer className="h-4 w-4 mr-1" />
            打印英文版
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        </div>
      </div>
    ) : selectedMaintenanceRecord ? (
      <div className="space-y-4">
        <div ref={detailPrintRef} className="space-y-4" data-print-title="Equipment Maintenance">
          <div className="border-b pb-3">
            <h2 className="text-lg font-semibold">设备保养详情</h2>
            <p className="text-sm text-muted-foreground">
              {selectedMaintenanceRecord.maintenanceNo}
              <Badge variant={selectedMaintenanceRecord.result === "need_repair" ? "destructive" : selectedMaintenanceRecord.result === "pass" ? "default" : "outline"} className="ml-2">
                {selectedMaintenanceRecord.result === "pass" ? "通过" : selectedMaintenanceRecord.result === "need_repair" ? "需维修" : selectedMaintenanceRecord.result === "pending" ? "待确认" : selectedMaintenanceRecord.result || "-"}
              </Badge>
            </p>
          </div>

          <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="保养单号">{selectedMaintenanceRecord.maintenanceNo}</FieldRow>
                <FieldRow label="设备编号">{selectedMaintenanceRecord.equipmentCode || "-"}</FieldRow>
                <FieldRow label="设备名称">{selectedMaintenanceRecord.equipmentName || "-"}</FieldRow>
                <FieldRow label="保养类型">{maintenanceTypeLabelMap[selectedMaintenanceRecord.maintenanceType] || selectedMaintenanceRecord.maintenanceType || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="保养日期">{formatDateValue(selectedMaintenanceRecord.maintenanceDate)}</FieldRow>
                <FieldRow label="下次保养">{formatDateValue(selectedMaintenanceRecord.nextMaintenanceDate)}</FieldRow>
                <FieldRow label="执行人">{selectedMaintenanceRecord.executor || "-"}</FieldRow>
                <FieldRow label="状态">{selectedMaintenanceRecord.status === "completed" ? "已完成" : selectedMaintenanceRecord.status === "in_progress" ? "进行中" : selectedMaintenanceRecord.status === "planned" ? "计划中" : selectedMaintenanceRecord.status || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">保养明细</h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>保养项目</TableHead>
                    <TableHead>保养内容</TableHead>
                    <TableHead>标准要求</TableHead>
                    <TableHead>执行结果</TableHead>
                    <TableHead>更换部件</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMaintenanceRecord.detailItems && selectedMaintenanceRecord.detailItems.length > 0 ? (
                    selectedMaintenanceRecord.detailItems.map((item, index) => (
                      <TableRow key={`${selectedMaintenanceRecord.id}-${index}`}>
                        <TableCell>{item.itemName || "-"}</TableCell>
                        <TableCell>{item.content || "-"}</TableCell>
                        <TableCell>{item.standard || "-"}</TableCell>
                        <TableCell>{item.result || "-"}</TableCell>
                        <TableCell>{item.replacedPart || "-"}</TableCell>
                        <TableCell>{item.remark || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">暂无保养明细</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {selectedMaintenanceRecord.remark && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedMaintenanceRecord.remark}</p>
            </div>
          )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => void handlePrintEnglish("Equipment Maintenance")}>
            <Printer className="h-4 w-4 mr-1" />
            打印英文版
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        </div>
      </div>
    ) : selectedRecord ? (
      <div className="space-y-4">
        <div ref={detailPrintRef} className="space-y-4" data-print-title={selectedRecord.moduleType || "Record"}>
          <div className="border-b pb-3">
            <h2 className="text-lg font-semibold">{selectedRecord.moduleType || "环境记录"}详情</h2>
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
                <FieldRow label="记录类型">{selectedRecord.moduleType || "-"}</FieldRow>
                <FieldRow label="车间/区域">{selectedRecord.roomName}</FieldRow>
                <FieldRow label="记录时间">{formatDateValue(selectedRecord.recordDate)} {selectedRecord.recordTime}</FieldRow>
                <FieldRow label="记录人">{selectedRecord.recorder}</FieldRow>
              </div>
              <div>
                <FieldRow label="关联指令">{selectedRecord.productionOrderNo || "-"}</FieldRow>
                <FieldRow label="产品名称">{selectedRecord.productName || "-"}</FieldRow>
                <FieldRow label="生产批号">{selectedRecord.batchNo || "-"}</FieldRow>
                <FieldRow label="工序信息">{selectedRecord.processName || "-"}</FieldRow>
              </div>
            </div>
          </div>

          {(selectedRecord.temperature !== null || selectedRecord.humidity !== null) && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">环境参数</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="温度">{selectedRecord.temperature ?? "-"} ℃</FieldRow>
                  <FieldRow label="温度范围">{selectedRecord.tempMin ?? "-"} ~ {selectedRecord.tempMax ?? "-"} ℃</FieldRow>
                </div>
                <div>
                  <FieldRow label="湿度">{selectedRecord.humidity ?? "-"} %</FieldRow>
                  <FieldRow label="湿度范围">{selectedRecord.humidityMin ?? "-"} ~ {selectedRecord.humidityMax ?? "-"} %</FieldRow>
                </div>
              </div>
            </div>
          )}

          {selectedRecord.detailItems && selectedRecord.detailItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">记录明细</h3>
              <div className="space-y-2">
                {selectedRecord.detailItems.map((item, index) => (
                  <div key={`${selectedRecord.id}-${index}`} className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.itemName || "-"}</div>
                      <Badge variant="outline">{item.category || "-"}</Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">要求：{item.requirement || "-"}</div>
                    <div className="mt-1 text-muted-foreground">录入：{item.inputValue || "-"}</div>
                    <div className="mt-1 text-muted-foreground">结论：{item.conclusion || "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedRecord.equipmentItems && selectedRecord.equipmentItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">设备使用</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedRecord.equipmentItems.map((item, index) => (
                  <div key={`${selectedRecord.id}-equipment-${index}`} className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <div className="font-medium">{item.name || "-"}</div>
                    <div className="mt-1 text-muted-foreground">{item.used ? "已使用" : "未使用"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        </div>

          <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
            <div className="flex gap-2 flex-wrap"></div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" size="sm" onClick={() => void handlePrintEnglish(selectedRecord.moduleType || "Record")}>
                <Printer className="h-4 w-4 mr-1" />
                打印英文版
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
              {selectedRecord.sourceType !== "production" && (
                <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
              )}
            </div>
          </div>
      </div>
    ) : null}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
