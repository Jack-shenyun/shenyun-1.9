/**
 * CE 技术文件生成器 — 共享类型定义
 * 产品数据模型、分类规则、文件结构
 */

// ==================== 产品分类 ====================

export type DeviceCategory = "non_invasive" | "invasive" | "active" | "special" | "software";

export type DeviceClass = "I" | "IIa" | "IIb" | "III";

export type ClassificationRule =
  | "Rule 1" | "Rule 2" | "Rule 3" | "Rule 4" | "Rule 5"
  | "Rule 6" | "Rule 7" | "Rule 8" | "Rule 9" | "Rule 10"
  | "Rule 11" | "Rule 12" | "Rule 13" | "Rule 14" | "Rule 15"
  | "Rule 16" | "Rule 17" | "Rule 18" | "Rule 19" | "Rule 20"
  | "Rule 21" | "Rule 22";

export interface ClassificationResult {
  deviceCategory: DeviceCategory;
  deviceClass: DeviceClass;
  appliedRule: ClassificationRule;
  ruleDescription: string;
  compliancePath: string;
  riskLevel: "低" | "中低" | "中高" | "高";
}

// ==================== 技术特性 ====================

export interface TechnicalCharacteristics {
  hasSoftware: boolean;
  hasElectricalSafety: boolean;
  isSterile: boolean;
  sterilizationMethod?: string;
  hasBiocompatibility: boolean;
  hasCybersecurity: boolean;
  hasMeasuringFunction: boolean;
  isReusable: boolean;
  qmsIncludesDesign: boolean;
}

// ==================== 适用标准 ====================

export interface ApplicableStandard {
  id: string;
  number: string;
  title: string;
  titleEn: string;
  category: "通用" | "产品特定" | "过程" | "测试";
  mandatory: boolean;
  applicableWhen?: string;
}

// ==================== 产品信息 ====================

export interface ManufacturerInfo {
  companyName: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  website: string;
  euRepName: string;
  euRepAddress: string;
  euRepContact: string;
}

export interface ProductIdentification {
  tradeName: string;
  genericName: string;
  catalogNumber: string;
  modelNumber: string;
  udiDi: string;
  emdnCode: string;
  gmdn: string;
  version: string;
}

export interface ProductDescription {
  intendedPurpose: string;
  targetPopulation: string;
  indications: string;
  contraindications: string;
  workingPrinciple: string;
  components: string;
  accessories: string;
  packagingDescription: string;
}

export interface TechnicalParameters {
  dimensions: string;
  weight: string;
  materials: string;
  performanceSpecs: string;
  operatingConditions: string;
  storageConditions: string;
  shelfLife: string;
  powerRequirements: string;
}

export interface DesignManufacturing {
  designStage: string;
  manufacturingProcess: string;
  criticalProcesses: string;
  qualityControl: string;
  supplierManagement: string;
  productionSite: string;
}

export interface PredecessorInfo {
  hasPredecessor: boolean;
  predecessorName: string;
  equivalenceJustification: string;
  referenceDevice: string;
  clinicalDataAvailable: boolean;
}

export interface ProductData {
  manufacturer: ManufacturerInfo;
  identification: ProductIdentification;
  description: ProductDescription;
  technicalParams: TechnicalParameters;
  designManufacturing: DesignManufacturing;
  predecessor: PredecessorInfo;
}

// ==================== GSPR 检查表 ====================

export interface GSPRRequirement {
  id: string;
  chapter: number;
  section: string;
  clauseNumber: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  applicableCategories: DeviceCategory[];
  applicableClasses: DeviceClass[];
  complianceStatus: "compliant" | "not_applicable" | "partially_compliant" | "non_compliant" | "pending";
  complianceStatement: string;
  evidenceDocuments: string;
  aiGenerated: boolean;
}

// ==================== 文件结构（8 大类） ====================

/** 文件 ID — 对应真实 CE 技术文件结构 */
export type DocumentId =
  // Section 1: 器械描述与规范
  | "device_description"
  // Section 2: 制造商提供的信息
  | "label_language"
  | "ifu"
  | "label_design"
  // Section 3: 设计与制造信息
  | "design_manufacturing"
  // Section 4: GSPR 与适用标准
  | "gspr_checklist"
  | "applied_standards"
  // Section 5: 受益-风险分析与风险管理
  | "risk_plan"
  | "risk_report"
  // Section 6: 临床前信息
  | "biocompatibility"
  | "sterilization"
  | "performance_testing"
  | "shelf_life"
  | "transport_testing"
  | "usability"
  // Section 7: 临床评价
  | "cep"
  | "cer"
  | "pms_plan"
  | "pmcf"
  | "psur"
  // Section 8: 符合性声明
  | "doc_declaration";

/** 文件模块 ID — 8 大类 */
export type DocumentModuleId =
  | "section_01"  // 器械描述与规范
  | "section_02"  // 制造商提供的信息
  | "section_03"  // 设计与制造信息
  | "section_04"  // GSPR 与适用标准
  | "section_05"  // 受益-风险分析与风险管理
  | "section_06"  // 临床前信息
  | "section_07"  // 临床评价
  | "section_08"; // 符合性声明

export interface DocumentSection {
  id: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  isFramework: boolean;  // 法规框架，不可修改
  aiGenerated: boolean;  // AI 生成的内容
  userEdited: boolean;   // 用户编辑过
  lastModified?: number;
}

export interface DocumentDefinition {
  id: DocumentId;
  title: string;
  titleEn: string;
  moduleId: DocumentModuleId;
  annexReference: string;
  sections: DocumentSection[];
}

export interface DocumentModule {
  id: DocumentModuleId;
  title: string;
  titleEn: string;
  documents: DocumentDefinition[];
}

// ==================== Store 状态 ====================

export type WizardStep = 1 | 2 | 3;

export interface ProductStore {
  // 当前步骤
  currentStep: WizardStep;
  setCurrentStep: (step: WizardStep) => void;

  // 分类结果
  classification: ClassificationResult | null;
  setClassification: (result: ClassificationResult) => void;

  // 技术特性
  technicalChars: TechnicalCharacteristics;
  setTechnicalChars: (chars: Partial<TechnicalCharacteristics>) => void;

  // 适用标准
  applicableStandards: ApplicableStandard[];
  setApplicableStandards: (standards: ApplicableStandard[]) => void;

  // 产品信息
  productData: ProductData;
  updateProductData: <K extends keyof ProductData>(section: K, data: Partial<ProductData[K]>) => void;

  // GSPR 检查表
  gsprRequirements: GSPRRequirement[];
  setGsprRequirements: (reqs: GSPRRequirement[]) => void;
  updateGsprRequirement: (id: string, update: Partial<GSPRRequirement>) => void;

  // 文件
  documents: DocumentDefinition[];
  setDocuments: (docs: DocumentDefinition[]) => void;
  updateDocumentSection: (docId: DocumentId, sectionId: string, update: Partial<DocumentSection>) => void;

  // 当前选中的文件
  activeDocumentId: DocumentId | null;
  setActiveDocumentId: (id: DocumentId | null) => void;

  // 重置
  reset: () => void;
}
