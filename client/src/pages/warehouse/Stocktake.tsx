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
  ClipboardCheck,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Play,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface StocktakeItem {
  materialCode: string;
  materialName: string;
  systemQty: number;
  actualQty: number;
  difference: number;
  unit: string;
}

interface StocktakeRecord {
  id: number;
  stocktakeNo: string;
  type: "full" | "cycle" | "spot" | "dynamic";
  warehouse: string;
  itemCount: number;
  operator: string;
  reviewer: string;
  status: "planned" | "in_progress" | "reviewing" | "completed";
  date: string;
  completedDate: string;
  profitLoss: number;
  remarks: string;
  items: StocktakeItem[];
}

const statusMap: Record<string, any> = {
  planned: { label: "计划中", variant: "outline" as const },
  in_progress: { label: "盘点中", variant: "default" as const },
  reviewing: { label: "审核中", variant: "secondary" as const },
  completed: { label: "已完成", variant: "secondary" as const },
};

const typeMap: Record<string, string> = {
  full: "全面盘点",
  cycle: "循环盘点",
  spot: "抽样盘点",
  dynamic: "动态盘点",
};

// 前端type枚举 -> 数据库type枚举映射
const typeToDb: Record<string, "full" | "partial" | "spot"> = {
  full: "full",
  cycle: "partial",
  spot: "spot",
  dynamic: "partial",
};
// 数据库type -> 前端type映射
const typeFromDb: Record<string, StocktakeRecord["type"]> = {
  full: "full",
  partial: "cycle",
  spot: "spot",
};

// 将数据库记录转换为前端格式
function dbToDisplay(record: any, warehouseList: any[]): StocktakeRecord {
  let extra: any = {};
  try {
    if (record.remark && record.remark.startsWith("{")) {
      extra = JSON.parse(record.remark);
    }
  } catch {}
  const wh = warehouseList.find((w: any) => w.id === record.warehouseId);
  return {
    id: record.id,
    stocktakeNo: record.stocktakeNo,
    type: typeFromDb[record.type] || "full",
    warehouse: wh?.name || extra.warehouseName || `仓库${record.warehouseId}`,
    itemCount: extra.itemCount || 0,
    operator: extra.operator || "",
    reviewer: extra.reviewer || "",
    status: (record.status === "approved" ? "completed" : record.status) as StocktakeRecord["status"],
    date: record.stocktakeDate ? String(record.stocktakeDate).split("T")[0] : "",
    completedDate: extra.completedDate || "",
    profitLoss: extra.profitLoss || 0,
    remarks: extra.remarks || "",
    items: extra.items || [],
  };
}

export default function StocktakePage() {
  // 获取仓库列表用于映射
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({});
  const { data: _dbData = [], isLoading, refetch } = trpc.stocktakes.list.useQuery();
  const createMutation = trpc.stocktakes.create.useMutation({
    onSuccess: () => { refetch(); toast.success("盘点计划已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.stocktakes.update.useMutation({
    onSuccess: () => { refetch(); toast.success("盘点信息已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.stocktakes.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("盘点记录已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });
  const stocktakes: StocktakeRecord[] = (_dbData as any[]).map((r) => dbToDisplay(r, warehouseList as any[]));
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingStocktake, setEditingStocktake] = useState<StocktakeRecord | null>(null);
  const [viewingStocktake, setViewingStocktake] = useState<StocktakeRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    stocktakeNo: "",
    type: "full" as StocktakeRecord["type"],
    warehouse: "原材料仓",
    itemCount: "",
    operator: "",
    reviewer: "",
    date: "",
    remarks: "",
  });

  const filteredStocktakes = stocktakes.filter((s) => {
    const matchesSearch =
      String(s.stocktakeNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.warehouse ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAdd = () => {
    setEditingStocktake(null);
    const today = new Date();
    const year = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setFormData({
      stocktakeNo: `ST-${year}${mm}${dd}-${String(Date.now()).slice(-4)}`,
      type: "full",
      warehouse: (warehouseList as any[])[0]?.name || "原材料仓",
      itemCount: "",
      operator: "",
      reviewer: "",
      date: today.toISOString().split("T")[0],
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (stocktake: StocktakeRecord) => {
    setEditingStocktake(stocktake);
    setFormData({
      stocktakeNo: stocktake.stocktakeNo,
      type: stocktake.type,
      warehouse: stocktake.warehouse,
      itemCount: String(stocktake.itemCount),
      operator: stocktake.operator,
      reviewer: stocktake.reviewer,
      date: stocktake.date,
      remarks: stocktake.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (stocktake: StocktakeRecord) => {
    setViewingStocktake(stocktake);
    setViewDialogOpen(true);
  };

  const handleDelete = (stocktake: StocktakeRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除盘点记录" });
      return;
    }
    deleteMutation.mutate({ id: stocktake.id });
  };

  const handleStartStocktake = (stocktake: StocktakeRecord) => {
    const extra = JSON.stringify({
      warehouseName: stocktake.warehouse,
      itemCount: stocktake.itemCount,
      operator: stocktake.operator,
      reviewer: stocktake.reviewer,
      completedDate: stocktake.completedDate,
      profitLoss: stocktake.profitLoss,
      remarks: stocktake.remarks,
      items: stocktake.items,
    });
    updateMutation.mutate({ id: stocktake.id, data: { status: "in_progress", remark: extra } });
    toast.success("盘点已开始");
  };

  const handleCompleteStocktake = (stocktake: StocktakeRecord) => {
    const completedDate = new Date().toISOString().split("T")[0];
    const extra = JSON.stringify({
      warehouseName: stocktake.warehouse,
      itemCount: stocktake.itemCount,
      operator: stocktake.operator,
      reviewer: stocktake.reviewer,
      completedDate,
      profitLoss: stocktake.profitLoss,
      remarks: stocktake.remarks,
      items: stocktake.items,
    });
    updateMutation.mutate({ id: stocktake.id, data: { status: "completed", remark: extra } });
    toast.success("盘点已完成");
  };

  const handleSubmit = () => {
    if (!formData.stocktakeNo || !formData.warehouse) {
      toast.error("请填写必填项", { description: "盘点单号和仓库为必填" });
      return;
    }

    // 找到对应仓库ID
    const wh = (warehouseList as any[]).find((w: any) => w.name === formData.warehouse);
    const warehouseId = wh?.id;
    if (!warehouseId) {
      toast.error("请选择有效仓库");
      return;
    }

    const extraData = JSON.stringify({
      warehouseName: formData.warehouse,
      itemCount: parseInt(formData.itemCount) || 0,
      operator: formData.operator,
      reviewer: formData.reviewer,
      completedDate: "",
      profitLoss: 0,
      remarks: formData.remarks,
      items: editingStocktake?.items || [],
    });

    if (editingStocktake) {
      updateMutation.mutate({
        id: editingStocktake.id,
        data: { remark: extraData },
      });
    } else {
      createMutation.mutate({
        stocktakeNo: formData.stocktakeNo,
        warehouseId,
        type: typeToDb[formData.type] || "full",
        stocktakeDate: formData.date || new Date().toISOString().split("T")[0],
        status: "planned",
        remark: extraData,
      });
    }
  };

  const completedCount = stocktakes.filter((s: any) => s.status === "completed").length;
  const inProgressCount = stocktakes.filter((s: any) => s.status === "in_progress").length;
  const profitLossCount = stocktakes.filter((s: any) => s.profitLoss !== 0).length;
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
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">盘点管理</h2>
              <p className="text-sm text-muted-foreground">支持全面盘点、循环盘点、抽样盘点等多种盘点方式</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建盘点
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本年盘点</p>
              <p className="text-2xl font-bold">{stocktakes.length}</p>
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
              <p className="text-sm text-muted-foreground">盘盈盘亏</p>
              <p className="text-2xl font-bold text-amber-600">{profitLossCount}</p>
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
                  placeholder="搜索盘点单号、仓库..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue placeholder="盘点类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="full">全面盘点</SelectItem>
                  <SelectItem value="cycle">循环盘点</SelectItem>
                  <SelectItem value="spot">抽样盘点</SelectItem>
                  <SelectItem value="dynamic">动态盘点</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[120px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="planned">计划中</SelectItem>
                  <SelectItem value="in_progress">盘点中</SelectItem>
                  <SelectItem value="reviewing">审核中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
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
                  <TableHead className="w-[120px] text-center font-bold">盘点单号</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">盘点类型</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">盘点仓库</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">物料数</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">盘点人</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">盘点日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocktakes.map((stocktake: any) => (
                  <TableRow key={stocktake.id}>
                    <TableCell className="text-center font-medium">{stocktake.stocktakeNo}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{typeMap[stocktake.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{stocktake.warehouse}</TableCell>
                    <TableCell className="text-center">{stocktake.itemCount}</TableCell>
                    <TableCell className="text-center">{stocktake.operator || "待分配"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[stocktake.status]?.variant || "outline"} className={getStatusSemanticClass(stocktake.status, statusMap[stocktake.status]?.label)}>
                        {statusMap[stocktake.status]?.label || stocktake.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(stocktake.date)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(stocktake)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(stocktake)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {stocktake.status === "planned" && (
                            <DropdownMenuItem onClick={() => handleStartStocktake(stocktake)}>
                              <Play className="h-4 w-4 mr-2" />
                              开始盘点
                            </DropdownMenuItem>
                          )}
                          {stocktake.status === "in_progress" && (
                            <DropdownMenuItem onClick={() => handleCompleteStocktake(stocktake)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              完成盘点
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(stocktake)}
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
              <DialogTitle>{editingStocktake ? "编辑盘点计划" : "新建盘点计划"}</DialogTitle>
              <DialogDescription>
                {editingStocktake ? "修改盘点信息" : "创建新的盘点计划"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>盘点单号 *</Label>
                  <Input
                    value={formData.stocktakeNo}
                    onChange={(e) => setFormData({ ...formData, stocktakeNo: e.target.value })}
                    placeholder="盘点单号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>盘点类型 *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as StocktakeRecord["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">全面盘点</SelectItem>
                      <SelectItem value="cycle">循环盘点</SelectItem>
                      <SelectItem value="spot">抽样盘点</SelectItem>
                      <SelectItem value="dynamic">动态盘点</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>盘点仓库 *</Label>
                  <Select
                    value={formData.warehouse}
                    onValueChange={(value) => setFormData({ ...formData, warehouse: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouseList as any[]).map((w: any) => (
                        <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                      ))}
                      {(warehouseList as any[]).length === 0 && (
                        <SelectItem value="原材料仓">原材料仓</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>物料数量</Label>
                  <Input
                    type="number"
                    value={formData.itemCount}
                    onChange={(e) => setFormData({ ...formData, itemCount: e.target.value })}
                    placeholder="盘点物料数量"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>盘点人</Label>
                  <Input
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    placeholder="盘点人"
                  />
                </div>
                <div className="space-y-2">
                  <Label>审核人</Label>
                  <Input
                    value={formData.reviewer}
                    onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                    placeholder="审核人"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>盘点日期</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
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
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingStocktake ? "保存修改" : "创建盘点"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingStocktake && (
      <div className="flex flex-col gap-4">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">盘点计划详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingStocktake.stocktakeNo}
            {viewingStocktake.status && (
              <>
                {' '}
                ·
                <Badge
                  variant={statusMap[viewingStocktake.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(
                    viewingStocktake.status,
                    statusMap[viewingStocktake.status]?.label
                  )}`}
                >
                  {statusMap[viewingStocktake.status]?.label || String(viewingStocktake.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        {/* 基本信息分区 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="盘点类型">{typeMap[viewingStocktake.type]}</FieldRow>
              <FieldRow label="盘点仓库">{viewingStocktake.warehouse}</FieldRow>
              <FieldRow label="物料种类">{viewingStocktake.itemCount > 0 ? `${viewingStocktake.itemCount} 种` : "-"}</FieldRow>
              <FieldRow label="盘盈盘亏">
                <span className={`${viewingStocktake.profitLoss < 0 ? "text-red-600" : viewingStocktake.profitLoss > 0 ? "text-green-600" : ""}`}>
                  {viewingStocktake.profitLoss === 0 ? "-" : `¥${viewingStocktake.profitLoss?.toLocaleString?.() ?? "0"}`}
                </span>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="盘点员">{viewingStocktake.operator || "-"}</FieldRow>
              <FieldRow label="审核员">{viewingStocktake.reviewer || "-"}</FieldRow>
              <FieldRow label="计划日期">{formatDateValue(viewingStocktake.date)}</FieldRow>
              <FieldRow label="完成日期">{formatDateValue(viewingStocktake.completedDate)}</FieldRow>
            </div>
          </div>
        </div>

        {/* 盘点明细表格 */}
        {viewingStocktake.items.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">盘点明细</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">物料编码</TableHead>
                  <TableHead className="text-center font-bold">物料名称</TableHead>
                  <TableHead className="text-center font-bold">系统数量</TableHead>
                  <TableHead className="text-center font-bold">实盘数量</TableHead>
                  <TableHead className="text-center font-bold">差异</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingStocktake.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center">{item.materialCode}</TableCell>
                    <TableCell className="text-center">{item.materialName}</TableCell>
                    <TableCell className="text-center">{item.systemQty} {item.unit}</TableCell>
                    <TableCell className="text-center">{item.actualQty} {item.unit}</TableCell>
                    <TableCell className={`text-right ${item.difference < 0 ? "text-red-600" : item.difference > 0 ? "text-green-600" : ""}`}>
                      {item.difference > 0 ? "+" : ""}{item.difference} {item.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 备注 */}
        {viewingStocktake.remarks && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingStocktake.remarks}</p>
          </div>
        )}

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => {
              setViewDialogOpen(false);
              handleEdit(viewingStocktake);
            }}>编辑</Button>
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
