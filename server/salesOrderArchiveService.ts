import { randomBytes } from "node:crypto";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { documents } from "../drizzle/schema";
import {
  formatCurrencyValue,
  formatDate,
  formatDisplayNumber,
} from "./_core/formatting";
import { saveAttachmentFile } from "./attachmentStorage";
import {
  getBankAccountById,
  getBankAccounts,
  getCompanyInfo,
  getDb,
  getPrintTemplates,
  getSalesOrderById,
  getSalesOrderItems,
} from "./db";
import {
  DEFAULT_SALES_ORDER_EN_TEMPLATE,
  DEFAULT_SALES_ORDER_ZH_TEMPLATE,
} from "@shared/printTemplateDefaults";
import { rawTemplateValue, renderPrintTemplate, type StoredPrintTemplate } from "@shared/printTemplateRenderer";
import { normalizePaymentCondition } from "@shared/paymentTerms";

const CHROME_EXECUTABLE_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DOMESTIC_COUNTRY_SET = new Set(["中国", "中国大陆", "China", "CN", "PRC"]);

function safeFileSegment(value: string): string {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function toCustomerShortName(name: string): string {
  const raw = String(name ?? "").trim();
  if (!raw) return "客户";
  const stripped = raw
    .replace(/(有限责任公司|股份有限公司|有限公司|集团|Inc\.?|Incorporated|Co\.,?\s*Ltd\.?|Ltd\.?)/gi, "")
    .trim();
  const base = stripped || raw;
  return base.slice(0, 24);
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

function formatMoney(amount: unknown, currency?: string | null, locale: "zh-CN" | "en-US" = "zh-CN") {
  const symbol = getCurrencySymbol(currency);
  return formatCurrencyValue(amount, symbol, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    locale,
  });
}

function normalizePaymentMethod(paymentMethod?: string | null) {
  const normalized = String(paymentMethod || "").trim();
  return normalized || "-";
}

function isOverseasCustomer(customerType?: string | null, customerCountry?: string | null) {
  if (customerType === "overseas") return true;
  if (!customerCountry) return false;
  return !DOMESTIC_COUNTRY_SET.has(String(customerCountry).trim());
}

function getLocalizedPaymentTerm(paymentMethod?: string | null, english = false) {
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
  if (!normalized) return normalizePaymentMethod(paymentMethod);
  return english ? enMap[normalized] || normalized : zhMap[normalized] || normalized;
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
    for (let i = 0; i < group.length; i += 1) {
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

function normalizeLogoUrl(logoUrl?: string | null) {
  if (!logoUrl) return "";
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `http://localhost:3000${logoUrl}`;
}

function buildTemplateLogoHtml(logoUrl?: string | null) {
  const resolvedLogoUrl = normalizeLogoUrl(logoUrl);
  if (resolvedLogoUrl) {
    return `<img src="${resolvedLogoUrl}" alt="logo" style="height:40px;width:auto;object-fit:contain;" />`;
  }
  return `<div style="display:flex;height:40px;width:96px;align-items:center;justify-content:center;border:1px solid #cbd5e1;font-size:14px;font-weight:600;letter-spacing:1px;color:#475569;">SHENYUN</div>`;
}

async function buildOrderQrCodeHtml(orderNumber?: string | null) {
  const value = String(orderNumber || "").trim();
  if (!value) return `<div class="qr-box"></div>`;
  try {
    const dataUrl = await QRCode.toDataURL(value, {
      width: 184,
      margin: 0,
      errorCorrectionLevel: "M",
    });
    return `<div class="qr-box"><img src="${dataUrl}" alt="qr" /></div>`;
  } catch {
    return `<div class="qr-box"></div>`;
  }
}

function buildTemplateRowHtml(cells: Array<string>) {
  return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
}

function buildFullHtml(content: string) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { size: A4; margin: 14mm; }
      html, body { background: #fff; }
      body { margin: 0; }
    </style>
  </head>
  <body>${content}</body>
</html>`;
}

async function resolveSalesOrderTemplate(english: boolean): Promise<StoredPrintTemplate> {
  const templates = await getPrintTemplates();
  const templateId = english ? "sales_order_en" : "sales_order_zh";
  const matched = templates.find((item) => item.templateId === templateId);
  if (!matched) {
    return english ? DEFAULT_SALES_ORDER_EN_TEMPLATE : DEFAULT_SALES_ORDER_ZH_TEMPLATE;
  }
  return {
    name: matched.name,
    description: matched.description || "",
    css: matched.css,
    html: matched.html,
  };
}

export async function archiveApprovedSalesOrderPdf(params: { orderId: number; operatorId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const order = await getSalesOrderById(params.orderId);
  if (!order) throw new Error("销售订单不存在");
  const [items, companyInfo, activeBankAccounts, template] = await Promise.all([
    getSalesOrderItems(params.orderId),
    getCompanyInfo((order as any)?.companyId),
    getBankAccounts({ status: "active" }),
    getPrintTemplates(),
  ]);

  const english = isOverseasCustomer(order.customerType, order.country);
  const locale = english ? ("en-US" as const) : ("zh-CN" as const);
  const templateId = english ? "sales_order_en" : "sales_order_zh";
  const matchedTemplate = (template as Awaited<ReturnType<typeof getPrintTemplates>>).find((item) => item.templateId === templateId);
  const resolvedTemplate: StoredPrintTemplate = matchedTemplate
    ? {
        name: matchedTemplate.name,
        description: matchedTemplate.description || "",
        css: matchedTemplate.css,
        html: matchedTemplate.html,
      }
    : await resolveSalesOrderTemplate(english);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const matchedBankAccount = order.receiptAccountId
    ? await getBankAccountById(Number(order.receiptAccountId))
    : activeBankAccounts.find((account) => account.accountName === order.receiptAccountName) || activeBankAccounts.find((account) => account.isDefault);
  const usdAmountInWords = String(order.currency || "").toUpperCase() === "USD"
    ? convertUsdToWords(Number(order.totalAmount || 0))
    : "";
  const qrCodeHtml = await buildOrderQrCodeHtml(order.orderNo);
  const bankAddress = String(matchedBankAccount?.bankAddress || "").trim()
    || String(matchedBankAccount?.remark || "").match(/地址:([^]+?)(?:\s行号:|$)/)?.[1]?.trim()
    || matchedBankAccount?.remark
    || "-";

  const rendered = renderPrintTemplate(resolvedTemplate, {
    companyLogo: rawTemplateValue(buildTemplateLogoHtml(companyInfo.logoUrl)),
    companyName: english
      ? companyInfo.companyNameEn || companyInfo.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd"
      : companyInfo.companyNameCn || companyInfo.companyNameEn || "苏州神韵医疗器械有限公司",
    companyAddress: english
      ? companyInfo.addressEn || companyInfo.addressCn || "-"
      : companyInfo.addressCn || companyInfo.addressEn || "-",
    companyEmail: companyInfo.email || "-",
    companyWebsite: companyInfo.website || "-",
    companyPhone: english ? "+86-15150457575" : companyInfo.phone || "15150457575",
    templateCode: "SY-QT/TD01-02  V1.2",
    qrCode: rawTemplateValue(qrCodeHtml),
    orderNumber: order.orderNo || "-",
    orderDate: formatDate(order.orderDate),
    deliveryDate: formatDate(order.deliveryDate),
    customerName: order.customerName || "-",
    customerCode: order.customerCode || "-",
    customerCountry: order.country || "-",
    shippingAddress: order.shippingAddress || "-",
    shippingContact: order.shippingContact || order.contactPerson || "-",
    shippingPhone: order.shippingPhone || order.phone || "-",
    salesRep: order.salesPersonName || "-",
    paymentMethod: getLocalizedPaymentTerm(order.paymentMethod, english),
    paymentTerms: getLocalizedPaymentTerm(order.paymentMethod, english),
    tradeTerm: order.tradeTerm || "-",
    shippingFee: formatMoney(order.shippingFee || 0, order.currency, locale),
    totalAmount: formatMoney(order.totalAmount || 0, order.currency, locale),
    totalQuantity: formatDisplayNumber(totalQuantity, { maximumFractionDigits: 2, locale }),
    amountInWords: usdAmountInWords,
    amountInWordsZh: convertNumberToChineseUpper(Number(order.totalAmount || 0)),
    totalAmountPlain: formatDisplayNumber(order.totalAmount, { minimumFractionDigits: 0, maximumFractionDigits: 2, locale }),
    taxRate: "13%",
    paymentAccount: order.receiptAccountName || matchedBankAccount?.accountName || "-",
    bankName: matchedBankAccount?.bankName || "-",
    accountNo: matchedBankAccount?.accountNo || "-",
    swiftCode: matchedBankAccount?.swiftCode || "-",
    bankAddress,
    notes: order.remark || "",
    itemRows: rawTemplateValue(
      items.map((item, index) =>
        buildTemplateRowHtml([
          String(index + 1),
          item.productCode || "-",
          item.productName || "-",
          item.specification || "-",
          formatDisplayNumber(item.quantity, { maximumFractionDigits: 2, locale }),
          formatMoney(item.unitPrice || 0, order.currency, locale),
          formatMoney(item.amount || 0, order.currency, locale),
        ]),
      ).join(""),
    ),
  });

  if (!rendered) throw new Error("销售订单模板不可用");

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_EXECUTABLE_PATH,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(buildFullHtml(rendered.__html), { waitUntil: "networkidle0" });
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "12mm",
        left: "10mm",
      },
    });

    const orderNo = safeFileSegment(order.orderNo || `SO-${order.id}`);
    const customerFolder = safeFileSegment(toCustomerShortName(order.customerName || "客户"));
    const saved = await saveAttachmentFile({
      department: "销售部",
      businessFolder: `订单管理/${customerFolder}`,
      originalName: `${orderNo}.pdf`,
      desiredBaseName: orderNo,
      mimeType: "application/pdf",
      buffer: Buffer.from(pdfBytes),
      saveToFileManager: true,
    });
    const fileManagerVirtualPath = saved.fileManagerPath || "";

    const docNo = `SO-PDF-${Date.now()}-${randomBytes(2).toString("hex")}`.slice(0, 50);
    await db.insert(documents).values({
      docNo,
      title: order.orderNo || orderNo,
      category: "record",
      version: "V1.0",
      department: "销售部",
      status: "approved",
      filePath: saved.fileManagerPath || saved.filePath,
      description: `销售订单归档PDF：${order.orderNo || orderNo}（sales_order_archive:${order.id}; storage:${saved.provider}:${saved.storageKey}; file_manager:${fileManagerVirtualPath}）`,
      effectiveDate: new Date(),
      createdBy: params.operatorId || null,
      approvedBy: params.operatorId || null,
    });

    return {
      docNo,
      filePath: saved.filePath,
      fileManagerPath: fileManagerVirtualPath,
      fileName: saved.fileName,
      storageKey: saved.storageKey,
    };
  } finally {
    await browser.close();
  }
}
