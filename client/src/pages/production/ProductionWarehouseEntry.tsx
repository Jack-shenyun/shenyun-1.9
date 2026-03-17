import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { formatDate, formatDisplayNumber } from "@/lib/formatters";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Warehouse, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, Bell, Calculator, AlertCircle, Upload, Download, FileText,
} from "lucide-react";
import { deleteEntry as deleteFileEntry, downloadFile, formatFileSize } from "@/lib/fileManagerApi";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  draft:     { label: "草稿",   variant: "outline" },
  pending:   { label: "待审批", variant: "default" },
  approved:  { label: "已审批", variant: "secondary" },
  completed: { label: "已入库", variant: "secondary" },
  rejected:  { label: "已拒绝", variant: "destructive" },
};

const emptyForm = {
  entryNo: "",
  productionOrderId: "",
  productionOrderNo: "",
  sterilizationOrderId: "",
  sterilizationOrderNo: "",
  productId: "",
  productName: "",
  batchNo: "",
  sterilizationBatchNo: "",
  // 公式字段
  sterilizedQty: "",       // 灭菌后数量
  inspectionRejectQty: "", // 检验报废数量
  sampleQty: "",           // 留样数量
  quantity: "",            // 入库数量（可手动修改）
  quantityModifyReason: "", // 修改原因
  unit: "件",
  targetWarehouseId: "",
  applicationDate: "",
  remark: "",
};

type SterilizationProofMeta = {
  fileName: string;
  filePath: string;
  fileSize?: number;
  uploadedAt?: string;
};

const PROOF_UPLOAD_DIR = "/ERP/知识库/生产部/生产入库申请/灭菌证明";

function sanitizeFileNamePart(value: unknown) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

function parseEntryRemark(remark: unknown): { note: string; sterilizationProof: SterilizationProofMeta | null } {
  const text = String(remark || "").trim();
  if (!text) return { note: "", sterilizationProof: null };
  if (!text.startsWith("{")) return { note: text, sterilizationProof: null };
  try {
    const parsed = JSON.parse(text);
    const proof = parsed?.sterilizationProof;
    return {
      note: typeof parsed?.note === "string" ? parsed.note : typeof parsed?.remark === "string" ? parsed.remark : "",
      sterilizationProof: proof?.filePath && proof?.fileName
        ? {
            fileName: String(proof.fileName),
            filePath: String(proof.filePath),
            fileSize: proof.fileSize ? Number(proof.fileSize) : undefined,
            uploadedAt: proof.uploadedAt ? String(proof.uploadedAt) : undefined,
          }
        : null,
    };
  } catch {
    return { note: text, sterilizationProof: null };
  }
}

function buildEntryRemark(note: string, sterilizationProof: SterilizationProofMeta | null) {
  const nextNote = String(note || "").trim();
  if (!sterilizationProof) return nextNote;
  return JSON.stringify({
    note: nextNote,
    sterilizationProof,
  });
}

function buildSterilizationProofFileName(productName: string, sterilizationBatchNo: string, batchNo: string) {
  const parts = [productName, sterilizationBatchNo, batchNo]
    .map(sanitizeFileNamePart)
    .filter(Boolean);
  return `${parts.join("+") || "灭菌证明"}.pdf`;
}

function formatQtyDisplay(value: unknown) {
  const num = Number(String(value ?? "").trim());
  if (!Number.isFinite(num)) return String(value ?? "-");
  return formatDisplayNumber(num);
}

export default function ProductionWarehouseEntryPage() {
  const PAGE_SIZE = 10;
  const { canDelete } = usePermission();
  const { data: entries = [], isLoading, refetch } = trpc.productionWarehouseEntries.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: sterilizationOrders = [] } = trpc.sterilizationOrders.list.useQuery({});
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});

  const createMutation = trpc.productionWarehouseEntries.create.useMutation({
    onSuccess: () => { refetch(); toast.success("入库申请已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.productionWarehouseEntries.update.useMutation({
    onSuccess: () => { refetch(); toast.success("入库申请已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.productionWarehouseEntries.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("入库申请已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [productionOrderPickerOpen, setProductionOrderPickerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [viewingEntry, setViewingEntry] = useState<any>(null);
  const [quantityManuallyEdited, setQuantityManuallyEdited] = useState(false);
  const [sterilizationProof, setSterilizationProof] = useState<SterilizationProofMeta | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const focusHandledRef = useRef(false);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({ ...emptyForm });

  // 自动计算入库数量公式：灭菌后数量 - 检验报废数量 - 留样数量
  useEffect(() => {
    if (quantityManuallyEdited) return; // 手动修改后不再自动覆盖
    const s = parseFloat(formData.sterilizedQty) || 0;
    const r = parseFloat(formData.inspectionRejectQty) || 0;
    const sp = parseFloat(formData.sampleQty) || 0;
    if (s > 0) {
      const calc = Math.max(0, s - r - sp);
      setFormData((f) => ({ ...f, quantity: String(calc) }));
    }
  }, [formData.sterilizedQty, formData.inspectionRejectQty, formData.sampleQty, quantityManuallyEdited]);

  const filteredEntries = (entries as any[]).filter((e) => {
    const matchSearch = !searchTerm ||
      String(e.entryNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filteredEntries.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const findLinkedSterilization = (productionOrderId: string, batchNo: string) => {
    return (sterilizationOrders as any[])
      .filter((item: any) =>
        String(item.productionOrderId || "") === String(productionOrderId || "") || String(item.batchNo || "") === String(batchNo || "")
      )
      .sort((a: any, b: any) => {
        const aTime = new Date(String(a.updatedAt || a.createdAt || 0)).getTime();
        const bTime = new Date(String(b.updatedAt || b.createdAt || 0)).getTime();
        return bTime - aTime;
      })[0];
  };

  const handleAdd = () => {
    setEditingEntry(null);
    setQuantityManuallyEdited(false);
    setSterilizationProof(null);
    setFormData({ ...emptyForm, entryNo: "", applicationDate: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  };

  const handleEdit = (entry: any) => {
    const remarkMeta = parseEntryRemark(entry.remark);
    setEditingEntry(entry);
    setQuantityManuallyEdited(true); // 编辑时不自动覆盖
    setSterilizationProof(remarkMeta.sterilizationProof);
    setFormData({
      entryNo: entry.entryNo,
      productionOrderId: entry.productionOrderId ? String(entry.productionOrderId) : "",
      productionOrderNo: entry.productionOrderNo || "",
      sterilizationOrderId: entry.sterilizationOrderId ? String(entry.sterilizationOrderId) : "",
      sterilizationOrderNo: entry.sterilizationOrderNo || "",
      productId: entry.productId ? String(entry.productId) : "",
      productName: entry.productName || "",
      batchNo: entry.batchNo || "",
      sterilizationBatchNo: entry.sterilizationBatchNo || "",
      sterilizedQty: entry.sterilizedQty || "",
      inspectionRejectQty: entry.inspectionRejectQty || "",
      sampleQty: entry.sampleQty || "",
      quantity: entry.quantity || "",
      quantityModifyReason: entry.quantityModifyReason || "",
      unit: entry.unit || "件",
      targetWarehouseId: entry.targetWarehouseId ? String(entry.targetWarehouseId) : "",
      applicationDate: entry.applicationDate ? String(entry.applicationDate).split("T")[0] : "",
      remark: remarkMeta.note,
    });
    setDialogOpen(true);
  };

  const handleView = (entry: any) => { setViewingEntry(entry); setViewDialogOpen(true); };
  const handleDelete = (entry: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: entry.id });
  };

  const handleProductionOrderChange = (poId: string) => {
    const po = (productionOrders as any[]).find((p) => String(p.id) === poId);
    const linkedProduct = (products as any[]).find((item: any) => String(item.id) === String(po?.productId || ""));
    const linkedSterilization = findLinkedSterilization(poId, String(po?.batchNo || ""));
    if (
      sterilizationProof?.filePath &&
      (
        String(formData.productionOrderId || "") !== String(poId) ||
        String(formData.batchNo || "") !== String(po?.batchNo || "") ||
        String(formData.sterilizationBatchNo || "") !== String(linkedSterilization?.sterilizationBatchNo || "")
      )
    ) {
      setSterilizationProof(null);
      toast.info("生产/灭菌信息已变化，请重新上传灭菌证明");
    }
    setFormData((f) => ({
      ...f,
      productionOrderId: poId,
      productionOrderNo: po?.orderNo || "",
      sterilizationOrderId: linkedSterilization?.id ? String(linkedSterilization.id) : "",
      sterilizationOrderNo: linkedSterilization?.orderNo || "",
      productId: po?.productId ? String(po.productId) : f.productId,
      productName: po?.productName || linkedProduct?.name || f.productName,
      batchNo: po?.batchNo || f.batchNo,
      sterilizationBatchNo: linkedSterilization?.sterilizationBatchNo || "",
      sterilizedQty: linkedSterilization?.quantity || f.sterilizedQty,
      unit: linkedSterilization?.unit || po?.unit || linkedProduct?.unit || f.unit,
    }));
    setQuantityManuallyEdited(false);
  };

  const handleUploadSterilizationProof = async (file?: File | null) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      toast.error("仅支持上传 PDF 文件");
      if (proofInputRef.current) proofInputRef.current.value = "";
      return;
    }
    if (!formData.productName || !formData.sterilizationBatchNo || !formData.batchNo) {
      toast.error("请先选择生产指令并带出产品名称、灭菌批号、生产批号");
      if (proofInputRef.current) proofInputRef.current.value = "";
      return;
    }
    setUploadingProof(true);
    try {
      const uploadName = buildSterilizationProofFileName(formData.productName, formData.sterilizationBatchNo, formData.batchNo);
      const renamedFile = new File([file], uploadName, { type: "application/pdf" });
      const form = new FormData();
      form.append("path", PROOF_UPLOAD_DIR);
      form.append("files", renamedFile);
      const response = await fetch("/api/file-manager/upload", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!result?.success || !result?.files?.length) {
        throw new Error(result?.error || "上传失败");
      }
      const saved = result.files[0];
      if (sterilizationProof?.filePath) {
        deleteFileEntry(sterilizationProof.filePath).catch(() => {});
      }
      setSterilizationProof({
        fileName: String(saved.name || uploadName),
        filePath: String(saved.path || ""),
        fileSize: saved.size ? Number(saved.size) : undefined,
        uploadedAt: new Date().toISOString(),
      });
      toast.success("灭菌证明已上传");
    } catch (error: any) {
      toast.error("上传失败", { description: error?.message || "请稍后重试" });
    } finally {
      setUploadingProof(false);
      if (proofInputRef.current) proofInputRef.current.value = "";
    }
  };

  const handleRemoveSterilizationProof = async () => {
    if (!sterilizationProof) return;
    const currentProof = sterilizationProof;
    setSterilizationProof(null);
    try {
      await deleteFileEntry(currentProof.filePath);
      toast.success("灭菌证明已移除");
    } catch {
      toast.error("已从表单移除，但服务器文件删除失败");
    }
  };

  // 判断入库数量是否被手动修改（与公式计算值不同）
  const calcQty = () => {
    const s = parseFloat(formData.sterilizedQty) || 0;
    const r = parseFloat(formData.inspectionRejectQty) || 0;
    const sp = parseFloat(formData.sampleQty) || 0;
    return s > 0 ? Math.max(0, s - r - sp) : null;
  };
  const isQtyModified = () => {
    const calc = calcQty();
    if (calc === null) return false;
    return parseFloat(formData.quantity) !== calc;
  };

  const handleSubmit = () => {
    if (!formData.quantity) {
      toast.error("请填写必填项", { description: "数量为必填" });
      return;
    }
    if (!formData.productionOrderId) {
      toast.error("请选择生产指令");
      return;
    }
    if (!formData.sterilizationOrderId || !formData.sterilizationBatchNo) {
      toast.error("当前生产指令未匹配到灭菌信息");
      return;
    }
    if (isQtyModified() && !formData.quantityModifyReason.trim()) {
      toast.error("请填写修改原因", { description: "入库数量与公式计算值不同，需填写修改原因" });
      return;
    }
    if (!sterilizationProof?.filePath) {
      toast.error("请上传灭菌证明 PDF");
      return;
    }
    const remarkPayload = buildEntryRemark(formData.remark, sterilizationProof);
    const payload = {
      entryNo: formData.entryNo || undefined,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      sterilizationOrderId: formData.sterilizationOrderId ? Number(formData.sterilizationOrderId) : undefined,
      sterilizationOrderNo: formData.sterilizationOrderNo || undefined,
      productId: formData.productId ? Number(formData.productId) : undefined,
      productName: formData.productName || undefined,
      batchNo: formData.batchNo || undefined,
      sterilizationBatchNo: formData.sterilizationBatchNo || undefined,
      sterilizedQty: formData.sterilizedQty || undefined,
      inspectionRejectQty: formData.inspectionRejectQty || undefined,
      sampleQty: formData.sampleQty || undefined,
      quantity: formData.quantity,
      quantityModifyReason: isQtyModified() ? formData.quantityModifyReason : undefined,
      unit: formData.unit || undefined,
      targetWarehouseId: formData.targetWarehouseId ? Number(formData.targetWarehouseId) : undefined,
      applicationDate: formData.applicationDate || undefined,
      status: "draft" as const,
      remark: remarkPayload || undefined,
    };
    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        data: {
          quantity: payload.quantity,
          sterilizedQty: payload.sterilizedQty,
          inspectionRejectQty: payload.inspectionRejectQty,
          sampleQty: payload.sampleQty,
          quantityModifyReason: payload.quantityModifyReason,
          targetWarehouseId: payload.targetWarehouseId,
          remark: payload.remark,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  // 确认入库 → 通知销售部
  const handleCompleteEntry = (entry: any) => {
    updateMutation.mutate(
      { id: entry.id, data: { status: "completed" } },
      {
        onSuccess: () => {
          refetch();
          toast.success("入库完成，已通知销售部", {
            description: `产品「${entry.productName || "-"}」批号 ${entry.batchNo || "-"}，数量 ${entry.quantity} ${entry.unit} 已入库，销售部待办已创建`,
            duration: 6000,
          });
        },
      }
    );
  };

  const draftCount = (entries as any[]).filter((e) => e.status === "draft").length;
  const pendingCount = (entries as any[]).filter((e) => e.status === "pending").length;
  const completedCount = (entries as any[]).filter((e) => e.status === "completed").length;

  useEffect(() => {
    if (focusHandledRef.current) return;
    const raw = new URLSearchParams(window.location.search).get("focusId");
    const focusId = Number(raw);
    if (!Number.isFinite(focusId) || focusId <= 0) return;
    const entry = (entries as any[]).find((item: any) => Number(item?.id) === focusId);
    if (!entry) return;
    focusHandledRef.current = true;
    handleView(entry);
    const next = new URL(window.location.href);
    next.searchParams.delete("focusId");
    window.history.replaceState({}, "", `${next.pathname}${next.search}`);
  }, [entries]);
  const viewingRemarkMeta = viewingEntry ? parseEntryRemark(viewingEntry.remark) : { note: "", sterilizationProof: null as SterilizationProofMeta | null };
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => {
    const renderValue = (value: React.ReactNode): React.ReactNode => {
      if (value == null || value === "") return "-";
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (Array.isArray(value)) {
        const items = value
          .map((item) => item instanceof Date ? item.toISOString().slice(0, 10) : item)
          .filter((item) => item != null && item !== "");
        return items.length > 0 ? items.join(" ") : "-";
      }
      return value;
    };

    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
        <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
        <span className="flex-1 text-sm text-right break-all">{renderValue(children)}</span>
      </div>
    );
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Warehouse className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">生产入库申请</h2>
              <p className="text-sm text-muted-foreground">入库数量 = 灭菌后数量 − 检验报废数量 − 留样数量，入库完成后自动通知销售部</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />新建入库申请</Button>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">草稿/待审批</p><p className="text-2xl font-bold text-amber-600">{draftCount + pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已入库</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总申请数</p><p className="text-2xl font-bold">{(entries as any[]).length}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索入库单号、产品名称、批号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="approved">已审批</SelectItem>
                  <SelectItem value="completed">已入库</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
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
                  <TableHead className="text-center font-bold">入库单号</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">生产批号<span className="text-xs text-muted-foreground ml-1">(唯一追溯)</span></TableHead>
                  <TableHead className="text-center font-bold">灭菌批号</TableHead>
                  <TableHead className="text-center font-bold">入库数量</TableHead>
                  <TableHead className="text-center font-bold">目标仓库</TableHead>
                  <TableHead className="text-center font-bold">关联灭菌单</TableHead>
                  <TableHead className="text-center font-bold">申请日期</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无入库申请</TableCell></TableRow>
                ) : pagedEntries.map((entry: any) => {
                  const warehouse = (warehouseList as any[]).find((w) => w.id === entry.targetWarehouseId);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center font-medium font-mono">{entry.entryNo}</TableCell>
                      <TableCell className="text-center">{entry.productName || "-"}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-semibold text-primary">{entry.batchNo || "-"}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.sterilizationBatchNo
                          ? <span className="font-mono text-orange-600 text-xs">{entry.sterilizationBatchNo}</span>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{formatQtyDisplay(entry.quantity)}</span>
                        <span className="text-muted-foreground ml-1 text-xs">{entry.unit}</span>
                        {entry.quantityModifyReason && (
                          <AlertCircle className="h-3 w-3 inline ml-1 text-amber-500" title={`已修改：${entry.quantityModifyReason}`} />
                        )}
                      </TableCell>
                      <TableCell className="text-center">{warehouse?.name || "-"}</TableCell>
                      <TableCell className="text-center text-muted-foreground text-xs">{entry.sterilizationOrderNo || "-"}</TableCell>
                      <TableCell className="text-center">{formatDate(entry.applicationDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[entry.status]?.variant || "outline"} className={getStatusSemanticClass(entry.status, statusMap[entry.status]?.label)}>
                          {statusMap[entry.status]?.label || entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(entry)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                            {entry.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(entry)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: entry.id, data: { status: "pending" } })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />提交审批
                                </DropdownMenuItem>
                              </>
                            )}
                            {entry.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: entry.id, data: { status: "approved" } })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />审批通过
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: entry.id, data: { status: "rejected" } })} className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />拒绝
                                </DropdownMenuItem>
                              </>
                            )}
                            {entry.status === "approved" && (
                              <DropdownMenuItem onClick={() => handleCompleteEntry(entry)} className="text-green-600 font-medium">
                                <Bell className="h-4 w-4 mr-2" />确认入库 · 通知销售部
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => handleDelete(entry)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />删除
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
        <TablePaginationFooter total={filteredEntries.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "编辑入库申请" : "新建生产入库申请"}</DialogTitle>
              <DialogDescription>入库数量 = 灭菌后数量 − 检验报废数量 − 留样数量（可手动修改，需填写原因）</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>入库单号 *</Label>
                  <Input value={formData.entryNo} onChange={(e) => setFormData({ ...formData, entryNo: e.target.value })} placeholder="保存后系统生成" readOnly className="font-mono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>申请日期</Label>
                  <DateTextInput value={formData.applicationDate} onChange={(value) => setFormData({ ...formData, applicationDate: value })} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>关联生产指令</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                      onClick={() => setProductionOrderPickerOpen(true)}
                    >
                      {formData.productionOrderId ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs text-muted-foreground">{formData.productionOrderNo}</span>
                          <span className="font-medium">{formData.productName || "已关联生产指令"}</span>
                          {formData.batchNo ? <span className="text-muted-foreground text-xs">· {formData.batchNo}</span> : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择生产指令...</span>
                      )}
                    </Button>
                    {formData.productionOrderId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData((f) => ({
                          ...f,
                          productionOrderId: "",
                          productionOrderNo: "",
                          sterilizationOrderId: "",
                          sterilizationOrderNo: "",
                        }))}
                      >
                        清空
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>关联灭菌单</Label>
                  <Input value={formData.sterilizationOrderNo} readOnly className="font-mono bg-muted/40" placeholder="选择生产指令后自动带入" />
                </div>
                <div className="space-y-2">
                  <Label>灭菌批号</Label>
                  <Input value={formData.sterilizationBatchNo} readOnly className="font-mono bg-muted/40" placeholder="自动带入" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>产品名称</Label>
                  <Input value={formData.productName} readOnly className="bg-muted/40" placeholder="自动带入" />
                </div>
                <div className="space-y-2">
                  <Label>生产批号</Label>
                  <Input value={formData.batchNo} readOnly className="font-mono bg-muted/40" placeholder="自动带入" />
                </div>
                <div className="space-y-2">
                  <Label>生产指令号</Label>
                  <Input value={formData.productionOrderNo} readOnly className="font-mono bg-muted/40" placeholder="自动带入" />
                </div>
                <div className="space-y-2">
                  <Label>灭菌后数量</Label>
                  <Input value={formData.sterilizedQty} readOnly className="bg-muted/40" placeholder="自动带入" />
                </div>
              </div>

              {/* 入库数量公式区域 */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <Calculator className="h-4 w-4" />
                  入库数量计算公式
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">检验报废数量</Label>
                    <Input
                      type="number"
                      value={formData.inspectionRejectQty}
                      onChange={(e) => { setFormData({ ...formData, inspectionRejectQty: e.target.value }); setQuantityManuallyEdited(false); }}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">留样数量</Label>
                    <Input
                      type="number"
                      value={formData.sampleQty}
                      onChange={(e) => { setFormData({ ...formData, sampleQty: e.target.value }); setQuantityManuallyEdited(false); }}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">产品编码</Label>
                    <Input
                      value={(products as any[]).find((item: any) => String(item.id) === String(formData.productId || ""))?.code || ""}
                      readOnly
                      className="font-mono bg-muted/40"
                      placeholder="自动带入"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">灭菌批号</Label>
                    <Input value={formData.sterilizationBatchNo} readOnly className="font-mono bg-muted/40" placeholder="自动带入" />
                  </div>
                </div>
                {calcQty() !== null && (
                  <p className="text-xs text-blue-600">
                    公式计算值：{formData.sterilizedQty || 0} − {formData.inspectionRejectQty || 0} − {formData.sampleQty || 0} = <strong>{calcQty()}</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    入库数量 *
                    {isQtyModified() && <AlertCircle className="h-3 w-3 text-amber-500" />}
                  </Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => { setFormData({ ...formData, quantity: e.target.value }); setQuantityManuallyEdited(true); }}
                    className={isQtyModified() ? "border-amber-400" : ""}
                  />
                  {isQtyModified() && <p className="text-xs text-amber-600">已偏离公式计算值，需填写修改原因</p>}
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>目标仓库</Label>
                  <Select value={formData.targetWarehouseId || "__NONE__"} onValueChange={(v) => setFormData({ ...formData, targetWarehouseId: v === "__NONE__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">不选择</SelectItem>
                      {(warehouseList as any[]).map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>灭菌证明（PDF）</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                      onClick={() => proofInputRef.current?.click()}
                      disabled={uploadingProof}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {sterilizationProof?.fileName || (uploadingProof ? "上传中..." : "上传灭菌证明")}
                    </Button>
                    {sterilizationProof?.filePath ? (
                      <Button type="button" variant="outline" size="icon" onClick={() => downloadFile(sterilizationProof.filePath, sterilizationProof.fileName)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => handleUploadSterilizationProof(e.target.files?.[0] || null)}
                  />
                  {sterilizationProof?.filePath ? (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
                      <span className="truncate">
                        {sterilizationProof.fileName}
                        {sterilizationProof.fileSize ? ` · ${formatFileSize(sterilizationProof.fileSize)}` : ""}
                      </span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={handleRemoveSterilizationProof}>
                        删除
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">文件名自动生成为：产品名称+灭菌批号+生产批号.pdf</p>
                  )}
                </div>
              </div>

              {isQtyModified() && (
                <div className="space-y-2">
                  <Label className="text-amber-700">修改原因 * <span className="text-xs font-normal text-muted-foreground">（入库数量偏离公式计算值时必填）</span></Label>
                  <Textarea
                    value={formData.quantityModifyReason}
                    onChange={(e) => setFormData({ ...formData, quantityModifyReason: e.target.value })}
                    placeholder="请说明修改入库数量的原因..."
                    rows={2}
                    className="border-amber-300"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEntry ? "保存修改" : "创建入库申请"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={productionOrderPickerOpen}
          onOpenChange={setProductionOrderPickerOpen}
          title="选择生产指令"
          searchPlaceholder="搜索生产指令号、产品名称、批号..."
          columns={[
            { key: "orderNo", title: "指令号", className: "w-[160px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.orderNo}</span> },
            { key: "productName", title: "产品名称", className: "min-w-[180px]", render: (row) => <span className="font-medium">{row.productName || "-"}</span> },
            { key: "batchNo", title: "生产批号", className: "w-[140px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.batchNo || "-"}</span> },
            { key: "plannedQty", title: "计划数量", className: "w-[120px] whitespace-nowrap", render: (row) => <span>{formatQtyDisplay(row.plannedQty)} {row.unit || ""}</span> },
            {
              key: "sterilizationOrder",
              title: "灭菌单号",
              className: "w-[180px] whitespace-nowrap",
              render: (row) => {
                const so = findLinkedSterilization(String(row.id), String(row.batchNo || ""));
                return so ? <span className="font-mono text-xs">{so.orderNo}</span> : <span className="text-muted-foreground">未匹配</span>;
              },
            },
            {
              key: "sterilizationBatchNo",
              title: "灭菌批号",
              className: "w-[160px] whitespace-nowrap",
              render: (row) => {
                const so = findLinkedSterilization(String(row.id), String(row.batchNo || ""));
                return so?.sterilizationBatchNo ? <span className="font-mono text-xs text-orange-600">{so.sterilizationBatchNo}</span> : <span className="text-muted-foreground">-</span>;
              },
            },
            {
              key: "sterilizedQty",
              title: "灭菌后数量",
              className: "w-[120px] whitespace-nowrap",
              render: (row) => {
                const so = findLinkedSterilization(String(row.id), String(row.batchNo || ""));
                return <span>{so?.quantity ? formatQtyDisplay(so.quantity) : "-"} {so?.unit || row.unit || ""}</span>;
              },
            },
            {
              key: "sterilizationStatus",
              title: "灭菌状态",
              className: "w-[120px] whitespace-nowrap",
              render: (row) => {
                const so = findLinkedSterilization(String(row.id), String(row.batchNo || ""));
                if (!so) return <span className="text-muted-foreground">未匹配</span>;
                const labelMap: Record<string, string> = {
                  draft: "草稿",
                  sent: "灭菌中",
                  processing: "灭菌中",
                  arrived: "已到货",
                  returned: "已回收",
                  qualified: "合格",
                  unqualified: "不合格",
                };
                return labelMap[String(so.status || "")] || String(so.status || "-");
              },
            },
          ]}
          rows={productionOrders as any[]}
          selectedId={formData.productionOrderId || ""}
          defaultWidth={1320}
          filterFn={(row, query) => {
            const lower = query.toLowerCase();
            return String(row.orderNo || "").toLowerCase().includes(lower) ||
              String(row.productName || "").toLowerCase().includes(lower) ||
              String(row.batchNo || "").toLowerCase().includes(lower);
          }}
          onSelect={(row) => {
            handleProductionOrderChange(String(row.id));
            setProductionOrderPickerOpen(false);
          }}
        />

        {/* 查看详情 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    {viewingEntry && (
      <div className="space-y-4">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">生产入库申请详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingEntry.entryNo}
            {viewingEntry.status && (
              <>
                {' '}
                ·
                <Badge
                  variant={statusMap[viewingEntry.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(viewingEntry.status, statusMap[viewingEntry.status]?.label)}`}
                >
                  {statusMap[viewingEntry.status]?.label || String(viewingEntry.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div className="space-y-4 py-2">
          {/* 基本信息分区 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="产品名称">{viewingEntry.productName || "-"}</FieldRow>
                <FieldRow label="生产批号">{viewingEntry.batchNo ? <span className="font-mono">{viewingEntry.batchNo}</span> : "-"}</FieldRow>
                <FieldRow label="灭菌批号">
                  {viewingEntry.sterilizationBatchNo ? (
                    <span className="font-mono text-orange-600 text-xs">{viewingEntry.sterilizationBatchNo}</span>
                  ) : (
                    "-"
                  )}
                </FieldRow>
              </div>
              <div>
                <FieldRow label="申请日期">{formatDate(viewingEntry.applicationDate)}</FieldRow>
                <FieldRow label="关联生产指令">{viewingEntry.productionOrderNo || "-"}</FieldRow>
                <FieldRow label="关联灭菌单">{viewingEntry.sterilizationOrderNo || "-"}</FieldRow>
              </div>
            </div>
          </div>

          {/* 数量信息分区 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">数量信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="灭菌后数量">{viewingEntry.sterilizedQty || "-"}</FieldRow>
                <FieldRow label="检验报废">{viewingEntry.inspectionRejectQty || "0"}</FieldRow>
                <FieldRow label="留样数量">{viewingEntry.sampleQty || "0"}</FieldRow>
              </div>
              <div>
                <FieldRow label="入库数量">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-medium text-lg">{formatQtyDisplay(viewingEntry.quantity)}</span>
                    <span className="text-muted-foreground text-xs">{viewingEntry.unit}</span>
                    {viewingEntry.quantityModifyReason && (
                      <AlertCircle className="h-3 w-3 text-amber-500" title={`已修改: ${viewingEntry.quantityModifyReason}`} />
                    )}
                  </div>
                </FieldRow>
                <FieldRow label="目标仓库">{(warehouseList as any[]).find((w: any) => w.id === viewingEntry.targetWarehouseId)?.name || "-"}</FieldRow>
              </div>
            </div>
          </div>

          {/* 数量修改原因 */}
          {viewingEntry.quantityModifyReason && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">数量修改原因</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingEntry.quantityModifyReason}</p>
            </div>
          )}

          {/* 备注 */}
          {viewingRemarkMeta.sterilizationProof && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">灭菌证明</h3>
              <div className="rounded-lg border bg-muted/20 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{viewingRemarkMeta.sterilizationProof.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {viewingRemarkMeta.sterilizationProof.fileSize ? formatFileSize(viewingRemarkMeta.sterilizationProof.fileSize) : "PDF 文件"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile(viewingRemarkMeta.sterilizationProof!.filePath, viewingRemarkMeta.sterilizationProof!.fileName)}
                >
                  <Download className="h-4 w-4 mr-2" />下载
                </Button>
              </div>
            </div>
          )}

          {/* 备注 */}
          {viewingRemarkMeta.note && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingRemarkMeta.note}</p>
            </div>
          )}

          {viewingEntry.status === "completed" && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-green-700">
              <Bell className="h-4 w-4 inline mr-1" />已入库完成，销售部已收到通知
            </div>
          )}
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            {viewingEntry?.status === "draft" && (
              <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); if (viewingEntry) handleEdit(viewingEntry); }}>编辑</Button>
            )}
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
