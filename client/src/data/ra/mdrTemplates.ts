/**
 * MDR (EU) 2017/745 技术文件模板
 * 基于 Annex II & III — 8大类，22个文档，100+章节
 */
import type { DocumentModule, DocumentDefinition, DocumentId } from "./types";

function s(id: string, title: string, titleEn: string, isFramework = true) {
  return { id, title, titleEn, content: "", contentEn: "", isFramework, aiGenerated: false, userEdited: false };
}

export const mdrDocumentTemplates: DocumentModule[] = [
  // ==================== 第1类：器械描述与规范 ====================
  {
    id: "section_01",
    title: "第1部分：器械描述与规范",
    titleEn: "Section 1: Device Description and Specification",
    documents: [
      {
        id: "device_description",
        title: "器械描述与规范",
        titleEn: "Device Description and Specification",
        moduleId: "section_01",
        annexReference: "MDR Annex II, Section 1",
        sections: [
          s("dd_scope", "文件范围与目的", "Document Scope and Purpose"),
          s("dd_product_name", "产品名称与标识", "Product Name and Identification"),
          s("dd_intended_purpose", "预期用途与适应症", "Intended Purpose and Indications"),
          s("dd_contraindications", "禁忌症", "Contraindications"),
          s("dd_target_population", "目标患者人群与预期使用者", "Target Patient Population and Intended Users"),
          s("dd_working_principle", "工作原理", "Working Principle"),
          s("dd_components", "组件与配件描述", "Components and Accessories"),
          s("dd_materials", "材料说明", "Materials Description"),
          s("dd_specifications", "技术规格", "Technical Specifications"),
          s("dd_variants", "产品变体与配置", "Product Variants and Configurations"),
          s("dd_packaging", "包装描述", "Packaging Description"),
          s("dd_classification", "器械分类与适用规则", "Device Classification and Applied Rules"),
          s("dd_predecessor", "前代产品与等效器械", "Predecessor and Equivalent Devices"),
        ],
      },
    ],
  },

  // ==================== 第2类：制造商提供的信息 ====================
  {
    id: "section_02",
    title: "第2部分：制造商提供的信息",
    titleEn: "Section 2: Information to be Supplied by the Manufacturer",
    documents: [
      {
        id: "label_language",
        title: "标签和语言信息",
        titleEn: "Label and Language Information",
        moduleId: "section_02",
        annexReference: "MDR Annex II, Section 2 / Annex I Chapter III",
        sections: [
          s("ll_label_content", "标签内容要求", "Label Content Requirements"),
          s("ll_udi", "UDI 标识要求", "UDI Requirements"),
          s("ll_languages", "语言要求", "Language Requirements"),
        ],
      },
      {
        id: "ifu",
        title: "使用说明书",
        titleEn: "Instruction for Use",
        moduleId: "section_02",
        annexReference: "MDR Annex I, Chapter III, Section 23",
        sections: [
          s("ifu_content", "使用说明书内容", "IFU Content"),
          s("ifu_warnings", "警告与注意事项", "Warnings and Precautions"),
          s("ifu_maintenance", "维护与处置说明", "Maintenance and Disposal"),
        ],
      },
      {
        id: "label_design",
        title: "标签",
        titleEn: "Label",
        moduleId: "section_02",
        annexReference: "MDR Annex I, Chapter III, Section 23",
        sections: [
          s("ld_inner_label", "内包装标签", "Inner Package Label"),
          s("ld_outer_label", "外包装标签", "Outer Package Label"),
          s("ld_symbols", "标签符号说明", "Label Symbols"),
        ],
      },
    ],
  },

  // ==================== 第3类：设计与制造信息 ====================
  {
    id: "section_03",
    title: "第3部分：设计与制造信息",
    titleEn: "Section 3: Design and Manufacturing Information",
    documents: [
      {
        id: "design_manufacturing",
        title: "设计与制造信息",
        titleEn: "Design and Manufacturing Information",
        moduleId: "section_03",
        annexReference: "MDR Annex II, Section 3",
        sections: [
          s("dm_design_stages", "设计阶段与设计输入/输出", "Design Stages and Design Input/Output"),
          s("dm_manufacturing", "制造工艺流程", "Manufacturing Process"),
          s("dm_critical_processes", "特殊和关键工序控制", "Special and Critical Process Controls"),
          s("dm_quality_control", "质量控制与检验", "Quality Control and Inspection"),
          s("dm_suppliers", "供应商管理与资质", "Supplier Management and Qualification"),
          s("dm_production_site", "生产场地与洁净室", "Production Site and Clean Room"),
          s("dm_traceability", "可追溯性", "Traceability"),
        ],
      },
    ],
  },

  // ==================== 第4类：GSPR 与适用标准 ====================
  {
    id: "section_04",
    title: "第4部分：通用安全和性能要求",
    titleEn: "Section 4: General Safety and Performance Requirements",
    documents: [
      {
        id: "gspr_checklist",
        title: "GSPR 检查表",
        titleEn: "General Safety and Performance Requirements Checklist",
        moduleId: "section_04",
        annexReference: "MDR Annex II, Section 4 / Annex I",
        sections: [
          s("gspr_overview", "GSPR 符合性概述", "GSPR Compliance Overview"),
          s("gspr_table", "GSPR 条款符合性表格", "GSPR Clause Compliance Table"),
        ],
      },
      {
        id: "applied_standards",
        title: "适用标准清单",
        titleEn: "Applied Standard List",
        moduleId: "section_04",
        annexReference: "MDR Annex II, Section 4",
        sections: [
          s("as_harmonized", "协调标准", "Harmonised Standards"),
          s("as_other", "其他适用标准", "Other Applied Standards"),
          s("as_common_specs", "通用规范", "Common Specifications"),
        ],
      },
    ],
  },

  // ==================== 第5类：受益-风险分析与风险管理 ====================
  {
    id: "section_05",
    title: "第5部分：受益-风险分析与风险管理",
    titleEn: "Section 5: Benefit-Risk Analysis and Risk Management",
    documents: [
      {
        id: "risk_plan",
        title: "风险管理计划",
        titleEn: "Risk Management Plan",
        moduleId: "section_05",
        annexReference: "MDR Annex II, Section 5 / ISO 14971",
        sections: [
          s("rp_scope", "风险管理范围与策划", "Risk Management Scope and Planning"),
          s("rp_criteria", "风险可接受性准则", "Risk Acceptability Criteria"),
          s("rp_activities", "风险管理活动", "Risk Management Activities"),
          s("rp_review", "风险管理评审要求", "Risk Management Review Requirements"),
        ],
      },
      {
        id: "risk_report",
        title: "风险管理报告",
        titleEn: "Risk Management Report",
        moduleId: "section_05",
        annexReference: "MDR Annex II, Section 5 / ISO 14971",
        sections: [
          s("rr_hazard_identification", "危害识别", "Hazard Identification"),
          s("rr_risk_estimation", "风险估计", "Risk Estimation"),
          s("rr_risk_evaluation", "风险评价", "Risk Evaluation"),
          s("rr_risk_control", "风险控制措施", "Risk Control Measures"),
          s("rr_residual_risk", "残余风险评估", "Residual Risk Assessment"),
          s("rr_benefit_risk", "受益-风险分析", "Benefit-Risk Analysis"),
          s("rr_conclusion", "风险管理结论", "Risk Management Conclusion"),
        ],
      },
    ],
  },

  // ==================== 第6类：临床前信息 ====================
  {
    id: "section_06",
    title: "第6部分：临床前信息",
    titleEn: "Section 6: Pre-clinical Information",
    documents: [
      {
        id: "biocompatibility",
        title: "生物相容性评价报告",
        titleEn: "Biocompatibility Evaluation Report",
        moduleId: "section_06",
        annexReference: "MDR Annex II, Section 6 / ISO 10993",
        sections: [
          s("bio_plan", "生物相容性评价计划", "Biocompatibility Evaluation Plan"),
          s("bio_material_char", "材料表征", "Material Characterization"),
          s("bio_test_results", "测试结果", "Test Results"),
          s("bio_conclusion", "评价结论", "Evaluation Conclusion"),
        ],
      },
      {
        id: "sterilization",
        title: "灭菌验证报告",
        titleEn: "Sterilization Validation Report",
        moduleId: "section_06",
        annexReference: "MDR Annex II, Section 6",
        sections: [
          s("ster_method", "灭菌方法", "Sterilization Method"),
          s("ster_validation", "灭菌验证", "Sterilization Validation"),
          s("ster_residuals", "残留物分析", "Residual Analysis"),
          s("ster_conclusion", "验证结论", "Validation Conclusion"),
        ],
      },
      {
        id: "performance_testing",
        title: "性能测试报告",
        titleEn: "Performance Testing Report",
        moduleId: "section_06",
        annexReference: "MDR Annex II, Section 6",
        sections: [
          s("pt_test_plan", "测试计划", "Test Plan"),
          s("pt_test_methods", "测试方法", "Test Methods"),
          s("pt_results", "测试结果", "Test Results"),
          s("pt_conclusion", "测试结论", "Test Conclusion"),
        ],
      },
      {
        id: "shelf_life",
        title: "货架寿命验证报告",
        titleEn: "Shelf-Life Validation Report",
        moduleId: "section_06",
        annexReference: "MDR Annex II, Section 6",
        sections: [
          s("sl_protocol", "验证方案", "Validation Protocol"),
          s("sl_aging_study", "老化研究", "Aging Study"),
          s("sl_results", "验证结果", "Validation Results"),
          s("sl_conclusion", "验证结论", "Validation Conclusion"),
        ],
      },
      {
        id: "transport_testing",
        title: "运输测试报告",
        titleEn: "Transportation Testing Report",
        moduleId: "section_06",
        annexReference: "MDR Annex II, Section 6",
        sections: [
          s("tt_protocol", "测试方案", "Test Protocol"),
          s("tt_conditions", "测试条件", "Test Conditions"),
          s("tt_results", "测试结果", "Test Results"),
          s("tt_conclusion", "测试结论", "Test Conclusion"),
        ],
      },
      {
        id: "usability",
        title: "可用性评价报告",
        titleEn: "Usability Evaluation Report",
        moduleId: "section_06",
        annexReference: "MDR Annex II, Section 6 / IEC 62366",
        sections: [
          s("ue_use_spec", "使用规范", "Use Specification"),
          s("ue_risk_analysis", "使用相关风险分析", "Use-Related Risk Analysis"),
          s("ue_formative", "形成性评价", "Formative Evaluation"),
          s("ue_summative", "总结性评价", "Summative Evaluation"),
          s("ue_conclusion", "评价结论", "Evaluation Conclusion"),
        ],
      },
    ],
  },

  // ==================== 第7类：临床评价 ====================
  {
    id: "section_07",
    title: "第7部分：临床评价",
    titleEn: "Section 7: Clinical Evaluation",
    documents: [
      {
        id: "cep",
        title: "临床评价计划",
        titleEn: "Clinical Evaluation Plan",
        moduleId: "section_07",
        annexReference: "MDR Annex XIV, Part A",
        sections: [
          s("cep_scope", "评价范围与目标", "Evaluation Scope and Objectives"),
          s("cep_literature", "文献检索策略", "Literature Search Strategy"),
          s("cep_equivalence", "等效性论证", "Equivalence Justification"),
          s("cep_data_requirements", "临床数据要求", "Clinical Data Requirements"),
          s("cep_endpoints", "临床终点", "Clinical Endpoints"),
        ],
      },
      {
        id: "cer",
        title: "临床评价报告",
        titleEn: "Clinical Evaluation Report",
        moduleId: "section_07",
        annexReference: "MDR Annex XIV, Part A",
        sections: [
          s("cer_summary", "执行摘要", "Executive Summary"),
          s("cer_clinical_bg", "临床背景", "Clinical Background"),
          s("cer_literature", "文献综述", "Literature Review"),
          s("cer_data_analysis", "临床数据分析", "Clinical Data Analysis"),
          s("cer_benefit_risk", "受益-风险分析", "Benefit-Risk Analysis"),
          s("cer_conclusion", "结论", "Conclusion"),
        ],
      },
      {
        id: "pms_plan",
        title: "上市后监管计划",
        titleEn: "Post-Market Surveillance Plan",
        moduleId: "section_07",
        annexReference: "MDR Article 84 / Annex III",
        sections: [
          s("pms_scope", "监管范围与目标", "Surveillance Scope and Objectives"),
          s("pms_data_collection", "数据收集方法", "Data Collection Methods"),
          s("pms_complaint", "投诉处理流程", "Complaint Handling Process"),
          s("pms_vigilance", "警戒报告", "Vigilance Reporting"),
          s("pms_trend", "趋势分析", "Trend Analysis"),
          s("pms_capa", "纠正预防措施", "Corrective and Preventive Actions"),
        ],
      },
      {
        id: "pmcf",
        title: "上市后临床跟踪计划",
        titleEn: "Post-Market Clinical Follow-Up Plan (PMCF)",
        moduleId: "section_07",
        annexReference: "MDR Annex XIV, Part B",
        sections: [
          s("pmcf_plan", "PMCF 计划", "PMCF Plan"),
          s("pmcf_methods", "跟踪方法", "Follow-up Methods"),
          s("pmcf_milestones", "里程碑与时间表", "Milestones and Timeline"),
        ],
      },
      {
        id: "psur",
        title: "定期安全性更新报告",
        titleEn: "Periodic Safety Update Report (PSUR)",
        moduleId: "section_07",
        annexReference: "MDR Article 86",
        sections: [
          s("psur_summary", "报告摘要", "Report Summary"),
          s("psur_safety_data", "安全性数据分析", "Safety Data Analysis"),
          s("psur_benefit_risk", "受益-风险结论更新", "Benefit-Risk Conclusion Update"),
          s("psur_actions", "采取的措施", "Actions Taken"),
        ],
      },
    ],
  },

  // ==================== 第8类：符合性声明 ====================
  {
    id: "section_08",
    title: "第8部分：符合性声明",
    titleEn: "Section 8: Declaration of Conformity",
    documents: [
      {
        id: "doc_declaration",
        title: "欧盟符合性声明",
        titleEn: "EU Declaration of Conformity",
        moduleId: "section_08",
        annexReference: "MDR Annex IV",
        sections: [
          s("doc_manufacturer", "制造商信息", "Manufacturer Information"),
          s("doc_product", "产品标识", "Product Identification"),
          s("doc_classification", "器械分类", "Device Classification"),
          s("doc_conformity", "符合性声明正文", "Conformity Statement"),
          s("doc_standards", "适用标准", "Applied Standards"),
          s("doc_notified_body", "公告机构信息", "Notified Body Information"),
          s("doc_signature", "签署信息", "Signature Information"),
        ],
      },
    ],
  },
];

export function getAllDocuments(): DocumentDefinition[] {
  return mdrDocumentTemplates.flatMap((m) => m.documents);
}

export function getDocumentById(id: DocumentId): DocumentDefinition | undefined {
  return getAllDocuments().find((d) => d.id === id);
}

/** 统计信息 */
export const MDR_STATS = {
  sections: mdrDocumentTemplates.length,
  documents: getAllDocuments().length,
  totalSections: getAllDocuments().reduce((sum, d) => sum + d.sections.length, 0),
};
