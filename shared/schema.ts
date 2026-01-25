import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "driver", "rider"]);
export const driverStatusEnum = pgEnum("driver_status", ["pending", "approved", "suspended"]);
export const tripStatusEnum = pgEnum("trip_status", ["requested", "accepted", "in_progress", "completed", "cancelled"]);

// User roles table - maps users to their roles
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull().default("rider"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Driver profiles table
export const driverProfiles = pgTable("driver_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  phone: varchar("phone").notNull(),
  vehicleMake: varchar("vehicle_make").notNull(),
  vehicleModel: varchar("vehicle_model").notNull(),
  licensePlate: varchar("license_plate").notNull(),
  status: driverStatusEnum("status").notNull().default("pending"),
  isOnline: boolean("is_online").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider profiles table
export const riderProfiles = pgTable("rider_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name"),
  phone: varchar("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trips table
export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  passengerCount: integer("passenger_count").notNull().default(1),
  status: tripStatusEnum("status").notNull().default("requested"),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
});

// Relations
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  // Relations defined for clarity
}));

export const driverProfilesRelations = relations(driverProfiles, ({ many }) => ({
  trips: many(trips),
}));

export const riderProfilesRelations = relations(riderProfiles, ({ many }) => ({
  trips: many(trips),
}));

export const tripsRelations = relations(trips, ({ one }) => ({
  driver: one(driverProfiles, {
    fields: [trips.driverId],
    references: [driverProfiles.userId],
  }),
  rider: one(riderProfiles, {
    fields: [trips.riderId],
    references: [riderProfiles.userId],
  }),
}));

// Insert schemas
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});

export const insertDriverProfileSchema = createInsertSchema(driverProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  isOnline: true,
});

export const insertRiderProfileSchema = createInsertSchema(riderProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,
  driverId: true,
  status: true,
});

// Update schemas
export const updateDriverProfileSchema = createInsertSchema(driverProfiles).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  isOnline: true,
}).partial();

// Types
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

export type InsertDriverProfile = z.infer<typeof insertDriverProfileSchema>;
export type DriverProfile = typeof driverProfiles.$inferSelect;

export type InsertRiderProfile = z.infer<typeof insertRiderProfileSchema>;
export type RiderProfile = typeof riderProfiles.$inferSelect;

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

// Extended types for frontend
export type TripWithDetails = Trip & {
  driverName?: string;
  riderName?: string;
};

export type DriverWithUser = DriverProfile & {
  email?: string;
};
