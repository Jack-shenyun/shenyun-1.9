/**
 * 修复历史销售出库数据：
 * 1. ALTER TABLE 添加 partial_shipped 枚举值
 * 2. 重新扫描所有 sales_out 流水，按订单+产品汇总已发数量，
 *    更新 sales_order_items.deliveredQty 和 sales_orders.status
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// 读取 .env
try {
  const env = readFileSync('/home/ubuntu/gtp-erp/.env', 'utf8');
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
} catch(e) {}

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log('Connected to DB');

// Step 1: ALTER TABLE 添加 partial_shipped 枚举值
console.log('Step 1: ALTER TABLE sales_orders to add partial_shipped...');
try {
  await conn.query(`
    ALTER TABLE sales_orders
    MODIFY COLUMN status ENUM(
      'draft','pending_review','approved','pending_payment',
      'confirmed','in_production','ready_to_ship',
      'partial_shipped','shipped','completed','cancelled'
    ) NOT NULL DEFAULT 'draft'
  `);
  console.log('ALTER TABLE success');
} catch(e) {
  console.log('ALTER TABLE error (may already exist):', e.message);
}

// Step 2: 找出所有有 sales_out 流水的订单
const [txRows] = await conn.query(`
  SELECT relatedOrderId, productId, SUM(CAST(quantity AS DECIMAL(12,4))) as totalDelivered
  FROM inventory_transactions
  WHERE type = 'sales_out' AND relatedOrderId IS NOT NULL
  GROUP BY relatedOrderId, productId
`);

console.log(`\nStep 2: Found ${txRows.length} (orderId, productId) pairs with sales_out transactions`);

// 按 orderId 分组
const orderMap = new Map();
for (const row of txRows) {
  const oid = row.relatedOrderId;
  if (!orderMap.has(oid)) orderMap.set(oid, []);
  orderMap.get(oid).push({ productId: row.productId, totalDelivered: parseFloat(row.totalDelivered) });
}

console.log(`Affected orders: ${orderMap.size}`);

let updatedOrders = 0;
for (const [orderId, deliveries] of orderMap.entries()) {
  // 查订单明细
  const [items] = await conn.query(
    'SELECT id, productId, quantity FROM sales_order_items WHERE orderId=?',
    [orderId]
  );

  if (items.length === 0) {
    await conn.query("UPDATE sales_orders SET status='shipped' WHERE id=?", [orderId]);
    console.log(`Order ${orderId}: no items, set to shipped`);
    updatedOrders++;
    continue;
  }

  // 更新每条明细的 deliveredQty
  for (const item of items) {
    const delivery = deliveries.find(d => d.productId === item.productId);
    const delivered = delivery ? delivery.totalDelivered : 0;
    await conn.query(
      'UPDATE sales_order_items SET deliveredQty=? WHERE id=?',
      [String(delivered), item.id]
    );
  }

  // 计算总量对比
  const totalOrdered = items.reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalDelivered = deliveries.reduce((s, d) => s + d.totalDelivered, 0);

  let newStatus;
  if (totalDelivered <= 0) {
    newStatus = 'approved';
  } else if (totalDelivered >= totalOrdered) {
    newStatus = 'completed';
  } else {
    newStatus = 'partial_shipped';
  }

  await conn.query("UPDATE sales_orders SET status=? WHERE id=?", [newStatus, orderId]);
  console.log(`Order ${orderId}: totalOrdered=${totalOrdered}, totalDelivered=${totalDelivered} → ${newStatus}`);
  updatedOrders++;
}

console.log(`\nDone! Updated ${updatedOrders} orders.`);
await conn.end();
