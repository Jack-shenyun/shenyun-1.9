import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Printer,
  FileText,
  Edit,
  Eye,
  ShoppingCart,
  Truck,
  Receipt,
  Factory,
  Package,
  ClipboardCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/formatters";
import {
  TEMPLATE_DEFINITIONS,
  getTemplateDefinition,
  generateExampleContext,
} from "@/lib/printTemplateDefaults";
import {
  buildPrintDocument,
  createPrintContext,
  spreadsheetToRenderableHtml,
} from "@/lib/printEngine";
import SpreadsheetEditor, {
  type SpreadsheetData,
  type FieldGroup,
  createEmptySpreadsheet,
} from "@/components/print/SpreadsheetEditor";
import QRCode from "qrcode";
import { buildRenderedPrintDocument, buildSalesDocumentTemplateRender, type SalesDocumentPrintPayload } from "@/lib/salesDocumentPrint";

const api = trpc as any;

// ==================== 图标映射 ====================
const ICON_MAP: Record<string, React.ElementType> = {
  sales_order_zh: ShoppingCart,
  sales_order_en: ShoppingCart,
  sales_quote_zh: FileText,
  sales_quote_en: FileText,
  sales_order: ShoppingCart,
  delivery_note: Truck,
  receipt: Receipt,
  purchase_order: Package,
  production_order: Factory,
  iqc_inspection: ClipboardCheck,
  goods_receipt: Package,
  large_packaging: Package,
  release_record: ClipboardCheck,
  pending_scrap_record: FileText,
  material_requisition: Package,
  warehouse_in: Package,
  warehouse_out: Truck,
  inventory_check: ClipboardCheck,
  ipqc_inspection: ClipboardCheck,
  oqc_inspection: ClipboardCheck,
  production_flow_card: Factory,
  expense_claim: Receipt,
  leave_request: FileText,
  overtime_request: FileText,
  outing_request: FileText,
  sterilization_outsource: Package,
  customs_declaration: FileText,
};

const COLOR_MAP: Record<string, string> = {
  sales: "bg-emerald-50 border-emerald-200 text-emerald-700",
  purchase: "bg-cyan-50 border-cyan-200 text-cyan-700",
  production: "bg-orange-50 border-orange-200 text-orange-700",
  quality: "bg-violet-50 border-violet-200 text-violet-700",
  warehouse: "bg-amber-50 border-amber-200 text-amber-700",
  admin: "bg-slate-50 border-slate-200 text-slate-700",
};

const MODULE_LABELS: Record<string, string> = {
  sales: "销售部",
  purchase: "采购部",
  production: "生产部",
  quality: "质量部",
  warehouse: "仓储部",
  admin: "行政部",
};

function getPaperMetrics(paperSize = "A4", orientation = "portrait") {
  const base = (() => {
    switch (paperSize) {
      case "A5":
        return { widthMm: 148, heightMm: 210 };
      case "Letter":
        return { widthMm: 216, heightMm: 279 };
      case "A4":
      default:
        return { widthMm: 210, heightMm: 297 };
    }
  })();

  return orientation === "landscape"
    ? { widthMm: base.heightMm, heightMm: base.widthMm }
    : base;
}

const PREPAY_RATIO_MARKER = "[PREPAY_RATIO]";
const TAX_INCLUDED_MARKER = "[TAX_INCLUDED]";

function isSalesOrderTemplateKey(templateKey?: string | null) {
  return templateKey === "sales_order_zh" || templateKey === "sales_order_en";
}

function isSalesQuoteTemplateKey(templateKey?: string | null) {
  return templateKey === "sales_quote_zh" || templateKey === "sales_quote_en";
}

function parseTaxIncludedFromRemark(remark: unknown): boolean {
  const text = String(remark ?? "");
  const markerLine = text
    .split("\n")
    .find((line) => line.startsWith(TAX_INCLUDED_MARKER));
  if (!markerLine) return true;
  return markerLine.slice(TAX_INCLUDED_MARKER.length).trim() !== "0";
}

function stripPrepayRatioFromRemark(remark: unknown): string {
  return String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(PREPAY_RATIO_MARKER))
    .join("\n")
    .trim();
}

function stripTaxIncludedFromRemark(remark: unknown): string {
  return String(remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(TAX_INCLUDED_MARKER))
    .join("\n")
    .trim();
}

function stripQuoteMetaFromRemark(remark: unknown): string {
  return stripTaxIncludedFromRemark(stripPrepayRatioFromRemark(remark));
}

function toDateText(value: unknown): string {
  const formatted = formatDate(value as any);
  return formatted === "-" ? "" : formatted;
}

function buildSalesOrderPreviewPayload(detail: any): SalesDocumentPrintPayload | null {
  const order = detail?.order;
  if (!order) return null;
  const items = Array.isArray(detail?.items) ? detail.items : [];
  return {
    orderNumber: String(order.orderNo || ""),
    orderDate: toDateText(order.orderDate),
    deliveryDate: toDateText(order.deliveryDate),
    customerName: String(order.customerName || ""),
    customerCode: String(order.customerCode || ""),
    customerType: String(order.customerType || ""),
    customerCountry: String(order.country || ""),
    shippingAddress: String(order.shippingAddress || ""),
    shippingContact: String(order.shippingContact || order.contactPerson || ""),
    shippingPhone: String(order.shippingPhone || order.phone || ""),
    paymentMethod: String(order.paymentMethod || ""),
    status: String(order.status || ""),
    totalAmount: parseFloat(String(order.totalAmount || "0")) || 0,
    currency: String(order.currency || "CNY"),
    items: items.map((item: any) => ({
      productName: String(item.productName || ""),
      productCode: String(item.productCode || ""),
      specification: String(item.specification || ""),
      quantity: parseFloat(String(item.quantity || "0")) || 0,
      unitPrice: parseFloat(String(item.unitPrice || "0")) || 0,
      amount: parseFloat(String(item.amount || "0")) || 0,
    })),
    notes: String(order.remark || ""),
    salesPersonName: String(order.salesPersonEnglishName || order.salesPersonName || ""),
    tradeTerm: String(order.tradeTerm || ""),
    shippingFee: parseFloat(String(order.shippingFee || "0")) || 0,
    paymentAccount: String(order.receiptAccountName || ""),
    paymentAccountId: order.receiptAccountId ?? null,
  };
}

function buildSalesQuotePreviewPayload(detail: any): SalesDocumentPrintPayload | null {
  const quote = detail?.quote;
  if (!quote) return null;
  const items = Array.isArray(detail?.items) ? detail.items : [];
  return {
    orderNumber: String(quote.quoteNo || ""),
    orderDate: toDateText(quote.quoteDate),
    deliveryDate: toDateText(quote.deliveryDate),
    customerName: String(quote.customerName || ""),
    customerCode: String(quote.customerCode || ""),
    customerType: String(quote.customerType || ""),
    customerCountry: String(quote.country || ""),
    shippingAddress: String(quote.shippingAddress || ""),
    shippingContact: String(quote.shippingContact || quote.contactPerson || ""),
    shippingPhone: String(quote.shippingPhone || quote.phone || ""),
    paymentMethod: String(quote.paymentMethod || ""),
    status: String(quote.status || "draft"),
    totalAmount: parseFloat(String(quote.totalAmount || "0")) || 0,
    currency: String(quote.currency || "CNY"),
    items: items.map((item: any) => ({
      productName: String(item.productName || ""),
      productCode: String(item.productCode || ""),
      specification: String(item.specification || ""),
      quantity: parseFloat(String(item.quantity || "0")) || 0,
      unitPrice: parseFloat(String(item.unitPrice || "0")) || 0,
      amount: parseFloat(String(item.amount || "0")) || 0,
    })),
    notes: [
      `报价口径：${parseTaxIncludedFromRemark(quote.remark) ? "含税" : "未税"}`,
      stripQuoteMetaFromRemark(quote.remark || ""),
    ].filter(Boolean).join("\n"),
    salesPersonName: String(quote.salesPersonEnglishName || quote.salesPersonName || ""),
    tradeTerm: String(quote.tradeTerm || ""),
    shippingFee: 0,
    paymentAccount: String(quote.receiptAccountName || ""),
    paymentAccountId: quote.receiptAccountId ?? null,
  };
}

function buildSalesDocumentExamplePayload(exampleData: Record<string, any>): SalesDocumentPrintPayload {
  return {
    orderNumber: String(exampleData.orderNumber || ""),
    orderDate: String(exampleData.orderDate || ""),
    deliveryDate: String(exampleData.deliveryDate || ""),
    customerName: String(exampleData.customerName || ""),
    customerCode: String(exampleData.customerCode || ""),
    customerType: "",
    customerCountry: String(exampleData.customerCountry || ""),
    shippingAddress: String(exampleData.shippingAddress || ""),
    shippingContact: String(exampleData.shippingContact || ""),
    shippingPhone: String(exampleData.shippingPhone || ""),
    paymentMethod: String(exampleData.paymentMethod || exampleData.paymentTerms || ""),
    status: "draft",
    totalAmount: parseFloat(String(exampleData.totalAmountPlain || 0)) || 0,
    currency: String(exampleData.currency || "CNY"),
    items: Array.isArray(exampleData.items)
      ? exampleData.items.map((item: any) => ({
          productName: String(item.productName || ""),
          productCode: String(item.productCode || ""),
          specification: String(item.specification || ""),
          quantity: parseFloat(String(item.quantity || "0")) || 0,
          unitPrice: parseFloat(String(item.unitPrice || "0").replace(/[^\d.-]/g, "")) || 0,
          amount: parseFloat(String(item.amount || "0").replace(/[^\d.-]/g, "")) || 0,
        }))
      : [],
    notes: String(exampleData.notes || ""),
    salesPersonName: String(exampleData.salesRep || ""),
    tradeTerm: String(exampleData.tradeTerm || ""),
    shippingFee: parseFloat(String(exampleData.shippingFee || "0").replace(/[^\d.-]/g, "")) || 0,
    paymentAccount: String(exampleData.paymentAccount || ""),
    paymentAccountId: null,
  };
}

// ==================== 默认模板数据（SpreadsheetData 格式）====================

function createSalesOrderTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(25, 8);
  data.colWidths = [40, 120, 80, 80, 60, 80, 80, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 24, 6, 24, 24, 24, 24, 24, 24, 24, 24, 24, 6, 24, 24, 24, 6, 28, 24, 24];

  const c = data.cells;
  // 标题行 - 合并全部列
  c["0,0"] = { value: "${company.name}", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };

  // 副标题
  c["1,0"] = { value: "销 售 订 单", bold: true, fontSize: 14, textAlign: "center", verticalAlign: "middle", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  // 空行
  c["2,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  // 基本信息区
  const infoStyle = { fontSize: 9, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  c["3,0"] = { value: "订单编号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${orderNumber}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "订单日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${orderDate}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "客户名称：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${customerName}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "交货日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${deliveryDate}", ...infoStyle, colSpan: 2 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "收货地址：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,1"] = { value: "", merged: true, mergeParent: "5,0" };
  c["5,2"] = { value: "${shippingAddress}", ...infoStyle, colSpan: 6 };
  for (let i = 3; i < 8; i++) c[`5,${i}`] = { value: "", merged: true, mergeParent: "5,2" };

  c["6,0"] = { value: "联系人：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["6,1"] = { value: "", merged: true, mergeParent: "6,0" };
  c["6,2"] = { value: "${shippingContact}", ...infoStyle, colSpan: 2 };
  c["6,3"] = { value: "", merged: true, mergeParent: "6,2" };
  c["6,4"] = { value: "联系电话：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["6,5"] = { value: "", merged: true, mergeParent: "6,4" };
  c["6,6"] = { value: "${shippingPhone}", ...infoStyle, colSpan: 2 };
  c["6,7"] = { value: "", merged: true, mergeParent: "6,6" };

  // 空行
  c["7,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`7,${i}`] = { value: "", merged: true, mergeParent: "7,0" };

  // 产品明细表头
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#e8edf5", borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  c["8,0"] = { value: "序号", ...headerStyle };
  c["8,1"] = { value: "产品名称", ...headerStyle };
  c["8,2"] = { value: "产品编码", ...headerStyle };
  c["8,3"] = { value: "规格型号", ...headerStyle };
  c["8,4"] = { value: "数量", ...headerStyle };
  c["8,5"] = { value: "单价", ...headerStyle };
  c["8,6"] = { value: "金额", ...headerStyle };
  c["8,7"] = { value: "备注", ...headerStyle };

  // 明细行（循环标记）
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  // 循环开始标记行
  c["9,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["9,1"] = { value: "${items.productName}", ...bodyStyle, textAlign: "left" };
  c["9,2"] = { value: "${items.productCode}", ...bodyStyle };
  c["9,3"] = { value: "${items.specification}", ...bodyStyle };
  c["9,4"] = { value: "${items.quantity}", ...bodyStyle };
  c["9,5"] = { value: "${items.unitPrice}", ...bodyStyle };
  c["9,6"] = { value: "${items.amount}", ...bodyStyle };
  c["9,7"] = { value: "{{/each}}", ...bodyStyle };

  // 合计行
  c["10,0"] = { value: "", ...bodyStyle, colSpan: 6, textAlign: "right", bold: true };
  for (let i = 1; i < 6; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,0"].value = "合计金额：";
  c["10,6"] = { value: "${totalAmount | currency}", ...bodyStyle, bold: true, colSpan: 2 };
  c["10,7"] = { value: "", merged: true, mergeParent: "10,6" };

  // 空行
  c["11,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`11,${i}`] = { value: "", merged: true, mergeParent: "11,0" };

  // 备注
  c["12,0"] = { value: "备注：", bold: true, fontSize: 9, colSpan: 2, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  c["12,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,2"] = { value: "${notes}", fontSize: 9, colSpan: 6, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 3; i < 8; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,2" };

  // 空行
  c["13,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`13,${i}`] = { value: "", merged: true, mergeParent: "13,0" };

  // 签名区
  const sigStyle = { fontSize: 9, textAlign: "center" as const, borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000", bold: true, bgColor: "#f0f0f0" };
  c["14,0"] = { value: "制单人", ...sigStyle, colSpan: 2 };
  c["14,1"] = { value: "", merged: true, mergeParent: "14,0" };
  c["14,2"] = { value: "审核人", ...sigStyle, colSpan: 2 };
  c["14,3"] = { value: "", merged: true, mergeParent: "14,2" };
  c["14,4"] = { value: "客户确认", ...sigStyle, colSpan: 2 };
  c["14,5"] = { value: "", merged: true, mergeParent: "14,4" };
  c["14,6"] = { value: "日期", ...sigStyle, colSpan: 2 };
  c["14,7"] = { value: "", merged: true, mergeParent: "14,6" };

  // 签名空行
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  c["15,0"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["15,1"] = { value: "", merged: true, mergeParent: "15,0" };
  c["16,0"] = { value: "", merged: true, mergeParent: "15,0" };
  c["16,1"] = { value: "", merged: true, mergeParent: "15,0" };
  c["15,2"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["15,3"] = { value: "", merged: true, mergeParent: "15,2" };
  c["16,2"] = { value: "", merged: true, mergeParent: "15,2" };
  c["16,3"] = { value: "", merged: true, mergeParent: "15,2" };
  c["15,4"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["15,5"] = { value: "", merged: true, mergeParent: "15,4" };
  c["16,4"] = { value: "", merged: true, mergeParent: "15,4" };
  c["16,5"] = { value: "", merged: true, mergeParent: "15,4" };
  c["15,6"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["15,7"] = { value: "", merged: true, mergeParent: "15,6" };
  c["16,6"] = { value: "", merged: true, mergeParent: "15,6" };
  c["16,7"] = { value: "", merged: true, mergeParent: "15,6" };

  // 页脚
  c["17,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`17,${i}`] = { value: "", merged: true, mergeParent: "17,0" };

  c["18,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 4, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 4; i++) c[`18,${i}`] = { value: "", merged: true, mergeParent: "18,0" };
  c["18,4"] = { value: "${company.phone}", fontSize: 8, color: "#999", textAlign: "right", colSpan: 4, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 5; i < 8; i++) c[`18,${i}`] = { value: "", merged: true, mergeParent: "18,4" };

  return data;
}

function createPurchaseOrderTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(22, 8);
  data.colWidths = [40, 120, 80, 80, 60, 80, 80, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 6, 24, 24, 24, 24, 6, 24, 6, 24, 24, 24, 6, 24, 24, 24, 24];

  const c = data.cells;
  c["0,0"] = { value: "${company.name}", bold: true, fontSize: 16, textAlign: "center", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };

  c["1,0"] = { value: "采 购 订 单", bold: true, fontSize: 14, textAlign: "center", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  const infoStyle = { fontSize: 9, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  c["3,0"] = { value: "采购单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${orderNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "采购日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${orderDate}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "供应商：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${supplierName}", ...infoStyle, colSpan: 6 };
  for (let i = 3; i < 8; i++) c[`4,${i}`] = { value: "", merged: true, mergeParent: "4,2" };

  c["5,0"] = { value: "联系人：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,1"] = { value: "", merged: true, mergeParent: "5,0" };
  c["5,2"] = { value: "${contactPerson}", ...infoStyle, colSpan: 2 };
  c["5,3"] = { value: "", merged: true, mergeParent: "5,2" };
  c["5,4"] = { value: "联系电话：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,5"] = { value: "", merged: true, mergeParent: "5,4" };
  c["5,6"] = { value: "${contactPhone}", ...infoStyle, colSpan: 2 };
  c["5,7"] = { value: "", merged: true, mergeParent: "5,6" };

  c["6,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`6,${i}`] = { value: "", merged: true, mergeParent: "6,0" };

  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#e0f2fe", borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  c["7,0"] = { value: "序号", ...headerStyle };
  c["7,1"] = { value: "产品名称", ...headerStyle };
  c["7,2"] = { value: "产品编码", ...headerStyle };
  c["7,3"] = { value: "规格型号", ...headerStyle };
  c["7,4"] = { value: "数量", ...headerStyle };
  c["7,5"] = { value: "单价", ...headerStyle };
  c["7,6"] = { value: "金额", ...headerStyle };
  c["7,7"] = { value: "备注", ...headerStyle };

  const bodyStyle = { fontSize: 9, textAlign: "center" as const, borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  c["8,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["8,1"] = { value: "${items.productName}", ...bodyStyle, textAlign: "left" };
  c["8,2"] = { value: "${items.productCode}", ...bodyStyle };
  c["8,3"] = { value: "${items.specification}", ...bodyStyle };
  c["8,4"] = { value: "${items.quantity}", ...bodyStyle };
  c["8,5"] = { value: "${items.unitPrice}", ...bodyStyle };
  c["8,6"] = { value: "${items.amount}", ...bodyStyle };
  c["8,7"] = { value: "{{/each}}", ...bodyStyle };

  c["9,0"] = { value: "合计金额：", ...bodyStyle, colSpan: 6, textAlign: "right", bold: true };
  for (let i = 1; i < 6; i++) c[`9,${i}`] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,6"] = { value: "${totalAmount | currency}", ...bodyStyle, bold: true, colSpan: 2 };
  c["9,7"] = { value: "", merged: true, mergeParent: "9,6" };

  c["10,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,0" };

  c["11,0"] = { value: "备注：${remark}", fontSize: 9, colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`11,${i}`] = { value: "", merged: true, mergeParent: "11,0" };

  c["12,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,0" };

  return data;
}

function createProductionOrderTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(22, 8);
  data.colWidths = [40, 120, 80, 80, 60, 80, 80, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 24, 6, 24, 24, 24, 24, 6, 24, 6, 24, 24, 24, 6, 24, 24, 24];

  const c = data.cells;
  c["0,0"] = { value: "${company.name}", bold: true, fontSize: 16, textAlign: "center", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };

  c["1,0"] = { value: "生 产 指 令 单", bold: true, fontSize: 14, textAlign: "center", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  const infoStyle = { fontSize: 9, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  c["3,0"] = { value: "生产单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${orderNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "计划日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${plannedStartDate}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "产品名称：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${productName}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "规格型号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${productSpec}", ...infoStyle, colSpan: 2 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "生产数量：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,1"] = { value: "", merged: true, mergeParent: "5,0" };
  c["5,2"] = { value: "${plannedQty}", ...infoStyle, colSpan: 2 };
  c["5,3"] = { value: "", merged: true, mergeParent: "5,2" };
  c["5,4"] = { value: "批号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,5"] = { value: "", merged: true, mergeParent: "5,4" };
  c["5,6"] = { value: "${batchNo}", ...infoStyle, colSpan: 2 };
  c["5,7"] = { value: "", merged: true, mergeParent: "5,6" };

  c["6,0"] = { value: "关联销售单：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["6,1"] = { value: "", merged: true, mergeParent: "6,0" };
  c["6,2"] = { value: "${planNo}", ...infoStyle, colSpan: 6 };
  for (let i = 3; i < 8; i++) c[`6,${i}`] = { value: "", merged: true, mergeParent: "6,2" };

  c["7,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`7,${i}`] = { value: "", merged: true, mergeParent: "7,0" };

  // BOM 物料表头
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#fef3c7", borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  c["8,0"] = { value: "序号", ...headerStyle };
  c["8,1"] = { value: "物料名称", ...headerStyle };
  c["8,2"] = { value: "物料编码", ...headerStyle };
  c["8,3"] = { value: "规格", ...headerStyle };
  c["8,4"] = { value: "单位用量", ...headerStyle };
  c["8,5"] = { value: "总需求量", ...headerStyle };
  c["8,6"] = { value: "单位", ...headerStyle };
  c["8,7"] = { value: "备注", ...headerStyle };

  const bodyStyle = { fontSize: 9, textAlign: "center" as const, borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  c["9,0"] = { value: "{{#each bomItems}}{{@number}}", ...bodyStyle };
  c["9,1"] = { value: "${bomItems.materialName}", ...bodyStyle, textAlign: "left" };
  c["9,2"] = { value: "${bomItems.materialCode}", ...bodyStyle };
  c["9,3"] = { value: "${bomItems.specification}", ...bodyStyle };
  c["9,4"] = { value: "${bomItems.unitUsage}", ...bodyStyle };
  c["9,5"] = { value: "${bomItems.totalRequired}", ...bodyStyle };
  c["9,6"] = { value: "${bomItems.unit}", ...bodyStyle };
  c["9,7"] = { value: "{{/each}}", ...bodyStyle };

  c["10,0"] = { value: "", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,0" };

  c["11,0"] = { value: "备注：${remark}", fontSize: 9, colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`11,${i}`] = { value: "", merged: true, mergeParent: "11,0" };

  c["12,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  for (let i = 1; i < 8; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,0" };

  return data;
}



// ==================== 辅助函数 ====================
// 批量设置合并单元格（被覆盖的格）
function setMergedCells(c: Record<string, any>, parentKey: string, rows: number[], cols: number[]) {
  for (const r of rows) {
    for (const col of cols) {
      const key = `${r},${col}`;
      if (key !== parentKey) c[key] = { value: "", merged: true, mergeParent: parentKey };
    }
  }
}

// ==================== 物料申请单 ====================
function createMaterialRequisitionTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(20, 8);
  data.colWidths = [40, 120, 120, 80, 80, 60, 60, 100];
  data.rowHeights = [32, 28, 6, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 24, 6, 28, 24, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#e8f5e9", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  // 标题
  c["0,0"] = { value: "物 料 申 请 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 8, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "MATERIAL REQUISITION", bold: false, fontSize: 10, textAlign: "center", verticalAlign: "middle", colSpan: 8, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  // 空行
  c["2,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  // 基本信息
  c["3,0"] = { value: "申请部门：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${department}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "申请日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${applyDate}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "申请人：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${applicantName}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "关联工单：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${productionOrderNo}", ...infoStyle, colSpan: 2 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };

  // 空行
  c["5,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`5,${i}`] = { value: "", merged: true, mergeParent: "5,0" };

  // 表头
  c["6,0"] = { value: "序号", ...headerStyle };
  c["6,1"] = { value: "物料编码", ...headerStyle };
  c["6,2"] = { value: "物料名称", ...headerStyle };
  c["6,3"] = { value: "规格型号", ...headerStyle };
  c["6,4"] = { value: "申请数量", ...headerStyle };
  c["6,5"] = { value: "单位", ...headerStyle };
  c["6,6"] = { value: "需求日期", ...headerStyle };
  c["6,7"] = { value: "备注", ...headerStyle };

  // 明细行
  c["7,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["7,1"] = { value: "${items.materialCode}", ...bodyStyle };
  c["7,2"] = { value: "${items.materialName}", ...bodyStyle, textAlign: "left" };
  c["7,3"] = { value: "${items.specification}", ...bodyStyle };
  c["7,4"] = { value: "${items.quantity}", ...bodyStyle };
  c["7,5"] = { value: "${items.unit}", ...bodyStyle };
  c["7,6"] = { value: "${items.requiredDate}", ...bodyStyle };
  c["7,7"] = { value: "{{/each}}", ...bodyStyle };

  // 空行
  c["8,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  // 签名区
  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["9,0"] = { value: "制单人", ...sigHeaderStyle, colSpan: 2 };
  c["9,1"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,2"] = { value: "部门主管", ...sigHeaderStyle, colSpan: 2 };
  c["9,3"] = { value: "", merged: true, mergeParent: "9,2" };
  c["9,4"] = { value: "仓库审核", ...sigHeaderStyle, colSpan: 2 };
  c["9,5"] = { value: "", merged: true, mergeParent: "9,4" };
  c["9,6"] = { value: "批准人", ...sigHeaderStyle, colSpan: 2 };
  c["9,7"] = { value: "", merged: true, mergeParent: "9,6" };

  c["10,0"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["10,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,0"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,2"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["10,3"] = { value: "", merged: true, mergeParent: "10,2" };
  c["11,2"] = { value: "", merged: true, mergeParent: "10,2" };
  c["11,3"] = { value: "", merged: true, mergeParent: "10,2" };
  c["10,4"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["10,5"] = { value: "", merged: true, mergeParent: "10,4" };
  c["11,4"] = { value: "", merged: true, mergeParent: "10,4" };
  c["11,5"] = { value: "", merged: true, mergeParent: "10,4" };
  c["10,6"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["10,7"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,6"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,7"] = { value: "", merged: true, mergeParent: "10,6" };

  c["12,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,0" };

  return data;
}

// ==================== 入库单 ====================
function createWarehouseInTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(18, 9);
  data.colWidths = [40, 110, 110, 80, 70, 60, 80, 80, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 24, 6, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#e3f2fd", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "入 库 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 9, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 9; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "WAREHOUSE RECEIPT", bold: false, fontSize: 10, textAlign: "center", colSpan: 9, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 9; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "入库单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${inboundNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "入库日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${inboundDate}", ...infoStyle, colSpan: 3 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };
  c["3,8"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "入库类型：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${inboundType}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "仓库：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${warehouseName}", ...infoStyle, colSpan: 3 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };
  c["4,8"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`5,${i}`] = { value: "", merged: true, mergeParent: "5,0" };

  c["6,0"] = { value: "序号", ...headerStyle };
  c["6,1"] = { value: "物料编码", ...headerStyle };
  c["6,2"] = { value: "物料名称", ...headerStyle };
  c["6,3"] = { value: "规格型号", ...headerStyle };
  c["6,4"] = { value: "数量", ...headerStyle };
  c["6,5"] = { value: "单位", ...headerStyle };
  c["6,6"] = { value: "批号", ...headerStyle };
  c["6,7"] = { value: "库位", ...headerStyle };
  c["6,8"] = { value: "备注", ...headerStyle };

  c["7,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["7,1"] = { value: "${items.materialCode}", ...bodyStyle };
  c["7,2"] = { value: "${items.materialName}", ...bodyStyle, textAlign: "left" };
  c["7,3"] = { value: "${items.specification}", ...bodyStyle };
  c["7,4"] = { value: "${items.quantity}", ...bodyStyle };
  c["7,5"] = { value: "${items.unit}", ...bodyStyle };
  c["7,6"] = { value: "${items.batchNo}", ...bodyStyle };
  c["7,7"] = { value: "${items.location}", ...bodyStyle };
  c["7,8"] = { value: "{{/each}}", ...bodyStyle };

  c["8,0"] = { value: "", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["9,0"] = { value: "制单人", ...sigHeaderStyle, colSpan: 3 };
  c["9,1"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,2"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,3"] = { value: "审核人", ...sigHeaderStyle, colSpan: 3 };
  c["9,4"] = { value: "", merged: true, mergeParent: "9,3" };
  c["9,5"] = { value: "", merged: true, mergeParent: "9,3" };
  c["9,6"] = { value: "仓管员", ...sigHeaderStyle, colSpan: 3 };
  c["9,7"] = { value: "", merged: true, mergeParent: "9,6" };
  c["9,8"] = { value: "", merged: true, mergeParent: "9,6" };

  c["10,0"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["10,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,2"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,0"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,2"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,3"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["10,4"] = { value: "", merged: true, mergeParent: "10,3" };
  c["10,5"] = { value: "", merged: true, mergeParent: "10,3" };
  c["11,3"] = { value: "", merged: true, mergeParent: "10,3" };
  c["11,4"] = { value: "", merged: true, mergeParent: "10,3" };
  c["11,5"] = { value: "", merged: true, mergeParent: "10,3" };
  c["10,6"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["10,7"] = { value: "", merged: true, mergeParent: "10,6" };
  c["10,8"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,6"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,7"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,8"] = { value: "", merged: true, mergeParent: "10,6" };

  c["12,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,0" };

  return data;
}

// ==================== 出库单 ====================
function createWarehouseOutTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(18, 9);
  data.colWidths = [40, 110, 110, 80, 70, 60, 80, 80, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 24, 6, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#fff3e0", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "出 库 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 9, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 9; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "WAREHOUSE ISSUE", bold: false, fontSize: 10, textAlign: "center", colSpan: 9, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 9; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "出库单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${outboundNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "出库日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${outboundDate}", ...infoStyle, colSpan: 3 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };
  c["3,8"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "出库类型：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${outboundType}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "领料部门：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${recipientDept}", ...infoStyle, colSpan: 3 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };
  c["4,8"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`5,${i}`] = { value: "", merged: true, mergeParent: "5,0" };

  c["6,0"] = { value: "序号", ...headerStyle };
  c["6,1"] = { value: "物料编码", ...headerStyle };
  c["6,2"] = { value: "物料名称", ...headerStyle };
  c["6,3"] = { value: "规格型号", ...headerStyle };
  c["6,4"] = { value: "数量", ...headerStyle };
  c["6,5"] = { value: "单位", ...headerStyle };
  c["6,6"] = { value: "批号", ...headerStyle };
  c["6,7"] = { value: "库位", ...headerStyle };
  c["6,8"] = { value: "备注", ...headerStyle };

  c["7,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["7,1"] = { value: "${items.materialCode}", ...bodyStyle };
  c["7,2"] = { value: "${items.materialName}", ...bodyStyle, textAlign: "left" };
  c["7,3"] = { value: "${items.specification}", ...bodyStyle };
  c["7,4"] = { value: "${items.quantity}", ...bodyStyle };
  c["7,5"] = { value: "${items.unit}", ...bodyStyle };
  c["7,6"] = { value: "${items.batchNo}", ...bodyStyle };
  c["7,7"] = { value: "${items.location}", ...bodyStyle };
  c["7,8"] = { value: "{{/each}}", ...bodyStyle };

  c["8,0"] = { value: "", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["9,0"] = { value: "制单人", ...sigHeaderStyle, colSpan: 2 };
  c["9,1"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,2"] = { value: "审核人", ...sigHeaderStyle, colSpan: 2 };
  c["9,3"] = { value: "", merged: true, mergeParent: "9,2" };
  c["9,4"] = { value: "领料人", ...sigHeaderStyle, colSpan: 3 };
  c["9,5"] = { value: "", merged: true, mergeParent: "9,4" };
  c["9,6"] = { value: "", merged: true, mergeParent: "9,4" };
  c["9,6"] = { value: "仓管员", ...sigHeaderStyle, colSpan: 3 };
  c["9,7"] = { value: "", merged: true, mergeParent: "9,6" };
  c["9,8"] = { value: "", merged: true, mergeParent: "9,6" };

  c["10,0"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["10,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,0"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,2"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["10,3"] = { value: "", merged: true, mergeParent: "10,2" };
  c["11,2"] = { value: "", merged: true, mergeParent: "10,2" };
  c["11,3"] = { value: "", merged: true, mergeParent: "10,2" };
  c["10,4"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["10,5"] = { value: "", merged: true, mergeParent: "10,4" };
  c["11,4"] = { value: "", merged: true, mergeParent: "10,4" };
  c["11,5"] = { value: "", merged: true, mergeParent: "10,4" };
  c["10,6"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["10,7"] = { value: "", merged: true, mergeParent: "10,6" };
  c["10,8"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,6"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,7"] = { value: "", merged: true, mergeParent: "10,6" };
  c["11,8"] = { value: "", merged: true, mergeParent: "10,6" };

  c["12,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 9, ...noBorder };
  for (let i = 1; i < 9; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,0" };

  return data;
}

// ==================== 盘点单 ====================
function createInventoryCheckTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(18, 10);
  data.colWidths = [40, 110, 110, 80, 50, 80, 80, 70, 70, 70];
  data.rowHeights = [32, 28, 6, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 24, 6, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#f3e5f5", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "库 存 盘 点 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 10, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 10; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "INVENTORY CHECK SHEET", bold: false, fontSize: 10, textAlign: "center", colSpan: 10, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 10; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "盘点单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${checkNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "盘点日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${checkDate}", ...infoStyle, colSpan: 4 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };
  c["3,8"] = { value: "", merged: true, mergeParent: "3,6" };
  c["3,9"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "仓库：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${warehouseName}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "负责人：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${handlerName}", ...infoStyle, colSpan: 4 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };
  c["4,8"] = { value: "", merged: true, mergeParent: "4,6" };
  c["4,9"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`5,${i}`] = { value: "", merged: true, mergeParent: "5,0" };

  c["6,0"] = { value: "序号", ...headerStyle };
  c["6,1"] = { value: "物料编码", ...headerStyle };
  c["6,2"] = { value: "物料名称", ...headerStyle };
  c["6,3"] = { value: "规格型号", ...headerStyle };
  c["6,4"] = { value: "单位", ...headerStyle };
  c["6,5"] = { value: "库位/批号", ...headerStyle };
  c["6,6"] = { value: "账面数量", ...headerStyle };
  c["6,7"] = { value: "实盘数量", ...headerStyle };
  c["6,8"] = { value: "盈亏数量", ...headerStyle };
  c["6,9"] = { value: "备注", ...headerStyle };

  c["7,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["7,1"] = { value: "${items.materialCode}", ...bodyStyle };
  c["7,2"] = { value: "${items.materialName}", ...bodyStyle, textAlign: "left" };
  c["7,3"] = { value: "${items.specification}", ...bodyStyle };
  c["7,4"] = { value: "${items.unit}", ...bodyStyle };
  c["7,5"] = { value: "${items.location}", ...bodyStyle };
  c["7,6"] = { value: "${items.bookQuantity}", ...bodyStyle };
  c["7,7"] = { value: "${items.actualQuantity}", ...bodyStyle };
  c["7,8"] = { value: "${items.diffQuantity}", ...bodyStyle };
  c["7,9"] = { value: "{{/each}}", ...bodyStyle };

  c["8,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["9,0"] = { value: "盘点员", ...sigHeaderStyle, colSpan: 3 };
  c["9,1"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,2"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,3"] = { value: "复核员", ...sigHeaderStyle, colSpan: 4 };
  c["9,4"] = { value: "", merged: true, mergeParent: "9,3" };
  c["9,5"] = { value: "", merged: true, mergeParent: "9,3" };
  c["9,6"] = { value: "", merged: true, mergeParent: "9,3" };
  c["9,7"] = { value: "仓库主管", ...sigHeaderStyle, colSpan: 3 };
  c["9,8"] = { value: "", merged: true, mergeParent: "9,7" };
  c["9,9"] = { value: "", merged: true, mergeParent: "9,7" };

  c["10,0"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["10,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,2"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,0"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["11,2"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,3"] = { value: "", ...sigEmptyStyle, colSpan: 4, rowSpan: 2 };
  c["10,4"] = { value: "", merged: true, mergeParent: "10,3" };
  c["10,5"] = { value: "", merged: true, mergeParent: "10,3" };
  c["10,6"] = { value: "", merged: true, mergeParent: "10,3" };
  c["11,3"] = { value: "", merged: true, mergeParent: "10,3" };
  c["11,4"] = { value: "", merged: true, mergeParent: "10,3" };
  c["11,5"] = { value: "", merged: true, mergeParent: "10,3" };
  c["11,6"] = { value: "", merged: true, mergeParent: "10,3" };
  c["10,7"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["10,8"] = { value: "", merged: true, mergeParent: "10,7" };
  c["10,9"] = { value: "", merged: true, mergeParent: "10,7" };
  c["11,7"] = { value: "", merged: true, mergeParent: "10,7" };
  c["11,8"] = { value: "", merged: true, mergeParent: "10,7" };
  c["11,9"] = { value: "", merged: true, mergeParent: "10,7" };

  c["12,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,0" };

  return data;
}

// ==================== IPQC 巡检单 ====================
function createIpqcInspectionTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(22, 8);
  data.colWidths = [40, 120, 120, 120, 120, 80, 60, 100];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 6, 24, 24, 24, 6, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#e8eaf6", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "IPQC 巡 检 记 录 单", bold: true, fontSize: 14, textAlign: "center", verticalAlign: "middle", colSpan: 8, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "In-Process Quality Control Inspection Record", bold: false, fontSize: 9, textAlign: "center", colSpan: 8, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "记录单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${inspectionNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "生产工单：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${productionOrderNo}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "产品名称：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${productName}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "巡检工序：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${processName}", ...infoStyle, colSpan: 2 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "巡检时间：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,1"] = { value: "", merged: true, mergeParent: "5,0" };
  c["5,2"] = { value: "${inspectionTime}", ...infoStyle, colSpan: 2 };
  c["5,3"] = { value: "", merged: true, mergeParent: "5,2" };
  c["5,4"] = { value: "检验员：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,5"] = { value: "", merged: true, mergeParent: "5,4" };
  c["5,6"] = { value: "${inspectorName}", ...infoStyle, colSpan: 2 };
  c["5,7"] = { value: "", merged: true, mergeParent: "5,6" };

  c["6,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`6,${i}`] = { value: "", merged: true, mergeParent: "6,0" };

  c["7,0"] = { value: "序号", ...headerStyle };
  c["7,1"] = { value: "检验项目", ...headerStyle, colSpan: 2 };
  c["7,2"] = { value: "", merged: true, mergeParent: "7,1" };
  c["7,3"] = { value: "检验标准", ...headerStyle, colSpan: 2 };
  c["7,4"] = { value: "", merged: true, mergeParent: "7,3" };
  c["7,5"] = { value: "检验结果", ...headerStyle };
  c["7,6"] = { value: "判定", ...headerStyle };
  c["7,7"] = { value: "备注", ...headerStyle };

  c["8,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["8,1"] = { value: "${items.itemName}", ...bodyStyle, textAlign: "left", colSpan: 2 };
  c["8,2"] = { value: "", merged: true, mergeParent: "8,1" };
  c["8,3"] = { value: "${items.standard}", ...bodyStyle, textAlign: "left", colSpan: 2 };
  c["8,4"] = { value: "", merged: true, mergeParent: "8,3" };
  c["8,5"] = { value: "${items.result}", ...bodyStyle };
  c["8,6"] = { value: "${items.judgment}", ...bodyStyle };
  c["8,7"] = { value: "{{/each}}", ...bodyStyle };

  c["9,0"] = { value: "检验结论：", bold: true, ...{ ...solidBorder, bgColor: "#f0f0f0" }, fontSize: 9, colSpan: 2, textAlign: "right" };
  c["9,1"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,2"] = { value: "${finalJudgment}", ...solidBorder, fontSize: 9, colSpan: 6 };
  for (let i = 3; i < 8; i++) c[`9,${i}`] = { value: "", merged: true, mergeParent: "9,2" };

  c["10,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["11,0"] = { value: "检验员", ...sigHeaderStyle, colSpan: 4 };
  c["11,1"] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,2"] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,3"] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,4"] = { value: "班组长确认", ...sigHeaderStyle, colSpan: 4 };
  c["11,5"] = { value: "", merged: true, mergeParent: "11,4" };
  c["11,6"] = { value: "", merged: true, mergeParent: "11,4" };
  c["11,7"] = { value: "", merged: true, mergeParent: "11,4" };

  c["12,0"] = { value: "", ...sigEmptyStyle, colSpan: 4, rowSpan: 2 };
  c["12,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,2"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,3"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,0"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,2"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,3"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,4"] = { value: "", ...sigEmptyStyle, colSpan: 4, rowSpan: 2 };
  c["12,5"] = { value: "", merged: true, mergeParent: "12,4" };
  c["12,6"] = { value: "", merged: true, mergeParent: "12,4" };
  c["12,7"] = { value: "", merged: true, mergeParent: "12,4" };
  c["13,4"] = { value: "", merged: true, mergeParent: "12,4" };
  c["13,5"] = { value: "", merged: true, mergeParent: "12,4" };
  c["13,6"] = { value: "", merged: true, mergeParent: "12,4" };
  c["13,7"] = { value: "", merged: true, mergeParent: "12,4" };

  c["14,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`14,${i}`] = { value: "", merged: true, mergeParent: "14,0" };

  return data;
}

// ==================== OQC 成品检验单 ====================
function createOqcInspectionTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(24, 8);
  data.colWidths = [40, 120, 120, 120, 120, 80, 60, 100];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 6, 24, 24, 24, 6, 24, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#e8f5e9", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "OQC 成 品 检 验 报 告", bold: true, fontSize: 14, textAlign: "center", verticalAlign: "middle", colSpan: 8, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "Outgoing Quality Control Inspection Report", bold: false, fontSize: 9, textAlign: "center", colSpan: 8, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "报告编号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${inspectionNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "生产工单：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${productionOrderNo}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "产品名称：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${productName}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "产品批号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${batchNo}", ...infoStyle, colSpan: 2 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "检验日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,1"] = { value: "", merged: true, mergeParent: "5,0" };
  c["5,2"] = { value: "${inspectionDate}", ...infoStyle, colSpan: 2 };
  c["5,3"] = { value: "", merged: true, mergeParent: "5,2" };
  c["5,4"] = { value: "抽检数量：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,5"] = { value: "", merged: true, mergeParent: "5,4" };
  c["5,6"] = { value: "${sampleQuantity}", ...infoStyle, colSpan: 2 };
  c["5,7"] = { value: "", merged: true, mergeParent: "5,6" };

  c["6,0"] = { value: "检验员：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["6,1"] = { value: "", merged: true, mergeParent: "6,0" };
  c["6,2"] = { value: "${inspectorName}", ...infoStyle, colSpan: 2 };
  c["6,3"] = { value: "", merged: true, mergeParent: "6,2" };
  c["6,4"] = { value: "订单数量：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["6,5"] = { value: "", merged: true, mergeParent: "6,4" };
  c["6,6"] = { value: "${orderQuantity}", ...infoStyle, colSpan: 2 };
  c["6,7"] = { value: "", merged: true, mergeParent: "6,6" };

  c["7,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`7,${i}`] = { value: "", merged: true, mergeParent: "7,0" };

  c["8,0"] = { value: "序号", ...headerStyle };
  c["8,1"] = { value: "检验项目", ...headerStyle, colSpan: 2 };
  c["8,2"] = { value: "", merged: true, mergeParent: "8,1" };
  c["8,3"] = { value: "检验标准", ...headerStyle, colSpan: 2 };
  c["8,4"] = { value: "", merged: true, mergeParent: "8,3" };
  c["8,5"] = { value: "检验结果", ...headerStyle };
  c["8,6"] = { value: "判定", ...headerStyle };
  c["8,7"] = { value: "备注", ...headerStyle };

  c["9,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["9,1"] = { value: "${items.itemName}", ...bodyStyle, textAlign: "left", colSpan: 2 };
  c["9,2"] = { value: "", merged: true, mergeParent: "9,1" };
  c["9,3"] = { value: "${items.standard}", ...bodyStyle, textAlign: "left", colSpan: 2 };
  c["9,4"] = { value: "", merged: true, mergeParent: "9,3" };
  c["9,5"] = { value: "${items.result}", ...bodyStyle };
  c["9,6"] = { value: "${items.judgment}", ...bodyStyle };
  c["9,7"] = { value: "{{/each}}", ...bodyStyle };

  c["10,0"] = { value: "检验结论：", bold: true, ...{ ...solidBorder, bgColor: "#f0f0f0" }, fontSize: 9, colSpan: 2, textAlign: "right" };
  c["10,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,2"] = { value: "${finalJudgment}", ...solidBorder, fontSize: 9, colSpan: 6 };
  for (let i = 3; i < 8; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,2" };

  c["11,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`11,${i}`] = { value: "", merged: true, mergeParent: "11,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["12,0"] = { value: "检验员", ...sigHeaderStyle, colSpan: 4 };
  c["12,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,2"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,3"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,4"] = { value: "审核人", ...sigHeaderStyle, colSpan: 4 };
  c["12,5"] = { value: "", merged: true, mergeParent: "12,4" };
  c["12,6"] = { value: "", merged: true, mergeParent: "12,4" };
  c["12,7"] = { value: "", merged: true, mergeParent: "12,4" };

  c["13,0"] = { value: "", ...sigEmptyStyle, colSpan: 4, rowSpan: 2 };
  c["13,1"] = { value: "", merged: true, mergeParent: "13,0" };
  c["13,2"] = { value: "", merged: true, mergeParent: "13,0" };
  c["13,3"] = { value: "", merged: true, mergeParent: "13,0" };
  c["14,0"] = { value: "", merged: true, mergeParent: "13,0" };
  c["14,1"] = { value: "", merged: true, mergeParent: "13,0" };
  c["14,2"] = { value: "", merged: true, mergeParent: "13,0" };
  c["14,3"] = { value: "", merged: true, mergeParent: "13,0" };
  c["13,4"] = { value: "", ...sigEmptyStyle, colSpan: 4, rowSpan: 2 };
  c["13,5"] = { value: "", merged: true, mergeParent: "13,4" };
  c["13,6"] = { value: "", merged: true, mergeParent: "13,4" };
  c["13,7"] = { value: "", merged: true, mergeParent: "13,4" };
  c["14,4"] = { value: "", merged: true, mergeParent: "13,4" };
  c["14,5"] = { value: "", merged: true, mergeParent: "13,4" };
  c["14,6"] = { value: "", merged: true, mergeParent: "13,4" };
  c["14,7"] = { value: "", merged: true, mergeParent: "13,4" };

  c["15,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`15,${i}`] = { value: "", merged: true, mergeParent: "15,0" };

  return data;
}

// ==================== 生产流转卡 ====================
function createProductionFlowCardTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(22, 8);
  data.colWidths = [40, 120, 100, 120, 120, 70, 70, 70];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 24, 6, 24, 24, 24, 6, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#fff8e1", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "生 产 流 转 卡", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 8, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "PRODUCTION ROUTING CARD", bold: false, fontSize: 9, textAlign: "center", colSpan: 8, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "流转卡号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${cardNo}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "生产订单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${productionOrderNo}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "产品名称：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${productName}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "产品批号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${batchNo}", ...infoStyle, colSpan: 2 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "生产数量：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,1"] = { value: "", merged: true, mergeParent: "5,0" };
  c["5,2"] = { value: "${quantity} ${unit}", ...infoStyle, colSpan: 2 };
  c["5,3"] = { value: "", merged: true, mergeParent: "5,2" };
  c["5,4"] = { value: "状态：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,5"] = { value: "", merged: true, mergeParent: "5,4" };
  c["5,6"] = { value: "${status}", ...infoStyle, colSpan: 2 };
  c["5,7"] = { value: "", merged: true, mergeParent: "5,6" };

  c["6,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`6,${i}`] = { value: "", merged: true, mergeParent: "6,0" };

  c["7,0"] = { value: "序号", ...headerStyle };
  c["7,1"] = { value: "工序名称", ...headerStyle };
  c["7,2"] = { value: "操作人员", ...headerStyle };
  c["7,3"] = { value: "开始时间", ...headerStyle };
  c["7,4"] = { value: "结束时间", ...headerStyle };
  c["7,5"] = { value: "合格数量", ...headerStyle };
  c["7,6"] = { value: "不合格数量", ...headerStyle };
  c["7,7"] = { value: "检验员", ...headerStyle };

  c["8,0"] = { value: "{{#each processHistory}}{{@number}}", ...bodyStyle };
  c["8,1"] = { value: "${processHistory.processName}", ...bodyStyle, textAlign: "left" };
  c["8,2"] = { value: "${processHistory.operator}", ...bodyStyle };
  c["8,3"] = { value: "${processHistory.startTime}", ...bodyStyle };
  c["8,4"] = { value: "${processHistory.endTime}", ...bodyStyle };
  c["8,5"] = { value: "${processHistory.qualifiedQty}", ...bodyStyle };
  c["8,6"] = { value: "${processHistory.unqualifiedQty}", ...bodyStyle };
  c["8,7"] = { value: "{{/each}}", ...bodyStyle };

  c["9,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`9,${i}`] = { value: "", merged: true, mergeParent: "9,0" };

  c["10,0"] = { value: "备注：", bold: true, fontSize: 9, colSpan: 2, ...noBorder };
  c["10,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,2"] = { value: "${remark}", fontSize: 9, colSpan: 6, ...noBorder };
  for (let i = 3; i < 8; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,2" };

  c["11,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`11,${i}`] = { value: "", merged: true, mergeParent: "11,0" };

  return data;
}

// ==================== 费用报销单 ====================
function createExpenseClaimTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(22, 8);
  data.colWidths = [100, 80, 200, 80, 60, 80, 80, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 6, 24, 24, 24, 6, 24, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#fce4ec", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "费 用 报 销 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 8, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "EXPENSE REIMBURSEMENT FORM", bold: false, fontSize: 9, textAlign: "center", colSpan: 8, ...noBorder, color: "#6b7280", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "报销部门：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,1"] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,2"] = { value: "${department}", ...infoStyle, colSpan: 2 };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,2" };
  c["3,4"] = { value: "报销人：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };
  c["3,6"] = { value: "${applicantName}", ...infoStyle, colSpan: 2 };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,6" };

  c["4,0"] = { value: "单据号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${reimbursementNo}", ...infoStyle, colSpan: 2 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "报销日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };
  c["4,6"] = { value: "${applyDate}", ...infoStyle, colSpan: 2 };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,6" };

  c["5,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`5,${i}`] = { value: "", merged: true, mergeParent: "5,0" };

  c["6,0"] = { value: "费用发生日期", ...headerStyle };
  c["6,1"] = { value: "费用类别", ...headerStyle };
  c["6,2"] = { value: "费用说明", ...headerStyle, colSpan: 3 };
  c["6,3"] = { value: "", merged: true, mergeParent: "6,2" };
  c["6,4"] = { value: "", merged: true, mergeParent: "6,2" };
  c["6,5"] = { value: "金额（元）", ...headerStyle };
  c["6,6"] = { value: "单据张数", ...headerStyle };
  c["6,7"] = { value: "备注", ...headerStyle };

  c["7,0"] = { value: "{{#each lines}}${lines.expenseDate}", ...bodyStyle };
  c["7,1"] = { value: "${lines.expenseType}", ...bodyStyle };
  c["7,2"] = { value: "${lines.remark}", ...bodyStyle, textAlign: "left", colSpan: 3 };
  c["7,3"] = { value: "", merged: true, mergeParent: "7,2" };
  c["7,4"] = { value: "", merged: true, mergeParent: "7,2" };
  c["7,5"] = { value: "${lines.amount}", ...bodyStyle };
  c["7,6"] = { value: "${lines.attachmentCount}", ...bodyStyle };
  c["7,7"] = { value: "{{/each}}", ...bodyStyle };

  // 合计行
  c["8,0"] = { value: "合计金额（小写）：", bold: true, ...solidBorder, fontSize: 9, textAlign: "right", colSpan: 5, bgColor: "#f5f5f5" };
  c["8,1"] = { value: "", merged: true, mergeParent: "8,0" };
  c["8,2"] = { value: "", merged: true, mergeParent: "8,0" };
  c["8,3"] = { value: "", merged: true, mergeParent: "8,0" };
  c["8,4"] = { value: "", merged: true, mergeParent: "8,0" };
  c["8,5"] = { value: "${totalAmount | currency}", bold: true, ...solidBorder, fontSize: 9 };
  c["8,6"] = { value: "${totalAttachmentCount}", bold: true, ...solidBorder, fontSize: 9 };
  c["8,7"] = { value: "", ...solidBorder, fontSize: 9 };

  c["9,0"] = { value: "合计金额（大写）：", bold: true, ...solidBorder, fontSize: 9, textAlign: "right", colSpan: 2, bgColor: "#f5f5f5" };
  c["9,1"] = { value: "", merged: true, mergeParent: "9,0" };
  c["9,2"] = { value: "${totalAmountInWords}", bold: true, ...solidBorder, fontSize: 9, colSpan: 6 };
  for (let i = 3; i < 8; i++) c[`9,${i}`] = { value: "", merged: true, mergeParent: "9,2" };

  c["10,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,0" };

  // 审批区
  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };

  c["11,0"] = { value: "部门主管", ...sigHeaderStyle, colSpan: 2 };
  c["11,1"] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,2"] = { value: "财务审核", ...sigHeaderStyle, colSpan: 2 };
  c["11,3"] = { value: "", merged: true, mergeParent: "11,2" };
  c["11,4"] = { value: "总经理", ...sigHeaderStyle, colSpan: 2 };
  c["11,5"] = { value: "", merged: true, mergeParent: "11,4" };
  c["11,6"] = { value: "出纳", ...sigHeaderStyle };
  c["11,7"] = { value: "领款人", ...sigHeaderStyle };

  c["12,0"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["12,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,0"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,2"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["12,3"] = { value: "", merged: true, mergeParent: "12,2" };
  c["13,2"] = { value: "", merged: true, mergeParent: "12,2" };
  c["13,3"] = { value: "", merged: true, mergeParent: "12,2" };
  c["12,4"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["12,5"] = { value: "", merged: true, mergeParent: "12,4" };
  c["13,4"] = { value: "", merged: true, mergeParent: "12,4" };
  c["13,5"] = { value: "", merged: true, mergeParent: "12,4" };
  c["12,6"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["13,6"] = { value: "", merged: true, mergeParent: "12,6" };
  c["12,7"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["13,7"] = { value: "", merged: true, mergeParent: "12,7" };

  c["14,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`14,${i}`] = { value: "", merged: true, mergeParent: "14,0" };

  return data;
}

// ==================== 请假申请单（内部，仅商标+版本号）====================
function createLeaveRequestTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(18, 6);
  data.colWidths = [100, 120, 80, 100, 120, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 24, 24, 6, 60, 6, 24, 24, 24, 6, 24, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...solidBorder };
  const labelStyle = { bold: true, fontSize: 9, bgColor: "#f5f5f5", ...solidBorder };

  // 内部单据：只显示商标和版本号，不显示公司联系方式
  c["0,0"] = { value: "请 假 申 请 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 6, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 6; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "版本号：${company.version || 'V1.0'}  内部文件", bold: false, fontSize: 9, textAlign: "right", colSpan: 6, ...noBorder, color: "#6b7280", borderBottom: "1px solid #ccc" };
  for (let i = 1; i < 6; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "申请单号", ...labelStyle };
  c["3,1"] = { value: "${requestNo}", ...infoStyle, colSpan: 2 };
  c["3,2"] = { value: "", merged: true, mergeParent: "3,1" };
  c["3,3"] = { value: "申请日期", ...labelStyle };
  c["3,4"] = { value: "${applyDate}", ...infoStyle, colSpan: 2 };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };

  c["4,0"] = { value: "申请人", ...labelStyle };
  c["4,1"] = { value: "${applicantName}", ...infoStyle, colSpan: 2 };
  c["4,2"] = { value: "", merged: true, mergeParent: "4,1" };
  c["4,3"] = { value: "所在部门", ...labelStyle };
  c["4,4"] = { value: "${department}", ...infoStyle, colSpan: 2 };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };

  c["5,0"] = { value: "请假类型", ...labelStyle };
  c["5,1"] = { value: "${leaveType}", ...infoStyle, colSpan: 2 };
  c["5,2"] = { value: "", merged: true, mergeParent: "5,1" };
  c["5,3"] = { value: "请假天数", ...labelStyle };
  c["5,4"] = { value: "${days} 天", ...infoStyle, colSpan: 2 };
  c["5,5"] = { value: "", merged: true, mergeParent: "5,4" };

  c["6,0"] = { value: "开始时间", ...labelStyle };
  c["6,1"] = { value: "${startTime}", ...infoStyle, colSpan: 2 };
  c["6,2"] = { value: "", merged: true, mergeParent: "6,1" };
  c["6,3"] = { value: "结束时间", ...labelStyle };
  c["6,4"] = { value: "${endTime}", ...infoStyle, colSpan: 2 };
  c["6,5"] = { value: "", merged: true, mergeParent: "6,4" };

  c["7,0"] = { value: "代理人", ...labelStyle };
  c["7,1"] = { value: "${agentName}", ...infoStyle, colSpan: 2 };
  c["7,2"] = { value: "", merged: true, mergeParent: "7,1" };
  c["7,3"] = { value: "联系电话", ...labelStyle };
  c["7,4"] = { value: "${contactPhone}", ...infoStyle, colSpan: 2 };
  c["7,5"] = { value: "", merged: true, mergeParent: "7,4" };

  c["8,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  c["9,0"] = { value: "请假事由", ...labelStyle };
  c["9,1"] = { value: "${reason}", ...infoStyle, colSpan: 5, verticalAlign: "top" };
  for (let i = 2; i < 6; i++) c[`9,${i}`] = { value: "", merged: true, mergeParent: "9,1" };

  c["10,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["11,0"] = { value: "申请人", ...sigHeaderStyle, colSpan: 2 };
  c["11,1"] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,2"] = { value: "部门主管", ...sigHeaderStyle, colSpan: 2 };
  c["11,3"] = { value: "", merged: true, mergeParent: "11,2" };
  c["11,4"] = { value: "人事部", ...sigHeaderStyle };
  c["11,5"] = { value: "总经理", ...sigHeaderStyle };

  c["12,0"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["12,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,0"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,2"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["12,3"] = { value: "", merged: true, mergeParent: "12,2" };
  c["13,2"] = { value: "", merged: true, mergeParent: "12,2" };
  c["13,3"] = { value: "", merged: true, mergeParent: "12,2" };
  c["12,4"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["13,4"] = { value: "", merged: true, mergeParent: "12,4" };
  c["12,5"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["13,5"] = { value: "", merged: true, mergeParent: "12,5" };

  c["14,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`14,${i}`] = { value: "", merged: true, mergeParent: "14,0" };

  return data;
}

// ==================== 加班申请单（内部）====================
function createOvertimeRequestTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(16, 6);
  data.colWidths = [100, 120, 80, 100, 120, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 24, 24, 6, 60, 6, 24, 24, 24, 6, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...solidBorder };
  const labelStyle = { bold: true, fontSize: 9, bgColor: "#f5f5f5", ...solidBorder };

  c["0,0"] = { value: "加 班 申 请 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 6, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 6; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "版本号：${company.version || 'V1.0'}  内部文件", bold: false, fontSize: 9, textAlign: "right", colSpan: 6, ...noBorder, color: "#6b7280", borderBottom: "1px solid #ccc" };
  for (let i = 1; i < 6; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "申请单号", ...labelStyle };
  c["3,1"] = { value: "${requestNo}", ...infoStyle, colSpan: 2 };
  c["3,2"] = { value: "", merged: true, mergeParent: "3,1" };
  c["3,3"] = { value: "申请日期", ...labelStyle };
  c["3,4"] = { value: "${applyDate}", ...infoStyle, colSpan: 2 };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };

  c["4,0"] = { value: "申请人", ...labelStyle };
  c["4,1"] = { value: "${applicantName}", ...infoStyle, colSpan: 2 };
  c["4,2"] = { value: "", merged: true, mergeParent: "4,1" };
  c["4,3"] = { value: "所在部门", ...labelStyle };
  c["4,4"] = { value: "${department}", ...infoStyle, colSpan: 2 };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };

  c["5,0"] = { value: "加班类型", ...labelStyle };
  c["5,1"] = { value: "${overtimeType}", ...infoStyle, colSpan: 2 };
  c["5,2"] = { value: "", merged: true, mergeParent: "5,1" };
  c["5,3"] = { value: "加班时长", ...labelStyle };
  c["5,4"] = { value: "${hours} 小时", ...infoStyle, colSpan: 2 };
  c["5,5"] = { value: "", merged: true, mergeParent: "5,4" };

  c["6,0"] = { value: "加班日期", ...labelStyle };
  c["6,1"] = { value: "${overtimeDate}", ...infoStyle, colSpan: 2 };
  c["6,2"] = { value: "", merged: true, mergeParent: "6,1" };
  c["6,3"] = { value: "加班时间", ...labelStyle };
  c["6,4"] = { value: "${startTime} - ${endTime}", ...infoStyle, colSpan: 2 };
  c["6,5"] = { value: "", merged: true, mergeParent: "6,4" };

  c["7,0"] = { value: "加班人员", ...labelStyle };
  c["7,1"] = { value: "${participants}", ...infoStyle, colSpan: 5 };
  for (let i = 2; i < 6; i++) c[`7,${i}`] = { value: "", merged: true, mergeParent: "7,1" };

  c["8,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  c["9,0"] = { value: "加班事由", ...labelStyle };
  c["9,1"] = { value: "${reason}", ...infoStyle, colSpan: 5, verticalAlign: "top" };
  for (let i = 2; i < 6; i++) c[`9,${i}`] = { value: "", merged: true, mergeParent: "9,1" };

  c["10,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`10,${i}`] = { value: "", merged: true, mergeParent: "10,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["11,0"] = { value: "申请人", ...sigHeaderStyle, colSpan: 2 };
  c["11,1"] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,2"] = { value: "部门主管", ...sigHeaderStyle, colSpan: 2 };
  c["11,3"] = { value: "", merged: true, mergeParent: "11,2" };
  c["11,4"] = { value: "人事部", ...sigHeaderStyle };
  c["11,5"] = { value: "总经理", ...sigHeaderStyle };

  c["12,0"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["12,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,0"] = { value: "", merged: true, mergeParent: "12,0" };
  c["13,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,2"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["12,3"] = { value: "", merged: true, mergeParent: "12,2" };
  c["13,2"] = { value: "", merged: true, mergeParent: "12,2" };
  c["13,3"] = { value: "", merged: true, mergeParent: "12,2" };
  c["12,4"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["13,4"] = { value: "", merged: true, mergeParent: "12,4" };
  c["12,5"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["13,5"] = { value: "", merged: true, mergeParent: "12,5" };

  c["14,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`14,${i}`] = { value: "", merged: true, mergeParent: "14,0" };

  return data;
}

// ==================== 外出申请单（内部）====================
function createOutingRequestTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(16, 6);
  data.colWidths = [100, 120, 80, 100, 120, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 24, 6, 60, 6, 24, 24, 24, 6, 24, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...solidBorder };
  const labelStyle = { bold: true, fontSize: 9, bgColor: "#f5f5f5", ...solidBorder };

  c["0,0"] = { value: "公 出 申 请 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 6, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 6; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "版本号：${company.version || 'V1.0'}  内部文件", bold: false, fontSize: 9, textAlign: "right", colSpan: 6, ...noBorder, color: "#6b7280", borderBottom: "1px solid #ccc" };
  for (let i = 1; i < 6; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "申请单号", ...labelStyle };
  c["3,1"] = { value: "${requestNo}", ...infoStyle, colSpan: 2 };
  c["3,2"] = { value: "", merged: true, mergeParent: "3,1" };
  c["3,3"] = { value: "申请日期", ...labelStyle };
  c["3,4"] = { value: "${applyDate}", ...infoStyle, colSpan: 2 };
  c["3,5"] = { value: "", merged: true, mergeParent: "3,4" };

  c["4,0"] = { value: "申请人", ...labelStyle };
  c["4,1"] = { value: "${applicantName}", ...infoStyle, colSpan: 2 };
  c["4,2"] = { value: "", merged: true, mergeParent: "4,1" };
  c["4,3"] = { value: "所在部门", ...labelStyle };
  c["4,4"] = { value: "${department}", ...infoStyle, colSpan: 2 };
  c["4,5"] = { value: "", merged: true, mergeParent: "4,4" };

  c["5,0"] = { value: "外出地点", ...labelStyle };
  c["5,1"] = { value: "${destination}", ...infoStyle, colSpan: 5 };
  for (let i = 2; i < 6; i++) c[`5,${i}`] = { value: "", merged: true, mergeParent: "5,1" };

  c["6,0"] = { value: "开始时间", ...labelStyle };
  c["6,1"] = { value: "${startTime}", ...infoStyle, colSpan: 2 };
  c["6,2"] = { value: "", merged: true, mergeParent: "6,1" };
  c["6,3"] = { value: "结束时间", ...labelStyle };
  c["6,4"] = { value: "${endTime}", ...infoStyle, colSpan: 2 };
  c["6,5"] = { value: "", merged: true, mergeParent: "6,4" };

  c["7,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`7,${i}`] = { value: "", merged: true, mergeParent: "7,0" };

  c["8,0"] = { value: "外出事由", ...labelStyle };
  c["8,1"] = { value: "${reason}", ...infoStyle, colSpan: 5, verticalAlign: "top" };
  for (let i = 2; i < 6; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,1" };

  c["9,0"] = { value: "", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`9,${i}`] = { value: "", merged: true, mergeParent: "9,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["10,0"] = { value: "申请人", ...sigHeaderStyle, colSpan: 2 };
  c["10,1"] = { value: "", merged: true, mergeParent: "10,0" };
  c["10,2"] = { value: "部门主管", ...sigHeaderStyle, colSpan: 2 };
  c["10,3"] = { value: "", merged: true, mergeParent: "10,2" };
  c["10,4"] = { value: "行政部", ...sigHeaderStyle };
  c["10,5"] = { value: "总经理", ...sigHeaderStyle };

  c["11,0"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["11,1"] = { value: "", merged: true, mergeParent: "11,0" };
  c["12,0"] = { value: "", merged: true, mergeParent: "11,0" };
  c["12,1"] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,2"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["11,3"] = { value: "", merged: true, mergeParent: "11,2" };
  c["12,2"] = { value: "", merged: true, mergeParent: "11,2" };
  c["12,3"] = { value: "", merged: true, mergeParent: "11,2" };
  c["11,4"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["12,4"] = { value: "", merged: true, mergeParent: "11,4" };
  c["11,5"] = { value: "", ...sigEmptyStyle, rowSpan: 2 };
  c["12,5"] = { value: "", merged: true, mergeParent: "11,5" };

  c["13,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 6, ...noBorder };
  for (let i = 1; i < 6; i++) c[`13,${i}`] = { value: "", merged: true, mergeParent: "13,0" };

  return data;
}

// ==================== 委外灭菌单（内部）====================
function createSterilizationOutsourceTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(20, 8);
  data.colWidths = [100, 120, 80, 100, 120, 80, 80, 80];
  data.rowHeights = [32, 28, 6, 24, 24, 24, 24, 24, 6, 24, 24, 24, 24, 24, 6, 24, 24, 24, 6, 24];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...solidBorder };
  const labelStyle = { bold: true, fontSize: 9, bgColor: "#f5f5f5", ...solidBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#e0f7fa", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  c["0,0"] = { value: "委 外 灭 菌 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 8, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 8; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };
  c["1,0"] = { value: "版本号：${company.version || 'V1.0'}  内部文件", bold: false, fontSize: 9, textAlign: "right", colSpan: 8, ...noBorder, color: "#6b7280", borderBottom: "1px solid #ccc" };
  for (let i = 1; i < 8; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  c["3,0"] = { value: "单据编号", ...labelStyle };
  c["3,1"] = { value: "${orderNo}", ...infoStyle, colSpan: 3 };
  c["3,2"] = { value: "", merged: true, mergeParent: "3,1" };
  c["3,3"] = { value: "", merged: true, mergeParent: "3,1" };
  c["3,4"] = { value: "灭菌方式", ...labelStyle };
  c["3,5"] = { value: "${sterilizationMethod}", ...infoStyle, colSpan: 3 };
  c["3,6"] = { value: "", merged: true, mergeParent: "3,5" };
  c["3,7"] = { value: "", merged: true, mergeParent: "3,5" };

  c["4,0"] = { value: "供应商", ...labelStyle };
  c["4,1"] = { value: "${supplierName}", ...infoStyle, colSpan: 3 };
  c["4,2"] = { value: "", merged: true, mergeParent: "4,1" };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,1" };
  c["4,4"] = { value: "灭菌批号", ...labelStyle };
  c["4,5"] = { value: "${sterilizationBatchNo}", ...infoStyle, colSpan: 3 };
  c["4,6"] = { value: "", merged: true, mergeParent: "4,5" };
  c["4,7"] = { value: "", merged: true, mergeParent: "4,5" };

  c["5,0"] = { value: "发出日期", ...labelStyle };
  c["5,1"] = { value: "${sendDate}", ...infoStyle, colSpan: 3 };
  c["5,2"] = { value: "", merged: true, mergeParent: "5,1" };
  c["5,3"] = { value: "", merged: true, mergeParent: "5,1" };
  c["5,4"] = { value: "预计返回日期", ...labelStyle };
  c["5,5"] = { value: "${expectedReturnDate}", ...infoStyle, colSpan: 3 };
  c["5,6"] = { value: "", merged: true, mergeParent: "5,5" };
  c["5,7"] = { value: "", merged: true, mergeParent: "5,5" };

  c["6,0"] = { value: "实际返回日期", ...labelStyle };
  c["6,1"] = { value: "${actualReturnDate}", ...infoStyle, colSpan: 3 };
  c["6,2"] = { value: "", merged: true, mergeParent: "6,1" };
  c["6,3"] = { value: "", merged: true, mergeParent: "6,1" };
  c["6,4"] = { value: "关联流转卡", ...labelStyle };
  c["6,5"] = { value: "${routingCardNo}", ...infoStyle, colSpan: 3 };
  c["6,6"] = { value: "", merged: true, mergeParent: "6,5" };
  c["6,7"] = { value: "", merged: true, mergeParent: "6,5" };

  c["7,0"] = { value: "产品名称", ...labelStyle };
  c["7,1"] = { value: "${productName}", ...infoStyle, colSpan: 3 };
  c["7,2"] = { value: "", merged: true, mergeParent: "7,1" };
  c["7,3"] = { value: "", merged: true, mergeParent: "7,1" };
  c["7,4"] = { value: "产品批号", ...labelStyle };
  c["7,5"] = { value: "${batchNo}", ...infoStyle, colSpan: 3 };
  c["7,6"] = { value: "", merged: true, mergeParent: "7,5" };
  c["7,7"] = { value: "", merged: true, mergeParent: "7,5" };

  c["8,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  c["9,0"] = { value: "序号", ...headerStyle };
  c["9,1"] = { value: "物料/产品名称", ...headerStyle, colSpan: 2 };
  c["9,2"] = { value: "", merged: true, mergeParent: "9,1" };
  c["9,3"] = { value: "规格型号", ...headerStyle };
  c["9,4"] = { value: "批号", ...headerStyle };
  c["9,5"] = { value: "数量", ...headerStyle };
  c["9,6"] = { value: "单位", ...headerStyle };
  c["9,7"] = { value: "备注", ...headerStyle };

  c["10,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["10,1"] = { value: "${items.materialName}", ...bodyStyle, textAlign: "left", colSpan: 2 };
  c["10,2"] = { value: "", merged: true, mergeParent: "10,1" };
  c["10,3"] = { value: "${items.specification}", ...bodyStyle };
  c["10,4"] = { value: "${items.batchNo}", ...bodyStyle };
  c["10,5"] = { value: "${items.quantity}", ...bodyStyle };
  c["10,6"] = { value: "${items.unit}", ...bodyStyle };
  c["10,7"] = { value: "{{/each}}", ...bodyStyle };

  c["11,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`11,${i}`] = { value: "", merged: true, mergeParent: "11,0" };

  c["12,0"] = { value: "备注：", bold: true, fontSize: 9, colSpan: 2, ...noBorder };
  c["12,1"] = { value: "", merged: true, mergeParent: "12,0" };
  c["12,2"] = { value: "${remark}", fontSize: 9, colSpan: 6, ...noBorder };
  for (let i = 3; i < 8; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,2" };

  c["13,0"] = { value: "", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`13,${i}`] = { value: "", merged: true, mergeParent: "13,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["14,0"] = { value: "制单人", ...sigHeaderStyle, colSpan: 3 };
  c["14,1"] = { value: "", merged: true, mergeParent: "14,0" };
  c["14,2"] = { value: "", merged: true, mergeParent: "14,0" };
  c["14,3"] = { value: "QA确认", ...sigHeaderStyle, colSpan: 2 };
  c["14,4"] = { value: "", merged: true, mergeParent: "14,3" };
  c["14,5"] = { value: "供应商确认", ...sigHeaderStyle, colSpan: 3 };
  c["14,6"] = { value: "", merged: true, mergeParent: "14,5" };
  c["14,7"] = { value: "", merged: true, mergeParent: "14,5" };

  c["15,0"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["15,1"] = { value: "", merged: true, mergeParent: "15,0" };
  c["15,2"] = { value: "", merged: true, mergeParent: "15,0" };
  c["16,0"] = { value: "", merged: true, mergeParent: "15,0" };
  c["16,1"] = { value: "", merged: true, mergeParent: "15,0" };
  c["16,2"] = { value: "", merged: true, mergeParent: "15,0" };
  c["15,3"] = { value: "", ...sigEmptyStyle, colSpan: 2, rowSpan: 2 };
  c["15,4"] = { value: "", merged: true, mergeParent: "15,3" };
  c["16,3"] = { value: "", merged: true, mergeParent: "15,3" };
  c["16,4"] = { value: "", merged: true, mergeParent: "15,3" };
  c["15,5"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 2 };
  c["15,6"] = { value: "", merged: true, mergeParent: "15,5" };
  c["15,7"] = { value: "", merged: true, mergeParent: "15,5" };
  c["16,5"] = { value: "", merged: true, mergeParent: "15,5" };
  c["16,6"] = { value: "", merged: true, mergeParent: "15,5" };
  c["16,7"] = { value: "", merged: true, mergeParent: "15,5" };

  c["17,0"] = { value: "打印时间：${printTime}", fontSize: 8, color: "#999", colSpan: 8, ...noBorder };
  for (let i = 1; i < 8; i++) c[`17,${i}`] = { value: "", merged: true, mergeParent: "17,0" };

  return data;
}

// ==================== 报关单（横版，对外，带抬头和联系方式）====================
function createCustomsDeclarationTemplate(): SpreadsheetData {
  const data = createEmptySpreadsheet(28, 10);
  data.orientation = "landscape";
  data.paperSize = "A4";
  data.marginTop = 10;
  data.marginRight = 8;
  data.marginBottom = 10;
  data.marginLeft = 8;
  data.colWidths = [50, 100, 80, 80, 80, 80, 80, 80, 80
, 80, 80];
  data.rowHeights = [40, 32, 8, 28, 28, 28, 28, 8, 28, 28, 28, 28, 28, 8, 28, 28, 8, 28, 28, 28, 8, 28, 28, 28, 8, 28, 28, 28];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const solidBorder = { borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000" };
  const infoStyle = { fontSize: 9, ...noBorder };
  const headerStyle = { bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#e3f2fd", ...solidBorder };
  const bodyStyle = { fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, ...solidBorder };

  // 抬头：公司名称 + 联系方式（对外文件）
  c["0,0"] = { value: "${company.name}", bold: true, fontSize: 18, textAlign: "center", verticalAlign: "middle", colSpan: 10, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 10; i++) c[`0,${i}`] = { value: "", merged: true, mergeParent: "0,0" };

  c["1,0"] = { value: "地址：${company.address}  |  电话：${company.phone}  |  邮箱：${company.email}", fontSize: 9, textAlign: "center", colSpan: 10, ...noBorder, color: "#374151", borderBottom: "2px solid #1a56db" };
  for (let i = 1; i < 10; i++) c[`1,${i}`] = { value: "", merged: true, mergeParent: "1,0" };

  c["2,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`2,${i}`] = { value: "", merged: true, mergeParent: "2,0" };

  // 报关单标题
  c["3,0"] = { value: "出 口 报 关 单", bold: true, fontSize: 16, textAlign: "center", verticalAlign: "middle", colSpan: 6, ...noBorder, color: "#1a56db" };
  for (let i = 1; i < 6; i++) c[`3,${i}`] = { value: "", merged: true, mergeParent: "3,0" };
  c["3,6"] = { value: "CUSTOMS DECLARATION", bold: true, fontSize: 12, textAlign: "center", verticalAlign: "middle", colSpan: 4, ...noBorder, color: "#6b7280" };
  for (let i = 7; i < 10; i++) c[`3,${i}`] = { value: "", merged: true, mergeParent: "3,6" };

  // 基本信息区（左右两栏）
  c["4,0"] = { value: "报关单号：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,1"] = { value: "", merged: true, mergeParent: "4,0" };
  c["4,2"] = { value: "${declarationNo}", ...infoStyle, colSpan: 3 };
  c["4,3"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,4"] = { value: "", merged: true, mergeParent: "4,2" };
  c["4,5"] = { value: "报关日期：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["4,6"] = { value: "", merged: true, mergeParent: "4,5" };
  c["4,7"] = { value: "${declarationDate}", ...infoStyle, colSpan: 3 };
  c["4,8"] = { value: "", merged: true, mergeParent: "4,7" };
  c["4,9"] = { value: "", merged: true, mergeParent: "4,7" };

  c["5,0"] = { value: "出口商：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,1"] = { value: "", merged: true, mergeParent: "5,0" };
  c["5,2"] = { value: "${exporterName}", ...infoStyle, colSpan: 3 };
  c["5,3"] = { value: "", merged: true, mergeParent: "5,2" };
  c["5,4"] = { value: "", merged: true, mergeParent: "5,2" };
  c["5,5"] = { value: "进口商：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["5,6"] = { value: "", merged: true, mergeParent: "5,5" };
  c["5,7"] = { value: "${importerName}", ...infoStyle, colSpan: 3 };
  c["5,8"] = { value: "", merged: true, mergeParent: "5,7" };
  c["5,9"] = { value: "", merged: true, mergeParent: "5,7" };

  c["6,0"] = { value: "贸易方式：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["6,1"] = { value: "", merged: true, mergeParent: "6,0" };
  c["6,2"] = { value: "${tradeMode}", ...infoStyle, colSpan: 3 };
  c["6,3"] = { value: "", merged: true, mergeParent: "6,2" };
  c["6,4"] = { value: "", merged: true, mergeParent: "6,2" };
  c["6,5"] = { value: "运输方式：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["6,6"] = { value: "", merged: true, mergeParent: "6,5" };
  c["6,7"] = { value: "${transportMode}", ...infoStyle, colSpan: 3 };
  c["6,8"] = { value: "", merged: true, mergeParent: "6,7" };
  c["6,9"] = { value: "", merged: true, mergeParent: "6,7" };

  c["7,0"] = { value: "起运港：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["7,1"] = { value: "", merged: true, mergeParent: "7,0" };
  c["7,2"] = { value: "${departurePort}", ...infoStyle, colSpan: 3 };
  c["7,3"] = { value: "", merged: true, mergeParent: "7,2" };
  c["7,4"] = { value: "", merged: true, mergeParent: "7,2" };
  c["7,5"] = { value: "目的港：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["7,6"] = { value: "", merged: true, mergeParent: "7,5" };
  c["7,7"] = { value: "${destinationPort}", ...infoStyle, colSpan: 3 };
  c["7,8"] = { value: "", merged: true, mergeParent: "7,7" };
  c["7,9"] = { value: "", merged: true, mergeParent: "7,7" };

  c["8,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`8,${i}`] = { value: "", merged: true, mergeParent: "8,0" };

  // 货物明细表头
  c["9,0"] = { value: "序号", ...headerStyle };
  c["9,1"] = { value: "商品名称（中文）", ...headerStyle, colSpan: 2 };
  c["9,2"] = { value: "", merged: true, mergeParent: "9,1" };
  c["9,3"] = { value: "商品编码", ...headerStyle };
  c["9,4"] = { value: "规格型号", ...headerStyle };
  c["9,5"] = { value: "数量", ...headerStyle };
  c["9,6"] = { value: "单位", ...headerStyle };
  c["9,7"] = { value: "单价(USD)", ...headerStyle };
  c["9,8"] = { value: "总价(USD)", ...headerStyle };
  c["9,9"] = { value: "原产地", ...headerStyle };

  c["10,0"] = { value: "{{#each items}}{{@number}}", ...bodyStyle };
  c["10,1"] = { value: "${items.productName}", ...bodyStyle, textAlign: "left", colSpan: 2 };
  c["10,2"] = { value: "", merged: true, mergeParent: "10,1" };
  c["10,3"] = { value: "${items.hsCode}", ...bodyStyle };
  c["10,4"] = { value: "${items.specification}", ...bodyStyle };
  c["10,5"] = { value: "${items.quantity}", ...bodyStyle };
  c["10,6"] = { value: "${items.unit}", ...bodyStyle };
  c["10,7"] = { value: "${items.unitPrice}", ...bodyStyle };
  c["10,8"] = { value: "${items.totalPrice}", ...bodyStyle };
  c["10,9"] = { value: "{{/each}}", ...bodyStyle };

  // 合计行
  c["11,0"] = { value: "合计", bold: true, ...solidBorder, fontSize: 9, textAlign: "center", bgColor: "#f5f5f5", colSpan: 5 };
  for (let i = 1; i < 5; i++) c[`11,${i}`] = { value: "", merged: true, mergeParent: "11,0" };
  c["11,5"] = { value: "${totalQuantity}", bold: true, ...solidBorder, fontSize: 9 };
  c["11,6"] = { value: "", ...solidBorder, fontSize: 9 };
  c["11,7"] = { value: "", ...solidBorder, fontSize: 9 };
  c["11,8"] = { value: "${totalAmount | currency}", bold: true, ...solidBorder, fontSize: 9 };
  c["11,9"] = { value: "", ...solidBorder, fontSize: 9 };

  c["12,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`12,${i}`] = { value: "", merged: true, mergeParent: "12,0" };

  // 包装信息
  c["13,0"] = { value: "包装方式：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["13,1"] = { value: "", merged: true, mergeParent: "13,0" };
  c["13,2"] = { value: "${packagingType}", ...infoStyle, colSpan: 2 };
  c["13,3"] = { value: "", merged: true, mergeParent: "13,2" };
  c["13,4"] = { value: "件数：", bold: true, ...infoStyle, textAlign: "right" };
  c["13,5"] = { value: "${packageCount}", ...infoStyle };
  c["13,6"] = { value: "毛重(KG)：", bold: true, ...infoStyle, textAlign: "right" };
  c["13,7"] = { value: "${grossWeight}", ...infoStyle };
  c["13,8"] = { value: "净重(KG)：", bold: true, ...infoStyle, textAlign: "right" };
  c["13,9"] = { value: "${netWeight}", ...infoStyle };

  c["14,0"] = { value: "随附单据：", bold: true, ...infoStyle, colSpan: 2, textAlign: "right" };
  c["14,1"] = { value: "", merged: true, mergeParent: "14,0" };
  c["14,2"] = { value: "${attachedDocuments}", ...infoStyle, colSpan: 8 };
  for (let i = 3; i < 10; i++) c[`14,${i}`] = { value: "", merged: true, mergeParent: "14,2" };

  c["15,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`15,${i}`] = { value: "", merged: true, mergeParent: "15,0" };

  // 声明与签名
  c["16,0"] = { value: "申报人声明：本人保证以上所报内容真实、准确，如有不实，愿承担相应法律责任。", fontSize: 9, colSpan: 10, ...noBorder, color: "#374151" };
  for (let i = 1; i < 10; i++) c[`16,${i}`] = { value: "", merged: true, mergeParent: "16,0" };

  c["17,0"] = { value: "", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`17,${i}`] = { value: "", merged: true, mergeParent: "17,0" };

  const sigHeaderStyle = { bold: true, fontSize: 9, textAlign: "center" as const, bgColor: "#f0f0f0", ...solidBorder };
  const sigEmptyStyle = { fontSize: 9, textAlign: "center" as const, ...solidBorder };
  c["18,0"] = { value: "报关员", ...sigHeaderStyle, colSpan: 3 };
  c["18,1"] = { value: "", merged: true, mergeParent: "18,0" };
  c["18,2"] = { value: "", merged: true, mergeParent: "18,0" };
  c["18,3"] = { value: "审核人", ...sigHeaderStyle, colSpan: 4 };
  c["18,4"] = { value: "", merged: true, mergeParent: "18,3" };
  c["18,5"] = { value: "", merged: true, mergeParent: "18,3" };
  c["18,6"] = { value: "", merged: true, mergeParent: "18,3" };
  c["18,7"] = { value: "海关专用章", ...sigHeaderStyle, colSpan: 3 };
  c["18,8"] = { value: "", merged: true, mergeParent: "18,7" };
  c["18,9"] = { value: "", merged: true, mergeParent: "18,7" };

  c["19,0"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 3 };
  c["19,1"] = { value: "", merged: true, mergeParent: "19,0" };
  c["19,2"] = { value: "", merged: true, mergeParent: "19,0" };
  c["20,0"] = { value: "", merged: true, mergeParent: "19,0" };
  c["20,1"] = { value: "", merged: true, mergeParent: "19,0" };
  c["20,2"] = { value: "", merged: true, mergeParent: "19,0" };
  c["21,0"] = { value: "", merged: true, mergeParent: "19,0" };
  c["21,1"] = { value: "", merged: true, mergeParent: "19,0" };
  c["21,2"] = { value: "", merged: true, mergeParent: "19,0" };
  c["19,3"] = { value: "", ...sigEmptyStyle, colSpan: 4, rowSpan: 3 };
  c["19,4"] = { value: "", merged: true, mergeParent: "19,3" };
  c["19,5"] = { value: "", merged: true, mergeParent: "19,3" };
  c["19,6"] = { value: "", merged: true, mergeParent: "19,3" };
  c["20,3"] = { value: "", merged: true, mergeParent: "19,3" };
  c["20,4"] = { value: "", merged: true, mergeParent: "19,3" };
  c["20,5"] = { value: "", merged: true, mergeParent: "19,3" };
  c["20,6"] = { value: "", merged: true, mergeParent: "19,3" };
  c["21,3"] = { value: "", merged: true, mergeParent: "19,3" };
  c["21,4"] = { value: "", merged: true, mergeParent: "19,3" };
  c["21,5"] = { value: "", merged: true, mergeParent: "19,3" };
  c["21,6"] = { value: "", merged: true, mergeParent: "19,3" };
  c["19,7"] = { value: "", ...sigEmptyStyle, colSpan: 3, rowSpan: 3 };
  c["19,8"] = { value: "", merged: true, mergeParent: "19,7" };
  c["19,9"] = { value: "", merged: true, mergeParent: "19,7" };
  c["20,7"] = { value: "", merged: true, mergeParent: "19,7" };
  c["20,8"] = { value: "", merged: true, mergeParent: "19,7" };
  c["20,9"] = { value: "", merged: true, mergeParent: "19,7" };
  c["21,7"] = { value: "", merged: true, mergeParent: "19,7" };
  c["21,8"] = { value: "", merged: true, mergeParent: "19,7" };
  c["21,9"] = { value: "", merged: true, mergeParent: "19,7" };

  c["22,0"] = { value: "打印时间：${printTime}  |  ${company.name}  |  ${company.phone}", fontSize: 8, color: "#999", colSpan: 10, ...noBorder };
  for (let i = 1; i < 10; i++) c[`22,${i}`] = { value: "", merged: true, mergeParent: "22,0" };

  return data;
}

function createSalesDocumentTemplate(language: "zh" | "en", mode: "order" | "quote"): SpreadsheetData {
  const data = createEmptySpreadsheet(28, 10);
  data.colWidths = [56, 90, 110, 88, 88, 88, 88, 72, 92, 102];
  data.rowHeights = [
    26, 28, 22, 24, 10,
    34, 26, 26, 10,
    24, 24, 24, 24, 10,
    28, 28, 28, 28, 10,
    24, 24, 24, 10,
    24, 24, 36, 92, 22,
  ];

  const c = data.cells;
  const noBorder = { borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none" };
  const hairline = { borderTop: "1px solid #6b7280", borderRight: "1px solid #6b7280", borderBottom: "1px solid #6b7280", borderLeft: "1px solid #6b7280" };
  const headerCell = { ...hairline, bold: true, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const, bgColor: "#eef2f7" };
  const bodyCell = { ...hairline, fontSize: 9, textAlign: "center" as const, verticalAlign: "middle" as const };
  const labelCell = { fontSize: 9, bold: true, color: "#475569", ...noBorder };
  const valueCell = { fontSize: 9, ...noBorder };

  const labels = language === "en"
    ? {
        title: mode === "quote" ? "Quotation" : "Sales Order",
        documentNo: mode === "quote" ? "Quote No." : "Order No.",
        orderDate: "Order Date",
        customerCode: "Customer Code",
        customerName: "Company",
        customerCountry: "Country",
        shippingAddress: "Address",
        deliveryDate: "Delivery Date",
        shippingContact: "Contact",
        paymentTerms: "Payment Terms",
        shippingPhone: "Telephone",
        tradeTerm: "Trade Term",
        salesRep: "Sales Rep",
        tableTitle: "Detailed Items",
        index: "Item",
        productCode: "Ref",
        productName: "Product Name",
        specification: "Specification",
        quantity: "Qty",
        unitPrice: "Unit Price",
        amount: "Amount",
        amountWords: "Amount in Words",
        shippingFee: "Shipping Fee",
        totalQuantity: "Total Qty",
        totalAmount: "Total Amount",
        termsTitle: "Terms",
        bankTitle: "Bank Information",
        paymentAccount: "Beneficiary",
        bankName: "Bank Name",
        accountNo: "Account No.",
        swiftCode: "SWIFT / Code",
        bankAddress: "Bank Address",
        notes: "Notes",
        printTime: "Print Time",
      }
    : {
        title: mode === "quote" ? "报价单" : "销售订单",
        documentNo: mode === "quote" ? "报价单号" : "订单编号",
        orderDate: "订单日期",
        customerCode: "客户编码",
        customerName: "客户名称",
        customerCountry: "国家/地区",
        shippingAddress: "收货地址",
        deliveryDate: "交货日期",
        shippingContact: "联系人",
        paymentTerms: "付款条件",
        shippingPhone: "联系电话",
        tradeTerm: "贸易条款",
        salesRep: "销售负责人",
        tableTitle: "产品明细",
        index: "序号",
        productCode: "产品编码",
        productName: "产品名称",
        specification: "规格型号",
        quantity: "数量",
        unitPrice: "单价",
        amount: "金额",
        amountWords: "金额大写",
        shippingFee: "运费",
        totalQuantity: "总数量",
        totalAmount: "总金额",
        termsTitle: "交易条款",
        bankTitle: "银行信息",
        paymentAccount: "账户名称",
        bankName: "开户行",
        accountNo: "收款账户",
        swiftCode: "Swift/行号",
        bankAddress: "银行地址",
        notes: "备注",
        printTime: "打印时间",
      };

  c["0,0"] = { value: "${companyLogoHtml}", colSpan: 3, textAlign: "left", verticalAlign: "top", ...noBorder };
  setMergedCells(c, "0,0", [0], [0, 1, 2]);
  c["0,7"] = { value: "${templateCode}", colSpan: 3, textAlign: "right", fontSize: 9, color: "#64748b", ...noBorder };
  setMergedCells(c, "0,7", [0], [7, 8, 9]);

  c["1,0"] = { value: "${companyName}", colSpan: 10, textAlign: "right", bold: true, fontSize: language === "en" ? 18 : 20, ...noBorder };
  setMergedCells(c, "1,0", [1], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  c["2,0"] = { value: "${companyAddress}", colSpan: 10, textAlign: "right", fontSize: 9, color: "#475569", ...noBorder };
  setMergedCells(c, "2,0", [2], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  c["3,0"] = {
    value: language === "en"
      ? "Tel: ${companyPhone}    Mail: ${companyEmail}    Web: ${companyWebsite}"
      : "电话：${companyPhone}    邮箱：${companyEmail}    网址：${companyWebsite}",
    colSpan: 10,
    textAlign: "right",
    fontSize: 9,
    color: "#475569",
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: "2px solid #64748b",
  };
  setMergedCells(c, "3,0", [3], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  c["5,0"] = {
    value: labels.title,
    colSpan: 7,
    textAlign: language === "en" ? "left" : "center",
    verticalAlign: "middle",
    bold: true,
    fontSize: language === "en" ? 22 : 24,
    color: "#111827",
    ...noBorder,
  };
  setMergedCells(c, "5,0", [5], [0, 1, 2, 3, 4, 5, 6]);
  c["5,7"] = { value: "${qrCodeHtml}", colSpan: 3, rowSpan: 3, textAlign: "center", verticalAlign: "top", ...noBorder };
  setMergedCells(c, "5,7", [5, 6, 7], [7, 8, 9]);

  c["6,0"] = { value: labels.documentNo, ...labelCell };
  c["6,1"] = { value: "${orderNumber}", colSpan: 2, ...valueCell };
  setMergedCells(c, "6,1", [6], [1, 2]);
  c["6,3"] = { value: labels.orderDate, ...labelCell };
  c["6,4"] = { value: "${orderDate}", colSpan: 3, ...valueCell };
  setMergedCells(c, "6,4", [6], [4, 5, 6]);

  c["7,0"] = { value: labels.customerCode, ...labelCell };
  c["7,1"] = { value: "${customerCode}", colSpan: 2, ...valueCell };
  setMergedCells(c, "7,1", [7], [1, 2]);
  c["7,3"] = { value: labels.customerCountry, ...labelCell };
  c["7,4"] = { value: "${customerCountry}", colSpan: 3, ...valueCell };
  setMergedCells(c, "7,4", [7], [4, 5, 6]);

  c["9,0"] = { value: labels.customerName, ...labelCell };
  c["9,1"] = { value: "${customerName}", colSpan: 4, ...valueCell };
  setMergedCells(c, "9,1", [9], [1, 2, 3, 4]);
  c["9,5"] = { value: labels.salesRep, ...labelCell };
  c["9,6"] = { value: "${salesRep}", colSpan: 4, ...valueCell };
  setMergedCells(c, "9,6", [9], [6, 7, 8, 9]);

  c["10,0"] = { value: labels.shippingAddress, ...labelCell };
  c["10,1"] = { value: "${shippingAddress}", colSpan: 4, ...valueCell };
  setMergedCells(c, "10,1", [10], [1, 2, 3, 4]);
  c["10,5"] = { value: labels.deliveryDate, ...labelCell };
  c["10,6"] = { value: "${deliveryDate}", colSpan: 4, ...valueCell };
  setMergedCells(c, "10,6", [10], [6, 7, 8, 9]);

  c["11,0"] = { value: labels.shippingContact, ...labelCell };
  c["11,1"] = { value: "${shippingContact}", colSpan: 4, ...valueCell };
  setMergedCells(c, "11,1", [11], [1, 2, 3, 4]);
  c["11,5"] = { value: labels.paymentTerms, ...labelCell };
  c["11,6"] = { value: "${paymentTerms}", colSpan: 4, ...valueCell };
  setMergedCells(c, "11,6", [11], [6, 7, 8, 9]);

  c["12,0"] = { value: labels.shippingPhone, ...labelCell };
  c["12,1"] = { value: "${shippingPhone}", colSpan: 4, ...valueCell };
  setMergedCells(c, "12,1", [12], [1, 2, 3, 4]);
  c["12,5"] = { value: labels.tradeTerm, ...labelCell };
  c["12,6"] = { value: "${tradeTerm}", colSpan: 4, ...valueCell };
  setMergedCells(c, "12,6", [12], [6, 7, 8, 9]);

  c["14,0"] = { value: labels.tableTitle, colSpan: 10, bold: true, fontSize: 10, textAlign: "left", color: "#111827", ...noBorder };
  setMergedCells(c, "14,0", [14], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  c["15,0"] = { value: labels.index, ...headerCell };
  c["15,1"] = { value: labels.productCode, colSpan: 2, ...headerCell };
  setMergedCells(c, "15,1", [15], [1, 2]);
  c["15,3"] = { value: labels.productName, colSpan: 3, ...headerCell };
  setMergedCells(c, "15,3", [15], [3, 4, 5]);
  c["15,6"] = { value: labels.specification, ...headerCell };
  c["15,7"] = { value: labels.quantity, ...headerCell };
  c["15,8"] = { value: labels.unitPrice, ...headerCell };
  c["15,9"] = { value: labels.amount, ...headerCell };

  c["16,0"] = { value: "{{#each items}}{{@number}}", ...bodyCell };
  c["16,1"] = { value: "${items.productCode}", colSpan: 2, ...bodyCell };
  setMergedCells(c, "16,1", [16], [1, 2]);
  c["16,3"] = { value: "${items.productName}", colSpan: 3, textAlign: "left", ...bodyCell };
  setMergedCells(c, "16,3", [16], [3, 4, 5]);
  c["16,6"] = { value: "${items.specification}", ...bodyCell };
  c["16,7"] = { value: "${items.quantity}", ...bodyCell };
  c["16,8"] = { value: "${items.unitPrice}", ...bodyCell };
  c["16,9"] = { value: "${items.amount}{{/each}}", ...bodyCell };

  c["17,0"] = { value: labels.amountWords, bold: true, color: "#475569", colSpan: 2, ...noBorder };
  setMergedCells(c, "17,0", [17], [0, 1]);
  c["17,2"] = { value: language === "en" ? "${amountInWords}" : "${amountInWordsZh}", colSpan: 8, ...noBorder };
  setMergedCells(c, "17,2", [17], [2, 3, 4, 5, 6, 7, 8, 9]);

  c["19,0"] = { value: labels.tradeTerm, ...headerCell };
  c["19,1"] = { value: language === "en" ? "Currency" : "币种", ...headerCell };
  c["19,2"] = { value: labels.deliveryDate, colSpan: 3, ...headerCell };
  setMergedCells(c, "19,2", [19], [2, 3, 4]);
  c["19,5"] = { value: labels.paymentTerms, colSpan: 3, ...headerCell };
  setMergedCells(c, "19,5", [19], [5, 6, 7]);
  c["19,8"] = { value: labels.totalQuantity, ...headerCell };
  c["19,9"] = { value: labels.totalAmount, ...headerCell };

  c["20,0"] = { value: "${tradeTerm}", ...bodyCell };
  c["20,1"] = { value: "${currency}", ...bodyCell };
  c["20,2"] = { value: "${deliveryDate}", colSpan: 3, ...bodyCell };
  setMergedCells(c, "20,2", [20], [2, 3, 4]);
  c["20,5"] = { value: "${paymentTerms}", colSpan: 3, ...bodyCell };
  setMergedCells(c, "20,5", [20], [5, 6, 7]);
  c["20,8"] = { value: "${totalQuantity}", ...bodyCell };
  c["20,9"] = { value: "${totalAmountPlain}", ...bodyCell };

  c["21,0"] = { value: labels.shippingFee, bold: true, color: "#475569", ...noBorder };
  c["21,1"] = { value: "${shippingFee}", colSpan: 2, ...noBorder };
  setMergedCells(c, "21,1", [21], [1, 2]);

  c["23,0"] = { value: labels.bankTitle, colSpan: 10, bold: true, fontSize: 10, textAlign: "left", color: "#111827", ...noBorder };
  setMergedCells(c, "23,0", [23], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  c["24,0"] = { value: labels.paymentAccount, ...labelCell };
  c["24,1"] = { value: "${paymentAccount}", colSpan: 4, ...valueCell };
  setMergedCells(c, "24,1", [24], [1, 2, 3, 4]);
  c["24,5"] = { value: labels.bankName, ...labelCell };
  c["24,6"] = { value: "${bankName}", colSpan: 4, ...valueCell };
  setMergedCells(c, "24,6", [24], [6, 7, 8, 9]);

  c["25,0"] = { value: labels.accountNo, ...labelCell };
  c["25,1"] = { value: "${accountNo}", colSpan: 4, ...valueCell };
  setMergedCells(c, "25,1", [25], [1, 2, 3, 4]);
  c["25,5"] = { value: labels.swiftCode, ...labelCell };
  c["25,6"] = { value: "${swiftCode}", colSpan: 4, ...valueCell };
  setMergedCells(c, "25,6", [25], [6, 7, 8, 9]);

  c["26,0"] = { value: "${signatureFooterHtml}", colSpan: 10, verticalAlign: "top", ...noBorder };
  setMergedCells(c, "26,0", [26], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  c["27,0"] = {
    value: `${labels.printTime}${language === "en" ? ": " : "："}\${printTime}`,
    colSpan: 10,
    textAlign: "right",
    fontSize: 8,
    color: "#94a3b8",
    ...noBorder,
  };
  setMergedCells(c, "27,0", [27], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  return data;
}

export const SPREADSHEET_TEMPLATE_KEYS = [
  "sales_order_zh",
  "sales_order_en",
  "sales_quote_zh",
  "sales_quote_en",
  "purchase_order",
  "production_order",
  "material_requisition",
  "warehouse_in",
  "warehouse_out",
  "inventory_check",
  "ipqc_inspection",
  "oqc_inspection",
  "production_flow_card",
  "expense_claim",
  "leave_request",
  "overtime_request",
  "outing_request",
  "sterilization_outsource",
  "customs_declaration",
] as const;

const SPREADSHEET_TEMPLATE_KEY_SET = new Set<string>(SPREADSHEET_TEMPLATE_KEYS);

export function isSpreadsheetTemplateKey(templateKey: string): boolean {
  return SPREADSHEET_TEMPLATE_KEY_SET.has(templateKey);
}

// 获取默认模板数据
export function getDefaultSpreadsheetData(templateKey: string): SpreadsheetData {
  switch (templateKey) {
    case "sales_order_zh": return createSalesDocumentTemplate("zh", "order");
    case "sales_order_en": return createSalesDocumentTemplate("en", "order");
    case "sales_quote_zh": return createSalesDocumentTemplate("zh", "quote");
    case "sales_quote_en": return createSalesDocumentTemplate("en", "quote");
    case "sales_order": return createSalesOrderTemplate();
    case "purchase_order": return createPurchaseOrderTemplate();
    case "production_order": return createProductionOrderTemplate();
    case "material_requisition": return createMaterialRequisitionTemplate();
    case "warehouse_in": return createWarehouseInTemplate();
    case "warehouse_out": return createWarehouseOutTemplate();
    case "inventory_check": return createInventoryCheckTemplate();
    case "ipqc_inspection": return createIpqcInspectionTemplate();
    case "oqc_inspection": return createOqcInspectionTemplate();
    case "production_flow_card": return createProductionFlowCardTemplate();
    case "expense_claim": return createExpenseClaimTemplate();
    case "leave_request": return createLeaveRequestTemplate();
    case "overtime_request": return createOvertimeRequestTemplate();
    case "outing_request": return createOutingRequestTemplate();
    case "sterilization_outsource": return createSterilizationOutsourceTemplate();
    case "customs_declaration": return createCustomsDeclarationTemplate();
    default: return createSalesOrderTemplate();
  }
}

// ==================== 将变量定义转为字段分组 ====================

function variablesToFieldGroups(templateKey: string): FieldGroup[] {
  const def = getTemplateDefinition(templateKey);
  if (!def) return [];

  const isDocumentHeaderField = (key: string) =>
    key.startsWith("company.")
    || key.startsWith("company")
    || key === "templateCode"
    || key === "qrCodeHtml"
    || key === "signatureFooterHtml"
    || key === "printTime"
    || key === "printDate";

  const companyFields: FieldGroup = {
    name: "公司信息",
    fields: def.variables
      .filter(v => isDocumentHeaderField(v.key))
      .map(v => ({ key: v.key, label: v.label, type: v.type })),
  };

  const businessFields: FieldGroup = {
    name: "业务数据",
    fields: def.variables
      .filter(v => !isDocumentHeaderField(v.key))
      .map(v => ({
        key: v.key,
        label: v.label,
        type: v.type,
        children: v.children?.map(c => ({ key: c.key, label: c.label, type: c.type })),
      })),
  };

  return [businessFields, companyFields];
}

// ==================== 主页面组件 ====================

export default function PrintTemplatesPage() {
  const trpcUtils = trpc.useUtils();
  // 编辑模式
  const [editorMode, setEditorMode] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>(createEmptySpreadsheet());
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecordId, setPreviewRecordId] = useState<string>("__example__");
  const [previewQrCodeDataUrl, setPreviewQrCodeDataUrl] = useState("");

  // 后端数据
  const { data: savedTemplates, refetch } = api.printTemplates.list.useQuery();
  const saveMutation = api.printTemplates.save.useMutation({
    onSuccess: async () => {
      await Promise.all([
        refetch(),
        trpcUtils.printTemplates.list.invalidate(),
      ]);
      toast.success("模板已保存到服务器");
    },
    onError: (err: any) => toast.error(`保存失败：${err.message}`),
  });
  const resetMutation = api.printTemplates.reset.useMutation({
    onSuccess: async () => {
      await Promise.all([
        refetch(),
        trpcUtils.printTemplates.list.invalidate(),
      ]);
      toast.success("已恢复默认模板");
    },
    onError: (err: any) => toast.error(`重置失败：${err.message}`),
  });
  const { data: companyInfo } = api.companyInfo.get.useQuery();
  const isSalesOrderTemplate = isSalesOrderTemplateKey(selectedKey);
  const isSalesQuoteTemplate = isSalesQuoteTemplateKey(selectedKey);
  const usesRealSalesPreview = isSalesOrderTemplate || isSalesQuoteTemplate;
  const { data: bankAccounts = [] } = api.bankAccounts.list.useQuery(
    { status: "active" },
    { enabled: usesRealSalesPreview, refetchOnWindowFocus: false },
  );
  const { data: salesPreviewOrders = [] } = api.salesOrders.list.useQuery(
    { limit: 200 },
    { enabled: isSalesOrderTemplate, refetchOnWindowFocus: false },
  );
  const { data: salesPreviewQuotes = [] } = api.salesQuotes.list.useQuery(
    { limit: 200 },
    { enabled: isSalesQuoteTemplate, refetchOnWindowFocus: false },
  );
  const previewEntityId = previewRecordId === "__example__" ? 0 : Number(previewRecordId);
  const { data: previewOrderDetail } = api.salesOrders.getById.useQuery(
    { id: previewEntityId },
    { enabled: isSalesOrderTemplate && previewEntityId > 0, refetchOnWindowFocus: false },
  );
  const { data: previewQuoteDetail } = api.salesQuotes.getById.useQuery(
    { id: previewEntityId },
    { enabled: isSalesQuoteTemplate && previewEntityId > 0, refetchOnWindowFocus: false },
  );

  // 获取模板内容
  const getTemplateContent = useCallback((templateKey: string) => {
    const defaultData = getDefaultSpreadsheetData(templateKey);
    const saved = savedTemplates?.find((t: any) => (t.templateId || t.templateKey) === templateKey);
    for (const candidate of [saved?.editorConfig, saved?.html, saved?.htmlContent]) {
      if (!candidate) continue;
      try {
        const parsed = typeof candidate === "string" ? JSON.parse(candidate) : candidate;
        if (parsed?.cells && parsed?.rowCount) {
          return {
            spreadsheetData: {
              ...defaultData,
              ...parsed,
              cells: parsed.cells || defaultData.cells,
              colWidths: Array.isArray(parsed.colWidths) ? parsed.colWidths : defaultData.colWidths,
              rowHeights: Array.isArray(parsed.rowHeights) ? parsed.rowHeights : defaultData.rowHeights,
            } as SpreadsheetData,
            isCustomized: true,
          };
        }
      } catch {
        // 兼容旧模板内容，无法解析时回退到默认版
      }
    }
    return {
      spreadsheetData: defaultData,
      isCustomized: !!saved,
    };
  }, [savedTemplates]);

  // 打开编辑器
  const handleEdit = useCallback((templateKey: string) => {
    const content = getTemplateContent(templateKey);
    setSelectedKey(templateKey);
    setSpreadsheetData(content.spreadsheetData);
    setEditorMode(true);
    setShowPreview(false);
    setPreviewRecordId("__example__");
    setPreviewQrCodeDataUrl("");
  }, [getTemplateContent]);

  const previewOptions = useMemo(() => {
    if (isSalesOrderTemplate) {
      return [
        { value: "__example__", label: "示例数据" },
        ...(salesPreviewOrders as any[]).map((order: any) => ({
          value: String(order.id),
          label: `${order.orderNo || `#${order.id}`} - ${order.customerName || "未命名客户"}`,
        })),
      ];
    }
    if (isSalesQuoteTemplate) {
      return [
        { value: "__example__", label: "示例数据" },
        ...(salesPreviewQuotes as any[]).map((quote: any) => ({
          value: String(quote.id),
          label: `${quote.quoteNo || `#${quote.id}`} - ${quote.customerName || "未命名客户"}`,
        })),
      ];
    }
    return [];
  }, [isSalesOrderTemplate, isSalesQuoteTemplate, salesPreviewOrders, salesPreviewQuotes]);

  useEffect(() => {
    if (!editorMode || !usesRealSalesPreview || previewRecordId !== "__example__") return;
    if (isSalesOrderTemplate && (salesPreviewOrders as any[]).length > 0) {
      setPreviewRecordId(String((salesPreviewOrders as any[])[0].id));
      return;
    }
    if (isSalesQuoteTemplate && (salesPreviewQuotes as any[]).length > 0) {
      setPreviewRecordId(String((salesPreviewQuotes as any[])[0].id));
    }
  }, [
    editorMode,
    usesRealSalesPreview,
    previewRecordId,
    isSalesOrderTemplate,
    isSalesQuoteTemplate,
    salesPreviewOrders,
    salesPreviewQuotes,
  ]);

  const previewPayload = useMemo(() => {
    if (isSalesOrderTemplate && previewEntityId > 0) {
      return buildSalesOrderPreviewPayload(previewOrderDetail);
    }
    if (isSalesQuoteTemplate && previewEntityId > 0) {
      return buildSalesQuotePreviewPayload(previewQuoteDetail);
    }
    if (selectedKey && (isSalesOrderTemplate || isSalesQuoteTemplate)) {
      const def = getTemplateDefinition(selectedKey);
      if (!def) return null;
      return buildSalesDocumentExamplePayload(generateExampleContext(def));
    }
    return null;
  }, [
    isSalesOrderTemplate,
    isSalesQuoteTemplate,
    previewEntityId,
    previewOrderDetail,
    previewQuoteDetail,
    selectedKey,
  ]);

  useEffect(() => {
    let cancelled = false;
    const value = String(previewPayload?.orderNumber || "").trim();
    if (!usesRealSalesPreview || !value) {
      setPreviewQrCodeDataUrl("");
      return;
    }
    QRCode.toDataURL(value, {
      width: 184,
      margin: 0,
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setPreviewQrCodeDataUrl(url);
    }).catch(() => {
      if (!cancelled) setPreviewQrCodeDataUrl("");
    });
    return () => {
      cancelled = true;
    };
  }, [previewPayload?.orderNumber, usesRealSalesPreview]);

  // 生成预览 HTML
  const generatePreviewHtml = useCallback(() => {
    if (!selectedKey) return "";
    if (isSalesOrderTemplate || isSalesQuoteTemplate) {
      if (previewEntityId > 0 && !previewPayload) {
        return buildRenderedPrintDocument({
          bodyHtml: `<div style="padding:32px;color:#64748b;font-size:14px;">正在加载真实单据预览...</div>`,
          paperSize: spreadsheetData.paperSize,
          orientation: spreadsheetData.orientation,
          marginTop: spreadsheetData.marginTop,
          marginRight: spreadsheetData.marginRight,
          marginBottom: spreadsheetData.marginBottom,
          marginLeft: spreadsheetData.marginLeft,
        });
      }
      const currentTemplate = {
        templateId: selectedKey,
        name: getTemplateDefinition(selectedKey)?.name || selectedKey,
        description: "",
        editorType: "spreadsheet",
        editorConfig: JSON.stringify(spreadsheetData),
        css: "",
        html: spreadsheetToRenderableHtml(spreadsheetData),
      };
      const rendered = buildSalesDocumentTemplateRender({
        document: previewPayload || buildSalesDocumentExamplePayload(generateExampleContext(getTemplateDefinition(selectedKey)!)),
        companyInfo,
        bankAccounts: bankAccounts as any[],
        documentMode: isSalesQuoteTemplate ? "quote" : "order",
        qrCodeDataUrl: previewQrCodeDataUrl,
        templateOverride: currentTemplate,
      });
      const bodyHtml = rendered.renderedTemplate?.__html || `<div style="padding:24px;color:#64748b;">预览内容加载中</div>`;
      const orientation = rendered.renderedTemplate?.orientation || rendered.templateMeta?.orientation || spreadsheetData.orientation;
      const paperSize = rendered.renderedTemplate?.paperSize || rendered.templateMeta?.paperSize || spreadsheetData.paperSize;
      const marginTop = rendered.renderedTemplate?.marginTop ?? rendered.templateMeta?.marginTop ?? spreadsheetData.marginTop;
      const marginRight = rendered.renderedTemplate?.marginRight ?? rendered.templateMeta?.marginRight ?? spreadsheetData.marginRight;
      const marginBottom = rendered.renderedTemplate?.marginBottom ?? rendered.templateMeta?.marginBottom ?? spreadsheetData.marginBottom;
      const marginLeft = rendered.renderedTemplate?.marginLeft ?? rendered.templateMeta?.marginLeft ?? spreadsheetData.marginLeft;
      return buildRenderedPrintDocument({
        bodyHtml,
        paperSize,
        orientation,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
      });
    }
    const def = getTemplateDefinition(selectedKey);
    if (!def) return "";
    const exampleData = generateExampleContext(def);
    const ctx = createPrintContext(companyInfo || {}, exampleData);
    const htmlContent = spreadsheetToRenderableHtml(spreadsheetData);
    return buildPrintDocument({
      htmlContent,
      cssContent: "",
      context: ctx,
      paperSize: spreadsheetData.paperSize,
      orientation: spreadsheetData.orientation,
      marginTop: spreadsheetData.marginTop,
      marginRight: spreadsheetData.marginRight,
      marginBottom: spreadsheetData.marginBottom,
      marginLeft: spreadsheetData.marginLeft,
    });
  }, [
    selectedKey,
    spreadsheetData,
    companyInfo,
    isSalesOrderTemplate,
    isSalesQuoteTemplate,
    previewEntityId,
    previewPayload,
    bankAccounts,
    previewQrCodeDataUrl,
  ]);

  // 预览
  const handlePreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  useEffect(() => {
    if (!showPreview || !previewRef.current) return;
    const frame = previewRef.current;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(generatePreviewHtml());
    doc.close();
  }, [showPreview, generatePreviewHtml]);

  // 打印
  const handlePrint = useCallback(() => {
    const html = generatePreviewHtml();
    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    }
  }, [generatePreviewHtml]);

  // 保存
  const handleSave = useCallback(() => {
    if (!selectedKey) return;
    const def = getTemplateDefinition(selectedKey);
    if (!def) return;
    const renderedHtml = spreadsheetToRenderableHtml(spreadsheetData);
    saveMutation.mutate({
      templateId: selectedKey,
      name: def.name,
      description: def.description || "",
      module: def.module,
      editorType: "spreadsheet",
      editorConfig: JSON.stringify(spreadsheetData),
      css: "",
      html: renderedHtml,
    });
  }, [selectedKey, spreadsheetData, saveMutation]);

  // 恢复默认
  const handleReset = useCallback(() => {
    if (!selectedKey) return;
    resetMutation.mutate({ templateId: selectedKey });
    setSpreadsheetData(getDefaultSpreadsheetData(selectedKey));
  }, [selectedKey, resetMutation]);

  // 返回列表
  const handleBack = useCallback(() => {
    setEditorMode(false);
    setSelectedKey(null);
    setShowPreview(false);
  }, []);

  // 字段分组
  const fieldGroups = useMemo(() => {
    if (!selectedKey) return [];
    return variablesToFieldGroups(selectedKey);
  }, [selectedKey]);

  const editableTemplateDefinitions = useMemo(
    () => TEMPLATE_DEFINITIONS.filter((def) => isSpreadsheetTemplateKey(def.templateKey)),
    [],
  );
  const readonlyTemplateDefinitions = useMemo(
    () => TEMPLATE_DEFINITIONS.filter((def) => !isSpreadsheetTemplateKey(def.templateKey)),
    [],
  );

  // 按模块分组
  const moduleGroups = useMemo(() => {
    const groups: Record<string, Array<(typeof TEMPLATE_DEFINITIONS)[number]>> = {};
    for (const def of editableTemplateDefinitions) {
      if (!groups[def.module]) groups[def.module] = [];
      groups[def.module].push(def);
    }
    return groups;
  }, [editableTemplateDefinitions]);
  const readonlyModuleGroups = useMemo(() => {
    const groups: Record<string, Array<(typeof TEMPLATE_DEFINITIONS)[number]>> = {};
    for (const def of readonlyTemplateDefinitions) {
      if (!groups[def.module]) groups[def.module] = [];
      groups[def.module].push(def);
    }
    return groups;
  }, [readonlyTemplateDefinitions]);

  // ==================== 编辑器模式 ====================
  if (editorMode && selectedKey) {
    const def = getTemplateDefinition(selectedKey);
    const previewPaperMetrics = getPaperMetrics(spreadsheetData.paperSize, spreadsheetData.orientation);
    return (
      <div className="h-screen flex flex-col">
        {showPreview ? (
          // 预览模式
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="gap-1">
                  ← 返回编辑
                </Button>
                <span className="text-sm font-medium">预览 — {def?.name}</span>
                {usesRealSalesPreview ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">预览数据</span>
                    <Select value={previewRecordId} onValueChange={setPreviewRecordId}>
                      <SelectTrigger className="h-8 w-[320px] bg-white text-xs">
                        <SelectValue placeholder="选择真实单据" />
                      </SelectTrigger>
                      <SelectContent>
                        {previewOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 text-xs">
                <Printer className="h-3.5 w-3.5" /> 打印
              </Button>
            </div>
            <div className="flex-1 bg-gray-200 overflow-auto flex justify-center p-8">
              <div
                className="bg-white shadow-lg"
                style={{ width: `${previewPaperMetrics.widthMm}mm`, minHeight: `${previewPaperMetrics.heightMm}mm` }}
              >
                <iframe
                  ref={previewRef}
                  className="w-full border-0"
                  style={{ height: `${previewPaperMetrics.heightMm}mm`, minHeight: `${previewPaperMetrics.heightMm}mm` }}
                  title="打印预览"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        ) : (
          // 编辑器模式
          <SpreadsheetEditor
            data={spreadsheetData}
            onChange={setSpreadsheetData}
            fieldGroups={fieldGroups}
            templateName={def?.name || "模板"}
            onSave={handleSave}
            onPreview={handlePreview}
            onPrint={handlePrint}
            onBack={handleBack}
            onReset={handleReset}
            saving={saveMutation.isPending}
          />
        )}
      </div>
    );
  }

  // ==================== 列表模式 ====================
  return (
    <ERPLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Printer className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">打印模板管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              类 Excel 可视化编辑器 — 拖拽字段到表格中，所见即所得
            </p>
          </div>
        </div>

        {/* 使用说明 */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3 text-sm text-blue-800">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">操作说明：</span>
                点击"编辑模板"进入类 Excel 编辑器。左侧字段面板可拖拽字段到表格单元格中，
                使用 <code className="bg-blue-100 px-1 rounded">{"${字段名}"}</code> 语法插入变量。
                支持合并单元格、字体格式化、边框设置等。编辑器中的效果与打印输出完全一致。
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 按模块分组展示 */}
        {Object.entries(moduleGroups).map(([moduleId, templates]) => (
          <div key={moduleId} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold">{MODULE_LABELS[moduleId] || moduleId}</h2>
              <Badge variant="secondary" className="text-xs">{templates.length} 个模板</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((def) => {
                const Icon = ICON_MAP[def.templateKey] || FileText;
                const color = COLOR_MAP[def.module] || "bg-gray-50 border-gray-200 text-gray-700";
                const content = getTemplateContent(def.templateKey);
                return (
                  <Card key={def.templateKey} className="border transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg border ${color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">{def.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{MODULE_LABELS[def.module]}</p>
                          </div>
                        </div>
                        {content.isCustomized && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50">
                            已自定义
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{def.description}</p>
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">可用字段：</p>
                        <div className="flex flex-wrap gap-1">
                          {def.variables.filter(v => !v.key.startsWith("company.") && v.key !== "printTime" && v.key !== "printDate").slice(0, 5).map((v) => (
                            <Badge key={v.key} variant="secondary" className="text-xs px-1.5 py-0">
                              {v.label}
                            </Badge>
                          ))}
                          {def.variables.filter(v => !v.key.startsWith("company.") && v.key !== "printTime" && v.key !== "printDate").length > 5 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 text-muted-foreground">
                              +{def.variables.filter(v => !v.key.startsWith("company.") && v.key !== "printTime" && v.key !== "printDate").length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator className="mb-3" />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handleEdit(def.templateKey)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> 编辑模板
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {readonlyTemplateDefinitions.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold">系统默认模板</h2>
              <Badge variant="secondary" className="text-xs">{readonlyTemplateDefinitions.length} 个模板</Badge>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              这部分模板已经接入业务详情页的打印预览按钮，当前使用系统默认 HTML 模板渲染，不走类 Excel 可视化编辑器。
            </p>
            {Object.entries(readonlyModuleGroups).map(([moduleId, templates]) => (
              <div key={`readonly-${moduleId}`} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-semibold">{MODULE_LABELS[moduleId] || moduleId}</h3>
                  <Badge variant="secondary" className="text-xs">{templates.length} 个模板</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((def) => {
                    const Icon = ICON_MAP[def.templateKey] || FileText;
                    const color = COLOR_MAP[def.module] || "bg-gray-50 border-gray-200 text-gray-700";
                    return (
                      <Card key={def.templateKey} className="border transition-shadow hover:shadow-md">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg border ${color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <CardTitle className="text-sm font-semibold">{def.name}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">{MODULE_LABELS[def.module]}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              系统模板
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{def.description}</p>
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">可用字段：</p>
                            <div className="flex flex-wrap gap-1">
                              {def.variables.filter(v => !v.key.startsWith("company.") && v.key !== "printTime" && v.key !== "printDate").slice(0, 5).map((v) => (
                                <Badge key={v.key} variant="secondary" className="text-xs px-1.5 py-0">
                                  {v.label}
                                </Badge>
                              ))}
                              {def.variables.filter(v => !v.key.startsWith("company.") && v.key !== "printTime" && v.key !== "printDate").length > 5 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 text-muted-foreground">
                                  +{def.variables.filter(v => !v.key.startsWith("company.") && v.key !== "printTime" && v.key !== "printDate").length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            该模板已可在对应单据详情页中直接打印预览，后续如需可视化编辑，可再升级为类 Excel 模板。
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ERPLayout>
  );
}
