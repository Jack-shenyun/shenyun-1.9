import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
import {
  ArrowRightLeft, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  in_process:           { label: "工序中",     variant: "default" },
  pending_sterilization:{ label: "待委外灭菌", variant: "outline" },
  sterilizing:          { label: "灭菌中",     variant: "default" },
  completed:            { label: "已完成",     variant: "secondary" },
};

export default function ProductionRoutingCardPage() {
  const { canDelete } = usePermission();
  const { data: cards = [], isLoading, refetch } = trpc.productionRoutingCards.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});

  const createMutation = trpc.productionRoutingCards.create.useMutation({
    onSuccess: () => { refetch(); toast.success("流转单已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.productionRoutingCards.update.useMutation({
    onSuccess: () => { refetch(); toast.success("流转单已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.productionRoutingCards.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("流转单已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [viewingCard, setViewingCard] = useState<any>(null);

  const [formData, setFormData] = useState({
    cardNo: "",
    productionOrderId: "",
    productionOrderNo: "",
    productId: "",
    productName: "",
    batchNo: "",
    quantity: "",
    unit: "件",
    currentProcess: "",
    nextProcess: "",
    needsSterilization: false,
    status: "in_process" as "in_process" | "pending_sterilization" | "sterilizing" | "completed",
    remark: "",
  });

  const filteredCards = (cards as any[]).filter((c) => {
    const matchSearch = !searchTerm ||
      String(c.cardNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const genNo = () => {
    const now = new Date();
    return `RC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
  };

  const handleAdd = () => {
    setEditingCard(null);
    setFormData({
      cardNo: genNo(),
      productionOrderId: "",
      productionOrderNo: "",
      productId: "",
      productName: "",
      batchNo: "",
      quantity: "",
      unit: "件",
      currentProcess: "",
      nextProcess: "",
      needsSterilization: false,
      status: "in_process",
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setFormData({
      cardNo: card.cardNo,
      productionOrderId: card.productionOrderId ? String(card.productionOrderId) : "",
      productionOrderNo: card.productionOrderNo || "",
      productId: card.productId ? String(card.productId) : "",
      productName: card.productName || "",
      batchNo: card.batchNo || "",
      quantity: card.quantity || "",
      unit: card.unit || "件",
      currentProcess: card.currentProcess || "",
      nextProcess: card.nextProcess || "",
      needsSterilization: card.needsSterilization || false,
      status: card.status || "in_process",
      remark: card.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (card: any) => {
    setViewingCard(card);
    setViewDialogOpen(true);
  };

  const handleDelete = (card: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: card.id });
  };

  const handleProductionOrderChange = (poId: string) => {
    const po = (productionOrders as any[]).find((p) => String(p.id) === poId);
    setFormData((f) => ({
      ...f,
      productionOrderId: poId,
      productionOrderNo: po?.orderNo || "",
      productId: po?.productId ? String(po.productId) : f.productId,
      batchNo: po?.batchNo || f.batchNo,
      quantity: po?.plannedQty || f.quantity,
    }));
  };

  const handleProductChange = (productId: string) => {
    const product = (products as any[]).find((p) => String(p.id) === productId);
    setFormData((f) => ({ ...f, productId, productName: product?.name || "" }));
  };

  const handleSubmit = () => {
    if (!formData.cardNo) {
      toast.error("请填写流转单号");
      return;
    }
    const payload = {
      cardNo: formData.cardNo,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      productId: formData.productId ? Number(formData.productId) : undefined,
      productName: formData.productName || undefined,
      batchNo: formData.batchNo || undefined,
      quantity: formData.quantity || undefined,
      unit: formData.unit || undefined,
      currentProcess: formData.currentProcess || undefined,
      nextProcess: formData.nextProcess || undefined,
      needsSterilization: formData.needsSterilization,
      status: formData.status,
      remark: formData.remark || undefined,
    };
    if (editingCard) {
      updateMutation.mutate({
        id: editingCard.id,
        data: {
          currentProcess: payload.currentProcess,
          nextProcess: payload.nextProcess,
          needsSterilization: payload.needsSterilization,
          status: payload.status,
          remark: payload.remark,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const inProcessCount = (cards as any[]).filter((c) => c.status === "in_process").length;
  const pendingSterilizationCount = (cards as any[]).filter((c) => c.status === "pending_sterilization").length;
  const completedCount = (cards as any[]).filter((c) => c.status === "completed").length;
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
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">生产流转单</h2>
              <p className="text-sm text-muted-foreground">跟踪产品在各工序间的流转状态，标准医疗器械需委外灭菌后方可入库</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />新建流转单</Button>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">工序中</p><p className="text-2xl font-bold text-blue-600">{inProcessCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待委外灭菌</p><p className="text-2xl font-bold text-amber-600">{pendingSterilizationCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已完成</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索流转单号、产品名称、批号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="in_process">工序中</SelectItem>
                  <SelectItem value="pending_sterilization">待委外灭菌</SelectItem>
                  <SelectItem value="sterilizing">灭菌中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
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
                  <TableHead className="text-center font-bold">流转单号</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">批号</TableHead>
                  <TableHead className="text-center font-bold">数量</TableHead>
                  <TableHead className="text-center font-bold">当前工序</TableHead>
                  <TableHead className="text-center font-bold">下一工序</TableHead>
                  <TableHead className="text-center font-bold">需委外灭菌</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredCards.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无流转单</TableCell></TableRow>
                ) : filteredCards.map((card: any) => (
                  <TableRow key={card.id}>
                    <TableCell className="text-center font-medium">{card.cardNo}</TableCell>
                    <TableCell className="text-center">{card.productName || "-"}</TableCell>
                    <TableCell className="text-center">{card.batchNo || "-"}</TableCell>
                    <TableCell className="text-center">{card.quantity} {card.unit}</TableCell>
                    <TableCell className="text-center">{card.currentProcess || "-"}</TableCell>
                    <TableCell className="text-center">{card.nextProcess || "-"}</TableCell>
                    <TableCell className="text-center">
                      {card.needsSterilization ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">需灭菌</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">否</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[card.status]?.variant || "outline"} className={getStatusSemanticClass(card.status, statusMap[card.status]?.label)}>
                        {statusMap[card.status]?.label || card.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(card)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(card)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                          {card.status === "in_process" && card.needsSterilization && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: card.id, data: { status: "pending_sterilization" } })}>
                              <ArrowRight className="h-4 w-4 mr-2" />流转至委外灭菌
                            </DropdownMenuItem>
                          )}
                          {card.status === "in_process" && !card.needsSterilization && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: card.id, data: { status: "completed" } })}>
                              <ArrowRight className="h-4 w-4 mr-2" />标记完成
                            </DropdownMenuItem>
                          )}
                          {card.status === "sterilizing" && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: card.id, data: { status: "completed" } })}>
                              <ArrowRight className="h-4 w-4 mr-2" />灭菌完成
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDelete(card)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCard ? "编辑流转单" : "新建生产流转单"}</DialogTitle>
              <DialogDescription>跟踪产品在工序间的流转，标准医疗器械需标记委外灭菌</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>流转单号 *</Label>
                  <Input value={formData.cardNo} onChange={(e) => setFormData({ ...formData, cardNo: e.target.value })} readOnly={!!editingCard} />
                </div>
                <div className="space-y-2">
                  <Label>关联生产任务</Label>
                  <Select
                    value={formData.productionOrderId || "__NONE__"}
                    onValueChange={(v) => handleProductionOrderChange(v === "__NONE__" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="选择生产任务" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">不关联</SelectItem>
                      {(productionOrders as any[]).map((po: any) => (
                        <SelectItem key={po.id} value={String(po.id)}>{po.orderNo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品</Label>
                  <Select value={formData.productId} onValueChange={handleProductChange}>
                    <SelectTrigger><SelectValue placeholder="选择产品" /></SelectTrigger>
                    <SelectContent>
                      {(products as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>批号</Label>
                  <Input value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} placeholder="生产批号" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>数量</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>当前工序</Label>
                  <Input value={formData.currentProcess} onChange={(e) => setFormData({ ...formData, currentProcess: e.target.value })} placeholder="如：装配、检验" />
                </div>
                <div className="space-y-2">
                  <Label>下一工序</Label>
                  <Input value={formData.nextProcess} onChange={(e) => setFormData({ ...formData, nextProcess: e.target.value })} placeholder="如：灭菌、包装、入库" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-amber-50">
                <input
                  type="checkbox"
                  id="needsSterilization"
                  checked={formData.needsSterilization}
                  onChange={(e) => setFormData({ ...formData, needsSterilization: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="needsSterilization" className="cursor-pointer">
                  <span className="font-medium">需要委外灭菌</span>
                  <span className="text-sm text-muted-foreground ml-2">（标准医疗器械勾选此项，流转完成后将进入委外灭菌流程）</span>
                </Label>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_process">工序中</SelectItem>
                    <SelectItem value="pending_sterilization">待委外灭菌</SelectItem>
                    <SelectItem value="sterilizing">灭菌中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCard ? "保存修改" : "创建流转单"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情 */}
{viewingCard && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent>
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">生产流转单详情</h2>
        <p className="text-sm text-muted-foreground">
          {viewingCard.cardNo}
          {viewingCard.status && (
            <> · <Badge variant={statusMap[viewingCard.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingCard.status, statusMap[viewingCard.status]?.label)}`}>
              {statusMap[viewingCard.status]?.label || String(viewingCard.status ?? "-")}
            </Badge></>
          )}
        </p>
      </div>

      <div className="py-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品名称">{viewingCard.productName || "-"}</FieldRow>
              <FieldRow label="批号">{viewingCard.batchNo || "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="数量">{viewingCard.quantity} {viewingCard.unit}</FieldRow>
              <FieldRow label="关联生产任务">{viewingCard.productionOrderNo || "-"}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">工序流转</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="当前工序">{viewingCard.currentProcess || "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="下一工序">{viewingCard.nextProcess || "-"}</FieldRow>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
             <div>
               <FieldRow label="需委外灭菌">{viewingCard.needsSterilization ? "是" : "否"}</FieldRow>
            </div>
            <div></div>
          </div>
        </div>

        {viewingCard.remark && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingCard.remark}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap"></div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(viewingCard); }}>编辑</Button>
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
