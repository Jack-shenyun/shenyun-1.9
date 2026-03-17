import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type ReleaseStatus = "draft" | "released" | "rejected";
type ReleaseDecision = "approved" | "conditional" | "rejected";

interface RegulatoryReleaseRecord {
  id: number;
  releaseNo: string;
  productionOrderId?: number | null;
  productionOrderNo?: string;
  productId?: number | null;
  productName?: string;
  specification?: string;
  batchNo?: string;
  sterilizationBatchNo?: string;
  releaseDate?: string | Date | null;
  approver?: string;
  decision: ReleaseDecision;
  status: ReleaseStatus;
  basisSummary?: string;
  relatedReviewNo?: string;
  remark?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

const PAGE_SIZE = 10;

const releaseStatusMap: Record<ReleaseStatus, { label: string; variant: "outline" | "default" | "secondary"; className: string }> = {
  draft: { label: "草稿", variant: "outline", className: "bg-slate-50 text-slate-700 border-slate-200" },
  released: { label: "已放行", variant: "default", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "已驳回", variant: "outline", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

const decisionMap: Record<ReleaseDecision, { label: string; className: string }> = {
  approved: { label: "同意放行", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  conditional: { label: "附条件放行", className: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected: { label: "不予放行", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

const emptyForm = {
  releaseNo: "",
  productionOrderId: "",
  productionOrderNo: "",
  productId: "",
  productName: "",
  specification: "",
  batchNo: "",
  sterilizationBatchNo: "",
  releaseDate: "",
  approver: "",
  decision: "approved" as ReleaseDecision,
  status: "draft" as ReleaseStatus,
  basisSummary: "",
  relatedReviewNo: "",
  remark: "",
};

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function buildNextReleaseNo(records: RegulatoryReleaseRecord[]) {
  const prefix = `RF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
  const maxNo = records.reduce((max, record) => {
    const match = String(record.releaseNo || "").match(new RegExp(`^${prefix}(\\d+)$`));
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

export default function RegulatoryReleasePage() {
  const { user } = useAuth();
  const { data: recordData = [], isLoading, refetch } = trpc.regulatoryReleaseRecords.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: sterilizationOrders = [] } = trpc.sterilizationOrders.list.useQuery({});
  const { data: reviewRecords = [] } = trpc.batchRecordReviewRecords.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});

  const createMutation = trpc.regulatoryReleaseRecords.create.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("法规放行记录已保存");
    },
    onError: (error) => toast.error("保存失败", { description: error.message }),
  });
  const updateMutation = trpc.regulatoryReleaseRecords.update.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      toast.success("法规放行记录已更新");
    },
    onError: (error) => toast.error("更新失败", { description: error.message }),
  });
  const deleteMutation = trpc.regulatoryReleaseRecords.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("法规放行记录已删除");
    },
    onError: (error) => toast.error("删除失败", { description: error.message }),
  });

  const records = useMemo<RegulatoryReleaseRecord[]>(
    () => ((recordData as any[]) || []).map((item: any) => ({ ...item })),
    [recordData],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RegulatoryReleaseRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<RegulatoryReleaseRecord | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const filteredRecords = records.filter((record) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      String(record.releaseNo || "").toLowerCase().includes(keyword) ||
      String(record.batchNo || "").toLowerCase().includes(keyword) ||
      String(record.productName || "").toLowerCase().includes(keyword) ||
      String(record.productionOrderNo || "").toLowerCase().includes(keyword) ||
      String(record.sterilizationBatchNo || "").toLowerCase().includes(keyword);
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
      releaseNo: buildNextReleaseNo(records),
      releaseDate: new Date().toISOString().slice(0, 10),
      approver: String((user as any)?.name || ""),
      basisSummary: "依据批记录审核、灭菌结果、成品检验与UDI资料综合评估后放行。",
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: RegulatoryReleaseRecord) => {
    setEditingRecord(record);
    setFormData({
      releaseNo: record.releaseNo || "",
      productionOrderId: record.productionOrderId ? String(record.productionOrderId) : "",
      productionOrderNo: record.productionOrderNo || "",
      productId: record.productId ? String(record.productId) : "",
      productName: record.productName || "",
      specification: record.specification || "",
      batchNo: record.batchNo || "",
      sterilizationBatchNo: record.sterilizationBatchNo || "",
      releaseDate: toDateInputValue(record.releaseDate),
      approver: record.approver || "",
      decision: record.decision || "approved",
      status: record.status || "draft",
      basisSummary: record.basisSummary || "",
      relatedReviewNo: record.relatedReviewNo || "",
      remark: record.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (record: RegulatoryReleaseRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: RegulatoryReleaseRecord) => {
    deleteMutation.mutate({ id: record.id });
  };

  const handleProductionOrderChange = (orderId: string) => {
    const order = (productionOrders as any[]).find((item: any) => String(item.id) === String(orderId));
    const product = (products as any[]).find((item: any) => String(item.id) === String(order?.productId || ""));
    const latestSterilization = ((sterilizationOrders as any[]) || [])
      .filter((item: any) =>
        String(item.productionOrderId || "") === String(orderId) ||
        String(item.batchNo || "") === String(order?.batchNo || ""),
      )
      .sort((a: any, b: any) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime())[0];
    const latestReview = ((reviewRecords as any[]) || [])
      .filter((item: any) =>
        String(item.productionOrderId || "") === String(orderId) ||
        String(item.batchNo || "") === String(order?.batchNo || ""),
      )
      .sort((a: any, b: any) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime())[0];

    setFormData((prev) => ({
      ...prev,
      productionOrderId: orderId,
      productionOrderNo: String(order?.orderNo || ""),
      productId: order?.productId ? String(order.productId) : "",
      productName: String(order?.productName || product?.name || ""),
      specification: String(order?.specification || product?.specification || ""),
      batchNo: String(order?.batchNo || ""),
      sterilizationBatchNo: String(latestSterilization?.sterilizationBatchNo || latestSterilization?.batchNo || ""),
      relatedReviewNo: String(latestReview?.reviewNo || ""),
    }));
  };

  const handleSubmit = () => {
    if (!formData.releaseNo || !formData.productionOrderId || !formData.batchNo) {
      toast.error("请先选择生产指令", { description: "放行单号、生产指令和批号为必填项" });
      return;
    }

    const payload = {
      releaseNo: formData.releaseNo,
      productionOrderId: Number(formData.productionOrderId || 0) || undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      productId: Number(formData.productId || 0) || undefined,
      productName: formData.productName || undefined,
      specification: formData.specification || undefined,
      batchNo: formData.batchNo || "",
      sterilizationBatchNo: formData.sterilizationBatchNo || undefined,
      releaseDate: formData.releaseDate || undefined,
      approver: formData.approver || undefined,
      decision: formData.decision,
      status: formData.status,
      basisSummary: formData.basisSummary || undefined,
      relatedReviewNo: formData.relatedReviewNo || undefined,
      remark: formData.remark || undefined,
    };

    if (editingRecord?.id) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          sterilizationBatchNo: payload.sterilizationBatchNo,
          releaseDate: payload.releaseDate,
          approver: payload.approver,
          decision: payload.decision,
          status: payload.status,
          basisSummary: payload.basisSummary,
          relatedReviewNo: payload.relatedReviewNo,
          remark: payload.remark,
        },
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const draftCount = records.filter((record) => record.status === "draft").length;
  const releasedCount = records.filter((record) => record.status === "released").length;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">法规放行记录</h1>
              <p className="text-sm text-muted-foreground">结合批记录审核、灭菌结果与成品检验，形成批号级法规放行留档</p>
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            新建放行记录
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">草稿</p><p className="text-3xl font-bold text-slate-700">{draftCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已放行</p><p className="text-3xl font-bold text-emerald-600">{releasedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总记录数</p><p className="text-3xl font-bold">{filteredRecords.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索放行单号、批号、产品名称、灭菌批号..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="全部状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="released">已放行</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-center">放行单号</TableHead>
                    <TableHead className="text-center">产品名称</TableHead>
                    <TableHead className="text-center">批号</TableHead>
                    <TableHead className="text-center">灭菌批号</TableHead>
                    <TableHead className="text-center">放行决定</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="text-center">放行日期</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        {isLoading ? "加载中..." : "暂无法规放行记录"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-center font-mono text-xs">{record.releaseNo || "-"}</TableCell>
                        <TableCell className="text-center">{record.productName || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{record.batchNo || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{record.sterilizationBatchNo || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={decisionMap[String(record.decision || "approved") as ReleaseDecision]?.className || ""}>
                            {decisionMap[String(record.decision || "approved") as ReleaseDecision]?.label || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={releaseStatusMap[String(record.status || "draft") as ReleaseStatus]?.variant || "outline"} className={releaseStatusMap[String(record.status || "draft") as ReleaseStatus]?.className || ""}>
                            {releaseStatusMap[String(record.status || "draft") as ReleaseStatus]?.label || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{formatDateValue(record.releaseDate)}</TableCell>
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
                <DialogTitle>{editingRecord ? "编辑法规放行记录" : "新建法规放行记录"}</DialogTitle>
                <DialogDescription>按生产批号自动带出灭菌批号和批记录审核记录，放行人只补充决定与说明</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>放行单号</Label>
                  <Input value={formData.releaseNo} readOnly className="bg-slate-50" />
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
                  <Label>灭菌批号</Label>
                  <Input value={formData.sterilizationBatchNo} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>关联审核单</Label>
                  <Input value={formData.relatedReviewNo} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>放行日期</Label>
                  <Input type="date" value={formData.releaseDate} onChange={(event) => setFormData((prev) => ({ ...prev, releaseDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>放行人</Label>
                  <Input value={formData.approver} onChange={(event) => setFormData((prev) => ({ ...prev, approver: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>放行决定</Label>
                  <Select value={formData.decision} onValueChange={(value) => setFormData((prev) => ({ ...prev, decision: value as ReleaseDecision }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">同意放行</SelectItem>
                      <SelectItem value="conditional">附条件放行</SelectItem>
                      <SelectItem value="rejected">不予放行</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as ReleaseStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="released">已放行</SelectItem>
                      <SelectItem value="rejected">已驳回</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>放行依据</Label>
                <Textarea value={formData.basisSummary} onChange={(event) => setFormData((prev) => ({ ...prev, basisSummary: event.target.value }))} placeholder="填写法规放行依据摘要" />
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
                  <DialogTitle>法规放行记录详情</DialogTitle>
                  <DialogDescription>{viewingRecord.releaseNo || "-"}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-8 border border-slate-200">
                  <FieldRow label="放行单号" value={viewingRecord.releaseNo} />
                  <FieldRow label="放行日期" value={formatDate(viewingRecord.releaseDate as any)} />
                  <FieldRow label="生产指令" value={viewingRecord.productionOrderNo} />
                  <FieldRow label="放行人" value={viewingRecord.approver} />
                  <FieldRow label="产品名称" value={viewingRecord.productName} />
                  <FieldRow label="放行决定" value={decisionMap[String(viewingRecord.decision || "approved") as ReleaseDecision]?.label || "-"} />
                  <FieldRow label="规格型号" value={viewingRecord.specification} />
                  <FieldRow label="状态" value={releaseStatusMap[String(viewingRecord.status || "draft") as ReleaseStatus]?.label || "-"} />
                  <FieldRow label="生产批号" value={viewingRecord.batchNo} />
                  <FieldRow label="灭菌批号" value={viewingRecord.sterilizationBatchNo} />
                  <FieldRow label="关联审核单" value={viewingRecord.relatedReviewNo} />
                  <FieldRow label="更新时间" value={formatDateTime(viewingRecord.updatedAt as any)} />
                </div>

                <div className="space-y-2">
                  <Label>放行依据</Label>
                  <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">{viewingRecord.basisSummary || "-"}</div>
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
