import { useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDateValue, safeLower, toSafeNumber } from "@/lib/formatters";
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
  address: string;
};

const CURRENCY_OPTIONS = ["USD", "CNY", "EUR", "HKD", "JPY", "GBP"];
const BANK_CURRENCIES = ["CNY", "USD", "EUR", "HKD", "JPY", "GBP"];

const ACCOUNT_TEMPLATE_ROWS = [
  {
    accountCode: "ZH-007",
    accountName: "微信",
    status: "active" as const,
    currency: "CNY",
    bankName: "15150457575",
    swiftCode: "-",
    accountNo: "15150457575",
    address: "-",
  },
  {
    accountCode: "ZH-006",
    accountName: "支付宝",
    status: "active" as const,
    currency: "CNY",
    bankName: "浙江网商银行",
    swiftCode: "-",
    accountNo: "13812600639",
    address: "浙江杭州",
  },
  {
    accountCode: "ZH-005",
    accountName: "国际站",
    status: "active" as const,
    currency: "USD",
    bankName: "CITIBANK N.A. SINGAPORE BRANCH",
    swiftCode: "CITISGSG or CITISGSGXXX",
    accountNo: "10695166385",
    address: "51 Bras Basah Road 01-21 Singapore, 189554",
  },
  {
    accountCode: "ZH-004",
    accountName: "农业银行",
    status: "active" as const,
    currency: "CNY",
    bankName: "中国农业银行股份有限公司苏州临湖支行",
    swiftCode: "103305054082",
    accountNo: "10540801040026476",
    address: "苏州市吴中区临湖镇银藏路666号11幢",
  },
  {
    accountCode: "ZH-003",
    accountName: "XT银行",
    status: "active" as const,
    currency: "USD",
    bankName: "JPMorgan Chase Bank N.A., Hong Kong Branch",
    swiftCode: "CHASHKHH",
    accountNo: "63003695928",
    address: "18/F, 20/F, 22-29/F, CHATER HOUSE, 8 CONNAUGHT ROAD CENTRAL, HONG KONG",
  },
  {
    accountCode: "ZH-002",
    accountName: "建设银行（美元）",
    status: "active" as const,
    currency: "USD",
    bankName: "China Construction Bank Corporation Suzhou Branch Wuzhong Subbranch",
    swiftCode: "Pcbccnbjjss",
    accountNo: "32250199753600004047",
    address: "Building 11, No. 666 Yinzang Road, Linhu Town, Wuzhong District, Suzhou, P.R. China",
  },
  {
    accountCode: "ZH-001",
    accountName: "建设银行（人民币）",
    status: "active" as const,
    currency: "CNY",
    bankName: "中国建设银行股份有限公司苏州滨湖支行",
    swiftCode: "105305007305",
    accountNo: "32250110073000001909",
    address: "苏州市吴中区临湖镇银藏路666号11幢",
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
    address: "",
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
  return `${getCurrencySymbol(currency)}${toSafeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function FinanceAccountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [accountSearchTerm, setAccountSearchTerm] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [accountEditingId, setAccountEditingId] = useState<number | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [liveCurrency, setLiveCurrency] = useState("USD");
  const [form, setForm] = useState<ExchangeRateForm>(buildDefaultForm());
  const [bankForm, setBankForm] = useState<BankAccountForm>(buildDefaultBankForm());

  const { data: rates = [], refetch, isLoading } = trpc.exchangeRates.list.useQuery({ limit: 300 });
  const { data: bankAccounts = [], refetch: refetchBankAccounts, isLoading: bankLoading } = trpc.bankAccounts.list.useQuery({});
  const { data: paymentRecords = [] } = trpc.paymentRecords.list.useQuery({ limit: 2000 });

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
      toast.success(`实时汇率已同步：1 ${res.fromCurrency} = ${toSafeNumber(res.rate).toFixed(6)} ${res.toCurrency}`);
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
        safeLower(parseAddress(row.remark)).includes(keyword)
      );
    });
  }, [accountSearchTerm, accountStatusFilter, bankAccounts]);

  const accountCards = useMemo(() => {
    const records = paymentRecords as any[];
    return (bankAccounts as any[]).map((account) => {
      const accountId = Number(account.id);
      const accountRecords = records.filter((row) => Number(row.bankAccountId) === accountId);
      const income = accountRecords
        .filter((row) => row.type === "receipt")
        .reduce((sum, row) => sum + toSafeNumber(row.amount), 0);
      const expense = accountRecords
        .filter((row) => row.type === "payment")
        .reduce((sum, row) => sum + toSafeNumber(row.amount), 0);
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
  }, [bankAccounts, paymentRecords]);

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

    const remarkParts = [
      bankForm.accountCode ? `[${bankForm.accountCode}]` : "",
      bankForm.address ? `地址:${bankForm.address}` : "",
    ].filter(Boolean);
    const remark = remarkParts.join(" ");

    if (accountEditingId) {
      updateBankMutation.mutate({
        id: accountEditingId,
        data: {
          accountName: bankForm.accountName,
          bankName: bankForm.bankName,
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
      address: parseAddress(row.remark),
    });
    setAccountDialogOpen(true);
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

  const syncTemplateAccounts = async () => {
    try {
      const existingNos = new Set((bankAccounts as any[]).map((row) => String(row.accountNo || "")));
      let created = 0;
      for (const row of ACCOUNT_TEMPLATE_ROWS) {
        if (existingNos.has(row.accountNo)) continue;
        const remark = `[${row.accountCode}] 地址:${row.address}`;
        await createBankMutation.mutateAsync({
          accountName: row.accountName,
          bankName: row.bankName,
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
                      {card.accountName}
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
                    filteredAccounts.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center">{parseAccountCode(row.remark) || "-"}</TableCell>
                        <TableCell className="text-center">
                          <div className="mx-auto max-w-[220px] truncate" title={row.accountName || "-"}>
                            {row.accountName || "-"}
                          </div>
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
                  value={bankForm.address}
                  onChange={(e) => setBankForm((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-3">
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
            <DialogHeader>
              <DialogTitle>账户详情</DialogTitle>
            </DialogHeader>
            {viewingAccount ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm py-2">
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
                  <p className="font-medium break-words">{parseAddress(viewingAccount.remark) || "-"}</p>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2 border-t pt-3">
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
                      1 {String(latestLiveRate.fromCurrency).toUpperCase()} = {toSafeNumber(latestLiveRate.rate).toFixed(6)}{" "}
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
                          <TableCell className="text-center font-medium">{toSafeNumber(row.rate).toFixed(6)}</TableCell>
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
