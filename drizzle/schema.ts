import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, boolean, json, tinyint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  department: varchar("department", { length: 64 }), // 所属部门
  position: varchar("position", { length: 64 }), // 职位
  phone: varchar("phone", { length: 20 }),
  visibleApps: text("visibleApps"), // 首页显示应用，逗号分隔的应用 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  avatarUrl: text("avatarUrl"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== 产品与物料管理 ====================

/**
 * 产品主数据表 - 研发部核心
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  isMedicalDevice: boolean("isMedicalDevice").default(true).notNull(), // 是否为医疗器械
  isSterilized: boolean("isSterilized").default(false).notNull(), // 是否灭菌
  code: varchar("code", { length: 50 }).notNull().unique(), // 产品编码
  name: varchar("name", { length: 200 }).notNull(), // 产品名称
  specification: varchar("specification", { length: 200 }), // 规格型号
  category: varchar("category", { length: 100 }), // 产品属性（NMPA/FDA/CE/OEM等）
  productCategory: mysqlEnum("productCategory", ["finished", "semi_finished", "raw_material", "auxiliary", "other"]), // 产品分类（成品/半成品/原材料/辅料/其他）
  unit: varchar("unit", { length: 20 }), // 计量单位
  registrationNo: varchar("registrationNo", { length: 100 }), // 注册证号
  udiDi: varchar("udiDi", { length: 100 }), // UDI-DI
  manufacturer: varchar("manufacturer", { length: 200 }), // 生产厂家
  storageCondition: varchar("storageCondition", { length: 200 }), // 储存条件
  shelfLife: int("shelfLife"), // 保质期(月)
  riskLevel: mysqlEnum("riskLevel", ["I", "II", "III"]), // 风险等级
  sourceType: mysqlEnum("sourceType", ["production", "purchase"]).default("production"), // 来源类型：生产/采购
  salePermission: mysqlEnum("salePermission", ["saleable", "not_saleable"]).default("saleable").notNull(), // 销售权限：销售/不销售
  procurePermission: mysqlEnum("procurePermission", ["purchasable", "production_only"]).default("purchasable").notNull(), // 获取权限：采购/生产
  needCustoms: boolean("needCustoms").default(false), // 是否需要报关
  priceByPayment: json("priceByPayment"), // 按付款方式的价格 JSON: {"cash": 100, "monthly": 95, "quarterly": 90}
  status: mysqlEnum("status", ["draft", "active", "discontinued"]).default("draft").notNull(),
  description: text("description"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * 物料清单(BOM)表
 */
export const bom = mysqlTable("bom", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(), // 产品ID
  parentId: int("parentId"), // 父级物料ID（null表示直接挂在成品下的二级物料）
  level: int("level").notNull().default(2), // 层级：2=半成品/组件, 3=原材料
  materialCode: varchar("materialCode", { length: 50 }).notNull(), // 物料编码
  materialName: varchar("materialName", { length: 200 }).notNull(), // 物料名称
  specification: varchar("specification", { length: 200 }), // 规格
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(), // 用量
  unit: varchar("unit", { length: 20 }), // 单位
  unitPrice: decimal("unitPrice", { precision: 12, scale: 4 }).default("0"), // 单价
  version: varchar("version", { length: 20 }), // BOM版本
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  remark: varchar("remark", { length: 500 }), // 备注
  bomCode: varchar("bomCode", { length: 50 }), // BOM编号（自动生成，可手动修改）
  effectiveDate: date("effectiveDate"), // 生效日期
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bom = typeof bom.$inferSelect;
export type InsertBom = typeof bom.$inferInsert;

// ==================== 客户管理 ====================

/**
 * 客户信息表 - 销售部核心
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 客户编码
  name: varchar("name", { length: 200 }).notNull(), // 客户名称
  shortName: varchar("shortName", { length: 100 }), // 简称
  type: mysqlEnum("type", ["hospital", "dealer", "domestic", "overseas"]).notNull(), // 客户类型
  contactPerson: varchar("contactPerson", { length: 50 }), // 联系人
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  province: varchar("province", { length: 50 }),
  city: varchar("city", { length: 50 }),
  paymentTerms: varchar("paymentTerms", { length: 100 }), // 付款方式
  currency: varchar("currency", { length: 10 }).default("CNY"), // 结算币种
  creditLimit: decimal("creditLimit", { precision: 12, scale: 2 }), // 信用额度
  taxNo: varchar("taxNo", { length: 50 }), // 税号
  bankAccount: varchar("bankAccount", { length: 100 }), // 银行账号
  status: mysqlEnum("status", ["active", "inactive", "blacklist"]).default("active").notNull(),
  source: varchar("source", { length: 50 }), // 客户来源
  country: varchar("country", { length: 50 }), // 国家（海外客户使用）
  bankName: varchar("bankName", { length: 100 }), // 开户行
  needInvoice: boolean("needInvoice").default(false), // 是否需要开票
  salesPersonId: int("salesPersonId"), // 销售负责人 ID
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ==================== 供应商管理 ====================

/**
 * 供应商信息表 - 采购部核心
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 供应商编码
  name: varchar("name", { length: 200 }).notNull(), // 供应商名称
  shortName: varchar("shortName", { length: 100 }), // 简称
  type: mysqlEnum("type", ["material", "equipment", "service"]).notNull(), // 供应商类型
  contactPerson: varchar("contactPerson", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  businessLicense: varchar("businessLicense", { length: 100 }), // 营业执照号
  qualificationLevel: mysqlEnum("qualificationLevel", ["A", "B", "C", "pending"]).default("pending"), // 资质等级
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  bankAccount: varchar("bankAccount", { length: 100 }),
  taxNo: varchar("taxNo", { length: 50 }),
  evaluationScore: decimal("evaluationScore", { precision: 5, scale: 2 }), // 评估得分
  status: mysqlEnum("status", ["qualified", "pending", "disqualified"]).default("pending").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * 产品-供应商价格关联表
 * 记录每个产品对应的供应商及采购价格，支持自动生成采购订单草稿
 */
export const productSupplierPrices = mysqlTable("product_supplier_prices", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),         // 关联产品
  supplierId: int("supplierId").notNull(),         // 关联供应商
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 4 }), // 采购单价
  currency: varchar("currency", { length: 10 }).default("CNY"),         // 币种
  moq: int("moq").default(1),                     // 最小起订量
  leadTimeDays: int("leadTimeDays"),               // 交货周期（天）
  isDefault: tinyint("isDefault").default(0),     // 是否为默认供应商
  validFrom: date("validFrom"),                   // 价格有效期开始
  validTo: date("validTo"),                       // 价格有效期结束
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductSupplierPrice = typeof productSupplierPrices.$inferSelect;
export type InsertProductSupplierPrice = typeof productSupplierPrices.$inferInsert;

// ==================== 仓库与库存管理 ====================

/**
 * 仓库表
 */
export const warehouses = mysqlTable("warehouses", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["raw_material", "semi_finished", "finished", "quarantine"]).notNull(),
  address: text("address"),
  manager: varchar("manager", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

/**
 * 库存记录表
 */
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  warehouseId: int("warehouseId").notNull(),
  productId: int("productId"),
  materialCode: varchar("materialCode", { length: 50 }), // 物料编码(原材料)
  itemName: varchar("itemName", { length: 200 }).notNull(), // 物品名称
  batchNo: varchar("batchNo", { length: 50 }), // 批次号
  lotNo: varchar("lotNo", { length: 50 }), // 批号
  sterilizationBatchNo: varchar("sterilizationBatchNo", { length: 50 }), // 灭菌批号
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(), // 库存数量
  unit: varchar("unit", { length: 20 }),
  location: varchar("location", { length: 50 }), // 库位
  status: mysqlEnum("status", ["qualified", "quarantine", "unqualified", "reserved"]).default("quarantine").notNull(),
  productionDate: date("productionDate"), // 生产日期
  expiryDate: date("expiryDate"), // 有效期
  udiPi: varchar("udiPi", { length: 100 }), // UDI-PI
  safetyStock: decimal("safetyStock", { precision: 12, scale: 4 }), // 安全库存
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

/**
 * 库存流水表
 */
export const inventoryTransactions = mysqlTable("inventory_transactions", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventoryId"),
  productId: int("productId"),
  warehouseId: int("warehouseId").notNull(),
  type: mysqlEnum("type", [
    "purchase_in", "production_in", "return_in", "other_in",
    "production_out", "sales_out", "return_out", "other_out",
    "transfer", "adjust"
  ]).notNull(),
  documentNo: varchar("documentNo", { length: 50 }), // 单据号
  itemName: varchar("itemName", { length: 200 }).notNull(),
  batchNo: varchar("batchNo", { length: 50 }),
  sterilizationBatchNo: varchar("sterilizationBatchNo", { length: 50 }), // 灭菌批号
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  beforeQty: decimal("beforeQty", { precision: 12, scale: 4 }), // 变动前数量
  afterQty: decimal("afterQty", { precision: 12, scale: 4 }), // 变动后数量
  relatedOrderId: int("relatedOrderId"), // 关联订单ID
  shippingFee: decimal("shippingFee", { precision: 14, scale: 2 }), // 运费金额
  logisticsSupplierId: int("logisticsSupplierId"), // 物流供应商ID
  logisticsSupplierName: varchar("logisticsSupplierName", { length: 200 }), // 物流供应商名称
  remark: text("remark"),
  operatorId: int("operatorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;;
export type InsertInventoryTransaction = typeof inventoryTransactions.$inferInsert;

// ==================== 销售订单管理 ====================

/**
 * 销售订单表
 */
export const salesOrders = mysqlTable("sales_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 50 }).notNull().unique(), // 订单号
  customerId: int("customerId").notNull(),
  orderDate: date("orderDate").notNull(),
  deliveryDate: date("deliveryDate"), // 交货日期
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // 付款方式：现结/月结/季结等
  totalAmountBase: decimal("totalAmountBase", { precision: 14, scale: 2 }), // 本位币金额
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 6 }).default("1"), // 汇率
  paymentTermId: int("paymentTermId"), // 付款条款ID
  depositRate: decimal("depositRate", { precision: 5, scale: 2 }), // 定金比例 (如 30.00 表示 30%)
  depositAmount: decimal("depositAmount", { precision: 14, scale: 2 }), // 定金金额
  depositPaid: decimal("depositPaid", { precision: 14, scale: 2 }).default("0"), // 已付定金
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "pending_payment", "confirmed", "in_production", "ready_to_ship", "partial_shipped", "shipped", "completed", "cancelled"]).default("draft").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid"]).default("unpaid").notNull(),
  shippingAddress: text("shippingAddress"),
  shippingContact: varchar("shippingContact", { length: 50 }), // 收货联系人
  shippingPhone: varchar("shippingPhone", { length: 50 }), // 收货电话
  needsShipping: boolean("needsShipping").default(false), // 是否需要运费
  shippingFee: decimal("shippingFee", { precision: 14, scale: 2 }), // 运费金额
  isExport: boolean("isExport").default(false), // 是否报关
  customsStatus: mysqlEnum("customsStatus", ["not_required", "pending", "in_progress", "completed"]).default("not_required"), // 报关状态
  remark: text("remark"),
  salesPersonId: int("salesPersonId"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = typeof salesOrders.$inferInsert;

/**
 * 订单审批历史记录表
 */
export const orderApprovals = mysqlTable("order_approvals", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(), // 订单ID
  orderType: mysqlEnum("orderType", ["sales", "purchase", "production"]).notNull(), // 订单类型
  action: mysqlEnum("action", ["submit", "approve", "reject"]).notNull(), // 操作类型
  approver: varchar("approver", { length: 100 }), // 审批人
  approverId: int("approverId"), // 审批人 ID
  comment: text("comment"), // 审批意见
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderApproval = typeof orderApprovals.$inferSelect;
export type InsertOrderApproval = typeof orderApprovals.$inferInsert;

/**
 * 销售订单明细表
 */
export const salesOrderItems = mysqlTable("sales_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 4 }),
  amount: decimal("amount", { precision: 14, scale: 2 }),
  deliveredQty: decimal("deliveredQty", { precision: 12, scale: 4 }).default("0"), // 已发货数量
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = typeof salesOrderItems.$inferInsert;

// ==================== 采购订单管理 ====================

/**
 * 采购订单表
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 50 }).notNull().unique(),
  supplierId: int("supplierId").notNull(),
  orderDate: date("orderDate").notNull(),
  expectedDate: date("expectedDate"), // 预计到货日期
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  totalAmountBase: decimal("totalAmountBase", { precision: 14, scale: 2 }), // 本位币金额
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 6 }).default("1"), // 汇率
  materialRequestId: int("materialRequestId"), // 关联物料申请单
  status: mysqlEnum("status", ["draft", "approved", "ordered", "partial_received", "received", "cancelled"]).default("draft").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partial", "paid"]).default("unpaid").notNull(),
  remark: text("remark"),
  buyerId: int("buyerId"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * 采购订单明细表
 */
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"), // 关联产品表
  materialCode: varchar("materialCode", { length: 50 }).notNull(),
  materialName: varchar("materialName", { length: 200 }).notNull(),
  specification: varchar("specification", { length: 200 }),
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 4 }),
  amount: decimal("amount", { precision: 14, scale: 2 }),
  receivedQty: decimal("receivedQty", { precision: 12, scale: 4 }).default("0"), // 已收货数量
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

// ==================== 生产管理 ====================

/**
 * 生产订单表
 */
export const productionOrders = mysqlTable("production_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 50 }).notNull().unique(),
  orderType: mysqlEnum("orderType", ["finished", "semi_finished", "rework"]).default("finished").notNull(), // 指令类型：成品/半成品/返工
  productId: int("productId").notNull(),
  plannedQty: decimal("plannedQty", { precision: 12, scale: 4 }).notNull(), // 计划数量
  completedQty: decimal("completedQty", { precision: 12, scale: 4 }).default("0"), // 完成数量
  unit: varchar("unit", { length: 20 }),
  batchNo: varchar("batchNo", { length: 50 }), // 生产批号
  plannedStartDate: date("plannedStartDate"),
  plannedEndDate: date("plannedEndDate"),
  actualStartDate: date("actualStartDate"),
  actualEndDate: date("actualEndDate"),
  status: mysqlEnum("status", ["draft", "planned", "in_progress", "completed", "cancelled"]).default("draft").notNull(),
  salesOrderId: int("salesOrderId"), // 关联销售订单
  planId: int("planId"), // 关联生产计划
  productionDate: date("productionDate"), // 生产日期
  expiryDate: date("expiryDate"), // 有效期至
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;

// ==================== 质量管理 ====================

/**
 * 检验记录表
 */
export const qualityInspections = mysqlTable("quality_inspections", {
  id: int("id").autoincrement().primaryKey(),
  inspectionNo: varchar("inspectionNo", { length: 50 }).notNull().unique(),
  type: mysqlEnum("type", ["IQC", "IPQC", "OQC"]).notNull(), // 检验类型
  relatedDocNo: varchar("relatedDocNo", { length: 50 }), // 关联单据号
  itemName: varchar("itemName", { length: 200 }).notNull(),
  batchNo: varchar("batchNo", { length: 50 }),
  productionOrderId: int("productionOrderId"), // 关联生产指令ID
  productionOrderNo: varchar("productionOrderNo", { length: 50 }), // 关联生产指令号
  sterilizationOrderId: int("sterilizationOrderId"), // 关联灭菌单ID
  sterilizationOrderNo: varchar("sterilizationOrderNo", { length: 50 }), // 关联灭菌单号
  sampleQty: decimal("sampleQty", { precision: 12, scale: 4 }), // 抽样数量
  inspectedQty: decimal("inspectedQty", { precision: 12, scale: 4 }), // 检验数量
  qualifiedQty: decimal("qualifiedQty", { precision: 12, scale: 4 }), // 合格数量
  unqualifiedQty: decimal("unqualifiedQty", { precision: 12, scale: 4 }), // 不合格数量
  result: mysqlEnum("result", ["qualified", "unqualified", "conditional"]), // 检验结论
  inspectorId: int("inspectorId"),
  inspectionDate: date("inspectionDate"),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QualityInspection = typeof qualityInspections.$inferSelect;
export type InsertQualityInspection = typeof qualityInspections.$inferInsert;

// ==================== 文档管理 ====================

/**
 * 文档档案表 - 管理部核心
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  docNo: varchar("docNo", { length: 50 }).notNull().unique(), // 文件编号
  title: varchar("title", { length: 200 }).notNull(), // 文件标题
  category: mysqlEnum("category", ["policy", "sop", "record", "certificate", "external", "contract"]).notNull(),
  version: varchar("version", { length: 20 }), // 版本号
  department: varchar("department", { length: 50 }), // 归属部门
  effectiveDate: date("effectiveDate"), // 生效日期
  expiryDate: date("expiryDate"), // 失效日期
  filePath: text("filePath"), // 文件路径
  status: mysqlEnum("status", ["draft", "reviewing", "approved", "obsolete"]).default("draft").notNull(),
  description: text("description"),
  createdBy: int("createdBy"),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ==================== 设备管理 ====================

/**
 * 设备台账表 - 生产部
 */
export const equipment = mysqlTable("equipment", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 设备编号
  name: varchar("name", { length: 200 }).notNull(), // 设备名称
  model: varchar("model", { length: 100 }), // 型号规格
  manufacturer: varchar("manufacturer", { length: 200 }), // 制造商
  serialNo: varchar("serialNo", { length: 100 }), // 出厂编号
  purchaseDate: date("purchaseDate"), // 购置日期
  installDate: date("installDate"), // 安装日期
  location: varchar("location", { length: 100 }), // 安装位置
  department: varchar("department", { length: 50 }), // 使用部门
  status: mysqlEnum("status", ["normal", "maintenance", "repair", "scrapped"]).default("normal").notNull(),
  nextMaintenanceDate: date("nextMaintenanceDate"), // 下次保养日期
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ==================== 财务部 ====================

/**
 * 应收账款表
 */
export const accountsReceivable = mysqlTable("accounts_receivable", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNo: varchar("invoiceNo", { length: 50 }).notNull(), // 发票号
  customerId: int("customerId").notNull(),
  salesOrderId: int("salesOrderId"),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(), // 应收金额
  paidAmount: decimal("paidAmount", { precision: 14, scale: 2 }).default("0"), // 已收金额
  currency: varchar("currency", { length: 10 }).default("CNY"),
  amountBase: decimal("amountBase", { precision: 14, scale: 2 }), // 本位币金额
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 6 }).default("1"),
  bankAccountId: int("bankAccountId"), // 收款银行账户
  invoiceDate: date("invoiceDate"),
  dueDate: date("dueDate"), // 到期日
  paymentMethod: varchar("paymentMethod", { length: 50 }), // 收款方式
  receiptDate: date("receiptDate"), // 收款日期
  status: mysqlEnum("status", ["pending", "partial", "paid", "overdue"]).default("pending").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountsReceivable = typeof accountsReceivable.$inferSelect;
export type InsertAccountsReceivable = typeof accountsReceivable.$inferInsert;

/**
 * 应付账款表
 */
export const accountsPayable = mysqlTable("accounts_payable", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNo: varchar("invoiceNo", { length: 50 }).notNull(),
  supplierId: int("supplierId").notNull(),
  purchaseOrderId: int("purchaseOrderId"),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(), // 应付金额
  paidAmount: decimal("paidAmount", { precision: 14, scale: 2 }).default("0"), // 已付金额
  currency: varchar("currency", { length: 10 }).default("CNY"),
  amountBase: decimal("amountBase", { precision: 14, scale: 2 }), // 本位币金额
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 6 }).default("1"),
  bankAccountId: int("bankAccountId"), // 付款银行账户
  invoiceDate: date("invoiceDate"),
  dueDate: date("dueDate"),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // 付款方式
  paymentDate: date("paymentDate"), // 付款日期
  status: mysqlEnum("status", ["pending", "partial", "paid", "overdue"]).default("pending").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountsPayable = typeof accountsPayable.$inferSelect;
export type InsertAccountsPayable = typeof accountsPayable.$inferInsert;

// ==================== 经销商管理 ====================

/**
 * 经销商资质表 - 招商部
 */
export const dealerQualifications = mysqlTable("dealer_qualifications", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(), // 关联客户
  businessLicense: varchar("businessLicense", { length: 100 }), // 营业执照号
  operatingLicense: varchar("operatingLicense", { length: 100 }), // 经营许可证号
  licenseExpiry: date("licenseExpiry"), // 许可证有效期
  authorizationNo: varchar("authorizationNo", { length: 100 }), // 授权书编号
  authorizationExpiry: date("authorizationExpiry"), // 授权有效期
  contractNo: varchar("contractNo", { length: 100 }), // 合同编号
  contractExpiry: date("contractExpiry"), // 合同有效期
  territory: text("territory"), // 授权区域
  status: mysqlEnum("status", ["pending", "approved", "expired", "terminated"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DealerQualification = typeof dealerQualifications.$inferSelect;
export type InsertDealerQualification = typeof dealerQualifications.$inferInsert;


// ==================== 电子签名管理 (FDA 21 CFR Part 11 合规) ====================

/**
 * 电子签名记录表 - 符合FDA 21 CFR Part 11要求
 * 用于记录检验报告的电子签名，确保数据完整性和可追溯性
 */
export const electronicSignatures = mysqlTable("electronic_signatures", {
  id: int("id").autoincrement().primaryKey(),
  // 签名关联信息
  documentType: mysqlEnum("documentType", ["IQC", "IPQC", "OQC", "release", "review", "approval"]).notNull(), // 文档类型
  documentId: int("documentId").notNull(), // 关联文档ID
  documentNo: varchar("documentNo", { length: 50 }).notNull(), // 关联单据号
  
  // 签名类型
  signatureType: mysqlEnum("signatureType", ["inspector", "reviewer", "approver"]).notNull(), // 签名角色
  signatureAction: varchar("signatureAction", { length: 100 }).notNull(), // 签名动作描述
  
  // 签名者信息 (Part 11要求：唯一标识签名者)
  signerId: int("signerId").notNull(), // 签名人ID
  signerName: varchar("signerName", { length: 100 }).notNull(), // 签名人姓名
  signerTitle: varchar("signerTitle", { length: 100 }), // 签名人职位
  signerDepartment: varchar("signerDepartment", { length: 100 }), // 签名人部门
  
  // 签名验证 (Part 11要求：签名需要身份验证)
  signatureMethod: mysqlEnum("signatureMethod", ["password", "pin", "biometric"]).default("password").notNull(),
  verificationHash: varchar("verificationHash", { length: 256 }), // 验证哈希值
  
  // 签名时间 (Part 11要求：精确时间戳)
  signedAt: timestamp("signedAt").notNull(),
  
  // 签名含义声明 (Part 11要求：签名含义)
  signatureMeaning: text("signatureMeaning").notNull(), // 签名含义声明
  
  // 签名状态
  status: mysqlEnum("status", ["valid", "revoked"]).default("valid").notNull(),
  revokedAt: timestamp("revokedAt"),
  revokedReason: text("revokedReason"),
  
  // IP和设备信息 (Part 11要求：审计追踪)
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ElectronicSignature = typeof electronicSignatures.$inferSelect;
export type InsertElectronicSignature = typeof electronicSignatures.$inferInsert;

/**
 * 签名审计日志表 - Part 11审计追踪要求
 * 记录所有与签名相关的操作，不可删除
 */
export const signatureAuditLog = mysqlTable("signature_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  signatureId: int("signatureId"), // 关联签名ID
  documentType: varchar("documentType", { length: 50 }).notNull(),
  documentId: int("documentId").notNull(),
  documentNo: varchar("documentNo", { length: 50 }).notNull(),
  
  // 操作信息
  action: mysqlEnum("action", [
    "signature_requested",
    "signature_completed", 
    "signature_rejected",
    "signature_revoked",
    "document_modified",
    "verification_failed",
    "access_denied"
  ]).notNull(),
  
  // 操作者信息
  userId: int("userId"),
  userName: varchar("userName", { length: 100 }),
  userRole: varchar("userRole", { length: 50 }),
  
  // 操作详情
  details: text("details"), // JSON格式的详细信息
  previousValue: text("previousValue"), // 修改前的值
  newValue: text("newValue"), // 修改后的值
  
  // 环境信息
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  
  // 时间戳 (不可修改)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type SignatureAuditLog = typeof signatureAuditLog.$inferSelect;
export type InsertSignatureAuditLog = typeof signatureAuditLog.$inferInsert;


// ==================== 操作日志管理 ====================

/**
 * 操作日志表 - 系统设置审计追踪
 * 记录所有关键操作，确保改动可追溯
 */
export const operationLogs = mysqlTable("operation_logs", {
  id: int("id").autoincrement().primaryKey(),
  
  // 操作模块信息
  module: mysqlEnum("module", [
    "department",    // 部门设置
    "code_rule",     // 编码设置
    "user",          // 用户设置
    "language",      // 语言设置
    "system",        // 系统设置
    "product",       // 产品管理
    "customer",      // 客户管理
    "supplier",      // 供应商管理
    "inventory",     // 库存管理
    "order",         // 订单管理
    "quality",       // 质量管理
    "production",    // 生产管理
    "finance",       // 财务部
    "document"       // 文档管理
  ]).notNull(),
  
  // 操作类型
  action: mysqlEnum("action", [
    "create",        // 新增
    "update",        // 编辑
    "delete",        // 删除
    "status_change", // 状态变更
    "role_change",   // 角色变更
    "permission_change", // 权限变更
    "import",        // 导入
    "export",        // 导出
    "login",         // 登录
    "logout",        // 登出
    "reset",         // 重置
    "approve",       // 审批
    "reject"         // 拒绝
  ]).notNull(),
  
  // 操作对象
  targetType: varchar("targetType", { length: 50 }).notNull(), // 操作对象类型
  targetId: varchar("targetId", { length: 50 }), // 操作对象ID
  targetName: varchar("targetName", { length: 200 }), // 操作对象名称
  
  // 操作详情
  description: text("description").notNull(), // 操作描述
  previousData: text("previousData"), // 操作前数据 (JSON)
  newData: text("newData"), // 操作后数据 (JSON)
  changedFields: text("changedFields"), // 变更字段列表 (JSON)
  
  // 操作人信息
  operatorId: int("operatorId").notNull(),
  operatorName: varchar("operatorName", { length: 100 }).notNull(),
  operatorRole: varchar("operatorRole", { length: 50 }),
  operatorDepartment: varchar("operatorDepartment", { length: 100 }),
  
  // 环境信息
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  deviceType: varchar("deviceType", { length: 50 }), // PC/Mobile/Tablet
  browser: varchar("browser", { length: 50 }),
  
  // 操作结果
  result: mysqlEnum("result", ["success", "failure", "partial"]).default("success").notNull(),
  errorMessage: text("errorMessage"), // 失败时的错误信息
  
  // 时间戳
  operatedAt: timestamp("operatedAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

// ==================== 银行账户管理 ====================

/**
 * 公司银行账户表
 */
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  accountName: varchar("accountName", { length: 200 }).notNull(), // 账户名称/别名
  bankName: varchar("bankName", { length: 200 }).notNull(), // 开户行
  accountNo: varchar("accountNo", { length: 100 }).notNull(), // 账号
  currency: varchar("currency", { length: 10 }).default("CNY").notNull(), // 账户币种
  swiftCode: varchar("swiftCode", { length: 20 }), // SWIFT代码
  accountType: mysqlEnum("accountType", ["basic", "general", "special"]).default("basic").notNull(), // 账户类型
  isDefault: boolean("isDefault").default(false), // 是否默认账户
  balance: decimal("balance", { precision: 14, scale: 2 }).default("0"), // 账户余额
  status: mysqlEnum("status", ["active", "frozen", "closed"]).default("active").notNull(),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

// ==================== 汇率管理 ====================

/**
 * 汇率表 - 记录各币种对本位币(CNY)的汇率
 */
export const exchangeRates = mysqlTable("exchange_rates", {
  id: int("id").autoincrement().primaryKey(),
  fromCurrency: varchar("fromCurrency", { length: 10 }).notNull(), // 原币种
  toCurrency: varchar("toCurrency", { length: 10 }).default("CNY").notNull(), // 目标币种(本位币)
  rate: decimal("rate", { precision: 10, scale: 6 }).notNull(), // 汇率
  effectiveDate: date("effectiveDate").notNull(), // 生效日期
  source: varchar("source", { length: 50 }), // 来源（手动/自动）
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;

// ==================== 付款条款管理 ====================

/**
 * 付款条款模板表
 */
export const paymentTerms = mysqlTable("payment_terms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 条款名称，如"现款现结"、"30%定金"、"月结30天"
  type: mysqlEnum("type", ["cash", "deposit", "monthly", "quarterly"]).notNull(), // 类型
  depositPercent: decimal("depositPercent", { precision: 5, scale: 2 }), // 定金比例，如 30.00 表示 30%
  creditDays: int("creditDays").default(0), // 账期天数，如月结30天=30
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentTerm = typeof paymentTerms.$inferSelect;
export type InsertPaymentTerm = typeof paymentTerms.$inferInsert;

// ==================== 物料申请管理 ====================

/**
 * 物料/采购申请表 - 各部门发起
 */
export const materialRequests = mysqlTable("material_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestNo: varchar("requestNo", { length: 50 }).notNull().unique(), // 申请单号
  department: varchar("department", { length: 64 }).notNull(), // 申请部门
  requesterId: int("requesterId").notNull(), // 申请人
  requestDate: date("requestDate").notNull(),
  urgency: mysqlEnum("urgency", ["normal", "urgent", "critical"]).default("normal").notNull(),
  reason: text("reason"), // 申请理由
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "rejected", "purchasing", "completed", "cancelled"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialRequest = typeof materialRequests.$inferSelect;
export type InsertMaterialRequest = typeof materialRequests.$inferInsert;

/**
 * 物料申请明细表
 */
export const materialRequestItems = mysqlTable("material_request_items", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  productId: int("productId"), // 关联产品表
  materialName: varchar("materialName", { length: 200 }).notNull(),
  specification: varchar("specification", { length: 200 }),
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  estimatedPrice: decimal("estimatedPrice", { precision: 12, scale: 4 }),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialRequestItem = typeof materialRequestItems.$inferSelect;
export type InsertMaterialRequestItem = typeof materialRequestItems.$inferInsert;

// ==================== 费用报销管理 ====================

/**
 * 费用报销表
 */
export const expenseReimbursements = mysqlTable("expense_reimbursements", {
  id: int("id").autoincrement().primaryKey(),
  reimbursementNo: varchar("reimbursementNo", { length: 50 }).notNull().unique(),
  applicantId: int("applicantId").notNull(), // 申请人
  department: varchar("department", { length: 64 }).notNull(),
  applyDate: date("applyDate").notNull(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  category: mysqlEnum("category", ["travel", "office", "entertainment", "transport", "communication", "other"]).notNull(), // 报销类型
  description: text("description"),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "rejected", "paid", "cancelled"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  paidAt: timestamp("paidAt"),
  bankAccountId: int("bankAccountId"), // 付款银行账户
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseReimbursement = typeof expenseReimbursements.$inferSelect;
export type InsertExpenseReimbursement = typeof expenseReimbursements.$inferInsert;

// ==================== 收付款记录 ====================

/**
 * 收付款流水表 - 记录每一笔收付款操作
 */
export const paymentRecords = mysqlTable("payment_records", {
  id: int("id").autoincrement().primaryKey(),
  recordNo: varchar("recordNo", { length: 50 }).notNull().unique(),
  type: mysqlEnum("type", ["receipt", "payment"]).notNull(), // 收款/付款
  relatedType: mysqlEnum("relatedType", ["sales_order", "purchase_order", "expense", "other"]).notNull(), // 关联单据类型
  relatedId: int("relatedId"), // 关联单据ID
  relatedNo: varchar("relatedNo", { length: 50 }), // 关联单据号
  customerId: int("customerId"), // 客户ID(收款时)
  supplierId: int("supplierId"), // 供应商ID(付款时)
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("CNY"),
  amountBase: decimal("amountBase", { precision: 14, scale: 2 }), // 本位币金额
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 6 }).default("1"),
  bankAccountId: int("bankAccountId").notNull(), // 我方银行账户
  paymentDate: date("paymentDate").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }), // 银行转账/现金/支票等
  remark: text("remark"),
  operatorId: int("operatorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;

// ==================== 报关管理 ====================

/**
 * 报关记录表
 */
export const customsDeclarations = mysqlTable("customs_declarations", {
  id: int("id").autoincrement().primaryKey(),
  declarationNo: varchar("declarationNo", { length: 50 }).notNull().unique(),
  salesOrderId: int("salesOrderId").notNull(), // 关联销售订单
  customerId: int("customerId").notNull(),
  productName: varchar("productName", { length: 200 }),
  quantity: decimal("quantity", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 20 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  amount: decimal("amount", { precision: 14, scale: 2 }),
  destination: varchar("destination", { length: 100 }), // 目的地
  portOfLoading: varchar("portOfLoading", { length: 100 }),
  portOfDischarge: varchar("portOfDischarge", { length: 100 }),
  shippingMethod: mysqlEnum("shippingMethod", ["sea", "air", "land", "express"]).default("sea"),
  hsCode: varchar("hsCode", { length: 20 }), // 海关编码
  status: mysqlEnum("status", ["preparing", "submitted", "cleared", "shipped"]).default("preparing").notNull(),
  declarationDate: date("declarationDate"),
  clearanceDate: date("clearanceDate"),
  shippingDate: date("shippingDate"),
  trackingNo: varchar("trackingNo", { length: 100 }),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomsDeclaration = typeof customsDeclarations.$inferSelect;
export type InsertCustomsDeclaration = typeof customsDeclarations.$inferInsert;

// ==================== 部门管理 ====================

/**
 * 部门表
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: int("parentId"), // 父部门
  managerId: int("managerId"), // 部门主管
  phone: varchar("phone", { length: 50 }),
  description: text("description"),
  sortOrder: int("sortOrder").default(0),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// ==================== 编码规则管理 ====================

/**
 * 编码规则表
 */
export const codeRules = mysqlTable("code_rules", {
  id: int("id").autoincrement().primaryKey(),
  module: varchar("module", { length: 50 }).notNull(), // 模块，如 product, customer, salesOrder
  prefix: varchar("prefix", { length: 20 }).notNull(), // 前缀
  dateFormat: varchar("dateFormat", { length: 20 }), // 日期格式，如 YYYYMM
  seqLength: int("seqLength").default(4), // 序号位数
  currentSeq: int("currentSeq").default(0), // 当前序号
  example: varchar("example", { length: 50 }), // 示例
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CodeRule = typeof codeRules.$inferSelect;
export type InsertCodeRule = typeof codeRules.$inferInsert;

// ==================== 公司信息 ====================

/**
 * 公司信息表（用于打印模板/系统抬头统一）
 */
export const companyInfo = mysqlTable("company_info", {
  id: int("id").autoincrement().primaryKey(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  companyNameCn: varchar("companyNameCn", { length: 200 }),
  companyNameEn: varchar("companyNameEn", { length: 200 }),
  addressCn: text("addressCn"),
  addressEn: text("addressEn"),
  website: varchar("website", { length: 200 }),
  email: varchar("email", { length: 120 }),
  contactNameCn: varchar("contactNameCn", { length: 100 }),
  contactNameEn: varchar("contactNameEn", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = typeof companyInfo.$inferInsert;

// ==================== 审批流程模板 ====================

export const workflowFormCatalog = mysqlTable("workflow_form_catalog", {
  id: int("id").autoincrement().primaryKey(),
  module: varchar("module", { length: 64 }).notNull(),
  formType: varchar("formType", { length: 100 }).notNull(),
  formName: varchar("formName", { length: 100 }).notNull(),
  path: varchar("path", { length: 200 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  approvalEnabled: boolean("approvalEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowFormCatalog = typeof workflowFormCatalog.$inferSelect;
export type InsertWorkflowFormCatalog = typeof workflowFormCatalog.$inferInsert;

export const workflowTemplates = mysqlTable("workflow_templates", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  formType: varchar("formType", { length: 100 }).notNull(),
  initiators: text("initiators"),
  approvalSteps: text("approvalSteps"),
  handlers: text("handlers"),
  ccRecipients: text("ccRecipients"),
  description: text("description"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdBy: int("createdBy"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = typeof workflowTemplates.$inferInsert;

// ==================== 人事管理 ====================

/**
 * 员工档案表
 */
export const personnel = mysqlTable("personnel", {
  id: int("id").autoincrement().primaryKey(),
  employeeNo: varchar("employeeNo", { length: 50 }).notNull().unique(), // 工号
  name: varchar("name", { length: 100 }).notNull(),
  gender: mysqlEnum("gender", ["male", "female"]),
  idCard: varchar("idCard", { length: 20 }), // 身份证号
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  departmentId: int("departmentId"), // 关联部门表
  position: varchar("position", { length: 64 }),
  entryDate: date("entryDate"), // 入职日期
  contractExpiry: date("contractExpiry"), // 合同到期日
  education: varchar("education", { length: 50 }), // 学历
  major: varchar("major", { length: 100 }), // 专业
  emergencyContact: varchar("emergencyContact", { length: 50 }),
  emergencyPhone: varchar("emergencyPhone", { length: 20 }),
  status: mysqlEnum("status", ["active", "probation", "resigned", "terminated"]).default("active").notNull(),
  userId: int("userId"), // 关联系统用户
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Personnel = typeof personnel.$inferSelect;
export type InsertPersonnel = typeof personnel.$inferInsert;

// ==================== 培训管理 ====================

/**
 * 培训记录表
 */
export const trainings = mysqlTable("trainings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // 培训主题
  type: mysqlEnum("type", ["onboarding", "skill", "compliance", "safety", "other"]).notNull(),
  trainerId: int("trainerId"), // 培训师
  departmentId: int("departmentId"), // 目标部门
  startDate: date("startDate"),
  endDate: date("endDate"),
  location: varchar("location", { length: 100 }),
  participants: int("participants"), // 参加人数
  content: text("content"), // 培训内容
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "cancelled"]).default("planned").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Training = typeof trainings.$inferSelect;
export type InsertTraining = typeof trainings.$inferInsert;

// ==================== 内审管理 ====================

/**
 * 内审记录表
 */
export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  auditNo: varchar("auditNo", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["internal", "external", "supplier", "process"]).notNull(),
  departmentId: int("departmentId"), // 被审部门
  auditorId: int("auditorId"), // 审核员
  auditDate: date("auditDate"),
  findings: text("findings"), // 审核发现
  correctiveActions: text("correctiveActions"), // 纠正措施
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "closed"]).default("planned").notNull(),
  result: mysqlEnum("result", ["pass", "conditional", "fail"]),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;

// ==================== 研发项目管理 ====================

/**
 * 研发项目表
 */
export const rdProjects = mysqlTable("rd_projects", {
  id: int("id").autoincrement().primaryKey(),
  projectNo: varchar("projectNo", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["new_product", "improvement", "customization", "research"]).notNull(),
  productId: int("productId"), // 关联产品
  leaderId: int("leaderId"), // 项目负责人
  startDate: date("startDate"),
  endDate: date("endDate"),
  budget: decimal("budget", { precision: 14, scale: 2 }),
  progress: int("progress").default(0), // 进度 0-100
  status: mysqlEnum("status", ["planning", "in_progress", "testing", "completed", "suspended", "cancelled"]).default("planning").notNull(),
  description: text("description"),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RdProject = typeof rdProjects.$inferSelect;
export type InsertRdProject = typeof rdProjects.$inferInsert;

// ==================== 库存盘点 ====================

/**
 * 盘点记录表
 */
export const stocktakes = mysqlTable("stocktakes", {
  id: int("id").autoincrement().primaryKey(),
  stocktakeNo: varchar("stocktakeNo", { length: 50 }).notNull().unique(),
  warehouseId: int("warehouseId").notNull(),
  type: mysqlEnum("type", ["full", "partial", "spot"]).notNull(), // 全盘/部分/抽盘
  stocktakeDate: date("stocktakeDate").notNull(),
  operatorId: int("operatorId"),
  systemQty: decimal("systemQty", { precision: 12, scale: 4 }), // 系统数量
  actualQty: decimal("actualQty", { precision: 12, scale: 4 }), // 实盘数量
  diffQty: decimal("diffQty", { precision: 12, scale: 4 }), // 差异数量
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "approved"]).default("planned").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Stocktake = typeof stocktakes.$inferSelect;
export type InsertStocktake = typeof stocktakes.$inferInsert;

// ==================== 质量不良事件 ====================

/**
 * 不良事件表
 */
export const qualityIncidents = mysqlTable("quality_incidents", {
  id: int("id").autoincrement().primaryKey(),
  incidentNo: varchar("incidentNo", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["complaint", "nonconformance", "capa", "recall", "deviation"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  productId: int("productId"),
  batchNo: varchar("batchNo", { length: 50 }),
  description: text("description"),
  rootCause: text("rootCause"), // 根本原因
  correctiveAction: text("correctiveAction"), // 纠正措施
  preventiveAction: text("preventiveAction"), // 预防措施
  reporterId: int("reporterId"),
  assigneeId: int("assigneeId"),
  reportDate: date("reportDate"),
  closeDate: date("closeDate"),
  status: mysqlEnum("status", ["open", "investigating", "correcting", "verifying", "closed"]).default("open").notNull(),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QualityIncident = typeof qualityIncidents.$inferSelect;
export type InsertQualityIncident = typeof qualityIncidents.$inferInsert;

// ==================== 样品管理 ====================

/**
 * 样品管理表
 */
export const samples = mysqlTable("samples", {
  id: int("id").autoincrement().primaryKey(),
  sampleNo: varchar("sampleNo", { length: 50 }).notNull().unique(),
  productId: int("productId"),
  batchNo: varchar("batchNo", { length: 50 }),
  sampleType: mysqlEnum("sampleType", ["raw_material", "semi_finished", "finished", "stability", "retention"]).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 20 }),
  storageLocation: varchar("storageLocation", { length: 100 }),
  storageCondition: varchar("storageCondition", { length: 100 }),
  samplingDate: date("samplingDate"),
  expiryDate: date("expiryDate"),
  samplerId: int("samplerId"),
  status: mysqlEnum("status", ["stored", "testing", "used", "expired", "destroyed"]).default("stored").notNull(),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sample = typeof samples.$inferSelect;
export type InsertSample = typeof samples.$inferInsert;

// ==================== 实验室管理 ====================

/**
 * 实验室记录表
 */
export const labRecords = mysqlTable("lab_records", {
  id: int("id").autoincrement().primaryKey(),
  recordNo: varchar("recordNo", { length: 50 }).notNull().unique(),
  sampleId: int("sampleId"), // 关联样品
  testType: varchar("testType", { length: 100 }).notNull(), // 检测项目
  testMethod: varchar("testMethod", { length: 200 }), // 检测方法
  specification: text("specification"), // 标准要求
  result: text("result"), // 检测结果
  conclusion: mysqlEnum("conclusion", ["pass", "fail", "pending"]).default("pending"),
  equipmentId: int("equipmentId"), // 使用设备
  testerId: int("testerId"),
  testDate: date("testDate"),
  reviewerId: int("reviewerId"),
  reviewDate: date("reviewDate"),
  status: mysqlEnum("status", ["pending", "testing", "completed", "reviewed"]).default("pending").notNull(),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LabRecord = typeof labRecords.$inferSelect;
export type InsertLabRecord = typeof labRecords.$inferInsert;

// ==================== 生产管理扩展 ====================

/**
 * 生产计划表（看板）
 * 由销售订单审核后自动生成，或手动创建内部计划
 */
export const productionPlans = mysqlTable("production_plans", {
  id: int("id").autoincrement().primaryKey(),
  planNo: varchar("planNo", { length: 50 }).notNull().unique(),
  planType: mysqlEnum("planType", ["sales_driven", "internal"]).notNull().default("sales_driven"), // 销售计划/内部计划
  salesOrderId: int("salesOrderId"),       // 关联销售订单（销售计划时必填）
  salesOrderNo: varchar("salesOrderNo", { length: 50 }), // 冗余存储销售订单号
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 200 }), // 冗余存储产品名称
  plannedQty: decimal("plannedQty", { precision: 12, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  batchNo: varchar("batchNo", { length: 50 }),
  plannedStartDate: date("plannedStartDate"),
  plannedEndDate: date("plannedEndDate"),   // 交期
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal"),
  status: mysqlEnum("status", ["pending", "scheduled", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  productionOrderId: int("productionOrderId"), // 关联生产任务
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductionPlan = typeof productionPlans.$inferSelect;
export type InsertProductionPlan = typeof productionPlans.$inferInsert;

/**
 * 领料单表
 * 生产任务开始时，向仓库申请领取原材料
 */
export const materialRequisitionOrders = mysqlTable("material_requisition_orders", {
  id: int("id").autoincrement().primaryKey(),
  requisitionNo: varchar("requisitionNo", { length: 50 }).notNull().unique(),
  productionOrderId: int("productionOrderId"), // 关联生产任务
  productionOrderNo: varchar("productionOrderNo", { length: 50 }),
  productionPlanId: int("productionPlanId"),   // 关联生产计划
  warehouseId: int("warehouseId"),             // 领料仓库
  requisitionDate: date("requisitionDate"),    // 领料日期
  requiredDate: date("requiredDate"),          // 需求日期
  applicantId: int("applicantId"),             // 申请人
  status: mysqlEnum("status", ["draft", "pending", "approved", "issued", "rejected"]).default("draft").notNull(),
  items: text("items"),                        // JSON存储物料明细行
  remark: text("remark"),                      // 备注
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MaterialRequisitionOrder = typeof materialRequisitionOrders.$inferSelect;
export type InsertMaterialRequisitionOrder = typeof materialRequisitionOrders.$inferInsert;

/**
 * 生产记录单表
 * 记录生产过程中的工序执行情况
 */
export const productionRecords = mysqlTable("production_records", {
  id: int("id").autoincrement().primaryKey(),
  recordNo: varchar("recordNo", { length: 50 }).notNull().unique(),
  recordType: mysqlEnum("recordType", ["general", "temperature_humidity", "material_usage", "clean_room", "first_piece"]).default("general").notNull(), // 记录类型：通用/温湿度/材料使用/清场/首件检验
  productionOrderId: int("productionOrderId"), // 关联生产任务
  productionOrderNo: varchar("productionOrderNo", { length: 50 }),
  productId: int("productId"),
  productName: varchar("productName", { length: 200 }),
  batchNo: varchar("batchNo", { length: 50 }),
  workstationId: int("workstationId"),         // 工位/工序
  workstationName: varchar("workstationName", { length: 100 }),
  operatorId: int("operatorId"),
  recordDate: date("recordDate"),
  plannedQty: decimal("plannedQty", { precision: 12, scale: 4 }),
  actualQty: decimal("actualQty", { precision: 12, scale: 4 }),
  scrapQty: decimal("scrapQty", { precision: 12, scale: 4 }).default("0"),
  // 温湿度记录字段
  temperature: decimal("temperature", { precision: 6, scale: 2 }), // 温度(℃)
  humidity: decimal("humidity", { precision: 6, scale: 2 }), // 湿度(%)
  temperatureLimit: varchar("temperatureLimit", { length: 50 }), // 温度限制要求
  humidityLimit: varchar("humidityLimit", { length: 50 }), // 湿度限制要求
  // 材料使用记录字段
  materialCode: varchar("materialCode", { length: 50 }), // 材料编号
  materialName: varchar("materialName", { length: 200 }), // 材料名称
  materialSpec: varchar("materialSpec", { length: 200 }), // 材料规格
  usedQty: decimal("usedQty", { precision: 12, scale: 4 }), // 实际用量
  usedUnit: varchar("usedUnit", { length: 20 }), // 用量单位
  materialBatchNo: varchar("materialBatchNo", { length: 50 }), // 材料批号
  // 清场记录字段
  cleanedBy: varchar("cleanedBy", { length: 50 }), // 清场人
  checkedBy: varchar("checkedBy", { length: 50 }), // 检查人
  cleanResult: mysqlEnum("cleanResult", ["pass", "fail"]), // 清场结果
  // 首件检验字段
  firstPieceResult: mysqlEnum("firstPieceResult", ["qualified", "unqualified"]), // 首件检验结果
  firstPieceInspector: varchar("firstPieceInspector", { length: 50 }), // 检验人
  firstPieceBasis: varchar("firstPieceBasis", { length: 100 }), // 检验依据文件编号
  firstPieceBasisVersion: varchar("firstPieceBasisVersion", { length: 20 }), // 检验依据版本
  // 公共补充字段（对应PDF表头）
  specification: varchar("specification", { length: 200 }), // 型号规格
  processType: varchar("processType", { length: 50 }), // 工序类别（常规/特殊）
  processName: varchar("processName", { length: 100 }), // 工序名称
  workshopName: varchar("workshopName", { length: 100 }), // 车间名称
  productionTeam: varchar("productionTeam", { length: 50 }), // 生产班组
  operator: varchar("operator", { length: 50 }), // 操作人
  inspector: varchar("inspector", { length: 50 }), // 检验人/审核人
  // 温湿度补充字段
  cleanlinessLevel: varchar("cleanlinessLevel", { length: 50 }), // 洁净级别（如：十万级）
  pressureDiff: decimal("pressureDiff", { precision: 6, scale: 2 }), // 压差(Pa)
  // 材料使用补充字段
  storageArea: varchar("storageArea", { length: 100 }), // 放置区域
  issuedQty: decimal("issuedQty", { precision: 12, scale: 4 }), // 领用数量
  qualifiedQty: decimal("qualifiedQty", { precision: 12, scale: 4 }), // 合格数量
  // 工序质控点/明细数据（JSON）
  detailItems: text("detailItems"), // JSON: 清场5项/首件检验项/质控参数明细
  equipmentItems: text("equipmentItems"), // JSON: 设备记录
  moldItems: text("moldItems"), // JSON: 模具记录
  documentVersion: varchar("documentVersion", { length: 20 }), // 作业指导书版本
  status: mysqlEnum("status", ["in_progress", "completed", "abnormal"]).default("in_progress").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductionRecord = typeof productionRecords.$inferSelect;
export type InsertProductionRecord = typeof productionRecords.$inferInsert;

/**
 * 生产流转单表
 * 记录半成品在各工序间的流转情况
 */
export const productionRoutingCards = mysqlTable("production_routing_cards", {
  id: int("id").autoincrement().primaryKey(),
  cardNo: varchar("cardNo", { length: 50 }).notNull().unique(),
  productionOrderId: int("productionOrderId"),
  productionOrderNo: varchar("productionOrderNo", { length: 50 }),
  productId: int("productId"),
  productName: varchar("productName", { length: 200 }),
  batchNo: varchar("batchNo", { length: 50 }),
  quantity: decimal("quantity", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 20 }),
  currentProcess: varchar("currentProcess", { length: 100 }), // 当前工序
  nextProcess: varchar("nextProcess", { length: 100 }),        // 下一工序
  needsSterilization: boolean("needsSterilization").default(false), // 是否需要委外灭菌
  status: mysqlEnum("status", ["in_process", "pending_sterilization", "sterilizing", "completed"]).default("in_process").notNull(),
  remark: text("remark"),                      // JSON存储流转工序历史
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductionRoutingCard = typeof productionRoutingCards.$inferSelect;
export type InsertProductionRoutingCard = typeof productionRoutingCards.$inferInsert;

/**
 * 委外灭菌单表
 * 医疗器械需要委外灭菌时使用
 */
export const sterilizationOrders = mysqlTable("sterilization_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 50 }).notNull().unique(),
  routingCardId: int("routingCardId"),         // 关联生产流转单
  routingCardNo: varchar("routingCardNo", { length: 50 }),
  productionOrderId: int("productionOrderId"),
  productionOrderNo: varchar("productionOrderNo", { length: 50 }),
  productId: int("productId"),
  productName: varchar("productName", { length: 200 }),
  batchNo: varchar("batchNo", { length: 50 }),
  quantity: decimal("quantity", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 20 }),
  sterilizationMethod: varchar("sterilizationMethod", { length: 100 }), // 灭菌方式（EO/辐照/高压蒸汽等）
  supplierId: int("supplierId"),               // 委外供应商
  supplierName: varchar("supplierName", { length: 200 }),
  sendDate: date("sendDate"),                  // 发出日期
  expectedReturnDate: date("expectedReturnDate"), // 预计返回日期
  actualReturnDate: date("actualReturnDate"),  // 实际返回日期
  sterilizationBatchNo: varchar("sterilizationBatchNo", { length: 50 }), // 灭菌批号（唯一，灭菌完成后补录）
  status: mysqlEnum("status", ["draft", "sent", "processing", "arrived", "returned", "qualified", "unqualified"]).default("draft").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SterilizationOrder = typeof sterilizationOrders.$inferSelect;
export type InsertSterilizationOrder = typeof sterilizationOrders.$inferInsert;

/**
 * 生产入库申请表
 * 生产完成（含灭菌）后，申请将成品入库
 */
export const productionWarehouseEntries = mysqlTable("production_warehouse_entries", {
  id: int("id").autoincrement().primaryKey(),
  entryNo: varchar("entryNo", { length: 50 }).notNull().unique(),
  productionOrderId: int("productionOrderId"),
  productionOrderNo: varchar("productionOrderNo", { length: 50 }),
  sterilizationOrderId: int("sterilizationOrderId"), // 关联委外灭菌单（如有）
  sterilizationOrderNo: varchar("sterilizationOrderNo", { length: 50 }),
  productId: int("productId"),
  productName: varchar("productName", { length: 200 }),
  batchNo: varchar("batchNo", { length: 50 }),
  sterilizationBatchNo: varchar("sterilizationBatchNo", { length: 50 }), // 灭菌批号
  sterilizedQty: decimal("sterilizedQty", { precision: 12, scale: 4 }), // 灭菌后数量
  inspectionRejectQty: decimal("inspectionRejectQty", { precision: 12, scale: 4 }).default("0"), // 检验报废数量
  sampleQty: decimal("sampleQty", { precision: 12, scale: 4 }).default("0"), // 留样数量
  quantity: decimal("quantity", { precision: 12, scale: 4 }),
  quantityModifyReason: text("quantityModifyReason"), // 入库数量手动修改原因
  unit: varchar("unit", { length: 20 }),
  targetWarehouseId: int("targetWarehouseId"), // 目标入库仓库
  applicantId: int("applicantId"),
  applicationDate: date("applicationDate"),
  status: mysqlEnum("status", ["draft", "pending", "approved", "completed", "rejected"]).default("draft").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductionWarehouseEntry = typeof productionWarehouseEntries.$inferSelect;
export type InsertProductionWarehouseEntry = typeof productionWarehouseEntries.$inferInsert;

// ==================== 行政表单 ====================

/**
 * 加班申请表
 */
export const overtimeRequests = mysqlTable("overtime_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestNo: varchar("requestNo", { length: 50 }).notNull().unique(),
  applicantId: int("applicantId").notNull(),
  applicantName: varchar("applicantName", { length: 64 }).notNull(),
  department: varchar("department", { length: 64 }).notNull(),
  overtimeDate: date("overtimeDate").notNull(),
  startTime: varchar("startTime", { length: 10 }).notNull(), // HH:mm
  endTime: varchar("endTime", { length: 10 }).notNull(),
  hours: decimal("hours", { precision: 5, scale: 1 }).notNull(),
  overtimeType: mysqlEnum("overtimeType", ["weekday", "weekend", "holiday"]).default("weekday").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "cancelled"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type InsertOvertimeRequest = typeof overtimeRequests.$inferInsert;

/**
 * 请假申请表
 */
export const leaveRequests = mysqlTable("leave_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestNo: varchar("requestNo", { length: 50 }).notNull().unique(),
  applicantId: int("applicantId").notNull(),
  applicantName: varchar("applicantName", { length: 64 }).notNull(),
  department: varchar("department", { length: 64 }).notNull(),
  leaveType: mysqlEnum("leaveType", ["annual", "sick", "personal", "maternity", "paternity", "marriage", "bereavement", "other"]).default("annual").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  days: decimal("days", { precision: 5, scale: 1 }).notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "cancelled"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

/**
 * 外出申请表
 */
export const outingRequests = mysqlTable("outing_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestNo: varchar("requestNo", { length: 50 }).notNull().unique(),
  applicantId: int("applicantId").notNull(),
  applicantName: varchar("applicantName", { length: 64 }).notNull(),
  department: varchar("department", { length: 64 }).notNull(),
  outingDate: date("outingDate").notNull(),
  startTime: varchar("startTime", { length: 10 }).notNull(),
  endTime: varchar("endTime", { length: 10 }).notNull(),
  destination: varchar("destination", { length: 200 }).notNull(),
  purpose: text("purpose").notNull(),
  contactPhone: varchar("contactPhone", { length: 20 }),
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "cancelled"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OutingRequest = typeof outingRequests.$inferSelect;
export type InsertOutingRequest = typeof outingRequests.$inferInsert;


// ==================== UDI 标签管理 ====================
export const udiLabels = mysqlTable("udi_labels", {
  id: int("id").autoincrement().primaryKey(),
  labelNo: varchar("labelNo", { length: 50 }).notNull().unique(),
  productId: int("productId"),
  productName: varchar("productName", { length: 200 }),
  productCode: varchar("productCode", { length: 50 }),
  specification: varchar("specification", { length: 200 }),
  registrationNo: varchar("registrationNo", { length: 100 }),
  riskLevel: mysqlEnum("riskLevel", ["I", "II", "III"]),
  udiDi: varchar("udiDi", { length: 100 }).notNull(),
  issuer: mysqlEnum("issuer", ["GS1", "HIBC", "ICCBBA", "OTHER"]).default("GS1"),
  batchNo: varchar("batchNo", { length: 50 }),
  serialNo: varchar("serialNo", { length: 50 }),
  productionDate: date("productionDate"),
  expiryDate: date("expiryDate"),
  carrierType: mysqlEnum("carrierType", ["datamatrix", "gs1_128", "qr_code", "rfid"]).default("datamatrix"),
  labelTemplate: mysqlEnum("labelTemplate", ["single", "double", "box", "pallet"]).default("single"),
  printQty: int("printQty").default(1).notNull(),
  printedQty: int("printedQty").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "printing", "printed", "used", "recalled"]).default("pending").notNull(),
  printDate: timestamp("printDate"),
  printedBy: int("printedBy"),
  nmpaSubmitted: boolean("nmpaSubmitted").default(false),
  nmpaSubmitDate: timestamp("nmpaSubmitDate"),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UdiLabel = typeof udiLabels.$inferSelect;
export type InsertUdiLabel = typeof udiLabels.$inferInsert;

// ==================== 采购到货单 ====================
/**
 * 采购到货单主表
 * 状态流转：pending_inspection → inspecting → passed（质检合格）/ failed（质检不合格）→ warehoused（已入库）
 */
export const goodsReceipts = mysqlTable("goods_receipts", {
  id: int("id").autoincrement().primaryKey(),
  receiptNo: varchar("receiptNo", { length: 50 }).notNull().unique(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  purchaseOrderNo: varchar("purchaseOrderNo", { length: 50 }).notNull(),
  supplierId: int("supplierId"),
  supplierName: varchar("supplierName", { length: 200 }),
  warehouseId: int("warehouseId").notNull(),
  receiptDate: date("receiptDate").notNull(),
  status: mysqlEnum("status", ["pending_inspection", "inspecting", "passed", "failed", "warehoused"]).default("pending_inspection").notNull(),
  inspectorId: int("inspectorId"),
  inspectorName: varchar("inspectorName", { length: 64 }),
  inspectionDate: date("inspectionDate"),
  inspectionResult: mysqlEnum("inspectionResult", ["pass", "fail", "conditional_pass"]),
  inspectionRemark: text("inspectionRemark"),
  inboundDocumentNo: varchar("inboundDocumentNo", { length: 50 }),
  inboundAt: timestamp("inboundAt"),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type InsertGoodsReceipt = typeof goodsReceipts.$inferInsert;

/**
 * 采购到货单明细表
 */
export const goodsReceiptItems = mysqlTable("goods_receipt_items", {
  id: int("id").autoincrement().primaryKey(),
  receiptId: int("receiptId").notNull(),
  purchaseOrderItemId: int("purchaseOrderItemId"),
  productId: int("productId"),
  materialCode: varchar("materialCode", { length: 50 }),
  materialName: varchar("materialName", { length: 200 }).notNull(),
  specification: varchar("specification", { length: 200 }),
  unit: varchar("unit", { length: 20 }),
  orderedQty: decimal("orderedQty", { precision: 12, scale: 4 }).notNull(),
  receivedQty: decimal("receivedQty", { precision: 12, scale: 4 }).notNull(),
  batchNo: varchar("batchNo", { length: 50 }),
  sterilizationBatchNo: varchar("sterilizationBatchNo", { length: 50 }),
  inspectionQty: decimal("inspectionQty", { precision: 12, scale: 4 }),
  qualifiedQty: decimal("qualifiedQty", { precision: 12, scale: 4 }),
  unqualifiedQty: decimal("unqualifiedQty", { precision: 12, scale: 4 }),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;
export type InsertGoodsReceiptItem = typeof goodsReceiptItems.$inferInsert;

// ==================== 邮件协同模块 ====================
/**
 * 邮件缓存表（从 IMAP 同步的邮件 + 本地草稿/已发送）
 */
export const emails = mysqlTable("emails", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 512 }),
  folder: mysqlEnum("folder", ["inbox", "sent", "draft", "trash"]).default("inbox").notNull(),
  subject: varchar("subject", { length: 500 }),
  fromAddress: varchar("fromAddress", { length: 320 }),
  fromName: varchar("fromName", { length: 200 }),
  toAddress: text("toAddress"),
  ccAddress: text("ccAddress"),
  bodyHtml: text("bodyHtml"),
  bodyText: text("bodyText"),
  isRead: boolean("isRead").default(false).notNull(),
  isStarred: boolean("isStarred").default(false).notNull(),
  hasAttachment: boolean("hasAttachment").default(false).notNull(),
  sentAt: timestamp("sentAt"),
  receivedAt: timestamp("receivedAt"),
  uid: int("uid"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

/**
 * 邮件附件备案表
 */
export const emailAttachments = mysqlTable("email_attachments", {
  id: int("id").autoincrement().primaryKey(),
  emailId: int("emailId").notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 200 }),
  size: int("size"),
  storagePath: varchar("storagePath", { length: 1000 }),
  downloadedAt: timestamp("downloadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = typeof emailAttachments.$inferInsert;

/**
 * 发件人归档表
 */
export const emailContacts = mysqlTable("email_contacts", {
  id: int("id").autoincrement().primaryKey(),
  emailAddress: varchar("emailAddress", { length: 320 }).notNull().unique(),
  displayName: varchar("displayName", { length: 200 }),
  emailCount: int("emailCount").default(0).notNull(),
  lastEmailAt: timestamp("lastEmailAt"),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailContact = typeof emailContacts.$inferSelect;
export type InsertEmailContact = typeof emailContacts.$inferInsert;

// ==================== 检验要求（IQC/IPQC/OQC 标准） ====================

/**
 * 检验要求主表：按产品编号+产品名称定义检验标准
 */
export const inspectionRequirements = mysqlTable("inspection_requirements", {
  id: int("id").autoincrement().primaryKey(),
  requirementNo: varchar("requirementNo", { length: 50 }).notNull().unique(),
  type: mysqlEnum("type", ["IQC", "IPQC", "OQC"]).notNull(),
  productCode: varchar("productCode", { length: 50 }),
  productName: varchar("productName", { length: 200 }).notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  remark: text("remark"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InspectionRequirement = typeof inspectionRequirements.$inferSelect;
export type InsertInspectionRequirement = typeof inspectionRequirements.$inferInsert;

/**
 * 检验要求明细表：每条检验项目（定性/定量）
 */
export const inspectionRequirementItems = mysqlTable("inspection_requirement_items", {
  id: int("id").autoincrement().primaryKey(),
  requirementId: int("requirementId").notNull(),
  itemName: varchar("itemName", { length: 200 }).notNull(),
  itemType: mysqlEnum("itemType", ["qualitative", "quantitative"]).notNull(),
  standard: varchar("standard", { length: 500 }),
  minVal: decimal("minVal", { precision: 12, scale: 4 }),
  maxVal: decimal("maxVal", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 20 }),
  acceptedValues: varchar("acceptedValues", { length: 500 }),
  sortOrder: int("sortOrder").default(0),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InspectionRequirementItem = typeof inspectionRequirementItems.$inferSelect;
export type InsertInspectionRequirementItem = typeof inspectionRequirementItems.$inferInsert;

// ==================== 来料检验单（IQC 记录） ====================

/**
 * 来料检验单主表：每条对应到货单的一个产品行
 */
export const iqcInspections = mysqlTable("iqc_inspections", {
  id: int("id").autoincrement().primaryKey(),
  inspectionNo: varchar("inspectionNo", { length: 50 }).notNull().unique(),
  reportMode: mysqlEnum("reportMode", ["online", "offline"]).default("online").notNull(),
  goodsReceiptId: int("goodsReceiptId"),
  goodsReceiptNo: varchar("goodsReceiptNo", { length: 50 }),
  goodsReceiptItemId: int("goodsReceiptItemId"),
  productId: int("productId"),
  productCode: varchar("productCode", { length: 50 }),
  productName: varchar("productName", { length: 200 }).notNull(),
  specification: varchar("specification", { length: 200 }),
  supplierId: int("supplierId"),
  supplierName: varchar("supplierName", { length: 200 }),
  supplierCode: varchar("supplierCode", { length: 50 }),
  batchNo: varchar("batchNo", { length: 50 }),
  sterilizationBatchNo: varchar("sterilizationBatchNo", { length: 50 }),
  receivedQty: decimal("receivedQty", { precision: 12, scale: 4 }),
  sampleQty: decimal("sampleQty", { precision: 12, scale: 4 }),
  qualifiedQty: decimal("qualifiedQty", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 20 }),
  inspectionRequirementId: int("inspectionRequirementId"),
  inspectionDate: date("inspectionDate"),
  inspectorId: int("inspectorId"),
  inspectorName: varchar("inspectorName", { length: 64 }),
  result: mysqlEnum("result", ["pending", "passed", "failed", "conditional_pass"]).default("pending").notNull(),
  remark: text("remark"),
  attachments: text("attachments"),
  signatures: text("signatures"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IqcInspection = typeof iqcInspections.$inferSelect;
export type InsertIqcInspection = typeof iqcInspections.$inferInsert;

/**
 * 来料检验单明细表：每条检验项目的实测结果
 */
export const iqcInspectionItems = mysqlTable("iqc_inspection_items", {
  id: int("id").autoincrement().primaryKey(),
  iqcId: int("iqcId").notNull(),
  requirementItemId: int("requirementItemId"),
  itemName: varchar("itemName", { length: 200 }).notNull(),
  itemType: mysqlEnum("itemType", ["qualitative", "quantitative"]).notNull(),
  standard: varchar("standard", { length: 500 }),
  minVal: decimal("minVal", { precision: 12, scale: 4 }),
  maxVal: decimal("maxVal", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 20 }),
  measuredValue: varchar("measuredValue", { length: 100 }),
  sampleValues: text("sampleValues"),
  acceptedValues: varchar("acceptedValues", { length: 500 }),
  actualValue: varchar("actualValue", { length: 200 }),
  conclusion: mysqlEnum("conclusion", ["pass", "fail", "pending"]).default("pending").notNull(),
  sortOrder: int("sortOrder").default(0),
  remark: text("remark"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IqcInspectionItem = typeof iqcInspectionItems.$inferSelect;
export type InsertIqcInspectionItem = typeof iqcInspectionItems.$inferInsert;

// ==================== 获客营销模块 ====================
/**
 * 营销线索表：统一存储国内和海外线索
 */
export const marketingLeads = mysqlTable("marketing_leads", {
  id: int("id").autoincrement().primaryKey(),
  leadNo: varchar("leadNo", { length: 50 }).unique(),
  market: mysqlEnum("market", ["domestic", "overseas"]).notNull().default("overseas"),
  company: varchar("company", { length: 200 }).notNull(),
  contact: varchar("contact", { length: 100 }).notNull(),
  title: varchar("title", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  wechat: varchar("wechat", { length: 100 }),
  country: varchar("country", { length: 50 }),
  province: varchar("province", { length: 50 }),
  region: varchar("region", { length: 50 }),
  customerType: varchar("customerType", { length: 50 }),
  status: mysqlEnum("status", ["new", "contacted", "interested", "quoted", "won", "lost"]).default("new").notNull(),
  grade: mysqlEnum("grade", ["A", "B", "C"]).default("B").notNull(),
  source: varchar("source", { length: 100 }),
  notes: text("notes"),
  nextFollowUp: date("nextFollowUp"),
  assignedToName: varchar("assignedToName", { length: 64 }),
  createdBy: int("createdBy"),
  createdByName: varchar("createdByName", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketingLead = typeof marketingLeads.$inferSelect;
export type InsertMarketingLead = typeof marketingLeads.$inferInsert;

/**
 * 跟进记录表
 */
export const leadFollowUps = mysqlTable("lead_follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  type: mysqlEnum("type", ["call", "wechat", "whatsapp", "email", "meeting", "other"]).notNull().default("call"),
  content: text("content").notNull(),
  result: varchar("result", { length: 200 }),
  nextAction: varchar("nextAction", { length: 200 }),
  nextFollowUpDate: date("nextFollowUpDate"),
  createdByName: varchar("createdByName", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LeadFollowUp = typeof leadFollowUps.$inferSelect;
export type InsertLeadFollowUp = typeof leadFollowUps.$inferInsert;
