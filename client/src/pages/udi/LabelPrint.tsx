import { useState, useRef, useEffect, useMemo, type CSSProperties } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Printer, Search, Eye, CheckCircle, MoreHorizontal, QrCode,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import bwipjs from "bwip-js";
import { loadProductionProcessTemplates } from "@/pages/production/Process";
import { renderMedicalSymbol } from "@/components/udi/MedicalSymbols";
import { openPrintPreviewWindow } from "@/lib/printPreview";
import { formatDisplayNumber } from "@/lib/formatters";

interface PrintTask {
  id: string;
  productId?: number | null;
  taskNo: string;
  productName: string;
  specification: string;
  productCode: string;
  registrationNo: string;
  riskLevel: string;
  manufacturer: string;
  unit: string;
  batchNo: string;
  udiDi: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  printedQty: number;
  status: "pending" | "printing" | "completed";
  createdAt: string;
}

type ElementType = "text" | "barcode" | "qrcode" | "line" | "rect" | "symbol" | "image";

interface LabelElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fieldBinding?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  barcodeFormat?: string;
  showText?: boolean;
  symbolId?: string;
  rotation?: number;
  opacity?: number;
  lineHeight?: number;
  fontFamily?: string;
  textDecoration?: "none" | "underline";
  letterSpacing?: number;
  imageSrc?: string;
  objectFit?: "contain" | "cover" | "fill";
}

interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: "mm" | "px";
  elements: LabelElement[];
  regulation?: "NMPA" | "FDA" | "MDR";
  bindingProductId?: number;
  bindingProductName?: string;
  bindingSpecification?: string;
  updatedAt?: string;
}

type LabelTemplateData = Record<string, string>;

const statusMap = {
  pending:   { label: "待打印", color: "text-orange-600 border-orange-300" },
  printing:  { label: "打印中", color: "text-blue-600 border-blue-300" },
  completed: { label: "已完成", color: "text-green-600 border-green-200 bg-green-50" },
};

function formatDateText(value: unknown) {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") ? text.slice(0, 10) : text.slice(0, 10);
}

function addMonths(dateText: string, months: number) {
  if (!dateText || !Number.isFinite(months) || months <= 0) return "";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function normalizeApplicableProduct(value: string) {
  return String(value || "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/【[^】]*】/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberValue(value: unknown) {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
}

function buildRecordTime(recordDate?: unknown, recordTime?: unknown) {
  return new Date(
    `${String(recordDate || "1970-01-01").slice(0, 10)}T${String(recordTime || "00:00") || "00:00"}`
  ).getTime();
}

const MM_TO_PX = 3.78;

function mmToPx(mm: number) {
  return Math.round(mm * MM_TO_PX);
}

function normalizeProductName(value: unknown) {
  return String(value || "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeSpecification(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[xX]/g, "×")
    .toLowerCase();
}

function loadSavedLabelTemplates() {
  try {
    const raw = localStorage.getItem("udi-label-templates-v2");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as LabelTemplate[] : [];
  } catch {
    return [];
  }
}

function pickMatchedTemplate(templates: LabelTemplate[], task: PrintTask) {
  const taskName = normalizeProductName(task.productName);
  const taskSpec = normalizeSpecification(task.specification);
  return templates
    .map((template) => {
      let score = 0;
      if (template.bindingProductId && task.productId && Number(template.bindingProductId) === Number(task.productId)) {
        score += 100;
      }
      if (template.bindingProductName && normalizeProductName(template.bindingProductName) === taskName) {
        score += 40;
      }
      if (template.bindingSpecification && normalizeSpecification(template.bindingSpecification) === taskSpec) {
        score += 30;
      }
      if (!score) {
        const templateName = normalizeProductName(template.name);
        if (taskName && templateName.includes(taskName)) score += 10;
      }
      return { template, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.template.updatedAt || 0).getTime() - new Date(a.template.updatedAt || 0).getTime();
    })[0]?.template || null;
}

function buildLabelTemplateData(task: PrintTask, companyInfo?: any): LabelTemplateData {
  const companyNameCn = String(companyInfo?.companyNameCn || task.manufacturer || "苏州神运医疗器械有限公司");
  const companyNameEn = String(companyInfo?.companyNameEn || companyNameCn);
  return {
    productName: task.productName || "",
    productNameEn: task.productName || "",
    specification: task.specification || "",
    productCode: task.productCode || "",
    category: "",
    riskLevel: task.riskLevel || "",
    unit: task.unit || "",
    registrationNo: task.registrationNo || "",
    udiDi: task.udiDi || "",
    basicUdiDi: task.udiDi || "",
    srn: "",
    gtin: task.udiDi || "",
    batchNo: task.batchNo || "",
    mfgDate: task.mfgDate || "",
    expDate: task.expDate || "",
    serialNo: "",
    quantity: `${task.quantity}${task.unit ? ` ${task.unit}` : ""}`,
    manufacturer: task.manufacturer || companyNameCn,
    manufacturerEn: companyNameEn,
    address: String(companyInfo?.addressCn || companyInfo?.addressEn || ""),
    addressEn: String(companyInfo?.addressEn || companyInfo?.addressCn || ""),
    ecRepName: "",
    ecRepAddress: "",
    website: String(companyInfo?.website || ""),
    email: String(companyInfo?.email || ""),
    phone: String(companyInfo?.phone || ""),
  };
}

function DefaultLabelPreview({ task }: { task: PrintTask }) {
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const qrcodeRef = useRef<HTMLCanvasElement>(null);
  const codeValue = task.udiDi || task.batchNo || task.taskNo;

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        bwipjs.toCanvas(barcodeRef.current, {
          bcid: "code128",
          text: codeValue || "0000000000",
          scale: 2,
          height: 12,
          includetext: true,
          textxalign: "center",
          textsize: 9,
        });
      } catch {}
    }
    if (qrcodeRef.current) {
      try {
        bwipjs.toCanvas(qrcodeRef.current, {
          bcid: "qrcode",
          text: codeValue || "0000000000",
          scale: 3,
          paddingwidth: 1,
          paddingheight: 1,
        });
      } catch {}
    }
  }, [codeValue]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm" style={{ width: 300, fontFamily: "monospace" }}>
      <div className="text-sm font-bold mb-0.5">{task.productName}</div>
      <div className="text-xs text-gray-500 mb-2">批号：{task.batchNo}</div>
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <canvas ref={barcodeRef} style={{ width: "100%", height: 56 }} />
        </div>
        <canvas ref={qrcodeRef} style={{ width: 64, height: 64 }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>生产：{task.mfgDate}</span>
        <span>有效：{task.expDate}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1 text-center">UDI: {codeValue}</div>
    </div>
  );
}

function TemplateLabelPreview({
  task,
  template,
  companyInfo,
  scale = 1,
}: {
  task: PrintTask;
  template: LabelTemplate;
  companyInfo?: any;
  scale?: number;
}) {
  const resolvedData = useMemo(() => buildLabelTemplateData(task, companyInfo), [task, companyInfo]);
  const barcodeRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const qrcodeRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const canvasW = mmToPx(template.width);
  const canvasH = mmToPx(template.height);

  useEffect(() => {
    template.elements.forEach((el) => {
      const val = el.fieldBinding && el.fieldBinding !== "custom"
        ? (resolvedData[el.fieldBinding] || el.content)
        : el.content;
      if (el.type === "barcode") {
        const canvasEl = barcodeRefs.current[el.id];
        if (!canvasEl) return;
        try {
          const fmt = String(el.barcodeFormat || "CODE128").toUpperCase();
          const fmtMap: Record<string, string> = {
            CODE128: "code128",
            CODE39: "code39",
            EAN13: "ean13",
            EAN8: "ean8",
            ITF14: "itf14",
            UPC: "upca",
            "GS1-128": "gs1-128",
            "GS1-DATAMATRIX": "gs1datamatrix",
            DATAMATRIX: "datamatrix",
          };
          bwipjs.toCanvas(canvasEl, {
            bcid: fmtMap[fmt] || "code128",
            text: val || "0000000000",
            scale: 2,
            height: Math.max(5, mmToPx(el.height) / 4),
            includetext: el.showText !== false,
            textxalign: "center",
            textsize: 8,
          });
        } catch {}
      }
      if (el.type === "qrcode") {
        const canvasEl = qrcodeRefs.current[el.id];
        if (!canvasEl) return;
        try {
          const fmt = String(el.barcodeFormat || "GS1-DATAMATRIX").toUpperCase();
          const bcid = fmt.includes("GS1")
            ? "gs1datamatrix"
            : fmt.includes("QR")
              ? "qrcode"
              : "datamatrix";
          bwipjs.toCanvas(canvasEl, {
            bcid,
            text: val || "(01)00000000000000",
            scale: bcid === "qrcode" ? 3 : 4,
            paddingwidth: 1,
            paddingheight: 1,
          });
        } catch {}
      }
    });
  }, [resolvedData, template]);

  return (
    <div style={{ width: canvasW * scale, height: canvasH * scale, overflow: "hidden" }}>
      <div
        style={{
          width: canvasW,
          height: canvasH,
          position: "relative",
          background: "white",
          border: "1px solid #e5e7eb",
          boxShadow: scale === 1 ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {template.elements.map((el) => {
          const val = el.fieldBinding && el.fieldBinding !== "custom"
            ? (resolvedData[el.fieldBinding] || el.content)
            : el.content;
          const x = mmToPx(el.x);
          const y = mmToPx(el.y);
          const w = mmToPx(el.width);
          const h = mmToPx(el.height);
          const style: CSSProperties = {
            position: "absolute",
            left: x,
            top: y,
            width: w,
            height: h,
            opacity: (el.opacity ?? 100) / 100,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          };

          if (el.type === "text") {
            return (
              <div
                key={el.id}
                style={{
                  ...style,
                  fontSize: el.fontSize,
                  fontWeight: el.fontWeight,
                  fontStyle: el.fontStyle,
                  textAlign: el.textAlign,
                  color: el.color,
                  fontFamily: el.fontFamily || "Arial",
                  lineHeight: el.lineHeight || 1.2,
                  whiteSpace: val.includes("\n") ? "pre-wrap" : "nowrap",
                  overflow: "hidden",
                  textDecoration: el.textDecoration === "underline" ? "underline" : undefined,
                  letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                  backgroundColor: el.backgroundColor || "transparent",
                }}
              >
                {val}
              </div>
            );
          }
          if (el.type === "barcode") {
            return (
              <div key={el.id} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <canvas ref={(ref) => { barcodeRefs.current[el.id] = ref; }} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
            );
          }
          if (el.type === "qrcode") {
            return (
              <div key={el.id} style={style}>
                <canvas ref={(ref) => { qrcodeRefs.current[el.id] = ref; }} style={{ width: "100%", height: "100%" }} />
              </div>
            );
          }
          if (el.type === "line") {
            return <div key={el.id} style={{ ...style, height: Math.max(1, mmToPx(el.height)), backgroundColor: el.color ?? "#000" }} />;
          }
          if (el.type === "rect") {
            return (
              <div
                key={el.id}
                style={{
                  ...style,
                  border: `${el.borderWidth ?? 1}px solid ${el.borderColor ?? "#000"}`,
                  borderRadius: el.borderRadius ?? 0,
                  backgroundColor: el.backgroundColor || "transparent",
                }}
              />
            );
          }
          if (el.type === "symbol") {
            return (
              <div key={el.id} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {el.symbolId && renderMedicalSymbol(el.symbolId, Math.min(w, h), el.color || "#000")}
              </div>
            );
          }
          if (el.type === "image") {
            return (
              <div key={el.id} style={{ ...style, overflow: "hidden", backgroundColor: el.backgroundColor || "transparent" }}>
                {el.imageSrc ? (
                  <img src={el.imageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: el.objectFit || "contain" }} draggable={false} />
                ) : null}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default function LabelPrintPage() {
  const [, navigate] = useLocation();
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});
  const { data: companyInfo } = trpc.companyInfo.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: productionRecords = [], isLoading } = trpc.productionRecords.list.useQuery({ limit: 2000 });
  const { data: sterilizationOrders = [] } = trpc.sterilizationOrders.list.useQuery({ limit: 1000 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<PrintTask | null>(null);
  const [printProgress, setPrintProgress] = useState<Record<string, { printedQty: number; status: PrintTask["status"] }>>({});
  const [savedTemplates, setSavedTemplates] = useState<LabelTemplate[]>(() => loadSavedLabelTemplates());
  const [printingTask, setPrintingTask] = useState<PrintTask | null>(null);
  const printPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncTemplates = () => setSavedTemplates(loadSavedLabelTemplates());
    window.addEventListener("storage", syncTemplates);
    window.addEventListener("focus", syncTemplates);
    return () => {
      window.removeEventListener("storage", syncTemplates);
      window.removeEventListener("focus", syncTemplates);
    };
  }, []);

  const processTemplateMap = useMemo(() => {
    const grouped = new Map<string, any[]>();
    loadProductionProcessTemplates()
      .filter((item) => item.status === "active")
      .forEach((item) => {
        const key = normalizeApplicableProduct(item.applicableProducts);
        const list = grouped.get(key) || [];
        list.push(item);
        grouped.set(key, list);
      });
    grouped.forEach((list, key) => {
      grouped.set(
        key,
        [...list].sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return String(a.processName || "").localeCompare(String(b.processName || ""), "zh-CN");
        }),
      );
    });
    return grouped;
  }, []);

  const productMap = useMemo(
    () => new Map((products as any[]).map((item: any) => [Number(item.id), item])),
    [products]
  );

  const orderMap = useMemo(
    () => new Map((productionOrders as any[]).map((item: any) => [Number(item.id), item])),
    [productionOrders]
  );

  const tasks = useMemo<PrintTask[]>(() => {
    const grouped = new Map<string, any[]>();

    (productionRecords as any[]).forEach((record: any) => {
      const batchNo = String(record.batchNo || "").trim();
      if (!batchNo) return;
      const list = grouped.get(batchNo) || [];
      list.push(record);
      grouped.set(batchNo, list);
    });

    return Array.from(grouped.entries())
      .map(([batchNo, rows]) => {
        const sortedRows = [...rows].sort((a: any, b: any) => {
          return buildRecordTime(a.recordDate, a.recordTime) - buildRecordTime(b.recordDate, b.recordTime);
        });
        const firstRow = sortedRows[0];
        const lastRow = sortedRows[sortedRows.length - 1];
        const linkedOrder =
          orderMap.get(Number(firstRow?.productionOrderId || 0)) ||
          (productionOrders as any[]).find((item: any) => String(item.orderNo || "") === String(firstRow?.productionOrderNo || "")) ||
          (productionOrders as any[]).find((item: any) => String(item.batchNo || "") === batchNo) ||
          null;
        const product =
          productMap.get(Number(linkedOrder?.productId || firstRow?.productId || 0)) || null;
        const productName = String(product?.name || firstRow?.productName || "-");
        const templateList = processTemplateMap.get(normalizeApplicableProduct(productName)) || [];
        const processSortMap = new Map(
          templateList.map((item: any) => [String(item.processName || ""), Number(item.sortOrder || 0)]),
        );
        const processMap = new Map<string, any>();

        sortedRows.forEach((row: any) => {
          const processName = String(row.processName || row.workstationName || "").trim();
          if (!processName) return;
          const rowTime = buildRecordTime(row.recordDate, row.recordTime);
          const actualQty = parseNumberValue(row.actualQty);
          const existing = processMap.get(processName);
          if (!existing) {
            processMap.set(processName, {
              processName,
              actualQty,
              recordTime: rowTime,
              sortOrder: processSortMap.get(processName) ?? 9999,
            });
            return;
          }
          existing.actualQty = actualQty;
          existing.recordTime = rowTime;
        });

        const processList = Array.from(processMap.values()).sort((a: any, b: any) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.recordTime - b.recordTime;
        });
        const finalProcess = processList[processList.length - 1];
        const completedQty = parseNumberValue(finalProcess?.actualQty || lastRow?.actualQty);
        const plannedQty = Math.max(parseNumberValue(linkedOrder?.plannedQty), parseNumberValue(firstRow?.plannedQty));
        const quantity = completedQty || plannedQty;
        const createdAt = formatDateText(linkedOrder?.createdAt || firstRow?.createdAt) || formatDateText(new Date());
        const shelfLife = Number(product?.shelfLife || 0);
        const taskId = `routing-${batchNo}`;
        const progress = printProgress[taskId];
        return {
          id: taskId,
          productId: linkedOrder?.productId ?? firstRow?.productId ?? product?.id ?? null,
          taskNo: `RC-${batchNo}`,
          productName,
          specification: String(product?.specification || linkedOrder?.productSpec || ""),
          productCode: String(product?.code || ""),
          registrationNo: String(product?.registrationNo || ""),
          riskLevel: String(product?.riskLevel || ""),
          manufacturer: String(product?.manufacturer || ""),
          unit: String(product?.unit || linkedOrder?.unit || ""),
          batchNo,
          udiDi: String(product?.udiDi || ""),
          mfgDate: createdAt,
          expDate: addMonths(createdAt, shelfLife),
          quantity,
          printedQty: progress?.printedQty ?? 0,
          status: progress?.status ?? "pending",
          createdAt,
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [orderMap, printProgress, processTemplateMap, productMap, productionOrders, productionRecords, sterilizationOrders]);

  const matchedTemplateMap = useMemo(() => {
    const map = new Map<string, LabelTemplate | null>();
    tasks.forEach((task) => {
      map.set(task.id, pickMatchedTemplate(savedTemplates, task));
    });
    return map;
  }, [savedTemplates, tasks]);

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.productName.includes(search) || t.batchNo.includes(search) || t.taskNo.includes(search);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = tasks.length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const completed = tasks.filter(t => t.status === "completed").length;

  function handlePrint(task: PrintTask) {
    setPrintProgress(prev => ({
      ...prev,
      [task.id]: { printedQty: prev[task.id]?.printedQty ?? 0, status: "printing" },
    }));
    setPrintingTask(task);
  }

  useEffect(() => {
    if (!printingTask || !printPreviewRef.current) return;
    const timer = window.setTimeout(() => {
      openPrintPreviewWindow({
        title: `标签打印预览 - ${printingTask.productName}`,
        element: printPreviewRef.current,
      });
      setPrintProgress((prev) => ({
        ...prev,
        [printingTask.id]: { printedQty: printingTask.quantity, status: "completed" },
      }));
      const matchedTemplate = matchedTemplateMap.get(printingTask.id);
      toast.success(matchedTemplate ? `已调用模板「${matchedTemplate.name}」` : "未匹配模板，已使用默认标签");
      setPrintingTask(null);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [matchedTemplateMap, printingTask]);

  return (
    <ERPLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Printer className="w-6 h-6" /> 标签打印管理
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">读取生产流转单数据生成标签打印任务，支持条形码和二维码预览</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/production/udi/designer")} className="gap-1.5">
              <QrCode className="w-4 h-4" /> 标签设计器
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
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">暂无生产流程单数据</TableCell></TableRow>
              ) : filtered.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{t.taskNo}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div>{t.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.specification || "未填写规格型号"}
                        {matchedTemplateMap.get(t.id)?.name ? ` · 模板：${matchedTemplateMap.get(t.id)?.name}` : " · 未绑定模板"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.batchNo}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.udiDi}</TableCell>
                  <TableCell>{formatDisplayNumber(t.quantity)}</TableCell>
                  <TableCell>
                    <span className={t.printedQty === t.quantity ? "text-green-600 font-medium" : "text-orange-500"}>
                      {formatDisplayNumber(t.printedQty)}
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

      {/* 预览弹窗 */}
      <DraggableDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DraggableDialogContent className="max-w-[520px]">
          <DialogHeader><DialogTitle>标签预览</DialogTitle></DialogHeader>
          {selected && (
            <div className="flex flex-col items-center gap-4 py-2">
              {matchedTemplateMap.get(selected.id) ? (
                <TemplateLabelPreview
                  task={selected}
                  template={matchedTemplateMap.get(selected.id)!}
                  companyInfo={companyInfo}
                  scale={Math.min(1, 420 / Math.max(mmToPx(matchedTemplateMap.get(selected.id)!.width), 1))}
                />
              ) : (
                <DefaultLabelPreview task={selected} />
              )}
              <div className="text-xs text-muted-foreground text-center">
                {matchedTemplateMap.get(selected.id)
                  ? `已根据产品名称和规格自动匹配模板：${matchedTemplateMap.get(selected.id)?.name}`
                  : "未匹配到已绑定模板，当前显示默认标签预览"}
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

      <div className="fixed -left-[99999px] top-0 pointer-events-none opacity-0">
        {printingTask && (
          <div ref={printPreviewRef}>
            {matchedTemplateMap.get(printingTask.id) ? (
              <TemplateLabelPreview
                task={printingTask}
                template={matchedTemplateMap.get(printingTask.id)!}
                companyInfo={companyInfo}
              />
            ) : (
              <DefaultLabelPreview task={printingTask} />
            )}
          </div>
        )}
      </div>
    </ERPLayout>
  );
}
