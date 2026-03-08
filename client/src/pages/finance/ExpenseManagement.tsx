import { useState, useMemo } from "react";
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
import {
  TrendingUp, TrendingDown, Plus, MoreHorizontal, Eye, Edit, Trash2,
  Search, DollarSign, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";

// ==================== 类型定义 ====================

type IncomeCategory = "sales" | "service" | "investment" | "other_income";
type ExpenseCategory = "purchase" | "salary" | "rent" | "utilities" | "marketing" | "rd" | "logistics" | "tax" | "other_expense";
type EntryStatus = "pending" | "confirmed" | "cancelled";

interface IncomeRecord {
  id: number;
  entryNo: string;
  date: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  currency: string;
  counterparty: string;
  paymentMethod: string;
  relatedOrderNo: string;
  status: EntryStatus;
  remark: string;
}

interface ExpenseRecord {
  id: number;
  entryNo: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  counterparty: string;
  paymentMethod: string;
  relatedOrderNo: string;
  status: EntryStatus;
  remark: string;
}

// ==================== 常量 ====================

const incomeCategoryMap: Record<IncomeCategory, string> = {
  sales:        "销售收入",
  service:      "服务收入",
  investment:   "投资收益",
  other_income: "其他收入",
};

const expenseCategoryMap: Record<ExpenseCategory, string> = {
  purchase:       "采购支出",
  salary:         "工资薪酬",
  rent:           "租金费用",
  utilities:      "水电费用",
  marketing:      "市场推广",
  rd:             "研发费用",
  logistics:      "物流运费",
  tax:            "税费",
  other_expense:  "其他支出",
};

const statusMap: Record<EntryStatus, { label: string; color: string }> = {
  pending:   { label: "待确认", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  confirmed: { label: "已确认", color: "bg-green-100 text-green-700 border-green-300" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-500 border-gray-300" },
};

const paymentMethods = ["银行转账", "现金", "支付宝", "微信支付", "承兑汇票", "其他"];

// ==================== 模拟数据 ====================

const mockIncome: IncomeRecord[] = [
  { id: 1, entryNo: "INC-2026-001", date: "2026-03-01", category: "sales", description: "销售订单 SO-2026-001 回款", amount: 22600, currency: "CNY", counterparty: "深圳某医院", paymentMethod: "银行转账", relatedOrderNo: "SO-2026-001", status: "confirmed", remark: "" },
  { id: 2, entryNo: "INC-2026-002", date: "2026-03-03", category: "sales", description: "销售订单 SO-2026-003 预付款", amount: 8480, currency: "CNY", counterparty: "武汉某诊所", paymentMethod: "银行转账", relatedOrderNo: "SO-2026-003", status: "confirmed", remark: "" },
  { id: 3, entryNo: "INC-2026-003", date: "2026-03-06", category: "service", description: "设备维保服务费", amount: 5000, currency: "CNY", counterparty: "成都某医院", paymentMethod: "银行转账", relatedOrderNo: "", status: "pending", remark: "" },
  { id: 4, entryNo: "INC-2026-004", date: "2026-03-08", category: "other_income", description: "理财收益", amount: 1200, currency: "CNY", counterparty: "招商银行", paymentMethod: "银行转账", relatedOrderNo: "", status: "confirmed", remark: "" },
];

const mockExpense: ExpenseRecord[] = [
  { id: 1, entryNo: "EXP-2026-001", date: "2026-03-01", category: "purchase", description: "采购订单 PO-2026-001 付款", amount: 11300, currency: "CNY", counterparty: "上海某材料有限公司", paymentMethod: "银行转账", relatedOrderNo: "PO-2026-001", status: "confirmed", remark: "" },
  { id: 2, entryNo: "EXP-2026-002", date: "2026-03-05", category: "salary", description: "2026年2月工资发放", amount: 85000, currency: "CNY", counterparty: "全体员工", paymentMethod: "银行转账", relatedOrderNo: "", status: "confirmed", remark: "" },
  { id: 3, entryNo: "EXP-2026-003", date: "2026-03-06", category: "rent", description: "3月厂房租金", amount: 30000, currency: "CNY", counterparty: "某工业园区", paymentMethod: "银行转账", relatedOrderNo: "", status: "confirmed", remark: "" },
  { id: 4, entryNo: "EXP-2026-004", date: "2026-03-07", category: "utilities", description: "2月水电费", amount: 4200, currency: "CNY", counterparty: "供电局", paymentMethod: "银行转账", relatedOrderNo: "", status: "confirmed", remark: "" },
  { id: 5, entryNo: "EXP-2026-005", date: "2026-03-08", category: "marketing", description: "展会参展费用", amount: 15000, currency: "CNY", counterparty: "某展览公司", paymentMethod: "银行转账", relatedOrderNo: "", status: "pending", remark: "" },
];

// ==================== 通用表单对话框 ====================

function EntryFormDialog<T extends { id: number; entryNo: string; date: string; description: string; amount: number; currency: string; counterparty: string; paymentMethod: string; relatedOrderNo: string; status: EntryStatus; remark: string }>({
  open, onClose, editing, form, setForm, onSave, categoryMap, categoryLabel,
}: {
  open: boolean; onClose: () => void; editing: T | null;
  form: Partial<T>; setForm: React.Dispatch<React.SetStateAction<Partial<T>>>;
  onSave: () => void; categoryMap: Record<string, string>; categoryLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "编辑记录" : "新增记录"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>日期 *</Label>
            <Input type="date" value={(form as any).date || ""} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{categoryLabel} *</Label>
            <Select value={(form as any).category || ""} onValueChange={v => setForm((f: any) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="选择类别" /></SelectTrigger>
              <SelectContent>{Object.entries(categoryMap).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>描述 *</Label>
            <Input value={(form as any).description || ""} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>金额 *</Label>
            <Input type="number" value={(form as any).amount || ""} onChange={e => setForm((f: any) => ({ ...f, amount: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label>币种</Label>
            <Select value={(form as any).currency || "CNY"} onValueChange={v => setForm((f: any) => ({ ...f, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["CNY", "USD", "EUR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>对方单位</Label>
            <Input value={(form as any).counterparty || ""} onChange={e => setForm((f: any) => ({ ...f, counterparty: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>支付方式</Label>
            <Select value={(form as any).paymentMethod || "银行转账"} onValueChange={v => setForm((f: any) => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>关联单号</Label>
            <Input value={(form as any).relatedOrderNo || ""} onChange={e => setForm((f: any) => ({ ...f, relatedOrderNo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>状态</Label>
            <Select value={(form as any).status || "pending"} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>备注</Label>
            <Textarea value={(form as any).remark || ""} onChange={e => setForm((f: any) => ({ ...f, remark: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={onSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 收入子组件 ====================

function IncomeTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [records, setRecords] = useState<IncomeRecord[]>(mockIncome);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRecord | null>(null);
  const [form, setForm] = useState<Partial<IncomeRecord>>({});

  const filtered = records.filter(r => {
    const matchSearch = !search || r.entryNo.includes(search) || r.description.includes(search) || r.counterparty.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalConfirmed = records.filter(r => r.status === "confirmed").reduce((s, r) => s + r.amount, 0);
  const totalPending = records.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0);

  const openAdd = () => { setEditing(null); setForm({ currency: "CNY", status: "pending", paymentMethod: "银行转账" }); setFormOpen(true); };
  const openEdit = (r: IncomeRecord) => { setEditing(r); setForm({ ...r }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.date || !form.description || !form.amount) { toast.error("请填写日期、描述和金额"); return; }
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } as IncomeRecord : r));
      toast.success("已更新");
    } else {
      const seq = String(records.length + 1).padStart(3, "0");
      setRecords(prev => [{ id: Date.now(), entryNo: `INC-2026-${seq}`, date: form.date!, category: form.category as IncomeCategory || "other_income", description: form.description!, amount: Number(form.amount), currency: form.currency || "CNY", counterparty: form.counterparty || "", paymentMethod: form.paymentMethod || "银行转账", relatedOrderNo: form.relatedOrderNo || "", status: form.status as EntryStatus || "pending", remark: form.remark || "" }, ...prev]);
      toast.success("已添加");
    }
    setFormOpen(false);
  };

  const handleDelete = (id: number) => { setRecords(prev => prev.filter(r => r.id !== id)); toast.success("已删除"); };
  const handleConfirm = (id: number) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "confirmed" as EntryStatus } : r)); toast.success("已确认"); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-green-600">¥{totalConfirmed.toLocaleString()}</div><div className="text-xs text-muted-foreground mt-0.5">已确认收入</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-yellow-600">¥{totalPending.toLocaleString()}</div><div className="text-xs text-muted-foreground mt-0.5">待确认收入</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-blue-600">{records.length}</div><div className="text-xs text-muted-foreground mt-0.5">收入笔数</div></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="搜索单号、描述、对方单位..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />新增收入</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>类别</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>对方单位</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.entryNo}</TableCell>
                  <TableCell className="text-sm">{r.date}</TableCell>
                  <TableCell className="text-sm">{incomeCategoryMap[r.category]}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{r.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.counterparty || "-"}</TableCell>
                  <TableCell className="text-sm">{r.paymentMethod}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">+¥{r.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusMap[r.status]?.color}`}>{statusMap[r.status]?.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                        {r.status === "pending" && <DropdownMenuItem className="text-green-600" onClick={() => handleConfirm(r.id)}><ArrowUpCircle className="h-4 w-4 mr-2" />确认</DropdownMenuItem>}
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
      <div className="flex justify-end text-sm text-muted-foreground pr-1">
        合计：<span className="font-medium text-green-600 ml-1">+¥{filtered.reduce((s, r) => s + r.amount, 0).toLocaleString()}</span>
      </div>

      <EntryFormDialog open={formOpen} onClose={() => setFormOpen(false)} editing={editing} form={form} setForm={setForm as any} onSave={handleSave} categoryMap={incomeCategoryMap} categoryLabel="收入类别" />
    </div>
  );
}

// ==================== 支出子组件 ====================

function ExpenseTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [records, setRecords] = useState<ExpenseRecord[]>(mockExpense);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [form, setForm] = useState<Partial<ExpenseRecord>>({});

  const filtered = records.filter(r => {
    const matchSearch = !search || r.entryNo.includes(search) || r.description.includes(search) || r.counterparty.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalConfirmed = records.filter(r => r.status === "confirmed").reduce((s, r) => s + r.amount, 0);
  const totalPending = records.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0);

  const openAdd = () => { setEditing(null); setForm({ currency: "CNY", status: "pending", paymentMethod: "银行转账" }); setFormOpen(true); };
  const openEdit = (r: ExpenseRecord) => { setEditing(r); setForm({ ...r }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.date || !form.description || !form.amount) { toast.error("请填写日期、描述和金额"); return; }
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } as ExpenseRecord : r));
      toast.success("已更新");
    } else {
      const seq = String(records.length + 1).padStart(3, "0");
      setRecords(prev => [{ id: Date.now(), entryNo: `OUT-2026-${seq}`, date: form.date!, category: form.category as ExpenseCategory || "other_expense", description: form.description!, amount: Number(form.amount), currency: form.currency || "CNY", counterparty: form.counterparty || "", paymentMethod: form.paymentMethod || "银行转账", relatedOrderNo: form.relatedOrderNo || "", status: form.status as EntryStatus || "pending", remark: form.remark || "" }, ...prev]);
      toast.success("已添加");
    }
    setFormOpen(false);
  };

  const handleDelete = (id: number) => { setRecords(prev => prev.filter(r => r.id !== id)); toast.success("已删除"); };
  const handleConfirm = (id: number) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "confirmed" as EntryStatus } : r)); toast.success("已确认"); };

  // 按类别汇总
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    records.filter(r => r.status === "confirmed").forEach(r => {
      map[r.category] = (map[r.category] || 0) + r.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [records]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-red-600">¥{totalConfirmed.toLocaleString()}</div><div className="text-xs text-muted-foreground mt-0.5">已确认支出</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-yellow-600">¥{totalPending.toLocaleString()}</div><div className="text-xs text-muted-foreground mt-0.5">待确认支出</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xl font-bold text-blue-600">{records.length}</div><div className="text-xs text-muted-foreground mt-0.5">支出笔数</div></CardContent></Card>
      </div>

      {/* 支出分类汇总 */}
      {categoryStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm font-medium text-muted-foreground">支出分类汇总（已确认）</CardTitle></CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {categoryStats.map(([cat, amt]) => {
                const pct = Math.round(amt / totalConfirmed * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm w-20 shrink-0">{expenseCategoryMap[cat as ExpenseCategory] || cat}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-red-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium w-24 text-right">¥{amt.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="搜索单号、描述、对方单位..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />新增支出</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>类别</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>对方单位</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.entryNo}</TableCell>
                  <TableCell className="text-sm">{r.date}</TableCell>
                  <TableCell className="text-sm">{expenseCategoryMap[r.category]}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{r.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.counterparty || "-"}</TableCell>
                  <TableCell className="text-sm">{r.paymentMethod}</TableCell>
                  <TableCell className="text-right font-medium text-red-600">-¥{r.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusMap[r.status]?.color}`}>{statusMap[r.status]?.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                        {r.status === "pending" && <DropdownMenuItem className="text-green-600" onClick={() => handleConfirm(r.id)}><ArrowDownCircle className="h-4 w-4 mr-2" />确认</DropdownMenuItem>}
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
      <div className="flex justify-end text-sm text-muted-foreground pr-1">
        合计：<span className="font-medium text-red-600 ml-1">-¥{filtered.reduce((s, r) => s + r.amount, 0).toLocaleString()}</span>
      </div>

      <EntryFormDialog open={formOpen} onClose={() => setFormOpen(false)} editing={editing} form={form} setForm={setForm as any} onSave={handleSave} categoryMap={expenseCategoryMap} categoryLabel="支出类别" />
    </div>
  );
}

// ==================== 主页面 ====================

export default function ExpenseManagementPage() {
  return (
    <ERPLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">费用管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">管理公司收入与支出记录，实时掌握资金流动情况</p>
          </div>
        </div>

        <Tabs defaultValue="income">
          <TabsList className="mb-4">
            <TabsTrigger value="income" className="gap-2">
              <TrendingUp className="h-4 w-4" />收入管理
            </TabsTrigger>
            <TabsTrigger value="expense" className="gap-2">
              <TrendingDown className="h-4 w-4" />支出管理
            </TabsTrigger>
          </TabsList>
          <TabsContent value="income"><IncomeTab /></TabsContent>
          <TabsContent value="expense"><ExpenseTab /></TabsContent>
        </Tabs>
      </div>
    </ERPLayout>
  );
}
