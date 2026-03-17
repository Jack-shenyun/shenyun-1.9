import { useEffect, useMemo, useRef, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { trpc } from "@/lib/trpc";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import PrintPreviewButton from "@/components/PrintPreviewButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyValue, formatDateValue, formatDisplayNumber, safeLower, toSafeNumber } from "@/lib/formatters";
import { toast } from "sonner";
import { Edit, Eye, Plus, RefreshCw, Save, Trash2, Wallet } from "lucide-react";

type ExchangeRateForm = {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  effectiveDate: string;
  source: string;
};

type BankAccountForm = {
  accountCode: string;
  accountName: string;
  bankName: string;
  swiftCode: string;
  accountNo: string;
  openingBalance: string;
  currency: string;
  status: "active" | "frozen" | "closed";
  bankAddress: string;
};

type BalanceAdjustForm = {
  direction: "increase" | "decrease";
  amount: string;
  adjustDate: string;
  remark: string;
};

type SettlementForm = {
  targetAccountId: string;
  amount: string;
  rate: string;
  fee: string;
  settleDate: string;
  remark: string;
};

type TransferForm = {
  targetAccountId: string;
  amount: string;
  transferDate: string;
  remark: string;
};

const CURRENCY_OPTIONS = ["USD", "CNY", "EUR", "HKD", "JPY", "GBP"];
const BANK_CURRENCIES = ["CNY", "USD", "EUR", "HKD", "JPY", "GBP"];

const ACCOUNT_TEMPLATE_ROWS = [
  {
    accountCode: "ZH-005",
    accountName: "国际站",
    status: "active" as const,
    currency: "USD",
    bankName: "CITIBANK N.A. SINGAPORE BRANCH",
    swiftCode: "CITISGSG or CITISGSGXXX",
    accountNo: "10695166385",
    bankAddress: "51 Bras Basah Road 01-21 Singapore, 189554",
  },
  {
    accountCode: "ZH-004",
    accountName: "农业银行",
    status: "active" as const,
    currency: "CNY",
    bankName: "中国农业银行股份有限公司苏州临湖支行",
    swiftCode: "103305054082",
    accountNo: "10540801040026476",
    bankAddress: "苏州市吴中区临湖镇银藏路666号11幢",
  },
  {
    accountCode: "ZH-003",
    accountName: "XT银行",
    status: "active" as const,
    currency: "USD",
    bankName: "JPMorgan Chase Bank N.A., Hong Kong Branch",
    swiftCode: "CHASHKHH",
    accountNo: "63003695928",
    bankAddress: "18/F, 20/F, 22-29/F, CHATER HOUSE, 8 CONNAUGHT ROAD CENTRAL, HONG KONG",
  },
  {
    accountCode: "ZH-002",
    accountName: "建设银行（美元）",
    status: "active" as const,
    currency: "USD",
    bankName: "China Construction Bank Corporation Suzhou Branch Wuzhong Subbranch",
    swiftCode: "Pcbccnbjjss",
    accountNo: "32250199753600004047",
    bankAddress: "Building 11, No. 666 Yinzang Road, Linhu Town, Wuzhong District, Suzhou, P.R. China",
  },
  {
    accountCode: "ZH-001",
    accountName: "建设银行（人民币）",
    status: "active" as const,
    currency: "CNY",
    bankName: "中国建设银行股份有限公司苏州滨湖支行",
    swiftCode: "105305007305",
    accountNo: "32250110073000001909",
    bankAddress: "苏州市吴中区临湖镇银藏路666号11幢",
  },
];

function buildDefaultForm(): ExchangeRateForm {
  return {
    fromCurrency: "USD",
    toCurrency: "CNY",
    rate: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    source: "手动",
  };
}

function buildDefaultBankForm(): BankAccountForm {
  return {
    accountCode: "",
    accountName: "",
    bankName: "",
    swiftCode: "",
    accountNo: "",
    openingBalance: "0",
    currency: "CNY",
    status: "active",
    bankAddress: "",
  };
}

function buildDefaultBalanceAdjustForm(): BalanceAdjustForm {
  return {
    direction: "increase",
    amount: "",
    adjustDate: new Date().toISOString().slice(0, 10),
    remark: "",
  };
}

function buildDefaultSettlementForm(): SettlementForm {
  return {
    targetAccountId: "",
    amount: "",
    rate: "",
    fee: "",
    settleDate: new Date().toISOString().slice(0, 10),
    remark: "",
  };
}

function buildDefaultTransferForm(): TransferForm {
  return {
    targetAccountId: "",
    amount: "",
    transferDate: new Date().toISOString().slice(0, 10),
    remark: "",
  };
}

function parseAccountCode(remark?: string | null) {
  const text = String(remark || "");
  const match = text.match(/\[(.*?)\]/);
  return match?.[1] || "";
}

function parseAddress(remark?: string | null) {
  const text = String(remark || "");
  const prefix = "地址:";
  const idx = text.indexOf(prefix);
  if (idx < 0) return "";
  const lineNoIdx = text.indexOf(" 行号:");
  const raw = lineNoIdx > idx ? text.slice(idx + prefix.length, lineNoIdx) : text.slice(idx + prefix.length);
  return raw.trim();
}

function parseLineNoFromRemark(remark?: string | null) {
  const text = String(remark || "");
  const prefix = "行号:";
  const idx = text.indexOf(prefix);
  if (idx < 0) return "";
  return text.slice(idx + prefix.length).trim();
}

function getCurrencySymbol(currency?: string | null) {
  const code = String(currency || "CNY").toUpperCase();
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  if (code === "GBP") return "£";
  if (code === "JPY") return "¥";
  if (code === "HKD") return "HK$";
  return "¥";
}

function formatAccountMoney(value: number, currency?: string | null) {
  return formatCurrencyValue(value, getCurrencySymbol(currency));
}

function buildPaymentRelationKeys(relatedType: unknown, relatedId: unknown, relatedNo: unknown) {
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

export default function FinanceAccountsPage() {
  const PAGE_SIZE = 10;
  const accountFormPrintRef = useRef<HTMLDivElement>(null);
  const accountViewPrintRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [accountEditingId, setAccountEditingId] = useState<number | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [liveCurrency, setLiveCurrency] = useState("USD");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<ExchangeRateForm>(buildDefaultForm());
  const [bankForm, setBankForm] = useState<BankAccountForm>(buildDefaultBankForm());
  const [balanceAdjustForm, setBalanceAdjustForm] = useState<BalanceAdjustForm>(buildDefaultBalanceAdjustForm());
  const [settlementForm, setSettlementForm] = useState<SettlementForm>(buildDefaultSettlementForm());
  const [transferForm, setTransferForm] = useState<TransferForm>(buildDefaultTransferForm());

  const { data: rates = [], refetch, isLoading } = trpc.exchangeRates.list.useQuery({ limit: 300 });
  const { data: bankAccounts = [], refetch: refetchBankAccounts, isLoading: bankLoading } = trpc.bankAccounts.list.useQuery({});
  const { data: paymentRecords = [], refetch: refetchPaymentRecords } = trpc.paymentRecords.list.useQuery({ limit: 2000 });
  const { data: receivables = [] } = trpc.accountsReceivable.list.useQuery();
  const { data: payables = [] } = trpc.accountsPayable.list.useQuery();
  const { data: expenses = [] } = trpc.expenses.list.useQuery({ limit: 500 });

  const createBankMutation = trpc.bankAccounts.create.useMutation({
    onSuccess: async () => {
      toast.success("资金账户已新增");
      setAccountEditingId(null);
      setBankForm(buildDefaultBankForm());
      setAccountDialogOpen(false);
      await refetchBankAccounts();
    },
  });
  const updateBankMutation = trpc.bankAccounts.update.useMutation({
    onSuccess: async () => {
      toast.success("资金账户已更新");
      setAccountEditingId(null);
      setBankForm(buildDefaultBankForm());
      setAccountDialogOpen(false);
      await refetchBankAccounts();
    },
  });
  const deleteBankMutation = trpc.bankAccounts.delete.useMutation({
    onSuccess: async () => {
      toast.success("资金账户已删除");
      await refetchBankAccounts();
    },
  });
  const createPaymentRecordMutation = trpc.paymentRecords.create.useMutation();

  const createMutation = trpc.exchangeRates.create.useMutation({
    onSuccess: async () => {
      toast.success("汇率已新增");
      setForm(buildDefaultForm());
      setEditingId(null);
      await refetch();
    },
  });
  const updateMutation = trpc.exchangeRates.update.useMutation({
    onSuccess: async () => {
      toast.success("汇率已更新");
      setForm(buildDefaultForm());
      setEditingId(null);
      await refetch();
    },
  });
  const deleteMutation = trpc.exchangeRates.delete.useMutation({
    onSuccess: async () => {
      toast.success("汇率已删除");
      await refetch();
    },
  });
  const refreshLiveMutation = trpc.exchangeRates.refreshLive.useMutation({
    onSuccess: async (res) => {
      toast.success(`实时汇率已同步：1 ${res.fromCurrency} = ${formatDisplayNumber(res.rate, { maximumFractionDigits: 6 })} ${res.toCurrency}`);
      await refetch();
    },
    onError: (error) => {
      toast.error("实时汇率获取失败", { description: error.message });
    },
  });

  const filteredAccounts = useMemo(() => {
    const keyword = safeLower(accountSearchTerm);
    return (bankAccounts as any[]).filter((row) => {
      if (accountStatusFilter !== "all" && String(row.status) !== accountStatusFilter) return false;
      if (!keyword) return true;
      return (
        safeLower(row.accountName).includes(keyword) ||
        safeLower(row.bankName).includes(keyword) ||
        safeLower(row.accountNo).includes(keyword) ||
        safeLower(row.swiftCode).includes(keyword) ||
        safeLower(row.currency).includes(keyword) ||
        safeLower(parseAccountCode(row.remark)).includes(keyword) ||
        safeLower(String(row.bankAddress || parseAddress(row.remark))).includes(keyword)
      );
    });
  }, [accountSearchTerm, accountStatusFilter, bankAccounts]);

  const accountCards = useMemo(() => {
    const records = paymentRecords as any[];
    const receivableRows = receivables as any[];
    const payableRows = payables as any[];
    const expenseRows = expenses as any[];
    const linkedKeys = new Set<string>();
    records.forEach((row) => {
      buildPaymentRelationKeys(row.relatedType, row.relatedId, row.relatedNo).forEach((key) => linkedKeys.add(key));
    });
    return (bankAccounts as any[]).map((account) => {
      const accountId = Number(account.id);
      const accountRecords = records.filter((row) => Number(row.bankAccountId) === accountId);
      const paymentRecordIncome = accountRecords
        .filter((row) => row.type === "receipt")
        .reduce((sum, row) => sum + toSafeNumber(row.amount), 0);
      const paymentRecordExpense = accountRecords
        .filter((row) => row.type === "payment")
        .reduce((sum, row) => sum + toSafeNumber(row.amount), 0);
      const receivableIncome = receivableRows
        .filter((row) => {
          if (Number(row.bankAccountId) !== accountId) return false;
          const keys = buildPaymentRelationKeys("sales_order", row.salesOrderId, row.orderNo || row.invoiceNo);
          return !keys.some((key) => linkedKeys.has(key));
        })
        .reduce((sum, row) => sum + toSafeNumber(row.paidAmount ?? row.receivedAmount), 0);
      const payableExpense = payableRows
        .filter((row) => {
          if (Number(row.bankAccountId) !== accountId) return false;
          const keys = buildPaymentRelationKeys("purchase_order", row.purchaseOrderId, row.orderNo || row.invoiceNo);
          return !keys.some((key) => linkedKeys.has(key));
        })
        .reduce((sum, row) => sum + toSafeNumber(row.paidAmount), 0);
      const expensePaid = expenseRows
        .filter((row) => {
          if (Number(row.bankAccountId) !== accountId || String(row.status || "") !== "paid") return false;
          const keys = buildPaymentRelationKeys("expense", row.id, row.reimbursementNo);
          return !keys.some((key) => linkedKeys.has(key));
        })
        .reduce((sum, row) => sum + toSafeNumber(row.totalAmount), 0);
      const income = paymentRecordIncome + receivableIncome;
      const expense = paymentRecordExpense + payableExpense + expensePaid;
      const openingBalance = toSafeNumber(account.balance);
      const remaining = openingBalance + income - expense;
      return {
        id: accountId,
        accountName: String(account.accountName || "-"),
        currency: String(account.currency || "CNY").toUpperCase(),
        income,
        expense,
        remaining,
      };
    });
  }, [bankAccounts, paymentRecords, receivables, payables, expenses]);

  const viewingAccountCard = useMemo(
    () => accountCards.find((item) => Number(item.id) === Number(viewingAccount?.id)),
    [accountCards, viewingAccount],
  );

  const viewingAccountRecords = useMemo(() => {
    const accountId = Number(viewingAccount?.id);
    if (!Number.isFinite(accountId) || accountId <= 0) return [];
    const linkedKeys = new Set<string>();
    (paymentRecords as any[]).forEach((row) => {
      buildPaymentRelationKeys(row.relatedType, row.relatedId, row.relatedNo).forEach((key) => linkedKeys.add(key));
    });
    const rows = [
      ...(paymentRecords as any[])
        .filter((row) => Number(row.bankAccountId) === accountId)
        .map((row) => ({
          id: `payment-${row.id}`,
          date: String(row.paymentDate || row.createdAt || ""),
          typeLabel: row.type === "receipt" ? "收入" : "支出",
          amount: toSafeNumber(row.amount),
          currency: row.currency || viewingAccount?.currency,
          summary: row.remark || row.relatedNo || row.recordNo || "-",
        })),
      ...(receivables as any[])
        .filter((row) => {
          if (Number(row.bankAccountId) !== accountId || toSafeNumber(row.paidAmount ?? row.receivedAmount) <= 0) return false;
          const keys = buildPaymentRelationKeys("sales_order", row.salesOrderId, row.orderNo || row.invoiceNo);
          return !keys.some((key) => linkedKeys.has(key));
        })
        .map((row) => ({
          id: `receivable-${row.id}`,
          date: String(row.receiptDate || row.updatedAt || row.createdAt || ""),
          typeLabel: "销售收款",
          amount: toSafeNumber(row.paidAmount ?? row.receivedAmount),
          currency: row.currency || viewingAccount?.currency,
          summary: `${row.invoiceNo || "-"}${row.orderNo ? ` / ${row.orderNo}` : ""}`,
        })),
      ...(payables as any[])
        .filter((row) => {
          if (Number(row.bankAccountId) !== accountId || toSafeNumber(row.paidAmount) <= 0) return false;
          const keys = buildPaymentRelationKeys("purchase_order", row.purchaseOrderId, row.orderNo || row.invoiceNo);
          return !keys.some((key) => linkedKeys.has(key));
        })
        .map((row) => ({
          id: `payable-${row.id}`,
          date: String(row.paymentDate || row.updatedAt || row.createdAt || ""),
          typeLabel: "采购付款",
          amount: toSafeNumber(row.paidAmount),
          currency: row.currency || viewingAccount?.currency,
          summary: `${row.invoiceNo || "-"}${row.supplierName ? ` / ${row.supplierName}` : ""}`,
        })),
      ...(expenses as any[])
        .filter((row) => {
          if (Number(row.bankAccountId) !== accountId || String(row.status || "") !== "paid") return false;
          const keys = buildPaymentRelationKeys("expense", row.id, row.reimbursementNo);
          return !keys.some((key) => linkedKeys.has(key));
        })
        .map((row) => ({
          id: `expense-${row.id}`,
          date: String(row.paidAt || row.updatedAt || row.createdAt || ""),
          typeLabel: "报销付款",
          amount: toSafeNumber(row.totalAmount),
          currency: row.currency || viewingAccount?.currency,
          summary: `${row.reimbursementNo || "-"}${row.description ? ` / ${row.description}` : ""}`,
        })),
    ];
    return rows
      .sort(
        (a, b) =>
          new Date(String(b.date || "")).getTime() -
          new Date(String(a.date || "")).getTime(),
      )
      .slice(0, 20);
  }, [paymentRecords, receivables, payables, expenses, viewingAccount]);

  const cnyAccounts = useMemo(
    () =>
      (bankAccounts as any[]).filter(
        (row) =>
          String(row.currency || "").toUpperCase() === "CNY" &&
          String(row.status || "") === "active" &&
          Number(row.id) !== Number(viewingAccount?.id),
      ),
    [bankAccounts, viewingAccount],
  );

  const sameCurrencyAccounts = useMemo(
    () =>
      (bankAccounts as any[]).filter(
        (row) =>
          String(row.currency || "").toUpperCase() === String(viewingAccount?.currency || "").toUpperCase() &&
          String(row.status || "") === "active" &&
          Number(row.id) !== Number(viewingAccount?.id),
      ),
    [bankAccounts, viewingAccount],
  );

  const selectedSettlementTargetCard = useMemo(
    () => accountCards.find((item) => Number(item.id) === Number(settlementForm.targetAccountId)),
    [accountCards, settlementForm.targetAccountId],
  );

  const selectedTransferTargetCard = useMemo(
    () => accountCards.find((item) => Number(item.id) === Number(transferForm.targetAccountId)),
    [accountCards, transferForm.targetAccountId],
  );

  const defaultSettlementRate = useMemo(() => {
    const fromCurrency = String(viewingAccount?.currency || "").toUpperCase();
    if (!fromCurrency || fromCurrency === "CNY") return "";
    const matched = (rates as any[]).find(
      (row) =>
        String(row.fromCurrency || "").toUpperCase() === fromCurrency &&
        String(row.toCurrency || "").toUpperCase() === "CNY",
    );
    return matched ? String(matched.rate ?? "") : "";
  }, [rates, viewingAccount]);

  const filteredRates = useMemo(() => {
    return (rates as any[]).filter((row) => {
      const keyword = safeLower(searchTerm);
      if (!keyword) return true;
      return (
        safeLower(row.fromCurrency).includes(keyword) ||
        safeLower(row.toCurrency).includes(keyword) ||
        safeLower(row.source).includes(keyword)
      );
    });
  }, [rates, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
  const pagedAccounts = filteredAccounts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [accountSearchTerm, accountStatusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const latestLiveRate = useMemo(() => {
    const target = (rates as any[]).find(
      (row) => String(row.fromCurrency).toUpperCase() === liveCurrency && String(row.toCurrency).toUpperCase() === "CNY",
    );
    return target;
  }, [rates, liveCurrency]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isBankSubmitting = createBankMutation.isPending || updateBankMutation.isPending;

  const handleSaveBank = () => {
    if (!bankForm.accountName || !bankForm.bankName || !bankForm.accountNo) {
      toast.error("请填写完整账户信息（账户名称/开户行/银行账号）");
      return;
    }
    const openingBalance = Number(bankForm.openingBalance);
    if (!Number.isFinite(openingBalance)) {
      toast.error("期初金额必须是有效数字");
      return;
    }

    const remarkParts = [bankForm.accountCode ? `[${bankForm.accountCode}]` : ""].filter(Boolean);
    const remark = remarkParts.join(" ");

    if (accountEditingId) {
      updateBankMutation.mutate({
        id: accountEditingId,
        data: {
          accountName: bankForm.accountName,
          bankName: bankForm.bankName,
          bankAddress: bankForm.bankAddress || undefined,
          accountNo: bankForm.accountNo,
          swiftCode: bankForm.swiftCode || undefined,
          currency: bankForm.currency,
          status: bankForm.status,
          accountType: "basic",
          balance: String(openingBalance),
          remark,
        },
      });
      return;
    }

    createBankMutation.mutate({
      accountName: bankForm.accountName,
      bankName: bankForm.bankName,
      bankAddress: bankForm.bankAddress || undefined,
      accountNo: bankForm.accountNo,
      swiftCode: bankForm.swiftCode || undefined,
      currency: bankForm.currency,
      status: bankForm.status,
      accountType: "basic",
      isDefault: false,
      balance: String(openingBalance),
      remark,
    });
  };

  const handleEditBank = (row: any) => {
    setAccountEditingId(Number(row.id));
    setBankForm({
      accountCode: parseAccountCode(row.remark),
      accountName: String(row.accountName || ""),
      bankName: String(row.bankName || ""),
      swiftCode: String(row.swiftCode || ""),
      accountNo: String(row.accountNo || ""),
      openingBalance: String(row.balance ?? "0"),
      currency: String(row.currency || "CNY").toUpperCase(),
      status: String(row.status || "active") as "active" | "frozen" | "closed",
      bankAddress: String(row.bankAddress || parseAddress(row.remark) || ""),
    });
    setAccountDialogOpen(true);
  };

  const handleViewBank = (id: number) => {
    const row = (bankAccounts as any[]).find((item) => Number(item.id) === id);
    if (!row) return;
    setViewingAccount(row);
    setViewDialogOpen(true);
  };

  const openBalanceAdjust = () => {
    setBalanceAdjustForm(buildDefaultBalanceAdjustForm());
    setBalanceDialogOpen(true);
  };

  const openSettlement = () => {
    setSettlementForm({
      ...buildDefaultSettlementForm(),
      rate: defaultSettlementRate,
    });
    setSettlementDialogOpen(true);
  };

  const openTransfer = () => {
    setTransferForm(buildDefaultTransferForm());
    setTransferDialogOpen(true);
  };

  const handleDeleteBank = (id: number) => {
    if (!window.confirm("确认删除这个资金账户吗？")) return;
    deleteBankMutation.mutate({ id });
  };

  const resetBankForm = () => {
    setAccountEditingId(null);
    setBankForm(buildDefaultBankForm());
    setAccountDialogOpen(false);
  };

  const handleBalanceAdjustSubmit = async () => {
    const accountId = Number(viewingAccount?.id);
    const amount = toSafeNumber(balanceAdjustForm.amount);
    if (!Number.isFinite(accountId) || accountId <= 0) return;
    if (amount <= 0) {
      toast.error("请输入有效调整金额");
      return;
    }
    try {
      await createPaymentRecordMutation.mutateAsync({
        type: balanceAdjustForm.direction === "increase" ? "receipt" : "payment",
        relatedType: "other",
        relatedNo: String(viewingAccount?.accountName || ""),
        amount: String(amount),
        currency: String(viewingAccount?.currency || "CNY").toUpperCase(),
        amountBase: String(amount),
        exchangeRate: "1",
        bankAccountId: accountId,
        paymentDate: balanceAdjustForm.adjustDate,
        paymentMethod: "余额调整",
        remark: `${balanceAdjustForm.direction === "increase" ? "余额调增" : "余额调减"}${balanceAdjustForm.remark ? `：${balanceAdjustForm.remark}` : ""}`,
      });
      await refetchPaymentRecords();
      setBalanceDialogOpen(false);
      toast.success("余额调整已保存");
    } catch (error: any) {
      toast.error("余额调整失败", { description: error?.message || "请稍后重试" });
    }
  };

  const handleSettlementSubmit = async () => {
    const sourceAccountId = Number(viewingAccount?.id);
    const targetAccountId = Number(settlementForm.targetAccountId);
    const amount = toSafeNumber(settlementForm.amount);
    const rate = toSafeNumber(settlementForm.rate);
    const fee = toSafeNumber(settlementForm.fee);
    const sourceCurrency = String(viewingAccount?.currency || "").toUpperCase();
    const targetAccount = (bankAccounts as any[]).find((row) => Number(row.id) === targetAccountId);
    const sourceBalance = toSafeNumber(viewingAccountCard?.remaining);
    if (!Number.isFinite(sourceAccountId) || sourceAccountId <= 0) return;
    if (sourceCurrency === "CNY") {
      toast.error("人民币账户不需要结汇");
      return;
    }
    if (!Number.isFinite(targetAccountId) || targetAccountId <= 0) {
      toast.error("请选择人民币账户");
      return;
    }
    if (amount <= 0 || rate <= 0) {
      toast.error("请填写有效的结汇金额和汇率");
      return;
    }
    if (amount > sourceBalance) {
      toast.error("结汇金额不能超过当前余额");
      return;
    }
    const grossCny = amount * rate;
    const netCny = grossCny - fee;
    if (netCny <= 0) {
      toast.error("手续费不能大于等于结汇金额");
      return;
    }
    try {
      await createPaymentRecordMutation.mutateAsync({
        type: "payment",
        relatedType: "other",
        relatedNo: String(targetAccount?.accountName || ""),
        amount: String(amount),
        currency: sourceCurrency,
        amountBase: String(grossCny),
        exchangeRate: String(rate),
        bankAccountId: sourceAccountId,
        paymentDate: settlementForm.settleDate,
        paymentMethod: "结汇",
        remark: `结汇转出到 ${String(targetAccount?.accountName || "")}${settlementForm.remark ? `：${settlementForm.remark}` : ""}`,
      });
      await createPaymentRecordMutation.mutateAsync({
        type: "receipt",
        relatedType: "other",
        relatedNo: String(viewingAccount?.accountName || ""),
        amount: String(grossCny),
        currency: "CNY",
        amountBase: String(grossCny),
        exchangeRate: "1",
        bankAccountId: targetAccountId,
        paymentDate: settlementForm.settleDate,
        paymentMethod: "结汇",
        remark: `结汇转入来自 ${String(viewingAccount?.accountName || "")}`,
      });
      if (fee > 0) {
        await createPaymentRecordMutation.mutateAsync({
          type: "payment",
          relatedType: "other",
          relatedNo: String(viewingAccount?.accountName || ""),
          amount: String(fee),
          currency: "CNY",
          amountBase: String(fee),
          exchangeRate: "1",
          bankAccountId: targetAccountId,
          paymentDate: settlementForm.settleDate,
          paymentMethod: "结汇手续费",
          remark: `结汇手续费${settlementForm.remark ? `：${settlementForm.remark}` : ""}`,
        });
      }
      await refetchPaymentRecords();
      setSettlementDialogOpen(false);
      toast.success("结汇已保存");
    } catch (error: any) {
      toast.error("结汇失败", { description: error?.message || "请稍后重试" });
    }
  };

  const handleTransferSubmit = async () => {
    const sourceAccountId = Number(viewingAccount?.id);
    const targetAccountId = Number(transferForm.targetAccountId);
    const amount = toSafeNumber(transferForm.amount);
    const sourceCurrency = String(viewingAccount?.currency || "CNY").toUpperCase();
    const sourceBalance = toSafeNumber(viewingAccountCard?.remaining);
    const targetAccount = (bankAccounts as any[]).find((row) => Number(row.id) === targetAccountId);

    if (!Number.isFinite(sourceAccountId) || sourceAccountId <= 0) return;
    if (!Number.isFinite(targetAccountId) || targetAccountId <= 0) {
      toast.error("请选择调入账户");
      return;
    }
    if (amount <= 0) {
      toast.error("请输入有效调拨金额");
      return;
    }
    if (amount > sourceBalance) {
      toast.error("调拨金额不能超过当前余额");
      return;
    }

    try {
      await createPaymentRecordMutation.mutateAsync({
        type: "payment",
        relatedType: "other",
        relatedNo: String(targetAccount?.accountName || ""),
        amount: String(amount),
        currency: sourceCurrency,
        amountBase: String(amount),
        exchangeRate: "1",
        bankAccountId: sourceAccountId,
        paymentDate: transferForm.transferDate,
        paymentMethod: "账户调拨",
        remark: `账户调拨转出到 ${String(targetAccount?.accountName || "")}${transferForm.remark ? `：${transferForm.remark}` : ""}`,
      });
      await createPaymentRecordMutation.mutateAsync({
        type: "receipt",
        relatedType: "other",
        relatedNo: String(viewingAccount?.accountName || ""),
        amount: String(amount),
        currency: sourceCurrency,
        amountBase: String(amount),
        exchangeRate: "1",
        bankAccountId: targetAccountId,
        paymentDate: transferForm.transferDate,
        paymentMethod: "账户调拨",
        remark: `账户调拨转入来自 ${String(viewingAccount?.accountName || "")}${transferForm.remark ? `：${transferForm.remark}` : ""}`,
      });
      await refetchPaymentRecords();
      setTransferDialogOpen(false);
      toast.success("账户调拨已保存");
    } catch (error: any) {
      toast.error("账户调拨失败", { description: error?.message || "请稍后重试" });
    }
  };

  const syncTemplateAccounts = async () => {
    try {
      const existingNos = new Set((bankAccounts as any[]).map((row) => String(row.accountNo || "")));
      let created = 0;
      for (const row of ACCOUNT_TEMPLATE_ROWS) {
        if (existingNos.has(row.accountNo)) continue;
        const remark = row.accountCode ? `[${row.accountCode}]` : "";
        await createBankMutation.mutateAsync({
          accountName: row.accountName,
          bankName: row.bankName,
          bankAddress: row.bankAddress === "-" ? undefined : row.bankAddress,
          accountNo: row.accountNo,
          swiftCode: row.swiftCode === "-" ? undefined : row.swiftCode,
          currency: row.currency,
          status: row.status,
          accountType: "basic",
          isDefault: false,
          balance: "0",
          remark,
        });
        created += 1;
      }
      if (created === 0) {
        toast.info("模板账户已全部存在，无需新增");
      } else {
        toast.success(`已同步 ${created} 个模板账户`);
      }
      await refetchBankAccounts();
    } catch (error: any) {
      toast.error("模板账户同步失败", { description: error?.message || "请稍后重试" });
    }
  };

  const handleSave = () => {
    const numericRate = Number(form.rate);
    if (!form.fromCurrency || !form.toCurrency || !form.effectiveDate || !form.rate) {
      toast.error("请填写完整汇率信息");
      return;
    }
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      toast.error("汇率必须是大于0的数字");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          fromCurrency: form.fromCurrency,
          toCurrency: form.toCurrency,
          rate: form.rate,
          effectiveDate: form.effectiveDate,
          source: form.source || "手动",
        },
      });
      return;
    }

    createMutation.mutate({
      fromCurrency: form.fromCurrency,
      toCurrency: form.toCurrency,
      rate: form.rate,
      effectiveDate: form.effectiveDate,
      source: form.source || "手动",
    });
  };

  const handleEdit = (row: any) => {
    setEditingId(Number(row.id));
    setForm({
      fromCurrency: String(row.fromCurrency || "USD").toUpperCase(),
      toCurrency: String(row.toCurrency || "CNY").toUpperCase(),
      rate: String(row.rate ?? ""),
      effectiveDate: new Date(row.effectiveDate).toISOString().slice(0, 10),
      source: String(row.source || "手动"),
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("确认删除这条汇率记录吗？")) return;
    deleteMutation.mutate({ id });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(buildDefaultForm());
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-teal-100">
                <Wallet className="h-4 w-4 text-teal-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">账户管理</h2>
                <p className="text-sm text-muted-foreground">管理银行账户、收款账户和多币种资金账户</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={syncTemplateAccounts} variant="outline" disabled={createBankMutation.isPending}>
                同步账户模板
              </Button>
              <Button
                onClick={() => {
                  setAccountEditingId(null);
                  setBankForm(buildDefaultBankForm());
                  setAccountDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                新增账户
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {accountCards.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-5">
                <p className="text-sm text-muted-foreground">暂无账户</p>
              </CardContent>
            </Card>
          ) : (
            accountCards.map((card) => (
              <Card key={card.id}>
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold leading-tight line-clamp-2" title={card.accountName}>
                      <button
                        type="button"
                        className="text-left hover:text-primary transition-colors"
                        onClick={() => handleViewBank(card.id)}
                      >
                        {card.accountName}
                      </button>
                    </p>
                    <span className="text-xs text-muted-foreground">{card.currency}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">累计收入</p>
                      <p className="font-semibold text-emerald-600 whitespace-nowrap">{formatAccountMoney(card.income, card.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">累计支出</p>
                      <p className="font-semibold text-orange-500 whitespace-nowrap">{formatAccountMoney(card.expense, card.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">结余</p>
                      <p className="font-semibold text-blue-600 whitespace-nowrap">{formatAccountMoney(card.remaining, card.currency)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                value={accountSearchTerm}
                onChange={(e) => setAccountSearchTerm(e.target.value)}
                placeholder="搜索账户编码、账户名称、开户行、银行账号..."
                className="md:flex-1"
              />
              <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="frozen">冻结</SelectItem>
                  <SelectItem value="closed">关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border max-h-[420px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-center font-bold">账户编码</TableHead>
                    <TableHead className="text-center font-bold">账户名称</TableHead>
                    <TableHead className="text-center font-bold">币种</TableHead>
                    <TableHead className="text-center font-bold">状态</TableHead>
                    <TableHead className="text-center font-bold">银行账号</TableHead>
                    <TableHead className="text-center font-bold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankLoading ? (
                    <TableRow>
                      <TableCell className="text-center text-muted-foreground" colSpan={6}>
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-center text-muted-foreground" colSpan={6}>
                        暂无资金账户数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedAccounts.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center">{parseAccountCode(row.remark) || "-"}</TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            className="mx-auto block max-w-[220px] truncate hover:text-primary transition-colors"
                            title={row.accountName || "-"}
                            onClick={() => handleViewBank(Number(row.id))}
                          >
                            {row.accountName || "-"}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">{String(row.currency || "CNY").toUpperCase()}</TableCell>
                        <TableCell className="text-center">
                          {row.status === "active" ? "启用" : row.status === "frozen" ? "冻结" : "关闭"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="mx-auto max-w-[220px] truncate" title={row.accountNo || "-"}>
                            {row.accountNo || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setViewingAccount(row);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditBank(row)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBank(Number(row.id))}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <TablePaginationFooter total={filteredAccounts.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        <Dialog
          open={accountDialogOpen}
          onOpenChange={(open) => {
            setAccountDialogOpen(open);
            if (!open) {
              setAccountEditingId(null);
              setBankForm(buildDefaultBankForm());
            }
          }}
        >
          <DialogContent className="max-w-5xl">
            <div ref={accountFormPrintRef}>
              <DialogHeader>
                <DialogTitle>{accountEditingId ? "编辑账户" : "新增账户"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 py-2">
                <div className="space-y-2 md:col-span-3">
                  <Label>账户编码</Label>
                  <Input
                    placeholder="例如：ZH-001"
                    value={bankForm.accountCode}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, accountCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>账户名称</Label>
                  <Input
                    placeholder="例如：建设银行（人民币）"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, accountName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>币种</Label>
                  <Select
                    value={bankForm.currency}
                    onValueChange={(value) => setBankForm((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>账户状态</Label>
                  <Select
                    value={bankForm.status}
                    onValueChange={(value) =>
                      setBankForm((prev) => ({ ...prev, status: value as "active" | "frozen" | "closed" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="frozen">冻结</SelectItem>
                      <SelectItem value="closed">关闭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>期初金额</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="请输入期初金额"
                    value={bankForm.openingBalance}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, openingBalance: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-6">
                  <Label>开户行</Label>
                  <Input
                    placeholder="请输入开户行"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>行号/SWIFT</Label>
                  <Input
                    placeholder="请输入行号或SWIFT"
                    value={bankForm.swiftCode}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, swiftCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>银行账号</Label>
                  <Input
                    placeholder="请输入银行账号"
                    value={bankForm.accountNo}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, accountNo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-12">
                  <Label>地址</Label>
                  <Input
                    placeholder="请输入开户地址"
                    value={bankForm.bankAddress}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankAddress: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-3" data-print-ignore="true">
              <PrintPreviewButton
                title={accountEditingId ? "编辑账户" : "新增账户"}
                targetRef={accountFormPrintRef}
              />
              <Button variant="outline" onClick={resetBankForm}>
                取消
              </Button>
              <Button onClick={handleSaveBank} disabled={isBankSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {accountEditingId ? "保存账户" : "新增账户"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <div ref={accountViewPrintRef}>
              <DialogHeader>
                <DialogTitle>账户详情</DialogTitle>
              </DialogHeader>
              {viewingAccount ? (
                <div className="space-y-5 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">期初余额</p>
                      <p className="mt-1 font-semibold">{formatAccountMoney(toSafeNumber(viewingAccount.balance), viewingAccount.currency)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">累计收入</p>
                      <p className="mt-1 font-semibold text-emerald-600">{formatAccountMoney(viewingAccountCard?.income || 0, viewingAccount.currency)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">累计支出</p>
                      <p className="mt-1 font-semibold text-orange-500">{formatAccountMoney(viewingAccountCard?.expense || 0, viewingAccount.currency)}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">当前结余</p>
                      <p className="mt-1 font-semibold text-blue-600">{formatAccountMoney(viewingAccountCard?.remaining || 0, viewingAccount.currency)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">账户编码</p>
                    <p className="font-medium">{parseAccountCode(viewingAccount.remark) || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">账户名称</p>
                    <p className="font-medium break-all">{viewingAccount.accountName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">开户行</p>
                    <p className="font-medium break-words">{viewingAccount.bankName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">行号/SWIFT</p>
                    <p className="font-medium break-all">
                      {viewingAccount.swiftCode || parseLineNoFromRemark(viewingAccount.remark) || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">银行账号</p>
                    <p className="font-medium break-all">{viewingAccount.accountNo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">币种</p>
                    <p className="font-medium">{String(viewingAccount.currency || "CNY").toUpperCase()}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground mb-1">地址</p>
                    <p className="font-medium break-words">{viewingAccount.bankAddress || parseAddress(viewingAccount.remark) || "-"}</p>
                  </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 no-print">
                    <Button variant="outline" size="sm" onClick={openBalanceAdjust}>
                      余额调整
                    </Button>
                    <Button variant="outline" size="sm" onClick={openTransfer}>
                      账户调拨
                    </Button>
                    {String(viewingAccount.currency || "").toUpperCase() !== "CNY" && (
                      <Button variant="outline" size="sm" onClick={openSettlement}>
                        结汇
                      </Button>
                    )}
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-center">日期</TableHead>
                          <TableHead className="text-center">类型</TableHead>
                          <TableHead className="text-center">金额</TableHead>
                          <TableHead className="text-center">摘要</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingAccountRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                              暂无流水
                            </TableCell>
                          </TableRow>
                        ) : (
                          viewingAccountRecords.map((row: any) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-center">{formatDateValue(row.date)}</TableCell>
                              <TableCell className="text-center">{row.typeLabel || "-"}</TableCell>
                              <TableCell className="text-center">
                                {formatAccountMoney(toSafeNumber(row.amount), row.currency || viewingAccount.currency)}
                              </TableCell>
                              <TableCell className="max-w-[280px] truncate" title={row.summary || "-"}>
                                {row.summary || "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-3" data-print-ignore="true">
              <PrintPreviewButton title="账户详情" targetRef={accountViewPrintRef} />
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                关闭
              </Button>
              <Button
                onClick={() => {
                  if (viewingAccount) {
                    setViewDialogOpen(false);
                    handleEditBank(viewingAccount);
                  }
                }}
              >
                去编辑
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>余额调整</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>调整方向</Label>
                  <Select
                    value={balanceAdjustForm.direction}
                    onValueChange={(value) =>
                      setBalanceAdjustForm((prev) => ({ ...prev, direction: value as "increase" | "decrease" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">调增</SelectItem>
                      <SelectItem value="decrease">调减</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>调整日期</Label>
                  <Input
                    type="date"
                    value={balanceAdjustForm.adjustDate}
                    onChange={(e) => setBalanceAdjustForm((prev) => ({ ...prev, adjustDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>调整金额</Label>
                <Input
                  type="number"
                  value={balanceAdjustForm.amount}
                  onChange={(e) => setBalanceAdjustForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>调整原因</Label>
                <Textarea
                  value={balanceAdjustForm.remark}
                  onChange={(e) => setBalanceAdjustForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="例如：补录遗漏流水"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleBalanceAdjustSubmit} disabled={createPaymentRecordMutation.isPending}>
                保存调整
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>结汇</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">美元账户当前余额</p>
                  <p className="mt-1 font-semibold text-blue-600">
                    {formatAccountMoney(viewingAccountCard?.remaining || 0, viewingAccount?.currency)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">人民币账户当前余额</p>
                  <p className="mt-1 font-semibold text-emerald-600">
                    {selectedSettlementTargetCard
                      ? formatAccountMoney(selectedSettlementTargetCard.remaining || 0, selectedSettlementTargetCard.currency)
                      : "-"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>美元账户</Label>
                  <Input value={String(viewingAccount?.accountName || "")} disabled />
                </div>
                <div className="space-y-2">
                  <Label>人民币账户</Label>
                  <Select
                    value={settlementForm.targetAccountId}
                    onValueChange={(value) => setSettlementForm((prev) => ({ ...prev, targetAccountId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择人民币账户" />
                    </SelectTrigger>
                    <SelectContent>
                      {cnyAccounts.map((row: any) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>结汇金额</Label>
                  <Input
                    type="number"
                    value={settlementForm.amount}
                    onChange={(e) => setSettlementForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>结汇汇率</Label>
                  <Input
                    type="number"
                    value={settlementForm.rate}
                    onChange={(e) => setSettlementForm((prev) => ({ ...prev, rate: e.target.value }))}
                    placeholder="例如 7.1200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>手续费</Label>
                  <Input
                    type="number"
                    value={settlementForm.fee}
                    onChange={(e) => setSettlementForm((prev) => ({ ...prev, fee: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>结汇日期</Label>
                  <Input
                    type="date"
                    value={settlementForm.settleDate}
                    onChange={(e) => setSettlementForm((prev) => ({ ...prev, settleDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">本次结汇人民币到账</span>
                  <span className="font-semibold text-emerald-600">
                    {formatAccountMoney(
                      Math.max(0, toSafeNumber(settlementForm.amount) * toSafeNumber(settlementForm.rate) - toSafeNumber(settlementForm.fee)),
                      "CNY",
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={settlementForm.remark}
                  onChange={(e) => setSettlementForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="结汇说明"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setSettlementDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSettlementSubmit} disabled={createPaymentRecordMutation.isPending}>
                保存结汇
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>账户调拨</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">转出账户当前余额</p>
                  <p className="mt-1 font-semibold text-blue-600">
                    {formatAccountMoney(viewingAccountCard?.remaining || 0, viewingAccount?.currency)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">转入账户当前余额</p>
                  <p className="mt-1 font-semibold text-emerald-600">
                    {selectedTransferTargetCard
                      ? formatAccountMoney(selectedTransferTargetCard.remaining || 0, selectedTransferTargetCard.currency)
                      : "-"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>转出账户</Label>
                  <Input value={String(viewingAccount?.accountName || "")} disabled />
                </div>
                <div className="space-y-2">
                  <Label>调入账户</Label>
                  <Select
                    value={transferForm.targetAccountId}
                    onValueChange={(value) => setTransferForm((prev) => ({ ...prev, targetAccountId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择调入账户" />
                    </SelectTrigger>
                    <SelectContent>
                      {sameCurrencyAccounts.map((row: any) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>调拨金额</Label>
                  <Input
                    type="number"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>调拨日期</Label>
                  <Input
                    type="date"
                    value={transferForm.transferDate}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, transferDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={transferForm.remark}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="调拨说明"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleTransferSubmit} disabled={createPaymentRecordMutation.isPending}>
                保存调拨
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
          <Card className="h-[260px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">实时汇率（对 CNY）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 h-[calc(260px-56px)] overflow-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">币种</span>
                <Select value={liveCurrency} onValueChange={setLiveCurrency}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.filter((c) => c !== "CNY").map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => refreshLiveMutation.mutate({ fromCurrency: liveCurrency, toCurrency: "CNY" })}
                disabled={refreshLiveMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                实时同步并保存
              </Button>
              <div className="text-sm space-y-1">
                {latestLiveRate ? (
                  <div className="space-y-1">
                    <Badge variant="secondary">最新记录</Badge>
                    <p className="font-medium">
                      1 {String(latestLiveRate.fromCurrency).toUpperCase()} = {formatDisplayNumber(latestLiveRate.rate, { maximumFractionDigits: 6 })}{" "}
                      {String(latestLiveRate.toCurrency).toUpperCase()}
                    </p>
                    <p className="text-muted-foreground">生效日期：{formatDateValue(latestLiveRate.effectiveDate)}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">暂无该币种汇率，请点击“实时同步并保存”</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="h-[260px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{editingId ? "修改汇率" : "新增汇率"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 h-[calc(260px-56px)] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>原币种</Label>
                <Select
                  value={form.fromCurrency}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, fromCurrency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>目标币种</Label>
                <Select
                  value={form.toCurrency}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, toCurrency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>汇率</Label>
                <Input
                  placeholder="例如：6.894100"
                  value={form.rate}
                  onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>生效日期</Label>
                <Input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>来源</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                  placeholder="手动/实时"
                />
              </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? "保存修改" : "新增汇率"}
                </Button>
                {editingId ? (
                  <Button variant="outline" onClick={resetForm}>
                    取消编辑
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="h-[260px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">汇率记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 h-[calc(260px-56px)] overflow-auto">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="快速搜索币种/来源"
              />
              <div className="rounded-md border max-h-[120px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50">
                    <TableRow className="bg-muted/60">
                      <TableHead className="text-center font-bold">原币种</TableHead>
                      <TableHead className="text-center font-bold">目标币种</TableHead>
                      <TableHead className="text-center font-bold">汇率</TableHead>
                      <TableHead className="text-center font-bold">生效日期</TableHead>
                      <TableHead className="text-center font-bold">来源</TableHead>
                      <TableHead className="text-center font-bold">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell className="text-center text-muted-foreground" colSpan={6}>
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : filteredRates.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-center text-muted-foreground" colSpan={6}>
                          暂无汇率数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRates.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-center">{String(row.fromCurrency).toUpperCase()}</TableCell>
                          <TableCell className="text-center">{String(row.toCurrency).toUpperCase()}</TableCell>
                          <TableCell className="text-center font-medium">{formatDisplayNumber(row.rate, { maximumFractionDigits: 6 })}</TableCell>
                          <TableCell className="text-center">{formatDateValue(row.effectiveDate)}</TableCell>
                          <TableCell className="text-center">{row.source || "-"}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(Number(row.id))}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ERPLayout>
  );
}
