import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Printer, Plus, Search, Eye, CheckCircle, MoreHorizontal, QrCode, Barcode,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

interface PrintTask {
  id: number;
  taskNo: string;
  productName: string;
  batchNo: string;
  udiDi: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  printedQty: number;
  status: "pending" | "printing" | "completed";
  createdAt: string;
}

const MOCK_TASKS: PrintTask[] = [
  { id: 1, taskNo: "PT-2024-001", productName: "一次性使用无菌注射器", batchNo: "20240301", udiDi: "06901234567890", mfgDate: "2024-03-01", expDate: "2026-03-01", quantity: 1000, printedQty: 1000, status: "completed", createdAt: "2024-03-01" },
  { id: 2, taskNo: "PT-2024-002", productName: "一次性使用输液器", batchNo: "20240315", udiDi: "06901234567891", mfgDate: "2024-03-15", expDate: "2026-03-15", quantity: 500, printedQty: 0, status: "pending", createdAt: "2024-03-15" },
];

const statusMap = {
  pending:   { label: "待打印", color: "text-orange-600 border-orange-300" },
  printing:  { label: "打印中", color: "text-blue-600 border-blue-300" },
  completed: { label: "已完成", color: "text-green-600 border-green-200 bg-green-50" },
};

function LabelPreview({ task }: { task: PrintTask }) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrcodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, task.udiDi, {
          format: "CODE128", displayValue: true,
          width: 1.5, height: 40, margin: 2, fontSize: 9,
        });
      } catch {}
    }
    if (qrcodeRef.current) {
      QRCode.toCanvas(qrcodeRef.current, task.udiDi, { width: 64, margin: 1 }).catch(() => {});
    }
  }, [task]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm" style={{ width: 300, fontFamily: "monospace" }}>
      <div className="text-sm font-bold mb-0.5">{task.productName}</div>
      <div className="text-xs text-gray-500 mb-2">批号：{task.batchNo}</div>
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <svg ref={barcodeRef} style={{ width: "100%", height: 56 }} />
        </div>
        <canvas ref={qrcodeRef} style={{ width: 64, height: 64 }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>生产：{task.mfgDate}</span>
        <span>有效：{task.expDate}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1 text-center">UDI: {task.udiDi}</div>
    </div>
  );
}

export default function LabelPrintPage() {
  const [, navigate] = useLocation();
  const [tasks, setTasks] = useState<PrintTask[]>(MOCK_TASKS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<PrintTask | null>(null);
  const [form, setForm] = useState({
    productName: "", batchNo: "", udiDi: "",
    mfgDate: "", expDate: "", quantity: "100",
  });

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.productName.includes(search) || t.batchNo.includes(search) || t.taskNo.includes(search);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = tasks.length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const completed = tasks.filter(t => t.status === "completed").length;

  function handleCreate() {
    if (!form.productName || !form.udiDi) return toast.error("请填写产品名称和UDI-DI");
    const newTask: PrintTask = {
      id: Date.now(), taskNo: `PT-${new Date().getFullYear()}-${String(tasks.length + 1).padStart(3, "0")}`,
      productName: form.productName, batchNo: form.batchNo, udiDi: form.udiDi,
      mfgDate: form.mfgDate, expDate: form.expDate,
      quantity: +form.quantity || 100, printedQty: 0, status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTasks(prev => [newTask, ...prev]);
    toast.success("打印任务已创建");
    setFormOpen(false);
  }

  function handlePrint(task: PrintTask) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "printing" as const } : t));
    toast.info("正在打印...");
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "completed" as const, printedQty: t.quantity } : t));
      toast.success("打印完成！");
    }, 1500);
  }

  return (
    <ERPLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Printer className="w-6 h-6" /> 标签打印管理
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">管理UDI标签打印任务，支持条形码和二维码预览</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/production/udi/designer")} className="gap-1.5">
              <QrCode className="w-4 h-4" /> 标签设计器
            </Button>
            <Button onClick={() => setFormOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> 新建打印任务
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Printer className="w-8 h-8 text-blue-500" />
            <div><div className="text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">打印任务总数</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Printer className="w-8 h-8 text-orange-400" />
            <div><div className="text-2xl font-bold text-orange-500">{pending}</div><div className="text-xs text-muted-foreground">待打印</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div><div className="text-2xl font-bold text-green-600">{completed}</div><div className="text-xs text-muted-foreground">已完成</div></div>
          </CardContent></Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索任务编号、产品名称、批号..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待打印</SelectItem>
              <SelectItem value="printing">打印中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务编号</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>生产批号</TableHead>
                <TableHead>UDI-DI</TableHead>
                <TableHead>打印数量</TableHead>
                <TableHead>已打印</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无打印任务</TableCell></TableRow>
              ) : filtered.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{t.taskNo}</TableCell>
                  <TableCell>{t.productName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.batchNo}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.udiDi}</TableCell>
                  <TableCell>{t.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={t.printedQty === t.quantity ? "text-green-600 font-medium" : "text-orange-500"}>
                      {t.printedQty.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusMap[t.status].color}`}>
                      {statusMap[t.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(t); setPreviewOpen(true); }}>
                          <Eye className="w-4 h-4 mr-2" />预览标签
                        </DropdownMenuItem>
                        {t.status !== "completed" && (
                          <DropdownMenuItem onClick={() => handlePrint(t)} className="text-blue-600">
                            <Printer className="w-4 h-4 mr-2" />开始打印
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 新建弹窗 */}
      <DraggableDialog open={formOpen} onOpenChange={setFormOpen}>
        <DraggableDialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建打印任务</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>产品名称 <span className="text-red-500">*</span></Label>
                <Input value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} placeholder="产品名称" />
              </div>
              <div className="space-y-1.5">
                <Label>UDI-DI <span className="text-red-500">*</span></Label>
                <Input value={form.udiDi} onChange={e => setForm(p => ({ ...p, udiDi: e.target.value }))} placeholder="UDI-DI编码" />
              </div>
              <div className="space-y-1.5">
                <Label>生产批号</Label>
                <Input value={form.batchNo} onChange={e => setForm(p => ({ ...p, batchNo: e.target.value }))} placeholder="批号" />
              </div>
              <div className="space-y-1.5">
                <Label>生产日期</Label>
                <Input type="date" value={form.mfgDate} onChange={e => setForm(p => ({ ...p, mfgDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>有效期至</Label>
                <Input type="date" value={form.expDate} onChange={e => setForm(p => ({ ...p, expDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>打印数量</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="100" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={handleCreate}>创建任务</Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 预览弹窗 */}
      <DraggableDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DraggableDialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>标签预览</DialogTitle></DialogHeader>
          {selected && (
            <div className="flex flex-col items-center gap-4 py-2">
              <LabelPreview task={selected} />
              <div className="text-xs text-muted-foreground text-center">
                包含 GS1-128 条形码 + DataMatrix 二维码
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>关闭</Button>
            {selected && selected.status !== "completed" && (
              <Button onClick={() => { if (selected) { handlePrint(selected); setPreviewOpen(false); } }}>
                <Printer className="w-4 h-4 mr-1.5" /> 开始打印
              </Button>
            )}
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
