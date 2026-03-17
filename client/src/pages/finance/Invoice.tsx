import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatCurrencyValue, formatDateValue, formatDisplayNumber } from "@/lib/formatters";
import ERPLayout from "@/components/ERPLayout";
import PrintPreviewButton from "@/components/PrintPreviewButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText, Plus, MoreHorizontal, Eye, Edit, Trash2,
  Download, Search, Receipt, Send, Upload, Loader2, CheckCircle2, XCircle,
} from "lucide-react";

// ==================== 类型定义 ====================

type InvoiceType = "vat_special" | "vat_normal" | "electronic" | "receipt";
type InvoiceStatus = "pending" | "received" | "verified" | "booked" | "cancelled";
type IssuedStatus = "draft" | "pending_approval" | "issued" | "cancelled" | "red_issued";

interface ReceivedInvoice {
  id: number;
  invoiceNo: string;
  invoiceCode: string;
  invoiceType: InvoiceType;
  supplierId?: number;
  supplierName: string;
  payableIds?: number[];
  invoiceDate: string;
  receiveDate: string;
  amountExTax: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  relatedOrderNo: string;
  verifyCode: string;
  remark: string;
}

interface IssuedInvoice {
  id: number;
  invoiceNo: string;
  invoiceType: InvoiceType;
  customerId?: number;
  customerName: string;
  receivableIds?: number[];
  reconcileMonth?: string;
  invoiceDate: string;
  amountExTax: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  bankAccountId?: number;
  status: IssuedStatus;
  relatedOrderNo: string;
  bankAccount: string;
  remark: string;
}

// ==================== 常量 ====================

const invoiceTypeMap: Record<InvoiceType, string> = {
  vat_special: "增值税专用发票",
  vat_normal: "增值税普通发票",
  electronic: "电子发票",
  receipt: "收据",
};

const receivedStatusMap: Record<InvoiceStatus, { label: string; color: string }> = {
  pending:   { label: "待验证", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  received:  { label: "已收票", color: "bg-blue-100 text-blue-700 border-blue-300" },
  verified:  { label: "已验证", color: "bg-green-100 text-green-700 border-green-300" },
  booked:    { label: "已入账", color: "bg-purple-100 text-purple-700 border-purple-300" },
  cancelled: { label: "已作废", color: "bg-gray-100 text-gray-500 border-gray-300" },
};

const issuedStatusMap: Record<IssuedStatus, { label: string; color: string }> = {
  draft:            { label: "草稿", color: "bg-gray-100 text-gray-500 border-gray-300" },
  pending_approval: { label: "待审批", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  issued:           { label: "已开票", color: "bg-green-100 text-green-700 border-green-300" },
  cancelled:        { label: "已作废", color: "bg-red-100 text-red-600 border-red-300" },
  red_issued:       { label: "已红冲", color: "bg-orange-100 text-orange-700 border-orange-300" },
};

const TAX_RATES = ["0%", "1%", "3%", "6%", "9%", "13%"];

function formatBankAccountDisplay(account: any) {
  return [
    String(account?.accountName || "").trim(),
    String(account?.bankName || "").trim(),
    String(account?.accountNo || "").trim(),
  ].filter(Boolean).join(" / ");
}

function normalizeDateOnly(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.includes("T") ? text.slice(0, 10) : text.slice(0, 10);
}

function mapReceivedInvoiceRecord(record: any): ReceivedInvoice {
  return {
    id: Number(record?.id || 0),
    invoiceNo: String(record?.invoiceNo || ""),
    invoiceCode: String(record?.invoiceCode || ""),
    invoiceType: (record?.invoiceType || "vat_special") as InvoiceType,
    supplierId: Number(record?.supplierId || 0) || undefined,
    supplierName: String(record?.supplierName || ""),
    payableIds: Array.isArray(record?.payableIds) ? record.payableIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0) : [],
    invoiceDate: normalizeDateOnly(record?.invoiceDate),
    receiveDate: normalizeDateOnly(record?.receiveDate),
    amountExTax: Number(record?.amountExTax || 0),
    taxRate: Number(record?.taxRate || 0),
    taxAmount: Number(record?.taxAmount || 0),
    totalAmount: Number(record?.totalAmount || 0),
    status: (record?.status || "received") as InvoiceStatus,
    relatedOrderNo: String(record?.relatedOrderNo || ""),
    verifyCode: String(record?.verifyCode || ""),
    remark: String(record?.remark || ""),
  };
}

function mapIssuedInvoiceRecord(record: any): IssuedInvoice {
  return {
    id: Number(record?.id || 0),
    invoiceNo: String(record?.invoiceNo || ""),
    invoiceType: (record?.invoiceType || "vat_special") as InvoiceType,
    customerId: Number(record?.customerId || 0) || undefined,
    customerName: String(record?.customerName || ""),
    receivableIds: Array.isArray(record?.receivableIds) ? record.receivableIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0) : [],
    reconcileMonth: String(record?.reconcileMonth || ""),
    invoiceDate: normalizeDateOnly(record?.invoiceDate),
    amountExTax: Number(record?.amountExTax || 0),
    taxRate: Number(record?.taxRate || 0),
    taxAmount: Number(record?.taxAmount || 0),
    totalAmount: Number(record?.totalAmount || 0),
    bankAccountId: Number(record?.bankAccountId || 0) || undefined,
    status: (record?.status || "draft") as IssuedStatus,
    relatedOrderNo: String(record?.relatedOrderNo || ""),
    bankAccount: String(record?.bankAccount || ""),
    remark: String(record?.remark || ""),
  };
}

// ==================== 收票子组件 ====================

function ReceivedInvoiceTab() {
  const PAGE_SIZE = 10;
  const trpcUtils = trpc.useUtils();
  const formPrintRef = useRef<HTMLDivElement>(null);
  const viewPrintRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<ReceivedInvoice | null>(null);
  const [viewing, setViewing] = useState<ReceivedInvoice | null>(null);
  const [form, setForm] = useState<Partial<ReceivedInvoice>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProvider, setOcrProvider] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognizeMutation = trpc.invoiceOcr.recognize.useMutation();
  const { data: invoiceRows = [], isLoading } = trpc.receivedInvoices.list.useQuery(undefined);
  const createMutation = trpc.receivedInvoices.create.useMutation();
  const updateMutation = trpc.receivedInvoices.update.useMutation();
  const deleteMutation = trpc.receivedInvoices.delete.useMutation();

  const records = useMemo(
    () => (invoiceRows as any[]).map(mapReceivedInvoiceRecord),
    [invoiceRows],
  );

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrProvider("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const results = await recognizeMutation.mutateAsync({ images: [{ name: file.name, base64 }] });
      const result = results[0];
      if (result?.success && result.data) {
        const d = result.data;
        setOcrProvider(result.provider || "");
        setForm(f => ({
          ...f,
          invoiceNo: d.invoiceNo || f.invoiceNo,
          invoiceCode: d.invoiceCode || f.invoiceCode,
          invoiceDate: d.invoiceDate || f.invoiceDate,
          supplierName: d.sellerName || d.supplierName || f.supplierName,
          amountExTax: d.amountExTax ?? f.amountExTax,
          taxRate: d.taxRate ?? f.taxRate,
          taxAmount: d.taxAmount ?? f.taxAmount,
          totalAmount: d.totalAmount ?? f.totalAmount,
          invoiceType: (d.invoiceType as InvoiceType) || f.invoiceType,
        }));
        toast.success(`AI识别完成（${result.provider}），已填充可识别字段`);
      } else {
        toast.error(result?.error || "识别失败，请手动填写");
      }
    } catch (err: any) {
      toast.error("识别请求失败：" + err.message);
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = records.filter(r => {
    const matchSearch = !search || r.invoiceNo.includes(search) || r.supplierName.includes(search) || r.relatedOrderNo.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0);
  const totalTax = filtered.reduce((s, r) => s + r.taxAmount, 0);

  const openAdd = () => { setEditing(null); setForm({ invoiceType: "vat_special", taxRate: 13, status: "received" }); setFormOpen(true); };
  const openEdit = (r: ReceivedInvoice) => { setEditing(r); setForm({ ...r }); setFormOpen(true); };
  const openView = (r: ReceivedInvoice) => { setViewing(r); setViewOpen(true); };

  const handleSave = async () => {
    if (!form.invoiceNo || !form.supplierName) { toast.error("请填写发票号码和供应商名称"); return; }
    const payload = {
      invoiceNo: form.invoiceNo || "",
      invoiceCode: form.invoiceCode || "",
      invoiceType: (form.invoiceType as InvoiceType) || "vat_special",
      supplierId: form.supplierId,
      supplierName: form.supplierName || "",
      payableIds: form.payableIds || [],
      relatedOrderNo: form.relatedOrderNo || "",
      invoiceDate: form.invoiceDate || undefined,
      receiveDate: form.receiveDate || undefined,
      amountExTax: String(Number(form.amountExTax) || 0),
      taxRate: String(Number(form.taxRate) || 13),
      taxAmount: String(Number(form.taxAmount) || 0),
      totalAmount: String(Number(form.totalAmount) || 0),
      verifyCode: form.verifyCode || "",
      status: (form.status as InvoiceStatus) || "received",
      remark: form.remark || "",
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
      toast.success("已更新");
    } else {
      await createMutation.mutateAsync(payload);
      toast.success("已登记收票");
    }
    await trpcUtils.receivedInvoices.list.invalidate();
    setFormOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    await trpcUtils.receivedInvoices.list.invalidate();
    toast.success("已删除");
  };
  const handleVerify = async (id: number) => {
    await updateMutation.mutateAsync({ id, data: { status: "verified" } });
    await trpcUtils.receivedInvoices.list.invalidate();
    toast.success("已验证");
  };
  const handleBook = async (id: number) => {
    await updateMutation.mutateAsync({ id, data: { status: "booked" } });
    await trpcUtils.receivedInvoices.list.invalidate();
    toast.success("已入账");
  };

  const calcTax = (exTax: number, rate: number) => {
    const tax = exTax * rate / 100;
    setForm(f => ({ ...f, taxAmount: Math.round(tax * 100) / 100, totalAmount: Math.round((exTax + tax) * 100) / 100 }));
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "发票总数", value: records.length, color: "text-blue-600" },
          { label: "待验证", value: records.filter(r => r.status === "pending").length, color: "text-yellow-600" },
          { label: "已入账", value: records.filter(r => r.status === "booked").length, color: "text-purple-600" },
          { label: "含税总额", value: formatCurrencyValue(records.reduce((s, r) => s + r.totalAmount, 0)), color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="搜索发票号、供应商..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(receivedStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />登记收票</Button>
      </div>

      {/* 表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>发票号码</TableHead>
                <TableHead>发票类型</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>开票日期</TableHead>
                <TableHead className="text-right">不含税金额</TableHead>
                <TableHead className="text-right">税额</TableHead>
                <TableHead className="text-right">含税金额</TableHead>
                <TableHead>关联订单</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
              ) : pagedRecords.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.invoiceNo}</TableCell>
                  <TableCell className="text-sm">{invoiceTypeMap[r.invoiceType]}</TableCell>
                  <TableCell className="text-sm">{r.supplierName}</TableCell>
                  <TableCell className="text-sm">{formatDateValue(r.invoiceDate)}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrencyValue(r.amountExTax)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatCurrencyValue(r.taxAmount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyValue(r.totalAmount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.relatedOrderNo || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${receivedStatusMap[r.status]?.color}`}>
                      {receivedStatusMap[r.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(r)}><Eye className="h-4 w-4 mr-2" />查看</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                        {r.status === "pending" && <DropdownMenuItem onClick={() => handleVerify(r.id)}><FileText className="h-4 w-4 mr-2" />验证发票</DropdownMenuItem>}
                        {r.status === "verified" && <DropdownMenuItem onClick={() => handleBook(r.id)}><Receipt className="h-4 w-4 mr-2" />入账</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <TablePaginationFooter total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

      {/* 汇总行 */}
      <div className="flex justify-end gap-6 text-sm text-muted-foreground pr-2">
        <span>共 {filtered.length} 条</span>
        <span>税额合计：<span className="font-medium text-foreground">{formatCurrencyValue(totalTax)}</span></span>
        <span>含税合计：<span className="font-medium text-foreground">{formatCurrencyValue(totalAmount)}</span></span>
      </div>

      {/* 登记/编辑对话框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <div ref={formPrintRef}>
            <DialogHeader><DialogTitle>{editing ? "编辑收票" : "登记收票"}</DialogTitle></DialogHeader>
            {/* AI 识别上传区 */}
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center bg-muted/30">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleOcrUpload} />
              <Button type="button" variant="outline" size="sm" disabled={ocrLoading} onClick={() => fileInputRef.current?.click()}>
                {ocrLoading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />AI识别中...</> : <><Upload className="h-4 w-4 mr-1.5" />上传发票自动识别（图片/PDF）</>}
              </Button>
              {ocrProvider && <p className="text-xs text-green-600 mt-1.5 flex items-center justify-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />已由 {ocrProvider} 识别，请核对以下信息</p>}
              <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG、PDF，上传后自动填入表单</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>发票号码 *</Label>
                <Input value={form.invoiceNo || ""} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))} placeholder="8位发票号码" />
              </div>
              <div className="space-y-1.5">
                <Label>发票代码</Label>
                <Input value={form.invoiceCode || ""} onChange={e => setForm(f => ({ ...f, invoiceCode: e.target.value }))} placeholder="10位发票代码" />
              </div>
              <div className="space-y-1.5">
                <Label>发票类型</Label>
                <Select value={form.invoiceType || "vat_special"} onValueChange={v => setForm(f => ({ ...f, invoiceType: v as InvoiceType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(invoiceTypeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>供应商名称 *</Label>
                <Input value={form.supplierName || ""} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>开票日期</Label>
                <Input type="date" value={form.invoiceDate || ""} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>收票日期</Label>
                <Input type="date" value={form.receiveDate || ""} onChange={e => setForm(f => ({ ...f, receiveDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>不含税金额</Label>
                <Input type="number" value={form.amountExTax || ""} onChange={e => { const v = Number(e.target.value); setForm(f => ({ ...f, amountExTax: v })); calcTax(v, Number(form.taxRate) || 13); }} />
              </div>
              <div className="space-y-1.5">
                <Label>税率</Label>
                <Select value={String(form.taxRate ?? 13)} onValueChange={v => { setForm(f => ({ ...f, taxRate: Number(v) })); calcTax(Number(form.amountExTax) || 0, Number(v)); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TAX_RATES.map(r => <SelectItem key={r} value={r.replace("%", "")}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>税额</Label>
                <Input type="number" value={form.taxAmount || ""} onChange={e => setForm(f => ({ ...f, taxAmount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>含税金额</Label>
                <Input type="number" value={form.totalAmount || ""} onChange={e => setForm(f => ({ ...f, totalAmount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>关联采购单号</Label>
                <Input value={form.relatedOrderNo || ""} onChange={e => setForm(f => ({ ...f, relatedOrderNo: e.target.value }))} placeholder="PO-2026-001" />
              </div>
              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select value={form.status || "received"} onValueChange={v => setForm(f => ({ ...f, status: v as InvoiceStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(receivedStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>备注</Label>
                <Textarea value={form.remark || ""} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter data-print-ignore="true">
            <PrintPreviewButton title={editing ? "编辑收票" : "登记收票"} targetRef={formPrintRef} />
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看对话框 */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <div ref={viewPrintRef}>
            <DialogHeader><DialogTitle>发票详情</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-3 text-sm">
                {[
                  ["发票号码", viewing.invoiceNo], ["发票代码", viewing.invoiceCode || "-"],
                  ["发票类型", invoiceTypeMap[viewing.invoiceType]], ["供应商", viewing.supplierName],
                  ["开票日期", viewing.invoiceDate], ["收票日期", viewing.receiveDate],
                  ["不含税金额", formatCurrencyValue(viewing.amountExTax)], ["税率", `${formatDisplayNumber(viewing.taxRate)}%`],
                  ["税额", formatCurrencyValue(viewing.taxAmount)], ["含税金额", formatCurrencyValue(viewing.totalAmount)],
                  ["关联订单", viewing.relatedOrderNo || "-"], ["状态", receivedStatusMap[viewing.status]?.label],
                  ["备注", viewing.remark || "-"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">{k}：</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter data-print-ignore="true">
            <PrintPreviewButton title="收票详情" targetRef={viewPrintRef} />
            <Button variant="outline" onClick={() => setViewOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 开票子组件 ====================

function IssuedInvoiceTab() {
  const PAGE_SIZE = 10;
  const trpcUtils = trpc.useUtils();
  const [location] = useLocation();
  const formPrintRef = useRef<HTMLDivElement>(null);
  const viewPrintRef = useRef<HTMLDivElement>(null);
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery({ status: "active" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<IssuedInvoice | null>(null);
  const [viewing, setViewing] = useState<IssuedInvoice | null>(null);
  const [form, setForm] = useState<Partial<IssuedInvoice>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProvider, setOcrProvider] = useState("");
  const [hasAppliedRoutePrefill, setHasAppliedRoutePrefill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognizeMutation = trpc.invoiceOcr.recognize.useMutation();
  const { data: invoiceRows = [], isLoading } = trpc.issuedInvoices.list.useQuery(undefined);
  const createMutation = trpc.issuedInvoices.create.useMutation();
  const updateMutation = trpc.issuedInvoices.update.useMutation();
  const deleteMutation = trpc.issuedInvoices.delete.useMutation();
  const draftFromReceivablesMutation = trpc.issuedInvoices.createDraftFromReceivables.useMutation();

  const records = useMemo(
    () => (invoiceRows as any[]).map(mapIssuedInvoiceRecord),
    [invoiceRows],
  );

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrProvider("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const results = await recognizeMutation.mutateAsync({ images: [{ name: file.name, base64 }] });
      const result = results[0];
      if (result?.success && result.data) {
        const d = result.data;
        setOcrProvider(result.provider || "");
        setForm(f => ({
          ...f,
          invoiceNo: d.invoiceNo || f.invoiceNo,
          invoiceDate: d.invoiceDate || f.invoiceDate,
          amountExTax: d.amountExTax ?? f.amountExTax,
          taxRate: d.taxRate ?? f.taxRate,
          taxAmount: d.taxAmount ?? f.taxAmount,
          totalAmount: d.totalAmount ?? f.totalAmount,
          invoiceType: (d.invoiceType as InvoiceType) || f.invoiceType,
        }));
        toast.success(`AI识别成功（${result.provider}）`);
      } else {
        toast.error(result?.error || "识别失败，请手动填写");
      }
    } catch (err: any) {
      toast.error("识别请求失败：" + err.message);
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = records.filter(r => {
    const matchSearch = !search || (r.invoiceNo && r.invoiceNo.includes(search)) || r.customerName.includes(search) || r.relatedOrderNo.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (hasAppliedRoutePrefill) return;
    const params = new URLSearchParams(window.location.search);
    const customerName = String(params.get("customerName") || "").trim();
    const reconcileMonth = String(params.get("reconcileMonth") || "").trim();
    const customerId = Number(params.get("customerId") || 0) || undefined;
    const receivableIds = String(params.get("receivableIds") || "")
      .split(",")
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (!customerName) return;

    let cancelled = false;
    (async () => {
      const draft = await draftFromReceivablesMutation.mutateAsync({
        customerId,
        customerName,
        reconcileMonth,
        receivableIds,
        bankAccountId: Number((bankAccounts as any[])[0]?.id || 0) || undefined,
      });
      if (cancelled) return;
      const mapped = mapIssuedInvoiceRecord(draft);
      const fallbackAccount = (bankAccounts as any[]).find((item: any) => Number(item.id) === Number(mapped.bankAccountId))
        || (bankAccounts as any[])[0];
      setEditing(mapped);
      setForm({
        ...mapped,
        bankAccountId: mapped.bankAccountId || Number(fallbackAccount?.id || 0) || undefined,
        bankAccount: mapped.bankAccount || (fallbackAccount ? formatBankAccountDisplay(fallbackAccount) : ""),
      });
      setFormOpen(true);
      setHasAppliedRoutePrefill(true);
      await trpcUtils.issuedInvoices.list.invalidate();
      toast.success(`已带入开票客户：${customerName}`);

      params.delete("customerId");
      params.delete("customerName");
      params.delete("reconcileMonth");
      params.delete("receivableIds");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    })().catch((error: any) => {
      toast.error(error?.message || "生成开票草稿失败");
      setHasAppliedRoutePrefill(true);
    });

    return () => {
      cancelled = true;
    };
  }, [bankAccounts, draftFromReceivablesMutation, hasAppliedRoutePrefill, location, trpcUtils.issuedInvoices.list]);

  const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0);

  const openAdd = () => {
    const defaultAccount = (bankAccounts as any[])[0];
    setEditing(null);
    setForm({
      invoiceType: "vat_special",
      taxRate: 13,
      status: "draft",
      bankAccountId: Number(defaultAccount?.id || 0) || undefined,
      bankAccount: defaultAccount ? formatBankAccountDisplay(defaultAccount) : "",
    });
    setFormOpen(true);
  };
  const openEdit = (r: IssuedInvoice) => { setEditing(r); setForm({ ...r }); setFormOpen(true); };
  const openView = (r: IssuedInvoice) => { setViewing(r); setViewOpen(true); };

  const handleSave = async () => {
    if (!form.customerName) { toast.error("请填写客户名称"); return; }
    const payload = {
      invoiceNo: form.invoiceNo || undefined,
      invoiceType: (form.invoiceType as InvoiceType) || "vat_special",
      customerId: form.customerId,
      customerName: form.customerName || "",
      receivableIds: form.receivableIds || [],
      relatedOrderNo: form.relatedOrderNo || "",
      reconcileMonth: form.reconcileMonth || "",
      invoiceDate: form.invoiceDate || undefined,
      amountExTax: String(Number(form.amountExTax) || 0),
      taxRate: String(Number(form.taxRate) || 13),
      taxAmount: String(Number(form.taxAmount) || 0),
      totalAmount: String(Number(form.totalAmount) || 0),
      bankAccountId: form.bankAccountId,
      bankAccount: form.bankAccount || "",
      status: (form.status as IssuedStatus) || "draft",
      remark: form.remark || "",
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
      toast.success("已更新");
    } else {
      await createMutation.mutateAsync(payload);
      toast.success("已添加");
    }
    await trpcUtils.issuedInvoices.list.invalidate();
    setFormOpen(false);
  };

  const handleIssue = async (record: IssuedInvoice) => {
    await updateMutation.mutateAsync({
      id: record.id,
      data: {
        status: "issued",
        invoiceDate: record.invoiceDate || new Date().toISOString().split("T")[0],
        invoiceNo: record.invoiceNo || undefined,
      },
    });
    await trpcUtils.issuedInvoices.list.invalidate();
    toast.success("已标记为已开票");
  };
  const handleCancel = async (record: IssuedInvoice) => {
    await updateMutation.mutateAsync({ id: record.id, data: { status: "cancelled" } });
    await trpcUtils.issuedInvoices.list.invalidate();
    toast.success("已作废");
  };
  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    await trpcUtils.issuedInvoices.list.invalidate();
    toast.success("已删除");
  };

  const calcTax = (exTax: number, rate: number) => {
    const tax = exTax * rate / 100;
    setForm(f => ({ ...f, taxAmount: Math.round(tax * 100) / 100, totalAmount: Math.round((exTax + tax) * 100) / 100 }));
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "开票总数", value: records.length, color: "text-blue-600" },
          { label: "草稿", value: records.filter(r => r.status === "draft").length, color: "text-gray-500" },
          { label: "已开票", value: records.filter(r => r.status === "issued").length, color: "text-green-600" },
          { label: "含税总额", value: formatCurrencyValue(records.reduce((s, r) => s + r.totalAmount, 0)), color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="搜索发票号、客户..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(issuedStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />新建开票草稿</Button>
      </div>

      {/* 表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>发票号码</TableHead>
                <TableHead>发票类型</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>开票日期</TableHead>
                <TableHead className="text-right">不含税金额</TableHead>
                <TableHead className="text-right">税额</TableHead>
                <TableHead className="text-right">含税金额</TableHead>
                <TableHead>关联订单</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
              ) : pagedRecords.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.invoiceNo || <span className="text-muted-foreground">待开具</span>}</TableCell>
                  <TableCell className="text-sm">{invoiceTypeMap[r.invoiceType]}</TableCell>
                  <TableCell className="text-sm">{r.customerName}</TableCell>
                  <TableCell className="text-sm">{r.invoiceDate || "-"}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrencyValue(r.amountExTax)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatCurrencyValue(r.taxAmount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyValue(r.totalAmount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.relatedOrderNo || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${issuedStatusMap[r.status]?.color}`}>
                      {issuedStatusMap[r.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(r)}><Eye className="h-4 w-4 mr-2" />查看</DropdownMenuItem>
                        {r.status === "draft" && (
                          <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="h-4 w-4 mr-2" />编辑草稿</DropdownMenuItem>
                        )}
                        {r.status === "draft" && <DropdownMenuItem onClick={() => handleIssue(r)}><Send className="h-4 w-4 mr-2" />标记已开票</DropdownMenuItem>}
                        {(r.status === "draft" || r.status === "issued") && <DropdownMenuItem className="text-orange-600" onClick={() => handleCancel(r)}><FileText className="h-4 w-4 mr-2" />作废</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 mr-2" />删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <TablePaginationFooter total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

      <div className="flex justify-end gap-6 text-sm text-muted-foreground pr-2">
        <span>共 {filtered.length} 条</span>
        <span>含税合计：<span className="font-medium text-foreground">{formatCurrencyValue(totalAmount)}</span></span>
      </div>

      {/* 表单对话框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <div ref={formPrintRef}>
            <DialogHeader><DialogTitle>{editing ? "编辑开票草稿" : "新建开票草稿"}</DialogTitle></DialogHeader>
            {/* AI 识别上传区 */}
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center bg-muted/30">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleOcrUpload} />
              <Button type="button" variant="outline" size="sm" disabled={ocrLoading} onClick={() => fileInputRef.current?.click()}>
                {ocrLoading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />AI识别中...</> : <><Upload className="h-4 w-4 mr-1.5" />上传发票自动识别（图片/PDF）</>}
              </Button>
              {ocrProvider && <p className="text-xs text-green-600 mt-1.5 flex items-center justify-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />已由 {ocrProvider} 识别，请核对以下信息</p>}
              <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG、PDF，上传后自动填入表单</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>客户名称 *</Label>
              <Input value={form.customerName || ""} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>发票类型</Label>
              <Select value={form.invoiceType || "vat_special"} onValueChange={v => setForm(f => ({ ...f, invoiceType: v as InvoiceType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(invoiceTypeMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>发票号码</Label>
              <Input value={form.invoiceNo || ""} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))} placeholder="开具后填写" />
            </div>
            <div className="space-y-1.5">
              <Label>开票日期</Label>
              <Input type="date" value={form.invoiceDate || ""} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>不含税金额</Label>
              <Input type="number" value={form.amountExTax || ""} onChange={e => { const v = Number(e.target.value); setForm(f => ({ ...f, amountExTax: v })); calcTax(v, Number(form.taxRate) || 13); }} />
            </div>
            <div className="space-y-1.5">
              <Label>税率</Label>
              <Select value={String(form.taxRate ?? 13)} onValueChange={v => { setForm(f => ({ ...f, taxRate: Number(v) })); calcTax(Number(form.amountExTax) || 0, Number(v)); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TAX_RATES.map(r => <SelectItem key={r} value={r.replace("%", "")}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>税额</Label>
              <Input type="number" value={form.taxAmount || ""} onChange={e => setForm(f => ({ ...f, taxAmount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>含税金额</Label>
              <Input type="number" value={form.totalAmount || ""} onChange={e => setForm(f => ({ ...f, totalAmount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>关联销售订单</Label>
              <Input value={form.relatedOrderNo || ""} onChange={e => setForm(f => ({ ...f, relatedOrderNo: e.target.value }))} placeholder="SO-2026-001" />
            </div>
            <div className="space-y-1.5">
              <Label>当前状态</Label>
              <Input readOnly value={issuedStatusMap[(form.status as IssuedStatus) || "draft"]?.label || "草稿"} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>收款银行账户</Label>
              <Select
                value={form.bankAccountId ? String(form.bankAccountId) : ""}
                onValueChange={(value) => {
                  const account = (bankAccounts as any[]).find((item: any) => String(item.id) === String(value));
                  setForm(f => ({
                    ...f,
                    bankAccountId: Number(value) || undefined,
                    bankAccount: account ? formatBankAccountDisplay(account) : "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择收款银行账户" />
                </SelectTrigger>
                <SelectContent>
                  {(bankAccounts as any[]).map((account: any) => {
                    const displayName = formatBankAccountDisplay(account);
                    return (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>备注</Label>
              <Textarea value={form.remark || ""} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={2} />
            </div>
          </div>
          </div>
          <DialogFooter data-print-ignore="true">
            <PrintPreviewButton title={editing ? "编辑开票草稿" : "新建开票草稿"} targetRef={formPrintRef} />
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || draftFromReceivablesMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending || draftFromReceivablesMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看对话框 */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <div ref={viewPrintRef}>
            <DialogHeader><DialogTitle>开票详情</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-3 text-sm">
                {[
                  ["发票号码", viewing.invoiceNo || "待开具"], ["发票类型", invoiceTypeMap[viewing.invoiceType]],
                  ["客户名称", viewing.customerName], ["开票日期", viewing.invoiceDate || "-"],
                  ["不含税金额", formatCurrencyValue(viewing.amountExTax)], ["税率", `${formatDisplayNumber(viewing.taxRate)}%`],
                  ["税额", formatCurrencyValue(viewing.taxAmount)], ["含税金额", formatCurrencyValue(viewing.totalAmount)],
                  ["关联订单", viewing.relatedOrderNo || "-"], ["收款账户", viewing.bankAccount || "-"],
                  ["状态", issuedStatusMap[viewing.status]?.label], ["备注", viewing.remark || "-"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">{k}：</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter data-print-ignore="true">
            <PrintPreviewButton title="开票详情" targetRef={viewPrintRef} />
            <Button variant="outline" onClick={() => setViewOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 主页面 ====================

export default function InvoicePage() {
  const hasIssuedPrefill = Boolean(new URLSearchParams(window.location.search).get("customerName"));
  return (
    <ERPLayout>
      <div className="w-full px-3 py-4 md:px-4 md:py-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">发票管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">管理收票登记与开票记录，支持发票验证和入账处理</p>
          </div>
        </div>

        <Tabs defaultValue={hasIssuedPrefill ? "issued" : "received"}>
          <TabsList className="mb-4">
            <TabsTrigger value="received" className="gap-2">
              <Download className="h-4 w-4" />收票管理
            </TabsTrigger>
            <TabsTrigger value="issued" className="gap-2">
              <Send className="h-4 w-4" />开票管理
            </TabsTrigger>
          </TabsList>
          <TabsContent value="received"><ReceivedInvoiceTab /></TabsContent>
          <TabsContent value="issued"><IssuedInvoiceTab /></TabsContent>
        </Tabs>
      </div>
    </ERPLayout>
  );
}
