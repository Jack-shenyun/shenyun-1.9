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

console.log('=== bom 表结构 ===');
const [cols] = await conn.execute("DESCRIBE bom");
console.log(JSON.stringify(cols, null, 2));

console.log('\n=== bom 现有数据 ===');
const [rows] = await conn.execute("SELECT * FROM bom LIMIT 5");
console.log(JSON.stringify(rows, null, 2));

await conn.end();
