import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { PackageSearch, Plus, Search, Edit2, Trash2, Eye, MoreHorizontal, X, ChevronDown, Paperclip, FileText, Upload } from "lucide-react";
import { ATTACHMENT_ACCEPT } from "@shared/uploadPolicy";
import { SignatureStatusCard, SignatureRecord } from "@/components/ElectronicSignature";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatters";

// ==================== 可拖拽列宽 Hook ====================
function useResizableColumns(initialWidths: number[]) {
  const [widths, setWidths] = React.useState(initialWidths);
  const dragging = React.useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  const onMouseDown = (colIdx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { colIdx, startX: e.clientX, startW: widths[colIdx] };
    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      const delta = me.clientX - dragging.current.startX;
      const newW = Math.max(60, dragging.current.startW + delta);
      setWidths((prev) => { const next = [...prev]; next[dragging.current!.colIdx] = newW; return next; });
    };
    const onUp = () => { dragging.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return { widths, onMouseDown };
}

// ==================== 类型 ====================
type InspectionItemForm = {
  key: string;
  requirementItemId?: number;
  itemName: string;
  itemType: "qualitative" | "quantitative";
  standard: string;
  minVal: string;
  maxVal: string;
  unit: string;
  // 定量：样本量 + 各样品数值
  sampleCount: number;
  sampleValues: string[]; // 每个样品的实测值
  measuredValue: string;  // 均值（自动计算）
  // 定性
  acceptedValues: string;
  actualValue: string;
  conclusion: "pass" | "fail" | "pending";
  sortOrder: number;
  remark: string;
};

type AttachmentRow = {
  key: string;
  fileType: string;
  recordNo: string;
  recordName: string;
  conclusion: string;
  fileUrl: string;
};

type FormData = {
  inspectionNo: string;
  reportMode: "online" | "offline";
  goodsReceiptId: number | null;
  goodsReceiptNo: string;
  goodsReceiptItemId: number | null;
  productId: number | null;
  productCode: string;
  productName: string;
  specification: string;
  supplierId: number | null;
  supplierName: string;
  supplierCode: string;
  batchNo: string;
  sterilizationBatchNo: string;
  receivedQty: string;
  sampleQty: string;
  qualifiedQty: string;
  unit: string;
  inspectionRequirementId: number | null;
  inspectionDate: string;
  inspectorId: number | null;
  inspectorName: string;
  result: string;
  remark: string;
};

const RESULT_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待检验", variant: "secondary" },
  passed: { label: "合格", variant: "default" },
  failed: { label: "不合格", variant: "destructive" },
  conditional_pass: { label: "条件合格", variant: "outline" },
};

const CONCLUSION_MAP: Record<string, { label: string; color: string }> = {
  pass: { label: "合格", color: "text-green-600" },
  fail: { label: "不合格", color: "text-red-600" },
  pending: { label: "待判定", color: "text-gray-400" },
};

let keyCounter = 0;
function newKey() { return `k-${++keyCounter}-${Date.now()}`; }

function emptyItem(): InspectionItemForm {
  return {
    key: newKey(), itemName: "", itemType: "qualitative",
    standard: "", minVal: "", maxVal: "", unit: "",
    sampleCount: 1, sampleValues: [""], measuredValue: "",
    acceptedValues: "", actualValue: "",
    conclusion: "pending", sortOrder: 0, remark: "",
  };
}

function emptyAttachment(): AttachmentRow {
  return { key: newKey(), fileType: "", recordNo: "", recordName: "", conclusion: "符合", fileUrl: "" };
}

function today() { return new Date().toISOString().slice(0, 10); }

function genInspectionNo(seq: number) {
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `R${d}-${String(seq).padStart(2, "0")}`;
}

function calcAvg(vals: string[]): string {
  const nums = vals.map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return "";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4);
}

function autoConclusion(item: InspectionItemForm): "pass" | "fail" | "pending" {
  if (item.itemType === "qualitative") {
    if (!item.actualValue) return "pending";
    const accepted = item.acceptedValues.split(",").map((s) => s.trim()).filter(Boolean);
    if (accepted.length === 0) return "pending";
    return accepted.includes(item.actualValue) ? "pass" : "fail";
  } else {
    const avg = parseFloat(item.measuredValue);
    if (isNaN(avg)) return "pending";
    const min = item.minVal !== "" ? parseFloat(item.minVal) : null;
    const max = item.maxVal !== "" ? parseFloat(item.maxVal) : null;
    if (min !== null && avg < min) return "fail";
    if (max !== null && avg > max) return "fail";
    return "pass";
  }
}

// ==================== 主组件 ====================
export default function IQCPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showReceiptPicker, setShowReceiptPicker] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState("");

  const [formData, setFormData] = useState<FormData>({
    inspectionNo: "", reportMode: "online",
    goodsReceiptId: null, goodsReceiptNo: "",
    goodsReceiptItemId: null, productId: null, productCode: "",
    productName: "", specification: "", supplierId: null, supplierName: "",
    supplierCode: "", batchNo: "", sterilizationBatchNo: "",
    receivedQty: "", sampleQty: "", qualifiedQty: "", unit: "",
    inspectionRequirementId: null, inspectionDate: today(),
    inspectorId: null, inspectorName: "", result: "pending", remark: "",
  });
  const [items, setItems] = useState<InspectionItemForm[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([emptyAttachment()]);
  // 附件上传相关
  const [uploadFiles, setUploadFiles] = useState<Array<{ id: string; file: File; previewUrl?: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 电子签名相关
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  // 项目内容表格列宽：#、项目名称、类型、检验要求、样品量、检验结果、操作
  const colDefs = [
    { label: "#", init: 36 },
    { label: "项目名称", init: 120 },
    { label: "类型", init: 60 },
    { label: "检验要求", init: 180 },
    { label: "样品量", init: 70 },
    { label: "数值", init: 320 },
    { label: "检验结果", init: 90 },
    { label: "", init: 36 },
  ];
  const { widths: colWidths, onMouseDown: colResizeDown } = useResizableColumns(colDefs.map((c) => c.init));

  // ==================== 查询 ====================
  const { data: iqcList = [], refetch } = trpc.iqcInspections.list.useQuery({
    result: resultFilter === "all" ? undefined : resultFilter,
    search: search || undefined,
    limit: 200,
  });

  const { data: detailData } = trpc.iqcInspections.getById.useQuery(
    { id: detailId! }, { enabled: !!detailId }
  );
  const { data: editData } = trpc.iqcInspections.getById.useQuery(
    { id: editId! }, { enabled: !!editId }
  );

  const { data: receiptList = [] } = trpc.goodsReceipts.list.useQuery(
    { search: receiptSearch || undefined, limit: 100 },
    { enabled: showReceiptPicker }
  );

  const { data: allUsers = [] } = trpc.users.list.useQuery();
  const qualityUsers = (allUsers as any[]).filter((u: any) =>
    u.department && u.department.includes("质量")
  );

  const { data: reqList = [] } = trpc.inspectionRequirements.list.useQuery({
    type: "IQC", status: "active", limit: 200,
  });

  const { data: selectedReqDetail } = trpc.inspectionRequirements.getById.useQuery(
    { id: formData.inspectionRequirementId! },
    { enabled: !!formData.inspectionRequirementId && showForm }
  );

  const [lastAppliedReqId, setLastAppliedReqId] = useState<number | null>(null);

  // 编辑时填充数据
  useEffect(() => {
    if (editId && editData) {
      const d = editData as any;
      setFormData({
        inspectionNo: d.inspectionNo,
        reportMode: d.reportMode ?? "online",
        goodsReceiptId: d.goodsReceiptId ?? null,
        goodsReceiptNo: d.goodsReceiptNo ?? "",
        goodsReceiptItemId: d.goodsReceiptItemId ?? null,
        productId: d.productId ?? null,
        productCode: d.productCode ?? "",
        productName: d.productName ?? "",
        specification: d.specification ?? "",
        supplierId: d.supplierId ?? null,
        supplierName: d.supplierName ?? "",
        supplierCode: d.supplierCode ?? "",
        batchNo: d.batchNo ?? "",
        sterilizationBatchNo: d.sterilizationBatchNo ?? "",
        receivedQty: d.receivedQty ?? "",
        sampleQty: d.sampleQty ?? "",
        qualifiedQty: d.qualifiedQty ?? "",
        unit: d.unit ?? "",
        inspectionRequirementId: d.inspectionRequirementId ?? null,
        inspectionDate: d.inspectionDate ? d.inspectionDate.slice(0, 10) : today(),
        inspectorId: d.inspectorId ?? null,
        inspectorName: d.inspectorName ?? "",
        result: d.result ?? "pending",
        remark: d.remark ?? "",
      });
      setItems((d.items ?? []).map((it: any) => {
        const sv: string[] = it.sampleValues ? JSON.parse(it.sampleValues) : [it.measuredValue ?? ""];
        return {
          key: newKey(),
          requirementItemId: it.requirementItemId,
          itemName: it.itemName,
          itemType: it.itemType,
          standard: it.standard ?? "",
          minVal: it.minVal ?? "",
          maxVal: it.maxVal ?? "",
          unit: it.unit ?? "",
          sampleCount: sv.length || 1,
          sampleValues: sv.length ? sv : [""],
          measuredValue: it.measuredValue ?? "",
          acceptedValues: it.acceptedValues ?? "",
          actualValue: it.actualValue ?? "",
          conclusion: it.conclusion ?? "pending",
          sortOrder: it.sortOrder ?? 0,
          remark: it.remark ?? "",
        };
      }));
      try {
        const att = d.attachments ? JSON.parse(d.attachments) : [];
        setAttachments(att.length ? att.map((a: any) => ({ ...a, key: newKey() })) : [emptyAttachment()]);
      } catch { setAttachments([emptyAttachment()]); }
      // 加载已保存的签名
      try {
        const sigs = d.signatures ? JSON.parse(d.signatures) : [];
        setSignatures(Array.isArray(sigs) ? sigs : []);
      } catch { setSignatures([]); }
    }
  }, [editId, editData]);

  // 选择检验要求时带入检验项
  useEffect(() => {
    if (
      selectedReqDetail &&
      (selectedReqDetail as any).items?.length > 0 &&
      formData.inspectionRequirementId !== lastAppliedReqId
    ) {
      setItems((selectedReqDetail as any).items.map((it: any) => ({
        key: newKey(),
        requirementItemId: it.id,
        itemName: it.itemName,
        itemType: it.itemType,
        standard: it.standard ?? "",
        minVal: it.minVal ?? "",
        maxVal: it.maxVal ?? "",
        unit: it.unit ?? "",
        sampleCount: 1,
        sampleValues: [""],
        measuredValue: "",
        acceptedValues: it.acceptedValues ?? "",
        actualValue: "",
        conclusion: "pending" as const,
        sortOrder: it.sortOrder ?? 0,
        remark: "",
      })));
      setLastAppliedReqId(formData.inspectionRequirementId);
    }
  }, [selectedReqDetail, formData.inspectionRequirementId, lastAppliedReqId]);

  // 自动计算合格数量
  useEffect(() => {
    const recv = parseFloat(formData.receivedQty);
    const sample = parseFloat(formData.sampleQty);
    if (!isNaN(recv) && !isNaN(sample)) {
      setFormData((p) => ({ ...p, qualifiedQty: String(recv - sample) }));
    }
  }, [formData.receivedQty, formData.sampleQty]);

  // ==================== mutations ====================
  const createMutation = trpc.iqcInspections.create.useMutation({
    onSuccess: () => { toast.success("来料检验单已创建"); refetch(); setShowForm(false); setSubmitting(false); },
    onError: (e: any) => { toast.error("创建失败：" + e.message); setSubmitting(false); },
  });
  const updateMutation = trpc.iqcInspections.update.useMutation({
    onSuccess: () => { toast.success("已更新"); refetch(); setShowForm(false); setSubmitting(false); },
    onError: (e: any) => { toast.error("更新失败：" + e.message); setSubmitting(false); },
  });
  const deleteMutation = trpc.iqcInspections.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
    onError: (e: any) => toast.error("删除失败：" + e.message),
  });
  const uploadAttachmentsMutation = trpc.iqcInspections.uploadAttachments.useMutation();
  const saveSignatureMutation = trpc.iqcInspections.saveSignature.useMutation({
    onError: (e: any) => toast.error("签名保存失败：" + e.message),
  });

  const handleSignComplete = (signature: SignatureRecord) => {
    setSignatures((prev) => [...prev, signature]);
    // 如果已经有保存的记录（editId），就实时保存到后端
    if (editId) {
      saveSignatureMutation.mutate({ id: editId, signature });
    }
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  function appendUploadFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList || []);
    const next = [...uploadFiles];
    for (const file of incoming) {
      if (next.length >= 10) { toast.warning("最多上传10个附件"); break; }
      const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      next.push({ id, file, previewUrl });
    }
    setUploadFiles(next);
  }

  function removeUploadFile(id: string) {
    setUploadFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function openCreate() {
    setEditId(null);
    setLastAppliedReqId(null);
    const seq = (iqcList as any[]).length + 1;
    setFormData({
      inspectionNo: genInspectionNo(seq), reportMode: "online",
      goodsReceiptId: null, goodsReceiptNo: "",
      goodsReceiptItemId: null, productId: null, productCode: "",
      productName: "", specification: "", supplierId: null, supplierName: "",
      supplierCode: "", batchNo: "", sterilizationBatchNo: "",
      receivedQty: "", sampleQty: "", qualifiedQty: "", unit: "",
      inspectionRequirementId: null, inspectionDate: today(),
      inspectorId: (user as any)?.id ?? null,
      inspectorName: (user as any)?.name ?? "",
      result: "pending", remark: "",
    });
    setItems([]);
    setAttachments([emptyAttachment()]);
    setUploadFiles([]);
    setSignatures([]);
    setShowForm(true);
  }

  function selectReceiptItem(receipt: any, item: any) {
    setFormData((p) => ({
      ...p,
      goodsReceiptId: receipt.id,
      goodsReceiptNo: receipt.receiptNo,
      goodsReceiptItemId: item.id,
      productId: item.productId ?? null,
      productCode: item.materialCode ?? "",
      productName: item.materialName ?? "",
      specification: item.specification ?? "",
      supplierId: receipt.supplierId ?? null,
      supplierName: receipt.supplierName ?? "",
      supplierCode: receipt.supplierCode ?? "",
      batchNo: item.batchNo ?? "",
      sterilizationBatchNo: item.sterilizationBatchNo ?? "",
      receivedQty: item.receivedQty ?? "",
      unit: item.unit ?? "",
    }));
    setShowReceiptPicker(false);
    const productName = item.materialName ?? "";
    const productCode = item.materialCode ?? "";
    const matched = (reqList as any[]).find((r: any) =>
      r.productName === productName || (productCode && r.productCode === productCode)
    );
    if (matched) {
      setFormData((p) => ({ ...p, inspectionRequirementId: matched.id }));
      setLastAppliedReqId(null);
      toast.info(`已自动匹配检验要求：${matched.requirementNo}`);
    }
  }

  function updateItem(idx: number, patch: Partial<InspectionItemForm>) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      // 定量：更新样品值时重新计算均值和结论
      if (patch.sampleValues !== undefined || patch.minVal !== undefined || patch.maxVal !== undefined) {
        const sv = patch.sampleValues ?? next[idx].sampleValues;
        const avg = calcAvg(sv);
        next[idx].measuredValue = avg;
        next[idx].conclusion = autoConclusion({ ...next[idx], measuredValue: avg });
      }
      // 定性：更新实际值时自动判定结论
      if (patch.actualValue !== undefined || patch.acceptedValues !== undefined) {
        next[idx].conclusion = autoConclusion(next[idx]);
      }
      return next;
    });
  }

  function setSampleCount(idx: number, count: number) {
    setItems((prev) => {
      const next = [...prev];
      const old = next[idx].sampleValues;
      const newVals = Array.from({ length: count }, (_, i) => old[i] ?? "");
      next[idx] = { ...next[idx], sampleCount: count, sampleValues: newVals };
      const avg = calcAvg(newVals);
      next[idx].measuredValue = avg;
      next[idx].conclusion = autoConclusion({ ...next[idx], measuredValue: avg });
      return next;
    });
  }

  async function handleSubmit() {
    if (!formData.inspectionNo) return toast.error("请填写检验编号");
    if (!formData.productName) return toast.error("请填写产品名称");
    if (!formData.inspectorName) return toast.error("请填写检验员");
    setSubmitting(true);
    try {
      // 先上传附件，获取已保存的文件路径
      let savedFilePaths: Array<{ fileName: string; filePath: string; mimeType: string }> = [];
      if (uploadFiles.length > 0) {
        const filesPayload = await Promise.all(
          uploadFiles.map(async (item) => ({
            name: item.file.name,
            mimeType: item.file.type,
            base64: await toBase64(item.file),
          }))
        );
        savedFilePaths = await uploadAttachmentsMutation.mutateAsync({
          inspectionNo: formData.inspectionNo,
          files: filesPayload,
        });
      }
      const attJson = JSON.stringify(savedFilePaths);
      const payload = {
        ...formData,
        goodsReceiptId: formData.goodsReceiptId ?? undefined,
        goodsReceiptItemId: formData.goodsReceiptItemId ?? undefined,
        productId: formData.productId ?? undefined,
        supplierId: formData.supplierId ?? undefined,
        inspectionRequirementId: formData.inspectionRequirementId ?? undefined,
        inspectorId: formData.inspectorId ?? undefined,
        attachments: attJson,
        items: items.map((it, idx) => ({
          requirementItemId: it.requirementItemId,
          itemName: it.itemName,
          itemType: it.itemType,
          standard: it.standard || undefined,
          minValue: it.minVal || undefined,
          maxValue: it.maxVal || undefined,
          unit: it.unit || undefined,
          measuredValue: it.measuredValue || undefined,
          sampleValues: it.itemType === "quantitative" ? JSON.stringify(it.sampleValues) : undefined,
          acceptedValues: it.acceptedValues || undefined,
          actualValue: it.actualValue || undefined,
          conclusion: it.conclusion,
          sortOrder: idx,
          remark: it.remark || undefined,
        })),
      };
      if (editId) {
        updateMutation.mutate({ id: editId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (err: any) {
      toast.error("附件上传失败：" + (err?.message ?? "未知错误"));
      setSubmitting(false);
    }
  }

  const list = iqcList as any[];

  return (
    <ERPLayout>
      <div className="p-6 space-y-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PackageSearch className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">来料检验（IQC）</h1>
              <p className="text-sm text-muted-foreground">原材料入库前的质量检验</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />新建检验
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索检验编号、产品名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="检验结果" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待检验</SelectItem>
              <SelectItem value="passed">合格</SelectItem>
              <SelectItem value="failed">不合格</SelectItem>
              <SelectItem value="conditional_pass">条件合格</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "待检验", count: list.filter((r) => r.result === "pending").length, color: "text-blue-600" },
            { label: "合格", count: list.filter((r) => r.result === "passed").length, color: "text-green-600" },
            { label: "不合格", count: list.filter((r) => r.result === "failed").length, color: "text-red-600" },
            { label: "条件合格", count: list.filter((r) => r.result === "conditional_pass").length, color: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="bg-card border rounded-lg p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 列表 */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>检验编号</TableHead>
                <TableHead>到货单号</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>批次号</TableHead>
                <TableHead>到货数量</TableHead>
                <TableHead>抽样数量</TableHead>
                <TableHead>合格数量</TableHead>
                <TableHead>检验员</TableHead>
                <TableHead>检验日期</TableHead>
                <TableHead>结果</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">暂无检验记录</TableCell>
                </TableRow>
              ) : list.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.inspectionNo}</TableCell>
                  <TableCell className="text-sm">{row.goodsReceiptNo ?? "-"}</TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.specification ?? "-"}</TableCell>
                  <TableCell className="text-sm">{row.supplierName ?? "-"}</TableCell>
                  <TableCell className="text-sm">{row.batchNo ?? "-"}</TableCell>
                  <TableCell className="text-sm">{row.receivedQty ? `${parseFloat(row.receivedQty)} ${row.unit ?? ""}` : "-"}</TableCell>
                  <TableCell className="text-sm">{row.sampleQty ? parseFloat(row.sampleQty) : "-"}</TableCell>
                  <TableCell className="text-sm">{row.qualifiedQty ? parseFloat(row.qualifiedQty) : "-"}</TableCell>
                  <TableCell className="text-sm">{row.inspectorName ?? "-"}</TableCell>
                  <TableCell className="text-sm">{row.inspectionDate ? formatDate(row.inspectionDate) : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={RESULT_MAP[row.result]?.variant ?? "secondary"}>
                      {RESULT_MAP[row.result]?.label ?? row.result}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setDetailId(row.id); setShowDetail(true); }}>
                          <Eye className="w-4 h-4 mr-2" />查看
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditId(row.id); setShowForm(true); }}>
                          <Edit2 className="w-4 h-4 mr-2" />编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("确认删除？")) deleteMutation.mutate({ id: row.id }); }}>
                          <Trash2 className="w-4 h-4 mr-2" />删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ==================== 新建/编辑弹窗 ==================== */}
      <DraggableDialog open={showForm} onOpenChange={setShowForm}>
        <DraggableDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-6 p-1">
            <h2 className="text-lg font-semibold border-b pb-2 text-center">来料检验单</h2>

            {/* 顶部基本信息 */}
            <div className="grid grid-cols-4 gap-4 items-start">
              {/* 填报方式 */}
              <div className="space-y-1">
                <Label>填报方式</Label>
                <Select
                  value={formData.reportMode}
                  onValueChange={(v) => setFormData((p) => ({ ...p, reportMode: v as "online" | "offline" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择填报方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">线上填写</SelectItem>
                    <SelectItem value="offline">线下填写</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* 检验员 */}
              <div className="space-y-1">
                <Label>检验员 <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.inspectorId ? String(formData.inspectorId) : "__manual__"}
                  onValueChange={(v) => {
                    if (v === "__manual__") return;
                    const u = qualityUsers.find((u: any) => String(u.id) === v);
                    setFormData((p) => ({ ...p, inspectorId: u ? u.id : null, inspectorName: u ? u.name : p.inspectorName }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择检验员" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityUsers.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                    <SelectItem value="__manual__">手动输入</SelectItem>
                  </SelectContent>
                </Select>
                {(!formData.inspectorId || formData.inspectorId === null) && (
                  <Input
                    value={formData.inspectorName}
                    onChange={(e) => setFormData((p) => ({ ...p, inspectorName: e.target.value }))}
                    placeholder="输入检验员姓名"
                    className="mt-1"
                  />
                )}
              </div>
              {/* 检验日期 */}
              <div className="space-y-1">
                <Label>日期时间 <span className="text-destructive">*</span></Label>
                <Input type="date" value={formData.inspectionDate} onChange={(e) => setFormData((p) => ({ ...p, inspectionDate: e.target.value }))} />
              </div>
              {/* 检验编号 */}
              <div className="space-y-1">
                <Label>检验编号</Label>
                <Input value={formData.inspectionNo} onChange={(e) => setFormData((p) => ({ ...p, inspectionNo: e.target.value }))} placeholder="自动生成无需填写" className="bg-muted/40" />
              </div>
            </div>

            {/* 产品信息区块 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-teal-500 rounded" />
                <h3 className="font-semibold text-sm">产品信息</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowReceiptPicker(true)}>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    {formData.goodsReceiptNo ? formData.goodsReceiptNo : "选择到货明细"}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap text-muted-foreground">供应商名称</Label>
                    <Input
                      value={formData.supplierName}
                      onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                      placeholder="供应商名称"
                      className="h-8 w-40 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs whitespace-nowrap text-muted-foreground">抽样数量</Label>
                    <Input
                      value={formData.sampleQty}
                      onChange={(e) => setFormData((p) => ({ ...p, sampleQty: e.target.value }))}
                      placeholder="抽样数量"
                      type="number"
                      className="h-8 w-28 text-sm"
                    />
                  </div>
                </div>
                {formData.productName && (
                  <div className="text-sm border rounded-md overflow-hidden">
                    <div className="grid grid-cols-5 bg-muted/60 text-muted-foreground font-medium">
                      <div className="px-3 py-1.5 border-r">产品编码</div>
                      <div className="px-3 py-1.5 border-r">产品名称</div>
                      <div className="px-3 py-1.5 border-r">规格</div>
                      <div className="px-3 py-1.5 border-r">到货数量</div>
                      <div className="px-3 py-1.5">批次号</div>
                    </div>
                    <div className="grid grid-cols-5">
                      <div className="px-3 py-1.5 border-r">{formData.productCode || "-"}</div>
                      <div className="px-3 py-1.5 border-r font-medium">{formData.productName}</div>
                      <div className="px-3 py-1.5 border-r">{formData.specification || "-"}</div>
                      <div className="px-3 py-1.5 border-r">{formData.receivedQty || "-"}</div>
                      <div className="px-3 py-1.5">{formData.batchNo || "-"}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 线上填写区块 */}
            {formData.reportMode === "online" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-teal-500 rounded" />
                  <h3 className="font-semibold text-sm">线上填写</h3>
                </div>

                {/* 检验要求选择 */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Label>检验要求</Label>
                  <Select
                    value={formData.inspectionRequirementId ? String(formData.inspectionRequirementId) : ""}
                    onValueChange={(v) => {
                      setFormData((p) => ({ ...p, inspectionRequirementId: Number(v) }));
                      setLastAppliedReqId(null);
                    }}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="关联数据（选择检验要求）" />
                    </SelectTrigger>
                    <SelectContent>
                      {(reqList as any[]).map((r: any) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.requirementNo} - {r.productName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">选择后自动带入检验项目</span>
                </div>

                {/* 项目内容表格 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium">项目内容</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
                      <Plus className="w-3 h-3 mr-1" />添加
                    </Button>
                  </div>
                  {items.length === 0 ? (
                    <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">请先选择检验要求，或手动添加检验项目</div>
                  ) : (
                    <div className="border rounded-md overflow-auto">
                      {/* 表头 */}
                      <div className="flex bg-muted/60 text-xs text-muted-foreground font-medium select-none" style={{ minWidth: colWidths.reduce((a, b) => a + b, 0) }}>
                        {colDefs.map((col, ci) => (
                          <div
                            key={ci}
                            className="relative px-2 py-2 border-r last:border-r-0 shrink-0 overflow-hidden"
                            style={{ width: colWidths[ci] }}
                          >
                            {col.label}
                            {ci < colDefs.length - 1 && (
                              <div
                                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-teal-400 active:bg-teal-500"
                                onMouseDown={colResizeDown(ci)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      {/* 表身 */}
                      {items.map((item, idx) => (
                        <div
                          key={item.key}
                          className="flex items-start border-t text-sm"
                          style={{ minWidth: colWidths.reduce((a, b) => a + b, 0) }}
                        >
                          {/* # */}
                          <div className="px-2 py-2 shrink-0 text-muted-foreground" style={{ width: colWidths[0] }}>{idx + 1}</div>
                          {/* 项目名称 */}
                          <div className="px-2 py-2 shrink-0 font-medium overflow-hidden text-ellipsis" style={{ width: colWidths[1] }}>{item.itemName || "-"}</div>
                          {/* 类型 */}
                          <div className="px-2 py-2 shrink-0" style={{ width: colWidths[2] }}>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {item.itemType === "qualitative" ? "定性" : "定量"}
                            </span>
                          </div>
                          {/* 检验要求 */}
                          <div className="px-2 py-2 shrink-0 text-xs text-muted-foreground overflow-hidden" style={{ width: colWidths[3] }}>
                            {item.itemType === "qualitative"
                              ? `合格値：${item.acceptedValues || "合格/不合格"}`
                              : `${item.minVal || ""} ~ ${item.maxVal || ""} ${item.unit || ""}`
                            }
                          </div>
                          {/* 样品量 */}
                          <div className="px-2 py-1.5 shrink-0" style={{ width: colWidths[4] }}>
                            <Input
                              type="number" min={1} max={20}
                              value={item.sampleCount}
                              onChange={(e) => setSampleCount(idx, Math.max(1, parseInt(e.target.value) || 1))}
                              className="h-7 w-full text-xs"
                            />
                          </div>
                          {/* 数値（样品输入） */}
                          <div className="px-2 py-1.5 shrink-0 flex items-center gap-1.5 flex-wrap" style={{ width: colWidths[5] }}>
                            {item.itemType === "qualitative" ? (
                              Array.from({ length: item.sampleCount }).map((_, si) => (
                                <Select
                                  key={si}
                                  value={item.sampleValues[si] || ""}
                                  onValueChange={(v) => {
                                    const newVals = [...item.sampleValues];
                                    newVals[si] = v;
                                    updateItem(idx, { sampleValues: newVals });
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent>
                                    {item.acceptedValues.split(",").map((v) => v.trim()).filter(Boolean).map((v) => (
                                      <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                    {item.acceptedValues.split(",").map((v) => v.trim()).filter(Boolean).length === 0 && (
                                      <>
                                        <SelectItem value="合格">合格</SelectItem>
                                        <SelectItem value="不合格">不合格</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              ))
                            ) : (
                              <>
                                {Array.from({ length: item.sampleCount }).map((_, si) => (
                                  <Input
                                    key={si}
                                    value={item.sampleValues[si] || ""}
                                    onChange={(e) => {
                                      const newVals = [...item.sampleValues];
                                      newVals[si] = e.target.value;
                                      updateItem(idx, { sampleValues: newVals });
                                    }}
                                    className="h-7 w-16 text-xs"
                                    placeholder={`${si + 1}`}
                                  />
                                ))}
                                {item.measuredValue && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">均値: {parseFloat(item.measuredValue).toFixed(2)} {item.unit}</span>
                                )}
                              </>
                            )}
                          </div>
                          {/* 检验结果（判定） */}
                          <div className="px-2 py-2 shrink-0 flex items-center justify-center" style={{ width: colWidths[6] }}>
                            {(() => {
                              const c = autoConclusion(item);
                              return (
                                <span className={`text-xs font-medium ${
                                  c === "pass" ? "text-green-600" : c === "fail" ? "text-red-500" : "text-gray-400"
                                }`}>
                                  {c === "pass" ? "合格" : c === "fail" ? "不合格" : "待判定"}
                                </span>
                              );
                            })()}
                          </div>
                          {/* 删除 */}
                          <div className="px-1 py-1.5 shrink-0 flex items-center justify-center" style={{ width: colWidths[7] }}>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 附件上传 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-teal-500 rounded" />
                <h3 className="font-semibold text-sm">附件资料</h3>
              </div>
              <div
                className={`rounded-md border border-dashed p-4 transition-colors ${isDragging ? "border-teal-500 bg-teal-50" : "border-border"}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  appendUploadFiles(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  capture={undefined}
                  onChange={(e) => {
                    if (e.target.files) appendUploadFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                {/* 拍照上传用的隐藏 input */}
                <input
                  id="iqc-camera-input"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files) appendUploadFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    {isDragging ? "松开鼠标即可上传" : "拖拽文件到此处，或点击按鈕选择文件"}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      选择文件
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("iqc-camera-input")?.click()}>
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      拍照上传
                    </Button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">支持 JPG、PNG、PDF、Word、Excel，单个文件建议不超过20MB</div>
                {uploadFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {uploadFiles.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1.5 text-sm bg-background">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt="" className="h-8 w-8 object-cover rounded shrink-0" />
                          ) : (
                            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate text-sm">{item.file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {(item.file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeUploadFile(item.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 检验结论 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-teal-500 rounded" />
                <h3 className="font-semibold text-sm">检验结论</h3>
              </div>
              <div className="flex items-center gap-4">
                <Label>检验结果</Label>
                <RadioGroup
                  value={formData.result}
                  onValueChange={(v) => setFormData((p) => ({ ...p, result: v }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="passed" id="r-pass" />
                    <Label htmlFor="r-pass" className="cursor-pointer px-3 py-1 rounded bg-green-100 text-green-700 font-medium">合格</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="failed" id="r-fail" />
                    <Label htmlFor="r-fail" className="cursor-pointer px-3 py-1 rounded bg-red-100 text-red-700 font-medium">不合格</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="conditional_pass" id="r-cond" />
                    <Label htmlFor="r-cond" className="cursor-pointer px-3 py-1 rounded bg-orange-100 text-orange-700 font-medium">条件合格</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="pending" id="r-pending" />
                    <Label htmlFor="r-pending" className="cursor-pointer px-3 py-1 rounded bg-gray-100 text-gray-600 font-medium">待检验</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))} placeholder="备注信息" rows={2} />
              </div>
            </div>

            {/* 电子签名区块 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-teal-500 rounded" />
                <h3 className="font-semibold text-sm">电子签名</h3>
                <span className="text-xs text-muted-foreground">(符合 FDA 21 CFR Part 11 法规要求)</span>
              </div>
              {!editId && (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground text-center">
                  请先保存检验单，保存后可进行电子签名
                </div>
              )}
              {editId && (
                <SignatureStatusCard
                  documentType="IQC"
                  documentNo={formData.inspectionNo}
                  documentId={editId}
                  signatures={signatures}
                  onSignComplete={handleSignComplete}
                />
              )}
            </div>

            {/* 底部按鈕 */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              <Button type="button" variant="outline" onClick={() => { setFormData((p) => ({ ...p, result: "pending" })); handleSubmit(); }} disabled={submitting}>保存草稿</Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "提交中..." : "提交"}
              </Button>
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ==================== 到货单选择弹窗 ==================== */}
      <DraggableDialog open={showReceiptPicker} onOpenChange={setShowReceiptPicker}>
        <DraggableDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="space-y-4 p-1">
            <h2 className="text-lg font-semibold">选择到货单明细</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索到货单号、供应商..." value={receiptSearch} onChange={(e) => setReceiptSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="space-y-3">
              {(receiptList as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-6">暂无到货单</p>
              ) : (receiptList as any[]).map((receipt: any) => (
                <div key={receipt.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{receipt.receiptNo}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{receipt.supplierName}</span>
                      <Badge variant={receipt.status === "passed" ? "default" : receipt.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                        {receipt.status === "pending_inspection" ? "待检验" : receipt.status === "passed" ? "已合格" : receipt.status === "failed" ? "不合格" : receipt.status}
                      </Badge>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>产品名称</TableHead>
                        <TableHead>规格</TableHead>
                        <TableHead>收货数量</TableHead>
                        <TableHead>批次号</TableHead>
                        <TableHead className="w-16">选择</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(receipt.items ?? []).map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.materialName}</TableCell>
                          <TableCell className="text-muted-foreground">{item.specification ?? "-"}</TableCell>
                          <TableCell>{item.receivedQty} {item.unit}</TableCell>
                          <TableCell>{item.batchNo ?? "-"}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => selectReceiptItem(receipt, item)}>选择</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* ==================== 详情弹窗 ==================== */}
      <DraggableDialog open={showDetail} onOpenChange={setShowDetail}>
        <DraggableDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailData && (
            <div className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{(detailData as any).inspectionNo}</h2>
                <Badge variant={RESULT_MAP[(detailData as any).result]?.variant ?? "secondary"}>
                  {RESULT_MAP[(detailData as any).result]?.label ?? (detailData as any).result}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm border rounded-lg p-4 bg-muted/20">
                <div><span className="text-muted-foreground">产品名称：</span>{(detailData as any).productName}</div>
                <div><span className="text-muted-foreground">规格：</span>{(detailData as any).specification ?? "-"}</div>
                <div><span className="text-muted-foreground">供应商：</span>{(detailData as any).supplierName ?? "-"}</div>
                <div><span className="text-muted-foreground">到货单号：</span>{(detailData as any).goodsReceiptNo ?? "-"}</div>
                <div><span className="text-muted-foreground">批次号：</span>{(detailData as any).batchNo ?? "-"}</div>
                <div><span className="text-muted-foreground">到货数量：</span>{(detailData as any).receivedQty} {(detailData as any).unit}</div>
                <div><span className="text-muted-foreground">抽样数量：</span>{(detailData as any).sampleQty ?? "-"}</div>
                <div><span className="text-muted-foreground">合格数量：</span>{(detailData as any).qualifiedQty ?? "-"}</div>
                <div><span className="text-muted-foreground">填报方式：</span>{(detailData as any).reportMode === "offline" ? "线下填写" : "线上填写"}</div>
                <div><span className="text-muted-foreground">检验员：</span>{(detailData as any).inspectorName ?? "-"}</div>
                <div><span className="text-muted-foreground">检验日期：</span>{formatDate((detailData as any).inspectionDate)}</div>
              </div>
              {(detailData as any).items?.length > 0 && (
                <div>
                  <Label className="text-base font-medium mb-2 block">检验项目明细</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>项目名称</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>检验标准</TableHead>
                        <TableHead>实测/判定值</TableHead>
                        <TableHead>结论</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailData as any).items.map((it: any, idx: number) => (
                        <TableRow key={it.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{it.itemName}</TableCell>
                          <TableCell>
                            <Badge variant={it.itemType === "quantitative" ? "default" : "secondary"} className="text-xs">
                              {it.itemType === "quantitative" ? "定量" : "定性"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {it.itemType === "quantitative" ? `${it.minVal ?? ""}～${it.maxVal ?? ""} ${it.unit ?? ""}` : it.acceptedValues ?? "-"}
                          </TableCell>
                          <TableCell>
                            {it.itemType === "quantitative" ? (
                              <div>
                                <div>{it.measuredValue ? `均值: ${parseFloat(it.measuredValue).toFixed(2)}` : "-"}</div>
                                {it.sampleValues && (() => {
                                  try { const sv = JSON.parse(it.sampleValues); return <div className="text-xs text-muted-foreground">[{sv.join(", ")}]</div>; } catch { return null; }
                                })()}
                              </div>
                            ) : it.actualValue ?? "-"}
                          </TableCell>
                          <TableCell>
                            <span className={CONCLUSION_MAP[it.conclusion]?.color ?? ""}>
                              {CONCLUSION_MAP[it.conclusion]?.label ?? it.conclusion}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {(detailData as any).remark && (
                <div className="text-sm"><span className="text-muted-foreground">备注：</span>{(detailData as any).remark}</div>
              )}
              {/* 签名展示 */}
              {(() => {
                try {
                  const sigs: SignatureRecord[] = (detailData as any).signatures
                    ? JSON.parse((detailData as any).signatures)
                    : [];
                  if (!sigs.length) return null;
                  return (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">电子签名记录</span>
                      </div>
                      <SignatureStatusCard
                        documentType="IQC"
                        documentNo={(detailData as any).inspectionNo}
                        documentId={(detailData as any).id}
                        signatures={sigs}
                      />
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          )}
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
