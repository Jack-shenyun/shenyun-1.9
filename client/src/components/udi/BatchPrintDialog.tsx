/**
 * BatchPrintDialog - 批量打印对话框
 * 功能：上传Excel/CSV → 字段映射 → 批量预览 → 批量打印
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload, FileSpreadsheet, ArrowRight, Printer, Eye, ChevronLeft, ChevronRight,
  Download, AlertCircle, CheckCircle2, X, Loader2, Table2, Columns3,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import bwipjs from "bwip-js";
import { renderMedicalSymbol } from "@/components/udi/MedicalSymbols";

// ── 类型（与Home.tsx保持一致）──────────────────────────────
type ElementType = "text" | "barcode" | "qrcode" | "line" | "rect" | "symbol" | "image";

interface LabelElement {
  id: string; type: ElementType;
  x: number; y: number; width: number; height: number;
  content: string; fieldBinding?: string;
  fontSize?: number; fontWeight?: "normal" | "bold"; fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right"; color?: string;
  backgroundColor?: string; borderColor?: string; borderWidth?: number; borderRadius?: number;
  barcodeFormat?: string; showText?: boolean; symbolId?: string;
  rotation?: number; opacity?: number; locked?: boolean;
  lineHeight?: number; fontFamily?: string;
  textDecoration?: "none" | "underline"; letterSpacing?: number;
  imageSrc?: string; objectFit?: "contain" | "cover" | "fill";
}

interface LabelTemplate {
  id: string; name: string; width: number; height: number; unit: "mm" | "px";
  elements: LabelElement[]; regulation?: "NMPA" | "FDA" | "MDR";
}

interface BatchPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: LabelTemplate;
  fieldOptions: { value: string; label: string; group: string }[];
}

type StepType = "upload" | "mapping" | "preview";

const MM_TO_PX = 3.78;
function mmToPx(mm: number) { return Math.round(mm * MM_TO_PX); }

// ── 主组件 ──────────────────────────────────────────────────
export default function BatchPrintDialog({ open, onOpenChange, template, fieldOptions }: BatchPrintDialogProps) {
  const [step, setStep] = useState<StepType>("upload");
  const [fileName, setFileName] = useState("");
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [previewIndex, setPreviewIndex] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [labelsPerRow, setLabelsPerRow] = useState(1);
  const [labelGap, setLabelGap] = useState(2);
  const [printRange, setPrintRange] = useState<[number, number]>([0, 0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setStep("upload");
      setFileName("");
      setRawData([]);
      setColumns([]);
      setFieldMapping({});
      setPreviewIndex(0);
      setPrinting(false);
    }
  }, [open]);

  // ── 文件解析 ──────────────────────────────────────────────
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data.length === 0) { toast.error("文件中没有数据"); return; }
          const data = result.data as Record<string, string>[];
          const cols = Object.keys(data[0] || {});
          setRawData(data);
          setColumns(cols);
          setPrintRange([0, data.length - 1]);
          autoMapFields(cols);
          toast.success(`已加载 ${data.length} 条数据`);
          setStep("mapping");
        },
        error: () => toast.error("CSV解析失败"),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
          if (data.length === 0) { toast.error("文件中没有数据"); return; }
          // Convert all values to string
          const strData = data.map(row => {
            const newRow: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) newRow[k] = String(v ?? "");
            return newRow;
          });
          const cols = Object.keys(strData[0] || {});
          setRawData(strData);
          setColumns(cols);
          setPrintRange([0, strData.length - 1]);
          autoMapFields(cols);
          toast.success(`已加载 ${strData.length} 条数据`);
          setStep("mapping");
        } catch { toast.error("Excel解析失败"); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("请上传 .xlsx、.xls 或 .csv 文件");
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── 自动字段映射 ──────────────────────────────────────────
  function autoMapFields(cols: string[]) {
    const mapping: Record<string, string> = {};
    const usedFields = new Set<string>();

    // 获取模板中使用的字段绑定
    const templateFields = template.elements
      .filter(el => el.fieldBinding && el.fieldBinding !== "custom")
      .map(el => el.fieldBinding!);

    // 关键词映射表
    const keywordMap: Record<string, string[]> = {
      productName: ["产品名称", "产品名", "品名", "product name", "name", "产品"],
      productNameEn: ["英文名", "english name", "product name en", "英文产品名"],
      specification: ["规格", "型号", "规格型号", "spec", "specification", "size", "尺寸"],
      productCode: ["产品编码", "编码", "code", "ref", "产品编号", "货号", "物料编码"],
      batchNo: ["批号", "生产批号", "batch", "lot", "批次", "批次号"],
      mfgDate: ["生产日期", "制造日期", "mfg date", "manufacturing date", "生产时间"],
      expDate: ["有效期", "失效日期", "到期日", "exp date", "expiry", "有效期至"],
      serialNo: ["序列号", "serial", "sn", "序号"],
      quantity: ["数量", "qty", "quantity", "包装数量"],
      manufacturer: ["生产企业", "制造商", "manufacturer", "生产厂家", "厂家"],
      manufacturerEn: ["生产企业英文", "manufacturer en", "英文厂家"],
      address: ["地址", "企业地址", "address", "生产地址"],
      registrationNo: ["注册证号", "注册号", "registration", "许可证号"],
      gtin: ["gtin", "条码", "ean", "upc", "编码"],
      udiDi: ["udi-di", "udi di", "udidi", "udi编码"],
      basicUdiDi: ["basic udi", "基本udi"],
      srn: ["srn", "注册编号"],
      ecRepName: ["ec rep", "欧代", "欧洲代表"],
    };

    for (const col of cols) {
      const colLower = col.toLowerCase().trim();
      for (const [field, keywords] of Object.entries(keywordMap)) {
        if (usedFields.has(field)) continue;
        if (!templateFields.includes(field)) continue;
        if (keywords.some(kw => colLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(colLower))) {
          mapping[field] = col;
          usedFields.add(field);
          break;
        }
      }
    }
    setFieldMapping(mapping);
  }

  // ── 获取替换后的数据 ──────────────────────────────────────
  function getResolvedData(rowIndex: number): Record<string, string> {
    const row = rawData[rowIndex];
    if (!row) return {};
    const resolved: Record<string, string> = {};
    for (const [field, col] of Object.entries(fieldMapping)) {
      resolved[field] = row[col] ?? "";
    }
    return resolved;
  }

  // ── 下载模板 ──────────────────────────────────────────────
  function downloadTemplate() {
    const templateFields = template.elements
      .filter(el => el.fieldBinding && el.fieldBinding !== "custom")
      .map(el => el.fieldBinding!);
    const uniqueFields = Array.from(new Set(templateFields));
    const headers = uniqueFields.map(f => {
      const opt = fieldOptions.find(o => o.value === f);
      return opt ? opt.label : f;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, headers.map(() => "")]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "标签数据");
    XLSX.writeFile(wb, `${template.name}-批量数据模板.xlsx`);
    toast.success("数据模板已下载");
  }

  // ── 批量打印 ──────────────────────────────────────────────
  async function handleBatchPrint() {
    setPrinting(true);
    // 等待条码渲染完成
    await new Promise(r => setTimeout(r, 500));

    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("无法打开打印窗口，请允许弹出窗口"); setPrinting(false); return; }

    const startIdx = printRange[0];
    const endIdx = Math.min(printRange[1], rawData.length - 1);
    const totalLabels = endIdx - startIdx + 1;

    // 生成打印HTML
    let labelsHtml = "";
    for (let i = startIdx; i <= endIdx; i++) {
      const resolvedData = getResolvedData(i);
      labelsHtml += generateLabelHtml(template, resolvedData, i === endIdx);
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>批量打印 - ${template.name}</title>
  <style>
    @page {
      size: ${template.width}mm ${template.height}mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    .label-page {
      width: ${template.width}mm;
      height: ${template.height}mm;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .label-page:last-child { page-break-after: auto; }
    .label-el { position: absolute; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${labelsHtml}</body>
<script>
  // 等待条码渲染
  function renderBarcodes() {
    const canvases = document.querySelectorAll('canvas[data-barcode]');
    if (typeof bwipjs === 'undefined') {
      setTimeout(renderBarcodes, 100);
      return;
    }
    canvases.forEach(canvas => {
      try {
        const bcid = canvas.getAttribute('data-bcid') || 'code128';
        const text = canvas.getAttribute('data-text') || '';
        const showText = canvas.getAttribute('data-showtext') === 'true';
        const h = parseInt(canvas.getAttribute('data-h') || '10');
        bwipjs.toCanvas(canvas, {
          bcid, text, scale: 2, height: h,
          includetext: showText, textxalign: 'center', textsize: 8,
        });
      } catch(e) { console.warn('Barcode error:', e); }
    });
    const qrs = document.querySelectorAll('canvas[data-qrcode]');
    qrs.forEach(canvas => {
      try {
        const bcid = canvas.getAttribute('data-bcid') || 'gs1datamatrix';
        const text = canvas.getAttribute('data-text') || '';
        bwipjs.toCanvas(canvas, {
          bcid, text, scale: 3, paddingwidth: 1, paddingheight: 1,
        });
      } catch(e) { console.warn('QR error:', e); }
    });
    setTimeout(() => window.print(), 300);
  }
</script>
<script src="https://cdn.jsdelivr.net/npm/bwip-js@4/dist/bwip-js-min.js" onload="renderBarcodes()"></script>
</html>`);
    printWindow.document.close();

    toast.success(`正在打印 ${totalLabels} 张标签`);
    setPrinting(false);
  }

  // ── 生成单张标签HTML ──────────────────────────────────────
  function generateLabelHtml(tpl: LabelTemplate, data: Record<string, string>, isLast: boolean): string {
    let html = `<div class="label-page" style="${isLast ? "page-break-after:auto" : ""}">`;
    for (const el of tpl.elements) {
      const val = el.fieldBinding && el.fieldBinding !== "custom" ? (data[el.fieldBinding] || el.content) : el.content;
      const x = mmToPx(el.x), y = mmToPx(el.y), w = mmToPx(el.width), h = mmToPx(el.height);
      const baseStyle = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${(el.opacity ?? 100) / 100};${el.rotation ? `transform:rotate(${el.rotation}deg)` : ""}`;

      if (el.type === "text") {
        html += `<div class="label-el" style="${baseStyle};font-size:${el.fontSize}px;font-weight:${el.fontWeight};font-style:${el.fontStyle};text-align:${el.textAlign};color:${el.color};font-family:${el.fontFamily || "Arial"};line-height:${el.lineHeight || 1.2};white-space:${val.includes("\\n") ? "pre-wrap" : "nowrap"};overflow:hidden;${el.textDecoration === "underline" ? "text-decoration:underline;" : ""}${el.letterSpacing ? `letter-spacing:${el.letterSpacing}px;` : ""}${el.backgroundColor ? `background:${el.backgroundColor};` : ""}">${escapeHtml(val)}</div>`;
      } else if (el.type === "barcode") {
        const fmt = el.barcodeFormat ?? "CODE128";
        const fmtMap: Record<string, string> = { "CODE128": "code128", "CODE39": "code39", "EAN13": "ean13", "EAN8": "ean8", "ITF14": "itf14", "UPC": "upca", "GS1-128": "gs1-128", "GS1-DATAMATRIX": "gs1datamatrix", "DATAMATRIX": "datamatrix" };
        const bcid = fmtMap[fmt.toUpperCase()] ?? "code128";
        html += `<div class="label-el" style="${baseStyle};display:flex;align-items:center;justify-content:center;overflow:hidden"><canvas data-barcode="1" data-bcid="${bcid}" data-text="${escapeAttr(val)}" data-showtext="${el.showText !== false}" data-h="${Math.max(5, h / 4)}" style="max-width:100%;max-height:100%;object-fit:contain"></canvas></div>`;
      } else if (el.type === "qrcode") {
        const fmt = el.barcodeFormat ?? "GS1-DATAMATRIX";
        const isGS1 = fmt.toUpperCase().includes("GS1");
        const bcid = isGS1 ? "gs1datamatrix" : "datamatrix";
        html += `<div class="label-el" style="${baseStyle}"><canvas data-qrcode="1" data-bcid="${bcid}" data-text="${escapeAttr(val)}" style="width:100%;height:100%"></canvas></div>`;
      } else if (el.type === "line") {
        html += `<div class="label-el" style="${baseStyle};height:${Math.max(1, mmToPx(el.height))}px;background:${el.color ?? "#000"}"></div>`;
      } else if (el.type === "rect") {
        html += `<div class="label-el" style="${baseStyle};border:${el.borderWidth ?? 1}px solid ${el.borderColor ?? "#000"};border-radius:${el.borderRadius ?? 0}px;${el.backgroundColor ? `background:${el.backgroundColor}` : ""}"></div>`;
      } else if (el.type === "symbol") {
        // 符号使用内联SVG
        html += `<div class="label-el" style="${baseStyle};display:flex;align-items:center;justify-content:center">${getSymbolSvgString(el.symbolId || "", Math.min(w, h), el.color || "#000")}</div>`;
      }
    }
    html += "</div>";
    return html;
  }

  // ── 辅助函数 ──────────────────────────────────────────────
  function escapeHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>"); }
  function escapeAttr(s: string) { return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function getSymbolSvgString(symbolId: string, size: number, color: string): string {
    // 简化版本 - 使用文本标识
    const symbolMap: Record<string, string> = {
      ref: "REF", lot: "LOT", sn: "SN", udi: "UDI",
      mfgDate: "MFG", expiryDate: "EXP", manufacturer: "MFR",
      ce: "CE", md: "MD", sterileEO: "STERILE EO",
      nonSterile: "NON-STERILE", caution: "⚠",
      consultIFU: "IFU", keepFromSun: "☀",
      ecRep: "EC REP", rxOnly: "Rx",
    };
    const label = symbolMap[symbolId] || symbolId;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="22" height="22" rx="2" fill="none" stroke="${color}" stroke-width="1.5"/><text x="12" y="14" text-anchor="middle" font-size="6" fill="${color}" font-weight="bold">${label}</text></svg>`;
  }

  // ── 预览单张标签 ──────────────────────────────────────────
  const PreviewLabel = ({ rowIndex }: { rowIndex: number }) => {
    const resolvedData = getResolvedData(rowIndex);
    const canvasW = mmToPx(template.width);
    const canvasH = mmToPx(template.height);
    const barcodeRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
    const qrcodeRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

    useEffect(() => {
      template.elements.forEach(el => {
        const val = el.fieldBinding && el.fieldBinding !== "custom" ? (resolvedData[el.fieldBinding] || el.content) : el.content;
        if (el.type === "barcode") {
          const canvasEl = barcodeRefs.current[el.id];
          if (canvasEl) {
            try {
              const fmt = el.barcodeFormat ?? "CODE128";
              const fmtMap: Record<string, string> = { "CODE128": "code128", "CODE39": "code39", "EAN13": "ean13", "EAN8": "ean8", "ITF14": "itf14", "UPC": "upca", "GS1-128": "gs1-128", "GS1-DATAMATRIX": "gs1datamatrix", "DATAMATRIX": "datamatrix" };
              const bcid = fmtMap[fmt.toUpperCase()] ?? "code128";
              bwipjs.toCanvas(canvasEl, {
                bcid, text: val || "0000000000", scale: 2,
                height: Math.max(5, mmToPx(el.height) / 4),
                includetext: el.showText !== false, textxalign: "center", textsize: 8,
              });
            } catch { /* skip */ }
          }
        }
        if (el.type === "qrcode") {
          const canvasEl = qrcodeRefs.current[el.id];
          if (canvasEl) {
            try {
              const fmt = el.barcodeFormat ?? "GS1-DATAMATRIX";
              const isGS1 = fmt.toUpperCase().includes("GS1");
              bwipjs.toCanvas(canvasEl, {
                bcid: isGS1 ? "gs1datamatrix" : "datamatrix",
                text: val || "(01)00000000000000", scale: 3,
                paddingwidth: 1, paddingheight: 1,
              });
            } catch { /* skip */ }
          }
        }
      });
    }, [rowIndex, resolvedData]);

    return (
      <div style={{ width: canvasW, height: canvasH, position: "relative", background: "white", border: "1px solid #e5e7eb", transform: "scale(0.55)", transformOrigin: "top left" }}>
        {template.elements.map(el => {
          const val = el.fieldBinding && el.fieldBinding !== "custom" ? (resolvedData[el.fieldBinding] || el.content) : el.content;
          const x = mmToPx(el.x), y = mmToPx(el.y), w = mmToPx(el.width), h = mmToPx(el.height);
          const style: React.CSSProperties = { position: "absolute", left: x, top: y, width: w, height: h, opacity: (el.opacity ?? 100) / 100, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined };

          if (el.type === "text") return (
            <div key={el.id} style={{ ...style, fontSize: el.fontSize, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, color: el.color, fontFamily: el.fontFamily || "Arial", lineHeight: el.lineHeight || 1.2, whiteSpace: val.includes("\n") ? "pre-wrap" : "nowrap", overflow: "hidden", textDecoration: el.textDecoration === "underline" ? "underline" : undefined, letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined, backgroundColor: el.backgroundColor || "transparent" }}>{val}</div>
          );
          if (el.type === "barcode") return (
            <div key={el.id} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <canvas ref={ref => { barcodeRefs.current[el.id] = ref; }} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
          );
          if (el.type === "qrcode") return (
            <div key={el.id} style={style}>
              <canvas ref={ref => { qrcodeRefs.current[el.id] = ref; }} style={{ width: "100%", height: "100%" }} />
            </div>
          );
          if (el.type === "line") return <div key={el.id} style={{ ...style, height: Math.max(1, mmToPx(el.height)), backgroundColor: el.color ?? "#000" }} />;
          if (el.type === "rect") return <div key={el.id} style={{ ...style, border: `${el.borderWidth ?? 1}px solid ${el.borderColor ?? "#000"}`, borderRadius: el.borderRadius ?? 0, backgroundColor: el.backgroundColor || "transparent" }} />;
          if (el.type === "symbol") return (
            <div key={el.id} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {el.symbolId && renderMedicalSymbol(el.symbolId, Math.min(w, h), el.color || "#000")}
            </div>
          );
          return null;
        })}
      </div>
    );
  };

  // ── 获取模板中使用的字段 ──────────────────────────────────
  const templateFields = template.elements
    .filter(el => el.fieldBinding && el.fieldBinding !== "custom")
    .map(el => el.fieldBinding!)
    .filter((v, i, a) => a.indexOf(v) === i);

  const mappedCount = templateFields.filter(f => fieldMapping[f]).length;
  const totalFields = templateFields.length;

  // ── UI ──────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            批量打印
            <Badge variant="outline" className="text-xs">{template.name}</Badge>
          </DialogTitle>
          <DialogDescription>上传Excel或CSV数据文件，批量生成并打印标签</DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 py-2 px-1">
          {(["upload", "mapping", "preview"] as StepType[]).map((s, i) => {
            const labels = { upload: "上传数据", mapping: "字段映射", preview: "预览打印" };
            const icons = { upload: Upload, mapping: Columns3, preview: Eye };
            const Icon = icons[s];
            const isActive = step === s;
            const isPast = (["upload", "mapping", "preview"] as StepType[]).indexOf(step) > i;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => { if (isPast) setStep(s); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? "bg-blue-600 text-white shadow-sm" : isPast ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer" : "bg-gray-100 text-gray-400"}`}
                >
                  {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {labels[s]}
                </button>
                {i < 2 && <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* ===== Step 1: 上传数据 ===== */}
        {step === "upload" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div
              className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-blue-400", "bg-blue-50/50"); }}
              onDragLeave={e => { e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/50"); }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/50");
                const file = e.dataTransfer.files[0];
                if (file) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  if (fileInputRef.current) { fileInputRef.current.files = dt.files; fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true })); }
                }
              }}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">拖拽文件到此处，或点击上传</p>
              <p className="text-xs text-gray-400">支持 .xlsx、.xls、.csv 格式</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFileUpload} />

            <div className="flex items-center gap-3">
              <Separator className="flex-1 w-20" />
              <span className="text-xs text-gray-400">或</span>
              <Separator className="flex-1 w-20" />
            </div>

            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              下载数据模板 (.xlsx)
            </Button>
            <p className="text-xs text-gray-400 max-w-sm text-center">
              数据模板包含当前标签中所有绑定字段的列名，填写数据后上传即可批量生成标签
            </p>
          </div>
        )}

        {/* ===== Step 2: 字段映射 ===== */}
        {step === "mapping" && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <FileSpreadsheet className="w-3 h-3" />{fileName}
                </Badge>
                <span className="text-xs text-gray-400">{rawData.length} 条数据</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={mappedCount === totalFields ? "default" : "secondary"} className="text-xs">
                  {mappedCount === totalFields ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                  已映射 {mappedCount}/{totalFields}
                </Badge>
              </div>
            </div>

            <div className="flex gap-4 flex-1 overflow-hidden">
              {/* 字段映射表 */}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 mb-2">字段映射配置</p>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-3 space-y-2.5">
                    {templateFields.map(field => {
                      const opt = fieldOptions.find(o => o.value === field);
                      const mapped = fieldMapping[field];
                      return (
                        <div key={field} className="flex items-center gap-2">
                          <div className="w-32 shrink-0">
                            <p className="text-xs font-medium text-gray-700">{opt?.label || field}</p>
                            <p className="text-[10px] text-gray-400">{opt?.group || ""}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <Select value={mapped || "__none__"} onValueChange={v => setFieldMapping(m => ({ ...m, [field]: v === "__none__" ? "" : v }))}>
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue placeholder="选择Excel列" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs text-gray-400">-- 不映射 --</SelectItem>
                              {columns.map(col => (
                                <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {mapped && mapped !== "__none__" && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setFieldMapping(m => { const nm = { ...m }; delete nm[field]; return nm; })}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* 数据预览表 */}
              <div className="w-[350px] shrink-0 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 mb-2">数据预览（前5行）</p>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 sticky top-0">
                          <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-b">#</th>
                          {columns.slice(0, 6).map(col => (
                            <th key={col} className="px-2 py-1.5 text-left font-medium text-gray-500 border-b whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                            {columns.slice(0, 6).map(col => (
                              <td key={col} className="px-2 py-1 max-w-[100px] truncate">{row[col]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")} className="gap-1 text-xs">
                <ChevronLeft className="w-3.5 h-3.5" />重新上传
              </Button>
              <Button size="sm" onClick={() => setStep("preview")} className="gap-1 text-xs bg-blue-600 hover:bg-blue-700" disabled={mappedCount === 0}>
                下一步：预览<ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== Step 3: 预览打印 ===== */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">打印范围：</span>
                <div className="flex items-center gap-1">
                  <Input type="number" min={1} max={rawData.length} value={printRange[0] + 1}
                    onChange={e => setPrintRange([Math.max(0, parseInt(e.target.value) - 1), printRange[1]])}
                    className="w-16 h-7 text-xs text-center" />
                  <span className="text-xs text-gray-400">至</span>
                  <Input type="number" min={1} max={rawData.length} value={printRange[1] + 1}
                    onChange={e => setPrintRange([printRange[0], Math.min(rawData.length - 1, parseInt(e.target.value) - 1)])}
                    className="w-16 h-7 text-xs text-center" />
                  <span className="text-xs text-gray-400">共 {printRange[1] - printRange[0] + 1} 张</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep("mapping")} className="gap-1 text-xs">
                  <ChevronLeft className="w-3.5 h-3.5" />返回映射
                </Button>
                <Button size="sm" onClick={handleBatchPrint} disabled={printing} className="gap-1 text-xs bg-blue-600 hover:bg-blue-700">
                  {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  {printing ? "准备中..." : `打印 ${printRange[1] - printRange[0] + 1} 张标签`}
                </Button>
              </div>
            </div>

            <Separator />

            {/* 标签预览 */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewIndex(i => Math.max(0, i - 1))} disabled={previewIndex === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs text-gray-500 tabular-nums">
                    第 {previewIndex + 1} / {rawData.length} 条
                  </span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewIndex(i => Math.min(rawData.length - 1, i + 1))} disabled={previewIndex >= rawData.length - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {Object.entries(getResolvedData(previewIndex)).filter(([, v]) => v).slice(0, 3).map(([k, v]) => {
                    const opt = fieldOptions.find(o => o.value === k);
                    return <Badge key={k} variant="secondary" className="text-[10px]">{opt?.label || k}: {v.slice(0, 15)}</Badge>;
                  })}
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-lg bg-gray-50">
                <div className="p-6 flex justify-center">
                  <div style={{ width: mmToPx(template.width) * 0.55, height: mmToPx(template.height) * 0.55, overflow: "hidden" }}>
                    <PreviewLabel rowIndex={previewIndex} />
                  </div>
                </div>
              </ScrollArea>

              {/* 数据行摘要 */}
              <div className="mt-2">
                <ScrollArea className="h-[100px] border rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 sticky top-0">
                        <th className="px-2 py-1 text-left font-medium text-gray-500 border-b w-8">#</th>
                        {templateFields.filter(f => fieldMapping[f]).map(f => {
                          const opt = fieldOptions.find(o => o.value === f);
                          return <th key={f} className="px-2 py-1 text-left font-medium text-gray-500 border-b whitespace-nowrap">{opt?.label || f}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(printRange[0], printRange[1] + 1).map((_, i) => {
                        const idx = printRange[0] + i;
                        const data = getResolvedData(idx);
                        return (
                          <tr key={idx} className={`border-b cursor-pointer ${idx === previewIndex ? "bg-blue-50" : "hover:bg-gray-50"}`} onClick={() => setPreviewIndex(idx)}>
                            <td className="px-2 py-1 text-gray-400">{idx + 1}</td>
                            {templateFields.filter(f => fieldMapping[f]).map(f => (
                              <td key={f} className="px-2 py-1 max-w-[120px] truncate">{data[f]}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
