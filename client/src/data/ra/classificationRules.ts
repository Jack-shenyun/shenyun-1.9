import type { DeviceCategory, DeviceClass, ClassificationRule, ApplicableStandard, TechnicalCharacteristics } from "@shared/ce-types";

export interface ClassificationQuestion {
  id: string;
  text: string;
  helpText?: string;
  annexRef: string;
  options: ClassificationOption[];
}

export interface ClassificationOption {
  label: string;
  value: string;
  nextQuestionId?: string;
  result?: {
    deviceClass: DeviceClass;
    rule: ClassificationRule;
    ruleDescription: string;
    compliancePath: string;
    riskLevel: "低" | "中低" | "中高" | "高";
  };
}

// ==================== 分类问卷 ====================

export const classificationQuestions: Record<DeviceCategory, ClassificationQuestion[]> = {
  non_invasive: [
    {
      id: "ni_1",
      text: "该器械是否用于引导或储存血液、体液或组织/液体/气体，以便输入、给药或引入人体？",
      annexRef: "MDR Annex VIII, Rule 2",
      options: [
        { label: "是", value: "yes", nextQuestionId: "ni_2" },
        { label: "否", value: "no", nextQuestionId: "ni_3" },
      ],
    },
    {
      id: "ni_2",
      text: "该器械是否可能连接到 Class IIa 或更高级别的有源器械？",
      annexRef: "MDR Annex VIII, Rule 2",
      options: [
        { label: "是", value: "yes", result: { deviceClass: "IIa", rule: "Rule 2", ruleDescription: "用于引导或储存体液/组织以输入人体的非侵入性器械，连接到有源器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex XI (Part A)", riskLevel: "中低" } },
        { label: "否", value: "no", result: { deviceClass: "I", rule: "Rule 1", ruleDescription: "不接触患者或仅接触完整皮肤的非侵入性器械", compliancePath: "Annex IX (Chapter I) 或 Annex XI (Part A) — 自我声明", riskLevel: "低" } },
      ],
    },
    {
      id: "ni_3",
      text: "该器械是否用于修改血液、其他体液或其他液体的生物或化学组成？",
      annexRef: "MDR Annex VIII, Rule 3",
      options: [
        { label: "是（用于过滤、离心或气体/热量交换）", value: "filter", result: { deviceClass: "IIa", rule: "Rule 3", ruleDescription: "用于修改体液生物/化学组成的非侵入性器械（过滤等）", compliancePath: "Annex IX (Chapter I + III) 或 Annex XI (Part A)", riskLevel: "中低" } },
        { label: "是（涉及透析或血液过滤等）", value: "dialysis", result: { deviceClass: "IIb", rule: "Rule 3", ruleDescription: "用于修改体液生物/化学组成的非侵入性器械（透析等）", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
        { label: "否", value: "no", nextQuestionId: "ni_4" },
      ],
    },
    {
      id: "ni_4",
      text: "该器械是否接触受伤皮肤？",
      annexRef: "MDR Annex VIII, Rule 4",
      options: [
        { label: "是（用作机械屏障/压迫或吸收渗出物）", value: "barrier", result: { deviceClass: "I", rule: "Rule 4", ruleDescription: "接触受伤皮肤的非侵入性器械（机械屏障）", compliancePath: "Annex IX (Chapter I) — 自我声明", riskLevel: "低" } },
        { label: "是（用于二度烧伤等需要二级愈合的伤口）", value: "secondary", result: { deviceClass: "IIa", rule: "Rule 4", ruleDescription: "接触受伤皮肤的非侵入性器械（二级愈合伤口）", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "是（用于真皮层破损的严重伤口）", value: "severe", result: { deviceClass: "IIb", rule: "Rule 4", ruleDescription: "接触受伤皮肤的非侵入性器械（严重伤口）", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
        { label: "否", value: "no", result: { deviceClass: "I", rule: "Rule 1", ruleDescription: "不接触患者或仅接触完整皮肤的非侵入性器械", compliancePath: "Annex IX (Chapter I) — 自我声明", riskLevel: "低" } },
      ],
    },
  ],

  invasive: [
    {
      id: "inv_1",
      text: "该器械通过何种方式侵入人体？",
      annexRef: "MDR Annex VIII, Rule 5-8",
      options: [
        { label: "通过自然腔道（非手术方式）", value: "orifice", nextQuestionId: "inv_2" },
        { label: "通过手术方式侵入", value: "surgical", nextQuestionId: "inv_3" },
        { label: "植入器械", value: "implant", nextQuestionId: "inv_4" },
      ],
    },
    {
      id: "inv_2",
      text: "该器械的预期使用时间？",
      annexRef: "MDR Annex VIII, Rule 5-6",
      options: [
        { label: "暂时使用（< 60 分钟）", value: "transient", result: { deviceClass: "I", rule: "Rule 5", ruleDescription: "通过自然腔道暂时使用的侵入性器械", compliancePath: "Annex IX (Chapter I) — 自我声明", riskLevel: "低" } },
        { label: "短期使用（≤ 30 天）", value: "short", result: { deviceClass: "IIa", rule: "Rule 5", ruleDescription: "通过自然腔道短期使用的侵入性器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "长期使用（> 30 天）", value: "long", result: { deviceClass: "IIb", rule: "Rule 5", ruleDescription: "通过自然腔道长期使用的侵入性器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
      ],
    },
    {
      id: "inv_3",
      text: "该手术侵入器械的预期使用时间？",
      annexRef: "MDR Annex VIII, Rule 6-7",
      options: [
        { label: "暂时使用（< 60 分钟）", value: "transient", result: { deviceClass: "IIa", rule: "Rule 6", ruleDescription: "手术侵入暂时使用的器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "短期使用（≤ 30 天）", value: "short", result: { deviceClass: "IIa", rule: "Rule 7", ruleDescription: "手术侵入短期使用的器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "长期使用（> 30 天）", value: "long", result: { deviceClass: "IIb", rule: "Rule 7", ruleDescription: "手术侵入长期使用的器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
      ],
    },
    {
      id: "inv_4",
      text: "该植入器械的具体类型？",
      annexRef: "MDR Annex VIII, Rule 8",
      options: [
        { label: "牙科植入物", value: "dental", result: { deviceClass: "IIb", rule: "Rule 8", ruleDescription: "牙科植入器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
        { label: "心血管植入物或脊柱植入物", value: "cardio_spine", result: { deviceClass: "III", rule: "Rule 8", ruleDescription: "心血管或脊柱植入器械", compliancePath: "Annex IX (Chapter I + II) 或 Annex X + Annex XI (Part A)", riskLevel: "高" } },
        { label: "其他植入物", value: "other", result: { deviceClass: "IIb", rule: "Rule 8", ruleDescription: "其他植入器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
      ],
    },
  ],

  active: [
    {
      id: "act_1",
      text: "该有源器械的主要功能？",
      annexRef: "MDR Annex VIII, Rule 9-13",
      options: [
        { label: "用于诊断或监测（提供能量或检测）", value: "diagnostic", nextQuestionId: "act_2" },
        { label: "用于治疗（输送能量或物质）", value: "therapeutic", nextQuestionId: "act_3" },
        { label: "用于管理药物、体液或其他物质的输入/排出", value: "admin", result: { deviceClass: "IIa", rule: "Rule 12", ruleDescription: "用于管理药物/体液输入排出的有源器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "其他有源器械", value: "other", result: { deviceClass: "I", rule: "Rule 13", ruleDescription: "其他有源器械", compliancePath: "Annex IX (Chapter I) — 自我声明", riskLevel: "低" } },
      ],
    },
    {
      id: "act_2",
      text: "该诊断有源器械的具体用途？",
      annexRef: "MDR Annex VIII, Rule 10",
      options: [
        { label: "提供能量被人体吸收（如 X 射线、超声诊断）", value: "energy", result: { deviceClass: "IIa", rule: "Rule 10", ruleDescription: "提供能量被人体吸收的诊断有源器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "用于直接诊断或监测重要生理过程", value: "vital", result: { deviceClass: "IIb", rule: "Rule 10", ruleDescription: "用于监测重要生理过程的有源器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
        { label: "发射电离辐射用于诊断/治疗放射学", value: "ionizing", result: { deviceClass: "IIb", rule: "Rule 10", ruleDescription: "发射电离辐射的诊断有源器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
      ],
    },
    {
      id: "act_3",
      text: "该治疗有源器械输送能量的方式？",
      annexRef: "MDR Annex VIII, Rule 9",
      options: [
        { label: "输送或交换能量（非潜在危险方式）", value: "safe", result: { deviceClass: "IIa", rule: "Rule 9", ruleDescription: "以非潜在危险方式输送能量的治疗有源器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "输送或交换能量（潜在危险方式）", value: "dangerous", result: { deviceClass: "IIb", rule: "Rule 9", ruleDescription: "以潜在危险方式输送能量的治疗有源器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
      ],
    },
  ],

  special: [
    {
      id: "sp_1",
      text: "该特殊器械的具体类型？",
      annexRef: "MDR Annex VIII, Rule 14-22",
      options: [
        { label: "含有药物成分", value: "drug", result: { deviceClass: "III", rule: "Rule 14", ruleDescription: "含有药物成分的器械", compliancePath: "Annex IX (Chapter I + II) — 需药品主管部门意见", riskLevel: "高" } },
        { label: "用于避孕或预防性传播疾病", value: "contraceptive", result: { deviceClass: "IIb", rule: "Rule 15", ruleDescription: "用于避孕或预防性传播疾病的器械", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
        { label: "含有人体或动物来源的组织/细胞", value: "tissue", result: { deviceClass: "III", rule: "Rule 18", ruleDescription: "含有人体/动物来源组织的器械", compliancePath: "Annex IX (Chapter I + II)", riskLevel: "高" } },
        { label: "含有纳米材料", value: "nano", result: { deviceClass: "III", rule: "Rule 19", ruleDescription: "含有纳米材料的器械", compliancePath: "Annex IX (Chapter I + II)", riskLevel: "高" } },
        { label: "用于消毒/灭菌的器械", value: "disinfect", result: { deviceClass: "IIa", rule: "Rule 16", ruleDescription: "用于消毒/灭菌的器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "其他特殊器械", value: "other", result: { deviceClass: "IIb", rule: "Rule 22", ruleDescription: "其他特殊规则适用的器械", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中高" } },
      ],
    },
  ],

  software: [
    {
      id: "sw_1",
      text: "该软件的预期用途？",
      annexRef: "MDR Annex VIII, Rule 11",
      options: [
        { label: "用于提供诊断或治疗决策的信息", value: "decision", nextQuestionId: "sw_2" },
        { label: "用于监测生理过程", value: "monitor", result: { deviceClass: "IIa", rule: "Rule 11", ruleDescription: "用于监测生理过程的独立软件", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "用于驱动或影响有源器械的使用", value: "drive", result: { deviceClass: "IIa", rule: "Rule 11", ruleDescription: "用于驱动有源器械的独立软件", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
        { label: "其他用途（非诊断/治疗决策）", value: "other", result: { deviceClass: "I", rule: "Rule 11", ruleDescription: "其他用途的独立软件", compliancePath: "Annex IX (Chapter I) — 自我声明", riskLevel: "低" } },
      ],
    },
    {
      id: "sw_2",
      text: "该软件提供的信息用于何种决策？",
      annexRef: "MDR Annex VIII, Rule 11",
      options: [
        { label: "可能导致死亡或不可逆的健康状况恶化", value: "death", result: { deviceClass: "III", rule: "Rule 11", ruleDescription: "提供可能导致死亡/不可逆健康恶化决策信息的软件", compliancePath: "Annex IX (Chapter I + II)", riskLevel: "高" } },
        { label: "可能导致严重的健康状况恶化或手术干预", value: "serious", result: { deviceClass: "IIb", rule: "Rule 11", ruleDescription: "提供可能导致严重健康恶化决策信息的软件", compliancePath: "Annex IX (Chapter I + III) 或 Annex X + Annex XI (Part A)", riskLevel: "中高" } },
        { label: "其他诊断/治疗决策", value: "other", result: { deviceClass: "IIa", rule: "Rule 11", ruleDescription: "提供一般诊断/治疗决策信息的软件", compliancePath: "Annex IX (Chapter I + III)", riskLevel: "中低" } },
      ],
    },
  ],
};

// ==================== 适用标准生成 ====================

const baseStandards: ApplicableStandard[] = [
  { id: "iso13485", number: "ISO 13485:2016", title: "医疗器械 — 质量管理体系", titleEn: "Medical devices — Quality management systems", category: "通用", mandatory: true },
  { id: "iso14971", number: "ISO 14971:2019", title: "医疗器械 — 风险管理", titleEn: "Medical devices — Application of risk management", category: "通用", mandatory: true },
  { id: "iec62366", number: "IEC 62366-1:2015+A1:2020", title: "可用性工程", titleEn: "Usability engineering", category: "通用", mandatory: true },
  { id: "en1041", number: "EN 1041:2008+A1:2013", title: "制造商提供的信息", titleEn: "Information supplied by the manufacturer", category: "通用", mandatory: true },
  { id: "iso15223", number: "ISO 15223-1:2021", title: "医疗器械标签符号", titleEn: "Symbols to be used with information to be supplied by the manufacturer", category: "通用", mandatory: true },
];

const conditionalStandards: Array<ApplicableStandard & { condition: (chars: TechnicalCharacteristics) => boolean }> = [
  { id: "iec62304", number: "IEC 62304:2006+A1:2015", title: "医疗器械软件 — 软件生命周期过程", titleEn: "Medical device software — Software life cycle processes", category: "产品特定", mandatory: true, condition: (c) => c.hasSoftware, applicableWhen: "含有软件组件" },
  { id: "iec60601", number: "IEC 60601-1:2005+A2:2020", title: "医用电气设备 — 基本安全和基本性能", titleEn: "Medical electrical equipment — Basic safety and essential performance", category: "产品特定", mandatory: true, condition: (c) => c.hasElectricalSafety, applicableWhen: "需要电气安全" },
  { id: "iso10993", number: "ISO 10993-1:2018", title: "生物相容性评价", titleEn: "Biological evaluation of medical devices", category: "产品特定", mandatory: true, condition: (c) => c.hasBiocompatibility, applicableWhen: "接触人体" },
  { id: "iso11135", number: "ISO 11135:2014", title: "环氧乙烷灭菌", titleEn: "Sterilization of health-care products — Ethylene oxide", category: "过程", mandatory: false, condition: (c) => c.isSterile && c.sterilizationMethod === "EO", applicableWhen: "EO 灭菌" },
  { id: "iso11137", number: "ISO 11137-1:2006", title: "辐射灭菌", titleEn: "Sterilization — Radiation", category: "过程", mandatory: false, condition: (c) => c.isSterile && c.sterilizationMethod === "radiation", applicableWhen: "辐射灭菌" },
  { id: "iso17665", number: "ISO 17665-1:2006", title: "湿热灭菌", titleEn: "Sterilization — Moist heat", category: "过程", mandatory: false, condition: (c) => c.isSterile && c.sterilizationMethod === "steam", applicableWhen: "湿热灭菌" },
  { id: "iec80001", number: "IEC 80001-1:2021", title: "IT 网络风险管理", titleEn: "Application of risk management for IT-networks incorporating medical devices", category: "产品特定", mandatory: false, condition: (c) => c.hasCybersecurity, applicableWhen: "有网络连接" },
  { id: "iec82304", number: "IEC 82304-1:2016", title: "健康软件 — 产品安全", titleEn: "Health software — Product safety", category: "产品特定", mandatory: false, condition: (c) => c.hasSoftware, applicableWhen: "独立软件" },
  { id: "iso17025", number: "ISO 17025:2017", title: "测试和校准实验室能力", titleEn: "Testing and calibration laboratories", category: "测试", mandatory: false, condition: (c) => c.hasMeasuringFunction, applicableWhen: "含测量功能" },
  { id: "iso17664", number: "ISO 17664-1:2021", title: "可重复使用器械的处理", titleEn: "Processing of health care products — Reprocessing", category: "过程", mandatory: false, condition: (c) => c.isReusable, applicableWhen: "可重复使用" },
];

export function generateApplicableStandards(chars: TechnicalCharacteristics): ApplicableStandard[] {
  const applicable = [...baseStandards];
  for (const std of conditionalStandards) {
    if (std.condition(chars)) {
      const { condition, ...standard } = std;
      applicable.push(standard);
    }
  }
  return applicable;
}
