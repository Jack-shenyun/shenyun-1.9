import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import ModulePage, { Column, StatusBadge } from "@/components/ModulePage";
import FormDialog, { FormField } from "@/components/FormDialog";
import { SupplierDetailDialog } from "@/components/SupplierDetailDialog";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DraftDrawer, { DraftItem } from "@/components/DraftDrawer";
import { toast } from "sonner";
import {
  PAYMENT_CONDITION_OPTIONS,
  normalizePaymentCondition,
} from "@shared/paymentTerms";

interface Supplier {
  id: number;
  code: string;
  name: string;
  shortName?: string;
  category: string;
  level: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNo?: string;
  bankAccount?: string;
  paymentTerms?: string;
  creditDays?: number;
  businessLicense?: string;
  evaluationScore?: string;
  status: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

const dbStatusToFrontend: Record<string, string> = {
  qualified: "approved",
  pending: "pending",
  disqualified: "blacklist",
};
const frontendStatusToDb: Record<
  string,
  "qualified" | "pending" | "disqualified"
> = {
  approved: "qualified",
  pending: "pending",
  suspended: "disqualified",
  blacklist: "disqualified",
};
const dbTypeToCategory: Record<string, string> = {
  material: "material",
  equipment: "equipment",
  service: "service",
};
const categoryToDbType: Record<string, "material" | "equipment" | "service"> = {
  material: "material",
  package: "material",
  equipment: "equipment",
  service: "service",
};

const statusMap: Record<string, any> = {
  pending: { label: "待审核", variant: "outline" as const },
  approved: { label: "已认证", variant: "default" as const },
  suspended: { label: "已暂停", variant: "destructive" as const },
  blacklist: { label: "黑名单", variant: "destructive" as const },
};

const levelMap: Record<string, { label: string; color: string }> = {
  A: { label: "A级", color: "bg-green-100 text-green-800" },
  B: { label: "B级", color: "bg-blue-100 text-blue-800" },
  C: { label: "C级", color: "bg-amber-100 text-amber-800" },
  pending: { label: "待评级", color: "bg-gray-100 text-gray-800" },
};

const categoryMap: Record<string, string> = {
  material: "原材料",
  package: "包装材料",
  equipment: "设备",
  service: "服务",
};

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
};

const formFields: FormField[] = [
  {
    name: "code",
    label: "供应商编码",
    type: "text",
    required: true,
    placeholder: "如：SUP-001",
  },
  {
    name: "name",
    label: "供应商名称",
    type: "text",
    required: true,
    placeholder: "请输入供应商全称",
  },
  {
    name: "category",
    label: "供应类别",
    type: "select",
    required: true,
    options: [
      { label: "原材料", value: "material" },
      { label: "包装材料", value: "package" },
      { label: "设备", value: "equipment" },
      { label: "服务", value: "service" },
    ],
  },
  {
    name: "level",
    label: "供应商等级",
    type: "select",
    required: true,
    options: [
      { label: "A级（优秀）", value: "A" },
      { label: "B级（良好）", value: "B" },
      { label: "C级（一般）", value: "C" },
      { label: "待评级", value: "pending" },
    ],
    defaultValue: "pending",
  },
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    options: [
      { label: "待审核", value: "pending" },
      { label: "已认证", value: "approved" },
      { label: "已暂停", value: "suspended" },
      { label: "黑名单", value: "blacklist" },
    ],
    defaultValue: "pending",
  },
  {
    name: "contactPerson",
    label: "联系人",
    type: "text",
    required: true,
    placeholder: "请输入联系人姓名",
  },
  {
    name: "phone",
    label: "联系电话",
    type: "tel",
    required: true,
    placeholder: "请输入联系电话",
  },
  {
    name: "email",
    label: "电子邮箱",
    type: "email",
    placeholder: "请输入电子邮箱",
  },
  {
    name: "address",
    label: "地址",
    type: "text",
    placeholder: "请输入详细地址",
  },
  {
    name: "taxNo",
    label: "税号",
    type: "text",
    placeholder: "请输入纳税人识别号",
  },
  {
    name: "paymentTerms",
    label: "付款条件",
    type: "select",
    options: PAYMENT_CONDITION_OPTIONS,
  },
  {
    name: "creditDays",
    label: "账期天数",
    type: "select",
    defaultValue: "30",
    options: [
      { label: "30天", value: "30" },
      { label: "60天", value: "60" },
      { label: "90天", value: "90" },
      { label: "120天", value: "120" },
    ],
    hidden: formData =>
      normalizePaymentCondition(formData.paymentTerms) !== "账期支付",
  },
  {
    name: "bankAccount",
    label: "银行账号",
    type: "text",
    placeholder: "请输入银行账号",
  },
  {
    name: "businessLicense",
    label: "营业执照号",
    type: "text",
    placeholder: "请输入营业执照号",
  },
  {
    name: "remarks",
    label: "备注",
    type: "textarea",
    span: 2,
    placeholder: "请输入备注信息",
  },
];

const columns: Column<Supplier>[] = [
  { key: "code", title: "供应商编码", width: "105px" },
  { key: "name", title: "供应商名称", width: "38%" },
  {
    key: "category",
    title: "供应类别",
    width: "110px",
    render: value => (
      <Badge variant="outline">{categoryMap[value] || value}</Badge>
    ),
  },
  { key: "contactPerson", title: "联系人", width: "100px" },
  { key: "phone", title: "联系电话", width: "140px" },
  {
    key: "level",
    title: "等级",
    width: "80px",
    render: value => {
      const config = levelMap[value];
      return config ? (
        <span
          className={"px-2 py-1 rounded text-xs font-medium " + config.color}
        >
          {config.label}
        </span>
      ) : (
        value
      );
    },
  },
  {
    key: "status",
    title: "状态",
    width: "90px",
    render: value => <StatusBadge status={value} statusMap={statusMap} />,
  },
];

function dbToSupplier(dbRecord: any): Supplier {
  return {
    id: dbRecord.id,
    code: dbRecord.code,
    name: dbRecord.name,
    shortName: dbRecord.shortName,
    category: dbTypeToCategory[dbRecord.type] || dbRecord.type,
    level: dbRecord.qualificationLevel || "pending",
    contactPerson: dbRecord.contactPerson,
    phone: dbRecord.phone,
    email: dbRecord.email,
    address: dbRecord.address,
    taxNo: dbRecord.taxNo,
    bankAccount: dbRecord.bankAccount,
    paymentTerms: normalizePaymentCondition(dbRecord.paymentTerms),
    creditDays: dbRecord.creditDays,
    businessLicense: dbRecord.businessLicense,
    evaluationScore: dbRecord.evaluationScore,
    status: dbStatusToFrontend[dbRecord.status] || dbRecord.status,
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  };
}

export default function SuppliersPage() {
  const {
    data: suppliersData,
    isLoading,
    refetch,
  } = trpc.suppliers.list.useQuery();
  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => refetch(),
  });
  const importCreateMutation = trpc.suppliers.create.useMutation();
  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [data, setData] = useState<Supplier[]>([]);
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState("all");
  const [supplierLevelFilter, setSupplierLevelFilter] = useState("all");

  useEffect(() => {
    if (suppliersData) {
      setData(suppliersData.map(dbToSupplier));
    }
  }, [suppliersData]);

  const drafts = data.filter((d: any) => d.status === "pending");
  const draftItems: DraftItem[] = drafts.map((d: any) => ({
    id: d.id,
    title: d.name || d.code,
    subtitle: d.code + (d.contactPerson ? " · " + d.contactPerson : ""),
    updatedAt: d.updatedAt,
    createdAt: d.createdAt,
  }));

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Supplier | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Supplier | null>(null);

  const handleDraftEdit = (item: DraftItem) => {
    const record = data.find(d => d.id === item.id);
    if (record) handleEdit(record);
  };
  const handleDraftDelete = (item: DraftItem) => {
    const record = data.find(d => d.id === item.id);
    if (record) handleDelete(record);
  };

  const matchesQuickFilters = (supplier: Supplier) => {
    const categoryMatch =
      supplierCategoryFilter === "all" ||
      supplier.category === supplierCategoryFilter;
    const levelMatch =
      supplierLevelFilter === "all" || supplier.level === supplierLevelFilter;
    return categoryMatch && levelMatch;
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };
  const handleEdit = (record: Supplier) => {
    setEditingRecord(record);
    setFormOpen(true);
  };
  const handleView = (record: Supplier) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };
  const handleDelete = (record: Supplier) => {
    deleteMutation.mutate(
      { id: record.id },
      {
        onSuccess: () => toast.success("供应商已删除"),
        onError: err => toast.error("删除失败", { description: err.message }),
      }
    );
  };

  const buildDbPayload = (formData: Record<string, any>) => ({
    shortName: formData.shortName || undefined,
    type: (categoryToDbType[formData.category] || "material") as
      | "material"
      | "equipment"
      | "service",
    qualificationLevel: (["A", "B", "C"].includes(formData.level)
      ? formData.level
      : "pending") as "A" | "B" | "C" | "pending",
    status: (frontendStatusToDb[formData.status] || "pending") as
      | "qualified"
      | "pending"
      | "disqualified",
    code: formData.code,
    name: formData.name,
    contactPerson: formData.contactPerson || undefined,
    phone: formData.phone || undefined,
    email: formData.email || undefined,
    address: formData.address || undefined,
    taxNo: formData.taxNo || undefined,
    bankAccount: formData.bankAccount || undefined,
    paymentTerms: formData.paymentTerms
      ? normalizePaymentCondition(formData.paymentTerms)
      : undefined,
    creditDays:
      normalizePaymentCondition(formData.paymentTerms) === "账期支付"
        ? Number(formData.creditDays || 30)
        : undefined,
    businessLicense: formData.businessLicense || undefined,
  });

  const handleSubmit = (formData: Record<string, any>) => {
    if (editingRecord) {
      updateMutation.mutate(
        { id: editingRecord.id, data: buildDbPayload(formData) },
        {
          onSuccess: () => toast.success("供应商信息已更新"),
          onError: err => toast.error("更新失败", { description: err.message }),
        }
      );
    } else {
      createMutation.mutate(buildDbPayload(formData), {
        onSuccess: () => toast.success("供应商已创建"),
        onError: err => toast.error("创建失败", { description: err.message }),
      });
    }
    setFormOpen(false);
  };

  const handleFormChange = (name: string, value: any) => {
    if (
      name === "paymentTerms" &&
      normalizePaymentCondition(value) === "账期支付"
    ) {
      return {
        creditDays: "30",
      };
    }
  };

  const handleSaveDraft = (formData: Record<string, any>) => {
    const payload = {
      ...buildDbPayload(formData),
      code: formData.code || "SUP-DRAFT-" + Date.now(),
      name: formData.name || "（草稿）",
      status: "pending" as const,
    };
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("草稿已保存", { description: "可在草稿库中继续编辑" });
        setFormOpen(false);
      },
      onError: err => toast.error("保存草稿失败", { description: err.message }),
    });
  };

  const handleExportSuppliers = (rows: Supplier[]) => {
    if (rows.length === 0) {
      toast.warning("暂无可导出数据");
      return;
    }

    const headers = [
      "供应商编码",
      "供应商名称",
      "供应商简称",
      "供应类别",
      "供应商等级",
      "状态",
      "联系人",
      "联系电话",
      "电子邮箱",
      "地址",
      "付款条件",
      "账期天数",
      "税号",
      "银行账号",
      "营业执照号",
    ];

    const body = rows.map(item =>
      [
        item.code,
        item.name,
        item.shortName || "",
        categoryMap[item.category] || item.category || "",
        levelMap[item.level]?.label || item.level || "",
        statusMap[item.status]?.label || item.status || "",
        item.contactPerson || "",
        item.phone || "",
        item.email || "",
        item.address || "",
        item.paymentTerms || "",
        normalizePaymentCondition(item.paymentTerms) === "账期支付"
          ? String(item.creditDays || "")
          : "",
        item.taxNo || "",
        item.bankAccount || "",
        item.businessLicense || "",
      ]
        .map(escapeCsvCell)
        .join(",")
    );

    const csv = [headers.map(escapeCsvCell).join(","), ...body].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = url;
    a.download = `供应商管理_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("供应商表格已导出");
  };

  const handleImportSuppliers = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("仅支持 CSV 导入，请先导出模板后再导入");
      return;
    }

    const text = (await file.text()).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      toast.warning("导入文件没有有效数据");
      return;
    }

    const headers = parseCsvLine(lines[0]);
    const colIndex = (name: string) =>
      headers.findIndex(header => header.trim() === name);
    const readCol = (row: string[], name: string) => {
      const index = colIndex(name);
      if (index < 0) return "";
      return String(row[index] ?? "").trim();
    };

    const categoryReverseMap: Record<string, string> = {
      原材料: "material",
      包装材料: "package",
      设备: "equipment",
      服务: "service",
      material: "material",
      package: "package",
      equipment: "equipment",
      service: "service",
    };
    const levelReverseMap: Record<string, string> = {
      A级: "A",
      "A级（优秀）": "A",
      B级: "B",
      "B级（良好）": "B",
      C级: "C",
      "C级（一般）": "C",
      待评级: "pending",
      pending: "pending",
      A: "A",
      B: "B",
      C: "C",
    };
    const statusReverseMap: Record<string, string> = {
      待审核: "pending",
      已认证: "approved",
      已暂停: "suspended",
      黑名单: "blacklist",
      pending: "pending",
      approved: "approved",
      suspended: "suspended",
      blacklist: "blacklist",
    };

    let nextCodeNum = (() => {
      let maxNum = 0;
      for (const item of data) {
        const match = String(item.code || "").match(/^SUP-(\d+)$/i);
        if (!match) continue;
        const value = Number(match[1]);
        if (Number.isFinite(value) && value > maxNum) {
          maxNum = value;
        }
      }
      return maxNum + 1;
    })();
    const allocNextCode = () => {
      const code = `SUP-${String(nextCodeNum).padStart(3, "0")}`;
      nextCodeNum += 1;
      return code;
    };

    let success = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i]);
      const name = readCol(row, "供应商名称");
      if (!name) continue;

      const paymentTerms = normalizePaymentCondition(
        readCol(row, "付款条件") || "先款后货"
      );
      const payload = buildDbPayload({
        code: readCol(row, "供应商编码") || allocNextCode(),
        name,
        shortName: readCol(row, "供应商简称") || undefined,
        category: categoryReverseMap[readCol(row, "供应类别")] || "material",
        level: levelReverseMap[readCol(row, "供应商等级")] || "pending",
        status: statusReverseMap[readCol(row, "状态")] || "pending",
        contactPerson: readCol(row, "联系人") || undefined,
        phone: readCol(row, "联系电话") || undefined,
        email: readCol(row, "电子邮箱") || undefined,
        address: readCol(row, "地址") || undefined,
        taxNo: readCol(row, "税号") || undefined,
        bankAccount: readCol(row, "银行账号") || undefined,
        paymentTerms,
        creditDays:
          paymentTerms === "账期支付"
            ? Number(readCol(row, "账期天数") || 30)
            : undefined,
        businessLicense: readCol(row, "营业执照号") || undefined,
      });

      try {
        await importCreateMutation.mutateAsync(payload);
        success += 1;
      } catch (error: any) {
        errors.push(`${payload.code}: ${error?.message || "导入失败"}`);
      }
    }

    await refetch();
    if (success > 0) {
      toast.success(`导入成功 ${success} 条`);
    }
    if (errors.length > 0) {
      toast.error(`导入失败 ${errors.length} 条`, {
        description: errors.slice(0, 2).join("；"),
      });
    }
  };

  return (
    <>
      <ModulePage
        title="供应商管理"
        description="建立供应商全生命周期管理，从引入评审到绩效考核"
        icon={Building2}
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="筛选供应商名称、编码、联系人..."
        searchFields={["code", "name", "shortName", "contactPerson", "phone"]}
        addButtonText="新增供应商"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        filterKey="status"
        customFilter={matchesQuickFilters}
        filterResetKey={`${supplierCategoryFilter}|${supplierLevelFilter}`}
        filterOptions={[
          { label: "待审核", value: "pending" },
          { label: "已认证", value: "approved" },
          { label: "已暂停", value: "suspended" },
          { label: "黑名单", value: "blacklist" },
        ]}
        toolbarFilters={
          <>
            <Select
              value={supplierCategoryFilter}
              onValueChange={setSupplierCategoryFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="供应类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类别</SelectItem>
                <SelectItem value="material">原材料</SelectItem>
                <SelectItem value="package">包装材料</SelectItem>
                <SelectItem value="equipment">设备</SelectItem>
                <SelectItem value="service">服务</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={supplierLevelFilter}
              onValueChange={setSupplierLevelFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="供应商等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                <SelectItem value="A">A级</SelectItem>
                <SelectItem value="B">B级</SelectItem>
                <SelectItem value="C">C级</SelectItem>
                <SelectItem value="pending">待评级</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        stats={[
          { label: "供应商总数", value: data.length },
          {
            label: "A级供应商",
            value: data.filter((d: any) => d.level === "A").length,
            color: "text-green-600",
          },
          {
            label: "C级供应商",
            value: data.filter((d: any) => d.level === "C").length,
            color: "text-slate-600",
          },
          {
            label: "已认证",
            value: data.filter((d: any) => d.status === "approved").length,
            color: "text-emerald-600",
          },
        ]}
        pageSize={10}
        compact
        showApprovalToggle={false}
        onExport={handleExportSuppliers}
        onImport={handleImportSuppliers}
        importAccept=".csv"
        headerActions={
          <DraftDrawer
            count={draftItems.length}
            drafts={draftItems}
            moduleName="供应商"
            onEdit={handleDraftEdit}
            onDelete={handleDraftDelete}
          />
        }
      />
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingRecord ? "编辑供应商" : "新增供应商"}
        description={
          editingRecord ? "修改供应商信息" : "填写供应商基本信息创建新供应商"
        }
        fields={formFields}
        initialData={
          editingRecord || {
            code: "SUP-" + String(data.length + 1).padStart(3, "0"),
            creditDays: "30",
          }
        }
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        submitText={editingRecord ? "保存修改" : "创建供应商"}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
      <SupplierDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        supplier={viewingRecord}
        onEdit={supplier => {
          setDetailOpen(false);
          handleEdit(supplier);
        }}
      />
    </>
  );
}
