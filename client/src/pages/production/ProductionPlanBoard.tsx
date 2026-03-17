import { useEffect, useMemo, useState } from "react";
import { formatDateValue, formatDisplayNumber, roundToDigits } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import DateTextInput from "@/components/DateTextInput";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  LayoutDashboard, Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Play, CheckCircle, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useLocation } from "wouter";
import { PRODUCT_CATEGORY_LABELS } from "@shared/productCategories";
import { normalizeApplicableProductKey, processMatchesProduct } from "@/lib/productionProcessMatching";
import { loadProductionProcessTemplates, type ProductionProcess } from "@/pages/production/Process";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  pending:     { label: "待排产", variant: "outline" },
  semi_pending: { label: "待半成品生产", variant: "outline" },
  purchase_submitted: { label: "采购中", variant: "outline" },
  scheduled:   { label: "已排产", variant: "default" },
  in_progress: { label: "生产中", variant: "default" },
  semi_in_progress: { label: "半成品生产中", variant: "default" },
  await_finished: { label: "待成品生产", variant: "secondary" },
  completed:   { label: "已完成", variant: "secondary" },
  cancelled:   { label: "已取消", variant: "destructive" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low:    { label: "低",   color: "text-muted-foreground" },
  normal: { label: "普通", color: "text-green-600" },
  high:   { label: "高",   color: "text-orange-500" },
  urgent: { label: "紧急", color: "text-yellow-500 font-bold" },
  critical: { label: "加急", color: "text-red-600 font-bold" },
};

// 动态优先级判定：根据灭菌需求和剩余交期天数计算
const calcDynamicPriority = (plan: any): string => {
  if (!plan.plannedEndDate) return plan.priority || "normal";
  const due = new Date(String(plan.plannedEndDate));
  due.setMinutes(due.getMinutes() + due.getTimezoneOffset());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const needsSterilization = Boolean(plan.productIsSterilized);
  if (needsSterilization) {
    if (daysLeft <= 10) return "critical";
    if (daysLeft <= 25) return "urgent";
    if (daysLeft > 45) return "normal";
    return "high";
  } else {
    if (daysLeft <= 3) return "critical";
    if (daysLeft <= 5) return "urgent";
    if (daysLeft > 10) return "normal";
    return "high";
  }
};

const planTypeMap: Record<string, string> = {
  sales_driven: "销售计划",
  internal:     "内部计划",
};

const PLAN_REMARK_META_PREFIX = "__PLAN_META__:";

type SemiFinishedPlanOrder = {
  orderId: number;
  orderNo: string;
  productId: number;
  batchNo: string;
  status: string;
};

type LinkedProductionOrderSnapshot = {
  orderId: number;
  orderNo: string;
  status: string;
  planId?: number;
  salesOrderId?: number;
  salesOrderNo?: string;
  productId: number;
  productName: string;
  productCode?: string;
  productSpecification?: string;
  plannedQty: string;
  unit: string;
  batchNo: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
};

type PlanSelectedProcess = {
  processId: number;
  processCode: string;
  processName: string;
  processType: string;
  sortOrder: number;
  workshop: string;
  team: string;
  operator: string;
  standardTime: number;
  applicableProducts: string;
  controlledDocNo: string;
  controlledDocName: string;
  version: string;
  modules: string[];
  description?: string;
};

type PlanRecordBlueprintRow = {
  id: string;
  category: string;
  itemName: string;
  requirement: string;
  unit: string;
  defaultValue: string;
  guide: string;
};

type PlanRemarkMeta = {
  remark: string;
  semiFinishedOrders: SemiFinishedPlanOrder[];
  linkedProductionOrder?: LinkedProductionOrderSnapshot;
  selectedProcess?: PlanSelectedProcess;
  recordBlueprint?: PlanRecordBlueprintRow[];
};

type ProductionPlanFormState = {
  planNo: string;
  planType: "sales_driven" | "internal";
  salesOrderId: string;
  salesOrderNo: string;
  productionOrderId: string;
  productionOrderNo: string;
  productId: string;
  productName: string;
  plannedQty: string;
  unit: string;
  batchNo: string;
  plannedStartDate: string;
  plannedEndDate: string;
  priority: "low" | "normal" | "high" | "urgent";
  processId: string;
  processName: string;
  remark: string;
};

const PROCESS_MODULE_LABELS: Record<string, string> = {
  clearance: "清场记录",
  mold: "模具确认",
  materialUsage: "材料使用",
  tempHumidity: "温湿度",
  equipment: "设备确认",
  qcPoint: "关键质控点",
  firstArticle: "首件检验",
};

const PRODUCTION_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  planned: "已计划",
  in_progress: "生产中",
  completed: "已完成",
  cancelled: "已取消",
};

const parseNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizeText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[（）()\s_-]/g, "");

const formatDateInputValue = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const parsePlanRemarkMeta = (raw: unknown): PlanRemarkMeta => {
  const text = String(raw ?? "").trim();
  if (!text) return { remark: "", semiFinishedOrders: [] };
  if (!text.startsWith(PLAN_REMARK_META_PREFIX)) {
    return { remark: text, semiFinishedOrders: [] };
  }
  try {
    const parsed = JSON.parse(text.slice(PLAN_REMARK_META_PREFIX.length));
    const linkedProductionOrder =
      parsed?.linkedProductionOrder && Number.isFinite(Number(parsed.linkedProductionOrder.orderId))
        ? {
            orderId: Number(parsed.linkedProductionOrder.orderId),
            orderNo: String(parsed.linkedProductionOrder.orderNo || ""),
            status: String(parsed.linkedProductionOrder.status || ""),
            planId: parseNumber(parsed.linkedProductionOrder.planId),
            salesOrderId: parseNumber(parsed.linkedProductionOrder.salesOrderId),
            salesOrderNo: typeof parsed.linkedProductionOrder.salesOrderNo === "string"
              ? parsed.linkedProductionOrder.salesOrderNo
              : undefined,
            productId: Number(parsed.linkedProductionOrder.productId || 0),
            productName: String(parsed.linkedProductionOrder.productName || ""),
            productCode: typeof parsed.linkedProductionOrder.productCode === "string"
              ? parsed.linkedProductionOrder.productCode
              : undefined,
            productSpecification: typeof parsed.linkedProductionOrder.productSpecification === "string"
              ? parsed.linkedProductionOrder.productSpecification
              : undefined,
            plannedQty: normalizePlanQtyInput(parsed.linkedProductionOrder.plannedQty),
            unit: String(parsed.linkedProductionOrder.unit || ""),
            batchNo: String(parsed.linkedProductionOrder.batchNo || ""),
            plannedStartDate: typeof parsed.linkedProductionOrder.plannedStartDate === "string"
              ? parsed.linkedProductionOrder.plannedStartDate
              : undefined,
            plannedEndDate: typeof parsed.linkedProductionOrder.plannedEndDate === "string"
              ? parsed.linkedProductionOrder.plannedEndDate
              : undefined,
          }
        : undefined;
    const selectedProcess =
      parsed?.selectedProcess && Number.isFinite(Number(parsed.selectedProcess.processId))
        ? {
            processId: Number(parsed.selectedProcess.processId),
            processCode: String(parsed.selectedProcess.processCode || ""),
            processName: String(parsed.selectedProcess.processName || ""),
            processType: String(parsed.selectedProcess.processType || ""),
            sortOrder: Number(parsed.selectedProcess.sortOrder || 0),
            workshop: String(parsed.selectedProcess.workshop || ""),
            team: String(parsed.selectedProcess.team || ""),
            operator: String(parsed.selectedProcess.operator || ""),
            standardTime: Number(parsed.selectedProcess.standardTime || 0),
            applicableProducts: String(parsed.selectedProcess.applicableProducts || ""),
            controlledDocNo: String(parsed.selectedProcess.controlledDocNo || ""),
            controlledDocName: String(parsed.selectedProcess.controlledDocName || ""),
            version: String(parsed.selectedProcess.version || ""),
            modules: Array.isArray(parsed.selectedProcess.modules)
              ? parsed.selectedProcess.modules.map((item: unknown) => String(item || "")).filter(Boolean)
              : [],
            description: typeof parsed.selectedProcess.description === "string"
              ? parsed.selectedProcess.description
              : undefined,
          }
        : undefined;
    const recordBlueprint = Array.isArray(parsed?.recordBlueprint)
      ? parsed.recordBlueprint
          .filter((item: any) => item && typeof item.itemName === "string")
          .map((item: any) => ({
            id: String(item.id || `${item.category || ""}-${item.itemName || ""}`),
            category: String(item.category || ""),
            itemName: String(item.itemName || ""),
            requirement: String(item.requirement || ""),
            unit: String(item.unit || ""),
            defaultValue: String(item.defaultValue || ""),
            guide: String(item.guide || ""),
          }))
      : [];
    return {
      remark: typeof parsed?.remark === "string" ? parsed.remark : "",
      semiFinishedOrders: Array.isArray(parsed?.semiFinishedOrders)
        ? parsed.semiFinishedOrders
            .filter((item: any) => item && Number.isFinite(Number(item.orderId)))
            .map((item: any) => ({
              orderId: Number(item.orderId),
              orderNo: String(item.orderNo || ""),
              productId: Number(item.productId || 0),
              batchNo: String(item.batchNo || ""),
              status: String(item.status || "planned"),
            }))
        : [],
      linkedProductionOrder,
      selectedProcess,
      recordBlueprint,
    };
  } catch {
    return { remark: text, semiFinishedOrders: [] };
  }
};

const buildPlanRemarkMeta = (meta: PlanRemarkMeta) => {
  const remark = String(meta.remark || "").trim();
  const semiFinishedOrders = (meta.semiFinishedOrders || []).filter((item) => Number.isFinite(Number(item.orderId)));
  const linkedProductionOrder =
    meta.linkedProductionOrder && Number.isFinite(Number(meta.linkedProductionOrder.orderId))
      ? meta.linkedProductionOrder
      : undefined;
  const selectedProcess =
    meta.selectedProcess && Number.isFinite(Number(meta.selectedProcess.processId))
      ? {
          ...meta.selectedProcess,
          modules: Array.isArray(meta.selectedProcess.modules)
            ? meta.selectedProcess.modules.map((item) => String(item || "")).filter(Boolean)
            : [],
        }
      : undefined;
  const recordBlueprint = Array.isArray(meta.recordBlueprint)
    ? meta.recordBlueprint
        .filter((item) => item && item.itemName)
        .map((item) => ({
          id: String(item.id || `${item.category || ""}-${item.itemName || ""}`),
          category: String(item.category || ""),
          itemName: String(item.itemName || ""),
          requirement: String(item.requirement || ""),
          unit: String(item.unit || ""),
          defaultValue: String(item.defaultValue || ""),
          guide: String(item.guide || ""),
        }))
    : [];
  if (!semiFinishedOrders.length && !linkedProductionOrder && !selectedProcess && !recordBlueprint.length) {
    return remark;
  }
  return `${PLAN_REMARK_META_PREFIX}${JSON.stringify({
    remark,
    semiFinishedOrders,
    linkedProductionOrder,
    selectedProcess,
    recordBlueprint,
  })}`;
};

const buildLinkedProductionOrderSnapshot = (order: any, product: any, salesOrder?: any): LinkedProductionOrderSnapshot => ({
  orderId: Number(order?.id || 0),
  orderNo: String(order?.orderNo || ""),
  status: String(order?.status || ""),
  planId: parseNumber(order?.planId),
  salesOrderId: parseNumber(order?.salesOrderId),
  salesOrderNo: String(salesOrder?.orderNo || order?.salesOrderNo || ""),
  productId: Number(order?.productId || product?.id || 0),
  productName: String(product?.name || order?.productName || ""),
  productCode: typeof product?.code === "string" ? product.code : undefined,
  productSpecification: typeof product?.specification === "string" ? product.specification : undefined,
  plannedQty: normalizePlanQtyInput(order?.plannedQty),
  unit: String(order?.unit || product?.unit || ""),
  batchNo: String(order?.batchNo || ""),
  plannedStartDate: formatDateInputValue(order?.plannedStartDate) || undefined,
  plannedEndDate: formatDateInputValue(order?.plannedEndDate) || undefined,
});

const buildSelectedProcessSnapshot = (process: ProductionProcess): PlanSelectedProcess => ({
  processId: Number(process.id || 0),
  processCode: String(process.processCode || ""),
  processName: String(process.processName || ""),
  processType: String(process.processType || ""),
  sortOrder: Number(process.sortOrder || 0),
  workshop: String(process.workshop || ""),
  team: String(process.team || ""),
  operator: String(process.operator || ""),
  standardTime: Number(process.standardTime || 0),
  applicableProducts: String(process.applicableProducts || ""),
  controlledDocNo: String(process.controlledDocNo || ""),
  controlledDocName: String(process.controlledDocName || ""),
  version: String(process.version || ""),
  modules: Object.entries(process.modules || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => PROCESS_MODULE_LABELS[key] || key),
  description: process.description || undefined,
});

const buildBlueprintRow = (
  category: string,
  itemName: string,
  requirement: string,
  unit = "",
  defaultValue = "",
  guide = "填写本工序实际记录值",
): PlanRecordBlueprintRow => ({
  id: `${category}-${itemName}-${unit}-${defaultValue}`.replace(/\s+/g, "-"),
  category,
  itemName,
  requirement,
  unit,
  defaultValue,
  guide,
});

const buildProcessRecordBlueprint = (
  process: ProductionProcess,
  linkedOrder: LinkedProductionOrderSnapshot,
  product?: any,
): PlanRecordBlueprintRow[] => {
  const rows: PlanRecordBlueprintRow[] = [];
  const productLabel = product?.name || linkedOrder.productName || "";
  const productSpec = product?.specification || linkedOrder.productSpecification || "";
  const batchLabel = linkedOrder.batchNo || "本批次";
  const docLabel = [process.controlledDocNo, process.version].filter(Boolean).join(" / ");
  const rowDefaults = {
    clearance: `${process.workshop || "生产现场"} · ${batchLabel}`,
    mold: batchLabel,
    materialUsage: `${productLabel}${productSpec ? ` / ${productSpec}` : ""}`,
    tempHumidity: process.workshop || "生产现场",
    equipment: process.operator || "待分配",
    firstArticle: batchLabel,
  };

  if (process.modules.clearance) {
    rows.push(
      buildBlueprintRow("清场记录", "开工前清场确认", "现场无上批残留物，状态标识正确", "", rowDefaults.clearance, "填写清场检查结果和确认人"),
      buildBlueprintRow("清场记录", "文件与状态标识确认", docLabel || "按现行作业文件执行", "", docLabel, "确认现场文件版本、物料和容器标识"),
    );
  }
  if (process.modules.mold) {
    rows.push(
      buildBlueprintRow("模具确认", "模具编号/状态确认", "模具状态正常、编号与工单一致", "", rowDefaults.mold, "登记模具编号、状态和点检结果"),
    );
  }
  if (process.modules.materialUsage) {
    rows.push(
      buildBlueprintRow("材料使用", "投料/领料确认", "物料名称、批号、数量与生产指令一致", "", rowDefaults.materialUsage, "逐项填写实际使用物料批号和数量"),
    );
  }
  if (process.modules.tempHumidity) {
    rows.push(
      buildBlueprintRow("温湿度", "环境温度", "按工艺文件要求", "℃", rowDefaults.tempHumidity, "填写现场实测温度"),
      buildBlueprintRow("温湿度", "环境湿度", "按工艺文件要求", "%RH", rowDefaults.tempHumidity, "填写现场实测湿度"),
    );
  }
  if (process.modules.equipment) {
    rows.push(
      buildBlueprintRow("设备确认", "设备参数与点检", "设备状态正常、参数符合开机条件", "", rowDefaults.equipment, "记录设备编号、点检结果和关键参数"),
    );
  }
  if (process.modules.firstArticle) {
    rows.push(
      buildBlueprintRow("首件检验", "首件确认", "首件尺寸/外观/功能符合标准", "", rowDefaults.firstArticle, "填写首件检测结果及审核结论"),
    );
  }

  (process.inspectionItems || []).forEach((item) => {
    rows.push(
      buildBlueprintRow(
        "检验确认",
        item.itemName || "检验项目",
        item.requirement || "按工艺要求",
        item.unit || "",
        batchLabel,
        "填写实测值、判定结果及必要备注",
      ),
    );
  });

  if (process.modules.qcPoint || (process.qcPoints || []).length > 0) {
    (process.qcPoints || []).forEach((item) => {
      rows.push(
        buildBlueprintRow(
          "关键质控点",
          item.itemName || "质控点",
          item.requirement || "按工艺要求",
          item.unit || "",
          process.workshop || batchLabel,
          "填写关键参数实测值和复核结果",
        ),
      );
    });
    if (!(process.qcPoints || []).length) {
      rows.push(
        buildBlueprintRow("关键质控点", "关键参数确认", "按工艺文件关键质控点执行", "", process.workshop || batchLabel, "填写关键参数和复核信息"),
      );
    }
  }

  return rows;
};

const matchesProcessProduct = (process: ProductionProcess, product?: any, order?: any) => {
  if (processMatchesProduct(process, product?.name || order?.productName || "", [
    product?.code,
    product?.specification,
    order?.productName,
    `${product?.name || ""}${product?.specification || ""}`,
    `${product?.name || ""}${product?.code || ""}`,
  ])) {
    return true;
  }
  const rawRule = String(process.applicableProducts || "").trim();
  if (!rawRule) return true;
  const normalizedRule = normalizeApplicableProductKey(rawRule) || normalizeText(rawRule);
  if (!normalizedRule || ["all", "全部产品", "全部"].includes(normalizedRule)) return true;
  const rules = rawRule
    .split(/[,\n，；;、|/]+/)
    .map((item) => normalizeApplicableProductKey(item) || normalizeText(item))
    .filter(Boolean);
  const tokens = [
    product?.name,
    product?.code,
    product?.specification,
    order?.productName,
    `${product?.name || ""}${product?.specification || ""}`,
    `${product?.name || ""}${product?.code || ""}`,
  ]
    .flatMap((item) => {
      const raw = String(item || "");
      const values = new Set<string>();
      const aliasKey = normalizeApplicableProductKey(raw);
      const plainKey = normalizeText(raw);
      if (aliasKey) values.add(aliasKey);
      if (plainKey) values.add(plainKey);
      return Array.from(values);
    })
    .filter(Boolean);
  if (!rules.length) return true;
  return rules.some((rule) => tokens.some((token) => token.includes(rule) || rule.includes(token)));
};

const getSemiFinishedOrders = (plan: any) => parsePlanRemarkMeta(plan?.remark).semiFinishedOrders;

const getDerivedPlanStatus = (plan: any) => {
  const baseStatus = String(plan?.status || "pending");
  if (["completed", "cancelled", "purchase_submitted"].includes(baseStatus)) return baseStatus;
  if (plan?.productionOrderId) return baseStatus;
  const semiFinishedOrders = getSemiFinishedOrders(plan);
  if (!semiFinishedOrders.length) return baseStatus;
  const statuses = semiFinishedOrders.map((item) => String(item.status || "planned"));
  if (statuses.every((status) => status === "completed")) return "await_finished";
  if (statuses.every((status) => status === "planned" || status === "draft")) return "semi_pending";
  return "semi_in_progress";
};

const getVisiblePlanRemark = (plan: any) => {
  const remark = parsePlanRemarkMeta(plan?.remark).remark.trim();
  if (!remark) return "";
  if (String(plan?.planNo || "").startsWith("PP-") && remark.startsWith("默认供应商：")) {
    return "";
  }
  return remark;
};

const formatPlanQty = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? "-");
  return formatDisplayNumber(num);
};

const normalizePlanQtyInput = (value: unknown) => {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return String(roundToDigits(num, 2));
};

export default function ProductionPlanBoardPage() {
  const PAGE_SIZE = 10;
  const { canDelete } = usePermission();
  const [, setLocation] = useLocation();
  const { data: plans = [], isLoading, refetch } = trpc.productionPlans.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});
  const { data: salesOrders = [] } = trpc.salesOrders.list.useQuery({});

  const createMutation = trpc.productionPlans.create.useMutation({
    onSuccess: () => { refetch(); toast.success("生产计划已创建"); setDialogOpen(false); },
    onError: (e: any) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.productionPlans.update.useMutation({
    onSuccess: () => { refetch(); toast.success("计划已更新"); setDialogOpen(false); },
    onError: (e: any) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.productionPlans.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("计划已删除"); },
    onError: (e: any) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [viewingPlan, setViewingPlan] = useState<any>(null);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [processTemplates, setProcessTemplates] = useState<ProductionProcess[]>([]);
  const [savedOrderSnapshot, setSavedOrderSnapshot] = useState<LinkedProductionOrderSnapshot | null>(null);
  const [savedProcessSnapshot, setSavedProcessSnapshot] = useState<PlanSelectedProcess | null>(null);
  const [savedBlueprintRows, setSavedBlueprintRows] = useState<PlanRecordBlueprintRow[]>([]);

  const [formData, setFormData] = useState<ProductionPlanFormState>({
    planNo: "",
    planType: "sales_driven" as "sales_driven" | "internal",
    salesOrderId: "",
    salesOrderNo: "",
    productionOrderId: "",
    productionOrderNo: "",
    productId: "",
    productName: "",
    plannedQty: "",
    unit: "件",
    batchNo: "",
    plannedStartDate: "",
    plannedEndDate: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    processId: "",
    processName: "",
    remark: "",
  });

  const productionOrderOptions = useMemo(
    () =>
      (productionOrders as any[])
        .filter((order: any) => {
          if (order.status === "cancelled" || order.status === "completed") return false;
          if (!editingPlan && order.planId) return false;
          if (editingPlan && order.planId && Number(order.planId) !== Number(editingPlan.id) && Number(order.id) !== Number(formData.productionOrderId || 0)) {
            return false;
          }
          return true;
        })
        .map((order: any) => {
          const product = (products as any[]).find((item: any) => Number(item.id) === Number(order.productId));
          const salesOrder = (salesOrders as any[]).find((item: any) => Number(item.id) === Number(order.salesOrderId));
          return {
            ...order,
            productName: product?.name || order.productName || "",
            productCode: product?.code || "",
            productSpec: product?.specification || "",
            salesOrderNo: salesOrder?.orderNo || "",
          };
        }),
    [editingPlan, formData.productionOrderId, productionOrders, products, salesOrders],
  );

  const selectedOrder = useMemo(
    () =>
      productionOrderOptions.find((order: any) => Number(order.id) === Number(formData.productionOrderId || 0)) || null,
    [formData.productionOrderId, productionOrderOptions],
  );

  const selectedProduct = useMemo(() => {
    const selectedProductId = selectedOrder?.productId || parseNumber(formData.productId);
    return (products as any[]).find((product: any) => Number(product.id) === Number(selectedProductId || 0)) || null;
  }, [formData.productId, products, selectedOrder]);

  const matchedProcesses = useMemo(
    () =>
      processTemplates
        .filter((process) => process.status === "active")
        .filter((process) => matchesProcessProduct(process, selectedProduct, selectedOrder))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [processTemplates, selectedOrder, selectedProduct],
  );

  const selectedProcess = useMemo(() => {
    if (!formData.processId) return null;
    return (
      matchedProcesses.find((process) => String(process.id) === formData.processId) ||
      processTemplates.find((process) => String(process.id) === formData.processId) ||
      null
    );
  }, [formData.processId, matchedProcesses, processTemplates]);

  const effectiveOrderSnapshot = useMemo(() => {
    if (!selectedOrder) return savedOrderSnapshot;
    const salesOrder = (salesOrders as any[]).find((item: any) => Number(item.id) === Number(selectedOrder.salesOrderId || 0));
    return buildLinkedProductionOrderSnapshot(selectedOrder, selectedProduct, salesOrder);
  }, [salesOrders, savedOrderSnapshot, selectedOrder, selectedProduct]);

  const effectiveProcessSnapshot = useMemo(
    () => (selectedProcess ? buildSelectedProcessSnapshot(selectedProcess) : savedProcessSnapshot),
    [savedProcessSnapshot, selectedProcess],
  );

  const effectiveBlueprintRows = useMemo(() => {
    if (selectedProcess && effectiveOrderSnapshot) {
      return buildProcessRecordBlueprint(selectedProcess, effectiveOrderSnapshot, selectedProduct);
    }
    return savedBlueprintRows;
  }, [effectiveOrderSnapshot, savedBlueprintRows, selectedProcess, selectedProduct]);

  const filteredPlans = (plans as any[]).filter((p) => {
    // 生产计划页只显示正式生产计划（PP-），不显示采购计划（CP-）
    if (!String(p.planNo || "").startsWith("PP-")) return false;
    // 只显示生产来源的产品（排除采购来源）
    if (p.productSourceType === "purchase") return false;
    const matchSearch = !searchTerm ||
      String(p.planNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.salesOrderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || getDerivedPlanStatus(p) === statusFilter;
    const matchType = typeFilter === "all" || p.planType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / PAGE_SIZE));
  const pagedPlans = filteredPlans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!dialogOpen) return;
    setProcessTemplates(loadProductionProcessTemplates());
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen || !formData.productionOrderId) return;
    if (!formData.processId && matchedProcesses.length === 1) {
      const onlyProcess = matchedProcesses[0];
      setFormData((prev) => ({ ...prev, processId: String(onlyProcess.id), processName: onlyProcess.processName }));
      return;
    }
    if (formData.processId && matchedProcesses.length > 0 && !matchedProcesses.some((process) => String(process.id) === formData.processId)) {
      setFormData((prev) => ({ ...prev, processId: "", processName: "" }));
    }
  }, [dialogOpen, formData.processId, formData.productionOrderId, matchedProcesses]);

  const handleAdd = () => {
    setEditingPlan(null);
    setSavedOrderSnapshot(null);
    setSavedProcessSnapshot(null);
    setSavedBlueprintRows([]);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      planNo: "",
      planType: "internal",
      salesOrderId: "",
      salesOrderNo: "",
      productionOrderId: "",
      productionOrderNo: "",
      productId: "",
      productName: "",
      plannedQty: "",
      unit: "件",
      batchNo: "",
      plannedStartDate: today,
      plannedEndDate: "",
      priority: "normal",
      processId: "",
      processName: "",
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (plan: any) => {
    const meta = parsePlanRemarkMeta(plan.remark);
    setEditingPlan(plan);
    setSavedOrderSnapshot(meta.linkedProductionOrder || null);
    setSavedProcessSnapshot(meta.selectedProcess || null);
    setSavedBlueprintRows(meta.recordBlueprint || []);
    setFormData({
      planNo: plan.planNo,
      planType: plan.planType,
      salesOrderId: meta.linkedProductionOrder?.salesOrderId
        ? String(meta.linkedProductionOrder.salesOrderId)
        : plan.salesOrderId
          ? String(plan.salesOrderId)
          : "",
      salesOrderNo: meta.linkedProductionOrder?.salesOrderNo || plan.salesOrderNo || "",
      productionOrderId: plan.productionOrderId
        ? String(plan.productionOrderId)
        : meta.linkedProductionOrder?.orderId
          ? String(meta.linkedProductionOrder.orderId)
          : "",
      productionOrderNo: meta.linkedProductionOrder?.orderNo || "",
      productId: meta.linkedProductionOrder?.productId
        ? String(meta.linkedProductionOrder.productId)
        : plan.productId
          ? String(plan.productId)
          : "",
      productName: meta.linkedProductionOrder?.productName || plan.productName || "",
      plannedQty: normalizePlanQtyInput(meta.linkedProductionOrder?.plannedQty || plan.plannedQty),
      unit: meta.linkedProductionOrder?.unit || plan.unit || "件",
      batchNo: meta.linkedProductionOrder?.batchNo || plan.batchNo || "",
      plannedStartDate: formatDateInputValue(plan.plannedStartDate),
      plannedEndDate: formatDateInputValue(plan.plannedEndDate),
      priority: plan.priority || "normal",
      processId: meta.selectedProcess?.processId ? String(meta.selectedProcess.processId) : "",
      processName: meta.selectedProcess?.processName || "",
      remark: meta.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (plan: any) => {
    setViewingPlan(plan);
    setViewDialogOpen(true);
  };

  const handleDelete = (plan: any) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: plan.id });
  };

  const handleStart = (plan: any) => {
    updateMutation.mutate({ id: plan.id, data: { status: "in_progress" } });
    toast.success("已开始生产");
  };

  const handleCreateProductionOrder = (plan: any) => {
    const params = new URLSearchParams({ createFromPlanId: String(plan.id) });
    setLocation(`/production/orders?${params.toString()}`);
  };

  const handleProductionOrderSelect = (order: any) => {
    const product = (products as any[]).find((item: any) => Number(item.id) === Number(order.productId));
    const salesOrder = (salesOrders as any[]).find((item: any) => Number(item.id) === Number(order.salesOrderId));
    setSavedOrderSnapshot(null);
    setSavedProcessSnapshot(null);
    setSavedBlueprintRows([]);
    setFormData((prev) => ({
      ...prev,
      planType: order.salesOrderId ? "sales_driven" : "internal",
      salesOrderId: order.salesOrderId ? String(order.salesOrderId) : "",
      salesOrderNo: salesOrder?.orderNo || "",
      productionOrderId: String(order.id),
      productionOrderNo: order.orderNo || "",
      productId: String(order.productId || ""),
      productName: product?.name || order.productName || "",
      plannedQty: normalizePlanQtyInput(order.plannedQty),
      unit: order.unit || product?.unit || prev.unit,
      batchNo: order.batchNo || "",
      plannedStartDate: formatDateInputValue(order.plannedStartDate) || prev.plannedStartDate,
      plannedEndDate: formatDateInputValue(order.plannedEndDate) || prev.plannedEndDate,
      processId: "",
      processName: "",
    }));
    setOrderPickerOpen(false);
  };

  const handleProcessChange = (processId: string) => {
    const process = matchedProcesses.find((item) => String(item.id) === processId) || null;
    setSavedProcessSnapshot(null);
    setSavedBlueprintRows([]);
    setFormData((prev) => ({
      ...prev,
      processId,
      processName: process?.processName || "",
    }));
  };

  const handleSubmit = () => {
    if (!effectiveOrderSnapshot?.orderId) {
      toast.error("请先关联生产指令", { description: "新建生产计划需要先选择生产指令" });
      return;
    }
    if (!effectiveProcessSnapshot?.processId) {
      toast.error("请先选择匹配工序", { description: "系统需要根据工序模板生成记录明细表" });
      return;
    }
    if (!formData.productId || !formData.plannedQty) {
      toast.error("生产指令数据不完整", { description: "缺少产品或计划数量，请重新选择生产指令" });
      return;
    }
    const nextRemark = buildPlanRemarkMeta({
      remark: formData.remark,
      semiFinishedOrders: editingPlan ? getSemiFinishedOrders(editingPlan) : [],
      linkedProductionOrder: effectiveOrderSnapshot,
      selectedProcess: effectiveProcessSnapshot,
      recordBlueprint: effectiveBlueprintRows,
    });
    const payload = {
      planNo: formData.planNo || undefined,
      planType: effectiveOrderSnapshot.salesOrderId ? "sales_driven" : formData.planType,
      salesOrderId: effectiveOrderSnapshot.salesOrderId ?? (formData.salesOrderId ? Number(formData.salesOrderId) : undefined),
      salesOrderNo: effectiveOrderSnapshot.salesOrderNo || formData.salesOrderNo || undefined,
      productionOrderId: effectiveOrderSnapshot.orderId,
      productId: effectiveOrderSnapshot.productId || Number(formData.productId),
      productName: effectiveOrderSnapshot.productName || formData.productName || undefined,
      plannedQty: formData.plannedQty || effectiveOrderSnapshot.plannedQty,
      unit: formData.unit || effectiveOrderSnapshot.unit || undefined,
      batchNo: formData.batchNo || effectiveOrderSnapshot.batchNo || undefined,
      plannedStartDate: formData.plannedStartDate || effectiveOrderSnapshot.plannedStartDate || undefined,
      plannedEndDate: formData.plannedEndDate || effectiveOrderSnapshot.plannedEndDate || undefined,
      priority: formData.priority,
      remark: nextRemark || undefined,
    };
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: payload });
    } else {
      createMutation.mutate({ ...payload, status: "pending" });
    }
  };

  const pendingCount = filteredPlans.filter((p) => ["pending", "semi_pending", "await_finished"].includes(getDerivedPlanStatus(p))).length;
  const inProgressCount = filteredPlans.filter((p) => ["in_progress", "semi_in_progress"].includes(getDerivedPlanStatus(p))).length;
  const completedCount = filteredPlans.filter((p) => getDerivedPlanStatus(p) === "completed").length;
  const urgentCount = filteredPlans.filter((p) => { const dp = calcDynamicPriority(p); return (dp === "urgent" || dp === "critical") && p.status !== "completed"; }).length;
  const viewingPlanMeta = useMemo(() => parsePlanRemarkMeta(viewingPlan?.remark), [viewingPlan]);

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
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">生产计划看板</h2>
              <p className="text-sm text-muted-foreground">销售订单驱动排产，按交期优先级管理生产计划</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建计划
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待排产</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">生产中</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">紧急任务</p>
              <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索计划编号、产品名称、销售订单..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="计划类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="sales_driven">销售计划</SelectItem>
                  <SelectItem value="internal">内部计划</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[120px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待排产</SelectItem>
                  <SelectItem value="semi_pending">待半成品生产</SelectItem>
                  <SelectItem value="purchase_submitted">采购中</SelectItem>
                  <SelectItem value="scheduled">已排产</SelectItem>
                  <SelectItem value="in_progress">生产中</SelectItem>
                  <SelectItem value="semi_in_progress">半成品生产中</SelectItem>
                  <SelectItem value="await_finished">待成品生产</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">计划编号</TableHead>
                  <TableHead className="text-center font-bold">类型</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">规格型号</TableHead>
                  <TableHead className="text-center font-bold">关联销售单</TableHead>
                  <TableHead className="text-center font-bold">计划数量</TableHead>
                  <TableHead className="text-center font-bold">优先级</TableHead>
                  <TableHead className="text-center font-bold">交期</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无生产计划</TableCell></TableRow>
                ) : pagedPlans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-center font-medium">{plan.planNo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{planTypeMap[plan.planType] || plan.planType}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{plan.productName || `产品#${plan.productId}`}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs">{(plan as any).productSpecification || "-"}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{plan.salesOrderNo || "-"}</TableCell>
                    <TableCell className="text-center">{formatPlanQty(plan.plannedQty)} {plan.unit}</TableCell>
                    <TableCell className="text-center">
                      {(() => { const dp = calcDynamicPriority(plan); return <span className={priorityMap[dp]?.color || ""}>{priorityMap[dp]?.label || dp}</span>; })()}
                    </TableCell>
                    <TableCell className="text-center">{plan.plannedEndDate ? (() => { const d = new Date(plan.plannedEndDate); d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); return d.toISOString().split("T")[0]; })() : "-"}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const derivedStatus = getDerivedPlanStatus(plan);
                        return (
                          <Badge variant={statusMap[derivedStatus]?.variant || "outline"} className={getStatusSemanticClass(derivedStatus, statusMap[derivedStatus]?.label)}>
                            {statusMap[derivedStatus]?.label || derivedStatus}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const derivedStatus = getDerivedPlanStatus(plan);
                        const hasSemiFinishedOrders = getSemiFinishedOrders(plan).length > 0;
                        const canCreateFinishedOrder = !hasSemiFinishedOrders || derivedStatus === "await_finished";
                        return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!plan.productionOrderId && plan.status !== "completed" && plan.status !== "cancelled" && canCreateFinishedOrder && (
                            <DropdownMenuItem onClick={() => handleCreateProductionOrder(plan)}>
                              <Plus className="h-4 w-4 mr-2" />创建生产指令
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleView(plan)}>
                            <Eye className="h-4 w-4 mr-2" />查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Edit className="h-4 w-4 mr-2" />编辑
                          </DropdownMenuItem>
                          {plan.status === "scheduled" && (
                            <DropdownMenuItem onClick={() => handleStart(plan)}>
                              <Play className="h-4 w-4 mr-2" />开始生产
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePaginationFooter
              total={filteredPlans.length}
              page={currentPage}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "编辑生产计划" : "新建生产计划"}</DialogTitle>
              <DialogDescription>
                {editingPlan
                  ? "先确认关联生产指令，再核对本工序模板和自动生成的记录明细。"
                  : "按生产指令创建工序执行计划，系统会自动带入产品信息并生成记录明细表。"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="grid gap-5 xl:grid-cols-[1.3fr_0.95fr]">
                <Card className="border-primary/10">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">第 1 步：选择生产指令</CardTitle>
                        <p className="text-sm text-muted-foreground">生产指令选定后，自动带入产品、批号、数量和来源订单信息。</p>
                      </div>
                      <Badge variant="outline">{effectiveOrderSnapshot?.orderId ? "已关联" : "待选择"}</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-14 w-full justify-start px-4 py-3 text-left"
                      onClick={() => setOrderPickerOpen(true)}
                    >
                      {effectiveOrderSnapshot?.orderId ? (
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div className="space-y-0.5">
                            <div className="font-medium">{effectiveOrderSnapshot.orderNo}</div>
                            <div className="text-sm text-muted-foreground">
                              {effectiveOrderSnapshot.productName || "-"}
                              {effectiveOrderSnapshot.productSpecification ? ` · ${effectiveOrderSnapshot.productSpecification}` : ""}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">点击选择生产指令...</span>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {effectiveOrderSnapshot?.orderId ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-lg border bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground">产品信息</p>
                          <p className="mt-1 font-medium">{effectiveOrderSnapshot.productName || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {effectiveOrderSnapshot.productCode || "-"}
                            {effectiveOrderSnapshot.productSpecification ? ` / ${effectiveOrderSnapshot.productSpecification}` : ""}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground">批号与数量</p>
                          <p className="mt-1 font-medium">{effectiveOrderSnapshot.batchNo || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPlanQty(effectiveOrderSnapshot.plannedQty)} {effectiveOrderSnapshot.unit || ""}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground">来源类型</p>
                          <p className="mt-1 font-medium">{effectiveOrderSnapshot.salesOrderId ? "销售驱动" : "内部任务"}</p>
                          <p className="text-xs text-muted-foreground">{effectiveOrderSnapshot.salesOrderNo || "未关联销售单"}</p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground">计划区间</p>
                          <p className="mt-1 font-medium">{formatDateInputValue(effectiveOrderSnapshot.plannedStartDate) || "-"}</p>
                          <p className="text-xs text-muted-foreground">至 {formatDateInputValue(effectiveOrderSnapshot.plannedEndDate) || "-"}</p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground">当前状态</p>
                          <p className="mt-1 font-medium">{PRODUCTION_ORDER_STATUS_LABELS[effectiveOrderSnapshot.status] || effectiveOrderSnapshot.status || "-"}</p>
                          <p className="text-xs text-muted-foreground">生产指令号：{effectiveOrderSnapshot.orderNo}</p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-4 py-3">
                          <p className="text-xs text-muted-foreground">计划建议</p>
                          <p className="mt-1 font-medium">{effectiveOrderSnapshot.productSpecification || "按当前产品工艺执行"}</p>
                          <p className="text-xs text-muted-foreground">本次计划会基于该生产指令生成工序记录明细</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                        请选择生产指令后继续。系统会自动带入产品、批号、计划数量和来源订单信息。
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-primary/10">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">第 2 步：选择生产工序</CardTitle>
                        <p className="text-sm text-muted-foreground">只显示匹配当前产品的工序模板，并自动带出清场、设备、质控等记录要求。</p>
                      </div>
                      <Badge variant="outline">{effectiveProcessSnapshot?.processId ? "已匹配" : "待选择"}</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>工序模板 *</Label>
                      <Select
                        value={matchedProcesses.some((process) => String(process.id) === formData.processId) ? formData.processId : ""}
                        onValueChange={handleProcessChange}
                        disabled={!effectiveOrderSnapshot?.orderId || matchedProcesses.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!effectiveOrderSnapshot?.orderId ? "请先选择生产指令" : "选择匹配工序"} />
                        </SelectTrigger>
                        <SelectContent>
                          {matchedProcesses.map((process) => (
                            <SelectItem key={process.id} value={String(process.id)}>
                              {process.sortOrder}. {process.processName} / {process.workshop}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!effectiveOrderSnapshot?.orderId ? (
                      <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                        先选生产指令，系统才能按产品名称和规格匹配工序。
                      </div>
                    ) : matchedProcesses.length === 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-700">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            未找到与当前产品匹配的工序模板。请先在生产工序管理里维护适用产品，再回来创建计划。
                          </div>
                        </div>
                      </div>
                    ) : effectiveProcessSnapshot?.processId ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border bg-muted/30 px-4 py-3">
                          <p className="font-medium">{effectiveProcessSnapshot.processName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {effectiveProcessSnapshot.processCode || "-"} / {effectiveProcessSnapshot.workshop || "-"} / {effectiveProcessSnapshot.team || "未指定班组"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            版本：{effectiveProcessSnapshot.version || "-"} · 受控文件：{effectiveProcessSnapshot.controlledDocNo || "-"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {effectiveProcessSnapshot.modules.length > 0 ? (
                            effectiveProcessSnapshot.modules.map((module) => (
                              <Badge key={module} variant="secondary">{module}</Badge>
                            ))
                          ) : (
                            <Badge variant="outline">未配置记录模块</Badge>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border bg-muted/30 px-4 py-3">
                            <p className="text-xs text-muted-foreground">执行岗位</p>
                            <p className="mt-1 font-medium">{effectiveProcessSnapshot.operator || "待分配"}</p>
                            <p className="text-xs text-muted-foreground">标准工时：{effectiveProcessSnapshot.standardTime || 0}</p>
                          </div>
                          <div className="rounded-lg border bg-muted/30 px-4 py-3">
                            <p className="text-xs text-muted-foreground">适用产品</p>
                            <p className="mt-1 font-medium">{effectiveProcessSnapshot.applicableProducts || "-"}</p>
                            <p className="text-xs text-muted-foreground">{effectiveProcessSnapshot.description || "按当前工序模板执行"}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                        当前产品已匹配到 {matchedProcesses.length} 道工序，请选择本次计划对应的工序。
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">第 3 步：自动生成记录明细表</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    员工后续填写时以明细表为主，这里先展示系统将为当前工序建立的记录项目。
                  </p>
                </CardHeader>
                <CardContent>
                  {effectiveBlueprintRows.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">记录类别</TableHead>
                            <TableHead className="font-semibold">项目名称</TableHead>
                            <TableHead className="font-semibold">标准/要求</TableHead>
                            <TableHead className="font-semibold">单位</TableHead>
                            <TableHead className="font-semibold">默认带入</TableHead>
                            <TableHead className="font-semibold">填写说明</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {effectiveBlueprintRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="align-top text-sm">{row.category}</TableCell>
                              <TableCell className="align-top text-sm font-medium">{row.itemName}</TableCell>
                              <TableCell className="align-top text-sm text-muted-foreground">{row.requirement || "-"}</TableCell>
                              <TableCell className="align-top text-sm">{row.unit || "-"}</TableCell>
                              <TableCell className="align-top text-sm">{row.defaultValue || "-"}</TableCell>
                              <TableCell className="align-top text-sm text-muted-foreground">{row.guide || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      选择匹配工序后，系统会自动生成清场记录、设备确认、首件检验、质控点等明细表内容。
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="text-base">计划排期与备注</CardTitle>
                  <p className="text-sm text-muted-foreground">这里保留计划编号、日期和优先级，产品基础信息以生产指令带入为准。</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>计划编号 *</Label>
                      <Input
                        value={formData.planNo}
                        onChange={(e) => setFormData({ ...formData, planNo: e.target.value })}
                        placeholder="保存后系统生成"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>计划类型</Label>
                      <Input value={planTypeMap[effectiveOrderSnapshot?.salesOrderId ? "sales_driven" : formData.planType] || "-"} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>计划数量</Label>
                      <Input value={formData.plannedQty} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>单位</Label>
                      <Input value={formData.unit} readOnly />
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>生产批号</Label>
                      <Input value={formData.batchNo} readOnly />
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
                    </div>
                    <div className="space-y-2">
                      <Label>优先级</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value as ProductionPlanFormState["priority"] })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低</SelectItem>
                          <SelectItem value="normal">普通</SelectItem>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="urgent">紧急</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>备注</Label>
                    <Textarea
                      value={formData.remark}
                      onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                      placeholder="补充本次工序计划的特殊说明、交接要求或提醒事项"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingPlan ? "保存修改" : "创建计划"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={orderPickerOpen}
          onOpenChange={setOrderPickerOpen}
          title="选择生产指令"
          searchPlaceholder="搜索生产指令号、产品名称、批号..."
          columns={[
            { key: "orderNo", title: "生产指令号", render: (order) => <span className="font-mono font-medium">{order.orderNo}</span> },
            { key: "productName", title: "产品名称", render: (order) => <span className="font-medium">{order.productName || "-"}</span> },
            { key: "productSpec", title: "规格型号", render: (order) => <span className="text-muted-foreground">{order.productSpec || "-"}</span> },
            { key: "batchNo", title: "生产批号", render: (order) => <span className="font-mono">{order.batchNo || "-"}</span> },
            { key: "plannedQty", title: "计划数量", render: (order) => <span>{formatPlanQty(order.plannedQty)} {order.unit || ""}</span> },
            { key: "salesOrderNo", title: "关联销售单", render: (order) => <span>{order.salesOrderNo || "-"}</span> },
            { key: "status", title: "状态", render: (order) => <span>{PRODUCTION_ORDER_STATUS_LABELS[order.status] || order.status || "-"}</span> },
          ]}
          rows={productionOrderOptions}
          selectedId={formData.productionOrderId}
          filterFn={(order, query) => {
            const lower = query.toLowerCase();
            return (
              String(order.orderNo || "").toLowerCase().includes(lower) ||
              String(order.productName || "").toLowerCase().includes(lower) ||
              String(order.productSpec || "").toLowerCase().includes(lower) ||
              String(order.batchNo || "").toLowerCase().includes(lower)
            );
          }}
          onSelect={handleProductionOrderSelect}
        />

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    {viewingPlan && (
              <div className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">生产计划详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingPlan.planNo}
            {viewingPlan.status && (
              (() => {
                const derivedStatus = getDerivedPlanStatus(viewingPlan);
                return <> · <Badge variant={statusMap[derivedStatus]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(derivedStatus, statusMap[derivedStatus]?.label)}`}>
                  {statusMap[derivedStatus]?.label || String(derivedStatus ?? "-")}
                </Badge></>;
              })()
            )}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">产品信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="产品名称">{viewingPlan.productName || `-`}</FieldRow>
                <FieldRow label="产品编码">{(viewingPlan as any).productCode || "-"}</FieldRow>
                <FieldRow label="规格型号">{(viewingPlan as any).productSpecification || "-"}</FieldRow>
                <FieldRow label="计量单位">{(viewingPlan as any).productUnit || viewingPlan.unit || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="生产厂家">{(viewingPlan as any).productManufacturer || "-"}</FieldRow>
                <FieldRow label="注册证号">{(viewingPlan as any).productRegistrationNo || "-"}</FieldRow>
                <FieldRow label="产品分类">{PRODUCT_CATEGORY_LABELS[(viewingPlan as any).productCategory as keyof typeof PRODUCT_CATEGORY_LABELS] || "-"}</FieldRow>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">生产信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="计划数量">{formatPlanQty(viewingPlan.plannedQty)} {viewingPlan.unit}</FieldRow>
                <FieldRow label="计划开始">{formatDateValue(viewingPlan.plannedStartDate)}</FieldRow>
                <FieldRow label="计划交期">{formatDateValue(viewingPlan.plannedEndDate)}</FieldRow>
              </div>
              <div>
                <FieldRow label="计划类型">{planTypeMap[viewingPlan.planType] || '-'}</FieldRow>
                <FieldRow label="生产批号">{viewingPlan.batchNo || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">关联信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="关联生产指令">
                  {viewingPlanMeta.linkedProductionOrder?.orderNo || (viewingPlan.productionOrderId ? `#${viewingPlan.productionOrderId}` : "-")}
                </FieldRow>
                <FieldRow label="关联销售单">{viewingPlan.salesOrderNo || "-"}</FieldRow>
                <FieldRow label="关联半成品批号">
                  {getSemiFinishedOrders(viewingPlan).length > 0 ? (
                    <div className="flex justify-end flex-wrap gap-1">
                      {getSemiFinishedOrders(viewingPlan).map((item) => (
                        <Badge key={item.orderId} variant="outline">
                          {item.batchNo || item.orderNo || `#${item.orderId}`}
                        </Badge>
                      ))}
                    </div>
                  ) : "-"}
                </FieldRow>
              </div>
              <div>
                <FieldRow label="工序模板">{viewingPlanMeta.selectedProcess?.processName || "-"}</FieldRow>
                <FieldRow label="优先级">
                  {(() => { const dp = calcDynamicPriority(viewingPlan); return <span className={priorityMap[dp]?.color}>{priorityMap[dp]?.label || dp}</span>; })()}
                </FieldRow>
              </div>
            </div>
          </div>

          {viewingPlanMeta.selectedProcess && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">工序模板</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="工序名称">{viewingPlanMeta.selectedProcess.processName || "-"}</FieldRow>
                  <FieldRow label="工序编码">{viewingPlanMeta.selectedProcess.processCode || "-"}</FieldRow>
                  <FieldRow label="所属车间">{viewingPlanMeta.selectedProcess.workshop || "-"}</FieldRow>
                  <FieldRow label="生产班组">{viewingPlanMeta.selectedProcess.team || "-"}</FieldRow>
                </div>
                <div>
                  <FieldRow label="操作岗位">{viewingPlanMeta.selectedProcess.operator || "-"}</FieldRow>
                  <FieldRow label="版本">{viewingPlanMeta.selectedProcess.version || "-"}</FieldRow>
                  <FieldRow label="受控文件">{viewingPlanMeta.selectedProcess.controlledDocNo || "-"}</FieldRow>
                  <FieldRow label="记录模块">
                    {viewingPlanMeta.selectedProcess.modules.length > 0 ? (
                      <div className="flex justify-end flex-wrap gap-1">
                        {viewingPlanMeta.selectedProcess.modules.map((module) => (
                          <Badge key={module} variant="secondary">{module}</Badge>
                        ))}
                      </div>
                    ) : "-"}
                  </FieldRow>
                </div>
              </div>
            </div>
          )}

          {viewingPlanMeta.recordBlueprint && viewingPlanMeta.recordBlueprint.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">记录明细蓝图</h3>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-bold">记录类别</TableHead>
                      <TableHead className="font-bold">项目名称</TableHead>
                      <TableHead className="font-bold">标准/要求</TableHead>
                      <TableHead className="font-bold">单位</TableHead>
                      <TableHead className="font-bold">默认带入</TableHead>
                      <TableHead className="font-bold">填写说明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingPlanMeta.recordBlueprint.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="align-top">{item.category || "-"}</TableCell>
                        <TableCell className="align-top font-medium">{item.itemName || "-"}</TableCell>
                        <TableCell className="align-top text-muted-foreground">{item.requirement || "-"}</TableCell>
                        <TableCell className="align-top">{item.unit || "-"}</TableCell>
                        <TableCell className="align-top">{item.defaultValue || "-"}</TableCell>
                        <TableCell className="align-top text-muted-foreground">{item.guide || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {getSemiFinishedOrders(viewingPlan).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">半成品子任务</h3>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-center font-bold">指令号</TableHead>
                      <TableHead className="text-center font-bold">半成品批号</TableHead>
                      <TableHead className="text-center font-bold">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSemiFinishedOrders(viewingPlan).map((item) => {
                      const childStatus = String(item.status || "planned");
                      return (
                        <TableRow key={item.orderId}>
                          <TableCell className="text-center">{item.orderNo || `#${item.orderId}`}</TableCell>
                          <TableCell className="text-center">{item.batchNo || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={childStatus === "completed" ? "secondary" : childStatus === "in_progress" ? "default" : "outline"}>
                              {childStatus === "completed" ? "已完成" : childStatus === "in_progress" ? "生产中" : "待生产"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {getVisiblePlanRemark(viewingPlan) && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{getVisiblePlanRemark(viewingPlan)}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(viewingPlan); }}>编辑</Button>
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
