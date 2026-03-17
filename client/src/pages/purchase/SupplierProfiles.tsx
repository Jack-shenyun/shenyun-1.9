import { useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import SupplierProfilePrintPreview from "@/components/purchase/SupplierProfilePrintPreview";
import { requestPreviewUrl, uploadFiles } from "@/lib/fileManagerApi";
import { trpc } from "@/lib/trpc";
import { formatDateValue, formatDisplayNumber } from "@/lib/formatters";
import { toast } from "sonner";
import {
  createEmptyAnnualEvaluationItem,
  createEmptySupplierProfileFormData,
  getAnnualEvaluationAverage,
  getAnnualEvaluationItemTotal,
  normalizeSupplierProfileFormData,
  SUPPLIER_PROFILE_FORM_LABELS,
  SUPPLIER_PROFILE_STATUS_LABELS,
  SUPPLIER_PROFILE_TEMPLATE_CODES,
  type SupplierAnnualEvaluationFormData,
  type SupplierOptionLite,
  type SupplierProfileAttachment,
  type SupplierProfileFormData,
  type SupplierProfileFormType,
  type SupplierProfileRecord,
  type SupplierProfileStatus,
  type SupplierQualityAgreementFormData,
  type SupplierSurveyFormData,
} from "@/lib/supplierProfile";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  ClipboardList,
  Edit,
  Eye,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

type SupplierStatus = "qualified" | "pending" | "disqualified" | string;

type SupplierRow = SupplierOptionLite & {
  status?: SupplierStatus;
  code?: string;
};

type SupplierProfileFormState = {
  supplierId: string;
  formType: SupplierProfileFormType;
  serialNo: string;
  yearLabel: string;
  status: SupplierProfileStatus;
  formData: SupplierProfileFormData;
};

const PAGE_SIZE = 10;

const statusMeta: Record<
  SupplierProfileStatus,
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  draft: { label: "草稿", variant: "outline" },
  completed: { label: "已完成", variant: "default" },
};

function buildDefaultFormState(
  formType: SupplierProfileFormType,
  supplier?: SupplierOptionLite
): SupplierProfileFormState {
  return {
    supplierId: supplier?.id ? String(supplier.id) : "",
    formType,
    serialNo: "",
    yearLabel:
      formType === "annual_evaluation" ? String(new Date().getFullYear()) : "",
    status: "draft",
    formData: createEmptySupplierProfileFormData(formType, supplier),
  };
}

function sanitizePathSegment(value: string) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSupplierAttachmentDir(supplierName: string) {
  const safeSupplierName = sanitizePathSegment(supplierName || "未命名供应商");
  return `/ERP/知识库/采购部/供应商资料/${safeSupplierName}`;
}

function syncSupplierFields(
  formType: SupplierProfileFormType,
  currentFormData: SupplierProfileFormData,
  supplier?: SupplierOptionLite
) {
  if (!supplier) return currentFormData;
  if (formType === "survey") {
    const formData = currentFormData as SupplierSurveyFormData;
    return {
      ...formData,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      businessAddress: supplier.address || "",
      businessPhone: supplier.phone || "",
      factoryAddress: supplier.address || "",
      factoryPhone: supplier.phone || "",
    } satisfies SupplierSurveyFormData;
  }
  if (formType === "quality_agreement") {
    const formData = currentFormData as SupplierQualityAgreementFormData;
    return {
      ...formData,
      supplierAddress: supplier.address || "",
      supplierContact: supplier.contactPerson || "",
      supplierPhone: supplier.phone || "",
      supplierStampName: supplier.name || "",
    } satisfies SupplierQualityAgreementFormData;
  }
  return currentFormData;
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="w-28 shrink-0 text-sm text-slate-500">{label}</span>
      <div className="flex-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}

function ReadonlyText({ value }: { value: React.ReactNode }) {
  const text =
    value == null || value === ""
      ? "-"
      : value instanceof Date
        ? formatDateValue(value)
        : value;
  return <span className="break-all text-sm text-slate-900">{text}</span>;
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-slate-900">
      <Icon className="h-4 w-4 text-sky-600" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function renderSurveyDetail(formData: SupplierSurveyFormData) {
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle icon={Building2} title="基本信息" />
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <FieldRow label="物料名称">
            <ReadonlyText value={formData.materialName} />
          </FieldRow>
          <FieldRow label="物料类别">
            <ReadonlyText value={formData.materialCategory} />
          </FieldRow>
          <FieldRow label="物料编号">
            <ReadonlyText value={formData.materialCode} />
          </FieldRow>
          <FieldRow label="企业性质">
            <ReadonlyText
              value={
                formData.enterpriseNature === "manufacturer"
                  ? "制造商"
                  : formData.enterpriseNature === "agent"
                    ? "代理商"
                    : formData.enterpriseNature === "service"
                      ? "服务"
                      : "-"
              }
            />
          </FieldRow>
          <FieldRow label="联系人">
            <ReadonlyText value={formData.contactPerson} />
          </FieldRow>
          <FieldRow label="职位">
            <ReadonlyText value={formData.position} />
          </FieldRow>
          <FieldRow label="电话">
            <ReadonlyText value={formData.phone} />
          </FieldRow>
          <FieldRow label="邮箱">
            <ReadonlyText value={formData.email} />
          </FieldRow>
        </div>
      </div>

      <div>
        <SectionTitle icon={ClipboardList} title="经营与质量信息" />
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <FieldRow label="业务地址">
            <ReadonlyText value={formData.businessAddress} />
          </FieldRow>
          <FieldRow label="工厂地址">
            <ReadonlyText value={formData.factoryAddress} />
          </FieldRow>
          <FieldRow label="单位负责人">
            <ReadonlyText value={formData.principal} />
          </FieldRow>
          <FieldRow label="主管部门">
            <ReadonlyText value={formData.supervisingDepartment} />
          </FieldRow>
          <FieldRow label="品质负责人">
            <ReadonlyText value={formData.qualityResponsible} />
          </FieldRow>
          <FieldRow label="主要检测设备">
            <ReadonlyText value={formData.mainTestingEquipment || "-"} />
          </FieldRow>
          <FieldRow label="经营资质">
            <ReadonlyText value={formData.businessQualification || "-"} />
          </FieldRow>
          <FieldRow label="体系认证/注册">
            <ReadonlyText
              value={formData.qualitySystemCertification || "-"}
            />
          </FieldRow>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        <FieldRow label="经营范围">
          <ReadonlyText value={formData.businessScope || "-"} />
        </FieldRow>
        <FieldRow label="备注">
          <ReadonlyText value={formData.remarks || "-"} />
        </FieldRow>
      </div>
    </div>
  );
}

function renderAnnualEvaluationDetail(formData: SupplierAnnualEvaluationFormData) {
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle icon={FileSearch} title="评价记录" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>物料名称</TableHead>
              <TableHead>物料类别</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">应交数量</TableHead>
              <TableHead className="text-right">实交数量</TableHead>
              <TableHead className="text-right">质量</TableHead>
              <TableHead className="text-right">交货</TableHead>
              <TableHead className="text-right">价格</TableHead>
              <TableHead className="text-right">服务</TableHead>
              <TableHead className="text-right">综合</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-slate-400">
                  暂无评价记录
                </TableCell>
              </TableRow>
            ) : (
              formData.items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{formatDateValue(item.date)}</TableCell>
                  <TableCell>{item.materialName || "-"}</TableCell>
                  <TableCell>{item.materialCategory || "-"}</TableCell>
                  <TableCell>{item.unit || "-"}</TableCell>
                  <TableCell className="text-right">{item.shouldQty || "-"}</TableCell>
                  <TableCell className="text-right">{item.actualQty || "-"}</TableCell>
                  <TableCell className="text-right">{item.qualityScore || "-"}</TableCell>
                  <TableCell className="text-right">{item.deliveryScore || "-"}</TableCell>
                  <TableCell className="text-right">{item.priceScore || "-"}</TableCell>
                  <TableCell className="text-right">{item.serviceScore || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {getAnnualEvaluationItemTotal(item)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        <FieldRow label="综合平均分数">
          <ReadonlyText value={formatDisplayNumber(getAnnualEvaluationAverage(formData))} />
        </FieldRow>
        <FieldRow label="评价结果">
          <ReadonlyText
            value={
              formData.result === "qualified"
                ? "合格"
                : formData.result === "rectify"
                  ? "整改"
                  : formData.result === "cancel"
                    ? "撤消"
                    : "-"
            }
          />
        </FieldRow>
        <FieldRow label="编制">
          <ReadonlyText value={formData.preparedBy || "-"} />
        </FieldRow>
        <FieldRow label="审核">
          <ReadonlyText value={formData.reviewedBy || "-"} />
        </FieldRow>
      </div>

      <FieldRow label="评价意见">
        <ReadonlyText value={formData.resultOpinion || "-"} />
      </FieldRow>
      <FieldRow label="备注">
        <ReadonlyText value={formData.remarks || "-"} />
      </FieldRow>
    </div>
  );
}

function renderQualityAgreementDetail(formData: SupplierQualityAgreementFormData) {
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle icon={ShieldCheck} title="协议签署信息" />
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <FieldRow label="签订日期">
            <ReadonlyText value={formatDateValue(formData.signDate)} />
          </FieldRow>
          <FieldRow label="合同编号">
            <ReadonlyText value={formData.contractNo || "-"} />
          </FieldRow>
          <FieldRow label="供方地址">
            <ReadonlyText value={formData.supplierAddress || "-"} />
          </FieldRow>
          <FieldRow label="法定代表人">
            <ReadonlyText value={formData.supplierLegalRepresentative || "-"} />
          </FieldRow>
          <FieldRow label="联系人">
            <ReadonlyText value={formData.supplierContact || "-"} />
          </FieldRow>
          <FieldRow label="联系电话">
            <ReadonlyText value={formData.supplierPhone || "-"} />
          </FieldRow>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-sm leading-7 text-slate-700">
        质量保证协议正文按《QT-QP12-13 质量保证协议》固定模板输出，详情打印预览会严格按你提供的
        DOC 版式生成，不允许在这里手工改动协议正文。
      </div>
    </div>
  );
}

export default function SupplierProfilesPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | SupplierProfileFormType>("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [editingRecord, setEditingRecord] = useState<SupplierProfileRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<SupplierProfileRecord | null>(null);
  const [previewRecord, setPreviewRecord] = useState<SupplierProfileRecord | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

  const [form, setForm] = useState<SupplierProfileFormState>(
    buildDefaultFormState("survey")
  );

  const { data: rawSuppliers = [] } = trpc.suppliers.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: rawRecords = [], isLoading } = trpc.supplierProfileRecords.list.useQuery(
    {
      search: search || undefined,
      supplierId:
        supplierFilter !== "all" ? Number(supplierFilter || 0) : undefined,
      formType: activeTab !== "all" ? activeTab : undefined,
      status: statusFilter !== "all" ? (statusFilter as SupplierProfileStatus) : undefined,
    },
    {
      staleTime: 10_000,
    }
  );

  const suppliers = useMemo<SupplierRow[]>(
    () =>
      (rawSuppliers as any[]).map(row => ({
        id: Number(row.id),
        code: String(row.code || ""),
        name: String(row.name || ""),
        contactPerson: String(row.contactPerson || ""),
        phone: String(row.phone || ""),
        email: String(row.email || ""),
        address: String(row.address || ""),
        status: String(row.status || ""),
      })),
    [rawSuppliers]
  );

  const supplierLookup = useMemo(
    () => new Map(suppliers.map(item => [Number(item.id), item])),
    [suppliers]
  );

  const records = useMemo<SupplierProfileRecord[]>(
    () =>
      (rawRecords as any[]).map(row => ({
        ...row,
        supplierId: Number(row.supplierId),
        formData: normalizeSupplierProfileFormData(
          row.formType,
          row.formData,
          supplierLookup.get(Number(row.supplierId))
        ),
      })),
    [rawRecords, supplierLookup]
  );

  const pagedRecords = useMemo(
    () => records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, records]
  );

  const statCards = useMemo(
    () => [
      {
        label: "资料总数",
        value: records.length,
        icon: FileText,
        color: "text-slate-900",
      },
      {
        label: "调查表",
        value: records.filter(item => item.formType === "survey").length,
        icon: FileSearch,
        color: "text-sky-600",
      },
      {
        label: "年度评价",
        value: records.filter(item => item.formType === "annual_evaluation").length,
        icon: ClipboardList,
        color: "text-indigo-600",
      },
      {
        label: "质量协议",
        value: records.filter(item => item.formType === "quality_agreement").length,
        icon: ShieldCheck,
        color: "text-emerald-600",
      },
    ],
    [records]
  );

  const createMutation = trpc.supplierProfileRecords.create.useMutation({
    onSuccess: async () => {
      await utils.supplierProfileRecords.list.invalidate();
      toast.success("供应商资料已创建");
      setFormOpen(false);
      setEditingRecord(null);
    },
    onError: error => toast.error("创建失败", { description: error.message }),
  });

  const updateMutation = trpc.supplierProfileRecords.update.useMutation({
    onSuccess: async () => {
      await utils.supplierProfileRecords.list.invalidate();
      toast.success("供应商资料已更新");
      setFormOpen(false);
      setEditingRecord(null);
    },
    onError: error => toast.error("更新失败", { description: error.message }),
  });

  const deleteMutation = trpc.supplierProfileRecords.delete.useMutation({
    onSuccess: async () => {
      await utils.supplierProfileRecords.list.invalidate();
      toast.success("供应商资料已删除");
    },
    onError: error => toast.error("删除失败", { description: error.message }),
  });

  const selectedSupplier = supplierLookup.get(Number(form.supplierId || 0));

  const openCreateDialog = () => {
    const defaultFormType =
      activeTab === "all" ? "survey" : (activeTab as SupplierProfileFormType);
    const supplier =
      supplierFilter !== "all"
        ? supplierLookup.get(Number(supplierFilter || 0))
        : undefined;
    setEditingRecord(null);
    setForm(buildDefaultFormState(defaultFormType, supplier));
    setFormOpen(true);
  };

  const openEditDialog = (record: SupplierProfileRecord) => {
    setEditingRecord(record);
    setForm({
      supplierId: String(record.supplierId),
      formType: record.formType,
      serialNo: record.serialNo || "",
      yearLabel: record.yearLabel || "",
      status: record.status,
      formData: normalizeSupplierProfileFormData(
        record.formType,
        record.formData,
        supplierLookup.get(record.supplierId)
      ),
    });
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleDelete = (record: SupplierProfileRecord) => {
    const confirmed = window.confirm(
      `确认删除“${record.supplierName} - ${SUPPLIER_PROFILE_FORM_LABELS[record.formType]}”吗？`
    );
    if (!confirmed) return;
    deleteMutation.mutate({ id: record.id });
  };

  const handleFormTypeChange = (value: SupplierProfileFormType) => {
    const supplier = supplierLookup.get(Number(form.supplierId || 0));
    setForm(prev => ({
      ...buildDefaultFormState(value, supplier),
      supplierId: prev.supplierId,
      serialNo: prev.serialNo,
      status: prev.status,
    }));
  };

  const handleSupplierChange = (value: string) => {
    const supplier = supplierLookup.get(Number(value || 0));
    setForm(prev => ({
      ...prev,
      supplierId: value,
      formData: syncSupplierFields(
        prev.formType,
        normalizeSupplierProfileFormData(prev.formType, prev.formData, supplier),
        supplier
      ),
    }));
  };

  const handleSubmit = () => {
    const supplierId = Number(form.supplierId || 0);
    if (!supplierId) {
      toast.warning("请先选择供应商");
      return;
    }
    const supplier = supplierLookup.get(supplierId);
    if (!supplier) {
      toast.warning("未找到对应供应商");
      return;
    }

    const payload = {
      supplierId,
      supplierName: supplier.name,
      formType: form.formType,
      serialNo: form.serialNo || undefined,
      yearLabel:
        form.formType === "annual_evaluation"
          ? form.yearLabel || undefined
          : undefined,
      status: form.status,
      formData: form.formData,
    };

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: payload,
      });
      return;
    }
    createMutation.mutate(payload);
  };

  const handleSurveyAttachmentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (form.formType !== "survey") return;
    const supplierId = Number(form.supplierId || 0);
    if (!supplierId) {
      toast.warning("请先选择供应商后再上传附件");
      return;
    }
    const supplier = supplierLookup.get(supplierId);
    if (!supplier) {
      toast.warning("未找到对应供应商");
      return;
    }
    try {
      setAttachmentUploading(true);
      const savedFiles = await uploadFiles(
        buildSupplierAttachmentDir(supplier.name),
        Array.from(files)
      );
      const uploadedAt = new Date().toISOString();
      const attachments = savedFiles.map((file, index) => ({
        id: `att-${Date.now()}-${index}`,
        name: file.name,
        path: file.path,
        size: file.size,
        uploadedAt,
      })) satisfies SupplierProfileAttachment[];

      setForm(prev => ({
        ...prev,
        formData: {
          ...(prev.formData as SupplierSurveyFormData),
          attachments: [
            ...((prev.formData as SupplierSurveyFormData).attachments || []),
            ...attachments,
          ],
        },
      }));
      toast.success(`附件已上传到文件管理，共 ${attachments.length} 个文件`);
    } catch (error: any) {
      toast.error("附件上传失败", {
        description: String(error?.message || error || "未知错误"),
      });
    } finally {
      setAttachmentUploading(false);
    }
  };

  const handleSurveyAttachmentRemove = (attachmentId: string) => {
    setForm(prev => ({
      ...prev,
      formData: {
        ...(prev.formData as SupplierSurveyFormData),
        attachments: ((prev.formData as SupplierSurveyFormData).attachments || []).filter(
          item => item.id !== attachmentId
        ),
      },
    }));
  };

  const openAttachmentPreview = async (path: string) => {
    if (!path) return;
    try {
      const url = await requestPreviewUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error("打开附件失败", {
        description: String(error?.message || error || "未知错误"),
      });
    }
  };

  const renderSurveyForm = () => {
    const formData = form.formData as SupplierSurveyFormData;
    const updateField = (key: keyof SupplierSurveyFormData, value: string) => {
      setForm(prev => ({
        ...prev,
        formData: {
          ...(prev.formData as SupplierSurveyFormData),
          [key]: value,
        },
      }));
    };

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>物料名称</Label>
            <Input value={formData.materialName} onChange={e => updateField("materialName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>物料类别</Label>
            <Input value={formData.materialCategory} onChange={e => updateField("materialCategory", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>物料编号</Label>
            <Input value={formData.materialCode} onChange={e => updateField("materialCode", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>企业性质</Label>
            <Select
              value={formData.enterpriseNature || "__none__"}
              onValueChange={value =>
                updateField(
                  "enterpriseNature",
                  value === "__none__" ? "" : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择企业性质" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">未选择</SelectItem>
                <SelectItem value="manufacturer">制造商</SelectItem>
                <SelectItem value="agent">代理商</SelectItem>
                <SelectItem value="service">服务</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>联系人</Label>
            <Input value={formData.contactPerson} onChange={e => updateField("contactPerson", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>职位</Label>
            <Input value={formData.position} onChange={e => updateField("position", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>电话</Label>
            <Input value={formData.phone} onChange={e => updateField("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>邮箱</Label>
            <Input value={formData.email} onChange={e => updateField("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>传真</Label>
            <Input value={formData.fax} onChange={e => updateField("fax", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>单位负责人</Label>
            <Input value={formData.principal} onChange={e => updateField("principal", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>业务联络地址</Label>
            <Input value={formData.businessAddress} onChange={e => updateField("businessAddress", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>工厂地址</Label>
            <Input value={formData.factoryAddress} onChange={e => updateField("factoryAddress", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>业务电话</Label>
            <Input value={formData.businessPhone} onChange={e => updateField("businessPhone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>工厂电话</Label>
            <Input value={formData.factoryPhone} onChange={e => updateField("factoryPhone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>厂房面积</Label>
            <Input value={formData.plantArea} onChange={e => updateField("plantArea", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>员工总人数</Label>
            <Input value={formData.employeeCount} onChange={e => updateField("employeeCount", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>注册资本</Label>
            <Input value={formData.registeredCapital} onChange={e => updateField("registeredCapital", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>年产量</Label>
            <Input value={formData.annualCapacity} onChange={e => updateField("annualCapacity", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>主管部门</Label>
            <Input value={formData.supervisingDepartment} onChange={e => updateField("supervisingDepartment", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>经营资质</Label>
            <Input value={formData.businessQualification} onChange={e => updateField("businessQualification", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>经营范围</Label>
            <Textarea rows={3} value={formData.businessScope} onChange={e => updateField("businessScope", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>品质负责人</Label>
            <Input value={formData.qualityResponsible} onChange={e => updateField("qualityResponsible", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>品质负责人职位</Label>
            <Input value={formData.qualityPosition} onChange={e => updateField("qualityPosition", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>品质负责人电话</Label>
            <Input value={formData.qualityPhone} onChange={e => updateField("qualityPhone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>品质负责人邮箱</Label>
            <Input value={formData.qualityEmail} onChange={e => updateField("qualityEmail", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>品质负责人传真</Label>
            <Input value={formData.qualityFax} onChange={e => updateField("qualityFax", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>填表人</Label>
            <Input value={formData.filledBy} onChange={e => updateField("filledBy", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>日期</Label>
            <Input type="date" value={formData.filledDate} onChange={e => updateField("filledDate", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>主要检测设备</Label>
            <Textarea rows={3} value={formData.mainTestingEquipment} onChange={e => updateField("mainTestingEquipment", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>产品符合之标准</Label>
            <Textarea rows={3} value={formData.productStandards} onChange={e => updateField("productStandards", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>体系认证/注册</Label>
            <Textarea rows={3} value={formData.qualitySystemCertification} onChange={e => updateField("qualitySystemCertification", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>备注</Label>
            <Textarea rows={3} value={formData.remarks} onChange={e => updateField("remarks", e.target.value)} />
          </div>
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <Label>附件上传</Label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                {attachmentUploading ? "上传中..." : "上传到文件管理"}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async e => {
                    await handleSurveyAttachmentUpload(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {(formData.attachments || []).length > 0 ? (
              <div className="rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>文件名</TableHead>
                      <TableHead>保存位置</TableHead>
                      <TableHead>上传时间</TableHead>
                      <TableHead className="w-[110px] text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formData.attachments || []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="max-w-[420px] truncate text-xs text-slate-500" title={item.path}>
                          {item.path}
                        </TableCell>
                        <TableCell>{formatDateValue(item.uploadedAt)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => openAttachmentPreview(item.path)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleSurveyAttachmentRemove(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                暂无附件，上传后会自动保存到文件管理。
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAnnualEvaluationForm = () => {
    const formData = form.formData as SupplierAnnualEvaluationFormData;
    const updateField = (
      key: keyof SupplierAnnualEvaluationFormData,
      value: string
    ) => {
      setForm(prev => ({
        ...prev,
        formData: {
          ...(prev.formData as SupplierAnnualEvaluationFormData),
          [key]: value,
        },
      }));
    };
    const updateItem = (id: string, key: string, value: string) => {
      setForm(prev => ({
        ...prev,
        formData: {
          ...(prev.formData as SupplierAnnualEvaluationFormData),
          items: (prev.formData as SupplierAnnualEvaluationFormData).items.map(
            item => (item.id === id ? { ...item, [key]: value } : item)
          ),
        },
      }));
    };
    const addItem = () => {
      setForm(prev => ({
        ...prev,
        formData: {
          ...(prev.formData as SupplierAnnualEvaluationFormData),
          items: [
            ...(prev.formData as SupplierAnnualEvaluationFormData).items,
            createEmptyAnnualEvaluationItem(),
          ],
        },
      }));
    };
    const removeItem = (id: string) => {
      setForm(prev => ({
        ...prev,
        formData: {
          ...(prev.formData as SupplierAnnualEvaluationFormData),
          items: (prev.formData as SupplierAnnualEvaluationFormData).items.filter(
            item => item.id !== id
          ),
        },
      }));
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            评价结果会按明细评分自动汇总，打印版式按 QT-QP12-06 固定输出。
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" />
            增加一行
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>物料名称</TableHead>
              <TableHead>物料类别</TableHead>
              <TableHead>单位</TableHead>
              <TableHead>应交数量</TableHead>
              <TableHead>实交数量</TableHead>
              <TableHead>质量</TableHead>
              <TableHead>交货</TableHead>
              <TableHead>价格</TableHead>
              <TableHead>服务</TableHead>
              <TableHead>综合</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.items.map(item => (
              <TableRow key={item.id}>
                <TableCell><Input type="date" value={item.date} onChange={e => updateItem(item.id, "date", e.target.value)} /></TableCell>
                <TableCell><Input value={item.materialName} onChange={e => updateItem(item.id, "materialName", e.target.value)} /></TableCell>
                <TableCell><Input value={item.materialCategory} onChange={e => updateItem(item.id, "materialCategory", e.target.value)} /></TableCell>
                <TableCell><Input value={item.unit} onChange={e => updateItem(item.id, "unit", e.target.value)} className="w-20" /></TableCell>
                <TableCell><Input value={item.shouldQty} onChange={e => updateItem(item.id, "shouldQty", e.target.value)} className="w-24" /></TableCell>
                <TableCell><Input value={item.actualQty} onChange={e => updateItem(item.id, "actualQty", e.target.value)} className="w-24" /></TableCell>
                <TableCell><Input value={item.qualityScore} onChange={e => updateItem(item.id, "qualityScore", e.target.value)} className="w-20" /></TableCell>
                <TableCell><Input value={item.deliveryScore} onChange={e => updateItem(item.id, "deliveryScore", e.target.value)} className="w-20" /></TableCell>
                <TableCell><Input value={item.priceScore} onChange={e => updateItem(item.id, "priceScore", e.target.value)} className="w-20" /></TableCell>
                <TableCell><Input value={item.serviceScore} onChange={e => updateItem(item.id, "serviceScore", e.target.value)} className="w-20" /></TableCell>
                <TableCell className="font-semibold">{getAnnualEvaluationItemTotal(item)}</TableCell>
                <TableCell className="text-center">
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>评价结果</Label>
            <Select
              value={formData.result || "__none__"}
              onValueChange={value => updateField("result", value === "__none__" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">未选择</SelectItem>
                <SelectItem value="qualified">合格</SelectItem>
                <SelectItem value="rectify">整改</SelectItem>
                <SelectItem value="cancel">撤消</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>综合平均分数</Label>
            <Input value={formatDisplayNumber(getAnnualEvaluationAverage(formData))} readOnly className="bg-slate-50 text-slate-500" />
          </div>
          <div className="space-y-2">
            <Label>编制</Label>
            <Input value={formData.preparedBy} onChange={e => updateField("preparedBy", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>审核</Label>
            <Input value={formData.reviewedBy} onChange={e => updateField("reviewedBy", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>评价意见</Label>
            <Textarea rows={3} value={formData.resultOpinion} onChange={e => updateField("resultOpinion", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>备注</Label>
            <Textarea rows={3} value={formData.remarks} onChange={e => updateField("remarks", e.target.value)} />
          </div>
        </div>
      </div>
    );
  };

  const renderQualityAgreementForm = () => {
    const formData = form.formData as SupplierQualityAgreementFormData;
    const updateField = (
      key: keyof SupplierQualityAgreementFormData,
      value: string
    ) => {
      setForm(prev => ({
        ...prev,
        formData: {
          ...(prev.formData as SupplierQualityAgreementFormData),
          [key]: value,
        },
      }));
    };
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-900">
          协议正文按你提供的《QT-QP12-13 质量保证协议》固定，不在表单中开放编辑。这里仅维护乙方信息、签订日期和合同编号，打印时自动套用标准模板。
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>签订日期</Label>
            <Input type="date" value={formData.signDate} onChange={e => updateField("signDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>合同编号</Label>
            <Input value={formData.contractNo} onChange={e => updateField("contractNo", e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>供方地址</Label>
            <Input value={formData.supplierAddress} onChange={e => updateField("supplierAddress", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>法定代表人</Label>
            <Input value={formData.supplierLegalRepresentative} onChange={e => updateField("supplierLegalRepresentative", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>联系人</Label>
            <Input value={formData.supplierContact} onChange={e => updateField("supplierContact", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>联系电话</Label>
            <Input value={formData.supplierPhone} onChange={e => updateField("supplierPhone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>供方盖章名称</Label>
            <Input value={formData.supplierStampName} onChange={e => updateField("supplierStampName", e.target.value)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <ERPLayout>
      <div className="space-y-6 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  供应商资料
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  统一管理供应商调查表、年度评价表、质量保证协议，打印模板按你提供的 DOC 固定输出。
                </p>
              </div>
            </div>
            <Button onClick={openCreateDialog} className="h-11 gap-2 px-5">
              <Plus className="h-4 w-4" />
              新建资料
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {statCards.map(item => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className={`mt-2 text-3xl font-bold ${item.color}`}>{item.value}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-slate-500">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <Tabs
              value={activeTab}
              onValueChange={value => {
                setActiveTab(value as "all" | SupplierProfileFormType);
                setPage(1);
              }}
            >
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger value="all">全部资料</TabsTrigger>
                <TabsTrigger value="survey">调查表</TabsTrigger>
                <TabsTrigger value="annual_evaluation">年度评价</TabsTrigger>
                <TabsTrigger value="quality_agreement">质量协议</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="搜索资料编号、供应商名称、序号..."
                  className="h-11 pl-10"
                />
              </div>
              <Select
                value={supplierFilter}
                onValueChange={value => {
                  setSupplierFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="全部供应商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部供应商</SelectItem>
                  {suppliers.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={value => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="全部状态" />
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

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>资料编号</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>资料类型</TableHead>
                  <TableHead>模板编号</TableHead>
                  <TableHead>序号/年度</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[90px] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400">
                      正在加载供应商资料...
                    </TableCell>
                  </TableRow>
                ) : pagedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400">
                      暂无供应商资料
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRecords.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm font-semibold text-slate-900">
                        {record.recordNo}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-900">
                            {record.supplierName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {supplierLookup.get(record.supplierId)?.code || "未维护编码"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SUPPLIER_PROFILE_FORM_LABELS[record.formType]}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.templateCode}</TableCell>
                      <TableCell>
                        {record.formType === "annual_evaluation"
                          ? record.yearLabel || "-"
                          : record.serialNo || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusMeta[record.status]?.variant || "outline"}
                          className={getStatusSemanticClass(
                            record.status,
                            statusMeta[record.status]?.label
                          )}
                        >
                          {SUPPLIER_PROFILE_STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateValue(record.updatedAt || record.createdAt)}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setViewingRecord(record);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEditDialog(record)}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setPreviewRecord(record);
                                setPreviewOpen(true);
                              }}
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              打印预览
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => handleDelete(record)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePaginationFooter total={records.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      </div>

      <DraggableDialog
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(null);
          }
        }}
        defaultWidth={1320}
        defaultHeight={860}
        minWidth={960}
        minHeight={720}
        maxWidth="96vw"
        maxHeight="94vh"
        printable={false}
      >
        <DraggableDialogContent className="w-full max-w-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {editingRecord ? "编辑供应商资料" : "新建供应商资料"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              表单内容按采购体系固定模板维护，打印版式将严格按你提供的 DOC 样式输出。
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="space-y-2 lg:col-span-2">
                <Label>供应商</Label>
                <Select value={form.supplierId || "__none__"} onValueChange={value => handleSupplierChange(value === "__none__" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">未选择</SelectItem>
                    {suppliers.map(item => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>资料类型</Label>
                <Select value={form.formType} onValueChange={value => handleFormTypeChange(value as SupplierProfileFormType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="survey">供应商调查表</SelectItem>
                    <SelectItem value="annual_evaluation">供应商年度评价表</SelectItem>
                    <SelectItem value="quality_agreement">质量保证协议</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>模板编号</Label>
                <Input value={SUPPLIER_PROFILE_TEMPLATE_CODES[form.formType]} readOnly className="bg-slate-50 text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={form.status} onValueChange={value => setForm(prev => ({ ...prev, status: value as SupplierProfileStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>序号</Label>
                <Input value={form.serialNo} onChange={e => setForm(prev => ({ ...prev, serialNo: e.target.value }))} placeholder="可选" />
              </div>
              <div className="space-y-2">
                <Label>供应商编码</Label>
                <Input value={selectedSupplier?.code || ""} readOnly className="bg-slate-50 text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label>联系人</Label>
                <Input value={selectedSupplier?.contactPerson || ""} readOnly className="bg-slate-50 text-slate-500" />
              </div>
              {form.formType === "annual_evaluation" ? (
                <div className="space-y-2">
                  <Label>年度</Label>
                  <Input value={form.yearLabel} onChange={e => setForm(prev => ({ ...prev, yearLabel: e.target.value }))} />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {form.formType === "survey"
                ? renderSurveyForm()
                : form.formType === "annual_evaluation"
                  ? renderAnnualEvaluationForm()
                  : renderQualityAgreementForm()}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingRecord ? "保存修改" : "创建资料"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        defaultWidth={1180}
        defaultHeight={820}
        minWidth={860}
        minHeight={680}
        maxWidth="94vw"
        maxHeight="92vh"
        printable={false}
      >
        <DraggableDialogContent className="w-full max-w-none">
          {viewingRecord ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {SUPPLIER_PROFILE_FORM_LABELS[viewingRecord.formType]}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{viewingRecord.recordNo}</span>
                  <span>·</span>
                  <span>{viewingRecord.supplierName}</span>
                  <Badge
                    variant={statusMeta[viewingRecord.status]?.variant || "outline"}
                    className={getStatusSemanticClass(
                      viewingRecord.status,
                      statusMeta[viewingRecord.status]?.label
                    )}
                  >
                    {SUPPLIER_PROFILE_STATUS_LABELS[viewingRecord.status]}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-500">模板编号</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {viewingRecord.templateCode}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-500">
                        {viewingRecord.formType === "annual_evaluation" ? "年度" : "序号"}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {viewingRecord.formType === "annual_evaluation"
                          ? viewingRecord.yearLabel || "-"
                          : viewingRecord.serialNo || "-"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-500">更新时间</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {formatDateValue(viewingRecord.updatedAt || viewingRecord.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-500">供应商编码</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {supplierLookup.get(viewingRecord.supplierId)?.code || "-"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {viewingRecord.formType === "survey"
                    ? renderSurveyDetail(
                        viewingRecord.formData as SupplierSurveyFormData
                      )
                    : viewingRecord.formType === "annual_evaluation"
                      ? renderAnnualEvaluationDetail(
                          viewingRecord.formData as SupplierAnnualEvaluationFormData
                        )
                      : renderQualityAgreementDetail(
                        viewingRecord.formData as SupplierQualityAgreementFormData
                      )}
                </div>

                {viewingRecord.formType === "survey" ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionTitle icon={FileCheck2} title="附件" />
                    {(
                      (viewingRecord.formData as SupplierSurveyFormData).attachments || []
                    ).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>文件名</TableHead>
                            <TableHead>保存位置</TableHead>
                            <TableHead>上传时间</TableHead>
                            <TableHead className="w-[110px] text-center">预览</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(
                            (viewingRecord.formData as SupplierSurveyFormData)
                              .attachments || []
                          ).map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="max-w-[480px] truncate text-xs text-slate-500" title={item.path}>
                                {item.path}
                              </TableCell>
                              <TableCell>{formatDateValue(item.uploadedAt)}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAttachmentPreview(item.path)}
                                >
                                  <ExternalLink className="mr-1 h-4 w-4" />
                                  预览
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                        暂无附件
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewRecord(viewingRecord);
                    setPreviewOpen(true);
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  打印预览
                </Button>
                <Button variant="outline" onClick={() => openEditDialog(viewingRecord)}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </Button>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DraggableDialogContent>
      </DraggableDialog>

      <SupplierProfilePrintPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        record={previewRecord}
        supplier={
          previewRecord
            ? supplierLookup.get(Number(previewRecord.supplierId)) || null
            : null
        }
      />
    </ERPLayout>
  );
}
