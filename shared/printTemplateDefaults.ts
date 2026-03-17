import type { StoredPrintTemplate } from "./printTemplateRenderer";
import {
  buildSalesOrderVisualTemplate,
  getDefaultSalesOrderVisualConfig,
} from "./salesPrintTemplateVisual";

export const DEFAULT_SALES_ORDER_ZH_TEMPLATE: StoredPrintTemplate = buildSalesOrderVisualTemplate(
  getDefaultSalesOrderVisualConfig("zh"),
);

export const DEFAULT_SALES_ORDER_EN_TEMPLATE: StoredPrintTemplate = buildSalesOrderVisualTemplate(
  getDefaultSalesOrderVisualConfig("en"),
);

export const DEFAULT_SALES_ORDER_TEMPLATE = DEFAULT_SALES_ORDER_ZH_TEMPLATE;
