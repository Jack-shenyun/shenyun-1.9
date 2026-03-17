import { normalizePaymentCondition } from "@shared/paymentTerms";
import { renderStoredPrintTemplate, normalizeStoredPrintTemplate } from "@/lib/printTemplates";
import { spreadsheetToRenderableHtml } from "@/lib/printEngine";
import { formatCurrencyValue, formatDisplayNumber } from "@/lib/formatters";
import sealContractSpecial from "@/assets/seal-contract-special.svg";
import sealCompanyEn from "@/assets/seal-company-en.svg";

export type SalesDocumentMode = "order" | "quote";

export type SalesDocumentCompanyInfo = {
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

export type SalesDocumentPrintPayload = {
  orderNumber: string;
  orderDate: string;
  deliveryDate?: string;
  customerName: string;
  customerCode?: string;
  customerType?: string;
  customerCountry?: string;
  shippingAddress?: string;
  shippingContact?: string;
  shippingPhone?: string;
  paymentMethod?: string;
  status: string;
  totalAmount: number;
  currency?: string;
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

type BankAccountLike = {
  id?: number | string | null;
  accountName?: string | null;
  bankName?: string | null;
  accountNo?: string | null;
  swiftCode?: string | null;
  bankAddress?: string | null;
  remark?: string | null;
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

function escapeHtmlText(value?: string | null) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTemplateLogoHtml(companyInfo: SalesDocumentCompanyInfo | undefined) {
  if (companyInfo?.logoUrl) {
    return `<img src="${companyInfo.logoUrl}" alt="logo" style="height:40px;width:auto;object-fit:contain;" />`;
  }
  return `<div style="display:flex;height:40px;width:96px;align-items:center;justify-content:center;border:1px solid #cbd5e1;font-size:14px;font-weight:600;letter-spacing:1px;color:#475569;">SHENYUN</div>`;
}

function buildTemplateRowHtml(cells: Array<string>) {
  return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
}

function buildSignatureFooterHtml(english: boolean, companyInfo?: SalesDocumentCompanyInfo, notes?: string, stampUrl?: string) {
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
      <div style="min-width:240px;text-align:center;">
        ${stampBlock}
        <div style="font-size:13px;font-weight:600;color:#334155;">${companyName}</div>
        <div style="font-size:12px;color:#64748b;margin-top:6px;">${english ? "Authorized Signature" : "签字/盖章"}</div>
      </div>
    </div>
  </div>`;
}

export function buildRenderedPrintDocument(params: {
  bodyHtml: string;
  paperSize?: string;
  orientation?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}) {
  const {
    bodyHtml,
    paperSize = "A4",
    orientation = "portrait",
    marginTop = 20,
    marginRight = 20,
    marginBottom = 20,
    marginLeft = 20,
  } = params;

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
    @page {
      size: ${pageSize};
      margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function buildSalesDocumentTemplateRender(options: {
  document: SalesDocumentPrintPayload;
  companyInfo?: SalesDocumentCompanyInfo;
  bankAccounts?: BankAccountLike[];
  printTemplates?: any[];
  documentMode?: SalesDocumentMode;
  qrCodeDataUrl?: string;
  templateOverride?: any;
  defaultSpreadsheetData?: any;
}) {
  const {
    document,
    companyInfo,
    bankAccounts = [],
    printTemplates = [],
    documentMode = "order",
    qrCodeDataUrl = "",
    templateOverride,
    defaultSpreadsheetData,
  } = options;

  const english = isOverseasCustomer(document.customerType, document.customerCountry);
  const locale = english ? "en-US" : "zh-CN";
  const isQuote = documentMode === "quote";
  const documentTitle = english ? (isQuote ? "Quotation" : "Sales Order") : (isQuote ? "报价单" : "销售订单");
  const previewTitle = english ? documentTitle : `${documentTitle}打印预览`;
  const templateId = english
    ? (isQuote ? "sales_quote_en" : "sales_order_en")
    : (isQuote ? "sales_quote_zh" : "sales_order_zh");
  const stampUrl = english ? sealCompanyEn : sealContractSpecial;
  const matchedBankAccount = (bankAccounts as any[]).find((account) =>
    document.paymentAccountId ? Number(account.id) === Number(document.paymentAccountId) : account.accountName === document.paymentAccount,
  );
  const bankAddress = String(matchedBankAccount?.bankAddress || "").trim()
    || String(matchedBankAccount?.remark || "").match(/地址:([^]+?)(?:\s行号:|$)/)?.[1]?.trim()
    || "-";
  const savedSalesTemplate = (printTemplates as any[]).find((item) => item.templateId === templateId);
  const editorDefaultTemplate = defaultSpreadsheetData
    ? {
        name: isQuote
          ? (english ? "Quotation (Editor Default)" : "报价单（编辑器默认）")
          : (english ? "Sales Order (Editor Default)" : "销售订单（编辑器默认）"),
        description: "系统内置编辑器默认模板",
        editorType: "spreadsheet",
        editorConfig: JSON.stringify(defaultSpreadsheetData),
        css: "",
        html: spreadsheetToRenderableHtml(defaultSpreadsheetData),
      }
    : null;
  const resolvedTemplate = templateOverride || savedSalesTemplate || editorDefaultTemplate;
  const templateMeta = normalizeStoredPrintTemplate(resolvedTemplate);
  const companyName = english
    ? companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd."
    : companyInfo?.companyNameCn || "苏州神韵医疗器械有限公司";
  const companyAddress = english
    ? companyInfo?.addressEn || companyInfo?.addressCn || "-"
    : companyInfo?.addressCn || companyInfo?.addressEn || "-";
  const companyPhone = english ? "+86-0512-65209633" : "0512-65209633";
  const qrCodeLabel = english ? (isQuote ? "Quote QR Code" : "Order QR Code") : (isQuote ? "报价二维码" : "订单二维码");
  const qrCodeHtml = qrCodeDataUrl
    ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;">
        <img src="${qrCodeDataUrl}" alt="qr" style="width:72px;height:72px;object-fit:contain;display:block;" />
        <div style="font-size:11px;color:#64748b;line-height:1.2;">${qrCodeLabel}</div>
      </div>`
    : `<div style="width:84px;height:84px;border:1px solid #94a3b8;display:flex;align-items:center;justify-content:center;font-size:11px;color:#475569;">${english ? "QR Code" : "二维码"}</div>`;
  const now = new Date();
  const printDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const printTime = `${printDate} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const totalQuantity = document.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const usdAmountInWords = String(document.currency || "").toUpperCase() === "USD"
    ? convertUsdToWords(document.totalAmount)
    : "";
  const templateItems = document.items.map((item, index) => ({
    index: String(index + 1),
    productCode: item.productCode || "-",
    productName: item.productName || "-",
    specification: item.specification || "-",
    quantity: formatDisplayNumber(item.quantity, { minimumFractionDigits: 0, maximumFractionDigits: 2, locale }),
    unitPrice: formatMoney(item.unitPrice, document.currency, locale),
    amount: formatMoney(item.amount, document.currency, locale),
  }));
  const templateVariables = {
    company: {
      name: companyName,
      address: companyAddress,
      phone: companyPhone,
      email: companyInfo?.email || "-",
      website: companyInfo?.website || "-",
      logoUrl: companyInfo?.logoUrl || "",
    },
    companyLogo: buildTemplateLogoHtml(companyInfo),
    companyLogoHtml: buildTemplateLogoHtml(companyInfo),
    companyName,
    companyAddress,
    companyEmail: companyInfo?.email || "-",
    companyWebsite: companyInfo?.website || "-",
    companyPhone,
    templateCode: "SY-QT/TD01-02  V1.2",
    qrCode: qrCodeHtml,
    qrCodeHtml,
    orderNumber: document.orderNumber,
    orderDate: document.orderDate || "-",
    deliveryDate: document.deliveryDate || "-",
    customerName: document.customerName,
    customerCode: document.customerCode || "-",
    customerCountry: localizeCountry(document.customerCountry, english),
    shippingAddress: document.shippingAddress || "-",
    shippingContact: document.shippingContact || "-",
    shippingPhone: document.shippingPhone || "-",
    salesRep: document.salesPersonName || "-",
    paymentMethod: getLocalizedPaymentTerm(document.paymentMethod, english),
    paymentTerms: getLocalizedPaymentTerm(document.paymentMethod, english),
    tradeTerm: document.tradeTerm || "-",
    currency: document.currency || "CNY",
    shippingFee: formatMoney(document.shippingFee || 0, document.currency, locale),
    totalAmount: formatMoney(document.totalAmount, document.currency, locale),
    totalQuantity: formatDisplayNumber(totalQuantity, { minimumFractionDigits: 0, maximumFractionDigits: 2, locale }),
    amountInWords: usdAmountInWords,
    amountInWordsZh: convertNumberToChineseUpper(document.totalAmount),
    totalAmountPlain: formatDisplayNumber(document.totalAmount, { minimumFractionDigits: 0, maximumFractionDigits: 2, locale }),
    taxRate: "13%",
    paymentAccount: document.paymentAccount || matchedBankAccount?.bankName || "-",
    bankName: matchedBankAccount?.bankName || "-",
    accountNo: matchedBankAccount?.accountNo || "-",
    swiftCode: matchedBankAccount?.swiftCode || "-",
    bankAddress,
    notes: formatPrintNotes(document.notes, english),
    items: templateItems,
    itemRows: templateItems
      .map((item) =>
        buildTemplateRowHtml([
          item.index,
          item.productCode,
          item.productName,
          item.specification,
          item.quantity,
          item.unitPrice,
          item.amount,
        ]),
      )
      .join(""),
    signatureFooterHtml: buildSignatureFooterHtml(english, companyInfo, document.notes, stampUrl),
    printDate,
    printTime,
  };
  const renderedTemplate = resolvedTemplate ? renderStoredPrintTemplate(resolvedTemplate, templateVariables) : null;
  const usingSpreadsheetEditorTemplate = Boolean(
    resolvedTemplate
    && (
      String(resolvedTemplate.editorType || "").toLowerCase() === "spreadsheet"
      || String(resolvedTemplate.editorConfig || "").includes("\"cells\"")
    )
  );

  return {
    english,
    documentTitle,
    previewTitle,
    templateId,
    templateMeta,
    renderedTemplate,
    usingSpreadsheetEditorTemplate,
  };
}
