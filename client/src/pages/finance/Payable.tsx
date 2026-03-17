import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import ERPLayout from "@/components/ERPLayout";
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
  CreditCard,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue, formatNumber, safeLower, toRoundedString, toSafeNumber } from "@/lib/formatters";
import { useLocation } from "wouter";
import { isAccountPeriodPaymentCondition, normalizePaymentCondition } from "@shared/paymentTerms";

interface PayableRecord {
  id: number;
  invoiceNo: string;
  supplierId?: number;
  supplierName: string;
  orderNo: string;
  amount: number;
  paidAmount: number;
  invoiceDate?: string;
  dueDate: string;
  status: "pending" | "partial" | "paid" | "overdue";
  paymentMethod: string;
  remarks: string;
  paymentDate: string;
}

function getStatusMeta(status: unknown, options?: { submittedToFinance?: boolean }) {
  const key = String(status ?? "");
  if (options?.submittedToFinance && key === "pending") {
    return { label: "已提交财务", variant: "outline" as const };
  }
  return statusMap[key] ?? statusMap.pending;
}

const statusMap: Record<string, any> = {
  pending: { label: "待付款", variant: "outline" as const },
  partial: { label: "部分付款", variant: "secondary" as const },
  paid: { label: "已付款", variant: "default" as const },
  overdue: { label: "已逾期", variant: "destructive" as const },
};

const OPENING_PAYABLE_MARKER = "[OPENING_PAYABLE]";
const FINANCE_TODO_LIST_MARKER = "[FINANCE_TODO_LIST]";
const RECON_MARKER = "[RECONCILE]";

type FinanceTodo = {
  id: string;
  status: "open" | "done";
  amount: number;
  paymentMethod: string;
  receiptDate: string;
  remarks?: string;
  createdAt: string;
  bizType?: string;
  title?: string;
};

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
        status: item?.status === "done" ? "done" : "open",
        amount: toSafeNumber(item?.amount),
        paymentMethod: String(item?.paymentMethod || "银行转账"),
        receiptDate: String(item?.receiptDate || ""),
        remarks: item?.remarks ? String(item.remarks) : "",
        createdAt: String(item?.createdAt || ""),
        bizType: item?.bizType ? String(item.bizType) : "",
        title: item?.title ? String(item.title) : "",
      }))
      .filter((item: FinanceTodo) => Boolean(item.id));
  } catch {
    return [];
  }
}

function parseReconcileMeta(remark: unknown) {
  const text = String(remark ?? "");
  const markerLine = text.split("\n").find((line) => line.startsWith(RECON_MARKER));
  if (!markerLine) return null;
  try {
    return JSON.parse(markerLine.slice(RECON_MARKER.length));
  } catch {
    return null;
  }
}

function setFinanceTodoList(remark: unknown, list: FinanceTodo[]) {
  const lines = String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(FINANCE_TODO_LIST_MARKER))
    .filter((line) => line.trim().length > 0);
  if (list.length > 0) {
    lines.push(`${FINANCE_TODO_LIST_MARKER}${JSON.stringify(list)}`);
  }
  return lines.join("\n").trim();
}

function hasOpenFinanceTodo(remark: unknown) {
  return parseFinanceTodoList(remark).some((item) => item.status === "open");
}

function hasOpenPaymentFinanceTodo(remark: unknown) {
  return parseFinanceTodoList(remark).some(
    (item) => item.status === "open" && String(item.bizType || "") !== "reconciliation_review",
  );
}

function hasReceivedInvoiceForPayable(remark: unknown) {
  return Boolean(parseReconcileMeta(remark)?.invoiceReceived);
}

function getPurchaseFinanceStage(payable: any): "hidden" | "pending_submit" | "submitted" {
  const sourceRemark = String(payable?.remark ?? payable?.remarks ?? "");
  const paymentMethod = normalizePaymentCondition(payable?.paymentMethod);
  const isAccountPeriod = isAccountPeriodPaymentCondition(paymentMethod);
  if (!isAccountPeriod) {
    return hasOpenPaymentFinanceTodo(sourceRemark) ? "submitted" : "pending_submit";
  }
  if (!hasReceivedInvoiceForPayable(sourceRemark)) {
    return "hidden";
  }
  return hasOpenPaymentFinanceTodo(sourceRemark) ? "submitted" : "pending_submit";
}

function getDisplayStatusMeta(payable: any, isPurchaseFinance: boolean) {
  if (!isPurchaseFinance) return getStatusMeta(payable?.status);
  const stage = getPurchaseFinanceStage(payable);
  const key = String(payable?.status ?? "");
  if (key === "paid") return getStatusMeta(key);
  if (stage === "submitted") {
    return { label: "已提交财务", variant: "outline" as const };
  }
  if (stage === "pending_submit") {
    return { label: "待提交财务", variant: "secondary" as const };
  }
  return getStatusMeta(key);
}



export default function PayablePage() {
  const PAGE_SIZE = 10;
  const [location] = useLocation();
  const isPurchaseFinance = location === "/purchase/finance";
  const trpcUtils = trpc.useUtils();
  const { data: _dbData = [], isLoading, refetch } = trpc.accountsPayable.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 500 });
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery({ status: "active" });
  const createMutation = trpc.accountsPayable.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.accountsPayable.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.accountsPayable.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const createPaymentRecordMutation = trpc.paymentRecords.create.useMutation();
  const payables = useMemo(
    () =>
      (_dbData as any[]).filter((row: any) => {
        const remark = String(row?.remark ?? row?.remarks ?? "");
        if (isPurchaseFinance) {
          return !remark.includes(OPENING_PAYABLE_MARKER) && getPurchaseFinanceStage(row) !== "hidden";
        }
        return true;
      }),
    [_dbData, isPurchaseFinance],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [bizMode, setBizMode] = useState<"prepay" | "account">("prepay");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"normal" | "opening">("normal");
  const [editingPayable, setEditingPayable] = useState<PayableRecord | null>(null);
  const [viewingPayable, setViewingPayable] = useState<PayableRecord | null>(null);
  const [payingRecord, setPayingRecord] = useState<PayableRecord | null>(null);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [hasHandledFocusParam, setHasHandledFocusParam] = useState(false);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    invoiceNo: "",
    supplierId: 0,
    supplierName: "",
    orderNo: "",
    amount: "",
    invoiceDate: "",
    dueDate: "",
    periodMonth: "",
    remarks: "",
  });

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "银行转账",
    bankAccountId: "",
    paymentDate: "",
    remarks: "",
  });

  const prepayRows = useMemo(
    () =>
      payables.filter((p: any) => {
        const paymentMethod = normalizePaymentCondition((p as any)?.paymentMethod);
        return !isAccountPeriodPaymentCondition(paymentMethod);
      }),
    [payables],
  );

  const accountRows = useMemo(
    () =>
      payables.filter((p: any) => {
        const paymentMethod = normalizePaymentCondition((p as any)?.paymentMethod);
        return isAccountPeriodPaymentCondition(paymentMethod);
      }),
    [payables],
  );

  const effectiveBizMode: "prepay" | "account" = isPurchaseFinance ? "prepay" : bizMode;
  const currentRows = effectiveBizMode === "prepay" ? prepayRows : accountRows;

  const filteredPayables = currentRows.filter((p: any) => {
    const matchesSearch =
      safeLower(p.invoiceNo).includes(safeLower(searchTerm)) ||
      safeLower(p.supplierName).includes(safeLower(searchTerm));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPayables.length / PAGE_SIZE));
  const pagedPayables = filteredPayables.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, bizMode]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (isPurchaseFinance) {
      if (bizMode !== "prepay") setBizMode("prepay");
      return;
    }
    if (bizMode === "prepay" && prepayRows.length === 0 && accountRows.length > 0) {
      setBizMode("account");
      return;
    }
    if (bizMode === "account" && accountRows.length === 0 && prepayRows.length > 0) {
      setBizMode("prepay");
    }
  }, [bizMode, prepayRows.length, accountRows.length, isPurchaseFinance]);

  const parseOpeningPeriod = (remark: unknown) => {
    const text = String(remark ?? "");
    const match = text.match(/\[OPENING_PERIOD:([0-9]{4}-[0-9]{2})\]/);
    return match?.[1] || "";
  };

  const stripOpeningMeta = (remark: unknown) =>
    String(remark ?? "")
      .split("\n")
      .filter((line) => !line.startsWith(OPENING_PAYABLE_MARKER))
      .filter((line) => !line.startsWith("[OPENING_PERIOD:"))
      .join("\n")
      .trim();

  const buildOpeningRemark = (periodMonth: string, plainRemark: string) => {
    const lines = [OPENING_PAYABLE_MARKER];
    if (periodMonth) lines.push(`[OPENING_PERIOD:${periodMonth}]`);
    if (plainRemark.trim()) lines.push(plainRemark.trim());
    return lines.join("\n");
  };

  const resolveSupplier = () => {
    if (Number(formData.supplierId || 0) > 0) {
      return (suppliers as any[]).find((item: any) => Number(item?.id) === Number(formData.supplierId || 0)) || null;
    }
    const input = String(formData.supplierName || "").trim().toLowerCase();
    if (!input) return null;
    return (suppliers as any[]).find((item: any) => {
      const name = String(item?.name || "").trim().toLowerCase();
      const code = String(item?.code || "").trim().toLowerCase();
      return name === input || code === input;
    }) || null;
  };

  const handleAdd = (mode: "normal" | "opening" = "normal") => {
    if (isPurchaseFinance) {
      return;
    }
    setEntryMode(mode);
    setEditingPayable(null);
    const today = new Date();
    const yyyymm = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
    const nextNo = payables.length + 1;
    setFormData({
      invoiceNo: mode === "opening"
        ? `QCAP-${yyyymm}-${String(nextNo).padStart(4, "0")}`
        : `SINV-${today.getFullYear()}-${String(nextNo).padStart(4, "0")}`,
      supplierId: 0,
      supplierName: "",
      orderNo: "",
      amount: "",
      invoiceDate: today.toISOString().split("T")[0],
      dueDate: "",
      periodMonth: today.toISOString().slice(0, 7),
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (payable: PayableRecord) => {
    const sourceRemark = payable.remarks ?? (payable as any).remark;
    const opening = String(sourceRemark || "").includes(OPENING_PAYABLE_MARKER);
    setEntryMode(opening ? "opening" : "normal");
    setEditingPayable(payable);
    setFormData({
      invoiceNo: payable.invoiceNo,
      supplierId: Number((payable as any).supplierId || 0),
      supplierName: payable.supplierName,
      orderNo: payable.orderNo,
      amount: String(payable.amount),
      invoiceDate: String((payable as any).invoiceDate || "").split("T")[0],
      dueDate: payable.dueDate,
      periodMonth: opening ? parseOpeningPeriod(sourceRemark) : "",
      remarks: opening ? stripOpeningMeta(sourceRemark) : String(sourceRemark || ""),
    });
    setDialogOpen(true);
  };

  const handleView = (payable: PayableRecord) => {
    setViewingPayable(payable);
    setViewDialogOpen(true);
  };

  const handleDelete = (payable: PayableRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除应付记录" });
      return;
    }
    deleteMutation.mutate({ id: payable.id });
    toast.success("应付记录已删除");
  };

  const handlePay = (payable: PayableRecord) => {
    const sourceRemark = payable.remarks ?? (payable as any).remark;
    if (isPurchaseFinance && hasOpenPaymentFinanceTodo(sourceRemark)) {
      toast.info("该记录已提交财务");
      return;
    }
    setPayingRecord(payable);
    setPaymentData({
      amount: String(payable.amount - payable.paidAmount),
      paymentMethod: "银行转账",
      bankAccountId: "",
      paymentDate: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setActiveTodoId(null);
    setPaymentDialogOpen(true);
  };

  const handlePayFromTodo = (payable: PayableRecord, todo: FinanceTodo) => {
    setPayingRecord(payable);
    setPaymentData({
      amount: String(toSafeNumber(todo.amount)),
      paymentMethod: todo.paymentMethod || "银行转账",
      bankAccountId: "",
      paymentDate: todo.receiptDate || new Date().toISOString().split("T")[0],
      remarks: todo.remarks || "",
    });
    setActiveTodoId(todo.id);
    setPaymentDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.invoiceNo || !formData.supplierName || !formData.amount) {
      toast.error("请填写必填项", { description: "发票号、供应商名称和金额为必填" });
      return;
    }
    const amount = Number(formData.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("应付金额必须大于0");
      return;
    }

    const supplier = resolveSupplier();
    const supplierId = Number((editingPayable as any)?.supplierId || supplier?.id || 0);
    if (!Number.isFinite(supplierId) || supplierId <= 0) {
      toast.error("请填写正确的供应商名称", { description: "需要与供应商档案名称或编码完全匹配" });
      return;
    }

    const remark = entryMode === "opening"
      ? buildOpeningRemark(formData.periodMonth, formData.remarks)
      : formData.remarks.trim();

    try {
      if (editingPayable) {
        await updateMutation.mutateAsync({
          id: Number(editingPayable.id),
          data: {
            invoiceNo: formData.invoiceNo.trim(),
            supplierId,
            supplierName: String((supplier as any)?.name || formData.supplierName).trim(),
            amount: toRoundedString(amount, 2),
            invoiceDate: formData.invoiceDate || undefined,
            dueDate: formData.dueDate || undefined,
            remark,
          },
        });
      } else {
        await createMutation.mutateAsync({
          invoiceNo: formData.invoiceNo.trim(),
          supplierId,
          supplierName: String((supplier as any)?.name || formData.supplierName).trim(),
          amount: toRoundedString(amount, 2),
          invoiceDate: formData.invoiceDate || undefined,
          dueDate: formData.dueDate || undefined,
          remark,
        });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(editingPayable ? "保存失败" : "创建失败", {
        description: String(error?.message || error || "请稍后重试"),
      });
    }
  };

  const handlePaymentSubmit = async () => {
    if (!payingRecord || !paymentData.amount) {
      toast.error(isPurchaseFinance ? "请填写提交金额" : "请填写付款金额");
      return;
    }

    const payAmount = parseFloat(paymentData.amount) || 0;
    if (payAmount <= 0) {
      toast.error(isPurchaseFinance ? "提交金额必须大于0" : "付款金额必须大于0");
      return;
    }
    const pending = toSafeNumber(payingRecord.amount) - toSafeNumber(payingRecord.paidAmount);
    if (payAmount - pending > 0.0001) {
      toast.error(isPurchaseFinance ? "提交金额不能超过待付金额" : "付款金额不能超过待付金额");
      return;
    }

    if (isPurchaseFinance) {
      const payableId = Number((payingRecord as any)?.id);
      if (!Number.isFinite(payableId) || payableId <= 0) {
        toast.error("提交失败", { description: "记录编号无效" });
        return;
      }

      const baseRemark = String((payingRecord as any)?.remarks ?? (payingRecord as any)?.remark ?? "");
      const existingTodos = parseFinanceTodoList(baseRemark);
      if (existingTodos.some((item) => item.status === "open" && String(item.bizType || "") !== "reconciliation_review")) {
        toast.info("该记录已存在待处理财务待办");
        return;
      }

      const todo: FinanceTodo = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: "open",
        amount: payAmount,
        paymentMethod: paymentData.paymentMethod || "银行转账",
        receiptDate: paymentData.paymentDate || new Date().toISOString().split("T")[0],
        remarks: paymentData.remarks || "采购提交财务付款",
        createdAt: new Date().toISOString(),
      };

      try {
        await updateMutation.mutateAsync({
          id: payableId,
          data: {
            remark: setFinanceTodoList(baseRemark, [...existingTodos, todo]) || undefined,
          },
        });
        await trpcUtils.workflowCenter.list.invalidate();
        await trpcUtils.dashboard.stats.invalidate();
        setPaymentDialogOpen(false);
        setActiveTodoId(null);
        toast.success("已提交财务，财务待办已生成");
      } catch (error: any) {
        toast.error("提交失败", { description: String(error?.message || error || "请稍后重试") });
      }
      return;
    }

    const bankAccountId = Number(paymentData.bankAccountId || 0);
    if (!Number.isFinite(bankAccountId) || bankAccountId <= 0) {
      toast.error("请选择付款账户");
      return;
    }

    const newPaidAmount = toSafeNumber(payingRecord.paidAmount) + payAmount;
    let newStatus: PayableRecord["status"] = "partial";
    
    if (newPaidAmount >= toSafeNumber(payingRecord.amount)) {
      newStatus = "paid";
    }
    const baseRemark = String((payingRecord as any)?.remarks ?? (payingRecord as any)?.remark ?? "");
    let nextRemark = baseRemark || undefined;
    if (activeTodoId) {
      const todoList = parseFinanceTodoList(baseRemark).map((todo) =>
        todo.id === activeTodoId ? { ...todo, status: "done" as const } : todo
      );
      nextRemark = setFinanceTodoList(baseRemark, todoList) || undefined;
    }
    try {
      await createPaymentRecordMutation.mutateAsync({
        type: "payment",
        relatedType: "purchase_order",
        relatedId: Number((payingRecord as any)?.purchaseOrderId || 0) || undefined,
        relatedNo: String((payingRecord as any)?.orderNo || (payingRecord as any)?.invoiceNo || ""),
        supplierId: Number((payingRecord as any)?.supplierId || 0) || undefined,
        amount: toRoundedString(payAmount, 2),
        currency: "CNY",
        amountBase: toRoundedString(payAmount, 2),
        exchangeRate: "1",
        bankAccountId,
        paymentDate: paymentData.paymentDate || new Date().toISOString().split("T")[0],
        paymentMethod: paymentData.paymentMethod,
        remark: paymentData.remarks || undefined,
      });
      await updateMutation.mutateAsync({
        id: Number((payingRecord as any).id),
        data: {
          paidAmount: String(newPaidAmount),
          status: newStatus,
          paymentMethod: paymentData.paymentMethod,
          paymentDate: paymentData.paymentDate || undefined,
          bankAccountId,
          remark: nextRemark,
        },
      });
      await trpcUtils.paymentRecords.list.invalidate();
      await trpcUtils.bankAccounts.list.invalidate();
      await trpcUtils.accountsPayable.list.invalidate();
      toast.success(`付款 ¥${formatNumber(payAmount)} 成功`);
      setPaymentDialogOpen(false);
      setActiveTodoId(null);
    } catch (error: any) {
      toast.error("付款失败", { description: String(error?.message || error || "请稍后重试") });
    }
  };

  useEffect(() => {
    if (hasHandledFocusParam || isPurchaseFinance) return;
    const params = new URLSearchParams(window.location.search);
    const focusId = Number(params.get("focusId") || "");
    const todoId = String(params.get("todoId") || "").trim();
    if (!Number.isFinite(focusId) || focusId <= 0) {
      setHasHandledFocusParam(true);
      return;
    }
    const record = payables.find((item: any) => Number(item?.id) === focusId) as PayableRecord | undefined;
    if (!record) return;
    setHasHandledFocusParam(true);
    if (todoId) {
      const todo = parseFinanceTodoList((record as any)?.remark ?? (record as any)?.remarks).find((x) => x.id === todoId);
      if (todo) {
        handlePayFromTodo(record, todo);
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
  }, [payables, hasHandledFocusParam, isPurchaseFinance]);

  const totalAmount = currentRows.reduce((sum: any, p: any) => sum + toSafeNumber(p.amount), 0);
  const paidAmount = currentRows.reduce((sum: any, p: any) => sum + toSafeNumber(p.paidAmount), 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueAmount = currentRows
    .filter((p: any) => p.status === "overdue")
    .reduce((sum: any, p: any) => sum + (toSafeNumber(p.amount) - toSafeNumber(p.paidAmount)), 0);
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{isPurchaseFinance ? "财务协同" : "应付管理"}</h2>
              <p className="text-sm text-muted-foreground">
                {isPurchaseFinance ? "采购提交付款协同，财务统一处理付款" : "管理采购发票、应付账款和付款核销"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isPurchaseFinance && (
              <Button variant="outline" onClick={() => handleAdd("opening")}>
                <Plus className="h-4 w-4 mr-1" />
                新增期初应付
              </Button>
            )}
            {!isPurchaseFinance && (
              <Button onClick={() => handleAdd("normal")}>
                <Plus className="h-4 w-4 mr-1" />
                新建付款
              </Button>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">应付总额</p>
              <p className="text-2xl font-bold">¥{formatNumber(totalAmount / 10000)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已付金额</p>
              <p className="text-2xl font-bold text-green-600">¥{formatNumber(paidAmount / 10000)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待付金额</p>
              <p className="text-2xl font-bold text-amber-600">¥{formatNumber(pendingAmount / 10000)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">逾期金额</p>
              <p className="text-2xl font-bold text-red-600">¥{formatNumber(overdueAmount / 10000)}万</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索发票号、供应商..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {!isPurchaseFinance && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={effectiveBizMode === "prepay" ? "default" : "outline"}
                    onClick={() => setBizMode("prepay")}
                  >
                    预付管理（{prepayRows.length}）
                  </Button>
                  <Button
                    variant={effectiveBizMode === "account" ? "default" : "outline"}
                    onClick={() => setBizMode("account")}
                  >
                    账期支付（{accountRows.length}）
                  </Button>
                </div>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待付款</SelectItem>
                  <SelectItem value="partial">部分付款</SelectItem>
                  <SelectItem value="paid">已付款</SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
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
                  <TableHead className="w-[130px] text-center font-bold">发票号</TableHead>
                  <TableHead className="text-center font-bold">供应商名称</TableHead>
                  <TableHead className="w-[130px] text-center font-bold">采购单号</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">应付金额</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">已付金额</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">到期日</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPayables.map((payable: any) => (
                  <TableRow key={payable.id}>
                    <TableCell className="text-center font-medium">{payable.invoiceNo}</TableCell>
                    <TableCell className="text-center">{payable.supplierName}</TableCell>
                    <TableCell className="text-center">{payable.orderNo}</TableCell>
                    <TableCell className="text-center">¥{formatNumber(payable.amount)}</TableCell>
                    <TableCell className="text-center">¥{formatNumber(payable.paidAmount)}</TableCell>
                    <TableCell className="text-center">{formatDateValue(payable.dueDate)}</TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const displayStatusMeta = getDisplayStatusMeta(payable, isPurchaseFinance);
                        return (
                      <Badge
                        variant={displayStatusMeta.variant}
                        className={getStatusSemanticClass(payable.status, displayStatusMeta.label)}
                      >
                        {displayStatusMeta.label}
                      </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(payable)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          {!isPurchaseFinance && (
                            <DropdownMenuItem onClick={() => handleEdit(payable)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                          )}
                          {isPurchaseFinance && payable.status !== "paid" && getPurchaseFinanceStage(payable) === "pending_submit" && (
                            <DropdownMenuItem onClick={() => handlePay(payable)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              提交财务
                            </DropdownMenuItem>
                          )}
                          {isPurchaseFinance && payable.status !== "paid" && getPurchaseFinanceStage(payable) === "submitted" && (
                            <DropdownMenuItem disabled>
                              已提交财务
                            </DropdownMenuItem>
                          )}
                          {!isPurchaseFinance && payable.status !== "paid" && (
                            <DropdownMenuItem onClick={() => handlePay(payable)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              付款
                            </DropdownMenuItem>
                          )}
                          {canDelete && !isPurchaseFinance && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(payable)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePaginationFooter
              total={filteredPayables.length}
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
                {editingPayable ? (entryMode === "opening" ? "编辑期初应付" : "编辑应付记录") : (entryMode === "opening" ? "新增期初应付" : "新建应付记录")}
              </DialogTitle>
              <DialogDescription>
                {editingPayable ? "修改应付账款信息" : (entryMode === "opening" ? "录入上线前未支付的历史应付余额" : "创建新的应付账款记录")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>发票号 *</Label>
                  <Input
                    value={formData.invoiceNo}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    placeholder="发票号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>采购单号</Label>
                  <Input
                    value={formData.orderNo}
                    onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                    placeholder="关联采购单号"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>供应商名称 *</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={formData.supplierName}
                    placeholder="点击选择供应商"
                    className="flex-1 cursor-pointer"
                    onClick={() => setSupplierPickerOpen(true)}
                  />
                  <Button type="button" variant="outline" onClick={() => setSupplierPickerOpen(true)}>
                    选择
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>应付金额 *</Label>
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
                {editingPayable ? "保存修改" : "创建记录"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={supplierPickerOpen}
          onOpenChange={setSupplierPickerOpen}
          title="选择供应商"
          searchPlaceholder="搜索供应商编码、供应商名称、联系人..."
          columns={[
            { key: "code", title: "供应商编码", render: (supplier) => <span className="font-mono font-medium">{supplier.code}</span> },
            { key: "name", title: "供应商名称", render: (supplier) => <span className="font-medium">{supplier.name}</span> },
            { key: "contactPerson", title: "联系人", render: (supplier) => <span>{supplier.contactPerson || "-"}</span> },
            { key: "phone", title: "联系电话", render: (supplier) => <span>{supplier.phone || "-"}</span> },
          ]}
          rows={suppliers as any[]}
          selectedId={formData.supplierId || ""}
          filterFn={(supplier, q) => {
            const lower = q.toLowerCase();
            return String(supplier.code || "").toLowerCase().includes(lower)
              || String(supplier.name || "").toLowerCase().includes(lower)
              || String(supplier.contactPerson || "").toLowerCase().includes(lower);
          }}
          onSelect={(supplier) => {
            setFormData((prev) => ({
              ...prev,
              supplierId: Number(supplier.id || 0),
              supplierName: String(supplier.name || ""),
            }));
            setSupplierPickerOpen(false);
          }}
        />

        {/* 付款对话框 */}
        <DraggableDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isPurchaseFinance ? "提交财务" : "付款登记"}</DialogTitle>
              <DialogDescription>
                {payingRecord?.invoiceNo} - {payingRecord?.supplierName}
              </DialogDescription>
            </DialogHeader>
            {payingRecord && (
              <div className="grid gap-4 py-4">
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>应付金额</span>
                    <span className="font-medium">¥{formatNumber(payingRecord.amount)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>已付金额</span>
                    <span className="font-medium">¥{formatNumber(payingRecord.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between mt-1 text-primary">
                    <span>待付金额</span>
                    <span className="font-medium">¥{formatNumber(toSafeNumber(payingRecord.amount) - toSafeNumber(payingRecord.paidAmount))}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isPurchaseFinance ? "本次提交金额 *" : "本次付款金额 *"}</Label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>付款方式</Label>
                    <Select
                      value={paymentData.paymentMethod}
                      onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}
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
                    <Label>付款日期</Label>
                    <Input
                      type="date"
                      value={paymentData.paymentDate}
                      onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    />
                  </div>
                </div>

                {!isPurchaseFinance && (
                  <div className="space-y-2">
                    <Label>付款账户 *</Label>
                    <Select
                      value={paymentData.bankAccountId}
                      onValueChange={(value) => setPaymentData({ ...paymentData, bankAccountId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择付款账户" />
                      </SelectTrigger>
                      <SelectContent>
                        {(bankAccounts as any[]).map((account: any) => (
                          <SelectItem key={account.id} value={String(account.id)}>
                            {account.accountName || account.bankName} / {account.accountNo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                    placeholder="付款备注"
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handlePaymentSubmit}>
                {isPurchaseFinance ? "提交财务" : "确认付款"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingPayable && (
      <>
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">应付详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingPayable.invoiceNo}
            {viewingPayable.status && (
              <> · <Badge variant={getDisplayStatusMeta(viewingPayable, isPurchaseFinance).variant} className={`ml-1 ${getStatusSemanticClass(viewingPayable.status, getDisplayStatusMeta(viewingPayable, isPurchaseFinance).label)}`}>
                {getDisplayStatusMeta(viewingPayable, isPurchaseFinance).label || String(viewingPayable.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div className="py-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="供应商">{viewingPayable.supplierName}</FieldRow>
                <FieldRow label="采购单号">{viewingPayable.orderNo || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="到期日">{formatDateValue(viewingPayable.dueDate)}</FieldRow>
                <FieldRow label="付款方式">{viewingPayable.paymentMethod || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">金额信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="应付金额">¥{formatNumber(viewingPayable.amount)}</FieldRow>
                <FieldRow label="已付金额">¥{formatNumber(viewingPayable.paidAmount)}</FieldRow>
              </div>
              <div>
                <FieldRow label="待付金额">¥{formatNumber(toSafeNumber(viewingPayable.amount) - toSafeNumber(viewingPayable.paidAmount))}</FieldRow>
                 <FieldRow label="最近付款日">{formatDateValue(viewingPayable.paymentDate)}</FieldRow>
              </div>
            </div>
          </div>

          {viewingPayable.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingPayable.remarks}</p>
            </div>
          )}
        </div>

          <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            {!isPurchaseFinance && (
              <Button variant="outline" size="sm" onClick={() => handleEdit(viewingPayable)}>编辑</Button>
            )}
            {isPurchaseFinance && viewingPayable.status !== "paid" && getPurchaseFinanceStage(viewingPayable) === "pending_submit" && (
              <Button size="sm" onClick={() => {
                setViewDialogOpen(false);
                handlePay(viewingPayable);
              }}>
                <DollarSign className="h-4 w-4 mr-1" />
                提交财务
              </Button>
            )}
            {!isPurchaseFinance && viewingPayable.status !== "paid" && (
              <Button size="sm" onClick={() => {
                setViewDialogOpen(false);
                handlePay(viewingPayable);
              }}>
                <DollarSign className="h-4 w-4 mr-1" />
                付款
              </Button>
            )}
          </div>
        </div>
      </>
    )}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
