import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import ERPLayout from "@/components/ERPLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { ClipboardCheck, Plus, Search } from "lucide-react";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";
import { toast } from "sonner";
import { formatDateValue, formatDisplayNumber, formatNumber, safeLower, toSafeNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { isAccountPeriodPaymentCondition } from "@shared/paymentTerms";

const RECON_MARKER = "[RECONCILE]";

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

function toDateInputValue(dateRaw: unknown): string {
  const date = dateRaw instanceof Date ? dateRaw : new Date(String(dateRaw ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function toMonthInputValue(dateRaw: unknown): string {
  const date = dateRaw instanceof Date ? dateRaw : new Date(String(dateRaw ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 7);
}

function getCurrentMonthRange() {
  const now = new Date();
  return {
    startDate: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toDateInputValue(now),
  };
}

function isWithinDateRange(dateRaw: unknown, startDate: string, endDate: string) {
  const value = toDateInputValue(dateRaw);
  if (!value) return false;
  if (startDate && value < startDate) return false;
  if (endDate && value > endDate) return false;
  return true;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReconcilePlainRemark(sourceRemark: unknown, note: string) {
  const base = stripReconcileMeta(sourceRemark);
  const nextNote = note.trim() ? `对账备注: ${note.trim()}` : "";
  return [base, nextNote].filter(Boolean).join("\n").trim();
}

function extractReconcileNote(sourceRemark: unknown) {
  const lines = stripReconcileMeta(sourceRemark)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const noteLine = [...lines].reverse().find((line) => line.startsWith("对账备注:"));
  return noteLine ? noteLine.replace(/^对账备注:\s*/, "").trim() : "";
}

function distributeAdjustedAmounts(rows: any[], adjustedTotal: number, getAmount: (row: any) => number) {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [roundMoney(adjustedTotal)];

  const baseTotal = rows.reduce((sum, row) => sum + getAmount(row), 0);
  if (baseTotal <= 0) {
    return rows.map((_, index) => (index === rows.length - 1 ? roundMoney(adjustedTotal) : 0));
  }

  let allocated = 0;
  return rows.map((row, index) => {
    if (index === rows.length - 1) {
      return roundMoney(adjustedTotal - allocated);
    }
    const current = roundMoney((adjustedTotal * getAmount(row)) / baseTotal);
    allocated += current;
    return current;
  });
}

export default function SalesReconciliationPage() {
  const [, setLocation] = useLocation();
  const { data: receivables = [], refetch, isLoading } = trpc.accountsReceivable.list.useQuery();
  const { data: salesOrders = [] } = trpc.salesOrders.list.useQuery(
    { limit: 2000 },
    { refetchOnWindowFocus: false },
  );
  const { data: customers = [] } = trpc.customers.list.useQuery({});
  const { data: transactions = [] } = trpc.inventoryTransactions.list.useQuery(
    { type: "sales_out", limit: 2000 },
    { refetchOnWindowFocus: false },
  );
  const transactionOrderIds = useMemo(
    () =>
      Array.from(
        new Set(
          (transactions as any[])
            .map((transaction: any) => Number(transaction?.relatedOrderId))
            .filter((id: number) => Number.isFinite(id) && id > 0),
        ),
      ),
    [transactions],
  );
  const { data: salesOrderItems = [] } = trpc.salesOrders.getItemsByOrderIds.useQuery(
    { orderIds: transactionOrderIds },
    {
      enabled: transactionOrderIds.length > 0,
      refetchOnWindowFocus: false,
    },
  );
  const updateMutation = trpc.accountsReceivable.update.useMutation();

  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState("");
  const [detailStartDate, setDetailStartDate] = useState(defaultRange.startDate);
  const [detailEndDate, setDetailEndDate] = useState(defaultRange.endDate);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [reconcileData, setReconcileData] = useState({
    adjustmentValue: "0",
    reconciledMonth: toMonthInputValue(new Date()),
    remarks: "",
  });

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

  const customerNameLookup = useMemo(() => {
    const map = new Map<number, string>();
    for (const customer of customers as any[]) {
      const id = Number(customer?.id);
      if (Number.isFinite(id) && id > 0) {
        map.set(id, String(customer?.name ?? customer?.customerName ?? ""));
      }
    }
    return map;
  }, [customers]);

  const customerLookup = useMemo(() => {
    const map = new Map<number, any>();
    for (const customer of customers as any[]) {
      const id = Number(customer?.id);
      if (Number.isFinite(id) && id > 0) {
        map.set(id, customer);
      }
    }
    return map;
  }, [customers]);

  const resolvePaymentTerms = (record: any) => {
    const orderNo = String(record?.orderNo ?? "").trim();
    const salesOrderId = Number(record?.salesOrderId);
    const linkedOrder =
      (orderNo ? salesOrderLookups.byNo.get(orderNo) : undefined) ??
      (Number.isFinite(salesOrderId) && salesOrderId > 0 ? salesOrderLookups.byId.get(salesOrderId) : undefined);
    return String(linkedOrder?.paymentMethod ?? record?.paymentMethod ?? "");
  };

  const resolveLinkedOrder = (record: any) => {
    const orderNo = String(record?.orderNo ?? "").trim();
    const salesOrderId = Number(record?.salesOrderId);
    return (
      (orderNo ? salesOrderLookups.byNo.get(orderNo) : undefined) ??
      (Number.isFinite(salesOrderId) && salesOrderId > 0 ? salesOrderLookups.byId.get(salesOrderId) : undefined)
    );
  };

  const getExchangeRate = (source: any) => {
    const rate = toSafeNumber(source?.exchangeRate);
    return rate > 0 ? rate : 1;
  };

  const getAmount = (record: any) => toSafeNumber(record?.amount);
  const getReceivedAmount = (record: any) => toSafeNumber(record?.receivedAmount ?? record?.paidAmount);
  const getAmountBase = (record: any) => {
    const storedBase = toSafeNumber(record?.amountBase);
    if (storedBase > 0) return storedBase;
    const linkedOrder = resolveLinkedOrder(record);
    return roundMoney(getAmount(record) * getExchangeRate(linkedOrder ?? record));
  };
  const getReceivedAmountBase = (record: any) => {
    const linkedOrder = resolveLinkedOrder(record);
    return roundMoney(getReceivedAmount(record) * getExchangeRate(linkedOrder ?? record));
  };
  const getPendingAmount = (record: any) => Math.max(0, getAmount(record) - getReceivedAmount(record));
  const getReconcileMeta = (record: any) => parseReconcileMeta(record?.remark ?? record?.remarks);
  const isReconciled = (record: any) => Boolean(getReconcileMeta(record));

  const accountPeriodRows = useMemo(
    () =>
      (receivables as any[])
        .filter((record: any) => isAccountPeriodPaymentCondition(resolvePaymentTerms(record)))
        .filter((record: any) => getPendingAmount(record) > 0),
    [receivables, salesOrderLookups],
  );

  const salesOrderItemPriceLookup = useMemo(() => {
    const aggregates = new Map<string, { quantity: number; amount: number; unitPrice: number; unit: string }>();

    for (const item of salesOrderItems as any[]) {
      const orderId = Number(item?.orderId);
      const productId = Number(item?.productId);
      if (!Number.isFinite(orderId) || orderId <= 0 || !Number.isFinite(productId) || productId <= 0) continue;

      const key = `${orderId}:${productId}`;
      const current = aggregates.get(key) ?? {
        quantity: 0,
        amount: 0,
        unitPrice: 0,
        unit: String(item?.unit ?? ""),
      };
      const quantity = toSafeNumber(item?.quantity);
      const unitPrice = toSafeNumber(item?.unitPrice);
      const amount = toSafeNumber(item?.amount) || roundMoney(quantity * unitPrice);

      current.quantity += quantity;
      current.amount += amount;
      if (current.unitPrice <= 0 && unitPrice > 0) {
        current.unitPrice = unitPrice;
      }
      if (!current.unit) {
        current.unit = String(item?.unit ?? "");
      }
      aggregates.set(key, current);
    }

    return new Map(
      Array.from(aggregates.entries()).map(([key, value]) => [
        key,
        {
          unitPrice: value.quantity > 0 ? roundMoney(value.amount / value.quantity) : value.unitPrice,
          unit: value.unit,
        },
      ]),
    );
  }, [salesOrderItems]);

  const receivableSummaryByCustomer = useMemo(() => {
    const grouped = new Map<number, any>();

    for (const record of accountPeriodRows) {
      const customerId = Number(record?.customerId);
      if (!Number.isFinite(customerId) || customerId <= 0) continue;

      const current = grouped.get(customerId) ?? {
        rows: [] as any[],
        receivableCount: 0,
        reconciledCount: 0,
        totalAmount: 0,
        totalAmountBase: 0,
        receivedAmount: 0,
        receivedAmountBase: 0,
      };

      current.rows.push(record);
      current.receivableCount += 1;
      current.totalAmount += getAmount(record);
      current.totalAmountBase += getAmountBase(record);
      current.receivedAmount += getReceivedAmount(record);
      current.receivedAmountBase += getReceivedAmountBase(record);
      if (isReconciled(record)) {
        current.reconciledCount += 1;
      }

      grouped.set(customerId, current);
    }

    return grouped;
  }, [accountPeriodRows, salesOrderLookups]);

  const customerReconcileSnapshot = useMemo(() => {
    const snapshotMap = new Map<number, { meta: any; remarks: string; sortKey: string }>();

    for (const row of accountPeriodRows as any[]) {
      const customerId = Number(row?.customerId);
      if (!Number.isFinite(customerId) || customerId <= 0) continue;

      const meta = getReconcileMeta(row);
      if (!meta) continue;

      const sortKey = String(meta?.reconciledDate ?? meta?.reconciledMonth ?? row?.updatedAt ?? row?.createdAt ?? "");
      const existing = snapshotMap.get(customerId);
      if (existing && existing.sortKey >= sortKey) continue;

      snapshotMap.set(customerId, {
        meta,
        remarks: extractReconcileNote(row?.remark ?? row?.remarks),
        sortKey,
      });
    }

    return snapshotMap;
  }, [accountPeriodRows]);

  const accountPeriodCustomerIds = useMemo(
    () =>
      new Set(
        Array.from(receivableSummaryByCustomer.keys()).filter((id) => Number.isFinite(id) && id > 0),
      ),
    [receivableSummaryByCustomer],
  );

  const shipmentRows = useMemo(
    () =>
      (transactions as any[])
        .filter((transaction: any) => String(transaction?.type || "") === "sales_out")
        .map((transaction: any) => {
          const orderId = Number(transaction?.relatedOrderId);
          if (!Number.isFinite(orderId) || orderId <= 0) return null;

          const linkedOrder = salesOrderLookups.byId.get(orderId);
          const customerId = Number(linkedOrder?.customerId);
          if (!Number.isFinite(customerId) || customerId <= 0) return null;

          const productId = Number(transaction?.productId);
          const priceInfo = Number.isFinite(productId) && productId > 0
            ? salesOrderItemPriceLookup.get(`${orderId}:${productId}`)
            : undefined;
          const quantity = Math.abs(toSafeNumber(transaction?.quantity));
          const unitPrice = toSafeNumber(priceInfo?.unitPrice);
          const lineAmount = roundMoney(quantity * unitPrice);
          const exchangeRate = getExchangeRate(linkedOrder);

          return {
            ...transaction,
            orderId,
            orderNo: String(linkedOrder?.orderNo ?? "-"),
            customerId,
            customerName: String(linkedOrder?.customerName ?? customerNameLookup.get(customerId) ?? ""),
            currency: String(linkedOrder?.currency ?? "CNY"),
            exchangeRate,
            unitPrice,
            unit: String(transaction?.unit ?? priceInfo?.unit ?? ""),
            quantity,
            lineAmount,
            lineAmountBase: roundMoney(lineAmount * exchangeRate),
          };
        })
        .filter(Boolean) as any[],
    [transactions, salesOrderLookups, salesOrderItemPriceLookup, customerNameLookup],
  );

  const outboundCustomerOptions = useMemo(() => {
    const grouped = new Map<number, any>();

    for (const shipment of shipmentRows) {
      const customerId = Number(shipment?.customerId);
      if (!Number.isFinite(customerId) || customerId <= 0) continue;

      const customer = customerLookup.get(customerId);
      const current = grouped.get(customerId) ?? {
        id: customerId,
        customerId,
        code: String(customer?.code ?? ""),
        name: String(shipment?.customerName || customer?.name || ""),
        contactPerson: String(customer?.contactPerson ?? ""),
        phone: String(customer?.phone ?? ""),
        outboundAmountBase: 0,
        shipmentDocumentNos: new Set<string>(),
        latestShipmentDate: "",
      };

      current.outboundAmountBase += toSafeNumber(shipment?.lineAmountBase);
      if (shipment?.documentNo) {
        current.shipmentDocumentNos.add(String(shipment.documentNo));
      }
      const shipmentDate = String(shipment?.createdAt ?? "");
      current.latestShipmentDate =
        !current.latestShipmentDate || shipmentDate > String(current.latestShipmentDate || "")
          ? shipmentDate
          : current.latestShipmentDate;

      grouped.set(customerId, current);
    }

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        shipmentDocumentCount: row.shipmentDocumentNos.size,
        outboundAmountBase: roundMoney(row.outboundAmountBase),
      }))
      .filter((row) => row.outboundAmountBase > 0)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-CN"));
  }, [shipmentRows, customerLookup]);

  const customerRows = useMemo(() => {
    const grouped = new Map<number, any>();

    for (const shipment of shipmentRows) {
      const customerId = Number(shipment?.customerId);
      if (!Number.isFinite(customerId) || customerId <= 0 || !accountPeriodCustomerIds.has(customerId)) continue;

      const receivableSummary = receivableSummaryByCustomer.get(customerId) ?? {
        rows: [],
        receivableCount: 0,
        reconciledCount: 0,
        totalAmount: 0,
        totalAmountBase: 0,
        receivedAmount: 0,
        receivedAmountBase: 0,
      };
      const existing = grouped.get(customerId) ?? {
        customerId,
        customerName: String(shipment?.customerName || customerNameLookup.get(customerId) || ""),
        outboundAmount: 0,
        outboundAmountBase: 0,
        receivedAmountBase: receivableSummary.receivedAmountBase,
        pendingAmountBase: 0,
        receivableCount: 0,
        reconciledCount: 0,
        linkedReceivableIds: new Set<number>(),
        linkedReconciledIds: new Set<number>(),
        shipmentLineCount: 0,
        shipmentDocumentNos: new Set<string>(),
        latestShipmentDate: "",
        rows: receivableSummary.rows as any[],
      };

      existing.outboundAmount += toSafeNumber(shipment?.lineAmount);
      existing.outboundAmountBase += toSafeNumber(shipment?.lineAmountBase);
      existing.receivedAmountBase = receivableSummary.receivedAmountBase;
      existing.shipmentLineCount += 1;
      if (shipment?.documentNo) {
        existing.shipmentDocumentNos.add(String(shipment.documentNo));
      }
      const relatedOrderId = Number(shipment?.orderId ?? shipment?.relatedOrderId);
      if (Number.isFinite(relatedOrderId) && relatedOrderId > 0) {
        for (const row of receivableSummary.rows as any[]) {
          const linkedOrder = resolveLinkedOrder(row);
          const receivableOrderId = Number(row?.salesOrderId ?? linkedOrder?.id ?? 0);
          if (receivableOrderId !== relatedOrderId) continue;
          const receivableId = Number(row?.id);
          if (!Number.isFinite(receivableId) || receivableId <= 0) continue;
          existing.linkedReceivableIds.add(receivableId);
          if (isReconciled(row)) {
            existing.linkedReconciledIds.add(receivableId);
          }
        }
      }
      const shipmentDate = String(shipment?.createdAt ?? "");
      existing.latestShipmentDate =
        !existing.latestShipmentDate || shipmentDate > String(existing.latestShipmentDate || "")
          ? shipmentDate
          : existing.latestShipmentDate;
      grouped.set(customerId, existing);
    }

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        shipmentDocumentCount: row.shipmentDocumentNos.size || row.shipmentLineCount,
        receivableCount: row.linkedReceivableIds.size,
        reconciledCount: row.linkedReconciledIds.size,
        pendingAmountBase: Math.max(
          0,
          roundMoney(
            (
              row.linkedReceivableIds.size > 0
                ? row.rows
                    .filter((item: any) => row.linkedReceivableIds.has(Number(item?.id)))
                    .reduce((sum: number, item: any) => sum + getAmountBase(item), 0)
                : row.outboundAmountBase
            ) - row.receivedAmountBase,
          ),
        ),
        reconcileStatus:
          row.linkedReceivableIds.size === 0 || row.linkedReconciledIds.size === 0
            ? "未对账"
            : row.linkedReconciledIds.size >= row.linkedReceivableIds.size
              ? "已对账"
              : "部分对账",
      }))
      .sort((a, b) => String(a.customerName || "").localeCompare(String(b.customerName || ""), "zh-CN"));
  }, [shipmentRows, receivableSummaryByCustomer, customerNameLookup, accountPeriodCustomerIds]);

  const filteredRows = useMemo(
    () =>
      customerRows.filter((row) =>
        safeLower(`${row.customerName || ""}`).includes(safeLower(searchTerm)),
      ),
    [customerRows, searchTerm],
  );

  const pendingCustomerCount = filteredRows.filter((row) => row.reconcileStatus !== "已对账").length;
  const pendingShipmentCount = filteredRows.reduce(
    (sum, row) => sum + (row.reconcileStatus === "已对账" ? 0 : row.shipmentDocumentCount),
    0,
  );
  const pendingAmount = filteredRows.reduce(
    (sum, row) => sum + row.pendingAmountBase,
    0,
  );
  const reconciledCustomerCount = filteredRows.filter((row) => row.reconcileStatus === "已对账").length;
  const readyInvoiceCount = filteredRows.reduce(
    (sum, row) => sum + (row.reconcileStatus === "已对账" ? Number(row.receivableCount || 0) : 0),
    0,
  );

  const selectedCustomerSummary = useMemo(
    () => filteredRows.find((row) => String(row.customerId) === String(detailCustomerId))
      || customerRows.find((row) => String(row.customerId) === String(detailCustomerId))
      || outboundCustomerOptions.find((row) => String(row.customerId) === String(detailCustomerId))
      || null,
    [customerRows, filteredRows, detailCustomerId, outboundCustomerOptions],
  );

  const selectedCustomerOrderIds = useMemo(() => {
    const customerId = Number(detailCustomerId);
    if (!Number.isFinite(customerId) || customerId <= 0) return new Set<number>();
    return new Set(
      (salesOrders as any[])
        .filter((order: any) => Number(order?.customerId) === customerId)
        .map((order: any) => Number(order?.id))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    );
  }, [detailCustomerId, salesOrders]);

  const detailShipmentRows = useMemo(() => {
    if (selectedCustomerOrderIds.size === 0) return [];
    return shipmentRows
      .filter((transaction: any) => {
        const relatedOrderId = Number(transaction?.orderId ?? transaction?.relatedOrderId);
        if (!selectedCustomerOrderIds.has(relatedOrderId)) return false;
        return isWithinDateRange(transaction?.createdAt, detailStartDate, detailEndDate);
      })
      .sort((a: any, b: any) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  }, [shipmentRows, selectedCustomerOrderIds, detailStartDate, detailEndDate]);

  const detailReceivableRows = useMemo(() => {
    const customerId = Number(detailCustomerId);
    if (!Number.isFinite(customerId) || customerId <= 0) return [];

    const shipmentOrderIds = new Set<number>(
      detailShipmentRows
        .map((transaction: any) => Number(transaction?.relatedOrderId))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    );

    return accountPeriodRows.filter((record: any) => {
      if (Number(record?.customerId) !== customerId) return false;

      const linkedOrder = resolveLinkedOrder(record);
      const orderId = Number(record?.salesOrderId ?? linkedOrder?.id ?? 0);
      if (shipmentOrderIds.size > 0 && shipmentOrderIds.has(orderId)) {
        return true;
      }

      const candidateDate = linkedOrder?.deliveryDate ?? linkedOrder?.orderDate ?? record?.invoiceDate ?? record?.createdAt;
      return isWithinDateRange(candidateDate, detailStartDate, detailEndDate);
    });
  }, [detailCustomerId, detailShipmentRows, accountPeriodRows, detailStartDate, detailEndDate, salesOrderLookups]);

  const detailBaseAmount = useMemo(
    () => detailShipmentRows.reduce((sum: number, row: any) => sum + toSafeNumber(row?.lineAmount), 0),
    [detailShipmentRows],
  );
  const detailReceivedAmount = useMemo(
    () => detailReceivableRows.reduce((sum: number, row: any) => sum + getReceivedAmount(row), 0),
    [detailReceivableRows],
  );
  const adjustmentValue = toSafeNumber(reconcileData.adjustmentValue);
  const detailAdjustedTotal = roundMoney(detailBaseAmount + adjustmentValue);
  const detailPendingAfterAdjust = Math.max(0, roundMoney(detailAdjustedTotal - detailReceivedAmount));
  const detailCurrency = String(detailShipmentRows[0]?.currency || detailReceivableRows[0]?.currency || "CNY");
  const detailShipmentDocumentCount = useMemo(
    () => new Set(detailShipmentRows.map((row: any) => String(row?.documentNo || `row-${row?.id}`))).size,
    [detailShipmentRows],
  );

  const getDefaultDateRangeForCustomer = (customerId: number) => {
    const candidateDates = shipmentRows
      .filter((transaction: any) => Number(transaction?.customerId) === customerId)
      .map((transaction: any) => toDateInputValue(transaction?.createdAt))
      .filter(Boolean);

    if (candidateDates.length > 0) {
      return {
        startDate: candidateDates.reduce((min, value) => (value < min ? value : min), candidateDates[0]),
        endDate: candidateDates.reduce((max, value) => (value > max ? value : max), candidateDates[0]),
      };
    }

    const receivableDates = accountPeriodRows
      .filter((record: any) => Number(record?.customerId) === customerId)
      .map((record: any) => {
        const linkedOrder = resolveLinkedOrder(record);
        return toDateInputValue(linkedOrder?.deliveryDate ?? linkedOrder?.orderDate ?? record?.invoiceDate ?? record?.createdAt);
      })
      .filter(Boolean);

    if (receivableDates.length > 0) {
      return {
        startDate: receivableDates.reduce((min, value) => (value < min ? value : min), receivableDates[0]),
        endDate: receivableDates.reduce((max, value) => (value > max ? value : max), receivableDates[0]),
      };
    }

    return getCurrentMonthRange();
  };

  const applyCustomerDetailState = (customerId: number) => {
    const snapshot = customerReconcileSnapshot.get(customerId);
    if (snapshot) {
      setDetailStartDate(String(snapshot.meta?.startDate ?? ""));
      setDetailEndDate(String(snapshot.meta?.endDate ?? ""));
      setReconcileData({
        adjustmentValue: String(snapshot.meta?.adjustmentValue ?? 0),
        reconciledMonth: String(snapshot.meta?.reconciledMonth ?? toMonthInputValue(new Date())),
        remarks: snapshot.remarks,
      });
      return true;
    }

    const nextRange = getDefaultDateRangeForCustomer(customerId);
    setDetailStartDate(nextRange.startDate);
    setDetailEndDate(nextRange.endDate);
    setReconcileData({
      adjustmentValue: "0",
      reconciledMonth: toMonthInputValue(new Date()),
      remarks: "",
    });
    return false;
  };

  const openDetailDialog = (customerId?: number) => {
    if (customerId && Number.isFinite(customerId) && customerId > 0) {
      setDetailCustomerId(String(customerId));
      const hasSnapshot = applyCustomerDetailState(customerId);
      setIsDetailEditing(!hasSnapshot);
    } else {
      const nextRange = getCurrentMonthRange();
      setDetailCustomerId("");
      setDetailStartDate(nextRange.startDate);
      setDetailEndDate(nextRange.endDate);
      setReconcileData({
        adjustmentValue: "0",
        reconciledMonth: toMonthInputValue(new Date()),
        remarks: "",
      });
      setIsDetailEditing(true);
    }
    setDetailDialogOpen(true);
  };

  const handleDetailCustomerChange = (value: string) => {
    setDetailCustomerId(value);
    const customerId = Number(value);
    if (Number.isFinite(customerId) && customerId > 0) {
      const hasSnapshot = applyCustomerDetailState(customerId);
      setIsDetailEditing(!hasSnapshot);
    }
  };

  const selectedCustomerOption = useMemo(
    () => outboundCustomerOptions.find((row) => String(row.customerId) === String(detailCustomerId)) || null,
    [outboundCustomerOptions, detailCustomerId],
  );

  const handleSubmitReconcile = async () => {
    const customerId = Number(detailCustomerId);
    if (!Number.isFinite(customerId) || customerId <= 0) {
      toast.error("请先选择客户");
      return;
    }
    if (!detailStartDate || !detailEndDate) {
      toast.error("请先选择完整的时间范围");
      return;
    }
    if (detailStartDate > detailEndDate) {
      toast.error("开始日期不能晚于结束日期");
      return;
    }
    if (detailShipmentRows.length === 0) {
      toast.error("当前时间范围内没有发货记录");
      return;
    }
    if (detailReceivableRows.length === 0) {
      toast.error("当前时间范围内没有关联应收记录，暂时无法保存对账");
      return;
    }
    if (detailAdjustedTotal <= 0) {
      toast.error("调整后总金额必须大于0");
      return;
    }
    if (detailAdjustedTotal < detailReceivedAmount) {
      toast.error("调整后总金额不能小于已收金额");
      return;
    }

    const allocations = distributeAdjustedAmounts(detailReceivableRows, detailAdjustedTotal, getAmount);
    const meta = {
      mode: "customer_range",
      customerId,
      customerName: selectedCustomerSummary?.customerName || customerNameLookup.get(customerId) || "",
      startDate: detailStartDate,
      endDate: detailEndDate,
      baseAmount: roundMoney(detailBaseAmount),
      adjustmentValue: roundMoney(adjustmentValue),
      amount: roundMoney(detailAdjustedTotal),
      adjustedAmount: roundMoney(detailAdjustedTotal),
      shipmentCount: detailShipmentDocumentCount,
      receivableCount: detailReceivableRows.length,
      reconciledMonth: reconcileData.reconciledMonth || toMonthInputValue(new Date()),
      reconciledDate: reconcileData.reconciledMonth || toMonthInputValue(new Date()),
    };

    await Promise.all(
      detailReceivableRows.map((row: any, index: number) => {
        const nextAmount = roundMoney(allocations[index] ?? getAmount(row));
        const nextPaidAmount = getReceivedAmount(row);
        const nextStatus = nextAmount <= nextPaidAmount ? "paid" : nextPaidAmount > 0 ? "partial" : "pending";
        return updateMutation.mutateAsync({
          id: Number(row.id),
          data: {
            amount: String(nextAmount),
            status: nextStatus,
            remark: buildRemarkWithReconcile(
              meta,
              buildReconcilePlainRemark(row?.remark ?? row?.remarks, reconcileData.remarks),
            ),
          },
        });
      }),
    );

    await refetch();
    toast.success("客户对账已完成");
    setIsDetailEditing(false);
  };

  const handleApplyInvoice = (row: any) => {
    const params = new URLSearchParams();
    if (Number(row?.customerId) > 0) params.set("customerId", String(row.customerId));
    if (row?.customerName) params.set("customerName", String(row.customerName));
    setLocation(`/finance/invoice${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const reconciliationPrintData = useMemo(() => {
    if (!detailCustomerId || detailShipmentRows.length === 0) return null;
    const customerName = selectedCustomerOption?.name || selectedCustomerSummary?.customerName || "";
    return {
      customerName,
      startDate: detailStartDate,
      endDate: detailEndDate,
      reconciledMonth: reconcileData.reconciledMonth || "",
      shipmentCount: detailShipmentDocumentCount,
      currency: detailCurrency,
      baseAmount: formatMoneyByCurrency(detailCurrency, detailBaseAmount),
      adjustmentValue: formatMoneyByCurrency(detailCurrency, adjustmentValue),
      adjustedTotal: formatMoneyByCurrency(detailCurrency, detailAdjustedTotal),
      receivedAmount: formatMoneyByCurrency(detailCurrency, detailReceivedAmount),
      pendingAfterAdjust: formatMoneyByCurrency(detailCurrency, detailPendingAfterAdjust),
      remarks: reconcileData.remarks?.trim() || "",
      items: detailShipmentRows.map((transaction: any) => ({
        documentNo: transaction.documentNo || "-",
        orderNo: transaction.orderNo || "-",
        itemName: transaction.itemName || "-",
        batchNo: transaction.batchNo || "-",
        quantity: formatNumber(Math.abs(toSafeNumber(transaction.quantity))),
        unit: transaction.unit || "-",
        unitPrice: formatMoneyByCurrency(detailCurrency, transaction.unitPrice || 0),
        lineAmount: formatMoneyByCurrency(detailCurrency, transaction.lineAmount || 0),
        createdAt: formatDateValue(transaction.createdAt),
      })),
    };
  }, [detailCustomerId, detailShipmentRows, selectedCustomerOption, selectedCustomerSummary, detailStartDate, detailEndDate, reconcileData, detailShipmentDocumentCount, detailCurrency, detailBaseAmount, adjustmentValue, detailAdjustedTotal, detailReceivedAmount, detailPendingAfterAdjust]);


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
              <p className="text-sm text-muted-foreground">按客户汇总出库金额发起对账，进入详情后按时间范围查看发货单明细。</p>
            </div>
          </div>
          <Button onClick={() => openDetailDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            新建对账
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-5 items-stretch">
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待对账客户</p>
              <p className="text-2xl font-bold">{pendingCustomerCount}</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待对账出库单</p>
              <p className="text-2xl font-bold text-amber-600">{pendingShipmentCount}</p>
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
              <p className="text-sm text-muted-foreground">已对账客户</p>
              <p className="text-2xl font-bold text-green-600">{reconciledCustomerCount}</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待开票票数</p>
              <p className="text-2xl font-bold text-emerald-600">{readyInvoiceCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索客户名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">客户名称</TableHead>
                  <TableHead className="text-center font-bold">出库单数</TableHead>
                  <TableHead className="text-center font-bold">出库金额</TableHead>
                  <TableHead className="text-center font-bold">已收金额</TableHead>
                  <TableHead className="text-center font-bold">待收金额</TableHead>
                  <TableHead className="text-center font-bold">最近出库日</TableHead>
                  <TableHead className="text-center font-bold">对账状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无可对账客户</TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.customerId}>
                      <TableCell className="text-center font-medium">{row.customerName || "-"}</TableCell>
                      <TableCell className="text-center">{row.shipmentDocumentCount}</TableCell>
                      <TableCell className="text-center">{formatMoneyByCurrency("CNY", row.outboundAmountBase)}</TableCell>
                      <TableCell className="text-center text-green-600">{formatMoneyByCurrency("CNY", row.receivedAmountBase)}</TableCell>
                      <TableCell className="text-center text-amber-600">{formatMoneyByCurrency("CNY", row.pendingAmountBase)}</TableCell>
                      <TableCell className="text-center">{formatDateValue(row.latestShipmentDate)}</TableCell>
                      <TableCell className="text-center">
                        {row.reconcileStatus === "已对账" ? (
                          <Badge variant="default" className={getStatusSemanticClass("done", "已对账")}>已对账</Badge>
                        ) : row.reconcileStatus === "部分对账" ? (
                          <Badge variant="secondary">部分对账</Badge>
                        ) : (
                          <Badge variant="outline" className={getStatusSemanticClass("pending", "未对账")}>未对账</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDetailDialog(Number(row.customerId))}>
                            详情
                          </Button>
                          {row.reconcileStatus === "已对账" ? (
                            <Button size="sm" onClick={() => handleApplyInvoice(row)}>
                              开票申请
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => openDetailDialog(Number(row.customerId))}>
                              对账
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
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          defaultWidth={1240}
          defaultHeight={820}
          maxWidth="96vw"
          maxHeight="94vh"
        >
          <DraggableDialogContent className="w-full max-w-none">
            <DialogHeader>
              <DialogTitle>对账详情</DialogTitle>
              <DialogDescription>
                仅展示所选客户在时间范围内的发货单明细；默认对账总额按出库金额汇总，可用调整值修正。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>客户名称 *</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={selectedCustomerOption?.name || ""}
                      placeholder="点击选择客户"
                      className={`flex-1 ${isDetailEditing ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => {
                        if (isDetailEditing) setCustomerPickerOpen(true);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomerPickerOpen(true)}
                      disabled={!isDetailEditing}
                    >
                      选择
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>开始日期 *</Label>
                  <Input
                    type="date"
                    value={detailStartDate}
                    onChange={(e) => setDetailStartDate(e.target.value)}
                    disabled={!isDetailEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束日期 *</Label>
                  <Input
                    type="date"
                    value={detailEndDate}
                    onChange={(e) => setDetailEndDate(e.target.value)}
                    disabled={!isDetailEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>对账月份</Label>
                  <Input
                    type="month"
                    value={reconcileData.reconciledMonth}
                    onChange={(e) => setReconcileData((prev) => ({ ...prev, reconciledMonth: e.target.value }))}
                    disabled={!isDetailEditing}
                  />
                </div>
              </div>

              {detailCustomerId && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="px-3 py-2 space-y-0.5">
                        <p className="text-sm text-muted-foreground">发货单数</p>
                        <p className="text-2xl font-bold">{detailShipmentDocumentCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="px-3 py-2 space-y-0.5">
                        <p className="text-sm text-muted-foreground">默认对账总额</p>
                        <p className="text-2xl font-bold">{formatMoneyByCurrency(detailCurrency, detailBaseAmount)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="px-3 py-2 space-y-0.5">
                        <p className="text-sm text-muted-foreground">已收金额</p>
                        <p className="text-2xl font-bold text-green-600">{formatMoneyByCurrency(detailCurrency, detailReceivedAmount)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="px-3 py-2 space-y-0.5">
                        <p className="text-sm text-muted-foreground">调整后待收</p>
                        <p className="text-2xl font-bold text-amber-600">{formatMoneyByCurrency(detailCurrency, detailPendingAfterAdjust)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>调整值</Label>
                      <Input
                        type="number"
                        value={reconcileData.adjustmentValue}
                        onChange={(e) => setReconcileData((prev) => ({ ...prev, adjustmentValue: e.target.value }))}
                        placeholder="可填正数或负数"
                        disabled={!isDetailEditing}
                      />
                      <p className="text-xs text-muted-foreground">例如：折扣填负数，补差填正数。</p>
                    </div>
                    <div className="space-y-2">
                      <Label>调整后总额</Label>
                      <Input value={formatMoneyByCurrency(detailCurrency, detailAdjustedTotal)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>关联账期记录</Label>
                      <Input value={`${detailReceivableRows.length} 笔`} readOnly />
                    </div>
                  </div>

                  {detailShipmentRows.length > 0 && detailReceivableRows.length === 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      当前时间范围内有发货记录，但还没有关联应收记录，暂时无法保存对账结果。
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>备注</Label>
                    <Textarea
                      rows={2}
                      value={reconcileData.remarks}
                      onChange={(e) => setReconcileData((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="如需说明差异原因，可填写备注"
                      readOnly={!isDetailEditing}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">客户发货单明细</Label>
                      <span className="text-sm text-muted-foreground">
                        时间范围内共 {detailShipmentRows.length} 条发货流水
                      </span>
                    </div>
                    <div className="border rounded-md max-h-[340px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/60">
                            <TableHead className="text-center font-bold">发货单号</TableHead>
                            <TableHead className="text-center font-bold">订单号</TableHead>
                            <TableHead className="text-center font-bold">产品名称</TableHead>
                            <TableHead className="text-center font-bold">批次号</TableHead>
                            <TableHead className="text-center font-bold">数量</TableHead>
                            <TableHead className="text-center font-bold">单位</TableHead>
                            <TableHead className="text-center font-bold">单价</TableHead>
                            <TableHead className="text-center font-bold">出库金额</TableHead>
                            <TableHead className="text-center font-bold">发货日期</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailShipmentRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                                当前时间范围内没有发货记录
                              </TableCell>
                            </TableRow>
                          ) : (
                            detailShipmentRows.map((transaction: any, index: number) => (
                              <TableRow key={transaction.id ?? index}>
                                <TableCell className="text-center">{transaction.documentNo || "-"}</TableCell>
                                <TableCell className="text-center">{transaction.orderNo || "-"}</TableCell>
                                <TableCell className="text-center">{transaction.itemName || "-"}</TableCell>
                                <TableCell className="text-center">{transaction.batchNo || "-"}</TableCell>
                                <TableCell className="text-center">{formatNumber(Math.abs(toSafeNumber(transaction.quantity)))}</TableCell>
                                <TableCell className="text-center">{transaction.unit || "-"}</TableCell>
                                <TableCell className="text-center">{formatMoneyByCurrency(detailCurrency, transaction.unitPrice || 0)}</TableCell>
                                <TableCell className="text-center font-medium">{formatMoneyByCurrency(detailCurrency, transaction.lineAmount || 0)}</TableCell>
                                <TableCell className="text-center">{formatDateValue(transaction.createdAt)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>取消</Button>
              {isDetailEditing ? (
                <Button
                  variant="outline"
                  onClick={handleSubmitReconcile}
                  disabled={detailShipmentRows.length === 0 || detailReceivableRows.length === 0}
                >
                  保存
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setIsDetailEditing(true)}>
                  编辑
                </Button>
              )}
              {reconciliationPrintData ? (
                <TemplatePrintPreviewButton
                  templateKey="sales_reconciliation"
                  data={reconciliationPrintData}
                  title={`对账明细打印预览 - ${reconciliationPrintData.customerName}`}
                />
              ) : null}
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={customerPickerOpen}
          onOpenChange={setCustomerPickerOpen}
          title="选择客户"
          searchPlaceholder="搜索客户编码、客户名称、联系人..."
          defaultWidth={960}
          defaultHeight={620}
          columns={[
            {
              key: "code",
              title: "客户编码",
              className: "w-[120px]",
              render: (customer) => <span className="font-mono">{customer.code || "-"}</span>,
            },
            {
              key: "name",
              title: "客户名称",
              className: "min-w-[220px]",
              render: (customer) => <span className="font-medium">{customer.name || "-"}</span>,
            },
            {
              key: "contactPerson",
              title: "联系人",
              className: "w-[100px]",
              render: (customer) => <span>{customer.contactPerson || "-"}</span>,
            },
            {
              key: "phone",
              title: "联系电话",
              className: "w-[140px]",
              render: (customer) => <span>{customer.phone || "-"}</span>,
            },
            {
              key: "shipmentDocumentCount",
              title: "出库单数",
              className: "w-[100px]",
              render: (customer) => <span>{customer.shipmentDocumentCount}</span>,
            },
            {
              key: "outboundAmountBase",
              title: "出库金额",
              className: "w-[130px]",
              render: (customer) => <span className="font-medium">{formatMoneyByCurrency("CNY", customer.outboundAmountBase)}</span>,
            },
            {
              key: "latestShipmentDate",
              title: "最近出库日",
              className: "w-[120px]",
              render: (customer) => <span>{formatDateValue(customer.latestShipmentDate)}</span>,
            },
          ]}
          rows={outboundCustomerOptions}
          selectedId={detailCustomerId}
          filterFn={(customer, q) => {
            const lower = q.toLowerCase();
            return String(customer.code || "").toLowerCase().includes(lower)
              || String(customer.name || "").toLowerCase().includes(lower)
              || String(customer.contactPerson || "").toLowerCase().includes(lower)
              || String(customer.phone || "").toLowerCase().includes(lower);
          }}
          emptyText="暂无出库金额大于 0 的客户"
          onSelect={(customer) => {
            handleDetailCustomerChange(String(customer.customerId));
            setCustomerPickerOpen(false);
          }}
        />
      </div>
    </ERPLayout>
  );
}
