/**
 * 法规事务部 — 类型定义
 * 基于 MDR (EU) 2017/745 Annex II & III
 */

export type RaMarket = "EU_MDR" | "US_FDA" | "CN_NMPA";
export type RaProjectStatus = "planning" | "in_progress" | "submitted" | "approved" | "archived";
export type DeviceClass = "I" | "IIa" | "IIb" | "III";
export type DeviceCategory = "non_invasive" | "invasive" | "active" | "special" | "software";

export const MARKET_LABELS: Record<RaMarket, string> = {
  EU_MDR: "欧盟 MDR",
  US_FDA: "美国 FDA",
  CN_NMPA: "中国 NMPA",
};

export const STATUS_LABELS: Record<RaProjectStatus, string> = {
  planning: "规划中",
  in_progress: "进行中",
  submitted: "已提交",
  approved: "已获批",
  archived: "已归档",
};

export const STATUS_COLORS: Record<RaProjectStatus, string> = {
  planning: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  archived: "bg-purple-100 text-purple-600",
};

// ==================== 文档结构 ====================

export type DocumentId =
  | "device_description"
  | "label_language" | "ifu" | "label_design"
  | "design_manufacturing"
  | "gspr_checklist" | "applied_standards"
  | "risk_plan" | "risk_report"
  | "biocompatibility" | "sterilization" | "performance_testing" | "shelf_life" | "transport_testing" | "usability"
  | "cep" | "cer" | "pms_plan" | "pmcf" | "psur"
  | "doc_declaration";

export type DocumentModuleId =
  | "section_01" | "section_02" | "section_03" | "section_04"
  | "section_05" | "section_06" | "section_07" | "section_08";

export interface DocumentSection {
  id: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  isFramework: boolean;
  aiGenerated: boolean;
  userEdited: boolean;
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

// ==================== 产品数据 ====================

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

export interface ProductData {
  manufacturer: ManufacturerInfo;
  identification: ProductIdentification;
  description: ProductDescription;
  technicalParams: TechnicalParameters;
}

export interface ClassificationResult {
  deviceCategory: DeviceCategory;
  deviceClass: DeviceClass;
  appliedRule: string;
  ruleDescription: string;
  compliancePath: string;
  riskLevel: "低" | "中低" | "中高" | "高";
}

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

export interface GSPRRequirement {
  id: string;
  chapter: number;
  section: string;
  clauseNumber: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  complianceStatus: "compliant" | "not_applicable" | "partially_compliant" | "non_compliant" | "pending";
  complianceStatement: string;
  evidenceDocuments: string;
  aiGenerated: boolean;
}

// ==================== 项目完整数据 ====================

export interface RaProjectData {
  id: number;
  name: string;
  market: RaMarket;
  status: RaProjectStatus;
  currentStep: number;
  productId?: number | null;
  ownerId?: number | null;
  createdBy?: number | null;
  classification?: ClassificationResult | null;
  technicalChars?: TechnicalCharacteristics | null;
  applicableStandards?: any[] | null;
  productData?: ProductData | null;
  gsprRequirements?: GSPRRequirement[] | null;
  documents?: DocumentDefinition[] | null;
  activeDocumentId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
