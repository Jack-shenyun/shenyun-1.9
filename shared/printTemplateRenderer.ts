export type StoredPrintTemplate = {
  css: string;
  html: string;
  name: string;
  description: string;
};

export type TemplateVariableValue =
  | string
  | number
  | null
  | undefined
  | {
      raw: string;
    };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function rawTemplateValue(raw: string) {
  return { raw };
}

export function renderPrintTemplate(
  template: StoredPrintTemplate | null | undefined,
  variables: Record<string, TemplateVariableValue>,
): { __html: string } | null {
  if (!template) return null;

  const renderedHtml = template.html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const variable = variables[key];
    if (variable == null) return "";
    if (typeof variable === "object" && "raw" in variable) {
      return variable.raw;
    }
    return escapeHtml(String(variable));
  });

  return {
    __html: `<style>${template.css}</style>${renderedHtml}`,
  };
}
