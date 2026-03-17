import { useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { ClipboardCheck, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDateValue, formatDisplayNumber, formatNumber, roundToDigits, safeLower, toSafeNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { isAccountPeriodPaymentCondition, normalizePaymentCondition } from "@shared/paymentTerms";

const RECON_MARKER = "[RECONCILE]";
const FINANCE_TODO_LIST_MARKER = "[FINANCE_TODO_LIST]";

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
    .filter((line) => !line.startsWith(FINANCE_TODO_LIST_MARKER))
    .join("\n")
    .trim();
}

function parseFinanceTodoList(remark: unknown): FinanceTodo[] {
  const text = String(remark ?? "");
  const markerLine = text.split("\n").find((line) => line.startsWith(FINANCE_TODO_LIST_MARKER));
  if (!markerLine) return [];
  try {
    const parsed = JSON.parse(markerLine.slice(FINANCE_TODO_LIST_MARKER.length));
    if (!Array.isArray(parsed)) return [];
    return parsed
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

function buildRemarkWithReconcile(meta: Record<string, any>, plainRemark: string, financeTodos: FinanceTodo[] = []) {
  const lines = [`${RECON_MARKER}${JSON.stringify(meta)}`];
  if (financeTodos.length > 0) {
    lines.push(`${FINANCE_TODO_LIST_MARKER}${JSON.stringify(financeTodos)}`);
  }
  if (plainRemark) lines.push(plainRemark);
  return lines.join("\n");
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

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

function getMonthStartDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function normalizeDateOnly(value: unknown) {
  if (!value) return "";
  const parsed = new Date(value as any);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  const raw = String(value);
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function isDateInRange(dateRaw: unknown, startDate: string, endDate: string) {
  const date = normalizeDateOnly(dateRaw);
  if (!date) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function roundCurrency(value: number) {
  return roundToDigits(value, 2);
}

function getReceiptItemAmount(item: any) {
  return roundCurrency(toSafeNumber(item?.receivedQty) * toSafeNumber(item?.unitPrice));
}

export default function PurchaseReconciliationPage() {
  const { data: payables = [], refetch, isLoading } = trpc.accountsPayable.list.useQuery();
  const { data: purchaseOrders = [] } = trpc.purchaseOrders.list.useQuery({});
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 500 });
  const { data: receipts = [] } = trpc.goodsReceipts.list.useQuery({ limit: 500 });
  const updateMutation = trpc.accountsPayable.update.useMutation();
  const trpcUtils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "unreconciled" | "pending_invoice" | "completed" | "all">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDialogMaximized, setIsDialogMaximized] = useState(false);
  const [currentSupplierId, setCurrentSupplierId] = useState("");
  const [reconcileData, setReconcileData] = useState({
    startDate: getMonthStartDateString(),
    endDate: getTodayDateString(),
    reconciledDate: getTodayDateString(),
    adjustmentValue: "0",
    remarks: "",
  });

  const purchaseOrderLookups = useMemo(() => {
    const byNo = new Map<string, any>();
    const byId = new Map<number, any>();
    for (const order of purchaseOrders as any[]) {
      const key = String(order?.orderNo ?? "").trim();
      if (key) byNo.set(key, order);
      const idNum = Number(order?.id);
      if (Number.isFinite(idNum) && idNum > 0) byId.set(idNum, order);
    }
    return { byNo, byId };
  }, [purchaseOrders]);

  const resolveLinkedOrder = (r: any) => {
    const purchaseOrderId = Number(r?.purchaseOrderId);
    const orderNo = String(r?.orderNo ?? r?.purchaseOrderNo ?? "").trim();
    return (
      (Number.isFinite(purchaseOrderId) && purchaseOrderId > 0 ? purchaseOrderLookups.byId.get(purchaseOrderId) : undefined) ??
      (orderNo ? purchaseOrderLookups.byNo.get(orderNo) : undefined)
    );
  };

  const resolveOrderNo = (r: any) => {
    const linkedOrder = resolveLinkedOrder(r);
    return String(linkedOrder?.orderNo ?? r?.orderNo ?? r?.purchaseOrderNo ?? "-");
  };

  const resolvePaymentTerms = (r: any) => {
    const linkedOrder = resolveLinkedOrder(r);
    return String(linkedOrder?.paymentMethod ?? r?.paymentMethod ?? "");
  };

  const getAmount = (r: any) => toSafeNumber(r?.amount);
  const getPaidAmount = (r: any) => toSafeNumber(r?.paidAmount);
  const getPendingAmount = (r: any) => Math.max(0, getAmount(r) - getPaidAmount(r));
  const getMoneyText = (r: any, amountRaw: unknown) => formatMoneyByCurrency(r?.currency, amountRaw);
  const getReconcileMeta = (r: any) => parseReconcileMeta(r?.remark ?? r?.remarks);
  const inboundReceiptStatsBySupplier = useMemo(() => {
    const grouped = new Map<number, { receiptCount: number; amountTotal: number; qtyTotal: number }>();
    for (const receipt of receipts as any[]) {
      const supplierId = Number(receipt?.supplierId);
      const isInboundReceipt = String(receipt?.status || "") === "warehoused" || Boolean(receipt?.inboundDocumentNo);
      if (!Number.isFinite(supplierId) || supplierId <= 0 || !isInboundReceipt) continue;
      const existing = grouped.get(supplierId) || { receiptCount: 0, amountTotal: 0, qtyTotal: 0 };
      existing.receiptCount += 1;
      const items = Array.isArray(receipt?.items) ? receipt.items : [];
      for (const item of items) {
        const qty = toSafeNumber(item?.receivedQty);
        const unitPrice = toSafeNumber(item?.unitPrice);
        existing.qtyTotal += qty;
        existing.amountTotal += roundCurrency(qty * unitPrice);
      }
      grouped.set(supplierId, existing);
    }
    return grouped;
  }, [receipts]);

  const accountPeriodRows = useMemo(
    () =>
      (payables as any[])
        .filter((r: any) => isAccountPeriodPaymentCondition(resolvePaymentTerms(r)))
        .filter((r: any) => getPendingAmount(r) > 0),
    [payables, purchaseOrderLookups]
  );

  const supplierRows = useMemo(() => {
    const grouped = new Map<number, any>();
    for (const row of accountPeriodRows) {
      const supplierId = Number(row?.supplierId);
      if (!Number.isFinite(supplierId) || supplierId <= 0) continue;
      const existing = grouped.get(supplierId) || {
        supplierId,
        supplierName: String(row?.supplierName ?? ""),
        currency: String(row?.currency ?? "CNY"),
        paymentMethod: normalizePaymentCondition(resolvePaymentTerms(row)) || "账期支付",
        payables: [] as any[],
        amountTotal: 0,
        paidTotal: 0,
        pendingTotal: 0,
        latestDueDate: "",
        rowCount: 0,
        meta: null as any,
        };
      existing.payables.push(row);
      const inboundStats = inboundReceiptStatsBySupplier.get(supplierId);
      existing.amountTotal = roundCurrency(inboundStats?.amountTotal ?? 0);
      existing.paidTotal += getPaidAmount(row);
      existing.pendingTotal = roundCurrency(Math.max(0, existing.amountTotal - existing.paidTotal));
      existing.rowCount = Number(inboundStats?.receiptCount ?? 0);
      const dueDate = normalizeDateOnly(row?.dueDate);
      if (dueDate && (!existing.latestDueDate || dueDate > existing.latestDueDate)) {
        existing.latestDueDate = dueDate;
      }
      const meta = getReconcileMeta(row);
      if (meta) {
        existing.meta = meta;
      }
      grouped.set(supplierId, existing);
    }
    for (const supplier of suppliers as any[]) {
      const supplierId = Number(supplier?.id);
      const existing = grouped.get(supplierId);
      if (existing && !existing.supplierName) {
        existing.supplierName = String(supplier?.name ?? "");
      }
    }
    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        amountTotal: roundCurrency(group.amountTotal),
        paidTotal: roundCurrency(group.paidTotal),
        pendingTotal: roundCurrency(group.pendingTotal),
        isReconciled: Boolean(group.meta),
        invoiceReceived: Boolean(group.meta?.invoiceReceived),
      }))
      .sort((a, b) => safeLower(a.supplierName).localeCompare(safeLower(b.supplierName), "zh-CN"));
  }, [accountPeriodRows, suppliers, purchaseOrderLookups, inboundReceiptStatsBySupplier]);

  const filteredRows = useMemo(
    () =>
      supplierRows.filter((row: any) => {
        const key = `${row.supplierName || ""} ${row.paymentMethod || ""}`;
        const matchesSearch = safeLower(key).includes(safeLower(searchTerm));
        const hasPaymentTodo = Array.isArray(row?.payables)
          ? row.payables.some((payable: any) =>
              parseFinanceTodoList(payable?.remark ?? payable?.remarks).some(
                (item) => item.status === "open" && String(item.bizType || "") !== "reconciliation_review",
              ),
            )
          : false;
        const matchesStatus =
          statusFilter === "all"
            ? true
            : statusFilter === "active"
              ? !hasPaymentTodo
              : statusFilter === "unreconciled"
                ? !row.isReconciled
                : statusFilter === "pending_invoice"
                  ? row.isReconciled && !row.invoiceReceived
                  : hasPaymentTodo;
        return matchesSearch && matchesStatus;
      }),
    [supplierRows, searchTerm, statusFilter]
  );

  const pendingCount = filteredRows.filter((row: any) => !row.isReconciled).length;
  const pendingInvoiceCount = filteredRows.filter((row: any) => row.isReconciled && !row.invoiceReceived).length;
  const pendingAmount = filteredRows
    .filter((row: any) => !row.isReconciled)
    .reduce((sum: number, row: any) => sum + toSafeNumber(row.pendingTotal), 0);

  const currentRow = useMemo(
    () => supplierRows.find((row: any) => String(row.supplierId) === String(currentSupplierId)) ?? null,
    [supplierRows, currentSupplierId]
  );

  const currentRowInboundRows = useMemo(() => {
    if (!currentRow) return [];
    const supplierId = Number(currentRow.supplierId);
    const inboundRows: any[] = [];
    for (const receipt of receipts as any[]) {
      if (Number(receipt?.supplierId) !== supplierId) continue;
      const isInboundReceipt = String(receipt?.status || "") === "warehoused" || Boolean(receipt?.inboundDocumentNo);
      if (!isInboundReceipt) continue;
      const receiptDate = receipt?.receiptDate || receipt?.createdAt;
      if (!isDateInRange(receiptDate, reconcileData.startDate, reconcileData.endDate)) continue;
      const items = Array.isArray(receipt?.items) ? receipt.items : [];
      for (const item of items) {
        inboundRows.push({
          receiptId: receipt.id,
          receiptNo: receipt.receiptNo,
          purchaseOrderNo: receipt.purchaseOrderNo,
          receiptDate,
          materialName: item?.materialName || "-",
          batchNo: item?.batchNo || "-",
          receivedQty: toSafeNumber(item?.receivedQty),
          unitPrice: toSafeNumber(item?.unitPrice),
          amount: getReceiptItemAmount(item),
          unit: item?.unit || "-",
        });
      }
    }
    return inboundRows.sort((a, b) => String(b.receiptDate || "").localeCompare(String(a.receiptDate || "")));
  }, [currentRow, receipts, reconcileData.startDate, reconcileData.endDate]);

  const currentInboundTotalAmount = useMemo(
    () => roundCurrency(currentRowInboundRows.reduce((sum: number, row: any) => sum + toSafeNumber(row.amount), 0)),
    [currentRowInboundRows]
  );
  const currentBasePendingAmount = currentInboundTotalAmount;
  const currentAdjustmentValue = toSafeNumber(reconcileData.adjustmentValue);
  const currentAdjustedPendingAmount = roundCurrency(currentBasePendingAmount + currentAdjustmentValue);
  const currentInboundTotalQty = useMemo(
    () => currentRowInboundRows.reduce((sum: number, row: any) => sum + toSafeNumber(row.receivedQty), 0),
    [currentRowInboundRows]
  );

  const handleOpenReconcile = (row?: any) => {
    const targetRow = row ?? null;
    const meta = targetRow?.meta ?? null;
    setCurrentSupplierId(targetRow ? String(targetRow.supplierId) : "");
    setReconcileData({
      startDate: String(meta?.startDate || getMonthStartDateString()),
      endDate: String(meta?.endDate || getTodayDateString()),
      reconciledDate: String(meta?.reconciledDate || getTodayDateString()),
      adjustmentValue: String(meta?.adjustmentValue ?? "0"),
      remarks: stripReconcileMeta(targetRow?.payables?.[0]?.remark ?? targetRow?.payables?.[0]?.remarks),
    });
    setDialogOpen(true);
  };

  const handleSubmitReconcile = async () => {
    if (!currentRow || currentRow.payables.length === 0) return;
    if (!currentSupplierId) {
      toast.error("请先选择供应商");
      return;
    }
    if (!reconcileData.startDate || !reconcileData.endDate) {
      toast.error("请选择对账时间范围");
      return;
    }
    if (reconcileData.startDate > reconcileData.endDate) {
      toast.error("开始日期不能晚于结束日期");
      return;
    }
    if (currentAdjustedPendingAmount < 0) {
      toast.error("调整后待付总额不能小于 0");
      return;
    }

    const payableRows = [...currentRow.payables];
    const basePendingTotal = payableRows.reduce((sum: number, row: any) => sum + getPendingAmount(row), 0);
    const targetPendingTotal = roundCurrency(currentAdjustedPendingAmount);
    let remainingPending = targetPendingTotal;

    const payloads = payableRows.map((row: any, index: number) => {
      const rowPending = getPendingAmount(row);
      const rowPaid = getPaidAmount(row);
      const baseRemark = String(row?.remark ?? row?.remarks ?? "");
      const nextTodos = parseFinanceTodoList(baseRemark).filter(
        (item) => String(item.bizType || "") !== "reconciliation_review",
      );
      let nextPending = 0;
      if (index === payableRows.length - 1) {
        nextPending = roundCurrency(Math.max(0, remainingPending));
      } else if (basePendingTotal > 0) {
        nextPending = roundCurrency(targetPendingTotal * (rowPending / basePendingTotal));
        remainingPending = roundCurrency(remainingPending - nextPending);
      }
      const nextAmount = roundCurrency(rowPaid + nextPending);
      const nextStatus = nextPending <= 0 ? "paid" : rowPaid > 0 ? "partial" : "pending";
      return {
        id: Number(row.id),
        data: {
          amount: String(nextAmount),
          status: nextStatus as "pending" | "partial" | "paid",
          remark: buildRemarkWithReconcile(
            {
              supplierId: currentRow.supplierId,
              supplierName: currentRow.supplierName,
              startDate: reconcileData.startDate,
              endDate: reconcileData.endDate,
              reconciledDate: reconcileData.reconciledDate || getTodayDateString(),
              basePendingAmount: roundCurrency(basePendingTotal),
              adjustmentValue: roundCurrency(currentAdjustmentValue),
              adjustedPendingAmount: targetPendingTotal,
              invoiceReceived: Boolean(row?.meta?.invoiceReceived ?? currentRow?.meta?.invoiceReceived ?? false),
              invoiceReceivedDate: row?.meta?.invoiceReceivedDate ?? currentRow?.meta?.invoiceReceivedDate ?? "",
            },
            reconcileData.remarks,
            nextTodos,
          ),
        },
      };
    });

    for (const payload of payloads) {
      await updateMutation.mutateAsync(payload);
    }
    await refetch();
    await Promise.all([
      trpcUtils.workflowCenter.list.invalidate(),
      trpcUtils.dashboard.stats.invalidate(),
    ]);
    toast.success("对账已完成");
    setDialogOpen(false);
  };

  const handleReceiveInvoice = async (row: any) => {
    const payableRows = Array.isArray(row?.payables) ? row.payables : [];
    if (payableRows.length === 0) return;
    try {
      for (const payable of payableRows) {
        const baseRemark = String(payable?.remark ?? payable?.remarks ?? "");
        const existingMeta = getReconcileMeta(payable) ?? row?.meta ?? {};
        const existingTodos = parseFinanceTodoList(baseRemark).filter(
          (item) => String(item.bizType || "") !== "reconciliation_review",
        );
        await updateMutation.mutateAsync({
          id: Number(payable.id),
          data: {
            remark: buildRemarkWithReconcile(
              {
                ...existingMeta,
                supplierId: row.supplierId,
                supplierName: row.supplierName,
                invoiceReceived: true,
                invoiceReceivedDate: getTodayDateString(),
              },
              stripReconcileMeta(baseRemark),
              existingTodos,
            ),
          },
        });
      }
      await refetch();
      toast.success("已登记收票");
    } catch (error: any) {
      toast.error("收票失败", { description: String(error?.message || error || "请稍后重试") });
    }
  };

  const handleOpenCreateRecon = () => {
    handleOpenReconcile();
  };

  const getRowStatusMeta = (row: any) => {
    const hasPaymentTodo = Array.isArray(row?.payables)
      ? row.payables.some((payable: any) =>
          parseFinanceTodoList(payable?.remark ?? payable?.remarks).some(
            (item) => item.status === "open" && String(item.bizType || "") !== "reconciliation_review",
          ),
        )
      : false;
    if (hasPaymentTodo) {
      return { label: "已提交财务", variant: "outline" as const, semantic: "processing" };
    }
    if (row?.invoiceReceived) {
      return { label: "待提交财务", variant: "secondary" as const, semantic: "processing" };
    }
    if (row?.isReconciled) {
      return { label: "待收票", variant: "secondary" as const, semantic: "processing" };
    }
    return { label: "待对账", variant: "outline" as const, semantic: "pending" };
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">对账管理</h2>
              <p className="text-sm text-muted-foreground">采购部账期订单对账处理</p>
            </div>
          </div>
          <Button onClick={handleOpenCreateRecon}>
            <Plus className="h-4 w-4 mr-1" />
            新建对账
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5 items-stretch">
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待对账供应商</p>
              <p className="text-2xl font-bold">{filteredRows.length}</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">未完成对账</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待对账金额</p>
              <p className="text-2xl font-bold text-amber-600">¥{formatDisplayNumber(pendingAmount / 10000, { maximumFractionDigits: 1 })}万</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待收票数量</p>
              <p className="text-2xl font-bold text-blue-600">{pendingInvoiceCount}</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">已对账供应商</p>
              <p className="text-2xl font-bold text-green-600">{Math.max(0, filteredRows.length - pendingCount)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索供应商名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">未完成</SelectItem>
                  <SelectItem value="unreconciled">待对账</SelectItem>
                  <SelectItem value="pending_invoice">待收票</SelectItem>
                  <SelectItem value="completed">已提交财务</SelectItem>
                  <SelectItem value="all">全部状态</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">供应商名称</TableHead>
                  <TableHead className="text-center font-bold">付款条件</TableHead>
                  <TableHead className="text-center font-bold">入库单数</TableHead>
                  <TableHead className="text-center font-bold">入库总额</TableHead>
                  <TableHead className="text-center font-bold">已付金额</TableHead>
                  <TableHead className="text-center font-bold">待付金额</TableHead>
                  <TableHead className="text-center font-bold">最晚到期日</TableHead>
                  <TableHead className="text-center font-bold">对账状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无账期待付记录</TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row: any) => (
                    <TableRow key={row.supplierId}>
                      <TableCell className="text-center">{row.supplierName}</TableCell>
                      <TableCell className="text-center">{row.paymentMethod || "-"}</TableCell>
                      <TableCell className="text-center">{row.rowCount}</TableCell>
                      <TableCell className="text-center">{formatMoneyByCurrency(row.currency, row.amountTotal)}</TableCell>
                      <TableCell className="text-center text-green-600">{formatMoneyByCurrency(row.currency, row.paidTotal)}</TableCell>
                      <TableCell className="text-center text-amber-600">{formatMoneyByCurrency(row.currency, row.pendingTotal)}</TableCell>
                      <TableCell className="text-center">{formatDateValue(row.latestDueDate)}</TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const meta = getRowStatusMeta(row);
                          return (
                            <Badge variant={meta.variant} className={getStatusSemanticClass(meta.semantic, meta.label)}>
                              {meta.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {row.isReconciled ? (
                            row.invoiceReceived ? (
                              Array.isArray(row?.payables) &&
                              row.payables.some((payable: any) =>
                                parseFinanceTodoList(payable?.remark ?? payable?.remarks).some(
                                  (item) => item.status === "open" && String(item.bizType || "") !== "reconciliation_review",
                                ),
                              ) ? (
                                <Button size="sm" variant="outline" disabled>
                                  已提交财务
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled>
                                  待提交财务
                                </Button>
                              )
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleReceiveInvoice(row)}>
                                收票
                              </Button>
                            )
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleOpenReconcile(row)}>
                              对账
                            </Button>
                          )}
                          {row.isReconciled && (
                            <Button size="sm" variant="ghost" onClick={() => handleOpenReconcile(row)}>
                              改对账
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DraggableDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setIsDialogMaximized(false);
          }}
          defaultWidth={1160}
          defaultHeight={760}
          isMaximized={isDialogMaximized}
          onMaximizedChange={setIsDialogMaximized}
        >
          <DraggableDialogContent
            isMaximized={isDialogMaximized}
            className={isDialogMaximized ? "px-8 py-6" : "max-w-5xl"}
          >
            <DialogHeader>
              <DialogTitle>供应商对账</DialogTitle>
              <DialogDescription>
                按供应商查看发货/到货明细，并完成本次对账
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div
                className={
                  isDialogMaximized
                    ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6"
                    : "grid grid-cols-1 gap-4 md:grid-cols-4"
                }
              >
                <div className={`space-y-2 ${isDialogMaximized ? "xl:col-span-2" : "md:col-span-2"}`}>
                  <Label>供应商名称 *</Label>
                  <Select value={currentSupplierId} onValueChange={setCurrentSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择供应商" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierRows.map((supplierRow: any) => (
                        <SelectItem key={supplierRow.supplierId} value={String(supplierRow.supplierId)}>
                          {supplierRow.supplierName}（待付 {formatMoneyByCurrency(supplierRow.currency, supplierRow.pendingTotal)}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={`space-y-2 ${isDialogMaximized ? "xl:col-span-2" : ""}`}>
                  <Label>开始日期 *</Label>
                  <Input
                    type="date"
                    value={reconcileData.startDate}
                    onChange={(e) => setReconcileData({ ...reconcileData, startDate: e.target.value })}
                  />
                </div>
                <div className={`space-y-2 ${isDialogMaximized ? "xl:col-span-2" : ""}`}>
                  <Label>结束日期 *</Label>
                  <Input
                    type="date"
                    value={reconcileData.endDate}
                    onChange={(e) => setReconcileData({ ...reconcileData, endDate: e.target.value })}
                  />
                </div>
              </div>
            {currentRow ? (
              <div className="space-y-5 py-1">
                <div className="space-y-3">
                  <div className={`flex items-center justify-between gap-3 ${isDialogMaximized ? "flex-wrap xl:flex-nowrap" : "flex-wrap"}`}>
                    <Label className="text-base font-semibold">入库明细</Label>
                    <span className="text-sm text-muted-foreground">
                      共 {currentRowInboundRows.length} 条，合计到货数量 {formatNumber(currentInboundTotalQty)}
                    </span>
                  </div>
                  <div className={`border rounded-md overflow-auto ${isDialogMaximized ? "max-h-[420px]" : "max-h-[240px]"}`}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60">
                          <TableHead className="text-center font-bold">入库单号</TableHead>
                          <TableHead className="text-center font-bold">采购单号</TableHead>
                          <TableHead className="text-center font-bold">物料名称</TableHead>
                          <TableHead className="text-center font-bold">批次号</TableHead>
                          <TableHead className="text-center font-bold">到货数量</TableHead>
                          <TableHead className="text-center font-bold">单价</TableHead>
                          <TableHead className="text-center font-bold">到货金额</TableHead>
                          <TableHead className="text-center font-bold">单位</TableHead>
                          <TableHead className="text-center font-bold">到货日期</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentRowInboundRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                              暂无关联入库单
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentRowInboundRows.map((row: any, idx: number) => (
                          <TableRow key={`${row.receiptId}-${idx}`}>
                              <TableCell className="text-center">{row.receiptNo || "-"}</TableCell>
                              <TableCell className="text-center">{row.purchaseOrderNo || "-"}</TableCell>
                              <TableCell className="text-center">{row.materialName || "-"}</TableCell>
                              <TableCell className="text-center">{row.batchNo || "-"}</TableCell>
                              <TableCell className="text-center">{formatNumber(row.receivedQty)}</TableCell>
                              <TableCell className="text-center">{formatMoneyByCurrency(currentRow.currency, row.unitPrice)}</TableCell>
                              <TableCell className="text-center">{formatMoneyByCurrency(currentRow.currency, row.amount)}</TableCell>
                              <TableCell className="text-center">{row.unit || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateValue(row.receiptDate)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div
                  className={
                    isDialogMaximized
                      ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-8"
                      : "grid grid-cols-1 gap-4 md:grid-cols-4"
                  }
                >
                  <div className={`space-y-2 ${isDialogMaximized ? "xl:col-span-2" : ""}`}>
                    <Label>系统入库总额</Label>
                    <Input value={formatMoneyByCurrency(currentRow.currency, currentBasePendingAmount)} readOnly />
                  </div>
                  <div className={`space-y-2 ${isDialogMaximized ? "xl:col-span-2" : ""}`}>
                    <Label>调整值</Label>
                    <Input
                      type="number"
                      value={reconcileData.adjustmentValue}
                      onChange={(e) => setReconcileData({ ...reconcileData, adjustmentValue: e.target.value })}
                    />
                  </div>
                  <div className={`space-y-2 ${isDialogMaximized ? "xl:col-span-2" : ""}`}>
                    <Label>调整后待付总额</Label>
                    <Input value={formatMoneyByCurrency(currentRow.currency, currentAdjustedPendingAmount)} readOnly />
                  </div>
                  <div className={`space-y-2 ${isDialogMaximized ? "xl:col-span-2" : ""}`}>
                    <Label>对账日期</Label>
                    <Input
                      type="date"
                      value={reconcileData.reconciledDate}
                      onChange={(e) => setReconcileData({ ...reconcileData, reconciledDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={reconcileData.remarks}
                    onChange={(e) => setReconcileData({ ...reconcileData, remarks: e.target.value })}
                    rows={isDialogMaximized ? 4 : 2}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
                请选择需要对账的供应商
              </div>
            )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmitReconcile} disabled={updateMutation.isPending || !currentRow}>
                {updateMutation.isPending ? "保存中..." : "确认对账"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
