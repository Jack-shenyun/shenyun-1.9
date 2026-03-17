import { formatDateValue, formatDisplayNumber } from "@/lib/formatters";
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
  Archive,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  RefreshCw,
  XCircle,
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

interface SampleRecord {
  id: number;
  sampleNo: string;
  productName: string;
  productCode: string;
  batchNo: string;
  quantity: string;
  unit: string;
  location: string;
  retainDate: string;
  expiryDate: string;
  retainPeriod: number;
  retainBy: string;
  status: "retained" | "testing" | "expired" | "destroyed";
  observationRecords: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" as const },
  stored: { label: "已入库", variant: "secondary" as const },
  retained: { label: "留样中", variant: "default" as const },
  testing: { label: "检验中", variant: "secondary" as const },
  expired: { label: "已过期", variant: "destructive" as const },
  destroyed: { label: "已销毁", variant: "outline" as const },
};



const locationOptions = ["留样室A-01", "留样室A-02", "留样室A-03", "留样室B-01", "留样室B-02", "留样室C-01"];

function formatQtyDisplay(value: unknown, digits = 4) {
  if (value == null || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return formatDisplayNumber(num, { maximumFractionDigits: Math.min(digits, 2) });
}

export default function SamplesPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.samples.list.useQuery();
  const createMutation = trpc.samples.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.samples.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.samples.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const samples = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<SampleRecord | null>(null);
  const [viewingSample, setViewingSample] = useState<SampleRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sampleToDelete, setSampleToDelete] = useState<SampleRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    sampleNo: "",
    productName: "",
    productCode: "",
    batchNo: "",
    quantity: "",
    unit: "支",
    location: "",
    retainDate: "",
    expiryDate: "",
    retainPeriod: 36,
    retainBy: "",
    status: "retained",
    observationRecords: "",
    remarks: "",
  });

  const filteredSamples = samples.filter((s: any) => {
    const matchesSearch =
      String(s.sampleNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSamples.length / pageSize));
  const paginatedSamples = filteredSamples.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, samples.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setEditingSample(null);
    const today = new Date();
    setFormData({
      sampleNo: "",
      productName: "",
      productCode: "",
      batchNo: "",
      quantity: "",
      unit: "支",
      location: "",
      retainDate: today.toISOString().split("T")[0],
      expiryDate: "",
      retainPeriod: 36,
      retainBy: "",
      status: "retained",
      observationRecords: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (sample: SampleRecord) => {
    setEditingSample(sample);
    setFormData({
      sampleNo: sample.sampleNo,
      productName: sample.productName,
      productCode: sample.productCode,
      batchNo: sample.batchNo,
      quantity: sample.quantity,
      unit: sample.unit,
      location: sample.location,
      retainDate: sample.retainDate,
      expiryDate: sample.expiryDate,
      retainPeriod: sample.retainPeriod,
      retainBy: sample.retainBy,
      status: sample.status,
      observationRecords: sample.observationRecords,
      remarks: sample.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (sample: SampleRecord) => {
    setViewingSample(sample);
    setViewDialogOpen(true);
  };

  const handleDelete = (sample: SampleRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除留样记录" });
      return;
    }
    setSampleToDelete(sample);
    setDeleteDialogOpen(true);
  };

  const handleDestroy = (sample: SampleRecord) => {
    toast.success("留样已标记为销毁");
  };

  const handleSubmit = () => {
    if (!formData.productName || !formData.batchNo) {
      toast.error("请填写必填项", { description: "产品名称、批次号为必填" });
      return;
    }

    if (editingSample) {
      updateMutation.mutate({
        id: editingSample.id,
        data: {
          productName: formData.productName,
          productCode: formData.productCode || undefined,
          batchNo: formData.batchNo,
          quantity: formData.quantity || undefined,
          unit: formData.unit || undefined,
          location: formData.location || undefined,
          retainDate: formData.retainDate || undefined,
          expiryDate: formData.expiryDate || undefined,
          retainPeriod: formData.retainPeriod,
          retainBy: formData.retainBy || undefined,
          status: formData.status as any,
          observationRecords: formData.observationRecords || undefined,
          remarks: formData.remarks || undefined,
        },
      });
    } else {
      createMutation.mutate({
        sampleNo: formData.sampleNo || undefined,
        productName: formData.productName,
        productCode: formData.productCode || undefined,
        batchNo: formData.batchNo,
        quantity: formData.quantity || undefined,
        unit: formData.unit || undefined,
        location: formData.location || undefined,
        retainDate: formData.retainDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        retainPeriod: formData.retainPeriod,
        retainBy: formData.retainBy || undefined,
        status: formData.status as any,
        observationRecords: formData.observationRecords || undefined,
        remarks: formData.remarks || undefined,
      });
    }
    setDialogOpen(false);
  };

  // 计算到期日期
  const calculateExpiryDate = (retainDate: string, months: number) => {
    if (!retainDate) return "";
    const date = new Date(retainDate);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  };

  const nonDraftSamples = samples.filter((s: any) => s.status !== "draft");
  const retainedCount = nonDraftSamples.filter((s: any) => s.status === "retained").length;
  const nearExpiryCount = nonDraftSamples.filter((s: any) => {
    if (s.status !== "retained") return false;
    const expiry = new Date(s.expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays > 0;
  }).length;
  const expiredCount = nonDraftSamples.filter((s: any) => s.status === "expired").length;
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
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">留样管理</h2>
              <p className="text-sm text-muted-foreground">建立完整的产品留样台账，支持留样登记、查询和销毁管理</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              刷新
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              新建留样
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">留样总数</p>
              <p className="text-2xl font-bold">{nonDraftSamples.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">留样中</p>
              <p className="text-2xl font-bold text-green-600">{retainedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">即将到期</p>
              <p className="text-2xl font-bold text-amber-600">{nearExpiryCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已过期</p>
              <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
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
                  placeholder="搜索留样编号、产品名称、批次号..."
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
                  <SelectItem value="retained">留样中</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                  <SelectItem value="destroyed">已销毁</SelectItem>
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
                  <TableHead className="w-[120px] text-center font-bold">留样编号</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">批次号</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">数量</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">存放位置</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">到期日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSamples.map((sample: any) => {
                  const expiry = new Date(sample.expiryDate);
                  const today = new Date();
                  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isNearExpiry = diffDays <= 90 && diffDays > 0 && sample.status === "retained";

                  return (
                    <TableRow key={sample.id}>
                      <TableCell className="text-center font-medium">{sample.sampleNo}</TableCell>
                      <TableCell className="text-center">{sample.productName}</TableCell>
                      <TableCell className="text-center">{sample.batchNo}</TableCell>
                      <TableCell className="text-center">{formatQtyDisplay(sample.quantity)} {sample.unit}</TableCell>
                      <TableCell className="text-center">{sample.location}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1">
                          {formatDateValue(sample.expiryDate)}
                          {isNearExpiry && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[sample.status]?.variant || "outline"} className={getStatusSemanticClass(sample.status, statusMap[sample.status]?.label)}>
                          {statusMap[sample.status]?.label || String(sample.status ?? "-")}
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
                            <DropdownMenuItem onClick={() => handleView(sample)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(sample)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            {(sample.status === "retained" || sample.status === "expired") && (
                              <DropdownMenuItem onClick={() => handleDestroy(sample)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                标记销毁
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(sample)}
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
                  );
                })}
                {paginatedSamples.length === 0 && (
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

        {filteredSamples.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredSamples.length)} 条，
              共 {filteredSamples.length} 条，第 {currentPage} / {totalPages} 页
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
              <DialogTitle>{editingSample ? "编辑留样记录" : "新建留样记录"}</DialogTitle>
              <DialogDescription>
                {editingSample ? "修改留样信息" : "登记新的产品留样"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>留样编号 *</Label>
                  <Input
                    value={formData.sampleNo}
                    onChange={(e) => setFormData({ ...formData, sampleNo: e.target.value })}
                    placeholder="保存后系统生成"
                    readOnly
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
                  <Label>批次号 *</Label>
                  <Input
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    placeholder="生产批次号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>留样数量</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="数量"
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="支">支</SelectItem>
                      <SelectItem value="只">只</SelectItem>
                      <SelectItem value="双">双</SelectItem>
                      <SelectItem value="盒">盒</SelectItem>
                      <SelectItem value="瓶">瓶</SelectItem>
                      <SelectItem value="个">个</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>存放位置</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择位置" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((l: any) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>留样日期</Label>
                  <Input
                    type="date"
                    value={formData.retainDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormData({
                        ...formData,
                        retainDate: newDate,
                        expiryDate: calculateExpiryDate(newDate, formData.retainPeriod),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>留样期限 (月)</Label>
                  <Input
                    type="number"
                    value={formData.retainPeriod}
                    onChange={(e) => {
                      const period = parseInt(e.target.value) || 36;
                      setFormData({
                        ...formData,
                        retainPeriod: period,
                        expiryDate: calculateExpiryDate(formData.retainDate, period),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>到期日期</Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>留样人</Label>
                  <Input
                    value={formData.retainBy}
                    onChange={(e) => setFormData({ ...formData, retainBy: e.target.value })}
                    placeholder="留样操作人"
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
                      <SelectItem value="retained">留样中</SelectItem>
                      <SelectItem value="testing">检验中</SelectItem>
                      <SelectItem value="expired">已过期</SelectItem>
                      <SelectItem value="destroyed">已销毁</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>观察记录</Label>
                <Textarea
                  value={formData.observationRecords}
                  onChange={(e) => setFormData({ ...formData, observationRecords: e.target.value })}
                  placeholder="定期观察记录"
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
              <Button variant="ghost" onClick={() => {
                if (!formData.productName || !formData.batchNo) { toast.error("请填写必填项"); return; }
                const draftData = {
                  productName: formData.productName,
                  productCode: formData.productCode || undefined,
                  batchNo: formData.batchNo,
                  quantity: formData.quantity || undefined,
                  unit: formData.unit || undefined,
                  location: formData.location || undefined,
                  retainDate: formData.retainDate || undefined,
                  expiryDate: formData.expiryDate || undefined,
                  retainPeriod: formData.retainPeriod,
                  retainBy: formData.retainBy || undefined,
                  status: "draft" as any,
                  observationRecords: formData.observationRecords || undefined,
                  remarks: formData.remarks || undefined,
                };
                if (editingSample) {
                  updateMutation.mutate({ id: editingSample.id, data: draftData }, { onSuccess: () => setDialogOpen(false) });
                } else {
                  createMutation.mutate(draftData, { onSuccess: () => setDialogOpen(false) });
                }
              }}>
                保存草稿
              </Button>
              <Button onClick={handleSubmit}>
                {editingSample ? "保存修改" : "创建留样"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    {viewingSample && (
      <>
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">留样详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingSample.sampleNo}
            {viewingSample.status && (
              <> · <Badge variant={statusMap[viewingSample.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingSample.status, statusMap[viewingSample.status]?.label)}`}>
                {statusMap[viewingSample.status]?.label || String(viewingSample.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div className="py-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="产品名称">{viewingSample.productName}</FieldRow>
                <FieldRow label="批次号">{viewingSample.batchNo}</FieldRow>
                <FieldRow label="留样数量">{formatQtyDisplay(viewingSample.quantity)} {viewingSample.unit}</FieldRow>
                <FieldRow label="留样人">{viewingSample.retainBy || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="产品编码">{viewingSample.productCode || "-"}</FieldRow>
                <FieldRow label="存放位置">{viewingSample.location}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">日期信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="留样日期">{formatDateValue(viewingSample.retainDate)}</FieldRow>
                <FieldRow label="留样期限">{viewingSample.retainPeriod} 个月</FieldRow>
              </div>
              <div>
                <FieldRow label="到期日期">{formatDateValue(viewingSample.expiryDate)}</FieldRow>
              </div>
            </div>
          </div>

          {viewingSample.observationRecords && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">观察记录</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 whitespace-pre-wrap">{viewingSample.observationRecords}</p>
            </div>
          )}

          {viewingSample.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingSample.remarks}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => {
              setViewDialogOpen(false);
              if (viewingSample) handleEdit(viewingSample);
            }}>
              编辑
            </Button>
          </div>
        </div>
      </>
    )}
  </DraggableDialogContent>
</DraggableDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确认删除留样记录 {sampleToDelete?.sampleNo || ""} 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSampleToDelete(null)}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (sampleToDelete) {
                    deleteMutation.mutate({ id: sampleToDelete.id });
                    toast.success("留样记录已删除");
                  }
                  setDeleteDialogOpen(false);
                  setSampleToDelete(null);
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
