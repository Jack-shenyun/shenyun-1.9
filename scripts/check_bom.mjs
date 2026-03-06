import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

// 查询胃管产品
console.log('=== 查询胃管产品 ===');
const [products] = await conn.execute(
  "SELECT id, name, code, unit FROM products WHERE code LIKE '%WG-38FR%' OR name LIKE '%胃管%' LIMIT 5"
);
console.log(JSON.stringify(products, null, 2));

// 查询所有包含 bom 的表
console.log('\n=== 所有包含 bom 的表 ===');
const [tables] = await conn.execute("SHOW TABLES LIKE '%bom%'");
console.log(JSON.stringify(tables, null, 2));

// 查询所有表
console.log('\n=== 所有表 ===');
const [allTables] = await conn.execute("SHOW TABLES");
console.log(JSON.stringify(allTables, null, 2));

await conn.end();
