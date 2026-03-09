import type { GSPRRequirement, DeviceCategory, DeviceClass } from "@shared/ce-types";

const allCats: DeviceCategory[] = ["non_invasive", "invasive", "active", "special", "software"];
const allClasses: DeviceClass[] = ["I", "IIa", "IIb", "III"];

/** MDR Annex I — General Safety and Performance Requirements (GSPR) */
export const gsprRequirementsData: Omit<GSPRRequirement, "complianceStatus" | "complianceStatement" | "evidenceDocuments" | "aiGenerated">[] = [
  // Chapter I — General Requirements (1-9)
  { id: "gspr_1", chapter: 1, section: "通用要求", clauseNumber: "1", title: "器械应达到其预期性能", titleEn: "Devices shall achieve the performance intended by their manufacturer", description: "器械应实现制造商规定的预期性能，其设计和制造应确保在正常使用条件下适合其预期用途。", descriptionEn: "Devices shall achieve the performance intended by their manufacturer, and shall be designed and manufactured in such a way that, during normal conditions of use, they are suitable for their intended purpose.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_2", chapter: 1, section: "通用要求", clauseNumber: "2", title: "风险管理", titleEn: "Risk management", description: "制造商应建立、实施、记录和维护风险管理体系。风险管理应理解为一个持续的迭代过程。", descriptionEn: "Manufacturers shall establish, implement, document and maintain a risk management system. Risk management shall be understood as a continuous iterative process.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_3", chapter: 1, section: "通用要求", clauseNumber: "3", title: "尽可能消除或降低风险", titleEn: "Eliminate or reduce risks as far as possible", description: "制造商应尽可能通过安全设计和制造消除或降低风险，在适当时采取充分的保护措施。", descriptionEn: "Manufacturers shall reduce risks as far as possible through safe design and manufacture, and where appropriate take adequate protection measures.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_4", chapter: 1, section: "通用要求", clauseNumber: "4", title: "安全措施", titleEn: "Safety measures", description: "制造商采取的安全措施应考虑到普遍认可的最新技术水平。", descriptionEn: "The safety measures adopted by manufacturers shall take account of the generally acknowledged state of the art.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_5", chapter: 1, section: "通用要求", clauseNumber: "5", title: "使用寿命内的安全性", titleEn: "Safety during intended lifetime", description: "器械在其预期使用寿命内，在正常使用和合理可预见的误用条件下，不应损害患者、使用者或其他人的临床状况或安全。", descriptionEn: "Devices shall not compromise the clinical condition or the safety of patients, users or other persons during their intended lifetime.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_6", chapter: 1, section: "通用要求", clauseNumber: "6", title: "运输和储存条件", titleEn: "Transport and storage conditions", description: "器械在制造商规定的运输和储存条件下，其特性和性能不应受到不利影响。", descriptionEn: "The characteristics and performance of devices shall not be adversely affected during transport and storage.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_7", chapter: 1, section: "通用要求", clauseNumber: "7", title: "受益大于风险", titleEn: "Benefits outweigh risks", description: "任何残余风险应与对患者和/或使用者的预期受益相比是可接受的，并应与高水平的健康和安全保护相一致。", descriptionEn: "Any risks which may be associated with their use shall constitute acceptable risks when weighed against the benefits to the patient.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_8", chapter: 1, section: "通用要求", clauseNumber: "8", title: "符合通用规范", titleEn: "Compliance with common specifications", description: "如果没有协调标准或协调标准不充分，器械应符合适用的通用规范。", descriptionEn: "Where no harmonised standards exist or where harmonised standards are not sufficient, devices shall comply with the applicable common specifications.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_9", chapter: 1, section: "通用要求", clauseNumber: "9", title: "器械分类", titleEn: "Device classification", description: "器械应按照附录 VIII 进行分类，同时考虑器械的预期用途和固有风险。", descriptionEn: "Devices shall be classified in accordance with Annex VIII, taking into account the intended purpose of the devices and their inherent risks.", applicableCategories: allCats, applicableClasses: allClasses },

  // Chapter II — Design and Manufacturing (10-22)
  { id: "gspr_10", chapter: 2, section: "化学、物理和生物特性", clauseNumber: "10", title: "化学、物理和生物特性", titleEn: "Chemical, physical and biological properties", description: "器械的设计和制造应确保关于化学、物理和生物特性的要求得到满足，特别是关于材料选择。", descriptionEn: "Devices shall be designed and manufactured in such a way as to ensure the characteristics and performance requirements referred to in Chapter I are fulfilled, with particular attention to materials selection.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_11", chapter: 2, section: "感染和微生物污染", clauseNumber: "11", title: "感染和微生物污染", titleEn: "Infection and microbial contamination", description: "器械及其制造过程的设计应消除或尽可能降低患者、使用者和其他人的感染风险。", descriptionEn: "Devices and their manufacturing processes shall be designed in such a way as to eliminate or to reduce as far as possible the risk of infection to patients, users and other persons.", applicableCategories: ["invasive", "active", "special"], applicableClasses: allClasses },
  { id: "gspr_12", chapter: 2, section: "含有物质的器械", clauseNumber: "12", title: "含有被视为药物的物质的器械", titleEn: "Devices incorporating a substance considered to be a medicinal product", description: "如果器械含有被视为药物的物质，应评估该物质的质量、安全性和有用性。", descriptionEn: "Where a device incorporates, as an integral part, a substance which, if used separately, may be considered to be a medicinal product, the quality, safety and usefulness of that substance shall be verified.", applicableCategories: ["special"], applicableClasses: ["IIb", "III"] },
  { id: "gspr_13", chapter: 2, section: "含有生物材料的器械", clauseNumber: "13", title: "含有人体或动物来源材料的器械", titleEn: "Devices incorporating materials of biological origin", description: "对于含有人体或动物来源组织、细胞或物质的器械，应特别注意来源选择、加工和灭活。", descriptionEn: "For devices manufactured utilising tissues or cells of human or animal origin, particular attention shall be paid to the sourcing, processing and inactivation.", applicableCategories: ["special"], applicableClasses: ["IIb", "III"] },
  { id: "gspr_14", chapter: 2, section: "器械构造和环境特性", clauseNumber: "14", title: "器械构造和环境特性", titleEn: "Construction of devices and interaction with their environment", description: "器械的设计和制造应尽可能降低与其物理特征相关的风险，包括尺寸/体积比、人体工程学特性和预期使用环境。", descriptionEn: "Devices shall be designed and manufactured in such a way as to reduce as far as possible the risks linked to their physical features.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_15", chapter: 2, section: "诊断或测量功能的器械", clauseNumber: "15", title: "具有诊断或测量功能的器械", titleEn: "Devices with a diagnostic or measuring function", description: "具有测量、监测或诊断功能的器械，应具有足够的准确度、精密度和稳定性。", descriptionEn: "Devices with a diagnostic or measuring function shall be designed and manufactured in such a way as to provide sufficient accuracy, precision and stability.", applicableCategories: ["active", "software"], applicableClasses: allClasses },
  { id: "gspr_16", chapter: 2, section: "辐射防护", clauseNumber: "16", title: "辐射防护", titleEn: "Protection against radiation", description: "器械的设计和制造应尽可能减少患者、使用者和其他人暴露于辐射的风险。", descriptionEn: "Devices shall be designed and manufactured in such a way that exposure of patients, users and other persons to radiation shall be reduced as far as possible.", applicableCategories: ["active"], applicableClasses: ["IIa", "IIb", "III"] },
  { id: "gspr_17", chapter: 2, section: "电子可编程系统", clauseNumber: "17", title: "电子可编程系统 — 含有软件的器械", titleEn: "Electronic programmable systems — devices that incorporate software", description: "含有电子可编程系统（包括软件）的器械，应确保软件的可重复性、可靠性和性能。", descriptionEn: "Devices that incorporate electronic programmable systems, including software, shall be designed to ensure repeatability, reliability and performance.", applicableCategories: ["active", "software"], applicableClasses: allClasses },
  { id: "gspr_18", chapter: 2, section: "有源器械及其连接的器械", clauseNumber: "18", title: "有源器械及其连接的器械", titleEn: "Active devices and devices connected to them", description: "有源器械在单一故障条件下应保持安全，或在发生故障时应有适当的报警。", descriptionEn: "For active devices, in the event of a single fault condition, appropriate means shall be adopted to eliminate or reduce consequent risks.", applicableCategories: ["active"], applicableClasses: allClasses },
  { id: "gspr_19", chapter: 2, section: "特殊要求", clauseNumber: "19", title: "对特定器械组的特殊要求", titleEn: "Particular requirements for specific device groups", description: "对于特定类型的器械（如植入器械、有源植入器械等），应满足附加的特殊要求。", descriptionEn: "For specific device groups, additional particular requirements shall be met.", applicableCategories: allCats, applicableClasses: ["IIb", "III"] },
  { id: "gspr_20", chapter: 2, section: "标签和使用说明", clauseNumber: "20", title: "标签要求", titleEn: "Label requirements", description: "标签上应包含识别器械和制造商所需的信息，以及安全和性能相关信息。", descriptionEn: "The label shall bear the particulars needed to identify the device and the manufacturer, and safety and performance information.", applicableCategories: allCats, applicableClasses: allClasses },
  { id: "gspr_21", chapter: 2, section: "标签和使用说明", clauseNumber: "21", title: "使用说明", titleEn: "Instructions for use", description: "使用说明应包含使用者安全和正确使用器械所需的信息。", descriptionEn: "The instructions for use shall contain the information needed for the user to safely and correctly use the device.", applicableCategories: allCats, applicableClasses: allClasses },

  // Chapter III — Additional requirements (22-23)
  { id: "gspr_22", chapter: 3, section: "附加要求", clauseNumber: "22", title: "组织工程产品的附加要求", titleEn: "Additional requirements for devices intended to administer medicinal products", description: "用于给药的器械应与相关药物兼容，并符合相关药物法规的要求。", descriptionEn: "Devices intended to administer medicinal products shall be designed and manufactured in such a way as to be compatible with the medicinal products concerned.", applicableCategories: ["special"], applicableClasses: ["IIa", "IIb", "III"] },
  { id: "gspr_23", chapter: 3, section: "附加要求", clauseNumber: "23", title: "含有 CMR/ED 物质的器械", titleEn: "Devices containing CMR or endocrine-disrupting substances", description: "含有致癌、致突变、生殖毒性或内分泌干扰物质的器械，应进行替代分析和风险评估。", descriptionEn: "Devices containing substances that are carcinogenic, mutagenic, toxic to reproduction or endocrine-disrupting shall undergo substitution analysis.", applicableCategories: allCats, applicableClasses: allClasses },
];

/** 根据产品分类和类别过滤适用的 GSPR 条款 */
export function getFilteredGSPR(
  deviceCategory: DeviceCategory,
  deviceClass: DeviceClass
): GSPRRequirement[] {
  return gsprRequirementsData
    .filter(
      (r) =>
        r.applicableCategories.includes(deviceCategory) &&
        r.applicableClasses.includes(deviceClass)
    )
    .map((r) => ({
      ...r,
      complianceStatus: "pending" as const,
      complianceStatement: "",
      evidenceDocuments: "",
      aiGenerated: false,
    }));
}
