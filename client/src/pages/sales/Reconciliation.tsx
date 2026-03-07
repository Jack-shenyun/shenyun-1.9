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
import { formatDateValue, formatNumber, safeLower, toSafeNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { isAccountPeriodPaymentCondition, normalizePaymentCondition } from "@shared/paymentTerms";

const RECON_MARKER = "[RECONCILE]";
const PREPAY_RATIO_MARKER = "[PREPAY_RATIO]";

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

function parsePrepayRatioFromRemark(remark: unknown): number {
  const text = String(remark ?? "");
  const markerLine = text.split("\n").find((line) => line.startsWith(PREPAY_RATIO_MARKER));
  if (markerLine) {
    const ratio = Number(markerLine.slice(PREPAY_RATIO_MARKER.length).trim());
    if (Number.isFinite(ratio)) return Math.max(0, Math.min(100, ratio));
  }
  const matched = text.match(/预付款比例[：:]\s*(\d+(?:\.\d+)?)%?/);
  if (matched) {
    const ratio = Number(matched[1]);
    if (Number.isFinite(ratio)) return Math.max(0, Math.min(100, ratio));
  }
  return 30;
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

export default function SalesReconciliationPage() {
  const { data: receivables = [], refetch, isLoading } = trpc.accountsReceivable.list.useQuery();
  const { data: salesOrders = [] } = trpc.salesOrders.list.useQuery({});
  const { data: customers = [] } = trpc.customers.list.useQuery({});
  const { data: transactions = [] } = trpc.inventoryTransactions.list.useQuery({});
  const updateMutation = trpc.accountsReceivable.update.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("对账已完成");
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<any | null>(null);
  const [reconcileData, setReconcileData] = useState({
    amount: "1000",
    reconciledDate: new Date().toISOString().split("T")[0],
    adjustedAmount: "",
    remarks: "",
  });

  // 新建对账表单
  const [newReconCustomerId, setNewReconCustomerId] = useState<string>("");
  const [newReconMonth, setNewReconMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

  const resolvePaymentTerms = (r: any) => {
    const orderNo = String(r?.orderNo ?? "").trim();
    const salesOrderId = Number(r?.salesOrderId);
    const linkedOrder =
      (orderNo ? salesOrderLookups.byNo.get(orderNo) : undefined) ??
      (Number.isFinite(salesOrderId) && salesOrderId > 0 ? salesOrderLookups.byId.get(salesOrderId) : undefined);
    return String(linkedOrder?.paymentMethod ?? r?.paymentMethod ?? "");
  };
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
    return `${parsePrepayRatioFromRemark(linkedOrder?.remark ?? r?.remark)}%`;
  };

  const getAmount = (r: any) => toSafeNumber(r?.amount);
  const getReceivedAmount = (r: any) => toSafeNumber(r?.receivedAmount ?? r?.paidAmount);
  const getPendingAmount = (r: any) => Math.max(0, getAmount(r) - getReceivedAmount(r));
  const getMoneyText = (r: any, amountRaw: unknown) => formatMoneyByCurrency(r?.currency, amountRaw);
  const getReconcileMeta = (r: any) => parseReconcileMeta(r?.remark ?? r?.remarks);
  const isReconciled = (r: any) => Boolean(getReconcileMeta(r));

  const accountPeriodRows = useMemo(
    () =>
      (receivables as any[])
        .filter((r: any) => isAccountPeriodPaymentCondition(resolvePaymentTerms(r)))
        .filter((r: any) => getPendingAmount(r) > 0),
    [receivables, salesOrderLookups]
  );

  const filteredRows = useMemo(
    () =>
      accountPeriodRows.filter((r: any) => {
        const key = `${r.invoiceNo || ""} ${r.customerName || ""} ${r.orderNo || ""}`;
        return safeLower(key).includes(safeLower(searchTerm));
      }),
    [accountPeriodRows, searchTerm]
  );

  const pendingCount = filteredRows.filter((r: any) => !isReconciled(r)).length;
  const pendingAmount = filteredRows
    .filter((r: any) => !isReconciled(r))
    .reduce((sum: number, r: any) => sum + getPendingAmount(r), 0);

  // 筛选有未付金额的客户
  const customersWithUnpaid = useMemo(() => {
    const customerUnpaid = new Map<number, { name: string; unpaid: number }>();
    for (const r of receivables as any[]) {
      const customerId = Number(r?.customerId);
      const pending = getPendingAmount(r);
      if (!Number.isFinite(customerId) || customerId <= 0 || pending <= 0) continue;
      const existing = customerUnpaid.get(customerId);
      if (existing) {
        existing.unpaid += pending;
      } else {
        customerUnpaid.set(customerId, {
          name: String(r?.customerName ?? ""),
          unpaid: pending,
        });
      }
    }
    // 补充客户名称
    for (const c of customers as any[]) {
      const id = Number(c?.id);
      const existing = customerUnpaid.get(id);
      if (existing && !existing.name) {
        existing.name = String(c?.name ?? c?.customerName ?? "");
      }
    }
    return Array.from(customerUnpaid.entries())
      .filter(([_, v]) => v.unpaid > 0)
      .map(([id, v]) => ({ id, name: v.name, unpaid: v.unpaid }));
  }, [receivables, customers]);

  // 新建对账 - 按月份筛选出库单
  const newReconOutboundRows = useMemo(() => {
    if (!newReconCustomerId || !newReconMonth) return [];
    const customerId = Number(newReconCustomerId);
    if (!Number.isFinite(customerId) || customerId <= 0) return [];

    // 获取该客户的销售订单 ID 列表
    const customerOrderIds = new Set<number>();
    for (const order of salesOrders as any[]) {
      if (Number(order?.customerId) === customerId) {
        customerOrderIds.add(Number(order?.id));
      }
    }

    const [yearStr, monthStr] = newReconMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    return (transactions as any[]).filter((t: any) => {
      // 只取出库类型
      const type = String(t?.type ?? "");
      if (!type.includes("out")) return false;
      // 关联到该客户的订单
      const relatedOrderId = Number(t?.relatedOrderId);
      if (!customerOrderIds.has(relatedOrderId)) return false;
      // 按月份筛选
      const createdAt = new Date(t?.createdAt);
      if (Number.isNaN(createdAt.getTime())) return false;
      return createdAt.getFullYear() === year && createdAt.getMonth() + 1 === month;
    });
  }, [newReconCustomerId, newReconMonth, transactions, salesOrders]);

  const newReconTotalAmount = useMemo(() => {
    return newReconOutboundRows.reduce((sum: number, t: any) => {
      return sum + Math.abs(toSafeNumber(t?.quantity));
    }, 0);
  }, [newReconOutboundRows]);

  const handleOpenReconcile = (row: any) => {
    const meta = getReconcileMeta(row);
    setCurrentRow(row);
    setReconcileData({
      amount: String(toSafeNumber(meta?.amount) || 1000),
      reconciledDate: String(meta?.reconciledDate || new Date().toISOString().split("T")[0]),
      adjustedAmount: String(toSafeNumber(meta?.adjustedAmount) || getAmount(row)),
      remarks: stripReconcileMeta(row?.remark ?? row?.remarks),
    });
    setDialogOpen(true);
  };

  const handleSubmitReconcile = async () => {
    if (!currentRow) return;
    const reconcileAmount = toSafeNumber(reconcileData.amount);
    const adjustedAmount = toSafeNumber(reconcileData.adjustedAmount || currentRow.amount);
    const paidAmount = getReceivedAmount(currentRow);

    if (reconcileAmount <= 0) {
      toast.error("对账金额必须大于0");
      return;
    }
    if (adjustedAmount < paidAmount) {
      toast.error("调整后总金额不能小于已收金额");
      return;
    }

    const nextStatus = adjustedAmount <= paidAmount ? "paid" : paidAmount > 0 ? "partial" : "pending";
    await updateMutation.mutateAsync({
      id: Number(currentRow.id),
      data: {
        amount: String(adjustedAmount),
        status: nextStatus,
        remark: buildRemarkWithReconcile(
          {
            amount: reconcileAmount,
            reconciledDate: reconcileData.reconciledDate || new Date().toISOString().split("T")[0],
            adjustedAmount,
          },
          reconcileData.remarks
        ),
      },
    });
    setDialogOpen(false);
  };

  const handleOpenCreateRecon = () => {
    setNewReconCustomerId("");
    setNewReconMonth(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    setCreateDialogOpen(true);
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
              <p className="text-sm text-muted-foreground">销售部账期订单对账处理</p>
            </div>
          </div>
          <Button onClick={handleOpenCreateRecon}>
            <Plus className="h-4 w-4 mr-1" />
            新建对账
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 items-stretch">
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待对账客户</p>
              <p className="text-2xl font-bold">{customersWithUnpaid.length}</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待对账笔数</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">待对账金额</p>
              <p className="text-2xl font-bold text-amber-600">¥{(pendingAmount / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
          <Card className="flex">
            <CardContent className="p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">已对账笔数</p>
              <p className="text-2xl font-bold text-green-600">{Math.max(0, filteredRows.length - pendingCount)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索发票号、客户、订单号..."
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
                  <TableHead className="text-center font-bold">发票号</TableHead>
                  <TableHead className="text-center font-bold">客户名称</TableHead>
                  <TableHead className="text-center font-bold">订单号</TableHead>
                  <TableHead className="text-center font-bold">应收金额</TableHead>
                  <TableHead className="text-center font-bold">已收金额</TableHead>
                  <TableHead className="text-center font-bold">待收金额</TableHead>
                  <TableHead className="text-center font-bold">比例</TableHead>
                  <TableHead className="text-center font-bold">到期日</TableHead>
                  <TableHead className="text-center font-bold">对账状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无账期待收订单</TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center font-medium">{row.invoiceNo}</TableCell>
                      <TableCell className="text-center">{row.customerName}</TableCell>
                      <TableCell className="text-center">{row.orderNo}</TableCell>
                      <TableCell className="text-center">{getMoneyText(row, getAmount(row))}</TableCell>
                      <TableCell className="text-center text-green-600">{getMoneyText(row, getReceivedAmount(row))}</TableCell>
                      <TableCell className="text-center text-amber-600">{getMoneyText(row, getPendingAmount(row))}</TableCell>
                      <TableCell className="text-center">{getPrepayRatioDisplay(row)}</TableCell>
                      <TableCell className="text-center">{formatDateValue(row.dueDate)}</TableCell>
                      <TableCell className="text-center">
                        {isReconciled(row) ? (
                          <Badge variant="default" className={getStatusSemanticClass("done", "已对账")}>已对账</Badge>
                        ) : (
                          <Badge variant="outline" className={getStatusSemanticClass("pending", "未对账")}>未对账</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={() => handleOpenReconcile(row)}>
                          对账
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 对账弹窗 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>账期对账</DialogTitle>
              <DialogDescription>
                {currentRow?.invoiceNo} - {currentRow?.customerName}
              </DialogDescription>
            </DialogHeader>
            {currentRow && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>对账金额 *</Label>
                    <Input
                      type="number"
                      value={reconcileData.amount}
                      onChange={(e) => setReconcileData({ ...reconcileData, amount: e.target.value })}
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
                  />
                </div>

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={reconcileData.remarks}
                    onChange={(e) => setReconcileData({ ...reconcileData, remarks: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmitReconcile} disabled={updateMutation.isPending}>确认对账</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 新建对账弹窗 */}
        <DraggableDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DraggableDialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>新建对账</DialogTitle>
              <DialogDescription>选择客户和月份，系统自动汇总出库单</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>客户名称 *</Label>
                  <Select value={newReconCustomerId} onValueChange={setNewReconCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择客户（仅显示有未付金额的客户）" />
                    </SelectTrigger>
                    <SelectContent>
                      {customersWithUnpaid.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}（未付 ¥{formatNumber(c.unpaid)}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>对账月份 *</Label>
                  <Input
                    type="month"
                    value={newReconMonth}
                    onChange={(e) => setNewReconMonth(e.target.value)}
                  />
                </div>
              </div>

              {newReconCustomerId && newReconMonth && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">出库单明细</Label>
                    <span className="text-sm text-muted-foreground">
                      共 {newReconOutboundRows.length} 条，合计数量 {formatNumber(newReconTotalAmount)}
                    </span>
                  </div>
                  <div className="border rounded-md max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60">
                          <TableHead className="text-center font-bold">单据号</TableHead>
                          <TableHead className="text-center font-bold">产品名称</TableHead>
                          <TableHead className="text-center font-bold">批次号</TableHead>
                          <TableHead className="text-center font-bold">数量</TableHead>
                          <TableHead className="text-center font-bold">单位</TableHead>
                          <TableHead className="text-center font-bold">出库日期</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newReconOutboundRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                              该客户在所选月份无出库记录
                            </TableCell>
                          </TableRow>
                        ) : (
                          newReconOutboundRows.map((t: any, idx: number) => (
                            <TableRow key={t.id ?? idx}>
                              <TableCell className="text-center">{t.documentNo || "-"}</TableCell>
                              <TableCell className="text-center">{t.itemName || "-"}</TableCell>
                              <TableCell className="text-center">{t.batchNo || "-"}</TableCell>
                              <TableCell className="text-center">{Math.abs(toSafeNumber(t.quantity))}</TableCell>
                              <TableCell className="text-center">{t.unit || "-"}</TableCell>
                              <TableCell className="text-center">{formatDateValue(t.createdAt)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>关闭</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
