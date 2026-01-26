import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "driver", "rider", "director", "finance", "trip_coordinator", "support_agent"]);

// Admin permission scopes - defines what areas an admin can access
export const adminPermissionScopeEnum = pgEnum("admin_permission_scope", [
  "DRIVER_MANAGEMENT",
  "RIDER_MANAGEMENT", 
  "TRIP_MONITORING",
  "DISPUTES",
  "REPORTS",
  "PAYOUTS",
  "SUPPORT_TICKETS",
  "INCENTIVES",
  "FRAUD_DETECTION"
]);
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

// Phase 14.5 - Trip Coordinator enums
export const organizationTypeEnum = pgEnum("organization_type", ["ngo", "hospital", "church", "school", "gov", "corporate", "other"]);
export const bookedForTypeEnum = pgEnum("booked_for_type", ["self", "third_party"]);

// Phase 15 - Multi-Country Tax, Currency & Compliance enums
export const taxTypeEnum = pgEnum("tax_type", ["VAT", "SALES", "SERVICE", "OTHER"]);
export const taxAppliesToEnum = pgEnum("tax_applies_to", ["FARE", "COMMISSION", "BOTH"]);
export const exchangeRateSourceEnum = pgEnum("exchange_rate_source", ["MANUAL"]);

// Phase 16 - Support System enums
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "escalated", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high"]);
export const ticketCreatorRoleEnum = pgEnum("ticket_creator_role", ["rider", "driver", "trip_coordinator"]);

// Phase 18 - Contracts, SLAs & Enterprise Billing enums
export const contractTypeEnum = pgEnum("contract_type", ["NGO", "HOSPITAL", "CHURCH", "SCHOOL", "GOV", "CORPORATE"]);
export const contractStatusEnum = pgEnum("contract_status", ["ACTIVE", "SUSPENDED", "EXPIRED"]);
export const billingModelEnum = pgEnum("billing_model", ["PREPAID", "POSTPAID", "MONTHLY_INVOICE"]);
export const slaMetricTypeEnum = pgEnum("sla_metric_type", ["RESPONSE_TIME", "COMPLETION_RATE", "AVAILABILITY"]);
export const slaMeasurementPeriodEnum = pgEnum("sla_measurement_period", ["DAILY", "WEEKLY", "MONTHLY"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["DRAFT", "ISSUED", "PAID", "OVERDUE"]);

// Phase 22 - Enhanced Ride Lifecycle enums
export const rideStatusEnum = pgEnum("ride_status", [
  "requested",
  "matching",
  "accepted",
  "driver_en_route",
  "arrived",
  "waiting",
  "in_progress",
  "completed",
  "cancelled"
]);
export const rideCancelledByEnum = pgEnum("ride_cancelled_by", ["rider", "driver", "system"]);
export const rideAuditActionEnum = pgEnum("ride_audit_action", [
  "status_change",
  "driver_assigned",
  "cancellation",
  "compensation_awarded",
  "compensation_denied",
  "admin_override",
  "safety_alert",
  "idle_alert"
]);

// User roles table - maps users to their roles with admin governance
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull().default("rider"),
  adminStartAt: timestamp("admin_start_at"),
  adminEndAt: timestamp("admin_end_at"),
  adminPermissions: text("admin_permissions").array(),
  appointedBy: varchar("appointed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Phase 14.5 - Trip Coordinator profiles table
export const tripCoordinatorProfiles = pgTable("trip_coordinator_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  organizationName: varchar("organization_name", { length: 200 }).notNull(),
  organizationType: organizationTypeEnum("organization_type").notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  billingMode: varchar("billing_mode", { length: 50 }).notNull().default("simulated"),
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
  // Phase 14.5 - Trip Coordinator fields
  bookedForType: bookedForTypeEnum("booked_for_type").default("self"),
  passengerName: varchar("passenger_name", { length: 200 }),
  passengerContact: varchar("passenger_contact", { length: 100 }),
  notesForDriver: text("notes_for_driver"),
  // Phase 15 - Multi-Country fields
  countryId: varchar("country_id"),
  currency: varchar("currency", { length: 3 }),
  estimatedTaxAmount: decimal("estimated_tax_amount", { precision: 10, scale: 2 }),
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

// Phase 15 - Multi-Country Tax, Currency & Compliance tables

// Countries table
export const countries = pgTable("countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  isoCode: varchar("iso_code", { length: 3 }).notNull().unique(),
  currency: varchar("currency", { length: 3 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax Rules table
export const taxRules = pgTable("tax_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  taxType: taxTypeEnum("tax_type").notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  appliesTo: taxAppliesToEnum("applies_to").notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exchange Rates table
export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
  targetCurrency: varchar("target_currency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  asOfDate: timestamp("as_of_date").notNull(),
  source: exchangeRateSourceEnum("source").notNull().default("MANUAL"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Compliance Profiles table
export const complianceProfiles = pgTable("compliance_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").notNull(),
  legalEntityName: varchar("legal_entity_name", { length: 200 }).notNull(),
  registrationId: varchar("registration_id", { length: 100 }),
  taxId: varchar("tax_id", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
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
  updatedAt: true,
});

// Schema for appointing an admin (SUPER_ADMIN only)
export const appointAdminSchema = z.object({
  userId: z.string(),
  adminStartAt: z.string().datetime(),
  adminEndAt: z.string().datetime(),
  adminPermissions: z.array(z.enum([
    "DRIVER_MANAGEMENT",
    "RIDER_MANAGEMENT",
    "TRIP_MONITORING",
    "DISPUTES",
    "REPORTS",
    "PAYOUTS",
    "SUPPORT_TICKETS",
    "INCENTIVES",
    "FRAUD_DETECTION"
  ])).min(1),
});

export type AppointAdminInput = z.infer<typeof appointAdminSchema>;

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

// Phase 14.5 - Trip Coordinator schemas
export const insertTripCoordinatorProfileSchema = createInsertSchema(tripCoordinatorProfiles).omit({
  id: true,
  createdAt: true,
  billingMode: true,
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

// Phase 14.5 - Trip Coordinator types
export type InsertTripCoordinatorProfile = z.infer<typeof insertTripCoordinatorProfileSchema>;
export type TripCoordinatorProfile = typeof tripCoordinatorProfiles.$inferSelect;

export type TripCoordinatorWithUser = TripCoordinatorProfile & {
  email?: string;
  firstName?: string;
  lastName?: string;
};

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
  organizationName?: string;
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

// Phase 15 - Multi-Country Tax, Currency & Compliance schemas and types
export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
});

export const updateCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
}).partial();

export const insertTaxRuleSchema = createInsertSchema(taxRules).omit({
  id: true,
  createdAt: true,
});

export const updateTaxRuleSchema = createInsertSchema(taxRules).omit({
  id: true,
  createdAt: true,
  countryId: true,
}).partial();

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  createdAt: true,
});

export const insertComplianceProfileSchema = createInsertSchema(complianceProfiles).omit({
  id: true,
  createdAt: true,
});

export const updateComplianceProfileSchema = createInsertSchema(complianceProfiles).omit({
  id: true,
  createdAt: true,
  countryId: true,
}).partial();

export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type UpdateCountry = z.infer<typeof updateCountrySchema>;
export type Country = typeof countries.$inferSelect;

export type InsertTaxRule = z.infer<typeof insertTaxRuleSchema>;
export type UpdateTaxRule = z.infer<typeof updateTaxRuleSchema>;
export type TaxRule = typeof taxRules.$inferSelect;

export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;

export type InsertComplianceProfile = z.infer<typeof insertComplianceProfileSchema>;
export type UpdateComplianceProfile = z.infer<typeof updateComplianceProfileSchema>;
export type ComplianceProfile = typeof complianceProfiles.$inferSelect;

export type CountryWithDetails = Country & {
  taxRulesCount?: number;
  activeTripsCount?: number;
  totalRevenue?: string;
};

export type TaxRuleWithDetails = TaxRule & {
  countryName?: string;
  countryCode?: string;
};

export type ExchangeRateWithDetails = ExchangeRate & {
  baseCurrencyName?: string;
  targetCurrencyName?: string;
};

export type ComplianceProfileWithDetails = ComplianceProfile & {
  countryName?: string;
  countryCode?: string;
  totalTrips?: number;
  totalRevenue?: string;
  estimatedTax?: string;
};

// Phase 16 - Support System tables

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdByRole: ticketCreatorRoleEnum("created_by_role").notNull(),
  tripId: varchar("trip_id"),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  priority: ticketPriorityEnum("priority").notNull().default("medium"),
  assignedToUserId: varchar("assigned_to_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  senderUserId: varchar("sender_user_id").notNull(),
  senderRole: varchar("sender_role", { length: 50 }).notNull(),
  message: text("message").notNull(),
  internal: boolean("internal").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedToUserId: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

export type SupportTicketWithDetails = SupportTicket & {
  creatorName?: string;
  assignedAgentName?: string;
  messagesCount?: number;
  tripDetails?: {
    pickup: string;
    dropoff: string;
    fare: string;
  } | null;
};

// Phase 18 - Contracts, SLAs & Enterprise Billing tables

export const organizationContracts = pgTable("organization_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripCoordinatorId: varchar("trip_coordinator_id").notNull(),
  contractName: varchar("contract_name", { length: 255 }).notNull(),
  contractType: contractTypeEnum("contract_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  billingModel: billingModelEnum("billing_model").notNull().default("MONTHLY_INVOICE"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: contractStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceLevelAgreements = pgTable("service_level_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  metricType: slaMetricTypeEnum("metric_type").notNull(),
  targetValue: decimal("target_value", { precision: 5, scale: 2 }).notNull(),
  measurementPeriod: slaMeasurementPeriodEnum("measurement_period").notNull().default("MONTHLY"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const enterpriseInvoices = pgTable("enterprise_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalTrips: integer("total_trips").notNull().default(0),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrganizationContractSchema = createInsertSchema(organizationContracts).omit({
  id: true,
  createdAt: true,
});

export const insertServiceLevelAgreementSchema = createInsertSchema(serviceLevelAgreements).omit({
  id: true,
  createdAt: true,
});

export const insertEnterpriseInvoiceSchema = createInsertSchema(enterpriseInvoices).omit({
  id: true,
  createdAt: true,
});

export type InsertOrganizationContract = z.infer<typeof insertOrganizationContractSchema>;
export type OrganizationContract = typeof organizationContracts.$inferSelect;

export type InsertServiceLevelAgreement = z.infer<typeof insertServiceLevelAgreementSchema>;
export type ServiceLevelAgreement = typeof serviceLevelAgreements.$inferSelect;

export type InsertEnterpriseInvoice = z.infer<typeof insertEnterpriseInvoiceSchema>;
export type EnterpriseInvoice = typeof enterpriseInvoices.$inferSelect;

export type OrganizationContractWithDetails = OrganizationContract & {
  organizationName?: string;
  slaCount?: number;
  invoiceCount?: number;
  totalBilled?: string;
};

export type ServiceLevelAgreementWithDetails = ServiceLevelAgreement & {
  contractName?: string;
  currentValue?: number;
  compliancePercentage?: number;
};

export type EnterpriseInvoiceWithDetails = EnterpriseInvoice & {
  contractName?: string;
  organizationName?: string;
};

// Phase 19 - Growth, Marketing & Partnerships enums
export const referralOwnerRoleEnum = pgEnum("referral_owner_role", ["rider", "driver", "trip_coordinator"]);
export const referralSourceEnum = pgEnum("referral_source", ["APP", "WEB", "PARTNER"]);
export const campaignTypeEnum = pgEnum("campaign_type", ["REFERRAL", "PROMO", "PARTNERSHIP"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["ACTIVE", "PAUSED", "ENDED"]);
export const partnerTypeEnum = pgEnum("partner_type", ["NGO", "HOSPITAL", "CHURCH", "SCHOOL", "GOV", "CORPORATE"]);
export const partnerLeadStatusEnum = pgEnum("partner_lead_status", ["NEW", "CONTACTED", "IN_DISCUSSION", "SIGNED", "LOST"]);

// Phase 19 - Referral Codes
export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(),
  ownerUserId: varchar("owner_user_id").notNull(),
  ownerRole: referralOwnerRoleEnum("owner_role").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  maxUsage: integer("max_usage"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 19 - Referral Events
export const referralEvents = pgTable("referral_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referralCodeId: varchar("referral_code_id").notNull(),
  newUserId: varchar("new_user_id").notNull(),
  newUserRole: userRoleEnum("new_user_role").notNull(),
  source: referralSourceEnum("source").notNull().default("APP"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 19 - Marketing Campaigns
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: campaignTypeEnum("type").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: campaignStatusEnum("status").notNull().default("ACTIVE"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 19 - Partner Leads
export const partnerLeads = pgTable("partner_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  partnerType: partnerTypeEnum("partner_type").notNull(),
  status: partnerLeadStatusEnum("status").notNull().default("NEW"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  usageCount: true,
  createdAt: true,
});

export const insertReferralEventSchema = createInsertSchema(referralEvents).omit({
  id: true,
  createdAt: true,
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
});

export const insertPartnerLeadSchema = createInsertSchema(partnerLeads).omit({
  id: true,
  createdAt: true,
});

export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;

export type InsertReferralEvent = z.infer<typeof insertReferralEventSchema>;
export type ReferralEvent = typeof referralEvents.$inferSelect;

export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;

export type InsertPartnerLead = z.infer<typeof insertPartnerLeadSchema>;
export type PartnerLead = typeof partnerLeads.$inferSelect;

export type ReferralCodeWithStats = ReferralCode & {
  ownerName?: string;
  totalConversions?: number;
};

export type GrowthStats = {
  totalReferralCodes: number;
  activeReferralCodes: number;
  totalReferrals: number;
  referralConversionRate: number;
  activeCampaigns: number;
  totalPartnerLeads: number;
  signedPartners: number;
};

// Phase 20 - Post-Launch Monitoring & Feature Flags

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercentage: integer("rollout_percentage").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

export type PlatformMetrics = {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  tripSuccessRate: number;
  cancellationRate: number;
  avgTripCompletionTime: number;
  supportTicketVolume: number;
};

export type RiderMetrics = {
  newSignups: number;
  repeatUsageRate: number;
  failedBookingAttempts: number;
  totalRiders: number;
};

export type DriverMetrics = {
  activeDrivers: number;
  acceptanceRate: number;
  completionRate: number;
  earningsVariance: number;
  totalDrivers: number;
};

export type OrganizationMetrics = {
  activeOrganizations: number;
  tripsPerOrganization: number;
  slaComplianceRate: number;
  invoiceCount: number;
};

export type FinancialMetrics = {
  grossFares: string;
  platformCommission: string;
  refundVolume: string;
  chargebackCount: number;
  netRevenue: string;
};

export type MetricsOverview = {
  platform: PlatformMetrics;
  riders: RiderMetrics;
  drivers: DriverMetrics;
  organizations: OrganizationMetrics;
  financials: FinancialMetrics;
  alerts: MetricAlert[];
};

export type MetricAlert = {
  id: string;
  type: "warning" | "error" | "info";
  metric: string;
  message: string;
  value: number;
  threshold: number;
  createdAt: Date;
};
