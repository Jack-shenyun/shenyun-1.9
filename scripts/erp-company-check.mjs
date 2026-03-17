import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/Users/shenyun/Documents/shenyun-erp/shenyun-erp-1.1-main.backup-20260310-232351/.env' });
const conn = await createConnection(process.env.DATABASE_URL);
const queries = {
  companies: 'SELECT id, name, shortName, status FROM companies ORDER BY id',
  users: 'SELECT id, name, openId, role, department, companyId FROM users ORDER BY id LIMIT 50',
  companyUserAccess: 'SELECT companyId, userId FROM company_user_access ORDER BY companyId, userId LIMIT 100',
  customers: 'SELECT COUNT(*) AS count FROM customers',
  sales_orders: 'SELECT COUNT(*) AS count FROM sales_orders',
  purchase_orders: 'SELECT COUNT(*) AS count FROM purchase_orders',
  products: 'SELECT COUNT(*) AS count FROM products',
  inventory: 'SELECT COUNT(*) AS count FROM inventory',
  customer_salesperson: 'SELECT salesPersonId, COUNT(*) AS count FROM customers GROUP BY salesPersonId ORDER BY count DESC LIMIT 20',
  salesorder_salesperson: 'SELECT salesPersonId, COUNT(*) AS count FROM sales_orders GROUP BY salesPersonId ORDER BY count DESC LIMIT 20'
};
for (const [name, sql] of Object.entries(queries)) {
  const [rows] = await conn.query(sql);
  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(rows, null, 2));
}
await conn.end();
