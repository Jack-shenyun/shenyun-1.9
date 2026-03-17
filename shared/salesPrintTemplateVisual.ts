import type { StoredPrintTemplate } from "./printTemplateRenderer";

export type SalesOrderVisualTemplateId = "sales_order_zh" | "sales_order_en";
export type SalesOrderVisualLanguage = "zh" | "en";

export type SalesOrderVisualTemplateConfig = {
  version: 1;
  language: SalesOrderVisualLanguage;
  title: string;
  templateCode: string;
  style: {
    pagePaddingTop: number;
    pagePaddingX: number;
    pagePaddingBottom: number;
    titleFontSize: number;
    companyNameFontSize: number;
    barcodeHeight: number;
  };
  labels: {
    orderNumber: string;
    date: string;
    customerCode: string;
    customerName: string;
    customerAddress: string;
    deliveryDate: string;
    contact: string;
    paymentTerms: string;
    phone: string;
    tradeTerm: string;
    tableTitle: string;
    amountWords: string;
    totalAmount: string;
    shippingFee: string;
    bankTitle: string;
    signatureHint: string;
  };
  termsHeaders: [string, string, string, string];
  bankLabels: [string, string, string, string];
  tableHeaders: [string, string, string, string, string, string, string];
};

export function isSalesOrderVisualTemplate(templateId: string) {
  return templateId === "sales_order_zh" || templateId === "sales_order_en";
}

export function getSalesOrderVisualLanguage(templateId: SalesOrderVisualTemplateId): SalesOrderVisualLanguage {
  return templateId === "sales_order_en" ? "en" : "zh";
}

export function getDefaultSalesOrderVisualConfig(language: SalesOrderVisualLanguage): SalesOrderVisualTemplateConfig {
  if (language === "en") {
    return {
      version: 1,
      language,
      title: "Customer Order",
      templateCode: "SY-QT/TD01-02  V1.2",
      style: {
        pagePaddingTop: 8,
        pagePaddingX: 32,
        pagePaddingBottom: 30,
        titleFontSize: 34,
        companyNameFontSize: 20,
        barcodeHeight: 56,
      },
      labels: {
        orderNumber: "Order No.:",
        date: "Order Date:",
        customerCode: "Customer Code:",
        customerName: "Company:",
        customerAddress: "Address:",
        deliveryDate: "Delivery Date",
        contact: "Contact:",
        paymentTerms: "Payment Terms",
        phone: "Telephone:",
        tradeTerm: "Trade Term",
        tableTitle: "Detailed Order Sheet",
        amountWords: "Amount in Words",
        totalAmount: "Total Amount:",
        shippingFee: "Shipping Fee:",
        bankTitle: "Beneficiary Bank",
        signatureHint: "Authorized Signature",
      },
      termsHeaders: ["Trade Term", "Currency", "Delivery Date", "Payment Terms"],
      bankLabels: ["Bank Name:", "Code:", "Account Number:", "Address:"],
      tableHeaders: ["Item", "Ref", "Product name", "Specification", "Qty", "Unit Price", "Amount"],
    };
  }

  return {
    version: 1,
    language,
    title: "销售订单",
    templateCode: "SY-QT/TD01-02  V1.2",
    style: {
        pagePaddingTop: 8,
      pagePaddingX: 32,
      pagePaddingBottom: 30,
      titleFontSize: 36,
      companyNameFontSize: 22,
      barcodeHeight: 56,
    },
    labels: {
      orderNumber: "订单编号：",
      date: "日期：",
      customerCode: "客户编码：",
      customerName: "客户名称：",
      customerAddress: "客户地址：",
      deliveryDate: "交货日期：",
      contact: "联系人：",
      paymentTerms: "付款条件：",
      phone: "电话：",
      tradeTerm: "贸易条款：",
      tableTitle: "订单内容",
      amountWords: "人民币大写：",
      totalAmount: "总计",
      shippingFee: "运费",
      bankTitle: "银行信息",
      signatureHint: "签字/盖章",
    },
    termsHeaders: ["贸易条款", "币种", "交货日期", "付款条件"],
    bankLabels: ["账户名称：", "收款账户：", "开户行：", "行号："],
    tableHeaders: ["序号", "产品编码", "产品名称", "型号规格", "数量", "单价", "小计"],
  };
}

function getFontFamily(language: SalesOrderVisualLanguage) {
  return language === "en"
    ? '"Times New Roman", Georgia, serif'
    : '"SimSun", "Songti SC", serif';
}

function escapeAttribute(value: string) {
  return String(value).replace(/"/g, "&quot;");
}

export function buildSalesOrderVisualTemplate(config: SalesOrderVisualTemplateConfig): StoredPrintTemplate {
  const english = config.language === "en";
  const css = `body { font-family: ${getFontFamily(config.language)}; font-size: 12px; color: #222; padding: ${config.style.pagePaddingTop}px ${config.style.pagePaddingX}px ${config.style.pagePaddingBottom}px; }
.page { width:100%; }
.topline { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
.brand img { height:22px; width:auto; }
.doc-code { font-size:11px; color:#555; }
.company { border-top:1.4px solid #666; padding-top:6px; text-align:right; }
.company-name { font-size:${config.style.companyNameFontSize}px; font-weight:700; ${english ? "" : "letter-spacing:0.4px;"} }
.company-meta { font-size:11px; line-height:1.6; color:#555; }
.section-title { font-size:${config.style.titleFontSize}px; font-weight:700; margin:26px 0 12px; ${english ? "" : "letter-spacing:1px;"} }
.hero { display:flex; justify-content:space-between; align-items:flex-start; gap:22px; }
.hero-code { width:230px; min-width:230px; display:flex; align-items:flex-start; }
.qr-box { width:92px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:4px; }
.qr-box img { width:92px; height:92px; object-fit:contain; }
.qr-label { font-size:10px; color:#666; line-height:1.2; text-align:center; }
.order-summary { min-width:240px; font-size:12px; line-height:1.9; }
.label { color:#555; }
.kv-grid { display:grid; grid-template-columns:96px 1fr 96px 1fr; column-gap:8px; row-gap:7px; margin-top:10px; }
.info-list { margin-top:10px; display:grid; grid-template-columns:88px 1fr; gap:6px 10px; max-width:540px; }
.block-title { font-size:15px; font-weight:700; margin:18px 0 8px; }
table { width:100%; border-collapse:collapse; }
thead th { font-size:11px; font-weight:700; text-align:center; border-bottom:1.4px solid #888; padding:7px 4px; }
tbody td { font-size:11px; padding:7px 4px; text-align:center; border-bottom:1px solid #d0d0d0; vertical-align:top; }
.amount-words { ${english ? "text-align:right;" : ""} margin-top:8px; font-size:12px; ${english ? "" : "font-weight:700;"} }
.totals { text-align:right; font-size:13px; font-weight:700; margin-top:4px; }
.shipping-fee { text-align:right; font-size:12px; margin-top:4px; color:#444; }
.terms { margin-top:14px; border-top:1.4px solid #888; border-bottom:1.4px solid #888; }
.terms table td { padding:8px 6px; font-size:11px; text-align:center; border-bottom:none; }
.bank { margin-top:${english ? 16 : 12}px; }
.bank .rows { ${english ? "" : "border-top:1.4px solid #888; padding-top:8px;"} }
.bank-row { ${english ? "" : "display:grid; grid-template-columns:80px 1fr; gap:8px;"} font-size:11px; line-height:1.9; }
.signature { margin-top:30px; display:flex; justify-content:flex-end; }
.signature-box { width:${english ? 290 : 250}px; text-align:center; }
.signature-line { border-top:1.4px solid #888; padding-top:8px; font-size:13px; font-weight:700; }
.signature-date { margin-top:8px; font-size:11px; text-align:right; }`;

  const termsCells = config.termsHeaders
    .map((header, index) => {
      const placeholders = ["{{tradeTerm}}", "{{currency}}", "{{deliveryDate}}", "{{paymentTerms}}"];
      return `<td><strong>${header}</strong><br />${placeholders[index]}</td>`;
    })
    .join("");

  const bankRows = english
    ? `
      <div class="bank-row">${config.bankLabels[0]} {{bankName}}</div>
      <div class="bank-row">${config.bankLabels[1]} {{swiftCode}}</div>
      <div class="bank-row">Company Name: {{companyName}}</div>
      <div class="bank-row">${config.bankLabels[2]} {{accountNo}}</div>
      <div class="bank-row">${config.bankLabels[3]} {{bankAddress}}</div>
    `
    : `
      <div class="rows">
        <div class="bank-row"><div class="label">${config.bankLabels[0]}</div><div>{{paymentAccount}}</div></div>
        <div class="bank-row"><div class="label">${config.bankLabels[1]}</div><div>{{accountNo}}</div></div>
        <div class="bank-row"><div class="label">${config.bankLabels[2]}</div><div>{{bankName}}</div></div>
        <div class="bank-row"><div class="label">${config.bankLabels[3]}</div><div>{{swiftCode}}</div></div>
      </div>
    `;

  const html = english
    ? `<div class="page" data-visual-template="${escapeAttribute(JSON.stringify({ version: 1, language: config.language }))}">
  <div class="topline">
    <div class="brand">{{companyLogo}}</div>
    <div class="doc-code">{{templateCode}}</div>
  </div>
  <div class="company">
    <div class="company-name">{{companyName}}</div>
    <div class="company-meta">Add: {{companyAddress}}</div>
    <div class="company-meta">Tel: {{companyPhone}} Mail: {{companyEmail}} Web: {{companyWebsite}}</div>
  </div>
  <div class="section-title">${config.title}</div>
  <div class="hero">
    <div class="hero-code">{{qrCode}}</div>
    <div class="order-summary">
      <div><span class="label">${config.labels.orderNumber}</span> {{orderNumber}}</div>
      <div><span class="label">${config.labels.date}</span> {{orderDate}}</div>
      <div><span class="label">${config.labels.customerCode}</span> {{customerCode}}</div>
    </div>
  </div>
  <div class="info-list">
    <div class="label">${config.labels.customerName}</div><div>{{customerName}}</div>
    <div class="label">${config.labels.customerAddress}</div><div>{{shippingAddress}}</div>
    <div class="label">${config.labels.contact}</div><div>{{shippingContact}}</div>
    <div class="label">${config.labels.phone}</div><div>{{shippingPhone}}</div>
  </div>
  <div class="block-title">${config.labels.tableTitle}</div>
  <table>
    <thead><tr>${config.tableHeaders.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
    <tbody>{{itemRows}}</tbody>
  </table>
  <div class="totals">${config.labels.totalAmount} {{totalAmountPlain}}</div>
  <div class="shipping-fee">${config.labels.shippingFee} {{shippingFee}}</div>
  <div class="amount-words">{{amountInWords}}</div>
  <div class="terms"><table><tbody><tr>${termsCells}</tr></tbody></table></div>
  <div class="block-title">${config.labels.bankTitle}</div>
  <div class="bank">${bankRows}</div>
  <div class="signature"><div class="signature-box"><div class="signature-line">{{companyName}}</div><div class="signature-date">${config.labels.signatureHint} {{orderDate}}</div></div></div>
</div>`
    : `<div class="page" data-visual-template="${escapeAttribute(JSON.stringify({ version: 1, language: config.language }))}">
  <div class="topline">
    <div class="brand">{{companyLogo}}</div>
    <div class="doc-code">{{templateCode}}</div>
  </div>
  <div class="company">
    <div class="company-name">{{companyName}}</div>
    <div class="company-meta">地址：{{companyAddress}}</div>
    <div class="company-meta">电话：{{companyPhone}} 邮箱：{{companyEmail}} 网址：{{companyWebsite}}</div>
  </div>
  <div class="section-title">${config.title}</div>
  <div class="hero">
    <div class="hero-code">{{qrCode}}</div>
    <div class="order-summary">
      <div><span class="label">${config.labels.orderNumber}</span>{{orderNumber}}</div>
      <div><span class="label">${config.labels.date}</span>{{orderDate}}</div>
      <div><span class="label">${config.labels.customerCode}</span>{{customerCode}}</div>
    </div>
  </div>
  <div class="kv-grid">
    <div class="label">${config.labels.customerName}</div><div>{{customerName}}</div>
    <div class="label">${config.labels.customerCode}</div><div>{{customerCode}}</div>
    <div class="label">${config.labels.customerAddress}</div><div>{{shippingAddress}}</div>
    <div class="label">${config.labels.deliveryDate}</div><div>{{deliveryDate}}</div>
    <div class="label">${config.labels.contact}</div><div>{{shippingContact}}</div>
    <div class="label">${config.labels.paymentTerms}</div><div>{{paymentTerms}}</div>
    <div class="label">${config.labels.phone}</div><div>{{shippingPhone}}</div>
    <div class="label">${config.labels.tradeTerm}</div><div>{{tradeTerm}}</div>
  </div>
  <div class="block-title">${config.labels.tableTitle}</div>
  <table>
    <thead><tr>${config.tableHeaders.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
    <tbody>{{itemRows}}</tbody>
  </table>
  <div class="amount-words">${config.labels.amountWords} {{amountInWordsZh}}</div>
  <div class="totals">${config.labels.totalAmount} {{totalAmountPlain}}</div>
  <div class="shipping-fee">${config.labels.shippingFee} {{shippingFee}}</div>
  <div class="terms"><table><tbody><tr>${termsCells}</tr></tbody></table></div>
  <div class="block-title">${config.labels.bankTitle}</div>
  <div class="bank">${bankRows}</div>
  <div class="signature"><div class="signature-box"><div class="signature-line">{{companyName}}</div><div class="signature-date">${config.labels.signatureHint} {{orderDate}}</div></div></div>
</div>`;

  return {
    name: english ? "Sales Order (English)" : "销售订单（中文）",
    description: english ? "English customer order visual template" : "中文销售订单可视化模板",
    css,
    html,
  };
}
