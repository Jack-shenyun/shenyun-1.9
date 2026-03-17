import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
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
import {
  Receipt,
  Plus,
  GitBranch,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  ClipboardCheck,
  RefreshCw,
  Upload,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { formatDateValue, formatDisplayNumber, formatNumber, toRoundedString, toSafeNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { isAccountPeriodPaymentCondition, normalizePaymentCondition } from "@shared/paymentTerms";
import { ATTACHMENT_ACCEPT, ATTACHMENT_EXTENSIONS, normalizeDepartmentForUpload } from "@shared/uploadPolicy";

interface ReceivableRecord {
  id: number;
  invoiceNo: string;
  customerId?: number;
  customerName: string;
  orderNo: string;
  amount: number;
  receivedAmount: number;
  currency?: string;
  invoiceDate?: string;
  dueDate: string;
  status: "pending" | "partial" | "received" | "paid" | "overdue";
  paymentMethod: string;
  remarks: string;
  receiptDate: string;
}

const statusMap: Record<string, any> = {
  pending: { label: "待收款", variant: "outline" as const },
  partial: { label: "部分收款", variant: "secondary" as const },
  received: { label: "已收款", variant: "default" as const },
  paid: { label: "已收款", variant: "default" as const },
  overdue: { label: "待收款", variant: "outline" as const },
};

function getStatusMeta(status: unknown) {
  return statusMap[String(status ?? "")] ?? statusMap.pending;
}

const RECON_MARKER = "[RECONCILE]";
const PREPAY_RATIO_MARKER = "[PREPAY_RATIO]";
const FINANCE_TODO_LIST_MARKER = "[FINANCE_TODO_LIST]";
const OPENING_RECEIVABLE_MARKER = "[OPENING_RECEIVABLE]";

type FinanceTodo = {
  id: string;
  status: "open" | "done";
  amount: number;
  serviceFee?: number;
  paymentMethod: string;
  receiptDate: string;
  remarks?: string;
  attachments?: string[];
  createdAt: string;
};

function parseReconcileMeta(remark: unknown) {
  const text = String(remark ?? "");
  const lines = text.split("\n");
  const markerLine = lines.find((line) => line.startsWith(RECON_MARKER));
  if (!markerLine) return null;
  try {
    return JSON.parse(markerLine.slice(RECON_MARKER.length));
  } catch {
    return null;
  }
}

function stripReconcileMeta(remark: unknown) {
  return String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(RECON_MARKER))
    .join("\n")
    .trim();
}

function buildRemarkWithReconcile(meta: Record<string, any>, plainRemark: string) {
  const header = `${RECON_MARKER}${JSON.stringify(meta)}`;
  return plainRemark ? `${header}\n${plainRemark}` : header;
}

function getReconcileMonth(meta: any): string {
  const month = String(meta?.reconciledMonth || meta?.reconciledDate || "").trim();
  if (/^\d{4}-\d{2}$/.test(month)) return month;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month.slice(0, 7);
  return "";
}

function parsePrepayRatioFromRemark(remark: unknown): number {
  const text = String(remark ?? "");
  const markerLine = text.split("\n").find((line) => line.startsWith(PREPAY_RATIO_MARKER));
  if (!markerLine) return 30;
  const ratio = Number(markerLine.slice(PREPAY_RATIO_MARKER.length).trim());
  if (!Number.isFinite(ratio)) return 30;
  return Math.max(0, Math.min(100, ratio));
}

function parseFinanceTodoList(remark: unknown): FinanceTodo[] {
  const text = String(remark ?? "");
  const markerLine = text.split("\n").find((line) => line.startsWith(FINANCE_TODO_LIST_MARKER));
  if (!markerLine) return [];
  try {
    const list = JSON.parse(markerLine.slice(FINANCE_TODO_LIST_MARKER.length));
    if (!Array.isArray(list)) return [];
    return list
      .map((item: any) => ({
        id: String(item?.id || ""),
        status: (item?.status === "done" ? "done" : "open") as "open" | "done",
        amount: toSafeNumber(item?.amount),
        serviceFee: toSafeNumber(item?.serviceFee),
        paymentMethod: String(item?.paymentMethod || "银行转账"),
        receiptDate: String(item?.receiptDate || ""),
        remarks: item?.remarks ? String(item.remarks) : "",
        attachments: Array.isArray(item?.attachments) ? item.attachments.map((x: any) => String(x)) : [],
        createdAt: String(item?.createdAt || ""),
      }))
      .filter((item: FinanceTodo): item is FinanceTodo => Boolean(item.id));
  } catch {
    return [];
  }
}

function setFinanceTodoList(remark: unknown, list: FinanceTodo[]): string {
  const lines = String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(FINANCE_TODO_LIST_MARKER))
    .filter((line) => line.trim().length > 0);
  if (list.length > 0) {
    lines.push(`${FINANCE_TODO_LIST_MARKER}${JSON.stringify(list)}`);
  }
  return lines.join("\n").trim();
}

function getCurrencySymbol(currencyRaw: unknown): string {
  const currency = String(currencyRaw ?? "CNY").toUpperCase();
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  if (currency === "JPY" || currency === "CNY") return "¥";
  return `${currency} `;
}

function formatMoneyByCurrency(currencyRaw: unknown, amountRaw: unknown) {
  return `${getCurrencySymbol(currencyRaw)}${formatNumber(toSafeNumber(amountRaw))}`;
}

function formatBankAccountDisplay(account: any) {
  return [
    String(account?.accountName || "").trim(),
    String(account?.bankName || "").trim(),
    String(account?.accountNo || "").trim(),
  ].filter(Boolean).join(" / ");
}

function toFriendlyErrorMessage(error: unknown): string {
  const msg = String((error as any)?.message ?? error ?? "").trim();
  if (!msg) return "请稍后重试";
  const normalized = msg.startsWith("Invalid input:") ? msg.slice("Invalid input:".length).trim() : msg;
  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as any;
      if (first?.code === "invalid_type") {
        const field = Array.isArray(first?.path) && first.path.length > 0 ? String(first.path[0]) : "字段";
        if (field === "id") return "记录编号格式错误，请刷新页面后重试";
        return `字段「${field}」格式错误`;
      }
    }
  } catch {
    // ignore json parse failure
  }
  if (normalized.includes("expected number") || normalized.includes("received string")) {
    return "记录编号格式错误，请刷新页面后重试";
  }
  return normalized;
}



export default function ReceivablePage() {
  const PAGE_SIZE = 10;
  const [location, setLocation] = useLocation();
  const isSalesCollaboration = location.startsWith("/sales/finance-collaboration");
  const { user } = useAuth();
  const trpcUtils = trpc.useUtils();
  const { data: _dbData = [], isLoading, refetch } = trpc.accountsReceivable.list.useQuery();
  const { data: customers = [] } = trpc.customers.list.useQuery({ limit: 500 });
  const { data: salesOrders = [] } = trpc.salesOrders.list.useQuery({});
  // Issue 10: 获取银行账户列表
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery({ status: "active" });
  const { data: salesFinanceFormMeta } = trpc.workflowSettings.getFormCatalogItem.useQuery(
    { module: "销售部", formType: "协同流程", formName: "财务协同" },
    { enabled: isSalesCollaboration },
  );
  const setFormApprovalEnabledMutation = trpc.workflowSettings.setFormApprovalEnabled.useMutation();
  const createMutation = trpc.accountsReceivable.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.accountsReceivable.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.accountsReceivable.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const syncMutation = trpc.accountsReceivable.syncFromSalesOrders.useMutation();
  const receivables = _dbData as any[];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [bizMode, setBizMode] = useState<"cash" | "account">("cash");
  const [entryMode, setEntryMode] = useState<"normal" | "opening">("normal");
  const [editingReceivable, setEditingReceivable] = useState<ReceivableRecord | null>(null);
  const [viewingReceivable, setViewingReceivable] = useState<ReceivableRecord | null>(null);
  const [receivingRecord, setReceivingRecord] = useState<ReceivableRecord | null>(null);
  const [reconcilingRecord, setReconcilingRecord] = useState<ReceivableRecord | null>(null);
  const { canDelete, isAdmin } = usePermission();

  const [formData, setFormData] = useState({
    invoiceNo: "",
    customerId: 0,
    customerName: "",
    orderNo: "",
    amount: "",
    invoiceDate: "",
    dueDate: "",
    periodMonth: "",
    remarks: "",
  });

  const [receiptData, setReceiptData] = useState({
    amount: "",
    serviceFee: "",
    paymentMethod: "银行转账",
    bankAccountId: "",
    receiptDate: "",
    remarks: "",
  });
  const [receiptFiles, setReceiptFiles] = useState<Array<{ id: string; file: File }>>([]);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [hasHandledFocusParam, setHasHandledFocusParam] = useState(false);
  const [receiptDragging, setReceiptDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveAttachmentsMutation = trpc.documents.saveReceivableAttachments.useMutation();

  const [reconcileData, setReconcileData] = useState({
    amount: "1000",
    reconciledDate: new Date().toISOString().split("T")[0],
    adjustedAmount: "",
    remarks: "",
  });
  const [viewAmount, setViewAmount] = useState("");
  const [detailFiles, setDetailFiles] = useState<Array<{ id: string; file: File }>>([]);
  const [detailDragging, setDetailDragging] = useState(false);

  const getReceivableAmount = (r: any) => toSafeNumber(r?.amount);
  const getReceivedAmount = (r: any) => toSafeNumber(r?.receivedAmount ?? r?.paidAmount);
  const getDefaultReceiptBankAccountId = (receivable: any) => {
    const currentBankAccountId = String(receivable?.bankAccountId || "").trim();
    if (currentBankAccountId) return currentBankAccountId;
    const matchedOrder = (salesOrders as any[]).find(
      (order: any) =>
        Number(order?.id || 0) === Number(receivable?.salesOrderId || 0) ||
        String(order?.orderNo || "") === String(receivable?.orderNo || ""),
    );
    return matchedOrder?.receiptAccountId ? String(matchedOrder.receiptAccountId) : "";
  };

  const parseOpeningPeriod = (remark: unknown) => {
    const text = String(remark ?? "");
    const match = text.match(/\[OPENING_PERIOD:([0-9]{4}-[0-9]{2})\]/);
    return match?.[1] || "";
  };

  const stripOpeningMeta = (remark: unknown) =>
    String(remark ?? "")
      .split("\n")
      .filter((line) => !line.startsWith(OPENING_RECEIVABLE_MARKER))
      .filter((line) => !line.startsWith("[OPENING_PERIOD:"))
      .join("\n")
      .trim();

  const buildOpeningRemark = (periodMonth: string, plainRemark: string) => {
    const lines = [OPENING_RECEIVABLE_MARKER];
    if (periodMonth) lines.push(`[OPENING_PERIOD:${periodMonth}]`);
    if (plainRemark.trim()) lines.push(plainRemark.trim());
    return lines.join("\n");
  };

  const resolveCustomer = () => {
    if (Number(formData.customerId || 0) > 0) {
      return (customers as any[]).find((item: any) => Number(item?.id) === Number(formData.customerId || 0)) || null;
    }
    const input = String(formData.customerName || "").trim().toLowerCase();
    if (!input) return null;
    return (customers as any[]).find((item: any) => {
      const name = String(item?.name || "").trim().toLowerCase();
      const code = String(item?.code || "").trim().toLowerCase();
      return name === input || code === input;
    }) || null;
  };
  const getPendingAmount = (r: any) => getReceivableAmount(r) - getReceivedAmount(r);
  const getRate = (r: any) => {
    const rate = toSafeNumber(r?.exchangeRate);
    return rate > 0 ? rate : 1;
  };
  const getReceivableAmountBase = (r: any) => {
    const amountBase = toSafeNumber(r?.amountBase);
    return amountBase > 0 ? amountBase : getReceivableAmount(r) * getRate(r);
  };
  const getReceivedAmountBase = (r: any) => getReceivedAmount(r) * getRate(r);
  const getPendingAmountBase = (r: any) => getReceivableAmountBase(r) - getReceivedAmountBase(r);
  const normalizeDateOnly = (dateRaw: unknown) => String(dateRaw ?? "").trim().split("T")[0] || "";

  const normalizeStatus = (status: unknown) => (String(status ?? "") === "paid" ? "received" : String(status ?? ""));

  useEffect(() => {
    let mounted = true;
    const runSync = async () => {
      try {
        const result = await syncMutation.mutateAsync();
        if (!mounted) return;
        if ((result?.createdCount ?? 0) > 0) {
          toast.success(`已自动同步 ${result.createdCount} 条销售应收记录`);
        }
        if ((result?.failed?.length ?? 0) > 0) {
          const top = result.failed.slice(0, 2).map((f: any) => `${f.orderNo}: ${f.reason}`).join("；");
          toast.warning("部分订单同步失败", {
            description: top,
          });
        }
        await refetch();
      } catch (error: any) {
        if (!mounted) return;
        toast.error("销售订单同步应收失败", {
          description: String(error?.message || "请稍后重试"),
        });
      }
    };
    void runSync();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSyncSalesOrders = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      if ((result?.createdCount ?? 0) > 0) {
        toast.success(`已同步 ${result.createdCount} 条应收记录（共检查 ${result?.totalCount ?? 0} 条订单）`);
      } else {
        toast.info(`没有新的应收需要同步（共检查 ${result?.totalCount ?? 0} 条订单）`);
      }
      if ((result?.failed?.length ?? 0) > 0) {
        const top = result.failed.slice(0, 3).map((f: any) => `${f.orderNo}: ${f.reason}`).join("；");
        toast.warning("发现同步失败订单", {
          description: top,
        });
      }
      await refetch();
    } catch (error: any) {
      toast.error("同步失败", {
        description: String(error?.message || "请稍后重试"),
      });
    }
  };

  const handleAdd = (mode: "normal" | "opening" = "normal") => {
    setEntryMode(mode);
    setEditingReceivable(null);
    const today = new Date();
    setFormData({
      invoiceNo: "",
      customerId: 0,
      customerName: "",
      orderNo: "",
      amount: "",
      invoiceDate: today.toISOString().split("T")[0],
      dueDate: "",
      periodMonth: today.toISOString().slice(0, 7),
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (receivable: ReceivableRecord) => {
    const sourceRemark = receivable.remarks ?? (receivable as any).remark;
    const opening = String(sourceRemark || "").includes(OPENING_RECEIVABLE_MARKER);
    setEntryMode(opening ? "opening" : "normal");
    setEditingReceivable(receivable);
    setFormData({
      invoiceNo: receivable.invoiceNo,
      customerId: Number((receivable as any).customerId || 0),
      customerName: receivable.customerName,
      orderNo: receivable.orderNo,
      amount: String(receivable.amount),
      invoiceDate: String((receivable as any).invoiceDate || "").split("T")[0],
      dueDate: receivable.dueDate,
      periodMonth: opening ? parseOpeningPeriod(sourceRemark) : "",
      remarks: opening ? stripOpeningMeta(sourceRemark) : String(sourceRemark || ""),
    });
    setDialogOpen(true);
  };

  const handleView = (receivable: ReceivableRecord) => {
    setViewingReceivable(receivable);
    setViewAmount(String(getReceivableAmount(receivable)));
    setDetailFiles([]);
    setViewDialogOpen(true);
  };

  const handleDelete = (receivable: ReceivableRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除应收记录" });
      return;
    }
    deleteMutation.mutate({ id: receivable.id });
    toast.success("应收记录已删除");
  };

  const handleReceive = (receivable: ReceivableRecord) => {
    if (isAccountPeriodCustomer(receivable) && !isReconciled(receivable)) {
      toast.error("账期支付客户请先完成对账，再登记收款");
      return;
    }
    setReceivingRecord(receivable);
    setReceiptData({
      amount: String(getPendingAmount(receivable)),
      serviceFee: "",
      paymentMethod: String((receivable as any)?.paymentMethod || "银行转账"),
      bankAccountId: getDefaultReceiptBankAccountId(receivable),
      receiptDate: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setActiveTodoId(null);
    setReceiptFiles([]);
    setReceiptDialogOpen(true);
  };

  const handleReceiveFromTodo = (receivable: ReceivableRecord, todo: FinanceTodo) => {
    setReceivingRecord(receivable);
    setReceiptData({
      amount: String(toSafeNumber(todo.amount)),
      serviceFee: String(toSafeNumber(todo.serviceFee) || ""),
      paymentMethod: todo.paymentMethod || "银行转账",
      bankAccountId: getDefaultReceiptBankAccountId(receivable),
      receiptDate: todo.receiptDate || new Date().toISOString().split("T")[0],
      remarks: todo.remarks || "",
    });
    setActiveTodoId(todo.id);
    setReceiptFiles([]);
    setReceiptDialogOpen(true);
  };

  const appendReceiptFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    const next = [...receiptFiles];
    for (const f of incoming) {
      const ext = `.${String(f.name.split(".").pop() || "").toLowerCase()}`;
      if (!ATTACHMENT_EXTENSIONS.includes(ext as any)) {
        toast.error(`不支持的文件格式：${f.name}`);
        continue;
      }
      const exists = next.some((x) => x.file.name === f.name && x.file.size === f.size);
      if (exists) continue;
      next.push({ id: `${Date.now()}-${Math.random()}`, file: f });
    }
    setReceiptFiles(next);
  };

  const removeReceiptFile = (id: string) => {
    setReceiptFiles((prev) => prev.filter((x) => x.id !== id));
  };

  const appendDetailFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    const next = [...detailFiles];
    for (const f of incoming) {
      const ext = `.${String(f.name.split(".").pop() || "").toLowerCase()}`;
      if (!ATTACHMENT_EXTENSIONS.includes(ext as any)) {
        toast.error(`不支持的文件格式：${f.name}`);
        continue;
      }
      const exists = next.some((x) => x.file.name === f.name && x.file.size === f.size);
      if (exists) continue;
      next.push({ id: `${Date.now()}-${Math.random()}`, file: f });
    }
    setDetailFiles(next);
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsDataURL(file);
    });

  const handleReconcile = (receivable: ReceivableRecord) => {
    setReconcilingRecord(receivable);
    const meta = getReconcileMeta(receivable);
    setReconcileData({
      amount: String(toSafeNumber(meta?.amount) || 1000),
      reconciledDate: String(meta?.reconciledDate || new Date().toISOString().split("T")[0]),
      adjustedAmount: String(toSafeNumber(meta?.adjustedAmount) || getReceivableAmount(receivable)),
      remarks: stripReconcileMeta(receivable.remarks ?? (receivable as any).remark),
    });
    setReconcileDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.customerName || !formData.amount) {
      toast.error("请填写必填项", { description: "客户名称和金额为必填" });
      return;
    }
    const amount = Number(formData.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("应收金额必须大于0");
      return;
    }

    const customer = resolveCustomer();
    const customerId = Number((editingReceivable as any)?.customerId || customer?.id || 0);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      toast.error("请填写正确的客户名称", { description: "需要与客户档案名称或编码完全匹配" });
      return;
    }

    const remark = entryMode === "opening"
      ? buildOpeningRemark(formData.periodMonth, formData.remarks)
      : formData.remarks.trim();

    try {
      if (editingReceivable) {
        await updateMutation.mutateAsync({
          id: Number(editingReceivable.id),
          data: {
            invoiceNo: formData.invoiceNo.trim() || undefined,
            customerId,
            amount: toRoundedString(amount, 2),
            invoiceDate: formData.invoiceDate || undefined,
            dueDate: formData.dueDate || undefined,
            remark,
          },
        });
      } else {
        await createMutation.mutateAsync({
          invoiceNo: formData.invoiceNo.trim() || undefined,
          customerId,
          amount: toRoundedString(amount, 2),
          invoiceDate: formData.invoiceDate || undefined,
          dueDate: formData.dueDate || undefined,
          remark,
        });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(editingReceivable ? "保存失败" : "创建失败", {
        description: String(error?.message || error || "请稍后重试"),
      });
    }
  };

  const handleReceiptSubmit = async () => {
    if (!receivingRecord || !receiptData.amount) {
      toast.error("请填写收款金额");
      return;
    }

    const receiptAmount = parseFloat(receiptData.amount) || 0;
    const serviceFeeAmount = toSafeNumber(receiptData.serviceFee);
    const netReceiptAmount = Math.max(0, receiptAmount - serviceFeeAmount);
    if (receiptAmount <= 0) {
      toast.error("收款金额必须大于0");
      return;
    }
    if (!isSalesCollaboration && serviceFeeAmount >= receiptAmount) {
      toast.error("手续费不能大于等于收款金额");
      return;
    }
    const currentReceived = getReceivedAmount(receivingRecord);
    const receivableAmount = getReceivableAmount(receivingRecord);
    const nextReceived = currentReceived + receiptAmount;
    if (nextReceived - receivableAmount > 0.0001) {
      toast.error("收款金额不能超过待收金额");
      return;
    }

    const nextStatus = calcBackendStatus(receivableAmount, nextReceived, receivingRecord.dueDate);
    const receivableId = Number((receivingRecord as any)?.id);
    if (!Number.isFinite(receivableId) || receivableId <= 0) {
      toast.error("提交失败", {
        description: "记录编号无效，请先同步销售订单后重试",
      });
      return;
    }

    try {
      let uploadedDocNos: string[] = [];
      if (receiptFiles.length > 0) {
        const filesPayload = await Promise.all(
          receiptFiles.map(async (item) => ({
            name: item.file.name,
            mimeType: item.file.type,
            base64: await toBase64(item.file),
          }))
        );
        const created = await saveAttachmentsMutation.mutateAsync({
          invoiceNo: String(receivingRecord.invoiceNo || (receivingRecord as any).orderNo || "收款单"),
          customerName: String(receivingRecord.customerName || ""),
          department: normalizeDepartmentForUpload("销售部"),
          files: filesPayload,
        });
        uploadedDocNos = (created || []).map((x: any) => String(x?.docNo || "")).filter(Boolean);
      }

      const sourceRemark = receivingRecord.remarks ?? (receivingRecord as any).remark;
      const currentMeta = getReconcileMeta(receivingRecord);
      const currentPlain = stripReconcileMeta(sourceRemark);
      const uploadedNames = receiptFiles.map((f) => f.file.name).join("、");
      const nextPlain = [
        currentPlain,
        receiptData.remarks ? `收款备注: ${receiptData.remarks}` : "",
        !isSalesCollaboration && serviceFeeAmount > 0 ? `手续费: ${getMoneyText(receivingRecord, serviceFeeAmount)}` : "",
        uploadedNames ? `收款附件: ${uploadedNames}` : "",
        uploadedDocNos.length > 0 ? `附件单据: ${uploadedDocNos.join("、")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim();
      if (isSalesCollaboration) {
        const todo: FinanceTodo = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: "open",
          amount: receiptAmount,
          serviceFee: serviceFeeAmount,
          paymentMethod: receiptData.paymentMethod,
          receiptDate: receiptData.receiptDate || new Date().toISOString().split("T")[0],
          remarks: receiptData.remarks || "",
          attachments: receiptFiles.map((item) => item.file.name),
          createdAt: new Date().toISOString(),
        };
        const existingTodos = parseFinanceTodoList(sourceRemark);
        const nextRemarkWithTodo = setFinanceTodoList(
          currentMeta ? buildRemarkWithReconcile(currentMeta, nextPlain) : nextPlain || sourceRemark || "",
          [...existingTodos, todo]
        );
        await updateMutation.mutateAsync({
          id: receivableId,
          data: {
            remark: nextRemarkWithTodo || undefined,
          },
        });
        toast.success(`已提交财务待办：${getMoneyText(receivingRecord, receiptAmount)}`);
      } else {
        let nextRemark = currentMeta ? buildRemarkWithReconcile(currentMeta, nextPlain) : nextPlain || undefined;
        const existingTodoList = parseFinanceTodoList(sourceRemark);
        if (existingTodoList.length > 0) {
          const receiptCompleted = nextReceived >= receivableAmount - 0.0001;
          const todoList = existingTodoList.map((todo) => {
            if (receiptCompleted) {
              return { ...todo, status: "done" as const };
            }
            if (activeTodoId && todo.id === activeTodoId) {
              return { ...todo, status: "done" as const };
            }
            return todo;
          });
          nextRemark = setFinanceTodoList(nextRemark || sourceRemark || "", todoList);
        }
        await updateMutation.mutateAsync({
          id: receivableId,
          data: {
            paidAmount: String(nextReceived),
            status: nextStatus,
            receiptDate: receiptData.receiptDate || new Date().toISOString().split("T")[0],
            paymentMethod: receiptData.paymentMethod,
            bankAccountId: receiptData.bankAccountId ? Number(receiptData.bankAccountId) : undefined,
            serviceFeeAmount: serviceFeeAmount > 0 ? String(serviceFeeAmount) : undefined,
            remark: nextRemark || undefined,
          },
        });
        toast.success(
          serviceFeeAmount > 0
            ? `已确认收款：${getMoneyText(receivingRecord, receiptAmount)}，到账 ${getMoneyText(receivingRecord, netReceiptAmount)}`
            : `已确认收款：${getMoneyText(receivingRecord, receiptAmount)}`
        );
      }
      setReceiptFiles([]);
      setActiveTodoId(null);
      setReceiptDialogOpen(false);
    } catch (error: any) {
      toast.error("提交失败", {
        description: toFriendlyErrorMessage(error),
      });
    }
  };

  const handleReconcileSubmit = async () => {
    if (!reconcilingRecord) return;
    const reconcileAmount = toSafeNumber(reconcileData.amount);
    const adjustedAmount = toSafeNumber(reconcileData.adjustedAmount || reconcilingRecord.amount);
    if (reconcileAmount <= 0) {
      toast.error("对账金额必须大于0");
      return;
    }
    const paidAmount = getReceivedAmount(reconcilingRecord);
    if (adjustedAmount < paidAmount) {
      toast.error("调整后总金额不能小于已收金额");
      return;
    }

    const meta = {
      amount: reconcileAmount,
      reconciledDate: reconcileData.reconciledDate || new Date().toISOString().split("T")[0],
      adjustedAmount,
    };
    const nextStatus = calcBackendStatus(adjustedAmount, paidAmount, reconcilingRecord.dueDate);
    const receivableId = Number((reconcilingRecord as any)?.id);
    if (!Number.isFinite(receivableId) || receivableId <= 0) {
      toast.error("对账失败", {
        description: "记录编号无效，请刷新页面后重试",
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: receivableId,
        data: {
          amount: String(adjustedAmount),
          status: nextStatus,
          remark: buildRemarkWithReconcile(meta, reconcileData.remarks),
        },
      });
      toast.success("对账已完成");
      setReconcileDialogOpen(false);
    } catch (error: any) {
      toast.error("对账失败", {
        description: toFriendlyErrorMessage(error),
      });
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const salesOrderLookups = useMemo(() => {
    const byNo = new Map<string, any>();
    const byId = new Map<number, any>();
    for (const order of salesOrders as any[]) {
      const key = String(order?.orderNo ?? "").trim();
      if (key) byNo.set(key, order);
      const idNum = Number(order?.id);
      if (Number.isFinite(idNum) && idNum > 0) byId.set(idNum, order);
    }
    return { byNo, byId };
  }, [salesOrders]);

  const resolvePaymentTerms = (r: any) => {
    const orderNo = String(r?.orderNo ?? "").trim();
    const salesOrderId = Number(r?.salesOrderId);
    const linkedOrder =
      (orderNo ? salesOrderLookups.byNo.get(orderNo) : undefined) ??
      (Number.isFinite(salesOrderId) && salesOrderId > 0 ? salesOrderLookups.byId.get(salesOrderId) : undefined);
    return String(linkedOrder?.paymentMethod ?? r?.paymentMethod ?? "");
  };
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  const resolveLinkedOrder = (r: any) => {
    const orderNo = String(r?.orderNo ?? "").trim();
    const salesOrderId = Number(r?.salesOrderId);
    return (
      (orderNo ? salesOrderLookups.byNo.get(orderNo) : undefined) ??
      (Number.isFinite(salesOrderId) && salesOrderId > 0 ? salesOrderLookups.byId.get(salesOrderId) : undefined)
    );
  };
  const getPrepayRatioDisplay = (r: any) => {
    const payment = normalizePaymentCondition(resolvePaymentTerms(r));
    if (payment !== "预付款") return "-";
    const linkedOrder = resolveLinkedOrder(r);
    const ratioFromOrder = parsePrepayRatioFromRemark(linkedOrder?.remark);
    if (Number.isFinite(ratioFromOrder)) return `${ratioFromOrder}%`;
    const text = String(r?.remark ?? r?.remarks ?? "");
    const matched = text.match(/预付款比例[：:]\s*(\d+(?:\.\d+)?)%?/);
    if (!matched) return "30%";
    const ratio = Number(matched[1]);
    return Number.isFinite(ratio) ? `${ratio}%` : "30%";
  };

  const isAccountPeriodCustomer = (r: any) => isAccountPeriodPaymentCondition(resolvePaymentTerms(r));
  const getReconcileMeta = (r: any) => parseReconcileMeta(r?.remark ?? r?.remarks);
  const isReconciled = (r: any) => Boolean(getReconcileMeta(r));
  const getDisplayStatus = (status: unknown) => {
    const normalized = normalizeStatus(status);
    return normalized === "overdue" ? "pending" : normalized;
  };
  const getOrderAmountRaw = (r: any) => {
    const order = resolveLinkedOrder(r);
    const currency = String(order?.currency ?? r?.currency ?? "CNY").toUpperCase();
    const amount = toSafeNumber(order?.totalAmount);
    return { currency, amount };
  };
  const getMoneyText = (r: any, amountRaw: unknown) => formatMoneyByCurrency(r?.currency, amountRaw);

  const handleSubmitFinanceFromDetail = async () => {
    if (!isSalesCollaboration || !viewingReceivable) return;
    if (!salesFinanceApprovalEnabled) {
      toast.error("审批未开启", { description: "请先开启销售部-财务协同审批流程" });
      return;
    }

    const target = viewingReceivable as any;
    const sourceOrder = resolveLinkedOrder(target);
    let receivableId = Number(target?.id);
    const hasPersistedReceivable = Number.isFinite(receivableId) && receivableId > 0 && !target?.synthetic;
    const pendingAmount = Math.max(0, getPendingAmount(target));
    if (pendingAmount <= 0) {
      toast.error("提交失败", { description: "当前记录无待收金额" });
      return;
    }

    try {
      if (!hasPersistedReceivable) {
        const customerId = Number(sourceOrder?.customerId);
        const salesOrderId = Number(sourceOrder?.id);
        if (!Number.isFinite(customerId) || customerId <= 0 || !Number.isFinite(salesOrderId) || salesOrderId <= 0) {
          toast.error("提交失败", { description: "缺少关联客户或订单信息，请先同步销售订单" });
          return;
        }
        receivableId = await createMutation.mutateAsync({
          invoiceNo: String(target?.invoiceNo || "").trim() || undefined,
          customerId,
          salesOrderId,
          amount: String(Math.max(0, getReceivableAmount(target))),
          currency: String(target?.currency || sourceOrder?.currency || "CNY"),
          amountBase: String(Math.max(0, getReceivableAmountBase(target))),
          exchangeRate: String(getRate(target)),
          dueDate: target?.dueDate ? String(target.dueDate) : undefined,
          paymentMethod: String(resolvePaymentTerms(target) || ""),
          remark: String(target?.remarks ?? target?.remark ?? ""),
        });
      }

      const filesToUpload = detailFiles;
      let uploadedDocNos: string[] = [];
      if (filesToUpload.length > 0) {
        const payload = await Promise.all(
          filesToUpload.map(async (item) => ({
            name: item.file.name,
            mimeType: item.file.type,
            base64: await toBase64(item.file),
          })),
        );
        const created = await saveAttachmentsMutation.mutateAsync({
          invoiceNo: String(target?.invoiceNo || target?.orderNo || "收款单"),
          customerName: String(target?.customerName || ""),
          department: normalizeDepartmentForUpload("销售部"),
          files: payload,
        });
        uploadedDocNos = (created || []).map((x: any) => String(x?.docNo || "")).filter(Boolean);
      }

      const baseRemark = String(target?.remarks ?? target?.remark ?? "");
      const currentMeta = getReconcileMeta(target);
      const plainRemark = stripReconcileMeta(baseRemark);
      const fileNames = filesToUpload.map((x) => x.file.name).join("、");
      const mergedPlain = [
        plainRemark,
        fileNames ? `收款附件: ${fileNames}` : "",
        uploadedDocNos.length > 0 ? `附件单据: ${uploadedDocNos.join("、")}` : "",
      ].filter(Boolean).join("\n").trim();

      const todo: FinanceTodo = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: "open",
        amount: pendingAmount,
        paymentMethod: "银行转账",
        receiptDate: new Date().toISOString().split("T")[0],
        remarks: "销售提交财务收款",
        attachments: filesToUpload.map((item) => item.file.name),
        createdAt: new Date().toISOString(),
      };

      const existingTodos = parseFinanceTodoList(baseRemark);
      const nextRemarkWithTodo = setFinanceTodoList(
        currentMeta ? buildRemarkWithReconcile(currentMeta, mergedPlain) : mergedPlain || baseRemark || "",
        [...existingTodos, todo],
      );

      await updateMutation.mutateAsync({
        id: receivableId,
        data: {
          status: "pending",
          remark: nextRemarkWithTodo || undefined,
        },
      });

      setDetailFiles([]);
      setViewDialogOpen(false);
      await refetch();
      toast.success("已提交财务，财务待办已生成");
    } catch (error: any) {
      toast.error("提交失败", {
        description: toFriendlyErrorMessage(error),
      });
    }
  };

  const existingLinkedOrderIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of receivables) {
      const salesOrderId = Number((r as any)?.salesOrderId);
      if (Number.isFinite(salesOrderId) && salesOrderId > 0) ids.add(salesOrderId);
      const orderNo = String((r as any)?.orderNo ?? "").trim();
      if (orderNo) {
        const linked = salesOrderLookups.byNo.get(orderNo);
        const linkedId = Number(linked?.id);
        if (Number.isFinite(linkedId) && linkedId > 0) ids.add(linkedId);
      }
    }
    return ids;
  }, [receivables, salesOrderLookups]);

  const fallbackReceivables = useMemo(() => {
    return (salesOrders as any[]).flatMap((order: any) => {
      const id = Number(order?.id);
      if (!Number.isFinite(id) || id <= 0) return [];
      if (existingLinkedOrderIds.has(id)) return [];
      if (String(order?.status || "") === "cancelled") return [];

      const paymentMethod = normalizePaymentCondition(order?.paymentMethod);
      const prepayRatio = paymentMethod === "预付款" ? parsePrepayRatioFromRemark(order?.remark) : 100;
      const ratio = prepayRatio / 100;
      const totalAmount = toSafeNumber(order?.totalAmount);
      const rate = toSafeNumber(order?.exchangeRate) > 0 ? toSafeNumber(order?.exchangeRate) : 1;
      const totalBase = toSafeNumber(order?.totalAmountBase) > 0 ? toSafeNumber(order?.totalAmountBase) : totalAmount * rate;
      const receivableAmount = totalAmount * ratio;
      const receivableBase = totalBase * ratio;
      if (receivableAmount <= 0 && receivableBase <= 0) return [];
      const dueDate =
        paymentMethod === "账期支付" ? (order?.deliveryDate ?? order?.orderDate) : order?.orderDate;
      const due = new Date(String(dueDate || ""));
      const status = !Number.isNaN(due.getTime()) && due < todayStart ? "overdue" : "pending";
      return [{
        id: `so-${id}`,
        synthetic: true,
        invoiceNo: "",
        customerName: String(order?.customerName ?? `客户#${order?.customerId ?? "-"}`),
        orderNo: String(order?.orderNo ?? ""),
        amount: receivableAmount,
        paidAmount: 0,
        currency: String(order?.currency ?? "CNY"),
        amountBase: receivableBase,
        exchangeRate: rate,
        paymentMethod,
        dueDate,
        status,
        remark: paymentMethod === "预付款" ? `预付款比例：${prepayRatio}%` : String(order?.remark ?? ""),
        salesOrderId: id,
      }];
    });
  }, [salesOrders, existingLinkedOrderIds]);

  const displayReceivables = useMemo(() => {
    const all = [...receivables, ...fallbackReceivables];
    // 财务协同页面只显示非账期支付的应收（预付款/先款后货/货到付款）
    if (isSalesCollaboration) {
      return all.filter((r: any) => !isAccountPeriodPaymentCondition(normalizePaymentCondition(resolvePaymentTerms(r))));
    }
    return all;
  }, [receivables, fallbackReceivables, isSalesCollaboration]);

  useEffect(() => {
    if (hasHandledFocusParam) return;
    const params = new URLSearchParams(window.location.search);
    const focusId = Number(params.get("focusId") || "");
    const todoId = String(params.get("todoId") || "").trim();
    if (!Number.isFinite(focusId) || focusId <= 0) {
      setHasHandledFocusParam(true);
      return;
    }
    const record = displayReceivables.find((item: any) => Number(item?.id) === focusId) as ReceivableRecord | undefined;
    if (!record) return;
    setHasHandledFocusParam(true);
    if (todoId && !isSalesCollaboration) {
      const todo = parseFinanceTodoList((record as any)?.remark ?? (record as any)?.remarks).find((x) => x.id === todoId);
      if (todo) {
        handleReceiveFromTodo(record, todo);
      } else {
        handleView(record);
      }
    } else {
      handleView(record);
    }
    params.delete("focusId");
    params.delete("todoId");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [displayReceivables, hasHandledFocusParam, isSalesCollaboration]);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const filteredReceivables = useMemo(() => {
    if (statusFilter === "all") return displayReceivables;
    if (statusFilter === "active") {
      return displayReceivables.filter((r: any) => {
        const s = normalizeStatus(r.status);
        return s !== "received" && s !== "paid";
      });
    }
    return displayReceivables.filter((r: any) => normalizeStatus(r.status) === statusFilter);
  }, [displayReceivables, statusFilter]);

  const totalAmount = displayReceivables.reduce((sum: number, r: any) => sum + getReceivableAmountBase(r), 0);
  const receivedAmount = displayReceivables.reduce((sum: number, r: any) => sum + getReceivedAmountBase(r), 0);
  const pendingAmount = Math.max(0, totalAmount - receivedAmount);
  const overdueAmount = displayReceivables
    .filter((r: any) => normalizeStatus(r.status) === "overdue")
    .reduce((sum: number, r: any) => sum + getPendingAmountBase(r), 0);
  const receivableCurrencySummary = Object.entries(
    displayReceivables.reduce((acc: Record<string, number>, r: any) => {
      const currency = String(r?.currency || "CNY").toUpperCase();
      acc[currency] = (acc[currency] || 0) + getReceivableAmount(r);
      return acc;
    }, {})
  ).sort((a, b) => {
    if (a[0] === "CNY") return -1;
    if (b[0] === "CNY") return 1;
    return b[1] - a[1];
  });
  const receivedCurrencySummary = Object.entries(
    displayReceivables.reduce((acc: Record<string, number>, r: any) => {
      const currency = String(r?.currency || "CNY").toUpperCase();
      acc[currency] = (acc[currency] || 0) + getReceivedAmount(r);
      return acc;
    }, {})
  ).sort((a, b) => {
    if (a[0] === "CNY") return -1;
    if (b[0] === "CNY") return 1;
    return b[1] - a[1];
  });
  const pendingCurrencySummary = Object.entries(
    displayReceivables.reduce((acc: Record<string, number>, r: any) => {
      const currency = String(r?.currency || "CNY").toUpperCase();
      acc[currency] = (acc[currency] || 0) + Math.max(0, getPendingAmount(r));
      return acc;
    }, {})
  ).sort((a, b) => {
    if (a[0] === "CNY") return -1;
    if (b[0] === "CNY") return 1;
    return b[1] - a[1];
  });
  const laterCurrencySummary = Object.entries(
    displayReceivables
      .filter((r: any) => normalizeStatus(r.status) === "overdue")
      .reduce((acc: Record<string, number>, r: any) => {
        const currency = String(r?.currency || "CNY").toUpperCase();
        acc[currency] = (acc[currency] || 0) + Math.max(0, getPendingAmount(r));
        return acc;
      }, {})
  ).sort((a, b) => {
    if (a[0] === "CNY") return -1;
    if (b[0] === "CNY") return 1;
    return b[1] - a[1];
  });
  const cashRows = filteredReceivables.filter((r: any) => !isAccountPeriodCustomer(r));
  const accountRows = filteredReceivables.filter((r: any) => isAccountPeriodCustomer(r));
  const accountCustomerRows = useMemo(() => {
    const grouped = new Map<string, any>();

    for (const receivable of accountRows) {
      const customerId = Number(receivable?.customerId);
      const customerName = String(receivable?.customerName || `客户#${customerId || "-"}`);
      const key = Number.isFinite(customerId) && customerId > 0 ? `customer:${customerId}` : `name:${customerName}`;
      const current = grouped.get(key) ?? {
        id: key,
        customerId: Number.isFinite(customerId) && customerId > 0 ? customerId : 0,
        customerName,
        receivableRows: [] as any[],
        receivableCount: 0,
        receivableAmountBase: 0,
        receivedAmountBase: 0,
        pendingAmountBase: 0,
        reconcileMonths: new Set<string>(),
        earliestDueDate: "",
        hasAnyReconciled: false,
        allReconciled: true,
        hasOverdue: false,
      };

      current.receivableRows.push(receivable);
      current.receivableCount += 1;
      current.receivableAmountBase += getReceivableAmountBase(receivable);
      current.receivedAmountBase += getReceivedAmountBase(receivable);
      current.pendingAmountBase += Math.max(0, getPendingAmountBase(receivable));

      const reconcileMonth = getReconcileMonth(getReconcileMeta(receivable));
      if (reconcileMonth) current.reconcileMonths.add(reconcileMonth);

      const dueDate = normalizeDateOnly(receivable?.dueDate);
      if (dueDate && (!current.earliestDueDate || dueDate < current.earliestDueDate)) {
        current.earliestDueDate = dueDate;
      }

      const reconciled = isReconciled(receivable);
      current.hasAnyReconciled = current.hasAnyReconciled || reconciled;
      current.allReconciled = current.allReconciled && reconciled;
      current.hasOverdue = current.hasOverdue || normalizeStatus(receivable?.status) === "overdue";

      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .map((row) => {
        const reconcileMonths = Array.from(row.reconcileMonths).sort();
        const reconcileMonth =
          reconcileMonths.length === 0
            ? ""
            : reconcileMonths.length === 1
              ? reconcileMonths[0]
              : `${reconcileMonths[0]}等${reconcileMonths.length}月`;
        const reconcileStatus = row.allReconciled ? "已对账" : row.hasAnyReconciled ? "部分对账" : "未对账";
        const invoiceStatus = row.allReconciled ? "可开票" : "待对账";
        const status =
          row.pendingAmountBase <= 0 && row.receivableAmountBase > 0
            ? "received"
            : row.receivedAmountBase > 0
              ? "partial"
              : row.hasOverdue
                ? "overdue"
                : "pending";

        return {
          ...row,
          reconcileMonth,
          reconcileStatus,
          invoiceStatus,
          status,
        };
      })
      .sort((a, b) => String(a.customerName || "").localeCompare(String(b.customerName || ""), "zh-CN"));
  }, [accountRows]);
  const effectiveBizMode: "cash" | "account" = isSalesCollaboration ? "cash" : bizMode;
  const currentRows = effectiveBizMode === "cash" ? cashRows : accountCustomerRows;
  const totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
  const pagedRows = currentRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cashTotalBase = cashRows.reduce((sum: number, r: any) => sum + getReceivableAmountBase(r), 0);
  const cashReceivedBase = cashRows.reduce((sum: number, r: any) => sum + getReceivedAmountBase(r), 0);
  const cashPendingBase = Math.max(0, cashTotalBase - cashReceivedBase);
  const accountTotalBase = accountRows.reduce((sum: number, r: any) => sum + getReceivableAmountBase(r), 0);
  const accountReceivedBase = accountRows.reduce((sum: number, r: any) => sum + getReceivedAmountBase(r), 0);
  const accountPendingBase = Math.max(0, accountTotalBase - accountReceivedBase);
  const accountPendingReconcileCount = accountCustomerRows.filter((r: any) => r.reconcileStatus !== "已对账").length;
  const accountReadyInvoiceRows = accountCustomerRows.filter((r: any) => r.reconcileStatus === "已对账");
  const accountReadyInvoiceBase = accountReadyInvoiceRows.reduce((sum: number, r: any) => sum + toSafeNumber(r.receivableAmountBase), 0);

  const calcBackendStatus = (amount: number, paid: number, dueDate?: unknown): "pending" | "partial" | "paid" | "overdue" => {
    if (paid >= amount && amount > 0) return "paid";
    if (paid > 0) return "partial";
    const due = new Date(String(dueDate ?? ""));
    if (!Number.isNaN(due.getTime()) && due < todayStart) return "overdue";
    return "pending";
  };

  const salesFinanceApprovalEnabled = Boolean((salesFinanceFormMeta as any)?.approvalEnabled);

  useEffect(() => {
    setCurrentPage(1);
  }, [bizMode, statusFilter, location]);

  useEffect(() => {
    if (isSalesCollaboration) {
      if (bizMode !== "cash") setBizMode("cash");
      return;
    }
    if (bizMode === "cash" && cashRows.length === 0 && accountRows.length > 0) {
      setBizMode("account");
      return;
    }
    if (bizMode === "account" && accountRows.length === 0 && cashRows.length > 0) {
      setBizMode("cash");
    }
  }, [bizMode, cashRows.length, accountRows.length, isSalesCollaboration]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleToggleSalesFinanceApproval = async () => {
    if (!isAdmin || !isSalesCollaboration) return;
    await setFormApprovalEnabledMutation.mutateAsync({
      module: "销售部",
      formType: "协同流程",
      formName: "财务协同",
      path: "/sales/finance-collaboration",
      approvalEnabled: !salesFinanceApprovalEnabled,
    });
    await trpcUtils.workflowSettings.getFormCatalogItem.invalidate({
      module: "销售部",
      formType: "协同流程",
      formName: "财务协同",
    });
    await trpcUtils.workflowSettings.formCatalog.invalidate();
    toast.success(!salesFinanceApprovalEnabled ? "已开启审批流程" : "已关闭审批流程");
  };

  const handleApplyInvoice = (customerRow: any) => {
    const params = new URLSearchParams();
    if (Number(customerRow?.customerId) > 0) params.set("customerId", String(customerRow.customerId));
    if (customerRow?.customerName) params.set("customerName", String(customerRow.customerName));
    if (customerRow?.reconcileMonth) params.set("reconcileMonth", String(customerRow.reconcileMonth));
    setLocation(`/finance/invoice${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{isSalesCollaboration ? "财务协同" : "应收管理"}</h2>
              <p className="text-sm text-muted-foreground">
                {isSalesCollaboration ? "销售提交流程，财务统一处理收款" : "管理销售发票、应收账款和收款核销"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSalesCollaboration && isAdmin && (
              <Button
                variant={salesFinanceApprovalEnabled ? "default" : "outline"}
                onClick={handleToggleSalesFinanceApproval}
                disabled={setFormApprovalEnabledMutation.isPending}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                {salesFinanceApprovalEnabled ? "审批已开启" : "开启审批"}
              </Button>
            )}
            <Button variant="outline" onClick={handleSyncSalesOrders} disabled={syncMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              同步销售订单
            </Button>
            {!isSalesCollaboration && (
              <>
                <Button variant="outline" onClick={() => handleAdd("opening")}>
                  <Plus className="h-4 w-4 mr-1" />
                  新增期初应收
                </Button>
                <Button onClick={() => handleAdd("normal")}>
                  <Plus className="h-4 w-4 mr-1" />
                  新建收款
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 items-start">
          <Card>
            <CardContent className="p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">应收总额</p>
                <Badge variant="outline" className="text-[10px]">本位币</Badge>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold leading-none">¥{formatNumber(totalAmount / 10000)}万</p>
              </div>
              <div className="border-t border-dashed" />
              <p className="text-[11px] text-muted-foreground">多币种汇总</p>
              <div className="space-y-0.5">
                {receivableCurrencySummary.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">-</div>
                ) : (
                  receivableCurrencySummary.map(([currency, amount], index) => (
                    <div key={`${currency}-${index}`} className="text-[11px] leading-tight flex items-center justify-between">
                      <span className="font-medium tracking-wide">{currency}</span>
                      <span className="font-medium">
                        {getCurrencySymbol(currency)}
                        {formatNumber(amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">已收金额</p>
                <Badge variant="outline" className="text-[10px]">本位币</Badge>
              </div>
              <p className="text-2xl font-bold leading-none text-green-600">
                ¥{formatNumber(receivedAmount / 10000)}万
                <span className="text-[11px] text-muted-foreground ml-1">(本位币)</span>
              </p>
              <div className="border-t border-dashed" />
              <p className="text-[11px] text-muted-foreground">多币种汇总</p>
              <div className="space-y-0.5">
                {receivedCurrencySummary.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">-</div>
                ) : (
                  receivedCurrencySummary.map(([currency, amount], index) => (
                    <div key={`${currency}-${index}`} className="text-[11px] leading-tight flex items-center justify-between">
                      <span className="font-medium tracking-wide">{currency}</span>
                      <span className="font-medium">
                        {getCurrencySymbol(currency)}
                        {formatNumber(amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">待收金额</p>
                <Badge variant="outline" className="text-[10px]">本位币</Badge>
              </div>
              <p className="text-2xl font-bold leading-none text-amber-600">
                ¥{formatNumber(pendingAmount / 10000)}万
                <span className="text-[11px] text-muted-foreground ml-1">(本位币)</span>
              </p>
              <div className="border-t border-dashed" />
              <p className="text-[11px] text-muted-foreground">多币种汇总</p>
              <div className="space-y-0.5">
                {pendingCurrencySummary.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">-</div>
                ) : (
                  pendingCurrencySummary.map(([currency, amount], index) => (
                    <div key={`${currency}-${index}`} className="text-[11px] leading-tight flex items-center justify-between">
                      <span className="font-medium tracking-wide">{currency}</span>
                      <span className="font-medium">
                        {getCurrencySymbol(currency)}
                        {formatNumber(amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">后续代收</p>
                <Badge variant="outline" className="text-[10px]">本位币</Badge>
              </div>
              <p className="text-2xl font-bold leading-none text-red-600">
                ¥{formatNumber(overdueAmount / 10000)}万
                <span className="text-[11px] text-muted-foreground ml-1">(本位币)</span>
              </p>
              <div className="border-t border-dashed" />
              <p className="text-[11px] text-muted-foreground">多币种汇总</p>
              <div className="space-y-0.5">
                {laterCurrencySummary.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">-</div>
                ) : (
                  laterCurrencySummary.map(([currency, amount], index) => (
                    <div key={`${currency}-${index}`} className="text-[11px] leading-tight flex items-center justify-between">
                      <span className="font-medium tracking-wide">{currency}</span>
                      <span className="font-medium">
                        {getCurrencySymbol(currency)}
                        {formatNumber(amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 业务模式 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={effectiveBizMode === "cash" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBizMode("cash")}
                >
                  现款应收（{cashRows.length}）
                </Button>
                {!isSalesCollaboration && (
                  <Button
                    variant={effectiveBizMode === "account" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBizMode("account")}
                  >
                    账期支付（{accountRows.length}）
                  </Button>
                )}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">待处理</SelectItem>
                  <SelectItem value="pending">待收款</SelectItem>
                  <SelectItem value="partial">部分收款</SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
                  <SelectItem value="all">全部</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-4 mt-4">
              {effectiveBizMode === "cash" ? (
                <>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">现款应收总额</p>
                    <p className="text-xl font-bold">¥{formatNumber(cashTotalBase / 10000)}万</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">现款已收</p>
                    <p className="text-xl font-bold text-green-600">¥{formatNumber(cashReceivedBase / 10000)}万</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">现款待收</p>
                    <p className="text-xl font-bold text-amber-600">¥{formatNumber(cashPendingBase / 10000)}万</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">账期应收总额</p>
                    <p className="text-xl font-bold">¥{formatNumber(accountTotalBase / 10000)}万</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">账期待收</p>
                    <p className="text-xl font-bold text-amber-600">¥{formatNumber(accountPendingBase / 10000)}万</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">待对账客户</p>
                    <p className="text-xl font-bold text-red-600">{accountPendingReconcileCount}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">已对账可开票</p>
                    <p className="text-xl font-bold text-emerald-600">{accountReadyInvoiceRows.length} 客户</p>
                    <p className="text-xs text-muted-foreground mt-1">¥{formatNumber(accountReadyInvoiceBase / 10000)}万</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  {effectiveBizMode === "cash" ? (
                    <>
                      <TableHead className="w-[130px] text-center font-bold">订单号</TableHead>
                      <TableHead className="text-center font-bold">客户名称</TableHead>
                      <TableHead className="w-[120px] text-center font-bold">订单金额</TableHead>
                      <TableHead className="w-[110px] text-center font-bold">应收金额</TableHead>
                      <TableHead className="w-[110px] text-center font-bold">已收金额</TableHead>
                      <TableHead className="w-[110px] text-center font-bold">付款条件</TableHead>
                      <TableHead className="w-[90px] text-center font-bold">比例</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">到期日</TableHead>
                      <TableHead className="w-[90px] text-center font-bold">状态</TableHead>
                      <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-center font-bold">客户名称</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">账期笔数</TableHead>
                      <TableHead className="w-[120px] text-center font-bold">应收金额</TableHead>
                      <TableHead className="w-[110px] text-center font-bold">已收金额</TableHead>
                      <TableHead className="w-[110px] text-center font-bold">待收金额</TableHead>
                      <TableHead className="w-[90px] text-center font-bold">对账</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">对账月份</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">开票状态</TableHead>
                      <TableHead className="w-[110px] text-center font-bold">最近到期日</TableHead>
                      <TableHead className="w-[90px] text-center font-bold">状态</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">操作</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={effectiveBizMode === "account" ? 11 : 10} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : effectiveBizMode === "cash" ? (
                  pagedRows.map((receivable: any) => (
                    <TableRow key={receivable.id}>
                      <TableCell className="text-center font-medium">{receivable.orderNo || "-"}</TableCell>
                      <TableCell className="text-center">{receivable.customerName}</TableCell>
                      <TableCell className="text-center">
                        {getCurrencySymbol(getOrderAmountRaw(receivable).currency)}
                        {formatNumber(getOrderAmountRaw(receivable).amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getCurrencySymbol(receivable.currency)}
                        {formatNumber(getReceivableAmount(receivable))}
                      </TableCell>
                      <TableCell className="text-center">
                        {getCurrencySymbol(receivable.currency)}
                        {formatNumber(getReceivedAmount(receivable))}
                      </TableCell>
                      <TableCell className="text-center">{normalizePaymentCondition(resolvePaymentTerms(receivable)) || "-"}</TableCell>
                      <TableCell className="text-center">{getPrepayRatioDisplay(receivable)}</TableCell>
                      <TableCell className="text-center">{formatDateValue(receivable.dueDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getStatusMeta(getDisplayStatus(receivable.status)).variant}
                          className={getStatusSemanticClass(getDisplayStatus(receivable.status), getStatusMeta(getDisplayStatus(receivable.status)).label)}
                        >
                          {getStatusMeta(getDisplayStatus(receivable.status)).label}
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
                            <DropdownMenuItem onClick={() => handleView(receivable)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            {!receivable.synthetic && (
                              <DropdownMenuItem onClick={() => handleEdit(receivable)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                            )}
                            {!receivable.synthetic && normalizeStatus(receivable.status) !== "received" && (
                              <DropdownMenuItem onClick={() => handleReceive(receivable)}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                {isSalesCollaboration ? "提交财务" : "收款登记"}
                              </DropdownMenuItem>
                            )}
                            {!receivable.synthetic && canDelete && !isSalesCollaboration && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(receivable)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            )}
                            {receivable.synthetic && (
                              <DropdownMenuItem disabled>
                                待同步应收（只读）
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  pagedRows.map((customerRow: any) => (
                    <TableRow key={customerRow.id}>
                      <TableCell className="text-center font-medium">{customerRow.customerName || "-"}</TableCell>
                      <TableCell className="text-center">{customerRow.receivableCount}</TableCell>
                      <TableCell className="text-center">{formatMoneyByCurrency("CNY", customerRow.receivableAmountBase)}</TableCell>
                      <TableCell className="text-center text-green-600">{formatMoneyByCurrency("CNY", customerRow.receivedAmountBase)}</TableCell>
                      <TableCell className="text-center text-amber-600">{formatMoneyByCurrency("CNY", customerRow.pendingAmountBase)}</TableCell>
                      <TableCell className="text-center">
                        {customerRow.reconcileStatus === "已对账" ? (
                          <Badge variant="default" className={getStatusSemanticClass("done", "已对账")}>已对账</Badge>
                        ) : customerRow.reconcileStatus === "部分对账" ? (
                          <Badge variant="secondary">部分对账</Badge>
                        ) : (
                          <Badge variant="outline" className={getStatusSemanticClass("pending", "未对账")}>未对账</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{customerRow.reconcileMonth || "-"}</TableCell>
                      <TableCell className="text-center">
                        {customerRow.invoiceStatus === "可开票" ? (
                          <Badge variant="default" className={getStatusSemanticClass("done", "可开票")}>可开票</Badge>
                        ) : (
                          <Badge variant="outline">待对账</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{formatDateValue(customerRow.earliestDueDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getStatusMeta(getDisplayStatus(customerRow.status)).variant}
                          className={getStatusSemanticClass(getDisplayStatus(customerRow.status), getStatusMeta(getDisplayStatus(customerRow.status)).label)}
                        >
                          {getStatusMeta(getDisplayStatus(customerRow.status)).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {customerRow.reconcileStatus === "已对账" ? (
                          <Button size="sm" onClick={() => handleApplyInvoice(customerRow)}>
                            开票申请
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePaginationFooter
              total={currentRows.length}
              page={currentPage}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingReceivable ? (entryMode === "opening" ? "编辑期初应收" : "编辑应收记录") : (entryMode === "opening" ? "新增期初应收" : "新建应收记录")}
              </DialogTitle>
              <DialogDescription>
                {editingReceivable ? "修改应收账款信息" : (entryMode === "opening" ? "录入上线前未收回的历史应收余额" : "创建新的应收账款记录")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>发票号</Label>
                  <Input
                    value={formData.invoiceNo}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    placeholder="保存后系统生成"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label>订单号</Label>
                  <Input
                    value={formData.orderNo}
                    onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                    placeholder="关联订单号"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>客户名称 *</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={formData.customerName}
                    placeholder="点击选择客户"
                    className="flex-1 cursor-pointer"
                    onClick={() => setCustomerPickerOpen(true)}
                  />
                  <Button type="button" variant="outline" onClick={() => setCustomerPickerOpen(true)}>
                    选择
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>应收金额 *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{entryMode === "opening" ? "期初日期" : "单据日期"}</Label>
                  <Input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>到期日</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                {entryMode === "opening" ? (
                  <div className="space-y-2">
                    <Label>所属期间</Label>
                    <Input
                      type="month"
                      value={formData.periodMonth}
                      onChange={(e) => setFormData({ ...formData, periodMonth: e.target.value })}
                    />
                  </div>
                ) : (
                  <div />
                )}
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingReceivable ? "保存修改" : "创建记录"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={customerPickerOpen}
          onOpenChange={setCustomerPickerOpen}
          title="选择客户"
          searchPlaceholder="搜索客户编码、客户名称、联系人..."
          columns={[
            { key: "code", title: "客户编码", render: (customer) => <span className="font-mono font-medium">{customer.code}</span> },
            { key: "name", title: "客户名称", render: (customer) => <span className="font-medium">{customer.name}</span> },
            { key: "contactPerson", title: "联系人", render: (customer) => <span>{customer.contactPerson || "-"}</span> },
            { key: "phone", title: "联系电话", render: (customer) => <span>{customer.phone || "-"}</span> },
          ]}
          rows={customers as any[]}
          selectedId={formData.customerId || ""}
          filterFn={(customer, q) => {
            const lower = q.toLowerCase();
            return String(customer.code || "").toLowerCase().includes(lower)
              || String(customer.name || "").toLowerCase().includes(lower)
              || String(customer.contactPerson || "").toLowerCase().includes(lower);
          }}
          onSelect={(customer) => {
            setFormData((prev) => ({
              ...prev,
              customerId: Number(customer.id || 0),
              customerName: String(customer.name || ""),
            }));
            setCustomerPickerOpen(false);
          }}
        />

        {/* 对账对话框 */}
        <DraggableDialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>账期对账</DialogTitle>
              <DialogDescription>
                {reconcilingRecord?.invoiceNo} - {reconcilingRecord?.customerName}
              </DialogDescription>
            </DialogHeader>
            {reconcilingRecord && (
              <div className="grid gap-4 py-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>当前应收金额</span>
                    <span className="font-medium">{getMoneyText(reconcilingRecord, getReceivableAmount(reconcilingRecord))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>已收金额</span>
                    <span className="font-medium text-green-600">{getMoneyText(reconcilingRecord, getReceivedAmount(reconcilingRecord))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>待收金额</span>
                    <span className="font-medium text-amber-600">{getMoneyText(reconcilingRecord, getPendingAmount(reconcilingRecord))}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>对账金额 *</Label>
                    <Input
                      type="number"
                      value={reconcileData.amount}
                      onChange={(e) => setReconcileData({ ...reconcileData, amount: e.target.value })}
                      placeholder="默认 1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>对账日期</Label>
                    <Input
                      type="date"
                      value={reconcileData.reconciledDate}
                      onChange={(e) => setReconcileData({ ...reconcileData, reconciledDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>对账后应收总金额</Label>
                  <Input
                    type="number"
                    value={reconcileData.adjustedAmount}
                    onChange={(e) => setReconcileData({ ...reconcileData, adjustedAmount: e.target.value })}
                    placeholder="可按对账结果调整总金额"
                  />
                </div>

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={reconcileData.remarks}
                    onChange={(e) => setReconcileData({ ...reconcileData, remarks: e.target.value })}
                    placeholder="对账差异说明"
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReconcileDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleReconcileSubmit}>
                确认对账
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 收款对话框 */}
        <DraggableDialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isSalesCollaboration ? "提交财务" : "收款登记"}</DialogTitle>
              <DialogDescription>
                {isSalesCollaboration
                  ? "销售确认客户已付款后，提交财务核对到账"
                  : `${receivingRecord?.invoiceNo} - ${receivingRecord?.customerName}`}
              </DialogDescription>
            </DialogHeader>
            {receivingRecord && (
              <div className="grid gap-4 py-4">
                {(() => {
                  const receiptAmount = toSafeNumber(receiptData.amount);
                  const serviceFeeAmount = isSalesCollaboration ? 0 : toSafeNumber(receiptData.serviceFee);
                  const netReceiptAmount = Math.max(0, receiptAmount - serviceFeeAmount);
                  const remainingAmount = Math.max(0, getPendingAmount(receivingRecord) - receiptAmount);
                  return (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>订单金额</span>
                    <span className="font-medium">{getMoneyText(receivingRecord, getReceivableAmount(receivingRecord))}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>已收金额</span>
                    <span className="font-medium">{getMoneyText(receivingRecord, getReceivedAmount(receivingRecord))}</span>
                  </div>
                  {!isSalesCollaboration && serviceFeeAmount > 0 && (
                    <div className="flex justify-between mt-1 text-muted-foreground">
                      <span>手续费</span>
                      <span className="font-medium">{getMoneyText(receivingRecord, serviceFeeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between mt-1 text-primary">
                    <span>{isSalesCollaboration ? "本次提交金额" : "本次到账"}</span>
                    <span className="font-medium">{getMoneyText(receivingRecord, isSalesCollaboration ? receiptAmount : netReceiptAmount)}</span>
                  </div>
                  <div className="flex justify-between mt-1 text-amber-600">
                    <span>后续代收</span>
                    <span className="font-medium">{getMoneyText(receivingRecord, remainingAmount)}</span>
                  </div>
                </div>
                  );
                })()}

                <div className={`grid gap-4 ${isSalesCollaboration ? "md:grid-cols-4" : "md:grid-cols-5"}`}>
                  <div className="space-y-2">
                    <Label>{isSalesCollaboration ? "本次提交金额 *" : "本次收款金额 *"}</Label>
                    <Input
                      type="number"
                      value={receiptData.amount}
                      onChange={(e) => setReceiptData({ ...receiptData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>收款方式</Label>
                    <Select
                      value={receiptData.paymentMethod}
                      onValueChange={(value) => setReceiptData({ ...receiptData, paymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="银行转账">银行转账</SelectItem>
                        <SelectItem value="支票">支票</SelectItem>
                        <SelectItem value="现金">现金</SelectItem>
                        <SelectItem value="承兑汇票">承兑汇票</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>收款日期</Label>
                    <Input
                      type="date"
                      value={receiptData.receiptDate}
                      onChange={(e) => setReceiptData({ ...receiptData, receiptDate: e.target.value })}
                    />
                  </div>

                  {!isSalesCollaboration && (
                    <div className="space-y-2">
                      <Label>手续费</Label>
                      <Input
                        type="number"
                        value={receiptData.serviceFee}
                        onChange={(e) => setReceiptData({ ...receiptData, serviceFee: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>收款银行账户</Label>
                    <Select
                      value={receiptData.bankAccountId}
                      onValueChange={(value) => setReceiptData({ ...receiptData, bankAccountId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择收款银行账户" />
                      </SelectTrigger>
                      <SelectContent>
                        {(bankAccounts as any[]).map((ba: any) => (
                          <SelectItem key={ba.id} value={String(ba.id)}>
                            {formatBankAccountDisplay(ba)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={receiptData.remarks}
                    onChange={(e) => setReceiptData({ ...receiptData, remarks: e.target.value })}
                    placeholder="收款备注"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>附件上传（支持图片 / PDF / 文档）</Label>
                  <div
                    className={`rounded-md border border-dashed p-4 transition-colors ${receiptDragging ? "border-primary bg-primary/5" : "border-border"}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setReceiptDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setReceiptDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setReceiptDragging(false);
                      appendReceiptFiles(e.dataTransfer.files);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept={ATTACHMENT_ACCEPT}
                      onChange={(e) => {
                        if (e.target.files) appendReceiptFiles(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">拖拽文件到此处，或点击右侧按钮本地上传</div>
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        本地上传
                      </Button>
                    </div>
                    {receiptFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {receiptFiles.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1.5 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{item.file.name}</span>
                            </div>
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeReceiptFile(item.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleReceiptSubmit} disabled={updateMutation.isPending || saveAttachmentsMutation.isPending}>
                {isSalesCollaboration ? "提交财务" : "确认收款"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {
/* 查看详情 */
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingReceivable && (
              <div className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">应收详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingReceivable.invoiceNo}
            {viewingReceivable.status && (
              <> · <Badge variant={statusMap[viewingReceivable.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingReceivable.status, statusMap[viewingReceivable.status]?.label)}`}>
                {statusMap[viewingReceivable.status]?.label || String(viewingReceivable.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="客户名称">{viewingReceivable.customerName}</FieldRow>
              <FieldRow label="订单号">{viewingReceivable.orderNo}</FieldRow>
              <FieldRow label="应收金额">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={viewAmount}
                    onChange={(e) => setViewAmount(e.target.value)}
                    className="h-8 w-32 text-right"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const idNum = Number((viewingReceivable as any).id);
                      if (!Number.isFinite(idNum) || idNum <= 0) {
                        toast.error("保存失败", { description: "记录编号无效" });
                        return;
                      }
                      const nextAmount = toSafeNumber(viewAmount);
                      if (nextAmount <= 0) {
                        toast.error("保存失败", { description: "金额必须大于0" });
                        return;
                      }
                      await updateMutation.mutateAsync({
                        id: idNum,
                        data: { amount: String(nextAmount) },
                      });
                      setViewingReceivable({ ...(viewingReceivable as any), amount: nextAmount } as any);
                      toast.success("应收金额已更新");
                    }}
                  >
                    保存
                  </Button>
                </div>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="已收金额">{formatMoneyByCurrency(viewingReceivable.currency, getReceivedAmount(viewingReceivable))}</FieldRow>
              <FieldRow label="待收金额">{formatMoneyByCurrency(viewingReceivable.currency, getPendingAmount(viewingReceivable))}</FieldRow>
              <FieldRow label="到期日">{formatDateValue(viewingReceivable.dueDate)}</FieldRow>
            </div>
          </div>
        </div>

        {(viewingReceivable.remarks) && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{stripReconcileMeta(viewingReceivable.remarks)}</p>
          </div>
        )}

        {/* 附件底单上传 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">附件底单</h3>
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
              detailDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDetailDragging(true); }}
            onDragLeave={() => setDetailDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDetailDragging(false);
              const files = e.dataTransfer.files;
              if (files.length > 0) appendDetailFiles(files);
            }}
            onClick={() => document.getElementById('detail-file-input')?.click()}
          >
            <input
              id="detail-file-input"
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(e) => { if (e.target.files) appendDetailFiles(e.target.files); e.target.value = ""; }}
            />
            <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">拖拽文件到此处，或点击选择文件</p>
            <p className="text-xs text-muted-foreground mt-0.5">支持 PDF、图片、Excel、Word 等格式</p>
          </div>
          {detailFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {detailFiles.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1.5 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{item.file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDisplayNumber(item.file.size / 1024, { maximumFractionDigits: 0 })} KB</span>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setDetailFiles(prev => prev.filter(x => x.id !== item.id))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(viewingReceivable)}>编辑</Button>
            {isSalesCollaboration && normalizeStatus(viewingReceivable.status) !== "received" && (
              <Button
                size="sm"
                onClick={() => handleSubmitFinanceFromDetail()}
                disabled={updateMutation.isPending || createMutation.isPending || saveAttachmentsMutation.isPending}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                提交财务
              </Button>
            )}
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>
}
      </div>
    </ERPLayout>
  );
}
