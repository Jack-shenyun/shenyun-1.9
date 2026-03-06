import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  PackageOpen, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, Truck, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  draft:    { label: "草稿",   variant: "outline" },
  pending:  { label: "待审批", variant: "default" },
  approved: { label: "已审批", variant: "secondary" },
  issued:   { label: "已发料", variant: "secondary" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

interface MaterialItem {
  materialCode: string;
  materialName: string;
  specification: string;
  requiredQty: number;
  unit: string;
  actualQty: number;
  remark: string;
}

export default function MaterialRequisitionPage() {
  const { canDelete } = usePermission();
  const { data: orders = [], isLoading, refetch } = trpc.materialRequisitionOrders.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: warehouseList = [] } = trpc.warehouses.list.useQuery({});
  const { data: productsData = [] } = trpc.products.list.useQuery();

  const createMutation = trpc.materialRequisitionOrders.create.useMutation({
    onSuccess: () => { refetch(); toast.success("领料单已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.materialRequisitionOrders.update.useMutation({
    onSuccess: () => { refetch(); toast.success("领料单已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.materialRequisitionOrders.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("领料单已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [items, setItems] = useState<MaterialItem[]>([]);

  // 弹窗选择器状态
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);

  // 当前选中的生产任务对应的 productId（用于查询 BOM）
  const [selectedProductId, setSelectedProductId] = useState<number>(0);

  // 查询选中产品的 BOM 物料明细
  const { data: bomItems = [], refetch: refetchBom } = trpc.bom.getByProductId.useQuery(
    { productId: selectedProductId },
    { enabled: selectedProductId > 0 }
  );

  const [formData, setFormData] = useState({
    requisitionNo: "",
    productionOrderId: "",
    productionOrderNo: "",
    productName: "",
    productSpec: "",
    productDescription: "",
    batchNo: "",
    plannedQty: "",
    unit: "",
    warehouseId: "",
    applicationDate: "",
    remark: "",
  });

  const filteredOrders = (orders as any[]).filter((o) => {
    const matchSearch = !searchTerm ||
      String(o.requisitionNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.productionOrderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const genNo = () => {
    const now = new Date();
    return `MR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
  };

  const handleAdd = () => {
    setEditingOrder(null);
    setSelectedProductId(0);
    setItems([]);
    setFormData({
      requisitionNo: genNo(),
      productionOrderId: "",
      productionOrderNo: "",
      productName: "",
      productSpec: "",
      productDescription: "",
      batchNo: "",
      plannedQty: "",
      unit: "",
      warehouseId: "",
      applicationDate: new Date().toISOString().split("T")[0],
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    let parsedItems: MaterialItem[] = [];
    try {
      const extra = JSON.parse(order.remark || "{}");
      parsedItems = extra.items || [];
    } catch {}
    setItems(parsedItems.length > 0 ? parsedItems : []);
    setSelectedProductId(0);
    setFormData({
      requisitionNo: order.requisitionNo,
      productionOrderId: order.productionOrderId ? String(order.productionOrderId) : "",
      productionOrderNo: order.productionOrderNo || "",
      productName: "",
      productSpec: "",
      productDescription: "",
      batchNo: "",
      plannedQty: "",
      unit: "",
      warehouseId: order.warehouseId ? String(order.warehouseId) : "",
      applicationDate: order.applicationDate ? String(order.applicationDate).split("T")[0] : "",
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleView = (order: any) => {
    setViewingOrder(order);
    setViewDialogOpen(true);
  };

  const handleDelete = (order: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: order.id });
  };

  const handleApprove = (order: any) => {
    updateMutation.mutate({ id: order.id, data: { status: "approved" } });
  };

  const handleIssue = (order: any) => {
    updateMutation.mutate({ id: order.id, data: { status: "issued" } });
    toast.success("已发料");
  };

  // 选择生产任务后自动带入产品信息
  const handleProductionOrderSelect = (po: any) => {
    const product = (productsData as any[]).find((p: any) => p.id === po.productId);
    const newProductId = po.productId || 0;
    setFormData((f) => ({
      ...f,
      productionOrderId: String(po.id),
      productionOrderNo: po.orderNo || "",
      productName: product?.name || po.productName || "",
      productSpec: product?.specification || "",
      productDescription: product?.description || "",
      batchNo: po.batchNo || "",
      plannedQty: po.plannedQty || "",
      unit: po.unit || product?.unit || "",
    }));
    setSelectedProductId(newProductId);
    setOrderPickerOpen(false);
    // 延迟一下再提示，等 BOM 查询触发
    setTimeout(() => {
      if (newProductId > 0) {
        toast.info("正在根据 BOM 自动带出物料明细...");
      }
    }, 300);
  };

  // 当 BOM 数据加载完成时，自动填充物料明细
  const handleLoadBomItems = () => {
    if ((bomItems as any[]).length === 0) {
      toast.warning("该产品暂无 BOM 数据，请手动添加物料");
      return;
    }
    // 只取 level=2 的物料（二级组件/半成品）和 level=3 的原材料
    const rawMaterials = (bomItems as any[]).filter((b: any) => b.level === 3 || b.level === 2);
    const newItems: MaterialItem[] = rawMaterials.map((b: any) => ({
      materialCode: b.materialCode || "",
      materialName: b.materialName || "",
      specification: b.specification || "",
      requiredQty: Number(b.quantity) || 0,
      unit: b.unit || "",
      actualQty: 0,
      remark: "",
    }));
    setItems(newItems);
    toast.success(`已从 BOM 带出 ${newItems.length} 条物料明细`);
  };

  const addItem = () => {
    setItems([...items, { materialCode: "", materialName: "", specification: "", requiredQty: 0, unit: "件", actualQty: 0, remark: "" }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof MaterialItem, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = () => {
    if (!formData.requisitionNo) {
      toast.error("请填写领料单号");
      return;
    }
    const remarkData = JSON.stringify({ items, note: formData.remark });
    const payload = {
      requisitionNo: formData.requisitionNo,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      warehouseId: formData.warehouseId ? Number(formData.warehouseId) : undefined,
      applicationDate: formData.applicationDate || undefined,
      status: "draft" as const,
      remark: remarkData,
    };
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data: { remark: remarkData } });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getViewItems = (order: any): MaterialItem[] => {
    try {
      const extra = JSON.parse(order.remark || "{}");
      return extra.items || [];
    } catch { return []; }
  };

  const draftCount = (orders as any[]).filter((o) => o.status === "draft").length;
  const pendingCount = (orders as any[]).filter((o) => o.status === "pending").length;
  const issuedCount = (orders as any[]).filter((o) => o.status === "issued").length;

  // 生产任务列表（用于弹窗选择）
  const availableOrders = (productionOrders as any[]).map((po: any) => {
    const product = (productsData as any[]).find((p: any) => p.id === po.productId);
    return { ...po, productName: product?.name || "-", productSpec: product?.specification || "" };
  });

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">领料单</h2>
              <p className="text-sm text-muted-foreground">生产任务领取原材料申请管理</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />新建领料单</Button>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">草稿</p><p className="text-2xl font-bold">{draftCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待审批</p><p className="text-2xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已发料</p><p className="text-2xl font-bold text-green-600">{issuedCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索领料单号、生产任务号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="approved">已审批</SelectItem>
                  <SelectItem value="issued">已发料</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">领料单号</TableHead>
                  <TableHead className="text-center font-bold">关联生产任务</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">申请日期</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无领料单</TableCell></TableRow>
                ) : filteredOrders.map((order: any) => {
                  const po = (productionOrders as any[]).find((p: any) => p.id === order.productionOrderId);
                  const product = po ? (productsData as any[]).find((p: any) => p.id === po.productId) : null;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-center font-medium font-mono">{order.requisitionNo}</TableCell>
                      <TableCell className="text-center font-mono">{order.productionOrderNo || "-"}</TableCell>
                      <TableCell className="text-center">{product?.name || "-"}</TableCell>
                      <TableCell className="text-center">{order.applicationDate ? String(order.applicationDate).split("T")[0] : "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[order.status]?.variant || "outline"} className={getStatusSemanticClass(order.status, statusMap[order.status]?.label)}>
                          {statusMap[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(order)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                            {order.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(order)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "pending" } })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />提交审批
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(order)}><CheckCircle className="h-4 w-4 mr-2" />审批通过</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "rejected" } })} className="text-destructive">
                                  <XCircle className="h-4 w-4 mr-2" />拒绝
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "approved" && (
                              <DropdownMenuItem onClick={() => handleIssue(order)}><Truck className="h-4 w-4 mr-2" />确认发料</DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => handleDelete(order)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />删除
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "编辑领料单" : "新建领料单"}</DialogTitle>
              <DialogDescription>填写领料申请信息及物料明细</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">

              {/* 第一行：领料单号 + 申请日期 + 领料仓库 + 状态 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>领料单号 *</Label>
                  <Input
                    value={formData.requisitionNo}
                    onChange={(e) => setFormData({ ...formData, requisitionNo: e.target.value })}
                    readOnly={!!editingOrder}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>申请日期</Label>
                  <Input type="date" value={formData.applicationDate} onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>领料仓库</Label>
                  <Select value={formData.warehouseId} onValueChange={(v) => setFormData({ ...formData, warehouseId: v })}>
                    <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                    <SelectContent>
                      {(warehouseList as any[]).map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>计划数量</Label>
                  <Input
                    value={formData.plannedQty}
                    onChange={(e) => setFormData({ ...formData, plannedQty: e.target.value })}
                    placeholder="自动带入"
                  />
                </div>
              </div>

              {/* 第二行：关联生产任务（弹窗选择） */}
              <div className="space-y-2">
                <Label>关联生产任务</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                  onClick={() => setOrderPickerOpen(true)}
                >
                  {formData.productionOrderId ? (
                    <span className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="font-mono text-xs text-muted-foreground">{formData.productionOrderNo}</span>
                      {formData.productName && <span className="font-medium">{formData.productName}</span>}
                      {formData.batchNo && <span className="text-muted-foreground text-xs">批次: {formData.batchNo}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">点击选择生产任务...</span>
                  )}
                </Button>
              </div>

              {/* 产品信息展示（只读，选择生产任务后自动带入） */}
              {formData.productionOrderId && (formData.productName || formData.productSpec) && (
                <div className="rounded-md bg-muted/50 p-3 grid grid-cols-4 gap-3 text-sm">
                  {formData.productName && (
                    <div><span className="text-muted-foreground text-xs">产品名称</span><p className="font-medium">{formData.productName}</p></div>
                  )}
                  {formData.productSpec && (
                    <div><span className="text-muted-foreground text-xs">规格型号</span><p>{formData.productSpec}</p></div>
                  )}
                  {formData.batchNo && (
                    <div><span className="text-muted-foreground text-xs">生产批号</span><p className="font-mono">{formData.batchNo}</p></div>
                  )}
                  {formData.unit && (
                    <div><span className="text-muted-foreground text-xs">单位</span><p>{formData.unit}</p></div>
                  )}
                  {formData.productDescription && (
                    <div className="col-span-4"><span className="text-muted-foreground text-xs">产品描述</span><p>{formData.productDescription}</p></div>
                  )}
                </div>
              )}

              <Separator />

              {/* 物料明细 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>物料明细</Label>
                  <div className="flex gap-2">
                    {selectedProductId > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadBomItems}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        从 BOM 带出物料
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" />手动添加
                    </Button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
                    {selectedProductId > 0
                      ? "点击「从 BOM 带出物料」自动填充，或手动添加物料"
                      : "请先选择关联生产任务，系统将根据 BOM 自动带出物料明细"}
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60">
                          <TableHead className="text-center font-bold">物料编码</TableHead>
                          <TableHead className="text-center font-bold">物料名称</TableHead>
                          <TableHead className="text-center font-bold">规格</TableHead>
                          <TableHead className="text-center font-bold">需求数量</TableHead>
                          <TableHead className="text-center font-bold">单位</TableHead>
                          <TableHead className="w-[60px] text-center font-bold">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-center">
                              <Input value={item.materialCode} onChange={(e) => updateItem(idx, "materialCode", e.target.value)} placeholder="编码" className="h-8 font-mono" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input value={item.materialName} onChange={(e) => updateItem(idx, "materialName", e.target.value)} placeholder="名称" className="h-8" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input value={item.specification} onChange={(e) => updateItem(idx, "specification", e.target.value)} placeholder="规格" className="h-8" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input type="number" value={item.requiredQty} onChange={(e) => updateItem(idx, "requiredQty", Number(e.target.value))} className="h-8 w-20" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="h-8 w-16" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingOrder ? "保存修改" : "创建领料单"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 关联生产任务弹窗选择器 */}
        <EntityPickerDialog
          open={orderPickerOpen}
          onOpenChange={setOrderPickerOpen}
          title="选择生产任务"
          searchPlaceholder="搜索指令单号、批次号、产品名称..."
          columns={[
            { key: "orderNo", title: "指令单号", render: (po) => <span className="font-mono font-medium">{po.orderNo}</span> },
            { key: "productName", title: "产品名称", render: (po) => <span className="font-medium">{po.productName}</span> },
            { key: "productSpec", title: "规格型号", render: (po) => <span className="text-muted-foreground">{po.productSpec || "-"}</span> },
            { key: "batchNo", title: "生产批号", render: (po) => <span className="font-mono">{po.batchNo || "-"}</span> },
            { key: "plannedQty", title: "计划数量", render: (po) => <span>{po.plannedQty} {po.unit}</span> },
            { key: "status", title: "状态", render: (po) => {
              const statusLabels: Record<string, string> = { draft: "草稿", planned: "已计划", in_progress: "生产中", completed: "已完成", cancelled: "已取消" };
              return <span>{statusLabels[po.status] || po.status}</span>;
            }},
          ]}
          rows={availableOrders}
          selectedId={formData.productionOrderId ? String(formData.productionOrderId) : ""}
          filterFn={(po, q) => {
            const lower = q.toLowerCase();
            return String(po.orderNo || "").toLowerCase().includes(lower) ||
              String(po.productName || "").toLowerCase().includes(lower) ||
              String(po.batchNo || "").toLowerCase().includes(lower);
          }}
          onSelect={handleProductionOrderSelect}
        />

        {/* 查看详情 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingOrder && (
              <div className="space-y-4">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">领料单详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingOrder.requisitionNo}
            {viewingOrder.status && (
              <> · <Badge variant={statusMap[viewingOrder.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingOrder.status, statusMap[viewingOrder.status]?.label)}`}>
                {statusMap[viewingOrder.status]?.label || String(viewingOrder.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div className="space-y-6 py-2">
          {/* 基本信息分区 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="关联任务">{viewingOrder.productionOrderNo || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="申请日期">{viewingOrder.applicationDate ? String(viewingOrder.applicationDate).split("T")[0] : "-"}</FieldRow>
              </div>
            </div>
          </div>

          {/* 物料明细分区 */}
          {getViewItems(viewingOrder).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">物料明细 ({getViewItems(viewingOrder).length} 项)</h3>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="text-center font-bold">物料编码</TableHead>
                      <TableHead className="text-center font-bold">物料名称</TableHead>
                      <TableHead className="text-center font-bold">规格</TableHead>
                      <TableHead className="text-center font-bold">需求数量</TableHead>
                      <TableHead className="text-center font-bold">单位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getViewItems(viewingOrder).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center font-mono">{item.materialCode}</TableCell>
                        <TableCell className="text-center">{item.materialName}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.specification || "-"}</TableCell>
                        <TableCell className="text-center">{item.requiredQty}</TableCell>
                        <TableCell className="text-center">{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(viewingOrder)}>编辑</Button>
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
