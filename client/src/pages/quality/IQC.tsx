import React, { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { SignatureStatusCard, SignatureRecord } from "@/components/ElectronicSignature";
import { ATTACHMENT_ACCEPT } from "@shared/uploadPolicy";
import {
  PackageSearch, Plus, Search, Edit2, Trash2, Eye, ChevronLeft, ChevronRight,
  X, ChevronDown, Paperclip, FileText, Upload, Check, XCircle, Save, ArrowLeft,
  Calendar, User, Hash, ClipboardCheck, AlertTriangle, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatters";

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
  sampleCount: number;
  sampleValues: string[];
  measuredValue: string;
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

const RESULT_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "待检验", variant: "secondary", color: "bg-slate-100 text-slate-600" },
  passed: { label: "合格", variant: "default", color: "bg-emerald-50 text-emerald-700" },
  failed: { label: "不合格", variant: "destructive", color: "bg-red-50 text-red-700" },
  conditional_pass: { label: "条件合格", variant: "outline", color: "bg-amber-50 text-amber-700" },
};

const CONCLUSION_MAP: Record<string, { label: string; color: string }> = {
  pass: { label: "合格", color: "text-emerald-600" },
  fail: { label: "不合格", color: "text-red-600" },
  pending: { label: "待判定", color: "text-slate-400" },
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

function calcQualifiedQtyByState(
  sampleQtyRaw: string | number | undefined,
  items: InspectionItemForm[],
  result?: string,
): string {
  const sampleQty = parseFloat(String(sampleQtyRaw ?? "")) || 0;
  if (sampleQty <= 0) return "0";

  if (items.length > 0) {
    const conclusions = items.map((it) => autoConclusion(it));
    const allDone = conclusions.every((c) => c !== "pending");
    if (allDone) {
      const allPass = conclusions.every((c) => c === "pass");
      return allPass ? String(sampleQty) : "0";
    }
  }

  if (result === "passed" || result === "conditional_pass") return String(sampleQty);
  if (result === "failed") return "0";
  return "0";
}

// ==================== 状态流水线组件（Odoo 风格） ====================
function StatusPipeline({ current, onChange }: { current: string; onChange?: (v: string) => void }) {
  const steps = [
    { key: "pending", label: "待检验" },
    { key: "passed", label: "合格" },
    { key: "conditional_pass", label: "条件合格" },
    { key: "failed", label: "不合格" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center">
      {steps.map((step, idx) => {
        const isActive = step.key === current;
        const isPast = idx < currentIdx && currentIdx >= 0;
        return (
          <div
            key={step.key}
            onClick={() => onChange?.(step.key)}
            className={`
              relative px-4 py-1.5 text-xs font-medium cursor-pointer select-none transition-all
              ${idx === 0 ? "rounded-l-full" : ""} ${idx === steps.length - 1 ? "rounded-r-full" : ""}
              ${isActive
                ? step.key === "passed" ? "bg-emerald-600 text-white"
                  : step.key === "failed" ? "bg-red-600 text-white"
                  : step.key === "conditional_pass" ? "bg-amber-500 text-white"
                  : "bg-primary text-primary-foreground"
                : isPast ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-500"
              }
            `}
          >
            {step.label}
            {idx < steps.length - 1 && (
              <div className="absolute right-0 top-0 h-full w-px bg-white/50" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==================== 主组件 ====================
export default function IQCPage() {
  const { user } = useAuth();

  // 视图模式：list = 列表视图，form = 表单视图（新建/编辑），detail = 详情视图
  const [viewMode, setViewMode] = useState<"list" | "form" | "detail">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
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

  // 附件上传
  const [uploadFiles, setUploadFiles] = useState<Array<{ id: string; file: File; previewUrl?: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 电子签名
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  // 当前 Tab
  const [activeTab, setActiveTab] = useState("items");

  const [lastAppliedReqId, setLastAppliedReqId] = useState<number | null>(null);

  // ==================== 查询 ====================
  const { data: iqcList = [], refetch } = trpc.iqcInspections.list.useQuery({
    result: resultFilter === "all" ? undefined : resultFilter,
    search: search || undefined,
    limit: 200,
  });

  // 已检验的到货单明细ID集合（用于禁用已检验行）
  const inspectedItemIds = useMemo(() => {
    const ids = new Set<number>();
    (iqcList as any[]).forEach((r: any) => {
      if (r.goodsReceiptItemId && r.result !== 'pending') {
        if (!editId || r.id !== editId) {
          ids.add(r.goodsReceiptItemId);
        }
      }
    });
    return ids;
  }, [iqcList, editId]);

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
    { enabled: !!formData.inspectionRequirementId && viewMode === "form" }
  );

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
        inspectionDate: d.inspectionDate ? (typeof d.inspectionDate === 'string' ? d.inspectionDate.slice(0, 10) : new Date(d.inspectionDate).toISOString().slice(0, 10)) : today(),
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
      try {
        const sigs = d.signatures ? JSON.parse(d.signatures) : [];
        setSignatures(Array.isArray(sigs) ? sigs : []);
      } catch { setSignatures([]); }
    }
  }, [editId, editData]);

  // 自动计算合格数量（检验项完成优先；否则使用检验结果兜底）
  useEffect(() => {
    const qualifiedQty = calcQualifiedQtyByState(formData.sampleQty, items, formData.result);
    setFormData((p) => ({
      ...p,
      qualifiedQty,
    }));
  }, [items, formData.sampleQty, formData.result]);

  // 产品编码变化时自动匹配检验要求
  useEffect(() => {
    if (!formData.productCode || editId) return; // 编辑模式不自动覆盖
    const matched = (reqList as any[]).find(
      (r: any) => r.productCode && r.productCode === formData.productCode
    ) ?? (reqList as any[]).find(
      (r: any) => r.productName && formData.productName && r.productName === formData.productName
    );
    if (matched && matched.id !== formData.inspectionRequirementId) {
      setFormData((p) => ({ ...p, inspectionRequirementId: matched.id }));
      setLastAppliedReqId(null); // 重置，允许重新带入检验项
    }
  }, [formData.productCode, formData.productName, reqList, editId]);

  // 选择检验要求时带入检验项
  useEffect(() => {
    if (
      selectedReqDetail &&
      (selectedReqDetail as any).items?.length > 0 &&
      formData.inspectionRequirementId &&
      formData.inspectionRequirementId !== lastAppliedReqId
    ) {
      setLastAppliedReqId(formData.inspectionRequirementId);
      const reqItems = (selectedReqDetail as any).items as any[];
      setItems(reqItems.map((ri: any, idx: number) => ({
        key: newKey(),
        requirementItemId: ri.id,
        itemName: ri.itemName,
        itemType: ri.itemType ?? "qualitative",
        standard: ri.standard ?? "",
        minVal: ri.minValue ?? "",
        maxVal: ri.maxValue ?? "",
        unit: ri.unit ?? "",
        sampleCount: 1,
        sampleValues: [""],
        measuredValue: "",
        acceptedValues: ri.acceptedValues ?? "",
        actualValue: "",
        conclusion: "pending" as const,
        sortOrder: idx,
        remark: "",
      })));
    }
  }, [selectedReqDetail, formData.inspectionRequirementId, lastAppliedReqId]);

  // ==================== Mutations ====================
  const createMutation = trpc.iqcInspections.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("来料检验单已创建");
      refetch();
      setEditId(data.id);
      setSubmitting(false);
    },
    onError: (e: any) => { toast.error("创建失败：" + e.message); setSubmitting(false); },
  });
  const updateMutation = trpc.iqcInspections.update.useMutation({
    onSuccess: () => { toast.success("已更新"); refetch(); setSubmitting(false); },
    onError: (e: any) => { toast.error("更新失败：" + e.message); setSubmitting(false); },
  });
  const deleteMutation = trpc.iqcInspections.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); setViewMode("list"); },
    onError: (e: any) => toast.error("删除失败：" + e.message),
  });
  const uploadAttachmentsMutation = trpc.iqcInspections.uploadAttachments.useMutation();
  const saveSignatureMutation = trpc.iqcInspections.saveSignature.useMutation({
    onError: (e: any) => toast.error("签名保存失败：" + e.message),
  });

  const handleSignComplete = (signature: SignatureRecord) => {
    setSignatures((prev) => [...prev, signature]);
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

  function appendUploadFiles(fileList: FileList) {
    const next = [...uploadFiles];
    Array.from(fileList).forEach((file) => {
      const id = newKey();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      next.push({ id, file, previewUrl });
    });
    setUploadFiles(next);
  }
  function removeUploadFile(id: string) {
    setUploadFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  // ==================== 操作 ====================
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
    setActiveTab("items");
    setViewMode("form");
  }

  function openEdit(id: number) {
    setEditId(id);
    setLastAppliedReqId(null);
    setActiveTab("items");
    setViewMode("form");
  }

  function openDetail(id: number) {
    setDetailId(id);
    setViewMode("detail");
  }

  function goBack() {
    setViewMode("list");
    setEditId(null);
    setDetailId(null);
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
  }

  function updateItem(idx: number, patch: Partial<InspectionItemForm>) {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], ...patch };
      if (patch.sampleValues) {
        if (updated.itemType === "quantitative") {
          updated.measuredValue = calcAvg(patch.sampleValues);
        } else {
          const allSame = patch.sampleValues.every((v) => v === patch.sampleValues![0]);
          updated.actualValue = allSame ? patch.sampleValues[0] : patch.sampleValues.join(",");
        }
        updated.conclusion = autoConclusion(updated);
      }
      next[idx] = updated;
      return next;
    });
  }

  function setSampleCount(idx: number, count: number) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };
      const old = item.sampleValues;
      const newVals = Array.from({ length: count }, (_, i) => old[i] ?? "");
      item.sampleCount = count;
      item.sampleValues = newVals;
      if (item.itemType === "quantitative") item.measuredValue = calcAvg(newVals);
      item.conclusion = autoConclusion(item);
      next[idx] = item;
      return next;
    });
  }

  async function handleSubmit(overrideResult?: string) {
    if (!formData.productName) { toast.error("请填写产品名称"); return; }
    const receivedQtyNum = parseFloat(String(formData.receivedQty)) || 0;
    const sampleQtyNum = parseFloat(String(formData.sampleQty)) || 0;
    if (sampleQtyNum > 0 && receivedQtyNum > 0 && sampleQtyNum > receivedQtyNum) {
      toast.error(`抄样数量（${sampleQtyNum}）不能超过到货数量（${receivedQtyNum}）`);
      return;
    }
    setSubmitting(true);
    try {
      let savedFilePaths: any[] = [];
      try {
        const att = JSON.parse(JSON.stringify(attachments.filter((a) => a.fileUrl || a.recordName)));
        savedFilePaths = att;
      } catch {}
      if (uploadFiles.length > 0) {
        const filesPayload = await Promise.all(
          uploadFiles.map(async (uf) => ({
            name: uf.file.name,
            mimeType: uf.file.type,
            base64: await toBase64(uf.file),
          }))
        );
        const uploaded = await uploadAttachmentsMutation.mutateAsync({
          inspectionNo: formData.inspectionNo,
          files: filesPayload,
        });
        savedFilePaths = [...savedFilePaths, ...((uploaded as any[]) || [])];
        setUploadFiles([]);
      }
      const attJson = JSON.stringify(savedFilePaths);
      const finalResult = overrideResult ?? formData.result;
      const computedQualifiedQty = calcQualifiedQtyByState(formData.sampleQty, items, finalResult);
      const payload = {
        ...formData,
        result: finalResult,
        qualifiedQty: computedQualifiedQty,
        goodsReceiptId: formData.goodsReceiptId ?? undefined,
        goodsReceiptItemId: formData.goodsReceiptItemId ?? undefined,
        productId: formData.productId ?? undefined,
        supplierId: formData.supplierId ?? undefined,
        inspectionRequirementId: formData.inspectionRequirementId ?? undefined,
        inspectorId: formData.inspectorId ?? undefined,
        attachments: attJson,
        signatures: JSON.stringify(signatures),
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
      toast.error("操作失败：" + (err?.message ?? "未知错误"));
      setSubmitting(false);
    }
  }

  const list = iqcList as any[];

  // 统计
  const stats = useMemo(() => ({
    total: list.length,
    pending: list.filter((r) => r.result === "pending").length,
    passed: list.filter((r) => r.result === "passed").length,
    failed: list.filter((r) => r.result === "failed").length,
    conditional: list.filter((r) => r.result === "conditional_pass").length,
  }), [list]);

  // 列表中当前记录的前后导航
  const currentListIdx = list.findIndex((r) => r.id === (editId ?? detailId));

  // ==================== 列表视图 ====================
  if (viewMode === "list") {
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
              { label: "待检验", count: stats.pending, color: "text-blue-600" },
              { label: "合格", count: stats.passed, color: "text-green-600" },
              { label: "不合格", count: stats.failed, color: "text-red-600" },
              { label: "条件合格", count: stats.conditional, color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="bg-card border rounded-lg p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 列表 */}
          <div className="border rounded-lg overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
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
                  <TableRow key={row.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openDetail(row.id)}>
                    <TableCell className="font-mono text-sm text-primary">{row.inspectionNo}</TableCell>
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
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row.id); }}>
                            <Edit2 className="w-4 h-4 mr-2" />编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); if (confirm("确认删除？")) deleteMutation.mutate({ id: row.id }); }}
                          >
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
      </ERPLayout>
    );
  }

  // ==================== 详情视图 ====================
  if (viewMode === "detail" && detailData) {
    const d = detailData as any;
    let detailSigs: SignatureRecord[] = [];
    try { detailSigs = d.signatures ? JSON.parse(d.signatures) : []; } catch {}

    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          {/* 顶部操作栏 */}
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />来料检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{d.inspectionNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(d.id)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />编辑
                </Button>
                {currentListIdx > 0 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(list[currentListIdx - 1].id)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                {currentListIdx >= 0 && (
                  <span className="text-xs text-muted-foreground">{currentListIdx + 1} / {list.length}</span>
                )}
                {currentListIdx < list.length - 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(list[currentListIdx + 1].id)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div />
              <StatusPipeline current={d.result} />
            </div>
          </div>

          {/* 详情内容 */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto px-6 py-6">
              {/* 标题 */}
              <h2 className="text-2xl font-bold mb-6">{d.inspectionNo}</h2>

              {/* 两列字段布局 */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8">
                <FieldRow label="产品名称" value={d.productName} />
                <FieldRow label="到货单号" value={d.goodsReceiptNo} link />
                <FieldRow label="规格型号" value={d.specification} />
                <FieldRow label="批次号" value={d.batchNo} />
                <FieldRow label="供应商" value={d.supplierName} />
                <FieldRow label="到货数量" value={d.receivedQty ? `${parseFloat(d.receivedQty)} ${d.unit ?? ""}` : "-"} />
                <FieldRow label="抽样数量" value={d.sampleQty} />
                <FieldRow label="合格数量" value={d.qualifiedQty} />
                <FieldRow label="检验员" value={d.inspectorName} />
                <FieldRow label="检验日期" value={d.inspectionDate ? formatDate(d.inspectionDate) : "-"} />
                <FieldRow label="填报方式" value={d.reportMode === "offline" ? "线下填写" : "线上填写"} />
              </div>

              {/* Tab 页签 */}
              <Tabs defaultValue="items" className="w-full">
                <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                  <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                    检验项目
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                    附件资料
                  </TabsTrigger>
                  <TabsTrigger value="signatures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                    电子签名
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                    备注
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-4">
                  {d.items?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>项目名称</TableHead>
                          <TableHead className="w-20">类型</TableHead>
                          <TableHead>检验标准</TableHead>
                          <TableHead>实测值</TableHead>
                          <TableHead className="w-20">结论</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.items.map((it: any, idx: number) => (
                          <TableRow key={it.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{it.itemName}</TableCell>
                            <TableCell>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                {it.itemType === "quantitative" ? "定量" : "定性"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {it.itemType === "quantitative"
                                ? `${it.minVal ?? ""}～${it.maxVal ?? ""} ${it.unit ?? ""}`
                                : it.acceptedValues ?? "-"
                              }
                            </TableCell>
                            <TableCell>
                              {it.itemType === "quantitative" ? (
                                <div>
                                  <span className="font-medium">{it.measuredValue ? parseFloat(it.measuredValue).toFixed(2) : "-"}</span>
                                  {it.sampleValues && (() => {
                                    try { const sv = JSON.parse(it.sampleValues); return <span className="text-xs text-muted-foreground ml-1">[{sv.join(", ")}]</span>; } catch { return null; }
                                  })()}
                                </div>
                              ) : (
                                <span>{it.actualValue ?? "-"}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm font-medium ${CONCLUSION_MAP[it.conclusion]?.color ?? ""}`}>
                                {CONCLUSION_MAP[it.conclusion]?.label ?? it.conclusion}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">暂无检验项目</div>
                  )}
                </TabsContent>

                <TabsContent value="attachments" className="mt-4">
                  {(() => {
                    try {
                      const atts = d.attachments ? JSON.parse(d.attachments) : [];
                      if (!atts.length) return <div className="text-center text-muted-foreground py-8">暂无附件</div>;
                      return (
                        <div className="space-y-2">
                          {atts.map((att: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded border bg-muted/20">
                              <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm">{att.fileName || att.recordName || `附件 ${idx + 1}`}</span>
                              {att.filePath && (
                                <a href={att.filePath} target="_blank" rel="noopener" className="text-xs text-primary hover:underline ml-auto">查看</a>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return <div className="text-center text-muted-foreground py-8">暂无附件</div>; }
                  })()}
                </TabsContent>

                <TabsContent value="signatures" className="mt-4">
                  {detailSigs.length > 0 ? (
                    <SignatureStatusCard
                      documentType="IQC"
                      documentNo={d.inspectionNo}
                      documentId={d.id}
                      signatures={detailSigs}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground py-8">暂无签名记录</div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <div className="text-sm whitespace-pre-wrap">{d.remark || "暂无备注"}</div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </ERPLayout>
    );
  }

  // ==================== 表单视图（新建/编辑） ====================
  return (
    <ERPLayout>
      <div className="flex flex-col h-full">
        {/* 顶部操作栏 */}
        <div className="border-b bg-background px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />来料检验
              </Button>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold">{editId ? formData.inspectionNo : "新建"}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* 合格/不合格快捷按钮 */}
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                onClick={() => handleSubmit("passed")}
                disabled={submitting}
              >
                <Check className="w-3.5 h-3.5" />合格
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                onClick={() => handleSubmit("failed")}
                disabled={submitting}
              >
                <XCircle className="w-3.5 h-3.5" />不合格
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleSubmit()}
                disabled={submitting}
              >
                <Save className="w-3.5 h-3.5" />{submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div />
            <StatusPipeline current={formData.result} onChange={(v) => setFormData((p) => ({ ...p, result: v }))} />
          </div>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">
            {/* 两列字段布局 */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
              {/* 左列 */}
              <EditFieldRow label="产品名称" required>
                <div className="flex gap-2">
                  <Input
                    value={formData.productName}
                    onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))}
                    placeholder="产品名称"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowReceiptPicker(true)}>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    {formData.goodsReceiptNo || "关联到货单"}
                  </Button>
                </div>
              </EditFieldRow>
              <EditFieldRow label="检验编号">
                <Input
                  value={formData.inspectionNo}
                  onChange={(e) => setFormData((p) => ({ ...p, inspectionNo: e.target.value }))}
                  className="bg-muted/30"
                />
              </EditFieldRow>

              <EditFieldRow label="规格型号">
                <Input
                  value={formData.specification}
                  onChange={(e) => setFormData((p) => ({ ...p, specification: e.target.value }))}
                  placeholder="规格型号"
                />
              </EditFieldRow>
              <EditFieldRow label="检验日期" required>
                <Input
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData((p) => ({ ...p, inspectionDate: e.target.value }))}
                />
              </EditFieldRow>

              <EditFieldRow label="供应商">
                <Input
                  value={formData.supplierName}
                  onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                  placeholder="供应商名称"
                />
              </EditFieldRow>
              <EditFieldRow label="检验员" required>
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
              </EditFieldRow>

              <EditFieldRow label="批次号">
                <Input
                  value={formData.batchNo}
                  onChange={(e) => setFormData((p) => ({ ...p, batchNo: e.target.value }))}
                  placeholder="批次号"
                />
              </EditFieldRow>
              <EditFieldRow label="填报方式">
                <Select
                  value={formData.reportMode}
                  onValueChange={(v) => setFormData((p) => ({ ...p, reportMode: v as "online" | "offline" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">线上填写</SelectItem>
                    <SelectItem value="offline">线下填写</SelectItem>
                  </SelectContent>
                </Select>
              </EditFieldRow>

              <EditFieldRow label="到货数量">
                <div className="flex gap-2">
                  <Input
                    value={formData.receivedQty}
                    onChange={(e) => setFormData((p) => ({ ...p, receivedQty: e.target.value }))}
                    placeholder="数量"
                    className="flex-1"
                  />
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="单位"
                    className="w-20"
                  />
                </div>
              </EditFieldRow>
              <EditFieldRow label="灭菌批号">
                <Input
                  value={formData.sterilizationBatchNo}
                  onChange={(e) => setFormData((p) => ({ ...p, sterilizationBatchNo: e.target.value }))}
                  placeholder="灭菌批号"
                />
              </EditFieldRow>

              <EditFieldRow label="抽样数量">
                <Input
                  value={formData.sampleQty}
                  onChange={(e) => setFormData((p) => ({ ...p, sampleQty: e.target.value }))}
                  placeholder="抽样数量"
                />
              </EditFieldRow>
              <EditFieldRow label="合格数量">
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.qualifiedQty}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed"
                    placeholder="检验完成后自动计算"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">自动计算</span>
                </div>
              </EditFieldRow>
            </div>

            {/* Tab 页签 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                  检验项目 {items.length > 0 && `(${items.length})`}
                </TabsTrigger>
                <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                  附件资料
                </TabsTrigger>
                <TabsTrigger value="signatures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                  电子签名
                </TabsTrigger>
                <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                  备注
                </TabsTrigger>
              </TabsList>

              {/* 检验项目 Tab */}
              <TabsContent value="items" className="mt-4">
                {formData.reportMode === "online" && (
                  <div className="space-y-4">
                    {/* 检验要求自动关联提示 + 添加项目按钮 */}
                    <div className="flex items-center gap-3">
                      {formData.inspectionRequirementId ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1">
                          <Check className="w-3 h-3" />
                          已自动关联检验要求：{(reqList as any[]).find((r: any) => r.id === formData.inspectionRequirementId)?.requirementNo ?? ""}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          选择产品后将自动关联检验要求
                        </div>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
                        <Plus className="w-3 h-3 mr-1" />添加项目
                      </Button>
                    </div>

                    {/* 检验项目表格 */}
                    {items.length === 0 ? (
                      <div className="border rounded-lg p-8 text-center text-muted-foreground text-sm">
                        选择产品后将自动关联检验要求并带入检验项目，也可点击“添加项目”手动添加
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead className="w-[140px]">项目名称</TableHead>
                            <TableHead className="w-[70px]">类型</TableHead>
                            <TableHead className="w-[180px]">检验要求</TableHead>
                            <TableHead className="w-[60px]">样品量</TableHead>
                            <TableHead>数值录入</TableHead>
                            <TableHead className="w-[80px]">结论</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, idx) => (
                            <TableRow key={item.key}>
                              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-medium text-sm">{item.itemName || "-"}</TableCell>
                              <TableCell>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                  {item.itemType === "qualitative" ? "定性" : "定量"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {item.itemType === "qualitative"
                                  ? `合格值：${item.acceptedValues || "合格/不合格"}`
                                  : `${item.minVal || ""} ~ ${item.maxVal || ""} ${item.unit || ""}`
                                }
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number" min={1} max={20}
                                  value={item.sampleCount}
                                  onChange={(e) => setSampleCount(idx, Math.max(1, parseInt(e.target.value) || 1))}
                                  className="h-7 w-14 text-xs"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 flex-wrap">
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
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          均值: {parseFloat(item.measuredValue).toFixed(2)} {item.unit}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const c = autoConclusion(item);
                                  return (
                                    <span className={`text-xs font-medium ${CONCLUSION_MAP[c]?.color ?? ""}`}>
                                      {CONCLUSION_MAP[c]?.label ?? "待判定"}
                                    </span>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* 附件资料 Tab */}
              <TabsContent value="attachments" className="mt-4">
                <div
                  className={`rounded-lg border-2 border-dashed p-6 transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"}`}
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
                    onChange={(e) => {
                      if (e.target.files) appendUploadFiles(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
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
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                    <div className="text-sm text-muted-foreground text-center">
                      {isDragging ? "松开鼠标即可上传" : "拖拽文件到此处，或点击下方按钮选择文件"}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />选择文件
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("iqc-camera-input")?.click()}>
                        <FileText className="h-3.5 w-3.5 mr-1.5" />拍照上传
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">支持 JPG、PNG、PDF、Word、Excel，单个文件建议不超过 20MB</div>
                  </div>
                </div>
                {uploadFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadFiles.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/20">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt="" className="h-8 w-8 object-cover rounded shrink-0" />
                          ) : (
                            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate text-sm">{item.file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{(item.file.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeUploadFile(item.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* 电子签名 Tab */}
              <TabsContent value="signatures" className="mt-4">
                {!editId ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                    <div className="text-xs mt-1">符合 FDA 21 CFR Part 11 法规要求</div>
                  </div>
                ) : (
                  <SignatureStatusCard
                    documentType="IQC"
                    documentNo={formData.inspectionNo}
                    documentId={editId}
                    signatures={signatures}
                    onSignComplete={handleSignComplete}
                  />
                )}
              </TabsContent>

              {/* 备注 Tab */}
              <TabsContent value="notes" className="mt-4">
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))}
                  placeholder="输入备注信息..."
                  rows={6}
                  className="resize-none"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

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
                      {(receipt.items ?? []).map((item: any) => {
                        const alreadyInspected = inspectedItemIds.has(item.id);
                        return (
                          <TableRow key={item.id} className={alreadyInspected ? 'opacity-50' : ''}>
                            <TableCell>{item.materialName}</TableCell>
                            <TableCell className="text-muted-foreground">{item.specification ?? "-"}</TableCell>
                            <TableCell>{item.receivedQty} {item.unit}</TableCell>
                            <TableCell>{item.batchNo ?? "-"}</TableCell>
                            <TableCell>
                              {alreadyInspected ? (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">已检验</span>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => selectReceiptItem(receipt, item)}>选择</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}

// ==================== 辅助组件 ====================
function FieldRow({ label, value, link }: { label: string; value?: string | number | null; link?: boolean }) {
  const display = value != null && value !== "" ? String(value) : "-";
  return (
    <div className="flex items-baseline gap-4 py-1.5 border-b border-muted/50">
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={`text-sm font-medium ${link ? "text-primary" : ""}`}>{display}</span>
    </div>
  );
}

function EditFieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground w-24 shrink-0">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
