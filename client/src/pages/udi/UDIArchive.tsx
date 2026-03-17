import { formatDate, formatDateTime } from "@/lib/formatters";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QrCode, Plus, Search, Eye, Trash2, MoreHorizontal, Pencil, FileText } from "lucide-react";
import { toast } from "sonner";

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1.5 border-b border-dashed border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{children ?? "-"}</span>
    </div>
  );
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:  { label: "待打印", variant: "secondary" },
  printing: { label: "打印中", variant: "default" },
  printed:  { label: "已打印", variant: "outline" },
  used:     { label: "已使用", variant: "outline" },
  recalled: { label: "已召回", variant: "destructive" },
};

const CARRIER_MAP: Record<string, string> = {
  datamatrix: "DataMatrix",
  gs1_128:    "GS1-128",
  qr_code:    "QR Code",
  rfid:       "RFID",
};

const TEMPLATE_MAP: Record<string, string> = {
  single:  "单标",
  double:  "双标",
  box:     "箱标",
  pallet:  "托盘标",
};

const emptyForm = {
  productId: "" as string | number,
  productName: "",
  productCode: "",
  specification: "",
  registrationNo: "",
  riskLevel: "II" as "I" | "II" | "III",
  udiDi: "",
  issuer: "GS1" as "GS1" | "HIBC" | "ICCBBA" | "OTHER",
  batchNo: "",
  serialNo: "",
  productionDate: "",
  expiryDate: "",
  carrierType: "datamatrix" as "datamatrix" | "gs1_128" | "qr_code" | "rfid",
  labelTemplate: "single" as "single" | "double" | "box" | "pallet",
  printQty: 1,
  remark: "",
};

export default function UDIArchivePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const utils = trpc.useUtils();

  const { data: udiList = [], isLoading } = trpc.udi.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: stats } = trpc.udi.stats.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 500 });
  const products = (productsData as any)?.items ?? (productsData as any) ?? [];

  const createMutation = trpc.udi.create.useMutation({
    onSuccess: () => {
      toast.success("UDI档案创建成功");
      utils.udi.list.invalidate();
      utils.udi.stats.invalidate();
      setFormOpen(false);
      setForm({ ...emptyForm });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.udi.update.useMutation({
    onSuccess: () => {
      toast.success("UDI档案更新成功");
      utils.udi.list.invalidate();
      setFormOpen(false);
      setEditId(null);
      setForm({ ...emptyForm });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.udi.delete.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      utils.udi.list.invalidate();
      utils.udi.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleProductSelect(productId: string) {
    const p = products.find((x: any) => String(x.id) === productId);
    if (p) {
      setForm(f => ({
        ...f,
        productId: p.id,
        productName: p.name ?? p.productName ?? "",
        productCode: p.code ?? p.productCode ?? "",
        specification: p.specification ?? "",
        registrationNo: p.registrationNo ?? "",
        udiDi: (p as any).udiDi ?? f.udiDi,
      }));
    }
  }

  function handleSubmit() {
    if (!form.udiDi.trim()) {
      toast.error("UDI-DI不能为空");
      return;
    }
    const payload = {
      ...form,
      productId: form.productId ? Number(form.productId) : undefined,
      printQty: Number(form.printQty),
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function openEdit(item: any) {
    setEditId(item.id);
    setForm({
      productId: item.productId ?? "",
      productName: item.productName ?? "",
      productCode: item.productCode ?? "",
      specification: item.specification ?? "",
      registrationNo: item.registrationNo ?? "",
      riskLevel: item.riskLevel ?? "II",
      udiDi: item.udiDi ?? "",
      issuer: item.issuer ?? "GS1",
      batchNo: item.batchNo ?? "",
      serialNo: item.serialNo ?? "",
      productionDate: item.productionDate ?? "",
      expiryDate: item.expiryDate ?? "",
      carrierType: item.carrierType ?? "datamatrix",
      labelTemplate: item.labelTemplate ?? "single",
      printQty: item.printQty ?? 1,
      remark: item.remark ?? "",
    });
    setFormOpen(true);
  }

  const statsData = stats as any ?? {};

  return (
    <ERPLayout>
      <div className="p-6 space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="w-6 h-6" /> UDI档案管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理产品UDI-DI标识，符合NMPA唯一标识系统规则
            </p>
          </div>
          <Button onClick={() => { setEditId(null); setForm({ ...emptyForm }); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> 新建UDI档案
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "档案总数", value: statsData.total ?? (udiList as any[]).length, color: "text-foreground" },
            { label: "待打印", value: statsData.pending ?? 0, color: "text-yellow-600" },
            { label: "打印中", value: statsData.printing ?? 0, color: "text-blue-600" },
            { label: "已打印", value: statsData.printed ?? 0, color: "text-green-600" },
            { label: "已召回", value: statsData.recalled ?? 0, color: "text-red-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 搜索过滤 */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索标签编号、产品名称、UDI-DI、批号..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待打印</SelectItem>
              <SelectItem value="printing">打印中</SelectItem>
              <SelectItem value="printed">已打印</SelectItem>
              <SelectItem value="used">已使用</SelectItem>
              <SelectItem value="recalled">已召回</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标签编号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>UDI-DI</TableHead>
                  <TableHead>批号</TableHead>
                  <TableHead>生产日期</TableHead>
                  <TableHead>有效期</TableHead>
                  <TableHead>载体类型</TableHead>
                  <TableHead>风险等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : (udiList as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无UDI档案数据，点击右上角新建</TableCell></TableRow>
                ) : (udiList as any[]).map((item: any) => {
                  const st = STATUS_MAP[item.status] ?? { label: item.status, variant: "secondary" as const };
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.labelNo}</TableCell>
                      <TableCell>{item.productName ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.udiDi}</TableCell>
                      <TableCell>{item.batchNo ?? "-"}</TableCell>
                      <TableCell>{item.productionDate ?? "-"}</TableCell>
                      <TableCell>{item.expiryDate ?? "-"}</TableCell>
                      <TableCell>{CARRIER_MAP[item.carrierType] ?? item.carrierType}</TableCell>
                      <TableCell>
                        {item.riskLevel ? (
                          <Badge variant={item.riskLevel === "III" ? "destructive" : item.riskLevel === "II" ? "default" : "secondary"}>
                            {item.riskLevel}类
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedItem(item); setViewOpen(true); }}>
                              <Eye className="w-4 h-4 mr-2" /> 查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              <Pencil className="w-4 h-4 mr-2" /> 编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("确认删除该UDI档案？")) {
                                  deleteMutation.mutate({ id: item.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> 删除
                            </DropdownMenuItem>
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

      {/* 新建/编辑弹窗 */}
      <DraggableDialog open={formOpen} onOpenChange={setFormOpen}>
        <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "编辑UDI档案" : "新建UDI档案"}</DialogTitle>
          </DialogHeader>
            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* 关联产品 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>关联产品（选择后自动填充）</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                      onClick={() => setProductPickerOpen(true)}
                    >
                      {form.productId ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs text-muted-foreground">{form.productCode || "-"}</span>
                          <span className="font-medium">{form.productName || "已选择产品"}</span>
                          {form.specification ? <span className="text-muted-foreground text-xs">· {form.specification}</span> : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择产品...</span>
                      )}
                    </Button>
                    {form.productId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setForm((f) => ({
                          ...f,
                          productId: "",
                          productName: "",
                          productCode: "",
                          specification: "",
                          registrationNo: "",
                        }))}
                      >
                        清空
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>产品名称</Label>
                  <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="产品名称" />
                </div>
                <div className="space-y-2">
                  <Label>产品编码</Label>
                  <Input value={form.productCode} onChange={e => setForm(f => ({ ...f, productCode: e.target.value }))} placeholder="产品编码" />
                </div>
                <div className="space-y-2">
                  <Label>规格型号</Label>
                  <Input value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))} placeholder="规格型号" />
                </div>
                <div className="space-y-2">
                  <Label>注册证号</Label>
                  <Input value={form.registrationNo} onChange={e => setForm(f => ({ ...f, registrationNo: e.target.value }))} placeholder="注册证号" />
                </div>
              </div>

              {/* UDI信息 */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">UDI 标识信息</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>UDI-DI <span className="text-destructive">*</span></Label>
                    <Input value={form.udiDi} onChange={e => setForm(f => ({ ...f, udiDi: e.target.value }))} placeholder="由发码机构分配的设备标识符" />
                  </div>
                  <div className="space-y-2">
                    <Label>发码机构</Label>
                    <Select value={form.issuer} onValueChange={(v: any) => setForm(f => ({ ...f, issuer: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GS1">GS1（中国物品编码中心）</SelectItem>
                        <SelectItem value="HIBC">HIBC</SelectItem>
                        <SelectItem value="ICCBBA">ICCBBA</SelectItem>
                        <SelectItem value="OTHER">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>风险等级</Label>
                    <Select value={form.riskLevel} onValueChange={(v: any) => setForm(f => ({ ...f, riskLevel: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="I">I类（低风险）</SelectItem>
                        <SelectItem value="II">II类（中风险）</SelectItem>
                        <SelectItem value="III">III类（高风险）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* UDI-PI */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">UDI-PI 生产标识</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>批号 (LOT)</Label>
                    <Input value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))} placeholder="生产批号" />
                  </div>
                  <div className="space-y-2">
                    <Label>序列号 (SN)</Label>
                    <Input value={form.serialNo} onChange={e => setForm(f => ({ ...f, serialNo: e.target.value }))} placeholder="序列号（III类必填）" />
                  </div>
                  <div className="space-y-2">
                    <Label>生产日期 (MFG)</Label>
                    <Input type="date" value={form.productionDate} onChange={e => setForm(f => ({ ...f, productionDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>有效期 (EXP)</Label>
                    <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* 标签配置 */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">标签配置</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>数据载体</Label>
                    <Select value={form.carrierType} onValueChange={(v: any) => setForm(f => ({ ...f, carrierType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="datamatrix">DataMatrix（推荐）</SelectItem>
                        <SelectItem value="gs1_128">GS1-128 条形码</SelectItem>
                        <SelectItem value="qr_code">QR Code</SelectItem>
                        <SelectItem value="rfid">RFID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>标签类型</Label>
                    <Select value={form.labelTemplate} onValueChange={(v: any) => setForm(f => ({ ...f, labelTemplate: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">单标</SelectItem>
                        <SelectItem value="double">双标</SelectItem>
                        <SelectItem value="box">箱标</SelectItem>
                        <SelectItem value="pallet">托盘标</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>打印数量</Label>
                    <Input type="number" min={1} value={form.printQty} onChange={e => setForm(f => ({ ...f, printQty: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={2} placeholder="备注信息" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editId ? "保存修改" : "创建档案"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          title="选择产品"
          searchPlaceholder="搜索产品编码、名称、规格..."
          columns={[
            { key: "code", title: "产品编码", className: "w-[160px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.code ?? row.productCode ?? "-"}</span> },
            { key: "name", title: "产品名称", className: "min-w-[180px]", render: (row) => <span className="font-medium">{row.name ?? row.productName ?? "-"}</span> },
            { key: "specification", title: "规格型号", className: "min-w-[160px]", render: (row) => row.specification || "-" },
            { key: "registrationNo", title: "注册证号", className: "min-w-[180px]", render: (row) => row.registrationNo || "-" },
            { key: "riskLevel", title: "风险等级", className: "w-[100px]", render: (row) => row.riskLevel ? `${row.riskLevel}类` : "-" },
          ]}
          rows={products as any[]}
          selectedId={form.productId ? String(form.productId) : ""}
          defaultWidth={980}
          filterFn={(row, query) => {
            const lower = query.toLowerCase();
            return String(row.code ?? row.productCode ?? "").toLowerCase().includes(lower) ||
              String(row.name ?? row.productName ?? "").toLowerCase().includes(lower) ||
              String(row.specification ?? "").toLowerCase().includes(lower) ||
              String(row.registrationNo ?? "").toLowerCase().includes(lower);
          }}
          onSelect={(row) => {
            handleProductSelect(String(row.id));
            setProductPickerOpen(false);
          }}
        />

        {/* 详情弹窗 */}
        <DraggableDialog open={viewOpen} onOpenChange={setViewOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            {selectedItem && (
              <div className="space-y-4 py-4">
                <div className="border-b pb-3">
                  <h2 className="text-lg font-semibold">UDI档案详情</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm text-muted-foreground">{selectedItem.labelNo}</span>
                    <Badge variant={(STATUS_MAP[selectedItem.status] ?? STATUS_MAP.pending).variant}>
                      {(STATUS_MAP[selectedItem.status] ?? STATUS_MAP.pending).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">基本信息</h3>
                  <FieldRow label="标签编号">{selectedItem.labelNo}</FieldRow>
                  <FieldRow label="产品名称">{selectedItem.productName}</FieldRow>
                  <FieldRow label="产品编码">{selectedItem.productCode}</FieldRow>
                  <FieldRow label="规格型号">{selectedItem.specification}</FieldRow>
                  <FieldRow label="注册证号">{selectedItem.registrationNo}</FieldRow>
                  <FieldRow label="风险等级">{selectedItem.riskLevel ? `${selectedItem.riskLevel}类` : "-"}</FieldRow>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">UDI标识</h3>
                  <FieldRow label="UDI-DI"><span className="font-mono text-xs">{selectedItem.udiDi}</span></FieldRow>
                  <FieldRow label="发码机构">{selectedItem.issuer}</FieldRow>
                  <FieldRow label="批号 (LOT)">{selectedItem.batchNo}</FieldRow>
                  <FieldRow label="序列号 (SN)">{selectedItem.serialNo}</FieldRow>
                  <FieldRow label="生产日期">{formatDate(selectedItem.productionDate)}</FieldRow>
                  <FieldRow label="有效期">{formatDate(selectedItem.expiryDate)}</FieldRow>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">标签配置</h3>
                  <FieldRow label="数据载体">{CARRIER_MAP[selectedItem.carrierType] ?? selectedItem.carrierType}</FieldRow>
                  <FieldRow label="标签类型">{TEMPLATE_MAP[selectedItem.labelTemplate] ?? selectedItem.labelTemplate}</FieldRow>
                  <FieldRow label="打印数量">{selectedItem.printQty}</FieldRow>
                  <FieldRow label="已打印数量">{selectedItem.printedQty ?? 0}</FieldRow>
                  <FieldRow label="打印时间">{selectedItem.printDate ? formatDateTime(selectedItem.printDate) : "-"}</FieldRow>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">NMPA上报</h3>
                  <FieldRow label="上报状态">
                    <Badge variant={selectedItem.nmpaSubmitted ? "default" : "secondary"}>
                      {selectedItem.nmpaSubmitted ? "已上报" : "未上报"}
                    </Badge>
                  </FieldRow>
                  <FieldRow label="上报时间">{selectedItem.nmpaSubmitDate ? formatDateTime(selectedItem.nmpaSubmitDate) : "-"}</FieldRow>
                </div>
                {selectedItem.remark && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">备注</h3>
                    <p className="text-sm">{selectedItem.remark}</p>
                  </div>
                )}
                <div className="flex justify-end pt-3 border-t gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewOpen(false)}>关闭</Button>
                  <Button size="sm" onClick={() => { setViewOpen(false); openEdit(selectedItem); }}>
                    <Pencil className="w-4 h-4 mr-2" /> 编辑
                  </Button>
                </div>
              </div>
            )}
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
