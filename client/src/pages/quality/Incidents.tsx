import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useEffect, useState } from "react";
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
  AlertOctagon,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface IncidentRecord {
  id: number;
  incidentNo: string;
  productName: string;
  productCode: string;
  batchNo: string;
  incidentType: string;
  severity: "low" | "medium" | "high";
  reportDate: string;
  reportedBy: string;
  description: string;
  affectedQuantity: string;
  location: string;
  investigator: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  resolveDate: string;
  status: "draft" | "reported" | "investigating" | "resolved" | "closed";
  remarks: string;
}

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" as const },
  reported: { label: "已上报", variant: "outline" as const },
  investigating: { label: "调查中", variant: "default" as const },
  resolved: { label: "已解决", variant: "secondary" as const },
  closed: { label: "已关闭", variant: "secondary" as const },
};

const severityMap: Record<string, any> = {
  low: { label: "轻微", color: "bg-green-100 text-green-800" },
  medium: { label: "一般", color: "bg-amber-100 text-amber-800" },
  high: { label: "严重", color: "bg-red-100 text-red-800" },
};

const incidentTypes = ["产品缺陷", "包装破损", "标签错误", "功能异常", "过敏反应", "使用不当", "其他"];



export default function IncidentsPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.qualityIncidents.list.useQuery();
  const createMutation = trpc.qualityIncidents.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.qualityIncidents.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.qualityIncidents.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const incidents = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentRecord | null>(null);
  const [viewingIncident, setViewingIncident] = useState<IncidentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<IncidentRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    incidentNo: "",
    productName: "",
    productCode: "",
    batchNo: "",
    incidentType: "",
    severity: "low",
    reportDate: "",
    reportedBy: "",
    description: "",
    affectedQuantity: "",
    location: "",
    investigator: "",
    rootCause: "",
    correctiveAction: "",
    preventiveAction: "",
    resolveDate: "",
    status: "reported",
    remarks: "",
  });

  const filteredIncidents = incidents.filter((i: any) => {
    const matchesSearch =
      String(i.incidentNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(i.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(i.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, incidents.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setEditingIncident(null);
    const today = new Date();
    setFormData({
      incidentNo: "",
      productName: "",
      productCode: "",
      batchNo: "",
      incidentType: "",
      severity: "low",
      reportDate: today.toISOString().split("T")[0],
      reportedBy: "",
      description: "",
      affectedQuantity: "",
      location: "",
      investigator: "",
      rootCause: "",
      correctiveAction: "",
      preventiveAction: "",
      resolveDate: "",
      status: "reported",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (incident: IncidentRecord) => {
    setEditingIncident(incident);
    setFormData({
      incidentNo: incident.incidentNo,
      productName: incident.productName,
      productCode: incident.productCode,
      batchNo: incident.batchNo,
      incidentType: incident.incidentType,
      severity: incident.severity,
      reportDate: incident.reportDate,
      reportedBy: incident.reportedBy,
      description: incident.description,
      affectedQuantity: incident.affectedQuantity,
      location: incident.location,
      investigator: incident.investigator,
      rootCause: incident.rootCause,
      correctiveAction: incident.correctiveAction,
      preventiveAction: incident.preventiveAction,
      resolveDate: incident.resolveDate,
      status: incident.status,
      remarks: incident.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (incident: IncidentRecord) => {
    setViewingIncident(incident);
    setViewDialogOpen(true);
  };

  const handleDelete = (incident: IncidentRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除不良事件记录" });
      return;
    }
    setIncidentToDelete(incident);
    setDeleteDialogOpen(true);
  };

  const handleStartInvestigation = (incident: IncidentRecord) => {
    toast.success("已开始调查");
  };

  const handleCloseIncident = (incident: IncidentRecord) => {
    toast.success("事件已关闭");
  };

  const handleSubmit = () => {
    if (!formData.productName || !formData.description) {
      toast.error("请填写必填项", { description: "产品名称、事件描述为必填" });
      return;
    }

    if (editingIncident) {
      updateMutation.mutate({
        id: editingIncident.id,
        data: {
          productName: formData.productName,
          productCode: formData.productCode || undefined,
          batchNo: formData.batchNo || undefined,
          incidentType: formData.incidentType || undefined,
          severity: formData.severity as any,
          reportDate: formData.reportDate || undefined,
          reportedBy: formData.reportedBy || undefined,
          description: formData.description,
          affectedQuantity: formData.affectedQuantity || undefined,
          location: formData.location || undefined,
          investigator: formData.investigator || undefined,
          rootCause: formData.rootCause || undefined,
          correctiveAction: formData.correctiveAction || undefined,
          preventiveAction: formData.preventiveAction || undefined,
          resolveDate: formData.resolveDate || undefined,
          status: formData.status as any,
          remarks: formData.remarks || undefined,
        },
      });
    } else {
      createMutation.mutate({
        incidentNo: formData.incidentNo || undefined,
        productName: formData.productName,
        productCode: formData.productCode || undefined,
        batchNo: formData.batchNo || undefined,
        incidentType: formData.incidentType || undefined,
        severity: formData.severity as any,
        reportDate: formData.reportDate || undefined,
        reportedBy: formData.reportedBy || undefined,
        description: formData.description,
        affectedQuantity: formData.affectedQuantity || undefined,
        location: formData.location || undefined,
        investigator: formData.investigator || undefined,
        rootCause: formData.rootCause || undefined,
        correctiveAction: formData.correctiveAction || undefined,
        preventiveAction: formData.preventiveAction || undefined,
        resolveDate: formData.resolveDate || undefined,
        status: formData.status as any,
        remarks: formData.remarks || undefined,
      });
    }
    setDialogOpen(false);
  };

  const nonDraftIncidents = incidents.filter((i: any) => i.status !== "draft");
  const closedCount = nonDraftIncidents.filter((i: any) => i.status === "closed").length;
  const processingCount = nonDraftIncidents.filter((i: any) => i.status === "reported" || i.status === "investigating").length;
  const severeCount = nonDraftIncidents.filter((i: any) => i.severity === "high").length;

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
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertOctagon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">不良事件</h2>
              <p className="text-sm text-muted-foreground">建立产品不良事件的上报、调查和处理流程</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              刷新
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              上报事件
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本年事件</p>
              <p className="text-2xl font-bold">{nonDraftIncidents.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已关闭</p>
              <p className="text-2xl font-bold text-green-600">{closedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">处理中</p>
              <p className="text-2xl font-bold text-amber-600">{processingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">严重事件</p>
              <p className="text-2xl font-bold text-red-600">{severeCount}</p>
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
                  placeholder="搜索事件编号、产品名称、批次号..."
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
                  <SelectItem value="reported">已上报</SelectItem>
                  <SelectItem value="investigating">调查中</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="closed">已关闭</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
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
                  <TableHead className="w-[110px] text-center font-bold">事件编号</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">批次号</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">事件类型</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">严重程度</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">上报日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIncidents.map((incident: any) => (
                  <TableRow key={incident.id}>
                    <TableCell className="text-center font-medium">{incident.incidentNo}</TableCell>
                    <TableCell className="text-center">{incident.productName}</TableCell>
                    <TableCell className="text-center">{incident.batchNo}</TableCell>
                    <TableCell className="text-center">{incident.incidentType}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${severityMap[incident.severity].color}`}>
                        {severityMap[incident.severity].label}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(incident.reportDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[incident.status]?.variant || "outline"} className={getStatusSemanticClass(incident.status, statusMap[incident.status]?.label)}>
                        {statusMap[incident.status]?.label || String(incident.status ?? "-")}
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
                          <DropdownMenuItem onClick={() => handleView(incident)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(incident)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {incident.status === "reported" && (
                            <DropdownMenuItem onClick={() => handleStartInvestigation(incident)}>
                              <FileText className="h-4 w-4 mr-2" />
                              开始调查
                            </DropdownMenuItem>
                          )}
                          {incident.status === "resolved" && (
                            <DropdownMenuItem onClick={() => handleCloseIncident(incident)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              关闭事件
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(incident)}
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
                {paginatedIncidents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {isLoading ? "加载中..." : "暂无数据"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredIncidents.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredIncidents.length)} 条，
              共 {filteredIncidents.length} 条，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                上一页
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIncident ? "编辑不良事件" : "上报不良事件"}</DialogTitle>
              <DialogDescription>
                {editingIncident ? "修改不良事件信息" : "填写不良事件详细信息"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>事件编号 *</Label>
                  <Input
                    value={formData.incidentNo}
                    onChange={(e) => setFormData({ ...formData, incidentNo: e.target.value })}
                    placeholder="保存后系统生成"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label>上报日期</Label>
                  <Input
                    type="date"
                    value={formData.reportDate}
                    onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>上报人</Label>
                  <Input
                    value={formData.reportedBy}
                    onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                    placeholder="上报人"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品名称 *</Label>
                  <Input
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="产品名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>产品编码</Label>
                  <Input
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    placeholder="产品编码"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>批次号</Label>
                  <Input
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    placeholder="批次号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>事件类型</Label>
                  <Select
                    value={formData.incidentType}
                    onValueChange={(value) => setFormData({ ...formData, incidentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((t: any) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>严重程度</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">轻微</SelectItem>
                      <SelectItem value="medium">一般</SelectItem>
                      <SelectItem value="high">严重</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>涉及数量</Label>
                  <Input
                    value={formData.affectedQuantity}
                    onChange={(e) => setFormData({ ...formData, affectedQuantity: e.target.value })}
                    placeholder="如：10支"
                  />
                </div>
                <div className="space-y-2">
                  <Label>发生地点</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="发生地点"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>事件描述 *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="详细描述事件情况"
                  rows={3}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">调查与处理</h4>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>调查人</Label>
                      <Input
                        value={formData.investigator}
                        onChange={(e) => setFormData({ ...formData, investigator: e.target.value })}
                        placeholder="调查负责人"
                      />
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
                          <SelectItem value="reported">已上报</SelectItem>
                          <SelectItem value="investigating">调查中</SelectItem>
                          <SelectItem value="resolved">已解决</SelectItem>
                          <SelectItem value="closed">已关闭</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>根本原因</Label>
                    <Textarea
                      value={formData.rootCause}
                      onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                      placeholder="分析根本原因"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>纠正措施</Label>
                    <Textarea
                      value={formData.correctiveAction}
                      onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
                      placeholder="采取的纠正措施"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>预防措施</Label>
                    <Textarea
                      value={formData.preventiveAction}
                      onChange={(e) => setFormData({ ...formData, preventiveAction: e.target.value })}
                      placeholder="预防再次发生的措施"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>解决日期</Label>
                      <Input
                        type="date"
                        value={formData.resolveDate}
                        onChange={(e) => setFormData({ ...formData, resolveDate: e.target.value })}
                      />
                    </div>
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button variant="ghost" onClick={() => {
                if (!formData.productName) { toast.error("请填写产品名称"); return; }
                const submitData = {
                  productName: formData.productName,
                  productCode: formData.productCode || undefined,
                  batchNo: formData.batchNo || undefined,
                  incidentType: formData.incidentType || undefined,
                  severity: formData.severity as any,
                  reportDate: formData.reportDate || undefined,
                  reportedBy: formData.reportedBy || undefined,
                  description: formData.description,
                  affectedQuantity: formData.affectedQuantity || undefined,
                  location: formData.location || undefined,
                  investigator: formData.investigator || undefined,
                  rootCause: formData.rootCause || undefined,
                  correctiveAction: formData.correctiveAction || undefined,
                  preventiveAction: formData.preventiveAction || undefined,
                  resolveDate: formData.resolveDate || undefined,
                  status: "draft" as any,
                  remarks: formData.remarks || undefined,
                };
                if (editingIncident) {
                  updateMutation.mutate({ id: editingIncident.id, data: submitData }, { onSuccess: () => setDialogOpen(false) });
                } else {
                  createMutation.mutate({ ...submitData, incidentNo: formData.incidentNo || undefined, title: formData.productName, type: "nonconformance" as any }, { onSuccess: () => setDialogOpen(false) });
                }
              }}>
                保存草稿
              </Button>
              <Button onClick={handleSubmit}>
                {editingIncident ? "保存修改" : "上报事件"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
{viewingIncident && (
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    <div className="border-b pb-3">
      <h2 className="text-lg font-semibold">不良事件详情</h2>
      <p className="text-sm text-muted-foreground">
        {viewingIncident.incidentNo}
        {viewingIncident.status && (
          <> · <Badge variant={statusMap[viewingIncident.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingIncident.status, statusMap[viewingIncident.status]?.label)}`}>
            {statusMap[viewingIncident.status]?.label || String(viewingIncident.status ?? "-")}
          </Badge></>
        )}
      </p>
    </div>
              <div className="space-y-4 py-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <FieldRow label="产品名称">{viewingIncident.productName}</FieldRow>
            <FieldRow label="产品编码">{viewingIncident.productCode}</FieldRow>
            <FieldRow label="批次号">{viewingIncident.batchNo}</FieldRow>
            <FieldRow label="事件类型">{viewingIncident.incidentType}</FieldRow>
            <FieldRow label="严重程度">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityMap[viewingIncident.severity]?.color}`}>
                {severityMap[viewingIncident.severity]?.label}
              </span>
            </FieldRow>
          </div>
          <div>
            <FieldRow label="上报日期">{formatDateValue(viewingIncident.reportDate)}</FieldRow>
            <FieldRow label="上报人">{viewingIncident.reportedBy || "-"}</FieldRow>
            <FieldRow label="涉及数量">{viewingIncident.affectedQuantity || "-"}</FieldRow>
            <FieldRow label="发生地点">{viewingIncident.location || "-"}</FieldRow>
          </div>
        </div>
      </div>

      {viewingIncident.description && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">事件描述</h3>
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingIncident.description}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">调查与处理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <FieldRow label="调查人">{viewingIncident.investigator || "-"}</FieldRow>
          </div>
          <div>
            <FieldRow label="解决日期">{formatDateValue(viewingIncident.resolveDate)}</FieldRow>
          </div>
        </div>
        {viewingIncident.rootCause && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">根本原因</h4>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingIncident.rootCause}</p>
          </div>
        )}
        {viewingIncident.correctiveAction && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">纠正措施</h4>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingIncident.correctiveAction}</p>
          </div>
        )}
        {viewingIncident.preventiveAction && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">预防措施</h4>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingIncident.preventiveAction}</p>
          </div>
        )}
      </div>

      {viewingIncident.remarks && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingIncident.remarks}</p>
        </div>
      )}
    </div>

    <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
      <div className="flex gap-2 flex-wrap"></div>
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        <Button variant="outline" size="sm" onClick={() => {
          setViewDialogOpen(false);
          handleEdit(viewingIncident);
        }}>编辑</Button>
      </div>
    </div>
  </DraggableDialogContent>
</DraggableDialog>
)}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确认删除不良事件 {incidentToDelete?.incidentNo || ""} 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIncidentToDelete(null)}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (incidentToDelete) {
                    deleteMutation.mutate({ id: incidentToDelete.id });
                    toast.success("不良事件记录已删除");
                  }
                  setDeleteDialogOpen(false);
                  setIncidentToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ERPLayout>
  );
}
