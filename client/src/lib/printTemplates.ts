import { renderTemplate, resolveTemplateHtml, spreadsheetToRenderableHtml } from "@/lib/printEngine";

export { rawTemplateValue, renderPrintTemplate } from "@shared/printTemplateRenderer";
export type { StoredPrintTemplate, TemplateVariableValue } from "@shared/printTemplateRenderer";

function parseSpreadsheetTemplate(editorConfig: unknown) {
  if (!editorConfig) return null;
  try {
    const parsed = typeof editorConfig === "string" ? JSON.parse(editorConfig) : editorConfig;
    if (parsed?.cells && parsed?.rowCount) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function normalizeStoredPrintTemplate(template: any) {
  if (!template) return null;

  const css = String(template?.css ?? template?.cssContent ?? "");
  const spreadsheetData = parseSpreadsheetTemplate(template?.editorConfig);

  if (String(template?.editorType || "").toLowerCase() === "spreadsheet" && spreadsheetData) {
    return {
      html: spreadsheetToRenderableHtml(spreadsheetData),
      css,
      paperSize: spreadsheetData.paperSize,
      orientation: spreadsheetData.orientation,
      marginTop: spreadsheetData.marginTop,
      marginRight: spreadsheetData.marginRight,
      marginBottom: spreadsheetData.marginBottom,
      marginLeft: spreadsheetData.marginLeft,
    };
  }

  const htmlSource = String(template?.html ?? template?.htmlContent ?? "");
  if (!htmlSource) return null;

  const resolved = resolveTemplateHtml(htmlSource);
  return {
    html: resolved.html,
    css,
    paperSize: resolved.paperSize ?? template?.paperSize,
    orientation: resolved.orientation ?? template?.orientation,
    marginTop: resolved.marginTop ?? template?.marginTop,
    marginRight: resolved.marginRight ?? template?.marginRight,
    marginBottom: resolved.marginBottom ?? template?.marginBottom,
    marginLeft: resolved.marginLeft ?? template?.marginLeft,
  };
}

export function renderStoredPrintTemplate(template: any, variables: Record<string, any>) {
  const normalized = normalizeStoredPrintTemplate(template);
  if (!normalized) return null;
  const renderedHtml = renderTemplate(normalized.html, variables);
  return {
    __html: `${normalized.css ? `<style>${normalized.css}</style>` : ""}${renderedHtml}`,
    paperSize: normalized.paperSize,
    orientation: normalized.orientation,
    marginTop: normalized.marginTop,
    marginRight: normalized.marginRight,
    marginBottom: normalized.marginBottom,
    marginLeft: normalized.marginLeft,
  };
}
