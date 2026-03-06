import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

// Parse DATABASE_URL
const parsed = new URL(url);
const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: parseInt(parsed.port),
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.slice(1).split("?")[0],
  ssl: { rejectUnauthorized: true },
});

console.log("Connected to TiDB. Running migrations...\n");

const migrations = [
  // 1. production_orders: add orderType
  {
    desc: "production_orders: add orderType",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_orders' AND COLUMN_NAME='orderType'",
    sql: "ALTER TABLE production_orders ADD COLUMN orderType ENUM('finished','semi_finished','rework') NOT NULL DEFAULT 'finished' AFTER batchNo",
  },
  // 2. production_records: add recordType
  {
    desc: "production_records: add recordType",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_records' AND COLUMN_NAME='recordType'",
    sql: "ALTER TABLE production_records ADD COLUMN recordType ENUM('general','temperature_humidity','material_usage','clean_room','first_piece') NOT NULL DEFAULT 'general' AFTER productionOrderId",
  },
  // 3. production_records: add temperature
  {
    desc: "production_records: add temperature",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_records' AND COLUMN_NAME='temperature'",
    sql: "ALTER TABLE production_records ADD COLUMN temperature DECIMAL(5,2) AFTER recordType",
  },
  // 4. production_records: add humidity
  {
    desc: "production_records: add humidity",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_records' AND COLUMN_NAME='humidity'",
    sql: "ALTER TABLE production_records ADD COLUMN humidity DECIMAL(5,2) AFTER temperature",
  },
  // 5. production_records: add materialCode
  {
    desc: "production_records: add materialCode",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_records' AND COLUMN_NAME='materialCode'",
    sql: "ALTER TABLE production_records ADD COLUMN materialCode VARCHAR(100) AFTER humidity",
  },
  // 6. production_records: add materialName
  {
    desc: "production_records: add materialName",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_records' AND COLUMN_NAME='materialName'",
    sql: "ALTER TABLE production_records ADD COLUMN materialName VARCHAR(200) AFTER materialCode",
  },
  // 7. production_records: add materialUsedQty
  {
    desc: "production_records: add materialUsedQty",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_records' AND COLUMN_NAME='materialUsedQty'",
    sql: "ALTER TABLE production_records ADD COLUMN materialUsedQty DECIMAL(10,3) AFTER materialName",
  },
  // 8. production_records: add materialUnit
  {
    desc: "production_records: add materialUnit",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_records' AND COLUMN_NAME='materialUnit'",
    sql: "ALTER TABLE production_records ADD COLUMN materialUnit VARCHAR(20) AFTER materialUsedQty",
  },
  // 9. sterilization_orders: add sterilizationBatchNo
  {
    desc: "sterilization_orders: add sterilizationBatchNo",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' AND COLUMN_NAME='sterilizationBatchNo'",
    sql: "ALTER TABLE sterilization_orders ADD COLUMN sterilizationBatchNo VARCHAR(100) UNIQUE AFTER batchNo",
  },
  // 10. sterilization_orders: add arrivedAt
  {
    desc: "sterilization_orders: add arrivedAt",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' AND COLUMN_NAME='arrivedAt'",
    sql: "ALTER TABLE sterilization_orders ADD COLUMN arrivedAt TIMESTAMP AFTER sterilizationBatchNo",
  },
  // 11. sterilization_orders: add arrivedBy
  {
    desc: "sterilization_orders: add arrivedBy",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' AND COLUMN_NAME='arrivedBy'",
    sql: "ALTER TABLE sterilization_orders ADD COLUMN arrivedBy INT AFTER arrivedAt",
  },
  // 12. production_warehouse_entries: add sterilizedQty
  {
    desc: "production_warehouse_entries: add sterilizedQty",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_warehouse_entries' AND COLUMN_NAME='sterilizedQty'",
    sql: "ALTER TABLE production_warehouse_entries ADD COLUMN sterilizedQty INT AFTER quantity",
  },
  // 13. production_warehouse_entries: add inspectionRejectQty
  {
    desc: "production_warehouse_entries: add inspectionRejectQty",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_warehouse_entries' AND COLUMN_NAME='inspectionRejectQty'",
    sql: "ALTER TABLE production_warehouse_entries ADD COLUMN inspectionRejectQty INT DEFAULT 0 AFTER sterilizedQty",
  },
  // 14. production_warehouse_entries: add sampleQty
  {
    desc: "production_warehouse_entries: add sampleQty",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_warehouse_entries' AND COLUMN_NAME='sampleQty'",
    sql: "ALTER TABLE production_warehouse_entries ADD COLUMN sampleQty INT DEFAULT 0 AFTER inspectionRejectQty",
  },
  // 15. production_warehouse_entries: add modifyReason
  {
    desc: "production_warehouse_entries: add modifyReason",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_warehouse_entries' AND COLUMN_NAME='modifyReason'",
    sql: "ALTER TABLE production_warehouse_entries ADD COLUMN modifyReason TEXT AFTER sampleQty",
  },
  // 16. production_warehouse_entries: add modifiedBy
  {
    desc: "production_warehouse_entries: add modifiedBy",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='production_warehouse_entries' AND COLUMN_NAME='modifiedBy'",
    sql: "ALTER TABLE production_warehouse_entries ADD COLUMN modifiedBy INT AFTER modifyReason",
  },
  // 17. quality_inspections: add rejectQty
  {
    desc: "quality_inspections: add rejectQty",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quality_inspections' AND COLUMN_NAME='rejectQty'",
    sql: "ALTER TABLE quality_inspections ADD COLUMN rejectQty INT DEFAULT 0 AFTER defectQty",
  },
  // 18. quality_inspections: add sampleQty
  {
    desc: "quality_inspections: add sampleQty (OQC留样)",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quality_inspections' AND COLUMN_NAME='sampleRetainQty'",
    sql: "ALTER TABLE quality_inspections ADD COLUMN sampleRetainQty INT DEFAULT 0 AFTER rejectQty",
  },
  // 19. purchase_orders: add deptApprovalStatus
  {
    desc: "purchase_orders: add deptApprovalStatus",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='deptApprovalStatus'",
    sql: "ALTER TABLE purchase_orders ADD COLUMN deptApprovalStatus ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER status",
  },
  // 20. purchase_orders: add gmApprovalStatus
  {
    desc: "purchase_orders: add gmApprovalStatus",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='gmApprovalStatus'",
    sql: "ALTER TABLE purchase_orders ADD COLUMN gmApprovalStatus ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER deptApprovalStatus",
  },
  // 21. purchase_orders: add printedAt
  {
    desc: "purchase_orders: add printedAt",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='printedAt'",
    sql: "ALTER TABLE purchase_orders ADD COLUMN printedAt TIMESTAMP AFTER gmApprovalStatus",
  },
  // 22. product_supplier_prices table
  {
    desc: "create product_supplier_prices table",
    check: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='product_supplier_prices'",
    sql: `CREATE TABLE IF NOT EXISTS product_supplier_prices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      productId INT NOT NULL,
      supplierId INT NOT NULL,
      unitPrice DECIMAL(15,4) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
      minOrderQty INT DEFAULT 1,
      leadTimeDays INT DEFAULT 0,
      isDefault TINYINT(1) NOT NULL DEFAULT 0,
      effectiveDate DATE,
      expiryDate DATE,
      remark TEXT,
      createdBy INT,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
  },
];

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const m of migrations) {
  try {
    const [rows] = await connection.execute(m.check);
    if (rows.length > 0) {
      console.log(`  ⏭  SKIP: ${m.desc}`);
      skipCount++;
    } else {
      await connection.execute(m.sql);
      console.log(`  ✅ OK:   ${m.desc}`);
      successCount++;
    }
  } catch (err) {
    console.error(`  ❌ ERR:  ${m.desc} — ${err.message}`);
    errorCount++;
  }
}

await connection.end();
console.log(`\nDone! ✅ ${successCount} applied, ⏭ ${skipCount} skipped, ❌ ${errorCount} errors`);
