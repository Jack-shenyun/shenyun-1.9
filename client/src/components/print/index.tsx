import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  formatCurrencyValue,
  formatDateTime,
  formatDateValue,
  formatDisplayNumber,
  splitRoundedValue,
} from "@/lib/formatters";
import QRCode from "qrcode";
import { PrintTemplate } from "../PrintTemplate";
import { normalizePaymentCondition } from "@shared/paymentTerms";
import { rawTemplateValue, renderStoredPrintTemplate } from "@/lib/printTemplates";
import { getDefaultSpreadsheetData } from "@/pages/settings/PrintTemplates";
import sealContractSpecial from "@/assets/seal-contract-special.svg";
import sealCompanyEn from "@/assets/seal-company-en.svg";
import { buildSalesDocumentTemplateRender } from "@/lib/salesDocumentPrint";

type CompanyInfo = {
  logoUrl?: string | null;
  companyNameCn?: string | null;
  companyNameEn?: string | null;
  addressCn?: string | null;
  addressEn?: string | null;
  website?: string | null;
  email?: string | null;
  contactNameCn?: string | null;
  contactNameEn?: string | null;
  phone?: string | null;
};

type BaseCustomerInfo = {
  customerType?: string;
  customerCountry?: string;
  currency?: string;
};

const DOMESTIC_COUNTRY_SET = new Set(["中国", "中国大陆", "China", "CN", "PRC"]);

function isOverseasCustomer(customerType?: string, customerCountry?: string) {
  if (customerType === "overseas") return true;
  if (!customerCountry) return false;
  return !DOMESTIC_COUNTRY_SET.has(String(customerCountry).trim());
}

function localizeCountry(country?: string, english = false) {
  if (!country) return "-";
  const normalized = String(country).trim();
  const map: Record<string, { zh: string; en: string }> = {
    中国: { zh: "中国", en: "China" },
    中国大陆: { zh: "中国", en: "China" },
    美国: { zh: "美国", en: "United States" },
    日本: { zh: "日本", en: "Japan" },
    德国: { zh: "德国", en: "Germany" },
  };
  const matched = map[normalized];
  if (matched) return english ? matched.en : matched.zh;
  return normalized;
}

function getCurrencySymbol(currency?: string | null) {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "HKD":
      return "HK$";
    case "CNY":
    default:
      return "¥";
  }
}

function formatMoney(amount: number, currency?: string | null, locale: "zh-CN" | "en-US" = "zh-CN") {
  const symbol = getCurrencySymbol(currency);
  return formatCurrencyValue(amount, symbol, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    locale,
  });
}

function formatPrintNumber(
  value: unknown,
  locale: "zh-CN" | "en-US" = "zh-CN",
  maximumFractionDigits = 2,
) {
  return formatDisplayNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
    locale,
  });
}

function getLocalizedPaymentTerm(paymentMethod?: string, english = false) {
  const normalized = normalizePaymentCondition(paymentMethod || "");
  const zhMap: Record<string, string> = {
    预付款: "预付款",
    先款后货: "先款后货",
    货到付款: "货到付款",
    账期支付: "账期支付",
  };
  const enMap: Record<string, string> = {
    预付款: "Prepayment",
    先款后货: "Advance Payment Before Delivery",
    货到付款: "Cash On Delivery",
    账期支付: "Account Period Payment",
  };
  if (!normalized) return "-";
  return english ? enMap[normalized] || normalized : zhMap[normalized] || normalized;
}

function formatPrintNotes(notes?: string, english = false) {
  if (!notes) return "";
  const raw = String(notes).trim();
  const prepayMatch = raw.match(/\[PREPAY_RATIO\]\s*(\d+(?:\.\d+)?)/i);
  if (prepayMatch) {
    const ratio = prepayMatch[1];
    return english ? `Prepayment Ratio: ${ratio}%` : `预付比例：${ratio}%`;
  }
  return raw;
}

function toWordsBelowThousand(num: number) {
  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  let result = "";
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  if (hundred > 0) {
    result += `${ones[hundred]} HUNDRED`;
    if (rest > 0) result += " ";
  }
  if (rest < 20) {
    result += ones[rest];
  } else {
    const ten = Math.floor(rest / 10);
    const one = rest % 10;
    result += tens[ten];
    if (one > 0) result += `-${ones[one]}`;
  }
  return result.trim();
}

function convertUsdToWords(amount: number) {
  const integerPart = Math.floor(Number(amount || 0));
  const cents = Math.round((Number(amount || 0) - integerPart) * 100);
  if (integerPart === 0 && cents === 0) return "ZERO US DOLLARS ONLY";

  const units = [
    { value: 1_000_000_000, label: "BILLION" },
    { value: 1_000_000, label: "MILLION" },
    { value: 1_000, label: "THOUSAND" },
    { value: 1, label: "" },
  ];

  let remaining = integerPart;
  const parts: string[] = [];
  for (const unit of units) {
    if (remaining >= unit.value) {
      const chunk = Math.floor(remaining / unit.value);
      remaining %= unit.value;
      const chunkWords = toWordsBelowThousand(chunk);
      parts.push(unit.label ? `${chunkWords} ${unit.label}` : chunkWords);
    }
  }

  const dollarWords = `${parts.join(" ").trim()} US DOLLARS`;
  if (cents > 0) {
    return `${dollarWords} AND ${toWordsBelowThousand(cents)} CENTS ONLY`;
  }
  return `${dollarWords} ONLY`;
}

function convertNumberToChineseUpper(amount: number) {
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const units = ["", "拾", "佰", "仟"];
  const bigUnits = ["", "万", "亿", "兆"];
  const value = Math.round(Number(amount || 0));
  if (!value) return "零元整";
  let integer = String(value);
  let result = "";
  let groupIndex = 0;
  while (integer.length > 0) {
    const group = integer.slice(-4);
    integer = integer.slice(0, -4);
    let groupText = "";
    for (let i = 0; i < group.length; i++) {
      const digit = Number(group[i]);
      const pos = group.length - i - 1;
      if (digit === 0) {
        if (!groupText.endsWith("零") && groupText) groupText += "零";
      } else {
        groupText += digits[digit] + units[pos];
      }
    }
    groupText = groupText.replace(/零+$/g, "");
    if (groupText) result = groupText + bigUnits[groupIndex] + result;
    groupIndex += 1;
  }
  return result.replace(/零+/g, "零").replace(/零(万|亿|兆)/g, "$1") + "元整";
}

function renderHeader(companyInfo: CompanyInfo | undefined, english: boolean) {
  const companyName = english
    ? companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd"
    : companyInfo?.companyNameCn || "苏州神韵医疗器械有限公司";
  const address = english
    ? companyInfo?.addressEn || companyInfo?.addressCn || "-"
    : companyInfo?.addressCn || companyInfo?.addressEn || "-";
  const contractPhone = english ? "+86-0512-65209633" : "0512-65209633";
  return (
    <div className="border-b border-slate-300 pb-3">
      <div className="flex items-start justify-between gap-8">
        <div className="flex items-start gap-4 pt-0.5">
          {companyInfo?.logoUrl ? (
            <img src={companyInfo.logoUrl} alt="logo" className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex h-10 w-24 items-center justify-center border border-slate-300 text-sm font-semibold tracking-wide text-slate-600">
              SHENYUN
            </div>
          )}
        </div>
        <div className="flex-1 text-right">
          <div className="text-[21px] font-semibold leading-tight text-slate-900">{companyName}</div>
          <div className="mt-1.5 space-y-0.5 text-[11px] leading-5 text-slate-600">
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-0.5">
              <span>{contractPhone}</span>
              {companyInfo?.email ? <span>{companyInfo.email}</span> : null}
              {companyInfo?.website ? <span>{companyInfo.website}</span> : null}
            </div>
            <div>{address}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toPrintableNode(value: unknown, fallback = "-"): React.ReactNode {
  if (value == null || value === "") return fallback;
  if (React.isValidElement(value)) return value;
  if (value instanceof Date) return formatDateTime(value);
  if (Array.isArray(value)) {
    return value.map((item, index) => (
      <React.Fragment key={index}>{toPrintableNode(item, "")}</React.Fragment>
    ));
  }
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function renderLabeledGrid(
  rows: Array<{ label: string; value?: React.ReactNode }>,
  columns = 2,
  options?: {
    labelWidthClassName?: string;
    valueClassName?: string;
    rowClassName?: string;
    showRowBorder?: boolean;
  },
) {
  return (
    <div
      className="grid gap-x-8 gap-y-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-start gap-3 py-1.5 text-sm ${options?.showRowBorder === false ? "" : "border-b border-slate-100"} ${options?.rowClassName || ""}`}
        >
          <span className={`shrink-0 font-medium text-slate-600 ${options?.labelWidthClassName || "min-w-24"}`}>
            {row.label}
          </span>
          <span className={`min-w-0 flex-1 break-words text-slate-900 ${options?.valueClassName || ""}`}>
            {toPrintableNode(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderTable(
  columns: Array<{ key: string; label: string; align?: "left" | "center" | "right"; width?: string }>,
  data: Array<Record<string, React.ReactNode>>,
) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-y border-slate-300">
          {columns.map((column) => (
            <th
              key={column.key}
              className="px-2 py-2 font-semibold text-slate-700"
              style={{ textAlign: column.align || "left", width: column.width }}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index} className="border-b border-slate-100">
            {columns.map((column) => (
              <td
                key={column.key}
                className="px-2 py-2 align-top text-slate-900"
                style={{ textAlign: column.align || "left", width: column.width }}
              >
                {toPrintableNode(row[column.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildTemplateLogoHtml(companyInfo: CompanyInfo | undefined) {
  if (companyInfo?.logoUrl) {
    return `<img src="${companyInfo.logoUrl}" alt="logo" style="height:40px;width:auto;object-fit:contain;" />`;
  }
  return `<div style="display:flex;height:40px;width:96px;align-items:center;justify-content:center;border:1px solid #cbd5e1;font-size:14px;font-weight:600;letter-spacing:1px;color:#475569;">SHENYUN</div>`;
}

function buildTemplateRowHtml(cells: Array<string>) {
  return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
}

function escapeHtmlText(value?: string | null) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSignatureFooterHtml(english: boolean, companyInfo?: CompanyInfo, notes?: string, stampUrl?: string) {
  const normalizedNotes = formatPrintNotes(notes, english);
  const companyName = english
    ? companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd"
    : companyInfo?.companyNameCn || "苏州神韵医疗器械有限公司";
  const noteBlock = normalizedNotes
    ? `<div style="border-top:1px solid #cbd5e1;padding-top:12px;margin-top:4px;">
        <div style="margin-bottom:4px;font-size:13px;font-weight:600;color:#334155;">${english ? "Remarks" : "备注"}</div>
        <div style="white-space:pre-wrap;font-size:12px;line-height:1.7;color:#475569;">${escapeHtmlText(normalizedNotes)}</div>
      </div>`
    : "";
  const stampBlock = stampUrl
    ? `<div style="margin-bottom:4px;margin-top:-8px;display:flex;justify-content:center;">
        <img src="${stampUrl}" alt="${english ? "official seal" : "印章"}" style="height:96px;width:96px;object-fit:contain;opacity:.9;" />
      </div>`
    : "";
  return `<div style="padding-top:16px;">
    ${noteBlock}
    <div style="display:flex;justify-content:flex-end;padding-top:12px;">
      <div style="min-width:${english ? 260 : 240}px;text-align:center;">
        ${stampBlock}
        <div style="border-bottom:1px solid #94a3b8;padding-bottom:4px;font-size:14px;font-weight:600;color:#1f2937;">${escapeHtmlText(companyName)}</div>
        <div style="margin-top:6px;font-size:12px;color:#64748b;">${english ? "Authorized Signature" : "签字/盖章"}</div>
      </div>
    </div>
  </div>`;
}

function renderSignatureFooter(english: boolean, companyInfo?: CompanyInfo, notes?: string, stampUrl?: string) {
  const normalizedNotes = formatPrintNotes(notes, english);
  return (
    <div className="space-y-4 pt-4">
      {normalizedNotes ? (
        <div className="border-t border-slate-300 pt-3">
          <div className="mb-1 text-sm font-medium text-slate-700">{english ? "Remarks" : "备注"}</div>
          <div className="whitespace-pre-wrap text-sm text-slate-700">{normalizedNotes}</div>
        </div>
      ) : null}
      <div className="flex items-end justify-between gap-10 pt-3">
        <div className="flex-1" />
        <div className="min-w-[260px] text-center">
          {stampUrl ? (
            <div className="mb-1 -mt-2 flex justify-center">
              <img src={stampUrl} alt={english ? "official seal" : "印章"} className="h-24 w-24 object-contain opacity-90" />
            </div>
          ) : null}
          <div className="border-b border-slate-400 pb-1 text-sm font-medium text-slate-800">
            {english
              ? companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd"
              : companyInfo?.companyNameCn || "苏州神韵医疗器械有限公司"}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">{english ? "Authorized Signature" : "签字/盖章"}</div>
        </div>
      </div>
    </div>
  );
}

function renderBankInfoGrid(
  english: boolean,
  bankName?: string | null,
  accountNo?: string | null,
  swiftCode?: string | null,
  bankAddress?: string | null,
) {
  const rows = [
    [
      { label: english ? "Beneficiary Bank" : "开户行", value: bankName || "-" },
      null,
    ],
    [
      { label: english ? "Account No." : "银行账号", value: accountNo || "-" },
      { label: english ? "SWIFT / Code" : "行号/SWIFT", value: swiftCode || "-" },
    ],
    [
      { label: english ? "Bank Address" : "银行地址", value: bankAddress || "-" },
      null,
    ],
  ];

  return (
    <div className="space-y-0">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid grid-cols-2 gap-x-8 py-1.5 text-sm"
        >
          {row.map((cell, cellIndex) => (
            <div key={cellIndex} className="flex items-start gap-3">
              {cell ? (
                <>
                  <div className={`shrink-0 font-medium text-slate-600 ${english ? "min-w-32" : "min-w-20"}`}>
                    {cell.label}
                  </div>
                  <div className="min-w-0 flex-1 break-words text-slate-900">{toPrintableNode(cell.value)}</div>
                </>
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const api = trpc as any;

function useCompanyInfo() {
  const { data } = api.companyInfo.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  return (data || undefined) as CompanyInfo | undefined;
}

// ========== 销售订单打印 ==========
interface SalesOrderPrintProps {
  open: boolean;
  onClose: () => void;
  documentMode?: "order" | "quote";
  order: BaseCustomerInfo & {
    orderNumber: string;
    orderDate: string;
    deliveryDate?: string;
    customerName: string;
    customerCode?: string;
    shippingAddress?: string;
    shippingContact?: string;
    shippingPhone?: string;
    paymentMethod?: string;
    status: string;
    totalAmount: number;
    items: Array<{
      productName: string;
      productCode?: string;
      specification?: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    notes?: string;
    salesPersonName?: string;
    tradeTerm?: string;
    shippingFee?: number;
    paymentAccount?: string;
    paymentAccountId?: number | null;
  };
}

export function SalesOrderPrint({ open, onClose, order, documentMode = "order" }: SalesOrderPrintProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const companyInfo = useCompanyInfo();
  const { data: bankAccounts = [] } = api.bankAccounts.list.useQuery({ status: "active" }, { refetchOnWindowFocus: false });
  const { data: printTemplates = [] } = api.printTemplates.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const english = isOverseasCustomer(order.customerType, order.customerCountry);
  const locale = english ? "en-US" : "zh-CN";
  const isQuote = documentMode === "quote";
  const documentTitle = english ? (isQuote ? "Quotation" : "Sales Order") : (isQuote ? "报价单" : "销售订单");
  const previewTitle = english ? documentTitle : `${documentTitle}打印预览`;
  const totalQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const matchedBankAccount = (bankAccounts as any[]).find((account) =>
    order.paymentAccountId ? Number(account.id) === Number(order.paymentAccountId) : account.accountName === order.paymentAccount,
  );
  const bankAddress = String(matchedBankAccount?.bankAddress || "").trim()
    || String(matchedBankAccount?.remark || "").match(/地址:([^]+?)(?:\s行号:|$)/)?.[1]?.trim()
    || "-";
  const usdAmountInWords = String(order.currency || "").toUpperCase() === "USD"
    ? convertUsdToWords(order.totalAmount)
    : "";

  useEffect(() => {
    let cancelled = false;
    const value = String(order.orderNumber || "").trim();
    if (!value) {
      setQrCodeDataUrl("");
      return;
    }
    QRCode.toDataURL(value, {
      width: 184,
      margin: 0,
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setQrCodeDataUrl(url);
    }).catch(() => {
      if (!cancelled) setQrCodeDataUrl("");
    });
    return () => {
      cancelled = true;
    };
  }, [order.orderNumber]);

  const salesTemplateId = english
    ? (isQuote ? "sales_quote_en" : "sales_order_en")
    : (isQuote ? "sales_quote_zh" : "sales_order_zh");
  const stampUrl = english ? sealCompanyEn : sealContractSpecial;
  const salesDocumentTemplate = buildSalesDocumentTemplateRender({
    document: order,
    companyInfo,
    bankAccounts: bankAccounts as any[],
    printTemplates: printTemplates as any[],
    documentMode,
    qrCodeDataUrl,
    defaultSpreadsheetData: getDefaultSpreadsheetData(salesTemplateId),
  });
  const templateMeta = salesDocumentTemplate.templateMeta;
  const customTemplateHtml = salesDocumentTemplate.renderedTemplate;
  const templateOrientation = (customTemplateHtml?.orientation || templateMeta?.orientation || "portrait") as "portrait" | "landscape";
  const templatePaperSize = customTemplateHtml?.paperSize || templateMeta?.paperSize || "A4";
  const templateMarginTop = customTemplateHtml?.marginTop ?? templateMeta?.marginTop ?? 12;
  const templateMarginRight = customTemplateHtml?.marginRight ?? templateMeta?.marginRight ?? 14;
  const templateMarginBottom = customTemplateHtml?.marginBottom ?? templateMeta?.marginBottom ?? 12;
  const templateMarginLeft = customTemplateHtml?.marginLeft ?? templateMeta?.marginLeft ?? 14;
  const usingSpreadsheetEditorTemplate = salesDocumentTemplate.usingSpreadsheetEditorTemplate;

  const columns = english
    ? [
        { key: "index", label: "Item", align: "center" as const, width: "8%" },
        { key: "productCode", label: "Ref", width: "14%" },
        { key: "productName", label: "Product name", width: "36%" },
        { key: "specification", label: "Specification", width: "16%" },
        { key: "quantity", label: "Qty", align: "right" as const, width: "8%" },
        { key: "unitPrice", label: "Unit Price", align: "right" as const, width: "9%" },
        { key: "amount", label: "Amount", align: "right" as const, width: "9%" },
      ]
    : [
        { key: "index", label: "序号", align: "center" as const, width: "8%" },
        { key: "productCode", label: "产品编码", width: "16%" },
        { key: "productName", label: "产品名称", width: "30%" },
        { key: "specification", label: "规格型号", width: "14%" },
        { key: "quantity", label: "数量", align: "right" as const, width: "10%" },
        { key: "unitPrice", label: "单价", align: "right" as const, width: "10%" },
        { key: "amount", label: "小计", align: "right" as const, width: "12%" },
      ];

  const data = order.items.map((item, index) => ({
    index: index + 1,
    productCode: item.productCode || "-",
    productName: item.productName,
    specification: item.specification || "-",
    quantity: formatPrintNumber(item.quantity, locale),
    unitPrice: formatMoney(item.unitPrice, order.currency, locale),
    amount: formatMoney(item.amount, order.currency, locale),
  }));
  const extraRows = english
    ? [
        { label: "Currency", value: order.currency || "CNY" },
        { label: "Trade Term", value: order.tradeTerm || "-" },
        { label: "Shipping Method", value: getLocalizedPaymentTerm(order.paymentMethod, true) },
        { label: "Shipping Fee", value: formatMoney(order.shippingFee || 0, order.currency, locale) },
        { label: "Delivery Date", value: order.deliveryDate || "-" },
      ]
    : [
        { label: "币种", value: order.currency || "CNY" },
        { label: "贸易条款", value: order.tradeTerm || "-" },
        { label: "付款条件", value: getLocalizedPaymentTerm(order.paymentMethod, false) },
        { label: "运费", value: formatMoney(order.shippingFee || 0, order.currency, locale) },
        { label: "交货日期", value: order.deliveryDate || "-" },
      ];

  const customerRows = english
    ? [
        { label: "Company", value: order.customerName },
        { label: "Address", value: order.shippingAddress },
        { label: "Contact", value: order.shippingContact },
        { label: "Telephone", value: order.shippingPhone },
      ]
    : [
        { label: "客户名称", value: order.customerName },
        { label: "客户地址", value: order.shippingAddress },
        { label: "联系人", value: order.shippingContact },
        { label: "电话", value: order.shippingPhone },
      ];

  if (customTemplateHtml) {
    return (
      <PrintTemplate
        open={open}
        onClose={onClose}
        title={previewTitle}
        paperSize={templatePaperSize}
        orientation={templateOrientation}
        landscape={templateOrientation === "landscape"}
        marginTop={templateMarginTop}
        marginRight={templateMarginRight}
        marginBottom={templateMarginBottom}
        marginLeft={templateMarginLeft}
      >
        <div className="space-y-4">
          <div dangerouslySetInnerHTML={customTemplateHtml} />
          {usingSpreadsheetEditorTemplate ? null : renderSignatureFooter(english, companyInfo, order.notes, stampUrl)}
        </div>
      </PrintTemplate>
    );
  }

  return (
    <PrintTemplate open={open} onClose={onClose} title={previewTitle} paperSize="A4" orientation="portrait">
      <div className="space-y-4 text-slate-900">
        {renderHeader(companyInfo, english)}

        <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-3">
          <div>
            <div className="text-[34px] font-semibold leading-none">{documentTitle}</div>
          </div>
          <div className="min-w-[240px] space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium text-slate-600">{english ? "Order No." : "订单编号"}</span>
              <span>{toPrintableNode(order.orderNumber)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium text-slate-600">{english ? "Order Date" : "日期"}</span>
              <span>{toPrintableNode(formatDateValue(order.orderDate))}</span>
            </div>
            {order.deliveryDate ? (
              <div className="flex justify-between gap-3">
                <span className="font-medium text-slate-600">{english ? "Delivery Date" : "交货日期"}</span>
                <span>{toPrintableNode(formatDateValue(order.deliveryDate))}</span>
              </div>
            ) : null}
            {order.customerCountry ? (
              <div className="flex justify-between gap-3">
                <span className="font-medium text-slate-600">{english ? "Country" : "国家"}</span>
                <span>{toPrintableNode(localizeCountry(order.customerCountry, english))}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-y border-slate-200 py-1">
          {Array.from({ length: Math.ceil(customerRows.length / 2) }).map((_, rowIndex) => {
            const leftRow = customerRows[rowIndex * 2];
            const rightRow = customerRows[rowIndex * 2 + 1];
            return (
              <div key={`${leftRow?.label || rowIndex}-${rightRow?.label || rowIndex}`} className="grid grid-cols-2 gap-x-8 py-1.5 text-sm">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 font-medium text-slate-600 ${english ? "min-w-24" : "min-w-20"}`}>
                    {leftRow?.label}
                  </div>
                  <div className="min-w-0 flex-1 break-words text-slate-900">{leftRow?.value || "-"}</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 font-medium text-slate-600 ${english ? "min-w-24" : "min-w-20"}`}>
                    {rightRow?.label}
                  </div>
                  <div className="min-w-0 flex-1 break-words text-slate-900">{rightRow?.value || "-"}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            {english ? "Detailed Order Sheet" : "订单内容"}
          </div>
          {renderTable(columns, data)}
          {(order.shippingFee || 0) > 0 ? (
            <div className="mt-2 flex justify-end text-sm text-slate-700">
              <span className="min-w-[220px] text-right">
                {english ? "Shipping Fee: " : "运费："}
                {formatMoney(order.shippingFee || 0, order.currency, locale)}
              </span>
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-[1fr_220px] gap-6 border-t border-slate-300 pt-3 text-sm">
            <div className="min-h-[48px]">
              {usdAmountInWords ? (
                <div>
                  <div className="mb-1 text-xs text-slate-500">{english ? "Amount in Words" : "美元金额大写"}</div>
                  <div className="text-[12px] font-medium leading-5 text-slate-800">{usdAmountInWords}</div>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{english ? "Total Quantity" : "总数量"}</span>
                <span className="font-medium">{formatPrintNumber(totalQuantity, locale)}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-slate-700">{english ? "Total Amount" : "订单总额"}</span>
                <span className="font-semibold">{formatMoney(order.totalAmount, order.currency, locale)}</span>
              </div>
            </div>
          </div>
        </div>

        {renderLabeledGrid(extraRows, 2, {
          labelWidthClassName: english ? "min-w-24" : "min-w-18",
          valueClassName: "text-right",
          showRowBorder: false,
        })}

        {matchedBankAccount || usdAmountInWords ? (
          <div className="border-t border-slate-300 pt-3">
            <div className="space-y-3">
              {matchedBankAccount ? (
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    {english ? "Bank Information" : "银行收款信息"}
                  </div>
                  {renderBankInfoGrid(
                    english,
                    matchedBankAccount.bankName,
                    matchedBankAccount.accountNo,
                    matchedBankAccount.swiftCode,
                    bankAddress,
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {renderSignatureFooter(english, companyInfo, order.notes, stampUrl)}
      </div>
    </PrintTemplate>
  );
}

// ========== 发货单打印 ==========
interface DeliveryNotePrintProps {
  open: boolean;
  onClose: () => void;
  order: BaseCustomerInfo & {
    orderNumber: string;
    deliveryDate: string;
    customerName: string;
    shippingAddress?: string;
    shippingContact?: string;
    shippingPhone?: string;
    items: Array<{
      productName: string;
      productCode?: string;
      specification?: string;
      quantity: number;
      unit?: string;
      batchNumber?: string;
      serialNumber?: string;
    }>;
    notes?: string;
    deliveryPerson?: string;
    vehicleNumber?: string;
  };
}

export function DeliveryNotePrint({ open, onClose, order }: DeliveryNotePrintProps) {
  const companyInfo = useCompanyInfo();
  const english = isOverseasCustomer(order.customerType, order.customerCountry);
  const locale = english ? "en-US" : "zh-CN";
  const columns = english
    ? [
        { key: "index", label: "Item", align: "center" as const },
        { key: "productCode", label: "Ref" },
        { key: "productName", label: "Product name" },
        { key: "specification", label: "Model" },
        { key: "quantity", label: "Qty", align: "right" as const },
        { key: "unit", label: "Unit", align: "center" as const },
        { key: "batchNumber", label: "Batch No." },
      ]
    : [
        { key: "index", label: "序号", align: "center" as const },
        { key: "productCode", label: "产品编码" },
        { key: "productName", label: "产品名称" },
        { key: "specification", label: "规格型号" },
        { key: "quantity", label: "数量", align: "right" as const },
        { key: "unit", label: "单位", align: "center" as const },
        { key: "batchNumber", label: "批号" },
      ];
  const data = order.items.map((item, index) => ({
    index: index + 1,
    productCode: item.productCode || "-",
    productName: item.productName,
    specification: item.specification || "-",
    quantity: formatPrintNumber(item.quantity, locale),
    unit: item.unit || (english ? "PCS" : "件"),
    batchNumber: item.batchNumber || item.serialNumber || "-",
  }));
  const customTemplateHtml = renderStoredPrintTemplate("delivery_note", {
    companyLogo: rawTemplateValue(buildTemplateLogoHtml(companyInfo)),
    companyName: english
      ? companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd."
      : companyInfo?.companyNameCn || "苏州神韵医疗器械有限公司",
    companyAddress: english
      ? companyInfo?.addressEn || companyInfo?.addressCn || "-"
      : companyInfo?.addressCn || companyInfo?.addressEn || "-",
    orderNumber: order.orderNumber,
    deliveryDate: order.deliveryDate || "-",
    customerName: order.customerName,
    shippingAddress: order.shippingAddress || "-",
    shippingContact: order.shippingContact || "-",
    shippingPhone: order.shippingPhone || "-",
    deliveryPerson: order.deliveryPerson || "-",
    vehicleNumber: order.vehicleNumber || "-",
    itemRows: rawTemplateValue(
      order.items
        .map((item, index) =>
          buildTemplateRowHtml([
            String(index + 1),
            item.productCode || "-",
            item.productName || "-",
            item.specification || "-",
            formatPrintNumber(item.quantity, locale),
            item.unit || (english ? "PCS" : "件"),
            item.batchNumber || item.serialNumber || "-",
          ]),
        )
        .join(""),
    ),
  });

  if (customTemplateHtml) {
    return (
      <PrintTemplate open={open} onClose={onClose} title={english ? "Delivery Note Preview" : "发货单打印预览"}>
        <div dangerouslySetInnerHTML={customTemplateHtml} />
      </PrintTemplate>
    );
  }

  return (
    <PrintTemplate open={open} onClose={onClose} title={english ? "Delivery Note Preview" : "发货单打印预览"}>
      <div className="mx-auto max-w-[780px] space-y-6 text-slate-900">
        {renderHeader(companyInfo, english)}
        <div className="flex items-start justify-between gap-8">
          <div className="text-2xl font-semibold">{english ? "Delivery Note" : "发货单"}</div>
          <div className="min-w-[220px] space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium text-slate-600">{english ? "Order No." : "订单号"}</span>
              <span>{order.orderNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium text-slate-600">{english ? "Delivery Date" : "发货日期"}</span>
              <span>{formatDateValue(order.deliveryDate)}</span>
            </div>
          </div>
        </div>
        {renderLabeledGrid(
          english
            ? [
                { label: "Customer", value: order.customerName },
                { label: "Address", value: order.shippingAddress },
                { label: "Contact", value: order.shippingContact },
                { label: "Telephone", value: order.shippingPhone },
                { label: "Delivery Staff", value: order.deliveryPerson },
                { label: "Vehicle No.", value: order.vehicleNumber },
              ]
            : [
                { label: "客户名称", value: order.customerName },
                { label: "收货地址", value: order.shippingAddress },
                { label: "收货联系人", value: order.shippingContact },
                { label: "联系电话", value: order.shippingPhone },
                { label: "配送人员", value: order.deliveryPerson },
                { label: "车牌号", value: order.vehicleNumber },
              ],
        )}
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            {english ? "Delivery Items" : "发货明细"}
          </div>
          {renderTable(columns, data)}
        </div>
        <div className="border border-slate-300 p-4">
          <div className="mb-4 text-sm font-medium">{english ? "Receiving Confirmation" : "收货确认"}</div>
          <div className="text-sm text-slate-600">
            {english
              ? "The goods listed above have been received in good order and quantity."
              : "上述货物已收讫，数量、规格无误。"}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-10 text-sm">
            <div>
              <div className="mb-2">{english ? "Receiver Signature" : "收货人签字"}</div>
              <div className="h-10 border-b border-slate-400" />
            </div>
            <div>
              <div className="mb-2">{english ? "Date" : "签收日期"}</div>
              <div className="h-10 border-b border-slate-400" />
            </div>
          </div>
        </div>
        {renderSignatureFooter(english, companyInfo, order.notes)}
      </div>
    </PrintTemplate>
  );
}

// ========== 收据打印 ==========
interface ReceiptPrintProps {
  open: boolean;
  onClose: () => void;
  receipt: BaseCustomerInfo & {
    receiptNumber: string;
    receiptDate: string;
    orderNumber: string;
    customerName: string;
    paymentMethod: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    notes?: string;
    cashier?: string;
    paymentAccount?: string;
  };
}

const convertToChinese = (amount: number): string => {
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const units = ["", "拾", "佰", "仟", "万", "拾", "佰", "仟", "亿"];
  const decimalUnits = ["角", "分"];

  if (amount === 0) return "零元整";

  const { integerPart, fractionPart: decimalPart } = splitRoundedValue(amount, 2);
  let result = "";
  const intStr = integerPart.split("").reverse();

  for (let i = 0; i < intStr.length; i += 1) {
    const digit = parseInt(intStr[i], 10);
    if (digit !== 0) {
      result = digits[digit] + units[i] + result;
    } else if (result && result[0] !== "零") {
      result = "零" + result;
    }
  }

  result += "元";

  if (decimalPart) {
    const dec1 = parseInt(decimalPart[0], 10);
    const dec2 = parseInt(decimalPart[1], 10);
    if (dec1 !== 0) result += digits[dec1] + decimalUnits[0];
    if (dec2 !== 0) result += digits[dec2] + decimalUnits[1];
    if (dec1 === 0 && dec2 === 0) result += "整";
  } else {
    result += "整";
  }

  return result;
};

export function ReceiptPrint({ open, onClose, receipt }: ReceiptPrintProps) {
  const companyInfo = useCompanyInfo();
  const english = isOverseasCustomer(receipt.customerType, receipt.customerCountry);
  const locale = english ? "en-US" : "zh-CN";
  const columns = english
    ? [
        { key: "index", label: "Item", align: "center" as const },
        { key: "productName", label: "Product name" },
        { key: "quantity", label: "Qty", align: "right" as const },
        { key: "unitPrice", label: "U.P.", align: "right" as const },
        { key: "amount", label: "Amount", align: "right" as const },
      ]
    : [
        { key: "index", label: "序号", align: "center" as const },
        { key: "productName", label: "产品名称" },
        { key: "quantity", label: "数量", align: "right" as const },
        { key: "unitPrice", label: "单价", align: "right" as const },
        { key: "amount", label: "金额", align: "right" as const },
      ];
  const data = receipt.items.map((item, index) => ({
    index: index + 1,
    productName: item.productName,
    quantity: formatPrintNumber(item.quantity, locale),
    unitPrice: formatMoney(item.unitPrice, receipt.currency, locale),
    amount: formatMoney(item.amount, receipt.currency, locale),
  }));
  const customTemplateHtml = renderStoredPrintTemplate("receipt", {
    companyLogo: rawTemplateValue(buildTemplateLogoHtml(companyInfo)),
    companyName: english
      ? companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd."
      : companyInfo?.companyNameCn || "苏州神韵医疗器械有限公司",
    receiptNumber: receipt.receiptNumber,
    receiptDate: receipt.receiptDate || "-",
    orderNumber: receipt.orderNumber || "-",
    customerName: receipt.customerName || "-",
    paymentMethod: getLocalizedPaymentTerm(receipt.paymentMethod, english),
    totalAmount: formatMoney(receipt.totalAmount, receipt.currency, locale),
    paidAmount: formatMoney(receipt.paidAmount, receipt.currency, locale),
    remainingAmount: formatMoney(receipt.remainingAmount, receipt.currency, locale),
    paymentAccount: receipt.paymentAccount || "-",
    cashier: receipt.cashier || "-",
    notes: receipt.notes || "",
    amountInWords: english ? "" : convertToChinese(receipt.paidAmount),
    itemRows: rawTemplateValue(
      receipt.items
        .map((item, index) =>
          buildTemplateRowHtml([
            String(index + 1),
            item.productName || "-",
            formatPrintNumber(item.quantity, locale),
            formatMoney(item.unitPrice, receipt.currency, locale),
            formatMoney(item.amount, receipt.currency, locale),
          ]),
        )
        .join(""),
    ),
  });

  if (customTemplateHtml) {
    return (
      <PrintTemplate open={open} onClose={onClose} title={english ? "Receipt Preview" : "收据打印预览"}>
        <div dangerouslySetInnerHTML={customTemplateHtml} />
      </PrintTemplate>
    );
  }

  return (
    <PrintTemplate open={open} onClose={onClose} title={english ? "Receipt Preview" : "收据打印预览"}>
      <div className="mx-auto max-w-[780px] space-y-6 text-slate-900">
        {renderHeader(companyInfo, english)}
        <div className="flex items-start justify-between gap-8">
          <div className="text-2xl font-semibold">{english ? "Receipt" : "收款收据"}</div>
          <div className="min-w-[220px] space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium text-slate-600">{english ? "Receipt No." : "收据编号"}</span>
              <span>{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium text-slate-600">{english ? "Date" : "收款日期"}</span>
              <span>{formatDateValue(receipt.receiptDate)}</span>
            </div>
          </div>
        </div>
        {renderLabeledGrid(
          english
            ? [
                { label: "Customer", value: receipt.customerName },
                { label: "Related Order", value: receipt.orderNumber },
                { label: "Payment Method", value: getLocalizedPaymentTerm(receipt.paymentMethod, true) },
                { label: "Cashier", value: receipt.cashier },
                { label: "Payment Account", value: receipt.paymentAccount },
              ]
            : [
                { label: "客户名称", value: receipt.customerName },
                { label: "关联订单", value: receipt.orderNumber },
                { label: "收款方式", value: getLocalizedPaymentTerm(receipt.paymentMethod, false) },
                { label: "收款人", value: receipt.cashier },
                { label: "收款账户", value: receipt.paymentAccount },
              ],
        )}
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            {english ? "Payment Details" : "收款明细"}
          </div>
          {renderTable(columns, data)}
        </div>
        <div className="ml-auto max-w-[360px] space-y-2 border-t border-slate-300 pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">{english ? "Order Amount" : "订单总额"}</span>
            <span>{formatMoney(receipt.totalAmount, receipt.currency, locale)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">{english ? "Paid Amount" : "本次收款"}</span>
            <span className="font-semibold">{formatMoney(receipt.paidAmount, receipt.currency, locale)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">{english ? "Remaining Amount" : "剩余应收"}</span>
            <span>{formatMoney(receipt.remainingAmount, receipt.currency, locale)}</span>
          </div>
          {!english ? (
            <div className="rounded bg-slate-50 p-3">
              <div className="mb-1 text-xs text-slate-500">金额大写</div>
              <div className="text-sm font-medium">{convertToChinese(receipt.paidAmount)}</div>
            </div>
          ) : null}
        </div>
        {renderSignatureFooter(english, companyInfo, receipt.notes)}
      </div>
    </PrintTemplate>
  );
}
