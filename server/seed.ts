import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting database seed...");

  const adminUsername = "yabbas25";
  const adminPassword = "Ss120$JyA";
  const adminEmail = "yabbas25@admin.ebay-iraq.com";

  const existingAdmin = await db.select().from(users).where(eq(users.username, adminUsername));
  
  if (existingAdmin.length > 0) {
    console.log("✅ Admin account already exists, skipping...");
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const accountCode = "A-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    await db.insert(users).values({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      displayName: "مدير النظام",
      accountType: "admin",
      isVerified: true,
      accountCode: accountCode,
    });
    
    console.log("✅ Admin account created successfully!");
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Email: ${adminEmail}`);
  }

  console.log("🌱 Seed completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
