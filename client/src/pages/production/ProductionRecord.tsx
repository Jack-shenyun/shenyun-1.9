import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDateValue, formatDisplayNumber, roundToDigits, toRoundedString } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import {
  isProductionIssueExcludedCategory,
  type ProductCategory,
} from "@shared/productCategories";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import DateTextInput from "@/components/DateTextInput";
import DraftDrawer, { type DraftItem } from "@/components/DraftDrawer";
import {
  ClipboardList, Plus, Search, Eye, Trash2, MoreHorizontal, CheckCircle, ImagePlus, Edit,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { processMatchesProduct } from "@/lib/productionProcessMatching";
import { loadProductionProcessTemplates, type ProductionProcess } from "@/pages/production/Process";
import { loadInitialMoldToolingRecords, type MoldToolingRecord } from "@/pages/production/MoldTooling";
import { defaultEquipmentRecords, type Equipment } from "@/pages/production/Equipment";

// ── 类型 ──────────────────────────────────────────────────
interface ProductionRecord {
  id: number;
  recordNo: string;
  recordType: string;
  productionOrderId?: number;
  productId?: number;
  productionOrderNo?: string;
  productName?: string;
  batchNo?: string;
  workstationName?: string;
  recordDate?: string;
  recordTime?: string;
  operatorId?: number;
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
  materialItems?: string;
  equipmentItems?: string;
  moldItems?: string;
  documentVersion?: string;
  remark?: string;
  createdAt: string;
  aggregatedActualQty?: string;
  aggregatedScrapQty?: string;
  recordCount?: number;
}

interface ProcessRequirementRow {
  id: string;
  category: string;
  itemName: string;
  requirement: string;
  unit: string;
  confirmerId?: number | null;
  confirmerName?: string;
  valueType?: "qualitative" | "quantitative";
  sampleQty?: string;
  sampleValues?: string[];
  inputValue?: string;
  conclusion?: string;
  images?: Array<{
    id: string;
    name: string;
    title: string;
    dataUrl: string;
  }>;
}

interface ProductionOperatorOption {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  status: string;
  signatureImageUrl?: string;
  signatureImageName?: string;
}

interface ModuleSelectionOption {
  id: string;
  name: string;
}

interface MaterialUsageItem {
  id: string;
  bomId?: number;
  inventoryId?: number;
  productId?: number;
  warehouseId?: number;
  warehouseName?: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  bomUnit?: string;
  batchNo: string;
  storageArea: string;
  availableQty: string;
  bomQty: string;
  plannedQty: string;
  issuedQty: string;
  usedQty: string;
  sourceType: "bom" | "manual";
}

interface StagingInventoryOption {
  id: number;
  warehouseId: number;
  warehouseName: string;
  productId?: number;
  materialCode: string;
  materialName: string;
  specification: string;
  batchNo: string;
  quantity: string;
  unit: string;
  location: string;
  status: string;
}

interface ProductionRecordDraft extends DraftItem {
  form: Record<string, any>;
}

const PROCESS_GROUPS = ["清场", "模具", "材料使用", "温湿度", "设备", "质控点", "首件"] as const;
const PRODUCTION_RECORD_DRAFT_KEY = "production-record-drafts-v1";

type ProcessGroupName = typeof PROCESS_GROUPS[number];

const recordTypeMap: Record<string, string> = {
  general: "通用记录",
  temperature_humidity: "温湿度记录",
  material_usage: "材料使用记录",
  clean_room: "清场记录",
  first_piece: "首件检验记录",
};

function getProductionRecordTypeLabel(record: {
  recordType?: string;
  processName?: string;
  workstationName?: string;
}) {
  const processLabel = String(record.processName || record.workstationName || "").trim();
  if (processLabel) {
    if (record.recordType === "first_piece") return `${processLabel}首件记录`;
    if (record.recordType === "clean_room") return `${processLabel}清场记录`;
    if (record.recordType === "temperature_humidity") return `${processLabel}温湿度记录`;
    return `${processLabel}记录`;
  }
  return recordTypeMap[String(record.recordType || "")] ?? String(record.recordType || "-");
}

const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive" }> = {
  in_progress: { label: "进行中", variant: "default" },
  completed:   { label: "已完成", variant: "secondary" },
  abnormal:    { label: "异常",   variant: "destructive" },
};

const processTypeLabelMap: Record<string, string> = {
  regular: "常规",
  critical: "关键",
  special: "特殊",
};

const productionOrderStatusLabelMap: Record<string, string> = {
  draft: "草稿",
  planned: "已计划",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

const detailConclusionLabelMap: Record<string, string> = {
  pending: "待判定",
  qualified: "合格",
  unqualified: "不合格",
};

const PLAN_REMARK_META_PREFIX = "__PLAN_META__:";
const BOM_META_PREFIX = "__BOM_META__:";

type ProductionRecordSignature = {
  id: string;
  action: "save";
  signerName: string;
  signedAt: string;
};

function parseJsonArray(raw: unknown) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSelectedProcessFromPlanRemark(raw: unknown) {
  const text = String(raw ?? "").trim();
  if (!text || !text.startsWith(PLAN_REMARK_META_PREFIX)) return null;
  try {
    const parsed = JSON.parse(text.slice(PLAN_REMARK_META_PREFIX.length));
    const selectedProcess = parsed?.selectedProcess;
    if (!selectedProcess) return null;
    return {
      processType: String(selectedProcess.processType || ""),
      processName: String(selectedProcess.processName || ""),
      workshop: String(selectedProcess.workshop || ""),
      team: String(selectedProcess.team || ""),
      operator: String(selectedProcess.operator || ""),
      version: String(selectedProcess.version || ""),
    };
  } catch {
    return null;
  }
}

function loadProductionRecordDrafts(): ProductionRecordDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRODUCTION_RECORD_DRAFT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistProductionRecordDrafts(drafts: ProductionRecordDraft[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRODUCTION_RECORD_DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    // ignore local draft persistence errors
  }
}

function mapProductionOrderStatusToRecordStatus(status?: string) {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "abnormal";
  return "in_progress";
}

function parseBomRemarkMeta(raw?: string | null) {
  const remarkText = String(raw || "");
  if (!remarkText.startsWith(BOM_META_PREFIX)) {
    return { remark: remarkText, bindingProcess: "", signatures: [] as ProductionRecordSignature[] };
  }
  try {
    const parsed = JSON.parse(remarkText.slice(BOM_META_PREFIX.length));
    return {
      remark: String(parsed?.remark || ""),
      bindingProcess: String(parsed?.bindingProcess || ""),
      signatures: Array.isArray(parsed?.signatures)
        ? parsed.signatures.map((item: any) => ({
            id: String(item?.id || `${Date.now()}`),
            action: "save" as const,
            signerName: String(item?.signerName || ""),
            signedAt: String(item?.signedAt || ""),
          }))
        : [],
    };
  } catch {
    return { remark: remarkText, bindingProcess: "", signatures: [] as ProductionRecordSignature[] };
  }
}

function buildProductionRecordRemarkMeta(params: {
  remark: string;
  bindingProcess?: string;
  signatures?: ProductionRecordSignature[];
}) {
  return `${BOM_META_PREFIX}${JSON.stringify({
    remark: params.remark || "",
    bindingProcess: params.bindingProcess || "",
    signatures: params.signatures || [],
  })}`;
}

function createProductionRecordSignature(signerName: string): ProductionRecordSignature {
  return {
    id: `save-${Date.now()}`,
    action: "save",
    signerName,
    signedAt: new Date().toISOString(),
  };
}

function formatWholeNumber(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const num = Number(text);
  if (Number.isFinite(num)) return formatDisplayNumber(num);
  return text.includes(".") ? text.split(".")[0] : text;
}

function formatDecimalInput(value: unknown, digits = 4) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const num = Number(text);
  if (!Number.isFinite(num)) return text;
  return toRoundedString(num, digits);
}

function parseNumberValue(value: unknown) {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
}

function normalizeUnitValue(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function isKgUnit(value: unknown) {
  const normalized = normalizeUnitValue(value);
  return normalized === "kg" || normalized === "kgs" || normalized === "千克" || normalized === "公斤";
}

function convertQuantityUnit(value: unknown, fromUnit: unknown, toUnit: unknown) {
  const quantity = parseNumberValue(value);
  const normalizedFrom = normalizeUnitValue(fromUnit);
  const normalizedTo = normalizeUnitValue(toUnit);
  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) return quantity;
  const unitFactorMap: Record<string, number> = {
    kg: 1000,
    kgs: 1000,
    千克: 1000,
    公斤: 1000,
    g: 1,
    克: 1,
    gram: 1,
    grams: 1,
    mg: 0.001,
    毫克: 0.001,
  };
  const fromFactor = unitFactorMap[normalizedFrom];
  const toFactor = unitFactorMap[normalizedTo];
  if (!fromFactor || !toFactor) return quantity;
  return roundToDigits((quantity * fromFactor) / toFactor, 4);
}

function formatQuantityByUnit(value: unknown, unit: unknown) {
  if (value == null || value === "") return "";
  const normalizedUnit = normalizeUnitValue(unit);
  const digits = normalizedUnit === "kg" || normalizedUnit === "kgs" || normalizedUnit === "千克" || normalizedUnit === "公斤" ? 4 : 0;
  return formatDecimalInput(value, digits);
}

function normalizeMaterialItemToMixingKg(item: MaterialUsageItem): MaterialUsageItem {
  const displayUnit = String(item.unit || "");
  const bomUnit = String(item.bomUnit || item.unit || "");
  const displayAlreadyKg = isKgUnit(displayUnit);
  const sourceDisplayUnit = displayUnit || bomUnit;
  const sourceBomUnit = bomUnit || sourceDisplayUnit;

  const convertDisplayValue = (value: unknown, fromUnit: unknown) => {
    if (value == null || value === "") return "";
    return formatDecimalInput(convertQuantityUnit(value, fromUnit, "kg"));
  };

  return {
    ...item,
    unit: "kg",
    bomUnit: bomUnit || "kg",
    availableQty: displayAlreadyKg ? formatDecimalInput(item.availableQty) : convertDisplayValue(item.availableQty, sourceDisplayUnit),
    bomQty: displayAlreadyKg ? formatDecimalInput(item.bomQty) : convertDisplayValue(item.bomQty, sourceBomUnit),
    plannedQty: displayAlreadyKg ? formatDecimalInput(item.plannedQty) : convertDisplayValue(item.plannedQty, sourceBomUnit),
    issuedQty: displayAlreadyKg ? formatDecimalInput(item.issuedQty) : convertDisplayValue(item.issuedQty, sourceBomUnit),
    usedQty: displayAlreadyKg ? formatDecimalInput(item.usedQty) : convertDisplayValue(item.usedQty, sourceDisplayUnit),
  };
}

function isMixingProcess(processName?: string) {
  const text = String(processName || "").trim();
  return text.includes("混炼") || text.includes("混练");
}

function normalizeProcessGroupName(value: string): ProcessGroupName {
  const text = String(value || "");
  if (text.includes("清场")) return "清场";
  if (text.includes("模具")) return "模具";
  if (text.includes("材料")) return "材料使用";
  if (text.includes("温湿度")) return "温湿度";
  if (text.includes("设备")) return "设备";
  if (text.includes("质控")) return "质控点";
  if (text.includes("首件") || text.includes("检验")) return "首件";
  return "质控点";
}

function inferRequirementValueType(
  itemName: string,
  requirement: string,
  unit = ""
): "qualitative" | "quantitative" {
  const text = `${String(itemName || "")} ${String(requirement || "")}`;
  if (String(unit || "").trim()) return "quantitative";
  if (["外观", "确认", "标识", "位置", "语言", "内容核对", "数量无误", "无黑点"].some((keyword) => text.includes(keyword))) {
    return "qualitative";
  }
  if (["内径", "外径", "长度", "硬度", "温度", "压力", "时间", "次数", "速度", "孔距", "孔直径", "强度", "剥离"].some((keyword) => text.includes(keyword))) {
    return "quantitative";
  }
  if (/\d/.test(text)) return "quantitative";
  return "qualitative";
}

function ensureProcessRequirementRow(row: ProcessRequirementRow): ProcessRequirementRow {
  const valueType = row.valueType || inferRequirementValueType(row.itemName, row.requirement, row.unit);
  const defaultSampleQty =
    normalizeProcessGroupName(row.category || "") === "首件" && valueType === "quantitative"
      ? 3
      : 1;
  const sampleQty = Math.max(1, Number(row.sampleQty || String(defaultSampleQty)));
  const sampleValues = Array.isArray(row.sampleValues) ? row.sampleValues : [];
  return {
    ...row,
    confirmerId: row.confirmerId ?? null,
    confirmerName: row.confirmerName || "",
    valueType,
    sampleQty: String(sampleQty),
    sampleValues: Array.from({ length: sampleQty }, (_, index) => sampleValues[index] || (sampleQty === 1 && index === 0 ? String(row.inputValue || "") : "")),
    inputValue: row.inputValue || sampleValues.filter(Boolean).join(" / "),
    conclusion: row.conclusion || "pending",
    images: Array.isArray(row.images) ? row.images : [],
  };
}

function buildProcessRequirementRows(process: ProductionProcess): ProcessRequirementRow[] {
  const rows: ProcessRequirementRow[] = [];
  const docLabel = [process.controlledDocNo, process.version].filter(Boolean).join(" / ");
  const inspectionCategory: ProcessGroupName = process.modules.firstArticle ? "首件" : "质控点";

  if (process.modules.clearance) {
    rows.push(
      {
        id: `clearance-start-${process.id}`,
        category: "清场",
        itemName: "开工前清场确认",
        requirement: "现场无上批残留物，状态标识正确",
        unit: "",
      },
      {
        id: `clearance-doc-${process.id}`,
        category: "清场",
        itemName: "文件与状态标识确认",
        requirement: docLabel || "按现行作业文件执行",
        unit: "",
      }
    );
  }

  if (process.modules.mold) {
    rows.push({
      id: `mold-${process.id}`,
      category: "模具",
      itemName: "模具编号/状态确认",
      requirement: "模具状态正常、编号与工单一致",
      unit: "",
    });
  }

  if (process.modules.materialUsage) {
    rows.push({
      id: `material-${process.id}`,
      category: "材料使用",
      itemName: "投料/领料确认",
      requirement: "物料名称、批号、数量与生产指令一致",
      unit: "",
    });
  }

  if (process.modules.tempHumidity) {
    rows.push(
      {
        id: `temp-${process.id}`,
        category: "温湿度",
        itemName: "环境温度",
        requirement: "按工艺文件要求",
        unit: "℃",
      },
      {
        id: `humidity-${process.id}`,
        category: "温湿度",
        itemName: "环境湿度",
        requirement: "按工艺文件要求",
        unit: "%RH",
      }
    );
  }

  if (process.modules.equipment) {
    rows.push({
      id: `equipment-${process.id}`,
      category: "设备",
      itemName: "设备参数与点检",
      requirement: "设备状态正常、参数符合开机条件",
      unit: "",
    });
  }

  if (process.modules.qcPoint || (process.qcPoints || []).length > 0) {
    if ((process.qcPoints || []).length > 0) {
      rows.push(
        ...(process.qcPoints || []).map((item) => ({
          id: `qc-${item.id}`,
          category: "质控点",
          itemName: item.itemName || "",
          requirement: item.requirement || "",
          unit: item.unit || "",
          valueType: "quantitative" as const,
        }))
      );
    } else {
      rows.push({
        id: `qc-default-${process.id}`,
        category: "质控点",
        itemName: "关键参数确认",
        requirement: "按工艺文件关键质控点执行",
        unit: "",
      });
    }
  }

  if (process.modules.firstArticle) {
    rows.push({
      id: `first-${process.id}`,
      category: "首件",
      itemName: "首件确认",
      requirement: "首件尺寸/外观/功能符合标准",
      unit: "",
    });
  }

  rows.push(
    ...(process.inspectionItems || []).map((item) => ({
      id: `inspection-${item.id}`,
      category: inspectionCategory,
      itemName: item.itemName || "",
      requirement: item.requirement || "",
      unit: item.unit || "",
      valueType: item.valueType || (item.unit ? "quantitative" : "qualitative"),
    }))
  );

  return rows.map(ensureProcessRequirementRow);
}

function mapCategoryToRecordType(category: string) {
  if (category === "温湿度") return "temperature_humidity";
  if (category === "材料使用") return "material_usage";
  if (category === "清场") return "clean_room";
  if (category === "首件") return "first_piece";
  return "general";
}

function buildCategoryDetailRows(
  process: ProductionProcess | null,
  category: string
): ProcessRequirementRow[] {
  if (!process || !category) return [];
  if (category === "清场") {
    return (process.moduleConfigs.clearance.items || []).map((item) =>
      ensureProcessRequirementRow({
        id: item.id,
        category: "清场",
        itemName: item.itemName || "",
        requirement: item.requirement || "",
        unit: "",
        confirmerId: item.confirmerId ?? null,
        confirmerName: item.confirmerName || "",
        sampleQty: "",
        inputValue: "",
        conclusion: "pending",
      })
    );
  }
  if (category === "质控点" || category === "首件") {
    return buildProcessRequirementRows(process).filter(
      (item) => normalizeProcessGroupName(item.category) === normalizeProcessGroupName(category)
    );
  }
  return [];
}

function getProcessModuleCategories(process: ProductionProcess): ProcessGroupName[] {
  return PROCESS_GROUPS.filter((group) => {
    if (group === "清场") return !!process.modules.clearance;
    if (group === "模具") return !!process.modules.mold;
    if (group === "材料使用") return !!process.modules.materialUsage;
    if (group === "温湿度") return !!process.modules.tempHumidity;
    if (group === "设备") return !!process.modules.equipment;
    if (group === "质控点") return !!process.modules.qcPoint;
    if (group === "首件") return !!process.modules.firstArticle;
    return false;
  });
}

function parseDetailItems(raw: unknown): ProcessRequirementRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, index: number) => ({
      id: String(item?.id || `detail-${index}`),
      category: normalizeProcessGroupName(String(item?.category || "")),
      itemName: String(item?.itemName || ""),
      requirement: String(item?.requirement || ""),
      unit: String(item?.unit || ""),
      confirmerId: item?.confirmerId == null ? null : Number(item.confirmerId),
      confirmerName: String(item?.confirmerName || ""),
      valueType:
        String(item?.valueType || "") === "quantitative"
          ? "quantitative"
          : String(item?.valueType || "") === "qualitative"
            ? "qualitative"
            : inferRequirementValueType(
                String(item?.itemName || ""),
                String(item?.requirement || ""),
                String(item?.unit || "")
              ),
      sampleQty: String(item?.sampleQty || "1"),
      sampleValues: Array.isArray(item?.sampleValues) ? item.sampleValues.map((value: any) => String(value || "")) : undefined,
      inputValue: String(item?.inputValue || ""),
      conclusion: String(item?.conclusion || "pending"),
      images: Array.isArray(item?.images)
        ? item.images.map((image: any, imageIndex: number) => ({
            id: String(image?.id || `img-${index}-${imageIndex}`),
            name: String(image?.name || ""),
            title: String(image?.title || ""),
            dataUrl: String(image?.dataUrl || ""),
          }))
        : [],
    })).map(ensureProcessRequirementRow);
  } catch {
    return [];
  }
}

function buildRecordNo(recordDate: string, records: ProductionRecord[]) {
  const dateText = String(recordDate || "").replaceAll("-", "");
  const prefix = `P${dateText}-`;
  const currentMax = records.reduce((maxValue, record) => {
    const recordNo = String(record.recordNo || "");
    if (!recordNo.startsWith(prefix)) return maxValue;
    const seq = Number(recordNo.slice(prefix.length));
    return Number.isFinite(seq) ? Math.max(maxValue, seq) : maxValue;
  }, 0);
  return `${prefix}${String(currentMax + 1).padStart(2, "0")}`;
}

function parseMaterialItems(raw: unknown): MaterialUsageItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, index: number) => ({
      id: String(item?.id || `material-${index}`),
      bomId: item?.bomId == null ? undefined : Number(item.bomId),
      inventoryId: item?.inventoryId == null ? undefined : Number(item.inventoryId),
      productId: item?.productId == null ? undefined : Number(item.productId),
      warehouseId: item?.warehouseId == null ? undefined : Number(item.warehouseId),
      warehouseName: String(item?.warehouseName || ""),
      materialCode: String(item?.materialCode || ""),
      materialName: String(item?.materialName || ""),
      materialSpec: String(item?.materialSpec || item?.specification || ""),
      unit: String(item?.unit || ""),
      bomUnit: String(item?.bomUnit || item?.unit || ""),
      batchNo: String(item?.batchNo || ""),
      storageArea: String(item?.storageArea || item?.location || ""),
      availableQty: String(item?.availableQty || item?.quantity || ""),
      bomQty: String(item?.bomQty || ""),
      plannedQty: String(item?.plannedQty || ""),
      issuedQty: String(item?.issuedQty || ""),
      usedQty: String(item?.usedQty || ""),
      sourceType: item?.sourceType === "manual" ? "manual" : "bom",
    }));
  } catch {
    return [];
  }
}

function createEmptyMaterialItem(): MaterialUsageItem {
  return {
    id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    materialCode: "",
    materialName: "",
    materialSpec: "",
    unit: "",
    bomUnit: "",
    batchNo: "",
    storageArea: "",
    availableQty: "",
    bomQty: "",
    plannedQty: "",
    issuedQty: "",
    usedQty: "",
    sourceType: "manual",
  };
}

function buildMaterialItemsFromBom(
  bomItems: any[],
  processName: string,
  plannedQty: string,
  materialCategoryMap: Map<string, ProductCategory | string>
): MaterialUsageItem[] {
  if (!Array.isArray(bomItems) || bomItems.length === 0) return [];
  const normalizedProcess = String(processName || "").trim();
  const normalizedRoots = bomItems.filter((item: any) => Number(item.level) === 2);

  const rows = normalizedRoots.flatMap((root: any) => {
    const rootMeta = parseBomRemarkMeta(root?.remark);
    const children = bomItems.filter((item: any) => Number(item.parentId) === Number(root.id) && Number(item.level) === 3);
    const matchedChildren = children.filter((child: any) => {
      const childMeta = parseBomRemarkMeta(child?.remark);
      const childBinding = String(childMeta.bindingProcess || "").trim();
      if (childBinding) return childBinding === normalizedProcess;
      return String(rootMeta.bindingProcess || "").trim() === normalizedProcess;
    });
    const sourceItems =
      matchedChildren.length > 0
        ? matchedChildren
        : children.length === 0 && String(rootMeta.bindingProcess || "").trim() === normalizedProcess
          ? [root]
          : [];
    if (sourceItems.length === 0) return [];
    return sourceItems.map((item: any) => {
      const baseProductQty = Number(item?.baseProductQty || root?.baseProductQty || 1) || 1;
      const bomQty = Number(item?.quantity || 0) || 0;
      const planned = Number(plannedQty || 0) || 0;
      const suggestedQty = planned > 0 ? (bomQty * planned) / baseProductQty : bomQty;
      return {
        id: `material-bom-${item.id}`,
        bomId: Number(item.id),
        productId: item?.productId == null ? undefined : Number(item.productId),
        materialCode: String(item?.materialCode || ""),
        materialName: String(item?.materialName || ""),
        materialSpec: String(item?.specification || ""),
        unit: String(item?.unit || ""),
        bomUnit: String(item?.unit || ""),
        batchNo: "",
        storageArea: "",
        availableQty: "",
        bomQty: formatDecimalInput(bomQty),
        plannedQty: formatDecimalInput(suggestedQty),
        issuedQty: formatDecimalInput(suggestedQty),
        usedQty: formatDecimalInput(suggestedQty),
        sourceType: "bom" as const,
      } satisfies MaterialUsageItem;
    });
  });

  const deduped = new Map<string, MaterialUsageItem>();
  rows.forEach((row) => {
    if (
      isProductionIssueExcludedCategory(
        materialCategoryMap.get(String(row.materialCode || "").trim())
      )
    ) {
      return;
    }
    const key = `${row.materialCode}|${row.materialName}|${row.materialSpec}|${row.unit}`;
    if (!deduped.has(key)) {
      deduped.set(key, row);
      return;
    }
    const existing = deduped.get(key)!;
    existing.bomQty = formatDecimalInput((Number(existing.bomQty || 0) || 0) + (Number(row.bomQty || 0) || 0));
    existing.plannedQty = formatDecimalInput((Number(existing.plannedQty || 0) || 0) + (Number(row.plannedQty || 0) || 0));
    existing.issuedQty = formatDecimalInput((Number(existing.issuedQty || 0) || 0) + (Number(row.issuedQty || 0) || 0));
    existing.usedQty = formatDecimalInput((Number(existing.usedQty || 0) || 0) + (Number(row.usedQty || 0) || 0));
  });
  return Array.from(deduped.values());
}

function getProcessRecordGroupKey(batchNo?: string, processName?: string) {
  return `${String(batchNo || "").trim()}__${String(processName || "").trim()}`;
}

function buildRecordTimestamp(recordDate?: unknown, recordTime?: unknown) {
  return new Date(
    `${String(recordDate || "1970-01-01").slice(0, 10)}T${String(recordTime || "00:00") || "00:00"}`
  ).getTime();
}

function deriveAutoProcessStatus(totalActualQty: unknown, plannedQty: unknown, hasAbnormal = false): ProductionRecord["status"] {
  const actual = parseNumberValue(totalActualQty);
  const planned = parseNumberValue(plannedQty);
  if (planned > 0 && actual >= planned) return "completed";
  if (hasAbnormal) return "abnormal";
  return "in_progress";
}

function buildProcessAggregateMap(records: ProductionRecord[]) {
  const map = new Map<string, {
    key: string;
    batchNo: string;
    processName: string;
    plannedQty: number;
    totalActualQty: number;
    totalScrapQty: number;
    recordCount: number;
    hasAbnormal: boolean;
    latestRecordAt: number;
    status: ProductionRecord["status"];
  }>();

  [...records]
    .sort((a, b) => buildRecordTimestamp(a.recordDate, a.recordTime) - buildRecordTimestamp(b.recordDate, b.recordTime))
    .forEach((record) => {
      const batchNo = String(record.batchNo || "").trim();
      const processName = String(record.processName || record.workstationName || "").trim();
      if (!batchNo || !processName) return;

      const key = getProcessRecordGroupKey(batchNo, processName);
      const actualQty = parseNumberValue(record.actualQty);
      const scrapQty = parseNumberValue(record.scrapQty);
      const plannedQty = parseNumberValue(record.plannedQty);
      const latestRecordAt = buildRecordTimestamp(record.recordDate, record.recordTime);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          batchNo,
          processName,
          plannedQty,
          totalActualQty: actualQty,
          totalScrapQty: scrapQty,
          recordCount: 1,
          hasAbnormal: String(record.status || "") === "abnormal",
          latestRecordAt,
          status: "in_progress",
        });
        return;
      }

      existing.plannedQty = Math.max(existing.plannedQty, plannedQty);
      existing.totalActualQty = roundToDigits(existing.totalActualQty + actualQty, 4);
      existing.totalScrapQty = roundToDigits(existing.totalScrapQty + scrapQty, 4);
      existing.recordCount += 1;
      existing.hasAbnormal = existing.hasAbnormal || String(record.status || "") === "abnormal";
      existing.latestRecordAt = Math.max(existing.latestRecordAt, latestRecordAt);
    });

  map.forEach((item) => {
    item.status = deriveAutoProcessStatus(item.totalActualQty, item.plannedQty, item.hasAbnormal);
  });

  return map;
}

function deriveMixingActualQtyFromMaterialItems(materialItems: MaterialUsageItem[], plannedQty: unknown) {
  const plannedOutputQty = parseNumberValue(plannedQty);
  if (plannedOutputQty <= 0 || materialItems.length === 0) return 0;

  const outputCandidates = materialItems
    .filter((item) => parseNumberValue(item.usedQty) > 0 && parseNumberValue(item.plannedQty) > 0)
    .map((item) => {
      const plannedConsumption = parseNumberValue(item.plannedQty);
      if (plannedConsumption <= 0) return 0;
      const usedQty = parseNumberValue(item.usedQty);
      return (usedQty / plannedConsumption) * plannedOutputQty;
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  if (outputCandidates.length === 0) return 0;
  return roundToDigits(Math.min(...outputCandidates), 4);
}

function getDerivedActualQtyForRecord(params: {
  processName?: string;
  recordType?: string;
  materialItems: MaterialUsageItem[];
  plannedQty?: string;
  actualQty?: string;
  scrapQty?: string;
}) {
  if (isMixingProcess(params.processName) && params.recordType === "material_usage") {
    const totalOutputQty = deriveMixingActualQtyFromMaterialItems(params.materialItems, params.plannedQty);
    const scrapQty = parseNumberValue(params.scrapQty);
    return Math.max(totalOutputQty - scrapQty, 0);
  }
  return parseNumberValue(params.actualQty);
}

async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  const maxWidth = 1600;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
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
    <div className="flex py-1.5 border-b border-dashed border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{renderValue(children)}</span>
    </div>
  );
}

function RecordSignaturePreview({
  title,
  signerName,
  signatureImageUrl,
}: {
  title: string;
  signerName?: string;
  signatureImageUrl?: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="rounded-lg border bg-muted/10 p-3">
        <div className="mb-2 text-sm font-medium">{signerName || "-"}</div>
        <div className="flex min-h-[108px] items-center justify-center rounded-md border bg-white p-2">
          {signatureImageUrl ? (
            <img
              src={signatureImageUrl}
              alt={`${signerName || title}签名`}
              className="max-h-[92px] max-w-full object-contain"
            />
          ) : (
            <span className="text-sm text-muted-foreground">暂未设置签名</span>
          )}
        </div>
      </div>
    </div>
  );
}

function LegacySectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="inline-flex h-8 items-center gap-3 bg-slate-700 px-4 text-base font-semibold text-white">
        <span>{title}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-6 w-1.5 skew-x-[20deg] bg-white/85" />
          <span className="h-6 w-1.5 skew-x-[20deg] bg-white/75" />
          <span className="h-6 w-1.5 skew-x-[20deg] bg-white/65" />
        </span>
      </div>
      <div className="h-[3px] w-full bg-slate-300" />
    </div>
  );
}

function QueryDisplayField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-slate-800">{label}</Label>
      <div className={`flex h-10 items-center rounded-sm bg-slate-100 px-3 text-sm text-slate-500 ${mono ? "font-mono" : ""}`}>
        {value || "暂无内容"}
      </div>
    </div>
  );
}

function getCurrentDateText() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTimeText() {
  return new Date().toTimeString().slice(0, 5);
}

export default function ProductionRecordPage() {
  const PAGE_SIZE = 10;
  const trpcClient = trpc as any;
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [productionOrderPickerOpen, setProductionOrderPickerOpen] = useState(false);
  const [operatorPickerOpen, setOperatorPickerOpen] = useState(false);
  const [moldPickerOpen, setMoldPickerOpen] = useState(false);
  const [equipmentPickerOpen, setEquipmentPickerOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [activeMaterialRowId, setActiveMaterialRowId] = useState("");
  const [selected, setSelected] = useState<ProductionRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null);
  const [pendingEditRecord, setPendingEditRecord] = useState<ProductionRecord | null>(null);
  const [drafts, setDrafts] = useState<ProductionRecordDraft[]>(() => loadProductionRecordDrafts());
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const autoCreateHandledRef = useRef(false);
  const { canDelete } = usePermission();
  const [currentPage, setCurrentPage] = useState(1);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const verifyPasswordMutation = trpc.auth.verifyPassword.useMutation();

  const currentUserName = String((user as any)?.name || "");
  const currentUserId = Number((user as any)?.id || 0);
  const currentUserDepartment = String((user as any)?.department || "");
  const today = getCurrentDateText();
  const currentTime = getCurrentTimeText();
  const [form, setForm] = useState({
    productionOrderId: "",
    productId: "",
    processId: "",
    processCategory: "",
    recordType: "general",
    productionOrderNo: "", productName: "", batchNo: "", unit: "",
    workstationName: "", recordDate: today, recordTime: currentTime,
    operatorId: currentUserId ? String(currentUserId) : "",
    plannedQty: "", actualQty: "", scrapQty: "0",
    specification: "", processType: "", processName: "",
    workshopName: "", productionTeam: "", operator: currentUserName, inspector: "",
    status: "in_progress",
    temperature: "", humidity: "", temperatureLimit: "", humidityLimit: "",
    cleanlinessLevel: "", pressureDiff: "",
    materialCode: "", materialName: "", materialSpec: "",
    usedQty: "", usedUnit: "", materialBatchNo: "",
    storageArea: "", issuedQty: "", qualifiedQty: "",
    cleanedBy: "", checkedBy: "", cleanResult: "" as "" | "pass" | "fail",
    firstPieceResult: "" as "" | "qualified" | "unqualified",
    firstPieceInspector: "", firstPieceBasis: "", firstPieceBasisVersion: "",
    moldSelections: [] as string[],
    equipmentSelections: [] as string[],
    materialItems: [] as MaterialUsageItem[],
    detailItems: [] as ProcessRequirementRow[],
    documentVersion: "", remark: "",
  });

  const utils = trpc.useUtils();
  const { data: productionOrdersData = [] } = trpc.productionOrders.list.useQuery({});
  const { data: productsData = [] } = trpc.products.list.useQuery({});
  const { data: productionPlansData = [] } = trpc.productionPlans.list.useQuery({});
  const { data: personnelData = [] } = trpcClient.personnel.list.useQuery();
  const { data: equipmentData = [] } = trpc.equipment.list.useQuery();
  const { data: warehousesData = [] } = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: inventoryData = [] } = trpc.inventory.list.useQuery({ limit: 1000, status: "qualified" });
  const { data: bomData = [] } = trpc.bom.getByProductId.useQuery(
    { productId: Number(form.productId || 0) },
    { enabled: Number(form.productId || 0) > 0 }
  );
  const { data: allRecordsData = [], isLoading } = trpc.productionRecords.list.useQuery({ limit: 1000 });
  const createMutation = trpc.productionRecords.create.useMutation({
    onSuccess: () => {
      if (currentDraftId) removeDraftById(currentDraftId);
      toast.success("生产记录已创建");
      setFormOpen(false);
      resetForm();
      utils.productionRecords.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.productionRecords.update.useMutation({
    onSuccess: () => {
      toast.success("修改成功");
      setFormOpen(false);
      resetForm();
      utils.productionRecords.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.productionRecords.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.productionRecords.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const allRecords: ProductionRecord[] = (allRecordsData as any) ?? [];
  const processAggregateMap = useMemo(
    () => buildProcessAggregateMap(allRecords),
    [allRecords]
  );
  const records = useMemo<ProductionRecord[]>(
    () =>
      allRecords.map((record) => {
        const processName = String(record.processName || record.workstationName || "").trim();
        const aggregate = processAggregateMap.get(getProcessRecordGroupKey(record.batchNo, processName));
        if (!aggregate) return record;
        return {
          ...record,
          status: aggregate.status,
          aggregatedActualQty: formatDecimalInput(aggregate.totalActualQty),
          aggregatedScrapQty: formatDecimalInput(aggregate.totalScrapQty),
          recordCount: aggregate.recordCount,
        };
      }),
    [allRecords, processAggregateMap]
  );
  const processTemplates = useMemo(
    () => loadProductionProcessTemplates().filter((process) => process.status === "active"),
    []
  );
  const productionOrderOptions = useMemo(
    () =>
      (productionOrdersData as any[]).map((order: any) => {
        const product = (productsData as any[]).find((item: any) => Number(item.id) === Number(order.productId));
        const linkedPlan = (productionPlansData as any[]).find((plan: any) => Number(plan.id) === Number(order.planId));
        const selectedProcess = parseSelectedProcessFromPlanRemark(linkedPlan?.remark);
        return {
          ...order,
          productName: product?.name || order.productName || "",
          productSpec: product?.specification || "",
          productDescription: product?.description || order.remark || "",
          unit: order.unit || product?.unit || "",
          selectedProcess,
        };
      }),
    [productionOrdersData, productsData, productionPlansData]
  );
  const selectedProductionOrder = useMemo(
    () =>
      productionOrderOptions.find(
        (order: any) => String(order.id) === String(form.productionOrderId || "")
      ) || null,
    [productionOrderOptions, form.productionOrderId]
  );
  const matchedProcessOptions = useMemo(
    () =>
      processTemplates.filter(
        (process) => processMatchesProduct(process, form.productName)
      ),
    [form.productName, processTemplates]
  );
  const selectedProcessTemplate = useMemo(
    () => processTemplates.find((process) => String(process.id) === form.processId) || null,
    [form.processId, processTemplates]
  );
  const selectedProcessRequirementRows = useMemo(
    () => (selectedProcessTemplate ? buildProcessRequirementRows(selectedProcessTemplate) : []),
    [selectedProcessTemplate]
  );
  const operatorRows = useMemo<ProductionOperatorOption[]>(
    () =>
      ((personnelData as any[]) || [])
        .filter((person: any) => ["active", "probation"].includes(String(person?.status || "")))
        .map((person: any) => ({
          id: Number(person?.id || 0),
          employeeNo: String(person?.employeeNo || ""),
          name: String(person?.name || ""),
          department: String(person?.department || ""),
          position: String(person?.position || ""),
          status: String(person?.status || ""),
          signatureImageUrl: String(person?.signatureImageUrl || ""),
          signatureImageName: String(person?.signatureImageName || ""),
        }))
        .filter((person) => person.id > 0 && person.name)
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    [personnelData]
  );
  const personnelSignatureById = useMemo(
    () =>
      new Map(
        operatorRows
          .filter((person) => person.signatureImageUrl)
          .map((person) => [String(person.id), person] as const)
      ),
    [operatorRows]
  );
  const personnelSignatureByName = useMemo(
    () =>
      new Map(
        operatorRows
          .filter((person) => person.signatureImageUrl)
          .map((person) => [String(person.name || "").trim(), person] as const)
      ),
    [operatorRows]
  );
  const operatorDepartmentKeyword = String(form.workshopName || currentUserDepartment || "").trim();
  const filteredOperatorRows = useMemo(() => {
    if (!operatorDepartmentKeyword) return operatorRows;
    const keyword = operatorDepartmentKeyword.toLowerCase();
    const matched = operatorRows.filter((person) => {
      const department = String(person.department || "").toLowerCase();
      return department.includes(keyword) || keyword.includes(department);
    });
    if (matched.length > 0) return matched;
    const productionMatched = operatorRows.filter((person) =>
      String(person.department || "").includes("生产")
    );
    return productionMatched.length > 0 ? productionMatched : operatorRows;
  }, [operatorDepartmentKeyword, operatorRows]);
  const selectedOperator = useMemo(
    () =>
      filteredOperatorRows.find((person) => String(person.id) === String(form.operatorId || "")) ||
      operatorRows.find((person) => String(person.id) === String(form.operatorId || "")) ||
      operatorRows.find((person) => person.name === form.operator) ||
      null,
    [filteredOperatorRows, operatorRows, form.operatorId, form.operator]
  );
  const selectedDetailOperatorSignature = useMemo(() => {
    if (!selected) return null;
    return (
      personnelSignatureById.get(String(selected.operatorId || "")) ||
      personnelSignatureByName.get(String(selected.operator || "").trim()) ||
      null
    );
  }, [personnelSignatureById, personnelSignatureByName, selected]);
  const selectedDetailInspectorSignature = useMemo(() => {
    if (!selected) return null;
    return personnelSignatureByName.get(String(selected.inspector || "").trim()) || null;
  }, [personnelSignatureByName, selected]);
  const availableProcessCategories = useMemo(
    () => (selectedProcessTemplate ? getProcessModuleCategories(selectedProcessTemplate) : []),
    [selectedProcessTemplate]
  );
  const currentClearanceConfig = selectedProcessTemplate?.moduleConfigs.clearance;
  const currentMoldConfig = selectedProcessTemplate?.moduleConfigs.mold;
  const currentTempHumidityConfig = selectedProcessTemplate?.moduleConfigs.tempHumidity;
  const currentEquipmentNames = selectedProcessTemplate?.moduleConfigs.equipment.equipmentNames || [];
  const moldRows = useMemo<MoldToolingRecord[]>(
    () => loadInitialMoldToolingRecords().filter((item) => item.status !== "scrapped"),
    []
  );
  const moldOptionRows = useMemo<ModuleSelectionOption[]>(
    () => moldRows.map((row) => ({ id: String(row.id), name: row.name })),
    [moldRows]
  );
  const equipmentRows = useMemo<Equipment[]>(
    () =>
      (((equipmentData as any[]) || []).length > 0
        ? (equipmentData as Equipment[])
        : defaultEquipmentRecords
      ).filter((item) => item.status !== "scrapped"),
    [equipmentData]
  );
  const equipmentOptionRows = useMemo<ModuleSelectionOption[]>(
    () => equipmentRows.map((row) => ({ id: String(row.id), name: row.name })),
    [equipmentRows]
  );
  const stagingWarehouses = useMemo(
    () =>
      ((warehousesData as any[]) || []).filter((warehouse: any) => {
        const text = `${String(warehouse?.name || "")} ${String(warehouse?.code || "")}`.toLowerCase();
        return text.includes("暂存") || text.includes("staging");
      }),
    [warehousesData]
  );
  const stagingWarehouseIdSet = useMemo(
    () => new Set(stagingWarehouses.map((warehouse: any) => Number(warehouse.id))),
    [stagingWarehouses]
  );
  const activeMaterialRow = useMemo(
    () => form.materialItems.find((item) => item.id === activeMaterialRowId) || null,
    [activeMaterialRowId, form.materialItems]
  );
  const stagingInventoryOptions = useMemo<StagingInventoryOption[]>(
    () =>
      ((inventoryData as any[]) || [])
        .filter((row: any) => stagingWarehouseIdSet.has(Number(row.warehouseId)))
        .map((row: any) => {
          const matchedProduct =
            (productsData as any[]).find((product: any) => Number(product.id) === Number(row.productId)) ||
            (productsData as any[]).find((product: any) => String(product.code || "") === String(row.materialCode || "")) ||
            (productsData as any[]).find((product: any) => String(product.name || "") === String(row.itemName || ""));
          const matchedWarehouse = stagingWarehouses.find((warehouse: any) => Number(warehouse.id) === Number(row.warehouseId));
          return {
            id: Number(row.id),
            warehouseId: Number(row.warehouseId),
            warehouseName: String(matchedWarehouse?.name || ""),
            productId: row?.productId == null ? undefined : Number(row.productId),
            materialCode: String(row.materialCode || matchedProduct?.code || ""),
            materialName: String(row.itemName || ""),
            specification: String(matchedProduct?.specification || ""),
            batchNo: String(row.batchNo || row.lotNo || ""),
            quantity: String(row.quantity || ""),
            unit: String(row.unit || matchedProduct?.unit || ""),
            location: String(row.location || ""),
            status: String(row.status || ""),
          };
        }),
    [inventoryData, productsData, stagingWarehouseIdSet, stagingWarehouses]
  );
  const selectableMaterialInventory = useMemo(
    () => {
      if (!activeMaterialRow) return stagingInventoryOptions;
      const code = String(activeMaterialRow.materialCode || "").trim();
      const name = String(activeMaterialRow.materialName || "").trim();
      const spec = String(activeMaterialRow.materialSpec || "").trim();
      const matched = stagingInventoryOptions.filter((row) => {
        if (code && String(row.materialCode || "").trim() === code) return true;
        if (name && String(row.materialName || "").trim() === name) {
          if (!spec) return true;
          return String(row.specification || "").trim() === spec;
        }
        return false;
      });
      return matched.length > 0 ? matched : stagingInventoryOptions;
    },
    [activeMaterialRow, stagingInventoryOptions]
  );
  const selectedDetailItems = useMemo(
    () => parseDetailItems(selected?.detailItems),
    [selected?.detailItems]
  );
  const materialCategoryMap = useMemo(
    () =>
      new Map(
        ((productsData as any[]) || [])
          .map((product: any) => [
            String(product?.code || "").trim(),
            String(product?.productCategory || "").trim(),
          ])
          .filter((entry) => entry[0])
      ),
    [productsData]
  );
  const selectedMaterialItems = useMemo(
    () => {
      const rows = parseMaterialItems(selected?.materialItems);
      if (!selected) return rows;
      if (!(selected.recordType === "material_usage" && isMixingProcess(selected.processName || selected.workstationName))) {
        return rows;
      }
      return rows.map(normalizeMaterialItemToMixingKg);
    },
    [selected?.materialItems, selected?.processName, selected?.recordType, selected?.workstationName]
  );
  const selectedDetailCategory = selectedDetailItems[0]?.category || "";
  const derivedFormActualQty = useMemo(
    () =>
      formatDecimalInput(
        getDerivedActualQtyForRecord({
          processName: form.processName || form.workstationName,
          recordType: form.recordType,
          materialItems: form.materialItems,
          plannedQty: form.plannedQty,
          actualQty: form.actualQty,
          scrapQty: form.scrapQty,
        })
      ),
    [form.actualQty, form.materialItems, form.plannedQty, form.processName, form.recordType, form.scrapQty, form.workstationName]
  );
  const autoDerivedActualQty = isMixingProcess(form.processName || form.workstationName) && form.recordType === "material_usage";
  const currentProcessAggregate = useMemo(
    () =>
      processAggregateMap.get(
        getProcessRecordGroupKey(form.batchNo, form.processName || form.workstationName)
      ),
    [form.batchNo, form.processName, form.workstationName, processAggregateMap]
  );
  const remainingQty = useMemo(() => {
    const plannedQty = parseNumberValue(form.plannedQty);
    if (plannedQty <= 0) return "";
    const completedQty = parseNumberValue(currentProcessAggregate?.totalActualQty);
    const currentQty = parseNumberValue(derivedFormActualQty || form.actualQty);
    return formatDecimalInput(Math.max(plannedQty - completedQty - currentQty, 0));
  }, [currentProcessAggregate?.totalActualQty, derivedFormActualQty, form.actualQty, form.plannedQty]);
  const isMixingMaterialUsage = form.recordType === "material_usage" && isMixingProcess(form.processName || form.workstationName);

  const getProcessCategoryForRecord = (record: ProductionRecord) => {
    const detailItems = parseDetailItems(record.detailItems);
    const detailCategory = detailItems[0]?.category ? normalizeProcessGroupName(detailItems[0].category) : "";
    if (detailCategory) return detailCategory;
    if ((parseJsonArray(record.moldItems) || []).length > 0) return "模具";
    if ((parseJsonArray(record.equipmentItems) || []).length > 0) return "设备";
    if (record.recordType === "material_usage") return "材料使用";
    if (record.recordType === "temperature_humidity") return "温湿度";
    if (record.recordType === "clean_room") return "清场";
    if (record.recordType === "first_piece") return "首件";
    return "";
  };

  const fillEditForm = (record: ProductionRecord) => {
    const processName = String(record.processName || record.workstationName || "").trim();
    const matchedProcess =
      processTemplates.find(
        (process) =>
          processMatchesProduct(process, record.productName || "") &&
          process.processName === processName
      ) || null;
    const processCategory = getProcessCategoryForRecord(record);
    const materialItems = (() => {
      const rows = parseMaterialItems(record.materialItems);
      if (record.recordType === "material_usage" && isMixingProcess(processName)) {
        return rows.map(normalizeMaterialItemToMixingKg);
      }
      return rows;
    })();
    const detailItems = parseDetailItems(record.detailItems);
    const moldSelections = parseJsonArray(record.moldItems)
      .map((item: any) => String(item?.name || ""))
      .filter(Boolean);
    const equipmentSelections = parseJsonArray(record.equipmentItems)
      .map((item: any) => String(item?.name || ""))
      .filter(Boolean);

    setEditingRecord(record);
    setCurrentDraftId(null);
    setForm({
      productionOrderId: record.productionOrderId ? String(record.productionOrderId) : "",
      productId: record.productId ? String(record.productId) : "",
      processId: matchedProcess ? String(matchedProcess.id) : "",
      processCategory,
      recordType: record.recordType || "general",
      productionOrderNo: record.productionOrderNo || "",
      productName: record.productName || "",
      batchNo: record.batchNo || "",
      unit: record.unit || "",
      workstationName: record.workstationName || "",
      recordDate: formatDateValue(record.recordDate) || getCurrentDateText(),
      recordTime: record.recordTime || getCurrentTimeText(),
      operatorId: record.operatorId ? String(record.operatorId) : "",
      plannedQty: record.plannedQty || "",
      actualQty: record.actualQty || "",
      scrapQty: record.scrapQty || "0",
      specification: record.specification || "",
      processType: record.processType || matchedProcess?.processType || "",
      processName: record.processName || matchedProcess?.processName || "",
      workshopName: record.workshopName || matchedProcess?.workshop || "",
      productionTeam: record.productionTeam || matchedProcess?.team || "",
      operator: record.operator || "",
      inspector: record.inspector || "",
      status: record.status || "in_progress",
      temperature: record.temperature || "",
      humidity: record.humidity || "",
      temperatureLimit: record.temperatureLimit || matchedProcess?.moduleConfigs.tempHumidity.temperatureRange || "",
      humidityLimit: record.humidityLimit || matchedProcess?.moduleConfigs.tempHumidity.humidityRange || "",
      cleanlinessLevel: record.cleanlinessLevel || "",
      pressureDiff: record.pressureDiff || "",
      materialCode: record.materialCode || "",
      materialName: record.materialName || "",
      materialSpec: record.materialSpec || "",
      usedQty: record.usedQty || "",
      usedUnit: record.usedUnit || "",
      materialBatchNo: record.materialBatchNo || "",
      storageArea: record.storageArea || "",
      issuedQty: record.issuedQty || "",
      qualifiedQty: record.qualifiedQty || "",
      cleanedBy: record.cleanedBy || "",
      checkedBy: record.checkedBy || "",
      cleanResult: record.cleanResult || "",
      firstPieceResult: record.firstPieceResult || "",
      firstPieceInspector: record.firstPieceInspector || "",
      firstPieceBasis: record.firstPieceBasis || "",
      firstPieceBasisVersion: record.firstPieceBasisVersion || "",
      moldSelections,
      equipmentSelections,
      materialItems,
      detailItems,
      documentVersion: record.documentVersion || matchedProcess?.version || "",
      remark: record.remark || "",
    });
  };

  const handleEditRecord = (record: ProductionRecord) => {
    if (viewOpen) {
      setPendingEditRecord(record);
      setViewOpen(false);
      return;
    }
    fillEditForm(record);
    window.setTimeout(() => {
      setFormOpen(true);
    }, 0);
  };

  function hasDraftableContent(formData: typeof form) {
    return Boolean(
      formData.productionOrderId ||
      formData.productName ||
      formData.batchNo ||
      formData.processId ||
      formData.processCategory ||
      formData.temperature ||
      formData.humidity ||
      formData.pressureDiff ||
      formData.actualQty ||
      formData.scrapQty !== "0" ||
      formData.remark ||
      formData.moldSelections.length ||
      formData.equipmentSelections.length ||
      formData.materialItems.length ||
      formData.detailItems.some((item) =>
        item.inputValue ||
        item.sampleValues?.some(Boolean) ||
        item.conclusion && item.conclusion !== "pending" ||
        (item.images || []).length > 0
      )
    );
  }

  function buildDraftTitle(formData: typeof form) {
    return formData.productionOrderNo || formData.productName || "未命名生产记录";
  }

  function buildDraftSubtitle(formData: typeof form) {
    return [formData.processName, formData.batchNo].filter(Boolean).join(" · ");
  }

  function upsertDraft(nextDraft: ProductionRecordDraft) {
    setDrafts((prev) => {
      const nextList = [nextDraft, ...prev.filter((item) => String(item.id) !== String(nextDraft.id))]
        .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());
      persistProductionRecordDrafts(nextList);
      return nextList;
    });
  }

  function removeDraftById(draftId: string | number) {
    setDrafts((prev) => {
      const nextList = prev.filter((item) => String(item.id) !== String(draftId));
      persistProductionRecordDrafts(nextList);
      return nextList;
    });
  }

  function saveCurrentDraft(options?: { silent?: boolean }) {
    if (!hasDraftableContent(form)) return false;
    const nowIso = new Date().toISOString();
    const draftId = currentDraftId || `production-record-draft-${Date.now()}`;
    const existing = drafts.find((item) => String(item.id) === String(draftId));
    const nextDraft: ProductionRecordDraft = {
      id: draftId,
      title: buildDraftTitle(form),
      subtitle: buildDraftSubtitle(form),
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
      form: JSON.parse(JSON.stringify(form)),
    };
    upsertDraft(nextDraft);
    if (!currentDraftId) setCurrentDraftId(String(draftId));
    if (!options?.silent) {
      toast.success("已自动保存到草稿库");
    }
    return true;
  }

  function resetForm() {
    setForm({
      productionOrderId: "", productId: "",
      processId: "",
      processCategory: "",
      recordType: "general", productionOrderNo: "", productName: "", batchNo: "", unit: "",
      workstationName: "", recordDate: getCurrentDateText(), recordTime: getCurrentTimeText(), operatorId: currentUserId ? String(currentUserId) : "", plannedQty: "", actualQty: "", scrapQty: "0",
      specification: "", processType: "", processName: "", workshopName: "", productionTeam: "",
      operator: currentUserName, inspector: "", status: "in_progress",
      temperature: "", humidity: "", temperatureLimit: "", humidityLimit: "",
      cleanlinessLevel: "", pressureDiff: "",
      materialCode: "", materialName: "", materialSpec: "",
      usedQty: "", usedUnit: "", materialBatchNo: "",
      storageArea: "", issuedQty: "", qualifiedQty: "",
      cleanedBy: "", checkedBy: "", cleanResult: "",
      firstPieceResult: "", firstPieceInspector: "", firstPieceBasis: "", firstPieceBasisVersion: "",
      moldSelections: [],
      equipmentSelections: [],
      materialItems: [],
      detailItems: [],
      documentVersion: "", remark: "",
    });
    setCurrentDraftId(null);
    setEditingRecord(null);
  }

  useEffect(() => {
    if (!formOpen || currentDraftId) return;
    setForm((prev) => ({
      ...prev,
      recordDate: getCurrentDateText(),
      recordTime: getCurrentTimeText(),
    }));
  }, [formOpen, currentDraftId]);

  useEffect(() => {
    if (viewOpen || !pendingEditRecord) return;
    const record = pendingEditRecord;
    setPendingEditRecord(null);
    window.setTimeout(() => {
      fillEditForm(record);
      setFormOpen(true);
    }, 120);
  }, [pendingEditRecord, viewOpen]);

  function handleProductionOrderChange(orderId: string) {
    if (orderId === "__NONE__") {
      setForm((prev) => ({
        ...prev,
        productionOrderId: "",
        productId: "",
        processId: "",
        processCategory: "",
        productionOrderNo: "",
        productName: "",
        batchNo: "",
        unit: "",
        recordTime: prev.recordTime || new Date().toTimeString().slice(0, 5),
        operatorId: currentUserId ? String(currentUserId) : "",
        plannedQty: "",
        actualQty: "",
        specification: "",
        processType: "",
        processName: "",
        workstationName: "",
        workshopName: "",
        productionTeam: "",
        operator: currentUserName,
        temperatureLimit: "",
        humidityLimit: "",
        pressureDiff: "",
        moldSelections: [],
        equipmentSelections: [],
        materialItems: [],
        detailItems: [],
        documentVersion: "",
      }));
      return;
    }
    const order = productionOrderOptions.find((item: any) => String(item.id) === orderId);
    if (!order) return;
    const matchedProcess =
      processTemplates.find(
        (process) =>
          processMatchesProduct(process, order.productName || "") &&
          process.processName === (order.selectedProcess?.processName || "")
      ) || null;
    const nextCategory = matchedProcess ? getProcessModuleCategories(matchedProcess)[0] || "" : "";
    const nextRows = buildCategoryDetailRows(matchedProcess, nextCategory);
    setForm((prev) => ({
      ...prev,
      productionOrderId: String(order.id),
      productId: order.productId ? String(order.productId) : "",
      processId: matchedProcess ? String(matchedProcess.id) : "",
      processCategory: nextCategory,
      productionOrderNo: order.orderNo || "",
      productName: order.productName || "",
      batchNo: order.batchNo || "",
      unit: order.unit || "",
      plannedQty: formatWholeNumber(order.plannedQty),
      actualQty: "",
      specification: order.productSpec || "",
      processType: matchedProcess?.processType || order.selectedProcess?.processType || "",
      processName: matchedProcess?.processName || order.selectedProcess?.processName || "",
      workstationName: matchedProcess?.processName || order.selectedProcess?.processName || "",
      workshopName: matchedProcess?.workshop || order.selectedProcess?.workshop || "",
      productionTeam: matchedProcess?.team || order.selectedProcess?.team || "",
      operatorId: prev.operatorId || (currentUserId ? String(currentUserId) : ""),
      operator: prev.operator || currentUserName,
      temperatureLimit: matchedProcess?.moduleConfigs.tempHumidity.temperatureRange || "",
      humidityLimit: matchedProcess?.moduleConfigs.tempHumidity.humidityRange || "",
      pressureDiff: "",
      moldSelections: [],
      equipmentSelections: [],
      materialItems: [],
      detailItems: nextRows,
      recordType: mapCategoryToRecordType(nextCategory),
      documentVersion: matchedProcess?.version || order.selectedProcess?.version || "",
      status: mapProductionOrderStatusToRecordStatus(order.status),
      remark: prev.remark || order.remark || "",
    }));
  }

  function handleProcessChange(processId: string) {
    if (processId === "__NONE__") {
      setForm((prev) => ({
        ...prev,
        processId: "",
        processCategory: "",
        processType: "",
        processName: "",
        workstationName: "",
        workshopName: "",
        productionTeam: "",
        operatorId: currentUserId ? String(currentUserId) : "",
        operator: currentUserName,
        temperatureLimit: "",
        humidityLimit: "",
        pressureDiff: "",
        moldSelections: [],
        equipmentSelections: [],
        materialItems: [],
        detailItems: [],
        documentVersion: "",
      }));
      return;
    }
    const process = matchedProcessOptions.find((item) => String(item.id) === processId);
    if (!process) return;
    const nextCategory = getProcessModuleCategories(process)[0] || "";
    const nextRows = buildCategoryDetailRows(process, nextCategory);
    setForm((prev) => ({
      ...prev,
      processId,
      processCategory: nextCategory,
      processType: process.processType,
      processName: process.processName,
      workstationName: process.processName,
      workshopName: process.workshop,
      productionTeam: process.team,
      operatorId: prev.operatorId || (currentUserId ? String(currentUserId) : ""),
      operator: prev.operator || currentUserName,
      temperatureLimit: process.moduleConfigs.tempHumidity.temperatureRange || "",
      humidityLimit: process.moduleConfigs.tempHumidity.humidityRange || "",
      pressureDiff: "",
      moldSelections: [],
      equipmentSelections: [],
      materialItems: [],
      detailItems: nextRows,
      recordType: mapCategoryToRecordType(nextCategory),
      documentVersion: process.version || "",
    }));
  }

  function handleProcessCategoryChange(category: string) {
    if (!editingRecord) {
      saveCurrentDraft({ silent: true });
    }
    setForm((prev) => ({
      ...prev,
      processCategory: category === "__NONE__" ? "" : category,
      detailItems: category === "__NONE__" ? [] : buildCategoryDetailRows(selectedProcessTemplate, category),
      recordType: category === "__NONE__" ? "general" : mapCategoryToRecordType(category),
    }));
  }

  function handleDraftEdit(item: DraftItem) {
    const record = drafts.find((draft) => String(draft.id) === String(item.id));
    if (!record) return;
    setCurrentDraftId(String(record.id));
    setForm((prev) => ({ ...prev, ...(record.form as typeof form) }));
    setFormOpen(true);
  }

  function handleDraftDelete(item: DraftItem) {
    removeDraftById(item.id);
    if (String(currentDraftId || "") === String(item.id)) {
      setCurrentDraftId(null);
    }
  }

  function handleFormOpenChange(nextOpen: boolean) {
    if (!nextOpen && formOpen) {
      if (!editingRecord) {
        const saved = saveCurrentDraft({ silent: true });
        if (saved) toast.success("已自动保存到草稿库");
      }
      resetForm();
    }
    setFormOpen(nextOpen);
  }

  function updateMaterialItemRow(id: string, patch: Partial<MaterialUsageItem>) {
    setForm((prev) => ({
      ...prev,
      materialItems: prev.materialItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addMaterialItemRow() {
    setForm((prev) => ({
      ...prev,
      materialItems: [...prev.materialItems, createEmptyMaterialItem()],
    }));
  }

  function removeMaterialItemRow(id: string) {
    setForm((prev) => ({
      ...prev,
      materialItems: prev.materialItems.filter((item) => item.id !== id),
    }));
  }

  function applyInventoryToMaterialItem(id: string, inventoryRow: StagingInventoryOption) {
    updateMaterialItemRow(id, {
      inventoryId: inventoryRow.id,
      productId: inventoryRow.productId,
      warehouseId: inventoryRow.warehouseId,
      warehouseName: inventoryRow.warehouseName,
      materialCode: inventoryRow.materialCode,
      materialName: inventoryRow.materialName,
      materialSpec: inventoryRow.specification,
      batchNo: inventoryRow.batchNo,
      storageArea: inventoryRow.location || inventoryRow.warehouseName,
      availableQty: isMixingMaterialUsage
        ? formatDecimalInput(convertQuantityUnit(inventoryRow.quantity, inventoryRow.unit, "kg"))
        : inventoryRow.quantity,
      unit: isMixingMaterialUsage ? "kg" : inventoryRow.unit,
      bomUnit: activeMaterialRow?.bomUnit || inventoryRow.unit,
    });
  }

  function handleDetailItemChange(id: string, field: "sampleQty" | "inputValue" | "conclusion", value: string) {
    setForm((prev) => ({
      ...prev,
      detailItems: prev.detailItems.map((item) =>
        item.id === id
          ? ensureProcessRequirementRow({
              ...item,
              [field]: value,
            })
          : item
      ),
    }));
  }

  function handleDetailSampleCountChange(id: string, value: string) {
    const count = Math.max(1, Number(value || "1"));
    setForm((prev) => ({
      ...prev,
      detailItems: prev.detailItems.map((item) => {
        if (item.id !== id) return item;
        const sampleValues = Array.isArray(item.sampleValues) ? item.sampleValues : [];
        return ensureProcessRequirementRow({
          ...item,
          sampleQty: String(count),
          sampleValues: Array.from({ length: count }, (_, index) => sampleValues[index] || ""),
          inputValue: Array.from({ length: count }, (_, index) => sampleValues[index] || "").filter(Boolean).join(" / "),
        });
      }),
    }));
  }

  function handleDetailSampleValueChange(id: string, sampleIndex: number, value: string) {
    setForm((prev) => ({
      ...prev,
      detailItems: prev.detailItems.map((item) => {
        if (item.id !== id) return item;
        const nextValues = Array.from(
          { length: Math.max(1, Number(item.sampleQty || "1")) },
          (_, index) => (Array.isArray(item.sampleValues) ? item.sampleValues[index] || "" : "")
        );
        nextValues[sampleIndex] = value;
        return ensureProcessRequirementRow({
          ...item,
          sampleValues: nextValues,
          inputValue: nextValues.filter(Boolean).join(" / "),
        });
      }),
    }));
  }

  async function handleDetailImagesUpload(id: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const title = `${form.productionOrderNo || form.productName || "生产指令"}-检验记录`;
    const uploaded = await Promise.all(
      Array.from(files).map(async (file, index) => ({
        id: `${id}-${Date.now()}-${index}`,
        name: file.name,
        title,
        dataUrl: await compressImageFile(file),
      }))
    );
    setForm((prev) => ({
      ...prev,
      detailItems: prev.detailItems.map((item) =>
        item.id === id
          ? {
              ...item,
              images: [...(item.images || []), ...uploaded],
            }
          : item
      ),
    }));
  }

  function removeDetailImage(id: string, imageId: string) {
    setForm((prev) => ({
      ...prev,
      detailItems: prev.detailItems.map((item) =>
        item.id === id
          ? {
              ...item,
              images: (item.images || []).filter((image) => image.id !== imageId),
            }
          : item
      ),
    }));
  }

  function toggleMoldSelection(name: string) {
    setForm((prev) => ({
      ...prev,
      moldSelections: prev.moldSelections.includes(name)
        ? prev.moldSelections.filter((item) => item !== name)
        : [...prev.moldSelections, name],
    }));
  }

  function toggleEquipmentSelection(name: string) {
    setForm((prev) => ({
      ...prev,
      equipmentSelections: prev.equipmentSelections.includes(name)
        ? prev.equipmentSelections.filter((item) => item !== name)
        : [...prev.equipmentSelections, name],
    }));
  }

  function handleSubmit() {
    setPasswordValue("");
    setPasswordDialogOpen(true);
  }

  function submitProductionRecord() {
    if (!form.productionOrderId) return toast.error("请选择生产指令");
    const normalizedMaterialItems = form.materialItems
      .filter((item) => item.materialName || item.materialCode)
      .map((item) => ({
        ...item,
        availableQty: formatDecimalInput(item.availableQty),
        bomQty: formatDecimalInput(item.bomQty),
        plannedQty: formatDecimalInput(item.plannedQty),
        issuedQty: formatDecimalInput(item.issuedQty),
        usedQty: formatDecimalInput(item.usedQty),
      }));
    const firstMaterialItem = normalizedMaterialItems[0];
    const totalIssuedQty = normalizedMaterialItems.reduce((sum, item) => sum + (Number(item.issuedQty || 0) || 0), 0);
    const totalUsedQty = normalizedMaterialItems.reduce((sum, item) => sum + (Number(item.usedQty || 0) || 0), 0);
    const cleanConclusionList = form.detailItems.map((item) => item.conclusion || "pending");
    const derivedCleanResult =
      form.processCategory === "清场"
        ? cleanConclusionList.every((item) => item === "qualified")
          ? "pass"
          : cleanConclusionList.some((item) => item === "unqualified")
            ? "fail"
            : undefined
        : form.cleanResult || undefined;
    const derivedFirstPieceResult =
      form.processCategory === "首件"
        ? cleanConclusionList.every((item) => item === "qualified")
          ? "qualified"
          : cleanConclusionList.some((item) => item === "unqualified")
            ? "unqualified"
            : undefined
        : form.firstPieceResult || undefined;
    const derivedActualQtyNumber = getDerivedActualQtyForRecord({
      processName: form.processName || form.workstationName,
      recordType: form.recordType,
      materialItems: normalizedMaterialItems,
      plannedQty: form.plannedQty,
      actualQty: form.actualQty,
    });
    const derivedActualQty = formatDecimalInput(derivedActualQtyNumber);
    const processGroupKey = getProcessRecordGroupKey(form.batchNo, form.processName || form.workstationName);
    const existingAggregate = processAggregateMap.get(processGroupKey);
    const nextTotalActualQty = roundToDigits((existingAggregate?.totalActualQty || 0) + derivedActualQtyNumber, 4);
    const nextTotalScrapQty = roundToDigits((existingAggregate?.totalScrapQty || 0) + parseNumberValue(form.scrapQty), 4);
    const derivedStatus = deriveAutoProcessStatus(
      nextTotalActualQty,
      form.plannedQty,
      Boolean(existingAggregate?.hasAbnormal)
    );
    const parsedRemarkMeta = parseBomRemarkMeta(form.remark);
    const signerName = currentUserName || String((user as any)?.name || "当前用户");
    const payload = {
      recordType: form.recordType as any,
      productionOrderId: Number(form.productionOrderId) || undefined,
      productId: Number(form.productId) || undefined,
      productionOrderNo: form.productionOrderNo || undefined,
      productName: form.productName || undefined,
      batchNo: form.batchNo || undefined,
      workstationName: form.workstationName || undefined,
      recordDate: form.recordDate || undefined,
      recordTime: form.recordTime || undefined,
      operatorId: Number(form.operatorId) || undefined,
      plannedQty: formatWholeNumber(form.plannedQty) || undefined,
      actualQty: derivedActualQty || undefined,
      scrapQty: formatDecimalInput(form.scrapQty) || undefined,
      specification: form.specification || undefined,
      processType: form.processType || undefined,
      processName: form.processName || undefined,
      workshopName: form.workshopName || undefined,
      productionTeam: form.productionTeam || undefined,
      operator: form.operator || undefined,
      inspector: form.inspector || undefined,
      temperature: form.temperature || undefined,
      humidity: form.humidity || undefined,
      temperatureLimit: form.temperatureLimit || undefined,
      humidityLimit: form.humidityLimit || undefined,
      cleanlinessLevel: form.cleanlinessLevel || undefined,
      pressureDiff: form.pressureDiff || undefined,
      materialCode: firstMaterialItem?.materialCode || form.materialCode || undefined,
      materialName: firstMaterialItem?.materialName || form.materialName || undefined,
      materialSpec: firstMaterialItem?.materialSpec || form.materialSpec || undefined,
      usedQty: formatDecimalInput(totalUsedQty || form.usedQty) || undefined,
      usedUnit: firstMaterialItem?.unit || form.usedUnit || undefined,
      materialBatchNo: firstMaterialItem?.batchNo || form.materialBatchNo || undefined,
      storageArea: firstMaterialItem?.storageArea || form.storageArea || undefined,
      issuedQty: formatDecimalInput(totalIssuedQty || form.issuedQty) || undefined,
      qualifiedQty: derivedActualQty || undefined,
      cleanedBy: form.cleanedBy || undefined,
      checkedBy: form.checkedBy || undefined,
      cleanResult: derivedCleanResult,
      firstPieceResult: derivedFirstPieceResult,
      firstPieceInspector: form.firstPieceInspector || undefined,
      firstPieceBasis: form.firstPieceBasis || undefined,
      firstPieceBasisVersion: form.firstPieceBasisVersion || undefined,
      detailItems: form.detailItems.length ? JSON.stringify(form.detailItems) : undefined,
      materialItems: normalizedMaterialItems.length ? JSON.stringify(normalizedMaterialItems) : undefined,
      equipmentItems: form.equipmentSelections.length
        ? JSON.stringify(form.equipmentSelections.map((name) => ({ name, used: true })))
        : undefined,
      moldItems: form.moldSelections.length
        ? JSON.stringify(form.moldSelections.map((name) => ({ name })))
        : undefined,
      documentVersion: form.documentVersion || undefined,
      remark: buildProductionRecordRemarkMeta({
        remark: parsedRemarkMeta.remark,
        bindingProcess: parsedRemarkMeta.bindingProcess,
        signatures: [...parsedRemarkMeta.signatures, createProductionRecordSignature(signerName)],
      }),
      status: derivedStatus as any,
    };
    if (editingRecord?.id) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: payload,
      });
      return;
    }
    createMutation.mutate({
      recordNo: undefined,
      ...payload,
    });
  }

  async function handlePasswordConfirm() {
    if (!passwordValue.trim()) {
      toast.error("请输入密码");
      return;
    }
    try {
      await verifyPasswordMutation.mutateAsync({ password: passwordValue });
      setPasswordDialogOpen(false);
      setPasswordValue("");
      submitProductionRecord();
    } catch (error: any) {
      toast.error(error?.message || "密码校验失败");
    }
  }

  const renderCurrentModuleForm = () => {
    if (!form.processCategory) {
      return null;
    }

    if (form.processCategory === "清场") {
      return (
        <div className="border rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-3.5 text-sm font-bold">项目</TableHead>
                <TableHead className="py-3.5 text-sm font-bold">检验要求</TableHead>
                <TableHead className="py-3.5 text-sm font-bold">确认人</TableHead>
                <TableHead className="w-40 py-3.5 text-sm font-bold">结果</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.detailItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">
                    当前工序未配置清场检查项
                  </TableCell>
                </TableRow>
              ) : (
                form.detailItems.map((item) => {
                  const confirmer = item.confirmerName || currentClearanceConfig?.items?.find((row) => row.id === item.id)?.confirmerName || "-";
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName || "-"}</TableCell>
                      <TableCell>{item.requirement || "-"}</TableCell>
                      <TableCell>{confirmer}</TableCell>
                      <TableCell>
                        <Select
                          value={item.conclusion || "pending"}
                          onValueChange={(value) => handleDetailItemChange(item.id, "conclusion", value)}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待判定</SelectItem>
                            <SelectItem value="qualified">合格</SelectItem>
                            <SelectItem value="unqualified">不合格</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (form.processCategory === "模具") {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>模具工装</Label>
            <Button type="button" variant="outline" className="h-10 w-full justify-start font-normal" onClick={() => setMoldPickerOpen(true)}>
              {form.moldSelections.length > 0 ? form.moldSelections.join("、") : "请选择模具工装"}
            </Button>
          </div>
          {form.moldSelections.length > 0 ? <div className="flex flex-wrap gap-2">{form.moldSelections.map((name) => <Badge key={name} variant="secondary" className="px-3 py-1">{name}</Badge>)}</div> : null}
        </div>
      );
    }

    if (form.processCategory === "温湿度") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>温度 (℃)</Label>
            <Input type="number" value={form.temperature} onChange={(e) => setForm((prev) => ({ ...prev, temperature: e.target.value }))} placeholder="请输入温度" />
            <p className="text-sm text-muted-foreground">标准：{currentTempHumidityConfig?.temperatureRange || "-"}</p>
          </div>
          <div className="space-y-1.5">
            <Label>湿度 (%RH)</Label>
            <Input type="number" value={form.humidity} onChange={(e) => setForm((prev) => ({ ...prev, humidity: e.target.value }))} placeholder="请输入湿度" />
            <p className="text-sm text-muted-foreground">标准：{currentTempHumidityConfig?.humidityRange || "-"}</p>
          </div>
          <div className="space-y-1.5">
            <Label>压差 (Pa)</Label>
            <Input type="number" value={form.pressureDiff} onChange={(e) => setForm((prev) => ({ ...prev, pressureDiff: e.target.value }))} placeholder="请输入压差" />
            <p className="text-sm text-muted-foreground">标准：{currentTempHumidityConfig?.pressureRange || "-"}</p>
          </div>
        </div>
      );
    }

    if (form.processCategory === "设备") {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>使用设备</Label>
            <Button type="button" variant="outline" className="h-10 w-full justify-start font-normal" onClick={() => setEquipmentPickerOpen(true)}>
              {form.equipmentSelections.length > 0 ? form.equipmentSelections.join("、") : "请选择设备"}
            </Button>
          </div>
          {form.equipmentSelections.length > 0 ? <div className="flex flex-wrap gap-2">{form.equipmentSelections.map((name) => <Badge key={name} variant="secondary" className="px-3 py-1">{name}</Badge>)}</div> : null}
        </div>
      );
    }

    if (form.processCategory === "材料使用") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              物料默认按当前工序绑定的 BOM 自动带入，来源选择暂存区库存批次
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addMaterialItemRow}>
              <Plus className="mr-1 h-4 w-4" />
              增加一行
            </Button>
          </div>
          <div className="border rounded-sm overflow-x-auto">
            <Table className="min-w-[1010px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px] text-center">选批</TableHead>
                  <TableHead className="w-[110px]">实际用量</TableHead>
                  <TableHead className="w-[120px]">放置区域</TableHead>
                  <TableHead className="w-[180px]">材料名称</TableHead>
                  <TableHead className="w-[180px]">规格</TableHead>
                  <TableHead className="w-[120px]">来源批次</TableHead>
                  <TableHead className="w-[110px]">暂存区余量</TableHead>
                  <TableHead className="w-[110px]">计划领用</TableHead>
                  <TableHead className="w-[90px]">单位</TableHead>
                  <TableHead className="w-[80px] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.materialItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-6 text-sm text-muted-foreground">
                      当前工序未绑定 BOM 物料，可手动增加一行后从暂存区选择
                    </TableCell>
                  </TableRow>
                ) : (
                  form.materialItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveMaterialRowId(item.id);
                            setMaterialPickerOpen(true);
                          }}
                        >
                          选择
                        </Button>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={item.usedQty}
                            onChange={(e) => updateMaterialItemRow(item.id, { usedQty: e.target.value })}
                            placeholder="0"
                            className="h-10 text-sm"
                          />
                          <span className="shrink-0 text-sm text-muted-foreground">{item.unit || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.storageArea || item.warehouseName || "-"}</TableCell>
                      <TableCell>{item.materialName || "-"}</TableCell>
                      <TableCell>{item.materialSpec || "-"}</TableCell>
                      <TableCell>{item.batchNo || "-"}</TableCell>
                      <TableCell>{item.availableQty ? `${formatQuantityByUnit(item.availableQty, item.unit)} ${item.unit || ""}` : "-"}</TableCell>
                      <TableCell>{item.issuedQty ? `${formatQuantityByUnit(item.issuedQty, item.unit)} ${item.unit || ""}` : "-"}</TableCell>
                      <TableCell>{item.unit || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeMaterialItemRow(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    const showQcPointCompact = form.processCategory === "质控点";
    if (showQcPointCompact) {
      return (
        <div className="border rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[92px] py-3 text-sm font-bold">项目名称</TableHead>
                <TableHead className="w-[132px] py-3 text-sm font-bold">检验要求</TableHead>
                <TableHead className="py-3 text-sm font-bold">录入信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.detailItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                    当前工序未配置检测项目
                  </TableCell>
                </TableRow>
              ) : (
                form.detailItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-3 align-top text-sm font-medium">{item.itemName || "-"}</TableCell>
                    <TableCell className="py-3 align-top text-xs leading-5 text-slate-700">
                      <div>{item.requirement || "-"}</div>
                      {item.unit ? <div className="text-xs text-muted-foreground">单位：{item.unit}</div> : null}
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <div className="space-y-3">
                        <Input
                          type="number"
                          value={item.inputValue || ""}
                          onChange={(e) => handleDetailItemChange(item.id, "inputValue", e.target.value)}
                          placeholder="请输入"
                          className="h-9 text-sm"
                        />

                        <div className="flex items-center gap-2">
                          <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border text-sm">
                            <ImagePlus className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              multiple
                              className="hidden"
                              onChange={async (e) => {
                                await handleDetailImagesUpload(item.id, e.target.files);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                          <Select
                            value={item.conclusion || "pending"}
                            onValueChange={(value) => handleDetailItemChange(item.id, "conclusion", value)}
                          >
                            <SelectTrigger className="h-9 w-[96px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">待判定</SelectItem>
                              <SelectItem value="qualified">合格</SelectItem>
                              <SelectItem value="unqualified">不合格</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(item.images || []).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {(item.images || []).map((image) => (
                              <div key={image.id} className="relative">
                                <img src={image.dataUrl} alt={image.name} className="h-10 w-10 rounded border object-cover" />
                                <button
                                  type="button"
                                  className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[10px] shadow"
                                  onClick={() => removeDetailImage(item.id, image.id)}
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      );
    }

    const showSampleQty = form.processCategory === "首件";
    if (showSampleQty) {
      return (
        <div className="border rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[88px] py-3 text-sm font-bold">项目名称</TableHead>
                <TableHead className="w-[120px] py-3 text-sm font-bold">检验要求</TableHead>
                <TableHead className="py-3 text-sm font-bold">录入信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.detailItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                    当前工序未配置检测项目
                  </TableCell>
                </TableRow>
              ) : (
                form.detailItems.map((item) => {
                  const isQuantitative = item.valueType === "quantitative";
                  const sampleCount = Math.max(1, Number(item.sampleQty || "3"));
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="py-3 align-top text-sm font-medium">{item.itemName || "-"}</TableCell>
                      <TableCell className="py-3 align-top text-xs leading-5 text-slate-700">
                        <div>{item.requirement || "-"}</div>
                        {item.unit ? <div className="text-xs text-muted-foreground">单位：{item.unit}</div> : null}
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            {isQuantitative ? (
                              <Select
                                value={String(item.sampleQty || "3")}
                                onValueChange={(value) => handleDetailSampleCountChange(item.id, value)}
                              >
                                <SelectTrigger className="h-9 w-[72px] text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                                    <SelectItem key={value} value={value}>{value}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}

                            <div className="flex-1">
                              {isQuantitative ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {Array.from({ length: sampleCount }, (_, index) => (
                                    <Input
                                      key={`${item.id}-${index}`}
                                      type="number"
                                      value={item.sampleValues?.[index] || ""}
                                      onChange={(e) => handleDetailSampleValueChange(item.id, index, e.target.value)}
                                      placeholder={`样本${index + 1}`}
                                      className="h-9 text-center text-sm"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">无需数值录入</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border text-sm">
                              <ImagePlus className="h-4 w-4" />
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={async (e) => {
                                  await handleDetailImagesUpload(item.id, e.target.files);
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>
                            <Select
                              value={item.conclusion || "pending"}
                              onValueChange={(value) => handleDetailItemChange(item.id, "conclusion", value)}
                            >
                              <SelectTrigger className="h-9 w-[96px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">待判定</SelectItem>
                                <SelectItem value="qualified">合格</SelectItem>
                                <SelectItem value="unqualified">不合格</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {(item.images || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {(item.images || []).map((image) => (
                                <div key={image.id} className="relative">
                                  <img src={image.dataUrl} alt={image.name} className="h-10 w-10 rounded border object-cover" />
                                  <button
                                    type="button"
                                    className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[10px] shadow"
                                    onClick={() => removeDetailImage(item.id, image.id)}
                                  >
                                    x
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <div className="border rounded-sm overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="py-3.5 text-sm font-bold">项目名称</TableHead>
              <TableHead className={showSampleQty ? "w-[180px] py-3.5 text-sm font-bold" : "py-3.5 text-sm font-bold"}>检验要求</TableHead>
              {showSampleQty ? <TableHead className="w-20 py-3.5 text-sm font-bold">样品量</TableHead> : null}
              <TableHead className={showSampleQty ? "w-[520px] py-3.5 text-sm font-bold" : "w-[320px] py-3.5 text-sm font-bold"}>数值录入</TableHead>
              <TableHead className={showSampleQty ? "w-16 py-3.5 text-center text-sm font-bold" : "w-[240px] py-3.5 text-sm font-bold"}>{showSampleQty ? "图片" : "上传图片"}</TableHead>
              <TableHead className={showSampleQty ? "w-24 py-3.5 text-sm font-bold" : "w-40 py-3.5 text-sm font-bold"}>结论</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {form.detailItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showSampleQty ? 6 : 5} className="text-center py-6 text-sm text-muted-foreground">
                  当前工序未配置检测项目
                </TableCell>
              </TableRow>
            ) : (
              form.detailItems.map((item) => {
                const isQuantitative = !showSampleQty || item.valueType === "quantitative";
                return (
                <TableRow key={item.id}>
                  <TableCell className="py-3.5 text-sm font-medium">{item.itemName || "-"}</TableCell>
                  <TableCell className={showSampleQty ? "py-3.5 text-xs leading-5 text-slate-700" : "py-3.5 text-sm leading-6 text-slate-700"}>
                    <div>{item.requirement || "-"}</div>
                    {item.unit ? <div className="text-xs text-muted-foreground">单位：{item.unit}</div> : null}
                  </TableCell>
                  {showSampleQty ? (
                    <TableCell className="py-2">
                      {isQuantitative ? (
                        <Select
                          value={String(item.sampleQty || "1")}
                          onValueChange={(value) => handleDetailSampleCountChange(item.id, value)}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                              <SelectItem key={value} value={value}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-center text-sm text-muted-foreground">-</div>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="py-2">
                    {showSampleQty ? (
                      isQuantitative ? (
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: Math.max(1, Number(item.sampleQty || "1")) }, (_, index) => (
                          <Input
                            key={`${item.id}-${index}`}
                            type="number"
                            value={item.sampleValues?.[index] || ""}
                            onChange={(e) => handleDetailSampleValueChange(item.id, index, e.target.value)}
                            placeholder={`样本${index + 1}`}
                            className="h-10 w-24 min-w-[96px] text-center text-sm"
                          />
                        ))}
                      </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )
                    ) : (
                      <Input
                        value={item.inputValue || ""}
                        onChange={(e) => handleDetailItemChange(item.id, "inputValue", e.target.value)}
                        placeholder="请输入"
                        className="h-10 text-sm"
                      />
                    )}
                  </TableCell>
                  <TableCell className={showSampleQty ? "py-2 text-center align-top" : "py-2"}>
                    <div className={showSampleQty ? "flex flex-col items-center gap-2" : "space-y-2"}>
                      <label className={showSampleQty ? "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border text-sm" : "inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm"}>
                        {showSampleQty ? <ImagePlus className="h-4 w-4" /> : "上传图片"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            await handleDetailImagesUpload(item.id, e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {(item.images || []).length > 0 ? (
                        <div className={showSampleQty ? "flex flex-wrap justify-center gap-2" : "flex flex-wrap gap-2"}>
                          {(item.images || []).map((image) => (
                            <div key={image.id} className="relative">
                              <img src={image.dataUrl} alt={image.name} className={showSampleQty ? "h-10 w-10 rounded border object-cover" : "h-12 w-12 rounded border object-cover"} />
                              <button
                                type="button"
                                className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[10px] shadow"
                                onClick={() => removeDetailImage(item.id, image.id)}
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Select
                      value={item.conclusion || "pending"}
                      onValueChange={(value) => handleDetailItemChange(item.id, "conclusion", value)}
                    >
                      <SelectTrigger className={showSampleQty ? "h-10 text-xs" : "h-10 text-sm"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">待判定</SelectItem>
                        <SelectItem value="qualified">合格</SelectItem>
                        <SelectItem value="unqualified">不合格</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, filtered.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!currentUserName) return;
    setForm((prev) => {
      if (prev.operator && prev.operatorId) return prev;
      return {
        ...prev,
        operator: prev.operator || currentUserName,
        operatorId: prev.operatorId || (currentUserId ? String(currentUserId) : ""),
      };
    });
  }, [currentUserId, currentUserName]);

  useEffect(() => {
    if (!formOpen || !autoDerivedActualQty) return;
    setForm((prev) => {
      if (String(prev.actualQty || "") === String(derivedFormActualQty || "")) return prev;
      return {
        ...prev,
        actualQty: derivedFormActualQty,
      };
    });
  }, [autoDerivedActualQty, derivedFormActualQty, formOpen]);

  useEffect(() => {
    if (!selectedProcessTemplate || Number(form.productId || 0) <= 0) return;
    if (!selectedProcessTemplate.modules.materialUsage) return;
    const nextMaterialItems = buildMaterialItemsFromBom(
      bomData as any[],
      selectedProcessTemplate.processName || "",
      form.plannedQty,
      materialCategoryMap
    ).map((item) =>
      isMixingProcess(selectedProcessTemplate.processName) ? normalizeMaterialItemToMixingKg(item) : item
    );
    setForm((prev) => {
      const hasManualSelection = prev.materialItems.some(
        (item) => item.sourceType === "manual" || item.inventoryId || item.batchNo || item.storageArea
      );
      if (hasManualSelection) return prev;
      const currentSnapshot = JSON.stringify(prev.materialItems.map((item) => ({
        materialCode: item.materialCode,
        materialName: item.materialName,
        materialSpec: item.materialSpec,
        unit: item.unit,
        bomQty: item.bomQty,
        plannedQty: item.plannedQty,
        issuedQty: item.issuedQty,
        usedQty: item.usedQty,
      })));
      const nextSnapshot = JSON.stringify(nextMaterialItems.map((item) => ({
        materialCode: item.materialCode,
        materialName: item.materialName,
        materialSpec: item.materialSpec,
        unit: item.unit,
        bomQty: item.bomQty,
        plannedQty: item.plannedQty,
        issuedQty: item.issuedQty,
        usedQty: item.usedQty,
      })));
      if (currentSnapshot === nextSnapshot) return prev;
      return {
        ...prev,
        materialItems: nextMaterialItems,
      };
    });
  }, [bomData, form.plannedQty, form.productId, materialCategoryMap, selectedProcessTemplate]);

  useEffect(() => {
    if (!formOpen) return;
    if (editingRecord) return;
    const handleBeforeUnload = () => {
      if (!hasDraftableContent(form)) return;
      const nowIso = new Date().toISOString();
      const draftId = currentDraftId || `production-record-draft-${Date.now()}`;
      const existing = drafts.find((item) => String(item.id) === String(draftId));
      const nextDraft: ProductionRecordDraft = {
        id: draftId,
        title: buildDraftTitle(form),
        subtitle: buildDraftSubtitle(form),
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
        form: JSON.parse(JSON.stringify(form)),
      };
      const nextList = [nextDraft, ...drafts.filter((item) => String(item.id) !== String(draftId))]
        .sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime());
      persistProductionRecordDrafts(nextList);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentDraftId, drafts, editingRecord, form, formOpen]);

  useEffect(() => {
    if (autoCreateHandledRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "new") return;
    autoCreateHandledRef.current = true;
    const processCategory = String(params.get("processCategory") || "").trim();
    const recordType = String(params.get("recordType") || "").trim();
    resetForm();
    if (processCategory || recordType) {
      setForm((prev) => ({
        ...prev,
        processCategory: processCategory || prev.processCategory,
        recordType: recordType || (processCategory ? mapCategoryToRecordType(processCategory) : prev.recordType),
      }));
    }
    setFormOpen(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

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
          <div className="flex items-center gap-2">
            <DraftDrawer
              count={drafts.length}
              drafts={drafts}
              moduleName="生产记录"
              onEdit={handleDraftEdit}
              onDelete={handleDraftDelete}
              loading={false}
            />
            <Button onClick={() => { resetForm(); setFormOpen(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> 新建记录
            </Button>
          </div>
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
                <TableHead>记录时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无生产记录数据</TableCell></TableRow>
              ) : pagedRecords.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{r.recordNo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{getProductionRecordTypeLabel(r)}</Badge>
                  </TableCell>
                  <TableCell>{r.productName ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.batchNo ?? "-"}</TableCell>
                  <TableCell className="text-sm">{r.workstationName ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[formatDateValue(r.recordDate), r.recordTime].filter(Boolean).join(" ") || "-"}</TableCell>
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
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelected(r);
                            setViewOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />查看详情
                        </DropdownMenuItem>
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
        <TablePaginationFooter total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>

      {/* ── 新建弹窗 ── */}
      <DraggableDialog open={formOpen} onOpenChange={handleFormOpenChange}>
        <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto bg-white text-sm [&_input]:h-10 [&_input]:text-sm [&_label]:text-sm [&_label]:font-semibold [&_textarea]:text-sm [&_[role=combobox]]:h-10 [&_[role=combobox]]:text-sm">
          <DialogHeader className="sr-only">
            <DialogTitle>{editingRecord ? "修改生产记录" : "新建生产记录"}</DialogTitle>
            <DialogDescription>填写生产记录信息及工序数据</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="relative mb-8 flex h-8 items-center rounded-t-[22px] bg-slate-200">
              <div className="mx-auto -mt-1 rounded-b-2xl rounded-t-md bg-slate-700 px-10 py-2 text-xl font-bold tracking-wide text-white">
                生产记录表
              </div>
            </div>

            <div className="space-y-7 pb-4">
              <div>
                <LegacySectionHeader title="生产信息" />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-1.5">
                    <Label>生产指令 <span className="text-red-500">*</span></Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start font-normal"
                      onClick={() => setProductionOrderPickerOpen(true)}
                    >
                      {selectedProductionOrder ? (
                        <span className="truncate">
                          {selectedProductionOrder.orderNo}
                          {selectedProductionOrder.productName ? ` - ${selectedProductionOrder.productName}` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">请选择生产指令</span>
                      )}
                    </Button>
                  </div>
                  <QueryDisplayField label="生产指令号" value={form.productionOrderNo} mono />
                  <div className="space-y-1.5">
                    <Label>记录日期</Label>
                    <DateTextInput value={form.recordDate} onChange={(value) => setForm((p) => ({ ...p, recordDate: value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>记录时间</Label>
                    <Input type="time" value={form.recordTime} onChange={e => setForm(p => ({ ...p, recordTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>操作员</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start font-normal"
                      onClick={() => setOperatorPickerOpen(true)}
                    >
                      {selectedOperator ? (
                        <span className="truncate">
                          {selectedOperator.employeeNo ? `${selectedOperator.employeeNo} - ` : ""}
                          {selectedOperator.name}
                        </span>
                      ) : form.operator ? (
                        <span className="truncate">{form.operator}</span>
                      ) : (
                        <span className="text-muted-foreground">请选择操作员</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <LegacySectionHeader title="产品信息" />
                {form.productionOrderId && (form.productName || form.specification || form.batchNo || form.plannedQty || form.unit) ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <QueryDisplayField label="产品名称" value={form.productName} />
                    <QueryDisplayField label="规格型号" value={form.specification} />
                    <QueryDisplayField label="生产批号" value={form.batchNo} mono />
                    <QueryDisplayField
                      label="数量"
                      value={[formatWholeNumber(form.plannedQty) || "0", form.unit].filter(Boolean).join(" ")}
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <LegacySectionHeader title="工序信息" />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>选择工序</Label>
                    <Select value={form.processId || "__NONE__"} onValueChange={handleProcessChange}>
                      <SelectTrigger><SelectValue placeholder="选择生产工序" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__NONE__">请选择生产工序</SelectItem>
                        {matchedProcessOptions.map((process) => (
                          <SelectItem key={process.id} value={String(process.id)}>
                            {process.sortOrder}. {process.processName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <QueryDisplayField label="工序类别" value={processTypeLabelMap[form.processType] || ""} />
                  <QueryDisplayField label="车间名称" value={form.workshopName} />
                  <QueryDisplayField label="生产班组" value={form.productionTeam} />
                </div>

                <div className="mt-7">
                  {availableProcessCategories.length > 0 ? (
                    <Tabs value={form.processCategory || undefined} onValueChange={handleProcessCategoryChange}>
                      <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-300 bg-transparent p-0">
                        {availableProcessCategories.map((category) => (
                          <TabsTrigger
                            key={category}
                            value={category}
                            className="rounded-t-md rounded-b-none border border-b-0 border-slate-300 bg-slate-100 px-6 py-2.5 text-sm font-medium text-slate-700 data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-none"
                          >
                            {category}记录
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  ) : null}
                </div>
              </div>

              <div>{renderCurrentModuleForm()}</div>

              <div>
                <LegacySectionHeader title="统计数量" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>合格数量</Label>
                    <Input
                      type="number"
                      value={form.actualQty}
                      onChange={e => setForm(p => ({ ...p, actualQty: e.target.value }))}
                      placeholder="0"
                      readOnly={autoDerivedActualQty}
                      className={autoDerivedActualQty ? "bg-slate-50 text-muted-foreground" : ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>剩余数量</Label>
                    <Input value={remainingQty} placeholder="0" readOnly className="bg-slate-50 text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>报废数量</Label>
                    <Input type="number" value={form.scrapQty} onChange={e => setForm(p => ({ ...p, scrapQty: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </div>

              <div>
                <LegacySectionHeader title="其他信息" />
                <div className="space-y-1.5">
                  <Label>备注</Label>
                  <Textarea className="min-h-[96px]" value={form.remark} onChange={e => setForm(p => ({ ...p, remark: e.target.value }))} placeholder="其他说明" rows={2} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 mt-2 border-t border-dashed bg-white/95 pt-4 backdrop-blur">
            <Button variant="outline" className="h-10 min-w-32 text-base" onClick={() => handleFormOpenChange(false)}>取消</Button>
            <Button className="h-10 min-w-32 text-base" onClick={handleSubmit} disabled={createMutation.isPending}>
              {editingRecord ? (updateMutation.isPending ? "保存中..." : "保存修改") : (createMutation.isPending ? "提交中..." : "创建记录")}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DraggableDialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>电子签名确认</DialogTitle>
            <DialogDescription>按 FDA 电子记录要求，请输入当前登录用户密码后再提交生产记录</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>当前用户</Label>
              <Input value={currentUserName} readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label>密码</Label>
              <Input
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="请输入当前用户密码"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePasswordConfirm();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>取消</Button>
            <Button onClick={handlePasswordConfirm} disabled={verifyPasswordMutation.isPending}>
              确认
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <EntityPickerDialog
        open={productionOrderPickerOpen}
        onOpenChange={setProductionOrderPickerOpen}
        title="选择生产指令"
        searchPlaceholder="搜索指令号、产品名称、批号..."
        columns={[
          {
            key: "orderNo",
            title: "生产指令号",
            render: (order: any) => <span className="font-mono font-medium">{order.orderNo || "-"}</span>,
          },
          {
            key: "productName",
            title: "产品名称",
            render: (order: any) => <span className="font-medium">{order.productName || "-"}</span>,
          },
          {
            key: "productSpec",
            title: "型号规格",
            render: (order: any) => <span>{order.productSpec || "-"}</span>,
          },
          {
            key: "productDescription",
            title: "描述",
            render: (order: any) => (
              <span className="block max-w-[220px] truncate" title={order.productDescription || ""}>
                {order.productDescription || "-"}
              </span>
            ),
          },
          {
            key: "batchNo",
            title: "生产批号",
            render: (order: any) => <span>{order.batchNo || "-"}</span>,
          },
          {
            key: "plannedQty",
            title: "数量",
            render: (order: any) => (
              <span>{[formatWholeNumber(order.plannedQty) || "0", order.unit].filter(Boolean).join(" ")}</span>
            ),
          },
          {
            key: "status",
            title: "状态",
            render: (order: any) => <span>{productionOrderStatusLabelMap[String(order.status || "")] || String(order.status || "-")}</span>,
          },
        ]}
        rows={productionOrderOptions}
        selectedId={selectedProductionOrder?.id ?? null}
        onSelect={(order: any) => {
          handleProductionOrderChange(String(order.id));
          setProductionOrderPickerOpen(false);
        }}
        filterFn={(order: any, q: string) => {
          const lower = q.toLowerCase();
          return [order.orderNo, order.productName, order.productSpec, order.productDescription, order.batchNo]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(lower));
        }}
        emptyText="暂无可选生产指令"
      />

      <EntityPickerDialog
        open={operatorPickerOpen}
        onOpenChange={setOperatorPickerOpen}
        title="选择操作员"
        searchPlaceholder="搜索工号、姓名、部门..."
        columns={[
          {
            key: "employeeNo",
            title: "工号",
            render: (person: ProductionOperatorOption) => <span className="font-mono font-medium">{person.employeeNo || "-"}</span>,
          },
          {
            key: "name",
            title: "姓名",
            render: (person: ProductionOperatorOption) => <span className="font-medium">{person.name || "-"}</span>,
          },
          {
            key: "department",
            title: "部门",
            render: (person: ProductionOperatorOption) => <span>{person.department || "-"}</span>,
          },
          {
            key: "position",
            title: "岗位",
            render: (person: ProductionOperatorOption) => <span>{person.position || "-"}</span>,
          },
        ]}
        rows={filteredOperatorRows}
        selectedId={selectedOperator?.id ?? null}
        onSelect={(person: ProductionOperatorOption) => {
          setForm((prev) => ({
            ...prev,
            operatorId: String(person.id),
            operator: person.name,
          }));
          setOperatorPickerOpen(false);
        }}
        filterFn={(person: ProductionOperatorOption, q: string) => {
          const lower = q.toLowerCase();
          return [person.employeeNo, person.name, person.department, person.position]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(lower));
        }}
        emptyText="当前部门暂无可选操作员"
      />

      <EntityPickerDialog
        open={moldPickerOpen}
        onOpenChange={setMoldPickerOpen}
        title="选择模具工装"
        searchPlaceholder="搜索模具工装..."
        columns={[
          {
            key: "code",
            title: "编号",
            render: (row: MoldToolingRecord) => <span className="font-mono font-medium">{row.code || "-"}</span>,
          },
          {
            key: "name",
            title: "名称",
            render: (row: MoldToolingRecord) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "model",
            title: "规格型号",
            render: (row: MoldToolingRecord) => <span>{row.model || "-"}</span>,
          },
          {
            key: "type",
            title: "类型",
            render: (row: MoldToolingRecord) => <span>{row.type === "tooling" ? "工装" : "模具"}</span>,
          },
          {
            key: "applicableProcess",
            title: "适用工序",
            render: (row: MoldToolingRecord) => <span>{row.applicableProcess || "-"}</span>,
          },
          ]}
          rows={moldRows}
          selectedIds={form.moldSelections}
          getRowId={(row: MoldToolingRecord) => row.name}
        onSelect={(row: MoldToolingRecord) => {
          toggleMoldSelection(row.name);
        }}
        onConfirm={() => setMoldPickerOpen(false)}
        confirmText="确认"
        filterFn={(row: MoldToolingRecord, q: string) => {
          const lower = q.toLowerCase();
          return [row.code, row.name, row.model, row.applicableProcess, row.applicableProduct]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="暂无模具工装数据"
        />

      <EntityPickerDialog
        open={equipmentPickerOpen}
        onOpenChange={setEquipmentPickerOpen}
        title="选择设备"
        searchPlaceholder="搜索设备..."
        columns={[
          {
            key: "code",
            title: "设备编号",
            render: (row: Equipment) => <span className="font-mono font-medium">{row.code || "-"}</span>,
          },
          {
            key: "name",
            title: "设备名称",
            render: (row: Equipment) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "model",
            title: "型号规格",
            render: (row: Equipment) => <span>{row.model || "-"}</span>,
          },
          {
            key: "location",
            title: "安装位置",
            render: (row: Equipment) => <span>{row.location || "-"}</span>,
          },
          ]}
          rows={equipmentRows}
          selectedIds={form.equipmentSelections}
          getRowId={(row: Equipment) => row.name}
        onSelect={(row: Equipment) => {
          toggleEquipmentSelection(row.name);
        }}
        onConfirm={() => setEquipmentPickerOpen(false)}
        confirmText="确认"
        filterFn={(row: Equipment, q: string) => {
          const lower = q.toLowerCase();
          return [row.code, row.name, row.model, row.location]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(lower));
        }}
        emptyText="暂无设备数据"
      />

      <EntityPickerDialog
        open={materialPickerOpen}
        onOpenChange={(open) => {
          setMaterialPickerOpen(open);
          if (!open) setActiveMaterialRowId("");
        }}
        title="选择暂存区物料批次"
        searchPlaceholder="搜索物料编码、名称、批次..."
        columns={[
          {
            key: "materialCode",
            title: "物料编码",
            render: (row: StagingInventoryOption) => <span className="font-mono font-medium">{row.materialCode || "-"}</span>,
          },
          {
            key: "materialName",
            title: "物料名称",
            render: (row: StagingInventoryOption) => <span className="font-medium">{row.materialName || "-"}</span>,
          },
          {
            key: "specification",
            title: "规格",
            render: (row: StagingInventoryOption) => <span>{row.specification || "-"}</span>,
          },
          {
            key: "batchNo",
            title: "批次",
            render: (row: StagingInventoryOption) => <span>{row.batchNo || "-"}</span>,
          },
          {
            key: "quantity",
            title: "暂存区余量",
            render: (row: StagingInventoryOption) => {
              if (!isMixingMaterialUsage) {
                return <span>{[row.quantity, row.unit].filter(Boolean).join(" ") || "-"}</span>;
              }
              return (
                <span>
                  {[formatQuantityByUnit(convertQuantityUnit(row.quantity, row.unit, "kg"), "kg"), "kg"].filter(Boolean).join(" ") || "-"}
                </span>
              );
            },
          },
          {
            key: "warehouseName",
            title: "仓库/库位",
            render: (row: StagingInventoryOption) => <span>{[row.warehouseName, row.location].filter(Boolean).join(" / ") || "-"}</span>,
          },
        ]}
        rows={selectableMaterialInventory}
        selectedId={activeMaterialRow?.inventoryId ?? null}
        getRowId={(row: StagingInventoryOption) => row.id}
        onSelect={(row: StagingInventoryOption) => {
          if (!activeMaterialRowId) return;
          applyInventoryToMaterialItem(activeMaterialRowId, row);
          setMaterialPickerOpen(false);
          setActiveMaterialRowId("");
        }}
        filterFn={(row: StagingInventoryOption, q: string) => {
          const lower = q.toLowerCase();
          return [row.materialCode, row.materialName, row.specification, row.batchNo, row.warehouseName, row.location]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(lower));
        }}
        emptyText="暂存区暂无可选物料批次"
      />

      {/* ── 详情弹窗 ── */}
      <DraggableDialog open={viewOpen} onOpenChange={setViewOpen}>
        <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
          {selected && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">生产记录详情</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <span className="font-mono">{selected.recordNo}</span>
                  <Badge variant="outline" className="text-xs">{getProductionRecordTypeLabel(selected)}</Badge>
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
                      <FieldRow label="记录时间">{[formatDateValue(selected.recordDate), selected.recordTime].filter(Boolean).join(" ") || "-"}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="车间名称">{selected.workshopName}</FieldRow>
                      <FieldRow label="生产班组">{selected.productionTeam}</FieldRow>
                      <FieldRow label="工序类别">{processTypeLabelMap[selected.processType || ""] || selected.processType}</FieldRow>
                      <FieldRow label="工序/工位">{selected.workstationName}</FieldRow>
                      <FieldRow label="操作人">{selected.operator}</FieldRow>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mt-1">
                    <FieldRow label="检验/审核人">{selected.inspector}</FieldRow>
                    <FieldRow label="数量">{formatQuantityByUnit(selected.plannedQty, selected.unit) || "-"}</FieldRow>
                    <FieldRow label="合格数量">{formatQuantityByUnit(selected.aggregatedActualQty || selected.actualQty, selected.unit) || "-"}</FieldRow>
                    <FieldRow label="报废数量">{formatQuantityByUnit(selected.aggregatedScrapQty || selected.scrapQty, selected.unit) || "-"}</FieldRow>
                    <FieldRow label="记录次数">{selected.recordCount || 1}</FieldRow>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <RecordSignaturePreview
                    title="操作人签名"
                    signerName={selected.operator}
                    signatureImageUrl={selectedDetailOperatorSignature?.signatureImageUrl}
                  />
                  <RecordSignaturePreview
                    title="检验/审核人签名"
                    signerName={selected.inspector}
                    signatureImageUrl={selectedDetailInspectorSignature?.signatureImageUrl}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">工序要求明细</h3>
                  {(() => {
                    const showSampleQty = selected.recordType === "first_piece";
                    return (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-muted/40 text-sm font-medium">
                      {selectedDetailCategory || "未选择分类"}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>项目名称</TableHead>
                          <TableHead>检验要求</TableHead>
                          {showSampleQty ? <TableHead>样品量</TableHead> : null}
                          <TableHead>数值录入</TableHead>
                          <TableHead>图片</TableHead>
                          <TableHead>结论</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDetailItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={showSampleQty ? 6 : 5} className="text-center py-6 text-muted-foreground">
                              暂无内容
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedDetailItems.map((item) => {
                            const isQuantitative = !showSampleQty || item.valueType === "quantitative";
                            return (
                            <TableRow key={item.id}>
                              <TableCell>{item.itemName || "-"}</TableCell>
                              <TableCell>
                                <div>{item.requirement || "-"}</div>
                                {item.unit ? <div className="text-xs text-muted-foreground">单位：{item.unit}</div> : null}
                              </TableCell>
                              {showSampleQty ? <TableCell>{isQuantitative ? (item.sampleQty || "1") : "-"}</TableCell> : null}
                              <TableCell>{isQuantitative ? (item.sampleValues?.filter(Boolean).join(" / ") || item.inputValue || "-") : "-"}</TableCell>
                              <TableCell>
                                {(item.images || []).length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {(item.images || []).map((image) => (
                                      <img key={image.id} src={image.dataUrl} alt={image.name} className="h-12 w-12 rounded border object-cover" />
                                    ))}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell>{detailConclusionLabelMap[item.conclusion || "pending"] || "待判定"}</TableCell>
                            </TableRow>
                          );
                        })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                    );
                  })()}
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
                    {selectedMaterialItems.length > 0 ? (
                      <div className="border rounded-sm overflow-x-auto">
                        <Table className="min-w-[980px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead>物料编码</TableHead>
                              <TableHead>物料名称</TableHead>
                              <TableHead>规格</TableHead>
                              <TableHead>批次</TableHead>
                              <TableHead>暂存区余量</TableHead>
                              <TableHead>计划领用</TableHead>
                              <TableHead>实际用量</TableHead>
                              <TableHead>单位</TableHead>
                              <TableHead>放置区域</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedMaterialItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-mono text-xs">{item.materialCode || "-"}</TableCell>
                                <TableCell>{item.materialName || "-"}</TableCell>
                                <TableCell>{item.materialSpec || "-"}</TableCell>
                                <TableCell>{item.batchNo || "-"}</TableCell>
                                <TableCell>{item.availableQty ? `${formatQuantityByUnit(item.availableQty, item.unit)} ${item.unit || ""}` : "-"}</TableCell>
                                <TableCell>{item.issuedQty ? `${formatQuantityByUnit(item.issuedQty, item.unit)} ${item.unit || ""}` : "-"}</TableCell>
                                <TableCell>{item.usedQty ? `${item.usedQty} ${item.unit || ""}` : "-"}</TableCell>
                                <TableCell>{item.unit || "-"}</TableCell>
                                <TableCell>{item.storageArea || item.warehouseName || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
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
                    )}
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
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (selected) {
                      handleEditRecord(selected);
                    }
                  }}
                >
                  编辑
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setViewOpen(false)}>关闭</Button>
              </div>
            </div>
          )}
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
