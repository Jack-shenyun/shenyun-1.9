import { useEffect, useMemo, useState } from "react";
import { formatDate, formatDisplayNumber, roundToDigits } from "@/lib/formatters";

/** 兼容 superjson 的日期格式化：Date 对象或字符串均可正确转为 YYYY-MM-DD */
const fmtDate = (v: any): string => {
  return formatDate(v);
};
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { Cog, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

type OrderType = "finished" | "semi_finished" | "rework";

interface ProductionOrderRow {
  id: number;
  orderNo: string;
  orderType: OrderType;
  productId: number;
  productName?: string;
  productCode?: string;
  productSpec?: string;
  plannedQty: string;
  completedQty: string | null;
  unit: string | null;
  batchNo: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  productionDate: string | null;
  expiryDate: string | null;
  planId: number | null;
  planNo?: string | null;
  status: "draft" | "planned" | "in_progress" | "completed" | "cancelled";
  salesOrderId: number | null;
  remark: string | null;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive"; color: string }> = {
  draft: { label: "草稿", variant: "outline", color: "text-gray-600" },
  planned: { label: "已计划", variant: "secondary", color: "text-blue-600" },
  in_progress: { label: "生产中", variant: "default", color: "text-amber-600" },
  completed: { label: "已完成", variant: "secondary", color: "text-green-600" },
  cancelled: { label: "已取消", variant: "destructive", color: "text-red-600" },
};

const orderTypeMap: Record<OrderType, { label: string; color: string; badge: "outline" | "secondary" | "default" | "destructive" }> = {
  finished:     { label: "成品",   color: "text-green-700",  badge: "secondary" },
  semi_finished:{ label: "半成品", color: "text-blue-700",   badge: "outline" },
  rework:       { label: "返工",   color: "text-orange-700", badge: "destructive" },
};

/**
 * 根据指令类型生成批次号
 * 成品:   YYYYMMDDNN  (如 2026031101)
 * 半成品: B + YY + MMDD + NN  (如 B26031101)
 * 返工:   F + YY + MMDD + NN  (如 F26031101)
 */
function generateBatchNo(orderType: OrderType, existingOrders: any[]): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  let prefix = "";
  let dateStr = "";
  if (orderType === "finished") {
    prefix = "";
    dateStr = `${yyyy}${mm}${dd}`;
  } else if (orderType === "semi_finished") {
    prefix = "B";
    dateStr = `${yy}${mm}${dd}`;
  } else {
    prefix = "F";
    dateStr = `${yy}${mm}${dd}`;
  }

  const fullDateStr = `${prefix}${dateStr}`;
  const todayBatches = (existingOrders as any[])
    .map((o: any) => o.batchNo || "")
    .filter((b: string) => b.startsWith(fullDateStr));

  let seq = 1;
  for (const b of todayBatches) {
    const suffix = b.replace(fullDateStr, "");
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num >= seq) seq = num + 1;
  }
  return `${fullDateStr}${String(seq).padStart(2, "0")}`;
}

/** 根据生产日期和保质期（月）计算有效期至 */
function calcExpiryDate(productionDate: string, shelfLifeMonths: number): string {
  if (!productionDate || !shelfLifeMonths) return "";
  const d = new Date(productionDate);
  d.setMonth(d.getMonth() + shelfLifeMonths);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function formatPlanQty(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? "-");
  return formatDisplayNumber(num);
}

function normalizePlanQtyInput(value: unknown): string {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return String(roundToDigits(num, 2));
}

function normalizeDateInputValue(value: string, finalize = false): string {
  const cleaned = String(value || "")
    .replace(/\//g, "-")
    .replace(/[^\d-]/g, "");
  if (!cleaned) return "";
  const rawParts = cleaned
    .split("-")
    .slice(0, 3)
    .map((part, index) => part.slice(0, index === 0 ? 4 : 2));
  if (!finalize) return rawParts.join("-");
  if (rawParts.length === 3 && rawParts[0].length === 4) {
    const [year, month, day] = rawParts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return rawParts.join("-");
}

function DateTextInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      className="font-mono"
      onChange={(e) => onChange(normalizeDateInputValue(e.target.value))}
      onBlur={(e) => onChange(normalizeDateInputValue(e.target.value, true))}
    />
  );
}

function calcSemiFinishedQty(planQty: unknown, bomQty: unknown, baseProductQty: unknown): string {
  const planQtyNum = Number(planQty || 0);
  const bomQtyNum = Number(bomQty || 0);
  const baseQtyNum = Number(baseProductQty || 1);
  if (!Number.isFinite(planQtyNum) || !Number.isFinite(bomQtyNum) || !Number.isFinite(baseQtyNum) || baseQtyNum <= 0) {
    return "";
  }
  const result = (planQtyNum * bomQtyNum) / baseQtyNum;
  if (!Number.isFinite(result) || result <= 0) return "";
  return String(roundToDigits(result, 2));
}

export default function ProductionOrdersPage() {
  const PAGE_SIZE = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductionOrderRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { canDelete } = usePermission();

  // 弹窗选择器状态
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  // 草稿库弹窗
  const [draftLibOpen, setDraftLibOpen] = useState(false);
  const [hasHandledCreateFromPlan, setHasHandledCreateFromPlan] = useState(false);

  const { data: ordersRaw = [], isLoading, refetch } = trpc.productionOrders.list.useQuery(
    { search: searchTerm || undefined, status: statusFilter !== "all" ? statusFilter : undefined }
  );
  const { data: productsData = [] } = trpc.products.list.useQuery();
  const { data: productionPlansData = [] } = trpc.productionPlans.list.useQuery();
  const { data: companyInfoData } = trpc.companyInfo.get.useQuery();
  const createMutation = trpc.productionOrders.create.useMutation({ onSuccess: () => { refetch(); toast.success("生产指令已创建"); setFormDialogOpen(false); } });
  const saveDraftMutation = trpc.productionOrders.create.useMutation({ onSuccess: () => { refetch(); toast.success("已保存为草稿"); setFormDialogOpen(false); } });
  const updateMutation = trpc.productionOrders.update.useMutation({ onSuccess: () => { refetch(); toast.success("生产指令已更新"); setFormDialogOpen(false); setViewDialogOpen(false); } });
  const deleteMutation = trpc.productionOrders.delete.useMutation({ onSuccess: () => { refetch(); toast.success("生产指令已删除"); } });

  const data: ProductionOrderRow[] = (ordersRaw as any[])
    .filter((o: any) => typeFilter === "all" || o.orderType === typeFilter)
    .map((o: any) => {
      const product = (productsData as any[]).find((p: any) => p.id === o.productId);
      return {
        ...o,
        orderType: o.orderType || "finished",
        productName: product?.name || "-",
        productCode: product?.code || "-",
        productSpec: product?.specification || "",
      };
    });
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pagedData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const productionOrderPrintData = useMemo(
    () =>
      selectedRecord
        ? {
            orderNo: selectedRecord.orderNo || "",
            orderType: orderTypeMap[selectedRecord.orderType]?.label || selectedRecord.orderType || "",
            status: statusMap[selectedRecord.status]?.label || selectedRecord.status || "",
            productName: selectedRecord.productName || "",
            productCode: selectedRecord.productCode || "",
            productSpec: selectedRecord.productSpec || "",
            batchNo: selectedRecord.batchNo || "",
            planNo: (selectedRecord as any).planNo || selectedRecord.planId || "",
            plannedQty: Number(selectedRecord.plannedQty || 0),
            completedQty: Number(selectedRecord.completedQty || 0),
            unit: selectedRecord.unit || "",
            progress: Number(selectedRecord.plannedQty || 0) > 0
              ? (Number(selectedRecord.completedQty || 0) / Number(selectedRecord.plannedQty || 0)) * 100
              : 0,
            plannedStartDate: selectedRecord.plannedStartDate || "",
            plannedEndDate: selectedRecord.plannedEndDate || "",
            productionDate: selectedRecord.productionDate || "",
            actualStartDate: selectedRecord.actualStartDate || "",
            actualEndDate: selectedRecord.actualEndDate || "",
            expiryDate: selectedRecord.expiryDate || "",
            productDescription: (productsData as any[]).find((p: any) => p.id === selectedRecord.productId)?.description || "",
            remark: selectedRecord.remark || "",
            bomItems: [],
          }
        : null,
    [productsData, selectedRecord],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // 已被生产指令关联的计划 ID 集合（排除草稿和取消状态的指令）
  const usedPlanIds = new Set(
    (ordersRaw as any[])
      .filter((o: any) => o.status !== "draft" && o.status !== "cancelled" && o.planId)
      .map((o: any) => o.planId)
  );
  const availablePlans = (productionPlansData as any[]).filter(
    (p: any) =>
      String(p.planNo || "").startsWith("PP-") &&
      p.status !== "completed" &&
      p.status !== "cancelled" &&
      (p as any).productSourceType !== "purchase" &&
      !usedPlanIds.has(p.id)
  );

  const [formData, setFormData] = useState({
    orderType: "finished" as OrderType,
    planId: 0,
    planNo: "",
    salesOrderId: 0,
    productId: 0,
    productName: "",
    productCode: "",
    productSpec: "",
    productDescription: "",
    batchNo: "",
    plannedQty: "",
    unit: "",
    plannedStartDate: "",
    plannedEndDate: "",
    deliveryDate: "",
    productionDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    status: "in_progress" as ProductionOrderRow["status"],
    remark: "",
  });

  const selectedPlan = useMemo(
    () => (productionPlansData as any[]).find((plan: any) => Number(plan.id) === Number(formData.planId)),
    [productionPlansData, formData.planId],
  );
  const selectedPlanProductId = Number(selectedPlan?.productId || 0);
  const {
    data: selectedPlanBomItems = [],
    isLoading: selectedPlanBomLoading,
  } = trpc.bom.list.useQuery(
    { productId: selectedPlanProductId },
    { enabled: formData.orderType === "semi_finished" && selectedPlanProductId > 0 },
  );
  const eligibleSemiFinishedProducts = useMemo(() => {
    if (formData.orderType !== "semi_finished" || !selectedPlanProductId) return [];
    const level2Items = (selectedPlanBomItems as any[]).filter((item: any) => !item.parentId || Number(item.level) === 2);
    const semiFinishedParentIds = new Set(
      (selectedPlanBomItems as any[])
        .filter((item: any) => item.parentId)
        .map((item: any) => Number(item.parentId))
        .filter((id: number) => Number.isFinite(id)),
    );
    return level2Items
      .filter((item: any) => semiFinishedParentIds.has(Number(item.id)))
      .map((item: any) => {
        const product = (productsData as any[]).find(
          (candidate: any) =>
            candidate.status === "active" &&
            candidate.sourceType === "production" &&
            String(candidate.code || "").trim() === String(item.materialCode || "").trim(),
        );
        if (!product) return null;
        return {
          ...product,
          bomQuantity: item.quantity,
          bomUnit: item.unit,
          baseProductQty: item.baseProductQty,
          baseProductUnit: item.baseProductUnit,
        };
      })
      .filter(Boolean);
  }, [formData.orderType, productsData, selectedPlanBomItems, selectedPlanProductId]);
  const eligibleSemiFinishedProductIds = useMemo(
    () => new Set(eligibleSemiFinishedProducts.map((product: any) => Number(product.id))),
    [eligibleSemiFinishedProducts],
  );

  const today = new Date().toISOString().split("T")[0];

  const buildDefaultFormData = (orderType: OrderType = "finished") => ({
    orderType,
    planId: 0,
    planNo: "",
    salesOrderId: 0,
    productId: 0,
    productName: "",
    productCode: "",
    productSpec: "",
    productDescription: "",
    batchNo: generateBatchNo(orderType, ordersRaw as any[]),
    plannedQty: "",
    unit: "",
    plannedStartDate: today,
    plannedEndDate: "",
    deliveryDate: "",
    productionDate: today,
    expiryDate: "",
    status: "in_progress" as ProductionOrderRow["status"],
    remark: "",
  });

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData(buildDefaultFormData("finished"));
    setFormDialogOpen(true);
  };

  const handleEdit = (record: ProductionOrderRow) => {
    setIsEditing(true);
    setSelectedRecord(record);
    const product = (productsData as any[]).find((p: any) => p.id === record.productId);
    setFormData({
      orderType: record.orderType || "finished",
      planId: record.planId || 0,
      planNo: "",
      salesOrderId: record.salesOrderId || 0,
      productId: record.productId,
      productName: product?.name || "",
      productCode: product?.code || "",
      productSpec: product?.specification || "",
      productDescription: product?.description || "",
      batchNo: record.batchNo || "",
      plannedQty: normalizePlanQtyInput(record.plannedQty),
      unit: record.unit || "",
      plannedStartDate: record.plannedStartDate ? fmtDate(record.plannedStartDate) : "",
      plannedEndDate: record.plannedEndDate ? fmtDate(record.plannedEndDate) : "",
      deliveryDate: "",
      productionDate: record.productionDate ? fmtDate(record.productionDate) : today,
      expiryDate: record.expiryDate ? fmtDate(record.expiryDate) : "",
      status: record.status,
      remark: record.remark || "",
    });
    setFormDialogOpen(true);
  };

  const handleView = (record: ProductionOrderRow) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: ProductionOrderRow) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: record.id });
  };

  // 打印生产指令
  const handlePrint = (record: ProductionOrderRow) => {
    const company = companyInfoData as any;
    const product = (productsData as any[]).find((p: any) => p.id === record.productId);
    const orderTypeLabel = orderTypeMap[record.orderType]?.label || record.orderType;
    const statusLabel = statusMap[record.status]?.label || record.status;
    const logoHtml = company?.logoUrl
      ? `<img src="${company.logoUrl}" alt="logo" style="height:60px;object-fit:contain;" />`
      : `<div style="width:60px;height:60px;background:#e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#9ca3af;">LOGO</div>`;
    const progress = record.plannedQty ? String(Math.round((Number(record.completedQty || 0) / Number(record.plannedQty)) * 100)) : "0";
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>生产指令 ${record.orderNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'SimSun', 'Arial', sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20px 28px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .company-name { font-size: 18px; font-weight: bold; line-height: 1.3; }
  .company-name-en { font-size: 11px; color: #555; }
  .doc-title { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-bottom: 4px; }
  .doc-no { text-align: right; font-size: 11px; color: #555; }
  .section { margin-bottom: 12px; }
  .section-title { font-size: 12px; font-weight: bold; background: #f3f4f6; padding: 3px 8px; border-left: 3px solid #111; margin-bottom: 6px; }
  table.info { width: 100%; border-collapse: collapse; }
  table.info td { padding: 5px 8px; border: 1px solid #d1d5db; font-size: 12px; }
  table.info td.label { background: #f9fafb; font-weight: bold; width: 15%; white-space: nowrap; }
  .progress-bar-wrap { background: #e5e7eb; border-radius: 4px; height: 10px; width: 100%; }
  .progress-bar { background: #16a34a; height: 10px; border-radius: 4px; width: ${progress}%; }
  .sign-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .sign-table td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; height: 50px; font-size: 11px; }
  .sign-table th { border: 1px solid #d1d5db; padding: 5px 10px; background: #f9fafb; font-size: 11px; }
  .footer { margin-top: 16px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 6px; }
  @media print { body { padding: 10px 16px; } }
</style>
</head>
<body>
  <!-- 文件标题 -->
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div>
        <div class="company-name">${company?.companyNameCn || '公司名称'}</div>
        ${company?.companyNameEn ? `<div class="company-name-en">${company.companyNameEn}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div class="doc-title">生产指令</div>
      <div class="doc-no">指令单号：${record.orderNo}</div>
      <div class="doc-no">打印时间：${(() => { const d = new Date(); const y = d.getFullYear(); const mo = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); const h = String(d.getHours()).padStart(2,'0'); const min = String(d.getMinutes()).padStart(2,'0'); return `${y}-${mo}-${day} ${h}:${min}`; })()}</div>
    </div>
  </div>

  <!-- 基本信息 -->
  <div class="section">
    <div class="section-title">基本信息</div>
    <table class="info">
      <tr>
        <td class="label">指令单号</td><td>${record.orderNo}</td>
        <td class="label">指令类型</td><td>${orderTypeLabel}</td>
        <td class="label">状态</td><td>${statusLabel}</td>
      </tr>
      <tr>
        <td class="label">产品名称</td><td colspan="3">${record.productName || '-'}</td>
        <td class="label">产品编码</td><td>${record.productCode || '-'}</td>
      </tr>
      <tr>
        <td class="label">规格型号</td><td>${record.productSpec || product?.specification || '-'}</td>
        <td class="label">批次号</td><td>${record.batchNo || '-'}</td>
        <td class="label">关联计划</td><td>${(record as any).planNo || record.planId || '-'}</td>
      </tr>
      <tr>
        <td class="label">计划数量</td><td>${formatPlanQty(record.plannedQty)} ${record.unit || ''}</td>
        <td class="label">完成数量</td><td>${formatPlanQty(record.completedQty || '0')} ${record.unit || ''}</td>
        <td class="label">完成进度</td><td>${progress}%</td>
      </tr>
    </table>
  </div>

  <!-- 时间安排 -->
  <div class="section">
    <div class="section-title">时间安排</div>
    <table class="info">
      <tr>
        <td class="label">计划开始</td><td>${fmtDate(record.plannedStartDate)}</td>
        <td class="label">计划完成（交期）</td><td>${fmtDate(record.plannedEndDate)}</td>
        <td class="label">生产日期</td><td>${fmtDate(record.productionDate)}</td>
      </tr>
      <tr>
        <td class="label">实际开始</td><td>${fmtDate(record.actualStartDate)}</td>
        <td class="label">实际完成</td><td>${fmtDate(record.actualEndDate)}</td>
        <td class="label">有效期至</td><td>${fmtDate(record.expiryDate)}</td>
      </tr>
    </table>
  </div>

  ${product?.description ? `
  <!-- 产品描述 -->
  <div class="section">
    <div class="section-title">产品描述</div>
    <table class="info"><tr><td style="padding:6px 8px;">${product.description}</td></tr></table>
  </div>` : ''}

  ${record.remark ? `
  <!-- 备注 -->
  <div class="section">
    <div class="section-title">备注</div>
    <table class="info"><tr><td style="padding:6px 8px;">${record.remark}</td></tr></table>
  </div>` : ''}

  <!-- 生产进度 -->
  <div class="section">
    <div class="section-title">生产进度</div>
    <div style="padding:6px 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span>已完成：${formatPlanQty(record.completedQty || '0')} ${record.unit || ''} / 计划：${formatPlanQty(record.plannedQty)} ${record.unit || ''}</span>
        <span style="font-weight:bold;">${progress}%</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar"></div></div>
    </div>
  </div>

  <!-- 签名栏 -->
  <div class="section">
    <div class="section-title">签名确认</div>
    <table class="sign-table">
      <tr>
        <th>制单人</th><th>审核人</th><th>生产负责人</th><th>质量确认</th><th>仓库确认</th>
      </tr>
      <tr>
        <td></td><td></td><td></td><td></td><td></td>
      </tr>
      <tr>
        <th>日期</th><th>日期</th><th>日期</th><th>日期</th><th>日期</th>
      </tr>
      <tr>
        <td></td><td></td><td></td><td></td><td></td>
      </tr>
    </table>
  </div>

  <div class="footer">${company?.companyNameCn || ''} ${company?.addressCn ? '· ' + company.addressCn : ''} ${company?.phone ? '· Tel: ' + company.phone : ''}</div>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    }
  };

  // 切换指令类型时自动重新生成批号
  const handleOrderTypeChange = (type: OrderType) => {
    const batchNo = generateBatchNo(type, ordersRaw as any[]);
    setFormData((f) => ({ ...f, orderType: type, batchNo, planId: 0, planNo: "", salesOrderId: 0, productId: 0, productName: "", productCode: "" }));
  };

  // 选择生产计划后自动带入产品信息
  const handlePlanSelect = (plan: any) => {
    const product = (productsData as any[]).find((p: any) => p.id === plan.productId);
    setFormData((prev) => {
      if (prev.orderType === "semi_finished") {
        return {
          ...prev,
          planId: plan.id,
          planNo: plan.planNo,
          salesOrderId: Number(plan.salesOrderId) || 0,
          productId: 0,
          productName: "",
          productCode: "",
          productSpec: "",
          productDescription: "",
          plannedQty: "",
          unit: "",
          plannedStartDate: plan.plannedStartDate ? fmtDate(plan.plannedStartDate) : prev.plannedStartDate,
          plannedEndDate: plan.plannedEndDate ? fmtDate(plan.plannedEndDate) : "",
          deliveryDate: plan.plannedEndDate ? fmtDate(plan.plannedEndDate) : "",
          expiryDate: "",
          status: "in_progress",
          remark: plan.salesOrderNo ? `来源生产计划：${plan.planNo}（关联销售订单：${plan.salesOrderNo}）` : `来源生产计划：${plan.planNo}`,
        };
      }
      const nextProductionDate = prev.productionDate || today;
      const expiryDate = product?.shelfLife ? calcExpiryDate(nextProductionDate, Number(product.shelfLife)) : "";
      return {
        ...prev,
        planId: plan.id,
        planNo: plan.planNo,
        salesOrderId: Number(plan.salesOrderId) || 0,
        productId: plan.productId,
        productName: product?.name || plan.productName || "",
        productCode: product?.code || "",
        productSpec: product?.specification || "",
        productDescription: product?.description || "",
        plannedQty: normalizePlanQtyInput(plan.plannedQty),
        unit: plan.unit || product?.unit || "",
        plannedEndDate: plan.plannedEndDate ? fmtDate(plan.plannedEndDate) : "",
        deliveryDate: plan.plannedEndDate ? fmtDate(plan.plannedEndDate) : "",
        expiryDate,
        status: "in_progress",
        remark: plan.salesOrderNo ? `关联销售订单: ${plan.salesOrderNo}` : prev.remark,
      };
    });
    setPlanPickerOpen(false);
  };

  useEffect(() => {
    if (hasHandledCreateFromPlan) return;
    const params = new URLSearchParams(window.location.search);
    const rawPlanId = Number(params.get("createFromPlanId") || "");
    if (!Number.isInteger(rawPlanId) || rawPlanId <= 0) {
      setHasHandledCreateFromPlan(true);
      return;
    }
    if (!(productionPlansData as any[]).length) return;
    const targetPlan = (productionPlansData as any[]).find((plan: any) => Number(plan.id) === rawPlanId);
    setHasHandledCreateFromPlan(true);
    if (!targetPlan) {
      toast.error("生产计划不存在或已不可用");
      window.history.replaceState({}, "", "/production/orders");
      return;
    }
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData(buildDefaultFormData("finished"));
    setFormDialogOpen(true);
    handlePlanSelect(targetPlan);
    window.history.replaceState({}, "", "/production/orders");
  }, [productionPlansData, hasHandledCreateFromPlan]);

  // 选择产品后自动带入信息
  const handleProductSelect = (product: any) => {
    if (formData.orderType === "semi_finished") {
      if (!formData.planId) {
        toast.error("请先选择来源生产计划");
        return;
      }
      if (!eligibleSemiFinishedProductIds.has(Number(product.id))) {
        toast.error("该半成品不在当前生产计划范围内");
        return;
      }
    }
    const newProductionDate = formData.productionDate || today;
    const expiryDate = product?.shelfLife ? calcExpiryDate(newProductionDate, Number(product.shelfLife)) : "";
    const semiFinishedBomItem = formData.orderType === "semi_finished"
      ? eligibleSemiFinishedProducts.find((item: any) => Number(item.id) === Number(product.id))
      : null;
    setFormData({
      ...formData,
      productId: product.id,
      productName: product.name || "",
        productCode: product.code || "",
        productSpec: product.specification || "",
        productDescription: product.description || "",
        plannedQty: semiFinishedBomItem
          ? calcSemiFinishedQty(selectedPlan?.plannedQty, semiFinishedBomItem.bomQuantity, semiFinishedBomItem.baseProductQty)
          : normalizePlanQtyInput(formData.plannedQty),
        unit: semiFinishedBomItem?.bomUnit || product.unit || formData.unit,
        expiryDate,
      });
    setProductPickerOpen(false);
  };

  useEffect(() => {
    if (formData.orderType !== "semi_finished" || !formData.productId) return;
    if (eligibleSemiFinishedProductIds.size === 0) return;
    if (eligibleSemiFinishedProductIds.has(Number(formData.productId))) return;
    setFormData((prev) => ({
      ...prev,
      productId: 0,
      productName: "",
      productCode: "",
      productSpec: "",
      productDescription: "",
      plannedQty: "",
      unit: "",
      expiryDate: "",
    }));
  }, [eligibleSemiFinishedProductIds, formData.orderType, formData.productId]);

  useEffect(() => {
    if (formData.orderType !== "semi_finished" || !formData.planId || formData.productId) return;
    if (eligibleSemiFinishedProducts.length === 0) return;
    const onlySemiFinishedProduct = eligibleSemiFinishedProducts[0] as any;
    const nextPlannedQty = calcSemiFinishedQty(
      selectedPlan?.plannedQty,
      onlySemiFinishedProduct.bomQuantity,
      onlySemiFinishedProduct.baseProductQty,
    );
    setFormData((prev) => {
      if (prev.orderType !== "semi_finished" || !prev.planId || prev.productId) return prev;
      return {
        ...prev,
        productId: onlySemiFinishedProduct.id,
        productName: onlySemiFinishedProduct.name || "",
        productCode: onlySemiFinishedProduct.code || "",
        productSpec: onlySemiFinishedProduct.specification || "",
        productDescription: onlySemiFinishedProduct.description || "",
        plannedQty: nextPlannedQty,
        unit: onlySemiFinishedProduct.bomUnit || onlySemiFinishedProduct.unit || "",
        expiryDate: onlySemiFinishedProduct?.shelfLife
          ? calcExpiryDate(prev.productionDate || today, Number(onlySemiFinishedProduct.shelfLife))
          : "",
      };
    });
  }, [eligibleSemiFinishedProducts, formData.orderType, formData.planId, formData.productId, selectedPlan, today]);

  // 生产日期变化时重新计算有效期至
  const handleProductionDateChange = (date: string) => {
    const product = (productsData as any[]).find((p: any) => p.id === formData.productId);
    const expiryDate = product?.shelfLife ? calcExpiryDate(date, Number(product.shelfLife)) : formData.expiryDate;
    setFormData({ ...formData, productionDate: date, expiryDate });
  };

  const handleSubmit = () => {
    if (!formData.productId || !formData.plannedQty) {
      toast.error("请选择产品并填写计划数量");
      return;
    }
    if (formData.orderType === "semi_finished" && !formData.planId) {
      toast.error("半成品指令必须关联来源生产计划");
      return;
    }
    const normalizedPlannedQty = normalizePlanQtyInput(formData.plannedQty);
    const normalizedPlannedStartDate = normalizeDateInputValue(formData.plannedStartDate, true);
    const normalizedPlannedEndDate = normalizeDateInputValue(formData.plannedEndDate, true);
    const normalizedProductionDate = normalizeDateInputValue(formData.productionDate, true);
    const normalizedExpiryDate = normalizeDateInputValue(formData.expiryDate, true);
    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          orderType: formData.orderType,
          productId: formData.productId,
          plannedQty: normalizedPlannedQty,
          unit: formData.unit || undefined,
          batchNo: formData.batchNo || undefined,
          plannedStartDate: normalizedPlannedStartDate || undefined,
          plannedEndDate: normalizedPlannedEndDate || undefined,
          productionDate: normalizedProductionDate || undefined,
          expiryDate: normalizedExpiryDate || undefined,
          planId: formData.planId || undefined,
          status: formData.status,
          remark: formData.remark || undefined,
        },
      });
    } else {
      createMutation.mutate({
        orderNo: undefined,
        orderType: formData.orderType,
        productId: formData.productId,
        plannedQty: normalizedPlannedQty,
        unit: formData.unit || undefined,
        batchNo: formData.batchNo || undefined,
        plannedStartDate: normalizedPlannedStartDate || undefined,
        plannedEndDate: normalizedPlannedEndDate || undefined,
        productionDate: normalizedProductionDate || undefined,
        expiryDate: normalizedExpiryDate || undefined,
        planId: formData.planId || undefined,
        salesOrderId: formData.salesOrderId || undefined,
        status: formData.status,
        remark: formData.remark || undefined,
      });
    }
  };

  // 保存草稿（不校验必填项，status=draft）
  const handleSaveDraft = () => {
    const normalizedPlannedQty = normalizePlanQtyInput(formData.plannedQty) || "0";
    saveDraftMutation.mutate({
      orderNo: undefined,
      orderType: formData.orderType,
      productId: formData.productId || 0,
      plannedQty: normalizedPlannedQty,
      unit: formData.unit || undefined,
      batchNo: formData.batchNo || undefined,
      plannedStartDate: normalizeDateInputValue(formData.plannedStartDate, true) || undefined,
      plannedEndDate: normalizeDateInputValue(formData.plannedEndDate, true) || undefined,
      productionDate: normalizeDateInputValue(formData.productionDate, true) || undefined,
      expiryDate: normalizeDateInputValue(formData.expiryDate, true) || undefined,
      planId: formData.planId || undefined,
      salesOrderId: formData.salesOrderId || undefined,
      status: "draft",
      remark: formData.remark || undefined,
    });
  };

  // 从草稿库发布为已计划
  const handlePublishDraft = (record: ProductionOrderRow) => {
    updateMutation.mutate({ id: record.id, data: { status: "in_progress" } });
    setDraftLibOpen(false);
  };

  // 从草稿库继续编辑
  const handleEditDraft = (record: ProductionOrderRow) => {
    setDraftLibOpen(false);
    handleEdit(record);
  };

  const handleStatusChange = (record: ProductionOrderRow, newStatus: ProductionOrderRow["status"]) => {
    const updates: any = { status: newStatus };
    if (newStatus === "in_progress" && !record.actualStartDate) updates.actualStartDate = new Date().toISOString().split("T")[0];
    if (newStatus === "completed") { updates.actualEndDate = new Date().toISOString().split("T")[0]; updates.completedQty = normalizePlanQtyInput(record.plannedQty); }
    updateMutation.mutate({ id: record.id, data: updates });
  };

  const stats = {
    total: (ordersRaw as any[]).length,
    finished: (ordersRaw as any[]).filter((r: any) => r.orderType === "finished").length,
    semiFinished: (ordersRaw as any[]).filter((r: any) => r.orderType === "semi_finished").length,
    rework: (ordersRaw as any[]).filter((r: any) => r.orderType === "rework").length,
    inProgress: (ordersRaw as any[]).filter((r: any) => r.status === "in_progress").length,
  };

  /** 产品描述：超过80字折叠，点击展开 */
  const DescriptionCell = ({ text, label }: { text: string; label?: string }) => {
    const [expanded, setExpanded] = useState(false);
    const LIMIT = 80;
    const isLong = text.length > LIMIT;
    return (
      <div>
        {label && <span className="text-muted-foreground">{label}</span>}
        <span className={!expanded && isLong ? "line-clamp-2" : ""}>
          {!expanded && isLong ? text.slice(0, LIMIT) + "…" : text}
        </span>
        {isLong && (
          <button
            type="button"
            className="ml-1 text-xs text-primary underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "收起" : "展开"}
          </button>
        )}
      </div>
    );
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
              <Cog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">生产指令</h1>
              <p className="text-sm text-muted-foreground">管理成品、半成品及返工生产指令</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDraftLibOpen(true)}>
              <span className="mr-1">📂</span>草稿库
              {(ordersRaw as any[]).filter((r: any) => r.status === "draft").length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {(ordersRaw as any[]).filter((r: any) => r.status === "draft").length}
                </span>
              )}
            </Button>
            <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />新建生产指令</Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">全部指令</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{stats.finished}</div><div className="text-sm text-muted-foreground">成品</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-blue-600">{stats.semiFinished}</div><div className="text-sm text-muted-foreground">半成品</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-600">{stats.rework}</div><div className="text-sm text-muted-foreground">返工</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div><div className="text-sm text-muted-foreground">生产中</div></CardContent></Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索指令单号、批次号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="指令类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="finished">成品</SelectItem>
              <SelectItem value="semi_finished">半成品</SelectItem>
              <SelectItem value="rework">返工</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="planned">已计划</SelectItem>
              <SelectItem value="in_progress">生产中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">指令单号</TableHead>
                <TableHead className="text-center font-bold">指令类型</TableHead>
                <TableHead className="text-center font-bold">批次号</TableHead>
                <TableHead className="text-center font-bold min-w-[180px]">产品名称</TableHead>
                <TableHead className="text-center font-bold">生产进度</TableHead>
                <TableHead className="text-center font-bold">交期</TableHead>
                <TableHead className="text-center font-bold">生产日期</TableHead>
                <TableHead className="text-center font-bold">有效期至</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedData.map((record: any) => {
                const planned = Number(record.plannedQty || 0);
                const completed = Number(record.completedQty || 0);
                const progress = planned > 0 ? (completed / planned) * 100 : 0;
                const typeInfo = orderTypeMap[record.orderType as OrderType] || orderTypeMap.finished;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono">{record.orderNo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={typeInfo.badge} className={typeInfo.color}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium font-mono">{record.batchNo || "-"}</TableCell>
                    <TableCell className="text-center min-w-[180px]">
                      <div>
                        <div className="font-medium">{record.productName}</div>
                        {record.productSpec && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px] mx-auto cursor-default">{record.productSpec}</div>
                            </TooltipTrigger>
                            <TooltipContent><p className="max-w-xs whitespace-pre-wrap">{record.productSpec}</p></TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1 w-32">
                        <div className="flex items-center justify-between text-xs">
                          <span>{completed?.toLocaleString?.() ?? "0"}</span>
                          <span className="text-muted-foreground">/ {planned?.toLocaleString?.() ?? "0"}</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{fmtDate(record.plannedEndDate)}</TableCell>
                    <TableCell className="text-center">{fmtDate(record.productionDate)}</TableCell>
                    <TableCell className="text-center">{fmtDate(record.expiryDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                        {statusMap[record.status]?.label || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(record)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                          {record.status === "in_progress" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(record, "completed")}><CheckCircle className="h-4 w-4 mr-2" />完成生产</DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(record)}><Trash2 className="h-4 w-4 mr-2" />删除</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">{isLoading ? "加载中..." : "暂无数据"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <TablePaginationFooter
            total={data.length}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </Card>

        {/* 新建/编辑表单对话框 */}
        <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑生产指令" : "新建生产指令"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">

              {/* 第一行：指令类型 + 批次号 + 状态 + 关联生产计划 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>指令类型 *</Label>
                  <Select value={formData.orderType} onValueChange={(v) => handleOrderTypeChange(v as OrderType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished">成品</SelectItem>
                      <SelectItem value="semi_finished">半成品</SelectItem>
                      <SelectItem value="rework">返工</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>批次号（自动生成）</Label>
                  <Input
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    placeholder="批次号"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ProductionOrderRow["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="planned">已计划</SelectItem>
                      <SelectItem value="in_progress">生产中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 关联生产计划（成品/半成品新建时显示） */}
                {!isEditing && formData.orderType !== "rework" ? (
                  <div className="space-y-2">
                    <Label>{formData.orderType === "semi_finished" ? "来源生产计划 *" : "关联生产计划"}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal text-sm"
                      onClick={() => setPlanPickerOpen(true)}
                    >
                      {formData.planId ? (
                        <span className="flex items-center gap-1">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs">{formData.planNo}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{formData.orderType === "semi_finished" ? "点击选择来源生产计划..." : "点击选择计划..."}</span>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>计划开始日期</Label>
                    <DateTextInput
                      value={formData.plannedStartDate}
                      onChange={(value) => setFormData({ ...formData, plannedStartDate: value })}
                    />
                  </div>
                )}
              </div>

              {/* 第二行：产品名称（弹窗选择） */}
              <div className="space-y-2">
                <Label>产品名称 *</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                  onClick={() => {
                    if (formData.orderType === "semi_finished" && !formData.planId) {
                      toast.error("请先选择来源生产计划");
                      return;
                    }
                    if (
                      formData.orderType === "semi_finished" &&
                      formData.planId &&
                      !selectedPlanBomLoading &&
                      eligibleSemiFinishedProducts.length === 0
                    ) {
                      toast.error("当前生产计划未包含可下达的半成品");
                      return;
                    }
                    setProductPickerOpen(true);
                  }}
                >
                  {formData.productId ? (
                    <span className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="font-mono text-xs text-muted-foreground">{formData.productCode}</span>
                      <span className="font-medium">{formData.productName}</span>
                      {formData.productSpec && <span className="text-muted-foreground text-xs">· {formData.productSpec}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">点击选择产品...</span>
                  )}
                </Button>
                {formData.orderType === "semi_finished" && !formData.planId && (
                  <p className="text-xs text-muted-foreground">半成品指令先选择来源生产计划，再从该计划包含的半成品中选择产品</p>
                )}
                {formData.orderType === "semi_finished" && formData.planId && !selectedPlanBomLoading && eligibleSemiFinishedProducts.length === 0 && (
                  <p className="text-xs text-amber-600">当前生产计划未配置半成品 BOM 子项，暂时无法创建半成品指令</p>
                )}
              </div>

              {/* 产品信息展示（只读） */}
              {formData.productId > 0 && (formData.productSpec || formData.productDescription) && (
                <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                  {formData.productSpec && (
                    <div><span className="text-muted-foreground">规格型号：</span><span>{formData.productSpec}</span></div>
                  )}
                  {formData.productDescription && (
                    <DescriptionCell text={formData.productDescription} label="产品描述：" />
                  )}
                </div>
              )}

              {/* 第三行：计划数量 + 单位 + 计划开始 + 计划完成 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>计划数量 *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.plannedQty}
                    onChange={(e) => setFormData({ ...formData, plannedQty: e.target.value })}
                    onBlur={(e) => setFormData({ ...formData, plannedQty: normalizePlanQtyInput(e.target.value) })}
                    placeholder="数量"
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="个/套/件" />
                </div>
                <div className="space-y-2">
                  <Label>计划开始日期</Label>
                  <DateTextInput
                    value={formData.plannedStartDate}
                    onChange={(value) => setFormData({ ...formData, plannedStartDate: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>计划完成日期</Label>
                  <DateTextInput
                    value={formData.plannedEndDate}
                    onChange={(value) => setFormData({ ...formData, plannedEndDate: value })}
                  />
                  {formData.deliveryDate && (
                    <p className="text-xs text-amber-600">交期 {formData.deliveryDate} 前</p>
                  )}
                  {formData.deliveryDate && formData.plannedEndDate && formData.plannedEndDate > formData.deliveryDate && (
                    <p className="text-xs text-destructive">警告：计划完成日期超过交期</p>
                  )}
                </div>
              </div>

              {/* 第四行：生产日期 + 有效期至 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>生产日期</Label>
                  <DateTextInput
                    value={formData.productionDate}
                    onChange={(value) => handleProductionDateChange(value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>有效期至</Label>
                  <DateTextInput
                    value={formData.expiryDate}
                    onChange={(value) => setFormData({ ...formData, expiryDate: value })}
                    placeholder="根据保质期自动计算"
                  />
                  {formData.productId > 0 && (() => {
                    const product = (productsData as any[]).find((p: any) => p.id === formData.productId);
                    return product?.shelfLife ? (
                      <p className="text-xs text-muted-foreground">保质期 {product.shelfLife} 个月，自动计算</p>
                    ) : null;
                  })()}
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} placeholder="输入备注信息" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>取消</Button>
              {!isEditing && (
                <Button variant="secondary" onClick={handleSaveDraft} disabled={saveDraftMutation.isPending}>
                  保存草稿
                </Button>
              )}
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {isEditing ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 关联生产计划弹窗选择器 */}
        <EntityPickerDialog
          open={planPickerOpen}
          onOpenChange={setPlanPickerOpen}
          title="选择生产计划"
          searchPlaceholder="搜索计划编号、产品名称..."
          columns={[
            { key: "planNo", title: "计划编号", className: "w-[160px] whitespace-nowrap", render: (p) => <span className="font-mono">{p.planNo}</span> },
            { key: "productName", title: "产品名称", className: "max-w-[160px]", render: (p) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate max-w-[150px] font-medium cursor-default">{p.productName || "-"}</span>
                </TooltipTrigger>
                <TooltipContent><p className="max-w-xs">{p.productName}</p></TooltipContent>
              </Tooltip>
            )},
            { key: "productSpecification", title: "规格型号", className: "max-w-[140px]", render: (p) => p.productSpecification ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate max-w-[130px] text-muted-foreground cursor-default">{p.productSpecification}</span>
                </TooltipTrigger>
                <TooltipContent><p className="max-w-xs">{p.productSpecification}</p></TooltipContent>
              </Tooltip>
            ) : <span className="text-muted-foreground">-</span> },
            { key: "plannedQty", title: "计划数量", className: "w-[120px] whitespace-nowrap", render: (p) => <span>{formatPlanQty(p.plannedQty)} {p.unit}</span> },
            { key: "plannedEndDate", title: "交期", className: "w-[90px] whitespace-nowrap", render: (p) => <span className="font-medium text-amber-600">{fmtDate(p.plannedEndDate)}</span> },
            { key: "salesOrderNo", title: "销售订单", className: "w-[120px] whitespace-nowrap", render: (p) => <span className="text-muted-foreground font-mono">{p.salesOrderNo || "内部计划"}</span> },
          ]}
          rows={availablePlans}
          selectedId={formData.planId ? String(formData.planId) : ""}
          defaultWidth={900}
          filterFn={(p, q) => {
            const lower = q.toLowerCase();
            return String(p.planNo || "").toLowerCase().includes(lower) ||
              String(p.productName || "").toLowerCase().includes(lower);
          }}
          onSelect={handlePlanSelect}
        />

        {/* 产品选择弹窗 */}
        <EntityPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          title={formData.orderType === "semi_finished" ? "选择半成品" : "选择产品"}
          searchPlaceholder={formData.orderType === "semi_finished" ? "搜索半成品编码、名称、规格..." : "搜索产品编码、名称、规格..."}
          columns={[
            { key: "code", title: "产品编码", render: (p) => <span className="font-mono font-medium">{p.code}</span> },
            { key: "name", title: "产品名称", render: (p) => <span className="font-medium">{p.name}</span> },
            { key: "specification", title: "规格型号", render: (p) => <span className="text-muted-foreground">{p.specification || "-"}</span> },
            { key: "unit", title: "单位" },
            { key: "shelfLife", title: "保质期", render: (p) => <span>{p.shelfLife ? `${p.shelfLife}个月` : "-"}</span> },
          ]}
          rows={formData.orderType === "semi_finished"
            ? eligibleSemiFinishedProducts
            : (productsData as any[]).filter((p: any) => p.status === "active" && p.sourceType === "production")}
          selectedId={formData.productId ? String(formData.productId) : ""}
          filterFn={(p, q) => {
            const lower = q.toLowerCase();
            return String(p.code || "").toLowerCase().includes(lower) ||
              String(p.name || "").toLowerCase().includes(lower) ||
              String(p.specification || "").toLowerCase().includes(lower);
          }}
          onSelect={handleProductSelect}
        />

        {/* 查看详情 */}
{selectedRecord && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">生产指令详情</h2>
        <p className="text-sm text-muted-foreground">
          {selectedRecord.orderNo}
          {selectedRecord.status && (
            <> · <Badge variant={statusMap[selectedRecord.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(selectedRecord.status, statusMap[selectedRecord.status]?.label)}`}>
              {statusMap[selectedRecord.status]?.label || String(selectedRecord.status ?? "-")}
            </Badge></>
          )}
        </p>
      </div>

      <div className="py-4 space-y-6 max-h-[65vh] overflow-y-auto pr-2">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品名称">{selectedRecord.productName}</FieldRow>
              <FieldRow label="产品编码">{selectedRecord.productCode}</FieldRow>
              <FieldRow label="规格型号">{selectedRecord.productSpec || '-'}</FieldRow>
            </div>
            <div>
              <FieldRow label="指令类型">
                <Badge variant={orderTypeMap[selectedRecord.orderType].badge} className={orderTypeMap[selectedRecord.orderType].color}>
                  {orderTypeMap[selectedRecord.orderType].label}
                </Badge>
              </FieldRow>
              <FieldRow label="批次号">{selectedRecord.batchNo || '-'}</FieldRow>
              <FieldRow label="关联计划">{(selectedRecord as any).planNo || selectedRecord.planId || '-'}</FieldRow>
            </div>
          </div>
          {(() => {
            const product = (productsData as any[]).find((p: any) => p.id === selectedRecord.productId);
            return product?.description ? (
              <div className="mt-2 pt-2 border-t border-border/40">
                <span className="text-sm text-muted-foreground">产品描述：</span>
                <DescriptionCell text={product.description} />
              </div>
            ) : null;
          })()}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">生产进度</h3>
          <div className="space-y-2">
            <Progress value={(Number(selectedRecord.completedQty || 0) / Number(selectedRecord.plannedQty)) * 100} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {formatPlanQty(selectedRecord.completedQty || 0)} / <span className="text-muted-foreground">{formatPlanQty(selectedRecord.plannedQty)} {selectedRecord.unit}</span>
              </span>
              <span className="font-bold text-lg">
                {Math.round((Number(selectedRecord.completedQty || 0) / Number(selectedRecord.plannedQty)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">时间安排</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="计划开始">{fmtDate(selectedRecord.plannedStartDate)}</FieldRow>
              <FieldRow label="计划完成">{fmtDate(selectedRecord.plannedEndDate)}</FieldRow>
              <FieldRow label="生产日期">{fmtDate(selectedRecord.productionDate)}</FieldRow>
            </div>
            <div>
              <FieldRow label="实际开始">{fmtDate(selectedRecord.actualStartDate)}</FieldRow>
              <FieldRow label="实际完成">{fmtDate(selectedRecord.actualEndDate)}</FieldRow>
              <FieldRow label="有效期至">{fmtDate(selectedRecord.expiryDate)}</FieldRow>
            </div>
          </div>
        </div>

        {selectedRecord.remark && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remark}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap">
          {selectedRecord.status === "in_progress" && (
            <Button size="sm" onClick={() => handleStatusChange(selectedRecord, "completed")}><CheckCircle className="h-4 w-4 mr-2" />完成生产</Button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          {productionOrderPrintData ? (
            <TemplatePrintPreviewButton
              templateKey="production_order"
              data={productionOrderPrintData}
              title={`生产指令打印预览 - ${selectedRecord.orderNo}`}
            />
          ) : null}
          <Button variant="outline" size="sm" onClick={() => handlePrint(selectedRecord)}>🖨️ 打印</Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedRecord)}>删除</Button>
          )}
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      {/* 草稿库弹窗 */}
      <DraggableDialog open={draftLibOpen} onOpenChange={setDraftLibOpen} defaultWidth={860} defaultHeight={520}>
        <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📂 草稿库</DialogTitle>
          </DialogHeader>
          <div className="mt-3">
            {(() => {
              const drafts = (ordersRaw as any[]).filter((r: any) => r.status === "draft");
              if (drafts.length === 0) {
                return (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="text-4xl mb-3">📄</p>
                    <p>草稿库为空，新建生产指令时点击“保存草稿”即可保存</p>
                  </div>
                );
              }
              return (
                <div className="border rounded-lg overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                  <div className="max-h-[360px] overflow-y-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="py-2 text-xs">指令单号</TableHead>
                          <TableHead className="py-2 text-xs">指令类型</TableHead>
                          <TableHead className="py-2 text-xs">产品名称</TableHead>
                          <TableHead className="py-2 text-xs">规格型号</TableHead>
                          <TableHead className="py-2 text-xs">计划数量</TableHead>
                          <TableHead className="py-2 text-xs">交期</TableHead>
                          <TableHead className="py-2 text-xs">创建时间</TableHead>
                          <TableHead className="py-2 text-xs text-right w-[140px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drafts.map((r: any) => {
                          const product = (productsData as any[]).find((p: any) => p.id === r.productId);
                          return (
                            <TableRow key={r.id} className="hover:bg-muted/50">
                              <TableCell className="py-1.5 font-mono">{r.orderNo}</TableCell>
                              <TableCell className="py-1.5">
                                <Badge variant={orderTypeMap[r.orderType as OrderType]?.badge || "outline"} className="text-xs">
                                  {orderTypeMap[r.orderType as OrderType]?.label || r.orderType}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 max-w-[140px]">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate max-w-[130px] font-medium cursor-default">{product?.name || r.productName || "-"}</span>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{product?.name || r.productName}</p></TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="py-1.5 text-muted-foreground">{product?.specification || "-"}</TableCell>
                              <TableCell className="py-1.5">{formatPlanQty(r.plannedQty)} {r.unit || ""}</TableCell>
                              <TableCell className="py-1.5 text-amber-600 font-medium">{fmtDate(r.plannedEndDate)}</TableCell>
                              <TableCell className="py-1.5 text-muted-foreground">{fmtDate(r.createdAt)}</TableCell>
                              <TableCell className="py-1.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700" onClick={() => handleEditDraft(r)}>
                                    编辑
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-green-600 hover:text-green-700" onClick={() => handlePublishDraft(r)}>
                                    发布
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500 hover:text-red-600" onClick={() => { deleteMutation.mutate({ id: r.id }); }}>
                                    删除
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDraftLibOpen(false)}>关闭</Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      </div>
    </ERPLayout>
  );
}
