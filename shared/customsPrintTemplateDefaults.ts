import type { StoredPrintTemplate } from "./printTemplateRenderer";

const sharedHeaderCss = `
body { font-family: "Times New Roman", Georgia, serif; font-size: 12px; color: #222; padding: 8px 32px 30px; }
.page { width: 100%; }
.topline { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 6px; }
.brand img { height: 22px; width:auto; }
.doc-code { font-size: 11px; color:#555; }
.company { border-top: 1.4px solid #666; padding-top: 6px; text-align: right; }
.company-name { font-size: 20px; font-weight: 700; }
.company-meta { font-size: 11px; line-height: 1.55; color:#555; }
.section-title { font-size: 28px; font-weight:700; margin: 24px 0 12px; }
.block-title { font-size: 15px; font-weight:700; margin: 16px 0 8px; }
.kv-grid { display:grid; grid-template-columns: 110px 1fr 110px 1fr; column-gap: 10px; row-gap: 8px; margin-top: 10px; }
.info-list { margin-top: 10px; display:grid; grid-template-columns: 120px 1fr; gap: 6px 10px; }
.label { color:#555; }
.value { color:#222; }
table { width:100%; border-collapse:collapse; }
thead th { font-size: 11px; font-weight:700; text-align:center; border-bottom: 1.4px solid #888; padding: 7px 4px; }
tbody td { font-size: 11px; padding: 7px 4px; text-align:center; border-bottom: 1px solid #d0d0d0; vertical-align: top; }
.totals { margin-top: 10px; display:grid; grid-template-columns: 140px 1fr; gap: 6px 12px; max-width: 420px; margin-left: auto; font-size: 12px; }
.bank-block { margin-top: 14px; border-top: 1.4px solid #888; padding-top: 8px; font-size: 11px; line-height: 1.8; white-space: pre-wrap; }
.footer-sign { margin-top: 32px; display:flex; justify-content:flex-end; }
.footer-sign-box { width: 280px; text-align:center; }
.footer-sign-line { border-top: 1.4px solid #888; padding-top: 8px; font-size: 13px; font-weight:700; }
.footer-sign-date { margin-top: 8px; font-size: 11px; text-align:right; }
`;

export const DEFAULT_CUSTOMS_COMMERCIAL_INVOICE_TEMPLATE: StoredPrintTemplate = {
  name: "Commercial Invoice",
  description: "报关管理-商业发票英文打印模板",
  css: `${sharedHeaderCss}
.totals .label { text-align:right; }
`,
  html: `<div class="page">
  <div class="topline">
    <div class="brand">{{companyLogo}}</div>
    <div class="doc-code">{{templateCode}}</div>
  </div>
  <div class="company">
    <div class="company-name">{{companyName}}</div>
    <div class="company-meta">Add: {{companyAddress}}</div>
    <div class="company-meta">Tel: {{companyPhone}}　Mail: {{companyEmail}}　Web: {{companyWebsite}}</div>
  </div>
  <div class="section-title">Commercial Invoice</div>
  <div class="kv-grid">
    <div class="label">Invoice No.</div><div class="value">{{invoiceNo}}</div>
    <div class="label">Invoice Date</div><div class="value">{{invoiceDate}}</div>
    <div class="label">Contract No.</div><div class="value">{{contractNo}}</div>
    <div class="label">Currency</div><div class="value">{{currency}}</div>
    <div class="label">Buyer</div><div class="value">{{buyerName}}</div>
    <div class="label">Trade Term</div><div class="value">{{tradeTerm}}</div>
    <div class="label">Buyer Address</div><div class="value">{{buyerAddress}}</div>
    <div class="label">Payment Term</div><div class="value">{{paymentTerm}}</div>
  </div>
  <div class="block-title">Item Details</div>
  <table>
    <thead><tr><th>Item</th><th>Product Name</th><th>Model</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Amount</th></tr></thead>
    <tbody>{{itemRows}}</tbody>
  </table>
  <div class="totals">
    <div class="label">Subtotal</div><div class="value">{{subtotal}}</div>
    <div class="label">Freight</div><div class="value">{{freight}}</div>
    <div class="label">Insurance</div><div class="value">{{insurance}}</div>
    <div class="label">Total Amount</div><div class="value">{{totalAmount}}</div>
  </div>
  <div class="block-title">Bank Information</div>
  <div class="bank-block">{{bankInfo}}</div>
  <div class="footer-sign">
    <div class="footer-sign-box">
      <div class="footer-sign-line">{{companyName}}</div>
      <div class="footer-sign-date">{{invoiceDate}}</div>
    </div>
  </div>
</div>`,
};

export const DEFAULT_CUSTOMS_PACKING_LIST_TEMPLATE: StoredPrintTemplate = {
  name: "Packing List",
  description: "报关管理-装箱单英文打印模板",
  css: sharedHeaderCss,
  html: `<div class="page">
  <div class="topline">
    <div class="brand">{{companyLogo}}</div>
    <div class="doc-code">{{templateCode}}</div>
  </div>
  <div class="company">
    <div class="company-name">{{companyName}}</div>
    <div class="company-meta">Add: {{companyAddress}}</div>
    <div class="company-meta">Tel: {{companyPhone}}　Mail: {{companyEmail}}　Web: {{companyWebsite}}</div>
  </div>
  <div class="section-title">Packing List</div>
  <div class="kv-grid">
    <div class="label">Packing List No.</div><div class="value">{{packingListNo}}</div>
    <div class="label">Packing Date</div><div class="value">{{packingDate}}</div>
    <div class="label">Contract No.</div><div class="value">{{contractNo}}</div>
    <div class="label">Package Type</div><div class="value">{{packageType}}</div>
    <div class="label">Consignee</div><div class="value">{{consignee}}</div>
    <div class="label">Notify Party</div><div class="value">{{notifyParty}}</div>
    <div class="label">Total Packages</div><div class="value">{{totalPackages}}</div>
    <div class="label">Total Volume</div><div class="value">{{totalVolume}}</div>
    <div class="label">Gross Weight</div><div class="value">{{grossWeight}}</div>
    <div class="label">Net Weight</div><div class="value">{{netWeight}}</div>
  </div>
  <div class="block-title">Packing Details</div>
  <table>
    <thead><tr><th>Item</th><th>Product Name</th><th>Model</th><th>Carton No.</th><th>Qty/Carton</th><th>Total Qty</th><th>Unit</th><th>Packing Note</th></tr></thead>
    <tbody>{{itemRows}}</tbody>
  </table>
  <div class="footer-sign">
    <div class="footer-sign-box">
      <div class="footer-sign-line">{{companyName}}</div>
      <div class="footer-sign-date">{{packingDate}}</div>
    </div>
  </div>
</div>`,
};

export const DEFAULT_CUSTOMS_DECLARATION_ELEMENTS_TEMPLATE: StoredPrintTemplate = {
  name: "申报要素",
  description: "报关管理-申报要素打印模板",
  css: `${sharedHeaderCss}
body { font-family: "SimSun", "Songti SC", serif; font-size: 12px; color: #222; padding: 8px 32px 30px; }
.company-name { font-size: 22px; font-weight: 700; }
`,
  html: `<div class="page">
  <div class="topline">
    <div class="brand">{{companyLogo}}</div>
    <div class="doc-code">{{templateCode}}</div>
  </div>
  <div class="company">
    <div class="company-name">{{companyName}}</div>
    <div class="company-meta">地址：{{companyAddress}}</div>
    <div class="company-meta">电话：{{companyPhone}}　邮箱：{{companyEmail}}　网址：{{companyWebsite}}</div>
  </div>
  <div class="section-title">申报要素</div>
  <div class="info-list">
    <div class="label">币制</div><div class="value">{{currency}}</div>
    <div class="label">出口享惠情况</div><div class="value">{{exportBenefit}}</div>
    <div class="label">征免</div><div class="value">{{exemptionNature}}</div>
    <div class="label">品牌类型</div><div class="value">{{brandType}}</div>
    <div class="label">申报要素</div><div class="value">{{declarationElements}}</div>
    <div class="label">用途</div><div class="value">{{usage}}</div>
    <div class="label">组成或构成</div><div class="value">{{material}}</div>
    <div class="label">品牌</div><div class="value">{{brand}}</div>
    <div class="label">型号</div><div class="value">{{model}}</div>
    <div class="label">注册编号</div><div class="value">{{registrationNo}}</div>
    <div class="label">GTIN</div><div class="value">{{gtin}}</div>
    <div class="label">CAS</div><div class="value">{{cas}}</div>
    <div class="label">其他</div><div class="value">{{otherNote}}</div>
  </div>
  <div class="block-title">商品明细</div>
  <table>
    <thead><tr><th>项号</th><th>商品编号</th><th>商品名称</th><th>规格型号</th><th>数量及单位</th><th>最终目的国</th><th>单价USD</th><th>总价USD</th></tr></thead>
    <tbody>{{itemRows}}</tbody>
  </table>
</div>`,
};

export const DEFAULT_CUSTOMS_DECLARATION_FORM_TEMPLATE: StoredPrintTemplate = {
  name: "中华人民共和国海关出口货物报关单",
  description: "报关管理-标准报关单打印模板",
  css: `${sharedHeaderCss}
body { font-family: "SimSun", "Songti SC", serif; font-size: 12px; color: #222; padding: 8px 24px 24px; }
.page { min-width: 1120px; }
.section-title { font-size: 24px; text-align: center; margin: 0 0 12px; }
.sheet-grid { display:grid; grid-template-columns: 92px 1fr 92px 1fr 92px 1fr; gap: 6px 8px; margin-top: 10px; }
.sheet-note { margin-top: 10px; border-top: 1px solid #888; padding-top: 8px; font-size: 11px; line-height: 1.8; white-space: pre-wrap; }
table { table-layout: fixed; }
thead th, tbody td { word-break: break-word; }
`,
  html: `<div class="page">
  <div class="section-title">中华人民共和国海关出口货物报关单</div>
  <div class="sheet-grid">
    <div class="label">报关单号</div><div class="value">{{declarationNo}}</div>
    <div class="label">出境关别</div><div class="value">{{customsPort}}</div>
    <div class="label">出口日期</div><div class="value">{{exportDate}}</div>
    <div class="label">申报日期</div><div class="value">{{declareDate}}</div>
    <div class="label">备案号</div><div class="value">{{recordNo}}</div>
    <div class="label">境外收货人</div><div class="value">{{overseasConsignee}}</div>
    <div class="label">运输方式</div><div class="value">{{transportMode}}</div>
    <div class="label">运输工具名称及航次号</div><div class="value">{{transportTool}}</div>
    <div class="label">提运单号</div><div class="value">{{billNo}}</div>
    <div class="label">生产销售单位</div><div class="value">{{productionSalesUnit}}</div>
    <div class="label">监管方式</div><div class="value">{{supervisionMode}}</div>
    <div class="label">征免性质</div><div class="value">{{levyNature}}</div>
    <div class="label">许可证号</div><div class="value">{{licenseNo}}</div>
    <div class="label">合同协议号</div><div class="value">{{contractNo}}</div>
    <div class="label">贸易国（地区）</div><div class="value">{{tradeCountry}}</div>
    <div class="label">运抵国（地区）</div><div class="value">{{destinationCountry}}</div>
    <div class="label">指运港</div><div class="value">{{domesticDestination}}</div>
    <div class="label">离境口岸</div><div class="value">{{loadingPort}}</div>
    <div class="label">包装种类</div><div class="value">{{packageType}}</div>
    <div class="label">件数</div><div class="value">{{totalPackages}}</div>
    <div class="label">毛重(千克)</div><div class="value">{{grossWeight}}</div>
    <div class="label">净重(千克)</div><div class="value">{{netWeight}}</div>
    <div class="label">成交方式</div><div class="value">{{transactionMethod}}</div>
    <div class="label">运费</div><div class="value">{{freight}}</div>
    <div class="label">保费</div><div class="value">{{insurance}}</div>
    <div class="label">杂费</div><div class="value">{{incidentalFee}}</div>
  </div>
  <div class="block-title">商品明细</div>
  <table>
    <thead><tr><th>项号</th><th>商品编号</th><th>商品名称</th><th>规格型号</th><th>数量及单位</th><th>单价</th><th>总价</th><th>币制</th><th>原产国(地区)</th><th>最终目的国(地区)</th><th>境内货源地</th><th>征免</th></tr></thead>
    <tbody>{{itemRows}}</tbody>
  </table>
  <div class="sheet-note">{{marksRemarks}}</div>
</div>`,
};

export const CUSTOMS_PRINT_TEMPLATE_DEFAULTS: Record<string, StoredPrintTemplate> = {
  customs_commercial_invoice_en: DEFAULT_CUSTOMS_COMMERCIAL_INVOICE_TEMPLATE,
  customs_packing_list_en: DEFAULT_CUSTOMS_PACKING_LIST_TEMPLATE,
  customs_declaration_elements: DEFAULT_CUSTOMS_DECLARATION_ELEMENTS_TEMPLATE,
  customs_declaration_form: DEFAULT_CUSTOMS_DECLARATION_FORM_TEMPLATE,
};
