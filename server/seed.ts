import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting database seed...");

  const adminPhone = "07700000000";
  const adminPassword = "Ss120$JyA";
  const adminEmail = "yabbas25@admin.ebay-iraq.com";

  const existingAdmin = await db.select().from(users).where(eq(users.phone, adminPhone));
  
  if (existingAdmin.length > 0) {
    console.log("✅ Admin account already exists, skipping...");
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const accountCode = "EB-10000"; // Admin gets the first account code
    
    await db.insert(users).values({
      phone: adminPhone,
      email: adminEmail,
      password: hashedPassword,
      displayName: "مدير النظام",
      isAdmin: true,
      isVerified: true,
      sellerApproved: true,
      accountCode: accountCode,
    });
    
    console.log("✅ Admin account created successfully!");
    console.log(`   Phone: ${adminPhone}`);
    console.log(`   Email: ${adminEmail}`);
  }

  console.log("🌱 Seed completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
