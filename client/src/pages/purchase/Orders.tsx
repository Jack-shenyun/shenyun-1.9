import { formatDateTime } from "@/lib/formatters";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import MaterialMultiSelect, { SelectedMaterial, Material } from "@/components/MaterialMultiSelect";
import { ShoppingBag, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, Layers, Printer, CheckCircle, XCircle, UserCheck } from "lucide-react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface PurchaseOrder {
  id: number;
  orderNo: string;
  supplierId: number;
  supplierCode: string | null;
  supplierName: string | null;
  contactPerson: string | null;
  phone: string | null;
  orderDate: string;
  expectedDate: string | null;
  totalAmount: string | null;
  currency: string | null;
  status: "draft" | "dept_review" | "gm_review" | "approved" | "issued" | "ordered" | "partial_received" | "received" | "cancelled";
  paymentStatus: string | null;
  remark: string | null;
  buyerId: number | null;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive"; color: string }> = {
  draft: { label: "草稿", variant: "outline", color: "text-gray-600" },
  dept_review: { label: "部门审核中", variant: "default", color: "text-amber-600" },
  gm_review: { label: "总经理审批中", variant: "default", color: "text-orange-600" },
  approved: { label: "已审批", variant: "secondary", color: "text-blue-600" },
  issued: { label: "已下达", variant: "secondary", color: "text-purple-600" },
  ordered: { label: "已下单", variant: "default", color: "text-purple-600" },
  partial_received: { label: "部分收货", variant: "secondary", color: "text-teal-600" },
  received: { label: "已收货", variant: "secondary", color: "text-green-600" },
  cancelled: { label: "已取消", variant: "destructive", color: "text-red-600" },
};

export default function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PurchaseOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { canDelete, isAdmin, isGM } = usePermission();

  // ===== 数据库查询 =====
  const { data: ordersData = [], isLoading, refetch } = trpc.purchaseOrders.list.useQuery(
    { search: searchTerm || undefined, status: statusFilter !== "all" ? statusFilter : undefined }
  );
  const { data: suppliersData = [] } = trpc.suppliers.list.useQuery();
  const { data: productsData = [] } = trpc.products.list.useQuery();
  const createMutation = trpc.purchaseOrders.create.useMutation({ onSuccess: () => { refetch(); toast.success("采购单已创建"); setFormDialogOpen(false); } });
  const updateMutation = trpc.purchaseOrders.update.useMutation({ onSuccess: () => { refetch(); toast.success("采购单已更新"); setFormDialogOpen(false); setViewDialogOpen(false); } });
  const deleteMutation = trpc.purchaseOrders.delete.useMutation({ onSuccess: () => { refetch(); toast.success("采购单已删除"); } });

  // 将产品数据转为 Material 接口供 MaterialMultiSelect 使用
  const materialsFromDb: Material[] = (productsData as any[]).map((p: any) => ({
    id: p.id,
    code: p.code || "",
    name: p.name || "",
    spec: p.specification || "",
    unit: p.unit || "个",
    price: 0,
    category: p.category || "",
    stock: 0,
  }));

  // 查看详情时加载明细
  const [viewItems, setViewItems] = useState<any[]>([]);
  const focusHandledRef = useRef(false);
  const getByIdQuery = trpc.purchaseOrders.getById.useQuery(
    { id: selectedRecord?.id || 0 },
    { enabled: !!selectedRecord && viewDialogOpen }
  );

  const data = ordersData as unknown as PurchaseOrder[];

  const [formData, setFormData] = useState({
    supplierId: 0,
    orderDate: "",
    expectedDate: "",
    currency: "CNY",
    status: "draft" as PurchaseOrder["status"],
    remark: "",
    materials: [] as SelectedMaterial[],
  });

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({
      supplierId: 0,
      orderDate: new Date().toISOString().split("T")[0],
      expectedDate: "",
      currency: "CNY",
      status: "draft",
      remark: "",
      materials: [],
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: PurchaseOrder) => {
    setIsEditing(true);
    setSelectedRecord(record);
    // 加载明细
    setFormData({
      supplierId: record.supplierId,
      orderDate: record.orderDate ? String(record.orderDate).split("T")[0] : "",
      expectedDate: record.expectedDate ? String(record.expectedDate).split("T")[0] : "",
      currency: record.currency || "CNY",
      status: record.status,
      remark: record.remark || "",
      materials: [],
    });
    setFormDialogOpen(true);
  };

  const handleView = (record: PurchaseOrder) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: PurchaseOrder) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  const handleSubmit = () => {
    if (!formData.supplierId || formData.materials.length === 0) {
      toast.error("请选择供应商并添加物料");
      return;
    }

    const totalAmount = formData.materials.reduce(
      (sum, m) => sum + m.quantity * m.price,
      0
    );

    const items = formData.materials.map((m: any) => ({
      materialCode: m.code,
      materialName: m.name,
      specification: m.spec,
      quantity: String(m.quantity),
      unit: m.unit,
      unitPrice: String(m.price),
      amount: String(m.quantity * m.price),
    }));

    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          supplierId: formData.supplierId,
          orderDate: formData.orderDate,
          expectedDate: formData.expectedDate || undefined,
          totalAmount: String(totalAmount),
          currency: formData.currency,
          status: formData.status,
          remark: formData.remark || undefined,
        },
      });
    } else {
      const orderNo = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      createMutation.mutate({
        orderNo,
        supplierId: formData.supplierId,
        orderDate: formData.orderDate,
        expectedDate: formData.expectedDate || undefined,
        totalAmount: String(totalAmount),
        currency: formData.currency,
        status: formData.status,
        remark: formData.remark || undefined,
        items,
      });
    }
  };

  const handleStatusChange = (record: PurchaseOrder, newStatus: PurchaseOrder["status"]) => {
    updateMutation.mutate({
      id: record.id,
      data: { status: newStatus },
    });
  };

  // 统计信息
  const stats = {
    total: data.length,
    totalAmount: data.reduce((sum: any, r: any) => sum + Number(r.totalAmount || 0), 0),
    pending: data.filter((r: any) => r.status === "draft").length,
    toReceive: data.filter((r: any) => r.status === "ordered" || r.status === "approved").length,
  };

  // 获取供应商名称
  const getSupplierName = (supplierId: number) => {
    const s = (suppliersData as any[]).find((s: any) => s.id === supplierId);
    return s?.name || "-";
  };

  // 获取详情明细
  const detailItems = getByIdQuery.data?.items || [];

  useEffect(() => {
    if (focusHandledRef.current) return;
    const raw = new URLSearchParams(window.location.search).get("focusId");
    const focusId = Number(raw);
    if (!Number.isFinite(focusId) || focusId <= 0) return;
    const record = data.find((item) => item.id === focusId);
    if (!record) return;
    focusHandledRef.current = true;
    handleView(record);
    const next = new URL(window.location.href);
    next.searchParams.delete("focusId");
    window.history.replaceState({}, "", `${next.pathname}${next.search}`);
  }, [data]);
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">采购执行</h1>
              <p className="text-sm text-muted-foreground">
                从采购申请到订单下达、收货入库的完整采购闭环
              </p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新建采购单
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">采购单总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                ¥{(stats.totalAmount / 10000).toFixed(1)}万
              </div>
              <div className="text-sm text-muted-foreground">采购金额</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">待审批</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.toReceive}</div>
              <div className="text-sm text-muted-foreground">待收货</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索采购单号、供应商..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="approved">已审批</SelectItem>
              <SelectItem value="ordered">已下单</SelectItem>
              <SelectItem value="partial_received">部分收货</SelectItem>
              <SelectItem value="received">已收货</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">采购单号</TableHead>
                <TableHead className="text-center font-bold">供应商名称</TableHead>
                <TableHead className="text-center font-bold">采购金额</TableHead>
                <TableHead className="text-center font-bold">下单日期</TableHead>
                <TableHead className="text-center font-bold">交货日期</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="text-center font-mono">{record.orderNo}</TableCell>
                  <TableCell className="text-center font-medium">{record.supplierName || getSupplierName(record.supplierId)}</TableCell>
                  <TableCell className="text-center font-medium">
                    ¥{Number(record.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">{record.orderDate ? String(record.orderDate).split("T")[0] : "-"}</TableCell>
                  <TableCell className="text-center">{record.expectedDate ? String(record.expectedDate).split("T")[0] : "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                      {statusMap[record.status]?.label || record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(record)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(record)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(record)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 新建/编辑表单对话框 */}
        <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑采购单" : "新建采购单"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 供应商信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">供应商信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>供应商 *</Label>
                    <Select
                      value={formData.supplierId ? String(formData.supplierId) : ""}
                      onValueChange={(v) => setFormData({ ...formData, supplierId: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择供应商" />
                      </SelectTrigger>
                      <SelectContent>
                        {(suppliersData as any[]).map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>货币</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                        <SelectItem value="USD">美元 (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 采购信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">采购信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>下单日期</Label>
                    <Input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>交货日期</Label>
                    <Input
                      type="date"
                      value={formData.expectedDate}
                      onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>采购状态</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as PurchaseOrder["status"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="approved">已审批</SelectItem>
                        <SelectItem value="ordered">已下单</SelectItem>
                        <SelectItem value="partial_received">部分收货</SelectItem>
                        <SelectItem value="received">已收货</SelectItem>
                        <SelectItem value="cancelled">已取消</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 物料选择 */}
              <div>
                <h3 className="text-sm font-medium mb-3">采购物料 *</h3>
                <MaterialMultiSelect
                  materials={materialsFromDb}
                  selectedMaterials={formData.materials}
                  onSelectionChange={(materials) => setFormData({ ...formData, materials })}
                  title="选择物料"
                  showPrice={true}
                  showStock={true}
                />
              </div>

              <Separator />

              {/* 备注 */}
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="输入备注信息"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>{isEditing ? "保存" : "创建"}</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {selectedRecord && (
      <div className="space-y-4">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">采购单详情</h2>
          <p className="text-sm text-muted-foreground">
            {selectedRecord.orderNo}
            {selectedRecord.status && (
              <>
                {' '}
                ·
                <Badge
                  variant={statusMap[selectedRecord.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(selectedRecord.status, statusMap[selectedRecord.status]?.label)}`}
                >
                  {statusMap[selectedRecord.status]?.label || String(selectedRecord.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div className="space-y-6 py-2">
          {/* 供应商与采购信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="供应商编码">{selectedRecord.supplierCode || "-"}</FieldRow>
                <FieldRow label="供应商名称">{selectedRecord.supplierName || getSupplierName(selectedRecord.supplierId)}</FieldRow>
                <FieldRow label="联系人">{selectedRecord.contactPerson || "-"}</FieldRow>
                <FieldRow label="联系电话">{selectedRecord.phone || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="下单日期">{selectedRecord.orderDate ? String(selectedRecord.orderDate).split("T")[0] : "-"}</FieldRow>
                <FieldRow label="交货日期">{selectedRecord.expectedDate ? String(selectedRecord.expectedDate).split("T")[0] : "-"}</FieldRow>
                <FieldRow label="货币">{selectedRecord.currency || "CNY"}</FieldRow>
                <FieldRow label="创建时间">{formatDateTime(selectedRecord.createdAt)}</FieldRow>
              </div>
            </div>
          </div>

          {/* 物料明细 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">物料明细</h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">物料编码</TableHead>
                  <TableHead className="text-center font-bold">物料名称</TableHead>
                  <TableHead className="text-center font-bold">规格</TableHead>
                  <TableHead className="text-center font-bold">单位</TableHead>
                  <TableHead className="text-center font-bold">单价</TableHead>
                  <TableHead className="text-center font-bold">数量</TableHead>
                  <TableHead className="text-center font-bold">金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-mono">{item.materialCode}</TableCell>
                    <TableCell className="text-center font-medium">{item.materialName}</TableCell>
                    <TableCell className="text-center">{item.specification || "-"}</TableCell>
                    <TableCell className="text-center">{item.unit || "-"}</TableCell>
                    <TableCell className="text-center">¥{Number(item.unitPrice || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center">{Number(item.quantity || 0)?.toLocaleString?.() ?? "0"}</TableCell>
                    <TableCell className="text-center font-medium">¥{Number(item.amount || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="text-right font-medium">采购合计：</TableCell>
                  <TableCell className="text-center font-bold text-primary text-lg">
                    ¥{Number(selectedRecord.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 备注 */}
          {selectedRecord.remark && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remark}</p>
            </div>
          )}
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap">
            {/* 左侧功能按钮 */}
            {selectedRecord.status === "draft" && (
              <>
                <Button variant="outline" className="text-amber-600 border-amber-300" size="sm" onClick={() => { handleStatusChange(selectedRecord, "dept_review"); toast.info("已提交部门审核"); }}>
                  <UserCheck className="h-4 w-4 mr-1" />提交部门审核
                </Button>
                {(isAdmin || isGM) && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { handleStatusChange(selectedRecord, "approved"); toast.success("总经理审批通过！采购订单已批准。"); }}>
                    <CheckCircle className="h-4 w-4 mr-1" />直接审批通过
                  </Button>
                )}
              </>
            )}
            {selectedRecord.status === "dept_review" && (
              <>
                <Button variant="outline" className="text-destructive" size="sm" onClick={() => handleStatusChange(selectedRecord, "draft")}>
                  <XCircle className="h-4 w-4 mr-1" />退回修改
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600" size="sm" onClick={() => { handleStatusChange(selectedRecord, "gm_review"); toast.info("部门审核通过，已提交总经理审批"); }}>
                  <CheckCircle className="h-4 w-4 mr-1" />部门审核通过
                </Button>
              </>
            )}
            {selectedRecord.status === "gm_review" && (
              <>
                <Button variant="outline" className="text-destructive" size="sm" onClick={() => handleStatusChange(selectedRecord, "dept_review")}>
                  <XCircle className="h-4 w-4 mr-1" />退回部门审核
                </Button>
                <Button size="sm" onClick={() => { handleStatusChange(selectedRecord, "approved"); toast.success("总经理审批通过！采购订单已批准，可打印下达。"); }}>
                  <CheckCircle className="h-4 w-4 mr-1" />总经理审批通过
                </Button>
              </>
            )}
            {selectedRecord.status === "approved" && (
              <Button size="sm" onClick={() => {
                window.print();
                handleStatusChange(selectedRecord, "issued");
                toast.success("采购订单已打印，状态已更新为「已下达」");
              }}>
                <Printer className="h-4 w-4 mr-1" />打印订单（下达）
              </Button>
            )}
            {(selectedRecord.status === "issued" || selectedRecord.status === "ordered") && (
              <Button size="sm" onClick={() => handleStatusChange(selectedRecord, "received")}>
                确认收货
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(selectedRecord); }}>编辑</Button>
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
