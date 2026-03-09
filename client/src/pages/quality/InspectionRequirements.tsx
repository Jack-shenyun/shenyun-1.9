import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import {
  ClipboardList, Plus, Search, Trash2, Edit2, MoreHorizontal, ChevronDown, ChevronUp, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/formatters";

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

function emptyItem(): RequirementItem {
  return {
    key: newKey(), itemName: "", itemType: "qualitative",
    standard: "", minVal: "", maxVal: "", unit: "",
    acceptedValues: "", sortOrder: 0, remark: "",
  };
}

// ==================== 主组件 ====================
export default function InspectionRequirementsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // 新建/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    requirementNo: "", type: "IQC", productCode: "", productName: "",
    version: "1.0", status: "active", remark: "",
  });
  const [items, setItems] = useState<RequirementItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

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
    type: typeFilter === "all" ? undefined : typeFilter,
    search: search || undefined,
    limit: 200,
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
  function openCreate() {
    setEditId(null);
    const now = new Date();
    const seq = String((reqList as any[]).length + 1).padStart(3, "0");
    const typePrefix = { IQC: "IQC", IPQC: "IPQC", OQC: "OQC" }["IQC"];
    setFormData({
      requirementNo: `${typePrefix}-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${seq}`,
      type: "IQC", productCode: "", productName: "",
      version: "1.0", status: "active", remark: "",
    });
    setItems([emptyItem()]);
    setSelectedProduct(null);
    setShowForm(true);
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
  const formItems = editId && editDetail?.items?.length > 0
    ? editDetail.items.map((it: any) => ({
        key: newKey(),
        itemName: it.itemName,
        itemType: it.itemType,
        standard: it.standard ?? "",
        minVal: it.minVal ?? "",
        maxVal: it.maxVal ?? "",
        unit: it.unit ?? "",
        acceptedValues: it.acceptedValues ?? "",
        sortOrder: it.sortOrder ?? 0,
        remark: it.remark ?? "",
      }))
    : items;

  function setFormItems(newItems: RequirementItem[]) {
    setItems(newItems);
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
        remark: it.remark || undefined,
      })),
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const list = reqList as any[];

  return (
    <ERPLayout>
      <div className="p-6 space-y-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">检验要求</h1>
              <p className="text-sm text-muted-foreground">管理来料、过程、成品的检验标准</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />新建检验要求
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索产品名称、编号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="检验类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="IQC">来料检验</SelectItem>
              <SelectItem value="IPQC">过程检验</SelectItem>
              <SelectItem value="OQC">成品检验</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "来料检验(IQC)", count: list.filter((r) => r.type === "IQC").length, color: "text-blue-600" },
            { label: "过程检验(IPQC)", count: list.filter((r) => r.type === "IPQC").length, color: "text-orange-600" },
            { label: "成品检验(OQC)", count: list.filter((r) => r.type === "OQC").length, color: "text-green-600" },
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
                <TableHead className="w-8"></TableHead>
                <TableHead>编号</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>产品编号</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>检验项数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建日期</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : list.map((req) => (
                <>
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell>
                      <Button
                        variant="ghost" size="icon" className="w-6 h-6"
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      >
                        {expandedId === req.id
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{req.requirementNo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_MAP[req.type as keyof typeof TYPE_MAP] ?? req.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{req.productCode ?? "-"}</TableCell>
                    <TableCell className="font-medium">{req.productName}</TableCell>
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
                          <Button variant="ghost" size="icon" className="w-8 h-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(req)}>
                            <Edit2 className="w-4 h-4 mr-2" />编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("确认删除此检验要求？")) deleteMutation.mutate({ id: req.id });
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {/* 展开明细 */}
                  {expandedId === req.id && expandedDetail && (
                    <TableRow key={`${req.id}-detail`}>
                      <TableCell colSpan={10} className="bg-muted/20 p-0">
                        <div className="p-4">
                          <p className="text-sm font-medium mb-2 text-muted-foreground">检验项目明细</p>
                          {(expandedDetail as any).items?.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>序号</TableHead>
                                  <TableHead>检验项目</TableHead>
                                  <TableHead>类型</TableHead>
                                  <TableHead>检验标准</TableHead>
                                  <TableHead>范围/判定值</TableHead>
                                  <TableHead>单位</TableHead>
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
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 新建/编辑弹窗 */}
      <DraggableDialog open={showForm} onOpenChange={setShowForm}>
        <DraggableDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-5 p-1">
            <h2 className="text-lg font-semibold">{editId ? "编辑检验要求" : "新建检验要求"}</h2>

            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
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
              <div className="col-span-2 space-y-2">
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
                {/* 产品信息卡片 */}
                {selectedProduct && (
                  <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">产品编码</span>
                      <div className="font-mono font-medium mt-0.5">{selectedProduct.code}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">产品名称</span>
                      <div className="font-medium mt-0.5">{selectedProduct.name}</div>
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
                      <div className="mt-0.5">{{
                        finished: "成品",
                        semi_finished: "半成品",
                        raw_material: "原材料",
                        auxiliary: "辅料",
                        other: "其他",
                      }[selectedProduct.productCategory as string] || "-"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">风险等级</span>
                      <div className="mt-0.5">{selectedProduct.riskLevel ? `第${selectedProduct.riskLevel}类` : "-"}</div>
                    </div>
                    {selectedProduct.registrationNo && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">注册证号</span>
                        <div className="font-mono text-xs mt-0.5">{selectedProduct.registrationNo}</div>
                      </div>
                    )}
                    {selectedProduct.isMedicalDevice && (
                      <div>
                        <span className="text-muted-foreground">产品类型</span>
                        <div className="mt-0.5">医疗器械{selectedProduct.isSterilized ? "（无菌）" : ""}</div>
                      </div>
                    )}
                  </div>
                )}
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
            </div>
            <div className="space-y-1">
              <Label>备注</Label>
              <Textarea
                value={formData.remark}
                onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))}
                rows={2}
              />
            </div>

            {/* 检验项目明细 */}
            <div>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>检验项目 *</TableHead>
                      <TableHead className="w-24">类型</TableHead>
                      <TableHead>检验标准</TableHead>
                      <TableHead className="w-24">最小值</TableHead>
                      <TableHead className="w-24">最大值</TableHead>
                      <TableHead className="w-20">单位</TableHead>
                      <TableHead>合格判定值</TableHead>
                      <TableHead className="w-8"></TableHead>
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
            </div>

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
    </ERPLayout>
  );
}
