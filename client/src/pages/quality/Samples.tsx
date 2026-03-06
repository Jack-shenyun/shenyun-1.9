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
  Archive,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

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
  retained: { label: "留样中", variant: "default" as const },
  testing: { label: "检验中", variant: "secondary" as const },
  expired: { label: "已过期", variant: "destructive" as const },
  destroyed: { label: "已销毁", variant: "outline" as const },
};



const locationOptions = ["留样室A-01", "留样室A-02", "留样室A-03", "留样室B-01", "留样室B-02", "留样室C-01"];

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

  const handleAdd = () => {
    setEditingSample(null);
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "").substring(0, 8);
    const nextNo = samples.length + 1;
    setFormData({
      sampleNo: `SP-${dateStr.substring(0, 4)}-${String(nextNo).padStart(4, "0")}`,
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
    deleteMutation.mutate({ id: sample.id });
    toast.success("留样记录已删除");
  };

  const handleDestroy = (sample: SampleRecord) => {
    toast.success("留样已标记为销毁");
  };

  const handleSubmit = () => {
    if (!formData.sampleNo || !formData.productName || !formData.batchNo) {
      toast.error("请填写必填项", { description: "留样编号、产品名称、批次号为必填" });
      return;
    }

    if (editingSample) {
      toast.success("留样记录已更新");
    } else {
      const newSample: SampleRecord = {
        id: Math.max(...samples.map((s: any) => s.id)) + 1,
        ...formData,
        status: formData.status as SampleRecord["status"],
      };
      toast.success("留样记录创建成功");
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

  const retainedCount = samples.filter((s: any) => s.status === "retained").length;
  const nearExpiryCount = samples.filter((s: any) => {
    if (s.status !== "retained") return false;
    const expiry = new Date(s.expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays > 0;
  }).length;
  const expiredCount = samples.filter((s: any) => s.status === "expired").length;
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
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建留样
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">留样总数</p>
              <p className="text-2xl font-bold">{samples.length}</p>
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
                {filteredSamples.map((sample: any) => {
                  const expiry = new Date(sample.expiryDate);
                  const today = new Date();
                  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isNearExpiry = diffDays <= 90 && diffDays > 0 && sample.status === "retained";

                  return (
                    <TableRow key={sample.id}>
                      <TableCell className="text-center font-medium">{sample.sampleNo}</TableCell>
                      <TableCell className="text-center">{sample.productName}</TableCell>
                      <TableCell className="text-center">{sample.batchNo}</TableCell>
                      <TableCell className="text-center">{sample.quantity} {sample.unit}</TableCell>
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
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
                    placeholder="留样编号"
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
              <Button onClick={handleSubmit}>
                {editingSample ? "保存修改" : "创建留样"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
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
                <FieldRow label="留样数量">{viewingSample.quantity} {viewingSample.unit}</FieldRow>
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
      </div>
    </ERPLayout>
  );
}
