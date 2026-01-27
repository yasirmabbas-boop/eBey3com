import { users, type User } from "@shared/schema";
import { db } from "../../db";
import { eq, sql, and } from "drizzle-orm";

interface OIDCUserData {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface FacebookUserData {
  id: string;
  email?: string | null;
  displayName?: string;
  avatar?: string | null;
  facebookId: string;
  facebookLongLivedToken: string;
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByAuthToken(token: string): Promise<User | undefined>;
  upsertUser(userData: OIDCUserData): Promise<User>;
  getUserByFacebookId(facebookId: string): Promise<User | undefined>;
  upsertFacebookUser(userData: FacebookUserData): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByAuthToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.authToken, token));
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

  async getUserByFacebookId(facebookId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.authProvider, "facebook"),
          eq(users.authProviderId, facebookId)
        )
      );
    return user;
  }

  async upsertFacebookUser(userData: FacebookUserData): Promise<User> {
    const displayName = userData.displayName || userData.email || "مستخدم";
    
    // Try to find existing user by Facebook ID
    const existingUser = await this.getUserByFacebookId(userData.facebookId);
    
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          facebookLongLivedToken: userData.facebookLongLivedToken,
          email: userData.email || sql`${users.email}`,
          displayName: displayName,
          avatar: sql`COALESCE(${users.avatar}, ${userData.avatar || null})`,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          id: userData.id,
          email: userData.email || null,
          displayName: displayName,
          avatar: userData.avatar || null,
          authProvider: "facebook",
          authProviderId: userData.facebookId,
          facebookLongLivedToken: userData.facebookLongLivedToken,
          phone: null, // Leave phone NULL so onboarding flow triggers
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email || sql`${users.email}`,
            displayName: displayName,
            avatar: sql`COALESCE(${users.avatar}, ${userData.avatar || null})`,
            authProvider: "facebook",
            authProviderId: userData.facebookId,
            facebookLongLivedToken: userData.facebookLongLivedToken,
            lastLoginAt: new Date(),
          },
        })
        .returning();
      return newUser;
    }
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
}

export const authStorage = new AuthStorage();
