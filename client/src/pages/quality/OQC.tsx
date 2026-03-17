import { formatDateValue, formatDisplayNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PrintPreviewButton from "@/components/PrintPreviewButton";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import { SignatureStatusCard, SignatureRecord } from "@/components/ElectronicSignature";
import { PackageCheck, FileCheck, ShieldCheck, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, Link2, RefreshCw, ArrowLeft, Save, Paperclip } from "lucide-react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

interface InspectionItem {
  name: string;
  standard: string;
  sampleQty: number;
  result: string;
  conclusion: "qualified" | "unqualified" | "pending";
  children?: InspectionItemChild[];
  records?: InspectionItemRecord[];
}

interface InspectionItemChild {
  name: string;
  standard: string;
  remark: string;
}

interface InspectionItemRecordDetail {
  name: string;
  standard: string;
  sampleQty: number;
  sampleValues: string[];
  result: string;
  conclusion: "qualified" | "unqualified" | "pending";
  remark: string;
  attachments?: InspectionItemRecordDetailAttachment[];
}

interface InspectionItemRecordDetailAttachment {
  fileName: string;
  filePath: string;
  fileSize?: number;
  uploadedAt?: string;
}

interface InspectionItemRecord {
  id: string;
  sampleQty: number;
  result: string;
  conclusion: "qualified" | "unqualified" | "pending";
  inspector: string;
  inspectionTime: string;
  remark: string;
  details?: InspectionItemRecordDetail[];
}

interface ReleaseReviewItem {
  itemName: string;
  reviewStandard: string;
  decision: "qualified" | "unqualified";
}

interface ReleaseForm {
  releaseQty: string;
  reviewItems: ReleaseReviewItem[];
  decision: "approve" | "supplement" | "reject";
  remark: string;
}

interface OQCRecord {
  id: number;
  inspectionNo: string;
  productCode: string;
  productName: string;
  batchNo: string;
  sterilizationBatchNo?: string;
  quantity: string;
  unit: string;
  samplingQty: number;
  rejectQty: number;       // 检验报废数量
  sampleRetainQty: number; // 留样数量
  inspectionDate: string;
  result: "pending" | "inspecting" | "qualified" | "unqualified";
  inspector: string;
  remarks: string;
  inspectionItems: InspectionItem[];
  signatures?: SignatureRecord[];
  // 关联字段
  warehouseEntryId?: number;
  warehouseEntryNo?: string;
  productionOrderId?: number;
  productionOrderNo?: string;
  sterilizationOrderId?: number;
  sterilizationOrderNo?: string;
  sourceType?: "inspection" | "warehouse_entry";
  specialFormType?: "bioburden" | "sterility";
  bioburdenForm?: BioburdenForm;
  sterilityForm?: SterilityForm;
  releaseForm?: ReleaseForm;
}

interface BioburdenRow {
  itemName: string;
  plate1: string;
  plate2: string;
  average: string;
  conclusion: "qualified" | "unqualified";
}

interface BioburdenForm {
  entryMode: "online" | "paper";
  specModel: string;
  completionDate: string;
  inspectionStandard: string;
  mediumBatchNos: string[];
  paperReportName: string;
  paperReportPath: string;
  rows: BioburdenRow[];
}

interface SterilityRow {
  itemName: string;
  colony1: string;
  colony2: string;
  average: string;
  conclusion: "qualified" | "unqualified";
}

interface SterilityForm {
  endotoxinLimit: string;
  samplePreparation: string;
  inspectionBasis: string;
  paperReportName: string;
  paperReportPath: string;
  rows: SterilityRow[];
}

const NO_WAREHOUSE_ENTRY_VALUE = "__none_warehouse_entry__";
const NO_STERILIZATION_ORDER_VALUE = "__none__";
const BIOBURDEN_STANDARD_OPTIONS = [
  "初始污染菌检验标准一",
  "初始污染菌检验标准二",
  "企业内控标准",
];
const defaultBioburdenRowNames = ["阴性对照", "稀释10倍", "稀释100倍", "稀释1000倍"];
const defaultSterilityRowNames = ["供试品"];

const statusMap: Record<string, any> = {
  pending: { label: "待检", variant: "outline" as const, color: "text-gray-600" },
  inspecting: { label: "检验中", variant: "default" as const, color: "text-blue-600" },
  qualified: { label: "合格", variant: "secondary" as const, color: "text-green-600" },
  unqualified: { label: "不合格", variant: "destructive" as const, color: "text-red-600" },
};

const defaultInspectionItems: InspectionItem[] = [
  { name: "外观检查", standard: "", sampleQty: 1, result: "", conclusion: "pending", children: [], records: [] },
  { name: "尺寸测量", standard: "", sampleQty: 1, result: "", conclusion: "pending", children: [], records: [] },
  { name: "性能测试", standard: "", sampleQty: 1, result: "", conclusion: "pending", children: [], records: [] },
  { name: "无菌检测", standard: "", sampleQty: 1, result: "", conclusion: "pending", children: [], records: [] },
  { name: "包装检查", standard: "", sampleQty: 1, result: "", conclusion: "pending", children: [], records: [] },
];

const defaultReleaseReviewItems: ReleaseReviewItem[] = [
  { itemName: "进货检验", reviewStandard: "检验记录符合要求，检验结果符合要求", decision: "qualified" },
  { itemName: "过程检验", reviewStandard: "检验记录符合要求，检验结果符合要求", decision: "qualified" },
  { itemName: "成品检验", reviewStandard: "检验记录符合要求，检验结果符合要求", decision: "qualified" },
  { itemName: "工艺流程", reviewStandard: "所有工艺流程按工艺要求完成", decision: "qualified" },
  { itemName: "批记录", reviewStandard: "批记录应完整，内容准确无误，符合要求", decision: "qualified" },
  { itemName: "过程监控", reviewStandard: "检验记录符合要求，检验结果符合要求", decision: "qualified" },
  { itemName: "不合格品控制", reviewStandard: "按规定要求处理并有记录", decision: "qualified" },
  { itemName: "包装检查", reviewStandard: "产品说明书、标签及其版本符合规定要求，包装符合要求", decision: "qualified" },
];

function newInspectionItem(): InspectionItem {
  return { name: "", standard: "", sampleQty: 1, result: "", conclusion: "pending", children: [], records: [] };
}

function createDefaultReleaseReviewItems(): ReleaseReviewItem[] {
  return defaultReleaseReviewItems.map((item) => ({ ...item }));
}

function createItemRecordId() {
  return `oqc-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDisplayQty(value: unknown, digits = 4) {
  if (value == null || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return formatDisplayNumber(num, { maximumFractionDigits: Math.min(digits, 2) });
}

function currentDateTimeLocal() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function currentDateValue() {
  return new Date().toISOString().split("T")[0];
}

function createBioburdenRow(itemName = ""): BioburdenRow {
  return {
    itemName,
    plate1: "",
    plate2: "",
    average: "",
    conclusion: "qualified",
  };
}

function createSterilityRow(itemName = ""): SterilityRow {
  return {
    itemName,
    colony1: "",
    colony2: "",
    average: "",
    conclusion: "qualified",
  };
}

function calcBioburdenAverage(plate1: string, plate2: string) {
  const values = [plate1, plate2]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return "";
  return formatDisplayQty(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function normalizeBioburdenRows(rows: any[]): BioburdenRow[] {
  const normalized = (rows || []).map((row: any, index: number) => {
    const plate1 = String(row?.plate1 || "");
    const plate2 = String(row?.plate2 || "");
    return {
      itemName: String(row?.itemName || defaultBioburdenRowNames[index] || `检测项${index + 1}`),
      plate1,
      plate2,
      average: String(row?.average || calcBioburdenAverage(plate1, plate2)),
      conclusion: (row?.conclusion || "qualified") as BioburdenRow["conclusion"],
    };
  });
  return normalized.length ? normalized : defaultBioburdenRowNames.map((name) => createBioburdenRow(name));
}

function normalizeSterilityRows(rows: any[]): SterilityRow[] {
  const normalized = (rows || []).map((row: any, index: number) => {
    const colony1 = String(row?.colony1 || row?.plate1 || "");
    const colony2 = String(row?.colony2 || row?.plate2 || "");
    return {
      itemName: String(row?.itemName || defaultSterilityRowNames[index] || `检验项${index + 1}`),
      colony1,
      colony2,
      average: String(row?.average || calcBioburdenAverage(colony1, colony2)),
      conclusion: (row?.conclusion || "qualified") as SterilityRow["conclusion"],
    };
  });
  return normalized.length ? normalized : defaultSterilityRowNames.map((name) => createSterilityRow(name));
}

function normalizeBioburdenForm(value: any): BioburdenForm {
  return {
    entryMode: value?.entryMode === "paper" ? "paper" : "online",
    specModel: String(value?.specModel || ""),
    completionDate: String(value?.completionDate || currentDateValue()),
    inspectionStandard: String(value?.inspectionStandard || BIOBURDEN_STANDARD_OPTIONS[0]),
    mediumBatchNos: Array.from({ length: 3 }, (_, index) => String(value?.mediumBatchNos?.[index] || "")),
    paperReportName: String(value?.paperReportName || ""),
    paperReportPath: String(value?.paperReportPath || ""),
    rows: normalizeBioburdenRows(value?.rows || []),
  };
}

function normalizeSterilityForm(value: any): SterilityForm {
  return {
    endotoxinLimit: String(value?.endotoxinLimit || ""),
    samplePreparation: String(value?.samplePreparation || ""),
    inspectionBasis: String(value?.inspectionBasis || ""),
    paperReportName: String(value?.paperReportName || ""),
    paperReportPath: String(value?.paperReportPath || ""),
    rows: normalizeSterilityRows(value?.rows || []),
  };
}

function normalizeReleaseForm(value: any, quantity: unknown): ReleaseForm {
  const normalizedItems = createDefaultReleaseReviewItems().map((item, index) => ({
    itemName: String(value?.reviewItems?.[index]?.itemName || item.itemName),
    reviewStandard: String(value?.reviewItems?.[index]?.reviewStandard || item.reviewStandard),
    decision: (value?.reviewItems?.[index]?.decision || item.decision) as ReleaseReviewItem["decision"],
  }));
  return {
    releaseQty: String(value?.releaseQty || quantity || ""),
    reviewItems: normalizedItems,
    decision: (value?.decision || "approve") as ReleaseForm["decision"],
    remark: String(value?.remark || ""),
  };
}

function buildBioburdenInspectionItems(rows: BioburdenRow[]): InspectionItem[] {
  return rows.map((row) => ({
    name: `初始污染菌-${row.itemName}`,
    standard: "初始污染菌检测",
    sampleQty: 2,
    result: `皿1:${row.plate1 || "-"} / 皿2:${row.plate2 || "-"} / 均值:${row.average || "-"}`,
    conclusion: row.conclusion,
    children: [],
    records: [],
  }));
}

function buildSterilityInspectionItems(rows: SterilityRow[]): InspectionItem[] {
  return rows.map((row) => ({
    name: `无菌检验-${row.itemName}`,
    standard: "无菌检验记录",
    sampleQty: 2,
    result: `菌1:${row.colony1 || "-"} / 菌2:${row.colony2 || "-"} / 均值:${row.average || "-"}`,
    conclusion: row.conclusion,
    children: [],
    records: [],
  }));
}

function getReleaseDecisionLabel(decision: ReleaseForm["decision"]) {
  if (decision === "approve") return "同意放行";
  if (decision === "supplement") return "补充资料后放行";
  return "不同意放行";
}

function getReleaseDecisionStatus(decision: ReleaseForm["decision"]): OQCRecord["result"] {
  if (decision === "approve") return "qualified";
  if (decision === "reject") return "unqualified";
  return "inspecting";
}

function getReleaseNo(inspectionNo: string) {
  if (!inspectionNo) return "自动生成";
  return inspectionNo.replace(/^OQC-/, "FX-");
}

function normalizeInspectionItemChildren(children: any[]): InspectionItemChild[] {
  return (children || []).map((child: any) => ({
    name: String(child?.name || child?.detailName || ""),
    standard: String(child?.standard || child?.detailStandard || ""),
    remark: String(child?.remark || ""),
  }));
}

function normalizeInspectionItemRecordDetails(details: any[], fallbackSampleQty = 1): InspectionItemRecordDetail[] {
  return (details || []).map((detail: any) => ({
    name: String(detail?.name || ""),
    standard: String(detail?.standard || ""),
    sampleQty: Number(detail?.sampleQty || fallbackSampleQty || 1),
    sampleValues: Array.from(
      { length: Math.max(1, Number(detail?.sampleQty || fallbackSampleQty || 1)) },
      (_, index) => String(detail?.sampleValues?.[index] || (index === 0 ? detail?.result || "" : ""))
    ),
    result: String(detail?.result || ""),
    conclusion: (detail?.conclusion || "pending") as InspectionItemRecordDetail["conclusion"],
    remark: String(detail?.remark || ""),
    attachments: Array.isArray(detail?.attachments)
      ? detail.attachments.map((file: any) => ({
          fileName: String(file?.fileName || ""),
          filePath: String(file?.filePath || ""),
          fileSize: file?.fileSize ? Number(file.fileSize) : undefined,
          uploadedAt: file?.uploadedAt ? String(file.uploadedAt) : undefined,
        }))
      : [],
  }));
}

function buildItemRecordDetails(item: InspectionItem, latestRecord?: InspectionItemRecord): InspectionItemRecordDetail[] {
  if (latestRecord?.details?.length) {
    return normalizeInspectionItemRecordDetails(latestRecord.details, item.sampleQty || 1);
  }
  if (item.children?.length) {
    return item.children.map((child) => ({
      name: child.name || item.name,
      standard: child.standard || item.standard,
      sampleQty: Number(item.sampleQty || 1),
      sampleValues: Array.from({ length: Math.max(1, Number(item.sampleQty || 1)) }, () => ""),
      result: "",
      conclusion: "pending" as const,
      remark: child.remark || "",
      attachments: [],
    }));
  }
  return [{
    name: item.name || "检验项目",
    standard: item.standard || "",
    sampleQty: Number(item.sampleQty || 1),
    sampleValues: Array.from({ length: Math.max(1, Number(item.sampleQty || 1)) }, () => ""),
    result: "",
    conclusion: latestRecord?.conclusion || "pending",
    remark: "",
    attachments: [],
  }];
}

function calcDetailConclusion(details: InspectionItemRecordDetail[]): InspectionItemRecord["conclusion"] {
  if (!details.length) return "pending";
  if (details.some((detail) => detail.conclusion === "unqualified")) return "unqualified";
  if (details.every((detail) => detail.conclusion === "qualified")) return "qualified";
  return "pending";
}

function calcDetailResultText(details: InspectionItemRecordDetail[]) {
  return details
    .map((detail) => {
      const sampleValueText = (detail.sampleValues || []).filter(Boolean).join(" / ");
      const suffix = sampleValueText || detail.result || (detail.conclusion === "qualified" ? "合格" : detail.conclusion === "unqualified" ? "不合格" : "检验中");
      return `${detail.name || "明细"}:${suffix}`;
    })
    .join("；");
}

function calcDetailSampleQty(details: InspectionItemRecordDetail[]) {
  const total = details.reduce((sum, detail) => sum + Number(detail.sampleQty || 0), 0);
  return total > 0 ? total : 1;
}

function getConclusionLabel(conclusion: "qualified" | "unqualified" | "pending") {
  return conclusion === "qualified" ? "合格" : conclusion === "unqualified" ? "不合格" : "检验中";
}

function resizeSampleValues(values: string[] | undefined, sampleQty: number) {
  return Array.from({ length: Math.max(1, sampleQty) }, (_, index) => String(values?.[index] || ""));
}

function sanitizeFileNamePart(value: unknown) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

function parseRequirementItemRemark(remark: unknown) {
  const text = String(remark || "").trim();
  if (!text) return { note: "", children: [] as InspectionItemChild[] };
  if (!text.startsWith("{")) {
    return { note: text, children: [] as InspectionItemChild[] };
  }
  try {
    const parsed = JSON.parse(text);
    return {
      note: String(parsed?.note || parsed?.remark || ""),
      children: normalizeInspectionItemChildren(parsed?.children || parsed?.details || []),
    };
  } catch {
    return { note: text, children: [] as InspectionItemChild[] };
  }
}

function normalizeInspectionItems(items: any[]): InspectionItem[] {
  return (items || []).map((item: any) => {
    const records = Array.isArray(item?.records)
      ? item.records.map((record: any) => ({
          id: String(record?.id || createItemRecordId()),
          sampleQty: Number(record?.sampleQty || 1),
          result: String(record?.result || ""),
          conclusion: (record?.conclusion || "pending") as InspectionItemRecord["conclusion"],
          inspector: String(record?.inspector || ""),
          inspectionTime: String(record?.inspectionTime || ""),
          remark: String(record?.remark || ""),
          details: normalizeInspectionItemRecordDetails(record?.details || [], Number(record?.sampleQty || item?.sampleQty || 1)),
        }))
      : [];
    const latestRecord = records[records.length - 1];
    return {
      name: String(item?.name || ""),
      standard: String(item?.standard || ""),
      sampleQty: Number(item?.sampleQty || latestRecord?.sampleQty || 1),
      result: String(item?.result || latestRecord?.result || ""),
      conclusion: (item?.conclusion || latestRecord?.conclusion || "pending") as InspectionItem["conclusion"],
      children: normalizeInspectionItemChildren(item?.children || []),
      records,
    };
  });
}

function calcOqcSummaryResult(items: InspectionItem[]): OQCRecord["result"] {
  if (!items.length) return "pending";
  if (items.some((item) => item.conclusion === "unqualified")) return "unqualified";
  if (items.every((item) => item.records && item.records.length > 0 && item.conclusion === "qualified")) return "qualified";
  if (items.some((item) => (item.records?.length || 0) > 0 || item.conclusion !== "pending")) return "inspecting";
  return "pending";
}

function getInspectionItemStatus(item: InspectionItem) {
  if (item.conclusion === "qualified") {
    return { label: "合格", className: "text-green-600 border-green-300" };
  }
  if (item.conclusion === "unqualified") {
    return { label: "不合格", className: "text-red-600 border-red-300" };
  }
  if ((item.records?.length || 0) > 0) {
    return { label: "检验中", className: "text-blue-600 border-blue-300" };
  }
  return { label: "待检", className: "text-gray-600 border-gray-300" };
}

function getInspectionItemChildrenSummary(children?: InspectionItemChild[]) {
  if (!children || children.length === 0) return "";
  const names = children.map((child) => child.name).filter(Boolean);
  if (names.length === 0) return `${children.length} 项二级明细`;
  return `二级明细 ${children.length} 项：${names.join("、")}`;
}

function recordMatchesInspectionKeywords(record: OQCRecord, keywords: string[]) {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
  const texts = [
    record.productName,
    record.productCode,
    record.batchNo,
    record.sterilizationBatchNo,
    ...record.inspectionItems.flatMap((item) => [
      item.name,
      item.standard,
      ...(item.children || []).flatMap((child) => [child.name, child.standard, child.remark]),
      ...(item.records || []).flatMap((recordItem) => [
        recordItem.result,
        recordItem.remark,
        ...(recordItem.details || []).flatMap((detail) => [detail.name, detail.standard, detail.result, detail.remark]),
      ]),
    ]),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return normalizedKeywords.some((keyword) => texts.some((text) => text.includes(keyword)));
}

function getValidSignatureCount(record: OQCRecord) {
  return record.signatures?.filter((signature: any) => signature.status === "valid").length || 0;
}

function hasAnyInspectionRecord(record: OQCRecord) {
  return record.inspectionItems.some((item) => (item.records?.length || 0) > 0);
}

function getTabScopedStatus(record: OQCRecord, tab: string): OQCRecord["result"] {
  if (tab === "report") return record.result;

  if (tab === "record") {
    if (record.inspectionItems.some((item) => item.conclusion === "unqualified")) return "unqualified";
    if (record.inspectionItems.length > 0 && record.inspectionItems.every((item) => item.conclusion === "qualified")) return "qualified";
    if (hasAnyInspectionRecord(record)) return "inspecting";
    return "pending";
  }

  if (tab === "bioburden") {
    if (record.specialFormType === "bioburden") {
      return record.result;
    }
    const matchedItems = record.inspectionItems.filter((item) =>
      recordMatchesInspectionKeywords(
        { ...record, inspectionItems: [item] },
        ["初始污染菌", "污染菌", "bioburden"]
      )
    );
    if (matchedItems.some((item) => item.conclusion === "unqualified")) return "unqualified";
    if (matchedItems.length > 0 && matchedItems.every((item) => item.conclusion === "qualified")) return "qualified";
    if (matchedItems.some((item) => (item.records?.length || 0) > 0)) return "inspecting";
    return "pending";
  }

  if (tab === "sterility") {
    if (record.specialFormType === "sterility") {
      return record.result;
    }
    const matchedItems = record.inspectionItems.filter((item) =>
      recordMatchesInspectionKeywords(
        { ...record, inspectionItems: [item] },
        ["无菌", "sterile", "sterility"]
      )
    );
    if (matchedItems.some((item) => item.conclusion === "unqualified")) return "unqualified";
    if (matchedItems.length > 0 && matchedItems.every((item) => item.conclusion === "qualified")) return "qualified";
    if (matchedItems.some((item) => (item.records?.length || 0) > 0)) return "inspecting";
    return "pending";
  }

  if (tab === "release") {
    const releaseDecision = record.releaseForm?.decision;
    if (releaseDecision === "reject") return "unqualified";
    if (releaseDecision === "supplement") return "inspecting";
    if (releaseDecision === "approve" && getValidSignatureCount(record) >= 2) return "qualified";
    if (releaseDecision === "approve") return "inspecting";
    return "pending";
  }

  if (record.result === "unqualified") return "unqualified";
  if (record.result === "qualified" || getValidSignatureCount(record) >= 2) return "qualified";
  if (getValidSignatureCount(record) > 0 || hasAnyInspectionRecord(record)) return "inspecting";
  return "pending";
}

function getTabScopedStatusMeta(record: OQCRecord, tab: string) {
  const scopedStatus = getTabScopedStatus(record, tab);
  if (tab === "release") {
    const releaseLabelMap: Record<OQCRecord["result"], string> = {
      pending: "待放行",
      inspecting: "放行中",
      qualified: "已放行",
      unqualified: "不放行",
    };
    return {
      value: scopedStatus,
      label: releaseLabelMap[scopedStatus],
      variant: statusMap[scopedStatus]?.variant || "outline",
      className: getStatusSemanticClass(scopedStatus, releaseLabelMap[scopedStatus]),
    };
  }
  return {
    value: scopedStatus,
    label: statusMap[scopedStatus]?.label || scopedStatus,
    variant: statusMap[scopedStatus]?.variant || "outline",
    className: getStatusSemanticClass(scopedStatus, statusMap[scopedStatus]?.label),
  };
}

// 将数据库记录转换为前端显示格式
function dbToDisplay(record: any): OQCRecord {
  let extra: any = {};
  try {
    if (record.remark && record.remark.startsWith("{")) {
      extra = JSON.parse(record.remark);
    }
  } catch {}
  const inspectionItems = normalizeInspectionItems(extra.inspectionItems || []);
  const specialFormType =
    extra.specialFormType === "bioburden"
      ? "bioburden"
      : extra.specialFormType === "sterility"
        ? "sterility"
        : undefined;
  const bioburdenForm = specialFormType === "bioburden" ? normalizeBioburdenForm(extra.bioburdenForm || {}) : undefined;
  const sterilityForm = specialFormType === "sterility" ? normalizeSterilityForm(extra.sterilityForm || {}) : undefined;
  const releaseForm = normalizeReleaseForm(extra.releaseForm || {}, extra.quantity || record.inspectedQty || "");
  return {
    id: record.id,
    inspectionNo: record.inspectionNo,
    productCode: extra.productCode || record.relatedDocNo || "",
    productName: record.itemName || "",
    batchNo: record.batchNo || "",
    sterilizationBatchNo: extra.sterilizationBatchNo || "",
    quantity: String(extra.quantity || record.inspectedQty || ""),
    unit: extra.unit || "支",
    samplingQty: extra.samplingQty || 0,
    rejectQty: extra.rejectQty || 0,
    sampleRetainQty: extra.sampleRetainQty || 0,
    inspectionDate: record.inspectionDate ? String(record.inspectionDate).split("T")[0] : "",
    result: (extra.result || record.result || "pending") as OQCRecord["result"],
    inspector: extra.inspector || "",
    remarks: extra.remarks || "",
    inspectionItems,
    signatures: extra.signatures || [],
    warehouseEntryId: extra.warehouseEntryId ? Number(extra.warehouseEntryId) : undefined,
    warehouseEntryNo: extra.warehouseEntryNo || "",
    productionOrderId: record.productionOrderId || undefined,
    productionOrderNo: record.productionOrderNo || "",
    sterilizationOrderId: record.sterilizationOrderId || undefined,
    sterilizationOrderNo: record.sterilizationOrderNo || "",
    sourceType: "inspection",
    specialFormType,
    bioburdenForm,
    sterilityForm,
    releaseForm,
  };
}

// FieldRow 组件
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start py-1.5 gap-2">
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{children}</span>
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

function buildRequirementInspectionItems(items: any[]): InspectionItem[] {
  return items.map((item: any) => {
    const parsedRemark = parseRequirementItemRemark(item?.remark);
    return {
      name: String(item.itemName || item.standard || item.standardRequirement || ""),
      standard: String(item.inspectionRequirement || item.standardBasis || item.standard || item.standardRequirement || ""),
      sampleQty: Number(item?.sampleQty || item?.samplingQty || 1),
      result: "",
      conclusion: "pending" as const,
      children: parsedRemark.children,
      records: [],
    };
  });
}

export default function OQCPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const formPrintRef = useRef<HTMLDivElement>(null);
  const detailPrintRef = useRef<HTMLDivElement>(null);
  const autoOpenedWarehouseEntryIdRef = useRef<number | null>(null);
  const { data: personnelData = [] } = trpc.personnel.list.useQuery(
    { status: "active", limit: 500 },
    { refetchOnWindowFocus: false }
  );
  const { data: requirementList = [] } = trpc.inspectionRequirements.list.useQuery(
    { type: "OQC", status: "active", limit: 200 },
    { refetchOnWindowFocus: false }
  );
  const { data: _dbData = [], isLoading, refetch } = trpc.qualityInspections.list.useQuery({ type: "OQC" });
  const { data: productionWarehouseEntriesData = [], refetch: refetchWarehouseEntries } = trpc.productionWarehouseEntries.list.useQuery(
    {},
    { refetchOnWindowFocus: false }
  );
  const { data: sterilizationOrdersData = [] } = trpc.sterilizationOrders.list.useQuery(
    { status: "arrived" },
    { refetchOnWindowFocus: false }
  );
  const { data: productsData = [] } = trpc.products.list.useQuery(
    {},
    { refetchOnWindowFocus: false }
  );
  const currentUserName = String((user as any)?.name || "").trim();
  const createMutation = trpc.qualityInspections.create.useMutation({
    onSuccess: () => {
      refetch();
      if (formData.specialFormType === "bioburden") {
        toast.success("初始污染菌检测记录已创建");
        setFormDialogOpen(false);
        return;
      }
      if (formData.specialFormType === "sterility") {
        toast.success("无菌检验记录已创建");
        setFormDialogOpen(false);
        return;
      }
      const result = formData.result;
      const batchNo = formData.batchNo;
      if (result === "qualified" && batchNo) {
        toast.success("OQC 检验合格", {
          description: `生产批号 ${batchNo} 检验通过，已自动更新对应入库申请的报废数量、留样数量，并推进至「待审批」状态`,
          duration: 6000,
        });
      } else if (result === "unqualified" && batchNo) {
        toast.warning("OQC 检验不合格", {
          description: `生产批号 ${batchNo} 检验不合格，已记录报废数量，请联系生产部处理`,
          duration: 6000,
        });
      } else {
        toast.success("检验记录已创建");
      }
      setFormDialogOpen(false);
    },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.qualityInspections.update.useMutation({
    onSuccess: () => {
      refetch();
      if (formData.specialFormType === "bioburden") {
        toast.success("初始污染菌检测记录已更新");
        setFormDialogOpen(false);
        return;
      }
      if (formData.specialFormType === "sterility") {
        toast.success("无菌检验记录已更新");
        setFormDialogOpen(false);
        return;
      }
      const result = formData.result;
      const batchNo = formData.batchNo;
      if ((result === "qualified" || result === "unqualified") && batchNo) {
        toast.success("检验记录已更新", {
          description: `生产批号 ${batchNo} 的入库申请数量已同步更新`,
          duration: 5000,
        });
      } else {
        toast.success("检验记录已更新");
      }
      setFormDialogOpen(false);
    },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.qualityInspections.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("检验记录已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });
  const inspectionData: OQCRecord[] = (_dbData as any[]).map(dbToDisplay);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OQCRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<OQCRecord | null>(null);
  const [activeTab, setActiveTab] = useState("items");
  const [listTab, setListTab] = useState("report");
  const [matchedRequirementId, setMatchedRequirementId] = useState<number | null>(null);
  const [lastAppliedRequirementId, setLastAppliedRequirementId] = useState<number | null>(null);
  const [itemRecordDialogOpen, setItemRecordDialogOpen] = useState(false);
  const [itemRecordDialogMaximized, setItemRecordDialogMaximized] = useState(true);
  const [sterilitySourcePickerOpen, setSterilitySourcePickerOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const { canDelete } = usePermission();
  const { data: matchedRequirementDetail } = trpc.inspectionRequirements.getById.useQuery(
    { id: matchedRequirementId! },
    { enabled: !!matchedRequirementId && formDialogOpen && !isEditing }
  );

  const [formData, setFormData] = useState({
    warehouseEntryId: "" as string,
    warehouseEntryNo: "",
    productCode: "",
    productName: "",
    batchNo: "",
    sterilizationBatchNo: "",
    quantity: "",
    unit: "支",
    samplingQty: 0,
    rejectQty: 0,
    sampleRetainQty: 0,
    inspectionDate: "",
    result: "pending" as OQCRecord["result"],
    inspector: currentUserName,
    remarks: "",
    inspectionItems: normalizeInspectionItems(defaultInspectionItems),
    productionOrderId: "" as string,
    productionOrderNo: "",
    sterilizationOrderId: "" as string,
    sterilizationOrderNo: "",
    specialFormType: undefined as OQCRecord["specialFormType"],
    bioburdenForm: normalizeBioburdenForm({}),
    sterilityForm: normalizeSterilityForm({}),
    releaseForm: normalizeReleaseForm({}, ""),
  });
  const [itemRecordForm, setItemRecordForm] = useState({
    sampleQty: 1,
    result: "",
    conclusion: "pending" as InspectionItemRecord["conclusion"],
    inspector: currentUserName,
    inspectionTime: currentDateTimeLocal(),
    remark: "",
    details: [] as InspectionItemRecordDetail[],
  });
  const detailAttachmentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const productMetaByCode = useMemo(
    () => new Map(
      (productsData as any[])
        .filter((item: any) => item?.code)
        .map((item: any) => [String(item.code).trim(), item])
    ),
    [productsData]
  );
  const productMetaByName = useMemo(
    () => new Map(
      (productsData as any[])
        .filter((item: any) => item?.name)
        .map((item: any) => [String(item.name).trim(), item])
    ),
    [productsData]
  );

  const getProductMeta = (productCode: string, productName: string) =>
    productMetaByCode.get(String(productCode || "").trim()) ||
    productMetaByName.get(String(productName || "").trim()) ||
    null;
  const bioburdenPaperInputRef = useRef<HTMLInputElement | null>(null);
  const sterilityPaperInputRef = useRef<HTMLInputElement | null>(null);

  const inspectorOptions = useMemo(() => {
    const names = [
      currentUserName,
      ...(personnelData as any[]).map((item: any) => String(item?.name || "").trim()),
    ].filter(Boolean);
    return Array.from(new Set(names));
  }, [currentUserName, personnelData]);
  const personnelSignatureByName = useMemo(
    () =>
      new Map(
        ((personnelData as any[]) || [])
          .filter((item: any) => String(item?.signatureImageUrl || ""))
          .map((item: any) => [String(item?.name || "").trim(), String(item?.signatureImageUrl || "")] as const)
      ),
    [personnelData]
  );
  const selectedProductMeta = selectedRecord ? getProductMeta(selectedRecord.productCode, selectedRecord.productName) : null;
  const formProductMeta = getProductMeta(formData.productCode, formData.productName);
  const selectedInspectorSignatureUrl = useMemo(
    () => personnelSignatureByName.get(String(selectedRecord?.inspector || "").trim()) || "",
    [personnelSignatureByName, selectedRecord?.inspector]
  );

  useEffect(() => {
    if (itemRecordDialogOpen) {
      setItemRecordDialogMaximized(true);
    }
  }, [itemRecordDialogOpen]);

  const findMatchedRequirement = (productCode: string, productName: string) => {
    const normalizedCode = String(productCode || "").trim();
    const normalizedName = String(productName || "").trim();
    return (requirementList as any[]).find(
      (item: any) => normalizedCode && String(item?.productCode || "").trim() === normalizedCode
    ) ?? (requirementList as any[]).find((item: any) => {
      const reqName = String(item?.productName || "").trim();
      if (!reqName || !normalizedName) return false;
      return reqName === normalizedName || normalizedName.includes(reqName) || reqName.includes(normalizedName);
    }) ?? null;
  };

  const productCodeMap = new Map(
    (productsData as any[]).map((item: any) => [String(item.id), String(item.code || "")])
  );
  const inspectedBatchSet = new Set(
    inspectionData
      .map((record) => String(record.batchNo || "").trim())
      .filter(Boolean)
  );
  const warehouseTodoData: OQCRecord[] = (productionWarehouseEntriesData as any[])
    .filter((entry: any) => {
      const batchNo = String(entry.batchNo || "").trim();
      if (!batchNo || entry.status === "rejected") return false;
      return !inspectedBatchSet.has(batchNo);
    })
    .map((entry: any) => ({
      id: -Number(entry.id),
      inspectionNo: "",
      productCode: productCodeMap.get(String(entry.productId || "")) || "",
      productName: entry.productName || "",
      batchNo: entry.batchNo || "",
      sterilizationBatchNo: entry.sterilizationBatchNo || "",
      quantity: String(entry.quantity || ""),
      unit: entry.unit || "支",
      samplingQty: 0,
      rejectQty: Number(entry.inspectionRejectQty || 0),
      sampleRetainQty: Number(entry.sampleQty || 0),
      inspectionDate: "",
      result: "pending",
      inspector: "",
      remarks: entry.remark || "",
      inspectionItems: normalizeInspectionItems(defaultInspectionItems),
      warehouseEntryId: Number(entry.id),
      warehouseEntryNo: entry.entryNo || "",
      productionOrderId: entry.productionOrderId || undefined,
      productionOrderNo: entry.productionOrderNo || "",
      sterilizationOrderId: entry.sterilizationOrderId || undefined,
      sterilizationOrderNo: entry.sterilizationOrderNo || "",
      sourceType: "warehouse_entry",
    }));
  const data: OQCRecord[] = [...warehouseTodoData, ...inspectionData];
  const currentListData =
    listTab === "report"
      ? data
      : listTab === "record"
        ? inspectionData
        : listTab === "bioburden"
          ? inspectionData.filter((record) => record.specialFormType === "bioburden" || recordMatchesInspectionKeywords(record, ["初始污染菌", "污染菌", "bioburden"]))
        : listTab === "sterility"
            ? inspectionData.filter((record) => record.specialFormType === "sterility" || recordMatchesInspectionKeywords(record, ["无菌", "sterile", "sterility"]))
            : inspectionData;

  const filteredData = currentListData.filter((record: any) => {
    const matchesSearch =
      String(record.inspectionNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.warehouseEntryNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.bioburdenForm?.specModel ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      getTabScopedStatus(record, listTab) === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, listTab, currentListData.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const query = location.includes("?") ? location.slice(location.indexOf("?")) : "";
    const warehouseEntryId = Number(new URLSearchParams(query).get("warehouseEntryId") || 0);
    if (!warehouseEntryId) {
      autoOpenedWarehouseEntryIdRef.current = null;
      return;
    }
    if (autoOpenedWarehouseEntryIdRef.current === warehouseEntryId) return;
    const matchedRecord = warehouseTodoData.find((record) => Number(record.warehouseEntryId) === warehouseEntryId);
    if (!matchedRecord) return;
    autoOpenedWarehouseEntryIdRef.current = warehouseEntryId;
    handleCreateFromWarehouseEntry(matchedRecord);
  }, [location, warehouseTodoData]);

  useEffect(() => {
    if (!formDialogOpen || isEditing) return;
    if (formData.inspector || !currentUserName) return;
    setFormData((prev) => ({ ...prev, inspector: currentUserName }));
  }, [currentUserName, formData.inspector, formDialogOpen, isEditing]);

  useEffect(() => {
    if (!formDialogOpen || isEditing) return;
    if (formData.specialFormType === "bioburden" || formData.specialFormType === "sterility") return;
    const matched = findMatchedRequirement(formData.productCode, formData.productName);
    if (!matched) {
      setMatchedRequirementId(null);
      return;
    }
    if (Number(matched.id) !== matchedRequirementId) {
      setMatchedRequirementId(Number(matched.id));
    }
  }, [formDialogOpen, formData.productCode, formData.productName, isEditing, matchedRequirementId, requirementList]);

  useEffect(() => {
    if (!formDialogOpen || isEditing) return;
    if (formData.specialFormType === "bioburden" || formData.specialFormType === "sterility") return;
    if (!matchedRequirementId || !matchedRequirementDetail) return;
    if (matchedRequirementId === lastAppliedRequirementId) return;
    const reqItems = Array.isArray((matchedRequirementDetail as any)?.items)
      ? (matchedRequirementDetail as any).items
      : [];
    if (reqItems.length === 0) return;
    setLastAppliedRequirementId(matchedRequirementId);
    setFormData((prev) => ({
      ...prev,
      inspectionItems: buildRequirementInspectionItems(reqItems),
      result: calcOqcSummaryResult(buildRequirementInspectionItems(reqItems)),
    }));
  }, [formDialogOpen, isEditing, lastAppliedRequirementId, matchedRequirementDetail, matchedRequirementId]);

  const handleAdd = () => {
    const isBioburdenTab = listTab === "bioburden";
    const isSterilityTab = listTab === "sterility";
    const bioburdenForm = normalizeBioburdenForm({});
    const sterilityForm = normalizeSterilityForm({});
    setIsEditing(false);
    setSelectedRecord(null);
    setActiveTab(listTab === "release" ? "release" : "items");
    setMatchedRequirementId(null);
    setLastAppliedRequirementId(null);
    setFormData({
      warehouseEntryId: "",
      warehouseEntryNo: "",
      productCode: "",
      productName: "",
      batchNo: "",
      sterilizationBatchNo: "",
      quantity: "",
      unit: "支",
      samplingQty: 0,
      rejectQty: 0,
      sampleRetainQty: 0,
      inspectionDate: new Date().toISOString().split("T")[0],
      result: "pending",
      inspector: currentUserName,
      remarks: "",
      inspectionItems: isBioburdenTab
        ? buildBioburdenInspectionItems(bioburdenForm.rows)
        : isSterilityTab
          ? buildSterilityInspectionItems(sterilityForm.rows)
        : normalizeInspectionItems(defaultInspectionItems),
      productionOrderId: "",
      productionOrderNo: "",
      sterilizationOrderId: "",
      sterilizationOrderNo: "",
      specialFormType: isBioburdenTab ? "bioburden" : isSterilityTab ? "sterility" : undefined,
      bioburdenForm,
      sterilityForm,
      releaseForm: normalizeReleaseForm({}, ""),
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: OQCRecord) => {
    setIsEditing(true);
    setSelectedRecord(record);
    setActiveTab(listTab === "release" ? "release" : "items");
    setMatchedRequirementId(null);
    setLastAppliedRequirementId(null);
    setFormData({
      warehouseEntryId: record.warehouseEntryId ? String(record.warehouseEntryId) : "",
      warehouseEntryNo: record.warehouseEntryNo || "",
      productCode: record.productCode,
      productName: record.productName,
      batchNo: record.batchNo,
      sterilizationBatchNo: record.sterilizationBatchNo || "",
      quantity: record.quantity,
      unit: record.unit,
      samplingQty: record.samplingQty,
      rejectQty: record.rejectQty || 0,
      sampleRetainQty: record.sampleRetainQty || 0,
      inspectionDate: record.inspectionDate,
      result: record.result,
      inspector: record.inspector,
      remarks: record.remarks,
      inspectionItems: record.inspectionItems.length > 0 ? normalizeInspectionItems(record.inspectionItems) : normalizeInspectionItems(defaultInspectionItems),
      productionOrderId: record.productionOrderId ? String(record.productionOrderId) : "",
      productionOrderNo: record.productionOrderNo || "",
      sterilizationOrderId: record.sterilizationOrderId ? String(record.sterilizationOrderId) : "",
      sterilizationOrderNo: record.sterilizationOrderNo || "",
      specialFormType: record.specialFormType,
      bioburdenForm: normalizeBioburdenForm(record.bioburdenForm || {}),
      sterilityForm: normalizeSterilityForm(record.sterilityForm || {}),
      releaseForm: normalizeReleaseForm(record.releaseForm || {}, record.quantity),
    });
    setFormDialogOpen(true);
  };

  const handleCreateFromWarehouseEntry = (record: OQCRecord) => {
    const isBioburdenTab = listTab === "bioburden";
    const isSterilityTab = listTab === "sterility";
    const bioburdenForm = normalizeBioburdenForm({});
    const sterilityForm = normalizeSterilityForm({});
    setIsEditing(false);
    setSelectedRecord(null);
    setActiveTab(listTab === "release" ? "release" : "items");
    setMatchedRequirementId(null);
    setLastAppliedRequirementId(null);
    setFormData({
      warehouseEntryId: record.warehouseEntryId ? String(record.warehouseEntryId) : "",
      warehouseEntryNo: record.warehouseEntryNo || "",
      productCode: record.productCode || "",
      productName: record.productName || "",
      batchNo: record.batchNo || "",
      sterilizationBatchNo: record.sterilizationBatchNo || "",
      quantity: record.quantity || "",
      unit: record.unit || "支",
      samplingQty: 0,
      rejectQty: record.rejectQty || 0,
      sampleRetainQty: record.sampleRetainQty || 0,
      inspectionDate: new Date().toISOString().split("T")[0],
      result: "pending",
      inspector: currentUserName,
      remarks: "",
      inspectionItems: isBioburdenTab
        ? buildBioburdenInspectionItems(bioburdenForm.rows)
        : isSterilityTab
          ? buildSterilityInspectionItems(sterilityForm.rows)
        : normalizeInspectionItems(defaultInspectionItems),
      productionOrderId: record.productionOrderId ? String(record.productionOrderId) : "",
      productionOrderNo: record.productionOrderNo || "",
      sterilizationOrderId: record.sterilizationOrderId ? String(record.sterilizationOrderId) : "",
      sterilizationOrderNo: record.sterilizationOrderNo || "",
      specialFormType: isBioburdenTab ? "bioburden" : isSterilityTab ? "sterility" : undefined,
      bioburdenForm,
      sterilityForm,
      releaseForm: normalizeReleaseForm({}, record.quantity || ""),
    });
    setFormDialogOpen(true);
  };

  const handleView = (record: OQCRecord) => {
    if (record.sourceType === "warehouse_entry") {
      handleCreateFromWarehouseEntry(record);
      return;
    }
    setActiveTab("release");
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: OQCRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleWarehouseEntryChange = (entryId: string) => {
    if (entryId === NO_WAREHOUSE_ENTRY_VALUE) {
      setMatchedRequirementId(null);
      setLastAppliedRequirementId(null);
      setFormData((f) => ({
        ...f,
        warehouseEntryId: "",
        warehouseEntryNo: "",
      }));
      return;
    }
    const entry = (productionWarehouseEntriesData as any[]).find((item: any) => String(item.id) === entryId);
    setLastAppliedRequirementId(null);
    setFormData((f) => ({
      ...f,
      warehouseEntryId: entryId,
      warehouseEntryNo: entry?.entryNo || "",
      productCode: productCodeMap.get(String(entry?.productId || "")) || f.productCode,
      productName: entry?.productName || f.productName,
      batchNo: entry?.batchNo || f.batchNo,
      sterilizationBatchNo: entry?.sterilizationBatchNo || f.sterilizationBatchNo,
      quantity: entry?.quantity ? String(entry.quantity) : f.quantity,
      unit: entry?.unit || f.unit,
      rejectQty: Number(entry?.inspectionRejectQty || 0),
      sampleRetainQty: Number(entry?.sampleQty || 0),
      productionOrderId: entry?.productionOrderId ? String(entry.productionOrderId) : f.productionOrderId,
      productionOrderNo: entry?.productionOrderNo || f.productionOrderNo,
      sterilizationOrderId: entry?.sterilizationOrderId ? String(entry.sterilizationOrderId) : f.sterilizationOrderId,
      sterilizationOrderNo: entry?.sterilizationOrderNo || f.sterilizationOrderNo,
      releaseForm: normalizeReleaseForm(f.releaseForm || {}, entry?.quantity ? String(entry.quantity) : f.quantity),
    }));
  };

  // 选择灭菌单时自动填充产品信息
  const handleSterilizationOrderChange = (soId: string) => {
    if (soId === NO_STERILIZATION_ORDER_VALUE) {
      setMatchedRequirementId(null);
      setLastAppliedRequirementId(null);
      setFormData((f) => ({
        ...f,
        sterilizationOrderId: "",
        sterilizationOrderNo: "",
      }));
      return;
    }
    const so = (sterilizationOrdersData as any[]).find((s) => String(s.id) === soId);
    setLastAppliedRequirementId(null);
    setFormData((f) => ({
      ...f,
      sterilizationOrderId: soId,
      sterilizationOrderNo: so?.orderNo || "",
      productName: so?.productName || f.productName,
      batchNo: so?.batchNo || f.batchNo,
      sterilizationBatchNo: so?.sterilizationBatchNo || f.sterilizationBatchNo,
      quantity: so?.quantity ? String(so.quantity) : f.quantity,
      unit: so?.unit || f.unit,
      productionOrderId: so?.productionOrderId ? String(so.productionOrderId) : f.productionOrderId,
      productionOrderNo: so?.productionOrderNo || f.productionOrderNo,
      releaseForm: normalizeReleaseForm(f.releaseForm || {}, so?.quantity ? String(so.quantity) : f.quantity),
    }));
  };

  const handleSubmit = () => {
    if (!formData.productName || !formData.batchNo || (!formData.quantity && formData.specialFormType === "sterility") || (!formData.specialFormType && !formData.quantity)) {
      toast.error("请填写必填字段");
      return;
    }

    const bioburdenForm = formData.specialFormType === "bioburden"
      ? normalizeBioburdenForm(formData.bioburdenForm)
      : undefined;
    const sterilityForm = formData.specialFormType === "sterility"
      ? normalizeSterilityForm(formData.sterilityForm)
      : undefined;
    const inspectionItems = bioburdenForm
      ? buildBioburdenInspectionItems(bioburdenForm.rows)
      : sterilityForm
        ? buildSterilityInspectionItems(sterilityForm.rows)
      : formData.inspectionItems;
    const result = bioburdenForm ? formData.result : formData.result;
    const extraData = {
      warehouseEntryId: formData.warehouseEntryId || undefined,
      warehouseEntryNo: formData.warehouseEntryNo || undefined,
      productCode: formData.productCode,
      sterilizationBatchNo: formData.sterilizationBatchNo || undefined,
      quantity: formData.quantity,
      unit: formData.unit,
      samplingQty: formData.samplingQty,
      rejectQty: formData.rejectQty,
      sampleRetainQty: formData.sampleRetainQty,
      result,
      inspector: formData.inspector,
      remarks: formData.remarks,
      inspectionItems,
      signatures: isEditing && selectedRecord ? (selectedRecord.signatures || []) : [],
      specialFormType: formData.specialFormType,
      bioburdenForm,
      sterilityForm,
      releaseForm: normalizeReleaseForm(formData.releaseForm, formData.quantity),
    };

    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          itemName: formData.productName,
          batchNo: formData.batchNo || undefined,
          relatedDocNo: formData.productCode || undefined,
          inspectedQty: formData.quantity || undefined,
          result: (["qualified", "unqualified", "conditional"].includes(result)
            ? result
            : undefined) as any,
          inspectionDate: formData.inspectionDate || undefined,
          productionOrderId: formData.productionOrderId ? parseInt(formData.productionOrderId) : undefined,
          productionOrderNo: formData.productionOrderNo || undefined,
          sterilizationOrderId: formData.sterilizationOrderId ? parseInt(formData.sterilizationOrderId) : undefined,
          sterilizationOrderNo: formData.sterilizationOrderNo || undefined,
          remark: JSON.stringify(extraData),
        },
      });
    } else {
      const year = new Date().getFullYear();
      const mm = String(new Date().getMonth() + 1).padStart(2, "0");
      const dd = String(new Date().getDate()).padStart(2, "0");
      const inspectionNo = `OQC-${year}-${mm}${dd}-${String(Date.now()).slice(-4)}`;
      createMutation.mutate({
        inspectionNo,
        type: "OQC",
        itemName: formData.productName,
        batchNo: formData.batchNo || undefined,
        relatedDocNo: formData.productCode || undefined,
        inspectedQty: formData.quantity || undefined,
        result: (["qualified", "unqualified", "conditional"].includes(result)
          ? result
          : undefined) as any,
        inspectionDate: formData.inspectionDate || undefined,
        productionOrderId: formData.productionOrderId ? parseInt(formData.productionOrderId) : undefined,
        productionOrderNo: formData.productionOrderNo || undefined,
        sterilizationOrderId: formData.sterilizationOrderId ? parseInt(formData.sterilizationOrderId) : undefined,
        sterilizationOrderNo: formData.sterilizationOrderNo || undefined,
        remark: JSON.stringify(extraData),
      });
    }
  };

  const handleSignComplete = (signature: SignatureRecord) => {
    if (!selectedRecord) return;
    setSelectedRecord((prev) =>
      prev
        ? {
            ...prev,
            signatures: [...(prev.signatures || []), signature],
          }
        : null
    );
  };

  const updateInspectionItem = (index: number, field: keyof InspectionItem, value: string) => {
    const newItems = [...formData.inspectionItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, inspectionItems: newItems });
  };

  const addInspectionItem = () => {
    setFormData({
      ...formData,
      inspectionItems: [
        ...formData.inspectionItems,
        newInspectionItem(),
      ],
    });
  };

  const removeInspectionItem = (index: number) => {
    const newItems = formData.inspectionItems.filter((_, i) => i !== index);
    setFormData({ ...formData, inspectionItems: newItems, result: calcOqcSummaryResult(newItems) });
  };

  const openItemRecordDialog = (index: number) => {
    const targetItem = formData.inspectionItems[index];
    if (!targetItem) return;
    const latestRecord = targetItem.records?.[targetItem.records.length - 1];
    setActiveItemIndex(index);
    const nextDetails = buildItemRecordDetails(targetItem, latestRecord);
    setItemRecordForm({
      sampleQty: calcDetailSampleQty(nextDetails),
      result: calcDetailResultText(nextDetails),
      conclusion: calcDetailConclusion(nextDetails),
      inspector: currentUserName || formData.inspector || latestRecord?.inspector || "",
      inspectionTime: currentDateTimeLocal(),
      remark: latestRecord?.remark || "",
      details: nextDetails,
    });
    setItemRecordDialogOpen(true);
  };

  const saveItemRecord = () => {
    if (activeItemIndex === null) return;
    const targetItem = formData.inspectionItems[activeItemIndex];
    if (!targetItem) return;
    const normalizedDetails = itemRecordForm.details.map((detail) => ({
      ...detail,
      sampleQty: Number(detail.sampleQty || 1),
      sampleValues: resizeSampleValues(detail.sampleValues, Number(detail.sampleQty || 1)),
      result: (resizeSampleValues(detail.sampleValues, Number(detail.sampleQty || 1)).filter(Boolean).join(" / ")) || String(detail.result || ""),
      conclusion: detail.conclusion,
      remark: String(detail.remark || ""),
    }));
    const nextConclusion = calcDetailConclusion(normalizedDetails);
    const nextResultText = calcDetailResultText(normalizedDetails);
    const nextRecord: InspectionItemRecord = {
      id: createItemRecordId(),
      sampleQty: calcDetailSampleQty(normalizedDetails),
      result: nextResultText,
      conclusion: nextConclusion,
      inspector: itemRecordForm.inspector || formData.inspector || currentUserName,
      inspectionTime: itemRecordForm.inspectionTime,
      remark: itemRecordForm.remark,
      details: normalizedDetails,
    };
    const nextItems = formData.inspectionItems.map((item, index) =>
      index === activeItemIndex
        ? {
            ...item,
            sampleQty: nextRecord.sampleQty,
            result: nextResultText,
            conclusion: nextConclusion,
            records: [...(item.records || []), nextRecord],
          }
        : item
    );
    setFormData((prev) => ({
      ...prev,
      inspector: prev.inspector || nextRecord.inspector,
      inspectionItems: nextItems,
      result: calcOqcSummaryResult(nextItems),
    }));
    setItemRecordDialogOpen(false);
    setActiveItemIndex(null);
  };

  const updateBioburdenRow = (
    index: number,
    field: keyof BioburdenRow,
    value: string
  ) => {
    setFormData((prev) => {
      const rows = normalizeBioburdenRows(prev.bioburdenForm.rows).map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextRow = { ...row, [field]: value } as BioburdenRow;
        if (field === "plate1" || field === "plate2") {
          nextRow.average = calcBioburdenAverage(
            field === "plate1" ? value : nextRow.plate1,
            field === "plate2" ? value : nextRow.plate2
          );
        }
        return nextRow;
      });
      return {
        ...prev,
        bioburdenForm: { ...prev.bioburdenForm, rows },
        inspectionItems: buildBioburdenInspectionItems(rows),
      };
    });
  };

  const addBioburdenRow = () => {
    setFormData((prev) => {
      const rows = [...normalizeBioburdenRows(prev.bioburdenForm.rows), createBioburdenRow(`稀释${prev.bioburdenForm.rows.length + 1}倍`)];
      return {
        ...prev,
        bioburdenForm: { ...prev.bioburdenForm, rows },
        inspectionItems: buildBioburdenInspectionItems(rows),
      };
    });
  };

  const handleBioburdenPaperUpload = async (fileList?: FileList | null) => {
    if (!fileList?.length) return;
    try {
      const form = new FormData();
      form.append("path", "/ERP/知识库/质量部/OQC/初始污染菌检测记录");
      Array.from(fileList).forEach((file, index) => {
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
        const uploadName = [
          "初始污染菌",
          sanitizeFileNamePart(formData.productName),
          sanitizeFileNamePart(formData.batchNo),
          Date.now() + index,
        ].filter(Boolean).join("+") + ext;
        const renamedFile = new File([file], uploadName, { type: file.type });
        form.append("files", renamedFile);
      });
      const response = await fetch("/api/file-manager/upload", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!result?.success || !result?.files?.length) {
        throw new Error(result?.error || "纸质报告上传失败");
      }
      const saved = result.files[0];
      setFormData((prev) => ({
        ...prev,
        bioburdenForm: {
          ...prev.bioburdenForm,
          paperReportName: String(saved?.name || ""),
          paperReportPath: String(saved?.path || ""),
        },
      }));
      toast.success("纸质报告已上传");
    } catch (error: any) {
      toast.error(error?.message || "纸质报告上传失败");
    } finally {
      if (bioburdenPaperInputRef.current) {
        bioburdenPaperInputRef.current.value = "";
      }
    }
  };

  const updateSterilityRow = (
    index: number,
    field: keyof SterilityRow,
    value: string
  ) => {
    setFormData((prev) => {
      const rows = normalizeSterilityRows(prev.sterilityForm.rows).map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextRow = { ...row, [field]: value } as SterilityRow;
        if (field === "colony1" || field === "colony2") {
          nextRow.average = calcBioburdenAverage(
            field === "colony1" ? value : nextRow.colony1,
            field === "colony2" ? value : nextRow.colony2
          );
        }
        return nextRow;
      });
      return {
        ...prev,
        sterilityForm: { ...prev.sterilityForm, rows },
        inspectionItems: buildSterilityInspectionItems(rows),
      };
    });
  };

  const addSterilityRow = () => {
    setFormData((prev) => {
      const rows = [...normalizeSterilityRows(prev.sterilityForm.rows), createSterilityRow(`检验项${prev.sterilityForm.rows.length + 1}`)];
      return {
        ...prev,
        sterilityForm: { ...prev.sterilityForm, rows },
        inspectionItems: buildSterilityInspectionItems(rows),
      };
    });
  };

  const handleSterilityPaperUpload = async (fileList?: FileList | null) => {
    if (!fileList?.length) return;
    try {
      const form = new FormData();
      form.append("path", "/ERP/知识库/质量部/OQC/无菌检验记录");
      Array.from(fileList).forEach((file, index) => {
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
        const uploadName = [
          "无菌检验",
          sanitizeFileNamePart(formData.productName),
          sanitizeFileNamePart(formData.batchNo),
          Date.now() + index,
        ].filter(Boolean).join("+") + ext;
        const renamedFile = new File([file], uploadName, { type: file.type });
        form.append("files", renamedFile);
      });
      const response = await fetch("/api/file-manager/upload", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!result?.success || !result?.files?.length) {
        throw new Error(result?.error || "纸质报告上传失败");
      }
      const saved = result.files[0];
      setFormData((prev) => ({
        ...prev,
        sterilityForm: {
          ...prev.sterilityForm,
          paperReportName: String(saved?.name || ""),
          paperReportPath: String(saved?.path || ""),
        },
      }));
      toast.success("纸质报告已上传");
    } catch (error: any) {
      toast.error(error?.message || "纸质报告上传失败");
    } finally {
      if (sterilityPaperInputRef.current) {
        sterilityPaperInputRef.current.value = "";
      }
    }
  };

  const handleDetailAttachmentUpload = async (detailIndex: number, fileList?: FileList | null) => {
    if (!fileList?.length || activeItemIndex === null) return;
    const currentItem = formData.inspectionItems[activeItemIndex];
    const currentDetail = itemRecordForm.details[detailIndex];
    if (!currentItem || !currentDetail) return;

    try {
      const form = new FormData();
      form.append("path", "/ERP/知识库/质量部/成品检验/单项记录附件");
      Array.from(fileList).forEach((file, index) => {
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
        const uploadName = [
          sanitizeFileNamePart(formData.productName),
          sanitizeFileNamePart(formData.batchNo),
          sanitizeFileNamePart(currentItem.name),
          sanitizeFileNamePart(currentDetail.name || `明细${detailIndex + 1}`),
          Date.now() + index,
        ].filter(Boolean).join("+") + ext;
        const renamedFile = new File([file], uploadName, { type: file.type });
        form.append("files", renamedFile);
      });

      const response = await fetch("/api/file-manager/upload", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!result?.success || !result?.files?.length) {
        throw new Error(result?.error || "附件上传失败");
      }

      const nextAttachments: InspectionItemRecordDetailAttachment[] = result.files.map((saved: any) => ({
        fileName: String(saved.name || ""),
        filePath: String(saved.path || ""),
        fileSize: saved.size ? Number(saved.size) : undefined,
        uploadedAt: new Date().toISOString(),
      }));

      setItemRecordForm((prev) => ({
        ...prev,
        details: prev.details.map((detail, index) => (
          index === detailIndex
            ? { ...detail, attachments: [...(detail.attachments || []), ...nextAttachments] }
            : detail
        )),
      }));
      toast.success("明细附件已上传");
    } catch (error: any) {
      toast.error(error?.message || "附件上传失败");
    } finally {
      const key = `${activeItemIndex}-${detailIndex}`;
      if (detailAttachmentInputRefs.current[key]) {
        detailAttachmentInputRefs.current[key]!.value = "";
      }
    }
  };

  // 统计
  const pendingCount = currentListData.filter((r) => {
    const status = getTabScopedStatus(r, listTab);
    return status === "pending" || status === "inspecting";
  }).length;
  const qualifiedCount = currentListData.filter((r) => getTabScopedStatus(r, listTab) === "qualified").length;
  const unqualifiedCount = currentListData.filter((r) => getTabScopedStatus(r, listTab) === "unqualified").length;
  const isBioburdenEditing = formData.specialFormType === "bioburden";
  const isSterilityEditing = formData.specialFormType === "sterility";
  const selectedBioburdenForm = selectedRecord?.specialFormType === "bioburden"
    ? normalizeBioburdenForm(selectedRecord.bioburdenForm || {})
    : null;
  const selectedSterilityForm = selectedRecord?.specialFormType === "sterility"
    ? normalizeSterilityForm(selectedRecord.sterilityForm || {})
    : null;
  const goBack = () => {
    setFormDialogOpen(false);
    setViewDialogOpen(false);
  };

  if (viewDialogOpen && selectedRecord?.specialFormType === "bioburden" && selectedBioburdenForm) {
    const signCount = selectedRecord.signatures?.filter((s: any) => s.status === "valid").length || 0;
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />成品检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{selectedRecord.inspectionNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <PrintPreviewButton title={`初始污染菌检测记录 - ${selectedRecord.inspectionNo}`} targetRef={detailPrintRef} />
                <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(selectedRecord); }}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />编辑
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={detailPrintRef} className="mx-auto w-full max-w-5xl px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold">初始污染菌检测记录</h2>
                      <p className="text-sm text-muted-foreground">{selectedRecord.inspectionNo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1"><Label>编号</Label><Input value={selectedRecord.inspectionNo} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>生产批号</Label><Input value={selectedRecord.batchNo} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>产品名称</Label><Input value={selectedRecord.productName} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>规格型号</Label><Input value={selectedBioburdenForm.specModel || "-"} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>完成日期</Label><Input value={selectedBioburdenForm.completionDate || "-"} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>检验日期</Label><Input value={selectedRecord.inspectionDate || "-"} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>检验员</Label><Input value={selectedRecord.inspector || "-"} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1 md:col-span-2"><Label>检验标准</Label><Input value={selectedBioburdenForm.inspectionStandard || "-"} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1 md:col-span-3">
                      <Label>培养基批号</Label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {selectedBioburdenForm.mediumBatchNos.map((batchNo, index) => (
                          <Input key={`view-bioburden-batch-${index}`} value={batchNo || "-"} readOnly className="bg-muted/40" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">检验内容</div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>检验项目</TableHead>
                            <TableHead className="w-[180px] text-center">皿1</TableHead>
                            <TableHead className="w-[180px] text-center">皿2</TableHead>
                            <TableHead className="w-[180px] text-center">均值</TableHead>
                            <TableHead className="w-[160px] text-center">结论</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBioburdenForm.rows.map((row, index) => (
                            <TableRow key={`view-bioburden-row-${index}`}>
                              <TableCell className="font-medium">{row.itemName}</TableCell>
                              <TableCell className="text-center">{row.plate1 || "-"}</TableCell>
                              <TableCell className="text-center">{row.plate2 || "-"}</TableCell>
                              <TableCell className="text-center font-semibold">{row.average || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={row.conclusion === "qualified" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}>
                                  {row.conclusion === "qualified" ? "合格" : "不合格"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>纸质报告</Label>
                      <div className="flex gap-2">
                        <Input value={selectedBioburdenForm.paperReportName || ""} readOnly placeholder="暂无纸质报告" />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!selectedBioburdenForm.paperReportPath}
                          onClick={() => window.open(selectedBioburdenForm.paperReportPath, "_blank")}
                        >
                          浏览
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>结果判定</Label>
                      <Input value={selectedRecord.result === "unqualified" ? "不合格" : selectedRecord.result === "qualified" ? "合格" : "待定"} readOnly className="bg-muted/40" />
                    </div>
                  </div>

                  <SignatureStatusCard
                    documentType="OQC"
                    documentNo={selectedRecord.inspectionNo}
                    documentId={selectedRecord.id}
                    signatures={selectedRecord.signatures || []}
                    onSignComplete={handleSignComplete}
                    enabledTypes={["inspector", "reviewer"]}
                  />

                  {selectedRecord.remarks ? (
                    <div className="space-y-2">
                      <Label>备注</Label>
                      <div className="rounded-lg border bg-muted/10 p-4 text-sm whitespace-pre-wrap">{selectedRecord.remarks}</div>
                    </div>
                  ) : null}

                  {signCount >= 2 ? (
                    <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-700">
                      该初始污染菌检测记录已完成二级电子签名，记录闭环。
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ERPLayout>
    );
  }

  if (viewDialogOpen && selectedRecord?.specialFormType === "sterility" && selectedSterilityForm) {
    const signCount = selectedRecord.signatures?.filter((s: any) => s.status === "valid").length || 0;
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />成品检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{selectedRecord.inspectionNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <PrintPreviewButton title={`无菌检验记录 - ${selectedRecord.inspectionNo}`} targetRef={detailPrintRef} />
                <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(selectedRecord); }}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />编辑
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={detailPrintRef} className="mx-auto w-full max-w-5xl px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold">无菌检验记录</h2>
                      <p className="text-sm text-muted-foreground">{selectedRecord.inspectionNo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1"><Label>检验单号</Label><Input value={selectedRecord.inspectionNo} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>检验日期</Label><Input value={selectedRecord.inspectionDate || "-"} readOnly className="bg-muted/40" /></div>
                    <div className="space-y-1"><Label>检验员</Label><Input value={selectedRecord.inspector || "-"} readOnly className="bg-muted/40" /></div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">产品信息</div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-1"><Label>选择数据</Label><Input value={selectedRecord.warehouseEntryNo || "-"} readOnly className="bg-muted/40" /></div>
                      <div className="space-y-1"><Label>产品编码</Label><Input value={selectedRecord.productCode || "-"} readOnly className="bg-muted/40" /></div>
                      <div className="space-y-1"><Label>产品名称</Label><Input value={selectedRecord.productName || "-"} readOnly className="bg-muted/40" /></div>
                      <div className="space-y-1"><Label>生产批号</Label><Input value={selectedRecord.batchNo || "-"} readOnly className="bg-muted/40" /></div>
                      <div className="space-y-1"><Label>入库数量</Label><Input value={`${formatDisplayQty(selectedRecord.quantity)} ${selectedRecord.unit || ""}`.trim()} readOnly className="bg-muted/40" /></div>
                      <div className="space-y-1"><Label>灭菌批号</Label><Input value={selectedRecord.sterilizationBatchNo || "-"} readOnly className="bg-muted/40" /></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">检验条件</div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-1"><Label>内毒素限制</Label><Input value={selectedSterilityForm.endotoxinLimit || "-"} readOnly className="bg-muted/40" /></div>
                      <div className="space-y-1"><Label>供试液制备</Label><Input value={selectedSterilityForm.samplePreparation || "-"} readOnly className="bg-muted/40" /></div>
                      <div className="space-y-1"><Label>检验依据</Label><Input value={selectedSterilityForm.inspectionBasis || "-"} readOnly className="bg-muted/40" /></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">检验内容</div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px] text-center">#</TableHead>
                            <TableHead>检验项目</TableHead>
                            <TableHead className="w-[180px] text-center">菌1</TableHead>
                            <TableHead className="w-[180px] text-center">菌2</TableHead>
                            <TableHead className="w-[180px] text-center">均值</TableHead>
                            <TableHead className="w-[160px] text-center">结论</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSterilityForm.rows.map((row, index) => (
                            <TableRow key={`view-sterility-row-${index}`}>
                              <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="font-medium">{row.itemName}</TableCell>
                              <TableCell className="text-center">{row.colony1 || "-"}</TableCell>
                              <TableCell className="text-center">{row.colony2 || "-"}</TableCell>
                              <TableCell className="text-center font-semibold">{row.average || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={row.conclusion === "qualified" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}>
                                  {row.conclusion === "qualified" ? "合格" : "不合格"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>纸质报告</Label>
                      <div className="flex gap-2">
                        <Input value={selectedSterilityForm.paperReportName || ""} readOnly placeholder="暂无纸质报告" />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!selectedSterilityForm.paperReportPath}
                          onClick={() => window.open(selectedSterilityForm.paperReportPath, "_blank")}
                        >
                          浏览
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>判定结果</Label>
                      <Input value={selectedRecord.result === "unqualified" ? "不合格" : selectedRecord.result === "qualified" ? "合格" : "待定"} readOnly className="bg-muted/40" />
                    </div>
                  </div>

                  <SignatureStatusCard
                    documentType="OQC"
                    documentNo={selectedRecord.inspectionNo}
                    documentId={selectedRecord.id}
                    signatures={selectedRecord.signatures || []}
                    onSignComplete={handleSignComplete}
                    enabledTypes={["inspector", "reviewer"]}
                  />

                  {selectedRecord.remarks ? (
                    <div className="space-y-2">
                      <Label>备注</Label>
                      <div className="rounded-lg border bg-muted/10 p-4 text-sm whitespace-pre-wrap">{selectedRecord.remarks}</div>
                    </div>
                  ) : null}

                  {signCount >= 2 ? (
                    <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-700">
                      该无菌检验记录已完成二级电子签名，记录闭环。
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ERPLayout>
    );
  }

  if (viewDialogOpen && selectedRecord) {
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />成品检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{selectedRecord.inspectionNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <PrintPreviewButton title={`成品检验详情 - ${selectedRecord.inspectionNo}`} targetRef={detailPrintRef} />
                <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(selectedRecord); }}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />编辑
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={detailPrintRef} className="max-w-6xl mx-auto px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedRecord.inspectionNo}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">成品检验详情与放行结果汇总</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 text-sm font-medium">基础信息</div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <FieldRow label="产品名称">{selectedRecord.productName}</FieldRow>
                      <FieldRow label="产品编码">{selectedRecord.productCode || "-"}</FieldRow>
                      <FieldRow label="批次号">{selectedRecord.batchNo}</FieldRow>
                      <FieldRow label="批量">{formatDisplayQty(selectedRecord.quantity)} {selectedRecord.unit}</FieldRow>
                      <FieldRow label="抽样数量">{formatDisplayQty(selectedRecord.samplingQty)}</FieldRow>
                      <FieldRow label="灭菌批号">{selectedRecord.sterilizationBatchNo || "-"}</FieldRow>
                      <FieldRow label="留样数量">{formatDisplayQty(selectedRecord.sampleRetainQty || 0)}</FieldRow>
                      <FieldRow label="检验日期">{formatDateValue(selectedRecord.inspectionDate)}</FieldRow>
                      <FieldRow label="检验员">{selectedRecord.inspector || "-"}</FieldRow>
                    </div>
                  </div>

                  {(selectedRecord.warehouseEntryNo || selectedRecord.sterilizationOrderNo || selectedRecord.productionOrderNo) ? (
                    <div className="mt-6">
                      <div className="mb-3 text-sm font-medium">关联单据</div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {selectedRecord.warehouseEntryNo ? <FieldRow label="入库申请">{selectedRecord.warehouseEntryNo}</FieldRow> : null}
                        {selectedRecord.sterilizationOrderNo ? <FieldRow label="灭菌单">{selectedRecord.sterilizationOrderNo}</FieldRow> : null}
                        {selectedRecord.productionOrderNo ? <FieldRow label="生产指令">{selectedRecord.productionOrderNo}</FieldRow> : null}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                      <TabsTrigger value="release" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        放行记录
                      </TabsTrigger>
                      <TabsTrigger value="signatures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        电子签名
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        备注
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="release" className="mt-5">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>放行单号</Label>
                            <Input value={getReleaseNo(selectedRecord.inspectionNo)} readOnly className="bg-muted/40 font-mono" />
                          </div>
                          <div className="space-y-2">
                            <Label>灭菌批号</Label>
                            <Input value={selectedRecord.sterilizationBatchNo || "-"} readOnly className="bg-muted/40 font-mono" />
                          </div>
                          <div className="space-y-2">
                            <Label>生产批号</Label>
                            <Input value={selectedRecord.batchNo || "-"} readOnly className="bg-muted/40 font-mono" />
                          </div>
                          <div className="space-y-2">
                            <Label>产品类别</Label>
                            <Input value={String(selectedProductMeta?.category || selectedProductMeta?.productCategory || "-")} readOnly className="bg-muted/40" />
                          </div>
                          <div className="space-y-2">
                            <Label>产品型号</Label>
                            <Input value={String(selectedProductMeta?.specification || "-")} readOnly className="bg-muted/40" />
                          </div>
                          <div className="space-y-2">
                            <Label>产品编码</Label>
                            <Input value={selectedRecord.productCode || "-"} readOnly className="bg-muted/40 font-mono" />
                          </div>
                          <div className="space-y-2">
                            <Label>生产车间</Label>
                            <Input value={selectedRecord.productionOrderNo || "-"} readOnly className="bg-muted/40" />
                          </div>
                          <div className="space-y-2">
                            <Label>计划数量</Label>
                            <Input value={formatDisplayQty(selectedRecord.quantity)} readOnly className="bg-muted/40" />
                          </div>
                          <div className="space-y-2">
                            <Label>检验数量</Label>
                            <Input value={formatDisplayQty(selectedRecord.samplingQty)} readOnly className="bg-muted/40" />
                          </div>
                          <div className="space-y-2">
                            <Label>放行数量</Label>
                            <Input value={selectedRecord.releaseForm?.releaseQty || selectedRecord.quantity || "-"} readOnly className="bg-muted/40" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">审核内容</div>
                          <Button variant="link" className="h-auto px-0 text-primary" onClick={() => setActiveTab("items")}>
                            &gt;&gt; 查看批相关记录
                          </Button>
                        </div>

                        <div className="overflow-hidden rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-14 text-center">Item</TableHead>
                                <TableHead className="w-[180px]">项目</TableHead>
                                <TableHead>审核标准</TableHead>
                                <TableHead className="w-[160px] text-center">审核</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(selectedRecord.releaseForm?.reviewItems || createDefaultReleaseReviewItems()).map((item, index) => (
                                <TableRow key={`release-view-${index}`}>
                                  <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell className="font-medium">{item.itemName}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{item.reviewStandard}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className={item.decision === "qualified" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}>
                                      {item.decision === "qualified" ? "合格" : "不合格"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>审核结论</Label>
                            <Input value={getReleaseDecisionLabel(selectedRecord.releaseForm?.decision || "approve")} readOnly className="bg-muted/40" />
                          </div>
                          <div className="space-y-2">
                            <Label>审核备注</Label>
                            <Textarea value={selectedRecord.releaseForm?.remark || "暂无备注"} readOnly rows={4} className="resize-none bg-muted/40" />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="signatures" className="mt-5">
                      <SignatureStatusCard
                        documentType="OQC"
                        documentNo={selectedRecord.inspectionNo}
                        documentId={selectedRecord.id}
                        signatures={selectedRecord.signatures || []}
                        onSignComplete={handleSignComplete}
                      />
                    </TabsContent>

                    <TabsContent value="notes" className="mt-5">
                      <div className="rounded-lg border bg-muted/10 p-4 text-sm whitespace-pre-wrap">
                        {selectedRecord.remarks || "暂无备注"}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>

          <DraggableDialog
            open={itemRecordDialogOpen}
            onOpenChange={setItemRecordDialogOpen}
            isMaximized={itemRecordDialogMaximized}
            onMaximizedChange={setItemRecordDialogMaximized}
          >
            <DraggableDialogContent className="max-w-4xl">
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>录入检验项目记录</DialogTitle>
                </DialogHeader>

                {activeItemIndex !== null && formData.inspectionItems[activeItemIndex] ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>项目名称</Label>
                        <Input value={formData.inspectionItems[activeItemIndex].name} readOnly className="bg-muted/40" />
                      </div>
                      <div className="space-y-2">
                        <Label>检验员</Label>
                        <Select
                          value={itemRecordForm.inspector || undefined}
                          onValueChange={(value) => setItemRecordForm((prev) => ({ ...prev, inspector: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择检验员" />
                          </SelectTrigger>
                          <SelectContent>
                            {inspectorOptions.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>检验时间</Label>
                        <Input
                          type="datetime-local"
                          value={itemRecordForm.inspectionTime}
                          onChange={(e) => setItemRecordForm((prev) => ({ ...prev, inspectionTime: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>检验要求</Label>
                        <Textarea
                          value={formData.inspectionItems[activeItemIndex].standard}
                          readOnly
                          rows={4}
                          className="resize-none bg-muted/40"
                        />
                      </div>
                      {(formData.inspectionItems[activeItemIndex].children?.length || 0) > 0 && (
                        <div className="space-y-2 md:col-span-2">
                          <Label>二级检验明细</Label>
                          <div className="overflow-hidden rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-10">#</TableHead>
                                  <TableHead className="w-[220px]">明细名称</TableHead>
                                  <TableHead>检验要求</TableHead>
                                  <TableHead className="w-[180px]">备注</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(formData.inspectionItems[activeItemIndex].children || []).map((child, childIndex) => (
                                  <TableRow key={`${child.name}-${childIndex}`}>
                                    <TableCell className="text-muted-foreground">{childIndex + 1}</TableCell>
                                    <TableCell className="font-medium">{child.name || `明细${childIndex + 1}`}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{child.standard || "-"}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{child.remark || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 md:col-span-2">
                        <div className="text-sm font-medium">本次录入</div>
                        <div className="overflow-hidden rounded-lg border">
                          <Table className="table-fixed">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead className="w-[260px]">项目名称</TableHead>
                                <TableHead className="w-[240px]">检验要求</TableHead>
                                <TableHead className="w-[100px]">样本量</TableHead>
                                <TableHead className="w-[280px]">数值录入</TableHead>
                                <TableHead className="w-[120px]">结果</TableHead>
                                <TableHead className="w-[80px]">附件</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {itemRecordForm.details.map((detail, detailIndex) => (
                                <TableRow key={`${detail.name}-${detailIndex}`}>
                                  <TableCell className="text-muted-foreground">{detailIndex + 1}</TableCell>
                                  <TableCell className="max-w-[260px] whitespace-normal break-words leading-tight font-medium align-top">{detail.name || `明细${detailIndex + 1}`}</TableCell>
                                  <TableCell className="max-w-[240px] whitespace-pre-wrap break-words text-sm text-muted-foreground align-top">{detail.standard || "-"}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={detail.sampleQty}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value, 10) || 1;
                                        setItemRecordForm((prev) => ({
                                          ...prev,
                                          details: prev.details.map((item, index) => (
                                            index === detailIndex
                                              ? { ...item, sampleQty: value, sampleValues: resizeSampleValues(item.sampleValues, value) }
                                              : item
                                          )),
                                        }));
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                      {resizeSampleValues(detail.sampleValues, detail.sampleQty).map((sampleValue, sampleIndex) => (
                                        <Input
                                          key={`${detailIndex}-${sampleIndex}`}
                                          value={sampleValue}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setItemRecordForm((prev) => ({
                                              ...prev,
                                              details: prev.details.map((item, index) => (
                                                index === detailIndex
                                                  ? {
                                                      ...item,
                                                      sampleValues: resizeSampleValues(item.sampleValues, item.sampleQty).map((current, valueIndex) => (
                                                        valueIndex === sampleIndex ? value : current
                                                      )),
                                                    }
                                                  : item
                                              )),
                                            }));
                                          }}
                                          placeholder={`第${sampleIndex + 1}组`}
                                        />
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={detail.conclusion}
                                      onValueChange={(value) => {
                                        setItemRecordForm((prev) => ({
                                          ...prev,
                                          details: prev.details.map((item, index) => (
                                            index === detailIndex
                                              ? { ...item, conclusion: value as InspectionItemRecordDetail["conclusion"] }
                                              : item
                                          )),
                                        }));
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">检验中</SelectItem>
                                        <SelectItem value="qualified">合格</SelectItem>
                                        <SelectItem value="unqualified">不合格</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        className={`p-1 rounded border transition-colors ${
                                          detail.attachments?.length
                                            ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                                            : "hover:bg-muted"
                                        }`}
                                        title="上传附件"
                                        onClick={() => detailAttachmentInputRefs.current[`${activeItemIndex}-${detailIndex}`]?.click()}
                                      >
                                        <Paperclip className={`h-4 w-4 ${detail.attachments?.length ? "text-emerald-600" : "text-muted-foreground"}`} />
                                      </button>
                                      <input
                                        ref={(node) => { detailAttachmentInputRefs.current[`${activeItemIndex}-${detailIndex}`] = node; }}
                                        type="file"
                                        className="hidden"
                                        multiple
                                        onChange={(e) => handleDetailAttachmentUpload(detailIndex, e.target.files)}
                                      />
                                      <span className={`text-xs whitespace-nowrap ${detail.attachments?.length ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                                        {detail.attachments?.length || 0}
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/10 p-4 text-sm space-y-2">
                      <div className="font-medium">FDA 电子记录要求</div>
                      <div className="text-muted-foreground">本次录入作为电子记录保存，样本数据、结论、检验员、时间戳与附件将一并留痕。</div>
                      <div className="text-muted-foreground">修改或补录时继续追加记录，不覆盖原始数据，满足审计追踪要求。</div>
                    </div>
                  </div>
                ) : null}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setItemRecordDialogOpen(false)}>取消</Button>
                  <Button onClick={saveItemRecord}>保存记录</Button>
                </DialogFooter>
              </div>
            </DraggableDialogContent>
          </DraggableDialog>
        </div>
      </ERPLayout>
    );
  }

  if (formDialogOpen && isBioburdenEditing) {
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />成品检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "初始污染菌检测记录"}</span>
              </div>
              <div className="flex items-center gap-2">
                <PrintPreviewButton
                  title={isEditing && selectedRecord ? `初始污染菌检测记录 - ${selectedRecord.inspectionNo}` : "初始污染菌检测记录"}
                  targetRef={formPrintRef}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={formPrintRef} className="mx-auto w-full max-w-5xl px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-6 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={formData.bioburdenForm.entryMode === "online"}
                            onChange={() => setFormData((prev) => ({ ...prev, bioburdenForm: { ...prev.bioburdenForm, entryMode: "online" } }))}
                          />
                          在线填写报告
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={formData.bioburdenForm.entryMode === "paper"}
                            onChange={() => setFormData((prev) => ({ ...prev, bioburdenForm: { ...prev.bioburdenForm, entryMode: "paper" } }))}
                          />
                          上传纸质报告
                        </label>
                      </div>
                      <h2 className="text-2xl font-bold">初始污染菌检测记录</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>编号 *</Label>
                      <Input value={isEditing && selectedRecord ? selectedRecord.inspectionNo : "自动生成"} readOnly className="bg-muted/40" />
                    </div>
                    <div className="space-y-2">
                      <Label>生产批号 *</Label>
                      <Input value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} placeholder="输入生产批号" />
                    </div>
                    <div className="space-y-2">
                      <Label>产品名称 *</Label>
                      <Input value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} placeholder="输入产品名称" />
                    </div>
                    <div className="space-y-2">
                      <Label>规格型号 *</Label>
                      <Input
                        value={formData.bioburdenForm.specModel}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bioburdenForm: { ...prev.bioburdenForm, specModel: e.target.value } }))}
                        placeholder="输入规格型号"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>完成日期 *</Label>
                      <Input
                        type="date"
                        value={formData.bioburdenForm.completionDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bioburdenForm: { ...prev.bioburdenForm, completionDate: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>检验日期 *</Label>
                      <Input type="date" value={formData.inspectionDate} onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>检验员 *</Label>
                      <Select value={formData.inspector || undefined} onValueChange={(value) => setFormData({ ...formData, inspector: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择检验员" />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectorOptions.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>检验标准 *</Label>
                      <Select
                        value={formData.bioburdenForm.inspectionStandard}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, bioburdenForm: { ...prev.bioburdenForm, inspectionStandard: value } }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择检验标准" />
                        </SelectTrigger>
                        <SelectContent>
                          {BIOBURDEN_STANDARD_OPTIONS.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>培养基批号</Label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {formData.bioburdenForm.mediumBatchNos.map((batchNo, index) => (
                          <Input
                            key={`bioburden-batch-${index}`}
                            value={batchNo}
                            onChange={(e) => setFormData((prev) => ({
                              ...prev,
                              bioburdenForm: {
                                ...prev.bioburdenForm,
                                mediumBatchNos: prev.bioburdenForm.mediumBatchNos.map((current, currentIndex) => currentIndex === index ? e.target.value : current),
                              },
                            }))}
                            placeholder={`P00${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">检验内容</div>
                      <Button type="button" variant="outline" size="sm" onClick={addBioburdenRow}>
                        <Plus className="h-4 w-4 mr-1" />
                        增加行
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>检验项目</TableHead>
                            <TableHead className="w-[180px] text-center">皿1</TableHead>
                            <TableHead className="w-[180px] text-center">皿2</TableHead>
                            <TableHead className="w-[180px] text-center">均值</TableHead>
                            <TableHead className="w-[160px] text-center">结论</TableHead>
                            <TableHead className="w-[80px] text-center">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.bioburdenForm.rows.map((row, index) => (
                            <TableRow key={`bioburden-row-${index}`}>
                              <TableCell>
                                <Input value={row.itemName} onChange={(e) => updateBioburdenRow(index, "itemName", e.target.value)} />
                              </TableCell>
                              <TableCell><Input value={row.plate1} onChange={(e) => updateBioburdenRow(index, "plate1", e.target.value)} /></TableCell>
                              <TableCell><Input value={row.plate2} onChange={(e) => updateBioburdenRow(index, "plate2", e.target.value)} /></TableCell>
                              <TableCell><Input value={row.average} readOnly className="bg-muted/40 text-center font-semibold" /></TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-4 text-sm">
                                  <label className="flex items-center gap-2">
                                    <input type="radio" checked={row.conclusion === "qualified"} onChange={() => updateBioburdenRow(index, "conclusion", "qualified")} />
                                    合格
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input type="radio" checked={row.conclusion === "unqualified"} onChange={() => updateBioburdenRow(index, "conclusion", "unqualified")} />
                                    不合格
                                  </label>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  disabled={formData.bioburdenForm.rows.length <= 1}
                                  onClick={() => {
                                    const rows = formData.bioburdenForm.rows.filter((_, rowIndex) => rowIndex !== index);
                                    setFormData((prev) => ({
                                      ...prev,
                                      bioburdenForm: { ...prev.bioburdenForm, rows },
                                      inspectionItems: buildBioburdenInspectionItems(rows),
                                    }));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>纸质报告</Label>
                      <div className="flex gap-2">
                        <Input value={formData.bioburdenForm.paperReportName} readOnly placeholder="未上传纸质报告" />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (formData.bioburdenForm.paperReportPath) {
                              window.open(formData.bioburdenForm.paperReportPath, "_blank");
                            }
                          }}
                          disabled={!formData.bioburdenForm.paperReportPath}
                        >
                          浏览
                        </Button>
                        <Button type="button" onClick={() => bioburdenPaperInputRef.current?.click()}>
                          上传
                        </Button>
                        <input
                          ref={bioburdenPaperInputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleBioburdenPaperUpload(e.target.files)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>结果判定 *</Label>
                      <div className="flex h-10 items-center gap-6 rounded-md border px-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={formData.result === "qualified"} onChange={() => setFormData((prev) => ({ ...prev, result: "qualified" }))} />
                          合格
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={formData.result === "unqualified"} onChange={() => setFormData((prev) => ({ ...prev, result: "unqualified" }))} />
                          不合格
                        </label>
                      </div>
                    </div>
                  </div>

                  {!isEditing || !selectedRecord ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                    </div>
                  ) : (
                    <SignatureStatusCard
                      documentType="OQC"
                      documentNo={selectedRecord.inspectionNo}
                      documentId={selectedRecord.id}
                      signatures={selectedRecord.signatures || []}
                      onSignComplete={handleSignComplete}
                      enabledTypes={["inspector", "reviewer"]}
                    />
                  )}

                  <div className="space-y-2">
                    <Label>备注</Label>
                    <Textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="输入备注信息"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ERPLayout>
    );
  }

  if (formDialogOpen && isSterilityEditing) {
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />成品检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "无菌检验记录"}</span>
              </div>
              <div className="flex items-center gap-2">
                <PrintPreviewButton
                  title={isEditing && selectedRecord ? `无菌检验记录 - ${selectedRecord.inspectionNo}` : "无菌检验记录"}
                  targetRef={formPrintRef}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={formPrintRef} className="mx-auto w-full max-w-5xl px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold">无菌检验记录</h2>
                      <p className="text-sm text-muted-foreground">按初始污染菌检测记录同版式录入无菌检验数据</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>检验单号</Label>
                      <Input value={isEditing && selectedRecord ? selectedRecord.inspectionNo : "自动生成无需填写"} readOnly className="bg-muted/40" />
                    </div>
                    <div className="space-y-2">
                      <Label>检验日期 *</Label>
                      <Input type="date" value={formData.inspectionDate} onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>检验员 *</Label>
                      <Select value={formData.inspector || undefined} onValueChange={(value) => setFormData({ ...formData, inspector: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择检验员" />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectorOptions.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">产品信息</div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>选择数据</Label>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start font-normal"
                          onClick={() => setSterilitySourcePickerOpen(true)}
                        >
                          {formData.warehouseEntryNo ? `${formData.warehouseEntryNo} · ${formData.productName || "已选择"}` : "选择数据"}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>产品编码</Label>
                        <Input value={formData.productCode} readOnly className="bg-muted/40" />
                      </div>
                      <div className="space-y-2">
                        <Label>产品名称</Label>
                        <Input value={formData.productName} readOnly className="bg-muted/40" />
                      </div>
                      <div className="space-y-2">
                        <Label>生产批号</Label>
                        <Input value={formData.batchNo} readOnly className="bg-muted/40" />
                      </div>
                      <div className="space-y-2">
                        <Label>入库数量</Label>
                        <Input value={formData.quantity} readOnly className="bg-muted/40" />
                      </div>
                      <div className="space-y-2">
                        <Label>灭菌批号</Label>
                        <Input value={formData.sterilizationBatchNo} readOnly className="bg-muted/40" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">检验条件</div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>内毒素限制</Label>
                        <Input
                          value={formData.sterilityForm.endotoxinLimit}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sterilityForm: { ...prev.sterilityForm, endotoxinLimit: e.target.value } }))}
                          placeholder="填写内毒素限制"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>供试液制备</Label>
                        <Input
                          value={formData.sterilityForm.samplePreparation}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sterilityForm: { ...prev.sterilityForm, samplePreparation: e.target.value } }))}
                          placeholder="填写供试液制备"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验依据</Label>
                        <Input
                          value={formData.sterilityForm.inspectionBasis}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sterilityForm: { ...prev.sterilityForm, inspectionBasis: e.target.value } }))}
                          placeholder="填写检验依据"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">检验内容</div>
                      <Button type="button" variant="outline" size="sm" onClick={addSterilityRow}>
                        <Plus className="h-4 w-4 mr-1" />
                        增加行
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px] text-center">#</TableHead>
                            <TableHead>检验项目</TableHead>
                            <TableHead className="w-[180px] text-center">菌1</TableHead>
                            <TableHead className="w-[180px] text-center">菌2</TableHead>
                            <TableHead className="w-[180px] text-center">均值</TableHead>
                            <TableHead className="w-[160px] text-center">结论</TableHead>
                            <TableHead className="w-[80px] text-center">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.sterilityForm.rows.map((row, index) => (
                            <TableRow key={`sterility-row-${index}`}>
                              <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                              <TableCell>
                                <Input value={row.itemName} onChange={(e) => updateSterilityRow(index, "itemName", e.target.value)} />
                              </TableCell>
                              <TableCell><Input value={row.colony1} onChange={(e) => updateSterilityRow(index, "colony1", e.target.value)} /></TableCell>
                              <TableCell><Input value={row.colony2} onChange={(e) => updateSterilityRow(index, "colony2", e.target.value)} /></TableCell>
                              <TableCell><Input value={row.average} readOnly className="bg-muted/40 text-center font-semibold" /></TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-4 text-sm">
                                  <label className="flex items-center gap-2">
                                    <input type="radio" checked={row.conclusion === "qualified"} onChange={() => updateSterilityRow(index, "conclusion", "qualified")} />
                                    合格
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input type="radio" checked={row.conclusion === "unqualified"} onChange={() => updateSterilityRow(index, "conclusion", "unqualified")} />
                                    不合格
                                  </label>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  disabled={formData.sterilityForm.rows.length <= 1}
                                  onClick={() => {
                                    const rows = formData.sterilityForm.rows.filter((_, rowIndex) => rowIndex !== index);
                                    setFormData((prev) => ({
                                      ...prev,
                                      sterilityForm: { ...prev.sterilityForm, rows },
                                      inspectionItems: buildSterilityInspectionItems(rows),
                                    }));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>纸质报告</Label>
                      <div className="flex gap-2">
                        <Input value={formData.sterilityForm.paperReportName} readOnly placeholder="未上传纸质报告" />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (formData.sterilityForm.paperReportPath) {
                              window.open(formData.sterilityForm.paperReportPath, "_blank");
                            }
                          }}
                          disabled={!formData.sterilityForm.paperReportPath}
                        >
                          浏览
                        </Button>
                        <Button type="button" onClick={() => sterilityPaperInputRef.current?.click()}>
                          上传
                        </Button>
                        <input
                          ref={sterilityPaperInputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleSterilityPaperUpload(e.target.files)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>判定结果 *</Label>
                      <div className="flex h-10 items-center gap-6 rounded-md border px-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={formData.result === "qualified"} onChange={() => setFormData((prev) => ({ ...prev, result: "qualified" }))} />
                          合格
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={formData.result === "unqualified"} onChange={() => setFormData((prev) => ({ ...prev, result: "unqualified" }))} />
                          不合格
                        </label>
                      </div>
                    </div>
                  </div>

                  {!isEditing || !selectedRecord ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                    </div>
                  ) : (
                    <SignatureStatusCard
                      documentType="OQC"
                      documentNo={selectedRecord.inspectionNo}
                      documentId={selectedRecord.id}
                      signatures={selectedRecord.signatures || []}
                      onSignComplete={handleSignComplete}
                      enabledTypes={["inspector", "reviewer"]}
                    />
                  )}

                  <div className="space-y-2">
                    <Label>备注</Label>
                    <Textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="输入备注信息"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <EntityPickerDialog
            open={sterilitySourcePickerOpen}
            onOpenChange={setSterilitySourcePickerOpen}
            title="选择数据"
            searchPlaceholder="搜索入库申请号、产品名称、批次..."
            rows={productionWarehouseEntriesData as any[]}
            selectedId={formData.warehouseEntryId || ""}
            defaultWidth={1100}
            columns={[
              { key: "entryNo", title: "入库申请号", className: "w-[180px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.entryNo || "-"}</span> },
              { key: "productName", title: "产品名称", className: "min-w-[180px]", render: (row) => row.productName || "-" },
              { key: "batchNo", title: "生产批号", className: "w-[160px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.batchNo || "-"}</span> },
              { key: "sterilizationBatchNo", title: "灭菌批号", className: "w-[160px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.sterilizationBatchNo || "-"}</span> },
              { key: "quantity", title: "入库数量", className: "w-[140px] whitespace-nowrap", render: (row) => `${formatDisplayQty(row.quantity || 0)} ${row.unit || ""}` },
            ]}
            filterFn={(row, query) => {
              const lower = query.toLowerCase();
              return String(row.entryNo || "").toLowerCase().includes(lower)
                || String(row.productName || "").toLowerCase().includes(lower)
                || String(row.batchNo || "").toLowerCase().includes(lower)
                || String(row.sterilizationBatchNo || "").toLowerCase().includes(lower);
            }}
            onSelect={(row) => {
              handleWarehouseEntryChange(String(row.id));
              setSterilitySourcePickerOpen(false);
            }}
          />
        </div>
      </ERPLayout>
    );
  }

  if (formDialogOpen) {
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />成品检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "新建"}</span>
              </div>
              <div className="flex items-center gap-2">
                <PrintPreviewButton
                  title={isEditing && selectedRecord ? `成品检验表单 - ${selectedRecord.inspectionNo}` : "新建成品检验"}
                  targetRef={formPrintRef}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={formPrintRef} className="max-w-6xl mx-auto px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-5 md:p-6 space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "新建成品检验"}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">统一录入成品检验基础信息、检验项目与放行结论</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{formData.warehouseEntryNo ? "已关联入库申请" : "未关联入库申请"}</Badge>
                      <Badge variant="outline">{formData.sterilizationOrderNo ? "已关联灭菌单" : "未关联灭菌单"}</Badge>
                      <Badge variant={statusMap[formData.result]?.variant || "outline"} className={getStatusSemanticClass(formData.result, statusMap[formData.result]?.label)}>
                        {statusMap[formData.result]?.label || formData.result}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-1 text-sm font-medium">
                      <Link2 className="h-4 w-4 text-emerald-500" />
                      关联生产入库申请
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>选择生产入库申请</Label>
                        <Select
                          value={formData.warehouseEntryId || NO_WAREHOUSE_ENTRY_VALUE}
                          onValueChange={handleWarehouseEntryChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择入库申请（自动填充产品信息）" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_WAREHOUSE_ENTRY_VALUE}>不关联</SelectItem>
                            {(productionWarehouseEntriesData as any[]).map((entry: any) => (
                              <SelectItem key={entry.id} value={String(entry.id)}>
                                {entry.entryNo} — {entry.productName || "-"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>入库申请号</Label>
                        <Input value={formData.warehouseEntryNo} readOnly className="bg-muted/50 font-mono" placeholder="未关联" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-3 text-sm font-medium">基础信息</div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label>产品编码</Label>
                        <Input
                          value={formData.productCode}
                          onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                          placeholder="如: MD-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>产品名称 *</Label>
                        <Input
                          value={formData.productName}
                          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                          placeholder="输入产品名称"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>批次号 *</Label>
                        <Input
                          value={formData.batchNo}
                          onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                          placeholder="输入批次号"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>批量 *</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            placeholder="数量"
                            className="flex-1"
                          />
                          <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="支">支</SelectItem>
                              <SelectItem value="只">只</SelectItem>
                              <SelectItem value="双">双</SelectItem>
                              <SelectItem value="套">套</SelectItem>
                              <SelectItem value="个">个</SelectItem>
                              <SelectItem value="盒">盒</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>抽样数量</Label>
                        <Input
                          type="number"
                          value={formData.samplingQty}
                          onChange={(e) => setFormData({ ...formData, samplingQty: parseInt(e.target.value) || 0 })}
                          placeholder="抽样数量"
                        />
                      </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-orange-500" />
                            灭菌批号
                          </Label>
                          <Input
                            value={formData.sterilizationBatchNo}
                            readOnly
                            className="bg-muted/50 font-mono"
                            placeholder="自动带入"
                          />
                        </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Link2 className="h-3 w-3 text-blue-500" />
                          留样数量
                        </Label>
                        <Input
                          type="number"
                          value={formData.sampleRetainQty}
                          onChange={(e) => setFormData({ ...formData, sampleRetainQty: parseInt(e.target.value) || 0 })}
                          placeholder="留样数量"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验日期</Label>
                        <Input
                          type="date"
                          value={formData.inspectionDate}
                          onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验员</Label>
                        <Select
                          value={formData.inspector || undefined}
                          onValueChange={(value) => setFormData({ ...formData, inspector: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="默认当天用户，也可选择人事人员" />
                          </SelectTrigger>
                          <SelectContent>
                            {inspectorOptions.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>检验结果</Label>
                        <Select
                          value={formData.result}
                          onValueChange={(v) => setFormData({ ...formData, result: v as OQCRecord["result"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待检验</SelectItem>
                            <SelectItem value="inspecting">检验中</SelectItem>
                            <SelectItem value="qualified">合格</SelectItem>
                            <SelectItem value="unqualified">不合格</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                      <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        检验项目 {formData.inspectionItems.length > 0 && `(${formData.inspectionItems.length})`}
                      </TabsTrigger>
                      <TabsTrigger value="release" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        放行记录
                      </TabsTrigger>
                      <TabsTrigger value="signatures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        电子签名
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        备注
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="mt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">选择产品后会自动带入成品检验要求，也可手动增减检验项目</div>
                        <Button variant="outline" size="sm" onClick={addInspectionItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加项目
                        </Button>
                      </div>

                      {formData.inspectionItems.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                          暂无检验项目，点击“添加项目”开始录入
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead className="w-[180px]">项目名称</TableHead>
                                <TableHead>检验要求</TableHead>
                                <TableHead className="w-[120px]">状态/结论</TableHead>
                                <TableHead className="w-[80px]">记录数</TableHead>
                                <TableHead className="w-[120px]">操作</TableHead>
                                <TableHead className="w-10" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formData.inspectionItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell>
                                    <Input
                                      value={item.name}
                                      onChange={(e) => updateInspectionItem(index, "name", e.target.value)}
                                      placeholder="项目名称"
                                    />
                                    {item.children?.length ? (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {getInspectionItemChildrenSummary(item.children)}
                                      </div>
                                    ) : null}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    <Textarea
                                      value={item.standard}
                                      onChange={(e) => updateInspectionItem(index, "standard", e.target.value)}
                                      placeholder="检验要求"
                                      rows={3}
                                      className="min-h-[72px] resize-none border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0"
                                    />
                                    {item.children?.length ? (
                                      <div className="mt-2 rounded-md border bg-muted/20 p-2 space-y-1">
                                        {item.children.map((child, childIndex) => (
                                          <div key={`${child.name}-${childIndex}`} className="text-xs">
                                            <span className="font-medium">{child.name || `明细${childIndex + 1}`}</span>
                                            {child.standard ? <span className="text-muted-foreground">：{child.standard}</span> : null}
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={getInspectionItemStatus(item).className}>
                                      {getInspectionItemStatus(item).label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {item.records?.length || 0}
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="outline" size="sm" onClick={() => openItemRecordDialog(index)}>
                                      录入记录
                                    </Button>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => removeInspectionItem(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="release" className="mt-5 space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>放行单号</Label>
                          <Input value={isEditing && selectedRecord ? getReleaseNo(selectedRecord.inspectionNo) : "保存后生成"} readOnly className="bg-muted/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label>灭菌批号</Label>
                          <Input value={formData.sterilizationBatchNo || ""} readOnly className="bg-muted/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label>生产批号</Label>
                          <Input value={formData.batchNo || ""} readOnly className="bg-muted/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label>产品类别</Label>
                          <Input value={String(formProductMeta?.category || formProductMeta?.productCategory || "-")} readOnly className="bg-muted/40" />
                        </div>
                        <div className="space-y-2">
                          <Label>产品型号</Label>
                          <Input value={String(formProductMeta?.specification || "-")} readOnly className="bg-muted/40" />
                        </div>
                        <div className="space-y-2">
                          <Label>产品编码</Label>
                          <Input value={formData.productCode || ""} readOnly className="bg-muted/40 font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label>生产车间</Label>
                          <Input value={formData.productionOrderNo || "-"} readOnly className="bg-muted/40" />
                        </div>
                        <div className="space-y-2">
                          <Label>计划数量</Label>
                          <Input value={formData.quantity || ""} readOnly className="bg-muted/40" />
                        </div>
                        <div className="space-y-2">
                          <Label>检验数量</Label>
                          <Input value={String(formData.samplingQty || 0)} readOnly className="bg-muted/40" />
                        </div>
                        <div className="space-y-2">
                          <Label>放行数量</Label>
                          <Input
                            value={formData.releaseForm.releaseQty}
                            onChange={(e) => setFormData((prev) => ({
                              ...prev,
                              releaseForm: { ...prev.releaseForm, releaseQty: e.target.value },
                            }))}
                            placeholder="输入放行数量"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">审核内容</div>
                        <Button variant="link" className="h-auto px-0 text-primary" onClick={() => setActiveTab("items")}>
                          &gt;&gt; 查看批相关记录
                        </Button>
                      </div>

                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-14 text-center">Item</TableHead>
                              <TableHead className="w-[180px]">项目</TableHead>
                              <TableHead>审核标准</TableHead>
                              <TableHead className="w-[200px] text-center">审核</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.releaseForm.reviewItems.map((item, index) => (
                              <TableRow key={`release-form-${index}`}>
                                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{item.reviewStandard}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-6 text-sm">
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`release-review-${index}`}
                                        checked={item.decision === "qualified"}
                                        onChange={() => setFormData((prev) => ({
                                          ...prev,
                                          releaseForm: {
                                            ...prev.releaseForm,
                                            reviewItems: prev.releaseForm.reviewItems.map((current, currentIndex) => (
                                              currentIndex === index ? { ...current, decision: "qualified" } : current
                                            )),
                                          },
                                        }))}
                                      />
                                      合格
                                    </label>
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`release-review-${index}`}
                                        checked={item.decision === "unqualified"}
                                        onChange={() => setFormData((prev) => ({
                                          ...prev,
                                          releaseForm: {
                                            ...prev.releaseForm,
                                            reviewItems: prev.releaseForm.reviewItems.map((current, currentIndex) => (
                                              currentIndex === index ? { ...current, decision: "unqualified" } : current
                                            )),
                                          },
                                        }))}
                                      />
                                      不合格
                                    </label>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>审核结论</Label>
                          <div className="flex flex-wrap gap-6 text-sm">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="release-decision"
                                checked={formData.releaseForm.decision === "approve"}
                                onChange={() => setFormData((prev) => ({
                                  ...prev,
                                  releaseForm: { ...prev.releaseForm, decision: "approve" },
                                }))}
                              />
                              同意放行
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="release-decision"
                                checked={formData.releaseForm.decision === "supplement"}
                                onChange={() => setFormData((prev) => ({
                                  ...prev,
                                  releaseForm: { ...prev.releaseForm, decision: "supplement" },
                                }))}
                              />
                              补充资料后放行
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="release-decision"
                                checked={formData.releaseForm.decision === "reject"}
                                onChange={() => setFormData((prev) => ({
                                  ...prev,
                                  releaseForm: { ...prev.releaseForm, decision: "reject" },
                                  result: "unqualified",
                                }))}
                              />
                              不同意放行
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>审核备注</Label>
                          <Textarea
                            value={formData.releaseForm.remark}
                            onChange={(e) => setFormData((prev) => ({
                              ...prev,
                              releaseForm: { ...prev.releaseForm, remark: e.target.value },
                            }))}
                            placeholder="输入放行审核备注"
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="signatures" className="mt-5">
                      {!isEditing || !selectedRecord ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                          <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                        </div>
                      ) : (
                        <SignatureStatusCard
                          documentType="OQC"
                          documentNo={selectedRecord.inspectionNo}
                          documentId={selectedRecord.id}
                          signatures={selectedRecord.signatures || []}
                          onSignComplete={handleSignComplete}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="notes" className="mt-5">
                      <Textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="输入备注信息"
                        rows={6}
                        className="resize-none"
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <DraggableDialog
              open={itemRecordDialogOpen}
              onOpenChange={setItemRecordDialogOpen}
              isMaximized={itemRecordDialogMaximized}
              onMaximizedChange={setItemRecordDialogMaximized}
            >
              <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-6 p-1">
                  <DialogHeader>
                    <DialogTitle>录入检验项目记录</DialogTitle>
                  </DialogHeader>

                  {activeItemIndex !== null && formData.inspectionItems[activeItemIndex] ? (
                    <>
                      <Card>
                        <CardContent className="p-5 md:p-6 space-y-6">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h2 className="text-2xl font-bold">{formData.inspectionItems[activeItemIndex].name || "单项检验记录"}</h2>
                              <p className="mt-1 text-sm text-muted-foreground">
                                单项检验可先保存为“检验中”，适合无菌检验等长周期项目持续补录
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{formData.productName || "未选择产品"}</Badge>
                              <Badge variant="outline">{formData.batchNo || "未填写批次"}</Badge>
                              <Badge variant="outline" className={getInspectionItemStatus(formData.inspectionItems[activeItemIndex]).className}>
                                {getInspectionItemStatus(formData.inspectionItems[activeItemIndex]).label}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <div className="mb-3 text-sm font-medium">基础信息</div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="space-y-2">
                                <Label>产品名称</Label>
                                <Input value={formData.productName} readOnly className="bg-muted/40" />
                              </div>
                              <div className="space-y-2">
                                <Label>生产批号</Label>
                                <Input value={formData.batchNo} readOnly className="bg-muted/40 font-mono" />
                              </div>
                              <div className="space-y-2">
                                <Label>检验项目</Label>
                                <Input value={formData.inspectionItems[activeItemIndex].name} readOnly className="bg-muted/40" />
                              </div>
                              <div className="space-y-2">
                                <Label>灭菌批号</Label>
                                <Input value={formData.sterilizationBatchNo || ""} readOnly className="bg-muted/40 font-mono" placeholder="自动带入" />
                              </div>
                              <div className="space-y-2">
                                <Label>检验员</Label>
                                <Select
                                  value={itemRecordForm.inspector || undefined}
                                  onValueChange={(value) => setItemRecordForm((prev) => ({ ...prev, inspector: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择检验员" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {inspectorOptions.map((name) => (
                                      <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>检验时间</Label>
                                <Input
                                  type="datetime-local"
                                  value={itemRecordForm.inspectionTime}
                                  onChange={(e) => setItemRecordForm((prev) => ({ ...prev, inspectionTime: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>当前记录数</Label>
                                <Input value={String(formData.inspectionItems[activeItemIndex].records?.length || 0)} readOnly className="bg-muted/40" />
                              </div>
                              <div className="space-y-2">
                                <Label>本次结论</Label>
                                <Input value={getConclusionLabel(calcDetailConclusion(itemRecordForm.details))} readOnly className="bg-muted/40" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="mb-3 text-sm font-medium">检验要求</div>
                            <Textarea
                              value={formData.inspectionItems[activeItemIndex].standard}
                              readOnly
                              rows={4}
                              className="resize-none bg-muted/40"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {(formData.inspectionItems[activeItemIndex].children?.length || 0) > 0 && (
                        <Card>
                          <CardContent className="p-5 md:p-6">
                            <div className="mb-3 text-sm font-medium">二级检验明细</div>
                            <div className="overflow-hidden rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead className="w-[220px]">明细名称</TableHead>
                                    <TableHead>检验要求</TableHead>
                                    <TableHead className="w-[180px]">备注</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(formData.inspectionItems[activeItemIndex].children || []).map((child, childIndex) => (
                                    <TableRow key={`${child.name}-${childIndex}`}>
                                      <TableCell className="text-muted-foreground">{childIndex + 1}</TableCell>
                                      <TableCell className="font-medium">{child.name || `明细${childIndex + 1}`}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{child.standard || "-"}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{child.remark || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardContent className="p-5 md:p-6">
                          <div className="mb-3 text-sm font-medium">本次录入</div>
                          <div className="overflow-hidden rounded-lg border">
                          <Table className="table-fixed">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                  <TableHead className="w-[260px]">项目名称</TableHead>
                                  <TableHead className="w-[240px]">检验要求</TableHead>
                                  <TableHead className="w-[100px]">样本量</TableHead>
                                  <TableHead className="w-[280px]">数值录入</TableHead>
                                  <TableHead className="w-[120px]">结果</TableHead>
                                  <TableHead className="w-[80px]">附件</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {itemRecordForm.details.map((detail, detailIndex) => (
                                  <TableRow key={`${detail.name}-${detailIndex}`}>
                                    <TableCell className="text-muted-foreground">{detailIndex + 1}</TableCell>
                                    <TableCell className="max-w-[260px] whitespace-normal break-words leading-tight font-medium align-top">{detail.name || `明细${detailIndex + 1}`}</TableCell>
                                    <TableCell className="max-w-[240px] whitespace-pre-wrap break-words text-sm text-muted-foreground align-top">{detail.standard || "-"}</TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={detail.sampleQty}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value, 10) || 1;
                                          setItemRecordForm((prev) => ({
                                            ...prev,
                                            details: prev.details.map((item, index) => (
                                              index === detailIndex
                                                ? { ...item, sampleQty: value, sampleValues: resizeSampleValues(item.sampleValues, value) }
                                                : item
                                            )),
                                          }));
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                        {resizeSampleValues(detail.sampleValues, detail.sampleQty).map((sampleValue, sampleIndex) => (
                                          <Input
                                            key={`${detailIndex}-${sampleIndex}`}
                                            value={sampleValue}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setItemRecordForm((prev) => ({
                                                ...prev,
                                                details: prev.details.map((item, index) => (
                                                  index === detailIndex
                                                    ? {
                                                        ...item,
                                                        sampleValues: resizeSampleValues(item.sampleValues, item.sampleQty).map((current, valueIndex) => (
                                                          valueIndex === sampleIndex ? value : current
                                                        )),
                                                      }
                                                    : item
                                                )),
                                              }));
                                            }}
                                            placeholder={`第${sampleIndex + 1}组`}
                                          />
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={detail.conclusion}
                                        onValueChange={(value) => {
                                          setItemRecordForm((prev) => ({
                                            ...prev,
                                            details: prev.details.map((item, index) => (
                                              index === detailIndex
                                                ? { ...item, conclusion: value as InspectionItemRecordDetail["conclusion"] }
                                                : item
                                            )),
                                          }));
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">检验中</SelectItem>
                                          <SelectItem value="qualified">合格</SelectItem>
                                          <SelectItem value="unqualified">不合格</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          className={`p-1 rounded border transition-colors ${
                                            detail.attachments?.length
                                              ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                                              : "hover:bg-muted"
                                          }`}
                                          title="上传附件"
                                          onClick={() => detailAttachmentInputRefs.current[`${activeItemIndex}-${detailIndex}`]?.click()}
                                        >
                                          <Paperclip className={`h-4 w-4 ${detail.attachments?.length ? "text-emerald-600" : "text-muted-foreground"}`} />
                                        </button>
                                        <input
                                          ref={(node) => { detailAttachmentInputRefs.current[`${activeItemIndex}-${detailIndex}`] = node; }}
                                          type="file"
                                          className="hidden"
                                          multiple
                                          onChange={(e) => handleDetailAttachmentUpload(detailIndex, e.target.files)}
                                        />
                                        <span className={`text-xs whitespace-nowrap ${detail.attachments?.length ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                                          {detail.attachments?.length || 0}
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="rounded-lg border bg-muted/10 p-4 text-sm space-y-2">
                        <div className="font-medium">FDA 电子记录要求</div>
                        <div className="text-muted-foreground">本次录入作为电子记录保存，样本数据、结论、检验员、时间戳与附件将一并留痕。</div>
                        <div className="text-muted-foreground">修改或补录时继续追加记录，不覆盖原始数据，满足审计追踪要求。</div>
                      </div>
                    </>
                  ) : null}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setItemRecordDialogOpen(false)}>取消</Button>
                    <Button onClick={saveItemRecord}>保存记录</Button>
                  </DialogFooter>
                </div>
              </DraggableDialogContent>
            </DraggableDialog>
          </div>
        </div>
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <div className="p-6 space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PackageCheck className="w-6 h-6" />
              成品检验 (OQC)
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              出货前成品质量检验，关联灭菌单与生产入库申请
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetch(); refetchWarehouseEntries(); }}>
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              新建检验
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">检验总数</p><p className="text-2xl font-bold">{currentListData.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待检/检验中</p><p className="text-2xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">合格</p><p className="text-2xl font-bold text-green-600">{qualifiedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">不合格</p><p className="text-2xl font-bold text-red-600">{unqualifiedCount}</p></CardContent></Card>
        </div>

        <div className="space-y-4">
          <Tabs value={listTab} onValueChange={setListTab}>
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-300 bg-transparent px-0 py-0">
              <TabsTrigger
                value="report"
                className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none"
              >
                成品检验报告
              </TabsTrigger>
              <TabsTrigger
                value="record"
                className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none"
              >
                成品检验记录
              </TabsTrigger>
              <TabsTrigger
                value="bioburden"
                className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none"
              >
                初始污染菌检测记录
              </TabsTrigger>
              <TabsTrigger
                value="sterility"
                className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none"
              >
                无菌检验记录
              </TabsTrigger>
              <TabsTrigger
                value="release"
                className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none"
              >
                成品放行记录
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 搜索和筛选 */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={
                  listTab === "report"
                    ? "搜索检验单号、产品名称、批次号、入库申请单..."
                    : listTab === "record"
                      ? "搜索检验单号、产品名称、批次号..."
                      : listTab === "bioburden"
                        ? "搜索初始污染菌检测记录..."
                        : listTab === "sterility"
                          ? "搜索无菌检验记录..."
                          : "搜索成品放行记录..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待检</SelectItem>
                <SelectItem value="inspecting">检验中</SelectItem>
                <SelectItem value="qualified">合格</SelectItem>
                <SelectItem value="unqualified">不合格</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 数据表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>检验单号</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead className="font-bold">
                  {listTab === "bioburden" ? "生产批号" : <><span>生产批号</span><span className="text-xs text-muted-foreground ml-1">(唯一追溯)</span></>}
                </TableHead>
                {listTab === "bioburden" ? (
                  <>
                    <TableHead>规格型号</TableHead>
                    <TableHead>完成日期</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>灭菌批号</TableHead>
                    <TableHead>入库申请单</TableHead>
                    <TableHead className="text-right">批量</TableHead>
                    <TableHead className="text-right">留样</TableHead>
                  </>
                )}
                <TableHead>检验日期</TableHead>
                {listTab === "bioburden" ? <TableHead>检验员</TableHead> : null}
                <TableHead>{listTab === "release" ? "放行状态" : "结果"}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((record) => (
                <TableRow key={`${record.sourceType || "inspection"}-${record.id}`} className="cursor-pointer hover:bg-muted/30" onClick={() => handleView(record)}>
                  <TableCell className="font-mono text-sm">
                    {record.inspectionNo ? record.inspectionNo : <span className="text-muted-foreground">待创建</span>}
                  </TableCell>
                  <TableCell className="font-medium">{record.productName}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm font-semibold text-primary">{record.batchNo}</span>
                  </TableCell>
                  {listTab === "bioburden" ? (
                    <>
                      <TableCell>{record.bioburdenForm?.specModel || "-"}</TableCell>
                      <TableCell>{formatDateValue(record.bioburdenForm?.completionDate || "")}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.sterilizationBatchNo ? (
                          <span className="font-mono text-orange-600">{record.sterilizationBatchNo}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.warehouseEntryNo ? (
                          <span className="font-mono text-emerald-600">{record.warehouseEntryNo}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatDisplayQty(record.quantity)} {record.unit}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatDisplayQty(record.sampleRetainQty || 0)}</TableCell>
                    </>
                  )}
                  <TableCell>{formatDateValue(record.inspectionDate)}</TableCell>
                  {listTab === "bioburden" ? <TableCell>{record.inspector || "-"}</TableCell> : null}
                  <TableCell>
                    {(() => {
                      const scopedStatus = getTabScopedStatusMeta(record, listTab);
                      return (
                        <Badge
                          variant={scopedStatus.variant}
                          className={scopedStatus.className}
                        >
                          {scopedStatus.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {record.sourceType === "warehouse_entry" ? (
                          <DropdownMenuItem onClick={() => handleCreateFromWarehouseEntry(record)}>
                            <Plus className="h-4 w-4 mr-2" />新建检验
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleView(record)}>
                              <Eye className="h-4 w-4 mr-2" />查看
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="h-4 w-4 mr-2" />编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(record)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />删除
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={listTab === "bioburden" ? 9 : 10} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {filteredData.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} 条，
              共 {filteredData.length} 条，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                上一页
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 新建/编辑表单对话框 */}
        <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto p-0">
            <div className="space-y-6">
              <div className="border-b bg-background px-6 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "新建成品检验"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">统一录入成品检验基础信息、检验项目与放行结论</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{formData.warehouseEntryNo ? "已关联入库申请" : "未关联入库申请"}</Badge>
                    <Badge variant="outline">{formData.sterilizationOrderNo ? "已关联灭菌单" : "未关联灭菌单"}</Badge>
                    <Badge variant={statusMap[formData.result]?.variant || "outline"} className={getStatusSemanticClass(formData.result, statusMap[formData.result]?.label)}>
                      {statusMap[formData.result]?.label || formData.result}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-6">
                <Card>
                  <CardContent className="p-5 md:p-6 space-y-6">
                    <div>
                      <div className="mb-3 flex items-center gap-1 text-sm font-medium">
                        <Link2 className="h-4 w-4 text-emerald-500" />
                        关联生产入库申请
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>选择生产入库申请</Label>
                          <Select
                            value={formData.warehouseEntryId || NO_WAREHOUSE_ENTRY_VALUE}
                            onValueChange={handleWarehouseEntryChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择入库申请（自动填充产品信息）" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_WAREHOUSE_ENTRY_VALUE}>不关联</SelectItem>
                              {(productionWarehouseEntriesData as any[]).map((entry: any) => (
                                <SelectItem key={entry.id} value={String(entry.id)}>
                                  {entry.entryNo} — {entry.productName || "-"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>入库申请号</Label>
                          <Input value={formData.warehouseEntryNo} readOnly className="bg-muted/50 font-mono" placeholder="未关联" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="mb-3 text-sm font-medium">基础信息</div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2">
                          <Label>产品编码</Label>
                          <Input
                            value={formData.productCode}
                            onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                            placeholder="如: MD-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>产品名称 *</Label>
                          <Input
                            value={formData.productName}
                            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                            placeholder="输入产品名称"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>批次号 *</Label>
                          <Input
                            value={formData.batchNo}
                            onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                            placeholder="输入批次号"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>批量 *</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                              placeholder="数量"
                              className="flex-1"
                            />
                            <Select
                              value={formData.unit}
                              onValueChange={(v) => setFormData({ ...formData, unit: v })}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="支">支</SelectItem>
                                <SelectItem value="只">只</SelectItem>
                                <SelectItem value="双">双</SelectItem>
                                <SelectItem value="套">套</SelectItem>
                                <SelectItem value="个">个</SelectItem>
                                <SelectItem value="盒">盒</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>抽样数量</Label>
                          <Input
                            type="number"
                            value={formData.samplingQty}
                            onChange={(e) => setFormData({ ...formData, samplingQty: parseInt(e.target.value) || 0 })}
                            placeholder="抽样数量"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-orange-500" />
                            灭菌批号
                          </Label>
                          <Input
                            value={formData.sterilizationBatchNo}
                            readOnly
                            className="bg-muted/50 font-mono"
                            placeholder="自动带入"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-blue-500" />
                            留样数量
                          </Label>
                          <Input
                            type="number"
                            value={formData.sampleRetainQty}
                            onChange={(e) => setFormData({ ...formData, sampleRetainQty: parseInt(e.target.value) || 0 })}
                            placeholder="留样数量"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>检验日期</Label>
                          <Input
                            type="date"
                            value={formData.inspectionDate}
                            onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>检验员</Label>
                          <Select
                            value={formData.inspector || undefined}
                            onValueChange={(value) => setFormData({ ...formData, inspector: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="默认当天用户，也可选择人事人员" />
                            </SelectTrigger>
                            <SelectContent>
                              {inspectorOptions.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>检验结果</Label>
                          <Select
                            value={formData.result}
                            onValueChange={(v) => setFormData({ ...formData, result: v as OQCRecord["result"] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">待检验</SelectItem>
                              <SelectItem value="inspecting">检验中</SelectItem>
                              <SelectItem value="qualified">合格</SelectItem>
                              <SelectItem value="unqualified">不合格</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 md:p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                        <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                          检验项目 {formData.inspectionItems.length > 0 && `(${formData.inspectionItems.length})`}
                        </TabsTrigger>
                        <TabsTrigger value="signatures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                          电子签名
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                          备注
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="items" className="mt-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">选择产品后会自动带入成品检验要求，也可手动增减检验项目</div>
                          <Button variant="outline" size="sm" onClick={addInspectionItem}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加项目
                          </Button>
                        </div>

                        {formData.inspectionItems.length === 0 ? (
                          <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                            暂无检验项目，点击“添加项目”开始录入
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-10">#</TableHead>
                                  <TableHead className="w-[180px]">项目名称</TableHead>
                                  <TableHead>检验要求</TableHead>
                                  <TableHead className="w-[120px]">状态/结论</TableHead>
                                  <TableHead className="w-[80px]">记录数</TableHead>
                                  <TableHead className="w-[120px]">操作</TableHead>
                                  <TableHead className="w-10" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {formData.inspectionItems.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>
                                      <Input
                                        value={item.name}
                                        onChange={(e) => updateInspectionItem(index, "name", e.target.value)}
                                        placeholder="项目名称"
                                      />
                                      {item.children?.length ? (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          {getInspectionItemChildrenSummary(item.children)}
                                        </div>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      <Textarea
                                        value={item.standard}
                                        onChange={(e) => updateInspectionItem(index, "standard", e.target.value)}
                                        placeholder="检验要求"
                                        rows={3}
                                        className="min-h-[72px] resize-none border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0"
                                      />
                                      {item.children?.length ? (
                                        <div className="mt-2 rounded-md border bg-muted/20 p-2 space-y-1">
                                          {item.children.map((child, childIndex) => (
                                            <div key={`${child.name}-${childIndex}`} className="text-xs">
                                              <span className="font-medium">{child.name || `明细${childIndex + 1}`}</span>
                                              {child.standard ? <span className="text-muted-foreground">：{child.standard}</span> : null}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={getInspectionItemStatus(item).className}>
                                        {getInspectionItemStatus(item).label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{item.records?.length || 0}</TableCell>
                                    <TableCell>
                                      <Button variant="outline" size="sm" onClick={() => openItemRecordDialog(index)}>
                                        录入记录
                                      </Button>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => removeInspectionItem(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="signatures" className="mt-5">
                        {!isEditing || !selectedRecord ? (
                          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                            <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                          </div>
                        ) : (
                          <SignatureStatusCard
                            documentType="OQC"
                            documentNo={selectedRecord.inspectionNo}
                            documentId={selectedRecord.id}
                            signatures={selectedRecord.signatures || []}
                            onSignComplete={handleSignComplete}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="notes" className="mt-5">
                        <Textarea
                          value={formData.remarks}
                          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          placeholder="输入备注信息"
                          rows={6}
                          className="resize-none"
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {isEditing ? "保存" : "创建"}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情与电子签名对话框 */}
        {selectedRecord && (
          <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
              <div className="space-y-4">
                {/* 标准头部 */}
                <div className="border-b pb-3">
                  <h2 className="text-lg font-semibold">成品检验详情</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.inspectionNo}
                    {selectedRecord.result && (
                      <>
                        {" · "}
                        <Badge
                          variant={statusMap[selectedRecord.result]?.variant || "outline"}
                          className={`ml-1 ${getStatusSemanticClass(selectedRecord.result, statusMap[selectedRecord.result]?.label)}`}
                        >
                          {statusMap[selectedRecord.result]?.label || String(selectedRecord.result ?? "-")}
                        </Badge>
                      </>
                    )}
                    {selectedRecord.signatures?.filter((s: any) => s.status === "valid").length >= 2 && (
                      <Badge className="bg-green-100 text-green-800 ml-2">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        已放行
                      </Badge>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {/* 左侧信息 */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">检验信息</h3>
                      <div className="space-y-1">
                        <FieldRow label="产品名称">{selectedRecord.productName}</FieldRow>
                        <FieldRow label="产品编码">{selectedRecord.productCode || "-"}</FieldRow>
                        <FieldRow label="批次号">{selectedRecord.batchNo}</FieldRow>
                        <FieldRow label="批量">{formatDisplayQty(selectedRecord.quantity)} {selectedRecord.unit}</FieldRow>
                        <FieldRow label="抽样数量">{formatDisplayQty(selectedRecord.samplingQty)}</FieldRow>
                        <FieldRow label="灭菌批号">{selectedRecord.sterilizationBatchNo || "-"}</FieldRow>
                        <FieldRow label="留样数量">{formatDisplayQty(selectedRecord.sampleRetainQty || 0)}</FieldRow>
                        <FieldRow label="检验日期">{formatDateValue(selectedRecord.inspectionDate)}</FieldRow>
                        <FieldRow label="检验员">{selectedRecord.inspector || "-"}</FieldRow>
                      </div>
                    </div>

                    {/* 关联信息 */}
                    {(selectedRecord.warehouseEntryNo || selectedRecord.sterilizationOrderNo || selectedRecord.productionOrderNo) && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">关联单据</h3>
                        <div className="space-y-1">
                          {selectedRecord.warehouseEntryNo && (
                            <FieldRow label="入库申请">
                              <span className="font-mono text-emerald-600">{selectedRecord.warehouseEntryNo}</span>
                            </FieldRow>
                          )}
                          {selectedRecord.sterilizationOrderNo && (
                            <FieldRow label="灭菌单">
                              <span className="font-mono text-orange-600">{selectedRecord.sterilizationOrderNo}</span>
                            </FieldRow>
                          )}
                          {selectedRecord.productionOrderNo && (
                            <FieldRow label="生产指令">
                              <span className="font-mono">{selectedRecord.productionOrderNo}</span>
                            </FieldRow>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedRecord.remarks && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remarks}</p>
                      </div>
                    )}

                    {/* 放行说明 */}
                    {selectedRecord.signatures?.filter((s: any) => s.status === "valid").length >= 2 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">放行说明</h3>
                        <div className="bg-green-50 rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                            <ShieldCheck className="h-4 w-4" />
                            产品已放行
                          </div>
                          <p className="text-green-700 text-xs">
                            该批次产品已通过全部检验项目，并经检验员、复核员二级电子签名确认，符合放行条件。
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 右侧签名与项目 */}
                  <div className="space-y-4">
                    <RecordSignaturePreview
                      title="检验员签名"
                      signerName={selectedRecord.inspector || "-"}
                      signatureImageUrl={selectedInspectorSignatureUrl}
                    />
                    {/* 电子签名状态 */}
                    <SignatureStatusCard
                      documentType="OQC"
                      documentNo={selectedRecord.inspectionNo}
                      documentId={selectedRecord.id}
                      signatures={selectedRecord.signatures || []}
                      onSignComplete={handleSignComplete}
                    />
                  </div>
                </div>

                {/* 检验项目 */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">检验项目</h3>
                  <div className="mt-2 space-y-2">
                    {selectedRecord.inspectionItems.length > 0 ? (
                      selectedRecord.inspectionItems.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground ml-2">({item.standard || "N/A"})</span>
                            {item.children?.length ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {getInspectionItemChildrenSummary(item.children)}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{item.result}</span>
                            <Badge
                              variant="outline"
                              className={
                                item.conclusion === "qualified"
                                  ? "text-green-600 border-green-300"
                                  : item.conclusion === "unqualified"
                                  ? "text-red-600 border-red-300"
                                  : "text-gray-600"
                              }
                            >
                              {item.conclusion === "qualified"
                                ? "合格"
                                : item.conclusion === "unqualified"
                                ? "不合格"
                                : "待定"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">暂无检验项目</p>
                    )}
                  </div>
                </div>

                {/* 标准操作按钮 */}
                <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                  <div className="flex gap-2 flex-wrap">{/* 左侧功能按钮 */}</div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
                  </div>
                </div>
              </div>
            </DraggableDialogContent>
          </DraggableDialog>
        )}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确认删除检验单 {recordToDelete?.inspectionNo || ""} 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRecordToDelete(null)}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (recordToDelete) {
                    deleteMutation.mutate({ id: recordToDelete.id });
                  }
                  setDeleteDialogOpen(false);
                  setRecordToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ERPLayout>
  );
}
