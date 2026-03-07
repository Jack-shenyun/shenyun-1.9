import mysql from "mysql2/promise";

const dbUrl = "mysql://paZkiNgy2nHQcsT.root:mB5jFs2uVaZjEegW@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test";
const connection = await mysql.createConnection({
  uri: dbUrl,
  ssl: {
    rejectUnauthorized: true
  }
});

async function fixInventory() {
  console.log("开始库存对账修复...");

  // 1. 汇总所有有效的库存流水
  const [transactionsRows] = await connection.execute(`
    SELECT 
      warehouseId, productId, batchNo, itemName, unit, type, quantity
    FROM inventory_transactions
  `);
  const transactions = transactionsRows;
  console.log(`找到 ${transactions.length} 条流水记录`);

  // 2. 按 仓库 + 产品 + 批次 汇总
  const summary = {};
  const inTypes = ["purchase_in", "production_in", "return_in", "other_in"];
  const outTypes = ["production_out", "sales_out", "return_out", "other_out"];

  for (const tx of transactions) {
    const key = `${tx.warehouseId}-${tx.productId}-${tx.batchNo || ''}`;
    if (!summary[key]) {
      summary[key] = {
        warehouseId: tx.warehouseId,
        productId: tx.productId,
        batchNo: tx.batchNo,
        itemName: tx.itemName,
        unit: tx.unit,
        quantity: 0
      };
    }

    const qty = parseFloat(String(tx.quantity)) || 0;
    if (inTypes.includes(tx.type)) {
      summary[key].quantity += qty;
    } else if (outTypes.includes(tx.type)) {
      summary[key].quantity -= qty;
    }
  }

  // 3. 同步到 inventory 表
  console.log(`汇总得到 ${Object.keys(summary).length} 条库存项，开始同步...`);
  
  for (const key in summary) {
    const item = summary[key];
    
    let query = "SELECT id FROM inventory WHERE warehouseId = ? AND productId = ?";
    let params = [item.warehouseId, item.productId];
    if (item.batchNo) {
      query += " AND batchNo = ?";
      params.push(item.batchNo);
    } else {
      query += " AND (batchNo IS NULL OR batchNo = '')";
    }

    const [existingRows] = await connection.execute(query, params);
    const existing = existingRows;

    if (existing.length > 0) {
      console.log(`更新库存: [仓库${item.warehouseId}] [产品${item.productId}] [批次${item.batchNo}] -> ${item.quantity}`);
      await connection.execute(
        "UPDATE inventory SET quantity = ? WHERE id = ?",
        [String(item.quantity), existing[0].id]
      );
    } else {
      console.log(`创建库存: [仓库${item.warehouseId}] [产品${item.productId}] [批次${item.batchNo}] -> ${item.quantity}`);
      await connection.execute(
        "INSERT INTO inventory (warehouseId, productId, itemName, batchNo, quantity, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [item.warehouseId, item.productId, item.itemName, item.batchNo, String(item.quantity), item.unit, "qualified"]
      );
    }
  }

  console.log("库存修复完成！");
  process.exit(0);
}

fixInventory().catch(err => {
  console.error("修复失败:", err);
  process.exit(1);
});
