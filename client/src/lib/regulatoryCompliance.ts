/**
 * 法规合规检查工具
 * 检查标签模板是否符合 NMPA / FDA / MDR 法规要求
 */

export interface ComplianceRule {
  id: string;
  description: string;
  descriptionZh: string;
  check: (elements: any[], template: any) => boolean;
  severity: "required" | "recommended";
}

export interface ComplianceResult {
  passed: boolean;
  totalRules: number;
  passedRules: number;
  failedRules: ComplianceRule[];
  warnings: ComplianceRule[];
}

// ── NMPA 法规要求 ──
const NMPA_RULES: ComplianceRule[] = [
  {
    id: "nmpa-product-name",
    description: "Product name in Chinese",
    descriptionZh: "产品名称（中文）",
    check: (els) => els.some(e => e.type === "text" && (e.fieldBinding === "productName" || (e.content && /[\u4e00-\u9fa5]/.test(e.content) && e.fontSize >= 10))),
    severity: "required",
  },
  {
    id: "nmpa-spec",
    description: "Specification/Model",
    descriptionZh: "规格型号",
    check: (els) => els.some(e => e.type === "text" && (e.fieldBinding === "specification" || /规格|型号|spec/i.test(e.content))),
    severity: "required",
  },
  {
    id: "nmpa-registration",
    description: "Registration certificate number",
    descriptionZh: "注册证号/备案号",
    check: (els) => els.some(e => e.type === "text" && (e.fieldBinding === "registrationNo" || /注册证|备案号|国械注准|国械注进|国械备/.test(e.content))),
    severity: "required",
  },
  {
    id: "nmpa-manufacturer",
    description: "Manufacturer name in Chinese",
    descriptionZh: "生产企业名称",
    check: (els) => els.some(e => e.type === "text" && (e.fieldBinding === "manufacturer" || /生产企业|制造商/.test(e.content))),
    severity: "required",
  },
  {
    id: "nmpa-address",
    description: "Manufacturer address",
    descriptionZh: "生产企业地址",
    check: (els) => els.some(e => e.type === "text" && (e.fieldBinding === "address" || /地址/.test(e.content))),
    severity: "required",
  },
  {
    id: "nmpa-mfg-date",
    description: "Manufacturing date",
    descriptionZh: "生产日期",
    check: (els) => els.some(e => e.fieldBinding === "mfgDate" || /生产日期/.test(e.content) || e.symbolId === "mfgDate"),
    severity: "required",
  },
  {
    id: "nmpa-exp-date",
    description: "Expiry date or service life",
    descriptionZh: "有效期/使用期限",
    check: (els) => els.some(e => e.fieldBinding === "expDate" || /有效期|使用期限/.test(e.content) || e.symbolId === "expiryDate"),
    severity: "required",
  },
  {
    id: "nmpa-batch",
    description: "Batch/Lot number",
    descriptionZh: "生产批号",
    check: (els) => els.some(e => e.fieldBinding === "batchNo" || /批号|LOT/.test(e.content) || e.symbolId === "lot"),
    severity: "required",
  },
  {
    id: "nmpa-udi",
    description: "UDI barcode (GS1)",
    descriptionZh: "UDI编码（条码/二维码）",
    check: (els) => els.some(e => e.type === "barcode" || e.type === "qrcode"),
    severity: "required",
  },
  {
    id: "nmpa-udi-di",
    description: "UDI-DI code",
    descriptionZh: "UDI-DI编码",
    check: (els) => els.some(e => e.fieldBinding === "udiDi" || /UDI-DI|UDI编码/.test(e.content)),
    severity: "recommended",
  },
  {
    id: "nmpa-license",
    description: "Production license number",
    descriptionZh: "生产许可证号",
    check: (els) => els.some(e => /生产许可证|许可证号/.test(e.content)),
    severity: "recommended",
  },
];

// ── FDA 法规要求 ──
const FDA_RULES: ComplianceRule[] = [
  {
    id: "fda-product-name",
    description: "Product name in English",
    descriptionZh: "产品名称（英文）",
    check: (els) => els.some(e => e.type === "text" && (e.fieldBinding === "productNameEn" || (e.fontSize >= 10 && /^[A-Za-z\s]+$/.test(e.content?.trim() || "")))),
    severity: "required",
  },
  {
    id: "fda-manufacturer",
    description: "Manufacturer name and address",
    descriptionZh: "制造商名称和地址",
    check: (els) => els.some(e => e.fieldBinding === "manufacturerEn" || e.symbolId === "manufacturer"),
    severity: "required",
  },
  {
    id: "fda-ref",
    description: "Catalog/Reference number",
    descriptionZh: "产品目录号/REF",
    check: (els) => els.some(e => e.fieldBinding === "productCode" || e.symbolId === "ref" || /REF|catalog/i.test(e.content)),
    severity: "required",
  },
  {
    id: "fda-lot",
    description: "Lot/Batch number",
    descriptionZh: "批号/LOT",
    check: (els) => els.some(e => e.fieldBinding === "batchNo" || e.symbolId === "lot" || /LOT|batch/i.test(e.content)),
    severity: "required",
  },
  {
    id: "fda-expiry",
    description: "Expiry date",
    descriptionZh: "有效期",
    check: (els) => els.some(e => e.fieldBinding === "expDate" || e.symbolId === "expiryDate"),
    severity: "required",
  },
  {
    id: "fda-rx-only",
    description: "Rx Only / OTC marking",
    descriptionZh: "处方器械标识 (Rx Only)",
    check: (els) => els.some(e => /Rx Only|OTC|处方/.test(e.content) || e.symbolId === "rxOnly"),
    severity: "required",
  },
  {
    id: "fda-udi",
    description: "UDI barcode (GS1-128 or GS1 DataMatrix)",
    descriptionZh: "UDI条码（GS1-128或GS1 DataMatrix）",
    check: (els) => els.some(e => (e.type === "barcode" || e.type === "qrcode") && /GS1/i.test(e.barcodeFormat || "")),
    severity: "required",
  },
  {
    id: "fda-listing",
    description: "FDA Listing / 510(k) number",
    descriptionZh: "FDA Listing / 510(k)号",
    check: (els) => els.some(e => /FDA|510\(k\)|K\d{6}|listing/i.test(e.content)),
    severity: "recommended",
  },
  {
    id: "fda-sterilization",
    description: "Sterilization method (if applicable)",
    descriptionZh: "灭菌方式标识",
    check: (els) => els.some(e => e.type === "symbol" && /sterile/i.test(e.symbolId || "")),
    severity: "recommended",
  },
];

// ── MDR 法规要求 ──
const MDR_RULES: ComplianceRule[] = [
  {
    id: "mdr-product-name",
    description: "Product name",
    descriptionZh: "产品名称",
    check: (els) => els.some(e => e.type === "text" && (e.fieldBinding === "productNameEn" || e.fieldBinding === "productName") && e.fontSize >= 10),
    severity: "required",
  },
  {
    id: "mdr-ce-mark",
    description: "CE marking with Notified Body number",
    descriptionZh: "CE标志（含公告机构号）",
    check: (els) => els.some(e => e.symbolId === "ce" || e.symbolId === "ceWithNB" || /CE/.test(e.content)),
    severity: "required",
  },
  {
    id: "mdr-manufacturer",
    description: "Manufacturer symbol and details",
    descriptionZh: "制造商符号及信息",
    check: (els) => els.some(e => e.symbolId === "manufacturer" || e.fieldBinding === "manufacturerEn"),
    severity: "required",
  },
  {
    id: "mdr-ec-rep",
    description: "EC REP (Authorized Representative)",
    descriptionZh: "欧盟授权代表 (EC REP)",
    check: (els) => els.some(e => e.symbolId === "ecRep" || /EC REP|授权代表/.test(e.content)),
    severity: "required",
  },
  {
    id: "mdr-basic-udi-di",
    description: "Basic UDI-DI",
    descriptionZh: "Basic UDI-DI编码",
    check: (els) => els.some(e => e.fieldBinding === "basicUdiDi" || /Basic UDI-DI/i.test(e.content)),
    severity: "required",
  },
  {
    id: "mdr-srn",
    description: "Single Registration Number (SRN)",
    descriptionZh: "单一注册号 (SRN)",
    check: (els) => els.some(e => e.fieldBinding === "srn" || /SRN/.test(e.content)),
    severity: "required",
  },
  {
    id: "mdr-md-symbol",
    description: "MD symbol (Medical Device)",
    descriptionZh: "医疗器械标识 (MD符号)",
    check: (els) => els.some(e => e.symbolId === "md"),
    severity: "required",
  },
  {
    id: "mdr-lot",
    description: "Lot/Batch number with symbol",
    descriptionZh: "批号 (LOT符号)",
    check: (els) => els.some(e => e.symbolId === "lot" || e.fieldBinding === "batchNo"),
    severity: "required",
  },
  {
    id: "mdr-ref",
    description: "Reference/Catalog number with symbol",
    descriptionZh: "产品编号 (REF符号)",
    check: (els) => els.some(e => e.symbolId === "ref" || e.fieldBinding === "productCode"),
    severity: "required",
  },
  {
    id: "mdr-mfg-date",
    description: "Manufacturing date symbol",
    descriptionZh: "生产日期符号",
    check: (els) => els.some(e => e.symbolId === "mfgDate" || e.fieldBinding === "mfgDate"),
    severity: "required",
  },
  {
    id: "mdr-exp-date",
    description: "Expiry date symbol",
    descriptionZh: "有效期符号",
    check: (els) => els.some(e => e.symbolId === "expiryDate" || e.fieldBinding === "expDate"),
    severity: "required",
  },
  {
    id: "mdr-udi",
    description: "UDI barcode (GS1-128 and/or GS1 DataMatrix)",
    descriptionZh: "UDI条码（GS1-128和/或GS1 DataMatrix）",
    check: (els) => els.some(e => (e.type === "barcode" || e.type === "qrcode") && /GS1/i.test(e.barcodeFormat || "")),
    severity: "required",
  },
  {
    id: "mdr-ifu",
    description: "Consult instructions for use symbol",
    descriptionZh: "参考使用说明符号",
    check: (els) => els.some(e => e.symbolId === "consultIFU"),
    severity: "recommended",
  },
  {
    id: "mdr-sterilization",
    description: "Sterilization method symbol",
    descriptionZh: "灭菌方式符号",
    check: (els) => els.some(e => e.type === "symbol" && /sterile|nonSterile/i.test(e.symbolId || "")),
    severity: "recommended",
  },
];

/**
 * 执行法规合规检查
 */
export function checkCompliance(regulation: "NMPA" | "FDA" | "MDR", elements: any[], template: any): ComplianceResult {
  const rules = regulation === "NMPA" ? NMPA_RULES : regulation === "FDA" ? FDA_RULES : MDR_RULES;
  const failedRules: ComplianceRule[] = [];
  const warnings: ComplianceRule[] = [];

  for (const rule of rules) {
    const passed = rule.check(elements, template);
    if (!passed) {
      if (rule.severity === "required") {
        failedRules.push(rule);
      } else {
        warnings.push(rule);
      }
    }
  }

  return {
    passed: failedRules.length === 0,
    totalRules: rules.length,
    passedRules: rules.length - failedRules.length - warnings.length,
    failedRules,
    warnings,
  };
}

/**
 * 获取法规要求的必填字段列表
 */
export function getRequiredFields(regulation: "NMPA" | "FDA" | "MDR"): { id: string; label: string; labelZh: string }[] {
  const rules = regulation === "NMPA" ? NMPA_RULES : regulation === "FDA" ? FDA_RULES : MDR_RULES;
  return rules
    .filter(r => r.severity === "required")
    .map(r => ({ id: r.id, label: r.description, labelZh: r.descriptionZh }));
}

/**
 * 获取法规信息摘要
 */
export const REGULATION_INFO = {
  NMPA: {
    fullName: "国家药品监督管理局",
    fullNameEn: "National Medical Products Administration",
    standard: "《医疗器械说明书和标签管理规定》(国家食品药品监督管理总局令第6号)",
    udiStandard: "《医疗器械唯一标识系统规则》(国家药监局公告2019年第66号)",
    keyRequirements: [
      "产品名称须使用中文",
      "注册证号/备案号",
      "生产企业名称和地址",
      "生产日期和有效期",
      "生产批号",
      "UDI编码（GS1标准）",
      "规格型号",
    ],
    color: "#16a34a",
    bgColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  FDA: {
    fullName: "美国食品药品监督管理局",
    fullNameEn: "U.S. Food and Drug Administration",
    standard: "21 CFR Part 801 - Labeling",
    udiStandard: "21 CFR Part 830 - Unique Device Identification",
    keyRequirements: [
      "产品名称（英文）",
      "Rx Only / OTC标识",
      "制造商名称和地址",
      "产品目录号 (REF)",
      "批号 (LOT) 和有效期",
      "UDI条码（GS1-128或GS1 DataMatrix）",
      "FDA Listing / 510(k)号",
    ],
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  MDR: {
    fullName: "欧盟医疗器械法规",
    fullNameEn: "EU Medical Device Regulation 2017/745",
    standard: "Regulation (EU) 2017/745 (MDR)",
    udiStandard: "Article 27 - Unique Device Identification",
    keyRequirements: [
      "产品名称",
      "CE标志（含公告机构号）",
      "制造商符号及信息",
      "欧盟授权代表 (EC REP)",
      "Basic UDI-DI",
      "单一注册号 (SRN)",
      "MD符号、ISO 15223-1符号",
      "UDI条码（GS1标准）",
      "LOT/REF/生产日期/有效期符号",
    ],
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
};
