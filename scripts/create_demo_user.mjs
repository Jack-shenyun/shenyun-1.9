import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const connection = await mysql.createConnection(url);

  try {
    console.log("Checking for demo user (ID: 8)...");
    const [rows] = await connection.execute('SELECT * FROM users WHERE id = 8');

    if (rows.length > 0) {
      console.log("Demo user already exists:", rows[0]);
    } else {
      console.log("Creating demo user...");
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await connection.execute(
        `INSERT INTO users (id, openId, name, email, loginMethod, role, department, position, createdAt, updatedAt, lastSignedIn) 
         VALUES (8, 'demo-user', '系统管理员', 'admin@shenyun.com', 'password', 'admin', '管理部', '管理员', ?, ?, ?)`,
        [now, now, now]
      );
      console.log("Demo user created successfully!");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await connection.end();
  }
}

main();
