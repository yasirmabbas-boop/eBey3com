import { users, type User } from "@shared/schema";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

interface OIDCUserData {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(userData: OIDCUserData): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: OIDCUserData): Promise<User> {
    const displayName = [userData.firstName, userData.lastName].filter(Boolean).join(" ") || userData.email || "مستخدم";
    
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email || null,
        displayName: displayName,
        avatar: userData.profileImageUrl || null,
        authProvider: "replit",
        authProviderId: userData.id,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email || sql`${users.email}`,
          displayName: displayName,
          avatar: sql`COALESCE(${users.avatar}, ${userData.profileImageUrl || null})`,
          lastLoginAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
