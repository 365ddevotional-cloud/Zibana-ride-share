import { users, type User, type UpsertUser } from "@shared/models/auth";
import { userRoles } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// SUPER_ADMIN email binding - both emails have super admin access
const SUPER_ADMIN_EMAILS = [
  "mosesafonabi951@gmail.com",  // Primary super admin (public/incognito)
  "365ddevotional@gmail.com"    // Replit account owner (preview)
];

// Helper to check if email is authorized as SUPER_ADMIN
const isSuperAdminEmail = (email: string): boolean => {
  return SUPER_ADMIN_EMAILS.includes(email);
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
