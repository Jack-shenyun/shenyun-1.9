import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
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
  supplierName: string;
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
  customerName: string;
  invoiceDate: string;
  amountExTax: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
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

// ==================== 模拟数据 ====================

const mockReceivedInvoices: ReceivedInvoice[] = [
  { id: 1, invoiceNo: "12345678", invoiceCode: "3100212320", invoiceType: "vat_special", supplierName: "上海某材料有限公司", invoiceDate: "2026-03-01", receiveDate: "2026-03-03", amountExTax: 10000, taxRate: 13, taxAmount: 1300, totalAmount: 11300, status: "verified", relatedOrderNo: "PO-2026-001", verifyCode: "", remark: "" },
  { id: 2, invoiceNo: "87654321", invoiceCode: "3100212321", invoiceType: "vat_normal", supplierName: "北京某科技有限公司", invoiceDate: "2026-03-05", receiveDate: "2026-03-06", amountExTax: 5000, taxRate: 6, taxAmount: 300, totalAmount: 5300, status: "received", relatedOrderNo: "PO-2026-002", verifyCode: "", remark: "" },
  { id: 3, invoiceNo: "11223344", invoiceCode: "", invoiceType: "electronic", supplierName: "广州某贸易有限公司", invoiceDate: "2026-03-07", receiveDate: "2026-03-07", amountExTax: 2000, taxRate: 3, taxAmount: 60, totalAmount: 2060, status: "pending", relatedOrderNo: "", verifyCode: "", remark: "待核验" },
];

const mockIssuedInvoices: IssuedInvoice[] = [
  { id: 1, invoiceNo: "20260001", invoiceType: "vat_special", customerName: "深圳某医院", invoiceDate: "2026-03-02", amountExTax: 20000, taxRate: 13, taxAmount: 2600, totalAmount: 22600, status: "issued", relatedOrderNo: "SO-2026-001", bankAccount: "招商银行 6225 **** **** 1234", remark: "" },
  { id: 2, invoiceNo: "20260002", invoiceType: "electronic", customerName: "武汉某诊所", invoiceDate: "2026-03-06", amountExTax: 8000, taxRate: 6, taxAmount: 480, totalAmount: 8480, status: "issued", relatedOrderNo: "SO-2026-003", bankAccount: "", remark: "" },
  { id: 3, invoiceNo: "", invoiceType: "vat_special", customerName: "成都某医疗器械公司", invoiceDate: "", amountExTax: 15000, taxRate: 13, taxAmount: 1950, totalAmount: 16950, status: "draft", relatedOrderNo: "SO-2026-005", bankAccount: "", remark: "待开具" },
];

// ==================== 收票子组件 ====================

function ReceivedInvoiceTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [records, setRecords] = useState<ReceivedInvoice[]>(mockReceivedInvoices);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<ReceivedInvoice | null>(null);
  const [viewing, setViewing] = useState<ReceivedInvoice | null>(null);
  const [form, setForm] = useState<Partial<ReceivedInvoice>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProvider, setOcrProvider] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognizeMutation = trpc.invoiceOcr.recognize.useMutation();

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

  const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0);
  const totalTax = filtered.reduce((s, r) => s + r.taxAmount, 0);

  const openAdd = () => { setEditing(null); setForm({ invoiceType: "vat_special", taxRate: 13, status: "pending" }); setFormOpen(true); };
  const openEdit = (r: ReceivedInvoice) => { setEditing(r); setForm({ ...r }); setFormOpen(true); };
  const openView = (r: ReceivedInvoice) => { setViewing(r); setViewOpen(true); };

  const handleSave = () => {
    if (!form.invoiceNo || !form.supplierName) { toast.error("请填写发票号码和供应商名称"); return; }
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } as ReceivedInvoice : r));
      toast.success("已更新");
    } else {
      const newRecord: ReceivedInvoice = { id: Date.now(), invoiceNo: form.invoiceNo!, invoiceCode: form.invoiceCode || "", invoiceType: form.invoiceType as InvoiceType || "vat_special", supplierName: form.supplierName!, invoiceDate: form.invoiceDate || "", receiveDate: form.receiveDate || new Date().toISOString().split("T")[0], amountExTax: Number(form.amountExTax) || 0, taxRate: Number(form.taxRate) || 13, taxAmount: Number(form.taxAmount) || 0, totalAmount: Number(form.totalAmount) || 0, status: form.status as InvoiceStatus || "received", relatedOrderNo: form.relatedOrderNo || "", verifyCode: form.verifyCode || "", remark: form.remark || "" };
      setRecords(prev => [newRecord, ...prev]);
      toast.success("已添加");
    }
    setFormOpen(false);
  };

  const handleDelete = (id: number) => { setRecords(prev => prev.filter(r => r.id !== id)); toast.success("已删除"); };
  const handleVerify = (id: number) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "verified" as InvoiceStatus } : r)); toast.success("已验证"); };
  const handleBook = (id: number) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "booked" as InvoiceStatus } : r)); toast.success("已入账"); };

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
          { label: "含税总额", value: `¥${records.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}`, color: "text-green-600" },
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
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.invoiceNo}</TableCell>
                  <TableCell className="text-sm">{invoiceTypeMap[r.invoiceType]}</TableCell>
                  <TableCell className="text-sm">{r.supplierName}</TableCell>
                  <TableCell className="text-sm">{r.invoiceDate}</TableCell>
                  <TableCell className="text-right text-sm">¥{r.amountExTax.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">¥{r.taxAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">¥{r.totalAmount.toLocaleString()}</TableCell>
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

      {/* 汇总行 */}
      <div className="flex justify-end gap-6 text-sm text-muted-foreground pr-2">
        <span>共 {filtered.length} 条</span>
        <span>税额合计：<span className="font-medium text-foreground">¥{totalTax.toLocaleString()}</span></span>
        <span>含税合计：<span className="font-medium text-foreground">¥{totalAmount.toLocaleString()}</span></span>
      </div>

      {/* 登记/编辑对话框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看对话框 */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>发票详情</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              {[
                ["发票号码", viewing.invoiceNo], ["发票代码", viewing.invoiceCode || "-"],
                ["发票类型", invoiceTypeMap[viewing.invoiceType]], ["供应商", viewing.supplierName],
                ["开票日期", viewing.invoiceDate], ["收票日期", viewing.receiveDate],
                ["不含税金额", `¥${viewing.amountExTax.toLocaleString()}`], ["税率", `${viewing.taxRate}%`],
                ["税额", `¥${viewing.taxAmount.toLocaleString()}`], ["含税金额", `¥${viewing.totalAmount.toLocaleString()}`],
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
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 开票子组件 ====================

function IssuedInvoiceTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [records, setRecords] = useState<IssuedInvoice[]>(mockIssuedInvoices);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<IssuedInvoice | null>(null);
  const [viewing, setViewing] = useState<IssuedInvoice | null>(null);
  const [form, setForm] = useState<Partial<IssuedInvoice>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProvider, setOcrProvider] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognizeMutation = trpc.invoiceOcr.recognize.useMutation();

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

  const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0);

  const openAdd = () => { setEditing(null); setForm({ invoiceType: "vat_special", taxRate: 13, status: "draft" }); setFormOpen(true); };
  const openEdit = (r: IssuedInvoice) => { setEditing(r); setForm({ ...r }); setFormOpen(true); };
  const openView = (r: IssuedInvoice) => { setViewing(r); setViewOpen(true); };

  const handleSave = () => {
    if (!form.customerName) { toast.error("请填写客户名称"); return; }
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } as IssuedInvoice : r));
      toast.success("已更新");
    } else {
      const newRecord: IssuedInvoice = { id: Date.now(), invoiceNo: form.invoiceNo || "", invoiceType: form.invoiceType as InvoiceType || "vat_special", customerName: form.customerName!, invoiceDate: form.invoiceDate || new Date().toISOString().split("T")[0], amountExTax: Number(form.amountExTax) || 0, taxRate: Number(form.taxRate) || 13, taxAmount: Number(form.taxAmount) || 0, totalAmount: Number(form.totalAmount) || 0, status: form.status as IssuedStatus || "draft", relatedOrderNo: form.relatedOrderNo || "", bankAccount: form.bankAccount || "", remark: form.remark || "" };
      setRecords(prev => [newRecord, ...prev]);
      toast.success("已添加");
    }
    setFormOpen(false);
  };

  const handleDelete = (id: number) => { setRecords(prev => prev.filter(r => r.id !== id)); toast.success("已删除"); };
  const handleIssue = (id: number) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "issued" as IssuedStatus } : r)); toast.success("已标记为已开票"); };
  const handleCancel = (id: number) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "cancelled" as IssuedStatus } : r)); toast.success("已作废"); };

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
          { label: "含税总额", value: `¥${records.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}`, color: "text-green-600" },
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
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />新建开票</Button>
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
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.invoiceNo || <span className="text-muted-foreground">待开具</span>}</TableCell>
                  <TableCell className="text-sm">{invoiceTypeMap[r.invoiceType]}</TableCell>
                  <TableCell className="text-sm">{r.customerName}</TableCell>
                  <TableCell className="text-sm">{r.invoiceDate || "-"}</TableCell>
                  <TableCell className="text-right text-sm">¥{r.amountExTax.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">¥{r.taxAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">¥{r.totalAmount.toLocaleString()}</TableCell>
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
                        <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                        {r.status === "draft" && <DropdownMenuItem onClick={() => handleIssue(r.id)}><Send className="h-4 w-4 mr-2" />标记已开票</DropdownMenuItem>}
                        {(r.status === "draft" || r.status === "issued") && <DropdownMenuItem className="text-orange-600" onClick={() => handleCancel(r.id)}><FileText className="h-4 w-4 mr-2" />作废</DropdownMenuItem>}
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

      <div className="flex justify-end gap-6 text-sm text-muted-foreground pr-2">
        <span>共 {filtered.length} 条</span>
        <span>含税合计：<span className="font-medium text-foreground">¥{totalAmount.toLocaleString()}</span></span>
      </div>

      {/* 表单对话框 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "编辑开票" : "新建开票"}</DialogTitle></DialogHeader>
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
              <Label>状态</Label>
              <Select value={form.status || "draft"} onValueChange={v => setForm(f => ({ ...f, status: v as IssuedStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(issuedStatusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>收款银行账户</Label>
              <Input value={form.bankAccount || ""} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} placeholder="银行名称 + 账号" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>备注</Label>
              <Textarea value={form.remark || ""} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看对话框 */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>开票详情</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              {[
                ["发票号码", viewing.invoiceNo || "待开具"], ["发票类型", invoiceTypeMap[viewing.invoiceType]],
                ["客户名称", viewing.customerName], ["开票日期", viewing.invoiceDate || "-"],
                ["不含税金额", `¥${viewing.amountExTax.toLocaleString()}`], ["税率", `${viewing.taxRate}%`],
                ["税额", `¥${viewing.taxAmount.toLocaleString()}`], ["含税金额", `¥${viewing.totalAmount.toLocaleString()}`],
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
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 主页面 ====================

export default function InvoicePage() {
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

        <Tabs defaultValue="received">
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
