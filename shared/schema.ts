import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "driver", "rider", "director", "finance", "trip_coordinator"]);
export const directorStatusEnum = pgEnum("director_status", ["active", "inactive"]);
export const driverStatusEnum = pgEnum("driver_status", ["pending", "approved", "suspended"]);
export const tripStatusEnum = pgEnum("trip_status", ["requested", "accepted", "in_progress", "completed", "cancelled"]);
export const cancelledByEnum = pgEnum("cancelled_by", ["rider", "driver", "admin"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "paid"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "success", "warning"]);
export const notificationRoleEnum = pgEnum("notification_role", ["admin", "director", "driver", "rider", "finance", "trip_coordinator"]);
export const raterRoleEnum = pgEnum("rater_role", ["rider", "driver"]);
export const disputeCategoryEnum = pgEnum("dispute_category", ["fare", "behavior", "cancellation", "other"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "under_review", "resolved", "rejected"]);
export const disputeRaisedByEnum = pgEnum("dispute_raised_by", ["rider", "driver"]);
export const refundTypeEnum = pgEnum("refund_type", ["full", "partial", "adjustment"]);
export const refundStatusEnum = pgEnum("refund_status", ["pending", "approved", "rejected", "processed", "reversed"]);
export const refundCreatedByRoleEnum = pgEnum("refund_created_by_role", ["admin", "trip_coordinator", "finance"]);
export const chargebackProviderEnum = pgEnum("chargeback_provider", ["stripe", "paystack", "flutterwave", "other"]);
export const chargebackStatusEnum = pgEnum("chargeback_status", ["reported", "under_review", "won", "lost", "reversed"]);
export const reconciliationStatusEnum = pgEnum("reconciliation_status", ["matched", "mismatched", "manual_review"]);

// Phase 11 - Wallet & Payout Cycle enums
export const walletRoleEnum = pgEnum("wallet_role", ["driver", "ziba"]);
export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", ["credit", "debit", "hold", "release"]);
export const walletTransactionSourceEnum = pgEnum("wallet_transaction_source", ["trip", "refund", "chargeback", "adjustment", "payout", "incentive"]);
export const walletPayoutStatusEnum = pgEnum("wallet_payout_status", ["pending", "processing", "paid", "failed", "reversed"]);
export const payoutMethodEnum = pgEnum("payout_method", ["bank", "mobile_money", "manual"]);

// Phase 13 - Fraud Detection enums
export const riskProfileRoleEnum = pgEnum("risk_profile_role", ["rider", "driver"]);
export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high", "critical"]);
export const fraudEntityTypeEnum = pgEnum("fraud_entity_type", ["user", "trip"]);
export const fraudSeverityEnum = pgEnum("fraud_severity", ["low", "medium", "high"]);

// Phase 14 - Driver Incentives enums
export const incentiveTypeEnum = pgEnum("incentive_type", ["trip", "streak", "peak", "quality", "promo"]);
export const incentiveProgramStatusEnum = pgEnum("incentive_program_status", ["active", "paused", "ended"]);
export const incentiveEarningStatusEnum = pgEnum("incentive_earning_status", ["pending", "approved", "paid", "revoked"]);

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
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  totalRatings: integer("total_ratings").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider profiles table
export const riderProfiles = pgTable("rider_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name"),
  phone: varchar("phone"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  totalRatings: integer("total_ratings").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Director profiles table
export const directorProfiles = pgTable("director_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  email: varchar("email"),
  status: directorStatusEnum("status").notNull().default("active"),
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
  fareAmount: decimal("fare_amount", { precision: 10, scale: 2 }),
  driverPayout: decimal("driver_payout", { precision: 10, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).default("20.00"),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: cancelledByEnum("cancelled_by"),
  cancellationReason: text("cancellation_reason"),
});

// Payout transactions table - tracks driver earnings and payouts
export const payoutTransactions = pgTable("payout_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  tripId: varchar("trip_id"),
  type: varchar("type", { length: 20 }).notNull(), // 'earning' or 'payout'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  paidByAdminId: varchar("paid_by_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ratings table
export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  raterRole: raterRoleEnum("rater_role").notNull(),
  raterId: varchar("rater_id").notNull(),
  targetUserId: varchar("target_user_id").notNull(),
  score: integer("score").notNull(),
  comment: varchar("comment", { length: 300 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: notificationRoleEnum("role").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull().default("info"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Disputes table
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  raisedByRole: disputeRaisedByEnum("raised_by_role").notNull(),
  raisedById: varchar("raised_by_id").notNull(),
  againstUserId: varchar("against_user_id").notNull(),
  category: disputeCategoryEnum("category").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Refunds table
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: refundTypeEnum("type").notNull(),
  status: refundStatusEnum("status").notNull().default("pending"),
  reason: text("reason").notNull(),
  createdByRole: refundCreatedByRoleEnum("created_by_role").notNull(),
  createdByUserId: varchar("created_by_user_id").notNull(),
  approvedByUserId: varchar("approved_by_user_id"),
  processedByUserId: varchar("processed_by_user_id"),
  linkedDisputeId: varchar("linked_dispute_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet adjustments table
export const walletAdjustments = pgTable("wallet_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  linkedRefundId: varchar("linked_refund_id"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  performedByUserId: varchar("performed_by_user_id").notNull(),
  performedByRole: varchar("performed_by_role", { length: 50 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chargebacks table - tracks external payment processor chargebacks
export const chargebacks = pgTable("chargebacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  paymentProvider: chargebackProviderEnum("payment_provider").notNull(),
  externalReference: varchar("external_reference", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  reason: text("reason"),
  status: chargebackStatusEnum("status").notNull().default("reported"),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment reconciliations table - tracks gateway vs internal fare matching
export const paymentReconciliations = pgTable("payment_reconciliations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }).notNull(),
  variance: decimal("variance", { precision: 10, scale: 2 }).notNull(),
  provider: chargebackProviderEnum("provider").notNull(),
  status: reconciliationStatusEnum("status").notNull().default("matched"),
  reconciledByUserId: varchar("reconciled_by_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 11 - Wallets table
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: walletRoleEnum("role").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  lockedBalance: decimal("locked_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 11 - Wallet transactions table
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  type: walletTransactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  source: walletTransactionSourceEnum("source").notNull(),
  referenceId: varchar("reference_id"),
  description: text("description"),
  createdByUserId: varchar("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 11 - Payouts table (payout cycles)
export const walletPayouts = pgTable("wallet_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: walletPayoutStatusEnum("status").notNull().default("pending"),
  method: payoutMethodEnum("method").notNull().default("bank"),
  initiatedByUserId: varchar("initiated_by_user_id").notNull(),
  processedByUserId: varchar("processed_by_user_id"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Phase 13 - Risk Profiles table
export const riskProfiles = pgTable("risk_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: riskProfileRoleEnum("role").notNull(),
  score: integer("score").notNull().default(0),
  level: riskLevelEnum("level").notNull().default("low"),
  lastEvaluatedAt: timestamp("last_evaluated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 13 - Fraud Events table
export const fraudEvents = pgTable("fraud_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: fraudEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  signalType: varchar("signal_type", { length: 100 }).notNull(),
  severity: fraudSeverityEnum("severity").notNull().default("low"),
  description: text("description").notNull(),
  detectedAt: timestamp("detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id"),
});

// Phase 14 - Incentive Programs table
export const incentivePrograms = pgTable("incentive_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  type: incentiveTypeEnum("type").notNull(),
  criteria: text("criteria").notNull(),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: incentiveProgramStatusEnum("status").notNull().default("active"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 14 - Incentive Earnings table
export const incentiveEarnings = pgTable("incentive_earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: incentiveEarningStatusEnum("status").notNull().default("pending"),
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  revokedAt: timestamp("revoked_at"),
  revokedByUserId: varchar("revoked_by_user_id"),
  revocationReason: text("revocation_reason"),
  walletTransactionId: varchar("wallet_transaction_id"),
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

export const directorProfilesRelations = relations(directorProfiles, ({ one }) => ({
  // Relations defined for clarity
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

export const payoutTransactionsRelations = relations(payoutTransactions, ({ one }) => ({
  driver: one(driverProfiles, {
    fields: [payoutTransactions.driverId],
    references: [driverProfiles.userId],
  }),
  trip: one(trips, {
    fields: [payoutTransactions.tripId],
    references: [trips.id],
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

export const insertDirectorProfileSchema = createInsertSchema(directorProfiles).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,
  driverId: true,
  status: true,
});

export const insertPayoutTransactionSchema = createInsertSchema(payoutTransactions).omit({
  id: true,
  createdAt: true,
  paidAt: true,
  paidByAdminId: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  status: true,
  adminNotes: true,
});

export const updateDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  tripId: true,
  raisedByRole: true,
  raisedById: true,
  againstUserId: true,
  category: true,
  description: true,
}).partial();

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  approvedByUserId: true,
  processedByUserId: true,
});

export const updateRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  tripId: true,
  riderId: true,
  driverId: true,
  createdByRole: true,
  createdByUserId: true,
}).partial();

export const insertWalletAdjustmentSchema = createInsertSchema(walletAdjustments).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
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

export type InsertDirectorProfile = z.infer<typeof insertDirectorProfileSchema>;
export type DirectorProfile = typeof directorProfiles.$inferSelect;

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

export type InsertPayoutTransaction = z.infer<typeof insertPayoutTransactionSchema>;
export type PayoutTransaction = typeof payoutTransactions.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type UpdateDispute = z.infer<typeof updateDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

// Extended types for frontend
export type TripWithDetails = Trip & {
  driverName?: string;
  riderName?: string;
};

export type DriverWithUser = DriverProfile & {
  email?: string;
};

export type PayoutTransactionWithDetails = PayoutTransaction & {
  driverName?: string;
};

export type DirectorWithUser = DirectorProfile & {
  email?: string;
};

export type DisputeWithDetails = Dispute & {
  raisedByName?: string;
  againstUserName?: string;
  tripPickup?: string;
  tripDropoff?: string;
  tripStatus?: string;
};

export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type UpdateRefund = z.infer<typeof updateRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

export type InsertWalletAdjustment = z.infer<typeof insertWalletAdjustmentSchema>;
export type WalletAdjustment = typeof walletAdjustments.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type RefundWithDetails = Refund & {
  riderName?: string;
  driverName?: string;
  tripPickup?: string;
  tripDropoff?: string;
  tripStatus?: string;
  createdByName?: string;
  approvedByName?: string;
  processedByName?: string;
};

// Chargeback schemas and types
export const insertChargebackSchema = createInsertSchema(chargebacks).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  resolvedByUserId: true,
});

export const updateChargebackSchema = createInsertSchema(chargebacks).omit({
  id: true,
  createdAt: true,
  tripId: true,
  paymentProvider: true,
  externalReference: true,
  amount: true,
  currency: true,
  reportedAt: true,
}).partial();

export type InsertChargeback = z.infer<typeof insertChargebackSchema>;
export type UpdateChargeback = z.infer<typeof updateChargebackSchema>;
export type Chargeback = typeof chargebacks.$inferSelect;

export type ChargebackWithDetails = Chargeback & {
  tripPickup?: string;
  tripDropoff?: string;
  tripFare?: string;
  riderName?: string;
  driverName?: string;
  resolvedByName?: string;
};

// Payment Reconciliation schemas and types
export const insertPaymentReconciliationSchema = createInsertSchema(paymentReconciliations).omit({
  id: true,
  createdAt: true,
  reconciledByUserId: true,
});

export type InsertPaymentReconciliation = z.infer<typeof insertPaymentReconciliationSchema>;
export type PaymentReconciliation = typeof paymentReconciliations.$inferSelect;

export type ReconciliationWithDetails = PaymentReconciliation & {
  tripPickup?: string;
  tripDropoff?: string;
  reconciledByName?: string;
};

// Phase 11 - Wallet schemas and types
export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  lockedBalance: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertWalletPayoutSchema = createInsertSchema(walletPayouts).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  processedByUserId: true,
  failureReason: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export type InsertWalletPayout = z.infer<typeof insertWalletPayoutSchema>;
export type WalletPayout = typeof walletPayouts.$inferSelect;

export type WalletWithDetails = Wallet & {
  ownerName?: string;
  pendingPayoutAmount?: string;
};

export type WalletPayoutWithDetails = WalletPayout & {
  driverName?: string;
  initiatedByName?: string;
  processedByName?: string;
};

// Phase 13 - Risk Profile schemas and types
export const insertRiskProfileSchema = createInsertSchema(riskProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastEvaluatedAt: true,
  score: true,
  level: true,
});

export const insertFraudEventSchema = createInsertSchema(fraudEvents).omit({
  id: true,
  detectedAt: true,
  resolvedAt: true,
  resolvedByUserId: true,
});

export type InsertRiskProfile = z.infer<typeof insertRiskProfileSchema>;
export type RiskProfile = typeof riskProfiles.$inferSelect;

export type InsertFraudEvent = z.infer<typeof insertFraudEventSchema>;
export type FraudEvent = typeof fraudEvents.$inferSelect;

export type RiskProfileWithDetails = RiskProfile & {
  userName?: string;
  email?: string;
  totalTrips?: number;
  totalRefunds?: number;
  totalChargebacks?: number;
  totalDisputes?: number;
};

export type FraudEventWithDetails = FraudEvent & {
  entityName?: string;
  resolvedByName?: string;
};

// Phase 14 - Incentive Program schemas and types
export const insertIncentiveProgramSchema = createInsertSchema(incentivePrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const updateIncentiveProgramSchema = createInsertSchema(incentivePrograms).omit({
  id: true,
  createdAt: true,
  createdByUserId: true,
}).partial();

export const insertIncentiveEarningSchema = createInsertSchema(incentiveEarnings).omit({
  id: true,
  evaluatedAt: true,
  paidAt: true,
  revokedAt: true,
  revokedByUserId: true,
  revocationReason: true,
  walletTransactionId: true,
});

export type InsertIncentiveProgram = z.infer<typeof insertIncentiveProgramSchema>;
export type UpdateIncentiveProgram = z.infer<typeof updateIncentiveProgramSchema>;
export type IncentiveProgram = typeof incentivePrograms.$inferSelect;

export type InsertIncentiveEarning = z.infer<typeof insertIncentiveEarningSchema>;
export type IncentiveEarning = typeof incentiveEarnings.$inferSelect;

export type IncentiveProgramWithDetails = IncentiveProgram & {
  createdByName?: string;
  earnersCount?: number;
  totalPaid?: string;
};

export type IncentiveEarningWithDetails = IncentiveEarning & {
  driverName?: string;
  programName?: string;
  programType?: string;
  revokedByName?: string;
};
