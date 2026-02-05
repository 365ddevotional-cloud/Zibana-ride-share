import { users, type User, type UpsertUser } from "@shared/models/auth";
import { userRoles } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// SUPER_ADMIN email binding - production email is always SUPER_ADMIN
const SUPER_ADMIN_EMAIL_PRODUCTION = "mosesafonabi951@gmail.com";
// Replit Preview override - for development/testing only
const SUPER_ADMIN_EMAIL_PREVIEW = "365ddevotional@gmail.com";
const isPreviewEnvironment = process.env.NODE_ENV === "development" || process.env.REPLIT_DEV_DOMAIN;

// Helper to check if email is authorized as SUPER_ADMIN
const isSuperAdminEmail = (email: string): boolean => {
  if (email === SUPER_ADMIN_EMAIL_PRODUCTION) return true;
  if (isPreviewEnvironment && email === SUPER_ADMIN_EMAIL_PREVIEW) return true;
  return false;
};

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Permanently assign SUPER_ADMIN role to authorized emails
    if (userData.email && isSuperAdminEmail(userData.email) && user.id) {
      await this.ensureSuperAdminRole(user.id);
    }
    
    return user;
  }
  
  private async ensureSuperAdminRole(userId: string): Promise<void> {
    const [existingRole] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    
    if (!existingRole) {
      await db.insert(userRoles).values({
        userId,
        role: "super_admin",
      });
    } else if (existingRole.role !== "super_admin") {
      await db
        .update(userRoles)
        .set({ role: "super_admin" })
        .where(eq(userRoles.userId, userId));
    }
  }
}

export const authStorage = new AuthStorage();
