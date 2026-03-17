import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useMemo, useState } from "react";
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
  GraduationCap,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface Training {
  id: number;
  trainingNo: string;
  title: string;
  type: string;
  typeLabel: string;
  category: string;
  trainer: string;
  trainerDept: string;
  participants: number;
  duration: string;
  location: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  date: string;
  endDate: string;
  objectives: string;
  content: string;
  materials: string;
  assessment: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  planned: { label: "计划中", variant: "outline" as const },
  in_progress: { label: "进行中", variant: "default" as const },
  completed: { label: "已完成", variant: "secondary" as const },
  cancelled: { label: "已取消", variant: "destructive" as const },
};

const typeOptions = [
  { label: "入职培训", value: "onboarding" },
  { label: "技能培训", value: "skill" },
  { label: "法规培训", value: "compliance" },
  { label: "安全培训", value: "safety" },
  { label: "其他培训", value: "other" },
];
const typeLabelMap: Record<string, string> = Object.fromEntries(
  typeOptions.map((item) => [item.value, item.label])
);
const categoryOptions = ["法规培训", "技能培训", "安全培训", "质量培训", "管理培训"];

function toDateInputValue(value: unknown) {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") ? text.slice(0, 10) : text.slice(0, 10);
}

function buildTrainingRemark(formData: {
  category: string;
  trainer: string;
  trainerDept: string;
  duration: string;
  objectives: string;
  materials: string;
  assessment: string;
  remarks: string;
}) {
  const detailLines = [
    formData.category ? `培训类别：${formData.category}` : "",
    formData.trainer ? `培训讲师：${formData.trainer}` : "",
    formData.trainerDept ? `讲师部门：${formData.trainerDept}` : "",
    formData.duration ? `培训时长：${formData.duration}` : "",
    formData.objectives ? `培训目标：${formData.objectives}` : "",
    formData.materials ? `培训材料：${formData.materials}` : "",
    formData.assessment ? `考核方式：${formData.assessment}` : "",
    formData.remarks ? `备注：${formData.remarks}` : "",
  ].filter(Boolean);
  return detailLines.join("\n");
}

export default function TrainingPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.trainings.list.useQuery();
  const createMutation = trpc.trainings.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.trainings.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.trainings.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const { data: personnelData = [] } = trpc.personnel.list.useQuery({ limit: 5000, offset: 0 });
  const { data: departmentsData = [] } = trpc.departments.list.useQuery({ status: "active" });
  const personnelNameMap = useMemo(
    () =>
      new Map(
        (personnelData as any[]).map((item: any) => [Number(item.id), String(item.name || "")])
      ),
    [personnelData]
  );
  const departmentNameMap = useMemo(
    () =>
      new Map(
        (departmentsData as any[]).map((item: any) => [Number(item.id), String(item.name || "")])
      ),
    [departmentsData]
  );
  const trainings = useMemo(
    () =>
      (_dbData as any[]).map((row: any) => ({
        id: Number(row.id || 0),
        trainingNo: String(row.trainingNo || ""),
        title: String(row.title || ""),
        type: String(row.type || "other"),
        typeLabel: typeLabelMap[String(row.type || "other")] || String(row.type || "其他培训"),
        category: "",
        trainer: personnelNameMap.get(Number(row.trainerId || 0)) || "",
        trainerDept: departmentNameMap.get(Number(row.departmentId || 0)) || "",
        participants: Number(row.participants || 0),
        duration: "",
        location: String(row.location || ""),
        status: (String(row.status || "planned") as Training["status"]),
        date: toDateInputValue(row.startDate),
        endDate: toDateInputValue(row.endDate),
        objectives: "",
        content: String(row.content || ""),
        materials: "",
        assessment: "",
        remarks: String(row.remark || ""),
      })),
    [_dbData, departmentNameMap, personnelNameMap]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [viewingTraining, setViewingTraining] = useState<Training | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    trainingNo: "",
    title: "",
    type: "other",
    category: "",
    trainer: "",
    trainerDept: "",
    participants: 0,
    duration: "",
    location: "",
    status: "planned",
    date: "",
    endDate: "",
    objectives: "",
    content: "",
    materials: "",
    assessment: "",
    remarks: "",
  });

  const filteredTrainings = trainings.filter((t: any) => {
    const matchesSearch =
      String(t.title ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.trainingNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.trainer ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingTraining(null);
    setFormData({
      trainingNo: "",
      title: "",
      type: "other",
      category: "",
      trainer: "",
      trainerDept: "",
      participants: 0,
      duration: "",
      location: "",
      status: "planned",
      date: "",
      endDate: "",
      objectives: "",
      content: "",
      materials: "",
      assessment: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (training: Training) => {
    setEditingTraining(training);
    setFormData({
      trainingNo: training.trainingNo,
      title: training.title,
      type: training.type,
      category: training.category,
      trainer: training.trainer,
      trainerDept: training.trainerDept,
      participants: training.participants,
      duration: training.duration,
      location: training.location,
      status: training.status,
      date: training.date,
      endDate: training.endDate,
      objectives: training.objectives,
      content: training.content,
      materials: training.materials,
      assessment: training.assessment,
      remarks: training.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (training: Training) => {
    setViewingTraining(training);
    setViewDialogOpen(true);
  };

  const handleDelete = (training: Training) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除培训记录" });
      return;
    }
    deleteMutation.mutate({ id: training.id });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.type || !formData.date) {
      toast.error("请填写必填项", { description: "培训主题、类型、日期为必填" });
      return;
    }

    const trainerMatch = (personnelData as any[]).find(
      (item: any) => String(item.name || "").trim() === String(formData.trainer || "").trim()
    );
    const departmentMatch = (departmentsData as any[]).find(
      (item: any) => String(item.name || "").trim() === String(formData.trainerDept || "").trim()
    );
    const payload = {
      title: formData.title.trim(),
      type: (formData.type || "other") as
        | "onboarding"
        | "skill"
        | "compliance"
        | "safety"
        | "other",
      trainerId: trainerMatch?.id ? Number(trainerMatch.id) : undefined,
      departmentId: departmentMatch?.id ? Number(departmentMatch.id) : undefined,
      startDate: formData.date || undefined,
      endDate: formData.endDate || undefined,
      location: formData.location.trim() || undefined,
      participants: Number(formData.participants || 0) || undefined,
      content: formData.content.trim() || undefined,
      status: (formData.status || "planned") as
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled",
      remark: buildTrainingRemark(formData) || undefined,
    };

    try {
      if (editingTraining) {
        await updateMutation.mutateAsync({
          id: editingTraining.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(String(error?.message || "保存培训记录失败"));
    }
  };

  const completedCount = trainings.filter((t: any) => t.status === "completed").length;
  const ongoingCount = trainings.filter((t: any) => t.status === "in_progress").length;
  const plannedCount = trainings.filter((t: any) => t.status === "planned").length;

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
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">培训管理</h2>
              <p className="text-sm text-muted-foreground">管理公司年度、月度及临时培训需求</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建培训
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">年度培训计划</p>
              <p className="text-2xl font-bold">{trainings.length}</p>
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
              <p className="text-2xl font-bold text-blue-600">{ongoingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待开展</p>
              <p className="text-2xl font-bold text-amber-600">{plannedCount}</p>
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
                  placeholder="搜索培训编号、主题、讲师..."
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
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
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
                  <TableHead className="w-[120px] text-center font-bold">培训编号</TableHead>
                  <TableHead className="text-center font-bold">培训主题</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">培训类型</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">讲师</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">人数</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">培训日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainings.map((training: any) => (
                  <TableRow key={training.id}>
                    <TableCell className="text-center font-medium">{training.trainingNo}</TableCell>
                    <TableCell className="text-center">{training.title}</TableCell>
                    <TableCell className="text-center">{training.typeLabel}</TableCell>
                    <TableCell className="text-center">{training.trainer}</TableCell>
                    <TableCell className="text-center">{training.participants}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[training.status]?.variant || "outline"} className={getStatusSemanticClass(training.status, statusMap[training.status]?.label)}>
                        {statusMap[training.status]?.label || String(training.status ?? "-")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(training.date)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(training)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(training)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(training)}
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
              <DialogTitle>{editingTraining ? "编辑培训信息" : "新建培训计划"}</DialogTitle>
              <DialogDescription>
                {editingTraining ? "修改培训计划信息" : "创建新的培训计划"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>培训编号</Label>
                  <Input value={formData.trainingNo} placeholder="保存后系统生成" disabled />
                </div>
                <div className="space-y-2">
                  <Label>培训主题 *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入培训主题"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>培训类型 *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((type: any) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>培训类别</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类别" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat: any) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                      <SelectItem value="in_progress">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>培训讲师</Label>
                  <Input
                    value={formData.trainer}
                    onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                    placeholder="讲师姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>讲师部门</Label>
                  <Input
                    value={formData.trainerDept}
                    onChange={(e) => setFormData({ ...formData, trainerDept: e.target.value })}
                    placeholder="所属部门或外聘机构"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>参训人数</Label>
                  <Input
                    type="number"
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>培训时长</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="如：4小时"
                  />
                </div>
                <div className="space-y-2">
                  <Label>培训地点</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="培训地点"
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

              <div className="space-y-2">
                <Label>培训目标</Label>
                <Textarea
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="培训目标和预期效果"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>培训内容</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="培训主要内容"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>培训材料</Label>
                  <Input
                    value={formData.materials}
                    onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                    placeholder="培训材料"
                  />
                </div>
                <div className="space-y-2">
                  <Label>考核方式</Label>
                  <Input
                    value={formData.assessment}
                    onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                    placeholder="考核方式"
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingTraining ? "保存修改" : "创建培训"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingTraining && (() => {
      return (
        <div className="space-y-4">
          {/* 标准头部 */}
          <div className="border-b pb-3">
            <h2 className="text-lg font-semibold">培训详情</h2>
            <p className="text-sm text-muted-foreground">
              {viewingTraining.trainingNo}
              {viewingTraining.status && (
                <> · <Badge variant={statusMap[viewingTraining.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingTraining.status, statusMap[viewingTraining.status]?.label)}`}>
                  {statusMap[viewingTraining.status]?.label || String(viewingTraining.status ?? "-")}
                </Badge></>
              )}
            </p>
          </div>

          {/* 详细信息 */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="培训主题">{viewingTraining.title || "-"}</FieldRow>
                  <FieldRow label="培训类型">{viewingTraining.typeLabel || "-"}</FieldRow>
                  <FieldRow label="培训类别">{viewingTraining.category || "-"}</FieldRow>
                  <FieldRow label="培训地点">{viewingTraining.location || "-"}</FieldRow>
                </div>
                <div>
                  <FieldRow label="开始日期">{formatDateValue(viewingTraining.date)}</FieldRow>
                  <FieldRow label="结束日期">{formatDateValue(viewingTraining.endDate)}</FieldRow>
                  <FieldRow label="培训时长">{viewingTraining.duration || "-"}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">讲师与学员</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="培训讲师">{viewingTraining.trainer || "-"}</FieldRow>
                  <FieldRow label="讲师部门">{viewingTraining.trainerDept || "-"}</FieldRow>
                </div>
                <div>
                  <FieldRow label="参训人数">{viewingTraining.participants ? `${viewingTraining.participants}人` : "-"}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">内容与考核</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="培训目标">{viewingTraining.objectives || "-"}</FieldRow>
                  <FieldRow label="培训内容">{viewingTraining.content || "-"}</FieldRow>
                </div>
                <div>
                  <FieldRow label="培训材料">{viewingTraining.materials || "-"}</FieldRow>
                  <FieldRow label="考核方式">{viewingTraining.assessment || "-"}</FieldRow>
                </div>
              </div>
            </div>

            {viewingTraining.remarks && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingTraining.remarks}</p>
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
                if (viewingTraining) handleEdit(viewingTraining);
              }}>
                编辑
              </Button>
            </div>
          </div>
        </div>
      );
    })()}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
