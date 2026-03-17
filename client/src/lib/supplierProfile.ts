export type SupplierProfileFormType =
  | "survey"
  | "annual_evaluation"
  | "quality_agreement";

export type SupplierProfileStatus = "draft" | "completed";

export interface SupplierOptionLite {
  id: number;
  code?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface SupplierProfileAttachment {
  id: string;
  name: string;
  path: string;
  size?: number;
  uploadedAt?: string;
}

export interface SupplierSurveyFormData {
  materialName: string;
  materialCategory: string;
  materialCode: string;
  contactPerson: string;
  position: string;
  phone: string;
  email: string;
  fax: string;
  businessAddress: string;
  businessPhone: string;
  factoryAddress: string;
  factoryPhone: string;
  principal: string;
  plantArea: string;
  employeeCount: string;
  registeredCapital: string;
  annualCapacity: string;
  supervisingDepartment: string;
  enterpriseNature: "manufacturer" | "agent" | "service" | "";
  businessQualification: string;
  businessScope: string;
  qualityResponsible: string;
  qualityPosition: string;
  qualityPhone: string;
  qualityEmail: string;
  qualityFax: string;
  mainTestingEquipment: string;
  productStandards: string;
  qualitySystemCertification: string;
  remarks: string;
  filledBy: string;
  filledDate: string;
  attachments: SupplierProfileAttachment[];
}

export interface SupplierAnnualEvaluationItem {
  id: string;
  date: string;
  materialName: string;
  materialCategory: string;
  unit: string;
  shouldQty: string;
  actualQty: string;
  qualityScore: string;
  deliveryScore: string;
  priceScore: string;
  serviceScore: string;
}

export interface SupplierAnnualEvaluationFormData {
  items: SupplierAnnualEvaluationItem[];
  remarks: string;
  result: "qualified" | "rectify" | "cancel" | "";
  resultOpinion: string;
  preparedBy: string;
  reviewedBy: string;
}

export interface SupplierQualityAgreementFormData {
  signDate: string;
  contractNo: string;
  supplierAddress: string;
  supplierLegalRepresentative: string;
  supplierContact: string;
  supplierPhone: string;
  supplierStampName: string;
}

export type SupplierProfileFormData =
  | SupplierSurveyFormData
  | SupplierAnnualEvaluationFormData
  | SupplierQualityAgreementFormData;

export interface SupplierProfileRecord {
  id: number;
  recordNo: string;
  supplierId: number;
  supplierName: string;
  formType: SupplierProfileFormType;
  templateCode: string;
  serialNo?: string;
  title: string;
  yearLabel?: string;
  status: SupplierProfileStatus;
  formData: SupplierProfileFormData;
  createdAt?: string;
  updatedAt?: string;
}

export const SUPPLIER_PROFILE_FORM_LABELS: Record<
  SupplierProfileFormType,
  string
> = {
  survey: "供应商调查表",
  annual_evaluation: "供应商年度评价表",
  quality_agreement: "质量保证协议",
};

export const SUPPLIER_PROFILE_TEMPLATE_CODES: Record<
  SupplierProfileFormType,
  string
> = {
  survey: "QT/QP12-01",
  annual_evaluation: "QT/QP12-06",
  quality_agreement: "QT/QP12-13",
};

export const SUPPLIER_PROFILE_STATUS_LABELS: Record<
  SupplierProfileStatus,
  string
> = {
  draft: "草稿",
  completed: "已完成",
};

export function createEmptySurveyFormData(
  supplier?: SupplierOptionLite
): SupplierSurveyFormData {
  return {
    materialName: "",
    materialCategory: "",
    materialCode: "",
    contactPerson: supplier?.contactPerson || "",
    position: "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    fax: "",
    businessAddress: supplier?.address || "",
    businessPhone: supplier?.phone || "",
    factoryAddress: supplier?.address || "",
    factoryPhone: supplier?.phone || "",
    principal: "",
    plantArea: "",
    employeeCount: "",
    registeredCapital: "",
    annualCapacity: "",
    supervisingDepartment: "",
    enterpriseNature: "",
    businessQualification: "",
    businessScope: "",
    qualityResponsible: "",
    qualityPosition: "",
    qualityPhone: "",
    qualityEmail: "",
    qualityFax: "",
    mainTestingEquipment: "",
    productStandards: "",
    qualitySystemCertification: "",
    remarks: "",
    filledBy: "",
    filledDate: new Date().toISOString().slice(0, 10),
    attachments: [],
  };
}

export function createEmptyAnnualEvaluationItem(): SupplierAnnualEvaluationItem {
  return {
    id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: "",
    materialName: "",
    materialCategory: "",
    unit: "",
    shouldQty: "",
    actualQty: "",
    qualityScore: "",
    deliveryScore: "",
    priceScore: "",
    serviceScore: "",
  };
}

export function createEmptyAnnualEvaluationFormData(): SupplierAnnualEvaluationFormData {
  return {
    items: [createEmptyAnnualEvaluationItem()],
    remarks: "",
    result: "",
    resultOpinion: "",
    preparedBy: "",
    reviewedBy: "",
  };
}

export function createEmptyQualityAgreementFormData(
  supplier?: SupplierOptionLite
): SupplierQualityAgreementFormData {
  return {
    signDate: new Date().toISOString().slice(0, 10),
    contractNo: "",
    supplierAddress: supplier?.address || "",
    supplierLegalRepresentative: "",
    supplierContact: supplier?.contactPerson || "",
    supplierPhone: supplier?.phone || "",
    supplierStampName: supplier?.name || "",
  };
}

export function createEmptySupplierProfileFormData(
  formType: SupplierProfileFormType,
  supplier?: SupplierOptionLite
): SupplierProfileFormData {
  switch (formType) {
    case "survey":
      return createEmptySurveyFormData(supplier);
    case "annual_evaluation":
      return createEmptyAnnualEvaluationFormData();
    case "quality_agreement":
      return createEmptyQualityAgreementFormData(supplier);
    default:
      return createEmptySurveyFormData(supplier);
  }
}

export function normalizeSupplierProfileFormData(
  formType: SupplierProfileFormType,
  value: any,
  supplier?: SupplierOptionLite
): SupplierProfileFormData {
  const fallback = createEmptySupplierProfileFormData(formType, supplier);
  if (!value || typeof value !== "object") return fallback;
  if (formType === "annual_evaluation") {
    const items = Array.isArray(value.items)
      ? value.items.map((item: any) => ({
          ...createEmptyAnnualEvaluationItem(),
          ...item,
          id:
            item?.id ||
            `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }))
      : createEmptyAnnualEvaluationFormData().items;
    return {
      ...(fallback as SupplierAnnualEvaluationFormData),
      ...value,
      items,
    };
  }
  if (formType === "survey") {
    return {
      ...(fallback as SupplierSurveyFormData),
      ...value,
      attachments: Array.isArray(value.attachments) ? value.attachments : [],
    };
  }
  return {
    ...(fallback as any),
    ...value,
  };
}

export function getAnnualEvaluationItemTotal(
  item: SupplierAnnualEvaluationItem
) {
  return (
    Number(item.qualityScore || 0) +
    Number(item.deliveryScore || 0) +
    Number(item.priceScore || 0) +
    Number(item.serviceScore || 0)
  );
}

export function getAnnualEvaluationAverage(
  formData: SupplierAnnualEvaluationFormData
) {
  if (!formData.items.length) return 0;
  const total = formData.items.reduce(
    (sum, item) => sum + getAnnualEvaluationItemTotal(item),
    0
  );
  return total / formData.items.length;
}
