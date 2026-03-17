import { useState, useEffect } from "react";
import ModulePage, { Column, StatusBadge } from "@/components/ModulePage";
import { Package, RefreshCw, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import DraftDrawer, { DraftItem } from "@/components/DraftDrawer";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import SupplierSelect from "@/components/SupplierSelect";
import { readActiveCompany } from "@/lib/activeCompany";
import { useLocation } from "wouter";
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_CATEGORY_PREFIXES,
  type ProductCategory,
} from "@shared/productCategories";

interface Product {
  id: number;
  companyId?: number | null;
  sourceCompanyId?: number | null;
  sourceProductId?: number | null;
  isSyncedFromMain?: boolean | null;
  isMedicalDevice: boolean;
  isSterilized?: boolean;
  code: string;
  name: string;
  specification: string | null;
  category: string | null;
  productCategory: string | null;
  riskLevel?: string | null;
  registrationNo?: string | null;
  registrationExpiry?: string | null;
  udiDi?: string | null;
  medicalInsuranceCode?: string | null;
  manufacturer?: string | null;
  storageCondition?: string | null;
  shelfLife?: number | null;
  unit?: string | null;
  salePermission?: string | null;
  procurePermission?: string | null;
  status: string;
  description?: string | null;
  defaultSupplierId?: number | null;
  defaultSupplierName?: string | null;
}

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" as const },
  active: { label: "已上市", variant: "default" as const },
  discontinued: { label: "已停产", variant: "destructive" as const },
};

const riskLevelMap: Record<string, { label: string; color: string }> = {
  I: { label: "I类", color: "bg-green-100 text-green-800" },
  II: { label: "II类", color: "bg-amber-100 text-amber-800" },
  III: { label: "III类", color: "bg-red-100 text-red-800" },
};

// 产品属性映射（原 category）
const categoryMap: Record<string, string> = {
  nmpa: "NMPA注册",
  fda: "FDA注册",
  ce: "CE注册",
  oem: "OEM代工",
  other: "其他",
};

// 产品分类映射（新 productCategory）
const productCategoryMap: Record<
  string,
  { label: string; prefix: string; color: string }
> = {
  finished: {
    label: PRODUCT_CATEGORY_LABELS.finished,
    prefix: PRODUCT_CATEGORY_PREFIXES.finished,
    color: "bg-blue-100 text-blue-800",
  },
  semi_finished: {
    label: PRODUCT_CATEGORY_LABELS.semi_finished,
    prefix: PRODUCT_CATEGORY_PREFIXES.semi_finished,
    color: "bg-purple-100 text-purple-800",
  },
  raw_material: {
    label: PRODUCT_CATEGORY_LABELS.raw_material,
    prefix: PRODUCT_CATEGORY_PREFIXES.raw_material,
    color: "bg-amber-100 text-amber-800",
  },
  component: {
    label: PRODUCT_CATEGORY_LABELS.component,
    prefix: PRODUCT_CATEGORY_PREFIXES.component,
    color: "bg-emerald-100 text-emerald-800",
  },
  equipment: {
    label: PRODUCT_CATEGORY_LABELS.equipment,
    prefix: PRODUCT_CATEGORY_PREFIXES.equipment,
    color: "bg-cyan-100 text-cyan-800",
  },
  consumable: {
    label: PRODUCT_CATEGORY_LABELS.consumable,
    prefix: PRODUCT_CATEGORY_PREFIXES.consumable,
    color: "bg-pink-100 text-pink-800",
  },
  packaging_material: {
    label: PRODUCT_CATEGORY_LABELS.packaging_material,
    prefix: PRODUCT_CATEGORY_PREFIXES.packaging_material,
    color: "bg-lime-100 text-lime-800",
  },
  other: {
    label: PRODUCT_CATEGORY_LABELS.other,
    prefix: PRODUCT_CATEGORY_PREFIXES.other,
    color: "bg-gray-100 text-gray-800",
  },
};

const salePermissionMap: Record<string, string> = {
  saleable: "销售",
  not_saleable: "不销售",
};

const procurePermissionMap: Record<string, string> = {
  purchasable: "采购",
  production_only: "生产",
};

const DEFAULT_MANUFACTURER = "苏州神韵医疗器械有限公司";
const MAIN_COMPANY_ID = 3;

const UNIT_OPTIONS = [
  "支",
  "只",
  "双",
  "副",
  "套",
  "盒",
  "箱",
  "包",
  "袋",
  "瓶",
  "根",
  "条",
  "片",
  "张",
  "块",
  "个",
  "米",
  "厘米",
  "毫米",
  "千克",
  "克",
  "毫升",
  "升",
  "卷",
  "批",
  "辆",
  "台",
  "套装",
  "PCS",
  "EA",
  "SET",
  "PAIR",
  "BOX",
  "CARTON",
  "BAG",
  "POUCH",
  "BOTTLE",
  "VIAL",
  "ROLL",
  "KG",
  "G",
  "MG",
  "L",
  "ML",
  "M",
  "CM",
  "MM",
];

const escapeCsvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const columns: Column<Product>[] = [
  { key: "code", title: "产品编码", width: "120px" },
  { key: "name", title: "产品名称" },
  { key: "specification", title: "规格型号", width: "140px" },
  {
    key: "sourceProductId",
    title: "数据来源",
    width: "110px",
    render: (_value, record) => (
      <Badge variant={record.sourceProductId ? "secondary" : "default"}>
        {record.sourceProductId ? "神韵引用" : "本公司"}
      </Badge>
    ),
  },
  {
    key: "isMedicalDevice",
    title: "产品类型",
    width: "100px",
    render: value => (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "医疗器械" : "非医疗器械"}
      </Badge>
    ),
  },
  {
    key: "isSterilized",
    title: "是否灭菌",
    width: "100px",
    render: value => (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "是" : "否"}
      </Badge>
    ),
  },
  {
    key: "productCategory",
    title: "产品分类",
    width: "90px",
    render: value => {
      if (!value) return <span className="text-muted-foreground">-</span>;
      const cfg = productCategoryMap[value];
      return cfg ? (
        <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.color}`}>
          {cfg.label}
        </span>
      ) : (
        <span>{value}</span>
      );
    },
  },
  {
    key: "category",
    title: "产品属性",
    width: "100px",
    render: value => (
      <Badge variant="outline">{categoryMap[value] || value || "-"}</Badge>
    ),
  },
  {
    key: "riskLevel",
    title: "风险等级",
    width: "90px",
    render: value => {
      if (!value) return <span className="text-muted-foreground">-</span>;
      const config = riskLevelMap[value];
      return config ? (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}
        >
          {config.label}
        </span>
      ) : (
        value
      );
    },
  },
  {
    key: "registrationNo",
    title: "注册证号",
    width: "160px",
    render: value => value || <span className="text-muted-foreground">-</span>,
  },
  {
    key: "medicalInsuranceCode",
    title: "医保C码",
    width: "180px",
    render: value => value || <span className="text-muted-foreground">-</span>,
  },
  {
    key: "status",
    title: "状态",
    width: "100px",
    render: value => <StatusBadge status={value} statusMap={statusMap} />,
  },
];

// 产品表单组件
function ProductForm({
  open,
  onOpenChange,
  editingRecord,
  onSuccess,
  returnAfterSaveTo,
  onReturnAfterSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingRecord: Product | null;
  onSuccess: () => void;
  returnAfterSaveTo?: string | null;
  onReturnAfterSave?: (path: string) => void;
}) {
  const isEdit = !!editingRecord;
  const activeCompany = readActiveCompany();
  const defaultManufacturer =
    String(activeCompany?.name || "").trim() || DEFAULT_MANUFACTURER;

  const [form, setForm] = useState<Record<string, any>>({});
  const [codeError, setCodeError] = useState("");
  const { data: suppliersData = [] } = trpc.suppliers.list.useQuery();
  const { data: supplierPricesData = [] } =
    trpc.productSupplierPrices.list.useQuery(
      isEdit && editingRecord?.id ? { productId: editingRecord.id } : undefined,
      { enabled: open && !!editingRecord?.id }
    );

  // 根据产品分类获取前缀
  const getPrefix = (productCategory: string) => {
    return productCategoryMap[productCategory]?.prefix || "CP";
  };

  // 获取下一个自动编码（根据当前选择的产品分类前缀）
  const currentPrefix = getPrefix(form.productCategory || "finished");
  const { data: nextCode, refetch: refetchNextCode } =
    trpc.products.nextCode.useQuery(
      { prefix: currentPrefix },
      { enabled: open && !isEdit }
    );

  // 校验编码唯一性
  const { data: checkResult } = trpc.products.checkCode.useQuery(
    { code: form.code || "", excludeId: editingRecord?.id },
    { enabled: !!form.code && form.code.length > 0 }
  );
  const currentDefaultSupplierRow = (supplierPricesData as any[]).find(
    (item: any) => Number(item.isDefault) === 1
  );

  useEffect(() => {
    if (open) {
      if (isEdit && editingRecord) {
        setForm({
          isMedicalDevice: editingRecord.isMedicalDevice ?? true,
          isSterilized: editingRecord.isSterilized ?? false,
          code: editingRecord.code,
          name: editingRecord.name,
          specification: editingRecord.specification || "",
          category: editingRecord.category || "",
          productCategory: editingRecord.productCategory || "finished",
          riskLevel: editingRecord.riskLevel || "",
          status: editingRecord.status,
          salePermission: (editingRecord as any).salePermission || "saleable",
          procurePermission:
            (editingRecord as any).procurePermission || "purchasable",
          registrationNo: editingRecord.registrationNo || "",
          registrationExpiry: editingRecord.registrationExpiry || "",
          udiDi: editingRecord.udiDi || "",
          medicalInsuranceCode: editingRecord.medicalInsuranceCode || "",
          unit: editingRecord.unit || "",
          shelfLife: editingRecord.shelfLife || "",
          storageCondition: editingRecord.storageCondition || "",
          description: editingRecord.description || "",
          defaultSupplierId: currentDefaultSupplierRow?.supplierId
            ? String(currentDefaultSupplierRow.supplierId)
            : "",
          defaultSupplierName:
            editingRecord.defaultSupplierName ||
            ((suppliersData as any[]).find(
              (supplier: any) =>
                Number(supplier.id) ===
                Number(currentDefaultSupplierRow?.supplierId || 0)
            )?.name || ""),
        });
      } else {
        setForm({
          isMedicalDevice: true,
          isSterilized: false,
          code: nextCode || "",
          name: "",
          specification: "",
          category: "",
          productCategory: "finished",
          riskLevel: "",
          status: "draft",
          salePermission: "saleable",
          procurePermission: "purchasable",
          registrationNo: "",
          registrationExpiry: "",
          udiDi: "",
          medicalInsuranceCode: "",
          unit: "",
          shelfLife: "",
          storageCondition: "",
          description: "",
          defaultSupplierId: "",
          defaultSupplierName: "",
        });
      }
      setCodeError("");
    }
  }, [open, isEdit, editingRecord, currentDefaultSupplierRow]);

  // 当自动编码加载完成时更新表单
  useEffect(() => {
    if (!isEdit && nextCode && open) {
      setForm(prev => ({ ...prev, code: nextCode }));
    }
  }, [nextCode, isEdit, open]);

  // 当产品分类改变时，自动重新获取对应前缀的编码，并处理医疗器械开关
  const handleProductCategoryChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      productCategory: value,
    }));
    if (!isEdit) {
      setTimeout(() => refetchNextCode(), 50);
    }
  };

  const handleProcurePermissionChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      procurePermission: value,
      defaultSupplierId: value === "purchasable" ? prev.defaultSupplierId : "",
      defaultSupplierName:
        value === "purchasable" ? prev.defaultSupplierName : "",
    }));
  };

  // 编码重复检测
  useEffect(() => {
    if (checkResult?.exists) {
      setCodeError("该编码已存在，请修改");
    } else {
      setCodeError("");
    }
  }, [checkResult]);

  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const createMutation = trpc.products.create.useMutation();

  const updateMutation = trpc.products.update.useMutation();
  const createSupplierPriceMutation =
    trpc.productSupplierPrices.create.useMutation();
  const updateSupplierPriceMutation =
    trpc.productSupplierPrices.update.useMutation();

  const syncDefaultSupplier = async (
    productId: number,
    supplierId?: number
  ) => {
    const rows = isEdit ? (supplierPricesData as any[]) : [];

    if (rows.length > 0) {
      await Promise.all(
        rows
          .filter(
            (item: any) =>
              Number(item.isDefault) === 1 &&
              Number(item.supplierId) !== Number(supplierId || 0)
          )
          .map((item: any) =>
            updateSupplierPriceMutation.mutateAsync({
              id: item.id,
              data: { isDefault: 0 },
            })
          )
      );
    }

    if (!supplierId) return;

    const currentRow = rows.find(
      (item: any) => Number(item.supplierId) === supplierId
    );
    if (currentRow) {
      if (Number(currentRow.isDefault) !== 1) {
        await updateSupplierPriceMutation.mutateAsync({
          id: currentRow.id,
          data: { isDefault: 1 },
        });
      }
      return;
    }

    await createSupplierPriceMutation.mutateAsync({
      productId,
      supplierId,
      isDefault: 1,
    });
  };

  const selectedDefaultSupplier =
    (suppliersData as any[]).find(
      (supplier: any) => String(supplier.id) === String(form.defaultSupplierId || "")
    ) || null;

  const buildPayload = (overrideStatus?: string) => ({
    isMedicalDevice: form.isMedicalDevice ?? true,
    isSterilized: form.isSterilized ?? false,
    code: form.code,
    name: form.name,
    specification: form.specification || undefined,
    category: form.category || undefined,
    productCategory: (form.productCategory as ProductCategory) || undefined,
    riskLevel: form.isMedicalDevice
      ? (form.riskLevel as "I" | "II" | "III") || undefined
      : undefined,
    status: (overrideStatus || form.status || "draft") as
      | "draft"
      | "active"
      | "discontinued",
    salePermission: (form.salePermission || "saleable") as
      | "saleable"
      | "not_saleable",
    procurePermission: (form.procurePermission || "purchasable") as
      | "purchasable"
      | "production_only",
    registrationNo: form.isMedicalDevice
      ? form.registrationNo || undefined
      : undefined,
    udiDi: form.isMedicalDevice ? form.udiDi || undefined : undefined,
    medicalInsuranceCode: form.medicalInsuranceCode || undefined,
    storageCondition: form.isMedicalDevice
      ? form.storageCondition || undefined
      : undefined,
    unit: form.unit || undefined,
    shelfLife: form.shelfLife ? Number(form.shelfLife) : undefined,
    description: form.description || undefined,
    manufacturer: editingRecord?.manufacturer || defaultManufacturer,
  });

  const handleSaveDraft = () => {
    if (!form.code) return toast.error("请填写产品编码");
    if (!form.name) return toast.error("请填写产品名称");
    if (codeError) return toast.error(codeError);
    const payload = buildPayload("draft");
    if (isEdit && editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSubmit = () => {
    if (!form.code) return toast.error("请填写产品编码");
    if (!form.name) return toast.error("请填写产品名称");
    if (!form.specification) return toast.error("请填写规格型号");
    if (!form.productCategory) return toast.error("请选择产品分类");
    if (form.isMedicalDevice && !form.riskLevel)
      return toast.error("请选择风险等级");
    if (!form.salePermission) return toast.error("请选择销售权限");
    if (!form.procurePermission) return toast.error("请选择获取权限");
    if (codeError) return toast.error(codeError);
    const payload = buildPayload();
    if (isEdit && editingRecord) {
      updateMutation.mutate(
        { id: editingRecord.id, data: payload },
        {
          onSuccess: async () => {
            try {
              await syncDefaultSupplier(
                editingRecord.id,
                form.defaultSupplierId
                  ? Number(form.defaultSupplierId)
                  : undefined
              );
              toast.success("产品信息已更新");
              onSuccess();
              onOpenChange(false);
              if (returnAfterSaveTo) {
                window.setTimeout(() => onReturnAfterSave?.(returnAfterSaveTo), 120);
              }
            } catch (err: any) {
              toast.error("默认供应商保存失败：" + err.message);
            }
          },
          onError: err => toast.error("更新失败：" + err.message),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: async productId => {
          try {
            await syncDefaultSupplier(
              Number(productId),
              form.defaultSupplierId
                ? Number(form.defaultSupplierId)
                : undefined
            );
            toast.success("产品已创建");
            onSuccess();
            onOpenChange(false);
          } catch (err: any) {
            toast.error("默认供应商保存失败：" + err.message);
          }
        },
        onError: err => toast.error("创建失败：" + err.message),
      });
    }
  };

  const isMedical = form.isMedicalDevice ?? true;
  const canSelectDefaultSupplier =
    (form.procurePermission || "purchasable") === "purchasable";
  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑产品" : "新增产品"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改产品信息" : "填写产品基本信息创建新产品"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* 医疗器械开关 */}
          <div className="col-span-2 flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div>
              <Label className="text-sm font-medium">医疗器械产品</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                开启后显示注册证号、UDI编码、风险等级等专属字段
              </p>
            </div>
            <Switch
              checked={isMedical}
              onCheckedChange={v => set("isMedicalDevice", v)}
            />
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-lg border p-3 bg-muted/20">
            <div>
              <Label className="text-sm font-medium">是否灭菌</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                用于生产与仓库后续筛选条件
              </p>
            </div>
            <Switch
              checked={!!form.isSterilized}
              onCheckedChange={v => set("isSterilized", v)}
            />
          </div>

          {/* 产品分类（决定编码前缀） */}
          <div className="space-y-1">
            <Label>
              产品分类 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.productCategory || "finished"}
              onValueChange={handleProductCategoryChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {PRODUCT_CATEGORY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}（{option.prefix}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 产品编码（自动+可手动修改） */}
          <div className="space-y-1">
            <Label>
              产品编码 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={form.code || ""}
                  onChange={e => set("code", e.target.value)}
                  placeholder={`如：${getPrefix(form.productCategory || "finished")}-00001`}
                  className={codeError ? "border-red-500" : ""}
                />
                {codeError && (
                  <p className="text-xs text-red-500 mt-1">{codeError}</p>
                )}
              </div>
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="重新生成编码"
                  onClick={() => refetchNextCode()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 产品名称 */}
          <div className="space-y-1">
            <Label>
              产品名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name || ""}
              onChange={e => set("name", e.target.value)}
              placeholder="请输入产品名称"
            />
          </div>

          {/* 规格型号 */}
          <div className="space-y-1">
            <Label>
              规格型号 <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.specification || ""}
              onChange={e => set("specification", e.target.value)}
              placeholder="如：5ml、内径6mm×外径10mm"
            />
          </div>

          {/* 产品属性（仅成品） */}
          {(form.productCategory || "finished") === "finished" && (
            <div className="space-y-1">
              <Label>
                产品属性 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.category || ""}
                onValueChange={v => set("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择产品属性" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nmpa">NMPA注册</SelectItem>
                  <SelectItem value="fda">FDA注册</SelectItem>
                  <SelectItem value="ce">CE注册</SelectItem>
                  <SelectItem value="oem">OEM代工</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 风险等级（仅医疗器械） */}
          {isMedical && (
            <div className="space-y-1">
              <Label>
                风险等级 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.riskLevel || ""}
                onValueChange={v => set("riskLevel", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择风险等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">I类（低风险）</SelectItem>
                  <SelectItem value="II">II类（中风险）</SelectItem>
                  <SelectItem value="III">III类（高风险）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 状态 */}
          <div className="space-y-1">
            <Label>
              状态 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.status || "draft"}
              onValueChange={v => set("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="active">已上市</SelectItem>
                <SelectItem value="discontinued">已停产</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 销售权限 */}
          <div className="space-y-1">
            <Label>
              销售权限 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.salePermission || "saleable"}
              onValueChange={v => set("salePermission", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择销售权限" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saleable">销售</SelectItem>
                <SelectItem value="not_saleable">不销售</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 获取权限 */}
          <div className="space-y-1">
            <Label>
              获取权限 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.procurePermission || "purchasable"}
              onValueChange={handleProcurePermissionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择获取权限" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchasable">采购</SelectItem>
                <SelectItem value="production_only">生产</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canSelectDefaultSupplier && (
            <div className="space-y-1">
              <Label>默认供应商</Label>
              <SupplierSelect
                suppliers={suppliersData as any[]}
                selectedSupplier={selectedDefaultSupplier as any}
                selectedLabel={form.defaultSupplierName || ""}
                onSupplierSelect={(supplier: any) => {
                  set("defaultSupplierId", String(supplier.id || ""));
                  set("defaultSupplierName", String(supplier.name || ""));
                }}
              />
            </div>
          )}

          {/* 注册证号（仅医疗器械） */}
          {isMedical && (
            <div className="space-y-1">
              <Label>注册证号</Label>
              <Input
                value={form.registrationNo || ""}
                onChange={e => set("registrationNo", e.target.value)}
                placeholder="如：国械注准20200001"
              />
            </div>
          )}

          {/* 注册证有效期（仅医疗器械） */}
          {isMedical && (
            <div className="space-y-1">
              <Label>注册证有效期</Label>
              <Input
                type="date"
                value={form.registrationExpiry || ""}
                onChange={e => set("registrationExpiry", e.target.value)}
              />
            </div>
          )}

          {/* UDI编码（仅医疗器械） */}
          {isMedical && (
            <div className="space-y-1">
              <Label>UDI编码</Label>
              <Input
                value={form.udiDi || ""}
                onChange={e => set("udiDi", e.target.value)}
                placeholder="唯一器械标识"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>医保C码</Label>
            <Input
              value={form.medicalInsuranceCode || ""}
              onChange={e => set("medicalInsuranceCode", e.target.value)}
              placeholder="挂网或医保编码"
            />
          </div>

          {/* 计量单位 */}
          <div className="space-y-1">
            <Label>计量单位</Label>
            <Select value={form.unit || ""} onValueChange={v => set("unit", v)}>
              <SelectTrigger>
                <SelectValue placeholder="请选择计量单位" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              用于产品基础计量口径
            </p>
          </div>

          {/* 保质期 */}
          <div className="space-y-1">
            <Label>保质期（月）</Label>
            <Input
              type="number"
              value={form.shelfLife || ""}
              onChange={e => set("shelfLife", e.target.value)}
              placeholder="如：36"
            />
          </div>

          {/* 储存条件（仅医疗器械） */}
          {isMedical && (
            <div className="col-span-2 space-y-1">
              <Label>储存条件</Label>
              <Input
                value={form.storageCondition || ""}
                onChange={e => set("storageCondition", e.target.value)}
                placeholder="如：常温、干燥、避光保存"
              />
            </div>
          )}

          {/* 产品描述 */}
          <div className="col-span-2 space-y-1">
            <Label>产品描述</Label>
            <Textarea
              value={form.description || ""}
              onChange={e => set("description", e.target.value)}
              placeholder="请输入产品描述"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={isLoading || !!codeError}
          >
            <FileText className="mr-2 h-4 w-4" />
            保存草稿
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !!codeError}>
            {isLoading ? "保存中..." : isEdit ? "保存修改" : "创建产品"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const PRODUCT_PAGE_LIST_LIMIT = 5000;
  const [location, setLocation] = useLocation();
  const activeCompany = readActiveCompany();
  const activeCompanyId = Number(activeCompany?.id || MAIN_COMPANY_ID);
  const isCollaborativeCompany =
    Number.isFinite(activeCompanyId) && activeCompanyId !== MAIN_COMPANY_ID;
  const activeCompanyLabel =
    String(activeCompany?.shortName || activeCompany?.name || "").trim() ||
    "本公司";
  const defaultManufacturer =
    String(activeCompany?.name || "").trim() || DEFAULT_MANUFACTURER;
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Product | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Product | null>(null);
  const [autoOpenedEditId, setAutoOpenedEditId] = useState<number | null>(null);
  const [returnAfterSaveTo, setReturnAfterSaveTo] = useState<string | null>(null);
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productAttributeFilter, setProductAttributeFilter] = useState("all");

  const {
    data: productsData,
    isLoading,
    error: productsError,
    refetch,
  } = trpc.products.list.useQuery(
    { limit: PRODUCT_PAGE_LIST_LIMIT, includeSourceLibrary: false },
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );
  const { data: supplierPricesData = [] } =
    trpc.productSupplierPrices.list.useQuery();
  const { data: suppliersData = [] } = trpc.suppliers.list.useQuery();
  const createMutation = trpc.products.create.useMutation();
  const createSupplierPriceMutation =
    trpc.productSupplierPrices.create.useMutation();
  const bulkReferenceMutation = trpc.products.bulkReferenceFromMain.useMutation({
    onSuccess: async result => {
      await refetch();
      toast.success(`已同步 ${result.created} 个神韵产品`, {
        description:
          result.existing > 0 ? `已存在 ${result.existing} 个，未重复导入` : "",
      });
    },
    onError: err =>
      toast.error("批量引用失败", {
        description: err.message || "请稍后重试",
      }),
  });
  const data: Product[] = ((productsData || []) as Product[]).map(product => {
    const defaultRow = (supplierPricesData as any[]).find(
      (item: any) =>
        Number(item.productId) === product.id && Number(item.isDefault) === 1
    );
    const supplier = defaultRow
      ? (suppliersData as any[]).find(
          (item: any) => Number(item.id) === Number(defaultRow.supplierId)
        )
      : null;
    return {
      ...product,
      defaultSupplierId: defaultRow?.supplierId ?? null,
      defaultSupplierName: supplier?.name || null,
    };
  });

  // Issue 15: 产品管理权限控制
  const { canDelete } = usePermission();
  const isOwnedByCurrentCompany = (record: Product) => {
    if (!isCollaborativeCompany) return true;
    return Number(record.companyId || 0) === activeCompanyId;
  };

  useEffect(() => {
    if (!productsError) return;
    toast.error("产品数据加载失败", {
      description: productsError.message || "请点击重新加载后再试",
    });
  }, [productsError]);

  // 草稿列表
  const drafts = data.filter((d: any) => d.status === "draft");
  const draftItems: DraftItem[] = drafts.map((d: any) => ({
    id: d.id,
    title: d.name || d.code,
    subtitle: d.code + (d.specification ? ` · ${d.specification}` : ""),
  }));
  const referencedProductsCount = data.filter(
    (d: any) => Number(d.sourceProductId) > 0
  ).length;
  const localProductsCount = data.filter(
    (d: any) => Number(d.sourceProductId || 0) <= 0
  ).length;
  const localDraftProductsCount = data.filter(
    (d: any) => Number(d.sourceProductId || 0) <= 0 && d.status === "draft"
  ).length;
  const productStats = isCollaborativeCompany
    ? [
        { label: "产品总数", value: data.length },
        {
          label: "神韵引用",
          value: referencedProductsCount,
          color: "text-violet-600",
        },
        {
          label: `${activeCompanyLabel}自建`,
          value: localProductsCount,
          color: "text-emerald-600",
        },
        {
          label: `${activeCompanyLabel}草稿`,
          value: localDraftProductsCount,
          color: "text-amber-600",
        },
      ]
    : [
        { label: "产品总数", value: data.length },
        {
          label: "已上市",
          value: data.filter((d: any) => d.status === "active").length,
          color: "text-green-600",
        },
        {
          label: "医疗器械",
          value: data.filter((d: any) => d.isMedicalDevice).length,
          color: "text-blue-600",
        },
        {
          label: "已灭菌",
          value: data.filter((d: any) => d.isSterilized).length,
          color: "text-cyan-600",
        },
      ];

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("产品已删除");
      refetch();
    },
    onError: err => toast.error("删除失败：" + err.message),
  });

  const handleAdd = () => {
    setReturnAfterSaveTo(null);
    setEditingRecord(null);
    setFormOpen(true);
  };
  const handleEdit = (record: Product) => {
    if (!isOwnedByCurrentCompany(record)) {
      toast.error("只能编辑当前公司的产品");
      return;
    }
    setReturnAfterSaveTo(null);
    setEditingRecord(record);
    setFormOpen(true);
  };
  const handleView = (record: Product) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };
  const handleDelete = (record: Product) => {
    if (!isOwnedByCurrentCompany(record)) {
      toast.error("只能删除当前公司的产品");
      return;
    }
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除产品" });
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  const handleBulkReference = () => {
    if (!isCollaborativeCompany) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("确认一键批量引用神韵产品库到当前公司吗？")
    ) {
      return;
    }
    bulkReferenceMutation.mutate();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const editId = Number(params.get("editId") || 0);
    if (!editId) {
      if (autoOpenedEditId !== null) {
        setAutoOpenedEditId(null);
      }
      return;
    }
    if (formOpen || autoOpenedEditId === editId) return;
    const record = data.find(item => Number(item.id) === editId);
    if (!record) return;
    const returnTo = params.get("returnTo");
    setAutoOpenedEditId(editId);
    setReturnAfterSaveTo(returnTo || null);
    setEditingRecord(record);
    setFormOpen(true);
    params.delete("editId");
    params.delete("returnTo");
    const nextQuery = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `/rd/products${nextQuery ? `?${nextQuery}` : ""}`
    );
  }, [location, data, formOpen, autoOpenedEditId]);

  // 草稿库操作
  const handleDraftEdit = (item: DraftItem) => {
    const record = data.find(d => d.id === item.id);
    if (record) handleEdit(record);
  };
  const handleDraftDelete = (item: DraftItem) => {
    const record = data.find(d => d.id === item.id);
    if (record) handleDelete(record);
  };

  const matchesQuickFilters = (product: Product) => {
    const categoryMatch =
      productCategoryFilter === "all" ||
      product.productCategory === productCategoryFilter;
    const attributeMatch =
      productAttributeFilter === "all" ||
      product.category === productAttributeFilter;
    return categoryMatch && attributeMatch;
  };

  const handleExportProducts = (rows: Product[]) => {
    if (rows.length === 0) {
      toast.warning("暂无可导出数据");
      return;
    }

    const headers = [
      "产品编码",
      "产品名称",
      "规格型号",
      "产品类型",
      "是否灭菌",
      "产品分类",
      "产品属性",
      "风险等级",
      "注册证号",
      "UDI编码",
      "医保C码",
      "计量单位",
      "销售权限",
      "获取权限",
      "状态",
      "生产企业",
      "储存条件",
      "保质期（月）",
      "默认供应商",
      "产品描述",
    ];

    const body = rows.map(item => {
      return [
        item.code,
        item.name,
        item.specification || "",
        item.isMedicalDevice ? "医疗器械" : "非医疗器械",
        item.isSterilized ? "是" : "否",
        item.productCategory
          ? productCategoryMap[item.productCategory]?.label ||
            item.productCategory
          : "",
        item.category ? categoryMap[item.category] || item.category : "",
        item.riskLevel
          ? riskLevelMap[item.riskLevel]?.label || item.riskLevel
          : "",
        item.registrationNo || "",
        item.udiDi || "",
        item.medicalInsuranceCode || "",
        item.unit || "",
        item.salePermission
          ? salePermissionMap[item.salePermission] || item.salePermission
          : "",
        item.procurePermission
          ? procurePermissionMap[item.procurePermission] ||
            item.procurePermission
          : "",
        statusMap[item.status]?.label || item.status || "",
        item.manufacturer || "",
        item.storageCondition || "",
        item.shelfLife ?? "",
        item.defaultSupplierName || "",
        item.description || "",
      ]
        .map(escapeCsvCell)
        .join(",");
    });

    const csv = [headers.map(escapeCsvCell).join(","), ...body].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = url;
    a.download = `产品管理_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("产品表格已导出");
  };

  const handleImportProducts = async (file: File) => {
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

    const normalizeFlag = (
      value: string,
      trueValues: string[],
      falseValues: string[],
      fallback: boolean
    ) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return fallback;
      if (trueValues.some(item => item.toLowerCase() === normalized))
        return true;
      if (falseValues.some(item => item.toLowerCase() === normalized))
        return false;
      return fallback;
    };

    const productCategoryReverseMap = Object.fromEntries(
      Object.entries(productCategoryMap).map(([key, value]) => [
        value.label,
        key,
      ])
    ) as Record<string, string>;
    const categoryReverseMap = Object.fromEntries(
      Object.entries(categoryMap).map(([key, value]) => [value, key])
    ) as Record<string, string>;
    const riskLevelReverseMap: Record<string, "I" | "II" | "III"> = {
      I: "I",
      II: "II",
      III: "III",
      I类: "I",
      "I类（低风险）": "I",
      II类: "II",
      "II类（中风险）": "II",
      III类: "III",
      "III类（高风险）": "III",
    };
    const statusReverseMap: Record<
      string,
      "draft" | "active" | "discontinued"
    > = {
      draft: "draft",
      active: "active",
      discontinued: "discontinued",
      草稿: "draft",
      已上市: "active",
      已停产: "discontinued",
    };
    const salePermissionReverseMap: Record<
      string,
      "saleable" | "not_saleable"
    > = {
      saleable: "saleable",
      not_saleable: "not_saleable",
      销售: "saleable",
      不销售: "not_saleable",
    };
    const procurePermissionReverseMap: Record<
      string,
      "purchasable" | "production_only"
    > = {
      purchasable: "purchasable",
      production_only: "production_only",
      采购: "purchasable",
      生产: "production_only",
    };
    const supplierIdByName = new Map(
      (suppliersData as any[])
        .filter((supplier: any) => supplier?.name)
        .map((supplier: any) => [
          String(supplier.name).trim(),
          Number(supplier.id),
        ])
    );

    const nextCodeByPrefix = new Map<string, number>();
    for (const item of data) {
      const match = String(item.code || "").match(/^([A-Za-z]+)-(\d+)$/);
      if (!match) continue;
      const prefix = match[1].toUpperCase();
      const number = Number(match[2]);
      if (!Number.isFinite(number)) continue;
      nextCodeByPrefix.set(
        prefix,
        Math.max(nextCodeByPrefix.get(prefix) || 0, number)
      );
    }
    const allocNextCode = (productCategory: string) => {
      const prefix =
        PRODUCT_CATEGORY_PREFIXES[
          (productCategory as ProductCategory) || "finished"
        ] || PRODUCT_CATEGORY_PREFIXES.finished;
      const nextNumber = (nextCodeByPrefix.get(prefix) || 0) + 1;
      nextCodeByPrefix.set(prefix, nextNumber);
      return `${prefix}-${String(nextNumber).padStart(5, "0")}`;
    };

    let success = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i]);
      const name = readCol(row, "产品名称");
      if (!name) continue;

      const productCategoryText = readCol(row, "产品分类");
      const productCategory = (productCategoryReverseMap[productCategoryText] ||
        productCategoryText ||
        "finished") as ProductCategory;
      if (!productCategoryMap[productCategory]) {
        errors.push(`第${i + 1}行: 产品分类无效`);
        continue;
      }

      const riskLevelText = readCol(row, "风险等级");
      const riskLevel = riskLevelText
        ? riskLevelReverseMap[riskLevelText]
        : undefined;
      const code = readCol(row, "产品编码") || allocNextCode(productCategory);
      const procurePermission =
        procurePermissionReverseMap[readCol(row, "获取权限")] || "purchasable";
      const defaultSupplierName = readCol(row, "默认供应商");
      const defaultSupplierId = defaultSupplierName
        ? supplierIdByName.get(defaultSupplierName)
        : undefined;

      const payload = {
        isMedicalDevice: normalizeFlag(
          readCol(row, "产品类型"),
          ["医疗器械", "是", "true", "1", "yes"],
          ["非医疗器械", "否", "false", "0", "no"],
          true
        ),
        isSterilized: normalizeFlag(
          readCol(row, "是否灭菌"),
          ["是", "已灭菌", "true", "1", "yes"],
          ["否", "未灭菌", "false", "0", "no"],
          false
        ),
        code,
        name,
        specification: readCol(row, "规格型号") || undefined,
        category:
          categoryReverseMap[readCol(row, "产品属性")] ||
          readCol(row, "产品属性") ||
          undefined,
        productCategory,
        unit: readCol(row, "计量单位") || undefined,
        registrationNo: readCol(row, "注册证号") || undefined,
        udiDi: readCol(row, "UDI编码") || undefined,
        medicalInsuranceCode: readCol(row, "医保C码") || undefined,
        manufacturer: readCol(row, "生产企业") || defaultManufacturer,
        storageCondition: readCol(row, "储存条件") || undefined,
        shelfLife: readCol(row, "保质期（月）")
          ? Number(readCol(row, "保质期（月）"))
          : undefined,
        riskLevel,
        salePermission:
          salePermissionReverseMap[readCol(row, "销售权限")] || "saleable",
        procurePermission,
        status: statusReverseMap[readCol(row, "状态")] || "draft",
        description: readCol(row, "产品描述") || undefined,
      };

      try {
        const productId = await createMutation.mutateAsync(payload);
        if (defaultSupplierName) {
          if (defaultSupplierId && procurePermission === "purchasable") {
            await createSupplierPriceMutation.mutateAsync({
              productId: Number(productId),
              supplierId: defaultSupplierId,
              isDefault: 1,
            });
          } else if (!defaultSupplierId) {
            warnings.push(
              `第${i + 1}行: 默认供应商“${defaultSupplierName}”未匹配，已跳过`
            );
          }
        }
        success += 1;
      } catch (error: any) {
        errors.push(`${code}: ${error?.message || "导入失败"}`);
      }
    }

    await refetch();
    if (success > 0) {
      toast.success(`导入成功 ${success} 条`);
    }
    if (warnings.length > 0) {
      toast.warning(`导入提醒 ${warnings.length} 条`, {
        description: warnings.slice(0, 2).join("；"),
      });
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
        title="产品管理"
        description={
          productsError
            ? "产品数据加载失败，请点击重新加载"
            : isCollaborativeCompany
              ? "当前显示的是本公司独立产品库，可自行创建，也可一键批量引用神韵产品"
              : "作为整个ERP系统的数据源头，精确定义产品的所有属性"
        }
        icon={Package}
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="筛选产品名称、编码..."
        searchFields={["code", "name", "specification"]}
        addButtonText="新增产品"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        canEditRecord={isOwnedByCurrentCompany}
        canDeleteRecord={isOwnedByCurrentCompany}
        onExport={handleExportProducts}
        onImport={handleImportProducts}
        importAccept=".csv"
        filterKey="status"
        customFilter={matchesQuickFilters}
        filterResetKey={`${productCategoryFilter}|${productAttributeFilter}`}
        filterOptions={[
          { label: "已上市", value: "active" },
          { label: "草稿", value: "draft" },
          { label: "已停产", value: "discontinued" },
        ]}
        toolbarFilters={
          <>
            <Select
              value={productCategoryFilter}
              onValueChange={setProductCategoryFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="产品分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {PRODUCT_CATEGORY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={productAttributeFilter}
              onValueChange={setProductAttributeFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="产品属性" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部属性</SelectItem>
                {Object.entries(categoryMap).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        headerActions={
          <>
            {productsError ? (
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新加载
              </Button>
            ) : null}
            {isCollaborativeCompany ? (
              <Button
                variant="outline"
                onClick={handleBulkReference}
                disabled={bulkReferenceMutation.isPending}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${bulkReferenceMutation.isPending ? "animate-spin" : ""}`}
                />
                {bulkReferenceMutation.isPending
                  ? "引用中..."
                  : "一键引用神韵产品"}
              </Button>
            ) : null}
            <DraftDrawer
              count={draftItems.length}
              drafts={draftItems}
              moduleName="产品"
              onEdit={handleDraftEdit}
              onDelete={handleDraftDelete}
              loading={isLoading}
            />
          </>
        }
        stats={productStats}
      />

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRecord={editingRecord}
        onSuccess={refetch}
        returnAfterSaveTo={returnAfterSaveTo}
        onReturnAfterSave={(path) => {
          setReturnAfterSaveTo(null);
          setLocation(path);
        }}
      />

      <ProductDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        product={viewingRecord}
        onEdit={product => {
          setDetailOpen(false);
          handleEdit(product);
        }}
      />
    </>
  );
}
