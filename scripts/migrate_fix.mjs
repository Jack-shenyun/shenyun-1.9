import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const parsed = new URL(url);
const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: parseInt(parsed.port),
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.slice(1).split("?")[0],
  ssl: { rejectUnauthorized: true },
});

console.log("Connected. Running fix migrations...\n");

// Check existing columns in quality_inspections
const [qiCols] = await connection.execute(
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quality_inspections' ORDER BY ORDINAL_POSITION"
);
console.log("quality_inspections columns:", qiCols.map(r => r.COLUMN_NAME).join(", "));

// Check existing columns in sterilization_orders
const [soCols] = await connection.execute(
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' ORDER BY ORDINAL_POSITION"
);
console.log("sterilization_orders columns:", soCols.map(r => r.COLUMN_NAME).join(", "));

const fixes = [
  // sterilization_orders: add sterilizationBatchNo without UNIQUE first, then add unique index
  {
    desc: "sterilization_orders: add sterilizationBatchNo column",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' AND COLUMN_NAME='sterilizationBatchNo'",
    sql: "ALTER TABLE sterilization_orders ADD COLUMN sterilizationBatchNo VARCHAR(100)",
  },
  {
    desc: "sterilization_orders: add unique index on sterilizationBatchNo",
    check: "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' AND INDEX_NAME='idx_sterilization_batch_no'",
    sql: "ALTER TABLE sterilization_orders ADD UNIQUE INDEX idx_sterilization_batch_no (sterilizationBatchNo)",
  },
  {
    desc: "sterilization_orders: add arrivedAt",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' AND COLUMN_NAME='arrivedAt'",
    sql: "ALTER TABLE sterilization_orders ADD COLUMN arrivedAt TIMESTAMP NULL",
  },
  {
    desc: "sterilization_orders: add arrivedBy",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sterilization_orders' AND COLUMN_NAME='arrivedBy'",
    sql: "ALTER TABLE sterilization_orders ADD COLUMN arrivedBy INT",
  },
  // quality_inspections: add rejectQty and sampleRetainQty (append to end)
  {
    desc: "quality_inspections: add rejectQty",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quality_inspections' AND COLUMN_NAME='rejectQty'",
    sql: "ALTER TABLE quality_inspections ADD COLUMN rejectQty INT DEFAULT 0",
  },
  {
    desc: "quality_inspections: add sampleRetainQty",
    check: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quality_inspections' AND COLUMN_NAME='sampleRetainQty'",
    sql: "ALTER TABLE quality_inspections ADD COLUMN sampleRetainQty INT DEFAULT 0",
  },
];

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const m of fixes) {
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
