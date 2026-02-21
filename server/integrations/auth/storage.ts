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
  facebookLongLivedToken?: string;
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
        authProvider: "oidc",
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

    console.log("[DB-TRACE] Attempting upsert for user:", userData.id, {
      facebookId: userData.facebookId,
      hasEmail: !!userData.email,
      hasAvatar: !!userData.avatar,
    });

    try {
      // Try to find existing user by Facebook ID
      const existingUser = await this.getUserByFacebookId(userData.facebookId);

      if (existingUser) {
        // Update existing user
        const updateFields: any = {
            email: userData.email || sql`${users.email}`,
            displayName,
            avatar: sql`COALESCE(${users.avatar}, ${userData.avatar || null})`,
            lastLoginAt: new Date(),
          };
        if (userData.facebookLongLivedToken) {
          updateFields.facebookLongLivedToken = userData.facebookLongLivedToken;
        }
        const [updatedUser] = await db
          .update(users)
          .set(updateFields)
          .where(eq(users.id, existingUser.id))
          .returning();

        console.log("[DB-TRACE] Upsert successful for:", userData.id, {
          dbId: updatedUser?.id,
          existing: true,
        });
        return updatedUser;
      }

      // Create new user
      const insertValues: any = {
          id: userData.id,
          email: userData.email || null,
          displayName,
          avatar: userData.avatar || null,
          authProvider: "facebook",
          authProviderId: userData.facebookId,
          phone: null,
        };
      if (userData.facebookLongLivedToken) {
        insertValues.facebookLongLivedToken = userData.facebookLongLivedToken;
      }
      const conflictSet: any = {
            email: userData.email || sql`${users.email}`,
            displayName,
            avatar: sql`COALESCE(${users.avatar}, ${userData.avatar || null})`,
            authProvider: "facebook",
            authProviderId: userData.facebookId,
            lastLoginAt: new Date(),
          };
      if (userData.facebookLongLivedToken) {
        conflictSet.facebookLongLivedToken = userData.facebookLongLivedToken;
      }
      const [newUser] = await db
        .insert(users)
        .values(insertValues)
        .onConflictDoUpdate({
          target: users.id,
          set: conflictSet,
        })
        .returning();

      console.log("[DB-TRACE] Upsert successful for:", userData.id, {
        dbId: newUser?.id,
        existing: false,
      });
      return newUser;
    } catch (error) {
      console.error("[DB-TRACE] Upsert FAILED for:", userData.id, {
        facebookId: userData.facebookId,
        email: userData.email,
        displayName,
        error,
      });
      throw error;
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
