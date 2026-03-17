import { useEffect, useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import {
  ClipboardList, Plus, Search, Trash2, Edit2, MoreHorizontal, ChevronDown, ChevronUp, ChevronRight,
  RefreshCw, Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/formatters";
import { PRODUCT_CATEGORY_LABELS } from "@shared/productCategories";

// ==================== 类型 ====================
type RequirementItem = {
  key: string;
  itemName: string;
  itemType: "qualitative" | "quantitative";
  standard: string;
  minVal: string;
  maxVal: string;
  unit: string;
  acceptedValues: string;
  sortOrder: number;
  remark: string;
  labTestType: string;
  children: RequirementChildItem[];
};

type RequirementChildItem = {
  key: string;
  detailName: string;
  detailStandard: string;
  remark: string;
  sortOrder: number;
};

type FormData = {
  requirementNo: string;
  type: "IQC" | "IPQC" | "OQC";
  productCode: string;
  productName: string;
  version: string;
  status: "active" | "inactive";
  remark: string;
};

const TYPE_MAP = { IQC: "来料检验", IPQC: "过程检验", OQC: "成品检验" };
const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "启用", variant: "default" },
  inactive: { label: "停用", variant: "secondary" },
};

let keyCounter = 0;
function newKey() { return `item-${++keyCounter}-${Date.now()}`; }

function emptyChildItem(sortOrder = 0): RequirementChildItem {
  return {
    key: newKey(),
    detailName: "",
    detailStandard: "",
    remark: "",
    sortOrder,
  };
}

function normalizeChildItems(children: any[]): RequirementChildItem[] {
  return (children || []).map((child: any, index: number) => ({
    key: String(child?.key || newKey()),
    detailName: String(child?.detailName || child?.name || ""),
    detailStandard: String(child?.detailStandard || child?.standard || ""),
    remark: String(child?.remark || ""),
    sortOrder: Number(child?.sortOrder ?? index),
  }));
}

function parseRequirementItemRemark(remark: unknown) {
  const text = String(remark || "").trim();
  if (!text) return { note: "", children: [] as RequirementChildItem[] };
  if (!text.startsWith("{")) {
    return { note: text, children: [] as RequirementChildItem[] };
  }
  try {
    const parsed = JSON.parse(text);
    return {
      note: String(parsed?.note || parsed?.remark || ""),
      children: normalizeChildItems(parsed?.children || parsed?.details || []),
    };
  } catch {
    return { note: text, children: [] as RequirementChildItem[] };
  }
}

function buildRequirementItemRemark(item: RequirementItem) {
  const note = String(item.remark || "").trim();
  const children = normalizeChildItems(item.children || []).filter(
    (child) => child.detailName.trim() || child.detailStandard.trim() || child.remark.trim()
  );
  if (children.length === 0) {
    return note || undefined;
  }
  return JSON.stringify({ note, children });
}

function emptyItem(): RequirementItem {
  return {
    key: newKey(), itemName: "", itemType: "qualitative",
    standard: "", minVal: "", maxVal: "", unit: "",
    acceptedValues: "", sortOrder: 0, remark: "", labTestType: "", children: [],
  };
}

// ==================== 主组件 ====================
export default function InspectionRequirementsPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("IQC");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);

  // 新建/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    requirementNo: "", type: "IQC", productCode: "", productName: "",
    version: "1.0", status: "active", remark: "",
  });
  const [items, setItems] = useState<RequirementItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [showChildrenDialog, setShowChildrenDialog] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // 产品选择弹窗
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // 产品列表
  const { data: rawProducts = [] } = trpc.products.list.useQuery({});
  const products = rawProducts as any[];

  // 详情展开
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: expandedDetail } = trpc.inspectionRequirements.getById.useQuery(
    { id: expandedId! },
    { enabled: !!expandedId }
  );

  // ==================== 数据查询 ====================
  const { data: reqList = [], refetch } = trpc.inspectionRequirements.list.useQuery({
    search: search || undefined,
    limit: 500,
  });

  const createMutation = trpc.inspectionRequirements.create.useMutation({
    onSuccess: () => {
      toast.success(editId ? "检验要求已更新" : "检验要求已创建");
      refetch();
      setShowForm(false);
      setSubmitting(false);
    },
    onError: (e) => { toast.error("操作失败：" + e.message); setSubmitting(false); },
  });
  const updateMutation = trpc.inspectionRequirements.update.useMutation({
    onSuccess: () => {
      toast.success("检验要求已更新");
      refetch();
      setShowForm(false);
      setSubmitting(false);
    },
    onError: (e) => { toast.error("操作失败：" + e.message); setSubmitting(false); },
  });
  const deleteMutation = trpc.inspectionRequirements.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); refetch(); },
    onError: (e) => toast.error("删除失败：" + e.message),
  });

  // ==================== 表单操作 ====================
  function buildRequirementNo(type: FormData["type"]) {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const typePrefix = { IQC: "IQC", IPQC: "IPQC", OQC: "OQC" }[type];
    return `${typePrefix}-${datePart}-${timePart}`;
  }

  function openCreate() {
    setEditId(null);
    setFormData({
      requirementNo: buildRequirementNo("IQC"),
      type: "IQC", productCode: "", productName: "",
      version: "1.0", status: "active", remark: "",
    });
    setItems([emptyItem()]);
    setSelectedProduct(null);
    setShowForm(true);
  }

  async function handleCopy(req: any) {
    try {
      const detail = await utils.inspectionRequirements.getById.fetch({ id: req.id });
      const nextType = (req.type || "IQC") as FormData["type"];
      const matchedProduct =
        (rawProducts as any[]).find((p) => p.code === detail?.productCode || p.name === detail?.productName) ?? null;
      const copiedItems = Array.isArray((detail as any)?.items) && (detail as any).items.length > 0
        ? (detail as any).items.map((it: any) => {
            const parsedRemark = parseRequirementItemRemark(it.remark);
            return {
              key: newKey(),
              itemName: it.itemName,
              itemType: it.itemType,
              standard: it.standard ?? "",
              minVal: it.minVal ?? "",
              maxVal: it.maxVal ?? "",
              unit: it.unit ?? "",
              acceptedValues: it.acceptedValues ?? "",
              sortOrder: it.sortOrder ?? 0,
              remark: parsedRemark.note,
              labTestType: it.labTestType ?? "",
              children: parsedRemark.children,
            } as RequirementItem;
          })
        : [emptyItem()];

      setEditId(null);
      setExpandedId(null);
      setFormData({
        requirementNo: buildRequirementNo(nextType),
        type: nextType,
        productCode: detail?.productCode ?? "",
        productName: detail?.productName ?? "",
        version: detail?.version ?? "1.0",
        status: "active",
        remark: detail?.remark ?? "",
      });
      setItems(copiedItems);
      setSelectedProduct(matchedProduct);
      setShowForm(true);
      toast.success("已生成副本，请确认后保存");
    } catch (error: any) {
      toast.error("复制失败：" + (error?.message || "未知错误"));
    }
  }

  function openEdit(req: any) {
    setEditId(req.id);
    setFormData({
      requirementNo: req.requirementNo,
      type: req.type,
      productCode: req.productCode ?? "",
      productName: req.productName,
      version: req.version ?? "1.0",
      status: req.status ?? "active",
      remark: req.remark ?? "",
    });
    // 编辑时从产品列表中找到匹配的产品对象
    const matched = (rawProducts as any[]).find((p) => p.code === req.productCode || p.name === req.productName);
    setSelectedProduct(matched ?? null);
    // 加载明细
    setItems([]); // 等详情加载
    setExpandedId(req.id);
    setShowForm(true);
  }

  // 当展开详情时，如果是编辑模式，填充items
  const editDetail = editId ? (expandedDetail as any) : null;
  const formItems = items;

  useEffect(() => {
    if (!editId || !showForm || !editDetail) return;
    const mappedItems = Array.isArray(editDetail?.items) && editDetail.items.length > 0
      ? editDetail.items.map((it: any) => {
          const parsedRemark = parseRequirementItemRemark(it.remark);
          return {
            key: newKey(),
            itemName: it.itemName,
            itemType: it.itemType,
            standard: it.standard ?? "",
            minVal: it.minVal ?? "",
            maxVal: it.maxVal ?? "",
            unit: it.unit ?? "",
              acceptedValues: it.acceptedValues ?? "",
              sortOrder: it.sortOrder ?? 0,
              remark: parsedRemark.note,
              labTestType: it.labTestType ?? "",
              children: parsedRemark.children,
            } as RequirementItem;
          })
        : [emptyItem()];
    setItems(mappedItems);
  }, [editDetail, editId, showForm]);

  function setFormItems(newItems: RequirementItem[]) {
    setItems(newItems);
  }

  function updateChildItems(index: number, nextChildren: RequirementChildItem[]) {
    const next = [...formItems];
    next[index] = { ...next[index], children: nextChildren };
    setFormItems(next);
  }

  function openChildrenDialog(index: number) {
    setActiveItemIndex(index);
    setShowChildrenDialog(true);
  }

  function handleSubmit() {
    if (!formData.requirementNo) return toast.error("请填写检验要求编号");
    if (!formData.productName) return toast.error("请填写产品名称");
    const validItems = formItems.filter((i) => i.itemName.trim());
    if (validItems.length === 0) return toast.error("请至少添加一个检验项目");
    setSubmitting(true);
    const payload = {
      ...formData,
      items: validItems.map((it, idx) => ({
        itemName: it.itemName,
        itemType: it.itemType,
        standard: it.standard || undefined,
        minValue: it.minVal || undefined,
        maxValue: it.maxVal || undefined,
        unit: it.unit || undefined,
        acceptedValues: it.acceptedValues || undefined,
        sortOrder: idx,
        remark: buildRequirementItemRemark(it),
        labTestType: it.labTestType || undefined,
      })),
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const allList = reqList as any[];
  // 按 typeFilter 过滤（Tab 分页）
  const list = useMemo(() => {
    if (typeFilter === "all") return allList;
    return allList.filter((r) => r.type === typeFilter);
  }, [allList, typeFilter]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const paginatedList = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const stats = useMemo(() => ({
    total: allList.length,
    iqc: allList.filter((r) => r.type === "IQC").length,
    ipqc: allList.filter((r) => r.type === "IPQC").length,
    oqc: allList.filter((r) => r.type === "OQC").length,
  }), [allList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, list.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleDeleteClick(req: any) {
    setRecordToDelete(req);
    setDeleteDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (recordToDelete?.id) {
      deleteMutation.mutate({ id: recordToDelete.id });
    }
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">检验要求</h2>
              <p className="text-sm text-muted-foreground">管理来料、过程、成品的检验标准</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              刷新
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />新建检验要求
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">要求总数</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">来料检验(IQC)</p>
              <p className="text-2xl font-bold text-blue-600">{stats.iqc}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">过程检验(IPQC)</p>
              <p className="text-2xl font-bold text-orange-600">{stats.ipqc}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">成品检验(OQC)</p>
              <p className="text-2xl font-bold text-green-600">{stats.oqc}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索框 */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索产品名称、编号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tab 分页 + 列表 */}
        <Tabs value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setExpandedId(null); }}>
          <TabsList className="mb-2">
            <TabsTrigger value="IQC">来料检验
              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">{stats.iqc}</span>
            </TabsTrigger>
            <TabsTrigger value="IPQC">过程检验
              <span className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700">{stats.ipqc}</span>
            </TabsTrigger>
            <TabsTrigger value="OQC">成品检验
              <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">{stats.oqc}</span>
            </TabsTrigger>
          </TabsList>

          {(["IQC", "IPQC", "OQC"] as const).map((tabType) => (
            <TabsContent key={tabType} value={tabType}>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8" />
                          <TableHead>产品编号</TableHead>
                          <TableHead>产品名称</TableHead>
                          <TableHead>规格型号</TableHead>
                          <TableHead>版本</TableHead>
                          <TableHead>检验项数</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>创建时间</TableHead>
                          <TableHead className="w-16">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                              暂无数据
                            </TableCell>
                          </TableRow>
                        ) : paginatedList.map((req) => ([
                            <TableRow key={req.id} className="cursor-pointer hover:bg-muted/30">
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                >
                                  {expandedId === req.id
                                    ? <ChevronUp className="h-3 w-3" />
                                    : <ChevronDown className="h-3 w-3" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">{req.productCode ?? "-"}</TableCell>
                              <TableCell className="font-medium">{req.productName}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {products.find((p: any) => p.code === req.productCode)?.specification ?? "-"}
                              </TableCell>
                              <TableCell>{req.version ?? "1.0"}</TableCell>
                              <TableCell>
                                {expandedId === req.id && expandedDetail
                                  ? (expandedDetail as any).items?.length ?? "-"
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={STATUS_MAP[req.status]?.variant ?? "outline"}>
                                  {STATUS_MAP[req.status]?.label ?? req.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleCopy(req)}>
                                      <Copy className="mr-2 h-4 w-4" />复制
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEdit(req)}>
                                      <Edit2 className="mr-2 h-4 w-4" />编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteClick(req)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>,
                            expandedId === req.id && expandedDetail && (
                              <TableRow key={`${req.id}-detail`}>
                                <TableCell colSpan={9} className="bg-muted/20 p-0">
                                  <div className="p-4">
                                    <p className="mb-2 text-sm font-medium text-muted-foreground">检验项目明细</p>
                                    {(expandedDetail as any).items?.length > 0 ? (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>序号</TableHead>
                                            <TableHead>检验项目</TableHead>
                                            <TableHead>类型</TableHead>
                                            <TableHead>检验标准</TableHead>
                                            <TableHead>范围/判定値</TableHead>
                                            <TableHead>单位</TableHead>
                                            <TableHead>二级明细</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {(expandedDetail as any).items.map((it: any, idx: number) => (
                                            <TableRow key={it.id}>
                                              <TableCell>{idx + 1}</TableCell>
                                              <TableCell>{it.itemName}</TableCell>
                                              <TableCell>
                                                <Badge variant={it.itemType === "quantitative" ? "default" : "secondary"}>
                                                  {it.itemType === "quantitative" ? "定量" : "定性"}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>{it.standard ?? "-"}</TableCell>
                                              <TableCell>
                                                {it.itemType === "quantitative"
                                                  ? `${it.minVal ?? ""}～${it.maxVal ?? ""}`
                                                  : it.acceptedValues ?? "-"}
                                              </TableCell>
                                              <TableCell>{it.unit ?? "-"}</TableCell>
                                              <TableCell className="text-sm text-muted-foreground">
                                                {(() => {
                                                  const parsedRemark = parseRequirementItemRemark(it.remark);
                                                  if (parsedRemark.children.length === 0) return "-";
                                                  return (
                                                    <div className="space-y-1">
                                                      <div>{parsedRemark.children.length} 项</div>
                                                      <div className="text-xs">
                                                        {parsedRemark.children.map((child) => child.detailName).filter(Boolean).join("、") || "-"}
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">暂无检验项目</p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          ]))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {list.length > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, list.length)} 条，
                    共 {list.length} 条，第 {currentPage} / {totalPages} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 新建/编辑弹窗 */}
      <DraggableDialog open={showForm} onOpenChange={setShowForm}>
        <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
          <div className="space-y-5 p-1">
            <h2 className="text-lg font-semibold">{editId ? "编辑检验要求" : "新建检验要求"}</h2>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="text-sm font-medium">基础信息</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>检验要求编号 <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.requirementNo}
                        onChange={(e) => setFormData((p) => ({ ...p, requirementNo: e.target.value }))}
                        placeholder="如：IQC-20260308-001"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>检验类型 <span className="text-destructive">*</span></Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) => setFormData((p) => ({ ...p, type: v as any }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IQC">来料检验（IQC）</SelectItem>
                          <SelectItem value="IPQC">过程检验（IPQC）</SelectItem>
                          <SelectItem value="OQC">成品检验（OQC）</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>版本号</Label>
                      <Input
                        value={formData.version}
                        onChange={(e) => setFormData((p) => ({ ...p, version: e.target.value }))}
                        placeholder="如：1.0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>状态</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => setFormData((p) => ({ ...p, status: v as any }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">启用</SelectItem>
                          <SelectItem value="inactive">停用</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>备注</Label>
                      <Textarea
                        value={formData.remark}
                        onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="text-sm font-medium">产品信息</div>
                  <div className="space-y-2">
                    <Label>产品 <span className="text-destructive">*</span></Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                      onClick={() => setShowProductPicker(true)}
                    >
                      {formData.productName ? (
                        <span className="flex items-center gap-2">
                          {formData.productCode && (
                            <span className="font-mono text-xs text-muted-foreground">{formData.productCode}</span>
                          )}
                          <span>{formData.productName}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择产品...</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {selectedProduct ? (
                    <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">产品编码</span>
                        <div className="mt-0.5 font-mono font-medium">{selectedProduct.code}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">产品名称</span>
                        <div className="mt-0.5 font-medium">{selectedProduct.name}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">规格型号</span>
                        <div className="mt-0.5">{selectedProduct.specification || "-"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">计量单位</span>
                        <div className="mt-0.5">{selectedProduct.unit || "-"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">产品分类</span>
                        <div className="mt-0.5">{PRODUCT_CATEGORY_LABELS[selectedProduct.productCategory as keyof typeof PRODUCT_CATEGORY_LABELS] || "-"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">风险等级</span>
                        <div className="mt-0.5">{selectedProduct.riskLevel ? `第${selectedProduct.riskLevel}类` : "-"}</div>
                      </div>
                      {selectedProduct.registrationNo && (
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">注册证号</span>
                          <div className="mt-0.5 font-mono text-xs">{selectedProduct.registrationNo}</div>
                        </div>
                      )}
                      {selectedProduct.isMedicalDevice && (
                        <div>
                          <span className="text-muted-foreground">产品类型</span>
                          <div className="mt-0.5">医疗器械{selectedProduct.isSterilized ? "（无菌）" : ""}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                      选择产品后会在这里显示产品摘要
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 检验项目明细 */}
            <Card>
              <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">检验项目</Label>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => setFormItems([...formItems, emptyItem()])}
                >
                  <Plus className="w-3 h-3 mr-1" />添加项目
                </Button>
              </div>
              <div className="border rounded-lg overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                <Table className={`table-fixed ${formData.type === "OQC" ? "min-w-[1560px]" : "min-w-[1420px]"}`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-[300px]">检验项目 *</TableHead>
                      <TableHead className="w-[110px]">类型</TableHead>
                      <TableHead className="w-[320px]">检验标准</TableHead>
                      <TableHead className="w-[96px]">最小值</TableHead>
                      <TableHead className="w-[96px]">最大值</TableHead>
                      <TableHead className="w-[88px]">单位</TableHead>
                      <TableHead className="w-[300px]">合格判定值</TableHead>
                      <TableHead className="w-[140px]">实验室检验</TableHead>
                      {formData.type === "OQC" && <TableHead className="w-[140px]">二级明细</TableHead>}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formItems.map((item, idx) => (
                      <TableRow key={item.key}>
                        <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={item.itemName}
                            onChange={(e) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], itemName: e.target.value };
                              setFormItems(next);
                            }}
                            placeholder="如：外观"
                            className="h-8 text-sm"
                          />
                          {formData.type === "OQC" && (item.children?.length || 0) > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              已配置 {item.children.length} 项二级明细
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.itemType}
                            onValueChange={(v) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], itemType: v as any };
                              setFormItems(next);
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="qualitative">定性</SelectItem>
                              <SelectItem value="quantitative">定量</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.standard}
                            onChange={(e) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], standard: e.target.value };
                              setFormItems(next);
                            }}
                            placeholder="检验标准描述"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.minVal}
                            onChange={(e) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], minVal: e.target.value };
                              setFormItems(next);
                            }}
                            placeholder="最小值"
                            className="h-8 text-sm"
                            disabled={item.itemType !== "quantitative"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.maxVal}
                            onChange={(e) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], maxVal: e.target.value };
                              setFormItems(next);
                            }}
                            placeholder="最大值"
                            className="h-8 text-sm"
                            disabled={item.itemType !== "quantitative"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], unit: e.target.value };
                              setFormItems(next);
                            }}
                            placeholder="单位"
                            className="h-8 text-sm"
                            disabled={item.itemType !== "quantitative"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.acceptedValues}
                            onChange={(e) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], acceptedValues: e.target.value };
                              setFormItems(next);
                            }}
                            placeholder="如：合格,通过"
                            className="h-8 text-sm"
                            disabled={item.itemType !== "qualitative"}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.labTestType || "none"}
                            onValueChange={(v) => {
                              const next = [...formItems];
                              next[idx] = { ...next[idx], labTestType: v === "none" ? "" : v };
                              setFormItems(next);
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="无" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">无</SelectItem>
                              <SelectItem value="bioburden">初始污染菌</SelectItem>
                              <SelectItem value="sterility">无菌检验</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {formData.type === "OQC" && (
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openChildrenDialog(idx)}
                            >
                              {(item.children?.length || 0) > 0 ? `${item.children.length} 项明细` : "配置明细"}
                            </Button>
                          </TableCell>
                        )}
                        <TableCell>
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="w-7 h-7 text-destructive"
                            onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog open={showChildrenDialog} onOpenChange={setShowChildrenDialog}>
        <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">配置二级检验明细</h3>
                <p className="text-sm text-muted-foreground">
                  主项目下挂的明细会在成品检验录入时一并带出
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeItemIndex === null) return;
                  updateChildItems(activeItemIndex, [
                    ...(formItems[activeItemIndex]?.children || []),
                    emptyChildItem(formItems[activeItemIndex]?.children?.length || 0),
                  ]);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加明细
              </Button>
            </div>

            {activeItemIndex !== null && formItems[activeItemIndex] ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <span className="text-muted-foreground">所属主项目：</span>
                  <span className="font-medium">{formItems[activeItemIndex].itemName || "未命名项目"}</span>
                </div>

                {(formItems[activeItemIndex].children?.length || 0) > 0 ? (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                    {(formItems[activeItemIndex].children || []).map((child, childIndex) => (
                      <div key={child.key} className="rounded-lg border bg-card p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">明细 {childIndex + 1}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              const nextChildren = (formItems[activeItemIndex].children || []).filter((_, index) => index !== childIndex);
                              updateChildItems(
                                activeItemIndex,
                                nextChildren.map((nextChild, index) => ({ ...nextChild, sortOrder: index }))
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>明细名称</Label>
                          <Input
                            value={child.detailName}
                            onChange={(e) => {
                              const nextChildren = [...(formItems[activeItemIndex].children || [])];
                              nextChildren[childIndex] = {
                                ...nextChildren[childIndex],
                                detailName: e.target.value,
                                sortOrder: childIndex,
                              };
                              updateChildItems(activeItemIndex, nextChildren);
                            }}
                            placeholder="如：头端圆滑度"
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>检验要求</Label>
                          <Textarea
                            value={child.detailStandard}
                            onChange={(e) => {
                              const nextChildren = [...(formItems[activeItemIndex].children || [])];
                              nextChildren[childIndex] = {
                                ...nextChildren[childIndex],
                                detailStandard: e.target.value,
                                sortOrder: childIndex,
                              };
                              updateChildItems(activeItemIndex, nextChildren);
                            }}
                            placeholder="输入该明细的具体检验要求"
                            rows={4}
                            className="min-h-[112px] resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>备注</Label>
                          <Textarea
                            value={child.remark}
                            onChange={(e) => {
                              const nextChildren = [...(formItems[activeItemIndex].children || [])];
                              nextChildren[childIndex] = {
                                ...nextChildren[childIndex],
                                remark: e.target.value,
                                sortOrder: childIndex,
                              };
                              updateChildItems(activeItemIndex, nextChildren);
                            }}
                            placeholder="补充说明"
                            rows={3}
                            className="min-h-[88px] resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                    暂无二级明细，点击“添加明细”开始配置
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t pt-2">
              <Button variant="outline" onClick={() => setShowChildrenDialog(false)}>关闭</Button>
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 产品选择弹窗 */}
      <EntityPickerDialog
        open={showProductPicker}
        onOpenChange={setShowProductPicker}
        title="选择产品"
        searchPlaceholder="搜索产品编码、名称、规格..."
        columns={[
          { key: "code", title: "产品编码", className: "w-[140px]", render: (p) => <span className="font-mono font-medium text-sm">{p.code}</span> },
          { key: "name", title: "产品名称", render: (p) => <span className="font-medium">{p.name}</span> },
          { key: "specification", title: "规格型号", render: (p) => <span className="text-muted-foreground text-sm">{p.specification || "-"}</span> },
          { key: "unit", title: "单位", className: "w-[80px]" },
        ]}
        rows={products}
        selectedId={formData.productCode || null}
        getRowId={(p) => p.code ?? p.id}
        filterFn={(p, q) => {
          const lower = q.toLowerCase();
          return (
            p.code?.toLowerCase().includes(lower) ||
            p.name?.toLowerCase().includes(lower) ||
            p.specification?.toLowerCase().includes(lower)
          );
        }}
        onSelect={(p) => {
          setFormData((prev) => ({
            ...prev,
            productCode: p.code ?? "",
            productName: p.name ?? "",
          }));
          setSelectedProduct(p);
          setShowProductPicker(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除检验要求 {recordToDelete?.requirementNo || ""} 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ERPLayout>
  );
}
