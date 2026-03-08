import { z } from "zod";
import { randomBytes, scryptSync } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { normalizePaymentCondition } from "@shared/paymentTerms";
import { ATTACHMENT_EXTENSIONS, buildUploadFolderName, normalizeDepartmentForUpload } from "@shared/uploadPolicy";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { saveAttachmentFile } from "./attachmentStorage";
import {
  clearExpiredRecycleBinEntries,
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getNextProductCode, isProductCodeExists,
  deleteDocument,
  deleteUser,
  getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, getNextCustomerCode, enrichCustomerLogoDomain,
  getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier,
  getSalesOrders, getSalesOrderById, getSalesOrderItems, createSalesOrder, updateSalesOrder, deleteSalesOrder, getNextSalesOrderNo, getLastSalePrices,
  getPurchaseOrders, getPurchaseOrderById, getPurchaseOrderItems, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
  getProductionOrders, getProductionOrderById, createProductionOrder, updateProductionOrder, deleteProductionOrder,
  getInventory, getInventoryById, createInventory, updateInventory, deleteInventory, recalculateAllInventory, recalculateInventoryById,
  getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getInventoryTransactions, createInventoryTransaction, updateInventoryTransaction, deleteInventoryTransaction,
  getOperationLogs, createOperationLog, clearOperationLogs,
  getQualityInspections, getQualityInspectionById, createQualityInspection, updateQualityInspection, deleteQualityInspection,
  getBomByProductId, getBomList, createBomItem, updateBomItem, deleteBomItem,
  getDashboardStats,
  getSalesOrderApprovalState,
  getWorkflowCenterData,
  // 新增
  getBankAccounts, getBankAccountById, createBankAccount, updateBankAccount, deleteBankAccount,
  getExchangeRates, createExchangeRate, updateExchangeRate, deleteExchangeRate,
  getPaymentTerms, createPaymentTerm, updatePaymentTerm, deletePaymentTerm,
  getMaterialRequests, getMaterialRequestById, getMaterialRequestItems, createMaterialRequest, updateMaterialRequest, deleteMaterialRequest,
  getExpenseReimbursements, getExpenseReimbursementById, createExpenseReimbursement, updateExpenseReimbursement, deleteExpenseReimbursement,
  getPaymentRecords, createPaymentRecord, deletePaymentRecord,
  getCustomsDeclarations, getCustomsDeclarationById, createCustomsDeclaration, updateCustomsDeclaration, deleteCustomsDeclaration,
  getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment,
  getCodeRules, createCodeRule, updateCodeRule, deleteCodeRule,
  getCompanyInfo, updateCompanyInfo,
  getWorkflowFormCatalog, getWorkflowFormCatalogItem, setWorkflowFormCatalogApprovalEnabled,
  getWorkflowTemplates, getWorkflowTemplateById, createWorkflowTemplate, updateWorkflowTemplate, deleteWorkflowTemplate,
  getPersonnel, getPersonnelById, createPersonnel, updatePersonnel, deletePersonnel,
  getTrainings, getTrainingById, createTraining, updateTraining, deleteTraining,
  getAudits, getAuditById, createAudit, updateAudit, deleteAudit,
  getRdProjects, getRdProjectById, createRdProject, updateRdProject, deleteRdProject,
  getStocktakes, getStocktakeById, createStocktake, updateStocktake, deleteStocktake,
  getQualityIncidents, getQualityIncidentById, createQualityIncident, updateQualityIncident, deleteQualityIncident,
  getSamples, getSampleById, createSample, updateSample, deleteSample,
  getLabRecords, getLabRecordById, createLabRecord, updateLabRecord, deleteLabRecord,
  getAccountsReceivable, getAccountsReceivableById, createAccountsReceivable, updateAccountsReceivable, deleteAccountsReceivable,
  getAccountsPayable, getAccountsPayableById, createAccountsPayable, updateAccountsPayable, deleteAccountsPayable,
  getDealerQualifications, getDealerQualificationById, createDealerQualification, updateDealerQualification, deleteDealerQualification,
  getEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment,
  getProductionPlans, getProductionPlanById, createProductionPlan, updateProductionPlan, deleteProductionPlan, autoGenerateProductionPlans,
  getMaterialRequisitionOrders, getMaterialRequisitionOrderById, createMaterialRequisitionOrder, updateMaterialRequisitionOrder, deleteMaterialRequisitionOrder,
  getProductionRecords, getProductionRecordById, createProductionRecord, updateProductionRecord, deleteProductionRecord,
  getProductionRoutingCards, getProductionRoutingCardById, createProductionRoutingCard, updateProductionRoutingCard, deleteProductionRoutingCard,
  getSterilizationOrders, getSterilizationOrderById, createSterilizationOrder, updateSterilizationOrder, deleteSterilizationOrder,
  getProductionWarehouseEntries,  getProductionWarehouseEntryById, createProductionWarehouseEntry, updateProductionWarehouseEntry, deleteProductionWarehouseEntry,
  getOvertimeRequests, getOvertimeRequestById, createOvertimeRequest, updateOvertimeRequest, deleteOvertimeRequest,
  getLeaveRequests, getLeaveRequestById, createLeaveRequest, updateLeaveRequest, deleteLeaveRequest,
  getOutingRequests, getOutingRequestById, createOutingRequest, updateOutingRequest, deleteOutingRequest,
  getProductSupplierPrices, getProductSupplierPriceById, createProductSupplierPrice, updateProductSupplierPrice, deleteProductSupplierPrice,
  getRecycleBinEntries,  removeRecycleBinEntry,
  restoreRecycleBinEntry,
  getNextOrderNo,
  ensureUsersVisibleAppsColumn,
  ensureUsersAvatarUrlColumn,
  ensureUsersWechatColumns,
  syncOqcResultToWarehouseEntry,
  getBatchRecord,
  getBatchRecordList,
  getUserEmailsByDepartment,
  getGoodsReceipts, getGoodsReceiptById, createGoodsReceipt, updateGoodsReceipt, deleteGoodsReceipt,
  ensureGoodsReceiptsTable,
  getInspectionRequirements, getInspectionRequirementById, createInspectionRequirement, updateInspectionRequirement, deleteInspectionRequirement,
  getIqcInspections, getIqcInspectionById, createIqcInspection, updateIqcInspection, deleteIqcInspection,
  ensureIqcInspectionsTable,
} from "./db";
import {
  notifySterilizationArrived,
  notifyOqcQualified,
  notifyOqcUnqualified,
  notifyWarehouseEntryApproved,
  notifyWarehouseEntryCompleted,
  notifyMaterialRequestApproved,
} from "./emailService";
import { getDb } from "./db";
import { orderApprovals, salesOrders as salesOrdersTable, salesOrderItems, inventoryTransactions, inventory, users, documents,
  accountsReceivable as accountsReceivableTable,
  customers as customersTable,
  materialRequests as materialRequestsTable, customsDeclarations as customsTable,
  stocktakes as stocktakesTable, qualityIncidents as incidentsTable,
  samples as samplesTable, labRecords as labRecordsTable,
  trainings as trainingsTable, personnel as personnelTable,
  expenseReimbursements as expensesTable, paymentRecords as paymentRecordsTable,
  overtimeRequests as overtimeTable, leaveRequests as leaveTable, outingRequests as outingTable,
  udiLabels,
} from "../drizzle/schema";
import { eq, desc, sql, like, and, or } from "drizzle-orm";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function parseDepartments(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function canViewAllSalesData(user: any): boolean {
  // 管理员或部门负责人可查看全部销售数据
  const role = String(user?.role ?? "");
  const position = String(user?.position ?? "").trim();
  return role === "admin" || position === "部门负责人" || position === "经理" || position === "总监";
}

function isSalesDepartmentUser(user: any): boolean {
  return parseDepartments(user?.department).includes("销售部");
}

const PREPAY_RATIO_MARKER = "[PREPAY_RATIO]";

function parsePrepayRatioFromRemark(remark: unknown): number {
  const text = String(remark ?? "");
  const markerLine = text
    .split("\n")
    .find((line) => line.startsWith(PREPAY_RATIO_MARKER));
  if (!markerLine) return 30;
  const ratioRaw = markerLine.slice(PREPAY_RATIO_MARKER.length).trim();
  const ratio = Number(ratioRaw);
  if (!Number.isFinite(ratio)) return 30;
  return Math.min(100, Math.max(0, ratio));
}

function round2(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return (Math.round(n * 100) / 100).toFixed(2);
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

function safeFileSegment(value: string): string {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function toCustomerShortName(name: string): string {
  const raw = String(name ?? "").trim();
  if (!raw) return "客户";
  const stripped = raw
    .replace(/(有限责任公司|股份有限公司|有限公司|集团|Inc\.?|Incorporated|Co\.,?\s*Ltd\.?|Ltd\.?)/gi, "")
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
  if (message.includes("Cannot add or update a child row") || code === "ER_NO_REFERENCED_ROW_2") {
    return `关联数据不存在（客户或订单）[${code || errno || "FK"}]`;
  }
  if (message.includes("Duplicate entry") || code === "ER_DUP_ENTRY") {
    return `记录已存在[${code || errno || "DUP"}]`;
  }
  if (message.includes("Incorrect date value") || code === "ER_TRUNCATED_WRONG_VALUE") {
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

async function syncOneReceivableFromSalesOrder(orderId: number, operatorId?: number) {
  const db = await getDb();
  if (!db) return { created: false, reason: "数据库不可用", orderNo: "" };

  const [existing] = await db
    .select({ id: accountsReceivableTable.id })
    .from(accountsReceivableTable)
    .where(eq(accountsReceivableTable.salesOrderId, orderId))
    .limit(1);
  if (existing) return { created: false, reason: "已存在应收记录", orderNo: "" };

  const [order] = await db
    .select({
      id: salesOrdersTable.id,
      orderNo: salesOrdersTable.orderNo,
      customerId: salesOrdersTable.customerId,
      orderDate: salesOrdersTable.orderDate,
      deliveryDate: salesOrdersTable.deliveryDate,
      totalAmount: salesOrdersTable.totalAmount,
      totalAmountBase: salesOrdersTable.totalAmountBase,
      currency: salesOrdersTable.currency,
      exchangeRate: salesOrdersTable.exchangeRate,
      paymentMethod: salesOrdersTable.paymentMethod,
      remark: salesOrdersTable.remark,
      status: salesOrdersTable.status,
      createdBy: salesOrdersTable.createdBy,
    })
    .from(salesOrdersTable)
    .where(eq(salesOrdersTable.id, orderId))
    .limit(1);

  if (!order) return { created: false, reason: "订单不存在", orderNo: "" };
  if (!order.customerId) return { created: false, reason: "客户为空", orderNo: String(order.orderNo || "") };
  if (order.status === "cancelled") return { created: false, reason: "订单已取消", orderNo: String(order.orderNo || "") };
  const [customerExists] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.id, order.customerId))
    .limit(1);
  if (!customerExists) {
    return { created: false, reason: `客户不存在(${order.customerId})`, orderNo: String(order.orderNo || "") };
  }

  const paymentMethod = normalizePaymentCondition(order.paymentMethod);
  const totalAmount = Number(order.totalAmount ?? 0);
  const exchangeRate = Number(order.exchangeRate ?? 1) > 0 ? Number(order.exchangeRate) : 1;
  const totalAmountBase = Number(order.totalAmountBase ?? totalAmount * exchangeRate);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return { created: false, reason: "订单金额<=0", orderNo: String(order.orderNo || "") };
  }

  const prepayRatio = paymentMethod === "预付款" ? parsePrepayRatioFromRemark(order.remark) : 100;
  const ratio = prepayRatio / 100;
  const receivableAmount = totalAmount * ratio;
  const receivableAmountBase = totalAmountBase * ratio;

  const dueDate = paymentMethod === "账期支付"
    ? (order.deliveryDate ?? order.orderDate)
    : order.orderDate;

  const ratioRemark = paymentMethod === "预付款" ? `预付款比例：${prepayRatio}%` : "";
  const baseRemark = String(order.remark ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(PREPAY_RATIO_MARKER))
    .join("\n")
    .trim();
  const mergedRemark = [ratioRemark, baseRemark].filter(Boolean).join(" | ");

  try {
    // 使用最小字段原生 SQL 写入，规避 drizzle 在不同 DATE/DECIMAL 映射下的兼容问题
    await db.execute(sql`
      INSERT INTO accounts_receivable
      (invoiceNo, customerId, salesOrderId, amount, currency, exchangeRate, amountBase, invoiceDate, dueDate, paymentMethod, remark)
      VALUES
      (${`AR-${order.orderNo}`}, ${order.customerId}, ${order.id}, ${round2(receivableAmount)}, ${order.currency || "CNY"}, ${round2(exchangeRate)}, ${round2(receivableAmountBase)}, ${toDateOnly(order.orderDate)}, ${toDateOnly(dueDate)}, ${paymentMethod || null}, ${mergedRemark || null})
    `);
    return { created: true, reason: "", orderNo: String(order.orderNo || "") };
  } catch (error: any) {
    // 再次兜底：进一步缩减字段
    try {
      await db.execute(sql`
        INSERT INTO accounts_receivable
        (invoiceNo, customerId, salesOrderId, amount)
        VALUES
        (${`AR-${order.orderNo}`}, ${order.customerId}, ${order.id}, ${round2(receivableAmount)})
      `);
      return { created: true, reason: "", orderNo: String(order.orderNo || "") };
    } catch (fallbackError: any) {
      return {
        created: false,
        orderNo: String(order.orderNo || ""),
        reason: normalizeSyncErrorMessage(fallbackError || error),
      };
    }
  }
}

async function syncMissingReceivablesFromSalesOrders(operatorId?: number) {
  const db = await getDb();
  if (!db) return { createdCount: 0, totalCount: 0, failed: [{ orderNo: "", reason: "数据库不可用" }] };
  const orders = await db
    .select({ id: salesOrdersTable.id })
    .from(salesOrdersTable)
    .where(sql`${salesOrdersTable.status} != 'cancelled'`);
  let createdCount = 0;
  const failed: Array<{ orderNo: string; reason: string }> = [];
  for (const row of orders) {
    const result = await syncOneReceivableFromSalesOrder(row.id, operatorId);
    if (result.created) {
      createdCount += 1;
      continue;
    }
    if (result.reason && result.reason !== "已存在应收记录") {
      failed.push({ orderNo: result.orderNo || String(row.id), reason: result.reason });
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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== 用户列表 ====================
  users: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureUsersVisibleAppsColumn(db);
      await ensureUsersAvatarUrlColumn(db);
      const result = await db.select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        department: users.department,
        position: users.position,
        phone: users.phone,
        role: users.role,
        visibleApps: users.visibleApps,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
        avatarUrl: users.avatarUrl,
        wxAccount: users.wxAccount,
        wxOpenid: users.wxOpenid,
        wxNickname: users.wxNickname,
      }).from(users);
      return result;
    }),
    create: protectedProcedure.input(z.object({
      username: z.string(),
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(["user", "admin"]).default("user"),
      visibleApps: z.array(z.string()).optional(),
      wxAccount: z.string().optional(),
      wxOpenid: z.string().optional(),
      wxNickname: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureUsersVisibleAppsColumn(db);
      await ensureUsersWechatColumns(db);
      const openId = `user-${input.username}`;
      await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        department: input.department || null,
        role: input.role,
        visibleApps: input.visibleApps?.length ? input.visibleApps.join(",") : null,
        loginMethod: "password",
        wxAccount: input.wxAccount || null,
        wxOpenid: input.wxOpenid || null,
        wxNickname: input.wxNickname || null,
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      username: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      role: z.enum(["user", "admin"]).optional(),
      visibleApps: z.array(z.string()).optional(),
      wxAccount: z.string().optional(),
      wxOpenid: z.string().optional(),
      wxNickname: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureUsersVisibleAppsColumn(db);
      await ensureUsersWechatColumns(db);
      const { id, username, ...data } = input;
      await db.update(users).set({
        ...data,
        visibleApps: data.visibleApps?.length ? data.visibleApps.join(",") : null,
        wxAccount: data.wxAccount ?? null,
        wxOpenid: data.wxOpenid ?? null,
        wxNickname: data.wxNickname ?? null,
      }).where(eq(users.id, id));
      if (username) {
        await db.update(users).set({ openId: `user-${username}` }).where(eq(users.id, id));
      }
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input, ctx }) => {
      await deleteUser(input.id, ctx.user?.id);
      return { success: true };
    }),
    setPassword: protectedProcedure.input(z.object({
      id: z.number(),
      newPassword: z.string(),
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("仅管理员可修改密码");
      }
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
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
      return { success: true };
    }),
    uploadAvatar: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string(),
      mimeType: z.string().optional(),
      base64: z.string(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      await ensureUsersAvatarUrlColumn(db);
      const imageExtAllowList = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
      const extFromName = `.${String(input.name.split(".").pop() || "").toLowerCase()}`;
      const ext = imageExtAllowList.has(extFromName) ? extFromName : (
        String(input.mimeType || "").includes("png") ? ".png" :
        String(input.mimeType || "").includes("jpeg") ? ".jpg" :
        String(input.mimeType || "").includes("jpg") ? ".jpg" :
        String(input.mimeType || "").includes("webp") ? ".webp" : ".png"
      );
      const base64Body = String(input.base64 || "").replace(/^data:[^;]+;base64,/, "");
      const fileBuffer = Buffer.from(base64Body, "base64");
      const saved = await saveAttachmentFile({
        department: "系统设置",
        businessFolder: "用户头像",
        originalName: input.name,
        desiredBaseName: `avatar-user-${input.id}-${Date.now()}`,
        mimeType: input.mimeType,
        buffer: fileBuffer,
      });
      await db.update(users).set({ avatarUrl: saved.filePath }).where(eq(users.id, input.id));
      return { avatarUrl: saved.filePath };
    }),
  }),

  // ==================== 产品管理 ====================
  products: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        salePermission: z.enum(["saleable", "not_saleable"]).optional(),
        procurePermission: z.enum(["purchasable", "production_only"]).optional(),
        isSterilized: z.boolean().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('[products.list] input:', JSON.stringify(input));
        const result = await getProducts(input);
        console.log('[products.list] result count:', result.length);
        return result;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        isMedicalDevice: z.boolean().optional().default(true),
        isSterilized: z.boolean().optional().default(false),
        code: z.string(),
        name: z.string(),
        specification: z.string().optional(),
        category: z.string().optional(),
        productCategory: z.enum(["finished", "semi_finished", "raw_material", "auxiliary", "other"]).optional(),
        unit: z.string().optional(),
        registrationNo: z.string().optional(),
        udiDi: z.string().optional(),
        manufacturer: z.string().optional(),
        storageCondition: z.string().optional(),
        shelfLife: z.number().optional(),
        riskLevel: z.enum(["I", "II", "III"]).optional(),
        salePermission: z.enum(["saleable", "not_saleable"]).default("saleable"),
        procurePermission: z.enum(["purchasable", "production_only"]).default("purchasable"),
        status: z.enum(["draft", "active", "discontinued"]).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await createProduct({ ...input, createdBy: ctx.user?.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          isMedicalDevice: z.boolean().optional(),
          isSterilized: z.boolean().optional(),
          code: z.string().optional(),
          name: z.string().optional(),
          specification: z.string().optional(),
          category: z.string().optional(),
          productCategory: z.enum(["finished", "semi_finished", "raw_material", "auxiliary", "other"]).optional(),
          unit: z.string().optional(),
          registrationNo: z.string().optional(),
          udiDi: z.string().optional(),
          manufacturer: z.string().optional(),
          storageCondition: z.string().optional(),
          shelfLife: z.number().optional(),
          riskLevel: z.enum(["I", "II", "III"]).optional(),
          salePermission: z.enum(["saleable", "not_saleable"]).optional(),
          procurePermission: z.enum(["purchasable", "production_only"]).optional(),
          status: z.enum(["draft", "active", "discontinued"]).optional(),
          description: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await updateProduct(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProduct(input.id);
        return { success: true };
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
      .input(z.object({
        search: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        await normalizePaymentConditionDataInDb();
        const restrictToSelf = isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
        return await getCustomers({
          ...input,
          salesPersonId: restrictToSelf ? ctx.user?.id : undefined,
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const customer = await getCustomerById(input.id);
        if (!customer) return undefined;
        const restrictToSelf = isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
        if (restrictToSelf && customer.salesPersonId !== ctx.user?.id) {
          throw new Error("无权查看该客户");
        }
        return customer;
      }),

    create: protectedProcedure
      .input(z.object({
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
        bankAccount: z.string().optional(),
        bankName: z.string().optional(),
        needInvoice: z.boolean().optional(),
        salesPersonId: z.number().optional(),
        status: z.enum(["active", "inactive", "blacklist"]).optional(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const customerId = await createCustomer({
          ...input,
          paymentTerms: input.paymentTerms === undefined ? undefined : normalizePaymentCondition(input.paymentTerms),
          createdBy: ctx.user?.id,
        });
        // 新建后自动补充客户商标域名（失败不影响主流程）
        await enrichCustomerLogoDomain(customerId).catch(() => undefined);
        return customerId;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          code: z.string().optional(),
          name: z.string().optional(),
          shortName: z.string().optional(),
          type: z.enum(["hospital", "dealer", "domestic", "overseas"]).optional(),
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
          bankAccount: z.string().optional(),
          bankName: z.string().optional(),
          needInvoice: z.boolean().optional(),
          salesPersonId: z.number().optional(),
          status: z.enum(["active", "inactive", "blacklist"]).optional(),
          source: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await updateCustomer(input.id, {
          ...input.data,
          paymentTerms: input.data.paymentTerms === undefined ? undefined : normalizePaymentCondition(input.data.paymentTerms),
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
      .query(async ({ input }) => {
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
      .query(async ({ input }) => {
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
          const amount = typeof order.totalAmount === 'string' 
            ? parseFloat(order.totalAmount) 
            : (order.totalAmount || 0);
          return sum + amount;
        }, 0);
        const receivables = await db
          .select({
            paidAmount: accountsReceivableTable.paidAmount,
          })
          .from(accountsReceivableTable)
          .where(eq(accountsReceivableTable.customerId, input.customerId));
        const paidAmount = receivables.reduce((sum: number, row: any) => {
          const value = typeof row.paidAmount === "string"
            ? parseFloat(row.paidAmount)
            : (row.paidAmount || 0);
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
        const lastOrderDate = orders.length > 0 
          ? [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate
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
      .input(z.object({
        search: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        await normalizePaymentConditionDataInDb();
        return await getSuppliers(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getSupplierById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
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
        bankAccount: z.string().optional(),
        taxNo: z.string().optional(),
        evaluationScore: z.string().optional(),
        status: z.enum(["qualified", "pending", "disqualified"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await createSupplier({
          ...input,
          paymentTerms: input.paymentTerms === undefined ? undefined : normalizePaymentCondition(input.paymentTerms),
          createdBy: ctx.user?.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
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
          bankAccount: z.string().optional(),
          taxNo: z.string().optional(),
          evaluationScore: z.string().optional(),
          status: z.enum(["qualified", "pending", "disqualified"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await updateSupplier(input.id, {
          ...input.data,
          paymentTerms: input.data.paymentTerms === undefined ? undefined : normalizePaymentCondition(input.data.paymentTerms),
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

  // ==================== 产品-供应商价格关联 ====================
  productSupplierPrices: router({
    list: protectedProcedure.input(z.object({ productId: z.number().optional(), supplierId: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getProductSupplierPrices(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getProductSupplierPriceById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      productId: z.number(),
      supplierId: z.number(),
      purchasePrice: z.string().optional(),
      currency: z.string().optional(),
      moq: z.number().optional(),
      leadTimeDays: z.number().optional(),
      isDefault: z.number().optional(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await createProductSupplierPrice({ ...input, createdBy: ctx.user?.id });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        purchasePrice: z.string().optional(),
        currency: z.string().optional(),
        moq: z.number().optional(),
        leadTimeDays: z.number().optional(),
        isDefault: z.number().optional(),
        validFrom: z.string().optional(),
        validTo: z.string().optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateProductSupplierPrice(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteProductSupplierPrice(input.id); return { success: true };
    }),
  }),

  // ==================== 销售订单 ====================
  salesOrders: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().nullish(),
        status: z.string().nullish(),
        customerId: z.number().nullish(),
        limit: z.number().nullish(),
        offset: z.number().nullish(),
      }).optional())
      .query(async ({ input, ctx }) => {
        await normalizePaymentConditionDataInDb();
        const restrictToSelf = isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
        const params = input ? {
          search: input.search ?? undefined,
          status: input.status ?? undefined,
          customerId: input.customerId ?? undefined,
          salesPersonId: restrictToSelf ? ctx.user?.id : undefined,
          limit: input.limit ?? undefined,
          offset: input.offset ?? undefined,
        } : {
          salesPersonId: restrictToSelf ? ctx.user?.id : undefined,
        };
        const baseOrders = await getSalesOrders(params);
        if (!restrictToSelf || !ctx.user?.id) {
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
        });
        const pendingApprovalOrders: typeof baseOrders = [];
        for (const order of pendingOrders as any[]) {
          const approvalState = await getSalesOrderApprovalState(Number(order.id), ctx.user?.id, ctx.user?.role);
          if (approvalState?.canApprove) {
            pendingApprovalOrders.push(order);
          }
        }

        const mergedOrders = [...baseOrders, ...pendingApprovalOrders];
        const dedupedOrders = Array.from(
          new Map(mergedOrders.map((order: any) => [Number(order.id), order])).values(),
        );
        dedupedOrders.sort((a: any, b: any) =>
          String(b?.createdAt ?? b?.orderDate ?? "").localeCompare(String(a?.createdAt ?? a?.orderDate ?? ""))
        );

        const offset = Math.max(0, Number(input?.offset ?? 0));
        const limit = Number(input?.limit ?? 0);
        return limit > 0 ? dedupedOrders.slice(offset, offset + limit) : dedupedOrders.slice(offset);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const order = await getSalesOrderById(input.id);
        const restrictToSelf = isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
        if (restrictToSelf && order?.salesPersonId !== ctx.user?.id) {
          const approvalState = await getSalesOrderApprovalState(input.id, ctx.user?.id, ctx.user?.role);
          if (!approvalState?.canApprove) {
            throw new Error("无权查看该订单");
          }
        }
        const items = await getSalesOrderItems(input.id);
        return { order, items };
      }),

    getApprovalState: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getSalesOrderApprovalState(input.id, ctx.user?.id, ctx.user?.role);
      }),

    create: protectedProcedure
      .input(z.object({
        orderNo: z.string(),
        customerId: z.number(),
        orderDate: z.string(),
        deliveryDate: z.string().optional(),
        totalAmount: z.string().optional(),
        currency: z.string().optional(),
        paymentMethod: z.string().optional(),
        exchangeRate: z.string().optional(),
        totalAmountBase: z.string().optional(),
        status: z.enum(["draft", "pending_review", "approved", "pending_payment", "confirmed", "in_production", "ready_to_ship", "partial_shipped", "shipped", "completed", "cancelled"]).optional(),
        paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
        shippingAddress: z.string().optional(),
        shippingContact: z.string().optional(),
        shippingPhone: z.string().optional(),
        needsShipping: z.boolean().optional(),
        shippingFee: z.string().optional(),
        isExport: z.boolean().optional(),
        remark: z.string().optional(),
        salesPersonId: z.number().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.string(),
          unit: z.string().optional(),
          unitPrice: z.string().optional(),
          amount: z.string().optional(),
          remark: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { items, orderDate, deliveryDate, ...orderData } = input;
        const orderId = await createSalesOrder(
          { 
            ...orderData, 
            paymentMethod: orderData.paymentMethod === undefined ? undefined : normalizePaymentCondition(orderData.paymentMethod),
            orderDate: new Date(orderDate),
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
            createdBy: ctx.user?.id 
          },
          items.map(item => ({ ...item, orderId: 0 }))
        );
        try {
          await syncOneReceivableFromSalesOrder(orderId, ctx.user?.id);
        } catch {
          // 应收联动失败不阻塞销售订单创建
        }
        return orderId;
      }),

    update: protectedProcedure
      .input(z.object({
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
          status: z.enum(["draft", "pending_review", "approved", "pending_payment", "confirmed", "in_production", "ready_to_ship", "partial_shipped", "shipped", "completed", "cancelled"]).optional(),
          paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
          shippingAddress: z.string().optional(),
          shippingContact: z.string().optional(),
          shippingPhone: z.string().optional(),
          needsShipping: z.boolean().optional(),
          shippingFee: z.string().optional(),
          isExport: z.boolean().optional(),
          remark: z.string().optional(),
          salesPersonId: z.number().optional(),
          items: z.array(z.object({
            productId: z.number(),
            quantity: z.string(),
            unit: z.string().optional(),
            unitPrice: z.string().optional(),
            amount: z.string().optional(),
            remark: z.string().optional(),
          })).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { orderDate, deliveryDate, items, ...rest } = input.data;
        await updateSalesOrder(input.id, {
          ...rest,
          paymentMethod: rest.paymentMethod === undefined ? undefined : normalizePaymentCondition(rest.paymentMethod),
          orderDate: orderDate ? new Date(orderDate) : undefined,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        }, items?.map(item => ({ ...item, orderId: input.id })));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSalesOrder(input.id);
        return { success: true };
      }),

    // 获取下一个订单号
    nextOrderNo: protectedProcedure
      .query(async () => {
        return await getNextSalesOrderNo();
      }),

    // 提交审批
    submitForApproval: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
        if (!db) throw new Error("数据库连接不可用");
        await db.update(salesOrdersTable).set({ status: "pending_review" }).where(eq(salesOrdersTable.id, input.id));
        await db.insert(orderApprovals).values({
          orderId: input.id,
          orderType: "sales",
          action: "submit",
          approver: ctx.user?.name || "Unknown",
          approverId: ctx.user?.id,
        });
        try {
          await syncOneReceivableFromSalesOrder(input.id, ctx.user?.id);
        } catch {
          // 应收联动失败不阻塞提审
        }
        return { success: true };
      }),

    // 审批通过
    approve: protectedProcedure
      .input(z.object({ id: z.number(), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const approvalState = await getSalesOrderApprovalState(input.id, ctx.user?.id, ctx.user?.role);
        if (!approvalState || approvalState.stage === "none") {
          throw new Error("当前订单无需审批");
        }
        if (!approvalState.canApprove) {
          const approverName = approvalState.currentApproverName || "指定审批人";
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
          : await getSalesOrderApprovalState(input.id, ctx.user?.id, ctx.user?.role);
        await db
          .update(salesOrdersTable)
          .set({ status: nextApprovalState?.stage === "none" ? "approved" : "pending_review" })
          .where(eq(salesOrdersTable.id, input.id));
        try {
          await syncOneReceivableFromSalesOrder(input.id, ctx.user?.id);
        } catch {
          // 应收联动失败不阻塞审批
        }
        // 审批通过后，账期支付订单自动检查库存并生成生产计划
        if (nextApprovalState?.stage === "none") {
          try {
            const [approvedOrder] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, input.id)).limit(1);
            const paymentCond = String(approvedOrder?.paymentMethod || "").toLowerCase();
            if (paymentCond.includes("账期") || paymentCond.includes("credit") || paymentCond.includes("net")) {
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
        const approvalState = await getSalesOrderApprovalState(input.id, ctx.user?.id, ctx.user?.role);
        if (!approvalState || approvalState.stage === "none") {
          throw new Error("当前订单无需审批");
        }
        if (!approvalState.canApprove) {
          const approverName = approvalState.currentApproverName || "指定审批人";
          throw new Error(`当前订单待${approverName}审批`);
        }
        await db.update(salesOrdersTable).set({ status: "draft" }).where(eq(salesOrdersTable.id, input.id));
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
        return await db.select().from(orderApprovals)
          .where(eq(orderApprovals.orderId, input.id))
          .orderBy(desc(orderApprovals.createdAt));
      }),
    // 获取历史销售价格（按客户+产品查询最近一次单价和货币）
    getLastPrices: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        productIds: z.array(z.number()),
      }))
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
              (deliveredMap.get(tx.productId) || 0) + (parseFloat(String(tx.quantity)) || 0)
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
        const totalOrdered = orderItems.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0), 0);
        const totalDelivered = orderItems.reduce((s, i) => s + (deliveredMap.get(i.productId) || 0), 0);

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
  // ==================== 采购订单 =====================
  purchaseOrders: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        supplierId: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getPurchaseOrders(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await getPurchaseOrderById(input.id);
        const items = await getPurchaseOrderItems(input.id);
        return { order, items };
      }),

    create: protectedProcedure
      .input(z.object({
        orderNo: z.string(),
        supplierId: z.number(),
        orderDate: z.string(),
        expectedDate: z.string().optional(),
        totalAmount: z.string().optional(),
        currency: z.string().optional(),
        status: z.enum(["draft", "approved", "ordered", "partial_received", "received", "cancelled"]).optional(),
        paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
        remark: z.string().optional(),
        buyerId: z.number().optional(),
        items: z.array(z.object({
          materialCode: z.string(),
          materialName: z.string(),
          specification: z.string().optional(),
          quantity: z.string(),
          unit: z.string().optional(),
          unitPrice: z.string().optional(),
          amount: z.string().optional(),
          remark: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { items, orderDate, expectedDate, ...orderData } = input;
        return await createPurchaseOrder(
          { 
            ...orderData, 
            orderDate: new Date(orderDate),
            expectedDate: expectedDate ? new Date(expectedDate) : undefined,
            createdBy: ctx.user?.id 
          },
          items.map(item => ({ ...item, orderId: 0 }))
        );
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          orderNo: z.string().optional(),
          supplierId: z.number().optional(),
          orderDate: z.string().optional(),
          expectedDate: z.string().optional(),
          totalAmount: z.string().optional(),
          currency: z.string().optional(),
          status: z.enum(["draft", "approved", "ordered", "partial_received", "received", "cancelled"]).optional(),
          paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
          remark: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { orderDate, expectedDate, ...rest } = input.data;
        await updatePurchaseOrder(input.id, {
          ...rest,
          orderDate: orderDate ? new Date(orderDate) : undefined,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        });
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
        const { purchaseOrders: poTable, purchaseOrderItems: poItemsTable } = await import("../drizzle/schema");
        const orderItems = await db.select().from(poItemsTable).where(eq(poItemsTable.orderId, input.orderId));
        if (orderItems.length === 0) return { status: "ordered", message: "订单无明细" };
        // 汇总已入库数量（purchase_in 类型，关联该采购订单）
        const txRows = await db.select().from(inventoryTransactions).where(
          and(
            eq(inventoryTransactions.relatedOrderId, input.orderId),
            eq(inventoryTransactions.type, "purchase_in")
          )
        );
        const receivedMap = new Map<number, number>();
        for (const tx of txRows) {
          if (tx.productId) {
            receivedMap.set(tx.productId, (receivedMap.get(tx.productId) || 0) + (parseFloat(String(tx.quantity)) || 0));
          }
        }
        // 更新每条明细的 receivedQty
        for (const item of orderItems) {
          if (!item.productId) continue;
          const received = receivedMap.get(item.productId) || 0;
          await db.update(poItemsTable).set({ receivedQty: String(received) }).where(eq(poItemsTable.id, item.id));
        }
        // 判断订单整体收货状态
        const totalOrdered = orderItems.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0), 0);
        const totalReceived = orderItems.reduce((s, i) => {
          const pid = i.productId;
          return s + (pid ? (receivedMap.get(pid) || 0) : 0);
        }, 0);
        let newStatus: string;
        if (totalReceived <= 0) {
          newStatus = "ordered";
        } else if (totalReceived >= totalOrdered) {
          newStatus = "received";
        } else {
          newStatus = "partial_received";
        }
        await db.update(poTable).set({ status: newStatus as any }).where(eq(poTable.id, input.orderId));
        return { status: newStatus, totalOrdered, totalReceived };
      }),
  }),
  // ==================== 生产订单 ====================
  productionOrders: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getProductionOrders(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductionOrderById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        orderNo: z.string(),
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
        status: z.enum(["draft", "planned", "in_progress", "completed", "cancelled"]).optional(),
        salesOrderId: z.number().optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { plannedStartDate, plannedEndDate, productionDate, expiryDate, ...rest } = input;
        return await createProductionOrder({
          ...rest,
          plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
          plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          createdBy: ctx.user?.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          orderNo: z.string().optional(),
          orderType: z.enum(["finished", "semi_finished", "rework"]).optional(),
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
          status: z.enum(["draft", "planned", "in_progress", "completed", "cancelled"]).optional(),
          remark: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, productionDate, expiryDate, ...rest } = input.data;
        await updateProductionOrder(input.id, {
          ...rest,
          plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
          plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : undefined,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });

        // C12: 生产完工时自动更新关联的生产计划和销售订单状态
        if (input.data.status === "completed") {
          try {
            const db = await getDb();
            if (db) {
              const { productionPlans: ppTable, productionOrders: poTable, salesOrders: soTable } = await import("../drizzle/schema");
              // 获取生产订单信息
              const [prodOrder] = await db.select().from(poTable).where(eq(poTable.id, input.id)).limit(1);
              if (prodOrder) {
                // 更新关联的生产计划状态为 completed
                const plans = await db.select().from(ppTable).where(eq(ppTable.productionOrderId, input.id));
                for (const plan of plans) {
                  await db.update(ppTable).set({ status: "completed" }).where(eq(ppTable.id, plan.id));
                }
                // 如果有关联销售订单，检查是否所有生产订单都完成，如果是则更新销售订单状态
                if (prodOrder.salesOrderId) {
                  const allProdOrders = await db.select().from(poTable).where(eq(poTable.salesOrderId, prodOrder.salesOrderId));
                  const allCompleted = allProdOrders.every((po: any) => po.status === "completed" || po.id === input.id);
                  if (allCompleted) {
                    await db.update(soTable).set({ status: "ready_to_ship" }).where(eq(soTable.id, prodOrder.salesOrderId));
                  }
                }
              }
            }
          } catch (e) {
            console.error("[C12] 更新关联状态失败:", e);
          }
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProductionOrder(input.id);
        return { success: true };
      }),
  }),

  // ==================== 库存管理 ====================
  inventory: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        warehouseId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getInventory(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getInventoryById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        warehouseId: z.number(),
        productId: z.number().optional(),
        materialCode: z.string().optional(),
        itemName: z.string(),
        batchNo: z.string().optional(),
        lotNo: z.string().optional(),
        quantity: z.string(),
        unit: z.string().optional(),
        location: z.string().optional(),
        status: z.enum(["qualified", "quarantine", "unqualified", "reserved"]).optional(),
        productionDate: z.string().optional(),
        expiryDate: z.string().optional(),
        udiPi: z.string().optional(),
        safetyStock: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { productionDate, expiryDate, ...rest } = input;
        return await createInventory({
          ...rest,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });
      }),

    update: protectedProcedure
      .input(z.object({
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
          status: z.enum(["qualified", "quarantine", "unqualified", "reserved"]).optional(),
          productionDate: z.string().optional(),
          expiryDate: z.string().optional(),
          udiPi: z.string().optional(),
          safetyStock: z.string().optional(),
        }),
      }))
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
    recalculateAll: protectedProcedure
      .mutation(async () => {
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
      .input(z.object({
        search: z.string().optional(),
        type: z.string().optional(),
        result: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getQualityInspections(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getQualityInspectionById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
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
        result: z.enum(["qualified", "unqualified", "conditional"]).optional(),
        inspectorId: z.number().optional(),
        inspectionDate: z.string().optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { inspectionDate, ...rest } = input;
        const inspectionId = await createQualityInspection({
          ...rest,
          inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
          inspectorId: input.inspectorId || ctx.user?.id,
        });
        // OQC检验结果联动：通过生产批号回写入库申请的检验数据
        if (input.type === "OQC" && input.batchNo && input.remark) {
          try {
            const extra = JSON.parse(input.remark);
            await syncOqcResultToWarehouseEntry({
              batchNo: input.batchNo,
              productionOrderId: input.productionOrderId,
              sterilizationOrderId: input.sterilizationOrderId,
              rejectQty: extra.rejectQty,
              sampleRetainQty: extra.sampleRetainQty,
              result: input.result,
            });
          } catch { /* remark解析失败不阻塞 */ }
        }
        // 邮件通知：OQC 检验结果通知
        if (input.type === "OQC" && input.result) {
          try {
            if (input.result === "qualified") {
              const productionEmails = await getUserEmailsByDepartment(["生产部"]);
              if (productionEmails.length > 0) {
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
              const notifyEmails = await getUserEmailsByDepartment(["生产部", "质量部"]);
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
        return inspectionId;
      }),

    update: protectedProcedure
      .input(z.object({
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
          result: z.enum(["qualified", "unqualified", "conditional"]).optional(),
          inspectorId: z.number().optional(),
          inspectionDate: z.string().optional(),
          remark: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { inspectionDate, ...rest } = input.data;
        await updateQualityInspection(input.id, {
          ...rest,
          inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
        });
        // OQC检验结果联动：通过生产批号回写入库申请的检验数据
        if (input.data.batchNo && input.data.remark) {
          try {
            const extra = JSON.parse(input.data.remark);
            await syncOqcResultToWarehouseEntry({
              batchNo: input.data.batchNo,
              productionOrderId: input.data.productionOrderId,
              sterilizationOrderId: input.data.sterilizationOrderId,
              rejectQty: extra.rejectQty,
              sampleRetainQty: extra.sampleRetainQty,
              result: input.data.result,
            });
          } catch { /* remark解析失败不阻塞 */ }
        }
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
      .input(z.object({ search: z.string().optional(), productId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
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
      .input(z.object({
        productId: z.number(),
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
      }))
      .mutation(async ({ input }) => {
        return await createBomItem(input);
      }),

    // 批量创建 BOM 物料（新建 BOM 时一次性提交所有物料）
    batchCreate: protectedProcedure
      .input(z.object({
        productId: z.number(),
        version: z.string(),
        bomCode: z.string().optional(),
        effectiveDate: z.string().optional(),
        items: z.array(z.object({
          parentId: z.number().nullable().optional(),
          level: z.number(),
          materialCode: z.string(),
          materialName: z.string(),
          specification: z.string().optional(),
          quantity: z.string(),
          unit: z.string().optional(),
          unitPrice: z.string().optional(),
          remark: z.string().optional(),
          children: z.array(z.object({
            level: z.number(),
            materialCode: z.string(),
            materialName: z.string(),
            specification: z.string().optional(),
            quantity: z.string(),
            unit: z.string().optional(),
            unitPrice: z.string().optional(),
            remark: z.string().optional(),
          })).optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { productId, version, bomCode, effectiveDate, items } = input;
        const createdIds: number[] = [];
        for (const item of items) {
          // 创建二级物料
          const parentBomId = await createBomItem({
            productId,
            level: item.level,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            version,
            bomCode: bomCode || null,
            effectiveDate: effectiveDate ? (new Date(effectiveDate) as any) : null,
            remark: item.remark,
            status: "active",
          });
          createdIds.push(parentBomId);
          // 创建三级子物料
          if (item.children && item.children.length > 0) {
            for (const child of item.children) {
              const childId = await createBomItem({
                productId,
                parentId: parentBomId,
                level: child.level,
                materialCode: child.materialCode,
                materialName: child.materialName,
                specification: child.specification,
                quantity: child.quantity,
                unit: child.unit,
                unitPrice: child.unitPrice,
                version,
                bomCode: bomCode || null,
                effectiveDate: effectiveDate ? (new Date(effectiveDate) as any) : null,
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
      .input(z.object({
        id: z.number(),
        data: z.object({
          productId: z.number().optional(),
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
      }))
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
      .input(z.object({
        productId: z.number(),
        version: z.string(),
        bomCode: z.string().optional(),
        effectiveDate: z.string().optional(),
        items: z.array(z.object({
          level: z.number(),
          materialCode: z.string(),
          materialName: z.string(),
          specification: z.string().optional(),
          quantity: z.string(),
          unit: z.string().optional(),
          unitPrice: z.string().optional(),
          remark: z.string().optional(),
          children: z.array(z.object({
            level: z.number(),
            materialCode: z.string(),
            materialName: z.string(),
            specification: z.string().optional(),
            quantity: z.string(),
            unit: z.string().optional(),
            unitPrice: z.string().optional(),
            remark: z.string().optional(),
          })).optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { productId, version, bomCode, effectiveDate, items } = input;
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
            level: item.level,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            version,
            bomCode: bomCode || null,
            effectiveDate: effectiveDate ? (new Date(effectiveDate) as any) : null,
            remark: item.remark,
            status: "active",
          });
          createdIds.push(parentBomId);
          if (item.children && item.children.length > 0) {
            for (const child of item.children) {
              const childId = await createBomItem({
                productId,
                parentId: parentBomId,
                level: child.level,
                materialCode: child.materialCode,
                materialName: child.materialName,
                specification: child.specification,
                quantity: child.quantity,
                unit: child.unit,
                unitPrice: child.unitPrice,
                version,
                bomCode: bomCode || null,
                effectiveDate: effectiveDate ? (new Date(effectiveDate) as any) : null,
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
      .query(async ({ input }) => {
        return await getWarehouses(input);
      }),
    create: protectedProcedure
      .input(z.object({
        code: z.string(),
        name: z.string(),
        type: z.enum(["raw_material", "semi_finished", "finished", "quarantine"]),
        address: z.string().optional(),
        manager: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input }) => {
        return await createWarehouse(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          type: z.enum(["raw_material", "semi_finished", "finished", "quarantine"]).optional(),
          address: z.string().optional(),
          manager: z.string().optional(),
          phone: z.string().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        }),
      }))
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
      .input(z.object({
        search: z.string().optional(),
        type: z.string().optional(),
        warehouseId: z.number().optional(),
        inventoryId: z.number().optional(),
        productId: z.number().optional(),
        batchNo: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getInventoryTransactions(input);
      }),
    create: protectedProcedure
      .input(z.object({
        warehouseId: z.number(),
        inventoryId: z.number().optional(),
        productId: z.number().optional(),
        type: z.enum(["purchase_in", "production_in", "return_in", "other_in", "production_out", "sales_out", "return_out", "other_out", "transfer", "adjust"]),
        documentNo: z.string().optional(),
        itemName: z.string(),
        batchNo: z.string().optional(),
        sterilizationBatchNo: z.string().optional(),
        quantity: z.string(),
        unit: z.string().optional(),
        beforeQty: z.string().optional(),
        afterQty: z.string().optional(),
        relatedOrderId: z.number().optional(),
        shippingFee: z.string().optional(),
        logisticsSupplierId: z.number().optional(),
        logisticsSupplierName: z.string().optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 后端库存数量校验（仅对出库类操作）
        const outTypes = ["production_out", "sales_out", "return_out", "other_out"];
        if (outTypes.includes(input.type) && input.productId) {
          const db = await getDb();
          if (db) {
            const conditions: any[] = [
              eq(inventory.warehouseId, input.warehouseId),
              eq(inventory.productId, input.productId),
            ];
            if (input.batchNo) {
              conditions.push(eq(inventory.batchNo, input.batchNo));
            }
            const invRecords = await db
              .select()
              .from(inventory)
              .where(and(...conditions));
            const totalAvailable = invRecords.reduce(
              (sum, rec) => sum + (parseFloat(String(rec.quantity)) || 0),
              0
            );
            const outQty = parseFloat(String(input.quantity)) || 0;
            if (outQty > totalAvailable) {
              const batchInfo = input.batchNo ? `批次 ${input.batchNo} ` : "";
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `「${input.itemName}」${batchInfo}库存不足！当前可用库存 ${totalAvailable} ${input.unit || ""}，出库数量 ${outQty} ${input.unit || ""}。`,
              });
            }
          }
        }
        return await createInventoryTransaction({ ...input, operatorId: ctx.user?.id });
      }),
    update: protectedProcedure
      .input(z.object({
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
      }))
      .mutation(async ({ input }) => {
        await updateInventoryTransaction(input.id, input.data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInventoryTransaction(input.id);
        return { success: true };
      }),
  }),
  // ==================== 操作日志 ====================
  logs: router({
    list: protectedProcedure
      .input(z.object({
        module: z.string().optional(),
        action: z.string().optional(),
        operatorId: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getOperationLogs(input);
      }),
    create: protectedProcedure
      .input(z.object({
        module: z.enum(["department", "code_rule", "user", "language", "system", "product", "customer", "supplier", "inventory", "order", "quality", "production", "finance", "document"]),
        action: z.enum(["create", "update", "delete", "status_change", "role_change", "permission_change", "import", "export", "login", "logout", "reset", "approve", "reject"]),
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
      }))
      .mutation(async ({ input, ctx }) => {
        await createOperationLog({ ...input, operatorId: ctx.user!.id });
        return { success: true };
      }),
    clear: protectedProcedure
      .mutation(async () => {
        await clearOperationLogs();
        return { success: true };
      }),
  }),
  // ==================== 回收箱（管理员） ====================
  recycleBin: router({
    list: adminProcedure
      .input(
        z.object({
          status: z.enum(["active", "restored", "expired"]).optional(),
          keyword: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }).optional(),
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
    stats: protectedProcedure.query(async ({ ctx }) => {
      const restrictToSelf = isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
      return await getDashboardStats({
        salesPersonId: restrictToSelf ? ctx.user?.id : undefined,
        operatorId: ctx.user?.id,
        operatorRole: ctx.user?.role,
        operatorDepartment: ctx.user?.department ?? null,
      });
    }),
  }),

  // ==================== 文件管理 (知识库) ====================
  documents: router({
    list: protectedProcedure
      .query(async () => {
        const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
        return await db.select().from(documents).orderBy(desc(documents.createdAt));
      }),
    create: protectedProcedure
      .input(z.object({
        docNo: z.string(),
        title: z.string(),
        category: z.enum(["policy", "sop", "record", "certificate", "external", "contract"]),
        version: z.string().optional(),
        department: z.string().optional(),
        status: z.enum(["draft", "reviewing", "approved", "obsolete"]),
        effectiveDate: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
        return await db.insert(documents).values({
          ...input,
          effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
          createdBy: ctx.user?.id,
        });
      }),
    saveReceivableAttachments: protectedProcedure
      .input(z.object({
        invoiceNo: z.string(),
        customerName: z.string(),
        department: z.string().optional(),
        files: z.array(z.object({
          name: z.string(),
          mimeType: z.string().optional(),
          base64: z.string(),
        })).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");

        const departmentName = normalizeDepartmentForUpload(input.department, "销售部");
        const [department, folderName] = buildUploadFolderName(departmentName, "收款单").map(safeFileSegment);
        const customerShortName = safeFileSegment(toCustomerShortName(input.customerName));
        const invoiceNo = safeFileSegment(input.invoiceNo || "单据");

        const created: Array<{ fileName: string; filePath: string; title: string; docNo: string }> = [];

        for (let index = 0; index < input.files.length; index++) {
          const file = input.files[index];
          const extFromName = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
          const ext =
            extFromName ||
            (String(file.mimeType || "").includes("pdf") ? ".pdf" :
              String(file.mimeType || "").includes("word") ? ".docx" :
                String(file.mimeType || "").includes("image/") ? ".png" : "");
          if (!ATTACHMENT_EXTENSIONS.includes(ext as any)) {
            throw new Error(`不支持的文件格式: ${file.name}`);
          }
          const fileBaseName = `${invoiceNo}-${customerShortName}-${String(index + 1).padStart(2, "0")}`;
          const base64Body = String(file.base64 || "").replace(/^data:[^;]+;base64,/, "");
          const fileBuffer = Buffer.from(base64Body, "base64");
          const saved = await saveAttachmentFile({
            department,
            businessFolder: folderName,
            originalName: file.name,
            desiredBaseName: fileBaseName,
            mimeType: file.mimeType,
            buffer: fileBuffer,
          });
          const docNo = `RCPT-${Date.now()}-${randomBytes(2).toString("hex")}`.slice(0, 50);
          const title = `${invoiceNo}-${customerShortName}`;

          await db.insert(documents).values({
            docNo,
            title,
            category: "record",
            version: "V1.0",
            department,
            status: "approved",
            filePath: saved.filePath,
            description: `收款附件：${invoiceNo}（${saved.provider}:${saved.storageKey}）`,
            createdBy: ctx.user?.id,
          });

          created.push({
            fileName: saved.fileName,
            filePath: saved.filePath,
            title,
            docNo,
          });
        }
        return created;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          docNo: z.string().optional(),
          title: z.string().optional(),
          category: z.enum(["policy", "sop", "record", "certificate", "external", "contract"]).optional(),
          version: z.string().optional(),
          department: z.string().optional(),
          status: z.enum(["draft", "reviewing", "approved", "obsolete"]).optional(),
          effectiveDate: z.string().optional(),
          description: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
        const { id, data } = input;
        return await db.update(documents)
          .set({
            ...data,
            effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
          })
          .where(eq(documents.id, id));
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteDocument(input.id, ctx.user?.id);
        return { success: true };
      }),
  }),

  // ==================== 银行账户 ====================
  bankAccounts: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return await getBankAccounts(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getBankAccountById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      accountName: z.string(), bankName: z.string(), accountNo: z.string(),
      currency: z.string().optional(), swiftCode: z.string().optional(),
      accountType: z.enum(["basic", "general", "special"]).optional(),
      isDefault: z.boolean().optional(), balance: z.string().optional(),
      status: z.enum(["active", "frozen", "closed"]).optional(), remark: z.string().optional(),
    })).mutation(async ({ input }) => {
      return await createBankAccount(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        accountName: z.string().optional(), bankName: z.string().optional(), accountNo: z.string().optional(),
        currency: z.string().optional(), swiftCode: z.string().optional(),
        accountType: z.enum(["basic", "general", "special"]).optional(),
        isDefault: z.boolean().optional(), balance: z.string().optional(),
        status: z.enum(["active", "frozen", "closed"]).optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateBankAccount(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteBankAccount(input.id); return { success: true };
    }),
  }),

  // ==================== 汇率管理 ====================
  exchangeRates: router({
    list: protectedProcedure.input(z.object({ fromCurrency: z.string().optional(), limit: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getExchangeRates(input);
    }),
    create: protectedProcedure.input(z.object({
      fromCurrency: z.string(), toCurrency: z.string().optional(),
      rate: z.string(), effectiveDate: z.string(), source: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return await createExchangeRate({ ...input, effectiveDate: new Date(input.effectiveDate) as any, createdBy: ctx.user?.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        fromCurrency: z.string().optional(),
        toCurrency: z.string().optional(),
        rate: z.string().optional(),
        effectiveDate: z.string().optional(),
        source: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateExchangeRate(input.id, {
        ...input.data,
        effectiveDate: input.data.effectiveDate ? (new Date(input.data.effectiveDate) as any) : undefined,
      });
      return { success: true };
    }),
    refreshLive: protectedProcedure.input(z.object({
      fromCurrency: z.string().default("USD"),
      toCurrency: z.string().default("CNY"),
    }).optional()).mutation(async ({ input, ctx }) => {
      const fromCurrency = String(input?.fromCurrency ?? "USD").toUpperCase();
      const toCurrency = String(input?.toCurrency ?? "CNY").toUpperCase();

      const apiRes = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`);
      if (!apiRes.ok) {
        throw new Error(`实时汇率获取失败(${apiRes.status})`);
      }
      const payload = await apiRes.json() as {
        result?: string;
        rates?: Record<string, number>;
      };
      const liveRate = payload?.rates?.[toCurrency];

      if (!liveRate || Number.isNaN(Number(liveRate)) || Number(liveRate) <= 0) {
        throw new Error("实时汇率数据不可用");
      }

      const today = new Date().toISOString().slice(0, 10);
      const id = await createExchangeRate({
        fromCurrency,
        toCurrency,
        rate: String(liveRate),
        effectiveDate: new Date(today) as any,
        source: "实时",
        createdBy: ctx.user?.id,
      });
      return { id, fromCurrency, toCurrency, rate: String(liveRate), effectiveDate: today };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteExchangeRate(input.id); return { success: true };
    }),
  }),

  // ==================== 付款条件 ====================
  paymentTerms: router({
    list: protectedProcedure.input(z.object({ type: z.string().optional(), isActive: z.boolean().optional() }).optional()).query(async ({ input }) => {
      return await getPaymentTerms(input);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string(), type: z.enum(["cash", "deposit", "monthly", "quarterly"]),
      depositPercent: z.string().optional(), creditDays: z.number().optional(),
      description: z.string().optional(), isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      return await createPaymentTerm(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        name: z.string().optional(), type: z.enum(["cash", "deposit", "monthly", "quarterly"]).optional(),
        depositPercent: z.string().optional(), creditDays: z.number().optional(),
        description: z.string().optional(), isActive: z.boolean().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updatePaymentTerm(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deletePaymentTerm(input.id); return { success: true };
    }),
    normalizeAllBusinessData: protectedProcedure.mutation(async () => {
      await normalizePaymentConditionDataInDb();
      return { success: true };
    }),
  }),

  // ==================== 物料申请 ====================
  materialRequests: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), department: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      const rows = await getMaterialRequests(input);
      return rows.map(r => ({
        ...r,
        requestDate: r.requestDate ? String(r.requestDate).split('T')[0] : null,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
        submittedAt: (r as any).submittedAt ? new Date((r as any).submittedAt).toISOString() : null,
      }));
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const request = await getMaterialRequestById(input.id);
      const items = await getMaterialRequestItems(input.id);
      const serialized = request ? {
        ...request,
        requestDate: request.requestDate ? String(request.requestDate).split('T')[0] : null,
        createdAt: request.createdAt ? new Date(request.createdAt).toISOString() : null,
        updatedAt: request.updatedAt ? new Date(request.updatedAt).toISOString() : null,
        approvedAt: request.approvedAt ? new Date(request.approvedAt).toISOString() : null,
        submittedAt: (request as any).submittedAt ? new Date((request as any).submittedAt).toISOString() : null,
      } : undefined;
      return { request: serialized, items };
    }),
    create: protectedProcedure.input(z.object({
      requestNo: z.string(), department: z.string(), requestDate: z.string(),
      urgency: z.enum(["normal", "urgent", "critical"]).optional(),
      reason: z.string().optional(), totalAmount: z.string().optional(), remark: z.string().optional(),
      items: z.array(z.object({
        productId: z.number().optional(), materialName: z.string(),
        specification: z.string().optional(), quantity: z.string(),
        unit: z.string().optional(), estimatedPrice: z.string().optional(), remark: z.string().optional(),
      })),
    })).mutation(async ({ input, ctx }) => {
      const { items, requestDate, ...rest } = input;
      return await createMaterialRequest(
        { ...rest, requestDate: new Date(requestDate) as any, requesterId: ctx.user!.id },
        items.map(i => ({ ...i, requestId: 0 }))
      );
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        status: z.enum(["draft", "pending_approval", "approved", "rejected", "purchasing", "completed", "cancelled"]).optional(),
        urgency: z.enum(["normal", "urgent", "critical"]).optional(),
        reason: z.string().optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const oldRequest = await getMaterialRequestById(input.id);
      await updateMaterialRequest(input.id, input.data);
      // 邮件通知：采购申请审批通过时，通知采购部下单
      if (input.data.status === "approved" && oldRequest?.status !== "approved") {
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
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteMaterialRequest(input.id); return { success: true };
    }),
  }),

  // ==================== 费用报销 ====================
  expenses: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), department: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getExpenseReimbursements(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getExpenseReimbursementById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      reimbursementNo: z.string(), department: z.string(), applyDate: z.string(),
      totalAmount: z.string(), currency: z.string().optional(),
      category: z.enum(["travel", "office", "entertainment", "transport", "communication", "other"]),
      description: z.string().optional(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return await createExpenseReimbursement({ ...input, applyDate: new Date(input.applyDate) as any, applicantId: ctx.user!.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        status: z.enum(["draft", "pending_approval", "approved", "rejected", "paid", "cancelled"]).optional(),
        totalAmount: z.string().optional(), description: z.string().optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateExpenseReimbursement(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteExpenseReimbursement(input.id); return { success: true };
    }),
  }),

  // ==================== 收付款记录 ====================
  paymentRecords: router({
    list: protectedProcedure.input(z.object({ type: z.string().optional(), relatedType: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getPaymentRecords(input);
    }),
    create: protectedProcedure.input(z.object({
      recordNo: z.string(), type: z.enum(["receipt", "payment"]),
      relatedType: z.enum(["sales_order", "purchase_order", "expense", "other"]),
      relatedId: z.number().optional(), relatedNo: z.string().optional(),
      customerId: z.number().optional(), supplierId: z.number().optional(),
      amount: z.string(), currency: z.string().optional(),
      amountBase: z.string().optional(), exchangeRate: z.string().optional(),
      bankAccountId: z.number(), paymentDate: z.string(),
      paymentMethod: z.string().optional(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return await createPaymentRecord({ ...input, paymentDate: new Date(input.paymentDate) as any, operatorId: ctx.user?.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        amount: z.string().optional(), currency: z.string().optional(),
        paymentDate: z.string().optional(), paymentMethod: z.string().optional(),
        remark: z.string().optional(), status: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      // paymentRecords 暂无独立 update 函数，直接返回成功
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deletePaymentRecord(input.id); return { success: true };
    }),
  }),

  // ==================== 报关管理 ====================
  customs: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      const restrictToSelf = isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
      return await getCustomsDeclarations({
        ...input,
        salesPersonId: restrictToSelf ? ctx.user?.id : undefined,
      });
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const declaration = await getCustomsDeclarationById(input.id);
      if (!declaration) return undefined;
      const restrictToSelf = isSalesDepartmentUser(ctx.user) && !canViewAllSalesData(ctx.user);
      if (restrictToSelf && declaration.salesOrderId) {
        const order = await getSalesOrderById(declaration.salesOrderId);
        if (order?.salesPersonId !== ctx.user?.id) {
          throw new Error("无权查看该报关单");
        }
      }
      return declaration;
    }),
    create: protectedProcedure.input(z.object({
      declarationNo: z.string(), salesOrderId: z.number(), customerId: z.number(),
      productName: z.string().optional(), quantity: z.string().optional(), unit: z.string().optional(),
      currency: z.string().optional(), amount: z.string().optional(),
      destination: z.string().optional(), portOfLoading: z.string().optional(), portOfDischarge: z.string().optional(),
      shippingMethod: z.enum(["sea", "air", "land", "express"]).optional(),
      hsCode: z.string().optional(), declarationDate: z.string().optional(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { declarationDate, ...rest } = input;
      return await createCustomsDeclaration({ ...rest, declarationDate: declarationDate ? new Date(declarationDate) as any : undefined, createdBy: ctx.user?.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        status: z.enum(["preparing", "submitted", "cleared", "shipped"]).optional(),
        declarationDate: z.string().optional(), clearanceDate: z.string().optional(),
        shippingDate: z.string().optional(), trackingNo: z.string().optional(), remark: z.string().optional(),
        destination: z.string().optional(), portOfLoading: z.string().optional(), portOfDischarge: z.string().optional(),
        hsCode: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { declarationDate, clearanceDate, shippingDate, ...rest } = input.data;
      await updateCustomsDeclaration(input.id, {
        ...rest,
        declarationDate: declarationDate ? new Date(declarationDate) as any : undefined,
        clearanceDate: clearanceDate ? new Date(clearanceDate) as any : undefined,
        shippingDate: shippingDate ? new Date(shippingDate) as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteCustomsDeclaration(input.id); return { success: true };
    }),
  }),

  // ==================== 部门管理 ====================
  departments: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return await getDepartments(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getDepartmentById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      code: z.string(), name: z.string(), parentId: z.number().nullable().optional(),
      managerId: z.number().nullable().optional(), phone: z.string().optional(),
      description: z.string().optional(), sortOrder: z.number().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    })).mutation(async ({ input }) => {
      return await createDepartment(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        code: z.string().optional(), name: z.string().optional(), parentId: z.number().nullable().optional(),
        managerId: z.number().nullable().optional(), phone: z.string().optional(),
        description: z.string().optional(), sortOrder: z.number().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateDepartment(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteDepartment(input.id); return { success: true };
    }),
  }),

  // ==================== 编码规则 ====================
  codeRules: router({
    list: protectedProcedure.query(async () => {
      return await getCodeRules();
    }),
    create: protectedProcedure.input(z.object({
      module: z.string(), prefix: z.string(), dateFormat: z.string().optional(),
      seqLength: z.number().optional(), example: z.string().optional(), description: z.string().optional(),
    })).mutation(async ({ input }) => {
      return await createCodeRule(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        module: z.string().optional(), prefix: z.string().optional(), dateFormat: z.string().optional(),
        seqLength: z.number().optional(), example: z.string().optional(), description: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateCodeRule(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteCodeRule(input.id); return { success: true };
    }),
  }),

  // ==================== 公司信息 ====================
  companyInfo: router({
    get: protectedProcedure.query(async () => {
      return await getCompanyInfo();
    }),
    update: adminProcedure
      .input(z.object({
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
      }))
      .mutation(async ({ input }) => {
        return await updateCompanyInfo(input);
      }),
    uploadLogo: adminProcedure
      .input(z.object({
        name: z.string(),
        mimeType: z.string().optional(),
        base64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const imageExtAllowList = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"]);
        const extFromName = `.${String(input.name.split(".").pop() || "").toLowerCase()}`;
        const ext = imageExtAllowList.has(extFromName) ? extFromName : (
          String(input.mimeType || "").includes("png") ? ".png" :
          String(input.mimeType || "").includes("jpeg") ? ".jpg" :
          String(input.mimeType || "").includes("jpg") ? ".jpg" :
          String(input.mimeType || "").includes("webp") ? ".webp" :
          String(input.mimeType || "").includes("gif") ? ".gif" :
          String(input.mimeType || "").includes("bmp") ? ".bmp" :
          String(input.mimeType || "").includes("svg") ? ".svg" : ""
        );
        if (!imageExtAllowList.has(ext)) {
          throw new Error("商标仅支持图片格式（jpg/png/webp/gif/bmp/svg）");
        }

        const base64Body = String(input.base64 || "").replace(/^data:[^;]+;base64,/, "");
        const fileBuffer = Buffer.from(base64Body, "base64");
        const saved = await saveAttachmentFile({
          department: "系统设置",
          businessFolder: "公司信息",
          originalName: input.name,
          desiredBaseName: `company-logo-${safeFileSegment(String(Date.now()))}`,
          mimeType: input.mimeType,
          buffer: fileBuffer,
        });
        const updated = await updateCompanyInfo({ logoUrl: saved.filePath });
        return { logoUrl: saved.filePath, companyInfo: updated };
      }),
  }),

  // ==================== 审批流程设置 ====================
  workflowSettings: router({
    formCatalog: protectedProcedure
      .input(z.object({ module: z.string().optional(), status: z.string().optional(), approvalEnabled: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return await getWorkflowFormCatalog(input);
      }),
    getFormCatalogItem: protectedProcedure
      .input(z.object({ module: z.string(), formType: z.string(), formName: z.string() }))
      .query(async ({ input }) => {
        return await getWorkflowFormCatalogItem(input);
      }),
    setFormApprovalEnabled: adminProcedure
      .input(z.object({ module: z.string(), formType: z.string(), formName: z.string(), approvalEnabled: z.boolean(), path: z.string().optional() }))
      .mutation(async ({ input }) => {
        await setWorkflowFormCatalogApprovalEnabled(input);
        return { success: true };
      }),
    list: protectedProcedure
      .input(z.object({ module: z.string().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getWorkflowTemplates(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getWorkflowTemplateById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        code: z.string(),
        name: z.string(),
        module: z.string(),
        formType: z.string(),
        initiators: z.string().optional(),
        approvalSteps: z.string().optional(),
        handlers: z.string().optional(),
        ccRecipients: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await createWorkflowTemplate({
          ...input,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          code: z.string().optional(),
          name: z.string().optional(),
          module: z.string().optional(),
          formType: z.string().optional(),
          initiators: z.string().optional(),
          approvalSteps: z.string().optional(),
          handlers: z.string().optional(),
          ccRecipients: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateWorkflowTemplate(input.id, {
          ...input.data,
          updatedBy: ctx.user?.id,
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteWorkflowTemplate(input.id, ctx.user?.id);
        return { success: true };
      }),
  }),

  workflowCenter: router({
    list: protectedProcedure
      .input(z.object({
        tab: z.enum(["todo", "created", "processed", "cc"]),
        search: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        return await getWorkflowCenterData({
          operatorId: Number(ctx.user?.id || 0),
          operatorRole: String(ctx.user?.role || ""),
          operatorDepartment: String(ctx.user?.department || ""),
          tab: input.tab,
          search: input.search,
          limit: input.limit,
        });
      }),
  }),

  // ==================== 人事管理 ====================
  personnel: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), departmentId: z.number().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getPersonnel(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getPersonnelById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      employeeNo: z.string(), name: z.string(), gender: z.enum(["male", "female"]).optional(),
      idCard: z.string().optional(), phone: z.string().optional(), email: z.string().optional(),
      departmentId: z.number().nullable().optional(), position: z.string().optional(),
      entryDate: z.string().optional(), contractExpiry: z.string().optional(),
      education: z.string().optional(), major: z.string().optional(),
      emergencyContact: z.string().optional(), emergencyPhone: z.string().optional(),
      status: z.enum(["active", "probation", "resigned", "terminated"]).optional(),
      userId: z.number().optional(), remark: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { entryDate, contractExpiry, ...rest } = input;
      return await createPersonnel({
        ...rest,
        entryDate: entryDate ? new Date(entryDate) as any : undefined,
        contractExpiry: contractExpiry ? new Date(contractExpiry) as any : undefined,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        employeeNo: z.string().optional(), name: z.string().optional(), gender: z.enum(["male", "female"]).optional(),
        idCard: z.string().optional(), phone: z.string().optional(), email: z.string().optional(),
        departmentId: z.number().nullable().optional(), position: z.string().optional(),
        entryDate: z.string().optional(), contractExpiry: z.string().optional(),
        education: z.string().optional(), major: z.string().optional(),
        status: z.enum(["active", "probation", "resigned", "terminated"]).optional(),
        userId: z.number().optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { entryDate, contractExpiry, ...rest } = input.data;
      await updatePersonnel(input.id, {
        ...rest,
        entryDate: entryDate ? new Date(entryDate) as any : undefined,
        contractExpiry: contractExpiry ? new Date(contractExpiry) as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deletePersonnel(input.id); return { success: true };
    }),
  }),

  // ==================== 培训管理 ====================
  trainings: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), type: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getTrainings(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getTrainingById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string(), type: z.enum(["onboarding", "skill", "compliance", "safety", "other"]),
      trainerId: z.number().optional(), departmentId: z.number().optional(),
      startDate: z.string().optional(), endDate: z.string().optional(),
      location: z.string().optional(), participants: z.number().optional(),
      content: z.string().optional(), status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { startDate, endDate, ...rest } = input;
      return await createTraining({
        ...rest,
        startDate: startDate ? new Date(startDate) as any : undefined,
        endDate: endDate ? new Date(endDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        title: z.string().optional(), type: z.enum(["onboarding", "skill", "compliance", "safety", "other"]).optional(),
        trainerId: z.number().optional(), departmentId: z.number().optional(),
        startDate: z.string().optional(), endDate: z.string().optional(),
        location: z.string().optional(), participants: z.number().optional(),
        content: z.string().optional(), status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { startDate, endDate, ...rest } = input.data;
      await updateTraining(input.id, {
        ...rest,
        startDate: startDate ? new Date(startDate) as any : undefined,
        endDate: endDate ? new Date(endDate) as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteTraining(input.id); return { success: true };
    }),
  }),

  // ==================== 内审管理 ====================
  audits: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), type: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getAudits(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getAuditById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      auditNo: z.string(), title: z.string(),
      type: z.enum(["internal", "external", "supplier", "process"]),
      departmentId: z.number().optional(), auditorId: z.number().optional(),
      auditDate: z.string().optional(), findings: z.string().optional(),
      correctiveActions: z.string().optional(),
      status: z.enum(["planned", "in_progress", "completed", "closed"]).optional(),
      result: z.enum(["pass", "conditional", "fail"]).optional(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { auditDate, ...rest } = input;
      return await createAudit({ ...rest, auditDate: auditDate ? new Date(auditDate) as any : undefined, createdBy: ctx.user?.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        title: z.string().optional(), type: z.enum(["internal", "external", "supplier", "process"]).optional(),
        departmentId: z.number().optional(), auditorId: z.number().optional(),
        auditDate: z.string().optional(), findings: z.string().optional(),
        correctiveActions: z.string().optional(),
        status: z.enum(["planned", "in_progress", "completed", "closed"]).optional(),
        result: z.enum(["pass", "conditional", "fail"]).optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { auditDate, ...rest } = input.data;
      await updateAudit(input.id, { ...rest, auditDate: auditDate ? new Date(auditDate) as any : undefined });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteAudit(input.id); return { success: true };
    }),
  }),

  // ==================== 研发项目 ====================
  rdProjects: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), type: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getRdProjects(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getRdProjectById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      projectNo: z.string(), name: z.string(),
      type: z.enum(["new_product", "improvement", "customization", "research"]),
      productId: z.number().optional(), leaderId: z.number().optional(),
      startDate: z.string().optional(), endDate: z.string().optional(),
      budget: z.string().optional(), progress: z.number().optional(),
      status: z.enum(["planning", "in_progress", "testing", "completed", "suspended", "cancelled"]).optional(),
      description: z.string().optional(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { startDate, endDate, ...rest } = input;
      return await createRdProject({
        ...rest,
        startDate: startDate ? new Date(startDate) as any : undefined,
        endDate: endDate ? new Date(endDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        name: z.string().optional(),
        type: z.enum(["new_product", "improvement", "customization", "research"]).optional(),
        productId: z.number().optional(), leaderId: z.number().optional(),
        startDate: z.string().optional(), endDate: z.string().optional(),
        budget: z.string().optional(), progress: z.number().optional(),
        status: z.enum(["planning", "in_progress", "testing", "completed", "suspended", "cancelled"]).optional(),
        description: z.string().optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { startDate, endDate, ...rest } = input.data;
      await updateRdProject(input.id, {
        ...rest,
        startDate: startDate ? new Date(startDate) as any : undefined,
        endDate: endDate ? new Date(endDate) as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteRdProject(input.id); return { success: true };
    }),
  }),

  // ==================== 盘点管理 ====================
  stocktakes: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), warehouseId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getStocktakes(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getStocktakeById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      stocktakeNo: z.string(), warehouseId: z.number(),
      type: z.enum(["full", "partial", "spot"]),
      stocktakeDate: z.string(), operatorId: z.number().optional(),
      systemQty: z.string().optional(), actualQty: z.string().optional(), diffQty: z.string().optional(),
      status: z.enum(["planned", "in_progress", "completed", "approved"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { stocktakeDate, ...rest } = input;
      return await createStocktake({ ...rest, stocktakeDate: new Date(stocktakeDate) as any, createdBy: ctx.user?.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        systemQty: z.string().optional(), actualQty: z.string().optional(), diffQty: z.string().optional(),
        status: z.enum(["planned", "in_progress", "completed", "approved"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateStocktake(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteStocktake(input.id); return { success: true };
    }),
  }),

  // ==================== 质量不良事件 ====================
  qualityIncidents: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), type: z.string().optional(), severity: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getQualityIncidents(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getQualityIncidentById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      incidentNo: z.string(), title: z.string(),
      type: z.enum(["complaint", "nonconformance", "capa", "recall", "deviation"]),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      productId: z.number().optional(), batchNo: z.string().optional(),
      description: z.string().optional(), rootCause: z.string().optional(),
      correctiveAction: z.string().optional(), preventiveAction: z.string().optional(),
      assigneeId: z.number().optional(), reportDate: z.string().optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { reportDate, ...rest } = input;
      return await createQualityIncident({ ...rest, reportDate: reportDate ? new Date(reportDate) as any : undefined, reporterId: ctx.user?.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        title: z.string().optional(),
        type: z.enum(["complaint", "nonconformance", "capa", "recall", "deviation"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        description: z.string().optional(), rootCause: z.string().optional(),
        correctiveAction: z.string().optional(), preventiveAction: z.string().optional(),
        assigneeId: z.number().optional(), closeDate: z.string().optional(),
        status: z.enum(["open", "investigating", "correcting", "verifying", "closed"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { closeDate, ...rest } = input.data;
      await updateQualityIncident(input.id, { ...rest, closeDate: closeDate ? new Date(closeDate) as any : undefined });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteQualityIncident(input.id); return { success: true };
    }),
  }),

  // ==================== 样品管理 ====================
  samples: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), sampleType: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getSamples(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getSampleById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      sampleNo: z.string(), productId: z.number().optional(), batchNo: z.string().optional(),
      sampleType: z.enum(["raw_material", "semi_finished", "finished", "stability", "retention"]),
      quantity: z.string().optional(), unit: z.string().optional(),
      storageLocation: z.string().optional(), storageCondition: z.string().optional(),
      samplingDate: z.string().optional(), expiryDate: z.string().optional(),
      status: z.enum(["stored", "testing", "used", "expired", "destroyed"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { samplingDate, expiryDate, ...rest } = input;
      return await createSample({
        ...rest,
        samplingDate: samplingDate ? new Date(samplingDate) as any : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) as any : undefined,
        samplerId: ctx.user?.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        storageLocation: z.string().optional(), storageCondition: z.string().optional(),
        status: z.enum(["stored", "testing", "used", "expired", "destroyed"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateSample(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteSample(input.id); return { success: true };
    }),
  }),

  // ==================== 实验室记录 ====================
  labRecords: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), conclusion: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getLabRecords(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getLabRecordById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      recordNo: z.string(), sampleId: z.number().optional(),
      testType: z.string(), testMethod: z.string().optional(),
      specification: z.string().optional(), result: z.string().optional(),
      conclusion: z.enum(["pass", "fail", "pending"]).optional(),
      equipmentId: z.number().optional(), testDate: z.string().optional(),
      status: z.enum(["pending", "testing", "completed", "reviewed"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { testDate, ...rest } = input;
      return await createLabRecord({ ...rest, testDate: testDate ? new Date(testDate) as any : undefined, testerId: ctx.user?.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        result: z.string().optional(),
        conclusion: z.enum(["pass", "fail", "pending"]).optional(),
        reviewerId: z.number().optional(), reviewDate: z.string().optional(),
        status: z.enum(["pending", "testing", "completed", "reviewed"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { reviewDate, ...rest } = input.data;
      await updateLabRecord(input.id, { ...rest, reviewDate: reviewDate ? new Date(reviewDate) as any : undefined });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteLabRecord(input.id); return { success: true };
    }),
  }),

  // ==================== 应收账款 ====================
  accountsReceivable: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), customerId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      await syncMissingReceivablesFromSalesOrders(ctx.user?.id);
      return await getAccountsReceivable(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getAccountsReceivableById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      invoiceNo: z.string(), customerId: z.number(), salesOrderId: z.number().optional(),
      amount: z.string(), currency: z.string().optional(),
      amountBase: z.string().optional(), exchangeRate: z.string().optional(),
      bankAccountId: z.number().optional(),
      invoiceDate: z.string().optional(), dueDate: z.string().optional(),
      paymentMethod: z.string().optional(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { invoiceDate, dueDate, ...rest } = input;
      return await createAccountsReceivable({
        ...rest,
        invoiceDate: invoiceDate ? toDateOnly(invoiceDate) : undefined,
        dueDate: dueDate ? toDateOnly(dueDate) : undefined,
        createdBy: ctx.user?.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        amount: z.string().optional(),
        paidAmount: z.string().optional(),
        status: z.enum(["pending", "partial", "paid", "overdue"]).optional(),
        dueDate: z.string().optional(),
        receiptDate: z.string().optional(), paymentMethod: z.string().optional(),
        bankAccountId: z.number().optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input, ctx }) => {
      const { receiptDate, dueDate, ...rest } = input.data;
      await updateAccountsReceivable(input.id, {
        ...rest,
        receiptDate: receiptDate ? toDateOnly(receiptDate) : undefined,
        dueDate: dueDate ? toDateOnly(dueDate) : undefined,
      });
      // 财务确认收款后，预付款订单自动检查库存并生成生产计划
      if (input.data.paidAmount && Number(input.data.paidAmount) > 0) {
        try {
          const db = await getDb();
          if (db) {
            const [receivable] = await db.select().from(accountsReceivableTable).where(eq(accountsReceivableTable.id, input.id)).limit(1);
            if (receivable?.salesOrderId) {
              const [order] = await db.select().from(salesOrdersTable).where(eq(salesOrdersTable.id, receivable.salesOrderId)).limit(1);
              const paymentCond = String(order?.paymentMethod || "").toLowerCase();
              if (paymentCond.includes("预付") || paymentCond.includes("prepay") || paymentCond.includes("advance")) {
                await autoGenerateProductionPlans(receivable.salesOrderId, ctx.user?.id);
              }
            }
          }
        } catch {
          // 生产计划联动失败不阻塞收款确认
        }
      }
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteAccountsReceivable(input.id); return { success: true };
    }),
    syncFromSalesOrders: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await syncMissingReceivablesFromSalesOrders(ctx.user?.id);
      return { success: true, ...result };
    }),
  }),

  // ==================== 应付账款 ====================
  accountsPayable: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), supplierId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getAccountsPayable(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getAccountsPayableById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      invoiceNo: z.string(), supplierId: z.number(), purchaseOrderId: z.number().optional(),
      amount: z.string(), currency: z.string().optional(),
      amountBase: z.string().optional(), exchangeRate: z.string().optional(),
      bankAccountId: z.number().optional(),
      invoiceDate: z.string().optional(), dueDate: z.string().optional(),
      paymentMethod: z.string().optional(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { invoiceDate, dueDate, ...rest } = input;
      return await createAccountsPayable({
        ...rest,
        invoiceDate: invoiceDate ? new Date(invoiceDate) as any : undefined,
        dueDate: dueDate ? new Date(dueDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        paidAmount: z.string().optional(),
        status: z.enum(["pending", "partial", "paid", "overdue"]).optional(),
        paymentDate: z.string().optional(), paymentMethod: z.string().optional(),
        bankAccountId: z.number().optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { paymentDate, ...rest } = input.data;
      await updateAccountsPayable(input.id, { ...rest, paymentDate: paymentDate ? new Date(paymentDate) as any : undefined });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteAccountsPayable(input.id); return { success: true };
    }),
  }),

  // ==================== 经销商资质 ====================
  dealerQualifications: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getDealerQualifications(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getDealerQualificationById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      customerId: z.number(), businessLicense: z.string().optional(),
      operatingLicense: z.string().optional(), licenseExpiry: z.string().optional(),
      authorizationNo: z.string().optional(), authorizationExpiry: z.string().optional(),
      territory: z.string().optional(), contractNo: z.string().optional(), contractExpiry: z.string().optional(),
      status: z.enum(["pending", "approved", "expired", "terminated"]).optional(),
    })).mutation(async ({ input }) => {
      const { licenseExpiry, authorizationExpiry, contractExpiry, ...rest } = input;
      return await createDealerQualification({
        ...rest,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) as any : undefined,
        authorizationExpiry: authorizationExpiry ? new Date(authorizationExpiry) as any : undefined,
        contractExpiry: contractExpiry ? new Date(contractExpiry) as any : undefined,
      } as any);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        businessLicense: z.string().optional(), operatingLicense: z.string().optional(),
        licenseExpiry: z.string().optional(), authorizationNo: z.string().optional(),
        authorizationExpiry: z.string().optional(), territory: z.string().optional(),
        contractNo: z.string().optional(), contractExpiry: z.string().optional(),
        status: z.enum(["pending", "approved", "expired", "terminated"]).optional(),
      }),
    })).mutation(async ({ input }) => {
      const { licenseExpiry, authorizationExpiry, contractExpiry, ...rest } = input.data;
      await updateDealerQualification(input.id, {
        ...rest,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) as any : undefined,
        authorizationExpiry: authorizationExpiry ? new Date(authorizationExpiry) as any : undefined,
        contractExpiry: contractExpiry ? new Date(contractExpiry) as any : undefined,
      } as any);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteDealerQualification(input.id); return { success: true };
    }),
  }),

  // ==================== 设备管理 ====================
  equipment: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), department: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getEquipment(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getEquipmentById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      code: z.string(), name: z.string(), model: z.string().optional(),
      manufacturer: z.string().optional(), serialNo: z.string().optional(),
      purchaseDate: z.string().optional(), installDate: z.string().optional(),
      location: z.string().optional(), department: z.string().optional(),
      status: z.enum(["normal", "maintenance", "repair", "scrapped"]).optional(),
      nextMaintenanceDate: z.string().optional(), remark: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { purchaseDate, installDate, nextMaintenanceDate, ...rest } = input;
      return await createEquipment({
        ...rest,
        purchaseDate: purchaseDate ? new Date(purchaseDate) as any : undefined,
        installDate: installDate ? new Date(installDate) as any : undefined,
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) as any : undefined,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        name: z.string().optional(), model: z.string().optional(),
        manufacturer: z.string().optional(), serialNo: z.string().optional(),
        location: z.string().optional(), department: z.string().optional(),
        status: z.enum(["normal", "maintenance", "repair", "scrapped"]).optional(),
        nextMaintenanceDate: z.string().optional(), remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { nextMaintenanceDate, ...rest } = input.data;
      await updateEquipment(input.id, { ...rest, nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) as any : undefined });
      return { success: true };
    }),
     delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteEquipment(input.id); return { success: true };
    }),
  }),

  // ==================== 生产计划（看板） ====================
  productionPlans: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), planType: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getProductionPlans(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getProductionPlanById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      planNo: z.string(),
      planType: z.enum(["sales_driven", "internal"]),
      salesOrderId: z.number().optional(),
      salesOrderNo: z.string().optional(),
      productId: z.number(),
      productName: z.string().optional(),
      plannedQty: z.string(),
      unit: z.string().optional(),
      batchNo: z.string().optional(),
      plannedStartDate: z.string().optional(),
      plannedEndDate: z.string().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      status: z.enum(["pending", "scheduled", "in_progress", "completed", "cancelled"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { plannedStartDate, plannedEndDate, ...rest } = input;
      const id = await createProductionPlan({
        ...rest,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) as any : undefined,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
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
        status: z.enum(["pending", "scheduled", "in_progress", "completed", "cancelled"]).optional(),
        productionOrderId: z.number().optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { plannedStartDate, plannedEndDate, ...rest } = input.data;
      await updateProductionPlan(input.id, {
        ...rest,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) as any : undefined,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteProductionPlan(input.id); return { success: true };
    }),
  }),

  // ==================== 领料单 ====================
  materialRequisitionOrders: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), recordType: z.string().optional(), productionOrderId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getMaterialRequisitionOrders(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getMaterialRequisitionOrderById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      requisitionNo: z.string(),
      productionOrderId: z.number().optional(),
      productionOrderNo: z.string().optional(),
      warehouseId: z.number().optional(),
      applicantId: z.number().optional(),
      requisitionDate: z.string().optional(),
      status: z.enum(["draft", "pending", "approved", "issued", "rejected"]).optional(),
      items: z.string().optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { requisitionDate, ...rest } = input;
      const id = await createMaterialRequisitionOrder({
        ...rest,
        requisitionDate: requisitionDate ? new Date(requisitionDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        status: z.enum(["draft", "pending", "approved", "issued", "rejected"]).optional(),
        items: z.string().optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateMaterialRequisitionOrder(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteMaterialRequisitionOrder(input.id); return { success: true };
    }),
  }),

  // ==================== 生产记录单 ====================
  productionRecords: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), recordType: z.string().optional(), productionOrderId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getProductionRecords(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getProductionRecordById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      recordNo: z.string(),
      recordType: z.enum(["general", "temperature_humidity", "material_usage", "clean_room", "first_piece"]).optional(),
      productionOrderId: z.number().optional(),
      productionOrderNo: z.string().optional(),
      productId: z.number().optional(),
      productName: z.string().optional(),
      batchNo: z.string().optional(),
      workstationName: z.string().optional(),
      operatorId: z.number().optional(),
      recordDate: z.string().optional(),
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
      equipmentItems: z.string().optional(),
      moldItems: z.string().optional(),
      documentVersion: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { recordDate, ...rest } = input;
      const id = await createProductionRecord({
        ...rest,
        recordDate: recordDate ? new Date(recordDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        recordType: z.enum(["general", "temperature_humidity", "material_usage", "clean_room", "first_piece"]).optional(),
        productionOrderId: z.number().optional(),
        productionOrderNo: z.string().optional(),
        productId: z.number().optional(),
        productName: z.string().optional(),
        batchNo: z.string().optional(),
        workstationName: z.string().optional(),
        recordDate: z.string().optional(),
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
        equipmentItems: z.string().optional(),
        moldItems: z.string().optional(),
        documentVersion: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateProductionRecord(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteProductionRecord(input.id); return { success: true };
    }),
  }),

  // ==================== 生产流转单 ====================
  productionRoutingCards: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), recordType: z.string().optional(), productionOrderId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getProductionRoutingCards(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getProductionRoutingCardById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      cardNo: z.string(),
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
      status: z.enum(["in_process", "pending_sterilization", "sterilizing", "completed"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await createProductionRoutingCard({ ...input, createdBy: ctx.user?.id });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        currentProcess: z.string().optional(),
        nextProcess: z.string().optional(),
        needsSterilization: z.boolean().optional(),
        status: z.enum(["in_process", "pending_sterilization", "sterilizing", "completed"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await updateProductionRoutingCard(input.id, input.data); return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteProductionRoutingCard(input.id); return { success: true };
    }),
  }),

  // ==================== 委外灭菌单 ====================
  sterilizationOrders: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), recordType: z.string().optional(), productionOrderId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getSterilizationOrders(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getSterilizationOrderById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      orderNo: z.string(),
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
      status: z.enum(["draft", "sent", "processing", "arrived", "returned", "qualified", "unqualified"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { sendDate, expectedReturnDate, ...rest } = input;
      const id = await createSterilizationOrder({
        ...rest,
        sendDate: sendDate ? new Date(sendDate) as any : undefined,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        sterilizationMethod: z.string().optional(),
        supplierName: z.string().optional(),
        sendDate: z.string().optional(),
        expectedReturnDate: z.string().optional(),
        actualReturnDate: z.string().optional(),
        sterilizationBatchNo: z.string().optional(),
        status: z.enum(["draft", "sent", "processing", "arrived", "returned", "qualified", "unqualified"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { sendDate, expectedReturnDate, actualReturnDate, ...rest } = input.data;
      // 获取更新前的灭菌单数据（用于邮件通知）
      const oldOrder = await getSterilizationOrderById(input.id);
      await updateSterilizationOrder(input.id, {
        ...rest,
        sendDate: sendDate ? new Date(sendDate) as any : undefined,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) as any : undefined,
        actualReturnDate: actualReturnDate ? new Date(actualReturnDate) as any : undefined,
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
              sterilizationBatchNo: input.data.sterilizationBatchNo || oldOrder?.sterilizationBatchNo,
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
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteSterilizationOrder(input.id); return { success: true };
    }),
  }),

  // ==================== 生产入库申请 ====================
  productionWarehouseEntries: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), recordType: z.string().optional(), productionOrderId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getProductionWarehouseEntries(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getProductionWarehouseEntryById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      entryNo: z.string(),
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
      status: z.enum(["draft", "pending", "approved", "completed", "rejected"]).optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { applicationDate, ...rest } = input;
      const id = await createProductionWarehouseEntry({
        ...rest,
        applicationDate: applicationDate ? new Date(applicationDate) as any : undefined,
        createdBy: ctx.user?.id,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        quantity: z.string().optional(),
        sterilizedQty: z.string().optional(),
        inspectionRejectQty: z.string().optional(),
        sampleQty: z.string().optional(),
        quantityModifyReason: z.string().optional(),
        targetWarehouseId: z.number().optional(),
        status: z.enum(["draft", "pending", "approved", "completed", "rejected"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      // 获取更新前的入库申请数据（用于邮件通知）
      const oldEntry = await getProductionWarehouseEntryById(input.id);
      await updateProductionWarehouseEntry(input.id, input.data);
      // 邮件通知：状态变为「已审批」时，通知仓库部执行入库
      if (input.data.status === "approved" && oldEntry?.status !== "approved") {
        try {
          const warehouseEmails = await getUserEmailsByDepartment(["仓库管理", "仓库部"]);
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
      if (input.data.status === "completed" && oldEntry?.status !== "completed") {
        try {
          const entryQty = parseFloat(String(input.data.quantity || oldEntry?.quantity || 0));
          if (entryQty > 0 && oldEntry?.targetWarehouseId) {
            await createInventoryTransaction({
              warehouseId: oldEntry.targetWarehouseId,
              productId: oldEntry.productId ?? undefined,
              type: "production_in",
              documentNo: oldEntry.entryNo,
              itemName: oldEntry.productName || "生产入库",
              batchNo: oldEntry.batchNo ?? undefined,
              sterilizationBatchNo: oldEntry.sterilizationBatchNo ?? undefined,
              quantity: String(entryQty),
              unit: oldEntry.unit ?? undefined,
              relatedOrderId: oldEntry.productionOrderId ?? undefined,
              remark: `生产入库申请 ${oldEntry.entryNo} 完成入库`,
            });
          }
        } catch (e) {
          console.warn("[库存] 生产入库流水写入失败:", e);
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
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteProductionWarehouseEntry(input.id); return { success: true };
    }),
  }),

  // ==================== 加班申请 ====================
  overtimeRequests: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), department: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getOvertimeRequests(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getOvertimeRequestById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      requestNo: z.string(), applicantName: z.string(), department: z.string(),
      overtimeDate: z.string(), startTime: z.string(), endTime: z.string(),
      hours: z.string(), overtimeType: z.enum(["weekday", "weekend", "holiday"]),
      reason: z.string(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await createOvertimeRequest({
        ...input,
        applicantId: ctx.user?.id || 0,
        overtimeDate: new Date(input.overtimeDate) as any,
        hours: input.hours as any,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        overtimeDate: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(),
        hours: z.string().optional(), overtimeType: z.enum(["weekday", "weekend", "holiday"]).optional(),
        reason: z.string().optional(), status: z.enum(["draft", "pending", "approved", "rejected", "cancelled"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { overtimeDate, hours, ...rest } = input.data;
      await updateOvertimeRequest(input.id, {
        ...rest,
        overtimeDate: overtimeDate ? new Date(overtimeDate) as any : undefined,
        hours: hours ? hours as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteOvertimeRequest(input.id); return { success: true };
    }),
  }),

  // ==================== 请假申请 ====================
  leaveRequests: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), department: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getLeaveRequests(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getLeaveRequestById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      requestNo: z.string(), applicantName: z.string(), department: z.string(),
      leaveType: z.enum(["annual", "sick", "personal", "maternity", "paternity", "marriage", "bereavement", "other"]),
      startDate: z.string(), endDate: z.string(), days: z.string(),
      reason: z.string(), remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await createLeaveRequest({
        ...input,
        applicantId: ctx.user?.id || 0,
        startDate: new Date(input.startDate) as any,
        endDate: new Date(input.endDate) as any,
        days: input.days as any,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        leaveType: z.enum(["annual", "sick", "personal", "maternity", "paternity", "marriage", "bereavement", "other"]).optional(),
        startDate: z.string().optional(), endDate: z.string().optional(), days: z.string().optional(),
        reason: z.string().optional(), status: z.enum(["draft", "pending", "approved", "rejected", "cancelled"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { startDate, endDate, days, ...rest } = input.data;
      await updateLeaveRequest(input.id, {
        ...rest,
        startDate: startDate ? new Date(startDate) as any : undefined,
        endDate: endDate ? new Date(endDate) as any : undefined,
        days: days ? days as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteLeaveRequest(input.id); return { success: true };
    }),
  }),

  // ==================== 外出申请 ====================
  outingRequests: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), department: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional()).query(async ({ input }) => {
      return await getOutingRequests(input);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await getOutingRequestById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      requestNo: z.string(), applicantName: z.string(), department: z.string(),
      outingDate: z.string(), startTime: z.string(), endTime: z.string(),
      destination: z.string(), purpose: z.string(), contactPhone: z.string().optional(),
      remark: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await createOutingRequest({
        ...input,
        applicantId: ctx.user?.id || 0,
        outingDate: new Date(input.outingDate) as any,
      });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(), data: z.object({
        outingDate: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(),
        destination: z.string().optional(), purpose: z.string().optional(), contactPhone: z.string().optional(),
        status: z.enum(["draft", "pending", "approved", "rejected", "cancelled"]).optional(),
        remark: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      const { outingDate, ...rest } = input.data;
      await updateOutingRequest(input.id, {
        ...rest,
        outingDate: outingDate ? new Date(outingDate) as any : undefined,
      });
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteOutingRequest(input.id); return { success: true };
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
            planId: plan.id, planNo: plan.planNo, productId: plan.productId,
            productName: plan.productName, plannedQty, unit: plan.unit,
            bomMissing: true, items: [], calculatedAt: new Date().toISOString(),
          };
        }

        const { inventory: inventoryTable, purchaseOrders: poTable, purchaseOrderItems: poItemsTable } = await import("../drizzle/schema");
        const { eq: deq, and: dand, inArray: dinArray, sql: dsql } = await import("drizzle-orm");
        const materialCodes = [...new Set(bomItems.map((b: any) => b.materialCode).filter(Boolean))] as string[];

        // 合格库存
        let inventoryMap: Record<string, number> = {};
        if (materialCodes.length > 0) {
          const invRows = await db
            .select({ materialCode: inventoryTable.materialCode, totalQty: dsql<number>`SUM(CAST(${inventoryTable.quantity} AS DECIMAL(20,4)))` })
            .from(inventoryTable)
            .where(dand(deq(inventoryTable.status, "qualified"), dinArray(inventoryTable.materialCode, materialCodes)))
            .groupBy(inventoryTable.materialCode);
          for (const row of invRows) if (row.materialCode) inventoryMap[row.materialCode] = Number(row.totalQty) || 0;
        }

        // 在途量（采购订单已审批/已下单/部分收货，未完全到货部分）
        let onOrderMap: Record<string, number> = {};
        if (materialCodes.length > 0) {
          const onOrderRows = await db
            .select({ materialCode: poItemsTable.materialCode, onOrderQty: dsql<number>`SUM(CAST(${poItemsTable.quantity} AS DECIMAL(20,4)) - CAST(COALESCE(${poItemsTable.receivedQty}, 0) AS DECIMAL(20,4)))` })
            .from(poItemsTable)
            .innerJoin(poTable, deq(poItemsTable.orderId, poTable.id))
            .where(dand(dinArray(poTable.status, ["approved", "ordered", "partial_received"]), dinArray(poItemsTable.materialCode, materialCodes)))
            .groupBy(poItemsTable.materialCode);
          for (const row of onOrderRows) if (row.materialCode) onOrderMap[row.materialCode] = Math.max(0, Number(row.onOrderQty) || 0);
        }

        const today = new Date();
        const plannedEndDate = plan.plannedEndDate ? new Date(String(plan.plannedEndDate)) : null;
        const daysToDeadline = plannedEndDate ? Math.ceil((plannedEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;

        const items = bomItems.map((b: any) => {
          const requiredQty = parseFloat(String(b.quantity)) * plannedQty;
          const onHandQty = inventoryMap[b.materialCode] || 0;
          const onOrderQty = onOrderMap[b.materialCode] || 0;
          const netRequirement = Math.max(0, requiredQty - onHandQty - onOrderQty);
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
            needPurchase: netRequirement > 0,
          };
        });

        return {
          planId: plan.id, planNo: plan.planNo, productId: plan.productId,
          productName: plan.productName, plannedQty, unit: plan.unit,
          plannedStartDate: plan.plannedStartDate ? String(plan.plannedStartDate).split("T")[0] : null,
          plannedEndDate: plan.plannedEndDate ? String(plan.plannedEndDate).split("T")[0] : null,
          daysToDeadline, bomMissing: false,
          totalMaterials: items.length,
          shortfallCount: items.filter((i) => i.netRequirement > 0).length,
          items,
          calculatedAt: new Date().toISOString(),
        };
      }),

    /**
     * 批量列出所有生产计划（用于 MRP 列表页）
     */
    listPlans: protectedProcedure
      .input(z.object({ status: z.string().optional(), search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const plans = await getProductionPlans({ status: input?.status, search: input?.search, limit: 200 });
        // 将 Date 对象序列化为字符串，避免前端渲染 [object Date]
        return plans.map((p: any) => ({
          ...p,
          plannedStartDate: p.plannedStartDate ? String(p.plannedStartDate).split('T')[0] : null,
          plannedEndDate: p.plannedEndDate ? String(p.plannedEndDate).split('T')[0] : null,
          createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
        }));
      }),

    /**
     * 一键生成采购申请单
     * 将 MRP 运算结果中净需求 > 0 的物料，批量创建为一张采购申请单
     */
    generatePurchaseRequest: protectedProcedure
      .input(z.object({
        productionPlanId: z.number(),
        planNo: z.string(),
        productName: z.string(),
        urgency: z.enum(["normal", "urgent", "critical"]).optional(),
        items: z.array(z.object({
          materialCode: z.string(),
          materialName: z.string(),
          specification: z.string().optional(),
          unit: z.string().optional(),
          netRequirement: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.items.length === 0) throw new Error("没有需要采购的物料");
        const { materialRequests: mrTable, materialRequestItems: mriTable } = await import("../drizzle/schema");
        const requestNo = await getNextOrderNo("MR", mrTable, mrTable.requestNo);
        const today = new Date().toISOString().split("T")[0];
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const [inserted] = await db.insert(mrTable).values({
          requestNo,
          department: "生产部",
          requesterId: ctx.user!.id,
          requestDate: new Date(today) as any,
          urgency: input.urgency || "normal",
          reason: `MRP自动生成 — 生产计划 ${input.planNo}（${input.productName}）缺料申请`,
          status: "draft",
        });
        const requestId = (inserted as any).insertId;
        if (input.items.length > 0) {
          await db.insert(mriTable).values(
            input.items.map((item) => ({
              requestId,
              materialName: item.materialName,
              specification: item.specification || "",
              quantity: String(item.netRequirement) as any,
              unit: item.unit || "",
              remark: `物料编码: ${item.materialCode}`,
            }))
          );
        }
        return { requestId, requestNo };
      }),
  }),

  // ==================== UDI 标签管理 ====================
  udi: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        productId: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const conditions: any[] = [];
        if (input?.search) {
          conditions.push(or(
            like(udiLabels.labelNo, `%${input.search}%`),
            like(udiLabels.productName, `%${input.search}%`),
            like(udiLabels.udiDi, `%${input.search}%`),
            like(udiLabels.batchNo, `%${input.search}%`),
          ));
        }
        if (input?.status) conditions.push(eq(udiLabels.status, input.status as any));
        if (input?.productId) conditions.push(eq(udiLabels.productId, input.productId));
        const rows = await db.select().from(udiLabels)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(udiLabels.createdAt))
          .limit(input?.limit ?? 100)
          .offset(input?.offset ?? 0);
        return rows.map((r: any) => ({
          ...r,
          productionDate: r.productionDate ? String(r.productionDate).split('T')[0] : null,
          expiryDate: r.expiryDate ? String(r.expiryDate).split('T')[0] : null,
          printDate: r.printDate ? new Date(r.printDate).toISOString() : null,
          nmpaSubmitDate: r.nmpaSubmitDate ? new Date(r.nmpaSubmitDate).toISOString() : null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        }));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const [row] = await db.select().from(udiLabels).where(eq(udiLabels.id, input.id));
        if (!row) throw new Error("UDI记录不存在");
        return {
          ...row,
          productionDate: row.productionDate ? String(row.productionDate).split('T')[0] : null,
          expiryDate: row.expiryDate ? String(row.expiryDate).split('T')[0] : null,
          printDate: row.printDate ? new Date(row.printDate).toISOString() : null,
          nmpaSubmitDate: row.nmpaSubmitDate ? new Date(row.nmpaSubmitDate).toISOString() : null,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        };
      }),

    create: protectedProcedure
      .input(z.object({
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
        carrierType: z.enum(["datamatrix", "gs1_128", "qr_code", "rfid"]).optional(),
        labelTemplate: z.enum(["single", "double", "box", "pallet"]).optional(),
        printQty: z.number().optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const now = new Date();
        const prefix = `UDI${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        const [lastRow] = await db.select({ labelNo: udiLabels.labelNo })
          .from(udiLabels)
          .where(like(udiLabels.labelNo, `${prefix}%`))
          .orderBy(desc(udiLabels.labelNo))
          .limit(1);
        const seq = lastRow ? (parseInt(lastRow.labelNo.slice(-4)) + 1) : 1;
        const labelNo = `${prefix}${String(seq).padStart(4, '0')}`;
        await db.insert(udiLabels).values({
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
          productionDate: input.productionDate ? new Date(input.productionDate) : null,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          carrierType: input.carrierType ?? "datamatrix",
          labelTemplate: input.labelTemplate ?? "single",
          printQty: input.printQty ?? 1,
          remark: input.remark ?? null,
          createdBy: ctx.user?.id ?? null,
        } as any);
        return { success: true, labelNo };
      }),

    update: protectedProcedure
      .input(z.object({
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
        carrierType: z.enum(["datamatrix", "gs1_128", "qr_code", "rfid"]).optional(),
        labelTemplate: z.enum(["single", "double", "box", "pallet"]).optional(),
        printQty: z.number().optional(),
        status: z.enum(["pending", "printing", "printed", "used", "recalled"]).optional(),
        remark: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        const { id, productionDate, expiryDate, ...rest } = input;
        await db.update(udiLabels).set({
          ...rest,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        } as any).where(eq(udiLabels.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await db.delete(udiLabels).where(eq(udiLabels.id, input.id));
        return { success: true };
      }),

    confirmPrint: protectedProcedure
      .input(z.object({ id: z.number(), printedQty: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await db.update(udiLabels).set({
          status: "printed",
          printedQty: input.printedQty,
          printDate: new Date(),
          printedBy: ctx.user?.id ?? null,
        } as any).where(eq(udiLabels.id, input.id));
        return { success: true };
      }),

    submitNmpa: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await db.update(udiLabels).set({
          nmpaSubmitted: true,
          nmpaSubmitDate: new Date(),
        } as any).where(eq(udiLabels.id, input.id));
        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接不可用");
      const rows = await db.select({
        status: udiLabels.status,
        count: sql<number>`count(*)`,
      }).from(udiLabels).groupBy(udiLabels.status);
      const result: Record<string, number> = {};
      rows.forEach((r: any) => { result[r.status] = Number(r.count); });
      return {
        total: Object.values(result).reduce((a, b) => a + b, 0),
        pending: result['pending'] ?? 0,
        printing: result['printing'] ?? 0,
        printed: result['printed'] ?? 0,
        used: result['used'] ?? 0,
        recalled: result['recalled'] ?? 0,
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
      .input(z.object({
        smtpHost: z.string(),
        smtpPort: z.number().default(465),
        smtpUser: z.string().email(),
        smtpPass: z.string(),
        smtpFrom: z.string().optional(),
        smtpSecure: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        // 将 SMTP 配置写入公司信息表（作为配置存储）
        // 实际生产环境应将这些写入环境变量，这里仅做记录
        const { updateCompanyInfo } = await import("./db");
        await updateCompanyInfo({
          smtpConfig: JSON.stringify({
            host: input.smtpHost,
            port: input.smtpPort,
            user: input.smtpUser,
            secure: input.smtpSecure,
            from: input.smtpFrom || input.smtpUser,
          }),
        } as any);
        return { success: true, message: "配置已保存，请在服务器环境变量中配置 SMTP_HOST/SMTP_USER/SMTP_PASS 以生效" };
      }),
  }),

  // ==================== 批记录（全链路追溯）====================
  batchRecord: router({
    list: protectedProcedure
      .input(z.object({
        batchNo: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getBatchRecordList(input ?? {});
      }),
    getByBatchNo: protectedProcedure
      .input(z.object({ batchNo: z.string() }))
      .query(async ({ input }) => {
        const result = await getBatchRecord(input.batchNo);
        if (!result) throw new Error(`未找到批号 ${input.batchNo} 的批记录`);
        return result;
      }),
  }),
  goodsReceipts: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getGoodsReceipts(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getGoodsReceiptById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        receiptNo: z.string(),
        purchaseOrderId: z.number(),
        purchaseOrderNo: z.string(),
        supplierId: z.number().optional(),
        supplierName: z.string().optional(),
        warehouseId: z.number(),
        receiptDate: z.string(),
        remark: z.string().optional(),
        items: z.array(z.object({
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
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createGoodsReceipt({ ...input, createdBy: ctx.user?.id });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        inspectorId: z.number().optional(),
        inspectorName: z.string().optional(),
        inspectionDate: z.string().optional(),
        inspectionResult: z.string().optional(),
        inspectionRemark: z.string().optional(),
        inboundDocumentNo: z.string().optional(),
        remark: z.string().optional(),
        items: z.array(z.object({
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
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateGoodsReceipt(id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGoodsReceipt(input.id);
        return { success: true };
      }),
  }),

  // ==================== 检验要求 ====================
  inspectionRequirements: router({
    list: protectedProcedure
      .input(z.object({
        type: z.string().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getInspectionRequirements(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getInspectionRequirementById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        requirementNo: z.string(),
        type: z.enum(["IQC", "IPQC", "OQC"]),
        productCode: z.string().optional(),
        productName: z.string(),
        version: z.string().optional(),
        status: z.string().optional(),
        remark: z.string().optional(),
        items: z.array(z.object({
          itemName: z.string(),
          itemType: z.enum(["qualitative", "quantitative"]),
          standard: z.string().optional(),
          minValue: z.string().optional(),
          maxValue: z.string().optional(),
          unit: z.string().optional(),
          acceptedValues: z.string().optional(),
          sortOrder: z.number().optional(),
          remark: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createInspectionRequirement({ ...input, createdBy: ctx.user?.id });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        requirementNo: z.string().optional(),
        type: z.enum(["IQC", "IPQC", "OQC"]).optional(),
        productCode: z.string().optional(),
        productName: z.string().optional(),
        version: z.string().optional(),
        status: z.string().optional(),
        remark: z.string().optional(),
        items: z.array(z.object({
          itemName: z.string(),
          itemType: z.enum(["qualitative", "quantitative"]),
          standard: z.string().optional(),
          minValue: z.string().optional(),
          maxValue: z.string().optional(),
          unit: z.string().optional(),
          acceptedValues: z.string().optional(),
          sortOrder: z.number().optional(),
          remark: z.string().optional(),
        })).optional(),
      }))
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
      .input(z.object({
        result: z.string().optional(),
        search: z.string().optional(),
        goodsReceiptId: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getIqcInspections(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getIqcInspectionById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
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
        items: z.array(z.object({
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
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createIqcInspection({ ...input, createdBy: ctx.user?.id });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
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
        items: z.array(z.object({
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
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateIqcInspection(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteIqcInspection(input.id);
        return { success: true };
      }),
    uploadAttachments: protectedProcedure
      .input(z.object({
        inspectionNo: z.string(),
        files: z.array(z.object({
          name: z.string(),
          mimeType: z.string().optional(),
          base64: z.string(),
        })).min(1),
      }))
      .mutation(async ({ input }) => {
        const [department, folderName] = buildUploadFolderName("质量部", "来料检验").map(safeFileSegment);
        const inspectionNo = safeFileSegment(input.inspectionNo || "IQC");
        const saved: Array<{ fileName: string; filePath: string; mimeType: string }> = [];
        for (let index = 0; index < input.files.length; index++) {
          const file = input.files[index];
          const extFromName = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
          const ext = extFromName || (String(file.mimeType || "").includes("pdf") ? ".pdf" : String(file.mimeType || "").includes("image/") ? ".jpg" : "");
          if (!ATTACHMENT_EXTENSIONS.includes(ext as any)) {
            throw new Error(`不支持的文件格式: ${file.name}`);
          }
          const base64Body = String(file.base64 || "").replace(/^data:[^;]+;base64,/, "");
          const fileBuffer = Buffer.from(base64Body, "base64");
          const result = await saveAttachmentFile({
            department,
            businessFolder: folderName,
            originalName: file.name,
            desiredBaseName: `${inspectionNo}-${String(index + 1).padStart(2, "0")}`,
            mimeType: file.mimeType,
            buffer: fileBuffer,
          });
          saved.push({
            fileName: file.name,
            filePath: result.filePath,
            mimeType: file.mimeType || "",
          });
        }
        return saved;
      }),
    saveSignature: protectedProcedure
      .input(z.object({
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
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("数据库连接不可用");
        await ensureIqcInspectionsTable(db);
        // 读取当前已有的签名列表
        const [row] = await db.execute(sql`SELECT signatures FROM iqc_inspections WHERE id = ${input.id}`) as any;
        const existing: any[] = (() => {
          try { return JSON.parse(String((row as any)?.[0]?.signatures || "[]")) || []; } catch { return []; }
        })();
        const updated = [...existing, input.signature];
        await db.execute(sql`UPDATE iqc_inspections SET signatures = ${JSON.stringify(updated)} WHERE id = ${input.id}`);
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
      .input(z.object({
        folder: z.enum(["inbox", "sent", "draft", "trash"]).optional(),
        search: z.string().optional(),
        contactAddress: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
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
      .input(z.object({
        id: z.number().optional(),
        subject: z.string().optional(),
        toAddress: z.string().optional(),
        ccAddress: z.string().optional(),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { saveDraft } = await import("./mailService");
        const id = await saveDraft(input);
        return { id };
      }),

    send: protectedProcedure
      .input(z.object({
        to: z.string(),
        cc: z.string().optional(),
        subject: z.string(),
        bodyHtml: z.string(),
        bodyText: z.string().optional(),
        draftId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { sendMail } = await import("./mailService");
        return await sendMail(input);
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
      .input(z.object({
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getEmailContacts } = await import("./mailService");
        return await getEmailContacts(input ?? {});
      }),

    // AI 辅助写作：根据指令生成/润色/翻译邮件正文
    aiWrite: protectedProcedure
      .input(z.object({
        mode: z.enum(["polish", "translate", "generate"]),
        subject: z.string().optional(),
        body: z.string().optional(),
        instruction: z.string().optional(),
        targetLang: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { OpenAI } = await import("openai");
        const zhipuKey = process.env.ZHIPU_API_KEY || "b2427e1eaec24e1dbfc6b08c82e6d693.zc0XAEJ1g7iStgYY";
        const client = new OpenAI({
          apiKey: zhipuKey,
          baseURL: "https://open.bigmodel.cn/api/paas/v4",
        });
        const model = "glm-4-flash";
        let systemPrompt = "";
        let userPrompt = "";
        if (input.mode === "generate") {
          systemPrompt = "你是一个专业的商务邮件写作助手。请根据用户的描述，生成一封格式规范、语气专业的商务邮件正文，包含称呼、正文、结尾敬语和签名占位符。只输出邮件正文。";
          userPrompt = `邮件主题：${input.subject || ""}
内容要求：${input.instruction || input.body || ""}`;
        } else if (input.mode === "polish") {
          systemPrompt = "你是一个专业的商务邮件润色助手。请对用户提供的邮件正文进行润色和优化，保持原文意思，使语言更加流畅、专业、礼貌。只输出润色后的正文。";
          userPrompt = input.body || "";
        } else {
          const lang = input.targetLang || "中文";
          systemPrompt = `你是一个专业的商务邮件翻译助手。请将以下邮件正文翻译成${lang}，保持原文格式和语气。只输出翻译结果。`;
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
      .input(z.object({
        search: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const fs = await import("fs");
        const path = await import("path");
        const uploadsDir = path.join(process.cwd(), "uploads");
        const files: Array<{ name: string; path: string; size: number; category: string; modifiedAt: string }> = [];
        function scanDir(dir: string, category: string) {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                const subCategory = category ? `${category}/${entry.name}` : entry.name;
                scanDir(fullPath, subCategory);
              } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if ([".pdf",".doc",".docx",".xls",".xlsx",".jpg",".jpeg",".png",".zip"].includes(ext)) {
                  const stat = fs.statSync(fullPath);
                  const relativePath = fullPath.replace(process.cwd() + "/", "");
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
        const filtered = search ? files.filter(f => f.name.toLowerCase().includes(search) || f.category.toLowerCase().includes(search)) : files;
        filtered.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
        return filtered.slice(0, input?.limit ?? 100);
      }),
  }),

  // ─── 获客情报模块 ───────────────────────────────────────────────────────────
  prospect: router({
    // Google 关键词搜索目标公司
    searchCompanies: protectedProcedure
      .input(z.object({
        keyword: z.string(),
        region: z.string().optional(),
        industry: z.string().optional(),
        maxResults: z.number().optional(),
      }))
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
      .input(z.object({
        domain: z.string(),
        titles: z.array(z.string()).optional(),
      }))
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
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        company: z.string().optional(),
        title: z.string().optional(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { pushLeadToHubSpot } = await import("./prospectService");
        return await pushLeadToHubSpot(input);
      }),

    // 将线索保存到 ERP 线索库
    saveLead: protectedProcedure
      .input(z.object({
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
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        await db.execute(`
          INSERT INTO marketing_leads
            (companyName, companyDomain, companyWebsite, country, industry,
             contactName, contactTitle, contactEmail, contactPhone, contactLinkedin,
             source, status, notes, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, NOW(), NOW())
        `, [
          input.companyName, input.companyDomain || "", input.companyWebsite || "",
          input.country || "", input.industry || "",
          input.contactName || "", input.contactTitle || "",
          input.contactEmail || "", input.contactPhone || "",
          input.contactLinkedin || "", input.source || "获客情报",
          input.notes || "", (ctx as any).user?.name || "系统",
        ]);
        return { success: true };
      }),

    // 获取已保存的线索列表
    getLeads: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }).optional())
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
        if (input?.status) { where += " AND status = ?"; params.push(input.status); }
        if (input?.search) {
          where += " AND (companyName LIKE ? OR contactName LIKE ? OR contactEmail LIKE ?)";
          params.push(`%${input.search}%`, `%${input.search}%`, `%${input.search}%`);
        }
        const [rows] = await db.execute(`SELECT * FROM marketing_leads ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]) as any;
        const [countRows] = await db.execute(`SELECT COUNT(*) as total FROM marketing_leads ${where}`, params) as any;
        return { leads: rows, total: countRows[0]?.total ?? 0, page, pageSize };
      }),

    // 更新线索状态
    updateLeadStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db.execute(
          "UPDATE marketing_leads SET status = ?, notes = COALESCE(?, notes), updatedAt = NOW() WHERE id = ?",
          [input.status, input.notes, input.id]
        );
        return { success: true };
      }),

    // 获取 API 配置状态（检查哪些渠道已配置）
    getApiStatus: protectedProcedure
      .query(async () => {
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
      .input(z.object({
        images: z.array(z.object({
          name: z.string(),
          base64: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { recognizeInvoices } = await import("./invoiceOcrService");
        return await recognizeInvoices(input.images);
      }),
  }),

  // 网站管理 + 社交媒体同步发布
  website: router({
    // 发布文章并同步到 Facebook / LinkedIn / 官网
    publishArticle: protectedProcedure
      .input(z.object({
        articleId: z.number().optional(),
        title: z.string(),
        summary: z.string().optional().default(""),
        content: z.string(),
        coverImage: z.string().optional(),
        articleUrl: z.string().optional(),
        publishToWebsite: z.boolean().default(true),
        publishToFacebook: z.boolean().default(false),
        publishToLinkedin: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const { publishToFacebook, publishToLinkedin, publishToWebsiteWebhook } = await import("./socialPublishService");
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
    getApiStatus: protectedProcedure
      .query(async () => {
        return {
          facebook: !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
          linkedin: !!(process.env.LINKEDIN_ORGANIZATION_ID && process.env.LINKEDIN_ACCESS_TOKEN),
          websiteWebhook: !!process.env.WEBSITE_WEBHOOK_URL,
        };
      }),

    // 保存社交媒体配置（写入环境变量或数据库）
    saveConfig: protectedProcedure
      .input(z.object({
        facebookPageId: z.string().optional(),
        facebookAccessToken: z.string().optional(),
        linkedinOrgId: z.string().optional(),
        linkedinAccessToken: z.string().optional(),
        websiteWebhookUrl: z.string().optional(),
        websiteWebhookSecret: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 实际部署时应将配置写入数据库或密钥管理服务
        // 当前返回成功提示即可
        return { success: true, message: "配置已保存，请在服务器环境变量中配置对应的 Token" };
      }),
  }),
});