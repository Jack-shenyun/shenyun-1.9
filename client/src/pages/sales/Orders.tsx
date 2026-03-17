import { formatDate, formatDateTime, formatDisplayNumber } from "@/lib/formatters";
import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import ERPLayout from "@/components/ERPLayout";
import ProductMultiSelect, { SelectedProduct } from "@/components/ProductMultiSelect";
import CustomerSelect, { Customer } from "@/components/CustomerSelect";
import {
  Receipt, Plus, Search, Edit, Trash2, Eye, MoreHorizontal,
  Package, Printer, FileText, Truck, CheckCircle, XCircle,
  ClipboardList, Send, Archive, GitBranch, Download, Upload,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
import { SalesOrderPrint, DeliveryNotePrint, ReceiptPrint } from "@/components/print";
import {
  PAYMENT_CONDITION_OPTIONS,
  normalizePaymentCondition,
} from "@shared/paymentTerms";
import { getStatusSemanticClass } from "@/lib/statusStyle";

// ==================== 类型定义 ====================

type DbOrder = {
  id: number;
  orderNo: string;
  customerId: number | null;
  customerName: string | null;
  customerCode: string | null;
  customerType?: string | null;
  country?: string | null;
  contactPerson: string | null;
  phone: string | null;
  orderDate: Date | string | null;
  deliveryDate: Date | string | null;
  totalAmount: string | null;
  currency: string | null;
  paymentMethod: string | null;
  status: string | null;
  paymentStatus: string | null;
  shippingAddress: string | null;
  shippingContact: string | null;
  shippingPhone: string | null;
  isExport: boolean | null;
  needsShipping: boolean | null;
  shippingFee: string | null;
  tradeTerm?: string | null;
  receiptAccountId?: number | null;
  receiptAccountName?: string | null;
  customsStatus: string | null;
  remark: string | null;
  salesPersonId: number | null;
  salesPersonName?: string | null;
  salesPersonEnglishName?: string | null;
  createdBy: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

interface SalesOrder extends DbOrder {
  products: SelectedProduct[];
}

// ==================== 常量 ====================

const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive" }> = {
  draft:          { label: "草稿",   variant: "outline"     },
  confirmed:      { label: "已确认", variant: "secondary"   },
  processing:     { label: "处理中", variant: "default"     },
  pending_review: { label: "待审批", variant: "secondary"   },
  approved:       { label: "已审批", variant: "default"     },
  pending_payment:{ label: "待收款", variant: "secondary"   },
  in_production:  { label: "生产中", variant: "default"     },
  ready_to_ship:    { label: "待发货",   variant: "secondary"   },
  partial_shipped:  { label: "部分发货", variant: "secondary"   },
  shipped:          { label: "已发货",   variant: "secondary"   },
  completed:        { label: "已完成",   variant: "secondary"   },
  cancelled:      { label: "已取消", variant: "destructive" },
};
const PREPAY_RATIO_MARKER = "[PREPAY_RATIO]";
const TRADE_TERM_OPTIONS = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"] as const;
const ORDER_STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "pending_review", label: "待审批" },
  { value: "approved", label: "已审批" },
  { value: "pending_payment", label: "待收款" },
  { value: "confirmed", label: "已确认" },
  { value: "processing", label: "处理中" },
  { value: "in_production", label: "生产中" },
  { value: "ready_to_ship", label: "待发货" },
  { value: "partial_shipped", label: "部分发货" },
  { value: "shipped", label: "已发货" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
] as const;

// ==================== 工具函数 ====================


function toInputDate(d: Date | string | null | undefined): string {
  const s = formatDate(d);
  return s === "-" ? "" : s;
}

function getCurrencySymbol(currency: string | null | undefined): string {
  switch (currency) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    case "JPY": return "¥";
    case "HKD": return "HK$";
    case "CNY": default: return "¥";
  }
}

function formatAmount(amount: string | number | null | undefined, currency?: string | null): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount ?? "0");
  const sym = getCurrencySymbol(currency);
  return `${sym}${formatDisplayNumber(n)}`;
}

function mapOrderItemsToSelectedProducts(items: any[]): SelectedProduct[] {
  return items.map((item: any) => ({
    id: item.productId ?? 0,
    code: item.productCode ?? "",
    name: item.productName ?? "",
    spec: item.specification ?? "",
    unit: item.unit ?? "",
    price: parseFloat(item.unitPrice ?? "0"),
    stock: 0,
    quantity: parseFloat(item.quantity ?? "1"),
    discount: 0,
    amount: parseFloat(item.amount ?? "0"),
  }));
}

function parsePrepayRatioFromRemark(remark: unknown): string {
  const text = String(remark ?? "");
  const lines = text.split("\n");
  const markerLine = lines.find((line) => line.startsWith(PREPAY_RATIO_MARKER));
  if (!markerLine) return "30";
  const ratio = markerLine.slice(PREPAY_RATIO_MARKER.length).trim();
  return ratio || "30";
}

function stripPrepayRatioFromRemark(remark: unknown): string {
  return String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(PREPAY_RATIO_MARKER))
    .join("\n")
    .trim();
}

function buildRemarkWithPrepayRatio(plainRemark: string, paymentTerms: string, prepaymentRatio: string): string {
  const cleanedRemark = stripPrepayRatioFromRemark(plainRemark);
  if (paymentTerms !== "预付款") return cleanedRemark;
  const ratio = String(prepaymentRatio || "30").trim();
  const marker = `${PREPAY_RATIO_MARKER}${ratio}`;
  return cleanedRemark ? `${marker}\n${cleanedRemark}` : marker;
}

function normalizeOrderStatus(status: unknown): string {
  const normalized = String(status ?? "").trim();
  const validStatuses = new Set<string>(ORDER_STATUS_OPTIONS.map((item) => item.value));
  return validStatuses.has(normalized) ? normalized : "draft";
}

function normalizeBooleanField(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseImportBoolean(value: unknown, fallback = false): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["是", "需要", "true", "1", "yes", "y"].includes(normalized)) return true;
  if (["否", "不需要", "false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

function canPrintApprovedOrder(status: unknown): boolean {
  return String(status ?? "").trim() === "approved";
}

// ==================== 主组件 ====================

export default function SalesOrdersPage() {
  const [searchTerm, setSearchTerm]         = useState("");
  const [statusFilter, setStatusFilter]     = useState<string>("all");
  const [pageSize, setPageSize]             = useState<number>(20);
  const [currentPage, setCurrentPage]       = useState<number>(1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalesOrder | null>(null);
  const [isEditing, setIsEditing]           = useState(false);
  const [isMaximized, setIsMaximized]       = useState(false);
  const [hasHandledOrderIdParam, setHasHandledOrderIdParam] = useState(false);
  const { canDelete }                       = usePermission();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { user }                            = useAuth();
  const isAdmin                             = String((user as any)?.role ?? "") === "admin";
  const trpcUtils                           = trpc.useUtils();

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalType, setApprovalType]             = useState<"approve" | "reject">("approve");
  const [approvalComment, setApprovalComment]       = useState("");
  const [approvalHistoryOpen, setApprovalHistoryOpen]       = useState(false);
  const [approvalHistoryOrderId, setApprovalHistoryOrderId] = useState<number | null>(null);

  const [printOrderOpen, setPrintOrderOpen]       = useState(false);
  const [printDeliveryOpen, setPrintDeliveryOpen] = useState(false);
  const [printReceiptOpen, setPrintReceiptOpen]   = useState(false);
  const [printRecord, setPrintRecord]             = useState<SalesOrder | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    customerId:      0,
    customerCode:    "",
    customerName:    "",
    contactPerson:   "",
    phone:           "",
    orderDate:       new Date().toISOString().split("T")[0],
    deliveryDate:    "",
    shippingAddress: "",
    paymentTerms:    "",
    prepaymentRatio: "30",
    currency:        "CNY" as string,
    exchangeRate:    "1",
    status:          "draft" as string,
    salesperson:     "",
    remarks:         "",
    products:        [] as SelectedProduct[],
    needsShipping:   null as boolean | null,
    shippingFee:     "",
    isExport:        null as boolean | null,
    tradeTerm:       "",
    receiptAccountId: "",
  });

  // ==================== tRPC 查询 ====================

  const { data: ordersData, isLoading, refetch } = trpc.salesOrders.list.useQuery(
    {
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 2000,
    },
    { refetchOnWindowFocus: false }
  );

  const { data: nextOrderNoData } = trpc.salesOrders.nextOrderNo.useQuery(undefined, {
    enabled: formDialogOpen && !isEditing,
    refetchOnWindowFocus: false,
  });

  const { data: approvalHistory = [] } = trpc.salesOrders.getApprovalHistory.useQuery(
    { id: approvalHistoryOrderId! },
    { enabled: !!approvalHistoryOrderId && approvalHistoryOpen }
  );

  const { data: orderDetail } = trpc.salesOrders.getById.useQuery(
    { id: selectedRecord?.id ?? 0 },
    { enabled: !!selectedRecord?.id && viewDialogOpen }
  );
  const { data: approvalState } = trpc.salesOrders.getApprovalState.useQuery(
    { id: selectedRecord?.id ?? 0 },
    { enabled: !!selectedRecord?.id && viewDialogOpen && selectedRecord?.status === "pending_review" }
  );
  const { data: exchangeRateRows = [] } = trpc.exchangeRates.list.useQuery(
    { limit: 500 },
    { refetchOnWindowFocus: false }
  );
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery(
    { status: "active" },
    { refetchOnWindowFocus: false }
  );
  const { data: customersForImport = [] } = trpc.customers.list.useQuery(
    { limit: 5000 },
    { refetchOnWindowFocus: false }
  );
  const { data: productsForImport = [] } = trpc.products.list.useQuery(
    { salePermission: "saleable", limit: 5000 },
    { refetchOnWindowFocus: false }
  );
  const { data: orderFormCatalog } = trpc.workflowSettings.getFormCatalogItem.useQuery({
    module: "销售部",
    formType: "业务单据",
    formName: "订单管理",
  });
  const orders = ordersData ?? [];
  const { data: salesOrderItemsRows = [] } = trpc.salesOrders.getItemsByOrderIds.useQuery(
    { orderIds: orders.map((order: any) => Number(order?.id)).filter((id) => Number.isFinite(id) && id > 0) },
    {
      enabled: orders.length > 0,
      refetchOnWindowFocus: false,
    }
  );

  // ==================== Mutations ====================

  const createMutation = trpc.salesOrders.create.useMutation({
    onSuccess: async (orderId, variables) => {
      // 如果需要报关，自动生成报关待办记录
      if (variables.isExport && orderId) {
        try {
          const declarationNo = `CD-${new Date().getFullYear()}-${String(orderId).padStart(6, "0")}`;
          await createCustomsMutation.mutateAsync({
            declarationNo,
            salesOrderId: orderId as number,
            customerId: variables.customerId,
            currency: variables.currency ?? "USD",
            amount: variables.totalAmount,
            destination: variables.country || variables.shippingAddress || "",
            remark: "系统自动生成（销售订单报关待办）",
          });
          toast.success("订单已提交审核，报关待办已自动生成");
        } catch {
          toast.success("订单已提交审核");
          toast.warning("报关待办生成失败，请手动创建");
        }
      } else {
        toast.success("订单已提交审核");
      }
      setFormDialogOpen(false);
      await Promise.all([
        refetch(),
        trpcUtils.workflowCenter.list.invalidate(),
        trpcUtils.workflowCenter.stats.invalidate(),
      ]);
    },
    onError:   (e) => toast.error("创建失败：" + e.message),
  });
  const importCreateMutation = trpc.salesOrders.create.useMutation();

  const createCustomsMutation = trpc.customs.create.useMutation({
    onError: (e) => toast.error("报关待办生成失败：" + e.message),
  });

  const saveDraftMutation = trpc.salesOrders.create.useMutation({
    onSuccess: () => { toast.success("草稿已保存"); setFormDialogOpen(false); refetch(); },
    onError:   (e) => toast.error("保存草稿失败：" + e.message),
  });

  const updateDraftMutation = trpc.salesOrders.update.useMutation({
    onSuccess: () => { toast.success("草稿已更新"); setFormDialogOpen(false); refetch(); },
    onError:   (e) => toast.error("更新草稿失败：" + e.message),
  });

  const updateMutation = trpc.salesOrders.update.useMutation({
    onSuccess: () => { toast.success("订单已更新"); setFormDialogOpen(false); refetch(); },
    onError:   (e) => toast.error("更新失败：" + e.message),
  });

  const deleteMutation = trpc.salesOrders.delete.useMutation({
    onSuccess: () => { toast.success("订单已删除"); refetch(); },
    onError:   (e) => toast.error("删除失败：" + e.message),
  });

  const updateStatusMutation = trpc.salesOrders.update.useMutation({
    onSuccess: () => { toast.success("状态已更新"); setViewDialogOpen(false); refetch(); },
    onError:   (e) => toast.error("更新失败：" + e.message),
  });
  const setFormApprovalEnabledMutation = trpc.workflowSettings.setFormApprovalEnabled.useMutation();

  const submitForApprovalMutation = trpc.salesOrders.submitForApproval.useMutation({
    onSuccess: async () => {
      toast.success("已提交审批");
      setViewDialogOpen(false);
      await Promise.all([
        refetch(),
        trpcUtils.workflowCenter.list.invalidate(),
        trpcUtils.workflowCenter.stats.invalidate(),
      ]);
    },
    onError:   (e) => toast.error("提交失败：" + e.message),
  });

  const approveMutation = trpc.salesOrders.approve.useMutation({
    onSuccess: () => { toast.success("审批已通过"); setApprovalDialogOpen(false); setViewDialogOpen(false); refetch(); },
    onError:   (e) => toast.error("审批失败：" + e.message),
  });

  const rejectMutation = trpc.salesOrders.reject.useMutation({
    onSuccess: () => { toast.success("订单已驳回"); setApprovalDialogOpen(false); setViewDialogOpen(false); refetch(); },
    onError:   (e) => toast.error("驳回失败：" + e.message),
  });

  const approvalEnabled = Boolean((orderFormCatalog as any)?.approvalEnabled);
  const handleToggleApprovalEnabled = async () => {
    if (!isAdmin) return;
    await setFormApprovalEnabledMutation.mutateAsync({
      module: "销售部",
      formType: "业务单据",
      formName: "订单管理",
      path: "/sales/orders",
      approvalEnabled: !approvalEnabled,
    });
    await trpcUtils.workflowSettings.getFormCatalogItem.invalidate({
      module: "销售部",
      formType: "业务单据",
      formName: "订单管理",
    });
    await trpcUtils.workflowSettings.formCatalog.invalidate();
    toast.success(!approvalEnabled ? "已开启审批流程" : "已关闭审批流程");
  };

  // ==================== 历史价格查询 ====================

  // 当产品选择变化时，自动查询并带入历史价格
  const handleProductsChange = async (products: SelectedProduct[]) => {
    setFormData(prev => ({ ...prev, products }));

    // 只有选择了客户且有新产品（单价为0）时才查询历史价格
    if (formData.customerId <= 0) return;
    const newProducts = products.filter(p => p.price === 0);
    if (newProducts.length === 0) return;

    try {
      const lastPrices = await trpcUtils.salesOrders.getLastPrices.fetch({
        customerId: formData.customerId,
        productIds: newProducts.map(p => p.id),
      });

      if (lastPrices.length > 0) {
        const priceMap = new Map(lastPrices.map(lp => [lp.productId, lp]));
        const updatedProducts = products.map(p => {
          const lastPrice = priceMap.get(p.id);
          if (lastPrice && p.price === 0) {
            const price = parseFloat(lastPrice.unitPrice);
            return {
              ...p,
              price,
              amount: p.quantity * price * (1 - (p.discount || 0) / 100),
              currency: lastPrice.currency,
            };
          }
          return p;
        });
        setFormData(prev => ({ ...prev, products: updatedProducts }));
        toast.info("已自动带入上次销售价格");
      }
    } catch {
      // 查询失败不影响正常流程
    }
  };

  // ==================== 副作用 ====================

  useEffect(() => {
    if (formDialogOpen && !isEditing) {
      setFormData(prev => ({
        ...prev,
        orderDate: new Date().toISOString().split("T")[0],
      }));
    }
  }, [formDialogOpen, isEditing]);

  // ==================== 数据转换 ====================

  const detailProducts: SelectedProduct[] = (orderDetail?.items ?? []).map((item: any) => ({
    id:       item.productId   ?? 0,
    code:     item.productCode ?? "",
    name:     item.productName ?? "",
    spec:     item.specification ?? "",
    unit:     item.unit        ?? "",
    price:    parseFloat(item.unitPrice ?? "0"),
    stock:    0,
    quantity: parseFloat(item.quantity  ?? "1"),
    discount: 0,
    amount:   parseFloat(item.amount    ?? "0"),
  }));

  const latestRateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of exchangeRateRows as any[]) {
      const from = String(row?.fromCurrency || "").toUpperCase();
      const to = String(row?.toCurrency || "CNY").toUpperCase();
      if (!from || to !== "CNY") continue;
      if (map.has(from)) continue;
      const n = parseFloat(String(row?.rate ?? "0"));
      if (Number.isFinite(n) && n > 0) map.set(from, n);
    }
    map.set("CNY", 1);
    return map;
  }, [exchangeRateRows]);

  const orderItemMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const row of salesOrderItemsRows as any[]) {
      const orderId = Number(row?.orderId || 0);
      if (!orderId) continue;
      const current = map.get(orderId) || [];
      current.push(row);
      map.set(orderId, current);
    }
    return map;
  }, [salesOrderItemsRows]);

  const getOrderAmountInCny = (r: any): number => {
    const amount = parseFloat(r?.totalAmount ?? "0");
    if (!Number.isFinite(amount)) return 0;
    const currency = String(r?.currency || "CNY").toUpperCase();
    if (currency === "CNY") return amount;

    const latestRate = latestRateMap.get(currency);
    if (Number.isFinite(latestRate) && (latestRate as number) > 0) {
      return amount * (latestRate as number);
    }

    const orderRate = parseFloat(String(r?.exchangeRate ?? "0"));
    if (Number.isFinite(orderRate) && orderRate > 0) return amount * orderRate;

    return amount;
  };

  const resolveFinanceExchangeRate = (currencyRaw: unknown): string => {
    const currency = String(currencyRaw || "CNY").toUpperCase();
    if (currency === "CNY") return "1";
    const rate = latestRateMap.get(currency);
    return Number.isFinite(rate) && (rate as number) > 0 ? String(rate) : "";
  };

  useEffect(() => {
    if (!formDialogOpen) return;
    setFormData((prev) => {
      const nextRate = resolveFinanceExchangeRate(prev.currency);
      return prev.exchangeRate === nextRate ? prev : { ...prev, exchangeRate: nextRate };
    });
  }, [formDialogOpen, formData.currency, latestRateMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    if (hasHandledOrderIdParam) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = Number(params.get("id") || "");
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setHasHandledOrderIdParam(true);
      return;
    }
    if (!orders.length) return;
    const record = orders.find((item: any) => Number(item?.id) === orderId) as DbOrder | undefined;
    setHasHandledOrderIdParam(true);
    if (!record) return;
    setSelectedRecord({ ...(record as DbOrder), products: [] });
    setViewDialogOpen(true);
    window.history.replaceState({}, "", "/sales/orders");
  }, [orders, hasHandledOrderIdParam]);

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, safePage, pageSize]);

  const stats = {
    total:       orders.length,
    totalAmount: orders.reduce((sum: number, r: any) => sum + getOrderAmountInCny(r), 0),
    pending:     orders.filter(r => (r.status as string) === "processing" || (r.status as string) === "pending_review").length,
    completed:   orders.filter(r => (r.status as string) === "completed").length,
  };

  const currencySummary = Object.entries(
    orders.reduce((acc: Record<string, number>, r: any) => {
      const currency = String(r.currency || "CNY");
      const amt = parseFloat(r.totalAmount ?? "0") || 0;
      acc[currency] = (acc[currency] || 0) + amt;
      return acc;
    }, {})
  ).sort((a, b) => {
    if (a[0] === "CNY") return -1;
    if (b[0] === "CNY") return 1;
    return b[1] - a[1];
  });

  // ==================== 事件处理 ====================

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedCustomer(null);
    setFormData({
      customerId:      0,
      customerCode:    "",
      customerName:    "",
      contactPerson:   "",
      phone:           "",
      orderDate:       new Date().toISOString().split("T")[0],
      deliveryDate:    "",
      shippingAddress: "",
      paymentTerms:    "",
      prepaymentRatio: "30",
      currency:        "CNY",
      exchangeRate:    "1",
      status:          "draft",
      salesperson:     user?.name ?? "",
      remarks:         "",
      products:        [],
      needsShipping:   null,
      shippingFee:     "",
      isExport:        null,
      tradeTerm:       "",
      receiptAccountId: "",
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: SalesOrder) => {
    const openEditWithProducts = async () => {
      setIsEditing(true);
      setSelectedRecord(record);

      let products = record.products;
      let detailOrder: Partial<SalesOrder> = record;
      try {
        const detail = await trpcUtils.salesOrders.getById.fetch({ id: record.id });
        detailOrder = (detail?.order ?? record) as Partial<SalesOrder>;
        products = mapOrderItemsToSelectedProducts(detail?.items ?? []);
      } catch {
        toast.warning("订单明细加载失败，已使用当前数据");
      }

      const customer: Customer = {
        id:            detailOrder.customerId    ?? 0,
        code:          detailOrder.customerCode  ?? "",
        name:          detailOrder.customerName  ?? "",
        shortName:     null,
        type:          "hospital",
        contactPerson: detailOrder.contactPerson ?? null,
        phone:         detailOrder.phone         ?? null,
        email:         null,
        address:       detailOrder.shippingAddress ?? null,
        province:      null,
        city:          null,
        country:       null,
        status:        "active",
        creditLimit:   null,
        paymentTerms:  normalizePaymentCondition(detailOrder.paymentMethod) || null,
        currency:      detailOrder.currency      ?? "CNY",
        taxNo:         null,
        bankAccount:   null,
        bankName:      null,
        source:        null,
        needInvoice:   false,
        salesPersonId: detailOrder.salesPersonId ?? null,
        salesPersonName: detailOrder.salesPersonName ?? null,
        createdBy:     null,
        createdAt:     new Date(),
        updatedAt:     new Date(),
      };
      setSelectedCustomer(customer);
      setFormData({
        customerId:      detailOrder.customerId    ?? 0,
        customerCode:    detailOrder.customerCode  ?? "",
        customerName:    detailOrder.customerName  ?? "",
        contactPerson:   detailOrder.shippingContact ?? detailOrder.contactPerson ?? "",
        phone:           detailOrder.shippingPhone ?? detailOrder.phone ?? "",
        orderDate:       toInputDate(detailOrder.orderDate),
        deliveryDate:    toInputDate(detailOrder.deliveryDate),
        shippingAddress: detailOrder.shippingAddress ?? "",
        paymentTerms:    normalizePaymentCondition(detailOrder.paymentMethod) || "账期支付",
        prepaymentRatio: parsePrepayRatioFromRemark(detailOrder.remark),
        currency:        detailOrder.currency         ?? "CNY",
        exchangeRate:    (detailOrder as any).exchangeRate ?? "1",
        status:          normalizeOrderStatus(detailOrder.status),
        salesperson:     String(detailOrder.salesPersonName ?? user?.name ?? ""),
        remarks:         detailOrder.remark          ?? "",
        products,
        needsShipping:   normalizeBooleanField(detailOrder.needsShipping, false),
        shippingFee:     detailOrder.shippingFee     ?? "",
        isExport:        normalizeBooleanField(detailOrder.isExport, false),
        tradeTerm:       detailOrder.tradeTerm       ?? "",
        receiptAccountId: detailOrder.receiptAccountId ? String(detailOrder.receiptAccountId) : "",
      });
      setFormDialogOpen(true);
    };
    void openEditWithProducts();
  };

  const handleView = (record: DbOrder) => {
    setSelectedRecord({ ...record, products: [] });
    setViewDialogOpen(true);
  };

  const handleDelete = (record: DbOrder) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    if (!confirm(`确认删除订单 ${record.orderNo}？`)) return;
    deleteMutation.mutate({ id: record.id });
  };

  // 构建订单数据的公共逻辑
  const buildOrderData = () => {
    const productSubtotal = formData.products.reduce(
      (sum, p) => sum + p.quantity * p.price * (1 - (p.discount || 0) / 100),
      0
    );
    const shippingAmount =
      formData.needsShipping && formData.shippingFee
        ? Math.max(0, parseFloat(formData.shippingFee) || 0)
        : 0;
    const totalAmount = productSubtotal + shippingAmount;
    const items = formData.products.map(p => ({
      productId: p.id,
      quantity:  String(p.quantity),
      unit:      p.unit,
      unitPrice: String(p.price),
      amount:    String(p.quantity * p.price * (1 - (p.discount || 0) / 100)),
    }));
    return { totalAmount, productSubtotal, shippingAmount, items };
  };

  const handleSubmit = () => {
    const missingFields: string[] = [];
    if (!formData.customerId) missingFields.push("客户");
    if (formData.products.length === 0) missingFields.push("订单产品");
    if (!formData.deliveryDate) missingFields.push("交货日期");
    if (!formData.paymentTerms) missingFields.push("付款条件");
    if (formData.needsShipping === null) missingFields.push("是否需要运费");
    if (formData.isExport === null) missingFields.push("是否需要报关");

    const hasInvalidPrice = formData.products.some((p) => !Number.isFinite(p.price) || p.price <= 0);
    const hasInvalidQty = formData.products.some((p) => !Number.isFinite(p.quantity) || p.quantity <= 0);
    if (hasInvalidPrice) missingFields.push("单价");
    if (hasInvalidQty) missingFields.push("数量");

    if (missingFields.length > 0) {
      const uniqueMissingFields = Array.from(new Set(missingFields));
      toast.error("提交失败，请填写必填项", {
        description: `缺少或不合法：${uniqueMissingFields.join("、")}`,
      });
      return;
    }
    const { totalAmount, items } = buildOrderData();
    const exchangeRate = resolveFinanceExchangeRate(formData.currency);
    if (formData.currency !== "CNY" && (!exchangeRate || Number(exchangeRate) <= 0)) {
      toast.error("提交失败：当前货币未配置财务汇率", {
        description: `请先在财务部-账户管理维护 ${formData.currency} -> CNY 汇率`,
      });
      return;
    }
    const totalAmountBase = String(totalAmount * parseFloat(exchangeRate));
    const mergedRemark = buildRemarkWithPrepayRatio(formData.remarks, formData.paymentTerms, formData.prepaymentRatio);

    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          customerId:      formData.customerId,
          orderDate:       formData.orderDate,
          deliveryDate:    formData.deliveryDate || undefined,
          totalAmount:     String(totalAmount),
          currency:        formData.currency,
          paymentMethod:   formData.paymentTerms,
          exchangeRate,
          totalAmountBase,
          status:          formData.status as any,
          shippingAddress: formData.shippingAddress,
          shippingContact: formData.contactPerson || undefined,
          shippingPhone:   formData.phone || undefined,
          needsShipping:   formData.needsShipping ?? false,
          shippingFee:     formData.needsShipping && formData.shippingFee ? formData.shippingFee : undefined,
          isExport:        formData.isExport ?? false,
          tradeTerm:       formData.tradeTerm || undefined,
          receiptAccountId: formData.receiptAccountId ? Number(formData.receiptAccountId) : null,
          remark:          mergedRemark,
          salesPersonId:   selectedCustomer?.salesPersonId ?? selectedRecord.salesPersonId ?? user?.id,
          items,
        },
      });
    } else {
      createMutation.mutate({
        orderNo:         nextOrderNoData ?? `S${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`,
        customerId:      formData.customerId,
        orderDate:       formData.orderDate,
        deliveryDate:    formData.deliveryDate || undefined,
        totalAmount:     String(totalAmount),
        currency:        formData.currency,
        paymentMethod:   formData.paymentTerms,
        exchangeRate,
        totalAmountBase,
        status:          "pending_review",
        shippingAddress: formData.shippingAddress,
        shippingContact: formData.contactPerson || undefined,
        shippingPhone:   formData.phone || undefined,
        needsShipping:   formData.needsShipping ?? false,
        shippingFee:     formData.needsShipping && formData.shippingFee ? formData.shippingFee : undefined,
        isExport:        formData.isExport ?? false,
        tradeTerm:       formData.tradeTerm || undefined,
        receiptAccountId: formData.receiptAccountId ? Number(formData.receiptAccountId) : null,
        remark:          mergedRemark,
        salesPersonId:   selectedCustomer?.salesPersonId ?? user?.id,
        items,
      });
    }
  };

  // 保存草稿
  const handleSaveDraft = () => {
    if (!formData.customerId) {
      toast.error("请先选择客户");
      return;
    }
    const { totalAmount, items } = buildOrderData();
    const draftExchangeRate = resolveFinanceExchangeRate(formData.currency) || "1";
    const draftTotalAmountBase = String(totalAmount * parseFloat(draftExchangeRate));
    const mergedDraftRemark = buildRemarkWithPrepayRatio(formData.remarks, formData.paymentTerms, formData.prepaymentRatio);

    if (isEditing && selectedRecord) {
      updateDraftMutation.mutate({
        id: selectedRecord.id,
        data: {
          customerId:      formData.customerId,
          orderDate:       formData.orderDate,
          deliveryDate:    formData.deliveryDate || undefined,
          totalAmount:     String(totalAmount),
          currency:        formData.currency,
          paymentMethod:   formData.paymentTerms,
          exchangeRate:    draftExchangeRate,
          totalAmountBase: draftTotalAmountBase,
          status:          "draft",
          shippingAddress: formData.shippingAddress,
          shippingContact: formData.contactPerson || undefined,
          shippingPhone:   formData.phone || undefined,
          needsShipping:   formData.needsShipping ?? false,
          shippingFee:     formData.needsShipping && formData.shippingFee ? formData.shippingFee : undefined,
          isExport:        formData.isExport ?? false,
          tradeTerm:       formData.tradeTerm || undefined,
          receiptAccountId: formData.receiptAccountId ? Number(formData.receiptAccountId) : null,
          remark:          mergedDraftRemark,
          salesPersonId:   selectedCustomer?.salesPersonId ?? selectedRecord.salesPersonId ?? user?.id,
          items,
        },
      });
    } else {
      saveDraftMutation.mutate({
        orderNo:         nextOrderNoData ?? `S${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`,
        customerId:      formData.customerId,
        orderDate:       formData.orderDate,
        deliveryDate:    formData.deliveryDate || undefined,
        totalAmount:     items.length > 0 ? String(totalAmount) : "0",
        currency:        formData.currency,
        paymentMethod:   formData.paymentTerms,
        exchangeRate:    draftExchangeRate,
        totalAmountBase: draftTotalAmountBase,
        status:          "draft",
        shippingAddress: formData.shippingAddress,
        shippingContact: formData.contactPerson || undefined,
        shippingPhone:   formData.phone || undefined,
        needsShipping:   formData.needsShipping ?? false,
        shippingFee:     formData.needsShipping && formData.shippingFee ? formData.shippingFee : undefined,
        isExport:        formData.isExport ?? false,
        tradeTerm:       formData.tradeTerm || undefined,
        receiptAccountId: formData.receiptAccountId ? Number(formData.receiptAccountId) : null,
        remark:          mergedDraftRemark,
        salesPersonId:   selectedCustomer?.salesPersonId ?? user?.id,
        items,
      });
    }
  };

  const handleStatusChange = (record: DbOrder, newStatus: string) => {
    updateStatusMutation.mutate({ id: record.id, data: { status: newStatus as any } });
  };

  const handleSubmitForApproval = (record: DbOrder) => {
    submitForApprovalMutation.mutate({ id: record.id });
  };

  const handleApproveOrReject = () => {
    if (!selectedRecord) return;
    if (approvalType === "approve") {
      approveMutation.mutate({ id: selectedRecord.id, comment: approvalComment || undefined });
    } else {
      if (!approvalComment) { toast.error("驳回时必须填写原因"); return; }
      rejectMutation.mutate({ id: selectedRecord.id, comment: approvalComment });
    }
  };

  const handleExportOrders = () => {
    if (orders.length === 0) {
      toast.warning("暂无可导出数据");
      return;
    }

    const paymentStatusLabelMap: Record<string, string> = {
      unpaid: "未收款",
      partial: "部分收款",
      paid: "已收款",
    };
    const accountNameMap = new Map(
      (bankAccounts as any[]).map((account: any) => [
        Number(account.id),
        account.accountName || account.bankName || `账户${account.id}`,
      ])
    );
    const rows = orders.flatMap((order: any) => {
      const items = orderItemMap.get(Number(order.id)) || [];
      const orderRows = items.length > 0 ? items : [{}];
      return orderRows.map((item: any) => [
        order.orderNo || "",
        order.customerCode || "",
        order.customerName || "",
        formatDate(order.orderDate) === "-" ? "" : formatDate(order.orderDate),
        formatDate(order.deliveryDate) === "-" ? "" : formatDate(order.deliveryDate),
        normalizePaymentCondition(order.paymentMethod) || "",
        normalizePaymentCondition(order.paymentMethod) === "预付款" ? parsePrepayRatioFromRemark(order.remark) : "",
        order.currency || "CNY",
        (order as any).exchangeRate || resolveFinanceExchangeRate(order.currency || "CNY") || "",
        statusMap[String(order.status || "")]?.label || order.status || "",
        paymentStatusLabelMap[String(order.paymentStatus || "")] || order.paymentStatus || "",
        order.shippingAddress || "",
        order.shippingContact || order.contactPerson || "",
        order.shippingPhone || order.phone || "",
        order.needsShipping ? "是" : "否",
        order.needsShipping ? (order.shippingFee || "") : "",
        order.isExport ? "是" : "否",
        order.tradeTerm || "",
        order.receiptAccountId ? (accountNameMap.get(Number(order.receiptAccountId)) || "") : "",
        order.salesPersonName || "",
        item.productCode || "",
        item.productName || "",
        item.specification || "",
        item.unit || "",
        item.quantity || "",
        item.unitPrice || "",
        item.amount || "",
        item.remark || "",
        stripPrepayRatioFromRemark(order.remark) || "",
      ].map(escapeCsvCell).join(","));
    });

    const headers = [
      "订单号",
      "客户编码",
      "客户名称",
      "订单日期",
      "交货日期",
      "付款条件",
      "预付款比例",
      "币种",
      "汇率",
      "订单状态",
      "收款状态",
      "收货地址",
      "收货联系人",
      "收货电话",
      "是否运费",
      "运费",
      "是否报关",
      "贸易条款",
      "收款账户",
      "销售负责人",
      "产品编码",
      "产品名称",
      "规格型号",
      "单位",
      "数量",
      "单价",
      "金额",
      "行备注",
      "整单备注",
    ];

    const csv = [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = url;
    a.download = `销售订单_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("销售订单已导出");
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportOrders = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("仅支持 CSV 导入，请先导出模板后再导入");
        return;
      }

      const text = (await file.text()).replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length <= 1) {
        toast.warning("导入文件没有有效数据");
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const colIndex = (name: string) => headers.findIndex((header) => header.trim() === name);
      const readCol = (row: string[], name: string) => {
        const index = colIndex(name);
        if (index < 0) return "";
        return String(row[index] ?? "").trim();
      };

      const customerByCode = new Map(
        (customersForImport as any[])
          .filter((customer: any) => customer?.code)
          .map((customer: any) => [String(customer.code).trim(), customer])
      );
      const customerByName = new Map(
        (customersForImport as any[])
          .filter((customer: any) => customer?.name)
          .map((customer: any) => [String(customer.name).trim(), customer])
      );
      const productByCode = new Map(
        (productsForImport as any[])
          .filter((product: any) => product?.code)
          .map((product: any) => [String(product.code).trim(), product])
      );
      const productByName = new Map(
        (productsForImport as any[])
          .filter((product: any) => product?.name)
          .map((product: any) => [String(product.name).trim(), product])
      );
      const accountByName = new Map<string, any>();
      for (const account of bankAccounts as any[]) {
        for (const key of [account.accountName, account.bankName, account.accountNo]) {
          const normalized = String(key || "").trim();
          if (normalized) {
            accountByName.set(normalized, account);
          }
        }
      }

      const statusReverseMap: Record<string, string> = {
        草稿: "draft",
        待审批: "pending_review",
        已审批: "approved",
        待收款: "pending_payment",
        已确认: "confirmed",
        处理中: "confirmed",
        生产中: "in_production",
        待发货: "ready_to_ship",
        部分发货: "partial_shipped",
        已发货: "shipped",
        已完成: "completed",
        已取消: "cancelled",
        draft: "draft",
        pending_review: "pending_review",
        approved: "approved",
        pending_payment: "pending_payment",
        confirmed: "confirmed",
        processing: "confirmed",
        in_production: "in_production",
        ready_to_ship: "ready_to_ship",
        partial_shipped: "partial_shipped",
        shipped: "shipped",
        completed: "completed",
        cancelled: "cancelled",
      };
      const paymentStatusReverseMap: Record<string, "unpaid" | "partial" | "paid"> = {
        未收款: "unpaid",
        部分收款: "partial",
        已收款: "paid",
        unpaid: "unpaid",
        partial: "partial",
        paid: "paid",
      };

      const groupedOrders = new Map<string, any>();

      for (let i = 1; i < lines.length; i += 1) {
        const row = parseCsvLine(lines[i]);
        const customerCode = readCol(row, "客户编码");
        const customerName = readCol(row, "客户名称");
        const customer = customerByCode.get(customerCode) || customerByName.get(customerName);
        if (!customer) {
          throw new Error(`第${i + 1}行: 未找到客户 ${customerCode || customerName || "-"}`);
        }

        const productCode = readCol(row, "产品编码");
        const productName = readCol(row, "产品名称");
        const product = productByCode.get(productCode) || productByName.get(productName);
        if (!product) {
          throw new Error(`第${i + 1}行: 未找到产品 ${productCode || productName || "-"}`);
        }

        const quantity = Number(readCol(row, "数量") || 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`第${i + 1}行: 数量必须大于 0`);
        }

        const unitPrice = Number(readCol(row, "单价") || 0);
        const amount = Number(readCol(row, "金额") || quantity * unitPrice || 0);
        const importOrderNo = readCol(row, "订单号");
        const orderGroupKey = importOrderNo || `AUTO-SO-ROW-${i + 1}`;
        const paymentTerms = normalizePaymentCondition(readCol(row, "付款条件") || String(customer.paymentTerms || "") || "先款后货");
        const remark = buildRemarkWithPrepayRatio(
          readCol(row, "整单备注"),
          paymentTerms,
          readCol(row, "预付款比例") || "30"
        );
        const receiptAccount = accountByName.get(readCol(row, "收款账户"));
        const currency = readCol(row, "币种") || "CNY";
        const exchangeRate = readCol(row, "汇率") || resolveFinanceExchangeRate(currency) || "1";

        if (!groupedOrders.has(orderGroupKey)) {
          groupedOrders.set(orderGroupKey, {
            orderNo: importOrderNo || "",
            customerId: Number(customer.id),
            orderDate: readCol(row, "订单日期") || new Date().toISOString().split("T")[0],
            deliveryDate: readCol(row, "交货日期") || undefined,
            currency,
            paymentMethod: paymentTerms,
            exchangeRate,
            status: (statusReverseMap[readCol(row, "订单状态")] || "draft") as any,
            paymentStatus: paymentStatusReverseMap[readCol(row, "收款状态")] || undefined,
            shippingAddress: readCol(row, "收货地址") || customer.address || undefined,
            shippingContact: readCol(row, "收货联系人") || customer.contactPerson || undefined,
            shippingPhone: readCol(row, "收货电话") || customer.phone || undefined,
            needsShipping: parseImportBoolean(readCol(row, "是否运费"), false),
            shippingFee: readCol(row, "运费") || undefined,
            isExport: parseImportBoolean(readCol(row, "是否报关"), false),
            tradeTerm: readCol(row, "贸易条款") || undefined,
            receiptAccountId: receiptAccount ? Number(receiptAccount.id) : null,
            remark,
            salesPersonId: customer.salesPersonId || user?.id || undefined,
            items: [],
          });
        }

        groupedOrders.get(orderGroupKey).items.push({
          productId: Number(product.id),
          quantity: String(quantity),
          unit: readCol(row, "单位") || product.unit || undefined,
          unitPrice: String(unitPrice),
          amount: String(amount),
          remark: readCol(row, "行备注") || undefined,
        });
      }

      let success = 0;
      const errors: string[] = [];
      for (const order of Array.from(groupedOrders.values())) {
        try {
          const productTotal = order.items.reduce(
            (sum: number, item: any) => sum + Number(item.amount || 0),
            0
          );
          const shippingAmount =
            order.needsShipping && order.shippingFee ? Number(order.shippingFee || 0) : 0;
          const totalAmount = productTotal + shippingAmount;
          const totalAmountBase = String(totalAmount * Number(order.exchangeRate || 1));
          const orderId = await importCreateMutation.mutateAsync({
            ...order,
            totalAmount: String(totalAmount),
            totalAmountBase,
          });

          if (order.isExport && orderId) {
            try {
              const declarationNo = `CD-${new Date().getFullYear()}-${String(orderId).padStart(6, "0")}`;
              await createCustomsMutation.mutateAsync({
                declarationNo,
                salesOrderId: orderId as number,
                customerId: order.customerId,
                currency: order.currency ?? "USD",
                amount: String(totalAmount),
                destination: order.shippingAddress || "",
                remark: "系统自动生成（销售订单导入生成报关待办）",
              });
            } catch {
              // 报关待办失败不阻塞主单导入
            }
          }
          success += 1;
        } catch (error: any) {
          errors.push(`${order.orderNo}: ${error?.message || "导入失败"}`);
        }
      }

      await Promise.all([
        refetch(),
        trpcUtils.workflowCenter.list.invalidate(),
        trpcUtils.workflowCenter.stats.invalidate(),
      ]);
      if (success > 0) {
        toast.success(`导入成功 ${success} 笔订单`);
      }
      if (errors.length > 0) {
        toast.error(`导入失败 ${errors.length} 笔`, {
          description: errors.slice(0, 2).join("；"),
        });
      }
    } catch (error: any) {
      toast.error(error?.message || "导入失败");
    } finally {
      event.target.value = "";
    }
  };

  const canApproveSelectedOrder = selectedRecord?.status === "pending_review" && Boolean((approvalState as any)?.canApprove);
  const approvalStageLabel = (approvalState as any)?.stageLabel || ((approvalState as any)?.stage === "manager"
    ? "部门负责人审批"
    : (approvalState as any)?.stage === "general_manager"
      ? "总经理审批"
      : (approvalState as any)?.stage === "system_admin"
        ? "系统管理员审批"
      : "");

  // ==================== 渲染 ====================

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">订单管理</h1>
              <p className="text-sm text-muted-foreground">管理销售订单，支持多产品选择和价格计算</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportOrders}>
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" />
              导入
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportOrders}
            />
            <Button
              variant={statusFilter === "draft" ? "secondary" : "outline"}
              onClick={() => setStatusFilter(statusFilter === "draft" ? "all" : "draft")}
            >
              <Archive className="h-4 w-4 mr-2" />
              草稿库
              {ordersData && ordersData.filter((o: any) => o.status === "draft").length > 0 && statusFilter !== "draft" && (
                <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {ordersData.filter((o: any) => o.status === "draft").length}
                </span>
              )}
            </Button>
            {isAdmin ? (
              <Button
                variant={approvalEnabled ? "default" : "outline"}
                onClick={handleToggleApprovalEnabled}
                disabled={setFormApprovalEnabledMutation.isPending}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                {approvalEnabled ? "审批已开启" : "开启审批"}
              </Button>
            ) : null}
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              新建订单
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
          <Card className="flex"><CardContent className="p-2.5 space-y-1.5 flex flex-col justify-center">
            <div className="text-xs text-muted-foreground">订单总数</div>
            <div className="text-2xl font-bold leading-none">{stats.total}</div>
          </CardContent></Card>
          <Card className="flex"><CardContent className="p-2.5 space-y-1.5 flex flex-col justify-center">
            <div className="text-xs text-muted-foreground">订单金额（多币种汇总）</div>
            <div className="text-2xl leading-none font-bold text-green-600">
              ¥{formatDisplayNumber(stats.totalAmount / 10000, { maximumFractionDigits: 1 })}万
              <span className="text-[11px] font-medium text-muted-foreground ml-1 align-baseline">(本位币)</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {currencySummary.length === 0 ? (
                <span className="text-[11px] text-muted-foreground">-</span>
              ) : (
                currencySummary.map(([currency, amount], index) => (
                  <span key={`${currency}-${index}`} className="text-[11px] leading-tight font-medium text-muted-foreground">
                    {currency} {getCurrencySymbol(currency)}{formatDisplayNumber(amount)}
                  </span>
                ))
              )}
            </div>
          </CardContent></Card>
          <Card className="flex"><CardContent className="p-2.5 space-y-1.5 flex flex-col justify-center">
            <div className="text-xs text-muted-foreground">待处理</div>
            <div className="text-2xl font-bold leading-none text-amber-600">{stats.pending}</div>
          </CardContent></Card>
          <Card className="flex"><CardContent className="p-2.5 space-y-1.5 flex flex-col justify-center">
            <div className="text-xs text-muted-foreground">已完成</div>
            <div className="text-2xl font-bold leading-none text-blue-600">{stats.completed}</div>
          </CardContent></Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索订单号、客户名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="confirmed">已确认</SelectItem>
              <SelectItem value="processing">处理中</SelectItem>
              <SelectItem value="pending_review">待审批</SelectItem>
              <SelectItem value="approved">已审批</SelectItem>
              <SelectItem value="shipped">已发货</SelectItem>
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
                <TableHead className="text-center font-bold">订单号</TableHead>
                <TableHead className="text-center font-bold">客户名称</TableHead>
                <TableHead className="text-center font-bold">产品种类</TableHead>
                <TableHead className="text-center font-bold">付款条件</TableHead>
                <TableHead className="text-center font-bold">是否报关</TableHead>
                <TableHead className="text-center font-bold">订单金额</TableHead>
                <TableHead className="text-center font-bold">订单日期</TableHead>
                <TableHead className="text-center font-bold">交货日期</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                </TableRow>
              ) : orders.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="text-center font-mono">{record.orderNo}</TableCell>
                  <TableCell className="text-center font-medium">{record.customerName ?? "-"}</TableCell>
                  <TableCell className="text-center">{`${Number(record.productTypeCount ?? 0)}种`}</TableCell>
                  <TableCell className="text-center">{normalizePaymentCondition(record.paymentMethod) || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={record.isExport ? "secondary" : "outline"}>
                      {record.isExport ? "是" : "否"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {formatAmount(record.totalAmount, record.currency)}
                  </TableCell>
                  <TableCell className="text-center">{formatDate(record.orderDate)}</TableCell>
                  <TableCell className="text-center">{formatDate(record.deliveryDate)}</TableCell>
                  <TableCell className="text-center">
                    {record.status && statusMap[record.status] ? (
                      <Badge
                        variant={statusMap[record.status]?.variant || "outline"}
                        className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}
                      >
                        {statusMap[record.status]?.label || String(record.status ?? "-")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{record.status ?? "-"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(record)}>
                          <Eye className="h-4 w-4 mr-2" />查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit({ ...record, products: [] })}>
                          <Edit className="h-4 w-4 mr-2" />编辑
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(record)}>
                            <Trash2 className="h-4 w-4 mr-2" />删除
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* ==================== 新建/编辑表单对话框 ==================== */}
        <DraggableDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          defaultWidth={896}
          defaultHeight={700}
          isMaximized={isMaximized}
          onMaximizedChange={setIsMaximized}
        >
          <DraggableDialogContent isMaximized={isMaximized}>
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑订单" : "新建销售订单"}</DialogTitle>
              {!isEditing && nextOrderNoData && (
                <p className="text-sm text-muted-foreground">订单号：{nextOrderNoData}</p>
              )}
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 客户信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">客户信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div className="col-span-2 space-y-2">
                    <Label>选择客户 *</Label>
                    <CustomerSelect
                      selectedCustomer={selectedCustomer}
                      onCustomerSelect={(customer: Customer) => {
                        setSelectedCustomer(customer);
                        setFormData(prev => ({
                          ...prev,
                          customerId:      customer.id,
                          customerCode:    customer.code,
                          customerName:    customer.name,
                          contactPerson:   customer.contactPerson ?? "",
                          phone:           customer.phone         ?? "",
                          shippingAddress: customer.address       ?? "",
                          paymentTerms:    normalizePaymentCondition(customer.paymentTerms) || "账期支付",
                          salesperson:     String(customer.salesPersonName ?? user?.name ?? ""),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>联系人</Label>
                    <Input
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="联系人"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>联系电话</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="联系电话"
                    />
                  </div>
                </div>
              </div>
              <Separator />
              {/* 订单信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">订单信息</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>订单日期</Label>
                    <Input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>交货日期</Label>
                    <Input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>付款条件</Label>
                    <Select value={formData.paymentTerms} onValueChange={(v) => setFormData({ ...formData, paymentTerms: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_CONDITION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.paymentTerms === "预付款" && (
                    <div className="space-y-2">
                      <Label>预付比例(%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.prepaymentRatio}
                        onChange={(e) => setFormData({ ...formData, prepaymentRatio: e.target.value })}
                        placeholder="例如：30"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>结算货币 *</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">¥ CNY 人民币</SelectItem>
                        <SelectItem value="USD">$ USD 美元</SelectItem>
                        <SelectItem value="EUR">€ EUR 欧元</SelectItem>
                        <SelectItem value="GBP">£ GBP 英鎊</SelectItem>
                        <SelectItem value="JPY">¥ JPY 日元</SelectItem>
                        <SelectItem value="HKD">$ HKD 港币</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.currency !== "CNY" && (
                    <div className="space-y-2">
                      <Label>汇率（1{getCurrencySymbol(formData.currency)} = ?¥）*</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={formData.exchangeRate}
                        readOnly
                        disabled
                        placeholder="自动读取财务汇率"
                      />
                      <p className="text-xs text-muted-foreground">自动使用财务部-账户管理最新汇率</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>销售员</Label>
                    <Input
                      value={formData.salesperson}
                      onChange={(e) => setFormData({ ...formData, salesperson: e.target.value })}
                      placeholder="销售员姓名"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>收货地址</Label>
                    <Input
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                      placeholder="输入详细收货地址"
                    />
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label>订单状态</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUS_OPTIONS.map((statusOption) => (
                            <SelectItem key={statusOption.value} value={statusOption.value}>
                              {statusOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              {/* 运费与报关 */}
              <div>
                <h3 className="text-sm font-medium mb-3">运费与报关</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>是否需要运费</Label>
                    <Select
                      value={formData.needsShipping === null ? undefined : (formData.needsShipping ? "yes" : "no")}
                      onValueChange={(v) => setFormData({ ...formData, needsShipping: v === "yes", shippingFee: v === "no" ? "" : formData.shippingFee })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">不需要</SelectItem>
                        <SelectItem value="yes">需要</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.needsShipping && (
                    <div className="space-y-2">
                      <Label>运费金额</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.shippingFee}
                        onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                        placeholder="输入运费金额"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>是否需要报关</Label>
                    <Select
                      value={formData.isExport === null ? undefined : (formData.isExport ? "yes" : "no")}
                      onValueChange={(v) => setFormData({ ...formData, isExport: v === "yes" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">不需要</SelectItem>
                        <SelectItem value="yes">需要报关</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>贸易条款</Label>
                    <Select
                      value={formData.tradeTerm || undefined}
                      onValueChange={(v) => setFormData({ ...formData, tradeTerm: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="选择贸易条款" /></SelectTrigger>
                      <SelectContent>
                        {TRADE_TERM_OPTIONS.map((term) => (
                          <SelectItem key={term} value={term}>{term}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>收款账户</Label>
                    <Select
                      value={formData.receiptAccountId || undefined}
                      onValueChange={(v) => setFormData({ ...formData, receiptAccountId: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="选择收款账户" /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account: any) => (
                          <SelectItem key={account.id} value={String(account.id)}>
                            {account.accountName || account.bankName || `账户${account.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.isExport && (
                    <div className="md:col-span-2 lg:col-span-5">
                      <p className="inline-flex text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        提交后将自动生成报关待办
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              {/* 产品选择（从数据库加载） */}
              <div>
                <h3 className="text-sm font-medium mb-3">订单产品 *</h3>
                <ProductMultiSelect
                  useDbProducts={true}
                  salePermission="saleable"
                  selectedProducts={formData.products}
                  onSelectionChange={handleProductsChange}
                  title="选择产品"
                  showPrice={true}
                  editablePrice={true}
                  showStock={true}
                  currencySymbol={getCurrencySymbol(formData.currency)}
                  extraAmount={formData.needsShipping && formData.shippingFee ? Math.max(0, parseFloat(formData.shippingFee) || 0) : 0}
                  extraAmountLabel="运费"
                />
              </div>
              <Separator />
              {/* 备注 */}
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="输入备注信息"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>取消</Button>
              <Button
                variant="outline"
                className="text-gray-600"
                onClick={handleSaveDraft}
                disabled={saveDraftMutation.isPending || updateDraftMutation.isPending}
              >
                <Archive className="h-4 w-4 mr-2" />
                保存草稿
              </Button>
              <Button
                onClick={() => handleSubmit()}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? "保存" : "提交审核"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* ==================== 查看详情对话框 ==================== */}
        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} defaultWidth={900} defaultHeight={720}>
          <div className="px-8 py-6 space-y-5">
            {/* 头部 */}
            <div className="border-b pb-3">
              <h2 className="text-lg font-semibold">订单详情</h2>
              <p className="text-sm text-muted-foreground">
                {selectedRecord?.orderNo}
                {selectedRecord?.status && (
                  <>
                    {" "}
                    ·{" "}
                    <Badge
                      variant={statusMap[selectedRecord.status]?.variant || "outline"}
                      className={`ml-1 ${getStatusSemanticClass(selectedRecord.status, statusMap[selectedRecord.status]?.label)}`}
                    >
                      {statusMap[selectedRecord.status]?.label || String(selectedRecord.status ?? "-")}
                    </Badge>
                  </>
                )}
              </p>
            </div>

            {selectedRecord && (() => {
              /** 字段行：与客户详情保持一致 */
              const formatAmt = (v: string | null | undefined, cur?: string | null) => {
                if (!v) return "-";
                const n = parseFloat(v);
                if (isNaN(n)) return "-";
                return `${getCurrencySymbol(cur)}${formatDisplayNumber(n)}`;
              };
              return (
                <div className="space-y-5">
                  {/* 基本信息：两列网格 */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="订单号"><span className="font-mono">{selectedRecord.orderNo}</span></FieldRow>
                        <FieldRow label="订单日期">{formatDate(selectedRecord.orderDate)}</FieldRow>
                        <FieldRow label="交货日期">{formatDate(selectedRecord.deliveryDate)}</FieldRow>
                        <FieldRow label="付款条件">{normalizePaymentCondition(selectedRecord.paymentMethod) || "-"}</FieldRow>
                        <FieldRow label="货币">{selectedRecord.currency || "-"}</FieldRow>
                        <FieldRow label="贸易条款">{selectedRecord.tradeTerm || "-"}</FieldRow>
                      </div>
                      <div>
                        <FieldRow label="客户编码">{selectedRecord.customerCode || "-"}</FieldRow>
                        <FieldRow label="客户名称">{selectedRecord.customerName || "-"}</FieldRow>
                        <FieldRow label="联系人">{selectedRecord.contactPerson || "-"}</FieldRow>
                        <FieldRow label="联系电话">{selectedRecord.phone || "-"}</FieldRow>
                        <FieldRow label="收货地址">{selectedRecord.shippingAddress || "-"}</FieldRow>
                        <FieldRow label="收款账户">{selectedRecord.receiptAccountName || "-"}</FieldRow>
                        {selectedRecord.status === "pending_review" && (
                          <FieldRow label="当前审批人">
                            {(approvalState as any)?.currentApproverName
                              ? `${(approvalState as any).currentApproverName}${approvalStageLabel ? `（${approvalStageLabel}）` : ""}`
                              : "待分配"}
                          </FieldRow>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 物流 & 报关信息 */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">物流 & 报关</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="是否需要运费">{selectedRecord.needsShipping ? "需要" : "不需要"}</FieldRow>
                        {selectedRecord.needsShipping && (
                          <FieldRow label="运费">{formatAmt(selectedRecord.shippingFee, selectedRecord.currency)}</FieldRow>
                        )}
                      </div>
                      <div>
                        <FieldRow label="是否报关">{selectedRecord.isExport ? "需要报关" : "无需报关"}</FieldRow>
                        {selectedRecord.isExport && (
                          <FieldRow label="报关状态">{selectedRecord.customsStatus || "待处理"}</FieldRow>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 产品明细 */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">产品明细</h3>
                    <div className="rounded-lg border overflow-hidden overflow-x-auto" style={{WebkitOverflowScrolling:'touch'}}>
                      <Table style={{minWidth:'520px'}}>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">产品编码</TableHead>
                            <TableHead className="text-xs">产品名称</TableHead>
                            <TableHead className="text-xs">规格</TableHead>
                            <TableHead className="text-xs">单位</TableHead>
                            <TableHead className="text-right text-xs">单价</TableHead>
                            <TableHead className="text-right text-xs">数量</TableHead>
                            <TableHead className="text-right text-xs">金额</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailProducts.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">暂无产品明细</TableCell>
                            </TableRow>
                          ) : detailProducts.map((product, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{product.code}</TableCell>
                              <TableCell className="font-medium text-sm">{product.name}</TableCell>
                              <TableCell className="text-sm">{product.spec}</TableCell>
                              <TableCell className="text-sm">{product.unit}</TableCell>
                              <TableCell className="text-right text-sm">{formatAmt(String(product.price), selectedRecord.currency)}</TableCell>
                              <TableCell className="text-right text-sm">{product.quantity?.toLocaleString?.() ?? "0"}</TableCell>
                              <TableCell className="text-right font-medium text-sm">{formatAmt(String(product.amount ?? 0), selectedRecord.currency)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={6} className="text-right font-semibold text-sm">订单合计：</TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatAmt(selectedRecord.totalAmount, selectedRecord.currency)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* 备注 */}
                  {selectedRecord.remark && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                      <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remark}</p>
                    </div>
                  )}

                  {/* 操作按钮区 */}
                  <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => {
                        if (!canPrintApprovedOrder(selectedRecord.status)) {
                          toast.error("订单未审核通过，暂不能打印");
                          return;
                        }
                        setPrintRecord({ ...selectedRecord, products: detailProducts });
                        setPrintOrderOpen(true);
                      }}>
                        <Printer className="h-4 w-4 mr-1.5" />打印订单
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setPrintRecord({ ...selectedRecord, products: detailProducts });
                        setPrintDeliveryOpen(true);
                      }}>
                        <Truck className="h-4 w-4 mr-1.5" />打印发货单
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setPrintRecord({ ...selectedRecord, products: detailProducts });
                        setPrintReceiptOpen(true);
                      }}>
                        <FileText className="h-4 w-4 mr-1.5" />打印收据
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setViewDialogOpen(false);
                        handleEdit({ ...selectedRecord, products: detailProducts });
                      }}>编辑订单</Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setApprovalHistoryOrderId(selectedRecord.id);
                        setApprovalHistoryOpen(true);
                      }}>
                        <ClipboardList className="h-4 w-4 mr-1.5" />审批历史
                      </Button>
                      {(selectedRecord.status === "draft" || selectedRecord.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSubmitForApproval(selectedRecord)}
                          disabled={submitForApprovalMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1.5" />提交审批
                        </Button>
                    )}
                      {canApproveSelectedOrder && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => { setApprovalType("reject"); setApprovalComment(""); setApprovalDialogOpen(true); }}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />驳回
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => { setApprovalType("approve"); setApprovalComment(""); setApprovalDialogOpen(true); }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />审批通过
                          </Button>
                        </>
                      )}
                      {selectedRecord.status === "draft" && (
                        <Button size="sm" onClick={() => handleStatusChange(selectedRecord, "confirmed")}>确认订单</Button>
                      )}
                      {selectedRecord.status === "confirmed" && (
                        <Button size="sm" onClick={() => handleStatusChange(selectedRecord, "processing")}>开始处理</Button>
                      )}

                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </DraggableDialog>

        {/* ==================== 审批对话框 ==================== */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{approvalType === "approve" ? "审批通过确认" : "驳回订单"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                {approvalType === "approve"
                  ? `确认审批通过订单 ${selectedRecord?.orderNo}？`
                  : `确认驳回订单 ${selectedRecord?.orderNo}？`}
              </div>
              <div className="space-y-2">
                <Label>{approvalType === "approve" ? "审批意见（可选）" : "驳回原因（必填）"}</Label>
                <Textarea
                  placeholder={approvalType === "approve" ? "请输入审批意见..." : "请输入驳回原因..."}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>取消</Button>
              <Button
                className={approvalType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={approvalType === "reject" ? "destructive" : "default"}
                onClick={handleApproveOrReject}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {approvalType === "approve" ? "确认通过" : "确认驳回"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== 审批历史对话框 ==================== */}
        <Dialog open={approvalHistoryOpen} onOpenChange={setApprovalHistoryOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>审批历史</DialogTitle></DialogHeader>
            <div className="py-2">
              {(approvalHistory as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无审批记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(approvalHistory as any[]).map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex-shrink-0 mt-0.5">
                        {item.action === "approve" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : item.action === "reject" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Send className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {item.action === "approve" ? "审批通过" : item.action === "reject" ? "驳回" : "提交审批"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.createdAt ? formatDateTime(item.createdAt) : ""}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">审批人：{item.approver}</div>
                        {item.comment && (
                          <div className="text-sm mt-1 p-2 bg-muted rounded">{item.comment}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovalHistoryOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== 打印对话框 ==================== */}
        {printRecord && (
          <>
            <SalesOrderPrint
              open={printOrderOpen}
              onClose={() => setPrintOrderOpen(false)}
              order={{
                orderNumber:    printRecord.orderNo,
                orderDate:      formatDate(printRecord.orderDate),
                deliveryDate:   formatDate(printRecord.deliveryDate),
                customerName:   printRecord.customerName  ?? "",
                customerCode:   printRecord.customerCode  ?? "",
                customerType:   printRecord.customerType  ?? "",
                customerCountry: printRecord.country      ?? "",
                currency:       printRecord.currency      ?? "CNY",
                shippingAddress: printRecord.shippingAddress ?? "",
                shippingContact: printRecord.contactPerson  ?? "",
                shippingPhone:   printRecord.phone          ?? "",
                paymentMethod:   printRecord.paymentMethod  ?? "",
                tradeTerm:       printRecord.tradeTerm      ?? "",
                shippingFee:     parseFloat(printRecord.shippingFee ?? "0"),
                paymentAccount:  printRecord.receiptAccountName ?? "",
                paymentAccountId: printRecord.receiptAccountId ?? null,
                status:          printRecord.status         ?? "",
                totalAmount:     parseFloat(printRecord.totalAmount ?? "0"),
                items: printRecord.products.map(p => ({
                  productName:   p.name,
                  productCode:   p.code,
                  specification: p.spec,
                  quantity:      p.quantity,
                  unitPrice:     p.price,
                  amount:        p.amount ?? 0,
                })),
                notes:          printRecord.remark ?? "",
                salesPersonName: (printRecord.customerType === "overseas" || (printRecord.country && printRecord.country !== "中国"))
                  ? (printRecord.salesPersonEnglishName || printRecord.salesPersonName || "")
                  : (printRecord.salesPersonName || ""),
              }}
            />
            <DeliveryNotePrint
              open={printDeliveryOpen}
              onClose={() => setPrintDeliveryOpen(false)}
              order={{
                orderNumber:    printRecord.orderNo,
                deliveryDate:   formatDate(printRecord.deliveryDate),
                customerName:   printRecord.customerName  ?? "",
                customerType:   printRecord.customerType  ?? "",
                customerCountry: printRecord.country      ?? "",
                shippingAddress: printRecord.shippingAddress ?? "",
                shippingContact: printRecord.contactPerson  ?? "",
                shippingPhone:   printRecord.phone          ?? "",
                items: printRecord.products.map(p => ({
                  productName:   p.name,
                  productCode:   p.code,
                  specification: p.spec,
                  quantity:      p.quantity,
                  unit:          p.unit,
                })),
                notes: printRecord.remark ?? "",
              }}
            />
            <ReceiptPrint
              open={printReceiptOpen}
              onClose={() => setPrintReceiptOpen(false)}
              receipt={{
                receiptNumber: `RC-${printRecord.orderNo}`,
                receiptDate:   new Date().toISOString().split("T")[0],
                orderNumber:   printRecord.orderNo,
                customerName:  printRecord.customerName ?? "",
                customerType:  printRecord.customerType ?? "",
                customerCountry: printRecord.country ?? "",
                currency:      printRecord.currency ?? "CNY",
                paymentMethod: printRecord.paymentMethod ?? "",
                totalAmount:   parseFloat(printRecord.totalAmount ?? "0"),
                paidAmount:    parseFloat(printRecord.totalAmount ?? "0"),
                remainingAmount: 0,
                items: printRecord.products.map(p => ({
                  productName: p.name,
                  quantity:    p.quantity,
                  unitPrice:   p.price,
                  amount:      p.amount ?? 0,
                })),
                notes:   printRecord.remark ?? "",
                cashier: (printRecord.customerType === "overseas" || (printRecord.country && printRecord.country !== "中国"))
                  ? (printRecord.salesPersonEnglishName || printRecord.salesPersonName || "")
                  : (printRecord.salesPersonName || ""),
                paymentAccount: printRecord.receiptAccountName ?? "",
              }}
            />
          </>
        )}
      </div>
    </ERPLayout>
  );
}
