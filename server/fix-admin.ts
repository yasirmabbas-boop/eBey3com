import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function fixAdmin() {
  console.log("Looking for user with phone 07700000000...");
  
  const existingUsers = await db.select().from(users).where(eq(users.phone, "07700000000"));
  
  if (existingUsers.length > 0) {
    console.log("Found user:", existingUsers[0].displayName);
    console.log("Current isAdmin:", existingUsers[0].isAdmin);
    
    const updated = await db.update(users)
      .set({ isAdmin: true })
      .where(eq(users.phone, "07700000000"))
      .returning();
    
    console.log("Updated! New isAdmin:", updated[0].isAdmin);
  } else {
    console.log("No user found with phone 07700000000");
  }
  
  process.exit(0);
}

fixAdmin().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
