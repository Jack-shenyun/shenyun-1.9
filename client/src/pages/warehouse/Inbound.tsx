import { formatDate, formatDateTime } from "@/lib/formatters";
import { useState } from "react";
import ModulePage, { Column } from "@/components/ModulePage";
import FormDialog, { FormField, DetailDialog, DetailField } from "@/components/FormDialog";
import { PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const statusMap: Record<string, any> = {
  pending: { label: "待入库", variant: "outline" as const },
  inspecting: { label: "待检验", variant: "secondary" as const },
  completed: { label: "已完成", variant: "default" as const },
  cancelled: { label: "已取消", variant: "destructive" as const },
};

const typeMap: Record<string, string> = {
  purchase_in: "采购入库",
  production_in: "生产入库",
  return_in: "销售退货",
  other_in: "其他入库",
};

// 入库类型映射到 inventoryTransactions.type
const inboundTypeOptions = [
  { label: "采购入库", value: "purchase_in" },
  { label: "生产入库", value: "production_in" },
  { label: "销售退货", value: "return_in" },
  { label: "其他入库", value: "other_in" },
];

interface InboundRecord {
  id: number;
  documentNo: string;
  type: string;
  warehouseId: number;
  warehouseName?: string;
  itemName: string;
  batchNo?: string;
  quantity: string;
  unit?: string;
  remark?: string;
  operatorId?: number;
  createdAt: string;
  // 前端扩展字段（状态、来源单号等存在 remark 中或单独管理）
  status: string;
  sourceNo?: string;
}

type ProductOption = {
  id: number;
  code: string;
  name: string;
  specification?: string | null;
  unit?: string | null;
  isMedicalDevice: boolean;
  isSterilized?: boolean;
};

export default function InboundPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);

  // 获取仓库列表
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({ status: "active" });
  const { data: productList = [] } = trpc.products.list.useQuery({ limit: 1000 });

  // 获取入库记录（只查入库类型）
  const { data: rawData = [], refetch } = trpc.inventoryTransactions.list.useQuery({
    limit: 200,
  });

  // 只显示入库类型的记录
  const data = rawData.filter((r: any) =>
    ["purchase_in", "production_in", "return_in", "other_in"].includes(r.type)
  );
  const products = (productList as ProductOption[]) || [];
  const productsById = new Map(products.map((p) => [p.id, p]));
  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.code} - ${p.name}${p.specification ? `（${p.specification}）` : ""}`,
  }));

  const createMutation = trpc.inventoryTransactions.create.useMutation({
    onSuccess: () => { toast.success("入库单已创建"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });

  const updateMutation = trpc.inventoryTransactions.update.useMutation({
    onSuccess: () => { toast.success("入库单已更新"); refetch(); setFormOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });

  const deleteMutation = trpc.inventoryTransactions.delete.useMutation({
    onSuccess: () => { toast.success("入库单已删除"); refetch(); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const getWarehouseName = (warehouseId: number) => {
    const wh = warehouseList.find((w: any) => w.id === warehouseId);
    return wh ? wh.name : `仓库${warehouseId}`;
  };

  const getFormFields = (): FormField[] => [
    {
      name: "documentNo",
      label: "入库单号",
      type: "text",
      required: true,
      placeholder: "系统自动生成或手动输入",
    },
    {
      name: "type",
      label: "入库类型",
      type: "select",
      required: true,
      options: inboundTypeOptions,
    },
    {
      name: "productId",
      label: "物料名称",
      type: "select",
      required: true,
      options: productOptions,
      placeholder: productOptions.length > 0 ? "请选择产品库物料" : "请先在产品管理维护产品",
    },
    { name: "batchNo", label: "批次号", type: "text", placeholder: "请输入批次号" },
    {
      name: "sterilizationBatchNo",
      label: "灭菌批号",
      type: "text",
      required: true,
      placeholder: "医疗器械必填",
      hidden: (formData) => {
        const product = productsById.get(Number(formData.productId));
        return !product?.isMedicalDevice;
      },
    },
    { name: "quantity", label: "数量", type: "number", required: true, placeholder: "请输入入库数量" },
    { name: "unit", label: "单位", type: "text", placeholder: "自动从产品带入", disabled: true },
    {
      name: "warehouseId",
      label: "目标仓库",
      type: "select",
      required: true,
      options: warehouseList.map((w: any) => ({ label: w.name, value: String(w.id) })),
    },
    { name: "remark", label: "备注", type: "textarea", span: 2, placeholder: "请输入备注信息" },
  ];

  const columns: Column<any>[] = [
    { key: "documentNo", title: "入库单号", width: "140px" },
    {
      key: "type",
      title: "入库类型",
      width: "110px",
      render: (value: string) => <Badge variant="outline">{typeMap[value] || value}</Badge>,
    },
    { key: "itemName", title: "物料名称" },
    { key: "batchNo", title: "批次号", width: "110px", render: (v: string) => v || "-" },
    { key: "sterilizationBatchNo", title: "灭菌批号", width: "120px", render: (v: string) => v || "-" },
    {
      key: "quantity",
      title: "数量",
      width: "100px",
      render: (v: string, row: any) => `${parseFloat(v || "0")?.toLocaleString?.() ?? "0"} ${row.unit || ""}`,
    },
    {
      key: "warehouseId",
      title: "目标仓库",
      width: "110px",
      render: (v: number) => getWarehouseName(v),
    },
    {
      key: "createdAt",
      title: "入库时间",
      width: "130px",
      render: (v: string) => v ? formatDate(v) : "-",
    },
  ];

  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleView = (record: any) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };

  const handleDelete = (record: any) => {
    deleteMutation.mutate({ id: record.id });
  };

  const getInitialProductId = (record: any): string => {
    if (record?.productId) return String(record.productId);
    const matched = products.find((p) => p.name === record?.itemName);
    return matched ? String(matched.id) : "";
  };

  const handleSubmit = (formData: Record<string, any>) => {
    const selectedProduct = productsById.get(Number(formData.productId));
    if (!selectedProduct) {
      toast.error("请选择产品库中的物料");
      return;
    }
    if (selectedProduct.isMedicalDevice && !String(formData.sterilizationBatchNo || "").trim()) {
      toast.error("医疗器械必须填写灭菌批号");
      return;
    }

    const payload = {
      productId: selectedProduct.id,
      warehouseId: Number(formData.warehouseId),
      type: formData.type as any,
      documentNo: formData.documentNo || undefined,
      itemName: selectedProduct.name,
      batchNo: formData.batchNo || undefined,
      sterilizationBatchNo: formData.sterilizationBatchNo || undefined,
      quantity: String(formData.quantity || "0"),
      unit: formData.unit || selectedProduct.unit || undefined,
      remark: formData.remark || undefined,
    };

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          documentNo: payload.documentNo,
          productId: payload.productId,
          itemName: payload.itemName,
          batchNo: payload.batchNo,
          sterilizationBatchNo: payload.sterilizationBatchNo,
          quantity: payload.quantity,
          unit: payload.unit,
          remark: payload.remark,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getDetailFields = (record: any): DetailField[] => [
    { label: "入库单号", value: record.documentNo || "-" },
    { label: "入库类型", value: <Badge variant="outline">{typeMap[record.type] || record.type}</Badge> },
    { label: "物料名称", value: record.itemName },
    { label: "批次号", value: record.batchNo || "-" },
    { label: "灭菌批号", value: record.sterilizationBatchNo || "-" },
    {
      label: "数量",
      value: `${parseFloat(String(record.quantity || 0))?.toLocaleString?.() ?? "0"} ${record.unit || ""}`,
    },
    { label: "目标仓库", value: getWarehouseName(record.warehouseId) },
    {
      label: "入库时间",
      value: record.createdAt ? formatDateTime(record.createdAt) : "-",
    },
    { label: "备注", value: record.remark || "-", span: 2 },
  ];

  return (
    <>
      <ModulePage
        title="入库管理"
        description="管理采购入库、生产入库、销售退货等各类入库业务"
        icon={PackagePlus}
        columns={columns}
        data={data}
        searchPlaceholder="搜索入库单号、物料名称..."
        addButtonText="新建入库"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        filterOptions={inboundTypeOptions}
        stats={[
          { label: "入库总数", value: data.length },
          { label: "采购入库", value: data.filter((d: any) => d.type === "purchase_in").length, color: "text-blue-600" },
          { label: "生产入库", value: data.filter((d: any) => d.type === "production_in").length, color: "text-green-600" },
          { label: "退货入库", value: data.filter((d: any) => d.type === "return_in").length, color: "text-amber-600" },
        ]}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingRecord ? "编辑入库单" : "新建入库单"}
        description={editingRecord ? "修改入库单信息" : "填写入库单基本信息"}
        fields={getFormFields()}
        initialData={editingRecord ? {
          ...editingRecord,
          productId: getInitialProductId(editingRecord),
          warehouseId: String(editingRecord.warehouseId),
        } : {
          documentNo: `IN-${new Date().getFullYear()}-${String(data.length + 1).padStart(4, "0")}`,
          type: "purchase_in",
        }}
        onSubmit={handleSubmit}
        submitText={editingRecord ? "保存修改" : "创建入库单"}
        onChange={(name, value) => {
          // Issue 12: 选择产品时自动填充单位
          if (name === "productId") {
            const product = productsById.get(Number(value));
            if (product?.unit) {
              return { unit: product.unit };
            }
          }
        }}
      />

      {viewingRecord && (
        <DetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title={`入库单详情 - ${viewingRecord.documentNo || viewingRecord.id}`}
          fields={getDetailFields(viewingRecord)}
          actions={
            <Button variant="outline" onClick={() => {
              setDetailOpen(false);
              handleEdit(viewingRecord);
            }}>
              编辑入库单
            </Button>
          }
        />
      )}
    </>
  );
}
