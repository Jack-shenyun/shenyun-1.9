import { existsSync } from "node:fs";
import puppeteer from "puppeteer";
import {
  buildPrintDocument,
  createPrintContext,
  resolveTemplateHtml,
  spreadsheetToRenderableHtml,
} from "../client/src/lib/printEngine";
import { DEFAULT_PRINT_TEMPLATE_ROWS } from "./printTemplateCatalog";
import { getCompanyInfo, getPrintTemplates } from "./db";

const CHROME_EXECUTABLE_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

type NormalizedPrintTemplate = {
  templateKey: string;
  name: string;
  htmlContent: string;
  cssContent: string;
  paperSize?: string;
  orientation?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
};

function parseSpreadsheetTemplate(editorConfig: unknown) {
  if (!editorConfig) return null;
  try {
    const parsed =
      typeof editorConfig === "string" ? JSON.parse(editorConfig) : editorConfig;
    if (parsed?.cells && parsed?.rowCount) return parsed;
  } catch {
    return null;
  }
  return null;
}

function normalizeStoredPrintTemplate(template: any): NormalizedPrintTemplate | null {
  if (!template) return null;

  const cssContent = String(template?.css ?? "");
  const spreadsheetData = parseSpreadsheetTemplate(template?.editorConfig);

  if (
    String(template?.editorType || "").toLowerCase() === "spreadsheet" &&
    spreadsheetData
  ) {
    return {
      templateKey: String(template.templateId || ""),
      name: String(template.name || template.templateId || "打印模板"),
      htmlContent: spreadsheetToRenderableHtml(spreadsheetData),
      cssContent,
      paperSize: spreadsheetData.paperSize,
      orientation: spreadsheetData.orientation,
      marginTop: spreadsheetData.marginTop,
      marginRight: spreadsheetData.marginRight,
      marginBottom: spreadsheetData.marginBottom,
      marginLeft: spreadsheetData.marginLeft,
    };
  }

  const resolved = resolveTemplateHtml(String(template?.html ?? ""));
  if (!resolved.html) return null;

  return {
    templateKey: String(template.templateId || ""),
    name: String(template.name || template.templateId || "打印模板"),
    htmlContent: resolved.html,
    cssContent,
    paperSize: resolved.paperSize ?? template?.paperSize,
    orientation: resolved.orientation ?? template?.orientation,
    marginTop: resolved.marginTop ?? template?.marginTop,
    marginRight: resolved.marginRight ?? template?.marginRight,
    marginBottom: resolved.marginBottom ?? template?.marginBottom,
    marginLeft: resolved.marginLeft ?? template?.marginLeft,
  };
}

function safeFileSegment(value: string): string {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPdfFileName(
  title: string | undefined,
  template: NormalizedPrintTemplate,
): string {
  const preferred =
    safeFileSegment(String(title || "").replace(/打印预览/g, "").trim()) ||
    safeFileSegment(template.name) ||
    safeFileSegment(template.templateKey) ||
    "打印文件";
  return preferred.toLowerCase().endsWith(".pdf") ? preferred : `${preferred}.pdf`;
}

function toAbsoluteAssetUrl(value: string | null | undefined, origin?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!origin) return raw;
  const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return raw.startsWith("/")
    ? `${normalizedOrigin}${raw}`
    : `${normalizedOrigin}/${raw}`;
}

function injectBaseHref(documentHtml: string, origin?: string) {
  if (!origin) return documentHtml;
  const normalizedBase = origin.endsWith("/") ? origin : `${origin}/`;
  if (/<base\s/i.test(documentHtml)) return documentHtml;
  return documentHtml.replace(
    /<head>/i,
    `<head>\n  <base href="${normalizedBase}" />`,
  );
}

async function resolveTemplateByKey(templateKey: string) {
  const templates = await getPrintTemplates();
  const matched =
    templates.find(
      (item) => String(item.templateId || item.templateKey || "") === templateKey,
    ) ||
    DEFAULT_PRINT_TEMPLATE_ROWS.find(
      (item) => String(item.templateId || "") === templateKey,
    );
  if (!matched) {
    throw new Error(`未找到打印模板：${templateKey}`);
  }
  const normalized = normalizeStoredPrintTemplate(matched);
  if (!normalized) {
    throw new Error(`打印模板不可用：${templateKey}`);
  }
  return normalized;
}

function resolveExecutablePath() {
  return existsSync(CHROME_EXECUTABLE_PATH) ? CHROME_EXECUTABLE_PATH : undefined;
}

export async function renderPrintTemplatePdf(params: {
  templateKey: string;
  data: Record<string, any>;
  title?: string;
  companyId?: number | null;
  origin?: string;
}) {
  const template = await resolveTemplateByKey(params.templateKey);
  const companyInfo = await getCompanyInfo(params.companyId ?? undefined);
  const context = createPrintContext(
    {
      ...(companyInfo || {}),
      logoUrl: toAbsoluteAssetUrl(companyInfo?.logoUrl, params.origin),
    },
    params.data,
  );

  const fullHtml = injectBaseHref(
    buildPrintDocument({
      htmlContent: template.htmlContent,
      cssContent: template.cssContent,
      context,
      paperSize: template.paperSize,
      orientation: template.orientation,
      marginTop: template.marginTop,
      marginRight: template.marginRight,
      marginBottom: template.marginBottom,
      marginLeft: template.marginLeft,
    }),
    params.origin,
  );

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveExecutablePath(),
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return {
      title: params.title || template.name,
      fileName: buildPdfFileName(params.title, template),
      pdfBytes: Buffer.from(pdfBytes),
    };
  } finally {
    await browser.close();
  }
}
