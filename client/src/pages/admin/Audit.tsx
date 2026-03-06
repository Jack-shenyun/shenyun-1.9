import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
  FileSearch,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface Audit {
  id: number;
  auditNo: string;
  title: string;
  auditType: string;
  auditor: string;
  auditTeam: string;
  department: string;
  scope: string;
  status: "planned" | "in_progress" | "completed" | "closed";
  date: string;
  endDate: string;
  standard: string;
  objectives: string;
  findings: number;
  majorNc: number;
  minorNc: number;
  observations: number;
  conclusion: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  planned: { label: "计划中", variant: "outline" as const },
  in_progress: { label: "审核中", variant: "default" as const },
  completed: { label: "已完成", variant: "secondary" as const },
  closed: { label: "已关闭", variant: "secondary" as const },
};



const auditTypeOptions = ["定期审核", "专项审核", "跟踪审核", "管理评审"];
const departmentOptions = ["全部门", "生产部", "质量部", "研发部", "采购部", "仓库管理"];

export default function AuditPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.audits.list.useQuery();
  const createMutation = trpc.audits.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.audits.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.audits.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const audits = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [viewingAudit, setViewingAudit] = useState<Audit | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    auditNo: "",
    title: "",
    auditType: "",
    auditor: "",
    auditTeam: "",
    department: "",
    scope: "",
    status: "planned",
    date: "",
    endDate: "",
    standard: "ISO 13485:2016",
    objectives: "",
    findings: 0,
    majorNc: 0,
    minorNc: 0,
    observations: 0,
    conclusion: "",
    remarks: "",
  });

  const filteredAudits = audits.filter((a: any) => {
    const matchesSearch =
      String(a.title ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(a.auditNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(a.auditor ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingAudit(null);
    const year = new Date().getFullYear();
    const nextNo = audits.filter(a => a.auditNo.includes(String(year))).length + 1;
    setFormData({
      auditNo: `IA-${year}-${String(nextNo).padStart(3, "0")}`,
      title: "",
      auditType: "",
      auditor: "",
      auditTeam: "",
      department: "",
      scope: "",
      status: "planned",
      date: "",
      endDate: "",
      standard: "ISO 13485:2016",
      objectives: "",
      findings: 0,
      majorNc: 0,
      minorNc: 0,
      observations: 0,
      conclusion: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (audit: Audit) => {
    setEditingAudit(audit);
    setFormData({
      auditNo: audit.auditNo,
      title: audit.title,
      auditType: audit.auditType,
      auditor: audit.auditor,
      auditTeam: audit.auditTeam,
      department: audit.department,
      scope: audit.scope,
      status: audit.status,
      date: audit.date,
      endDate: audit.endDate,
      standard: audit.standard,
      objectives: audit.objectives,
      findings: audit.findings,
      majorNc: audit.majorNc,
      minorNc: audit.minorNc,
      observations: audit.observations,
      conclusion: audit.conclusion,
      remarks: audit.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (audit: Audit) => {
    setViewingAudit(audit);
    setViewDialogOpen(true);
  };

  const handleDelete = (audit: Audit) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除内审记录" });
      return;
    }
    deleteMutation.mutate({ id: audit.id });
    toast.success("内审记录已删除");
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.auditType || !formData.date) {
      toast.error("请填写必填项", { description: "审核主题、类型、日期为必填" });
      return;
    }

    if (editingAudit) {
      toast.success("内审信息已更新");
    } else {
      const newAudit: Audit = {
        id: Math.max(...audits.map((a: any) => a.id)) + 1,
        ...formData,
        status: formData.status as Audit["status"],
      };
      toast.success("内审计划创建成功");
    }
    setDialogOpen(false);
  };

  const completedCount = audits.filter((a: any) => a.status === "completed" || a.status === "closed").length;
  const inProgressCount = audits.filter((a: any) => a.status === "in_progress").length;
  const totalNc = audits.reduce((sum: any, a: any) => sum + a.majorNc + a.minorNc, 0);

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
              <FileSearch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">内审管理</h2>
              <p className="text-sm text-muted-foreground">管理内部质量管理体系审核的全过程</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建内审
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">年度内审计划</p>
              <p className="text-2xl font-bold">{audits.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">进行中</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">不符合项</p>
              <p className="text-2xl font-bold text-amber-600">{totalNc}</p>
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
                  placeholder="搜索审核编号、主题、审核员..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="planned">计划中</SelectItem>
                  <SelectItem value="in_progress">审核中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="closed">已关闭</SelectItem>
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
                  <TableHead className="w-[120px] text-center font-bold">审核编号</TableHead>
                  <TableHead className="text-center font-bold">审核主题</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">审核类型</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">审核员</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">受审部门</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">审核日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit: any) => (
                  <TableRow key={audit.id}>
                    <TableCell className="text-center font-medium">{audit.auditNo}</TableCell>
                    <TableCell className="text-center">{audit.title}</TableCell>
                    <TableCell className="text-center">{audit.auditType}</TableCell>
                    <TableCell className="text-center">{audit.auditor}</TableCell>
                    <TableCell className="text-center">{audit.department}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[audit.status]?.variant || "outline"} className={getStatusSemanticClass(audit.status, statusMap[audit.status]?.label)}>
                        {statusMap[audit.status]?.label || String(audit.status ?? "-")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(audit.date)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(audit)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(audit)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(audit)}
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
              <DialogTitle>{editingAudit ? "编辑内审信息" : "新建内审计划"}</DialogTitle>
              <DialogDescription>
                {editingAudit ? "修改内审计划信息" : "创建新的内审计划"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>审核编号</Label>
                  <Input value={formData.auditNo} disabled />
                </div>
                <div className="space-y-2">
                  <Label>审核主题 *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入审核主题"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>审核类型 *</Label>
                  <Select
                    value={formData.auditType}
                    onValueChange={(value) => setFormData({ ...formData, auditType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {auditTypeOptions.map((type: any) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>受审部门</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((dept: any) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">计划中</SelectItem>
                      <SelectItem value="in_progress">审核中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="closed">已关闭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>主审核员</Label>
                  <Input
                    value={formData.auditor}
                    onChange={(e) => setFormData({ ...formData, auditor: e.target.value })}
                    placeholder="主审核员姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>审核组成员</Label>
                  <Input
                    value={formData.auditTeam}
                    onChange={(e) => setFormData({ ...formData, auditTeam: e.target.value })}
                    placeholder="审核组成员"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期 *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>审核依据</Label>
                  <Input
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                    placeholder="如：ISO 13485:2016"
                  />
                </div>
                <div className="space-y-2">
                  <Label>审核范围</Label>
                  <Input
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    placeholder="审核范围"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>审核目的</Label>
                <Textarea
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="审核目的和预期目标"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>发现项总数</Label>
                  <Input
                    type="number"
                    value={formData.findings}
                    onChange={(e) => setFormData({ ...formData, findings: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>严重不符合</Label>
                  <Input
                    type="number"
                    value={formData.majorNc}
                    onChange={(e) => setFormData({ ...formData, majorNc: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>一般不符合</Label>
                  <Input
                    type="number"
                    value={formData.minorNc}
                    onChange={(e) => setFormData({ ...formData, minorNc: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>观察项</Label>
                  <Input
                    type="number"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>审核结论</Label>
                <Textarea
                  value={formData.conclusion}
                  onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                  placeholder="审核结论"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="其他备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingAudit ? "保存修改" : "创建内审"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
{viewingAudit && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent>
      {/* 标准头部 */}
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">内审详情</h2>
        <p className="text-sm text-muted-foreground">
          {viewingAudit.auditNo}
          {viewingAudit.status && (
            <> · <Badge variant={statusMap[viewingAudit.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingAudit.status, statusMap[viewingAudit.status]?.label)}`}>
              {statusMap[viewingAudit.status]?.label || String(viewingAudit.status ?? "-")}
            </Badge></>
          )}
        </p>
      </div>

      <div className="py-4 space-y-6">
        {/* 基本信息分区 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="审核主题">{viewingAudit.title}</FieldRow>
              <FieldRow label="审核类型">{viewingAudit.auditType}</FieldRow>
              <FieldRow label="受审部门">{viewingAudit.department}</FieldRow>
              <FieldRow label="审核依据">{viewingAudit.standard}</FieldRow>
            </div>
            <div>
              <FieldRow label="主审核员">{viewingAudit.auditor}</FieldRow>
              <FieldRow label="审核组成员">{viewingAudit.auditTeam}</FieldRow>
              <FieldRow label="开始日期">{formatDateValue(viewingAudit.date)}</FieldRow>
              <FieldRow label="结束日期">{formatDateValue(viewingAudit.endDate)}</FieldRow>
            </div>
          </div>
        </div>

        {/* 审核范围与目的 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">审核范围与目的</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">审核范围</p>
              <p className="text-sm">{viewingAudit.scope || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">审核目的</p>
              <p className="text-sm">{viewingAudit.objectives || "-"}</p>
            </div>
          </div>
        </div>

        {/* 发现项统计 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">发现项统计</h3>
          <div className="p-4 bg-muted/40 rounded-lg">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{viewingAudit.findings}</p>
                <p className="text-xs text-muted-foreground">发现项总数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{viewingAudit.majorNc}</p>
                <p className="text-xs text-muted-foreground">严重不符合</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{viewingAudit.minorNc}</p>
                <p className="text-xs text-muted-foreground">一般不符合</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{viewingAudit.observations}</p>
                <p className="text-xs text-muted-foreground">观察项</p>
              </div>
            </div>
          </div>
        </div>

        {/* 审核结论 */}
        {viewingAudit.conclusion && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">审核结论</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingAudit.conclusion}</p>
          </div>
        )}

        {/* 备注 */}
        {viewingAudit.remarks && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingAudit.remarks}</p>
          </div>
        )}
      </div>

      {/* 标准操作按钮 */}
      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap"></div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          <Button variant="outline" size="sm" onClick={() => {
            setViewDialogOpen(false);
            if (viewingAudit) handleEdit(viewingAudit);
          }}>编辑</Button>
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
