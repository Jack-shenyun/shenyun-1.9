import { TEMPLATE_DEFINITIONS } from "../client/src/lib/printTemplateDefaults";
import { CUSTOMS_PRINT_TEMPLATE_DEFAULTS } from "../shared/customsPrintTemplateDefaults";
import {
  DEFAULT_SALES_ORDER_EN_TEMPLATE,
  DEFAULT_SALES_ORDER_ZH_TEMPLATE,
} from "../shared/printTemplateDefaults";

type DefaultPrintTemplateRow = {
  templateId: string;
  module: string | null;
  name: string;
  description: string | null;
  editorType: string | null;
  editorConfig: string | null;
  css: string;
  html: string;
};

function fromClientDefinition(
  templateId: string,
  definition: (typeof TEMPLATE_DEFINITIONS)[number],
): DefaultPrintTemplateRow {
  return {
    templateId,
    module: definition.module ? String(definition.module) : null,
    name: String(definition.name || templateId),
    description: definition.description ? String(definition.description) : null,
    editorType: null,
    editorConfig: null,
    css: String(definition.defaultCss || ""),
    html: String(definition.defaultHtml || ""),
  };
}

function fromStoredTemplate(
  templateId: string,
  module: string,
  template: {
    name: string;
    description: string;
    css: string;
    html: string;
  },
  editorType: string | null = null,
): DefaultPrintTemplateRow {
  return {
    templateId,
    module,
    name: template.name,
    description: template.description || null,
    editorType,
    editorConfig: null,
    css: template.css,
    html: template.html,
  };
}

function buildDefaultTemplateMap() {
  const rows = new Map<string, DefaultPrintTemplateRow>();

  for (const definition of TEMPLATE_DEFINITIONS) {
    rows.set(definition.templateKey, fromClientDefinition(definition.templateKey, definition));
  }

  rows.set(
    "sales_order_zh",
    fromStoredTemplate("sales_order_zh", "sales", DEFAULT_SALES_ORDER_ZH_TEMPLATE, "sales_order_wysiwyg_v1"),
  );
  rows.set(
    "sales_order_en",
    fromStoredTemplate("sales_order_en", "sales", DEFAULT_SALES_ORDER_EN_TEMPLATE, "sales_order_wysiwyg_v1"),
  );

  for (const [templateId, template] of Object.entries(CUSTOMS_PRINT_TEMPLATE_DEFAULTS)) {
    rows.set(templateId, fromStoredTemplate(templateId, "sales", template));
  }

  return rows;
}

export const DEFAULT_PRINT_TEMPLATE_ROWS = Array.from(buildDefaultTemplateMap().values());
