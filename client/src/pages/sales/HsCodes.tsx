import { useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { PRODUCT_CATEGORY_CUSTOMS_EXCLUDED_VALUES, type ProductCategory } from "@shared/productCategories";
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
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { toast } from "sonner";
import { FileCode2, Plus, Search, MoreHorizontal, Edit, Trash2 } from "lucide-react";

type HsCategory = "医疗器械" | "塑料制品" | "橡胶制品";
type HsStatus = "active" | "inactive";

interface HsCodeRow {
  id: number;
  code: string;
  category: string;
  productName: string;
  productId?: number;
  productAlias: string;
  declarationElements: string;
  unit: string;
  remark: string;
  status: HsStatus;
}

const categoryOptions: Array<{ label: string; value: HsCategory }> = [
  { label: "医疗器械", value: "医疗器械" },
  { label: "塑料制品", value: "塑料制品" },
  { label: "橡胶制品", value: "橡胶制品" },
];

const emptyForm = {
  code: "",
  category: "医疗器械" as HsCategory,
  productName: "",
  productId: undefined as number | undefined,
  productAlias: "",
  declarationElements: "",
  unit: "",
  remark: "",
  status: "active" as HsStatus,
};

function normalizeDeclarationElementsInput(value: string): string {
  return String(value || "")
    .split(/[\r\n]+|(?<=.)[;；]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function splitDeclarationElements(value: string): string[] {
  return normalizeDeclarationElementsInput(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function HsCodesPage() {
  const { data: listData = [], isLoading, refetch } = trpc.hsCodes.list.useQuery(
    { limit: 1000 },
    { refetchOnWindowFocus: false },
  );
  const { data: productsData = [] } = trpc.products.list.useQuery(
    { status: "active", salePermission: "saleable", limit: 1000 },
    { refetchOnWindowFocus: false },
  );
  const createMutation = trpc.hsCodes.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("HS编码已创建");
    },
    onError: (error) => toast.error(error.message || "创建失败"),
  });
  const updateMutation = trpc.hsCodes.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("HS编码已更新");
    },
    onError: (error) => toast.error(error.message || "更新失败"),
  });
  const deleteMutation = trpc.hsCodes.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("HS编码已删除");
    },
    onError: (error) => toast.error(error.message || "删除失败"),
  });

  const { canDelete } = usePermission();
  const rows = (listData as any[]).map((item): HsCodeRow => ({
    id: Number(item.id),
    code: String(item.code || ""),
    category: String(item.category || ""),
    productName: String(item.productName || ""),
    productId: item.productId ? Number(item.productId) : undefined,
    productAlias: String(item.productAlias || ""),
    declarationElements: String(item.declarationElements || ""),
    unit: String(item.unit || ""),
    remark: String(item.remark || ""),
    status: item.status === "inactive" ? "inactive" : "active",
  }));

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<HsCodeRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const formDeclarationElementList = useMemo(
    () => splitDeclarationElements(formData.declarationElements),
    [formData.declarationElements],
  );
  const productOptions = useMemo(
    () =>
      (productsData as any[])
        .filter((item) =>
          !PRODUCT_CATEGORY_CUSTOMS_EXCLUDED_VALUES.includes(String(item.productCategory || "other") as ProductCategory),
        )
        .map((item) => ({
          id: Number(item.id),
          code: String(item.code || ""),
          name: String(item.name || ""),
          unit: String(item.unit || ""),
        })),
    [productsData],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const keyword = searchTerm.trim().toLowerCase();
      const matchesSearch = !keyword
        || row.code.toLowerCase().includes(keyword)
        || row.productName.toLowerCase().includes(keyword)
        || row.productAlias.toLowerCase().includes(keyword)
        || row.declarationElements.toLowerCase().includes(keyword)
        || row.remark.toLowerCase().includes(keyword);
      const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [rows, searchTerm, categoryFilter, statusFilter]);

  const resetForm = () => {
    setEditingRow(null);
    setFormData(emptyForm);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (row: HsCodeRow) => {
    setEditingRow(row);
    setFormData({
      code: row.code,
      category: (
        row.category === "塑料制品"
          ? "塑料制品"
          : row.category === "橡胶制品"
            ? "橡胶制品"
            : "医疗器械"
      ) as HsCategory,
      productName: row.productName,
      productId: row.productId,
      productAlias: row.productAlias,
      declarationElements: row.declarationElements,
      unit: row.unit,
      remark: row.remark,
      status: row.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      code: formData.code.trim(),
      category: formData.category,
      productName: formData.productName.trim(),
      productId: formData.productId,
      productAlias: formData.productAlias.trim(),
      declarationElements: normalizeDeclarationElementsInput(formData.declarationElements),
      unit: formData.unit.trim(),
      remark: formData.remark.trim(),
      status: formData.status,
    };

    if (!payload.code) {
      toast.error("请先填写HS编码");
      return;
    }

    if (!payload.declarationElements) {
      toast.error("请先填写申报要素");
      return;
    }

    if (editingRow) {
      await updateMutation.mutateAsync({
        id: editingRow.id,
        data: payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (row: HsCodeRow) => {
    if (!window.confirm(`确认删除 HS 编码 ${row.code} 吗？`)) return;
    await deleteMutation.mutateAsync({ id: row.id });
  };

  return (
    <ERPLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">HS编码库</h1>
              <p className="text-muted-foreground">维护医疗器械、塑料制品、橡胶制品三类，报关填编码时自动带出申报要素。</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新增编码
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索 HS编码、品名、产品名称、申报要素..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>HS编码</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>品名</TableHead>
                    <TableHead>产品名称</TableHead>
                    <TableHead>申报要素</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                        {isLoading ? "加载中..." : "暂无HS编码数据"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.code}</TableCell>
                        <TableCell>{row.category || "-"}</TableCell>
                        <TableCell>{row.productName || "-"}</TableCell>
                        <TableCell>{row.productAlias || "-"}</TableCell>
                        <TableCell className="max-w-[420px]">
                          {splitDeclarationElements(row.declarationElements).length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {splitDeclarationElements(row.declarationElements).map((item, index) => (
                                <Badge
                                  key={`${row.id}-${index}-${item}`}
                                  variant="outline"
                                  className="max-w-full whitespace-normal text-left leading-5"
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{row.unit || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusSemanticClass(row.status === "active" ? "active" : "inactive")}>
                            {row.status === "active" ? "启用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(row)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              {canDelete && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(row)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingRow ? "编辑HS编码" : "新增HS编码"}</DialogTitle>
              <DialogDescription>维护编码后，报关页填写或选择 HS 编码时会自动带出申报要素。</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label>HS编码</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="例如：9018390000"
                />
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: HsCategory) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>品名</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productName: e.target.value }))}
                  placeholder="例如：一次性使用胃管"
                />
              </div>
              <div className="space-y-2">
                <Label>产品名称</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 justify-start text-left"
                    onClick={() => setProductPickerOpen(true)}
                  >
                    {formData.productAlias || "选择产品"}
                  </Button>
                  {formData.productId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormData((prev) => ({ ...prev, productId: undefined, productAlias: "" }))}
                    >
                      清除
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  从产品库选择产品，不展示规格，后续单据可直接按产品绑定。
                </p>
              </div>
              <div className="space-y-2">
                <Label>单位</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder="例如：PCS"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>申报要素</Label>
                <Textarea
                  rows={5}
                  value={formData.declarationElements}
                  onChange={(e) => setFormData((prev) => ({ ...prev, declarationElements: e.target.value }))}
                  placeholder="一行填写一个申报要素，粘贴分号内容保存时也会自动拆开"
                />
                <p className="text-xs text-muted-foreground">
                  保存后会按“一行一项”入库，报关页带出的申报要素也会保持拆开显示。
                </p>
                {formDeclarationElementList.length > 0 && (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">拆分预览</p>
                    <div className="flex flex-wrap gap-1.5">
                      {formDeclarationElementList.map((item, index) => (
                        <Badge key={`preview-${index}-${item}`} variant="secondary" className="max-w-full whitespace-normal text-left leading-5">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>备注</Label>
                <Textarea
                  rows={3}
                  value={formData.remark}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="可选备注"
                />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: HsStatus) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                保存
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          title="选择产品"
          searchPlaceholder="搜索产品编码、产品名称..."
          columns={[
            { key: "code", title: "产品编码", className: "w-[160px]", render: (item) => <span className="font-mono">{item.code}</span> },
            { key: "name", title: "产品名称", render: (item) => <span className="font-medium">{item.name}</span> },
            { key: "unit", title: "单位", className: "w-[100px]" },
          ]}
          rows={productOptions}
          selectedId={formData.productId || null}
          filterFn={(item, keyword) => {
            const search = keyword.toLowerCase();
            return item.code.toLowerCase().includes(search) || item.name.toLowerCase().includes(search);
          }}
          onSelect={(item) => {
            setFormData((prev) => ({
              ...prev,
              productId: item.id,
              productAlias: item.name,
            }));
            setProductPickerOpen(false);
          }}
        />
      </div>
    </ERPLayout>
  );
}
