import { useState, useRef } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import {
  Receipt, Plus, MoreHorizontal, Eye, CheckCircle2, XCircle,
  Search, Trash2, Upload, Loader2, FileText, X, AlertCircle,
} from "lucide-react";

// ==================== 类型定义 ====================

type ReimbursementStatus = "pending" | "approved" | "rejected" | "paid";
type InvoiceType = "vat_special" | "vat_normal" | "electronic" | "receipt" | "other";

interface InvoiceItem {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceType: InvoiceType;
  sellerName: string;
  description: string;
  amountExTax: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  // 上传的图片（本地预览用）
  imagePreview?: string;
  imageName?: string;
  ocrStatus?: "idle" | "loading" | "done" | "error";
}

interface ReimbursementRecord {
  id: number;
  applyNo: string;
  applicant: string;
  department: string;
  applyDate: string;
  title: string;
  totalAmount: number;
  status: ReimbursementStatus;
  remark: string;
  items: InvoiceItem[];
  financeRemark: string;
}

// ==================== 常量 ====================

const statusMap: Record<ReimbursementStatus, { label: string; color: string }> = {
  pending:  { label: "待审批", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  approved: { label: "已审批", color: "bg-blue-100 text-blue-700 border-blue-300" },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-700 border-red-300" },
  paid:     { label: "已支付", color: "bg-green-100 text-green-700 border-green-300" },
};

const invoiceTypeMap: Record<InvoiceType, string> = {
  vat_special: "增值税专用发票",
  vat_normal:  "增值税普通发票",
  electronic:  "电子发票",
  receipt:     "收据",
  other:       "其他凭证",
};

const DEPARTMENTS = [
  "管理部", "招商部", "销售部", "研发部", "生产部",
  "质量部", "采购部", "仓库管理", "财务部",
];

const TAX_RATES = [0, 1, 3, 6, 9, 13];

// ==================== 模拟用户数据（报销人 -> 部门映射）====================

const MOCK_USERS: { name: string; department: string }[] = [
  { name: "张三", department: "销售部" },
  { name: "李四", department: "采购部" },
  { name: "王五", department: "研发部" },
  { name: "赵六", department: "生产部" },
  { name: "陈七", department: "财务部" },
  { name: "刘八", department: "管理部" },
];

// ==================== 模拟数据 ====================

const mockData: ReimbursementRecord[] = [
  {
    id: 1,
    applyNo: "EXP-2026-001",
    applicant: "张三",
    department: "销售部",
    applyDate: "2026-03-01",
    title: "3月出差费用报销",
    totalAmount: 2850,
    status: "pending",
    remark: "出差上海参加展会",
    financeRemark: "",
    items: [
      { id: "1-1", invoiceNo: "25442000000012345678", invoiceDate: "2026-02-28", invoiceType: "electronic", sellerName: "上海某酒店", description: "住宿费", amountExTax: 1500, taxRate: 6, taxAmount: 90, totalAmount: 1590, ocrStatus: "idle" },
      { id: "1-2", invoiceNo: "25442000000087654321", invoiceDate: "2026-02-27", invoiceType: "electronic", sellerName: "中国铁路", description: "高铁票", amountExTax: 1200, taxRate: 9, taxAmount: 108, totalAmount: 1260, ocrStatus: "idle" },
    ],
  },
  {
    id: 2,
    applyNo: "EXP-2026-002",
    applicant: "李四",
    department: "采购部",
    applyDate: "2026-03-05",
    title: "办公用品采购报销",
    totalAmount: 680,
    status: "approved",
    remark: "",
    financeRemark: "已核实发票",
    items: [
      { id: "2-1", invoiceNo: "25442000000099887766", invoiceDate: "2026-03-04", invoiceType: "vat_normal", sellerName: "某办公用品店", description: "打印纸、文具", amountExTax: 600, taxRate: 13, taxAmount: 78, totalAmount: 678, ocrStatus: "idle" },
    ],
  },
];

// ==================== 发票明细行组件 ====================

function InvoiceItemRow({
  item, index, onChange, onDelete,
}: {
  item: InvoiceItem;
  index: number;
  onChange: (id: string, field: keyof InvoiceItem, value: any) => void;
  onDelete: (id: string) => void;
}) {
  const handleAmountChange = (field: "amountExTax" | "taxRate", value: number) => {
    const newItem = { ...item, [field]: value };
    newItem.taxAmount = Math.round(newItem.amountExTax * newItem.taxRate) / 100;
    newItem.totalAmount = newItem.amountExTax + newItem.taxAmount;
    onChange(item.id, "amountExTax", newItem.amountExTax);
    onChange(item.id, "taxRate", newItem.taxRate);
    onChange(item.id, "taxAmount", newItem.taxAmount);
    onChange(item.id, "totalAmount", newItem.totalAmount);
  };

  return (
    <TableRow>
      <TableCell className="text-center text-muted-foreground text-sm w-8">{index + 1}</TableCell>
      <TableCell className="min-w-[120px]">
        <Select value={item.invoiceType} onValueChange={v => onChange(item.id, "invoiceType", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(invoiceTypeMap).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[150px]">
        <Input className="h-8 text-xs" value={item.invoiceNo} onChange={e => onChange(item.id, "invoiceNo", e.target.value)} placeholder="发票号码" />
      </TableCell>
      <TableCell className="min-w-[120px]">
        <Input type="date" className="h-8 text-xs" value={item.invoiceDate} onChange={e => onChange(item.id, "invoiceDate", e.target.value)} />
      </TableCell>
      <TableCell className="min-w-[140px]">
        <Input className="h-8 text-xs" value={item.sellerName} onChange={e => onChange(item.id, "sellerName", e.target.value)} placeholder="销售方名称" />
      </TableCell>
      <TableCell className="min-w-[140px]">
        <Input className="h-8 text-xs" value={item.description} onChange={e => onChange(item.id, "description", e.target.value)} placeholder="费用描述" />
      </TableCell>
      <TableCell className="min-w-[100px]">
        <Input type="number" className="h-8 text-xs" value={item.amountExTax || ""} onChange={e => handleAmountChange("amountExTax", Number(e.target.value))} placeholder="不含税金额" />
      </TableCell>
      <TableCell className="min-w-[80px]">
        <Select value={String(item.taxRate)} onValueChange={v => handleAmountChange("taxRate", Number(v))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{TAX_RATES.map(r => <SelectItem key={r} value={String(r)} className="text-xs">{r}%</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right text-sm font-medium min-w-[80px]">
        ¥{(item.totalAmount || 0).toFixed(2)}
      </TableCell>
      <TableCell>
        {item.ocrStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {item.ocrStatus === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {item.ocrStatus === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
        {item.imageName && (
          <span className="text-xs text-muted-foreground block truncate max-w-[80px]" title={item.imageName}>{item.imageName}</span>
        )}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ==================== 报销表单对话框 ====================

function ReimbursementFormDialog({
  open, onClose, editing, onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: ReimbursementRecord | null;
  onSave: (data: Omit<ReimbursementRecord, "id" | "applyNo">) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const [applicant, setApplicant] = useState(editing?.applicant || "");
  const [department, setDepartment] = useState(editing?.department || "");
  const [applyDate, setApplyDate] = useState(editing?.applyDate || today);
  const [title, setTitle] = useState(editing?.title || "");
  const [remark, setRemark] = useState(editing?.remark || "");
  const [items, setItems] = useState<InvoiceItem[]>(editing?.items || []);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ocrMutation = trpc.invoiceOcr.recognize.useMutation();

  // 报销人输入时自动带出部门
  const handleApplicantChange = (name: string) => {
    setApplicant(name);
    const found = MOCK_USERS.find(u => u.name === name);
    if (found) setDepartment(found.department);
  };

  const newItem = (): InvoiceItem => ({
    id: `new-${Date.now()}-${Math.random()}`,
    invoiceNo: "",
    invoiceDate: today,
    invoiceType: "electronic",
    sellerName: "",
    description: "",
    amountExTax: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0,
    ocrStatus: "idle",
  });

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = items.reduce((s, i) => s + (i.totalAmount || 0), 0);

  // 批量上传发票图片并 AI 识别
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // 先添加占位行（loading 状态）
    const placeholders: InvoiceItem[] = files.map(f => ({
      ...newItem(),
      id: `ocr-${Date.now()}-${f.name}`,
      imageName: f.name,
      ocrStatus: "loading" as const,
    }));
    setItems(prev => [...prev, ...placeholders]);
    setOcrLoading(true);

    try {
      // 将图片转为 base64
      const imageData = await Promise.all(
        files.map(f => new Promise<{ name: string; base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: f.name, base64: reader.result as string });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        }))
      );

      // 调用后端 AI 识别接口
      const results = await ocrMutation.mutateAsync({ images: imageData });

      // 用识别结果更新对应占位行
      setItems(prev => prev.map(item => {
        const result = results.find(r => item.imageName === r.name);
        if (!result) return item;
        if (!result.success) return { ...item, ocrStatus: "error" as const };
        const d = result.data;
        const amountExTax = Number(d.amountExTax) || 0;
        const taxRate = Number(d.taxRate) || 0;
        const taxAmount = Math.round(amountExTax * taxRate) / 100;
        const totalAmount = amountExTax + taxAmount;
        return {
          ...item,
          invoiceNo: d.invoiceNo || "",
          invoiceDate: d.invoiceDate || today,
          invoiceType: (d.invoiceType as InvoiceType) || "electronic",
          sellerName: d.sellerName || "",
          description: d.description || "",
          amountExTax,
          taxRate,
          taxAmount,
          totalAmount,
          ocrStatus: "done" as const,
        };
      }));

      const successCount = results.filter(r => r.success).length;
      toast.success(`AI 识别完成：${successCount}/${files.length} 张发票识别成功`);
    } catch (err: any) {
      // 识别失败，将所有 loading 行标记为 error
      setItems(prev => prev.map(item =>
        item.ocrStatus === "loading" ? { ...item, ocrStatus: "error" as const } : item
      ));
      toast.error("AI 识别失败：" + (err.message || "未知错误"));
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!applicant.trim()) { toast.error("请填写报销人"); return; }
    if (!department.trim()) { toast.error("请填写部门"); return; }
    if (!title.trim()) { toast.error("请填写报销标题"); return; }
    if (items.length === 0) { toast.error("请至少添加一条费用明细"); return; }
    onSave({ applicant, department, applyDate, title, remark, items, totalAmount, status: "pending", financeRemark: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑报销申请" : "新建报销申请"}</DialogTitle>
        </DialogHeader>

        {/* 基本信息 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>报销人 *</Label>
            <div className="relative">
              <Input
                value={applicant}
                onChange={e => handleApplicantChange(e.target.value)}
                placeholder="输入姓名"
                list="applicant-list"
              />
              <datalist id="applicant-list">
                {MOCK_USERS.map(u => <option key={u.name} value={u.name} />)}
              </datalist>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>所属部门</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="自动带出或手动选择" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>申请日期</Label>
            <Input type="date" value={applyDate} onChange={e => setApplyDate(e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label>报销标题 *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：3月出差费用报销" />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label>备注说明</Label>
            <Textarea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="可选填写报销说明" />
          </div>
        </div>

        {/* 费用明细 */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">费用明细（发票列表）</Label>
            <div className="flex gap-2">
              {/* 批量上传按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
              >
                {ocrLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                批量上传发票（AI识别）
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              {/* 手动添加行 */}
              <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, newItem()])}>
                <Plus className="h-4 w-4 mr-1.5" />手动添加一行
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
            支持批量上传多张发票图片，AI 自动识别发票信息并填入明细，识别后可手动修正。
          </div>

          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>发票类型</TableHead>
                  <TableHead>发票号码</TableHead>
                  <TableHead>开票日期</TableHead>
                  <TableHead>销售方</TableHead>
                  <TableHead>费用描述</TableHead>
                  <TableHead>不含税金额</TableHead>
                  <TableHead>税率</TableHead>
                  <TableHead className="text-right">含税金额</TableHead>
                  <TableHead>识别状态</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-6 text-sm">
                      暂无明细，点击「手动添加一行」或「批量上传发票」
                    </TableCell>
                  </TableRow>
                ) : items.map((item, idx) => (
                  <InvoiceItemRow
                    key={item.id}
                    item={item}
                    index={idx}
                    onChange={handleItemChange}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {items.length > 0 && (
            <div className="flex justify-end pr-2 text-sm">
              合计：<span className="font-bold text-primary ml-2">¥{totalAmount.toFixed(2)}</span>
              <span className="text-muted-foreground ml-2">（共 {items.length} 条）</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>提交报销申请</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 详情对话框 ====================

function DetailDialog({
  record, open, onClose, onApprove, onReject, onPay,
}: {
  record: ReimbursementRecord | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: number, remark: string) => void;
  onReject: (id: number, remark: string) => void;
  onPay: (id: number) => void;
}) {
  const [financeRemark, setFinanceRemark] = useState("");
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>报销详情 — {record.applyNo}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><span className="text-muted-foreground">报销人：</span><span className="font-medium">{record.applicant}</span></div>
          <div><span className="text-muted-foreground">部门：</span><span className="font-medium">{record.department}</span></div>
          <div><span className="text-muted-foreground">申请日期：</span>{record.applyDate}</div>
          <div className="col-span-2"><span className="text-muted-foreground">标题：</span>{record.title}</div>
          <div><span className="text-muted-foreground">状态：</span>
            <Badge variant="outline" className={`ml-1 text-xs ${statusMap[record.status]?.color}`}>{statusMap[record.status]?.label}</Badge>
          </div>
          {record.remark && <div className="col-span-3"><span className="text-muted-foreground">说明：</span>{record.remark}</div>}
        </div>

        <div className="border rounded-md overflow-x-auto mt-2">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>#</TableHead>
                <TableHead>发票类型</TableHead>
                <TableHead>发票号码</TableHead>
                <TableHead>开票日期</TableHead>
                <TableHead>销售方</TableHead>
                <TableHead>费用描述</TableHead>
                <TableHead className="text-right">含税金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {record.items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                  <TableCell className="text-sm">{invoiceTypeMap[item.invoiceType]}</TableCell>
                  <TableCell className="font-mono text-xs">{item.invoiceNo || "-"}</TableCell>
                  <TableCell className="text-sm">{item.invoiceDate}</TableCell>
                  <TableCell className="text-sm">{item.sellerName || "-"}</TableCell>
                  <TableCell className="text-sm">{item.description}</TableCell>
                  <TableCell className="text-right font-medium">¥{item.totalAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={6} className="text-right font-semibold text-sm">合计</TableCell>
                <TableCell className="text-right font-bold text-primary">¥{record.totalAmount.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {record.status === "pending" && (
          <div className="space-y-2 mt-2">
            <Label>财务审批意见</Label>
            <Textarea value={financeRemark} onChange={e => setFinanceRemark(e.target.value)} rows={2} placeholder="可填写审批意见（可选）" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { onReject(record.id, financeRemark); onClose(); }}>
                <XCircle className="h-4 w-4 mr-1.5" />驳回
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { onApprove(record.id, financeRemark); onClose(); }}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />审批通过
              </Button>
            </div>
          </div>
        )}

        {record.status === "approved" && (
          <div className="flex justify-end mt-2">
            <Button onClick={() => { onPay(record.id); onClose(); }}>
              标记已支付
            </Button>
          </div>
        )}

        {record.financeRemark && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2 mt-1">
            财务意见：{record.financeRemark}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==================== 主页面 ====================

export default function ReimbursementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [records, setRecords] = useState<ReimbursementRecord[]>(mockData);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReimbursementRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<ReimbursementRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.applyNo.includes(search) || r.applicant.includes(search) || r.title.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchDept = deptFilter === "all" || r.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const stats = {
    pending:  records.filter(r => r.status === "pending").length,
    approved: records.filter(r => r.status === "approved").length,
    paid:     records.filter(r => r.status === "paid").length,
    totalPending: records.filter(r => r.status === "pending").reduce((s, r) => s + r.totalAmount, 0),
  };

  const handleSave = (data: Omit<ReimbursementRecord, "id" | "applyNo">) => {
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...r, ...data } : r));
      toast.success("已更新");
    } else {
      const seq = String(records.length + 1).padStart(3, "0");
      setRecords(prev => [{ id: Date.now(), applyNo: `EXP-2026-${seq}`, ...data }, ...prev]);
      toast.success("报销申请已提交");
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleApprove = (id: number, remark: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "approved" as ReimbursementStatus, financeRemark: remark } : r));
    toast.success("已审批通过");
  };

  const handleReject = (id: number, remark: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" as ReimbursementStatus, financeRemark: remark } : r));
    toast.success("已驳回");
  };

  const handlePay = (id: number) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "paid" as ReimbursementStatus } : r));
    toast.success("已标记为支付");
  };

  const handleDelete = (id: number) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success("已删除");
  };

  return (
    <ERPLayout>
      <div className="w-full px-3 py-4 md:px-4 md:py-5">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">报销管理</h1>
              <p className="text-sm text-muted-foreground mt-0.5">汇总全部门报销申请，财务统一审批处理</p>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />新建报销申请
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-yellow-600">{stats.pending}</div><div className="text-xs text-muted-foreground mt-0.5">待审批</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-yellow-600">¥{stats.totalPending.toLocaleString()}</div><div className="text-xs text-muted-foreground mt-0.5">待审批金额</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-blue-600">{stats.approved}</div><div className="text-xs text-muted-foreground mt-0.5">已审批待支付</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-green-600">{stats.paid}</div><div className="text-xs text-muted-foreground mt-0.5">已支付</div></CardContent></Card>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="搜索单号、报销人、标题..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-28 h-9"><SelectValue placeholder="全部部门" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* 列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申请单号</TableHead>
                  <TableHead>报销人</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>申请日期</TableHead>
                  <TableHead>报销标题</TableHead>
                  <TableHead>发票数</TableHead>
                  <TableHead className="text-right">报销金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                    <TableCell className="font-mono text-sm">{r.applyNo}</TableCell>
                    <TableCell className="font-medium text-sm">{r.applicant}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.department}</TableCell>
                    <TableCell className="text-sm">{r.applyDate}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.title}</TableCell>
                    <TableCell className="text-sm text-center">{r.items.length}</TableCell>
                    <TableCell className="text-right font-medium">¥{r.totalAmount.toLocaleString()}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Badge variant="outline" className={`text-xs ${statusMap[r.status]?.color}`}>{statusMap[r.status]?.label}</Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setDetailRecord(r); setDetailOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />查看详情
                          </DropdownMenuItem>
                          {r.status === "pending" && (
                            <>
                              <DropdownMenuItem className="text-green-600" onClick={() => handleApprove(r.id, "")}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />审批通过
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleReject(r.id, "")}>
                                <XCircle className="h-4 w-4 mr-2" />驳回
                              </DropdownMenuItem>
                            </>
                          )}
                          {r.status === "approved" && (
                            <DropdownMenuItem onClick={() => handlePay(r.id)}>
                              <FileText className="h-4 w-4 mr-2" />标记已支付
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 表单对话框 */}
      {formOpen && (
        <ReimbursementFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          editing={editing}
          onSave={handleSave}
        />
      )}

      {/* 详情对话框 */}
      <DetailDialog
        record={detailRecord}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        onPay={handlePay}
      />
    </ERPLayout>
  );
}
