import { useEffect, useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { trpc } from "@/lib/trpc";
import { formatCurrencyValue, formatDateValue, toRoundedString } from "@/lib/formatters";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Search, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 10;
const OTHER_FLOW_PREFIX = "__OTHER_FLOW__:";

const relatedTypeMap: Record<string, string> = {
  sales_order: "销售回款",
  purchase_order: "采购付款",
  expense: "报销付款",
  other: "其他收支",
};

function formatMoney(value: unknown, currency = "CNY") {
  const amount = Number(value || 0);
  const symbol = String(currency || "CNY").toUpperCase() === "USD" ? "$" : "¥";
  return formatCurrencyValue(amount, symbol);
}

function formatDateOnly(value: unknown) {
  return formatDateValue(value);
}

function buildBankAccountLabel(account: any) {
  return [
    String(account?.accountName || "").trim(),
    String(account?.bankName || "").trim(),
    String(account?.accountNo || "").trim(),
  ].filter(Boolean).join(" / ");
}

function buildRelationKeys(relatedType: unknown, relatedId: unknown, relatedNo: unknown) {
  const type = String(relatedType || "").trim();
  const keys: string[] = [];
  const id = Number(relatedId || 0);
  const no = String(relatedNo || "").trim();
  if (type && Number.isFinite(id) && id > 0) {
    keys.push(`${type}:id:${id}`);
  }
  if (type && no) {
    keys.push(`${type}:no:${no}`);
  }
  return keys;
}

function parseOtherFlowRemark(raw: unknown) {
  const text = String(raw || "");
  if (!text.startsWith(OTHER_FLOW_PREFIX)) {
    return { counterparty: "", note: text };
  }
  try {
    const parsed = JSON.parse(text.slice(OTHER_FLOW_PREFIX.length));
    return {
      counterparty: String(parsed?.counterparty || ""),
      note: String(parsed?.note || ""),
    };
  } catch {
    return { counterparty: "", note: text };
  }
}

function buildOtherFlowRemark(counterparty: string, note: string) {
  return `${OTHER_FLOW_PREFIX}${JSON.stringify({
    counterparty: counterparty.trim(),
    note: note.trim(),
  })}`;
}

function buildManualRecordNo(type: "receipt" | "payment") {
  const prefix = type === "receipt" ? "INC" : "EXP";
  return `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

export default function ExpenseManagementPage() {
  const trpcUtils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [relatedTypeFilter, setRelatedTypeFilter] = useState("all");
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");
  const [formOpen, setFormOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    type: "receipt" as "receipt" | "payment",
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    currency: "CNY",
    bankAccountId: "",
    paymentMethod: "银行转账",
    customerId: "",
    counterparty: "",
    remark: "",
  });

  const { data: paymentRecords = [], isLoading: paymentLoading } = trpc.paymentRecords.list.useQuery({ limit: 2000 });
  const { data: customers = [], isLoading: customerLoading } = trpc.customers.list.useQuery({ limit: 500 });
  const { data: suppliers = [], isLoading: supplierLoading } = trpc.suppliers.list.useQuery({ limit: 500 });
  const { data: bankAccounts = [], isLoading: bankLoading } = trpc.bankAccounts.list.useQuery({});
  const { data: receivables = [], isLoading: receivableLoading } = trpc.accountsReceivable.list.useQuery({ limit: 500 });
  const { data: payables = [], isLoading: payableLoading } = trpc.accountsPayable.list.useQuery({ limit: 500 });
  const { data: expenses = [], isLoading: expenseLoading } = trpc.expenses.list.useQuery({ limit: 500 });
  const isLoading = paymentLoading || customerLoading || supplierLoading || bankLoading || receivableLoading || payableLoading || expenseLoading;
  const createPaymentMutation = trpc.paymentRecords.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        trpcUtils.paymentRecords.list.invalidate(),
        trpcUtils.bankAccounts.list.invalidate(),
      ]);
      toast.success("手工收支已新增");
      setFormOpen(false);
      setManualForm((prev) => ({
        ...prev,
        amount: "",
        customerId: "",
        counterparty: "",
        remark: "",
        bankAccountId: "",
        paymentDate: new Date().toISOString().slice(0, 10),
      }));
    },
  });

  const customerMap = useMemo(
    () => new Map((customers as any[]).map((row: any) => [Number(row.id), String(row.name || "")])),
    [customers],
  );
  const supplierMap = useMemo(
    () => new Map((suppliers as any[]).map((row: any) => [Number(row.id), String(row.name || "")])),
    [suppliers],
  );
  const bankAccountMap = useMemo(
    () => new Map((bankAccounts as any[]).map((row: any) => [Number(row.id), buildBankAccountLabel(row)])),
    [bankAccounts],
  );
  const existingRelationKeys = useMemo(() => {
    const set = new Set<string>();
    for (const row of paymentRecords as any[]) {
      for (const key of buildRelationKeys(row.relatedType, row.relatedId, row.relatedNo)) {
        set.add(key);
      }
    }
    return set;
  }, [paymentRecords]);

  const allRows = useMemo(() => {
    const rows = (paymentRecords as any[]).map((row: any) => {
      const type = String(row.type || "");
      const relatedType = String(row.relatedType || "other");
      const otherFlowMeta = relatedType === "other" ? parseOtherFlowRemark(row.remark) : { counterparty: "", note: String(row.remark || "") };
      const counterparty =
        relatedType === "other"
          ? (otherFlowMeta.counterparty || String(row.relatedNo || row.recordNo || "-"))
          : type === "receipt"
          ? customerMap.get(Number(row.customerId || 0)) || String(row.relatedNo || row.recordNo || "-")
          : supplierMap.get(Number(row.supplierId || 0)) || (relatedType === "expense" ? "报销付款" : String(row.relatedNo || row.recordNo || "-"));

      return {
        id: Number(row.id || 0),
        recordNo: String(row.recordNo || ""),
        paymentDate: formatDateOnly(row.paymentDate),
        type,
        relatedType,
        relatedTypeLabel: relatedTypeMap[relatedType] || relatedType,
        relatedNo: String(row.relatedNo || ""),
        counterparty,
        amount: Number(row.amountBase || row.amount || 0),
        originalAmount: Number(row.amount || 0),
        currency: String(row.currency || "CNY"),
        paymentMethod: String(row.paymentMethod || "-"),
        bankAccountName: bankAccountMap.get(Number(row.bankAccountId || 0)) || "-",
        remark: relatedType === "other" ? otherFlowMeta.note : String(row.remark || ""),
      };
    });

    for (const row of receivables as any[]) {
      const paidAmount = Number(row?.paidAmount ?? row?.receivedAmount ?? 0);
      if (!(paidAmount > 0)) continue;
      const relatedNo = String(row?.orderNo || row?.invoiceNo || "").trim();
      const relatedId = Number(row?.salesOrderId || 0);
      const keys = buildRelationKeys("sales_order", relatedId, relatedNo);
      if (keys.some((key) => existingRelationKeys.has(key))) continue;
      rows.push({
        id: `receivable-${row.id}`,
        recordNo: String(row.invoiceNo || row.orderNo || `AR-${row.id}`),
        paymentDate: formatDateOnly(row.receiptDate || row.updatedAt || row.createdAt),
        type: "receipt",
        relatedType: "sales_order",
        relatedTypeLabel: relatedTypeMap.sales_order,
        relatedNo,
        counterparty: String(row.customerName || customerMap.get(Number(row.customerId || 0)) || "-"),
        amount: paidAmount,
        originalAmount: paidAmount,
        currency: String(row.currency || "CNY"),
        paymentMethod: String(row.paymentMethod || "-"),
        bankAccountName: bankAccountMap.get(Number(row.bankAccountId || 0)) || "-",
        remark: String(row.remark || ""),
      });
    }

    for (const row of payables as any[]) {
      const paidAmount = Number(row?.paidAmount || 0);
      if (!(paidAmount > 0)) continue;
      const relatedNo = String(row?.orderNo || row?.invoiceNo || "").trim();
      const relatedId = Number(row?.purchaseOrderId || 0);
      const keys = buildRelationKeys("purchase_order", relatedId, relatedNo);
      if (keys.some((key) => existingRelationKeys.has(key))) continue;
      rows.push({
        id: `payable-${row.id}`,
        recordNo: String(row.invoiceNo || row.orderNo || `AP-${row.id}`),
        paymentDate: formatDateOnly(row.paymentDate || row.updatedAt || row.createdAt),
        type: "payment",
        relatedType: "purchase_order",
        relatedTypeLabel: relatedTypeMap.purchase_order,
        relatedNo,
        counterparty: String(row.supplierName || supplierMap.get(Number(row.supplierId || 0)) || "-"),
        amount: paidAmount,
        originalAmount: paidAmount,
        currency: String(row.currency || "CNY"),
        paymentMethod: String(row.paymentMethod || "-"),
        bankAccountName: bankAccountMap.get(Number(row.bankAccountId || 0)) || "-",
        remark: String(row.remark || ""),
      });
    }

    for (const row of expenses as any[]) {
      if (String(row?.status || "") !== "paid") continue;
      const paidAmount = Number(row?.totalAmount || 0);
      if (!(paidAmount > 0)) continue;
      const relatedNo = String(row?.reimbursementNo || "").trim();
      const relatedId = Number(row?.id || 0);
      const keys = buildRelationKeys("expense", relatedId, relatedNo);
      if (keys.some((key) => existingRelationKeys.has(key))) continue;
      rows.push({
        id: `expense-${row.id}`,
        recordNo: String(row.reimbursementNo || `EXP-${row.id}`),
        paymentDate: formatDateOnly(row.paidAt || row.updatedAt || row.createdAt),
        type: "payment",
        relatedType: "expense",
        relatedTypeLabel: relatedTypeMap.expense,
        relatedNo,
        counterparty: String(row.applicantName || row.department || "报销付款"),
        amount: paidAmount,
        originalAmount: paidAmount,
        currency: String(row.currency || "CNY"),
        paymentMethod: "报销付款",
        bankAccountName: bankAccountMap.get(Number(row.bankAccountId || 0)) || "-",
        remark: String(row.description || row.remark || ""),
      });
    }

    return rows.sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)));
  }, [bankAccountMap, customerMap, existingRelationKeys, expenses, payables, paymentRecords, receivables, supplierMap]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return allRows.filter((row) => {
      const matchesType = relatedTypeFilter === "all" || row.relatedType === relatedTypeFilter;
      const matchesSearch =
        !keyword ||
        row.recordNo.toLowerCase().includes(keyword) ||
        row.counterparty.toLowerCase().includes(keyword) ||
        row.relatedNo.toLowerCase().includes(keyword) ||
        row.relatedTypeLabel.toLowerCase().includes(keyword);
      return matchesType && matchesSearch;
    });
  }, [allRows, relatedTypeFilter, search]);

  const incomeRows = useMemo(() => filteredRows.filter((row) => row.type === "receipt"), [filteredRows]);
  const expenseRows = useMemo(() => filteredRows.filter((row) => row.type === "payment"), [filteredRows]);

  const incomeTotal = incomeRows.reduce((sum, row) => sum + row.amount, 0);
  const expenseTotal = expenseRows.reduce((sum, row) => sum + row.amount, 0);

  const incomePages = Math.max(1, Math.ceil(incomeRows.length / PAGE_SIZE));
  const expensePages = Math.max(1, Math.ceil(expenseRows.length / PAGE_SIZE));
  const pagedIncomeRows = incomeRows.slice((incomePage - 1) * PAGE_SIZE, incomePage * PAGE_SIZE);
  const pagedExpenseRows = expenseRows.slice((expensePage - 1) * PAGE_SIZE, expensePage * PAGE_SIZE);

  useEffect(() => {
    setIncomePage(1);
    setExpensePage(1);
  }, [relatedTypeFilter, search]);

  useEffect(() => {
    if (incomePage > incomePages) setIncomePage(incomePages);
  }, [incomePage, incomePages]);

  useEffect(() => {
    if (expensePage > expensePages) setExpensePage(expensePages);
  }, [expensePage, expensePages]);

  const openCreateDialog = () => {
    setManualForm({
      type: activeTab === "income" ? "receipt" : "payment",
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: "",
      currency: "CNY",
      bankAccountId: "",
      paymentMethod: "银行转账",
      customerId: "",
      counterparty: "",
      remark: "",
    });
    setFormOpen(true);
  };

  const handleCreateManualRecord = async () => {
    const amount = Number(manualForm.amount || 0);
    const bankAccountId = Number(manualForm.bankAccountId || 0);
    if (!(amount > 0)) {
      toast.error("请输入有效金额");
      return;
    }
    if (!bankAccountId) {
      toast.error("请选择账户");
      return;
    }
    if (!manualForm.counterparty.trim()) {
      toast.error("请填写往来单位或摘要");
      return;
    }

    await createPaymentMutation.mutateAsync({
      recordNo: buildManualRecordNo(manualForm.type),
      type: manualForm.type,
      relatedType: "other",
      relatedNo: manualForm.counterparty.trim(),
      customerId: manualForm.customerId ? Number(manualForm.customerId) : undefined,
      amount: toRoundedString(amount, 2),
      currency: manualForm.currency,
      amountBase: toRoundedString(amount, 2),
      exchangeRate: "1",
      bankAccountId,
      paymentDate: manualForm.paymentDate,
      paymentMethod: manualForm.paymentMethod || "银行转账",
      remark: buildOtherFlowRemark(manualForm.counterparty, manualForm.remark),
    });
  };

  return (
    <ERPLayout>
      <div className="w-full px-3 py-4 md:px-4 md:py-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">费用管理</h1>
              <p className="text-sm text-muted-foreground mt-0.5">系统联动流水只读，手工补录统一走“其他收支”。</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            {activeTab === "income" ? "新增收入" : "新增支出"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="搜索流水号、往来单位、来源单号..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={relatedTypeFilter} onValueChange={setRelatedTypeFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              {Object.entries(relatedTypeMap).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "income" | "expense")}>
          <TabsList className="mb-3">
            <TabsTrigger value="income" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              收入管理
            </TabsTrigger>
            <TabsTrigger value="expense" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              支出管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-green-600">{formatMoney(incomeTotal)}</div><div className="text-xs text-muted-foreground mt-0.5">已收款金额</div></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-blue-600">{incomeRows.length}</div><div className="text-xs text-muted-foreground mt-0.5">收款笔数</div></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-emerald-600">{incomeRows.filter((row) => row.relatedType === "sales_order").length}</div><div className="text-xs text-muted-foreground mt-0.5">销售回款</div></CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>流水号</TableHead>
                      <TableHead>收款日期</TableHead>
                      <TableHead>来源</TableHead>
                      <TableHead>往来单位</TableHead>
                      <TableHead>来源单号</TableHead>
                      <TableHead>收款账户</TableHead>
                      <TableHead>收款方式</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">加载中...</TableCell></TableRow>
                    ) : incomeRows.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无收入流水</TableCell></TableRow>
                    ) : pagedIncomeRows.map((row) => (
                      <TableRow key={`income-${row.id}`}>
                        <TableCell className="font-mono text-sm">{row.recordNo}</TableCell>
                        <TableCell>{formatDateOnly(row.paymentDate)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{row.relatedTypeLabel}</Badge></TableCell>
                        <TableCell className="font-medium">{row.counterparty}</TableCell>
                        <TableCell>{row.relatedNo || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.bankAccountName}</TableCell>
                        <TableCell>{row.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{formatMoney(row.originalAmount || row.amount, row.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <TablePaginationFooter total={incomeRows.length} page={incomePage} pageSize={PAGE_SIZE} onPageChange={setIncomePage} />
          </TabsContent>

          <TabsContent value="expense" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-red-600">{formatMoney(expenseTotal)}</div><div className="text-xs text-muted-foreground mt-0.5">已付款金额</div></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-blue-600">{expenseRows.length}</div><div className="text-xs text-muted-foreground mt-0.5">付款笔数</div></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-amber-600">{expenseRows.filter((row) => row.relatedType === "expense").length}</div><div className="text-xs text-muted-foreground mt-0.5">报销付款</div></CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>流水号</TableHead>
                      <TableHead>付款日期</TableHead>
                      <TableHead>来源</TableHead>
                      <TableHead>往来单位</TableHead>
                      <TableHead>来源单号</TableHead>
                      <TableHead>付款账户</TableHead>
                      <TableHead>付款方式</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">加载中...</TableCell></TableRow>
                    ) : expenseRows.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无支出流水</TableCell></TableRow>
                    ) : pagedExpenseRows.map((row) => (
                      <TableRow key={`expense-${row.id}`}>
                        <TableCell className="font-mono text-sm">{row.recordNo}</TableCell>
                        <TableCell>{formatDateOnly(row.paymentDate)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{row.relatedTypeLabel}</Badge></TableCell>
                        <TableCell className="font-medium">{row.counterparty}</TableCell>
                        <TableCell>{row.relatedNo || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.bankAccountName}</TableCell>
                        <TableCell>{row.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">-{formatMoney(row.originalAmount || row.amount, row.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <TablePaginationFooter total={expenseRows.length} page={expensePage} pageSize={PAGE_SIZE} onPageChange={setExpensePage} />
          </TabsContent>
        </Tabs>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{manualForm.type === "receipt" ? "新增收入" : "新增支出"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>收支类型</Label>
                <Select value={manualForm.type} onValueChange={(value) => setManualForm((prev) => ({ ...prev, type: value as "receipt" | "payment" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">收入</SelectItem>
                    <SelectItem value="payment">支出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>日期</Label>
                <Input type="date" value={manualForm.paymentDate} onChange={(event) => setManualForm((prev) => ({ ...prev, paymentDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>金额</Label>
                <Input type="number" value={manualForm.amount} onChange={(event) => setManualForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="输入金额" />
              </div>
              <div className="space-y-2">
                <Label>币种</Label>
                <Select value={manualForm.currency} onValueChange={(value) => setManualForm((prev) => ({ ...prev, currency: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["CNY", "USD", "EUR", "GBP", "JPY", "HKD"].map((currency) => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>账户</Label>
                <Select value={manualForm.bankAccountId} onValueChange={(value) => setManualForm((prev) => ({ ...prev, bankAccountId: value }))}>
                  <SelectTrigger><SelectValue placeholder="选择账户" /></SelectTrigger>
                  <SelectContent>
                    {(bankAccounts as any[]).map((account: any) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {buildBankAccountLabel(account)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>往来单位 / 摘要</Label>
                <div className="flex gap-2">
                  <Input
                    value={manualForm.counterparty}
                    onChange={(event) => setManualForm((prev) => ({
                      ...prev,
                      counterparty: event.target.value,
                      customerId: "",
                    }))}
                    placeholder="可手工输入，也可从客户档案选择"
                  />
                  <Button type="button" variant="outline" onClick={() => setCustomerPickerOpen(true)}>
                    选择客户
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>收支方式</Label>
                <Input value={manualForm.paymentMethod} onChange={(event) => setManualForm((prev) => ({ ...prev, paymentMethod: event.target.value }))} placeholder="如：银行转账、现金" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>备注</Label>
                <Textarea rows={4} value={manualForm.remark} onChange={(event) => setManualForm((prev) => ({ ...prev, remark: event.target.value }))} placeholder="补充说明" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
              <Button onClick={handleCreateManualRecord} disabled={createPaymentMutation.isPending}>确认新增</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <EntityPickerDialog
          open={customerPickerOpen}
          onOpenChange={setCustomerPickerOpen}
          title="选择客户"
          searchPlaceholder="搜索客户编码、客户名称、联系人..."
          rows={(customers as any[])}
          selectedId={manualForm.customerId}
          columns={[
            { key: "code", title: "客户编码", render: (row: any) => row.code || "-" },
            { key: "name", title: "客户名称", render: (row: any) => row.name || "-" },
            { key: "contactPerson", title: "联系人", render: (row: any) => row.contactPerson || row.contact || "-" },
            { key: "phone", title: "电话", render: (row: any) => row.phone || "-" },
          ]}
          onSelect={(row: any) => {
            setManualForm((prev) => ({
              ...prev,
              customerId: String(row?.id || ""),
              counterparty: String(row?.name || ""),
            }));
            setCustomerPickerOpen(false);
          }}
          filterFn={(row: any, query: string) => {
            const keyword = query.toLowerCase();
            return (
              String(row?.code || "").toLowerCase().includes(keyword) ||
              String(row?.name || "").toLowerCase().includes(keyword) ||
              String(row?.contactPerson || row?.contact || "").toLowerCase().includes(keyword) ||
              String(row?.phone || "").toLowerCase().includes(keyword)
            );
          }}
        />
      </div>
    </ERPLayout>
  );
}
