import { formatDate } from "@/lib/formatters";
import { useState, useEffect } from "react";
import ModulePage, { Column, StatusBadge } from "@/components/ModulePage";
import FormDialog, { FormField, DetailDialog, DetailField } from "@/components/FormDialog";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Document {
  id: number;
  docNo: string;
  title: string;
  category: "policy" | "sop" | "record" | "certificate" | "external" | "contract";
  version: string | null;
  department: string | null;
  status: "draft" | "reviewing" | "approved" | "obsolete";
  effectiveDate: string | Date | null;
  description: string | null;
  createdBy: number | null;
  createdAt: string | Date;
}

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" as const },
  reviewing: { label: "审核中", variant: "secondary" as const },
  approved: { label: "已生效", variant: "default" as const },
  obsolete: { label: "已作废", variant: "destructive" as const },
};

const categoryMap: Record<string, string> = {
  policy: "管理制度",
  sop: "操作规程",
  record: "记录表单",
  certificate: "证书文件",
  external: "外来文件",
  contract: "合同协议",
};

const departmentOptions = [
  { label: "管理部", value: "管理部" },
  { label: "质量部", value: "质量部" },
  { label: "生产部", value: "生产部" },
  { label: "研发部", value: "研发部" },
  { label: "销售部", value: "销售部" },
  { label: "采购部", value: "采购部" },
  { label: "仓库管理", value: "仓库管理" },
  { label: "财务部", value: "财务部" },
];

const formFields: FormField[] = [
  { name: "docNo", label: "文件编号", type: "text", required: true, placeholder: "如：QMS-001" },
  { name: "title", label: "文件标题", type: "text", required: true, placeholder: "请输入文件标题" },
  {
    name: "category",
    label: "文件类别",
    type: "select",
    required: true,
    options: [
      { label: "管理制度", value: "policy" },
      { label: "操作规程", value: "sop" },
      { label: "记录表单", value: "record" },
      { label: "证书文件", value: "certificate" },
      { label: "外来文件", value: "external" },
      { label: "合同协议", value: "contract" },
    ],
  },
  { name: "version", label: "版本号", type: "text", required: true, placeholder: "如：V1.0" },
  {
    name: "department",
    label: "归属部门",
    type: "select",
    required: true,
    options: departmentOptions,
  },
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    options: [
      { label: "草稿", value: "draft" },
      { label: "审核中", value: "reviewing" },
      { label: "已生效", value: "approved" },
      { label: "已作废", value: "obsolete" },
    ],
  },
  { name: "effectiveDate", label: "生效日期", type: "date" },
  { name: "description", label: "文件描述", type: "textarea", span: 2, placeholder: "请输入文件描述" },
];

const columns: Column<Document>[] = [
  { key: "docNo", title: "文件编号", width: "120px" },
  { key: "title", title: "文件标题" },
  {
    key: "category",
    title: "文件类别",
    render: (value) => (
      <Badge variant="outline">{categoryMap[value as string] || value}</Badge>
    ),
  },
  { key: "version", title: "版本", width: "80px" },
  { key: "department", title: "归属部门", width: "120px" },
  {
    key: "status",
    title: "状态",
    width: "100px",
    render: (value) => <StatusBadge status={value as string} statusMap={statusMap} />,
  },
  { 
    key: "effectiveDate", 
    title: "生效日期", 
    width: "120px",
    render: (value) => value ? formatDate(value as string) : "-"
  },
];

export default function DocumentsPage() {
  const utils = trpc.useContext();
  const { data: documents = [], isLoading } = trpc.documents.list.useQuery();
  const createMutation = trpc.documents.create.useMutation();
  const updateMutation = trpc.documents.update.useMutation();
  const deleteMutation = trpc.documents.delete.useMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Document | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Document | null>(null);

  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  const handleEdit = (record: Document) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleView = (record: Document) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };

  const handleDelete = async (record: Document) => {
    if (confirm("确定要删除该文件吗？")) {
      await deleteMutation.mutateAsync({ id: record.id });
      utils.documents.list.invalidate();
      toast.success("文件已删除");
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({
          id: editingRecord.id,
          data: formData as any,
        });
        toast.success("文件已更新");
      } else {
        await createMutation.mutateAsync(formData as any);
        toast.success("文件已创建");
      }
      utils.documents.list.invalidate();
      setFormOpen(false);
    } catch (error) {
      toast.error("操作失败，请检查输入");
    }
  };

  const getDetailFields = (record: Document): DetailField[] => [
    { label: "文件编号", value: record.docNo },
    { label: "文件标题", value: record.title },
    { label: "文件类别", value: <Badge variant="outline">{categoryMap[record.category] || record.category}</Badge> },
    { label: "版本号", value: record.version || "-" },
    { label: "归属部门", value: record.department || "-" },
    { label: "状态", value: <StatusBadge status={record.status} statusMap={statusMap} /> },
    { label: "生效日期", value: record.effectiveDate ? formatDate(record.effectiveDate) : "-" },
    { label: "文件描述", value: record.description || "-", span: 2 },
  ];

  return (
    <>
      <ModulePage
        title="文件管理"
        description="管理公司所有受控文件的全生命周期 (知识库)"
        icon={FileText}
        columns={columns}
        data={documents as any}
        searchPlaceholder="搜索文件编号、标题..."
        addButtonText="新建文件"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        filterOptions={[
          { label: "管理制度", value: "policy" },
          { label: "操作规程", value: "sop" },
          { label: "记录表单", value: "record" },
          { label: "证书文件", value: "certificate" },
        ]}
        stats={[
          { label: "文件总数", value: documents.length },
          { label: "生效文件", value: (documents as any[]).filter((d: any) => d.status === "approved").length, color: "text-green-600" },
          { label: "审核中", value: (documents as any[]).filter((d: any) => d.status === "reviewing").length, color: "text-amber-600" },
          { label: "已作废", value: (documents as any[]).filter((d: any) => d.status === "obsolete").length, color: "text-muted-foreground" },
        ]}
      />

      {/* 新建/编辑表单对话框 */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingRecord ? "编辑文件" : "新建文件"}
        description={editingRecord ? "修改文件信息" : "填写文件基本信息创建新文件"}
        fields={formFields}
        initialData={editingRecord ? {
          ...editingRecord,
          effectiveDate: editingRecord.effectiveDate ? new Date(editingRecord.effectiveDate).toISOString().split('T')[0] : ""
        } : {}}
        onSubmit={handleSubmit}
        submitText={editingRecord ? "保存修改" : "创建文件"}
      />

      {/* 查看详情对话框 */}
      {viewingRecord && (
        <DetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title={`文件详情 - ${viewingRecord.docNo}`}
          fields={getDetailFields(viewingRecord)}
          actions={
            <Button variant="outline" onClick={() => {
              setDetailOpen(false);
              handleEdit(viewingRecord);
            }}>
              编辑文件
            </Button>
          }
        />
      )}
    </>
  );
}
