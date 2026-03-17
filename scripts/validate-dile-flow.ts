import "dotenv/config";
import mysql from "mysql2/promise";
import { appRouter } from "../server/routers";
import {
  createAccountsPayable,
  createAccountsReceivable,
  createCustomer,
  createInventoryTransaction,
  createIssuedInvoice,
  createInternalSalesOrderFromPurchaseOrder,
  createPaymentRecord,
  createProduct,
  createPurchaseOrder,
  createReceivedInvoice,
  createSalesOrder,
  createSupplier,
  ensureCompanyProductCopy,
} from "../server/db";

const PREFIX = "DL-VAL-";
const TAG = "[DL-FLOW-VALIDATION-2026-03-16]";
const MAIN_COMPANY_ID = 3;
const DILE_COMPANY_ID = 1;

type BasicUser = {
  id: number;
  name: string;
  openId: string;
  role: string;
  department: string | null;
  companyId: number;
};

type CompanyEntity = {
  id: number;
  code?: string | null;
  name: string;
};

type BankAccountRow = {
  id: number;
  accountName: string;
  bankName: string;
  accountNo: string;
};

function toMoney(value: number) {
  return value.toFixed(2);
}

function splitTax(totalAmount: number, taxRate = 13) {
  const divisor = 1 + taxRate / 100;
  const amountExTax = Math.round((totalAmount / divisor) * 100) / 100;
  const taxAmount = Math.round((totalAmount - amountExTax) * 100) / 100;
  return {
    amountExTax: toMoney(amountExTax),
    taxAmount: toMoney(taxAmount),
  };
}

function buildCaller(user: BasicUser, companyId: number, homeCompanyId = companyId) {
  return appRouter.createCaller({
    req: {} as any,
    res: {} as any,
    user: {
      ...user,
      companyId,
      homeCompanyId,
      isCompanyAdmin: true,
    } as any,
  });
}

async function execute(conn: mysql.Connection, sql: string, params: unknown[] = []) {
  await conn.execute(sql, params);
}

async function queryRows<T = any>(conn: mysql.Connection, sql: string, params: unknown[] = []) {
  const [rows] = await conn.query(sql, params);
  return rows as T[];
}

async function queryOne<T = any>(conn: mysql.Connection, sql: string, params: unknown[] = []) {
  const rows = await queryRows<T>(conn, sql, params);
  return rows[0];
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(conn: mysql.Connection) {
  const likePrefix = `${PREFIX}%`;
  const likeTag = `%${TAG}%`;

  await execute(
    conn,
    "DELETE FROM payment_records WHERE recordNo LIKE ? OR relatedNo LIKE ? OR remark LIKE ?",
    [likePrefix, likePrefix, likeTag],
  );
  await execute(
    conn,
    "DELETE FROM issued_invoices WHERE invoiceNo LIKE ? OR relatedOrderNo LIKE ? OR remark LIKE ?",
    [likePrefix, likePrefix, likeTag],
  );
  await execute(
    conn,
    "DELETE FROM received_invoices WHERE invoiceNo LIKE ? OR relatedOrderNo LIKE ? OR remark LIKE ?",
    [likePrefix, likePrefix, likeTag],
  );
  await execute(
    conn,
    "DELETE FROM accounts_receivable WHERE invoiceNo LIKE ? OR remark LIKE ?",
    [likePrefix, likeTag],
  );
  await execute(
    conn,
    "DELETE FROM accounts_payable WHERE invoiceNo LIKE ? OR remark LIKE ?",
    [likePrefix, likeTag],
  );
  await execute(
    conn,
    "DELETE FROM inventory_transactions WHERE documentNo LIKE ? OR documentNo LIKE ? OR remark LIKE ? OR itemName LIKE ? OR batchNo LIKE ?",
    [likePrefix, "IC-IN-1-DL-VAL%", likeTag, "DL验证%", likePrefix],
  );
  await execute(
    conn,
    "DELETE FROM inventory WHERE itemName LIKE ? OR materialCode LIKE ? OR batchNo LIKE ?",
    ["DL验证%", likePrefix, likePrefix],
  );
  await execute(
    conn,
    "DELETE FROM sales_order_items WHERE orderId IN (SELECT id FROM sales_orders WHERE orderNo LIKE ? OR remark LIKE ?)",
    [likePrefix, `%${PREFIX}%`],
  );
  await execute(
    conn,
    "DELETE FROM sales_orders WHERE orderNo LIKE ? OR remark LIKE ?",
    [likePrefix, `%${PREFIX}%`],
  );
  await execute(
    conn,
    "DELETE FROM purchase_order_items WHERE orderId IN (SELECT id FROM purchase_orders WHERE orderNo LIKE ? OR remark LIKE ?)",
    [likePrefix, likeTag],
  );
  await execute(
    conn,
    "DELETE FROM purchase_orders WHERE orderNo LIKE ? OR remark LIKE ?",
    [likePrefix, likeTag],
  );
  await execute(
    conn,
    "DELETE FROM products WHERE code LIKE ? OR name LIKE ? OR description LIKE ?",
    [likePrefix, "DL验证%", likeTag],
  );
  await execute(
    conn,
    "DELETE FROM suppliers WHERE code LIKE ? OR name LIKE ? OR address LIKE ?",
    [likePrefix, "DL验证%", likeTag],
  );
  await execute(
    conn,
    "DELETE FROM customers WHERE code LIKE ? OR name LIKE ? OR address LIKE ?",
    [likePrefix, "DL验证%", likeTag],
  );
}

async function main() {
  assertCondition(process.env.DATABASE_URL, "DATABASE_URL 未配置");
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    await cleanup(conn);

    const dileAdmin = await queryOne<BasicUser>(
      conn,
      "SELECT id, name, openId, role, department, companyId FROM users WHERE companyId = 1 AND role = 'admin' ORDER BY id LIMIT 1",
    );
    const mainAdmin = await queryOne<BasicUser>(
      conn,
      "SELECT id, name, openId, role, department, companyId FROM users WHERE companyId = 3 AND role = 'admin' ORDER BY id LIMIT 1",
    );
    const internalSupplier = await queryOne<CompanyEntity>(
      conn,
      "SELECT id, code, name FROM suppliers WHERE companyId = 1 AND linkedCompanyId = 3 ORDER BY id LIMIT 1",
    );
    const dileVirtualWarehouse = await queryOne<{ id: number; code: string; name: string }>(
      conn,
      "SELECT id, code, name FROM warehouses WHERE companyId = 1 AND code = 'VWH-1' LIMIT 1",
    );
    const mainFinishedWarehouse = await queryOne<{ id: number; code: string; name: string }>(
      conn,
      "SELECT id, code, name FROM warehouses WHERE companyId = 3 AND code = 'WH-FG-01' LIMIT 1",
    );
    const bankAccount = await queryOne<BankAccountRow>(
      conn,
      "SELECT id, accountName, bankName, accountNo FROM bank_accounts WHERE status = 'active' AND currency = 'CNY' ORDER BY isDefault DESC, id DESC LIMIT 1",
    );

    assertCondition(dileAdmin, "未找到滴乐管理员");
    assertCondition(mainAdmin, "未找到神韵管理员");
    assertCondition(internalSupplier, "未找到滴乐内部供应商（神韵）");
    assertCondition(dileVirtualWarehouse, "未找到滴乐虚拟仓");
    assertCondition(mainFinishedWarehouse, "未找到神韵成品仓");
    assertCondition(bankAccount, "未找到可用的人民币银行账户");

    const dileCaller = buildCaller(dileAdmin, DILE_COMPANY_ID);
    const mainCaller = buildCaller(mainAdmin, MAIN_COMPANY_ID);

    const mainProductId = await createProduct({
      companyId: MAIN_COMPANY_ID,
      code: `${PREFIX}PROD-001`,
      name: "DL验证协同流转套包",
      specification: "标准版",
      unit: "套",
      status: "active",
      sourceType: "purchase",
      salePermission: "saleable",
      procurePermission: "purchasable",
      description: `${TAG} 神韵主公司基准产品`,
      createdBy: mainAdmin.id,
      isMedicalDevice: false,
      isSterilized: false,
    } as any);

    const dileProduct = await ensureCompanyProductCopy(
      Number(mainProductId),
      DILE_COMPANY_ID,
      dileAdmin.id,
    );
    const dileProductId = Number((dileProduct as any)?.id || 0);
    assertCondition(dileProductId > 0, "滴乐产品复制失败");

    const externalSupplierId = await createSupplier({
      companyId: DILE_COMPANY_ID,
      code: `${PREFIX}SUP-001`,
      name: "DL验证外部供应商",
      shortName: "验证外供",
      type: "material",
      contactPerson: "王磊",
      phone: "13800010001",
      email: "supplier@dl-validation.test",
      address: `${TAG} 滴乐外部采购供应商`,
      paymentTerms: "账期支付",
      creditDays: 30,
      bankAccount: "6222020202020202020",
      taxNo: "91320500DLVALSUP01",
      status: "qualified",
      createdBy: dileAdmin.id,
    } as any);

    const externalCustomerId = await createCustomer({
      companyId: DILE_COMPANY_ID,
      code: `${PREFIX}CUST-001`,
      name: "DL验证终端客户",
      shortName: "验证客户",
      type: "dealer",
      contactPerson: "李欣",
      phone: "13800010002",
      email: "customer@dl-validation.test",
      address: `${TAG} 滴乐外部销售客户`,
      province: "江苏省",
      city: "苏州市",
      country: "中国",
      paymentTerms: "账期支付",
      currency: "CNY",
      creditLimit: "50000.00",
      taxNo: "91320500DLVALCUST1",
      taxRate: "13.00",
      bankName: bankAccount.bankName,
      bankAccount: bankAccount.accountNo,
      status: "active",
      source: "滴乐流程验证",
      needInvoice: true,
      salesPersonId: dileAdmin.id,
      createdBy: dileAdmin.id,
    } as any);

    await createInventoryTransaction({
      companyId: MAIN_COMPANY_ID,
      warehouseId: mainFinishedWarehouse.id,
      productId: Number(mainProductId),
      type: "other_in",
      documentNo: `${PREFIX}MAIN-STOCK-001`,
      itemName: "DL验证协同流转套包",
      batchNo: `${PREFIX}BATCH-INT-001`,
      quantity: "300",
      unit: "套",
      remark: `${TAG} 神韵主公司备货`,
      operatorId: mainAdmin.id,
    } as any);

    const internalPurchaseOrderNo = `${PREFIX}PO-INT-001`;
    const internalPurchaseOrderId = await createPurchaseOrder(
      {
        companyId: DILE_COMPANY_ID,
        internalCompanyId: MAIN_COMPANY_ID,
        orderNo: internalPurchaseOrderNo,
        supplierId: internalSupplier.id,
        orderDate: "2026-03-16",
        expectedDate: "2026-03-20",
        totalAmount: "1020.00",
        totalAmountBase: "1020.00",
        currency: "CNY",
        exchangeRate: "1",
        status: "ordered",
        paymentStatus: "unpaid",
        remark: `${TAG} 滴乐向神韵内部采购`,
        buyerId: dileAdmin.id,
        createdBy: dileAdmin.id,
      } as any,
      [
        {
          productId: dileProductId,
          materialCode: String((dileProduct as any)?.code || ""),
          materialName: "DL验证协同流转套包",
          specification: "标准版",
          quantity: "120",
          unit: "套",
          unitPrice: "8.5000",
          amount: "1020.00",
          remark: `${TAG} 内部采购明细`,
        } as any,
      ],
    );

    const linkedMainSalesOrderId = await createInternalSalesOrderFromPurchaseOrder(
      internalPurchaseOrderId,
      mainAdmin.id,
    );
    assertCondition(linkedMainSalesOrderId > 0, "内部采购未生成神韵销售订单");

    await mainCaller.inventoryTransactions.create({
      warehouseId: mainFinishedWarehouse.id,
      productId: Number(mainProductId),
      type: "sales_out",
      documentNo: `${PREFIX}SO-INT-OUT-001`,
      itemName: "DL验证协同流转套包",
      batchNo: `${PREFIX}BATCH-INT-001`,
      quantity: "120",
      unit: "套",
      relatedOrderId: linkedMainSalesOrderId,
      remark: `${TAG} 神韵向滴乐发货`,
    });
    await mainCaller.salesOrders.syncShipmentStatus({
      orderId: linkedMainSalesOrderId,
    });

    const internalPayableId = await createAccountsPayable({
      companyId: DILE_COMPANY_ID,
      invoiceNo: `${PREFIX}AP-INT-001`,
      supplierId: internalSupplier.id,
      supplierName: internalSupplier.name,
      purchaseOrderId: internalPurchaseOrderId,
      amount: "1020.00",
      paidAmount: "1020.00",
      currency: "CNY",
      amountBase: "1020.00",
      exchangeRate: "1",
      bankAccountId: bankAccount.id,
      invoiceDate: "2026-03-16",
      dueDate: "2026-04-15",
      paymentMethod: "账期支付",
      paymentDate: "2026-03-16",
      status: "paid",
      remark: `${TAG} 内部采购应付`,
      createdBy: dileAdmin.id,
    } as any);
    const internalPurchaseTax = splitTax(1020);
    await createReceivedInvoice({
      companyId: DILE_COMPANY_ID,
      invoiceNo: `${PREFIX}RINV-INT-001`,
      invoiceType: "vat_special",
      supplierId: internalSupplier.id,
      supplierName: internalSupplier.name,
      payableIds: [internalPayableId],
      relatedOrderNo: internalPurchaseOrderNo,
      invoiceDate: "2026-03-16",
      receiveDate: "2026-03-16",
      amountExTax: internalPurchaseTax.amountExTax,
      taxRate: "13.00",
      taxAmount: internalPurchaseTax.taxAmount,
      totalAmount: "1020.00",
      status: "booked",
      remark: `${TAG} 内部采购收票`,
      createdBy: dileAdmin.id,
    } as any);
    await createPaymentRecord({
      companyId: DILE_COMPANY_ID,
      recordNo: `${PREFIX}PAY-INT-001`,
      type: "payment",
      relatedType: "purchase_order",
      relatedId: internalPurchaseOrderId,
      relatedNo: internalPurchaseOrderNo,
      supplierId: internalSupplier.id,
      amount: "1020.00",
      currency: "CNY",
      amountBase: "1020.00",
      exchangeRate: "1",
      bankAccountId: bankAccount.id,
      paymentDate: "2026-03-16",
      paymentMethod: "银行转账",
      remark: `${TAG} 内部采购付款`,
      operatorId: dileAdmin.id,
    } as any);

    const externalPurchaseOrderNo = `${PREFIX}PO-EXT-001`;
    const externalPurchaseOrderId = await createPurchaseOrder(
      {
        companyId: DILE_COMPANY_ID,
        orderNo: externalPurchaseOrderNo,
        supplierId: externalSupplierId,
        orderDate: "2026-03-16",
        expectedDate: "2026-03-18",
        totalAmount: "320.00",
        totalAmountBase: "320.00",
        currency: "CNY",
        exchangeRate: "1",
        status: "ordered",
        paymentStatus: "unpaid",
        remark: `${TAG} 滴乐外部采购`,
        buyerId: dileAdmin.id,
        createdBy: dileAdmin.id,
      } as any,
      [
        {
          productId: dileProductId,
          materialCode: String((dileProduct as any)?.code || ""),
          materialName: "DL验证协同流转套包",
          specification: "标准版",
          quantity: "40",
          unit: "套",
          unitPrice: "8.0000",
          amount: "320.00",
          remark: `${TAG} 外部采购明细`,
        } as any,
      ],
    );

    await dileCaller.inventoryTransactions.create({
      warehouseId: dileVirtualWarehouse.id,
      productId: dileProductId,
      type: "purchase_in",
      documentNo: `${PREFIX}IN-EXT-001`,
      itemName: "DL验证协同流转套包",
      batchNo: `${PREFIX}BATCH-EXT-001`,
      quantity: "40",
      unit: "套",
      relatedOrderId: externalPurchaseOrderId,
      remark: `${TAG} 滴乐外部采购虚拟入库`,
    });

    const externalPayableId = await createAccountsPayable({
      companyId: DILE_COMPANY_ID,
      invoiceNo: `${PREFIX}AP-EXT-001`,
      supplierId: externalSupplierId,
      supplierName: "DL验证外部供应商",
      purchaseOrderId: externalPurchaseOrderId,
      amount: "320.00",
      paidAmount: "320.00",
      currency: "CNY",
      amountBase: "320.00",
      exchangeRate: "1",
      bankAccountId: bankAccount.id,
      invoiceDate: "2026-03-16",
      dueDate: "2026-04-15",
      paymentMethod: "账期支付",
      paymentDate: "2026-03-16",
      status: "paid",
      remark: `${TAG} 外部采购应付`,
      createdBy: dileAdmin.id,
    } as any);
    const externalPurchaseTax = splitTax(320);
    await createReceivedInvoice({
      companyId: DILE_COMPANY_ID,
      invoiceNo: `${PREFIX}RINV-EXT-001`,
      invoiceType: "vat_special",
      supplierId: externalSupplierId,
      supplierName: "DL验证外部供应商",
      payableIds: [externalPayableId],
      relatedOrderNo: externalPurchaseOrderNo,
      invoiceDate: "2026-03-16",
      receiveDate: "2026-03-16",
      amountExTax: externalPurchaseTax.amountExTax,
      taxRate: "13.00",
      taxAmount: externalPurchaseTax.taxAmount,
      totalAmount: "320.00",
      status: "booked",
      remark: `${TAG} 外部采购收票`,
      createdBy: dileAdmin.id,
    } as any);
    await createPaymentRecord({
      companyId: DILE_COMPANY_ID,
      recordNo: `${PREFIX}PAY-EXT-001`,
      type: "payment",
      relatedType: "purchase_order",
      relatedId: externalPurchaseOrderId,
      relatedNo: externalPurchaseOrderNo,
      supplierId: externalSupplierId,
      amount: "320.00",
      currency: "CNY",
      amountBase: "320.00",
      exchangeRate: "1",
      bankAccountId: bankAccount.id,
      paymentDate: "2026-03-16",
      paymentMethod: "银行转账",
      remark: `${TAG} 外部采购付款`,
      operatorId: dileAdmin.id,
    } as any);

    const externalSalesOrderNo = `${PREFIX}SO-EXT-001`;
    const externalSalesOrderId = await createSalesOrder(
      {
        companyId: DILE_COMPANY_ID,
        orderNo: externalSalesOrderNo,
        customerId: externalCustomerId,
        orderDate: "2026-03-16",
        deliveryDate: "2026-03-19",
        totalAmount: "1350.00",
        totalAmountBase: "1350.00",
        currency: "CNY",
        exchangeRate: "1",
        paymentMethod: "账期支付",
        status: "approved",
        paymentStatus: "unpaid",
        salesPersonId: dileAdmin.id,
        shippingAddress: `${TAG} 滴乐销售发货地址`,
        shippingContact: "李欣",
        shippingPhone: "13800010002",
        remark: `${TAG} 滴乐外部销售`,
        createdBy: dileAdmin.id,
      } as any,
      [
        {
          productId: dileProductId,
          quantity: "90",
          unit: "套",
          unitPrice: "15.0000",
          amount: "1350.00",
          remark: `${TAG} 外部销售明细`,
        } as any,
      ],
    );

    await dileCaller.inventoryTransactions.create({
      warehouseId: dileVirtualWarehouse.id,
      productId: dileProductId,
      type: "sales_out",
      documentNo: `${PREFIX}OUT-EXT-001`,
      itemName: "DL验证协同流转套包",
      batchNo: `${PREFIX}BATCH-INT-001`,
      quantity: "90",
      unit: "套",
      relatedOrderId: externalSalesOrderId,
      remark: `${TAG} 滴乐虚拟仓销售出库`,
    });
    await dileCaller.salesOrders.syncShipmentStatus({
      orderId: externalSalesOrderId,
    });

    const receivableId = await createAccountsReceivable({
      companyId: DILE_COMPANY_ID,
      invoiceNo: `${PREFIX}AR-EXT-001`,
      customerId: externalCustomerId,
      salesOrderId: externalSalesOrderId,
      amount: "1350.00",
      paidAmount: "1350.00",
      currency: "CNY",
      amountBase: "1350.00",
      exchangeRate: "1",
      bankAccountId: bankAccount.id,
      invoiceDate: "2026-03-16",
      dueDate: "2026-04-15",
      paymentMethod: "账期支付",
      receiptDate: "2026-03-16",
      status: "paid",
      remark: `${TAG} 外部销售应收`,
      createdBy: dileAdmin.id,
    } as any);
    const externalSalesTax = splitTax(1350);
    await createIssuedInvoice({
      companyId: DILE_COMPANY_ID,
      invoiceNo: `${PREFIX}INV-EXT-001`,
      invoiceType: "vat_special",
      customerId: externalCustomerId,
      customerName: "DL验证终端客户",
      receivableIds: [receivableId],
      relatedOrderNo: externalSalesOrderNo,
      reconcileMonth: "2026-03",
      invoiceDate: "2026-03-16",
      amountExTax: externalSalesTax.amountExTax,
      taxRate: "13.00",
      taxAmount: externalSalesTax.taxAmount,
      totalAmount: "1350.00",
      bankAccountId: bankAccount.id,
      bankAccount: `${bankAccount.accountName} ${bankAccount.accountNo}`,
      status: "issued",
      remark: `${TAG} 外部销售开票`,
      createdBy: dileAdmin.id,
    } as any);
    await createPaymentRecord({
      companyId: DILE_COMPANY_ID,
      recordNo: `${PREFIX}REC-EXT-001`,
      type: "receipt",
      relatedType: "sales_order",
      relatedId: externalSalesOrderId,
      relatedNo: externalSalesOrderNo,
      customerId: externalCustomerId,
      amount: "1350.00",
      currency: "CNY",
      amountBase: "1350.00",
      exchangeRate: "1",
      bankAccountId: bankAccount.id,
      paymentDate: "2026-03-16",
      paymentMethod: "银行转账",
      remark: `${TAG} 外部销售收款`,
      operatorId: dileAdmin.id,
    } as any);

    const internalPurchaseOrder = await queryOne<{
      status: string;
      paymentStatus: string;
      linkedSalesOrderId: number;
    }>(
      conn,
      "SELECT status, paymentStatus, linkedSalesOrderId FROM purchase_orders WHERE id = ?",
      [internalPurchaseOrderId],
    );
    const externalPurchaseOrder = await queryOne<{
      status: string;
      paymentStatus: string;
    }>(
      conn,
      "SELECT status, paymentStatus FROM purchase_orders WHERE id = ?",
      [externalPurchaseOrderId],
    );
    const externalSalesOrder = await queryOne<{
      status: string;
      paymentStatus: string;
    }>(
      conn,
      "SELECT status, paymentStatus FROM sales_orders WHERE id = ?",
      [externalSalesOrderId],
    );
    const linkedMainSalesOrder = await queryOne<{
      companyId: number;
      status: string;
      sourceCompanyId: number;
      sourcePurchaseOrderId: number;
    }>(
      conn,
      "SELECT companyId, status, sourceCompanyId, sourcePurchaseOrderId FROM sales_orders WHERE id = ?",
      [linkedMainSalesOrderId],
    );
    const linkedInbound = await queryOne<{
      companyId: number;
      type: string;
      documentNo: string;
      relatedOrderId: number;
    }>(
      conn,
      "SELECT companyId, type, documentNo, relatedOrderId FROM inventory_transactions WHERE companyId = 1 AND type = 'purchase_in' AND relatedOrderId = ? ORDER BY id DESC LIMIT 1",
      [internalPurchaseOrderId],
    );
    const copiedProduct = await queryOne<{
      companyId: number;
      sourceProductId: number;
    }>(
      conn,
      "SELECT companyId, sourceProductId FROM products WHERE id = ?",
      [dileProductId],
    );

    assertCondition(
      internalPurchaseOrder?.status === "completed",
      `滴乐内部采购单状态异常：${internalPurchaseOrder?.status || "unknown"}`,
    );
    assertCondition(
      internalPurchaseOrder?.paymentStatus === "paid",
      `滴乐内部采购单付款状态异常：${internalPurchaseOrder?.paymentStatus || "unknown"}`,
    );
    assertCondition(
      externalPurchaseOrder?.status === "completed",
      `滴乐外部采购单状态异常：${externalPurchaseOrder?.status || "unknown"}`,
    );
    assertCondition(
      externalPurchaseOrder?.paymentStatus === "paid",
      `滴乐外部采购单付款状态异常：${externalPurchaseOrder?.paymentStatus || "unknown"}`,
    );
    assertCondition(
      externalSalesOrder?.status === "completed",
      `滴乐外部销售单状态异常：${externalSalesOrder?.status || "unknown"}`,
    );
    assertCondition(
      externalSalesOrder?.paymentStatus === "paid",
      `滴乐外部销售单付款状态异常：${externalSalesOrder?.paymentStatus || "unknown"}`,
    );
    assertCondition(
      linkedMainSalesOrder?.companyId === MAIN_COMPANY_ID &&
        linkedMainSalesOrder?.sourceCompanyId === DILE_COMPANY_ID &&
        linkedMainSalesOrder?.sourcePurchaseOrderId === internalPurchaseOrderId,
      "神韵镜像销售单未正确绑定滴乐内部采购单",
    );
    assertCondition(
      linkedMainSalesOrder?.status === "completed",
      `神韵镜像销售单状态异常：${linkedMainSalesOrder?.status || "unknown"}`,
    );
    assertCondition(
      linkedInbound?.companyId === DILE_COMPANY_ID &&
        linkedInbound?.type === "purchase_in" &&
        linkedInbound?.relatedOrderId === internalPurchaseOrderId,
      "滴乐虚拟采购入库未自动生成",
    );
    assertCondition(
      copiedProduct?.companyId === DILE_COMPANY_ID &&
        Number(copiedProduct?.sourceProductId || 0) === Number(mainProductId),
      "滴乐物料没有正确记录主公司产品ID",
    );

    const isolation = {
      dileProducts: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM products WHERE companyId = 1 AND code LIKE ?",
        [`${PREFIX}%`],
      ),
      dileCustomers: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM customers WHERE companyId = 1 AND code LIKE ?",
        [`${PREFIX}%`],
      ),
      dileSuppliers: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM suppliers WHERE companyId = 1 AND code LIKE ?",
        [`${PREFIX}%`],
      ),
      dilePurchaseOrders: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM purchase_orders WHERE companyId = 1 AND orderNo LIKE ?",
        [`${PREFIX}%`],
      ),
      dileSalesOrders: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM sales_orders WHERE companyId = 1 AND orderNo LIKE ?",
        [`${PREFIX}%`],
      ),
      dileReceivables: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM accounts_receivable WHERE companyId = 1 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
      dilePayables: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM accounts_payable WHERE companyId = 1 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
      dilePayments: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM payment_records WHERE companyId = 1 AND recordNo LIKE ?",
        [`${PREFIX}%`],
      ),
      dileReceivedInvoices: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM received_invoices WHERE companyId = 1 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
      dileIssuedInvoices: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM issued_invoices WHERE companyId = 1 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunCustomersLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM customers WHERE companyId = 3 AND code LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunSuppliersLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM suppliers WHERE companyId = 3 AND code LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunPurchaseOrdersLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM purchase_orders WHERE companyId = 3 AND orderNo LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunReceivablesLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM accounts_receivable WHERE companyId = 3 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunPayablesLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM accounts_payable WHERE companyId = 3 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunPaymentsLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM payment_records WHERE companyId = 3 AND recordNo LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunReceivedInvoicesLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM received_invoices WHERE companyId = 3 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
      shenyunIssuedInvoicesLeak: await queryOne<{ count: number }>(
        conn,
        "SELECT COUNT(*) AS count FROM issued_invoices WHERE companyId = 3 AND invoiceNo LIKE ?",
        [`${PREFIX}%`],
      ),
    };

    assertCondition(isolation.dileProducts?.count === 1, "滴乐产品测试数据数量异常");
    assertCondition(isolation.dileCustomers?.count === 1, "滴乐客户测试数据数量异常");
    assertCondition(isolation.dileSuppliers?.count === 1, "滴乐外部供应商测试数据数量异常");
    assertCondition(isolation.dilePurchaseOrders?.count === 2, "滴乐采购单测试数据数量异常");
    assertCondition(isolation.dileSalesOrders?.count === 1, "滴乐销售单测试数据数量异常");
    assertCondition(isolation.dileReceivables?.count === 1, "滴乐应收测试数据数量异常");
    assertCondition(isolation.dilePayables?.count === 2, "滴乐应付测试数据数量异常");
    assertCondition(isolation.dilePayments?.count === 3, "滴乐收付款测试数据数量异常");
    assertCondition(isolation.dileReceivedInvoices?.count === 2, "滴乐收票测试数据数量异常");
    assertCondition(isolation.dileIssuedInvoices?.count === 1, "滴乐开票测试数据数量异常");
    assertCondition(isolation.shenyunCustomersLeak?.count === 0, "神韵出现了滴乐客户串库");
    assertCondition(isolation.shenyunSuppliersLeak?.count === 0, "神韵出现了滴乐供应商串库");
    assertCondition(isolation.shenyunPurchaseOrdersLeak?.count === 0, "神韵出现了滴乐采购单串库");
    assertCondition(isolation.shenyunReceivablesLeak?.count === 0, "神韵出现了滴乐应收串库");
    assertCondition(isolation.shenyunPayablesLeak?.count === 0, "神韵出现了滴乐应付串库");
    assertCondition(isolation.shenyunPaymentsLeak?.count === 0, "神韵出现了滴乐收付款串库");
    assertCondition(isolation.shenyunReceivedInvoicesLeak?.count === 0, "神韵出现了滴乐收票串库");
    assertCondition(isolation.shenyunIssuedInvoicesLeak?.count === 0, "神韵出现了滴乐开票串库");

    const result = {
      product: {
        mainProductId,
        dileProductId,
      },
      documents: {
        internalPurchaseOrderNo,
        externalPurchaseOrderNo,
        externalSalesOrderNo,
        linkedMainSalesOrderId,
        linkedInboundDocumentNo: linkedInbound?.documentNo || null,
      },
      statuses: {
        internalPurchaseOrder,
        externalPurchaseOrder,
        externalSalesOrder,
        linkedMainSalesOrder,
      },
      isolation,
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
