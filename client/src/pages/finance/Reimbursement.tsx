import { useEffect, useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { trpc } from "@/lib/trpc";
import { formatCurrencyValue } from "@/lib/formatters";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Receipt, Search, Send, Wallet } from "lucide-react";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

type ExpenseStatus = "draft" | "pending_approval" | "approved" | "rejected" | "paid" | "cancelled";

type ExpenseLine = {
  id: string;
  expenseDate: string;
  expenseType: string;
  invoiceType: string;
  taxRate: string;
  amount: string;
  remark: string;
  attachmentName: string;
};

type ParsedRemark = {
  note: string;
  lines: ExpenseLine[];
  financeRemark: string;
};

const PAGE_SIZE = 10;
const REMARK_PREFIX = "__EXPENSE_DETAIL__:";

const statusMap: Record<ExpenseStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "bg-gray-100 text-gray-600 border-gray-300" },
  pending_approval: { label: "待审批", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  approved: { label: "已审批待付款", className: "bg-blue-100 text-blue-700 border-blue-300" },
  rejected: { label: "已驳回", className: "bg-red-100 text-red-700 border-red-300" },
  paid: { label: "已支付", className: "bg-green-100 text-green-700 border-green-300" },
  cancelled: { label: "已取消", className: "bg-gray-100 text-gray-500 border-gray-300" },
};

function parseRemark(raw: unknown): ParsedRemark {
  const text = String(raw || "");
  if (!text.startsWith(REMARK_PREFIX)) {
    return { note: text, lines: [], financeRemark: "" };
  }

  try {
    const parsed = JSON.parse(text.slice(REMARK_PREFIX.length));
    const lines = Array.isArray(parsed?.lines)
      ? parsed.lines.map((line: any, index: number) => ({
          id: String(line.id || `${Date.now()}-${index + 1}`),
          expenseDate: String(line.expenseDate || line.invoiceDate || ""),
          expenseType: String(line.expenseType || ""),
          invoiceType: String(line.invoiceType || ""),
          taxRate: String(line.taxRate || ""),
          amount: String(line.amount || line.totalAmount || ""),
          remark: String(line.remark || ""),
          attachmentName: String(line.attachmentName || ""),
        }))
      : [];

    return {
      note: String(parsed?.note || ""),
      lines,
      financeRemark: String(parsed?.financeRemark || ""),
    };
  } catch {
    return { note: text, lines: [], financeRemark: "" };
  }
}

function buildRemark(note: string, lines: ExpenseLine[], financeRemark: string) {
  return `${REMARK_PREFIX}${JSON.stringify({ note, lines, financeRemark })}`;
}

function getTitle(description: unknown) {
  return String(description || "").split("\n")[0] || "-";
}

function normalizeDepartment(raw: unknown) {
  return String(raw || "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)[0] || "-";
}

function formatMoney(value: unknown, currency = "CNY") {
  const amount = Number(value || 0);
  const symbol = String(currency || "CNY").toUpperCase() === "USD" ? "$" : "¥";
  return formatCurrencyValue(amount, symbol);
}

function formatDateOnly(value: unknown) {
  const text = String(value || "");
  if (!text) return "-";
  return text.includes("T") ? text.slice(0, 10) : text.slice(0, 10);
}

function formatBankAccountDisplay(account: any) {
  return [
    String(account?.accountName || "").trim(),
    String(account?.bankName || "").trim(),
    String(account?.accountNo || "").trim(),
  ].filter(Boolean).join(" / ");
}

export default function ReimbursementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [financeRemarkDraft, setFinanceRemarkDraft] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("银行转账");
  const [bankAccountId, setBankAccountId] = useState("");

  const { data = [], isLoading, refetch } = trpc.expenses.list.useQuery({ limit: 500 });
  const { data: paymentRecords = [], refetch: refetchPayments } = trpc.paymentRecords.list.useQuery({ relatedType: "expense", limit: 1000 });
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery({ status: "active" });
  const approveMutation = trpc.expenses.approve.useMutation();
  const rejectMutation = trpc.expenses.reject.useMutation();
  const payMutation = trpc.expenses.pay.useMutation();

  const records = useMemo(() => {
    return (data as any[]).map((row: any) => {
      const parsed = parseRemark(row?.remark);
      const relatedPayment = (paymentRecords as any[]).find((record: any) => Number(record?.relatedId) === Number(row?.id) && String(record?.relatedType) === "expense");
      return {
        ...row,
        applicantName: String(row?.applicantName || `用户#${row?.applicantId || "-"}`),
        department: normalizeDepartment(row?.department || row?.applicantDepartment),
        title: getTitle(row?.description),
        note: parsed.note,
        items: parsed.lines,
        financeRemark: parsed.financeRemark,
        bankAccountName: String(row?.bankAccountName || ""),
        paidRecord: relatedPayment || null,
      };
    });
  }, [data, paymentRecords]);

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .map((record) => String(record.department || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [records],
  );

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        String(record.reimbursementNo || "").toLowerCase().includes(keyword) ||
        String(record.applicantName || "").toLowerCase().includes(keyword) ||
        String(record.title || "").toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || String(record.status) === statusFilter;
      const matchesDepartment = departmentFilter === "all" || String(record.department) === departmentFilter;
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [departmentFilter, records, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, departmentFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedRecord) return;
    setFinanceRemarkDraft(String(selectedRecord.financeRemark || ""));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    const preferredAccountId = Number(selectedRecord.bankAccountId || (bankAccounts as any[])[0]?.id || 0);
    setBankAccountId(preferredAccountId > 0 ? String(preferredAccountId) : "");
    setPaymentMethod("银行转账");
  }, [bankAccounts, selectedRecord]);

  const stats = {
    pendingApproval: records.filter((record) => record.status === "pending_approval").length,
    approved: records.filter((record) => record.status === "approved").length,
    paid: records.filter((record) => record.status === "paid").length,
    pendingAmount: records
      .filter((record) => record.status === "pending_approval")
      .reduce((sum, record) => sum + Number(record.totalAmount || 0), 0),
  };
  const reimbursementPrintData = useMemo(
    () =>
      selectedRecord
        ? {
            reimbursementNo: selectedRecord.reimbursementNo || "",
            applicantName: selectedRecord.applicantName || "",
            department: selectedRecord.department || "",
            applyDate: selectedRecord.applyDate || "",
            title: selectedRecord.title || "",
            totalAmount: Number(selectedRecord.totalAmount || 0),
            lines: (selectedRecord.items || []).map((item: ExpenseLine) => ({
              expenseDate: item.expenseDate || "",
              expenseType: item.expenseType || "",
              invoiceType: item.invoiceType || "",
              amount: Number(item.amount || 0),
              remark: item.remark || "",
            })),
          }
        : null,
    [selectedRecord],
  );

  const openDetail = (record: any) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  const buildNextRemark = (record: any) => {
    return buildRemark(String(record.note || ""), record.items || [], financeRemarkDraft);
  };

  const refreshAll = async () => {
    await Promise.all([refetch(), refetchPayments()]);
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;
    await approveMutation.mutateAsync({
      id: Number(selectedRecord.id),
      remark: buildNextRemark(selectedRecord),
    });
    await refreshAll();
    toast.success("已审批通过");
    setDetailOpen(false);
  };

  const handleReject = async () => {
    if (!selectedRecord) return;
    await rejectMutation.mutateAsync({
      id: Number(selectedRecord.id),
      remark: buildNextRemark(selectedRecord),
    });
    await refreshAll();
    toast.success("已驳回");
    setDetailOpen(false);
  };

  const handlePay = async () => {
    if (!selectedRecord) return;
    if (!bankAccountId) {
      toast.error("请选择付款账户");
      return;
    }
    await payMutation.mutateAsync({
      id: Number(selectedRecord.id),
      bankAccountId: Number(bankAccountId),
      paymentDate,
      paymentMethod,
      remark: buildNextRemark(selectedRecord),
    });
    await refreshAll();
    toast.success("已登记付款");
    setDetailOpen(false);
  };

  return (
    <ERPLayout>
      <div className="w-full px-3 py-4 md:px-4 md:py-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">报销管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">财务统一查看报销申请、审批并登记付款，不再重复建单。</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-yellow-600">{stats.pendingApproval}</div><div className="text-xs text-muted-foreground mt-0.5">待审批</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-yellow-600">{formatMoney(stats.pendingAmount)}</div><div className="text-xs text-muted-foreground mt-0.5">待审批金额</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-blue-600">{stats.approved}</div><div className="text-xs text-muted-foreground mt-0.5">已审批待付款</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-green-600">{stats.paid}</div><div className="text-xs text-muted-foreground mt-0.5">已支付</div></CardContent></Card>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="搜索单号、报销人、标题..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="全部部门" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {departmentOptions.map((department) => (
                <SelectItem key={department} value={department}>{department}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(statusMap).map(([key, meta]) => (
                <SelectItem key={key} value={key}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>报销单号</TableHead>
                  <TableHead>报销人</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>申请日期</TableHead>
                  <TableHead>报销标题</TableHead>
                  <TableHead>发票数</TableHead>
                  <TableHead className="text-right">报销金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">暂无报销数据</TableCell></TableRow>
                ) : paged.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm">{record.reimbursementNo}</TableCell>
                    <TableCell className="font-medium text-sm">{record.applicantName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{record.department}</TableCell>
                    <TableCell className="text-sm">{formatDateOnly(record.applyDate)}</TableCell>
                    <TableCell className="text-sm max-w-[240px] truncate">{record.title}</TableCell>
                    <TableCell className="text-center text-sm">{record.items.length}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(record.totalAmount, record.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusMap[String(record.status) as ExpenseStatus]?.className || ""}`}>
                        {statusMap[String(record.status) as ExpenseStatus]?.label || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openDetail(record)}>
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TablePaginationFooter total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>报销详情</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-5">
                {(() => {
                  const canReview = selectedRecord.status === "pending_approval";
                  const canPay = selectedRecord.status === "approved";
                  return (
                    <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">报销人</div><div className="mt-1 font-semibold">{selectedRecord.applicantName}</div></CardContent></Card>
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">部门</div><div className="mt-1 font-semibold">{selectedRecord.department}</div></CardContent></Card>
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">申请日期</div><div className="mt-1 font-semibold">{formatDateOnly(selectedRecord.applyDate)}</div></CardContent></Card>
                  <Card><CardContent className="pt-4 pb-3"><div className="text-sm text-muted-foreground">总金额</div><div className="mt-1 font-semibold">{formatMoney(selectedRecord.totalAmount, selectedRecord.currency)}</div></CardContent></Card>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold">{selectedRecord.title}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRecord.note || "无说明"}</div>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>费用类型</TableHead>
                        <TableHead>发票类型</TableHead>
                        <TableHead>税率</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead>附件</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRecord.items.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">无费用明细</TableCell></TableRow>
                      ) : selectedRecord.items.map((item: ExpenseLine) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.expenseDate || "-"}</TableCell>
                          <TableCell>{item.expenseType || "-"}</TableCell>
                          <TableCell>{item.invoiceType || "-"}</TableCell>
                          <TableCell>{item.taxRate ? `${item.taxRate}%` : "-"}</TableCell>
                          <TableCell className="text-right">{formatMoney(item.amount || 0, selectedRecord.currency)}</TableCell>
                          <TableCell>{item.remark || "-"}</TableCell>
                          <TableCell>{item.attachmentName || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Tabs defaultValue="review">
                  <TabsList>
                    <TabsTrigger value="review">审批备注</TabsTrigger>
                    <TabsTrigger value="payment">付款信息</TabsTrigger>
                  </TabsList>
                  <TabsContent value="review" className="space-y-3">
                    <div className="space-y-2">
                      <Label>财务备注</Label>
                      <Textarea
                        rows={4}
                        value={financeRemarkDraft}
                        disabled={!canReview && !canPay}
                        onChange={(event) => setFinanceRemarkDraft(event.target.value)}
                        placeholder="审批意见、驳回原因或付款说明"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="payment" className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>付款日期</Label>
                        <Input type="date" value={paymentDate} disabled={!canPay} onChange={(event) => setPaymentDate(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>付款方式</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={!canPay}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["银行转账", "现金", "支付宝", "微信支付", "其他"].map((method) => (
                              <SelectItem key={method} value={method}>{method}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>付款账户</Label>
                        <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={!canPay}>
                          <SelectTrigger><SelectValue placeholder="选择付款账户" /></SelectTrigger>
                          <SelectContent>
                            {(bankAccounts as any[]).map((account: any) => (
                              <SelectItem key={account.id} value={String(account.id)}>
                                {formatBankAccountDisplay(account)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedRecord.paidRecord
                        ? `已生成付款流水：${selectedRecord.paidRecord.recordNo || "-"}`
                        : "支付后会自动生成付款流水，费用管理和总账可直接查看。"}
                    </div>
                  </TabsContent>
                </Tabs>
                    </>
                  );
                })()}
              </div>
            )}
            <DialogFooter className="gap-2">
              {reimbursementPrintData ? (
                <TemplatePrintPreviewButton
                  templateKey="expense_claim"
                  data={reimbursementPrintData}
                  title={`费用报销单打印预览 - ${selectedRecord.reimbursementNo}`}
                />
              ) : null}
              <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
              {selectedRecord?.status === "pending_approval" && (
                <>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:text-red-600" onClick={handleReject} disabled={rejectMutation.isPending}>
                    <Send className="h-4 w-4 mr-1" />
                    驳回
                  </Button>
                  <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                    <Send className="h-4 w-4 mr-1" />
                    审批通过
                  </Button>
                </>
              )}
              {selectedRecord?.status === "approved" && (
                <Button onClick={handlePay} disabled={payMutation.isPending}>
                  <Wallet className="h-4 w-4 mr-1" />
                  登记付款
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  );
}
