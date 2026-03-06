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
  TestTube,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface LabRecord {
  id: number;
  recordNo: string;
  type: string;
  testItem: string;
  standard: string;
  result: string;
  conclusion: string;
  tester: string;
  reviewer: string;
  equipment: string;
  sampleInfo: string;
  status: "pending" | "testing" | "passed" | "failed";
  testDate: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  pending: { label: "待检", variant: "outline" as const },
  testing: { label: "检验中", variant: "default" as const },
  passed: { label: "合格", variant: "secondary" as const },
  failed: { label: "不合格", variant: "destructive" as const },
};

const testTypes = [
  "纯化水检验",
  "环境监测",
  "细菌内毒素",
  "无菌检查",
  "微生物限度",
  "清洁验证",
];



export default function LabPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.labRecords.list.useQuery();
  const createMutation = trpc.labRecords.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.labRecords.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.labRecords.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const records = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LabRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<LabRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    recordNo: "",
    type: "",
    testItem: "",
    standard: "",
    result: "",
    conclusion: "",
    tester: "",
    reviewer: "",
    equipment: "",
    sampleInfo: "",
    status: "pending",
    testDate: "",
    remarks: "",
  });

  const filteredRecords = records.filter((r: any) => {
    const matchesSearch =
      String(r.recordNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.type ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.testItem ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAdd = () => {
    setEditingRecord(null);
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const nextNo = records.length + 1;
    setFormData({
      recordNo: `LAB-${dateStr.substring(0, 4)}-${String(nextNo).padStart(4, "0")}`,
      type: "",
      testItem: "",
      standard: "",
      result: "",
      conclusion: "",
      tester: "",
      reviewer: "",
      equipment: "",
      sampleInfo: "",
      status: "pending",
      testDate: today.toISOString().split("T")[0],
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: LabRecord) => {
    setEditingRecord(record);
    setFormData({
      recordNo: record.recordNo,
      type: record.type,
      testItem: record.testItem,
      standard: record.standard,
      result: record.result,
      conclusion: record.conclusion,
      tester: record.tester,
      reviewer: record.reviewer,
      equipment: record.equipment,
      sampleInfo: record.sampleInfo,
      status: record.status,
      testDate: record.testDate,
      remarks: record.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (record: LabRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: LabRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除检验记录" });
      return;
    }
    deleteMutation.mutate({ id: record.id });
    toast.success("检验记录已删除");
  };

  const handleComplete = (record: LabRecord, passed: boolean) => {
    toast.success(passed ? "检验完成：合格" : "检验完成：不合格");
  };

  const handleSubmit = () => {
    if (!formData.recordNo || !formData.type || !formData.testItem) {
      toast.error("请填写必填项", { description: "记录编号、检验类型、检验项目为必填" });
      return;
    }

    if (editingRecord) {
      toast.success("检验记录已更新");
    } else {
      const newRecord: LabRecord = {
        id: Math.max(...records.map((r: any) => r.id)) + 1,
        ...formData,
        status: formData.status as LabRecord["status"],
      };
      toast.success("检验记录创建成功");
    }
    setDialogOpen(false);
  };

  const passedCount = records.filter((r: any) => r.status === "passed").length;
  const testingCount = records.filter((r: any) => r.status === "testing").length;
  const failedCount = records.filter((r: any) => r.status === "failed").length;

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
              <TestTube className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">实验室管理</h2>
              <p className="text-sm text-muted-foreground">实现对实验室环境、关键介质的质量监控记录电子化管理</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建记录
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本月检验</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">合格</p>
              <p className="text-2xl font-bold text-green-600">{passedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">检验中</p>
              <p className="text-2xl font-bold text-blue-600">{testingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">不合格</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
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
                  placeholder="搜索记录编号、检验类型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="检验类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {testTypes.map((t: any) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
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
                  <TableHead className="w-[130px] text-center font-bold">记录编号</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">检验类型</TableHead>
                  <TableHead className="text-center font-bold">检验项目</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">检验结论</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">检验员</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">检验日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-medium">{record.recordNo}</TableCell>
                    <TableCell className="text-center">{record.type}</TableCell>
                    <TableCell className="text-center max-w-[200px] truncate">{record.testItem}</TableCell>
                    <TableCell className="text-center">{record.conclusion || "-"}</TableCell>
                    <TableCell className="text-center">{record.tester}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                        {statusMap[record.status]?.label || String(record.status ?? "-")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(record.testDate)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(record)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {record.status === "testing" && (
                            <>
                              <DropdownMenuItem onClick={() => handleComplete(record, true)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                判定合格
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleComplete(record, false)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                判定不合格
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(record)}
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
              <DialogTitle>{editingRecord ? "编辑检验记录" : "新建检验记录"}</DialogTitle>
              <DialogDescription>
                {editingRecord ? "修改检验记录信息" : "创建新的实验室检验记录"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>记录编号 *</Label>
                  <Input
                    value={formData.recordNo}
                    onChange={(e) => setFormData({ ...formData, recordNo: e.target.value })}
                    placeholder="记录编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>检验类型 *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择检验类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {testTypes.map((t: any) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>检验项目 *</Label>
                <Input
                  value={formData.testItem}
                  onChange={(e) => setFormData({ ...formData, testItem: e.target.value })}
                  placeholder="检验项目"
                />
              </div>

              <div className="space-y-2">
                <Label>检验标准</Label>
                <Input
                  value={formData.standard}
                  onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                  placeholder="参照的检验标准"
                />
              </div>

              <div className="space-y-2">
                <Label>样品信息</Label>
                <Input
                  value={formData.sampleInfo}
                  onChange={(e) => setFormData({ ...formData, sampleInfo: e.target.value })}
                  placeholder="样品来源、批号等信息"
                />
              </div>

              <div className="space-y-2">
                <Label>检验设备</Label>
                <Input
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  placeholder="使用的检验设备"
                />
              </div>

              <div className="space-y-2">
                <Label>检验结果</Label>
                <Textarea
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  placeholder="详细检验数据和结果"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>检验结论</Label>
                  <Input
                    value={formData.conclusion}
                    onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                    placeholder="符合标准/不符合标准"
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
                      <SelectItem value="pending">待检</SelectItem>
                      <SelectItem value="testing">检验中</SelectItem>
                      <SelectItem value="passed">合格</SelectItem>
                      <SelectItem value="failed">不合格</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>检验员</Label>
                  <Input
                    value={formData.tester}
                    onChange={(e) => setFormData({ ...formData, tester: e.target.value })}
                    placeholder="检验员姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>复核人</Label>
                  <Input
                    value={formData.reviewer}
                    onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                    placeholder="复核人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>检验日期</Label>
                  <Input
                    type="date"
                    value={formData.testDate}
                    onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
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
                {editingRecord ? "保存修改" : "创建记录"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingRecord && (
              <div className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">检验记录详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingRecord.recordNo}
            {viewingRecord.status && (
              <>
                {" "}
                ·{" "}
                <Badge
                  variant={statusMap[viewingRecord.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(
                    viewingRecord.status,
                    statusMap[viewingRecord.status]?.label
                  )}`}
                >
                  {statusMap[viewingRecord.status]?.label || String(viewingRecord.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="检验类型">{viewingRecord.type}</FieldRow>
                <FieldRow label="检验项目">{viewingRecord.testItem}</FieldRow>
                <FieldRow label="检验标准">{viewingRecord.standard || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="检验设备">{viewingRecord.equipment || "-"}</FieldRow>
                <FieldRow label="样品信息">{viewingRecord.sampleInfo || "-"}</FieldRow>
                <FieldRow label="检验日期">{formatDateValue(viewingRecord.testDate)}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              结果与结论
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="检验结论">{viewingRecord.conclusion || "-"}</FieldRow>
              </div>
            </div>
            <div>
                <p className="text-sm text-muted-foreground mb-1 mt-2">检验结果</p>
                <p className="text-sm bg-muted/30 p-3 rounded">{viewingRecord.result || "-"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              人员信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="检验员">{viewingRecord.tester}</FieldRow>
              </div>
              <div>
                <FieldRow label="复核人">{viewingRecord.reviewer || "-"}</FieldRow>
              </div>
            </div>
          </div>

          {viewingRecord.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                备注
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                {viewingRecord.remarks}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>
              关闭
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewDialogOpen(false);
                if (viewingRecord) handleEdit(viewingRecord);
              }}
            >
              编辑
            </Button>
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
