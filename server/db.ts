import { eq, desc, like, and, or, sql, isNotNull, asc, inArray, gte, isNull, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { int, mysqlEnum, mysqlTable, text as mysqlText, timestamp, varchar } from "drizzle-orm/mysql-core";
import { 
  InsertUser, users,
  products, InsertProduct, Product,
  customers, InsertCustomer, Customer,
  suppliers, InsertSupplier, Supplier,
  salesOrders, InsertSalesOrder, SalesOrder,
  orderApprovals,
  salesOrderItems, InsertSalesOrderItem, SalesOrderItem,
  purchaseOrders, InsertPurchaseOrder, PurchaseOrder,
  purchaseOrderItems, InsertPurchaseOrderItem, PurchaseOrderItem,
  productionOrders, InsertProductionOrder, ProductionOrder,
  inventory, InsertInventory, Inventory,
  warehouses, InsertWarehouse, Warehouse,
  inventoryTransactions, InsertInventoryTransaction, InventoryTransaction,
  operationLogs, InsertOperationLog, OperationLog,
  qualityInspections, InsertQualityInspection, QualityInspection,
  bom, InsertBom, Bom,
  // 新增表
  bankAccounts, InsertBankAccount, BankAccount,
  exchangeRates, InsertExchangeRate, ExchangeRate,
  paymentTerms, InsertPaymentTerm, PaymentTerm,
  materialRequests, InsertMaterialRequest, MaterialRequest,
  materialRequestItems, InsertMaterialRequestItem, MaterialRequestItem,
  expenseReimbursements, InsertExpenseReimbursement, ExpenseReimbursement,
  paymentRecords, InsertPaymentRecord, PaymentRecord,
  customsDeclarations, InsertCustomsDeclaration, CustomsDeclaration,
  departments, InsertDepartment, Department,
  codeRules, InsertCodeRule, CodeRule,
  companyInfo, InsertCompanyInfo, CompanyInfo,
  workflowFormCatalog, InsertWorkflowFormCatalog, WorkflowFormCatalog,
  workflowTemplates, InsertWorkflowTemplate, WorkflowTemplate,
  personnel, InsertPersonnel, Personnel,
  trainings, InsertTraining, Training,
  audits, InsertAudit, Audit,
  rdProjects, InsertRdProject, RdProject,
  stocktakes, InsertStocktake, Stocktake,
  qualityIncidents, InsertQualityIncident, QualityIncident,
  samples, InsertSample, Sample,
  labRecords, InsertLabRecord, LabRecord,
  accountsReceivable, InsertAccountsReceivable, AccountsReceivable,
  accountsPayable, InsertAccountsPayable, AccountsPayable,
  dealerQualifications, InsertDealerQualification, DealerQualification,
  documents, InsertDocument, Document,
  equipment, InsertEquipment, Equipment,
  productionPlans, InsertProductionPlan, ProductionPlan,
  materialRequisitionOrders, InsertMaterialRequisitionOrder, MaterialRequisitionOrder,
  productionRecords, InsertProductionRecord, ProductionRecord,
  productionRoutingCards, InsertProductionRoutingCard, ProductionRoutingCard,
  sterilizationOrders, InsertSterilizationOrder, SterilizationOrder,
  productionWarehouseEntries, InsertProductionWarehouseEntry, ProductionWarehouseEntry,
  overtimeRequests, InsertOvertimeRequest, OvertimeRequest,
  leaveRequests, InsertLeaveRequest, LeaveRequest,
  outingRequests, InsertOutingRequest, OutingRequest,
  productSupplierPrices, InsertProductSupplierPrice, ProductSupplierPrice,
  electronicSignatures,
  signatureAuditLog,
  goodsReceipts, goodsReceiptItems,
  inspectionRequirements, inspectionRequirementItems,
  iqcInspections, iqcInspectionItems,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let usersVisibleAppsColumnReady = false;
let usersAvatarUrlColumnReady = false;
let workflowFormCatalogTableReady = false;
let workflowTemplatesTableReady = false;
let companyInfoTableReady = false;
let productsSterilizedColumnReady = false;
let inventoryTransactionColumnsReady = false;
let sterilizationOrderColumnsReady = false;
let productionWarehouseEntryColumnsReady = false;
let qualityInspectionColumnsReady = false;

const WORKFLOW_FORM_CATALOG_SEED: InsertWorkflowFormCatalog[] = [
  { module: "通用", formType: "申请单", formName: "报销单", path: "/workflow/expense", sortOrder: 1, status: "active", approvalEnabled: false },
  { module: "通用", formType: "申请单", formName: "加班申请", path: "/workflow/overtime", sortOrder: 2, status: "active", approvalEnabled: false },
  { module: "通用", formType: "申请单", formName: "请假单", path: "/workflow/leave", sortOrder: 3, status: "active", approvalEnabled: false },
  { module: "通用", formType: "申请单", formName: "外出申请单", path: "/workflow/outing", sortOrder: 4, status: "active", approvalEnabled: false },
  { module: "管理部", formType: "管理表单", formName: "文件管理", path: "/admin/documents", sortOrder: 11, status: "active" },
  { module: "管理部", formType: "管理表单", formName: "人事管理", path: "/admin/personnel", sortOrder: 12, status: "active" },
  { module: "管理部", formType: "管理表单", formName: "培训管理", path: "/admin/trainings", sortOrder: 13, status: "active" },
  { module: "管理部", formType: "管理表单", formName: "内审管理", path: "/admin/audits", sortOrder: 14, status: "active" },
  { module: "招商部", formType: "业务表单", formName: "首营管理", path: "/investment/dealer", sortOrder: 21, status: "active" },
  { module: "招商部", formType: "业务表单", formName: "挂网管理", path: "/investment/online", sortOrder: 22, status: "active" },
  { module: "招商部", formType: "业务表单", formName: "入院管理", path: "/investment/hospital", sortOrder: 23, status: "active" },
  { module: "销售部", formType: "主数据", formName: "客户管理", path: "/sales/customers", sortOrder: 31, status: "active" },
  { module: "销售部", formType: "业务单据", formName: "订单管理", path: "/sales/orders", sortOrder: 32, status: "active" },
  { module: "销售部", formType: "业务单据", formName: "报关管理", path: "/sales/customs", sortOrder: 33, status: "active" },
  { module: "销售部", formType: "协同流程", formName: "财务协同", path: "/sales/finance-collaboration", sortOrder: 34, status: "active", approvalEnabled: true },
  { module: "销售部", formType: "协同流程", formName: "对账管理", path: "/sales/reconciliation", sortOrder: 35, status: "active" },
  { module: "研发部", formType: "主数据", formName: "产品管理", path: "/rd/products", sortOrder: 41, status: "active" },
  { module: "研发部", formType: "项目流程", formName: "项目管理", path: "/rd/projects", sortOrder: 42, status: "active" },
  { module: "生产部", formType: "生产单据", formName: "生产订单", path: "/production/orders", sortOrder: 51, status: "active" },
  { module: "生产部", formType: "生产流程", formName: "生产计划看板", path: "/production/plan-board", sortOrder: 52, status: "active" },
  { module: "生产部", formType: "生产流程", formName: "领料申请", path: "/production/material-requisition", sortOrder: 53, status: "active" },
  { module: "生产部", formType: "生产记录", formName: "批记录管理", path: "/production/records", sortOrder: 54, status: "active" },
  { module: "生产部", formType: "生产记录", formName: "流转卡管理", path: "/production/routing-cards", sortOrder: 55, status: "active" },
  { module: "生产部", formType: "生产单据", formName: "灭菌单管理", path: "/production/sterilization", sortOrder: 56, status: "active" },
  { module: "生产部", formType: "生产单据", formName: "生产入库申请", path: "/production/warehouse-entry", sortOrder: 57, status: "active" },
  { module: "生产部", formType: "生产基础", formName: "BOM管理", path: "/production/bom", sortOrder: 58, status: "active" },
  { module: "生产部", formType: "生产基础", formName: "MRP运算", path: "/production/mrp", sortOrder: 59, status: "active" },
  { module: "生产部", formType: "生产基础", formName: "UDI标签管理", path: "/production/udi", sortOrder: 60, status: "active" },
  { module: "生产部", formType: "生产基础", formName: "设备管理", path: "/production/equipment", sortOrder: 61, status: "active" },
  { module: "质量部", formType: "检验记录", formName: "实验室管理", path: "/quality/lab", sortOrder: 71, status: "active" },
  { module: "质量部", formType: "检验记录", formName: "来料检验", path: "/quality/incoming", sortOrder: 72, status: "active" },
  { module: "质量部", formType: "检验记录", formName: "过程检验", path: "/quality/process", sortOrder: 73, status: "active" },
  { module: "质量部", formType: "检验记录", formName: "出货检验", path: "/quality/outgoing", sortOrder: 74, status: "active" },
  { module: "质量部", formType: "质量记录", formName: "留样管理", path: "/quality/samples", sortOrder: 75, status: "active" },
  { module: "质量部", formType: "质量流程", formName: "不合格管理", path: "/quality/incidents", sortOrder: 76, status: "active" },
  { module: "采购部", formType: "主数据", formName: "供应商管理", path: "/purchase/suppliers", sortOrder: 81, status: "active" },
  { module: "采购部", formType: "业务单据", formName: "采购订单", path: "/purchase/orders", sortOrder: 82, status: "active" },
  { module: "采购部", formType: "协同流程", formName: "财务协同", path: "/purchase/finance", sortOrder: 83, status: "active" },
  { module: "仓库管理", formType: "仓储单据", formName: "仓库管理", path: "/warehouse/warehouses", sortOrder: 91, status: "active" },
  { module: "仓库管理", formType: "仓储单据", formName: "入库管理", path: "/warehouse/inbound", sortOrder: 92, status: "active" },
  { module: "仓库管理", formType: "仓储单据", formName: "出库管理", path: "/warehouse/outbound", sortOrder: 93, status: "active" },
  { module: "仓库管理", formType: "仓储台账", formName: "库存管理", path: "/warehouse/inventory", sortOrder: 94, status: "active" },
  { module: "仓库管理", formType: "仓储盘点", formName: "盘点管理", path: "/warehouse/stocktakes", sortOrder: 95, status: "active" },
  { module: "财务部", formType: "财务单据", formName: "总账管理", path: "/finance/ledger", sortOrder: 101, status: "active" },
  { module: "财务部", formType: "财务单据", formName: "应收管理", path: "/finance/receivable", sortOrder: 102, status: "active" },
  { module: "财务部", formType: "财务单据", formName: "应付管理", path: "/finance/payable", sortOrder: 103, status: "active" },
  { module: "财务部", formType: "财务基础", formName: "账户管理", path: "/finance/accounts", sortOrder: 104, status: "active" },
  { module: "财务部", formType: "财务分析", formName: "成本管理", path: "/finance/cost", sortOrder: 105, status: "active" },
  { module: "财务部", formType: "财务分析", formName: "财务报表", path: "/finance/reports", sortOrder: 106, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "部门设置", path: "/settings/departments", sortOrder: 111, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "公司信息", path: "/settings/company", sortOrder: 110, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "编码设置", path: "/settings/code-rules", sortOrder: 112, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "用户设置", path: "/settings/users", sortOrder: 113, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "审批流程", path: "/settings/workflows", sortOrder: 114, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "语言设置", path: "/settings/language", sortOrder: 115, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "操作日志", path: "/settings/logs", sortOrder: 116, status: "active" },
  { module: "系统设置", formType: "系统配置", formName: "回收箱", path: "/settings/recycle-bin", sortOrder: 117, status: "active" },
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

export async function ensureUsersVisibleAppsColumn(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
  if (!db || usersVisibleAppsColumnReady) return;

  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN visibleApps TEXT NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|visibleApps/i.test(message)) {
      throw error;
    }
  }

  usersVisibleAppsColumnReady = true;
}

export async function ensureUsersAvatarUrlColumn(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
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

async function ensureWorkflowTemplatesTable(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
  if (!db || workflowTemplatesTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS workflow_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      module VARCHAR(64) NOT NULL,
      formType VARCHAR(100) NOT NULL,
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

  workflowTemplatesTableReady = true;
}

async function ensureWorkflowFormCatalogTable(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
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
    await db.execute(sql`ALTER TABLE workflow_form_catalog ADD COLUMN approvalEnabled TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|approvalEnabled/i.test(message)) {
      throw error;
    }
  }

  const countRows = await db.select({ count: sql<number>`count(*)` }).from(workflowFormCatalog);
  const total = Number(countRows[0]?.count || 0);
  if (total === 0) {
    await db.insert(workflowFormCatalog).values(WORKFLOW_FORM_CATALOG_SEED);
  }

  // 兼容旧版本路径，并默认开启“销售部-财务协同”审批
  await db
    .update(workflowFormCatalog)
    .set({
      path: "/sales/finance-collaboration",
      approvalEnabled: true,
    })
    .where(and(
      eq(workflowFormCatalog.module, "销售部"),
      eq(workflowFormCatalog.formType, "协同流程"),
      eq(workflowFormCatalog.formName, "财务协同"),
      eq(workflowFormCatalog.path, "/sales/receivable"),
    ));

  workflowFormCatalogTableReady = true;
}

async function ensureCompanyInfoTable(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
  if (!db || companyInfoTableReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
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
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  companyInfoTableReady = true;
}

async function ensureProductsSterilizedColumn(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
  if (!db || productsSterilizedColumnReady) return;

  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN isSterilized TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|isSterilized/i.test(message)) {
      throw error;
    }
  }

  productsSterilizedColumnReady = true;
}

async function ensureInventoryTransactionColumns(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
  if (!db || inventoryTransactionColumnsReady) return;

  try {
    await db.execute(sql`ALTER TABLE inventory_transactions ADD COLUMN productId INT NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|productId/i.test(message)) {
      throw error;
    }
  }

  try {
    await db.execute(sql`ALTER TABLE inventory_transactions ADD COLUMN sterilizationBatchNo VARCHAR(50) NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|sterilizationBatchNo/i.test(message)) {
      throw error;
    }
  }

  try {
    await db.execute(sql`ALTER TABLE inventory_transactions ADD COLUMN shippingFee DECIMAL(14,2) NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|shippingFee/i.test(message)) {
      throw error;
    }
  }

  try {
    await db.execute(sql`ALTER TABLE inventory_transactions ADD COLUMN logisticsSupplierId INT NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|logisticsSupplierId/i.test(message)) {
      throw error;
    }
  }

  try {
    await db.execute(sql`ALTER TABLE inventory_transactions ADD COLUMN logisticsSupplierName VARCHAR(200) NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|logisticsSupplierName/i.test(message)) {
      throw error;
    }
  }

  inventoryTransactionColumnsReady = true;
}

async function ensureSterilizationOrderColumns(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
  if (!db || sterilizationOrderColumnsReady) return;
  try {
    await db.execute(sql`ALTER TABLE sterilization_orders ADD COLUMN sterilizationBatchNo VARCHAR(50) NULL`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/Duplicate column name|already exists|1060|sterilizationBatchNo/i.test(message)) throw error;
  }
  // 添加 arrived 状态到枚举（MySQL不支持直接修改枚举，通过 MODIFY COLUMN 实现）
  try {
    await db.execute(sql`ALTER TABLE sterilization_orders MODIFY COLUMN status ENUM('draft','sent','processing','arrived','returned','qualified','unqualified') NOT NULL DEFAULT 'draft'`);
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (!/arrived|already exists/i.test(message)) {
      console.warn("[DB] Could not modify sterilization_orders status enum:", message);
    }
  }
  sterilizationOrderColumnsReady = true;
}

async function ensureProductionWarehouseEntryColumns(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
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
      await db.execute(sql.raw(`ALTER TABLE production_warehouse_entries ADD COLUMN ${col.name} ${col.ddl}`));
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(message)) {
        console.warn(`[DB] Could not add column ${col.name} to production_warehouse_entries:`, message);
      }
    }
  }
  productionWarehouseEntryColumnsReady = true;
}

async function ensureQualityInspectionColumns(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
  if (!db || qualityInspectionColumnsReady) return;
  const columns = [
    { name: "productionOrderId", ddl: "INT NULL" },
    { name: "productionOrderNo", ddl: "VARCHAR(50) NULL" },
    { name: "sterilizationOrderId", ddl: "INT NULL" },
    { name: "sterilizationOrderNo", ddl: "VARCHAR(50) NULL" },
  ];
  for (const col of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE quality_inspections ADD COLUMN ${col.name} ${col.ddl}`));
    } catch (error) {
      const message = String((error as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(message)) {
        console.warn(`[DB] Could not add column ${col.name} to quality_inspections:`, message);
      }
    }
  }
  qualityInspectionColumnsReady = true;
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
    await ensureUsersVisibleAppsColumn(db);
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
      values.role = 'admin';
      updateSet.role = 'admin';
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

  await ensureUsersVisibleAppsColumn(db);
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

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
  status: mysqlEnum("status", ["active", "restored", "expired"]).default("active").notNull(),
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
  dealer_qualifications: dealerQualifications,
  equipment,
  production_plans: productionPlans,
  material_requisition_orders: materialRequisitionOrders,
  production_records: productionRecords,
  production_routing_cards: productionRoutingCards,
  sterilization_orders: sterilizationOrders,
  production_warehouse_entries: productionWarehouseEntries,
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

function getSnapshotDisplayName(entityType: string, row: SnapshotRow, sourceId: number): string {
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
    if (!parsed.root?.table || !parsed.root?.row) throw new Error("回收快照内容不完整");
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
    .where(and(eq(recycleBin.status, RECYCLE_STATUS_ACTIVE), lte(recycleBin.expiresAt, new Date())));
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
  },
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
  },
): Promise<void> {
  const [row] = await db.select().from(params.table).where(eq(params.idColumn, params.id)).limit(1);
  if (!row) return;
  const normalizedRow = normalizeSnapshotRow(row as SnapshotRow);
  const fallbackDeletedBy =
    typeof normalizedRow.createdBy === "number" ? (normalizedRow.createdBy as number) : null;
  await addRecycleEntry(db, {
    entityType: params.entityType,
    sourceTable: params.sourceTable,
    sourceId: params.id,
    displayName: getSnapshotDisplayName(params.entityType, normalizedRow, params.id),
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
  },
): Promise<void> {
  const [rootRow] = await db.select().from(params.rootTable).where(eq(params.rootIdColumn, params.rootId)).limit(1);
  if (!rootRow) return;
  const normalizedRoot = normalizeSnapshotRow(rootRow as SnapshotRow);
  const fallbackDeletedBy =
    typeof normalizedRoot.createdBy === "number" ? (normalizedRoot.createdBy as number) : null;
  const childrenSnapshot: Array<{ table: string; rows: SnapshotRow[] }> = [];
  for (const child of params.children) {
    const rows = await db.select().from(child.table).where(eq(child.foreignKeyColumn, params.rootId));
    childrenSnapshot.push({
      table: child.tableName,
      rows: rows.map((row: SnapshotRow) => normalizeSnapshotRow(row)),
    });
  }

  await addRecycleEntry(db, {
    entityType: params.entityType,
    sourceTable: params.rootTableName,
    sourceId: params.rootId,
    displayName: getSnapshotDisplayName(params.entityType, normalizedRoot, params.rootId),
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
    await db.delete(child.table).where(eq(child.foreignKeyColumn, params.rootId));
  }
  await db.delete(params.rootTable).where(eq(params.rootIdColumn, params.rootId));
}

async function restoreRowToTable(db: any, tableName: string, row: SnapshotRow): Promise<void> {
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
        like(recycleBin.sourceTable, `%${params.keyword}%`),
      ),
    );
  }

  let query = db.select().from(recycleBin);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query
    .orderBy(desc(recycleBin.deletedAt))
    .limit(params?.limit || 200)
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

  const [entry] = await db.select().from(recycleBin).where(eq(recycleBin.id, id)).limit(1);
  if (!entry) throw new Error("回收记录不存在");
  if (entry.status !== RECYCLE_STATUS_ACTIVE) {
    throw new Error("该记录不可恢复（已恢复或已过期）");
  }

  const expiresAt = entry.expiresAt ? new Date(entry.expiresAt).getTime() : 0;
  if (expiresAt <= Date.now()) {
    await db.update(recycleBin).set({ status: RECYCLE_STATUS_EXPIRED }).where(eq(recycleBin.id, id));
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
    throw new Error(`恢复失败：${String(error?.message ?? error ?? "数据库写入失败")}`);
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
  await db.delete(recycleBin).where(eq(recycleBin.status, RECYCLE_STATUS_EXPIRED));
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
  await db.delete(electronicSignatures).where(eq(electronicSignatures.documentId, id));
  await db.delete(signatureAuditLog).where(eq(signatureAuditLog.documentId, id));
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

export async function getProducts(params?: { search?: string; status?: string; salePermission?: string; procurePermission?: string; isSterilized?: boolean; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  await ensureProductsSterilizedColumn(db);
  let query = db.select().from(products);
  const conditions = [];
  if (params?.search) {
    conditions.push(
      or(
        like(products.code, `%${params.search}%`),
        like(products.name, `%${params.search}%`)
      )
    );
  }
  if (params?.status) {
    conditions.push(eq(products.status, params.status as "draft" | "active" | "discontinued"));
  }
  if (params?.salePermission) {
    conditions.push(eq(products.salePermission, params.salePermission as "saleable" | "not_saleable"));
  }
  if (params?.procurePermission) {
    conditions.push(eq(products.procurePermission, params.procurePermission as "purchasable" | "production_only"));
  }
  if (params?.isSterilized !== undefined) {
    conditions.push(eq(products.isSterilized, params.isSterilized));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  const result = await query
    .orderBy(desc(products.createdAt))
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);
  return result;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureProductsSterilizedColumn(db);

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// 产品分类前缀映射
export const PRODUCT_CATEGORY_PREFIX: Record<string, string> = {
  finished: "CP",
  semi_finished: "BCP",
  raw_material: "YCL",
  auxiliary: "FL",
  other: "QT",
};

// 获取下一个产品编码（根据前缀自动递增，默认 CP）
export async function getNextProductCode(prefix: string = "CP"): Promise<string> {
  const db = await getDb();
  if (!db) return `${prefix}-00001`;
  await ensureProductsSterilizedColumn(db);
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
export async function isProductCodeExists(code: string, excludeId?: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await ensureProductsSterilizedColumn(db);
  const result = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.code, code))
    .limit(1);
  if (result.length === 0) return false;
  if (excludeId !== undefined && result[0].id === excludeId) return false;
  return true;
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductsSterilizedColumn(db);

  // 校验编码唯一性
  const exists = await isProductCodeExists(data.code);
  if (exists) throw new Error(`产品编码 ${data.code} 已存在，请使用其他编码`);

  const result = await db.insert(products).values(data);
  return result[0].insertId;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductsSterilizedColumn(db);

  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：所有引用该产品的子表
  await db.delete(bom).where(eq(bom.productId, id));
  await db.delete(productSupplierPrices).where(eq(productSupplierPrices.productId, id));
  await db.delete(materialRequestItems).where(eq(materialRequestItems.productId, id));
  await db.delete(salesOrderItems).where(eq(salesOrderItems.productId, id));
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.productId, id));
  await db.delete(productionRecords).where(eq(productionRecords.productId, id));
  await db.delete(productionRoutingCards).where(eq(productionRoutingCards.productId, id));
  await db.delete(sterilizationOrders).where(eq(sterilizationOrders.productId, id));
  await db.delete(productionWarehouseEntries).where(eq(productionWarehouseEntries.productId, id));
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
export async function getNextCustomerCode(prefix: string = "KH"): Promise<string> {
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
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return undefined;
  const withoutProtocol = text.replace(/^https?:\/\//, "");
  const domainPart = withoutProtocol.split("/")[0].split("?")[0].split("#")[0].trim();
  const domain = domainPart.startsWith("www.") ? domainPart.slice(4) : domainPart;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) return undefined;
  return domain;
}

function extractDomainFromEmail(email: unknown): string | undefined {
  const text = String(email ?? "").trim().toLowerCase();
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

function mergeSourceWithLogoDomain(source: unknown, domain: string): string | undefined {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return stripLogoDomainFromSource(source) || undefined;
  const cleaned = stripLogoDomainFromSource(source);
  const logoMarker = `${LOGO_DOMAIN_SOURCE_PREFIX}${normalizedDomain}`;
  const merged = cleaned ? `${cleaned}|${logoMarker}` : logoMarker;
  if (merged.length > SOURCE_MAX_LENGTH) return cleaned || undefined;
  return merged;
}

function buildCustomerLogoUrl(source: unknown, email: unknown): string | null {
  const domain = extractLogoDomainFromSource(source) || extractDomainFromEmail(email);
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

async function searchCompanyDomainByName(name: string): Promise<string | undefined> {
  const keyword = String(name ?? "").trim();
  if (!keyword) return undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(keyword)}`, {
      signal: controller.signal,
    });
    if (!resp.ok) return undefined;
    const rows = await resp.json() as Array<{ domain?: string }>;
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

export async function enrichCustomerLogoDomain(customerId: number): Promise<void> {
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

export async function getCustomers(params?: { search?: string; type?: string; status?: string; salesPersonId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

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
    conditions.push(eq(customers.type, params.type as "hospital" | "dealer" | "domestic" | "overseas"));
  }

  if (params?.status) {
    conditions.push(eq(customers.status, params.status as "active" | "inactive" | "blacklist"));
  }
  if (params?.salesPersonId) {
    conditions.push(eq(customers.salesPersonId, params.salesPersonId));
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
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);

  return result.map((item) => ({
    ...item,
    logoUrl: buildCustomerLogoUrl(item.source, item.email),
  }));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (result.length === 0) return undefined;
  const row = result[0];
  return {
    ...row,
    logoUrl: buildCustomerLogoUrl(row.source, row.email),
  };
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：应收账款、经销商资质、报关单、收款记录、销售订单及其子表
  await db.delete(accountsReceivable).where(eq(accountsReceivable.customerId, id));
  await db.delete(dealerQualifications).where(eq(dealerQualifications.customerId, id));
  await db.delete(customsDeclarations).where(eq(customsDeclarations.customerId, id));
  await db.delete(paymentRecords).where(eq(paymentRecords.customerId, id));
  // 删除关联销售订单及其子表
  const relatedOrders = await db.select({ id: salesOrders.id }).from(salesOrders).where(eq(salesOrders.customerId, id));
  for (const order of relatedOrders) {
    await db.delete(salesOrderItems).where(eq(salesOrderItems.orderId, order.id));
    await db.delete(orderApprovals).where(and(eq(orderApprovals.orderId, order.id), eq(orderApprovals.orderType, 'sales')));
    await db.delete(productionPlans).where(eq(productionPlans.salesOrderId, order.id));
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

export async function getSuppliers(params?: { search?: string; type?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(suppliers);
  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(suppliers.code, `%${params.search}%`),
        like(suppliers.name, `%${params.search}%`)
      )
    );
  }

  if (params?.type) {
    conditions.push(eq(suppliers.type, params.type as "material" | "equipment" | "service"));
  }

  if (params?.status) {
    conditions.push(eq(suppliers.status, params.status as "qualified" | "pending" | "disqualified"));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query
    .orderBy(desc(suppliers.createdAt))
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);

  return result;
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const result = await db.insert(suppliers).values(data);
  return result[0].insertId;
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：应付账款、供应商价格、委外灭菌单、付款记录、采购订单及其子表
  await db.delete(accountsPayable).where(eq(accountsPayable.supplierId, id));
  await db.delete(productSupplierPrices).where(eq(productSupplierPrices.supplierId, id));
  await db.delete(sterilizationOrders).where(eq(sterilizationOrders.supplierId, id));
  await db.delete(paymentRecords).where(eq(paymentRecords.supplierId, id));
  // 删除关联采购订单及其子表
  const relatedPOs = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.supplierId, id));
  for (const po of relatedPOs) {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, po.id));
    await db.delete(orderApprovals).where(and(eq(orderApprovals.orderId, po.id), eq(orderApprovals.orderType, 'purchase')));
  }
  await db.delete(purchaseOrders).where(eq(purchaseOrders.supplierId, id));
  await deleteSingleWithRecycle(db, {
    table: suppliers,
    idColumn: suppliers.id,
    id,
    entityType: "供应商",
    sourceTable: "suppliers",
    deletedBy,
  });
}

// ==================== 销售订单 CRUD ====================

export async function getSalesOrders(params?: { search?: string; status?: string; customerId?: number; salesPersonId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (params?.search) {
    conditions.push(
      or(
        like(salesOrders.orderNo, `%${params.search}%`),
        like(customers.name, `%${params.search}%`)
      )
    );
  }

  if (params?.status) {
    conditions.push(eq(salesOrders.status, params.status as "draft" | "pending_review" | "approved" | "in_production" | "ready_to_ship" | "shipped" | "completed" | "cancelled"));
  }

  if (params?.customerId) {
    conditions.push(eq(salesOrders.customerId, params.customerId));
  }
  if (params?.salesPersonId) {
    conditions.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  }

  const baseQuery = db
    .select({
      id: salesOrders.id,
      orderNo: salesOrders.orderNo,
      customerId: salesOrders.customerId,
      customerName: customers.name,
      customerCode: customers.code,
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
      isExport: salesOrders.isExport,
      remark: salesOrders.remark,
      salesPersonId: salesOrders.salesPersonId,
      salesPersonName: users.name,
      createdBy: salesOrders.createdBy,
      createdAt: salesOrders.createdAt,
      updatedAt: salesOrders.updatedAt,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(users, eq(salesOrders.salesPersonId, users.id));

  const query = conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;

  const result = await query
    .orderBy(desc(salesOrders.createdAt))
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);

  return result;
}

export async function getSalesOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  // join customers 表，订单付款条件为空时回退到客户档案
  const result = await db
    .select({
      id: salesOrders.id,
      orderNo: salesOrders.orderNo,
      customerId: salesOrders.customerId,
      customerName: customers.name,
      customerCode: customers.code,
      // 联系人：订单收货联系人优先，空则回退到客户档案
      contactPerson: sql<string | null>`COALESCE(NULLIF(${salesOrders.shippingContact}, ''), ${customers.contactPerson})`,
      phone: sql<string | null>`COALESCE(NULLIF(${salesOrders.shippingPhone}, ''), ${customers.phone})`,
      // 付款条件：订单自身优先，空则回退到客户档案
      paymentMethod: sql<string | null>`COALESCE(NULLIF(${salesOrders.paymentMethod}, ''), ${customers.paymentTerms})`,
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
      customsStatus: salesOrders.customsStatus,
      remark: salesOrders.remark,
      salesPersonId: salesOrders.salesPersonId,
      salesPersonName: users.name,
      createdBy: salesOrders.createdBy,
      createdAt: salesOrders.createdAt,
      updatedAt: salesOrders.updatedAt,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(users, eq(salesOrders.salesPersonId, users.id))
    .where(eq(salesOrders.id, id))
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

export async function createSalesOrder(data: InsertSalesOrder, items: InsertSalesOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const result = await db.insert(salesOrders).values(data);
  const orderId = result[0].insertId;

  if (items.length > 0) {
    const itemsWithOrderId = items.map(item => ({ ...item, orderId }));
    await db.insert(salesOrderItems).values(itemsWithOrderId);
  }

  return orderId;
}

export async function updateSalesOrder(id: number, data: Partial<InsertSalesOrder>, items?: InsertSalesOrderItem[]) {
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
  await db.delete(accountsReceivable).where(eq(accountsReceivable.salesOrderId, id));
  await db.delete(orderApprovals).where(and(eq(orderApprovals.orderId, id), eq(orderApprovals.orderType, 'sales')));
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
export async function getLastSalePrices(customerId: number, productIds: number[]) {
  const db = await getDb();
  if (!db || productIds.length === 0) return [];

  // 对每个产品，查找该客户最近一笔订单中的单价
  const results: { productId: number; unitPrice: string; currency: string }[] = [];

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

// ==================== 采购订单 CRUD ====================

export async function getPurchaseOrders(params?: { search?: string; status?: string; supplierId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

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
    conditions.push(eq(purchaseOrders.status, params.status as "draft" | "approved" | "ordered" | "partial_received" | "received" | "cancelled"));
  }

  if (params?.supplierId) {
    conditions.push(eq(purchaseOrders.supplierId, params.supplierId));
  }

  const baseQuery = db
    .select({
      id: purchaseOrders.id,
      orderNo: purchaseOrders.orderNo,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
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

  const query = conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;

  const result = await query
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);

  return result;
}

export async function getPurchaseOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
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

export async function createPurchaseOrder(data: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const result = await db.insert(purchaseOrders).values(data);
  const orderId = result[0].insertId;

  if (items.length > 0) {
    const itemsWithOrderId = items.map(item => ({ ...item, orderId }));
    await db.insert(purchaseOrderItems).values(itemsWithOrderId);
  }

  return orderId;
}

export async function updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id));
}

export async function deletePurchaseOrder(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：应付账款、审批记录
  await db.delete(accountsPayable).where(eq(accountsPayable.purchaseOrderId, id));
  await db.delete(orderApprovals).where(and(eq(orderApprovals.orderId, id), eq(orderApprovals.orderType, 'purchase')));
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

export async function getProductionOrders(params?: { search?: string; status?: string; limit?: number; offset?: number }) {
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
    conditions.push(eq(productionOrders.status, params.status as "draft" | "planned" | "in_progress" | "completed" | "cancelled"));
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
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);
  return result;
}

export async function getProductionOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(productionOrders).where(eq(productionOrders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProductionOrder(data: InsertProductionOrder) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const result = await db.insert(productionOrders).values(data);
  return result[0].insertId;
}

export async function updateProductionOrder(id: number, data: Partial<InsertProductionOrder>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  await db.update(productionOrders).set(data).where(eq(productionOrders.id, id));
}

export async function deleteProductionOrder(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：生产计划、领料单、批记录、流转卡、灵菁单、入库申请、审批记录
  await db.delete(productionPlans).where(eq(productionPlans.productionOrderId, id));
  await db.delete(materialRequisitionOrders).where(eq(materialRequisitionOrders.productionOrderId, id));
  await db.delete(productionRecords).where(eq(productionRecords.productionOrderId, id));
  await db.delete(productionRoutingCards).where(eq(productionRoutingCards.productionOrderId, id));
  await db.delete(sterilizationOrders).where(eq(sterilizationOrders.productionOrderId, id));
  await db.delete(productionWarehouseEntries).where(eq(productionWarehouseEntries.productionOrderId, id));
  await db.delete(orderApprovals).where(and(eq(orderApprovals.orderId, id), eq(orderApprovals.orderType, 'production')));
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

export async function getInventory(params?: { search?: string; warehouseId?: number; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

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
    conditions.push(eq(inventory.status, params.status as "qualified" | "quarantine" | "unqualified" | "reserved"));
  }

  let baseQuery = db.select().from(inventory);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
  }
  const rows = await baseQuery
    .orderBy(desc(inventory.createdAt))
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);

  if (rows.length === 0) return [];

  // 批量查询每条库存记录的实时汇总数量
  const ids = rows.map(r => r.id);
  const txSums = await db
    .select({
      inventoryId: inventoryTransactions.inventoryId,
      totalQty: sql<string>`SUM(CASE WHEN type IN (${sql.raw(inTypes.map(t => `'${t}'`).join(','))}) THEN quantity ELSE -quantity END)`,
    })
    .from(inventoryTransactions)
    .where(and(
      inArray(inventoryTransactions.inventoryId, ids),
    ))
    .groupBy(inventoryTransactions.inventoryId);

  // 将实时汇总数量回写到库存记录
  const sumMap = new Map(txSums.map(s => [s.inventoryId, parseFloat(s.totalQty || '0')]));
  return rows.map(row => ({
    ...row,
    quantity: String(sumMap.has(row.id) ? sumMap.get(row.id)! : parseFloat(String(row.quantity)) || 0),
  }));
}

export async function getInventoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  if (result.length === 0) return undefined;

  // 实时从流水账汇总计算库存数量
  const inTypes = ["purchase_in", "production_in", "return_in", "other_in"];
  const txSums = await db
    .select({
      totalQty: sql<string>`SUM(CASE WHEN type IN (${sql.raw(inTypes.map(t => `'${t}'`).join(','))}) THEN quantity ELSE -quantity END)`,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.inventoryId, id));

  const realQty = parseFloat(txSums[0]?.totalQty || '0') || parseFloat(String(result[0].quantity)) || 0;
  return { ...result[0], quantity: String(realQty) };
}

export async function createInventory(data: InsertInventory) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const result = await db.insert(inventory).values(data);
  return result[0].insertId;
}

export async function updateInventory(id: number, data: Partial<InsertInventory>) {
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

export async function getQualityInspections(params?: { search?: string; type?: string; result?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(qualityInspections);
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
    conditions.push(eq(qualityInspections.type, params.type as "IQC" | "IPQC" | "OQC"));
  }

  if (params?.result) {
    conditions.push(eq(qualityInspections.result, params.result as "qualified" | "unqualified" | "conditional"));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query
    .orderBy(desc(qualityInspections.createdAt))
    .limit(params?.limit || 100)
    .offset(params?.offset || 0);

  return result;
}

export async function getQualityInspectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(qualityInspections).where(eq(qualityInspections.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createQualityInspection(data: InsertQualityInspection) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureQualityInspectionColumns(db);
  const result = await db.insert(qualityInspections).values(data);
  return result[0].insertId;
}

export async function updateQualityInspection(id: number, data: Partial<InsertQualityInspection>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureQualityInspectionColumns(db);
  await db.update(qualityInspections).set(data).where(eq(qualityInspections.id, id));
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
  if (!db || !params.batchNo) return;
  await ensureProductionWarehouseEntryColumns(db);

  // 优先按生产批号精确匹配入库申请（生产批号是唯一追溯主键）
  const conditions: any[] = [eq(productionWarehouseEntries.batchNo, params.batchNo)];
  // 如有生产指令ID，进一步精确匹配
  if (params.productionOrderId) {
    conditions.push(eq(productionWarehouseEntries.productionOrderId, params.productionOrderId));
  }

  const entries = await db
    .select()
    .from(productionWarehouseEntries)
    .where(and(...conditions))
    .limit(5);

  if (entries.length === 0) return;

  for (const entry of entries) {
    const rejectQty = params.rejectQty ?? 0;
    const sampleQty = params.sampleRetainQty ?? 0;
    const sterilizedQty = parseFloat(String(entry.sterilizedQty ?? entry.quantity ?? 0));

    // 重新计算入库数量 = 灭菌后数量 - 检验报废 - 留样
    const newQty = Math.max(0, sterilizedQty - rejectQty - sampleQty);

    const updateData: any = {
      inspectionRejectQty: String(rejectQty),
      sampleQty: String(sampleQty),
      quantity: String(newQty),
    };

    // 如果检验合格，自动推进入库申请状态到 pending（待审批）
    if (params.result === "qualified" && entry.status === "draft") {
      updateData.status = "pending";
    }

    await db
      .update(productionWarehouseEntries)
      .set(updateData)
      .where(eq(productionWarehouseEntries.id, entry.id));
  }
}

// ==================== BOM 物料清单 CRUD ====================

export async function getBomByProductId(productId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: bom.id,
      productId: bom.productId,
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
  // 使用原生 SQL 按产品分组聚合，并汇总材料成本
  const result = await db.execute(sql`
    SELECT 
      b.productId,
      b.version,
      p.name AS productName,
      p.code AS productCode,
      p.specification AS productSpec,
      p.unit AS productUnit,
      p.category AS productCategory,
      p.productCategory AS productType,
      p.description AS productDescription,
      COUNT(*) AS itemCount,
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

export async function createBomItem(data: InsertBom) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const result = await db.insert(bom).values(data);
  return result[0].insertId;
}

export async function updateBomItem(id: number, data: Partial<InsertBom>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

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

export async function getWarehouses(params?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(warehouses);
  if (params?.status) {
    query = query.where(eq(warehouses.status, params.status as "active" | "inactive")) as typeof query;
  }
  return await query.orderBy(warehouses.name);
}

export async function createWarehouse(data: InsertWarehouse) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(warehouses).values(data);
  return result[0].insertId;
}

export async function updateWarehouse(id: number, data: Partial<InsertWarehouse>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(warehouses).set(data).where(eq(warehouses.id, id));
}

export async function deleteWarehouse(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：库存、库存流水、盘点单、领料单
  await db.delete(inventory).where(eq(inventory.warehouseId, id));
  await db.delete(inventoryTransactions).where(eq(inventoryTransactions.warehouseId, id));
  await db.delete(stocktakes).where(eq(stocktakes.warehouseId, id));
  await db.delete(materialRequisitionOrders).where(eq(materialRequisitionOrders.warehouseId, id));
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

export async function getInventoryTransactions(params?: { search?: string; type?: string; warehouseId?: number; inventoryId?: number; productId?: number; batchNo?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  await ensureInventoryTransactionColumns(db);
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
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query.orderBy(desc(inventoryTransactions.createdAt)).limit(params?.limit || 200).offset(params?.offset || 0);
}

export async function createInventoryTransaction(data: InsertInventoryTransaction) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInventoryTransactionColumns(db);

  // 1. 写入流水记录
  const result = await db.insert(inventoryTransactions).values(data);
  const txId = result[0].insertId;

  // 2. 自动关联库存记录（inventory 表作为库存档案，quantity 字段不再维护，由查询时实时汇总）
  try {
    const inTypes = ["purchase_in", "production_in", "return_in", "other_in"];
    const isIn = inTypes.includes(data.type);

    // 查找现有库存档案（按仓库+产品+批次匹配）
    const conditions: any[] = [eq(inventory.warehouseId, data.warehouseId)];
    if (data.productId) conditions.push(eq(inventory.productId, data.productId));
    if (data.batchNo) conditions.push(eq(inventory.batchNo, data.batchNo));
    const existing = await db.select().from(inventory).where(and(...conditions)).limit(1);

    let invId: number;
    if (existing.length > 0) {
      invId = existing[0].id;
    } else if (isIn) {
      // 入库时如果没有库存档案，自动创建（quantity 初始为 0，实际数量由查询时实时计算）
      const newInvResult = await db.insert(inventory).values({
        warehouseId: data.warehouseId,
        productId: data.productId,
        itemName: data.itemName,
        batchNo: data.batchNo,
        quantity: "0", // 占位，实际数量由流水汇总实时计算
        unit: data.unit,
        status: "qualified",
      });
      invId = newInvResult[0].insertId;
    } else {
      // 出库但无库存档案（异常），仍创建档案以保持关联
      const newInvResult = await db.insert(inventory).values({
        warehouseId: data.warehouseId,
        productId: data.productId,
        itemName: data.itemName,
        batchNo: data.batchNo,
        quantity: "0",
        unit: data.unit,
        status: "qualified",
      });
      invId = newInvResult[0].insertId;
    }

    // 3. 更新流水的 inventoryId 关联
    await db.update(inventoryTransactions).set({ inventoryId: invId }).where(eq(inventoryTransactions.id, txId));
  } catch (e) {
    console.error("[库存] 关联库存档案失败:", e);
  }

  return txId;
}

export async function updateInventoryTransaction(id: number, data: Partial<InsertInventoryTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInventoryTransactionColumns(db);
  await db.update(inventoryTransactions).set(data).where(eq(inventoryTransactions.id, id));
}

export async function deleteInventoryTransaction(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

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
}

// ==================== 操作日志 CRUD ====================

export async function getOperationLogs(params?: { module?: string; action?: string; operatorId?: number; limit?: number; offset?: number }) {
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
  return await query.orderBy(desc(operationLogs.operatedAt)).limit(params?.limit || 200).offset(params?.offset || 0);
}

export async function createOperationLog(data: InsertOperationLog) {
  const db = await getDb();
  if (!db) return; // 日志写入失败不抛异常
  try {
    await db.insert(operationLogs).values(data);
  } catch (e) {
    console.warn('[OperationLog] Failed to write log:', e);
  }
}

export async function clearOperationLogs() {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.delete(operationLogs);
}

// ==================== 订单号生成 ====================
export async function getNextSalesOrderNo(): Promise<string> {
  const db = await getDb();
  if (!db) {
    const year = new Date().getFullYear();
    return `SO-${year}-0001`;
  }
  const year = new Date().getFullYear();
  const prefix = `SO-${year}-`;
  const [latest] = await db
    .select({ orderNo: salesOrders.orderNo })
    .from(salesOrders)
    .where(like(salesOrders.orderNo, `${prefix}%`))
    .orderBy(desc(salesOrders.orderNo))
    .limit(1);
  if (!latest) return `${prefix}0001`;
  const seq = parseInt(latest.orderNo.replace(prefix, ""), 10);
  return `${prefix}${String(isNaN(seq) ? 1 : seq + 1).padStart(4, "0")}`;
}

// ==================== 统计查询 ====================

const GENERAL_MANAGER_NAME = "刘源";
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
  stage: "manager" | "general_manager" | "none";
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
};

export type WorkflowCenterTab = "todo" | "created" | "processed" | "cc";

export type WorkflowCenterItem = {
  id: string;
  tab: WorkflowCenterTab;
  sourceType: "sales_order" | "finance_receipt" | "operation_log";
  module: string;
  formType: string;
  title: string;
  documentNo: string;
  targetName: string;
  applicantName: string;
  currentStep: string;
  statusLabel: string;
  amountText: string;
  createdAt: Date | string | null;
  routePath: string;
  description: string;
};

function parseDepartmentNames(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFinanceTodoCount(remark: unknown): number {
  const markerLine = String(remark ?? "")
    .split("\n")
    .find((line) => line.startsWith(FINANCE_TODO_LIST_MARKER));
  if (!markerLine) return 0;
  try {
    const parsed = JSON.parse(markerLine.slice(FINANCE_TODO_LIST_MARKER.length));
    if (!Array.isArray(parsed)) return 0;
    return parsed.filter((item) => String(item?.status ?? "open") === "open").length;
  } catch {
    return 0;
  }
}

function parseFinanceTodoList(remark: unknown): FinanceTodoMeta[] {
  const markerLine = String(remark ?? "")
    .split("\n")
    .find((line) => line.startsWith(FINANCE_TODO_LIST_MARKER));
  if (!markerLine) return [];
  try {
    const parsed = JSON.parse(markerLine.slice(FINANCE_TODO_LIST_MARKER.length));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: any): FinanceTodoMeta => ({
        id: String(item?.id || ""),
        status: item?.status === "done" ? "done" : "open",
        amount: Number(item?.amount ?? 0) || 0,
        paymentMethod: String(item?.paymentMethod || "银行转账"),
        receiptDate: String(item?.receiptDate || ""),
        remarks: item?.remarks ? String(item.remarks) : "",
        attachments: Array.isArray(item?.attachments) ? item.attachments.map((x: any) => String(x)) : [],
        createdAt: String(item?.createdAt || ""),
      }))
      .filter((item) => Boolean(item.id));
  } catch {
    return [];
  }
}

function formatWorkflowAmount(currencyRaw: unknown, amountRaw: unknown): string {
  const currency = String(currencyRaw || "CNY").toUpperCase();
  const amount = Number(amountRaw ?? 0) || 0;
  const symbol = currency === "USD"
    ? "$"
    : currency === "EUR"
      ? "€"
      : currency === "GBP"
        ? "£"
        : currency === "HKD"
          ? "HK$"
          : "¥";
  return `${symbol}${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function matchWorkflowSearch(item: WorkflowCenterItem, keyword: string): boolean {
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
  ].some((value) => String(value || "").toLowerCase().includes(normalized));
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

function buildWorkflowLogRoute(log: { module: string | null; targetType: string | null; targetId: string | null; description: string | null }): string {
  const module = String(log.module || "");
  const targetType = String(log.targetType || "").toLowerCase();
  const targetId = Number(log.targetId || 0);
  const description = String(log.description || "");

  if (targetType.includes("sales") || (module === "order" && /销售/.test(description))) {
    return Number.isFinite(targetId) && targetId > 0 ? `/sales/orders?id=${targetId}` : "/sales/orders";
  }
  if (targetType.includes("purchase") || /采购/.test(description)) {
    return Number.isFinite(targetId) && targetId > 0 ? `/purchase/orders?focusId=${targetId}` : "/purchase/orders";
  }
  if (targetType.includes("receivable") || targetType.includes("invoice") || targetType.includes("receipt")) {
    return Number.isFinite(targetId) && targetId > 0 ? `/finance/receivable?focusId=${targetId}` : "/finance/receivable";
  }
  if (targetType.includes("customer") || module === "customer") return "/sales/customers";
  if (targetType.includes("supplier") || module === "supplier") return "/purchase/suppliers";
  if (targetType.includes("product") || module === "product") return "/rd/products";
  if (targetType.includes("document") || module === "document") return "/admin/documents";
  if (targetType.includes("warehouse") || module === "inventory") return "/warehouse/inventory";
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

async function getSalesWorkflowTodoItems(
  db: any,
  params: { operatorId: number; operatorRole?: string; limit: number },
): Promise<WorkflowCenterItem[]> {
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

  const approvalStateMap = await buildSalesOrderApprovalStates(db, pendingOrders, params.operatorId, params.operatorRole);
  const applicantIds = Array.from(
    new Set(
      pendingOrders
        .map((order) => Number(order.createdBy || order.salesPersonId || 0))
        .filter((id) => id > 0),
    ),
  );
  const applicantRows: Array<{ id: number; name: string | null }> = applicantIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, applicantIds))
    : [];
  const applicantMap = new Map(applicantRows.map((user) => [Number(user.id), String(user.name || "")]));

  return pendingOrders
    .filter((order) => {
      const state = approvalStateMap.get(order.id);
      if (!state || state.stage === "none") return false;
      return params.operatorRole === "admin" ? true : state.canApprove;
    })
    .slice(0, params.limit)
    .map((order) => {
      const state = approvalStateMap.get(order.id);
      const stageLabel = state?.stage === "manager" ? "部门负责人审批" : "总经理审批";
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
      };
    });
}

async function getFinanceWorkflowTodoItems(
  db: any,
  params: { operatorRole?: string; operatorDepartment?: string | null; limit: number },
): Promise<WorkflowCenterItem[]> {
  const userDepartments = parseDepartmentNames(params.operatorDepartment);
  const isFinanceUser = params.operatorRole === "admin" || userDepartments.includes("财务部");
  if (!isFinanceUser) return [];

  const receivableRows: Array<{
    id: number;
    invoiceNo: string | null;
    remark: string | null;
    currency: string | null;
    createdAt: Date | null;
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
        .map((row) => Number(row.createdBy || row.salesPersonId || 0))
        .filter((id) => id > 0),
    ),
  );
  const applicantRows: Array<{ id: number; name: string | null }> = applicantIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, applicantIds))
    : [];
  const applicantMap = new Map(applicantRows.map((user) => [Number(user.id), String(user.name || "")]));

  const items: WorkflowCenterItem[] = [];
  for (const row of receivableRows) {
    const applicantId = Number(row.createdBy || row.salesPersonId || 0);
    for (const todo of parseFinanceTodoList(row.remark).filter((item) => item.status === "open")) {
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
      });
    }
  }

  return items
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, params.limit);
}

async function getOperationWorkflowItems(
  db: any,
  params: { operatorId: number; tab: "created" | "processed"; limit: number },
): Promise<WorkflowCenterItem[]> {
  const actionWhere = params.tab === "created"
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

  return rows.map((row) => ({
    id: `log-${row.id}`,
    tab: params.tab,
    sourceType: "operation_log",
    module: getWorkflowModuleLabel(row.module),
    formType: String(row.targetType || "-"),
    title: String(row.targetName || row.description || "流程记录"),
    documentNo: String(row.targetId || "-"),
    targetName: String(row.targetName || "-"),
    applicantName: String(row.operatorName || "-"),
    currentStep: params.tab === "created" ? "已发起" : getWorkflowLogActionLabel(row.action),
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
  operatorDepartment?: string | null;
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
    operatorDepartment: params.operatorDepartment,
  });
  const counters = dashboardStats?.workflowCounters ?? {
    myTodo: 0,
    myCreated: 0,
    myProcessed: 0,
    ccToMe: 0,
  };

  let items: WorkflowCenterItem[] = [];
  if (params.tab === "todo") {
    const [salesItems, financeItems] = await Promise.all([
      getSalesWorkflowTodoItems(db, {
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        limit,
      }),
      getFinanceWorkflowTodoItems(db, {
        operatorRole: params.operatorRole,
        operatorDepartment: params.operatorDepartment,
        limit,
      }),
    ]);
    items = [...salesItems, ...financeItems]
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, limit);
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
    items = items.filter((item) => matchWorkflowSearch(item, keyword));
  }

  return { counters, items };
}

async function buildSalesOrderApprovalStates(
  db: any,
  orders: SalesApprovalOrderSnapshot[],
  currentUserId?: number | null,
  currentUserRole?: string | null,
): Promise<Map<number, SalesOrderApprovalState>> {
  const pendingOrders = orders.filter((order) => String(order.status ?? "") === "pending_review");
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

  const orderIds = pendingOrders.map((order) => order.id);
  const applicantIds = Array.from(
    new Set(
      pendingOrders
        .map((order) => Number(order.createdBy || order.salesPersonId || 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );

  const applicantUsers: Array<{ id: number; name: string | null; department: string | null }> = applicantIds.length > 0
    ? await db
        .select({ id: users.id, name: users.name, department: users.department })
        .from(users)
        .where(inArray(users.id, applicantIds))
    : [];
  const applicantMap = new Map(applicantUsers.map((user) => [Number(user.id), user]));

  const departmentNames = Array.from(
    new Set(
      applicantUsers.flatMap((user) => parseDepartmentNames(user.department)),
    ),
  );
  const departmentRows: Array<{ id: number; name: string; managerId: number | null }> = departmentNames.length > 0
    ? await db
        .select({ id: departments.id, name: departments.name, managerId: departments.managerId })
        .from(departments)
        .where(inArray(departments.name, departmentNames))
    : [];
  const departmentMap = new Map(departmentRows.map((department) => [String(department.name), department]));

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
    .where(and(eq(orderApprovals.orderType, "sales"), inArray(orderApprovals.orderId, orderIds)))
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
        .map((department) => Number(department.managerId || 0))
        .filter((id) => id > 0),
    ),
  );

  const [generalManager]: Array<{ id: number; name: string | null }> = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.name, GENERAL_MANAGER_NAME))
    .limit(1);

  const approverIds: number[] = Array.from(
    new Set(
      [...managerIds, Number(generalManager?.id || 0)].filter((id): id is number => Number(id) > 0),
    ),
  );
  const approverUsers: Array<{ id: number; name: string | null }> = approverIds.length > 0
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, approverIds))
    : [];
  const approverNameMap = new Map(approverUsers.map((user) => [Number(user.id), String(user.name || "")]));

  for (const order of pendingOrders) {
    const applicantId = Number(order.createdBy || order.salesPersonId || 0);
    const applicant = applicantMap.get(applicantId);
    const applicantDepartments = parseDepartmentNames(applicant?.department);
    const workflowDepartmentName = applicantDepartments.includes("销售部")
      ? "销售部"
      : applicantDepartments[0];
    const managerId = Number(departmentMap.get(String(workflowDepartmentName || ""))?.managerId || 0) || null;
    const approvals = approvalsByOrder.get(Number(order.id)) ?? [];
    const generalManagerId = Number(generalManager?.id || 0) || null;
    const requiresManagerApproval = !!managerId && applicantId > 0 && managerId !== applicantId;
    const hasManagerApproval = !!managerId && approvals.some(
      (approval) => approval.action === "approve" && Number(approval.approverId || 0) === managerId,
    );
    const hasGeneralManagerApproval = !!generalManagerId && approvals.some(
      (approval) => approval.action === "approve" && Number(approval.approverId || 0) === generalManagerId,
    );

    let currentApproverId: number | null = null;
    let stage: SalesOrderApprovalState["stage"] = "none";
    if (requiresManagerApproval && !hasManagerApproval) {
      currentApproverId = managerId;
      stage = "manager";
    } else if (generalManagerId && generalManagerId !== managerId && !hasGeneralManagerApproval) {
      currentApproverId = generalManagerId;
      stage = "general_manager";
    }

    stateMap.set(order.id, {
      orderId: order.id,
      currentApproverId,
      currentApproverName: currentApproverId ? approverNameMap.get(currentApproverId) || "" : "",
      stage,
      canApprove:
        stage !== "none" &&
        (
          String(currentUserRole || "") === "admin" ||
          (!!currentApproverId && Number(currentUserId || 0) === currentApproverId)
        ),
    });
  }

  return stateMap;
}

export async function getSalesOrderApprovalState(
  orderId: number,
  currentUserId?: number | null,
  currentUserRole?: string | null,
) {
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
  const stateMap = await buildSalesOrderApprovalStates(db, [order], currentUserId, currentUserRole);
  return stateMap.get(orderId) ?? null;
}

export async function getDashboardStats(params?: { salesPersonId?: number; operatorId?: number; operatorRole?: string; operatorDepartment?: string | null }) {
  const db = await getDb();
  if (!db) return null;

  // 基础计数
  const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customers);
  const [supplierCount] = await db.select({ count: sql<number>`count(*)` }).from(suppliers);
  const salesOrderCountQuery = db.select({ count: sql<number>`count(*)` }).from(salesOrders);
  const [salesOrderCount] = params?.salesPersonId
    ? await salesOrderCountQuery.where(eq(salesOrders.salesPersonId, params.salesPersonId))
    : await salesOrderCountQuery;
  const [purchaseOrderCount] = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders);
  const [productionOrderCount] = await db.select({ count: sql<number>`count(*)` }).from(productionOrders);

  // 本月销售额（非草稿/非取消的订单）
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlySalesWhere = [
    gte(salesOrders.orderDate, firstDayOfMonth),
    sql`status NOT IN ('draft', 'cancelled')`,
  ];
  if (params?.salesPersonId) {
    monthlySalesWhere.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  }
  const [monthlySales] = await db
    .select({ total: sql<string>`COALESCE(SUM(COALESCE(totalAmountBase, totalAmount * COALESCE(exchangeRate, 1))), 0)` })
    .from(salesOrders)
    .where(and(...monthlySalesWhere));

  // 待处理订单数（pending_review / approved / in_production / ready_to_ship）
  const pendingOrderWhere = [sql`status IN ('pending_review', 'approved', 'in_production', 'ready_to_ship')`];
  if (params?.salesPersonId) {
    pendingOrderWhere.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  }
  const [pendingOrderCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(salesOrders)
    .where(and(...pendingOrderWhere));

  // 在产订单数
  const [inProductionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productionOrders)
    .where(eq(productionOrders.status, 'in_progress'));

  // 最近5条销售订单（非草稿）
  const recentOrdersWhere = [sql`sales_orders.status != 'draft'`];
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
        isNotNull(inventory.safetyStock),
        sql`inventory.quantity < inventory.safetyStock`
      )
    )
    .orderBy(asc(sql`CAST(inventory.quantity AS DECIMAL) / CAST(inventory.safetyStock AS DECIMAL)`))
    .limit(5);

  // 待办：采购订单待审批（draft状态）
  const [purchaseApprovalCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.status, 'draft'));

  // 待办：来料检验待处理（IQC且result为null）
  const [iqcPendingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(qualityInspections)
    .where(
      and(
        eq(qualityInspections.type, 'IQC'),
        isNull(qualityInspections.result)
      )
    );

  // 待办：生产入库申请（近30天的production_in流水）
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [productionInCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.type, 'production_in'),
        gte(inventoryTransactions.createdAt, thirtyDaysAgo)
      )
    );

  // 待办：草稿订单（客户询价待回复）
  const draftOrderWhere = [eq(salesOrders.status, 'draft')];
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
  const ccToMeCount = 0; // 预留：当前未建立独立抄送表

  if (params?.operatorId) {
    const pendingReviewOrders = await db
      .select({
        id: salesOrders.id,
        createdBy: salesOrders.createdBy,
        salesPersonId: salesOrders.salesPersonId,
        status: salesOrders.status,
      })
      .from(salesOrders)
      .where(eq(salesOrders.status, "pending_review"));
    const approvalStateMap = await buildSalesOrderApprovalStates(db, pendingReviewOrders, params.operatorId, params.operatorRole);
    myTodoCount += params.operatorRole === "admin"
      ? pendingReviewOrders.filter((order) => (approvalStateMap.get(order.id)?.stage ?? "none") !== "none").length
      : pendingReviewOrders.filter((order) => approvalStateMap.get(order.id)?.canApprove).length;

    const userDepartments = parseDepartmentNames(params.operatorDepartment);
    const isFinanceUser = params.operatorRole === "admin" || userDepartments.includes("财务部");
    if (isFinanceUser) {
      const financeRows = await db
        .select({ remark: accountsReceivable.remark })
        .from(accountsReceivable);
      myTodoCount += financeRows.reduce((sum, row) => sum + parseFinanceTodoCount(row.remark), 0);
    }

    const [createdStat] = await db
      .select({ count: sql<number>`count(*)` })
      .from(operationLogs)
      .where(
        and(
          eq(operationLogs.operatorId, params.operatorId),
          eq(operationLogs.action, "create"),
        ),
      );
    myCreatedCount = createdStat?.count || 0;

    const [processedStat] = await db
      .select({ count: sql<number>`count(*)` })
      .from(operationLogs)
      .where(
        and(
          eq(operationLogs.operatorId, params.operatorId),
          inArray(operationLogs.action, ["approve", "reject", "status_change"]),
        ),
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
    monthlySalesAmount: monthlySales?.total || '0',
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
      iqcPending: iqcPendingCount?.count || 0,
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

// ==================== 银行账户 CRUD ====================

export async function getBankAccounts(params?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(bankAccounts);
  if (params?.status) {
    query = query.where(eq(bankAccounts.status, params.status as any)) as typeof query;
  }
  return await query.orderBy(desc(bankAccounts.createdAt));
}

export async function getBankAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
  return result[0];
}

export async function createBankAccount(data: InsertBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(bankAccounts).values(data);
  return result[0].insertId;
}

export async function updateBankAccount(id: number, data: Partial<InsertBankAccount>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id));
}

export async function deleteBankAccount(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
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

export async function getExchangeRates(params?: { fromCurrency?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(exchangeRates);
  if (params?.fromCurrency) {
    query = query.where(eq(exchangeRates.fromCurrency, params.fromCurrency)) as typeof query;
  }
  return await query
    .orderBy(desc(exchangeRates.effectiveDate), desc(exchangeRates.createdAt), desc(exchangeRates.id))
    .limit(params?.limit || 100);
}

export async function createExchangeRate(data: InsertExchangeRate) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(exchangeRates).values(data);
  return result[0].insertId;
}

export async function updateExchangeRate(id: number, data: Partial<InsertExchangeRate>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(exchangeRates).set(data).where(eq(exchangeRates.id, id));
}

export async function deleteExchangeRate(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
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

export async function getPaymentTerms(params?: { type?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(paymentTerms);
  const conditions = [];
  if (params?.type) conditions.push(eq(paymentTerms.type, params.type as any));
  if (params?.isActive !== undefined) conditions.push(eq(paymentTerms.isActive, params.isActive));
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(paymentTerms.name);
}

export async function createPaymentTerm(data: InsertPaymentTerm) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(paymentTerms).values(data);
  return result[0].insertId;
}

export async function updatePaymentTerm(id: number, data: Partial<InsertPaymentTerm>) {
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

export async function getMaterialRequests(params?: { search?: string; status?: string; department?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(like(materialRequests.requestNo, `%${params.search}%`));
  if (params?.status) conditions.push(eq(materialRequests.status, params.status as any));
  if (params?.department) conditions.push(eq(materialRequests.department, params.department));
  let query = db.select().from(materialRequests);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(materialRequests.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getMaterialRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materialRequests).where(eq(materialRequests.id, id)).limit(1);
  return result[0];
}

export async function getMaterialRequestItems(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(materialRequestItems).where(eq(materialRequestItems.requestId, requestId));
}

export async function createMaterialRequest(data: InsertMaterialRequest, items: InsertMaterialRequestItem[]) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(materialRequests).values(data);
  const requestId = result[0].insertId;
  if (items.length > 0) {
    await db.insert(materialRequestItems).values(items.map(i => ({ ...i, requestId })));
  }
  return requestId;
}

export async function updateMaterialRequest(id: number, data: Partial<InsertMaterialRequest>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(materialRequests).set(data).where(eq(materialRequests.id, id));
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

export async function getExpenseReimbursements(params?: { search?: string; status?: string; department?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(like(expenseReimbursements.reimbursementNo, `%${params.search}%`));
  if (params?.status) conditions.push(eq(expenseReimbursements.status, params.status as any));
  if (params?.department) conditions.push(eq(expenseReimbursements.department, params.department));
  let query = db.select().from(expenseReimbursements);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(expenseReimbursements.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getExpenseReimbursementById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(expenseReimbursements).where(eq(expenseReimbursements.id, id)).limit(1);
  return result[0];
}

export async function createExpenseReimbursement(data: InsertExpenseReimbursement) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(expenseReimbursements).values(data);
  return result[0].insertId;
}

export async function updateExpenseReimbursement(id: number, data: Partial<InsertExpenseReimbursement>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(expenseReimbursements).set(data).where(eq(expenseReimbursements.id, id));
}

export async function deleteExpenseReimbursement(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
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

export async function getPaymentRecords(params?: { type?: string; relatedType?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.type) conditions.push(eq(paymentRecords.type, params.type as any));
  if (params?.relatedType) conditions.push(eq(paymentRecords.relatedType, params.relatedType as any));
  let query = db.select().from(paymentRecords);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(paymentRecords.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function createPaymentRecord(data: InsertPaymentRecord) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(paymentRecords).values(data);
  return result[0].insertId;
}

export async function deletePaymentRecord(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: paymentRecords,
    idColumn: paymentRecords.id,
    id,
    entityType: "收付款记录",
    sourceTable: "payment_records",
    deletedBy,
  });
}

// ==================== 报关管理 CRUD ====================

export async function getCustomsDeclarations(params?: { search?: string; status?: string; salesPersonId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(customsDeclarations.declarationNo, `%${params.search}%`), like(customsDeclarations.productName, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(customsDeclarations.status, params.status as any));
  if (params?.salesPersonId) conditions.push(eq(salesOrders.salesPersonId, params.salesPersonId));
  let query = db.select({
    id: customsDeclarations.id,
    declarationNo: customsDeclarations.declarationNo,
    salesOrderId: customsDeclarations.salesOrderId,
    salesOrderNo: salesOrders.orderNo,
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
  }).from(customsDeclarations)
    .leftJoin(salesOrders, eq(customsDeclarations.salesOrderId, salesOrders.id))
    .leftJoin(customers, eq(customsDeclarations.customerId, customers.id));
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(customsDeclarations.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getCustomsDeclarationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customsDeclarations).where(eq(customsDeclarations.id, id)).limit(1);
  return result[0];
}

export async function createCustomsDeclaration(data: InsertCustomsDeclaration) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(customsDeclarations).values(data);
  return result[0].insertId;
}

export async function updateCustomsDeclaration(id: number, data: Partial<InsertCustomsDeclaration>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(customsDeclarations).set(data).where(eq(customsDeclarations.id, id));
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

// ==================== 部门管理 CRUD ====================

export async function getDepartments(params?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(departments);
  if (params?.status) query = query.where(eq(departments.status, params.status as any)) as typeof query;
  return await query.orderBy(asc(departments.sortOrder));
}

export async function getDepartmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0];
}

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(departments).values(data);
  return result[0].insertId;
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>) {
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

export async function getCodeRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(codeRules);
}

export async function createCodeRule(data: InsertCodeRule) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(codeRules).values(data);
  return result[0].insertId;
}

export async function updateCodeRule(id: number, data: Partial<InsertCodeRule>) {
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

const DEFAULT_COMPANY_INFO: Omit<CompanyInfo, "id" | "createdAt" | "updatedAt"> = {
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
};

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
  } satisfies Partial<InsertCompanyInfo>;
}

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const db = await getDb();
  if (!db) {
    return {
      id: 0,
      ...DEFAULT_COMPANY_INFO,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  await ensureCompanyInfoTable(db);
  const rows = await db.select().from(companyInfo).orderBy(asc(companyInfo.id)).limit(1);
  if (rows[0]) return rows[0];
  const insertResult = await db.insert(companyInfo).values(DEFAULT_COMPANY_INFO as InsertCompanyInfo);
  const insertedId = Number(insertResult[0]?.insertId || 0);
  const inserted = insertedId
    ? await db.select().from(companyInfo).where(eq(companyInfo.id, insertedId)).limit(1)
    : [];
  return inserted[0] || {
    id: insertedId || 0,
    ...DEFAULT_COMPANY_INFO,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateCompanyInfo(data: Partial<InsertCompanyInfo>): Promise<CompanyInfo> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureCompanyInfoTable(db);
  const patch = normalizeCompanyInfoPatch(data);
  const cleanedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<InsertCompanyInfo>;
  const rows = await db.select().from(companyInfo).orderBy(asc(companyInfo.id)).limit(1);
  if (!rows[0]) {
    const insertResult = await db.insert(companyInfo).values({
      ...DEFAULT_COMPANY_INFO,
      ...cleanedPatch,
    } as InsertCompanyInfo);
    const insertedId = Number(insertResult[0]?.insertId || 0);
    const inserted = insertedId
      ? await db.select().from(companyInfo).where(eq(companyInfo.id, insertedId)).limit(1)
      : [];
    if (inserted[0]) return inserted[0];
  } else if (Object.keys(cleanedPatch).length > 0) {
    await db.update(companyInfo).set(cleanedPatch).where(eq(companyInfo.id, rows[0].id));
  }
  return await getCompanyInfo();
}

// ==================== 审批流程模板 CRUD ====================

export async function getWorkflowFormCatalog(params?: { module?: string; status?: string; approvalEnabled?: boolean }): Promise<WorkflowFormCatalog[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureWorkflowFormCatalogTable(db);
  const conditions = [];
  if (params?.module) conditions.push(eq(workflowFormCatalog.module, params.module));
  if (params?.status) conditions.push(eq(workflowFormCatalog.status, params.status as any));
  if (typeof params?.approvalEnabled === "boolean") conditions.push(eq(workflowFormCatalog.approvalEnabled, params.approvalEnabled));
  let query = db.select().from(workflowFormCatalog);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query.orderBy(
    asc(workflowFormCatalog.module),
    asc(workflowFormCatalog.sortOrder),
    asc(workflowFormCatalog.formType),
    asc(workflowFormCatalog.formName),
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
    .where(and(
      eq(workflowFormCatalog.module, params.module),
      eq(workflowFormCatalog.formType, params.formType),
      eq(workflowFormCatalog.formName, params.formName),
    ))
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
      .set({ approvalEnabled: params.approvalEnabled, path: params.path || current.path || null })
      .where(eq(workflowFormCatalog.id, current.id));
    return;
  }

  const sortRows = await db
    .select({ maxSort: sql<number>`COALESCE(MAX(${workflowFormCatalog.sortOrder}), 0)` })
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

export async function getWorkflowTemplates(params?: { module?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  await ensureWorkflowTemplatesTable(db);
  const conditions = [];
  if (params?.module) conditions.push(eq(workflowTemplates.module, params.module));
  if (params?.status) conditions.push(eq(workflowTemplates.status, params.status as any));
  let query = db.select().from(workflowTemplates);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  return await query.orderBy(asc(workflowTemplates.module), asc(workflowTemplates.name));
}

export async function getWorkflowTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureWorkflowTemplatesTable(db);
  const result = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, id)).limit(1);
  return result[0];
}

export async function createWorkflowTemplate(data: InsertWorkflowTemplate) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowTemplatesTable(db);
  const result = await db.insert(workflowTemplates).values(data);
  return result[0].insertId;
}

export async function updateWorkflowTemplate(id: number, data: Partial<InsertWorkflowTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureWorkflowTemplatesTable(db);
  await db.update(workflowTemplates).set(data).where(eq(workflowTemplates.id, id));
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

// ==================== 人事管理 CRUD ====================

export async function getPersonnel(params?: { search?: string; departmentId?: number; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(personnel.name, `%${params.search}%`), like(personnel.employeeNo, `%${params.search}%`)));
  if (params?.departmentId) conditions.push(eq(personnel.departmentId, params.departmentId));
  if (params?.status) conditions.push(eq(personnel.status, params.status as any));
  let query = db.select().from(personnel);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(personnel.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getPersonnelById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(personnel).where(eq(personnel.id, id)).limit(1);
  return result[0];
}

export async function createPersonnel(data: InsertPersonnel) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(personnel).values(data);
  return result[0].insertId;
}

export async function updatePersonnel(id: number, data: Partial<InsertPersonnel>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(personnel).set(data).where(eq(personnel.id, id));
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

// ==================== 培训管理 CRUD ====================

export async function getTrainings(params?: { search?: string; status?: string; type?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(like(trainings.title, `%${params.search}%`));
  if (params?.status) conditions.push(eq(trainings.status, params.status as any));
  if (params?.type) conditions.push(eq(trainings.type, params.type as any));
  let query = db.select().from(trainings);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(trainings.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getTrainingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trainings).where(eq(trainings.id, id)).limit(1);
  return result[0];
}

export async function createTraining(data: InsertTraining) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(trainings).values(data);
  return result[0].insertId;
}

export async function updateTraining(id: number, data: Partial<InsertTraining>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(trainings).set(data).where(eq(trainings.id, id));
}

export async function deleteTraining(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
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

export async function getAudits(params?: { search?: string; status?: string; type?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(audits.auditNo, `%${params.search}%`), like(audits.title, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(audits.status, params.status as any));
  if (params?.type) conditions.push(eq(audits.type, params.type as any));
  let query = db.select().from(audits);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(audits.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getAuditById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
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

// ==================== 研发项目 CRUD ====================

export async function getRdProjects(params?: { search?: string; status?: string; type?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(rdProjects.projectNo, `%${params.search}%`), like(rdProjects.name, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(rdProjects.status, params.status as any));
  if (params?.type) conditions.push(eq(rdProjects.type, params.type as any));
  let query = db.select().from(rdProjects);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(rdProjects.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getRdProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rdProjects).where(eq(rdProjects.id, id)).limit(1);
  return result[0];
}

export async function createRdProject(data: InsertRdProject) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(rdProjects).values(data);
  return result[0].insertId;
}

export async function updateRdProject(id: number, data: Partial<InsertRdProject>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
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

export async function getStocktakes(params?: { search?: string; status?: string; warehouseId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(like(stocktakes.stocktakeNo, `%${params.search}%`));
  if (params?.status) conditions.push(eq(stocktakes.status, params.status as any));
  if (params?.warehouseId) conditions.push(eq(stocktakes.warehouseId, params.warehouseId));
  let query = db.select().from(stocktakes);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(stocktakes.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getStocktakeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stocktakes).where(eq(stocktakes.id, id)).limit(1);
  return result[0];
}

export async function createStocktake(data: InsertStocktake) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(stocktakes).values(data);
  return result[0].insertId;
}

export async function updateStocktake(id: number, data: Partial<InsertStocktake>) {
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

export async function getQualityIncidents(params?: { search?: string; status?: string; type?: string; severity?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(qualityIncidents.incidentNo, `%${params.search}%`), like(qualityIncidents.title, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(qualityIncidents.status, params.status as any));
  if (params?.type) conditions.push(eq(qualityIncidents.type, params.type as any));
  if (params?.severity) conditions.push(eq(qualityIncidents.severity, params.severity as any));
  let query = db.select().from(qualityIncidents);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(qualityIncidents.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getQualityIncidentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(qualityIncidents).where(eq(qualityIncidents.id, id)).limit(1);
  return result[0];
}

export async function createQualityIncident(data: InsertQualityIncident) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(qualityIncidents).values(data);
  return result[0].insertId;
}

export async function updateQualityIncident(id: number, data: Partial<InsertQualityIncident>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(qualityIncidents).set(data).where(eq(qualityIncidents.id, id));
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

export async function getSamples(params?: { search?: string; status?: string; sampleType?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(samples.sampleNo, `%${params.search}%`), like(samples.batchNo, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(samples.status, params.status as any));
  if (params?.sampleType) conditions.push(eq(samples.sampleType, params.sampleType as any));
  let query = db.select().from(samples);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(samples.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getSampleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(samples).where(eq(samples.id, id)).limit(1);
  return result[0];
}

export async function createSample(data: InsertSample) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(samples).values(data);
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

export async function getLabRecords(params?: { search?: string; status?: string; conclusion?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(labRecords.recordNo, `%${params.search}%`), like(labRecords.testType, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(labRecords.status, params.status as any));
  if (params?.conclusion) conditions.push(eq(labRecords.conclusion, params.conclusion as any));
  let query = db.select().from(labRecords);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(labRecords.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getLabRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(labRecords).where(eq(labRecords.id, id)).limit(1);
  return result[0];
}

export async function createLabRecord(data: InsertLabRecord) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(labRecords).values(data);
  return result[0].insertId;
}

export async function updateLabRecord(id: number, data: Partial<InsertLabRecord>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(labRecords).set(data).where(eq(labRecords.id, id));
}

export async function deleteLabRecord(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: labRecords,
    idColumn: labRecords.id,
    id,
    entityType: "实验室记录",
    sourceTable: "lab_records",
    deletedBy,
  });
}

// ==================== 应收账款 CRUD ====================

export async function getAccountsReceivable(params?: { search?: string; status?: string; customerId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(like(accountsReceivable.invoiceNo, `%${params.search}%`));
  if (params?.status) conditions.push(eq(accountsReceivable.status, params.status as any));
  if (params?.customerId) conditions.push(eq(accountsReceivable.customerId, params.customerId));
  let query = db.select({
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
  }).from(accountsReceivable)
    .leftJoin(customers, eq(accountsReceivable.customerId, customers.id))
    .leftJoin(salesOrders, eq(accountsReceivable.salesOrderId, salesOrders.id));
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  const rows = await query.orderBy(desc(accountsReceivable.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
  const now = new Date();
  return rows.map((r: any) => {
    const status = String(r.status ?? "");
    if (status === "pending" || status === "partial") {
      const due = r.dueDate ? new Date(String(r.dueDate)) : null;
      if (due && !isNaN(due.getTime()) && due < now) {
        return { ...r, status: "overdue" };
      }
    }
    return r;
  });
}

export async function getAccountsReceivableById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountsReceivable).where(eq(accountsReceivable.id, id)).limit(1);
  return result[0];
}

export async function createAccountsReceivable(data: InsertAccountsReceivable) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(accountsReceivable).values(data);
  return result[0].insertId;
}

export async function updateAccountsReceivable(id: number, data: Partial<InsertAccountsReceivable>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(accountsReceivable).set(data).where(eq(accountsReceivable.id, id));
}

export async function deleteAccountsReceivable(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: accountsReceivable,
    idColumn: accountsReceivable.id,
    id,
    entityType: "应收账款",
    sourceTable: "accounts_receivable",
    deletedBy,
  });
}

// ==================== 应付账款 CRUD ====================

export async function getAccountsPayable(params?: { search?: string; status?: string; supplierId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(like(accountsPayable.invoiceNo, `%${params.search}%`));
  if (params?.status) conditions.push(eq(accountsPayable.status, params.status as any));
  if (params?.supplierId) conditions.push(eq(accountsPayable.supplierId, params.supplierId));
  let query = db.select({
    id: accountsPayable.id,
    invoiceNo: accountsPayable.invoiceNo,
    supplierId: accountsPayable.supplierId,
    supplierName: suppliers.name,
    purchaseOrderId: accountsPayable.purchaseOrderId,
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
  }).from(accountsPayable).leftJoin(suppliers, eq(accountsPayable.supplierId, suppliers.id));
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(accountsPayable.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getAccountsPayableById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountsPayable).where(eq(accountsPayable.id, id)).limit(1);
  return result[0];
}

export async function createAccountsPayable(data: InsertAccountsPayable) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(accountsPayable).values(data);
  return result[0].insertId;
}

export async function updateAccountsPayable(id: number, data: Partial<InsertAccountsPayable>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(accountsPayable).set(data).where(eq(accountsPayable.id, id));
}

export async function deleteAccountsPayable(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: accountsPayable,
    idColumn: accountsPayable.id,
    id,
    entityType: "应付账款",
    sourceTable: "accounts_payable",
    deletedBy,
  });
}

// ==================== 经销商资质 CRUD ====================

export async function getDealerQualifications(params?: { search?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    id: dealerQualifications.id,
    customerId: dealerQualifications.customerId,
    customerName: customers.name,
    businessLicense: dealerQualifications.businessLicense,
    operatingLicense: dealerQualifications.operatingLicense,
    licenseExpiry: dealerQualifications.licenseExpiry,
    authorizationNo: dealerQualifications.authorizationNo,
    authorizationExpiry: dealerQualifications.authorizationExpiry,
    territory: dealerQualifications.territory,
    contractNo: dealerQualifications.contractNo,
    contractExpiry: dealerQualifications.contractExpiry,
    status: dealerQualifications.status,
    createdAt: dealerQualifications.createdAt,
    updatedAt: dealerQualifications.updatedAt,
  }).from(dealerQualifications).leftJoin(customers, eq(dealerQualifications.customerId, customers.id));
  if (params?.status) query = query.where(eq(dealerQualifications.status, params.status as any)) as typeof query;
  return await query.orderBy(desc(dealerQualifications.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getDealerQualificationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dealerQualifications).where(eq(dealerQualifications.id, id)).limit(1);
  return result[0];
}

export async function createDealerQualification(data: InsertDealerQualification) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(dealerQualifications).values(data);
  return result[0].insertId;
}

export async function updateDealerQualification(id: number, data: Partial<InsertDealerQualification>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(dealerQualifications).set(data).where(eq(dealerQualifications.id, id));
}

export async function deleteDealerQualification(id: number, deletedBy?: number) {
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

export async function getEquipment(params?: { search?: string; status?: string; department?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (params?.search) conditions.push(or(like(equipment.code, `%${params.search}%`), like(equipment.name, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(equipment.status, params.status as any));
  if (params?.department) conditions.push(eq(equipment.department, params.department));
  let query = db.select().from(equipment);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(equipment.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}

export async function getEquipmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
  return result[0];
}

export async function createEquipment(data: InsertEquipment) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(equipment).values(data);
  return result[0].insertId;
}

export async function updateEquipment(id: number, data: Partial<InsertEquipment>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(equipment).set(data).where(eq(equipment.id, id));
}

export async function deleteEquipment(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await deleteSingleWithRecycle(db, {
    table: equipment,
    idColumn: equipment.id,
    id,
    entityType: "设备台账",
    sourceTable: "equipment",
    deletedBy,
  });
}

// ==================== 通用订单号生成 ====================

export async function getNextOrderNo(prefix: string, table: any, field: any): Promise<string> {
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
export async function getProductionPlans(params?: { search?: string; status?: string; planType?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) {
    conditions.push(or(like(productionPlans.planNo, `%${params.search}%`), like(productionPlans.productName, `%${params.search}%`), like(productionPlans.salesOrderNo, `%${params.search}%`)));
  }
  if (params?.status) conditions.push(eq(productionPlans.status, params.status as any));
  if (params?.planType) conditions.push(eq(productionPlans.planType, params.planType as any));
  let query = db.select({
    id: productionPlans.id,
    planNo: productionPlans.planNo,
    planType: productionPlans.planType,
    salesOrderId: productionPlans.salesOrderId,
    salesOrderNo: productionPlans.salesOrderNo,
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
    createdBy: productionPlans.createdBy,
    createdAt: productionPlans.createdAt,
    updatedAt: productionPlans.updatedAt,
    productSourceType: products.sourceType,
    productIsSterilized: products.isSterilized,
    productSpecification: products.specification,
    productCode: products.code,
    productManufacturer: products.manufacturer,
    productRegistrationNo: products.registrationNo,
    productUnit: products.unit,
    productCategory: products.productCategory,
  }).from(productionPlans).leftJoin(products, eq(productionPlans.productId, products.id));
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(asc(productionPlans.plannedEndDate), desc(productionPlans.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getProductionPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productionPlans).where(eq(productionPlans.id, id)).limit(1);
  return result[0];
}
export async function createProductionPlan(data: InsertProductionPlan) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(productionPlans).values(data);
  return result[0].insertId;
}
export async function updateProductionPlan(id: number, data: Partial<InsertProductionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(productionPlans).set(data).where(eq(productionPlans.id, id));
}
/**
 * 自动检查库存并生成生产计划
 * 当销售订单审批通过（账期支付）或财务确认预付款后调用
 * 遍历订单产品明细，库存不足的自动生成待排产计划
 */
export async function autoGenerateProductionPlans(salesOrderId: number, createdBy?: number) {
  const db = await getDb();
  if (!db) return;
  try {
    // 获取销售订单信息
    const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, salesOrderId)).limit(1);
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

      // 查询该产品的总库存（合格品）
      const stockRows = await db
        .select({ total: sql<string>`COALESCE(SUM(${inventory.quantity}), 0)` })
        .from(inventory)
        .where(and(
          eq(inventory.productId, item.productId),
          eq(inventory.status, "qualified")
        ));
      const stockQty = Number(stockRows[0]?.total) || 0;

      // 库存不足，生成生产计划
      if (stockQty < requiredQty) {
        const shortfall = requiredQty - stockQty;
        // 检查是否已有该订单+产品的生产计划
        const existing = await db
          .select({ id: productionPlans.id })
          .from(productionPlans)
          .where(and(
            eq(productionPlans.salesOrderId, salesOrderId),
            eq(productionPlans.productId, item.productId),
            eq(productionPlans.status, "pending")
          ))
          .limit(1);
        if (existing.length > 0) continue; // 已有待排产计划，跳过

        // 获取产品信息
        const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
        const now = new Date();
        const planNo = `PP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;

        await db.insert(productionPlans).values({
          planNo,
          planType: "sales_driven",
          salesOrderId,
          salesOrderNo: order.orderNo,
          productId: item.productId,
          productName: product?.name || `产品#${item.productId}`,
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
export async function getMaterialRequisitionOrders(params?: { search?: string; status?: string; productionOrderId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(materialRequisitionOrders.requisitionNo, `%${params.search}%`), like(materialRequisitionOrders.productionOrderNo, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(materialRequisitionOrders.status, params.status as any));
  if (params?.productionOrderId) conditions.push(eq(materialRequisitionOrders.productionOrderId, params.productionOrderId));
  let query = db.select().from(materialRequisitionOrders);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(materialRequisitionOrders.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getMaterialRequisitionOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materialRequisitionOrders).where(eq(materialRequisitionOrders.id, id)).limit(1);
  return result[0];
}
export async function createMaterialRequisitionOrder(data: InsertMaterialRequisitionOrder) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(materialRequisitionOrders).values(data);
  return result[0].insertId;
}
export async function updateMaterialRequisitionOrder(id: number, data: Partial<InsertMaterialRequisitionOrder>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(materialRequisitionOrders).set(data).where(eq(materialRequisitionOrders.id, id));
}
export async function deleteMaterialRequisitionOrder(id: number, deletedBy?: number) {
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

// ==================== 生产记录单 CRUD ====================
export async function getProductionRecords(params?: { search?: string; status?: string; recordType?: string; productionOrderId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(productionRecords.recordNo, `%${params.search}%`), like(productionRecords.productName, `%${params.search}%`), like(productionRecords.batchNo, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(productionRecords.status, params.status as any));
  if (params?.recordType) conditions.push(eq(productionRecords.recordType, params.recordType as any));
  if (params?.productionOrderId) conditions.push(eq(productionRecords.productionOrderId, params.productionOrderId));
  let query = db.select().from(productionRecords);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(productionRecords.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getProductionRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productionRecords).where(eq(productionRecords.id, id)).limit(1);
  return result[0];
}
export async function createProductionRecord(data: InsertProductionRecord) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(productionRecords).values(data);
  return result[0].insertId;
}
export async function updateProductionRecord(id: number, data: Partial<InsertProductionRecord>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(productionRecords).set(data).where(eq(productionRecords.id, id));
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

// ==================== 生产流转单 CRUD ====================
export async function getProductionRoutingCards(params?: { search?: string; status?: string; productionOrderId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(productionRoutingCards.cardNo, `%${params.search}%`), like(productionRoutingCards.productName, `%${params.search}%`), like(productionRoutingCards.batchNo, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(productionRoutingCards.status, params.status as any));
  if (params?.productionOrderId) conditions.push(eq(productionRoutingCards.productionOrderId, params.productionOrderId));
  let query = db.select().from(productionRoutingCards);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(productionRoutingCards.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getProductionRoutingCardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productionRoutingCards).where(eq(productionRoutingCards.id, id)).limit(1);
  return result[0];
}
export async function createProductionRoutingCard(data: InsertProductionRoutingCard) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(productionRoutingCards).values(data);
  return result[0].insertId;
}
export async function updateProductionRoutingCard(id: number, data: Partial<InsertProductionRoutingCard>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(productionRoutingCards).set(data).where(eq(productionRoutingCards.id, id));
}
export async function deleteProductionRoutingCard(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：委外灭菌单及其关联的入库申请
  const relatedSterilizations = await db.select({ id: sterilizationOrders.id }).from(sterilizationOrders).where(eq(sterilizationOrders.routingCardId, id));
  for (const s of relatedSterilizations) {
    await db.delete(productionWarehouseEntries).where(eq(productionWarehouseEntries.sterilizationOrderId, s.id));
  }
  await db.delete(sterilizationOrders).where(eq(sterilizationOrders.routingCardId, id));
  await deleteSingleWithRecycle(db, {
    table: productionRoutingCards,
    idColumn: productionRoutingCards.id,
    id,
    entityType: "生产流转单",
    sourceTable: "production_routing_cards",
    deletedBy,
  });
}

// ==================== 委外灭菌单 CRUD ====================
export async function getSterilizationOrders(params?: { search?: string; status?: string; productionOrderId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(sterilizationOrders.orderNo, `%${params.search}%`), like(sterilizationOrders.productName, `%${params.search}%`), like(sterilizationOrders.supplierName, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(sterilizationOrders.status, params.status as any));
  if (params?.productionOrderId) conditions.push(eq(sterilizationOrders.productionOrderId, params.productionOrderId));
  let query = db.select().from(sterilizationOrders);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(sterilizationOrders.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getSterilizationOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sterilizationOrders).where(eq(sterilizationOrders.id, id)).limit(1);
  return result[0];
}
export async function createSterilizationOrder(data: InsertSterilizationOrder) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSterilizationOrderColumns(db);
  const result = await db.insert(sterilizationOrders).values(data);
  return result[0].insertId;
}
export async function updateSterilizationOrder(id: number, data: Partial<InsertSterilizationOrder>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureSterilizationOrderColumns(db);
  await db.update(sterilizationOrders).set(data).where(eq(sterilizationOrders.id, id));
}
export async function deleteSterilizationOrder(id: number, deletedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  // 级联删除：生产入库申请
  await db.delete(productionWarehouseEntries).where(eq(productionWarehouseEntries.sterilizationOrderId, id));
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
export async function getProductionWarehouseEntries(params?: { search?: string; status?: string; productionOrderId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(productionWarehouseEntries.entryNo, `%${params.search}%`), like(productionWarehouseEntries.productName, `%${params.search}%`), like(productionWarehouseEntries.batchNo, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(productionWarehouseEntries.status, params.status as any));
  if (params?.productionOrderId) conditions.push(eq(productionWarehouseEntries.productionOrderId, params.productionOrderId));
  let query = db.select().from(productionWarehouseEntries);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(productionWarehouseEntries.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getProductionWarehouseEntryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productionWarehouseEntries).where(eq(productionWarehouseEntries.id, id)).limit(1);
  return result[0];
}
export async function createProductionWarehouseEntry(data: InsertProductionWarehouseEntry) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionWarehouseEntryColumns(db);
  const result = await db.insert(productionWarehouseEntries).values(data);
  return result[0].insertId;
}
export async function updateProductionWarehouseEntry(id: number, data: Partial<InsertProductionWarehouseEntry>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureProductionWarehouseEntryColumns(db);
  await db.update(productionWarehouseEntries).set(data).where(eq(productionWarehouseEntries.id, id));
}
export async function deleteProductionWarehouseEntry(id: number, deletedBy?: number) {
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


// ==================== 加班申请 CRUD ====================
export async function getOvertimeRequests(params?: { search?: string; status?: string; department?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(overtimeRequests.requestNo, `%${params.search}%`), like(overtimeRequests.applicantName, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(overtimeRequests.status, params.status as any));
  if (params?.department) conditions.push(eq(overtimeRequests.department, params.department));
  let query = db.select().from(overtimeRequests);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(overtimeRequests.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getOvertimeRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(overtimeRequests).where(eq(overtimeRequests.id, id)).limit(1);
  return result[0];
}
export async function createOvertimeRequest(data: InsertOvertimeRequest) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(overtimeRequests).values(data);
  return result[0].insertId;
}
export async function updateOvertimeRequest(id: number, data: Partial<InsertOvertimeRequest>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(overtimeRequests).set(data).where(eq(overtimeRequests.id, id));
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
export async function getLeaveRequests(params?: { search?: string; status?: string; department?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(leaveRequests.requestNo, `%${params.search}%`), like(leaveRequests.applicantName, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(leaveRequests.status, params.status as any));
  if (params?.department) conditions.push(eq(leaveRequests.department, params.department));
  let query = db.select().from(leaveRequests);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(leaveRequests.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getLeaveRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
  return result[0];
}
export async function createLeaveRequest(data: InsertLeaveRequest) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(leaveRequests).values(data);
  return result[0].insertId;
}
export async function updateLeaveRequest(id: number, data: Partial<InsertLeaveRequest>) {
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
export async function getOutingRequests(params?: { search?: string; status?: string; department?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.search) conditions.push(or(like(outingRequests.requestNo, `%${params.search}%`), like(outingRequests.applicantName, `%${params.search}%`)));
  if (params?.status) conditions.push(eq(outingRequests.status, params.status as any));
  if (params?.department) conditions.push(eq(outingRequests.department, params.department));
  let query = db.select().from(outingRequests);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(outingRequests.createdAt)).limit(params?.limit || 100).offset(params?.offset || 0);
}
export async function getOutingRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(outingRequests).where(eq(outingRequests.id, id)).limit(1);
  return result[0];
}
export async function createOutingRequest(data: InsertOutingRequest) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(outingRequests).values(data);
  return result[0].insertId;
}
export async function updateOutingRequest(id: number, data: Partial<InsertOutingRequest>) {
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
export async function getProductSupplierPrices(params?: { productId?: number; supplierId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (params?.productId) conditions.push(eq(productSupplierPrices.productId, params.productId));
  if (params?.supplierId) conditions.push(eq(productSupplierPrices.supplierId, params.supplierId));
  let query = db.select().from(productSupplierPrices);
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return await query.orderBy(desc(productSupplierPrices.isDefault), desc(productSupplierPrices.createdAt));
}
export async function getProductSupplierPriceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productSupplierPrices).where(eq(productSupplierPrices.id, id)).limit(1);
  return result[0];
}
export async function createProductSupplierPrice(data: InsertProductSupplierPrice) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  const result = await db.insert(productSupplierPrices).values(data);
  return result[0].insertId;
}
export async function updateProductSupplierPrice(id: number, data: Partial<InsertProductSupplierPrice>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.update(productSupplierPrices).set(data).where(eq(productSupplierPrices.id, id));
}
export async function deleteProductSupplierPrice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await db.delete(productSupplierPrices).where(eq(productSupplierPrices.id, id));
}

// ==================== 批记录查询 ====================
/**
 * 按生产批号聚合全链路数据（5个板块：生产/质量/仓库/销售/财务）
 */
export async function getBatchRecord(batchNo: string) {
  const db = await getDb();
  if (!db) return null;

  // 1. 生产指令（主记录）
  const productionOrderRows = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.batchNo, batchNo))
    .limit(1);
  const productionOrder = productionOrderRows[0] || null;

  // 2. 生产记录（温湿度/清场/首件/材料/通用）
  const productionRecordRows = await db
    .select()
    .from(productionRecords)
    .where(eq(productionRecords.batchNo, batchNo))
    .orderBy(asc(productionRecords.recordDate), asc(productionRecords.createdAt));

  // 3. 生产流转单
  const routingCardRows = await db
    .select()
    .from(productionRoutingCards)
    .where(eq(productionRoutingCards.batchNo, batchNo));

  // 4. 委外灭菌单
  const sterilizationOrderRows = await db
    .select()
    .from(sterilizationOrders)
    .where(eq(sterilizationOrders.batchNo, batchNo));

  // 5. 质量检验（IPQC + OQC）
  const qualityInspectionRows = await db
    .select()
    .from(qualityInspections)
    .where(eq(qualityInspections.batchNo, batchNo))
    .orderBy(asc(qualityInspections.inspectionDate));

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

  // 8. 销售订单（通过生产指令的 salesOrderId 关联）
  let salesOrderData: any = null;
  let accountsReceivableData: any[] = [];
  if (productionOrder?.salesOrderId) {
    const soRows = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.id, productionOrder.salesOrderId))
      .limit(1);
    salesOrderData = soRows[0] || null;

    // 9. 应收账款（通过 salesOrderId 关联）
    accountsReceivableData = await db
      .select()
      .from(accountsReceivable)
      .where(eq(accountsReceivable.salesOrderId, productionOrder.salesOrderId));
  }

  // 10. 质量不良事件（按批号关联）
  const incidentRows = await db
    .select()
    .from(qualityIncidents)
    .where(eq(qualityIncidents.batchNo, batchNo));

  return {
    batchNo,
    production: {
      order: productionOrder,
      records: productionRecordRows,
      routingCards: routingCardRows,
      sterilizationOrders: sterilizationOrderRows,
    },
    quality: {
      inspections: qualityInspectionRows,
      incidents: incidentRows,
    },
    warehouse: {
      entries: warehouseEntryRows,
      transactions: inventoryTxRows,
    },
    sales: {
      order: salesOrderData,
    },
    finance: {
      accountsReceivable: accountsReceivableData,
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
    conditions.push(sql`DATE(${productionOrders.createdAt}) >= ${params.dateFrom}`);
  }
  if (params?.dateTo) {
    conditions.push(sql`DATE(${productionOrders.createdAt}) <= ${params.dateTo}`);
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
export async function getUserEmailsByDepartment(departments: string[]): Promise<string[]> {
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
export async function recalculateInventoryById(inventoryId: number): Promise<void> {
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
export async function recalculateAllInventory(): Promise<{ updated: number; errors: number }> {
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

export async function ensureGoodsReceiptsTable(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
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

export async function getGoodsReceipts(params?: { status?: string; search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  await ensureGoodsReceiptsTable(db);
  const { status, search, limit = 100, offset = 0 } = params ?? {};
  const conditions: any[] = [];
  if (status && status !== "all") conditions.push(eq(goodsReceipts.status, status as any));
  if (search) conditions.push(or(
    like(goodsReceipts.receiptNo, `%${search}%`),
    like(goodsReceipts.purchaseOrderNo, `%${search}%`),
    like(goodsReceipts.supplierName, `%${search}%`),
  ));
  const rows = await db.select().from(goodsReceipts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(goodsReceipts.createdAt))
    .limit(limit).offset(offset);
  if (rows.length === 0) return [];
  const receiptIds = rows.map((r) => r.id);
  const allItems = await db.select().from(goodsReceiptItems).where(inArray(goodsReceiptItems.receiptId, receiptIds));
  return rows.map((r) => ({ ...r, items: allItems.filter((it) => it.receiptId === r.id) }));
}

export async function getGoodsReceiptById(id: number) {
  const db = await getDb();
  if (!db) return null;
  await ensureGoodsReceiptsTable(db);
  const [receipt] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id));
  if (!receipt) return null;
  const items = await db.select().from(goodsReceiptItems).where(eq(goodsReceiptItems.receiptId, id));
  return { ...receipt, items };
}

export async function createGoodsReceipt(data: {
  receiptNo: string; purchaseOrderId: number; purchaseOrderNo: string;
  supplierId?: number; supplierName?: string; warehouseId: number;
  receiptDate: string; remark?: string; createdBy?: number;
  items: Array<{
    purchaseOrderItemId?: number; productId?: number; materialCode?: string;
    materialName: string; specification?: string; unit?: string;
    orderedQty: string; receivedQty: string; batchNo?: string;
    sterilizationBatchNo?: string; remark?: string;
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
    await db.insert(goodsReceiptItems).values(
      items.map((item) => ({ ...item, receiptId } as any))
    );
  }
  return receiptId;
}

export async function updateGoodsReceipt(id: number, data: Partial<{
  status: string; inspectorId: number; inspectorName: string;
  inspectionDate: string; inspectionResult: string; inspectionRemark: string;
  inboundDocumentNo: string; inboundAt: Date; remark: string;
  items: Array<{
    id?: number; purchaseOrderItemId?: number; productId?: number;
    materialCode?: string; materialName: string; specification?: string;
    unit?: string; orderedQty: string; receivedQty: string;
    batchNo?: string; sterilizationBatchNo?: string;
    inspectionQty?: string; qualifiedQty?: string; unqualifiedQty?: string; remark?: string;
  }>;
}>) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureGoodsReceiptsTable(db);
  const { items, ...receiptData } = data;
  if (Object.keys(receiptData).length > 0) {
    await db.update(goodsReceipts).set(receiptData as any).where(eq(goodsReceipts.id, id));
  }
  if (items) {
    await db.delete(goodsReceiptItems).where(eq(goodsReceiptItems.receiptId, id));
    if (items.length > 0) {
      await db.insert(goodsReceiptItems).values(
        items.map((item) => ({ ...item, receiptId: id } as any))
      );
    }
  }
}

export async function deleteGoodsReceipt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureGoodsReceiptsTable(db);
  await db.delete(goodsReceiptItems).where(eq(goodsReceiptItems.receiptId, id));
  await db.delete(goodsReceipts).where(eq(goodsReceipts.id, id));
}

// ==================== 检验要求 ====================

let inspectionRequirementsTableReady = false;

export async function ensureInspectionRequirementsTable(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
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
      itemName VARCHAR(200) NOT NULL,
      itemType ENUM('qualitative','quantitative') NOT NULL,
      standard VARCHAR(500),
      minVal DECIMAL(12,4),
      maxVal DECIMAL(12,4),
      unit VARCHAR(20),
      acceptedValues VARCHAR(500),
      sortOrder INT DEFAULT 0,
      remark TEXT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  inspectionRequirementsTableReady = true;
}

export async function getInspectionRequirements(params?: { type?: string; search?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  await ensureInspectionRequirementsTable(db);
  const { type, search, status, limit = 200, offset = 0 } = params ?? {};
  const conditions: any[] = [];
  if (type) conditions.push(eq(inspectionRequirements.type, type as any));
  if (status) conditions.push(eq(inspectionRequirements.status, status as any));
  if (search) conditions.push(or(
    like(inspectionRequirements.requirementNo, `%${search}%`),
    like(inspectionRequirements.productName, `%${search}%`),
    like(inspectionRequirements.productCode, `%${search}%`),
  ));
  const rows = await db.select().from(inspectionRequirements)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(inspectionRequirements.createdAt))
    .limit(limit).offset(offset);
  return rows;
}

export async function getInspectionRequirementById(id: number) {
  const db = await getDb();
  if (!db) return null;
  await ensureInspectionRequirementsTable(db);
  const [req] = await db.select().from(inspectionRequirements).where(eq(inspectionRequirements.id, id));
  if (!req) return null;
  const items = await db.select().from(inspectionRequirementItems).where(eq(inspectionRequirementItems.requirementId, id)).orderBy(inspectionRequirementItems.sortOrder);
  return { ...req, items };
}

export async function createInspectionRequirement(data: {
  requirementNo: string; type: string; productCode?: string; productName: string;
  version?: string; status?: string; remark?: string; createdBy?: number;
  items: Array<{ itemName: string; itemType: string; standard?: string; minValue?: string; maxValue?: string; unit?: string; acceptedValues?: string; sortOrder?: number; remark?: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInspectionRequirementsTable(db);
  const { items, ...reqData } = data;
  const [result] = await db.insert(inspectionRequirements).values(reqData as any);
  const reqId = (result as any).insertId;
  if (items && items.length > 0) {
    await db.insert(inspectionRequirementItems).values(
      items.map((item, idx) => {
        const { minValue, maxValue, ...rest } = item as any;
        return { ...rest, minVal: minValue ?? null, maxVal: maxValue ?? null, requirementId: reqId, sortOrder: item.sortOrder ?? idx };
      }) as any
    );
  }
  return reqId;
}

export async function updateInspectionRequirement(id: number, data: {
  requirementNo?: string; type?: string; productCode?: string; productName?: string;
  version?: string; status?: string; remark?: string;
  items?: Array<{ itemName: string; itemType: string; standard?: string; minValue?: string; maxValue?: string; unit?: string; acceptedValues?: string; sortOrder?: number; remark?: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInspectionRequirementsTable(db);
  const { items, ...reqData } = data;
  if (Object.keys(reqData).length > 0) {
    await db.update(inspectionRequirements).set(reqData as any).where(eq(inspectionRequirements.id, id));
  }
  if (items !== undefined) {
    await db.delete(inspectionRequirementItems).where(eq(inspectionRequirementItems.requirementId, id));
    if (items.length > 0) {
      await db.insert(inspectionRequirementItems).values(
        items.map((item, idx) => {
          const { minValue, maxValue, ...rest } = item as any;
          return { ...rest, minVal: minValue ?? null, maxVal: maxValue ?? null, requirementId: id, sortOrder: item.sortOrder ?? idx };
        }) as any
      );
    }
  }
}

export async function deleteInspectionRequirement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureInspectionRequirementsTable(db);
  await db.delete(inspectionRequirementItems).where(eq(inspectionRequirementItems.requirementId, id));
  await db.delete(inspectionRequirements).where(eq(inspectionRequirements.id, id));
}

// ==================== 来料检验单（IQC） ====================

let iqcInspectionsTableReady = false;

export async function ensureIqcInspectionsTable(dbArg?: ReturnType<typeof drizzle> | null) {
  const db = dbArg ?? await getDb();
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
  ];
  for (const col of iqcNewCols) {
    try {
      await db.execute(sql.raw(`ALTER TABLE iqc_inspections ADD COLUMN ${col.name} ${col.ddl}`));
    } catch (err) {
      const msg = String((err as any)?.message ?? "");
      if (!/Duplicate column name|already exists|1060/i.test(msg)) {
        console.warn(`[DB] Could not add column ${col.name} to iqc_inspections:`, msg);
      }
    }
  }
  iqcInspectionsTableReady = true;
}

export async function getIqcInspections(params?: { result?: string; search?: string; goodsReceiptId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  await ensureIqcInspectionsTable(db);
  const { result, search, goodsReceiptId, limit = 200, offset = 0 } = params ?? {};
  const conditions: any[] = [];
  if (result && result !== "all") conditions.push(eq(iqcInspections.result, result as any));
  if (goodsReceiptId) conditions.push(eq(iqcInspections.goodsReceiptId, goodsReceiptId));
  if (search) conditions.push(or(
    like(iqcInspections.inspectionNo, `%${search}%`),
    like(iqcInspections.productName, `%${search}%`),
    like(iqcInspections.supplierName, `%${search}%`),
    like(iqcInspections.goodsReceiptNo, `%${search}%`),
  ));
  const rows = await db.select().from(iqcInspections)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(iqcInspections.createdAt))
    .limit(limit).offset(offset);
  return rows;
}

export async function getIqcInspectionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  await ensureIqcInspectionsTable(db);
  const [record] = await db.select().from(iqcInspections).where(eq(iqcInspections.id, id));
  if (!record) return null;
  const items = await db.select().from(iqcInspectionItems).where(eq(iqcInspectionItems.iqcId, id)).orderBy(iqcInspectionItems.sortOrder);
  return { ...record, items };
}

export async function createIqcInspection(data: {
  inspectionNo: string; reportMode?: string; goodsReceiptId?: number; goodsReceiptNo?: string; goodsReceiptItemId?: number;
  productId?: number; productCode?: string; productName: string; specification?: string;
  supplierId?: number; supplierName?: string; supplierCode?: string; batchNo?: string; sterilizationBatchNo?: string;
  receivedQty?: string; sampleQty?: string; qualifiedQty?: string; unit?: string;
  inspectionRequirementId?: number; inspectionDate?: string;
  inspectorId?: number; inspectorName?: string; result?: string; remark?: string; attachments?: string; createdBy?: number;
  items: Array<{
    requirementItemId?: number; itemName: string; itemType: string; standard?: string;
    minValue?: string; maxValue?: string; unit?: string; measuredValue?: string; sampleValues?: string;
    acceptedValues?: string; actualValue?: string; conclusion?: string; sortOrder?: number; remark?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcInspectionsTable(db);
  const { items, ...iqcData } = data;
  const [result] = await db.insert(iqcInspections).values(iqcData as any);
  const iqcId = (result as any).insertId;
  if (items && items.length > 0) {
    await db.insert(iqcInspectionItems).values(
      items.map((item, idx) => {
        const { minValue, maxValue, ...rest } = item as any;
        return { ...rest, minVal: minValue ?? null, maxVal: maxValue ?? null, iqcId, sortOrder: item.sortOrder ?? idx };
      }) as any
    );
  }
  return iqcId;
}

export async function updateIqcInspection(id: number, data: {
  reportMode?: string; inspectionDate?: string; inspectorId?: number; inspectorName?: string;
  result?: string; sampleQty?: string; qualifiedQty?: string; remark?: string; attachments?: string; signatures?: string;
  inspectionRequirementId?: number; supplierCode?: string;
  items?: Array<{
    requirementItemId?: number; itemName: string; itemType: string; standard?: string;
    minValue?: string; maxValue?: string; unit?: string; measuredValue?: string; sampleValues?: string;
    acceptedValues?: string; actualValue?: string; conclusion?: string; sortOrder?: number; remark?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcInspectionsTable(db);
  const { items, ...iqcData } = data;
  if (Object.keys(iqcData).length > 0) {
    await db.update(iqcInspections).set(iqcData as any).where(eq(iqcInspections.id, id));
  }
  if (items !== undefined) {
    await db.delete(iqcInspectionItems).where(eq(iqcInspectionItems.iqcId, id));
    if (items.length > 0) {
      await db.insert(iqcInspectionItems).values(
        items.map((item, idx) => {
          const { minValue, maxValue, ...rest } = item as any;
          return { ...rest, minVal: minValue ?? null, maxVal: maxValue ?? null, iqcId: id, sortOrder: item.sortOrder ?? idx };
        }) as any
      );
    }
  }
  // 检验完成后同步到货单状态
  if (data.result && data.result !== "pending") {
    const [iqc] = await db.select().from(iqcInspections).where(eq(iqcInspections.id, id));
    if (iqc?.goodsReceiptId) {
      const newStatus = data.result === "passed" ? "passed" : data.result === "conditional_pass" ? "passed" : "failed";
      await db.update(goodsReceipts).set({ status: newStatus as any }).where(eq(goodsReceipts.id, iqc.goodsReceiptId));
    }
  }
}

export async function deleteIqcInspection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");
  await ensureIqcInspectionsTable(db);
  await db.delete(iqcInspectionItems).where(eq(iqcInspectionItems.iqcId, id));
  await db.delete(iqcInspections).where(eq(iqcInspections.id, id));
}
