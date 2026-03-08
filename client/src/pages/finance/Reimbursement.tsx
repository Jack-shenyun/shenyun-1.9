import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Receipt, MoreHorizontal, Eye, CheckCircle, XCircle,
  Search, Wallet, Clock, AlertCircle, DollarSign,
} from "lucide-react";

// ==================== 类型定义 ====================

type ReimbursementStatus = "pending_approval" | "approved" | "rejected" | "paid" | "cancelled";
type ReimbursementCategory = "travel" | "office" | "entertainment" | "transport" | "communication" | "other";

interface ReimbursementRecord {
  id: number;
  reimbursementNo: string;
  department: string;
  applicantName: string;
  applyDate: string;
  category: ReimbursementCategory;
  description: string;
  totalAmount: number;
  currency: string;
  status: ReimbursementStatus;
  approvedBy: string;
  approvedDate: string;
  paidDate: string;
  paymentMethod: string;
  remark: string;
  items: ReimbursementItem[];
}

interface ReimbursementItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
}

// ==================== 常量 ====================

const statusMap: Record<ReimbursementStatus, { label: string; color: string }> = {
  pending_approval: { label: "待审批", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  approved:         { label: "已通过", color: "bg-blue-100 text-blue-700 border-blue-300" },
  rejected:         { label: "已驳回", color: "bg-red-100 text-red-600 border-red-300" },
  paid:             { label: "已支付", color: "bg-green-100 text-green-700 border-green-300" },
  cancelled:        { label: "已取消", color: "bg-gray-100 text-gray-500 border-gray-300" },
};

const categoryMap: Record<ReimbursementCategory, string> = {
  travel:        "差旅费",
  office:        "办公费",
  entertainment: "招待费",
  transport:     "交通费",
  communication: "通讯费",
  other:         "其他",
};

const departments = ["管理部", "招商部", "销售部", "研发部", "生产部", "质量部", "采购部", "仓库", "财务部"];

// ==================== 模拟数据 ====================

const mockData: ReimbursementRecord[] = [
  { id: 1, reimbursementNo: "EXP-2026-001", department: "销售部", applicantName: "张三", applyDate: "2026-03-01", category: "travel", description: "出差北京客户拜访", totalAmount: 3200, currency: "CNY", status: "pending_approval", approvedBy: "", approvedDate: "", paidDate: "", paymentMethod: "", remark: "", items: [{ id: 1, date: "2026-02-28", description: "高铁票（往返）", amount: 800, category: "交通费" }, { id: 2, date: "2026-02-28", description: "酒店住宿2晚", amount: 1200, category: "住宿费" }, { id: 3, date: "2026-03-01", description: "餐饮", amount: 1200, category: "餐饮费" }] },
  { id: 2, reimbursementNo: "EXP-2026-002", department: "研发部", applicantName: "李四", applyDate: "2026-03-02", category: "office", description: "购买办公耗材", totalAmount: 560, currency: "CNY", status: "approved", approvedBy: "王总", approvedDate: "2026-03-03", paidDate: "", paymentMethod: "银行转账", remark: "", items: [{ id: 1, date: "2026-03-02", description: "打印纸5箱", amount: 350, category: "办公耗材" }, { id: 2, date: "2026-03-02", description: "墨盒2个", amount: 210, category: "办公耗材" }] },
  { id: 3, reimbursementNo: "EXP-2026-003", department: "采购部", applicantName: "王五", applyDate: "2026-03-03", category: "entertainment", description: "供应商接待餐饮", totalAmount: 1800, currency: "CNY", status: "paid", approvedBy: "张总", approvedDate: "2026-03-04", paidDate: "2026-03-05", paymentMethod: "银行转账", remark: "", items: [{ id: 1, date: "2026-03-03", description: "接待餐饮", amount: 1800, category: "餐饮费" }] },
  { id: 4, reimbursementNo: "EXP-2026-004", department: "质量部", applicantName: "赵六", applyDate: "2026-03-04", category: "travel", description: "客户现场审核差旅", totalAmount: 2100, currency: "CNY", status: "rejected", approvedBy: "李总", approvedDate: "2026-03-05", paidDate: "", paymentMethod: "", remark: "金额超标，请重新提交", items: [] },
  { id: 5, reimbursementNo: "EXP-2026-005", department: "生产部", applicantName: "孙七", applyDate: "2026-03-06", category: "other", description: "设备维修配件采购", totalAmount: 4500, currency: "CNY", status: "pending_approval", approvedBy: "", approvedDate: "", paidDate: "", paymentMethod: "", remark: "", items: [] },
];

// ==================== 主组件 ====================

export default function ReimbursementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [records, setRecords] = useState<ReimbursementRecord[]>(mockData);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<ReimbursementRecord | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payId, setPayId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState("银行转账");

  const filtered = records.filter(r => {
    const matchSearch = !search || r.reimbursementNo.includes(search) || r.applicantName.includes(search) || r.department.includes(search);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchDept = deptFilter === "all" || r.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const stats = {
    pending: records.filter(r => r.status === "pending_approval").length,
    approved: records.filter(r => r.status === "approved").length,
    paid: records.filter(r => r.status === "paid").length,
    totalPending: records.filter(r => r.status === "pending_approval" || r.status === "approved").reduce((s, r) => s + r.totalAmount, 0),
  };

  const handleApprove = (id: number) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "approved" as ReimbursementStatus, approvedBy: "财务部", approvedDate: new Date().toISOString().split("T")[0] } : r));
    toast.success("已审批通过");
  };

  const handleReject = () => {
    if (!rejectId) return;
    setRecords(prev => prev.map(r => r.id === rejectId ? { ...r, status: "rejected" as ReimbursementStatus, remark: rejectReason, approvedBy: "财务部", approvedDate: new Date().toISOString().split("T")[0] } : r));
    toast.success("已驳回");
    setRejectOpen(false);
    setRejectReason("");
    setRejectId(null);
  };

  const handlePay = () => {
    if (!payId) return;
    setRecords(prev => prev.map(r => r.id === payId ? { ...r, status: "paid" as ReimbursementStatus, paidDate: new Date().toISOString().split("T")[0], paymentMethod: payMethod } : r));
    toast.success("已标记为已支付");
    setPayOpen(false);
    setPayId(null);
  };

  return (
    <ERPLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">报销管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">汇总全部门报销申请，财务统一审批与支付处理</p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "待审批", value: stats.pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "待支付", value: stats.approved, icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "已支付", value: stats.paid, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "待处理金额", value: `¥${stats.totalPending.toLocaleString()}`, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="搜索单号、申请人、部门..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="全部部门" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* 表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>报销单号</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>申请人</TableHead>
                  <TableHead>申请日期</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>事由</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>支付日期</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reimbursementNo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.department}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.applicantName}</TableCell>
                    <TableCell className="text-sm">{r.applyDate}</TableCell>
                    <TableCell className="text-sm">{categoryMap[r.category]}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">{r.description}</TableCell>
                    <TableCell className="text-right font-medium">¥{r.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusMap[r.status]?.color}`}>
                        {statusMap[r.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.paidDate || "-"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                          {r.status === "pending_approval" && (
                            <>
                              <DropdownMenuItem className="text-green-600" onClick={() => handleApprove(r.id)}><CheckCircle className="h-4 w-4 mr-2" />审批通过</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => { setRejectId(r.id); setRejectOpen(true); }}><XCircle className="h-4 w-4 mr-2" />驳回</DropdownMenuItem>
                            </>
                          )}
                          {r.status === "approved" && (
                            <DropdownMenuItem className="text-blue-600" onClick={() => { setPayId(r.id); setPayOpen(true); }}><Wallet className="h-4 w-4 mr-2" />标记已支付</DropdownMenuItem>
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

        <div className="flex justify-between items-center mt-3 text-sm text-muted-foreground px-1">
          <span>共 {filtered.length} 条记录</span>
          <span>筛选金额合计：<span className="font-medium text-foreground">¥{filtered.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}</span></span>
        </div>

        {/* 查看详情对话框 */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>报销单详情</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["报销单号", viewing.reimbursementNo], ["部门", viewing.department],
                    ["申请人", viewing.applicantName], ["申请日期", viewing.applyDate],
                    ["报销类型", categoryMap[viewing.category]], ["状态", statusMap[viewing.status]?.label],
                    ["审批人", viewing.approvedBy || "-"], ["审批日期", viewing.approvedDate || "-"],
                    ["支付方式", viewing.paymentMethod || "-"], ["支付日期", viewing.paidDate || "-"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">{k}：</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                  <div className="col-span-2 flex gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">事由：</span>
                    <span className="font-medium">{viewing.description}</span>
                  </div>
                  {viewing.remark && (
                    <div className="col-span-2 flex gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">备注：</span>
                      <span className="text-red-600">{viewing.remark}</span>
                    </div>
                  )}
                </div>

                {viewing.items.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">费用明细</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日期</TableHead>
                          <TableHead>说明</TableHead>
                          <TableHead>类别</TableHead>
                          <TableHead className="text-right">金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewing.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{item.date}</TableCell>
                            <TableCell className="text-sm">{item.description}</TableCell>
                            <TableCell className="text-sm">{item.category}</TableCell>
                            <TableCell className="text-right font-medium">¥{item.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">合计</TableCell>
                          <TableCell className="text-right font-bold text-primary">¥{viewing.totalAmount.toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {viewing?.status === "pending_approval" && (
                <>
                  <Button variant="outline" className="text-red-600 border-red-300" onClick={() => { setRejectId(viewing.id); setViewOpen(false); setRejectOpen(true); }}>
                    <XCircle className="h-4 w-4 mr-1" />驳回
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => { handleApprove(viewing.id); setViewOpen(false); }}>
                    <CheckCircle className="h-4 w-4 mr-1" />审批通过
                  </Button>
                </>
              )}
              {viewing?.status === "approved" && (
                <Button onClick={() => { setPayId(viewing.id); setViewOpen(false); setPayOpen(true); }}>
                  <Wallet className="h-4 w-4 mr-1" />标记已支付
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 驳回对话框 */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>驳回报销申请</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>驳回原因</Label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请填写驳回原因..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
              <Button variant="destructive" onClick={handleReject}>确认驳回</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 支付对话框 */}
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>标记已支付</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>支付方式</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["银行转账", "现金", "支付宝", "微信支付"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayOpen(false)}>取消</Button>
              <Button onClick={handlePay}>确认支付</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  );
}
