import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
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
import { formatDate, formatDateTime, formatDateValue } from "@/lib/formatters";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

type ReviewStatus = "draft" | "pending" | "approved" | "rejected";
type CompletenessStatus = "complete" | "incomplete";

interface BatchReviewRecord {
  id: number;
  reviewNo: string;
  productionOrderId?: number | null;
  productionOrderNo?: string;
  productId?: number | null;
  productName?: string;
  specification?: string;
  batchNo?: string;
  reviewDate?: string | Date | null;
  reviewer?: string;
  completenessStatus: CompletenessStatus;
  status: ReviewStatus;
  missingItems?: string;
  reviewOpinion?: string;
  remark?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

const PAGE_SIZE = 10;

const reviewStatusMap: Record<ReviewStatus, { label: string; variant: "outline" | "default" | "secondary"; className: string }> = {
  draft: { label: "草稿", variant: "outline", className: "bg-slate-50 text-slate-700 border-slate-200" },
  pending: { label: "待审核", variant: "secondary", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "已通过", variant: "default", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "已驳回", variant: "outline", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

const completenessMap: Record<CompletenessStatus, { label: string; className: string }> = {
  complete: { label: "资料完整", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  incomplete: { label: "资料缺失", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

const emptyForm = {
  reviewNo: "",
  productionOrderId: "",
  productionOrderNo: "",
  productId: "",
  productName: "",
  specification: "",
  batchNo: "",
  reviewDate: "",
  reviewer: "",
  completenessStatus: "complete" as CompletenessStatus,
  status: "draft" as ReviewStatus,
  missingItems: "",
  reviewOpinion: "",
  remark: "",
};

function toDateInputValue(value?: string | Date | null) {
  return formatDate(value) || "";
}

function buildNextReviewNo(records: BatchReviewRecord[]) {
  const prefix = `BR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
  const maxNo = records.reduce((max, record) => {
    const match = String(record.reviewNo || "").match(new RegExp(`^${prefix}(\\d+)$`));
    if (!match) return max;
    return Math.max(max, Number(match[1] || 0));
  }, 0);
  return `${prefix}${String(maxNo + 1).padStart(4, "0")}`;
}

function FieldRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid min-h-10 grid-cols-[112px_1fr] border-b border-slate-200 text-sm last:border-0">
      <span className="flex items-center bg-slate-50 px-3 text-slate-500">{label}</span>
      <span className="flex items-center px-3 font-medium text-slate-800">{value || "-"}</span>
    </div>
  );
}

export default function BatchReviewPage() {
  const { user } = useAuth();
  const { data: recordData = [], isLoading, refetch } = trpc.batchRecordReviewRecords.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});

  const createMutation = trpc.batchRecordReviewRecords.create.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("批记录审核记录已保存");
    },
    onError: (error) => toast.error("保存失败", { description: error.message }),
  });
  const updateMutation = trpc.batchRecordReviewRecords.update.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("批记录审核记录已更新");
    },
    onError: (error) => toast.error("更新失败", { description: error.message }),
  });
  const deleteMutation = trpc.batchRecordReviewRecords.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("批记录审核记录已删除");
    },
    onError: (error) => toast.error("删除失败", { description: error.message }),
  });

  const records = useMemo<BatchReviewRecord[]>(
    () =>
      ((recordData as any[]) || []).map((item: any) => ({
        ...item,
        reviewDate: item.reviewDate,
      })),
    [recordData],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BatchReviewRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<BatchReviewRecord | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const filteredRecords = records.filter((record) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      String(record.reviewNo || "").toLowerCase().includes(keyword) ||
      String(record.batchNo || "").toLowerCase().includes(keyword) ||
      String(record.productName || "").toLowerCase().includes(keyword) ||
      String(record.productionOrderNo || "").toLowerCase().includes(keyword);
    const matchesStatus = statusFilter === "all" || String(record.status || "") === statusFilter;
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
      reviewNo: buildNextReviewNo(records),
      reviewDate: new Date().toISOString().slice(0, 10),
      reviewer: String((user as any)?.name || ""),
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: BatchReviewRecord) => {
    setEditingRecord(record);
    setFormData({
      reviewNo: record.reviewNo || "",
      productionOrderId: record.productionOrderId ? String(record.productionOrderId) : "",
      productionOrderNo: record.productionOrderNo || "",
      productId: record.productId ? String(record.productId) : "",
      productName: record.productName || "",
      specification: record.specification || "",
      batchNo: record.batchNo || "",
      reviewDate: toDateInputValue(record.reviewDate),
      reviewer: record.reviewer || "",
      completenessStatus: record.completenessStatus || "complete",
      status: record.status || "draft",
      missingItems: record.missingItems || "",
      reviewOpinion: record.reviewOpinion || "",
      remark: record.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (record: BatchReviewRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: BatchReviewRecord) => {
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
    }));
  };

  const handleSubmit = () => {
    if (!formData.reviewNo || !formData.productionOrderId || !formData.batchNo) {
      toast.error("请先选择生产指令", { description: "审核单号、生产指令和批号为必填项" });
      return;
    }

    const payload = {
      reviewNo: formData.reviewNo,
      productionOrderId: Number(formData.productionOrderId || 0) || undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      productId: Number(formData.productId || 0) || undefined,
      productName: formData.productName || undefined,
      specification: formData.specification || undefined,
      batchNo: formData.batchNo || "",
      reviewDate: formData.reviewDate || undefined,
      reviewer: formData.reviewer || undefined,
      completenessStatus: formData.completenessStatus,
      status: formData.status,
      missingItems: formData.missingItems || undefined,
      reviewOpinion: formData.reviewOpinion || undefined,
      remark: formData.remark || undefined,
    };

    if (editingRecord?.id) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          reviewDate: payload.reviewDate,
          reviewer: payload.reviewer,
          completenessStatus: payload.completenessStatus,
          status: payload.status,
          missingItems: payload.missingItems,
          reviewOpinion: payload.reviewOpinion,
          remark: payload.remark,
        },
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const pendingCount = records.filter((record) => record.status === "pending").length;
  const approvedCount = records.filter((record) => record.status === "approved").length;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">批记录审核记录</h1>
              <p className="text-sm text-muted-foreground">按生产批号沉淀批记录完整性审核结果，作为法规放行前置依据</p>
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            新建审核记录
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待审核</p><p className="text-3xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已通过</p><p className="text-3xl font-bold text-emerald-600">{approvedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总记录数</p><p className="text-3xl font-bold">{filteredRecords.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索审核单号、批号、产品名称、生产指令..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="全部状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-center">审核单号</TableHead>
                    <TableHead className="text-center">产品名称</TableHead>
                    <TableHead className="text-center">批号</TableHead>
                    <TableHead className="text-center">生产指令</TableHead>
                    <TableHead className="text-center">完整性</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="text-center">审核日期</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        {isLoading ? "加载中..." : "暂无批记录审核记录"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-center font-mono text-xs">{record.reviewNo || "-"}</TableCell>
                        <TableCell className="text-center">{record.productName || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{record.batchNo || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{record.productionOrderNo || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={completenessMap[String(record.completenessStatus || "complete") as CompletenessStatus]?.className || ""}>
                            {completenessMap[String(record.completenessStatus || "complete") as CompletenessStatus]?.label || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={reviewStatusMap[String(record.status || "draft") as ReviewStatus]?.variant || "outline"} className={reviewStatusMap[String(record.status || "draft") as ReviewStatus]?.className || ""}>
                            {reviewStatusMap[String(record.status || "draft") as ReviewStatus]?.label || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{formatDateValue(record.reviewDate)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleView(record)}>
                                <Eye className="mr-2 h-4 w-4" /> 查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEdit(record)}>
                                <Edit className="mr-2 h-4 w-4" /> 编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(record)}>
                                <Trash2 className="mr-2 h-4 w-4" /> 删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePaginationFooter total={filteredRecords.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[88vh] overflow-y-auto">
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{editingRecord ? "编辑批记录审核记录" : "新建批记录审核记录"}</DialogTitle>
                <DialogDescription>从生产指令自动带出批号、产品和规格，审核人只补充完整性与意见</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>审核单号</Label>
                  <Input value={formData.reviewNo} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>生产指令</Label>
                  <Select value={formData.productionOrderId || "__none__"} onValueChange={(value) => handleProductionOrderChange(value === "__none__" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="选择生产指令" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">请选择</SelectItem>
                      {(productionOrders as any[]).map((order: any) => (
                        <SelectItem key={order.id} value={String(order.id)}>{order.orderNo || order.batchNo || `生产指令#${order.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>产品名称</Label>
                  <Input value={formData.productName} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>规格型号</Label>
                  <Input value={formData.specification} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>生产批号</Label>
                  <Input value={formData.batchNo} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>审核日期</Label>
                  <DateTextInput value={formData.reviewDate} onChange={(value) => setFormData((prev) => ({ ...prev, reviewDate: value }))} />
                </div>
                <div className="space-y-2">
                  <Label>审核人</Label>
                  <Input value={formData.reviewer} onChange={(event) => setFormData((prev) => ({ ...prev, reviewer: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>完整性</Label>
                  <Select value={formData.completenessStatus} onValueChange={(value) => setFormData((prev) => ({ ...prev, completenessStatus: value as CompletenessStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complete">资料完整</SelectItem>
                      <SelectItem value="incomplete">资料缺失</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as ReviewStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="pending">待审核</SelectItem>
                      <SelectItem value="approved">已通过</SelectItem>
                      <SelectItem value="rejected">已驳回</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>缺失项</Label>
                <Textarea value={formData.missingItems} onChange={(event) => setFormData((prev) => ({ ...prev, missingItems: event.target.value }))} placeholder="自动审核发现的缺失项或人工补充说明" />
              </div>
              <div className="space-y-2">
                <Label>审核意见</Label>
                <Textarea value={formData.reviewOpinion} onChange={(event) => setFormData((prev) => ({ ...prev, reviewOpinion: event.target.value }))} placeholder="填写批记录审核意见" />
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(event) => setFormData((prev) => ({ ...prev, remark: event.target.value }))} placeholder="补充说明" />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRecord ? "保存修改" : "创建记录"}
                </Button>
              </DialogFooter>
            </div>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[88vh] overflow-y-auto">
            {viewingRecord && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>批记录审核记录详情</DialogTitle>
                  <DialogDescription>{viewingRecord.reviewNo || "-"}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-8 border border-slate-200">
                  <FieldRow label="审核单号" value={viewingRecord.reviewNo} />
                  <FieldRow label="审核日期" value={formatDate(viewingRecord.reviewDate as any)} />
                  <FieldRow label="生产指令" value={viewingRecord.productionOrderNo} />
                  <FieldRow label="审核人" value={viewingRecord.reviewer} />
                  <FieldRow label="产品名称" value={viewingRecord.productName} />
                  <FieldRow label="完整性" value={completenessMap[String(viewingRecord.completenessStatus || "complete") as CompletenessStatus]?.label || "-"} />
                  <FieldRow label="规格型号" value={viewingRecord.specification} />
                  <FieldRow label="状态" value={reviewStatusMap[String(viewingRecord.status || "draft") as ReviewStatus]?.label || "-"} />
                  <FieldRow label="生产批号" value={viewingRecord.batchNo} />
                  <FieldRow label="更新时间" value={formatDateTime(viewingRecord.updatedAt as any)} />
                </div>

                <div className="space-y-2">
                  <Label>缺失项</Label>
                  <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">{viewingRecord.missingItems || "-"}</div>
                </div>
                <div className="space-y-2">
                  <Label>审核意见</Label>
                  <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">{viewingRecord.reviewOpinion || "-"}</div>
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">{viewingRecord.remark || "-"}</div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                  <Button onClick={() => {
                    setViewDialogOpen(false);
                    handleEdit(viewingRecord);
                  }}>
                    编辑
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
