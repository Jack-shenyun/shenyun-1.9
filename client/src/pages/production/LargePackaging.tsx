import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDate, formatDisplayNumber } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";
import {
  Edit,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

type PackagingType = "box" | "carton" | "pallet" | "other";
type PackagingStatus = "draft" | "completed";

interface LargePackagingRecord {
  id: number;
  recordNo: string;
  productionOrderId?: number | null;
  productionOrderNo?: string;
  productId?: number | null;
  productName?: string;
  specification?: string;
  batchNo?: string;
  packagingDate?: string;
  packagingType: PackagingType;
  packageSpec?: string;
  workshopName?: string;
  packagingTeam?: string;
  quantity?: string;
  unit?: string;
  operator?: string;
  reviewer?: string;
  status: PackagingStatus;
  remark?: string;
}

const PAGE_SIZE = 10;

const packagingTypeMap: Record<PackagingType, string> = {
  box: "单箱复核",
  carton: "纸箱大包装",
  pallet: "托盘包装",
  other: "其他",
};

const statusMap: Record<PackagingStatus, { label: string; variant: "outline" | "default" | "secondary" }> = {
  draft: { label: "草稿", variant: "outline" },
  completed: { label: "已完成", variant: "default" },
};

const emptyForm = {
  recordNo: "",
  productionOrderId: "",
  productionOrderNo: "",
  productId: "",
  productName: "",
  specification: "",
  batchNo: "",
  packagingDate: "",
  packagingType: "carton" as PackagingType,
  packageSpec: "",
  workshopName: "",
  packagingTeam: "",
  quantity: "",
  unit: "个",
  operator: "",
  reviewer: "",
  status: "draft" as PackagingStatus,
  remark: "",
};

function toDateInputValue(value?: string | Date | null) {
  return formatDate(value) || "";
}

function buildNextRecordNo(records: LargePackagingRecord[]) {
  const prefix = `DB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
  const maxNo = records.reduce((max, record) => {
    const match = String(record.recordNo || "").match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) return max;
    return Math.max(max, Number(match[1] || 0));
  }, 0);
  return `${prefix}${String(maxNo + 1).padStart(4, "0")}`;
}

function formatDisplayQty(value: unknown) {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? formatDisplayNumber(num) : String(value ?? "-");
}

function FieldRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{value || "-"}</span>
    </div>
  );
}

export default function LargePackagingPage() {
  const { user } = useAuth();
  const { canDelete } = usePermission();
  const { data: recordData = [], isLoading, refetch } = trpc.largePackagingRecords.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});

  const createMutation = trpc.largePackagingRecords.create.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("大包装记录已保存");
    },
    onError: (error) => toast.error("保存失败", { description: error.message }),
  });
  const updateMutation = trpc.largePackagingRecords.update.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("大包装记录已更新");
    },
    onError: (error) => toast.error("更新失败", { description: error.message }),
  });
  const deleteMutation = trpc.largePackagingRecords.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("大包装记录已删除");
    },
    onError: (error) => toast.error("删除失败", { description: error.message }),
  });

  const records = useMemo<LargePackagingRecord[]>(
    () =>
      ((recordData as any[]) || []).map((item: any) => ({
        ...item,
        packagingDate: toDateInputValue(item.packagingDate),
      })),
    [recordData]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [productionOrderPickerOpen, setProductionOrderPickerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LargePackagingRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<LargePackagingRecord | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const filteredRecords = records.filter((record) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      String(record.recordNo || "").toLowerCase().includes(keyword) ||
      String(record.productionOrderNo || "").toLowerCase().includes(keyword) ||
      String(record.productName || "").toLowerCase().includes(keyword) ||
      String(record.batchNo || "").toLowerCase().includes(keyword);
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      ...emptyForm,
      recordNo: buildNextRecordNo(records),
      packagingDate: new Date().toISOString().slice(0, 10),
      operator: String((user as any)?.name || ""),
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: LargePackagingRecord) => {
    setEditingRecord(record);
    setFormData({
      recordNo: record.recordNo || "",
      productionOrderId: record.productionOrderId ? String(record.productionOrderId) : "",
      productionOrderNo: record.productionOrderNo || "",
      productId: record.productId ? String(record.productId) : "",
      productName: record.productName || "",
      specification: record.specification || "",
      batchNo: record.batchNo || "",
      packagingDate: toDateInputValue(record.packagingDate),
      packagingType: record.packagingType || "carton",
      packageSpec: record.packageSpec || "",
      workshopName: record.workshopName || "",
      packagingTeam: record.packagingTeam || "",
      quantity: String(record.quantity || ""),
      unit: record.unit || "个",
      operator: record.operator || "",
      reviewer: record.reviewer || "",
      status: record.status || "draft",
      remark: record.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (record: LargePackagingRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: LargePackagingRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  const handleProductionOrderChange = (orderId: string) => {
    const order = (productionOrders as any[]).find((item: any) => String(item.id) === String(orderId));
    const product = (products as any[]).find((item: any) => String(item.id) === String(order?.productId || ""));
    setFormData((prev) => ({
      ...prev,
      productionOrderId: orderId,
      productionOrderNo: String(order?.orderNo || ""),
      productId: order?.productId ? String(order.productId) : "",
      productName: String(order?.productName || product?.name || ""),
      specification: String(order?.specification || product?.specification || ""),
      batchNo: String(order?.batchNo || ""),
      quantity: prev.quantity || String(order?.completedQty || order?.plannedQty || ""),
      unit: String(order?.unit || product?.unit || prev.unit || "个"),
      workshopName: String(order?.workshopName || prev.workshopName || ""),
    }));
  };

  const handleSubmit = () => {
    if (!formData.recordNo || !formData.productionOrderId || !formData.batchNo) {
      toast.error("请先选择生产指令", { description: "记录编号、生产指令和批号为必填项" });
      return;
    }

    const payload = {
      recordNo: formData.recordNo,
      productionOrderId: Number(formData.productionOrderId || 0) || undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      productId: Number(formData.productId || 0) || undefined,
      productName: formData.productName || undefined,
      specification: formData.specification || undefined,
      batchNo: formData.batchNo || undefined,
      packagingDate: formData.packagingDate || undefined,
      packagingType: formData.packagingType,
      packageSpec: formData.packageSpec || undefined,
      workshopName: formData.workshopName || undefined,
      packagingTeam: formData.packagingTeam || undefined,
      quantity: formData.quantity || undefined,
      unit: formData.unit || undefined,
      operator: formData.operator || undefined,
      reviewer: formData.reviewer || undefined,
      status: formData.status,
      remark: formData.remark || undefined,
    };

    if (editingRecord?.id) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const draftCount = records.filter((record) => record.status === "draft").length;
  const completedCount = records.filter((record) => record.status === "completed").length;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <PackageCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">大包装记录</h2>
              <p className="text-sm text-muted-foreground">记录标签打印后的外箱/托盘包装过程，自动关联生产批号追溯</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建大包装记录
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">草稿</p><p className="text-2xl font-bold text-amber-600">{draftCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已完成</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总记录数</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索记录编号、生产指令、产品名称、批号..."
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
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">记录编号</TableHead>
                  <TableHead className="text-center font-bold">生产指令</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">批号</TableHead>
                  <TableHead className="text-center font-bold">包装日期</TableHead>
                  <TableHead className="text-center font-bold">包装类型</TableHead>
                  <TableHead className="text-center font-bold">包装数量</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无大包装记录</TableCell></TableRow>
                ) : pagedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-medium font-mono">{record.recordNo}</TableCell>
                    <TableCell className="text-center">{record.productionOrderNo || "-"}</TableCell>
                    <TableCell className="text-center">{record.productName || "-"}</TableCell>
                    <TableCell className="text-center font-mono text-primary">{record.batchNo || "-"}</TableCell>
                    <TableCell className="text-center">{formatDate(record.packagingDate)}</TableCell>
                    <TableCell className="text-center">{packagingTypeMap[record.packagingType] || "-"}</TableCell>
                    <TableCell className="text-center">
                      {record.quantity ? `${formatDisplayQty(record.quantity)} ${record.unit || ""}` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                        {statusMap[record.status]?.label || record.status}
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
                          <DropdownMenuItem onClick={() => handleView(record)}>
                            <Eye className="h-4 w-4 mr-2" />查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Edit className="h-4 w-4 mr-2" />编辑
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDelete(record)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />删除
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

        <TablePaginationFooter total={filteredRecords.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? "编辑大包装记录" : "新建大包装记录"}</DialogTitle>
              <DialogDescription>选择生产指令后自动带出产品、规格、批号和数量，确保批次追溯一致</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>记录编号</Label>
                  <Input value={formData.recordNo} readOnly className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>包装日期</Label>
                  <DateTextInput
                    value={formData.packagingDate}
                    onChange={(value) => setFormData((prev) => ({ ...prev, packagingDate: value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>包装类型</Label>
                  <Select
                    value={formData.packagingType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, packagingType: value as PackagingType }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(packagingTypeMap).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as PackagingStatus }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 items-end">
                <div className="space-y-2 col-span-2">
                  <Label>生产指令</Label>
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setProductionOrderPickerOpen(true)}>
                    {formData.productionOrderNo ? `${formData.productionOrderNo} · ${formData.productName || "-"}` : "选择生产指令"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>产品名称</Label>
                  <Input value={formData.productName} readOnly className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>规格型号</Label>
                  <Input value={formData.specification} readOnly className="bg-muted/30" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>生产批号</Label>
                  <Input value={formData.batchNo} readOnly className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>包装数量</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>包装规格</Label>
                  <Input
                    value={formData.packageSpec}
                    onChange={(e) => setFormData((prev) => ({ ...prev, packageSpec: e.target.value }))}
                    placeholder="如：20支/盒，10盒/箱"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>车间</Label>
                  <Input
                    value={formData.workshopName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, workshopName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>包装班组</Label>
                  <Input
                    value={formData.packagingTeam}
                    onChange={(e) => setFormData((prev) => ({ ...prev, packagingTeam: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>操作人</Label>
                  <Input
                    value={formData.operator}
                    onChange={(e) => setFormData((prev) => ({ ...prev, operator: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>复核人</Label>
                  <Input
                    value={formData.reviewer}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reviewer: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>{editingRecord ? "保存修改" : "创建记录"}</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            {viewingRecord && (
              <div className="space-y-4">
                {(() => {
                  const largePackagingPrintData = {
                    recordNo: viewingRecord.recordNo || "",
                    productionOrderNo: viewingRecord.productionOrderNo || "",
                    productName: viewingRecord.productName || "",
                    specification: viewingRecord.specification || "",
                    batchNo: viewingRecord.batchNo || "",
                    packagingDate: viewingRecord.packagingDate || "",
                    packagingType: packagingTypeMap[viewingRecord.packagingType] || viewingRecord.packagingType || "",
                    packageSpec: viewingRecord.packageSpec || "",
                    quantity: Number(viewingRecord.quantity || 0),
                    unit: viewingRecord.unit || "",
                    workshopName: viewingRecord.workshopName || "",
                    packagingTeam: viewingRecord.packagingTeam || "",
                    operator: viewingRecord.operator || "",
                    reviewer: viewingRecord.reviewer || "",
                    status: statusMap[viewingRecord.status]?.label || viewingRecord.status || "",
                    remark: viewingRecord.remark || "",
                  };
                  return (
                    <>
                <DialogHeader>
                  <DialogTitle>大包装记录详情</DialogTitle>
                  <DialogDescription>{viewingRecord.recordNo}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-8 border border-slate-200 bg-white px-4 py-3">
                  <FieldRow label="记录编号" value={viewingRecord.recordNo} />
                  <FieldRow label="生产指令" value={viewingRecord.productionOrderNo} />
                  <FieldRow label="产品名称" value={viewingRecord.productName} />
                  <FieldRow label="规格型号" value={viewingRecord.specification} />
                  <FieldRow label="批号" value={viewingRecord.batchNo} />
                  <FieldRow label="包装日期" value={formatDate(viewingRecord.packagingDate)} />
                  <FieldRow label="包装类型" value={packagingTypeMap[viewingRecord.packagingType] || "-"} />
                  <FieldRow label="包装规格" value={viewingRecord.packageSpec} />
                  <FieldRow label="数量" value={viewingRecord.quantity ? `${formatDisplayQty(viewingRecord.quantity)} ${viewingRecord.unit || ""}` : "-"} />
                  <FieldRow label="车间" value={viewingRecord.workshopName} />
                  <FieldRow label="包装班组" value={viewingRecord.packagingTeam} />
                  <FieldRow label="操作人" value={viewingRecord.operator} />
                  <FieldRow label="复核人" value={viewingRecord.reviewer} />
                  <FieldRow label="状态" value={statusMap[viewingRecord.status]?.label || viewingRecord.status} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">备注</p>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm min-h-24">
                    {viewingRecord.remark || "-"}
                  </div>
                </div>
                <DialogFooter>
                  <TemplatePrintPreviewButton
                    templateKey="large_packaging"
                    data={largePackagingPrintData}
                    title={`大包装记录打印预览 - ${viewingRecord.recordNo}`}
                  />
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                </DialogFooter>
                    </>
                  );
                })()}
              </div>
            )}
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={productionOrderPickerOpen}
          onOpenChange={setProductionOrderPickerOpen}
          title="选择生产指令"
          searchPlaceholder="搜索生产指令、产品、批号..."
          columns={[
            { key: "orderNo", title: "指令单号", render: (row: any) => <span className="font-mono font-medium">{row.orderNo || "-"}</span> },
            { key: "productName", title: "产品名称", render: (row: any) => <span>{row.productName || "-"}</span> },
            { key: "specification", title: "规格型号", render: (row: any) => <span>{row.specification || "-"}</span> },
            { key: "batchNo", title: "生产批号", render: (row: any) => <span>{row.batchNo || "-"}</span> },
            { key: "plannedQty", title: "数量", render: (row: any) => <span>{formatDisplayQty(row.completedQty || row.plannedQty)} {row.unit || ""}</span> },
          ]}
          rows={(productionOrders as any[]).filter((row: any) => String(row.status || "") !== "cancelled")}
          selectedId={formData.productionOrderId || null}
          getRowId={(row: any) => row.id}
          onSelect={(row: any) => {
            handleProductionOrderChange(String(row.id));
            setProductionOrderPickerOpen(false);
          }}
          filterFn={(row: any, query: string) => {
            const lower = query.toLowerCase();
            return [row.orderNo, row.productName, row.batchNo, row.specification]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="暂无生产指令数据"
        />
      </div>
    </ERPLayout>
  );
}
