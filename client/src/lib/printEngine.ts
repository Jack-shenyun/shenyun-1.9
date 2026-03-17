/**
 * 统一打印引擎 (Print Engine)
 * 
 * 核心设计理念：所见即所得
 * - 模版编辑时的预览效果 = 最终打印/生成的文件效果
 * - 使用 Handlebars 风格的 {{变量}} 语法进行数据注入
 * - 支持 {{#each items}} 循环、{{#if condition}} 条件
 * - 统一的 HTML + CSS 渲染，预览和打印共用同一套渲染逻辑
 */

import {
  formatCurrencyValue,
  formatDate,
  formatDateTime,
  formatDisplayNumber,
  formatPercentValue,
} from "./formatters";

// ==================== 类型定义 ====================

/** 模版变量上下文 */
export interface PrintContext {
  /** 公司信息 */
  company: {
    name: string;
    nameEn?: string;
    address?: string;
    addressEn?: string;
    phone?: string;
    email?: string;
    website?: string;
    contactName?: string;
    contactNameEn?: string;
    whatsapp?: string;
    logoUrl?: string;
  };
  /** 业务数据（根据模版类型不同而不同） */
  data: Record<string, any>;
  /** 打印时间 */
  printTime: string;
  /** 打印日期 */
  printDate: string;
}

/** 模版定义 */
export interface TemplateDefinition {
  templateKey: string;
  name: string;
  module: string;
  description?: string;
  /** 可用变量列表（用于编辑器提示） */
  variables: TemplateVariable[];
  /** 默认 HTML 模版 */
  defaultHtml: string;
  /** 默认 CSS */
  defaultCss: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "array" | "boolean";
  /** 数组子项的变量定义 */
  children?: TemplateVariable[];
  /** 示例值（用于预览） */
  example?: any;
}

// ==================== 模版渲染引擎 ====================

/**
 * 安全地获取嵌套对象属性
 */
function getNestedValue(obj: any, path: string): any {
  // 先尝试直接键名匹配（支持带点号的键，如 "company.name"）
  if (obj != null && path in obj) {
    return obj[path];
  }
  // 再尝试嵌套查找
  return path.split(".").reduce((current, key) => {
    if (current == null) return undefined;
    return current[key];
  }, obj);
}

/**
 * 格式化值用于显示
 */
function formatValue(value: any): string {
  if (value == null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? formatDisplayNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2, locale: "zh-CN" })
      : "0";
  }
  if (value instanceof Date) {
    return formatDate(value);
  }
  return String(value);
}

/**
 * 核心模版渲染函数
 * 支持：
 * - {{变量名}} 简单变量替换
 * - {{变量名 | format}} 格式化管道
 * - {{#each 数组名}} ... {{/each}} 循环
 * - {{#if 变量名}} ... {{else}} ... {{/if}} 条件
 * - {{@index}} 循环索引（从0开始）
 * - {{@number}} 循环序号（从1开始）
 */
export function renderTemplate(template: string, context: Record<string, any>): string {
  let result = template;

  // 1. 处理 {{#each}} 循环
  result = processEachBlocks(result, context);

  // 2. 处理 {{#if}} 条件
  result = processIfBlocks(result, context);

  // 3. 处理简单变量替换 {{变量名}}
  result = processVariables(result, context);

  return result;
}

function processEachBlocks(template: string, context: Record<string, any>): string {
  // 匹配 {{#each arrayName}} ... {{/each}}
  const eachRegex = /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  
  return template.replace(eachRegex, (_, arrayPath, body) => {
    const array = getNestedValue(context, arrayPath.trim());
    if (!Array.isArray(array) || array.length === 0) return "";
    
    return array.map((item, index) => {
      // 创建循环内的上下文
      const itemContext = {
        ...context,
        ...item,
        "@index": index,
        "@number": index + 1,
        "@first": index === 0,
        "@last": index === array.length - 1,
      };
      
      // 递归处理嵌套的 each
      let rendered = processEachBlocks(body, itemContext);
      rendered = processIfBlocks(rendered, itemContext);
      rendered = processVariables(rendered, itemContext);
      
      return rendered;
    }).join("");
  });
}

function processIfBlocks(template: string, context: Record<string, any>): string {
  // 匹配 {{#if varName}} ... {{else}} ... {{/if}} 或 {{#if varName}} ... {{/if}}
  const ifRegex = /\{\{#if\s+([\w.@]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  return template.replace(ifRegex, (_, varPath, body) => {
    const value = getNestedValue(context, varPath.trim());
    const isTruthy = !!value && value !== "0" && value !== "false" && value !== "-";
    
    // 检查是否有 {{else}}
    const elseParts = body.split(/\{\{else\}\}/);
    const trueBlock = elseParts[0] || "";
    const falseBlock = elseParts[1] || "";
    
    const chosen = isTruthy ? trueBlock : falseBlock;
    // 递归处理
    let rendered = processIfBlocks(chosen, context);
    rendered = processVariables(rendered, context);
    return rendered;
  });
}

function processVariables(template: string, context: Record<string, any>): string {
  // 匹配 {{变量名}} 或 {{变量名 | 格式化}}
  return template.replace(/\{\{([\w.@]+)(?:\s*\|\s*(\w+))?\}\}/g, (_, varPath, format) => {
    const value = getNestedValue(context, varPath.trim());
    
    if (format) {
      return applyFormat(value, format);
    }
    
    return formatValue(value);
  });
}

function applyFormat(value: any, format: string): string {
  switch (format) {
    case "currency":
      return formatCurrencyValue(value, "¥", { minimumFractionDigits: 0, maximumFractionDigits: 2, locale: "zh-CN" });
    case "decimal2":
      return formatDisplayNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2, locale: "zh-CN" });
    case "decimal4":
      return formatDisplayNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 4, locale: "zh-CN" });
    case "percent":
      return formatPercentValue(value, { minimumFractionDigits: 0, maximumFractionDigits: 1, locale: "zh-CN" });
    case "date":
      return formatDate(value);
    case "datetime":
      return formatDateTime(value);
    case "upper":
      return String(value || "").toUpperCase();
    case "lower":
      return String(value || "").toLowerCase();
    default:
      return formatValue(value);
  }
}

// ==================== 打印执行 ====================

/**
 * 构建完整的打印 HTML 文档
 * 这是预览和打印共用的核心函数，确保所见即所得
 */
export function buildPrintDocument(params: {
  htmlContent: string;
  cssContent?: string;
  context: PrintContext;
  paperSize?: string;
  orientation?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}): string {
  const {
    htmlContent,
    cssContent = "",
    context,
    paperSize = "A4",
    orientation = "portrait",
    marginTop = 20,
    marginRight = 20,
    marginBottom = 20,
    marginLeft = 20,
  } = params;

  // 构建扁平化的变量上下文
  const flatContext: Record<string, any> = {
    // 公司信息
    "company.name": context.company.name,
    "company.nameEn": context.company.nameEn || "",
    "company.address": context.company.address || "",
    "company.addressEn": context.company.addressEn || "",
    "company.phone": context.company.phone || "",
    "company.email": context.company.email || "",
    "company.website": context.company.website || "",
    "company.contactName": context.company.contactName || "",
    "company.contactNameEn": context.company.contactNameEn || "",
    "company.whatsapp": context.company.whatsapp || "",
    "company.logoUrl": context.company.logoUrl || "",
    "printTime": context.printTime,
    "printDate": context.printDate,
    // 业务数据（展开到顶层）
    ...context.data,
  };

  // 渲染 HTML 模版
  const renderedHtml = renderTemplate(htmlContent, flatContext);

  // 纸张尺寸映射
  const paperSizes: Record<string, string> = {
    A4: "210mm 297mm",
    A5: "148mm 210mm",
    Letter: "216mm 279mm",
    custom: "auto",
  };

  const pageSize = orientation === "landscape"
    ? (paperSizes[paperSize] || paperSizes.A4).split(" ").reverse().join(" ")
    : (paperSizes[paperSize] || paperSizes.A4);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>打印文档</title>
  <style>
    /* ===== 基础重置 ===== */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
    }
    table { border-collapse: collapse; width: 100%; }
    img { max-width: 100%; }

    /* ===== 打印样式 ===== */
    @page {
      size: ${pageSize};
      margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }

    /* ===== 用户自定义样式 ===== */
    ${cssContent}
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
}

/**
 * 执行打印
 * 打开新窗口并触发浏览器打印
 */
export function executePrint(params: {
  htmlContent: string;
  cssContent?: string;
  context: PrintContext;
  paperSize?: string;
  orientation?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}): void {
  const fullHtml = buildPrintDocument(params);
  
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }
}

/**
 * 获取预览 HTML（用于 iframe 预览）
 * 与打印输出完全一致，确保所见即所得
 */
export function getPreviewHtml(params: {
  htmlContent: string;
  cssContent?: string;
  context: PrintContext;
  paperSize?: string;
  orientation?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}): string {
  return buildPrintDocument(params);
}

// ==================== 辅助函数 ====================

/**
 * 创建打印上下文
 */
export function createPrintContext(
  companyInfo: any,
  data: Record<string, any>,
): PrintContext {
  const now = new Date();
  return {
    company: {
      name: companyInfo?.companyNameCn || "",
      nameEn: companyInfo?.companyNameEn || "",
      address: companyInfo?.addressCn || "",
      addressEn: companyInfo?.addressEn || "",
      phone: companyInfo?.phone || "",
      email: companyInfo?.email || "",
      website: companyInfo?.website || "",
      contactName: companyInfo?.contactNameCn || "",
      contactNameEn: companyInfo?.contactNameEn || "",
      whatsapp: companyInfo?.whatsapp || "",
      logoUrl: companyInfo?.logoUrl || "",
    },
    data,
    printTime: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`,
    printDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`,
  };
}

// ==================== SpreadsheetData → 可渲染 HTML ====================

interface CellStyleData {
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: string;
  verticalAlign?: string;
  bgColor?: string;
  color?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
}

function buildCellStyle(cd: CellStyleData): string {
  let style = `padding:2px 4px;`;
  if (cd.fontSize) style += `font-size:${cd.fontSize}pt;`;
  if (cd.fontFamily) style += `font-family:${cd.fontFamily};`;
  if (cd.bold) style += `font-weight:bold;`;
  if (cd.italic) style += `font-style:italic;`;
  if (cd.underline) style += `text-decoration:underline;`;
  if (cd.textAlign) style += `text-align:${cd.textAlign};`;
  if (cd.verticalAlign) style += `vertical-align:${cd.verticalAlign};`;
  if (cd.bgColor) style += `background-color:${cd.bgColor};`;
  if (cd.color) style += `color:${cd.color};`;
  if (cd.borderTop && cd.borderTop !== "none") style += `border-top:${cd.borderTop};`;
  if (cd.borderRight && cd.borderRight !== "none") style += `border-right:${cd.borderRight};`;
  if (cd.borderBottom && cd.borderBottom !== "none") style += `border-bottom:${cd.borderBottom};`;
  if (cd.borderLeft && cd.borderLeft !== "none") style += `border-left:${cd.borderLeft};`;
  return style;
}

/**
 * 将 SpreadsheetData 转为可渲染的 HTML（含 {{变量}} 语法）
 */
export function spreadsheetToRenderableHtml(data: any): string {
  const { cells, rowCount, colCount, colWidths, rowHeights } = data;
  let html = `<table style="border-collapse:collapse;width:100%;table-layout:fixed;">`;
  html += `<colgroup>`;
  for (let c = 0; c < colCount; c++) {
    html += `<col style="width:${colWidths?.[c] || 100}px;">`;
  }
  html += `</colgroup>`;

  for (let r = 0; r < rowCount; r++) {
    const rh = rowHeights?.[r] || 24;
    let rowHasEachStart = false;
    let rowHasEachEnd = false;
    let eachArrayName = "";
    for (let c = 0; c < colCount; c++) {
      const cell = cells[`${r},${c}`];
      if (!cell || cell.merged) continue;
      const val = cell.value || "";
      const eachMatch = val.match(/\{\{#each\s+([\w.]+)\}\}/);
      if (eachMatch) { rowHasEachStart = true; eachArrayName = eachMatch[1]; }
      if (val.includes("{{/each}}")) { rowHasEachEnd = true; }
    }

    if (rowHasEachStart && rowHasEachEnd) {
      html += `{{#each ${eachArrayName}}}`;
      html += `<tr style="height:${rh}px;">`;
      for (let c = 0; c < colCount; c++) {
        const key = `${r},${c}`;
        const cell = cells[key];
        if (cell?.merged) continue;
        const cd = cell || { value: "" };
        const rs = cd.rowSpan && cd.rowSpan > 1 ? ` rowspan="${cd.rowSpan}"` : "";
        const cs = cd.colSpan && cd.colSpan > 1 ? ` colspan="${cd.colSpan}"` : "";
        const style = buildCellStyle(cd);
        let value = cd.value || "";
        value = value.replace(/\{\{#each\s+[\w.]+\}\}/g, "");
        value = value.replace(/\{\{\/each\}\}/g, "");
        value = value.replace(new RegExp(`\\$\\{${eachArrayName}\\.([^}]+)\\}`, 'g'), '{{$1}}');
        value = value.replace(/\$\{([^}]+)\}/g, "{{$1}}");
        value = value.trim();
        html += `<td${rs}${cs} style="${style}">${value}</td>`;
      }
      html += `</tr>`;
      html += `{{/each}}`;
    } else {
      html += `<tr style="height:${rh}px;">`;
      for (let c = 0; c < colCount; c++) {
        const key = `${r},${c}`;
        const cell = cells[key];
        if (cell?.merged) continue;
        const cd = cell || { value: "" };
        const rs = cd.rowSpan && cd.rowSpan > 1 ? ` rowspan="${cd.rowSpan}"` : "";
        const cs = cd.colSpan && cd.colSpan > 1 ? ` colspan="${cd.colSpan}"` : "";
        const style = buildCellStyle(cd);
        let value = cd.value || "";
        value = value.replace(/\$\{([^}]+)\}/g, "{{$1}}");
        html += `<td${rs}${cs} style="${style}">${value}</td>`;
      }
      html += `</tr>`;
    }
  }
  html += `</table>`;
  return html;
}

/**
 * 解析 htmlContent 字段：
 * - 如果是 JSON 格式的 SpreadsheetData，反序列化后转为 HTML
 * - 如果是普通 HTML，直接返回
 */
export function resolveTemplateHtml(htmlContent: string): {
  html: string;
  paperSize?: string;
  orientation?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
} {
  if (!htmlContent) return { html: "" };
  try {
    const parsed = JSON.parse(htmlContent);
    if (parsed.cells && parsed.rowCount) {
      return {
        html: spreadsheetToRenderableHtml(parsed),
        paperSize: parsed.paperSize,
        orientation: parsed.orientation,
        marginTop: parsed.marginTop,
        marginRight: parsed.marginRight,
        marginBottom: parsed.marginBottom,
        marginLeft: parsed.marginLeft,
      };
    }
  } catch {
    // 不是 JSON，当作普通 HTML
  }
  return { html: htmlContent };
}
