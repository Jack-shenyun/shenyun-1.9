import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Languages,
  Loader2,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

export interface StructuredReportField {
  key: string;
  labelZh: string;
  labelEn: string;
  value: string;
}

export interface StructuredReportItem {
  id: string;
  group: string;
  clause: string;
  requirement: string;
  result: string;
  conclusion: string;
}

export interface StructuredReportData {
  meta: {
    company: string;
    titleCn: string;
    titleEn: string;
    reportNo: string;
    version: string;
  };
  fieldRows: StructuredReportField[][];
  testStandard: string;
  items: StructuredReportItem[];
  finalConclusion: string;
  remark: string;
}

interface StructuredReportEditorProps {
  initialValue: StructuredReportData;
  fileName: string;
  saving?: boolean;
  onChange: (report: StructuredReportData) => void;
  onSave?: () => void;
  translateText?: (text: string) => Promise<string>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(text: string) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function sanitizeEditableHtml(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  const walk = (node: Element | HTMLDivElement) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child);
        return;
      }
      const element = child as HTMLElement;
      const tag = element.tagName.toLowerCase();
      const allowed = new Set(["br", "b", "strong", "i", "em", "u", "span", "div"]);
      if (!allowed.has(tag)) {
        element.replaceWith(document.createTextNode(element.textContent || ""));
        return;
      }
      [...element.attributes].forEach((attr) => element.removeAttribute(attr.name));
      walk(element);
    });
  };
  walk(div);
  return div.innerHTML
    .replace(/<div><br><\/div>/g, "<br>")
    .replace(/<div>/g, "")
    .replace(/<\/div>/g, "<br>")
    .replace(/(<br>)+$/g, "")
    .trim();
}

function htmlToPlainText(html: string) {
  const div = document.createElement("div");
  div.innerHTML = sanitizeEditableHtml(html);
  return (div.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function downloadFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeStructuredReport(input: StructuredReportData): StructuredReportData {
  const report = deepClone(input);
  report.meta ||= {
    company: "",
    titleCn: "自测报告",
    titleEn: "Self-Inspection Report",
    reportNo: "",
    version: "V1.0",
  };
  report.fieldRows ||= [];
  report.items ||= [];
  report.testStandard ||= "";
  report.finalConclusion ||= "";
  report.remark ||= "";

  report.fieldRows = report.fieldRows.map((row, rowIndex) =>
    row.map((field, colIndex) => ({
      key: field.key || `field_${rowIndex}_${colIndex}`,
      labelZh: field.labelZh || "",
      labelEn: field.labelEn || "",
      value: String(field.value ?? ""),
    }))
  );

  report.items = report.items.map((item, index) => ({
    id: item.id || `item_${index + 1}`,
    group: String(item.group ?? ""),
    clause: String(item.clause ?? ""),
    requirement: String(item.requirement ?? ""),
    result: String(item.result ?? ""),
    conclusion: String(item.conclusion ?? ""),
  }));

  if (report.items.length === 0) {
    report.items.push({
      id: `item_${Date.now()}`,
      group: "外观",
      clause: "",
      requirement: "[待补充]",
      result: "/",
      conclusion: "合格",
    });
  }

  return report;
}

function validateStructuredReport(report: StructuredReportData) {
  const errors: string[] = [];
  if (!report?.meta?.company) errors.push("公司名称不能为空");
  if (!report?.meta?.titleCn) errors.push("中文标题不能为空");
  if (!report?.meta?.reportNo) errors.push("报告编号不能为空");
  if (!Array.isArray(report?.fieldRows) || report.fieldRows.length === 0) errors.push("字段区不能为空");
  if (!Array.isArray(report?.items) || report.items.length === 0) errors.push("检验项不能为空");
  return { valid: errors.length === 0, errors };
}

const COL_WIDTHS = ["15%", "12%", "49%", "8%", "16%"];
const PAGE_BUDGET = 1040;
const TABLE_HEADER_HEIGHT = 54;
const SECTION_TITLE_HEIGHT = 34;
const HEADER_HEIGHT = 116;
const FIELD_ROW_HEIGHT = 58;
const STANDARD_HEIGHT = 50;
const SUMMARY_HEIGHT = 116;
const VERSION_HEIGHT = 28;
const TABLE_BOTTOM_GAP = 12;

function weightedLength(text: string) {
  return [...String(text || "")].reduce((sum, char) => sum + (/[^\u0000-\u00ff]/.test(char) ? 2 : 1), 0);
}

function estimateLines(text: string, charsPerLine: number) {
  const lines = String(text || "").split(/\n/);
  return Math.max(1, lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(weightedLength(line) / charsPerLine)), 0));
}

function estimateRowHeight(item: StructuredReportItem) {
  const groupLines = estimateLines(item.group, 8);
  const clauseLines = estimateLines(item.clause, 8);
  const requirementLines = estimateLines(item.requirement, 30);
  const resultLines = estimateLines(item.result, 6);
  const conclusionLines = estimateLines(item.conclusion, 8);
  const lineCount = Math.max(groupLines, clauseLines, requirementLines, resultLines, conclusionLines);
  return 14 + lineCount * 18;
}

function wrapValue(content: string, path: string, editable: boolean, extraClass = "") {
  const cls = `${editable ? "structured-report-editable " : ""}${extraClass}`.trim();
  if (editable) {
    return `<div class="${cls}" data-path="${escapeHtml(path)}" contenteditable="true">${content || ""}</div>`;
  }
  return `<div class="${cls}">${content || ""}</div>`;
}

function labelCell(field: StructuredReportField) {
  return `
    <div class="structured-label-zh">${escapeHtml(field.labelZh)}</div>
    <div class="structured-label-en">${escapeHtml(field.labelEn)}</div>
  `;
}

function headerHtml(report: StructuredReportData, editable: boolean) {
  return `
    <div class="structured-report-header structured-block">
      ${wrapValue(escapeHtml(report.meta.company), "meta.company", editable, "structured-text-center structured-company-name")}
      ${wrapValue(escapeHtml(report.meta.titleCn), "meta.titleCn", editable, "structured-text-center structured-report-title-cn")}
      ${wrapValue(escapeHtml(report.meta.titleEn), "meta.titleEn", editable, "structured-text-center structured-report-title-en")}
      <div class="structured-report-no-row">
        <span class="structured-report-no-label">编号 No.:</span>
        ${wrapValue(escapeHtml(report.meta.reportNo), "meta.reportNo", editable, "structured-report-no-value")}
      </div>
    </div>
  `;
}

function fieldGridHtml(report: StructuredReportData, editable: boolean) {
  const rows = report.fieldRows
    .map(
      (row) => `
      <tr>
        ${row
          .map(
            (field) => `
          <td class="structured-field-label">${labelCell(field)}</td>
          <td class="structured-field-value">${wrapValue(nl2br(field.value), `field.${field.key}`, editable)}</td>
        `
          )
          .join("")}
      </tr>
    `
    )
    .join("");

  return `
    <table class="structured-meta-table structured-block">
      <tbody>
        ${rows}
        <tr>
          <td class="structured-field-label structured-full-label">
            <div class="structured-label-zh">检验依据</div>
            <div class="structured-label-en">Test standard</div>
          </td>
          <td class="structured-field-value structured-full-value" colspan="5">${wrapValue(nl2br(report.testStandard), "testStandard", editable)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function resultHeaderHtml() {
  return `<div class="structured-section-title structured-block">检验内容 Test contents</div>`;
}

function summaryHtml(report: StructuredReportData, editable: boolean) {
  return `
    <table class="structured-summary-table structured-block">
      <tbody>
        <tr>
          <td class="structured-summary-label"><div class="structured-label-zh">检验结论</div><div class="structured-label-en">Conclusion</div></td>
          <td class="structured-summary-value">${wrapValue(nl2br(report.finalConclusion), "finalConclusion", editable)}</td>
        </tr>
        <tr>
          <td class="structured-summary-label"><div class="structured-label-zh">备注</div><div class="structured-label-en">Remark</div></td>
          <td class="structured-summary-value">${wrapValue(nl2br(report.remark), "remark", editable)}</td>
        </tr>
      </tbody>
    </table>
    <div class="structured-report-version structured-block"><span>版本：</span>${wrapValue(escapeHtml(report.meta.version), "meta.version", editable, "structured-version-value")}</div>
  `;
}

function tableShellStart() {
  return `
    <table class="structured-items-table structured-block">
      <colgroup>${COL_WIDTHS.map((width) => `<col style="width:${width}">`).join("")}</colgroup>
      <thead>
        <tr>
          <th><div class="structured-label-zh">检验项目</div><div class="structured-label-en">Test Item</div></th>
          <th><div class="structured-label-zh">标准条款</div><div class="structured-label-en">Standard Item</div></th>
          <th><div class="structured-label-zh">标准要求</div><div class="structured-label-en">Standard Requirement</div></th>
          <th><div class="structured-label-zh">检验结果</div><div class="structured-label-en">Result</div></th>
          <th><div class="structured-label-zh">结论</div><div class="structured-label-en">Conclusion</div></th>
        </tr>
      </thead>
      <tbody>
  `;
}

function tableShellEnd() {
  return "</tbody></table>";
}

function rowHtml(item: StructuredReportItem, showGroup: boolean, rowSpan: number, editable: boolean) {
  return `
    <tr>
      ${showGroup ? `<td class="structured-group-cell" rowspan="${rowSpan}">${wrapValue(nl2br(item.group), `item.${item.id}.group`, editable)}</td>` : ""}
      <td class="structured-clause-cell">${wrapValue(nl2br(item.clause), `item.${item.id}.clause`, editable)}</td>
      <td class="structured-requirement-cell">${wrapValue(nl2br(item.requirement), `item.${item.id}.requirement`, editable)}</td>
      <td class="structured-result-cell">${wrapValue(nl2br(item.result), `item.${item.id}.result`, editable)}</td>
      <td class="structured-conclusion-cell">${wrapValue(nl2br(item.conclusion), `item.${item.id}.conclusion`, editable)}</td>
    </tr>
  `;
}

function tableChunkHtml(itemsChunk: StructuredReportItem[], editable: boolean) {
  let body = "";
  let i = 0;
  while (i < itemsChunk.length) {
    const start = i;
    const group = itemsChunk[i]?.group;
    while (i < itemsChunk.length && itemsChunk[i].group === group) i += 1;
    const span = i - start;
    itemsChunk.slice(start, i).forEach((item, index) => {
      body += rowHtml(item, index === 0, span, editable);
    });
  }
  return tableShellStart() + body + tableShellEnd();
}

function computeChunks(report: StructuredReportData) {
  const fieldsHeight = report.fieldRows.length * FIELD_ROW_HEIGHT + STANDARD_HEIGHT;
  const firstCapacity = PAGE_BUDGET - HEADER_HEIGHT - fieldsHeight - SECTION_TITLE_HEIGHT - TABLE_HEADER_HEIGHT - TABLE_BOTTOM_GAP;
  const nextCapacity = PAGE_BUDGET - TABLE_HEADER_HEIGHT - TABLE_BOTTOM_GAP;
  const chunks: StructuredReportItem[][] = [];
  let idx = 0;
  let capacity = firstCapacity;

  while (idx < report.items.length) {
    let used = 0;
    const chunk: StructuredReportItem[] = [];
    while (idx < report.items.length) {
      const rowHeight = estimateRowHeight(report.items[idx]);
      if (chunk.length > 0 && used + rowHeight > capacity) break;
      chunk.push(report.items[idx]);
      used += rowHeight;
      idx += 1;
    }
    chunks.push(chunk);
    capacity = nextCapacity;
  }

  const summaryNeed = SUMMARY_HEIGHT + VERSION_HEIGHT;
  const lastChunkHeight = chunks.length ? chunks[chunks.length - 1].reduce((sum, item) => sum + estimateRowHeight(item), 0) : 0;
  const lastCapacity = chunks.length <= 1 ? firstCapacity : nextCapacity;
  const remaining = lastCapacity - lastChunkHeight;
  const needsSummaryPage = remaining < summaryNeed;

  return { chunks: chunks.length ? chunks : [[]], needsSummaryPage };
}

function buildPagesHtml(report: StructuredReportData, editable: boolean) {
  const { chunks, needsSummaryPage } = computeChunks(report);
  let html = "";
  chunks.forEach((chunk, chunkIndex) => {
    html += `<section class="structured-page"><div class="structured-page-inner">`;
    if (chunkIndex === 0) {
      html += headerHtml(report, editable);
      html += fieldGridHtml(report, editable);
      html += resultHeaderHtml();
    }
    html += tableChunkHtml(chunk, editable);
    html += "</div></section>";
  });

  if (needsSummaryPage) {
    html += `<section class="structured-page"><div class="structured-page-inner">${summaryHtml(report, editable)}</div></section>`;
  } else {
    html = html.replace(/<\/div><\/section>\s*$/, `${summaryHtml(report, editable)}</div></section>`);
  }
  return html;
}

export function buildStructuredReportPrintableDocument(report: StructuredReportData) {
  const normalized = normalizeStructuredReport(report);
  const pagesHtml = buildPagesHtml(normalized, false);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(normalized.meta.titleCn)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; padding: 0; background: #efefef; }
    body { font-family: "Noto Serif CJK SC", "Source Han Serif SC", SimSun, serif; color: #111; }
    .structured-pages { display: flex; flex-direction: column; gap: 12px; align-items: center; padding: 16px; }
    .structured-page { width: 210mm; min-height: 297mm; background: white; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
    .structured-page-inner { box-sizing: border-box; width: 100%; min-height: 297mm; padding: 10mm; }
    .structured-block { margin-bottom: 8px; }
    .structured-text-center { text-align: center; }
    .structured-company-name { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .structured-report-title-cn { font-size: 26px; font-weight: 700; letter-spacing: 1px; }
    .structured-report-title-en { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .structured-report-no-row { display: flex; justify-content: flex-start; gap: 8px; font-size: 14px; margin-top: 6px; }
    .structured-report-no-label { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 13px; }
    td, th { border: 1px solid #222; padding: 5px 6px; vertical-align: top; line-height: 1.45; word-break: break-word; }
    .structured-field-label, .structured-summary-label { width: 11.5%; text-align: center; }
    .structured-field-value { width: 21.8%; }
    .structured-label-zh { font-weight: 700; }
    .structured-label-en { font-size: 11px; margin-top: 2px; }
    .structured-full-label { width: 11.5%; }
    .structured-full-value { width: 88.5%; }
    .structured-section-title { font-weight: 700; border: 1px solid #222; padding: 6px 8px; }
    .structured-items-table th { text-align: center; }
    .structured-group-cell, .structured-clause-cell, .structured-result-cell, .structured-conclusion-cell { text-align: center; }
    .structured-summary-label { width: 18%; }
    .structured-summary-value { width: 82%; min-height: 38px; }
    .structured-report-version { display: flex; justify-content: flex-end; gap: 6px; margin-top: 18px; font-size: 13px; }
    @media print {
      html, body { background: #fff; }
      .structured-pages { padding: 0; gap: 0; }
      .structured-page { box-shadow: none; }
      .structured-page + .structured-page { break-before: page; }
    }
  </style>
</head>
<body>
  <div class="structured-pages">${pagesHtml}</div>
</body>
</html>`;
}

export function createStructuredReportFromContext(params: {
  companyName?: string;
  projectNo?: string;
  projectName?: string;
  targetMarkets?: string[];
  deliverableCode?: string;
  deliverableName?: string;
  version?: string;
  ownerName?: string;
  stageName?: string;
  product?: {
    name?: string;
    code?: string;
    specification?: string;
    registrationNo?: string;
    udiDi?: string;
  } | null;
}): StructuredReportData {
  const { companyName, projectNo, projectName, targetMarkets, deliverableCode, deliverableName, version, ownerName, stageName, product } = params;
  return normalizeStructuredReport({
    meta: {
      company: companyName || "苏州神韵医疗器械有限公司",
      titleCn: deliverableName || "自测报告",
      titleEn: "Self-Inspection Report",
      reportNo: [projectNo, deliverableCode].filter(Boolean).join("-") || "QTQP11-10",
      version: version || "V1.0",
    },
    fieldRows: [
      [
        { key: "productName", labelZh: "产品名称", labelEn: "Product Name", value: product?.name || "" },
        { key: "productSpec", labelZh: "规格型号", labelEn: "Specification / Model", value: product?.specification || "" },
        { key: "projectNo", labelZh: "项目编号", labelEn: "Project No.", value: projectNo || "" },
      ],
      [
        { key: "productCode", labelZh: "产品编码", labelEn: "Product Code", value: product?.code || "" },
        { key: "registrationNo", labelZh: "注册证号", labelEn: "Registration No.", value: product?.registrationNo || "" },
        { key: "udiDi", labelZh: "UDI-DI", labelEn: "UDI-DI", value: product?.udiDi || "" },
      ],
      [
        { key: "ownerName", labelZh: "负责人", labelEn: "Owner", value: ownerName || "" },
        { key: "stageName", labelZh: "当前阶段", labelEn: "Current Stage", value: stageName || "" },
        { key: "marketScope", labelZh: "目标市场", labelEn: "Target Markets", value: (targetMarkets || []).join(" / ") },
      ],
    ],
    testStandard: "产品技术要求 / 研发自测方案",
    items: [
      { id: `item_${Date.now()}_1`, group: "外观", clause: "2.1", requirement: "请补充外观检查要求。", result: "/", conclusion: "合格" },
      { id: `item_${Date.now()}_2`, group: "尺寸", clause: "2.2", requirement: "请补充尺寸和规格符合性要求。", result: "/", conclusion: "合格" },
      { id: `item_${Date.now()}_3`, group: "性能", clause: "2.3", requirement: "请补充关键性能验证要求。", result: "/", conclusion: "合格" },
    ],
    finalConclusion: "本次自测结果：[待补充]",
    remark: projectName ? `关联项目：${projectName}` : "",
  });
}

const STYLES = `
.structured-editor-shell { display:grid; grid-template-columns: 300px 1fr; gap:16px; min-height:0; }
.structured-side-panel { position: sticky; top: 0; align-self:start; background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; }
.structured-side-title { padding:14px 16px; border-bottom:1px solid #e5e7eb; font-weight:700; }
.structured-side-body { padding:14px 16px; display:grid; gap:12px; }
.structured-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.structured-stat-card { padding:10px; border-radius:10px; background:#f8fafc; border:1px solid #e5e7eb; }
.structured-stat-card strong { display:block; font-size:18px; }
.structured-stat-card span { display:block; font-size:12px; color:#6b7280; margin-top:4px; }
.structured-note-box { padding:12px; background:#f8fafc; border-radius:10px; border:1px solid #e5e7eb; font-size:13px; line-height:1.6; }
.structured-note-box ul { margin:8px 0 0; padding-left:18px; color:#6b7280; }
.structured-canvas-wrap { min-width:0; }
.structured-toolbar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.structured-status-strip { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:12px; color:#6b7280; font-size:12px; }
.structured-status-strip .ok { color:#15803d; font-weight:600; }
.structured-status-strip .bad { color:#dc2626; font-weight:600; }
.structured-pages { display:flex; flex-direction:column; gap:16px; align-items:center; width:100%; }
.structured-page { width:210mm; min-height:297mm; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.14); border-radius:2px; }
.structured-page-inner { box-sizing:border-box; width:100%; min-height:297mm; padding:10mm; font-family:"Noto Serif CJK SC","Source Han Serif SC",SimSun,serif; color:#111; }
.structured-block { margin-bottom:8px; }
.structured-text-center { text-align:center; }
.structured-company-name { font-size:18px; font-weight:700; margin-bottom:8px; }
.structured-report-title-cn { font-size:26px; font-weight:700; letter-spacing:1px; }
.structured-report-title-en { font-size:16px; font-weight:700; margin-top:4px; }
.structured-report-no-row { display:flex; justify-content:flex-start; gap:8px; font-size:14px; margin-top:6px; }
.structured-report-no-label { font-weight:700; }
.structured-report-no-value { min-width:140px; }
.structured-page table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:13px; }
.structured-page td, .structured-page th { border:1px solid #222; padding:5px 6px; vertical-align:top; line-height:1.45; word-break:break-word; }
.structured-field-label, .structured-summary-label { width:11.5%; text-align:center; }
.structured-field-value { width:21.8%; }
.structured-full-label { width:11.5%; }
.structured-full-value { width:88.5%; }
.structured-label-zh { font-weight:700; }
.structured-label-en { font-size:11px; margin-top:2px; }
.structured-section-title { font-weight:700; border:1px solid #222; padding:6px 8px; }
.structured-items-table th { text-align:center; }
.structured-group-cell, .structured-clause-cell, .structured-result-cell, .structured-conclusion-cell { text-align:center; }
.structured-summary-label { width:18%; }
.structured-summary-value { width:82%; min-height:38px; }
.structured-report-version { display:flex; justify-content:flex-end; gap:6px; margin-top:18px; font-size:13px; }
.structured-report-editable { min-height:20px; outline:none; padding:2px 3px; border-radius:4px; transition:background-color .15s ease, box-shadow .15s ease; }
.structured-report-editable:focus { background:rgba(37,99,235,0.08); box-shadow: inset 0 0 0 1px rgba(37,99,235,0.28); }
.structured-translator-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.46); display:grid; place-items:center; z-index:200; padding:18px; }
.structured-translator-modal { width:min(760px, 96vw); background:#fff; border-radius:14px; box-shadow:0 20px 40px rgba(17,24,39,.18); overflow:hidden; }
.structured-translator-head, .structured-translator-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; border-bottom:1px solid #e5e7eb; }
.structured-translator-actions { border-top:1px solid #e5e7eb; border-bottom:none; justify-content:flex-end; }
.structured-translator-body { padding:16px; display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.structured-translator-body textarea { min-height:220px; }
@media (max-width: 1280px) { .structured-editor-shell { grid-template-columns:1fr; } .structured-side-panel { position:static; } }
@media (max-width: 768px) { .structured-translator-body { grid-template-columns:1fr; } }
`;

export default function StructuredReportEditor({
  initialValue,
  fileName,
  saving = false,
  onChange,
  onSave,
  translateText,
}: StructuredReportEditorProps) {
  const templateRef = useRef(normalizeStructuredReport(initialValue));
  const [report, setReport] = useState(() => deepClone(templateRef.current));
  const reportRef = useRef(report);
  const [undoStack, setUndoStack] = useState<StructuredReportData[]>([]);
  const [redoStack, setRedoStack] = useState<StructuredReportData[]>([]);
  const [activeEditablePath, setActiveEditablePath] = useState<string | null>(null);
  const [activeEditableText, setActiveEditableText] = useState("");
  const [translatorOpen, setTranslatorOpen] = useState(false);
  const [translatorSource, setTranslatorSource] = useState("");
  const [translatorResult, setTranslatorResult] = useState("");
  const [translatorLoading, setTranslatorLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const commitReport = useCallback((nextReport: StructuredReportData, pushUndo = true) => {
    const normalized = normalizeStructuredReport(nextReport);
    if (JSON.stringify(normalized) === JSON.stringify(reportRef.current)) return false;
    const previous = deepClone(reportRef.current);
    if (pushUndo) {
      setUndoStack((current) => [...current.slice(-99), previous]);
      setRedoStack([]);
    }
    reportRef.current = normalized;
    setReport(normalized);
    onChange(normalized);
    return true;
  }, [onChange]);

  const updateReport = useCallback((updater: (draft: StructuredReportData) => void) => {
    const draft = deepClone(reportRef.current);
    updater(draft);
    commitReport(draft, true);
  }, [commitReport]);

  const handleUndo = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, deepClone(reportRef.current)]);
    reportRef.current = deepClone(previous);
    setReport(deepClone(previous));
    onChange(deepClone(previous));
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current.slice(-99), deepClone(reportRef.current)]);
    reportRef.current = deepClone(next);
    setReport(deepClone(next));
    onChange(deepClone(next));
  };

  const validation = useMemo(() => validateStructuredReport(report), [report]);
  const chunkInfo = useMemo(() => computeChunks(report), [report]);
  const pagesHtml = useMemo(() => buildPagesHtml(report, true), [report]);

  const applyPathValue = useCallback((path: string, html: string) => {
    updateReport((draft) => {
      const text = htmlToPlainText(html);
      if (path.startsWith("meta.")) {
        draft.meta[path.slice(5) as keyof StructuredReportData["meta"]] = text;
        return;
      }
      if (path.startsWith("field.")) {
        const key = path.slice(6);
        draft.fieldRows.forEach((row) => row.forEach((field) => {
          if (field.key === key) field.value = text;
        }));
        return;
      }
      if (path.startsWith("item.")) {
        const [, itemId, prop] = path.split(".");
        const item = draft.items.find((entry) => entry.id === itemId);
        if (item) {
          (item as Record<string, string>)[prop] = text;
        }
        return;
      }
      if (path === "testStandard") draft.testStandard = text;
      if (path === "finalConclusion") draft.finalConclusion = text;
      if (path === "remark") draft.remark = text;
    });
  }, [updateReport]);

  const handleContainerBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("structured-report-editable")) return;
    const path = target.dataset.path;
    if (!path) return;
    applyPathValue(path, target.innerHTML);
  };

  const handleContainerFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("structured-report-editable")) return;
    setActiveEditablePath(target.dataset.path || null);
    setActiveEditableText(target.innerText || "");
  };

  const handleContainerKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      onSave?.();
    }
  };

  const addItem = () => {
    updateReport((draft) => {
      draft.items.push({
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        group: "新项目",
        clause: "",
        requirement: "[待补充]",
        result: "/",
        conclusion: "合格",
      });
    });
  };

  const deleteLastItem = () => {
    updateReport((draft) => {
      if (draft.items.length > 1) draft.items.pop();
    });
  };

  const resetTemplate = () => {
    const normalized = deepClone(templateRef.current);
    reportRef.current = normalized;
    setReport(normalized);
    setUndoStack([]);
    setRedoStack([]);
    onChange(normalized);
    toast.success("已恢复当前模板");
  };

  const exportHtml = () => {
    downloadFile(`${fileName}.html`, buildStructuredReportPrintableDocument(report), "text/html;charset=utf-8");
  };

  const exportDoc = () => {
    downloadFile(`${fileName}.doc`, buildStructuredReportPrintableDocument(report), "application/msword;charset=utf-8");
  };

  const exportJson = () => {
    downloadFile(`${fileName}.json`, JSON.stringify(report, null, 2), "application/json;charset=utf-8");
  };

  const printReport = () => {
    const html = buildStructuredReportPrintableDocument(report);
    const win = window.open("", "_blank", "width=1024,height=820");
    if (!win) {
      toast.error("打印窗口打开失败");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 400);
  };

  const handleOpenTranslator = () => {
    setTranslatorSource(activeEditableText);
    setTranslatorResult("");
    setTranslatorOpen(true);
  };

  const handleRunTranslator = async () => {
    if (!translateText) {
      toast.error("当前未配置翻译服务");
      return;
    }
    setTranslatorLoading(true);
    try {
      const result = await translateText(translatorSource);
      setTranslatorResult(result || "");
    } catch {
      toast.error("翻译失败");
    } finally {
      setTranslatorLoading(false);
    }
  };

  const handleApplyTranslator = () => {
    if (!activeEditablePath || !translatorResult.trim()) return;
    updateReport((draft) => {
      const text = translatorResult.trim();
      if (activeEditablePath.startsWith("meta.")) {
        draft.meta[activeEditablePath.slice(5) as keyof StructuredReportData["meta"]] = text;
        return;
      }
      if (activeEditablePath.startsWith("field.")) {
        const key = activeEditablePath.slice(6);
        draft.fieldRows.forEach((row) => row.forEach((field) => {
          if (field.key === key) field.value = text;
        }));
        return;
      }
      if (activeEditablePath.startsWith("item.")) {
        const [, itemId, prop] = activeEditablePath.split(".");
        const item = draft.items.find((entry) => entry.id === itemId);
        if (item) {
          (item as Record<string, string>)[prop] = text;
        }
      }
    });
    setTranslatorOpen(false);
    toast.success("翻译内容已写入当前字段");
  };

  return (
    <div className="space-y-4">
      <style>{STYLES}</style>

      <div className="structured-toolbar">
        <Button type="button" variant="outline" size="sm" onClick={resetTemplate}>
          <RotateCcw className="mr-1 h-4 w-4" />
          加载模板
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={!undoStack.length}>
          <Undo2 className="mr-1 h-4 w-4" />
          撤销
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleRedo} disabled={!redoStack.length}>
          <Redo2 className="mr-1 h-4 w-4" />
          重做
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" />
          增加检验项
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={deleteLastItem} disabled={report.items.length <= 1}>
          <Trash2 className="mr-1 h-4 w-4" />
          删除最后一项
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleOpenTranslator} disabled={!translateText || !activeEditablePath}>
          <Languages className="mr-1 h-4 w-4" />
          翻译器弹窗
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportDoc}>
          <Download className="mr-1 h-4 w-4" />
          导出 DOC
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportHtml}>
          <Download className="mr-1 h-4 w-4" />
          导出 HTML
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportJson}>
          <Download className="mr-1 h-4 w-4" />
          导出 JSON
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={printReport}>
          <Printer className="mr-1 h-4 w-4" />
          打印
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!onSave || saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          保存
        </Button>
      </div>

      <div className="structured-status-strip">
        <div>页数：<strong>{chunkInfo.chunks.length + (chunkInfo.needsSummaryPage ? 1 : 0)}</strong></div>
        <div>检验项：<strong>{report.items.length}</strong></div>
        <div>校验：<strong className={validation.valid ? "ok" : "bad"}>{validation.valid ? "结构有效" : validation.errors[0]}</strong></div>
        <div>说明：点击页面中蓝色高亮区域直接修改，失焦后自动重新分页。</div>
      </div>

      <div className="structured-editor-shell">
        <aside className="structured-side-panel">
          <div className="structured-side-title">文档状态</div>
          <div className="structured-side-body">
            <div className="structured-stats-grid">
              <div className="structured-stat-card"><strong>{chunkInfo.chunks.length + (chunkInfo.needsSummaryPage ? 1 : 0)}</strong><span>A4 页面数</span></div>
              <div className="structured-stat-card"><strong>{report.items.length}</strong><span>检验项目数</span></div>
            </div>
            <div className="structured-note-box">
              当前结构化报告编辑器包含：
              <ul>
                <li>固定 A4 分页</li>
                <li>长表格自动分页</li>
                <li>结构化字段编辑</li>
                <li>DOC / HTML / JSON 导出</li>
                <li>当前字段翻译弹窗</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">保存状态</div>
              <Badge variant={saving ? "secondary" : "outline"} className="w-fit">
                {saving ? "保存中" : "已接入项目自动保存"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">结构校验</div>
              {validation.valid ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                  当前结构有效
                </div>
              ) : (
                <div className="text-sm text-rose-600 whitespace-pre-wrap">{validation.errors.join("\n")}</div>
              )}
            </div>
          </div>
        </aside>

        <section
          ref={containerRef}
          className="structured-canvas-wrap"
          onFocusCapture={handleContainerFocusCapture}
          onBlurCapture={handleContainerBlurCapture}
          onKeyDownCapture={handleContainerKeyDownCapture}
        >
          <div className="structured-pages" dangerouslySetInnerHTML={{ __html: pagesHtml }} />
        </section>
      </div>

      {translatorOpen ? (
        <div className="structured-translator-overlay" onClick={() => setTranslatorOpen(false)}>
          <div className="structured-translator-modal" onClick={(event) => event.stopPropagation()}>
            <div className="structured-translator-head">
              <div className="font-medium">中文到英文翻译器</div>
              <Button type="button" variant="outline" size="sm" onClick={() => setTranslatorOpen(false)}>关闭</Button>
            </div>
            <div className="structured-translator-body">
              <div className="space-y-2">
                <div className="text-sm font-medium">中文</div>
                <Textarea value={translatorSource} onChange={(event) => setTranslatorSource(event.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">英文</div>
                <Textarea value={translatorResult} onChange={(event) => setTranslatorResult(event.target.value)} />
              </div>
            </div>
            <div className="structured-translator-actions">
              <Button type="button" variant="outline" onClick={() => { setTranslatorSource(""); setTranslatorResult(""); }}>清空</Button>
              <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(translatorResult || "")}>复制英文</Button>
              <Button type="button" variant="outline" onClick={handleApplyTranslator}>插入当前字段</Button>
              <Button type="button" onClick={() => void handleRunTranslator()} disabled={translatorLoading}>
                {translatorLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Languages className="mr-1 h-4 w-4" />}
                立即翻译
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
