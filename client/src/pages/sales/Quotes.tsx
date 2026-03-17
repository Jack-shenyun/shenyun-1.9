import { formatDate, formatDateTime, formatDisplayNumber, roundToDigits } from "@/lib/formatters";
import { Fragment, isValidElement, useState, useEffect, useMemo, useRef, type ChangeEvent, type ReactNode } from "react";
import ERPLayout from "@/components/ERPLayout";
import ProductMultiSelect, { type SelectedProduct } from "@/components/ProductMultiSelect";
import CustomerSelect, { type Customer } from "@/components/CustomerSelect";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Download,
  Upload,
  Printer,
  Send,
  ArrowRightLeft,
  Archive,
  Calculator,
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
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { SalesOrderPrint } from "@/components/print";
import {
  PAYMENT_CONDITION_OPTIONS,
  normalizePaymentCondition,
} from "@shared/paymentTerms";
import { getStatusSemanticClass } from "@/lib/statusStyle";

type DbQuote = {
  id: number;
  quoteNo: string;
  customerId: number | null;
  customerName: string | null;
  customerCode: string | null;
  customerType?: string | null;
  country?: string | null;
  contactPerson: string | null;
  phone: string | null;
  quoteDate: Date | string | null;
  validUntil: Date | string | null;
  deliveryDate: Date | string | null;
  totalAmount: string | null;
  totalAmountBase?: string | null;
  currency: string | null;
  paymentMethod: string | null;
  exchangeRate: string | null;
  status: string | null;
  shippingAddress: string | null;
  shippingContact: string | null;
  shippingPhone: string | null;
  tradeTerm?: string | null;
  receiptAccountId?: number | null;
  receiptAccountName?: string | null;
  linkedOrderId?: number | null;
  remark: string | null;
  salesPersonId: number | null;
  salesPersonName?: string | null;
  salesPersonEnglishName?: string | null;
  createdBy: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  productTypeCount?: number | null;
};

interface SalesQuote extends DbQuote {
  products: QuoteSelectedProduct[];
}

type QuoteTierPrice = {
  minQty: number;
  unitPrice: number;
};

type QuoteSelectedProduct = SelectedProduct & {
  tierPrices?: QuoteTierPrice[];
  lineRemark?: string;
};

type PrintPayload = {
  orderNumber: string;
  orderDate: string;
  deliveryDate?: string;
  customerName: string;
  customerCode?: string;
  customerType?: string;
  customerCountry?: string;
  shippingAddress?: string;
  shippingContact?: string;
  shippingPhone?: string;
  paymentMethod?: string;
  status: string;
  totalAmount: number;
  currency?: string;
  items: Array<{
    productName: string;
    productCode?: string;
    specification?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  notes?: string;
  salesPersonName?: string;
  tradeTerm?: string;
  shippingFee?: number;
  paymentAccount?: string;
  paymentAccountId?: number | null;
};

const statusMap: Record<string, { label: string }> = {
  draft: { label: "草稿" },
  sent: { label: "已发送" },
  accepted: { label: "已接受" },
  rejected: { label: "已拒绝" },
  expired: { label: "已过期" },
  converted: { label: "已转订单" },
};

const QUOTE_STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "sent", label: "已发送" },
  { value: "accepted", label: "已接受" },
  { value: "rejected", label: "已拒绝" },
  { value: "expired", label: "已过期" },
  { value: "converted", label: "已转订单" },
] as const;

const TRADE_TERM_OPTIONS = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"] as const;
const CURRENCY_OPTIONS = ["CNY", "USD", "EUR", "JPY", "HKD"] as const;
const PREPAY_RATIO_MARKER = "[PREPAY_RATIO]";
const TIER_PRICE_MARKER = "[TIER_PRICE]";
const TAX_INCLUDED_MARKER = "[TAX_INCLUDED]";

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
    case "CNY":
    default:
      return "¥";
  }
}

function formatAmount(amount: string | number | null | undefined, currency?: string | null): string {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount ?? "0"));
  const safe = Number.isFinite(n) ? n : 0;
  return `${getCurrencySymbol(currency)}${formatDisplayNumber(safe)}`;
}

function toDisplayText(value: unknown, fallback = "-"): string {
  if (value == null || value === "") return fallback;
  if (value instanceof Date) return formatDateTime(value);
  return String(value);
}

function renderSafeNode(value: ReactNode | unknown, fallback = "-"): ReactNode {
  if (value == null || value === "") return fallback;
  if (value instanceof Date) return formatDateTime(value);
  if (Array.isArray(value)) {
    return value.map((item, index) => (
      <Fragment key={index}>{renderSafeNode(item, "")}</Fragment>
    ));
  }
  if (isValidElement(value)) return value;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function normalizeDateValue(value: unknown, includeTime = false): string | null {
  if (value == null || value === "") return null;
  const text = includeTime ? formatDateTime(value as any) : formatDate(value as any);
  return text === "-" ? null : text;
}

function normalizeQuoteItemRecord(item: any) {
  return {
    ...item,
    createdAt: normalizeDateValue(item?.createdAt, true),
  };
}

function normalizeTierPrices(value: unknown): QuoteTierPrice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      minQty: Number(item?.minQty || 0),
      unitPrice: Number(item?.unitPrice || 0),
    }))
    .filter((item) => Number.isFinite(item.minQty) && item.minQty > 0 && Number.isFinite(item.unitPrice) && item.unitPrice > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

function parseTierPricesFromRemark(remark: unknown): QuoteTierPrice[] {
  const text = String(remark ?? "");
  const markerLine = text
    .split("\n")
    .find((line) => line.startsWith(TIER_PRICE_MARKER));
  if (!markerLine) return [];
  try {
    return normalizeTierPrices(JSON.parse(markerLine.slice(TIER_PRICE_MARKER.length).trim()));
  } catch {
    return [];
  }
}

function stripTierPriceFromRemark(remark: unknown): string {
  return String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(TIER_PRICE_MARKER))
    .join("\n")
    .trim();
}

function buildItemRemarkWithTierPrices(plainRemark: string | undefined, tierPrices: QuoteTierPrice[]): string | undefined {
  const cleanedRemark = stripTierPriceFromRemark(plainRemark ?? "");
  const normalizedTiers = normalizeTierPrices(tierPrices);
  if (normalizedTiers.length === 0) {
    return cleanedRemark || undefined;
  }
  const marker = `${TIER_PRICE_MARKER}${JSON.stringify(normalizedTiers)}`;
  return cleanedRemark ? `${marker}\n${cleanedRemark}` : marker;
}

function getMatchedTierPrice(quantity: number, tierPrices: QuoteTierPrice[]): QuoteTierPrice | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const normalizedTiers = normalizeTierPrices(tierPrices);
  let matched: QuoteTierPrice | null = null;
  for (const tier of normalizedTiers) {
    if (quantity >= tier.minQty) {
      matched = tier;
    }
  }
  return matched;
}

function applyTierPriceToProduct(product: QuoteSelectedProduct): QuoteSelectedProduct {
  const matchedTier = getMatchedTierPrice(Number(product.quantity || 0), product.tierPrices || []);
  const price = matchedTier ? matchedTier.unitPrice : Number(product.price || 0);
  return {
    ...product,
    price,
    amount: Number(product.quantity || 0) * price * (1 - (Number(product.discount || 0)) / 100),
  };
}

function formatTierPricesText(tierPrices: QuoteTierPrice[], unit?: string | null, currency?: string | null): string {
  const normalizedTiers = normalizeTierPrices(tierPrices);
  if (normalizedTiers.length === 0) return "未设置阶梯价";
  return normalizedTiers
    .map((tier) => `满${tier.minQty}${unit || ""}：${formatAmount(tier.unitPrice, currency)}`)
    .join("；");
}

function renderTierPriceSummary(product: QuoteSelectedProduct, currency?: string | null): string {
  const tierText = formatTierPricesText(product.tierPrices || [], product.unit, currency);
  const matchedTier = getMatchedTierPrice(Number(product.quantity || 0), product.tierPrices || []);
  if (!matchedTier) return tierText;
  return `${tierText}；当前命中：满${matchedTier.minQty}${product.unit || ""}`;
}

function normalizeSelectedProduct(product: any): QuoteSelectedProduct {
  return {
    id: Number(product?.id || 0),
    code: String(product?.code || ""),
    name: String(product?.name || ""),
    spec: String(product?.spec || ""),
    unit: String(product?.unit || ""),
    price: Number(product?.price || 0),
    stock: Number(product?.stock || 0),
    quantity: Number(product?.quantity || 0),
    discount: Number(product?.discount || 0),
    amount: Number(product?.amount || 0),
    currency: product?.currency ? String(product.currency) : undefined,
    tierPrices: normalizeTierPrices(product?.tierPrices),
    lineRemark: product?.lineRemark ? String(product.lineRemark) : "",
  };
}

function normalizeQuoteRecord(record: any): SalesQuote | null {
  if (!record) return null;
  return {
    ...record,
    quoteNo: String(record.quoteNo || ""),
    customerName: record.customerName == null ? null : String(record.customerName),
    customerCode: record.customerCode == null ? null : String(record.customerCode),
    contactPerson: record.contactPerson == null ? null : String(record.contactPerson),
    phone: record.phone == null ? null : String(record.phone),
    quoteDate: normalizeDateValue(record.quoteDate, false),
    validUntil: normalizeDateValue(record.validUntil, false),
    deliveryDate: normalizeDateValue(record.deliveryDate, false),
    createdAt: normalizeDateValue(record.createdAt, true),
    updatedAt: normalizeDateValue(record.updatedAt, true),
    products: Array.isArray(record.products) ? record.products.map(normalizeSelectedProduct) : [],
  } as SalesQuote;
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

function parseTaxIncludedFromRemark(remark: unknown): boolean {
  const text = String(remark ?? "");
  const markerLine = text
    .split("\n")
    .find((line) => line.startsWith(TAX_INCLUDED_MARKER));
  if (!markerLine) return true;
  return markerLine.slice(TAX_INCLUDED_MARKER.length).trim() !== "0";
}

function stripTaxIncludedFromRemark(remark: unknown): string {
  return String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(TAX_INCLUDED_MARKER))
    .join("\n")
    .trim();
}

function stripQuoteMetaFromRemark(remark: unknown): string {
  return stripTaxIncludedFromRemark(stripPrepayRatioFromRemark(remark));
}

function buildQuoteRemark(plainRemark: string, paymentTerms: string, prepaymentRatio: string, taxIncluded: boolean): string {
  const cleanedRemark = stripQuoteMetaFromRemark(plainRemark);
  const markers = [`${TAX_INCLUDED_MARKER}${taxIncluded ? "1" : "0"}`];
  if (paymentTerms === "预付款") {
    markers.push(`${PREPAY_RATIO_MARKER}${String(prepaymentRatio || "30").trim() || "30"}`);
  }
  return [...markers, cleanedRemark].filter(Boolean).join("\n");
}

function normalizeCustomerText(value: unknown): string {
  return String(value ?? "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/[\s\-—_]/g, "")
    .trim()
    .toLowerCase();
}

function inferCustomerType(name: string, address: string): "hospital" | "dealer" | "domestic" | "overseas" {
  const text = `${name} ${address}`;
  if (/医院|卫生院|诊所|门诊/.test(text)) return "hospital";
  if (/经销|经销商|代理|渠道|distribution/i.test(text)) return "dealer";
  if (!/[\u4e00-\u9fa5]/.test(text) && /[A-Za-z]/.test(text)) return "overseas";
  return "domestic";
}

function extractCustomerCodePrefix(code: unknown): string {
  const match = String(code ?? "").trim().toUpperCase().match(/^([A-Z]+)-\d+$/);
  return match?.[1] || "";
}

function parseCustomerClipboard(raw: string) {
  const text = String(raw || "").replace(/\r/g, "\n").trim();
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const findByLabel = (patterns: RegExp[]) => {
    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match?.[1]) return match[1].trim();
      }
    }
    return "";
  };

  const phoneMatch = text.match(/((?:\+?86[-\s]?)?(?:1[3-9]\d{9}|0\d{2,3}[-\s]?\d{7,8}))/);
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  const name =
    findByLabel([/(?:客户名称|单位名称|公司名称|企业名称|名称)[:：]\s*(.+)$/i]) ||
    lines.find((line) => /公司|医院|贸易|医疗|器械|科技|药业|门诊|诊所/.test(line)) ||
    lines[0] ||
    "";

  const contactPerson =
    findByLabel([/(?:联系人|联系人员|收货人|负责人|对接人)[:：]\s*(.+)$/i]) ||
    "";

  const address =
    findByLabel([/(?:地址|收货地址|公司地址|单位地址)[:：]\s*(.+)$/i]) ||
    lines.find((line) => /省|市|区|县|镇|路|街|大道|号|室|栋|楼|China|Road|Street|Avenue|District|City/i.test(line)) ||
    "";

  return {
    raw: text,
    name: String(name || "").trim(),
    contactPerson: String(contactPerson || "").trim(),
    phone: phoneMatch?.[1]?.replace(/\s+/g, "") || "",
    email: emailMatch?.[0] || "",
    address: String(address || "").trim(),
  };
}

function normalizeQuoteStatus(status: unknown): string {
  const normalized = String(status ?? "").trim();
  const validStatuses = new Set<string>(QUOTE_STATUS_OPTIONS.map((item) => item.value));
  return validStatuses.has(normalized) ? normalized : "draft";
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

function mapQuoteItemsToSelectedProducts(items: any[]): QuoteSelectedProduct[] {
  return items.map((item: any) => {
    const product: QuoteSelectedProduct = {
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
      tierPrices: parseTierPricesFromRemark(item.remark),
      lineRemark: stripTierPriceFromRemark(item.remark),
    };
    return applyTierPriceToProduct(product);
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default function SalesQuotesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalesQuote | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPayload, setPrintPayload] = useState<PrintPayload | null>(null);
  const [calcProductId, setCalcProductId] = useState("");
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [tierPriceDialogOpen, setTierPriceDialogOpen] = useState(false);
  const [tierProductId, setTierProductId] = useState<number | null>(null);
  const [tierDrafts, setTierDrafts] = useState<QuoteTierPrice[]>([]);
  const [customerPasteText, setCustomerPasteText] = useState("");
  const [pendingRecognizedCustomerId, setPendingRecognizedCustomerId] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const { canDelete } = usePermission();
  const trpcUtils = trpc.useUtils();

  const [formData, setFormData] = useState({
    customerId: 0,
    customerCode: "",
    customerName: "",
    contactPerson: "",
    phone: "",
    quoteDate: new Date().toISOString().split("T")[0],
    validUntil: addDays(new Date(), 7).toISOString().split("T")[0],
    deliveryDate: "",
    shippingAddress: "",
    paymentTerms: "",
    prepaymentRatio: "30",
    taxIncluded: true,
    currency: "CNY",
    exchangeRate: "1",
    status: "draft",
    salesperson: "",
    remarks: "",
    tradeTerm: "",
    receiptAccountId: "",
    products: [] as QuoteSelectedProduct[],
  });

  const [tubeCalc, setTubeCalc] = useState({
    specText: "",
    innerDiameter: "",
    outerDiameter: "",
    length: "",
    density: "1.25",
    kgUnitPrice: "",
  });

  const { data: quotesData, isLoading, refetch } = trpc.salesQuotes.list.useQuery(
    {
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 2000,
    },
    { refetchOnWindowFocus: false }
  );
  const { data: nextQuoteNoData } = trpc.salesQuotes.nextQuoteNo.useQuery(undefined, {
    enabled: formDialogOpen && !isEditing,
    refetchOnWindowFocus: false,
  });
  const { data: quoteDetail } = trpc.salesQuotes.getById.useQuery(
    { id: selectedRecord?.id ?? 0 },
    { enabled: !!selectedRecord?.id && viewDialogOpen }
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

  const quotes = useMemo(
    () => ((quotesData ?? []) as any[])
      .map((quote: any) => normalizeQuoteRecord({ ...quote, products: [] }))
      .filter(Boolean) as SalesQuote[],
    [quotesData]
  );
  const { data: quoteItemsRows = [] } = trpc.salesQuotes.getItemsByQuoteIds.useQuery(
    { quoteIds: quotes.map((quote: any) => Number(quote?.id)).filter((id) => Number.isFinite(id) && id > 0) },
    {
      enabled: quotes.length > 0,
      refetchOnWindowFocus: false,
    }
  );
  const normalizedQuoteItemsRows = useMemo(
    () => ((quoteItemsRows as any[]) ?? []).map((row: any) => normalizeQuoteItemRecord(row)),
    [quoteItemsRows]
  );

  const updateCustomerMutation = trpc.customers.update.useMutation();
  const createCustomerMutation = trpc.customers.create.useMutation();
  const createMutation = trpc.salesQuotes.create.useMutation({
    onSuccess: async () => {
      if (pendingRecognizedCustomerId) {
        try {
          await updateCustomerMutation.mutateAsync({
            id: pendingRecognizedCustomerId,
            data: { status: "active" },
          });
          await trpcUtils.customers.list.invalidate();
        } catch {}
        setPendingRecognizedCustomerId(null);
      }
      toast.success("报价单已保存");
      setFormDialogOpen(false);
      refetch();
    },
    onError: (e) => toast.error("创建失败：" + e.message),
  });
  const importCreateMutation = trpc.salesQuotes.create.useMutation();
  const updateMutation = trpc.salesQuotes.update.useMutation({
    onSuccess: async () => {
      if (pendingRecognizedCustomerId) {
        try {
          await updateCustomerMutation.mutateAsync({
            id: pendingRecognizedCustomerId,
            data: { status: "active" },
          });
          await trpcUtils.customers.list.invalidate();
        } catch {}
        setPendingRecognizedCustomerId(null);
      }
      toast.success("报价单已更新");
      setFormDialogOpen(false);
      refetch();
    },
    onError: (e) => toast.error("更新失败：" + e.message),
  });
  const deleteMutation = trpc.salesQuotes.delete.useMutation({
    onSuccess: () => {
      toast.success("报价单已删除");
      refetch();
    },
    onError: (e) => toast.error("删除失败：" + e.message),
  });
  const convertMutation = trpc.salesQuotes.convertToOrder.useMutation({
    onSuccess: async (result) => {
      await refetch();
      toast.success(result.reused ? "已打开已有销售订单" : "报价单已转为销售订单");
      if (window.confirm(`销售订单号：${result.orderNo || result.orderId}\n是否立即打开订单页面？`)) {
        window.location.href = `/sales/orders?id=${result.orderId}`;
      }
    },
    onError: (e) => toast.error("转订单失败：" + e.message),
  });
  const updateStatusMutation = trpc.salesQuotes.update.useMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      setViewDialogOpen(false);
      refetch();
    },
    onError: (e) => toast.error("更新失败：" + e.message),
  });

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

  const resolveFinanceExchangeRate = (currencyRaw: unknown): string => {
    const currency = String(currencyRaw || "CNY").toUpperCase();
    if (currency === "CNY") return "1";
    const rate = latestRateMap.get(currency);
    return Number.isFinite(rate) && (rate as number) > 0 ? String(rate) : "";
  };

  const quoteItemMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const row of normalizedQuoteItemsRows as any[]) {
      const quoteId = Number(row?.quoteId || 0);
      if (!quoteId) continue;
      const current = map.get(quoteId) || [];
      current.push(row);
      map.set(quoteId, current);
    }
    return map;
  }, [normalizedQuoteItemsRows]);

  const customerCodePrefixMap = useMemo(() => {
    const prefixCounter = new Map<string, Map<string, number>>();
    for (const customer of customersForImport as any[]) {
      const customerType = String(customer?.type || "").trim();
      const prefix = extractCustomerCodePrefix(customer?.code);
      if (!customerType || !prefix) continue;
      const current = prefixCounter.get(customerType) || new Map<string, number>();
      current.set(prefix, (current.get(prefix) || 0) + 1);
      prefixCounter.set(customerType, current);
    }

    const pickPrefix = (customerType: "hospital" | "dealer" | "domestic" | "overseas", fallback: string) => {
      const current = prefixCounter.get(customerType);
      if (!current || current.size === 0) return fallback;
      return Array.from(current.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || fallback;
    };

    return {
      hospital: pickPrefix("hospital", "KH"),
      dealer: pickPrefix("dealer", "DLT"),
      domestic: pickPrefix("domestic", "KH"),
      overseas: pickPrefix("overseas", "KH"),
    };
  }, [customersForImport]);

  const getQuoteAmountInCny = (record: any): number => {
    const amount = parseFloat(record?.totalAmount ?? "0");
    if (!Number.isFinite(amount)) return 0;
    const currency = String(record?.currency || "CNY").toUpperCase();
    if (currency === "CNY") return amount;
    const latestRate = latestRateMap.get(currency);
    if (Number.isFinite(latestRate) && (latestRate as number) > 0) {
      return amount * (latestRate as number);
    }
    const orderRate = parseFloat(String(record?.exchangeRate ?? "0"));
    if (Number.isFinite(orderRate) && orderRate > 0) return amount * orderRate;
    return amount;
  };

  const stats = {
    total: quotes.length,
    totalAmount: quotes.reduce((sum: number, record: any) => sum + getQuoteAmountInCny(record), 0),
    sent: quotes.filter((record: any) => String(record.status) === "sent").length,
    accepted: quotes.filter((record: any) => String(record.status) === "accepted").length,
    converted: quotes.filter((record: any) => String(record.status) === "converted").length,
  };

  const tubeCalcResult = useMemo(() => {
    const innerDiameter = parseFloat(tubeCalc.innerDiameter) || 0;
    const outerDiameter = parseFloat(tubeCalc.outerDiameter) || 0;
    const length = parseFloat(tubeCalc.length) || 0;
    const density = parseFloat(tubeCalc.density) || 0;
    const kgUnitPrice = parseFloat(tubeCalc.kgUnitPrice) || 0;

    if (!innerDiameter || !outerDiameter || !length || !density || outerDiameter <= innerDiameter) {
      return {
        pieceWeight: 0,
        pieceCountFrom1000g: 0,
        pieceUnitPrice: 0,
        valid: false,
      };
    }

    const volumeMm3 = (Math.PI / 4) * (outerDiameter ** 2 - innerDiameter ** 2) * length;
    const pieceWeight = (volumeMm3 * density) / 1000;
    const pieceCountFrom1000g = pieceWeight > 0 ? 1000 / pieceWeight : 0;
    const pieceUnitPrice = kgUnitPrice > 0 ? (pieceWeight / 1000) * kgUnitPrice : 0;

    return {
      pieceWeight,
      pieceCountFrom1000g,
      pieceUnitPrice,
      valid: true,
    };
  }, [tubeCalc]);

  const parseTubeSpec = (value: string) => {
    const normalized = value
      .replace(/[×xX＊]/g, "*")
      .replace(/\s+/g, "")
      .replace(/mm/gi, "");
    const parts = normalized
      .split("*")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      setTubeCalc((prev) => ({
        ...prev,
        specText: value,
        innerDiameter: parts[0] || "",
        outerDiameter: parts[1] || "",
        length: parts[2] || "",
      }));
      return true;
    }
    setTubeCalc((prev) => ({ ...prev, specText: value }));
    return false;
  };

  useEffect(() => {
    if (!formDialogOpen) return;
    setFormData((prev) => {
      const nextRate = resolveFinanceExchangeRate(prev.currency);
      return prev.exchangeRate === nextRate || !nextRate ? prev : { ...prev, exchangeRate: nextRate };
    });
  }, [formDialogOpen, formData.currency, latestRateMap]);

  useEffect(() => {
    if (!formDialogOpen) return;
    const matchedProduct = formData.products.find((product) => String(product.id) === String(calcProductId));
    if (!matchedProduct?.spec) return;
    parseTubeSpec(String(matchedProduct.spec));
  }, [calcProductId, formDialogOpen, formData.products]);

  const handleCustomerSelect = (customer: Customer) => {
    setPendingRecognizedCustomerId(null);
    setSelectedCustomer({
      ...customer,
      createdAt: null as any,
      updatedAt: null as any,
    });
    const paymentTerms = normalizePaymentCondition(customer.paymentTerms || "");
    const currency = customer.currency || "CNY";
    setFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      customerCode: customer.code,
      customerName: customer.name,
      contactPerson: customer.contactPerson || "",
      phone: customer.phone || "",
      shippingAddress: customer.address || "",
      paymentTerms: paymentTerms || prev.paymentTerms,
      currency,
      exchangeRate: resolveFinanceExchangeRate(currency) || prev.exchangeRate,
      salesperson: customer.salesPersonName || prev.salesperson || user?.name || "",
    }));
  };

  const handleRecognizeCustomerInfo = async () => {
    const parsed = parseCustomerClipboard(customerPasteText);
    if (!parsed.name && !parsed.phone && !parsed.address) {
      toast.error("未识别到客户信息");
      return;
    }

    const nameKey = normalizeCustomerText(parsed.name);
    const phoneKey = parsed.phone.replace(/\D/g, "");
    const matchedCustomer = (customersForImport as any[]).find((customer: any) => {
      const customerNameKey = normalizeCustomerText(customer?.name);
      const shortNameKey = normalizeCustomerText(customer?.shortName);
      const customerPhoneKey = String(customer?.phone || "").replace(/\D/g, "");
      return (!!nameKey && (customerNameKey === nameKey || shortNameKey === nameKey))
        || (!!phoneKey && customerPhoneKey && customerPhoneKey === phoneKey);
    });

    if (matchedCustomer) {
      setPendingRecognizedCustomerId(null);
      handleCustomerSelect(matchedCustomer as Customer);
      setFormData((prev) => ({
        ...prev,
        customerName: parsed.name || matchedCustomer.name || prev.customerName,
        contactPerson: parsed.contactPerson || matchedCustomer.contactPerson || prev.contactPerson,
        phone: parsed.phone || matchedCustomer.phone || prev.phone,
        shippingAddress: parsed.address || matchedCustomer.address || prev.shippingAddress,
      }));
      toast.success("已识别并匹配现有客户");
      return;
    }

    if (!parsed.name) {
      toast.error("未识别到客户名称，无法自动建档");
      return;
    }

    try {
      const customerType = inferCustomerType(parsed.name, parsed.address);
      const codePrefix = customerCodePrefixMap[customerType] || "KH";
      let customerId = 0;
      let customerCode = "";
      let lastCreateError: any = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await trpcUtils.customers.nextCode.invalidate();
        const nextCodeResult = await trpcUtils.customers.nextCode.fetch({ prefix: codePrefix });
        customerCode = String((nextCodeResult as any)?.code || "");
        if (!customerCode) {
          throw new Error("客户编码生成失败");
        }
        try {
          customerId = Number(await createCustomerMutation.mutateAsync({
            code: customerCode,
            name: parsed.name,
            shortName: parsed.name,
            type: customerType,
            contactPerson: parsed.contactPerson || undefined,
            phone: parsed.phone || undefined,
            email: parsed.email || undefined,
            address: parsed.address || undefined,
            country: customerType === "overseas" ? "海外" : "中国",
            paymentTerms: formData.paymentTerms || undefined,
            currency: customerType === "overseas" ? "USD" : "CNY",
            salesPersonId: user?.id,
            status: "inactive",
            source: "报价识别",
          }));
          break;
        } catch (error: any) {
          lastCreateError = error;
          const message = String(error?.message || "");
          if (!/duplicate|unique|重复|Duplicate entry/i.test(message)) {
            throw error;
          }
        }
      }

      if (!customerId) {
        throw lastCreateError || new Error("客户识别建档失败");
      }

      const createdCustomer: Customer = {
        id: Number(customerId),
        code: customerCode,
        name: parsed.name,
        shortName: parsed.name,
        type: customerType,
        contactPerson: parsed.contactPerson || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        province: null,
        city: null,
        country: customerType === "overseas" ? "海外" : "中国",
        status: "inactive",
        creditLimit: null,
        paymentTerms: formData.paymentTerms || null,
        currency: customerType === "overseas" ? "USD" : "CNY",
        taxNo: null,
        bankAccount: null,
        bankName: null,
        source: "报价识别",
        needInvoice: false,
        salesPersonId: user?.id || null,
        salesPersonName: user?.name || null,
        createdBy: null,
        createdAt: null as any,
        updatedAt: null as any,
      };

      setPendingRecognizedCustomerId(Number(customerId));
      handleCustomerSelect(createdCustomer);
      setFormData((prev) => ({
        ...prev,
        customerId: Number(customerId),
        customerCode: customerCode,
        customerName: parsed.name,
        contactPerson: parsed.contactPerson || prev.contactPerson,
        phone: parsed.phone || prev.phone,
        shippingAddress: parsed.address || prev.shippingAddress,
      }));
      await trpcUtils.customers.list.invalidate();
      toast.success("已识别并新建客户，报价保存成功后会自动转为正常");
    } catch (error: any) {
      toast.error(error?.message || "客户识别建档失败");
    }
  };

  const handleProductsChange = async (products: SelectedProduct[]) => {
    const mergedProducts = products.map((product) => {
      const existingProduct = formData.products.find((item) => item.id === product.id);
      return applyTierPriceToProduct({
        ...product,
        tierPrices: existingProduct?.tierPrices || [],
        lineRemark: existingProduct?.lineRemark || "",
      });
    });

    setFormData((prev) => ({ ...prev, products: mergedProducts }));
    if (!calcProductId && products.length > 0) {
      setCalcProductId(String(products[0].id));
    }
    if (formData.customerId <= 0) return;
    const newProducts = mergedProducts.filter((product) => product.price === 0 && (product.tierPrices?.length || 0) === 0);
    if (newProducts.length === 0) return;

    try {
      const lastPrices = await trpcUtils.salesQuotes.getLastPrices.fetch({
        customerId: formData.customerId,
        productIds: newProducts.map((product) => product.id),
      });
      if (lastPrices.length > 0) {
        const priceMap = new Map(lastPrices.map((item) => [item.productId, item]));
        const updatedProducts = mergedProducts.map((product) => {
          const lastPrice = priceMap.get(product.id);
          if (lastPrice && product.price === 0) {
            const price = parseFloat(lastPrice.unitPrice);
            return {
              ...product,
              price,
              amount: product.quantity * price * (1 - (product.discount || 0) / 100),
              currency: lastPrice.currency,
            };
          }
          return product;
        });
        setFormData((prev) => ({ ...prev, products: updatedProducts }));
        toast.info("已自动带入上次成交价格");
      }
    } catch {
      // ignore
    }
  };

  const handleApplyCalcQuantity = () => {
    if (!tubeCalcResult.valid || !calcProductId) {
      toast.error("请先完成换算参数");
      return;
    }
    const targetProductId = Number(calcProductId);
    const quantity = roundToDigits(tubeCalcResult.pieceCountFrom1000g, 2);
    const autoUnitPrice = tubeCalcResult.pieceUnitPrice > 0
      ? roundToDigits(tubeCalcResult.pieceUnitPrice, 4)
      : 0;
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((product) => (
        product.id === targetProductId
          ? {
              ...product,
              quantity,
              price: autoUnitPrice > 0 ? autoUnitPrice : Number(product.price || 0),
              amount: quantity
                * (autoUnitPrice > 0 ? autoUnitPrice : Number(product.price || 0))
                * (1 - (Number(product.discount || 0)) / 100),
            }
          : product
      )),
    }));
    toast.success(autoUnitPrice > 0 ? "已将换算数量和单价回填到当前产品" : "已将换算数量回填到当前产品");
  };

  const handleOpenTierPriceDialog = (productId: number) => {
    const product = formData.products.find((item) => item.id === productId);
    if (!product) return;
    setTierProductId(productId);
    setTierDrafts(
      product.tierPrices && product.tierPrices.length > 0
        ? normalizeTierPrices(product.tierPrices)
        : [{ minQty: 1, unitPrice: Number(product.price || 0) }]
    );
    setTierPriceDialogOpen(true);
  };

  const handleTierDraftChange = (index: number, key: keyof QuoteTierPrice, value: string) => {
    setTierDrafts((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, [key]: Number(value || 0) }
        : item
    )));
  };

  const handleAddTierDraft = () => {
    const lastTier = tierDrafts[tierDrafts.length - 1];
    setTierDrafts((prev) => [
      ...prev,
      {
        minQty: Math.max(1, Number(lastTier?.minQty || prev.length + 1) + 1),
        unitPrice: Number(lastTier?.unitPrice || 0),
      },
    ]);
  };

  const handleRemoveTierDraft = (index: number) => {
    setTierDrafts((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveTierPrices = () => {
    if (!tierProductId) return;
    const normalizedTiers = normalizeTierPrices(tierDrafts);
    if (normalizedTiers.length === 0) {
      toast.error("请至少填写一档有效阶梯价");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((product) => (
        product.id === tierProductId
          ? applyTierPriceToProduct({ ...product, tierPrices: normalizedTiers })
          : product
      )),
    }));
    setTierPriceDialogOpen(false);
    toast.success("阶梯价已更新");
  };

  const handleClearTierPrices = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((product) => (
        product.id === productId
          ? {
              ...product,
              tierPrices: [],
              amount: Number(product.quantity || 0) * Number(product.price || 0) * (1 - (Number(product.discount || 0)) / 100),
            }
          : product
      )),
    }));
    toast.success("已清空阶梯价");
  };

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    setSelectedCustomer(null);
    setCalcProductId("");
    setCalcDialogOpen(false);
    setTubeCalc({
      specText: "",
      innerDiameter: "",
      outerDiameter: "",
      length: "",
      density: "1.25",
      kgUnitPrice: "",
    });
    setCustomerPasteText("");
    setPendingRecognizedCustomerId(null);
    setFormData({
      customerId: 0,
      customerCode: "",
      customerName: "",
      contactPerson: "",
      phone: "",
      quoteDate: new Date().toISOString().split("T")[0],
      validUntil: addDays(new Date(), 7).toISOString().split("T")[0],
      deliveryDate: "",
      shippingAddress: "",
      paymentTerms: "",
      prepaymentRatio: "30",
      taxIncluded: true,
      currency: "CNY",
      exchangeRate: "1",
      status: "draft",
      salesperson: user?.name ?? "",
      remarks: "",
      tradeTerm: "",
      receiptAccountId: "",
      products: [],
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: SalesQuote) => {
    const openEditWithProducts = async () => {
      setIsEditing(true);
      setSelectedRecord(record);

      let products = record.products;
      let detailQuote: Partial<SalesQuote> = normalizeQuoteRecord(record) || record;
      try {
        const detail = await trpcUtils.salesQuotes.getById.fetch({ id: record.id });
        detailQuote = (normalizeQuoteRecord(detail?.quote ?? record) ?? record) as Partial<SalesQuote>;
        products = mapQuoteItemsToSelectedProducts((detail?.items ?? []).map((item: any) => normalizeQuoteItemRecord(item)));
      } catch {
        toast.warning("报价明细加载失败，已使用当前数据");
      }

      const customer: Customer = {
        id: detailQuote.customerId ?? 0,
        code: detailQuote.customerCode ?? "",
        name: detailQuote.customerName ?? "",
        shortName: null,
        type: "hospital",
        contactPerson: detailQuote.contactPerson ?? null,
        phone: detailQuote.phone ?? null,
        email: null,
        address: detailQuote.shippingAddress ?? null,
        province: null,
        city: null,
        country: detailQuote.country ?? null,
        status: "active",
        creditLimit: null,
        paymentTerms: normalizePaymentCondition(detailQuote.paymentMethod) || null,
        currency: detailQuote.currency ?? "CNY",
        taxNo: null,
        bankAccount: null,
        bankName: null,
        source: null,
        needInvoice: false,
        salesPersonId: detailQuote.salesPersonId ?? null,
        salesPersonName: detailQuote.salesPersonName ?? null,
        createdBy: null,
        createdAt: null as any,
        updatedAt: null as any,
      };

      setSelectedCustomer(customer);
      setCustomerPasteText("");
      setCalcProductId(products.length > 0 ? String(products[0].id) : "");
      setCalcDialogOpen(false);
      setTubeCalc({
        specText: "",
        innerDiameter: "",
        outerDiameter: "",
        length: "",
        density: "1.25",
        kgUnitPrice: "",
      });
      setPendingRecognizedCustomerId(null);
      setFormData({
        customerId: detailQuote.customerId ?? 0,
        customerCode: detailQuote.customerCode ?? "",
        customerName: detailQuote.customerName ?? "",
        contactPerson: detailQuote.shippingContact ?? detailQuote.contactPerson ?? "",
        phone: detailQuote.shippingPhone ?? detailQuote.phone ?? "",
        quoteDate: toInputDate(detailQuote.quoteDate),
        validUntil: toInputDate(detailQuote.validUntil),
        deliveryDate: toInputDate(detailQuote.deliveryDate),
        shippingAddress: detailQuote.shippingAddress ?? "",
        paymentTerms: normalizePaymentCondition(detailQuote.paymentMethod) || "",
        prepaymentRatio: parsePrepayRatioFromRemark(detailQuote.remark),
        taxIncluded: parseTaxIncludedFromRemark(detailQuote.remark),
        currency: detailQuote.currency ?? "CNY",
        exchangeRate: (detailQuote as any).exchangeRate ?? "1",
        status: normalizeQuoteStatus(detailQuote.status),
        salesperson: String(detailQuote.salesPersonName ?? user?.name ?? ""),
        remarks: stripQuoteMetaFromRemark(detailQuote.remark ?? ""),
        tradeTerm: detailQuote.tradeTerm ?? "",
        receiptAccountId: detailQuote.receiptAccountId ? String(detailQuote.receiptAccountId) : "",
        products,
      });
      setFormDialogOpen(true);
    };
    void openEditWithProducts();
  };

  const handleView = (record: SalesQuote) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: SalesQuote) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    if (!confirm(`确认删除报价单 ${record.quoteNo}？`)) return;
    deleteMutation.mutate({ id: record.id });
  };

  const handleStatusChange = (record: SalesQuote, status: string) => {
    updateStatusMutation.mutate({
      id: record.id,
      data: { status: status as any },
    });
  };

  const handleConvertToOrder = (record: SalesQuote) => {
    if (String(record.status) === "rejected" || String(record.status) === "expired") {
      toast.error("当前报价状态不能转订单");
      return;
    }
    convertMutation.mutate({ id: record.id });
  };

  const buildQuoteData = () => {
    const totalAmount = formData.products.reduce(
      (sum, product) => sum + product.quantity * product.price * (1 - (product.discount || 0) / 100),
      0
    );
    const items = formData.products.map((product) => ({
      productId: product.id,
      quantity: String(product.quantity),
      unit: product.unit,
      unitPrice: String(product.price),
      amount: String(product.quantity * product.price * (1 - (product.discount || 0) / 100)),
      remark: buildItemRemarkWithTierPrices(product.lineRemark, product.tierPrices || []),
    }));
    return { totalAmount, items };
  };

  const submitQuote = (statusOverride?: string) => {
    const missingFields: string[] = [];
    if (!formData.customerId) missingFields.push("客户");
    if (formData.products.length === 0) missingFields.push("报价产品");
    if (!formData.quoteDate) missingFields.push("报价日期");
    if (!formData.validUntil) missingFields.push("有效期");
    if (!formData.paymentTerms) missingFields.push("付款条件");

    const hasInvalidPrice = formData.products.some((product) => !Number.isFinite(product.price) || product.price <= 0);
    const hasInvalidQty = formData.products.some((product) => !Number.isFinite(product.quantity) || product.quantity <= 0);
    if (hasInvalidPrice) missingFields.push("单价");
    if (hasInvalidQty) missingFields.push("数量");

    if (missingFields.length > 0) {
      toast.error("保存失败，请填写必填项", {
        description: Array.from(new Set(missingFields)).join("、"),
      });
      return;
    }

    const { totalAmount, items } = buildQuoteData();
    const exchangeRate = formData.exchangeRate || resolveFinanceExchangeRate(formData.currency) || "1";
    if (formData.currency !== "CNY" && (!exchangeRate || Number(exchangeRate) <= 0)) {
      toast.error("当前货币未配置财务汇率");
      return;
    }
    const totalAmountBase = String(totalAmount * parseFloat(exchangeRate));
    const nextStatus = statusOverride || formData.status || "draft";
    const mergedRemark = buildQuoteRemark(formData.remarks, formData.paymentTerms, formData.prepaymentRatio, formData.taxIncluded);

    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          customerId: formData.customerId,
          quoteDate: formData.quoteDate,
          validUntil: formData.validUntil || undefined,
          deliveryDate: formData.deliveryDate || undefined,
          totalAmount: String(totalAmount),
          currency: formData.currency,
          paymentMethod: formData.paymentTerms,
          exchangeRate,
          totalAmountBase,
          status: nextStatus as any,
          shippingAddress: formData.shippingAddress || undefined,
          shippingContact: formData.contactPerson || undefined,
          shippingPhone: formData.phone || undefined,
          tradeTerm: formData.tradeTerm || undefined,
          receiptAccountId: formData.receiptAccountId ? Number(formData.receiptAccountId) : null,
          remark: mergedRemark || undefined,
          salesPersonId: selectedCustomer?.salesPersonId ?? selectedRecord.salesPersonId ?? user?.id,
          items,
        },
      });
      return;
    }

    createMutation.mutate({
      quoteNo: nextQuoteNoData ?? `Q${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`,
      customerId: formData.customerId,
      quoteDate: formData.quoteDate,
      validUntil: formData.validUntil || undefined,
      deliveryDate: formData.deliveryDate || undefined,
      totalAmount: String(totalAmount),
      currency: formData.currency,
      paymentMethod: formData.paymentTerms,
      exchangeRate,
      totalAmountBase,
      status: nextStatus as any,
      shippingAddress: formData.shippingAddress || undefined,
      shippingContact: formData.contactPerson || undefined,
      shippingPhone: formData.phone || undefined,
      tradeTerm: formData.tradeTerm || undefined,
      receiptAccountId: formData.receiptAccountId ? Number(formData.receiptAccountId) : null,
      remark: mergedRemark || undefined,
      salesPersonId: selectedCustomer?.salesPersonId ?? user?.id,
      items,
    });
  };

  const handleSaveDraft = () => submitQuote("draft");
  const handleSubmit = () => submitQuote(formData.status === "draft" ? "sent" : formData.status);

  const buildPrintPayload = async (record: SalesQuote): Promise<PrintPayload | null> => {
    try {
      const detail = await trpcUtils.salesQuotes.getById.fetch({ id: record.id });
      const quote = (normalizeQuoteRecord(detail?.quote || record) || record) as any;
      const items = ((detail?.items || []) as any[]).map((rawItem: any) => {
        const item = normalizeQuoteItemRecord(rawItem);
        return {
        productName: item.productName || "",
        productCode: item.productCode || "",
        specification: item.specification || "",
        quantity: parseFloat(String(item.quantity || "0")),
        unitPrice: parseFloat(String(item.unitPrice || "0")),
        amount: parseFloat(String(item.amount || "0")),
        };
      });
      return {
        orderNumber: quote.quoteNo,
        orderDate: toInputDate(quote.quoteDate),
        deliveryDate: toInputDate(quote.deliveryDate),
        customerName: quote.customerName || "",
        customerCode: quote.customerCode || "",
        customerType: quote.customerType || "",
        customerCountry: quote.country || "",
        shippingAddress: quote.shippingAddress || "",
        shippingContact: quote.shippingContact || quote.contactPerson || "",
        shippingPhone: quote.shippingPhone || quote.phone || "",
        paymentMethod: quote.paymentMethod || "",
        status: quote.status || "draft",
        totalAmount: parseFloat(String(quote.totalAmount || "0")),
        currency: quote.currency || "CNY",
        items,
        notes: [
          `报价口径：${parseTaxIncludedFromRemark(quote.remark) ? "含税" : "未税"}`,
          stripQuoteMetaFromRemark(quote.remark || ""),
        ].filter(Boolean).join("\n"),
        salesPersonName: quote.salesPersonName || "",
        tradeTerm: quote.tradeTerm || "",
        shippingFee: 0,
        paymentAccount: quote.receiptAccountName || "",
        paymentAccountId: quote.receiptAccountId ?? null,
      };
    } catch (error: any) {
      toast.error(error?.message || "打印数据加载失败");
      return null;
    }
  };

  const handlePrint = (record: SalesQuote) => {
    void (async () => {
      const payload = await buildPrintPayload(record);
      if (!payload) return;
      setPrintPayload(payload);
      setPrintOpen(true);
    })();
  };

  const handleExportQuotes = () => {
    if (quotes.length === 0) {
      toast.warning("暂无可导出数据");
      return;
    }

    const accountNameMap = new Map(
      (bankAccounts as any[]).map((account: any) => [
        Number(account.id),
        account.accountName || account.bankName || `账户${account.id}`,
      ])
    );
    const rows = quotes.flatMap((quote: any) => {
      const items = quoteItemMap.get(Number(quote.id)) || [];
      const quoteRows = items.length > 0 ? items : [{}];
      return quoteRows.map((item: any) => [
        quote.quoteNo || "",
        quote.customerCode || "",
        quote.customerName || "",
        formatDate(quote.quoteDate) === "-" ? "" : formatDate(quote.quoteDate),
        formatDate(quote.validUntil) === "-" ? "" : formatDate(quote.validUntil),
        formatDate(quote.deliveryDate) === "-" ? "" : formatDate(quote.deliveryDate),
        normalizePaymentCondition(quote.paymentMethod) || "",
        parseTaxIncludedFromRemark(quote.remark) ? "含税" : "未税",
        normalizePaymentCondition(quote.paymentMethod) === "预付款" ? parsePrepayRatioFromRemark(quote.remark) : "",
        quote.currency || "CNY",
        quote.exchangeRate || resolveFinanceExchangeRate(quote.currency || "CNY") || "",
        statusMap[String(quote.status || "")]?.label || quote.status || "",
        quote.shippingAddress || "",
        quote.shippingContact || quote.contactPerson || "",
        quote.shippingPhone || quote.phone || "",
        quote.tradeTerm || "",
        quote.receiptAccountId ? (accountNameMap.get(Number(quote.receiptAccountId)) || "") : "",
        quote.salesPersonName || "",
        quote.linkedOrderId || "",
        item.productCode || "",
        item.productName || "",
        item.specification || "",
        item.unit || "",
        item.quantity || "",
        item.unitPrice || "",
        item.amount || "",
        stripTierPriceFromRemark(item.remark) || "",
        stripQuoteMetaFromRemark(quote.remark) || "",
      ].map(escapeCsvCell).join(","));
    });

    const headers = [
      "报价单号",
      "客户编码",
      "客户名称",
      "报价日期",
      "有效期至",
      "预计交期",
      "付款条件",
      "税价类型",
      "预付款比例",
      "币种",
      "汇率",
      "报价状态",
      "收货地址",
      "联系人",
      "联系电话",
      "贸易条款",
      "收款账户",
      "销售负责人",
      "已转订单ID",
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
    a.download = `销售报价单_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("销售报价单已导出");
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportQuotes = async (event: ChangeEvent<HTMLInputElement>) => {
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
        已发送: "sent",
        已接受: "accepted",
        已拒绝: "rejected",
        已过期: "expired",
        已转订单: "converted",
        draft: "draft",
        sent: "sent",
        accepted: "accepted",
        rejected: "rejected",
        expired: "expired",
        converted: "converted",
      };

      const groupedQuotes = new Map<string, any>();
      let generatedQuoteIndex = 1;

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
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          throw new Error(`第${i + 1}行: 单价必须大于 0`);
        }

        const amount = Number(readCol(row, "金额") || quantity * unitPrice);
        const quoteNo = readCol(row, "报价单号") || `IMP-Q-${Date.now()}-${String(generatedQuoteIndex++).padStart(3, "0")}`;
        const paymentTerms = normalizePaymentCondition(readCol(row, "付款条件") || String(customer.paymentTerms || "") || "先款后货");
        const taxIncluded = readCol(row, "税价类型") !== "未税";
        const remark = buildQuoteRemark(
          readCol(row, "整单备注"),
          paymentTerms,
          readCol(row, "预付款比例") || "30",
          taxIncluded
        );
        const receiptAccount = accountByName.get(readCol(row, "收款账户"));
        const currency = readCol(row, "币种") || "CNY";
        const exchangeRate = readCol(row, "汇率") || resolveFinanceExchangeRate(currency) || "1";

        const linkedOrderRaw = readCol(row, "已转订单ID");
        const linkedOrderId = linkedOrderRaw ? Number(linkedOrderRaw) : null;

        if (!groupedQuotes.has(quoteNo)) {
          groupedQuotes.set(quoteNo, {
            quoteNo,
            customerId: Number(customer.id),
            quoteDate: readCol(row, "报价日期") || new Date().toISOString().split("T")[0],
            validUntil: readCol(row, "有效期至") || addDays(new Date(), 7).toISOString().split("T")[0],
            deliveryDate: readCol(row, "预计交期") || undefined,
            currency,
            paymentMethod: paymentTerms,
            exchangeRate,
            status: (statusReverseMap[readCol(row, "报价状态")] || "draft") as any,
            shippingAddress: readCol(row, "收货地址") || customer.address || undefined,
            shippingContact: readCol(row, "联系人") || customer.contactPerson || undefined,
            shippingPhone: readCol(row, "联系电话") || customer.phone || undefined,
            tradeTerm: readCol(row, "贸易条款") || undefined,
            receiptAccountId: receiptAccount ? Number(receiptAccount.id) : null,
            remark,
            salesPersonId: customer.salesPersonId || user?.id || undefined,
            linkedOrderId: Number.isFinite(linkedOrderId) && (linkedOrderId as number) > 0 ? linkedOrderId : null,
            items: [],
          });
        }

        groupedQuotes.get(quoteNo).items.push({
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
      for (const quote of Array.from(groupedQuotes.values())) {
        try {
          const totalAmount = quote.items.reduce(
            (sum: number, item: any) => sum + Number(item.amount || 0),
            0
          );
          const totalAmountBase = String(totalAmount * Number(quote.exchangeRate || 1));
          await importCreateMutation.mutateAsync({
            ...quote,
            totalAmount: String(totalAmount),
            totalAmountBase,
          });
          success += 1;
        } catch (error: any) {
          errors.push(`${quote.quoteNo}: ${error?.message || "导入失败"}`);
        }
      }

      await refetch();
      if (success > 0) {
        toast.success(`导入成功 ${success} 笔报价单`);
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

  const detailQuote = useMemo(
    () => normalizeQuoteRecord(quoteDetail?.quote || selectedRecord),
    [quoteDetail?.quote, selectedRecord]
  ) as any;
  const detailProducts: SelectedProduct[] = useMemo(
    () => mapQuoteItemsToSelectedProducts(((quoteDetail?.items ?? []) as any[]).map((item: any) => normalizeQuoteItemRecord(item))),
    [quoteDetail?.items]
  );

  const tierEditingProduct = formData.products.find((product) => product.id === tierProductId) || null;
  const productSubtotal = formData.products.reduce(
    (sum, product) => sum + product.quantity * product.price * (1 - (product.discount || 0) / 100),
    0
  );
  const totalAmountBase = productSubtotal * parseFloat(formData.exchangeRate || "1");
  const calcToolContent = (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">BOM 换算工具</span>
        </div>
        <div className="space-y-2">
          <Label>套用报价产品</Label>
          <Select value={calcProductId || "__empty__"} onValueChange={(value) => setCalcProductId(value === "__empty__" ? "" : value)}>
            <SelectTrigger><SelectValue placeholder="选择已报价产品" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">手动输入规格</SelectItem>
              {formData.products.map((product) => (
                <SelectItem key={product.id} value={String(product.id)}>
                  {toDisplayText(product.code, "")} - {toDisplayText(product.name, "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>规格输入</Label>
          <Input
            value={tubeCalc.specText}
            onChange={(e) => parseTubeSpec(e.target.value)}
            placeholder="如 3.0*4.2*400"
          />
          <p className="text-xs text-muted-foreground">
            默认单位 mm，密度默认 1.25。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>内径</Label>
            <Input value={tubeCalc.innerDiameter} onChange={(e) => setTubeCalc((prev) => ({ ...prev, innerDiameter: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>外径</Label>
            <Input value={tubeCalc.outerDiameter} onChange={(e) => setTubeCalc((prev) => ({ ...prev, outerDiameter: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>长度</Label>
            <Input value={tubeCalc.length} onChange={(e) => setTubeCalc((prev) => ({ ...prev, length: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>密度</Label>
            <Input value={tubeCalc.density} onChange={(e) => setTubeCalc((prev) => ({ ...prev, density: e.target.value }))} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>公斤单价</Label>
            <Input
              value={tubeCalc.kgUnitPrice}
              onChange={(e) => setTubeCalc((prev) => ({ ...prev, kgUnitPrice: e.target.value }))}
              placeholder="填写每公斤价格后自动换算当前单价"
            />
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">单支重量</span>
            <span className="font-medium">
              {tubeCalcResult.valid ? `${formatDisplayNumber(tubeCalcResult.pieceWeight)} g` : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">1000g 可出数量</span>
            <span className="font-medium">
              {tubeCalcResult.valid ? `${formatDisplayNumber(tubeCalcResult.pieceCountFrom1000g)} 个` : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">自动单价</span>
            <span className="font-medium">
              {tubeCalcResult.valid && tubeCalcResult.pieceUnitPrice > 0
                ? formatAmount(tubeCalcResult.pieceUnitPrice, formData.currency)
                : "-"}
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleApplyCalcQuantity}>
          将换算数量和单价回填到当前产品
        </Button>
        {!tubeCalcResult.valid ? (
          <p className="text-xs text-muted-foreground">
            请输入完整内径、外径、长度和密度，且外径需大于内径。
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{renderSafeNode(children)}</span>
    </div>
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">报价单</h1>
              <p className="text-sm text-muted-foreground">管理销售报价、打印预览，并支持一键转销售订单</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportQuotes}>
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
              onChange={handleImportQuotes}
            />
            <Button
              variant={statusFilter === "draft" ? "secondary" : "outline"}
              onClick={() => setStatusFilter(statusFilter === "draft" ? "all" : "draft")}
            >
              <Archive className="h-4 w-4 mr-2" />
              草稿库
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              新建报价单
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">报价总数</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">报价金额（本位币）</div>
            <div className="text-2xl font-bold text-green-600">¥{formatDisplayNumber(stats.totalAmount / 10000, { maximumFractionDigits: 1 })}万</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">已发送</div>
            <div className="text-2xl font-bold text-amber-600">{stats.sent}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">已转订单</div>
            <div className="text-2xl font-bold text-blue-600">{stats.converted}</div>
          </CardContent></Card>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索报价单号、客户名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {QUOTE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">报价单号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead className="w-[110px]">报价日期</TableHead>
                  <TableHead className="w-[110px]">有效期至</TableHead>
                  <TableHead className="w-[90px]">产品种类</TableHead>
                  <TableHead className="w-[140px] text-right">金额</TableHead>
                  <TableHead className="w-[110px]">状态</TableHead>
                  <TableHead className="w-[100px]">销售负责人</TableHead>
                  <TableHead className="w-[90px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">加载中...</TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">暂无数据</TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote: any) => (
                    <TableRow key={quote.id} className="cursor-pointer" onClick={() => handleView({ ...quote, products: [] })}>
                      <TableCell className="font-medium">{toDisplayText(quote.quoteNo)}</TableCell>
                      <TableCell>{toDisplayText(quote.customerName)}</TableCell>
                      <TableCell>{formatDate(quote.quoteDate)}</TableCell>
                      <TableCell>{formatDate(quote.validUntil)}</TableCell>
                      <TableCell>{toDisplayText(quote.productTypeCount || (quoteItemMap.get(Number(quote.id)) || []).length || 0, "0")}</TableCell>
                      <TableCell className="text-right">{formatAmount(quote.totalAmount, quote.currency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusSemanticClass(quote.status, statusMap[String(quote.status)]?.label)}>
                          {toDisplayText(statusMap[String(quote.status)]?.label || quote.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{toDisplayText(quote.salesPersonName)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView({ ...quote, products: [] })}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit({ ...quote, products: [] })}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint({ ...quote, products: [] })}>
                              <Printer className="h-4 w-4 mr-2" />
                              打印预览
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange({ ...quote, products: [] }, "sent")}>
                              <Send className="h-4 w-4 mr-2" />
                              标记已发送
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange({ ...quote, products: [] }, "accepted")}>
                              <Archive className="h-4 w-4 mr-2" />
                              标记已接受
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleConvertToOrder({ ...quote, products: [] })}>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              转销售订单
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete({ ...quote, products: [] })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
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
      </div>

      <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen} defaultWidth={1320} defaultHeight={900}>
        <DraggableDialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "编辑报价单" : "新建报价单"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>报价单号</Label>
                <Input value={isEditing ? toDisplayText(selectedRecord?.quoteNo, "") : toDisplayText(nextQuoteNoData, "自动生成")} readOnly />
              </div>
              <div className="space-y-2">
                <Label>报价日期</Label>
                <Input
                  type="date"
                  value={formData.quoteDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quoteDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUOTE_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>客户信息识别</Label>
                    <Textarea
                      value={customerPasteText}
                      onChange={(e) => setCustomerPasteText(e.target.value)}
                      placeholder="把客户整段资料直接粘贴进来，系统会自动识别客户名称、联系人、电话、地址，优先匹配现有客户，未匹配时自动新建为非正常客户"
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={handleRecognizeCustomerInfo}>
                        识别并带入客户信息
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>客户</Label>
                      <CustomerSelect selectedCustomer={selectedCustomer} onCustomerSelect={handleCustomerSelect} />
                    </div>
                    <div className="space-y-2">
                      <Label>客户编码</Label>
                      <Input value={formData.customerCode} readOnly placeholder="选择客户后自动带入" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>联系人</Label>
                      <Input
                        value={formData.contactPerson}
                        onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                        placeholder="联系人"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>联系电话</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="联系电话"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>销售负责人</Label>
                      <Input value={formData.salesperson} readOnly placeholder="自动带入" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>收货地址</Label>
                    <Input
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData((prev) => ({ ...prev, shippingAddress: e.target.value }))}
                      placeholder="收货地址"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>有效期至</Label>
                      <Input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData((prev) => ({ ...prev, validUntil: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>预计交期</Label>
                      <Input
                        type="date"
                        value={formData.deliveryDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>贸易条款</Label>
                      <Select value={formData.tradeTerm || "__empty__"} onValueChange={(value) => setFormData((prev) => ({ ...prev, tradeTerm: value === "__empty__" ? "" : value }))}>
                        <SelectTrigger><SelectValue placeholder="选择贸易条款" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">不设置</SelectItem>
                          {TRADE_TERM_OPTIONS.map((term) => (
                            <SelectItem key={term} value={term}>{term}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>付款条件</Label>
                      <Select value={formData.paymentTerms || "__empty__"} onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentTerms: value === "__empty__" ? "" : value }))}>
                        <SelectTrigger><SelectValue placeholder="选择付款条件" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">请选择</SelectItem>
                          {PAYMENT_CONDITION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>税价类型</Label>
                      <Select value={formData.taxIncluded ? "included" : "excluded"} onValueChange={(value) => setFormData((prev) => ({ ...prev, taxIncluded: value === "included" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="included">含税</SelectItem>
                          <SelectItem value="excluded">未税</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>币种</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((currency) => (
                            <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>汇率</Label>
                      <Input
                        value={formData.exchangeRate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, exchangeRate: e.target.value }))}
                        placeholder="财务汇率"
                      />
                    </div>
                  </div>
                  {formData.paymentTerms === "预付款" ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>预付款比例（%）</Label>
                        <Input
                          value={formData.prepaymentRatio}
                          onChange={(e) => setFormData((prev) => ({ ...prev, prepaymentRatio: e.target.value }))}
                          placeholder="如 30"
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label>收款账户</Label>
                    <Select value={formData.receiptAccountId || "__empty__"} onValueChange={(value) => setFormData((prev) => ({ ...prev, receiptAccountId: value === "__empty__" ? "" : value }))}>
                      <SelectTrigger><SelectValue placeholder="选择收款账户" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">不设置</SelectItem>
                        {(bankAccounts as any[]).map((account: any) => (
                          <SelectItem key={account.id} value={String(account.id)}>
                            {toDisplayText(account.accountName || account.bankName || `账户${account.id}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">报价产品</h3>
                      <p className="text-xs text-muted-foreground">支持多产品选择、直接改数量和单价，并自动计算报价金额</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setCalcDialogOpen(true)}>
                        <Calculator className="h-4 w-4 mr-2" />
                        BOM 换算工具
                      </Button>
                      <div className="text-sm font-medium text-primary">
                        合计：{formatAmount(productSubtotal, formData.currency)}
                      </div>
                    </div>
                  </div>
                  <ProductMultiSelect
                    selectedProducts={formData.products}
                    onSelectionChange={handleProductsChange}
                    title="选择报价产品"
                    showPrice
                    editablePrice
                    currencySymbol={getCurrencySymbol(formData.currency)}
                    renderSelectedMeta={(product) => renderTierPriceSummary(product as QuoteSelectedProduct, formData.currency)}
                  />
                </div>

                {formData.products.length > 0 ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">阶梯价</h3>
                          <p className="text-xs text-muted-foreground">按数量自动匹配当前档位单价，适合整单报价时直接报阶梯价</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {formData.products.map((product) => {
                          const matchedTier = getMatchedTierPrice(Number(product.quantity || 0), product.tierPrices || []);
                          return (
                            <div key={`tier-${product.id}`} className="rounded-lg border p-3 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    {toDisplayText(product.code, "")} - {toDisplayText(product.name, "")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {toDisplayText(product.spec || product.unit || "-", "-")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatTierPricesText(product.tierPrices || [], product.unit, formData.currency)}
                                  </div>
                                  {matchedTier ? (
                                    <div className="text-xs text-primary">
                                      当前数量 {toDisplayText(product.quantity, "0")} 命中：满 {matchedTier.minQty}{product.unit || ""}，单价 {formatAmount(matchedTier.unitPrice, formData.currency)}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button type="button" variant="outline" size="sm" onClick={() => handleOpenTierPriceDialog(product.id)}>
                                    设置阶梯价
                                  </Button>
                                  {(product.tierPrices?.length || 0) > 0 ? (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleClearTierPrices(product.id)}>
                                      清空
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="space-y-2">
                  <Label>报价备注</Label>
                  <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                    placeholder="报价说明、交货说明、包装说明等"
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm font-semibold">报价汇总</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">产品合计</span>
                      <span className="font-medium">{formatAmount(productSubtotal, formData.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">本位币金额</span>
                      <span className="font-medium">¥{formatDisplayNumber(Number.isFinite(totalAmountBase) ? totalAmountBase : 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">有效期</span>
                      <span className="font-medium">{formData.validUntil || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">税价类型</span>
                      <span className="font-medium">{formData.taxIncluded ? "含税" : "未税"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>取消</Button>
            <Button variant="outline" onClick={handleSaveDraft}>
              保存草稿
            </Button>
            <Button onClick={handleSubmit}>
              {formData.status === "draft" ? "保存并发送" : "保存报价"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={calcDialogOpen}
        onOpenChange={setCalcDialogOpen}
        defaultWidth={430}
        defaultHeight={640}
        minWidth={360}
        minHeight={520}
        enableSearch={false}
        printable={false}
      >
        <DraggableDialogContent className="max-h-[90vh] overflow-auto">
          {calcToolContent}
        </DraggableDialogContent>
      </DraggableDialog>

      <Dialog open={tierPriceDialogOpen} onOpenChange={setTierPriceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>设置阶梯价</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <div className="font-medium">
                {toDisplayText(tierEditingProduct?.code, "")} - {toDisplayText(tierEditingProduct?.name, "")}
              </div>
              <div className="text-muted-foreground mt-1">
                当前数量：{toDisplayText(tierEditingProduct?.quantity, "0")}，当前单价：{formatAmount(tierEditingProduct?.price || 0, formData.currency)}
              </div>
            </div>
            <div className="space-y-3">
              {tierDrafts.map((tier, index) => (
                <div key={`tier-draft-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
                  <div className="space-y-2">
                    <Label>起订数量</Label>
                    <Input
                      type="number"
                      min={1}
                      value={tier.minQty || ""}
                      onChange={(e) => handleTierDraftChange(index, "minQty", e.target.value)}
                      placeholder="如 1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>单价</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.0001"
                      value={tier.unitPrice || ""}
                      onChange={(e) => handleTierDraftChange(index, "unitPrice", e.target.value)}
                      placeholder="如 2.35"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveTierDraft(index)}
                    disabled={tierDrafts.length <= 1}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={handleAddTierDraft}>
              新增一档
            </Button>
            <div className="text-xs text-muted-foreground">
              示例：满 1000 个单价 2.35，满 5000 个单价 2.10。保存后，报价数量变化会自动套用对应档位。
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTierPriceDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSaveTierPrices}>
              保存阶梯价
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>报价单详情</DialogTitle>
          </DialogHeader>
          {detailQuote ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={() => handlePrint({ ...(detailQuote as DbQuote), products: [] })}>
                  <Printer className="h-4 w-4 mr-2" />
                  打印预览
                </Button>
                <Button variant="outline" onClick={() => handleEdit({ ...(detailQuote as DbQuote), products: [] })}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Button>
                <Button variant="outline" onClick={() => handleStatusChange({ ...(detailQuote as DbQuote), products: [] }, "sent")}>
                  标记已发送
                </Button>
                <Button variant="outline" onClick={() => handleStatusChange({ ...(detailQuote as DbQuote), products: [] }, "accepted")}>
                  标记已接受
                </Button>
                <Button onClick={() => handleConvertToOrder({ ...(detailQuote as DbQuote), products: [] })}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  转销售订单
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1 rounded-lg border p-4">
                  <FieldRow label="报价单号">{toDisplayText(detailQuote.quoteNo)}</FieldRow>
                  <FieldRow label="客户名称">{toDisplayText(detailQuote.customerName)}</FieldRow>
                  <FieldRow label="客户编码">{toDisplayText(detailQuote.customerCode)}</FieldRow>
                  <FieldRow label="报价日期">{formatDate(detailQuote.quoteDate)}</FieldRow>
                  <FieldRow label="有效期至">{formatDate(detailQuote.validUntil)}</FieldRow>
                  <FieldRow label="预计交期">{formatDate(detailQuote.deliveryDate)}</FieldRow>
                </div>
                <div className="space-y-1 rounded-lg border p-4">
                  <FieldRow label="付款条件">{toDisplayText(normalizePaymentCondition(detailQuote.paymentMethod) || "-")}</FieldRow>
                  <FieldRow label="税价类型">{parseTaxIncludedFromRemark(detailQuote.remark) ? "含税" : "未税"}</FieldRow>
                  <FieldRow label="联系人">{toDisplayText(detailQuote.shippingContact || detailQuote.contactPerson)}</FieldRow>
                  <FieldRow label="联系电话">{toDisplayText(detailQuote.shippingPhone || detailQuote.phone)}</FieldRow>
                  <FieldRow label="收货地址">{toDisplayText(detailQuote.shippingAddress)}</FieldRow>
                  <FieldRow label="贸易条款">{toDisplayText(detailQuote.tradeTerm)}</FieldRow>
                  <FieldRow label="状态">
                    <Badge variant="outline" className={getStatusSemanticClass(detailQuote.status, statusMap[String(detailQuote.status)]?.label)}>
                      {toDisplayText(statusMap[String(detailQuote.status)]?.label || detailQuote.status)}
                    </Badge>
                  </FieldRow>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>产品编码</TableHead>
                      <TableHead>产品名称</TableHead>
                      <TableHead>规格型号</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无明细</TableCell>
                      </TableRow>
                    ) : (
                      detailProducts.map((product) => (
                        <TableRow key={`${product.id}-${product.code}`}>
                          <TableCell>{toDisplayText(product.code)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{toDisplayText(product.name)}</div>
                              {((product as QuoteSelectedProduct).tierPrices?.length || 0) > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  {renderTierPriceSummary(product as QuoteSelectedProduct, detailQuote.currency)}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{toDisplayText(product.spec)}</TableCell>
                          <TableCell className="text-right">{toDisplayText(product.quantity, "0")}</TableCell>
                          <TableCell className="text-right">{formatAmount(product.price, detailQuote.currency)}</TableCell>
                          <TableCell className="text-right">{formatAmount(product.amount, detailQuote.currency)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card><CardContent className="p-4 space-y-2">
                  <div className="text-sm text-muted-foreground">报价金额</div>
                  <div className="text-2xl font-bold">{formatAmount(detailQuote.totalAmount, detailQuote.currency)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-4 space-y-2">
                  <div className="text-sm text-muted-foreground">更新时间</div>
                  <div className="text-base font-medium">{formatDateTime(detailQuote.updatedAt)}</div>
                </CardContent></Card>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <div className="rounded-lg border bg-muted/20 p-3 min-h-[88px] whitespace-pre-wrap text-sm">
                  {stripQuoteMetaFromRemark(detailQuote.remark) || "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">加载中...</div>
          )}
        </DialogContent>
      </Dialog>

      {printPayload ? (
        <SalesOrderPrint
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          documentMode="quote"
          order={printPayload}
        />
      ) : null}
    </ERPLayout>
  );
}
