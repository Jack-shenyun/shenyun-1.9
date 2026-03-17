import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
  BookOpen,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue, formatNumber, safeLower, toSafeNumber } from "@/lib/formatters";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

interface VoucherEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  summary: string;
}

interface LedgerRecord {
  id: number;
  voucherNo: string;
  date: string;
  type: "receipt" | "payment" | "transfer" | "general";
  summary: string;
  currency: string;
  debitAmount: number;
  creditAmount: number;
  status: "draft" | "pending" | "approved" | "posted";
  preparedBy: string;
  approvedBy: string;
  entries: VoucherEntry[];
}

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" as const },
  pending: { label: "待审核", variant: "secondary" as const },
  approved: { label: "已审核", variant: "default" as const },
  posted: { label: "已过账", variant: "secondary" as const },
};

const typeMap: Record<string, string> = {
  receipt: "收款凭证",
  payment: "付款凭证",
  transfer: "转账凭证",
  general: "记账凭证",
};

function getStatusMeta(status: unknown) {
  return statusMap[String(status ?? "")] ?? statusMap.draft;
}

function getTypeLabel(type: unknown) {
  return typeMap[String(type ?? "")] ?? "记账凭证";
}

function getCurrencySymbol(currency: unknown) {
  switch (String(currency || "").toUpperCase()) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "HKD":
      return "HK$";
    case "JPY":
      return "¥";
    case "CNY":
    default:
      return "¥";
  }
}

function formatLedgerMoney(currency: unknown, amount: unknown) {
  const code = String(currency || "CNY").toUpperCase();
  return `${code} ${getCurrencySymbol(code)}${formatNumber(amount)}`;
}

function normalizeVoucher(raw: any): LedgerRecord {
  const normalizedType =
    (raw?.type as LedgerRecord["type"]) ??
    (String(raw?.recordNo || "").startsWith("REC-") ? "receipt" : "general");
  const normalizedAmount = toSafeNumber(
    raw?.debitAmount ?? raw?.creditAmount ?? raw?.amount
  );
  const normalizedStatus =
    (raw?.status as LedgerRecord["status"]) ??
    (raw?.recordNo || raw?.paymentDate ? "posted" : "draft");
  return {
    id: Number(raw?.id ?? 0),
    voucherNo: String(raw?.voucherNo ?? raw?.recordNo ?? ""),
    date: String(raw?.date ?? raw?.paymentDate ?? ""),
    type: normalizedType,
    summary: String(raw?.summary ?? raw?.remark ?? ""),
    currency: String(raw?.currency || "CNY").toUpperCase(),
    debitAmount: normalizedAmount,
    creditAmount: normalizedAmount,
    status: normalizedStatus,
    preparedBy: String(raw?.preparedBy ?? raw?.operatorName ?? ""),
    approvedBy: String(raw?.approvedBy ?? ""),
    entries: Array.isArray(raw?.entries) ? raw.entries : [],
  };
}

function buildVoucherPrintData(voucher: LedgerRecord) {
  return {
    voucherNo: voucher.voucherNo,
    voucherDate: voucher.date,
    voucherType: getTypeLabel(voucher.type),
    statusLabel: getStatusMeta(voucher.status).label,
    preparedBy: voucher.preparedBy || "-",
    approvedBy: voucher.approvedBy || "-",
    summary: voucher.summary || "-",
    debitAmount: toSafeNumber(voucher.debitAmount),
    creditAmount: toSafeNumber(voucher.creditAmount),
    entries: (voucher.entries ?? []).map((entry) => ({
      accountCode: entry.accountCode || "-",
      accountName: entry.accountName || "-",
      debitText:
        toSafeNumber(entry.debit) > 0 ? `¥${formatNumber(entry.debit)}` : "-",
      creditText:
        toSafeNumber(entry.credit) > 0 ? `¥${formatNumber(entry.credit)}` : "-",
      summary: entry.summary || "-",
    })),
  };
}



export default function LedgerPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.paymentRecords.list.useQuery();
  const deleteMutation = trpc.paymentRecords.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const vouchers = useMemo(
    () => (_dbData as any[]).map((row: any) => normalizeVoucher(row)),
    [_dbData]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<LedgerRecord | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<LedgerRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    voucherNo: "",
    date: "",
    type: "general" as LedgerRecord["type"],
    summary: "",
    preparedBy: "",
    entries: [
      { accountCode: "", accountName: "", debit: 0, credit: 0, summary: "" },
      { accountCode: "", accountName: "", debit: 0, credit: 0, summary: "" },
    ] as VoucherEntry[],
  });

  const normalizedSearchTerm = safeLower(searchTerm);

  const filteredVouchers = vouchers.filter((v: any) => {
    const voucherNo = safeLower(v.voucherNo ?? v.recordNo);
    const summary = safeLower(v.summary ?? v.remark);
    const matchesSearch =
      voucherNo.includes(normalizedSearchTerm) ||
      summary.includes(normalizedSearchTerm);
    const matchesType = typeFilter === "all" || v.type === typeFilter;
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAdd = () => {
    setEditingVoucher(null);
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const nextNo = vouchers.length + 1;
    setFormData({
      voucherNo: `PZ-${dateStr}-${String(nextNo).padStart(3, "0")}`,
      date: today.toISOString().split("T")[0],
      type: "general",
      summary: "",
      preparedBy: "",
      entries: [
        { accountCode: "", accountName: "", debit: 0, credit: 0, summary: "" },
        { accountCode: "", accountName: "", debit: 0, credit: 0, summary: "" },
      ],
    });
    setDialogOpen(true);
  };

  const handleEdit = (voucher: LedgerRecord) => {
    setEditingVoucher(voucher);
    setFormData({
      voucherNo: voucher.voucherNo,
      date: voucher.date,
      type: voucher.type,
      summary: voucher.summary,
      preparedBy: voucher.preparedBy,
      entries: voucher.entries.length > 0 ? voucher.entries : [
        { accountCode: "", accountName: "", debit: 0, credit: 0, summary: "" },
        { accountCode: "", accountName: "", debit: 0, credit: 0, summary: "" },
      ],
    });
    setDialogOpen(true);
  };

  const handleView = (voucher: LedgerRecord) => {
    setViewingVoucher(normalizeVoucher(voucher));
    setViewDialogOpen(true);
  };

  const handleDelete = (voucher: LedgerRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除凭证" });
      return;
    }
    if (voucher.status === "posted") {
      toast.error("无法删除", { description: "已过账凭证不能删除" });
      return;
    }
    deleteMutation.mutate({ id: voucher.id });
    toast.success("凭证已删除");
  };

  const handleApprove = (voucher: LedgerRecord) => {
    toast.success("凭证已审核");
  };

  const handlePost = (voucher: LedgerRecord) => {
    toast.success("凭证已过账");
  };

  const handleSubmit = () => {
    if (!formData.voucherNo || !formData.date || !formData.summary) {
      toast.error("请填写必填项", { description: "凭证号、日期和摘要为必填" });
      return;
    }

    const totalDebit = formData.entries.reduce((sum: any, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = formData.entries.reduce((sum: any, e: any) => sum + (e.credit || 0), 0);

    if (totalDebit !== totalCredit) {
      toast.error("借贷不平衡", { description: "借方合计必须等于贷方合计" });
      return;
    }

    if (editingVoucher) {
      toast.success("凭证已更新");
    } else {
      toast.success("凭证创建成功");
    }
    setDialogOpen(false);
  };

  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, { accountCode: "", accountName: "", debit: 0, credit: 0, summary: "" }],
    });
  };

  const updateEntry = (index: number, field: keyof VoucherEntry, value: string | number) => {
    const newEntries = [...formData.entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setFormData({ ...formData, entries: newEntries });
  };

  const postedCount = vouchers.filter((v: any) => v.status === "posted").length;
  const pendingCount = vouchers.filter((v: any) => v.status === "pending").length;
  const draftCount = vouchers.filter((v: any) => v.status === "draft").length;

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
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">总账管理</h2>
              <p className="text-sm text-muted-foreground">管理会计凭证的录入、审核、过账和查询</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建凭证
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本月凭证</p>
              <p className="text-2xl font-bold">{vouchers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已过账</p>
              <p className="text-2xl font-bold text-green-600">{postedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待审核</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">草稿</p>
              <p className="text-2xl font-bold text-muted-foreground">{draftCount}</p>
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
                  placeholder="搜索凭证号、摘要..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="凭证类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="receipt">收款凭证</SelectItem>
                  <SelectItem value="payment">付款凭证</SelectItem>
                  <SelectItem value="transfer">转账凭证</SelectItem>
                  <SelectItem value="general">记账凭证</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[120px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已审核</SelectItem>
                  <SelectItem value="posted">已过账</SelectItem>
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
                  <TableHead className="w-[150px] text-center font-bold">凭证号</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">日期</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">类型</TableHead>
                  <TableHead className="text-center font-bold">摘要</TableHead>
                  <TableHead className="w-[120px] text-center font-bold">借方金额</TableHead>
                  <TableHead className="w-[120px] text-center font-bold">贷方金额</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher: any) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="text-center font-medium">{voucher.voucherNo}</TableCell>
                    <TableCell className="text-center">{formatDateValue(voucher.date)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{getTypeLabel(voucher.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-center max-w-[200px] truncate">{voucher.summary}</TableCell>
                    <TableCell className="text-center">{formatLedgerMoney(voucher.currency, voucher.debitAmount)}</TableCell>
                    <TableCell className="text-center">{formatLedgerMoney(voucher.currency, voucher.creditAmount)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusMeta(voucher.status).variant} className={getStatusSemanticClass(voucher.status, getStatusMeta(voucher.status).label)}>
                        {getStatusMeta(voucher.status).label}
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
                          <DropdownMenuItem onClick={() => handleView(voucher)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          {voucher.status !== "posted" && (
                            <DropdownMenuItem onClick={() => handleEdit(voucher)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                          )}
                          {voucher.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleApprove(voucher)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              审核通过
                            </DropdownMenuItem>
                          )}
                          {voucher.status === "approved" && (
                            <DropdownMenuItem onClick={() => handlePost(voucher)}>
                              <Send className="h-4 w-4 mr-2" />
                              过账
                            </DropdownMenuItem>
                          )}
                          {canDelete && voucher.status !== "posted" && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(voucher)}
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
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{editingVoucher ? "编辑凭证" : "新建凭证"}</DialogTitle>
              <DialogDescription>
                {editingVoucher ? "修改会计凭证信息" : "创建新的会计凭证"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>凭证号 *</Label>
                  <Input
                    value={formData.voucherNo}
                    onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                    placeholder="凭证号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>日期 *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>凭证类型 *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as LedgerRecord["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">收款凭证</SelectItem>
                      <SelectItem value="payment">付款凭证</SelectItem>
                      <SelectItem value="transfer">转账凭证</SelectItem>
                      <SelectItem value="general">记账凭证</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>制单人</Label>
                  <Input
                    value={formData.preparedBy}
                    onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                    placeholder="制单人"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>摘要 *</Label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="凭证摘要"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>分录明细</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加分录
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-[100px] text-center font-bold">科目代码</TableHead>
                      <TableHead className="text-center font-bold">科目名称</TableHead>
                      <TableHead className="w-[120px] text-center font-bold">借方金额</TableHead>
                      <TableHead className="w-[120px] text-center font-bold">贷方金额</TableHead>
                      <TableHead className="text-center font-bold">摘要</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.entries.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">
                          <Input
                            value={entry.accountCode}
                            onChange={(e) => updateEntry(index, "accountCode", e.target.value)}
                            placeholder="代码"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            value={entry.accountName}
                            onChange={(e) => updateEntry(index, "accountName", e.target.value)}
                            placeholder="科目名称"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={entry.debit || ""}
                            onChange={(e) => updateEntry(index, "debit", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={entry.credit || ""}
                            onChange={(e) => updateEntry(index, "credit", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            value={entry.summary}
                            onChange={(e) => updateEntry(index, "summary", e.target.value)}
                            placeholder="摘要"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={2} className="text-right font-medium">合计</TableCell>
                      <TableCell className="text-center font-medium">
                        ¥{formatNumber(formData.entries.reduce((sum: any, e: any) => sum + toSafeNumber(e.debit), 0))}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        ¥{formatNumber(formData.entries.reduce((sum: any, e: any) => sum + toSafeNumber(e.credit), 0))}
                      </TableCell>
                      <TableCell className="text-center"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingVoucher ? "保存修改" : "创建凭证"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
{viewingVoucher && (
  <DraggableDialog
    open={viewDialogOpen}
    onOpenChange={setViewDialogOpen}
    printable={false}
  >
    <DraggableDialogContent>
              <div className="space-y-6 p-6">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">凭证详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingVoucher.voucherNo}
            {viewingVoucher.status && (
              <>
                {' \u00b7 '}
                <Badge
                  variant={statusMap[viewingVoucher.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(
                    viewingVoucher.status,
                    statusMap[viewingVoucher.status]?.label
                  )}`}
                >
                  {statusMap[viewingVoucher.status]?.label || String(viewingVoucher.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="凭证日期">{formatDateValue(viewingVoucher.date)}</FieldRow>
                <FieldRow label="凭证类型">{getTypeLabel(viewingVoucher.type)}</FieldRow>
                <FieldRow label="制单人">{viewingVoucher.preparedBy || '-'}</FieldRow>
              </div>
              <div>
                <FieldRow label="借方合计">¥{formatNumber(viewingVoucher.debitAmount)}</FieldRow>
                <FieldRow label="贷方合计">¥{formatNumber(viewingVoucher.creditAmount)}</FieldRow>
                <FieldRow label="审核人">{viewingVoucher.approvedBy || '-'}</FieldRow>
              </div>
            </div>
          </div>

          {/* 摘要 */}
          {viewingVoucher.summary && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">摘要</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingVoucher.summary}</p>
            </div>
          )}

          {/* 分录明细 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">分录明细</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">科目代码</TableHead>
                  <TableHead className="text-center font-bold">科目名称</TableHead>
                  <TableHead className="text-center font-bold">借方</TableHead>
                  <TableHead className="text-center font-bold">贷方</TableHead>
                  <TableHead className="text-center font-bold">摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewingVoucher.entries ?? []).length > 0 ? (
                  (viewingVoucher.entries ?? []).map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">{entry.accountCode}</TableCell>
                      <TableCell className="text-center">{entry.accountName}</TableCell>
                      <TableCell className="text-center">
                        {toSafeNumber(entry.debit) > 0 ? `¥${formatNumber(entry.debit)}` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {toSafeNumber(entry.credit) > 0 ? `¥${formatNumber(entry.credit)}` : "-"}
                      </TableCell>
                      <TableCell className="text-center">{entry.summary}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      暂无分录明细
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap">{/* 左侧功能按钮 */ }</div>
          <div className="flex gap-2 flex-wrap justify-end">
            <TemplatePrintPreviewButton
              templateKey="finance_voucher"
              data={buildVoucherPrintData(viewingVoucher)}
              title={`凭证详情 - ${viewingVoucher.voucherNo}`}
            >
              打印预览
            </TemplatePrintPreviewButton>
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            {viewingVoucher.status !== "posted" && (
              <Button variant="outline" size="sm" onClick={() => {
                setViewDialogOpen(false);
                handleEdit(viewingVoucher);
              }}>
                编辑
              </Button>
            )}
          </div>
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
