import {
  eq,
  ne,
  desc,
  like,
  and,
  or,
  sql,
  isNotNull,
  asc,
  inArray,
  gte,
  isNull,
  lte,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  int,
  mysqlEnum,
  mysqlTable,
  text as mysqlText,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  PRODUCT_CATEGORY_PREFIXES,
  PRODUCT_CATEGORY_VALUES,
  isProductionIssueExcludedCategory,
} from "@shared/productCategories";
import {
  DASHBOARD_PERMISSION_IDS,
  type DashboardPermissionId,
} from "@shared/dashboardBoards";
import {
  InsertUser,
  users,
  userDashboardPermissions,
  InsertUserDashboardPermission,
  products,
  InsertProduct,
  Product,
  customers,
  InsertCustomer,
  Customer,
  suppliers,
  InsertSupplier,
  Supplier,
  supplierProfileRecords,
  InsertSupplierProfileRecord,
  SupplierProfileRecord,
  salesOrders,
  InsertSalesOrder,
  SalesOrder,
  salesQuotes,
  InsertSalesQuote,
  SalesQuote,
  orderApprovals,
  salesOrderItems,
  InsertSalesOrderItem,
  SalesOrderItem,
  salesQuoteItems,
  InsertSalesQuoteItem,
  SalesQuoteItem,
  purchaseOrders,
  InsertPurchaseOrder,
  PurchaseOrder,
  purchaseOrderItems,
  InsertPurchaseOrderItem,
  PurchaseOrderItem,
  productionOrders,
  InsertProductionOrder,
  ProductionOrder,
  inventory,
  InsertInventory,
  Inventory,
  warehouses,
  InsertWarehouse,
  Warehouse,
  inventoryTransactions,
  InsertInventoryTransaction,
  InventoryTransaction,
  operationLogs,
  InsertOperationLog,
  OperationLog,
  qualityInspections,
  InsertQualityInspection,
  QualityInspection,
  bom,
  InsertBom,
  Bom,
  // 新增表
  bankAccounts,
  InsertBankAccount,
  BankAccount,
  exchangeRates,
  InsertExchangeRate,
  ExchangeRate,
  paymentTerms,
  InsertPaymentTerm,
  PaymentTerm,
  materialRequests,
  InsertMaterialRequest,
  MaterialRequest,
  materialRequestItems,
  InsertMaterialRequestItem,
  MaterialRequestItem,
  expenseReimbursements,
  InsertExpenseReimbursement,
  ExpenseReimbursement,
  paymentRecords,
  InsertPaymentRecord,
  PaymentRecord,
  customsDeclarations,
  InsertCustomsDeclaration,
  CustomsDeclaration,
  hsCodeLibrary,
  InsertHsCodeLibrary,
  HsCodeLibrary,
  departments,
  InsertDepartment,
  Department,
  codeRules,
  InsertCodeRule,
  CodeRule,
  companyInfo,
  InsertCompanyInfo,
  CompanyInfo,
  printTemplates,
  InsertPrintTemplate,
  PrintTemplate,
  workflowFormCatalog,
  InsertWorkflowFormCatalog,
  WorkflowFormCatalog,
  workflowTemplates,
  InsertWorkflowTemplate,
  WorkflowTemplate,
  workflowRuns,
  InsertWorkflowRun,
  WorkflowRun,
  workflowRunLogs,
  InsertWorkflowRunLog,
  WorkflowRunLog,
  personnel,
  InsertPersonnel,
  Personnel,
  personnelSalarySettings,
  InsertPersonnelSalarySetting,
  PersonnelSalarySetting,
  personnelPayrollRecords,
  InsertPersonnelPayrollRecord,
  PersonnelPayrollRecord,
  trainings,
  InsertTraining,
  Training,
  audits,
  InsertAudit,
  Audit,
  rdProjects,
  InsertRdProject,
  RdProject,
  stocktakes,
  InsertStocktake,
  Stocktake,
  qualityIncidents,
  InsertQualityIncident,
  QualityIncident,
  samples,
  InsertSample,
  Sample,
  labRecords,
  InsertLabRecord,
  LabRecord,
  accountsReceivable,
  InsertAccountsReceivable,
  AccountsReceivable,
  accountsPayable,
  InsertAccountsPayable,
  AccountsPayable,
  receivedInvoices,
  InsertReceivedInvoice,
  ReceivedInvoice,
  issuedInvoices,
  InsertIssuedInvoice,
  IssuedInvoice,
  dealerQualifications,
  InsertDealerQualification,
  DealerQualification,
  documents,
  InsertDocument,
  Document,
  equipment,
  InsertEquipment,
  Equipment,
  equipmentInspections,
  InsertEquipmentInspection,
  equipmentMaintenances,
  InsertEquipmentMaintenance,
  productionPlans,
  InsertProductionPlan,
  ProductionPlan,
  materialRequisitionOrders,
  InsertMaterialRequisitionOrder,
  MaterialRequisitionOrder,
  productionRecords,
  InsertProductionRecord,
  ProductionRecord,
  environmentRecords,
  InsertEnvironmentRecord,
  EnvironmentRecord,
  productionRoutingCards,
  InsertProductionRoutingCard,
  ProductionRoutingCard,
  productionScrapDisposals,
  InsertProductionScrapDisposal,
  ProductionScrapDisposal,
  sterilizationOrders,
  InsertSterilizationOrder,
  SterilizationOrder,
  productionWarehouseEntries,
  InsertProductionWarehouseEntry,
  ProductionWarehouseEntry,
  largePackagingRecords,
  InsertLargePackagingRecord,
  LargePackagingRecord,
  batchRecordReviewRecords,
  InsertBatchRecordReviewRecord,
  BatchRecordReviewRecord,
  regulatoryReleaseRecords,
  InsertRegulatoryReleaseRecord,
  RegulatoryReleaseRecord,
  overtimeRequests,
  InsertOvertimeRequest,
  OvertimeRequest,
  leaveRequests,
  InsertLeaveRequest,
  LeaveRequest,
  outingRequests,
  InsertOutingRequest,
  OutingRequest,
  productSupplierPrices,
  InsertProductSupplierPrice,
  ProductSupplierPrice,
  udiLabels,
  electronicSignatures,
  signatureAuditLog,
  goodsReceipts,
  goodsReceiptItems,
  inspectionRequirements,
  inspectionRequirementItems,
  iqcInspections,
  iqcInspectionItems,
  companies,
  companyUserAccess,
} from "../drizzle/schema";
import {
  isAccountPeriodPaymentCondition,
  normalizePaymentCondition,
} from "../shared/paymentTerms";
import { ENV } from "./_core/env";
import {
  formatCurrencyValue,
  formatDate,
  formatDisplayNumber,
  formatPercentValue,
  roundToDigits,
  toRoundedString,
} from "./_core/formatting";
import { DEFAULT_PRINT_TEMPLATE_ROWS } from "./printTemplateCatalog";

let _db: ReturnType<typeof drizzle> | null = null;
let usersVisibleAppsColumnReady = false;
let usersVisibleFormsColumnReady = false;
let usersAvatarUrlColumnReady = false;
let usersWechatColumnsReady = false;
let usersEnglishNameColumnReady = false;
let usersDataScopeColumnReady = false;
let usersEmailSignatureColumnReady = false;
let userDashboardPermissionsTableReady = false;
let salesOrdersTradeFieldsReady = false;
let salesQuotesTablesReady = false;
let workflowFormCatalogTableReady = false;
let workflowTemplatesTableReady = false;
let workflowRuntimeTablesReady = false;
let companyInfoTableReady = false;
let printTemplatesTableReady = false;
let hsCodeLibraryTableReady = false;
let bankAccountsAddressColumnReady = false;
let productsSterilizedColumnReady = false;
let bomBaseOutputColumnsReady = false;
let inventoryTransactionColumnsReady = false;
let sterilizationOrderColumnsReady = false;
let productionPlansStatusEnumReady = false;
let productionWarehouseEntryColumnsReady = false;
let qualityInspectionColumnsReady = false;
let environmentRecordsTableReady = false;
let productionRecordColumnsReady = false;
let productionScrapDisposalsTableReady = false;
let productionPlansSupplierColumnsReady = false;
let purchaseOrdersSupplierNameColumnReady = false;
let purchaseOrdersStatusEnumReady = false;
let accountsPayableSupplierNameColumnReady = false;
let receivedInvoicesTableReady = false;
let issuedInvoicesTableReady = false;
let collaborationDataModelReady = false;
let collaborationDataModelPromise: Promise<void> | null = null;
let equipmentExtendedColumnsReady = false;
let equipmentInspectionTablesReady = false;
let equipmentMaintenanceTablesReady = false;
let suppliersCreditDaysColumnReady = false;
let supplierProfileRecordsTableReady = false;
let customersTaxRateColumnReady = false;
let personnelExtendedColumnsReady = false;
let personnelSalaryTablesReady = false;
let rdProjectsExtendedColumnsReady = false;
let labRecordsExtendedColumnsReady = false;
let trainingNoColumnReady = false;
let udiLabelsTableReady = false;
let largePackagingRecordsTableReady = false;
let batchRecordReviewRecordsTableReady = false;
let regulatoryReleaseRecordsTableReady = false;

const DEFAULT_ENTITY_LIST_LIMIT = 5000;
const MAIN_COMPANY_FALLBACK_ID = 3;
const COLLABORATIVE_COMPANY_IDS = [1, 2];

function resolveEntityListLimit(limit?: number) {
  const parsed = Number(limit || 0);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(parsed, DEFAULT_ENTITY_LIST_LIMIT);
  }
  return DEFAULT_ENTITY_LIST_LIMIT;
}

const WORKFLOW_FORM_CATALOG_SEED: InsertWorkflowFormCatalog[] = [
  {
    module: "管理部",
    formType: "管理表单",
    formName: "文件管理",
    path: "/admin/documents",
    sortOrder: 11,
    status: "active",
  },
  {
    module: "管理部",
    formType: "管理表单",
    formName: "人事管理",
    path: "/admin/personnel",
    sortOrder: 12,
    status: "active",
  },
  {
    module: "管理部",
    formType: "管理表单",
    formName: "培训管理",
    path: "/admin/training",
    sortOrder: 13,
    status: "active",
  },
  {
    module: "管理部",
    formType: "管理表单",
    formName: "内审管理",
    path: "/admin/audit",
    sortOrder: 14,
    status: "active",
  },
  {
    module: "管理部",
    formType: "申请单",
    formName: "费用报销",
    path: "/admin/expense",
    sortOrder: 15,
    status: "active",
  },
  {
    module: "管理部",
    formType: "申请单",
    formName: "加班申请",
    path: "/admin/overtime",
    sortOrder: 16,
    status: "active",
  },
  {
    module: "管理部",
    formType: "申请单",
    formName: "请假申请",
    path: "/admin/leave",
    sortOrder: 17,
    status: "active",
  },
  {
    module: "管理部",
    formType: "申请单",
    formName: "外出申请",
    path: "/admin/outing",
    sortOrder: 18,
    status: "active",
  },

  {
    module: "招商部",
    formType: "业务表单",
    formName: "首营管理",
    path: "/investment/dealer",
    sortOrder: 21,
    status: "active",
  },
  {
    module: "招商部",
    formType: "业务表单",
    formName: "平台管理",
    path: "/investment/platform",
    sortOrder: 22,
    status: "active",
  },
  {
    module: "招商部",
    formType: "业务表单",
    formName: "挂网管理",
    path: "/investment/listing",
    sortOrder: 23,
    status: "active",
  },
  {
    module: "招商部",
    formType: "业务表单",
    formName: "入院管理",
    path: "/investment/hospital",
    sortOrder: 24,
    status: "active",
  },

  {
    module: "销售部",
    formType: "主数据",
    formName: "客户管理",
    path: "/sales/customers",
    sortOrder: 31,
    status: "active",
  },
  {
    module: "销售部",
    formType: "业务单据",
    formName: "报价单",
    path: "/sales/quotes",
    sortOrder: 32,
    status: "active",
  },
  {
    module: "销售部",
    formType: "业务单据",
    formName: "订单管理",
    path: "/sales/orders",
    sortOrder: 33,
    status: "active",
  },
  {
    module: "销售部",
    formType: "业务单据",
    formName: "报关管理",
    path: "/sales/customs",
    sortOrder: 34,
    status: "active",
  },
  {
    module: "销售部",
    formType: "主数据",
    formName: "HS编码库",
    path: "/sales/hs-codes",
    sortOrder: 35,
    status: "active",
  },
  {
    module: "销售部",
    formType: "协同流程",
    formName: "财务协同",
    path: "/sales/finance-collaboration",
    sortOrder: 36,
    status: "active",
    approvalEnabled: true,
  },
  {
    module: "销售部",
    formType: "协同流程",
    formName: "对账管理",
    path: "/sales/reconciliation",
    sortOrder: 37,
    status: "active",
  },

  {
    module: "研发部",
    formType: "主数据",
    formName: "产品管理",
    path: "/rd/products",
    sortOrder: 41,
    status: "active",
  },
  {
    module: "研发部",
    formType: "项目流程",
    formName: "项目管理",
    path: "/rd/projects",
    sortOrder: 42,
    status: "active",
  },

  {
    module: "生产部",
    formType: "生产单据",
    formName: "生产指令",
    path: "/production/orders",
    sortOrder: 51,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产流程",
    formName: "生产计划看板",
    path: "/production/plan-board",
    sortOrder: 52,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产流程",
    formName: "领料单",
    path: "/production/material-requisition",
    sortOrder: 53,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "生产记录单",
    path: "/production/records",
    sortOrder: 54,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "生产流转单",
    path: "/production/routing-cards",
    sortOrder: 55,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "待报废记录",
    path: "/production/pending-scrap-records",
    sortOrder: 56,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产单据",
    formName: "委外灭菌单",
    path: "/production/sterilization",
    sortOrder: 56,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产单据",
    formName: "生产入库申请",
    path: "/production/warehouse-entry",
    sortOrder: 57,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "BOM物料清单",
    path: "/production/bom",
    sortOrder: 58,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "MRP物料计划",
    path: "/production/mrp",
    sortOrder: 59,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "UDI标签管理",
    path: "/production/udi",
    sortOrder: 60,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "大包装记录",
    path: "/production/large-packaging",
    sortOrder: 60,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "设备管理",
    path: "/production/equipment",
    sortOrder: 61,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "设备点检",
    path: "/production/equipment-inspection",
    sortOrder: 62,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "设备保养",
    path: "/production/equipment-maintenance",
    sortOrder: 63,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "清洗记录",
    path: "/production/cleaning-records",
    sortOrder: 64,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "消毒记录",
    path: "/production/disinfection-records",
    sortOrder: 65,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "生产环境管理",
    path: "/production/environment",
    sortOrder: 66,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产基础",
    formName: "生产工序管理",
    path: "/production/process",
    sortOrder: 67,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "批记录管理",
    path: "/production/batch-records",
    sortOrder: 68,
    status: "active",
  },
  {
    module: "生产部",
    formType: "生产记录",
    formName: "批记录审核记录",
    path: "/production/batch-review-records",
    sortOrder: 69,
    status: "active",
  },

  {
    module: "质量部",
    formType: "检验记录",
    formName: "实验室管理",
    path: "/quality/lab",
    sortOrder: 71,
    status: "active",
  },
  {
    module: "质量部",
    formType: "检验记录",
    formName: "来料检验",
    path: "/quality/iqc",
    sortOrder: 72,
    status: "active",
  },
  {
    module: "质量部",
    formType: "检验记录",
    formName: "过程检验",
    path: "/quality/ipqc",
    sortOrder: 73,
    status: "active",
  },
  {
    module: "质量部",
    formType: "检验记录",
    formName: "成品检验",
    path: "/quality/oqc",
    sortOrder: 74,
    status: "active",
  },
  {
    module: "质量部",
    formType: "质量记录",
    formName: "留样管理",
    path: "/quality/samples",
    sortOrder: 75,
    status: "active",
  },
  {
    module: "质量部",
    formType: "质量流程",
    formName: "不良事件",
    path: "/quality/incidents",
    sortOrder: 76,
    status: "active",
  },
  {
    module: "质量部",
    formType: "质量流程",
    formName: "检验要求",
    path: "/quality/inspection-requirements",
    sortOrder: 77,
    status: "active",
  },

  {
    module: "采购部",
    formType: "业务单据",
    formName: "采购计划看板",
    path: "/purchase/plan",
    sortOrder: 81,
    status: "active",
  },
  {
    module: "采购部",
    formType: "主数据",
    formName: "供应商管理",
    path: "/purchase/suppliers",
    sortOrder: 82,
    status: "active",
  },
  {
    module: "采购部",
    formType: "业务单据",
    formName: "采购订单",
    path: "/purchase/orders",
    sortOrder: 83,
    status: "active",
  },
  {
    module: "采购部",
    formType: "业务单据",
    formName: "采购申请",
    path: "/purchase/requests",
    sortOrder: 84,
    status: "active",
  },
  {
    module: "采购部",
    formType: "业务单据",
    formName: "到货管理",
    path: "/purchase/goods-receipt",
    sortOrder: 85,
    status: "active",
  },
  {
    module: "采购部",
    formType: "协同流程",
    formName: "财务协同",
    path: "/purchase/finance",
    sortOrder: 86,
    status: "active",
  },

  {
    module: "仓库管理",
    formType: "仓储单据",
    formName: "仓库管理",
    path: "/warehouse/warehouses",
    sortOrder: 91,
    status: "active",
  },
  {
    module: "仓库管理",
    formType: "仓储单据",
    formName: "入库管理",
    path: "/warehouse/inbound",
    sortOrder: 92,
    status: "active",
  },
  {
    module: "仓库管理",
    formType: "仓储单据",
    formName: "出库管理",
    path: "/warehouse/outbound",
    sortOrder: 93,
    status: "active",
  },
  {
    module: "仓库管理",
    formType: "仓储台账",
    formName: "库存台账",
    path: "/warehouse/inventory",
    sortOrder: 94,
    status: "active",
  },
  {
    module: "仓库管理",
    formType: "仓储盘点",
    formName: "盘点管理",
    path: "/warehouse/stocktake",
    sortOrder: 95,
    status: "active",
  },

  {
    module: "财务部",
    formType: "财务单据",
    formName: "总账管理",
    path: "/finance/ledger",
    sortOrder: 101,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务单据",
    formName: "应收管理",
    path: "/finance/receivable",
    sortOrder: 102,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务单据",
    formName: "应付管理",
    path: "/finance/payable",
    sortOrder: 103,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务基础",
    formName: "账户管理",
    path: "/finance/accounts",
    sortOrder: 104,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务分析",
    formName: "成本核算",
    path: "/finance/cost",
    sortOrder: 105,
    status: "active",
  },
  {
    module: "财务部",
    formType: "人事薪酬",
    formName: "人员工资",
    path: "/finance/salaries",
    sortOrder: 106,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务分析",
    formName: "报表中心",
    path: "/finance/reports",
    sortOrder: 107,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务基础",
    formName: "印章管理",
    path: "/finance/seals",
    sortOrder: 108,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务单据",
    formName: "发票管理",
    path: "/finance/invoice",
    sortOrder: 109,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务单据",
    formName: "报销管理",
    path: "/finance/reimbursement",
    sortOrder: 110,
    status: "active",
  },
  {
    module: "财务部",
    formType: "财务单据",
    formName: "费用管理",
    path: "/finance/expense-management",
    sortOrder: 111,
    status: "active",
  },
  {
    module: "法规事务部",
    formType: "法规记录",
    formName: "法规放行记录",
    path: "/ra/regulatory-release-records",
    sortOrder: 121,
    status: "active",
  },

  {
    module: "系统设置",
    formType: "系统配置",
    formName: "公司信息",
    path: "/settings/company",
    sortOrder: 111,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "部门设置",
    path: "/settings/departments",
    sortOrder: 112,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "编码设置",
    path: "/settings/codes",
    sortOrder: 113,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "用户设置",
    path: "/settings/users",
    sortOrder: 114,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "审批流程设置",
    path: "/settings/workflows",
    sortOrder: 115,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "语言设置",
    path: "/settings/language",
    sortOrder: 116,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "操作日志",
    path: "/settings/logs",
    sortOrder: 117,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "回收箱",
    path: "/settings/recycle-bin",
    sortOrder: 118,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "邮件通知设置",
    path: "/settings/email",
    sortOrder: 119,
    status: "active",
  },
  {
    module: "系统设置",
    formType: "系统配置",
    formName: "打印模板管理",
    path: "/settings/print-templates",
    sortOrder: 120,
    status: "active",
  },
];

const WORKFLOW_FORM_CATALOG_LEGACY_MIGRATIONS = [
  {
    current: { module: "通用", formType: "申请单", formName: "报销单" },
    next: {
      module: "管理部",
      formType: "申请单",
      formName: "费用报销",
      path: "/admin/expense",
    },
  },
  {
    current: { module: "通用", formType: "申请单", formName: "加班申请" },
    next: {
      module: "管理部",
      formType: "申请单",
      formName: "加班申请",
      path: "/admin/overtime",
    },
  },
  {
    current: { module: "通用", formType: "申请单", formName: "请假单" },
    next: {
      module: "管理部",
      formType: "申请单",
      formName: "请假申请",
      path: "/admin/leave",
    },
  },
  {
    current: { module: "通用", formType: "申请单", formName: "外出申请单" },
    next: {
      module: "管理部",
      formType: "申请单",
      formName: "外出申请",
      path: "/admin/outing",
    },
  },
  {
    current: { module: "采购部", formType: "业务单据", formName: "采购到货" },
    next: {
      module: "采购部",
      formType: "业务单据",
      formName: "到货管理",
      path: "/purchase/goods-receipt",
    },
  },
];

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function ensureUsersVisibleAppsColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || usersVisibleAppsColumnReady) return;

  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN visibleApps TEXT NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|visibleApps/i.test(message)
    ) {
      throw error;
    }
  }

  usersVisibleAppsColumnReady = true;
}

export async function ensureUsersVisibleFormsColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || usersVisibleFormsColumnReady) return;

  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN visibleForms TEXT NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|visibleForms/i.test(message)
    ) {
      throw error;
    }
  }

  usersVisibleFormsColumnReady = true;
}

export async function ensureUsersAvatarUrlColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || usersAvatarUrlColumnReady) return;
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN avatarUrl TEXT NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|avatarUrl/i.test(message)) {
      throw error;
    }
  }
  usersAvatarUrlColumnReady = true;
}

export async function ensureUsersWechatColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || usersWechatColumnsReady) return;
  const columns = [
    { name: "wxAccount", def: "VARCHAR(64) NULL" },
    { name: "wxOpenid", def: "VARCHAR(64) NULL" },
    { name: "wxNickname", def: "VARCHAR(100) NULL" },
  ];
  for (const col of columns) {
    try {
      await db.execute(
        sql.raw(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`)
      );
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(message)) {
        // 忽略列已存在的错误，其他错误不抛出（避免影响启动）
        console.warn(`[ensureUsersWechatColumns] ${col.name}:`, message);
      }
    }
  }
  usersWechatColumnsReady = true;
}

export async function ensureUsersEnglishNameColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || usersEnglishNameColumnReady) return;
  try {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN englishName VARCHAR(100) NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|englishName/i.test(message)
    ) {
      throw error;
    }
  }
  usersEnglishNameColumnReady = true;
}

export async function ensureUsersDataScopeColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || usersDataScopeColumnReady) return;
  try {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN dataScope ENUM('self','department','all') NOT NULL DEFAULT 'self'`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|dataScope/i.test(message)) {
      throw error;
    }
  }
  usersDataScopeColumnReady = true;
}

export async function ensureUsersEmailSignatureColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || usersEmailSignatureColumnReady) return;
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN emailSignature TEXT NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|emailSignature/i.test(message)
    ) {
      throw error;
    }
  }
  usersEmailSignatureColumnReady = true;
}

export async function ensureUsersExtendedColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return;
  await ensureUsersVisibleAppsColumn(db);
  await ensureUsersVisibleFormsColumn(db);
  await ensureUsersAvatarUrlColumn(db);
  await ensureUsersWechatColumns(db);
  await ensureUsersEnglishNameColumn(db);
  await ensureUsersDataScopeColumn(db);
  await ensureUsersEmailSignatureColumn(db);
}

export async function ensureUserDashboardPermissionsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || userDashboardPermissionsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_dashboard_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      dashboardId VARCHAR(64) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_dashboard_permissions_userId_dashboardId (userId, dashboardId),
      KEY idx_user_dashboard_permissions_userId (userId),
      KEY idx_user_dashboard_permissions_dashboardId (dashboardId)
    )
  `);
  userDashboardPermissionsTableReady = true;
}

export async function ensureSalesOrdersTradeFields(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || salesOrdersTradeFieldsReady) return;
  const columns = [
    { name: "tradeTerm", def: "VARCHAR(20) NULL" },
    { name: "receiptAccountId", def: "INT NULL" },
  ];
  try {
    const existingColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM sales_orders")
    );
    const existingColumnNames = new Set(
      Array.from(existingColumnsResult as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );

    for (const col of columns) {
      if (existingColumnNames.has(col.name)) continue;
      try {
        await db.execute(
          sql.raw(`ALTER TABLE sales_orders ADD COLUMN ${col.name} ${col.def}`)
        );
      } catch (error) {
        const message = String((error as any)?.message ?? "");
        if (!/Duplicate column name|already exists|1060/i.test(message)) {
          console.warn(`[ensureSalesOrdersTradeFields] ${col.name}:`, message);
        }
      }
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    console.warn(
      "[ensureSalesOrdersTradeFields] failed to inspect columns:",
      message
    );
  }
  salesOrdersTradeFieldsReady = true;
}

async function ensureSalesQuotesTables(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || salesQuotesTablesReady) return;

  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS sales_quotes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companyId INT NOT NULL DEFAULT 3,
      quoteNo VARCHAR(50) NOT NULL UNIQUE,
      customerId INT NOT NULL,
      quoteDate DATE NOT NULL,
      validUntil DATE NULL,
      deliveryDate DATE NULL,
      totalAmount DECIMAL(14,2) NULL,
      currency VARCHAR(10) NULL DEFAULT 'CNY',
      paymentMethod VARCHAR(50) NULL,
      totalAmountBase DECIMAL(14,2) NULL,
      exchangeRate DECIMAL(10,6) NULL DEFAULT 1,
      status ENUM('draft','sent','accepted','rejected','expired','converted') NOT NULL DEFAULT 'draft',
      shippingAddress TEXT NULL,
      shippingContact VARCHAR(50) NULL,
      shippingPhone VARCHAR(50) NULL,
      tradeTerm VARCHAR(20) NULL,
      receiptAccountId INT NULL,
      linkedOrderId INT NULL,
      remark TEXT NULL,
      salesPersonId INT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  );

  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS sales_quote_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      quoteId INT NOT NULL,
      productId INT NOT NULL,
      quantity DECIMAL(12,4) NOT NULL,
      unit VARCHAR(20) NULL,
      unitPrice DECIMAL(12,4) NULL,
      amount DECIMAL(14,2) NULL,
      remark TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sales_quote_items_quote_id (quoteId),
      INDEX idx_sales_quote_items_product_id (productId)
    )
  `)
  );

  try {
    const quoteColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM sales_quotes")
    );
    const quoteColumnRows = Array.isArray((quoteColumnsResult as any)?.[0])
      ? (quoteColumnsResult as any)[0]
      : (quoteColumnsResult as any);
    const quoteColumns = new Set(
      Array.from(quoteColumnRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );
    const missingQuoteColumns = [
      { name: "companyId", def: "INT NOT NULL DEFAULT 3 AFTER id" },
      { name: "validUntil", def: "DATE NULL AFTER quoteDate" },
      { name: "deliveryDate", def: "DATE NULL AFTER validUntil" },
      { name: "totalAmount", def: "DECIMAL(14,2) NULL AFTER deliveryDate" },
      {
        name: "currency",
        def: "VARCHAR(10) NULL DEFAULT 'CNY' AFTER totalAmount",
      },
      { name: "paymentMethod", def: "VARCHAR(50) NULL AFTER currency" },
      {
        name: "totalAmountBase",
        def: "DECIMAL(14,2) NULL AFTER paymentMethod",
      },
      {
        name: "exchangeRate",
        def: "DECIMAL(10,6) NULL DEFAULT 1 AFTER totalAmountBase",
      },
      { name: "shippingAddress", def: "TEXT NULL AFTER status" },
      {
        name: "shippingContact",
        def: "VARCHAR(50) NULL AFTER shippingAddress",
      },
      { name: "shippingPhone", def: "VARCHAR(50) NULL AFTER shippingContact" },
      { name: "tradeTerm", def: "VARCHAR(20) NULL AFTER shippingPhone" },
      { name: "receiptAccountId", def: "INT NULL AFTER tradeTerm" },
      { name: "linkedOrderId", def: "INT NULL AFTER receiptAccountId" },
      { name: "remark", def: "TEXT NULL AFTER linkedOrderId" },
      { name: "salesPersonId", def: "INT NULL AFTER remark" },
      { name: "createdBy", def: "INT NULL AFTER salesPersonId" },
    ];
    for (const column of missingQuoteColumns) {
      if (quoteColumns.has(column.name)) continue;
      try {
        await db.execute(
          sql.raw(
            `ALTER TABLE sales_quotes ADD COLUMN ${column.name} ${column.def}`
          )
        );
      } catch (error) {
        const message = String((error as any)?.message ?? "");
        if (!/Duplicate column name|already exists|1060/i.test(message)) {
          console.warn(
            `[ensureSalesQuotesTables] sales_quotes.${column.name}:`,
            message
          );
        }
      }
    }

    const quoteItemColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM sales_quote_items")
    );
    const quoteItemColumnRows = Array.isArray(
      (quoteItemColumnsResult as any)?.[0]
    )
      ? (quoteItemColumnsResult as any)[0]
      : (quoteItemColumnsResult as any);
    const quoteItemColumns = new Set(
      Array.from(quoteItemColumnRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );
    const missingQuoteItemColumns = [
      { name: "unit", def: "VARCHAR(20) NULL AFTER quantity" },
      { name: "unitPrice", def: "DECIMAL(12,4) NULL AFTER unit" },
      { name: "amount", def: "DECIMAL(14,2) NULL AFTER unitPrice" },
      { name: "remark", def: "TEXT NULL AFTER amount" },
    ];
    for (const column of missingQuoteItemColumns) {
      if (quoteItemColumns.has(column.name)) continue;
      try {
        await db.execute(
          sql.raw(
            `ALTER TABLE sales_quote_items ADD COLUMN ${column.name} ${column.def}`
          )
        );
      } catch (error) {
        const message = String((error as any)?.message ?? "");
        if (!/Duplicate column name|already exists|1060/i.test(message)) {
          console.warn(
            `[ensureSalesQuotesTables] sales_quote_items.${column.name}:`,
            message
          );
        }
      }
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    console.warn(
      "[ensureSalesQuotesTables] failed to inspect columns:",
      message
    );
  }

  salesQuotesTablesReady = true;
}

async function ensureWorkflowTemplatesTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || workflowTemplatesTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workflow_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      module VARCHAR(64) NOT NULL,
      formType VARCHAR(100) NOT NULL,
      flowMode ENUM('approval', 'notice') NOT NULL DEFAULT 'approval',
      initiators TEXT NULL,
      approvalSteps TEXT NULL,
      handlers TEXT NULL,
      ccRecipients TEXT NULL,
      description TEXT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      createdBy INT NULL,
      updatedBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute(
      sql`ALTER TABLE workflow_templates ADD COLUMN flowMode ENUM('approval', 'notice') NOT NULL DEFAULT 'approval' AFTER formType`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|flowMode/i.test(message)) {
      throw error;
    }
  }

  workflowTemplatesTableReady = true;
}

async function ensureWorkflowRuntimeTables(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || workflowRuntimeTablesReady) return;

  await ensureWorkflowTemplatesTable(db);
  await ensureWorkflowFormCatalogTable(db);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      templateId INT NULL,
      module VARCHAR(64) NOT NULL,
      formType VARCHAR(100) NOT NULL,
      formName VARCHAR(100) NOT NULL,
      flowMode ENUM('approval', 'notice') NOT NULL DEFAULT 'approval',
      sourceTable VARCHAR(64) NOT NULL,
      sourceId INT NOT NULL,
      sourceNo VARCHAR(100) NULL,
      title VARCHAR(200) NULL,
      routePath VARCHAR(255) NULL,
      targetName VARCHAR(200) NULL,
      applicantId INT NULL,
      applicantName VARCHAR(100) NULL,
      status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
      currentStepIndex INT NOT NULL DEFAULT 0,
      totalSteps INT NOT NULL DEFAULT 0,
      currentApproverId INT NULL,
      currentApproverName VARCHAR(100) NULL,
      initiators TEXT NULL,
      approvalSteps TEXT NULL,
      handlers TEXT NULL,
      ccRecipients TEXT NULL,
      submittedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_workflow_runs_source (sourceTable, sourceId),
      KEY idx_workflow_runs_status (status, currentApproverId),
      KEY idx_workflow_runs_applicant (applicantId)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workflow_run_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      runId INT NOT NULL,
      action ENUM('submit', 'approve', 'reject', 'cancel', 'complete') NOT NULL,
      stepIndex INT NOT NULL DEFAULT 0,
      actorId INT NULL,
      actorName VARCHAR(100) NULL,
      comment TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_workflow_run_logs_run (runId),
      KEY idx_workflow_run_logs_actor (actorId)
    )
  `);

  workflowRuntimeTablesReady = true;
}

async function ensureWorkflowFormCatalogTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || workflowFormCatalogTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workflow_form_catalog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      module VARCHAR(64) NOT NULL,
      formType VARCHAR(100) NOT NULL,
      formName VARCHAR(100) NOT NULL,
      path VARCHAR(200) NULL,
      sortOrder INT NOT NULL DEFAULT 0,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      approvalEnabled TINYINT(1) NOT NULL DEFAULT 0,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute(
      sql`ALTER TABLE workflow_form_catalog ADD COLUMN approvalEnabled TINYINT(1) NOT NULL DEFAULT 0`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|approvalEnabled/i.test(
        message
      )
    ) {
      throw error;
    }
  }

  for (const migration of WORKFLOW_FORM_CATALOG_LEGACY_MIGRATIONS) {
    const legacyRows = await db
      .select()
      .from(workflowFormCatalog)
      .where(
        and(
          eq(workflowFormCatalog.module, migration.current.module),
          eq(workflowFormCatalog.formType, migration.current.formType),
          eq(workflowFormCatalog.formName, migration.current.formName)
        )
      )
      .limit(1);

    if (legacyRows[0]) {
      await db
        .update(workflowFormCatalog)
        .set({
          module: migration.next.module,
          formType: migration.next.formType,
          formName: migration.next.formName,
          path: migration.next.path,
        })
        .where(eq(workflowFormCatalog.id, legacyRows[0].id));
    }
  }

  const existingRows = await db.select().from(workflowFormCatalog);
  const existingByKey = new Map(
    existingRows.map(
      row => [`${row.module}__${row.formType}__${row.formName}`, row] as const
    )
  );
  const existingByPath = new Map(
    existingRows
      .filter(row => row.path)
      .map(row => [String(row.path), row] as const)
  );

  for (const seed of WORKFLOW_FORM_CATALOG_SEED) {
    const key = `${seed.module}__${seed.formType}__${seed.formName}`;
    const current =
      existingByKey.get(key) ||
      (seed.path ? existingByPath.get(seed.path) : undefined);

    if (current) {
      const nextPath = seed.path ?? current.path ?? null;
      const nextSortOrder = seed.sortOrder ?? current.sortOrder ?? 0;
      const nextStatus = seed.status ?? current.status ?? "active";
      const nextApprovalEnabled =
        typeof seed.approvalEnabled === "boolean"
          ? seed.approvalEnabled
          : current.approvalEnabled;

      const shouldUpdate =
        current.module !== seed.module ||
        current.formType !== seed.formType ||
        current.formName !== seed.formName ||
        current.path !== nextPath ||
        Number(current.sortOrder || 0) !== Number(nextSortOrder || 0) ||
        current.status !== nextStatus ||
        Boolean(current.approvalEnabled) !== Boolean(nextApprovalEnabled);

      if (shouldUpdate) {
        await db
          .update(workflowFormCatalog)
          .set({
            module: seed.module,
            formType: seed.formType,
            formName: seed.formName,
            path: nextPath,
            sortOrder: nextSortOrder,
            status: nextStatus,
            approvalEnabled: nextApprovalEnabled,
          })
          .where(eq(workflowFormCatalog.id, current.id));
      }
      continue;
    }

    await db.insert(workflowFormCatalog).values(seed);
  }

  workflowFormCatalogTableReady = true;
}

async function ensureCompanyInfoTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || companyInfoTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companyId INT NULL,
      logoUrl VARCHAR(500) NULL,
      companyNameCn VARCHAR(200) NULL,
      companyNameEn VARCHAR(200) NULL,
      addressCn TEXT NULL,
      addressEn TEXT NULL,
      website VARCHAR(200) NULL,
      email VARCHAR(120) NULL,
      contactNameCn VARCHAR(100) NULL,
      contactNameEn VARCHAR(100) NULL,
      phone VARCHAR(50) NULL,
      whatsapp VARCHAR(50) NULL,
      languageSettings TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute(
      sql`ALTER TABLE company_info ADD COLUMN languageSettings TEXT NULL AFTER whatsapp`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|languageSettings/i.test(
        message
      )
    ) {
      throw error;
    }
  }

  try {
    await db.execute(
      sql`ALTER TABLE company_info ADD COLUMN companyId INT NULL AFTER id`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|companyId/i.test(message)) {
      throw error;
    }
  }

  companyInfoTableReady = true;
}

async function ensurePrintTemplatesTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || printTemplatesTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS print_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      templateId VARCHAR(100) NOT NULL UNIQUE,
      module VARCHAR(50) NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      editorType VARCHAR(50) NULL,
      editorConfig TEXT NULL,
      css TEXT NOT NULL,
      html TEXT NOT NULL,
      updatedBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.execute(
      sql`ALTER TABLE print_templates ADD COLUMN editorType VARCHAR(50) NULL AFTER description`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|editorType/i.test(message)
    ) {
      throw error;
    }
  }

  try {
    await db.execute(
      sql`ALTER TABLE print_templates ADD COLUMN editorConfig TEXT NULL AFTER editorType`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|editorConfig/i.test(message)
    ) {
      throw error;
    }
  }

  printTemplatesTableReady = true;
}

async function ensureDefaultPrintTemplates(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg || _db;
  if (!db) return;
  await ensurePrintTemplatesTable(db);

  const existing = await db
    .select({ templateId: printTemplates.templateId })
    .from(printTemplates);
  const existingIds = new Set(
    existing.map(item => String(item.templateId || ""))
  );
  const missingRows = DEFAULT_PRINT_TEMPLATE_ROWS.filter(
    item => !existingIds.has(item.templateId)
  );

  for (const row of missingRows) {
    await db.insert(printTemplates).values(row);
  }
}

async function ensureHsCodeLibraryTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || hsCodeLibraryTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hs_code_library (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      category VARCHAR(50) NULL,
      productName VARCHAR(200) NULL,
      productId INT NULL,
      productAlias VARCHAR(200) NULL,
      declarationElements TEXT NULL,
      unit VARCHAR(20) NULL,
      remark TEXT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const columnDefs = [
    { name: "category", ddl: "VARCHAR(50) NULL AFTER code" },
    { name: "productName", ddl: "VARCHAR(200) NULL AFTER category" },
    { name: "productId", ddl: "INT NULL AFTER productName" },
    { name: "productAlias", ddl: "VARCHAR(200) NULL AFTER productId" },
    { name: "declarationElements", ddl: "TEXT NULL AFTER productAlias" },
    { name: "unit", ddl: "VARCHAR(20) NULL AFTER declarationElements" },
    { name: "remark", ddl: "TEXT NULL AFTER unit" },
    {
      name: "status",
      ddl: "ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER remark",
    },
    { name: "createdBy", ddl: "INT NULL AFTER status" },
    {
      name: "createdAt",
      ddl: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER createdBy",
    },
    {
      name: "updatedAt",
      ddl: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt",
    },
  ] as const;

  for (const column of columnDefs) {
    try {
      await db.execute(
        sql.raw(
          `ALTER TABLE hs_code_library ADD COLUMN ${column.name} ${column.ddl}`
        )
      );
    } catch (error) {
      const message = [
        String((error as any)?.message ?? ""),
        String((error as any)?.cause?.message ?? ""),
        String((error as any)?.cause?.sqlMessage ?? ""),
      ].join(" ");
      if (!/Duplicate column name|already exists|1060/i.test(message)) {
        throw error;
      }
    }
  }

  hsCodeLibraryTableReady = true;
}

async function ensureReceivedInvoicesTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || receivedInvoicesTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS received_invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companyId INT NOT NULL DEFAULT 3,
      invoiceNo VARCHAR(50) NOT NULL,
      invoiceCode VARCHAR(50) NULL,
      invoiceType ENUM('vat_special','vat_normal','electronic','receipt') NOT NULL DEFAULT 'vat_special',
      supplierId INT NULL,
      supplierName VARCHAR(200) NOT NULL,
      payableIds TEXT NULL,
      relatedOrderNo VARCHAR(500) NULL,
      invoiceDate DATE NULL,
      receiveDate DATE NULL,
      amountExTax DECIMAL(14,2) NOT NULL,
      taxRate DECIMAL(5,2) NOT NULL DEFAULT 13.00,
      taxAmount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      totalAmount DECIMAL(14,2) NOT NULL,
      verifyCode VARCHAR(100) NULL,
      status ENUM('pending','received','verified','booked','cancelled') NOT NULL DEFAULT 'received',
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  receivedInvoicesTableReady = true;
}

async function ensureIssuedInvoicesTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || issuedInvoicesTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS issued_invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companyId INT NOT NULL DEFAULT 3,
      invoiceNo VARCHAR(50) NULL,
      invoiceType ENUM('vat_special','vat_normal','electronic','receipt') NOT NULL DEFAULT 'vat_special',
      customerId INT NULL,
      customerName VARCHAR(200) NOT NULL,
      receivableIds TEXT NULL,
      relatedOrderNo VARCHAR(500) NULL,
      reconcileMonth VARCHAR(20) NULL,
      invoiceDate DATE NULL,
      amountExTax DECIMAL(14,2) NOT NULL,
      taxRate DECIMAL(5,2) NOT NULL DEFAULT 13.00,
      taxAmount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      totalAmount DECIMAL(14,2) NOT NULL,
      bankAccountId INT NULL,
      bankAccount VARCHAR(500) NULL,
      status ENUM('draft','pending_approval','issued','cancelled','red_issued') NOT NULL DEFAULT 'draft',
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  issuedInvoicesTableReady = true;
}

function buildInternalSupplierCode(
  ownerCompanyId: number,
  linkedCompanyId: number
) {
  return `ICS-${ownerCompanyId}-${linkedCompanyId}`;
}

function buildInternalCustomerCode(
  ownerCompanyId: number,
  linkedCompanyId: number
) {
  return `ICC-${ownerCompanyId}-${linkedCompanyId}`;
}

function buildVirtualWarehouseCode(companyId: number) {
  return `VWH-${companyId}`;
}

export async function getMainCompanyId(
  dbArg?: ReturnType<typeof drizzle> | null
): Promise<number> {
  const db = dbArg ?? (await getDb());
  if (!db) return MAIN_COMPANY_FALLBACK_ID;
  try {
    const [row] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        or(
          eq(companies.id, MAIN_COMPANY_FALLBACK_ID),
          like(companies.name, `%神韵医疗%`)
        )
      )
      .orderBy(asc(companies.id))
      .limit(1);
    return Number(row?.id || MAIN_COMPANY_FALLBACK_ID);
  } catch {
    return MAIN_COMPANY_FALLBACK_ID;
  }
}

export async function getDealerOwnerCompanyId(
  dbArg?: ReturnType<typeof drizzle> | null
): Promise<number> {
  const db = dbArg ?? (await getDb());
  if (!db) return 2;
  try {
    const [row] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(or(like(companies.name, `%瑞仁%`), eq(companies.id, 2)))
      .orderBy(asc(companies.id))
      .limit(1);
    return Number(row?.id || 2);
  } catch {
    return 2;
  }
}

function normalizeCompanyId(
  companyId?: number | null,
  fallback = MAIN_COMPANY_FALLBACK_ID
) {
  const value = Number(companyId || 0);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function normalizeCustomerOwnerCompanyId(
  db: ReturnType<typeof drizzle>,
  data: Partial<InsertCustomer> & { companyId?: number | null }
) {
  const mainCompanyId = await getMainCompanyId(db);
  const requestedCompanyId = normalizeCompanyId(data.companyId, mainCompanyId);
  const customerType = String(data.type || "").trim();
  const linkedCompanyId = Number((data as any).linkedCompanyId || 0);
  if (customerType !== "dealer" || linkedCompanyId > 0) {
    return requestedCompanyId;
  }
  return await getDealerOwnerCompanyId(db);
}

function buildBankAccountCloneKey(row: {
  accountNo?: string | null;
  currency?: string | null;
  accountName?: string | null;
}) {
  return [
    String(row.accountNo || "").trim(),
    String(row.currency || "CNY").trim().toUpperCase(),
    String(row.accountName || "").trim(),
  ].join("__");
}

async function ensureCollaborativeCompanyBankAccounts(
  db: ReturnType<typeof drizzle>,
  mainCompanyId: number
) {
  const mainRows = await db
    .select()
    .from(bankAccounts)
    .where(eq((bankAccounts as any).companyId, mainCompanyId))
    .orderBy(asc(bankAccounts.id));

  if (mainRows.length === 0) return;

  for (const companyId of COLLABORATIVE_COMPANY_IDS) {
    const existingRows = await db
      .select()
      .from(bankAccounts)
      .where(eq((bankAccounts as any).companyId, companyId))
      .orderBy(asc(bankAccounts.id));
    const existingByKey = new Map(
      existingRows.map(row => [buildBankAccountCloneKey(row), row] as const)
    );
    const idMap = new Map<number, number>();

    for (const sourceRow of mainRows) {
      const sourceId = Number((sourceRow as any).id || 0);
      if (sourceId <= 0) continue;

      const key = buildBankAccountCloneKey(sourceRow);
      let targetRow = existingByKey.get(key);

      if (!targetRow) {
        const result = await db.insert(bankAccounts).values({
          companyId,
          accountName: sourceRow.accountName,
          bankName: sourceRow.bankName,
          bankAddress: sourceRow.bankAddress ?? undefined,
          accountNo: sourceRow.accountNo,
          currency: sourceRow.currency ?? "CNY",
          swiftCode: sourceRow.swiftCode ?? undefined,
          accountType: sourceRow.accountType ?? "basic",
          isDefault: Boolean(sourceRow.isDefault),
          balance: sourceRow.balance ?? "0",
          status: sourceRow.status ?? "active",
          remark: sourceRow.remark ?? undefined,
        });
        const insertedId = Number(result[0]?.insertId || 0);
        targetRow = {
          ...sourceRow,
          id: insertedId,
          companyId,
        } as typeof sourceRow;
        existingByKey.set(key, targetRow);
      }

      const targetId = Number((targetRow as any)?.id || 0);
      if (targetId > 0) {
        idMap.set(sourceId, targetId);
      }
    }

    for (const [sourceId, targetId] of idMap.entries()) {
      if (sourceId <= 0 || targetId <= 0 || sourceId === targetId) continue;

      await db
        .update(accountsReceivable)
        .set({ bankAccountId: targetId })
        .where(
          and(
            eq((accountsReceivable as any).companyId, companyId),
            eq(accountsReceivable.bankAccountId, sourceId)
          )
        );

      await db
        .update(accountsPayable)
        .set({ bankAccountId: targetId })
        .where(
          and(
            eq((accountsPayable as any).companyId, companyId),
            eq(accountsPayable.bankAccountId, sourceId)
          )
        );

      await db
        .update(paymentRecords)
        .set({ bankAccountId: targetId })
        .where(
          and(
            eq((paymentRecords as any).companyId, companyId),
            eq(paymentRecords.bankAccountId, sourceId)
          )
        );

      await db
        .update(issuedInvoices)
        .set({ bankAccountId: targetId })
        .where(
          and(
            eq((issuedInvoices as any).companyId, companyId),
            eq(issuedInvoices.bankAccountId, sourceId)
          )
        );

      await db
        .update(expenseReimbursements)
        .set({ bankAccountId: targetId })
        .where(
          and(
            eq((expenseReimbursements as any).companyId, companyId),
            eq(expenseReimbursements.bankAccountId, sourceId)
          )
        );

      await db
        .update(salesOrders)
        .set({ receiptAccountId: targetId })
        .where(
          and(
            eq((salesOrders as any).companyId, companyId),
            eq(salesOrders.receiptAccountId, sourceId)
          )
        );

      await db
        .update(salesQuotes)
        .set({ receiptAccountId: targetId })
        .where(
          and(
            eq((salesQuotes as any).companyId, companyId),
            eq(salesQuotes.receiptAccountId, sourceId)
          )
        );
    }
  }
}

async function ensureCollaborativeCompanyExchangeRates(
  db: ReturnType<typeof drizzle>,
  mainCompanyId: number
) {
  const mainRows = await db
    .select()
    .from(exchangeRates)
    .where(eq((exchangeRates as any).companyId, mainCompanyId))
    .orderBy(desc(exchangeRates.effectiveDate), desc(exchangeRates.id));

  if (mainRows.length === 0) return;

  for (const companyId of COLLABORATIVE_COMPANY_IDS) {
    const [existingRow] = await db
      .select({ id: exchangeRates.id })
      .from(exchangeRates)
      .where(eq((exchangeRates as any).companyId, companyId))
      .limit(1);
    if (existingRow) continue;

    await db.insert(exchangeRates).values(
      mainRows.map(row => ({
        companyId,
        fromCurrency: row.fromCurrency,
        toCurrency: row.toCurrency,
        rate: row.rate,
        effectiveDate: row.effectiveDate,
        source: row.source ?? undefined,
        createdBy: row.createdBy ?? undefined,
      }))
    );
  }
}

async function getCompanyRow(
  db: ReturnType<typeof drizzle>,
  companyId: number
) {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return row;
}

async function ensureInternalSupplierForCompany(
  db: ReturnType<typeof drizzle>,
  ownerCompanyId: number,
  linkedCompanyId: number
) {
  const code = buildInternalSupplierCode(ownerCompanyId, linkedCompanyId);
  const [existing] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(
      and(
        eq((suppliers as any).companyId, ownerCompanyId),
        or(
          eq((suppliers as any).linkedCompanyId, linkedCompanyId),
          eq(suppliers.code, code)
        )
      )
    )
    .limit(1);
  if (existing) return Number(existing.id);

  const linkedCompany = await getCompanyRow(db, linkedCompanyId);
  const result = await db.insert(suppliers).values({
    companyId: ownerCompanyId,
    linkedCompanyId,
    code,
    name: String(linkedCompany?.name || `内部供应商-${linkedCompanyId}`),
    shortName: String(
      linkedCompany?.shortName ||
        linkedCompany?.name ||
        `内部供应商-${linkedCompanyId}`
    ),
    type: "material",
    contactPerson: String(
      linkedCompany?.shortName || linkedCompany?.name || "内部协同"
    ),
    paymentTerms: "账期支付",
    creditDays: 30,
    status: "qualified",
    createdBy: 0,
  } as InsertSupplier);
  return Number(result[0]?.insertId || 0);
}

async function ensureInternalCustomerForCompany(
  db: ReturnType<typeof drizzle>,
  ownerCompanyId: number,
  linkedCompanyId: number
) {
  const code = buildInternalCustomerCode(ownerCompanyId, linkedCompanyId);
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq((customers as any).companyId, ownerCompanyId),
        or(
          eq((customers as any).linkedCompanyId, linkedCompanyId),
          eq(customers.code, code)
        )
      )
    )
    .limit(1);
  if (existing) return Number(existing.id);

  const linkedCompany = await getCompanyRow(db, linkedCompanyId);
  const result = await db.insert(customers).values({
    companyId: ownerCompanyId,
    linkedCompanyId,
    code,
    name: String(linkedCompany?.name || `内部客户-${linkedCompanyId}`),
    shortName: String(
      linkedCompany?.shortName ||
        linkedCompany?.name ||
        `内部客户-${linkedCompanyId}`
    ),
    type: "dealer",
    contactPerson: String(
      linkedCompany?.shortName || linkedCompany?.name || "内部协同"
    ),
    paymentTerms: "账期支付",
    status: "active",
    needInvoice: false,
    createdBy: 0,
  } as InsertCustomer);
  return Number(result[0]?.insertId || 0);
}

async function cleanupMainCompanyDealerCustomers(
  db: ReturnType<typeof drizzle>,
  mainCompanyId: number,
  dealerOwnerCompanyId: number
) {
  const [dealerOwnerCompany] = await db
    .select({
      id: companies.id,
      name: companies.name,
      shortName: companies.shortName,
    })
    .from(companies)
    .where(eq(companies.id, dealerOwnerCompanyId))
    .limit(1);
  if (!dealerOwnerCompany) return;

  const canonicalCode = buildInternalCustomerCode(
    mainCompanyId,
    dealerOwnerCompanyId
  );
  const dealerRows = await db
    .select({
      id: customers.id,
      code: customers.code,
      name: customers.name,
      linkedCompanyId: (customers as any).linkedCompanyId,
    })
    .from(customers)
    .where(
      and(
        eq((customers as any).companyId, mainCompanyId),
        eq(customers.type, "dealer")
      )
    )
    .orderBy(asc(customers.id));

  const preferredRow =
    dealerRows.find(
      row =>
        Number(row.linkedCompanyId || 0) === dealerOwnerCompanyId &&
        String(row.code || "") === canonicalCode
    ) ||
    dealerRows.find(
      row => Number(row.linkedCompanyId || 0) === dealerOwnerCompanyId
    );

  for (const row of dealerRows) {
    const currentLinkedCompanyId = Number(row.linkedCompanyId || 0);
    const normalizedName = String(row.name || "").trim();
    const sameDealerOwnerName =
      normalizedName === String(dealerOwnerCompany.name || "").trim() ||
      normalizedName === String(dealerOwnerCompany.shortName || "").trim();
    const shouldKeep =
      preferredRow &&
      Number(preferredRow.id || 0) === Number(row.id || 0) &&
      (currentLinkedCompanyId === dealerOwnerCompanyId || sameDealerOwnerName);
    if (shouldKeep) continue;
    await db.delete(customers).where(eq(customers.id, Number(row.id)));
  }
}

async function cleanupExternalDealerOwnerCompany(
  db: ReturnType<typeof drizzle>,
  dealerOwnerCompanyId: number
) {
  const [dealerOwnerCompany] = await db
    .select({
      id: companies.id,
      name: companies.name,
      shortName: companies.shortName,
    })
    .from(companies)
    .where(eq(companies.id, dealerOwnerCompanyId))
    .limit(1);
  if (!dealerOwnerCompany) return;

  const dealerRows = await db
    .select({
      id: customers.id,
      name: customers.name,
      companyId: (customers as any).companyId,
      linkedCompanyId: (customers as any).linkedCompanyId,
    })
    .from(customers)
    .where(eq(customers.type, "dealer"))
    .orderBy(asc(customers.id));

  for (const row of dealerRows) {
    const linkedCompanyId = Number(row.linkedCompanyId || 0);
    const ownerCompanyId = Number((row as any).companyId || 0);
    if (linkedCompanyId > 0 || ownerCompanyId === dealerOwnerCompanyId) continue;

    const normalizedName = String(row.name || "").trim();
    const matchesDealerOwner =
      normalizedName === String(dealerOwnerCompany.name || "").trim() ||
      normalizedName === String(dealerOwnerCompany.shortName || "").trim();

    if (matchesDealerOwner) {
      await db.delete(customers).where(eq(customers.id, Number(row.id)));
      continue;
    }

    await db
      .update(customers)
      .set({ companyId: dealerOwnerCompanyId })
      .where(eq(customers.id, Number(row.id)));
  }
}

async function ensureVirtualWarehouseForCompanyInternal(
  db: ReturnType<typeof drizzle>,
  companyId: number
) {
  const code = buildVirtualWarehouseCode(companyId);
  const [existing] = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(
        eq((warehouses as any).companyId, companyId),
        or(eq((warehouses as any).isVirtual, true), eq(warehouses.code, code))
      )
    )
    .orderBy(asc(warehouses.id))
    .limit(1);
  if (existing) return Number(existing.id);

  const company = await getCompanyRow(db, companyId);
  const result = await db.insert(warehouses).values({
    companyId,
    isVirtual: true,
    code,
    name: `${String(company?.shortName || company?.name || companyId)}虚拟仓`,
    type: "finished",
    status: "active",
  } as InsertWarehouse);
  return Number(result[0]?.insertId || 0);
}

export async function ensureVirtualWarehouseForCompany(companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  return await ensureVirtualWarehouseForCompanyInternal(db, companyId);
}

export async function ensureCollaborationDataModel(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || collaborationDataModelReady) return;
  if (collaborationDataModelPromise) {
    await collaborationDataModelPromise;
    return;
  }

  collaborationDataModelPromise = (async () => {
    const addColumnSql = [
      "ALTER TABLE products ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE products ADD COLUMN sourceCompanyId INT NULL",
      "ALTER TABLE products ADD COLUMN sourceProductId INT NULL",
      "ALTER TABLE products ADD COLUMN isSyncedFromMain TINYINT(1) NOT NULL DEFAULT 0",
      "ALTER TABLE customers ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE customers ADD COLUMN linkedCompanyId INT NULL",
      "ALTER TABLE suppliers ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE suppliers ADD COLUMN linkedCompanyId INT NULL",
      "ALTER TABLE warehouses ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE warehouses ADD COLUMN isVirtual TINYINT(1) NOT NULL DEFAULT 0",
      "ALTER TABLE inventory ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE inventory_transactions ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE sales_orders ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE sales_orders ADD COLUMN sourceCompanyId INT NULL",
      "ALTER TABLE sales_orders ADD COLUMN sourcePurchaseOrderId INT NULL",
      "ALTER TABLE sales_quotes ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE purchase_orders ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE purchase_orders ADD COLUMN internalCompanyId INT NULL",
      "ALTER TABLE purchase_orders ADD COLUMN linkedSalesOrderId INT NULL",
      "ALTER TABLE bank_accounts ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE exchange_rates ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE expense_reimbursements ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE payment_records ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE customs_declarations ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE accounts_receivable ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE accounts_payable ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE received_invoices ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE issued_invoices ADD COLUMN companyId INT NOT NULL DEFAULT 3",
      "ALTER TABLE company_user_access ADD COLUMN role ENUM('user','admin') NULL DEFAULT 'admin'",
      "ALTER TABLE company_user_access ADD COLUMN dataScope ENUM('self','department','all') NULL DEFAULT 'self'",
      "ALTER TABLE company_user_access ADD COLUMN department VARCHAR(255) NULL",
      "ALTER TABLE company_user_access ADD COLUMN position VARCHAR(64) NULL",
      "ALTER TABLE company_user_access ADD COLUMN emailSignature TEXT NULL",
      "ALTER TABLE company_user_access ADD COLUMN visibleApps TEXT NULL",
      "ALTER TABLE company_user_access ADD COLUMN visibleForms TEXT NULL",
      "ALTER TABLE company_user_access ADD COLUMN dashboardPermissions TEXT NULL",
    ];

    for (const ddl of addColumnSql) {
      try {
        await db.execute(sql.raw(ddl));
      } catch (error) {
        const message = [
          String((error as any)?.message ?? ""),
          String((error as any)?.cause?.message ?? ""),
          String((error as any)?.cause?.sqlMessage ?? ""),
        ].join(" ");
        if (
          !/Duplicate column name|already exists|1060|doesn't exist|1146|ER_NO_SUCH_TABLE/i.test(
            message
          )
        ) {
          throw error;
        }
      }
    }

    const mainCompanyId = await getMainCompanyId(db);
    const dealerOwnerCompanyId = await getDealerOwnerCompanyId(db);
    for (const companyId of COLLABORATIVE_COMPANY_IDS) {
      await db
        .update(companies)
        .set({ modules: "purchase,sales,finance,products,settings" })
        .where(eq(companies.id, companyId));
    }
    for (const tableName of [
      "products",
      "customers",
      "suppliers",
      "warehouses",
      "inventory",
      "inventory_transactions",
      "sales_orders",
      "sales_quotes",
      "purchase_orders",
      "bank_accounts",
      "exchange_rates",
      "expense_reimbursements",
      "payment_records",
      "customs_declarations",
      "accounts_receivable",
      "accounts_payable",
      "received_invoices",
      "issued_invoices",
    ]) {
      try {
        await db.execute(
          sql.raw(
            `UPDATE ${tableName} SET companyId = ${mainCompanyId} WHERE companyId IS NULL OR companyId = 0`
          )
        );
      } catch (error) {
        const message = [
          String((error as any)?.message ?? ""),
          String((error as any)?.cause?.message ?? ""),
          String((error as any)?.cause?.sqlMessage ?? ""),
        ].join(" ");
        if (!/doesn't exist|1146|ER_NO_SUCH_TABLE/i.test(message)) {
          throw error;
        }
      }
    }

    for (const companyId of COLLABORATIVE_COMPANY_IDS) {
      const company = await getCompanyRow(db, companyId);
      if (!company) continue;
      await ensureVirtualWarehouseForCompanyInternal(db, companyId);
      await ensureInternalSupplierForCompany(db, companyId, mainCompanyId);
      if (companyId === dealerOwnerCompanyId) {
        await ensureInternalCustomerForCompany(db, mainCompanyId, companyId);
      }
    }

    await ensureCollaborativeCompanyBankAccounts(db, mainCompanyId);
    await ensureCollaborativeCompanyExchangeRates(db, mainCompanyId);

    for (const companyId of COLLABORATIVE_COMPANY_IDS) {
      const supplierCode = buildInternalSupplierCode(companyId, mainCompanyId);
      const supplierRows = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(
          and(
            eq((suppliers as any).companyId, companyId),
            eq(suppliers.code, supplierCode)
          )
        )
        .orderBy(asc(suppliers.id));
      for (const row of supplierRows.slice(1)) {
        await db.delete(suppliers).where(eq(suppliers.id, Number(row.id)));
      }

      const warehouseCode = buildVirtualWarehouseCode(companyId);
      const warehouseRows = await db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            eq((warehouses as any).companyId, companyId),
            eq(warehouses.code, warehouseCode)
          )
        )
        .orderBy(asc(warehouses.id));
      for (const row of warehouseRows.slice(1)) {
        await db.delete(warehouses).where(eq(warehouses.id, Number(row.id)));
      }

      const customerCode = buildInternalCustomerCode(mainCompanyId, companyId);
      const customerRows = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq((customers as any).companyId, mainCompanyId),
            eq(customers.code, customerCode)
          )
        )
        .orderBy(asc(customers.id));
      if (companyId !== dealerOwnerCompanyId) {
        for (const row of customerRows) {
          await db.delete(customers).where(eq(customers.id, Number(row.id)));
        }
        continue;
      }
      for (const row of customerRows.slice(1)) {
        await db.delete(customers).where(eq(customers.id, Number(row.id)));
      }
    }

    await cleanupMainCompanyDealerCustomers(
      db,
      mainCompanyId,
      dealerOwnerCompanyId
    );
    await cleanupExternalDealerOwnerCompany(db, dealerOwnerCompanyId);

    collaborationDataModelReady = true;
  })().finally(() => {
    collaborationDataModelPromise = null;
  });

  await collaborationDataModelPromise;
}

async function ensureProductsSterilizedColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || productsSterilizedColumnReady) return;

  try {
    await db.execute(
      sql`ALTER TABLE products ADD COLUMN isSterilized TINYINT(1) NOT NULL DEFAULT 0`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|isSterilized/i.test(message)
    ) {
      throw error;
    }
  }

  for (const column of [
    {
      name: "medicalInsuranceCode",
      ddl: sql`ALTER TABLE products ADD COLUMN medicalInsuranceCode VARCHAR(120) NULL AFTER udiDi`,
    },
  ]) {
    try {
      await db.execute(column.ddl);
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (
        !new RegExp(
          `Duplicate column name|already exists|1060|${column.name}`,
          "i"
        ).test(message)
      ) {
        throw error;
      }
    }
  }

  for (const legacyColumn of [
    {
      name: "workshopAccess",
      ddl: sql`ALTER TABLE products DROP COLUMN workshopAccess`,
    },
    {
      name: "productionClass",
      ddl: sql`ALTER TABLE products DROP COLUMN productionClass`,
    },
  ]) {
    try {
      await db.execute(legacyColumn.ddl);
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (
        !new RegExp(
          `Unknown column|can't drop|check that column/key exists|1091|${legacyColumn.name}`,
          "i"
        ).test(message)
      ) {
        throw error;
      }
    }
  }

  const legacyAndNewProductCategories = [
    "finished",
    "semi_finished",
    "raw_material",
    "auxiliary",
    "component",
    "equipment",
    "consumable",
    "packaging_material",
    "other",
  ];

  await db.execute(
    sql.raw(
      `ALTER TABLE products MODIFY COLUMN productCategory ENUM(${legacyAndNewProductCategories.map(item => `'${item}'`).join(",")}) NULL`
    )
  );
  await db.execute(
    sql.raw(
      "UPDATE products SET productCategory = 'packaging_material' WHERE productCategory = 'auxiliary'"
    )
  );
  await db.execute(
    sql.raw(
      `ALTER TABLE products MODIFY COLUMN productCategory ENUM(${PRODUCT_CATEGORY_VALUES.map(item => `'${item}'`).join(",")}) NULL`
    )
  );

  productsSterilizedColumnReady = true;
}

async function ensureBomBaseOutputColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || bomBaseOutputColumnsReady) return;

  const columns = [
    {
      name: "baseProductQty",
      ddl: sql`ALTER TABLE bom ADD COLUMN baseProductQty DECIMAL(12,4) NULL AFTER productId`,
    },
    {
      name: "baseProductUnit",
      ddl: sql`ALTER TABLE bom ADD COLUMN baseProductUnit VARCHAR(20) NULL AFTER baseProductQty`,
    },
  ];

  for (const column of columns) {
    try {
      await db.execute(column.ddl);
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (
        !new RegExp(
          `Duplicate column name|already exists|1060|${column.name}`,
          "i"
        ).test(message)
      ) {
        throw error;
      }
    }
  }

  bomBaseOutputColumnsReady = true;
}

async function ensureBankAccountsAddressColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || bankAccountsAddressColumnReady) return;

  try {
    await db.execute(
      sql`ALTER TABLE bank_accounts ADD COLUMN bankAddress VARCHAR(300) NULL AFTER bankName`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|bankAddress/i.test(message)
    ) {
      throw error;
    }
  }

  bankAccountsAddressColumnReady = true;
}

async function ensureInventoryTransactionColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || inventoryTransactionColumnsReady) return;

  try {
    await db.execute(
      sql`ALTER TABLE inventory_transactions ADD COLUMN productId INT NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|productId/i.test(message)) {
      throw error;
    }
  }

  try {
    await db.execute(
      sql`ALTER TABLE inventory_transactions ADD COLUMN sterilizationBatchNo VARCHAR(50) NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|sterilizationBatchNo/i.test(
        message
      )
    ) {
      throw error;
    }
  }

  try {
    await db.execute(
      sql`ALTER TABLE inventory_transactions ADD COLUMN shippingFee DECIMAL(14,2) NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|shippingFee/i.test(message)
    ) {
      throw error;
    }
  }

  try {
    await db.execute(
      sql`ALTER TABLE inventory_transactions ADD COLUMN logisticsSupplierId INT NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|logisticsSupplierId/i.test(
        message
      )
    ) {
      throw error;
    }
  }

  try {
    await db.execute(
      sql`ALTER TABLE inventory_transactions ADD COLUMN logisticsSupplierName VARCHAR(200) NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|logisticsSupplierName/i.test(
        message
      )
    ) {
      throw error;
    }
  }

  inventoryTransactionColumnsReady = true;
}

async function ensureSterilizationOrderColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || sterilizationOrderColumnsReady) return;
  try {
    await db.execute(
      sql`ALTER TABLE sterilization_orders ADD COLUMN sterilizationBatchNo VARCHAR(50) NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|sterilizationBatchNo/i.test(
        message
      )
    )
      throw error;
  }
  // 添加 arrived 状态到枚举（MySQL不支持直接修改枚举，通过 MODIFY COLUMN 实现）
  try {
    await db.execute(
      sql`ALTER TABLE sterilization_orders MODIFY COLUMN status ENUM('draft','sent','processing','arrived','returned','qualified','unqualified') NOT NULL DEFAULT 'draft'`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/arrived|already exists/i.test(message)) {
      console.warn(
        "[DB] Could not modify sterilization_orders status enum:",
        message
      );
    }
  }
  sterilizationOrderColumnsReady = true;
}

async function ensureProductionWarehouseEntryColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || productionWarehouseEntryColumnsReady) return;
  const columns = [
    { name: "sterilizationBatchNo", ddl: "VARCHAR(50) NULL" },
    { name: "sterilizedQty", ddl: "DECIMAL(12,4) NULL" },
    { name: "inspectionRejectQty", ddl: "DECIMAL(12,4) NULL DEFAULT 0" },
    { name: "sampleQty", ddl: "DECIMAL(12,4) NULL DEFAULT 0" },
    { name: "quantityModifyReason", ddl: "TEXT NULL" },
  ];
  for (const col of columns) {
    try {
      await db.execute(
        sql.raw(
          `ALTER TABLE production_warehouse_entries ADD COLUMN ${col.name} ${col.ddl}`
        )
      );
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(message)) {
        console.warn(
          `[DB] Could not add column ${col.name} to production_warehouse_entries:`,
          message
        );
      }
    }
  }
  productionWarehouseEntryColumnsReady = true;
}

async function ensureQualityInspectionColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || qualityInspectionColumnsReady) return;
  const columns = [
    { name: "productionOrderId", ddl: "INT NULL" },
    { name: "productionOrderNo", ddl: "VARCHAR(50) NULL" },
    { name: "sterilizationOrderId", ddl: "INT NULL" },
    { name: "sterilizationOrderNo", ddl: "VARCHAR(50) NULL" },
  ];
  for (const col of columns) {
    try {
      await db.execute(
        sql.raw(
          `ALTER TABLE quality_inspections ADD COLUMN ${col.name} ${col.ddl}`
        )
      );
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(message)) {
        console.warn(
          `[DB] Could not add column ${col.name} to quality_inspections:`,
          message
        );
      }
    }
  }
  qualityInspectionColumnsReady = true;
}

export async function ensureEnvironmentRecordsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || environmentRecordsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS environment_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sourceType ENUM('manual', 'production') NOT NULL DEFAULT 'manual',
      recordNo VARCHAR(50) NOT NULL UNIQUE,
      moduleType VARCHAR(50) NULL,
      roomName VARCHAR(100) NULL,
      roomCode VARCHAR(100) NULL,
      recordDate DATE NULL,
      recordTime VARCHAR(10) NULL,
      temperature DECIMAL(6,2) NULL,
      humidity DECIMAL(6,2) NULL,
      tempMin DECIMAL(6,2) NULL,
      tempMax DECIMAL(6,2) NULL,
      humidityMin DECIMAL(6,2) NULL,
      humidityMax DECIMAL(6,2) NULL,
      isNormal TINYINT(1) NOT NULL DEFAULT 1,
      abnormalDesc TEXT NULL,
      correctionAction TEXT NULL,
      recorder VARCHAR(50) NULL,
      productionOrderNo VARCHAR(50) NULL,
      productName VARCHAR(200) NULL,
      batchNo VARCHAR(50) NULL,
      processName VARCHAR(100) NULL,
      productionTeam VARCHAR(50) NULL,
      detailItems TEXT NULL,
      equipmentItems TEXT NULL,
      remark TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  environmentRecordsTableReady = true;
}

export async function ensureProductionScrapDisposalsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || productionScrapDisposalsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS production_scrap_disposals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      disposalNo VARCHAR(50) NOT NULL UNIQUE,
      batchNo VARCHAR(50) NOT NULL,
      productionOrderId INT NULL,
      productionOrderNo VARCHAR(50) NULL,
      productId INT NULL,
      productName VARCHAR(200) NULL,
      totalScrapQty DECIMAL(12,4) NULL,
      costQty DECIMAL(12,4) NULL,
      unit VARCHAR(20) NULL,
      detailItems TEXT NULL,
      status ENUM('generated','processed') NOT NULL DEFAULT 'generated',
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_production_scrap_disposals_batchNo (batchNo),
      KEY idx_production_scrap_disposals_productionOrderId (productionOrderId)
    )
  `);
  productionScrapDisposalsTableReady = true;
}

async function ensureProductionRecordColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || productionRecordColumnsReady) return;
  const columns = [
    {
      name: "recordTime",
      ddl: "ALTER TABLE production_records ADD COLUMN recordTime VARCHAR(10) NULL",
    },
    {
      name: "materialItems",
      ddl: "ALTER TABLE production_records ADD COLUMN materialItems TEXT NULL",
    },
    {
      name: "operatorName",
      ddl: "ALTER TABLE production_records ADD COLUMN operatorName VARCHAR(100) NULL",
    },
  ];
  for (const column of columns) {
    try {
      await db.execute(sql.raw(column.ddl));
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(message)) {
        console.warn(
          `[DB] Could not add column ${column.name} to production_records:`,
          message
        );
      }
    }
  }
  productionRecordColumnsReady = true;
}

export async function ensureUdiLabelsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || udiLabelsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS udi_labels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      labelNo VARCHAR(50) NOT NULL UNIQUE,
      productId INT NULL,
      productName VARCHAR(200) NULL,
      productCode VARCHAR(50) NULL,
      specification VARCHAR(200) NULL,
      registrationNo VARCHAR(100) NULL,
      riskLevel ENUM('I','II','III') NULL,
      udiDi VARCHAR(100) NOT NULL,
      issuer ENUM('GS1','HIBC','ICCBBA','OTHER') NULL DEFAULT 'GS1',
      batchNo VARCHAR(50) NULL,
      serialNo VARCHAR(50) NULL,
      productionDate DATE NULL,
      expiryDate DATE NULL,
      carrierType ENUM('datamatrix','gs1_128','qr_code','rfid') NULL DEFAULT 'datamatrix',
      labelTemplate ENUM('single','double','box','pallet') NULL DEFAULT 'single',
      printQty INT NOT NULL DEFAULT 1,
      printedQty INT NOT NULL DEFAULT 0,
      status ENUM('pending','printing','printed','used','recalled') NOT NULL DEFAULT 'pending',
      printDate TIMESTAMP NULL,
      printedBy INT NULL,
      nmpaSubmitted TINYINT(1) NOT NULL DEFAULT 0,
      nmpaSubmitDate TIMESTAMP NULL,
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  udiLabelsTableReady = true;
}

export async function ensureLargePackagingRecordsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || largePackagingRecordsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS large_packaging_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recordNo VARCHAR(50) NOT NULL UNIQUE,
      productionOrderId INT NULL,
      productionOrderNo VARCHAR(50) NULL,
      productId INT NULL,
      productName VARCHAR(200) NULL,
      specification VARCHAR(200) NULL,
      batchNo VARCHAR(50) NULL,
      packagingDate DATE NULL,
      packagingType ENUM('box','carton','pallet','other') NOT NULL DEFAULT 'carton',
      packageSpec VARCHAR(200) NULL,
      workshopName VARCHAR(100) NULL,
      packagingTeam VARCHAR(50) NULL,
      quantity DECIMAL(12,4) NULL,
      unit VARCHAR(20) NULL,
      operator VARCHAR(100) NULL,
      reviewer VARCHAR(100) NULL,
      status ENUM('draft','completed') NOT NULL DEFAULT 'draft',
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  largePackagingRecordsTableReady = true;
}

export async function ensureBatchRecordReviewRecordsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || batchRecordReviewRecordsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS batch_record_review_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reviewNo VARCHAR(50) NOT NULL UNIQUE,
      productionOrderId INT NULL,
      productionOrderNo VARCHAR(50) NULL,
      productId INT NULL,
      productName VARCHAR(200) NULL,
      specification VARCHAR(200) NULL,
      batchNo VARCHAR(50) NOT NULL,
      reviewDate DATE NULL,
      reviewer VARCHAR(100) NULL,
      completenessStatus ENUM('complete','incomplete') NOT NULL DEFAULT 'complete',
      status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
      missingItems TEXT NULL,
      reviewOpinion TEXT NULL,
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  batchRecordReviewRecordsTableReady = true;
}

export async function ensureRegulatoryReleaseRecordsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || regulatoryReleaseRecordsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS regulatory_release_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      releaseNo VARCHAR(50) NOT NULL UNIQUE,
      productionOrderId INT NULL,
      productionOrderNo VARCHAR(50) NULL,
      productId INT NULL,
      productName VARCHAR(200) NULL,
      specification VARCHAR(200) NULL,
      batchNo VARCHAR(50) NOT NULL,
      sterilizationBatchNo VARCHAR(50) NULL,
      releaseDate DATE NULL,
      approver VARCHAR(100) NULL,
      decision ENUM('approved','conditional','rejected') NOT NULL DEFAULT 'approved',
      status ENUM('draft','released','rejected') NOT NULL DEFAULT 'draft',
      basisSummary TEXT NULL,
      relatedReviewNo VARCHAR(50) NULL,
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  regulatoryReleaseRecordsTableReady = true;
}

async function ensureProductionPlansSupplierColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || productionPlansSupplierColumnsReady) return;
  const columns = [
    { name: "supplierId", def: "INT NULL" },
    { name: "supplierName", def: "VARCHAR(200) NULL" },
  ];
  try {
    const existingColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM production_plans")
    );
    const existingColumnsRows = Array.isArray(
      (existingColumnsResult as any)?.[0]
    )
      ? (existingColumnsResult as any)[0]
      : (existingColumnsResult as any);
    const existingColumnNames = new Set(
      Array.from(existingColumnsRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );

    for (const col of columns) {
      if (existingColumnNames.has(col.name)) continue;
      try {
        await db.execute(
          sql.raw(
            `ALTER TABLE production_plans ADD COLUMN ${col.name} ${col.def}`
          )
        );
      } catch (error) {
        const message = String((error as any)?.message ?? "");
        if (!/Duplicate column name|already exists|1060/i.test(message)) {
          console.warn(
            `[ensureProductionPlansSupplierColumns] ${col.name}:`,
            message
          );
        }
      }
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    console.warn(
      "[ensureProductionPlansSupplierColumns] failed to inspect columns:",
      message
    );
  }
  productionPlansSupplierColumnsReady = true;
}

async function ensureProductionPlansStatusEnum(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || productionPlansStatusEnumReady) return;
  try {
    const columns = await db.execute(
      sql.raw("SHOW COLUMNS FROM production_plans LIKE 'status'")
    );
    const columnRows = Array.isArray((columns as any)?.[0])
      ? (columns as any)[0]
      : (columns as any);
    const row = Array.from(columnRows as any[])[0] as any;
    const type = String(row?.Type ?? row?.type ?? "");
    if (!type.includes("purchase_submitted")) {
      await db.execute(
        sql.raw(
          "ALTER TABLE production_plans MODIFY COLUMN status ENUM('pending','scheduled','purchase_submitted','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending'"
        )
      );
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    console.warn("[ensureProductionPlansStatusEnum] failed:", message);
  }
  productionPlansStatusEnumReady = true;
}

async function ensurePurchaseOrdersSupplierNameColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || purchaseOrdersSupplierNameColumnReady) return;
  try {
    await db.execute(
      sql`ALTER TABLE purchase_orders ADD COLUMN supplierName VARCHAR(200) NULL`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|supplierName/i.test(message)
    ) {
      throw error;
    }
  }
  purchaseOrdersSupplierNameColumnReady = true;
}

async function ensurePurchaseOrdersStatusEnum(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || purchaseOrdersStatusEnumReady) return;
  try {
    const columns = await db.execute(
      sql.raw("SHOW COLUMNS FROM purchase_orders LIKE 'status'")
    );
    const columnRows = Array.isArray((columns as any)?.[0])
      ? (columns as any)[0]
      : (columns as any);
    const row = Array.from(columnRows as any[])[0] as any;
    const type = String(row?.Type ?? row?.type ?? "");
    const expectedValues = [
      "pending_approval",
      "rejected",
      "issued",
      "completed",
    ];
    if (!expectedValues.every(value => type.includes(value))) {
      await db.execute(
        sql.raw(
          "ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('draft','pending_approval','approved','rejected','issued','ordered','partial_received','received','completed','cancelled') NOT NULL DEFAULT 'draft'"
        )
      );
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    console.warn("[ensurePurchaseOrdersStatusEnum] failed:", message);
  }
  purchaseOrdersStatusEnumReady = true;
}

async function ensureAccountsPayableSupplierNameColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || accountsPayableSupplierNameColumnReady) return;
  const columns = [
    { name: "supplierName", def: "VARCHAR(200) NULL" },
    { name: "paymentMethod", def: "VARCHAR(50) NULL" },
    { name: "paymentDate", def: "DATE NULL" },
    { name: "createdBy", def: "INT NULL" },
  ];
  try {
    const existingColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM accounts_payable")
    );
    const existingColumnsRows = Array.isArray(
      (existingColumnsResult as any)?.[0]
    )
      ? (existingColumnsResult as any)[0]
      : (existingColumnsResult as any);
    const existingColumnNames = new Set(
      Array.from(existingColumnsRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );

    for (const col of columns) {
      if (existingColumnNames.has(col.name)) continue;
      try {
        await db.execute(
          sql.raw(
            `ALTER TABLE accounts_payable ADD COLUMN ${col.name} ${col.def}`
          )
        );
      } catch (error) {
        const message = String((error as any)?.message ?? "");
        if (!/Duplicate column name|already exists|1060/i.test(message)) {
          throw error;
        }
      }
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/SHOW COLUMNS|accounts_payable/i.test(message)) {
      throw error;
    }
  }
  accountsPayableSupplierNameColumnReady = true;
}

async function ensureSuppliersCreditDaysColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || suppliersCreditDaysColumnReady) return;
  try {
    await db.execute(
      sql`ALTER TABLE suppliers ADD COLUMN creditDays INT NULL DEFAULT 30`
    );
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (
      !/Duplicate column name|already exists|1060|creditDays/i.test(message)
    ) {
      throw error;
    }
  }
  suppliersCreditDaysColumnReady = true;
}

async function ensureSupplierProfileRecordsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || supplierProfileRecordsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS supplier_profile_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      companyId INT NOT NULL DEFAULT 3,
      recordNo VARCHAR(50) NOT NULL UNIQUE,
      supplierId INT NOT NULL,
      supplierName VARCHAR(200) NOT NULL,
      formType ENUM('survey','annual_evaluation','quality_agreement') NOT NULL,
      templateCode VARCHAR(50) NOT NULL,
      serialNo VARCHAR(50) NULL,
      title VARCHAR(200) NOT NULL,
      yearLabel VARCHAR(20) NULL,
      status ENUM('draft','completed') NOT NULL DEFAULT 'draft',
      formData LONGTEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_supplier_profile_records_company (companyId),
      INDEX idx_supplier_profile_records_supplier (supplierId),
      INDEX idx_supplier_profile_records_form (formType)
    )
  `);
  supplierProfileRecordsTableReady = true;
}

function parseSupplierProfileFormData(value: unknown) {
  if (!value) return {};
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function getSupplierProfileTemplateCode(
  formType: "survey" | "annual_evaluation" | "quality_agreement"
) {
  switch (formType) {
    case "survey":
      return "QT/QP12-01";
    case "annual_evaluation":
      return "QT/QP12-06";
    case "quality_agreement":
      return "QT/QP12-13";
    default:
      return "QT/QP12";
  }
}

function getSupplierProfileTitle(
  formType: "survey" | "annual_evaluation" | "quality_agreement"
) {
  switch (formType) {
    case "survey":
      return "供应商调查表";
    case "annual_evaluation":
      return "供应商年度评价表";
    case "quality_agreement":
      return "质量保证协议";
    default:
      return "供应商资料";
  }
}

async function getNextSupplierProfileRecordNo(
  formType: "survey" | "annual_evaluation" | "quality_agreement",
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) throw new Error("数据库连接不可用");
  await ensureSupplierProfileRecordsTable(db);

  const prefixMap = {
    survey: "SP-SUR",
    annual_evaluation: "SP-EVA",
    quality_agreement: "SP-QA",
  } as const;
  const prefix = prefixMap[formType];
  const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const keyword = `${prefix}-${dateCode}-`;
  const rows = await db
    .select({ recordNo: supplierProfileRecords.recordNo })
    .from(supplierProfileRecords)
    .where(like(supplierProfileRecords.recordNo, `${keyword}%`))
    .orderBy(desc(supplierProfileRecords.recordNo));
  const lastCode = rows[0]?.recordNo || "";
  const lastSequence = Number(lastCode.split("-").pop() || "0");
  return `${keyword}${String(lastSequence + 1).padStart(3, "0")}`;
}

function normalizeSupplierProfileRecord(row: any) {
  return {
    ...row,
    templateCode:
      row.templateCode || getSupplierProfileTemplateCode(row.formType),
    title: row.title || getSupplierProfileTitle(row.formType),
    formData: parseSupplierProfileFormData(row.formData),
  };
}

async function getSupplierNameById(
  supplierId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !supplierId) return undefined;
  const result = await db
    .select({ name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);
  return result[0]?.name || undefined;
}

async function getDefaultSupplierForProduct(
  productId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !productId) return null;
  const rows = await db.execute(
    sql.raw(`
    SELECT psp.supplierId, s.name AS supplierName
    FROM product_supplier_prices psp
    LEFT JOIN suppliers s ON s.id = psp.supplierId
    WHERE psp.productId = ${Number(productId)}
    ORDER BY CASE WHEN psp.isDefault = 1 THEN 0 ELSE 1 END, psp.createdAt DESC
    LIMIT 1
  `)
  );
  const rowList = Array.isArray((rows as any)?.[0])
    ? (rows as any)[0]
    : (rows as any);
  const list = Array.from(rowList as any[]);
  if (list.length === 0) return null;
  return {
    supplierId: Number((list[0] as any).supplierId || 0) || null,
    supplierName: String((list[0] as any).supplierName || ""),
  };
}

async function getPlanSupplierInfo(
  productId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !productId) return null;
  await ensureProductsSterilizedColumn(db);
  const [product] = await db
    .select({
      sourceType: products.sourceType,
      procurePermission: products.procurePermission,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  const isPurchasable =
    String(product?.sourceType || "") === "purchase" ||
    String(product?.procurePermission || "") === "purchasable";
  if (!isPurchasable) return null;
  return getDefaultSupplierForProduct(productId, db);
}

async function syncOpenProductReferenceSnapshots(
  productId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !productId) return;
  await ensureProductsSterilizedColumn(db);
  await ensureProductionPlansSupplierColumns(db);
  await ensureProductionPlansStatusEnum(db);

  const [product] = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      specification: products.specification,
      unit: products.unit,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return;

  const latestSupplier = await getPlanSupplierInfo(productId, db);
  const latestSupplierId = Number(latestSupplier?.supplierId || 0) || null;
  const latestSupplierName = String(latestSupplier?.supplierName || "");

  await db
    .update(productionPlans)
    .set({
      productName: String(product.name || ""),
      unit: String(product.unit || "") || undefined,
      supplierId: latestSupplierId as any,
      supplierName: (latestSupplierName || null) as any,
    })
    .where(
      and(
        eq(productionPlans.productId, productId),
        inArray(productionPlans.status, [
          "pending",
          "scheduled",
          "purchase_submitted",
          "in_progress",
        ])
      )
    );

  await db
    .update(productionOrders)
    .set({
      unit: String(product.unit || "") || undefined,
    })
    .where(
      and(
        eq(productionOrders.productId, productId),
        inArray(productionOrders.status, ["draft", "planned"])
      )
    );

  const editableRequestRows = await db
    .select({ id: materialRequests.id })
    .from(materialRequests)
    .where(
      inArray(materialRequests.status, [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
      ])
    );
  const editableRequestIds = editableRequestRows
    .map((row) => Number(row.id || 0))
    .filter((id) => id > 0);
  if (editableRequestIds.length > 0) {
    await db
      .update(materialRequestItems)
      .set({
        materialName: String(product.name || ""),
        specification: String(product.specification || "") || undefined,
        unit: String(product.unit || "") || undefined,
      })
      .where(
        and(
          eq(materialRequestItems.productId, productId),
          inArray(materialRequestItems.requestId, editableRequestIds)
        )
      );
  }

  const editablePurchaseOrderRows = await db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(
      inArray(purchaseOrders.status, [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
      ])
    );
  const editablePurchaseOrderIds = editablePurchaseOrderRows
    .map((row) => Number(row.id || 0))
    .filter((id) => id > 0);
  if (editablePurchaseOrderIds.length > 0) {
    await db
      .update(purchaseOrderItems)
      .set({
        materialCode: String(product.code || ""),
        materialName: String(product.name || ""),
        specification: String(product.specification || "") || undefined,
        unit: String(product.unit || "") || undefined,
      })
      .where(
        and(
          eq(purchaseOrderItems.productId, productId),
          inArray(purchaseOrderItems.orderId, editablePurchaseOrderIds)
        )
      );
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    await ensureUsersExtendedColumns(db);
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  await ensureUsersExtendedColumns(db);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== 回收箱（删除恢复） ====================

const recycleBin = mysqlTable("recycle_bin", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  sourceTable: varchar("sourceTable", { length: 100 }).notNull(),
  sourceId: int("sourceId").notNull(),
  displayName: varchar("displayName", { length: 255 }),
  payload: mysqlText("payload").notNull(),
  status: mysqlEnum("status", ["active", "restored", "expired"])
    .default("active")
    .notNull(),
  deletedBy: int("deletedBy"),
  deletedAt: timestamp("deletedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  restoredAt: timestamp("restoredAt"),
  restoredBy: int("restoredBy"),
});

const RECYCLE_RETENTION_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECYCLE_STATUS_ACTIVE = "active" as const;
const RECYCLE_STATUS_RESTORED = "restored" as const;
const RECYCLE_STATUS_EXPIRED = "expired" as const;
let recycleBinTableReady = false;

type SnapshotRow = Record<string, unknown>;
type RecycleSnapshot =
  | {
      kind: "single";
      table: string;
      row: SnapshotRow;
    }
  | {
      kind: "bundle";
      root: {
        table: string;
        row: SnapshotRow;
      };
      children: Array<{
        table: string;
        rows: SnapshotRow[];
      }>;
    };

const RESTORABLE_TABLES: Record<string, any> = {
  users,
  documents,
  products,
  customers,
  suppliers,
  sales_orders: salesOrders,
  sales_order_items: salesOrderItems,
  sales_quotes: salesQuotes,
  sales_quote_items: salesQuoteItems,
  purchase_orders: purchaseOrders,
  purchase_order_items: purchaseOrderItems,
  production_orders: productionOrders,
  inventory,
  quality_inspections: qualityInspections,
  bom,
  warehouses,
  inventory_transactions: inventoryTransactions,
  bank_accounts: bankAccounts,
  exchange_rates: exchangeRates,
  payment_terms: paymentTerms,
  material_requests: materialRequests,
  material_request_items: materialRequestItems,
  expense_reimbursements: expenseReimbursements,
  payment_records: paymentRecords,
  customs_declarations: customsDeclarations,
  departments,
  code_rules: codeRules,
  personnel,
  trainings,
  audits,
  rd_projects: rdProjects,
  stocktakes,
  quality_incidents: qualityIncidents,
  samples,
  lab_records: labRecords,
  accounts_receivable: accountsReceivable,
  accounts_payable: accountsPayable,
  received_invoices: receivedInvoices,
  issued_invoices: issuedInvoices,
  dealer_qualifications: dealerQualifications,
  equipment,
  production_plans: productionPlans,
  material_requisition_orders: materialRequisitionOrders,
  production_records: productionRecords,
  production_routing_cards: productionRoutingCards,
  production_scrap_disposals: productionScrapDisposals,
  sterilization_orders: sterilizationOrders,
  production_warehouse_entries: productionWarehouseEntries,
  large_packaging_records: largePackagingRecords,
  batch_record_review_records: batchRecordReviewRecords,
  regulatory_release_records: regulatoryReleaseRecords,
  overtime_requests: overtimeRequests,
  leave_requests: leaveRequests,
  outing_requests: outingRequests,
};

function normalizeSnapshotValue(value: unknown): unknown {
  if (value instanceof Date) {
    const iso = value.toISOString();
    if (iso.endsWith("T00:00:00.000Z")) {
      return iso.slice(0, 10);
    }
    return iso.slice(0, 19).replace("T", " ");
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
}

function normalizeSnapshotRow(row: SnapshotRow): SnapshotRow {
  const normalized: SnapshotRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = normalizeSnapshotValue(value);
  }
  return normalized;
}

function getSnapshotDisplayName(
  entityType: string,
  row: SnapshotRow,
  sourceId: number
): string {
  const candidateKeys = [
    "name",
    "title",
    "code",
    "orderNo",
    "invoiceNo",
    "recordNo",
    "docNo",
    "declarationNo",
    "requestNo",
    "reimbursementNo",
    "stocktakeNo",
    "sampleNo",
    "projectNo",
    "planNo",
    "requisitionNo",
    "cardNo",
    "entryNo",
    "accountName",
    "openId",
    "employeeNo",
  ];
  for (const key of candidateKeys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }
  return `${entityType} #${sourceId}`;
}

function serializeRecycleSnapshot(snapshot: RecycleSnapshot): string {
  return JSON.stringify(snapshot);
}

function parseRecycleSnapshot(payload: string): RecycleSnapshot {
  const parsed = JSON.parse(payload ?? "{}");
  if (!parsed || typeof parsed !== "object") {
    throw new Error("回收快照格式错误");
  }
  if (parsed.kind === "single") {
    if (!parsed.table || !parsed.row) throw new Error("回收快照内容不完整");
    return parsed as RecycleSnapshot;
  }
  if (parsed.kind === "bundle") {
    if (!parsed.root?.table || !parsed.root?.row)
      throw new Error("回收快照内容不完整");
    return parsed as RecycleSnapshot;
  }
  throw new Error("回收快照类型不支持");
}

async function ensureRecycleBinTable(db: any): Promise<void> {
  if (recycleBinTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS recycle_bin (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entityType VARCHAR(100) NOT NULL,
      sourceTable VARCHAR(100) NOT NULL,
      sourceId INT NOT NULL,
      displayName VARCHAR(255) NULL,
      payload LONGTEXT NOT NULL,
      status ENUM('active','restored','expired') NOT NULL DEFAULT 'active',
      deletedBy INT NULL,
      deletedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expiresAt TIMESTAMP NOT NULL,
      restoredAt TIMESTAMP NULL,
      restoredBy INT NULL,
      INDEX idx_recycle_bin_status_expires (status, expiresAt),
      INDEX idx_recycle_bin_source (sourceTable, sourceId)
    )
  `);
  recycleBinTableReady = true;
}

async function markRecycleEntriesExpired(db: any): Promise<void> {
  await ensureRecycleBinTable(db);
  await db
    .update(recycleBin)
    .set({ status: RECYCLE_STATUS_EXPIRED })
    .where(
      and(
        eq(recycleBin.status, RECYCLE_STATUS_ACTIVE),
        lte(recycleBin.expiresAt, new Date())
      )
    );
}

async function addRecycleEntry(
  db: any,
  params: {
    entityType: string;
    sourceTable: string;
    sourceId: number;
    displayName: string;
    snapshot: RecycleSnapshot;
    deletedBy?: number | null;
  }
): Promise<void> {
  await ensureRecycleBinTable(db);
  const now = Date.now();
  await db.insert(recycleBin).values({
    entityType: params.entityType,
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
    displayName: params.displayName,
    payload: serializeRecycleSnapshot(params.snapshot),
    deletedBy: params.deletedBy ?? null,
    expiresAt: new Date(now + RECYCLE_RETENTION_DAYS * DAY_MS),
    status: RECYCLE_STATUS_ACTIVE,
  });
}

async function deleteSingleWithRecycle(
  db: any,
  params: {
    table: any;
    idColumn: any;
    id: number;
    entityType: string;
    sourceTable: string;
    deletedBy?: number | null;
  }
): Promise<void> {
  const [row] = await db
    .select()
    .from(params.table)
    .where(eq(params.idColumn, params.id))
    .limit(1);
  if (!row) return;
  const normalizedRow = normalizeSnapshotRow(row as SnapshotRow);
  const fallbackDeletedBy =
    typeof normalizedRow.createdBy === "number"
      ? (normalizedRow.createdBy as number)
      : null;
  await addRecycleEntry(db, {
    entityType: params.entityType,
    sourceTable: params.sourceTable,
    sourceId: params.id,
    displayName: getSnapshotDisplayName(
      params.entityType,
      normalizedRow,
      params.id
    ),
    snapshot: {
      kind: "single",
      table: params.sourceTable,
      row: normalizedRow,
    },
    deletedBy: params.deletedBy ?? fallbackDeletedBy,
  });
  await db.delete(params.table).where(eq(params.idColumn, params.id));
}

async function deleteBundleWithRecycle(
  db: any,
  params: {
    rootTable: any;
    rootIdColumn: any;
    rootId: number;
    entityType: string;
    rootTableName: string;
    children: Array<{
      table: any;
      tableName: string;
      foreignKeyColumn: any;
    }>;
    deletedBy?: number | null;
  }
): Promise<void> {
  const [rootRow] = await db
    .select()
    .from(params.rootTable)
    .where(eq(params.rootIdColumn, params.rootId))
    .limit(1);
  if (!rootRow) return;
  const normalizedRoot = normalizeSnapshotRow(rootRow as SnapshotRow);
  const fallbackDeletedBy =
    typeof normalizedRoot.createdBy === "number"
      ? (normalizedRoot.createdBy as number)
      : null;
  const childrenSnapshot: Array<{ table: string; rows: SnapshotRow[] }> = [];
  for (const child of params.children) {
    const rows = await db
      .select()
      .from(child.table)
      .where(eq(child.foreignKeyColumn, params.rootId));
    childrenSnapshot.push({
      table: child.tableName,
      rows: rows.map((row: SnapshotRow) => normalizeSnapshotRow(row)),
    });
  }

  await addRecycleEntry(db, {
    entityType: params.entityType,
    sourceTable: params.rootTableName,
    sourceId: params.rootId,
    displayName: getSnapshotDisplayName(
      params.entityType,
      normalizedRoot,
      params.rootId
    ),
    snapshot: {
      kind: "bundle",
      root: {
        table: params.rootTableName,
        row: normalizedRoot,
      },
      children: childrenSnapshot,
    },
    deletedBy: params.deletedBy ?? fallbackDeletedBy,
  });

  for (const child of params.children) {
    await db
      .delete(child.table)
      .where(eq(child.foreignKeyColumn, params.rootId));
  }
  await db
    .delete(params.rootTable)
    .where(eq(params.rootIdColumn, params.rootId));
}

async function restoreRowToTable(
  db: any,
  tableName: string,
  row: SnapshotRow
): Promise<void> {
  const table = RESTORABLE_TABLES[tableName];
  if (!table) throw new Error(`暂不支持恢复来源表：${tableName}`);
  await db.insert(table).values(row as any);
}

export async function getRecycleBinEntries(params?: {
  status?: "active" | "restored" | "expired";
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await markRecycleEntriesExpired(db);

  const conditions = [];
  if (params?.status) {
    conditions.push(eq(recycleBin.status, params.status));
  }
  if (params?.keyword) {
    conditions.push(
      or(
        like(recycleBin.entityType, `%${params.keyword}%`),
        like(recycleBin.displayName, `%${params.keyword}%`),
        like(recycleBin.sourceTable, `%${params.keyword}%`)
      )
    );
  }

  let query = db.select().from(recycleBin);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query
    .orderBy(desc(recycleBin.deletedAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  const now = Date.now();
  return rows.map((row: any) => {
    const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;
    const msLeft = expiresAt ? expiresAt.getTime() - now : 0;
    const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));
    return {
      ...row,
      canRestore: row.status === RECYCLE_STATUS_ACTIVE && daysLeft > 0,
      daysLeft,
    };
  });
}

export async function restoreRecycleBinEntry(id: number, restoredBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await markRecycleEntriesExpired(db);

  const [entry] = await db
    .select()
    .from(recycleBin)
    .where(eq(recycleBin.id, id))
    .limit(1);
  if (!entry) throw new Error("回收记录不存在");
  if (entry.status !== RECYCLE_STATUS_ACTIVE) {
    throw new Error("该记录不可恢复（已恢复或已过期）");
  }

  const expiresAt = entry.expiresAt ? new Date(entry.expiresAt).getTime() : 0;
  if (expiresAt <= Date.now()) {
    await db
      .update(recycleBin)
      .set({ status: RECYCLE_STATUS_EXPIRED })
      .where(eq(recycleBin.id, id));
    throw new Error("回收记录已过期，无法恢复");
  }

  const snapshot = parseRecycleSnapshot(String(entry.payload ?? ""));
  try {
    if (snapshot.kind === "single") {
      await restoreRowToTable(db, snapshot.table, snapshot.row);
    } else {
      await restoreRowToTable(db, snapshot.root.table, snapshot.root.row);
      for (const child of snapshot.children) {
        for (const row of child.rows) {
          await restoreRowToTable(db, child.table, row);
        }
      }
    }
  } catch (error: any) {
    throw new Error(
      `恢复失败：${String(error?.message ?? error ?? "数据库写入失败")}`
    );
  }

  await db
    .update(recycleBin)
    .set({
      status: RECYCLE_STATUS_RESTORED,
      restoredAt: new Date(),
      restoredBy: restoredBy ?? null,
    })
    .where(eq(recycleBin.id, id));

  return { success: true };
}

export async function removeRecycleBinEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureRecycleBinTable(db);
  await db.delete(recycleBin).where(eq(recycleBin.id, id));
}

export async function clearExpiredRecycleBinEntries() {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await markRecycleEntriesExpired(db);
  await db
    .delete(recycleBin)
    .where(eq(recycleBin.status, RECYCLE_STATUS_EXPIRED));
  return { success: true };
}

export async function deleteUser(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: users,
    idColumn: users.id,
    id,
    entityType: "用户",
    sourceTable: "users",
    deletedBy,
  });
}

export async function deleteDocument(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：电子签名、签名审计日志
  await db
    .delete(electronicSignatures)
    .where(eq(electronicSignatures.documentId, id));
  await db
    .delete(signatureAuditLog)
    .where(eq(signatureAuditLog.documentId, id));
  await deleteSingleWithRecycle(db, {
    table: documents,
    idColumn: documents.id,
    id,
    entityType: "文件",
    sourceTable: "documents",
    deletedBy,
  });
}

// ==================== 产品管理 CRUD ====================

export async function getProducts(params?: {
  search?: string;
  status?: string;
  salePermission?: string;
  procurePermission?: string;
  isSterilized?: boolean;
  companyId?: number;
  includeSourceLibrary?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = params?.companyId
    ? normalizeCompanyId(params.companyId, mainCompanyId)
    : null;
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(products.code, `%${params.search}%`),
        like(products.name, `%${params.search}%`),
        like(products.medicalInsuranceCode, `%${params.search}%`)
      )
    );
  }
  if (params?.status) {
    conditions.push(
      eq(products.status, params.status as "draft" | "active" | "discontinued")
    );
  }
  if (params?.salePermission) {
    conditions.push(
      eq(
        products.salePermission,
        params.salePermission as "saleable" | "not_saleable"
      )
    );
  }
  if (params?.procurePermission) {
    conditions.push(
      eq(
        products.procurePermission,
        params.procurePermission as "purchasable" | "production_only"
      )
    );
  }
  if (params?.isSterilized !== undefined) {
    conditions.push(eq(products.isSterilized, params.isSterilized));
  }
  const baseQuery = db.select().from(products);
  const runCompanyQuery = async (companyId?: number) => {
    const nextConditions = [...conditions];
    if (companyId) {
      nextConditions.push(eq((products as any).companyId, companyId));
    }
    let query = baseQuery;
    if (nextConditions.length > 0) {
      query = query.where(and(...nextConditions)) as typeof query;
    }
    return await query
      .orderBy(desc(products.createdAt))
      .limit(resolveEntityListLimit(params?.limit))
      .offset(params?.offset || 0);
  };

  if (!scopedCompanyId) {
    return await runCompanyQuery();
  }
  if (scopedCompanyId === mainCompanyId) {
    return await runCompanyQuery(scopedCompanyId);
  }

  const localProducts = await runCompanyQuery(scopedCompanyId);
  if (params?.includeSourceLibrary === false) {
    return localProducts;
  }
  const sourceProducts = await runCompanyQuery(mainCompanyId);
  const localSourceIds = new Set(
    localProducts
      .map((item: any) => Number((item as any).sourceProductId || 0))
      .filter((id: number) => Number.isFinite(id) && id > 0)
  );
  const merged = [...localProducts];
  for (const source of sourceProducts as any[]) {
    if (localSourceIds.has(Number(source.id))) continue;
    merged.push(source);
  }
  return merged;
}

export async function getProductById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);

  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (result.length === 0) return undefined;
  const row: any = result[0];
  if (!companyId) return row;
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(companyId, mainCompanyId);
  if (
    Number(row.companyId || mainCompanyId) === scopedCompanyId ||
    Number(row.companyId || mainCompanyId) === mainCompanyId
  ) {
    return row;
  }
  return undefined;
}

// 产品分类前缀映射
export const PRODUCT_CATEGORY_PREFIX: Record<string, string> = {
  ...PRODUCT_CATEGORY_PREFIXES,
};

// 获取下一个产品编码（根据前缀自动递增，默认 CP）
export async function getNextProductCode(
  prefix: string = "CP"
): Promise<string> {
  const db = await getDb();
  if (!db) return `${prefix}-00001`;
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const result = await db
    .select({ code: products.code })
    .from(products)
    .where(like(products.code, `${prefix}-%`));
  let maxNum = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const row of result) {
    const match = row.code.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(5, "0")}`;
}

// 校验产品编码是否已存在（excludeId 用于编辑时排除自身）
export async function isProductCodeExists(
  code: string,
  excludeId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const result = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.code, code))
    .limit(1);
  if (result.length === 0) return false;
  if (excludeId !== undefined && result[0].id === excludeId) return false;
  return true;
}

async function buildCompanyProductCode(
  db: ReturnType<typeof drizzle>,
  sourceCode: string,
  companyId: number
) {
  const base = String(sourceCode || "").trim() || "CP";
  const compactBase = base.slice(0, 36);
  const candidates = [
    `${compactBase}-C${companyId}`,
    `C${companyId}-${compactBase}`,
  ];
  for (const candidate of candidates) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.code, candidate))
      .limit(1);
    if (!rows[0]) return candidate;
  }
  let seq = 1;
  while (seq < 10000) {
    const candidate = `${compactBase.slice(0, 30)}-C${companyId}-${seq}`;
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.code, candidate))
      .limit(1);
    if (!rows[0]) return candidate;
    seq += 1;
  }
  return `${Date.now()}`;
}

function allocateCompanyProductCode(
  sourceCode: string,
  companyId: number,
  usedCodes: Set<string>
) {
  const base = String(sourceCode || "").trim() || "CP";
  const compactBase = base.slice(0, 36);
  const candidates = [
    `${compactBase}-C${companyId}`,
    `C${companyId}-${compactBase}`,
  ];
  for (const candidate of candidates) {
    if (!usedCodes.has(candidate)) return candidate;
  }
  let seq = 1;
  while (seq < 10000) {
    const candidate = `${compactBase.slice(0, 30)}-C${companyId}-${seq}`;
    if (!usedCodes.has(candidate)) return candidate;
    seq += 1;
  }
  return `${compactBase.slice(0, 18)}-C${companyId}-${Date.now()}`.slice(
    0,
    50
  );
}

export async function ensureCompanyProductCopy(
  sourceProductId: number,
  companyId: number,
  operatorId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(companyId, mainCompanyId);
  const [source] = await db
    .select()
    .from(products)
    .where(eq(products.id, sourceProductId))
    .limit(1);
  if (!source) throw new Error("未找到来源产品");
  const sourceCompanyId = Number((source as any).companyId || mainCompanyId);
  if (sourceCompanyId === scopedCompanyId) return source;

  const [existing] = await db
    .select()
    .from(products)
    .where(
      and(
        eq((products as any).companyId, scopedCompanyId),
        eq((products as any).sourceProductId, Number(source.id))
      )
    )
    .limit(1);
  if (existing) return existing;

  const code = await buildCompanyProductCode(
    db,
    String(source.code || "CP"),
    scopedCompanyId
  );
  const insertResult = await db.insert(products).values({
    ...(source as any),
    id: undefined,
    code,
    companyId: scopedCompanyId,
    sourceCompanyId,
    sourceProductId: Number(source.id),
    isSyncedFromMain: sourceCompanyId === mainCompanyId,
    createdBy: operatorId ?? null,
    createdAt: undefined,
    updatedAt: undefined,
  });
  const insertedId = Number(insertResult[0]?.insertId || 0);
  const [inserted] = insertedId
    ? await db
        .select()
        .from(products)
        .where(eq(products.id, insertedId))
        .limit(1)
    : [];
  return inserted || source;
}

export async function syncCompanyProductsFromMain(
  companyId: number,
  operatorId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(companyId, mainCompanyId);
  if (scopedCompanyId === mainCompanyId) {
    return { created: 0, existing: 0, total: 0 };
  }

  const [sourceProducts, existingCopies, existingCodes] = await Promise.all([
    db
      .select()
      .from(products)
      .where(eq((products as any).companyId, mainCompanyId))
      .orderBy(desc(products.createdAt)),
    db
      .select({
        sourceProductId: (products as any).sourceProductId,
      })
      .from(products)
      .where(
        and(
          eq((products as any).companyId, scopedCompanyId),
          isNotNull((products as any).sourceProductId)
        )
      ),
    db.select({ code: products.code }).from(products),
  ]);

  const existingSourceIds = new Set(
    existingCopies
      .map(row => Number((row as any).sourceProductId || 0))
      .filter(id => Number.isFinite(id) && id > 0)
  );
  const usedCodes = new Set(
    existingCodes
      .map(row => String(row.code || "").trim())
      .filter(code => code.length > 0)
  );

  const insertRows: InsertProduct[] = [];
  let existing = 0;

  for (const source of sourceProducts as any[]) {
    const sourceId = Number(source.id || 0);
    if (!Number.isFinite(sourceId) || sourceId <= 0) continue;
    if (existingSourceIds.has(sourceId)) {
      existing += 1;
      continue;
    }
    const code = allocateCompanyProductCode(
      String(source.code || "CP"),
      scopedCompanyId,
      usedCodes
    );
    usedCodes.add(code);
    insertRows.push({
      ...(source as any),
      id: undefined,
      code,
      companyId: scopedCompanyId,
      sourceCompanyId: mainCompanyId,
      sourceProductId: sourceId,
      isSyncedFromMain: true,
      createdBy: operatorId ?? null,
      createdAt: undefined,
      updatedAt: undefined,
    });
  }

  for (let i = 0; i < insertRows.length; i += 200) {
    await db.insert(products).values(insertRows.slice(i, i + 200) as any);
  }

  return {
    created: insertRows.length,
    existing,
    total: sourceProducts.length,
  };
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const nextData = {
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  } as InsertProduct;

  // 校验编码唯一性
  const exists = await isProductCodeExists(nextData.code);
  if (exists)
    throw new Error(`产品编码 ${nextData.code} 已存在，请使用其他编码`);

  const result = await db.insert(products).values(nextData);
  return result[0].insertId;
}

export async function updateProduct(
  id: number,
  data: Partial<InsertProduct>,
  companyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = companyId
    ? normalizeCompanyId(companyId, mainCompanyId)
    : null;
  const [current] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!current) throw new Error("未找到产品");
  if (
    scopedCompanyId &&
    Number((current as any).companyId || mainCompanyId) !== scopedCompanyId
  ) {
    throw new Error("只能修改当前公司的产品");
  }

  await db.update(products).set(data).where(eq(products.id, id));
  await syncOpenProductReferenceSnapshots(id, db);
}

export async function deleteProduct(
  id: number,
  companyId?: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = companyId
    ? normalizeCompanyId(companyId, mainCompanyId)
    : null;
  const [current] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!current) throw new Error("未找到产品");
  if (
    scopedCompanyId &&
    Number((current as any).companyId || mainCompanyId) !== scopedCompanyId
  ) {
    throw new Error("只能删除当前公司的产品");
  }
  // 级联删除：所有引用该产品的子表
  await db.delete(bom).where(eq(bom.productId, id));
  await db
    .delete(productSupplierPrices)
    .where(eq(productSupplierPrices.productId, id));
  await db
    .delete(materialRequestItems)
    .where(eq(materialRequestItems.productId, id));
  await db.delete(salesOrderItems).where(eq(salesOrderItems.productId, id));
  await db
    .delete(purchaseOrderItems)
    .where(eq(purchaseOrderItems.productId, id));
  await db.delete(productionRecords).where(eq(productionRecords.productId, id));
  await db
    .delete(productionRoutingCards)
    .where(eq(productionRoutingCards.productId, id));
  await db
    .delete(sterilizationOrders)
    .where(eq(sterilizationOrders.productId, id));
  await db
    .delete(productionWarehouseEntries)
    .where(eq(productionWarehouseEntries.productId, id));
  await db.delete(productionPlans).where(eq(productionPlans.productId, id));
  await db.delete(qualityIncidents).where(eq(qualityIncidents.productId, id));
  await db.delete(samples).where(eq(samples.productId, id));
  await db.delete(inventory).where(eq(inventory.productId, id));
  await deleteSingleWithRecycle(db, {
    table: products,
    idColumn: products.id,
    id,
    entityType: "产品",
    sourceTable: "products",
    deletedBy,
  });
}

// ==================== 客户管理 CRUD ====================

// 获取下一个客户编码（默认 KH-00001 格式）
export async function getNextCustomerCode(
  prefix: string = "KH"
): Promise<string> {
  if (String(prefix || "").trim().toUpperCase() === "KH") {
    return await allocateManagedCodeRuleNo("客户管理");
  }
  const db = await getDb();
  if (!db) return `${prefix}-00001`;

  const result = await db
    .select({ code: customers.code })
    .from(customers)
    .where(like(customers.code, `${prefix}-%`));

  let maxNum = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const row of result) {
    const match = row.code.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${prefix}-${String(maxNum + 1).padStart(5, "0")}`;
}

const LOGO_DOMAIN_SOURCE_PREFIX = "__LG__:";
const SOURCE_MAX_LENGTH = 50;
const GENERIC_EMAIL_DOMAINS = new Set([
  "qq.com",
  "163.com",
  "126.com",
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "foxmail.com",
  "sina.com",
  "yeah.net",
]);

function normalizeDomain(raw: unknown): string | undefined {
  const text = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!text) return undefined;
  const withoutProtocol = text.replace(/^https?:\/\//, "");
  const domainPart = withoutProtocol
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .trim();
  const domain = domainPart.startsWith("www.")
    ? domainPart.slice(4)
    : domainPart;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain))
    return undefined;
  return domain;
}

function extractDomainFromEmail(email: unknown): string | undefined {
  const text = String(email ?? "")
    .trim()
    .toLowerCase();
  const match = text.match(/^[^@\s]+@([^@\s]+\.[^@\s]+)$/);
  if (!match) return undefined;
  const domain = normalizeDomain(match[1]);
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return undefined;
  return domain;
}

function extractLogoDomainFromSource(source: unknown): string | undefined {
  const text = String(source ?? "");
  const match = text.match(/__LG__:([^|]+)/);
  return normalizeDomain(match?.[1]);
}

function stripLogoDomainFromSource(source: unknown): string {
  return String(source ?? "")
    .replace(/__LG__:[^|]*/g, "")
    .replace(/\|\|+/g, "|")
    .replace(/^\|+|\|+$/g, "")
    .trim();
}

function mergeSourceWithLogoDomain(
  source: unknown,
  domain: string
): string | undefined {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return stripLogoDomainFromSource(source) || undefined;
  const cleaned = stripLogoDomainFromSource(source);
  const logoMarker = `${LOGO_DOMAIN_SOURCE_PREFIX}${normalizedDomain}`;
  const merged = cleaned ? `${cleaned}|${logoMarker}` : logoMarker;
  if (merged.length > SOURCE_MAX_LENGTH) return cleaned || undefined;
  return merged;
}

function buildCustomerLogoUrl(source: unknown, email: unknown): string | null {
  const domain =
    extractLogoDomainFromSource(source) || extractDomainFromEmail(email);
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

async function ensureCustomersTaxRateColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || customersTaxRateColumnReady) return;
  try {
    const result = await db.execute(
      sql.raw("SHOW COLUMNS FROM customers LIKE 'taxRate'")
    );
    const rows = Array.isArray((result as any)?.[0])
      ? (result as any)[0]
      : (result as any);
    if (Array.from(rows as any[]).length === 0) {
      await db.execute(
        sql.raw(
          "ALTER TABLE customers ADD COLUMN taxRate DECIMAL(5,2) NULL DEFAULT 13.00 AFTER taxNo"
        )
      );
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060/i.test(message)) {
      console.warn("[ensureCustomersTaxRateColumn] failed:", message);
    }
  }
  customersTaxRateColumnReady = true;
}

async function searchCompanyDomainByName(
  name: string
): Promise<string | undefined> {
  const keyword = String(name ?? "").trim();
  if (!keyword) return undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(keyword)}`,
      {
        signal: controller.signal,
      }
    );
    if (!resp.ok) return undefined;
    const rows = (await resp.json()) as Array<{ domain?: string }>;
    for (const row of rows || []) {
      const domain = normalizeDomain(row?.domain);
      if (domain) return domain;
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function enrichCustomerLogoDomain(
  customerId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      source: customers.source,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  const customer = rows[0];
  if (!customer) return;
  if (extractLogoDomainFromSource(customer.source)) return;

  let domain = extractDomainFromEmail(customer.email);
  if (!domain) {
    domain = await searchCompanyDomainByName(customer.name);
  }
  if (!domain) return;

  const nextSource = mergeSourceWithLogoDomain(customer.source, domain);
  if (nextSource === undefined) return;
  if (nextSource === String(customer.source ?? "")) return;
  await db
    .update(customers)
    .set({ source: nextSource })
    .where(eq(customers.id, customerId));
}

export async function getCustomers(params?: {
  search?: string;
  type?: string;
  status?: string;
  salesPersonId?: number;
  salesPersonIds?: number[];
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCustomersTaxRateColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(customers.code, `%${params.search}%`),
        like(customers.name, `%${params.search}%`)
      )
    );
  }

  if (params?.type) {
    conditions.push(
      eq(
        customers.type,
        params.type as "hospital" | "dealer" | "domestic" | "overseas"
      )
    );
  }

  if (params?.status) {
    conditions.push(
      eq(customers.status, params.status as "active" | "inactive" | "blacklist")
    );
  }
  if (params?.salesPersonId) {
    conditions.push(eq(customers.salesPersonId, params.salesPersonId));
  } else if (params?.salesPersonIds?.length) {
    conditions.push(inArray(customers.salesPersonId, params.salesPersonIds));
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        (customers as any).companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }

  let query = db
    .select({
      id: customers.id,
      code: customers.code,
      name: customers.name,
      shortName: customers.shortName,
      type: customers.type,
      contactPerson: customers.contactPerson,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      province: customers.province,
      city: customers.city,
      country: customers.country,
      paymentTerms: customers.paymentTerms,
      currency: customers.currency,
      creditLimit: customers.creditLimit,
      taxNo: customers.taxNo,
      taxRate: customers.taxRate,
      bankAccount: customers.bankAccount,
      bankName: customers.bankName,
      status: customers.status,
      source: customers.source,
      needInvoice: customers.needInvoice,
      salesPersonId: customers.salesPersonId,
      salesPersonName: users.name,
      createdBy: customers.createdBy,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .leftJoin(users, eq(customers.salesPersonId, users.id));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query
    .orderBy(desc(customers.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  return result.map(item => ({
    ...item,
    logoUrl: buildCustomerLogoUrl(item.source, item.email),
  }));
}

export async function getCustomerById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureCustomersTaxRateColumn(db);
  await ensureCollaborationDataModel(db);

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  if (result.length === 0) return undefined;
  const row = result[0];
  if (companyId) {
    const mainCompanyId = await getMainCompanyId(db);
    const scopedCompanyId = normalizeCompanyId(companyId, mainCompanyId);
    if (Number((row as any).companyId || mainCompanyId) !== scopedCompanyId) {
      return undefined;
    }
  }
  return {
    ...row,
    logoUrl: buildCustomerLogoUrl(row.source, row.email),
  };
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCustomersTaxRateColumn(db);
  await ensureCollaborationDataModel(db);
  const targetCompanyId = await normalizeCustomerOwnerCompanyId(db, data);

  const result = await db.insert(customers).values({
    ...data,
    companyId: targetCompanyId,
  } as InsertCustomer);
  return result[0].insertId;
}

export async function updateCustomer(
  id: number,
  data: Partial<InsertCustomer>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCustomersTaxRateColumn(db);
  await ensureCollaborationDataModel(db);
  const [existing] = await db
    .select({
      id: customers.id,
      companyId: (customers as any).companyId,
      linkedCompanyId: (customers as any).linkedCompanyId,
      type: customers.type,
    })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  if (!existing) {
    throw new Error("客户不存在");
  }

  const merged = {
    ...existing,
    ...data,
  } as Partial<InsertCustomer> & { companyId?: number | null };
  const targetCompanyId = await normalizeCustomerOwnerCompanyId(db, merged);

  await db
    .update(customers)
    .set({
      ...data,
      companyId: targetCompanyId,
    })
    .where(eq(customers.id, id));
}

export async function deleteCustomer(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：应收账款、经销商资质、报关单、收款记录、销售订单及其子表
  await db
    .delete(accountsReceivable)
    .where(eq(accountsReceivable.customerId, id));
  await db
    .delete(dealerQualifications)
    .where(eq(dealerQualifications.customerId, id));
  await db
    .delete(customsDeclarations)
    .where(eq(customsDeclarations.customerId, id));
  await db.delete(paymentRecords).where(eq(paymentRecords.customerId, id));
  // 删除关联销售订单及其子表
  const relatedOrders = await db
    .select({ id: salesOrders.id })
    .from(salesOrders)
    .where(eq(salesOrders.customerId, id));
  for (const order of relatedOrders) {
    await db
      .delete(salesOrderItems)
      .where(eq(salesOrderItems.orderId, order.id));
    await db
      .delete(orderApprovals)
      .where(
        and(
          eq(orderApprovals.orderId, order.id),
          eq(orderApprovals.orderType, "sales")
        )
      );
    await db
      .delete(productionPlans)
      .where(eq(productionPlans.salesOrderId, order.id));
  }
  await db.delete(salesOrders).where(eq(salesOrders.customerId, id));
  await deleteSingleWithRecycle(db, {
    table: customers,
    idColumn: customers.id,
    id,
    entityType: "客户",
    sourceTable: "customers",
    deletedBy,
  });
}

// ==================== 供应商管理 CRUD ====================

export async function getSuppliers(params?: {
  search?: string;
  type?: string;
  status?: string;
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureSuppliersCreditDaysColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  let query = db.select().from(suppliers);
  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(suppliers.code, `%${params.search}%`),
        like(suppliers.name, `%${params.search}%`),
        like(suppliers.contactPerson, `%${params.search}%`),
        like(suppliers.phone, `%${params.search}%`),
        like(suppliers.email, `%${params.search}%`),
        like(suppliers.address, `%${params.search}%`)
      )
    );
  }

  if (params?.type) {
    conditions.push(
      eq(suppliers.type, params.type as "material" | "equipment" | "service")
    );
  }

  if (params?.status) {
    conditions.push(
      eq(
        suppliers.status,
        params.status as "qualified" | "pending" | "disqualified"
      )
    );
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        (suppliers as any).companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query
    .orderBy(desc(suppliers.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  return result;
}

export async function getSupplierById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureSuppliersCreditDaysColumn(db);
  await ensureCollaborationDataModel(db);

  const result = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id))
    .limit(1);
  if (result.length === 0) return undefined;
  if (companyId) {
    const mainCompanyId = await getMainCompanyId(db);
    if (
      Number((result[0] as any).companyId || mainCompanyId) !==
      normalizeCompanyId(companyId, mainCompanyId)
    ) {
      return undefined;
    }
  }
  return result[0];
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSuppliersCreditDaysColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const result = await db.insert(suppliers).values({
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  } as InsertSupplier);
  return result[0].insertId;
}

export async function updateSupplier(
  id: number,
  data: Partial<InsertSupplier>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSuppliersCreditDaysColumn(db);
  await ensureCollaborationDataModel(db);

  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：应付账款、供应商价格、委外灭菌单、付款记录、采购订单及其子表
  await db.delete(accountsPayable).where(eq(accountsPayable.supplierId, id));
  await db
    .delete(productSupplierPrices)
    .where(eq(productSupplierPrices.supplierId, id));
  await db
    .delete(sterilizationOrders)
    .where(eq(sterilizationOrders.supplierId, id));
  await db.delete(paymentRecords).where(eq(paymentRecords.supplierId, id));
  // 删除关联采购订单及其子表
  const relatedPOs = await db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.supplierId, id));
  for (const po of relatedPOs) {
    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, po.id));
    await db
      .delete(orderApprovals)
      .where(
        and(
          eq(orderApprovals.orderId, po.id),
          eq(orderApprovals.orderType, "purchase")
        )
      );
  }
  await db.delete(purchaseOrders).where(eq(purchaseOrders.supplierId, id));
  await db
    .delete(supplierProfileRecords)
    .where(eq(supplierProfileRecords.supplierId, id));
  await deleteSingleWithRecycle(db, {
    table: suppliers,
    idColumn: suppliers.id,
    id,
    entityType: "供应商",
    sourceTable: "suppliers",
    deletedBy,
  });
}

export async function getSupplierProfileRecords(params?: {
  search?: string;
  supplierId?: number;
  formType?: "survey" | "annual_evaluation" | "quality_agreement";
  status?: "draft" | "completed";
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureSupplierProfileRecordsTable(db);
  const mainCompanyId = await getMainCompanyId(db);

  let query = db.select().from(supplierProfileRecords);
  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(supplierProfileRecords.recordNo, `%${params.search}%`),
        like(supplierProfileRecords.supplierName, `%${params.search}%`),
        like(supplierProfileRecords.serialNo, `%${params.search}%`)
      )
    );
  }
  if (params?.supplierId) {
    conditions.push(eq(supplierProfileRecords.supplierId, params.supplierId));
  }
  if (params?.formType) {
    conditions.push(eq(supplierProfileRecords.formType, params.formType));
  }
  if (params?.status) {
    conditions.push(eq(supplierProfileRecords.status, params.status));
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        supplierProfileRecords.companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query
    .orderBy(desc(supplierProfileRecords.updatedAt), desc(supplierProfileRecords.id))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  return rows.map(normalizeSupplierProfileRecord);
}

export async function getSupplierProfileRecordById(
  id: number,
  companyId?: number
) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureSupplierProfileRecordsTable(db);
  const mainCompanyId = await getMainCompanyId(db);

  const rows = await db
    .select()
    .from(supplierProfileRecords)
    .where(eq(supplierProfileRecords.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;
  if (
    companyId &&
    Number(row.companyId || mainCompanyId) !==
      normalizeCompanyId(companyId, mainCompanyId)
  ) {
    return undefined;
  }
  return normalizeSupplierProfileRecord(row);
}

export async function createSupplierProfileRecord(
  data: InsertSupplierProfileRecord & { formData?: any }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSupplierProfileRecordsTable(db);
  const mainCompanyId = await getMainCompanyId(db);
  const normalizedFormType =
    (data.formType as "survey" | "annual_evaluation" | "quality_agreement") ||
    "survey";
  const recordNo =
    data.recordNo || (await getNextSupplierProfileRecordNo(normalizedFormType, db));
  const templateCode =
    data.templateCode || getSupplierProfileTemplateCode(normalizedFormType);
  const title = data.title || getSupplierProfileTitle(normalizedFormType);

  const result = await db.insert(supplierProfileRecords).values({
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
    recordNo,
    templateCode,
    title,
    formData: JSON.stringify((data as any).formData || {}),
  } as InsertSupplierProfileRecord);

  return result[0].insertId;
}

export async function updateSupplierProfileRecord(
  id: number,
  data: Partial<InsertSupplierProfileRecord> & { formData?: any }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSupplierProfileRecordsTable(db);

  const updatePayload: Record<string, any> = { ...data };
  if (Object.prototype.hasOwnProperty.call(data, "formData")) {
    updatePayload.formData = JSON.stringify((data as any).formData || {});
  }
  if (data.formType && !data.templateCode) {
    updatePayload.templateCode = getSupplierProfileTemplateCode(data.formType);
  }
  if (data.formType && !data.title) {
    updatePayload.title = getSupplierProfileTitle(data.formType);
  }

  await db
    .update(supplierProfileRecords)
    .set(updatePayload)
    .where(eq(supplierProfileRecords.id, id));
}

export async function deleteSupplierProfileRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSupplierProfileRecordsTable(db);
  await db.delete(supplierProfileRecords).where(eq(supplierProfileRecords.id, id));
}

// ==================== 销售订单 CRUD ====================

export async function getSalesOrders(params?: {
  search?: string;
  status?: string;
  customerId?: number;
  salesPersonId?: number;
  salesPersonIds?: number[];
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureSalesOrdersTradeFields(db);
  await ensureUsersEnglishNameColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(salesOrders.orderNo, `%${params.search}%`),
        like(customers.name, `%${params.search}%`)
      )
    );
  }

  if (params?.status && params.status !== "all") {
    conditions.push(
      eq(
        salesOrders.status,
        params.status as
          | "draft"
          | "pending_review"
          | "approved"
          | "in_production"
          | "ready_to_ship"
          | "shipped"
          | "completed"
          | "cancelled"
      )
    );
  }

  if (params?.customerId) {
    conditions.push(eq(salesOrders.customerId, params.customerId));
  }
  if (params?.salesPersonId) {
    conditions.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  } else if (params?.salesPersonIds?.length) {
    conditions.push(inArray(salesOrders.salesPersonId, params.salesPersonIds));
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        (salesOrders as any).companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }

  const baseQuery = db
    .select({
      id: salesOrders.id,
      orderNo: salesOrders.orderNo,
      customerId: salesOrders.customerId,
      customerName: customers.name,
      customerCode: customers.code,
      customerType: customers.type,
      country: customers.country,
      contactPerson: customers.contactPerson,
      phone: customers.phone,
      orderDate: salesOrders.orderDate,
      deliveryDate: salesOrders.deliveryDate,
      totalAmount: salesOrders.totalAmount,
      currency: salesOrders.currency,
      exchangeRate: salesOrders.exchangeRate,
      paymentMethod: salesOrders.paymentMethod,
      productTypeCount: sql<number>`(
        SELECT COUNT(DISTINCT soi.productId)
        FROM sales_order_items soi
        WHERE soi.orderId = ${salesOrders.id}
      )`,
      status: salesOrders.status,
      paymentStatus: salesOrders.paymentStatus,
      shippingAddress: salesOrders.shippingAddress,
      shippingContact: salesOrders.shippingContact,
      shippingPhone: salesOrders.shippingPhone,
      needsShipping: salesOrders.needsShipping,
      shippingFee: salesOrders.shippingFee,
      tradeTerm: salesOrders.tradeTerm,
      receiptAccountId: salesOrders.receiptAccountId,
      receiptAccountName: bankAccounts.accountName,
      isExport: salesOrders.isExport,
      remark: salesOrders.remark,
      salesPersonId: salesOrders.salesPersonId,
      salesPersonName: users.name,
      salesPersonEnglishName: users.englishName,
      createdBy: salesOrders.createdBy,
      createdAt: salesOrders.createdAt,
      updatedAt: salesOrders.updatedAt,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(users, eq(salesOrders.salesPersonId, users.id))
    .leftJoin(bankAccounts, eq(salesOrders.receiptAccountId, bankAccounts.id));

  const query =
    conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  const result = await query
    .orderBy(desc(salesOrders.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  return result;
}

export async function getSalesOrderById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureSalesOrdersTradeFields(db);
  await ensureUsersEnglishNameColumn(db);
  await ensureCollaborationDataModel(db);

  // join customers 表，订单付款条件为空时回退到客户档案
  const result = await db
    .select({
      id: salesOrders.id,
      orderNo: salesOrders.orderNo,
      customerId: salesOrders.customerId,
      customerName: customers.name,
      customerCode: customers.code,
      customerType: customers.type,
      country: customers.country,
      // 联系人：订单收货联系人优先，空则回退到客户档案
      contactPerson: sql<
        string | null
      >`COALESCE(NULLIF(${salesOrders.shippingContact}, ''), ${customers.contactPerson})`,
      phone: sql<
        string | null
      >`COALESCE(NULLIF(${salesOrders.shippingPhone}, ''), ${customers.phone})`,
      // 付款条件：订单自身优先，空则回退到客户档案
      paymentMethod: sql<
        string | null
      >`COALESCE(NULLIF(${salesOrders.paymentMethod}, ''), ${customers.paymentTerms})`,
      orderDate: salesOrders.orderDate,
      deliveryDate: salesOrders.deliveryDate,
      totalAmount: salesOrders.totalAmount,
      currency: salesOrders.currency,
      status: salesOrders.status,
      paymentStatus: salesOrders.paymentStatus,
      shippingAddress: salesOrders.shippingAddress,
      shippingContact: salesOrders.shippingContact,
      shippingPhone: salesOrders.shippingPhone,
      isExport: salesOrders.isExport,
      needsShipping: salesOrders.needsShipping,
      shippingFee: salesOrders.shippingFee,
      tradeTerm: salesOrders.tradeTerm,
      receiptAccountId: salesOrders.receiptAccountId,
      receiptAccountName: bankAccounts.accountName,
      customsStatus: salesOrders.customsStatus,
      remark: salesOrders.remark,
      salesPersonId: salesOrders.salesPersonId,
      salesPersonName: users.name,
      salesPersonEnglishName: users.englishName,
      createdBy: salesOrders.createdBy,
      createdAt: salesOrders.createdAt,
      updatedAt: salesOrders.updatedAt,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(users, eq(salesOrders.salesPersonId, users.id))
    .leftJoin(bankAccounts, eq(salesOrders.receiptAccountId, bankAccounts.id))
    .where(
      companyId
        ? and(
            eq(salesOrders.id, id),
            eq(
              (salesOrders as any).companyId,
              normalizeCompanyId(companyId, await getMainCompanyId(db))
            )
          )
        : eq(salesOrders.id, id)
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSalesOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: salesOrderItems.id,
      orderId: salesOrderItems.orderId,
      productId: salesOrderItems.productId,
      productCode: products.code,
      productName: products.name,
      specification: products.specification,
      quantity: salesOrderItems.quantity,
      unit: salesOrderItems.unit,
      unitPrice: salesOrderItems.unitPrice,
      amount: salesOrderItems.amount,
      deliveredQty: salesOrderItems.deliveredQty,
      remark: salesOrderItems.remark,
      createdAt: salesOrderItems.createdAt,
    })
    .from(salesOrderItems)
    .leftJoin(products, eq(salesOrderItems.productId, products.id))
    .where(eq(salesOrderItems.orderId, orderId));
}

export async function getSalesOrderItemsByOrderIds(orderIds: number[]) {
  const db = await getDb();
  if (!db) return [];

  const ids = Array.from(
    new Set(
      orderIds.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0)
    )
  );

  if (ids.length === 0) return [];

  return await db
    .select({
      id: salesOrderItems.id,
      orderId: salesOrderItems.orderId,
      productId: salesOrderItems.productId,
      productCode: products.code,
      productName: products.name,
      specification: products.specification,
      quantity: salesOrderItems.quantity,
      unit: salesOrderItems.unit,
      unitPrice: salesOrderItems.unitPrice,
      amount: salesOrderItems.amount,
      deliveredQty: salesOrderItems.deliveredQty,
      remark: salesOrderItems.remark,
      createdAt: salesOrderItems.createdAt,
    })
    .from(salesOrderItems)
    .leftJoin(products, eq(salesOrderItems.productId, products.id))
    .where(inArray(salesOrderItems.orderId, ids));
}

export async function createSalesOrder(
  data: InsertSalesOrder,
  items: InsertSalesOrderItem[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const result = await db.insert(salesOrders).values({
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  } as InsertSalesOrder);
  const orderId = result[0].insertId;

  if (items.length > 0) {
    const itemsWithOrderId = items.map(item => ({ ...item, orderId }));
    await db.insert(salesOrderItems).values(itemsWithOrderId);
  }

  return orderId;
}

export async function updateSalesOrder(
  id: number,
  data: Partial<InsertSalesOrder>,
  items?: InsertSalesOrderItem[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  await db.update(salesOrders).set(data).where(eq(salesOrders.id, id));

  if (items) {
    await db.delete(salesOrderItems).where(eq(salesOrderItems.orderId, id));
    if (items.length > 0) {
      const itemsWithOrderId = items.map(item => ({ ...item, orderId: id }));
      await db.insert(salesOrderItems).values(itemsWithOrderId);
    }
  }
}

export async function deleteSalesOrder(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：应收账款、审批记录、生产计划
  await db
    .delete(accountsReceivable)
    .where(eq(accountsReceivable.salesOrderId, id));
  await db
    .delete(orderApprovals)
    .where(
      and(eq(orderApprovals.orderId, id), eq(orderApprovals.orderType, "sales"))
    );
  await db.delete(productionPlans).where(eq(productionPlans.salesOrderId, id));
  await deleteBundleWithRecycle(db, {
    rootTable: salesOrders,
    rootIdColumn: salesOrders.id,
    rootId: id,
    entityType: "销售订单",
    rootTableName: "sales_orders",
    deletedBy,
    children: [
      {
        table: salesOrderItems,
        tableName: "sales_order_items",
        foreignKeyColumn: salesOrderItems.orderId,
      },
    ],
  });
}

// ==================== 销售历史价格查询 ====================

/**
 * 根据客户ID和产品ID列表，查询每个产品最近一次销售订单的单价和货币
 * 用于创建新订单时自动带入上次价格
 */
export async function getLastSalePrices(
  customerId: number,
  productIds: number[]
) {
  const db = await getDb();
  if (!db || productIds.length === 0) return [];

  // 对每个产品，查找该客户最近一笔订单中的单价
  const results: { productId: number; unitPrice: string; currency: string }[] =
    [];

  for (const productId of productIds) {
    const rows = await db
      .select({
        productId: salesOrderItems.productId,
        unitPrice: salesOrderItems.unitPrice,
        currency: salesOrders.currency,
        orderDate: salesOrders.orderDate,
      })
      .from(salesOrderItems)
      .innerJoin(salesOrders, eq(salesOrderItems.orderId, salesOrders.id))
      .where(
        and(
          eq(salesOrders.customerId, customerId),
          eq(salesOrderItems.productId, productId),
          isNotNull(salesOrderItems.unitPrice)
        )
      )
      .orderBy(desc(salesOrders.orderDate))
      .limit(1);

    if (rows.length > 0 && rows[0].unitPrice) {
      results.push({
        productId,
        unitPrice: rows[0].unitPrice,
        currency: rows[0].currency || "CNY",
      });
    }
  }

  return results;
}

// ==================== 销售报价单 CRUD ====================

export async function getSalesQuotes(params?: {
  search?: string;
  status?: string;
  customerId?: number;
  salesPersonId?: number;
  salesPersonIds?: number[];
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureSalesQuotesTables(db);
  await ensureUsersEnglishNameColumn(db);
  await ensureCollaborationDataModel(db);

  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(salesQuotes.quoteNo, `%${params.search}%`),
        like(customers.name, `%${params.search}%`)
      )
    );
  }

  if (params?.status && params.status !== "all") {
    conditions.push(
      eq(
        salesQuotes.status,
        params.status as
          | "draft"
          | "sent"
          | "accepted"
          | "rejected"
          | "expired"
          | "converted"
      )
    );
  }

  if (params?.customerId) {
    conditions.push(eq(salesQuotes.customerId, params.customerId));
  }

  if (params?.salesPersonId) {
    conditions.push(eq(salesQuotes.salesPersonId, params.salesPersonId));
  } else if (params?.salesPersonIds?.length) {
    conditions.push(inArray(salesQuotes.salesPersonId, params.salesPersonIds));
  }
  if (params?.companyId) {
    conditions.push(eq((salesQuotes as any).companyId, params.companyId));
  }

  const baseQuery = db
    .select({
      id: salesQuotes.id,
      quoteNo: salesQuotes.quoteNo,
      customerId: salesQuotes.customerId,
      customerName: customers.name,
      customerCode: customers.code,
      customerType: customers.type,
      country: customers.country,
      contactPerson: sql<
        string | null
      >`COALESCE(NULLIF(${salesQuotes.shippingContact}, ''), ${customers.contactPerson})`,
      phone: sql<
        string | null
      >`COALESCE(NULLIF(${salesQuotes.shippingPhone}, ''), ${customers.phone})`,
      quoteDate: salesQuotes.quoteDate,
      validUntil: salesQuotes.validUntil,
      deliveryDate: salesQuotes.deliveryDate,
      totalAmount: salesQuotes.totalAmount,
      totalAmountBase: salesQuotes.totalAmountBase,
      currency: salesQuotes.currency,
      exchangeRate: salesQuotes.exchangeRate,
      paymentMethod: salesQuotes.paymentMethod,
      productTypeCount: sql<number>`(
        SELECT COUNT(DISTINCT sqi.productId)
        FROM sales_quote_items sqi
        WHERE sqi.quoteId = ${salesQuotes.id}
      )`,
      status: salesQuotes.status,
      shippingAddress: salesQuotes.shippingAddress,
      shippingContact: salesQuotes.shippingContact,
      shippingPhone: salesQuotes.shippingPhone,
      tradeTerm: salesQuotes.tradeTerm,
      receiptAccountId: salesQuotes.receiptAccountId,
      receiptAccountName: bankAccounts.accountName,
      linkedOrderId: salesQuotes.linkedOrderId,
      remark: salesQuotes.remark,
      salesPersonId: salesQuotes.salesPersonId,
      salesPersonName: users.name,
      salesPersonEnglishName: users.englishName,
      createdBy: salesQuotes.createdBy,
      createdAt: salesQuotes.createdAt,
      updatedAt: salesQuotes.updatedAt,
    })
    .from(salesQuotes)
    .leftJoin(customers, eq(salesQuotes.customerId, customers.id))
    .leftJoin(users, eq(salesQuotes.salesPersonId, users.id))
    .leftJoin(bankAccounts, eq(salesQuotes.receiptAccountId, bankAccounts.id));

  const query =
    conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  return await query
    .orderBy(desc(salesQuotes.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getSalesQuoteById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureSalesQuotesTables(db);
  await ensureUsersEnglishNameColumn(db);
  await ensureCollaborationDataModel(db);
  const conditions = [eq(salesQuotes.id, id)];
  if (companyId) {
    conditions.push(eq((salesQuotes as any).companyId, companyId));
  }

  const result = await db
    .select({
      id: salesQuotes.id,
      quoteNo: salesQuotes.quoteNo,
      customerId: salesQuotes.customerId,
      customerName: customers.name,
      customerCode: customers.code,
      customerType: customers.type,
      country: customers.country,
      contactPerson: sql<
        string | null
      >`COALESCE(NULLIF(${salesQuotes.shippingContact}, ''), ${customers.contactPerson})`,
      phone: sql<
        string | null
      >`COALESCE(NULLIF(${salesQuotes.shippingPhone}, ''), ${customers.phone})`,
      quoteDate: salesQuotes.quoteDate,
      validUntil: salesQuotes.validUntil,
      deliveryDate: salesQuotes.deliveryDate,
      totalAmount: salesQuotes.totalAmount,
      totalAmountBase: salesQuotes.totalAmountBase,
      currency: salesQuotes.currency,
      exchangeRate: salesQuotes.exchangeRate,
      paymentMethod: sql<
        string | null
      >`COALESCE(NULLIF(${salesQuotes.paymentMethod}, ''), ${customers.paymentTerms})`,
      status: salesQuotes.status,
      shippingAddress: salesQuotes.shippingAddress,
      shippingContact: salesQuotes.shippingContact,
      shippingPhone: salesQuotes.shippingPhone,
      tradeTerm: salesQuotes.tradeTerm,
      receiptAccountId: salesQuotes.receiptAccountId,
      receiptAccountName: bankAccounts.accountName,
      linkedOrderId: salesQuotes.linkedOrderId,
      remark: salesQuotes.remark,
      salesPersonId: salesQuotes.salesPersonId,
      salesPersonName: users.name,
      salesPersonEnglishName: users.englishName,
      createdBy: salesQuotes.createdBy,
      createdAt: salesQuotes.createdAt,
      updatedAt: salesQuotes.updatedAt,
    })
    .from(salesQuotes)
    .leftJoin(customers, eq(salesQuotes.customerId, customers.id))
    .leftJoin(users, eq(salesQuotes.salesPersonId, users.id))
    .leftJoin(bankAccounts, eq(salesQuotes.receiptAccountId, bankAccounts.id))
    .where(and(...conditions))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getSalesQuoteItems(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureSalesQuotesTables(db);

  return await db
    .select({
      id: salesQuoteItems.id,
      quoteId: salesQuoteItems.quoteId,
      productId: salesQuoteItems.productId,
      productCode: products.code,
      productName: products.name,
      specification: products.specification,
      quantity: salesQuoteItems.quantity,
      unit: salesQuoteItems.unit,
      unitPrice: salesQuoteItems.unitPrice,
      amount: salesQuoteItems.amount,
      remark: salesQuoteItems.remark,
      createdAt: salesQuoteItems.createdAt,
    })
    .from(salesQuoteItems)
    .leftJoin(products, eq(salesQuoteItems.productId, products.id))
    .where(eq(salesQuoteItems.quoteId, quoteId));
}

export async function getSalesQuoteItemsByQuoteIds(quoteIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  await ensureSalesQuotesTables(db);

  const ids = Array.from(
    new Set(
      quoteIds.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0)
    )
  );

  if (ids.length === 0) return [];

  return await db
    .select({
      id: salesQuoteItems.id,
      quoteId: salesQuoteItems.quoteId,
      productId: salesQuoteItems.productId,
      productCode: products.code,
      productName: products.name,
      specification: products.specification,
      quantity: salesQuoteItems.quantity,
      unit: salesQuoteItems.unit,
      unitPrice: salesQuoteItems.unitPrice,
      amount: salesQuoteItems.amount,
      remark: salesQuoteItems.remark,
      createdAt: salesQuoteItems.createdAt,
    })
    .from(salesQuoteItems)
    .leftJoin(products, eq(salesQuoteItems.productId, products.id))
    .where(inArray(salesQuoteItems.quoteId, ids));
}

export async function createSalesQuote(
  data: InsertSalesQuote,
  items: InsertSalesQuoteItem[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSalesQuotesTables(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(
    (data as any).companyId,
    mainCompanyId
  );

  const result = await db.insert(salesQuotes).values({
    ...data,
    companyId: scopedCompanyId,
  });
  const quoteId = result[0].insertId;

  if (items.length > 0) {
    const itemsWithQuoteId = items.map(item => ({ ...item, quoteId }));
    await db.insert(salesQuoteItems).values(itemsWithQuoteId);
  }

  return quoteId;
}

export async function updateSalesQuote(
  id: number,
  data: Partial<InsertSalesQuote>,
  items?: InsertSalesQuoteItem[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSalesQuotesTables(db);

  await db.update(salesQuotes).set(data).where(eq(salesQuotes.id, id));

  if (items) {
    await db.delete(salesQuoteItems).where(eq(salesQuoteItems.quoteId, id));
    if (items.length > 0) {
      const itemsWithQuoteId = items.map(item => ({ ...item, quoteId: id }));
      await db.insert(salesQuoteItems).values(itemsWithQuoteId);
    }
  }
}

export async function deleteSalesQuote(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSalesQuotesTables(db);

  await deleteBundleWithRecycle(db, {
    rootTable: salesQuotes,
    rootIdColumn: salesQuotes.id,
    rootId: id,
    entityType: "销售报价单",
    rootTableName: "sales_quotes",
    deletedBy,
    children: [
      {
        table: salesQuoteItems,
        tableName: "sales_quote_items",
        foreignKeyColumn: salesQuoteItems.quoteId,
      },
    ],
  });
}

// ==================== 采购订单 CRUD ====================

export async function getPurchaseOrders(params?: {
  search?: string;
  status?: string;
  supplierId?: number;
  buyerId?: number;
  buyerIds?: number[];
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensurePurchaseOrdersSupplierNameColumn(db);
  await ensurePurchaseOrdersStatusEnum(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(purchaseOrders.orderNo, `%${params.search}%`),
        like(suppliers.name, `%${params.search}%`)
      )
    );
  }

  if (params?.status) {
    conditions.push(
      eq(
        purchaseOrders.status,
        params.status as
          | "draft"
          | "pending_approval"
          | "approved"
          | "rejected"
          | "issued"
          | "ordered"
          | "partial_received"
          | "received"
          | "completed"
          | "cancelled"
      )
    );
  }

  if (params?.supplierId) {
    conditions.push(eq(purchaseOrders.supplierId, params.supplierId));
  }

  if (params?.buyerId) {
    conditions.push(
      or(
        eq(purchaseOrders.buyerId, params.buyerId),
        eq(purchaseOrders.createdBy, params.buyerId)
      )
    );
  } else if (params?.buyerIds?.length) {
    conditions.push(
      or(
        inArray(purchaseOrders.buyerId, params.buyerIds),
        inArray(purchaseOrders.createdBy, params.buyerIds)
      )
    );
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        (purchaseOrders as any).companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }

  const baseQuery = db
    .select({
      id: purchaseOrders.id,
      orderNo: purchaseOrders.orderNo,
      supplierId: purchaseOrders.supplierId,
      supplierName: sql<string>`COALESCE(${purchaseOrders.supplierName}, ${suppliers.name})`,
      supplierCode: suppliers.code,
      contactPerson: suppliers.contactPerson,
      phone: suppliers.phone,
      orderDate: purchaseOrders.orderDate,
      expectedDate: purchaseOrders.expectedDate,
      totalAmount: purchaseOrders.totalAmount,
      currency: purchaseOrders.currency,
      totalAmountBase: purchaseOrders.totalAmountBase,
      exchangeRate: purchaseOrders.exchangeRate,
      materialRequestId: purchaseOrders.materialRequestId,
      status: purchaseOrders.status,
      paymentStatus: purchaseOrders.paymentStatus,
      remark: purchaseOrders.remark,
      buyerId: purchaseOrders.buyerId,
      createdBy: purchaseOrders.createdBy,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id));

  const query =
    conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  const result = await query
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  return result;
}

export async function getPurchaseOrderById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensurePurchaseOrdersSupplierNameColumn(db);
  await ensurePurchaseOrdersStatusEnum(db);
  await ensureCollaborationDataModel(db);

  const result = await db
    .select()
    .from(purchaseOrders)
    .where(
      companyId
        ? and(
            eq(purchaseOrders.id, id),
            eq(
              (purchaseOrders as any).companyId,
              normalizeCompanyId(companyId, await getMainCompanyId(db))
            )
          )
        : eq(purchaseOrders.id, id)
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPurchaseOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: purchaseOrderItems.id,
      orderId: purchaseOrderItems.orderId,
      productId: purchaseOrderItems.productId,
      materialCode: purchaseOrderItems.materialCode,
      materialName: purchaseOrderItems.materialName,
      specification: purchaseOrderItems.specification,
      quantity: purchaseOrderItems.quantity,
      unit: purchaseOrderItems.unit,
      unitPrice: purchaseOrderItems.unitPrice,
      amount: purchaseOrderItems.amount,
      receivedQty: purchaseOrderItems.receivedQty,
      remark: purchaseOrderItems.remark,
      createdAt: purchaseOrderItems.createdAt,
    })
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.orderId, orderId));
}

export async function getPurchaseOrderItemsByOrderIds(orderIds: number[]) {
  const db = await getDb();
  if (!db) return [];

  const ids = Array.from(
    new Set(
      orderIds.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0)
    )
  );

  if (ids.length === 0) return [];

  return await db
    .select({
      id: purchaseOrderItems.id,
      orderId: purchaseOrderItems.orderId,
      productId: purchaseOrderItems.productId,
      materialCode: purchaseOrderItems.materialCode,
      materialName: purchaseOrderItems.materialName,
      specification: purchaseOrderItems.specification,
      quantity: purchaseOrderItems.quantity,
      unit: purchaseOrderItems.unit,
      unitPrice: purchaseOrderItems.unitPrice,
      amount: purchaseOrderItems.amount,
      receivedQty: purchaseOrderItems.receivedQty,
      remark: purchaseOrderItems.remark,
      createdAt: purchaseOrderItems.createdAt,
    })
    .from(purchaseOrderItems)
    .where(inArray(purchaseOrderItems.orderId, ids));
}

export async function getPurchaseOrdersByProductId(
  productId: number,
  limit = 10
) {
  const db = await getDb();
  if (!db) return [];
  await ensurePurchaseOrdersSupplierNameColumn(db);

  return await db
    .select({
      id: purchaseOrders.id,
      orderNo: purchaseOrders.orderNo,
      supplierId: purchaseOrders.supplierId,
      supplierName: sql<string>`COALESCE(${purchaseOrders.supplierName}, ${suppliers.name})`,
      orderDate: purchaseOrders.orderDate,
      expectedDate: purchaseOrders.expectedDate,
      totalAmount: purchaseOrders.totalAmount,
      currency: purchaseOrders.currency,
      status: purchaseOrders.status,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrderItems)
    .innerJoin(
      purchaseOrders,
      eq(purchaseOrderItems.orderId, purchaseOrders.id)
    )
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrderItems.productId, productId))
    .orderBy(desc(purchaseOrders.orderDate), desc(purchaseOrders.createdAt))
    .limit(limit);
}

/**
 * 根据供应商ID和产品ID列表，查询每个产品最近一次采购订单的单价和货币
 * 用于创建新采购单时自动带入上次采购价
 */
export async function getLastPurchasePrices(
  supplierId: number,
  productIds: number[]
) {
  const db = await getDb();
  if (!db || productIds.length === 0) return [];

  const results: { productId: number; unitPrice: string; currency: string }[] =
    [];

  for (const productId of productIds) {
    const rows = await db
      .select({
        productId: purchaseOrderItems.productId,
        unitPrice: purchaseOrderItems.unitPrice,
        currency: purchaseOrders.currency,
        orderDate: purchaseOrders.orderDate,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrderItems)
      .innerJoin(
        purchaseOrders,
        eq(purchaseOrderItems.orderId, purchaseOrders.id)
      )
      .where(
        and(
          eq(purchaseOrders.supplierId, supplierId),
          eq(purchaseOrderItems.productId, productId),
          isNotNull(purchaseOrderItems.unitPrice)
        )
      )
      .orderBy(desc(purchaseOrders.orderDate), desc(purchaseOrders.createdAt))
      .limit(1);

    if (rows.length > 0 && rows[0].unitPrice) {
      results.push({
        productId,
        unitPrice: rows[0].unitPrice,
        currency: rows[0].currency || "CNY",
      });
    }
  }

  return results;
}

export async function getRecentPurchasePrices(productIds: number[], days = 30) {
  const db = await getDb();
  if (!db || productIds.length === 0) return [];

  const uniqueIds = Array.from(
    new Set(productIds.filter(id => Number.isFinite(id) && id > 0))
  );
  if (uniqueIds.length === 0) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const results: {
    productId: number;
    unitPrice: string;
    currency: string;
    orderNo: string;
    orderDate: string | null;
  }[] = [];

  for (const productId of uniqueIds) {
    const rows = await db
      .select({
        productId: purchaseOrderItems.productId,
        unitPrice: purchaseOrderItems.unitPrice,
        currency: purchaseOrders.currency,
        orderNo: purchaseOrders.orderNo,
        orderDate: purchaseOrders.orderDate,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrderItems)
      .innerJoin(
        purchaseOrders,
        eq(purchaseOrderItems.orderId, purchaseOrders.id)
      )
      .where(
        and(
          eq(purchaseOrderItems.productId, productId),
          isNotNull(purchaseOrderItems.unitPrice),
          gte(purchaseOrders.orderDate, cutoffDate as any),
          sql`${purchaseOrders.status} not in ('draft', 'cancelled')`
        )
      )
      .orderBy(desc(purchaseOrders.orderDate), desc(purchaseOrders.createdAt))
      .limit(1);

    if (rows.length > 0 && rows[0].unitPrice) {
      results.push({
        productId,
        unitPrice: String(rows[0].unitPrice),
        currency: rows[0].currency || "CNY",
        orderNo: rows[0].orderNo || "",
        orderDate: rows[0].orderDate ? String(rows[0].orderDate) : null,
      });
    }
  }

  return results;
}

export async function createPurchaseOrder(
  data: InsertPurchaseOrder,
  items: InsertPurchaseOrderItem[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePurchaseOrdersSupplierNameColumn(db);
  await ensurePurchaseOrdersStatusEnum(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const supplierName =
    data.supplierName ||
    (await getSupplierNameById(Number(data.supplierId), db));
  const orderNo = String(data.orderNo || "").trim()
    ? String(data.orderNo).trim()
    : await allocateManagedCodeRuleNo("采购订单");

  const result = await db.insert(purchaseOrders).values({
    ...data,
    orderNo,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
    supplierName,
  });
  const orderId = result[0].insertId;

  if (items.length > 0) {
    const itemsWithOrderId = items.map(item => ({ ...item, orderId }));
    await db.insert(purchaseOrderItems).values(itemsWithOrderId);
  }

  return orderId;
}

const AUTO_PURCHASE_PAYABLE_MARKER = "[AUTO_PURCHASE_PAYABLE]";

function buildAutoPurchasePayableRemark(orderNo: string) {
  return `${AUTO_PURCHASE_PAYABLE_MARKER}\n系统自动生成（采购订单 ${orderNo} 下达后自动创建应付）`;
}

function isAutoPurchasePayableRemark(remark: unknown) {
  return String(remark || "").includes(AUTO_PURCHASE_PAYABLE_MARKER);
}

function buildPurchasePayableRemark(
  orderNo: string,
  amount: unknown,
  paymentMethod: unknown
) {
  if (isAccountPeriodPaymentCondition(normalizePaymentCondition(paymentMethod))) {
    return buildAutoPurchasePayableRemark(orderNo);
  }
  return ensureFinanceTodoInRemark(buildAutoPurchasePayableRemark(orderNo), {
    amount,
    paymentMethod,
    remarks: "采购提交财务付款",
    bizType: "payable_payment",
    title: "财务付款处理",
  });
}

function stripPayablePaymentTodoFromRemark(remark: unknown) {
  return setFinanceTodoList(
    remark,
    parseFinanceTodoList(remark).filter(
      item => String(item.bizType || "") !== "payable_payment"
    )
  );
}

function sanitizePurchasePayableRemark(
  remark: unknown,
  orderNo: string,
  amount: unknown,
  paymentMethod: unknown
) {
  const baseRemark = String(remark ?? "").trim() || buildAutoPurchasePayableRemark(orderNo);
  if (isAccountPeriodPaymentCondition(normalizePaymentCondition(paymentMethod))) {
    return hasReceivedInvoiceEvidence(baseRemark)
      ? baseRemark
      : stripPayablePaymentTodoFromRemark(baseRemark);
  }
  return ensureFinanceTodoInRemark(baseRemark, {
    amount,
    paymentMethod,
    remarks: "采购提交财务付款",
    bizType: "payable_payment",
    title: "财务付款处理",
  });
}

function shouldEnsurePurchaseOrderPayableByStatus(status: unknown) {
  return ["issued", "ordered", "partial_received", "received", "completed"].includes(
    String(status || "")
  );
}

export async function ensureAccountsPayableForPurchaseOrder(
  purchaseOrderId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !purchaseOrderId) return 0;

  await ensureCollaborationDataModel(db);
  await ensureAccountsPayableSupplierNameColumn(db);
  await ensurePurchaseOrdersStatusEnum(db);

  const [order] = await db
    .select({
      id: purchaseOrders.id,
      companyId: (purchaseOrders as any).companyId,
      orderNo: purchaseOrders.orderNo,
      supplierId: purchaseOrders.supplierId,
      supplierName: purchaseOrders.supplierName,
      supplierPaymentTerms: suppliers.paymentTerms,
      orderDate: purchaseOrders.orderDate,
      expectedDate: purchaseOrders.expectedDate,
      totalAmount: purchaseOrders.totalAmount,
      totalAmountBase: purchaseOrders.totalAmountBase,
      exchangeRate: purchaseOrders.exchangeRate,
      currency: purchaseOrders.currency,
      status: purchaseOrders.status,
      createdBy: purchaseOrders.createdBy,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.id, purchaseOrderId))
    .limit(1);
  if (!order || !shouldEnsurePurchaseOrderPayableByStatus(order.status)) return 0;

  const mainCompanyId = await getMainCompanyId(db);
  const companyId = normalizeCompanyId(Number(order.companyId || 0), mainCompanyId);
  const supplierName =
    String(order.supplierName || "").trim() ||
    (await getSupplierNameById(Number(order.supplierId || 0), db));
  const amount = roundFinanceAmount(order.totalAmount);
  const amountBase =
    roundFinanceAmount(order.totalAmountBase) > 0
      ? roundFinanceAmount(order.totalAmountBase)
      : amount;
  const exchangeRate =
    Number(order.exchangeRate == null ? 1 : order.exchangeRate) > 0
      ? Number(order.exchangeRate)
      : 1;
  const paymentMethod =
    normalizePaymentCondition(order.supplierPaymentTerms) || "银行转账";

  const payableRows = await db
    .select({
      id: accountsPayable.id,
      remark: accountsPayable.remark,
      paidAmount: accountsPayable.paidAmount,
      status: accountsPayable.status,
    })
    .from(accountsPayable)
    .where(eq(accountsPayable.purchaseOrderId, purchaseOrderId))
    .orderBy(asc(accountsPayable.id));

  const autoRow = payableRows.find(row => isAutoPurchasePayableRemark(row.remark));
  const invoiceNo = `AP-${String(order.orderNo || purchaseOrderId)}`.slice(0, 50);
  const basePayload: Partial<InsertAccountsPayable> = {
    companyId,
    invoiceNo,
    supplierId: Number(order.supplierId || 0),
    supplierName,
    purchaseOrderId,
    amount: amount.toFixed(2),
    currency: String(order.currency || "CNY"),
    amountBase: amountBase.toFixed(2),
    exchangeRate: exchangeRate.toFixed(6),
    invoiceDate: (order.orderDate as any) || undefined,
    dueDate: ((order.expectedDate as any) || (order.orderDate as any)) || undefined,
    paymentMethod,
    remark: sanitizePurchasePayableRemark(
      buildAutoPurchasePayableRemark(String(order.orderNo || purchaseOrderId)),
      String(order.orderNo || purchaseOrderId),
      amount,
      paymentMethod
    ),
    createdBy: Number(order.createdBy || 0) || undefined,
  };

  if (autoRow) {
    await db
      .update(accountsPayable)
      .set(basePayload)
      .where(eq(accountsPayable.id, Number(autoRow.id)));
    await syncPurchaseOrderFinancialProgress(purchaseOrderId, db);
    return Number(autoRow.id);
  }

  if (payableRows.length > 0) {
    const fallbackRowId = Number(payableRows[0]?.id || 0);
    if (fallbackRowId > 0) {
      await db
        .update(accountsPayable)
        .set({
          ...basePayload,
          remark: sanitizePurchasePayableRemark(
            autoRow.remark || buildAutoPurchasePayableRemark(String(order.orderNo || purchaseOrderId)),
            String(order.orderNo || purchaseOrderId),
            amount,
            paymentMethod
          ),
        })
        .where(eq(accountsPayable.id, fallbackRowId));
    }
    await syncPurchaseOrderFinancialProgress(purchaseOrderId, db);
    return fallbackRowId;
  }

  const result = await db.insert(accountsPayable).values(basePayload as InsertAccountsPayable);
  const payableId = Number(result[0]?.insertId || 0);
  await syncPurchaseOrderFinancialProgress(purchaseOrderId, db);
  return payableId;
}

export async function createInternalSalesOrderFromPurchaseOrder(
  purchaseOrderId: number,
  operatorId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const [order] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, purchaseOrderId))
    .limit(1);
  if (!order) throw new Error("未找到采购订单");

  const sourceCompanyId = normalizeCompanyId(
    Number((order as any).companyId || 0),
    mainCompanyId
  );
  const internalCompanyId = Number((order as any).internalCompanyId || 0);
  const linkedSalesOrderId = Number((order as any).linkedSalesOrderId || 0);
  if (linkedSalesOrderId > 0) return linkedSalesOrderId;
  if (internalCompanyId <= 0 || internalCompanyId === sourceCompanyId) return 0;

  const customerId = await ensureInternalCustomerForCompany(
    db,
    internalCompanyId,
    sourceCompanyId
  );
  const items = await getPurchaseOrderItems(purchaseOrderId);
  const salesItems: InsertSalesOrderItem[] = [];

  for (const item of items as any[]) {
    const localProductId = Number(item.productId || 0);
    let targetProductId = localProductId;
    if (localProductId > 0) {
      const [localProduct] = await db
        .select()
        .from(products)
        .where(eq(products.id, localProductId))
        .limit(1);
      if (localProduct) {
        const localCompanyId = normalizeCompanyId(
          Number((localProduct as any).companyId || 0),
          mainCompanyId
        );
        if (localCompanyId !== internalCompanyId) {
          targetProductId =
            Number((localProduct as any).sourceProductId || 0) ||
            localProductId;
        }
      }
    }
    salesItems.push({
      orderId: 0,
      productId: targetProductId,
      quantity: String(item.quantity || "0"),
      unit: item.unit || undefined,
      unitPrice: item.unitPrice ? String(item.unitPrice) : undefined,
      amount: item.amount ? String(item.amount) : undefined,
      remark: item.remark || undefined,
    });
  }

  const salesOrderId = await createSalesOrder(
    {
      companyId: internalCompanyId,
      sourceCompanyId,
      sourcePurchaseOrderId: purchaseOrderId,
      customerId,
      orderDate: (order as any).orderDate,
      deliveryDate: (order as any).expectedDate || null,
      totalAmount: (order as any).totalAmount || null,
      currency: (order as any).currency || "CNY",
      paymentMethod: "账期支付",
      totalAmountBase: (order as any).totalAmountBase || null,
      exchangeRate: (order as any).exchangeRate || "1",
      status: "approved",
      paymentStatus: "unpaid",
      shippingAddress: null,
      shippingContact: null,
      shippingPhone: null,
      remark: `系统自动生成（协同公司采购单 ${String((order as any).orderNo || purchaseOrderId)}）`,
      salesPersonId: null,
      createdBy: operatorId ?? 0,
    } as InsertSalesOrder,
    salesItems
  );

  await db
    .update(purchaseOrders)
    .set({
      linkedSalesOrderId: salesOrderId,
      internalCompanyId,
    } as any)
    .where(eq(purchaseOrders.id, purchaseOrderId));

  return salesOrderId;
}

export async function createInternalPurchaseInboundFromSalesTransaction(params: {
  salesOrderId: number;
  documentNo?: string | null;
  batchNo?: string | null;
  productId?: number | null;
  itemName: string;
  quantity: string;
  unit?: string | null;
  operatorId?: number | null;
  remark?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const [salesOrder] = await db
    .select()
    .from(salesOrders)
    .where(eq(salesOrders.id, params.salesOrderId))
    .limit(1);
  if (!salesOrder) return 0;

  const targetCompanyId = Number((salesOrder as any).sourceCompanyId || 0);
  const sourcePurchaseOrderId = Number(
    (salesOrder as any).sourcePurchaseOrderId || 0
  );
  if (targetCompanyId <= 0 || sourcePurchaseOrderId <= 0) return 0;

  const warehouseId = await ensureVirtualWarehouseForCompanyInternal(
    db,
    targetCompanyId
  );
  let inboundProductId = Number(params.productId || 0);
  if (inboundProductId > 0) {
    const [sourceProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, inboundProductId))
      .limit(1);
    const sourceProductCompanyId = normalizeCompanyId(
      Number((sourceProduct as any)?.companyId || 0),
      mainCompanyId
    );
    if (sourceProduct && sourceProductCompanyId !== targetCompanyId) {
      const localProduct = await ensureCompanyProductCopy(
        inboundProductId,
        targetCompanyId,
        params.operatorId
      );
      inboundProductId = Number((localProduct as any)?.id || 0);
    }
  }

  const [existing] = await db
    .select({ id: inventoryTransactions.id })
    .from(inventoryTransactions)
    .where(
      and(
        eq((inventoryTransactions as any).companyId, targetCompanyId),
        eq(inventoryTransactions.type, "purchase_in"),
        eq(inventoryTransactions.relatedOrderId, sourcePurchaseOrderId),
        String(params.documentNo || "").trim()
          ? eq(
              inventoryTransactions.documentNo,
              String(params.documentNo || "").trim()
            )
          : sql`1 = 1`,
        inboundProductId > 0
          ? eq(inventoryTransactions.productId, inboundProductId)
          : sql`1 = 1`,
        String(params.batchNo || "").trim()
          ? eq(
              inventoryTransactions.batchNo,
              String(params.batchNo || "").trim()
            )
          : sql`1 = 1`
      )
    )
    .limit(1);
  if (existing) return Number(existing.id);

  return await createInventoryTransaction({
    companyId: targetCompanyId,
    warehouseId,
    productId: inboundProductId > 0 ? inboundProductId : undefined,
    type: "purchase_in",
    documentNo: String(params.documentNo || "").trim() || undefined,
    itemName: params.itemName,
    batchNo: String(params.batchNo || "").trim() || undefined,
    quantity: String(params.quantity || "0"),
    unit: String(params.unit || "") || undefined,
    relatedOrderId: sourcePurchaseOrderId,
    operatorId: params.operatorId ?? 0,
    remark:
      params.remark || `系统自动生成（主公司销售出库回写协同公司采购入库）`,
  } as InsertInventoryTransaction);
}

type PurchaseOrderItemInput = {
  productId?: number;
  materialCode: string;
  materialName: string;
  specification?: string;
  quantity: string;
  unit?: string;
  unitPrice?: string;
  amount?: string;
  remark?: string;
};

function extractSourcePlanNo(remark?: string | null) {
  const value = String(remark || "").trim();
  const match = value.match(/来源采购计划：([A-Z]+-\d{4,}-\d+)/);
  return match?.[1] || "";
}

export async function updatePurchaseOrder(
  id: number,
  data: Partial<InsertPurchaseOrder>,
  items?: PurchaseOrderItemInput[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePurchaseOrdersSupplierNameColumn(db);
  await ensurePurchaseOrdersStatusEnum(db);
  const supplierName = data.supplierId
    ? await getSupplierNameById(Number(data.supplierId), db)
    : undefined;
  const [currentOrder] = await db
    .select({ status: purchaseOrders.status })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);

  await db
    .update(purchaseOrders)
    .set({
      ...data,
      supplierName: supplierName ?? data.supplierName,
    })
    .where(eq(purchaseOrders.id, id));

  const restoredPlanNos: string[] = [];
  if (items) {
    const existingItems = await db
      .select({
        remark: purchaseOrderItems.remark,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));

    if (currentOrder?.status === "draft") {
      const nextPlanNoSet = new Set(
        items.map(item => extractSourcePlanNo(item.remark)).filter(Boolean)
      );

      for (const existingItem of existingItems) {
        const planNo = extractSourcePlanNo(existingItem.remark);
        if (!planNo || nextPlanNoSet.has(planNo)) continue;
        await db
          .update(productionPlans)
          .set({ status: "pending" })
          .where(eq(productionPlans.planNo, planNo));
        restoredPlanNos.push(planNo);
      }
    }

    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));
    if (items.length > 0) {
      await db.insert(purchaseOrderItems).values(
        items.map(item => ({
          orderId: id,
          productId: item.productId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount: item.amount,
          remark: item.remark,
        }))
      );
    }
  }

  await ensureAccountsPayableForPurchaseOrder(id, db);

  return restoredPlanNos;
}

export async function deletePurchaseOrder(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：应付账款、审批记录
  await db
    .delete(accountsPayable)
    .where(eq(accountsPayable.purchaseOrderId, id));
  await db
    .delete(orderApprovals)
    .where(
      and(
        eq(orderApprovals.orderId, id),
        eq(orderApprovals.orderType, "purchase")
      )
    );
  await deleteBundleWithRecycle(db, {
    rootTable: purchaseOrders,
    rootIdColumn: purchaseOrders.id,
    rootId: id,
    entityType: "采购订单",
    rootTableName: "purchase_orders",
    deletedBy,
    children: [
      {
        table: purchaseOrderItems,
        tableName: "purchase_order_items",
        foreignKeyColumn: purchaseOrderItems.orderId,
      },
    ],
  });
}

// ==================== 生产订单 CRUD ====================

export async function getProductionOrders(params?: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(productionOrders.orderNo, `%${params.search}%`),
        like(productionOrders.batchNo, `%${params.search}%`)
      )
    );
  }
  if (params?.status) {
    conditions.push(
      eq(
        productionOrders.status,
        params.status as
          | "draft"
          | "planned"
          | "in_progress"
          | "completed"
          | "cancelled"
      )
    );
  }
  let query = db
    .select({
      id: productionOrders.id,
      orderNo: productionOrders.orderNo,
      orderType: productionOrders.orderType,
      productId: productionOrders.productId,
      plannedQty: productionOrders.plannedQty,
      completedQty: productionOrders.completedQty,
      unit: productionOrders.unit,
      batchNo: productionOrders.batchNo,
      plannedStartDate: productionOrders.plannedStartDate,
      plannedEndDate: productionOrders.plannedEndDate,
      actualStartDate: productionOrders.actualStartDate,
      actualEndDate: productionOrders.actualEndDate,
      productionDate: productionOrders.productionDate,
      expiryDate: productionOrders.expiryDate,
      planId: productionOrders.planId,
      status: productionOrders.status,
      salesOrderId: productionOrders.salesOrderId,
      remark: productionOrders.remark,
      createdAt: productionOrders.createdAt,
      planNo: productionPlans.planNo,
    })
    .from(productionOrders)
    .leftJoin(productionPlans, eq(productionOrders.planId, productionPlans.id));
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  const result = await query
    .orderBy(desc(productionOrders.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
  return result;
}

export async function getProductionOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProductionOrder(data: InsertProductionOrder) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const orderNo = await resolveManagedCodeRuleNo(
    "生产订单",
    (data as any).orderNo
  );

  const result = await db.insert(productionOrders).values({
    ...data,
    orderNo,
  });
  return result[0].insertId;
}

export async function updateProductionOrder(
  id: number,
  data: Partial<InsertProductionOrder>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  await db
    .update(productionOrders)
    .set(data)
    .where(eq(productionOrders.id, id));
}

export async function deleteProductionOrder(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 删除生产指令时仅解绑生产计划，避免把来源计划一起删掉。
  await db
    .update(productionPlans)
    .set({ productionOrderId: null, status: "pending" })
    .where(eq(productionPlans.productionOrderId, id));
  await db
    .delete(materialRequisitionOrders)
    .where(eq(materialRequisitionOrders.productionOrderId, id));
  await db
    .delete(productionRecords)
    .where(eq(productionRecords.productionOrderId, id));
  await db
    .delete(productionRoutingCards)
    .where(eq(productionRoutingCards.productionOrderId, id));
  await db
    .delete(sterilizationOrders)
    .where(eq(sterilizationOrders.productionOrderId, id));
  await db
    .delete(productionWarehouseEntries)
    .where(eq(productionWarehouseEntries.productionOrderId, id));
  await db
    .delete(orderApprovals)
    .where(
      and(
        eq(orderApprovals.orderId, id),
        eq(orderApprovals.orderType, "production")
      )
    );
  await deleteSingleWithRecycle(db, {
    table: productionOrders,
    idColumn: productionOrders.id,
    id,
    entityType: "生产订单",
    sourceTable: "production_orders",
    deletedBy,
  });
}

// ==================== 库存管理 CRUD ====================

export async function getInventory(params?: {
  search?: string;
  warehouseId?: number;
  status?: string;
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  // 实时从流水账汇总计算库存数量（动态计算，不依赖静态存储的 quantity 字段）
  const inTypes = ["purchase_in", "production_in", "return_in", "other_in"];
  const outTypes = ["production_out", "sales_out", "return_out", "other_out"];

  // 构建库存记录的过滤条件
  const conditions: any[] = [];
  if (params?.search) {
    conditions.push(
      or(
        like(inventory.itemName, `%${params.search}%`),
        like(inventory.batchNo, `%${params.search}%`),
        like(inventory.materialCode, `%${params.search}%`)
      )
    );
  }
  if (params?.warehouseId) {
    conditions.push(eq(inventory.warehouseId, params.warehouseId));
  }
  if (params?.status) {
    conditions.push(
      eq(
        inventory.status,
        params.status as "qualified" | "quarantine" | "unqualified" | "reserved"
      )
    );
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        (inventory as any).companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }

  let baseQuery = db.select().from(inventory);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
  }
  const rows = await baseQuery
    .orderBy(desc(inventory.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  if (rows.length === 0) return [];

  // 批量查询每条库存记录的实时汇总数量
  const ids = rows.map(r => r.id);
  const txSums = await db
    .select({
      inventoryId: inventoryTransactions.inventoryId,
      totalQty: sql<string>`SUM(CASE WHEN type IN (${sql.raw(inTypes.map(t => `'${t}'`).join(","))}) THEN quantity ELSE -quantity END)`,
    })
    .from(inventoryTransactions)
    .where(and(inArray(inventoryTransactions.inventoryId, ids)))
    .groupBy(inventoryTransactions.inventoryId);

  // 将实时汇总数量回写到库存记录
  const sumMap = new Map(
    txSums.map(s => [s.inventoryId, parseFloat(s.totalQty || "0")])
  );
  return rows.map(row => ({
    ...row,
    quantity: String(
      sumMap.has(row.id)
        ? sumMap.get(row.id)!
        : parseFloat(String(row.quantity)) || 0
    ),
  }));
}

export async function getInventoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, id))
    .limit(1);
  if (result.length === 0) return undefined;

  // 实时从流水账汇总计算库存数量
  const inTypes = ["purchase_in", "production_in", "return_in", "other_in"];
  const txSums = await db
    .select({
      totalQty: sql<string>`SUM(CASE WHEN type IN (${sql.raw(inTypes.map(t => `'${t}'`).join(","))}) THEN quantity ELSE -quantity END)`,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.inventoryId, id));

  const realQty =
    parseFloat(txSums[0]?.totalQty || "0") ||
    parseFloat(String(result[0].quantity)) ||
    0;
  return { ...result[0], quantity: String(realQty) };
}

export async function createInventory(data: InsertInventory) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const result = await db.insert(inventory).values({
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  } as InsertInventory);
  return result[0].insertId;
}

export async function updateInventory(
  id: number,
  data: Partial<InsertInventory>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  await db.update(inventory).set(data).where(eq(inventory.id, id));
}

export async function deleteInventory(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: inventory,
    idColumn: inventory.id,
    id,
    entityType: "库存记录",
    sourceTable: "inventory",
    deletedBy,
  });
}

// ==================== 质量检验 CRUD ====================

const qualityInspectionSelectFields = {
  id: qualityInspections.id,
  inspectionNo: qualityInspections.inspectionNo,
  type: qualityInspections.type,
  relatedDocNo: qualityInspections.relatedDocNo,
  itemName: qualityInspections.itemName,
  batchNo: qualityInspections.batchNo,
  sampleQty: qualityInspections.sampleQty,
  inspectedQty: qualityInspections.inspectedQty,
  qualifiedQty: qualityInspections.qualifiedQty,
  unqualifiedQty: qualityInspections.unqualifiedQty,
  result: qualityInspections.result,
  inspectorId: qualityInspections.inspectorId,
  inspectionDate: qualityInspections.inspectionDate,
  remark: qualityInspections.remark,
  createdAt: qualityInspections.createdAt,
  updatedAt: qualityInspections.updatedAt,
};

export async function getQualityInspections(params?: {
  search?: string;
  type?: string;
  result?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select(qualityInspectionSelectFields).from(qualityInspections);
  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(qualityInspections.inspectionNo, `%${params.search}%`),
        like(qualityInspections.itemName, `%${params.search}%`)
      )
    );
  }

  if (params?.type) {
    conditions.push(
      eq(qualityInspections.type, params.type as "IQC" | "IPQC" | "OQC")
    );
  }

  if (params?.result && params.result !== "all") {
    conditions.push(
      eq(
        qualityInspections.result,
        params.result as "qualified" | "unqualified" | "conditional" | "draft" as any
      )
    );
  } else if (!params?.result || params.result === "all") {
    // 全部状态时排除草稿
    conditions.push(ne(qualityInspections.result, "draft" as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query
    .orderBy(desc(qualityInspections.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  return result;
}

export async function getQualityInspectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select(qualityInspectionSelectFields)
    .from(qualityInspections)
    .where(eq(qualityInspections.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createQualityInspection(data: InsertQualityInspection) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureQualityInspectionColumns(db);
  const result = await db.insert(qualityInspections).values(data);
  return result[0].insertId;
}

export async function updateQualityInspection(
  id: number,
  data: Partial<InsertQualityInspection>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureQualityInspectionColumns(db);
  await db
    .update(qualityInspections)
    .set(data)
    .where(eq(qualityInspections.id, id));
}

export async function deleteQualityInspection(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: qualityInspections,
    idColumn: qualityInspections.id,
    id,
    entityType: "质量检验",
    sourceTable: "quality_inspections",
    deletedBy,
  });
}

/**
 * OQC 检验结果联动：通过生产批号（唯一追溯主键）回写入库申请的检验数据
 * 当 OQC 检验完成时，将报废数量和留样数量写入对应的生产入库申请，并重新计算入库数量
 */
export async function syncOqcResultToWarehouseEntry(params: {
  batchNo: string;
  productionOrderId?: number;
  sterilizationOrderId?: number;
  rejectQty?: number;
  sampleRetainQty?: number;
  result?: string;
}) {
  const db = await getDb();
  if (!db || !params.batchNo) return [];
  await ensureProductionWarehouseEntryColumns(db);

  const conditions: any[] = [
    eq(productionWarehouseEntries.batchNo, params.batchNo),
  ];
  if (params.productionOrderId) {
    conditions.push(
      eq(productionWarehouseEntries.productionOrderId, params.productionOrderId)
    );
  }

  const entries = await db
    .select()
    .from(productionWarehouseEntries)
    .where(and(...conditions))
    .limit(5);

  if (entries.length === 0) return [];

  const syncedEntries: Array<{
    id: number;
    entryNo: string;
    productName: string;
    batchNo: string;
    quantity: string;
    unit: string;
    previousStatus: string;
    nextStatus: string;
  }> = [];

  for (const entry of entries) {
    const rejectQty = params.rejectQty ?? 0;
    const sampleQty = params.sampleRetainQty ?? 0;
    const sterilizedQty = parseFloat(
      String(entry.sterilizedQty ?? entry.quantity ?? 0)
    );
    const newQty = Math.max(0, sterilizedQty - rejectQty - sampleQty);

    const updateData: any = {
      inspectionRejectQty: String(rejectQty),
      sampleQty: String(sampleQty),
      quantity: String(newQty),
    };

    if (
      params.result === "qualified" &&
      !["approved", "completed", "rejected"].includes(
        String(entry.status || "")
      )
    ) {
      updateData.status = "approved";
    } else if (
      params.result === "unqualified" &&
      !["completed", "rejected"].includes(String(entry.status || ""))
    ) {
      updateData.status = "rejected";
    }

    await db
      .update(productionWarehouseEntries)
      .set(updateData)
      .where(eq(productionWarehouseEntries.id, entry.id));

    syncedEntries.push({
      id: Number(entry.id),
      entryNo: String(entry.entryNo || ""),
      productName: String(entry.productName || ""),
      batchNo: String(entry.batchNo || ""),
      quantity: String(updateData.quantity ?? entry.quantity ?? ""),
      unit: String(entry.unit || ""),
      previousStatus: String(entry.status || ""),
      nextStatus: String(updateData.status || entry.status || ""),
    });
  }

  return syncedEntries;
}

async function validatePurchaseInboundTransaction(
  data: InsertInventoryTransaction,
  db: ReturnType<typeof drizzle>
) {
  if (data.type !== "purchase_in" || Number(data.relatedOrderId || 0) <= 0)
    return;

  await ensureGoodsReceiptsTable(db);
  await ensureIqcInspectionsTable(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);

  const [purchaseOrder] = await db
    .select({
      companyId: (purchaseOrders as any).companyId,
      internalCompanyId: (purchaseOrders as any).internalCompanyId,
      linkedSalesOrderId: (purchaseOrders as any).linkedSalesOrderId,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, Number(data.relatedOrderId)))
    .limit(1);
  if (
    normalizeCompanyId(Number((purchaseOrder as any)?.companyId || 0), mainCompanyId) !==
    mainCompanyId
  ) {
    return;
  }
  if (
    Number((purchaseOrder as any)?.internalCompanyId || 0) > 0 ||
    Number((purchaseOrder as any)?.linkedSalesOrderId || 0) > 0
  ) {
    return;
  }

  const candidateRows = await db
    .select({
      receiptNo: goodsReceipts.receiptNo,
      receiptStatus: goodsReceipts.status,
      productId: goodsReceiptItems.productId,
      batchNo: goodsReceiptItems.batchNo,
      materialName: goodsReceiptItems.materialName,
      qualifiedQty: goodsReceiptItems.qualifiedQty,
      receivedQty: goodsReceiptItems.receivedQty,
    })
    .from(goodsReceipts)
    .innerJoin(
      goodsReceiptItems,
      eq(goodsReceiptItems.receiptId, goodsReceipts.id)
    )
    .where(
      and(
        eq(goodsReceipts.purchaseOrderId, Number(data.relatedOrderId)),
        inArray(goodsReceipts.status, ["passed", "warehoused"])
      )
    );

  const matchedRows = candidateRows.filter(row => {
    if (
      Number(data.productId || 0) > 0 &&
      Number(row.productId || 0) > 0 &&
      Number(row.productId) !== Number(data.productId)
    ) {
      return false;
    }
    if (String(data.batchNo || "").trim()) {
      return (
        String(row.batchNo || "").trim() === String(data.batchNo || "").trim()
      );
    }
    if (String(data.itemName || "").trim()) {
      return (
        String(row.materialName || "").trim() ===
        String(data.itemName || "").trim()
      );
    }
    return true;
  });

  if (matchedRows.length === 0) {
    throw new Error("该采购入库缺少已通过 IQC 的到货记录，不能直接入库");
  }

  const qualifiedQty = matchedRows.reduce((sum, row) => {
    const rowQty = Number(row.qualifiedQty ?? row.receivedQty ?? 0);
    return sum + (Number.isFinite(rowQty) ? rowQty : 0);
  }, 0);

  const inboundConditions: any[] = [
    eq(inventoryTransactions.type, "purchase_in"),
    eq(inventoryTransactions.relatedOrderId, Number(data.relatedOrderId)),
  ];
  if (Number(data.productId || 0) > 0)
    inboundConditions.push(
      eq(inventoryTransactions.productId, Number(data.productId))
    );
  if (String(data.batchNo || "").trim())
    inboundConditions.push(
      eq(inventoryTransactions.batchNo, String(data.batchNo).trim())
    );
  const inboundRows = await db
    .select({ quantity: inventoryTransactions.quantity })
    .from(inventoryTransactions)
    .where(and(...inboundConditions));
  const existingInboundQty = inboundRows.reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0
  );
  const requestQty = Number(data.quantity || 0);

  if (
    qualifiedQty <= 0 ||
    existingInboundQty + requestQty > qualifiedQty + 0.0001
  ) {
    throw new Error(
      `采购入库数量超过 IQC 放行数量，当前最多还能入库 ${toDecimalString(Math.max(0, qualifiedQty - existingInboundQty))}`
    );
  }
}

async function validateProductionInboundTransaction(
  data: InsertInventoryTransaction,
  db: ReturnType<typeof drizzle>
) {
  if (data.type !== "production_in") return;

  await ensureProductionWarehouseEntryColumns(db);

  const entryConditions: any[] = [];
  if (String(data.documentNo || "").trim()) {
    entryConditions.push(
      eq(productionWarehouseEntries.entryNo, String(data.documentNo).trim())
    );
  }
  if (entryConditions.length === 0 && Number(data.relatedOrderId || 0) > 0) {
    entryConditions.push(
      eq(
        productionWarehouseEntries.productionOrderId,
        Number(data.relatedOrderId)
      )
    );
    if (String(data.batchNo || "").trim()) {
      entryConditions.push(
        eq(productionWarehouseEntries.batchNo, String(data.batchNo).trim())
      );
    }
  }
  if (entryConditions.length === 0) {
    throw new Error("生产入库必须关联生产入库申请单");
  }

  const [entry] = await db
    .select({
      id: productionWarehouseEntries.id,
      entryNo: productionWarehouseEntries.entryNo,
      status: productionWarehouseEntries.status,
      quantity: productionWarehouseEntries.quantity,
      batchNo: productionWarehouseEntries.batchNo,
      productId: productionWarehouseEntries.productId,
      productionOrderId: productionWarehouseEntries.productionOrderId,
      sterilizationOrderId: productionWarehouseEntries.sterilizationOrderId,
    })
    .from(productionWarehouseEntries)
    .where(and(...entryConditions))
    .orderBy(
      desc(productionWarehouseEntries.createdAt),
      desc(productionWarehouseEntries.id)
    )
    .limit(1);

  if (!entry) {
    throw new Error("未找到对应的生产入库申请单，请先走入库申请和质检流程");
  }
  if (!["approved", "completed"].includes(String(entry.status || ""))) {
    throw new Error("生产入库申请尚未通过质量放行，不能入库");
  }

  const oqcConditions: any[] = [
    eq(qualityInspections.type, "OQC"),
    eq(
      qualityInspections.batchNo,
      String(entry.batchNo || data.batchNo || "").trim()
    ),
  ];
  if (Number(entry.productionOrderId || 0) > 0) {
    oqcConditions.push(
      eq(qualityInspections.productionOrderId, Number(entry.productionOrderId))
    );
  }
  if (Number(entry.sterilizationOrderId || 0) > 0) {
    oqcConditions.push(
      eq(
        qualityInspections.sterilizationOrderId,
        Number(entry.sterilizationOrderId)
      )
    );
  }

  const [oqc] = await db
    .select({
      id: qualityInspections.id,
      inspectionNo: qualityInspections.inspectionNo,
      result: qualityInspections.result,
    })
    .from(qualityInspections)
    .where(and(...oqcConditions))
    .orderBy(
      desc(qualityInspections.updatedAt),
      desc(qualityInspections.createdAt),
      desc(qualityInspections.id)
    )
    .limit(1);

  if (!oqc || String(oqc.result || "") !== "qualified") {
    throw new Error("当前批次尚未通过 OQC 放行，不能执行生产入库");
  }

  const inboundRows = await db
    .select({ quantity: inventoryTransactions.quantity })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.type, "production_in"),
        eq(inventoryTransactions.documentNo, String(entry.entryNo || ""))
      )
    );
  const existingInboundQty = inboundRows.reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0
  );
  const allowedQty = Number(entry.quantity || 0);
  const requestQty = Number(data.quantity || 0);
  if (allowedQty > 0 && existingInboundQty + requestQty > allowedQty + 0.0001) {
    throw new Error(
      `生产入库数量超过申请放行数量，当前最多还能入库 ${toDecimalString(Math.max(0, allowedQty - existingInboundQty))}`
    );
  }
}

// ==================== BOM 物料清单 CRUD ====================

export async function getBomByProductId(productId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureBomBaseOutputColumns(db);

  return await db
    .select({
      id: bom.id,
      productId: bom.productId,
      baseProductQty: bom.baseProductQty,
      baseProductUnit: bom.baseProductUnit,
      parentId: bom.parentId,
      level: bom.level,
      materialCode: bom.materialCode,
      materialName: bom.materialName,
      specification: bom.specification,
      quantity: bom.quantity,
      unit: bom.unit,
      unitPrice: bom.unitPrice,
      version: bom.version,
      status: bom.status,
      remark: bom.remark,
      createdAt: bom.createdAt,
      updatedAt: bom.updatedAt,
    })
    .from(bom)
    .where(eq(bom.productId, productId))
    .orderBy(bom.level, bom.id);
}

// 获取 BOM 列表（按产品分组聚合，一条 BOM 对应一个产品规格）
export async function getBomList() {
  const db = await getDb();
  if (!db) return [];
  await ensureBomBaseOutputColumns(db);
  // 使用原生 SQL 按产品分组聚合，并汇总材料成本
  const result = await db.execute(sql`
    SELECT 
      b.productId,
      b.version,
      MAX(b.bomCode) AS bomCode,
      MAX(b.baseProductQty) AS baseProductQty,
      MAX(b.baseProductUnit) AS baseProductUnit,
      p.name AS productName,
      p.code AS productCode,
      p.specification AS productSpec,
      p.unit AS productUnit,
      p.category AS productCategory,
      p.productCategory AS productType,
      p.description AS productDescription,
      COUNT(*) AS itemCount,
      SUM(CASE WHEN b.level = 2 THEN 1 ELSE 0 END) AS level2Count,
      SUM(CASE WHEN b.level = 3 THEN 1 ELSE 0 END) AS level3Count,
      COALESCE(SUM(b.quantity * b.unitPrice), 0) AS totalCost,
      MIN(b.createdAt) AS createdAt,
      MAX(b.updatedAt) AS updatedAt,
      GROUP_CONCAT(DISTINCT b.status) AS statuses
    FROM bom b
    LEFT JOIN products p ON b.productId = p.id
    GROUP BY b.productId, b.version
    ORDER BY b.productId
  `);
  return (result as any)[0] || [];
}

function normalizeBomAutoCode(value?: string | null) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
}

export async function generateBomCodeForProductId(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureBomBaseOutputColumns(db);

  const [product] = await db
    .select({
      code: products.code,
      name: products.name,
      specification: products.specification,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  let shortCode = "";
  for (const candidate of [
    product?.code,
    product?.name,
    product?.specification,
  ]) {
    const normalized = normalizeBomAutoCode(candidate);
    if (normalized.length >= 2) {
      shortCode = normalized;
      break;
    }
  }
  if (!shortCode) shortCode = "XX";

  const rows = await db
    .select({ bomCode: bom.bomCode })
    .from(bom)
    .where(like(bom.bomCode, `BOM-${shortCode}-%`));

  let maxSeq = 0;
  const matcher = new RegExp(`^BOM-${shortCode}-(\\d{3})$`, "i");
  for (const row of rows) {
    const match = String(row.bomCode || "").match(matcher);
    if (!match) continue;
    const seq = Number(match[1]);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `BOM-${shortCode}-${String(maxSeq + 1).padStart(3, "0")}`;
}

export async function createBomItem(data: InsertBom) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureBomBaseOutputColumns(db);

  const result = await db.insert(bom).values(data);
  return result[0].insertId;
}

export async function updateBomItem(id: number, data: Partial<InsertBom>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureBomBaseOutputColumns(db);

  await db.update(bom).set(data).where(eq(bom.id, id));
}

export async function deleteBomItem(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: bom,
    idColumn: bom.id,
    id,
    entityType: "BOM项目",
    sourceTable: "bom",
    deletedBy,
  });
}

// ==================== 仓库管理 CRUD ====================

export async function getWarehouses(params?: {
  status?: string;
  companyId?: number;
  includeVirtual?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  let query = db.select().from(warehouses);
  const conditions = [];
  if (params?.status) {
    conditions.push(
      eq(warehouses.status, params.status as "active" | "inactive")
    );
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        (warehouses as any).companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }
  if (!params?.includeVirtual) {
    conditions.push(eq((warehouses as any).isVirtual, false));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query.orderBy(warehouses.name);
}

export async function createWarehouse(data: InsertWarehouse) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const result = await db.insert(warehouses).values({
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  } as InsertWarehouse);
  return result[0].insertId;
}

export async function updateWarehouse(
  id: number,
  data: Partial<InsertWarehouse>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(warehouses).set(data).where(eq(warehouses.id, id));
}

export async function deleteWarehouse(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：库存、库存流水、盘点单、领料单
  await db.delete(inventory).where(eq(inventory.warehouseId, id));
  await db
    .delete(inventoryTransactions)
    .where(eq(inventoryTransactions.warehouseId, id));
  await db.delete(stocktakes).where(eq(stocktakes.warehouseId, id));
  await db
    .delete(materialRequisitionOrders)
    .where(eq(materialRequisitionOrders.warehouseId, id));
  await deleteSingleWithRecycle(db, {
    table: warehouses,
    idColumn: warehouses.id,
    id,
    entityType: "仓库",
    sourceTable: "warehouses",
    deletedBy,
  });
}

// ==================== 库存出入库记录 CRUD ====================

export async function getInventoryTransactions(params?: {
  search?: string;
  type?: string;
  warehouseId?: number;
  inventoryId?: number;
  productId?: number;
  batchNo?: string;
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureInventoryTransactionColumns(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  let query = db.select().from(inventoryTransactions);
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(inventoryTransactions.itemName, `%${params.search}%`),
        like(inventoryTransactions.documentNo, `%${params.search}%`)
      )
    );
  }
  if (params?.type) {
    conditions.push(eq(inventoryTransactions.type, params.type as any));
  }
  if (params?.warehouseId) {
    conditions.push(eq(inventoryTransactions.warehouseId, params.warehouseId));
  }
  if (params?.inventoryId) {
    conditions.push(eq(inventoryTransactions.inventoryId, params.inventoryId));
  }
  if (params?.productId) {
    conditions.push(eq(inventoryTransactions.productId, params.productId));
  }
  if (params?.batchNo) {
    conditions.push(eq(inventoryTransactions.batchNo, params.batchNo));
  }
  if (params?.companyId) {
    conditions.push(
      eq(
        (inventoryTransactions as any).companyId,
        normalizeCompanyId(params.companyId, mainCompanyId)
      )
    );
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

function getManagedCodeRuleModuleByInventoryType(type: unknown) {
  const normalized = String(type || "").trim();
  if (
    ["purchase_in", "production_in", "return_in", "other_in"].includes(
      normalized
    )
  ) {
    return "入库单";
  }
  if (
    ["production_out", "sales_out", "return_out", "other_out"].includes(
      normalized
    )
  ) {
    return "出库单";
  }
  return "";
}

async function resolveInventoryTransactionDocumentNo(
  type: unknown,
  currentValue: unknown
) {
  const resolved = String(currentValue || "").trim();
  if (resolved) return resolved;
  const moduleName = getManagedCodeRuleModuleByInventoryType(type);
  if (!moduleName) return "";
  return await allocateManagedCodeRuleNo(moduleName);
}

export async function createInventoryTransaction(
  data: InsertInventoryTransaction
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInventoryTransactionColumns(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedData = {
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  } as InsertInventoryTransaction;
  const resolvedDocumentNo = await resolveInventoryTransactionDocumentNo(
    scopedData.type,
    scopedData.documentNo
  );
  if (resolvedDocumentNo) {
    scopedData.documentNo = resolvedDocumentNo;
  }
  if (scopedData.type === "purchase_in") {
    await validatePurchaseInboundTransaction(scopedData, db);
  }
  if (scopedData.type === "production_in") {
    await validateProductionInboundTransaction(scopedData, db);
  }

  // 1. 写入流水记录
  const result = await db.insert(inventoryTransactions).values(scopedData);
  const txId = result[0].insertId;

  // 2. 自动关联库存记录（inventory 表作为库存档案，quantity 字段不再维护，由查询时实时汇总）
  try {
    const inTypes = ["purchase_in", "production_in", "return_in", "other_in"];
    const isIn = inTypes.includes(scopedData.type);

    // 查找现有库存档案（按仓库+产品+批次匹配）
    const conditions: any[] = [
      eq(inventory.warehouseId, scopedData.warehouseId),
      eq((inventory as any).companyId, scopedData.companyId as any),
    ];
    if (scopedData.productId)
      conditions.push(eq(inventory.productId, scopedData.productId));
    if (scopedData.batchNo)
      conditions.push(eq(inventory.batchNo, scopedData.batchNo));
    const existing = await db
      .select()
      .from(inventory)
      .where(and(...conditions))
      .limit(1);

    let invId: number;
    if (existing.length > 0) {
      invId = existing[0].id;
    } else if (isIn) {
      // 入库时如果没有库存档案，自动创建（quantity 初始为 0，实际数量由查询时实时计算）
      const newInvResult = await db.insert(inventory).values({
        companyId: scopedData.companyId as any,
        warehouseId: scopedData.warehouseId,
        productId: scopedData.productId,
        itemName: scopedData.itemName,
        batchNo: scopedData.batchNo,
        quantity: "0", // 占位，实际数量由流水汇总实时计算
        unit: scopedData.unit,
        status: "qualified",
      });
      invId = newInvResult[0].insertId;
    } else {
      // 出库但无库存档案（异常），仍创建档案以保持关联
      const newInvResult = await db.insert(inventory).values({
        companyId: scopedData.companyId as any,
        warehouseId: scopedData.warehouseId,
        productId: scopedData.productId,
        itemName: scopedData.itemName,
        batchNo: scopedData.batchNo,
        quantity: "0",
        unit: scopedData.unit,
        status: "qualified",
      });
      invId = newInvResult[0].insertId;
    }

    // 3. 更新流水的 inventoryId 关联
    await db
      .update(inventoryTransactions)
      .set({ inventoryId: invId })
      .where(eq(inventoryTransactions.id, txId));
  } catch (e) {
    console.error("[库存] 关联库存档案失败:", e);
  }

  if (scopedData.type === "purchase_in" && scopedData.relatedOrderId) {
    await syncPurchaseInboundProgressByOrder(
      Number(scopedData.relatedOrderId),
      db
    );
  }

  return txId;
}

export async function updateInventoryTransaction(
  id: number,
  data: Partial<InsertInventoryTransaction>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInventoryTransactionColumns(db);
  const [currentTx] = await db
    .select({
      type: inventoryTransactions.type,
      relatedOrderId: inventoryTransactions.relatedOrderId,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.id, id))
    .limit(1);
  await db
    .update(inventoryTransactions)
    .set(data)
    .where(eq(inventoryTransactions.id, id));

  const orderIdsToSync = new Set<number>();
  if (
    String(currentTx?.type || "") === "purchase_in" &&
    currentTx?.relatedOrderId
  ) {
    orderIdsToSync.add(Number(currentTx.relatedOrderId));
  }
  const nextType = String(data.type ?? currentTx?.type ?? "");
  const nextRelatedOrderId = Number(
    data.relatedOrderId ?? currentTx?.relatedOrderId ?? 0
  );
  if (nextType === "purchase_in" && nextRelatedOrderId > 0) {
    orderIdsToSync.add(nextRelatedOrderId);
  }

  for (const orderId of Array.from(orderIdsToSync)) {
    await syncPurchaseInboundProgressByOrder(orderId, db);
  }
}

export async function deleteInventoryTransaction(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [currentTx] = await db
    .select({
      type: inventoryTransactions.type,
      relatedOrderId: inventoryTransactions.relatedOrderId,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.id, id))
    .limit(1);

  // 直接删除流水记录（存入回收站）
  // 库存数量无需重算：查询时实时从剩余流水汇总计算，删除流水后下次查询自动反映正确库存
  await deleteSingleWithRecycle(db, {
    table: inventoryTransactions,
    idColumn: inventoryTransactions.id,
    id,
    entityType: "库存流水",
    sourceTable: "inventory_transactions",
    deletedBy,
  });

  if (
    String(currentTx?.type || "") === "purchase_in" &&
    currentTx?.relatedOrderId
  ) {
    await syncPurchaseInboundProgressByOrder(
      Number(currentTx.relatedOrderId),
      db
    );
  }
}

function parseProductionRecordJsonArray(raw: unknown) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearProductionRecordMaterialUsageOutboundByRecordNo(
  recordNo: string
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInventoryTransactionColumns(db);
  const normalizedRecordNo = String(recordNo || "").trim();
  if (!normalizedRecordNo) return;
  await db
    .delete(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.documentNo, normalizedRecordNo),
        eq(inventoryTransactions.type, "production_out")
      )
    );
}

export async function syncProductionRecordMaterialUsageOutbound(
  record: any,
  operatorId?: number
) {
  const normalizedRecordNo = String(record?.recordNo || "").trim();
  if (!normalizedRecordNo) return;

  await clearProductionRecordMaterialUsageOutboundByRecordNo(
    normalizedRecordNo
  );

  if (String(record?.recordType || "") !== "material_usage") {
    return;
  }

  const materialItems = parseProductionRecordJsonArray(record?.materialItems);
  if (materialItems.length === 0) return;

  for (const item of materialItems) {
    const warehouseId = Number(item?.warehouseId || 0);
    const quantity = Number(item?.usedQty || item?.issuedQty || 0);
    if (warehouseId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const inventoryId = Number(item?.inventoryId || 0);
    const productId = Number(item?.productId || 0);
    const unit = String(
      item?.unit || item?.bomUnit || record?.usedUnit || ""
    ).trim();
    const batchNo = String(item?.batchNo || "").trim();

    await createInventoryTransaction({
      inventoryId: inventoryId > 0 ? inventoryId : undefined,
      productId: productId > 0 ? productId : undefined,
      warehouseId,
      type: "production_out",
      documentNo: normalizedRecordNo,
      itemName: String(
        item?.materialName || item?.materialCode || "生产材料使用"
      ),
      batchNo: batchNo || undefined,
      quantity: String(quantity),
      unit: unit || undefined,
      relatedOrderId:
        Number(record?.productionOrderId || 0) > 0
          ? Number(record.productionOrderId)
          : undefined,
      remark: `生产记录 ${normalizedRecordNo} 材料使用出库`,
      operatorId,
    });
  }
}

// ==================== 操作日志 CRUD ====================

export async function getOperationLogs(params?: {
  module?: string;
  action?: string;
  operatorId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(operationLogs);
  const conditions = [];
  if (params?.module) {
    conditions.push(eq(operationLogs.module, params.module as any));
  }
  if (params?.action) {
    conditions.push(eq(operationLogs.action, params.action as any));
  }
  if (params?.operatorId) {
    conditions.push(eq(operationLogs.operatorId, params.operatorId));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query
    .orderBy(desc(operationLogs.operatedAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function createOperationLog(data: InsertOperationLog) {
  const db = await getDb();
  if (!db) return; // 日志写入失败不抛异常
  try {
    await db.insert(operationLogs).values(data);
  } catch (e) {
    console.warn("[OperationLog] Failed to write log:", e);
  }
}

async function getOperationActorSnapshot(
  db: any,
  actorId?: number | null
): Promise<{ name: string; role?: string; department?: string } | null> {
  const normalizedActorId = Number(actorId || 0);
  if (!(normalizedActorId > 0)) return null;
  const [row] = await db
    .select({
      name: users.name,
      role: users.role,
      department: users.department,
    })
    .from(users)
    .where(eq(users.id, normalizedActorId))
    .limit(1);
  if (!row) return null;
  return {
    name: String(row.name || "系统"),
    role: row.role ? String(row.role) : undefined,
    department: row.department ? String(row.department) : undefined,
  };
}

function getWorkflowOperationLogMeta(sourceTableRaw: string): {
  module: InsertOperationLog["module"];
  targetType: string;
  title: string;
} {
  const sourceTable = String(sourceTableRaw || "").trim();
  switch (sourceTable) {
    case "sales_orders":
      return { module: "customer", targetType: "销售订单", title: "销售订单" };
    case "purchase_orders":
      return { module: "supplier", targetType: "采购订单", title: "采购订单" };
    case "expense_reimbursements":
      return { module: "finance", targetType: "费用报销", title: "费用报销" };
    case "material_requisition_orders":
      return { module: "production", targetType: "领料单", title: "领料单" };
    case "production_warehouse_entries":
      return {
        module: "production",
        targetType: "生产入库申请",
        title: "生产入库申请",
      };
    default:
      return {
        module: "document",
        targetType: sourceTable || "流程单据",
        title: sourceTable || "流程单据",
      };
  }
}

function getPaymentOperationLogMeta(data: InsertPaymentRecord): {
  targetType: string;
  targetName: string;
  description: string;
} {
  const relatedNo = String(data.relatedNo || data.recordNo || "").trim();
  if (data.type === "receipt") {
    return {
      targetType: "收款记录",
      targetName: relatedNo || "收款记录",
      description: relatedNo ? `销售收款：${relatedNo}` : "销售收款处理",
    };
  }
  if (data.relatedType === "purchase_order") {
    return {
      targetType: "付款记录",
      targetName: relatedNo || "付款记录",
      description: relatedNo ? `采购付款：${relatedNo}` : "采购付款处理",
    };
  }
  if (data.relatedType === "expense") {
    return {
      targetType: "付款记录",
      targetName: relatedNo || "付款记录",
      description: relatedNo ? `报销付款：${relatedNo}` : "报销付款处理",
    };
  }
  return {
    targetType: data.type === "payment" ? "付款记录" : "收款记录",
    targetName: relatedNo || "收付款记录",
    description:
      data.type === "payment"
        ? `付款处理：${relatedNo || data.recordNo || ""}`.replace(/：$/, "")
        : `收款处理：${relatedNo || data.recordNo || ""}`.replace(/：$/, ""),
  };
}

export async function clearOperationLogs() {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.delete(operationLogs);
}

// ==================== 订单号生成 ====================
export async function getNextSalesOrderNo(): Promise<string> {
  return await allocateManagedCodeRuleNo("销售订单");
}

export async function getNextSalesQuoteNo(): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const dateKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const prefix = `Q${dateKey}-`;
  if (!db) {
    return `${prefix}01`;
  }
  await ensureSalesQuotesTables(db);
  const [latest] = await db
    .select({ quoteNo: salesQuotes.quoteNo })
    .from(salesQuotes)
    .where(like(salesQuotes.quoteNo, `${prefix}%`))
    .orderBy(desc(salesQuotes.quoteNo))
    .limit(1);
  if (!latest) return `${prefix}01`;
  const seq = parseInt(latest.quoteNo.replace(prefix, ""), 10);
  return `${prefix}${String(isNaN(seq) ? 1 : seq + 1).padStart(2, "0")}`;
}

// ==================== 统计查询 ====================

const GENERAL_MANAGER_NAME = "刘源";
const WORKFLOW_TEST_ROUTE_TO_ADMIN = false;
const WORKFLOW_SYSTEM_ADMIN_NAME = "系统管理员";
const FINANCE_TODO_LIST_MARKER = "[FINANCE_TODO_LIST]";

type SalesApprovalOrderSnapshot = {
  id: number;
  createdBy: number | null;
  salesPersonId: number | null;
  status: string | null;
};

type SalesOrderApprovalState = {
  orderId: number;
  currentApproverId: number | null;
  currentApproverName: string;
  stage: "manager" | "general_manager" | "system_admin" | "none";
  canApprove: boolean;
};

type FinanceTodoMeta = {
  id: string;
  status: "open" | "done";
  amount: number;
  paymentMethod: string;
  receiptDate: string;
  remarks?: string;
  attachments?: string[];
  createdAt: string;
  bizType?: string;
  title?: string;
};

export type WorkflowCenterTab = "todo" | "created" | "processed" | "cc";

export type WorkflowCenterItem = {
  id: string;
  tab: WorkflowCenterTab;
  sourceType:
    | "sales_order"
    | "purchase_order"
    | "expense_reimbursement"
    | "workflow_approval"
    | "finance_receipt"
    | "finance_payable"
    | "quality_iqc"
    | "quality_iqc_review"
    | "quality_oqc"
    | "material_requisition"
    | "warehouse_production_in"
    | "operation_log";
  module: string;
  formType: string;
  title: string;
  documentNo: string;
  targetName: string;
  applicantName: string;
  currentStep: string;
  statusLabel: string;
  amountText: string;
  itemCountText?: string;
  createdAt: Date | string | null;
  routePath: string;
  description: string;
  sourceId?: number | null;
  sourceTable?: string | null;
  runId?: number | null;
  todoMetaId?: string | null;
};

type QualityReviewerUser = { id: number; name: string } | null;

function parseValidSignatureRecords(raw: unknown) {
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: any) =>
        item &&
        String(item.status || "valid") === "valid" &&
        String(item.signatureType || "").trim().length > 0
    );
  } catch {
    return [];
  }
}

function hasValidSignatureType(
  raw: unknown,
  signatureType: "inspector" | "reviewer" | "approver"
) {
  return parseValidSignatureRecords(raw).some(
    (item: any) => String(item.signatureType || "") === signatureType
  );
}

async function getQualityDepartmentReviewerUser(
  db: any
): Promise<QualityReviewerUser> {
  const qualityDepartmentRows: Array<{
    id: number;
    name: string | null;
    managerId: number | null;
  }> = await db
    .select({
      id: departments.id,
      name: departments.name,
      managerId: departments.managerId,
    })
    .from(departments)
    .where(like(departments.name, "%质量%"))
    .orderBy(
      sql`CASE WHEN ${departments.name} = '质量部' THEN 0 ELSE 1 END`,
      asc(departments.id)
    );

  const managerIds = Array.from(
    new Set(
      qualityDepartmentRows
        .map((row) => Number(row.managerId || 0))
        .filter((id) => id > 0)
    )
  );
  if (managerIds.length > 0) {
    const managerRows: Array<{ id: number; name: string | null }> = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, managerIds))
      .limit(1);
    if (managerRows[0]) {
      return {
        id: Number(managerRows[0].id),
        name: String(managerRows[0].name || ""),
      };
    }
  }

  const fallbackRows: Array<{ id: number; name: string | null }> = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        like(users.department, "%质量%"),
        or(
          like(users.position, "%负责人%"),
          like(users.position, "%经理%"),
          like(users.position, "%主管%"),
          like(users.position, "%总监%")
        )
      )
    )
    .limit(1);

  if (!fallbackRows[0]) return null;
  return {
    id: Number(fallbackRows[0].id),
    name: String(fallbackRows[0].name || ""),
  };
}

async function getQualityIqcExecutorUserIds(db: any) {
  const reviewer = await getQualityDepartmentReviewerUser(db);
  const preferredRows: Array<{ id: number }> = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        like(users.department, "%质量%"),
        or(
          like(users.position, "%检验%"),
          like(users.position, "%质检%"),
          like(users.position, "%QC%"),
          like(users.position, "%IQC%")
        )
      )
    );

  const preferredIds = preferredRows
    .map((row) => Number(row.id || 0))
    .filter((id) => id > 0 && id !== Number(reviewer?.id || 0));
  if (preferredIds.length > 0) return Array.from(new Set(preferredIds));

  const fallbackRows: Array<{ id: number }> = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.department, "%质量%"));
  return Array.from(
    new Set(
      fallbackRows
        .map((row) => Number(row.id || 0))
        .filter((id) => id > 0 && id !== Number(reviewer?.id || 0))
    )
  );
}

function parseDepartmentNames(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseFinanceTodoCount(remark: unknown): number {
  const markerLine = String(remark ?? "")
    .split("\n")
    .find(line => line.startsWith(FINANCE_TODO_LIST_MARKER));
  if (!markerLine) return 0;
  try {
    const parsed = JSON.parse(
      markerLine.slice(FINANCE_TODO_LIST_MARKER.length)
    );
    if (!Array.isArray(parsed)) return 0;
    return parsed.filter(item => String(item?.status ?? "open") === "open")
      .length;
  } catch {
    return 0;
  }
}

function parseFinanceTodoList(remark: unknown): FinanceTodoMeta[] {
  const markerLine = String(remark ?? "")
    .split("\n")
    .find(line => line.startsWith(FINANCE_TODO_LIST_MARKER));
  if (!markerLine) return [];
  try {
    const parsed = JSON.parse(
      markerLine.slice(FINANCE_TODO_LIST_MARKER.length)
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(
        (item: any): FinanceTodoMeta => ({
          id: String(item?.id || ""),
          status: item?.status === "done" ? "done" : "open",
          amount: Number(item?.amount ?? 0) || 0,
          paymentMethod: String(item?.paymentMethod || "银行转账"),
          receiptDate: String(item?.receiptDate || ""),
          remarks: item?.remarks ? String(item.remarks) : "",
          attachments: Array.isArray(item?.attachments)
            ? item.attachments.map((x: any) => String(x))
            : [],
          createdAt: String(item?.createdAt || ""),
          bizType: item?.bizType ? String(item.bizType) : "",
          title: item?.title ? String(item.title) : "",
        })
      )
      .filter(item => Boolean(item.id));
  } catch {
    return [];
  }
}

function countOpenFinanceTodos(remark: unknown): number {
  return parseFinanceTodoList(remark).filter(
    item => String(item.status || "open") === "open"
  ).length;
}

function isReceivableFinanceWorkflowCompleted(params: {
  status?: unknown;
  amount?: unknown;
  paidAmount?: unknown;
}): boolean {
  const status = String(params.status || "").toLowerCase();
  const amount = Number(params.amount || 0);
  const paidAmount = Number(params.paidAmount || 0);
  return (
    status === "received" ||
    status === "paid" ||
    status === "completed" ||
    (Number.isFinite(amount) &&
      amount > 0 &&
      Number.isFinite(paidAmount) &&
      paidAmount >= amount - 0.0001)
  );
}

function isPayableFinanceWorkflowCompleted(params: {
  status?: unknown;
  amount?: unknown;
  paidAmount?: unknown;
}): boolean {
  const status = String(params.status || "").toLowerCase();
  const amount = Number(params.amount || 0);
  const paidAmount = Number(params.paidAmount || 0);
  return (
    status === "paid" ||
    status === "completed" ||
    (Number.isFinite(amount) &&
      amount > 0 &&
      Number.isFinite(paidAmount) &&
      paidAmount >= amount - 0.0001)
  );
}

function setFinanceTodoList(remark: unknown, list: FinanceTodoMeta[]): string {
  const lines = String(remark ?? "")
    .split("\n")
    .filter(line => !line.startsWith(FINANCE_TODO_LIST_MARKER))
    .filter(line => line.trim().length > 0);
  if (list.length > 0) {
    lines.push(`${FINANCE_TODO_LIST_MARKER}${JSON.stringify(list)}`);
  }
  return lines.join("\n").trim();
}

function createFinanceTodoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureFinanceTodoInRemark(
  remark: unknown,
  data: {
    amount?: unknown;
    paymentMethod?: unknown;
    receiptDate?: unknown;
    remarks?: unknown;
    bizType?: unknown;
    title?: unknown;
  }
) {
  const currentList = parseFinanceTodoList(remark);
  const bizType = String(data.bizType || "").trim();
  const title = String(data.title || "").trim();
  const nextTodo: FinanceTodoMeta = {
    id: createFinanceTodoId(),
    status: "open",
    amount: Number(data.amount ?? 0) || 0,
    paymentMethod: String(data.paymentMethod || "银行转账"),
    receiptDate: String(data.receiptDate || ""),
    remarks: data.remarks ? String(data.remarks) : "",
    attachments: [],
    createdAt: new Date().toISOString(),
    bizType,
    title,
  };

  const matchedIndex = currentList.findIndex(item => {
    if (String(item.status || "open") !== "open") return false;
    if (bizType && String(item.bizType || "").trim() === bizType) return true;
    if (!bizType && title && String(item.title || "").trim() === title) return true;
    return false;
  });

  if (matchedIndex >= 0) {
    currentList[matchedIndex] = {
      ...currentList[matchedIndex],
      amount: nextTodo.amount,
      paymentMethod: nextTodo.paymentMethod,
      receiptDate: nextTodo.receiptDate,
      remarks: nextTodo.remarks,
      bizType: nextTodo.bizType,
      title: nextTodo.title,
    };
    return setFinanceTodoList(remark, currentList);
  }

  return setFinanceTodoList(remark, [...currentList, nextTodo]);
}

function removeFinanceTodoFromRemark(remark: unknown, todoId: unknown): string {
  const normalizedTodoId = String(todoId || "").trim();
  if (!normalizedTodoId) return String(remark ?? "");
  const nextList = parseFinanceTodoList(remark).filter(
    item => String(item.id || "").trim() !== normalizedTodoId
  );
  return setFinanceTodoList(remark, nextList);
}

function parseWorkflowUserIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(
        raw
          .map(item => Number(String(item || "").trim()))
          .filter((id): id is number => Number.isFinite(id) && id > 0)
      )
    );
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map(item => Number(String(item || "").trim()))
          .filter((id): id is number => Number.isFinite(id) && id > 0)
      )
    );
  } catch {
    return [];
  }
}

function formatWorkflowAmount(
  currencyRaw: unknown,
  amountRaw: unknown
): string {
  const currency = String(currencyRaw || "CNY").toUpperCase();
  const amount = Number(amountRaw ?? 0) || 0;
  const symbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : currency === "HKD"
            ? "HK$"
            : "¥";
  return formatCurrencyValue(amount, symbol, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

async function getActiveWorkflowTemplateByForm(
  db: any,
  params: { module: string; formType: string; name: string }
) {
  await ensureWorkflowRuntimeTables(db);
  await ensureWorkflowTemplatesTable(db);
  const rows = await db
    .select()
    .from(workflowTemplates)
    .where(
      and(
        eq(workflowTemplates.module, params.module),
        eq(workflowTemplates.formType, params.formType),
        eq(workflowTemplates.name, params.name),
        eq(workflowTemplates.status, "active")
      )
    )
    .orderBy(desc(workflowTemplates.updatedAt), desc(workflowTemplates.id))
    .limit(1);
  return rows[0];
}

type ConfiguredWorkflowSource = {
  module: string;
  formType: string;
  formName: string;
  sourceTable: string;
  sourceId: number;
  sourceNo?: string | null;
  title?: string | null;
  routePath?: string | null;
  targetName?: string | null;
  applicantId?: number | null;
  applicantName?: string | null;
};

type WorkflowExecutionConfig = {
  approvalEnabled: boolean;
  catalog?: WorkflowFormCatalog;
  template?: WorkflowTemplate;
  flowMode: "approval" | "notice" | null;
  initiatorIds: number[];
  approvalStepIds: number[];
  handlerIds: number[];
  ccRecipientIds: number[];
};

export type ConfiguredWorkflowState = {
  runId: number | null;
  approvalEnabled: boolean;
  flowMode: "approval" | "notice" | null;
  status:
    | "none"
    | "pending"
    | "approved"
    | "rejected"
    | "cancelled"
    | "completed";
  stage: "none" | "approval";
  stageLabel: string;
  stepIndex: number;
  totalSteps: number;
  currentApproverId: number | null;
  currentApproverName: string;
  canApprove: boolean;
};

export async function getWorkflowExecutionConfig(
  db: any,
  params: { module: string; formType: string; formName: string }
): Promise<WorkflowExecutionConfig> {
  await ensureWorkflowRuntimeTables(db);
  const catalog = await getWorkflowFormCatalogItem({
    module: params.module,
    formType: params.formType,
    formName: params.formName,
  });
  const approvalEnabled = Boolean(catalog?.approvalEnabled);
  const template = approvalEnabled
    ? await getActiveWorkflowTemplateByForm(db, {
        module: params.module,
        formType: params.formType,
        name: params.formName,
      })
    : undefined;

  return {
    approvalEnabled,
    catalog,
    template,
    flowMode: template?.flowMode || null,
    initiatorIds: parseWorkflowUserIds(template?.initiators),
    approvalStepIds: parseWorkflowUserIds(template?.approvalSteps),
    handlerIds: parseWorkflowUserIds(template?.handlers),
    ccRecipientIds: parseWorkflowUserIds(template?.ccRecipients),
  };
}

async function getWorkflowUserNameMap(db: any, userIds: number[]) {
  const normalizedIds = Array.from(
    new Set(
      userIds.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0)
    )
  );
  if (normalizedIds.length === 0) return new Map<number, string>();
  const rows: Array<{ id: number; name: string | null }> = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, normalizedIds));
  return new Map(rows.map(row => [Number(row.id), String(row.name || "")]));
}

function buildWorkflowStepLabel(run: {
  status: string | null;
  currentStepIndex: number | null;
  totalSteps: number | null;
  currentApproverName?: string | null;
}) {
  const status = String(run.status || "");
  const stepIndex = Math.max(0, Number(run.currentStepIndex || 0));
  const totalSteps = Math.max(0, Number(run.totalSteps || 0));
  const approverName = String(run.currentApproverName || "").trim();
  if (status === "approved" || status === "completed") return "审批完成";
  if (status === "rejected") return "已驳回";
  if (status === "cancelled") return "已取消";
  if (stepIndex <= 0 || totalSteps <= 0) return "待处理";
  const prefix = `第${stepIndex}/${totalSteps}级审批`;
  return approverName ? `${prefix} · ${approverName}` : prefix;
}

function canApproveConfiguredWorkflowRun(
  run: { status: string | null; currentApproverId?: number | null },
  currentUserId?: number | null,
  currentUserRole?: string | null
) {
  if (String(run.status || "") !== "pending") return false;
  const approverId = Number(run.currentApproverId || 0);
  return approverId > 0 && approverId === Number(currentUserId || 0);
}

function mapConfiguredWorkflowSourceType(
  sourceTable: string
): WorkflowCenterItem["sourceType"] {
  if (sourceTable === "sales_orders") return "sales_order";
  if (sourceTable === "purchase_orders") return "purchase_order";
  if (sourceTable === "expense_reimbursements") return "expense_reimbursement";
  return "workflow_approval";
}

async function getLatestWorkflowRunBySource(
  db: any,
  params: { sourceTable: string; sourceId: number }
) {
  await ensureWorkflowRuntimeTables(db);
  const rows = await db
    .select()
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.sourceTable, params.sourceTable),
        eq(workflowRuns.sourceId, params.sourceId)
      )
    )
    .orderBy(desc(workflowRuns.id))
    .limit(1);
  return rows[0];
}

async function getPendingWorkflowRunBySource(
  db: any,
  params: { sourceTable: string; sourceId: number }
) {
  await ensureWorkflowRuntimeTables(db);
  const rows = await db
    .select()
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.sourceTable, params.sourceTable),
        eq(workflowRuns.sourceId, params.sourceId),
        eq(workflowRuns.status, "pending")
      )
    )
    .orderBy(desc(workflowRuns.id))
    .limit(1);
  return rows[0];
}

async function appendWorkflowRunLog(db: any, data: InsertWorkflowRunLog) {
  await ensureWorkflowRuntimeTables(db);
  await db.insert(workflowRunLogs).values(data);
}

export async function submitConfiguredWorkflow(
  params: ConfiguredWorkflowSource
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowRuntimeTables(db);

  const config = await getWorkflowExecutionConfig(db, {
    module: params.module,
    formType: params.formType,
    formName: params.formName,
  });

  if (!config.approvalEnabled) {
    return {
      approvalEnabled: false,
      requiresApproval: false,
      config,
      run: null as WorkflowRun | null,
    };
  }

  if (!config.template) {
    throw new Error(`请先在审批流程设置中配置「${params.formName}」流程模板`);
  }
  if (config.flowMode !== "approval") {
    throw new Error(
      `「${params.formName}」当前不是审核流程，请将流程模式改为审核`
    );
  }
  if (config.approvalStepIds.length === 0) {
    throw new Error(`「${params.formName}」未配置审核步骤`);
  }

  const applicantId = Number(params.applicantId || 0);
  if (
    config.initiatorIds.length > 0 &&
    applicantId > 0 &&
    !config.initiatorIds.includes(applicantId)
  ) {
    throw new Error("当前用户不在该流程发起人范围内");
  }

  const existingRun = await getPendingWorkflowRunBySource(db, {
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  });
  if (existingRun) {
    return {
      approvalEnabled: true,
      requiresApproval: true,
      config,
      run: existingRun,
    };
  }

  const nameMap = await getWorkflowUserNameMap(db, [
    applicantId,
    ...config.approvalStepIds,
  ]);
  const firstApproverId = Number(config.approvalStepIds[0] || 0) || null;
  const applicantName = String(
    params.applicantName ||
      (applicantId > 0 ? nameMap.get(applicantId) || "" : "")
  ).trim();

  const insertResult = await db.insert(workflowRuns).values({
    templateId: config.template.id,
    module: params.module,
    formType: params.formType,
    formName: params.formName,
    flowMode: "approval",
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
    sourceNo: params.sourceNo || null,
    title: params.title || `${params.formName}审批`,
    routePath: params.routePath || null,
    targetName: params.targetName || null,
    applicantId: applicantId || null,
    applicantName: applicantName || null,
    status: "pending",
    currentStepIndex: 1,
    totalSteps: config.approvalStepIds.length,
    currentApproverId: firstApproverId,
    currentApproverName: firstApproverId
      ? nameMap.get(firstApproverId) || ""
      : null,
    initiators: config.template.initiators || null,
    approvalSteps: config.template.approvalSteps || null,
    handlers: config.template.handlers || null,
    ccRecipients: config.template.ccRecipients || null,
  });
  const runId = Number(insertResult[0]?.insertId || 0);
  if (!runId) {
    throw new Error("流程启动失败");
  }

  await appendWorkflowRunLog(db, {
    runId,
    action: "submit",
    stepIndex: 0,
    actorId: applicantId || null,
    actorName: applicantName || null,
    comment: null,
  });

  const run = await getLatestWorkflowRunBySource(db, {
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  });

  return {
    approvalEnabled: true,
    requiresApproval: true,
    config,
    run: run || null,
  };
}

export async function getConfiguredWorkflowState(params: {
  module: string;
  formType: string;
  formName: string;
  sourceTable: string;
  sourceId: number;
  currentUserId?: number | null;
  currentUserRole?: string | null;
}): Promise<ConfiguredWorkflowState> {
  const db = await getDb();
  if (!db) {
    return {
      runId: null,
      approvalEnabled: false,
      flowMode: null,
      status: "none",
      stage: "none",
      stageLabel: "",
      stepIndex: 0,
      totalSteps: 0,
      currentApproverId: null,
      currentApproverName: "",
      canApprove: false,
    };
  }
  await ensureWorkflowRuntimeTables(db);

  const config = await getWorkflowExecutionConfig(db, {
    module: params.module,
    formType: params.formType,
    formName: params.formName,
  });
  const run = await getLatestWorkflowRunBySource(db, {
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  });

  if (!run) {
    return {
      runId: null,
      approvalEnabled: config.approvalEnabled,
      flowMode: config.flowMode,
      status: "none",
      stage: "none",
      stageLabel: config.approvalEnabled ? "待提交审批" : "",
      stepIndex: 0,
      totalSteps: config.approvalStepIds.length,
      currentApproverId: null,
      currentApproverName: "",
      canApprove: false,
    };
  }

  const runStatus = String(
    run.status || ""
  ) as ConfiguredWorkflowState["status"];
  return {
    runId: Number(run.id || 0) || null,
    approvalEnabled: config.approvalEnabled,
    flowMode: config.flowMode,
    status: [
      "pending",
      "approved",
      "rejected",
      "cancelled",
      "completed",
    ].includes(runStatus)
      ? runStatus
      : "none",
    stage: runStatus === "pending" ? "approval" : "none",
    stageLabel: buildWorkflowStepLabel(run),
    stepIndex: Number(run.currentStepIndex || 0),
    totalSteps: Number(run.totalSteps || 0),
    currentApproverId: Number(run.currentApproverId || 0) || null,
    currentApproverName: String(run.currentApproverName || ""),
    canApprove: canApproveConfiguredWorkflowRun(
      run,
      params.currentUserId,
      params.currentUserRole
    ),
  };
}

export async function approveConfiguredWorkflow(params: {
  sourceTable: string;
  sourceId: number;
  actorId?: number | null;
  actorName?: string | null;
  actorRole?: string | null;
  comment?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowRuntimeTables(db);

  const run = await getPendingWorkflowRunBySource(db, {
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  });
  if (!run) {
    throw new Error("当前记录没有待审批流程");
  }
  if (!canApproveConfiguredWorkflowRun(run, params.actorId, params.actorRole)) {
    const approverName = String(run.currentApproverName || "指定审批人");
    throw new Error(`当前记录待${approverName}审批`);
  }

  const stepIds = parseWorkflowUserIds(run.approvalSteps);
  const currentStepIndex = Math.max(1, Number(run.currentStepIndex || 1));
  const actorName = String(params.actorName || "").trim() || null;

  await appendWorkflowRunLog(db, {
    runId: Number(run.id),
    action: "approve",
    stepIndex: currentStepIndex,
    actorId: Number(params.actorId || 0) || null,
    actorName,
    comment: params.comment || null,
  });

  const nextStepIndex = currentStepIndex + 1;
  if (nextStepIndex <= stepIds.length) {
    const nextApproverId = Number(stepIds[nextStepIndex - 1] || 0) || null;
    const nameMap = await getWorkflowUserNameMap(
      db,
      nextApproverId ? [nextApproverId] : []
    );
    await db
      .update(workflowRuns)
      .set({
        currentStepIndex: nextStepIndex,
        currentApproverId: nextApproverId,
        currentApproverName: nextApproverId
          ? nameMap.get(nextApproverId) || ""
          : null,
      })
      .where(eq(workflowRuns.id, Number(run.id)));
  } else {
    await db
      .update(workflowRuns)
      .set({
        status: "approved",
        currentApproverId: null,
        currentApproverName: null,
        completedAt: new Date() as any,
      })
      .where(eq(workflowRuns.id, Number(run.id)));
    await appendWorkflowRunLog(db, {
      runId: Number(run.id),
      action: "complete",
      stepIndex: currentStepIndex,
      actorId: Number(params.actorId || 0) || null,
      actorName,
      comment: params.comment || null,
    });
  }

  const actorSnapshot = await getOperationActorSnapshot(db, params.actorId);
  const operationMeta = getWorkflowOperationLogMeta(params.sourceTable);
  await createOperationLog({
    module: operationMeta.module,
    action: "approve",
    targetType: operationMeta.targetType,
    targetId: String(params.sourceId),
    targetName: `${operationMeta.title} #${params.sourceId}`,
    description: `审批通过：${operationMeta.title} #${params.sourceId}`,
    operatorId: Number(params.actorId || 0) || undefined,
    operatorName: actorSnapshot?.name || actorName || "系统",
    operatorRole: actorSnapshot?.role || String(params.actorRole || "") || undefined,
    operatorDepartment: actorSnapshot?.department,
    result: "success",
  });

  return await getLatestWorkflowRunBySource(db, {
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  });
}

export async function rejectConfiguredWorkflow(params: {
  sourceTable: string;
  sourceId: number;
  actorId?: number | null;
  actorName?: string | null;
  actorRole?: string | null;
  comment?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowRuntimeTables(db);

  const run = await getPendingWorkflowRunBySource(db, {
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  });
  if (!run) {
    throw new Error("当前记录没有待审批流程");
  }
  if (!canApproveConfiguredWorkflowRun(run, params.actorId, params.actorRole)) {
    const approverName = String(run.currentApproverName || "指定审批人");
    throw new Error(`当前记录待${approverName}审批`);
  }

  await appendWorkflowRunLog(db, {
    runId: Number(run.id),
    action: "reject",
    stepIndex: Math.max(1, Number(run.currentStepIndex || 1)),
    actorId: Number(params.actorId || 0) || null,
    actorName: String(params.actorName || "").trim() || null,
    comment: params.comment || null,
  });

  await db
    .update(workflowRuns)
    .set({
      status: "rejected",
      currentApproverId: null,
      currentApproverName: null,
      completedAt: new Date() as any,
    })
    .where(eq(workflowRuns.id, Number(run.id)));

  const actorSnapshot = await getOperationActorSnapshot(db, params.actorId);
  const operationMeta = getWorkflowOperationLogMeta(params.sourceTable);
  await createOperationLog({
    module: operationMeta.module,
    action: "reject",
    targetType: operationMeta.targetType,
    targetId: String(params.sourceId),
    targetName: `${operationMeta.title} #${params.sourceId}`,
    description: `审批驳回：${operationMeta.title} #${params.sourceId}`,
    operatorId: Number(params.actorId || 0) || undefined,
    operatorName:
      actorSnapshot?.name || String(params.actorName || "").trim() || "系统",
    operatorRole: actorSnapshot?.role || String(params.actorRole || "") || undefined,
    operatorDepartment: actorSnapshot?.department,
    result: "success",
  });

  return await getLatestWorkflowRunBySource(db, {
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  });
}

export async function getConfiguredWorkflowHistory(params: {
  sourceTable: string;
  sourceId: number;
}) {
  const db = await getDb();
  if (!db) return [] as WorkflowRunLog[];
  await ensureWorkflowRuntimeTables(db);

  const runRows = await db
    .select({ id: workflowRuns.id })
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.sourceTable, params.sourceTable),
        eq(workflowRuns.sourceId, params.sourceId)
      )
    )
    .orderBy(desc(workflowRuns.id));
  const runIds = runRows.map(row => Number(row.id)).filter(id => id > 0);
  if (runIds.length === 0) return [] as WorkflowRunLog[];

  return await db
    .select()
    .from(workflowRunLogs)
    .where(inArray(workflowRunLogs.runId, runIds))
    .orderBy(asc(workflowRunLogs.createdAt), asc(workflowRunLogs.id));
}

async function getConfiguredWorkflowTodoItems(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    limit: number;
  }
): Promise<WorkflowCenterItem[]> {
  await ensureWorkflowRuntimeTables(db);
  const rows: WorkflowRun[] = await db
    .select()
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.status, "pending"),
        eq(workflowRuns.currentApproverId, params.operatorId)
      )
    )
    .orderBy(desc(workflowRuns.submittedAt), desc(workflowRuns.id))
    .limit(params.limit * 2);

  const purchaseOrderIds = rows
    .filter(row => String(row.sourceTable || "") === "purchase_orders")
    .map(row => Number(row.sourceId || 0))
    .filter(id => id > 0);
  const uniquePurchaseOrderIds = Array.from(new Set(purchaseOrderIds));
  const purchaseOrderMap = new Map<
    number,
    {
      supplierName: string;
      totalAmount: unknown;
      currency: unknown;
      orderNo: string;
    }
  >();
  const purchaseOrderItemCountMap = new Map<number, number>();

  if (uniquePurchaseOrderIds.length > 0) {
    const purchaseRows = await db
      .select({
        id: purchaseOrders.id,
        orderNo: purchaseOrders.orderNo,
        supplierName: sql<string>`COALESCE(${purchaseOrders.supplierName}, ${suppliers.name})`,
        totalAmount: purchaseOrders.totalAmount,
        currency: purchaseOrders.currency,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(inArray(purchaseOrders.id, uniquePurchaseOrderIds));

    purchaseRows.forEach((row: any) => {
      purchaseOrderMap.set(Number(row.id), {
        supplierName: String(row.supplierName || ""),
        totalAmount: row.totalAmount,
        currency: row.currency,
        orderNo: String(row.orderNo || ""),
      });
    });

    const purchaseItemRows = await db
      .select({
        orderId: purchaseOrderItems.orderId,
        id: purchaseOrderItems.id,
      })
      .from(purchaseOrderItems)
      .where(inArray(purchaseOrderItems.orderId, uniquePurchaseOrderIds));

    purchaseItemRows.forEach((row: any) => {
      const orderId = Number(row.orderId || 0);
      if (orderId <= 0) return;
      purchaseOrderItemCountMap.set(
        orderId,
        (purchaseOrderItemCountMap.get(orderId) || 0) + 1
      );
    });
  }

  return rows
    .map(row => {
      const sourceTable = String(row.sourceTable || "");
      const sourceId = Number(row.sourceId || 0) || null;
      const purchaseMeta =
        sourceTable === "purchase_orders" && sourceId
          ? purchaseOrderMap.get(sourceId)
          : null;
      const itemCount =
        sourceTable === "purchase_orders" && sourceId
          ? purchaseOrderItemCountMap.get(sourceId) || 0
          : 0;

      return {
      id: `run-${row.id}`,
      tab: "todo" as const,
      sourceType: mapConfiguredWorkflowSourceType(sourceTable),
      module: String(row.module || "-"),
      formType: String(row.formName || row.formType || "-"),
      title: String(
        row.title || `${row.formName || row.formType || "流程"}审批`
      ),
      documentNo: String(
        purchaseMeta?.orderNo || row.sourceNo || row.sourceId || "-"
      ),
      targetName: String(
        purchaseMeta?.supplierName || row.targetName || "-"
      ),
      applicantName: String(row.applicantName || "-"),
      currentStep: buildWorkflowStepLabel(row),
      statusLabel: "待审批",
      amountText: purchaseMeta
        ? formatWorkflowAmount(
            purchaseMeta.currency,
            purchaseMeta.totalAmount
          )
        : "",
      itemCountText: itemCount > 0 ? `${itemCount}个采购物料` : "",
      createdAt: row.submittedAt || row.createdAt,
      routePath: String(row.routePath || ""),
      description: purchaseMeta
        ? [
            String(row.formName || row.formType || "流程"),
            purchaseMeta.supplierName
              ? `· ${purchaseMeta.supplierName}`
              : "",
            itemCount > 0 ? `· ${itemCount}个采购物料` : "",
          ]
            .join(" ")
            .trim()
        : [
            String(row.formName || row.formType || "流程"),
            row.targetName ? `· ${String(row.targetName)}` : "",
          ]
            .join(" ")
            .trim(),
      sourceId,
      sourceTable,
      runId: Number(row.id || 0) || null,
    };
    })
    .slice(0, params.limit);
}

async function getConfiguredWorkflowCcItems(
  db: any,
  params: { operatorId: number; limit: number }
): Promise<WorkflowCenterItem[]> {
  await ensureWorkflowRuntimeTables(db);
  const rows: WorkflowRun[] = await db
    .select()
    .from(workflowRuns)
    .where(ne(workflowRuns.status, "cancelled"))
    .orderBy(desc(workflowRuns.updatedAt), desc(workflowRuns.id))
    .limit(params.limit * 4);

  return rows
    .filter(row =>
      parseWorkflowUserIds(row.ccRecipients).includes(
        Number(params.operatorId || 0)
      )
    )
    .map(row => ({
      id: `cc-run-${row.id}`,
      tab: "cc" as const,
      sourceType: mapConfiguredWorkflowSourceType(
        String(row.sourceTable || "")
      ),
      module: String(row.module || "-"),
      formType: String(row.formName || row.formType || "-"),
      title: String(
        row.title || `${row.formName || row.formType || "流程"}审批`
      ),
      documentNo: String(row.sourceNo || row.sourceId || "-"),
      targetName: String(row.targetName || "-"),
      applicantName: String(row.applicantName || "-"),
      currentStep: "流程抄送",
      statusLabel: String(row.status || "-"),
      amountText: "",
      createdAt: row.updatedAt || row.createdAt,
      routePath: String(row.routePath || ""),
      description: buildWorkflowStepLabel(row),
    }))
    .slice(0, params.limit);
}

async function resolveGoodsReceiptTodoRouting(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
  }
) {
  const workflowAdmin = WORKFLOW_TEST_ROUTE_TO_ADMIN
    ? await getWorkflowSystemAdminUser(db)
    : null;
  if (workflowAdmin) {
    return {
      mode: "test_admin" as const,
      matchesCurrentUser:
        Number(params.operatorId || 0) === Number(workflowAdmin.id),
    };
  }

  const template = await getActiveWorkflowTemplateByForm(db, {
    module: "采购部",
    formType: "业务单据",
    name: "到货管理",
  });

  if (template?.flowMode === "notice") {
    const handlerIds = parseWorkflowUserIds(template.handlers);
    if (handlerIds.length > 0) {
      return {
        mode: "notice" as const,
        matchesCurrentUser: handlerIds.includes(Number(params.operatorId || 0)),
      };
    }
  }

  const executorUserIds = await getQualityIqcExecutorUserIds(db);
  if (executorUserIds.length > 0) {
    return {
      mode: "fallback" as const,
      matchesCurrentUser: executorUserIds.includes(
        Number(params.operatorId || 0)
      ),
    };
  }

  const userDepartments = parseDepartmentNames(params.operatorDepartment);
  return {
    mode: "fallback" as const,
    matchesCurrentUser: userDepartments.includes("质量部"),
  };
}

async function getWarehouseApproverUsersForWorkflow(db: any) {
  const preferredRows: Array<{ id: number; name: string | null }> = await db
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

  const fallbackRows: Array<{ id: number; name: string | null }> =
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

async function resolveMaterialRequisitionTodoRouting(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
  }
) {
  const workflowAdmin = WORKFLOW_TEST_ROUTE_TO_ADMIN
    ? await getWorkflowSystemAdminUser(db)
    : null;
  if (workflowAdmin) {
    return {
      approverIds: [Number(workflowAdmin.id)],
      matchesCurrentUser:
        Number(params.operatorId || 0) === Number(workflowAdmin.id),
    };
  }

  const approverUsers = await getWarehouseApproverUsersForWorkflow(db);
  const approverIds = approverUsers
    .map(user => Number(user.id))
    .filter(id => id > 0);
  return {
    approverIds,
    matchesCurrentUser: approverIds.includes(Number(params.operatorId || 0)),
  };
}

function matchWorkflowSearch(
  item: WorkflowCenterItem,
  keyword: string
): boolean {
  if (!keyword) return true;
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [
    item.module,
    item.formType,
    item.title,
    item.documentNo,
    item.targetName,
    item.applicantName,
    item.currentStep,
    item.statusLabel,
    item.description,
  ].some(value =>
    String(value || "")
      .toLowerCase()
      .includes(normalized)
  );
}

function getWorkflowModuleLabel(moduleRaw: unknown): string {
  const module = String(moduleRaw || "");
  const map: Record<string, string> = {
    department: "系统设置",
    code_rule: "系统设置",
    user: "系统设置",
    language: "系统设置",
    system: "系统设置",
    product: "研发部",
    customer: "销售部",
    supplier: "采购部",
    inventory: "仓库管理",
    order: "订单管理",
    quality: "质量部",
    production: "生产部",
    finance: "财务部",
    document: "管理部",
  };
  return map[module] || module || "系统";
}

function getWorkflowLogActionLabel(actionRaw: unknown): string {
  const action = String(actionRaw || "");
  const map: Record<string, string> = {
    create: "已发起",
    approve: "已审批",
    reject: "已驳回",
    status_change: "状态变更",
    update: "已更新",
    delete: "已删除",
  };
  return map[action] || "已处理";
}

function buildWorkflowLogRoute(log: {
  module: string | null;
  targetType: string | null;
  targetId: string | null;
  description: string | null;
}): string {
  const module = String(log.module || "");
  const targetType = String(log.targetType || "").toLowerCase();
  const targetId = Number(log.targetId || 0);
  const description = String(log.description || "");

  if (
    targetType.includes("payable") ||
    targetType.includes("付款记录") ||
    /采购付款|报销付款|付款处理/.test(description)
  ) {
    return "/purchase/finance";
  }
  if (
    targetType.includes("receipt") ||
    targetType.includes("收款记录") ||
    /销售收款|收款处理/.test(description)
  ) {
    return "/finance/receivable";
  }
  if (
    targetType.includes("sales") ||
    (module === "order" && /销售/.test(description))
  ) {
    return Number.isFinite(targetId) && targetId > 0
      ? `/sales/orders?id=${targetId}`
      : "/sales/orders";
  }
  if (targetType.includes("purchase") || /采购/.test(description)) {
    return Number.isFinite(targetId) && targetId > 0
      ? `/purchase/orders?focusId=${targetId}`
      : "/purchase/orders";
  }
  if (
    targetType.includes("receivable") ||
    targetType.includes("invoice") ||
    targetType.includes("receipt")
  ) {
    return Number.isFinite(targetId) && targetId > 0
      ? `/finance/receivable?focusId=${targetId}`
      : "/finance/receivable";
  }
  if (targetType.includes("customer") || module === "customer")
    return "/sales/customers";
  if (targetType.includes("supplier") || module === "supplier")
    return "/purchase/suppliers";
  if (targetType.includes("product") || module === "product")
    return "/rd/products";
  if (targetType.includes("document") || module === "document")
    return "/admin/documents";
  if (targetType.includes("warehouse") || module === "inventory")
    return "/warehouse/inventory";
  if (module === "finance") return "/finance/receivable";
  if (module === "production") return "/production/orders";
  if (module === "quality") return "/quality/iqc";
  if (module === "department") return "/settings/departments";
  if (module === "code_rule") return "/settings/codes";
  if (module === "user") return "/settings/users";
  if (module === "language") return "/settings/language";
  if (module === "system") return "/settings/workflows";
  return "";
}

export async function getWorkflowSystemAdminUser(
  dbArg?: any
): Promise<{ id: number; name: string } | null> {
  const db = dbArg ?? (await getDb());
  if (!db) return null;

  const rows: Array<{ id: number; name: string | null }> = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(
      sql`CASE WHEN ${users.name} = ${WORKFLOW_SYSTEM_ADMIN_NAME} THEN 0 ELSE 1 END`,
      asc(users.id)
    )
    .limit(1);

  if (!rows[0]) return null;
  return {
    id: Number(rows[0].id),
    name: String(rows[0].name || WORKFLOW_SYSTEM_ADMIN_NAME),
  };
}

async function getSalesWorkflowTodoItems(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    limit: number;
  }
): Promise<WorkflowCenterItem[]> {
  await ensureWorkflowRuntimeTables(db);
  const pendingOrders: Array<{
    id: number;
    orderNo: string | null;
    customerName: string | null;
    totalAmount: string | null;
    currency: string | null;
    createdAt: Date | null;
    createdBy: number | null;
    salesPersonId: number | null;
    status: string | null;
  }> = await db
    .select({
      id: salesOrders.id,
      orderNo: salesOrders.orderNo,
      customerName: customers.name,
      totalAmount: salesOrders.totalAmount,
      currency: salesOrders.currency,
      createdAt: salesOrders.createdAt,
      createdBy: salesOrders.createdBy,
      salesPersonId: salesOrders.salesPersonId,
      status: salesOrders.status,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(eq(salesOrders.status, "pending_review"))
    .orderBy(desc(salesOrders.createdAt));

  const configuredRunRows: Array<{ sourceId: number }> = await db
    .select({ sourceId: workflowRuns.sourceId })
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.sourceTable, "sales_orders"),
        eq(workflowRuns.status, "pending")
      )
    );
  const configuredSourceIds = new Set(
    configuredRunRows
      .map(row => Number(row.sourceId))
      .filter(id => Number.isFinite(id) && id > 0)
  );
  const fallbackOrders = pendingOrders.filter(
    order => !configuredSourceIds.has(Number(order.id))
  );

  const approvalStateMap = await buildSalesOrderApprovalStates(
    db,
    fallbackOrders,
    params.operatorId,
    params.operatorRole
  );
  const applicantIds = Array.from(
    new Set(
      fallbackOrders
        .map(order => Number(order.createdBy || order.salesPersonId || 0))
        .filter(id => id > 0)
    )
  );
  const applicantRows: Array<{ id: number; name: string | null }> =
    applicantIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, applicantIds))
      : [];
  const applicantMap = new Map(
    applicantRows.map(user => [Number(user.id), String(user.name || "")])
  );

  return fallbackOrders
    .filter(order => {
      const state = approvalStateMap.get(order.id);
      if (!state || state.stage === "none") return false;
      return state.canApprove;
    })
    .slice(0, params.limit)
    .map(order => {
      const state = approvalStateMap.get(order.id);
      const stageLabel =
        state?.stage === "manager"
          ? "部门负责人审批"
          : state?.stage === "general_manager"
            ? "总经理审批"
            : state?.stage === "system_admin"
              ? "系统管理员审批"
              : "待审批";
      const applicantId = Number(order.createdBy || order.salesPersonId || 0);
      return {
        id: `sales-${order.id}`,
        tab: "todo" as const,
        sourceType: "sales_order" as const,
        module: "销售部",
        formType: "销售订单",
        title: "销售订单审批",
        documentNo: String(order.orderNo || `SO-${order.id}`),
        targetName: String(order.customerName || "-"),
        applicantName: applicantMap.get(applicantId) || "-",
        currentStep: stageLabel,
        statusLabel: "待审批",
        amountText: formatWorkflowAmount(order.currency, order.totalAmount),
        createdAt: order.createdAt,
        routePath: `/sales/orders?id=${order.id}`,
        description: `${String(order.customerName || "-")} · ${formatWorkflowAmount(order.currency, order.totalAmount)}`,
        sourceId: Number(order.id || 0) || null,
        sourceTable: "sales_orders",
      };
    });
}

async function resolveReceivableFinanceWorkflowRouting(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
  }
) {
  const catalog = await getWorkflowFormCatalogItem({
    module: "销售部",
    formType: "协同流程",
    formName: "财务协同",
  });
  const template = await getActiveWorkflowTemplateByForm(db, {
    module: "销售部",
    formType: "协同流程",
    name: "财务协同",
  });
  const handlerUserIds = parseWorkflowUserIds(template?.handlers);
  const approvalUserIds = parseWorkflowUserIds(template?.approvalSteps);
  const configuredUserIds =
    handlerUserIds.length > 0 ? handlerUserIds : approvalUserIds;
  const userDepartments = parseDepartmentNames(params.operatorDepartment);
  const fallbackFinanceUser = userDepartments.includes("财务部");

  if (Boolean(catalog?.approvalEnabled) && configuredUserIds.length > 0) {
    return {
      matchesCurrentUser: configuredUserIds.includes(
        Number(params.operatorId || 0)
      ),
    };
  }

  return {
    matchesCurrentUser: fallbackFinanceUser,
  };
}

async function resolvePayableFinanceWorkflowRouting(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
  }
) {
  const orderCatalog = await getWorkflowFormCatalogItem({
    module: "采购部",
    formType: "业务单据",
    formName: "采购订单",
  });
  const orderTemplate = await getActiveWorkflowTemplateByForm(db, {
    module: "采购部",
    formType: "业务单据",
    name: "采购订单",
  });
  const orderHandlerIds = parseWorkflowUserIds(orderTemplate?.handlers);
  if (Boolean(orderCatalog?.approvalEnabled) && orderHandlerIds.length > 0) {
    return {
      matchesCurrentUser: orderHandlerIds.includes(
        Number(params.operatorId || 0)
      ),
    };
  }

  const financeCatalog = await getWorkflowFormCatalogItem({
    module: "采购部",
    formType: "协同流程",
    formName: "财务协同",
  });
  const financeTemplate = await getActiveWorkflowTemplateByForm(db, {
    module: "采购部",
    formType: "协同流程",
    name: "财务协同",
  });
  const financeHandlerIds = parseWorkflowUserIds(financeTemplate?.handlers);
  const financeApprovalIds = parseWorkflowUserIds(financeTemplate?.approvalSteps);
  const configuredUserIds =
    financeHandlerIds.length > 0 ? financeHandlerIds : financeApprovalIds;
  const userDepartments = parseDepartmentNames(params.operatorDepartment);
  const fallbackFinanceUser = userDepartments.includes("财务部");

  if (Boolean(financeCatalog?.approvalEnabled) && configuredUserIds.length > 0) {
    return {
      matchesCurrentUser: configuredUserIds.includes(
        Number(params.operatorId || 0)
      ),
    };
  }

  return {
    matchesCurrentUser: fallbackFinanceUser,
  };
}

async function getFinanceWorkflowTodoItems(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
    limit: number;
  }
): Promise<WorkflowCenterItem[]> {
  if (
    WORKFLOW_TEST_ROUTE_TO_ADMIN &&
    params.operatorRole !== "admin" &&
    !Boolean(params.operatorIsCompanyAdmin)
  ) {
    const workflowAdmin = await getWorkflowSystemAdminUser(db);
    if (
      !workflowAdmin ||
      Number(params.operatorId || 0) !== Number(workflowAdmin.id)
    ) {
      return [];
    }
  }

  const [receivableRouting, payableRouting] = await Promise.all([
    resolveReceivableFinanceWorkflowRouting(db, params),
    resolvePayableFinanceWorkflowRouting(db, params),
  ]);
  if (!receivableRouting.matchesCurrentUser && !payableRouting.matchesCurrentUser) {
    return [];
  }

  const receivableRows: Array<{
    id: number;
    invoiceNo: string | null;
    remark: string | null;
    currency: string | null;
    createdAt: Date | null;
    status: string | null;
    amount: string | number | null;
    paidAmount: string | number | null;
    customerName: string | null;
    orderNo: string | null;
    createdBy: number | null;
    salesPersonId: number | null;
  }> = await db
    .select({
      id: accountsReceivable.id,
      invoiceNo: accountsReceivable.invoiceNo,
      remark: accountsReceivable.remark,
      currency: accountsReceivable.currency,
      createdAt: accountsReceivable.createdAt,
      status: accountsReceivable.status,
      amount: accountsReceivable.amount,
      paidAmount: accountsReceivable.paidAmount,
      customerName: customers.name,
      orderNo: salesOrders.orderNo,
      createdBy: salesOrders.createdBy,
      salesPersonId: salesOrders.salesPersonId,
    })
    .from(accountsReceivable)
    .leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
    .leftJoin(salesOrders, eq(accountsReceivable.salesOrderId, salesOrders.id))
    .orderBy(desc(accountsReceivable.createdAt));

  const applicantIds = Array.from(
    new Set(
      receivableRows
        .map(row => Number(row.createdBy || row.salesPersonId || 0))
        .filter(id => id > 0)
    )
  );
  const applicantRows: Array<{ id: number; name: string | null }> =
    applicantIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, applicantIds))
      : [];
  const applicantMap = new Map(
    applicantRows.map(user => [Number(user.id), String(user.name || "")])
  );

  const items: WorkflowCenterItem[] = [];
  if (receivableRouting.matchesCurrentUser) {
    for (const row of receivableRows) {
      const receivableStatus = String(row.status || "").toLowerCase();
      const totalAmount = Number(row.amount || 0);
      const paidAmount = Number(row.paidAmount || 0);
      const receiptCompleted =
        receivableStatus === "received" ||
        receivableStatus === "paid" ||
        (Number.isFinite(totalAmount) &&
          totalAmount > 0 &&
          Number.isFinite(paidAmount) &&
          paidAmount >= totalAmount - 0.0001);
      if (receiptCompleted) {
        continue;
      }
      const applicantId = Number(row.createdBy || row.salesPersonId || 0);
      for (const todo of parseFinanceTodoList(row.remark).filter(
        item => item.status === "open"
      )) {
        items.push({
          id: `finance-${row.id}-${todo.id}`,
          tab: "todo",
          sourceType: "finance_receipt",
          module: "财务部",
          formType: "收款登记",
          title: "财务收款处理",
          documentNo: String(row.orderNo || row.invoiceNo || row.id),
          targetName: String(row.customerName || "-"),
          applicantName: applicantMap.get(applicantId) || "-",
          currentStep: "财务收款处理",
          statusLabel: "待处理",
          amountText: formatWorkflowAmount(row.currency, todo.amount),
          createdAt: todo.createdAt || row.createdAt,
          routePath: `/finance/receivable?focusId=${row.id}&todoId=${todo.id}`,
          description: todo.remarks
            ? `${String(row.customerName || "-")} · ${todo.remarks}`
            : `${String(row.customerName || "-")} · 本次收款 ${formatWorkflowAmount(row.currency, todo.amount)}`,
          sourceId: Number(row.id || 0) || null,
          sourceTable: "accounts_receivable",
          todoMetaId: String(todo.id || ""),
        });
      }
    }
  }

  const payableRows: Array<{
    id: number;
    invoiceNo: string | null;
    remark: string | null;
    currency: string | null;
    createdAt: Date | null;
    status: string | null;
    amount: string | number | null;
    paidAmount: string | number | null;
    supplierName: string | null;
    orderNo: string | null;
    createdBy: number | null;
    buyerId: number | null;
  }> = await db
    .select({
      id: accountsPayable.id,
      invoiceNo: accountsPayable.invoiceNo,
      remark: accountsPayable.remark,
      currency: accountsPayable.currency,
      createdAt: accountsPayable.createdAt,
      status: accountsPayable.status,
      amount: accountsPayable.amount,
      paidAmount: accountsPayable.paidAmount,
      supplierName: sql<string>`COALESCE(${accountsPayable.supplierName}, ${suppliers.name})`,
      orderNo: purchaseOrders.orderNo,
      createdBy: purchaseOrders.createdBy,
      buyerId: purchaseOrders.buyerId,
    })
    .from(accountsPayable)
    .leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id))
    .leftJoin(
      purchaseOrders,
      eq(accountsPayable.purchaseOrderId, purchaseOrders.id)
    )
    .orderBy(desc(accountsPayable.createdAt));

  const payableApplicantIds = Array.from(
    new Set(
      payableRows
        .map(row => Number(row.createdBy || row.buyerId || 0))
        .filter(id => id > 0)
    )
  );
  const payableApplicantRows: Array<{ id: number; name: string | null }> =
    payableApplicantIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, payableApplicantIds))
      : [];
  const payableApplicantMap = new Map(
    payableApplicantRows.map(user => [Number(user.id), String(user.name || "")])
  );

  if (payableRouting.matchesCurrentUser) {
    for (const row of payableRows) {
      if (
        isPayableFinanceWorkflowCompleted({
          status: row.status,
          amount: row.amount,
          paidAmount: row.paidAmount,
        })
      ) {
        continue;
      }
      const applicantId = Number(row.createdBy || row.buyerId || 0);
      for (const todo of parseFinanceTodoList(row.remark).filter(
        item =>
          item.status === "open" &&
          String(item.bizType || "") !== "reconciliation_review"
      )) {
        if (
          isAccountPeriodPaymentCondition(normalizePaymentCondition(row.paymentMethod)) &&
          !hasReceivedInvoiceEvidence(row.remark)
        ) {
          continue;
        }
        items.push({
          id: `finance-payable-${row.id}-${todo.id}`,
          tab: "todo",
          sourceType: "finance_payable",
          module: "财务部",
          formType: "付款登记",
          title: todo.title || "财务付款处理",
          documentNo: String(row.orderNo || row.invoiceNo || row.id),
          targetName: String(row.supplierName || "-"),
          applicantName: payableApplicantMap.get(applicantId) || "-",
          currentStep: "财务付款处理",
          statusLabel: "待处理",
          amountText: formatWorkflowAmount(row.currency, todo.amount),
          createdAt: todo.createdAt || row.createdAt,
          routePath: `/finance/payable?focusId=${row.id}&todoId=${todo.id}`,
          description: todo.remarks
            ? `${String(row.supplierName || "-")} · ${todo.remarks}`
            : `${String(row.supplierName || "-")} · 本次付款 ${formatWorkflowAmount(row.currency, todo.amount)}`,
          sourceId: Number(row.id || 0) || null,
          sourceTable: "accounts_payable",
          todoMetaId: String(todo.id || ""),
        });
      }
    }
  }

  return items
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    )
    .slice(0, params.limit);
}

async function getQualityWorkflowTodoItems(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
    limit: number;
  }
): Promise<WorkflowCenterItem[]> {
  await ensureGoodsReceiptsTable(db);
  await ensureIqcInspectionsTable(db);
  const routing = await resolveGoodsReceiptTodoRouting(db, params);

  const receiptRows: Array<{
    id: number;
    receiptNo: string | null;
    purchaseOrderNo: string | null;
    supplierName: string | null;
    status: string | null;
    createdAt: Date | null;
    createdBy: number | null;
  }> = await db
    .select({
      id: goodsReceipts.id,
      receiptNo: goodsReceipts.receiptNo,
      purchaseOrderNo: goodsReceipts.purchaseOrderNo,
      supplierName: goodsReceipts.supplierName,
      status: goodsReceipts.status,
      createdAt: goodsReceipts.createdAt,
      createdBy: goodsReceipts.createdBy,
    })
    .from(goodsReceipts)
    .where(inArray(goodsReceipts.status, ["pending_inspection", "inspecting"]))
    .orderBy(desc(goodsReceipts.createdAt));

  const receiptIds = receiptRows.map((row) => Number(row.id || 0)).filter((id) => id > 0);
  const receiptItemRows =
    receiptIds.length > 0
      ? await db
          .select({
            id: goodsReceiptItems.id,
            receiptId: goodsReceiptItems.receiptId,
          })
          .from(goodsReceiptItems)
          .where(inArray(goodsReceiptItems.receiptId, receiptIds))
      : [];
  const receiptItemIds = receiptItemRows.map((row) => Number(row.id || 0)).filter((id) => id > 0);
  const inspectionRows =
    receiptItemIds.length > 0
      ? await db
          .select({
            goodsReceiptItemId: iqcInspections.goodsReceiptItemId,
            result: iqcInspections.result,
            updatedAt: iqcInspections.updatedAt,
            createdAt: iqcInspections.createdAt,
            id: iqcInspections.id,
          })
          .from(iqcInspections)
          .where(inArray(iqcInspections.goodsReceiptItemId, receiptItemIds))
          .orderBy(
            desc(iqcInspections.updatedAt),
            desc(iqcInspections.createdAt),
            desc(iqcInspections.id)
          )
      : [];

  const finishedInspectionByItem = new Set<number>();
  inspectionRows.forEach((row) => {
    const itemId = Number(row.goodsReceiptItemId || 0);
    if (
      itemId > 0 &&
      !finishedInspectionByItem.has(itemId) &&
      String(row.result || "") !== "pending"
    ) {
      finishedInspectionByItem.add(itemId);
    }
  });
  const pendingExecutionReceiptIds = new Set<number>();
  receiptItemRows.forEach((row) => {
    const itemId = Number(row.id || 0);
    const receiptId = Number(row.receiptId || 0);
    if (itemId > 0 && receiptId > 0 && !finishedInspectionByItem.has(itemId)) {
      pendingExecutionReceiptIds.add(receiptId);
    }
  });

  const applicantIds = Array.from(
    new Set(
      receiptRows.map(row => Number(row.createdBy || 0)).filter(id => id > 0)
    )
  );
  const applicantRows: Array<{ id: number; name: string | null }> =
    applicantIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, applicantIds))
      : [];
  const applicantMap = new Map(
    applicantRows.map(user => [Number(user.id), String(user.name || "")])
  );

  const iqcItems = routing.matchesCurrentUser
    ? receiptRows
        .filter((row) => pendingExecutionReceiptIds.has(Number(row.id || 0)))
        .slice(0, params.limit)
        .map(row => ({
          id: `quality-receipt-${row.id}`,
          tab: "todo" as const,
          sourceType: "quality_iqc" as const,
          module: "质量部",
          formType: "来料检验",
          title: routing.mode === "notice" ? "到货通知待处理" : "到货待检验",
          documentNo: String(row.receiptNo || `GR-${row.id}`),
          targetName: String(row.supplierName || "-"),
          applicantName: applicantMap.get(Number(row.createdBy || 0)) || "-",
          currentStep:
            routing.mode === "notice"
              ? "到货通知待处理"
              : row.status === "inspecting"
                ? "来料检验中"
                : "等待来料检验",
          statusLabel: row.status === "inspecting" ? "处理中" : "待处理",
          amountText: "",
          createdAt: row.createdAt,
          routePath: `/quality/iqc?receiptId=${row.id}`,
          description: `${String(row.supplierName || "-")} · 采购单 ${String(row.purchaseOrderNo || "-")}`,
          sourceId: Number(row.id || 0) || null,
          sourceTable: "goods_receipts",
        }))
    : [];

  const iqcReviewRows = await getPendingIqcReviewRows(db);
  const iqcReviewItems = iqcReviewRows
    .filter((row) => Number(row.reviewerId || 0) === Number(params.operatorId || 0))
    .slice(0, params.limit)
    .map((row) => ({
      id: `quality-review-${row.id}`,
      tab: "todo" as const,
      sourceType: "quality_iqc_review" as const,
      module: "质量部",
      formType: "来料检验复核",
      title: "来料检验待复核",
      documentNo: String(row.inspectionNo || `IQC-${row.id}`),
      targetName: String(row.productName || "-"),
      applicantName: String(row.reviewerName || "-"),
      currentStep: "来料检验复核",
      statusLabel: "待复核",
      amountText: "",
      createdAt: row.updatedAt || row.createdAt,
      routePath: `/quality/iqc?detailId=${row.id}&review=1`,
      description: `${String(row.supplierName || "-")} · 采购单 ${String(row.purchaseOrderNo || "-")}`,
      sourceId: Number(row.id || 0) || null,
      sourceTable: "iqc_inspections",
    }));

  const inspectedOqcBatchRows: Array<{ batchNo: string | null }> = await db
    .select({ batchNo: qualityInspections.batchNo })
    .from(qualityInspections)
    .where(eq(qualityInspections.type, "OQC"));
  const inspectedOqcBatchSet = new Set(
    inspectedOqcBatchRows
      .map(row => String(row.batchNo || "").trim())
      .filter(Boolean)
  );

  const oqcRows: Array<{
    id: number;
    entryNo: string | null;
    productName: string | null;
    batchNo: string | null;
    status: string | null;
    createdAt: Date | null;
    createdBy: number | null;
  }> = await db
    .select({
      id: productionWarehouseEntries.id,
      entryNo: productionWarehouseEntries.entryNo,
      productName: productionWarehouseEntries.productName,
      batchNo: productionWarehouseEntries.batchNo,
      status: productionWarehouseEntries.status,
      createdAt: productionWarehouseEntries.createdAt,
      createdBy: productionWarehouseEntries.createdBy,
    })
    .from(productionWarehouseEntries)
    .where(ne(productionWarehouseEntries.status, "rejected"))
    .orderBy(desc(productionWarehouseEntries.createdAt));

  const oqcApplicantIds = Array.from(
    new Set(oqcRows.map(row => Number(row.createdBy || 0)).filter(id => id > 0))
  );
  const oqcApplicantRows: Array<{ id: number; name: string | null }> =
    oqcApplicantIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, oqcApplicantIds))
      : [];
  const oqcApplicantMap = new Map(
    oqcApplicantRows.map(user => [Number(user.id), String(user.name || "")])
  );

  const oqcItems = oqcRows
    .filter(row => {
      const batchNo = String(row.batchNo || "").trim();
      if (!batchNo) return false;
      return !inspectedOqcBatchSet.has(batchNo);
    })
    .slice(0, params.limit)
    .map(row => ({
      id: `quality-oqc-${row.id}`,
      tab: "todo" as const,
      sourceType: "quality_oqc" as const,
      module: "质量部",
      formType: "成品检验",
      title: "成品检验待处理",
      documentNo: String(row.entryNo || `WE-${row.id}`),
      targetName: String(row.productName || "-"),
      applicantName: oqcApplicantMap.get(Number(row.createdBy || 0)) || "-",
      currentStep: "成品检验",
      statusLabel: "待处理",
      amountText: "",
      createdAt: row.createdAt,
      routePath: `/quality/oqc?warehouseEntryId=${row.id}`,
      description: row.batchNo
        ? `生产批号 ${String(row.batchNo)} 待成品检验`
        : "待处理成品检验",
      sourceId: Number(row.id || 0) || null,
      sourceTable: "production_warehouse_entries",
    }));

  return [...iqcItems, ...iqcReviewItems, ...oqcItems]
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    )
    .slice(0, params.limit);
}

async function getMaterialRequisitionWorkflowTodoItems(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
    limit: number;
  }
): Promise<WorkflowCenterItem[]> {
  const routing = await resolveMaterialRequisitionTodoRouting(db, params);
  if (!routing.matchesCurrentUser) return [];

  const rows: Array<{
    id: number;
    requisitionNo: string | null;
    productionOrderNo: string | null;
    createdBy: number | null;
    createdAt: Date | null;
    status: string | null;
  }> = await db
    .select({
      id: materialRequisitionOrders.id,
      requisitionNo: materialRequisitionOrders.requisitionNo,
      productionOrderNo: materialRequisitionOrders.productionOrderNo,
      createdBy: materialRequisitionOrders.createdBy,
      createdAt: materialRequisitionOrders.createdAt,
      status: materialRequisitionOrders.status,
    })
    .from(materialRequisitionOrders)
    .where(eq(materialRequisitionOrders.status, "pending"))
    .orderBy(desc(materialRequisitionOrders.createdAt))
    .limit(params.limit);

  const applicantIds = Array.from(
    new Set(rows.map(row => Number(row.createdBy || 0)).filter(id => id > 0))
  );
  const applicantRows: Array<{ id: number; name: string | null }> =
    applicantIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, applicantIds))
      : [];
  const applicantMap = new Map(
    applicantRows.map(user => [Number(user.id), String(user.name || "")])
  );

  return rows.map(row => ({
    id: `material-requisition-${row.id}`,
    tab: "todo" as const,
    sourceType: "material_requisition" as const,
    module: "生产部",
    formType: "领料单",
    title: "领料单审批",
    documentNo: String(row.requisitionNo || `MR-${row.id}`),
    targetName: String(row.productionOrderNo || "-"),
    applicantName: applicantMap.get(Number(row.createdBy || 0)) || "-",
    currentStep: "仓库负责人审批",
    statusLabel: "待审批",
    amountText: "",
    createdAt: row.createdAt,
    routePath: `/production/material-requisition?focusId=${row.id}`,
    description: row.productionOrderNo
      ? `关联生产指令 ${String(row.productionOrderNo)}，待仓库负责人审核`
      : "待仓库负责人审核领料单",
    sourceId: Number(row.id || 0) || null,
    sourceTable: "material_requisition_orders",
  }));
}

async function getWarehouseWorkflowTodoItems(
  db: any,
  params: {
    operatorId: number;
    operatorRole?: string;
    operatorIsCompanyAdmin?: boolean | null;
    operatorDepartment?: string | null;
    limit: number;
  }
): Promise<WorkflowCenterItem[]> {
  const userDepartments = parseDepartmentNames(params.operatorDepartment);
  const isWarehouseUser =
    userDepartments.includes("仓库管理") ||
    userDepartments.includes("仓库部");
  if (!isWarehouseUser) return [];

  await ensureProductionWarehouseEntryColumns(db);

  const rows: Array<{
    id: number;
    entryNo: string | null;
    productName: string | null;
    batchNo: string | null;
    quantity: string | null;
    unit: string | null;
    createdAt: Date | null;
    createdBy: number | null;
  }> = await db
    .select({
      id: productionWarehouseEntries.id,
      entryNo: productionWarehouseEntries.entryNo,
      productName: productionWarehouseEntries.productName,
      batchNo: productionWarehouseEntries.batchNo,
      quantity: productionWarehouseEntries.quantity,
      unit: productionWarehouseEntries.unit,
      createdAt: productionWarehouseEntries.createdAt,
      createdBy: productionWarehouseEntries.createdBy,
    })
    .from(productionWarehouseEntries)
    .where(eq(productionWarehouseEntries.status, "approved"))
    .orderBy(desc(productionWarehouseEntries.createdAt))
    .limit(params.limit);

  const applicantIds = Array.from(
    new Set(rows.map(row => Number(row.createdBy || 0)).filter(id => id > 0))
  );
  const applicantRows: Array<{ id: number; name: string | null }> =
    applicantIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, applicantIds))
      : [];
  const applicantMap = new Map(
    applicantRows.map(user => [Number(user.id), String(user.name || "")])
  );

  return rows.map(row => ({
    id: `warehouse-production-in-${row.id}`,
    tab: "todo" as const,
    sourceType: "warehouse_production_in" as const,
    module: "仓库管理",
    formType: "入库管理",
    title: "生产入库待处理",
    documentNo: String(row.entryNo || `WE-${row.id}`),
    targetName: String(row.productName || "-"),
    applicantName: applicantMap.get(Number(row.createdBy || 0)) || "-",
    currentStep: "仓库入库",
    statusLabel: "待入库",
    amountText: "",
    createdAt: row.createdAt,
    routePath: `/warehouse/inbound?productionEntryId=${row.id}`,
    description:
      `${String(row.productName || "-")} · 生产批号 ${String(row.batchNo || "-")} · 数量 ${String(row.quantity || "0")} ${String(row.unit || "")}`.trim(),
    sourceId: Number(row.id || 0) || null,
    sourceTable: "production_warehouse_entries",
  }));
}

export async function deleteWorkflowCenterTodo(params: {
  operatorId?: number | null;
  operatorName?: string | null;
  sourceType: WorkflowCenterItem["sourceType"];
  sourceId?: number | null;
  sourceTable?: string | null;
  runId?: number | null;
  todoMetaId?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowRuntimeTables(db);

  const sourceId = Number(params.sourceId || 0);
  const sourceTable = String(params.sourceTable || "").trim();
  const actorId = Number(params.operatorId || 0) || undefined;
  const actorName = String(params.operatorName || "").trim() || null;

  if (
    [
      "sales_order",
      "purchase_order",
      "expense_reimbursement",
      "quality_iqc",
      "quality_oqc",
      "material_requisition",
      "warehouse_production_in",
      "finance_receipt",
      "finance_payable",
      "workflow_approval",
      "quality_iqc_review",
    ].includes(String(params.sourceType || "")) &&
    sourceId <= 0 &&
    !sourceTable &&
    !Number(params.runId || 0)
  ) {
    throw new Error("待办源数据不存在，无法删除");
  }

  if (params.sourceType === "sales_order") {
    await deleteSalesOrder(sourceId, actorId);
    return { success: true };
  }
  if (params.sourceType === "purchase_order") {
    await deletePurchaseOrder(sourceId, actorId);
    return { success: true };
  }
  if (params.sourceType === "expense_reimbursement") {
    await deleteExpenseReimbursement(sourceId, actorId);
    return { success: true };
  }
  if (params.sourceType === "quality_iqc") {
    await deleteGoodsReceipt(sourceId);
    return { success: true };
  }
  if (params.sourceType === "quality_iqc_review") {
    throw new Error("来料检验复核待办不可直接删除，请完成复核");
  }
  if (
    params.sourceType === "quality_oqc" ||
    params.sourceType === "warehouse_production_in"
  ) {
    await deleteProductionWarehouseEntry(sourceId, actorId);
    return { success: true };
  }
  if (params.sourceType === "material_requisition") {
    await deleteMaterialRequisitionOrder(sourceId, actorId);
    return { success: true };
  }
  if (params.sourceType === "finance_receipt") {
    const row = await getAccountsReceivableById(sourceId);
    if (!row) throw new Error("应收记录不存在");
    await updateAccountsReceivable(sourceId, {
      remark: removeFinanceTodoFromRemark(row.remark, params.todoMetaId),
    });
    return { success: true };
  }
  if (params.sourceType === "finance_payable") {
    const row = await getAccountsPayableById(sourceId);
    if (!row) throw new Error("应付记录不存在");
    await updateAccountsPayable(sourceId, {
      remark: removeFinanceTodoFromRemark(row.remark, params.todoMetaId),
    });
    return { success: true };
  }

  if (params.sourceType === "workflow_approval") {
    if (sourceTable === "sales_orders") {
      await deleteSalesOrder(sourceId, actorId);
      return { success: true };
    }
    if (sourceTable === "purchase_orders") {
      await deletePurchaseOrder(sourceId, actorId);
      return { success: true };
    }
    if (sourceTable === "expense_reimbursements") {
      await deleteExpenseReimbursement(sourceId, actorId);
      return { success: true };
    }

    const [run] =
      Number(params.runId || 0) > 0
        ? await db
            .select()
            .from(workflowRuns)
            .where(eq(workflowRuns.id, Number(params.runId)))
            .limit(1)
        : await db
            .select()
            .from(workflowRuns)
            .where(
              and(
                eq(workflowRuns.sourceTable, sourceTable),
                eq(workflowRuns.sourceId, sourceId),
                eq(workflowRuns.status, "pending")
              )
            )
            .orderBy(desc(workflowRuns.id))
            .limit(1);

    if (!run) throw new Error("待办流程不存在");

    await appendWorkflowRunLog(db, {
      runId: Number(run.id),
      action: "cancel",
      stepIndex: Math.max(0, Number(run.currentStepIndex || 0)),
      actorId: actorId || null,
      actorName,
      comment: "管理员删除待办",
    });

    await db
      .update(workflowRuns)
      .set({
        status: "cancelled",
        currentApproverId: null,
        currentApproverName: null,
        completedAt: new Date() as any,
      })
      .where(eq(workflowRuns.id, Number(run.id)));

    return { success: true };
  }

  throw new Error("当前待办类型暂不支持删除");
}

function mapWorkflowItemsToCcItems(
  items: WorkflowCenterItem[]
): WorkflowCenterItem[] {
  return items.map(item => ({
    ...item,
    id: `cc-${item.id}`,
    tab: "cc",
    currentStep: "流程抄送",
    statusLabel: "已抄送",
  }));
}

async function getOperationWorkflowItems(
  db: any,
  params: { operatorId: number; tab: "created" | "processed"; limit: number }
): Promise<WorkflowCenterItem[]> {
  const actionWhere =
    params.tab === "created"
      ? eq(operationLogs.action, "create")
      : inArray(operationLogs.action, ["approve", "reject", "status_change"]);
  const rows: Array<{
    id: number;
    module: string | null;
    action: string | null;
    targetType: string | null;
    targetId: string | null;
    targetName: string | null;
    description: string | null;
    operatorName: string | null;
    operatedAt: Date | null;
  }> = await db
    .select({
      id: operationLogs.id,
      module: operationLogs.module,
      action: operationLogs.action,
      targetType: operationLogs.targetType,
      targetId: operationLogs.targetId,
      targetName: operationLogs.targetName,
      description: operationLogs.description,
      operatorName: operationLogs.operatorName,
      operatedAt: operationLogs.operatedAt,
    })
    .from(operationLogs)
    .where(and(eq(operationLogs.operatorId, params.operatorId), actionWhere))
    .orderBy(desc(operationLogs.operatedAt))
    .limit(params.limit);

  return rows.map(row => ({
    id: `log-${row.id}`,
    tab: params.tab,
    sourceType: "operation_log",
    module: getWorkflowModuleLabel(row.module),
    formType: String(row.targetType || "-"),
    title: String(row.targetName || row.description || "流程记录"),
    documentNo: String(row.targetId || "-"),
    targetName: String(row.targetName || "-"),
    applicantName: String(row.operatorName || "-"),
    currentStep:
      params.tab === "created"
        ? "已发起"
        : getWorkflowLogActionLabel(row.action),
    statusLabel: params.tab === "created" ? "已发起" : "已处理",
    amountText: "",
    createdAt: row.operatedAt,
    routePath: buildWorkflowLogRoute({
      module: row.module,
      targetType: row.targetType,
      targetId: row.targetId,
      description: row.description,
    }),
    description: String(row.description || ""),
  }));
}

export async function getWorkflowCenterData(params: {
  operatorId: number;
  operatorRole?: string;
  operatorIsCompanyAdmin?: boolean | null;
  operatorDepartment?: string | null;
  companyId?: number | null;
  tab: WorkflowCenterTab;
  search?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) {
    return {
      counters: { myTodo: 0, myCreated: 0, myProcessed: 0, ccToMe: 0 },
      items: [] as WorkflowCenterItem[],
    };
  }

  const limit = Math.max(1, Math.min(200, Number(params.limit ?? 100) || 100));
  const dashboardStats = await getDashboardStats({
    operatorId: params.operatorId,
    operatorRole: params.operatorRole,
    operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
    operatorDepartment: params.operatorDepartment,
    companyId: params.companyId,
  });
  const counters = dashboardStats?.workflowCounters ?? {
    myTodo: 0,
    myCreated: 0,
    myProcessed: 0,
    ccToMe: 0,
  };

  let items: WorkflowCenterItem[] = [];
  if (params.tab === "todo") {
    const [
      configuredItems,
      salesItems,
      financeItems,
      qualityItems,
      materialRequisitionItems,
      warehouseItems,
    ] = await Promise.all([
      getConfiguredWorkflowTodoItems(db, {
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        limit,
      }),
      getSalesWorkflowTodoItems(db, {
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        limit,
      }),
      getFinanceWorkflowTodoItems(db, {
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        operatorDepartment: params.operatorDepartment,
        limit,
      }),
      getQualityWorkflowTodoItems(db, {
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        operatorDepartment: params.operatorDepartment,
        limit,
      }),
      getMaterialRequisitionWorkflowTodoItems(db, {
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        operatorDepartment: params.operatorDepartment,
        limit,
      }),
      getWarehouseWorkflowTodoItems(db, {
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        operatorDepartment: params.operatorDepartment,
        limit,
      }),
    ]);
    items = [
      ...configuredItems,
      ...salesItems,
      ...financeItems,
      ...qualityItems,
      ...materialRequisitionItems,
      ...warehouseItems,
    ]
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      )
      .slice(0, limit);
  } else if (params.tab === "cc") {
    const workflowAdmin = WORKFLOW_TEST_ROUTE_TO_ADMIN
      ? await getWorkflowSystemAdminUser(db)
      : null;
    const configuredCcItems = await getConfiguredWorkflowCcItems(db, {
      operatorId: params.operatorId,
      limit,
    });
    if (
      workflowAdmin &&
      Number(params.operatorId || 0) === Number(workflowAdmin.id)
    ) {
      const [salesItems, financeItems, qualityItems] = await Promise.all([
        getSalesWorkflowTodoItems(db, {
          operatorId: params.operatorId,
          operatorRole: params.operatorRole,
          limit,
        }),
        getFinanceWorkflowTodoItems(db, {
          operatorId: params.operatorId,
          operatorRole: params.operatorRole,
          operatorDepartment: params.operatorDepartment,
          limit,
        }),
        getQualityWorkflowTodoItems(db, {
          operatorId: params.operatorId,
          operatorRole: params.operatorRole,
          operatorDepartment: params.operatorDepartment,
          limit,
        }),
      ]);
      items = mapWorkflowItemsToCcItems(
        [...configuredCcItems, ...salesItems, ...financeItems, ...qualityItems]
          .sort((a, b) =>
            String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
          )
          .slice(0, limit)
      );
    } else {
      items = configuredCcItems;
    }
  } else if (params.tab === "created" || params.tab === "processed") {
    items = await getOperationWorkflowItems(db, {
      operatorId: params.operatorId,
      tab: params.tab,
      limit,
    });
  } else {
    items = [];
  }

  const keyword = String(params.search || "").trim();
  if (keyword) {
    items = items.filter(item => matchWorkflowSearch(item, keyword));
  }

  return { counters, items };
}

async function buildSalesOrderApprovalStates(
  db: any,
  orders: SalesApprovalOrderSnapshot[],
  currentUserId?: number | null,
  currentUserRole?: string | null
): Promise<Map<number, SalesOrderApprovalState>> {
  const pendingOrders = orders.filter(
    order => String(order.status ?? "") === "pending_review"
  );
  const stateMap = new Map<number, SalesOrderApprovalState>();

  for (const order of orders) {
    stateMap.set(order.id, {
      orderId: order.id,
      currentApproverId: null,
      currentApproverName: "",
      stage: "none",
      canApprove: false,
    });
  }
  if (pendingOrders.length === 0) return stateMap;

  if (WORKFLOW_TEST_ROUTE_TO_ADMIN) {
    const workflowAdmin = await getWorkflowSystemAdminUser(db);
    if (workflowAdmin) {
      for (const order of pendingOrders) {
        stateMap.set(order.id, {
          orderId: order.id,
          currentApproverId: workflowAdmin.id,
          currentApproverName: workflowAdmin.name,
          stage: "system_admin",
          canApprove: Number(currentUserId || 0) === Number(workflowAdmin.id),
        });
      }
      return stateMap;
    }
  }

  const orderIds = pendingOrders.map(order => order.id);
  const applicantIds = Array.from(
    new Set(
      pendingOrders
        .map(order => Number(order.createdBy || order.salesPersonId || 0))
        .filter(id => Number.isFinite(id) && id > 0)
    )
  );

  const applicantUsers: Array<{
    id: number;
    name: string | null;
    department: string | null;
  }> =
    applicantIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            department: users.department,
          })
          .from(users)
          .where(inArray(users.id, applicantIds))
      : [];
  const applicantMap = new Map(
    applicantUsers.map(user => [Number(user.id), user])
  );

  const departmentNames = Array.from(
    new Set(
      applicantUsers.flatMap(user => parseDepartmentNames(user.department))
    )
  );
  const departmentRows: Array<{
    id: number;
    name: string;
    managerId: number | null;
  }> =
    departmentNames.length > 0
      ? await db
          .select({
            id: departments.id,
            name: departments.name,
            managerId: departments.managerId,
          })
          .from(departments)
          .where(inArray(departments.name, departmentNames))
      : [];
  const departmentMap = new Map(
    departmentRows.map(department => [String(department.name), department])
  );

  const approvalRows: Array<{
    orderId: number;
    action: "submit" | "approve" | "reject";
    approverId: number | null;
    createdAt: Date;
  }> = await db
    .select({
      orderId: orderApprovals.orderId,
      action: orderApprovals.action,
      approverId: orderApprovals.approverId,
      createdAt: orderApprovals.createdAt,
    })
    .from(orderApprovals)
    .where(
      and(
        eq(orderApprovals.orderType, "sales"),
        inArray(orderApprovals.orderId, orderIds)
      )
    )
    .orderBy(asc(orderApprovals.createdAt));
  const approvalsByOrder = new Map<number, typeof approvalRows>();
  for (const row of approvalRows) {
    const key = Number(row.orderId);
    const bucket = approvalsByOrder.get(key) ?? [];
    bucket.push(row);
    approvalsByOrder.set(key, bucket);
  }

  const managerIds: number[] = Array.from(
    new Set(
      departmentRows
        .map(department => Number(department.managerId || 0))
        .filter(id => id > 0)
    )
  );

  const [generalManager]: Array<{ id: number; name: string | null }> = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.name, GENERAL_MANAGER_NAME))
    .limit(1);

  const approverIds: number[] = Array.from(
    new Set(
      [...managerIds, Number(generalManager?.id || 0)].filter(
        (id): id is number => Number(id) > 0
      )
    )
  );
  const approverUsers: Array<{ id: number; name: string | null }> =
    approverIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, approverIds))
      : [];
  const approverNameMap = new Map(
    approverUsers.map(user => [Number(user.id), String(user.name || "")])
  );

  for (const order of pendingOrders) {
    const applicantId = Number(order.createdBy || order.salesPersonId || 0);
    const applicant = applicantMap.get(applicantId);
    const applicantDepartments = parseDepartmentNames(applicant?.department);
    const workflowDepartmentName = applicantDepartments.includes("销售部")
      ? "销售部"
      : applicantDepartments[0];
    const managerId =
      Number(
        departmentMap.get(String(workflowDepartmentName || ""))?.managerId || 0
      ) || null;
    const approvals = approvalsByOrder.get(Number(order.id)) ?? [];
    const generalManagerId = Number(generalManager?.id || 0) || null;
    const requiresManagerApproval =
      !!managerId && applicantId > 0 && managerId !== applicantId;
    const hasManagerApproval =
      !!managerId &&
      approvals.some(
        approval =>
          approval.action === "approve" &&
          Number(approval.approverId || 0) === managerId
      );
    const hasGeneralManagerApproval =
      !!generalManagerId &&
      approvals.some(
        approval =>
          approval.action === "approve" &&
          Number(approval.approverId || 0) === generalManagerId
      );

    let currentApproverId: number | null = null;
    let stage: SalesOrderApprovalState["stage"] = "none";
    if (requiresManagerApproval && !hasManagerApproval) {
      currentApproverId = managerId;
      stage = "manager";
    } else if (
      generalManagerId &&
      generalManagerId !== managerId &&
      !hasGeneralManagerApproval
    ) {
      currentApproverId = generalManagerId;
      stage = "general_manager";
    }

    stateMap.set(order.id, {
      orderId: order.id,
      currentApproverId,
      currentApproverName: currentApproverId
        ? approverNameMap.get(currentApproverId) || ""
        : "",
      stage,
      canApprove:
        stage !== "none" &&
        (String(currentUserRole || "") === "admin" ||
          (!!currentApproverId &&
            Number(currentUserId || 0) === currentApproverId)),
    });
  }

  return stateMap;
}

export async function getSalesOrderApprovalState(
  orderId: number,
  currentUserId?: number | null,
  currentUserRole?: string | null
) {
  const configuredState = await getConfiguredWorkflowState({
    module: "销售部",
    formType: "业务单据",
    formName: "订单管理",
    sourceTable: "sales_orders",
    sourceId: orderId,
    currentUserId,
    currentUserRole,
  });
  if (configuredState.runId) {
    return {
      orderId,
      currentApproverId: configuredState.currentApproverId,
      currentApproverName: configuredState.currentApproverName,
      stage: configuredState.stage,
      stageLabel: configuredState.stageLabel,
      canApprove: configuredState.canApprove,
      stepIndex: configuredState.stepIndex,
      totalSteps: configuredState.totalSteps,
      status: configuredState.status,
    };
  }

  const db = await getDb();
  if (!db) return null;
  const [order] = await db
    .select({
      id: salesOrders.id,
      createdBy: salesOrders.createdBy,
      salesPersonId: salesOrders.salesPersonId,
      status: salesOrders.status,
    })
    .from(salesOrders)
    .where(eq(salesOrders.id, orderId))
    .limit(1);
  if (!order) return null;
  const stateMap = await buildSalesOrderApprovalStates(
    db,
    [order],
    currentUserId,
    currentUserRole
  );
  const fallbackState = stateMap.get(orderId) ?? null;
  if (!fallbackState) return null;
  return {
    ...fallbackState,
    stageLabel:
      fallbackState.stage === "manager"
        ? "部门负责人审批"
        : fallbackState.stage === "general_manager"
          ? "总经理审批"
          : fallbackState.stage === "system_admin"
            ? "系统管理员审批"
            : "",
  };
}

export async function getDashboardStats(params?: {
  salesPersonId?: number;
  operatorId?: number;
  operatorRole?: string;
  operatorIsCompanyAdmin?: boolean | null;
  operatorDepartment?: string | null;
  companyId?: number | null;
}) {
  const db = await getDb();
  if (!db) return null;
  await ensureProductsSterilizedColumn(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const activeCompanyId = params?.companyId
    ? normalizeCompanyId(params.companyId, mainCompanyId)
    : null;
  const collaborativeOnly =
    activeCompanyId !== null && activeCompanyId !== mainCompanyId;

  // 基础计数
  const [productCount] = activeCompanyId
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq((products as any).companyId, activeCompanyId))
    : await db.select({ count: sql<number>`count(*)` }).from(products);
  const [customerCount] = activeCompanyId
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(eq((customers as any).companyId, activeCompanyId))
    : await db.select({ count: sql<number>`count(*)` }).from(customers);
  const [supplierCount] = activeCompanyId
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(suppliers)
        .where(eq((suppliers as any).companyId, activeCompanyId))
    : await db.select({ count: sql<number>`count(*)` }).from(suppliers);
  const salesOrderCountQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(salesOrders);
  const salesOrderCountConditions = [];
  if (activeCompanyId)
    salesOrderCountConditions.push(
      eq((salesOrders as any).companyId, activeCompanyId)
    );
  if (params?.salesPersonId)
    salesOrderCountConditions.push(
      eq(salesOrders.salesPersonId, params.salesPersonId)
    );
  const [salesOrderCount] =
    salesOrderCountConditions.length > 0
      ? await salesOrderCountQuery.where(and(...salesOrderCountConditions))
      : await salesOrderCountQuery;
  const [purchaseOrderCount] = activeCompanyId
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(eq((purchaseOrders as any).companyId, activeCompanyId))
    : await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders);
  const [productionOrderCount] = collaborativeOnly
    ? [{ count: 0 }]
    : await db.select({ count: sql<number>`count(*)` }).from(productionOrders);

  // 本月销售额（非草稿/非取消的订单）
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySalesWhere = [
    gte(salesOrders.orderDate, firstDayOfMonth),
    sql`status NOT IN ('draft', 'cancelled')`,
  ];
  if (activeCompanyId) {
    monthlySalesWhere.push(eq((salesOrders as any).companyId, activeCompanyId));
  }
  if (params?.salesPersonId) {
    monthlySalesWhere.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  }
  const [monthlySales] = await db
    .select({
      total: sql<string>`COALESCE(SUM(COALESCE(totalAmountBase, totalAmount * COALESCE(exchangeRate, 1))), 0)`,
    })
    .from(salesOrders)
    .where(and(...monthlySalesWhere));

  // 待处理订单数（pending_review / approved / in_production / ready_to_ship）
  const pendingOrderWhere = [
    sql`status IN ('pending_review', 'approved', 'in_production', 'ready_to_ship')`,
  ];
  if (activeCompanyId) {
    pendingOrderWhere.push(eq((salesOrders as any).companyId, activeCompanyId));
  }
  if (params?.salesPersonId) {
    pendingOrderWhere.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  }
  const [pendingOrderCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(salesOrders)
    .where(and(...pendingOrderWhere));

  // 在产订单数
  const [inProductionCount] = collaborativeOnly
    ? [{ count: 0 }]
    : await db
        .select({ count: sql<number>`count(*)` })
        .from(productionOrders)
        .where(eq(productionOrders.status, "in_progress"));

  // 最近5条销售订单（非草稿）
  const recentOrdersWhere = [sql`sales_orders.status != 'draft'`];
  if (activeCompanyId) {
    recentOrdersWhere.push(eq((salesOrders as any).companyId, activeCompanyId));
  }
  if (params?.salesPersonId) {
    recentOrdersWhere.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  }
  const recentOrders = await db
    .select({
      id: salesOrders.id,
      orderNo: salesOrders.orderNo,
      customerName: customers.name,
      totalAmount: salesOrders.totalAmount,
      currency: salesOrders.currency,
      orderDate: salesOrders.orderDate,
      status: salesOrders.status,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(and(...recentOrdersWhere))
    .orderBy(desc(salesOrders.createdAt))
    .limit(5);

  // 库存预警（库存数量 < 安全库存 且安全库存不为null）
  const inventoryAlerts = await db
    .select({
      id: inventory.id,
      itemName: inventory.itemName,
      materialCode: inventory.materialCode,
      quantity: inventory.quantity,
      safetyStock: inventory.safetyStock,
      unit: inventory.unit,
    })
    .from(inventory)
    .where(
      and(
        activeCompanyId
          ? eq((inventory as any).companyId, activeCompanyId)
          : sql`1=1`,
        isNotNull(inventory.safetyStock),
        sql`inventory.quantity < inventory.safetyStock`
      )
    )
    .orderBy(
      asc(
        sql`CAST(inventory.quantity AS DECIMAL) / CAST(inventory.safetyStock AS DECIMAL)`
      )
    )
    .limit(5);

  // 待办：采购订单待审批（draft状态）
  const [purchaseApprovalCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.status, "draft"),
        activeCompanyId
          ? eq((purchaseOrders as any).companyId, activeCompanyId)
          : sql`1=1`
      )
    );

  // 待办：来料检验待处理（IQC且result为null）
  await ensureGoodsReceiptsTable(db);
  const iqcPendingCount = collaborativeOnly
    ? 0
    : await countPendingIqcItems(db);
  const oqcPendingCount = collaborativeOnly
    ? 0
    : await countPendingOqcItems(db);

  // 待办：生产入库申请（近30天的production_in流水）
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [productionInCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inventoryTransactions)
    .where(
      and(
        activeCompanyId
          ? eq((inventoryTransactions as any).companyId, activeCompanyId)
          : sql`1=1`,
        eq(inventoryTransactions.type, "production_in"),
        gte(inventoryTransactions.createdAt, thirtyDaysAgo)
      )
    );

  // 待办：草稿订单（客户询价待回复）
  const draftOrderWhere = [eq(salesOrders.status, "draft")];
  if (activeCompanyId) {
    draftOrderWhere.push(eq((salesOrders as any).companyId, activeCompanyId));
  }
  if (params?.salesPersonId) {
    draftOrderWhere.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  }
  const [draftOrderCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(salesOrders)
    .where(and(...draftOrderWhere));

  let myTodoCount = 0;
  let myCreatedCount = 0;
  let myProcessedCount = 0;
  let ccToMeCount = 0;

  if (params?.operatorId) {
    await ensureWorkflowRuntimeTables(db);
    const workflowAdmin = WORKFLOW_TEST_ROUTE_TO_ADMIN
      ? await getWorkflowSystemAdminUser(db)
      : null;
    const genericPendingRuns = await db
      .select({
        id: workflowRuns.id,
        sourceTable: workflowRuns.sourceTable,
        sourceId: workflowRuns.sourceId,
      })
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.status, "pending"),
          eq(workflowRuns.currentApproverId, Number(params.operatorId || 0))
        )
      );
    myTodoCount += genericPendingRuns.length;
    ccToMeCount += (
      await db
        .select()
        .from(workflowRuns)
        .where(ne(workflowRuns.status, "cancelled"))
    ).filter(run =>
      parseWorkflowUserIds(run.ccRecipients).includes(
        Number(params.operatorId || 0)
      )
    ).length;

    const pendingSalesRunSourceIds = new Set(
      genericPendingRuns
        .filter(run => String(run.sourceTable || "") === "sales_orders")
        .map(run => Number(run.sourceId))
        .filter(id => Number.isFinite(id) && id > 0)
    );
    const pendingReviewOrders = await db
      .select({
        id: salesOrders.id,
        createdBy: salesOrders.createdBy,
        salesPersonId: salesOrders.salesPersonId,
        status: salesOrders.status,
      })
      .from(salesOrders)
      .where(eq(salesOrders.status, "pending_review"));
    const legacyPendingReviewOrders = pendingReviewOrders.filter(
      order => !pendingSalesRunSourceIds.has(Number(order.id))
    );
    const approvalStateMap = await buildSalesOrderApprovalStates(
      db,
      legacyPendingReviewOrders,
      params.operatorId,
      params.operatorRole
    );
    myTodoCount += legacyPendingReviewOrders.filter(
      order => approvalStateMap.get(order.id)?.canApprove
    ).length;

    const userDepartments = parseDepartmentNames(params.operatorDepartment);
    const [receivableFinanceRouting, payableFinanceRouting] = await Promise.all([
      resolveReceivableFinanceWorkflowRouting(db, {
        operatorId: Number(params.operatorId || 0),
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        operatorDepartment: params.operatorDepartment,
      }),
      resolvePayableFinanceWorkflowRouting(db, {
        operatorId: Number(params.operatorId || 0),
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        operatorDepartment: params.operatorDepartment,
      }),
    ]);
    const financeTestMatched = WORKFLOW_TEST_ROUTE_TO_ADMIN
      ? !!workflowAdmin &&
        Number(params.operatorId || 0) === Number(workflowAdmin.id)
      : true;
    if (
      (receivableFinanceRouting.matchesCurrentUser ||
        payableFinanceRouting.matchesCurrentUser) &&
      financeTestMatched
    ) {
      const financeReceivableRows = await db
        .select({
          remark: accountsReceivable.remark,
          status: accountsReceivable.status,
          amount: accountsReceivable.amount,
          paidAmount: accountsReceivable.paidAmount,
        })
        .from(accountsReceivable)
        .where(
          activeCompanyId
            ? eq((accountsReceivable as any).companyId, activeCompanyId)
            : sql`1=1`
        );
      const financePayableRows = await db
        .select({
          remark: accountsPayable.remark,
          status: accountsPayable.status,
          amount: accountsPayable.amount,
          paidAmount: accountsPayable.paidAmount,
        })
        .from(accountsPayable)
        .where(
          activeCompanyId
            ? eq((accountsPayable as any).companyId, activeCompanyId)
            : sql`1=1`
        );
      const receivableTodoCount = receivableFinanceRouting.matchesCurrentUser
        ? financeReceivableRows.reduce(
            (sum, row) =>
              sum +
              (isReceivableFinanceWorkflowCompleted({
                status: row.status,
                amount: row.amount,
                paidAmount: row.paidAmount,
              })
                ? 0
                : countOpenFinanceTodos(row.remark)),
            0
          )
        : 0;
      const payableTodoCount = payableFinanceRouting.matchesCurrentUser
        ? financePayableRows.reduce(
            (sum, row) =>
              sum +
              (isPayableFinanceWorkflowCompleted({
                status: row.status,
                amount: row.amount,
                paidAmount: row.paidAmount,
              })
                ? 0
                : countOpenFinanceTodos(row.remark)),
            0
          )
        : 0;
      const financeTodoCount = receivableTodoCount + payableTodoCount;
      myTodoCount += financeTodoCount;
      if (
        WORKFLOW_TEST_ROUTE_TO_ADMIN &&
        workflowAdmin &&
        Number(params.operatorId || 0) === Number(workflowAdmin.id)
      ) {
        ccToMeCount += financeTodoCount;
      }
    }

    const qualityRouting = await resolveGoodsReceiptTodoRouting(db, {
      operatorId: Number(params.operatorId || 0),
      operatorRole: params.operatorRole,
      operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
      operatorDepartment: params.operatorDepartment,
    });
    if (!collaborativeOnly) {
      const executionTodoCount = qualityRouting.matchesCurrentUser
        ? Number(iqcPendingCount || 0) + Number(oqcPendingCount || 0)
        : 0;
      const iqcReviewTodoCount = await countPendingIqcReviewItemsForUser(
        Number(params.operatorId || 0),
        db
      );
      const qualityTodoCount = executionTodoCount + Number(iqcReviewTodoCount || 0);
      myTodoCount += qualityTodoCount;
      if (
        executionTodoCount > 0 &&
        qualityRouting.mode === "test_admin" &&
        workflowAdmin &&
        Number(params.operatorId || 0) === Number(workflowAdmin.id)
      ) {
        ccToMeCount += qualityTodoCount;
      }
    }

    const materialRequisitionRouting =
      await resolveMaterialRequisitionTodoRouting(db, {
        operatorId: Number(params.operatorId || 0),
        operatorRole: params.operatorRole,
        operatorIsCompanyAdmin: params.operatorIsCompanyAdmin,
        operatorDepartment: params.operatorDepartment,
      });
    if (!collaborativeOnly && materialRequisitionRouting.matchesCurrentUser) {
      const [materialRequisitionPendingCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(materialRequisitionOrders)
        .where(eq(materialRequisitionOrders.status, "pending"));
      myTodoCount += Number(materialRequisitionPendingCount?.count || 0);
    }

    const isWarehouseUser =
      userDepartments.includes("仓库管理") ||
      userDepartments.includes("仓库部");
    if (!collaborativeOnly && isWarehouseUser) {
      const [warehousePendingCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(productionWarehouseEntries)
        .where(eq(productionWarehouseEntries.status, "approved"));
      myTodoCount += Number(warehousePendingCount?.count || 0);
    }

    if (
      WORKFLOW_TEST_ROUTE_TO_ADMIN &&
      workflowAdmin &&
      Number(params.operatorId || 0) === Number(workflowAdmin.id)
    ) {
      ccToMeCount += legacyPendingReviewOrders.filter(
        order => (approvalStateMap.get(order.id)?.stage ?? "none") !== "none"
      ).length;
    }

    const [createdStat] = await db
      .select({ count: sql<number>`count(*)` })
      .from(operationLogs)
      .where(
        and(
          eq(operationLogs.operatorId, params.operatorId),
          eq(operationLogs.action, "create")
        )
      );
    myCreatedCount = createdStat?.count || 0;

    const [processedStat] = await db
      .select({ count: sql<number>`count(*)` })
      .from(operationLogs)
      .where(
        and(
          eq(operationLogs.operatorId, params.operatorId),
          inArray(operationLogs.action, ["approve", "reject", "status_change"])
        )
      );
    myProcessedCount = processedStat?.count || 0;
  }

  return {
    // 基础统计
    products: productCount?.count || 0,
    customers: customerCount?.count || 0,
    suppliers: supplierCount?.count || 0,
    salesOrders: salesOrderCount?.count || 0,
    purchaseOrders: purchaseOrderCount?.count || 0,
    productionOrders: productionOrderCount?.count || 0,
    // 统计卡片
    monthlySalesAmount: monthlySales?.total || "0",
    pendingOrderCount: pendingOrderCount?.count || 0,
    inventoryAlertCount: inventoryAlerts.length,
    inProductionCount: inProductionCount?.count || 0,
    // 最近订单
    recentOrders,
    // 库存预警列表
    inventoryAlerts,
    // 待办事项
    pendingTasks: {
      purchaseApproval: purchaseApprovalCount?.count || 0,
      iqcPending: iqcPendingCount || 0,
      productionIn: productionInCount?.count || 0,
      draftOrders: draftOrderCount?.count || 0,
    },
    workflowCounters: {
      myTodo: myTodoCount,
      myCreated: myCreatedCount,
      myProcessed: myProcessedCount,
      ccToMe: ccToMeCount,
    },
  };
}

function toMetricNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrencyMetric(value: unknown) {
  return formatCurrencyValue(toMetricNumber(value), "¥", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatCountMetric(value: unknown, suffix = "") {
  return `${formatDisplayNumber(toMetricNumber(value), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

function formatPercentMetric(value: number) {
  return formatPercentValue(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function normalizeMetricDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickMetricDate(...values: unknown[]) {
  for (const value of values) {
    const date = normalizeMetricDate(value);
    if (date) return date;
  }
  return null;
}

function buildDashboardPeriod(year: number, month?: number | null) {
  const normalizedYear =
    Number.isFinite(year) && year >= 2000 ? year : new Date().getFullYear();
  const normalizedMonth =
    Number.isFinite(Number(month)) && Number(month) >= 1 && Number(month) <= 12
      ? Number(month)
      : null;
  const start = normalizedMonth
    ? new Date(normalizedYear, normalizedMonth - 1, 1)
    : new Date(normalizedYear, 0, 1);
  const end = normalizedMonth
    ? new Date(normalizedYear, normalizedMonth, 0, 23, 59, 59, 999)
    : new Date(normalizedYear, 11, 31, 23, 59, 59, 999);
  const bucketKeys = normalizedMonth
    ? Array.from(
        { length: new Date(normalizedYear, normalizedMonth, 0).getDate() },
        (_, index) => String(index + 1).padStart(2, "0")
      )
    : Array.from({ length: 12 }, (_, index) =>
        String(index + 1).padStart(2, "0")
      );
  const labelMap = Object.fromEntries(
    bucketKeys.map((key, index) => [
      key,
      normalizedMonth ? `${index + 1}日` : `${index + 1}月`,
    ])
  ) as Record<string, string>;
  return {
    year: normalizedYear,
    month: normalizedMonth,
    start,
    end,
    bucketKeys,
    labelMap,
    periodLabel: normalizedMonth
      ? `${normalizedYear}年${normalizedMonth}月`
      : `${normalizedYear}年`,
    getBucketKey(date: Date) {
      if (date < start || date > end) return null;
      return normalizedMonth
        ? String(date.getDate()).padStart(2, "0")
        : String(date.getMonth() + 1).padStart(2, "0");
    },
  };
}

function initTrendRows(period: ReturnType<typeof buildDashboardPeriod>) {
  return period.bucketKeys.map(key => ({
    label: period.labelMap[key],
    primary: 0,
    secondary: 0,
  }));
}

function buildTrendLookup(period: ReturnType<typeof buildDashboardPeriod>) {
  const rows = initTrendRows(period);
  const map = new Map<
    string,
    { label: string; primary: number; secondary: number }
  >();
  for (let index = 0; index < period.bucketKeys.length; index++) {
    map.set(period.bucketKeys[index], rows[index]);
  }
  return { rows, map };
}

function buildDayRange(base: Date) {
  return {
    start: new Date(base.getFullYear(), base.getMonth(), base.getDate()),
    end: new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      23,
      59,
      59,
      999
    ),
  };
}

function buildMonthToDateRange(base: Date) {
  return {
    start: new Date(base.getFullYear(), base.getMonth(), 1),
    end: new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      23,
      59,
      59,
      999
    ),
  };
}

function buildYearToDateRange(base: Date) {
  return {
    start: new Date(base.getFullYear(), 0, 1),
    end: new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      23,
      59,
      59,
      999
    ),
  };
}

function buildMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function isMetricDateInRange(date: Date | null, start: Date, end: Date) {
  return Boolean(date && date >= start && date <= end);
}

function minMetricDate(...dates: Date[]) {
  return new Date(Math.min(...dates.map(item => item.getTime())));
}

function maxMetricDate(...dates: Date[]) {
  return new Date(Math.max(...dates.map(item => item.getTime())));
}

function safeMetricPercent(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function formatDaysMetric(value: number) {
  return `${formatDisplayNumber(toMetricNumber(value), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} 天`;
}

function formatSignedPercentMetric(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercentValue(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}`;
}

function sumOutstandingMetric(
  rows: Array<{ amountBase?: unknown; amount?: unknown; paidAmount?: unknown }>
) {
  return rows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        0,
        toMetricNumber(row.amountBase ?? row.amount) -
          toMetricNumber(row.paidAmount)
      ),
    0
  );
}

export async function listUserDashboardPermissions(userIds: number[]) {
  const db = await getDb();
  if (!db || userIds.length === 0)
    return new Map<number, DashboardPermissionId[]>();
  await ensureUserDashboardPermissionsTable(db);
  const rows = await db
    .select({
      userId: userDashboardPermissions.userId,
      dashboardId: userDashboardPermissions.dashboardId,
    })
    .from(userDashboardPermissions)
    .where(inArray(userDashboardPermissions.userId, userIds));

  const result = new Map<number, DashboardPermissionId[]>();
  for (const row of rows) {
    const dashboardId = row.dashboardId as DashboardPermissionId;
    if (!DASHBOARD_PERMISSION_IDS.includes(dashboardId)) continue;
    const userId = Number(row.userId || 0);
    const current = result.get(userId) ?? [];
    current.push(dashboardId);
    result.set(userId, current);
  }
  return result;
}

export function parseDashboardPermissionsCsv(
  raw: unknown
): DashboardPermissionId[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map(item => item.trim())
    .filter(
      (item): item is DashboardPermissionId =>
        DASHBOARD_PERMISSION_IDS.includes(item as DashboardPermissionId)
    );
}

export type CompanyScopedUserAccessSettings = {
  companyId: number;
  userId: number;
  role: "user" | "admin" | null;
  dataScope: "self" | "department" | "all" | null;
  department: string | null;
  position: string | null;
  visibleApps: string | null;
  visibleForms: string | null;
  dashboardPermissionsRaw: string | null;
  dashboardPermissions: DashboardPermissionId[];
};

export async function getCompanyScopedUserAccess(
  companyId: number,
  userId: number
): Promise<CompanyScopedUserAccessSettings | null> {
  const db = await getDb();
  if (!db || companyId <= 0 || userId <= 0) return null;
  await ensureCollaborationDataModel(db);
  const [access] = await db
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
        eq(companyUserAccess.companyId, companyId),
        eq(companyUserAccess.userId, userId)
      )
    )
    .limit(1);
  if (!access) return null;
  return {
    companyId: Number(access.companyId || 0),
    userId: Number(access.userId || 0),
    role: (access.role as "user" | "admin" | null) ?? null,
    dataScope:
      (access.dataScope as "self" | "department" | "all" | null) ?? null,
    department: access.department ?? null,
    position: access.position ?? null,
    visibleApps:
      access.visibleApps === null || access.visibleApps === undefined
        ? null
        : String(access.visibleApps),
    visibleForms:
      access.visibleForms === null || access.visibleForms === undefined
        ? null
        : String(access.visibleForms),
    dashboardPermissionsRaw:
      access.dashboardPermissions === null ||
      access.dashboardPermissions === undefined
        ? null
        : String(access.dashboardPermissions),
    dashboardPermissions: parseDashboardPermissionsCsv(
      access.dashboardPermissions
    ),
  };
}

export async function resolveUserForCompanyScope<
  T extends {
    id?: number | null;
    role?: string | null;
    dataScope?: string | null;
    department?: string | null;
    position?: string | null;
    visibleApps?: string | null;
    visibleForms?: string | null;
    companyId?: number | null;
  },
>(
  user: T | null,
  activeCompanyId?: number | null,
  options?: {
    dashboardPermissions?: DashboardPermissionId[];
  }
) {
  if (!user) return null;
  const homeCompanyId = Number(user.companyId || 0);
  const currentCompanyId =
    Number(activeCompanyId || 0) > 0 ? Number(activeCompanyId) : homeCompanyId;
  const globalDashboardPermissions =
    options?.dashboardPermissions ??
    ((await listUserDashboardPermissions([Number(user.id || 0)])).get(
      Number(user.id || 0)
    ) ?? []);
  const scopedAccess =
    currentCompanyId > 0 &&
    homeCompanyId > 0 &&
    currentCompanyId !== homeCompanyId &&
    Number(user.id || 0) > 0
      ? await getCompanyScopedUserAccess(currentCompanyId, Number(user.id || 0))
      : null;
  const resolvedRole = scopedAccess?.role ?? (user.role as "user" | "admin");
  const resolvedDataScope =
    scopedAccess?.dataScope ??
    (user.dataScope as "self" | "department" | "all" | null) ??
    (resolvedRole === "admin" ? "all" : "self");
  return {
    ...user,
    role: resolvedRole,
    dataScope: resolvedDataScope,
    department: scopedAccess?.department ?? user.department ?? null,
    position: scopedAccess?.position ?? user.position ?? null,
    visibleApps:
      scopedAccess && scopedAccess.visibleApps !== null
        ? scopedAccess.visibleApps
        : user.visibleApps ?? null,
    visibleForms:
      scopedAccess && scopedAccess.visibleForms !== null
        ? scopedAccess.visibleForms
        : user.visibleForms ?? null,
    dashboardPermissions:
      scopedAccess && scopedAccess.dashboardPermissionsRaw !== null
        ? scopedAccess.dashboardPermissions
        : globalDashboardPermissions,
    companyId: currentCompanyId,
    homeCompanyId,
    isCompanyAdmin:
      resolvedRole === "admin" || String(user.role || "") === "admin",
  };
}

export async function replaceUserDashboardPermissions(
  userId: number,
  dashboardIds: DashboardPermissionId[]
) {
  const db = await getDb();
  if (!db) return;
  await ensureUserDashboardPermissionsTable(db);
  await db
    .delete(userDashboardPermissions)
    .where(eq(userDashboardPermissions.userId, userId));
  const normalizedIds = Array.from(new Set(dashboardIds)).filter(dashboardId =>
    DASHBOARD_PERMISSION_IDS.includes(dashboardId)
  );
  if (normalizedIds.length === 0) return;
  await db.insert(userDashboardPermissions).values(
    normalizedIds.map(dashboardId => ({
      userId,
      dashboardId,
    }))
  );
}

export async function getDashboardAccessForUser(
  user?: {
    id?: number | null;
    role?: string | null;
    isCompanyAdmin?: boolean | null;
    dashboardPermissions?: DashboardPermissionId[] | null;
  } | null
) {
  if (!user?.id) {
    return {
      allowedDashboardIds: [] as DashboardPermissionId[],
      canViewBossDashboard: false,
    };
  }
  if (String(user.role || "") === "admin") {
    return {
      allowedDashboardIds: [...DASHBOARD_PERMISSION_IDS],
      canViewBossDashboard: true,
    };
  }
  const inlineDashboardPermissions = Array.isArray(user.dashboardPermissions)
    ? user.dashboardPermissions.filter(dashboardId =>
        DASHBOARD_PERMISSION_IDS.includes(dashboardId)
      )
    : null;
  if (inlineDashboardPermissions) {
    if (inlineDashboardPermissions.length > 0 || !Boolean(user.isCompanyAdmin)) {
      return {
        allowedDashboardIds: inlineDashboardPermissions,
        canViewBossDashboard: inlineDashboardPermissions.includes(
          "boss_dashboard"
        ),
      };
    }
  }
  if (Boolean(user.isCompanyAdmin)) {
    return {
      allowedDashboardIds: [...DASHBOARD_PERMISSION_IDS],
      canViewBossDashboard: true,
    };
  }

  const permissionsMap = await listUserDashboardPermissions([Number(user.id)]);
  const allowedDashboardIds = permissionsMap.get(Number(user.id)) ?? [];
  return {
    allowedDashboardIds,
    canViewBossDashboard: allowedDashboardIds.includes("boss_dashboard"),
  };
}

async function buildSalesDepartmentBoard(
  db: Awaited<ReturnType<typeof getDb>>,
  year: number,
  month?: number | null,
  companyId?: number | null
) {
  const period = buildDashboardPeriod(year, month);
  const [orderRows, paymentRows] = await Promise.all([
    db!
      .select({
        id: salesOrders.id,
        orderNo: salesOrders.orderNo,
        orderDate: salesOrders.orderDate,
        status: salesOrders.status,
        totalAmountBase: salesOrders.totalAmountBase,
        customerName: customers.name,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(
        and(
          gte(salesOrders.orderDate, period.start),
          lte(salesOrders.orderDate, period.end),
          companyId ? eq((salesOrders as any).companyId, companyId) : sql`1=1`
        )
      ),
    db!
      .select({
        paymentDate: paymentRecords.paymentDate,
        amountBase: paymentRecords.amountBase,
        type: paymentRecords.type,
        relatedType: paymentRecords.relatedType,
      })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.type, "receipt"),
          companyId
            ? eq((paymentRecords as any).companyId, companyId)
            : sql`1=1`,
          gte(paymentRecords.paymentDate, period.start),
          lte(paymentRecords.paymentDate, period.end)
        )
      ),
  ]);

  const effectiveOrders = orderRows.filter(
    row => !["draft", "cancelled"].includes(String(row.status || ""))
  );
  const totalAmount = effectiveOrders.reduce(
    (sum, row) => sum + toMetricNumber(row.totalAmountBase),
    0
  );
  const receiptAmount = paymentRows.reduce(
    (sum, row) => sum + toMetricNumber(row.amountBase),
    0
  );
  const pendingReviewCount = orderRows.filter(
    row => String(row.status || "") === "pending_review"
  ).length;
  const completedCount = orderRows.filter(row =>
    ["completed", "shipped"].includes(String(row.status || ""))
  ).length;

  const trend = buildTrendLookup(period);
  for (const row of effectiveOrders) {
    const date = pickMetricDate(row.orderDate);
    if (!date) continue;
    const bucketKey = period.getBucketKey(date);
    if (!bucketKey) continue;
    const target = trend.map.get(bucketKey);
    if (!target) continue;
    target.primary += toMetricNumber(row.totalAmountBase);
    target.secondary += 1;
  }

  const customerTotals = new Map<string, number>();
  for (const row of effectiveOrders) {
    const customerName = String(row.customerName || "未命名客户");
    customerTotals.set(
      customerName,
      (customerTotals.get(customerName) ?? 0) +
        toMetricNumber(row.totalAmountBase)
    );
  }

  const breakdownMap = new Map<string, { count: number; amount: number }>();
  for (const row of orderRows) {
    const key = String(row.status || "unknown");
    const current = breakdownMap.get(key) ?? { count: 0, amount: 0 };
    current.count += 1;
    current.amount += toMetricNumber(row.totalAmountBase);
    breakdownMap.set(key, current);
  }

  return {
    boardId: "sales_dashboard",
    title: "销售部看板",
    subtitle: "聚合销售订单、回款与客户成交数据",
    periodLabel: period.periodLabel,
    summaryCards: [
      {
        id: "sales-amount",
        label: "订单金额",
        value: formatCurrencyMetric(totalAmount),
        helper: `${effectiveOrders.length} 张生效订单`,
      },
      {
        id: "sales-pending",
        label: "待审核订单",
        value: formatCountMetric(pendingReviewCount, " 张"),
        helper: "待推进审批",
      },
      {
        id: "sales-completed",
        label: "已完成订单",
        value: formatCountMetric(completedCount, " 张"),
        helper: "已发货/已完成",
      },
      {
        id: "sales-receipt",
        label: "本期回款",
        value: formatCurrencyMetric(receiptAmount),
        helper: `${paymentRows.length} 笔收款`,
      },
    ],
    trend: {
      title: "订单金额趋势",
      primaryLabel: "订单金额",
      secondaryLabel: "订单数",
      rows: trend.rows,
    },
    breakdownTitle: "订单状态分布",
    breakdown: Array.from(breakdownMap.entries())
      .map(([label, value]) => ({
        label,
        count: value.count,
        amount: formatCurrencyMetric(value.amount),
      }))
      .sort((a, b) => b.count - a.count),
    focusTitle: "重点客户成交",
    focusRows: Array.from(customerTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([customerName, amount], index) => ({
        title: customerName,
        subtitle: `TOP ${index + 1} 客户`,
        value: formatCurrencyMetric(amount),
        extra: `${effectiveOrders.filter(row => String(row.customerName || "未命名客户") === customerName).length} 张订单`,
      })),
  };
}

async function buildProductionDepartmentBoard(
  db: Awaited<ReturnType<typeof getDb>>,
  year: number,
  month?: number | null
) {
  const period = buildDashboardPeriod(year, month);
  const [orderRows, recordRows] = await Promise.all([
    db!
      .select({
        id: productionOrders.id,
        orderNo: productionOrders.orderNo,
        status: productionOrders.status,
        plannedQty: productionOrders.plannedQty,
        completedQty: productionOrders.completedQty,
        batchNo: productionOrders.batchNo,
        plannedStartDate: productionOrders.plannedStartDate,
        productionDate: productionOrders.productionDate,
        createdAt: productionOrders.createdAt,
        productName: products.name,
      })
      .from(productionOrders)
      .leftJoin(products, eq(productionOrders.productId, products.id)),
    db!
      .select({
        recordNo: productionRecords.recordNo,
        recordDate: productionRecords.recordDate,
        actualQty: productionRecords.actualQty,
        status: productionRecords.status,
      })
      .from(productionRecords),
  ]);

  const filteredOrders = orderRows.filter(row => {
    const date = pickMetricDate(
      row.productionDate,
      row.plannedStartDate,
      row.createdAt
    );
    return date ? date >= period.start && date <= period.end : false;
  });
  const filteredRecords = recordRows.filter(row => {
    const date = pickMetricDate(row.recordDate);
    return date ? date >= period.start && date <= period.end : false;
  });

  const totalPlannedQty = filteredOrders.reduce(
    (sum, row) => sum + toMetricNumber(row.plannedQty),
    0
  );
  const totalCompletedQty = filteredOrders.reduce(
    (sum, row) => sum + toMetricNumber(row.completedQty),
    0
  );
  const completionRate =
    totalPlannedQty > 0 ? (totalCompletedQty / totalPlannedQty) * 100 : 0;
  const inProgressCount = filteredOrders.filter(
    row => String(row.status || "") === "in_progress"
  ).length;
  const completedCount = filteredOrders.filter(
    row => String(row.status || "") === "completed"
  ).length;

  const trend = buildTrendLookup(period);
  for (const row of filteredOrders) {
    const date = pickMetricDate(
      row.productionDate,
      row.plannedStartDate,
      row.createdAt
    );
    if (!date) continue;
    const bucketKey = period.getBucketKey(date);
    if (!bucketKey) continue;
    const target = trend.map.get(bucketKey);
    if (!target) continue;
    target.primary += toMetricNumber(row.completedQty);
    target.secondary += 1;
  }

  const breakdownMap = new Map<string, number>();
  for (const row of filteredOrders) {
    const status = String(row.status || "unknown");
    breakdownMap.set(status, (breakdownMap.get(status) ?? 0) + 1);
  }

  return {
    boardId: "production_dashboard",
    title: "生产部看板",
    subtitle: "聚合生产指令、完工数量与过程记录",
    periodLabel: period.periodLabel,
    summaryCards: [
      {
        id: "production-orders",
        label: "生产指令",
        value: formatCountMetric(filteredOrders.length, " 张"),
        helper: "本期纳入统计",
      },
      {
        id: "production-progress",
        label: "在产指令",
        value: formatCountMetric(inProgressCount, " 张"),
        helper: "当前仍在执行",
      },
      {
        id: "production-completed",
        label: "完工数量",
        value: formatCountMetric(totalCompletedQty),
        helper: `计划 ${formatCountMetric(totalPlannedQty)}`,
      },
      {
        id: "production-rate",
        label: "完工率",
        value: formatPercentMetric(completionRate),
        helper: `${completedCount} 张已完工`,
      },
    ],
    trend: {
      title: "完工数量趋势",
      primaryLabel: "完工数量",
      secondaryLabel: "指令数",
      rows: trend.rows,
    },
    breakdownTitle: "生产状态分布",
    breakdown: Array.from(breakdownMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    focusTitle: "重点生产单",
    focusRows: filteredOrders
      .sort(
        (a, b) =>
          toMetricNumber(b.plannedQty) -
          toMetricNumber(b.completedQty) -
          (toMetricNumber(a.plannedQty) - toMetricNumber(a.completedQty))
      )
      .slice(0, 5)
      .map(row => ({
        title: String(row.orderNo || "-"),
        subtitle: `${String(row.productName || "未命名产品")} / 批号 ${String(row.batchNo || "-")}`,
        value: `${formatCountMetric(row.completedQty)} / ${formatCountMetric(row.plannedQty)}`,
        extra: String(row.status || "-"),
      })),
  };
}

async function buildPurchaseDepartmentBoard(
  db: Awaited<ReturnType<typeof getDb>>,
  year: number,
  month?: number | null,
  companyId?: number | null
) {
  const period = buildDashboardPeriod(year, month);
  const [orderRows, receiptRows, payableRows] = await Promise.all([
    db!
      .select({
        orderNo: purchaseOrders.orderNo,
        orderDate: purchaseOrders.orderDate,
        status: purchaseOrders.status,
        totalAmountBase: purchaseOrders.totalAmountBase,
        supplierName: purchaseOrders.supplierName,
      })
      .from(purchaseOrders)
      .where(
        and(
          gte(purchaseOrders.orderDate, period.start),
          lte(purchaseOrders.orderDate, period.end),
          companyId
            ? eq((purchaseOrders as any).companyId, companyId)
            : sql`1=1`
        )
      ),
    db!
      .select({
        receiptNo: goodsReceipts.receiptNo,
        receiptDate: goodsReceipts.receiptDate,
        status: goodsReceipts.status,
        supplierName: goodsReceipts.supplierName,
      })
      .from(goodsReceipts)
      .leftJoin(
        purchaseOrders,
        eq(goodsReceipts.purchaseOrderId, purchaseOrders.id)
      )
      .where(
        and(
          gte(goodsReceipts.receiptDate, period.start),
          lte(goodsReceipts.receiptDate, period.end),
          companyId
            ? eq((purchaseOrders as any).companyId, companyId)
            : sql`1=1`
        )
      ),
    db!
      .select({
        amountBase: accountsPayable.amountBase,
        amount: accountsPayable.amount,
        paidAmount: accountsPayable.paidAmount,
        status: accountsPayable.status,
        invoiceDate: accountsPayable.invoiceDate,
        supplierName: accountsPayable.supplierName,
      })
      .from(accountsPayable)
      .where(
        and(
          gte(accountsPayable.createdAt, period.start),
          lte(accountsPayable.createdAt, period.end),
          companyId
            ? eq((accountsPayable as any).companyId, companyId)
            : sql`1=1`
        )
      ),
  ]);

  const totalAmount = orderRows.reduce(
    (sum, row) => sum + toMetricNumber(row.totalAmountBase),
    0
  );
  const pendingArrivalCount = orderRows.filter(row =>
    ["approved", "issued", "ordered", "partial_received"].includes(
      String(row.status || "")
    )
  ).length;
  const pendingInspectionCount = receiptRows.filter(row =>
    ["pending_inspection", "inspecting"].includes(String(row.status || ""))
  ).length;
  const outstandingPayable = payableRows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        0,
        toMetricNumber(row.amountBase || row.amount) -
          toMetricNumber(row.paidAmount)
      ),
    0
  );

  const trend = buildTrendLookup(period);
  for (const row of orderRows) {
    const date = pickMetricDate(row.orderDate);
    if (!date) continue;
    const bucketKey = period.getBucketKey(date);
    if (!bucketKey) continue;
    const target = trend.map.get(bucketKey);
    if (!target) continue;
    target.primary += toMetricNumber(row.totalAmountBase);
    target.secondary += 1;
  }

  const supplierTotals = new Map<string, number>();
  for (const row of orderRows) {
    const supplierName = String(row.supplierName || "未命名供应商");
    supplierTotals.set(
      supplierName,
      (supplierTotals.get(supplierName) ?? 0) +
        toMetricNumber(row.totalAmountBase)
    );
  }

  const breakdownMap = new Map<string, number>();
  for (const row of orderRows) {
    const status = String(row.status || "unknown");
    breakdownMap.set(status, (breakdownMap.get(status) ?? 0) + 1);
  }

  return {
    boardId: "purchase_dashboard",
    title: "采购部看板",
    subtitle: "聚合采购执行、到货与应付压力",
    periodLabel: period.periodLabel,
    summaryCards: [
      {
        id: "purchase-amount",
        label: "采购金额",
        value: formatCurrencyMetric(totalAmount),
        helper: `${orderRows.length} 张采购单`,
      },
      {
        id: "purchase-arrival",
        label: "待到货单",
        value: formatCountMetric(pendingArrivalCount, " 张"),
        helper: "需继续催交",
      },
      {
        id: "purchase-iqc",
        label: "待检到货",
        value: formatCountMetric(pendingInspectionCount, " 批"),
        helper: "等待质量放行",
      },
      {
        id: "purchase-payable",
        label: "待付款额",
        value: formatCurrencyMetric(outstandingPayable),
        helper: `${payableRows.length} 笔应付`,
      },
    ],
    trend: {
      title: "采购金额趋势",
      primaryLabel: "采购金额",
      secondaryLabel: "采购单数",
      rows: trend.rows,
    },
    breakdownTitle: "采购状态分布",
    breakdown: Array.from(breakdownMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    focusTitle: "重点供应商",
    focusRows: Array.from(supplierTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([supplierName, amount]) => ({
        title: supplierName,
        subtitle: "本期采购贡献",
        value: formatCurrencyMetric(amount),
        extra: `${orderRows.filter(row => String(row.supplierName || "未命名供应商") === supplierName).length} 张采购单`,
      })),
  };
}

async function buildFinanceDepartmentBoard(
  db: Awaited<ReturnType<typeof getDb>>,
  year: number,
  month?: number | null,
  companyId?: number | null
) {
  const period = buildDashboardPeriod(year, month);
  const [receivableRows, payableRows, paymentRows] = await Promise.all([
    db!
      .select({
        invoiceNo: accountsReceivable.invoiceNo,
        amountBase: accountsReceivable.amountBase,
        amount: accountsReceivable.amount,
        paidAmount: accountsReceivable.paidAmount,
        status: accountsReceivable.status,
        invoiceDate: accountsReceivable.invoiceDate,
      })
      .from(accountsReceivable)
      .where(
        and(
          gte(accountsReceivable.createdAt, period.start),
          lte(accountsReceivable.createdAt, period.end),
          companyId
            ? eq((accountsReceivable as any).companyId, companyId)
            : sql`1=1`
        )
      ),
    db!
      .select({
        invoiceNo: accountsPayable.invoiceNo,
        amountBase: accountsPayable.amountBase,
        amount: accountsPayable.amount,
        paidAmount: accountsPayable.paidAmount,
        status: accountsPayable.status,
        invoiceDate: accountsPayable.invoiceDate,
      })
      .from(accountsPayable)
      .where(
        and(
          gte(accountsPayable.createdAt, period.start),
          lte(accountsPayable.createdAt, period.end),
          companyId
            ? eq((accountsPayable as any).companyId, companyId)
            : sql`1=1`
        )
      ),
    db!
      .select({
        recordNo: paymentRecords.recordNo,
        type: paymentRecords.type,
        amountBase: paymentRecords.amountBase,
        amount: paymentRecords.amount,
        paymentDate: paymentRecords.paymentDate,
        relatedNo: paymentRecords.relatedNo,
      })
      .from(paymentRecords)
      .where(
        and(
          gte(paymentRecords.paymentDate, period.start),
          lte(paymentRecords.paymentDate, period.end),
          companyId
            ? eq((paymentRecords as any).companyId, companyId)
            : sql`1=1`
        )
      ),
  ]);

  const receivableBalance = receivableRows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        0,
        toMetricNumber(row.amountBase || row.amount) -
          toMetricNumber(row.paidAmount)
      ),
    0
  );
  const payableBalance = payableRows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        0,
        toMetricNumber(row.amountBase || row.amount) -
          toMetricNumber(row.paidAmount)
      ),
    0
  );
  const receiptAmount = paymentRows
    .filter(row => String(row.type || "") === "receipt")
    .reduce(
      (sum, row) => sum + toMetricNumber(row.amountBase || row.amount),
      0
    );
  const paymentAmount = paymentRows
    .filter(row => String(row.type || "") === "payment")
    .reduce(
      (sum, row) => sum + toMetricNumber(row.amountBase || row.amount),
      0
    );

  const trend = buildTrendLookup(period);
  for (const row of paymentRows) {
    const date = pickMetricDate(row.paymentDate);
    if (!date) continue;
    const bucketKey = period.getBucketKey(date);
    if (!bucketKey) continue;
    const target = trend.map.get(bucketKey);
    if (!target) continue;
    if (String(row.type || "") === "receipt") {
      target.primary += toMetricNumber(row.amountBase || row.amount);
    } else {
      target.secondary += toMetricNumber(row.amountBase || row.amount);
    }
  }

  const breakdown = [
    {
      label: "应收逾期",
      count: receivableRows.filter(
        row => String(row.status || "") === "overdue"
      ).length,
      amount: formatCurrencyMetric(
        receivableRows
          .filter(row => String(row.status || "") === "overdue")
          .reduce(
            (sum, row) =>
              sum +
              Math.max(
                0,
                toMetricNumber(row.amountBase || row.amount) -
                  toMetricNumber(row.paidAmount)
              ),
            0
          )
      ),
    },
    {
      label: "应收待收",
      count: receivableRows.filter(row =>
        ["pending", "partial"].includes(String(row.status || ""))
      ).length,
      amount: formatCurrencyMetric(receivableBalance),
    },
    {
      label: "应付待付",
      count: payableRows.filter(row =>
        ["pending", "partial"].includes(String(row.status || ""))
      ).length,
      amount: formatCurrencyMetric(payableBalance),
    },
    {
      label: "应付逾期",
      count: payableRows.filter(row => String(row.status || "") === "overdue")
        .length,
      amount: formatCurrencyMetric(
        payableRows
          .filter(row => String(row.status || "") === "overdue")
          .reduce(
            (sum, row) =>
              sum +
              Math.max(
                0,
                toMetricNumber(row.amountBase || row.amount) -
                  toMetricNumber(row.paidAmount)
              ),
            0
          )
      ),
    },
  ];

  return {
    boardId: "finance_dashboard",
    title: "财务部看板",
    subtitle: "聚合应收应付、收付款与现金流变化",
    periodLabel: period.periodLabel,
    summaryCards: [
      {
        id: "finance-receivable",
        label: "应收余额",
        value: formatCurrencyMetric(receivableBalance),
        helper: `${receivableRows.length} 笔应收`,
      },
      {
        id: "finance-receipt",
        label: "本期回款",
        value: formatCurrencyMetric(receiptAmount),
        helper: "收款流水汇总",
      },
      {
        id: "finance-payable",
        label: "应付余额",
        value: formatCurrencyMetric(payableBalance),
        helper: `${payableRows.length} 笔应付`,
      },
      {
        id: "finance-payment",
        label: "本期付款",
        value: formatCurrencyMetric(paymentAmount),
        helper: "付款流水汇总",
      },
    ],
    trend: {
      title: "现金流趋势",
      primaryLabel: "回款金额",
      secondaryLabel: "付款金额",
      rows: trend.rows,
    },
    breakdownTitle: "应收应付状态",
    breakdown,
    focusTitle: "最新收付款",
    focusRows: paymentRows
      .sort((a, b) =>
        String(b.paymentDate || "").localeCompare(String(a.paymentDate || ""))
      )
      .slice(0, 5)
      .map(row => ({
        title: String(row.recordNo || "-"),
        subtitle: String(row.relatedNo || "未关联单据"),
        value: formatCurrencyMetric(row.amountBase || row.amount),
        extra: String(row.type || "-"),
      })),
  };
}

async function buildQualityDepartmentBoard(
  db: Awaited<ReturnType<typeof getDb>>,
  year: number,
  month?: number | null
) {
  const period = buildDashboardPeriod(year, month);
  const [inspectionRows, labRows, receiptRows] = await Promise.all([
    db!
      .select({
        inspectionNo: qualityInspections.inspectionNo,
        type: qualityInspections.type,
        result: qualityInspections.result,
        inspectionDate: qualityInspections.inspectionDate,
        itemName: qualityInspections.itemName,
        batchNo: qualityInspections.batchNo,
      })
      .from(qualityInspections),
    db!
      .select({
        recordNo: labRecords.recordNo,
        testDate: labRecords.testDate,
        conclusion: labRecords.conclusion,
        status: labRecords.status,
        testType: labRecords.testType,
      })
      .from(labRecords),
    db!
      .select({
        receiptNo: goodsReceipts.receiptNo,
        receiptDate: goodsReceipts.receiptDate,
        status: goodsReceipts.status,
        supplierName: goodsReceipts.supplierName,
      })
      .from(goodsReceipts),
  ]);

  const filteredInspections = inspectionRows.filter(row => {
    const date = pickMetricDate(row.inspectionDate);
    return date ? date >= period.start && date <= period.end : false;
  });
  const filteredLabs = labRows.filter(row => {
    const date = pickMetricDate(row.testDate);
    return date ? date >= period.start && date <= period.end : false;
  });
  const filteredReceipts = receiptRows.filter(row => {
    const date = pickMetricDate(row.receiptDate);
    return date ? date >= period.start && date <= period.end : false;
  });

  const qualifiedCount = filteredInspections.filter(
    row => String(row.result || "") === "qualified"
  ).length;
  const inspectionCount = filteredInspections.length;
  const qualifiedRate =
    inspectionCount > 0 ? (qualifiedCount / inspectionCount) * 100 : 0;
  const pendingCount =
    filteredReceipts.filter(row =>
      ["pending_inspection", "inspecting"].includes(String(row.status || ""))
    ).length + filteredInspections.filter(row => !row.result).length;
  const abnormalCount =
    filteredInspections.filter(row =>
      ["unqualified", "conditional"].includes(String(row.result || ""))
    ).length +
    filteredLabs.filter(row => String(row.conclusion || "") === "fail").length;

  const trend = buildTrendLookup(period);
  for (const row of filteredInspections) {
    const date = pickMetricDate(row.inspectionDate);
    if (!date) continue;
    const bucketKey = period.getBucketKey(date);
    if (!bucketKey) continue;
    const target = trend.map.get(bucketKey);
    if (!target) continue;
    target.primary += 1;
    if (String(row.result || "") === "qualified") {
      target.secondary += 1;
    }
  }

  const typeBreakdown = new Map<string, number>();
  for (const row of filteredInspections) {
    const type = String(row.type || "unknown");
    typeBreakdown.set(type, (typeBreakdown.get(type) ?? 0) + 1);
  }

  const abnormalFocus = [
    ...filteredInspections
      .filter(row =>
        ["unqualified", "conditional"].includes(String(row.result || ""))
      )
      .map(row => ({
        title: String(row.inspectionNo || "-"),
        subtitle: `${String(row.itemName || "-")} / 批号 ${String(row.batchNo || "-")}`,
        value: String(row.result || "-"),
        extra: String(row.type || "-"),
      })),
    ...filteredLabs
      .filter(row => String(row.conclusion || "") === "fail")
      .map(row => ({
        title: String(row.recordNo || "-"),
        subtitle: String(row.testType || "实验室记录"),
        value: "fail",
        extra: String(row.status || "-"),
      })),
  ].slice(0, 5);

  return {
    boardId: "quality_dashboard",
    title: "质量部看板",
    subtitle: "聚合检验结果、实验室记录与待放行批次",
    periodLabel: period.periodLabel,
    summaryCards: [
      {
        id: "quality-inspections",
        label: "检验总数",
        value: formatCountMetric(inspectionCount, " 项"),
        helper: `${filteredLabs.length} 条实验室记录`,
      },
      {
        id: "quality-rate",
        label: "检验合格率",
        value: formatPercentMetric(qualifiedRate),
        helper: `${qualifiedCount} 项合格`,
      },
      {
        id: "quality-pending",
        label: "待处理项",
        value: formatCountMetric(pendingCount, " 项"),
        helper: "待检/待放行",
      },
      {
        id: "quality-abnormal",
        label: "异常项",
        value: formatCountMetric(abnormalCount, " 项"),
        helper: "需跟踪整改",
      },
    ],
    trend: {
      title: "检验趋势",
      primaryLabel: "检验数量",
      secondaryLabel: "合格数量",
      rows: trend.rows,
    },
    breakdownTitle: "检验类型分布",
    breakdown: Array.from(typeBreakdown.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    focusTitle: "重点异常记录",
    focusRows: abnormalFocus,
  };
}

export async function getDepartmentDashboardData(params: {
  dashboardId: DashboardPermissionId;
  year: number;
  month?: number | null;
  companyId?: number | null;
}) {
  const db = await getDb();
  if (!db) return null;
  await ensureGoodsReceiptsTable(db);

  switch (params.dashboardId) {
    case "sales_dashboard":
      return buildSalesDepartmentBoard(
        db,
        params.year,
        params.month,
        params.companyId
      );
    case "production_dashboard":
      return buildProductionDepartmentBoard(db, params.year, params.month);
    case "purchase_dashboard":
      return buildPurchaseDepartmentBoard(
        db,
        params.year,
        params.month,
        params.companyId
      );
    case "finance_dashboard":
      return buildFinanceDepartmentBoard(
        db,
        params.year,
        params.month,
        params.companyId
      );
    case "quality_dashboard":
      return buildQualityDepartmentBoard(db, params.year, params.month);
    default:
      return null;
  }
}

export async function getBossDashboardData(params: {
  year: number;
  month?: number | null;
  companyId?: number | null;
}) {
  const db = await getDb();
  if (!db) return null;
  await ensureGoodsReceiptsTable(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const activeCompanyId = params.companyId
    ? normalizeCompanyId(params.companyId, mainCompanyId)
    : null;
  const collaborativeOnly =
    activeCompanyId !== null && activeCompanyId !== mainCompanyId;
  const now = new Date();
  const todayRange = buildDayRange(now);
  const monthRange = buildMonthToDateRange(now);
  const yearRange = buildYearToDateRange(now);
  const period = buildDashboardPeriod(params.year, params.month);
  const benchmarkPeriod = period.month
    ? buildDashboardPeriod(period.year - 1, period.month)
    : buildDashboardPeriod(period.year - 1);
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthRange = buildMonthRange(
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth() + 1
  );
  const queryStart = minMetricDate(
    period.start,
    benchmarkPeriod.start,
    yearRange.start,
    previousMonthRange.start
  );
  const queryEnd = maxMetricDate(period.end, todayRange.end);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ninetyDaysLater = new Date(todayRange.end);
  ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90);

  const [
    salesRows,
    salesItemRows,
    purchaseRows,
    purchaseItemRows,
    goodsReceiptRows,
    productionRows,
    inspectionRows,
    incidentRows,
    inventoryRows,
    receivableRows,
    paymentRows,
    bankRows,
    expenseRows,
    payrollRows,
    activePersonnelRows,
    certificateRows,
    warehouseRows,
  ] = await Promise.all([
    db
      .select({
        id: salesOrders.id,
        orderDate: salesOrders.orderDate,
        deliveryDate: salesOrders.deliveryDate,
        status: salesOrders.status,
        totalAmountBase: salesOrders.totalAmountBase,
        customerId: salesOrders.customerId,
        customerName: customers.name,
        paymentStatus: salesOrders.paymentStatus,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(
        and(
          gte(salesOrders.orderDate, queryStart),
          lte(salesOrders.orderDate, queryEnd),
          activeCompanyId
            ? eq((salesOrders as any).companyId, activeCompanyId)
            : sql`1=1`
        )
      ),
    db
      .select({
        orderId: salesOrderItems.orderId,
        productId: salesOrderItems.productId,
        quantity: salesOrderItems.quantity,
        amount: salesOrderItems.amount,
        orderDate: salesOrders.orderDate,
        status: salesOrders.status,
        productName: products.name,
      })
      .from(salesOrderItems)
      .leftJoin(salesOrders, eq(salesOrderItems.orderId, salesOrders.id))
      .leftJoin(products, eq(salesOrderItems.productId, products.id))
      .where(
        and(
          gte(salesOrders.orderDate, queryStart),
          lte(salesOrders.orderDate, queryEnd),
          activeCompanyId
            ? eq((salesOrders as any).companyId, activeCompanyId)
            : sql`1=1`
        )
      ),
    db
      .select({
        id: purchaseOrders.id,
        orderDate: purchaseOrders.orderDate,
        expectedDate: purchaseOrders.expectedDate,
        status: purchaseOrders.status,
        totalAmountBase: purchaseOrders.totalAmountBase,
        supplierId: purchaseOrders.supplierId,
        supplierName: purchaseOrders.supplierName,
      })
      .from(purchaseOrders)
      .where(
        and(
          gte(purchaseOrders.orderDate, queryStart),
          lte(purchaseOrders.orderDate, queryEnd),
          activeCompanyId
            ? eq((purchaseOrders as any).companyId, activeCompanyId)
            : sql`1=1`
        )
      ),
    db
      .select({
        orderId: purchaseOrderItems.orderId,
        productId: purchaseOrderItems.productId,
        materialCode: purchaseOrderItems.materialCode,
        materialName: purchaseOrderItems.materialName,
        unitPrice: purchaseOrderItems.unitPrice,
        quantity: purchaseOrderItems.quantity,
        amount: purchaseOrderItems.amount,
        orderDate: purchaseOrders.orderDate,
        supplierName: purchaseOrders.supplierName,
        status: purchaseOrders.status,
      })
      .from(purchaseOrderItems)
      .leftJoin(
        purchaseOrders,
        eq(purchaseOrderItems.orderId, purchaseOrders.id)
      )
      .where(
        and(
          gte(purchaseOrders.orderDate, queryStart),
          lte(purchaseOrders.orderDate, queryEnd),
          activeCompanyId
            ? eq((purchaseOrders as any).companyId, activeCompanyId)
            : sql`1=1`
        )
      ),
    collaborativeOnly
      ? Promise.resolve([] as any[])
      : db
          .select({
            purchaseOrderId: goodsReceipts.purchaseOrderId,
            supplierId: goodsReceipts.supplierId,
            supplierName: goodsReceipts.supplierName,
            receiptDate: goodsReceipts.receiptDate,
            status: goodsReceipts.status,
          })
          .from(goodsReceipts)
          .where(
            and(
              gte(goodsReceipts.receiptDate, previousMonthRange.start),
              lte(goodsReceipts.receiptDate, todayRange.end)
            )
          ),
    collaborativeOnly
      ? Promise.resolve([] as any[])
      : db
          .select({
            status: productionOrders.status,
            plannedQty: productionOrders.plannedQty,
            completedQty: productionOrders.completedQty,
            plannedEndDate: productionOrders.plannedEndDate,
            actualEndDate: productionOrders.actualEndDate,
            productionDate: productionOrders.productionDate,
            createdAt: productionOrders.createdAt,
          })
          .from(productionOrders),
    collaborativeOnly
      ? Promise.resolve([] as any[])
      : db
          .select({
            type: qualityInspections.type,
            result: qualityInspections.result,
            inspectionDate: qualityInspections.inspectionDate,
            inspectedQty: qualityInspections.inspectedQty,
            qualifiedQty: qualityInspections.qualifiedQty,
            unqualifiedQty: qualityInspections.unqualifiedQty,
          })
          .from(qualityInspections)
          .where(
            and(
              gte(
                qualityInspections.inspectionDate,
                minMetricDate(period.start, monthRange.start)
              ),
              lte(qualityInspections.inspectionDate, queryEnd)
            )
          ),
    collaborativeOnly
      ? Promise.resolve([] as any[])
      : db
          .select({
            title: qualityIncidents.title,
            type: qualityIncidents.type,
            status: qualityIncidents.status,
            severity: qualityIncidents.severity,
            reportDate: qualityIncidents.reportDate,
            closeDate: qualityIncidents.closeDate,
          })
          .from(qualityIncidents)
          .where(
            and(
              gte(qualityIncidents.reportDate, yearRange.start),
              lte(qualityIncidents.reportDate, todayRange.end)
            )
          ),
    db
      .select({
        productId: inventory.productId,
        materialCode: inventory.materialCode,
        itemName: inventory.itemName,
        quantity: inventory.quantity,
        safetyStock: inventory.safetyStock,
        warehouseId: inventory.warehouseId,
      })
      .from(inventory)
      .where(
        activeCompanyId
          ? eq((inventory as any).companyId, activeCompanyId)
          : sql`1=1`
      ),
    db
      .select({
        amountBase: accountsReceivable.amountBase,
        amount: accountsReceivable.amount,
        paidAmount: accountsReceivable.paidAmount,
        dueDate: accountsReceivable.dueDate,
        status: accountsReceivable.status,
      })
      .from(accountsReceivable)
      .where(
        activeCompanyId
          ? eq((accountsReceivable as any).companyId, activeCompanyId)
          : sql`1=1`
      ),
    db
      .select({
        type: paymentRecords.type,
        paymentDate: paymentRecords.paymentDate,
        amountBase: paymentRecords.amountBase,
        amount: paymentRecords.amount,
      })
      .from(paymentRecords)
      .where(
        and(
          gte(
            paymentRecords.paymentDate,
            minMetricDate(period.start, yearRange.start)
          ),
          lte(paymentRecords.paymentDate, queryEnd),
          activeCompanyId
            ? eq((paymentRecords as any).companyId, activeCompanyId)
            : sql`1=1`
        )
      ),
    db
      .select({
        balance: bankAccounts.balance,
        status: bankAccounts.status,
      })
      .from(bankAccounts)
      .where(
        activeCompanyId
          ? eq((bankAccounts as any).companyId, activeCompanyId)
          : sql`1=1`
      ),
    db
      .select({
        applyDate: expenseReimbursements.applyDate,
        totalAmount: expenseReimbursements.totalAmount,
        status: expenseReimbursements.status,
      })
      .from(expenseReimbursements)
      .where(
        and(
          gte(expenseReimbursements.applyDate, monthRange.start),
          lte(expenseReimbursements.applyDate, todayRange.end),
          activeCompanyId
            ? eq((expenseReimbursements as any).companyId, activeCompanyId)
            : sql`1=1`
        )
      ),
    db
      .select({
        netSalary: personnelPayrollRecords.netSalary,
        status: personnelPayrollRecords.status,
      })
      .from(personnelPayrollRecords)
      .where(eq(personnelPayrollRecords.periodMonth, currentMonthKey)),
    db
      .select({
        id: personnel.id,
      })
      .from(personnel)
      .where(eq(personnel.status, "active")),
    collaborativeOnly
      ? Promise.resolve([] as any[])
      : db
          .select({
            title: documents.title,
            expiryDate: documents.expiryDate,
            department: documents.department,
            status: documents.status,
          })
          .from(documents)
          .where(
            and(
              eq(documents.category, "certificate"),
              isNotNull(documents.expiryDate),
              gte(documents.expiryDate, todayRange.start),
              lte(documents.expiryDate, ninetyDaysLater),
              ne(documents.status, "obsolete")
            )
          ),
    db
      .select({
        id: warehouses.id,
        type: warehouses.type,
      })
      .from(warehouses),
  ]);

  const effectiveSales = salesRows.filter(
    row => !["draft", "cancelled"].includes(String(row.status || ""))
  );
  const effectiveSalesItems = salesItemRows.filter(
    row => !["draft", "cancelled"].includes(String(row.status || ""))
  );
  const dueReceivableRows = receivableRows.filter(row => {
    const dueDate = pickMetricDate(row.dueDate);
    const outstanding = Math.max(
      0,
      toMetricNumber(row.amountBase ?? row.amount) -
        toMetricNumber(row.paidAmount)
    );
    return Boolean(dueDate && dueDate < todayRange.start && outstanding > 0);
  });
  const receivableBalance = sumOutstandingMetric(receivableRows);
  const overdueReceivableAmount = sumOutstandingMetric(dueReceivableRows);
  const cashBalance = bankRows
    .filter(row => String(row.status || "") === "active")
    .reduce((sum, row) => sum + toMetricNumber(row.balance), 0);

  const productIds = Array.from(
    new Set([
      ...effectiveSalesItems
        .map(row => Number(row.productId || 0))
        .filter(id => id > 0),
      ...inventoryRows
        .map(row => Number(row.productId || 0))
        .filter(id => id > 0),
      ...purchaseItemRows
        .map(row => Number(row.productId || 0))
        .filter(id => id > 0),
    ])
  );

  const [productRows, bomRows, supplierPriceRows] = await Promise.all([
    productIds.length > 0
      ? db
          .select({
            id: products.id,
            name: products.name,
            productCategory: products.productCategory,
          })
          .from(products)
          .where(inArray(products.id, productIds))
      : Promise.resolve([] as any[]),
    productIds.length > 0
      ? db
          .select({
            productId: bom.productId,
            quantity: bom.quantity,
            unitPrice: bom.unitPrice,
            baseProductQty: bom.baseProductQty,
            status: bom.status,
          })
          .from(bom)
          .where(
            and(inArray(bom.productId, productIds), eq(bom.status, "active"))
          )
      : Promise.resolve([] as any[]),
    productIds.length > 0
      ? db
          .select({
            productId: productSupplierPrices.productId,
            unitPrice: productSupplierPrices.unitPrice,
            isDefault: productSupplierPrices.isDefault,
          })
          .from(productSupplierPrices)
          .where(inArray(productSupplierPrices.productId, productIds))
      : Promise.resolve([] as any[]),
  ]);

  const selectedCustomerIds = Array.from(
    new Set(
      effectiveSales
        .filter(row =>
          isMetricDateInRange(
            pickMetricDate(row.orderDate),
            period.start,
            period.end
          )
        )
        .map(row => Number(row.customerId || 0))
        .filter(id => id > 0)
    )
  );
  const customerHistoryRows =
    selectedCustomerIds.length > 0
      ? await db
          .select({
            customerId: salesOrders.customerId,
            orderDate: salesOrders.orderDate,
            status: salesOrders.status,
          })
          .from(salesOrders)
          .where(
            and(
              inArray(salesOrders.customerId, selectedCustomerIds),
              activeCompanyId
                ? eq((salesOrders as any).companyId, activeCompanyId)
                : sql`1=1`
            )
          )
      : [];

  const productMap = new Map<
    number,
    { name: string; productCategory: string | null }
  >();
  for (const row of productRows) {
    productMap.set(Number(row.id), {
      name: String(row.name || "-"),
      productCategory: row.productCategory ? String(row.productCategory) : null,
    });
  }

  const warehouseTypeMap = new Map<number, string>();
  for (const row of warehouseRows) {
    warehouseTypeMap.set(Number(row.id), String(row.type || ""));
  }

  const bomCostAccumulator = new Map<
    number,
    { total: number; baseQty: number }
  >();
  for (const row of bomRows) {
    const productId = Number(row.productId || 0);
    if (productId <= 0) continue;
    const current = bomCostAccumulator.get(productId) ?? {
      total: 0,
      baseQty: 1,
    };
    current.total +=
      toMetricNumber(row.quantity) * toMetricNumber(row.unitPrice);
    current.baseQty = Math.max(
      1,
      toMetricNumber(row.baseProductQty) || current.baseQty
    );
    bomCostAccumulator.set(productId, current);
  }

  const purchaseCostAccumulator = new Map<
    number,
    { total: number; qty: number }
  >();
  const materialCostAccumulator = new Map<
    string,
    { label: string; total: number; qty: number }
  >();
  for (const row of purchaseItemRows) {
    const unitPrice = toMetricNumber(row.unitPrice);
    const qty = Math.max(0, toMetricNumber(row.quantity));
    const amount = toMetricNumber(row.amount);
    const effectiveQty =
      qty > 0 ? qty : unitPrice > 0 ? amount / Math.max(unitPrice, 1) : 0;
    const productId = Number(row.productId || 0);
    if (productId > 0) {
      const current = purchaseCostAccumulator.get(productId) ?? {
        total: 0,
        qty: 0,
      };
      current.total += amount > 0 ? amount : unitPrice * effectiveQty;
      current.qty += effectiveQty;
      purchaseCostAccumulator.set(productId, current);
    }
    const materialKey = String(
      row.materialCode || row.materialName || ""
    ).trim();
    if (materialKey) {
      const current = materialCostAccumulator.get(materialKey) ?? {
        label: String(row.materialName || row.materialCode || materialKey),
        total: 0,
        qty: 0,
      };
      current.total += amount > 0 ? amount : unitPrice * effectiveQty;
      current.qty += effectiveQty;
      materialCostAccumulator.set(materialKey, current);
    }
  }

  const supplierPriceAccumulator = new Map<
    number,
    { total: number; weight: number }
  >();
  for (const row of supplierPriceRows) {
    const productId = Number(row.productId || 0);
    if (productId <= 0) continue;
    const current = supplierPriceAccumulator.get(productId) ?? {
      total: 0,
      weight: 0,
    };
    const weight = Number(row.isDefault) ? 2 : 1;
    current.total += toMetricNumber(row.unitPrice) * weight;
    current.weight += weight;
    supplierPriceAccumulator.set(productId, current);
  }

  const productCostMap = new Map<number, number>();
  for (const productId of productIds) {
    const bomCost = bomCostAccumulator.get(productId);
    if (bomCost && bomCost.total > 0) {
      productCostMap.set(
        productId,
        bomCost.total / Math.max(1, bomCost.baseQty)
      );
      continue;
    }
    const purchaseCost = purchaseCostAccumulator.get(productId);
    if (purchaseCost && purchaseCost.qty > 0) {
      productCostMap.set(
        productId,
        purchaseCost.total / Math.max(1, purchaseCost.qty)
      );
      continue;
    }
    const supplierCost = supplierPriceAccumulator.get(productId);
    if (supplierCost && supplierCost.weight > 0) {
      productCostMap.set(
        productId,
        supplierCost.total / Math.max(1, supplierCost.weight)
      );
    }
  }

  const materialCostMap = new Map<string, number>();
  for (const [key, value] of Array.from(materialCostAccumulator.entries())) {
    materialCostMap.set(
      key,
      value.qty > 0 ? value.total / Math.max(1, value.qty) : 0
    );
  }

  const salesSumByRange = (start: Date, end: Date) =>
    effectiveSales
      .filter(row =>
        isMetricDateInRange(pickMetricDate(row.orderDate), start, end)
      )
      .reduce((sum, row) => sum + toMetricNumber(row.totalAmountBase), 0);

  const filteredSales = effectiveSales.filter(row =>
    isMetricDateInRange(pickMetricDate(row.orderDate), period.start, period.end)
  );
  const benchmarkSales = effectiveSales.filter(row =>
    isMetricDateInRange(
      pickMetricDate(row.orderDate),
      benchmarkPeriod.start,
      benchmarkPeriod.end
    )
  );
  const selectedSalesAmount = filteredSales.reduce(
    (sum, row) => sum + toMetricNumber(row.totalAmountBase),
    0
  );
  const benchmarkSalesAmount = benchmarkSales.reduce(
    (sum, row) => sum + toMetricNumber(row.totalAmountBase),
    0
  );
  const todaySalesAmount = salesSumByRange(todayRange.start, todayRange.end);
  const monthSalesAmount = salesSumByRange(monthRange.start, monthRange.end);
  const yearSalesAmount = salesSumByRange(yearRange.start, yearRange.end);

  const monthSalesCost = effectiveSalesItems
    .filter(row =>
      isMetricDateInRange(
        pickMetricDate(row.orderDate),
        monthRange.start,
        monthRange.end
      )
    )
    .reduce(
      (sum, row) =>
        sum +
        toMetricNumber(row.quantity) *
          toMetricNumber(productCostMap.get(Number(row.productId || 0))),
      0
    );
  const monthGrossProfit = monthSalesAmount - monthSalesCost;
  const monthGrossMargin = safeMetricPercent(
    monthGrossProfit,
    monthSalesAmount
  );
  const currentMonthExpense = expenseRows
    .filter(
      row =>
        !["draft", "rejected", "cancelled"].includes(String(row.status || ""))
    )
    .reduce((sum, row) => sum + toMetricNumber(row.totalAmount), 0);
  const currentMonthPayroll = payrollRows
    .filter(row => !["draft"].includes(String(row.status || "")))
    .reduce((sum, row) => sum + toMetricNumber(row.netSalary), 0);
  const monthNetProfit =
    monthGrossProfit - currentMonthExpense - currentMonthPayroll;

  const trend = buildTrendLookup(period);
  for (const row of filteredSales) {
    const date = pickMetricDate(row.orderDate);
    if (!date) continue;
    const bucketKey = period.getBucketKey(date);
    if (!bucketKey) continue;
    const target = trend.map.get(bucketKey);
    if (!target) continue;
    target.primary += toMetricNumber(row.totalAmountBase);
  }
  for (const row of paymentRows.filter(
    item => String(item.type || "") === "receipt"
  )) {
    const date = pickMetricDate(row.paymentDate);
    if (!date) continue;
    const bucketKey = period.getBucketKey(date);
    if (!bucketKey) continue;
    const target = trend.map.get(bucketKey);
    if (!target) continue;
    target.secondary += toMetricNumber(row.amountBase || row.amount);
  }

  const customerTopMap = new Map<string, { amount: number; count: number }>();
  for (const row of filteredSales) {
    const customerName = String(
      row.customerName || `客户#${row.customerId || "-"}`
    );
    const current = customerTopMap.get(customerName) ?? { amount: 0, count: 0 };
    current.amount += toMetricNumber(row.totalAmountBase);
    current.count += 1;
    customerTopMap.set(customerName, current);
  }

  const productTopMap = new Map<string, { amount: number; qty: number }>();
  for (const row of effectiveSalesItems.filter(item =>
    isMetricDateInRange(
      pickMetricDate(item.orderDate),
      period.start,
      period.end
    )
  )) {
    const productName = String(
      row.productName || `产品#${row.productId || "-"}`
    );
    const current = productTopMap.get(productName) ?? { amount: 0, qty: 0 };
    current.amount += toMetricNumber(row.amount);
    current.qty += toMetricNumber(row.quantity);
    productTopMap.set(productName, current);
  }

  const customerFirstOrderMap = new Map<number, Date>();
  const customerHasPriorOrder = new Set<number>();
  for (const row of customerHistoryRows) {
    if (["draft", "cancelled"].includes(String(row.status || ""))) continue;
    const customerId = Number(row.customerId || 0);
    const orderDate = pickMetricDate(row.orderDate);
    if (customerId <= 0 || !orderDate) continue;
    const existing = customerFirstOrderMap.get(customerId);
    if (!existing || orderDate < existing) {
      customerFirstOrderMap.set(customerId, orderDate);
    }
    if (orderDate < period.start) {
      customerHasPriorOrder.add(customerId);
    }
  }
  const newCustomerCount = selectedCustomerIds.filter(id => {
    const firstOrder = customerFirstOrderMap.get(id);
    return isMetricDateInRange(firstOrder ?? null, period.start, period.end);
  }).length;
  const repeatPurchaseRate = safeMetricPercent(
    customerHasPriorOrder.size,
    selectedCustomerIds.length
  );

  const monthCompletedOrders = productionRows.filter(row => {
    const completedDate = pickMetricDate(
      row.actualEndDate,
      row.productionDate,
      row.createdAt
    );
    return (
      String(row.status || "") === "completed" &&
      isMetricDateInRange(completedDate, monthRange.start, monthRange.end)
    );
  });
  const todayCompletedOrders = productionRows.filter(row => {
    const completedDate = pickMetricDate(
      row.actualEndDate,
      row.productionDate,
      row.createdAt
    );
    return (
      String(row.status || "") === "completed" &&
      isMetricDateInRange(completedDate, todayRange.start, todayRange.end)
    );
  });
  const monthCompletedQty = monthCompletedOrders.reduce(
    (sum, row) => sum + toMetricNumber(row.completedQty),
    0
  );
  const todayCompletedQty = todayCompletedOrders.reduce(
    (sum, row) => sum + toMetricNumber(row.completedQty),
    0
  );
  const currentOpenProductionOrders = productionRows.filter(row =>
    ["planned", "in_progress"].includes(String(row.status || ""))
  );
  const delayedProductionOrders = productionRows.filter(row => {
    const plannedEndDate = pickMetricDate(row.plannedEndDate);
    return (
      !["completed", "cancelled"].includes(String(row.status || "")) &&
      Boolean(plannedEndDate && plannedEndDate < todayRange.start)
    );
  });

  const currentMonthInspections = inspectionRows.filter(row =>
    isMetricDateInRange(
      pickMetricDate(row.inspectionDate),
      monthRange.start,
      monthRange.end
    )
  );
  const monthInspectedQty = currentMonthInspections.reduce(
    (sum, row) => sum + toMetricNumber(row.inspectedQty),
    0
  );
  const monthQualifiedQty = currentMonthInspections.reduce(
    (sum, row) => sum + toMetricNumber(row.qualifiedQty),
    0
  );
  const monthUnqualifiedQty = currentMonthInspections.reduce(
    (sum, row) => sum + toMetricNumber(row.unqualifiedQty),
    0
  );
  const monthPassRate =
    monthInspectedQty > 0
      ? safeMetricPercent(monthQualifiedQty, monthInspectedQty)
      : safeMetricPercent(
          currentMonthInspections.filter(
            row => String(row.result || "") === "qualified"
          ).length,
          currentMonthInspections.length
        );
  const monthDefectRate =
    monthInspectedQty > 0
      ? safeMetricPercent(monthUnqualifiedQty, monthInspectedQty)
      : safeMetricPercent(
          currentMonthInspections.filter(
            row => String(row.result || "") === "unqualified"
          ).length,
          currentMonthInspections.length
        );

  const inventoryAlertRows = inventoryRows
    .filter(
      row =>
        toMetricNumber(row.safetyStock) > 0 &&
        toMetricNumber(row.quantity) < toMetricNumber(row.safetyStock)
    )
    .sort(
      (a, b) =>
        toMetricNumber(a.quantity) /
          Math.max(1, toMetricNumber(a.safetyStock)) -
        toMetricNumber(b.quantity) / Math.max(1, toMetricNumber(b.safetyStock))
    );

  let rawMaterialInventoryAmount = 0;
  let finishedGoodsInventoryAmount = 0;
  for (const row of inventoryRows) {
    const productId = Number(row.productId || 0);
    const productInfo = productMap.get(productId);
    const warehouseType =
      warehouseTypeMap.get(Number(row.warehouseId || 0)) || "";
    const materialKey = String(row.materialCode || row.itemName || "").trim();
    const unitCost =
      productCostMap.get(productId) ?? materialCostMap.get(materialKey) ?? 0;
    const lineAmount = toMetricNumber(row.quantity) * unitCost;
    const productCategory = productInfo?.productCategory || "";
    if (
      [
        "raw_material",
        "component",
        "consumable",
        "packaging_material",
      ].includes(productCategory) ||
      warehouseType === "raw_material"
    ) {
      rawMaterialInventoryAmount += lineAmount;
    } else if (productCategory === "finished" || warehouseType === "finished") {
      finishedGoodsInventoryAmount += lineAmount;
    }
  }
  const daysElapsedInMonth = Math.max(1, now.getDate());
  const averageDailyCost = monthSalesCost / daysElapsedInMonth;
  const inventoryTurnoverDays =
    averageDailyCost > 0
      ? (rawMaterialInventoryAmount + finishedGoodsInventoryAmount) /
        averageDailyCost
      : 0;

  const currentMonthPurchaseRows = purchaseRows.filter(row =>
    isMetricDateInRange(
      pickMetricDate(row.orderDate),
      monthRange.start,
      monthRange.end
    )
  );
  const currentMonthPurchaseAmount = currentMonthPurchaseRows.reduce(
    (sum, row) => sum + toMetricNumber(row.totalAmountBase),
    0
  );
  const currentMonthPurchaseItems = purchaseItemRows.filter(row =>
    isMetricDateInRange(
      pickMetricDate(row.orderDate),
      monthRange.start,
      monthRange.end
    )
  );
  const previousMonthPurchaseItems = purchaseItemRows.filter(row =>
    isMetricDateInRange(
      pickMetricDate(row.orderDate),
      previousMonthRange.start,
      previousMonthRange.end
    )
  );

  const currentMaterialStats = new Map<
    string,
    { label: string; totalAmount: number; qty: number }
  >();
  const previousMaterialStats = new Map<
    string,
    { label: string; totalAmount: number; qty: number }
  >();
  for (const row of currentMonthPurchaseItems) {
    const key = String(
      row.materialCode || row.productId || row.materialName || ""
    ).trim();
    if (!key) continue;
    const current = currentMaterialStats.get(key) ?? {
      label: String(row.materialName || row.materialCode || key),
      totalAmount: 0,
      qty: 0,
    };
    current.totalAmount +=
      toMetricNumber(row.amount) ||
      toMetricNumber(row.unitPrice) * toMetricNumber(row.quantity);
    current.qty += toMetricNumber(row.quantity);
    currentMaterialStats.set(key, current);
  }
  for (const row of previousMonthPurchaseItems) {
    const key = String(
      row.materialCode || row.productId || row.materialName || ""
    ).trim();
    if (!key) continue;
    const current = previousMaterialStats.get(key) ?? {
      label: String(row.materialName || row.materialCode || key),
      totalAmount: 0,
      qty: 0,
    };
    current.totalAmount +=
      toMetricNumber(row.amount) ||
      toMetricNumber(row.unitPrice) * toMetricNumber(row.quantity);
    current.qty += toMetricNumber(row.quantity);
    previousMaterialStats.set(key, current);
  }

  const priceWatch = Array.from(currentMaterialStats.entries())
    .map(([key, value]) => {
      const previous = previousMaterialStats.get(key);
      const currentAvg =
        value.qty > 0 ? value.totalAmount / Math.max(1, value.qty) : 0;
      const previousAvg =
        previous && previous.qty > 0
          ? previous.totalAmount / Math.max(1, previous.qty)
          : 0;
      const change =
        previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
      return {
        title: value.label,
        subtitle:
          previousAvg > 0
            ? `本月均价 ${formatCurrencyMetric(currentAvg)}，上月 ${formatCurrencyMetric(previousAvg)}`
            : `本月均价 ${formatCurrencyMetric(currentAvg)}`,
        value: previousAvg > 0 ? formatSignedPercentMetric(change) : "新物料",
        extra: "原料价格",
        tone:
          previousAvg <= 0
            ? "warning"
            : change >= 10
              ? "danger"
              : change >= 3
                ? "warning"
                : "normal",
        magnitude: Math.abs(change),
      };
    })
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 5)
    .map(({ magnitude: _magnitude, ...row }) => row);

  const receiptMap = new Map<
    number,
    Array<{ receiptDate: unknown; status: unknown }>
  >();
  for (const row of goodsReceiptRows) {
    const orderId = Number(row.purchaseOrderId || 0);
    if (orderId <= 0) continue;
    const current = receiptMap.get(orderId) ?? [];
    current.push({ receiptDate: row.receiptDate, status: row.status });
    receiptMap.set(orderId, current);
  }

  const dueSupplierStats = new Map<
    string,
    { amount: number; total: number; onTime: number }
  >();
  let dueSupplierOrders = 0;
  let onTimeSupplierOrders = 0;
  for (const row of currentMonthPurchaseRows) {
    const expectedDate = pickMetricDate(row.expectedDate);
    if (!expectedDate || expectedDate > todayRange.end) continue;
    const receipts = receiptMap.get(Number(row.id || 0)) ?? [];
    const earliestReceipt = receipts
      .map(item => pickMetricDate(item.receiptDate))
      .filter((item): item is Date => Boolean(item))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const onTime = Boolean(earliestReceipt && earliestReceipt <= expectedDate);
    dueSupplierOrders += 1;
    if (onTime) onTimeSupplierOrders += 1;
    const supplierName = String(
      row.supplierName || `供应商#${row.supplierId || "-"}`
    );
    const current = dueSupplierStats.get(supplierName) ?? {
      amount: 0,
      total: 0,
      onTime: 0,
    };
    current.amount += toMetricNumber(row.totalAmountBase);
    current.total += 1;
    current.onTime += onTime ? 1 : 0;
    dueSupplierStats.set(supplierName, current);
  }
  const supplierOnTimeRate =
    dueSupplierOrders > 0
      ? safeMetricPercent(onTimeSupplierOrders, dueSupplierOrders)
      : 0;
  const supplierWatch = Array.from(dueSupplierStats.entries())
    .map(([label, value]) => {
      const rate = safeMetricPercent(value.onTime, value.total);
      return {
        title: label,
        subtitle: `${value.total} 单到交期，采购额 ${formatCurrencyMetric(value.amount)}`,
        value: formatPercentMetric(rate),
        extra: "准时交付",
        tone: rate < 85 ? "danger" : rate < 95 ? "warning" : "normal",
        amount: value.amount,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(({ amount: _amount, ...row }) => row);

  const currentMonthComplaints = incidentRows.filter(row => {
    const reportDate = pickMetricDate(row.reportDate);
    return (
      String(row.type || "") === "complaint" &&
      isMetricDateInRange(reportDate, monthRange.start, monthRange.end)
    );
  });
  const complaintClosedCount = currentMonthComplaints.filter(
    row => String(row.status || "") === "closed"
  ).length;
  const complaintCompletionRate = safeMetricPercent(
    complaintClosedCount,
    currentMonthComplaints.length
  );

  const complianceWatch = certificateRows
    .map(row => {
      const expiryDate = pickMetricDate(row.expiryDate);
      const daysLeft = expiryDate
        ? Math.max(
            0,
            Math.ceil(
              (expiryDate.getTime() - todayRange.start.getTime()) /
                (24 * 60 * 60 * 1000)
            )
          )
        : 0;
      return {
        title: String(row.title || "证件"),
        subtitle: row.department
          ? `${String(row.department)} · ${daysLeft} 天后到期`
          : `${daysLeft} 天后到期`,
        value: formatDate(expiryDate),
        extra: "证件提醒",
        tone: daysLeft <= 30 ? "danger" : daysLeft <= 60 ? "warning" : "normal",
        daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5)
    .map(({ daysLeft: _daysLeft, ...row }) => row);

  const activePersonnelCount = activePersonnelRows.length;
  const perCapitaOutput =
    activePersonnelCount > 0 ? monthSalesAmount / activePersonnelCount : 0;
  const maxPriceRise = priceWatch
    .map(row => ({
      row,
      change: toMetricNumber(
        String(row.value || "")
          .replace("%", "")
          .replace("+", "")
      ),
    }))
    .sort((a, b) => b.change - a.change)[0];

  const benchmarkLabel = period.month ? "去年同月" : "去年全年";
  const salesTargetDisplay =
    benchmarkSalesAmount > 0
      ? formatPercentMetric(
          safeMetricPercent(selectedSalesAmount, benchmarkSalesAmount)
        )
      : "待设";

  return {
    title: "经营看板",
    subtitle: "上面先看今天的钱和风险，下面再看筛选期间的销售趋势与排行",
    periodLabel: period.periodLabel,
    overviewCards: [
      {
        id: "boss-sales-today",
        label: "今日销售额",
        value: formatCurrencyMetric(todaySalesAmount),
        helper: "今天签下来的订单",
        tone: todaySalesAmount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-sales-month",
        label: "本月销售额",
        value: formatCurrencyMetric(monthSalesAmount),
        helper: "到今天为止",
        tone: monthSalesAmount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-sales-year",
        label: "本年销售额",
        value: formatCurrencyMetric(yearSalesAmount),
        helper: "今年累计",
        tone: yearSalesAmount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-gross-profit",
        label: "本月毛利",
        value: formatCurrencyMetric(monthGrossProfit),
        helper: "销售减掉估算成本",
        tone: monthGrossProfit >= 0 ? "normal" : "danger",
      },
      {
        id: "boss-gross-margin",
        label: "本月毛利率",
        value: formatPercentMetric(monthGrossMargin),
        helper: "赚钱厚不厚",
        tone:
          monthGrossMargin < 15
            ? "danger"
            : monthGrossMargin < 30
              ? "warning"
              : "normal",
      },
      {
        id: "boss-net-profit",
        label: "本月净利润",
        value: formatCurrencyMetric(monthNetProfit),
        helper: "扣工资和报销后的估算",
        tone: monthNetProfit >= 0 ? "normal" : "danger",
      },
      {
        id: "boss-receivable-balance",
        label: "应收账款",
        value: formatCurrencyMetric(receivableBalance),
        helper: "还没收回来的钱",
        tone: receivableBalance > 0 ? "warning" : "normal",
      },
      {
        id: "boss-receivable-overdue",
        label: "逾期账款",
        value: formatCurrencyMetric(overdueReceivableAmount),
        helper: `${dueReceivableRows.length} 笔已超期`,
        tone: overdueReceivableAmount > 0 ? "danger" : "normal",
      },
      {
        id: "boss-cash-balance",
        label: "现金流余额",
        value: formatCurrencyMetric(cashBalance),
        helper: "银行账户余额合计",
        tone: cashBalance >= overdueReceivableAmount ? "normal" : "warning",
      },
    ],
    salesCards: [
      {
        id: "boss-period-sales",
        label: `${period.periodLabel}销售额`,
        value: formatCurrencyMetric(selectedSalesAmount),
        helper: `${filteredSales.length} 张生效订单`,
        tone: selectedSalesAmount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-period-new-customers",
        label: "新客户数",
        value: formatCountMetric(newCustomerCount, " 家"),
        helper: `在${period.periodLabel}第一次下单`,
        tone: newCustomerCount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-period-repeat-rate",
        label: "老客户复购率",
        value: formatPercentMetric(repeatPurchaseRate),
        helper: `${selectedCustomerIds.length} 家成交客户里回头客占比`,
        tone:
          repeatPurchaseRate < 30
            ? "danger"
            : repeatPurchaseRate < 60
              ? "warning"
              : "normal",
      },
      {
        id: "boss-period-target",
        label: "销售目标完成率",
        value: salesTargetDisplay,
        helper:
          benchmarkSalesAmount > 0
            ? `先按${benchmarkLabel}${formatCurrencyMetric(benchmarkSalesAmount)}做基线`
            : "还没建目标，建议后续补目标表",
        tone:
          benchmarkSalesAmount <= 0
            ? "warning"
            : safeMetricPercent(selectedSalesAmount, benchmarkSalesAmount) < 80
              ? "danger"
              : safeMetricPercent(selectedSalesAmount, benchmarkSalesAmount) <
                  100
                ? "warning"
                : "normal",
      },
    ],
    productionCards: [
      {
        id: "boss-production-today",
        label: "今日完工数量",
        value: formatCountMetric(todayCompletedQty),
        helper: "今天完工入账",
        tone: todayCompletedQty > 0 ? "normal" : "warning",
      },
      {
        id: "boss-production-month",
        label: "本月完工数量",
        value: formatCountMetric(monthCompletedQty),
        helper: "到今天为止",
        tone: monthCompletedQty > 0 ? "normal" : "warning",
      },
      {
        id: "boss-production-pass-rate",
        label: "本月合格率",
        value: formatPercentMetric(monthPassRate),
        helper: "生产和质检一次过率",
        tone:
          monthPassRate < 90
            ? "danger"
            : monthPassRate < 97
              ? "warning"
              : "normal",
      },
      {
        id: "boss-production-wip",
        label: "在制订单数量",
        value: formatCountMetric(currentOpenProductionOrders.length, " 张"),
        helper: "还在排产或生产中",
        tone: currentOpenProductionOrders.length > 0 ? "warning" : "normal",
      },
      {
        id: "boss-production-delay",
        label: "延期订单",
        value: formatCountMetric(delayedProductionOrders.length, " 张"),
        helper: "已过计划交期还没完工",
        tone: delayedProductionOrders.length > 0 ? "danger" : "normal",
      },
      {
        id: "boss-inventory-raw",
        label: "原材料库存金额",
        value: formatCurrencyMetric(rawMaterialInventoryAmount),
        helper: "按最近采购价估算",
        tone: rawMaterialInventoryAmount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-inventory-finished",
        label: "成品库存金额",
        value: formatCurrencyMetric(finishedGoodsInventoryAmount),
        helper: "按BOM/采购价估算",
        tone: finishedGoodsInventoryAmount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-inventory-turnover",
        label: "库存周转天数",
        value:
          inventoryTurnoverDays > 0
            ? formatDaysMetric(inventoryTurnoverDays)
            : "暂无",
        helper: "库存压货速度",
        tone:
          inventoryTurnoverDays > 120
            ? "danger"
            : inventoryTurnoverDays > 60
              ? "warning"
              : "normal",
      },
    ],
    purchaseCards: [
      {
        id: "boss-purchase-month",
        label: "本月采购金额",
        value: formatCurrencyMetric(currentMonthPurchaseAmount),
        helper: `${currentMonthPurchaseRows.length} 张采购单`,
        tone: currentMonthPurchaseAmount > 0 ? "normal" : "warning",
      },
      {
        id: "boss-purchase-price",
        label: "主要原料价格波动",
        value: maxPriceRise ? maxPriceRise.row.value : "平稳",
        helper: maxPriceRise ? maxPriceRise.row.title : "本月暂无明显波动",
        tone: maxPriceRise?.row.tone ?? "normal",
      },
      {
        id: "boss-purchase-delivery",
        label: "核心供应商交付及时率",
        value:
          dueSupplierOrders > 0
            ? formatPercentMetric(supplierOnTimeRate)
            : "暂无",
        helper:
          dueSupplierOrders > 0
            ? `${dueSupplierOrders} 单已到交期`
            : "本月还没到交期订单",
        tone:
          dueSupplierOrders <= 0
            ? "warning"
            : supplierOnTimeRate < 85
              ? "danger"
              : supplierOnTimeRate < 95
                ? "warning"
                : "normal",
      },
    ],
    qualityCards: [
      {
        id: "boss-quality-first-pass",
        label: "产品一次合格率",
        value: formatPercentMetric(monthPassRate),
        helper: `${currentMonthInspections.length} 项检验`,
        tone:
          monthPassRate < 90
            ? "danger"
            : monthPassRate < 97
              ? "warning"
              : "normal",
      },
      {
        id: "boss-quality-defect",
        label: "不良率",
        value: formatPercentMetric(monthDefectRate),
        helper: "本月检验口径",
        tone:
          monthDefectRate > 5
            ? "danger"
            : monthDefectRate > 2
              ? "warning"
              : "normal",
      },
      {
        id: "boss-quality-complaint",
        label: "客诉数量",
        value: formatCountMetric(currentMonthComplaints.length, " 件"),
        helper: "本月新增",
        tone: currentMonthComplaints.length > 0 ? "warning" : "normal",
      },
      {
        id: "boss-quality-complaint-close",
        label: "客诉处理完成率",
        value: formatPercentMetric(complaintCompletionRate),
        helper: `${complaintClosedCount} 件已关结`,
        tone:
          currentMonthComplaints.length === 0
            ? "normal"
            : complaintCompletionRate < 80
              ? "danger"
              : complaintCompletionRate < 100
                ? "warning"
                : "normal",
      },
      {
        id: "boss-quality-certificate",
        label: "90天内到期证件",
        value: formatCountMetric(certificateRows.length, " 个"),
        helper: "CE / FDA / ISO 等",
        tone: complianceWatch.some(row => row.tone === "danger")
          ? "danger"
          : certificateRows.length > 0
            ? "warning"
            : "normal",
      },
    ],
    peopleCards: [
      {
        id: "boss-people-output",
        label: "人均产值",
        value: formatCurrencyMetric(perCapitaOutput),
        helper: `${activePersonnelCount} 人在岗，按本月销售额估算`,
        tone: perCapitaOutput > 0 ? "normal" : "warning",
      },
    ],
    trend: {
      title: `${period.periodLabel}销售与回款趋势`,
      primaryLabel: "销售额",
      secondaryLabel: "回款额",
      rows: trend.rows,
    },
    salesCustomerTop: Array.from(customerTopMap.entries())
      .map(([label, value]) => ({
        label,
        value: value.amount,
        formattedValue: formatCurrencyMetric(value.amount),
        helper: `${value.count} 张订单`,
        tone: "normal" as const,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    salesProductTop: Array.from(productTopMap.entries())
      .map(([label, value]) => ({
        label,
        value: value.amount,
        formattedValue: formatCurrencyMetric(value.amount),
        helper: `销量 ${formatCountMetric(value.qty)}`,
        tone: "normal" as const,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    priceWatch,
    supplierWatch,
    complianceWatch,
    risks: [
      {
        title: "逾期账款",
        subtitle:
          dueReceivableRows.length > 0
            ? `${dueReceivableRows.length} 笔已经超期`
            : "回款节奏正常",
        value: formatCurrencyMetric(overdueReceivableAmount),
        extra: "财务",
        tone: overdueReceivableAmount > 0 ? "danger" : "normal",
      },
      {
        title: "延期生产单",
        subtitle:
          delayedProductionOrders.length > 0
            ? "交期已经压住了"
            : "生产交期正常",
        value: formatCountMetric(delayedProductionOrders.length, " 张"),
        extra: "生产",
        tone: delayedProductionOrders.length > 0 ? "danger" : "normal",
      },
      {
        title: "库存预警",
        subtitle: inventoryAlertRows[0]?.itemName
          ? `最紧张：${String(inventoryAlertRows[0].itemName)}`
          : "安全库存正常",
        value: formatCountMetric(inventoryAlertRows.length, " 项"),
        extra: "仓库",
        tone: inventoryAlertRows.length > 0 ? "warning" : "normal",
      },
      {
        title: "证件到期提醒",
        subtitle: complianceWatch[0]?.title
          ? `${complianceWatch[0].title} 要先处理`
          : "近期没有证件到期压力",
        value: formatCountMetric(complianceWatch.length, " 项"),
        extra: "合规",
        tone: complianceWatch.some(row => row.tone === "danger")
          ? "danger"
          : complianceWatch.length > 0
            ? "warning"
            : "normal",
      },
    ],
  };
}

// ==================== 银行账户 CRUD ====================

export async function getBankAccounts(params?: {
  status?: string;
  companyId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  await ensureBankAccountsAddressColumn(db);
  const conditions = [];
  if (params?.companyId) {
    conditions.push(eq((bankAccounts as any).companyId, params.companyId));
  }
  if (params?.status) {
    conditions.push(eq(bankAccounts.status, params.status as any));
  }
  let query = db.select().from(bankAccounts);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query.orderBy(desc(bankAccounts.createdAt));
}

export async function getBankAccountById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureCollaborationDataModel(db);
  await ensureBankAccountsAddressColumn(db);
  const conditions = [eq(bankAccounts.id, id)];
  if (companyId) {
    conditions.push(eq((bankAccounts as any).companyId, companyId));
  }
  const result = await db
    .select()
    .from(bankAccounts)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function createBankAccount(data: InsertBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  await ensureBankAccountsAddressColumn(db);
  const mainCompanyId = await getMainCompanyId(db);
  const result = await db.insert(bankAccounts).values({
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  });
  return result[0].insertId;
}

export async function updateBankAccount(
  id: number,
  data: Partial<InsertBankAccount>,
  companyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  await ensureBankAccountsAddressColumn(db);
  const conditions = [eq(bankAccounts.id, id)];
  if (companyId) {
    conditions.push(eq((bankAccounts as any).companyId, companyId));
  }
  await db.update(bankAccounts).set(data).where(and(...conditions));
}

export async function deleteBankAccount(
  id: number,
  companyId?: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const currentRow = await getBankAccountById(id, companyId);
  if (!currentRow) return;
  await deleteSingleWithRecycle(db, {
    table: bankAccounts,
    idColumn: bankAccounts.id,
    id,
    entityType: "资金账户",
    sourceTable: "bank_accounts",
    deletedBy,
  });
}

// ==================== 汇率 CRUD ====================

export async function getExchangeRates(params?: {
  fromCurrency?: string;
  companyId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const conditions = [];
  if (params?.companyId) {
    conditions.push(eq((exchangeRates as any).companyId, params.companyId));
  }
  if (params?.fromCurrency) {
    conditions.push(eq(exchangeRates.fromCurrency, params.fromCurrency));
  }
  let query = db.select().from(exchangeRates);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query
    .orderBy(
      desc(exchangeRates.effectiveDate),
      desc(exchangeRates.createdAt),
      desc(exchangeRates.id)
    )
    .limit(resolveEntityListLimit(params?.limit));
}

export async function createExchangeRate(data: InsertExchangeRate) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const result = await db.insert(exchangeRates).values({
    ...data,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  });
  return result[0].insertId;
}

export async function updateExchangeRate(
  id: number,
  data: Partial<InsertExchangeRate>,
  companyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const conditions = [eq(exchangeRates.id, id)];
  if (companyId) {
    conditions.push(eq((exchangeRates as any).companyId, companyId));
  }
  await db.update(exchangeRates).set(data).where(and(...conditions));
}

export async function deleteExchangeRate(
  id: number,
  companyId?: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const conditions = [eq(exchangeRates.id, id)];
  if (companyId) {
    conditions.push(eq((exchangeRates as any).companyId, companyId));
  }
  const [currentRow] = await db
    .select({ id: exchangeRates.id })
    .from(exchangeRates)
    .where(and(...conditions))
    .limit(1);
  if (!currentRow) return;
  await deleteSingleWithRecycle(db, {
    table: exchangeRates,
    idColumn: exchangeRates.id,
    id,
    entityType: "汇率",
    sourceTable: "exchange_rates",
    deletedBy,
  });
}

// ==================== 付款条件 CRUD ====================

export async function getPaymentTerms(params?: {
  type?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(paymentTerms);
  const conditions = [];
  if (params?.type) conditions.push(eq(paymentTerms.type, params.type as any));
  if (params?.isActive !== undefined)
    conditions.push(eq(paymentTerms.isActive, params.isActive));
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(paymentTerms.name);
}

export async function createPaymentTerm(data: InsertPaymentTerm) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(paymentTerms).values(data);
  return result[0].insertId;
}

export async function updatePaymentTerm(
  id: number,
  data: Partial<InsertPaymentTerm>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(paymentTerms).set(data).where(eq(paymentTerms.id, id));
}

export async function deletePaymentTerm(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: paymentTerms,
    idColumn: paymentTerms.id,
    id,
    entityType: "付款条件",
    sourceTable: "payment_terms",
    deletedBy,
  });
}

// ==================== 物料申请 CRUD ====================

export async function getMaterialRequests(params?: {
  search?: string;
  status?: string;
  department?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search)
    conditions.push(like(materialRequests.requestNo, `%${params.search}%`));
  if (params?.status)
    conditions.push(eq(materialRequests.status, params.status as any));
  if (params?.department)
    conditions.push(eq(materialRequests.department, params.department));
  let query = db.select().from(materialRequests);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(materialRequests.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getMaterialRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(materialRequests)
    .where(eq(materialRequests.id, id))
    .limit(1);
  return result[0];
}

export async function getMaterialRequestItems(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(materialRequestItems)
    .where(eq(materialRequestItems.requestId, requestId));
}

export async function createMaterialRequest(
  data: InsertMaterialRequest,
  items: InsertMaterialRequestItem[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const requestNo = await resolveManagedCodeRuleNo(
    "物料请购",
    (data as any).requestNo
  );
  const result = await db.insert(materialRequests).values({
    ...data,
    requestNo,
  });
  const requestId = result[0].insertId;
  if (items.length > 0) {
    await db
      .insert(materialRequestItems)
      .values(items.map(i => ({ ...i, requestId })));
  }
  return requestId;
}

export async function updateMaterialRequest(
  id: number,
  data: Partial<InsertMaterialRequest>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db
    .update(materialRequests)
    .set(data)
    .where(eq(materialRequests.id, id));
}

export async function deleteMaterialRequest(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteBundleWithRecycle(db, {
    rootTable: materialRequests,
    rootIdColumn: materialRequests.id,
    rootId: id,
    entityType: "物料申请",
    rootTableName: "material_requests",
    deletedBy,
    children: [
      {
        table: materialRequestItems,
        tableName: "material_request_items",
        foreignKeyColumn: materialRequestItems.requestId,
      },
    ],
  });
}

// ==================== 费用报销 CRUD ====================

export async function getExpenseReimbursements(params?: {
  search?: string;
  status?: string;
  department?: string;
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const conditions = [];
  if (params?.companyId) {
    conditions.push(
      eq((expenseReimbursements as any).companyId, params.companyId)
    );
  }
  if (params?.search) {
    conditions.push(
      or(
        like(expenseReimbursements.reimbursementNo, `%${params.search}%`),
        like(expenseReimbursements.description, `%${params.search}%`),
        like(users.name, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(expenseReimbursements.status, params.status as any));
  if (params?.department)
    conditions.push(eq(expenseReimbursements.department, params.department));
  let query = db
    .select({
      ...expenseReimbursements,
      applicantName: users.name,
      applicantDepartment: users.department,
      bankAccountName: bankAccounts.accountName,
    })
    .from(expenseReimbursements)
    .leftJoin(users, eq(expenseReimbursements.applicantId, users.id))
    .leftJoin(
      bankAccounts,
      eq(expenseReimbursements.bankAccountId, bankAccounts.id)
    );
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(expenseReimbursements.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getExpenseReimbursementById(
  id: number,
  companyId?: number
) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureCollaborationDataModel(db);
  const conditions = [eq(expenseReimbursements.id, id)];
  if (companyId) {
    conditions.push(eq((expenseReimbursements as any).companyId, companyId));
  }
  const result = await db
    .select({
      ...expenseReimbursements,
      applicantName: users.name,
      applicantDepartment: users.department,
      bankAccountName: bankAccounts.accountName,
    })
    .from(expenseReimbursements)
    .leftJoin(users, eq(expenseReimbursements.applicantId, users.id))
    .leftJoin(
      bankAccounts,
      eq(expenseReimbursements.bankAccountId, bankAccounts.id)
    )
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function createExpenseReimbursement(
  data: InsertExpenseReimbursement
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const reimbursementNo = await resolveManagedCodeRuleNo(
    "报销单",
    (data as any).reimbursementNo
  );
  const result = await db.insert(expenseReimbursements).values({
    ...data,
    reimbursementNo,
    companyId: normalizeCompanyId((data as any).companyId, mainCompanyId),
  });
  return result[0].insertId;
}

export async function updateExpenseReimbursement(
  id: number,
  data: Partial<InsertExpenseReimbursement>,
  companyId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const conditions = [eq(expenseReimbursements.id, id)];
  if (companyId) {
    conditions.push(eq((expenseReimbursements as any).companyId, companyId));
  }
  await db
    .update(expenseReimbursements)
    .set(data)
    .where(and(...conditions));
}

export async function deleteExpenseReimbursement(
  id: number,
  companyId?: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const currentRow = await getExpenseReimbursementById(id, companyId);
  if (!currentRow) return;
  await deleteSingleWithRecycle(db, {
    table: expenseReimbursements,
    idColumn: expenseReimbursements.id,
    id,
    entityType: "费用报销",
    sourceTable: "expense_reimbursements",
    deletedBy,
  });
}

// ==================== 收付款记录 CRUD ====================

function resolveBackfillPaymentDate(...values: unknown[]) {
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string") {
      const text = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return new Date(`${text}T12:00:00`) as any;
      }
    }
    const date = new Date(value as any);
    if (!Number.isNaN(date.getTime())) {
      return date as any;
    }
  }
  return undefined;
}

async function ensurePaymentRecordForReceivable(
  receivableRow: {
    id: number;
    companyId: number;
    invoiceNo: string | null;
    salesOrderId: number | null;
    customerId: number | null;
    amount: unknown;
    paidAmount: unknown;
    currency: string | null;
    amountBase: unknown;
    exchangeRate: unknown;
    bankAccountId: number | null;
    paymentMethod: string | null;
    receiptDate: unknown;
    createdAt: unknown;
    updatedAt: unknown;
    createdBy: number | null;
    remark: string | null;
  },
  dbArg?: Awaited<ReturnType<typeof getDb>>
) {
  const db = dbArg || (await getDb());
  if (!db) throw new Error("数据库连接不可用");

  const paidAmount = roundFinanceAmount(receivableRow.paidAmount);
  if (!(paidAmount > 0)) return null;

  const companyId = Number(receivableRow.companyId || 0) || 3;
  const invoiceNo = String(receivableRow.invoiceNo || "").trim();
  const salesOrderId = Number(receivableRow.salesOrderId || 0);

  const conditions = [
    eq(paymentRecords.type, "receipt"),
    eq(paymentRecords.relatedType, "sales_order"),
    eq((paymentRecords as any).companyId, companyId),
  ];
  if (invoiceNo) {
    conditions.push(eq(paymentRecords.relatedNo, invoiceNo));
  } else if (salesOrderId > 0) {
    conditions.push(eq(paymentRecords.relatedId, salesOrderId));
  } else {
    return null;
  }

  const existingRows = await db
    .select({ amount: paymentRecords.amount })
    .from(paymentRecords)
    .where(and(...conditions));
  const existingAmount = existingRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.amount),
    0
  );
  if (existingAmount >= paidAmount - 0.0001) return null;

  let bankAccountId = Number(receivableRow.bankAccountId || 0);
  if (!(bankAccountId > 0) && salesOrderId > 0) {
    const [order] = await db
      .select({ receiptAccountId: salesOrders.receiptAccountId })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, salesOrderId),
          eq((salesOrders as any).companyId, companyId)
        )
      )
      .limit(1);
    bankAccountId = Number(order?.receiptAccountId || 0);
  }
  if (!(bankAccountId > 0)) return null;

  const paymentDate = resolveBackfillPaymentDate(
    receivableRow.receiptDate,
    receivableRow.updatedAt,
    receivableRow.createdAt
  );
  if (!paymentDate) return null;

  const deltaAmount = roundFinanceAmount(paidAmount - existingAmount);
  const sourceAmount = roundFinanceAmount(receivableRow.amount);
  const sourceBaseAmount = roundFinanceAmount(receivableRow.amountBase);
  const ratio =
    sourceAmount > 0 && sourceBaseAmount > 0 ? sourceBaseAmount / sourceAmount : 1;
  const currency = String(receivableRow.currency || "CNY").toUpperCase();
  const amountBase =
    currency === "CNY"
      ? deltaAmount
      : roundFinanceAmount(deltaAmount * (ratio || 1));
  const recordNo = await allocateManagedCodeRuleNo("付款/收款记录");
  const remark = invoiceNo
    ? `系统补建收款流水（${invoiceNo}）`
    : "系统补建收款流水";

  const result = await db.insert(paymentRecords).values({
    companyId,
    recordNo,
    type: "receipt",
    relatedType: "sales_order",
    relatedId: salesOrderId > 0 ? salesOrderId : undefined,
    relatedNo: invoiceNo || undefined,
    customerId: Number(receivableRow.customerId || 0) || undefined,
    amount: toRoundedString(deltaAmount, 2),
    currency,
    amountBase: toRoundedString(amountBase, 2),
    exchangeRate: String(receivableRow.exchangeRate || ratio || 1),
    bankAccountId,
    paymentDate,
    paymentMethod: String(receivableRow.paymentMethod || "银行转账"),
    remark,
    operatorId: Number(receivableRow.createdBy || 0) || undefined,
  });

  return Number(result[0]?.insertId || 0) || null;
}

function buildPaymentRelationKeys(
  relatedType: unknown,
  relatedId: unknown,
  relatedNo: unknown
) {
  const type = String(relatedType || "").trim();
  const keys: string[] = [];
  const id = Number(relatedId || 0);
  const no = String(relatedNo || "").trim();
  if (type && Number.isFinite(id) && id > 0) {
    keys.push(`${type}:id:${id}`);
  }
  if (type && no) {
    keys.push(`${type}:no:${no}`);
  }
  return keys;
}

function computePaidBaseAmount(row: {
  amount?: unknown;
  paidAmount?: unknown;
  amountBase?: unknown;
  currency?: unknown;
  exchangeRate?: unknown;
}) {
  const paidAmount = roundFinanceAmount(row.paidAmount);
  if (!(paidAmount > 0)) return 0;
  const currency = String(row.currency || "CNY").toUpperCase();
  if (currency === "CNY") return paidAmount;
  const totalAmount = roundFinanceAmount(row.amount);
  const totalBaseAmount = roundFinanceAmount(row.amountBase);
  if (totalAmount > 0 && totalBaseAmount > 0) {
    return roundFinanceAmount((paidAmount * totalBaseAmount) / totalAmount);
  }
  const exchangeRate = roundFinanceAmount(row.exchangeRate);
  if (exchangeRate > 0) {
    return roundFinanceAmount(paidAmount * exchangeRate);
  }
  return paidAmount;
}

async function buildSyntheticPaymentRecords(
  companyId: number,
  existingRows: any[],
  dbArg?: Awaited<ReturnType<typeof getDb>>
) {
  const db = dbArg || (await getDb());
  if (!db) throw new Error("数据库连接不可用");

  const linkedKeys = new Set<string>();
  for (const row of existingRows) {
    for (const key of buildPaymentRelationKeys(
      row.relatedType,
      row.relatedId,
      row.relatedNo
    )) {
      linkedKeys.add(key);
    }
  }

  const syntheticRows: any[] = [];

  const receivableRows = await db
    .select({
      id: accountsReceivable.id,
      invoiceNo: accountsReceivable.invoiceNo,
      salesOrderId: accountsReceivable.salesOrderId,
      customerId: accountsReceivable.customerId,
      orderNo: salesOrders.orderNo,
      amount: accountsReceivable.amount,
      paidAmount: accountsReceivable.paidAmount,
      currency: accountsReceivable.currency,
      amountBase: accountsReceivable.amountBase,
      exchangeRate: accountsReceivable.exchangeRate,
      bankAccountId: accountsReceivable.bankAccountId,
      paymentMethod: accountsReceivable.paymentMethod,
      receiptDate: accountsReceivable.receiptDate,
      remark: accountsReceivable.remark,
      createdAt: accountsReceivable.createdAt,
      updatedAt: accountsReceivable.updatedAt,
    })
    .from(accountsReceivable)
    .leftJoin(salesOrders, eq(accountsReceivable.salesOrderId, salesOrders.id))
    .where(
      and(
        eq((accountsReceivable as any).companyId, companyId),
        sql`${accountsReceivable.paidAmount} > 0`
      )
    )
    .limit(5000);

  for (const row of receivableRows) {
    const keys = buildPaymentRelationKeys(
      "sales_order",
      row.salesOrderId,
      row.orderNo || row.invoiceNo
    );
    if (keys.some((key) => linkedKeys.has(key))) continue;
    syntheticRows.push({
      id: -1000000 - Number(row.id || 0),
      recordNo: String(row.invoiceNo || row.orderNo || `AR-${row.id}`),
      type: "receipt",
      relatedType: "sales_order",
      relatedId: Number(row.salesOrderId || 0) || undefined,
      relatedNo: String(row.invoiceNo || row.orderNo || ""),
      customerId: Number(row.customerId || 0) || undefined,
      amount: toRoundedString(row.paidAmount, 2),
      currency: String(row.currency || "CNY").toUpperCase(),
      amountBase: toRoundedString(computePaidBaseAmount(row), 2),
      exchangeRate: String(row.exchangeRate || 1),
      bankAccountId: Number(row.bankAccountId || 0) || undefined,
      paymentDate: row.receiptDate || row.updatedAt || row.createdAt,
      paymentMethod: String(row.paymentMethod || "银行转账"),
      remark: `销售收款（${String(row.invoiceNo || row.orderNo || row.id)})`,
      status: "posted",
      synthetic: true,
      createdAt: row.updatedAt || row.createdAt,
    });
    keys.forEach((key) => linkedKeys.add(key));
  }

  const payableRows = await db
    .select({
      id: accountsPayable.id,
      invoiceNo: accountsPayable.invoiceNo,
      purchaseOrderId: accountsPayable.purchaseOrderId,
      supplierId: accountsPayable.supplierId,
      orderNo: purchaseOrders.orderNo,
      amount: accountsPayable.amount,
      paidAmount: accountsPayable.paidAmount,
      currency: accountsPayable.currency,
      amountBase: accountsPayable.amountBase,
      exchangeRate: accountsPayable.exchangeRate,
      bankAccountId: accountsPayable.bankAccountId,
      paymentMethod: accountsPayable.paymentMethod,
      paymentDate: accountsPayable.paymentDate,
      remark: accountsPayable.remark,
      createdAt: accountsPayable.createdAt,
      updatedAt: accountsPayable.updatedAt,
    })
    .from(accountsPayable)
    .leftJoin(
      purchaseOrders,
      eq(accountsPayable.purchaseOrderId, purchaseOrders.id)
    )
    .where(
      and(
        eq((accountsPayable as any).companyId, companyId),
        sql`${accountsPayable.paidAmount} > 0`
      )
    )
    .limit(5000);

  for (const row of payableRows) {
    const keys = buildPaymentRelationKeys(
      "purchase_order",
      row.purchaseOrderId,
      row.orderNo || row.invoiceNo
    );
    if (keys.some((key) => linkedKeys.has(key))) continue;
    syntheticRows.push({
      id: -2000000 - Number(row.id || 0),
      recordNo: String(row.invoiceNo || row.orderNo || `AP-${row.id}`),
      type: "payment",
      relatedType: "purchase_order",
      relatedId: Number(row.purchaseOrderId || 0) || undefined,
      relatedNo: String(row.invoiceNo || row.orderNo || ""),
      supplierId: Number(row.supplierId || 0) || undefined,
      amount: toRoundedString(row.paidAmount, 2),
      currency: String(row.currency || "CNY").toUpperCase(),
      amountBase: toRoundedString(computePaidBaseAmount(row), 2),
      exchangeRate: String(row.exchangeRate || 1),
      bankAccountId: Number(row.bankAccountId || 0) || undefined,
      paymentDate: row.paymentDate || row.updatedAt || row.createdAt,
      paymentMethod: String(row.paymentMethod || "银行转账"),
      remark: `采购付款（${String(row.invoiceNo || row.orderNo || row.id)})`,
      status: "posted",
      synthetic: true,
      createdAt: row.updatedAt || row.createdAt,
    });
    keys.forEach((key) => linkedKeys.add(key));
  }

  const expenseRows = await db
    .select({
      id: expenseReimbursements.id,
      reimbursementNo: expenseReimbursements.reimbursementNo,
      totalAmount: expenseReimbursements.totalAmount,
      currency: expenseReimbursements.currency,
      bankAccountId: expenseReimbursements.bankAccountId,
      paidAt: expenseReimbursements.paidAt,
      description: expenseReimbursements.description,
      createdAt: expenseReimbursements.createdAt,
      updatedAt: expenseReimbursements.updatedAt,
    })
    .from(expenseReimbursements)
    .where(
      and(
        eq((expenseReimbursements as any).companyId, companyId),
        eq(expenseReimbursements.status, "paid")
      )
    )
    .limit(5000);

  for (const row of expenseRows) {
    const keys = buildPaymentRelationKeys("expense", row.id, row.reimbursementNo);
    if (keys.some((key) => linkedKeys.has(key))) continue;
    syntheticRows.push({
      id: -3000000 - Number(row.id || 0),
      recordNo: String(row.reimbursementNo || `EXP-${row.id}`),
      type: "payment",
      relatedType: "expense",
      relatedId: Number(row.id || 0) || undefined,
      relatedNo: String(row.reimbursementNo || ""),
      amount: toRoundedString(row.totalAmount, 2),
      currency: String(row.currency || "CNY").toUpperCase(),
      amountBase: toRoundedString(row.totalAmount, 2),
      exchangeRate: "1",
      bankAccountId: Number(row.bankAccountId || 0) || undefined,
      paymentDate: row.paidAt || row.updatedAt || row.createdAt,
      paymentMethod: "报销付款",
      remark:
        String(row.description || "").trim() ||
        `报销付款（${String(row.reimbursementNo || row.id)})`,
      status: "posted",
      synthetic: true,
      createdAt: row.updatedAt || row.createdAt,
    });
    keys.forEach((key) => linkedKeys.add(key));
  }

  return syntheticRows;
}

async function decoratePaymentRecordSummaries(
  rows: any[],
  companyId: number,
  dbArg?: Awaited<ReturnType<typeof getDb>>
) {
  const db = dbArg || (await getDb());
  if (!db || rows.length === 0) return rows;

  const salesOrderIds = Array.from(
    new Set(
      rows
        .filter(
          row =>
            String(row.relatedType || "") === "sales_order" &&
            Number(row.relatedId || 0) > 0
        )
        .map(row => Number(row.relatedId))
    )
  );
  const purchaseOrderIds = Array.from(
    new Set(
      rows
        .filter(
          row =>
            String(row.relatedType || "") === "purchase_order" &&
            Number(row.relatedId || 0) > 0
        )
        .map(row => Number(row.relatedId))
    )
  );
  const expenseIds = Array.from(
    new Set(
      rows
        .filter(
          row =>
            String(row.relatedType || "") === "expense" &&
            Number(row.relatedId || 0) > 0
        )
        .map(row => Number(row.relatedId))
    )
  );
  const salesInvoiceNos = Array.from(
    new Set(
      rows
        .filter(
          row =>
            String(row.relatedType || "") === "sales_order" &&
            !(Number(row.relatedId || 0) > 0) &&
            String(row.relatedNo || "").trim()
        )
        .map(row => String(row.relatedNo || "").trim())
    )
  );

  const salesOrderMeta = new Map<
    number,
    { orderNo: string; customerName: string; paymentCondition: string }
  >();
  if (salesOrderIds.length > 0) {
    const salesRows = await db
      .select({
        id: salesOrders.id,
        orderNo: salesOrders.orderNo,
        customerName: customers.name,
        paymentMethod: salesOrders.paymentMethod,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(
        and(
          eq((salesOrders as any).companyId, companyId),
          inArray(salesOrders.id, salesOrderIds)
        )
      );
    salesRows.forEach((row: any) => {
      salesOrderMeta.set(Number(row.id), {
        orderNo: String(row.orderNo || ""),
        customerName: String(row.customerName || ""),
        paymentCondition:
          normalizePaymentCondition(row.paymentMethod) || "销售收款",
      });
    });
  }

  const salesInvoiceMeta = new Map<
    string,
    { orderNo: string; customerName: string; paymentCondition: string }
  >();
  if (salesInvoiceNos.length > 0) {
    const invoiceRows = await db
      .select({
        invoiceNo: accountsReceivable.invoiceNo,
        orderNo: salesOrders.orderNo,
        customerName: customers.name,
        paymentMethod: salesOrders.paymentMethod,
      })
      .from(accountsReceivable)
      .leftJoin(salesOrders, eq(accountsReceivable.salesOrderId, salesOrders.id))
      .leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
      .where(
        and(
          eq((accountsReceivable as any).companyId, companyId),
          inArray(accountsReceivable.invoiceNo, salesInvoiceNos)
        )
      );
    invoiceRows.forEach((row: any) => {
      salesInvoiceMeta.set(String(row.invoiceNo || ""), {
        orderNo: String(row.orderNo || ""),
        customerName: String(row.customerName || ""),
        paymentCondition:
          normalizePaymentCondition(row.paymentMethod) || "销售收款",
      });
    });
  }

  const purchaseOrderMeta = new Map<
    number,
    { orderNo: string; supplierName: string; paymentCondition: string }
  >();
  if (purchaseOrderIds.length > 0) {
    const purchaseRows = await db
      .select({
        id: purchaseOrders.id,
        orderNo: purchaseOrders.orderNo,
        supplierName: suppliers.name,
        supplierPaymentTerms: suppliers.paymentTerms,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(
        and(
          eq((purchaseOrders as any).companyId, companyId),
          inArray(purchaseOrders.id, purchaseOrderIds)
        )
      );
    purchaseRows.forEach((row: any) => {
      purchaseOrderMeta.set(Number(row.id), {
        orderNo: String(row.orderNo || ""),
        supplierName: String(row.supplierName || ""),
        paymentCondition:
          normalizePaymentCondition(row.supplierPaymentTerms) || "采购付款",
      });
    });
  }

  const expenseMeta = new Map<
    number,
    { reimbursementNo: string; description: string }
  >();
  if (expenseIds.length > 0) {
    const expenseRows = await db
      .select({
        id: expenseReimbursements.id,
        reimbursementNo: expenseReimbursements.reimbursementNo,
        description: expenseReimbursements.description,
      })
      .from(expenseReimbursements)
      .where(
        and(
          eq((expenseReimbursements as any).companyId, companyId),
          inArray(expenseReimbursements.id, expenseIds)
        )
      );
    expenseRows.forEach((row: any) => {
      expenseMeta.set(Number(row.id), {
        reimbursementNo: String(row.reimbursementNo || ""),
        description: String(row.description || ""),
      });
    });
  }

  return rows.map((row: any) => {
    const relatedType = String(row.relatedType || "");
    if (relatedType === "sales_order") {
      const meta =
        salesOrderMeta.get(Number(row.relatedId || 0)) ||
        salesInvoiceMeta.get(String(row.relatedNo || ""));
      if (meta) {
        return {
          ...row,
          summary: `销售单号：${meta.orderNo || String(row.relatedNo || "-")} / 客户名称：${meta.customerName || "-"} / 收款性质：${meta.paymentCondition}`,
        };
      }
      return {
        ...row,
        summary: `销售单号：${String(row.relatedNo || row.recordNo || "-")} / 客户名称：- / 收款性质：销售收款`,
      };
    }
    if (relatedType === "purchase_order") {
      const meta = purchaseOrderMeta.get(Number(row.relatedId || 0));
      if (meta) {
        return {
          ...row,
          summary: `采购单号：${meta.orderNo || String(row.relatedNo || "-")} / 供应商：${meta.supplierName || "-"} / 付款性质：${meta.paymentCondition}`,
        };
      }
      return {
        ...row,
        summary: `采购单号：${String(row.relatedNo || row.recordNo || "-")} / 供应商：- / 付款性质：采购付款`,
      };
    }
    if (relatedType === "expense") {
      const meta = expenseMeta.get(Number(row.relatedId || 0));
      if (meta) {
        return {
          ...row,
          summary: `报销单号：${meta.reimbursementNo || String(row.relatedNo || "-")} / 摘要：${meta.description || "-"} / 付款性质：费用报销`,
        };
      }
      return {
        ...row,
        summary: `报销单号：${String(row.relatedNo || row.recordNo || "-")} / 摘要：- / 付款性质：费用报销`,
      };
    }
    if (String(row.paymentMethod || "").includes("结汇")) {
      return {
        ...row,
        summary: String(row.remark || row.relatedNo || row.recordNo || ""),
      };
    }
    return {
      ...row,
      summary: String(row.remark || row.relatedNo || row.recordNo || ""),
    };
  });
}

type PaymentVoucherEntry = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  summary: string;
};

function isCashPaymentMethod(paymentMethod: unknown) {
  const normalized = String(paymentMethod || "").trim();
  return normalized.includes("现金");
}

function buildSettlementAccountMeta(
  paymentMethod: unknown,
  bankAccount?: {
    accountName?: string | null;
    bankName?: string | null;
  } | null
) {
  if (isCashPaymentMethod(paymentMethod)) {
    return {
      accountCode: "1001",
      accountName: "库存现金",
    };
  }
  const displayName =
    String(bankAccount?.accountName || "").trim() ||
    String(bankAccount?.bankName || "").trim() ||
    "银行存款";
  return {
    accountCode: "1002",
    accountName: `银行存款-${displayName}`,
  };
}

function buildCounterpartyAccountMeta(params: {
  type: unknown;
  relatedType: unknown;
  customerName?: string | null;
  supplierName?: string | null;
}) {
  const type = String(params.type || "");
  const relatedType = String(params.relatedType || "");
  const customerName = String(params.customerName || "").trim() || "客户";
  const supplierName = String(params.supplierName || "").trim() || "供应商";

  if (type === "receipt") {
    if (relatedType === "sales_order") {
      return {
        accountCode: "1122",
        accountName: `应收账款-${customerName}`,
      };
    }
    return {
      accountCode: "2241",
      accountName: "其他应付款",
    };
  }

  if (relatedType === "purchase_order") {
    return {
      accountCode: "2202",
      accountName: `应付账款-${supplierName}`,
    };
  }
  if (relatedType === "expense") {
    return {
      accountCode: "6602",
      accountName: "管理费用-费用报销",
    };
  }
  return {
    accountCode: "2241",
    accountName: "其他应付款",
  };
}

function buildPaymentVoucherEntriesForRow(
  row: any,
  meta: {
    customerName?: string | null;
    supplierName?: string | null;
    bankAccount?: {
      accountName?: string | null;
      bankName?: string | null;
    } | null;
  }
): PaymentVoucherEntry[] {
  if (Array.isArray(row?.entries) && row.entries.length > 0) {
    return row.entries;
  }

  const amount = roundFinanceAmount(
    row?.amountBase ?? row?.amount ?? row?.paidAmount ?? 0
  );
  if (!(amount > 0)) return [];

  const summary =
    String(row?.summary || row?.remark || row?.relatedNo || row?.recordNo || "")
      .trim() || "-";
  const settlementAccount = buildSettlementAccountMeta(
    row?.paymentMethod,
    meta.bankAccount
  );
  const counterpartyAccount = buildCounterpartyAccountMeta({
    type: row?.type,
    relatedType: row?.relatedType,
    customerName: meta.customerName,
    supplierName: meta.supplierName,
  });

  if (String(row?.type || "") === "receipt") {
    return [
      {
        accountCode: settlementAccount.accountCode,
        accountName: settlementAccount.accountName,
        debit: amount,
        credit: 0,
        summary,
      },
      {
        accountCode: counterpartyAccount.accountCode,
        accountName: counterpartyAccount.accountName,
        debit: 0,
        credit: amount,
        summary,
      },
    ];
  }

  return [
    {
      accountCode: counterpartyAccount.accountCode,
      accountName: counterpartyAccount.accountName,
      debit: amount,
      credit: 0,
      summary,
    },
    {
      accountCode: settlementAccount.accountCode,
      accountName: settlementAccount.accountName,
      debit: 0,
      credit: amount,
      summary,
    },
  ];
}

async function decoratePaymentRecordVoucherEntries(
  rows: any[],
  companyId: number,
  dbArg?: Awaited<ReturnType<typeof getDb>>
) {
  const db = dbArg || (await getDb());
  if (!db || rows.length === 0) return rows;

  const customerIds = Array.from(
    new Set(
      rows
        .map((row: any) => Number(row?.customerId || 0))
        .filter((id: number) => id > 0)
    )
  );
  const supplierIds = Array.from(
    new Set(
      rows
        .map((row: any) => Number(row?.supplierId || 0))
        .filter((id: number) => id > 0)
    )
  );
  const bankAccountIds = Array.from(
    new Set(
      rows
        .map((row: any) => Number(row?.bankAccountId || 0))
        .filter((id: number) => id > 0)
    )
  );

  const customerMap = new Map<number, string>();
  if (customerIds.length > 0) {
    const customerRows = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(
        and(
          eq((customers as any).companyId, companyId),
          inArray(customers.id, customerIds)
        )
      );
    customerRows.forEach((row: any) => {
      customerMap.set(Number(row.id), String(row.name || ""));
    });
  }

  const supplierMap = new Map<number, string>();
  if (supplierIds.length > 0) {
    const supplierRows = await db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(
        and(
          eq((suppliers as any).companyId, companyId),
          inArray(suppliers.id, supplierIds)
        )
      );
    supplierRows.forEach((row: any) => {
      supplierMap.set(Number(row.id), String(row.name || ""));
    });
  }

  const bankAccountMap = new Map<
    number,
    { accountName: string | null; bankName: string | null }
  >();
  if (bankAccountIds.length > 0) {
    const bankRows = await db
      .select({
        id: bankAccounts.id,
        accountName: bankAccounts.accountName,
        bankName: bankAccounts.bankName,
      })
      .from(bankAccounts)
      .where(
        and(
          eq((bankAccounts as any).companyId, companyId),
          inArray(bankAccounts.id, bankAccountIds)
        )
      );
    bankRows.forEach((row: any) => {
      bankAccountMap.set(Number(row.id), {
        accountName: row.accountName ?? null,
        bankName: row.bankName ?? null,
      });
    });
  }

  return rows.map((row: any) => ({
    ...row,
    entries: buildPaymentVoucherEntriesForRow(row, {
      customerName: customerMap.get(Number(row?.customerId || 0)),
      supplierName: supplierMap.get(Number(row?.supplierId || 0)),
      bankAccount: bankAccountMap.get(Number(row?.bankAccountId || 0)) || null,
    }),
  }));
}

export async function getPaymentRecords(params?: {
  type?: string;
  relatedType?: string;
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const conditions = [];
  if (params?.type)
    conditions.push(eq(paymentRecords.type, params.type as any));
  if (params?.relatedType)
    conditions.push(eq(paymentRecords.relatedType, params.relatedType as any));
  if (params?.companyId)
    conditions.push(eq((paymentRecords as any).companyId, params.companyId));
  let query = db.select().from(paymentRecords);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const storedRows = await query
    .orderBy(desc(paymentRecords.createdAt))
    .limit(5000);
  if (!params?.companyId) {
    const offset = params?.offset || 0;
    const limit = resolveEntityListLimit(params?.limit);
    return storedRows.slice(offset, offset + limit);
  }
  const syntheticRows = await buildSyntheticPaymentRecords(
    params.companyId,
    storedRows,
    db
  );
  const mergedRows = [...storedRows, ...syntheticRows]
    .filter((row: any) => {
      if (params?.type && String(row.type || "") !== String(params.type)) {
        return false;
      }
      if (
        params?.relatedType &&
        String(row.relatedType || "") !== String(params.relatedType)
      ) {
        return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const bTime = new Date(
        String(b.paymentDate || b.createdAt || "")
      ).getTime();
      const aTime = new Date(
        String(a.paymentDate || a.createdAt || "")
      ).getTime();
      return bTime - aTime;
    });
  const summarizedRows = await decoratePaymentRecordSummaries(
    mergedRows,
    params.companyId,
    db
  );
  const detailedRows = await decoratePaymentRecordVoucherEntries(
    summarizedRows,
    params.companyId,
    db
  );
  const offset = params?.offset || 0;
  const limit = resolveEntityListLimit(params?.limit);
  return detailedRows.slice(offset, offset + limit);
}

export async function createPaymentRecord(data: InsertPaymentRecord) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(
    (data as any).companyId,
    mainCompanyId
  );
  if (
    data.type === "receipt" &&
    data.relatedType === "sales_order" &&
    Number(data.relatedId || 0) > 0
  ) {
    const salesOrderId = Number(data.relatedId);
    const [order] = await db
      .select({ totalAmount: salesOrders.totalAmount })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, salesOrderId),
          eq((salesOrders as any).companyId, scopedCompanyId)
        )
      )
      .limit(1);
    if (order) {
      const existingRows = await db
        .select({ amount: paymentRecords.amount })
        .from(paymentRecords)
        .where(
          and(
            eq(paymentRecords.type, "receipt"),
            eq(paymentRecords.relatedType, "sales_order"),
            eq(paymentRecords.relatedId, salesOrderId),
            eq((paymentRecords as any).companyId, scopedCompanyId)
          )
        );
      const existingAmount = existingRows.reduce(
        (sum, row) => sum + roundFinanceAmount(row.amount),
        0
      );
      const nextAmount = existingAmount + roundFinanceAmount(data.amount);
      const orderAmount = roundFinanceAmount(order.totalAmount);
      if (orderAmount > 0 && nextAmount > orderAmount + 0.0001) {
        throw new Error(
          `收款金额超过销售订单总额，最多还可登记 ${toDecimalString(Math.max(0, orderAmount - existingAmount))}`
        );
      }
    }
  }
  const recordNo = String(data.recordNo || "").trim()
    ? String(data.recordNo).trim()
    : await allocateManagedCodeRuleNo("付款/收款记录");
  const result = await db.insert(paymentRecords).values({
    ...data,
    recordNo,
    companyId: scopedCompanyId,
  });
  const paymentRecordId = Number(result[0]?.insertId || 0);
  const actorSnapshot = await getOperationActorSnapshot(db, data.operatorId);
  const operationMeta = getPaymentOperationLogMeta(data);
  await createOperationLog({
    module: "finance",
    action: "status_change",
    targetType: operationMeta.targetType,
    targetId: String(paymentRecordId),
    targetName: operationMeta.targetName,
    description: operationMeta.description,
    operatorId: Number(data.operatorId || 0) || undefined,
    operatorName: actorSnapshot?.name || "系统",
    operatorRole: actorSnapshot?.role,
    operatorDepartment: actorSnapshot?.department,
    result: "success",
  });
  if (
    data.type === "receipt" &&
    data.relatedType === "sales_order" &&
    Number(data.relatedId || 0) > 0
  ) {
    const salesOrderId = Number(data.relatedId);
    await syncSalesOrderFinancialProgress(salesOrderId, db);
    await maybeAutoGenerateProductionPlansAfterReceipt(
      salesOrderId,
      Number(data.operatorId || 0) || undefined,
      db
    );
  } else if (
    data.relatedType === "sales_order" &&
    Number(data.relatedId || 0) > 0
  ) {
    await syncSalesOrderFinancialProgress(Number(data.relatedId), db);
  }
  if (
    data.relatedType === "purchase_order" &&
    Number(data.relatedId || 0) > 0
  ) {
    await syncPurchaseOrderFinancialProgress(Number(data.relatedId), db);
  }
  return paymentRecordId;
}

export async function deletePaymentRecord(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [currentRow] = await db
    .select({
      relatedType: paymentRecords.relatedType,
      relatedId: paymentRecords.relatedId,
    })
    .from(paymentRecords)
    .where(eq(paymentRecords.id, id))
    .limit(1);
  await deleteSingleWithRecycle(db, {
    table: paymentRecords,
    idColumn: paymentRecords.id,
    id,
    entityType: "收付款记录",
    sourceTable: "payment_records",
    deletedBy,
  });
  if (
    String(currentRow?.relatedType || "") === "sales_order" &&
    Number(currentRow?.relatedId || 0) > 0
  ) {
    await syncSalesOrderFinancialProgress(Number(currentRow?.relatedId), db);
  }
  if (
    String(currentRow?.relatedType || "") === "purchase_order" &&
    Number(currentRow?.relatedId || 0) > 0
  ) {
    await syncPurchaseOrderFinancialProgress(Number(currentRow?.relatedId), db);
  }
}

// ==================== 报关管理 CRUD ====================

export async function getCustomsDeclarations(params?: {
  search?: string;
  status?: string;
  salesPersonId?: number;
  salesPersonIds?: number[];
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(customsDeclarations.declarationNo, `%${params.search}%`),
        like(customsDeclarations.productName, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(customsDeclarations.status, params.status as any));
  if (params?.salesPersonId) {
    conditions.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  } else if (params?.salesPersonIds?.length) {
    conditions.push(inArray(salesOrders.salesPersonId, params.salesPersonIds));
  }
  if (params?.companyId) {
    conditions.push(
      eq((customsDeclarations as any).companyId, params.companyId)
    );
  }
  let query = db
    .select({
      id: customsDeclarations.id,
      declarationNo: customsDeclarations.declarationNo,
      salesOrderId: customsDeclarations.salesOrderId,
      salesOrderNo: salesOrders.orderNo,
      salesPersonName: users.name,
      customerId: customsDeclarations.customerId,
      customerName: customers.name,
      productName: customsDeclarations.productName,
      quantity: customsDeclarations.quantity,
      unit: customsDeclarations.unit,
      currency: customsDeclarations.currency,
      amount: customsDeclarations.amount,
      destination: customsDeclarations.destination,
      portOfLoading: customsDeclarations.portOfLoading,
      portOfDischarge: customsDeclarations.portOfDischarge,
      shippingMethod: customsDeclarations.shippingMethod,
      hsCode: customsDeclarations.hsCode,
      status: customsDeclarations.status,
      declarationDate: customsDeclarations.declarationDate,
      clearanceDate: customsDeclarations.clearanceDate,
      shippingDate: customsDeclarations.shippingDate,
      trackingNo: customsDeclarations.trackingNo,
      remark: customsDeclarations.remark,
      createdBy: customsDeclarations.createdBy,
      createdAt: customsDeclarations.createdAt,
      updatedAt: customsDeclarations.updatedAt,
    })
    .from(customsDeclarations)
    .leftJoin(salesOrders, eq(customsDeclarations.salesOrderId, salesOrders.id))
    .leftJoin(customers, eq(customsDeclarations.customerId, customers.id))
    .leftJoin(users, eq(salesOrders.salesPersonId, users.id));
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(customsDeclarations.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getCustomsDeclarationById(
  id: number,
  companyId?: number
) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureCollaborationDataModel(db);
  const conditions = [eq(customsDeclarations.id, id)];
  if (companyId) {
    conditions.push(eq((customsDeclarations as any).companyId, companyId));
  }
  const result = await db
    .select()
    .from(customsDeclarations)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function createCustomsDeclaration(data: InsertCustomsDeclaration) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const declarationNo = await resolveManagedCodeRuleNo(
    "报关单",
    (data as any).declarationNo
  );
  const scopedCompanyId = normalizeCompanyId(
    (data as any).companyId,
    mainCompanyId
  );
  const result = await db.insert(customsDeclarations).values({
    ...data,
    declarationNo,
    companyId: scopedCompanyId,
  });
  return result[0].insertId;
}

export async function updateCustomsDeclaration(
  id: number,
  data: Partial<InsertCustomsDeclaration>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db
    .update(customsDeclarations)
    .set(data)
    .where(eq(customsDeclarations.id, id));
}

export async function deleteCustomsDeclaration(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: customsDeclarations,
    idColumn: customsDeclarations.id,
    id,
    entityType: "报关记录",
    sourceTable: "customs_declarations",
    deletedBy,
  });
}

// ==================== HS 编码库 CRUD ====================

export async function getHsCodeLibrary(params?: {
  search?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureHsCodeLibraryTable(db);

  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(hsCodeLibrary.code, `%${params.search}%`),
        like(hsCodeLibrary.productName, `%${params.search}%`),
        like(hsCodeLibrary.declarationElements, `%${params.search}%`)
      )
    );
  }
  if (params?.status) {
    conditions.push(eq(hsCodeLibrary.status, params.status as any));
  }
  if (params?.category) {
    conditions.push(eq(hsCodeLibrary.category, params.category));
  }

  let query = db.select().from(hsCodeLibrary);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return await query
    .orderBy(asc(hsCodeLibrary.code))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getHsCodeLibraryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureHsCodeLibraryTable(db);

  const result = await db
    .select()
    .from(hsCodeLibrary)
    .where(eq(hsCodeLibrary.id, id))
    .limit(1);
  return result[0];
}

export async function getHsCodeLibraryByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureHsCodeLibraryTable(db);

  const normalizedCode = String(code ?? "").trim();
  if (!normalizedCode) return undefined;

  const result = await db
    .select()
    .from(hsCodeLibrary)
    .where(eq(hsCodeLibrary.code, normalizedCode))
    .limit(1);
  return result[0];
}

export async function createHsCodeLibraryEntry(data: InsertHsCodeLibrary) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureHsCodeLibraryTable(db);

  const result = await db.insert(hsCodeLibrary).values(data);
  return result[0].insertId;
}

export async function updateHsCodeLibraryEntry(
  id: number,
  data: Partial<InsertHsCodeLibrary>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureHsCodeLibraryTable(db);

  await db.update(hsCodeLibrary).set(data).where(eq(hsCodeLibrary.id, id));
}

export async function deleteHsCodeLibraryEntry(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureHsCodeLibraryTable(db);

  await deleteSingleWithRecycle(db, {
    table: hsCodeLibrary,
    idColumn: hsCodeLibrary.id,
    id,
    entityType: "HS编码",
    sourceTable: "hs_code_library",
    deletedBy,
  });
}

// ==================== 部门管理 CRUD ====================

export async function getDepartments(params?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(departments);
  if (params?.status)
    query = query.where(
      eq(departments.status, params.status as any)
    ) as typeof query;
  return await query.orderBy(asc(departments.sortOrder));
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  return result[0];
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(departments).values(data);
  return result[0].insertId;
}

export async function updateDepartment(
  id: number,
  data: Partial<InsertDepartment>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(departments).set(data).where(eq(departments.id, id));
}

export async function deleteDepartment(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: departments,
    idColumn: departments.id,
    id,
    entityType: "部门",
    sourceTable: "departments",
    deletedBy,
  });
}

// ==================== 编码规则 CRUD ====================

const SYSTEM_CODE_RULE_SEEDS: InsertCodeRule[] = [
  {
    module: "客户管理",
    prefix: "KH",
    dateFormat: "",
    seqLength: 5,
    currentSeq: 0,
    example: "KH-00001",
    description: "客户编码",
  },
  {
    module: "销售订单",
    prefix: "S",
    dateFormat: "YYYYMMDD",
    seqLength: 2,
    currentSeq: 0,
    example: "S20260316-01",
    description: "销售订单编码",
  },
  {
    module: "采购订单",
    prefix: "PO",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "PO-2026-0001",
    description: "采购订单编码",
  },
  {
    module: "生产订单",
    prefix: "MO",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "MO-2026-0001",
    description: "生产订单编码",
  },
  {
    module: "物料请购",
    prefix: "MR",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "MR-2026-0001",
    description: "物料申请编码",
  },
  {
    module: "入库单",
    prefix: "IN",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "IN-2026-0001",
    description: "仓库入库编码",
  },
  {
    module: "出库单",
    prefix: "OUT",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "OUT-2026-0001",
    description: "仓库出库编码",
  },
  {
    module: "应收单",
    prefix: "AR",
    dateFormat: "YYYYMMDD",
    seqLength: 2,
    currentSeq: 0,
    example: "AR-20260316-01",
    description: "应收单编码",
  },
  {
    module: "付款/收款记录",
    prefix: "PR",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "PR-2026-0001",
    description: "资金流水编码",
  },
  {
    module: "报销单",
    prefix: "EXP",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "EXP-2026-0001",
    description: "费用报销编码",
  },
  {
    module: "报关单",
    prefix: "CD",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "CD-2026-0001",
    description: "报关管理编码",
  },
  {
    module: "生产计划",
    prefix: "PP",
    dateFormat: "YYYYMMDD",
    seqLength: 4,
    currentSeq: 0,
    example: "PP-20260309-0001",
    description: "生产计划编码",
  },
  {
    module: "领料单",
    prefix: "MRO",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "MRO-2026-0001",
    description: "领料申请编码",
  },
  {
    module: "生产记录",
    prefix: "PRD",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "PRD-2026-0001",
    description: "批记录编码",
  },
  {
    module: "流转卡",
    prefix: "RC",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "RC-2026-0001",
    description: "生产流转卡编码",
  },
  {
    module: "灭菌单",
    prefix: "ST",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "ST-2026-0001",
    description: "灭菌单编码",
  },
  {
    module: "生产入库申请",
    prefix: "PWE",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "PWE-2026-0001",
    description: "生产入库申请编码",
  },
  {
    module: "盘点单",
    prefix: "STK",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "STK-2026-0001",
    description: "库存盘点编码",
  },
  {
    module: "留样单",
    prefix: "SP",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "SP-2026-0001",
    description: "留样管理编码",
  },
  {
    module: "实验室记录",
    prefix: "LAB",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "LAB-2026-0001",
    description: "实验室记录编码",
  },
  {
    module: "质量事件",
    prefix: "QI",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "QI-2026-0001",
    description: "质量事件编码",
  },
  {
    module: "培训记录",
    prefix: "TR",
    dateFormat: "YYYY",
    seqLength: 3,
    currentSeq: 0,
    example: "TR-2026-001",
    description: "培训管理编码",
  },
  {
    module: "研发项目",
    prefix: "RD",
    dateFormat: "YYYY",
    seqLength: 3,
    currentSeq: 0,
    example: "RD-2026-001",
    description: "研发项目编码",
  },
  {
    module: "加班申请",
    prefix: "OT",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "OT-2026-0001",
    description: "加班申请编码",
  },
  {
    module: "请假申请",
    prefix: "LV",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "LV-2026-0001",
    description: "请假申请编码",
  },
  {
    module: "外出申请",
    prefix: "OUTREQ",
    dateFormat: "YYYY",
    seqLength: 4,
    currentSeq: 0,
    example: "OUTREQ-2026-0001",
    description: "外出申请编码",
  },
];

type CodeRuleRuntimeConfig = {
  prefix: string;
  dateFormat: string;
  seqLength: number;
};

type ParsedCodeRuleNo = {
  periodKey: string;
  seq: number;
};

type ManagedCodeRuleSpec = {
  key: string;
  module: string;
  aliases: string[];
  defaultPrefix: string;
  defaultDateFormat: string;
  defaultSeqLength: number;
  description: string;
  table?: any;
  field?: any;
  buildNo?: (
    rule: CodeRuleRuntimeConfig,
    seq: number,
    currentDate: Date
  ) => string;
  parseNo?: (
    value: string,
    rule: CodeRuleRuntimeConfig
  ) => ParsedCodeRuleNo | null;
  scanCurrentSeq?: (
    db: Awaited<ReturnType<typeof getDb>>,
    rule: CodeRuleRuntimeConfig,
    currentDate: Date
  ) => Promise<number>;
};

function normalizeCodeRuleToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/编码$/u, "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();
}

function getCodeRuleDateToken(dateFormat: string, currentDate: Date) {
  const year = String(currentDate.getFullYear());
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  if (dateFormat === "YYYY") return year;
  if (dateFormat === "YYYYMM") return `${year}${month}`;
  if (dateFormat === "YYYYMMDD") return `${year}${month}${day}`;
  return "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toManagedCodeRuleConfig(
  rule: Partial<CodeRule> | Partial<InsertCodeRule> | undefined,
  spec: ManagedCodeRuleSpec
): CodeRuleRuntimeConfig {
  return {
    prefix: String(rule?.prefix || spec.defaultPrefix || "").trim(),
    dateFormat: String(
      rule?.dateFormat === undefined || rule?.dateFormat === null
        ? spec.defaultDateFormat
        : rule.dateFormat
    ).trim(),
    seqLength: Math.max(
      1,
      Number(rule?.seqLength || spec.defaultSeqLength || 4)
    ),
  };
}

function buildGenericCodeRuleNo(
  rule: CodeRuleRuntimeConfig,
  seq: number,
  currentDate: Date
) {
  const dateToken = getCodeRuleDateToken(rule.dateFormat, currentDate);
  const parts = [rule.prefix];
  if (dateToken) parts.push(dateToken);
  parts.push(String(seq).padStart(rule.seqLength, "0"));
  return parts.filter(Boolean).join("-");
}

function parseGenericCodeRuleNo(
  value: string,
  rule: CodeRuleRuntimeConfig
): ParsedCodeRuleNo | null {
  const prefix = escapeRegExp(String(rule.prefix || ""));
  const seqCapture = "(\\d+)$";
  if (!prefix) return null;
  if (!rule.dateFormat) {
    const match = value.match(new RegExp(`^${prefix}-${seqCapture}`));
    if (!match) return null;
    return { periodKey: "", seq: Number(match[1] || 0) };
  }
  const dateDigits =
    rule.dateFormat === "YYYY"
      ? 4
      : rule.dateFormat === "YYYYMM"
        ? 6
        : rule.dateFormat === "YYYYMMDD"
          ? 8
          : 0;
  if (!dateDigits) return null;
  const match = value.match(
    new RegExp(`^${prefix}-(\\d{${dateDigits}})-${seqCapture}`)
  );
  if (!match) return null;
  return {
    periodKey: String(match[1] || ""),
    seq: Number(match[2] || 0),
  };
}

function buildSalesOrderCodeRuleNo(
  rule: CodeRuleRuntimeConfig,
  seq: number,
  currentDate: Date
) {
  const dateToken = getCodeRuleDateToken("YYYYMMDD", currentDate);
  return `${rule.prefix}${dateToken}-${String(seq).padStart(rule.seqLength, "0")}`;
}

function parseSalesOrderCodeRuleNo(
  value: string,
  rule: CodeRuleRuntimeConfig
): ParsedCodeRuleNo | null {
  const prefix = escapeRegExp(String(rule.prefix || "S"));
  const match = value.match(new RegExp(`^${prefix}(\\d{8})-(\\d+)$`));
  if (!match) return null;
  return {
    periodKey: String(match[1] || ""),
    seq: Number(match[2] || 0),
  };
}

function parseReceivableCodeRuleNo(
  value: string,
  rule: CodeRuleRuntimeConfig
): ParsedCodeRuleNo | null {
  const generic = parseGenericCodeRuleNo(value, rule);
  if (generic) return generic;
  const legacy = String(value || "")
    .trim()
    .match(/^AR-(?:S)?(\d{8})-(\d+)$/i);
  if (!legacy) return null;
  return {
    periodKey: String(legacy[1] || ""),
    seq: Number(legacy[2] || 0),
  };
}

function getParsedCodeRuleMaxSeq(
  values: Array<{ value?: string | null }>,
  parser: (value: string, rule: CodeRuleRuntimeConfig) => ParsedCodeRuleNo | null,
  rule: CodeRuleRuntimeConfig,
  currentDate: Date
) {
  const currentPeriod = getCodeRuleDateToken(rule.dateFormat, currentDate) || "";
  let maxSeq = 0;
  for (const row of values) {
    const parsed = parser(String(row?.value || ""), rule);
    if (!parsed) continue;
    if (parsed.periodKey !== currentPeriod) continue;
    if (parsed.seq > maxSeq) maxSeq = parsed.seq;
  }
  return maxSeq;
}

async function scanInventoryDocumentCurrentSeq(
  db: Awaited<ReturnType<typeof getDb>>,
  rule: CodeRuleRuntimeConfig,
  currentDate: Date,
  types: Array<
    | "purchase_in"
    | "production_in"
    | "return_in"
    | "other_in"
    | "production_out"
    | "sales_out"
    | "return_out"
    | "other_out"
  >
) {
  const prefix = String(rule.prefix || "").trim();
  if (!prefix) return 0;
  const rows = await db
    .select({ value: inventoryTransactions.documentNo })
    .from(inventoryTransactions)
    .where(
      and(
        inArray(inventoryTransactions.type, types as any),
        like(inventoryTransactions.documentNo, `${prefix}%`)
      )
    );
  return getParsedCodeRuleMaxSeq(
    rows,
    parseGenericCodeRuleNo,
    rule,
    currentDate
  );
}

const MANAGED_CODE_RULE_SPECS: ManagedCodeRuleSpec[] = [
  {
    key: "customer",
    module: "客户管理",
    aliases: ["客户管理", "customer", "customers"],
    defaultPrefix: "KH",
    defaultDateFormat: "",
    defaultSeqLength: 5,
    description: "客户编码",
    table: customers,
    field: customers.code,
  },
  {
    key: "salesOrder",
    module: "销售订单",
    aliases: ["销售订单", "salesorder", "salesOrder", "销售部"],
    defaultPrefix: "S",
    defaultDateFormat: "YYYYMMDD",
    defaultSeqLength: 2,
    description: "销售订单编码",
    table: salesOrders,
    field: salesOrders.orderNo,
    buildNo: buildSalesOrderCodeRuleNo,
    parseNo: parseSalesOrderCodeRuleNo,
  },
  {
    key: "purchaseOrder",
    module: "采购订单",
    aliases: ["采购订单", "purchaseorder", "purchaseOrder"],
    defaultPrefix: "PO",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "采购订单编码",
    table: purchaseOrders,
    field: purchaseOrders.orderNo,
  },
  {
    key: "productionOrder",
    module: "生产订单",
    aliases: ["生产订单", "productionorder", "productionOrder"],
    defaultPrefix: "MO",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "生产订单编码",
    table: productionOrders,
    field: productionOrders.orderNo,
  },
  {
    key: "materialRequest",
    module: "物料请购",
    aliases: ["物料请购", "materialrequest", "materialRequest"],
    defaultPrefix: "MR",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "物料申请编码",
    table: materialRequests,
    field: materialRequests.requestNo,
  },
  {
    key: "inventoryInbound",
    module: "入库单",
    aliases: ["入库单", "inbound", "warehouseinbound"],
    defaultPrefix: "IN",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "仓库入库编码",
    table: inventoryTransactions,
    field: inventoryTransactions.documentNo,
    scanCurrentSeq: (db, rule, currentDate) =>
      scanInventoryDocumentCurrentSeq(db, rule, currentDate, [
        "purchase_in",
        "production_in",
        "return_in",
        "other_in",
      ]),
  },
  {
    key: "inventoryOutbound",
    module: "出库单",
    aliases: ["出库单", "outbound", "warehouseoutbound"],
    defaultPrefix: "OUT",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "仓库出库编码",
    table: inventoryTransactions,
    field: inventoryTransactions.documentNo,
    scanCurrentSeq: (db, rule, currentDate) =>
      scanInventoryDocumentCurrentSeq(db, rule, currentDate, [
        "production_out",
        "sales_out",
        "return_out",
        "other_out",
      ]),
  },
  {
    key: "accountsReceivable",
    module: "应收单",
    aliases: ["应收单", "accountsreceivable", "receivable"],
    defaultPrefix: "AR",
    defaultDateFormat: "YYYYMMDD",
    defaultSeqLength: 2,
    description: "应收单编码",
    table: accountsReceivable,
    field: accountsReceivable.invoiceNo,
    parseNo: parseReceivableCodeRuleNo,
  },
  {
    key: "paymentRecord",
    module: "付款/收款记录",
    aliases: ["付款/收款记录", "paymentrecord", "paymentRecord"],
    defaultPrefix: "PR",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "资金流水编码",
    table: paymentRecords,
    field: paymentRecords.recordNo,
  },
  {
    key: "reimbursement",
    module: "报销单",
    aliases: ["报销单", "reimbursement"],
    defaultPrefix: "EXP",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "费用报销编码",
    table: expenseReimbursements,
    field: expenseReimbursements.reimbursementNo,
  },
  {
    key: "customsDeclaration",
    module: "报关单",
    aliases: ["报关单", "customs", "customsdeclaration", "报关管理"],
    defaultPrefix: "CD",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "报关管理编码",
    table: customsDeclarations,
    field: customsDeclarations.declarationNo,
  },
  {
    key: "productionPlan",
    module: "生产计划",
    aliases: ["生产计划", "productionplan", "productionPlan"],
    defaultPrefix: "PP",
    defaultDateFormat: "YYYYMMDD",
    defaultSeqLength: 4,
    description: "生产计划编码",
    table: productionPlans,
    field: productionPlans.planNo,
  },
  {
    key: "materialRequisition",
    module: "领料单",
    aliases: ["领料单", "requisition", "materialrequisition"],
    defaultPrefix: "MRO",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "领料申请编码",
    table: materialRequisitionOrders,
    field: materialRequisitionOrders.requisitionNo,
  },
  {
    key: "productionRecord",
    module: "生产记录",
    aliases: ["生产记录", "productionrecord", "productionRecord"],
    defaultPrefix: "PRD",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "批记录编码",
    table: productionRecords,
    field: productionRecords.recordNo,
  },
  {
    key: "routingCard",
    module: "流转卡",
    aliases: ["流转卡", "routingcard", "routingCard"],
    defaultPrefix: "RC",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "生产流转卡编码",
    table: productionRoutingCards,
    field: productionRoutingCards.cardNo,
  },
  {
    key: "sterilization",
    module: "灭菌单",
    aliases: ["灭菌单", "sterilization"],
    defaultPrefix: "ST",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "灭菌单编码",
    table: sterilizationOrders,
    field: sterilizationOrders.orderNo,
  },
  {
    key: "warehouseEntry",
    module: "生产入库申请",
    aliases: ["生产入库申请", "warehouseentry", "warehouseEntry"],
    defaultPrefix: "PWE",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "生产入库申请编码",
    table: productionWarehouseEntries,
    field: productionWarehouseEntries.entryNo,
  },
  {
    key: "lab",
    module: "实验室记录",
    aliases: ["实验室记录", "lab"],
    defaultPrefix: "LAB",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "实验室记录编码",
    table: labRecords,
    field: labRecords.recordNo,
  },
  {
    key: "stocktake",
    module: "盘点单",
    aliases: ["盘点单", "stocktake"],
    defaultPrefix: "STK",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "库存盘点编码",
    table: stocktakes,
    field: stocktakes.stocktakeNo,
  },
  {
    key: "sample",
    module: "留样单",
    aliases: ["留样单", "sample"],
    defaultPrefix: "SP",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "留样管理编码",
    table: samples,
    field: samples.sampleNo,
  },
  {
    key: "qualityIncident",
    module: "质量事件",
    aliases: ["质量事件", "qualityincident"],
    defaultPrefix: "QI",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "质量事件编码",
    table: qualityIncidents,
    field: qualityIncidents.incidentNo,
  },
  {
    key: "training",
    module: "培训记录",
    aliases: ["培训记录", "training", "trainings"],
    defaultPrefix: "TR",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 3,
    description: "培训管理编码",
    table: trainings,
    field: trainings.trainingNo,
  },
  {
    key: "rdProject",
    module: "研发项目",
    aliases: ["研发项目", "rdproject"],
    defaultPrefix: "RD",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 3,
    description: "研发项目编码",
    table: rdProjects,
    field: rdProjects.projectNo,
  },
  {
    key: "overtime",
    module: "加班申请",
    aliases: ["加班申请", "overtime"],
    defaultPrefix: "OT",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "加班申请编码",
    table: overtimeRequests,
    field: overtimeRequests.requestNo,
  },
  {
    key: "leave",
    module: "请假申请",
    aliases: ["请假申请", "leave"],
    defaultPrefix: "LV",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "请假申请编码",
    table: leaveRequests,
    field: leaveRequests.requestNo,
  },
  {
    key: "outing",
    module: "外出申请",
    aliases: ["外出申请", "outing"],
    defaultPrefix: "OUTREQ",
    defaultDateFormat: "YYYY",
    defaultSeqLength: 4,
    description: "外出申请编码",
    table: outingRequests,
    field: outingRequests.requestNo,
  },
];

function findManagedCodeRuleSpec(module: unknown) {
  const token = normalizeCodeRuleToken(module);
  if (!token) return undefined;
  return MANAGED_CODE_RULE_SPECS.find(spec =>
    spec.aliases.some(alias => normalizeCodeRuleToken(alias) === token)
  );
}

function findManagedCodeRuleSpecByPrefix(prefix: unknown) {
  const target = String(prefix || "").trim().toUpperCase();
  if (!target) return undefined;
  return MANAGED_CODE_RULE_SPECS.find(
    spec => String(spec.defaultPrefix || "").toUpperCase() === target
  );
}

function buildManagedCodeRuleExample(
  spec: ManagedCodeRuleSpec,
  rule: CodeRuleRuntimeConfig,
  currentDate: Date
) {
  const builder = spec.buildNo || buildGenericCodeRuleNo;
  return builder(rule, 1, currentDate);
}

async function scanManagedCodeRuleCurrentSeq(
  db: Awaited<ReturnType<typeof getDb>>,
  spec: ManagedCodeRuleSpec,
  rule: CodeRuleRuntimeConfig,
  currentDate: Date
) {
  if (!db || !spec.table || !spec.field) return 0;
  if (spec.scanCurrentSeq) {
    return await spec.scanCurrentSeq(db, rule, currentDate);
  }
  const prefix = String(rule.prefix || spec.defaultPrefix || "").trim();
  if (!prefix) return 0;
  const parser = spec.parseNo || parseGenericCodeRuleNo;
  let rows: Array<{ value?: string | null }> = [];
  try {
    rows = await db
      .select({ value: spec.field })
      .from(spec.table)
      .where(like(spec.field, `${prefix}%`));
  } catch (error: any) {
    const code = String(error?.cause?.code || error?.code || "");
    if (code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR") {
      return 0;
    }
    throw error;
  }
  return getParsedCodeRuleMaxSeq(rows, parser, rule, currentDate);
}

function isManagedCodeRuleChanged(
  existing: CodeRule,
  payload: InsertCodeRule | Partial<InsertCodeRule>
) {
  return (
    String(existing.module || "") !== String(payload.module || "") ||
    String(existing.prefix || "") !== String(payload.prefix || "") ||
    String(existing.dateFormat || "") !== String(payload.dateFormat || "") ||
    Number(existing.seqLength || 0) !== Number(payload.seqLength || 0) ||
    Number(existing.currentSeq || 0) !== Number(payload.currentSeq || 0) ||
    String(existing.example || "") !== String(payload.example || "") ||
    String(existing.description || "") !== String(payload.description || "")
  );
}

async function syncManagedCodeRuleSpec(
  db: Awaited<ReturnType<typeof getDb>>,
  spec: ManagedCodeRuleSpec,
  existingRules?: CodeRule[]
) {
  const now = new Date();
  const rules = existingRules || (await db.select().from(codeRules));
  const candidates = rules.filter(rule => {
    const currentSpec = findManagedCodeRuleSpec(rule.module);
    return currentSpec?.key === spec.key;
  });
  const preferred =
    candidates.find(
      rule =>
        normalizeCodeRuleToken(rule.module) === normalizeCodeRuleToken(spec.module)
    ) ||
    candidates.find(
      rule =>
        String(rule.prefix || "").toUpperCase() ===
        String(spec.defaultPrefix || "").toUpperCase()
    ) ||
    candidates[0];

  const defaultConfig = toManagedCodeRuleConfig(undefined, spec);
  let resolvedConfig = preferred
    ? toManagedCodeRuleConfig(preferred, spec)
    : defaultConfig;

  let resolvedSeq = await scanManagedCodeRuleCurrentSeq(
    db,
    spec,
    resolvedConfig,
    now
  );
  if (preferred) {
    const defaultSeq =
      resolvedConfig.prefix === defaultConfig.prefix &&
      resolvedConfig.dateFormat === defaultConfig.dateFormat &&
      resolvedConfig.seqLength === defaultConfig.seqLength
        ? resolvedSeq
        : await scanManagedCodeRuleCurrentSeq(db, spec, defaultConfig, now);
    if (
      defaultSeq > resolvedSeq ||
      (resolvedSeq <= 0 &&
        (resolvedConfig.prefix !== defaultConfig.prefix ||
          resolvedConfig.dateFormat !== defaultConfig.dateFormat ||
          resolvedConfig.seqLength !== defaultConfig.seqLength)) ||
      normalizeCodeRuleToken(preferred.module) !==
        normalizeCodeRuleToken(spec.module)
    ) {
      resolvedConfig = defaultConfig;
      resolvedSeq = defaultSeq;
    }
  }

  const payload: InsertCodeRule = {
    module: spec.module,
    prefix: resolvedConfig.prefix,
    dateFormat: resolvedConfig.dateFormat || "",
    seqLength: resolvedConfig.seqLength,
    currentSeq: resolvedSeq,
    example: buildManagedCodeRuleExample(spec, resolvedConfig, now),
    description:
      SYSTEM_CODE_RULE_SEEDS.find(
        seed =>
          normalizeCodeRuleToken(seed.module) ===
          normalizeCodeRuleToken(spec.module)
      )?.description || spec.description,
  };

  if (preferred) {
    if (isManagedCodeRuleChanged(preferred, payload)) {
      await db
        .update(codeRules)
        .set(payload)
        .where(eq(codeRules.id, preferred.id));
      return {
        ...preferred,
        ...payload,
      } as CodeRule;
    }
    return {
      ...preferred,
      ...payload,
    } as CodeRule;
  }

  const result = await db.insert(codeRules).values(payload);
  return {
    id: Number(result[0]?.insertId || 0),
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CodeRule;
}

async function syncManagedCodeRules(db: Awaited<ReturnType<typeof getDb>>) {
  let workingRules = await db.select().from(codeRules);
  const managedRows: CodeRule[] = [];
  for (const spec of MANAGED_CODE_RULE_SPECS) {
    const synced = await syncManagedCodeRuleSpec(db, spec, workingRules);
    managedRows.push(synced);
    workingRules = workingRules
      .filter(rule => Number(rule.id) !== Number(synced.id))
      .concat(synced);
  }
  const latestRules = await db.select().from(codeRules);
  const unmanagedRows = latestRules.filter(
    rule => {
      if (findManagedCodeRuleSpec(rule.module)) return false;
      if (findManagedCodeRuleSpec(rule.name)) return false;
      if (findManagedCodeRuleSpec(rule.description)) return false;
      const matchedByPrefix = findManagedCodeRuleSpecByPrefix(rule.prefix);
      if (!matchedByPrefix) return true;
      const mergedText = [rule.module, rule.name, rule.description]
        .map(value => String(value || "").trim())
        .filter(Boolean)
        .join(" ");
      return !/(编码|订单|申请|记录|项目|单号)/.test(mergedText);
    }
  );
  return [...managedRows, ...unmanagedRows].sort(
    (left, right) => Number(left.id || 0) - Number(right.id || 0)
  );
}

async function allocateManagedCodeRuleNo(
  module: string,
  currentDate: Date = new Date()
) {
  const spec = findManagedCodeRuleSpec(module);
  if (!spec) {
    throw new Error(`未找到编码规则：${module}`);
  }
  const db = await getDb();
  if (!db) {
    return buildManagedCodeRuleExample(
      spec,
      toManagedCodeRuleConfig(undefined, spec),
      currentDate
    );
  }
  const syncedRule = await syncManagedCodeRuleSpec(db, spec);
  const nextSeq = Number(syncedRule.currentSeq || 0) + 1;
  const runtimeConfig = toManagedCodeRuleConfig(syncedRule, spec);
  const builder = spec.buildNo || buildGenericCodeRuleNo;
  const nextNo = builder(runtimeConfig, nextSeq, currentDate);
  await db
    .update(codeRules)
    .set({
      currentSeq: nextSeq,
      example: buildManagedCodeRuleExample(spec, runtimeConfig, currentDate),
    })
    .where(eq(codeRules.id, syncedRule.id));
  return nextNo;
}

async function resolveManagedCodeRuleNo(
  module: string,
  currentValue: unknown
): Promise<string> {
  const resolved = String(currentValue || "").trim();
  if (resolved) return resolved;
  return await allocateManagedCodeRuleNo(module);
}

export async function getCodeRules() {
  const db = await getDb();
  if (!db) return [];
  await ensureTrainingNoColumn(db);
  return await syncManagedCodeRules(db);
}

export async function createCodeRule(data: InsertCodeRule) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(codeRules).values(data);
  return result[0].insertId;
}

export async function updateCodeRule(
  id: number,
  data: Partial<InsertCodeRule>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(codeRules).set(data).where(eq(codeRules.id, id));
}

export async function deleteCodeRule(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: codeRules,
    idColumn: codeRules.id,
    id,
    entityType: "编码规则",
    sourceTable: "code_rules",
    deletedBy,
  });
}

// ==================== 公司信息 CRUD ====================

const DEFAULT_COMPANY_INFO: Omit<
  CompanyInfo,
  "id" | "companyId" | "createdAt" | "updatedAt"
> = {
  logoUrl: "",
  companyNameCn: "苏州神韵医疗器械有限公司",
  companyNameEn: "Suzhou Shenyun Medical Device Co., Ltd.",
  addressCn: "",
  addressEn: "",
  website: "",
  email: "",
  contactNameCn: "",
  contactNameEn: "",
  phone: "",
  whatsapp: "",
  languageSettings: "",
};

async function buildDefaultCompanyInfo(
  db: ReturnType<typeof drizzle>,
  companyId: number
): Promise<InsertCompanyInfo> {
  const linkedCompany = await getCompanyRow(db, companyId);
  return {
    companyId,
    ...DEFAULT_COMPANY_INFO,
    companyNameCn: String(
      linkedCompany?.name || DEFAULT_COMPANY_INFO.companyNameCn
    ),
    companyNameEn: String(
      linkedCompany?.name || DEFAULT_COMPANY_INFO.companyNameEn
    ),
    contactNameCn: String(
      linkedCompany?.shortName || DEFAULT_COMPANY_INFO.contactNameCn || ""
    ),
    contactNameEn: String(
      linkedCompany?.shortName || DEFAULT_COMPANY_INFO.contactNameEn || ""
    ),
  } as InsertCompanyInfo;
}

function normalizeCompanyInfoPatch(data: Partial<InsertCompanyInfo>) {
  const pick = (value: unknown) => {
    if (value === undefined) return undefined;
    const text = String(value ?? "").trim();
    return text || null;
  };
  return {
    logoUrl: pick(data.logoUrl),
    companyNameCn: pick(data.companyNameCn),
    companyNameEn: pick(data.companyNameEn),
    addressCn: pick(data.addressCn),
    addressEn: pick(data.addressEn),
    website: pick(data.website),
    email: pick(data.email),
    contactNameCn: pick(data.contactNameCn),
    contactNameEn: pick(data.contactNameEn),
    phone: pick(data.phone),
    whatsapp: pick(data.whatsapp),
    languageSettings: pick((data as any).languageSettings),
  } satisfies Partial<InsertCompanyInfo>;
}

export async function getCompanyInfo(
  companyId?: number | null
): Promise<CompanyInfo> {
  const db = await getDb();
  if (!db) {
    return {
      id: 0,
      companyId: normalizeCompanyId(companyId, MAIN_COMPANY_FALLBACK_ID),
      ...DEFAULT_COMPANY_INFO,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  await ensureCompanyInfoTable(db);
  const resolvedCompanyId = normalizeCompanyId(
    companyId,
    await getMainCompanyId(db)
  );
  const rows = await db
    .select()
    .from(companyInfo)
    .where(eq(companyInfo.companyId, resolvedCompanyId))
    .orderBy(asc(companyInfo.id))
    .limit(1);
  if (rows[0]) return rows[0];

  const mainCompanyId = await getMainCompanyId(db);
  const legacyRows = await db
    .select()
    .from(companyInfo)
    .where(isNull(companyInfo.companyId))
    .orderBy(asc(companyInfo.id))
    .limit(1);
  if (legacyRows[0] && resolvedCompanyId === mainCompanyId) {
    await db
      .update(companyInfo)
      .set({ companyId: resolvedCompanyId })
      .where(eq(companyInfo.id, legacyRows[0].id));
    const migrated = await db
      .select()
      .from(companyInfo)
      .where(eq(companyInfo.id, legacyRows[0].id))
      .limit(1);
    if (migrated[0]) return migrated[0];
  }

  const defaultInfo = await buildDefaultCompanyInfo(db, resolvedCompanyId);
  const insertResult = await db.insert(companyInfo).values(defaultInfo);
  const insertedId = Number(insertResult[0]?.insertId || 0);
  const inserted = insertedId
    ? await db
        .select()
        .from(companyInfo)
        .where(eq(companyInfo.id, insertedId))
        .limit(1)
    : [];
  return (
    inserted[0] || {
      id: insertedId || 0,
      companyId: resolvedCompanyId,
      ...DEFAULT_COMPANY_INFO,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
}

export async function updateCompanyInfo(
  data: Partial<InsertCompanyInfo>,
  companyId?: number | null
): Promise<CompanyInfo> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCompanyInfoTable(db);
  const resolvedCompanyId = normalizeCompanyId(
    companyId,
    await getMainCompanyId(db)
  );
  const patch = normalizeCompanyInfoPatch(data);
  const cleanedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  ) as Partial<InsertCompanyInfo>;
  const current = await getCompanyInfo(resolvedCompanyId);
  if (Object.keys(cleanedPatch).length > 0) {
    await db
      .update(companyInfo)
      .set(cleanedPatch)
      .where(eq(companyInfo.id, current.id));
  }
  return await getCompanyInfo(resolvedCompanyId);
}

export async function getPrintTemplates(): Promise<PrintTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  await ensurePrintTemplatesTable(db);
  await ensureDefaultPrintTemplates(db);
  return await db
    .select()
    .from(printTemplates)
    .orderBy(asc(printTemplates.templateId));
}

export async function savePrintTemplate(
  data: InsertPrintTemplate
): Promise<PrintTemplate> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePrintTemplatesTable(db);

  const existing = await db
    .select()
    .from(printTemplates)
    .where(eq(printTemplates.templateId, data.templateId))
    .limit(1);
  if (existing[0]) {
    await db
      .update(printTemplates)
      .set({
        module: data.module ?? null,
        name: data.name,
        description: data.description ?? null,
        editorType: data.editorType ?? null,
        editorConfig: data.editorConfig ?? null,
        css: data.css,
        html: data.html,
        updatedBy: data.updatedBy ?? null,
      })
      .where(eq(printTemplates.id, existing[0].id));
  } else {
    await db.insert(printTemplates).values(data);
  }

  const rows = await db
    .select()
    .from(printTemplates)
    .where(eq(printTemplates.templateId, data.templateId))
    .limit(1);
  if (!rows[0]) throw new Error("打印模板保存失败");
  return rows[0];
}

export async function deletePrintTemplate(templateId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePrintTemplatesTable(db);
  await db
    .delete(printTemplates)
    .where(eq(printTemplates.templateId, templateId));
}

// ==================== 审批流程模板 CRUD ====================

export async function getWorkflowFormCatalog(params?: {
  module?: string;
  status?: string;
  approvalEnabled?: boolean;
}): Promise<WorkflowFormCatalog[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureWorkflowFormCatalogTable(db);
  const conditions = [];
  if (params?.module)
    conditions.push(eq(workflowFormCatalog.module, params.module));
  if (params?.status)
    conditions.push(eq(workflowFormCatalog.status, params.status as any));
  if (typeof params?.approvalEnabled === "boolean")
    conditions.push(
      eq(workflowFormCatalog.approvalEnabled, params.approvalEnabled)
    );
  let query = db.select().from(workflowFormCatalog);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query.orderBy(
    asc(workflowFormCatalog.module),
    asc(workflowFormCatalog.sortOrder),
    asc(workflowFormCatalog.formType),
    asc(workflowFormCatalog.formName)
  );
}

export async function getWorkflowFormCatalogItem(params: {
  module: string;
  formType: string;
  formName: string;
}): Promise<WorkflowFormCatalog | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await ensureWorkflowFormCatalogTable(db);
  const rows = await db
    .select()
    .from(workflowFormCatalog)
    .where(
      and(
        eq(workflowFormCatalog.module, params.module),
        eq(workflowFormCatalog.formType, params.formType),
        eq(workflowFormCatalog.formName, params.formName)
      )
    )
    .limit(1);
  return rows[0];
}

export async function setWorkflowFormCatalogApprovalEnabled(params: {
  module: string;
  formType: string;
  formName: string;
  approvalEnabled: boolean;
  path?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowFormCatalogTable(db);
  const current = await getWorkflowFormCatalogItem({
    module: params.module,
    formType: params.formType,
    formName: params.formName,
  });
  if (current) {
    await db
      .update(workflowFormCatalog)
      .set({
        approvalEnabled: params.approvalEnabled,
        path: params.path || current.path || null,
      })
      .where(eq(workflowFormCatalog.id, current.id));
    return;
  }

  const sortRows = await db
    .select({
      maxSort: sql<number>`COALESCE(MAX(${workflowFormCatalog.sortOrder}), 0)`,
    })
    .from(workflowFormCatalog)
    .where(eq(workflowFormCatalog.module, params.module));
  const nextSortOrder = Number(sortRows[0]?.maxSort || 0) + 1;
  await db.insert(workflowFormCatalog).values({
    module: params.module,
    formType: params.formType,
    formName: params.formName,
    path: params.path || null,
    sortOrder: nextSortOrder,
    status: "active",
    approvalEnabled: params.approvalEnabled,
  });
}

export async function getWorkflowTemplates(params?: {
  module?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureWorkflowTemplatesTable(db);
  const conditions = [];
  if (params?.module)
    conditions.push(eq(workflowTemplates.module, params.module));
  if (params?.status)
    conditions.push(eq(workflowTemplates.status, params.status as any));
  let query = db.select().from(workflowTemplates);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query.orderBy(
    asc(workflowTemplates.module),
    asc(workflowTemplates.name)
  );
}

export async function getWorkflowTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureWorkflowTemplatesTable(db);
  const result = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, id))
    .limit(1);
  return result[0];
}

export async function createWorkflowTemplate(data: InsertWorkflowTemplate) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowTemplatesTable(db);
  const result = await db.insert(workflowTemplates).values(data);
  return result[0].insertId;
}

export async function updateWorkflowTemplate(
  id: number,
  data: Partial<InsertWorkflowTemplate>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowTemplatesTable(db);
  await db
    .update(workflowTemplates)
    .set(data)
    .where(eq(workflowTemplates.id, id));
}

async function syncApprovedWorkflowSourceStatus(
  db: any,
  params: { sourceTable: string; sourceId: number }
) {
  const sourceTable = String(params.sourceTable || "").trim();
  const sourceId = Number(params.sourceId || 0);
  if (!sourceTable || sourceId <= 0) return;

  if (sourceTable === "purchase_orders") {
    await db
      .update(purchaseOrders)
      .set({
        status: "issued",
        approvedAt: new Date() as any,
      })
      .where(eq(purchaseOrders.id, sourceId));
    return;
  }

  if (sourceTable === "sales_orders") {
    await db
      .update(salesOrders)
      .set({
        status: "approved",
        approvedAt: new Date() as any,
      })
      .where(eq(salesOrders.id, sourceId));
    return;
  }

  if (sourceTable === "expense_reimbursements") {
    await db
      .update(expenseReimbursements)
      .set({
        status: "approved",
        approvedAt: new Date() as any,
      })
      .where(eq(expenseReimbursements.id, sourceId));
    return;
  }

  if (sourceTable === "material_requisition_orders") {
    await db
      .update(materialRequisitionOrders)
      .set({
        status: "approved",
      })
      .where(eq(materialRequisitionOrders.id, sourceId));
    return;
  }

  if (sourceTable === "production_warehouse_entries") {
    await db
      .update(productionWarehouseEntries)
      .set({
        status: "approved",
      })
      .where(eq(productionWarehouseEntries.id, sourceId));
  }
}

export async function syncPendingWorkflowRunsForTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowRuntimeTables(db);

  const template = await getWorkflowTemplateById(templateId);
  if (!template) return { updatedRuns: 0, completedRuns: 0 };

  const stepIds = parseWorkflowUserIds(template.approvalSteps);
  const runs = await db
    .select()
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.templateId, templateId),
        eq(workflowRuns.status, "pending")
      )
    );

  if (runs.length === 0) {
    return { updatedRuns: 0, completedRuns: 0 };
  }

  const userIds = Array.from(
    new Set([
      ...stepIds,
      ...runs
        .map((run: any) => Number(run.applicantId || 0))
        .filter((id: number) => id > 0),
    ])
  );
  const nameMap = await getWorkflowUserNameMap(db, userIds);

  let updatedRuns = 0;
  let completedRuns = 0;

  for (const run of runs) {
    const approveLogs = await db
      .select({
        id: workflowRunLogs.id,
      })
      .from(workflowRunLogs)
      .where(
        and(
          eq(workflowRunLogs.runId, Number(run.id || 0)),
          eq(workflowRunLogs.action, "approve")
        )
      )
      .orderBy(asc(workflowRunLogs.id));

    const approvedStepCount = approveLogs.length;
    const totalSteps = stepIds.length;
    const sharedPatch = {
      flowMode: template.flowMode || "approval",
      initiators: template.initiators || null,
      approvalSteps: template.approvalSteps || null,
      handlers: template.handlers || null,
      ccRecipients: template.ccRecipients || null,
      totalSteps,
    };

    if (totalSteps > 0 && approvedStepCount < totalSteps) {
      const nextApproverId = Number(stepIds[approvedStepCount] || 0) || null;
      await db
        .update(workflowRuns)
        .set({
          ...sharedPatch,
          currentStepIndex: approvedStepCount + 1,
          currentApproverId: nextApproverId,
          currentApproverName: nextApproverId
            ? nameMap.get(nextApproverId) || ""
            : null,
        })
        .where(eq(workflowRuns.id, Number(run.id || 0)));
      updatedRuns += 1;
      continue;
    }

    await appendWorkflowRunLog(db, {
      runId: Number(run.id || 0),
      action: "complete",
      stepIndex: Math.max(totalSteps, approvedStepCount),
      actorId: null,
      actorName: "系统自动同步",
      comment: "流程模板更新后自动完成",
    });

    await db
      .update(workflowRuns)
      .set({
        ...sharedPatch,
        status: "approved",
        currentStepIndex: totalSteps,
        currentApproverId: null,
        currentApproverName: null,
        completedAt: new Date() as any,
      })
      .where(eq(workflowRuns.id, Number(run.id || 0)));

    await syncApprovedWorkflowSourceStatus(db, {
      sourceTable: String(run.sourceTable || ""),
      sourceId: Number(run.sourceId || 0),
    });
    updatedRuns += 1;
    completedRuns += 1;
  }

  return { updatedRuns, completedRuns };
}

export async function deleteWorkflowTemplate(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowTemplatesTable(db);
  await deleteSingleWithRecycle(db, {
    table: workflowTemplates,
    idColumn: workflowTemplates.id,
    id,
    entityType: "审批流程模板",
    sourceTable: "workflow_templates",
    deletedBy,
  });
}

export async function ensurePersonnelExtendedColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || personnelExtendedColumnsReady) return;

  const columnStatements = [
    sql`ALTER TABLE personnel ADD COLUMN healthStatus VARCHAR(50) NULL`,
    sql`ALTER TABLE personnel ADD COLUMN address VARCHAR(255) NULL`,
    sql`ALTER TABLE personnel ADD COLUMN signatureImageUrl TEXT NULL`,
    sql`ALTER TABLE personnel ADD COLUMN signatureImageName VARCHAR(255) NULL`,
  ];

  for (const statement of columnStatements) {
    try {
      await db.execute(statement);
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      const causeMessage = String((error as any)?.cause?.message ?? "");
      const combinedMessage = `${message} ${causeMessage}`;
      if (!/Duplicate column name|already exists|1060/i.test(combinedMessage)) {
        throw error;
      }
    }
  }

  personnelExtendedColumnsReady = true;
}

export async function ensurePersonnelSalaryTables(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || personnelSalaryTablesReady) return;

  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS personnel_salary_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      personnelId INT NOT NULL UNIQUE,
      payrollType ENUM('monthly','daily') NOT NULL DEFAULT 'monthly',
      baseSalary DECIMAL(12,2) NOT NULL DEFAULT 0,
      fullAttendanceDays DECIMAL(8,2) NOT NULL DEFAULT 21.75,
      overtimeHourlyRate DECIMAL(10,2) NOT NULL DEFAULT 0,
      allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
      performanceBonus DECIMAL(12,2) NOT NULL DEFAULT 0,
      socialSecurity DECIMAL(12,2) NOT NULL DEFAULT 0,
      housingFund DECIMAL(12,2) NOT NULL DEFAULT 0,
      otherDeduction DECIMAL(12,2) NOT NULL DEFAULT 0,
      commissionEnabled TINYINT(1) NOT NULL DEFAULT 0,
      commissionRate DECIMAL(5,2) NOT NULL DEFAULT 0,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  );

  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS personnel_payroll_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payrollNo VARCHAR(50) NOT NULL UNIQUE,
      periodMonth VARCHAR(7) NOT NULL,
      personnelId INT NOT NULL,
      employeeNo VARCHAR(50) NULL,
      personnelName VARCHAR(100) NOT NULL,
      departmentName VARCHAR(64) NULL,
      attendanceDays DECIMAL(8,2) NOT NULL DEFAULT 0,
      overtimeHours DECIMAL(8,2) NOT NULL DEFAULT 0,
      leaveHours DECIMAL(8,2) NOT NULL DEFAULT 0,
      absenteeismDays DECIMAL(8,2) NOT NULL DEFAULT 0,
      salesAmount DECIMAL(14,2) NOT NULL DEFAULT 0,
      baseSalary DECIMAL(12,2) NOT NULL DEFAULT 0,
      attendanceSalary DECIMAL(12,2) NOT NULL DEFAULT 0,
      overtimePay DECIMAL(12,2) NOT NULL DEFAULT 0,
      allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
      performanceBonus DECIMAL(12,2) NOT NULL DEFAULT 0,
      commissionRate DECIMAL(5,2) NOT NULL DEFAULT 0,
      commissionAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
      socialSecurity DECIMAL(12,2) NOT NULL DEFAULT 0,
      housingFund DECIMAL(12,2) NOT NULL DEFAULT 0,
      otherDeduction DECIMAL(12,2) NOT NULL DEFAULT 0,
      grossSalary DECIMAL(12,2) NOT NULL DEFAULT 0,
      netSalary DECIMAL(12,2) NOT NULL DEFAULT 0,
      attendanceFileName VARCHAR(255) NULL,
      attendanceSnapshot JSON NULL,
      status ENUM('draft','confirmed','paid') NOT NULL DEFAULT 'draft',
      remark TEXT NULL,
      createdBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_personnel_payroll_period (periodMonth, personnelId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  );

  personnelSalaryTablesReady = true;
}

function resolvePersonnelDepartmentId(
  rawDepartment: string | null | undefined,
  departmentRows: Array<{ id: number; name: string | null }>
) {
  const keyword = String(rawDepartment || "").trim();
  if (!keyword) return null;
  const parts = keyword
    .split(/[,\uFF0C;；/、|]+/)
    .map(item => item.trim())
    .filter(Boolean);
  const candidates = parts.length > 0 ? parts : [keyword];
  for (const candidate of candidates) {
    const matched = departmentRows.find(
      department => String(department.name || "").trim() === candidate
    );
    if (matched) return matched.id;
  }
  return null;
}

async function syncUsersToPersonnel(db: ReturnType<typeof drizzle>) {
  await ensurePersonnelExtendedColumns(db);

  const [userRows, linkedRows, departmentRows] = await Promise.all([
    db
      .select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        department: users.department,
        position: users.position,
      })
      .from(users),
    db
      .select({ userId: personnel.userId })
      .from(personnel)
      .where(isNotNull(personnel.userId)),
    db.select({ id: departments.id, name: departments.name }).from(departments),
  ]);

  const linkedUserIds = new Set(
    linkedRows.map(row => Number(row.userId || 0)).filter(id => id > 0)
  );

  const inserts = userRows
    .filter(user => !linkedUserIds.has(Number(user.id || 0)))
    .map(user => ({
      employeeNo: `USR-${String(user.id).padStart(4, "0")}`,
      name:
        String(user.name || "").trim() ||
        String(user.openId || "")
          .replace(/^user-/, "")
          .trim() ||
        `用户${user.id}`,
      phone: user.phone || null,
      email: user.email || null,
      departmentId: resolvePersonnelDepartmentId(
        user.department,
        departmentRows
      ),
      position: user.position || null,
      status: "active" as const,
      userId: Number(user.id),
      healthStatus: null,
      address: null,
      signatureImageUrl: null,
      signatureImageName: null,
      remark: "系统用户自动补充到人事管理",
    }));

  if (inserts.length > 0) {
    await db.insert(personnel).values(inserts as any);
  }
}

function buildPersonnelUsername(employeeNo: string | null | undefined, id?: number) {
  const normalized = String(employeeNo || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "");
  if (normalized) return normalized;
  if (Number.isFinite(id) && Number(id) > 0) {
    return `person-${id}`;
  }
  return `person-${Date.now()}`;
}

async function syncSinglePersonnelToUser(
  db: ReturnType<typeof drizzle>,
  person: {
    id: number;
    employeeNo: string | null;
    name: string | null;
    phone: string | null;
    departmentId: number | null;
    position: string | null;
    status: string | null;
    userId: number | null;
  }
) {
  const personName = String(person.name || "").trim();
  if (!personName) return;
  const activeStatuses = new Set(["active", "probation"]);
  if (!activeStatuses.has(String(person.status || "active"))) return;

  const [departmentRows] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments),
  ]);
  const departmentName =
    departmentRows.find(row => Number(row.id) === Number(person.departmentId || 0))
      ?.name || null;
  const username = buildPersonnelUsername(person.employeeNo, person.id);
  const openId = `user-${username}`;

  let targetUser =
    Number(person.userId || 0) > 0
      ? (
          await db
            .select({
              id: users.id,
              openId: users.openId,
              name: users.name,
              companyId: users.companyId,
            })
            .from(users)
            .where(eq(users.id, Number(person.userId || 0)))
            .limit(1)
        )[0]
      : undefined;

  if (!targetUser) {
    targetUser = (
      await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          companyId: users.companyId,
        })
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1)
    )[0];
  }

  if (!targetUser) {
    targetUser = (
      await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          companyId: users.companyId,
        })
        .from(users)
        .where(and(eq(users.name, personName), eq(users.companyId, 3)))
        .limit(1)
    )[0];
  }

  if (targetUser) {
    await db
      .update(users)
      .set({
        name: personName,
        phone: person.phone || null,
        department: departmentName,
        position: person.position || null,
        companyId: Number(targetUser.companyId || 0) || 3,
      })
      .where(eq(users.id, Number(targetUser.id)));

    if (Number(person.userId || 0) !== Number(targetUser.id)) {
      await db
        .update(personnel)
        .set({ userId: Number(targetUser.id) })
        .where(eq(personnel.id, Number(person.id)));
    }
    return;
  }

  await db.insert(users).values({
    openId,
    name: personName,
    phone: person.phone || null,
    department: departmentName,
    position: person.position || null,
    role: "user",
    dataScope: "self",
    loginMethod: "password",
    companyId: 3,
  });

  const [createdUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  if (createdUser) {
    await db
      .update(personnel)
      .set({ userId: Number(createdUser.id) })
      .where(eq(personnel.id, Number(person.id)));
  }
}

async function enrichPersonnelRows<T extends Record<string, any>>(
  db: ReturnType<typeof drizzle>,
  rows: T[]
) {
  if (rows.length === 0) return rows;
  const departmentRows = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments);
  const departmentMap = new Map(
    departmentRows.map(row => [Number(row.id), row.name || ""])
  );
  return rows.map(row => ({
    ...row,
    department: departmentMap.get(Number(row.departmentId || 0)) || "",
  }));
}

// ==================== 人事管理 CRUD ====================

export async function getPersonnel(params?: {
  search?: string;
  departmentId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensurePersonnelExtendedColumns(db);
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(personnel.name, `%${params.search}%`),
        like(personnel.employeeNo, `%${params.search}%`)
      )
    );
  if (params?.departmentId)
    conditions.push(eq(personnel.departmentId, params.departmentId));
  if (params?.status)
    conditions.push(eq(personnel.status, params.status as any));
  let query = db.select().from(personnel);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const rows = await query
    .orderBy(desc(personnel.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
  return await enrichPersonnelRows(db, rows as any[]);
}

export async function getPersonnelById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensurePersonnelExtendedColumns(db);
  const result = await db
    .select()
    .from(personnel)
    .where(eq(personnel.id, id))
    .limit(1);
  const [row] = await enrichPersonnelRows(db, result as any[]);
  return row;
}

export async function createPersonnel(data: InsertPersonnel) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelExtendedColumns(db);
  const result = await db.insert(personnel).values(data);
  const insertId = Number(result[0].insertId);
  const [createdPerson] = await db
    .select({
      id: personnel.id,
      employeeNo: personnel.employeeNo,
      name: personnel.name,
      phone: personnel.phone,
      departmentId: personnel.departmentId,
      position: personnel.position,
      status: personnel.status,
      userId: personnel.userId,
    })
    .from(personnel)
    .where(eq(personnel.id, insertId))
    .limit(1);
  if (createdPerson) {
    await syncSinglePersonnelToUser(db, createdPerson as any);
  }
  return insertId;
}

export async function updatePersonnel(
  id: number,
  data: Partial<InsertPersonnel>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelExtendedColumns(db);
  await db.update(personnel).set(data).where(eq(personnel.id, id));
  const [updatedPerson] = await db
    .select({
      id: personnel.id,
      employeeNo: personnel.employeeNo,
      name: personnel.name,
      phone: personnel.phone,
      departmentId: personnel.departmentId,
      position: personnel.position,
      status: personnel.status,
      userId: personnel.userId,
    })
    .from(personnel)
    .where(eq(personnel.id, id))
    .limit(1);
  if (updatedPerson) {
    await syncSinglePersonnelToUser(db, updatedPerson as any);
  }
}

export async function deletePersonnel(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: personnel,
    idColumn: personnel.id,
    id,
    entityType: "人员档案",
    sourceTable: "personnel",
    deletedBy,
  });
}

type AttendanceImportRow = Record<string, unknown>;

type PersonnelSalarySettingView = PersonnelSalarySetting & {
  personnelName: string;
  employeeNo: string;
  department: string;
  position: string;
  personnelStatus: string;
  hasSetting: boolean;
};

type PersonnelPayrollPreviewRow = {
  payrollNo: string;
  periodMonth: string;
  personnelId: number;
  employeeNo: string;
  personnelName: string;
  departmentName: string;
  attendanceDays: number;
  overtimeHours: number;
  leaveHours: number;
  absenteeismDays: number;
  salesAmount: number;
  baseSalary: number;
  attendanceSalary: number;
  overtimePay: number;
  allowance: number;
  performanceBonus: number;
  commissionRate: number;
  commissionAmount: number;
  socialSecurity: number;
  housingFund: number;
  otherDeduction: number;
  grossSalary: number;
  netSalary: number;
  attendanceFileName: string;
  attendanceSnapshot: AttendanceImportRow;
  remark: string;
  status: "draft";
};

function normalizePayrollPeriod(periodMonth: string) {
  const match = String(periodMonth || "")
    .trim()
    .match(/^(\d{4})[-/](\d{1,2})$/);
  if (!match) {
    throw new Error("工资期间格式应为 YYYY-MM");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error("工资期间月份无效");
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getPayrollPeriodDateRange(periodMonth: string) {
  const normalized = normalizePayrollPeriod(periodMonth);
  const [yearText, monthText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return {
    periodMonth: normalized,
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0),
  };
}

function normalizeAttendanceKey(key: string) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()（）【】\[\]：:]+/g, "");
}

const ATTENDANCE_FIELD_ALIASES = {
  employeeNo: [
    "工号",
    "员工工号",
    "员工编号",
    "编号",
    "employeeno",
    "employee_no",
    "employeeid",
    "jobno",
  ],
  name: ["姓名", "员工姓名", "员工", "name", "staffname"],
  attendanceDays: [
    "出勤天数",
    "实际出勤",
    "实际出勤天数",
    "考勤天数",
    "attendancedays",
    "attendance",
  ],
  overtimeHours: [
    "加班小时",
    "加班时长",
    "加班工时",
    "overtimehours",
    "overtime",
  ],
  leaveHours: ["请假小时", "请假时长", "请假工时", "leavehours", "leave"],
  absenteeismDays: [
    "旷工天数",
    "缺勤天数",
    "absentdays",
    "absencedays",
    "absenteeismdays",
  ],
  salesAmount: ["销售额", "业绩", "提成基数", "salesamount", "commissionbase"],
} as const;

function getAttendanceRowValue(
  row: AttendanceImportRow,
  aliases: readonly string[]
) {
  const keyMap = new Map(
    Object.keys(row || {}).map(key => [normalizeAttendanceKey(key), row[key]])
  );
  for (const alias of aliases) {
    const matched = keyMap.get(normalizeAttendanceKey(alias));
    if (
      matched !== undefined &&
      matched !== null &&
      String(matched).trim() !== ""
    ) {
      return matched;
    }
  }
  return undefined;
}

function buildPersonnelPayrollNo(periodMonth: string, personnelId: number) {
  return `PR-${periodMonth.replace("-", "")}-${String(personnelId).padStart(4, "0")}`;
}

function normalizeSalarySettingViewRow(
  row: Partial<PersonnelSalarySetting> & {
    id?: number | null;
    personnelId: number;
    personnelName: string;
    employeeNo: string;
    department: string;
    position: string;
    personnelStatus: string;
    hasSetting: boolean;
  }
): PersonnelSalarySettingView {
  return {
    id: Number(row.id || 0),
    personnelId: Number(row.personnelId),
    payrollType: (row.payrollType as "monthly" | "daily") || "monthly",
    baseSalary: toDecimalString(row.baseSalary || 0) as any,
    fullAttendanceDays: String(row.fullAttendanceDays ?? "21.75") as any,
    overtimeHourlyRate: toDecimalString(row.overtimeHourlyRate || 0) as any,
    allowance: toDecimalString(row.allowance || 0) as any,
    performanceBonus: toDecimalString(row.performanceBonus || 0) as any,
    socialSecurity: toDecimalString(row.socialSecurity || 0) as any,
    housingFund: toDecimalString(row.housingFund || 0) as any,
    otherDeduction: toDecimalString(row.otherDeduction || 0) as any,
    commissionEnabled: Boolean(row.commissionEnabled),
    commissionRate: toDecimalString(row.commissionRate || 0) as any,
    status: (row.status as "active" | "inactive") || "inactive",
    remark: String(row.remark || ""),
    createdBy: row.createdBy == null ? null : Number(row.createdBy),
    createdAt: row.createdAt as any,
    updatedAt: row.updatedAt as any,
    personnelName: String(row.personnelName || ""),
    employeeNo: String(row.employeeNo || ""),
    department: String(row.department || ""),
    position: String(row.position || ""),
    personnelStatus: String(row.personnelStatus || ""),
    hasSetting: Boolean(row.hasSetting),
  };
}

function normalizePersonnelPayrollRow(row: Partial<PersonnelPayrollRecord>) {
  return {
    id: Number(row.id || 0),
    payrollNo: String(row.payrollNo || ""),
    periodMonth: String(row.periodMonth || ""),
    personnelId: Number(row.personnelId || 0),
    employeeNo: String(row.employeeNo || ""),
    personnelName: String(row.personnelName || ""),
    departmentName: String(row.departmentName || ""),
    attendanceDays: roundFinanceAmount(row.attendanceDays || 0),
    overtimeHours: roundFinanceAmount(row.overtimeHours || 0),
    leaveHours: roundFinanceAmount(row.leaveHours || 0),
    absenteeismDays: roundFinanceAmount(row.absenteeismDays || 0),
    salesAmount: roundFinanceAmount(row.salesAmount || 0),
    baseSalary: roundFinanceAmount(row.baseSalary || 0),
    attendanceSalary: roundFinanceAmount(row.attendanceSalary || 0),
    overtimePay: roundFinanceAmount(row.overtimePay || 0),
    allowance: roundFinanceAmount(row.allowance || 0),
    performanceBonus: roundFinanceAmount(row.performanceBonus || 0),
    commissionRate: roundFinanceAmount(row.commissionRate || 0),
    commissionAmount: roundFinanceAmount(row.commissionAmount || 0),
    socialSecurity: roundFinanceAmount(row.socialSecurity || 0),
    housingFund: roundFinanceAmount(row.housingFund || 0),
    otherDeduction: roundFinanceAmount(row.otherDeduction || 0),
    grossSalary: roundFinanceAmount(row.grossSalary || 0),
    netSalary: roundFinanceAmount(row.netSalary || 0),
    attendanceFileName: String(row.attendanceFileName || ""),
    attendanceSnapshot: row.attendanceSnapshot || null,
    status: (row.status as "draft" | "confirmed" | "paid") || "draft",
    remark: String(row.remark || ""),
    createdBy: row.createdBy == null ? null : Number(row.createdBy),
    createdAt: row.createdAt as any,
    updatedAt: row.updatedAt as any,
  };
}

async function getPersonnelSalesAmountForMonth(
  userId: number,
  periodMonth: string,
  db: ReturnType<typeof drizzle>
) {
  if (!userId) return 0;
  const { startDate, endDate } = getPayrollPeriodDateRange(periodMonth);
  const activeStatuses = [
    "approved",
    "pending_payment",
    "confirmed",
    "in_production",
    "ready_to_ship",
    "partial_shipped",
    "shipped",
    "completed",
  ] as const;
  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(COALESCE(${salesOrders.totalAmountBase}, ${salesOrders.totalAmount} * COALESCE(${salesOrders.exchangeRate}, 1))), 0)`,
    })
    .from(salesOrders)
    .where(
      and(
        eq(salesOrders.salesPersonId, userId),
        inArray(salesOrders.status, activeStatuses as any),
        gte(salesOrders.orderDate, startDate as any),
        lte(salesOrders.orderDate, endDate as any)
      )
    );
  return roundFinanceAmount(result?.total || 0);
}

async function buildPersonnelPayrollPreviewRows(params: {
  periodMonth: string;
  attendanceFileName?: string;
  rows: AttendanceImportRow[];
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelExtendedColumns(db);
  await ensurePersonnelSalaryTables(db);

  const personnelRows = await getPersonnel({ limit: 5000, offset: 0 });
  const settingsRows = await db.select().from(personnelSalarySettings);
  const settingMap = new Map(
    settingsRows.map(row => [Number(row.personnelId), row])
  );
  const personnelByEmployeeNo = new Map(
    personnelRows
      .map(
        row =>
          [
            String(row.employeeNo || "")
              .trim()
              .toLowerCase(),
            row,
          ] as const
      )
      .filter(([key]) => key)
  );
  const personnelByName = new Map(
    personnelRows
      .map(
        row =>
          [
            String(row.name || "")
              .trim()
              .toLowerCase(),
            row,
          ] as const
      )
      .filter(([key]) => key)
  );

  const previewRows: PersonnelPayrollPreviewRow[] = [];
  const unmatchedRows: Array<{
    rowIndex: number;
    employeeNo: string;
    personnelName: string;
    reason: string;
  }> = [];

  for (let index = 0; index < params.rows.length; index += 1) {
    const row = params.rows[index];
    const rawEmployeeNo = String(
      getAttendanceRowValue(row, ATTENDANCE_FIELD_ALIASES.employeeNo) || ""
    ).trim();
    const rawName = String(
      getAttendanceRowValue(row, ATTENDANCE_FIELD_ALIASES.name) || ""
    ).trim();
    const matchedPersonnel =
      personnelByEmployeeNo.get(rawEmployeeNo.toLowerCase()) ||
      personnelByName.get(rawName.toLowerCase());

    if (!matchedPersonnel) {
      unmatchedRows.push({
        rowIndex: index + 1,
        employeeNo: rawEmployeeNo,
        personnelName: rawName,
        reason: "未匹配到人事档案人员",
      });
      continue;
    }

    const setting = settingMap.get(Number(matchedPersonnel.id));
    const baseSalary = roundFinanceAmount(setting?.baseSalary || 0);
    const fullAttendanceDays =
      Number(setting?.fullAttendanceDays || 21.75) || 21.75;
    const attendanceDaysRaw = Number(
      getAttendanceRowValue(row, ATTENDANCE_FIELD_ALIASES.attendanceDays) || 0
    );
    const overtimeHours = roundFinanceAmount(
      getAttendanceRowValue(row, ATTENDANCE_FIELD_ALIASES.overtimeHours) || 0
    );
    const leaveHours = roundFinanceAmount(
      getAttendanceRowValue(row, ATTENDANCE_FIELD_ALIASES.leaveHours) || 0
    );
    const absenteeismDays = roundFinanceAmount(
      getAttendanceRowValue(row, ATTENDANCE_FIELD_ALIASES.absenteeismDays) || 0
    );
    const computedAttendanceDays =
      attendanceDaysRaw > 0
        ? roundFinanceAmount(attendanceDaysRaw)
        : roundFinanceAmount(
            Math.max(fullAttendanceDays - absenteeismDays - leaveHours / 8, 0)
          );

    const payrollType = setting?.payrollType || "monthly";
    const attendanceSalary =
      payrollType === "daily"
        ? roundFinanceAmount(baseSalary * computedAttendanceDays)
        : roundFinanceAmount(
            fullAttendanceDays > 0
              ? (baseSalary / fullAttendanceDays) * computedAttendanceDays
              : baseSalary
          );

    const overtimeHourlyRate = roundFinanceAmount(
      setting?.overtimeHourlyRate || 0
    );
    const overtimePay = roundFinanceAmount(overtimeHours * overtimeHourlyRate);
    const allowance = roundFinanceAmount(setting?.allowance || 0);
    const performanceBonus = roundFinanceAmount(setting?.performanceBonus || 0);
    const socialSecurity = roundFinanceAmount(setting?.socialSecurity || 0);
    const housingFund = roundFinanceAmount(setting?.housingFund || 0);
    const otherDeduction = roundFinanceAmount(setting?.otherDeduction || 0);

    const uploadedSalesAmount = roundFinanceAmount(
      getAttendanceRowValue(row, ATTENDANCE_FIELD_ALIASES.salesAmount) || 0
    );
    const salesAmount =
      uploadedSalesAmount > 0
        ? uploadedSalesAmount
        : await getPersonnelSalesAmountForMonth(
            Number(matchedPersonnel.userId || 0),
            params.periodMonth,
            db
          );

    const commissionRate = roundFinanceAmount(
      setting?.commissionEnabled ? setting?.commissionRate || 0 : 0
    );
    const commissionAmount = roundFinanceAmount(
      (salesAmount * commissionRate) / 100
    );
    const grossSalary = roundFinanceAmount(
      attendanceSalary +
        overtimePay +
        allowance +
        performanceBonus +
        commissionAmount
    );
    const netSalary = roundFinanceAmount(
      grossSalary - socialSecurity - housingFund - otherDeduction
    );

    const remarkParts = [];
    if (!setting) remarkParts.push("未配置工资设置，默认按 0 元核算");
    if (!rawEmployeeNo && rawName) remarkParts.push("按姓名匹配人员");

    previewRows.push({
      payrollNo: buildPersonnelPayrollNo(
        params.periodMonth,
        Number(matchedPersonnel.id)
      ),
      periodMonth: params.periodMonth,
      personnelId: Number(matchedPersonnel.id),
      employeeNo: String(matchedPersonnel.employeeNo || ""),
      personnelName: String(matchedPersonnel.name || ""),
      departmentName: String((matchedPersonnel as any).department || ""),
      attendanceDays: computedAttendanceDays,
      overtimeHours,
      leaveHours,
      absenteeismDays,
      salesAmount,
      baseSalary,
      attendanceSalary,
      overtimePay,
      allowance,
      performanceBonus,
      commissionRate,
      commissionAmount,
      socialSecurity,
      housingFund,
      otherDeduction,
      grossSalary,
      netSalary,
      attendanceFileName: String(params.attendanceFileName || ""),
      attendanceSnapshot: row,
      remark: remarkParts.join("；"),
      status: "draft",
    });
  }

  const totalGrossSalary = previewRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.grossSalary),
    0
  );
  const totalNetSalary = previewRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.netSalary),
    0
  );
  const totalCommissionAmount = previewRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.commissionAmount),
    0
  );

  return {
    rows: previewRows,
    unmatchedRows,
    summary: {
      totalRows: params.rows.length,
      matchedRows: previewRows.length,
      unmatchedRows: unmatchedRows.length,
      totalGrossSalary: roundFinanceAmount(totalGrossSalary),
      totalNetSalary: roundFinanceAmount(totalNetSalary),
      totalCommissionAmount: roundFinanceAmount(totalCommissionAmount),
    },
  };
}

// ==================== 人员工资设置与工资单 ====================

export async function getPersonnelSalarySettings(params?: {
  search?: string;
  departmentId?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensurePersonnelExtendedColumns(db);
  await ensurePersonnelSalaryTables(db);

  const personnelRows = await getPersonnel({
    search: params?.search,
    departmentId: params?.departmentId,
    limit: 5000,
    offset: 0,
  });
  const settingsRows = await db.select().from(personnelSalarySettings);
  const settingsMap = new Map(
    settingsRows.map(row => [Number(row.personnelId), row])
  );

  return personnelRows
    .map(person => {
      const setting = settingsMap.get(Number(person.id));
      const settingStatus = setting?.status || "inactive";
      const viewRow = normalizeSalarySettingViewRow({
        ...(setting || {}),
        id: setting?.id ?? 0,
        personnelId: Number(person.id),
        personnelName: String(person.name || ""),
        employeeNo: String(person.employeeNo || ""),
        department: String((person as any).department || ""),
        position: String(person.position || ""),
        personnelStatus: String(person.status || ""),
        hasSetting: Boolean(setting),
        status: settingStatus as any,
      });
      return {
        ...viewRow,
        status: setting ? viewRow.status : "unbound",
      };
    })
    .filter(row => {
      if (!params?.status || params.status === "all") return true;
      return row.status === params.status;
    })
    .sort((a, b) => {
      if (a.hasSetting !== b.hasSetting) return a.hasSetting ? -1 : 1;
      return String(a.employeeNo).localeCompare(String(b.employeeNo), "zh-CN");
    });
}

export async function getPersonnelSalarySettingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensurePersonnelSalaryTables(db);
  const [row] = await db
    .select()
    .from(personnelSalarySettings)
    .where(eq(personnelSalarySettings.id, id))
    .limit(1);
  return row
    ? normalizeSalarySettingViewRow({
        ...row,
        personnelId: Number(row.personnelId),
        personnelName: "",
        employeeNo: "",
        department: "",
        position: "",
        personnelStatus: "",
        hasSetting: true,
      })
    : undefined;
}

export async function upsertPersonnelSalarySetting(
  data: InsertPersonnelSalarySetting & { id?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelSalaryTables(db);

  const personnelId = Number(data.personnelId || 0);
  if (!personnelId) throw new Error("请选择绑定人员");

  const [existingByPersonnel] = await db
    .select({ id: personnelSalarySettings.id })
    .from(personnelSalarySettings)
    .where(eq(personnelSalarySettings.personnelId, personnelId))
    .limit(1);

  const payload = {
    personnelId,
    payrollType: (data.payrollType || "monthly") as any,
    baseSalary: toDecimalString(data.baseSalary || 0) as any,
    fullAttendanceDays: String(data.fullAttendanceDays ?? "21.75") as any,
    overtimeHourlyRate: toDecimalString(data.overtimeHourlyRate || 0) as any,
    allowance: toDecimalString(data.allowance || 0) as any,
    performanceBonus: toDecimalString(data.performanceBonus || 0) as any,
    socialSecurity: toDecimalString(data.socialSecurity || 0) as any,
    housingFund: toDecimalString(data.housingFund || 0) as any,
    otherDeduction: toDecimalString(data.otherDeduction || 0) as any,
    commissionEnabled: Boolean(data.commissionEnabled),
    commissionRate: toDecimalString(data.commissionRate || 0) as any,
    status: (data.status || "active") as any,
    remark: data.remark || null,
    createdBy: data.createdBy == null ? null : Number(data.createdBy),
  };

  if (data.id || existingByPersonnel?.id) {
    const targetId = Number(data.id || existingByPersonnel?.id);
    await db
      .update(personnelSalarySettings)
      .set(payload)
      .where(eq(personnelSalarySettings.id, targetId));
    return targetId;
  }

  const result = await db.insert(personnelSalarySettings).values(payload);
  return result[0].insertId;
}

export async function deletePersonnelSalarySetting(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelSalaryTables(db);
  await deleteSingleWithRecycle(db, {
    table: personnelSalarySettings,
    idColumn: personnelSalarySettings.id,
    id,
    entityType: "人员工资设置",
    sourceTable: "personnel_salary_settings",
    deletedBy,
  });
}

export async function getPersonnelPayrollRecords(params?: {
  search?: string;
  periodMonth?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensurePersonnelSalaryTables(db);

  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(personnelPayrollRecords.personnelName, `%${params.search}%`),
        like(personnelPayrollRecords.employeeNo, `%${params.search}%`),
        like(personnelPayrollRecords.payrollNo, `%${params.search}%`),
        like(personnelPayrollRecords.departmentName, `%${params.search}%`)
      )
    );
  }
  if (params?.periodMonth)
    conditions.push(
      eq(
        personnelPayrollRecords.periodMonth,
        normalizePayrollPeriod(params.periodMonth)
      )
    );
  if (params?.status && params.status !== "all")
    conditions.push(eq(personnelPayrollRecords.status, params.status as any));

  let query = db.select().from(personnelPayrollRecords);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  const rows = await query
    .orderBy(
      desc(personnelPayrollRecords.periodMonth),
      desc(personnelPayrollRecords.updatedAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  return rows.map(row => normalizePersonnelPayrollRow(row));
}

export async function getPersonnelPayrollRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensurePersonnelSalaryTables(db);
  const [row] = await db
    .select()
    .from(personnelPayrollRecords)
    .where(eq(personnelPayrollRecords.id, id))
    .limit(1);
  return row ? normalizePersonnelPayrollRow(row) : undefined;
}

export async function updatePersonnelPayrollRecord(
  id: number,
  data: Partial<InsertPersonnelPayrollRecord>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelSalaryTables(db);
  await db
    .update(personnelPayrollRecords)
    .set(data)
    .where(eq(personnelPayrollRecords.id, id));
}

export async function deletePersonnelPayrollRecord(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelSalaryTables(db);
  await deleteSingleWithRecycle(db, {
    table: personnelPayrollRecords,
    idColumn: personnelPayrollRecords.id,
    id,
    entityType: "工资单",
    sourceTable: "personnel_payroll_records",
    deletedBy,
  });
}

export async function previewPersonnelPayrollFromAttendance(params: {
  periodMonth: string;
  attendanceFileName?: string;
  rows: AttendanceImportRow[];
}) {
  return buildPersonnelPayrollPreviewRows({
    periodMonth: normalizePayrollPeriod(params.periodMonth),
    attendanceFileName: params.attendanceFileName,
    rows: params.rows,
  });
}

export async function importPersonnelPayrollFromAttendance(params: {
  periodMonth: string;
  attendanceFileName?: string;
  rows: AttendanceImportRow[];
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePersonnelSalaryTables(db);

  const preview = await buildPersonnelPayrollPreviewRows({
    periodMonth: normalizePayrollPeriod(params.periodMonth),
    attendanceFileName: params.attendanceFileName,
    rows: params.rows,
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of preview.rows) {
    const payload = {
      payrollNo: row.payrollNo,
      periodMonth: row.periodMonth,
      personnelId: row.personnelId,
      employeeNo: row.employeeNo || null,
      personnelName: row.personnelName,
      departmentName: row.departmentName || null,
      attendanceDays: toDecimalString(row.attendanceDays) as any,
      overtimeHours: toDecimalString(row.overtimeHours) as any,
      leaveHours: toDecimalString(row.leaveHours) as any,
      absenteeismDays: toDecimalString(row.absenteeismDays) as any,
      salesAmount: toDecimalString(row.salesAmount) as any,
      baseSalary: toDecimalString(row.baseSalary) as any,
      attendanceSalary: toDecimalString(row.attendanceSalary) as any,
      overtimePay: toDecimalString(row.overtimePay) as any,
      allowance: toDecimalString(row.allowance) as any,
      performanceBonus: toDecimalString(row.performanceBonus) as any,
      commissionRate: toDecimalString(row.commissionRate) as any,
      commissionAmount: toDecimalString(row.commissionAmount) as any,
      socialSecurity: toDecimalString(row.socialSecurity) as any,
      housingFund: toDecimalString(row.housingFund) as any,
      otherDeduction: toDecimalString(row.otherDeduction) as any,
      grossSalary: toDecimalString(row.grossSalary) as any,
      netSalary: toDecimalString(row.netSalary) as any,
      attendanceFileName: row.attendanceFileName || null,
      attendanceSnapshot: row.attendanceSnapshot as any,
      status: "draft" as const,
      remark: row.remark || null,
      createdBy: params.createdBy == null ? null : Number(params.createdBy),
    };

    const [existing] = await db
      .select({ id: personnelPayrollRecords.id })
      .from(personnelPayrollRecords)
      .where(
        and(
          eq(personnelPayrollRecords.periodMonth, row.periodMonth),
          eq(personnelPayrollRecords.personnelId, row.personnelId)
        )
      )
      .limit(1);

    if (existing?.id) {
      await db
        .update(personnelPayrollRecords)
        .set(payload)
        .where(eq(personnelPayrollRecords.id, Number(existing.id)));
      updatedCount += 1;
    } else {
      await db.insert(personnelPayrollRecords).values(payload);
      createdCount += 1;
    }
  }

  return {
    success: true,
    createdCount,
    updatedCount,
    skippedCount: preview.unmatchedRows.length,
    unmatchedRows: preview.unmatchedRows,
    summary: preview.summary,
  };
}

// ==================== 培训管理 CRUD ====================

async function ensureTrainingNoColumn(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || trainingNoColumnReady) return;
  try {
    const existingColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM trainings")
    );
    const existingColumnsRows = Array.isArray(
      (existingColumnsResult as any)?.[0]
    )
      ? (existingColumnsResult as any)[0]
      : (existingColumnsResult as any);
    const existingColumnNames = new Set(
      Array.from(existingColumnsRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );
    if (!existingColumnNames.has("trainingNo")) {
      await db.execute(
        sql.raw(
          "ALTER TABLE trainings ADD COLUMN trainingNo VARCHAR(50) NULL UNIQUE"
        )
      );
    }

    const rows = await db
      .select({ id: trainings.id, trainingNo: trainings.trainingNo })
      .from(trainings)
      .orderBy(asc(trainings.createdAt), asc(trainings.id));
    for (const row of rows) {
      if (String(row.trainingNo || "").trim()) continue;
      const trainingNo = await allocateManagedCodeRuleNo("培训记录");
      await db
        .update(trainings)
        .set({ trainingNo })
        .where(eq(trainings.id, Number(row.id)));
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060/i.test(message)) {
      console.warn("[ensureTrainingNoColumn]", message);
    }
  }
  trainingNoColumnReady = true;
}

export async function getTrainings(params?: {
  search?: string;
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureTrainingNoColumn(db);
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(trainings.title, `%${params.search}%`),
        like(trainings.trainingNo, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(trainings.status, params.status as any));
  if (params?.type) conditions.push(eq(trainings.type, params.type as any));
  let query = db.select().from(trainings);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(trainings.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getTrainingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureTrainingNoColumn(db);
  const result = await db
    .select()
    .from(trainings)
    .where(eq(trainings.id, id))
    .limit(1);
  return result[0];
}

export async function createTraining(
  data:
    | InsertTraining
    | (Omit<InsertTraining, "trainingNo"> & { trainingNo?: string | null })
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureTrainingNoColumn(db);
  const trainingNo = await resolveManagedCodeRuleNo(
    "培训记录",
    (data as any).trainingNo
  );
  const result = await db.insert(trainings).values({
    ...data,
    trainingNo,
  } as InsertTraining);
  return result[0].insertId;
}

export async function updateTraining(
  id: number,
  data: Partial<InsertTraining>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureTrainingNoColumn(db);
  await db.update(trainings).set(data).where(eq(trainings.id, id));
}

export async function deleteTraining(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureTrainingNoColumn(db);
  await deleteSingleWithRecycle(db, {
    table: trainings,
    idColumn: trainings.id,
    id,
    entityType: "培训记录",
    sourceTable: "trainings",
    deletedBy,
  });
}

// ==================== 内审管理 CRUD ====================

export async function getAudits(params?: {
  search?: string;
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(audits.auditNo, `%${params.search}%`),
        like(audits.title, `%${params.search}%`)
      )
    );
  if (params?.status) conditions.push(eq(audits.status, params.status as any));
  if (params?.type) conditions.push(eq(audits.type, params.type as any));
  let query = db.select().from(audits);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(audits.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getAuditById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(audits)
    .where(eq(audits.id, id))
    .limit(1);
  return result[0];
}

export async function createAudit(data: InsertAudit) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(audits).values(data);
  return result[0].insertId;
}

export async function updateAudit(id: number, data: Partial<InsertAudit>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(audits).set(data).where(eq(audits.id, id));
}

export async function deleteAudit(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: audits,
    idColumn: audits.id,
    id,
    entityType: "内审记录",
    sourceTable: "audits",
    deletedBy,
  });
}

async function ensureRdProjectExtendedColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || rdProjectsExtendedColumnsReady) return;
  const columns = [
    { name: "raOwnerId", def: "INT NULL" },
    { name: "qaOwnerId", def: "INT NULL" },
    { name: "productionOwnerId", def: "INT NULL" },
    { name: "clinicalOwnerId", def: "INT NULL" },
    { name: "projectCategory", def: "VARCHAR(50) NULL" },
    { name: "developmentType", def: "VARCHAR(50) NULL" },
    { name: "priority", def: "VARCHAR(20) NULL" },
    { name: "currentStage", def: "VARCHAR(100) NULL" },
    { name: "releaseStatus", def: "VARCHAR(50) NULL" },
    { name: "targetFinishDate", def: "DATE NULL" },
    { name: "actualFinishDate", def: "DATE NULL" },
    { name: "launchDate", def: "DATE NULL" },
    { name: "targetMarkets", def: "JSON NULL" },
    { name: "projectData", def: "JSON NULL" },
  ];
  try {
    const existingColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM rd_projects")
    );
    const existingColumnsRows = Array.isArray(
      (existingColumnsResult as any)?.[0]
    )
      ? (existingColumnsResult as any)[0]
      : (existingColumnsResult as any);
    const existingColumnNames = new Set(
      Array.from(existingColumnsRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );

    for (const col of columns) {
      if (existingColumnNames.has(col.name)) continue;
      try {
        await db.execute(
          sql.raw(`ALTER TABLE rd_projects ADD COLUMN ${col.name} ${col.def}`)
        );
      } catch (error) {
        const message = String((error as any)?.message ?? "");
        if (!/Duplicate column name|already exists|1060/i.test(message)) {
          console.warn(
            `[ensureRdProjectExtendedColumns] ${col.name}:`,
            message
          );
        }
      }
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    console.warn(
      "[ensureRdProjectExtendedColumns] failed to inspect columns:",
      message
    );
  }
  rdProjectsExtendedColumnsReady = true;
}

async function ensureLabRecordsExtendedColumns(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || labRecordsExtendedColumnsReady) return;
  const columns = [
    { name: "formId", def: "VARCHAR(100) NULL" },
    { name: "formTitle", def: "VARCHAR(200) NULL" },
    { name: "formType", def: "VARCHAR(50) NULL" },
    { name: "formData", def: "JSON NULL" },
    { name: "testerName", def: "VARCHAR(100) NULL" },
    { name: "reviewerName", def: "VARCHAR(100) NULL" },
    { name: "sourceType", def: "VARCHAR(50) NULL" },
    { name: "sourceId", def: "INT NULL" },
    { name: "sourceItemId", def: "INT NULL" },
  ];

  try {
    const existingColumnsResult = await db.execute(
      sql.raw("SHOW COLUMNS FROM lab_records")
    );
    const existingColumnsRows = Array.isArray(
      (existingColumnsResult as any)?.[0]
    )
      ? (existingColumnsResult as any)[0]
      : (existingColumnsResult as any);
    const existingColumnNames = new Set(
      Array.from(existingColumnsRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );

    for (const col of columns) {
      if (existingColumnNames.has(col.name)) continue;
      try {
        await db.execute(
          sql.raw(`ALTER TABLE lab_records ADD COLUMN ${col.name} ${col.def}`)
        );
      } catch (error) {
        const message = String((error as any)?.message ?? "");
        if (!/Duplicate column name|already exists|1060/i.test(message)) {
          console.warn(
            `[ensureLabRecordsExtendedColumns] ${col.name}:`,
            message
          );
        }
      }
    }
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    console.warn(
      "[ensureLabRecordsExtendedColumns] failed to inspect columns:",
      message
    );
  }

  labRecordsExtendedColumnsReady = true;
}

const INFRASTRUCTURE_LAB_FORM_IDS = [
  "cleaning-record",
  "pw-chemical",
  "pw-microbial",
  "airborne-microbe",
  "particle-monitor",
  "airflow-monitor",
  "settling-bacteria",
] as const;

function isInfrastructureLabFormId(formId?: string | null) {
  return INFRASTRUCTURE_LAB_FORM_IDS.includes(
    String(formId || "").trim() as (typeof INFRASTRUCTURE_LAB_FORM_IDS)[number]
  );
}

function getSystemDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeLabFormDataRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([key]) => Boolean(key))
      .map(([key, value]) => {
        if (typeof value === "string") return [key, value];
        if (value === null || value === undefined) return [key, ""];
        return [key, JSON.stringify(value)];
      })
  );
}

function parseJsonStringArray(raw: unknown) {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(raw.map(item => String(item || "").trim()).filter(Boolean))
    );
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(parsed.map(item => String(item || "").trim()).filter(Boolean))
    );
  } catch {
    return [];
  }
}

function parseJsonNumberArray(raw: unknown) {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(
        raw
          .map(item => Number(item))
          .filter(item => Number.isFinite(item) && item > 0)
      )
    );
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map(item => Number(item))
          .filter(item => Number.isFinite(item) && item > 0)
      )
    );
  } catch {
    return [];
  }
}

function isProductionOrderActiveForBatchBinding(
  order: {
    status: string | null;
    productionDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    plannedStartDate?: string | null;
    plannedEndDate?: string | null;
  },
  targetDate: string
) {
  const status = String(order.status || "").trim();
  if (status === "in_progress") return true;
  if (status === "completed" || status === "cancelled" || status === "draft")
    return false;

  const productionDate = String(order.productionDate || "").slice(0, 10);
  if (productionDate && productionDate === targetDate) return true;

  const actualStartDate = String(order.actualStartDate || "").slice(0, 10);
  const actualEndDate = String(order.actualEndDate || "").slice(0, 10);
  if (
    actualStartDate &&
    actualStartDate <= targetDate &&
    (!actualEndDate || actualEndDate >= targetDate)
  ) {
    return true;
  }

  const plannedStartDate = String(order.plannedStartDate || "").slice(0, 10);
  const plannedEndDate = String(order.plannedEndDate || "").slice(0, 10);
  if (
    plannedStartDate &&
    plannedStartDate <= targetDate &&
    (!plannedEndDate || plannedEndDate >= targetDate)
  ) {
    return true;
  }

  return false;
}

async function getInfrastructureLabBatchBindingSnapshot(
  targetDate = getSystemDateString()
) {
  const db = await getDb();
  if (!db) {
    return {
      batchNos: [] as string[],
      productionOrderIds: [] as number[],
      bindingDate: targetDate,
    };
  }

  const rows = await db
    .select({
      id: productionOrders.id,
      batchNo: productionOrders.batchNo,
      status: productionOrders.status,
      productionDate: sql<string>`DATE_FORMAT(${productionOrders.productionDate}, '%Y-%m-%d')`,
      actualStartDate: sql<string>`DATE_FORMAT(${productionOrders.actualStartDate}, '%Y-%m-%d')`,
      actualEndDate: sql<string>`DATE_FORMAT(${productionOrders.actualEndDate}, '%Y-%m-%d')`,
      plannedStartDate: sql<string>`DATE_FORMAT(${productionOrders.plannedStartDate}, '%Y-%m-%d')`,
      plannedEndDate: sql<string>`DATE_FORMAT(${productionOrders.plannedEndDate}, '%Y-%m-%d')`,
    })
    .from(productionOrders)
    .where(
      and(
        isNotNull(productionOrders.batchNo),
        ne(productionOrders.status, "cancelled")
      )
    );

  const matched = rows.filter(row => {
    const batchNo = String(row.batchNo || "").trim();
    if (!batchNo) return false;
    return isProductionOrderActiveForBatchBinding(
      {
        status: row.status,
        productionDate: row.productionDate,
        actualStartDate: row.actualStartDate,
        actualEndDate: row.actualEndDate,
        plannedStartDate: row.plannedStartDate,
        plannedEndDate: row.plannedEndDate,
      },
      targetDate
    );
  });

  return {
    batchNos: Array.from(
      new Set(
        matched.map(row => String(row.batchNo || "").trim()).filter(Boolean)
      )
    ),
    productionOrderIds: Array.from(
      new Set(
        matched
          .map(row => Number(row.id))
          .filter(item => Number.isFinite(item) && item > 0)
      )
    ),
    bindingDate: targetDate,
  };
}

async function attachInfrastructureBatchBindings<
  T extends Partial<InsertLabRecord>,
>(
  data: T,
  existingFormData?: unknown,
  existingFormId?: string | null
): Promise<T> {
  const resolvedFormId = String(data.formId || existingFormId || "").trim();
  if (!isInfrastructureLabFormId(resolvedFormId)) {
    return data;
  }

  const currentFormData = normalizeLabFormDataRecord(data.formData);
  const previousFormData = normalizeLabFormDataRecord(existingFormData);
  const preservedBatchNos = parseJsonStringArray(
    previousFormData.linkedBatchNos
  );
  const preservedProductionOrderIds = parseJsonNumberArray(
    previousFormData.linkedProductionOrderIds
  );
  const preservedBindingDate = String(
    previousFormData.batchBindingDate || ""
  ).trim();
  const snapshot =
    preservedBatchNos.length > 0
      ? {
          batchNos: preservedBatchNos,
          productionOrderIds: preservedProductionOrderIds,
          bindingDate: preservedBindingDate || getSystemDateString(),
        }
      : await getInfrastructureLabBatchBindingSnapshot();

  return {
    ...data,
    formData: {
      ...currentFormData,
      linkedBatchNos: JSON.stringify(snapshot.batchNos),
      linkedProductionOrderIds: JSON.stringify(snapshot.productionOrderIds),
      batchBindingDate: snapshot.bindingDate,
      batchBindingMode: "system-auto",
      batchBindingCount: String(snapshot.batchNos.length),
    },
  };
}

function extractLinkedBatchNosFromLabFormData(raw: unknown) {
  const formData = normalizeLabFormDataRecord(raw);
  return parseJsonStringArray(formData.linkedBatchNos);
}

// ==================== 研发项目 CRUD ====================

export async function getRdProjects(params?: {
  search?: string;
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureRdProjectExtendedColumns(db);
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(rdProjects.projectNo, `%${params.search}%`),
        like(rdProjects.name, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(rdProjects.status, params.status as any));
  if (params?.type) conditions.push(eq(rdProjects.type, params.type as any));
  let query = db.select().from(rdProjects);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(rdProjects.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getRdProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureRdProjectExtendedColumns(db);
  const result = await db
    .select()
    .from(rdProjects)
    .where(eq(rdProjects.id, id))
    .limit(1);
  return result[0];
}

export async function createRdProject(data: InsertRdProject) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureRdProjectExtendedColumns(db);
  const projectNo = await resolveManagedCodeRuleNo(
    "研发项目",
    (data as any).projectNo
  );
  const result = await db.insert(rdProjects).values({
    ...data,
    projectNo,
  });
  return result[0].insertId;
}

export async function updateRdProject(
  id: number,
  data: Partial<InsertRdProject>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureRdProjectExtendedColumns(db);
  await db.update(rdProjects).set(data).where(eq(rdProjects.id, id));
}

export async function deleteRdProject(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: rdProjects,
    idColumn: rdProjects.id,
    id,
    entityType: "研发项目",
    sourceTable: "rd_projects",
    deletedBy,
  });
}

// ==================== 盘点管理 CRUD ====================

export async function getStocktakes(params?: {
  search?: string;
  status?: string;
  warehouseId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search)
    conditions.push(like(stocktakes.stocktakeNo, `%${params.search}%`));
  if (params?.status)
    conditions.push(eq(stocktakes.status, params.status as any));
  if (params?.warehouseId)
    conditions.push(eq(stocktakes.warehouseId, params.warehouseId));
  let query = db.select().from(stocktakes);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(stocktakes.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getStocktakeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(stocktakes)
    .where(eq(stocktakes.id, id))
    .limit(1);
  return result[0];
}

export async function createStocktake(data: InsertStocktake) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const stocktakeNo = await resolveManagedCodeRuleNo(
    "盘点单",
    (data as any).stocktakeNo
  );
  const result = await db.insert(stocktakes).values({
    ...data,
    stocktakeNo,
  });
  return result[0].insertId;
}

export async function updateStocktake(
  id: number,
  data: Partial<InsertStocktake>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(stocktakes).set(data).where(eq(stocktakes.id, id));
}

export async function deleteStocktake(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: stocktakes,
    idColumn: stocktakes.id,
    id,
    entityType: "盘点记录",
    sourceTable: "stocktakes",
    deletedBy,
  });
}

// ==================== 质量不良事件 CRUD ====================

export async function getQualityIncidents(params?: {
  search?: string;
  status?: string;
  type?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(qualityIncidents.incidentNo, `%${params.search}%`),
        like(qualityIncidents.title, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(qualityIncidents.status, params.status as any));
  if (params?.type)
    conditions.push(eq(qualityIncidents.type, params.type as any));
  if (params?.severity)
    conditions.push(eq(qualityIncidents.severity, params.severity as any));
  let query = db.select().from(qualityIncidents);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(qualityIncidents.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getQualityIncidentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(qualityIncidents)
    .where(eq(qualityIncidents.id, id))
    .limit(1);
  return result[0];
}

export async function createQualityIncident(data: InsertQualityIncident) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const incidentNo = await resolveManagedCodeRuleNo(
    "质量事件",
    (data as any).incidentNo
  );
  const result = await db.insert(qualityIncidents).values({
    ...data,
    incidentNo,
  });
  return result[0].insertId;
}

export async function updateQualityIncident(
  id: number,
  data: Partial<InsertQualityIncident>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db
    .update(qualityIncidents)
    .set(data)
    .where(eq(qualityIncidents.id, id));
}

export async function deleteQualityIncident(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: qualityIncidents,
    idColumn: qualityIncidents.id,
    id,
    entityType: "不良事件",
    sourceTable: "quality_incidents",
    deletedBy,
  });
}

// ==================== 样品管理 CRUD ====================

export async function getSamples(params?: {
  search?: string;
  status?: string;
  sampleType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(samples.sampleNo, `%${params.search}%`),
        like(samples.batchNo, `%${params.search}%`)
      )
    );
  if (params?.status) conditions.push(eq(samples.status, params.status as any));
  if (params?.sampleType)
    conditions.push(eq(samples.sampleType, params.sampleType as any));
  let query = db.select().from(samples);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(samples.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getSampleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(samples)
    .where(eq(samples.id, id))
    .limit(1);
  return result[0];
}

export async function createSample(data: InsertSample) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const sampleNo = await resolveManagedCodeRuleNo(
    "留样单",
    (data as any).sampleNo
  );
  const result = await db.insert(samples).values({
    ...data,
    sampleNo,
  });
  return result[0].insertId;
}

export async function updateSample(id: number, data: Partial<InsertSample>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(samples).set(data).where(eq(samples.id, id));
}

export async function deleteSample(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：实验室记录
  await db.delete(labRecords).where(eq(labRecords.sampleId, id));
  await deleteSingleWithRecycle(db, {
    table: samples,
    idColumn: samples.id,
    id,
    entityType: "留样记录",
    sourceTable: "samples",
    deletedBy,
  });
}

// ==================== 实验室记录 CRUD ====================

export async function getLabRecords(params?: {
  search?: string;
  status?: string;
  conclusion?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureLabRecordsExtendedColumns(db);
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(labRecords.recordNo, `%${params.search}%`),
        like(labRecords.testType, `%${params.search}%`),
        like(labRecords.formTitle, `%${params.search}%`),
        like(labRecords.testerName, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(labRecords.status, params.status as any));
  if (params?.conclusion)
    conditions.push(eq(labRecords.conclusion, params.conclusion as any));
  let query = db.select().from(labRecords);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(labRecords.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getLabRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureLabRecordsExtendedColumns(db);
  const result = await db
    .select()
    .from(labRecords)
    .where(eq(labRecords.id, id))
    .limit(1);
  return result[0];
}

export async function createLabRecord(data: InsertLabRecord) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureLabRecordsExtendedColumns(db);
  const recordNo = await resolveManagedCodeRuleNo(
    "实验室记录",
    (data as any).recordNo
  );
  const nextData = await attachInfrastructureBatchBindings({
    ...data,
    recordNo,
  });
  const result = await db.insert(labRecords).values(nextData);
  return result[0].insertId;
}

export async function updateLabRecord(
  id: number,
  data: Partial<InsertLabRecord>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureLabRecordsExtendedColumns(db);
  const existing = await getLabRecordById(id);
  const nextData = await attachInfrastructureBatchBindings(
    data,
    existing?.formData,
    existing?.formId
  );
  await db.update(labRecords).set(nextData).where(eq(labRecords.id, id));
}

export async function deleteLabRecord(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureLabRecordsExtendedColumns(db);
  await deleteSingleWithRecycle(db, {
    table: labRecords,
    idColumn: labRecords.id,
    id,
    entityType: "实验室记录",
    sourceTable: "lab_records",
    deletedBy,
  });
}

// ==================== 实验室记录关联查询与回写 ====================

export async function getLabRecordsBySource(params: {
  sourceType: string;
  sourceId: number;
  sourceItemId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureLabRecordsExtendedColumns(db);
  const conditions = [
    eq(labRecords.sourceType as any, params.sourceType),
    eq(labRecords.sourceId as any, params.sourceId),
  ];
  if (params.sourceItemId !== undefined) {
    conditions.push(eq(labRecords.sourceItemId as any, params.sourceItemId));
  }
  return await db
    .select()
    .from(labRecords)
    .where(and(...conditions))
    .orderBy(desc(labRecords.createdAt));
}

export async function completeLabRecordAndWriteBack(
  labRecordId: number,
  conclusion: "pass" | "fail" | "pending",
  result?: string
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureLabRecordsExtendedColumns(db);
  // 更新实验室记录状态
  await db
    .update(labRecords)
    .set({ status: "completed", conclusion, result } as any)
    .where(eq(labRecords.id, labRecordId));
  // 查询实验室记录，获取 sourceType/sourceId/sourceItemId
  const [labRecord] = await db
    .select()
    .from(labRecords)
    .where(eq(labRecords.id, labRecordId))
    .limit(1);
  if (!labRecord) return { success: true };
  const { sourceType, sourceId, sourceItemId } = labRecord as any;
  // 回写到 IQC 检验项目
  if (sourceType === "iqc" && sourceItemId) {
    await db
      .update(iqcInspectionItems)
      .set({ conclusion, labRecordId } as any)
      .where(eq(iqcInspectionItems.id, sourceItemId));
  }
  return { success: true };
}

// ==================== 应收账款 CRUD ====================

export async function getAccountsReceivable(params?: {
  search?: string;
  status?: string;
  customerId?: number;
  salesPersonId?: number;
  salesPersonIds?: number[];
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const conditions = [];
  if (params?.search)
    conditions.push(like(accountsReceivable.invoiceNo, `%${params.search}%`));
  if (params?.status)
    conditions.push(eq(accountsReceivable.status, params.status as any));
  if (params?.customerId)
    conditions.push(eq(accountsReceivable.customerId, params.customerId));
  if (params?.companyId)
    conditions.push(
      eq((accountsReceivable as any).companyId, params.companyId)
    );
  if (params?.salesPersonId) {
    conditions.push(
      or(
        eq(salesOrders.salesPersonId, params.salesPersonId),
        eq(accountsReceivable.createdBy, params.salesPersonId)
      )
    );
  } else if (params?.salesPersonIds?.length) {
    conditions.push(
      or(
        inArray(salesOrders.salesPersonId, params.salesPersonIds),
        inArray(accountsReceivable.createdBy, params.salesPersonIds)
      )
    );
  }
  let query = db
    .select({
      id: accountsReceivable.id,
      invoiceNo: accountsReceivable.invoiceNo,
      customerId: accountsReceivable.customerId,
      customerName: customers.name,
      salesOrderId: accountsReceivable.salesOrderId,
      orderNo: salesOrders.orderNo,
      amount: accountsReceivable.amount,
      paidAmount: accountsReceivable.paidAmount,
      currency: accountsReceivable.currency,
      amountBase: accountsReceivable.amountBase,
      exchangeRate: accountsReceivable.exchangeRate,
      bankAccountId: accountsReceivable.bankAccountId,
      invoiceDate: accountsReceivable.invoiceDate,
      dueDate: accountsReceivable.dueDate,
      paymentMethod: accountsReceivable.paymentMethod,
      receiptDate: accountsReceivable.receiptDate,
      status: accountsReceivable.status,
      remark: accountsReceivable.remark,
      createdBy: accountsReceivable.createdBy,
      createdAt: accountsReceivable.createdAt,
      updatedAt: accountsReceivable.updatedAt,
    })
    .from(accountsReceivable)
    .leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
    .leftJoin(salesOrders, eq(accountsReceivable.salesOrderId, salesOrders.id));
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const rows = await query
    .orderBy(desc(accountsReceivable.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
  const todayKey = getTodayDateKey();
  return rows.map((r: any) => {
    const status = String(r.status ?? "");
    if (status === "pending" || status === "partial") {
      const dueKey = toLocalDateKey(r.dueDate);
      if (dueKey && dueKey < todayKey) {
        return { ...r, status: "overdue" };
      }
    }
    return r;
  });
}

export async function getAccountsReceivableById(
  id: number,
  companyId?: number
) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureCollaborationDataModel(db);
  const conditions = [eq(accountsReceivable.id, id)];
  if (companyId) {
    conditions.push(eq((accountsReceivable as any).companyId, companyId));
  }
  const result = await db
    .select()
    .from(accountsReceivable)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function createAccountsReceivable(
  data:
    | InsertAccountsReceivable
    | (Omit<InsertAccountsReceivable, "invoiceNo"> & {
        invoiceNo?: string | null;
      })
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(
    (data as any).companyId,
    mainCompanyId
  );
  const invoiceNo = await resolveManagedCodeRuleNo(
    "应收单",
    (data as any).invoiceNo
  );
  const result = await db.insert(accountsReceivable).values({
    ...data,
    invoiceNo,
    companyId: scopedCompanyId,
  } as InsertAccountsReceivable);
  const receivableId = Number(result[0]?.insertId || 0);
  if (Number(data.salesOrderId || 0) > 0) {
    await syncSalesOrderFinancialProgress(Number(data.salesOrderId), db);
  }
  return receivableId;
}

export async function updateAccountsReceivable(
  id: number,
  data: Partial<InsertAccountsReceivable>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [currentRow] = await db
    .select({ salesOrderId: accountsReceivable.salesOrderId })
    .from(accountsReceivable)
    .where(eq(accountsReceivable.id, id))
    .limit(1);
  await db
    .update(accountsReceivable)
    .set(data)
    .where(eq(accountsReceivable.id, id));
  const affectedOrderIds = Array.from(
    new Set(
      [
        Number(currentRow?.salesOrderId || 0),
        Number(data.salesOrderId || 0),
      ].filter(value => Number.isFinite(value) && value > 0)
    )
  );
  for (const salesOrderId of affectedOrderIds) {
    await syncSalesOrderFinancialProgress(salesOrderId, db);
  }
  const [updatedRow] = await db
    .select({
      id: accountsReceivable.id,
      companyId: (accountsReceivable as any).companyId,
      invoiceNo: accountsReceivable.invoiceNo,
      salesOrderId: accountsReceivable.salesOrderId,
      customerId: accountsReceivable.customerId,
      amount: accountsReceivable.amount,
      paidAmount: accountsReceivable.paidAmount,
      currency: accountsReceivable.currency,
      amountBase: accountsReceivable.amountBase,
      exchangeRate: accountsReceivable.exchangeRate,
      bankAccountId: accountsReceivable.bankAccountId,
      paymentMethod: accountsReceivable.paymentMethod,
      receiptDate: accountsReceivable.receiptDate,
      createdAt: accountsReceivable.createdAt,
      updatedAt: accountsReceivable.updatedAt,
      createdBy: accountsReceivable.createdBy,
      remark: accountsReceivable.remark,
    })
    .from(accountsReceivable)
    .where(eq(accountsReceivable.id, id))
    .limit(1);
}

export async function deleteAccountsReceivable(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [currentRow] = await db
    .select({ salesOrderId: accountsReceivable.salesOrderId })
    .from(accountsReceivable)
    .where(eq(accountsReceivable.id, id))
    .limit(1);
  await deleteSingleWithRecycle(db, {
    table: accountsReceivable,
    idColumn: accountsReceivable.id,
    id,
    entityType: "应收账款",
    sourceTable: "accounts_receivable",
    deletedBy,
  });
  if (Number(currentRow?.salesOrderId || 0) > 0) {
    await syncSalesOrderFinancialProgress(Number(currentRow?.salesOrderId), db);
  }
}

// ==================== 应付账款 CRUD ====================

export async function getAccountsPayable(params?: {
  search?: string;
  status?: string;
  supplierId?: number;
  buyerId?: number;
  buyerIds?: number[];
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  await ensureAccountsPayableSupplierNameColumn(db);
  const conditions = [];
  if (params?.search)
    conditions.push(like(accountsPayable.invoiceNo, `%${params.search}%`));
  if (params?.status)
    conditions.push(eq(accountsPayable.status, params.status as any));
  if (params?.supplierId)
    conditions.push(eq(accountsPayable.supplierId, params.supplierId));
  if (params?.companyId)
    conditions.push(eq((accountsPayable as any).companyId, params.companyId));
  if (params?.buyerId) {
    conditions.push(
      or(
        eq(purchaseOrders.buyerId, params.buyerId),
        eq(purchaseOrders.createdBy, params.buyerId),
        eq(accountsPayable.createdBy, params.buyerId)
      )
    );
  } else if (params?.buyerIds?.length) {
    conditions.push(
      or(
        inArray(purchaseOrders.buyerId, params.buyerIds),
        inArray(purchaseOrders.createdBy, params.buyerIds),
        inArray(accountsPayable.createdBy, params.buyerIds)
      )
    );
  }
  let query = db
    .select({
      id: accountsPayable.id,
      invoiceNo: accountsPayable.invoiceNo,
      supplierId: accountsPayable.supplierId,
      supplierName: sql<string>`COALESCE(${accountsPayable.supplierName}, ${suppliers.name})`,
      purchaseOrderId: accountsPayable.purchaseOrderId,
      orderNo: purchaseOrders.orderNo,
      amount: accountsPayable.amount,
      paidAmount: accountsPayable.paidAmount,
      currency: accountsPayable.currency,
      amountBase: accountsPayable.amountBase,
      exchangeRate: accountsPayable.exchangeRate,
      bankAccountId: accountsPayable.bankAccountId,
      invoiceDate: accountsPayable.invoiceDate,
      dueDate: accountsPayable.dueDate,
      paymentMethod: accountsPayable.paymentMethod,
      paymentDate: accountsPayable.paymentDate,
      status: accountsPayable.status,
      remark: accountsPayable.remark,
      createdBy: accountsPayable.createdBy,
      createdAt: accountsPayable.createdAt,
      updatedAt: accountsPayable.updatedAt,
    })
    .from(accountsPayable)
    .leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id))
    .leftJoin(
      purchaseOrders,
      eq(accountsPayable.purchaseOrderId, purchaseOrders.id)
    );
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(accountsPayable.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getAccountsPayableById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureCollaborationDataModel(db);
  await ensureAccountsPayableSupplierNameColumn(db);
  const conditions = [eq(accountsPayable.id, id)];
  if (companyId) {
    conditions.push(eq((accountsPayable as any).companyId, companyId));
  }
  const result = await db
    .select({
      id: accountsPayable.id,
      invoiceNo: accountsPayable.invoiceNo,
      supplierId: accountsPayable.supplierId,
      supplierName: sql<string>`COALESCE(${accountsPayable.supplierName}, ${suppliers.name})`,
      purchaseOrderId: accountsPayable.purchaseOrderId,
      orderNo: purchaseOrders.orderNo,
      amount: accountsPayable.amount,
      paidAmount: accountsPayable.paidAmount,
      currency: accountsPayable.currency,
      amountBase: accountsPayable.amountBase,
      exchangeRate: accountsPayable.exchangeRate,
      bankAccountId: accountsPayable.bankAccountId,
      invoiceDate: accountsPayable.invoiceDate,
      dueDate: accountsPayable.dueDate,
      paymentMethod: accountsPayable.paymentMethod,
      paymentDate: accountsPayable.paymentDate,
      status: accountsPayable.status,
      remark: accountsPayable.remark,
      createdBy: accountsPayable.createdBy,
      createdAt: accountsPayable.createdAt,
      updatedAt: accountsPayable.updatedAt,
    })
    .from(accountsPayable)
    .leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id))
    .leftJoin(
      purchaseOrders,
      eq(accountsPayable.purchaseOrderId, purchaseOrders.id)
    )
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function createAccountsPayable(data: InsertAccountsPayable) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCollaborationDataModel(db);
  await ensureAccountsPayableSupplierNameColumn(db);
  await ensurePurchaseOrdersStatusEnum(db);
  const supplierName =
    data.supplierName ||
    (await getSupplierNameById(Number(data.supplierId), db));
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(
    (data as any).companyId,
    mainCompanyId
  );
  const result = await db.insert(accountsPayable).values({
    ...data,
    companyId: scopedCompanyId,
    supplierName,
    remark:
      Number(data.purchaseOrderId || 0) > 0
        ? sanitizePurchasePayableRemark(
            data.remark,
            String((data as any).invoiceNo || data.purchaseOrderId),
            data.amount,
            data.paymentMethod
          )
        : data.remark,
  });
  const payableId = Number(result[0]?.insertId || 0);
  if (Number(data.purchaseOrderId || 0) > 0) {
    await syncPurchaseOrderFinancialProgress(Number(data.purchaseOrderId), db);
  }
  return payableId;
}

export async function updateAccountsPayable(
  id: number,
  data: Partial<InsertAccountsPayable>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureAccountsPayableSupplierNameColumn(db);
  await ensurePurchaseOrdersStatusEnum(db);
  const [currentRow] = await db
    .select({
      purchaseOrderId: accountsPayable.purchaseOrderId,
      remark: accountsPayable.remark,
    })
    .from(accountsPayable)
    .where(eq(accountsPayable.id, id))
    .limit(1);
  const supplierName = data.supplierId
    ? await getSupplierNameById(Number(data.supplierId), db)
    : undefined;
  await db
    .update(accountsPayable)
    .set({
      ...data,
      remark:
        Number(data.purchaseOrderId || currentRow?.purchaseOrderId || 0) > 0
          ? sanitizePurchasePayableRemark(
              data.remark === undefined ? currentRow?.remark : data.remark,
              String(data.invoiceNo || currentRow?.purchaseOrderId || ""),
              data.amount,
              data.paymentMethod
            )
          : data.remark,
      supplierName: supplierName ?? data.supplierName,
    })
    .where(eq(accountsPayable.id, id));
  const affectedOrderIds = Array.from(
    new Set(
      [
        Number(currentRow?.purchaseOrderId || 0),
        Number(data.purchaseOrderId || 0),
      ].filter(value => Number.isFinite(value) && value > 0)
    )
  );
  for (const purchaseOrderId of affectedOrderIds) {
    await syncPurchaseOrderFinancialProgress(purchaseOrderId, db);
  }
}

export async function deleteAccountsPayable(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensurePurchaseOrdersStatusEnum(db);
  const [currentRow] = await db
    .select({ purchaseOrderId: accountsPayable.purchaseOrderId })
    .from(accountsPayable)
    .where(eq(accountsPayable.id, id))
    .limit(1);
  await deleteSingleWithRecycle(db, {
    table: accountsPayable,
    idColumn: accountsPayable.id,
    id,
    entityType: "应付账款",
    sourceTable: "accounts_payable",
    deletedBy,
  });
  if (Number(currentRow?.purchaseOrderId || 0) > 0) {
    await syncPurchaseOrderFinancialProgress(
      Number(currentRow?.purchaseOrderId),
      db
    );
  }
}

// ==================== 发票管理 CRUD ====================

const RECON_MARKER = "[RECONCILE]";
const INVOICE_MARKER = "[INVOICE]";

function parseReconcileMeta(rawRemark: unknown) {
  const lines = String(rawRemark ?? "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const markerLine = lines.find(line => line.startsWith(RECON_MARKER));
  if (!markerLine) return null;
  try {
    return JSON.parse(markerLine.slice(RECON_MARKER.length));
  } catch {
    return null;
  }
}

function normalizeDateOnlyString(value: unknown) {
  if (!value) return "";
  const text = String(value).trim();
  return text.includes("T") ? text.slice(0, 10) : text.slice(0, 10);
}

function normalizeIdList(raw: unknown) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : String(raw).split(/[,\s]+/);
          } catch {
            return String(raw).split(/[,\s]+/);
          }
        })()
      : [];

  return Array.from(
    new Set(
      list.map(item => Number(item)).filter(id => Number.isFinite(id) && id > 0)
    )
  ).sort((a, b) => a - b);
}

function parseInvoiceMeta(rawRemark: unknown) {
  const lines = String(rawRemark ?? "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const markerLine = lines.find(line => line.startsWith(INVOICE_MARKER));
  if (!markerLine) return null;
  try {
    return JSON.parse(markerLine.slice(INVOICE_MARKER.length));
  } catch {
    return null;
  }
}

function buildRemarkWithInvoice(
  meta: Record<string, any> | null,
  rawRemark: unknown
) {
  const lines = String(rawRemark ?? "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith(INVOICE_MARKER));
  if (!meta) return lines.join("\n");
  return [`${INVOICE_MARKER}${JSON.stringify(meta)}`, ...lines].join("\n");
}

function hasReceivedInvoiceEvidence(remark: unknown) {
  const reconcileMeta = parseReconcileMeta(remark);
  if (Boolean(reconcileMeta?.invoiceReceived)) return true;

  const invoiceMeta = parseInvoiceMeta(remark);
  if (!invoiceMeta) return false;
  return (
    String(invoiceMeta.direction || "") === "received" &&
    String(invoiceMeta.status || "") !== "cancelled"
  );
}

async function syncPurchaseOrderFinancialProgress(
  purchaseOrderId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !purchaseOrderId) return;

  await ensurePurchaseOrdersStatusEnum(db);
  await syncPurchaseOrderReceiptProgress(purchaseOrderId, db);

  const [order] = await db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      paymentStatus: purchaseOrders.paymentStatus,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, purchaseOrderId))
    .limit(1);
  if (!order) return;

  const payableRows = await db
    .select({
      amount: accountsPayable.amount,
      paidAmount: accountsPayable.paidAmount,
      status: accountsPayable.status,
      paymentMethod: accountsPayable.paymentMethod,
      remark: accountsPayable.remark,
    })
    .from(accountsPayable)
    .where(eq(accountsPayable.purchaseOrderId, purchaseOrderId));

  const totalAmount = payableRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.amount),
    0
  );
  const totalPaid = payableRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.paidAmount),
    0
  );

  let nextPaymentStatus: "unpaid" | "partial" | "paid" = "unpaid";
  if (
    payableRows.length > 0 &&
    totalPaid > 0.0001 &&
    totalPaid + 0.0001 < totalAmount
  ) {
    nextPaymentStatus = "partial";
  } else if (
    payableRows.length > 0 &&
    totalAmount > 0 &&
    totalPaid + 0.0001 >= totalAmount
  ) {
    nextPaymentStatus = "paid";
  } else if (
    payableRows.some(row => roundFinanceAmount(row.paidAmount) > 0.0001)
  ) {
    nextPaymentStatus = "partial";
  }

  const allPaid =
    payableRows.length > 0 &&
    payableRows.every(row => {
      const amount = roundFinanceAmount(row.amount);
      const paid = roundFinanceAmount(row.paidAmount);
      return String(row.status || "") === "paid" || paid + 0.0001 >= amount;
    });
  const requiresInvoice = payableRows.some(row =>
    isAccountPeriodPaymentCondition(
      normalizePaymentCondition(row.paymentMethod)
    )
  );
  const invoiceReceived =
    !requiresInvoice ||
    (payableRows.length > 0 &&
      payableRows.every(row => hasReceivedInvoiceEvidence(row.remark)));
  const receiptCompleted = ["received", "completed"].includes(
    String(order.status || "")
  );

  const updateData: Partial<InsertPurchaseOrder> = {};
  if (String(order.paymentStatus || "") !== nextPaymentStatus) {
    updateData.paymentStatus = nextPaymentStatus;
  }

  if (receiptCompleted && allPaid && invoiceReceived) {
    if (String(order.status || "") !== "completed") {
      updateData.status = "completed";
    }
  } else if (String(order.status || "") === "completed") {
    updateData.status = "received";
  }

  if (Object.keys(updateData).length === 0) return;
  await db
    .update(purchaseOrders)
    .set(updateData)
    .where(eq(purchaseOrders.id, purchaseOrderId));
}

export async function syncSalesOrderFinancialProgress(
  salesOrderId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !salesOrderId) return;

  await ensureSalesOrdersTradeFields(db);

  const [order] = await db
    .select({
      id: salesOrders.id,
      totalAmount: salesOrders.totalAmount,
      depositAmount: salesOrders.depositAmount,
      depositPaid: salesOrders.depositPaid,
      paymentStatus: salesOrders.paymentStatus,
    })
    .from(salesOrders)
    .where(eq(salesOrders.id, salesOrderId))
    .limit(1);
  if (!order) return;

  const receivableRows = await db
    .select({
      amount: accountsReceivable.amount,
      paidAmount: accountsReceivable.paidAmount,
    })
    .from(accountsReceivable)
    .where(eq(accountsReceivable.salesOrderId, salesOrderId));

  const receiptRows = await db
    .select({
      amount: paymentRecords.amount,
    })
    .from(paymentRecords)
    .where(
      and(
        eq(paymentRecords.type, "receipt"),
        eq(paymentRecords.relatedType, "sales_order"),
        eq(paymentRecords.relatedId, salesOrderId)
      )
    );

  const orderAmount = roundFinanceAmount(order.totalAmount);
  const receivableAmount = receivableRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.amount),
    0
  );
  const receivablePaid = receivableRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.paidAmount),
    0
  );
  const receiptTotal = receiptRows.reduce(
    (sum, row) => sum + roundFinanceAmount(row.amount),
    0
  );
  const paidTotal = Math.max(receivablePaid, receiptTotal);
  const expectedAmount = orderAmount > 0 ? orderAmount : receivableAmount;

  let nextPaymentStatus: "unpaid" | "partial" | "paid" = "unpaid";
  if (paidTotal > 0.0001) {
    nextPaymentStatus =
      expectedAmount > 0 && paidTotal + 0.0001 >= expectedAmount
        ? "paid"
        : "partial";
  }

  const updateData: Partial<InsertSalesOrder> = {};
  if (String(order.paymentStatus || "") !== nextPaymentStatus) {
    updateData.paymentStatus = nextPaymentStatus;
  }

  const depositTarget = roundFinanceAmount(order.depositAmount);
  const shouldTrackDeposit =
    depositTarget > 0 || roundFinanceAmount(order.depositPaid) > 0;
  if (shouldTrackDeposit) {
    const nextDepositPaid = Math.min(
      paidTotal,
      depositTarget > 0 ? depositTarget : paidTotal
    );
    if (
      Math.abs(roundFinanceAmount(order.depositPaid) - nextDepositPaid) > 0.0001
    ) {
      updateData.depositPaid = toDecimalString(nextDepositPaid) as any;
    }
  }

  if (Object.keys(updateData).length === 0) return;
  await db
    .update(salesOrders)
    .set(updateData)
    .where(eq(salesOrders.id, salesOrderId));
}

async function maybeAutoGenerateProductionPlansAfterReceipt(
  salesOrderId: number,
  createdBy?: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !salesOrderId) return false;

  const [order] = await db
    .select({
      paymentMethod: salesOrders.paymentMethod,
      paymentStatus: salesOrders.paymentStatus,
    })
    .from(salesOrders)
    .where(eq(salesOrders.id, salesOrderId))
    .limit(1);

  if (!order) return false;

  const paymentCondition = normalizePaymentCondition(order.paymentMethod);
  const shouldGenerate =
    paymentCondition === "预付款" ||
    (paymentCondition === "先款后货" &&
      String(order.paymentStatus || "") === "paid");

  if (!shouldGenerate) return false;

  await autoGenerateProductionPlans(salesOrderId, createdBy);
  return true;
}

function roundFinanceAmount(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function toLocalDateKey(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDateKey() {
  return toLocalDateKey(new Date());
}

function toDecimalString(value: unknown) {
  return toRoundedString(roundFinanceAmount(value), 2);
}

function getInvoiceMetaStatus(status: string) {
  const normalized = String(status || "").trim();
  if (normalized === "issued") return "issued";
  if (normalized === "cancelled" || normalized === "red_issued")
    return normalized;
  if (normalized === "booked") return "booked";
  return "draft";
}

async function syncIssuedInvoiceToReceivables(
  invoiceId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return;
  await ensureIssuedInvoicesTable(db);

  const [invoice] = await db
    .select()
    .from(issuedInvoices)
    .where(eq(issuedInvoices.id, invoiceId))
    .limit(1);
  if (!invoice) return;

  const receivableIds = normalizeIdList(invoice.receivableIds);
  if (receivableIds.length === 0) return;

  const receivableRows = await db
    .select({
      id: accountsReceivable.id,
      invoiceNo: accountsReceivable.invoiceNo,
      invoiceDate: accountsReceivable.invoiceDate,
      remark: accountsReceivable.remark,
    })
    .from(accountsReceivable)
    .where(inArray(accountsReceivable.id, receivableIds));

  const meta = {
    direction: "issued",
    invoiceId: Number(invoice.id),
    status: getInvoiceMetaStatus(String(invoice.status || "")),
    invoiceNo: String(invoice.invoiceNo || ""),
    invoiceDate: normalizeDateOnlyString(invoice.invoiceDate),
    totalAmount: roundFinanceAmount(invoice.totalAmount),
    reconcileMonth: String(invoice.reconcileMonth || ""),
  };

  await Promise.all(
    receivableRows.map(row =>
      db
        .update(accountsReceivable)
        .set({
          invoiceNo:
            String(invoice.status || "") === "issued" && invoice.invoiceNo
              ? String(invoice.invoiceNo)
              : row.invoiceNo,
          invoiceDate:
            String(invoice.status || "") === "issued" && invoice.invoiceDate
              ? invoice.invoiceDate
              : row.invoiceDate,
          remark: buildRemarkWithInvoice(meta, row.remark),
        })
        .where(eq(accountsReceivable.id, row.id))
    )
  );
}

async function resolveReceivedInvoicePayableIds(
  data: Partial<InsertReceivedInvoice> & { payableIds?: number[] },
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return [];
  await ensureCollaborationDataModel(db);
  const explicitIds = normalizeIdList(
    (data.payableIds ?? data.payableIds === null) ? [] : data.payableIds
  );
  if (explicitIds.length > 0) {
    if (!(data as any).companyId) return explicitIds;
    const rows = await db
      .select({ id: accountsPayable.id })
      .from(accountsPayable)
      .where(
        and(
          inArray(accountsPayable.id, explicitIds),
          eq(
            (accountsPayable as any).companyId,
            Number((data as any).companyId)
          )
        )
      );
    return rows
      .map(row => Number(row.id))
      .filter(id => Number.isFinite(id) && id > 0)
      .sort((a, b) => a - b);
  }

  const orderNos = String(data.relatedOrderNo || "")
    .split(/[,\n;；、]+/)
    .map(value => value.trim())
    .filter(Boolean);

  if (orderNos.length === 0) return [];

  await ensureAccountsPayableSupplierNameColumn(db);
  const rows = await db
    .select({
      id: accountsPayable.id,
      supplierId: accountsPayable.supplierId,
      supplierName: sql<string>`COALESCE(${accountsPayable.supplierName}, ${suppliers.name})`,
      orderNo: purchaseOrders.orderNo,
    })
    .from(accountsPayable)
    .leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id))
    .leftJoin(
      purchaseOrders,
      eq(accountsPayable.purchaseOrderId, purchaseOrders.id)
    )
    .where(
      and(
        inArray(purchaseOrders.orderNo, orderNos),
        (data as any).companyId
          ? eq(
              (accountsPayable as any).companyId,
              Number((data as any).companyId)
            )
          : sql`1=1`
      )
    );

  const supplierName = String(data.supplierName || "").trim();
  const matched = rows.filter(row => {
    if (data.supplierId && Number(row.supplierId) !== Number(data.supplierId))
      return false;
    if (supplierName && supplierName !== String(row.supplierName || "").trim())
      return false;
    return true;
  });

  return Array.from(
    new Set(
      matched
        .map(row => Number(row.id))
        .filter(id => Number.isFinite(id) && id > 0)
    )
  ).sort((a, b) => a - b);
}

async function syncReceivedInvoiceToPayables(
  invoiceId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return;
  await ensureReceivedInvoicesTable(db);
  await ensureAccountsPayableSupplierNameColumn(db);

  const [invoice] = await db
    .select()
    .from(receivedInvoices)
    .where(eq(receivedInvoices.id, invoiceId))
    .limit(1);
  if (!invoice) return;

  const payableIds = normalizeIdList(invoice.payableIds);
  if (payableIds.length === 0) return;

  const payableRows = await db
    .select({
      id: accountsPayable.id,
      purchaseOrderId: accountsPayable.purchaseOrderId,
      remark: accountsPayable.remark,
    })
    .from(accountsPayable)
    .where(inArray(accountsPayable.id, payableIds));

  const meta = {
    direction: "received",
    invoiceId: Number(invoice.id),
    status: getInvoiceMetaStatus(String(invoice.status || "")),
    invoiceNo: String(invoice.invoiceNo || ""),
    invoiceDate: normalizeDateOnlyString(invoice.invoiceDate),
    totalAmount: roundFinanceAmount(invoice.totalAmount),
  };

  await Promise.all(
    payableRows.map(row =>
      db
        .update(accountsPayable)
        .set({
          invoiceNo: String(invoice.invoiceNo || ""),
          invoiceDate: invoice.invoiceDate || null,
          remark: buildRemarkWithInvoice(meta, row.remark),
        })
        .where(eq(accountsPayable.id, row.id))
    )
  );

  const purchaseOrderIds = Array.from(
    new Set(
      payableRows
        .map(row => Number(row.purchaseOrderId || 0))
        .filter(id => Number.isFinite(id) && id > 0)
    )
  );
  for (const purchaseOrderId of purchaseOrderIds) {
    await syncPurchaseOrderFinancialProgress(purchaseOrderId, db);
  }
}

function mapReceivedInvoiceRecord(row: any) {
  return {
    ...row,
    payableIds: normalizeIdList(row?.payableIds),
    invoiceDate: normalizeDateOnlyString(row?.invoiceDate),
    receiveDate: normalizeDateOnlyString(row?.receiveDate),
    amountExTax: roundFinanceAmount(row?.amountExTax),
    taxRate: roundFinanceAmount(row?.taxRate),
    taxAmount: roundFinanceAmount(row?.taxAmount),
    totalAmount: roundFinanceAmount(row?.totalAmount),
  };
}

function mapIssuedInvoiceRecord(row: any) {
  return {
    ...row,
    receivableIds: normalizeIdList(row?.receivableIds),
    invoiceDate: normalizeDateOnlyString(row?.invoiceDate),
    amountExTax: roundFinanceAmount(row?.amountExTax),
    taxRate: roundFinanceAmount(row?.taxRate),
    taxAmount: roundFinanceAmount(row?.taxAmount),
    totalAmount: roundFinanceAmount(row?.totalAmount),
  };
}

export async function getReceivedInvoices(params?: {
  search?: string;
  status?: string;
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureReceivedInvoicesTable(db);
  await ensureCollaborationDataModel(db);
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(receivedInvoices.invoiceNo, `%${params.search}%`),
        like(receivedInvoices.supplierName, `%${params.search}%`),
        like(receivedInvoices.relatedOrderNo, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(receivedInvoices.status, params.status as any));
  if (params?.companyId)
    conditions.push(eq((receivedInvoices as any).companyId, params.companyId));

  let query = db.select().from(receivedInvoices);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const rows = await query
    .orderBy(desc(receivedInvoices.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
  return rows.map(mapReceivedInvoiceRecord);
}

export async function getReceivedInvoiceById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureReceivedInvoicesTable(db);
  await ensureCollaborationDataModel(db);
  const conditions = [eq(receivedInvoices.id, id)];
  if (companyId) {
    conditions.push(eq((receivedInvoices as any).companyId, companyId));
  }
  const [row] = await db
    .select()
    .from(receivedInvoices)
    .where(and(...conditions))
    .limit(1);
  return row ? mapReceivedInvoiceRecord(row) : undefined;
}

export async function createReceivedInvoice(
  data: InsertReceivedInvoice & { payableIds?: number[] }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureReceivedInvoicesTable(db);
  await ensureCollaborationDataModel(db);
  const payableIds = await resolveReceivedInvoicePayableIds(data, db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(
    (data as any).companyId,
    mainCompanyId
  );
  const result = await db.insert(receivedInvoices).values({
    ...data,
    companyId: scopedCompanyId,
    payableIds: payableIds.length > 0 ? JSON.stringify(payableIds) : null,
  });
  const invoiceId = Number(result[0]?.insertId || 0);
  if (invoiceId > 0) {
    await syncReceivedInvoiceToPayables(invoiceId, db);
  }
  return invoiceId;
}

export async function updateReceivedInvoice(
  id: number,
  data: Partial<InsertReceivedInvoice> & { payableIds?: number[] }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureReceivedInvoicesTable(db);
  const payableIds =
    data.payableIds !== undefined
      ? normalizeIdList(data.payableIds)
      : await resolveReceivedInvoicePayableIds(data, db);
  await db
    .update(receivedInvoices)
    .set({
      ...data,
      payableIds:
        data.payableIds !== undefined || payableIds.length > 0
          ? payableIds.length > 0
            ? JSON.stringify(payableIds)
            : null
          : undefined,
    })
    .where(eq(receivedInvoices.id, id));
  await syncReceivedInvoiceToPayables(id, db);
}

export async function deleteReceivedInvoice(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureReceivedInvoicesTable(db);
  const [invoice] = await db
    .select()
    .from(receivedInvoices)
    .where(eq(receivedInvoices.id, id))
    .limit(1);
  await deleteSingleWithRecycle(db, {
    table: receivedInvoices,
    idColumn: receivedInvoices.id,
    id,
    entityType: "收票记录",
    sourceTable: "received_invoices",
    deletedBy,
  });
  const payableIds = normalizeIdList(invoice?.payableIds);
  if (payableIds.length === 0) return;
  const payableRows = await db
    .select({
      id: accountsPayable.id,
      purchaseOrderId: accountsPayable.purchaseOrderId,
      remark: accountsPayable.remark,
    })
    .from(accountsPayable)
    .where(inArray(accountsPayable.id, payableIds));
  await Promise.all(
    payableRows.map(row =>
      db
        .update(accountsPayable)
        .set({
          invoiceNo: sql`NULL`,
          invoiceDate: sql`NULL`,
          remark: buildRemarkWithInvoice(null, row.remark),
        })
        .where(eq(accountsPayable.id, row.id))
    )
  );
  const purchaseOrderIds = Array.from(
    new Set(
      payableRows
        .map(row => Number(row.purchaseOrderId || 0))
        .filter(orderId => Number.isFinite(orderId) && orderId > 0)
    )
  );
  for (const purchaseOrderId of purchaseOrderIds) {
    await syncPurchaseOrderFinancialProgress(purchaseOrderId, db);
  }
}

export async function getIssuedInvoices(params?: {
  search?: string;
  status?: string;
  customerId?: number;
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureIssuedInvoicesTable(db);
  await ensureCollaborationDataModel(db);
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(issuedInvoices.invoiceNo, `%${params.search}%`),
        like(issuedInvoices.customerName, `%${params.search}%`),
        like(issuedInvoices.relatedOrderNo, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(issuedInvoices.status, params.status as any));
  if (params?.customerId)
    conditions.push(eq(issuedInvoices.customerId, params.customerId));
  if (params?.companyId)
    conditions.push(eq((issuedInvoices as any).companyId, params.companyId));

  let query = db.select().from(issuedInvoices);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const rows = await query
    .orderBy(desc(issuedInvoices.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
  return rows.map(mapIssuedInvoiceRecord);
}

export async function getIssuedInvoiceById(id: number, companyId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureIssuedInvoicesTable(db);
  await ensureCollaborationDataModel(db);
  const conditions = [eq(issuedInvoices.id, id)];
  if (companyId) {
    conditions.push(eq((issuedInvoices as any).companyId, companyId));
  }
  const [row] = await db
    .select()
    .from(issuedInvoices)
    .where(and(...conditions))
    .limit(1);
  return row ? mapIssuedInvoiceRecord(row) : undefined;
}

export async function createIssuedInvoice(
  data: InsertIssuedInvoice & { receivableIds?: number[] }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIssuedInvoicesTable(db);
  await ensureCollaborationDataModel(db);
  const mainCompanyId = await getMainCompanyId(db);
  const scopedCompanyId = normalizeCompanyId(
    (data as any).companyId,
    mainCompanyId
  );
  const requestedReceivableIds = normalizeIdList(data.receivableIds);
  const receivableIds =
    requestedReceivableIds.length > 0
      ? (
          await db
            .select({ id: accountsReceivable.id })
            .from(accountsReceivable)
            .where(
              and(
                inArray(accountsReceivable.id, requestedReceivableIds),
                eq((accountsReceivable as any).companyId, scopedCompanyId)
              )
            )
        )
          .map(row => Number(row.id))
          .filter(id => Number.isFinite(id) && id > 0)
          .sort((a, b) => a - b)
      : [];
  const result = await db.insert(issuedInvoices).values({
    ...data,
    companyId: scopedCompanyId,
    receivableIds:
      receivableIds.length > 0 ? JSON.stringify(receivableIds) : null,
  });
  const invoiceId = Number(result[0]?.insertId || 0);
  if (invoiceId > 0) {
    await syncIssuedInvoiceToReceivables(invoiceId, db);
  }
  return invoiceId;
}

export async function updateIssuedInvoice(
  id: number,
  data: Partial<InsertIssuedInvoice> & { receivableIds?: number[] }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIssuedInvoicesTable(db);
  const receivableIds =
    data.receivableIds !== undefined
      ? normalizeIdList(data.receivableIds)
      : null;
  await db
    .update(issuedInvoices)
    .set({
      ...data,
      receivableIds: receivableIds
        ? receivableIds.length > 0
          ? JSON.stringify(receivableIds)
          : null
        : undefined,
    })
    .where(eq(issuedInvoices.id, id));
  await syncIssuedInvoiceToReceivables(id, db);
}

export async function deleteIssuedInvoice(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIssuedInvoicesTable(db);
  await deleteSingleWithRecycle(db, {
    table: issuedInvoices,
    idColumn: issuedInvoices.id,
    id,
    entityType: "开票记录",
    sourceTable: "issued_invoices",
    deletedBy,
  });
}

export async function createOrGetIssuedInvoiceDraftFromReceivables(params: {
  customerId?: number | null;
  customerName?: string | null;
  reconcileMonth?: string | null;
  receivableIds: number[];
  companyId?: number | null;
  createdBy?: number | null;
  bankAccountId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIssuedInvoicesTable(db);
  await ensureCollaborationDataModel(db);

  const receivableIds = normalizeIdList(params.receivableIds);
  if (receivableIds.length === 0) {
    throw new Error("缺少可开票的应收记录");
  }

  const receivableRows = await db
    .select({
      id: accountsReceivable.id,
      customerId: accountsReceivable.customerId,
      customerName: customers.name,
      salesOrderId: accountsReceivable.salesOrderId,
      orderNo: salesOrders.orderNo,
      amount: accountsReceivable.amount,
      amountBase: accountsReceivable.amountBase,
      currency: accountsReceivable.currency,
      remark: accountsReceivable.remark,
      dueDate: accountsReceivable.dueDate,
      taxRate: customers.taxRate,
    })
    .from(accountsReceivable)
    .leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
    .leftJoin(salesOrders, eq(accountsReceivable.salesOrderId, salesOrders.id))
    .where(
      and(
        inArray(accountsReceivable.id, receivableIds),
        params.companyId
          ? eq((accountsReceivable as any).companyId, params.companyId)
          : sql`1=1`
      )
    );

  if (receivableRows.length === 0) {
    throw new Error("未找到对应的应收记录");
  }

  const normalizedIds = receivableRows
    .map(row => Number(row.id))
    .filter(id => Number.isFinite(id) && id > 0)
    .sort((a, b) => a - b);

  const customerId =
    Number(params.customerId || receivableRows[0]?.customerId || 0) || null;
  const customerName = String(
    params.customerName || receivableRows[0]?.customerName || ""
  ).trim();
  const reconcileMonth = String(
    params.reconcileMonth ||
      parseInvoiceMeta(receivableRows[0]?.remark)?.reconcileMonth ||
      ""
  ).trim();
  const taxRate = roundFinanceAmount(receivableRows[0]?.taxRate || 13);
  const totalAmount = roundFinanceAmount(
    receivableRows.reduce(
      (sum, row) => sum + Number(row.amountBase ?? row.amount ?? 0),
      0
    )
  );
  const amountExTax =
    taxRate <= 0
      ? totalAmount
      : roundFinanceAmount(totalAmount / (1 + taxRate / 100));
  const taxAmount = roundFinanceAmount(totalAmount - amountExTax);
  const relatedOrderNo = Array.from(
    new Set(
      receivableRows
        .map(row => String(row.orderNo || "").trim())
        .filter(Boolean)
    )
  ).join("、");

  const existingDrafts = await db
    .select()
    .from(issuedInvoices)
    .where(
      and(
        params.companyId
          ? eq((issuedInvoices as any).companyId, params.companyId)
          : sql`1=1`,
        customerId ? eq(issuedInvoices.customerId, customerId) : sql`1=1`,
        reconcileMonth
          ? eq(issuedInvoices.reconcileMonth, reconcileMonth)
          : sql`1=1`
      )
    )
    .orderBy(desc(issuedInvoices.updatedAt));

  const matched = existingDrafts.find(row => {
    const rowIds = normalizeIdList(row.receivableIds);
    return (
      rowIds.length === normalizedIds.length &&
      rowIds.every((id, index) => id === normalizedIds[index])
    );
  });

  if (matched) {
    return mapIssuedInvoiceRecord(matched);
  }

  const invoiceId = await createIssuedInvoice({
    companyId: params.companyId ?? null,
    invoiceNo: null,
    invoiceType: "vat_special",
    customerId,
    customerName,
    receivableIds: normalizedIds,
    relatedOrderNo: relatedOrderNo || null,
    reconcileMonth: reconcileMonth || null,
    invoiceDate: new Date() as any,
    amountExTax: toDecimalString(amountExTax),
    taxRate: toDecimalString(taxRate),
    taxAmount: toDecimalString(taxAmount),
    totalAmount: toDecimalString(totalAmount),
    bankAccountId: params.bankAccountId ?? null,
    bankAccount: null,
    status: "draft",
    remark: reconcileMonth ? `来源对账月份：${reconcileMonth}` : null,
    createdBy: params.createdBy ?? null,
  });

  const created = await getIssuedInvoiceById(invoiceId);
  if (!created) throw new Error("开票草稿创建失败");
  return created;
}

// ==================== 经销商资质 CRUD ====================

export async function getDealerQualifications(params?: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(customers.code, `%${params.search}%`),
        like(customers.name, `%${params.search}%`),
        like(customers.contactPerson, `%${params.search}%`)
      )
    );
  }
  if (params?.status) {
    conditions.push(eq(dealerQualifications.status, params.status as any));
  }

  let query = db
    .select({
      id: dealerQualifications.id,
      customerId: dealerQualifications.customerId,
      dealerNo: customers.code,
      name: customers.name,
      customerName: customers.name,
      contactPerson: customers.contactPerson,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      paymentTerms: customers.paymentTerms,
      creditLimit: customers.creditLimit,
      businessLicense: dealerQualifications.businessLicense,
      medicalLicense: dealerQualifications.operatingLicense,
      operatingLicense: dealerQualifications.operatingLicense,
      licenseExpiry: dealerQualifications.licenseExpiry,
      medicalLicenseExpiry: dealerQualifications.licenseExpiry,
      authorizationNo: dealerQualifications.authorizationNo,
      authExpiry: dealerQualifications.authorizationExpiry,
      authorizationExpiry: dealerQualifications.authorizationExpiry,
      territory: dealerQualifications.territory,
      contractNo: dealerQualifications.contractNo,
      contractEndDate: dealerQualifications.contractExpiry,
      contractExpiry: dealerQualifications.contractExpiry,
      status: dealerQualifications.status,
      createdAt: dealerQualifications.createdAt,
      updatedAt: dealerQualifications.updatedAt,
    })
    .from(dealerQualifications)
    .leftJoin(customers, eq(dealerQualifications.customerId, customers.id));
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query
    .orderBy(desc(dealerQualifications.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getDealerQualificationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dealerQualifications)
    .where(eq(dealerQualifications.id, id))
    .limit(1);
  return result[0];
}

export async function createDealerQualification(
  data: InsertDealerQualification
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(dealerQualifications).values(data);
  return result[0].insertId;
}

export async function updateDealerQualification(
  id: number,
  data: Partial<InsertDealerQualification>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db
    .update(dealerQualifications)
    .set(data)
    .where(eq(dealerQualifications.id, id));
}

export async function deleteDealerQualification(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: dealerQualifications,
    idColumn: dealerQualifications.id,
    id,
    entityType: "首营资质",
    sourceTable: "dealer_qualifications",
    deletedBy,
  });
}

// ==================== 设备管理 CRUD ====================

async function ensureEquipmentSupportTables(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db) return;

  if (!equipmentExtendedColumnsReady) {
    const columns = [
      { name: "warrantyDate", ddl: "DATE NULL" },
      { name: "responsible", ddl: "VARCHAR(100) NULL" },
      { name: "inspectionRequirement", ddl: "TEXT NULL" },
      { name: "maintenanceRequirement", ddl: "TEXT NULL" },
      { name: "lastMaintenanceDate", ddl: "DATE NULL" },
      { name: "maintenanceCycle", ddl: "INT NULL DEFAULT 30" },
      { name: "assetValue", ddl: "DECIMAL(14,2) NULL DEFAULT 0.00" },
      { name: "certNo", ddl: "VARCHAR(100) NULL" },
      { name: "equipmentCategory", ddl: "ENUM('equipment','instrument') NOT NULL DEFAULT 'equipment'" },
      { name: "calibrationCycle", ddl: "VARCHAR(50) NULL" },
      { name: "lastCalibrationDate", ddl: "DATE NULL" },
      { name: "nextCalibrationDate", ddl: "DATE NULL" },
      { name: "inspectionTemplate", ddl: "TEXT NULL" },
      { name: "maintenanceTemplate", ddl: "TEXT NULL" },
    ];

    for (const col of columns) {
      try {
        await db.execute(
          sql.raw(`ALTER TABLE equipment ADD COLUMN ${col.name} ${col.ddl}`)
        );
      } catch (error: any) {
        const message = String(error?.message || error || "");
        if (
          !message.includes("Duplicate column name") &&
          !message.includes("already exists")
        ) {
          console.warn(
            `[DB] Could not add column ${col.name} to equipment:`,
            message
          );
        }
      }
    }

    equipmentExtendedColumnsReady = true;
  }

  if (!equipmentInspectionTablesReady) {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS equipment_inspections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inspectionNo VARCHAR(50) NOT NULL UNIQUE,
        equipmentId INT NOT NULL,
        equipmentCode VARCHAR(50) NULL,
        equipmentName VARCHAR(200) NOT NULL,
        equipmentModel VARCHAR(100) NULL,
        equipmentLocation VARCHAR(100) NULL,
        equipmentDepartment VARCHAR(50) NULL,
        equipmentResponsible VARCHAR(100) NULL,
        inspectionDate DATE NULL,
        inspectionType ENUM('daily','shift','weekly','monthly','special') NOT NULL DEFAULT 'daily',
        inspector VARCHAR(100) NULL,
        reviewer VARCHAR(100) NULL,
        result ENUM('normal','abnormal','shutdown') NOT NULL DEFAULT 'normal',
        status ENUM('draft','completed') NOT NULL DEFAULT 'draft',
        detailItems TEXT NULL,
        remark TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    equipmentInspectionTablesReady = true;
  }

  if (!equipmentMaintenanceTablesReady) {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS equipment_maintenances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        maintenanceNo VARCHAR(50) NOT NULL UNIQUE,
        equipmentId INT NOT NULL,
        equipmentCode VARCHAR(50) NULL,
        equipmentName VARCHAR(200) NOT NULL,
        equipmentModel VARCHAR(100) NULL,
        equipmentLocation VARCHAR(100) NULL,
        equipmentDepartment VARCHAR(50) NULL,
        equipmentResponsible VARCHAR(100) NULL,
        maintenanceDate DATE NULL,
        maintenanceType ENUM('routine','periodic','annual','special') NOT NULL DEFAULT 'routine',
        executor VARCHAR(100) NULL,
        reviewer VARCHAR(100) NULL,
        status ENUM('planned','in_progress','completed') NOT NULL DEFAULT 'planned',
        result ENUM('pass','need_repair','pending') NOT NULL DEFAULT 'pending',
        nextMaintenanceDate DATE NULL,
        detailItems TEXT NULL,
        remark TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    equipmentMaintenanceTablesReady = true;
  }
}

function parseDetailItems<T = any[]>(value: unknown): T {
  if (!value) return [] as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return [] as T;
  }
}

function withParsedDetailItems<T extends { detailItems?: unknown }>(
  row: T
): T & { detailItems: any[] } {
  return {
    ...row,
    detailItems: parseDetailItems(row.detailItems),
  };
}

export async function getEquipment(params?: {
  search?: string;
  status?: string;
  department?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureEquipmentSupportTables(db);
  const conditions = [];
  if (params?.search)
    conditions.push(
      or(
        like(equipment.code, `%${params.search}%`),
        like(equipment.name, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(equipment.status, params.status as any));
  if (params?.department)
    conditions.push(eq(equipment.department, params.department));
  let query = db.select().from(equipment);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(equipment.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getEquipmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureEquipmentSupportTables(db);
  const result = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, id))
    .limit(1);
  return result[0];
}

export async function createEquipment(data: InsertEquipment) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  const result = await db.insert(equipment).values(data);
  return result[0].insertId;
}

export async function updateEquipment(
  id: number,
  data: Partial<InsertEquipment>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  await db.update(equipment).set(data).where(eq(equipment.id, id));
}

export async function deleteEquipment(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  await deleteSingleWithRecycle(db, {
    table: equipment,
    idColumn: equipment.id,
    id,
    entityType: "设备台账",
    sourceTable: "equipment",
    deletedBy,
  });
}

export async function getEquipmentInspections(params?: {
  search?: string;
  status?: string;
  result?: string;
  equipmentId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureEquipmentSupportTables(db);
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(equipmentInspections.inspectionNo, `%${params.search}%`),
        like(equipmentInspections.equipmentCode, `%${params.search}%`),
        like(equipmentInspections.equipmentName, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(equipmentInspections.status, params.status as any));
  if (params?.result)
    conditions.push(eq(equipmentInspections.result, params.result as any));
  if (params?.equipmentId)
    conditions.push(eq(equipmentInspections.equipmentId, params.equipmentId));
  let query = db.select().from(equipmentInspections);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const rows = await query
    .orderBy(
      desc(equipmentInspections.inspectionDate),
      desc(equipmentInspections.createdAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
  return rows.map(row => withParsedDetailItems(row));
}

export async function getEquipmentInspectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureEquipmentSupportTables(db);
  const [row] = await db
    .select()
    .from(equipmentInspections)
    .where(eq(equipmentInspections.id, id))
    .limit(1);
  return row ? withParsedDetailItems(row) : undefined;
}

export async function createEquipmentInspection(
  data: InsertEquipmentInspection
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  const result = await db.insert(equipmentInspections).values(data);
  return result[0].insertId;
}

export async function updateEquipmentInspection(
  id: number,
  data: Partial<InsertEquipmentInspection>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  await db
    .update(equipmentInspections)
    .set(data)
    .where(eq(equipmentInspections.id, id));
}

export async function deleteEquipmentInspection(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  await deleteSingleWithRecycle(db, {
    table: equipmentInspections,
    idColumn: equipmentInspections.id,
    id,
    entityType: "设备点检",
    sourceTable: "equipment_inspections",
    deletedBy,
  });
}

export async function getEquipmentMaintenances(params?: {
  search?: string;
  status?: string;
  result?: string;
  equipmentId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureEquipmentSupportTables(db);
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(equipmentMaintenances.maintenanceNo, `%${params.search}%`),
        like(equipmentMaintenances.equipmentCode, `%${params.search}%`),
        like(equipmentMaintenances.equipmentName, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(equipmentMaintenances.status, params.status as any));
  if (params?.result)
    conditions.push(eq(equipmentMaintenances.result, params.result as any));
  if (params?.equipmentId)
    conditions.push(eq(equipmentMaintenances.equipmentId, params.equipmentId));
  let query = db.select().from(equipmentMaintenances);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const rows = await query
    .orderBy(
      desc(equipmentMaintenances.maintenanceDate),
      desc(equipmentMaintenances.createdAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
  return rows.map(row => withParsedDetailItems(row));
}

export async function getEquipmentMaintenanceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureEquipmentSupportTables(db);
  const [row] = await db
    .select()
    .from(equipmentMaintenances)
    .where(eq(equipmentMaintenances.id, id))
    .limit(1);
  return row ? withParsedDetailItems(row) : undefined;
}

export async function createEquipmentMaintenance(
  data: InsertEquipmentMaintenance
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  const result = await db.insert(equipmentMaintenances).values(data);
  if (data.equipmentId && data.status === "completed") {
    await db
      .update(equipment)
      .set({
        status: data.result === "need_repair" ? "repair" : "normal",
        lastMaintenanceDate: data.maintenanceDate,
        nextMaintenanceDate: data.nextMaintenanceDate,
      })
      .where(eq(equipment.id, data.equipmentId));
  }
  return result[0].insertId;
}

export async function updateEquipmentMaintenance(
  id: number,
  data: Partial<InsertEquipmentMaintenance>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  await db
    .update(equipmentMaintenances)
    .set(data)
    .where(eq(equipmentMaintenances.id, id));
  const [current] = await db
    .select()
    .from(equipmentMaintenances)
    .where(eq(equipmentMaintenances.id, id))
    .limit(1);
  if (current?.equipmentId && current.status === "completed") {
    await db
      .update(equipment)
      .set({
        status: current.result === "need_repair" ? "repair" : "normal",
        lastMaintenanceDate: current.maintenanceDate,
        nextMaintenanceDate: current.nextMaintenanceDate,
      })
      .where(eq(equipment.id, current.equipmentId));
  }
}

export async function deleteEquipmentMaintenance(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEquipmentSupportTables(db);
  await deleteSingleWithRecycle(db, {
    table: equipmentMaintenances,
    idColumn: equipmentMaintenances.id,
    id,
    entityType: "设备保养",
    sourceTable: "equipment_maintenances",
    deletedBy,
  });
}

// ==================== 通用订单号生成 ====================

export async function getNextOrderNo(
  prefix: string,
  table: any,
  field: any
): Promise<string> {
  const managedSpec = findManagedCodeRuleSpecByPrefix(prefix);
  if (managedSpec) {
    return await allocateManagedCodeRuleNo(managedSpec.module);
  }
  const db = await getDb();
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;
  if (!db) return `${fullPrefix}0001`;
  const [latest] = await db
    .select({ no: field })
    .from(table)
    .where(like(field, `${fullPrefix}%`))
    .orderBy(desc(field))
    .limit(1);
  if (!latest) return `${fullPrefix}0001`;
  const seq = parseInt(latest.no.replace(fullPrefix, ""), 10);
  return `${fullPrefix}${String(isNaN(seq) ? 1 : seq + 1).padStart(4, "0")}`;
}

// ==================== 生产计划（看板）CRUD ====================
export async function getProductionPlans(params?: {
  search?: string;
  status?: string;
  planType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureProductionPlansSupplierColumns(db);
  await ensureProductionPlansStatusEnum(db);
  const conditions: any[] = [];
  if (params?.search) {
    conditions.push(
      or(
        like(productionPlans.planNo, `%${params.search}%`),
        like(productionPlans.productName, `%${params.search}%`),
        like(productionPlans.salesOrderNo, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(productionPlans.status, params.status as any));
  if (params?.planType)
    conditions.push(eq(productionPlans.planType, params.planType as any));
  let query = db
    .select({
      id: productionPlans.id,
      planNo: productionPlans.planNo,
      planType: productionPlans.planType,
      salesOrderId: productionPlans.salesOrderId,
      salesOrderNo: productionPlans.salesOrderNo,
      productionOrderId: productionPlans.productionOrderId,
      productId: productionPlans.productId,
      productName: productionPlans.productName,
      supplierId: productionPlans.supplierId,
      supplierName: productionPlans.supplierName,
      plannedQty: productionPlans.plannedQty,
      unit: productionPlans.unit,
      batchNo: productionPlans.batchNo,
      plannedStartDate: productionPlans.plannedStartDate,
      plannedEndDate: productionPlans.plannedEndDate,
      priority: productionPlans.priority,
      status: productionPlans.status,
      remark: productionPlans.remark,
      createdBy: productionPlans.createdBy,
      createdAt: productionPlans.createdAt,
      updatedAt: productionPlans.updatedAt,
      productSourceType: products.sourceType,
      productProcurePermission: products.procurePermission,
      productIsSterilized: products.isSterilized,
      productSpecification: products.specification,
      productCode: products.code,
      productManufacturer: products.manufacturer,
      productRegistrationNo: products.registrationNo,
      productUnit: products.unit,
      productCategory: products.productCategory,
    })
    .from(productionPlans)
    .leftJoin(products, eq(productionPlans.productId, products.id));
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  const rows = await query
    .orderBy(
      asc(productionPlans.plannedEndDate),
      desc(productionPlans.createdAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);

  const nextRows = await Promise.all(
    rows.map(async (row) => {
      const productId = Number(row.productId || 0);
      const isPurchasable =
        String(row.productSourceType || "") === "purchase" ||
        String(row.productProcurePermission || "") === "purchasable";

      if (!productId || !isPurchasable || String(row.status || "") !== "pending") {
        return row;
      }

      const latestSupplier = await getPlanSupplierInfo(productId, db);
      const latestSupplierId = Number(latestSupplier?.supplierId || 0) || null;
      const currentSupplierId = Number(row.supplierId || 0) || null;
      const latestSupplierName = String(latestSupplier?.supplierName || "");
      const currentSupplierName = String(row.supplierName || "");

      if (
        latestSupplierId === currentSupplierId &&
        latestSupplierName === currentSupplierName
      ) {
        return row;
      }

      await db
        .update(productionPlans)
        .set({
          supplierId: latestSupplierId as any,
          supplierName: (latestSupplierName || null) as any,
        })
        .where(eq(productionPlans.id, Number(row.id)));

      return {
        ...row,
        supplierId: latestSupplierId,
        supplierName: latestSupplierName,
      };
    })
  );

  return nextRows;
}
export async function getProductionPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureProductionPlansStatusEnum(db);
  const result = await db
    .select()
    .from(productionPlans)
    .where(eq(productionPlans.id, id))
    .limit(1);
  return result[0];
}
export async function createProductionPlan(data: InsertProductionPlan) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionPlansSupplierColumns(db);
  await ensureProductionPlansStatusEnum(db);
  const planNo = await resolveManagedCodeRuleNo(
    "生产计划",
    (data as any).planNo
  );
  const supplierInfo = data.productId
    ? await getPlanSupplierInfo(Number(data.productId), db)
    : null;
  const result = await db.insert(productionPlans).values({
    ...data,
    planNo,
    supplierId: data.supplierId ?? supplierInfo?.supplierId ?? undefined,
    supplierName: data.supplierName ?? supplierInfo?.supplierName ?? undefined,
  });
  return result[0].insertId;
}
export async function updateProductionPlan(
  id: number,
  data: Partial<InsertProductionPlan>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionPlansSupplierColumns(db);
  await ensureProductionPlansStatusEnum(db);
  await db.update(productionPlans).set(data).where(eq(productionPlans.id, id));
}
/**
 * 自动检查库存并生成生产计划
 * 当销售订单审批通过（账期支付）或财务确认收款后调用
 * 遍历订单产品明细，库存不足的自动生成待排产计划
 */
export async function autoGenerateProductionPlans(
  salesOrderId: number,
  createdBy?: number
) {
  const db = await getDb();
  if (!db) return;
  await ensureProductsSterilizedColumn(db);
  await ensureProductionPlansSupplierColumns(db);
  try {
    // 获取销售订单信息
    const [order] = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.id, salesOrderId))
      .limit(1);
    if (!order) return;
    // 获取订单产品明细
    const items = await db
      .select({
        productId: salesOrderItems.productId,
        quantity: salesOrderItems.quantity,
        unit: salesOrderItems.unit,
      })
      .from(salesOrderItems)
      .where(eq(salesOrderItems.orderId, salesOrderId));
    if (!items.length) return;

    for (const item of items) {
      const requiredQty = Number(item.quantity) || 0;
      if (requiredQty <= 0) continue;

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      const isPurchasableProduct =
        String(product?.sourceType || "") === "purchase" ||
        String(product?.procurePermission || "") === "purchasable";

      // 采购型产品不看库存，销售订单通过后直接进入采购计划
      if (isPurchasableProduct) {
        const existing = await db
          .select({ id: productionPlans.id })
          .from(productionPlans)
          .where(
            and(
              eq(productionPlans.salesOrderId, salesOrderId),
              eq(productionPlans.productId, item.productId),
              eq(productionPlans.status, "pending")
            )
          )
          .limit(1);
        if (existing.length > 0) continue;

        const supplierInfo = await getPlanSupplierInfo(item.productId, db);
        const now = new Date();
        const planNo = await allocateManagedCodeRuleNo("生产计划", now);

        await db.insert(productionPlans).values({
          planNo,
          planType: "sales_driven",
          salesOrderId,
          salesOrderNo: order.orderNo,
          productId: item.productId,
          productName: product?.name || `产品#${item.productId}`,
          supplierId: supplierInfo?.supplierId ?? undefined,
          supplierName: supplierInfo?.supplierName || undefined,
          plannedQty: String(requiredQty),
          unit: item.unit || product?.unit || "件",
          plannedStartDate: new Date().toISOString().split("T")[0],
          plannedEndDate: order.deliveryDate || undefined,
          priority: "normal",
          status: "pending",
          createdBy,
        });
        continue;
      }

      // 查询该产品的总库存（合格品）
      const stockRows = await db
        .select({ total: sql<string>`COALESCE(SUM(${inventory.quantity}), 0)` })
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, item.productId),
            eq(inventory.status, "qualified")
          )
        );
      const stockQty = Number(stockRows[0]?.total) || 0;

      // 库存不足，生成生产计划
      if (stockQty < requiredQty) {
        const shortfall = requiredQty - stockQty;
        // 检查是否已有该订单+产品的生产计划
        const existing = await db
          .select({ id: productionPlans.id })
          .from(productionPlans)
          .where(
            and(
              eq(productionPlans.salesOrderId, salesOrderId),
              eq(productionPlans.productId, item.productId),
              eq(productionPlans.status, "pending")
            )
          )
          .limit(1);
        if (existing.length > 0) continue; // 已有待排产计划，跳过

        const supplierInfo = await getPlanSupplierInfo(item.productId, db);
        const now = new Date();
        const planNo = await allocateManagedCodeRuleNo("生产计划", now);

        await db.insert(productionPlans).values({
          planNo,
          planType: "sales_driven",
          salesOrderId,
          salesOrderNo: order.orderNo,
          productId: item.productId,
          productName: product?.name || `产品#${item.productId}`,
          supplierId: supplierInfo?.supplierId ?? undefined,
          supplierName: supplierInfo?.supplierName || undefined,
          plannedQty: String(shortfall),
          unit: item.unit || product?.unit || "件",
          plannedStartDate: now.toISOString().split("T")[0],
          plannedEndDate: order.deliveryDate || undefined,
          priority: "normal",
          status: "pending",
          createdBy,
        });
      }
    }
  } catch (e) {
    console.error("[autoGenerateProductionPlans] error:", e);
  }
}

export async function deleteProductionPlan(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: productionPlans,
    idColumn: productionPlans.id,
    id,
    entityType: "生产计划",
    sourceTable: "production_plans",
    deletedBy,
  });
}

// ==================== 领料单 CRUD ====================
export async function getMaterialRequisitionOrders(params?: {
  search?: string;
  status?: string;
  productionOrderId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(materialRequisitionOrders.requisitionNo, `%${params.search}%`),
        like(materialRequisitionOrders.productionOrderNo, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(materialRequisitionOrders.status, params.status as any));
  if (params?.productionOrderId)
    conditions.push(
      eq(materialRequisitionOrders.productionOrderId, params.productionOrderId)
    );
  let query = db.select().from(materialRequisitionOrders);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(materialRequisitionOrders.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getMaterialRequisitionOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(materialRequisitionOrders)
    .where(eq(materialRequisitionOrders.id, id))
    .limit(1);
  return result[0];
}
export async function createMaterialRequisitionOrder(
  data: InsertMaterialRequisitionOrder
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const requisitionNo = await resolveManagedCodeRuleNo(
    "领料单",
    (data as any).requisitionNo
  );
  const result = await db.insert(materialRequisitionOrders).values({
    ...data,
    requisitionNo,
  });
  return result[0].insertId;
}
export async function updateMaterialRequisitionOrder(
  id: number,
  data: Partial<InsertMaterialRequisitionOrder>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db
    .update(materialRequisitionOrders)
    .set(data)
    .where(eq(materialRequisitionOrders.id, id));
}
export async function deleteMaterialRequisitionOrder(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: materialRequisitionOrders,
    idColumn: materialRequisitionOrders.id,
    id,
    entityType: "领料单",
    sourceTable: "material_requisition_orders",
    deletedBy,
  });
}

function normalizeBomMatchValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[ΦφØ]/g, "")
    .replace(/[^A-Z0-9\u4E00-\u9FFF]/g, "");
}

export async function getSuggestedMaterialItemsByProductionOrderId(
  productionOrderId: number
) {
  const db = await getDb();
  if (!db) return [];

  const [order] = await db
    .select({
      id: productionOrders.id,
      productId: productionOrders.productId,
      plannedQty: productionOrders.plannedQty,
      unit: productionOrders.unit,
      batchNo: productionOrders.batchNo,
      orderType: productionOrders.orderType,
      planId: productionOrders.planId,
    })
    .from(productionOrders)
    .where(eq(productionOrders.id, productionOrderId))
    .limit(1);

  if (!order) return [];

  let rawMaterials: any[] = [];

  if (order.orderType === "semi_finished") {
    if (!order.planId) return [];

    const [sourcePlan] = await db
      .select({
        productId: productionPlans.productId,
      })
      .from(productionPlans)
      .where(eq(productionPlans.id, Number(order.planId)))
      .limit(1);

    if (!sourcePlan?.productId) return [];

    const [currentProduct] = await db
      .select({
        code: products.code,
        name: products.name,
        specification: products.specification,
      })
      .from(products)
      .where(eq(products.id, Number(order.productId)))
      .limit(1);

    const sourceBomItems = await getBomByProductId(
      Number(sourcePlan.productId)
    );
    const level2Items = sourceBomItems.filter(
      (item: any) => Number(item.level) === 2
    );

    const targetCode = normalizeBomMatchValue(currentProduct?.code);
    const targetName = normalizeBomMatchValue(currentProduct?.name);
    const targetSpec = normalizeBomMatchValue(currentProduct?.specification);

    const matchedParent =
      level2Items.find((item: any) => {
        const itemCode = normalizeBomMatchValue(item.materialCode);
        const itemName = normalizeBomMatchValue(item.materialName);
        const itemSpec = normalizeBomMatchValue(item.specification);
        return (
          (targetCode && itemCode === targetCode) ||
          (targetName && itemName === targetName) ||
          (targetSpec && itemSpec === targetSpec)
        );
      }) ||
      level2Items.find((item: any) => {
        const itemCode = normalizeBomMatchValue(item.materialCode);
        const itemName = normalizeBomMatchValue(item.materialName);
        const itemSpec = normalizeBomMatchValue(item.specification);
        return (
          (targetCode && itemCode.includes(targetCode)) ||
          (targetName && itemName.includes(targetName)) ||
          (targetSpec && itemSpec.includes(targetSpec))
        );
      });

    if (!matchedParent) return [];

    const matchedChildren = sourceBomItems.filter(
      (item: any) =>
        Number(item.level) === 3 &&
        Number(item.parentId || 0) === Number(matchedParent.id)
    );

    rawMaterials =
      matchedChildren.length > 0 ? matchedChildren : [matchedParent];
  } else {
    const directBomItems = await getBomByProductId(Number(order.productId));
    const level2Items = directBomItems.filter(
      (item: any) => Number(item.level) === 2
    );

    rawMaterials = level2Items.flatMap((parent: any) => {
      const level3Items = directBomItems.filter(
        (item: any) =>
          Number(item.level) === 3 &&
          Number(item.parentId || 0) === Number(parent.id)
      );
      return level3Items.length > 0 ? level3Items : [parent];
    });
  }

  if (rawMaterials.length > 0) {
    const materialCodes = Array.from(
      new Set(
        rawMaterials
          .map((item: any) => String(item.materialCode || "").trim())
          .filter(Boolean)
      )
    );

    if (materialCodes.length > 0) {
      const relatedProducts = await db
        .select({
          code: products.code,
          productCategory: products.productCategory,
        })
        .from(products)
        .where(inArray(products.code, materialCodes));

      const productCategoryMap = new Map(
        relatedProducts.map(row => [
          String(row.code || "").trim(),
          String(row.productCategory || "").trim(),
        ])
      );

      rawMaterials = rawMaterials.filter((item: any) => {
        const code = String(item.materialCode || "").trim();
        return !isProductionIssueExcludedCategory(productCategoryMap.get(code));
      });
    }
  }

  if (rawMaterials.length === 0) return [];

  const issuedOrders = await db
    .select({
      items: materialRequisitionOrders.items,
      remark: materialRequisitionOrders.remark,
    })
    .from(materialRequisitionOrders)
    .where(
      and(
        eq(materialRequisitionOrders.productionOrderId, productionOrderId),
        eq(materialRequisitionOrders.status, "issued")
      )
    );

  const issuedQtyMap: Record<string, number> = {};
  for (const req of issuedOrders) {
    try {
      let items: any[] = [];
      if (req.items) {
        items = JSON.parse(String(req.items)) || [];
      } else if (req.remark) {
        const remarkObj = JSON.parse(String(req.remark));
        items = remarkObj?.items || [];
      }
      for (const item of items) {
        const key = String(item.materialCode || item.materialName || "").trim();
        if (!key) continue;
        issuedQtyMap[key] =
          (issuedQtyMap[key] || 0) +
          Number(item.actualQty || item.requiredQty || 0);
      }
    } catch {
      continue;
    }
  }

  const plannedQty = Number(order.plannedQty || 0) || 1;

  return rawMaterials
    .map((item: any) => {
      const key = String(item.materialCode || item.materialName || "").trim();
      const totalNeeded = Number(item.quantity || 0) * plannedQty;
      const alreadyIssued = issuedQtyMap[key] || 0;
      const remaining = Math.max(
        0,
        roundToDigits(totalNeeded - alreadyIssued, 4)
      );
      return {
        materialCode: item.materialCode || "",
        materialName: item.materialName || "",
        specification: item.specification || "",
        requiredQty: remaining,
        unit: item.unit || "",
        actualQty: remaining,
        batchNo: "",
        availableQty: 0,
        remark:
          alreadyIssued > 0 ? `已领${alreadyIssued}，总需${totalNeeded}` : "",
      };
    })
    .filter(item => Number(item.requiredQty) > 0);
}

// ==================== 生产记录单 CRUD ====================
export async function getProductionRecords(params?: {
  search?: string;
  status?: string;
  recordType?: string;
  productionOrderId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureProductionRecordColumns(db);
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(productionRecords.recordNo, `%${params.search}%`),
        like(productionRecords.productName, `%${params.search}%`),
        like(productionRecords.batchNo, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(productionRecords.status, params.status as any));
  if (params?.recordType)
    conditions.push(eq(productionRecords.recordType, params.recordType as any));
  if (params?.productionOrderId)
    conditions.push(
      eq(productionRecords.productionOrderId, params.productionOrderId)
    );
  let query = db.select().from(productionRecords);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(productionRecords.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getProductionRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureProductionRecordColumns(db);
  const result = await db
    .select()
    .from(productionRecords)
    .where(eq(productionRecords.id, id))
    .limit(1);
  return result[0];
}
export async function createProductionRecord(data: InsertProductionRecord) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionRecordColumns(db);
  const recordNo = await resolveManagedCodeRuleNo(
    "生产记录",
    (data as any).recordNo
  );
  const result = await db.insert(productionRecords).values({
    ...data,
    recordNo,
  });
  return result[0].insertId;
}
export async function updateProductionRecord(
  id: number,
  data: Partial<InsertProductionRecord>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionRecordColumns(db);
  await db
    .update(productionRecords)
    .set(data)
    .where(eq(productionRecords.id, id));
}
export async function deleteProductionRecord(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: productionRecords,
    idColumn: productionRecords.id,
    id,
    entityType: "生产记录单",
    sourceTable: "production_records",
    deletedBy,
  });
}

// ==================== 生产环境记录 CRUD ====================
export async function getEnvironmentRecords(params?: {
  search?: string;
  moduleType?: string;
  sourceType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureEnvironmentRecordsTable(db);
  const conditions: any[] = [];
  if (params?.search) {
    conditions.push(
      or(
        like(environmentRecords.recordNo, `%${params.search}%`),
        like(environmentRecords.roomName, `%${params.search}%`),
        like(environmentRecords.productionOrderNo, `%${params.search}%`),
        like(environmentRecords.productName, `%${params.search}%`),
        like(environmentRecords.processName, `%${params.search}%`)
      )
    );
  }
  if (params?.moduleType)
    conditions.push(eq(environmentRecords.moduleType, params.moduleType));
  if (params?.sourceType)
    conditions.push(
      eq(environmentRecords.sourceType, params.sourceType as any)
    );
  let query = db.select().from(environmentRecords);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(
      desc(environmentRecords.recordDate),
      desc(environmentRecords.updatedAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getEnvironmentRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureEnvironmentRecordsTable(db);
  const result = await db
    .select()
    .from(environmentRecords)
    .where(eq(environmentRecords.id, id))
    .limit(1);
  return result[0];
}
export async function getEnvironmentRecordByRecordNo(recordNo: string) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureEnvironmentRecordsTable(db);
  const result = await db
    .select()
    .from(environmentRecords)
    .where(eq(environmentRecords.recordNo, recordNo))
    .limit(1);
  return result[0];
}
export async function createEnvironmentRecord(data: InsertEnvironmentRecord) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEnvironmentRecordsTable(db);
  const result = await db.insert(environmentRecords).values(data);
  return result[0].insertId;
}
export async function updateEnvironmentRecord(
  id: number,
  data: Partial<InsertEnvironmentRecord>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEnvironmentRecordsTable(db);
  await db
    .update(environmentRecords)
    .set(data)
    .where(eq(environmentRecords.id, id));
}
export async function deleteEnvironmentRecord(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureEnvironmentRecordsTable(db);
  await deleteSingleWithRecycle(db, {
    table: environmentRecords,
    idColumn: environmentRecords.id,
    id,
    entityType: "生产环境记录",
    sourceTable: "environment_records",
    deletedBy,
  });
}

// ==================== 生产流转单 CRUD ====================
export async function getProductionRoutingCards(params?: {
  search?: string;
  status?: string;
  productionOrderId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(productionRoutingCards.cardNo, `%${params.search}%`),
        like(productionRoutingCards.productName, `%${params.search}%`),
        like(productionRoutingCards.batchNo, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(productionRoutingCards.status, params.status as any));
  if (params?.productionOrderId)
    conditions.push(
      eq(productionRoutingCards.productionOrderId, params.productionOrderId)
    );
  let query = db.select().from(productionRoutingCards);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(productionRoutingCards.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getProductionRoutingCardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(productionRoutingCards)
    .where(eq(productionRoutingCards.id, id))
    .limit(1);
  return result[0];
}
export async function createProductionRoutingCard(
  data: InsertProductionRoutingCard
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const cardNo = await resolveManagedCodeRuleNo(
    "流转卡",
    (data as any).cardNo
  );
  const result = await db.insert(productionRoutingCards).values({
    ...data,
    cardNo,
  });
  return result[0].insertId;
}
export async function updateProductionRoutingCard(
  id: number,
  data: Partial<InsertProductionRoutingCard>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db
    .update(productionRoutingCards)
    .set(data)
    .where(eq(productionRoutingCards.id, id));
}
export async function deleteProductionRoutingCard(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：委外灭菌单及其关联的入库申请
  const relatedSterilizations = await db
    .select({ id: sterilizationOrders.id })
    .from(sterilizationOrders)
    .where(eq(sterilizationOrders.routingCardId, id));
  for (const s of relatedSterilizations) {
    await db
      .delete(productionWarehouseEntries)
      .where(eq(productionWarehouseEntries.sterilizationOrderId, s.id));
  }
  await db
    .delete(sterilizationOrders)
    .where(eq(sterilizationOrders.routingCardId, id));
  await deleteSingleWithRecycle(db, {
    table: productionRoutingCards,
    idColumn: productionRoutingCards.id,
    id,
    entityType: "生产流转单",
    sourceTable: "production_routing_cards",
    deletedBy,
  });
}

// ==================== 生产报废处理单 CRUD ====================
export async function getProductionScrapDisposals(params?: {
  batchNo?: string;
  productionOrderId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureProductionScrapDisposalsTable(db);
  const conditions: any[] = [];
  if (params?.batchNo)
    conditions.push(eq(productionScrapDisposals.batchNo, params.batchNo));
  if (params?.productionOrderId)
    conditions.push(
      eq(productionScrapDisposals.productionOrderId, params.productionOrderId)
    );
  let query = db.select().from(productionScrapDisposals);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(productionScrapDisposals.updatedAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getProductionScrapDisposalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureProductionScrapDisposalsTable(db);
  const result = await db
    .select()
    .from(productionScrapDisposals)
    .where(eq(productionScrapDisposals.id, id))
    .limit(1);
  return result[0];
}

export async function getProductionScrapDisposalByBatchNo(batchNo: string) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureProductionScrapDisposalsTable(db);
  const result = await db
    .select()
    .from(productionScrapDisposals)
    .where(eq(productionScrapDisposals.batchNo, batchNo))
    .limit(1);
  return result[0];
}

export async function upsertProductionScrapDisposalByBatch(
  data: InsertProductionScrapDisposal
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionScrapDisposalsTable(db);
  const batchNo = String(data.batchNo || "").trim();
  if (!batchNo) throw new Error("批号不能为空");
  const existing = await getProductionScrapDisposalByBatchNo(batchNo);
  if (existing?.id) {
    await db
      .update(productionScrapDisposals)
      .set(data)
      .where(eq(productionScrapDisposals.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(productionScrapDisposals).values(data);
  return result[0].insertId;
}

// ==================== 委外灭菌单 CRUD ====================
export async function getSterilizationOrders(params?: {
  search?: string;
  status?: string;
  productionOrderId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(sterilizationOrders.orderNo, `%${params.search}%`),
        like(sterilizationOrders.productName, `%${params.search}%`),
        like(sterilizationOrders.supplierName, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(sterilizationOrders.status, params.status as any));
  if (params?.productionOrderId)
    conditions.push(
      eq(sterilizationOrders.productionOrderId, params.productionOrderId)
    );
  let query = db.select().from(sterilizationOrders);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(sterilizationOrders.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getSterilizationOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(sterilizationOrders)
    .where(eq(sterilizationOrders.id, id))
    .limit(1);
  return result[0];
}
export async function createSterilizationOrder(data: InsertSterilizationOrder) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSterilizationOrderColumns(db);
  const orderNo = await resolveManagedCodeRuleNo(
    "灭菌单",
    (data as any).orderNo
  );
  const result = await db.insert(sterilizationOrders).values({
    ...data,
    orderNo,
  });
  return result[0].insertId;
}
export async function updateSterilizationOrder(
  id: number,
  data: Partial<InsertSterilizationOrder>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSterilizationOrderColumns(db);
  await db
    .update(sterilizationOrders)
    .set(data)
    .where(eq(sterilizationOrders.id, id));
}
export async function deleteSterilizationOrder(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：生产入库申请
  await db
    .delete(productionWarehouseEntries)
    .where(eq(productionWarehouseEntries.sterilizationOrderId, id));
  await deleteSingleWithRecycle(db, {
    table: sterilizationOrders,
    idColumn: sterilizationOrders.id,
    id,
    entityType: "委外灭菌单",
    sourceTable: "sterilization_orders",
    deletedBy,
  });
}

// ==================== 生产入库申请 CRUD ====================
export async function getProductionWarehouseEntries(params?: {
  search?: string;
  status?: string;
  productionOrderId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureProductionWarehouseEntryColumns(db);
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(productionWarehouseEntries.entryNo, `%${params.search}%`),
        like(productionWarehouseEntries.productName, `%${params.search}%`),
        like(productionWarehouseEntries.batchNo, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(
      eq(productionWarehouseEntries.status, params.status as any)
    );
  if (params?.productionOrderId)
    conditions.push(
      eq(productionWarehouseEntries.productionOrderId, params.productionOrderId)
    );
  let query = db.select().from(productionWarehouseEntries);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(productionWarehouseEntries.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getProductionWarehouseEntryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureProductionWarehouseEntryColumns(db);
  const result = await db
    .select()
    .from(productionWarehouseEntries)
    .where(eq(productionWarehouseEntries.id, id))
    .limit(1);
  return result[0];
}
export async function createProductionWarehouseEntry(
  data: InsertProductionWarehouseEntry
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionWarehouseEntryColumns(db);
  const entryNo = await resolveManagedCodeRuleNo(
    "生产入库申请",
    (data as any).entryNo
  );
  const result = await db.insert(productionWarehouseEntries).values({
    ...data,
    entryNo,
  });
  return result[0].insertId;
}
export async function updateProductionWarehouseEntry(
  id: number,
  data: Partial<InsertProductionWarehouseEntry>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionWarehouseEntryColumns(db);
  await db
    .update(productionWarehouseEntries)
    .set(data)
    .where(eq(productionWarehouseEntries.id, id));
}
export async function deleteProductionWarehouseEntry(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: productionWarehouseEntries,
    idColumn: productionWarehouseEntries.id,
    id,
    entityType: "生产入库申请",
    sourceTable: "production_warehouse_entries",
    deletedBy,
  });
}

// ==================== 大包装记录 CRUD ====================
export async function getLargePackagingRecords(params?: {
  search?: string;
  status?: string;
  productionOrderId?: number;
  batchNo?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureLargePackagingRecordsTable(db);
  const conditions: any[] = [];
  if (params?.search) {
    conditions.push(
      or(
        like(largePackagingRecords.recordNo, `%${params.search}%`),
        like(largePackagingRecords.productName, `%${params.search}%`),
        like(largePackagingRecords.batchNo, `%${params.search}%`),
        like(largePackagingRecords.productionOrderNo, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(largePackagingRecords.status, params.status as any));
  if (params?.productionOrderId)
    conditions.push(
      eq(largePackagingRecords.productionOrderId, params.productionOrderId)
    );
  if (params?.batchNo)
    conditions.push(eq(largePackagingRecords.batchNo, params.batchNo));
  let query = db.select().from(largePackagingRecords);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(
      desc(largePackagingRecords.packagingDate),
      desc(largePackagingRecords.createdAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getLargePackagingRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureLargePackagingRecordsTable(db);
  const result = await db
    .select()
    .from(largePackagingRecords)
    .where(eq(largePackagingRecords.id, id))
    .limit(1);
  return result[0];
}

export async function createLargePackagingRecord(
  data: InsertLargePackagingRecord
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureLargePackagingRecordsTable(db);
  const result = await db.insert(largePackagingRecords).values(data);
  return result[0].insertId;
}

export async function updateLargePackagingRecord(
  id: number,
  data: Partial<InsertLargePackagingRecord>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureLargePackagingRecordsTable(db);
  await db
    .update(largePackagingRecords)
    .set(data)
    .where(eq(largePackagingRecords.id, id));
}

export async function deleteLargePackagingRecord(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureLargePackagingRecordsTable(db);
  await deleteSingleWithRecycle(db, {
    table: largePackagingRecords,
    idColumn: largePackagingRecords.id,
    id,
    entityType: "大包装记录",
    sourceTable: "large_packaging_records",
    deletedBy,
  });
}

// ==================== 批记录审核记录 CRUD ====================
export async function getBatchRecordReviewRecords(params?: {
  search?: string;
  status?: string;
  productionOrderId?: number;
  batchNo?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureBatchRecordReviewRecordsTable(db);
  const conditions: any[] = [];
  if (params?.search) {
    conditions.push(
      or(
        like(batchRecordReviewRecords.reviewNo, `%${params.search}%`),
        like(batchRecordReviewRecords.productName, `%${params.search}%`),
        like(batchRecordReviewRecords.batchNo, `%${params.search}%`),
        like(batchRecordReviewRecords.productionOrderNo, `%${params.search}%`)
      )
    );
  }
  if (params?.status)
    conditions.push(eq(batchRecordReviewRecords.status, params.status as any));
  if (params?.productionOrderId)
    conditions.push(
      eq(batchRecordReviewRecords.productionOrderId, params.productionOrderId)
    );
  if (params?.batchNo)
    conditions.push(eq(batchRecordReviewRecords.batchNo, params.batchNo));
  let query = db.select().from(batchRecordReviewRecords);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(
      desc(batchRecordReviewRecords.reviewDate),
      desc(batchRecordReviewRecords.createdAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getBatchRecordReviewRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureBatchRecordReviewRecordsTable(db);
  const result = await db
    .select()
    .from(batchRecordReviewRecords)
    .where(eq(batchRecordReviewRecords.id, id))
    .limit(1);
  return result[0];
}

export async function createBatchRecordReviewRecord(
  data: InsertBatchRecordReviewRecord
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureBatchRecordReviewRecordsTable(db);
  const result = await db.insert(batchRecordReviewRecords).values(data);
  return result[0].insertId;
}

export async function updateBatchRecordReviewRecord(
  id: number,
  data: Partial<InsertBatchRecordReviewRecord>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureBatchRecordReviewRecordsTable(db);
  await db
    .update(batchRecordReviewRecords)
    .set(data)
    .where(eq(batchRecordReviewRecords.id, id));
}

export async function deleteBatchRecordReviewRecord(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureBatchRecordReviewRecordsTable(db);
  await deleteSingleWithRecycle(db, {
    table: batchRecordReviewRecords,
    idColumn: batchRecordReviewRecords.id,
    id,
    entityType: "批记录审核记录",
    sourceTable: "batch_record_review_records",
    deletedBy,
  });
}

// ==================== 法规放行记录 CRUD ====================
export async function getRegulatoryReleaseRecords(params?: {
  search?: string;
  status?: string;
  productionOrderId?: number;
  batchNo?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureRegulatoryReleaseRecordsTable(db);
  const conditions: any[] = [];
  if (params?.search) {
    conditions.push(
      or(
        like(regulatoryReleaseRecords.releaseNo, `%${params.search}%`),
        like(regulatoryReleaseRecords.productName, `%${params.search}%`),
        like(regulatoryReleaseRecords.batchNo, `%${params.search}%`),
        like(regulatoryReleaseRecords.productionOrderNo, `%${params.search}%`),
        like(
          regulatoryReleaseRecords.sterilizationBatchNo,
          `%${params.search}%`
        )
      )
    );
  }
  if (params?.status)
    conditions.push(eq(regulatoryReleaseRecords.status, params.status as any));
  if (params?.productionOrderId)
    conditions.push(
      eq(regulatoryReleaseRecords.productionOrderId, params.productionOrderId)
    );
  if (params?.batchNo)
    conditions.push(eq(regulatoryReleaseRecords.batchNo, params.batchNo));
  let query = db.select().from(regulatoryReleaseRecords);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(
      desc(regulatoryReleaseRecords.releaseDate),
      desc(regulatoryReleaseRecords.createdAt)
    )
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}

export async function getRegulatoryReleaseRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureRegulatoryReleaseRecordsTable(db);
  const result = await db
    .select()
    .from(regulatoryReleaseRecords)
    .where(eq(regulatoryReleaseRecords.id, id))
    .limit(1);
  return result[0];
}

export async function createRegulatoryReleaseRecord(
  data: InsertRegulatoryReleaseRecord
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureRegulatoryReleaseRecordsTable(db);
  const result = await db.insert(regulatoryReleaseRecords).values(data);
  return result[0].insertId;
}

export async function updateRegulatoryReleaseRecord(
  id: number,
  data: Partial<InsertRegulatoryReleaseRecord>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureRegulatoryReleaseRecordsTable(db);
  await db
    .update(regulatoryReleaseRecords)
    .set(data)
    .where(eq(regulatoryReleaseRecords.id, id));
}

export async function deleteRegulatoryReleaseRecord(
  id: number,
  deletedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureRegulatoryReleaseRecordsTable(db);
  await deleteSingleWithRecycle(db, {
    table: regulatoryReleaseRecords,
    idColumn: regulatoryReleaseRecords.id,
    id,
    entityType: "法规放行记录",
    sourceTable: "regulatory_release_records",
    deletedBy,
  });
}

// ==================== 加班申请 CRUD ====================
export async function getOvertimeRequests(params?: {
  search?: string;
  status?: string;
  department?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(overtimeRequests.requestNo, `%${params.search}%`),
        like(overtimeRequests.applicantName, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(overtimeRequests.status, params.status as any));
  if (params?.department)
    conditions.push(eq(overtimeRequests.department, params.department));
  let query = db.select().from(overtimeRequests);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(overtimeRequests.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getOvertimeRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(overtimeRequests)
    .where(eq(overtimeRequests.id, id))
    .limit(1);
  return result[0];
}
export async function createOvertimeRequest(data: InsertOvertimeRequest) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const requestNo = await resolveManagedCodeRuleNo(
    "加班申请",
    (data as any).requestNo
  );
  const result = await db.insert(overtimeRequests).values({
    ...data,
    requestNo,
  });
  return result[0].insertId;
}
export async function updateOvertimeRequest(
  id: number,
  data: Partial<InsertOvertimeRequest>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db
    .update(overtimeRequests)
    .set(data)
    .where(eq(overtimeRequests.id, id));
}
export async function deleteOvertimeRequest(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: overtimeRequests,
    idColumn: overtimeRequests.id,
    id,
    entityType: "加班申请",
    sourceTable: "overtime_requests",
    deletedBy,
  });
}

// ==================== 请假申请 CRUD ====================
export async function getLeaveRequests(params?: {
  search?: string;
  status?: string;
  department?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(leaveRequests.requestNo, `%${params.search}%`),
        like(leaveRequests.applicantName, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(leaveRequests.status, params.status as any));
  if (params?.department)
    conditions.push(eq(leaveRequests.department, params.department));
  let query = db.select().from(leaveRequests);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(leaveRequests.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getLeaveRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);
  return result[0];
}
export async function createLeaveRequest(data: InsertLeaveRequest) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const requestNo = await resolveManagedCodeRuleNo(
    "请假申请",
    (data as any).requestNo
  );
  const result = await db.insert(leaveRequests).values({
    ...data,
    requestNo,
  });
  return result[0].insertId;
}
export async function updateLeaveRequest(
  id: number,
  data: Partial<InsertLeaveRequest>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(leaveRequests).set(data).where(eq(leaveRequests.id, id));
}
export async function deleteLeaveRequest(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: leaveRequests,
    idColumn: leaveRequests.id,
    id,
    entityType: "请假申请",
    sourceTable: "leave_requests",
    deletedBy,
  });
}

// ==================== 外出申请 CRUD ====================
export async function getOutingRequests(params?: {
  search?: string;
  status?: string;
  department?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search)
    conditions.push(
      or(
        like(outingRequests.requestNo, `%${params.search}%`),
        like(outingRequests.applicantName, `%${params.search}%`)
      )
    );
  if (params?.status)
    conditions.push(eq(outingRequests.status, params.status as any));
  if (params?.department)
    conditions.push(eq(outingRequests.department, params.department));
  let query = db.select().from(outingRequests);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query
    .orderBy(desc(outingRequests.createdAt))
    .limit(resolveEntityListLimit(params?.limit))
    .offset(params?.offset || 0);
}
export async function getOutingRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(outingRequests)
    .where(eq(outingRequests.id, id))
    .limit(1);
  return result[0];
}
export async function createOutingRequest(data: InsertOutingRequest) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const requestNo = await resolveManagedCodeRuleNo(
    "外出申请",
    (data as any).requestNo
  );
  const result = await db.insert(outingRequests).values({
    ...data,
    requestNo,
  });
  return result[0].insertId;
}
export async function updateOutingRequest(
  id: number,
  data: Partial<InsertOutingRequest>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(outingRequests).set(data).where(eq(outingRequests.id, id));
}
export async function deleteOutingRequest(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: outingRequests,
    idColumn: outingRequests.id,
    id,
    entityType: "外出申请",
    sourceTable: "outing_requests",
    deletedBy,
  });
}

// ==================== 产品-供应商价格关联 CRUD ====================
export async function getProductSupplierPrices(params?: {
  productId?: number;
  supplierId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.productId)
    conditions.push(eq(productSupplierPrices.productId, params.productId));
  if (params?.supplierId)
    conditions.push(eq(productSupplierPrices.supplierId, params.supplierId));
  let query = db.select().from(productSupplierPrices);
  if (conditions.length > 0)
    query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(
    desc(productSupplierPrices.isDefault),
    desc(productSupplierPrices.createdAt)
  );
}
export async function getProductSupplierPriceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(productSupplierPrices)
    .where(eq(productSupplierPrices.id, id))
    .limit(1);
  return result[0];
}
export async function createProductSupplierPrice(
  data: InsertProductSupplierPrice
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(productSupplierPrices).values(data);
  await syncOpenProductReferenceSnapshots(Number(data.productId || 0), db);
  return result[0].insertId;
}
export async function updateProductSupplierPrice(
  id: number,
  data: Partial<InsertProductSupplierPrice>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [current] = await db
    .select({ productId: productSupplierPrices.productId })
    .from(productSupplierPrices)
    .where(eq(productSupplierPrices.id, id))
    .limit(1);
  await db
    .update(productSupplierPrices)
    .set(data)
    .where(eq(productSupplierPrices.id, id));
  await syncOpenProductReferenceSnapshots(Number(current?.productId || 0), db);
}
export async function deleteProductSupplierPrice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const [current] = await db
    .select({ productId: productSupplierPrices.productId })
    .from(productSupplierPrices)
    .where(eq(productSupplierPrices.id, id))
    .limit(1);
  await db
    .delete(productSupplierPrices)
    .where(eq(productSupplierPrices.id, id));
  await syncOpenProductReferenceSnapshots(Number(current?.productId || 0), db);
}

// ==================== 批记录查询 ====================
/**
 * 按生产批号聚合全链路数据（生产/质量/仓库/销售/财务）
 */
export async function getBatchRecord(batchNo: string) {
  const db = await getDb();
  if (!db) return null;
  await ensureProductionScrapDisposalsTable(db);
  await ensureLabRecordsExtendedColumns(db);

  // 1. 生产指令（主记录）
  const productionOrderRows = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.batchNo, batchNo))
    .limit(1);
  const productionOrder = productionOrderRows[0] || null;

  const productionPlanRows = productionOrder?.planId
    ? await db
        .select({
          id: productionPlans.id,
          planNo: productionPlans.planNo,
          planType: productionPlans.planType,
          salesOrderId: productionPlans.salesOrderId,
          salesOrderNo: productionPlans.salesOrderNo,
          productionOrderId: productionPlans.productionOrderId,
          productId: productionPlans.productId,
          productName: productionPlans.productName,
          plannedQty: productionPlans.plannedQty,
          unit: productionPlans.unit,
          batchNo: productionPlans.batchNo,
          plannedStartDate: productionPlans.plannedStartDate,
          plannedEndDate: productionPlans.plannedEndDate,
          priority: productionPlans.priority,
          status: productionPlans.status,
          remark: productionPlans.remark,
          createdAt: productionPlans.createdAt,
        })
        .from(productionPlans)
        .where(eq(productionPlans.id, Number(productionOrder.planId)))
        .limit(1)
    : [];

  const materialRequisitionRows = productionOrder
    ? await db
        .select({
          id: materialRequisitionOrders.id,
          requisitionNo: materialRequisitionOrders.requisitionNo,
          productionOrderId: materialRequisitionOrders.productionOrderId,
          productionOrderNo: materialRequisitionOrders.productionOrderNo,
          productionPlanId: materialRequisitionOrders.productionPlanId,
          warehouseId: materialRequisitionOrders.warehouseId,
          warehouseName: warehouses.name,
          requisitionDate: materialRequisitionOrders.requisitionDate,
          requiredDate: materialRequisitionOrders.requiredDate,
          applicantId: materialRequisitionOrders.applicantId,
          status: materialRequisitionOrders.status,
          items: materialRequisitionOrders.items,
          remark: materialRequisitionOrders.remark,
          createdBy: materialRequisitionOrders.createdBy,
          createdAt: materialRequisitionOrders.createdAt,
          updatedAt: materialRequisitionOrders.updatedAt,
        })
        .from(materialRequisitionOrders)
        .leftJoin(
          warehouses,
          eq(materialRequisitionOrders.warehouseId, warehouses.id)
        )
        .where(
          productionOrder.id
            ? eq(
                materialRequisitionOrders.productionOrderId,
                Number(productionOrder.id)
              )
            : eq(
                materialRequisitionOrders.productionOrderNo,
                String(productionOrder.orderNo || "")
              )
        )
        .orderBy(
          asc(materialRequisitionOrders.requisitionDate),
          asc(materialRequisitionOrders.createdAt)
        )
    : [];

  // 2. 生产记录（温湿度/清场/首件/材料/通用）
  const productionRecordRows = await db
    .select()
    .from(productionRecords)
    .where(eq(productionRecords.batchNo, batchNo))
    .orderBy(
      asc(productionRecords.recordDate),
      asc(productionRecords.createdAt)
    );

  const environmentRecordRows = await db
    .select()
    .from(environmentRecords)
    .where(eq(environmentRecords.batchNo, batchNo))
    .orderBy(
      asc(environmentRecords.recordDate),
      asc(environmentRecords.createdAt)
    );

  const productionEnvironmentRows = environmentRecordRows.filter(
    (record: any) => {
      const moduleType = String(record?.moduleType || "");
      return !["清场记录", "清洗记录", "消毒记录", "设备使用记录"].includes(
        moduleType
      );
    }
  );
  const cleaningRecordRows = environmentRecordRows.filter(
    (record: any) => String(record?.moduleType || "") === "清洗记录"
  );
  const disinfectionRecordRows = environmentRecordRows.filter(
    (record: any) => String(record?.moduleType || "") === "消毒记录"
  );
  const productionEquipmentNames = Array.from(
    new Set(
      [...productionRecordRows, ...environmentRecordRows].flatMap(
        (record: any) => {
          const items = parseProductionRecordJsonArray(record?.equipmentItems);
          return items
            .map((item: any) =>
              String(
                item?.name || item?.equipmentName || item?.equipmentCode || ""
              ).trim()
            )
            .filter(Boolean);
        }
      )
    )
  );

  const materialBatchNos = Array.from(
    new Set(
      productionRecordRows.flatMap((record: any) => {
        const items = parseProductionRecordJsonArray(record?.materialItems);
        const itemBatchNos = items
          .map((item: any) => String(item?.batchNo || "").trim())
          .filter(Boolean);
        const recordBatchNo = String(record?.materialBatchNo || "").trim();
        return recordBatchNo ? [...itemBatchNos, recordBatchNo] : itemBatchNos;
      })
    )
  );

  const goodsReceiptItemRows =
    materialBatchNos.length > 0
      ? await db
          .select({
            id: goodsReceiptItems.id,
            receiptId: goodsReceiptItems.receiptId,
            purchaseOrderItemId: goodsReceiptItems.purchaseOrderItemId,
            productId: goodsReceiptItems.productId,
            materialCode: goodsReceiptItems.materialCode,
            materialName: goodsReceiptItems.materialName,
            specification: goodsReceiptItems.specification,
            unit: goodsReceiptItems.unit,
            orderedQty: goodsReceiptItems.orderedQty,
            receivedQty: goodsReceiptItems.receivedQty,
            batchNo: goodsReceiptItems.batchNo,
            sterilizationBatchNo: goodsReceiptItems.sterilizationBatchNo,
            inspectionQty: goodsReceiptItems.inspectionQty,
            qualifiedQty: goodsReceiptItems.qualifiedQty,
            unqualifiedQty: goodsReceiptItems.unqualifiedQty,
            receiptNo: goodsReceipts.receiptNo,
            purchaseOrderId: goodsReceipts.purchaseOrderId,
            purchaseOrderNo: goodsReceipts.purchaseOrderNo,
            supplierId: goodsReceipts.supplierId,
            supplierName: goodsReceipts.supplierName,
            receiptDate: goodsReceipts.receiptDate,
            receiptStatus: goodsReceipts.status,
          })
          .from(goodsReceiptItems)
          .innerJoin(
            goodsReceipts,
            eq(goodsReceiptItems.receiptId, goodsReceipts.id)
          )
          .where(inArray(goodsReceiptItems.batchNo, materialBatchNos))
          .orderBy(
            asc(goodsReceipts.receiptDate),
            asc(goodsReceiptItems.createdAt)
          )
      : [];

  const purchaseOrderIds = Array.from(
    new Set(
      goodsReceiptItemRows
        .map((item: any) => Number(item?.purchaseOrderId || 0))
        .filter(id => id > 0)
    )
  );

  const supplierIds = Array.from(
    new Set(
      goodsReceiptItemRows
        .map((item: any) => Number(item?.supplierId || 0))
        .filter(id => id > 0)
    )
  );

  const purchaseOrderRows =
    purchaseOrderIds.length > 0
      ? await db
          .select({
            id: purchaseOrders.id,
            orderNo: purchaseOrders.orderNo,
            supplierId: purchaseOrders.supplierId,
            supplierName: sql<string>`COALESCE(${purchaseOrders.supplierName}, ${suppliers.name})`,
            supplierCode: suppliers.code,
            orderDate: purchaseOrders.orderDate,
            expectedDate: purchaseOrders.expectedDate,
            totalAmount: purchaseOrders.totalAmount,
            currency: purchaseOrders.currency,
            status: purchaseOrders.status,
            paymentStatus: purchaseOrders.paymentStatus,
            remark: purchaseOrders.remark,
            createdAt: purchaseOrders.createdAt,
          })
          .from(purchaseOrders)
          .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
          .where(inArray(purchaseOrders.id, purchaseOrderIds))
          .orderBy(asc(purchaseOrders.orderDate), asc(purchaseOrders.createdAt))
      : [];

  const supplierRows =
    supplierIds.length > 0
      ? await db
          .select({
            id: suppliers.id,
            code: suppliers.code,
            name: suppliers.name,
            shortName: suppliers.shortName,
            type: suppliers.type,
            contactPerson: suppliers.contactPerson,
            phone: suppliers.phone,
            email: suppliers.email,
            qualificationLevel: suppliers.qualificationLevel,
            paymentTerms: suppliers.paymentTerms,
            status: suppliers.status,
          })
          .from(suppliers)
          .where(inArray(suppliers.id, supplierIds))
          .orderBy(asc(suppliers.name))
      : [];

  const iqcConditions: any[] = [];
  if (materialBatchNos.length > 0) {
    iqcConditions.push(inArray(iqcInspections.batchNo, materialBatchNos));
  }
  const goodsReceiptIds = Array.from(
    new Set(
      goodsReceiptItemRows
        .map((item: any) => Number(item?.receiptId || 0))
        .filter(id => id > 0)
    )
  );
  if (goodsReceiptIds.length > 0) {
    iqcConditions.push(inArray(iqcInspections.goodsReceiptId, goodsReceiptIds));
  }

  const iqcInspectionRows =
    iqcConditions.length > 0
      ? await db
          .select({
            id: iqcInspections.id,
            inspectionNo: iqcInspections.inspectionNo,
            goodsReceiptId: iqcInspections.goodsReceiptId,
            goodsReceiptNo: iqcInspections.goodsReceiptNo,
            productCode: iqcInspections.productCode,
            productName: iqcInspections.productName,
            specification: iqcInspections.specification,
            supplierId: iqcInspections.supplierId,
            supplierName: iqcInspections.supplierName,
            batchNo: iqcInspections.batchNo,
            receivedQty: iqcInspections.receivedQty,
            sampleQty: iqcInspections.sampleQty,
            qualifiedQty: iqcInspections.qualifiedQty,
            unit: iqcInspections.unit,
            inspectionDate: iqcInspections.inspectionDate,
            inspectorName: iqcInspections.inspectorName,
            result: iqcInspections.result,
            remark: iqcInspections.remark,
          })
          .from(iqcInspections)
          .where(or(...iqcConditions))
          .orderBy(
            asc(iqcInspections.inspectionDate),
            asc(iqcInspections.createdAt)
          )
      : [];

  const equipmentInspectionRows =
    productionEquipmentNames.length > 0
      ? await db
          .select({
            id: equipmentInspections.id,
            inspectionNo: equipmentInspections.inspectionNo,
            equipmentId: equipmentInspections.equipmentId,
            equipmentCode: equipmentInspections.equipmentCode,
            equipmentName: equipmentInspections.equipmentName,
            equipmentModel: equipmentInspections.equipmentModel,
            equipmentLocation: equipmentInspections.equipmentLocation,
            equipmentDepartment: equipmentInspections.equipmentDepartment,
            inspectionDate: equipmentInspections.inspectionDate,
            inspectionType: equipmentInspections.inspectionType,
            inspector: equipmentInspections.inspector,
            reviewer: equipmentInspections.reviewer,
            result: equipmentInspections.result,
            status: equipmentInspections.status,
            remark: equipmentInspections.remark,
          })
          .from(equipmentInspections)
          .where(
            inArray(
              equipmentInspections.equipmentName,
              productionEquipmentNames
            )
          )
          .orderBy(
            asc(equipmentInspections.inspectionDate),
            asc(equipmentInspections.createdAt)
          )
      : [];

  const equipmentMaintenanceRows =
    productionEquipmentNames.length > 0
      ? await db
          .select({
            id: equipmentMaintenances.id,
            maintenanceNo: equipmentMaintenances.maintenanceNo,
            equipmentId: equipmentMaintenances.equipmentId,
            equipmentCode: equipmentMaintenances.equipmentCode,
            equipmentName: equipmentMaintenances.equipmentName,
            equipmentModel: equipmentMaintenances.equipmentModel,
            equipmentLocation: equipmentMaintenances.equipmentLocation,
            equipmentDepartment: equipmentMaintenances.equipmentDepartment,
            maintenanceDate: equipmentMaintenances.maintenanceDate,
            maintenanceType: equipmentMaintenances.maintenanceType,
            executor: equipmentMaintenances.executor,
            reviewer: equipmentMaintenances.reviewer,
            status: equipmentMaintenances.status,
            result: equipmentMaintenances.result,
            nextMaintenanceDate: equipmentMaintenances.nextMaintenanceDate,
            remark: equipmentMaintenances.remark,
          })
          .from(equipmentMaintenances)
          .where(
            inArray(
              equipmentMaintenances.equipmentName,
              productionEquipmentNames
            )
          )
          .orderBy(
            asc(equipmentMaintenances.maintenanceDate),
            asc(equipmentMaintenances.createdAt)
          )
      : [];

  // 3. 生产流转单
  const routingCardRows = await db
    .select()
    .from(productionRoutingCards)
    .where(eq(productionRoutingCards.batchNo, batchNo));

  const scrapDisposalRows = await db
    .select()
    .from(productionScrapDisposals)
    .where(eq(productionScrapDisposals.batchNo, batchNo));

  // 4. 委外灭菌单
  const sterilizationOrderRows = await db
    .select()
    .from(sterilizationOrders)
    .where(eq(sterilizationOrders.batchNo, batchNo));

  // 5. 质量检验（IPQC + OQC）
  const qualityInspectionRows = await db
    .select({
      id: qualityInspections.id,
      inspectionNo: qualityInspections.inspectionNo,
      type: qualityInspections.type,
      relatedDocNo: qualityInspections.relatedDocNo,
      itemName: qualityInspections.itemName,
      batchNo: qualityInspections.batchNo,
      sampleQty: qualityInspections.sampleQty,
      inspectedQty: qualityInspections.inspectedQty,
      qualifiedQty: qualityInspections.qualifiedQty,
      unqualifiedQty: qualityInspections.unqualifiedQty,
      result: qualityInspections.result,
      inspectorId: qualityInspections.inspectorId,
      inspectionDate: qualityInspections.inspectionDate,
      remark: qualityInspections.remark,
      createdAt: qualityInspections.createdAt,
      updatedAt: qualityInspections.updatedAt,
    })
    .from(qualityInspections)
    .where(eq(qualityInspections.batchNo, batchNo))
    .orderBy(asc(qualityInspections.inspectionDate));

  const infrastructureLabCandidates = await db
    .select({
      id: labRecords.id,
      recordNo: labRecords.recordNo,
      formId: labRecords.formId,
      formTitle: labRecords.formTitle,
      formType: labRecords.formType,
      testType: labRecords.testType,
      testMethod: labRecords.testMethod,
      specification: labRecords.specification,
      result: labRecords.result,
      conclusion: labRecords.conclusion,
      testerName: labRecords.testerName,
      testDate: labRecords.testDate,
      status: labRecords.status,
      remark: labRecords.remark,
      formData: labRecords.formData,
      createdAt: labRecords.createdAt,
      updatedAt: labRecords.updatedAt,
    })
    .from(labRecords)
    .where(inArray(labRecords.formId, [...INFRASTRUCTURE_LAB_FORM_IDS]))
    .orderBy(asc(labRecords.testDate), asc(labRecords.createdAt));

  const infrastructureLabRows = infrastructureLabCandidates
    .filter(item =>
      extractLinkedBatchNosFromLabFormData(item.formData).includes(batchNo)
    )
    .map(item => {
      const formData = normalizeLabFormDataRecord(item.formData);
      return {
        ...item,
        linkedBatchNos: extractLinkedBatchNosFromLabFormData(item.formData),
        batchBindingDate: String(formData.batchBindingDate || ""),
      };
    });

  const sampleRows = await db
    .select()
    .from(samples)
    .where(eq(samples.batchNo, batchNo))
    .orderBy(asc(samples.samplingDate), asc(samples.createdAt));

  const sampleIds = Array.from(
    new Set(
      sampleRows.map((item: any) => Number(item?.id || 0)).filter(id => id > 0)
    )
  );

  const sampleLabRows =
    sampleIds.length > 0
      ? await db
          .select({
            id: labRecords.id,
            recordNo: labRecords.recordNo,
            formId: labRecords.formId,
            formTitle: labRecords.formTitle,
            formType: labRecords.formType,
            sampleId: labRecords.sampleId,
            testType: labRecords.testType,
            testMethod: labRecords.testMethod,
            specification: labRecords.specification,
            result: labRecords.result,
            formData: labRecords.formData,
            conclusion: labRecords.conclusion,
            equipmentId: labRecords.equipmentId,
            testerName: labRecords.testerName,
            testDate: labRecords.testDate,
            reviewerName: labRecords.reviewerName,
            status: labRecords.status,
            remark: labRecords.remark,
            createdAt: labRecords.createdAt,
          })
          .from(labRecords)
          .where(inArray(labRecords.sampleId, sampleIds))
          .orderBy(asc(labRecords.testDate), asc(labRecords.createdAt))
      : [];

  const qualityLabRows = sampleLabRows.filter(
    item => !isInfrastructureLabFormId(item.formId)
  );

  // 6. 生产入库申请
  const warehouseEntryRows = await db
    .select()
    .from(productionWarehouseEntries)
    .where(eq(productionWarehouseEntries.batchNo, batchNo));

  // 7. 库存流水（入库/出库）
  const inventoryTxRows = await db
    .select()
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.batchNo, batchNo))
    .orderBy(asc(inventoryTransactions.createdAt));

  const requisitionNos = Array.from(
    new Set(
      materialRequisitionRows
        .map((row: any) => String(row?.requisitionNo || "").trim())
        .filter(Boolean)
    )
  );
  const productionRecordNos = Array.from(
    new Set(
      productionRecordRows
        .map((row: any) => String(row?.recordNo || "").trim())
        .filter(Boolean)
    )
  );
  const stagingTxConditions: any[] = [];
  if (requisitionNos.length > 0) {
    stagingTxConditions.push(
      and(
        inArray(inventoryTransactions.documentNo, requisitionNos),
        eq(inventoryTransactions.type, "other_in")
      )
    );
  }
  if (productionRecordNos.length > 0) {
    stagingTxConditions.push(
      and(
        inArray(inventoryTransactions.documentNo, productionRecordNos),
        eq(inventoryTransactions.type, "production_out")
      )
    );
  }

  const stagingTransactionRows =
    stagingTxConditions.length > 0
      ? await db
          .select({
            id: inventoryTransactions.id,
            inventoryId: inventoryTransactions.inventoryId,
            warehouseId: inventoryTransactions.warehouseId,
            warehouseName: warehouses.name,
            documentNo: inventoryTransactions.documentNo,
            productId: inventoryTransactions.productId,
            itemName: inventoryTransactions.itemName,
            batchNo: inventoryTransactions.batchNo,
            quantity: inventoryTransactions.quantity,
            unit: inventoryTransactions.unit,
            type: inventoryTransactions.type,
            beforeQty: inventoryTransactions.beforeQty,
            afterQty: inventoryTransactions.afterQty,
            remark: inventoryTransactions.remark,
            createdAt: inventoryTransactions.createdAt,
          })
          .from(inventoryTransactions)
          .leftJoin(
            warehouses,
            eq(inventoryTransactions.warehouseId, warehouses.id)
          )
          .where(or(...stagingTxConditions))
          .orderBy(asc(inventoryTransactions.createdAt))
      : [];

  // 8. 销售订单（通过生产指令的 salesOrderId 关联）
  let salesOrderData: any = null;
  let salesOrderItemsData: any[] = [];
  let salesShipmentData: any[] = [];
  let customsDeclarationData: any[] = [];
  let packingListData: any[] = [];
  let accountsReceivableData: any[] = [];
  let accountsPayableData: any[] = [];
  let receivedInvoiceData: any[] = [];
  let issuedInvoiceData: any[] = [];
  if (productionOrder?.salesOrderId) {
    const salesOrderId = Number(productionOrder.salesOrderId);
    salesOrderData = await getSalesOrderById(salesOrderId);
    salesOrderItemsData = await getSalesOrderItems(salesOrderId);

    // 9. 应收账款（通过 salesOrderId 关联）
    accountsReceivableData = await db
      .select()
      .from(accountsReceivable)
      .where(eq(accountsReceivable.salesOrderId, salesOrderId));

    customsDeclarationData = await db
      .select()
      .from(customsDeclarations)
      .where(eq(customsDeclarations.salesOrderId, salesOrderId))
      .orderBy(
        asc(customsDeclarations.declarationDate),
        asc(customsDeclarations.createdAt)
      );

    packingListData = customsDeclarationData.map((item: any) => ({
      declarationId: item.id,
      declarationNo: item.declarationNo,
      packingListNo: `ZX-${item.declarationNo}`,
      packingDate: item.declarationDate,
      packageType: "纸箱",
      quantity: item.quantity,
      unit: item.unit,
      destination: item.destination,
      shippingMethod: item.shippingMethod,
      trackingNo: item.trackingNo,
      remark: item.remark,
    }));
  }

  if (purchaseOrderIds.length > 0) {
    accountsPayableData = await db
      .select({
        id: accountsPayable.id,
        invoiceNo: accountsPayable.invoiceNo,
        supplierId: accountsPayable.supplierId,
        supplierName: sql<string>`COALESCE(${accountsPayable.supplierName}, ${suppliers.name})`,
        purchaseOrderId: accountsPayable.purchaseOrderId,
        amount: accountsPayable.amount,
        paidAmount: accountsPayable.paidAmount,
        currency: accountsPayable.currency,
        invoiceDate: accountsPayable.invoiceDate,
        dueDate: accountsPayable.dueDate,
        paymentMethod: accountsPayable.paymentMethod,
        paymentDate: accountsPayable.paymentDate,
        status: accountsPayable.status,
        remark: accountsPayable.remark,
        createdAt: accountsPayable.createdAt,
      })
      .from(accountsPayable)
      .leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id))
      .where(inArray(accountsPayable.purchaseOrderId, purchaseOrderIds))
      .orderBy(
        asc(accountsPayable.invoiceDate),
        asc(accountsPayable.createdAt)
      );

    const purchaseOrderNos = Array.from(
      new Set(
        purchaseOrderRows
          .map((row: any) => String(row?.orderNo || "").trim())
          .filter(Boolean)
      )
    );
    const receivedInvoiceConditions = purchaseOrderNos
      .map(orderNo => like(receivedInvoices.relatedOrderNo, `%${orderNo}%`))
      .filter(Boolean);
    if (receivedInvoiceConditions.length > 0) {
      receivedInvoiceData = await db
        .select()
        .from(receivedInvoices)
        .where(or(...receivedInvoiceConditions))
        .orderBy(
          asc(receivedInvoices.invoiceDate),
          asc(receivedInvoices.createdAt)
        );
    }
  }

  const shipmentConditions: any[] = [
    eq(inventoryTransactions.type, "sales_out" as any),
  ];
  const shipmentLinkConditions: any[] = [
    eq(inventoryTransactions.batchNo, batchNo),
  ];
  if (productionOrder?.salesOrderId) {
    shipmentLinkConditions.push(
      eq(
        inventoryTransactions.relatedOrderId,
        Number(productionOrder.salesOrderId)
      )
    );
  }
  salesShipmentData = await db
    .select()
    .from(inventoryTransactions)
    .where(and(...shipmentConditions, or(...shipmentLinkConditions)))
    .orderBy(asc(inventoryTransactions.createdAt));

  // 10. 质量不良事件（按批号关联）
  const incidentRows = await db
    .select()
    .from(qualityIncidents)
    .where(eq(qualityIncidents.batchNo, batchNo));

  if (salesOrderData?.orderNo) {
    issuedInvoiceData = await db
      .select()
      .from(issuedInvoices)
      .where(
        like(
          issuedInvoices.relatedOrderNo,
          `%${String(salesOrderData.orderNo)}%`
        )
      )
      .orderBy(asc(issuedInvoices.invoiceDate), asc(issuedInvoices.createdAt));
  }

  const udiLabelRows = await db
    .select({
      id: udiLabels.id,
      labelNo: udiLabels.labelNo,
      productId: udiLabels.productId,
      productName: udiLabels.productName,
      productCode: udiLabels.productCode,
      specification: udiLabels.specification,
      registrationNo: udiLabels.registrationNo,
      riskLevel: udiLabels.riskLevel,
      udiDi: udiLabels.udiDi,
      issuer: udiLabels.issuer,
      batchNo: udiLabels.batchNo,
      serialNo: udiLabels.serialNo,
      productionDate: udiLabels.productionDate,
      expiryDate: udiLabels.expiryDate,
      carrierType: udiLabels.carrierType,
      labelTemplate: udiLabels.labelTemplate,
      printQty: udiLabels.printQty,
      printedQty: udiLabels.printedQty,
      status: udiLabels.status,
      printDate: udiLabels.printDate,
      nmpaSubmitted: udiLabels.nmpaSubmitted,
      nmpaSubmitDate: udiLabels.nmpaSubmitDate,
      createdAt: udiLabels.createdAt,
    })
    .from(udiLabels)
    .where(eq(udiLabels.batchNo, batchNo))
    .orderBy(asc(udiLabels.createdAt));

  await ensureLargePackagingRecordsTable(db);
  const largePackagingRows = await db
    .select()
    .from(largePackagingRecords)
    .where(eq(largePackagingRecords.batchNo, batchNo))
    .orderBy(
      asc(largePackagingRecords.packagingDate),
      asc(largePackagingRecords.createdAt)
    );

  await ensureBatchRecordReviewRecordsTable(db);
  const batchReviewRows = await db
    .select()
    .from(batchRecordReviewRecords)
    .where(eq(batchRecordReviewRecords.batchNo, batchNo))
    .orderBy(
      asc(batchRecordReviewRecords.reviewDate),
      asc(batchRecordReviewRecords.createdAt)
    );

  await ensureRegulatoryReleaseRecordsTable(db);
  const regulatoryReleaseRows = await db
    .select()
    .from(regulatoryReleaseRecords)
    .where(eq(regulatoryReleaseRecords.batchNo, batchNo))
    .orderBy(
      asc(regulatoryReleaseRecords.releaseDate),
      asc(regulatoryReleaseRecords.createdAt)
    );

  return {
    batchNo,
    production: {
      plans: productionPlanRows,
      order: productionOrder,
      materialRequisitions: materialRequisitionRows,
      environmentRecords: productionEnvironmentRows,
      cleaningRecords: cleaningRecordRows,
      disinfectionRecords: disinfectionRecordRows,
      equipmentInspections: equipmentInspectionRows,
      equipmentMaintenances: equipmentMaintenanceRows,
      records: productionRecordRows,
      routingCards: routingCardRows,
      scrapDisposals: scrapDisposalRows,
      labelPrintRecords: udiLabelRows,
      largePackagingRecords: largePackagingRows,
      sterilizationOrders: sterilizationOrderRows,
    },
    purchase: {
      suppliers: supplierRows,
      purchaseOrders: purchaseOrderRows,
      goodsReceipts: goodsReceiptItemRows,
      iqcInspections: iqcInspectionRows,
    },
    quality: {
      inspections: qualityInspectionRows,
      samples: sampleRows,
      labRecords: qualityLabRows,
      infrastructureLabRecords: infrastructureLabRows,
      incidents: incidentRows,
    },
    warehouse: {
      entries: warehouseEntryRows,
      stagingTransactions: stagingTransactionRows,
      transactions: inventoryTxRows,
    },
    sales: {
      order: salesOrderData,
      orderItems: salesOrderItemsData,
      shipments: salesShipmentData,
      customsDeclarations: customsDeclarationData,
      packingLists: packingListData,
    },
    finance: {
      accountsReceivable: accountsReceivableData,
      accountsPayable: accountsPayableData,
      receivedInvoices: receivedInvoiceData,
      issuedInvoices: issuedInvoiceData,
    },
    regulatory: {
      udiLabels: udiLabelRows,
      batchReviewRecords: batchReviewRows,
      regulatoryReleaseRecords: regulatoryReleaseRows,
    },
  };
}

/**
 * 获取批记录列表（用于搜索/列表页）
 */
export async function getBatchRecordList(params?: {
  batchNo?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };

  const conditions: any[] = [isNotNull(productionOrders.batchNo)];
  if (params?.batchNo) {
    conditions.push(like(productionOrders.batchNo, `%${params.batchNo}%`));
  }
  if (params?.dateFrom) {
    conditions.push(
      sql`DATE(${productionOrders.createdAt}) >= ${params.dateFrom}`
    );
  }
  if (params?.dateTo) {
    conditions.push(
      sql`DATE(${productionOrders.createdAt}) <= ${params.dateTo}`
    );
  }

  const whereClause = and(...conditions);
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;

  const rows = await db
    .select({
      id: productionOrders.id,
      orderNo: productionOrders.orderNo,
      batchNo: productionOrders.batchNo,
      productId: productionOrders.productId,
      plannedQty: productionOrders.plannedQty,
      completedQty: productionOrders.completedQty,
      unit: productionOrders.unit,
      status: productionOrders.status,
      productionDate: productionOrders.productionDate,
      expiryDate: productionOrders.expiryDate,
      plannedStartDate: productionOrders.plannedStartDate,
      plannedEndDate: productionOrders.plannedEndDate,
      salesOrderId: productionOrders.salesOrderId,
      createdAt: productionOrders.createdAt,
    })
    .from(productionOrders)
    .where(whereClause)
    .orderBy(desc(productionOrders.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(productionOrders)
    .where(whereClause);

  return {
    list: rows,
    total: Number(countRows[0]?.count ?? 0),
  };
}

// ==================== 邮箱协同辅助函数 ====================
/**
 * 按部门获取用户邮箱列表（用于邮件通知）
 * @param departments 部门名称数组，如 ["质量部", "生产部"]
 */
export async function getUserEmailsByDepartment(
  departments: string[]
): Promise<string[]> {
  const db = await getDb();
  if (!db || departments.length === 0) return [];
  try {
    const result = await db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.department, departments));
    return result
      .map(r => r.email)
      .filter((e): e is string => !!e && e.includes("@"));
  } catch {
    return [];
  }
}

// ==================== 库存重算（从流水账汇总） ====================
const IN_TYPES = ["purchase_in", "production_in", "return_in", "other_in"];
const OUT_TYPES = ["production_out", "sales_out", "return_out", "other_out"];

/**
 * 根据流水账重新计算指定库存记录的数量。
 * 汇总该 inventoryId 下所有流水的净变动量，写回 inventory.quantity。
 */
export async function recalculateInventoryById(
  inventoryId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const txList = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.inventoryId, inventoryId));

    let netQty = 0;
    for (const tx of txList) {
      const qty = parseFloat(String(tx.quantity)) || 0;
      if (IN_TYPES.includes(tx.type)) netQty += qty;
      else if (OUT_TYPES.includes(tx.type)) netQty -= qty;
    }

    await db
      .update(inventory)
      .set({ quantity: String(netQty) })
      .where(eq(inventory.id, inventoryId));
  } catch (e) {
    console.error("[recalculateInventoryById] 重算失败:", e);
  }
}

/**
 * 全量重算所有库存记录（管理员修复工具）。
 */
export async function recalculateAllInventory(): Promise<{
  updated: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) return { updated: 0, errors: 0 };

  const allInventory = await db.select().from(inventory);
  let updated = 0;
  let errors = 0;

  for (const inv of allInventory) {
    try {
      const txList = await db
        .select()
        .from(inventoryTransactions)
        .where(eq(inventoryTransactions.inventoryId, inv.id));

      let netQty = 0;
      for (const tx of txList) {
        const qty = parseFloat(String(tx.quantity)) || 0;
        if (IN_TYPES.includes(tx.type)) netQty += qty;
        else if (OUT_TYPES.includes(tx.type)) netQty -= qty;
      }

      await db
        .update(inventory)
        .set({ quantity: String(netQty) })
        .where(eq(inventory.id, inv.id));
      updated++;
    } catch (e) {
      console.error(`[recalculateAllInventory] 库存ID=${inv.id} 重算失败:`, e);
      errors++;
    }
  }

  return { updated, errors };
}

// ==================== 采购到货单 ====================

let goodsReceiptsTableReady = false;

export async function ensureGoodsReceiptsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || goodsReceiptsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS goods_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receiptNo VARCHAR(50) NOT NULL UNIQUE,
      purchaseOrderId INT NOT NULL,
      purchaseOrderNo VARCHAR(50) NOT NULL,
      supplierId INT,
      supplierName VARCHAR(200),
      warehouseId INT NOT NULL,
      receiptDate DATE NOT NULL,
      status ENUM('pending_inspection','inspecting','passed','failed','warehoused') NOT NULL DEFAULT 'pending_inspection',
      inspectorId INT,
      inspectorName VARCHAR(64),
      inspectionDate DATE,
      inspectionResult ENUM('pass','fail','conditional_pass'),
      inspectionRemark TEXT,
      inboundDocumentNo VARCHAR(50),
      inboundAt TIMESTAMP NULL,
      remark TEXT,
      createdBy INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS goods_receipt_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receiptId INT NOT NULL,
      purchaseOrderItemId INT,
      productId INT,
      materialCode VARCHAR(50),
      materialName VARCHAR(200) NOT NULL,
      specification VARCHAR(200),
      unit VARCHAR(20),
      orderedQty DECIMAL(12,4) NOT NULL,
      receivedQty DECIMAL(12,4) NOT NULL,
      batchNo VARCHAR(50),
      sterilizationBatchNo VARCHAR(50),
      inspectionQty DECIMAL(12,4),
      qualifiedQty DECIMAL(12,4),
      unqualifiedQty DECIMAL(12,4),
      remark TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  goodsReceiptsTableReady = true;
}

async function syncPurchaseOrderReceiptProgress(
  purchaseOrderId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !purchaseOrderId) return;
  await ensurePurchaseOrdersStatusEnum(db);

  const [order] = await db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, purchaseOrderId))
    .limit(1);
  if (!order) return;

  const orderItems = await db
    .select({
      id: purchaseOrderItems.id,
      productId: purchaseOrderItems.productId,
      quantity: purchaseOrderItems.quantity,
    })
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.orderId, purchaseOrderId));
  if (orderItems.length === 0) return;

  const receiptItems = await db
    .select({
      purchaseOrderItemId: goodsReceiptItems.purchaseOrderItemId,
      productId: goodsReceiptItems.productId,
      receivedQty: goodsReceiptItems.receivedQty,
    })
    .from(goodsReceiptItems)
    .innerJoin(goodsReceipts, eq(goodsReceiptItems.receiptId, goodsReceipts.id))
    .where(eq(goodsReceipts.purchaseOrderId, purchaseOrderId));

  const inboundTxRows =
    receiptItems.length === 0
      ? await db
          .select({
            productId: inventoryTransactions.productId,
            quantity: inventoryTransactions.quantity,
          })
          .from(inventoryTransactions)
          .where(
            and(
              eq(inventoryTransactions.type, "purchase_in"),
              eq(inventoryTransactions.relatedOrderId, purchaseOrderId)
            )
          )
      : [];

  const receivedByItemId = new Map<number, number>();
  const receivedByProductId = new Map<number, number>();

  for (const row of receiptItems) {
    const receivedQty = Number(row.receivedQty || 0);
    if (row.purchaseOrderItemId) {
      receivedByItemId.set(
        Number(row.purchaseOrderItemId),
        (receivedByItemId.get(Number(row.purchaseOrderItemId)) || 0) +
          receivedQty
      );
    }
    if (row.productId) {
      receivedByProductId.set(
        Number(row.productId),
        (receivedByProductId.get(Number(row.productId)) || 0) + receivedQty
      );
    }
  }

  for (const row of inboundTxRows) {
    const receivedQty = Number(row.quantity || 0);
    if (!row.productId || receivedQty <= 0) continue;
    receivedByProductId.set(
      Number(row.productId),
      (receivedByProductId.get(Number(row.productId)) || 0) + receivedQty
    );
  }

  let totalOrdered = 0;
  let totalReceived = 0;

  for (const item of orderItems) {
    const orderedQty = Number(item.quantity || 0);
    const receivedQty =
      item.id && receivedByItemId.has(Number(item.id))
        ? receivedByItemId.get(Number(item.id)) || 0
        : item.productId
          ? receivedByProductId.get(Number(item.productId)) || 0
          : 0;

    totalOrdered += orderedQty;
    totalReceived += receivedQty;

    await db
      .update(purchaseOrderItems)
      .set({ receivedQty: String(receivedQty) })
      .where(eq(purchaseOrderItems.id, item.id));
  }

  let nextStatus = String(order.status || "ordered");
  if (totalReceived > 0 && totalReceived < totalOrdered) {
    nextStatus = "partial_received";
  } else if (totalReceived >= totalOrdered && totalOrdered > 0) {
    nextStatus =
      String(order.status || "") === "completed" ? "completed" : "received";
  } else if (
    totalReceived <= 0 &&
    ["partial_received", "received", "completed"].includes(
      String(order.status || "")
    )
  ) {
    nextStatus = "ordered";
  }

  await db
    .update(purchaseOrders)
    .set({ status: nextStatus as any })
    .where(eq(purchaseOrders.id, purchaseOrderId));
}

async function syncGoodsReceiptInboundProgress(
  receiptId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !receiptId) return;

  const [receipt] = await db
    .select({
      id: goodsReceipts.id,
      purchaseOrderId: goodsReceipts.purchaseOrderId,
      status: goodsReceipts.status,
    })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!receipt || !receipt.purchaseOrderId) return;

  const currentStatus = String(receipt.status || "");
  if (!["passed", "warehoused"].includes(currentStatus)) return;

  const receiptItems = await db
    .select({
      productId: goodsReceiptItems.productId,
      materialName: goodsReceiptItems.materialName,
      batchNo: goodsReceiptItems.batchNo,
      receivedQty: goodsReceiptItems.receivedQty,
      qualifiedQty: goodsReceiptItems.qualifiedQty,
    })
    .from(goodsReceiptItems)
    .where(eq(goodsReceiptItems.receiptId, receiptId));
  if (receiptItems.length === 0) return;

  const inboundRows = await db
    .select({
      documentNo: inventoryTransactions.documentNo,
      productId: inventoryTransactions.productId,
      itemName: inventoryTransactions.itemName,
      batchNo: inventoryTransactions.batchNo,
      quantity: inventoryTransactions.quantity,
      createdAt: inventoryTransactions.createdAt,
    })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.type, "purchase_in"),
        eq(
          inventoryTransactions.relatedOrderId,
          Number(receipt.purchaseOrderId)
        )
      )
    )
    .orderBy(desc(inventoryTransactions.createdAt));

  let totalTarget = 0;
  let totalInbound = 0;

  for (const item of receiptItems) {
    const targetQty = Number(item.qualifiedQty ?? item.receivedQty ?? 0);
    if (targetQty <= 0) continue;

    totalTarget += targetQty;

    const matchedInboundQty = inboundRows
      .filter(row => {
        const sameProduct = item.productId
          ? Number(row.productId || 0) === Number(item.productId)
          : String(row.itemName || "").trim() ===
            String(item.materialName || "").trim();
        const sameBatch = item.batchNo
          ? String(row.batchNo || "").trim() ===
            String(item.batchNo || "").trim()
          : true;
        return sameProduct && sameBatch;
      })
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0);

    totalInbound += Math.min(matchedInboundQty, targetQty);
  }

  const firstInboundRow = inboundRows[0];

  if (totalTarget > 0 && totalInbound >= totalTarget) {
    await db
      .update(goodsReceipts)
      .set({
        status: "warehoused" as any,
        inboundDocumentNo: firstInboundRow?.documentNo || null,
        inboundAt: firstInboundRow?.createdAt || new Date(),
      })
      .where(eq(goodsReceipts.id, receiptId));
    return;
  }

  if (currentStatus === "warehoused") {
    await db
      .update(goodsReceipts)
      .set({
        status: "passed" as any,
        inboundDocumentNo: null,
        inboundAt: null,
      })
      .where(eq(goodsReceipts.id, receiptId));
  }
}

async function syncPurchaseInboundProgressByOrder(
  purchaseOrderId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !purchaseOrderId) return;

  await syncPurchaseOrderReceiptProgress(purchaseOrderId, db);

  const receiptRows = await db
    .select({ id: goodsReceipts.id })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.purchaseOrderId, purchaseOrderId));

  for (const row of receiptRows) {
    await syncGoodsReceiptInboundProgress(Number(row.id), db);
  }

  await syncPurchaseOrderFinancialProgress(purchaseOrderId, db);
}

export async function getGoodsReceipts(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureGoodsReceiptsTable(db);
  const { status, search, limit = 100, offset = 0 } = params ?? {};
  const conditions: any[] = [];
  if (status && status !== "all")
    conditions.push(eq(goodsReceipts.status, status as any));
  if (search)
    conditions.push(
      or(
        like(goodsReceipts.receiptNo, `%${search}%`),
        like(goodsReceipts.purchaseOrderNo, `%${search}%`),
        like(goodsReceipts.supplierName, `%${search}%`)
      )
    );
  const rows = await db
    .select()
    .from(goodsReceipts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(goodsReceipts.createdAt))
    .limit(limit)
    .offset(offset);
  if (rows.length === 0) return [];
  const receiptIds = rows.map(r => r.id);
  const allItems = await db
    .select()
    .from(goodsReceiptItems)
    .where(inArray(goodsReceiptItems.receiptId, receiptIds));
  const purchaseOrderItemIds = allItems
    .map(item => Number(item.purchaseOrderItemId || 0))
    .filter(id => Number.isFinite(id) && id > 0);
  const unitPriceRows =
    purchaseOrderItemIds.length > 0
      ? await db
          .select({
            id: purchaseOrderItems.id,
            unitPrice: purchaseOrderItems.unitPrice,
          })
          .from(purchaseOrderItems)
          .where(inArray(purchaseOrderItems.id, purchaseOrderItemIds))
      : [];
  const unitPriceMap = new Map(
    unitPriceRows.map(row => [Number(row.id), row.unitPrice])
  );
  return rows.map(r => ({
    ...r,
    items: allItems
      .filter(it => it.receiptId === r.id)
      .map(item => ({
        ...item,
        unitPrice: item.purchaseOrderItemId
          ? (unitPriceMap.get(Number(item.purchaseOrderItemId)) ?? "0")
          : "0",
      })),
  }));
}

export async function getGoodsReceiptById(id: number) {
  const db = await getDb();
  if (!db) return null;
  await ensureGoodsReceiptsTable(db);
  const [receipt] = await db
    .select()
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, id));
  if (!receipt) return null;
  const items = await db
    .select()
    .from(goodsReceiptItems)
    .where(eq(goodsReceiptItems.receiptId, id));
  const purchaseOrderItemIds = items
    .map(item => Number(item.purchaseOrderItemId || 0))
    .filter(itemId => Number.isFinite(itemId) && itemId > 0);
  const unitPriceRows =
    purchaseOrderItemIds.length > 0
      ? await db
          .select({
            id: purchaseOrderItems.id,
            unitPrice: purchaseOrderItems.unitPrice,
          })
          .from(purchaseOrderItems)
          .where(inArray(purchaseOrderItems.id, purchaseOrderItemIds))
      : [];
  const unitPriceMap = new Map(
    unitPriceRows.map(row => [Number(row.id), row.unitPrice])
  );
  return {
    ...receipt,
    items: items.map(item => ({
      ...item,
      unitPrice: item.purchaseOrderItemId
        ? (unitPriceMap.get(Number(item.purchaseOrderItemId)) ?? "0")
        : "0",
    })),
  };
}

export async function createGoodsReceipt(data: {
  receiptNo: string;
  purchaseOrderId: number;
  purchaseOrderNo: string;
  supplierId?: number;
  supplierName?: string;
  warehouseId: number;
  receiptDate: string;
  remark?: string;
  createdBy?: number;
  items: Array<{
    purchaseOrderItemId?: number;
    productId?: number;
    materialCode?: string;
    materialName: string;
    specification?: string;
    unit?: string;
    orderedQty: string;
    receivedQty: string;
    batchNo?: string;
    sterilizationBatchNo?: string;
    remark?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureGoodsReceiptsTable(db);
  const { items, ...receiptData } = data;
  const [result] = await db.insert(goodsReceipts).values({
    ...receiptData,
    status: "pending_inspection",
  } as any);
  const receiptId = (result as any).insertId;
  if (items && items.length > 0) {
    await db
      .insert(goodsReceiptItems)
      .values(items.map(item => ({ ...item, receiptId }) as any));
  }
  await syncPurchaseOrderFinancialProgress(data.purchaseOrderId, db);
  return receiptId;
}

export async function updateGoodsReceipt(
  id: number,
  data: Partial<{
    status: string;
    inspectorId: number;
    inspectorName: string;
    inspectionDate: string;
    inspectionResult: string;
    inspectionRemark: string;
    inboundDocumentNo: string;
    inboundAt: Date;
    remark: string;
    items: Array<{
      id?: number;
      purchaseOrderItemId?: number;
      productId?: number;
      materialCode?: string;
      materialName: string;
      specification?: string;
      unit?: string;
      orderedQty: string;
      receivedQty: string;
      batchNo?: string;
      sterilizationBatchNo?: string;
      inspectionQty?: string;
      qualifiedQty?: string;
      unqualifiedQty?: string;
      remark?: string;
    }>;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureGoodsReceiptsTable(db);
  const [currentReceipt] = await db
    .select({ purchaseOrderId: goodsReceipts.purchaseOrderId })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, id))
    .limit(1);
  const { items, ...receiptData } = data;
  if (Object.keys(receiptData).length > 0) {
    await db
      .update(goodsReceipts)
      .set(receiptData as any)
      .where(eq(goodsReceipts.id, id));
  }
  if (items) {
    await db
      .delete(goodsReceiptItems)
      .where(eq(goodsReceiptItems.receiptId, id));
    if (items.length > 0) {
      await db
        .insert(goodsReceiptItems)
        .values(items.map(item => ({ ...item, receiptId: id }) as any));
    }
  }
  if (currentReceipt?.purchaseOrderId) {
    await syncPurchaseOrderFinancialProgress(
      Number(currentReceipt.purchaseOrderId),
      db
    );
  }
}

export async function deleteGoodsReceipt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureGoodsReceiptsTable(db);
  const [currentReceipt] = await db
    .select({
      purchaseOrderId: goodsReceipts.purchaseOrderId,
      status: goodsReceipts.status,
      inboundDocumentNo: goodsReceipts.inboundDocumentNo,
    })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, id))
    .limit(1);
  if (!currentReceipt) {
    throw new Error("到货单不存在");
  }
  if (
    String(currentReceipt.status || "") === "warehoused" ||
    Boolean(currentReceipt.inboundDocumentNo)
  ) {
    throw new Error("该到货单已入库，不能删除");
  }
  const linkedIqcRows = await db
    .select({ id: iqcInspections.id })
    .from(iqcInspections)
    .where(eq(iqcInspections.goodsReceiptId, id));
  const linkedIqcIds = linkedIqcRows.map((row) => Number(row.id)).filter((value) => value > 0);
  if (linkedIqcIds.length > 0) {
    await db
      .delete(iqcInspectionItems)
      .where(inArray(iqcInspectionItems.iqcId, linkedIqcIds));
    await db
      .delete(iqcInspections)
      .where(eq(iqcInspections.goodsReceiptId, id));
  }
  await db.delete(goodsReceiptItems).where(eq(goodsReceiptItems.receiptId, id));
  await db.delete(goodsReceipts).where(eq(goodsReceipts.id, id));
  if (currentReceipt?.purchaseOrderId) {
    await syncPurchaseOrderFinancialProgress(
      Number(currentReceipt.purchaseOrderId),
      db
    );
  }
}

// ==================== 检验要求 ====================

let inspectionRequirementsTableReady = false;

export async function ensureInspectionRequirementsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || inspectionRequirementsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inspection_requirements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requirementNo VARCHAR(50) NOT NULL UNIQUE,
      type ENUM('IQC','IPQC','OQC') NOT NULL,
      productCode VARCHAR(50),
      productName VARCHAR(200) NOT NULL,
      version VARCHAR(20) DEFAULT '1.0',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      remark TEXT,
      createdBy INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inspection_requirement_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requirementId INT NOT NULL,
      sourceDataId VARCHAR(64),
      itemName VARCHAR(200) NOT NULL,
      itemType ENUM('qualitative','quantitative') NOT NULL,
      standard VARCHAR(500),
      standardRequirement TEXT,
      standardBasis TEXT,
      inspectionRequirement TEXT,
      minVal DECIMAL(12,4),
      maxVal DECIMAL(12,4),
      unit VARCHAR(20),
      acceptedValues VARCHAR(500),
      sortOrder INT DEFAULT 0,
      remark TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const ensureColumns = async (
    tableName: string,
    columns: Array<{ name: string; ddl: string }>
  ) => {
    const existingColumnsResult = await db.execute(
      sql.raw(`SHOW COLUMNS FROM ${tableName}`)
    );
    const existingRows = Array.isArray((existingColumnsResult as any)?.[0])
      ? (existingColumnsResult as any)[0]
      : (existingColumnsResult as any);
    const existingNames = new Set(
      Array.from(existingRows as any[])
        .map((row: any) => String(row?.Field ?? row?.field ?? "").trim())
        .filter(Boolean)
    );

    for (const column of columns) {
      if (existingNames.has(column.name)) continue;
      await db.execute(
        sql.raw(`ALTER TABLE ${tableName} ADD COLUMN ${column.ddl}`)
      );
    }
  };
  await ensureColumns("inspection_requirement_items", [
    { name: "sourceDataId", ddl: "sourceDataId VARCHAR(64) NULL" },
    { name: "standardRequirement", ddl: "standardRequirement TEXT NULL" },
    { name: "standardBasis", ddl: "standardBasis TEXT NULL" },
    { name: "inspectionRequirement", ddl: "inspectionRequirement TEXT NULL" },
    { name: "labTestType", ddl: "labTestType VARCHAR(50) NULL" },
    { name: "boundEquipmentIds", ddl: "boundEquipmentIds TEXT NULL" },
  ]);
  inspectionRequirementsTableReady = true;
}

export async function getInspectionRequirements(params?: {
  type?: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureInspectionRequirementsTable(db);
  const { type, search, status, limit = 200, offset = 0 } = params ?? {};
  const conditions: any[] = [];
  if (type) conditions.push(eq(inspectionRequirements.type, type as any));
  if (status) conditions.push(eq(inspectionRequirements.status, status as any));
  if (search)
    conditions.push(
      or(
        like(inspectionRequirements.requirementNo, `%${search}%`),
        like(inspectionRequirements.productName, `%${search}%`),
        like(inspectionRequirements.productCode, `%${search}%`)
      )
    );
  const rows = await db
    .select()
    .from(inspectionRequirements)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(inspectionRequirements.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function getInspectionRequirementById(id: number) {
  const db = await getDb();
  if (!db) return null;
  await ensureInspectionRequirementsTable(db);
  const [req] = await db
    .select()
    .from(inspectionRequirements)
    .where(eq(inspectionRequirements.id, id));
  if (!req) return null;
  const items = await db
    .select()
    .from(inspectionRequirementItems)
    .where(eq(inspectionRequirementItems.requirementId, id))
    .orderBy(inspectionRequirementItems.sortOrder);
  return { ...req, items };
}

export async function createInspectionRequirement(data: {
  requirementNo: string;
  type: string;
  productCode?: string;
  productName: string;
  version?: string;
  status?: string;
  remark?: string;
  createdBy?: number;
  items: Array<{
    sourceDataId?: string;
    itemName: string;
    itemType: string;
    standard?: string;
    standardRequirement?: string;
    standardBasis?: string;
    inspectionRequirement?: string;
    minValue?: string;
    maxValue?: string;
    unit?: string;
    acceptedValues?: string;
    sortOrder?: number;
    remark?: string;
    labTestType?: string;
    boundEquipmentIds?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInspectionRequirementsTable(db);
  const { items, ...reqData } = data;
  const [result] = await db
    .insert(inspectionRequirements)
    .values(reqData as any);
  const reqId = (result as any).insertId;
  if (items && items.length > 0) {
    await db.insert(inspectionRequirementItems).values(
      items.map((item, idx) => {
        const { minValue, maxValue, standardRequirement, standard, ...rest } =
          item as any;
        return {
          ...rest,
          standard: standard ?? standardRequirement ?? null,
          standardRequirement: standardRequirement ?? standard ?? null,
          minVal: minValue ?? null,
          maxVal: maxValue ?? null,
          requirementId: reqId,
          sortOrder: item.sortOrder ?? idx,
        };
      }) as any
    );
  }
  return reqId;
}

export async function updateInspectionRequirement(
  id: number,
  data: {
    requirementNo?: string;
    type?: string;
    productCode?: string;
    productName?: string;
    version?: string;
    status?: string;
    remark?: string;
    items?: Array<{
      sourceDataId?: string;
      itemName: string;
      itemType: string;
      standard?: string;
      standardRequirement?: string;
      standardBasis?: string;
      inspectionRequirement?: string;
      minValue?: string;
      maxValue?: string;
      unit?: string;
        acceptedValues?: string;
    sortOrder?: number;
    remark?: string;
    labTestType?: string;
    boundEquipmentIds?: string;
  }>;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInspectionRequirementsTable(db);
  const { items, ...reqData } = data;
  if (Object.keys(reqData).length > 0) {
    await db
      .update(inspectionRequirements)
      .set(reqData as any)
      .where(eq(inspectionRequirements.id, id));
  }
  if (items !== undefined) {
    await db
      .delete(inspectionRequirementItems)
      .where(eq(inspectionRequirementItems.requirementId, id));
    if (items.length > 0) {
      await db.insert(inspectionRequirementItems).values(
        items.map((item, idx) => {
          const { minValue, maxValue, standardRequirement, standard, ...rest } =
            item as any;
          return {
            ...rest,
            standard: standard ?? standardRequirement ?? null,
            standardRequirement: standardRequirement ?? standard ?? null,
            minVal: minValue ?? null,
            maxVal: maxValue ?? null,
            requirementId: id,
            sortOrder: item.sortOrder ?? idx,
          };
        }) as any
      );
    }
  }
}

export async function deleteInspectionRequirement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInspectionRequirementsTable(db);
  await db
    .delete(inspectionRequirementItems)
    .where(eq(inspectionRequirementItems.requirementId, id));
  await db
    .delete(inspectionRequirements)
    .where(eq(inspectionRequirements.id, id));
}

// ==================== 来料检验单（IQC） ====================

let iqcInspectionsTableReady = false;
let iqcPendingUploadsTableReady = false;

async function ensureIqcPendingUploadsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || iqcPendingUploadsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS iqc_pending_uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      inspectionNo VARCHAR(50) NOT NULL,
      productName VARCHAR(200) NULL,
      fileName VARCHAR(255) NOT NULL,
      filePath VARCHAR(500) NOT NULL,
      mimeType VARCHAR(100) NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  iqcPendingUploadsTableReady = true;
}

export async function ensureIqcInspectionsTable(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || iqcInspectionsTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS iqc_inspections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      inspectionNo VARCHAR(50) NOT NULL UNIQUE,
      goodsReceiptId INT,
      goodsReceiptNo VARCHAR(50),
      goodsReceiptItemId INT,
      productId INT,
      productCode VARCHAR(50),
      productName VARCHAR(200) NOT NULL,
      specification VARCHAR(200),
      supplierId INT,
      supplierName VARCHAR(200),
      batchNo VARCHAR(50),
      sterilizationBatchNo VARCHAR(50),
      receivedQty DECIMAL(12,4),
      sampleQty DECIMAL(12,4),
      unit VARCHAR(20),
      inspectionRequirementId INT,
      inspectionDate DATE,
      inspectorId INT,
      inspectorName VARCHAR(64),
      result ENUM('pending','passed','failed','conditional_pass') NOT NULL DEFAULT 'pending',
      remark TEXT,
      createdBy INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS iqc_inspection_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      iqcId INT NOT NULL,
      requirementItemId INT,
      itemName VARCHAR(200) NOT NULL,
      itemType ENUM('qualitative','quantitative') NOT NULL,
      standard VARCHAR(500),
      minVal DECIMAL(12,4),
      maxVal DECIMAL(12,4),
      unit VARCHAR(20),
      measuredValue VARCHAR(100),
      acceptedValues VARCHAR(500),
      actualValue VARCHAR(200),
      conclusion ENUM('pass','fail','pending') NOT NULL DEFAULT 'pending',
      sortOrder INT DEFAULT 0,
      remark TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // 动态添加新字段（已存在的表不会重建，需要 ALTER TABLE）
  const iqcNewCols = [
    { name: "attachments", ddl: "TEXT NULL" },
    { name: "signatures", ddl: "TEXT NULL" },
    { name: "qualifiedQty", ddl: "DECIMAL(12,4) NULL" },
    { name: "reportMode", ddl: "VARCHAR(20) NULL" },
    { name: "supplierCode", ddl: "VARCHAR(50) NULL" },
    { name: "supplierName", ddl: "VARCHAR(200) NULL" },
    { name: "reviewerId", ddl: "INT NULL" },
    { name: "reviewerName", ddl: "VARCHAR(64) NULL" },
    { name: "reviewStatus", ddl: "VARCHAR(20) NULL" },
    { name: "reviewedAt", ddl: "TIMESTAMP NULL" },
  ];
  for (const col of iqcNewCols) {
    try {
      await db.execute(
        sql.raw(`ALTER TABLE iqc_inspections ADD COLUMN ${col.name} ${col.ddl}`)
      );
    } catch (err) {
      const msg = String((err as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(msg)) {
        console.warn(
          `[DB] Could not add column ${col.name} to iqc_inspections:`,
          msg
        );
      }
    }
  }
  // 动态添加 iqc_inspection_items 新字段
  const iqcItemNewCols = [
    { name: "sampleValues", ddl: "sampleValues TEXT NULL" },
    { name: "labTestType", ddl: "labTestType VARCHAR(50) NULL" },
    { name: "labRecordId", ddl: "labRecordId INT NULL" },
  ];
  for (const col of iqcItemNewCols) {
    try {
      await db.execute(
        sql.raw(`ALTER TABLE iqc_inspection_items ADD COLUMN ${col.ddl}`)
      );
    } catch (err) {
      const msg = String((err as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(msg)) {
        console.warn(
          `[DB] Could not add column ${col.name} to iqc_inspection_items:`,
          msg
        );
      }
    }
  }
  await ensureIqcPendingUploadsTable(db);
  iqcInspectionsTableReady = true;
}

async function buildIqcReviewState(
  db: any,
  params: {
    result?: unknown;
    signatures?: unknown;
    reviewerId?: unknown;
    reviewerName?: unknown;
  }
) {
  const fallbackReviewer = await getQualityDepartmentReviewerUser(db);
  const reviewerId =
    Number(params.reviewerId || 0) || Number(fallbackReviewer?.id || 0) || null;
  const reviewerName =
    String(params.reviewerName || "").trim() ||
    String(fallbackReviewer?.name || "").trim() ||
    null;
  const hasReviewerSign = hasValidSignatureType(params.signatures, "reviewer");
  const result = String(params.result || "pending");
  const reviewStatus =
    result === "pending"
      ? null
      : hasReviewerSign
        ? "reviewed"
        : reviewerId
          ? "pending"
          : null;
  return {
    reviewerId,
    reviewerName,
    reviewStatus,
    reviewedAt: reviewStatus === "reviewed" ? new Date() : null,
  };
}

export async function getIqcPendingUploads(inspectionNo: string) {
  const db = await getDb();
  if (!db) return [];
  await ensureIqcPendingUploadsTable(db);
  const rows = (await db.execute(sql`
    SELECT id, inspectionNo, productName, fileName, filePath, mimeType, createdAt
    FROM iqc_pending_uploads
    WHERE inspectionNo = ${inspectionNo}
    ORDER BY createdAt ASC, id ASC
  `)) as any;
  const rowList = Array.isArray(rows?.[0]) ? rows[0] : rows;
  return Array.from(rowList as any[]).map((row: any) => ({
    id: Number(row.id),
    inspectionNo: String(row.inspectionNo || ""),
    productName: String(row.productName || ""),
    fileName: String(row.fileName || ""),
    filePath: String(row.filePath || ""),
    mimeType: String(row.mimeType || ""),
    createdAt: row.createdAt ?? null,
  }));
}

export async function addIqcPendingUpload(input: {
  inspectionNo: string;
  productName?: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcPendingUploadsTable(db);
  await db.execute(sql`
    INSERT INTO iqc_pending_uploads (inspectionNo, productName, fileName, filePath, mimeType)
    VALUES (${input.inspectionNo}, ${input.productName || null}, ${input.fileName}, ${input.filePath}, ${input.mimeType || null})
  `);
}

export async function clearIqcPendingUploads(inspectionNo: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcPendingUploadsTable(db);
  await db.execute(
    sql`DELETE FROM iqc_pending_uploads WHERE inspectionNo = ${inspectionNo}`
  );
}

export async function getIqcInspections(params?: {
  result?: string;
  search?: string;
  goodsReceiptId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  await ensureIqcInspectionsTable(db);
  const {
    result,
    search,
    goodsReceiptId,
    limit = 200,
    offset = 0,
  } = params ?? {};
  const conditions: any[] = [];
  if (result && result !== "all") {
    conditions.push(eq(iqcInspections.result, result as any));
  } else if (!result || result === "all") {
    // 全部状态时排除草稿，草稿需单独筛选
    conditions.push(ne(iqcInspections.result, "draft" as any));
  }
  if (goodsReceiptId)
    conditions.push(eq(iqcInspections.goodsReceiptId, goodsReceiptId));
  if (search)
    conditions.push(
      or(
        like(iqcInspections.inspectionNo, `%${search}%`),
        like(iqcInspections.productName, `%${search}%`),
        like(iqcInspections.supplierName, `%${search}%`),
        like(iqcInspections.goodsReceiptNo, `%${search}%`)
      )
    );
  const rows = await db
    .select()
    .from(iqcInspections)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(iqcInspections.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

async function syncGoodsReceiptItemInspectionQuantities(
  receiptId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !receiptId) return;
  await ensureGoodsReceiptsTable(db);
  await ensureIqcInspectionsTable(db);

  const receiptItems = await db
    .select({
      id: goodsReceiptItems.id,
      receivedQty: goodsReceiptItems.receivedQty,
    })
    .from(goodsReceiptItems)
    .where(eq(goodsReceiptItems.receiptId, receiptId));
  if (receiptItems.length === 0) return;

  const itemIds = receiptItems.map(item => Number(item.id));
  const inspections = await db
    .select({
      id: iqcInspections.id,
      goodsReceiptItemId: iqcInspections.goodsReceiptItemId,
      result: iqcInspections.result,
      receivedQty: iqcInspections.receivedQty,
      qualifiedQty: iqcInspections.qualifiedQty,
      updatedAt: iqcInspections.updatedAt,
      createdAt: iqcInspections.createdAt,
    })
    .from(iqcInspections)
    .where(
      and(
        eq(iqcInspections.goodsReceiptId, receiptId),
        inArray(iqcInspections.goodsReceiptItemId, itemIds)
      )
    )
    .orderBy(
      desc(iqcInspections.updatedAt),
      desc(iqcInspections.createdAt),
      desc(iqcInspections.id)
    );

  const latestByItem = new Map<number, (typeof inspections)[number]>();
  inspections.forEach(inspection => {
    const itemId = Number(inspection.goodsReceiptItemId || 0);
    if (itemId > 0 && !latestByItem.has(itemId)) {
      latestByItem.set(itemId, inspection);
    }
  });

  for (const item of receiptItems) {
    const current = latestByItem.get(Number(item.id));
    if (!current) {
      await db
        .update(goodsReceiptItems)
        .set({
          inspectionQty: null,
          qualifiedQty: null,
          unqualifiedQty: null,
        })
        .where(eq(goodsReceiptItems.id, Number(item.id)));
      continue;
    }

    const inspectionQty = Number(current.receivedQty ?? item.receivedQty ?? 0);
    let qualifiedQty = Number(current.qualifiedQty ?? 0);
    if (String(current.result || "") === "passed" && qualifiedQty <= 0) {
      qualifiedQty = inspectionQty;
    }
    const unqualifiedQty = Math.max(0, inspectionQty - qualifiedQty);

    await db
      .update(goodsReceiptItems)
      .set({
        inspectionQty: String(inspectionQty),
        qualifiedQty: String(qualifiedQty),
        unqualifiedQty: String(unqualifiedQty),
      })
      .where(eq(goodsReceiptItems.id, Number(item.id)));
  }
}

async function refreshGoodsReceiptInspectionStatus(
  receiptId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || !receiptId) return;
  await ensureGoodsReceiptsTable(db);
  await ensureIqcInspectionsTable(db);

  const [currentReceipt] = await db
    .select({ status: goodsReceipts.status })
    .from(goodsReceipts)
    .where(eq(goodsReceipts.id, receiptId))
    .limit(1);
  if (!currentReceipt) return;

  const receiptItems = await db
    .select({ id: goodsReceiptItems.id })
    .from(goodsReceiptItems)
    .where(eq(goodsReceiptItems.receiptId, receiptId));

  if (receiptItems.length === 0) {
    return;
  }

  const itemIds = receiptItems.map(item => Number(item.id));
  const inspections = await db
    .select({
      goodsReceiptItemId: iqcInspections.goodsReceiptItemId,
      result: iqcInspections.result,
      reviewStatus: (iqcInspections as any).reviewStatus,
      reviewerId: (iqcInspections as any).reviewerId,
      signatures: iqcInspections.signatures,
      updatedAt: iqcInspections.updatedAt,
      createdAt: iqcInspections.createdAt,
      id: iqcInspections.id,
    })
    .from(iqcInspections)
    .where(
      and(
        eq(iqcInspections.goodsReceiptId, receiptId),
        inArray(iqcInspections.goodsReceiptItemId, itemIds)
      )
    )
    .orderBy(
      desc(iqcInspections.updatedAt),
      desc(iqcInspections.createdAt),
      desc(iqcInspections.id)
    );

  const resultByItem = new Map<number, string>();
  inspections.forEach(inspection => {
    const itemId = Number(inspection.goodsReceiptItemId || 0);
    if (itemId > 0 && !resultByItem.has(itemId)) {
      resultByItem.set(itemId, String(inspection.result || "pending"));
    }
  });

  const totalCount = itemIds.length;
  const recordCount = itemIds.filter(itemId => resultByItem.has(itemId)).length;
  const finishedResults = itemIds
    .map(itemId => resultByItem.get(itemId))
    .filter((result): result is string => !!result && result !== "pending");
  const latestInspectionByItem = new Map<number, (typeof inspections)[number]>();
  inspections.forEach((inspection) => {
    const itemId = Number(inspection.goodsReceiptItemId || 0);
    if (itemId > 0 && !latestInspectionByItem.has(itemId)) {
      latestInspectionByItem.set(itemId, inspection);
    }
  });
  const hasPendingReview = itemIds.some((itemId) => {
    const latestInspection = latestInspectionByItem.get(itemId);
    if (!latestInspection) return false;
    const result = String(latestInspection.result || "pending");
    if (result === "pending") return false;
    const reviewerId = Number(latestInspection.reviewerId || 0);
    const reviewStatus = String(latestInspection.reviewStatus || "");
    const reviewed =
      reviewStatus === "reviewed" ||
      hasValidSignatureType(latestInspection.signatures, "reviewer");
    return reviewerId > 0 && !reviewed;
  });

  let nextStatus: "pending_inspection" | "inspecting" | "passed" | "failed" =
    "pending_inspection";

  if (finishedResults.length >= totalCount && !hasPendingReview) {
    nextStatus = finishedResults.some(result => result === "failed")
      ? "failed"
      : "passed";
  } else if (recordCount > 0) {
    nextStatus = "inspecting";
  }

  if (String(currentReceipt.status || "") !== "warehoused") {
    await db
      .update(goodsReceipts)
      .set({ status: nextStatus as any })
      .where(eq(goodsReceipts.id, receiptId));
  }

  await syncGoodsReceiptInboundProgress(receiptId, db);
}

async function countPendingIqcItems(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? (await getDb());
  if (!db) return 0;
  await ensureGoodsReceiptsTable(db);
  await ensureIqcInspectionsTable(db);
  const rows = await db.execute(
    sql.raw(`
    SELECT COUNT(*) AS count
    FROM goods_receipt_items gri
    INNER JOIN goods_receipts gr ON gr.id = gri.receiptId
    WHERE gr.status <> 'warehoused'
      AND NOT EXISTS (
        SELECT 1
        FROM iqc_inspections iqc
        WHERE iqc.goodsReceiptItemId = gri.id
          AND iqc.result <> 'pending'
      )
  `)
  );
  const rowList = Array.isArray((rows as any)?.[0])
    ? (rows as any)[0]
    : (rows as any);
  const first = Array.from(rowList as any[])[0] as any;
  return Number(first?.count || 0);
}

async function getPendingIqcReviewRows(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? (await getDb());
  if (!db) return [] as Array<{
    id: number;
    inspectionNo: string | null;
    goodsReceiptId: number | null;
    goodsReceiptNo: string | null;
    purchaseOrderNo: string | null;
    productName: string | null;
    supplierName: string | null;
    reviewerId: number | null;
    reviewerName: string | null;
    reviewStatus: string | null;
    result: string | null;
    signatures: string | null;
    updatedAt: Date | null;
    createdAt: Date | null;
  }>;
  await ensureGoodsReceiptsTable(db);
  await ensureIqcInspectionsTable(db);
  const fallbackReviewer = await getQualityDepartmentReviewerUser(db);

  const rows: Array<{
    id: number;
    inspectionNo: string | null;
    goodsReceiptId: number | null;
    goodsReceiptNo: string | null;
    purchaseOrderNo: string | null;
    productName: string | null;
    supplierName: string | null;
    reviewerId: number | null;
    reviewerName: string | null;
    reviewStatus: string | null;
    result: string | null;
    signatures: string | null;
    updatedAt: Date | null;
    createdAt: Date | null;
  }> = await db
    .select({
      id: iqcInspections.id,
      inspectionNo: iqcInspections.inspectionNo,
      goodsReceiptId: iqcInspections.goodsReceiptId,
      goodsReceiptNo: iqcInspections.goodsReceiptNo,
      purchaseOrderNo: goodsReceipts.purchaseOrderNo,
      productName: iqcInspections.productName,
      supplierName: iqcInspections.supplierName,
      reviewerId: (iqcInspections as any).reviewerId,
      reviewerName: (iqcInspections as any).reviewerName,
      reviewStatus: (iqcInspections as any).reviewStatus,
      result: iqcInspections.result,
      signatures: iqcInspections.signatures,
      updatedAt: iqcInspections.updatedAt,
      createdAt: iqcInspections.createdAt,
    })
    .from(iqcInspections)
    .leftJoin(goodsReceipts, eq(iqcInspections.goodsReceiptId, goodsReceipts.id))
    .where(ne(iqcInspections.result, "pending"))
    .orderBy(desc(iqcInspections.updatedAt), desc(iqcInspections.createdAt), desc(iqcInspections.id));

  return rows
    .map((row) => {
      const assignedReviewerId =
        Number(row.reviewerId || 0) || Number(fallbackReviewer?.id || 0) || null;
      const assignedReviewerName =
        String(row.reviewerName || "").trim() ||
        String(fallbackReviewer?.name || "").trim() ||
        null;
      const reviewed =
        String(row.reviewStatus || "").trim() === "reviewed" ||
        hasValidSignatureType(row.signatures, "reviewer");
      return {
        ...row,
        reviewerId: assignedReviewerId,
        reviewerName: assignedReviewerName,
        reviewStatus: reviewed ? "reviewed" : "pending",
      };
    })
    .filter(
      (row) =>
        Number(row.reviewerId || 0) > 0 &&
        String(row.reviewStatus || "") !== "reviewed"
    );
}

async function countPendingIqcReviewItemsForUser(
  operatorId: number,
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const rows = await getPendingIqcReviewRows(dbArg);
  return rows.filter((row) => Number(row.reviewerId || 0) === Number(operatorId || 0)).length;
}

async function countPendingOqcItems(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? (await getDb());
  if (!db) return 0;
  const inspectedBatchRows = await db
    .select({ batchNo: qualityInspections.batchNo })
    .from(qualityInspections)
    .where(eq(qualityInspections.type, "OQC"));
  const inspectedBatchSet = new Set(
    inspectedBatchRows
      .map(row => String(row.batchNo || "").trim())
      .filter(Boolean)
  );
  const warehouseEntryRows = await db
    .select({
      id: productionWarehouseEntries.id,
      batchNo: productionWarehouseEntries.batchNo,
      status: productionWarehouseEntries.status,
    })
    .from(productionWarehouseEntries)
    .where(ne(productionWarehouseEntries.status, "rejected"));
  return warehouseEntryRows.filter(row => {
    const batchNo = String(row.batchNo || "").trim();
    if (!batchNo) return false;
    return !inspectedBatchSet.has(batchNo);
  }).length;
}

export async function getIqcInspectionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  await ensureIqcInspectionsTable(db);
  const [record] = await db
    .select()
    .from(iqcInspections)
    .where(eq(iqcInspections.id, id));
  if (!record) return null;
  const items = await db
    .select()
    .from(iqcInspectionItems)
    .where(eq(iqcInspectionItems.iqcId, id))
    .orderBy(iqcInspectionItems.sortOrder);
  return { ...record, items };
}

export async function createIqcInspection(data: {
  inspectionNo: string;
  reportMode?: string;
  goodsReceiptId?: number;
  goodsReceiptNo?: string;
  goodsReceiptItemId?: number;
  productId?: number;
  productCode?: string;
  productName: string;
  specification?: string;
  supplierId?: number;
  supplierName?: string;
  supplierCode?: string;
  batchNo?: string;
  sterilizationBatchNo?: string;
  receivedQty?: string;
  sampleQty?: string;
  qualifiedQty?: string;
  unit?: string;
  inspectionRequirementId?: number;
  inspectionDate?: string;
  inspectorId?: number;
  inspectorName?: string;
  result?: string;
  remark?: string;
  attachments?: string;
  signatures?: string;
  createdBy?: number;
  items: Array<{
    requirementItemId?: number;
    itemName: string;
    itemType: string;
    standard?: string;
    minValue?: string;
    maxValue?: string;
    unit?: string;
    measuredValue?: string;
    sampleValues?: string;
    acceptedValues?: string;
    actualValue?: string;
    conclusion?: string;
    sortOrder?: number;
    remark?: string;
    labTestType?: string;
    labRecordId?: number;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcInspectionsTable(db);
  const { items, ...iqcData } = data;
  const reviewState = await buildIqcReviewState(db, {
    result: iqcData.result,
    signatures: iqcData.signatures,
  });
  const [result] = await db.insert(iqcInspections).values({
    ...(iqcData as any),
    reviewerId: reviewState.reviewerId,
    reviewerName: reviewState.reviewerName,
    reviewStatus: reviewState.reviewStatus,
    reviewedAt: reviewState.reviewedAt,
  } as any);
  const iqcId = (result as any).insertId;
  if (items && items.length > 0) {
    await db.insert(iqcInspectionItems).values(
      items.map((item, idx) => {
        const { minValue, maxValue, ...rest } = item as any;
        return {
          ...rest,
          minVal: minValue ?? null,
          maxVal: maxValue ?? null,
          iqcId,
          sortOrder: item.sortOrder ?? idx,
        };
      }) as any
    );
  }
  if (data.goodsReceiptId) {
    await syncGoodsReceiptItemInspectionQuantities(data.goodsReceiptId, db);
    await refreshGoodsReceiptInspectionStatus(data.goodsReceiptId, db);
  }
  return iqcId;
}

export async function updateIqcInspection(
  id: number,
  data: {
    reportMode?: string;
    inspectionDate?: string;
    inspectorId?: number;
    inspectorName?: string;
    result?: string;
    sampleQty?: string;
    qualifiedQty?: string;
    remark?: string;
    attachments?: string;
    signatures?: string;
    inspectionRequirementId?: number;
    supplierCode?: string;
    items?: Array<{
      requirementItemId?: number;
      itemName: string;
      itemType: string;
      standard?: string;
      minValue?: string;
      maxValue?: string;
      unit?: string;
      measuredValue?: string;
      sampleValues?: string;
      acceptedValues?: string;
    actualValue?: string;
    conclusion?: string;
    sortOrder?: number;
    remark?: string;
    labTestType?: string;
    labRecordId?: number;
  }>;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcInspectionsTable(db);
  const { items, ...iqcData } = data;
  const [current] = await db
    .select()
    .from(iqcInspections)
    .where(eq(iqcInspections.id, id))
    .limit(1);
  const reviewState = await buildIqcReviewState(db, {
    result: iqcData.result ?? current?.result,
    signatures: iqcData.signatures ?? current?.signatures,
    reviewerId: (current as any)?.reviewerId,
    reviewerName: (current as any)?.reviewerName,
  });
  if (Object.keys(iqcData).length > 0) {
    await db
      .update(iqcInspections)
      .set({
        ...(iqcData as any),
        reviewerId: reviewState.reviewerId,
        reviewerName: reviewState.reviewerName,
        reviewStatus: reviewState.reviewStatus,
        reviewedAt: reviewState.reviewedAt,
      } as any)
      .where(eq(iqcInspections.id, id));
  }
  if (items !== undefined) {
    await db.delete(iqcInspectionItems).where(eq(iqcInspectionItems.iqcId, id));
    if (items.length > 0) {
      await db.insert(iqcInspectionItems).values(
        items.map((item, idx) => {
          const { minValue, maxValue, ...rest } = item as any;
          return {
            ...rest,
            minVal: minValue ?? null,
            maxVal: maxValue ?? null,
            iqcId: id,
            sortOrder: item.sortOrder ?? idx,
          };
        }) as any
      );
    }
  }
  const [iqc] = await db
    .select()
    .from(iqcInspections)
    .where(eq(iqcInspections.id, id));
  if (iqc?.goodsReceiptId) {
    await syncGoodsReceiptItemInspectionQuantities(iqc.goodsReceiptId, db);
    await refreshGoodsReceiptInspectionStatus(iqc.goodsReceiptId, db);
  }
}

export async function deleteIqcInspection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcInspectionsTable(db);
  const [iqc] = await db
    .select()
    .from(iqcInspections)
    .where(eq(iqcInspections.id, id));
  await db.delete(iqcInspectionItems).where(eq(iqcInspectionItems.iqcId, id));
  await db.delete(iqcInspections).where(eq(iqcInspections.id, id));
  if (iqc?.goodsReceiptId) {
    await syncGoodsReceiptItemInspectionQuantities(iqc.goodsReceiptId, db);
    await refreshGoodsReceiptInspectionStatus(iqc.goodsReceiptId, db);
  }
}

// ==================== 邮件协同表 ====================

let emailTablesReady = false;

export async function ensureEmailTables(
  dbArg?: ReturnType<typeof drizzle> | null
) {
  const db = dbArg ?? (await getDb());
  if (!db || emailTablesReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS emails (
      id INT AUTO_INCREMENT PRIMARY KEY,
      messageId VARCHAR(512),
      folder ENUM('inbox','sent','draft','trash') NOT NULL DEFAULT 'inbox',
      subject VARCHAR(500),
      fromAddress VARCHAR(320),
      fromName VARCHAR(200),
      toAddress TEXT,
      ccAddress TEXT,
      bodyHtml TEXT,
      bodyText TEXT,
      isRead TINYINT(1) NOT NULL DEFAULT 0,
      isStarred TINYINT(1) NOT NULL DEFAULT 0,
      hasAttachment TINYINT(1) NOT NULL DEFAULT 0,
      sentAt TIMESTAMP NULL,
      receivedAt TIMESTAMP NULL,
      uid INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_messageId (messageId(255))
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      emailId INT NOT NULL,
      filename VARCHAR(500) NOT NULL,
      mimeType VARCHAR(200),
      size INT,
      storagePath VARCHAR(1000),
      downloadedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      emailAddress VARCHAR(320) NOT NULL UNIQUE,
      displayName VARCHAR(200),
      emailCount INT NOT NULL DEFAULT 0,
      lastEmailAt TIMESTAMP NULL,
      remark TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  emailTablesReady = true;
}
