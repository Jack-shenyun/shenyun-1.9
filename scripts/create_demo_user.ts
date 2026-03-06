import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  console.log("Checking for demo user (ID: 8)...");
  const [existingUser] = await db.select().from(users).where(eq(users.id, 8)).limit(1);

  if (existingUser) {
    console.log("Demo user already exists:", existingUser);
  } else {
    console.log("Creating demo user...");
    await db.insert(users).values({
      id: 8,
      openId: "demo-user",
      name: "系统管理员",
      email: "admin@shenyun.com",
      loginMethod: "password",
      role: "admin",
      department: "管理部",
      position: "管理员",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    console.log("Demo user created successfully!");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating demo user:", err);
  process.exit(1);
});
