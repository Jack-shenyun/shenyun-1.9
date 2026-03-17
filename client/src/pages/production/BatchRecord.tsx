import { formatDate, formatDateTime, formatDisplayNumber } from "@/lib/formatters";
import { isValidElement, useState } from "react";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
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
import {
  Search, FileText, ChevronRight, Package, FlaskConical, Warehouse,
  ShoppingCart, Banknote, Flame, ClipboardList, ArrowRightLeft,
  CheckCircle2, XCircle, AlertCircle, Clock, Thermometer, Wrench, Trash2,
} from "lucide-react";

// ========== 状态标签映射 ==========
const productionStatusMap: Record<string, { label: string; color: string }> = {
  draft:       { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  planned:     { label: "已计划", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "生产中", color: "bg-yellow-100 text-yellow-700" },
  completed:   { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled:   { label: "已取消", color: "bg-red-100 text-red-600" },
};

const sterilizationStatusMap: Record<string, { label: string; color: string }> = {
  draft:       { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  sent:        { label: "已发出", color: "bg-blue-100 text-blue-700" },
  processing:  { label: "灭菌中", color: "bg-yellow-100 text-yellow-700" },
  arrived:     { label: "已到货", color: "bg-purple-100 text-purple-700" },
  returned:    { label: "已返回", color: "bg-indigo-100 text-indigo-700" },
  qualified:   { label: "合格",   color: "bg-green-100 text-green-700" },
  unqualified: { label: "不合格", color: "bg-red-100 text-red-600" },
};

const inspectionResultMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  qualified:   { label: "合格",   color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  unqualified: { label: "不合格", color: "bg-red-100 text-red-600",     icon: <XCircle className="h-3.5 w-3.5" /> },
  conditional: { label: "有条件", color: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const warehouseEntryStatusMap: Record<string, { label: string; color: string }> = {
  draft:    { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  pending:  { label: "待审批", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "已审批", color: "bg-blue-100 text-blue-700" },
  completed:{ label: "已入库", color: "bg-green-100 text-green-700" },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-600" },
};

const recordTypeMap: Record<string, { label: string; icon: React.ReactNode }> = {
  general:             { label: "通用记录",   icon: <ClipboardList className="h-4 w-4" /> },
  temperature_humidity:{ label: "温湿度记录", icon: <Thermometer className="h-4 w-4" /> },
  material_usage:      { label: "材料使用",   icon: <Package className="h-4 w-4" /> },
  clean_room:          { label: "清场记录",   icon: <Wrench className="h-4 w-4" /> },
  first_piece:         { label: "首件检验",   icon: <FlaskConical className="h-4 w-4" /> },
};

const customsStatusMap: Record<string, { label: string; color: string }> = {
  preparing: { label: "准备中", color: "bg-gray-100 text-gray-600" },
  submitted: { label: "已申报", color: "bg-blue-100 text-blue-700" },
  cleared:   { label: "已放行", color: "bg-green-100 text-green-700" },
  shipped:   { label: "已出运", color: "bg-purple-100 text-purple-700" },
};

const purchaseOrderStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  approved: { label: "已审批", color: "bg-blue-100 text-blue-700" },
  ordered: { label: "已下单", color: "bg-indigo-100 text-indigo-700" },
  partial_received: { label: "部分到货", color: "bg-yellow-100 text-yellow-700" },
  received: { label: "已收货", color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-600" },
};

const goodsReceiptStatusMap: Record<string, { label: string; color: string }> = {
  pending_inspection: { label: "待检验", color: "bg-yellow-100 text-yellow-700" },
  inspecting: { label: "检验中", color: "bg-blue-100 text-blue-700" },
  passed: { label: "检验合格", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "检验不合格", color: "bg-red-100 text-red-600" },
  warehoused: { label: "已入库", color: "bg-green-100 text-green-700" },
};

const supplierStatusMap: Record<string, { label: string; color: string }> = {
  qualified: { label: "合格", color: "bg-green-100 text-green-700" },
  pending: { label: "待评估", color: "bg-yellow-100 text-yellow-700" },
  disqualified: { label: "不合格", color: "bg-red-100 text-red-600" },
};

const iqcResultStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待判定", color: "bg-gray-100 text-gray-600" },
  passed: { label: "合格", color: "bg-green-100 text-green-700" },
  failed: { label: "不合格", color: "bg-red-100 text-red-600" },
  conditional_pass: { label: "有条件放行", color: "bg-yellow-100 text-yellow-700" },
};

const equipmentInspectionStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
};

const equipmentInspectionResultMap: Record<string, { label: string; color: string }> = {
  normal: { label: "正常", color: "bg-emerald-100 text-emerald-700" },
  abnormal: { label: "异常", color: "bg-amber-100 text-amber-700" },
  shutdown: { label: "停机", color: "bg-rose-100 text-rose-700" },
};

const equipmentMaintenanceStatusMap: Record<string, { label: string; color: string }> = {
  planned: { label: "已计划", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
};

const equipmentMaintenanceResultMap: Record<string, { label: string; color: string }> = {
  pass: { label: "通过", color: "bg-emerald-100 text-emerald-700" },
  need_repair: { label: "需维修", color: "bg-amber-100 text-amber-700" },
  pending: { label: "待判定", color: "bg-gray-100 text-gray-600" },
};

const shippingMethodLabelMap: Record<string, string> = {
  sea: "海运",
  air: "空运",
  land: "陆运",
  express: "快递",
};

const stagingTxTypeLabelMap: Record<string, { label: string; color: string }> = {
  other_in: { label: "领料入暂存区", color: "text-cyan-600" },
  production_out: { label: "工序使用", color: "text-orange-600" },
  other_out: { label: "报废处理出暂存区", color: "text-rose-600" },
};

const sampleStatusMap: Record<string, { label: string; color: string }> = {
  stored: { label: "在库", color: "bg-green-100 text-green-700" },
  testing: { label: "检测中", color: "bg-blue-100 text-blue-700" },
  used: { label: "已使用", color: "bg-slate-100 text-slate-700" },
  expired: { label: "已过期", color: "bg-amber-100 text-amber-700" },
  destroyed: { label: "已销毁", color: "bg-rose-100 text-rose-700" },
};

const labRecordStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  testing: { label: "检测中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700" },
  reviewed: { label: "已复核", color: "bg-violet-100 text-violet-700" },
};

const labConclusionMap: Record<string, { label: string; color: string }> = {
  pass: { label: "合格", color: "bg-emerald-100 text-emerald-700" },
  fail: { label: "不合格", color: "bg-rose-100 text-rose-700" },
  pending: { label: "待判定", color: "bg-gray-100 text-gray-600" },
};

const udiStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待打印", color: "bg-gray-100 text-gray-600" },
  printing: { label: "打印中", color: "bg-blue-100 text-blue-700" },
  printed: { label: "已打印", color: "bg-emerald-100 text-emerald-700" },
  used: { label: "已使用", color: "bg-indigo-100 text-indigo-700" },
  recalled: { label: "已召回", color: "bg-rose-100 text-rose-700" },
};

const receivableStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待收款", color: "bg-amber-100 text-amber-700" },
  partial: { label: "部分收款", color: "bg-blue-100 text-blue-700" },
  paid: { label: "已收款", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "已逾期", color: "bg-rose-100 text-rose-700" },
};

const payableStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待付款", color: "bg-amber-100 text-amber-700" },
  partial: { label: "部分付款", color: "bg-blue-100 text-blue-700" },
  paid: { label: "已付款", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "已逾期", color: "bg-rose-100 text-rose-700" },
};

const invoiceStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待收票", color: "bg-amber-100 text-amber-700" },
  received: { label: "已收票", color: "bg-blue-100 text-blue-700" },
  verified: { label: "已验真", color: "bg-violet-100 text-violet-700" },
  booked: { label: "已入账", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "已作废", color: "bg-rose-100 text-rose-700" },
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  pending_approval: { label: "待审批", color: "bg-amber-100 text-amber-700" },
  issued: { label: "已开票", color: "bg-emerald-100 text-emerald-700" },
  red_issued: { label: "已红冲", color: "bg-rose-100 text-rose-700" },
};

const scrapDisposalStatusMap: Record<string, { label: string; color: string }> = {
  generated: { label: "待处理", color: "bg-amber-100 text-amber-700" },
  processed: { label: "已处理", color: "bg-emerald-100 text-emerald-700" },
};

const releaseDecisionMap: Record<string, { label: string; color: string }> = {
  approve: { label: "同意放行", color: "bg-emerald-100 text-emerald-700" },
  supplement: { label: "补充资料后放行", color: "bg-amber-100 text-amber-700" },
  reject: { label: "不同意放行", color: "bg-rose-100 text-rose-700" },
};

const batchReviewStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-slate-100 text-slate-700" },
  pending: { label: "待审核", color: "bg-amber-100 text-amber-700" },
  approved: { label: "已通过", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已驳回", color: "bg-rose-100 text-rose-700" },
};

const completenessStatusMap: Record<string, { label: string; color: string }> = {
  complete: { label: "资料完整", color: "bg-emerald-100 text-emerald-700" },
  incomplete: { label: "资料缺失", color: "bg-rose-100 text-rose-700" },
};

const regulatoryReleaseStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-slate-100 text-slate-700" },
  released: { label: "已放行", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已驳回", color: "bg-rose-100 text-rose-700" },
};

const regulatoryDecisionMap: Record<string, { label: string; color: string }> = {
  approved: { label: "同意放行", color: "bg-emerald-100 text-emerald-700" },
  conditional: { label: "附条件放行", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "不予放行", color: "bg-rose-100 text-rose-700" },
};

function getRecordTypeLabel(record: {
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
  return recordTypeMap[String(record.recordType || "")]?.label || String(record.recordType || "-");
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const s = map[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>;
}

function parseJsonObject(raw: unknown) {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function parseJsonArray(raw: unknown) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDisplayValue(value: unknown): React.ReactNode {
  if (value == null || value === "") return "-";
  if (isValidElement(value)) return value;
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length > 0 ? value.join(" / ") : "-";
  return String(value);
}

function formatDateOnlyValue(value: unknown) {
  return formatDate(value) || "-";
}

function formatQtyValue(value: unknown, unit?: unknown) {
  if (value == null || value === "") return "-";
  const text = String(value).trim();
  const num = Number(text);
  const display = Number.isFinite(num) ? formatDisplayNumber(num) : text;
  return [display, String(unit || "").trim()].filter(Boolean).join(" ");
}

function getReleaseNo(inspectionNo: string) {
  if (!inspectionNo) return "自动生成";
  return inspectionNo.replace(/^OQC-/, "FX-");
}

function InfoRow({ label, value }: { label: string; value?: unknown }) {
  return (
    <div className="grid min-h-10 grid-cols-[112px_1fr] border-b border-slate-200 text-sm last:border-0">
      <span className="flex items-center bg-slate-50 px-3 text-slate-500">{label}</span>
      <span className="flex items-center px-3 font-medium text-slate-800">{formatDisplayValue(value)}</span>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 text-[#2d8ed8]">
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#e8f3fb]">{icon}</span>
      <span className="text-base font-semibold">{title}</span>
      {count !== undefined && (
        <Badge variant="secondary" className="ml-1 h-5 rounded-sm px-1.5 text-[11px]">{count}</Badge>
      )}
    </div>
  );
}

function EmptyDepartmentState({ label }: { label: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-12 text-center text-sm text-muted-foreground">
      暂无{label}记录
    </div>
  );
}

// ========== 批记录详情弹窗 ==========
function BatchRecordDetail({ batchNo, open, onClose }: { batchNo: string; open: boolean; onClose: () => void }) {
  const { data, isLoading, error } = trpc.batchRecord.getByBatchNo.useQuery(
    { batchNo },
    { enabled: open && !!batchNo }
  );
  const { data: productsData = [] } = trpc.products.list.useQuery();
  const getProductName = (productId?: number | null) => {
    if (!productId) return "-";
    const p = (productsData as any[]).find((p: any) => p.id === productId);
    return p?.name || `产品#${productId}`;
  };
  const headerOrderNo = data?.production.order?.orderNo || data?.sales.order?.orderNo || "-";
  const headerStatus = data?.production.order?.status
    ? productionStatusMap[data.production.order.status]?.label || data.production.order.status
    : "追溯中";
  const infrastructureLabRecords = data?.quality.infrastructureLabRecords || [];
  const salesHasData = Boolean(data?.sales.order)
    || (data?.sales.orderItems?.length || 0) > 0
    || (data?.sales.shipments?.length || 0) > 0
    || (data?.sales.customsDeclarations?.length || 0) > 0
    || (data?.sales.packingLists?.length || 0) > 0;
  const salesSectionCount =
    (data?.sales.order ? 1 : 0)
    + ((data?.sales.shipments?.length || 0) > 0 ? 1 : 0)
    + ((data?.sales.customsDeclarations?.length || 0) > 0 ? 1 : 0)
    + ((data?.sales.packingLists?.length || 0) > 0 ? 1 : 0);
  const purchaseHasData = (data?.purchase?.purchaseOrders?.length || 0) > 0
    || (data?.purchase?.goodsReceipts?.length || 0) > 0
    || (data?.purchase?.iqcInspections?.length || 0) > 0
    || (data?.purchase?.suppliers?.length || 0) > 0;
  const purchaseSectionCount =
    ((data?.purchase?.purchaseOrders?.length || 0) > 0 ? 1 : 0)
    + ((data?.purchase?.goodsReceipts?.length || 0) > 0 ? 1 : 0)
    + ((data?.purchase?.iqcInspections?.length || 0) > 0 ? 1 : 0)
    + ((data?.purchase?.suppliers?.length || 0) > 0 ? 1 : 0);
  const qualityHasData = (data?.quality.inspections?.length || 0) > 0
    || (data?.quality.samples?.length || 0) > 0
    || (data?.quality.labRecords?.length || 0) > 0
    || infrastructureLabRecords.length > 0
    || (data?.quality.incidents?.length || 0) > 0;
  const qualitySectionCount =
    ((data?.quality.inspections?.length || 0) > 0 ? 1 : 0)
    + (((data?.quality?.inspections || []).filter((ins: any) => String(ins.type || "") === "OQC").length || 0) > 0 ? 1 : 0)
    + ((data?.quality.samples?.length || 0) > 0 ? 1 : 0)
    + ((data?.quality.labRecords?.length || 0) > 0 ? 1 : 0)
    + (infrastructureLabRecords.length > 0 ? 1 : 0)
    + ((data?.quality.incidents?.length || 0) > 0 ? 1 : 0);
  const regulatoryHasData = (data?.regulatory?.udiLabels?.length || 0) > 0
    || (data?.regulatory?.batchReviewRecords?.length || 0) > 0
    || (data?.regulatory?.regulatoryReleaseRecords?.length || 0) > 0;
  const oqcReleaseRows = (data?.quality?.inspections || [])
    .filter((inspection: any) => String(inspection.type || "") === "OQC")
    .map((inspection: any) => {
      const extra = parseJsonObject(inspection.remark);
      const releaseForm = parseJsonObject(extra.releaseForm);
      const signatures = parseJsonArray(extra.signatures).filter(Boolean);
      return {
        ...inspection,
        releaseNo: getReleaseNo(String(inspection.inspectionNo || "")),
        releaseForm,
        signatures,
      };
    })
    .filter((inspection: any) => Object.keys(inspection.releaseForm || {}).length > 0);
  const pendingScrapRows = (data?.production?.scrapDisposals || []).filter((record: any) => String(record.status || "") === "generated");
  const processedScrapRows = (data?.production?.scrapDisposals || []).filter((record: any) => String(record.status || "") === "processed");

  return (
    <DraggableDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      defaultWidth={1440}
      defaultHeight={860}
      isMaximized={true}
    >
      <DraggableDialogContent className="w-full max-w-none overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>批记录详情</DialogTitle>
          <DialogDescription>以生产批号为主线的全链路追溯记录（只读）</DialogDescription>
        </DialogHeader>

        <div className="border-b bg-[#3b93cb] px-6 py-3 text-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <FileText className="h-5 w-5" />
              <span className="font-mono">{batchNo}</span>
            </div>
            <span className="inline-flex items-center rounded bg-[#facc15] px-2 py-0.5 text-sm font-semibold text-slate-900">
              {headerStatus}
            </span>
            <div className="ml-4 text-sm">
              指令单号：<span className="font-semibold">{headerOrderNo}</span>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-120px)] overflow-y-auto bg-[#f5f7fa] p-3">

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Clock className="h-5 w-5 mr-2 animate-spin" />加载中...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-12 text-destructive">
            <XCircle className="h-5 w-5 mr-2" />加载失败：{error.message}
          </div>
        )}

        {data && (
          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-300 bg-white px-0 py-0">
              <TabsTrigger value="sales" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">销售部</TabsTrigger>
              <TabsTrigger value="purchase" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">采购部</TabsTrigger>
              <TabsTrigger value="production" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">生产部</TabsTrigger>
              <TabsTrigger value="quality" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">质量部</TabsTrigger>
              <TabsTrigger value="warehouse" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">仓库管理</TabsTrigger>
              <TabsTrigger value="finance" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">财务部</TabsTrigger>
              <TabsTrigger value="regulatory" className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-slate-600 data-[state=active]:border-[#2d8ed8] data-[state=active]:bg-white data-[state=active]:text-[#2d8ed8] data-[state=active]:shadow-none">法规负责人</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-0">
              {salesHasData ? (
                <div className="space-y-4 border border-slate-200 bg-white p-4">
                  <SectionHeader
                    icon={<ShoppingCart className="h-4 w-4" />}
                    title="销售部"
                    count={salesSectionCount}
                  />
                  {data.sales.order && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">销售订单</p>
                      <div className="border border-slate-200 bg-white text-sm">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <InfoRow label="销售订单号" value={data.sales.order.orderNo} />
                          <InfoRow label="客户名称" value={data.sales.order.customerName} />
                          <InfoRow label="订单日期" value={formatDate(data.sales.order.orderDate)} />
                          <InfoRow label="交货日期" value={formatDate(data.sales.order.deliveryDate)} />
                          <InfoRow label="订单金额" value={data.sales.order.totalAmount ? `${data.sales.order.totalAmount} ${data.sales.order.currency || "CNY"}` : undefined} />
                          <InfoRow label="付款方式" value={data.sales.order.paymentMethod} />
                          <InfoRow label="业务员" value={data.sales.order.salesPersonName} />
                          <InfoRow label="订单状态" value={data.sales.order.status} />
                          <InfoRow label="收货地址" value={data.sales.order.shippingAddress} />
                          <InfoRow label="收货联系人" value={data.sales.order.shippingContact} />
                          <InfoRow label="收货电话" value={data.sales.order.shippingPhone} />
                          <InfoRow label="发货方式" value={data.sales.order.deliveryMethod} />
                        </div>
                      </div>
                      {(data.sales.orderItems?.length || 0) > 0 && (
                        <div className="border border-slate-200">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="text-center">产品名称</TableHead>
                                <TableHead className="text-center">规格型号</TableHead>
                                <TableHead className="text-center">订单数量</TableHead>
                                <TableHead className="text-center">已发货数量</TableHead>
                                <TableHead className="text-center">单位</TableHead>
                                <TableHead className="text-center">单价</TableHead>
                                <TableHead className="text-center">金额</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.sales.orderItems.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-center">{item.productName || getProductName(item.productId)}</TableCell>
                                  <TableCell className="text-center">{item.specification || "-"}</TableCell>
                                  <TableCell className="text-center">{item.quantity ?? "-"}</TableCell>
                                  <TableCell className="text-center">{item.deliveredQty ?? "-"}</TableCell>
                                  <TableCell className="text-center">{item.unit || "-"}</TableCell>
                                  <TableCell className="text-center">{item.unitPrice ?? "-"}</TableCell>
                                  <TableCell className="text-center">{item.amount ?? "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}

                  {(data.sales.shipments?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">发货/出库记录</p>
                      <div className="border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-center">单据号</TableHead>
                              <TableHead className="text-center">出库时间</TableHead>
                              <TableHead className="text-center">批号</TableHead>
                              <TableHead className="text-center">数量</TableHead>
                              <TableHead className="text-center">单位</TableHead>
                              <TableHead className="text-center">备注</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.sales.shipments.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-center font-mono">{item.documentNo || "-"}</TableCell>
                                <TableCell className="text-center">{item.createdAt ? formatDateTime(item.createdAt) : "-"}</TableCell>
                                <TableCell className="text-center font-mono">{item.batchNo || item.sterilizationBatchNo || "-"}</TableCell>
                                <TableCell className="text-center">{item.quantity ?? "-"}</TableCell>
                                <TableCell className="text-center">{item.unit || "-"}</TableCell>
                                <TableCell className="text-center">{item.remark || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {(data.sales.customsDeclarations?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">报关单</p>
                      <div className="border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-center">报关单号</TableHead>
                              <TableHead className="text-center">报关日期</TableHead>
                              <TableHead className="text-center">目的地</TableHead>
                              <TableHead className="text-center">运输方式</TableHead>
                              <TableHead className="text-center">数量</TableHead>
                              <TableHead className="text-center">状态</TableHead>
                              <TableHead className="text-center">物流单号</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.sales.customsDeclarations.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-center font-mono">{item.declarationNo || "-"}</TableCell>
                                <TableCell className="text-center">{formatDateOnlyValue(item.declarationDate)}</TableCell>
                                <TableCell className="text-center">{item.destination || "-"}</TableCell>
                                <TableCell className="text-center">{shippingMethodLabelMap[String(item.shippingMethod || "")] || String(item.shippingMethod || "-")}</TableCell>
                                <TableCell className="text-center">{item.quantity ? `${item.quantity} ${item.unit || ""}` : "-"}</TableCell>
                                <TableCell className="text-center">
                                  <StatusBadge status={String(item.status || "")} map={customsStatusMap} />
                                </TableCell>
                                <TableCell className="text-center">{item.trackingNo || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {(data.sales.packingLists?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">装箱单</p>
                      <div className="border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-center">装箱单号</TableHead>
                              <TableHead className="text-center">装箱日期</TableHead>
                              <TableHead className="text-center">包装方式</TableHead>
                              <TableHead className="text-center">数量</TableHead>
                              <TableHead className="text-center">目的地</TableHead>
                              <TableHead className="text-center">物流单号</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.sales.packingLists.map((item: any) => (
                              <TableRow key={`${item.declarationId}-${item.packingListNo}`}>
                                <TableCell className="text-center font-mono">{item.packingListNo || "-"}</TableCell>
                                <TableCell className="text-center">{formatDateOnlyValue(item.packingDate)}</TableCell>
                                <TableCell className="text-center">{item.packageType || "-"}</TableCell>
                                <TableCell className="text-center">{item.quantity ? `${item.quantity} ${item.unit || ""}` : "-"}</TableCell>
                                <TableCell className="text-center">{item.destination || "-"}</TableCell>
                                <TableCell className="text-center">{item.trackingNo || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyDepartmentState label="销售部" />
              )}
            </TabsContent>

            <TabsContent value="purchase" className="mt-0">
              {purchaseHasData ? (
                <div className="space-y-4 border border-slate-200 bg-white p-4">
                  <SectionHeader
                    icon={<ShoppingCart className="h-4 w-4" />}
                    title="采购部"
                    count={purchaseSectionCount}
                  />

                  {(data.purchase.purchaseOrders?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">采购订单</p>
                      <div className="border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-center">采购单号</TableHead>
                              <TableHead className="text-center">供应商</TableHead>
                              <TableHead className="text-center">订单日期</TableHead>
                              <TableHead className="text-center">预计到货</TableHead>
                              <TableHead className="text-center">订单金额</TableHead>
                              <TableHead className="text-center">状态</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.purchase.purchaseOrders.map((order: any) => (
                              <TableRow key={order.id}>
                                <TableCell className="text-center font-mono">{order.orderNo || "-"}</TableCell>
                                <TableCell className="text-center">{order.supplierName || "-"}</TableCell>
                                <TableCell className="text-center">{formatDateOnlyValue(order.orderDate)}</TableCell>
                                <TableCell className="text-center">{formatDateOnlyValue(order.expectedDate)}</TableCell>
                                <TableCell className="text-center">{order.totalAmount ? `${order.totalAmount} ${order.currency || "CNY"}` : "-"}</TableCell>
                                <TableCell className="text-center">
                                  <StatusBadge status={String(order.status || "")} map={purchaseOrderStatusMap} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {(data.purchase.goodsReceipts?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">到货记录</p>
                      <div className="border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-center">到货单号</TableHead>
                              <TableHead className="text-center">采购单号</TableHead>
                              <TableHead className="text-center">供应商</TableHead>
                              <TableHead className="text-center">物料名称</TableHead>
                              <TableHead className="text-center">原料批次</TableHead>
                              <TableHead className="text-center">到货数量</TableHead>
                              <TableHead className="text-center">状态</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.purchase.goodsReceipts.map((receipt: any) => (
                              <TableRow key={receipt.id}>
                                <TableCell className="text-center font-mono">{receipt.receiptNo || "-"}</TableCell>
                                <TableCell className="text-center font-mono">{receipt.purchaseOrderNo || "-"}</TableCell>
                                <TableCell className="text-center">{receipt.supplierName || "-"}</TableCell>
                                <TableCell className="text-center">{receipt.materialName || "-"}</TableCell>
                                <TableCell className="text-center font-mono">{receipt.batchNo || "-"}</TableCell>
                                <TableCell className="text-center">{receipt.receivedQty ? `${receipt.receivedQty} ${receipt.unit || ""}` : "-"}</TableCell>
                                <TableCell className="text-center">
                                  <StatusBadge status={String(receipt.receiptStatus || "")} map={goodsReceiptStatusMap} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {(data.purchase.iqcInspections?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">来料检验</p>
                      <div className="border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-center">检验单号</TableHead>
                              <TableHead className="text-center">到货单号</TableHead>
                              <TableHead className="text-center">供应商</TableHead>
                              <TableHead className="text-center">原料批次</TableHead>
                              <TableHead className="text-center">检验日期</TableHead>
                              <TableHead className="text-center">结论</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.purchase.iqcInspections.map((inspection: any) => (
                              <TableRow key={inspection.id}>
                                <TableCell className="text-center font-mono">{inspection.inspectionNo || "-"}</TableCell>
                                <TableCell className="text-center font-mono">{inspection.goodsReceiptNo || "-"}</TableCell>
                                <TableCell className="text-center">{inspection.supplierName || "-"}</TableCell>
                                <TableCell className="text-center font-mono">{inspection.batchNo || "-"}</TableCell>
                                <TableCell className="text-center">{formatDateOnlyValue(inspection.inspectionDate)}</TableCell>
                                <TableCell className="text-center">
                                  <StatusBadge status={String(inspection.result || "")} map={iqcResultStatusMap} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {(data.purchase.suppliers?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">供应商</p>
                      <div className="border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-center">供应商编码</TableHead>
                              <TableHead className="text-center">供应商名称</TableHead>
                              <TableHead className="text-center">联系人</TableHead>
                              <TableHead className="text-center">联系电话</TableHead>
                              <TableHead className="text-center">资质等级</TableHead>
                              <TableHead className="text-center">状态</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.purchase.suppliers.map((supplier: any) => (
                              <TableRow key={supplier.id}>
                                <TableCell className="text-center font-mono">{supplier.code || "-"}</TableCell>
                                <TableCell className="text-center">{supplier.name || "-"}</TableCell>
                                <TableCell className="text-center">{supplier.contactPerson || "-"}</TableCell>
                                <TableCell className="text-center">{supplier.phone || "-"}</TableCell>
                                <TableCell className="text-center">{supplier.qualificationLevel || "-"}</TableCell>
                                <TableCell className="text-center">
                                  <StatusBadge status={String(supplier.status || "")} map={supplierStatusMap} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyDepartmentState label="采购部" />
              )}
            </TabsContent>

            <TabsContent value="production" className="mt-0">
                <div className="space-y-4 border border-slate-200 bg-white p-4">
                  <SectionHeader
                    icon={<Package className="h-4 w-4" />}
                    title="生产部"
                  count={
                    (data.production.plans?.length || 0) +
                    (data.production.order ? 1 : 0) +
                    (data.production.materialRequisitions?.length || 0) +
                    (data.production.environmentRecords?.length || 0) +
                    (data.production.cleaningRecords?.length || 0) +
                    (data.production.disinfectionRecords?.length || 0) +
                    (data.production.equipmentInspections?.length || 0) +
                    (data.production.equipmentMaintenances?.length || 0) +
                    data.production.records.length +
                    data.production.routingCards.length +
                    (data.production.labelPrintRecords?.length || 0) +
                    (data.production.largePackagingRecords?.length || 0) +
                    (data.production.scrapDisposals?.length || 0) +
                    data.production.sterilizationOrders.length
                  }
                />

                {(data.production.plans?.length || 0) > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">生产计划</p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">计划单号</TableHead>
                            <TableHead className="text-center">计划类型</TableHead>
                            <TableHead className="text-center">产品名称</TableHead>
                            <TableHead className="text-center">计划数量</TableHead>
                            <TableHead className="text-center">计划开始</TableHead>
                            <TableHead className="text-center">计划结束</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.plans.map((plan: any) => (
                            <TableRow key={plan.id}>
                              <TableCell className="text-center font-mono">{plan.planNo || "-"}</TableCell>
                              <TableCell className="text-center">{plan.planType || "-"}</TableCell>
                              <TableCell className="text-center">{plan.productName || "-"}</TableCell>
                              <TableCell className="text-center">{formatQtyValue(plan.plannedQty, plan.unit)}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(plan.plannedStartDate)}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(plan.plannedEndDate)}</TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status={String(plan.status || "")} map={productionStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {data.production.order && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">生产指令单</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 border border-slate-200 bg-white">
                      <InfoRow label="指令单号" value={data.production.order.orderNo} />
                      <InfoRow label="产品名称" value={getProductName(data.production.order.productId)} />
                      <InfoRow label="生产批号" value={data.production.order.batchNo} />
                      <InfoRow label="计划数量" value={formatQtyValue(data.production.order.plannedQty, data.production.order.unit)} />
                      <InfoRow label="完成数量" value={formatQtyValue(data.production.order.completedQty || 0, data.production.order.unit)} />
                      <InfoRow label="生产日期" value={formatDate(data.production.order.productionDate)} />
                      <InfoRow label="有效期至" value={formatDate(data.production.order.expiryDate)} />
                      <InfoRow label="计划开始" value={formatDate(data.production.order.plannedStartDate)} />
                      <InfoRow label="状态" value={productionStatusMap[data.production.order.status]?.label || data.production.order.status} />
                    </div>
                  </div>
                )}

                {(data.production.materialRequisitions?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      领料单 <span className="text-primary">({data.production.materialRequisitions.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">领料单号</TableHead>
                            <TableHead className="text-center">申请日期</TableHead>
                            <TableHead className="text-center">领料仓库</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                            <TableHead className="text-center">物料明细</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.materialRequisitions.map((req: any) => {
                            let itemCount = 0;
                            try {
                              const parsedItems = req.items ? JSON.parse(String(req.items)) : [];
                              itemCount = Array.isArray(parsedItems) ? parsedItems.length : 0;
                            } catch {
                              itemCount = 0;
                            }
                            return (
                              <TableRow key={req.id}>
                                <TableCell className="text-center font-mono">{req.requisitionNo || "-"}</TableCell>
                                <TableCell className="text-center">{formatDateOnlyValue(req.requisitionDate)}</TableCell>
                                <TableCell className="text-center">{req.warehouseName || req.warehouseId || "-"}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {req.status || "-"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">{itemCount > 0 ? `${itemCount} 项` : "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {data.production.records.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      生产记录 <span className="text-primary">({data.production.records.length})</span>
                    </p>
                    <div className="space-y-2">
                      {data.production.records.map((rec: any) => (
                        <div key={rec.id} className="border border-slate-200 bg-white p-3 text-sm">
                          <div className="flex items-center gap-2 mb-2">
                            {recordTypeMap[rec.recordType]?.icon}
                            <span className="font-medium">{getRecordTypeLabel(rec)}</span>
                            <span className="text-muted-foreground text-xs ml-auto">{formatDateOnlyValue(rec.recordDate)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {rec.workstationName && <InfoRow label="工序/工位" value={rec.workstationName} />}
                            {rec.processName && <InfoRow label="工序名称" value={rec.processName} />}
                            {rec.operator && <InfoRow label="操作人" value={rec.operator} />}
                            {rec.actualQty != null && <InfoRow label="实际数量" value={formatQtyValue(rec.actualQty, rec.unit)} />}
                            {rec.scrapQty != null && Number(rec.scrapQty) > 0 && <InfoRow label="报废数量" value={formatQtyValue(rec.scrapQty, rec.unit)} />}
                            {rec.recordType === "temperature_humidity" && (
                              <>
                                {rec.temperature != null && <InfoRow label="温度(℃)" value={`${rec.temperature} / 限值: ${rec.temperatureLimit || '-'}`} />}
                                {rec.humidity != null && <InfoRow label="湿度(%)" value={`${rec.humidity} / 限值: ${rec.humidityLimit || '-'}`} />}
                                {rec.cleanlinessLevel && <InfoRow label="洁净级别" value={rec.cleanlinessLevel} />}
                                {rec.pressureDiff != null && <InfoRow label="压差(Pa)" value={String(rec.pressureDiff)} />}
                              </>
                            )}
                            {rec.recordType === "material_usage" && (
                              <>
                                {rec.materialName && <InfoRow label="材料名称" value={rec.materialName} />}
                                {rec.materialBatchNo && <InfoRow label="材料批号" value={rec.materialBatchNo} />}
                                {rec.issuedQty != null && <InfoRow label="领用数量" value={`${rec.issuedQty} ${rec.usedUnit || ''}`} />}
                                {rec.usedQty != null && <InfoRow label="实际用量" value={`${rec.usedQty} ${rec.usedUnit || ''}`} />}
                              </>
                            )}
                            {rec.recordType === "clean_room" && (
                              <>
                                {rec.cleanedBy && <InfoRow label="清场人" value={rec.cleanedBy} />}
                                {rec.checkedBy && <InfoRow label="检查人" value={rec.checkedBy} />}
                                {rec.cleanResult && <InfoRow label="清场结果" value={rec.cleanResult === "pass" ? "✅ 通过" : "❌ 不通过"} />}
                              </>
                            )}
                            {rec.recordType === "first_piece" && (
                              <>
                                {rec.firstPieceInspector && <InfoRow label="检验人" value={rec.firstPieceInspector} />}
                                {rec.firstPieceBasis && <InfoRow label="检验依据" value={`${rec.firstPieceBasis} v${rec.firstPieceBasisVersion || '-'}`} />}
                                {rec.firstPieceResult && <InfoRow label="首件结果" value={rec.firstPieceResult === "qualified" ? "✅ 合格" : "❌ 不合格"} />}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(data.production.environmentRecords?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      环境记录 <span className="text-primary">({data.production.environmentRecords.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">记录编号</TableHead>
                            <TableHead className="text-center">记录类型</TableHead>
                            <TableHead className="text-center">车间/房间</TableHead>
                            <TableHead className="text-center">工序</TableHead>
                            <TableHead className="text-center">记录日期</TableHead>
                            <TableHead className="text-center">温湿度</TableHead>
                            <TableHead className="text-center">结论</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.environmentRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-center font-mono">{record.recordNo || "-"}</TableCell>
                              <TableCell className="text-center">{record.moduleType || "环境记录"}</TableCell>
                              <TableCell className="text-center">{record.roomName || record.roomCode || "-"}</TableCell>
                              <TableCell className="text-center">{record.processName || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(record.recordDate)}</TableCell>
                              <TableCell className="text-center">
                                {record.temperature != null || record.humidity != null
                                  ? `${record.temperature ?? "-"}℃ / ${record.humidity ?? "-"}%`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={record.isNormal ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                                  {record.isNormal ? "正常" : "异常"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(data.production.cleaningRecords?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      清洗记录 <span className="text-primary">({data.production.cleaningRecords.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">记录编号</TableHead>
                            <TableHead className="text-center">房间/区域</TableHead>
                            <TableHead className="text-center">工序</TableHead>
                            <TableHead className="text-center">记录日期</TableHead>
                            <TableHead className="text-center">记录人</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.cleaningRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-center font-mono">{record.recordNo || "-"}</TableCell>
                              <TableCell className="text-center">{record.roomName || record.roomCode || "-"}</TableCell>
                              <TableCell className="text-center">{record.processName || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(record.recordDate)}</TableCell>
                              <TableCell className="text-center">{record.recorder || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={record.isNormal ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                                  {record.isNormal ? "正常" : "异常"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(data.production.disinfectionRecords?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      消毒记录 <span className="text-primary">({data.production.disinfectionRecords.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">记录编号</TableHead>
                            <TableHead className="text-center">房间/区域</TableHead>
                            <TableHead className="text-center">工序</TableHead>
                            <TableHead className="text-center">记录日期</TableHead>
                            <TableHead className="text-center">记录人</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.disinfectionRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-center font-mono">{record.recordNo || "-"}</TableCell>
                              <TableCell className="text-center">{record.roomName || record.roomCode || "-"}</TableCell>
                              <TableCell className="text-center">{record.processName || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(record.recordDate)}</TableCell>
                              <TableCell className="text-center">{record.recorder || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={record.isNormal ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                                  {record.isNormal ? "正常" : "异常"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(data.production.equipmentInspections?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      设备点检 <span className="text-primary">({data.production.equipmentInspections.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">点检单号</TableHead>
                            <TableHead className="text-center">设备名称</TableHead>
                            <TableHead className="text-center">点检日期</TableHead>
                            <TableHead className="text-center">点检类型</TableHead>
                            <TableHead className="text-center">点检人</TableHead>
                            <TableHead className="text-center">结果</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.equipmentInspections.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-center font-mono">{record.inspectionNo || "-"}</TableCell>
                              <TableCell className="text-center">{record.equipmentName || record.equipmentCode || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(record.inspectionDate)}</TableCell>
                              <TableCell className="text-center">{record.inspectionType || "-"}</TableCell>
                              <TableCell className="text-center">{record.inspector || "-"}</TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status={String(record.result || "")} map={equipmentInspectionResultMap} />
                              </TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status={String(record.status || "")} map={equipmentInspectionStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(data.production.equipmentMaintenances?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      设备保养 <span className="text-primary">({data.production.equipmentMaintenances.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">保养单号</TableHead>
                            <TableHead className="text-center">设备名称</TableHead>
                            <TableHead className="text-center">保养日期</TableHead>
                            <TableHead className="text-center">保养类型</TableHead>
                            <TableHead className="text-center">执行人</TableHead>
                            <TableHead className="text-center">结果</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.equipmentMaintenances.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-center font-mono">{record.maintenanceNo || "-"}</TableCell>
                              <TableCell className="text-center">{record.equipmentName || record.equipmentCode || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(record.maintenanceDate)}</TableCell>
                              <TableCell className="text-center">{record.maintenanceType || "-"}</TableCell>
                              <TableCell className="text-center">{record.executor || "-"}</TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status={String(record.result || "")} map={equipmentMaintenanceResultMap} />
                              </TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status={String(record.status || "")} map={equipmentMaintenanceStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {data.production.routingCards.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      生产流转单 <span className="text-primary">({data.production.routingCards.length})</span>
                    </p>
                    {data.production.routingCards.map((rc: any) => (
                      <div key={rc.id} className="grid grid-cols-2 gap-x-6 gap-y-1 border border-slate-200 bg-white p-3 text-sm">
                        <InfoRow label="流转单号" value={rc.cardNo} />
                        <InfoRow label="当前工序" value={rc.currentProcess} />
                        <InfoRow label="下一工序" value={rc.nextProcess} />
                        <InfoRow label="数量" value={`${rc.quantity} ${rc.unit || ''}`} />
                        <InfoRow label="需委外灭菌" value={rc.needsSterilization ? "是" : "否"} />
                      </div>
                    ))}
                  </div>
                )}

                {(data.production.labelPrintRecords?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      标签打印记录 <span className="text-primary">({data.production.labelPrintRecords.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">标签编号</TableHead>
                            <TableHead className="text-center">模板类型</TableHead>
                            <TableHead className="text-center">载体类型</TableHead>
                            <TableHead className="text-center">打印数量</TableHead>
                            <TableHead className="text-center">已打印</TableHead>
                            <TableHead className="text-center">打印日期</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.labelPrintRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-center font-mono">{record.labelNo || "-"}</TableCell>
                              <TableCell className="text-center">{record.labelTemplate || "-"}</TableCell>
                              <TableCell className="text-center">{record.carrierType || "-"}</TableCell>
                              <TableCell className="text-center">{record.printQty != null ? Number(record.printQty) : "-"}</TableCell>
                              <TableCell className="text-center">{record.printedQty != null ? Number(record.printedQty) : "-"}</TableCell>
                              <TableCell className="text-center">{record.printDate ? formatDateTime(record.printDate) : "-"}</TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status={String(record.status || "")} map={udiStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(data.production.largePackagingRecords?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      大包装记录 <span className="text-primary">({data.production.largePackagingRecords.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">记录编号</TableHead>
                            <TableHead className="text-center">包装日期</TableHead>
                            <TableHead className="text-center">包装类型</TableHead>
                            <TableHead className="text-center">包装规格</TableHead>
                            <TableHead className="text-center">数量</TableHead>
                            <TableHead className="text-center">操作人</TableHead>
                            <TableHead className="text-center">复核人</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.largePackagingRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-center font-mono">{record.recordNo || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateOnlyValue(record.packagingDate)}</TableCell>
                              <TableCell className="text-center">
                                {{
                                  box: "单箱复核",
                                  carton: "纸箱大包装",
                                  pallet: "托盘包装",
                                  other: "其他",
                                }[String(record.packagingType || "")] || "-"}
                              </TableCell>
                              <TableCell className="text-center">{record.packageSpec || "-"}</TableCell>
                              <TableCell className="text-center">
                                {record.quantity != null ? `${Number(record.quantity)} ${record.unit || ""}` : "-"}
                              </TableCell>
                              <TableCell className="text-center">{record.operator || "-"}</TableCell>
                              <TableCell className="text-center">{record.reviewer || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={String(record.status || "") === "completed" ? "default" : "outline"}>
                                  {String(record.status || "") === "completed" ? "已完成" : "草稿"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(pendingScrapRows.length > 0 || processedScrapRows.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      待报废记录 <span className="text-primary">({pendingScrapRows.length + processedScrapRows.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">处理单号</TableHead>
                            <TableHead className="text-center">关联指令</TableHead>
                            <TableHead className="text-center">报废总数</TableHead>
                            <TableHead className="text-center">成本数量</TableHead>
                            <TableHead className="text-center">当前状态</TableHead>
                            <TableHead className="text-center">更新时间</TableHead>
                            <TableHead className="text-center">说明</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...pendingScrapRows, ...processedScrapRows].map((record: any) => (
                            <TableRow key={`production-pending-scrap-${record.id}`}>
                              <TableCell className="text-center font-mono">{record.disposalNo || "-"}</TableCell>
                              <TableCell className="text-center font-mono">{record.productionOrderNo || "-"}</TableCell>
                              <TableCell className="text-center">
                                {record.totalScrapQty != null ? `${Number(record.totalScrapQty)} ${record.unit || ""}` : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {record.costQty != null ? `${Number(record.costQty)} ${record.unit || ""}` : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                <StatusBadge status={String(record.status || "")} map={scrapDisposalStatusMap} />
                              </TableCell>
                              <TableCell className="text-center">{record.updatedAt ? formatDateTime(record.updatedAt) : "-"}</TableCell>
                              <TableCell className="text-center text-xs text-slate-600">
                                {String(record.status || "") === "generated"
                                  ? "已判定报废，待执行报废处理"
                                  : "已完成报废处理并留痕"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(data.production.scrapDisposals?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      报废处理单 <span className="text-primary">({data.production.scrapDisposals.length})</span>
                    </p>
                    <div className="border border-slate-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-center">处理单号</TableHead>
                            <TableHead className="text-center">报废总数</TableHead>
                            <TableHead className="text-center">成本数量</TableHead>
                            <TableHead className="text-center">涉及工序</TableHead>
                            <TableHead className="text-center">状态</TableHead>
                            <TableHead className="text-center">创建时间</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.production.scrapDisposals.map((record: any) => {
                            const detailItems = parseJsonArray(record.detailItems);
                            const processNames = Array.from(
                              new Set(
                                detailItems
                                  .map((item: any) => String(item.processName || item.process || "").trim())
                                  .filter(Boolean),
                              ),
                            );
                            return (
                              <TableRow key={record.id}>
                                <TableCell className="text-center font-mono">{record.disposalNo || "-"}</TableCell>
                                <TableCell className="text-center">
                                  {record.totalScrapQty != null ? `${Number(record.totalScrapQty)} ${record.unit || ""}` : "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {record.costQty != null ? `${Number(record.costQty)} ${record.unit || ""}` : "-"}
                                </TableCell>
                                <TableCell className="text-center">{processNames.length > 0 ? processNames.join(" / ") : "-"}</TableCell>
                                <TableCell className="text-center">
                                  <StatusBadge status={String(record.status || "")} map={scrapDisposalStatusMap} />
                                </TableCell>
                                <TableCell className="text-center">{record.createdAt ? formatDateTime(record.createdAt) : "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {data.production.sterilizationOrders.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      委外灭菌单 <span className="text-primary">({data.production.sterilizationOrders.length})</span>
                    </p>
                    {data.production.sterilizationOrders.map((so: any) => (
                      <div key={so.id} className="border border-slate-200 bg-white p-3 text-sm">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <InfoRow label="灭菌单号" value={so.orderNo} />
                          <InfoRow label="灭菌批号" value={so.sterilizationBatchNo} />
                          <InfoRow label="灭菌方式" value={so.sterilizationMethod} />
                          <InfoRow label="委外供应商" value={so.supplierName} />
                          <InfoRow label="发出日期" value={formatDate(so.sendDate)} />
                          <InfoRow label="实际返回" value={formatDate(so.actualReturnDate)} />
                          <InfoRow label="数量" value={`${so.quantity} ${so.unit || ''}`} />
                          <div className="flex gap-2 text-sm">
                            <span className="text-muted-foreground w-28 shrink-0">状态</span>
                            <StatusBadge status={so.status} map={sterilizationStatusMap} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="quality" className="mt-0">
              {qualityHasData ? (
                <div className="space-y-4 border border-slate-200 bg-white p-4">
                  <SectionHeader
                    icon={<FlaskConical className="h-4 w-4" />}
                    title="质量部"
                    count={qualitySectionCount}
                  />
                  {data.quality.inspections.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        检验记录 <span className="text-primary">({data.quality.inspections.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>检验单号</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>检验日期</TableHead>
                            <TableHead className="text-right">抽样数</TableHead>
                            <TableHead className="text-right">合格数</TableHead>
                            <TableHead className="text-right">不合格数</TableHead>
                            <TableHead>结论</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.quality.inspections.map((ins: any) => {
                            const res = inspectionResultMap[ins.result];
                            return (
                              <TableRow key={ins.id}>
                                <TableCell className="font-mono text-xs">{ins.inspectionNo}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{ins.type}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{formatDateOnlyValue(ins.inspectionDate)}</TableCell>
                                <TableCell className="text-right">{ins.sampleQty ?? "-"}</TableCell>
                                <TableCell className="text-right text-green-600 font-medium">{ins.qualifiedQty ?? "-"}</TableCell>
                                <TableCell className="text-right text-red-500">{ins.unqualifiedQty ?? "-"}</TableCell>
                                <TableCell>
                                  {res ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${res.color}`}>
                                      {res.icon}{res.label}
                                    </span>
                                  ) : ins.result ?? "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {oqcReleaseRows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        成品放行 <span className="text-primary">({oqcReleaseRows.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>放行单号</TableHead>
                            <TableHead>关联检验单</TableHead>
                            <TableHead>放行日期</TableHead>
                            <TableHead className="text-right">放行数量</TableHead>
                            <TableHead>放行决定</TableHead>
                            <TableHead>签名数</TableHead>
                            <TableHead>备注</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {oqcReleaseRows.map((record: any) => (
                            <TableRow key={`release-${record.id}`}>
                              <TableCell className="font-mono text-xs">{record.releaseNo}</TableCell>
                              <TableCell className="font-mono text-xs">{record.inspectionNo || "-"}</TableCell>
                              <TableCell className="text-sm">{record.inspectionDate ? formatDate(record.inspectionDate) : "-"}</TableCell>
                              <TableCell className="text-right">
                                {record.releaseForm?.releaseQty || record.qualifiedQty || record.inspectedQty || "-"}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={String(record.releaseForm?.decision || "")}
                                  map={releaseDecisionMap}
                                />
                              </TableCell>
                              <TableCell>{record.signatures.length > 0 ? `${record.signatures.length} 个` : "-"}</TableCell>
                              <TableCell className="max-w-[360px] truncate text-xs text-slate-600" title={record.releaseForm?.remark || ""}>
                                {record.releaseForm?.remark || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {(data.quality.samples?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        留样管理 <span className="text-primary">({data.quality.samples.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>留样单号</TableHead>
                            <TableHead>留样类型</TableHead>
                            <TableHead className="text-right">数量</TableHead>
                            <TableHead>存放位置</TableHead>
                            <TableHead>取样日期</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.quality.samples.map((sample: any) => (
                            <TableRow key={sample.id}>
                              <TableCell className="font-mono text-xs">{sample.sampleNo || "-"}</TableCell>
                              <TableCell>{sample.sampleType || "-"}</TableCell>
                              <TableCell className="text-right">{sample.quantity != null ? `${sample.quantity} ${sample.unit || ""}` : "-"}</TableCell>
                              <TableCell>{sample.storageLocation || "-"}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(sample.samplingDate)}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(sample.status || "")} map={sampleStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {(data.quality.labRecords?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        实验室记录 <span className="text-primary">({data.quality.labRecords.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>记录编号</TableHead>
                            <TableHead>检测项目</TableHead>
                            <TableHead>检测日期</TableHead>
                            <TableHead>检验人</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>结论</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.quality.labRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-xs">{record.recordNo || "-"}</TableCell>
                              <TableCell>{record.testType || record.formTitle || "-"}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(record.testDate)}</TableCell>
                              <TableCell>{record.testerName || "-"}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.status || "")} map={labRecordStatusMap} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.conclusion || "")} map={labConclusionMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {infrastructureLabRecords.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        基础设施检验 <span className="text-primary">({infrastructureLabRecords.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>记录编号</TableHead>
                            <TableHead>表单</TableHead>
                            <TableHead>检验日期</TableHead>
                            <TableHead>检验人</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>结论</TableHead>
                            <TableHead>结果摘要</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {infrastructureLabRecords.map((record: any) => {
                            const conclusionMeta =
                              record.conclusion === "pass"
                                ? { label: "合格", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                                : record.conclusion === "fail"
                                  ? { label: "不合格", className: "bg-rose-50 text-rose-700 border-rose-200" }
                                  : { label: "待判定", className: "bg-slate-50 text-slate-700 border-slate-200" };
                            const statusMeta =
                              record.status === "reviewed"
                                ? { label: "已复核", className: "bg-violet-50 text-violet-700 border-violet-200" }
                                : record.status === "completed"
                                  ? { label: "已完成", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                                  : record.status === "testing"
                                    ? { label: "检验中", className: "bg-blue-50 text-blue-700 border-blue-200" }
                                    : { label: "待处理", className: "bg-amber-50 text-amber-700 border-amber-200" };
                            return (
                              <TableRow key={record.id}>
                                <TableCell className="font-mono text-xs">{record.recordNo || "-"}</TableCell>
                                <TableCell>{record.formTitle || record.testType || "-"}</TableCell>
                                <TableCell className="text-sm">{formatDateOnlyValue(record.testDate)}</TableCell>
                                <TableCell>{record.testerName || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={statusMeta.className}>
                                    {statusMeta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={conclusionMeta.className}>
                                    {conclusionMeta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[420px] truncate text-xs text-slate-600" title={record.result || ""}>
                                  {record.result || record.remark || "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {data.quality.incidents.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        不良事件 <span className="text-red-500">({data.quality.incidents.length})</span>
                      </p>
                      {data.quality.incidents.map((inc: any) => (
                        <div key={inc.id} className="border border-red-200 rounded p-3 text-sm bg-red-50/50">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <InfoRow label="事件编号" value={inc.incidentNo} />
                            <InfoRow label="事件类型" value={inc.incidentType} />
                            <InfoRow label="发现日期" value={formatDate(inc.discoveredDate)} />
                            <InfoRow label="严重程度" value={inc.severity} />
                            <InfoRow label="描述" value={inc.description} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyDepartmentState label="质量部" />
              )}
            </TabsContent>

            <TabsContent value="warehouse" className="mt-0">
              {data.warehouse.entries.length > 0
                || (data.warehouse.stagingTransactions?.length || 0) > 0
                || data.warehouse.transactions.length > 0
                || pendingScrapRows.length > 0
                || processedScrapRows.length > 0 ? (
                <div className="space-y-4 border border-slate-200 bg-white p-4">
                  <SectionHeader
                    icon={<Warehouse className="h-4 w-4" />}
                    title="仓库管理"
                    count={
                      data.warehouse.entries.length
                      + (data.warehouse.stagingTransactions?.length || 0)
                      + data.warehouse.transactions.length
                      + pendingScrapRows.length
                      + processedScrapRows.length
                    }
                  />
                  {data.warehouse.entries.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        生产入库申请 <span className="text-primary">({data.warehouse.entries.length})</span>
                      </p>
                      {data.warehouse.entries.map((entry: any) => (
                        <div key={entry.id} className="border rounded p-3 text-sm">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <InfoRow label="入库申请单号" value={entry.entryNo} />
                            <InfoRow label="灭菌批号" value={entry.sterilizationBatchNo} />
                            <InfoRow label="灭菌后数量" value={entry.sterilizedQty != null ? `${entry.sterilizedQty} ${entry.unit || ''}` : undefined} />
                            <InfoRow label="检验报废数量" value={entry.inspectionRejectQty != null ? `${entry.inspectionRejectQty} ${entry.unit || ''}` : undefined} />
                            <InfoRow label="留样数量" value={entry.sampleQty != null ? `${entry.sampleQty} ${entry.unit || ''}` : undefined} />
                            <InfoRow label="入库数量" value={entry.quantity != null ? `${entry.quantity} ${entry.unit || ''}` : undefined} />
                            <InfoRow label="申请日期" value={formatDate(entry.applicationDate)} />
                            <div className="flex gap-2 text-sm">
                              <span className="text-muted-foreground w-28 shrink-0">状态</span>
                              <StatusBadge status={entry.status} map={warehouseEntryStatusMap} />
                            </div>
                          </div>
                          {entry.quantityModifyReason && (
                            <div className="mt-2 text-xs text-muted-foreground bg-yellow-50 rounded p-2">
                              <span className="font-medium">数量修改原因：</span>{entry.quantityModifyReason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {(data.warehouse.stagingTransactions?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        暂存区记录 <span className="text-primary">({data.warehouse.stagingTransactions.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>单据号</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>仓库</TableHead>
                            <TableHead>物料名称</TableHead>
                            <TableHead>物料批次</TableHead>
                            <TableHead className="text-right">数量</TableHead>
                            <TableHead>时间</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.warehouse.stagingTransactions.map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-xs">{tx.documentNo || "-"}</TableCell>
                              <TableCell>
                                <span className={`text-xs font-medium ${stagingTxTypeLabelMap[String(tx.type || "")]?.color || "text-slate-600"}`}>
                                  {stagingTxTypeLabelMap[String(tx.type || "")]?.label || tx.type || "-"}
                                </span>
                              </TableCell>
                              <TableCell>{tx.warehouseName || tx.warehouseId || "-"}</TableCell>
                              <TableCell>{tx.itemName || "-"}</TableCell>
                              <TableCell className="font-mono text-xs">{tx.batchNo || "-"}</TableCell>
                              <TableCell className={`text-right font-medium ${String(tx.type || "") === "other_in" ? "text-green-600" : "text-red-500"}`}>
                                {String(tx.type || "") === "other_in" ? "+" : "-"}{tx.quantity} {tx.unit || ""}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {tx.createdAt ? formatDate(tx.createdAt) : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {(pendingScrapRows.length > 0 || processedScrapRows.length > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        暂存区报废状态 <span className="text-primary">({pendingScrapRows.length + processedScrapRows.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>处理单号</TableHead>
                            <TableHead className="text-right">报废数量</TableHead>
                            <TableHead className="text-right">成本数量</TableHead>
                            <TableHead>当前状态</TableHead>
                            <TableHead>说明</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...pendingScrapRows, ...processedScrapRows].map((record: any) => (
                            <TableRow key={`warehouse-scrap-${record.id}`}>
                              <TableCell className="font-mono text-xs">{record.disposalNo || "-"}</TableCell>
                              <TableCell className="text-right">{record.totalScrapQty != null ? `${Number(record.totalScrapQty)} ${record.unit || ""}` : "-"}</TableCell>
                              <TableCell className="text-right">{record.costQty != null ? `${Number(record.costQty)} ${record.unit || ""}` : "-"}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.status || "")} map={scrapDisposalStatusMap} />
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                {String(record.status || "") === "generated"
                                  ? "已判定报废，仍留在暂存区待处理"
                                  : "已确认处理，已从暂存区报废出库"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {data.warehouse.transactions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        库存流水 <span className="text-primary">({data.warehouse.transactions.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>单据号</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead className="text-right">数量</TableHead>
                            <TableHead className="text-right">变动前</TableHead>
                            <TableHead className="text-right">变动后</TableHead>
                            <TableHead>时间</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.warehouse.transactions.map((tx: any) => {
                            const typeLabels: Record<string, string> = {
                              production_in: "生产入库", sales_out: "销售出库",
                              purchase_in: "采购入库", return_in: "退货入库",
                              production_out: "生产领料", return_out: "销售退货",
                              other_in: "其他入库", other_out: "其他出库",
                              transfer: "调拨", adjust: "调整",
                            };
                            const isIn = tx.type.endsWith("_in") || tx.type === "transfer";
                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="font-mono text-xs">{tx.documentNo || "-"}</TableCell>
                                <TableCell>
                                  <span className={`text-xs font-medium ${isIn ? "text-green-600" : "text-red-500"}`}>
                                    {typeLabels[tx.type] || tx.type}
                                  </span>
                                </TableCell>
                                <TableCell className={`text-right font-medium ${isIn ? "text-green-600" : "text-red-500"}`}>
                                  {isIn ? "+" : "-"}{tx.quantity} {tx.unit || ""}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{tx.beforeQty ?? "-"}</TableCell>
                                <TableCell className="text-right text-xs">{tx.afterQty ?? "-"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {tx.createdAt ? formatDate(tx.createdAt) : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyDepartmentState label="仓库管理" />
              )}
            </TabsContent>

            <TabsContent value="finance" className="mt-0">
              {data.finance.accountsReceivable.length > 0
                || (data.finance.accountsPayable?.length || 0) > 0
                || (data.finance.receivedInvoices?.length || 0) > 0
                || (data.finance.issuedInvoices?.length || 0) > 0 ? (
                <div className="space-y-4 border border-slate-200 bg-white p-4">
                  <SectionHeader
                    icon={<Banknote className="h-4 w-4" />}
                    title="财务部"
                    count={
                      (data.finance.accountsReceivable.length > 0 ? 1 : 0)
                      + ((data.finance.accountsPayable?.length || 0) > 0 ? 1 : 0)
                      + ((data.finance.receivedInvoices?.length || 0) > 0 ? 1 : 0)
                      + ((data.finance.issuedInvoices?.length || 0) > 0 ? 1 : 0)
                    }
                  />
                  {data.finance.accountsReceivable.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        应收账款 <span className="text-primary">({data.finance.accountsReceivable.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>发票号</TableHead>
                            <TableHead>发票日期</TableHead>
                            <TableHead>到期日</TableHead>
                            <TableHead className="text-right">应收金额</TableHead>
                            <TableHead className="text-right">已收金额</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.finance.accountsReceivable.map((ar: any) => (
                            <TableRow key={ar.id}>
                              <TableCell className="font-mono text-xs">{ar.invoiceNo}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(ar.invoiceDate)}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(ar.dueDate)}</TableCell>
                              <TableCell className="text-right font-medium">{ar.amount} {ar.currency || "CNY"}</TableCell>
                              <TableCell className="text-right text-green-600">{ar.paidAmount || 0} {ar.currency || "CNY"}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(ar.status || "")} map={receivableStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {(data.finance.accountsPayable?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        应付账款 <span className="text-primary">({data.finance.accountsPayable.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>单据号</TableHead>
                            <TableHead>供应商</TableHead>
                            <TableHead>发票日期</TableHead>
                            <TableHead>到期日</TableHead>
                            <TableHead className="text-right">应付金额</TableHead>
                            <TableHead className="text-right">已付金额</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.finance.accountsPayable.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-mono text-xs">{row.invoiceNo || "-"}</TableCell>
                              <TableCell>{row.supplierName || "-"}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(row.invoiceDate)}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(row.dueDate)}</TableCell>
                              <TableCell className="text-right font-medium">{row.amount} {row.currency || "CNY"}</TableCell>
                              <TableCell className="text-right text-green-600">{row.paidAmount || 0} {row.currency || "CNY"}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(row.status || "")} map={payableStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {(data.finance.receivedInvoices?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        进项发票 <span className="text-primary">({data.finance.receivedInvoices.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>发票号</TableHead>
                            <TableHead>供应商</TableHead>
                            <TableHead>关联单号</TableHead>
                            <TableHead>开票日期</TableHead>
                            <TableHead className="text-right">总金额</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.finance.receivedInvoices.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-mono text-xs">{row.invoiceNo || "-"}</TableCell>
                              <TableCell>{row.supplierName || "-"}</TableCell>
                              <TableCell className="text-xs">{row.relatedOrderNo || "-"}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(row.invoiceDate)}</TableCell>
                              <TableCell className="text-right font-medium">{row.totalAmount} CNY</TableCell>
                              <TableCell>
                                <StatusBadge status={String(row.status || "")} map={invoiceStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {(data.finance.issuedInvoices?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        销项发票 <span className="text-primary">({data.finance.issuedInvoices.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>发票号</TableHead>
                            <TableHead>客户名称</TableHead>
                            <TableHead>关联单号</TableHead>
                            <TableHead>开票日期</TableHead>
                            <TableHead className="text-right">总金额</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.finance.issuedInvoices.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-mono text-xs">{row.invoiceNo || "待开具"}</TableCell>
                              <TableCell>{row.customerName || "-"}</TableCell>
                              <TableCell className="text-xs">{row.relatedOrderNo || "-"}</TableCell>
                              <TableCell className="text-sm">{formatDateOnlyValue(row.invoiceDate)}</TableCell>
                              <TableCell className="text-right font-medium">{row.totalAmount} CNY</TableCell>
                              <TableCell>
                                <StatusBadge status={String(row.status || "")} map={invoiceStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyDepartmentState label="财务部" />
              )}
            </TabsContent>

            <TabsContent value="regulatory" className="mt-0">
              {regulatoryHasData ? (
                <div className="space-y-4 border border-slate-200 bg-white p-4">
                  <SectionHeader
                    icon={<ClipboardList className="h-4 w-4" />}
                    title="法规负责人"
                    count={
                      (data.regulatory.udiLabels?.length || 0)
                      + (data.regulatory.batchReviewRecords?.length || 0)
                      + (data.regulatory.regulatoryReleaseRecords?.length || 0)
                    }
                  />
                  {(data.regulatory.batchReviewRecords?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        批记录审核记录 <span className="text-primary">({data.regulatory.batchReviewRecords.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>审核单号</TableHead>
                            <TableHead>审核日期</TableHead>
                            <TableHead>审核人</TableHead>
                            <TableHead>完整性</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>缺失项</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.regulatory.batchReviewRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-xs">{record.reviewNo || "-"}</TableCell>
                              <TableCell className="text-sm">{formatDate(record.reviewDate)}</TableCell>
                              <TableCell>{record.reviewer || "-"}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.completenessStatus || "")} map={completenessStatusMap} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.status || "")} map={batchReviewStatusMap} />
                              </TableCell>
                              <TableCell className="max-w-[240px] text-xs text-slate-600">{record.missingItems || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {(data.regulatory.regulatoryReleaseRecords?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        法规放行记录 <span className="text-primary">({data.regulatory.regulatoryReleaseRecords.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>放行单号</TableHead>
                            <TableHead>放行日期</TableHead>
                            <TableHead>灭菌批号</TableHead>
                            <TableHead>放行人</TableHead>
                            <TableHead>放行决定</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>关联审核单</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.regulatory.regulatoryReleaseRecords.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-xs">{record.releaseNo || "-"}</TableCell>
                              <TableCell className="text-sm">{formatDate(record.releaseDate)}</TableCell>
                              <TableCell className="font-mono text-xs">{record.sterilizationBatchNo || "-"}</TableCell>
                              <TableCell>{record.approver || "-"}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.decision || "")} map={regulatoryDecisionMap} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.status || "")} map={regulatoryReleaseStatusMap} />
                              </TableCell>
                              <TableCell className="font-mono text-xs">{record.relatedReviewNo || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {(data.regulatory.udiLabels?.length || 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        UDI记录 <span className="text-primary">({data.regulatory.udiLabels.length})</span>
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>标签号</TableHead>
                            <TableHead>产品编码</TableHead>
                            <TableHead>UDI-DI</TableHead>
                            <TableHead>模板</TableHead>
                            <TableHead className="text-right">打印数量</TableHead>
                            <TableHead>打印日期</TableHead>
                            <TableHead>状态</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.regulatory.udiLabels.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-xs">{record.labelNo || "-"}</TableCell>
                              <TableCell>{record.productCode || "-"}</TableCell>
                              <TableCell className="font-mono text-xs">{record.udiDi || "-"}</TableCell>
                              <TableCell>{record.labelTemplate || "-"}</TableCell>
                              <TableCell className="text-right">{record.printedQty ?? 0}/{record.printQty ?? 0}</TableCell>
                              <TableCell className="text-sm">{record.printDate ? formatDate(record.printDate) : "-"}</TableCell>
                              <TableCell>
                                <StatusBadge status={String(record.status || "")} map={udiStatusMap} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyDepartmentState label="法规负责人" />
              )}
            </TabsContent>
          </Tabs>
        )}
        </div>
      </DraggableDialogContent>
    </DraggableDialog>
  );
}

// ========== 批记录列表主页面 ==========
export default function BatchRecordPage() {
  const [searchBatchNo, setSearchBatchNo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [detailBatchNo, setDetailBatchNo] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.batchRecord.list.useQuery({
    batchNo: searchBatchNo || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: productsData = [] } = trpc.products.list.useQuery();
  const deleteMutation = trpc.productionOrders.delete.useMutation({
    onSuccess: () => {
      const deletedBatchNo = String(recordToDelete?.batchNo || "");
      if (deletedBatchNo && detailBatchNo === deletedBatchNo) {
        setDetailBatchNo(null);
      }
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      refetch();
    },
    onError: (error: any) => {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      window.alert(`删除失败：${error?.message || "未知错误"}`);
    },
  });
  const getProductName = (productId?: number | null) => {
    if (!productId) return "-";
    const p = (productsData as any[]).find((p: any) => p.id === productId);
    return p?.name || `产品#${productId}`;
  };

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setSearchBatchNo(searchInput);
    setPage(0);
  };

  const handleReset = () => {
    setSearchInput("");
    setSearchBatchNo("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const handleDeleteClick = (row: any) => {
    setRecordToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!recordToDelete?.id) return;
    deleteMutation.mutate({ id: Number(recordToDelete.id) });
  };

  return (
    <ERPLayout>
      <div className="p-6 space-y-4">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              批记录查询
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              以生产批号为主线，追溯生产、质量、仓库、销售、财务全链路数据
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4 text-blue-500" />生产
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <FlaskConical className="h-4 w-4 text-purple-500" />质量
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <Warehouse className="h-4 w-4 text-green-500" />仓库
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-4 w-4 text-orange-500" />销售
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="flex items-center gap-1">
              <Banknote className="h-4 w-4 text-yellow-500" />财务
            </span>
          </div>
        </div>

        {/* 搜索栏 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">生产批号</label>
                <Input
                  placeholder="输入批号搜索..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">创建日期从</label>
                <DateTextInput value={dateFrom} onChange={setDateFrom} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">创建日期至</label>
                <DateTextInput value={dateTo} onChange={setDateTo} className="w-40" />
              </div>
              <Button onClick={handleSearch} className="gap-1">
                <Search className="h-4 w-4" />搜索
              </Button>
              <Button variant="outline" onClick={handleReset}>重置</Button>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">批记录总数</p>
              <p className="text-2xl font-bold text-primary">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">生产中</p>
              <p className="text-2xl font-bold text-yellow-600">
                {list.filter((r: any) => r.status === 'in_progress').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-2xl font-bold text-green-600">
                {list.filter((r: any) => r.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">关联销售订单</p>
              <p className="text-2xl font-bold text-blue-600">
                {list.filter((r: any) => r.salesOrderId).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 批记录列表 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">批记录列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-primary">生产批号 <span className="text-xs text-muted-foreground font-normal">(唯一追溯)</span></TableHead>
                  <TableHead>生产指令号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead className="text-right">计划数量</TableHead>
                  <TableHead className="text-right">完成数量</TableHead>
                  <TableHead>生产日期</TableHead>
                  <TableHead>有效期至</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>关联销售单</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      <Clock className="h-5 w-5 animate-spin inline mr-2" />加载中...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      暂无批记录数据
                    </TableCell>
                  </TableRow>
                )}
                {list.map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="font-mono font-bold text-primary">{row.batchNo}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.orderNo}</TableCell>
                    <TableCell>{getProductName(row.productId)}</TableCell>
                    <TableCell className="text-right">{formatQtyValue(row.plannedQty, row.unit)}</TableCell>
                    <TableCell className="text-right">{formatQtyValue(row.completedQty || 0, row.unit)}</TableCell>
                    <TableCell className="text-sm">{formatDateOnlyValue(row.productionDate)}</TableCell>
                    <TableCell className="text-sm">{formatDateOnlyValue(row.expiryDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} map={productionStatusMap} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.salesOrderId ? `#${row.salesOrderId}` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => setDetailBatchNo(row.batchNo!)}
                        >
                          <FileText className="h-3.5 w-3.5" />查看批记录
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  共 {total} 条，第 {page + 1} / {totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 批记录详情弹窗 */}
      {detailBatchNo && (
        <BatchRecordDetail
          batchNo={detailBatchNo}
          open={!!detailBatchNo}
          onClose={() => setDetailBatchNo(null)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除批记录</AlertDialogTitle>
            <AlertDialogDescription>
              {recordToDelete?.batchNo
                ? `确认删除批号 ${recordToDelete.batchNo} 对应的批记录吗？这会同时删除对应生产指令及其关联数据，且无法撤销。`
                : "确认删除这条批记录吗？此操作无法撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ERPLayout>
  );
}
