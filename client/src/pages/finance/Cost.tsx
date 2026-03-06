import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
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
  Calculator,
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
import { formatNumber, safeLower, toSafeNumber } from "@/lib/formatters";

interface CostRecord {
  id: number;
  period: string;
  productName: string;
  batchNo: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  status: "calculating" | "completed" | "adjusted";
  remarks: string;
}

const statusMap: Record<string, any> = {
  calculating: { label: "核算中", variant: "outline" as const },
  completed: { label: "已完成", variant: "default" as const },
  adjusted: { label: "已调整", variant: "secondary" as const },
};

function getStatusMeta(status: unknown) {
  return statusMap[String(status ?? "")] ?? statusMap.calculating;
}



export default function CostPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.paymentRecords.list.useQuery();
  const createMutation = trpc.paymentRecords.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.paymentRecords.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.paymentRecords.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const costs = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<CostRecord | null>(null);
  const [viewingCost, setViewingCost] = useState<CostRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    period: "",
    productName: "",
    batchNo: "",
    materialCost: "",
    laborCost: "",
    overheadCost: "",
    remarks: "",
  });

  const filteredCosts = costs.filter((c: any) => {
    const matchesSearch =
      safeLower(c.productName).includes(safeLower(searchTerm)) ||
      safeLower(c.batchNo).includes(safeLower(searchTerm));
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingCost(null);
    const today = new Date();
    setFormData({
      period: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
      productName: "",
      batchNo: "",
      materialCost: "",
      laborCost: "",
      overheadCost: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (cost: CostRecord) => {
    setEditingCost(cost);
    setFormData({
      period: cost.period,
      productName: cost.productName,
      batchNo: cost.batchNo,
      materialCost: String(cost.materialCost),
      laborCost: String(cost.laborCost),
      overheadCost: String(cost.overheadCost),
      remarks: cost.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (cost: CostRecord) => {
    setViewingCost(cost);
    setViewDialogOpen(true);
  };

  const handleDelete = (cost: CostRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除成本记录" });
      return;
    }
    deleteMutation.mutate({ id: cost.id });
    toast.success("成本记录已删除");
  };

  const handleComplete = (cost: CostRecord) => {
    toast.success("成本核算已完成");
  };

  const handleSubmit = () => {
    if (!formData.period || !formData.productName || !formData.batchNo) {
      toast.error("请填写必填项", { description: "核算期间、产品名称和批次号为必填" });
      return;
    }

    const materialCost = parseFloat(formData.materialCost) || 0;
    const laborCost = parseFloat(formData.laborCost) || 0;
    const overheadCost = parseFloat(formData.overheadCost) || 0;
    const totalCost = materialCost + laborCost + overheadCost;

    if (editingCost) {
      toast.success("成本记录已更新");
    } else {
      const newCost: CostRecord = {
        id: Math.max(...costs.map((c: any) => c.id)) + 1,
        ...formData,
        materialCost,
        laborCost,
        overheadCost,
        totalCost,
        status: "calculating",
      };
      toast.success("成本记录创建成功");
    }
    setDialogOpen(false);
  };

  const totalMaterialCost = costs.reduce((sum: any, c: any) => sum + toSafeNumber(c.materialCost), 0);
  const totalLaborCost = costs.reduce((sum: any, c: any) => sum + toSafeNumber(c.laborCost), 0);
  const totalOverheadCost = costs.reduce((sum: any, c: any) => sum + toSafeNumber(c.overheadCost), 0);
  const totalCost = costs.reduce((sum: any, c: any) => sum + toSafeNumber(c.totalCost), 0);
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
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">成本核算</h2>
              <p className="text-sm text-muted-foreground">按批次或期间进行产品成本归集和分摊</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建核算
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">总成本</p>
              <p className="text-2xl font-bold">¥{(totalCost / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">材料成本</p>
              <p className="text-2xl font-bold text-blue-600">¥{(totalMaterialCost / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">人工成本</p>
              <p className="text-2xl font-bold text-green-600">¥{(totalLaborCost / 10000).toFixed(1)}万</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">制造费用</p>
              <p className="text-2xl font-bold text-amber-600">¥{(totalOverheadCost / 10000).toFixed(1)}万</p>
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
                  placeholder="搜索产品名称、批次号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="calculating">核算中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="adjusted">已调整</SelectItem>
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
                  <TableHead className="w-[90px] text-center font-bold">核算期间</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">批次号</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">材料成本</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">人工成本</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">制造费用</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">总成本</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map((cost: any) => (
                  <TableRow key={cost.id}>
                    <TableCell className="text-center">{cost.period}</TableCell>
                    <TableCell className="text-center font-medium">{cost.productName}</TableCell>
                    <TableCell className="text-center">{cost.batchNo}</TableCell>
                    <TableCell className="text-center">¥{formatNumber(cost.materialCost)}</TableCell>
                    <TableCell className="text-center">¥{formatNumber(cost.laborCost)}</TableCell>
                    <TableCell className="text-center">¥{formatNumber(cost.overheadCost)}</TableCell>
                    <TableCell className="text-center font-medium">¥{formatNumber(cost.totalCost)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusMeta(cost.status).variant} className={getStatusSemanticClass(cost.status, getStatusMeta(cost.status).label)}>
                        {getStatusMeta(cost.status).label}
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
                          <DropdownMenuItem onClick={() => handleView(cost)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(cost)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {cost.status === "calculating" && (
                            <DropdownMenuItem onClick={() => handleComplete(cost)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              完成核算
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(cost)}
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
              <DialogTitle>{editingCost ? "编辑成本核算" : "新建成本核算"}</DialogTitle>
              <DialogDescription>
                {editingCost ? "修改成本核算信息" : "创建新的成本核算记录"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>核算期间 *</Label>
                  <Input
                    type="month"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>批次号 *</Label>
                  <Input
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    placeholder="批次号"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>产品名称 *</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="产品名称"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>材料成本</Label>
                  <Input
                    type="number"
                    value={formData.materialCost}
                    onChange={(e) => setFormData({ ...formData, materialCost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>人工成本</Label>
                  <Input
                    type="number"
                    value={formData.laborCost}
                    onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>制造费用</Label>
                  <Input
                    type="number"
                    value={formData.overheadCost}
                    onChange={(e) => setFormData({ ...formData, overheadCost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>总成本</span>
                    <span className="font-medium">
                    ¥{formatNumber(
                      (parseFloat(formData.materialCost) || 0) +
                      (parseFloat(formData.laborCost) || 0) +
                      (parseFloat(formData.overheadCost) || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingCost ? "保存修改" : "创建记录"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingCost && (
      <div className="flex flex-col gap-6">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">成本核算详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingCost.batchNo}
            {viewingCost.status && (
              <>
                {' · '}
                <Badge
                  variant={statusMap[viewingCost.status]?.variant || 'outline'}
                  className={`ml-1 ${getStatusSemanticClass(
                    viewingCost.status,
                    statusMap[viewingCost.status]?.label
                  )}`}
                >
                  {statusMap[viewingCost.status]?.label || String(viewingCost.status ?? '-')}
                </Badge>
              </>
            )}
          </p>
        </div>

        {/* 成本构成 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">成本构成</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品名称">{viewingCost.productName}</FieldRow>
              <FieldRow label="核算期间">{viewingCost.period}</FieldRow>
              <FieldRow label="总成本">
                <span className="font-bold text-base">¥{formatNumber(viewingCost.totalCost)}</span>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="材料成本">
                <span className="text-blue-600">¥{formatNumber(viewingCost.materialCost)}</span>
              </FieldRow>
              <FieldRow label="人工成本">
                <span className="text-green-600">¥{formatNumber(viewingCost.laborCost)}</span>
              </FieldRow>
              <FieldRow label="制造费用">
                <span className="text-amber-600">¥{formatNumber(viewingCost.overheadCost)}</span>
              </FieldRow>
            </div>
          </div>
        </div>

        {/* 标准备注 */}
        {viewingCost.remarks && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
              {viewingCost.remarks}
            </p>
          </div>
        )}

        {/* 标准操作按钮 */}
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
                if (viewingCost) handleEdit(viewingCost);
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
