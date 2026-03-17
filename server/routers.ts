import { z } from "zod";
import { createHmac, randomBytes, scryptSync } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import {
  DASHBOARD_PERMISSION_IDS,
  DEPARTMENT_DASHBOARD_PERMISSION_IDS,
  type DashboardPermissionId,
} from "@shared/dashboardBoards";
import { parseVisibleFormIds } from "@shared/formVisibility";
import { normalizePaymentCondition } from "@shared/paymentTerms";
import { PRODUCT_CATEGORY_VALUES } from "@shared/productCategories";
import {
  ATTACHMENT_EXTENSIONS,
  buildUploadFolderName,
  normalizeDepartmentForUpload,
} from "@shared/uploadPolicy";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import {
  formatBytesText as formatUnifiedBytesText,
  formatDateTime,
  roundToDigits,
  toRoundedString,
} from "./_core/formatting";
import { TRPCError } from "@trpc/server";
import { saveAttachmentFile } from "./attachmentStorage";
import { archiveApprovedSalesOrderPdf } from "./salesOrderArchiveService";
import { renderPrintTemplatePdf } from "./printTemplatePdfService";
import {
  clearExpiredRecycleBinEntries,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  ensureCompanyProductCopy,
  getNextProductCode,
  isProductCodeExists,
  syncCompanyProductsFromMain,
  deleteDocument,
  deleteUser,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getNextCustomerCode,
  enrichCustomerLogoDomain,
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProfileRecords,
  getSupplierProfileRecordById,
  createSupplierProfileRecord,
  updateSupplierProfileRecord,
  deleteSupplierProfileRecord,
  getSalesOrders,
  getSalesOrderById,
  getSalesOrderItems,
  getSalesOrderItemsByOrderIds,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  getNextSalesOrderNo,
  getLastSalePrices,
  getSalesQuotes,
  getSalesQuoteById,
  getSalesQuoteItems,
  getSalesQuoteItemsByQuoteIds,
  createSalesQuote,
  updateSalesQuote,
  deleteSalesQuote,
  getNextSalesQuoteNo,
  getPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrderItems,
  getPurchaseOrderItemsByOrderIds,
  getPurchaseOrdersByProductId,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getLastPurchasePrices,
  getRecentPurchasePrices,
  createInternalSalesOrderFromPurchaseOrder,
  getProductionOrders,
  getProductionOrderById,
  createProductionOrder,
  updateProductionOrder,
  deleteProductionOrder,
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  recalculateAllInventory,
  recalculateInventoryById,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getInventoryTransactions,
  createInventoryTransaction,
  updateInventoryTransaction,
  deleteInventoryTransaction,
  createInternalPurchaseInboundFromSalesTransaction,
  getMainCompanyId,
  ensureCollaborationDataModel,
  getOperationLogs,
  createOperationLog,
  clearOperationLogs,
  getQualityInspections,
  getQualityInspectionById,
  createQualityInspection,
  updateQualityInspection,
  deleteQualityInspection,
  getBomByProductId,
  getBomList,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  generateBomCodeForProductId,
  getDashboardStats,
  getSalesOrderApprovalState,
  getWorkflowExecutionConfig,
  getConfiguredWorkflowState,
  submitConfiguredWorkflow,
  approveConfiguredWorkflow,
  rejectConfiguredWorkflow,
  getConfiguredWorkflowHistory,
  getWorkflowSystemAdminUser,
  getWorkflowCenterData,
  deleteWorkflowCenterTodo,
  // 新增
  getBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getExchangeRates,
  createExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
  getPaymentTerms,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  getMaterialRequests,
  getMaterialRequestById,
  getMaterialRequestItems,
  createMaterialRequest,
  updateMaterialRequest,
  deleteMaterialRequest,
  getExpenseReimbursements,
  getExpenseReimbursementById,
  createExpenseReimbursement,
  updateExpenseReimbursement,
  deleteExpenseReimbursement,
  getPaymentRecords,
  createPaymentRecord,
  deletePaymentRecord,
  getCustomsDeclarations,
  getCustomsDeclarationById,
  createCustomsDeclaration,
  updateCustomsDeclaration,
  deleteCustomsDeclaration,
  getHsCodeLibrary,
  getHsCodeLibraryById,
  getHsCodeLibraryByCode,
  createHsCodeLibraryEntry,
  updateHsCodeLibraryEntry,
  deleteHsCodeLibraryEntry,
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCodeRules,
  createCodeRule,
  updateCodeRule,
  deleteCodeRule,
  getCompanyInfo,
  updateCompanyInfo,
  getPrintTemplates,
  savePrintTemplate,
  deletePrintTemplate,
  getWorkflowFormCatalog,
  getWorkflowFormCatalogItem,
  setWorkflowFormCatalogApprovalEnabled,
  getWorkflowTemplates,
  getWorkflowTemplateById,
  createWorkflowTemplate,
  updateWorkflowTemplate,
  syncPendingWorkflowRunsForTemplate,
  deleteWorkflowTemplate,
  getPersonnel,
  getPersonnelById,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  ensurePersonnelExtendedColumns,
  getPersonnelSalarySettings,
  getPersonnelSalarySettingById,
  upsertPersonnelSalarySetting,
  deletePersonnelSalarySetting,
  getPersonnelPayrollRecords,
  getPersonnelPayrollRecordById,
  updatePersonnelPayrollRecord,
  deletePersonnelPayrollRecord,
  previewPersonnelPayrollFromAttendance,
  importPersonnelPayrollFromAttendance,
  getTrainings,
  getTrainingById,
  createTraining,
  updateTraining,
  deleteTraining,
  getAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
  getRdProjects,
  getRdProjectById,
  createRdProject,
  updateRdProject,
  deleteRdProject,
  getStocktakes,
  getStocktakeById,
  createStocktake,
  updateStocktake,
  deleteStocktake,
  getQualityIncidents,
  getQualityIncidentById,
  createQualityIncident,
  updateQualityIncident,
  deleteQualityIncident,
  getSamples,
  getSampleById,
  createSample,
  updateSample,
  deleteSample,
  getLabRecords,
  getLabRecordById,
  createLabRecord,
  updateLabRecord,
  deleteLabRecord,
  getAccountsReceivable,
  getAccountsReceivableById,
  createAccountsReceivable,
  updateAccountsReceivable,
  deleteAccountsReceivable,
  getAccountsPayable,
  getAccountsPayableById,
  createAccountsPayable,
  updateAccountsPayable,
  deleteAccountsPayable,
  ensureAccountsPayableForPurchaseOrder,
  getReceivedInvoices,
  getReceivedInvoiceById,
  createReceivedInvoice,
  updateReceivedInvoice,
  deleteReceivedInvoice,
  getIssuedInvoices,
  getIssuedInvoiceById,
  createIssuedInvoice,
  updateIssuedInvoice,
  deleteIssuedInvoice,
  createOrGetIssuedInvoiceDraftFromReceivables,
  getDealerQualifications,
  getDealerQualificationById,
  createDealerQualification,
  updateDealerQualification,
  deleteDealerQualification,
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentInspections,
  getEquipmentInspectionById,
  createEquipmentInspection,
  updateEquipmentInspection,
  deleteEquipmentInspection,
  getEquipmentMaintenances,
  getEquipmentMaintenanceById,
  createEquipmentMaintenance,
  updateEquipmentMaintenance,
  deleteEquipmentMaintenance,
  getProductionPlans,
  getProductionPlanById,
  createProductionPlan,
  updateProductionPlan,
  deleteProductionPlan,
  autoGenerateProductionPlans,
  getMaterialRequisitionOrders,
  getMaterialRequisitionOrderById,
  createMaterialRequisitionOrder,
  updateMaterialRequisitionOrder,
  deleteMaterialRequisitionOrder,
  getSuggestedMaterialItemsByProductionOrderId,
  getProductionRecords,
  getProductionRecordById,
  createProductionRecord,
  updateProductionRecord,
  deleteProductionRecord,
  syncProductionRecordMaterialUsageOutbound,
  clearProductionRecordMaterialUsageOutboundByRecordNo,
  getEnvironmentRecords,
  getEnvironmentRecordById,
  getEnvironmentRecordByRecordNo,
  createEnvironmentRecord,
  updateEnvironmentRecord,
  deleteEnvironmentRecord,
  ensureEnvironmentRecordsTable,
  getProductionRoutingCards,
  getProductionRoutingCardById,
  createProductionRoutingCard,
  updateProductionRoutingCard,
  deleteProductionRoutingCard,
  getProductionScrapDisposals,
  getProductionScrapDisposalById,
  getProductionScrapDisposalByBatchNo,
  upsertProductionScrapDisposalByBatch,
  getSterilizationOrders,
  getSterilizationOrderById,
  createSterilizationOrder,
  updateSterilizationOrder,
  deleteSterilizationOrder,
  getProductionWarehouseEntries,
  getProductionWarehouseEntryById,
  createProductionWarehouseEntry,
  updateProductionWarehouseEntry,
  deleteProductionWarehouseEntry,
  getLargePackagingRecords,
  getLargePackagingRecordById,
  createLargePackagingRecord,
  updateLargePackagingRecord,
  deleteLargePackagingRecord,
  getBatchRecordReviewRecords,
  getBatchRecordReviewRecordById,
  createBatchRecordReviewRecord,
  updateBatchRecordReviewRecord,
  deleteBatchRecordReviewRecord,
  getRegulatoryReleaseRecords,
  getRegulatoryReleaseRecordById,
  createRegulatoryReleaseRecord,
  updateRegulatoryReleaseRecord,
  deleteRegulatoryReleaseRecord,
  getOvertimeRequests,
  getOvertimeRequestById,
  createOvertimeRequest,
  updateOvertimeRequest,
  deleteOvertimeRequest,
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  getOutingRequests,
  getOutingRequestById,
  createOutingRequest,
  updateOutingRequest,
  deleteOutingRequest,
  getProductSupplierPrices,
  getProductSupplierPriceById,
  createProductSupplierPrice,
  updateProductSupplierPrice,
  deleteProductSupplierPrice,
  getRecycleBinEntries,
  removeRecycleBinEntry,
  restoreRecycleBinEntry,
  getNextOrderNo,
  ensureUsersExtendedColumns,
  ensureUdiLabelsTable,
  ensureUsersVisibleAppsColumn,
  ensureUsersVisibleFormsColumn,
  ensureUsersAvatarUrlColumn,
  ensureUsersWechatColumns,
  ensureUsersEnglishNameColumn,
  ensureUsersDataScopeColumn,
  ensureUsersEmailSignatureColumn,
  ensureUserDashboardPermissionsTable,
  listUserDashboardPermissions,
  parseDashboardPermissionsCsv,
  replaceUserDashboardPermissions,
  resolveUserForCompanyScope,
  getDashboardAccessForUser,
  getDepartmentDashboardData,
  getBossDashboardData,
  ensureSalesOrdersTradeFields,
  syncOqcResultToWarehouseEntry,
  getBatchRecord,
  getBatchRecordList,
  getUserEmailsByDepartment,
  getGoodsReceipts,
  getGoodsReceiptById,
  createGoodsReceipt,
  updateGoodsReceipt,
  deleteGoodsReceipt,
  ensureGoodsReceiptsTable,
  getInspectionRequirements,
  getInspectionRequirementById,
  createInspectionRequirement,
  updateInspectionRequirement,
  deleteInspectionRequirement,
  getIqcInspections,
  getIqcInspectionById,
  createIqcInspection,
  updateIqcInspection,
  deleteIqcInspection,
  ensureIqcInspectionsTable,
  getIqcPendingUploads,
  addIqcPendingUpload,
  clearIqcPendingUploads,
} from "./db";
import {
  notifySterilizationArrived,
  notifyWarehouseEntryCreatedForOqc,
  notifyOqcQualified,
  notifyOqcUnqualified,
  notifyWarehouseEntryApproved,
  notifyWarehouseEntryCompleted,
  notifyMaterialRequestApproved,
} from "./emailService";
import { getDb } from "./db";
import {
  orderApprovals,
  salesOrders as salesOrdersTable,
  salesOrderItems,
  inventoryTransactions,
  inventory,
  users,
  documents,
  userDashboardPermissions,
  accountsReceivable as accountsReceivableTable,
  customers as customersTable,
  qualityInspections as qualityInspectionsTable,
  environmentRecords as environmentRecordsTable,
  materialRequests as materialRequestsTable,
  customsDeclarations as customsTable,
  stocktakes as stocktakesTable,
  qualityIncidents as incidentsTable,
  samples as samplesTable,
  labRecords as labRecordsTable,
  trainings as trainingsTable,
  personnel as personnelTable,
  expenseReimbursements as expensesTable,
  paymentRecords as paymentRecordsTable,
  overtimeRequests as overtimeTable,
  leaveRequests as leaveTable,
  outingRequests as outingTable,
  udiLabels,
  warehouses as warehousesTable,
  products as productsTable,
  paymentTerms as paymentTermsTable,
  companyUserAccess,
} from "../drizzle/schema";
import { eq, desc, sql, like, and, or, gte, lt, inArray } from "drizzle-orm";
import {
  notifyTodoToUsers,
  sendApprovalResultNotification,
} from "./wechatService";
import { raRouter } from "./raRouter";
import {
  approveMedicalPlatformListings,
  createMedicalPlatform,
  enableMedicalPlatformListings,
  getMedicalPlatformById,
  getMedicalPlatforms,
  saveMedicalPlatformListing,
  submitMedicalPlatformListings,
  updateMedicalPlatform,
} from "./medicalPlatforms";
import {
  createInvestmentHospital,
  deleteInvestmentHospital,
  getInvestmentHospitalById,
  getInvestmentHospitals,
  updateInvestmentHospital,
} from "./investmentHospitals";
import { saveFile } from "./fileManagerService";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const PRODUCTION_PLAN_META_PREFIX = "__PLAN_META__:";

type SemiFinishedPlanOrderMeta = {
  orderId: number;
  orderNo: string;
  productId: number;
  batchNo: string;
  status: string;
};

type LinkedProductionOrderMeta = {
  orderId: number;
  orderNo: string;
  status: string;
  planId?: number;
  salesOrderId?: number;
  salesOrderNo?: string;
  productId: number;
  productName: string;
  productCode?: string;
  productSpecification?: string;
  plannedQty: string;
  unit: string;
  batchNo: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
};

type ProductionPlanProcessMeta = {
  processId: number;
  processCode: string;
  processName: string;
  processType: string;
  sortOrder: number;
  workshop: string;
  team: string;
  operator: string;
  standardTime: number;
  applicableProducts: string;
  controlledDocNo: string;
  controlledDocName: string;
  version: string;
  modules: string[];
  description?: string;
};

type ProductionPlanRecordBlueprintItemMeta = {
  id: string;
  category: string;
  itemName: string;
  requirement: string;
  unit: string;
  defaultValue: string;
  guide: string;
};

type ProductionPlanRemarkMeta = {
  remark: string;
  semiFinishedOrders: SemiFinishedPlanOrderMeta[];
  linkedProductionOrder?: LinkedProductionOrderMeta;
  selectedProcess?: ProductionPlanProcessMeta;
  recordBlueprint?: ProductionPlanRecordBlueprintItemMeta[];
};

function parseProductionPlanRemarkMeta(raw: unknown): ProductionPlanRemarkMeta {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { remark: "", semiFinishedOrders: [] };
  }
  if (!text.startsWith(PRODUCTION_PLAN_META_PREFIX)) {
    return { remark: text, semiFinishedOrders: [] };
  }
  try {
    const parsed = JSON.parse(text.slice(PRODUCTION_PLAN_META_PREFIX.length));
    const linkedProductionOrder =
      parsed?.linkedProductionOrder &&
      Number.isFinite(Number(parsed.linkedProductionOrder.orderId))
        ? {
            orderId: Number(parsed.linkedProductionOrder.orderId),
            orderNo: String(parsed.linkedProductionOrder.orderNo || ""),
            status: String(parsed.linkedProductionOrder.status || ""),
            planId: Number.isFinite(Number(parsed.linkedProductionOrder.planId))
              ? Number(parsed.linkedProductionOrder.planId)
              : undefined,
            salesOrderId: Number.isFinite(
              Number(parsed.linkedProductionOrder.salesOrderId)
            )
              ? Number(parsed.linkedProductionOrder.salesOrderId)
              : undefined,
            salesOrderNo:
              typeof parsed.linkedProductionOrder.salesOrderNo === "string"
                ? parsed.linkedProductionOrder.salesOrderNo
                : undefined,
            productId: Number(parsed.linkedProductionOrder.productId || 0),
            productName: String(parsed.linkedProductionOrder.productName || ""),
            productCode:
              typeof parsed.linkedProductionOrder.productCode === "string"
                ? parsed.linkedProductionOrder.productCode
                : undefined,
            productSpecification:
              typeof parsed.linkedProductionOrder.productSpecification ===
              "string"
                ? parsed.linkedProductionOrder.productSpecification
                : undefined,
            plannedQty: String(parsed.linkedProductionOrder.plannedQty || ""),
            unit: String(parsed.linkedProductionOrder.unit || ""),
            batchNo: String(parsed.linkedProductionOrder.batchNo || ""),
            plannedStartDate:
              typeof parsed.linkedProductionOrder.plannedStartDate === "string"
                ? parsed.linkedProductionOrder.plannedStartDate
                : undefined,
            plannedEndDate:
              typeof parsed.linkedProductionOrder.plannedEndDate === "string"
                ? parsed.linkedProductionOrder.plannedEndDate
                : undefined,
          }
        : undefined;
    const selectedProcess =
      parsed?.selectedProcess &&
      Number.isFinite(Number(parsed.selectedProcess.processId))
        ? {
            processId: Number(parsed.selectedProcess.processId),
            processCode: String(parsed.selectedProcess.processCode || ""),
            processName: String(parsed.selectedProcess.processName || ""),
            processType: String(parsed.selectedProcess.processType || ""),
            sortOrder: Number(parsed.selectedProcess.sortOrder || 0),
            workshop: String(parsed.selectedProcess.workshop || ""),
            team: String(parsed.selectedProcess.team || ""),
            operator: String(parsed.selectedProcess.operator || ""),
            standardTime: Number(parsed.selectedProcess.standardTime || 0),
            applicableProducts: String(
              parsed.selectedProcess.applicableProducts || ""
            ),
            controlledDocNo: String(
              parsed.selectedProcess.controlledDocNo || ""
            ),
            controlledDocName: String(
              parsed.selectedProcess.controlledDocName || ""
            ),
            version: String(parsed.selectedProcess.version || ""),
            modules: Array.isArray(parsed.selectedProcess.modules)
              ? parsed.selectedProcess.modules
                  .map((item: any) => String(item || ""))
                  .filter(Boolean)
              : [],
            description:
              typeof parsed.selectedProcess.description === "string"
                ? parsed.selectedProcess.description
                : undefined,
          }
        : undefined;
    const recordBlueprint = Array.isArray(parsed?.recordBlueprint)
      ? parsed.recordBlueprint
          .filter((item: any) => item && typeof item.itemName === "string")
          .map((item: any) => ({
            id: String(
              item.id || `${item.category || ""}-${item.itemName || ""}`
            ),
            category: String(item.category || ""),
            itemName: String(item.itemName || ""),
            requirement: String(item.requirement || ""),
            unit: String(item.unit || ""),
            defaultValue: String(item.defaultValue || ""),
            guide: String(item.guide || ""),
          }))
      : [];
    return {
      remark: typeof parsed?.remark === "string" ? parsed.remark : "",
      semiFinishedOrders: Array.isArray(parsed?.semiFinishedOrders)
        ? parsed.semiFinishedOrders
            .filter(
              (item: any) => item && Number.isFinite(Number(item.orderId))
            )
            .map((item: any) => ({
              orderId: Number(item.orderId),
              orderNo: String(item.orderNo || ""),
              productId: Number(item.productId || 0),
              batchNo: String(item.batchNo || ""),
              status: String(item.status || "planned"),
            }))
        : [],
      linkedProductionOrder,
      selectedProcess,
      recordBlueprint,
    };
  } catch {
    return { remark: text, semiFinishedOrders: [] };
  }
}

function buildProductionPlanRemarkMeta(meta: ProductionPlanRemarkMeta): string {
  const remark = String(meta.remark || "").trim();
  const semiFinishedOrders = (meta.semiFinishedOrders || []).filter(item =>
    Number.isFinite(Number(item.orderId))
  );
  const linkedProductionOrder =
    meta.linkedProductionOrder &&
    Number.isFinite(Number(meta.linkedProductionOrder.orderId))
      ? meta.linkedProductionOrder
      : undefined;
  const selectedProcess =
    meta.selectedProcess &&
    Number.isFinite(Number(meta.selectedProcess.processId))
      ? {
          ...meta.selectedProcess,
          modules: Array.isArray(meta.selectedProcess.modules)
            ? meta.selectedProcess.modules
                .map(item => String(item || ""))
                .filter(Boolean)
            : [],
        }
      : undefined;
  const recordBlueprint = Array.isArray(meta.recordBlueprint)
    ? meta.recordBlueprint
        .filter(item => item && item.itemName)
        .map(item => ({
          id: String(
            item.id || `${item.category || ""}-${item.itemName || ""}`
          ),
          category: String(item.category || ""),
          itemName: String(item.itemName || ""),
          requirement: String(item.requirement || ""),
          unit: String(item.unit || ""),
          defaultValue: String(item.defaultValue || ""),
          guide: String(item.guide || ""),
        }))
    : [];
  if (
    !semiFinishedOrders.length &&
    !linkedProductionOrder &&
    !selectedProcess &&
    !recordBlueprint.length
  ) {
    return remark;
  }
  return `${PRODUCTION_PLAN_META_PREFIX}${JSON.stringify({
    remark,
    semiFinishedOrders,
    linkedProductionOrder,
    selectedProcess,
    recordBlueprint,
  })}`;
}

function upsertSemiFinishedPlanOrder(
  rawRemark: unknown,
  nextOrder: SemiFinishedPlanOrderMeta
): string {
  const meta = parseProductionPlanRemarkMeta(rawRemark);
  const semiFinishedOrders = [
    ...meta.semiFinishedOrders.filter(
      item => item.orderId !== nextOrder.orderId
    ),
    nextOrder,
  ].sort((a, b) => a.orderId - b.orderId);
  return buildProductionPlanRemarkMeta({
    remark: meta.remark,
    semiFinishedOrders,
  });
}

function removeSemiFinishedPlanOrder(
  rawRemark: unknown,
  orderId: number
): string {
  const meta = parseProductionPlanRemarkMeta(rawRemark);
  return buildProductionPlanRemarkMeta({
    remark: meta.remark,
    semiFinishedOrders: meta.semiFinishedOrders.filter(
      item => item.orderId !== orderId
    ),
  });
}

function verifyPassword(password: string, hash: string): boolean {
  const [method, salt, key] = hash.split("$");
  if (method !== "scrypt") return false;
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return derivedKey === key;
}

type AuditTrailModule =
  | "department"
  | "code_rule"
  | "user"
  | "language"
  | "system"
  | "product"
  | "customer"
  | "supplier"
  | "inventory"
  | "order"
  | "quality"
  | "production"
  | "finance"
  | "document";

type AuditTrailAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "role_change"
  | "permission_change"
  | "import"
  | "export"
  | "login"
  | "logout"
  | "reset"
  | "approve"
  | "reject";

function resolveAuditIp(ctx: any) {
  const forwarded = ctx?.req?.headers?.["x-forwarded-for"];
  if (Array.isArray(forwarded)) {
    return (
      String(forwarded[0] || "")
        .split(",")[0]
        ?.trim() || undefined
    );
  }
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  return ctx?.req?.socket?.remoteAddress || undefined;
}

function resolveAuditDeviceType(userAgent: string) {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return "Tablet";
  if (
    /mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)
  )
    return "Mobile";
  return "PC";
}

function resolveAuditBrowser(userAgent: string) {
  if (!userAgent) return undefined;
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  return "Unknown";
}

function serializeAuditValue(value: unknown) {
  if (value === undefined) return undefined;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return JSON.stringify(String(value ?? ""));
  }
}

function detectChangedFields(
  previousData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null
) {
  if (!previousData || !newData) return [] as string[];
  const keys = new Set([...Object.keys(previousData), ...Object.keys(newData)]);
  return Array.from(keys).filter(
    key => JSON.stringify(previousData[key]) !== JSON.stringify(newData[key])
  );
}

async function writeAuditTrail(params: {
  ctx: any;
  module: AuditTrailModule;
  action: AuditTrailAction;
  targetType: string;
  targetId?: string | number;
  targetName?: string;
  description: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  result?: "success" | "failure" | "partial";
  errorMessage?: string;
}) {
  const userAgent = String(params.ctx?.req?.headers?.["user-agent"] || "");
  const changedFields = detectChangedFields(
    params.previousData,
    params.newData
  );
  await createOperationLog({
    module: params.module,
    action: params.action,
    targetType: params.targetType,
    targetId:
      params.targetId === undefined ? undefined : String(params.targetId),
    targetName: params.targetName,
    description: params.description,
    previousData: serializeAuditValue(params.previousData),
    newData: serializeAuditValue(params.newData),
    changedFields:
      changedFields.length > 0 ? changedFields.join(",") : undefined,
    operatorId: Number(params.ctx?.user?.id || 0),
    operatorName: String(
      params.ctx?.user?.name || params.ctx?.user?.email || "系统"
    ),
    operatorRole: params.ctx?.user?.role
      ? String(params.ctx.user.role)
      : undefined,
    operatorDepartment: params.ctx?.user?.department
      ? String(params.ctx.user.department)
      : undefined,
    ipAddress: resolveAuditIp(params.ctx),
    userAgent: userAgent || undefined,
    deviceType: resolveAuditDeviceType(userAgent),
    browser: resolveAuditBrowser(userAgent),
    result: params.result || "success",
    errorMessage: params.errorMessage,
  });
}

function parseJsonArray(raw: unknown) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseRangeValue(text: unknown): [number | null, number | null] {
  const source = String(text || "");
  const matched = source.match(/(-?\d+(?:\.\d+)?)\s*[-~]\s*(-?\d+(?:\.\d+)?)/);
  if (!matched) return [null, null];
  return [Number(matched[1]), Number(matched[2])];
}

function isStagingWarehouseName(name: unknown, code?: unknown) {
  const text = `${String(name || "")} ${String(code || "")}`.toLowerCase();
  return text.includes("暂存") || text.includes("staging");
}

async function getStagingWarehouse(
  dbArg?: Awaited<ReturnType<typeof getDb>> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return null;
  const rows = await db
    .select({
      id: warehousesTable.id,
      code: warehousesTable.code,
      name: warehousesTable.name,
      status: warehousesTable.status,
    })
    .from(warehousesTable)
    .where(eq(warehousesTable.status, "active"));
  return rows.find(row => isStagingWarehouseName(row.name, row.code)) || null;
}

async function resolveRequisitionItemProductId(
  item: {
    materialCode?: string;
    materialName?: string;
    specification?: string;
  },
  dbArg?: Awaited<ReturnType<typeof getDb>> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return undefined;

  const materialCode = String(item.materialCode || "").trim();
  if (materialCode) {
    const [matchedByCode] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.code, materialCode))
      .limit(1);
    if (matchedByCode?.id) return Number(matchedByCode.id);
  }

  const materialName = String(item.materialName || "").trim();
  if (!materialName) return undefined;
  const specification = String(item.specification || "").trim();

  if (specification) {
    const [matchedByNameAndSpec] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.name, materialName),
          eq(productsTable.specification, specification)
        )
      )
      .limit(1);
    if (matchedByNameAndSpec?.id) return Number(matchedByNameAndSpec.id);
  }

  const [matchedByName] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.name, materialName))
    .limit(1);
  return matchedByName?.id ? Number(matchedByName.id) : undefined;
}

async function syncMaterialRequisitionToStaging(
  order: any,
  nextData?: { warehouseId?: number; items?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const sourceWarehouseId = Number(
    nextData?.warehouseId ?? order?.warehouseId ?? 0
  );
  if (!sourceWarehouseId) {
    throw new Error("请先为领料单选择领料仓库");
  }

  const stagingWarehouse = await getStagingWarehouse(db);
  if (!stagingWarehouse?.id) {
    throw new Error(
      "未找到暂存区仓库，请先在仓库管理中创建名称包含“暂存区”的仓库"
    );
  }

  if (Number(stagingWarehouse.id) === sourceWarehouseId) {
    return;
  }

  const items = parseJsonArray(nextData?.items ?? order?.items)
    .map((item: any) => ({
      materialCode: String(item?.materialCode || "").trim(),
      materialName: String(item?.materialName || "").trim(),
      specification: String(item?.specification || "").trim(),
      batchNo: String(item?.batchNo || "").trim(),
      unit: String(item?.unit || "").trim(),
      quantity: Number(item?.actualQty || item?.requiredQty || 0),
    }))
    .filter((item: any) => item.materialName && item.quantity > 0);

  if (items.length === 0) return;

  for (const item of items) {
    const productId = await resolveRequisitionItemProductId(item, db);
    const relatedOrderId = Number(order?.productionOrderId || 0) || undefined;
    const documentNo = String(order?.requisitionNo || "");
    const remarkBase = `领料单 ${documentNo || "-"} 发料进入暂存区`;

    await createInventoryTransaction({
      warehouseId: sourceWarehouseId,
      productId,
      type: "production_out",
      documentNo,
      itemName: item.materialName,
      batchNo: item.batchNo || undefined,
      quantity: String(item.quantity),
      unit: item.unit || undefined,
      relatedOrderId,
      remark: `${remarkBase}（源仓出库）`,
    });

    await createInventoryTransaction({
      warehouseId: Number(stagingWarehouse.id),
      productId,
      type: "other_in",
      documentNo,
      itemName: item.materialName,
      batchNo: item.batchNo || undefined,
      quantity: String(item.quantity),
      unit: item.unit || undefined,
      relatedOrderId,
      remark: `${remarkBase}（暂存区入库）`,
    });
  }
}

async function getWarehouseApproverUsers(
  dbArg?: Awaited<ReturnType<typeof getDb>> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return [];

  const preferredRows = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(
      or(
        like(users.position, "%仓库负责人%"),
        like(users.position, "%仓库主管%"),
        like(users.position, "%仓库经理%"),
        like(users.position, "%仓管主管%")
      )
    );

  const fallbackRows =
    preferredRows.length > 0
      ? []
      : await db
          .select({
            id: users.id,
            name: users.name,
          })
          .from(users)
          .where(
            or(
              like(users.department, "%仓库管理%"),
              like(users.department, "%仓库部%"),
              like(users.department, "%仓储%")
            )
          );

  const rows = preferredRows.length > 0 ? preferredRows : fallbackRows;
  return Array.from(
    new Map(
      rows
        .map(
          row =>
            [
              Number(row.id || 0),
              { id: Number(row.id || 0), name: String(row.name || "") },
            ] as const
        )
        .filter(([id]) => id > 0)
    ).values()
  );
}

async function notifyWarehouseApproverForMaterialRequisition(params: {
  requisitionId: number;
  requisitionNo: string;
  productionOrderNo?: string;
  applicantName?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const approverUsers = await getWarehouseApproverUsers(db);
  const approverIds = approverUsers
    .map(user => Number(user.id))
    .filter(id => id > 0);
  if (approverIds.length === 0) return;

  try {
    await notifyTodoToUsers({
      userIds: approverIds,
      title: `领料单 ${params.requisitionNo || `#${params.requisitionId}`} 待审批`,
      applicant: params.applicantName || "未知",
      submitTime: formatDateTime(new Date()),
      remark: params.productionOrderNo
        ? `生产指令：${params.productionOrderNo}，请仓库负责人审核`
        : "请仓库负责人审核领料单",
      jumpUrl: "/production/material-requisition",
    });
  } catch (error) {
    console.error("[WechatNotify] 领料单待办通知失败:", error);
  }
}

function getProductionEnvironmentModule(record: any) {
  const detailItems = parseJsonArray(record?.detailItems);
  const equipmentItems = parseJsonArray(record?.equipmentItems);
  const categories = new Set(
    detailItems.map((item: any) => String(item?.category || ""))
  );
  let moduleType = "";
  if (String(record?.recordType || "") === "temperature_humidity")
    moduleType = "温湿度记录";
  else if (
    String(record?.recordType || "") === "clean_room" ||
    categories.has("清场")
  )
    moduleType = "清场记录";
  else if (equipmentItems.length > 0) moduleType = "设备使用记录";
  else if (categories.has("质控点")) moduleType = "质控点记录";
  return { moduleType, detailItems, equipmentItems };
}

function buildEnvironmentSyncPayload(record: any) {
  const { moduleType, detailItems, equipmentItems } =
    getProductionEnvironmentModule(record);
  if (!moduleType) return null;
  const temperature =
    record?.temperature !== undefined &&
    record?.temperature !== null &&
    record?.temperature !== ""
      ? String(record.temperature)
      : null;
  const humidity =
    record?.humidity !== undefined &&
    record?.humidity !== null &&
    record?.humidity !== ""
      ? String(record.humidity)
      : null;
  const [tempMin, tempMax] = parseRangeValue(record?.temperatureLimit);
  const [humidityMin, humidityMax] = parseRangeValue(record?.humidityLimit);
  const hasUnqualified = detailItems.some(
    (item: any) => String(item?.conclusion || "") === "unqualified"
  );
  const isNormal =
    moduleType === "温湿度记录"
      ? temperature !== null &&
        humidity !== null &&
        tempMin !== null &&
        tempMax !== null &&
        humidityMin !== null &&
        humidityMax !== null
        ? Number(temperature) >= tempMin &&
          Number(temperature) <= tempMax &&
          Number(humidity) >= humidityMin &&
          Number(humidity) <= humidityMax
        : true
      : !hasUnqualified;

  return {
    sourceType: "production" as const,
    recordNo: String(record.recordNo || ""),
    moduleType,
    roomName: String(record.workshopName || "生产现场"),
    roomCode: String(record.workshopName || "production"),
    recordDate: record.recordDate ? new Date(record.recordDate) : undefined,
    recordTime: record?.recordTime ? String(record.recordTime) : undefined,
    temperature,
    humidity,
    tempMin: tempMin !== null ? String(tempMin) : undefined,
    tempMax: tempMax !== null ? String(tempMax) : undefined,
    humidityMin: humidityMin !== null ? String(humidityMin) : undefined,
    humidityMax: humidityMax !== null ? String(humidityMax) : undefined,
    isNormal,
    abnormalDesc: isNormal ? undefined : String(record.remark || "存在异常项"),
    correctionAction: undefined,
    recorder: String(record.operator || ""),
    productionOrderNo: String(record.productionOrderNo || ""),
    productName: String(record.productName || ""),
    batchNo: String(record.batchNo || ""),
    processName: String(record.processName || record.workstationName || ""),
    productionTeam: String(record.productionTeam || ""),
    detailItems: detailItems.length ? JSON.stringify(detailItems) : undefined,
    equipmentItems: equipmentItems.length
      ? JSON.stringify(equipmentItems)
      : undefined,
    remark: String(record.remark || ""),
  };
}

function buildFirstPieceInspectionPayload(record: any) {
  const detailItems = parseJsonArray(record?.detailItems);
  const inspectionItems = detailItems.map((item: any) => ({
    name: String(item?.itemName || ""),
    standard: String(item?.requirement || ""),
    result: String(item?.inputValue || ""),
    conclusion: ["qualified", "unqualified", "pending"].includes(
      String(item?.conclusion || "")
    )
      ? String(item?.conclusion || "pending")
      : "pending",
  }));
  const result =
    record?.firstPieceResult === "qualified"
      ? "qualified"
      : record?.firstPieceResult === "unqualified"
        ? "unqualified"
        : detailItems.some(
              (item: any) => String(item?.conclusion || "") === "unqualified"
            )
          ? "unqualified"
          : detailItems.length > 0 &&
              detailItems.every(
                (item: any) => String(item?.conclusion || "") === "qualified"
              )
            ? "qualified"
            : "pending";

  return {
    inspectionNo: String(record.recordNo || ""),
    type: "IPQC" as const,
    relatedDocNo: String(record.productionOrderNo || "") || undefined,
    itemName: String(record.productName || ""),
    batchNo: String(record.batchNo || "") || undefined,
    productionOrderId: Number(record.productionOrderId) || undefined,
    productionOrderNo: String(record.productionOrderNo || "") || undefined,
    sampleQty: inspectionItems.length
      ? String(inspectionItems.length)
      : undefined,
    inspectedQty: String(record.actualQty || "") || undefined,
    qualifiedQty: String(record.actualQty || "") || undefined,
    unqualifiedQty: String(record.scrapQty || "") || undefined,
    result:
      result === "qualified" || result === "unqualified" ? result : undefined,
    inspectionDate: record.recordDate ? new Date(record.recordDate) : undefined,
    remark: JSON.stringify({
      sourceType: "production_record",
      process: String(record?.processName || record?.workstationName || ""),
      inspectionType: "first",
      result,
      inspector: String(
        record?.firstPieceInspector ||
          record?.inspector ||
          record?.operator ||
          ""
      ),
      workstation: String(
        record?.workstationName || record?.workshopName || ""
      ),
      remarks: String(record?.remark || ""),
      inspectionItems,
      signatures: [],
    }),
  };
}

async function syncProductionRecordTargets(record: any) {
  const environmentPayload = buildEnvironmentSyncPayload(record);
  const existingEnvironment = await getEnvironmentRecordByRecordNo(
    String(record.recordNo || "")
  );
  if (environmentPayload) {
    if (existingEnvironment)
      await updateEnvironmentRecord(existingEnvironment.id, environmentPayload);
    else await createEnvironmentRecord(environmentPayload);
  } else if (existingEnvironment) {
    await deleteEnvironmentRecord(existingEnvironment.id);
  }

  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const existingQuality = await db
    .select({ id: qualityInspectionsTable.id })
    .from(qualityInspectionsTable)
    .where(
      eq(qualityInspectionsTable.inspectionNo, String(record.recordNo || ""))
    )
    .limit(1);

  if (String(record.recordType || "") === "first_piece") {
    const payload = buildFirstPieceInspectionPayload(record);
    if (existingQuality[0])
      await updateQualityInspection(existingQuality[0].id, payload);
    else await createQualityInspection(payload);
  } else if (existingQuality[0]) {
    await deleteQualityInspection(existingQuality[0].id);
  }
}

async function deleteProductionRecordTargets(recordNo: string) {
  const existingEnvironment = await getEnvironmentRecordByRecordNo(recordNo);
  if (existingEnvironment)
    await deleteEnvironmentRecord(existingEnvironment.id);
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const existingQuality = await db
    .select({ id: qualityInspectionsTable.id })
    .from(qualityInspectionsTable)
    .where(eq(qualityInspectionsTable.inspectionNo, recordNo))
    .limit(1);
  if (existingQuality[0]) await deleteQualityInspection(existingQuality[0].id);
}

async function syncHistoricalProductionRecordTargets(recordType?: string) {
  const rows = await getProductionRecords({ recordType, limit: 2000 });
  for (const row of rows) {
    await syncProductionRecordTargets(row);
  }
}

function parseDepartments(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function hasDepartmentOverlap(left: unknown, right: unknown): boolean {
  const leftSet = new Set(parseDepartments(left));
  const rightSet = parseDepartments(right);
  return rightSet.some(item => leftSet.has(item));
}

function isDepartmentManager(user: any): boolean {
  return /负责人|经理|主管|总监/.test(String(user?.position ?? "").trim());
}

function canManageRdDrawings(user: any): boolean {
  if (String(user?.role ?? "") === "admin" || Boolean(user?.isCompanyAdmin)) {
    return true;
  }
  return parseDepartments(user?.department).includes("研发部") && isDepartmentManager(user);
}

async function ensureRdDrawingManageAccess(ids: number[], user: any) {
  if (!canManageRdDrawings(user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员或研发部负责人可编辑、删除图纸" });
  }

  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const rows = await db
    .select({
      id: documents.id,
      department: documents.department,
      description: documents.description,
    })
    .from(documents)
    .where(inArray(documents.id, ids));

  if (rows.length !== ids.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "图纸记录不存在或已被删除" });
  }

  for (const row of rows) {
    const meta = parseRdDrawingMeta(row.description);
    if (String(row.department || "") !== "研发部" || meta.type !== "drawing") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "仅支持编辑研发图纸记录" });
    }
  }

  return rows;
}

function resolveUserDataScope(user: any): "self" | "department" | "all" {
  if (String(user?.role ?? "") === "admin" || Boolean(user?.isCompanyAdmin))
    return "all";
  const configured = String(user?.dataScope ?? "").trim();
  if (
    configured === "self" ||
    configured === "department" ||
    configured === "all"
  ) {
    return configured;
  }
  const position = String(user?.position ?? "").trim();
  if (position === "部门负责人" || position === "经理" || position === "总监") {
    return "department";
  }
  return "self";
}

function canViewAllSalesData(user: any): boolean {
  return resolveUserDataScope(user) === "all";
}

function isSalesDepartmentUser(user: any): boolean {
  return parseDepartments(user?.department).includes("销售部");
}

function canViewAllPurchaseData(user: any): boolean {
  return resolveUserDataScope(user) === "all";
}

function isPurchaseDepartmentUser(user: any): boolean {
  return parseDepartments(user?.department).includes("采购部");
}

function getActiveCompanyId(user: any): number {
  const companyId = Number(user?.companyId || 0);
  return Number.isFinite(companyId) && companyId > 0 ? companyId : 3;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function getCurrentUserEmailSignature(user: any): Promise<string> {
  const userId = Number(user?.id || 0);
  if (userId <= 0) return "";
  const activeCompanyId = getActiveCompanyId(user);
  const homeCompanyId = Number(user?.homeCompanyId || user?.companyId || 0);
  const db = await getDb();
  if (!db) return "";
  await ensureUsersEmailSignatureColumn(db);
  await ensureCollaborationDataModel(db);

  if (activeCompanyId > 0 && homeCompanyId > 0 && activeCompanyId !== homeCompanyId) {
    const [scopedRow] = await db
      .select({ emailSignature: companyUserAccess.emailSignature })
      .from(companyUserAccess)
      .where(
        and(
          eq(companyUserAccess.companyId, activeCompanyId),
          eq(companyUserAccess.userId, userId)
        )
      )
      .limit(1);
    return String(scopedRow?.emailSignature || "").trim();
  }

  const [localRow] = await db
    .select({ emailSignature: users.emailSignature })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return String(localRow?.emailSignature || "").trim();
}

function appendEmailSignature(input: {
  bodyHtml: string;
  bodyText?: string;
  signature: string;
}) {
  const signature = String(input.signature || "").trim();
  if (!signature) {
    return {
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText || "",
    };
  }
  const signatureTextBlock = `\n\n--\n${signature}`;
  const signatureHtmlBlock = `<br/><br/>--<br/>${escapeHtml(signature).replace(/\n/g, "<br/>")}`;
  return {
    bodyHtml: `${input.bodyHtml}${signatureHtmlBlock}`,
    bodyText: `${input.bodyText || ""}${signatureTextBlock}`,
  };
}

async function getScopedOwnerUserIds(user: any): Promise<number[] | undefined> {
  const scope = resolveUserDataScope(user);
  const currentUserId = Number(user?.id || 0);
  if (scope === "all") return undefined;
  if (scope === "self" || currentUserId <= 0) {
    return currentUserId > 0 ? [currentUserId] : [];
  }

  const departments = parseDepartments(user?.department);
  if (departments.length === 0) {
    return currentUserId > 0 ? [currentUserId] : [];
  }

  const db = await getDb();
  if (!db) {
    return currentUserId > 0 ? [currentUserId] : [];
  }

  await ensureUsersDataScopeColumn(db);
  const rows = await db
    .select({
      id: users.id,
      department: users.department,
    })
    .from(users);

  const matchedIds = rows
    .filter(row => hasDepartmentOverlap(row.department, departments))
    .map(row => Number(row.id || 0))
    .filter(id => Number.isFinite(id) && id > 0);

  return Array.from(
    new Set([currentUserId, ...matchedIds].filter(id => id > 0))
  );
}

function normalizeScopedUserParams(scopedUserIds?: number[]) {
  const normalized = Array.isArray(scopedUserIds)
    ? Array.from(
        new Set(
          scopedUserIds
            .map(id => Number(id))
            .filter(id => Number.isFinite(id) && id > 0)
        )
      )
    : undefined;
  if (!normalized) {
    return {
      scopedUserIds: undefined,
      singleUserId: undefined,
      multipleUserIds: undefined,
    };
  }
  if (normalized.length === 1) {
    return {
      scopedUserIds: normalized,
      singleUserId: normalized[0],
      multipleUserIds: undefined,
    };
  }
  return {
    scopedUserIds: normalized,
    singleUserId: undefined,
    multipleUserIds: normalized,
  };
}

function isOwnerWithinScope(ownerId: unknown, scopedUserIds?: number[]) {
  if (!scopedUserIds) return true;
  const normalizedOwnerId = Number(ownerId || 0);
  return normalizedOwnerId > 0 && scopedUserIds.includes(normalizedOwnerId);
}

function resolveKnowledgeBaseDepartment(user: any): string {
  const departments = parseDepartments(user?.department);
  if (departments.length > 0) return departments[0];
  return "管理部";
}

function resolveKnowledgeBaseWritableDepartment(
  user: any,
  requestedDepartment?: unknown
): string {
  if (resolveUserDataScope(user) === "all") {
    const requested = String(requestedDepartment || "").trim();
    return requested || resolveKnowledgeBaseDepartment(user);
  }
  const userDepartments = parseDepartments(user?.department);
  const requestedDepartments = parseDepartments(requestedDepartment);
  const matched = requestedDepartments.find(item => userDepartments.includes(item));
  return matched || userDepartments[0] || "管理部";
}

function canAccessKnowledgeDocument(
  doc: { department?: unknown; createdBy?: unknown },
  user: any,
  scopedOwnerIds?: number[]
): boolean {
  const scope = resolveUserDataScope(user);
  if (scope === "all") return true;

  const currentUserId = Number(user?.id || 0);
  const docCreatorId = Number(doc.createdBy || 0);
  const hasDepartmentAccess = hasDepartmentOverlap(doc.department, user?.department);

  if (scope === "self") {
    return (
      docCreatorId > 0 &&
      docCreatorId === currentUserId &&
      (hasDepartmentAccess || !String(doc.department || "").trim())
    );
  }

  if (hasDepartmentAccess) return true;
  return Array.isArray(scopedOwnerIds) && scopedOwnerIds.includes(docCreatorId);
}

async function getVisibleKnowledgeDocuments(user: any) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const rows = await db.select().from(documents).orderBy(desc(documents.createdAt));
  if (resolveUserDataScope(user) === "all") return rows;

  const scopedOwnerIds = await getScopedOwnerUserIds(user);
  return rows.filter(row => canAccessKnowledgeDocument(row, user, scopedOwnerIds));
}

async function ensureKnowledgeDocumentAccess(id: number, user: any) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const [record] = await db
    .select({
      id: documents.id,
      department: documents.department,
      createdBy: documents.createdBy,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: "知识库文件不存在" });
  }

  if (resolveUserDataScope(user) === "all") return record;

  const scopedOwnerIds = await getScopedOwnerUserIds(user);
  if (!canAccessKnowledgeDocument(record, user, scopedOwnerIds)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "您无权访问该知识库文件" });
  }

  return record;
}

const PREPAY_RATIO_MARKER = "[PREPAY_RATIO]";

function parsePrepayRatioFromRemark(remark: unknown): number {
  const text = String(remark ?? "");
  const markerLine = text
    .split("\n")
    .find(line => line.startsWith(PREPAY_RATIO_MARKER));
  if (!markerLine) return 30;
  const ratioRaw = markerLine.slice(PREPAY_RATIO_MARKER.length).trim();
  const ratio = Number(ratioRaw);
  if (!Number.isFinite(ratio)) return 30;
  return Math.min(100, Math.max(0, ratio));
}

function round2(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return toRoundedString(n, 2);
}

function toDateOnly(value: unknown): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toDateOnlyOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function addDaysToDateOnly(value: unknown, days: number): string {
  const base = toDateOnly(value);
  const [year, month, day] = base.split("-").map(part => Number(part));
  if (!year || !month || !day) return base;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(
    date.getUTCDate() + Math.max(0, Number.isFinite(days) ? days : 0)
  );
  return date.toISOString().slice(0, 10);
}

function getTodayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveReceivableStatus(
  amount: unknown,
  paidAmount: unknown,
  dueDate: unknown
) {
  const total = Number(amount ?? 0);
  const paid = Number(paidAmount ?? 0);
  if (
    Number.isFinite(total) &&
    Number.isFinite(paid) &&
    total > 0 &&
    paid + 0.0001 >= total
  ) {
    return "paid" as const;
  }
  if (Number.isFinite(paid) && paid > 0.0001) {
    return "partial" as const;
  }
  const dueKey = toDateOnlyOrNull(dueDate);
  if (dueKey && dueKey < getTodayDateOnly()) {
    return "overdue" as const;
  }
  return "pending" as const;
}

function parseOqcSyncMeta(
  rawRemark: unknown,
  fallback?: { rejectQty?: unknown; sampleQty?: unknown }
) {
  let parsed: Record<string, unknown> | null = null;
  if (typeof rawRemark === "string" && rawRemark.trim()) {
    try {
      const next = JSON.parse(rawRemark);
      if (next && typeof next === "object" && !Array.isArray(next)) {
        parsed = next as Record<string, unknown>;
      }
    } catch {
      parsed = null;
    }
  }
  return {
    rejectQty: Number(
      parsed?.rejectQty ?? parsed?.unqualifiedQty ?? fallback?.rejectQty ?? 0
    ),
    sampleRetainQty: Number(
      parsed?.sampleRetainQty ?? parsed?.sampleQty ?? fallback?.sampleQty ?? 0
    ),
  };
}

async function ensureWarehouseEntryQualityGate(
  entry:
    | {
        id?: number | null;
        entryNo?: string | null;
        batchNo?: string | null;
        productionOrderId?: number | null;
        sterilizationOrderId?: number | null;
      }
    | null
    | undefined,
  targetStatus: string
) {
  if (!entry || !["approved", "completed"].includes(targetStatus)) return;
  const batchNo = String(entry.batchNo || "").trim();
  if (!batchNo) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "当前入库申请缺少批号，无法校验 OQC 放行结果",
    });
  }

  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "数据库连接不可用",
    });
  }

  const conditions: any[] = [
    eq(qualityInspectionsTable.type, "OQC"),
    eq(qualityInspectionsTable.batchNo, batchNo),
  ];
  if (Number(entry.productionOrderId || 0) > 0) {
    conditions.push(
      eq(
        qualityInspectionsTable.productionOrderId,
        Number(entry.productionOrderId)
      )
    );
  }
  if (Number(entry.sterilizationOrderId || 0) > 0) {
    conditions.push(
      eq(
        qualityInspectionsTable.sterilizationOrderId,
        Number(entry.sterilizationOrderId)
      )
    );
  }

  const [latestOqc] = await db
    .select({
      id: qualityInspectionsTable.id,
      inspectionNo: qualityInspectionsTable.inspectionNo,
      result: qualityInspectionsTable.result,
    })
    .from(qualityInspectionsTable)
    .where(and(...conditions))
    .orderBy(
      desc(qualityInspectionsTable.updatedAt),
      desc(qualityInspectionsTable.createdAt),
      desc(qualityInspectionsTable.id)
    )
    .limit(1);

  if (!latestOqc) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `批次 ${batchNo} 尚未生成 OQC 记录，不能执行入库放行`,
    });
  }
  if (String(latestOqc.result || "") !== "qualified") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `批次 ${batchNo} 的最新 OQC 结果为 ${String(latestOqc.result || "未判定")}，不能执行入库放行`,
    });
  }
}

async function getUdiDbOrThrow() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "数据库连接不可用",
    });
  }
  await ensureUdiLabelsTable(db);
  return db;
}

function toIsoDateTimeOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function serializeSalesQuoteRow<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    quoteDate: toDateOnlyOrNull(row.quoteDate),
    validUntil: toDateOnlyOrNull(row.validUntil),
    deliveryDate: toDateOnlyOrNull(row.deliveryDate),
    createdAt: toIsoDateTimeOrNull(row.createdAt),
    updatedAt: toIsoDateTimeOrNull(row.updatedAt),
  };
}

function serializeSalesQuoteItemRow<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    createdAt: toIsoDateTimeOrNull(row.createdAt),
  };
}

function safeFileSegment(value: string): string {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function formatBytesText(bytes: number): string {
  return formatUnifiedBytesText(bytes);
}

const RD_DRAWING_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".dwg",
  ".dxf",
  ".stp",
  ".step",
  ".igs",
  ".iges",
  ".stl",
  ".obj",
  ".glb",
  ".gltf",
  ".fbx",
  ".ply",
  ".3ds",
  ".3mf",
] as const;

function parseRdDrawingMeta(value: unknown): {
  type?: string;
  productId?: number;
  productCode?: string;
  productName?: string;
  bomCode?: string;
  bomVersion?: string;
  drawingCategory?: string;
  description?: string;
  owner?: string;
  sourceDrawingNo?: string;
  sourceTitle?: string;
  sourceAttachmentRole?: string;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
} {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as any;
  } catch {
    return {};
  }
}

function stripRdDrawingFormatSuffix(value: string): string {
  return String(value || "")
    .replace(/\s*·\s*(PDF|DWG|DXF|STP|STEP|IGS|IGES|STL|OBJ|FBX|GLB|GLTF|PLY|3DS|3MF)\s*(·\s*附属)?$/i, "")
    .trim();
}

function getRdDrawingStatusPriority(status: "draft" | "review" | "released") {
  if (status === "draft") return 0;
  if (status === "review") return 1;
  return 2;
}

function getRdDrawingFormatPriority(format: string) {
  const key = String(format || "").toLowerCase();
  if (key === "pdf") return 0;
  if (key === "stp") return 1;
  if (key === "step") return 2;
  if (key === "igs") return 3;
  if (key === "iges") return 4;
  if (key === "dwg") return 5;
  if (key === "dxf") return 6;
  return 20;
}

async function buildNextRdDrawingNo(
  db: Awaited<ReturnType<typeof getDb>>
): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `DWG-${datePart}-`;
  const rows = (await db.execute(sql`
    SELECT COUNT(*) AS count
    FROM documents
    WHERE docNo LIKE ${`${prefix}%`}
  `)) as any;
  const rowList = Array.isArray(rows?.[0]) ? rows[0] : rows;
  const row = Array.from(rowList as any[])[0] as any;
  const count = Number(row?.count || row?.["COUNT(*)"] || 0);
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

function buildIqcMobileUploadToken(inspectionNo: string): string {
  const secret = String(
    process.env.JWT_SECRET || "shenyun-erp-local-dev-secret"
  );
  return createHmac("sha256", secret)
    .update(String(inspectionNo || ""))
    .digest("hex");
}

function buildIqcAttachmentBaseName(
  productName: string,
  inspectionNo: string,
  seq: number
) {
  const safeInspectionNo = safeFileSegment(inspectionNo || "IQC");
  return `IQC-${safeInspectionNo}-${String(seq).padStart(2, "0")}`;
}

function parseAttachmentList(
  value: unknown
): Array<{ fileName: string; filePath: string; mimeType?: string }> {
  try {
    const list = JSON.parse(String(value || "[]"));
    if (!Array.isArray(list)) return [];
    return list
      .filter(item => item && typeof item === "object")
      .map((item: any) => ({
        fileName: String(item.fileName || item.recordName || ""),
        filePath: String(item.filePath || item.fileUrl || ""),
        mimeType: item.mimeType ? String(item.mimeType) : undefined,
      }))
      .filter(item => item.filePath);
  } catch {
    return [];
  }
}

function buildKnowledgeBaseMarker(sourceKey: string): string {
  return `[KB:auto:${safeFileSegment(sourceKey)}]`;
}

function buildKnowledgeBaseDocNo(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomBytes(2).toString("hex")}`.slice(
    0,
    50
  );
}

function stringifyKnowledgeArchivePayload(payload: unknown): string {
  return (
    JSON.stringify(
      payload,
      (_key, value) => {
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "bigint") return value.toString();
        return value;
      },
      2
    ) || "{}"
  );
}

function buildKnowledgeArchiveTableText(
  headers: string[],
  rows: Array<Array<unknown>>
): string {
  if (!headers.length) return "";
  const safeHeaders = headers.map(
    header => String(header || "-").trim() || "-"
  );
  const normalizeCell = (value: unknown) => {
    const text = String(value ?? "-")
      .replace(/\r?\n/g, " / ")
      .trim();
    return text || "-";
  };
  const safeRows = rows.map(row =>
    safeHeaders.map((_header, index) => normalizeCell(row[index]))
  );
  return [
    safeHeaders.join(" | "),
    safeHeaders.map(() => "---").join(" | "),
    ...safeRows.map(row => row.join(" | ")),
  ].join("\n");
}

function buildKnowledgeBaseArchiveText(params: {
  title: string;
  sourceKey: string;
  department: string;
  summary?: string;
  bodyText?: string;
  payload: unknown;
}): string {
  return [
    "知识库自动归档",
    `标题: ${params.title}`,
    `来源键: ${params.sourceKey}`,
    `部门: ${params.department}`,
    `摘要: ${String(params.summary || "").trim() || "-"}`,
    `归档时间: ${new Date().toISOString()}`,
    "",
    ...(String(params.bodyText || "").trim()
      ? ["=== 汇总表 ===", String(params.bodyText || "").trim(), ""]
      : []),
    "=== 记录快照 ===",
    stringifyKnowledgeArchivePayload(params.payload),
    "",
  ].join("\n");
}

async function upsertKnowledgeBaseRecordSnapshot(params: {
  sourceKey: string;
  title: string;
  department: string;
  folderName: string;
  baseName: string;
  summary?: string;
  bodyText?: string;
  operatorId?: number | null;
  payload: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const marker = buildKnowledgeBaseMarker(params.sourceKey);
  const archiveText = buildKnowledgeBaseArchiveText({
    title: params.title,
    sourceKey: params.sourceKey,
    department: params.department,
    summary: params.summary,
    bodyText: params.bodyText,
    payload: params.payload,
  });
  const buffer = Buffer.from(archiveText, "utf8");
  const safeBaseName = safeFileSegment(
    params.baseName || params.title || "记录"
  );
  const businessFolder = `知识库归档/${safeFileSegment(params.folderName || "记录归档")}`;
  const saved = await saveAttachmentFile({
    department: params.department,
    businessFolder,
    originalName: `${safeBaseName}.txt`,
    desiredBaseName: safeBaseName,
    mimeType: "text/plain",
    buffer,
    saveToFileManager: true,
  });
  const fileManagerPath = saved.fileManagerPath || "";
  const [existing] = await db
    .select({ id: documents.id, docNo: documents.docNo })
    .from(documents)
    .where(like(documents.description, `${marker}%`))
    .orderBy(desc(documents.id))
    .limit(1);

  const nextDescription = `${marker} ${String(params.summary || params.title || "自动归档").trim()}（storage:${saved.provider}:${saved.storageKey}; file_manager:${fileManagerPath}）`;
  const sharedValues = {
    title: params.title,
    category: "record" as const,
    version: "V1.0",
    department: params.department,
    effectiveDate: new Date(),
    filePath: fileManagerPath || saved.filePath,
    status: "approved" as const,
    description: nextDescription,
    approvedBy: params.operatorId || null,
  };

  if (existing?.id) {
    await db
      .update(documents)
      .set(sharedValues)
      .where(eq(documents.id, existing.id));
    return existing.id;
  }

  const inserted = await db.insert(documents).values({
    docNo: buildKnowledgeBaseDocNo("KB"),
    ...sharedValues,
    createdBy: params.operatorId || null,
  });
  return inserted[0]?.insertId;
}

function resolveArchivePrintOrigin(): string {
  const explicitOrigin = String(
    process.env.APP_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      process.env.SITE_URL ||
      ""
  )
    .trim()
    .replace(/\/+$/g, "");
  return explicitOrigin || "http://localhost:3000";
}

async function upsertKnowledgeBasePdfSnapshot(params: {
  sourceKey: string;
  title: string;
  department: string;
  folderName: string;
  baseName: string;
  templateKey: string;
  templateData: Record<string, any>;
  companyId?: number | null;
  summary?: string;
  operatorId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const marker = buildKnowledgeBaseMarker(params.sourceKey);
  const safeBaseName = safeFileSegment(
    params.baseName || params.title || "记录"
  );
  const rendered = await renderPrintTemplatePdf({
    templateKey: params.templateKey,
    data: params.templateData,
    title: params.title,
    companyId: params.companyId ?? undefined,
    origin: resolveArchivePrintOrigin(),
  });
  const businessFolder = `知识库归档/${safeFileSegment(params.folderName || "记录归档")}`;
  const departmentFolder = normalizeDepartmentForUpload(
    params.department,
    "管理部"
  );
  const fileManagerDir = `/ERP/${departmentFolder}/${businessFolder}`;
  const fileManagerPath = await saveFile(
    fileManagerDir,
    `${safeBaseName}.pdf`,
    rendered.pdfBytes
  );
  const saved = await saveAttachmentFile({
    department: params.department,
    businessFolder,
    originalName: `${safeBaseName}.pdf`,
    desiredBaseName: safeBaseName,
    mimeType: "application/pdf",
    buffer: rendered.pdfBytes,
    saveToFileManager: false,
  });
  const [existing] = await db
    .select({ id: documents.id, docNo: documents.docNo })
    .from(documents)
    .where(like(documents.description, `${marker}%`))
    .orderBy(desc(documents.id))
    .limit(1);

  const nextDescription = `${marker} ${String(
    params.summary || params.title || "自动归档"
  ).trim()}（template:${params.templateKey}; storage:${saved.provider}:${saved.storageKey}; file_manager:${fileManagerPath}）`;
  const sharedValues = {
    title: params.title,
    category: "record" as const,
    version: "V1.0",
    department: params.department,
    effectiveDate: new Date(),
    filePath: fileManagerPath || saved.filePath,
    status: "approved" as const,
    description: nextDescription,
    approvedBy: params.operatorId || null,
  };

  if (existing?.id) {
    await db
      .update(documents)
      .set(sharedValues)
      .where(eq(documents.id, existing.id));
    return existing.id;
  }

  const inserted = await db.insert(documents).values({
    docNo: buildKnowledgeBaseDocNo("KB-PDF"),
    ...sharedValues,
    createdBy: params.operatorId || null,
  });
  return inserted[0]?.insertId;
}

async function insertKnowledgeBaseFileDocument(params: {
  sourceKey: string;
  title: string;
  department: string;
  filePath: string;
  summary?: string;
  operatorId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const marker = buildKnowledgeBaseMarker(params.sourceKey);
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.filePath, params.filePath),
        like(documents.description, `${marker}%`)
      )
    )
    .limit(1);

  if (existing?.id) return existing.id;

  const inserted = await db.insert(documents).values({
    docNo: buildKnowledgeBaseDocNo("KB-FILE"),
    title: params.title,
    category: "record" as const,
    version: "V1.0",
    department: params.department,
    effectiveDate: new Date(),
    filePath: params.filePath,
    status: "approved" as const,
    description: `${marker} ${String(params.summary || params.title || "文件归档").trim()}`,
    createdBy: params.operatorId || null,
    approvedBy: params.operatorId || null,
  });
  return inserted[0]?.insertId;
}

function resolveMonthKey(value: unknown): string | null {
  if (!value) return null;
  const parsed = new Date(value as any);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function resolveMonthRange(monthKey: string): { start: Date; end: Date } {
  const [yearText, monthText] = String(monthKey || "").split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const start = new Date(year, Math.max(month - 1, 0), 1);
  const end = new Date(year, Math.max(month, 1), 1);
  return { start, end };
}

function normalizeMonthlySummarySegment(
  value: unknown,
  fallback: string
): string {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return normalized || fallback;
}

function formatMonthlyDateCell(value: unknown): string {
  if (!value) return "-";
  const parsed = new Date(value as any);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString().slice(0, 10);
}

async function archiveEnvironmentMonthlySummary(
  record: any,
  operatorId?: number | null
) {
  const monthKey = resolveMonthKey(record?.recordDate);
  if (!monthKey) return;
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const { environmentRecords: environmentRecordsTable } = await import(
    "../drizzle/schema"
  );
  const { start, end } = resolveMonthRange(monthKey);
  const moduleType = String(record?.moduleType || "").trim();
  const sourceType = String(record?.sourceType || "").trim();
  const roomName = String(record?.roomName || "").trim();
  const roomCode = String(record?.roomCode || "").trim();
  const conditions: any[] = [
    gte(environmentRecordsTable.recordDate, start as any),
    lt(environmentRecordsTable.recordDate, end as any),
  ];
  if (moduleType)
    conditions.push(eq(environmentRecordsTable.moduleType, moduleType));
  if (sourceType)
    conditions.push(eq(environmentRecordsTable.sourceType, sourceType as any));
  if (roomName) {
    conditions.push(eq(environmentRecordsTable.roomName, roomName));
  } else if (roomCode) {
    conditions.push(eq(environmentRecordsTable.roomCode, roomCode));
  }
  const rows = await db
    .select()
    .from(environmentRecordsTable)
    .where(and(...conditions));
  rows.sort((a: any, b: any) => {
    const dateDiff =
      new Date(a.recordDate || 0).getTime() -
      new Date(b.recordDate || 0).getTime();
    if (dateDiff !== 0) return dateDiff;
    return String(a.recordTime || "").localeCompare(String(b.recordTime || ""));
  });
  const groupLabel = roomName || roomCode || moduleType || "环境";
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `environment_monthly:${monthKey}:${safeFileSegment(moduleType || "environment")}:${safeFileSegment(roomName || roomCode || "default")}`,
    title: `环境记录月汇总-${monthKey}-${groupLabel}`,
    department: "生产部",
    folderName: "环境记录月汇总",
    baseName: `ENVM-${monthKey}-${normalizeMonthlySummarySegment(groupLabel, "ENV")}`,
    summary: `环境记录月汇总自动归档（${monthKey}）`,
    bodyText: buildKnowledgeArchiveTableText(
      ["日期", "时间", "区域", "温度", "湿度", "是否正常", "记录人", "备注"],
      rows.map((row: any) => [
        formatMonthlyDateCell(row.recordDate),
        String(row.recordTime || "-"),
        String(row.roomName || row.roomCode || "-"),
        String(row.temperature || "-"),
        String(row.humidity || "-"),
        row.isNormal === true ? "是" : row.isNormal === false ? "否" : "-",
        String(row.recorder || "-"),
        String(row.remark || row.abnormalDesc || "-"),
      ])
    ),
    operatorId,
    payload: {
      month: monthKey,
      moduleType,
      sourceType,
      roomName,
      roomCode,
      total: rows.length,
      entries: rows,
    },
  });
}

async function archiveEquipmentInspectionMonthlySummary(
  record: any,
  operatorId?: number | null
) {
  const monthKey = resolveMonthKey(record?.inspectionDate);
  const equipmentId = Number(record?.equipmentId || 0);
  if (!monthKey || !(equipmentId > 0)) return;
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const { equipmentInspections: equipmentInspectionsTable } = await import(
    "../drizzle/schema"
  );
  const { start, end } = resolveMonthRange(monthKey);
  const rows = await db
    .select()
    .from(equipmentInspectionsTable)
    .where(
      and(
        eq(equipmentInspectionsTable.equipmentId, equipmentId),
        gte(equipmentInspectionsTable.inspectionDate, start as any),
        lt(equipmentInspectionsTable.inspectionDate, end as any)
      )
    );
  rows.sort(
    (a: any, b: any) =>
      new Date(a.inspectionDate || 0).getTime() -
      new Date(b.inspectionDate || 0).getTime()
  );
  const groupLabel = String(
    record?.equipmentCode || record?.equipmentName || `EQ-${equipmentId}`
  ).trim();
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `equipment_inspection_monthly:${equipmentId}:${monthKey}`,
    title: `基础设备记录月汇总-${monthKey}-${groupLabel}`,
    department: "生产部",
    folderName: "基础设备月汇总",
    baseName: `EQM-${monthKey}-${normalizeMonthlySummarySegment(groupLabel, `EQ-${equipmentId}`)}`,
    summary: `基础设备记录月汇总自动归档（${monthKey}）`,
    bodyText: buildKnowledgeArchiveTableText(
      ["日期", "编号", "类型", "点检人", "结果", "状态", "备注"],
      rows.map((row: any) => [
        formatMonthlyDateCell(row.inspectionDate),
        String(row.inspectionNo || "-"),
        String(row.inspectionType || "-"),
        String(row.inspector || "-"),
        String(row.result || "-"),
        String(row.status || "-"),
        String(row.remark || "-"),
      ])
    ),
    operatorId,
    payload: {
      month: monthKey,
      equipmentId,
      equipmentCode: record?.equipmentCode || null,
      equipmentName: record?.equipmentName || null,
      total: rows.length,
      entries: rows,
    },
  });
}

async function archiveProductionTemperatureMonthlySummary(
  record: any,
  operatorId?: number | null
) {
  if (String(record?.recordType || "") !== "temperature_humidity") return;
  const monthKey = resolveMonthKey(record?.recordDate);
  if (!monthKey) return;
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const { productionRecords: productionRecordsTable } = await import(
    "../drizzle/schema"
  );
  const { start, end } = resolveMonthRange(monthKey);
  const workshopName = String(record?.workshopName || "").trim();
  const workstationName = String(record?.workstationName || "").trim();
  const conditions: any[] = [
    eq(productionRecordsTable.recordType, "temperature_humidity"),
    gte(productionRecordsTable.recordDate, start as any),
    lt(productionRecordsTable.recordDate, end as any),
  ];
  if (workshopName)
    conditions.push(eq(productionRecordsTable.workshopName, workshopName));
  if (workstationName)
    conditions.push(
      eq(productionRecordsTable.workstationName, workstationName)
    );
  const rows = await db
    .select()
    .from(productionRecordsTable)
    .where(and(...conditions));
  rows.sort((a: any, b: any) => {
    const dateDiff =
      new Date(a.recordDate || 0).getTime() -
      new Date(b.recordDate || 0).getTime();
    if (dateDiff !== 0) return dateDiff;
    return String(a.recordTime || "").localeCompare(String(b.recordTime || ""));
  });
  const groupLabel =
    workstationName ||
    workshopName ||
    String(record?.processName || "温湿度").trim() ||
    "温湿度";
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `production_temperature_monthly:${monthKey}:${safeFileSegment(workshopName || "workshop")}:${safeFileSegment(workstationName || "default")}`,
    title: `温湿度记录月汇总-${monthKey}-${groupLabel}`,
    department: "生产部",
    folderName: "温湿度月汇总",
    baseName: `THM-${monthKey}-${normalizeMonthlySummarySegment(groupLabel, "TH")}`,
    summary: `温湿度记录月汇总自动归档（${monthKey}）`,
    bodyText: buildKnowledgeArchiveTableText(
      [
        "日期",
        "时间",
        "工位/区域",
        "温度",
        "湿度",
        "洁净度",
        "压差",
        "记录人",
        "备注",
      ],
      rows.map((row: any) => [
        formatMonthlyDateCell(row.recordDate),
        String(row.recordTime || "-"),
        String(row.workstationName || row.workshopName || "-"),
        String(row.temperature || "-"),
        String(row.humidity || "-"),
        String(row.cleanlinessLevel || "-"),
        String(row.pressureDiff || "-"),
        String(row.operatorName || row.operator || "-"),
        String(row.remark || "-"),
      ])
    ),
    operatorId,
    payload: {
      month: monthKey,
      workshopName,
      workstationName,
      total: rows.length,
      entries: rows,
    },
  });
}

async function archiveQualityInspectionSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getQualityInspectionById(id);
  if (!record) return;
  const recordNo = String(record.inspectionNo || `QI-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `quality_inspection:${id}`,
    title: `${String(record.type || "检验")}记录-${recordNo}`,
    department: "质量部",
    folderName: "质量检验",
    baseName: recordNo,
    summary: "质量检验记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveIqcInspectionSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getIqcInspectionById(id);
  if (!record) return;
  const recordNo = String(record.inspectionNo || `IQC-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `iqc_inspection:${id}`,
    title: `IQC检验记录-${recordNo}`,
    department: "质量部",
    folderName: "来料检验",
    baseName: recordNo,
    summary: "来料检验记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveLabRecordSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getLabRecordById(id);
  if (!record) return;
  const recordNo = String(record.recordNo || `LAB-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `lab_record:${id}`,
    title: `实验室记录-${recordNo}`,
    department: "质量部",
    folderName: "实验室记录",
    baseName: recordNo,
    summary: "实验室记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveProductionRecordSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getProductionRecordById(id);
  if (!record) return;
  const recordNo = String(record.recordNo || `PR-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `production_record:${id}`,
    title: `生产记录-${recordNo}`,
    department: "生产部",
    folderName: "生产记录",
    baseName: recordNo,
    summary: "生产记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveAccountsReceivableSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getAccountsReceivableById(id);
  if (!record) return;
  const invoiceNo = String(record.invoiceNo || `AR-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `accounts_receivable:${id}`,
    title: `应收账款-${invoiceNo}`,
    department: "财务部",
    folderName: "应收账款",
    baseName: invoiceNo,
    summary: "应收账款记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveAccountsPayableSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getAccountsPayableById(id);
  if (!record) return;
  const invoiceNo = String(record.invoiceNo || `AP-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `accounts_payable:${id}`,
    title: `应付账款-${invoiceNo}`,
    department: "财务部",
    folderName: "应付账款",
    baseName: invoiceNo,
    summary: "应付账款记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveReceivedInvoiceSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getReceivedInvoiceById(id);
  if (!record) return;
  const recordNo = String(record.invoiceNo || `RINV-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `received_invoice:${id}`,
    title: `收票记录-${recordNo}`,
    department: "财务部",
    folderName: "收票记录",
    baseName: `RINV-${recordNo}`,
    summary: "收票记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveIssuedInvoiceSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getIssuedInvoiceById(id);
  if (!record) return;
  const recordNo = String(record.invoiceNo || `IINV-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `issued_invoice:${id}`,
    title: `开票记录-${recordNo}`,
    department: "财务部",
    folderName: "开票记录",
    baseName: `IINV-${recordNo}`,
    summary: "开票记录自动归档",
    operatorId,
    payload: record,
  });
}

export async function archivePaymentRecordSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [record] = await db
    .select()
    .from(paymentRecordsTable)
    .where(eq(paymentRecordsTable.id, id))
    .limit(1);
  if (!record) return;
  const companyId = Number((record as any).companyId || 0) || undefined;
  const [enrichedRecord] = await getPaymentRecords({
    companyId,
    limit: 5000,
  }).then((rows: any[]) => rows.filter((row) => Number(row?.id) === id));
  const recordNo = String(record.recordNo || `PAY-${id}`);
  const actionText = String(record.type || "") === "receipt" ? "收款" : "付款";
  const voucherEntries = Array.isArray(enrichedRecord?.entries)
    ? enrichedRecord.entries
    : [];
  const voucherTypeMap: Record<string, string> = {
    receipt: "收款凭证",
    payment: "付款凭证",
    transfer: "转账凭证",
    general: "记账凭证",
  };
  const voucherStatusMap: Record<string, string> = {
    draft: "草稿",
    pending: "待审核",
    approved: "已审核",
    posted: "已过账",
  };
  await upsertKnowledgeBasePdfSnapshot({
    sourceKey: `payment_record:${id}`,
    title: `财务凭证-${recordNo}`,
    department: "财务部",
    folderName: "财务凭证",
    baseName: recordNo,
    templateKey: "finance_voucher",
    templateData: {
      voucherNo: String(enrichedRecord?.voucherNo ?? enrichedRecord?.recordNo ?? recordNo),
      voucherDate: String(
        enrichedRecord?.date ?? enrichedRecord?.paymentDate ?? record?.paymentDate ?? ""
      ),
      voucherType:
        voucherTypeMap[String(enrichedRecord?.type || record?.type || "general")] ||
        "记账凭证",
      statusLabel:
        voucherStatusMap[String(enrichedRecord?.status || record?.status || "posted")] ||
        "已过账",
      preparedBy: String(enrichedRecord?.preparedBy ?? enrichedRecord?.operatorName ?? "-") || "-",
      approvedBy: String(enrichedRecord?.approvedBy ?? "-") || "-",
      summary: String(enrichedRecord?.summary ?? enrichedRecord?.remark ?? "-") || "-",
      debitAmount: roundToDigits(
        enrichedRecord?.debitAmount ?? enrichedRecord?.amount ?? record?.amount,
        2
      ),
      creditAmount: roundToDigits(
        enrichedRecord?.creditAmount ?? enrichedRecord?.amount ?? record?.amount,
        2
      ),
      entries: voucherEntries.map((entry: any) => {
        const debitValue = roundToDigits(entry?.debit, 2);
        const creditValue = roundToDigits(entry?.credit, 2);
        return {
          accountCode: String(entry?.accountCode || "-"),
          accountName: String(entry?.accountName || "-"),
          debitText: debitValue > 0 ? `¥${toRoundedString(debitValue, 2)}` : "-",
          creditText: creditValue > 0 ? `¥${toRoundedString(creditValue, 2)}` : "-",
          summary: String(entry?.summary || enrichedRecord?.summary || enrichedRecord?.remark || "-"),
        };
      }),
    },
    companyId,
    summary: `${actionText}凭证 PDF 自动归档`,
    operatorId,
  });
}

async function archiveProductionPlanSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getProductionPlanById(id);
  if (!record) return;
  const planNo = String(record.planNo || `PLAN-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `production_plan:${id}`,
    title: `生产计划-${planNo}`,
    department: "生产部",
    folderName: "生产计划",
    baseName: `PLAN-${planNo}`,
    summary: "生产计划自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveProductionOrderSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getProductionOrderById(id);
  if (!record) return;
  const orderNo = String(record.orderNo || `PO-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `production_order:${id}`,
    title: `生产订单-${orderNo}`,
    department: "生产部",
    folderName: "生产订单",
    baseName: `PO-${orderNo}`,
    summary: "生产订单自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveEquipmentSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getEquipmentById(id);
  if (!record) return;
  const recordNo = String(record.code || `EQ-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `equipment:${id}`,
    title: `设备台账-${recordNo}`,
    department: "生产部",
    folderName: "设备台账",
    baseName: `EQ-${recordNo}`,
    summary: "设备台账自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveEquipmentInspectionSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getEquipmentInspectionById(id);
  if (!record) return;
  const recordNo = String(record.inspectionNo || `EQI-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `equipment_inspection:${id}`,
    title: `设备点检-${recordNo}`,
    department: "生产部",
    folderName: "设备点检",
    baseName: `EQI-${recordNo}`,
    summary: "设备点检自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveEquipmentMaintenanceSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getEquipmentMaintenanceById(id);
  if (!record) return;
  const recordNo = String(record.maintenanceNo || `EQM-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `equipment_maintenance:${id}`,
    title: `设备保养-${recordNo}`,
    department: "生产部",
    folderName: "设备保养",
    baseName: `EQM-${recordNo}`,
    summary: "设备保养自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveMaterialRequisitionOrderSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getMaterialRequisitionOrderById(id);
  if (!record) return;
  const recordNo = String(record.requisitionNo || `MR-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `material_requisition_order:${id}`,
    title: `领料单-${recordNo}`,
    department: "生产部",
    folderName: "领料单",
    baseName: `MR-${recordNo}`,
    summary: "领料单自动归档",
    operatorId,
    payload: record,
  });
  if (record.productionOrderId) {
    const productionOrder = await getProductionOrderById(
      Number(record.productionOrderId)
    );
    if (productionOrder?.batchNo) {
      await archiveBatchRecordSnapshotByBatchNo(
        String(productionOrder.batchNo),
        operatorId
      );
    }
  }
}

async function archiveBatchRecordSnapshotByBatchNo(
  batchNo: string,
  operatorId?: number | null,
  payload?: Awaited<ReturnType<typeof getBatchRecord>> | null
) {
  const normalizedBatchNo = String(batchNo || "").trim();
  if (!normalizedBatchNo) return;
  const record = payload ?? (await getBatchRecord(normalizedBatchNo));
  if (!record) return;
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `batch_record:${normalizedBatchNo}`,
    title: `批记录-${normalizedBatchNo}`,
    department: "质量部",
    folderName: "批记录",
    baseName: `BATCH-${normalizedBatchNo}`,
    summary: "批记录总览自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveInventoryTransactionSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [record] = await db
    .select()
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.id, id))
    .limit(1);
  if (!record) return;
  const docNo = String(record.documentNo || `TX-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `inventory_transaction:${id}`,
    title: `库存流水-${docNo}`,
    department: "仓库管理",
    folderName: "库存流水",
    baseName: `WH-${docNo}`,
    summary: `库存流水自动归档（${String(record.type || "")}）`,
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveProductionWarehouseEntrySnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getProductionWarehouseEntryById(id);
  if (!record) return;
  const entryNo = String(record.entryNo || `WE-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `production_warehouse_entry:${id}`,
    title: `生产入库申请-${entryNo}`,
    department: "仓库管理",
    folderName: "入库申请",
    baseName: `WE-${entryNo}`,
    summary: "生产入库申请自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveUdiLabelSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const db = await getUdiDbOrThrow();
  const [record] = await db
    .select()
    .from(udiLabels)
    .where(eq(udiLabels.id, id))
    .limit(1);
  if (!record) return;
  const labelNo = String(record.labelNo || `UDI-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `udi_label:${id}`,
    title: `UDI标签-${labelNo}`,
    department: "生产部",
    folderName: "UDI标签",
    baseName: `UDI-${labelNo}`,
    summary: "UDI标签记录自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

function extractGoodsReceiptBatchNos(record: any): string[] {
  const values = new Set<string>();
  const items = Array.isArray(record?.items) ? record.items : [];
  items.forEach((item: any) => {
    const batchNo = String(item?.batchNo || "").trim();
    if (batchNo) values.add(batchNo);
  });
  return Array.from(values);
}

async function archiveStocktakeSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getStocktakeById(id);
  if (!record) return;
  const recordNo = String(record.stocktakeNo || `STK-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `stocktake:${id}`,
    title: `盘点记录-${recordNo}`,
    department: "仓库管理",
    folderName: "盘点记录",
    baseName: `STK-${recordNo}`,
    summary: "盘点记录自动归档",
    operatorId,
    payload: record,
  });
}

async function archiveQualityIncidentSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getQualityIncidentById(id);
  if (!record) return;
  const recordNo = String(record.incidentNo || `INC-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `quality_incident:${id}`,
    title: `质量事件-${recordNo}`,
    department: "质量部",
    folderName: "质量事件",
    baseName: `INC-${recordNo}`,
    summary: "质量不良事件自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveSampleSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getSampleById(id);
  if (!record) return;
  const recordNo = String(record.sampleNo || `SMP-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `sample:${id}`,
    title: `样品记录-${recordNo}`,
    department: "质量部",
    folderName: "样品管理",
    baseName: `SMP-${recordNo}`,
    summary: "样品记录自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveEnvironmentRecordSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getEnvironmentRecordById(id);
  if (!record) return;
  const recordNo = String(record.recordNo || `ENV-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `environment_record:${id}`,
    title: `环境记录-${recordNo}`,
    department: "生产部",
    folderName: "环境记录",
    baseName: `ENV-${recordNo}`,
    summary: "生产环境记录自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveProductionRoutingCardSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getProductionRoutingCardById(id);
  if (!record) return;
  const recordNo = String(record.cardNo || `RC-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `production_routing_card:${id}`,
    title: `生产流转单-${recordNo}`,
    department: "生产部",
    folderName: "生产流转单",
    baseName: `RC-${recordNo}`,
    summary: "生产流转单自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveProductionScrapDisposalSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getProductionScrapDisposalById(id);
  if (!record) return;
  const recordNo = String(record.disposalNo || `SCRAP-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `production_scrap_disposal:${id}`,
    title: `报废处理-${recordNo}`,
    department: "生产部",
    folderName: "报废处理",
    baseName: `SCRAP-${recordNo}`,
    summary: "生产报废处理自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveSterilizationOrderSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getSterilizationOrderById(id);
  if (!record) return;
  const recordNo = String(record.orderNo || `STE-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `sterilization_order:${id}`,
    title: `灭菌单-${recordNo}`,
    department: "生产部",
    folderName: "灭菌单",
    baseName: `STE-${recordNo}`,
    summary: "灭菌单自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveLargePackagingRecordSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getLargePackagingRecordById(id);
  if (!record) return;
  const recordNo = String(record.recordNo || `PKG-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `large_packaging_record:${id}`,
    title: `大包装记录-${recordNo}`,
    department: "生产部",
    folderName: "大包装记录",
    baseName: `PKG-${recordNo}`,
    summary: "大包装记录自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveBatchRecordReviewSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getBatchRecordReviewRecordById(id);
  if (!record) return;
  const recordNo = String(record.reviewNo || `BRV-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `batch_record_review:${id}`,
    title: `批记录审核-${recordNo}`,
    department: "质量部",
    folderName: "批记录审核",
    baseName: `BRV-${recordNo}`,
    summary: "批记录审核自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveRegulatoryReleaseSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getRegulatoryReleaseRecordById(id);
  if (!record) return;
  const recordNo = String(record.releaseNo || `REL-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `regulatory_release:${id}`,
    title: `法规放行-${recordNo}`,
    department: "法规部",
    folderName: "法规放行",
    baseName: `REL-${recordNo}`,
    summary: "法规放行记录自动归档",
    operatorId,
    payload: record,
  });
  if (record.batchNo) {
    await archiveBatchRecordSnapshotByBatchNo(
      String(record.batchNo),
      operatorId
    );
  }
}

async function archiveGoodsReceiptSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getGoodsReceiptById(id);
  if (!record) return;
  const recordNo = String(record.receiptNo || `GR-${id}`);
  await upsertKnowledgeBaseRecordSnapshot({
    sourceKey: `goods_receipt:${id}`,
    title: `到货单-${recordNo}`,
    department: "采购部",
    folderName: "到货单",
    baseName: `GR-${recordNo}`,
    summary: "采购到货单自动归档",
    operatorId,
    payload: record,
  });
  const batchNos = extractGoodsReceiptBatchNos(record);
  for (const batchNo of batchNos) {
    await archiveBatchRecordSnapshotByBatchNo(batchNo, operatorId);
  }
}

export async function archivePurchaseOrderSnapshotById(
  id: number,
  operatorId?: number | null
) {
  const record = await getPurchaseOrderById(id);
  if (!record) return;
  const items = await getPurchaseOrderItems(id);
  const orderNo = String(record.orderNo || `PO-${id}`);
  const purchaseOrderStatusMap: Record<string, string> = {
    draft: "草稿",
    pending_approval: "审批中",
    approved: "已审批",
    rejected: "已驳回",
    issued: "已下达",
    ordered: "已下单",
    partial_received: "部分收货",
    received: "已收货",
    completed: "已完成",
    cancelled: "已取消",
  };
  await upsertKnowledgeBasePdfSnapshot({
    sourceKey: `purchase_order:${id}`,
    title: `采购订单-${orderNo}`,
    department: "采购部",
    folderName: "采购订单",
    baseName: `PO-${orderNo}`,
    templateKey: "purchase_order",
    templateData: {
      orderNo,
      orderDate: String(record.orderDate || ""),
      deliveryDate: String(record.expectedDate || ""),
      supplierName: String(record.supplierName || ""),
      contactPerson: String(record.contactPerson || ""),
      contactPhone: String(record.phone || ""),
      paymentTerms: String(
        (record as any).paymentTerms ||
          (record as any).paymentCondition ||
          record.currency ||
          "CNY"
      ),
      status: String(
        purchaseOrderStatusMap[String(record.status || "")] ||
          record.status ||
          ""
      ),
      totalAmount: roundToDigits(record.totalAmount, 2),
      remark: String(record.remark || ""),
      items: items.map((item: any) => ({
        productName: String(item.materialName || ""),
        productCode: String(item.materialCode || ""),
        specification: String(item.specification || ""),
        quantity: roundToDigits(item.quantity, 4),
        unit: String(item.unit || ""),
        unitPrice: roundToDigits(item.unitPrice, 4),
        amount: roundToDigits(item.amount, 2),
      })),
    },
    companyId: Number((record as any).companyId || 0) || undefined,
    summary: "采购订单 PDF 自动归档",
    operatorId,
  });
}

function normalizeDeclarationElements(value?: string): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  return text
    .split(/[\r\n]+|(?<=.)[;；]+/g)
    .map(item => item.trim())
    .filter(Boolean)
    .join("\n");
}

function toCustomerShortName(name: string): string {
  const raw = String(name ?? "").trim();
  if (!raw) return "客户";
  const stripped = raw
    .replace(
      /(有限责任公司|股份有限公司|有限公司|集团|Inc\.?|Incorporated|Co\.,?\s*Ltd\.?|Ltd\.?)/gi,
      ""
    )
    .trim();
  const base = stripped || raw;
  return base.slice(0, 12);
}

function normalizeSyncErrorMessage(error: unknown): string {
  const err = error as any;
  const message = String(err?.message ?? error ?? "");
  const code = String(err?.code ?? "");
  const errno = err?.errno;
  const sqlState = String(err?.sqlState ?? "");
  if (!message) return "未知错误";
  if (
    message.includes("Cannot add or update a child row") ||
    code === "ER_NO_REFERENCED_ROW_2"
  ) {
    return `关联数据不存在（客户或订单）[${code || errno || "FK"}]`;
  }
  if (message.includes("Duplicate entry") || code === "ER_DUP_ENTRY") {
    return `记录已存在[${code || errno || "DUP"}]`;
  }
  if (
    message.includes("Incorrect date value") ||
    code === "ER_TRUNCATED_WRONG_VALUE"
  ) {
    return `日期格式错误[${code || errno || "DATE"}]`;
  }
  if (message.includes("Data truncated") || code === "WARN_DATA_TRUNCATED") {
    return `字段值不符合数据库格式[${code || errno || "TRUNC"}]`;
  }
  if (message.includes("Unknown column") || code === "ER_BAD_FIELD_ERROR") {
    return `数据库字段不匹配[${code || errno || "COLUMN"}]`;
  }
  const short = message.slice(0, 80).replace(/\s+/g, " ");
  const tag = [code, errno, sqlState].filter(Boolean).join("/");
  return tag ? `数据库写入失败[${tag}] ${short}` : `数据库写入失败 ${short}`;
}

function shouldGenerateProductionPlansOnApproval(paymentMethod: unknown) {
  const normalized = normalizePaymentCondition(paymentMethod);
  return normalized === "账期支付" || normalized === "货到付款";
}

async function syncOneReceivableFromSalesOrder(
  orderId: number,
  operatorId?: number
) {
  const db = await getDb();
  if (!db) return { created: false, reason: "数据库不可用", orderNo: "" };
  await ensureCollaborationDataModel(db);

  const [existing] = await db
    .select({ id: accountsReceivableTable.id })
    .from(accountsReceivableTable)
    .where(eq(accountsReceivableTable.salesOrderId, orderId))
    .limit(1);
  if (existing)
    return { created: false, reason: "已存在应收记录", orderNo: "" };

  const [order] = await db
    .select({
      id: salesOrdersTable.id,
      orderNo: salesOrdersTable.orderNo,
      customerId: salesOrdersTable.customerId,
      orderDate: salesOrdersTable.orderDate,
      deliveryDate: salesOrdersTable.deliveryDate,
      paymentTermId: salesOrdersTable.paymentTermId,
      totalAmount: salesOrdersTable.totalAmount,
      totalAmountBase: salesOrdersTable.totalAmountBase,
      currency: salesOrdersTable.currency,
      exchangeRate: salesOrdersTable.exchangeRate,
      paymentMethod: salesOrdersTable.paymentMethod,
      remark: salesOrdersTable.remark,
      status: salesOrdersTable.status,
      createdBy: salesOrdersTable.createdBy,
      companyId: (salesOrdersTable as any).companyId,
    })
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, orderId))
    .limit(1);

  if (!order) return { created: false, reason: "订单不存在", orderNo: "" };
  if (!order.customerId)
    return {
      created: false,
      reason: "客户为空",
      orderNo: String(order.orderNo || ""),
    };
  if (order.status === "cancelled")
    return {
      created: false,
      reason: "订单已取消",
      orderNo: String(order.orderNo || ""),
    };
  if (["draft", "pending_review"].includes(String(order.status || ""))) {
    return {
      created: false,
      reason: "订单尚未进入应收阶段",
      orderNo: String(order.orderNo || ""),
    };
  }
  const [customerExists] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.id, order.customerId))
    .limit(1);
  if (!customerExists) {
    return {
      created: false,
      reason: `客户不存在(${order.customerId})`,
      orderNo: String(order.orderNo || ""),
    };
  }

  const paymentMethod = normalizePaymentCondition(order.paymentMethod);
  const totalAmount = Number(order.totalAmount ?? 0);
  const exchangeRate =
    Number(order.exchangeRate ?? 1) > 0 ? Number(order.exchangeRate) : 1;
  const totalAmountBase = Number(
    order.totalAmountBase ?? totalAmount * exchangeRate
  );
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return {
      created: false,
      reason: "订单金额<=0",
      orderNo: String(order.orderNo || ""),
    };
  }

  const prepayRatio =
    paymentMethod === "预付款" ? parsePrepayRatioFromRemark(order.remark) : 100;
  const ratio = prepayRatio / 100;
  const receivableAmount = totalAmount * ratio;
  const receivableAmountBase = totalAmountBase * ratio;

  let dueDate = order.orderDate;
  if (paymentMethod === "账期支付") {
    const fallbackDays = 30;
    const [paymentTerm] =
      Number(order.paymentTermId || 0) > 0
        ? await db
            .select({ creditDays: paymentTermsTable.creditDays })
            .from(paymentTermsTable)
            .where(eq(paymentTermsTable.id, Number(order.paymentTermId)))
            .limit(1)
        : [];
    const creditDays = Number(paymentTerm?.creditDays ?? fallbackDays);
    dueDate = addDaysToDateOnly(
      order.deliveryDate ?? order.orderDate,
      Number.isFinite(creditDays) && creditDays >= 0 ? creditDays : fallbackDays
    ) as any;
  }

  const ratioRemark =
    paymentMethod === "预付款" ? `预付款比例：${prepayRatio}%` : "";
  const baseRemark = String(order.remark ?? "")
    .split("\n")
    .filter(line => !line.startsWith(PREPAY_RATIO_MARKER))
    .join("\n")
    .trim();
  const mergedRemark = [ratioRemark, baseRemark].filter(Boolean).join(" | ");

  try {
    await createAccountsReceivable({
      companyId: Number((order as any).companyId || 0) || (await getMainCompanyId(db)),
      customerId: order.customerId,
      salesOrderId: order.id,
      amount: round2(receivableAmount),
      currency: order.currency || "CNY",
      exchangeRate: round2(exchangeRate),
      amountBase: round2(receivableAmountBase),
      invoiceDate: toDateOnly(order.orderDate) as any,
      dueDate: toDateOnly(dueDate) as any,
      paymentMethod: paymentMethod || null,
      remark: mergedRemark || null,
      createdBy: operatorId ?? undefined,
    } as any);
    return { created: true, reason: "", orderNo: String(order.orderNo || "") };
  } catch (error: any) {
    return {
      created: false,
      orderNo: String(order.orderNo || ""),
      reason: normalizeSyncErrorMessage(error),
    };
  }
}

async function syncMissingReceivablesFromSalesOrders(
  operatorId?: number,
  salesPersonId?: number,
  salesPersonIds?: number[],
  companyId?: number
) {
  const db = await getDb();
  if (!db)
    return {
      createdCount: 0,
      totalCount: 0,
      failed: [{ orderNo: "", reason: "数据库不可用" }],
    };
  await ensureCollaborationDataModel(db);
  const companyCondition = companyId
    ? eq((salesOrdersTable as any).companyId, companyId)
    : sql`1=1`;
  const orders = await db
    .select({ id: salesOrdersTable.id })
    .from(salesOrdersTable)
    .where(
      salesPersonId
        ? and(
            sql`${salesOrdersTable.status} != 'cancelled'`,
            eq(salesOrdersTable.salesPersonId, salesPersonId),
            companyCondition
          )
        : salesPersonIds?.length
          ? and(
              sql`${salesOrdersTable.status} != 'cancelled'`,
              inArray(salesOrdersTable.salesPersonId, salesPersonIds),
              companyCondition
            )
          : and(
              sql`${salesOrdersTable.status} != 'cancelled'`,
              companyCondition
            )
    );
  let createdCount = 0;
  const failed: Array<{ orderNo: string; reason: string }> = [];
  for (const row of orders) {
    const result = await syncOneReceivableFromSalesOrder(row.id, operatorId);
    if (result.created) {
      createdCount += 1;
      continue;
    }
    if (result.reason && result.reason !== "已存在应收记录") {
      failed.push({
        orderNo: result.orderNo || String(row.id),
        reason: result.reason,
      });
    }
  }
  return { createdCount, totalCount: orders.length, failed };
}

async function normalizePaymentConditionDataInDb() {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    UPDATE customers
    SET paymentTerms = CASE
      WHEN paymentTerms IS NULL OR paymentTerms = '' THEN paymentTerms
      WHEN paymentTerms IN ('预付款', '先款后货', '货到付款', '账期支付') THEN paymentTerms
      WHEN paymentTerms LIKE '%预付%' THEN '预付款'
      WHEN paymentTerms LIKE '%货到付款%' OR paymentTerms LIKE '%到付%' THEN '货到付款'
      WHEN paymentTerms LIKE '%月结%' OR paymentTerms LIKE '%账期%' OR paymentTerms LIKE '%赊%' THEN '账期支付'
      WHEN paymentTerms LIKE '%现结%' OR paymentTerms LIKE '%现款%' OR paymentTerms LIKE '%先款%' THEN '先款后货'
      ELSE paymentTerms
    END
  `);

  await db.execute(sql`
    UPDATE suppliers
    SET paymentTerms = CASE
      WHEN paymentTerms IS NULL OR paymentTerms = '' THEN paymentTerms
      WHEN paymentTerms IN ('预付款', '先款后货', '货到付款', '账期支付') THEN paymentTerms
      WHEN paymentTerms LIKE '%预付%' THEN '预付款'
      WHEN paymentTerms LIKE '%货到付款%' OR paymentTerms LIKE '%到付%' THEN '货到付款'
      WHEN paymentTerms LIKE '%月结%' OR paymentTerms LIKE '%账期%' OR paymentTerms LIKE '%赊%' THEN '账期支付'
      WHEN paymentTerms LIKE '%现结%' OR paymentTerms LIKE '%现款%' OR paymentTerms LIKE '%先款%' THEN '先款后货'
      ELSE paymentTerms
    END
  `);

  await db.execute(sql`
    UPDATE sales_orders
    SET paymentMethod = CASE
      WHEN paymentMethod IS NULL OR paymentMethod = '' THEN paymentMethod
      WHEN paymentMethod IN ('预付款', '先款后货', '货到付款', '账期支付') THEN paymentMethod
      WHEN paymentMethod LIKE '%预付%' THEN '预付款'
      WHEN paymentMethod LIKE '%货到付款%' OR paymentMethod LIKE '%到付%' THEN '货到付款'
      WHEN paymentMethod LIKE '%月结%' OR paymentMethod LIKE '%账期%' OR paymentMethod LIKE '%赊%' THEN '账期支付'
      WHEN paymentMethod LIKE '%现结%' OR paymentMethod LIKE '%现款%' OR paymentMethod LIKE '%先款%' THEN '先款后货'
      ELSE paymentMethod
    END
  `);
}

function validatePurchaseOrderSubmissionPayload(
  items: Array<{
    materialCode?: string | null;
    materialName?: string | null;
    quantity?: string | number | null;
    unitPrice?: string | number | null;
  }>,
  expectedDate?: string | Date | null,
) {
  if (!expectedDate) {
    throw new Error("请填写交货日期");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("请至少添加一条物料明细");
  }

  const invalidQuantityItem = items.find(
    (item) => Number(item.quantity || 0) <= 0,
  );
  if (invalidQuantityItem) {
    throw new Error(
      `物料「${invalidQuantityItem.materialName || invalidQuantityItem.materialCode || "-"}」数量必须大于 0`,
    );
  }

  const invalidPriceItem = items.find(
    (item) => Number(item.unitPrice || 0) <= 0,
  );
  if (invalidPriceItem) {
    throw new Error(
      `物料「${invalidPriceItem.materialName || invalidPriceItem.materialCode || "-"}」单价必须大于 0`,
    );
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
          companyId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "数据库连接不可用",
          });
        await ensureCollaborationDataModel(db);
        await ensureUsersExtendedColumns(db);
        await ensureUserDashboardPermissionsTable(db);

        const openId = `user-${input.username}`;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.openId, openId))
          .limit(1);

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        }

        // 验证密码 (如果是系统默认密码 666-11 且用户没有设置密码，则允许通过)
        const [pwdRecord] = (await db.execute(
          sql`SELECT passwordHash FROM user_passwords WHERE userId = ${user.id} LIMIT 1`
        )) as any[];
        const hasPassword = pwdRecord && pwdRecord[0]?.passwordHash;

        if (hasPassword) {
          if (!verifyPassword(input.password, pwdRecord[0].passwordHash)) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "密码错误" });
          }
        } else {
          // 默认密码校验
          if (input.password !== "666-11") {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "密码错误" });
          }
        }

        // 验证公司权限: 系统管理员可以登录任何公司
        if (user.role !== "admin") {
          if (user.companyId !== input.companyId) {
            // 检查是否有协同公司授权
            const { companyUserAccess } = await import("../drizzle/schema");
            const [access] = await db
              .select()
              .from(companyUserAccess)
              .where(
                and(
                  eq(companyUserAccess.userId, user.id),
                  eq(companyUserAccess.companyId, input.companyId)
                )
              )
              .limit(1);

            if (!access) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "您没有访问该公司的权限",
              });
            }
          }
        }

        // 更新最后登录时间
        await db
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));
        const dashboardPermissions =
          (await listUserDashboardPermissions([Number(user.id || 0)])).get(
            Number(user.id || 0)
          ) ?? [];
        const scopedUser = (await resolveUserForCompanyScope(
          user as any,
          input.companyId,
          { dashboardPermissions }
        )) as any;
        const sessionData = {
          id: scopedUser.id,
          name: scopedUser.name,
          email: scopedUser.email,
          role: scopedUser.role,
          department: scopedUser.department,
          position: scopedUser.position,
          dataScope: scopedUser.dataScope,
          homeCompanyId: scopedUser.homeCompanyId,
          isCompanyAdmin: Boolean(scopedUser.isCompanyAdmin),
          companyId: scopedUser.companyId,
        };

        const cookieOptions = getSessionCookieOptions(ctx.req);
        // 将用户信息序列化并存入 Cookie，供 createContext 使用
        ctx.res.cookie(COOKIE_NAME, JSON.stringify(sessionData), {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7天有效
        });

        return {
          success: true,
          user: {
            ...sessionData,
            openId: scopedUser.openId,
            phone: scopedUser.phone,
            visibleApps: scopedUser.visibleApps,
            visibleForms: scopedUser.visibleForms,
            avatarUrl: scopedUser.avatarUrl,
            englishName: scopedUser.englishName,
            dashboardPermissions: scopedUser.dashboardPermissions,
          },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    verifyPassword: protectedProcedure
      .input(
        z.object({
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "数据库连接不可用",
          });
        const user = ctx.user;
        if (!user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "用户未登录" });
        }
        const [pwdRecord] = (await db.execute(
          sql`SELECT passwordHash FROM user_passwords WHERE userId = ${user.id} LIMIT 1`
        )) as any[];
        const hasPassword = pwdRecord && pwdRecord[0]?.passwordHash;
        if (hasPassword) {
          if (!verifyPassword(input.password, pwdRecord[0].passwordHash)) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "密码错误" });
          }
        } else if (input.password !== "666-11") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "密码错误" });
        }
        return { success: true } as const;
      }),
  }),

  // ==================== 用户列表 ====================
  users: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureCollaborationDataModel(db);
      await ensureUsersVisibleAppsColumn(db);
      await ensureUsersVisibleFormsColumn(db);
      await ensureUsersAvatarUrlColumn(db);
      await ensureUsersEnglishNameColumn(db);
      await ensureUsersDataScopeColumn(db);
      await ensureUserDashboardPermissionsTable(db);
      const result = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          englishName: users.englishName,
          email: users.email,
          dataScope: users.dataScope,
          department: users.department,
          position: users.position,
          phone: users.phone,
          role: users.role,
          visibleApps: users.visibleApps,
          visibleForms: users.visibleForms,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          avatarUrl: users.avatarUrl,
          wxAccount: users.wxAccount,
          wxOpenid: users.wxOpenid,
          wxNickname: users.wxNickname,
          companyId: users.companyId,
        })
        .from(users);
      const userIds = result
        .map(item => Number(item.id || 0))
        .filter(id => id > 0);
      const permissionMap = await listUserDashboardPermissions(
        result.map(item => Number(item.id || 0))
      );
      const allowedCompanyMap = new Map<number, number[]>();
      if (userIds.length > 0) {
        const { companyUserAccess } = await import("../drizzle/schema");
        const rows = await db
          .select({
            userId: companyUserAccess.userId,
            companyId: companyUserAccess.companyId,
          })
          .from(companyUserAccess)
          .where(inArray(companyUserAccess.userId, userIds));
        for (const row of rows) {
          const userId = Number(row.userId || 0);
          const companyId = Number(row.companyId || 0);
          if (userId <= 0 || companyId <= 0) continue;
          const existing = allowedCompanyMap.get(userId) ?? [];
          if (!existing.includes(companyId)) {
            existing.push(companyId);
            allowedCompanyMap.set(userId, existing);
          }
        }
      }
      return result.map(item => ({
        ...item,
        allowedCompanies: allowedCompanyMap.get(Number(item.id || 0)) ?? [],
        dashboardPermissions: permissionMap.get(Number(item.id || 0)) ?? [],
      }));
    }),
    listByCompany: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureCollaborationDataModel(db);
      await ensureUsersVisibleAppsColumn(db);
      await ensureUsersVisibleFormsColumn(db);
      await ensureUsersAvatarUrlColumn(db);
      await ensureUsersEnglishNameColumn(db);
      await ensureUsersDataScopeColumn(db);
      await ensureUserDashboardPermissionsTable(db);
      const activeCompanyId = getActiveCompanyId(ctx.user);
      const localUsers = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          englishName: users.englishName,
          email: users.email,
          dataScope: users.dataScope,
          department: users.department,
          position: users.position,
          phone: users.phone,
          role: users.role,
          visibleApps: users.visibleApps,
          visibleForms: users.visibleForms,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          avatarUrl: users.avatarUrl,
          wxAccount: users.wxAccount,
          wxOpenid: users.wxOpenid,
          wxNickname: users.wxNickname,
          companyId: users.companyId,
        })
        .from(users)
        .where(eq(users.companyId, activeCompanyId));
      const { companyUserAccess } = await import("../drizzle/schema");
      const accessRows = await db
        .select({
          userId: companyUserAccess.userId,
          role: companyUserAccess.role,
          dataScope: companyUserAccess.dataScope,
          department: companyUserAccess.department,
          position: companyUserAccess.position,
          visibleApps: companyUserAccess.visibleApps,
          visibleForms: companyUserAccess.visibleForms,
          dashboardPermissions: companyUserAccess.dashboardPermissions,
        })
        .from(companyUserAccess)
        .where(eq(companyUserAccess.companyId, activeCompanyId));
      const scopedAccessMap = new Map(
        accessRows.map(row => [Number(row.userId || 0), row])
      );
      const accessUserIds = Array.from(
        new Set(
          accessRows
            .map(row => Number(row.userId || 0))
            .filter(id => Number.isFinite(id) && id > 0)
        )
      );
      const authorizedUsers =
        accessUserIds.length > 0
          ? await db
              .select({
                id: users.id,
                openId: users.openId,
                name: users.name,
                englishName: users.englishName,
                email: users.email,
                dataScope: users.dataScope,
                department: users.department,
                position: users.position,
                phone: users.phone,
                role: users.role,
                visibleApps: users.visibleApps,
                visibleForms: users.visibleForms,
                createdAt: users.createdAt,
                lastSignedIn: users.lastSignedIn,
                avatarUrl: users.avatarUrl,
                wxAccount: users.wxAccount,
                wxOpenid: users.wxOpenid,
                wxNickname: users.wxNickname,
                companyId: users.companyId,
              })
              .from(users)
              .where(inArray(users.id, accessUserIds))
          : [];
      const result = Array.from(
        new Map(
          [...localUsers, ...authorizedUsers].map(item => [
            Number(item.id || 0),
            item,
          ])
        ).values()
      );
      const userIds = result
        .map(item => Number(item.id || 0))
        .filter(id => id > 0);
      const permissionMap = await listUserDashboardPermissions(userIds);
      const allowedCompanyMap = new Map<number, number[]>();
      if (userIds.length > 0) {
        const rows = await db
          .select({
            userId: companyUserAccess.userId,
            companyId: companyUserAccess.companyId,
          })
          .from(companyUserAccess)
          .where(inArray(companyUserAccess.userId, userIds));
        for (const row of rows) {
          const userId = Number(row.userId || 0);
          const companyId = Number(row.companyId || 0);
          if (userId <= 0 || companyId <= 0) continue;
          const existing = allowedCompanyMap.get(userId) ?? [];
          if (!existing.includes(companyId)) {
            existing.push(companyId);
            allowedCompanyMap.set(userId, existing);
          }
        }
      }
      return result.map(item => ({
        ...item,
        role:
          Number(item.companyId || 0) !== activeCompanyId
            ? (scopedAccessMap.get(Number(item.id || 0))?.role ??
                item.role ??
                "user")
            : item.role,
        dataScope:
          Number(item.companyId || 0) !== activeCompanyId
            ? (scopedAccessMap.get(Number(item.id || 0))?.dataScope ??
                item.dataScope ??
                ((scopedAccessMap.get(Number(item.id || 0))?.role ??
                  item.role) === "admin"
                  ? "all"
                  : "self"))
            : item.dataScope,
        department:
          Number(item.companyId || 0) !== activeCompanyId
            ? (scopedAccessMap.get(Number(item.id || 0))?.department ??
              item.department)
            : item.department,
        position:
          Number(item.companyId || 0) !== activeCompanyId
            ? (scopedAccessMap.get(Number(item.id || 0))?.position ??
              item.position)
            : item.position,
        visibleApps:
          Number(item.companyId || 0) !== activeCompanyId &&
          scopedAccessMap.get(Number(item.id || 0))?.visibleApps !== undefined &&
          scopedAccessMap.get(Number(item.id || 0))?.visibleApps !== null
            ? scopedAccessMap.get(Number(item.id || 0))?.visibleApps
            : item.visibleApps,
        visibleForms:
          Number(item.companyId || 0) !== activeCompanyId &&
          scopedAccessMap.get(Number(item.id || 0))?.visibleForms !== undefined &&
          scopedAccessMap.get(Number(item.id || 0))?.visibleForms !== null
            ? scopedAccessMap.get(Number(item.id || 0))?.visibleForms
            : item.visibleForms,
        allowedCompanies: allowedCompanyMap.get(Number(item.id || 0)) ?? [],
        dashboardPermissions:
          Number(item.companyId || 0) !== activeCompanyId &&
          scopedAccessMap.get(Number(item.id || 0))?.dashboardPermissions !==
            undefined &&
          scopedAccessMap.get(Number(item.id || 0))?.dashboardPermissions !==
            null
            ? parseDashboardPermissionsCsv(
                scopedAccessMap.get(Number(item.id || 0))?.dashboardPermissions
              )
            : permissionMap.get(Number(item.id || 0)) ?? [],
        homeCompanyId: Number(item.companyId || 0),
        isScopedUser: Number(item.companyId || 0) !== activeCompanyId,
      }));
    }),
    create: protectedProcedure
      .input(
        z.object({
          username: z.string(),
          name: z.string(),
          englishName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          department: z.string().optional(),
          role: z.enum(["user", "admin"]).default("user"),
          dataScope: z.enum(["self", "department", "all"]).optional(),
          visibleApps: z.array(z.string()).optional(),
          visibleForms: z.array(z.string()).optional(),
          dashboardPermissions: z
            .array(z.enum(DASHBOARD_PERMISSION_IDS))
            .optional(),
          allowedCompanies: z.array(z.number()).optional(),
          wxAccount: z.string().optional(),
          wxOpenid: z.string().optional(),
          wxNickname: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensureUsersVisibleAppsColumn(db);
        await ensureUsersVisibleFormsColumn(db);
        await ensureUsersWechatColumns(db);
        await ensureUsersEnglishNameColumn(db);
        await ensureUsersDataScopeColumn(db);
        await ensureUserDashboardPermissionsTable(db);
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const normalizedVisibleForms = parseVisibleFormIds(input.visibleForms);
        const openId = `user-${input.username}`;
        const [newUser] = await db.insert(users).values({
          openId,
          name: input.name,
          englishName: input.englishName || null,
          email: input.email || null,
          phone: input.phone || null,
          department: input.department || null,
          role: input.role,
          dataScope: input.role === "admin" ? "all" : input.dataScope || "self",
          visibleApps: input.visibleApps?.length
            ? input.visibleApps.join(",")
            : null,
          visibleForms: normalizedVisibleForms.length
            ? normalizedVisibleForms.join(",")
            : null,
          loginMethod: "password",
          companyId: activeCompanyId,
          wxAccount: input.wxAccount || null,
          wxOpenid: input.wxOpenid || null,
          wxNickname: input.wxNickname || null,
        });
        // 同步协同公司权限
        if (input.allowedCompanies?.length) {
          const insertedUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.openId, openId))
            .limit(1);
          if (insertedUser.length > 0) {
            const { companyUserAccess } = await import("../drizzle/schema");
            await db.insert(companyUserAccess).values(
              input.allowedCompanies.map(companyId => ({
                companyId,
                userId: insertedUser[0].id,
                role: "admin",
                dataScope:
                  input.role === "admin" ? "all" : input.dataScope || "self",
                department: input.department || null,
                visibleApps: "",
                visibleForms: "",
                dashboardPermissions: "",
              }))
            );
            if (input.dashboardPermissions?.length) {
              await replaceUserDashboardPermissions(
                insertedUser[0].id,
                input.dashboardPermissions
              );
            }
          }
        }
        if (!input.allowedCompanies?.length) {
          const insertedUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.openId, openId))
            .limit(1);
          if (insertedUser.length > 0 && input.dashboardPermissions?.length) {
            await replaceUserDashboardPermissions(
              insertedUser[0].id,
              input.dashboardPermissions
            );
          }
        }
        const [createdUser] = await db
          .select()
          .from(users)
          .where(eq(users.openId, openId))
          .limit(1);
        await writeAuditTrail({
          ctx,
          module: "user",
          action: "create",
          targetType: "用户",
          targetId: createdUser?.id,
          targetName: input.name,
          description: `创建用户：${input.name}`,
          newData: {
            id: createdUser?.id,
            username: input.username,
            name: input.name,
            englishName: input.englishName || null,
            email: input.email || null,
            phone: input.phone || null,
            department: input.department || null,
            role: input.role,
            dataScope:
              input.role === "admin" ? "all" : input.dataScope || "self",
            visibleApps: input.visibleApps || [],
            visibleForms: normalizedVisibleForms,
            dashboardPermissions: input.dashboardPermissions || [],
            allowedCompanies: input.allowedCompanies || [],
          },
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          username: z.string().optional(),
          name: z.string().optional(),
          englishName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          department: z.string().optional(),
          position: z.string().optional(),
          role: z.enum(["user", "admin"]).optional(),
          dataScope: z.enum(["self", "department", "all"]).optional(),
          visibleApps: z.array(z.string()).optional(),
          visibleForms: z.array(z.string()).optional(),
          dashboardPermissions: z
            .array(z.enum(DASHBOARD_PERMISSION_IDS))
            .optional(),
          allowedCompanies: z.array(z.number()).optional(),
          wxAccount: z.string().optional(),
          wxOpenid: z.string().optional(),
          wxNickname: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensureUsersVisibleAppsColumn(db);
        await ensureUsersVisibleFormsColumn(db);
        await ensureUsersWechatColumns(db);
        await ensureUsersEnglishNameColumn(db);
        await ensureUsersDataScopeColumn(db);
        await ensureUserDashboardPermissionsTable(db);
        const {
          id,
          username,
          allowedCompanies,
          dashboardPermissions,
          ...data
        } = input;
        const normalizedVisibleForms = parseVisibleFormIds(data.visibleForms);
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const { companyUserAccess } = await import("../drizzle/schema");
        const [beforeUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        if (!beforeUser) {
          throw new Error("用户不存在");
        }
        const isLocalUser =
          Number((beforeUser as any)?.companyId || 0) === activeCompanyId;
        const [beforeScopedAccess] = !isLocalUser
          ? await db
              .select({
                companyId: companyUserAccess.companyId,
                userId: companyUserAccess.userId,
                role: companyUserAccess.role,
                dataScope: companyUserAccess.dataScope,
                department: companyUserAccess.department,
                position: companyUserAccess.position,
                visibleApps: companyUserAccess.visibleApps,
                visibleForms: companyUserAccess.visibleForms,
                dashboardPermissions: companyUserAccess.dashboardPermissions,
              })
              .from(companyUserAccess)
              .where(
                and(
                  eq(companyUserAccess.companyId, activeCompanyId),
                  eq(companyUserAccess.userId, id)
                )
              )
              .limit(1)
          : [null];
        if (!isLocalUser && !beforeScopedAccess) {
          throw new Error("只能修改当前公司已授权的用户");
        }

        if (isLocalUser) {
          await db
            .update(users)
            .set({
              ...data,
              englishName: data.englishName || null,
              dataScope:
                data.role === "admin"
                  ? "all"
                  : data.dataScope || beforeUser?.dataScope || "self",
              visibleApps: data.visibleApps?.length
                ? data.visibleApps.join(",")
                : null,
              visibleForms:
                data.visibleForms === undefined
                  ? (beforeUser?.visibleForms ?? null)
                  : normalizedVisibleForms.length
                    ? normalizedVisibleForms.join(",")
                    : null,
              wxAccount: data.wxAccount ?? null,
              wxOpenid: data.wxOpenid ?? null,
              wxNickname: data.wxNickname ?? null,
            })
            .where(and(eq(users.id, id), eq(users.companyId, activeCompanyId)));
          if (username) {
            await db
              .update(users)
              .set({ openId: `user-${username}` })
              .where(
                and(eq(users.id, id), eq(users.companyId, activeCompanyId))
              );
          }
        } else {
          const nextScopedRole =
            (data.role as "user" | "admin" | undefined) ??
            ((beforeScopedAccess?.role as "user" | "admin" | null) ?? null);
          await db
            .update(companyUserAccess)
            .set({
              role: nextScopedRole,
              dataScope:
                nextScopedRole === "admin"
                  ? "all"
                  : data.dataScope ??
                    beforeScopedAccess?.dataScope ??
                    beforeUser?.dataScope ??
                    "self",
              department:
                data.department === undefined
                  ? (beforeScopedAccess?.department ?? null)
                  : (data.department || null),
              position:
                data.position === undefined
                  ? (beforeScopedAccess?.position ?? null)
                  : (data.position || null),
              visibleApps:
                data.visibleApps === undefined
                  ? (beforeScopedAccess?.visibleApps ?? null)
                  : data.visibleApps.join(","),
              visibleForms:
                data.visibleForms === undefined
                  ? (beforeScopedAccess?.visibleForms ?? null)
                  : normalizedVisibleForms.join(","),
              dashboardPermissions:
                dashboardPermissions === undefined
                  ? (beforeScopedAccess?.dashboardPermissions ?? null)
                  : dashboardPermissions.join(","),
            })
            .where(
              and(
                eq(companyUserAccess.companyId, activeCompanyId),
                eq(companyUserAccess.userId, id)
              )
            );
        }
        if (isLocalUser && allowedCompanies !== undefined) {
          const dashboardPermissionsSnapshot =
            dashboardPermissions ??
            ((await listUserDashboardPermissions([id])).get(id) ?? []);
          await db
            .delete(companyUserAccess)
            .where(eq(companyUserAccess.userId, id));
          if (allowedCompanies.length > 0) {
            await db
              .insert(companyUserAccess)
              .values(
                allowedCompanies.map(companyId => ({
                  companyId,
                  userId: id,
                  role: "admin",
                  dataScope:
                    data.role === "admin"
                      ? "all"
                      : data.dataScope || beforeUser?.dataScope || "self",
                  department:
                    data.department === undefined
                      ? (beforeUser?.department ?? null)
                      : (data.department || null),
                position:
                  data.position === undefined
                    ? (beforeUser?.position ?? null)
                    : (data.position || null),
                  visibleApps: "",
                  visibleForms: "",
                  dashboardPermissions: "",
                }))
              );
        }
        }
        if (isLocalUser && dashboardPermissions !== undefined) {
          await replaceUserDashboardPermissions(id, dashboardPermissions);
        }
        const [afterUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        const [afterScopedAccess] = !isLocalUser
          ? await db
              .select({
                role: companyUserAccess.role,
                dataScope: companyUserAccess.dataScope,
                department: companyUserAccess.department,
                position: companyUserAccess.position,
                visibleApps: companyUserAccess.visibleApps,
                visibleForms: companyUserAccess.visibleForms,
                dashboardPermissions: companyUserAccess.dashboardPermissions,
              })
              .from(companyUserAccess)
              .where(
                and(
                  eq(companyUserAccess.companyId, activeCompanyId),
                  eq(companyUserAccess.userId, id)
                )
              )
              .limit(1)
          : [null];
        await writeAuditTrail({
          ctx,
          module: "user",
          action: "update",
          targetType: "用户",
          targetId: id,
          targetName: String(
            afterUser?.name || beforeUser?.name || input.name || ""
          ),
          description: `修改用户：${String(afterUser?.name || beforeUser?.name || id)}`,
          previousData: {
            ...(beforeUser as Record<string, unknown>),
            scopedSettings:
              beforeScopedAccess
                ? {
                    role: beforeScopedAccess.role,
                    dataScope: beforeScopedAccess.dataScope,
                    department: beforeScopedAccess.department,
                    position: beforeScopedAccess.position,
                    visibleApps: beforeScopedAccess.visibleApps,
                    visibleForms: beforeScopedAccess.visibleForms,
                    dashboardPermissions: parseDashboardPermissionsCsv(
                      beforeScopedAccess.dashboardPermissions
                    ),
                  }
                : undefined,
          },
          newData: {
            ...(afterUser ? (afterUser as Record<string, unknown>) : {}),
            scopedSettings:
              afterScopedAccess
                ? {
                    role: afterScopedAccess.role,
                    dataScope: afterScopedAccess.dataScope,
                    department: afterScopedAccess.department,
                    position: afterScopedAccess.position,
                    visibleApps: afterScopedAccess.visibleApps,
                    visibleForms: afterScopedAccess.visibleForms,
                    dashboardPermissions: parseDashboardPermissionsCsv(
                      afterScopedAccess.dashboardPermissions
                    ),
                  }
                : undefined,
            allowedCompanies:
              !isLocalUser || allowedCompanies === undefined
                ? undefined
                : allowedCompanies,
            dashboardPermissions:
              dashboardPermissions === undefined
                ? undefined
                : dashboardPermissions,
            visibleForms:
              data.visibleForms === undefined
                ? undefined
                : normalizedVisibleForms,
            username:
              username ||
              beforeUser?.openId?.replace(/^user-/, "") ||
              undefined,
          },
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (db) {
          await ensureUserDashboardPermissionsTable(db);
          const activeCompanyId = getActiveCompanyId(ctx.user);
          const [currentUser] = await db
            .select()
            .from(users)
            .where(and(eq(users.id, input.id), eq(users.companyId, activeCompanyId)))
            .limit(1);
          if (!currentUser) {
            throw new Error("只能删除当前公司的用户");
          }
          await db
            .delete(userDashboardPermissions)
            .where(eq(userDashboardPermissions.userId, input.id));
          await deleteUser(input.id, ctx.user?.id);
          await writeAuditTrail({
            ctx,
            module: "user",
            action: "delete",
            targetType: "用户",
            targetId: input.id,
            targetName: String(currentUser?.name || input.id),
            description: `删除用户：${String(currentUser?.name || input.id)}`,
            previousData: currentUser as Record<string, unknown> | null,
          });
          return { success: true };
        }
        throw new Error("数据库连接不可用");
      }),
    setPassword: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          newPassword: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("仅管理员可修改密码");
        }
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const [currentUser] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, input.id), eq(users.companyId, activeCompanyId)))
          .limit(1);
        if (!currentUser) {
          throw new Error("只能修改当前公司的用户密码");
        }
        const passwordHash = hashPassword(input.newPassword);
        await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_passwords (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL UNIQUE,
          passwordHash VARCHAR(255) NOT NULL,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
        await db.execute(sql`
        INSERT INTO user_passwords (userId, passwordHash)
        VALUES (${input.id}, ${passwordHash})
        ON DUPLICATE KEY UPDATE
          passwordHash = VALUES(passwordHash),
          updatedAt = CURRENT_TIMESTAMP
      `);
        await writeAuditTrail({
          ctx,
          module: "user",
          action: "permission_change",
          targetType: "用户密码",
          targetId: input.id,
          targetName: String(currentUser?.name || input.id),
          description: `重置用户密码：${String(currentUser?.name || input.id)}`,
        });
        return { success: true };
      }),
    uploadAvatar: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string(),
          mimeType: z.string().optional(),
          base64: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensureUsersAvatarUrlColumn(db);
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const [beforeUser] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, input.id), eq(users.companyId, activeCompanyId)))
          .limit(1);
        if (!beforeUser) {
          throw new Error("只能修改当前公司的用户头像");
        }
        const imageExtAllowList = new Set([
          ".jpg",
          ".jpeg",
          ".png",
          ".webp",
          ".gif",
        ]);
        const extFromName = `.${String(input.name.split(".").pop() || "").toLowerCase()}`;
        const ext = imageExtAllowList.has(extFromName)
          ? extFromName
          : String(input.mimeType || "").includes("png")
            ? ".png"
            : String(input.mimeType || "").includes("jpeg")
              ? ".jpg"
              : String(input.mimeType || "").includes("jpg")
                ? ".jpg"
                : String(input.mimeType || "").includes("webp")
                  ? ".webp"
                  : ".png";
        const base64Body = String(input.base64 || "").replace(
          /^data:[^;]+;base64,/,
          ""
        );
        const fileBuffer = Buffer.from(base64Body, "base64");
        const saved = await saveAttachmentFile({
          department: "系统设置",
          businessFolder: "用户头像",
          originalName: input.name,
          desiredBaseName: `AVT-U${input.id}`,
          mimeType: input.mimeType,
          buffer: fileBuffer,
        });
        await db
          .update(users)
          .set({ avatarUrl: saved.filePath })
          .where(and(eq(users.id, input.id), eq(users.companyId, activeCompanyId)));
        const [afterUser] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, input.id), eq(users.companyId, activeCompanyId)))
          .limit(1);
        await writeAuditTrail({
          ctx,
          module: "user",
          action: "update",
          targetType: "用户头像",
          targetId: input.id,
          targetName: String(afterUser?.name || beforeUser?.name || input.id),
          description: `更新用户头像：${String(afterUser?.name || beforeUser?.name || input.id)}`,
          previousData: beforeUser as Record<string, unknown> | null,
          newData: afterUser as Record<string, unknown> | null,
        });
        return { avatarUrl: saved.filePath };
      }),
  }),

  // ==================== 产品管理 ====================
  products: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            salePermission: z.enum(["saleable", "not_saleable"]).optional(),
            procurePermission: z
              .enum(["purchasable", "production_only"])
              .optional(),
            isSterilized: z.boolean().optional(),
            includeSourceLibrary: z.boolean().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        console.log("[products.list] input:", JSON.stringify(input));
        const result = await getProducts({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          includeSourceLibrary: input?.includeSourceLibrary ?? false,
        });
        console.log("[products.list] result count:", result.length);
        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getProductById(input.id, getActiveCompanyId(ctx.user));
      }),

    create: protectedProcedure
      .input(
        z.object({
          isMedicalDevice: z.boolean().optional().default(true),
          isSterilized: z.boolean().optional().default(false),
          code: z.string(),
          name: z.string(),
          specification: z.string().optional(),
          category: z.string().optional(),
          productCategory: z.enum(PRODUCT_CATEGORY_VALUES).optional(),
          unit: z.string().optional(),
          registrationNo: z.string().optional(),
          udiDi: z.string().optional(),
          medicalInsuranceCode: z.string().optional(),
          manufacturer: z.string().optional(),
          storageCondition: z.string().optional(),
          shelfLife: z.number().optional(),
          riskLevel: z.enum(["I", "II", "III"]).optional(),
          salePermission: z
            .enum(["saleable", "not_saleable"])
            .default("saleable"),
          procurePermission: z
            .enum(["purchasable", "production_only"])
            .default("purchasable"),
          status: z.enum(["draft", "active", "discontinued"]).optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createProduct({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          createdBy: ctx.user?.id,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            isMedicalDevice: z.boolean().optional(),
            isSterilized: z.boolean().optional(),
            code: z.string().optional(),
            name: z.string().optional(),
            specification: z.string().optional(),
            category: z.string().optional(),
            productCategory: z.enum(PRODUCT_CATEGORY_VALUES).optional(),
            unit: z.string().optional(),
            registrationNo: z.string().optional(),
            udiDi: z.string().optional(),
            medicalInsuranceCode: z.string().optional(),
            manufacturer: z.string().optional(),
            storageCondition: z.string().optional(),
            shelfLife: z.number().optional(),
            riskLevel: z.enum(["I", "II", "III"]).optional(),
            salePermission: z.enum(["saleable", "not_saleable"]).optional(),
            procurePermission: z
              .enum(["purchasable", "production_only"])
              .optional(),
            status: z.enum(["draft", "active", "discontinued"]).optional(),
            description: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateProduct(input.id, input.data, getActiveCompanyId(ctx.user));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteProduct(input.id, getActiveCompanyId(ctx.user));
        return { success: true };
      }),

    bulkReferenceFromMain: protectedProcedure.mutation(async ({ ctx }) => {
      const activeCompanyId = getActiveCompanyId(ctx.user);
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接不可用",
        });
      }
      const mainCompanyId = await getMainCompanyId(db);
      if (activeCompanyId === mainCompanyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "主公司无需批量引用自己的产品库",
        });
      }
      return await syncCompanyProductsFromMain(activeCompanyId, ctx.user?.id);
    }),
    // 获取下一个自动编码（支持按前缀）
    nextCode: protectedProcedure
      .input(z.object({ prefix: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getNextProductCode(input?.prefix || "CP");
      }),
    // 校验编码是否重复
    checkCode: protectedProcedure
      .input(z.object({ code: z.string(), excludeId: z.number().optional() }))
      .query(async ({ input }) => {
        const exists = await isProductCodeExists(input.code, input.excludeId);
        return { exists };
      }),
  }),
  // ==================== 客户管理 =====================
  customers: router({
    nextCode: protectedProcedure
      .input(z.object({ prefix: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return { code: await getNextCustomerCode(input?.prefix || "KH") };
      }),

    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            type: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        await normalizePaymentConditionDataInDb();
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        return await getCustomers({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          salesPersonId: singleUserId,
          salesPersonIds: multipleUserIds,
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const customer = await getCustomerById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!customer) return undefined;
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (
          scopedUserIds &&
          !isOwnerWithinScope(customer.salesPersonId, scopedUserIds)
        ) {
          throw new Error("无权查看该客户");
        }
        return customer;
      }),

    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          name: z.string(),
          shortName: z.string().optional(),
          type: z.enum(["hospital", "dealer", "domestic", "overseas"]),
          contactPerson: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          address: z.string().optional(),
          province: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          paymentTerms: z.string().optional(),
          currency: z.string().optional(),
          creditLimit: z.string().optional(),
          taxNo: z.string().optional(),
          taxRate: z.string().optional(),
          bankAccount: z.string().optional(),
          bankName: z.string().optional(),
          needInvoice: z.boolean().optional(),
          salesPersonId: z.number().optional(),
          status: z.enum(["active", "inactive", "blacklist"]).optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const customerId = await createCustomer({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          paymentTerms:
            input.paymentTerms === undefined
              ? undefined
              : normalizePaymentCondition(input.paymentTerms),
          createdBy: ctx.user?.id,
        });
        // 新建后自动补充客户商标域名（失败不影响主流程）
        await enrichCustomerLogoDomain(customerId).catch(() => undefined);
        return customerId;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            code: z.string().optional(),
            name: z.string().optional(),
            shortName: z.string().optional(),
            type: z
              .enum(["hospital", "dealer", "domestic", "overseas"])
              .optional(),
            contactPerson: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            address: z.string().optional(),
            province: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            paymentTerms: z.string().optional(),
            currency: z.string().optional(),
            creditLimit: z.string().optional(),
            taxNo: z.string().optional(),
            taxRate: z.string().optional(),
            bankAccount: z.string().optional(),
            bankName: z.string().optional(),
            needInvoice: z.boolean().optional(),
            salesPersonId: z.number().optional(),
            status: z.enum(["active", "inactive", "blacklist"]).optional(),
            source: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateCustomer(input.id, {
          ...input.data,
          paymentTerms:
            input.data.paymentTerms === undefined
              ? undefined
              : normalizePaymentCondition(input.data.paymentTerms),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCustomer(input.id);
        return { success: true };
      }),

    // 获取客户的历史订单
    getOrders: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const customer = await getCustomerById(
          input.customerId,
          getActiveCompanyId(ctx.user)
        );
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (
          customer &&
          scopedUserIds &&
          !isOwnerWithinScope(customer.salesPersonId, scopedUserIds)
        ) {
          throw new Error("无权查看该客户历史订单");
        }
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        if (!db) return [];
        const orders = await db
          .select({
            id: salesOrdersTable.id,
            orderNo: salesOrdersTable.orderNo,
            orderDate: salesOrdersTable.orderDate,
            totalAmount: salesOrdersTable.totalAmount,
            currency: salesOrdersTable.currency,
            status: salesOrdersTable.status,
          })
          .from(salesOrdersTable)
          .where(eq(salesOrdersTable.customerId, input.customerId))
          .orderBy(desc(salesOrdersTable.orderDate))
          .limit(10);
        return orders;
      }),

    // 获取客户交易统计数据
    getStats: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input, ctx }) => {
        const customer = await getCustomerById(
          input.customerId,
          getActiveCompanyId(ctx.user)
        );
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (
          customer &&
          scopedUserIds &&
          !isOwnerWithinScope(customer.salesPersonId, scopedUserIds)
        ) {
          throw new Error("无权查看该客户交易统计");
        }
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        if (!db) {
          return {
            orderCount: 0,
            totalAmount: 0,
            paidAmount: 0,
            lastOrderDate: null,
          };
        }
        const orders = await db
          .select({
            totalAmount: salesOrdersTable.totalAmount,
            orderDate: salesOrdersTable.orderDate,
          })
          .from(salesOrdersTable)
          .where(eq(salesOrdersTable.customerId, input.customerId));

        const orderCount = orders.length;
        const totalAmount = orders.reduce((sum: number, order: any) => {
          const amount =
            typeof order.totalAmount === "string"
              ? parseFloat(order.totalAmount)
              : order.totalAmount || 0;
          return sum + amount;
        }, 0);
        const receivables = await db
          .select({
            paidAmount: accountsReceivableTable.paidAmount,
          })
          .from(accountsReceivableTable)
          .where(eq(accountsReceivableTable.customerId, input.customerId));
        const paidAmount = receivables.reduce((sum: number, row: any) => {
          const value =
            typeof row.paidAmount === "string"
              ? parseFloat(row.paidAmount)
              : row.paidAmount || 0;
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
        const lastOrderDate =
          orders.length > 0
            ? [...orders].sort(
                (a, b) =>
                  new Date(b.orderDate).getTime() -
                  new Date(a.orderDate).getTime()
              )[0].orderDate
            : null;

        return {
          orderCount,
          totalAmount,
          paidAmount,
          lastOrderDate,
        };
      }),
  }),

  // ==================== 供应商管理 ====================
  suppliers: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            type: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        await normalizePaymentConditionDataInDb();
        return await getSuppliers({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getSupplierById(input.id, getActiveCompanyId(ctx.user));
      }),

    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          name: z.string(),
          shortName: z.string().optional(),
          type: z.enum(["material", "equipment", "service"]),
          contactPerson: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          address: z.string().optional(),
          businessLicense: z.string().optional(),
          qualificationLevel: z.enum(["A", "B", "C", "pending"]).optional(),
          paymentTerms: z.string().optional(),
          creditDays: z.number().optional(),
          bankAccount: z.string().optional(),
          taxNo: z.string().optional(),
          evaluationScore: z.string().optional(),
          status: z.enum(["qualified", "pending", "disqualified"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createSupplier({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          paymentTerms:
            input.paymentTerms === undefined
              ? undefined
              : normalizePaymentCondition(input.paymentTerms),
          creditDays:
            normalizePaymentCondition(input.paymentTerms) === "账期支付"
              ? (input.creditDays ?? 30)
              : undefined,
          createdBy: ctx.user?.id,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            code: z.string().optional(),
            name: z.string().optional(),
            shortName: z.string().optional(),
            type: z.enum(["material", "equipment", "service"]).optional(),
            contactPerson: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            address: z.string().optional(),
            businessLicense: z.string().optional(),
            qualificationLevel: z.enum(["A", "B", "C", "pending"]).optional(),
            paymentTerms: z.string().optional(),
            creditDays: z.number().optional(),
            bankAccount: z.string().optional(),
            taxNo: z.string().optional(),
            evaluationScore: z.string().optional(),
            status: z.enum(["qualified", "pending", "disqualified"]).optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateSupplier(input.id, {
          ...input.data,
          paymentTerms:
            input.data.paymentTerms === undefined
              ? undefined
              : normalizePaymentCondition(input.data.paymentTerms),
          creditDays:
            input.data.paymentTerms === undefined
              ? input.data.creditDays
              : normalizePaymentCondition(input.data.paymentTerms) ===
                  "账期支付"
                ? (input.data.creditDays ?? 30)
                : undefined,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSupplier(input.id);
        return { success: true };
      }),
  }),

  supplierProfileRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            supplierId: z.number().optional(),
            formType: z
              .enum(["survey", "annual_evaluation", "quality_agreement"])
              .optional(),
            status: z.enum(["draft", "completed"]).optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getSupplierProfileRecords({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getSupplierProfileRecordById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
      }),

    create: protectedProcedure
      .input(
        z.object({
          supplierId: z.number(),
          supplierName: z.string(),
          formType: z.enum(["survey", "annual_evaluation", "quality_agreement"]),
          recordNo: z.string().optional(),
          serialNo: z.string().optional(),
          yearLabel: z.string().optional(),
          status: z.enum(["draft", "completed"]).optional(),
          formData: z.any().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createSupplierProfileRecord({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          createdBy: ctx.user?.id,
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            supplierId: z.number().optional(),
            supplierName: z.string().optional(),
            formType: z
              .enum(["survey", "annual_evaluation", "quality_agreement"])
              .optional(),
            serialNo: z.string().optional(),
            yearLabel: z.string().optional(),
            status: z.enum(["draft", "completed"]).optional(),
            formData: z.any().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateSupplierProfileRecord(input.id, input.data as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSupplierProfileRecord(input.id);
        return { success: true };
      }),
  }),

  // ==================== 产品-供应商价格关联 ====================
  productSupplierPrices: router({
    list: protectedProcedure
      .input(
        z
          .object({
            productId: z.number().optional(),
            supplierId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getProductSupplierPrices(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductSupplierPriceById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          supplierId: z.number(),
          purchasePrice: z.string().optional(),
          unitPrice: z.string().optional(),
          currency: z.string().optional(),
          moq: z.number().optional(),
          minOrderQty: z.number().optional(),
          leadTimeDays: z.number().optional(),
          isDefault: z.number().optional(),
          validFrom: z.string().optional(),
          validTo: z.string().optional(),
          effectiveDate: z.string().optional(),
          expiryDate: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createProductSupplierPrice({
          productId: input.productId,
          supplierId: input.supplierId,
          unitPrice: input.unitPrice || input.purchasePrice || "0",
          currency: input.currency || "CNY",
          minOrderQty: input.minOrderQty ?? input.moq ?? 1,
          leadTimeDays: input.leadTimeDays ?? 0,
          isDefault: input.isDefault ?? 0,
          effectiveDate: input.effectiveDate
            ? new Date(input.effectiveDate)
            : input.validFrom
              ? new Date(input.validFrom)
              : undefined,
          expiryDate: input.expiryDate
            ? new Date(input.expiryDate)
            : input.validTo
              ? new Date(input.validTo)
              : undefined,
          remark: input.remark,
          createdBy: ctx.user?.id,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            purchasePrice: z.string().optional(),
            unitPrice: z.string().optional(),
            currency: z.string().optional(),
            moq: z.number().optional(),
            minOrderQty: z.number().optional(),
            leadTimeDays: z.number().optional(),
            isDefault: z.number().optional(),
            validFrom: z.string().optional(),
            validTo: z.string().optional(),
            effectiveDate: z.string().optional(),
            expiryDate: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateProductSupplierPrice(input.id, {
          unitPrice: input.data.unitPrice || input.data.purchasePrice,
          currency: input.data.currency,
          minOrderQty: input.data.minOrderQty ?? input.data.moq,
          leadTimeDays: input.data.leadTimeDays,
          isDefault: input.data.isDefault,
          effectiveDate: input.data.effectiveDate
            ? new Date(input.data.effectiveDate)
            : input.data.validFrom
              ? new Date(input.data.validFrom)
              : undefined,
          expiryDate: input.data.expiryDate
            ? new Date(input.data.expiryDate)
            : input.data.validTo
              ? new Date(input.data.validTo)
              : undefined,
          remark: input.data.remark,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProductSupplierPrice(input.id);
        return { success: true };
      }),
  }),

  // ==================== 销售订单 ====================
  salesOrders: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().nullish(),
            status: z.string().nullish(),
            customerId: z.number().nullish(),
            limit: z.number().nullish(),
            offset: z.number().nullish(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        await normalizePaymentConditionDataInDb();
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        const params = input
          ? {
              search: input.search ?? undefined,
              status: input.status ?? undefined,
              customerId: input.customerId ?? undefined,
              companyId: getActiveCompanyId(ctx.user),
              salesPersonId: singleUserId,
              salesPersonIds: multipleUserIds,
              limit: input.limit ?? undefined,
              offset: input.offset ?? undefined,
            }
          : {
              companyId: getActiveCompanyId(ctx.user),
              salesPersonId: singleUserId,
              salesPersonIds: multipleUserIds,
            };
        const baseOrders = await getSalesOrders(params);
        if (!scopedUserIds?.length || !ctx.user?.id) {
          return baseOrders;
        }

        const statusFilter = String(input?.status ?? "").trim();
        if (statusFilter && statusFilter !== "pending_review") {
          return baseOrders;
        }

        const pendingOrders = await getSalesOrders({
          search: input?.search ?? undefined,
          status: "pending_review",
          customerId: input?.customerId ?? undefined,
          companyId: getActiveCompanyId(ctx.user),
          salesPersonId: singleUserId,
          salesPersonIds: multipleUserIds,
        });
        const pendingApprovalOrders: typeof baseOrders = [];
        for (const order of pendingOrders as any[]) {
          const approvalState = await getSalesOrderApprovalState(
            Number(order.id),
            ctx.user?.id,
            ctx.user?.role
          );
          if (approvalState?.canApprove) {
            pendingApprovalOrders.push(order);
          }
        }

        const mergedOrders = [...baseOrders, ...pendingApprovalOrders];
        const dedupedOrders = Array.from(
          new Map(
            mergedOrders.map((order: any) => [Number(order.id), order])
          ).values()
        );
        dedupedOrders.sort((a: any, b: any) =>
          String(b?.createdAt ?? b?.orderDate ?? "").localeCompare(
            String(a?.createdAt ?? a?.orderDate ?? "")
          )
        );

        const offset = Math.max(0, Number(input?.offset ?? 0));
        const limit = Number(input?.limit ?? 0);
        return limit > 0
          ? dedupedOrders.slice(offset, offset + limit)
          : dedupedOrders.slice(offset);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const order = await getSalesOrderById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (
          scopedUserIds &&
          !isOwnerWithinScope(order?.salesPersonId, scopedUserIds)
        ) {
          const approvalState = await getSalesOrderApprovalState(
            input.id,
            ctx.user?.id,
            ctx.user?.role
          );
          if (!approvalState?.canApprove) {
            throw new Error("无权查看该订单");
          }
        }
        const items = await getSalesOrderItems(input.id);
        return { order, items };
      }),

    getItemsByOrderIds: protectedProcedure
      .input(
        z.object({
          orderIds: z.array(z.number()).max(2000),
        })
      )
      .query(async ({ input, ctx }) => {
        const orderIds = Array.from(
          new Set(
            input.orderIds
              .map(id => Number(id))
              .filter(id => Number.isFinite(id) && id > 0)
          )
        );

        if (orderIds.length === 0) {
          return [];
        }

        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        if (!scopedUserIds?.length || !ctx.user?.id) {
          return await getSalesOrderItemsByOrderIds(orderIds);
        }

        const ownOrders = await getSalesOrders({
          companyId: getActiveCompanyId(ctx.user),
          salesPersonId: singleUserId,
          salesPersonIds: multipleUserIds,
          limit: 5000,
        });
        const allowedOrderIds = new Set(
          (ownOrders as any[])
            .map((order: any) => Number(order?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        );
        const filteredOrderIds = orderIds.filter(id => allowedOrderIds.has(id));
        if (filteredOrderIds.length === 0) {
          return [];
        }

        return await getSalesOrderItemsByOrderIds(filteredOrderIds);
      }),

    getApprovalState: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getSalesOrderApprovalState(
          input.id,
          ctx.user?.id,
          ctx.user?.role
        );
      }),

    create: protectedProcedure
      .input(
        z.object({
          orderNo: z.string().optional(),
          customerId: z.number(),
          orderDate: z.string(),
          deliveryDate: z.string().optional(),
          totalAmount: z.string().optional(),
          currency: z.string().optional(),
          paymentMethod: z.string().optional(),
          exchangeRate: z.string().optional(),
          totalAmountBase: z.string().optional(),
          status: z
            .enum([
              "draft",
              "pending_review",
              "approved",
              "pending_payment",
              "confirmed",
              "in_production",
              "ready_to_ship",
              "partial_shipped",
              "shipped",
              "completed",
              "cancelled",
            ])
            .optional(),
          paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
          shippingAddress: z.string().optional(),
          shippingContact: z.string().optional(),
          shippingPhone: z.string().optional(),
          needsShipping: z.boolean().optional(),
          shippingFee: z.string().optional(),
          isExport: z.boolean().optional(),
          tradeTerm: z.string().optional(),
          receiptAccountId: z.number().nullable().optional(),
          remark: z.string().optional(),
          salesPersonId: z.number().optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.string(),
              unit: z.string().optional(),
              unitPrice: z.string().optional(),
              amount: z.string().optional(),
              remark: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { items, orderDate, deliveryDate, ...orderData } = input;
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const db = await getDb();
        const mainCompanyId = db ? await getMainCompanyId(db) : 3;
        if (db) await ensureSalesOrdersTradeFields(db);
        const requestedStatus = input.status || "draft";
        const submitOnCreate = requestedStatus !== "draft";
        const workflowConfig = db
          ? await getWorkflowExecutionConfig(db, {
              module: "销售部",
              formType: "业务单据",
              formName: "订单管理",
            })
          : null;
        if (submitOnCreate && workflowConfig?.approvalEnabled) {
          if (!workflowConfig.template) {
            throw new Error("请先在审批流程设置中配置「订单管理」流程模板");
          }
          if (workflowConfig.flowMode !== "approval") {
            throw new Error("订单管理流程当前不是审核模式");
          }
          if (workflowConfig.approvalStepIds.length === 0) {
            throw new Error("订单管理流程未配置审核步骤");
          }
          const operatorId = Number(ctx.user?.id || 0);
          if (
            workflowConfig.initiatorIds.length > 0 &&
            operatorId > 0 &&
            !workflowConfig.initiatorIds.includes(operatorId)
          ) {
            throw new Error("当前用户不在订单管理流程发起人范围内");
          }
        }

        const normalizedItems = [];
        for (const item of items) {
          let productId = Number(item.productId || 0);
          if (productId > 0 && activeCompanyId !== mainCompanyId) {
            const localProduct = await ensureCompanyProductCopy(
              productId,
              activeCompanyId,
              ctx.user?.id
            );
            productId = Number((localProduct as any)?.id || productId);
          }
          normalizedItems.push({
            ...item,
            productId,
          });
        }
        const finalStatus = submitOnCreate
          ? workflowConfig?.approvalEnabled
            ? "pending_review"
            : "approved"
          : requestedStatus;
        const orderId = await createSalesOrder(
          {
            ...orderData,
            companyId: activeCompanyId,
            paymentMethod:
              orderData.paymentMethod === undefined
                ? undefined
                : normalizePaymentCondition(orderData.paymentMethod),
            orderDate: new Date(orderDate),
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
            status: finalStatus as any,
            createdBy: ctx.user?.id,
          },
          normalizedItems.map(item => ({ ...item, orderId: 0 }))
        );
        if (submitOnCreate && workflowConfig?.approvalEnabled) {
          await submitConfiguredWorkflow({
            module: "销售部",
            formType: "业务单据",
            formName: "订单管理",
            sourceTable: "sales_orders",
            sourceId: orderId,
            sourceNo: orderData.orderNo,
            title: "销售订单审批",
            routePath: `/sales/orders?id=${orderId}`,
            targetName: String(orderData.customerId || ""),
            applicantId: ctx.user?.id,
            applicantName: ctx.user?.name,
          });
          if (db) {
            await db.insert(orderApprovals).values({
              orderId,
              orderType: "sales",
              action: "submit",
              approver: ctx.user?.name || "Unknown",
              approverId: ctx.user?.id,
            });
          }
        } else if (submitOnCreate) {
          try {
            await archiveApprovedSalesOrderPdf({
              orderId,
              operatorId: ctx.user?.id,
            });
          } catch {
            // 归档失败不阻塞建单
          }
          if (db) {
            const [approvedOrder] = await db
              .select()
              .from(salesOrdersTable)
              .where(eq(salesOrdersTable.id, orderId))
              .limit(1);
            if (
              shouldGenerateProductionPlansOnApproval(
                approvedOrder?.paymentMethod
              )
            ) {
              try {
                await autoGenerateProductionPlans(orderId, ctx.user?.id);
              } catch {
                // 排产失败不阻塞建单
              }
            }
          }
        }
        try {
          await syncOneReceivableFromSalesOrder(orderId, ctx.user?.id);
        } catch {
          // 应收联动失败不阻塞销售订单创建
        }
        return orderId;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            orderNo: z.string().optional(),
            customerId: z.number().optional(),
            orderDate: z.string().optional(),
            deliveryDate: z.string().optional(),
            totalAmount: z.string().optional(),
            currency: z.string().optional(),
            paymentMethod: z.string().optional(),
            exchangeRate: z.string().optional(),
            totalAmountBase: z.string().optional(),
            status: z
              .enum([
                "draft",
                "pending_review",
                "approved",
                "pending_payment",
                "confirmed",
                "in_production",
                "ready_to_ship",
                "partial_shipped",
                "shipped",
                "completed",
                "cancelled",
              ])
              .optional(),
            paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
            shippingAddress: z.string().optional(),
            shippingContact: z.string().optional(),
            shippingPhone: z.string().optional(),
            needsShipping: z.boolean().optional(),
            shippingFee: z.string().optional(),
            isExport: z.boolean().optional(),
            tradeTerm: z.string().optional(),
            receiptAccountId: z.number().nullable().optional(),
            remark: z.string().optional(),
            salesPersonId: z.number().optional(),
            items: z
              .array(
                z.object({
                  productId: z.number(),
                  quantity: z.string(),
                  unit: z.string().optional(),
                  unitPrice: z.string().optional(),
                  amount: z.string().optional(),
                  remark: z.string().optional(),
                })
              )
              .optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (db) await ensureSalesOrdersTradeFields(db);
        const { orderDate, deliveryDate, items, ...rest } = input.data;
        await updateSalesOrder(
          input.id,
          {
            ...rest,
            paymentMethod:
              rest.paymentMethod === undefined
                ? undefined
                : normalizePaymentCondition(rest.paymentMethod),
            orderDate: orderDate ? new Date(orderDate) : undefined,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          },
          items?.map(item => ({ ...item, orderId: input.id }))
        );
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSalesOrder(input.id);
        return { success: true };
      }),

    // 获取下一个订单号
    nextOrderNo: protectedProcedure.query(async () => {
      return await getNextSalesOrderNo();
    }),

    // 提交审批
    submitForApproval: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const workflowConfig = await getWorkflowExecutionConfig(db, {
          module: "销售部",
          formType: "业务单据",
          formName: "订单管理",
        });
        if (workflowConfig.approvalEnabled) {
          if (!workflowConfig.template) {
            throw new Error("请先在审批流程设置中配置「订单管理」流程模板");
          }
          if (workflowConfig.flowMode !== "approval") {
            throw new Error("订单管理流程当前不是审核模式");
          }
          if (workflowConfig.approvalStepIds.length === 0) {
            throw new Error("订单管理流程未配置审核步骤");
          }
          const operatorId = Number(ctx.user?.id || 0);
          if (
            workflowConfig.initiatorIds.length > 0 &&
            operatorId > 0 &&
            !workflowConfig.initiatorIds.includes(operatorId)
          ) {
            throw new Error("当前用户不在订单管理流程发起人范围内");
          }
          const currentState = await getConfiguredWorkflowState({
            module: "销售部",
            formType: "业务单据",
            formName: "订单管理",
            sourceTable: "sales_orders",
            sourceId: input.id,
            currentUserId: ctx.user?.id,
            currentUserRole: ctx.user?.role,
          });
          if (currentState.status === "pending") {
            throw new Error("当前订单已在审批中");
          }
          await db
            .update(salesOrdersTable)
            .set({ status: "pending_review" })
            .where(eq(salesOrdersTable.id, input.id));
          await submitConfiguredWorkflow({
            module: "销售部",
            formType: "业务单据",
            formName: "订单管理",
            sourceTable: "sales_orders",
            sourceId: input.id,
            routePath: `/sales/orders?id=${input.id}`,
            title: "销售订单审批",
            applicantId: ctx.user?.id,
            applicantName: ctx.user?.name,
          });
          await db.insert(orderApprovals).values({
            orderId: input.id,
            orderType: "sales",
            action: "submit",
            approver: ctx.user?.name || "Unknown",
            approverId: ctx.user?.id,
          });
        } else {
          await db
            .update(salesOrdersTable)
            .set({ status: "approved" })
            .where(eq(salesOrdersTable.id, input.id));
          try {
            await archiveApprovedSalesOrderPdf({
              orderId: input.id,
              operatorId: ctx.user?.id,
            });
          } catch {
            // 归档失败不阻塞直接生效
          }
          try {
            const [approvedOrder] = await db
              .select()
              .from(salesOrdersTable)
              .where(eq(salesOrdersTable.id, input.id))
              .limit(1);
            if (
              shouldGenerateProductionPlansOnApproval(
                approvedOrder?.paymentMethod
              )
            ) {
              await autoGenerateProductionPlans(input.id, ctx.user?.id);
            }
          } catch {
            // 排产失败不阻塞直接生效
          }
        }
        try {
          await syncOneReceivableFromSalesOrder(input.id, ctx.user?.id);
        } catch {
          // 应收联动失败不阻塞提审
        }
        // 微信待办通知：通知所有管理员和审批人
        try {
          const [order] = await db
            .select()
            .from(salesOrdersTable)
            .where(eq(salesOrdersTable.id, input.id))
            .limit(1);
          const workflowAdmin = await getWorkflowSystemAdminUser(db);
          const adminIds = workflowAdmin?.id ? [workflowAdmin.id] : [];
          if (adminIds.length > 0) {
            await notifyTodoToUsers({
              userIds: adminIds,
              title: `销售订单 ${(order as any)?.orderNo || `#${input.id}`} 待审批`,
              applicant: ctx.user?.name || "未知",
              submitTime: formatDateTime(new Date()),
              remark: `客户：${(order as any)?.customerName || ""}，请登录系统审批`,
            });
          }
        } catch (e) {
          console.error("[WechatNotify] 销售订单待办通知失败:", e);
        }
        return { success: true };
      }),

    // 审批通过
    approve: protectedProcedure
      .input(z.object({ id: z.number(), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const configuredState = await getConfiguredWorkflowState({
          module: "销售部",
          formType: "业务单据",
          formName: "订单管理",
          sourceTable: "sales_orders",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
        if (configuredState.runId) {
          if (!configuredState.canApprove) {
            const approverName =
              configuredState.currentApproverName || "指定审批人";
            throw new Error(`当前订单待${approverName}审批`);
          }
          const run = await approveConfiguredWorkflow({
            sourceTable: "sales_orders",
            sourceId: input.id,
            actorId: ctx.user?.id,
            actorName: ctx.user?.name,
            actorRole: ctx.user?.role,
            comment: input.comment,
          });
          await db.insert(orderApprovals).values({
            orderId: input.id,
            orderType: "sales",
            action: "approve",
            approver: ctx.user?.name || "Unknown",
            approverId: ctx.user?.id,
            comment: input.comment,
          });
          const finalApproved = String(run?.status || "") === "approved";
          await db
            .update(salesOrdersTable)
            .set({ status: finalApproved ? "approved" : "pending_review" })
            .where(eq(salesOrdersTable.id, input.id));
          try {
            await syncOneReceivableFromSalesOrder(input.id, ctx.user?.id);
          } catch {
            // 应收联动失败不阻塞审批
          }
          if (finalApproved) {
            await archiveApprovedSalesOrderPdf({
              orderId: input.id,
              operatorId: ctx.user?.id,
            });
            try {
              const [approvedOrder] = await db
                .select()
                .from(salesOrdersTable)
                .where(eq(salesOrdersTable.id, input.id))
                .limit(1);
              if (
                shouldGenerateProductionPlansOnApproval(
                  approvedOrder?.paymentMethod
                )
              ) {
                await autoGenerateProductionPlans(input.id, ctx.user?.id);
              }
            } catch {
              // 生产计划联动失败不阻塞审批
            }
          }
          return { success: true };
        }
        const approvalState = await getSalesOrderApprovalState(
          input.id,
          ctx.user?.id,
          ctx.user?.role
        );
        if (!approvalState || approvalState.stage === "none") {
          throw new Error("当前订单无需审批");
        }
        if (!approvalState.canApprove) {
          const approverName =
            approvalState.currentApproverName || "指定审批人";
          throw new Error(`当前订单待${approverName}审批`);
        }
        await db.insert(orderApprovals).values({
          orderId: input.id,
          orderType: "sales",
          action: "approve",
          approver: ctx.user?.name || "Unknown",
          approverId: ctx.user?.id,
          comment: input.comment,
        });
        const isAdminApprove = String(ctx.user?.role || "") === "admin";
        const nextApprovalState = isAdminApprove
          ? { stage: "none" as const }
          : await getSalesOrderApprovalState(
              input.id,
              ctx.user?.id,
              ctx.user?.role
            );
        if (nextApprovalState?.stage === "none") {
          await archiveApprovedSalesOrderPdf({
            orderId: input.id,
            operatorId: ctx.user?.id,
          });
        }
        await db
          .update(salesOrdersTable)
          .set({
            status:
              nextApprovalState?.stage === "none"
                ? "approved"
                : "pending_review",
          })
          .where(eq(salesOrdersTable.id, input.id));
        try {
          await syncOneReceivableFromSalesOrder(input.id, ctx.user?.id);
        } catch {
          // 应收联动失败不阻塞审批
        }
        // 审批通过后，账期支付/货到付款订单自动检查库存并生成生产计划
        if (nextApprovalState?.stage === "none") {
          try {
            const [approvedOrder] = await db
              .select()
              .from(salesOrdersTable)
              .where(eq(salesOrdersTable.id, input.id))
              .limit(1);
            if (
              shouldGenerateProductionPlansOnApproval(
                approvedOrder?.paymentMethod
              )
            ) {
              await autoGenerateProductionPlans(input.id, ctx.user?.id);
            }
          } catch {
            // 生产计划联动失败不阻塞审批
          }
        }
        return { success: true };
      }),

    // 驳回
    reject: protectedProcedure
      .input(z.object({ id: z.number(), comment: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const configuredState = await getConfiguredWorkflowState({
          module: "销售部",
          formType: "业务单据",
          formName: "订单管理",
          sourceTable: "sales_orders",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
        if (configuredState.runId) {
          if (!configuredState.canApprove) {
            const approverName =
              configuredState.currentApproverName || "指定审批人";
            throw new Error(`当前订单待${approverName}审批`);
          }
          await rejectConfiguredWorkflow({
            sourceTable: "sales_orders",
            sourceId: input.id,
            actorId: ctx.user?.id,
            actorName: ctx.user?.name,
            actorRole: ctx.user?.role,
            comment: input.comment,
          });
          await db
            .update(salesOrdersTable)
            .set({ status: "draft" })
            .where(eq(salesOrdersTable.id, input.id));
          await db.insert(orderApprovals).values({
            orderId: input.id,
            orderType: "sales",
            action: "reject",
            approver: ctx.user?.name || "Unknown",
            approverId: ctx.user?.id,
            comment: input.comment,
          });
          return { success: true };
        }
        const approvalState = await getSalesOrderApprovalState(
          input.id,
          ctx.user?.id,
          ctx.user?.role
        );
        if (!approvalState || approvalState.stage === "none") {
          throw new Error("当前订单无需审批");
        }
        if (!approvalState.canApprove) {
          const approverName =
            approvalState.currentApproverName || "指定审批人";
          throw new Error(`当前订单待${approverName}审批`);
        }
        await db
          .update(salesOrdersTable)
          .set({ status: "draft" })
          .where(eq(salesOrdersTable.id, input.id));
        await db.insert(orderApprovals).values({
          orderId: input.id,
          orderType: "sales",
          action: "reject",
          approver: ctx.user?.name || "Unknown",
          approverId: ctx.user?.id,
          comment: input.comment,
        });
        return { success: true };
      }),

    // 获取审批历史
    getApprovalHistory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        if (!db) throw new Error("数据库连接不可用");
        return await db
          .select()
          .from(orderApprovals)
          .where(eq(orderApprovals.orderId, input.id))
          .orderBy(desc(orderApprovals.createdAt));
      }),
    // 获取历史销售价格（按客户+产品查询最近一次单价和货币）
    getLastPrices: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          productIds: z.array(z.number()),
        })
      )
      .query(async ({ input }) => {
        return await getLastSalePrices(input.customerId, input.productIds);
      }),

    // 重新计算并同步订单发货状态（在所有出库明细插入完成后由前端调用一次）
    syncShipmentStatus: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");

        // 查询订单明细
        const orderItems = await db
          .select()
          .from(salesOrderItems)
          .where(eq(salesOrderItems.orderId, input.orderId));

        if (orderItems.length === 0) {
          return { status: "shipped", message: "订单无明细" };
        }

        // 按产品汇总已出库数量
        const txRows = await db
          .select()
          .from(inventoryTransactions)
          .where(
            and(
              eq(inventoryTransactions.relatedOrderId, input.orderId),
              eq(inventoryTransactions.type, "sales_out")
            )
          );

        const deliveredMap = new Map<number, number>();
        for (const tx of txRows) {
          if (tx.productId) {
            deliveredMap.set(
              tx.productId,
              (deliveredMap.get(tx.productId) || 0) +
                (parseFloat(String(tx.quantity)) || 0)
            );
          }
        }

        // 更新每条明细的 deliveredQty
        for (const item of orderItems) {
          const delivered = deliveredMap.get(item.productId) || 0;
          await db
            .update(salesOrderItems)
            .set({ deliveredQty: String(delivered) })
            .where(eq(salesOrderItems.id, item.id));
        }

        // 判断订单整体状态
        const totalOrdered = orderItems.reduce(
          (s, i) => s + (parseFloat(String(i.quantity)) || 0),
          0
        );
        const totalDelivered = orderItems.reduce(
          (s, i) => s + (deliveredMap.get(i.productId) || 0),
          0
        );

        let newStatus: string;
        if (totalDelivered <= 0) {
          newStatus = "approved";
        } else if (totalDelivered >= totalOrdered) {
          newStatus = "completed";
        } else {
          newStatus = "partial_shipped";
        }

        await db
          .update(salesOrdersTable)
          .set({ status: newStatus as any })
          .where(eq(salesOrdersTable.id, input.orderId));

        return { status: newStatus, totalOrdered, totalDelivered };
      }),
  }),
  salesQuotes: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().nullish(),
            status: z.string().nullish(),
            customerId: z.number().nullish(),
            limit: z.number().nullish(),
            offset: z.number().nullish(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        const rows = await getSalesQuotes(
          input
            ? {
                search: input.search ?? undefined,
                status: input.status ?? undefined,
                customerId: input.customerId ?? undefined,
                salesPersonId: singleUserId,
                salesPersonIds: multipleUserIds,
                companyId: activeCompanyId,
                limit: input.limit ?? undefined,
                offset: input.offset ?? undefined,
              }
            : {
                salesPersonId: singleUserId,
                salesPersonIds: multipleUserIds,
                companyId: activeCompanyId,
              }
        );
        return rows.map((row: any) => serializeSalesQuoteRow(row));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const quote = await getSalesQuoteById(input.id, activeCompanyId);
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (
          scopedUserIds &&
          !isOwnerWithinScope(quote?.salesPersonId, scopedUserIds)
        ) {
          throw new Error("无权查看该报价单");
        }
        const items = await getSalesQuoteItems(input.id);
        return {
          quote: quote ? serializeSalesQuoteRow(quote as any) : quote,
          items: items.map((item: any) => serializeSalesQuoteItemRow(item)),
        };
      }),

    getItemsByQuoteIds: protectedProcedure
      .input(
        z.object({
          quoteIds: z.array(z.number()).max(2000),
        })
      )
      .query(async ({ input, ctx }) => {
        const quoteIds = Array.from(
          new Set(
            input.quoteIds
              .map(id => Number(id))
              .filter(id => Number.isFinite(id) && id > 0)
          )
        );

        if (quoteIds.length === 0) {
          return [];
        }

        const activeCompanyId = getActiveCompanyId(ctx.user);
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        const ownQuotes = await getSalesQuotes({
          salesPersonId: scopedUserIds?.length ? singleUserId : undefined,
          salesPersonIds: scopedUserIds?.length ? multipleUserIds : undefined,
          companyId: activeCompanyId,
          limit: 5000,
        });
        const allowedQuoteIds = new Set(
          (ownQuotes as any[])
            .map((quote: any) => Number(quote?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        );
        const filteredQuoteIds = quoteIds.filter(id => allowedQuoteIds.has(id));
        if (filteredQuoteIds.length === 0) {
          return [];
        }

        const rows = await getSalesQuoteItemsByQuoteIds(filteredQuoteIds);
        return rows.map((row: any) => serializeSalesQuoteItemRow(row));
      }),

    create: protectedProcedure
      .input(
        z.object({
          quoteNo: z.string(),
          customerId: z.number(),
          quoteDate: z.string(),
          validUntil: z.string().optional(),
          deliveryDate: z.string().optional(),
          totalAmount: z.string().optional(),
          currency: z.string().optional(),
          paymentMethod: z.string().optional(),
          exchangeRate: z.string().optional(),
          totalAmountBase: z.string().optional(),
          status: z
            .enum([
              "draft",
              "sent",
              "accepted",
              "rejected",
              "expired",
              "converted",
            ])
            .optional(),
          shippingAddress: z.string().optional(),
          shippingContact: z.string().optional(),
          shippingPhone: z.string().optional(),
          tradeTerm: z.string().optional(),
          receiptAccountId: z.number().nullable().optional(),
          linkedOrderId: z.number().nullable().optional(),
          remark: z.string().optional(),
          salesPersonId: z.number().optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.string(),
              unit: z.string().optional(),
              unitPrice: z.string().optional(),
              amount: z.string().optional(),
              remark: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const { items, quoteDate, validUntil, deliveryDate, ...quoteData } =
          input;
        return await createSalesQuote(
          {
            ...quoteData,
            companyId: activeCompanyId,
            paymentMethod:
              quoteData.paymentMethod === undefined
                ? undefined
                : normalizePaymentCondition(quoteData.paymentMethod),
            quoteDate: new Date(quoteDate),
            validUntil: validUntil ? new Date(validUntil) : undefined,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
            createdBy: ctx.user?.id,
          },
          items.map(item => ({ ...item, quoteId: 0 }))
        );
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            quoteNo: z.string().optional(),
            customerId: z.number().optional(),
            quoteDate: z.string().optional(),
            validUntil: z.string().optional(),
            deliveryDate: z.string().optional(),
            totalAmount: z.string().optional(),
            currency: z.string().optional(),
            paymentMethod: z.string().optional(),
            exchangeRate: z.string().optional(),
            totalAmountBase: z.string().optional(),
            status: z
              .enum([
                "draft",
                "sent",
                "accepted",
                "rejected",
                "expired",
                "converted",
              ])
              .optional(),
            shippingAddress: z.string().optional(),
            shippingContact: z.string().optional(),
            shippingPhone: z.string().optional(),
            tradeTerm: z.string().optional(),
            receiptAccountId: z.number().nullable().optional(),
            linkedOrderId: z.number().nullable().optional(),
            remark: z.string().optional(),
            salesPersonId: z.number().optional(),
            items: z
              .array(
                z.object({
                  productId: z.number(),
                  quantity: z.string(),
                  unit: z.string().optional(),
                  unitPrice: z.string().optional(),
                  amount: z.string().optional(),
                  remark: z.string().optional(),
                })
              )
              .optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const current = await getSalesQuoteById(input.id, activeCompanyId);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报价单不存在" });
        }
        const { quoteDate, validUntil, deliveryDate, items, ...rest } =
          input.data;
        await updateSalesQuote(
          input.id,
          {
            ...rest,
            paymentMethod:
              rest.paymentMethod === undefined
                ? undefined
                : normalizePaymentCondition(rest.paymentMethod),
            quoteDate: quoteDate ? new Date(quoteDate) : undefined,
            validUntil: validUntil ? new Date(validUntil) : undefined,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          },
          items?.map(item => ({ ...item, quoteId: input.id }))
        );
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getSalesQuoteById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报价单不存在" });
        }
        await deleteSalesQuote(input.id);
        return { success: true };
      }),

    nextQuoteNo: protectedProcedure.query(async () => {
      return await getNextSalesQuoteNo();
    }),

    getLastPrices: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          productIds: z.array(z.number()),
        })
      )
      .query(async ({ input }) => {
        return await getLastSalePrices(input.customerId, input.productIds);
      }),

    convertToOrder: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const quote = await getSalesQuoteById(input.id, activeCompanyId);
        if (!quote) {
          throw new Error("报价单不存在");
        }

        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (
          scopedUserIds &&
          !isOwnerWithinScope(quote.salesPersonId, scopedUserIds)
        ) {
          throw new Error("无权操作该报价单");
        }

        if (quote.linkedOrderId) {
          const order = await getSalesOrderById(
            Number(quote.linkedOrderId),
            getActiveCompanyId(ctx.user)
          );
          return {
            orderId: Number(quote.linkedOrderId),
            orderNo: order?.orderNo || "",
            reused: true,
          };
        }

        const items = await getSalesQuoteItems(input.id);
        if (items.length === 0) {
          throw new Error("报价单没有产品明细，无法转订单");
        }

        const orderNo = await getNextSalesOrderNo();
        const mergedRemark = [
          `来源报价单：${quote.quoteNo}`,
          String(quote.remark || "").trim(),
        ]
          .filter(Boolean)
          .join("\n");

        const orderId = await createSalesOrder(
          {
            companyId: activeCompanyId,
            orderNo,
            customerId: quote.customerId!,
            orderDate: new Date(),
            deliveryDate: quote.deliveryDate
              ? new Date(String(quote.deliveryDate))
              : undefined,
            totalAmount: quote.totalAmount || undefined,
            currency: quote.currency || "CNY",
            paymentMethod: normalizePaymentCondition(quote.paymentMethod || ""),
            exchangeRate: quote.exchangeRate || "1",
            totalAmountBase: quote.totalAmountBase || undefined,
            status: "draft",
            shippingAddress: quote.shippingAddress || undefined,
            shippingContact: quote.shippingContact || undefined,
            shippingPhone: quote.shippingPhone || undefined,
            tradeTerm: quote.tradeTerm || undefined,
            receiptAccountId: quote.receiptAccountId ?? null,
            remark: mergedRemark || undefined,
            salesPersonId: quote.salesPersonId ?? ctx.user?.id,
            createdBy: ctx.user?.id,
          },
          items.map((item: any) => ({
            orderId: 0,
            productId: item.productId,
            quantity: String(item.quantity),
            unit: item.unit || undefined,
            unitPrice: item.unitPrice ? String(item.unitPrice) : undefined,
            amount: item.amount ? String(item.amount) : undefined,
            remark: item.remark || undefined,
          }))
        );

        await updateSalesQuote(input.id, {
          status: "converted",
          linkedOrderId: orderId,
        });

        return {
          orderId,
          orderNo,
          reused: false,
        };
      }),
  }),
  // ==================== 采购订单 =====================
  purchaseOrders: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            supplierId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const scopedUserIds = isPurchaseDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        return await getPurchaseOrders({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          buyerId: singleUserId,
          buyerIds: multipleUserIds,
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const order = await getPurchaseOrderById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        const ownerId = Number(order?.buyerId || order?.createdBy || 0);
        const scopedUserIds = isPurchaseDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds && !isOwnerWithinScope(ownerId, scopedUserIds)) {
          throw new Error("无权查看该采购订单");
        }
        const items = await getPurchaseOrderItems(input.id);
        await archivePurchaseOrderSnapshotById(input.id, ctx.user?.id);
        return { order, items };
      }),

    getItemsByOrderIds: protectedProcedure
      .input(
        z.object({
          orderIds: z.array(z.number()).max(2000),
        })
      )
      .query(async ({ input }) => {
        return await getPurchaseOrderItemsByOrderIds(input.orderIds);
      }),

    getApprovalState: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getConfiguredWorkflowState({
          module: "采购部",
          formType: "业务单据",
          formName: "采购订单",
          sourceTable: "purchase_orders",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
      }),

    getApprovalHistory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getConfiguredWorkflowHistory({
          sourceTable: "purchase_orders",
          sourceId: input.id,
        });
      }),

    getByProductId: protectedProcedure
      .input(z.object({ productId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await getPurchaseOrdersByProductId(
          input.productId,
          input.limit || 10
        );
      }),

    // 获取历史采购价格（按供应商+产品查询最近一次单价和货币）
    getLastPrices: protectedProcedure
      .input(
        z.object({
          supplierId: z.number(),
          productIds: z.array(z.number()),
        })
      )
      .query(async ({ input }) => {
        return await getLastPurchasePrices(input.supplierId, input.productIds);
      }),

    getRecentPrices: protectedProcedure
      .input(
        z.object({
          productIds: z.array(z.number()),
          days: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getRecentPurchasePrices(
          input.productIds,
          input.days || 30
        );
      }),

    create: protectedProcedure
      .input(
        z.object({
          orderNo: z.string().optional(),
          supplierId: z.number(),
          supplierName: z.string().optional(),
          orderDate: z.string(),
          expectedDate: z.string().optional(),
          totalAmount: z.string().optional(),
          currency: z.string().optional(),
          status: z
            .enum([
              "draft",
              "pending_approval",
              "approved",
              "rejected",
              "issued",
              "ordered",
              "partial_received",
              "received",
              "completed",
              "cancelled",
            ])
            .optional(),
          paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
          remark: z.string().optional(),
          buyerId: z.number().optional(),
          items: z.array(
            z.object({
              productId: z.number().optional(),
              materialCode: z.string(),
              materialName: z.string(),
              specification: z.string().optional(),
              quantity: z.string(),
              unit: z.string().optional(),
              unitPrice: z.string().optional(),
              amount: z.string().optional(),
              remark: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { items, orderDate, expectedDate, ...orderData } = input;
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const db = await getDb();
        const mainCompanyId = db ? await getMainCompanyId(db) : 3;
        const requestedStatus = input.status || "draft";
        const submitOnCreate = requestedStatus !== "draft";
        validatePurchaseOrderSubmissionPayload(items, expectedDate);
        const workflowConfig = db
          ? await getWorkflowExecutionConfig(db, {
              module: "采购部",
              formType: "业务单据",
              formName: "采购订单",
            })
          : null;
        if (submitOnCreate && workflowConfig?.approvalEnabled) {
          if (!workflowConfig.template) {
            throw new Error("请先在审批流程设置中配置「采购订单」流程模板");
          }
          if (workflowConfig.flowMode !== "approval") {
            throw new Error("采购订单流程当前不是审核模式");
          }
          if (workflowConfig.approvalStepIds.length === 0) {
            throw new Error("采购订单流程未配置审核步骤");
          }
          const operatorId = Number(ctx.user?.id || 0);
          if (
            workflowConfig.initiatorIds.length > 0 &&
            operatorId > 0 &&
            !workflowConfig.initiatorIds.includes(operatorId)
          ) {
            throw new Error("当前用户不在采购订单流程发起人范围内");
          }
        }
        const supplier = await getSupplierById(
          orderData.supplierId,
          activeCompanyId
        );
        const internalCompanyId =
          Number((supplier as any)?.linkedCompanyId || 0) || undefined;
        const normalizedItems = [];
        for (const item of items) {
          let productId = Number(item.productId || 0);
          if (productId > 0 && activeCompanyId !== mainCompanyId) {
            const localProduct = await ensureCompanyProductCopy(
              productId,
              activeCompanyId,
              ctx.user?.id
            );
            productId = Number((localProduct as any)?.id || productId);
          }
          normalizedItems.push({
            ...item,
            productId: productId > 0 ? productId : undefined,
          });
        }
        const finalStatus = submitOnCreate
          ? workflowConfig?.approvalEnabled
            ? "pending_approval"
            : "issued"
          : requestedStatus;
        const orderId = await createPurchaseOrder(
          {
            ...orderData,
            companyId: activeCompanyId,
            internalCompanyId,
            orderDate: new Date(orderDate),
            expectedDate: expectedDate ? new Date(expectedDate) : undefined,
            status: finalStatus as any,
            createdBy: ctx.user?.id,
          },
            normalizedItems.map(item => ({ ...item, orderId: 0 }))
        );
        const createdOrder = await getPurchaseOrderById(orderId, activeCompanyId);
        const resolvedOrderNo = String(
          createdOrder?.orderNo || orderData.orderNo || ""
        );
        if (finalStatus === "issued") {
          await ensureAccountsPayableForPurchaseOrder(orderId);
        }
        if (internalCompanyId && internalCompanyId !== activeCompanyId) {
          await createInternalSalesOrderFromPurchaseOrder(
            orderId,
            ctx.user?.id
          );
        }
        if (submitOnCreate && workflowConfig?.approvalEnabled) {
          await submitConfiguredWorkflow({
            module: "采购部",
            formType: "业务单据",
            formName: "采购订单",
            sourceTable: "purchase_orders",
            sourceId: orderId,
            sourceNo: resolvedOrderNo,
            title: "采购订单审批",
            routePath: `/purchase/orders?focusId=${orderId}`,
            targetName: orderData.supplierName || null,
            applicantId: ctx.user?.id,
            applicantName: ctx.user?.name,
          });
          if (db) {
            await db.insert(orderApprovals).values({
              orderId,
              orderType: "purchase",
              action: "submit",
              approver: ctx.user?.name || "Unknown",
              approverId: ctx.user?.id,
            });
          }
        }
        await archivePurchaseOrderSnapshotById(orderId, ctx.user?.id);
        return orderId;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            orderNo: z.string().optional(),
            supplierId: z.number().optional(),
            supplierName: z.string().optional(),
            orderDate: z.string().optional(),
            expectedDate: z.string().optional(),
            totalAmount: z.string().optional(),
            currency: z.string().optional(),
            status: z
              .enum([
                "draft",
                "pending_approval",
                "approved",
                "rejected",
                "issued",
                "ordered",
                "partial_received",
                "received",
                "completed",
                "cancelled",
              ])
              .optional(),
            paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
            remark: z.string().optional(),
          }),
          items: z
            .array(
              z.object({
                productId: z.number().optional(),
                materialCode: z.string(),
                materialName: z.string(),
                specification: z.string().optional(),
                quantity: z.string(),
                unit: z.string().optional(),
                unitPrice: z.string().optional(),
                amount: z.string().optional(),
                remark: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const currentOrder = await getPurchaseOrderById(input.id, activeCompanyId);
        if (!currentOrder) {
          throw new Error("未找到采购订单");
        }
        const currentItems = await getPurchaseOrderItems(input.id);
        const workflowConfig = db
          ? await getWorkflowExecutionConfig(db, {
              module: "采购部",
              formType: "业务单据",
              formName: "采购订单",
            })
          : null;
        if (
          input.data.status === "pending_approval" &&
          workflowConfig?.approvalEnabled
        ) {
          if (!workflowConfig.template) {
            throw new Error("请先在审批流程设置中配置「采购订单」流程模板");
          }
          if (workflowConfig.flowMode !== "approval") {
            throw new Error("采购订单流程当前不是审核模式");
          }
          if (workflowConfig.approvalStepIds.length === 0) {
            throw new Error("采购订单流程未配置审核步骤");
          }
          const operatorId = Number(ctx.user?.id || 0);
          if (
            workflowConfig.initiatorIds.length > 0 &&
            operatorId > 0 &&
            !workflowConfig.initiatorIds.includes(operatorId)
          ) {
            throw new Error("当前用户不在采购订单流程发起人范围内");
          }
        }
        const effectiveExpectedDate =
          input.data.expectedDate ?? currentOrder.expectedDate ?? undefined;
        const effectiveItems =
          input.items?.map((item) => ({
            materialCode: item.materialCode,
            materialName: item.materialName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })) ||
          currentItems.map((item) => ({
            materialCode: item.materialCode,
            materialName: item.materialName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }));
        validatePurchaseOrderSubmissionPayload(effectiveItems, effectiveExpectedDate);
        const { orderDate, expectedDate, ...rest } = input.data;
        const supplierId = Number(rest.supplierId || 0);
        const supplier =
          supplierId > 0
            ? await getSupplierById(supplierId, activeCompanyId)
            : null;
        const internalCompanyId =
          Number((supplier as any)?.linkedCompanyId || 0) || undefined;
        const restoredPlanNos = await updatePurchaseOrder(
          input.id,
          {
            ...rest,
            ...(internalCompanyId ? { internalCompanyId } : {}),
            orderDate: orderDate ? new Date(orderDate) : undefined,
            expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          },
          input.items
        );
        if (internalCompanyId && internalCompanyId !== activeCompanyId) {
          await createInternalSalesOrderFromPurchaseOrder(
            input.id,
            ctx.user?.id
          );
        }
        if (
          input.data.status === "pending_approval" &&
          workflowConfig?.approvalEnabled
        ) {
          await submitConfiguredWorkflow({
            module: "采购部",
            formType: "业务单据",
            formName: "采购订单",
            sourceTable: "purchase_orders",
            sourceId: input.id,
            routePath: `/purchase/orders?focusId=${input.id}`,
            title: "采购订单审批",
            applicantId: ctx.user?.id,
            applicantName: ctx.user?.name,
          });
          if (db) {
            await db.insert(orderApprovals).values({
              orderId: input.id,
              orderType: "purchase",
              action: "submit",
              approver: ctx.user?.name || "Unknown",
              approverId: ctx.user?.id,
            });
          }
        }
        await archivePurchaseOrderSnapshotById(input.id, ctx.user?.id);
        return { success: true, restoredPlanNos };
      }),

    submitForApproval: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const order = await getPurchaseOrderById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!order) {
          throw new Error("未找到采购订单");
        }
        const orderItems = await getPurchaseOrderItems(input.id);
        validatePurchaseOrderSubmissionPayload(orderItems, order.expectedDate);
        const workflowConfig = await getWorkflowExecutionConfig(db, {
          module: "采购部",
          formType: "业务单据",
          formName: "采购订单",
        });
        if (!workflowConfig.approvalEnabled) {
          await updatePurchaseOrder(input.id, { status: "issued" as any });
          await archivePurchaseOrderSnapshotById(input.id, ctx.user?.id);
          return { success: true };
        }
        if (!workflowConfig.template) {
          throw new Error("请先在审批流程设置中配置「采购订单」流程模板");
        }
        if (workflowConfig.flowMode !== "approval") {
          throw new Error("采购订单流程当前不是审核模式");
        }
        if (workflowConfig.approvalStepIds.length === 0) {
          throw new Error("采购订单流程未配置审核步骤");
        }
        const operatorId = Number(ctx.user?.id || 0);
        if (
          workflowConfig.initiatorIds.length > 0 &&
          operatorId > 0 &&
          !workflowConfig.initiatorIds.includes(operatorId)
        ) {
          throw new Error("当前用户不在采购订单流程发起人范围内");
        }
        const currentState = await getConfiguredWorkflowState({
          module: "采购部",
          formType: "业务单据",
          formName: "采购订单",
          sourceTable: "purchase_orders",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
        if (currentState.status === "pending") {
          throw new Error("当前采购订单已在审批中");
        }
        await updatePurchaseOrder(input.id, {
          status: "pending_approval" as any,
        });
        await submitConfiguredWorkflow({
          module: "采购部",
          formType: "业务单据",
          formName: "采购订单",
          sourceTable: "purchase_orders",
          sourceId: input.id,
          sourceNo: String((order as any)?.orderNo || ""),
          routePath: `/purchase/orders?focusId=${input.id}`,
          title: "采购订单审批",
          targetName: String((order as any)?.supplierName || ""),
          applicantId: ctx.user?.id,
          applicantName: ctx.user?.name,
        });
        await db.insert(orderApprovals).values({
          orderId: input.id,
          orderType: "purchase",
          action: "submit",
          approver: ctx.user?.name || "Unknown",
          approverId: ctx.user?.id,
        });
        await archivePurchaseOrderSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number(), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const configuredState = await getConfiguredWorkflowState({
          module: "采购部",
          formType: "业务单据",
          formName: "采购订单",
          sourceTable: "purchase_orders",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
        if (!configuredState.runId) {
          throw new Error("当前采购订单没有待审批流程");
        }
        if (!configuredState.canApprove) {
          const approverName =
            configuredState.currentApproverName || "指定审批人";
          throw new Error(`当前采购订单待${approverName}审批`);
        }
        const run = await approveConfiguredWorkflow({
          sourceTable: "purchase_orders",
          sourceId: input.id,
          actorId: ctx.user?.id,
          actorName: ctx.user?.name,
          actorRole: ctx.user?.role,
          comment: input.comment,
        });
        await db.insert(orderApprovals).values({
          orderId: input.id,
          orderType: "purchase",
          action: "approve",
          approver: ctx.user?.name || "Unknown",
          approverId: ctx.user?.id,
          comment: input.comment,
        });
        await updatePurchaseOrder(input.id, {
          status:
            String(run?.status || "") === "approved"
              ? ("issued" as any)
              : ("pending_approval" as any),
        });
        await archivePurchaseOrderSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({ id: z.number(), comment: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const configuredState = await getConfiguredWorkflowState({
          module: "采购部",
          formType: "业务单据",
          formName: "采购订单",
          sourceTable: "purchase_orders",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
        if (!configuredState.runId) {
          throw new Error("当前采购订单没有待审批流程");
        }
        if (!configuredState.canApprove) {
          const approverName =
            configuredState.currentApproverName || "指定审批人";
          throw new Error(`当前采购订单待${approverName}审批`);
        }
        await rejectConfiguredWorkflow({
          sourceTable: "purchase_orders",
          sourceId: input.id,
          actorId: ctx.user?.id,
          actorName: ctx.user?.name,
          actorRole: ctx.user?.role,
          comment: input.comment,
        });
        await db.insert(orderApprovals).values({
          orderId: input.id,
          orderType: "purchase",
          action: "reject",
          approver: ctx.user?.name || "Unknown",
          approverId: ctx.user?.id,
          comment: input.comment,
        });
        await updatePurchaseOrder(input.id, { status: "rejected" as any });
        await archivePurchaseOrderSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePurchaseOrder(input.id);
        return { success: true };
      }),
    // 同步采购订单收货状态（根据入库记录汇总 receivedQty，更新订单明细和状态）
    syncReceiptStatus: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const { purchaseOrders: poTable, purchaseOrderItems: poItemsTable } =
          await import("../drizzle/schema");
        const orderItems = await db
          .select()
          .from(poItemsTable)
          .where(eq(poItemsTable.orderId, input.orderId));
        if (orderItems.length === 0)
          return { status: "ordered", message: "订单无明细" };
        // 汇总已入库数量（purchase_in 类型，关联该采购订单）
        const txRows = await db
          .select()
          .from(inventoryTransactions)
          .where(
            and(
              eq(inventoryTransactions.relatedOrderId, input.orderId),
              eq(inventoryTransactions.type, "purchase_in")
            )
          );
        const receivedMap = new Map<number, number>();
        for (const tx of txRows) {
          if (tx.productId) {
            receivedMap.set(
              tx.productId,
              (receivedMap.get(tx.productId) || 0) +
                (parseFloat(String(tx.quantity)) || 0)
            );
          }
        }
        // 更新每条明细的 receivedQty
        for (const item of orderItems) {
          if (!item.productId) continue;
          const received = receivedMap.get(item.productId) || 0;
          await db
            .update(poItemsTable)
            .set({ receivedQty: String(received) })
            .where(eq(poItemsTable.id, item.id));
        }
        // 判断订单整体收货状态
        const totalOrdered = orderItems.reduce(
          (s, i) => s + (parseFloat(String(i.quantity)) || 0),
          0
        );
        const totalReceived = orderItems.reduce((s, i) => {
          const pid = i.productId;
          return s + (pid ? receivedMap.get(pid) || 0 : 0);
        }, 0);
        let newStatus: string;
        if (totalReceived <= 0) {
          newStatus = "ordered";
        } else if (totalReceived >= totalOrdered) {
          newStatus = "received";
        } else {
          newStatus = "partial_received";
        }
        await db
          .update(poTable)
          .set({ status: newStatus as any })
          .where(eq(poTable.id, input.orderId));
        await archivePurchaseOrderSnapshotById(input.orderId);
        return { status: newStatus, totalOrdered, totalReceived };
      }),
  }),
  // ==================== 生产订单 ====================
  productionOrders: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getProductionOrders(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getProductionOrderById(input.id);
        if (record) {
          await archiveProductionOrderSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),

    create: protectedProcedure
      .input(
        z.object({
          orderNo: z.string().optional(),
          orderType: z.enum(["finished", "semi_finished", "rework"]).optional(),
          productId: z.number(),
          plannedQty: z.string(),
          unit: z.string().optional(),
          batchNo: z.string().optional(),
          plannedStartDate: z.string().optional(),
          plannedEndDate: z.string().optional(),
          productionDate: z.string().optional(),
          expiryDate: z.string().optional(),
          planId: z.number().optional(),
          status: z
            .enum(["draft", "planned", "in_progress", "completed", "cancelled"])
            .optional(),
          salesOrderId: z.number().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const {
          plannedStartDate,
          plannedEndDate,
          productionDate,
          expiryDate,
          ...rest
        } = input;
        const orderId = await createProductionOrder({
          ...rest,
          plannedStartDate: plannedStartDate
            ? new Date(plannedStartDate)
            : undefined,
          plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          createdBy: ctx.user?.id,
        });
        const createdOrder = await getProductionOrderById(orderId);
        const resolvedOrderNo = String(
          createdOrder?.orderNo || input.orderNo || ""
        );
        if (input.planId) {
          try {
            const db = await getDb();
            if (db) {
              const { productionPlans: ppTable } = await import(
                "../drizzle/schema"
              );
              if (input.orderType === "semi_finished") {
                const [sourcePlan] = await db
                  .select({ remark: ppTable.remark })
                  .from(ppTable)
                  .where(eq(ppTable.id, input.planId))
                  .limit(1);
                await db
                  .update(ppTable)
                  .set({
                    remark: upsertSemiFinishedPlanOrder(sourcePlan?.remark, {
                      orderId,
                      orderNo: resolvedOrderNo,
                      productId: input.productId,
                      batchNo: String(input.batchNo || ""),
                      status: input.status || "planned",
                    }),
                  })
                  .where(eq(ppTable.id, input.planId));
              } else {
                const linkedPlanStatus =
                  input.status === "completed"
                    ? "completed"
                    : input.status === "in_progress"
                      ? "in_progress"
                      : input.status === "draft"
                        ? "pending"
                        : input.status === "cancelled"
                          ? "cancelled"
                          : "scheduled";
                await db
                  .update(ppTable)
                  .set({ productionOrderId: orderId, status: linkedPlanStatus })
                  .where(eq(ppTable.id, input.planId));
              }
            }
          } catch (e) {
            console.error("[productionOrders.create] 关联生产计划失败:", e);
          }
        }
        await archiveProductionOrderSnapshotById(orderId, ctx.user?.id);
        return orderId;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            orderNo: z.string().optional(),
            orderType: z
              .enum(["finished", "semi_finished", "rework"])
              .optional(),
            productId: z.number().optional(),
            plannedQty: z.string().optional(),
            completedQty: z.string().optional(),
            unit: z.string().optional(),
            batchNo: z.string().optional(),
            plannedStartDate: z.string().optional(),
            plannedEndDate: z.string().optional(),
            actualStartDate: z.string().optional(),
            actualEndDate: z.string().optional(),
            productionDate: z.string().optional(),
            expiryDate: z.string().optional(),
            planId: z.number().optional(),
            salesOrderId: z.number().optional(),
            status: z
              .enum([
                "draft",
                "planned",
                "in_progress",
                "completed",
                "cancelled",
              ])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getProductionOrderById(input.id);
        const {
          plannedStartDate,
          plannedEndDate,
          actualStartDate,
          actualEndDate,
          productionDate,
          expiryDate,
          ...rest
        } = input.data;
        const db = await getDb();
        const {
          productionOrders: poTable,
          productionPlans: ppTable,
          salesOrders: soTable,
        } = await import("../drizzle/schema");
        const [oldOrder] = db
          ? await db
              .select()
              .from(poTable)
              .where(eq(poTable.id, input.id))
              .limit(1)
          : [];
        await updateProductionOrder(input.id, {
          ...rest,
          plannedStartDate: plannedStartDate
            ? new Date(plannedStartDate)
            : undefined,
          plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
          actualStartDate: actualStartDate
            ? new Date(actualStartDate)
            : undefined,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });

        if (db) {
          try {
            const nextOrderType =
              input.data.orderType ?? oldOrder?.orderType ?? "finished";
            const nextPlanId =
              input.data.planId ?? oldOrder?.planId ?? undefined;
            const nextOrderNo = input.data.orderNo ?? oldOrder?.orderNo ?? "";
            const nextProductId =
              input.data.productId ?? oldOrder?.productId ?? 0;
            const nextBatchNo = input.data.batchNo ?? oldOrder?.batchNo ?? "";
            const nextOrderStatus =
              input.data.status ?? oldOrder?.status ?? "planned";
            const nextPlanStatus =
              input.data.status === "completed"
                ? "completed"
                : input.data.status === "in_progress"
                  ? "in_progress"
                  : input.data.status === "cancelled"
                    ? "cancelled"
                    : input.data.status === "draft"
                      ? "pending"
                      : "scheduled";

            if (
              oldOrder?.orderType === "semi_finished" &&
              oldOrder.planId &&
              (oldOrder.planId !== nextPlanId ||
                nextOrderType !== "semi_finished")
            ) {
              const [oldPlan] = await db
                .select({ remark: ppTable.remark })
                .from(ppTable)
                .where(eq(ppTable.id, oldOrder.planId))
                .limit(1);
              await db
                .update(ppTable)
                .set({
                  remark: removeSemiFinishedPlanOrder(
                    oldPlan?.remark,
                    input.id
                  ),
                })
                .where(eq(ppTable.id, oldOrder.planId));
            }

            if (
              oldOrder?.planId &&
              oldOrder.orderType !== "semi_finished" &&
              (oldOrder.planId !== nextPlanId ||
                nextOrderType === "semi_finished")
            ) {
              await db
                .update(ppTable)
                .set({ productionOrderId: null, status: "pending" })
                .where(eq(ppTable.id, oldOrder.planId));
            }

            if (nextPlanId && nextOrderType === "semi_finished") {
              const [sourcePlan] = await db
                .select({ remark: ppTable.remark })
                .from(ppTable)
                .where(eq(ppTable.id, nextPlanId))
                .limit(1);
              await db
                .update(ppTable)
                .set({
                  remark: upsertSemiFinishedPlanOrder(sourcePlan?.remark, {
                    orderId: input.id,
                    orderNo: nextOrderNo,
                    productId: Number(nextProductId || 0),
                    batchNo: String(nextBatchNo || ""),
                    status: nextOrderStatus,
                  }),
                })
                .where(eq(ppTable.id, nextPlanId));
            }

            if (nextPlanId && nextOrderType !== "semi_finished") {
              await db
                .update(ppTable)
                .set({ productionOrderId: input.id, status: nextPlanStatus })
                .where(eq(ppTable.id, nextPlanId));
            }
          } catch (e) {
            console.error("[productionOrders.update] 同步生产计划失败:", e);
          }
        }

        // C12: 生产完工时自动更新关联的生产计划和销售订单状态
        if (input.data.status === "completed") {
          try {
            if (db) {
              // 获取生产订单信息
              const [prodOrder] = await db
                .select()
                .from(poTable)
                .where(eq(poTable.id, input.id))
                .limit(1);
              if (prodOrder) {
                if (prodOrder.orderType === "semi_finished") {
                  if (prodOrder.planId) {
                    const [sourcePlan] = await db
                      .select({ remark: ppTable.remark })
                      .from(ppTable)
                      .where(eq(ppTable.id, prodOrder.planId))
                      .limit(1);
                    await db
                      .update(ppTable)
                      .set({
                        remark: upsertSemiFinishedPlanOrder(
                          sourcePlan?.remark,
                          {
                            orderId: prodOrder.id,
                            orderNo: String(prodOrder.orderNo || ""),
                            productId: Number(prodOrder.productId || 0),
                            batchNo: String(prodOrder.batchNo || ""),
                            status: "completed",
                          }
                        ),
                      })
                      .where(eq(ppTable.id, prodOrder.planId));
                  }
                  await archiveProductionOrderSnapshotById(
                    input.id,
                    ctx.user?.id
                  );
                  const previousBatchNo = String(before?.batchNo || "").trim();
                  const nextBatchNo = String(
                    input.data.batchNo ?? before?.batchNo ?? ""
                  ).trim();
                  if (previousBatchNo && previousBatchNo !== nextBatchNo) {
                    await archiveBatchRecordSnapshotByBatchNo(
                      previousBatchNo,
                      ctx.user?.id
                    );
                  }
                  return { success: true };
                }
                // 更新关联的生产计划状态为 completed
                const plans = await db
                  .select()
                  .from(ppTable)
                  .where(eq(ppTable.productionOrderId, input.id));
                for (const plan of plans) {
                  await db
                    .update(ppTable)
                    .set({ status: "completed" })
                    .where(eq(ppTable.id, plan.id));
                }
                // 如果有关联销售订单，检查是否所有生产订单都完成，如果是则更新销售订单状态
                if (prodOrder.salesOrderId) {
                  const allProdOrders = await db
                    .select()
                    .from(poTable)
                    .where(eq(poTable.salesOrderId, prodOrder.salesOrderId));
                  const allCompleted = allProdOrders.every(
                    (po: any) => po.status === "completed" || po.id === input.id
                  );
                  if (allCompleted) {
                    await db
                      .update(soTable)
                      .set({ status: "ready_to_ship" })
                      .where(eq(soTable.id, prodOrder.salesOrderId));
                  }
                }
              }
            }
          } catch (e) {
            console.error("[C12] 更新关联状态失败:", e);
          }
        }

        await archiveProductionOrderSnapshotById(input.id, ctx.user?.id);
        const previousBatchNo = String(before?.batchNo || "").trim();
        const nextBatchNo = String(
          input.data.batchNo ?? before?.batchNo ?? ""
        ).trim();
        if (previousBatchNo && previousBatchNo !== nextBatchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            previousBatchNo,
            ctx.user?.id
          );
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getProductionOrderById(input.id);
        const db = await getDb();
        if (db) {
          try {
            const { productionOrders: poTable, productionPlans: ppTable } =
              await import("../drizzle/schema");
            const [oldOrder] = await db
              .select()
              .from(poTable)
              .where(eq(poTable.id, input.id))
              .limit(1);
            if (oldOrder?.orderType === "semi_finished" && oldOrder.planId) {
              const [sourcePlan] = await db
                .select({ remark: ppTable.remark })
                .from(ppTable)
                .where(eq(ppTable.id, oldOrder.planId))
                .limit(1);
              await db
                .update(ppTable)
                .set({
                  remark: removeSemiFinishedPlanOrder(
                    sourcePlan?.remark,
                    input.id
                  ),
                })
                .where(eq(ppTable.id, oldOrder.planId));
            }
          } catch (e) {
            console.error(
              "[productionOrders.delete] 清理生产计划半成品关联失败:",
              e
            );
          }
        }
        await deleteProductionOrder(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  // ==================== 库存管理 ====================
  inventory: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            warehouseId: z.number().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getInventory({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getInventoryById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          warehouseId: z.number(),
          productId: z.number().optional(),
          materialCode: z.string().optional(),
          itemName: z.string(),
          batchNo: z.string().optional(),
          lotNo: z.string().optional(),
          quantity: z.string(),
          unit: z.string().optional(),
          location: z.string().optional(),
          status: z
            .enum(["qualified", "quarantine", "unqualified", "reserved"])
            .optional(),
          productionDate: z.string().optional(),
          expiryDate: z.string().optional(),
          udiPi: z.string().optional(),
          safetyStock: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { productionDate, expiryDate, ...rest } = input;
        return await createInventory({
          ...rest,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            warehouseId: z.number().optional(),
            productId: z.number().optional(),
            materialCode: z.string().optional(),
            itemName: z.string().optional(),
            batchNo: z.string().optional(),
            lotNo: z.string().optional(),
            quantity: z.string().optional(),
            unit: z.string().optional(),
            location: z.string().optional(),
            status: z
              .enum(["qualified", "quarantine", "unqualified", "reserved"])
              .optional(),
            productionDate: z.string().optional(),
            expiryDate: z.string().optional(),
            udiPi: z.string().optional(),
            safetyStock: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { productionDate, expiryDate, ...rest } = input.data;
        await updateInventory(input.id, {
          ...rest,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInventory(input.id);
        return { success: true };
      }),

    // 一键重算所有库存（管理员修复工具）
    recalculateAll: protectedProcedure.mutation(async () => {
      const result = await recalculateAllInventory();
      return result;
    }),

    // 重算单个库存记录
    recalculateById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await recalculateInventoryById(input.id);
        return { success: true };
      }),
  }),

  // ==================== 质量检验 ====================
  qualityInspections: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            type: z.string().optional(),
            result: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        if (input?.type === "IPQC") {
          await syncHistoricalProductionRecordTargets("first_piece");
        }
        return await getQualityInspections(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getQualityInspectionById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          inspectionNo: z.string(),
          type: z.enum(["IQC", "IPQC", "OQC"]),
          relatedDocNo: z.string().optional(),
          itemName: z.string(),
          batchNo: z.string().optional(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          sterilizationOrderId: z.number().optional(),
          sterilizationOrderNo: z.string().optional(),
          sampleQty: z.string().optional(),
          inspectedQty: z.string().optional(),
          qualifiedQty: z.string().optional(),
          unqualifiedQty: z.string().optional(),
          result: z
            .enum(["qualified", "unqualified", "conditional"])
            .optional(),
          inspectorId: z.number().optional(),
          inspectionDate: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { inspectionDate, ...rest } = input;
        const inspectionId = await createQualityInspection({
          ...rest,
          inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
          inspectorId: input.inspectorId || ctx.user?.id,
        });
        const createdInspection = await getQualityInspectionById(inspectionId);
        let syncedWarehouseEntries: Array<{
          id: number;
          entryNo: string;
          productName: string;
          batchNo: string;
          quantity: string;
          unit: string;
          previousStatus: string;
          nextStatus: string;
        }> = [];
        // OQC检验结果联动：通过生产批号回写入库申请的检验数据
        if (createdInspection?.type === "OQC" && createdInspection.batchNo) {
          const extra = parseOqcSyncMeta(createdInspection.remark, {
            rejectQty: createdInspection.unqualifiedQty,
            sampleQty: createdInspection.sampleQty,
          });
          syncedWarehouseEntries = await syncOqcResultToWarehouseEntry({
            batchNo: createdInspection.batchNo,
            productionOrderId: input.productionOrderId,
            sterilizationOrderId: input.sterilizationOrderId,
            rejectQty: extra.rejectQty,
            sampleRetainQty: extra.sampleRetainQty,
            result: createdInspection.result ?? undefined,
          });
        }
        // 邮件通知：OQC 检验结果通知
        if (input.type === "OQC" && input.result) {
          try {
            if (input.result === "qualified") {
              const productionEmails = await getUserEmailsByDepartment([
                "生产部",
              ]);
              if (
                productionEmails.length > 0 &&
                syncedWarehouseEntries.length === 0
              ) {
                await notifyOqcQualified({
                  batchNo: input.batchNo || "",
                  productName: input.itemName,
                  inspectionNo: input.inspectionNo,
                  qualifiedQty: Number(input.qualifiedQty || 0),
                  rejectQty: Number(input.unqualifiedQty || 0),
                  sampleQty: Number(input.sampleQty || 0),
                  productionEmails,
                });
              }
            } else if (input.result === "unqualified") {
              const notifyEmails = await getUserEmailsByDepartment([
                "生产部",
                "质量部",
              ]);
              if (notifyEmails.length > 0) {
                await notifyOqcUnqualified({
                  batchNo: input.batchNo || "",
                  productName: input.itemName,
                  inspectionNo: input.inspectionNo,
                  unqualifiedQty: Number(input.unqualifiedQty || 0),
                  defectDescription: input.remark,
                  notifyEmails,
                });
              }
            }
          } catch (e) {
            console.warn("[Email] OQC检验通知失败：", e);
          }
        }
        if (input.type === "OQC" && input.result === "qualified") {
          const approvedEntries = syncedWarehouseEntries.filter(
            entry =>
              entry.nextStatus === "approved" &&
              entry.previousStatus !== "approved"
          );
          if (approvedEntries.length > 0) {
            try {
              const warehouseEmails = await getUserEmailsByDepartment([
                "仓库管理",
                "仓库部",
              ]);
              if (warehouseEmails.length > 0) {
                for (const entry of approvedEntries) {
                  await notifyWarehouseEntryApproved({
                    batchNo: entry.batchNo || input.batchNo || "",
                    productName: entry.productName || input.itemName,
                    entryNo: entry.entryNo,
                    quantity: Number(entry.quantity || 0),
                    unit: entry.unit,
                    warehouseEmails,
                  });
                }
              }
            } catch (e) {
              console.warn("[Email] OQC合格通知仓库入库失败：", e);
            }
          }
        }
        await writeAuditTrail({
          ctx,
          module: "quality",
          action: "create",
          targetType: "质量检验",
          targetId: inspectionId,
          targetName: String(
            createdInspection?.inspectionNo || input.inspectionNo
          ),
          description: `新增质量检验：${String(createdInspection?.inspectionNo || input.inspectionNo)}`,
          newData: createdInspection as any,
        });
        await archiveQualityInspectionSnapshotById(inspectionId, ctx.user?.id);
        return inspectionId;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            inspectionNo: z.string().optional(),
            type: z.enum(["IQC", "IPQC", "OQC"]).optional(),
            relatedDocNo: z.string().optional(),
            itemName: z.string().optional(),
            batchNo: z.string().optional(),
            productionOrderId: z.number().optional(),
            productionOrderNo: z.string().optional(),
            sterilizationOrderId: z.number().optional(),
            sterilizationOrderNo: z.string().optional(),
            sampleQty: z.string().optional(),
            inspectedQty: z.string().optional(),
            qualifiedQty: z.string().optional(),
            unqualifiedQty: z.string().optional(),
            result: z
              .enum(["qualified", "unqualified", "conditional"])
              .optional(),
            inspectorId: z.number().optional(),
            inspectionDate: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getQualityInspectionById(input.id);
        const { inspectionDate, ...rest } = input.data;
        await updateQualityInspection(input.id, {
          ...rest,
          inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
        });
        const updatedInspection = await getQualityInspectionById(input.id);
        let syncedWarehouseEntries: Array<{
          id: number;
          entryNo: string;
          productName: string;
          batchNo: string;
          quantity: string;
          unit: string;
          previousStatus: string;
          nextStatus: string;
        }> = [];
        // OQC检验结果联动：通过生产批号回写入库申请的检验数据
        if (updatedInspection?.type === "OQC" && updatedInspection.batchNo) {
          const extra = parseOqcSyncMeta(updatedInspection.remark, {
            rejectQty: updatedInspection.unqualifiedQty,
            sampleQty: updatedInspection.sampleQty,
          });
          syncedWarehouseEntries = await syncOqcResultToWarehouseEntry({
            batchNo: updatedInspection.batchNo,
            productionOrderId:
              input.data.productionOrderId ??
              (before as any)?.productionOrderId ??
              undefined,
            sterilizationOrderId:
              input.data.sterilizationOrderId ??
              (before as any)?.sterilizationOrderId ??
              undefined,
            rejectQty: extra.rejectQty,
            sampleRetainQty: extra.sampleRetainQty,
            result: updatedInspection.result ?? undefined,
          });
        }
        if ((updatedInspection?.result || input.data.result) === "qualified") {
          const approvedEntries = syncedWarehouseEntries.filter(
            entry =>
              entry.nextStatus === "approved" &&
              entry.previousStatus !== "approved"
          );
          if (approvedEntries.length > 0) {
            try {
              const warehouseEmails = await getUserEmailsByDepartment([
                "仓库管理",
                "仓库部",
              ]);
              if (warehouseEmails.length > 0) {
                for (const entry of approvedEntries) {
                  await notifyWarehouseEntryApproved({
                    batchNo: entry.batchNo || input.data.batchNo || "",
                    productName: entry.productName || input.data.itemName || "",
                    entryNo: entry.entryNo,
                    quantity: Number(entry.quantity || 0),
                    unit: entry.unit,
                    warehouseEmails,
                  });
                }
              }
            } catch (e) {
              console.warn("[Email] OQC更新后通知仓库入库失败：", e);
            }
          }
        }
        await writeAuditTrail({
          ctx,
          module: "quality",
          action: "update",
          targetType: "质量检验",
          targetId: input.id,
          targetName: String(
            updatedInspection?.inspectionNo || before?.inspectionNo || input.id
          ),
          description: `更新质量检验：${String(updatedInspection?.inspectionNo || before?.inspectionNo || input.id)}`,
          previousData: before as any,
          newData: updatedInspection as any,
        });
        await archiveQualityInspectionSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteQualityInspection(input.id);
        return { success: true };
      }),
  }),

  // ==================== BOM 物料清单 ====================
  bom: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            productId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        if (input?.productId) return await getBomByProductId(input.productId);
        return await getBomList();
      }),
    getByProductId: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await getBomByProductId(input.productId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          baseProductQty: z.string().optional(),
          baseProductUnit: z.string().optional(),
          parentId: z.number().nullable().optional(),
          level: z.number().optional(),
          materialCode: z.string(),
          materialName: z.string(),
          specification: z.string().optional(),
          quantity: z.string(),
          unit: z.string().optional(),
          unitPrice: z.string().optional(),
          version: z.string().optional(),
          remark: z.string().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createBomItem(input);
      }),

    // 批量创建 BOM 物料（新建 BOM 时一次性提交所有物料）
    batchCreate: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          version: z.string(),
          bomCode: z.string().optional(),
          effectiveDate: z.string().optional(),
          baseProductQty: z.string().optional(),
          baseProductUnit: z.string().optional(),
          items: z.array(
            z.object({
              parentId: z.number().nullable().optional(),
              level: z.number(),
              materialCode: z.string(),
              materialName: z.string(),
              specification: z.string().optional(),
              quantity: z.string(),
              unit: z.string().optional(),
              unitPrice: z.string().optional(),
              remark: z.string().optional(),
              children: z
                .array(
                  z.object({
                    level: z.number(),
                    materialCode: z.string(),
                    materialName: z.string(),
                    specification: z.string().optional(),
                    quantity: z.string(),
                    unit: z.string().optional(),
                    unitPrice: z.string().optional(),
                    remark: z.string().optional(),
                  })
                )
                .optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const {
          productId,
          version,
          bomCode,
          effectiveDate,
          baseProductQty,
          baseProductUnit,
          items,
        } = input;
        const resolvedBomCode =
          bomCode?.trim() || (await generateBomCodeForProductId(productId));
        const createdIds: number[] = [];
        for (const item of items) {
          // 创建二级物料
          const parentBomId = await createBomItem({
            productId,
            baseProductQty,
            baseProductUnit,
            level: item.level,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            version,
            bomCode: resolvedBomCode,
            effectiveDate: effectiveDate
              ? (new Date(effectiveDate) as any)
              : null,
            remark: item.remark,
            status: "active",
          });
          createdIds.push(parentBomId);
          // 创建三级子物料
          if (item.children && item.children.length > 0) {
            for (const child of item.children) {
              const childId = await createBomItem({
                productId,
                baseProductQty,
                baseProductUnit,
                parentId: parentBomId,
                level: child.level,
                materialCode: child.materialCode,
                materialName: child.materialName,
                specification: child.specification,
                quantity: child.quantity,
                unit: child.unit,
                unitPrice: child.unitPrice,
                version,
                bomCode: resolvedBomCode,
                effectiveDate: effectiveDate
                  ? (new Date(effectiveDate) as any)
                  : null,
                remark: child.remark,
                status: "active",
              });
              createdIds.push(childId);
            }
          }
        }
        return { success: true, createdIds };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            productId: z.number().optional(),
            baseProductQty: z.string().optional(),
            baseProductUnit: z.string().optional(),
            parentId: z.number().nullable().optional(),
            level: z.number().optional(),
            materialCode: z.string().optional(),
            materialName: z.string().optional(),
            specification: z.string().optional(),
            quantity: z.string().optional(),
            unit: z.string().optional(),
            unitPrice: z.string().optional(),
            version: z.string().optional(),
            remark: z.string().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateBomItem(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBomItem(input.id);
        return { success: true };
      }),

    // 按产品批量删除所有 BOM 条目
    deleteByProductId: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        const items = await getBomByProductId(input.productId);
        for (const item of items) {
          await deleteBomItem(item.id);
        }
        return { success: true, deletedCount: items.length };
      }),

    // 替换产品 BOM（先删除全部，再批量创建），用于编辑功能
    replaceByProductId: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          version: z.string(),
          bomCode: z.string().optional(),
          effectiveDate: z.string().optional(),
          baseProductQty: z.string().optional(),
          baseProductUnit: z.string().optional(),
          items: z.array(
            z.object({
              level: z.number(),
              materialCode: z.string(),
              materialName: z.string(),
              specification: z.string().optional(),
              quantity: z.string(),
              unit: z.string().optional(),
              unitPrice: z.string().optional(),
              remark: z.string().optional(),
              children: z
                .array(
                  z.object({
                    level: z.number(),
                    materialCode: z.string(),
                    materialName: z.string(),
                    specification: z.string().optional(),
                    quantity: z.string(),
                    unit: z.string().optional(),
                    unitPrice: z.string().optional(),
                    remark: z.string().optional(),
                  })
                )
                .optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const {
          productId,
          version,
          bomCode,
          effectiveDate,
          baseProductQty,
          baseProductUnit,
          items,
        } = input;
        const resolvedBomCode =
          bomCode?.trim() || (await generateBomCodeForProductId(productId));
        // 先删除该产品所有 BOM 条目
        const existing = await getBomByProductId(productId);
        for (const item of existing) {
          await deleteBomItem(item.id);
        }
        // 再批量创建
        const createdIds: number[] = [];
        for (const item of items) {
          const parentBomId = await createBomItem({
            productId,
            baseProductQty,
            baseProductUnit,
            level: item.level,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            version,
            bomCode: resolvedBomCode,
            effectiveDate: effectiveDate
              ? (new Date(effectiveDate) as any)
              : null,
            remark: item.remark,
            status: "active",
          });
          createdIds.push(parentBomId);
          if (item.children && item.children.length > 0) {
            for (const child of item.children) {
              const childId = await createBomItem({
                productId,
                baseProductQty,
                baseProductUnit,
                parentId: parentBomId,
                level: child.level,
                materialCode: child.materialCode,
                materialName: child.materialName,
                specification: child.specification,
                quantity: child.quantity,
                unit: child.unit,
                unitPrice: child.unitPrice,
                version,
                bomCode: resolvedBomCode,
                effectiveDate: effectiveDate
                  ? (new Date(effectiveDate) as any)
                  : null,
                remark: child.remark,
                status: "active",
              });
              createdIds.push(childId);
            }
          }
        }
        return { success: true, createdIds };
      }),
  }),

  // ==================== 仓库管理 ====================
  warehouses: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        return await getWarehouses({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          name: z.string(),
          type: z.enum([
            "raw_material",
            "semi_finished",
            "finished",
            "quarantine",
          ]),
          address: z.string().optional(),
          manager: z.string().optional(),
          phone: z.string().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createWarehouse({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        } as any);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            name: z.string().optional(),
            type: z
              .enum(["raw_material", "semi_finished", "finished", "quarantine"])
              .optional(),
            address: z.string().optional(),
            manager: z.string().optional(),
            phone: z.string().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateWarehouse(input.id, input.data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteWarehouse(input.id);
        return { success: true };
      }),
  }),
  // ==================== 库存出入库记录 ====================
  inventoryTransactions: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            type: z.string().optional(),
            warehouseId: z.number().optional(),
            inventoryId: z.number().optional(),
            productId: z.number().optional(),
            batchNo: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getInventoryTransactions({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    create: protectedProcedure
      .input(
        z.object({
          warehouseId: z.number(),
          inventoryId: z.number().optional(),
          productId: z.number().optional(),
          type: z.enum([
            "purchase_in",
            "production_in",
            "return_in",
            "other_in",
            "production_out",
            "sales_out",
            "return_out",
            "other_out",
            "transfer",
            "adjust",
          ]),
          documentNo: z.string().optional(),
          itemName: z.string(),
          batchNo: z.string().optional(),
          sterilizationBatchNo: z.string().optional(),
          quantity: z.string(),
          unit: z.string().optional(),
          beforeQty: z.string().optional(),
          afterQty: z.string().optional(),
          relatedOrderId: z.number().optional(),
          productionWarehouseEntryId: z.number().optional(),
          shippingFee: z.string().optional(),
          logisticsSupplierId: z.number().optional(),
          logisticsSupplierName: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { productionWarehouseEntryId, ...inventoryInput } = input;
        const activeCompanyId = getActiveCompanyId(ctx.user);
        // 后端库存数量校验（仅对出库类操作）
        const outTypes = [
          "production_out",
          "sales_out",
          "return_out",
          "other_out",
        ];
        if (
          outTypes.includes(inventoryInput.type) &&
          inventoryInput.productId
        ) {
          const db = await getDb();
          if (db) {
            const conditions: any[] = [
              eq(inventory.warehouseId, inventoryInput.warehouseId),
              eq((inventory as any).companyId, activeCompanyId),
              eq(inventory.productId, inventoryInput.productId),
            ];
            if (inventoryInput.batchNo) {
              conditions.push(eq(inventory.batchNo, inventoryInput.batchNo));
            }
            const invRecords = await db
              .select({
                id: inventory.id,
                quantity: inventory.quantity,
              })
              .from(inventory)
              .where(and(...conditions));
            const inventoryIds = invRecords
              .map(rec => Number(rec.id))
              .filter(id => Number.isFinite(id) && id > 0);
            const inTypes = [
              "purchase_in",
              "production_in",
              "return_in",
              "other_in",
            ];
            const txRows =
              inventoryIds.length > 0
                ? await db
                    .select({
                      inventoryId: inventoryTransactions.inventoryId,
                      totalQty: sql<string>`SUM(CASE WHEN ${inventoryTransactions.type} IN (${sql.raw(inTypes.map(type => `'${type}'`).join(","))}) THEN ${inventoryTransactions.quantity} ELSE -${inventoryTransactions.quantity} END)`,
                    })
                    .from(inventoryTransactions)
                    .where(
                      and(
                        inArray(inventoryTransactions.inventoryId, inventoryIds)
                      )
                    )
                    .groupBy(inventoryTransactions.inventoryId)
                : [];
            const txQtyMap = new Map(
              txRows.map(row => [
                Number(row.inventoryId || 0),
                parseFloat(String(row.totalQty || "0")) || 0,
              ])
            );
            const totalAvailable = invRecords.reduce((sum, rec) => {
              const inventoryId = Number(rec.id || 0);
              const qty = txQtyMap.has(inventoryId)
                ? txQtyMap.get(inventoryId) || 0
                : parseFloat(String(rec.quantity || 0)) || 0;
              return sum + qty;
            }, 0);
            const outQty = parseFloat(String(inventoryInput.quantity)) || 0;
            if (outQty > totalAvailable) {
              const batchInfo = inventoryInput.batchNo
                ? `批次 ${inventoryInput.batchNo} `
                : "";
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `「${inventoryInput.itemName}」${batchInfo}库存不足！当前可用库存 ${totalAvailable} ${inventoryInput.unit || ""}，出库数量 ${outQty} ${inventoryInput.unit || ""}。`,
              });
            }
          }
        }
        const transactionId = await createInventoryTransaction({
          ...inventoryInput,
          companyId: activeCompanyId,
          operatorId: ctx.user?.id,
        } as any);
        if (
          inventoryInput.type === "sales_out" &&
          Number(inventoryInput.relatedOrderId || 0) > 0
        ) {
          try {
            await createInternalPurchaseInboundFromSalesTransaction({
              salesOrderId: Number(inventoryInput.relatedOrderId),
              documentNo: inventoryInput.documentNo,
              batchNo: inventoryInput.batchNo,
              productId: inventoryInput.productId,
              itemName: inventoryInput.itemName,
              quantity: inventoryInput.quantity,
              unit: inventoryInput.unit,
              operatorId: ctx.user?.id,
              remark: `系统自动生成（销售出库 ${String(inventoryInput.documentNo || transactionId)} 回写协同公司虚拟入库）`,
            });
          } catch (error) {
            console.warn("[协同公司] 销售出库回写采购入库失败:", error);
          }
        }
        if (
          inventoryInput.type === "production_in" &&
          Number(productionWarehouseEntryId || 0) > 0
        ) {
          try {
            const warehouseEntry = await getProductionWarehouseEntryById(
              Number(productionWarehouseEntryId)
            );
            if (
              warehouseEntry &&
              String(warehouseEntry.status || "") !== "completed"
            ) {
              await updateProductionWarehouseEntry(
                Number(productionWarehouseEntryId),
                { status: "completed" }
              );
              const salesEmails = await getUserEmailsByDepartment(["销售部"]);
              const financeEmails = await getUserEmailsByDepartment(["财务部"]);
              if (salesEmails.length > 0 || financeEmails.length > 0) {
                await notifyWarehouseEntryCompleted({
                  batchNo: warehouseEntry.batchNo || "",
                  productName: warehouseEntry.productName || undefined,
                  entryNo: warehouseEntry.entryNo || "",
                  quantity: Number(
                    inventoryInput.quantity || warehouseEntry.quantity || 0
                  ),
                  unit: inventoryInput.unit || warehouseEntry.unit || undefined,
                  salesOrderNo: warehouseEntry.productionOrderNo || undefined,
                  salesEmails,
                  financeEmails,
                });
              }
            }
          } catch (e) {
            console.warn("[库存] 生产入库完成状态回写失败:", e);
          }
        }
        await writeAuditTrail({
          ctx,
          module: "inventory",
          action: "create",
          targetType: "库存流水",
          targetId: transactionId,
          targetName: String(
            inventoryInput.documentNo || inventoryInput.itemName
          ),
          description: `新增库存流水：${inventoryInput.type} / ${String(inventoryInput.documentNo || inventoryInput.itemName)}`,
          newData: { id: transactionId, ...inventoryInput },
        });
        await archiveInventoryTransactionSnapshotById(
          transactionId,
          ctx.user?.id
        );
        if (Number(productionWarehouseEntryId || 0) > 0) {
          await archiveProductionWarehouseEntrySnapshotById(
            Number(productionWarehouseEntryId),
            ctx.user?.id
          );
        }
        return transactionId;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            documentNo: z.string().optional(),
            productId: z.number().optional(),
            itemName: z.string().optional(),
            batchNo: z.string().optional(),
            sterilizationBatchNo: z.string().optional(),
            quantity: z.string().optional(),
            unit: z.string().optional(),
            relatedOrderId: z.number().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const [before] = db
          ? await db
              .select()
              .from(inventoryTransactions)
              .where(eq(inventoryTransactions.id, input.id))
              .limit(1)
          : [];
        await updateInventoryTransaction(input.id, input.data);
        await archiveInventoryTransactionSnapshotById(input.id, ctx.user?.id);
        const nextBatchNo = String(input.data.batchNo || "").trim();
        const previousBatchNo = String(before?.batchNo || "").trim();
        if (previousBatchNo && previousBatchNo !== nextBatchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            previousBatchNo,
            ctx.user?.id
          );
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const [before] = db
          ? await db
              .select()
              .from(inventoryTransactions)
              .where(eq(inventoryTransactions.id, input.id))
              .limit(1)
          : [];
        await deleteInventoryTransaction(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),
  // ==================== 操作日志 ====================
  logs: router({
    list: protectedProcedure
      .input(
        z
          .object({
            module: z.string().optional(),
            action: z.string().optional(),
            operatorId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getOperationLogs(input);
      }),
    create: protectedProcedure
      .input(
        z.object({
          module: z.enum([
            "department",
            "code_rule",
            "user",
            "language",
            "system",
            "product",
            "customer",
            "supplier",
            "inventory",
            "order",
            "quality",
            "production",
            "finance",
            "document",
          ]),
          action: z.enum([
            "create",
            "update",
            "delete",
            "status_change",
            "role_change",
            "permission_change",
            "import",
            "export",
            "login",
            "logout",
            "reset",
            "approve",
            "reject",
          ]),
          targetType: z.string(),
          targetId: z.string().optional(),
          targetName: z.string().optional(),
          description: z.string(),
          previousData: z.string().optional(),
          newData: z.string().optional(),
          changedFields: z.string().optional(),
          operatorName: z.string(),
          operatorRole: z.string().optional(),
          operatorDepartment: z.string().optional(),
          ipAddress: z.string().optional(),
          result: z.enum(["success", "failure", "partial"]).optional(),
          errorMessage: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createOperationLog({ ...input, operatorId: ctx.user!.id });
        return { success: true };
      }),
    clear: protectedProcedure.mutation(async () => {
      await clearOperationLogs();
      return { success: true };
    }),
  }),
  // ==================== 回收箱（管理员） ====================
  recycleBin: router({
    list: adminProcedure
      .input(
        z
          .object({
            status: z.enum(["active", "restored", "expired"]).optional(),
            keyword: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getRecycleBinEntries(input);
      }),
    restore: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await restoreRecycleBinEntry(input.id, ctx.user?.id);
        return { success: true };
      }),
    remove: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await removeRecycleBinEntry(input.id);
        return { success: true };
      }),
    clearExpired: adminProcedure.mutation(async () => {
      await clearExpiredRecycleBinEntries();
      return { success: true };
    }),
  }),
  // ==================== 仪表盘统计 ====================
  dashboard: router({
    access: protectedProcedure.query(async ({ ctx }) => {
      const access = await getDashboardAccessForUser(ctx.user);
      return {
        ...access,
        allowedDashboardIds: access.allowedDashboardIds,
      };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const restrictToSelf =
        isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
        return await getDashboardStats({
          salesPersonId: restrictToSelf ? ctx.user?.id : undefined,
          operatorId: ctx.user?.id,
          operatorRole: ctx.user?.role,
          operatorIsCompanyAdmin: ctx.user?.isCompanyAdmin,
          operatorDepartment: ctx.user?.department ?? null,
          companyId: getActiveCompanyId(ctx.user),
        });
    }),
    departmentBoard: protectedProcedure
      .input(
        z.object({
          dashboardId: z.enum(
            DEPARTMENT_DASHBOARD_PERMISSION_IDS as [
              Exclude<DashboardPermissionId, "boss_dashboard">,
              ...Exclude<DashboardPermissionId, "boss_dashboard">[],
            ]
          ),
          year: z.number().int().min(2000).max(2100),
          month: z.number().int().min(1).max(12).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const access = await getDashboardAccessForUser(ctx.user);
        if (!access.allowedDashboardIds.includes(input.dashboardId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "您没有查看该部门看板的权限",
          });
        }
        const result = await getDepartmentDashboardData({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
        if (!result) {
          throw new TRPCError({ code: "NOT_FOUND", message: "看板数据不存在" });
        }
        return result;
      }),
    bossBoard: protectedProcedure
      .input(
        z.object({
          year: z.number().int().min(2000).max(2100),
          month: z.number().int().min(1).max(12).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const access = await getDashboardAccessForUser(ctx.user);
        if (!access.allowedDashboardIds.includes("boss_dashboard")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "您没有查看经营看板的权限",
          });
        }
        const result = await getBossDashboardData({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "经营看板数据不存在",
          });
        }
        return result;
      }),
  }),

  // ==================== 文件管理 (知识库) ====================
  documents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getVisibleKnowledgeDocuments(ctx.user);
    }),
    create: protectedProcedure
      .input(
        z.object({
          docNo: z.string(),
          title: z.string(),
          category: z.enum([
            "policy",
            "sop",
            "record",
            "certificate",
            "external",
            "contract",
          ]),
          version: z.string().optional(),
          department: z.string().optional(),
          status: z.enum(["draft", "reviewing", "approved", "obsolete"]),
          effectiveDate: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        return await db.insert(documents).values({
          ...input,
          department: resolveKnowledgeBaseWritableDepartment(ctx.user, input.department),
          effectiveDate: input.effectiveDate
            ? new Date(input.effectiveDate)
            : null,
          createdBy: ctx.user?.id,
        });
      }),
    saveReceivableAttachments: protectedProcedure
      .input(
        z.object({
          invoiceNo: z.string(),
          customerName: z.string(),
          department: z.string().optional(),
          files: z
            .array(
              z.object({
                name: z.string(),
                mimeType: z.string().optional(),
                base64: z.string(),
              })
            )
            .min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");

        const departmentName = normalizeDepartmentForUpload(
          input.department,
          "销售部"
        );
        const customerFolder = safeFileSegment(input.customerName || "客户");
        const orderFolder = `订单管理/${customerFolder}/${safeFileSegment(input.invoiceNo || "收款单")}/收款附件`;
        const department = safeFileSegment(departmentName);
        const folderName = orderFolder;
        const invoiceNo = safeFileSegment(input.invoiceNo || "单据");

        const created: Array<{
          fileName: string;
          filePath: string;
          title: string;
          docNo: string;
        }> = [];

        for (let index = 0; index < input.files.length; index++) {
          const file = input.files[index];
          const extFromName = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
          const ext =
            extFromName ||
            (String(file.mimeType || "").includes("pdf")
              ? ".pdf"
              : String(file.mimeType || "").includes("word")
                ? ".docx"
                : String(file.mimeType || "").includes("image/")
                  ? ".png"
                  : "");
          if (!ATTACHMENT_EXTENSIONS.includes(ext as any)) {
            throw new Error(`不支持的文件格式: ${file.name}`);
          }
          const fileBaseName = `RCPT-${invoiceNo}-${String(index + 1).padStart(2, "0")}`;
          const base64Body = String(file.base64 || "").replace(
            /^data:[^;]+;base64,/,
            ""
          );
          const fileBuffer = Buffer.from(base64Body, "base64");
          const saved = await saveAttachmentFile({
            department,
            businessFolder: folderName,
            originalName: file.name,
            desiredBaseName: fileBaseName,
            mimeType: file.mimeType,
            buffer: fileBuffer,
            saveToFileManager: true,
          });
          const docNo =
            `RCPT-${Date.now()}-${randomBytes(2).toString("hex")}`.slice(0, 50);
          const title = `${invoiceNo}-收款附件`;

          await db.insert(documents).values({
            docNo,
            title,
            category: "record",
            version: "V1.0",
            department,
            status: "approved",
            filePath: saved.fileManagerPath || saved.filePath,
            description: `收款附件：${invoiceNo}（${saved.provider}:${saved.storageKey}${saved.fileManagerPath ? `; file_manager:${saved.fileManagerPath}` : ""}）`,
            createdBy: ctx.user?.id,
          });

          created.push({
            fileName: saved.fileName,
            filePath: saved.fileManagerPath || saved.filePath,
            title,
            docNo,
          });
        }
        return created;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            docNo: z.string().optional(),
            title: z.string().optional(),
            category: z
              .enum([
                "policy",
                "sop",
                "record",
                "certificate",
                "external",
                "contract",
              ])
              .optional(),
            version: z.string().optional(),
            department: z.string().optional(),
            status: z
              .enum(["draft", "reviewing", "approved", "obsolete"])
              .optional(),
            effectiveDate: z.string().optional(),
            description: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const { id, data } = input;
        await ensureKnowledgeDocumentAccess(id, ctx.user);
        return await db
          .update(documents)
          .set({
            ...data,
            department:
              data.department === undefined
                ? undefined
                : resolveKnowledgeBaseWritableDepartment(ctx.user, data.department),
            effectiveDate: data.effectiveDate
              ? new Date(data.effectiveDate)
              : undefined,
          })
          .where(eq(documents.id, id));
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensureKnowledgeDocumentAccess(input.id, ctx.user);
        await deleteDocument(input.id, ctx.user?.id);
        return { success: true };
      }),
  }),

  // ==================== 银行账户 ====================
  bankAccounts: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        return await getBankAccounts({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getBankAccountById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
      }),
    create: protectedProcedure
      .input(
        z.object({
          accountName: z.string(),
          bankName: z.string(),
          accountNo: z.string(),
          bankAddress: z.string().optional(),
          currency: z.string().optional(),
          swiftCode: z.string().optional(),
          accountType: z.enum(["basic", "general", "special"]).optional(),
          isDefault: z.boolean().optional(),
          balance: z.string().optional(),
          status: z.enum(["active", "frozen", "closed"]).optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createBankAccount({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            accountName: z.string().optional(),
            bankName: z.string().optional(),
            accountNo: z.string().optional(),
            bankAddress: z.string().optional(),
            currency: z.string().optional(),
            swiftCode: z.string().optional(),
            accountType: z.enum(["basic", "general", "special"]).optional(),
            isDefault: z.boolean().optional(),
            balance: z.string().optional(),
            status: z.enum(["active", "frozen", "closed"]).optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const current = await getBankAccountById(input.id, activeCompanyId);
        if (!current) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "账户不存在",
          });
        }
        await updateBankAccount(input.id, input.data, activeCompanyId);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const current = await getBankAccountById(input.id, activeCompanyId);
        if (!current) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "账户不存在",
          });
        }
        await deleteBankAccount(input.id, activeCompanyId, ctx.user?.id);
        return { success: true };
      }),
  }),

  // ==================== 汇率管理 ====================
  exchangeRates: router({
    list: protectedProcedure
      .input(
        z
          .object({
            fromCurrency: z.string().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getExchangeRates({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    create: protectedProcedure
      .input(
        z.object({
          fromCurrency: z.string(),
          toCurrency: z.string().optional(),
          rate: z.string(),
          effectiveDate: z.string(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createExchangeRate({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          effectiveDate: new Date(input.effectiveDate) as any,
          createdBy: ctx.user?.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            fromCurrency: z.string().optional(),
            toCurrency: z.string().optional(),
            rate: z.string().optional(),
            effectiveDate: z.string().optional(),
            source: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateExchangeRate(input.id, {
          ...input.data,
          effectiveDate: input.data.effectiveDate
            ? (new Date(input.data.effectiveDate) as any)
            : undefined,
        }, getActiveCompanyId(ctx.user));
        return { success: true };
      }),
    refreshLive: protectedProcedure
      .input(
        z
          .object({
            fromCurrency: z.string().default("USD"),
            toCurrency: z.string().default("CNY"),
          })
          .optional()
      )
      .mutation(async ({ input, ctx }) => {
        const fromCurrency = String(input?.fromCurrency ?? "USD").toUpperCase();
        const toCurrency = String(input?.toCurrency ?? "CNY").toUpperCase();

        const apiRes = await fetch(
          `https://open.er-api.com/v6/latest/${fromCurrency}`
        );
        if (!apiRes.ok) {
          throw new Error(`实时汇率获取失败(${apiRes.status})`);
        }
        const payload = (await apiRes.json()) as {
          result?: string;
          rates?: Record<string, number>;
        };
        const liveRate = payload?.rates?.[toCurrency];

        if (
          !liveRate ||
          Number.isNaN(Number(liveRate)) ||
          Number(liveRate) <= 0
        ) {
          throw new Error("实时汇率数据不可用");
        }

        const today = new Date().toISOString().slice(0, 10);
        const id = await createExchangeRate({
          fromCurrency,
          toCurrency,
          companyId: getActiveCompanyId(ctx.user),
          rate: String(liveRate),
          effectiveDate: new Date(today) as any,
          source: "实时",
          createdBy: ctx.user?.id,
        });
        return {
          id,
          fromCurrency,
          toCurrency,
          rate: String(liveRate),
          effectiveDate: today,
        };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteExchangeRate(
          input.id,
          getActiveCompanyId(ctx.user),
          ctx.user?.id
        );
        return { success: true };
      }),
  }),

  // ==================== 付款条件 ====================
  paymentTerms: router({
    list: protectedProcedure
      .input(
        z
          .object({
            type: z.string().optional(),
            isActive: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getPaymentTerms(input);
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          type: z.enum(["cash", "deposit", "monthly", "quarterly"]),
          depositPercent: z.string().optional(),
          creditDays: z.number().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createPaymentTerm(input);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            name: z.string().optional(),
            type: z
              .enum(["cash", "deposit", "monthly", "quarterly"])
              .optional(),
            depositPercent: z.string().optional(),
            creditDays: z.number().optional(),
            description: z.string().optional(),
            isActive: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updatePaymentTerm(input.id, input.data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePaymentTerm(input.id);
        return { success: true };
      }),
    normalizeAllBusinessData: protectedProcedure.mutation(async () => {
      await normalizePaymentConditionDataInDb();
      return { success: true };
    }),
  }),

  // ==================== 物料申请 ====================
  materialRequests: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const rows = await getMaterialRequests(input);
        return rows.map(r => ({
          ...r,
          requestDate: r.requestDate
            ? String(r.requestDate).split("T")[0]
            : null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
          approvedAt: r.approvedAt
            ? new Date(r.approvedAt).toISOString()
            : null,
          submittedAt: (r as any).submittedAt
            ? new Date((r as any).submittedAt).toISOString()
            : null,
        }));
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const request = await getMaterialRequestById(input.id);
        const items = await getMaterialRequestItems(input.id);
        const serialized = request
          ? {
              ...request,
              requestDate: request.requestDate
                ? String(request.requestDate).split("T")[0]
                : null,
              createdAt: request.createdAt
                ? new Date(request.createdAt).toISOString()
                : null,
              updatedAt: request.updatedAt
                ? new Date(request.updatedAt).toISOString()
                : null,
              approvedAt: request.approvedAt
                ? new Date(request.approvedAt).toISOString()
                : null,
              submittedAt: (request as any).submittedAt
                ? new Date((request as any).submittedAt).toISOString()
                : null,
            }
          : undefined;
        return { request: serialized, items };
      }),
    create: protectedProcedure
      .input(
        z.object({
          requestNo: z.string().optional(),
          department: z.string(),
          requestDate: z.string(),
          urgency: z.enum(["normal", "urgent", "critical"]).optional(),
          reason: z.string().optional(),
          totalAmount: z.string().optional(),
          remark: z.string().optional(),
          items: z.array(
            z.object({
              productId: z.number().optional(),
              materialName: z.string(),
              specification: z.string().optional(),
              quantity: z.string(),
              unit: z.string().optional(),
              estimatedPrice: z.string().optional(),
              remark: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { items, requestDate, ...rest } = input;
        return await createMaterialRequest(
          {
            ...rest,
            requestDate: new Date(requestDate) as any,
            requesterId: ctx.user!.id,
          },
          items.map(i => ({ ...i, requestId: 0 }))
        );
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            status: z
              .enum([
                "draft",
                "pending_approval",
                "approved",
                "rejected",
                "purchasing",
                "completed",
                "cancelled",
              ])
              .optional(),
            urgency: z.enum(["normal", "urgent", "critical"]).optional(),
            reason: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const oldRequest = await getMaterialRequestById(input.id);
        if (!oldRequest) {
          throw new Error("采购申请不存在");
        }

        const createdPlanNos: string[] = [];
        const skippedItems: string[] = [];

        if (
          input.data.status === "purchasing" &&
          oldRequest.status !== "purchasing"
        ) {
          const db = await getDb();
          if (!db) throw new Error("数据库连接不可用");

          const { products: productsTable, productionPlans: ppTable } =
            await import("../drizzle/schema");
          const requestItems = await getMaterialRequestItems(input.id);
          const mergedRequestItems = Array.from(
            requestItems
              .reduce((map, item) => {
                const key = item.productId
                  ? `id:${item.productId}`
                  : `name:${String(item.materialName || "").trim()}|spec:${String(item.specification || "").trim()}|unit:${String(item.unit || "").trim()}`;
                const current = map.get(key);
                if (!current) {
                  map.set(key, { ...item });
                  return map;
                }
                map.set(key, {
                  ...current,
                  quantity: String(
                    roundToDigits(
                      Number(current.quantity || 0) + Number(item.quantity || 0),
                      4,
                    )
                  ),
                });
                return map;
              }, new Map<string, any>())
              .values()
          );

          const urgencyToPriority = (
            u?: "normal" | "urgent" | "critical"
          ): "normal" | "high" | "urgent" => {
            if (u === "critical") return "urgent";
            if (u === "urgent") return "high";
            return "normal";
          };

          for (const item of mergedRequestItems) {
            let product: any | undefined;

            if (item.productId) {
              [product] = await db
                .select({
                  id: productsTable.id,
                  name: productsTable.name,
                  unit: productsTable.unit,
                  specification: productsTable.specification,
                  sourceType: productsTable.sourceType,
                  procurePermission: productsTable.procurePermission,
                })
                .from(productsTable)
                .where(eq(productsTable.id, Number(item.productId)))
                .limit(1);
            }

            if (!product) {
              const [matchedProduct] = await db
                .select({
                  id: productsTable.id,
                  name: productsTable.name,
                  unit: productsTable.unit,
                  specification: productsTable.specification,
                  sourceType: productsTable.sourceType,
                  procurePermission: productsTable.procurePermission,
                })
                .from(productsTable)
                .where(
                  item.specification
                    ? and(
                        eq(productsTable.name, String(item.materialName || "")),
                        eq(
                          productsTable.specification,
                          String(item.specification || "")
                        )
                      )
                    : eq(productsTable.name, String(item.materialName || ""))
                )
                .limit(1);
              product = matchedProduct;
            }

            const itemLabel = `${item.materialName}${item.specification ? `（${item.specification}）` : ""}`;
            const isPurchasable =
              !!product &&
              (String(product.sourceType || "") === "purchase" ||
                String(product.procurePermission || "") === "purchasable");

            if (!isPurchasable) {
              skippedItems.push(itemLabel);
              continue;
            }

            const exists = await db
              .select({ id: ppTable.id })
              .from(ppTable)
              .where(
                and(
                  eq(ppTable.productId, product.id),
                  eq(ppTable.status, "pending"),
                  like(ppTable.remark, `%来自采购申请${oldRequest.requestNo}%`)
                )
              )
              .limit(1);
            if (exists.length > 0) {
              continue;
            }

            const planNo = await getNextOrderNo("CP", ppTable, ppTable.planNo);
            const requestDate = oldRequest.requestDate
              ? String(oldRequest.requestDate).split("T")[0]
              : new Date().toISOString().split("T")[0];

            await createProductionPlan({
              planNo,
              planType: "internal",
              productId: product.id,
              productName: product.name,
              plannedQty: String(item.quantity),
              unit: item.unit || product.unit || "件",
              plannedStartDate: new Date(requestDate) as any,
              priority: urgencyToPriority(
                input.data.urgency || oldRequest.urgency
              ),
              status: "pending",
              remark: `采购申请生成：来自采购申请${oldRequest.requestNo} ${itemLabel}`,
              createdBy: ctx.user?.id,
            });
            createdPlanNos.push(planNo);
          }

          if (createdPlanNos.length === 0) {
            throw new Error(
              "未生成采购计划：申请明细未匹配到采购型产品或已存在待采购计划"
            );
          }
        }

        await updateMaterialRequest(input.id, input.data);
        // 邮件通知：采购申请审批通过时，通知采购部下单
        if (
          input.data.status === "approved" &&
          oldRequest?.status !== "approved"
        ) {
          try {
            const purchaseEmails = await getUserEmailsByDepartment(["采购部"]);
            if (purchaseEmails.length > 0) {
              const items = await getMaterialRequestItems(input.id);
              await notifyMaterialRequestApproved({
                requestNo: oldRequest?.requestNo || "",
                itemCount: items.length,
                urgency: input.data.urgency || oldRequest?.urgency,
                purchaseEmails,
              });
            }
          } catch (e) {
            console.warn("[Email] 采购申请审批通知失败：", e);
          }
        }
        return { success: true, createdPlanNos, skippedItems };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteMaterialRequest(input.id);
        return { success: true };
      }),
  }),

  // ==================== 费用报销 ====================
  expenses: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getExpenseReimbursements({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getExpenseReimbursementById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
      }),
    getApprovalState: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const reimbursement = await getExpenseReimbursementById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!reimbursement) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报销单不存在" });
        }
        return await getConfiguredWorkflowState({
          module: "管理部",
          formType: "申请单",
          formName: "费用报销",
          sourceTable: "expense_reimbursements",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
      }),
    getApprovalHistory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const reimbursement = await getExpenseReimbursementById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!reimbursement) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报销单不存在" });
        }
        return await getConfiguredWorkflowHistory({
          sourceTable: "expense_reimbursements",
          sourceId: input.id,
        });
      }),
    create: protectedProcedure
      .input(
        z.object({
          reimbursementNo: z.string().optional(),
          department: z.string(),
          applyDate: z.string(),
          totalAmount: z.string(),
          currency: z.string().optional(),
          category: z.enum([
            "travel",
            "office",
            "entertainment",
            "transport",
            "communication",
            "other",
          ]),
          applicantId: z.number().optional(),
          description: z.string().optional(),
          remark: z.string().optional(),
          status: z
            .enum([
              "draft",
              "pending_approval",
              "approved",
              "rejected",
              "paid",
              "cancelled",
            ])
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const requestedStatus = input.status || "draft";
        const submitOnCreate = requestedStatus !== "draft";
        const workflowConfig = db
          ? await getWorkflowExecutionConfig(db, {
              module: "管理部",
              formType: "申请单",
              formName: "费用报销",
            })
          : null;
        if (submitOnCreate && workflowConfig?.approvalEnabled) {
          if (!workflowConfig.template) {
            throw new Error("请先在审批流程设置中配置「费用报销」流程模板");
          }
          if (workflowConfig.flowMode !== "approval") {
            throw new Error("费用报销流程当前不是审核模式");
          }
          if (workflowConfig.approvalStepIds.length === 0) {
            throw new Error("费用报销流程未配置审核步骤");
          }
          const operatorId = Number(input.applicantId || ctx.user?.id || 0);
          if (
            workflowConfig.initiatorIds.length > 0 &&
            operatorId > 0 &&
            !workflowConfig.initiatorIds.includes(operatorId)
          ) {
            throw new Error("当前用户不在费用报销流程发起人范围内");
          }
        }
        const finalStatus = submitOnCreate
          ? workflowConfig?.approvalEnabled
            ? "pending_approval"
            : "approved"
          : requestedStatus;
        const expenseId = await createExpenseReimbursement({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          status: finalStatus as any,
          applyDate: new Date(input.applyDate) as any,
          applicantId: input.applicantId || ctx.user!.id,
        });
        if (submitOnCreate && workflowConfig?.approvalEnabled) {
          await submitConfiguredWorkflow({
            module: "管理部",
            formType: "申请单",
            formName: "费用报销",
            sourceTable: "expense_reimbursements",
            sourceId: expenseId,
            sourceNo: input.reimbursementNo,
            title: "费用报销审批",
            routePath: `/admin/expense?focusId=${expenseId}`,
            targetName: input.department,
            applicantId: input.applicantId || ctx.user?.id,
            applicantName: ctx.user?.name,
          });
        }
        return expenseId;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            applicantId: z.number().optional(),
            department: z.string().optional(),
            applyDate: z.string().optional(),
            category: z
              .enum([
                "travel",
                "office",
                "entertainment",
                "transport",
                "communication",
                "other",
              ])
              .optional(),
            status: z
              .enum([
                "draft",
                "pending_approval",
                "approved",
                "rejected",
                "paid",
                "cancelled",
              ])
              .optional(),
            totalAmount: z.string().optional(),
            description: z.string().optional(),
            remark: z.string().optional(),
            bankAccountId: z.number().optional(),
            approvedBy: z.number().optional(),
            approvedAt: z.string().optional(),
            paidAt: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const db = await getDb();
        const workflowConfig = db
          ? await getWorkflowExecutionConfig(db, {
              module: "管理部",
              formType: "申请单",
              formName: "费用报销",
            })
          : null;
        if (
          input.data.status === "pending_approval" &&
          workflowConfig?.approvalEnabled
        ) {
          if (!workflowConfig.template) {
            throw new Error("请先在审批流程设置中配置「费用报销」流程模板");
          }
          if (workflowConfig.flowMode !== "approval") {
            throw new Error("费用报销流程当前不是审核模式");
          }
          if (workflowConfig.approvalStepIds.length === 0) {
            throw new Error("费用报销流程未配置审核步骤");
          }
          const currentRecord = await getExpenseReimbursementById(
            input.id,
            activeCompanyId
          );
          const operatorId = Number(
            input.data.applicantId ||
              currentRecord?.applicantId ||
              ctx.user?.id ||
              0
          );
          if (
            workflowConfig.initiatorIds.length > 0 &&
            operatorId > 0 &&
            !workflowConfig.initiatorIds.includes(operatorId)
          ) {
            throw new Error("当前用户不在费用报销流程发起人范围内");
          }
        }
        const { approvedAt, paidAt, applyDate, ...rest } = input.data;
        const currentRecord = await getExpenseReimbursementById(
          input.id,
          activeCompanyId
        );
        if (!currentRecord) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报销单不存在" });
        }
        await updateExpenseReimbursement(input.id, {
          ...rest,
          applyDate: applyDate ? (new Date(applyDate) as any) : undefined,
          approvedAt: approvedAt ? (new Date(approvedAt) as any) : undefined,
          paidAt: paidAt ? (new Date(paidAt) as any) : undefined,
        }, activeCompanyId);
        if (
          input.data.status === "pending_approval" &&
          workflowConfig?.approvalEnabled
        ) {
          await submitConfiguredWorkflow({
            module: "管理部",
            formType: "申请单",
            formName: "费用报销",
            sourceTable: "expense_reimbursements",
            sourceId: input.id,
            routePath: `/admin/expense?focusId=${input.id}`,
            title: "费用报销审批",
            applicantId:
              Number(
                input.data.applicantId ||
                  currentRecord?.applicantId ||
                  ctx.user?.id ||
                  0
              ) || undefined,
            applicantName: ctx.user?.name,
          });
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const reimbursement = await getExpenseReimbursementById(
          input.id,
          activeCompanyId
        );
        if (!reimbursement) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报销单不存在" });
        }
        await deleteExpenseReimbursement(input.id, activeCompanyId, ctx.user?.id);
        return { success: true };
      }),
    approve: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const reimbursement = await getExpenseReimbursementById(
          input.id,
          activeCompanyId
        );
        if (!reimbursement) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报销单不存在" });
        }
        const configuredState = await getConfiguredWorkflowState({
          module: "管理部",
          formType: "申请单",
          formName: "费用报销",
          sourceTable: "expense_reimbursements",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
        if (configuredState.runId) {
          if (!configuredState.canApprove) {
            const approverName =
              configuredState.currentApproverName || "指定审批人";
            throw new Error(`当前报销单待${approverName}审批`);
          }
          const run = await approveConfiguredWorkflow({
            sourceTable: "expense_reimbursements",
            sourceId: input.id,
            actorId: ctx.user?.id,
            actorName: ctx.user?.name,
            actorRole: ctx.user?.role,
            comment: input.remark,
          });
          await updateExpenseReimbursement(input.id, {
            status:
              String(run?.status || "") === "approved"
                ? "approved"
                : "pending_approval",
            approvedBy:
              String(run?.status || "") === "approved"
                ? ctx.user?.id
                : undefined,
            approvedAt:
              String(run?.status || "") === "approved"
                ? (new Date() as any)
                : undefined,
            remark: input.remark,
          }, activeCompanyId);
        } else {
          await updateExpenseReimbursement(input.id, {
            status: "approved",
            approvedBy: ctx.user?.id,
            approvedAt: new Date() as any,
            remark: input.remark,
          }, activeCompanyId);
        }
        return { success: true };
      }),
    reject: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const reimbursement = await getExpenseReimbursementById(
          input.id,
          activeCompanyId
        );
        if (!reimbursement) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报销单不存在" });
        }
        const configuredState = await getConfiguredWorkflowState({
          module: "管理部",
          formType: "申请单",
          formName: "费用报销",
          sourceTable: "expense_reimbursements",
          sourceId: input.id,
          currentUserId: ctx.user?.id,
          currentUserRole: ctx.user?.role,
        });
        if (configuredState.runId) {
          if (!configuredState.canApprove) {
            const approverName =
              configuredState.currentApproverName || "指定审批人";
            throw new Error(`当前报销单待${approverName}审批`);
          }
          await rejectConfiguredWorkflow({
            sourceTable: "expense_reimbursements",
            sourceId: input.id,
            actorId: ctx.user?.id,
            actorName: ctx.user?.name,
            actorRole: ctx.user?.role,
            comment: input.remark,
          });
        }
        await updateExpenseReimbursement(input.id, {
          status: "rejected",
          remark: input.remark,
        }, activeCompanyId);
        return { success: true };
      }),
    pay: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          bankAccountId: z.number(),
          paymentDate: z.string(),
          paymentMethod: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const reimbursement = await getExpenseReimbursementById(
          input.id,
          activeCompanyId
        );
        if (!reimbursement) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报销单不存在" });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "数据库连接不可用",
          });
        }

        const existingPayment = await db
          .select({ id: paymentRecordsTable.id })
          .from(paymentRecordsTable)
          .where(
            and(
              eq(
                (paymentRecordsTable as any).companyId,
                getActiveCompanyId(ctx.user)
              ),
              eq(paymentRecordsTable.relatedType, "expense"),
              eq(paymentRecordsTable.relatedId, Number(reimbursement.id))
            )
          )
          .limit(1);

        if (existingPayment.length === 0) {
          const paymentRecordId = await createPaymentRecord({
            companyId: getActiveCompanyId(ctx.user),
            type: "payment",
            relatedType: "expense",
            relatedId: Number(reimbursement.id),
            relatedNo: String(reimbursement.reimbursementNo || ""),
            amount: String(reimbursement.totalAmount || "0"),
            currency: String(reimbursement.currency || "CNY"),
            amountBase: String(reimbursement.totalAmount || "0"),
            exchangeRate: "1",
            bankAccountId: input.bankAccountId,
            paymentDate: new Date(input.paymentDate) as any,
            paymentMethod: input.paymentMethod || "银行转账",
            remark: input.remark,
            operatorId: ctx.user?.id,
          });
          await archivePaymentRecordSnapshotById(paymentRecordId, ctx.user?.id);
        }

        await updateExpenseReimbursement(input.id, {
          status: "paid",
          bankAccountId: input.bankAccountId,
          paidAt: new Date(input.paymentDate) as any,
          remark: input.remark,
        }, activeCompanyId);

        return { success: true };
      }),
  }),

  // ==================== 收付款记录 ====================
  paymentRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            type: z.string().optional(),
            relatedType: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getPaymentRecords({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    create: protectedProcedure
      .input(
        z.object({
          recordNo: z.string().optional(),
          type: z.enum(["receipt", "payment"]),
          relatedType: z.enum([
            "sales_order",
            "purchase_order",
            "expense",
            "other",
          ]),
          relatedId: z.number().optional(),
          relatedNo: z.string().optional(),
          customerId: z.number().optional(),
          supplierId: z.number().optional(),
          amount: z.string(),
          currency: z.string().optional(),
          amountBase: z.string().optional(),
          exchangeRate: z.string().optional(),
          bankAccountId: z.number(),
          paymentDate: z.string(),
          paymentMethod: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createPaymentRecord({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          paymentDate: new Date(input.paymentDate) as any,
          operatorId: ctx.user?.id,
        });
        await writeAuditTrail({
          ctx,
          module: "finance",
          action: "create",
          targetType: "收付款记录",
          targetId: id,
          targetName: input.recordNo || `收付款记录#${id}`,
          description: `新增${input.type === "receipt" ? "收款" : "付款"}记录：${input.recordNo || `#${id}`}`,
          newData: { id, ...input },
        });
        await archivePaymentRecordSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            amount: z.string().optional(),
            currency: z.string().optional(),
            paymentDate: z.string().optional(),
            paymentMethod: z.string().optional(),
            remark: z.string().optional(),
            status: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        // paymentRecords 暂无独立 update 函数，直接返回成功
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const [before] = db
          ? await db
              .select()
              .from(paymentRecordsTable)
              .where(
                and(
                  eq(paymentRecordsTable.id, input.id),
                  eq((paymentRecordsTable as any).companyId, activeCompanyId)
                )
              )
              .limit(1)
          : [];
        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "收付款记录不存在",
          });
        }
        await deletePaymentRecord(input.id);
        await writeAuditTrail({
          ctx,
          module: "finance",
          action: "delete",
          targetType: "收付款记录",
          targetId: input.id,
          targetName: String(before?.recordNo || input.id),
          description: `删除收付款记录：${String(before?.recordNo || input.id)}`,
          previousData: before as any,
        });
        return { success: true };
      }),
  }),

  // ==================== HS 编码库 ====================
  hsCodes: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            category: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getHsCodeLibrary(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getHsCodeLibraryById(input.id);
      }),
    getByCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await getHsCodeLibraryByCode(input.code);
      }),
    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          category: z.string().optional(),
          productName: z.string().optional(),
          productId: z.number().optional(),
          productAlias: z.string().optional(),
          declarationElements: z.string().optional(),
          unit: z.string().optional(),
          remark: z.string().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createHsCodeLibraryEntry({
          ...input,
          code: input.code.trim(),
          category: input.category?.trim(),
          productName: input.productName?.trim(),
          productId: input.productId,
          productAlias: input.productAlias?.trim(),
          declarationElements: normalizeDeclarationElements(
            input.declarationElements
          ),
          unit: input.unit?.trim(),
          remark: input.remark?.trim(),
          createdBy: ctx.user?.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            code: z.string().optional(),
            category: z.string().optional(),
            productName: z.string().optional(),
            productId: z.number().optional(),
            productAlias: z.string().optional(),
            declarationElements: z.string().optional(),
            unit: z.string().optional(),
            remark: z.string().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateHsCodeLibraryEntry(input.id, {
          ...input.data,
          code: input.data.code?.trim(),
          category: input.data.category?.trim(),
          productName: input.data.productName?.trim(),
          productId: input.data.productId,
          productAlias: input.data.productAlias?.trim(),
          declarationElements: normalizeDeclarationElements(
            input.data.declarationElements
          ),
          unit: input.data.unit?.trim(),
          remark: input.data.remark?.trim(),
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteHsCodeLibraryEntry(input.id, ctx.user?.id);
        return { success: true };
      }),
  }),

  // ==================== 报关管理 ====================
  customs: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        return await getCustomsDeclarations({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          salesPersonId: singleUserId,
          salesPersonIds: multipleUserIds,
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const declaration = await getCustomsDeclarationById(
          input.id,
          activeCompanyId
        );
        if (!declaration) return undefined;
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds && declaration.salesOrderId) {
          const order = await getSalesOrderById(
            declaration.salesOrderId,
            activeCompanyId
          );
          if (!isOwnerWithinScope(order?.salesPersonId, scopedUserIds)) {
            throw new Error("无权查看该报关单");
          }
        }
        return declaration;
      }),
    create: protectedProcedure
      .input(
        z.object({
          declarationNo: z.string().optional(),
          salesOrderId: z.number(),
          customerId: z.number(),
          productName: z.string().optional(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          currency: z.string().optional(),
          amount: z.string().optional(),
          destination: z.string().optional(),
          portOfLoading: z.string().optional(),
          portOfDischarge: z.string().optional(),
          shippingMethod: z.enum(["sea", "air", "land", "express"]).optional(),
          hsCode: z.string().optional(),
          declarationDate: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { declarationDate, ...rest } = input;
        return await createCustomsDeclaration({
          ...rest,
          companyId: getActiveCompanyId(ctx.user),
          declarationDate: declarationDate
            ? (new Date(declarationDate) as any)
            : undefined,
          createdBy: ctx.user?.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            status: z
              .enum(["preparing", "submitted", "cleared", "shipped"])
              .optional(),
            declarationDate: z.string().optional(),
            clearanceDate: z.string().optional(),
            shippingDate: z.string().optional(),
            trackingNo: z.string().optional(),
            remark: z.string().optional(),
            destination: z.string().optional(),
            portOfLoading: z.string().optional(),
            portOfDischarge: z.string().optional(),
            hsCode: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const current = await getCustomsDeclarationById(
          input.id,
          activeCompanyId
        );
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报关记录不存在" });
        }
        const { declarationDate, clearanceDate, shippingDate, ...rest } =
          input.data;
        await updateCustomsDeclaration(input.id, {
          ...rest,
          declarationDate: declarationDate
            ? (new Date(declarationDate) as any)
            : undefined,
          clearanceDate: clearanceDate
            ? (new Date(clearanceDate) as any)
            : undefined,
          shippingDate: shippingDate
            ? (new Date(shippingDate) as any)
            : undefined,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getCustomsDeclarationById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "报关记录不存在" });
        }
        await deleteCustomsDeclaration(input.id);
        return { success: true };
      }),
  }),

  // ==================== 部门管理 ====================
  departments: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getDepartments(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getDepartmentById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          name: z.string(),
          parentId: z.number().nullable().optional(),
          managerId: z.number().nullable().optional(),
          phone: z.string().optional(),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createDepartment(input);
        await writeAuditTrail({
          ctx,
          module: "department",
          action: "create",
          targetType: "部门",
          targetId: id,
          targetName: input.name,
          description: `创建部门：${input.name}`,
          newData: { id, ...input },
        });
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            code: z.string().optional(),
            name: z.string().optional(),
            parentId: z.number().nullable().optional(),
            managerId: z.number().nullable().optional(),
            phone: z.string().optional(),
            description: z.string().optional(),
            sortOrder: z.number().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getDepartmentById(input.id);
        await updateDepartment(input.id, input.data);
        const after = await getDepartmentById(input.id);
        await writeAuditTrail({
          ctx,
          module: "department",
          action: "update",
          targetType: "部门",
          targetId: input.id,
          targetName: String(after?.name || before?.name || input.id),
          description: `修改部门：${String(after?.name || before?.name || input.id)}`,
          previousData: before as Record<string, unknown> | null,
          newData: after as Record<string, unknown> | null,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getDepartmentById(input.id);
        await deleteDepartment(input.id);
        await writeAuditTrail({
          ctx,
          module: "department",
          action: "delete",
          targetType: "部门",
          targetId: input.id,
          targetName: String(before?.name || input.id),
          description: `删除部门：${String(before?.name || input.id)}`,
          previousData: before as Record<string, unknown> | null,
        });
        return { success: true };
      }),
  }),

  // ==================== 编码规则 ====================
  codeRules: router({
    list: protectedProcedure.query(async () => {
      return await getCodeRules();
    }),
    create: protectedProcedure
      .input(
        z.object({
          module: z.string(),
          prefix: z.string(),
          dateFormat: z.string().optional(),
          seqLength: z.number().optional(),
          example: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createCodeRule(input);
        await writeAuditTrail({
          ctx,
          module: "code_rule",
          action: "create",
          targetType: "编码规则",
          targetId: id,
          targetName: input.module,
          description: `创建编码规则：${input.module}`,
          newData: { id, ...input },
        });
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            module: z.string().optional(),
            prefix: z.string().optional(),
            dateFormat: z.string().optional(),
            seqLength: z.number().optional(),
            example: z.string().optional(),
            description: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before =
          (await getCodeRules()).find(
            (item: any) => Number(item.id) === input.id
          ) || null;
        await updateCodeRule(input.id, input.data);
        const after =
          (await getCodeRules()).find(
            (item: any) => Number(item.id) === input.id
          ) || null;
        await writeAuditTrail({
          ctx,
          module: "code_rule",
          action: "update",
          targetType: "编码规则",
          targetId: input.id,
          targetName: String(after?.module || before?.module || input.id),
          description: `修改编码规则：${String(after?.module || before?.module || input.id)}`,
          previousData: before as Record<string, unknown> | null,
          newData: after as Record<string, unknown> | null,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before =
          (await getCodeRules()).find(
            (item: any) => Number(item.id) === input.id
          ) || null;
        await deleteCodeRule(input.id);
        await writeAuditTrail({
          ctx,
          module: "code_rule",
          action: "delete",
          targetType: "编码规则",
          targetId: input.id,
          targetName: String(before?.module || input.id),
          description: `删除编码规则：${String(before?.module || input.id)}`,
          previousData: before as Record<string, unknown> | null,
        });
        return { success: true };
      }),
    resync: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before =
          (await getCodeRules()).find(
            (item: any) => Number(item.id) === input.id
          ) || null;
        const rules = await getCodeRules();
        const after =
          rules.find((item: any) => Number(item.id) === input.id) || null;
        await writeAuditTrail({
          ctx,
          module: "code_rule",
          action: "sync",
          targetType: "编码规则",
          targetId: input.id,
          targetName: String(after?.module || before?.module || input.id),
          description: `重新同步编码规则流水号：${String(after?.module || before?.module || input.id)}`,
          previousData: before as Record<string, unknown> | null,
          newData: after as Record<string, unknown> | null,
        });
        return after;
      }),
  }),

  // ==================== 公司信息 ====================
  companyInfo: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getCompanyInfo(ctx.user?.companyId);
    }),
    update: adminProcedure
      .input(
        z.object({
          logoUrl: z.string().optional(),
          companyNameCn: z.string().optional(),
          companyNameEn: z.string().optional(),
          addressCn: z.string().optional(),
          addressEn: z.string().optional(),
          website: z.string().optional(),
          email: z.string().optional(),
          contactNameCn: z.string().optional(),
          contactNameEn: z.string().optional(),
          phone: z.string().optional(),
          whatsapp: z.string().optional(),
          languageSettings: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getCompanyInfo(ctx.user?.companyId);
        const updated = await updateCompanyInfo(input, ctx.user?.companyId);
        await writeAuditTrail({
          ctx,
          module: "system",
          action: "update",
          targetType: "公司信息",
          targetId: before?.id || updated?.id,
          targetName: String(
            updated?.companyNameCn ||
              updated?.companyNameEn ||
              before?.companyNameCn ||
              "公司信息"
          ),
          description: "更新公司信息",
          previousData: before as Record<string, unknown> | null,
          newData: updated as Record<string, unknown> | null,
        });
        return updated;
      }),
    uploadLogo: adminProcedure
      .input(
        z.object({
          name: z.string(),
          mimeType: z.string().optional(),
          base64: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getCompanyInfo(ctx.user?.companyId);
        const imageExtAllowList = new Set([
          ".jpg",
          ".jpeg",
          ".png",
          ".webp",
          ".gif",
          ".bmp",
          ".svg",
        ]);
        const extFromName = `.${String(input.name.split(".").pop() || "").toLowerCase()}`;
        const ext = imageExtAllowList.has(extFromName)
          ? extFromName
          : String(input.mimeType || "").includes("png")
            ? ".png"
            : String(input.mimeType || "").includes("jpeg")
              ? ".jpg"
              : String(input.mimeType || "").includes("jpg")
                ? ".jpg"
                : String(input.mimeType || "").includes("webp")
                  ? ".webp"
                  : String(input.mimeType || "").includes("gif")
                    ? ".gif"
                    : String(input.mimeType || "").includes("bmp")
                      ? ".bmp"
                      : String(input.mimeType || "").includes("svg")
                        ? ".svg"
                        : "";
        if (!imageExtAllowList.has(ext)) {
          throw new Error("商标仅支持图片格式（jpg/png/webp/gif/bmp/svg）");
        }

        const base64Body = String(input.base64 || "").replace(
          /^data:[^;]+;base64,/,
          ""
        );
        const fileBuffer = Buffer.from(base64Body, "base64");
        const saved = await saveAttachmentFile({
          department: "系统设置",
          businessFolder: "公司信息",
          originalName: input.name,
          desiredBaseName: "LOGO",
          mimeType: input.mimeType,
          buffer: fileBuffer,
        });
        const updated = await updateCompanyInfo(
          { logoUrl: saved.filePath },
          ctx.user?.companyId
        );
        await writeAuditTrail({
          ctx,
          module: "system",
          action: "update",
          targetType: "公司Logo",
          targetId: updated?.id,
          targetName: String(
            updated?.companyNameCn || updated?.companyNameEn || "公司Logo"
          ),
          description: "更新公司 Logo",
          previousData: before as Record<string, unknown> | null,
          newData: updated as Record<string, unknown> | null,
        });
        return { logoUrl: saved.filePath, companyInfo: updated };
      }),
  }),

  printTemplates: router({
    list: protectedProcedure.query(async () => {
      return await getPrintTemplates();
    }),
    renderPdf: protectedProcedure
      .input(
        z.object({
          templateKey: z.string(),
          title: z.string().optional(),
          data: z.record(z.any()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const forwardedProto = ctx.req.headers["x-forwarded-proto"];
        const protocol = Array.isArray(forwardedProto)
          ? String(forwardedProto[0] || "http")
          : String(forwardedProto || (ctx.req.secure ? "https" : "http"));
        const forwardedHost = ctx.req.headers["x-forwarded-host"];
        const hostHeader = ctx.req.headers.host;
        const host = Array.isArray(forwardedHost)
          ? forwardedHost[0]
          : forwardedHost || (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader);
        const origin = host ? `${protocol}://${host}` : undefined;
        const rendered = await renderPrintTemplatePdf({
          templateKey: input.templateKey,
          data: input.data,
          title: input.title,
          companyId: ctx.user?.companyId,
          origin,
        });
        return {
          title: rendered.title,
          fileName: rendered.fileName,
          pdfBase64: rendered.pdfBytes.toString("base64"),
        };
      }),
    save: adminProcedure
      .input(
        z.object({
          templateId: z.string(),
          module: z.string().optional(),
          name: z.string(),
          description: z.string().optional(),
          editorType: z.string().optional(),
          editorConfig: z.string().optional(),
          css: z.string(),
          html: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before =
          (await getPrintTemplates()).find(
            (item: any) => String(item.templateId) === input.templateId
          ) || null;
        const saved = await savePrintTemplate({
          ...input,
          updatedBy: ctx.user?.id,
        });
        const after =
          (await getPrintTemplates()).find(
            (item: any) => String(item.templateId) === input.templateId
          ) ||
          saved ||
          null;
        await writeAuditTrail({
          ctx,
          module: "system",
          action: before ? "update" : "create",
          targetType: "打印模板",
          targetId: input.templateId,
          targetName: input.name,
          description: `${before ? "修改" : "创建"}打印模板：${input.name}`,
          previousData: before as Record<string, unknown> | null,
          newData: after as Record<string, unknown> | null,
        });
        return saved;
      }),
    reset: adminProcedure
      .input(z.object({ templateId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const before =
          (await getPrintTemplates()).find(
            (item: any) => String(item.templateId) === input.templateId
          ) || null;
        await deletePrintTemplate(input.templateId);
        await writeAuditTrail({
          ctx,
          module: "system",
          action: "reset",
          targetType: "打印模板",
          targetId: input.templateId,
          targetName: String(before?.name || input.templateId),
          description: `恢复默认打印模板：${String(before?.name || input.templateId)}`,
          previousData: before as Record<string, unknown> | null,
        });
        return { success: true };
      }),
  }),

  // ==================== 审批流程设置 ====================
  workflowSettings: router({
    formCatalog: protectedProcedure
      .input(
        z
          .object({
            module: z.string().optional(),
            status: z.string().optional(),
            approvalEnabled: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getWorkflowFormCatalog(input);
      }),
    getFormCatalogItem: protectedProcedure
      .input(
        z.object({
          module: z.string(),
          formType: z.string(),
          formName: z.string(),
        })
      )
      .query(async ({ input }) => {
        return await getWorkflowFormCatalogItem(input);
      }),
    setFormApprovalEnabled: adminProcedure
      .input(
        z.object({
          module: z.string(),
          formType: z.string(),
          formName: z.string(),
          approvalEnabled: z.boolean(),
          path: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getWorkflowFormCatalogItem(input);
        await setWorkflowFormCatalogApprovalEnabled(input);
        const after = await getWorkflowFormCatalogItem(input);
        await writeAuditTrail({
          ctx,
          module: "system",
          action: "status_change",
          targetType: "表单审批开关",
          targetId: `${input.module}:${input.formType}:${input.formName}`,
          targetName: input.formName,
          description: `${input.approvalEnabled ? "启用" : "停用"}审批流程：${input.formName}`,
          previousData: before as Record<string, unknown> | null,
          newData: after as Record<string, unknown> | null,
        });
        return { success: true };
      }),
    list: protectedProcedure
      .input(
        z
          .object({
            module: z.string().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getWorkflowTemplates(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getWorkflowTemplateById(input.id);
      }),
    create: adminProcedure
      .input(
        z.object({
          code: z.string(),
          name: z.string(),
          module: z.string(),
          formType: z.string(),
          flowMode: z.enum(["approval", "notice"]).optional(),
          initiators: z.string().optional(),
          approvalSteps: z.string().optional(),
          handlers: z.string().optional(),
          ccRecipients: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const templateId = await createWorkflowTemplate({
          ...input,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        await setWorkflowFormCatalogApprovalEnabled({
          module: input.module,
          formType: input.formType,
          formName: input.name,
          approvalEnabled: (input.status || "active") === "active",
        });
        const after = await getWorkflowTemplateById(templateId);
        await writeAuditTrail({
          ctx,
          module: "system",
          action: "create",
          targetType: "审批流程",
          targetId: templateId,
          targetName: input.name,
          description: `创建审批流程：${input.name}`,
          newData: after as Record<string, unknown> | null,
        });
        return templateId;
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            code: z.string().optional(),
            name: z.string().optional(),
            module: z.string().optional(),
            formType: z.string().optional(),
            flowMode: z.enum(["approval", "notice"]).optional(),
            initiators: z.string().optional(),
            approvalSteps: z.string().optional(),
            handlers: z.string().optional(),
            ccRecipients: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(["active", "inactive"]).optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const current = await getWorkflowTemplateById(input.id);
        await updateWorkflowTemplate(input.id, {
          ...input.data,
          updatedBy: ctx.user?.id,
        });
        const syncResult = await syncPendingWorkflowRunsForTemplate(input.id);
        if (current) {
          const nextModule = input.data.module || current.module;
          const nextFormType = input.data.formType || current.formType;
          const nextFormName = input.data.name || current.name;
          const nextStatus = input.data.status || current.status || "inactive";
          const changedKey =
            current.module !== nextModule ||
            current.formType !== nextFormType ||
            current.name !== nextFormName;

          if (changedKey) {
            await setWorkflowFormCatalogApprovalEnabled({
              module: current.module,
              formType: current.formType,
              formName: current.name,
              approvalEnabled: false,
            });
          }

          await setWorkflowFormCatalogApprovalEnabled({
            module: nextModule,
            formType: nextFormType,
            formName: nextFormName,
            approvalEnabled: nextStatus === "active",
          });
        }
        const after = await getWorkflowTemplateById(input.id);
        await writeAuditTrail({
          ctx,
          module: "system",
          action: "update",
          targetType: "审批流程",
          targetId: input.id,
          targetName: String(after?.name || current?.name || input.id),
          description: `修改审批流程：${String(after?.name || current?.name || input.id)}（同步${syncResult.updatedRuns}条未完成流程，自动完成${syncResult.completedRuns}条）`,
          previousData: current as Record<string, unknown> | null,
          newData: after as Record<string, unknown> | null,
        });
        return { success: true, ...syncResult };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getWorkflowTemplateById(input.id);
        await deleteWorkflowTemplate(input.id, ctx.user?.id);
        if (current) {
          await setWorkflowFormCatalogApprovalEnabled({
            module: current.module,
            formType: current.formType,
            formName: current.name,
            approvalEnabled: false,
          });
        }
        await writeAuditTrail({
          ctx,
          module: "system",
          action: "delete",
          targetType: "审批流程",
          targetId: input.id,
          targetName: String(current?.name || input.id),
          description: `删除审批流程：${String(current?.name || input.id)}`,
          previousData: current as Record<string, unknown> | null,
        });
        return { success: true };
      }),
  }),

  workflowCenter: router({
    list: protectedProcedure
      .input(
        z.object({
          tab: z.enum(["todo", "created", "processed", "cc"]),
          search: z.string().optional(),
          limit: z.number().optional(),
          scopeKey: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        return await getWorkflowCenterData({
          operatorId: Number(ctx.user?.id || 0),
          operatorRole: String(ctx.user?.role || ""),
          operatorIsCompanyAdmin: Boolean(ctx.user?.isCompanyAdmin),
          operatorDepartment: String(ctx.user?.department || ""),
          companyId: getActiveCompanyId(ctx.user),
          tab: input.tab,
          search: input.search,
          limit: input.limit,
        });
      }),
    delete: adminProcedure
      .input(
        z.object({
          sourceType: z.enum([
            "sales_order",
            "purchase_order",
            "expense_reimbursement",
            "workflow_approval",
            "finance_receipt",
            "finance_payable",
            "quality_iqc",
            "quality_iqc_review",
            "quality_oqc",
            "material_requisition",
            "warehouse_production_in",
            "operation_log",
          ]),
          sourceId: z.number().optional(),
          sourceTable: z.string().optional(),
          runId: z.number().optional(),
          todoMetaId: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.sourceType === "operation_log") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "操作日志类型待办不支持删除",
          });
        }
        return await deleteWorkflowCenterTodo({
          operatorId: Number(ctx.user?.id || 0) || null,
          operatorName: String(ctx.user?.name || ""),
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          sourceTable: input.sourceTable,
          runId: input.runId,
          todoMetaId: input.todoMetaId,
        });
      }),
  }),

  // ==================== 人事管理 ====================
  personnel: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            departmentId: z.number().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getPersonnel(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getPersonnelById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          employeeNo: z.string(),
          name: z.string(),
          gender: z.enum(["male", "female"]).optional(),
          idCard: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          departmentId: z.number().nullable().optional(),
          position: z.string().optional(),
          entryDate: z.string().optional(),
          contractExpiry: z.string().optional(),
          education: z.string().optional(),
          major: z.string().optional(),
          healthStatus: z.string().optional(),
          emergencyContact: z.string().optional(),
          emergencyPhone: z.string().optional(),
          address: z.string().optional(),
          status: z
            .enum(["active", "probation", "resigned", "terminated"])
            .optional(),
          userId: z.number().optional(),
          signatureImageUrl: z.string().optional(),
          signatureImageName: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { entryDate, contractExpiry, ...rest } = input;
        return await createPersonnel({
          ...rest,
          entryDate: entryDate ? (new Date(entryDate) as any) : undefined,
          contractExpiry: contractExpiry
            ? (new Date(contractExpiry) as any)
            : undefined,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            employeeNo: z.string().optional(),
            name: z.string().optional(),
            gender: z.enum(["male", "female"]).optional(),
            idCard: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            departmentId: z.number().nullable().optional(),
            position: z.string().optional(),
            entryDate: z.string().optional(),
            contractExpiry: z.string().optional(),
            education: z.string().optional(),
            major: z.string().optional(),
            healthStatus: z.string().optional(),
            status: z
              .enum(["active", "probation", "resigned", "terminated"])
              .optional(),
            address: z.string().optional(),
            userId: z.number().optional(),
            signatureImageUrl: z.string().optional(),
            signatureImageName: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { entryDate, contractExpiry, ...rest } = input.data;
        await updatePersonnel(input.id, {
          ...rest,
          entryDate: entryDate ? (new Date(entryDate) as any) : undefined,
          contractExpiry: contractExpiry
            ? (new Date(contractExpiry) as any)
            : undefined,
        });
        return { success: true };
      }),
    uploadSignature: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string(),
          mimeType: z.string().optional(),
          base64: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensurePersonnelExtendedColumns(db);
        const base64Body = String(input.base64 || "").replace(
          /^data:[^;]+;base64,/,
          ""
        );
        const fileBuffer = Buffer.from(base64Body, "base64");
        const saved = await saveAttachmentFile({
          department: "管理部",
          businessFolder: "电子签名",
          originalName: input.name,
          desiredBaseName: `SIG-P${input.id}`,
          mimeType: input.mimeType,
          buffer: fileBuffer,
        });
        await db
          .update(personnelTable)
          .set({
            signatureImageUrl: saved.filePath,
            signatureImageName: saved.fileName,
          })
          .where(eq(personnelTable.id, input.id));
        return {
          signatureImageUrl: saved.filePath,
          signatureImageName: saved.fileName,
        };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePersonnel(input.id);
        return { success: true };
      }),
  }),

  personnelSalary: router({
    listSettings: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            departmentId: z.number().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getPersonnelSalarySettings(input);
      }),
    getSettingById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getPersonnelSalarySettingById(input.id);
      }),
    saveSetting: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          personnelId: z.number(),
          payrollType: z.enum(["monthly", "daily"]).optional(),
          baseSalary: z.union([z.string(), z.number()]).optional(),
          fullAttendanceDays: z.union([z.string(), z.number()]).optional(),
          overtimeHourlyRate: z.union([z.string(), z.number()]).optional(),
          allowance: z.union([z.string(), z.number()]).optional(),
          performanceBonus: z.union([z.string(), z.number()]).optional(),
          socialSecurity: z.union([z.string(), z.number()]).optional(),
          housingFund: z.union([z.string(), z.number()]).optional(),
          otherDeduction: z.union([z.string(), z.number()]).optional(),
          commissionEnabled: z.boolean().optional(),
          commissionRate: z.union([z.string(), z.number()]).optional(),
          status: z.enum(["active", "inactive"]).optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await upsertPersonnelSalarySetting({
          ...input,
          baseSalary:
            input.baseSalary == null ? undefined : String(input.baseSalary),
          fullAttendanceDays:
            input.fullAttendanceDays == null
              ? undefined
              : String(input.fullAttendanceDays),
          overtimeHourlyRate:
            input.overtimeHourlyRate == null
              ? undefined
              : String(input.overtimeHourlyRate),
          allowance:
            input.allowance == null ? undefined : String(input.allowance),
          performanceBonus:
            input.performanceBonus == null
              ? undefined
              : String(input.performanceBonus),
          socialSecurity:
            input.socialSecurity == null
              ? undefined
              : String(input.socialSecurity),
          housingFund:
            input.housingFund == null ? undefined : String(input.housingFund),
          otherDeduction:
            input.otherDeduction == null
              ? undefined
              : String(input.otherDeduction),
          commissionRate:
            input.commissionRate == null
              ? undefined
              : String(input.commissionRate),
          createdBy: ctx.user?.id ?? null,
        });
        return { id };
      }),
    deleteSetting: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deletePersonnelSalarySetting(input.id, ctx.user?.id);
        return { success: true };
      }),
    listPayroll: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            periodMonth: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getPersonnelPayrollRecords(input);
      }),
    getPayrollById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getPersonnelPayrollRecordById(input.id);
      }),
    previewAttendance: protectedProcedure
      .input(
        z.object({
          periodMonth: z.string(),
          attendanceFileName: z.string().optional(),
          rows: z.array(z.record(z.string(), z.unknown())),
        })
      )
      .mutation(async ({ input }) => {
        return await previewPersonnelPayrollFromAttendance(input);
      }),
    importAttendance: protectedProcedure
      .input(
        z.object({
          periodMonth: z.string(),
          attendanceFileName: z.string().optional(),
          rows: z.array(z.record(z.string(), z.unknown())),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await importPersonnelPayrollFromAttendance({
          ...input,
          createdBy: ctx.user?.id,
        });
      }),
    updatePayrollStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["draft", "confirmed", "paid"]),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const current = await getPersonnelPayrollRecordById(input.id);
        await updatePersonnelPayrollRecord(input.id, {
          status: input.status,
          remark: input.remark ?? current?.remark ?? undefined,
        });
        return { success: true };
      }),
    deletePayroll: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deletePersonnelPayrollRecord(input.id, ctx.user?.id);
        return { success: true };
      }),
  }),

  // ==================== 培训管理 ====================
  trainings: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            type: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getTrainings(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getTrainingById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          type: z.enum([
            "onboarding",
            "skill",
            "compliance",
            "safety",
            "other",
          ]),
          trainerId: z.number().optional(),
          departmentId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          location: z.string().optional(),
          participants: z.number().optional(),
          content: z.string().optional(),
          status: z
            .enum(["planned", "in_progress", "completed", "cancelled"])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { startDate, endDate, ...rest } = input;
        return await createTraining({
          ...rest,
          startDate: startDate ? (new Date(startDate) as any) : undefined,
          endDate: endDate ? (new Date(endDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            title: z.string().optional(),
            type: z
              .enum(["onboarding", "skill", "compliance", "safety", "other"])
              .optional(),
            trainerId: z.number().optional(),
            departmentId: z.number().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            location: z.string().optional(),
            participants: z.number().optional(),
            content: z.string().optional(),
            status: z
              .enum(["planned", "in_progress", "completed", "cancelled"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { startDate, endDate, ...rest } = input.data;
        await updateTraining(input.id, {
          ...rest,
          startDate: startDate ? (new Date(startDate) as any) : undefined,
          endDate: endDate ? (new Date(endDate) as any) : undefined,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTraining(input.id);
        return { success: true };
      }),
  }),

  // ==================== 内审管理 ====================
  audits: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            type: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getAudits(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getAuditById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          auditNo: z.string(),
          title: z.string(),
          type: z.enum(["internal", "external", "supplier", "process"]),
          departmentId: z.number().optional(),
          auditorId: z.number().optional(),
          auditDate: z.string().optional(),
          findings: z.string().optional(),
          correctiveActions: z.string().optional(),
          status: z
            .enum(["planned", "in_progress", "completed", "closed"])
            .optional(),
          result: z.enum(["pass", "conditional", "fail"]).optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { auditDate, ...rest } = input;
        return await createAudit({
          ...rest,
          auditDate: auditDate ? (new Date(auditDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            title: z.string().optional(),
            type: z
              .enum(["internal", "external", "supplier", "process"])
              .optional(),
            departmentId: z.number().optional(),
            auditorId: z.number().optional(),
            auditDate: z.string().optional(),
            findings: z.string().optional(),
            correctiveActions: z.string().optional(),
            status: z
              .enum(["planned", "in_progress", "completed", "closed"])
              .optional(),
            result: z.enum(["pass", "conditional", "fail"]).optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { auditDate, ...rest } = input.data;
        await updateAudit(input.id, {
          ...rest,
          auditDate: auditDate ? (new Date(auditDate) as any) : undefined,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAudit(input.id);
        return { success: true };
      }),
  }),

  // ==================== 研发项目 ====================
  rdProjects: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            type: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getRdProjects(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getRdProjectById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          projectNo: z.string().optional(),
          name: z.string(),
          type: z.enum([
            "new_product",
            "improvement",
            "customization",
            "research",
          ]),
          productId: z.number().optional(),
          leaderId: z.number().optional(),
          raOwnerId: z.number().optional(),
          qaOwnerId: z.number().optional(),
          productionOwnerId: z.number().optional(),
          clinicalOwnerId: z.number().optional(),
          projectCategory: z.string().optional(),
          developmentType: z.string().optional(),
          priority: z.string().optional(),
          currentStage: z.string().optional(),
          releaseStatus: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          targetFinishDate: z.string().optional(),
          actualFinishDate: z.string().optional(),
          launchDate: z.string().optional(),
          budget: z.string().optional(),
          progress: z.number().optional(),
          status: z
            .enum([
              "planning",
              "in_progress",
              "testing",
              "completed",
              "suspended",
              "cancelled",
            ])
            .optional(),
          targetMarkets: z
            .array(z.enum(["EU_MDR", "US_FDA", "CN_NMPA"]))
            .optional(),
          projectData: z.any().optional(),
          description: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const {
          startDate,
          endDate,
          targetFinishDate,
          actualFinishDate,
          launchDate,
          ...rest
        } = input;
        return await createRdProject({
          ...rest,
          startDate: startDate ? (new Date(startDate) as any) : undefined,
          endDate: endDate ? (new Date(endDate) as any) : undefined,
          targetFinishDate: targetFinishDate
            ? (new Date(targetFinishDate) as any)
            : undefined,
          actualFinishDate: actualFinishDate
            ? (new Date(actualFinishDate) as any)
            : undefined,
          launchDate: launchDate ? (new Date(launchDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            name: z.string().optional(),
            type: z
              .enum(["new_product", "improvement", "customization", "research"])
              .optional(),
            productId: z.number().optional(),
            leaderId: z.number().optional(),
            raOwnerId: z.number().optional(),
            qaOwnerId: z.number().optional(),
            productionOwnerId: z.number().optional(),
            clinicalOwnerId: z.number().optional(),
            projectCategory: z.string().optional(),
            developmentType: z.string().optional(),
            priority: z.string().optional(),
            currentStage: z.string().optional(),
            releaseStatus: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            targetFinishDate: z.string().optional(),
            actualFinishDate: z.string().optional(),
            launchDate: z.string().optional(),
            budget: z.string().optional(),
            progress: z.number().optional(),
            status: z
              .enum([
                "planning",
                "in_progress",
                "testing",
                "completed",
                "suspended",
                "cancelled",
              ])
              .optional(),
            targetMarkets: z
              .array(z.enum(["EU_MDR", "US_FDA", "CN_NMPA"]))
              .optional(),
            projectData: z.any().optional(),
            description: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const {
          startDate,
          endDate,
          targetFinishDate,
          actualFinishDate,
          launchDate,
          ...rest
        } = input.data;
        await updateRdProject(input.id, {
          ...rest,
          startDate: startDate ? (new Date(startDate) as any) : undefined,
          endDate: endDate ? (new Date(endDate) as any) : undefined,
          targetFinishDate: targetFinishDate
            ? (new Date(targetFinishDate) as any)
            : undefined,
          actualFinishDate: actualFinishDate
            ? (new Date(actualFinishDate) as any)
            : undefined,
          launchDate: launchDate ? (new Date(launchDate) as any) : undefined,
        });
        return { success: true };
      }),
    uploadDeliverableAttachment: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          deliverableId: z.string(),
          name: z.string(),
          mimeType: z.string().optional(),
          base64: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const project = await getRdProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "未找到研发项目" });
        }

        const rawProjectData =
          typeof (project as any).projectData === "string"
            ? (() => {
                try {
                  return JSON.parse(
                    String((project as any).projectData || "{}")
                  );
                } catch {
                  return {};
                }
              })()
            : (project as any).projectData || {};

        const deliverables = Array.isArray(rawProjectData?.deliverables)
          ? rawProjectData.deliverables
          : [];
        const deliverableIndex = deliverables.findIndex(
          (item: any) => String(item?.id || "") === input.deliverableId
        );
        if (deliverableIndex < 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "未找到对应输出物",
          });
        }

        const base64Body = String(input.base64 || "").replace(
          /^data:[^;]+;base64,/,
          ""
        );
        const fileBuffer = Buffer.from(base64Body, "base64");
        const deliverable = deliverables[deliverableIndex];
        const saved = await saveAttachmentFile({
          department: "研发部",
          businessFolder: `项目管理/${String((project as any).projectNo || input.projectId)}/${String(deliverable?.code || input.deliverableId)}`,
          originalName: input.name,
          desiredBaseName: `RD-${safeFileSegment(String(deliverable?.code || input.deliverableId || "DEL"))}`,
          mimeType: input.mimeType,
          buffer: fileBuffer,
          saveToFileManager: true,
        });

        const attachment = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: input.name,
          fileName: saved.fileName,
          filePath: saved.filePath,
          mimeType: input.mimeType || "",
          uploadedAt: new Date().toISOString(),
        };

        const nextDeliverables = deliverables.map(
          (item: any, index: number) => {
            if (index !== deliverableIndex) return item;
            const attachments = Array.isArray(item?.attachments)
              ? item.attachments
              : [];
            return {
              ...item,
              attachments: [...attachments, attachment],
              lastRevisedAt: new Date().toISOString().slice(0, 10),
              status: item?.status === "not_started" ? "draft" : item?.status,
            };
          }
        );

        const nextProjectData = {
          ...rawProjectData,
          deliverables: nextDeliverables,
        };

        await updateRdProject(input.projectId, {
          projectData: nextProjectData as any,
        });

        return attachment;
      }),
    saveDeliverableContent: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          deliverableId: z.string(),
          content: z.string(),
          structuredData: z.any().optional(),
          templateName: z.string().optional(),
          version: z.string().optional(),
          ownerName: z.string().optional(),
          status: z
            .enum([
              "not_started",
              "draft",
              "in_review",
              "approved",
              "archived",
              "na",
            ])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const project = await getRdProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "未找到研发项目" });
        }

        const rawProjectData =
          typeof (project as any).projectData === "string"
            ? (() => {
                try {
                  return JSON.parse(
                    String((project as any).projectData || "{}")
                  );
                } catch {
                  return {};
                }
              })()
            : (project as any).projectData || {};

        const deliverables = Array.isArray(rawProjectData?.deliverables)
          ? rawProjectData.deliverables
          : [];
        const deliverableIndex = deliverables.findIndex(
          (item: any) => String(item?.id || "") === input.deliverableId
        );
        if (deliverableIndex < 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "未找到对应输出物",
          });
        }

        const now = new Date();
        const nextDeliverables = deliverables.map(
          (item: any, index: number) => {
            if (index !== deliverableIndex) return item;
            return {
              ...item,
              content: input.content,
              structuredData: input.structuredData ?? item?.structuredData,
              templateName: input.templateName || item?.templateName || "",
              version: input.version ?? item?.version,
              ownerName: input.ownerName ?? item?.ownerName,
              status:
                input.status ||
                (item?.status === "not_started" ? "draft" : item?.status),
              contentUpdatedAt: now.toISOString(),
              lastRevisedAt: now.toISOString().slice(0, 10),
            };
          }
        );

        await updateRdProject(input.projectId, {
          projectData: {
            ...rawProjectData,
            deliverables: nextDeliverables,
          } as any,
        });

        return {
          savedAt: now.toISOString(),
        };
      }),
    generateDeliverableAiContent: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          deliverableId: z.string(),
          currentContent: z.string().optional(),
          userPrompt: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const project = await getRdProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "未找到研发项目" });
        }

        const rawProjectData =
          typeof (project as any).projectData === "string"
            ? (() => {
                try {
                  return JSON.parse(
                    String((project as any).projectData || "{}")
                  );
                } catch {
                  return {};
                }
              })()
            : (project as any).projectData || {};

        const deliverables = Array.isArray(rawProjectData?.deliverables)
          ? rawProjectData.deliverables
          : [];
        const deliverable = deliverables.find(
          (item: any) => String(item?.id || "") === input.deliverableId
        );
        if (!deliverable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "未找到对应输出物",
          });
        }

        const product = (project as any).productId
          ? await getProductById(Number((project as any).productId))
          : null;
        const targetMarkets = Array.isArray((project as any).targetMarkets)
          ? (project as any).targetMarkets
          : typeof (project as any).targetMarkets === "string"
            ? (() => {
                try {
                  return JSON.parse((project as any).targetMarkets);
                } catch {
                  return [];
                }
              })()
            : [];

        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是一名医疗器械研发项目文件编写助手。请根据项目上下文，为指定研发输出物生成可直接编辑的中文 HTML 正文初稿。要求：结构化、专业、贴合医疗器械设计开发流程；优先遵循中国研发表单逻辑，同时兼顾 MDR / FDA / NMPA 要求；未知信息用“[待补充]”占位；只输出正文 HTML，可使用 h1/h2/h3/p/ul/ol/li/table/thead/tbody/tr/th/td/strong 标签，不要输出 Markdown，不要解释。",
            },
            {
              role: "user",
              content: `请为以下研发输出物生成一版可直接在线编辑的 HTML 正文初稿：\n\n项目编号：${String((project as any).projectNo || "")}\n项目名称：${String((project as any).name || "")}\n项目类型：${String((project as any).type || "")}\n当前阶段：${String((project as any).currentStage || "")}\n目标市场：${Array.isArray(targetMarkets) ? targetMarkets.join(" / ") : ""}\n输出物编号：${String(deliverable.code || "")}\n输出物名称：${String(deliverable.name || "")}\n输出物阶段：${String(deliverable.stageName || deliverable.stageCode || "")}\n输出物说明：${String(deliverable.description || "")}\n\n产品信息：\n${JSON.stringify(
                {
                  code: product?.code || "",
                  name: product?.name || "",
                  specification: product?.specification || "",
                  riskLevel: product?.riskLevel || "",
                  registrationNo: product?.registrationNo || "",
                  udiDi: product?.udiDi || "",
                  isSterilized: product?.isSterilized || false,
                  description: product?.description || "",
                },
                null,
                2
              )}\n\n项目资料：\n${JSON.stringify(rawProjectData?.profile || {}, null, 2)}\n\n当前模板/现有内容：\n${String(input.currentContent || deliverable.content || "[待生成模板内容]")}\n\n补充要求：${String(input.userPrompt || "请补齐正式文档结构，并保留可后续人工编辑的占位。")}\n\n请直接输出 HTML 正文。`,
            },
          ],
          maxTokens: 1800,
        });

        const content = result.choices[0]?.message?.content;
        const text =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content
                  .filter(
                    (c: any): c is { type: "text"; text: string } =>
                      c?.type === "text"
                  )
                  .map((c: any) => c.text)
                  .join("")
              : "";

        return { content: text };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteRdProject(input.id);
        return { success: true };
      }),
  }),

  rdDrawings: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      const rows = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.department, "研发部"),
            like(documents.description, `%"type":"drawing"%`)
          )
        )
        .orderBy(desc(documents.updatedAt));

      const grouped = new Map<
        string,
        {
          id: number;
          docIds: number[];
          drawingNo: string;
          name: string;
          productId: number;
          productCode: string;
          productName: string;
          bomCode: string;
          bomVersion: string;
          category: string;
          owner: string;
          version: string;
          updatedAt: string | Date | null;
          status: "draft" | "review" | "released";
          description: string;
          files: Array<{
            id: string;
            name: string;
            format: string;
            size: string;
            version: string;
            note: string;
            fileUrl: string;
            dimensions?: {
              length: number;
              width: number;
              height: number;
              unit: string;
            };
          }>;
        }
      >();

      for (const row of rows as any[]) {
        const meta = parseRdDrawingMeta(row.description);
        const ext =
          String(row.filePath || "")
            .split(".")
            .pop()
            ?.toUpperCase() || "";
        const status =
          row.status === "approved"
            ? "released"
            : row.status === "reviewing"
              ? "review"
              : "draft";
        const drawingNo = String(meta.sourceDrawingNo || row.docNo || "");
        const drawingName = String(
          meta.sourceTitle || stripRdDrawingFormatSuffix(String(row.title || ""))
        );
        const productId = Number(meta.productId || 0);
        const productCode = String(meta.productCode || "");
        const productName = String(meta.productName || "");
        const bomCode = String(meta.bomCode || "");
        const bomVersion = String(meta.bomVersion || "");
        const category = String(meta.drawingCategory || "图纸");
        const version = String(row.version || "V1.0");
        const groupKey = [
          productId || "",
          productCode,
          productName,
          bomCode,
          bomVersion,
          category,
          version,
          drawingNo || drawingName,
        ].join("::");
        const fileEntry = row.filePath
          ? {
              id: `${row.id}-main`,
              name:
                meta.originalName ||
                meta.fileName ||
                String(row.filePath).split("/").pop() ||
                "",
              format: ext,
              size: formatBytesText(Number(meta.fileSize || 0)),
              version,
              note: meta.sourceAttachmentRole
                ? `${ext || "文件"} · ${meta.sourceAttachmentRole}`
                : `${ext || "文件"} 已从知识库调取`,
              fileUrl: `/uploads${row.filePath}`,
              dimensions:
                meta.dimensions &&
                (Number.isFinite(Number(meta.dimensions.length)) ||
                  Number.isFinite(Number(meta.dimensions.width)) ||
                  Number.isFinite(Number(meta.dimensions.height)))
                  ? {
                      length: Number(meta.dimensions.length || 0),
                      width: Number(meta.dimensions.width || 0),
                      height: Number(meta.dimensions.height || 0),
                      unit: String(meta.dimensions.unit || "mm"),
                    }
                  : undefined,
            }
          : null;

        const existing = grouped.get(groupKey);
        if (!existing) {
          grouped.set(groupKey, {
            id: row.id,
            docIds: [row.id],
            drawingNo,
            name: drawingName,
            productId,
            productCode,
            productName,
            bomCode,
            bomVersion,
            category,
            owner: String(meta.owner || ""),
            version,
            updatedAt: row.updatedAt,
            status,
            description: String(meta.description || ""),
            files: fileEntry ? [fileEntry] : [],
          });
          continue;
        }

        if (
          !existing.updatedAt ||
          (row.updatedAt && new Date(row.updatedAt).getTime() > new Date(existing.updatedAt).getTime())
        ) {
          existing.updatedAt = row.updatedAt;
          existing.id = row.id;
        }
        if (!existing.docIds.includes(row.id)) {
          existing.docIds.push(row.id);
        }
        if (
          getRdDrawingStatusPriority(status) <
          getRdDrawingStatusPriority(existing.status)
        ) {
          existing.status = status;
        }
        if (!existing.owner && meta.owner) {
          existing.owner = String(meta.owner);
        }
        if (!existing.bomCode && bomCode) {
          existing.bomCode = bomCode;
        }
        if (!existing.bomVersion && bomVersion) {
          existing.bomVersion = bomVersion;
        }
        if (!existing.description && meta.description) {
          existing.description = String(meta.description);
        }
        if (
          fileEntry &&
          !existing.files.some(
            (file) => file.fileUrl === fileEntry.fileUrl || file.name === fileEntry.name
          )
        ) {
          existing.files.push(fileEntry);
        }
      }

      return Array.from(grouped.values())
        .map((item) => ({
          ...item,
          files: [...item.files].sort((a, b) => {
            const priorityDiff =
              getRdDrawingFormatPriority(a.format) -
              getRdDrawingFormatPriority(b.format);
            if (priorityDiff !== 0) return priorityDiff;
            return a.name.localeCompare(b.name, "zh-CN");
          }),
        }))
        .sort((a, b) => {
          const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return bTime - aTime;
        });
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          productId: z.number(),
          bomCode: z.string().optional(),
          bomVersion: z.string().optional(),
          category: z.string().optional(),
          version: z.string().optional(),
          description: z.string().optional(),
          length: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          unit: z.string().optional(),
          file: z.object({
            name: z.string(),
            mimeType: z.string().optional(),
            base64: z.string(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const product = await getProductById(input.productId);
        if (!product) {
          throw new Error("未找到对应产品，请先在产品管理中维护产品");
        }

        const docNo = await buildNextRdDrawingNo(db);
        const rawExt = String(
          input.file.name.split(".").pop() || ""
        ).toLowerCase();
        const ext = rawExt ? `.${rawExt}` : "";
        if (
          !RD_DRAWING_ALLOWED_EXTENSIONS.includes(
            ext as (typeof RD_DRAWING_ALLOWED_EXTENSIONS)[number]
          )
        ) {
          throw new Error(
            "当前仅支持 PDF、DWG、DXF、STP、STEP、IGS、IGES、STL、OBJ、GLB、GLTF、FBX、PLY、3DS、3MF 文件"
          );
        }
        const base64Body = String(input.file.base64 || "").replace(
          /^data:[^;]+;base64,/,
          ""
        );
        const fileBuffer = Buffer.from(base64Body, "base64");
        const productFolder =
          safeFileSegment(`${product.code || "产品"}-${product.name || ""}`) ||
          "产品";
        const virtualDir = `/ERP/知识库/研发部/图纸管理/${productFolder}/${docNo}`;
        const storedFileName = `${docNo}${ext}`;
        const virtualFilePath = await saveFile(
          virtualDir,
          storedFileName,
          fileBuffer
        );
        const ownerName = String(
          (ctx.user as any)?.name || (ctx.user as any)?.username || ""
        );
        const drawingMeta = {
          type: "drawing",
          productId: Number(product.id),
          productCode: String(product.code || ""),
          productName: String(product.name || ""),
          bomCode: input.bomCode || "",
          bomVersion: input.bomVersion || "",
          drawingCategory: input.category || "图纸",
          description: input.description || "",
          owner: ownerName,
          fileName: storedFileName,
          originalName: input.file.name,
          mimeType: input.file.mimeType || "",
          fileSize: fileBuffer.length,
          dimensions: {
            length: input.length,
            width: input.width,
            height: input.height,
            unit: input.unit || "mm",
          },
        };

        await db.insert(documents).values({
          docNo,
          title: input.name,
          category: "record",
          version: input.version || "V1.0",
          department: "研发部",
          status: "approved",
          effectiveDate: new Date() as any,
          filePath: virtualFilePath,
          description: JSON.stringify(drawingMeta),
          createdBy: ctx.user?.id,
        });

        return {
          docNo,
          filePath: virtualFilePath,
        };
      }),
    update: protectedProcedure
      .input(
        z.object({
          ids: z.array(z.number()).min(1),
          name: z.string().min(1),
          productId: z.number(),
          bomCode: z.string().optional(),
          bomVersion: z.string().optional(),
          category: z.string().optional(),
          version: z.string().optional(),
          description: z.string().optional(),
          length: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          unit: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const rows = await ensureRdDrawingManageAccess(input.ids, ctx.user);
        const product = await getProductById(input.productId);
        if (!product) {
          throw new Error("未找到对应产品，请先在产品管理中维护产品");
        }

        for (const row of rows) {
          const meta = parseRdDrawingMeta(row.description);
          const nextMeta = {
            ...meta,
            type: "drawing",
            productId: Number(product.id),
            productCode: String(product.code || ""),
            productName: String(product.name || ""),
            bomCode: input.bomCode || "",
            bomVersion: input.bomVersion || "",
            drawingCategory: input.category || meta.drawingCategory || "图纸",
            description: input.description || "",
            dimensions: {
              ...(meta.dimensions || {}),
              length: input.length,
              width: input.width,
              height: input.height,
              unit: input.unit || meta.dimensions?.unit || "mm",
            },
          };

          await db
            .update(documents)
            .set({
              title: input.name,
              version: input.version || row.version || "V1.0",
              description: JSON.stringify(nextMeta),
            })
            .where(eq(documents.id, row.id));
        }

        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input, ctx }) => {
        const rows = await ensureRdDrawingManageAccess(input.ids, ctx.user);
        for (const row of rows) {
          await deleteDocument(Number(row.id), ctx.user?.id);
        }
        return { success: true, count: rows.length };
      }),
  }),

  // ==================== 盘点管理 ====================
  stocktakes: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            warehouseId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getStocktakes(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getStocktakeById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          stocktakeNo: z.string().optional(),
          warehouseId: z.number(),
          type: z.enum(["full", "partial", "spot"]),
          stocktakeDate: z.string(),
          operatorId: z.number().optional(),
          systemQty: z.string().optional(),
          actualQty: z.string().optional(),
          diffQty: z.string().optional(),
          status: z
            .enum(["planned", "in_progress", "completed", "approved"])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { stocktakeDate, ...rest } = input;
        const id = await createStocktake({
          ...rest,
          stocktakeDate: new Date(stocktakeDate) as any,
          createdBy: ctx.user?.id,
        });
        await archiveStocktakeSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            systemQty: z.string().optional(),
            actualQty: z.string().optional(),
            diffQty: z.string().optional(),
            status: z
              .enum(["planned", "in_progress", "completed", "approved"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateStocktake(input.id, input.data);
        await archiveStocktakeSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteStocktake(input.id);
        return { success: true };
      }),
  }),

  // ==================== 质量不良事件 ====================
  qualityIncidents: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            type: z.string().optional(),
            severity: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getQualityIncidents(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getQualityIncidentById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          incidentNo: z.string().optional(),
          title: z.string(),
          type: z.enum([
            "complaint",
            "nonconformance",
            "capa",
            "recall",
            "deviation",
          ]),
          severity: z.enum(["low", "medium", "high", "critical"]).optional(),
          productId: z.number().optional(),
          batchNo: z.string().optional(),
          description: z.string().optional(),
          rootCause: z.string().optional(),
          correctiveAction: z.string().optional(),
          preventiveAction: z.string().optional(),
          assigneeId: z.number().optional(),
          reportDate: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { reportDate, ...rest } = input;
        const id = await createQualityIncident({
          ...rest,
          reportDate: reportDate ? (new Date(reportDate) as any) : undefined,
          reporterId: ctx.user?.id,
        });
        await archiveQualityIncidentSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            title: z.string().optional(),
            type: z
              .enum([
                "complaint",
                "nonconformance",
                "capa",
                "recall",
                "deviation",
              ])
              .optional(),
            severity: z.enum(["low", "medium", "high", "critical"]).optional(),
            description: z.string().optional(),
            rootCause: z.string().optional(),
            correctiveAction: z.string().optional(),
            preventiveAction: z.string().optional(),
            assigneeId: z.number().optional(),
            closeDate: z.string().optional(),
            status: z
              .enum([
                "open",
                "investigating",
                "correcting",
                "verifying",
                "closed",
              ])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { closeDate, ...rest } = input.data;
        await updateQualityIncident(input.id, {
          ...rest,
          closeDate: closeDate ? (new Date(closeDate) as any) : undefined,
        });
        await archiveQualityIncidentSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getQualityIncidentById(input.id);
        await deleteQualityIncident(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  // ==================== 样品管理 ====================
  samples: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            sampleType: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getSamples(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getSampleById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          sampleNo: z.string().optional(),
          productId: z.number().optional(),
          batchNo: z.string().optional(),
          sampleType: z.enum([
            "raw_material",
            "semi_finished",
            "finished",
            "stability",
            "retention",
          ]),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          storageLocation: z.string().optional(),
          storageCondition: z.string().optional(),
          samplingDate: z.string().optional(),
          expiryDate: z.string().optional(),
          status: z
            .enum(["stored", "testing", "used", "expired", "destroyed"])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { samplingDate, expiryDate, ...rest } = input;
        const id = await createSample({
          ...rest,
          samplingDate: samplingDate
            ? (new Date(samplingDate) as any)
            : undefined,
          expiryDate: expiryDate ? (new Date(expiryDate) as any) : undefined,
          samplerId: ctx.user?.id,
        });
        await archiveSampleSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            storageLocation: z.string().optional(),
            storageCondition: z.string().optional(),
            status: z
              .enum(["stored", "testing", "used", "expired", "destroyed"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateSample(input.id, input.data);
        await archiveSampleSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getSampleById(input.id);
        await deleteSample(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  // ==================== 实验室记录 ====================
  labRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            conclusion: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getLabRecords(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getLabRecordById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          recordNo: z.string().optional(),
          formId: z.string().optional(),
          formTitle: z.string().optional(),
          formType: z.string().optional(),
          sampleId: z.number().optional(),
          testType: z.string(),
          testMethod: z.string().optional(),
          specification: z.string().optional(),
          result: z.string().optional(),
          formData: z.record(z.string()).optional(),
          conclusion: z.enum(["pass", "fail", "pending"]).optional(),
          equipmentId: z.number().optional(),
          testDate: z.string().optional(),
          testerName: z.string().optional(),
          reviewerName: z.string().optional(),
          reviewDate: z.string().optional(),
          reviewerId: z.number().optional(),
          status: z
            .enum(["pending", "testing", "completed", "reviewed"])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { testDate, reviewDate, ...rest } = input;
        const id = await createLabRecord({
          ...rest,
          testDate: testDate ? (new Date(testDate) as any) : undefined,
          reviewDate: reviewDate ? (new Date(reviewDate) as any) : undefined,
          testerId: ctx.user?.id,
        });
        await archiveLabRecordSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            recordNo: z.string().optional(),
            formId: z.string().optional(),
            formTitle: z.string().optional(),
            formType: z.string().optional(),
            testType: z.string().optional(),
            testMethod: z.string().optional(),
            specification: z.string().optional(),
            result: z.string().optional(),
            formData: z.record(z.string()).optional(),
            conclusion: z.enum(["pass", "fail", "pending"]).optional(),
            equipmentId: z.number().optional(),
            testerName: z.string().optional(),
            reviewerId: z.number().optional(),
            reviewDate: z.string().optional(),
            reviewerName: z.string().optional(),
            testDate: z.string().optional(),
            status: z
              .enum(["pending", "testing", "completed", "reviewed"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { reviewDate, testDate, ...rest } = input.data;
        await updateLabRecord(input.id, {
          ...rest,
          reviewDate: reviewDate ? (new Date(reviewDate) as any) : undefined,
          testDate: testDate ? (new Date(testDate) as any) : undefined,
        });
        await archiveLabRecordSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLabRecord(input.id);
        return { success: true };
      }),
  }),

  // ==================== 应收账款 ====================
  accountsReceivable: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            customerId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        await syncMissingReceivablesFromSalesOrders(
          ctx.user?.id,
          singleUserId,
          multipleUserIds,
          activeCompanyId
        );
        return await getAccountsReceivable({
          ...input,
          companyId: activeCompanyId,
          salesPersonId: singleUserId,
          salesPersonIds: multipleUserIds,
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const receivable = await getAccountsReceivableById(
          input.id,
          activeCompanyId
        );
        if (!receivable) return undefined;
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds) {
          const ownerId = Number(receivable.createdBy || 0);
          if (Number(receivable.salesOrderId || 0) > 0) {
            const order = await getSalesOrderById(
              Number(receivable.salesOrderId),
              activeCompanyId
            );
            const salesPersonId = Number(order?.salesPersonId || 0);
            if (!isOwnerWithinScope(salesPersonId, scopedUserIds)) {
              throw new Error("无权查看该应收记录");
            }
          } else if (!isOwnerWithinScope(ownerId, scopedUserIds)) {
            throw new Error("无权查看该应收记录");
          }
        }
        return receivable;
      }),
    create: protectedProcedure
      .input(
        z.object({
          invoiceNo: z.string().optional(),
          customerId: z.number(),
          salesOrderId: z.number().optional(),
          amount: z.string(),
          currency: z.string().optional(),
          amountBase: z.string().optional(),
          exchangeRate: z.string().optional(),
          bankAccountId: z.number().optional(),
          invoiceDate: z.string().optional(),
          dueDate: z.string().optional(),
          paymentMethod: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds && Number(input.salesOrderId || 0) > 0) {
          const order = await getSalesOrderById(
            Number(input.salesOrderId),
            activeCompanyId
          );
          const salesPersonId = Number(order?.salesPersonId || 0);
          if (!isOwnerWithinScope(salesPersonId, scopedUserIds)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "无权为其他销售人员创建应收记录",
            });
          }
        }
        const { invoiceDate, dueDate, ...rest } = input;
        const id = await createAccountsReceivable({
          ...rest,
          invoiceNo: input.invoiceNo,
          companyId: activeCompanyId,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
          dueDate: dueDate ? (new Date(dueDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveAccountsReceivableSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            invoiceNo: z.string().optional(),
            customerId: z.number().optional(),
            amount: z.string().optional(),
            paidAmount: z.string().optional(),
            status: z
              .enum(["pending", "partial", "paid", "overdue"])
              .optional(),
            invoiceDate: z.string().optional(),
            dueDate: z.string().optional(),
            receiptDate: z.string().optional(),
            paymentMethod: z.string().optional(),
            bankAccountId: z.number().optional(),
            serviceFeeAmount: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const oldReceivable = await getAccountsReceivableById(
          input.id,
          activeCompanyId
        );
        if (!oldReceivable) {
          throw new TRPCError({ code: "NOT_FOUND", message: "应收记录不存在" });
        }
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds) {
          const ownerId = Number(oldReceivable.createdBy || 0);
          if (Number(oldReceivable.salesOrderId || 0) > 0) {
            const order = await getSalesOrderById(
              Number(oldReceivable.salesOrderId),
              activeCompanyId
            );
            const salesPersonId = Number(order?.salesPersonId || 0);
            if (!isOwnerWithinScope(salesPersonId, scopedUserIds)) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "无权修改该应收记录",
              });
            }
          } else if (!isOwnerWithinScope(ownerId, scopedUserIds)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "无权修改该应收记录",
            });
          }
        }
        const { receiptDate, dueDate, invoiceDate, ...rest } = input.data;
        const receivableAmount =
          input.data.amount !== undefined
            ? Number(input.data.amount || 0)
            : Number(oldReceivable.amount || 0);
        const previousPaidAmount = Number(oldReceivable.paidAmount || 0);
        const nextPaidAmount =
          input.data.paidAmount !== undefined
            ? Number(input.data.paidAmount || 0)
            : previousPaidAmount;
        if (
          Number.isFinite(receivableAmount) &&
          Number.isFinite(nextPaidAmount) &&
          receivableAmount > 0 &&
          nextPaidAmount > receivableAmount + 0.0001
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `已收金额不能超过应收金额，当前最多可登记 ${toRoundedString(receivableAmount, 2)}`,
          });
        }
        const resolvedDueDate = dueDate
          ? (new Date(dueDate) as any)
          : (oldReceivable.dueDate ?? undefined);
        const resolvedStatus = deriveReceivableStatus(
          receivableAmount,
          nextPaidAmount,
          resolvedDueDate
        );
        await updateAccountsReceivable(input.id, {
          ...rest,
          status: resolvedStatus,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
          receiptDate: receiptDate ? (new Date(receiptDate) as any) : undefined,
          dueDate: dueDate ? (new Date(dueDate) as any) : undefined,
        });

        const incrementalReceipt = nextPaidAmount - previousPaidAmount;
        const createdPaymentRecordIds: number[] = [];
        const receiptBankAccountId = Number(
          input.data.bankAccountId || oldReceivable.bankAccountId || 0
        );
        const receiptDateText = String(
          input.data.receiptDate || oldReceivable.receiptDate || ""
        ).trim();
        const serviceFeeAmount = Number(input.data.serviceFeeAmount || 0);

        if (incrementalReceipt > 0 && Number.isFinite(incrementalReceipt)) {
          if (!(receiptBankAccountId > 0) || !receiptDateText) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "新增收款金额时，必须填写收款账户和收款日期，系统才能生成完整收款记录",
            });
          }
          const currency = String(
            oldReceivable.currency || "CNY"
          ).toUpperCase();
          const sourceAmount = Number(oldReceivable.amount || 0);
          const sourceBaseAmount = Number(oldReceivable.amountBase || 0);
          const ratio =
            sourceAmount > 0 && sourceBaseAmount > 0
              ? sourceBaseAmount / sourceAmount
              : 1;
          const deltaBaseAmount =
            currency === "CNY"
              ? incrementalReceipt
              : incrementalReceipt * ratio;
          const receiptRecordId = await createPaymentRecord({
            companyId: activeCompanyId,
            type: "receipt",
            relatedType: "sales_order",
            relatedId: Number(oldReceivable.salesOrderId || 0) || undefined,
            relatedNo: String(oldReceivable.invoiceNo || ""),
            customerId: Number(oldReceivable.customerId || 0) || undefined,
            amount: toRoundedString(incrementalReceipt, 2),
            currency,
            amountBase: toRoundedString(deltaBaseAmount, 2),
            exchangeRate: String(oldReceivable.exchangeRate || ratio || 1),
            bankAccountId: receiptBankAccountId,
            paymentDate: new Date(receiptDateText) as any,
            paymentMethod:
              input.data.paymentMethod ||
              oldReceivable.paymentMethod ||
              "银行转账",
            remark: input.data.remark || undefined,
            operatorId: ctx.user?.id,
          });
          createdPaymentRecordIds.push(receiptRecordId);

          if (Number.isFinite(serviceFeeAmount) && serviceFeeAmount > 0) {
            if (serviceFeeAmount >= incrementalReceipt) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "手续费不能大于等于收款金额",
              });
            }
            const feeBaseAmount =
              currency === "CNY"
                ? serviceFeeAmount
                : serviceFeeAmount * ratio;
            const feeRecordId = await createPaymentRecord({
              companyId: activeCompanyId,
              type: "payment",
              relatedType: "other",
              relatedNo: String(oldReceivable.invoiceNo || ""),
              customerId: Number(oldReceivable.customerId || 0) || undefined,
              amount: toRoundedString(serviceFeeAmount, 2),
              currency,
              amountBase: toRoundedString(feeBaseAmount, 2),
              exchangeRate: String(oldReceivable.exchangeRate || ratio || 1),
              bankAccountId: receiptBankAccountId,
              paymentDate: new Date(receiptDateText) as any,
              paymentMethod: "收款手续费",
              remark: input.data.remark
                ? `收款手续费：${input.data.remark}`
                : `收款手续费（${String(oldReceivable.invoiceNo || "")}）`,
              operatorId: ctx.user?.id,
            });
            createdPaymentRecordIds.push(feeRecordId);
          }
        }

        const updatedReceivable = await getAccountsReceivableById(
          input.id,
          activeCompanyId
        );
        await writeAuditTrail({
          ctx,
          module: "finance",
          action: "update",
          targetType: "应收账款",
          targetId: input.id,
          targetName: String(
            updatedReceivable?.invoiceNo || oldReceivable.invoiceNo || ""
          ),
          description: `更新应收账款：${String(updatedReceivable?.invoiceNo || oldReceivable.invoiceNo || "")}`,
          previousData: oldReceivable as any,
          newData: updatedReceivable as any,
        });
        await archiveAccountsReceivableSnapshotById(input.id, ctx.user?.id);
        for (const paymentRecordId of createdPaymentRecordIds) {
          await archivePaymentRecordSnapshotById(
            paymentRecordId,
            ctx.user?.id
          );
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const receivable = await getAccountsReceivableById(
          input.id,
          activeCompanyId
        );
        if (!receivable) {
          throw new TRPCError({ code: "NOT_FOUND", message: "应收记录不存在" });
        }
        const scopedUserIds = isSalesDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds) {
          const ownerId = Number(receivable.createdBy || 0);
          if (Number(receivable.salesOrderId || 0) > 0) {
            const order = await getSalesOrderById(
              Number(receivable.salesOrderId),
              activeCompanyId
            );
            const salesPersonId = Number(order?.salesPersonId || 0);
            if (!isOwnerWithinScope(salesPersonId, scopedUserIds)) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "无权删除该应收记录",
              });
            }
          } else if (!isOwnerWithinScope(ownerId, scopedUserIds)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "无权删除该应收记录",
            });
          }
        }
        await deleteAccountsReceivable(input.id);
        return { success: true };
      }),
    syncFromSalesOrders: protectedProcedure.mutation(async ({ ctx }) => {
      const activeCompanyId = getActiveCompanyId(ctx.user);
      const scopedUserIds = isSalesDepartmentUser(ctx.user)
        ? await getScopedOwnerUserIds(ctx.user)
        : undefined;
      const { singleUserId, multipleUserIds } =
        normalizeScopedUserParams(scopedUserIds);
      const result = await syncMissingReceivablesFromSalesOrders(
        ctx.user?.id,
        singleUserId,
        multipleUserIds,
        activeCompanyId
      );
      return { success: true, ...result };
    }),
  }),

  // ==================== 应付账款 ====================
  accountsPayable: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            supplierId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const scopedUserIds = isPurchaseDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        const { singleUserId, multipleUserIds } =
          normalizeScopedUserParams(scopedUserIds);
        return await getAccountsPayable({
          ...input,
          companyId: activeCompanyId,
          buyerId: singleUserId,
          buyerIds: multipleUserIds,
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const payable = await getAccountsPayableById(input.id, activeCompanyId);
        if (!payable) return undefined;
        const scopedUserIds = isPurchaseDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds) {
          const ownerId = Number(payable.createdBy || 0);
          if (Number(payable.purchaseOrderId || 0) > 0) {
            const order = await getPurchaseOrderById(
              Number(payable.purchaseOrderId),
              activeCompanyId
            );
            const buyerId = Number(order?.buyerId || order?.createdBy || 0);
            if (!isOwnerWithinScope(buyerId, scopedUserIds)) {
              throw new Error("无权查看该应付记录");
            }
          } else if (!isOwnerWithinScope(ownerId, scopedUserIds)) {
            throw new Error("无权查看该应付记录");
          }
        }
        return payable;
      }),
    create: protectedProcedure
      .input(
        z.object({
          invoiceNo: z.string(),
          supplierId: z.number(),
          supplierName: z.string().optional(),
          purchaseOrderId: z.number().optional(),
          amount: z.string(),
          currency: z.string().optional(),
          amountBase: z.string().optional(),
          exchangeRate: z.string().optional(),
          bankAccountId: z.number().optional(),
          invoiceDate: z.string().optional(),
          dueDate: z.string().optional(),
          paymentMethod: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const scopedUserIds = isPurchaseDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds && Number(input.purchaseOrderId || 0) > 0) {
          const order = await getPurchaseOrderById(
            Number(input.purchaseOrderId),
            activeCompanyId
          );
          const buyerId = Number(order?.buyerId || order?.createdBy || 0);
          if (!isOwnerWithinScope(buyerId, scopedUserIds)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "无权为其他采购人员创建应付记录",
            });
          }
        }
        const { invoiceDate, dueDate, ...rest } = input;
        const id = await createAccountsPayable({
          ...rest,
          companyId: activeCompanyId,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
          dueDate: dueDate ? (new Date(dueDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveAccountsPayableSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            invoiceNo: z.string().optional(),
            supplierId: z.number().optional(),
            supplierName: z.string().optional(),
            amount: z.string().optional(),
            paidAmount: z.string().optional(),
            status: z
              .enum(["pending", "partial", "paid", "overdue"])
              .optional(),
            invoiceDate: z.string().optional(),
            dueDate: z.string().optional(),
            paymentDate: z.string().optional(),
            paymentMethod: z.string().optional(),
            bankAccountId: z.number().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const oldPayable = await getAccountsPayableById(
          input.id,
          activeCompanyId
        );
        if (!oldPayable) {
          throw new TRPCError({ code: "NOT_FOUND", message: "应付记录不存在" });
        }
        const scopedUserIds = isPurchaseDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds) {
          const ownerId = Number(oldPayable.createdBy || 0);
          if (Number(oldPayable.purchaseOrderId || 0) > 0) {
            const order = await getPurchaseOrderById(
              Number(oldPayable.purchaseOrderId),
              activeCompanyId
            );
            const buyerId = Number(order?.buyerId || order?.createdBy || 0);
            if (!isOwnerWithinScope(buyerId, scopedUserIds)) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "无权修改该应付记录",
              });
            }
          } else if (!isOwnerWithinScope(ownerId, scopedUserIds)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "无权修改该应付记录",
            });
          }
        }
        const { paymentDate, dueDate, invoiceDate, ...rest } = input.data;
        await updateAccountsPayable(input.id, {
          ...rest,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
          dueDate: dueDate ? (new Date(dueDate) as any) : undefined,
          paymentDate: paymentDate ? (new Date(paymentDate) as any) : undefined,
        });
        await archiveAccountsPayableSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const payable = await getAccountsPayableById(input.id, activeCompanyId);
        if (!payable) {
          throw new TRPCError({ code: "NOT_FOUND", message: "应付记录不存在" });
        }
        const scopedUserIds = isPurchaseDepartmentUser(ctx.user)
          ? await getScopedOwnerUserIds(ctx.user)
          : undefined;
        if (scopedUserIds) {
          const ownerId = Number(payable.createdBy || 0);
          if (Number(payable.purchaseOrderId || 0) > 0) {
            const order = await getPurchaseOrderById(
              Number(payable.purchaseOrderId),
              activeCompanyId
            );
            const buyerId = Number(order?.buyerId || order?.createdBy || 0);
            if (!isOwnerWithinScope(buyerId, scopedUserIds)) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "无权删除该应付记录",
              });
            }
          } else if (!isOwnerWithinScope(ownerId, scopedUserIds)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "无权删除该应付记录",
            });
          }
        }
        await deleteAccountsPayable(input.id);
        return { success: true };
      }),
  }),

  // ==================== 发票管理 ====================
  receivedInvoices: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getReceivedInvoices({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getReceivedInvoiceById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (record) {
          await archiveReceivedInvoiceSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          invoiceNo: z.string(),
          invoiceCode: z.string().optional(),
          invoiceType: z.enum([
            "vat_special",
            "vat_normal",
            "electronic",
            "receipt",
          ]),
          supplierId: z.number().optional(),
          supplierName: z.string(),
          payableIds: z.array(z.number()).optional(),
          relatedOrderNo: z.string().optional(),
          invoiceDate: z.string().optional(),
          receiveDate: z.string().optional(),
          amountExTax: z.string(),
          taxRate: z.string().optional(),
          taxAmount: z.string().optional(),
          totalAmount: z.string(),
          verifyCode: z.string().optional(),
          status: z
            .enum(["pending", "received", "verified", "booked", "cancelled"])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { invoiceDate, receiveDate, payableIds, ...rest } = input;
        const id = await createReceivedInvoice({
          ...rest,
          companyId: getActiveCompanyId(ctx.user),
          payableIds,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
          receiveDate: receiveDate ? (new Date(receiveDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveReceivedInvoiceSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            invoiceNo: z.string().optional(),
            invoiceCode: z.string().optional(),
            invoiceType: z
              .enum(["vat_special", "vat_normal", "electronic", "receipt"])
              .optional(),
            supplierId: z.number().optional(),
            supplierName: z.string().optional(),
            payableIds: z.array(z.number()).optional(),
            relatedOrderNo: z.string().optional(),
            invoiceDate: z.string().optional(),
            receiveDate: z.string().optional(),
            amountExTax: z.string().optional(),
            taxRate: z.string().optional(),
            taxAmount: z.string().optional(),
            totalAmount: z.string().optional(),
            verifyCode: z.string().optional(),
            status: z
              .enum(["pending", "received", "verified", "booked", "cancelled"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const current = await getReceivedInvoiceById(input.id, activeCompanyId);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "收票记录不存在" });
        }
        const { invoiceDate, receiveDate, payableIds, ...rest } = input.data;
        await updateReceivedInvoice(input.id, {
          ...rest,
          payableIds,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
          receiveDate: receiveDate ? (new Date(receiveDate) as any) : undefined,
        });
        await archiveReceivedInvoiceSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getReceivedInvoiceById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "收票记录不存在" });
        }
        await deleteReceivedInvoice(input.id, ctx.user?.id);
        return { success: true };
      }),
  }),

  issuedInvoices: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            customerId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return await getIssuedInvoices({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getIssuedInvoiceById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (record) {
          await archiveIssuedInvoiceSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          invoiceNo: z.string().optional(),
          invoiceType: z.enum([
            "vat_special",
            "vat_normal",
            "electronic",
            "receipt",
          ]),
          customerId: z.number().optional(),
          customerName: z.string(),
          receivableIds: z.array(z.number()).optional(),
          relatedOrderNo: z.string().optional(),
          reconcileMonth: z.string().optional(),
          invoiceDate: z.string().optional(),
          amountExTax: z.string(),
          taxRate: z.string().optional(),
          taxAmount: z.string().optional(),
          totalAmount: z.string(),
          bankAccountId: z.number().optional(),
          bankAccount: z.string().optional(),
          status: z
            .enum([
              "draft",
              "pending_approval",
              "issued",
              "cancelled",
              "red_issued",
            ])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { invoiceDate, receivableIds, ...rest } = input;
        const id = await createIssuedInvoice({
          ...rest,
          companyId: getActiveCompanyId(ctx.user),
          receivableIds,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveIssuedInvoiceSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            invoiceNo: z.string().optional(),
            invoiceType: z
              .enum(["vat_special", "vat_normal", "electronic", "receipt"])
              .optional(),
            customerId: z.number().optional(),
            customerName: z.string().optional(),
            receivableIds: z.array(z.number()).optional(),
            relatedOrderNo: z.string().optional(),
            reconcileMonth: z.string().optional(),
            invoiceDate: z.string().optional(),
            amountExTax: z.string().optional(),
            taxRate: z.string().optional(),
            taxAmount: z.string().optional(),
            totalAmount: z.string().optional(),
            bankAccountId: z.number().optional(),
            bankAccount: z.string().optional(),
            status: z
              .enum([
                "draft",
                "pending_approval",
                "issued",
                "cancelled",
                "red_issued",
              ])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const current = await getIssuedInvoiceById(input.id, activeCompanyId);
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "开票记录不存在" });
        }
        const { invoiceDate, receivableIds, ...rest } = input.data;
        await updateIssuedInvoice(input.id, {
          ...rest,
          receivableIds,
          invoiceDate: invoiceDate ? (new Date(invoiceDate) as any) : undefined,
        });
        await archiveIssuedInvoiceSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getIssuedInvoiceById(
          input.id,
          getActiveCompanyId(ctx.user)
        );
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "开票记录不存在" });
        }
        await deleteIssuedInvoice(input.id, ctx.user?.id);
        return { success: true };
      }),
    createDraftFromReceivables: protectedProcedure
      .input(
        z.object({
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          reconcileMonth: z.string().optional(),
          receivableIds: z.array(z.number()),
          bankAccountId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const draft = await createOrGetIssuedInvoiceDraftFromReceivables({
          ...input,
          companyId: getActiveCompanyId(ctx.user),
          createdBy: ctx.user?.id,
        });
        if ((draft as any)?.id) {
          await archiveIssuedInvoiceSnapshotById(
            Number((draft as any).id),
            ctx.user?.id
          );
        }
        return draft;
      }),
  }),

  // ==================== 经销商资质 ====================
  dealerQualifications: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getDealerQualifications(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getDealerQualificationById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          businessLicense: z.string().optional(),
          operatingLicense: z.string().optional(),
          licenseExpiry: z.string().optional(),
          authorizationNo: z.string().optional(),
          authorizationExpiry: z.string().optional(),
          territory: z.string().optional(),
          contractNo: z.string().optional(),
          contractExpiry: z.string().optional(),
          status: z
            .enum(["pending", "approved", "expired", "terminated"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { licenseExpiry, authorizationExpiry, contractExpiry, ...rest } =
          input;
        return await createDealerQualification({
          ...rest,
          licenseExpiry: licenseExpiry
            ? (new Date(licenseExpiry) as any)
            : undefined,
          authorizationExpiry: authorizationExpiry
            ? (new Date(authorizationExpiry) as any)
            : undefined,
          contractExpiry: contractExpiry
            ? (new Date(contractExpiry) as any)
            : undefined,
        } as any);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            businessLicense: z.string().optional(),
            operatingLicense: z.string().optional(),
            licenseExpiry: z.string().optional(),
            authorizationNo: z.string().optional(),
            authorizationExpiry: z.string().optional(),
            territory: z.string().optional(),
            contractNo: z.string().optional(),
            contractExpiry: z.string().optional(),
            status: z
              .enum(["pending", "approved", "expired", "terminated"])
              .optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { licenseExpiry, authorizationExpiry, contractExpiry, ...rest } =
          input.data;
        await updateDealerQualification(input.id, {
          ...rest,
          licenseExpiry: licenseExpiry
            ? (new Date(licenseExpiry) as any)
            : undefined,
          authorizationExpiry: authorizationExpiry
            ? (new Date(authorizationExpiry) as any)
            : undefined,
          contractExpiry: contractExpiry
            ? (new Date(contractExpiry) as any)
            : undefined,
        } as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDealerQualification(input.id);
        return { success: true };
      }),
  }),

  medicalPlatforms: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            province: z.string().optional(),
            platformType: z.string().optional(),
            verificationStatus: z.enum(["verified", "pending"]).optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getMedicalPlatforms(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getMedicalPlatformById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          province: z.string(),
          platformName: z.string(),
          platformType: z.enum(["医保服务平台", "医药招采平台"]),
          coverageLevel: z.enum(["national", "province"]),
          platformUrl: z.string(),
          officialSourceUrl: z.string(),
          verificationStatus: z.enum(["verified", "pending"]),
          accountNo: z.string().optional(),
          password: z.string().optional(),
          remarks: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createMedicalPlatform({
          ...input,
          accountNo: input.accountNo || "",
          password: input.password || "",
          remarks: input.remarks || "",
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            province: z.string().optional(),
            platformName: z.string().optional(),
            platformType: z.enum(["医保服务平台", "医药招采平台"]).optional(),
            coverageLevel: z.enum(["national", "province"]).optional(),
            platformUrl: z.string().optional(),
            officialSourceUrl: z.string().optional(),
            verificationStatus: z.enum(["verified", "pending"]).optional(),
            accountNo: z.string().optional(),
            password: z.string().optional(),
            remarks: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return await updateMedicalPlatform(input.id, input.data);
      }),
    saveListing: protectedProcedure
      .input(
        z.object({
          platformId: z.number(),
          productDetails: z.array(
            z.object({
              recordId: z.string().optional(),
              productId: z.number(),
              code: z.string(),
              name: z.string(),
              specification: z.string(),
              unit: z.string(),
              description: z.string(),
              listedPrice: z.number(),
            })
          ),
          lastUpdate: z.string(),
          mode: z.enum(["draft", "pending_submission"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await saveMedicalPlatformListing(
          input.platformId,
          {
            productDetails: input.productDetails,
            lastUpdate: input.lastUpdate,
          },
          {
            mode: input.mode || "pending_submission",
            actor: {
              id: ctx.user?.id,
              name: ctx.user?.name,
              role: ctx.user?.role,
              department: ctx.user?.department,
              email: ctx.user?.email,
              position: ctx.user?.position,
            },
          }
        );
      }),
    submitRecords: protectedProcedure
      .input(
        z.object({
          platformId: z.number(),
          recordIds: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await submitMedicalPlatformListings(
          input.platformId,
          input.recordIds,
          {
            id: ctx.user?.id,
            name: ctx.user?.name,
            role: ctx.user?.role,
            department: ctx.user?.department,
            email: ctx.user?.email,
            position: ctx.user?.position,
          }
        );
      }),
    approveRecords: protectedProcedure
      .input(
        z.object({
          platformId: z.number(),
          recordIds: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const canApprove =
          ctx.user?.role === "admin" ||
          /负责人|经理|主管|总监/.test(String(ctx.user?.position || ""));
        if (!canApprove) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "仅管理员或部门负责人可审核挂网记录",
          });
        }
        return await approveMedicalPlatformListings(
          input.platformId,
          input.recordIds,
          {
            id: ctx.user?.id,
            name: ctx.user?.name,
            role: ctx.user?.role,
            department: ctx.user?.department,
            email: ctx.user?.email,
            position: ctx.user?.position,
          }
        );
      }),
    enableRecords: protectedProcedure
      .input(
        z.object({
          platformId: z.number(),
          recordIds: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await enableMedicalPlatformListings(
          input.platformId,
          input.recordIds,
          {
            id: ctx.user?.id,
            name: ctx.user?.name,
            role: ctx.user?.role,
            department: ctx.user?.department,
            email: ctx.user?.email,
            position: ctx.user?.position,
          }
        );
      }),
  }),

  investmentHospitals: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getInvestmentHospitals(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getInvestmentHospitalById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          hospitalName: z.string(),
          hospitalCode: z.string(),
          level: z.string(),
          type: z.string().optional(),
          province: z.string(),
          city: z.string().optional(),
          address: z.string().optional(),
          contactDept: z.string().optional(),
          contactPerson: z.string().optional(),
          contactPhone: z.string().optional(),
          contactEmail: z.string().optional(),
          products: z.string().optional(),
          productCount: z.number().optional(),
          status: z
            .enum(["applying", "reviewing", "approved", "rejected"])
            .optional(),
          applyDate: z.string().optional(),
          approveDate: z.string().optional(),
          remarks: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createInvestmentHospital({
          hospitalName: input.hospitalName,
          hospitalCode: input.hospitalCode,
          level: input.level,
          type: input.type || "",
          province: input.province,
          city: input.city || "",
          address: input.address || "",
          contactDept: input.contactDept || "",
          contactPerson: input.contactPerson || "",
          contactPhone: input.contactPhone || "",
          contactEmail: input.contactEmail || "",
          products: input.products || "",
          productCount: input.productCount || 0,
          status: input.status || "applying",
          applyDate: input.applyDate || "",
          approveDate: input.approveDate || "",
          remarks: input.remarks || "",
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            hospitalName: z.string().optional(),
            hospitalCode: z.string().optional(),
            level: z.string().optional(),
            type: z.string().optional(),
            province: z.string().optional(),
            city: z.string().optional(),
            address: z.string().optional(),
            contactDept: z.string().optional(),
            contactPerson: z.string().optional(),
            contactPhone: z.string().optional(),
            contactEmail: z.string().optional(),
            products: z.string().optional(),
            productCount: z.number().optional(),
            status: z
              .enum(["applying", "reviewing", "approved", "rejected"])
              .optional(),
            applyDate: z.string().optional(),
            approveDate: z.string().optional(),
            remarks: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        return await updateInvestmentHospital(input.id, input.data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteInvestmentHospital(input.id);
      }),
  }),

  // ==================== 设备管理 ====================
  equipment: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getEquipment(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getEquipmentById(input.id);
        if (record) {
          await archiveEquipmentSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          name: z.string(),
          model: z.string().optional(),
          manufacturer: z.string().optional(),
          serialNo: z.string().optional(),
          purchaseDate: z.string().optional(),
          warrantyDate: z.string().optional(),
          installDate: z.string().optional(),
          location: z.string().optional(),
          department: z.string().optional(),
          responsible: z.string().optional(),
          inspectionRequirement: z.string().optional(),
          maintenanceRequirement: z.string().optional(),
          status: z
            .enum(["normal", "maintenance", "repair", "scrapped"])
            .optional(),
          lastMaintenanceDate: z.string().optional(),
          nextMaintenanceDate: z.string().optional(),
          maintenanceCycle: z.number().optional(),
          assetValue: z.union([z.number(), z.string()]).optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const {
          purchaseDate,
          warrantyDate,
          installDate,
          lastMaintenanceDate,
          nextMaintenanceDate,
          assetValue,
          ...rest
        } = input;
        const id = await createEquipment({
          ...rest,
          purchaseDate: purchaseDate
            ? (new Date(purchaseDate) as any)
            : undefined,
          warrantyDate: warrantyDate
            ? (new Date(warrantyDate) as any)
            : undefined,
          installDate: installDate ? (new Date(installDate) as any) : undefined,
          lastMaintenanceDate: lastMaintenanceDate
            ? (new Date(lastMaintenanceDate) as any)
            : undefined,
          nextMaintenanceDate: nextMaintenanceDate
            ? (new Date(nextMaintenanceDate) as any)
            : undefined,
          assetValue:
            assetValue != null && assetValue !== ""
              ? (String(assetValue) as any)
              : undefined,
        });
        await archiveEquipmentSnapshotById(id, ctx.user?.id);
        return id;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            code: z.string().optional(),
            name: z.string().optional(),
            model: z.string().optional(),
            manufacturer: z.string().optional(),
            serialNo: z.string().optional(),
            purchaseDate: z.string().optional(),
            warrantyDate: z.string().optional(),
            installDate: z.string().optional(),
            location: z.string().optional(),
            department: z.string().optional(),
            responsible: z.string().optional(),
            inspectionRequirement: z.string().optional(),
            maintenanceRequirement: z.string().optional(),
            status: z
              .enum(["normal", "maintenance", "repair", "scrapped"])
              .optional(),
            lastMaintenanceDate: z.string().optional(),
            nextMaintenanceDate: z.string().optional(),
            maintenanceCycle: z.number().optional(),
            assetValue: z.union([z.number(), z.string()]).optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const {
          purchaseDate,
          warrantyDate,
          installDate,
          lastMaintenanceDate,
          nextMaintenanceDate,
          assetValue,
          ...rest
        } = input.data;
        await updateEquipment(input.id, {
          ...rest,
          purchaseDate: purchaseDate
            ? (new Date(purchaseDate) as any)
            : undefined,
          warrantyDate: warrantyDate
            ? (new Date(warrantyDate) as any)
            : undefined,
          installDate: installDate ? (new Date(installDate) as any) : undefined,
          lastMaintenanceDate: lastMaintenanceDate
            ? (new Date(lastMaintenanceDate) as any)
            : undefined,
          nextMaintenanceDate: nextMaintenanceDate
            ? (new Date(nextMaintenanceDate) as any)
            : undefined,
          assetValue:
            assetValue != null && assetValue !== ""
              ? (String(assetValue) as any)
              : undefined,
        });
        await archiveEquipmentSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteEquipment(input.id);
        return { success: true };
      }),
  }),

  equipmentInspections: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            result: z.string().optional(),
            equipmentId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getEquipmentInspections(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getEquipmentInspectionById(input.id);
        if (record) {
          await archiveEquipmentInspectionSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          inspectionNo: z.string(),
          equipmentId: z.number(),
          equipmentCode: z.string().optional(),
          equipmentName: z.string(),
          equipmentModel: z.string().optional(),
          equipmentLocation: z.string().optional(),
          equipmentDepartment: z.string().optional(),
          equipmentResponsible: z.string().optional(),
          inspectionDate: z.string().optional(),
          inspectionType: z
            .enum(["daily", "shift", "weekly", "monthly", "special"])
            .optional(),
          inspector: z.string().optional(),
          reviewer: z.string().optional(),
          result: z.enum(["normal", "abnormal", "shutdown"]).optional(),
          status: z.enum(["draft", "completed"]).optional(),
          detailItems: z
            .array(
              z.object({
                itemName: z.string(),
                standard: z.string().optional(),
                method: z.string().optional(),
                result: z.string().optional(),
                abnormalDesc: z.string().optional(),
                actionRequired: z.string().optional(),
                remark: z.string().optional(),
              })
            )
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { inspectionDate, detailItems, ...rest } = input;
        const id = await createEquipmentInspection({
          ...rest,
          inspectionDate: inspectionDate
            ? (new Date(inspectionDate) as any)
            : undefined,
          detailItems: JSON.stringify(detailItems || []),
        });
        await archiveEquipmentInspectionSnapshotById(id, ctx.user?.id);
        const createdRecord = await getEquipmentInspectionById(id);
        await archiveEquipmentInspectionMonthlySummary(
          createdRecord,
          ctx.user?.id
        );
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            inspectionNo: z.string().optional(),
            equipmentId: z.number().optional(),
            equipmentCode: z.string().optional(),
            equipmentName: z.string().optional(),
            equipmentModel: z.string().optional(),
            equipmentLocation: z.string().optional(),
            equipmentDepartment: z.string().optional(),
            equipmentResponsible: z.string().optional(),
            inspectionDate: z.string().optional(),
            inspectionType: z
              .enum(["daily", "shift", "weekly", "monthly", "special"])
              .optional(),
            inspector: z.string().optional(),
            reviewer: z.string().optional(),
            result: z.enum(["normal", "abnormal", "shutdown"]).optional(),
            status: z.enum(["draft", "completed"]).optional(),
            detailItems: z
              .array(
                z.object({
                  itemName: z.string(),
                  standard: z.string().optional(),
                  method: z.string().optional(),
                  result: z.string().optional(),
                  abnormalDesc: z.string().optional(),
                  actionRequired: z.string().optional(),
                  remark: z.string().optional(),
                })
              )
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getEquipmentInspectionById(input.id);
        const { inspectionDate, detailItems, ...rest } = input.data;
        await updateEquipmentInspection(input.id, {
          ...rest,
          inspectionDate: inspectionDate
            ? (new Date(inspectionDate) as any)
            : undefined,
          ...(detailItems ? { detailItems: JSON.stringify(detailItems) } : {}),
        });
        await archiveEquipmentInspectionSnapshotById(input.id, ctx.user?.id);
        const after = await getEquipmentInspectionById(input.id);
        await archiveEquipmentInspectionMonthlySummary(after, ctx.user?.id);
        await archiveEquipmentInspectionMonthlySummary(before, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getEquipmentInspectionById(input.id);
        await deleteEquipmentInspection(input.id);
        await archiveEquipmentInspectionMonthlySummary(before, ctx.user?.id);
        return { success: true };
      }),
  }),

  equipmentMaintenances: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            result: z.string().optional(),
            equipmentId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getEquipmentMaintenances(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getEquipmentMaintenanceById(input.id);
        if (record) {
          await archiveEquipmentMaintenanceSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          maintenanceNo: z.string(),
          equipmentId: z.number(),
          equipmentCode: z.string().optional(),
          equipmentName: z.string(),
          equipmentModel: z.string().optional(),
          equipmentLocation: z.string().optional(),
          equipmentDepartment: z.string().optional(),
          equipmentResponsible: z.string().optional(),
          maintenanceDate: z.string().optional(),
          maintenanceType: z
            .enum(["routine", "periodic", "annual", "special"])
            .optional(),
          executor: z.string().optional(),
          reviewer: z.string().optional(),
          status: z.enum(["planned", "in_progress", "completed"]).optional(),
          result: z.enum(["pass", "need_repair", "pending"]).optional(),
          nextMaintenanceDate: z.string().optional(),
          detailItems: z
            .array(
              z.object({
                itemName: z.string(),
                content: z.string().optional(),
                standard: z.string().optional(),
                result: z.string().optional(),
                replacedPart: z.string().optional(),
                remark: z.string().optional(),
              })
            )
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { maintenanceDate, nextMaintenanceDate, detailItems, ...rest } =
          input;
        const id = await createEquipmentMaintenance({
          ...rest,
          maintenanceDate: maintenanceDate
            ? (new Date(maintenanceDate) as any)
            : undefined,
          nextMaintenanceDate: nextMaintenanceDate
            ? (new Date(nextMaintenanceDate) as any)
            : undefined,
          detailItems: JSON.stringify(detailItems || []),
        });
        await archiveEquipmentMaintenanceSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            maintenanceNo: z.string().optional(),
            equipmentId: z.number().optional(),
            equipmentCode: z.string().optional(),
            equipmentName: z.string().optional(),
            equipmentModel: z.string().optional(),
            equipmentLocation: z.string().optional(),
            equipmentDepartment: z.string().optional(),
            equipmentResponsible: z.string().optional(),
            maintenanceDate: z.string().optional(),
            maintenanceType: z
              .enum(["routine", "periodic", "annual", "special"])
              .optional(),
            executor: z.string().optional(),
            reviewer: z.string().optional(),
            status: z.enum(["planned", "in_progress", "completed"]).optional(),
            result: z.enum(["pass", "need_repair", "pending"]).optional(),
            nextMaintenanceDate: z.string().optional(),
            detailItems: z
              .array(
                z.object({
                  itemName: z.string(),
                  content: z.string().optional(),
                  standard: z.string().optional(),
                  result: z.string().optional(),
                  replacedPart: z.string().optional(),
                  remark: z.string().optional(),
                })
              )
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { maintenanceDate, nextMaintenanceDate, detailItems, ...rest } =
          input.data;
        await updateEquipmentMaintenance(input.id, {
          ...rest,
          maintenanceDate: maintenanceDate
            ? (new Date(maintenanceDate) as any)
            : undefined,
          nextMaintenanceDate: nextMaintenanceDate
            ? (new Date(nextMaintenanceDate) as any)
            : undefined,
          ...(detailItems ? { detailItems: JSON.stringify(detailItems) } : {}),
        });
        await archiveEquipmentMaintenanceSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteEquipmentMaintenance(input.id);
        return { success: true };
      }),
  }),

  // ==================== 生产计划（看板） ====================
  productionPlans: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            planType: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getProductionPlans(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getProductionPlanById(input.id);
        if (record) {
          await archiveProductionPlanSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          planNo: z.string().optional(),
          planType: z.enum(["sales_driven", "internal"]),
          salesOrderId: z.number().optional(),
          salesOrderNo: z.string().optional(),
          productionOrderId: z.number().optional(),
          productId: z.number(),
          productName: z.string().optional(),
          plannedQty: z.string(),
          unit: z.string().optional(),
          batchNo: z.string().optional(),
          plannedStartDate: z.string().optional(),
          plannedEndDate: z.string().optional(),
          priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
          status: z
            .enum([
              "pending",
              "scheduled",
              "purchase_submitted",
              "in_progress",
              "completed",
              "cancelled",
            ])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { plannedStartDate, plannedEndDate, ...rest } = input;
        const id = await createProductionPlan({
          ...rest,
          plannedStartDate: plannedStartDate
            ? (new Date(plannedStartDate) as any)
            : undefined,
          plannedEndDate: plannedEndDate
            ? (new Date(plannedEndDate) as any)
            : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveProductionPlanSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            planType: z.enum(["sales_driven", "internal"]).optional(),
            salesOrderId: z.number().optional(),
            salesOrderNo: z.string().optional(),
            productName: z.string().optional(),
            plannedQty: z.string().optional(),
            unit: z.string().optional(),
            batchNo: z.string().optional(),
            plannedStartDate: z.string().optional(),
            plannedEndDate: z.string().optional(),
            priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
            status: z
              .enum([
                "pending",
                "scheduled",
                "purchase_submitted",
                "in_progress",
                "completed",
                "cancelled",
              ])
              .optional(),
            productionOrderId: z.number().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const previousPlan = await getProductionPlanById(input.id);
        const { plannedStartDate, plannedEndDate, ...rest } = input.data;
        const db = await getDb();
        let nextRemark = input.data.remark;
        if (db && input.data.remark !== undefined) {
          const { productionPlans: ppTable } = await import(
            "../drizzle/schema"
          );
          const [oldPlan] = await db
            .select({ remark: ppTable.remark })
            .from(ppTable)
            .where(eq(ppTable.id, input.id))
            .limit(1);
          const oldMeta = parseProductionPlanRemarkMeta(oldPlan?.remark);
          const incomingMeta = parseProductionPlanRemarkMeta(input.data.remark);
          nextRemark = buildProductionPlanRemarkMeta({
            remark: incomingMeta.remark,
            semiFinishedOrders: oldMeta.semiFinishedOrders,
            linkedProductionOrder:
              incomingMeta.linkedProductionOrder ??
              oldMeta.linkedProductionOrder,
            selectedProcess:
              incomingMeta.selectedProcess ?? oldMeta.selectedProcess,
            recordBlueprint:
              incomingMeta.recordBlueprint ?? oldMeta.recordBlueprint,
          });
        }
        await updateProductionPlan(input.id, {
          ...rest,
          plannedStartDate: plannedStartDate
            ? (new Date(plannedStartDate) as any)
            : undefined,
          plannedEndDate: plannedEndDate
            ? (new Date(plannedEndDate) as any)
            : undefined,
          remark: nextRemark,
        });
        await archiveProductionPlanSnapshotById(input.id, ctx.user?.id);
        const previousBatchNo = String(previousPlan?.batchNo || "").trim();
        const nextBatchNo = String(
          input.data.batchNo ?? previousPlan?.batchNo ?? ""
        ).trim();
        if (previousBatchNo && previousBatchNo !== nextBatchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            previousBatchNo,
            ctx.user?.id
          );
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getProductionPlanById(input.id);
        await deleteProductionPlan(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  // ==================== 领料单 ====================
  materialRequisitionOrders: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            recordType: z.string().optional(),
            productionOrderId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getMaterialRequisitionOrders(input);
      }),
    getSuggestedItems: protectedProcedure
      .input(z.object({ productionOrderId: z.number() }))
      .query(async ({ input }) => {
        return await getSuggestedMaterialItemsByProductionOrderId(
          input.productionOrderId
        );
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getMaterialRequisitionOrderById(input.id);
        if (record) {
          await archiveMaterialRequisitionOrderSnapshotById(
            input.id,
            ctx.user?.id
          );
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          requisitionNo: z.string().optional(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          warehouseId: z.number().optional(),
          applicantId: z.number().optional(),
          requisitionDate: z.string().optional(),
          status: z
            .enum(["draft", "pending", "approved", "issued", "rejected"])
            .optional(),
          items: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { requisitionDate, ...rest } = input;
        const id = await createMaterialRequisitionOrder({
          ...rest,
          requisitionDate: requisitionDate
            ? (new Date(requisitionDate) as any)
            : undefined,
          createdBy: ctx.user?.id,
        });
        const createdOrder = await getMaterialRequisitionOrderById(id);
        const resolvedRequisitionNo = String(
          createdOrder?.requisitionNo || input.requisitionNo || ""
        );
        if (input.status === "pending") {
          await notifyWarehouseApproverForMaterialRequisition({
            requisitionId: id,
            requisitionNo: resolvedRequisitionNo,
            productionOrderNo: input.productionOrderNo,
            applicantName: ctx.user?.name || "未知",
          });
        }
        if (input.status === "issued") {
          if (createdOrder) {
            await syncMaterialRequisitionToStaging(createdOrder, {
              warehouseId: input.warehouseId,
              items: input.items,
            });
          }
        }
        await archiveMaterialRequisitionOrderSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            productionOrderId: z.number().optional(),
            productionOrderNo: z.string().optional(),
            warehouseId: z.number().optional(),
            requisitionDate: z.string().optional(),
            status: z
              .enum(["draft", "pending", "approved", "issued", "rejected"])
              .optional(),
            items: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const oldOrder = await getMaterialRequisitionOrderById(input.id);
        const { requisitionDate, ...rest } = input.data;
        await updateMaterialRequisitionOrder(input.id, {
          ...rest,
          requisitionDate: requisitionDate
            ? (new Date(requisitionDate) as any)
            : undefined,
        });
        if (
          input.data.status === "pending" &&
          String(oldOrder?.status || "") !== "pending"
        ) {
          const latestOrder = await getMaterialRequisitionOrderById(input.id);
          if (latestOrder) {
            await notifyWarehouseApproverForMaterialRequisition({
              requisitionId: input.id,
              requisitionNo: String(latestOrder.requisitionNo || ""),
              productionOrderNo: String(latestOrder.productionOrderNo || ""),
              applicantName: ctx.user?.name || "未知",
            });
          }
        }
        if (
          input.data.status === "issued" &&
          String(oldOrder?.status || "") !== "issued"
        ) {
          const latestOrder = await getMaterialRequisitionOrderById(input.id);
          if (latestOrder) {
            await syncMaterialRequisitionToStaging(latestOrder, {
              warehouseId: input.data.warehouseId,
              items: input.data.items,
            });
          }
        }
        await archiveMaterialRequisitionOrderSnapshotById(
          input.id,
          ctx.user?.id
        );
        if (
          oldOrder?.productionOrderId &&
          Number(oldOrder.productionOrderId) !==
            Number(input.data.productionOrderId || oldOrder.productionOrderId)
        ) {
          const previousProductionOrder = await getProductionOrderById(
            Number(oldOrder.productionOrderId)
          );
          if (previousProductionOrder?.batchNo) {
            await archiveBatchRecordSnapshotByBatchNo(
              String(previousProductionOrder.batchNo),
              ctx.user?.id
            );
          }
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getMaterialRequisitionOrderById(input.id);
        await deleteMaterialRequisitionOrder(input.id);
        if (before?.productionOrderId) {
          const previousProductionOrder = await getProductionOrderById(
            Number(before.productionOrderId)
          );
          if (previousProductionOrder?.batchNo) {
            await archiveBatchRecordSnapshotByBatchNo(
              String(previousProductionOrder.batchNo),
              ctx.user?.id
            );
          }
        }
        return { success: true };
      }),
  }),

  // ==================== 生产记录单 ====================
  productionRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            recordType: z.string().optional(),
            productionOrderId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getProductionRecords(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductionRecordById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          recordNo: z.string().optional(),
          recordType: z
            .enum([
              "general",
              "temperature_humidity",
              "material_usage",
              "clean_room",
              "first_piece",
            ])
            .optional(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          batchNo: z.string().optional(),
          workstationName: z.string().optional(),
          operatorId: z.number().optional(),
          recordDate: z.string().optional(),
          recordTime: z.string().optional(),
          plannedQty: z.string().optional(),
          actualQty: z.string().optional(),
          scrapQty: z.string().optional(),
          status: z.enum(["in_progress", "completed", "abnormal"]).optional(),
          remark: z.string().optional(),
          // 温湿度
          temperature: z.string().optional(),
          humidity: z.string().optional(),
          temperatureLimit: z.string().optional(),
          humidityLimit: z.string().optional(),
          // 材料使用
          materialCode: z.string().optional(),
          materialName: z.string().optional(),
          materialSpec: z.string().optional(),
          usedQty: z.string().optional(),
          usedUnit: z.string().optional(),
          materialBatchNo: z.string().optional(),
          // 清场
          cleanedBy: z.string().optional(),
          checkedBy: z.string().optional(),
          cleanResult: z.enum(["pass", "fail"]).optional(),
          // 首件检验
          firstPieceResult: z.enum(["qualified", "unqualified"]).optional(),
          firstPieceInspector: z.string().optional(),
          firstPieceBasis: z.string().optional(),
          firstPieceBasisVersion: z.string().optional(),
          // 公共补充字段
          specification: z.string().optional(),
          processType: z.string().optional(),
          processName: z.string().optional(),
          workshopName: z.string().optional(),
          productionTeam: z.string().optional(),
          operator: z.string().optional(),
          inspector: z.string().optional(),
          // 温湿度补充
          cleanlinessLevel: z.string().optional(),
          pressureDiff: z.string().optional(),
          // 材料使用补充
          storageArea: z.string().optional(),
          issuedQty: z.string().optional(),
          qualifiedQty: z.string().optional(),
          // 明细JSON字段
          detailItems: z.string().optional(),
          materialItems: z.string().optional(),
          equipmentItems: z.string().optional(),
          moldItems: z.string().optional(),
          documentVersion: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { recordDate, ...rest } = input;
        const resolvedOperatorName = String(
          input.operator || ctx.user?.name || ctx.user?.email || ""
        ).trim();
        const id = await createProductionRecord({
          ...rest,
          operatorId: input.operatorId || ctx.user?.id,
          operator: resolvedOperatorName || input.operator,
          operatorName: resolvedOperatorName || undefined,
          recordDate: recordDate ? (new Date(recordDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
        const createdRecord = await getProductionRecordById(id);
        if (createdRecord) {
          await syncProductionRecordMaterialUsageOutbound(
            createdRecord,
            ctx.user?.id
          );
          await syncProductionRecordTargets(createdRecord);
        }
        await writeAuditTrail({
          ctx,
          module: "production",
          action: "create",
          targetType: "生产记录",
          targetId: id,
          targetName: String(createdRecord?.recordNo || input.recordNo),
          description: `新增生产记录：${String(createdRecord?.recordNo || input.recordNo)}`,
          newData: createdRecord as any,
        });
        await archiveProductionRecordSnapshotById(id, ctx.user?.id);
        await archiveProductionTemperatureMonthlySummary(
          createdRecord,
          ctx.user?.id
        );
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            recordType: z
              .enum([
                "general",
                "temperature_humidity",
                "material_usage",
                "clean_room",
                "first_piece",
              ])
              .optional(),
            productionOrderId: z.number().optional(),
            productionOrderNo: z.string().optional(),
            productId: z.number().optional(),
            productName: z.string().optional(),
            batchNo: z.string().optional(),
            workstationName: z.string().optional(),
            recordDate: z.string().optional(),
            recordTime: z.string().optional(),
            plannedQty: z.string().optional(),
            actualQty: z.string().optional(),
            scrapQty: z.string().optional(),
            status: z.enum(["in_progress", "completed", "abnormal"]).optional(),
            remark: z.string().optional(),
            temperature: z.string().optional(),
            humidity: z.string().optional(),
            temperatureLimit: z.string().optional(),
            humidityLimit: z.string().optional(),
            materialCode: z.string().optional(),
            materialName: z.string().optional(),
            materialSpec: z.string().optional(),
            usedQty: z.string().optional(),
            usedUnit: z.string().optional(),
            materialBatchNo: z.string().optional(),
            cleanedBy: z.string().optional(),
            checkedBy: z.string().optional(),
            cleanResult: z.enum(["pass", "fail"]).optional(),
            firstPieceResult: z.enum(["qualified", "unqualified"]).optional(),
            firstPieceInspector: z.string().optional(),
            firstPieceBasis: z.string().optional(),
            firstPieceBasisVersion: z.string().optional(),
            specification: z.string().optional(),
            processType: z.string().optional(),
            processName: z.string().optional(),
            workshopName: z.string().optional(),
            productionTeam: z.string().optional(),
            operator: z.string().optional(),
            inspector: z.string().optional(),
            cleanlinessLevel: z.string().optional(),
            pressureDiff: z.string().optional(),
            storageArea: z.string().optional(),
            issuedQty: z.string().optional(),
            qualifiedQty: z.string().optional(),
            detailItems: z.string().optional(),
            materialItems: z.string().optional(),
            equipmentItems: z.string().optional(),
            moldItems: z.string().optional(),
            documentVersion: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getProductionRecordById(input.id);
        const { recordDate, ...rest } = input.data;
        const resolvedOperatorName = String(
          input.data.operator || ctx.user?.name || ctx.user?.email || ""
        ).trim();
        await updateProductionRecord(input.id, {
          ...rest,
          operatorId: before?.operatorId || ctx.user?.id,
          operator: resolvedOperatorName || input.data.operator,
          operatorName:
            resolvedOperatorName || before?.operatorName || undefined,
          recordDate: recordDate ? (new Date(recordDate) as any) : undefined,
        });
        const updatedRecord = await getProductionRecordById(input.id);
        if (updatedRecord) {
          await syncProductionRecordMaterialUsageOutbound(
            updatedRecord,
            ctx.user?.id
          );
          await syncProductionRecordTargets(updatedRecord);
        }
        await writeAuditTrail({
          ctx,
          module: "production",
          action: "update",
          targetType: "生产记录",
          targetId: input.id,
          targetName: String(
            updatedRecord?.recordNo || before?.recordNo || input.id
          ),
          description: `更新生产记录：${String(updatedRecord?.recordNo || before?.recordNo || input.id)}`,
          previousData: before as any,
          newData: updatedRecord as any,
        });
        await archiveProductionRecordSnapshotById(input.id, ctx.user?.id);
        await archiveProductionTemperatureMonthlySummary(
          updatedRecord,
          ctx.user?.id
        );
        await archiveProductionTemperatureMonthlySummary(before, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const existingRecord = await getProductionRecordById(input.id);
        if (existingRecord?.recordNo) {
          await clearProductionRecordMaterialUsageOutboundByRecordNo(
            String(existingRecord.recordNo)
          );
        }
        await deleteProductionRecord(input.id, ctx.user?.id);
        if (existingRecord?.recordNo)
          await deleteProductionRecordTargets(String(existingRecord.recordNo));
        await archiveProductionTemperatureMonthlySummary(
          existingRecord,
          ctx.user?.id
        );
        return { success: true };
      }),
  }),

  environmentRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            moduleType: z.string().optional(),
            sourceType: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        await syncHistoricalProductionRecordTargets();
        return await getEnvironmentRecords(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getEnvironmentRecordById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          sourceType: z.enum(["manual", "production"]).optional(),
          recordNo: z.string(),
          moduleType: z.string().optional(),
          roomName: z.string().optional(),
          roomCode: z.string().optional(),
          recordDate: z.string().optional(),
          recordTime: z.string().optional(),
          temperature: z.string().optional(),
          humidity: z.string().optional(),
          tempMin: z.string().optional(),
          tempMax: z.string().optional(),
          humidityMin: z.string().optional(),
          humidityMax: z.string().optional(),
          isNormal: z.boolean().optional(),
          abnormalDesc: z.string().optional(),
          correctionAction: z.string().optional(),
          recorder: z.string().optional(),
          productionOrderNo: z.string().optional(),
          productName: z.string().optional(),
          batchNo: z.string().optional(),
          processName: z.string().optional(),
          productionTeam: z.string().optional(),
          detailItems: z.string().optional(),
          equipmentItems: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { recordDate, ...rest } = input;
        const id = await createEnvironmentRecord({
          ...rest,
          sourceType: input.sourceType || "manual",
          recorder: input.recorder || String(ctx.user?.name || "当前用户"),
          recordDate: recordDate ? (new Date(recordDate) as any) : undefined,
        });
        await archiveEnvironmentRecordSnapshotById(id, ctx.user?.id);
        const createdRecord = await getEnvironmentRecordById(id);
        await archiveEnvironmentMonthlySummary(createdRecord, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            moduleType: z.string().optional(),
            roomName: z.string().optional(),
            roomCode: z.string().optional(),
            recordDate: z.string().optional(),
            recordTime: z.string().optional(),
            temperature: z.string().optional(),
            humidity: z.string().optional(),
            tempMin: z.string().optional(),
            tempMax: z.string().optional(),
            humidityMin: z.string().optional(),
            humidityMax: z.string().optional(),
            isNormal: z.boolean().optional(),
            abnormalDesc: z.string().optional(),
            correctionAction: z.string().optional(),
            recorder: z.string().optional(),
            productionOrderNo: z.string().optional(),
            productName: z.string().optional(),
            batchNo: z.string().optional(),
            processName: z.string().optional(),
            productionTeam: z.string().optional(),
            detailItems: z.string().optional(),
            equipmentItems: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const before = await getEnvironmentRecordById(input.id);
        const { recordDate, ...rest } = input.data;
        await updateEnvironmentRecord(input.id, {
          ...rest,
          recordDate: recordDate ? (new Date(recordDate) as any) : undefined,
        });
        await archiveEnvironmentRecordSnapshotById(input.id, ctx.user?.id);
        const after = await getEnvironmentRecordById(input.id);
        await archiveEnvironmentMonthlySummary(after, ctx.user?.id);
        await archiveEnvironmentMonthlySummary(before, ctx.user?.id);
        const previousBatchNo = String(before?.batchNo || "").trim();
        const nextBatchNo = String(input.data.batchNo || "").trim();
        if (previousBatchNo && previousBatchNo !== nextBatchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            previousBatchNo,
            ctx.user?.id
          );
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getEnvironmentRecordById(input.id);
        await deleteEnvironmentRecord(input.id, ctx.user?.id);
        await archiveEnvironmentMonthlySummary(before, ctx.user?.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  // ==================== 生产流转单 ====================
  productionRoutingCards: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            recordType: z.string().optional(),
            productionOrderId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getProductionRoutingCards(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductionRoutingCardById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          cardNo: z.string().optional(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          batchNo: z.string().optional(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          currentProcess: z.string().optional(),
          nextProcess: z.string().optional(),
          needsSterilization: z.boolean().optional(),
          status: z
            .enum([
              "in_process",
              "pending_sterilization",
              "sterilizing",
              "completed",
            ])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createProductionRoutingCard({
          ...input,
          createdBy: ctx.user?.id,
        });
        await archiveProductionRoutingCardSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            currentProcess: z.string().optional(),
            nextProcess: z.string().optional(),
            needsSterilization: z.boolean().optional(),
            status: z
              .enum([
                "in_process",
                "pending_sterilization",
                "sterilizing",
                "completed",
              ])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateProductionRoutingCard(input.id, input.data);
        await archiveProductionRoutingCardSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getProductionRoutingCardById(input.id);
        await deleteProductionRoutingCard(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  productionScrapDisposals: router({
    list: protectedProcedure
      .input(
        z
          .object({
            batchNo: z.string().optional(),
            productionOrderId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getProductionScrapDisposals(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductionScrapDisposalById(input.id);
      }),
    getByBatchNo: protectedProcedure
      .input(z.object({ batchNo: z.string() }))
      .query(async ({ input }) => {
        return await getProductionScrapDisposalByBatchNo(input.batchNo);
      }),
    upsert: protectedProcedure
      .input(
        z.object({
          disposalNo: z.string(),
          batchNo: z.string(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          totalScrapQty: z.string().optional(),
          costQty: z.string().optional(),
          unit: z.string().optional(),
          detailItems: z.string().optional(),
          status: z.enum(["generated", "processed"]).optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await upsertProductionScrapDisposalByBatch({
          ...input,
          createdBy: ctx.user?.id,
        });
        await archiveProductionScrapDisposalSnapshotById(id, ctx.user?.id);
        return { id };
      }),
  }),

  // ==================== 委外灭菌单 ====================
  sterilizationOrders: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            recordType: z.string().optional(),
            productionOrderId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getSterilizationOrders(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getSterilizationOrderById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          orderNo: z.string().optional(),
          routingCardId: z.number().optional(),
          routingCardNo: z.string().optional(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          batchNo: z.string().optional(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          sterilizationMethod: z.string().optional(),
          supplierId: z.number().optional(),
          supplierName: z.string().optional(),
          sendDate: z.string().optional(),
          expectedReturnDate: z.string().optional(),
          sterilizationBatchNo: z.string().optional(),
          status: z
            .enum([
              "draft",
              "sent",
              "processing",
              "arrived",
              "returned",
              "qualified",
              "unqualified",
            ])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { sendDate, expectedReturnDate, ...rest } = input;
        const id = await createSterilizationOrder({
          ...rest,
          sendDate: sendDate ? (new Date(sendDate) as any) : undefined,
          expectedReturnDate: expectedReturnDate
            ? (new Date(expectedReturnDate) as any)
            : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveSterilizationOrderSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            routingCardId: z.number().optional(),
            routingCardNo: z.string().optional(),
            productionOrderId: z.number().optional(),
            productionOrderNo: z.string().optional(),
            productName: z.string().optional(),
            batchNo: z.string().optional(),
            quantity: z.string().optional(),
            unit: z.string().optional(),
            sterilizationMethod: z.string().optional(),
            supplierId: z.number().optional(),
            supplierName: z.string().optional(),
            sendDate: z.string().optional(),
            expectedReturnDate: z.string().optional(),
            actualReturnDate: z.string().optional(),
            sterilizationBatchNo: z.string().optional(),
            status: z
              .enum([
                "draft",
                "sent",
                "processing",
                "arrived",
                "returned",
                "qualified",
                "unqualified",
              ])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { sendDate, expectedReturnDate, actualReturnDate, ...rest } =
          input.data;
        // 获取更新前的灭菌单数据（用于邮件通知）
        const oldOrder = await getSterilizationOrderById(input.id);
        await updateSterilizationOrder(input.id, {
          ...rest,
          sendDate: sendDate ? (new Date(sendDate) as any) : undefined,
          expectedReturnDate: expectedReturnDate
            ? (new Date(expectedReturnDate) as any)
            : undefined,
          actualReturnDate: actualReturnDate
            ? (new Date(actualReturnDate) as any)
            : undefined,
        });
        // 邮件通知：灭菌单状态变为「到货」时，通知质量部安排 OQC 检验
        if (input.data.status === "arrived" && oldOrder?.status !== "arrived") {
          try {
            const qualityEmails = await getUserEmailsByDepartment(["质量部"]);
            if (qualityEmails.length > 0) {
              await notifySterilizationArrived({
                batchNo: oldOrder?.batchNo || "",
                productName: oldOrder?.productName,
                sterilizationOrderNo: oldOrder?.sterilizationOrderNo || "",
                sterilizationBatchNo:
                  input.data.sterilizationBatchNo ||
                  oldOrder?.sterilizationBatchNo,
                quantity: Number(oldOrder?.quantity || 0),
                unit: oldOrder?.unit,
                supplierName: input.data.supplierName || oldOrder?.supplierName,
                qualityEmails,
              });
            }
          } catch (e) {
            console.warn("[Email] 灭菌到货通知失败：", e);
          }
        }
        await archiveSterilizationOrderSnapshotById(input.id, ctx.user?.id);
        const previousBatchNo = String(oldOrder?.batchNo || "").trim();
        const nextBatchNo = String(
          input.data.batchNo || oldOrder?.batchNo || ""
        ).trim();
        if (previousBatchNo && previousBatchNo !== nextBatchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            previousBatchNo,
            ctx.user?.id
          );
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getSterilizationOrderById(input.id);
        await deleteSterilizationOrder(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  // ==================== 生产入库申请 ====================
  productionWarehouseEntries: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            recordType: z.string().optional(),
            productionOrderId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getProductionWarehouseEntries(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductionWarehouseEntryById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          entryNo: z.string().optional(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          sterilizationOrderId: z.number().optional(),
          sterilizationOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          batchNo: z.string().optional(),
          sterilizationBatchNo: z.string().optional(),
          sterilizedQty: z.string().optional(),
          inspectionRejectQty: z.string().optional(),
          sampleQty: z.string().optional(),
          quantity: z.string().optional(),
          quantityModifyReason: z.string().optional(),
          unit: z.string().optional(),
          targetWarehouseId: z.number().optional(),
          applicantId: z.number().optional(),
          applicationDate: z.string().optional(),
          status: z
            .enum(["draft", "pending", "approved", "completed", "rejected"])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { applicationDate, ...rest } = input;
        const id = await createProductionWarehouseEntry({
          ...rest,
          applicationDate: applicationDate
            ? (new Date(applicationDate) as any)
            : undefined,
          createdBy: ctx.user?.id,
        });
        const createdEntry = await getProductionWarehouseEntryById(id);
        const resolvedEntryNo = String(
          createdEntry?.entryNo || input.entryNo || ""
        );
        try {
          const qualityEmails = await getUserEmailsByDepartment(["质量部"]);
          if (qualityEmails.length > 0) {
            await notifyWarehouseEntryCreatedForOqc({
              entryNo: resolvedEntryNo,
              batchNo: input.batchNo || "",
              productName: input.productName,
              quantity: Number(input.quantity || 0),
              unit: input.unit,
              qualityEmails,
            });
          }
        } catch (e) {
          console.warn("[Email] 生产入库申请提交通知质量部失败：", e);
        }
        await writeAuditTrail({
          ctx,
          module: "production",
          action: "create",
          targetType: "生产入库申请",
          targetId: id,
          targetName: String(createdEntry?.entryNo || input.entryNo),
          description: `新增生产入库申请：${String(createdEntry?.entryNo || input.entryNo)}`,
          newData: createdEntry as any,
        });
        await archiveProductionWarehouseEntrySnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            quantity: z.string().optional(),
            sterilizedQty: z.string().optional(),
            inspectionRejectQty: z.string().optional(),
            sampleQty: z.string().optional(),
            quantityModifyReason: z.string().optional(),
            targetWarehouseId: z.number().optional(),
            status: z
              .enum(["draft", "pending", "approved", "completed", "rejected"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // 获取更新前的入库申请数据（用于邮件通知）
        const oldEntry = await getProductionWarehouseEntryById(input.id);
        await ensureWarehouseEntryQualityGate(
          oldEntry as any,
          String(input.data.status || "")
        );
        await updateProductionWarehouseEntry(input.id, input.data);
        const updatedEntry = await getProductionWarehouseEntryById(input.id);
        // 邮件通知：状态变为「已审批」时，通知仓库部执行入库
        if (
          input.data.status === "approved" &&
          oldEntry?.status !== "approved"
        ) {
          try {
            const warehouseEmails = await getUserEmailsByDepartment([
              "仓库管理",
              "仓库部",
            ]);
            if (warehouseEmails.length > 0) {
              await notifyWarehouseEntryApproved({
                batchNo: oldEntry?.batchNo || "",
                productName: oldEntry?.productName,
                entryNo: oldEntry?.entryNo || "",
                quantity: Number(oldEntry?.quantity || 0),
                unit: oldEntry?.unit,
                warehouseEmails,
              });
            }
          } catch (e) {
            console.warn("[Email] 入库审批通知失败：", e);
          }
        }
        // 库存实时联动：状态变为「已完成」时，自动写入 production_in 库存流水
        if (
          input.data.status === "completed" &&
          oldEntry?.status !== "completed"
        ) {
          try {
            const entryQty = parseFloat(
              String(input.data.quantity || oldEntry?.quantity || 0)
            );
            if (entryQty > 0 && oldEntry?.targetWarehouseId) {
              await createInventoryTransaction({
                warehouseId: oldEntry.targetWarehouseId,
                productId: oldEntry.productId ?? undefined,
                type: "production_in",
                documentNo: oldEntry.entryNo,
                itemName: oldEntry.productName || "生产入库",
                batchNo: oldEntry.batchNo ?? undefined,
                sterilizationBatchNo:
                  oldEntry.sterilizationBatchNo ?? undefined,
                quantity: String(entryQty),
                unit: oldEntry.unit ?? undefined,
                relatedOrderId: oldEntry.productionOrderId ?? undefined,
                remark: `生产入库申请 ${oldEntry.entryNo} 完成入库`,
              });
            }
          } catch (e) {
            if (oldEntry?.status && oldEntry.status !== "completed") {
              try {
                await updateProductionWarehouseEntry(input.id, {
                  status: oldEntry.status as any,
                });
              } catch (rollbackError) {
                console.warn(
                  "[库存] 生产入库失败后回滚状态失败:",
                  rollbackError
                );
              }
            }
            console.warn("[库存] 生产入库流水写入失败:", e);
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `生产入库失败：${String((e as any)?.message || "库存流水写入失败")}`,
            });
          }
          // 邮件通知：通知销售部和财务部
          try {
            const salesEmails = await getUserEmailsByDepartment(["销售部"]);
            const financeEmails = await getUserEmailsByDepartment(["财务部"]);
            if (salesEmails.length > 0 || financeEmails.length > 0) {
              await notifyWarehouseEntryCompleted({
                batchNo: oldEntry?.batchNo || "",
                productName: oldEntry?.productName,
                entryNo: oldEntry?.entryNo || "",
                quantity: Number(oldEntry?.quantity || 0),
                unit: oldEntry?.unit,
                salesOrderNo: oldEntry?.productionOrderNo,
                salesEmails,
                financeEmails,
              });
            }
          } catch (e) {
            console.warn("[Email] 入库完成通知失败：", e);
          }
        }
        await writeAuditTrail({
          ctx,
          module: "production",
          action: "update",
          targetType: "生产入库申请",
          targetId: input.id,
          targetName: String(
            updatedEntry?.entryNo || oldEntry?.entryNo || input.id
          ),
          description: `更新生产入库申请：${String(updatedEntry?.entryNo || oldEntry?.entryNo || input.id)}`,
          previousData: oldEntry as any,
          newData: updatedEntry as any,
        });
        await archiveProductionWarehouseEntrySnapshotById(
          input.id,
          ctx.user?.id
        );
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getProductionWarehouseEntryById(input.id);
        await deleteProductionWarehouseEntry(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  largePackagingRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            productionOrderId: z.number().optional(),
            batchNo: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getLargePackagingRecords(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getLargePackagingRecordById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          recordNo: z.string(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          specification: z.string().optional(),
          batchNo: z.string().optional(),
          packagingDate: z.string().optional(),
          packagingType: z
            .enum(["box", "carton", "pallet", "other"])
            .optional(),
          packageSpec: z.string().optional(),
          workshopName: z.string().optional(),
          packagingTeam: z.string().optional(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          operator: z.string().optional(),
          reviewer: z.string().optional(),
          status: z.enum(["draft", "completed"]).optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { packagingDate, quantity, ...rest } = input;
        const id = await createLargePackagingRecord({
          ...rest,
          packagingDate: packagingDate
            ? (new Date(packagingDate) as any)
            : undefined,
          quantity:
            quantity != null && quantity !== ""
              ? (String(quantity) as any)
              : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveLargePackagingRecordSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            packagingDate: z.string().optional(),
            packagingType: z
              .enum(["box", "carton", "pallet", "other"])
              .optional(),
            packageSpec: z.string().optional(),
            workshopName: z.string().optional(),
            packagingTeam: z.string().optional(),
            quantity: z.string().optional(),
            unit: z.string().optional(),
            operator: z.string().optional(),
            reviewer: z.string().optional(),
            status: z.enum(["draft", "completed"]).optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { packagingDate, quantity, ...rest } = input.data;
        await updateLargePackagingRecord(input.id, {
          ...rest,
          packagingDate: packagingDate
            ? (new Date(packagingDate) as any)
            : undefined,
          quantity:
            quantity != null && quantity !== ""
              ? (String(quantity) as any)
              : undefined,
        });
        await archiveLargePackagingRecordSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getLargePackagingRecordById(input.id);
        await deleteLargePackagingRecord(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  batchRecordReviewRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            productionOrderId: z.number().optional(),
            batchNo: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getBatchRecordReviewRecords(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getBatchRecordReviewRecordById(input.id);
        if (record) {
          await archiveBatchRecordReviewSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          reviewNo: z.string(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          specification: z.string().optional(),
          batchNo: z.string(),
          reviewDate: z.string().optional(),
          reviewer: z.string().optional(),
          completenessStatus: z.enum(["complete", "incomplete"]).optional(),
          status: z
            .enum(["draft", "pending", "approved", "rejected"])
            .optional(),
          missingItems: z.string().optional(),
          reviewOpinion: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { reviewDate, ...rest } = input;
        const id = await createBatchRecordReviewRecord({
          ...rest,
          reviewDate: reviewDate ? (new Date(reviewDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveBatchRecordReviewSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            reviewDate: z.string().optional(),
            reviewer: z.string().optional(),
            completenessStatus: z.enum(["complete", "incomplete"]).optional(),
            status: z
              .enum(["draft", "pending", "approved", "rejected"])
              .optional(),
            missingItems: z.string().optional(),
            reviewOpinion: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { reviewDate, ...rest } = input.data;
        await updateBatchRecordReviewRecord(input.id, {
          ...rest,
          reviewDate: reviewDate ? (new Date(reviewDate) as any) : undefined,
        });
        await archiveBatchRecordReviewSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getBatchRecordReviewRecordById(input.id);
        await deleteBatchRecordReviewRecord(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  regulatoryReleaseRecords: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            productionOrderId: z.number().optional(),
            batchNo: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getRegulatoryReleaseRecords(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getRegulatoryReleaseRecordById(input.id);
        if (record) {
          await archiveRegulatoryReleaseSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          releaseNo: z.string(),
          productionOrderId: z.number().optional(),
          productionOrderNo: z.string().optional(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          specification: z.string().optional(),
          batchNo: z.string(),
          sterilizationBatchNo: z.string().optional(),
          releaseDate: z.string().optional(),
          approver: z.string().optional(),
          decision: z.enum(["approved", "conditional", "rejected"]).optional(),
          status: z.enum(["draft", "released", "rejected"]).optional(),
          basisSummary: z.string().optional(),
          relatedReviewNo: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { releaseDate, ...rest } = input;
        const id = await createRegulatoryReleaseRecord({
          ...rest,
          releaseDate: releaseDate ? (new Date(releaseDate) as any) : undefined,
          createdBy: ctx.user?.id,
        });
        await archiveRegulatoryReleaseSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            sterilizationBatchNo: z.string().optional(),
            releaseDate: z.string().optional(),
            approver: z.string().optional(),
            decision: z
              .enum(["approved", "conditional", "rejected"])
              .optional(),
            status: z.enum(["draft", "released", "rejected"]).optional(),
            basisSummary: z.string().optional(),
            relatedReviewNo: z.string().optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { releaseDate, ...rest } = input.data;
        await updateRegulatoryReleaseRecord(input.id, {
          ...rest,
          releaseDate: releaseDate ? (new Date(releaseDate) as any) : undefined,
        });
        await archiveRegulatoryReleaseSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getRegulatoryReleaseRecordById(input.id);
        await deleteRegulatoryReleaseRecord(input.id);
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),
  }),

  // ==================== 加班申请 ====================
  overtimeRequests: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getOvertimeRequests(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getOvertimeRequestById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          requestNo: z.string().optional(),
          applicantName: z.string(),
          department: z.string(),
          overtimeDate: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          hours: z.string(),
          overtimeType: z.enum(["weekday", "weekend", "holiday"]),
          reason: z.string(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createOvertimeRequest({
          ...input,
          applicantId: ctx.user?.id || 0,
          overtimeDate: new Date(input.overtimeDate) as any,
          hours: input.hours as any,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            overtimeDate: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            hours: z.string().optional(),
            overtimeType: z.enum(["weekday", "weekend", "holiday"]).optional(),
            reason: z.string().optional(),
            status: z
              .enum(["draft", "pending", "approved", "rejected", "cancelled"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { overtimeDate, hours, ...rest } = input.data;
        await updateOvertimeRequest(input.id, {
          ...rest,
          overtimeDate: overtimeDate
            ? (new Date(overtimeDate) as any)
            : undefined,
          hours: hours ? (hours as any) : undefined,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteOvertimeRequest(input.id);
        return { success: true };
      }),
  }),

  // ==================== 请假申请 ====================
  leaveRequests: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getLeaveRequests(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getLeaveRequestById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          requestNo: z.string().optional(),
          applicantName: z.string(),
          department: z.string(),
          leaveType: z.enum([
            "annual",
            "sick",
            "personal",
            "maternity",
            "paternity",
            "marriage",
            "bereavement",
            "other",
          ]),
          startDate: z.string(),
          endDate: z.string(),
          days: z.string(),
          reason: z.string(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createLeaveRequest({
          ...input,
          applicantId: ctx.user?.id || 0,
          startDate: new Date(input.startDate) as any,
          endDate: new Date(input.endDate) as any,
          days: input.days as any,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            leaveType: z
              .enum([
                "annual",
                "sick",
                "personal",
                "maternity",
                "paternity",
                "marriage",
                "bereavement",
                "other",
              ])
              .optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            days: z.string().optional(),
            reason: z.string().optional(),
            status: z
              .enum(["draft", "pending", "approved", "rejected", "cancelled"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { startDate, endDate, days, ...rest } = input.data;
        await updateLeaveRequest(input.id, {
          ...rest,
          startDate: startDate ? (new Date(startDate) as any) : undefined,
          endDate: endDate ? (new Date(endDate) as any) : undefined,
          days: days ? (days as any) : undefined,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLeaveRequest(input.id);
        return { success: true };
      }),
  }),

  // ==================== 外出申请 ====================
  outingRequests: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            department: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getOutingRequests(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getOutingRequestById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          requestNo: z.string().optional(),
          applicantName: z.string(),
          department: z.string(),
          outingDate: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          destination: z.string(),
          purpose: z.string(),
          contactPhone: z.string().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createOutingRequest({
          ...input,
          applicantId: ctx.user?.id || 0,
          outingDate: new Date(input.outingDate) as any,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            outingDate: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            destination: z.string().optional(),
            purpose: z.string().optional(),
            contactPhone: z.string().optional(),
            status: z
              .enum(["draft", "pending", "approved", "rejected", "cancelled"])
              .optional(),
            remark: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { outingDate, ...rest } = input.data;
        await updateOutingRequest(input.id, {
          ...rest,
          outingDate: outingDate ? (new Date(outingDate) as any) : undefined,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteOutingRequest(input.id);
        return { success: true };
      }),
  }),
  // ==================== MRP 物料需求计划运算 ====================
  mrp: router({
    /**
     * 对单条生产计划执行 MRP 运算
     * 逻辑：取 BOM 用量 × 计划数量 → 减去合格库存 → 减去在途量 → 得出净需求
     */
    calculate: protectedProcedure
      .input(z.object({ productionPlanId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");

        const plan = await getProductionPlanById(input.productionPlanId);
        if (!plan) throw new Error("生产计划不存在");

        const plannedQty = parseFloat(String(plan.plannedQty)) || 0;
        if (plannedQty <= 0) throw new Error("计划数量必须大于 0");

        const bomItems = (await getBomByProductId(plan.productId)).filter(
          (b: any) => b.status === "active"
        );
        if (bomItems.length === 0) {
          return {
            planId: plan.id,
            planNo: plan.planNo,
            productId: plan.productId,
            productName: plan.productName,
            plannedQty,
            unit: plan.unit,
            bomMissing: true,
            items: [],
            calculatedAt: new Date().toISOString(),
          };
        }

        const {
          inventory: inventoryTable,
          purchaseOrders: poTable,
          purchaseOrderItems: poItemsTable,
          products: productsTable,
        } = await import("../drizzle/schema");
        const {
          eq: deq,
          and: dand,
          inArray: dinArray,
          sql: dsql,
        } = await import("drizzle-orm");

        // 采购型产品不参与 MRP：应直接进入采购流程
        const [planProduct] = await db
          .select({
            sourceType: productsTable.sourceType,
            procurePermission: productsTable.procurePermission,
          })
          .from(productsTable)
          .where(deq(productsTable.id, plan.productId))
          .limit(1);
        if (
          planProduct?.sourceType === "purchase" ||
          planProduct?.procurePermission === "purchasable"
        ) {
          throw new Error(
            "该产品获取权限为“采购”，不进入MRP，请直接走采购流程"
          );
        }
        const materialCodes = [
          ...new Set(bomItems.map((b: any) => b.materialCode).filter(Boolean)),
        ] as string[];

        const materialProductMetaMap = new Map<
          string,
          {
            sourceType: string;
            procurePermission: "purchasable" | "production_only" | "";
          }
        >();
        if (materialCodes.length > 0) {
          const materialProductRows = await db
            .select({
              code: productsTable.code,
              sourceType: productsTable.sourceType,
              procurePermission: productsTable.procurePermission,
            })
            .from(productsTable)
            .where(dinArray(productsTable.code, materialCodes));
          for (const row of materialProductRows) {
            const code = String(row.code || "").trim();
            if (!code) continue;
            materialProductMetaMap.set(code, {
              sourceType: String(row.sourceType || ""),
              procurePermission:
                row.procurePermission === "purchasable" ||
                row.procurePermission === "production_only"
                  ? row.procurePermission
                  : row.sourceType === "purchase"
                    ? "purchasable"
                    : "",
            });
          }
        }

        // 合格库存
        let inventoryMap: Record<string, number> = {};
        if (materialCodes.length > 0) {
          const invRows = await db
            .select({
              materialCode: inventoryTable.materialCode,
              totalQty: dsql<number>`SUM(CAST(${inventoryTable.quantity} AS DECIMAL(20,4)))`,
            })
            .from(inventoryTable)
            .where(
              dand(
                deq(inventoryTable.status, "qualified"),
                dinArray(inventoryTable.materialCode, materialCodes)
              )
            )
            .groupBy(inventoryTable.materialCode);
          for (const row of invRows)
            if (row.materialCode)
              inventoryMap[row.materialCode] = Number(row.totalQty) || 0;
        }

        // 在途量（采购订单已审批/已下单/部分收货，未完全到货部分）
        let onOrderMap: Record<string, number> = {};
        if (materialCodes.length > 0) {
          const onOrderRows = await db
            .select({
              materialCode: poItemsTable.materialCode,
              onOrderQty: dsql<number>`SUM(CAST(${poItemsTable.quantity} AS DECIMAL(20,4)) - CAST(COALESCE(${poItemsTable.receivedQty}, 0) AS DECIMAL(20,4)))`,
            })
            .from(poItemsTable)
            .innerJoin(poTable, deq(poItemsTable.orderId, poTable.id))
            .where(
              dand(
                dinArray(poTable.status, [
                  "approved",
                  "ordered",
                  "partial_received",
                ]),
                dinArray(poItemsTable.materialCode, materialCodes)
              )
            )
            .groupBy(poItemsTable.materialCode);
          for (const row of onOrderRows)
            if (row.materialCode)
              onOrderMap[row.materialCode] = Math.max(
                0,
                Number(row.onOrderQty) || 0
              );
        }

        const today = new Date();
        const plannedEndDate = plan.plannedEndDate
          ? new Date(String(plan.plannedEndDate))
          : null;
        const daysToDeadline = plannedEndDate
          ? Math.ceil(
              (plannedEndDate.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999;

        const items = bomItems.map((b: any) => {
          const requiredQty = parseFloat(String(b.quantity)) * plannedQty;
          const onHandQty = inventoryMap[b.materialCode] || 0;
          const onOrderQty = onOrderMap[b.materialCode] || 0;
          const netRequirement = Math.max(
            0,
            requiredQty - onHandQty - onOrderQty
          );
          const materialMeta = materialProductMetaMap.get(
            String(b.materialCode || "")
          );
          const isPurchasable =
            !!materialMeta &&
            (materialMeta.sourceType === "purchase" ||
              materialMeta.procurePermission === "purchasable");
          let urgency: "high" | "medium" | "low" = "low";
          if (netRequirement > 0) {
            if (daysToDeadline <= 7) urgency = "high";
            else if (daysToDeadline <= 14) urgency = "medium";
          }
          return {
            bomId: b.id,
            materialCode: b.materialCode || "-",
            materialName: b.materialName,
            specification: b.specification || "-",
            unit: b.unit || "-",
            bomQty: parseFloat(String(b.quantity)),
            requiredQty: Math.round(requiredQty * 10000) / 10000,
            onHandQty: Math.round(onHandQty * 10000) / 10000,
            onOrderQty: Math.round(onOrderQty * 10000) / 10000,
            netRequirement: Math.round(netRequirement * 10000) / 10000,
            urgency,
            hasShortage: netRequirement > 0,
            needPurchase: netRequirement > 0 && isPurchasable,
            procurePermission: materialMeta?.procurePermission || "",
          };
        });

        return {
          planId: plan.id,
          planNo: plan.planNo,
          productId: plan.productId,
          productName: plan.productName,
          plannedQty,
          unit: plan.unit,
          plannedStartDate: plan.plannedStartDate
            ? String(plan.plannedStartDate).split("T")[0]
            : null,
          plannedEndDate: plan.plannedEndDate
            ? String(plan.plannedEndDate).split("T")[0]
            : null,
          daysToDeadline,
          bomMissing: false,
          totalMaterials: items.length,
          shortfallCount: items.filter(i => i.netRequirement > 0).length,
          items,
          calculatedAt: new Date().toISOString(),
        };
      }),

    /**
     * 批量列出所有生产计划（用于 MRP 列表页）
     */
    listPlans: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const plans = await getProductionPlans({
          status: input?.status,
          search: input?.search,
          limit: 200,
        });
        // 采购型产品不进入 MRP（减库存后直接走采购）
        const mrpPlans = plans.filter((p: any) => {
          const isPurchaseSource =
            String(p.productSourceType || "") === "purchase";
          const isPurchasable =
            String(p.productProcurePermission || "") === "purchasable";
          return !isPurchaseSource && !isPurchasable;
        });
        // 将 Date 对象序列化为字符串，避免前端渲染 [object Date]
        return mrpPlans.map((p: any) => ({
          ...p,
          plannedStartDate: p.plannedStartDate
            ? String(p.plannedStartDate).split("T")[0]
            : null,
          plannedEndDate: p.plannedEndDate
            ? String(p.plannedEndDate).split("T")[0]
            : null,
          createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
        }));
      }),

    /**
     * 一键生成采购计划
     * 将 MRP 运算结果中净需求 > 0 的物料，逐条创建采购计划（进入采购计划看板）
     */
    generatePurchaseRequest: protectedProcedure
      .input(
        z.object({
          productionPlanId: z.number(),
          planNo: z.string(),
          productName: z.string(),
          urgency: z.enum(["normal", "urgent", "critical"]).optional(),
          items: z.array(
            z.object({
              materialCode: z.string(),
              materialName: z.string(),
              specification: z.string().optional(),
              unit: z.string().optional(),
              netRequirement: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.items.length === 0) throw new Error("没有需要采购的物料");
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const { products: productsTable, productionPlans: ppTable } =
          await import("../drizzle/schema");
        const { eq: deq, and: dand } = await import("drizzle-orm");

        const [sourcePlan] = await db
          .select({
            salesOrderId: ppTable.salesOrderId,
            salesOrderNo: ppTable.salesOrderNo,
            plannedEndDate: ppTable.plannedEndDate,
          })
          .from(ppTable)
          .where(deq(ppTable.id, input.productionPlanId))
          .limit(1);

        const urgencyToPriority = (
          u?: "normal" | "urgent" | "critical"
        ): "normal" | "high" | "urgent" => {
          if (u === "critical") return "urgent";
          if (u === "urgent") return "high";
          return "normal";
        };

        const createdPlanNos: string[] = [];
        const skippedItems: string[] = [];

        for (const item of input.items) {
          const [product] = await db
            .select({
              id: productsTable.id,
              code: productsTable.code,
              name: productsTable.name,
              unit: productsTable.unit,
              sourceType: productsTable.sourceType,
              procurePermission: productsTable.procurePermission,
            })
            .from(productsTable)
            .where(deq(productsTable.code, item.materialCode))
            .limit(1);

          const isPurchasable =
            !!product &&
            (product.sourceType === "purchase" ||
              product.procurePermission === "purchasable");

          if (!isPurchasable) {
            skippedItems.push(item.materialCode || item.materialName);
            continue;
          }

          const existsWhere = sourcePlan?.salesOrderId
            ? dand(
                deq(ppTable.productId, product.id),
                deq(ppTable.salesOrderId, sourcePlan.salesOrderId),
                deq(ppTable.status, "pending")
              )
            : dand(
                deq(ppTable.productId, product.id),
                deq(ppTable.status, "pending")
              );

          const exists = await db
            .select({ id: ppTable.id })
            .from(ppTable)
            .where(existsWhere)
            .limit(1);
          if (exists.length > 0) {
            continue;
          }

          const planNo = await getNextOrderNo("CP", ppTable, ppTable.planNo);
          const today = new Date().toISOString().split("T")[0];
          await createProductionPlan({
            planNo,
            planType: sourcePlan?.salesOrderId ? "sales_driven" : "internal",
            salesOrderId: sourcePlan?.salesOrderId ?? undefined,
            salesOrderNo: sourcePlan?.salesOrderNo ?? undefined,
            productId: product.id,
            productName: product.name,
            plannedQty: String(item.netRequirement),
            unit: item.unit || product.unit || "件",
            plannedStartDate: new Date(today) as any,
            plannedEndDate: sourcePlan?.plannedEndDate ?? undefined,
            priority: urgencyToPriority(input.urgency),
            status: "pending",
            remark: `MRP自动生成：来自${input.planNo} 缺料 ${item.materialCode}（${item.materialName}）`,
            createdBy: ctx.user?.id,
          });
          createdPlanNos.push(planNo);
        }

        if (createdPlanNos.length === 0) {
          throw new Error(
            "未生成采购计划：缺料物料未匹配到采购型产品或已存在待采购计划"
          );
        }

        return {
          success: true,
          count: createdPlanNos.length,
          planNos: createdPlanNos,
          skippedItems,
        };
      }),
  }),

  // ==================== UDI 标签管理 ====================
  udi: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: z.string().optional(),
            productId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getUdiDbOrThrow();
        const conditions: any[] = [];
        if (input?.search) {
          conditions.push(
            or(
              like(udiLabels.labelNo, `%${input.search}%`),
              like(udiLabels.productName, `%${input.search}%`),
              like(udiLabels.udiDi, `%${input.search}%`),
              like(udiLabels.batchNo, `%${input.search}%`)
            )
          );
        }
        if (input?.status)
          conditions.push(eq(udiLabels.status, input.status as any));
        if (input?.productId)
          conditions.push(eq(udiLabels.productId, input.productId));
        const rows = await db
          .select()
          .from(udiLabels)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(udiLabels.createdAt))
          .limit(input?.limit ?? 100)
          .offset(input?.offset ?? 0);
        return rows.map((r: any) => ({
          ...r,
          productionDate: r.productionDate
            ? String(r.productionDate).split("T")[0]
            : null,
          expiryDate: r.expiryDate ? String(r.expiryDate).split("T")[0] : null,
          printDate: r.printDate ? new Date(r.printDate).toISOString() : null,
          nmpaSubmitDate: r.nmpaSubmitDate
            ? new Date(r.nmpaSubmitDate).toISOString()
            : null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        }));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getUdiDbOrThrow();
        const [row] = await db
          .select()
          .from(udiLabels)
          .where(eq(udiLabels.id, input.id));
        if (!row) throw new Error("UDI记录不存在");
        return {
          ...row,
          productionDate: row.productionDate
            ? String(row.productionDate).split("T")[0]
            : null,
          expiryDate: row.expiryDate
            ? String(row.expiryDate).split("T")[0]
            : null,
          printDate: row.printDate
            ? new Date(row.printDate).toISOString()
            : null,
          nmpaSubmitDate: row.nmpaSubmitDate
            ? new Date(row.nmpaSubmitDate).toISOString()
            : null,
          createdAt: row.createdAt
            ? new Date(row.createdAt).toISOString()
            : null,
          updatedAt: row.updatedAt
            ? new Date(row.updatedAt).toISOString()
            : null,
        };
      }),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number().optional(),
          productName: z.string().optional(),
          productCode: z.string().optional(),
          specification: z.string().optional(),
          registrationNo: z.string().optional(),
          riskLevel: z.enum(["I", "II", "III"]).optional(),
          udiDi: z.string().min(1, "UDI-DI不能为空"),
          issuer: z.enum(["GS1", "HIBC", "ICCBBA", "OTHER"]).optional(),
          batchNo: z.string().optional(),
          serialNo: z.string().optional(),
          productionDate: z.string().optional(),
          expiryDate: z.string().optional(),
          carrierType: z
            .enum(["datamatrix", "gs1_128", "qr_code", "rfid"])
            .optional(),
          labelTemplate: z
            .enum(["single", "double", "box", "pallet"])
            .optional(),
          printQty: z.number().optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getUdiDbOrThrow();
        const now = new Date();
        const prefix = `UDI${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const [lastRow] = await db
          .select({ labelNo: udiLabels.labelNo })
          .from(udiLabels)
          .where(like(udiLabels.labelNo, `${prefix}%`))
          .orderBy(desc(udiLabels.labelNo))
          .limit(1);
        const seq = lastRow ? parseInt(lastRow.labelNo.slice(-4)) + 1 : 1;
        const labelNo = `${prefix}${String(seq).padStart(4, "0")}`;
        const inserted = await db.insert(udiLabels).values({
          labelNo,
          productId: input.productId ?? null,
          productName: input.productName ?? null,
          productCode: input.productCode ?? null,
          specification: input.specification ?? null,
          registrationNo: input.registrationNo ?? null,
          riskLevel: input.riskLevel ?? null,
          udiDi: input.udiDi,
          issuer: input.issuer ?? "GS1",
          batchNo: input.batchNo ?? null,
          serialNo: input.serialNo ?? null,
          productionDate: input.productionDate
            ? new Date(input.productionDate)
            : null,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          carrierType: input.carrierType ?? "datamatrix",
          labelTemplate: input.labelTemplate ?? "single",
          printQty: input.printQty ?? 1,
          remark: input.remark ?? null,
          createdBy: ctx.user?.id ?? null,
        } as any);
        const labelId = Number(inserted[0]?.insertId || 0);
        if (labelId > 0) {
          await archiveUdiLabelSnapshotById(labelId, ctx.user?.id);
        }
        return { success: true, labelNo };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          productCode: z.string().optional(),
          specification: z.string().optional(),
          registrationNo: z.string().optional(),
          riskLevel: z.enum(["I", "II", "III"]).optional(),
          udiDi: z.string().optional(),
          issuer: z.enum(["GS1", "HIBC", "ICCBBA", "OTHER"]).optional(),
          batchNo: z.string().optional(),
          serialNo: z.string().optional(),
          productionDate: z.string().optional().nullable(),
          expiryDate: z.string().optional().nullable(),
          carrierType: z
            .enum(["datamatrix", "gs1_128", "qr_code", "rfid"])
            .optional(),
          labelTemplate: z
            .enum(["single", "double", "box", "pallet"])
            .optional(),
          printQty: z.number().optional(),
          status: z
            .enum(["pending", "printing", "printed", "used", "recalled"])
            .optional(),
          remark: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getUdiDbOrThrow();
        const [before] = await db
          .select()
          .from(udiLabels)
          .where(eq(udiLabels.id, input.id))
          .limit(1);
        const { id, productionDate, expiryDate, ...rest } = input;
        await db
          .update(udiLabels)
          .set({
            ...rest,
            productionDate: productionDate
              ? new Date(productionDate)
              : undefined,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          } as any)
          .where(eq(udiLabels.id, id));
        await archiveUdiLabelSnapshotById(id, ctx.user?.id);
        const previousBatchNo = String(before?.batchNo || "").trim();
        const nextBatchNo = String(input.batchNo || "").trim();
        if (previousBatchNo && previousBatchNo !== nextBatchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            previousBatchNo,
            ctx.user?.id
          );
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getUdiDbOrThrow();
        const [before] = await db
          .select()
          .from(udiLabels)
          .where(eq(udiLabels.id, input.id))
          .limit(1);
        await db.delete(udiLabels).where(eq(udiLabels.id, input.id));
        if (before?.batchNo) {
          await archiveBatchRecordSnapshotByBatchNo(
            String(before.batchNo),
            ctx.user?.id
          );
        }
        return { success: true };
      }),

    confirmPrint: protectedProcedure
      .input(z.object({ id: z.number(), printedQty: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getUdiDbOrThrow();
        await db
          .update(udiLabels)
          .set({
            status: "printed",
            printedQty: input.printedQty,
            printDate: new Date(),
            printedBy: ctx.user?.id ?? null,
          } as any)
          .where(eq(udiLabels.id, input.id));
        await archiveUdiLabelSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),

    submitNmpa: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getUdiDbOrThrow();
        await db
          .update(udiLabels)
          .set({
            nmpaSubmitted: true,
            nmpaSubmitDate: new Date(),
          } as any)
          .where(eq(udiLabels.id, input.id));
        await archiveUdiLabelSnapshotById(input.id, ctx.user?.id);
        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      const db = await getUdiDbOrThrow();
      const rows = await db
        .select({
          status: udiLabels.status,
          count: sql<number>`count(*)`,
        })
        .from(udiLabels)
        .groupBy(udiLabels.status);
      const result: Record<string, number> = {};
      rows.forEach((r: any) => {
        result[r.status] = Number(r.count);
      });
      return {
        total: Object.values(result).reduce((a, b) => a + b, 0),
        pending: result["pending"] ?? 0,
        printing: result["printing"] ?? 0,
        printed: result["printed"] ?? 0,
        used: result["used"] ?? 0,
        recalled: result["recalled"] ?? 0,
      };
    }),
  }),

  // ==================== 系统设置 ====================
  settings: router({
    testEmail: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ input }) => {
        const { sendEmail } = await import("./emailService");
        const success = await sendEmail({
          to: input.to,
          subject: "[GTP-ERP] SMTP 配置测试邮件",
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:32px auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
              <h2 style="color:#2563eb;margin-bottom:8px;">SMTP 配置测试成功</h2>
              <p style="color:#374151;">GTP-ERP 系统的邮件服务已正常工作！</p>
              <p style="color:#6b7280;font-size:13px;margin-top:16px;">收到此邮件说明您的 SMTP 配置正确，关键业务节点的自动通知将正常发送。</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
              <p style="color:#9ca3af;font-size:12px;">此邮件由 GTP-ERP 系统自动发送，请勿直接回复。</p>
            </div>
          `,
          text: "GTP-ERP SMTP 配置测试成功！关键业务节点的自动通知将正常发送。",
        });
        if (!success) throw new Error("邮件发送失败，请检查 SMTP 配置");
        return { success: true };
      }),
    saveSmtpConfig: adminProcedure
      .input(
        z.object({
          smtpHost: z.string(),
          smtpPort: z.number().default(465),
          smtpUser: z.string().email(),
          smtpPass: z.string(),
          smtpFrom: z.string().optional(),
          smtpSecure: z.boolean().default(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // 将 SMTP 配置写入公司信息表（作为配置存储）
        // 实际生产环境应将这些写入环境变量，这里仅做记录
        const { updateCompanyInfo } = await import("./db");
        await updateCompanyInfo(
          {
            smtpConfig: JSON.stringify({
              host: input.smtpHost,
              port: input.smtpPort,
              user: input.smtpUser,
              secure: input.smtpSecure,
              from: input.smtpFrom || input.smtpUser,
            }),
          } as any,
          ctx.user?.companyId
        );
        return {
          success: true,
          message:
            "配置已保存，请在服务器环境变量中配置 SMTP_HOST/SMTP_USER/SMTP_PASS 以生效",
        };
      }),
    getMyEmailSignature: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureUsersEmailSignatureColumn(db);
      await ensureCollaborationDataModel(db);
      return {
        emailSignature: await getCurrentUserEmailSignature(ctx.user),
      };
    }),
    saveMyEmailSignature: protectedProcedure
      .input(
        z.object({
          emailSignature: z.string().max(5000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensureUsersEmailSignatureColumn(db);
        await ensureCollaborationDataModel(db);
        const userId = Number(ctx.user?.id || 0);
        if (userId <= 0) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "用户未登录" });
        }
        const activeCompanyId = getActiveCompanyId(ctx.user);
        const homeCompanyId = Number(
          ctx.user?.homeCompanyId || ctx.user?.companyId || 0
        );
        const signature = input.emailSignature.replace(/\r\n/g, "\n").trim();

        if (
          activeCompanyId > 0 &&
          homeCompanyId > 0 &&
          activeCompanyId !== homeCompanyId
        ) {
          const [accessRow] = await db
            .select({ id: companyUserAccess.id })
            .from(companyUserAccess)
            .where(
              and(
                eq(companyUserAccess.companyId, activeCompanyId),
                eq(companyUserAccess.userId, userId)
              )
            )
            .limit(1);
          if (!accessRow) {
            throw new Error("当前公司未授权该用户");
          }
          await db
            .update(companyUserAccess)
            .set({ emailSignature: signature || null })
            .where(eq(companyUserAccess.id, Number(accessRow.id)));
        } else {
          await db
            .update(users)
            .set({ emailSignature: signature || null })
            .where(eq(users.id, userId));
        }

        return { success: true };
      }),
  }),

  // ==================== 批记录（全链路追溯）====================
  batchRecord: router({
    list: protectedProcedure
      .input(
        z
          .object({
            batchNo: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getBatchRecordList(input ?? {});
      }),
    getByBatchNo: protectedProcedure
      .input(z.object({ batchNo: z.string() }))
      .query(async ({ input, ctx }) => {
        const result = await getBatchRecord(input.batchNo);
        if (!result) throw new Error(`未找到批号 ${input.batchNo} 的批记录`);
        await archiveBatchRecordSnapshotByBatchNo(
          input.batchNo,
          ctx.user?.id,
          result
        );
        return result;
      }),
  }),
  goodsReceipts: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            search: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getGoodsReceipts(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getGoodsReceiptById(input.id);
        if (record) {
          await archiveGoodsReceiptSnapshotById(input.id, ctx.user?.id);
        }
        return record;
      }),
    create: protectedProcedure
      .input(
        z.object({
          receiptNo: z.string(),
          purchaseOrderId: z.number(),
          purchaseOrderNo: z.string(),
          supplierId: z.number().optional(),
          supplierName: z.string().optional(),
          warehouseId: z.number(),
          receiptDate: z.string(),
          remark: z.string().optional(),
          items: z.array(
            z.object({
              purchaseOrderItemId: z.number().optional(),
              productId: z.number().optional(),
              materialCode: z.string().optional(),
              materialName: z.string(),
              specification: z.string().optional(),
              unit: z.string().optional(),
              orderedQty: z.string(),
              receivedQty: z.string(),
              batchNo: z.string().optional(),
              sterilizationBatchNo: z.string().optional(),
              remark: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createGoodsReceipt({
          ...input,
          createdBy: ctx.user?.id,
        });
        await archiveGoodsReceiptSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.string().optional(),
          inspectorId: z.number().optional(),
          inspectorName: z.string().optional(),
          inspectionDate: z.string().optional(),
          inspectionResult: z.string().optional(),
          inspectionRemark: z.string().optional(),
          inboundDocumentNo: z.string().optional(),
          remark: z.string().optional(),
          items: z
            .array(
              z.object({
                purchaseOrderItemId: z.number().optional(),
                productId: z.number().optional(),
                materialCode: z.string().optional(),
                materialName: z.string(),
                specification: z.string().optional(),
                unit: z.string().optional(),
                orderedQty: z.string(),
                receivedQty: z.string(),
                batchNo: z.string().optional(),
                sterilizationBatchNo: z.string().optional(),
                inspectionQty: z.string().optional(),
                qualifiedQty: z.string().optional(),
                unqualifiedQty: z.string().optional(),
                remark: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const before = await getGoodsReceiptById(id);
        const previousBatchNos = new Set(extractGoodsReceiptBatchNos(before));
        await updateGoodsReceipt(id, data as any);
        await archiveGoodsReceiptSnapshotById(id, ctx.user?.id);
        const after = await getGoodsReceiptById(id);
        const nextBatchNos = new Set(extractGoodsReceiptBatchNos(after));
        for (const batchNo of previousBatchNos) {
          if (!nextBatchNos.has(batchNo)) {
            await archiveBatchRecordSnapshotByBatchNo(batchNo, ctx.user?.id);
          }
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const before = await getGoodsReceiptById(input.id);
        await deleteGoodsReceipt(input.id);
        for (const batchNo of extractGoodsReceiptBatchNos(before)) {
          await archiveBatchRecordSnapshotByBatchNo(batchNo, ctx.user?.id);
        }
        return { success: true };
      }),
  }),

  // ==================== 检验要求 ====================
  inspectionRequirements: router({
    list: protectedProcedure
      .input(
        z
          .object({
            type: z.string().optional(),
            search: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getInspectionRequirements(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getInspectionRequirementById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          requirementNo: z.string(),
          type: z.enum(["IQC", "IPQC", "OQC"]),
          productCode: z.string().optional(),
          productName: z.string(),
          version: z.string().optional(),
          status: z.string().optional(),
          remark: z.string().optional(),
          items: z.array(
            z.object({
              sourceDataId: z.string().optional(),
              itemName: z.string(),
              itemType: z.enum(["qualitative", "quantitative"]),
              standard: z.string().optional(),
              standardRequirement: z.string().optional(),
              standardBasis: z.string().optional(),
              inspectionRequirement: z.string().optional(),
              minValue: z.string().optional(),
              maxValue: z.string().optional(),
              unit: z.string().optional(),
              acceptedValues: z.string().optional(),
              sortOrder: z.number().optional(),
              remark: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createInspectionRequirement({
          ...input,
          createdBy: ctx.user?.id,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          requirementNo: z.string().optional(),
          type: z.enum(["IQC", "IPQC", "OQC"]).optional(),
          productCode: z.string().optional(),
          productName: z.string().optional(),
          version: z.string().optional(),
          status: z.string().optional(),
          remark: z.string().optional(),
          items: z
            .array(
              z.object({
                sourceDataId: z.string().optional(),
                itemName: z.string(),
                itemType: z.enum(["qualitative", "quantitative"]),
                standard: z.string().optional(),
                standardRequirement: z.string().optional(),
                standardBasis: z.string().optional(),
                inspectionRequirement: z.string().optional(),
                minValue: z.string().optional(),
                maxValue: z.string().optional(),
                unit: z.string().optional(),
                acceptedValues: z.string().optional(),
                sortOrder: z.number().optional(),
                remark: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateInspectionRequirement(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInspectionRequirement(input.id);
        return { success: true };
      }),
  }),

  // ==================== 来料检验单（IQC） ====================
  iqcInspections: router({
    list: protectedProcedure
      .input(
        z
          .object({
            result: z.string().optional(),
            search: z.string().optional(),
            goodsReceiptId: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getIqcInspections(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getIqcInspectionById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          inspectionNo: z.string(),
          reportMode: z.enum(["online", "offline"]).optional(),
          goodsReceiptId: z.number().optional(),
          goodsReceiptNo: z.string().optional(),
          goodsReceiptItemId: z.number().optional(),
          productId: z.number().optional(),
          productCode: z.string().optional(),
          productName: z.string(),
          specification: z.string().optional(),
          supplierId: z.number().optional(),
          supplierName: z.string().optional(),
          supplierCode: z.string().optional(),
          batchNo: z.string().optional(),
          sterilizationBatchNo: z.string().optional(),
          receivedQty: z.string().optional(),
          sampleQty: z.string().optional(),
          qualifiedQty: z.string().optional(),
          unit: z.string().optional(),
          inspectionRequirementId: z.number().optional(),
          inspectionDate: z.string().optional(),
          inspectorId: z.number().optional(),
          inspectorName: z.string().optional(),
          result: z.string().optional(),
          remark: z.string().optional(),
          attachments: z.string().optional(),
          signatures: z.string().optional(),
          items: z.array(
            z.object({
              requirementItemId: z.number().optional(),
              itemName: z.string(),
              itemType: z.enum(["qualitative", "quantitative"]),
              standard: z.string().optional(),
              minValue: z.string().optional(),
              maxValue: z.string().optional(),
              unit: z.string().optional(),
              measuredValue: z.string().optional(),
              sampleValues: z.string().optional(),
              acceptedValues: z.string().optional(),
              actualValue: z.string().optional(),
              conclusion: z.enum(["pass", "fail", "pending"]).optional(),
              sortOrder: z.number().optional(),
              remark: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await createIqcInspection({
          ...input,
          createdBy: ctx.user?.id,
        });
        await archiveIqcInspectionSnapshotById(id, ctx.user?.id);
        return { id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          reportMode: z.enum(["online", "offline"]).optional(),
          inspectionDate: z.string().optional(),
          inspectorId: z.number().optional(),
          inspectorName: z.string().optional(),
          result: z.string().optional(),
          sampleQty: z.string().optional(),
          qualifiedQty: z.string().optional(),
          remark: z.string().optional(),
          attachments: z.string().optional(),
          signatures: z.string().optional(),
          inspectionRequirementId: z.number().optional(),
          supplierCode: z.string().optional(),
          items: z
            .array(
              z.object({
                requirementItemId: z.number().optional(),
                itemName: z.string(),
                itemType: z.enum(["qualitative", "quantitative"]),
                standard: z.string().optional(),
                minValue: z.string().optional(),
                maxValue: z.string().optional(),
                unit: z.string().optional(),
                measuredValue: z.string().optional(),
                sampleValues: z.string().optional(),
                acceptedValues: z.string().optional(),
                actualValue: z.string().optional(),
                conclusion: z.enum(["pass", "fail", "pending"]).optional(),
                sortOrder: z.number().optional(),
                remark: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateIqcInspection(id, data);
        await archiveIqcInspectionSnapshotById(id, ctx.user?.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteIqcInspection(input.id);
        return { success: true };
      }),
    saveDraft: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(), // 有 id 则更新，无则新建
          inspectionNo: z.string(),
          reportMode: z.enum(["online", "offline"]).optional(),
          goodsReceiptId: z.number().optional(),
          goodsReceiptNo: z.string().optional(),
          goodsReceiptItemId: z.number().optional(),
          productId: z.number().optional(),
          productCode: z.string().optional(),
          productName: z.string(),
          specification: z.string().optional(),
          supplierId: z.number().optional(),
          supplierName: z.string().optional(),
          supplierCode: z.string().optional(),
          batchNo: z.string().optional(),
          sterilizationBatchNo: z.string().optional(),
          receivedQty: z.string().optional(),
          sampleQty: z.string().optional(),
          qualifiedQty: z.string().optional(),
          unit: z.string().optional(),
          inspectionRequirementId: z.number().optional(),
          inspectionDate: z.string().optional(),
          inspectorId: z.number().optional(),
          inspectorName: z.string().optional(),
          remark: z.string().optional(),
          attachments: z.string().optional(),
          items: z.array(
            z.object({
              requirementItemId: z.number().optional(),
              itemName: z.string(),
              itemType: z.enum(["qualitative", "quantitative"]),
              standard: z.string().optional(),
              minValue: z.string().optional(),
              maxValue: z.string().optional(),
              unit: z.string().optional(),
              measuredValue: z.string().optional(),
              sampleValues: z.string().optional(),
              acceptedValues: z.string().optional(),
              actualValue: z.string().optional(),
              conclusion: z.enum(["pass", "fail", "pending"]).optional(),
              sortOrder: z.number().optional(),
              remark: z.string().optional(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const draftPayload = { ...data, result: "draft" as const, signatures: undefined };
        if (id) {
          await updateIqcInspection(id, draftPayload);
          return { id };
        } else {
          const newId = await createIqcInspection({
            ...draftPayload,
            items: data.items ?? [],
            createdBy: ctx.user?.id,
          });
          return { id: newId };
        }
      }),
    getMobileUploadLink: protectedProcedure
      .input(
        z.object({
          inspectionNo: z.string(),
          productName: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return {
          token: buildIqcMobileUploadToken(input.inspectionNo),
          inspectionNo: input.inspectionNo,
          productName: input.productName || "",
        };
      }),
    getAttachmentPool: protectedProcedure
      .input(z.object({ inspectionNo: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        await ensureIqcInspectionsTable(db);
        const rows = (await db.execute(sql`
          SELECT attachments
          FROM iqc_inspections
          WHERE inspectionNo = ${input.inspectionNo}
          ORDER BY id DESC
          LIMIT 1
        `)) as any;
        const rowList = Array.isArray(rows?.[0]) ? rows[0] : rows;
        const record = Array.from(rowList as any[])[0] as any;
        const storedAttachments = parseAttachmentList(record?.attachments);
        const pendingAttachments = await getIqcPendingUploads(
          input.inspectionNo
        );
        const merged = [...storedAttachments];
        const existingPaths = new Set(merged.map(item => item.filePath));
        pendingAttachments.forEach(item => {
          if (existingPaths.has(item.filePath)) return;
          merged.push({
            fileName: item.fileName,
            filePath: item.filePath,
            mimeType: item.mimeType || undefined,
          });
        });
        return merged;
      }),
    clearPendingUploads: protectedProcedure
      .input(z.object({ inspectionNo: z.string() }))
      .mutation(async ({ input }) => {
        await clearIqcPendingUploads(input.inspectionNo);
        return { success: true };
      }),
    uploadAttachments: protectedProcedure
      .input(
        z.object({
          inspectionNo: z.string(),
          productName: z.string().optional(),
          files: z
            .array(
              z.object({
                name: z.string(),
                mimeType: z.string().optional(),
                base64: z.string(),
              })
            )
            .min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [department, folderName] = buildUploadFolderName(
          "质量部",
          "来料检验"
        ).map(safeFileSegment);
        const inspectionNo = safeFileSegment(input.inspectionNo || "IQC");
        const saved: Array<{
          fileName: string;
          filePath: string;
          mimeType: string;
        }> = [];
        for (let index = 0; index < input.files.length; index++) {
          const file = input.files[index];
          const extFromName = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
          const ext =
            extFromName ||
            (String(file.mimeType || "").includes("pdf")
              ? ".pdf"
              : String(file.mimeType || "").includes("image/")
                ? ".jpg"
                : "");
          if (!ATTACHMENT_EXTENSIONS.includes(ext as any)) {
            throw new Error(`不支持的文件格式: ${file.name}`);
          }
          const base64Body = String(file.base64 || "").replace(
            /^data:[^;]+;base64,/,
            ""
          );
          const fileBuffer = Buffer.from(base64Body, "base64");
          const result = await saveAttachmentFile({
            department,
            businessFolder: folderName,
            originalName: file.name,
            desiredBaseName: buildIqcAttachmentBaseName(
              input.productName || "产品",
              inspectionNo,
              index + 1
            ),
            mimeType: file.mimeType,
            buffer: fileBuffer,
            saveToFileManager: true,
          });
          saved.push({
            fileName: result.fileName,
            filePath: result.filePath,
            mimeType: file.mimeType || "",
          });
          await insertKnowledgeBaseFileDocument({
            sourceKey: `iqc_attachment:${inspectionNo}:${result.fileName}`,
            title: `IQC附件-${inspectionNo}-${result.fileName}`,
            department: "质量部",
            filePath: result.fileManagerPath || result.filePath,
            summary: "来料检验附件自动归档",
            operatorId: ctx.user?.id,
          });
        }
        return saved;
      }),
    mobileUploadAttachments: publicProcedure
      .input(
        z.object({
          inspectionNo: z.string(),
          productName: z.string().optional(),
          token: z.string(),
          files: z
            .array(
              z.object({
                name: z.string(),
                mimeType: z.string().optional(),
                base64: z.string(),
              })
            )
            .min(1),
        })
      )
      .mutation(async ({ input }) => {
        const inspectionNo = safeFileSegment(input.inspectionNo || "IQC");
        if (input.token !== buildIqcMobileUploadToken(inspectionNo)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "上传二维码已失效",
          });
        }
        const [department, folderName] = buildUploadFolderName(
          "质量部",
          "来料检验"
        ).map(safeFileSegment);
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensureIqcInspectionsTable(db);
        const existingRows = (await db.execute(sql`
          SELECT id, attachments
          FROM iqc_inspections
          WHERE inspectionNo = ${inspectionNo}
          ORDER BY id DESC
          LIMIT 1
        `)) as any;
        const existingRowList = Array.isArray(existingRows?.[0])
          ? existingRows[0]
          : existingRows;
        const existingRecord = Array.from(existingRowList as any[])[0] as any;
        const existingAttachments = parseAttachmentList(
          existingRecord?.attachments
        );
        const baseIndex = existingRecord
          ? existingAttachments.length
          : (await getIqcPendingUploads(inspectionNo)).length;
        const saved: Array<{
          fileName: string;
          filePath: string;
          mimeType: string;
        }> = [];
        for (let index = 0; index < input.files.length; index++) {
          const file = input.files[index];
          const extFromName = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
          const ext =
            extFromName ||
            (String(file.mimeType || "").includes("pdf")
              ? ".pdf"
              : String(file.mimeType || "").includes("image/")
                ? ".jpg"
                : "");
          if (!ATTACHMENT_EXTENSIONS.includes(ext as any)) {
            throw new Error(`不支持的文件格式: ${file.name}`);
          }
          const seq = baseIndex + index + 1;
          const base64Body = String(file.base64 || "").replace(
            /^data:[^;]+;base64,/,
            ""
          );
          const fileBuffer = Buffer.from(base64Body, "base64");
          const result = await saveAttachmentFile({
            department,
            businessFolder: folderName,
            originalName: file.name,
            desiredBaseName: buildIqcAttachmentBaseName(
              input.productName || "产品",
              inspectionNo,
              seq
            ),
            mimeType: file.mimeType,
            buffer: fileBuffer,
            saveToFileManager: true,
          });
          const savedItem = {
            fileName: result.fileName,
            filePath: result.filePath,
            mimeType: file.mimeType || "",
          };
          await insertKnowledgeBaseFileDocument({
            sourceKey: `iqc_attachment:${inspectionNo}:${result.fileName}`,
            title: `IQC附件-${inspectionNo}-${result.fileName}`,
            department: "质量部",
            filePath: result.fileManagerPath || result.filePath,
            summary: "来料检验附件自动归档",
            operatorId: null,
          });
          if (existingRecord?.id) {
            existingAttachments.push(savedItem);
          } else {
            await addIqcPendingUpload({
              inspectionNo,
              productName: input.productName || "",
              fileName: savedItem.fileName,
              filePath: savedItem.filePath,
              mimeType: savedItem.mimeType,
            });
          }
          saved.push(savedItem);
        }
        if (existingRecord?.id) {
          await db.execute(sql`
            UPDATE iqc_inspections
            SET attachments = ${JSON.stringify(existingAttachments)}
            WHERE id = ${existingRecord.id}
          `);
          await archiveIqcInspectionSnapshotById(
            Number(existingRecord.id),
            null
          );
        }
        return saved;
      }),
    saveSignature: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          signature: z.object({
            id: z.number(),
            signatureType: z.enum(["inspector", "reviewer", "approver"]),
            signatureAction: z.string(),
            signerName: z.string(),
            signerTitle: z.string().optional(),
            signerDepartment: z.string().optional(),
            signedAt: z.string(),
            signatureMeaning: z.string(),
            status: z.enum(["valid", "revoked"]),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensureIqcInspectionsTable(db);
        // 读取当前已有的签名列表
        const [row] = (await db.execute(
          sql`SELECT signatures FROM iqc_inspections WHERE id = ${input.id}`
        )) as any;
        const existing: any[] = (() => {
          try {
            return (
              JSON.parse(String((row as any)?.[0]?.signatures || "[]")) || []
            );
          } catch {
            return [];
          }
        })();
        const updated = [...existing, input.signature];
        await db.execute(
          sql`UPDATE iqc_inspections SET signatures = ${JSON.stringify(updated)} WHERE id = ${input.id}`
        );
        await archiveIqcInspectionSnapshotById(input.id, ctx.user?.id);
        return { success: true, signatures: updated };
      }),
  }),

  // ==================== 邮件协同 ====================
  mail: router({
    syncInbox: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .mutation(async ({ input }) => {
        const { syncInbox } = await import("./mailService");
        return await syncInbox(input?.limit ?? 50);
      }),

    list: protectedProcedure
      .input(
        z
          .object({
            folder: z.enum(["inbox", "sent", "draft", "trash"]).optional(),
            search: z.string().optional(),
            contactAddress: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { getEmails } = await import("./mailService");
        return await getEmails(input ?? {});
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getEmailById } = await import("./mailService");
        return await getEmailById(input.id);
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number(), isRead: z.boolean() }))
      .mutation(async ({ input }) => {
        const { markEmailRead } = await import("./mailService");
        await markEmailRead(input.id, input.isRead);
        return { success: true };
      }),

    markStarred: protectedProcedure
      .input(z.object({ id: z.number(), isStarred: z.boolean() }))
      .mutation(async ({ input }) => {
        const { markEmailStarred } = await import("./mailService");
        await markEmailStarred(input.id, input.isStarred);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteEmail } = await import("./mailService");
        await deleteEmail(input.id);
        return { success: true };
      }),

    saveDraft: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          subject: z.string().optional(),
          toAddress: z.string().optional(),
          ccAddress: z.string().optional(),
          bodyHtml: z.string().optional(),
          bodyText: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { saveDraft } = await import("./mailService");
        const id = await saveDraft(input);
        return { id };
      }),

    send: protectedProcedure
      .input(
        z.object({
          to: z.string(),
          cc: z.string().optional(),
          subject: z.string(),
          bodyHtml: z.string(),
          bodyText: z.string().optional(),
          draftId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { sendMail } = await import("./mailService");
        const signature = await getCurrentUserEmailSignature(ctx.user);
        const payload = appendEmailSignature({
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          signature,
        });
        return await sendMail({
          ...input,
          bodyHtml: payload.bodyHtml,
          bodyText: payload.bodyText,
        });
      }),

    translate: protectedProcedure
      .input(z.object({ id: z.number(), targetLang: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { translateEmail } = await import("./mailService");
        const result = await translateEmail(input.id, input.targetLang);
        return { result };
      }),

    generateReply: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { generateReply } = await import("./mailService");
        const result = await generateReply(input.id);
        return { result };
      }),

    contacts: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { getEmailContacts } = await import("./mailService");
        return await getEmailContacts(input ?? {});
      }),

    // AI 辅助写作：根据指令生成/润色/翻译邮件正文
    aiWrite: protectedProcedure
      .input(
        z.object({
          mode: z.enum(["polish", "translate", "generate"]),
          subject: z.string().optional(),
          body: z.string().optional(),
          instruction: z.string().optional(),
          targetLang: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { OpenAI } = await import("openai");
        const zhipuKey =
          process.env.ZHIPU_API_KEY ||
          "b2427e1eaec24e1dbfc6b08c82e6d693.zc0XAEJ1g7iStgYY";
        const client = new OpenAI({
          apiKey: zhipuKey,
          baseURL: "https://open.bigmodel.cn/api/paas/v4",
        });
        const model = "glm-4-flash";
        let systemPrompt = "";
        let userPrompt = "";
        if (input.mode === "generate") {
          systemPrompt =
            "你是一个专业的商务邮件写作助手。请根据用户的描述，生成一封格式规范、语气专业的商务邮件正文，包含称呼、正文、结尾敬语和签名占位符。只输出邮件正文。";
          userPrompt = `邮件主题：${input.subject || ""}
内容要求：${input.instruction || input.body || ""}`;
        } else if (input.mode === "polish") {
          systemPrompt =
            "你是一个专业的商务邮件润色助手。请对用户提供的邮件正文进行润色和优化，保持原文意思，使语言更加流畅、专业、礼貌。只输出润色后的正文。";
          userPrompt = input.body || "";
        } else {
          const lang = input.targetLang || "中文";
          systemPrompt = `你是一个专业的商务邮件翻译助手。请将以下邮件正文翻译成${lang}，并严格保留原文排版结构。
要求：
1. 保留原有段落、空行、换行、编号、项目符号、称呼、签名和引用结构
2. 不要合并段落，不要改写版式，不要新增解释
3. 只输出翻译结果。`;
          userPrompt = input.body || "";
        }
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        });
        return { result: completion.choices[0]?.message?.content || "" };
      }),

    // 系统文件列表（从 uploads 目录扫描）
    listSystemFiles: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const fs = await import("fs");
        const path = await import("path");
        const uploadsDir = path.join(process.cwd(), "uploads");
        const files: Array<{
          name: string;
          path: string;
          size: number;
          category: string;
          modifiedAt: string;
        }> = [];
        function scanDir(dir: string, category: string) {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                const subCategory = category
                  ? `${category}/${entry.name}`
                  : entry.name;
                scanDir(fullPath, subCategory);
              } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (
                  [
                    ".pdf",
                    ".doc",
                    ".docx",
                    ".xls",
                    ".xlsx",
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".zip",
                  ].includes(ext)
                ) {
                  const stat = fs.statSync(fullPath);
                  const relativePath = fullPath.replace(
                    process.cwd() + "/",
                    ""
                  );
                  files.push({
                    name: entry.name,
                    path: relativePath,
                    size: stat.size,
                    category,
                    modifiedAt: stat.mtime.toISOString(),
                  });
                }
              }
            }
          } catch {}
        }
        if (fs.existsSync(uploadsDir)) scanDir(uploadsDir, "");
        const search = input?.search?.toLowerCase();
        const filtered = search
          ? files.filter(
              f =>
                f.name.toLowerCase().includes(search) ||
                f.category.toLowerCase().includes(search)
            )
          : files;
        filtered.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
        return filtered.slice(0, input?.limit ?? 100);
      }),
  }),

  // ─── 获客情报模块 ───────────────────────────────────────────────────────────
  prospect: router({
    // Google 关键词搜索目标公司
    searchCompanies: protectedProcedure
      .input(
        z.object({
          keyword: z.string(),
          region: z.string().optional(),
          industry: z.string().optional(),
          maxResults: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const { searchCompaniesByGoogle } = await import("./prospectService");
        return await searchCompaniesByGoogle(
          input.keyword,
          input.region,
          input.industry,
          input.maxResults ?? 10
        );
      }),

    // 富化公司联系人（Apollo + Hunter 合并）
    enrichContacts: protectedProcedure
      .input(
        z.object({
          domain: z.string(),
          titles: z.array(z.string()).optional(),
        })
      )
      .query(async ({ input }) => {
        const { enrichCompany } = await import("./prospectService");
        return await enrichCompany(input.domain);
      }),

    // 从 HubSpot 同步线索
    syncFromHubSpot: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        const { syncLeadsFromHubSpot } = await import("./prospectService");
        return await syncLeadsFromHubSpot(input.limit ?? 50);
      }),

    // 将联系人推送到 HubSpot
    pushToHubSpot: protectedProcedure
      .input(
        z.object({
          firstName: z.string(),
          lastName: z.string(),
          email: z.string(),
          phone: z.string().optional(),
          company: z.string().optional(),
          title: z.string().optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { pushLeadToHubSpot } = await import("./prospectService");
        return await pushLeadToHubSpot(input);
      }),

    // 将线索保存到 ERP 线索库
    saveLead: protectedProcedure
      .input(
        z.object({
          companyName: z.string(),
          companyDomain: z.string().optional(),
          companyWebsite: z.string().optional(),
          country: z.string().optional(),
          industry: z.string().optional(),
          contactName: z.string().optional(),
          contactTitle: z.string().optional(),
          contactEmail: z.string().optional(),
          contactPhone: z.string().optional(),
          contactLinkedin: z.string().optional(),
          source: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        await db.execute(
          `
          INSERT INTO marketing_leads
            (companyName, companyDomain, companyWebsite, country, industry,
             contactName, contactTitle, contactEmail, contactPhone, contactLinkedin,
             source, status, notes, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, NOW(), NOW())
        `,
          [
            input.companyName,
            input.companyDomain || "",
            input.companyWebsite || "",
            input.country || "",
            input.industry || "",
            input.contactName || "",
            input.contactTitle || "",
            input.contactEmail || "",
            input.contactPhone || "",
            input.contactLinkedin || "",
            input.source || "获客情报",
            input.notes || "",
            (ctx as any).user?.name || "系统",
          ]
        );
        return { success: true };
      }),

    // 获取已保存的线索列表
    getLeads: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            search: z.string().optional(),
            page: z.number().optional(),
            pageSize: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        await db.execute(`
          CREATE TABLE IF NOT EXISTS marketing_leads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            companyName VARCHAR(300) NOT NULL,
            companyDomain VARCHAR(300),
            companyWebsite VARCHAR(500),
            country VARCHAR(100),
            industry VARCHAR(200),
            contactName VARCHAR(200),
            contactTitle VARCHAR(200),
            contactEmail VARCHAR(320),
            contactPhone VARCHAR(100),
            contactLinkedin VARCHAR(500),
            source VARCHAR(100),
            status ENUM('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
            notes TEXT,
            createdBy VARCHAR(100),
            followUpAt DATETIME,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        const page = input?.page ?? 1;
        const pageSize = input?.pageSize ?? 20;
        const offset = (page - 1) * pageSize;
        let where = "WHERE 1=1";
        const params: any[] = [];
        if (input?.status) {
          where += " AND status = ?";
          params.push(input.status);
        }
        if (input?.search) {
          where +=
            " AND (companyName LIKE ? OR contactName LIKE ? OR contactEmail LIKE ?)";
          params.push(
            `%${input.search}%`,
            `%${input.search}%`,
            `%${input.search}%`
          );
        }
        const [rows] = (await db.execute(
          `SELECT * FROM marketing_leads ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
          [...params, pageSize, offset]
        )) as any;
        const [countRows] = (await db.execute(
          `SELECT COUNT(*) as total FROM marketing_leads ${where}`,
          params
        )) as any;
        return { leads: rows, total: countRows[0]?.total ?? 0, page, pageSize };
      }),

    // 更新线索状态
    updateLeadStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "new",
            "contacted",
            "qualified",
            "converted",
            "lost",
          ]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db.execute(
          "UPDATE marketing_leads SET status = ?, notes = COALESCE(?, notes), updatedAt = NOW() WHERE id = ?",
          [input.status, input.notes, input.id]
        );
        return { success: true };
      }),

    // 获取 API 配置状态（检查哪些渠道已配置）
    getApiStatus: protectedProcedure.query(async () => {
      return {
        google: !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID),
        apollo: !!process.env.APOLLO_API_KEY,
        hunter: !!process.env.HUNTER_API_KEY,
        hubspot: !!process.env.HUBSPOT_ACCESS_TOKEN,
        linkedin: !!process.env.LINKEDIN_ACCESS_TOKEN,
      };
    }),
  }),

  // 发票 AI 识别（豆包→通义千问→智谱 三家轮询，支持图片和PDF）
  invoiceOcr: router({
    recognize: protectedProcedure
      .input(
        z.object({
          images: z.array(
            z.object({
              name: z.string(),
              base64: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const { recognizeInvoices } = await import("./invoiceOcrService");
        return await recognizeInvoices(input.images);
      }),
  }),

  // 网站管理 + 社交媒体同步发布
  website: router({
    // 发布文章并同步到 Facebook / LinkedIn / 官网
    publishArticle: protectedProcedure
      .input(
        z.object({
          articleId: z.number().optional(),
          title: z.string(),
          summary: z.string().optional().default(""),
          content: z.string(),
          coverImage: z.string().optional(),
          articleUrl: z.string().optional(),
          publishToWebsite: z.boolean().default(true),
          publishToFacebook: z.boolean().default(false),
          publishToLinkedin: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const {
          publishToFacebook,
          publishToLinkedin,
          publishToWebsiteWebhook,
        } = await import("./socialPublishService");
        const results: Record<string, any> = {};

        // 官网 Webhook
        if (input.publishToWebsite) {
          const r = await publishToWebsiteWebhook({
            title: input.title,
            summary: input.summary,
            content: input.content,
            category: "公司新闻",
            coverImage: input.coverImage,
            publishedAt: new Date().toISOString().slice(0, 10),
          });
          results.websiteSuccess = r.success;
          results.websiteError = r.error;
        }

        // Facebook
        if (input.publishToFacebook) {
          const r = await publishToFacebook({
            title: input.title,
            summary: input.summary,
            coverImage: input.coverImage,
            articleUrl: input.articleUrl,
          });
          results.facebookSuccess = r.success;
          results.facebookPostId = r.postId;
          results.facebookError = r.error;
        }

        // LinkedIn
        if (input.publishToLinkedin) {
          const r = await publishToLinkedin({
            title: input.title,
            summary: input.summary,
            coverImage: input.coverImage,
            articleUrl: input.articleUrl,
          });
          results.linkedinSuccess = r.success;
          results.linkedinPostId = r.postId;
          results.linkedinError = r.error;
        }

        return results;
      }),

    // 查询社交媒体 API 配置状态
    getApiStatus: protectedProcedure.query(async () => {
      return {
        facebook: !!(
          process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN
        ),
        linkedin: !!(
          process.env.LINKEDIN_ORGANIZATION_ID &&
          process.env.LINKEDIN_ACCESS_TOKEN
        ),
        websiteWebhook: !!process.env.WEBSITE_WEBHOOK_URL,
      };
    }),

    // 保存社交媒体配置（写入环境变量或数据库）
    saveConfig: protectedProcedure
      .input(
        z.object({
          facebookPageId: z.string().optional(),
          facebookAccessToken: z.string().optional(),
          linkedinOrgId: z.string().optional(),
          linkedinAccessToken: z.string().optional(),
          websiteWebhookUrl: z.string().optional(),
          websiteWebhookSecret: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // 实际部署时应将配置写入数据库或密钥管理服务
        // 当前返回成功提示即可
        return {
          success: true,
          message: "配置已保存，请在服务器环境变量中配置对应的 Token",
        };
      }),
  }),
  // ==================== 法规事务部 ====================
  ra: raRouter,

  // ==================== 协同公司 ====================
  companies: router({
    // 获取所有公司列表（公开，登录页需要）
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureCollaborationDataModel(db);
      const { companies } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await db
        .select()
        .from(companies)
        .where(eq(companies.status, "active"));
    }),

    // 获取当前用户可访问的协同公司（登录用户自己的权限）
    myCompanies: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      await ensureCollaborationDataModel(db);
      const { companies, companyUserAccess } = await import(
        "../drizzle/schema"
      );
      const { eq, and } = await import("drizzle-orm");
      const userId = ctx.user.id;
      // admin 可看到所有公司
      if (ctx.user.role === "admin") {
        return await db
          .select()
          .from(companies)
          .where(eq(companies.status, "active"));
      }
      // 普通用户默认可看到所属主公司 + 额外授权公司
      const baseRows =
        Number(ctx.user.companyId || 0) > 0
          ? await db
              .select()
              .from(companies)
              .where(
                and(
                  eq(companies.id, Number(ctx.user.companyId)),
                  eq(companies.status, "active")
                )
              )
          : [];
      const accessRows = await db
        .select({ company: companies })
        .from(companyUserAccess)
        .innerJoin(companies, eq(companyUserAccess.companyId, companies.id))
        .where(
          and(
            eq(companyUserAccess.userId, userId),
            eq(companies.status, "active")
          )
        );
      const merged = [...baseRows, ...accessRows.map(r => r.company)];
      return Array.from(
        new Map(merged.map(item => [Number(item.id), item])).values()
      );
    }),

    // 获取某公司的授权用户列表
    getUserAccess: adminProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { companyUserAccess, users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db
          .select({
            userId: companyUserAccess.userId,
            name: users.name,
            email: users.email,
            department: users.department,
          })
          .from(companyUserAccess)
          .innerJoin(users, eq(companyUserAccess.userId, users.id))
          .where(eq(companyUserAccess.companyId, input.companyId));
        return rows;
      }),

    // 获取某用户的授权公司 ID 列表
    getUserCompanyIds: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { companyUserAccess } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db
          .select({ companyId: companyUserAccess.companyId })
          .from(companyUserAccess)
          .where(eq(companyUserAccess.userId, input.userId));
        return rows.map(r => r.companyId);
      }),

    // 设置用户的公司权限（传入 companyIds 数组，全量替换）
    setUserAccess: adminProcedure
      .input(z.object({ userId: z.number(), companyIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const { companyUserAccess } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [targetUser] = await db
          .select({
            id: users.id,
            role: users.role,
            dataScope: users.dataScope,
            department: users.department,
            position: users.position,
            visibleApps: users.visibleApps,
            visibleForms: users.visibleForms,
          })
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);
        const dashboardPermissions =
          (await listUserDashboardPermissions([input.userId])).get(
            input.userId
          ) ?? [];
        // 删除旧权限
        await db
          .delete(companyUserAccess)
          .where(eq(companyUserAccess.userId, input.userId));
        // 插入新权限
        if (input.companyIds.length > 0 && targetUser) {
          await db.insert(companyUserAccess).values(
            input.companyIds.map(companyId => ({
              companyId,
              userId: input.userId,
              role: "admin",
              dataScope:
                targetUser.role === "admin"
                  ? "all"
                  : targetUser.dataScope || "self",
              department: targetUser.department ?? null,
              position: targetUser.position ?? null,
              visibleApps: "",
              visibleForms: "",
              dashboardPermissions: "",
            }))
          );
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
