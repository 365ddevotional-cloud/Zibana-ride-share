import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, decimal, serial } from "drizzle-orm/pg-core";
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
export const directorTypeEnum = pgEnum("director_type", ["contract", "employed"]);
export const rolloutStatusEnum = pgEnum("rollout_status", ["PLANNED", "PREP", "PILOT", "LIMITED_LIVE", "FULL_LIVE", "PAUSED"]);
export const driverStatusEnum = pgEnum("driver_status", ["pending", "approved", "suspended"]);

// Navigation and GPS setup enums for driver mandatory setup
export const navigationProviderEnum = pgEnum("navigation_provider", ["google_maps", "apple_maps", "waze", "other"]);
export const locationPermissionStatusEnum = pgEnum("location_permission_status", ["not_requested", "denied", "foreground_only", "granted"]);
export const tripStatusEnum = pgEnum("trip_status", ["requested", "accepted", "in_progress", "completed", "cancelled"]);
export const cancelledByEnum = pgEnum("cancelled_by", ["rider", "driver", "admin"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "paid"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "info", 
  "success", 
  "warning", 
  "ride_update",
  "ride_offer",
  "ride_accepted",
  "driver_en_route",
  "driver_arrived",
  "waiting_started",
  "ride_started",
  "ride_completed",
  "ride_cancelled",
  "safety_check",
  "compensation_notice",
  "idle_alert"
]);

// Ride offer status enum
export const rideOfferStatusEnum = pgEnum("ride_offer_status", [
  "pending",
  "accepted",
  "expired",
  "declined"
]);
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

// Phase 5 - Rider Promos & Behavior Stats enums
export const riderPromoTypeEnum = pgEnum("rider_promo_type", ["first_ride", "return_rider", "event", "community", "referral"]);
export const riderPromoStatusEnum = pgEnum("rider_promo_status", ["active", "used", "expired", "voided"]);
export const behaviorWarningLevelEnum = pgEnum("behavior_warning_level", ["none", "caution", "warning", "restricted"]);

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

// Phase 25 - Monetization, Fraud & Country Pricing enums
export const distanceUnitEnum = pgEnum("distance_unit", ["KM", "MILES"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["paystack", "flutterwave", "manual", "placeholder"]);
export const escrowStatusEnum = pgEnum("escrow_status", ["pending", "locked", "released", "held", "refunded"]);
export const financialEventTypeEnum = pgEnum("financial_event_type", [
  "PAYMENT", "ESCROW_LOCK", "ESCROW_RELEASE", "ESCROW_HOLD", "PAYOUT", 
  "FEE", "COMMISSION", "REFUND", "CANCELLATION_FEE", "RESERVATION_PREMIUM",
  "EARLY_ARRIVAL_BONUS", "CHARGEBACK", "ADJUSTMENT"
]);
export const financialActorRoleEnum = pgEnum("financial_actor_role", ["RIDER", "DRIVER", "ADMIN", "SYSTEM"]);
export const abuseTypeEnum = pgEnum("abuse_type", [
  "excessive_cancellations", "late_cancellations", "reservation_abuse", 
  "fake_movement", "excessive_idle", "unjustified_cancellations", 
  "repeated_no_shows", "cancel_after_driver_moving"
]);
export const abuseFlagStatusEnum = pgEnum("abuse_flag_status", ["pending", "reviewed", "resolved", "dismissed"]);

// Payment Source enum - determines which wallet to charge for rides
export const paymentSourceEnum = pgEnum("payment_source", ["TEST_WALLET", "MAIN_WALLET", "CARD", "BANK", "CASH"]);

// =============================================
// PHASE 1: UNIVERSAL IDENTITY FRAMEWORK ENUMS
// =============================================

// Identity verification status - applies to all users
export const identityStatusEnum = pgEnum("identity_status", ["pending", "approved", "rejected"]);

// Government ID types - country-aware
export const governmentIdTypeEnum = pgEnum("government_id_type", [
  // Nigeria
  "NIN",
  // United States  
  "STATE_ID", "US_PASSPORT", "US_DRIVER_LICENSE",
  // United Kingdom
  "UK_DRIVING_LICENSE", "UK_PASSPORT",
  // South Africa
  "SA_ID", "SA_PASSPORT",
  // Generic (for other countries)
  "NATIONAL_ID", "PASSPORT", "OTHER"
]);

// Identity action types for audit logging
export const identityActionTypeEnum = pgEnum("identity_action_type", [
  "SUBMISSION", "APPROVAL", "REJECTION", "DUPLICATE_DETECTED", "UPDATE"
]);

// =============================================
// PHASE 2: DRIVER GPS & NAVIGATION ENFORCEMENT ENUMS
// =============================================

// GPS tracking event types for audit logging
export const gpsEventTypeEnum = pgEnum("gps_event_type", [
  "GPS_ENABLED", "GPS_DISABLED", "GPS_PERMISSION_GRANTED", "GPS_PERMISSION_DENIED",
  "SPOOFING_DETECTED", "HEARTBEAT_TIMEOUT", "AUTO_OFFLINE_TRIGGERED",
  "NAVIGATION_LAUNCHED", "NAVIGATION_CLOSED", "APP_INTERRUPTED", "APP_RESUMED"
]);

// Navigation audit action types
export const navigationAuditActionEnum = pgEnum("navigation_audit_action", [
  "SETUP_STARTED", "SETUP_COMPLETED", "PROVIDER_CHANGED", "PERMISSION_GRANTED",
  "PERMISSION_DENIED", "BACKGROUND_CONSENT_GRANTED", "NAVIGATION_LAUNCHED",
  "NAVIGATION_CLOSED", "GPS_TIMEOUT", "AUTO_OFFLINE", "SPOOFING_DETECTED",
  "APP_INTERRUPTED", "APP_RESUMED", "HEARTBEAT_MISSED"
]);

// Driver online status reasons for going offline
export const offlineReasonEnum = pgEnum("offline_reason", [
  "MANUAL", "GPS_DISABLED", "GPS_TIMEOUT", "SPOOFING_DETECTED", 
  "PERMISSION_REVOKED", "APP_TERMINATED", "SYSTEM_TIMEOUT"
]);

// =============================================
// PHASE 3: RATINGS, BEHAVIOR SIGNALS & TRUST SCORING ENUMS
// =============================================

// Rating role - who is rating whom
export const ratingRoleEnum = pgEnum("rating_role", ["rider_to_driver", "driver_to_rider"]);

// Behavior signal category
export const behaviorSignalCategoryEnum = pgEnum("behavior_signal_category", ["driver", "rider"]);

// Behavior signal type - all possible signals
export const behaviorSignalTypeEnum = pgEnum("behavior_signal_type", [
  "GPS_INTERRUPTION", "TRIP_CANCELLATION", "LATE_ARRIVAL", "ROUTE_DEVIATION", 
  "APP_FORCE_CLOSE", "NO_SHOW", "TRIP_COMPLETED", "ON_TIME_ARRIVAL", "DIRECT_ROUTE",
  "CANCELLATION", "PAYMENT_FAILURE", "DISPUTE_FILED", "ON_TIME_PICKUP", "PAYMENT_SUCCESS"
]);

// Trust audit action types
export const trustAuditActionEnum = pgEnum("trust_audit_action", [
  "RATING_SUBMITTED", "SIGNAL_CAPTURED", "TRUST_SCORE_RECALCULATED",
  "RATING_FLAGGED_MANIPULATION", "RATING_DAMPENED", "OUTLIER_DETECTED"
]);

// Phase 22 - Ride Classification
export const rideClassEnum = pgEnum("ride_class", ["go", "plus", "comfort", "elite", "pet_ride", "safe_teen"]);

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
  "cancelled",
  "payment_review"
]);
export const rideCancelledByEnum = pgEnum("ride_cancelled_by", ["rider", "driver", "system"]);
export const driverCancelReasonEnum = pgEnum("driver_cancel_reason", [
  "rider_requested",
  "safety_concern",
  "vehicle_issue",
  "emergency",
  "rider_no_show",
  "other"
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "scheduled",
  "driver_assigned",
  "prep_window",
  "active",
  "completed",
  "cancelled"
]);
export const rideAuditActionEnum = pgEnum("ride_audit_action", [
  "status_change",
  "driver_assigned",
  "cancellation",
  "compensation_awarded",
  "compensation_denied",
  "admin_override",
  "safety_alert",
  "idle_alert",
  "ride_requested",
  "ride_accepted",
  "pickup_started",
  "driver_arrived",
  "waiting_started",
  "trip_started",
  "trip_completed",
  "ride_cancelled",
  "safety_check_response",
  "ride_offer_sent",
  "ride_offer_expired",
  "idle_stop_alert",
  "reservation_accepted",
  "payment_failed",
  "payment_captured"
]);

// Phase 23 - Identity Verification enums
export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "pending_review",
  "verified",
  "rejected"
]);

// Tester type enum
export const testerTypeEnum = pgEnum("tester_type", ["RIDER", "DRIVER"]);

// Supported country codes enum
export const countryCodeEnum = pgEnum("country_code", ["NG", "US", "ZA"]);

// Driver verification status enum (for withdrawal eligibility)
export const driverVerificationStatusEnum = pgEnum("driver_verification_status", [
  "pending_verification",
  "verified",
  "suspended"
]);

// Identity document types by country
export const identityDocumentTypeEnum = pgEnum("identity_document_type", [
  "DRIVER_LICENSE",
  "NIN",
  "SSN_LAST4",
  "STATE_ID",
  "NATIONAL_ID",
  "PASSPORT"
]);

// Identity verification method enum
export const identityVerificationMethodEnum = pgEnum("identity_verification_method", [
  "manual",
  "automated"
]);

// Driver withdrawal status enum
export const driverWithdrawalStatusEnum = pgEnum("driver_withdrawal_status", [
  "pending",
  "approved",
  "processing",
  "paid",
  "failed",
  "rejected",
  "blocked"
]);

// Driver withdrawal payout method enum
export const driverWithdrawalPayoutMethodEnum = pgEnum("driver_withdrawal_payout_method", [
  "BANK",
  "MOBILE_MONEY",
  "CARD_FUTURE"
]);

// User roles table - maps users to their roles with admin governance
// MULTI-ROLE SYSTEM: One user can have multiple DIFFERENT roles, but not the same role twice
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull().default("rider"),
  countryCode: countryCodeEnum("country_code").notNull().default("NG"),
  isTester: boolean("is_tester").notNull().default(false),
  testerType: testerTypeEnum("tester_type"),
  adminStartAt: timestamp("admin_start_at"),
  adminEndAt: timestamp("admin_end_at"),
  adminPermissions: text("admin_permissions").array(),
  appointedBy: varchar("appointed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Note: Unique constraint on (user_id, role) enforced via storage layer
// This allows one user to have multiple DIFFERENT roles

// Identity profiles table - stores KYC information for all users
export const identityProfiles = pgTable("identity_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  legalFirstName: varchar("legal_first_name", { length: 100 }),
  legalLastName: varchar("legal_last_name", { length: 100 }),
  dateOfBirth: timestamp("date_of_birth"),
  countryCode: countryCodeEnum("country_code"),
  residenceAddressLine1: varchar("residence_address_line1", { length: 255 }),
  residenceCity: varchar("residence_city", { length: 100 }),
  residenceState: varchar("residence_state", { length: 100 }),
  residencePostalCode: varchar("residence_postal_code", { length: 20 }),
  residenceCountryCode: countryCodeEnum("residence_country_code"),
  addressVerified: boolean("address_verified").notNull().default(false),
  identityVerified: boolean("identity_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Identity documents table - stores identity verification documents
export const identityDocuments = pgTable("identity_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  countryCode: countryCodeEnum("country_code").notNull(),
  documentType: identityDocumentTypeEnum("document_type").notNull(),
  documentNumberHash: varchar("document_number_hash", { length: 128 }).notNull(), // SHA-256 hash
  issuingAuthority: varchar("issuing_authority", { length: 200 }),
  expiryDate: timestamp("expiry_date"),
  verified: boolean("verified").notNull().default(false),
  verificationMethod: identityVerificationMethodEnum("verification_method"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver bank accounts table - stores driver bank account details for withdrawals
export const driverBankAccounts = pgTable("driver_bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().unique(), // One bank account per driver
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  bankCode: varchar("bank_code", { length: 20 }).notNull(),
  accountNumber: varchar("account_number", { length: 20 }).notNull(),
  accountNumberHash: varchar("account_number_hash", { length: 128 }).notNull(), // SHA-256 hash for uniqueness check
  accountName: varchar("account_name", { length: 200 }).notNull(),
  countryCode: countryCodeEnum("country_code").notNull().default("NG"),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationMethod: identityVerificationMethodEnum("verification_method"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver withdrawals table - tracks all driver withdrawal requests
export const driverWithdrawals = pgTable("driver_withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  payoutMethod: driverWithdrawalPayoutMethodEnum("payout_method").notNull(),
  payoutReference: varchar("payout_reference", { length: 255 }),
  bankAccountId: varchar("bank_account_id"), // Reference to driver_bank_accounts
  status: driverWithdrawalStatusEnum("status").notNull().default("pending"),
  blockReason: text("block_reason"),
  // Payout provider fields
  payoutProvider: varchar("payout_provider", { length: 50 }), // paystack, flutterwave, manual
  providerReference: varchar("provider_reference", { length: 255 }), // Provider's transfer ID
  providerStatus: varchar("provider_status", { length: 50 }), // Provider-specific status
  providerError: text("provider_error"), // Error message from provider if failed
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by"),
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
  profilePhoto: text("profile_photo"),
  verificationPhoto: text("verification_photo"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("unverified"),
  verificationTimestamp: timestamp("verification_timestamp"),
  verificationSessionId: varchar("verification_session_id"),
  navigationProvider: navigationProviderEnum("navigation_provider"),
  navigationVerified: boolean("navigation_verified").notNull().default(false),
  locationPermissionStatus: locationPermissionStatusEnum("location_permission_status").notNull().default("not_requested"),
  lastGpsHeartbeat: timestamp("last_gps_heartbeat"),
  withdrawalVerificationStatus: driverVerificationStatusEnum("withdrawal_verification_status").notNull().default("pending_verification"),
  // Nigeria-specific verification flags
  isNINVerified: boolean("is_nin_verified").notNull().default(false),
  isDriversLicenseVerified: boolean("is_drivers_license_verified").notNull().default(false),
  isAddressVerified: boolean("is_address_verified").notNull().default(false),
  isIdentityVerified: boolean("is_identity_verified").notNull().default(false),
  // Nigeria fraud prevention - hashed document numbers for uniqueness checks
  ninHash: varchar("nin_hash", { length: 128 }), // SHA-256 hash of NIN for duplicate detection
  driversLicenseHash: varchar("drivers_license_hash", { length: 128 }), // SHA-256 hash of license number
  acceptedRideClasses: text("accepted_ride_classes").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider profiles table
// Payment method enum for riders
export const paymentMethodEnum = pgEnum("payment_method", ["WALLET", "TEST_WALLET", "CARD", "CASH"]);

export const riderProfiles = pgTable("rider_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name"),
  phone: varchar("phone"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  totalRatings: integer("total_ratings").notNull().default(0),
  profilePhoto: text("profile_photo"),
  verificationPhoto: text("verification_photo"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("unverified"),
  verificationTimestamp: timestamp("verification_timestamp"),
  verificationSessionId: varchar("verification_session_id"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("WALLET"),
  cashAccessRestricted: boolean("cash_access_restricted").default(false),
  cashAccessRestrictedAt: timestamp("cash_access_restricted_at"),
  cashAccessRestrictedReason: text("cash_access_restricted_reason"),
  paymentOnboardingSeen: boolean("payment_onboarding_seen").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Director profiles table
export const directorProfiles = pgTable("director_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  email: varchar("email"),
  directorType: directorTypeEnum("director_type").notNull().default("contract"),
  referralCodeId: varchar("referral_code_id"),
  activationThreshold: integer("activation_threshold").notNull().default(10),
  maxCellSize: integer("max_cell_size").notNull().default(1300),
  commissionFrozen: boolean("commission_frozen").notNull().default(false),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: varchar("suspended_by"),
  status: directorStatusEnum("status").notNull().default("active"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  trainingCompleted: boolean("training_completed").notNull().default(false),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  terminatedAt: timestamp("terminated_at"),
  terminatedBy: varchar("terminated_by"),
  terminationReason: text("termination_reason"),
  lifecycleStatus: varchar("lifecycle_status", { length: 20 }).notNull().default("pending"),
  lifespanStartDate: timestamp("lifespan_start_date"),
  lifespanEndDate: timestamp("lifespan_end_date"),
  lifespanSetBy: varchar("lifespan_set_by"),
  maxCells: integer("max_cells").notNull().default(3),
  createdBy: varchar("created_by"),
  lastModifiedBy: varchar("last_modified_by"),
  lastModifiedAt: timestamp("last_modified_at"),
  commissionRatePercent: integer("commission_rate_percent").notNull().default(12),
  maxCommissionablePerDay: integer("max_commissionable_per_day").notNull().default(1000),
  approvedBy: varchar("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const directorCommissionSettings = pgTable("director_commission_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commissionRate: varchar("commission_rate").notNull().default("0.12"),
  activeRatio: varchar("active_ratio").notNull().default("0.77"),
  maxCommissionableDrivers: integer("max_commissionable_drivers").notNull().default(1000),
  maxCellSize: integer("max_cell_size").notNull().default(1300),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export const directorCommissionLogs = pgTable("director_commission_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  date: varchar("date").notNull(),
  totalDrivers: integer("total_drivers").notNull().default(0),
  activeDriversToday: integer("active_drivers_today").notNull().default(0),
  commissionableDrivers: integer("commissionable_drivers").notNull().default(0),
  commissionRate: varchar("commission_rate").notNull(),
  activeRatio: varchar("active_ratio").notNull(),
  platformEarnings: varchar("platform_earnings").notNull().default("0"),
  commissionAmount: varchar("commission_amount").notNull().default("0"),
  directorStatus: varchar("director_status", { length: 20 }).notNull().default("active"),
  meetsActivationThreshold: boolean("meets_activation_threshold").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const directorPayoutSummaries = pgTable("director_payout_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  periodDate: varchar("period_date").notNull(),
  periodStart: varchar("period_start"),
  periodEnd: varchar("period_end"),
  payoutCadence: varchar("payout_cadence", { length: 20 }).notNull().default("monthly"),
  activeDrivers: integer("active_drivers").notNull().default(0),
  commissionableDrivers: integer("commissionable_drivers").notNull().default(0),
  eligibleDrivers: integer("eligible_drivers").notNull().default(0),
  estimatedEarnings: varchar("estimated_earnings").notNull().default("0"),
  partialReleaseAmount: varchar("partial_release_amount"),
  commissionRateApplied: varchar("commission_rate_applied"),
  capEnforced: boolean("cap_enforced").notNull().default(false),
  payoutState: varchar("payout_state", { length: 30 }).notNull().default("calculating"),
  payoutStatus: varchar("payout_status", { length: 20 }).notNull().default("pending"),
  eligibilitySnapshot: text("eligibility_snapshot"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  scheduledReleaseDate: varchar("scheduled_release_date"),
  releasedAt: timestamp("released_at"),
  releasedBy: varchar("released_by"),
  reversedAt: timestamp("reversed_at"),
  reversedBy: varchar("reversed_by"),
  reversalReason: text("reversal_reason"),
  holdReason: text("hold_reason"),
  heldBy: varchar("held_by"),
  heldAt: timestamp("held_at"),
  adminNotes: text("admin_notes"),
  fraudFlagged: boolean("fraud_flagged").notNull().default(false),
  fraudDetails: text("fraud_details"),
  zibraFlagged: boolean("zibra_flagged").notNull().default(false),
  zibraFlagReason: text("zibra_flag_reason"),
  disputeSubmitted: boolean("dispute_submitted").notNull().default(false),
  disputeExplanation: text("dispute_explanation"),
  disputeReviewedBy: varchar("dispute_reviewed_by"),
  disputeReviewNotes: text("dispute_review_notes"),
  disputeResolvedAt: timestamp("dispute_resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const directorDriverAssignments = pgTable("director_driver_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  driverUserId: varchar("driver_user_id").notNull().unique(),
  assignmentType: varchar("assignment_type").notNull().default("referral"),
  cellNumber: integer("cell_number").notNull().default(1),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by"),
});

export const directorSettingsAuditLogs = pgTable("director_settings_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  changedBy: varchar("changed_by").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const directorAppeals = pgTable("director_appeals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  appealType: varchar("appeal_type", { length: 50 }).notNull(),
  reason: text("reason").notNull(),
  explanation: text("explanation"),
  status: varchar("appeal_status", { length: 20 }).notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
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

// =============================================
// PHASE 1: UNIVERSAL IDENTITY FRAMEWORK TABLES
// =============================================

// Universal identity profiles - applies to ALL users (drivers, riders, etc.)
export const userIdentityProfiles = pgTable("user_identity_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  
  // Core identity fields (COMMON - all users)
  legalFullName: varchar("legal_full_name", { length: 255 }).notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  residentialAddress: text("residential_address").notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull(), // ISO-2
  
  // Identity verification status
  identityVerified: boolean("identity_verified").notNull().default(false),
  identityStatus: identityStatusEnum("identity_status").notNull().default("pending"),
  
  // Government ID (country-aware) - NEVER store raw ID numbers
  governmentIdType: governmentIdTypeEnum("government_id_type"),
  governmentIdHash: varchar("government_id_hash", { length: 128 }), // SHA-256 hash
  governmentIdIssuedCountry: varchar("government_id_issued_country", { length: 2 }),
  governmentIdVerifiedAt: timestamp("government_id_verified_at"),
  
  // Driver-specific fields (only applicable to drivers)
  driverLicenseHash: varchar("driver_license_hash", { length: 128 }), // SHA-256 hash
  driverLicenseCountry: varchar("driver_license_country", { length: 2 }),
  driverLicenseVerified: boolean("driver_license_verified").notNull().default(false),
  driverLicenseVerifiedAt: timestamp("driver_license_verified_at"),
  
  // Rejection tracking
  rejectionReason: text("rejection_reason"),
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: varchar("rejected_by"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Identity audit log - immutable log of all identity actions
export const identityAuditLog = pgTable("identity_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  actionType: identityActionTypeEnum("action_type").notNull(),
  actionBy: varchar("action_by").notNull(), // userId of admin or "SYSTEM"
  actionDetails: text("action_details"), // JSON string with details
  countryCode: varchar("country_code", { length: 2 }),
  governmentIdType: governmentIdTypeEnum("government_id_type"),
  duplicateOfUserId: varchar("duplicate_of_user_id"), // If duplicate detected
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// PHASE 2: DRIVER GPS & NAVIGATION ENFORCEMENT TABLES
// =============================================

// Driver navigation setup - mandatory for all drivers before going online
export const driverNavigationSetup = pgTable("driver_navigation_setup", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  
  // Step 1: GPS Permission
  gpsPermissionGranted: boolean("gps_permission_granted").notNull().default(false),
  locationPermissionStatus: locationPermissionStatusEnum("location_permission_status").notNull().default("not_requested"),
  highAccuracyEnabled: boolean("high_accuracy_enabled").notNull().default(false),
  
  // Step 2: Navigation Provider Selection
  preferredNavigationProvider: navigationProviderEnum("preferred_navigation_provider"),
  navigationProviderSetAt: timestamp("navigation_provider_set_at"),
  
  // Step 3: Background Execution Consent
  backgroundLocationConsent: boolean("background_location_consent").notNull().default(false),
  foregroundServiceConsent: boolean("foreground_service_consent").notNull().default(false),
  
  // Setup completion
  navigationSetupCompleted: boolean("navigation_setup_completed").notNull().default(false),
  setupCompletedAt: timestamp("setup_completed_at"),
  
  // Current tracking state
  isGpsActive: boolean("is_gps_active").notNull().default(false),
  lastGpsHeartbeat: timestamp("last_gps_heartbeat"),
  lastKnownLatitude: decimal("last_known_latitude", { precision: 10, scale: 7 }),
  lastKnownLongitude: decimal("last_known_longitude", { precision: 10, scale: 7 }),
  lastLocationUpdateAt: timestamp("last_location_update_at"),
  
  // Current navigation state
  isNavigationActive: boolean("is_navigation_active").notNull().default(false),
  currentNavigationTripId: varchar("current_navigation_trip_id"),
  
  // App state tracking
  isAppInForeground: boolean("is_app_in_foreground").notNull().default(false),
  lastAppStateChange: timestamp("last_app_state_change"),
  
  // Offline reason tracking
  lastOfflineReason: offlineReasonEnum("last_offline_reason"),
  lastOfflineAt: timestamp("last_offline_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GPS tracking logs - continuous stream of location updates during online/trip
export const gpsTrackingLogs = pgTable("gps_tracking_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tripId: varchar("trip_id"), // Null if driver is online but not on trip
  
  // Location data
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // Meters
  altitude: decimal("altitude", { precision: 10, scale: 2 }), // Meters
  speed: decimal("speed", { precision: 8, scale: 2 }), // m/s
  heading: decimal("heading", { precision: 6, scale: 2 }), // Degrees
  
  // Event tracking
  eventType: gpsEventTypeEnum("event_type").notNull(),
  
  // Metadata
  deviceTimestamp: timestamp("device_timestamp").notNull(),
  serverTimestamp: timestamp("server_timestamp").defaultNow(),
  
  // Validation flags
  isSpoofingDetected: boolean("is_spoofing_detected").notNull().default(false),
  spoofingReason: text("spoofing_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Navigation audit log - immutable log of all navigation/GPS events
export const navigationAuditLog = pgTable("navigation_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tripId: varchar("trip_id"),
  
  // Action tracking
  actionType: navigationAuditActionEnum("action_type").notNull(),
  actionDetails: text("action_details"), // JSON string with details
  
  // Location at time of action
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  
  // Navigation provider used
  navigationProvider: navigationProviderEnum("navigation_provider"),
  
  // If auto-offline was triggered
  offlineReason: offlineReasonEnum("offline_reason"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

// Driver GPS interruptions - tracks when drivers get auto-offlined
export const driverGpsInterruptions = pgTable("driver_gps_interruptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tripId: varchar("trip_id"), // If on trip when interrupted
  
  // Interruption details
  interruptionReason: offlineReasonEnum("interruption_reason").notNull(),
  interruptionDetails: text("interruption_details"), // JSON with additional info
  
  // Location at interruption
  lastLatitude: decimal("last_latitude", { precision: 10, scale: 7 }),
  lastLongitude: decimal("last_longitude", { precision: 10, scale: 7 }),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
  
  // Resolution tracking
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  
  // Was trip affected?
  tripWasAffected: boolean("trip_was_affected").notNull().default(false),
  tripMarkedAsInterrupted: boolean("trip_marked_as_interrupted").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// PHASE 3: RATINGS, BEHAVIOR SIGNALS & TRUST SCORING TABLES
// =============================================

// Trip ratings - immutable ratings after completed trips
export const tripRatings = pgTable("trip_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  raterId: varchar("rater_id").notNull(),
  rateeId: varchar("ratee_id").notNull(),
  
  // Rating details
  ratingRole: ratingRoleEnum("rating_role").notNull(),
  score: integer("score").notNull(),
  
  // Anti-manipulation tracking
  effectiveWeight: decimal("effective_weight", { precision: 5, scale: 4 }).notNull().default("1.0000"),
  isDampened: boolean("is_dampened").notNull().default(false),
  dampeningReason: text("dampening_reason"),
  isOutlier: boolean("is_outlier").notNull().default(false),
  
  // Timestamps
  tripCompletedAt: timestamp("trip_completed_at").notNull(),
  ratedAt: timestamp("rated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Behavior signals - passive, numeric, timestamped signals
export const behaviorSignals = pgTable("behavior_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tripId: varchar("trip_id"),
  
  // Signal details
  category: behaviorSignalCategoryEnum("category").notNull(),
  signalType: behaviorSignalTypeEnum("signal_type").notNull(),
  signalValue: decimal("signal_value", { precision: 10, scale: 4 }).notNull(),
  
  // Metadata
  metadata: text("metadata"),
  
  // Timestamps - immutable
  createdAt: timestamp("created_at").defaultNow(),
});

// User trust profiles - internal trust scores (NOT visible to users)
export const userTrustProfiles = pgTable("user_trust_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  
  // Trust score (0-100)
  trustScore: integer("trust_score").notNull().default(75),
  trustScoreLevel: text("trust_score_level").notNull().default("medium"),
  
  // Rating components - default 5.0 star rating for new users
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  totalRatingsReceived: integer("total_ratings_received").notNull().default(0),
  totalRatingsGiven: integer("total_ratings_given").notNull().default(0),
  
  // Behavior signal components
  positiveSignalCount: integer("positive_signal_count").notNull().default(0),
  negativeSignalCount: integer("negative_signal_count").notNull().default(0),
  signalScore: decimal("signal_score", { precision: 10, scale: 4 }).notNull().default("0"),
  
  // Trip completion stats
  completedTrips: integer("completed_trips").notNull().default(0),
  totalTrips: integer("total_trips").notNull().default(0),
  completionRatio: decimal("completion_ratio", { precision: 5, scale: 4 }).notNull().default("1.0000"),
  
  // Account age factor
  accountAgeFactor: decimal("account_age_factor", { precision: 5, scale: 4 }).notNull().default("0"),
  
  // Recalculation tracking
  lastRecalculatedAt: timestamp("last_recalculated_at"),
  recalculationCount: integer("recalculation_count").notNull().default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trust audit log - immutable audit trail
export const trustAuditLog = pgTable("trust_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tripId: varchar("trip_id"),
  ratingId: varchar("rating_id"),
  signalId: varchar("signal_id"),
  
  // Action tracking
  actionType: trustAuditActionEnum("action_type").notNull(),
  actionDetails: text("action_details"),
  
  // Score changes
  previousTrustScore: integer("previous_trust_score"),
  newTrustScore: integer("new_trust_score"),
  
  // Anti-manipulation flags
  manipulationDetected: boolean("manipulation_detected").notNull().default(false),
  manipulationType: text("manipulation_type"),
  
  // Immutable timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

// Pairing blocks - prevents matching between specific rider/driver pairs
export const pairingBlocks = pgTable("pairing_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  
  // Block reason
  reason: text("reason").notNull(), // "low_rating", "rider_request", "admin_override", etc.
  tripId: varchar("trip_id"), // Trip that triggered the block (if applicable)
  ratingScore: integer("rating_score"), // The rating that triggered the block (if low_rating)
  
  // Block status
  isActive: boolean("is_active").notNull().default(true),
  
  // Admin override tracking
  removedByAdminId: varchar("removed_by_admin_id"),
  removalReason: text("removal_reason"),
  removedAt: timestamp("removed_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin rating audit log - tracks super admin rating adjustments
export const adminRatingAudit = pgTable("admin_rating_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminEmail: varchar("admin_email", { length: 255 }).notNull(),
  adminUserId: varchar("admin_user_id").notNull(),
  targetUserId: varchar("target_user_id").notNull(),
  
  // Rating changes
  oldRating: decimal("old_rating", { precision: 3, scale: 2 }).notNull(),
  newRating: decimal("new_rating", { precision: 3, scale: 2 }).notNull(),
  oldRatingCount: integer("old_rating_count").notNull(),
  newRatingCount: integer("new_rating_count"),
  
  // Reason (required)
  reason: text("reason").notNull(),
  adminNote: text("admin_note"),
  
  // Immutable timestamp
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
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("NGN"),
  estimatedTaxAmount: decimal("estimated_tax_amount", { precision: 10, scale: 2 }),
  // Payment source and test mode tracking
  paymentSource: paymentSourceEnum("payment_source"),
  isTestTrip: boolean("is_test_trip").default(false),
  driverCollected: boolean("driver_collected").default(false),
  cashSettled: boolean("cash_settled").default(false),
  cashSettlementId: varchar("cash_settlement_id"),
  riderConfirmedCash: boolean("rider_confirmed_cash").default(false),
  driverConfirmedCash: boolean("driver_confirmed_cash").default(false),
  riderConfirmedCashAt: timestamp("rider_confirmed_cash_at"),
  driverConfirmedCashAt: timestamp("driver_confirmed_cash_at"),
  cashDisputeFlag: boolean("cash_dispute_flag").default(false),
  cashDisputeReason: text("cash_dispute_reason"),
  isReserved: boolean("is_reserved").default(false),
  scheduledPickupAt: timestamp("scheduled_pickup_at"),
  reservationStatus: reservationStatusEnum("reservation_status"),
  cancellationFeeApplied: decimal("cancellation_fee_applied", { precision: 10, scale: 2 }),
  cancellationFeeDeducted: boolean("cancellation_fee_deducted").default(false),
});

// Phase 22 - Enhanced Rides table with full Uber/Lyft-style lifecycle
export const rides = pgTable("rides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  status: rideStatusEnum("status").notNull().default("requested"),
  rideClass: rideClassEnum("ride_class").notNull().default("go"),
  fareMultiplier: decimal("fare_multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"),
  
  // Location fields
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }).notNull(),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }).notNull(),
  dropoffLat: decimal("dropoff_lat", { precision: 10, scale: 7 }).notNull(),
  dropoffLng: decimal("dropoff_lng", { precision: 10, scale: 7 }).notNull(),
  pickupAddress: text("pickup_address"),
  dropoffAddress: text("dropoff_address"),
  
  // Timestamps
  requestedAt: timestamp("requested_at").defaultNow(),
  matchingExpiresAt: timestamp("matching_expires_at"),
  acceptedAt: timestamp("accepted_at"),
  enRouteAt: timestamp("en_route_at"),
  arrivedAt: timestamp("arrived_at"),
  waitingStartedAt: timestamp("waiting_started_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  
  // Estimates
  estimatedDistanceKm: decimal("estimated_distance_km", { precision: 10, scale: 2 }),
  estimatedDurationMin: decimal("estimated_duration_min", { precision: 10, scale: 2 }),
  
  // Actuals
  actualDistanceKm: decimal("actual_distance_km", { precision: 10, scale: 2 }),
  actualDurationMin: decimal("actual_duration_min", { precision: 10, scale: 2 }),
  
  // Fare breakdown
  baseFare: decimal("base_fare", { precision: 10, scale: 2 }),
  distanceFare: decimal("distance_fare", { precision: 10, scale: 2 }),
  timeFare: decimal("time_fare", { precision: 10, scale: 2 }),
  waitingFee: decimal("waiting_fee", { precision: 10, scale: 2 }),
  trafficFee: decimal("traffic_fee", { precision: 10, scale: 2 }),
  totalFare: decimal("total_fare", { precision: 10, scale: 2 }),
  
  // Payouts
  driverEarning: decimal("driver_earning", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  
  // Waiting logic
  waitingPaidMin: decimal("waiting_paid_min", { precision: 5, scale: 2 }).default("0"),
  waitingFeePaid: decimal("waiting_fee_paid", { precision: 10, scale: 2 }).default("0"),
  
  // Cancellation
  cancelReason: text("cancel_reason"),
  cancelledBy: rideCancelledByEnum("cancelled_by"),
  driverCancelReason: driverCancelReasonEnum("driver_cancel_reason"),
  
  // Cancellation compensation
  cancellationFee: decimal("cancellation_fee", { precision: 10, scale: 2 }),
  driverCancelCompensation: decimal("driver_cancel_compensation", { precision: 10, scale: 2 }),
  platformCancelFee: decimal("platform_cancel_fee", { precision: 10, scale: 2 }),
  compensationEligible: boolean("compensation_eligible").default(false),
  
  // Early stop tracking
  earlyStopConfirmed: boolean("early_stop_confirmed"),
  originalDestinationLat: decimal("original_destination_lat", { precision: 10, scale: 7 }),
  originalDestinationLng: decimal("original_destination_lng", { precision: 10, scale: 7 }),
  
  // Safety & idle detection
  lastMovementAt: timestamp("last_movement_at"),
  idleAlertSentAt: timestamp("idle_alert_sent_at"),
  safetyCheckAt: timestamp("safety_check_at"),
  
  // Multi-country support
  countryId: varchar("country_id"),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("NGN"),
  
  // Payment source snapshot (locked at ride creation)
  paymentSource: paymentSourceEnum("payment_source").notNull().default("MAIN_WALLET"),
  paymentMethodId: varchar("payment_method_id"),
  
  // Card authorization fields (for CARD payment source)
  authorizationReference: varchar("authorization_reference"),
  authorizationAmount: decimal("authorization_amount", { precision: 10, scale: 2 }),
  authorizationStatus: varchar("authorization_status", { length: 20 }),
  captureReference: varchar("capture_reference"),
  captureAmount: decimal("capture_amount", { precision: 10, scale: 2 }),
  capturedAt: timestamp("captured_at"),
  driverCollected: boolean("driver_collected").default(false),
  cashSettled: boolean("cash_settled").default(false),
  cashSettlementId: varchar("cash_settlement_id"),
  
  // Passenger info
  passengerCount: integer("passenger_count").default(1),
  
  // Reservation / Scheduled trip fields
  isReserved: boolean("is_reserved").default(false),
  scheduledPickupAt: timestamp("scheduled_pickup_at"),
  reservationStatus: reservationStatusEnum("reservation_status"),
  assignedDriverId: varchar("assigned_driver_id"),
  recommendedDepartAt: timestamp("recommended_depart_at"),
  reservationPremium: decimal("reservation_premium", { precision: 10, scale: 2 }),
  earlyArrivalBonus: decimal("early_arrival_bonus", { precision: 10, scale: 2 }),
  reservationCancelFee: decimal("reservation_cancel_fee", { precision: 10, scale: 2 }),
  driverEnRouteStartedAt: timestamp("driver_en_route_started_at"),
  reservationConfirmedAt: timestamp("reservation_confirmed_at"),
  driverAssignedAt: timestamp("driver_assigned_at"),
  earlyArrivalBonusPaid: boolean("early_arrival_bonus_paid").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 22 - Driver Movement tracking (for compensation calculation)
export const driverMovements = pgTable("driver_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  distanceKm: decimal("distance_km", { precision: 10, scale: 3 }),
  durationSec: integer("duration_sec"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Phase 22 - Ride Audit Log for tracking all actions
export const rideAuditLogs = pgTable("ride_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").notNull(),
  actorId: varchar("actor_id").notNull(),
  actorRole: varchar("actor_role", { length: 50 }).notNull(),
  action: rideAuditActionEnum("action").notNull(),
  previousStatus: rideStatusEnum("previous_status"),
  newStatus: rideStatusEnum("new_status"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
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
  referenceId: varchar("reference_id"),
  referenceType: varchar("reference_type", { length: 50 }),
  playSound: boolean("play_sound").default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ride offers table - tracks pending offers sent to drivers
export const rideOffers = pgTable("ride_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  status: rideOfferStatusEnum("status").notNull().default("pending"),
  offerExpiresAt: timestamp("offer_expires_at").notNull(),
  respondedAt: timestamp("responded_at"),
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
  ipAddress: varchar("ip_address", { length: 45 }),
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

// Phase 5 - Rider Promos table
export const riderPromos = pgTable("rider_promos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull(),
  riderId: varchar("rider_id").notNull(),
  type: riderPromoTypeEnum("type").notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  status: riderPromoStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  tripId: varchar("trip_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 5 - User Behavior Stats table (tracks acceptance/cancellation rates and matching priority)
export const userBehaviorStats = pgTable("user_behavior_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  role: varchar("role", { length: 20 }).notNull(),
  totalTripsOffered: integer("total_trips_offered").notNull().default(0),
  totalTripsAccepted: integer("total_trips_accepted").notNull().default(0),
  totalTripsCancelled: integer("total_trips_cancelled").notNull().default(0),
  totalTripsCompleted: integer("total_trips_completed").notNull().default(0),
  cancelledByUser: integer("cancelled_by_user").notNull().default(0),
  cancelledByOther: integer("cancelled_by_other").notNull().default(0),
  warningLevel: behaviorWarningLevelEnum("warning_level").notNull().default("none"),
  warningsIssued: integer("warnings_issued").notNull().default(0),
  lastWarningAt: timestamp("last_warning_at"),
  matchingPriority: decimal("matching_priority", { precision: 5, scale: 2 }).notNull().default("100"),
  incentiveEligible: boolean("incentive_eligible").notNull().default(true),
  promoEligible: boolean("promo_eligible").notNull().default(true),
  lastEvaluatedAt: timestamp("last_evaluated_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  countryEnabled: boolean("country_enabled").notNull().default(false),
  defaultSystemMode: varchar("default_system_mode", { length: 20 }).notNull().default("NORMAL"),
  systemModeReason: text("system_mode_reason"),
  systemModeChangedBy: varchar("system_mode_changed_by"),
  systemModeChangedAt: timestamp("system_mode_changed_at"),
  paymentsEnabled: boolean("payments_enabled").notNull().default(false),
  paymentProvider: varchar("payment_provider", { length: 50 }),
  rolloutStatus: rolloutStatusEnum("rollout_status").notNull().default("PLANNED"),
  rolloutStatusChangedBy: varchar("rollout_status_changed_by"),
  rolloutStatusChangedAt: timestamp("rollout_status_changed_at"),
  pilotMaxDailyTrips: integer("pilot_max_daily_trips").notNull().default(100),
  pilotMaxConcurrentDrivers: integer("pilot_max_concurrent_drivers").notNull().default(20),
  pilotSurgeEnabled: boolean("pilot_surge_enabled").notNull().default(false),
  maxAvgPickupMinutes: integer("max_avg_pickup_minutes").notNull().default(15),
  minTripCompletionRate: integer("min_trip_completion_rate").notNull().default(80),
  maxCancellationRate: integer("max_cancellation_rate").notNull().default(20),
  lastIncidentAt: timestamp("last_incident_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Phase 25 - Country Pricing Rules table
export const countryPricingRules = pgTable("country_pricing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").notNull().unique(),
  currency: varchar("currency", { length: 3 }).notNull(),
  distanceUnit: distanceUnitEnum("distance_unit").notNull().default("KM"),
  baseFare: decimal("base_fare", { precision: 10, scale: 2 }).notNull(),
  perDistanceRate: decimal("per_distance_rate", { precision: 10, scale: 4 }).notNull(),
  perMinuteRate: decimal("per_minute_rate", { precision: 10, scale: 4 }).notNull(),
  waitingRate: decimal("waiting_rate", { precision: 10, scale: 4 }).notNull(),
  minimumFare: decimal("minimum_fare", { precision: 10, scale: 2 }).notNull(),
  reservationPremiumPercent: decimal("reservation_premium_percent", { precision: 5, scale: 2 }).notNull().default("10.00"),
  cancellationFeeBase: decimal("cancellation_fee_base", { precision: 10, scale: 2 }).notNull().default("2.00"),
  cancellationFeePercent: decimal("cancellation_fee_percent", { precision: 5, scale: 2 }).notNull().default("20.00"),
  cancellationFee: decimal("cancellation_fee", { precision: 10, scale: 2 }).notNull().default("500.00"),
  cancellationFeeArrivedMultiplier: decimal("cancellation_fee_arrived_multiplier", { precision: 5, scale: 2 }).notNull().default("1.50"),
  zibaCommissionPercent: decimal("ziba_commission_percent", { precision: 5, scale: 2 }).notNull().default("20.00"),
  paymentProvider: paymentProviderEnum("payment_provider").notNull().default("placeholder"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 25 - Rider Wallets table (separate from driver wallets for clarity)
export const riderWallets = pgTable("rider_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  lockedBalance: decimal("locked_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  testerWalletBalance: decimal("tester_wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  paymentSource: paymentSourceEnum("payment_source").notNull().default("MAIN_WALLET"),
  isTestWallet: boolean("is_test_wallet").notNull().default(false),
  isFrozen: boolean("is_frozen").notNull().default(false),
  frozenAt: timestamp("frozen_at"),
  frozenReason: text("frozen_reason"),
  frozenBy: varchar("frozen_by"),
  autoTopUpEnabled: boolean("auto_top_up_enabled").notNull().default(false),
  autoTopUpThreshold: decimal("auto_top_up_threshold", { precision: 10, scale: 2 }).notNull().default("500.00"),
  autoTopUpAmount: decimal("auto_top_up_amount", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  autoTopUpPaymentMethodId: varchar("auto_top_up_payment_method_id"),
  autoTopUpLastAttemptAt: timestamp("auto_top_up_last_attempt_at"),
  autoTopUpLastFailureAt: timestamp("auto_top_up_last_failure_at"),
  autoTopUpFailureCount: integer("auto_top_up_failure_count").notNull().default(0),
  autoTopUpCooldownUntil: timestamp("auto_top_up_cooldown_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 25 - Driver Wallets table (enhanced with pending and withdrawable)
export const driverWallets = pgTable("driver_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  withdrawableBalance: decimal("withdrawable_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  testerWalletBalance: decimal("tester_wallet_balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalEarned: decimal("total_earned", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  isTestWallet: boolean("is_test_wallet").notNull().default(false),
  isFrozen: boolean("is_frozen").notNull().default(false),
  frozenAt: timestamp("frozen_at"),
  frozenReason: text("frozen_reason"),
  frozenBy: varchar("frozen_by"),
  bankName: varchar("bank_name"),
  accountNumber: varchar("account_number"),
  accountName: varchar("account_name"),
  mobileMoneyProvider: varchar("mobile_money_provider"),
  mobileMoneyNumber: varchar("mobile_money_number"),
  preferredPayoutMethod: varchar("preferred_payout_method"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider Saved Payment Methods table (cards, bank accounts, mobile money)
export const riderPaymentMethods = pgTable("rider_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // CARD, BANK, MOBILE_MONEY
  provider: varchar("provider", { length: 30 }), // Paystack, Flutterwave, Stripe
  maskedReference: varchar("masked_reference", { length: 50 }),
  isDefault: boolean("is_default").notNull().default(false),
  // Card details (masked)
  cardLast4: varchar("card_last_4", { length: 4 }),
  cardBrand: varchar("card_brand", { length: 20 }), // visa, mastercard, verve
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  cardBin: varchar("card_bin", { length: 6 }),
  // Bank details
  bankName: varchar("bank_name"),
  bankAccountLast4: varchar("bank_account_last_4", { length: 4 }),
  bankAccountName: varchar("bank_account_name"),
  // Mobile money details
  mobileMoneyProvider: varchar("mobile_money_provider"),
  mobileMoneyNumberLast4: varchar("mobile_money_number_last_4", { length: 4 }),
  // Provider authorization (for tokenized payments)
  providerAuthCode: varchar("provider_auth_code"), // Paystack authorization_code
  providerSignature: varchar("provider_signature"), // For verification
  providerBank: varchar("provider_bank"),
  providerChannel: varchar("provider_channel"),
  providerReusable: boolean("provider_reusable").default(true),
  // Metadata
  nickname: varchar("nickname", { length: 50 }),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  countryCode: varchar("country_code", { length: 2 }).notNull().default("NG"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Top-up Audit Log table (for SUPER_ADMIN wallet top-ups)
export const walletTopupLogs = pgTable("wallet_topup_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  adminId: varchar("admin_id").notNull(),
  walletType: varchar("wallet_type", { length: 10 }).notNull(), // TEST or MAIN
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 25 - ZIBA Platform Wallet table
export const zibaWallet = pgTable("ziba_wallet", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commissionBalance: decimal("commission_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  cancellationFees: decimal("cancellation_fees", { precision: 12, scale: 2 }).notNull().default("0.00"),
  reservationPremiums: decimal("reservation_premiums", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 25 - Escrow table
export const escrows = pgTable("escrows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").notNull(),
  riderId: varchar("rider_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: escrowStatusEnum("status").notNull().default("pending"),
  lockedAt: timestamp("locked_at"),
  releasedAt: timestamp("released_at"),
  heldAt: timestamp("held_at"),
  releaseToDriverId: varchar("release_to_driver_id"),
  releaseAmount: decimal("release_amount", { precision: 10, scale: 2 }),
  platformAmount: decimal("platform_amount", { precision: 10, scale: 2 }),
  disputeId: varchar("dispute_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 25 - Financial Audit Log table (MANDATORY for all financial events)
export const financialAuditLogs = pgTable("financial_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id"),
  userId: varchar("user_id").notNull(),
  actorRole: financialActorRoleEnum("actor_role").notNull(),
  eventType: financialEventTypeEnum("event_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 25 - Abuse Flags table (for fraud detection)
export const abuseFlags = pgTable("abuse_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userRole: varchar("user_role", { length: 20 }).notNull(),
  abuseType: abuseTypeEnum("abuse_type").notNull(),
  severity: fraudSeverityEnum("severity").notNull().default("low"),
  description: text("description").notNull(),
  relatedRideId: varchar("related_ride_id"),
  status: abuseFlagStatusEnum("status").notNull().default("pending"),
  reviewedByUserId: varchar("reviewed_by_user_id"),
  reviewNotes: text("review_notes"),
  penaltyApplied: decimal("penalty_applied", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Phase 25 - Driver Payout History table
export const driverPayoutHistory = pgTable("driver_payout_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: walletPayoutStatusEnum("status").notNull().default("pending"),
  method: payoutMethodEnum("method").notNull().default("manual"),
  initiatedByUserId: varchar("initiated_by_user_id").notNull(),
  processedByUserId: varchar("processed_by_user_id"),
  failureReason: text("failure_reason"),
  transactionRef: varchar("transaction_ref", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Phase 25 - Rider Transaction History table
export const riderTransactionHistory = pgTable("rider_transaction_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  type: walletTransactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  source: walletTransactionSourceEnum("source").notNull(),
  referenceId: varchar("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Revenue Split Ledger - Append-only audit trail for 80/20 driver/platform split
export const revenueSplitLedger = pgTable("revenue_split_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").notNull(),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  fareAmount: decimal("fare_amount", { precision: 12, scale: 2 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  driverShare: decimal("driver_share", { precision: 12, scale: 2 }).notNull(),
  zibaShare: decimal("ziba_share", { precision: 12, scale: 2 }).notNull(),
  driverSharePercent: integer("driver_share_percent").notNull().default(80),
  zibaSharePercent: integer("ziba_share_percent").notNull().default(20),
  isTestRide: boolean("is_test_ride").notNull().default(false),
  paymentSource: paymentSourceEnum("payment_source"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settlementStatusEnum = pgEnum("settlement_status", [
  "pending",
  "partial",
  "settled",
  "waived",
  "deferred"
]);

export const settlementMethodEnum = pgEnum("settlement_method", [
  "wallet_debit",
  "card_trip_offset",
  "weekly_invoice",
  "manual"
]);

export const ledgerStatusEnum = pgEnum("ledger_status", [
  "pending",
  "settled",
  "deferred"
]);

export const platformSettlements = pgTable("platform_settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  tripId: varchar("trip_id"),
  rideId: varchar("ride_id"),
  totalOwed: decimal("total_owed", { precision: 12, scale: 2 }).notNull(),
  totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  status: settlementStatusEnum("status").notNull().default("pending"),
  settlementMethod: settlementMethodEnum("settlement_method"),
  settledAt: timestamp("settled_at"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const driverStanding = pgTable("driver_standing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().unique(),
  currentSharePercent: integer("current_share_percent").notNull().default(70),
  totalTripsCompleted: integer("total_trips_completed").notNull().default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  accountAge: integer("account_age_days").notNull().default(0),
  lastEvaluatedAt: timestamp("last_evaluated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cashSettlementLedger = pgTable("cash_settlement_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalCashCollected: decimal("total_cash_collected", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalPlatformShareDue: decimal("total_platform_share_due", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalSettled: decimal("total_settled", { precision: 12, scale: 2 }).notNull().default("0.00"),
  settlementStatus: ledgerStatusEnum("settlement_status").notNull().default("pending"),
  settlementMethod: settlementMethodEnum("settlement_method"),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("NGN"),
  settledAt: timestamp("settled_at"),
  deferredToLedgerId: varchar("deferred_to_ledger_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cashTripDisputes = pgTable("cash_trip_disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  disputeType: varchar("dispute_type", { length: 50 }).notNull(),
  riderClaimed: boolean("rider_claimed").notNull().default(false),
  driverClaimed: boolean("driver_claimed").notNull().default(false),
  status: varchar("status", { length: 30 }).notNull().default("open"),
  adminReviewedBy: varchar("admin_reviewed_by"),
  adminNotes: text("admin_notes"),
  resolution: varchar("resolution", { length: 50 }),
  temporaryCreditAmount: decimal("temporary_credit_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const countryCashConfig = pgTable("country_cash_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 3 }).notNull().unique(),
  cashEnabled: boolean("cash_enabled").notNull().default(true),
  settlementCycle: varchar("settlement_cycle", { length: 10 }).notNull().default("weekly"),
  maxDeferredBalance: decimal("max_deferred_balance", { precision: 12, scale: 2 }).notNull().default("50000.00"),
  defaultDriverSharePercent: integer("default_driver_share_percent").notNull().default(70),
  maxDriverSharePercent: integer("max_driver_share_percent").notNull().default(80),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Identity profile schemas
export const insertIdentityProfileSchema = createInsertSchema(identityProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  addressVerified: true,
  identityVerified: true,
});

export const insertIdentityDocumentSchema = createInsertSchema(identityDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verified: true,
  verificationMethod: true,
  rejectionReason: true,
});

export const insertDriverBankAccountSchema = createInsertSchema(driverBankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  verificationMethod: true,
  verifiedAt: true,
  verifiedBy: true,
  accountNumberHash: true, // Generated server-side
});

export const insertDriverWithdrawalSchema = createInsertSchema(driverWithdrawals).omit({
  id: true,
  createdAt: true,
  requestedAt: true,
  status: true,
  processedAt: true,
  processedBy: true,
  blockReason: true,
});

export const insertRiderProfileSchema = createInsertSchema(riderProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertDirectorProfileSchema = createInsertSchema(directorProfiles).omit({
  id: true,
  createdAt: true,
  status: true,
  directorType: true,
  referralCodeId: true,
  activationThreshold: true,
  maxCellSize: true,
  commissionFrozen: true,
  suspendedAt: true,
  suspendedBy: true,
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

// Phase 22 - Enhanced Ride insert schemas
export const insertRideSchema = createInsertSchema(rides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  driverId: true,
  acceptedAt: true,
  enRouteAt: true,
  arrivedAt: true,
  waitingStartedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  matchingExpiresAt: true,
  lastMovementAt: true,
  idleAlertSentAt: true,
  safetyCheckAt: true,
});

export const insertDriverMovementSchema = createInsertSchema(driverMovements).omit({
  id: true,
  recordedAt: true,
});

export const insertRideAuditLogSchema = createInsertSchema(rideAuditLogs).omit({
  id: true,
  createdAt: true,
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

export const insertRideOfferSchema = createInsertSchema(rideOffers).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
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

export type InsertIdentityProfile = z.infer<typeof insertIdentityProfileSchema>;
export type IdentityProfile = typeof identityProfiles.$inferSelect;

export type InsertIdentityDocument = z.infer<typeof insertIdentityDocumentSchema>;
export type IdentityDocument = typeof identityDocuments.$inferSelect;

export type InsertDriverBankAccount = z.infer<typeof insertDriverBankAccountSchema>;
export type DriverBankAccount = typeof driverBankAccounts.$inferSelect;

export type InsertDriverWithdrawal = z.infer<typeof insertDriverWithdrawalSchema>;
export type DriverWithdrawal = typeof driverWithdrawals.$inferSelect;

export type InsertDriverProfile = z.infer<typeof insertDriverProfileSchema>;
export type DriverProfile = typeof driverProfiles.$inferSelect;

export type InsertRiderProfile = z.infer<typeof insertRiderProfileSchema>;
export type RiderProfile = typeof riderProfiles.$inferSelect;

export type InsertDirectorProfile = z.infer<typeof insertDirectorProfileSchema>;
export type DirectorProfile = typeof directorProfiles.$inferSelect;

export const insertDirectorCommissionSettingsSchema = createInsertSchema(directorCommissionSettings).omit({ id: true, updatedAt: true });
export const insertDirectorCommissionLogSchema = createInsertSchema(directorCommissionLogs).omit({ id: true, createdAt: true });
export const insertDirectorDriverAssignmentSchema = createInsertSchema(directorDriverAssignments).omit({ id: true, assignedAt: true });
export const insertDirectorSettingsAuditLogSchema = createInsertSchema(directorSettingsAuditLogs).omit({ id: true, createdAt: true });

export type DirectorCommissionSettings = typeof directorCommissionSettings.$inferSelect;
export type DirectorCommissionLog = typeof directorCommissionLogs.$inferSelect;
export type DirectorDriverAssignment = typeof directorDriverAssignments.$inferSelect;
export type DirectorSettingsAuditLog = typeof directorSettingsAuditLogs.$inferSelect;

export const insertDirectorPayoutSummarySchema = createInsertSchema(directorPayoutSummaries).omit({
  id: true,
  createdAt: true,
});
export type InsertDirectorPayoutSummary = z.infer<typeof insertDirectorPayoutSummarySchema>;
export type DirectorPayoutSummary = typeof directorPayoutSummaries.$inferSelect;

export const insertDirectorAppealSchema = createInsertSchema(directorAppeals).omit({ id: true, createdAt: true, reviewedBy: true, reviewNotes: true, reviewedAt: true });
export type InsertDirectorAppeal = z.infer<typeof insertDirectorAppealSchema>;
export type DirectorAppeal = typeof directorAppeals.$inferSelect;

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

// Phase 22 - Enhanced Ride types
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof rides.$inferSelect;

export type InsertDriverMovement = z.infer<typeof insertDriverMovementSchema>;
export type DriverMovement = typeof driverMovements.$inferSelect;

export type InsertRideAuditLog = z.infer<typeof insertRideAuditLogSchema>;
export type RideAuditLog = typeof rideAuditLogs.$inferSelect;

export type InsertPayoutTransaction = z.infer<typeof insertPayoutTransactionSchema>;
export type PayoutTransaction = typeof payoutTransactions.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertRideOffer = z.infer<typeof insertRideOfferSchema>;
export type RideOffer = typeof rideOffers.$inferSelect;

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
  directorType?: string;
  totalDrivers?: number;
  activeDriversToday?: number;
  commissionableDrivers?: number;
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

export const insertPlatformSettlementSchema = createInsertSchema(platformSettlements).omit({
  id: true, createdAt: true, updatedAt: true
});
export type InsertPlatformSettlement = z.infer<typeof insertPlatformSettlementSchema>;
export type PlatformSettlement = typeof platformSettlements.$inferSelect;

export const insertDriverStandingSchema = createInsertSchema(driverStanding).omit({
  id: true, createdAt: true, updatedAt: true
});
export type InsertDriverStanding = z.infer<typeof insertDriverStandingSchema>;
export type DriverStanding = typeof driverStanding.$inferSelect;

export const insertCashSettlementLedgerSchema = createInsertSchema(cashSettlementLedger).omit({
  id: true, createdAt: true, updatedAt: true
});
export type InsertCashSettlementLedger = z.infer<typeof insertCashSettlementLedgerSchema>;
export type CashSettlementLedger = typeof cashSettlementLedger.$inferSelect;

export const insertCountryCashConfigSchema = createInsertSchema(countryCashConfig).omit({
  id: true, createdAt: true, updatedAt: true
});
export type InsertCountryCashConfig = z.infer<typeof insertCountryCashConfigSchema>;
export type CountryCashConfig = typeof countryCashConfig.$inferSelect;

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

// Phase 25 - Monetization schemas and types
export const insertCountryPricingRulesSchema = createInsertSchema(countryPricingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCountryPricingRulesSchema = createInsertSchema(countryPricingRules).omit({
  id: true,
  createdAt: true,
}).partial();

export const insertRiderWalletSchema = createInsertSchema(riderWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  lockedBalance: true,
  autoTopUpLastAttemptAt: true,
  autoTopUpLastFailureAt: true,
  autoTopUpFailureCount: true,
  autoTopUpCooldownUntil: true,
});

export const insertDriverWalletSchema = createInsertSchema(driverWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  balance: true,
  pendingBalance: true,
  withdrawableBalance: true,
});

export const insertEscrowSchema = createInsertSchema(escrows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  lockedAt: true,
  releasedAt: true,
  heldAt: true,
});

export const insertFinancialAuditLogSchema = createInsertSchema(financialAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAbuseFlagSchema = createInsertSchema(abuseFlags).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  status: true,
});

export const insertDriverPayoutHistorySchema = createInsertSchema(driverPayoutHistory).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  status: true,
});

export const insertRiderTransactionHistorySchema = createInsertSchema(riderTransactionHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertCountryPricingRules = z.infer<typeof insertCountryPricingRulesSchema>;
export type CountryPricingRules = typeof countryPricingRules.$inferSelect;

export type InsertRiderWallet = z.infer<typeof insertRiderWalletSchema>;
export type RiderWallet = typeof riderWallets.$inferSelect;

export const insertRiderPaymentMethodSchema = createInsertSchema(riderPaymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRiderPaymentMethod = z.infer<typeof insertRiderPaymentMethodSchema>;
export type RiderPaymentMethod = typeof riderPaymentMethods.$inferSelect;

export type InsertDriverWallet = z.infer<typeof insertDriverWalletSchema>;
export type DriverWallet = typeof driverWallets.$inferSelect;

export type ZibaWallet = typeof zibaWallet.$inferSelect;

export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
export type Escrow = typeof escrows.$inferSelect;

export type InsertFinancialAuditLog = z.infer<typeof insertFinancialAuditLogSchema>;
export type FinancialAuditLog = typeof financialAuditLogs.$inferSelect;

export type InsertAbuseFlag = z.infer<typeof insertAbuseFlagSchema>;
export type AbuseFlag = typeof abuseFlags.$inferSelect;

export type InsertDriverPayoutHistory = z.infer<typeof insertDriverPayoutHistorySchema>;
export type DriverPayoutHistory = typeof driverPayoutHistory.$inferSelect;

export type InsertRiderTransactionHistory = z.infer<typeof insertRiderTransactionHistorySchema>;
export type RiderTransactionHistory = typeof riderTransactionHistory.$inferSelect;

export const insertRevenueSplitLedgerSchema = createInsertSchema(revenueSplitLedger).omit({
  id: true,
  createdAt: true,
});
export type InsertRevenueSplitLedger = z.infer<typeof insertRevenueSplitLedgerSchema>;
export type RevenueSplitLedger = typeof revenueSplitLedger.$inferSelect;

export type AbuseFlagWithDetails = AbuseFlag & {
  userName?: string;
  reviewedByName?: string;
};

export type EscrowWithDetails = Escrow & {
  riderName?: string;
  driverName?: string;
  ridePickup?: string;
  rideDropoff?: string;
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

// Phase 5 - Rider Promos schemas and types
export const insertRiderPromoSchema = createInsertSchema(riderPromos).omit({
  id: true,
  usedCount: true,
  usedAt: true,
  tripId: true,
  createdAt: true,
  status: true,
});

export type InsertRiderPromo = z.infer<typeof insertRiderPromoSchema>;
export type RiderPromo = typeof riderPromos.$inferSelect;

// Phase 5 - User Behavior Stats schemas and types
export const insertUserBehaviorStatsSchema = createInsertSchema(userBehaviorStats).omit({
  id: true,
  updatedAt: true,
  lastEvaluatedAt: true,
});

export type InsertUserBehaviorStats = z.infer<typeof insertUserBehaviorStatsSchema>;
export type UserBehaviorStats = typeof userBehaviorStats.$inferSelect;

export type UserBehaviorSummary = {
  userId: string;
  role: string;
  acceptanceRate: number;
  cancellationRate: number;
  completionRate: number;
  warningLevel: string;
  matchingPriority: number;
  incentiveEligible: boolean;
  promoEligible: boolean;
};

export type DriverMatchingScore = {
  driverId: string;
  proximityScore: number;
  acceptanceScore: number;
  cancellationScore: number;
  ratingScore: number;
  onlineDurationScore: number;
  totalScore: number;
};

export type IncentiveProgress = {
  programId: string;
  programName: string;
  type: string;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  rewardAmount: string;
  currency: string;
  expiresAt: string;
  status: "in_progress" | "eligible" | "earned" | "blocked";
  blockReason?: string;
};

// Phase 15 - Multi-Country Tax, Currency & Compliance schemas and types
export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// ==========================================
// PRODUCTION SWITCHES (Phase 26)
// ==========================================

export const launchModeEnum = pgEnum("launch_mode", ["soft_launch", "full_launch"]);

export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export const configAuditLogs = pgTable("config_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: varchar("config_key", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  changedBy: varchar("changed_by").notNull(),
  changedByEmail: varchar("changed_by_email"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertConfigAuditLogSchema = createInsertSchema(configAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertConfigAuditLog = z.infer<typeof insertConfigAuditLogSchema>;
export type ConfigAuditLog = typeof configAuditLogs.$inferSelect;

// Production Switch Defaults
export const PRODUCTION_SWITCH_DEFAULTS = {
  LAUNCH_MODE: "soft_launch",
  EXPLANATION_MODE: "false",
  INVITE_REQUIRED: "true",
  DRIVER_ONBOARDING_CAP: "50",
  DAILY_RIDE_LIMIT: "100",
} as const;

// =============================================
// PHASE 1: UNIVERSAL IDENTITY FRAMEWORK SCHEMAS
// =============================================

export const insertUserIdentityProfileSchema = createInsertSchema(userIdentityProfiles).omit({
  id: true,
  identityVerified: true,
  identityStatus: true,
  governmentIdVerifiedAt: true,
  driverLicenseVerifiedAt: true,
  rejectionReason: true,
  rejectedAt: true,
  rejectedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIdentityAuditLogSchema = createInsertSchema(identityAuditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertUserIdentityProfile = z.infer<typeof insertUserIdentityProfileSchema>;
export type UserIdentityProfile = typeof userIdentityProfiles.$inferSelect;
export type InsertIdentityAuditLog = z.infer<typeof insertIdentityAuditLogSchema>;
export type IdentityAuditLog = typeof identityAuditLog.$inferSelect;

// =============================================
// PHASE 2: DRIVER GPS & NAVIGATION ENFORCEMENT SCHEMAS
// =============================================

export const insertDriverNavigationSetupSchema = createInsertSchema(driverNavigationSetup).omit({
  id: true,
  setupCompletedAt: true,
  lastGpsHeartbeat: true,
  lastLocationUpdateAt: true,
  lastAppStateChange: true,
  lastOfflineAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGpsTrackingLogSchema = createInsertSchema(gpsTrackingLogs).omit({
  id: true,
  serverTimestamp: true,
  createdAt: true,
});

export const insertNavigationAuditLogSchema = createInsertSchema(navigationAuditLog).omit({
  id: true,
  createdAt: true,
});

export const insertDriverGpsInterruptionSchema = createInsertSchema(driverGpsInterruptions).omit({
  id: true,
  isResolved: true,
  resolvedAt: true,
  resolutionNotes: true,
  createdAt: true,
});

export type InsertDriverNavigationSetup = z.infer<typeof insertDriverNavigationSetupSchema>;
export type DriverNavigationSetup = typeof driverNavigationSetup.$inferSelect;
export type InsertGpsTrackingLog = z.infer<typeof insertGpsTrackingLogSchema>;
export type GpsTrackingLog = typeof gpsTrackingLogs.$inferSelect;
export type InsertNavigationAuditLog = z.infer<typeof insertNavigationAuditLogSchema>;
export type NavigationAuditLog = typeof navigationAuditLog.$inferSelect;
export type InsertDriverGpsInterruption = z.infer<typeof insertDriverGpsInterruptionSchema>;
export type DriverGpsInterruption = typeof driverGpsInterruptions.$inferSelect;

// =============================================
// PHASE 3: RATINGS, BEHAVIOR SIGNALS & TRUST SCORING SCHEMAS
// =============================================

export const insertTripRatingSchema = createInsertSchema(tripRatings).omit({
  id: true,
  effectiveWeight: true,
  isDampened: true,
  dampeningReason: true,
  isOutlier: true,
  ratedAt: true,
  createdAt: true,
});

export const insertBehaviorSignalSchema = createInsertSchema(behaviorSignals).omit({
  id: true,
  createdAt: true,
});

export const insertUserTrustProfileSchema = createInsertSchema(userTrustProfiles).omit({
  id: true,
  trustScore: true,
  trustScoreLevel: true,
  averageRating: true,
  totalRatingsReceived: true,
  totalRatingsGiven: true,
  positiveSignalCount: true,
  negativeSignalCount: true,
  signalScore: true,
  completedTrips: true,
  totalTrips: true,
  completionRatio: true,
  accountAgeFactor: true,
  lastRecalculatedAt: true,
  recalculationCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrustAuditLogSchema = createInsertSchema(trustAuditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertTripRating = z.infer<typeof insertTripRatingSchema>;
export type TripRating = typeof tripRatings.$inferSelect;
export type InsertBehaviorSignal = z.infer<typeof insertBehaviorSignalSchema>;
export type BehaviorSignal = typeof behaviorSignals.$inferSelect;
export type InsertUserTrustProfile = z.infer<typeof insertUserTrustProfileSchema>;
export type UserTrustProfile = typeof userTrustProfiles.$inferSelect;
export type InsertTrustAuditLog = z.infer<typeof insertTrustAuditLogSchema>;
export type TrustAuditLog = typeof trustAuditLog.$inferSelect;

// Pairing blocks schemas
export const insertPairingBlockSchema = createInsertSchema(pairingBlocks).omit({
  id: true,
  isActive: true,
  removedByAdminId: true,
  removalReason: true,
  removedAt: true,
  createdAt: true,
});

export type InsertPairingBlock = z.infer<typeof insertPairingBlockSchema>;
export type PairingBlock = typeof pairingBlocks.$inferSelect;

// Admin rating audit schemas
export const insertAdminRatingAuditSchema = createInsertSchema(adminRatingAudit).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminRatingAudit = z.infer<typeof insertAdminRatingAuditSchema>;
export type AdminRatingAudit = typeof adminRatingAudit.$inferSelect;

// =============================================
// PHASE 4: SAFETY & INCIDENT INTELLIGENCE
// =============================================

export const incidentTypeEnum = pgEnum("incident_type", [
  "HARASSMENT",
  "ASSAULT", 
  "UNSAFE_DRIVING",
  "PAYMENT_COERCION",
  "ACCIDENT",
  "OTHER"
]);

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "DISMISSED"
]);

export const reporterRoleEnum = pgEnum("reporter_role", ["RIDER", "DRIVER"]);

export const suspensionTypeEnum = pgEnum("suspension_type", [
  "TEMPORARY",
  "PERMANENT"
]);

export const suspensionStatusEnum = pgEnum("suspension_status", [
  "ACTIVE",
  "LIFTED",
  "EXPIRED"
]);

export const safetyAuditActionEnum = pgEnum("safety_audit_action", [
  "INCIDENT_CREATED",
  "SOS_TRIGGERED",
  "ADMIN_REVIEWED",
  "ADMIN_APPROVED",
  "ADMIN_DISMISSED",
  "ADMIN_ESCALATED",
  "USER_SUSPENDED",
  "USER_BANNED",
  "SUSPENSION_LIFTED",
  "AUTO_ESCALATED"
]);

// =============================================
// PHASE 5: DISPUTES, REFUNDS & LEGAL RESOLUTION ENUMS
// =============================================

export const phase5DisputeTypeEnum = pgEnum("phase5_dispute_type", [
  "OVERCHARGE",
  "NO_SHOW",
  "UNSAFE_BEHAVIOR",
  "SERVICE_QUALITY",
  "DAMAGE",
  "OTHER"
]);

export const phase5DisputeStatusEnum = pgEnum("phase5_dispute_status", [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED"
]);

export const phase5InitiatorRoleEnum = pgEnum("phase5_initiator_role", ["RIDER", "DRIVER"]);

export const phase5RefundTypeEnum = pgEnum("phase5_refund_type", [
  "FULL_REFUND",
  "PARTIAL_REFUND",
  "NO_REFUND"
]);

export const phase5RefundStatusEnum = pgEnum("phase5_refund_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PROCESSED"
]);

export const disputeAuditActionEnum = pgEnum("dispute_audit_action", [
  "DISPUTE_CREATED",
  "DISPUTE_REVIEWED",
  "DISPUTE_APPROVED",
  "DISPUTE_REJECTED",
  "DISPUTE_ESCALATED",
  "REFUND_INITIATED",
  "REFUND_APPROVED",
  "REFUND_REJECTED",
  "REFUND_PROCESSED",
  "PARTIAL_ADJUSTMENT",
  "CHARGEBACK_REPORTED",
  "CHARGEBACK_WON",
  "CHARGEBACK_LOST",
  "ACCOUNT_FLAGGED",
  "ACCOUNT_LOCKED"
]);

// SOS Safety Triggers - immutable snapshots
export const sosTriggers = pgTable("sos_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  triggeredBy: varchar("triggered_by").notNull(),
  triggeredByRole: reporterRoleEnum("triggered_by_role").notNull(),
  isSilentMode: boolean("is_silent_mode").default(false),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  speed: decimal("speed", { precision: 6, scale: 2 }),
  routePolyline: text("route_polyline"),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  tripStatus: text("trip_status"),
  snapshotData: text("snapshot_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Incidents - immutable after submission
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  reporterId: varchar("reporter_id").notNull(),
  reporterRole: reporterRoleEnum("reporter_role").notNull(),
  accusedUserId: varchar("accused_user_id").notNull(),
  incidentType: incidentTypeEnum("incident_type").notNull(),
  severity: incidentSeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  evidenceMetadata: text("evidence_metadata"),
  status: incidentStatusEnum("status").default("OPEN").notNull(),
  assignedAdminId: varchar("assigned_admin_id"),
  autoEscalated: boolean("auto_escalated").default(false),
  escalationReason: text("escalation_reason"),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  countryCode: varchar("country_code", { length: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Suspensions
export const userSuspensions = pgTable("user_suspensions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  suspensionType: suspensionTypeEnum("suspension_type").notNull(),
  status: suspensionStatusEnum("status").default("ACTIVE").notNull(),
  reason: text("reason").notNull(),
  relatedIncidentId: varchar("related_incident_id"),
  suspendedBy: varchar("suspended_by").notNull(),
  expiresAt: timestamp("expires_at"),
  liftedAt: timestamp("lifted_at"),
  liftedBy: varchar("lifted_by"),
  liftReason: text("lift_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Safety Audit Log - immutable
export const safetyAuditLog = pgTable("safety_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  incidentId: varchar("incident_id"),
  sosTriggerId: varchar("sos_trigger_id"),
  suspensionId: varchar("suspension_id"),
  actionType: safetyAuditActionEnum("action_type").notNull(),
  actionBy: varchar("action_by"),
  actionByRole: text("action_by_role"),
  reason: text("reason"),
  previousState: text("previous_state"),
  newState: text("new_state"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertSosTriggerSchema = createInsertSchema(sosTriggers).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  resolvedBy: true,
  autoEscalated: true,
  escalationReason: true,
  resolutionNotes: true,
  assignedAdminId: true,
});

export const insertUserSuspensionSchema = createInsertSchema(userSuspensions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  liftedAt: true,
  liftedBy: true,
  liftReason: true,
});

export const insertSafetyAuditLogSchema = createInsertSchema(safetyAuditLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertSosTrigger = z.infer<typeof insertSosTriggerSchema>;
export type SosTrigger = typeof sosTriggers.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertUserSuspension = z.infer<typeof insertUserSuspensionSchema>;
export type UserSuspension = typeof userSuspensions.$inferSelect;
export type InsertSafetyAuditLog = z.infer<typeof insertSafetyAuditLogSchema>;
export type SafetyAuditLog = typeof safetyAuditLog.$inferSelect;

// =============================================
// PHASE 10: TRUSTED CONTACTS & TRIP SHARING
// =============================================

export const trustedContacts = pgTable("trusted_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  relationship: varchar("relationship", { length: 50 }),
  isEmergencyContact: boolean("is_emergency_contact").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tripShareLinks = pgTable("trip_share_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  sharedBy: varchar("shared_by").notNull(),
  shareToken: varchar("share_token", { length: 64 }).notNull(),
  recipientPhone: varchar("recipient_phone", { length: 30 }),
  recipientName: varchar("recipient_name", { length: 100 }),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const countryEmergencyConfig = pgTable("country_emergency_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  emergencyNumber: varchar("emergency_number", { length: 20 }).notNull(),
  policeNumber: varchar("police_number", { length: 20 }),
  ambulanceNumber: varchar("ambulance_number", { length: 20 }),
  fireNumber: varchar("fire_number", { length: 20 }),
  sosInstructions: text("sos_instructions"),
  trustedContactSmsEnabled: boolean("trusted_contact_sms_enabled").default(true),
  autoShareWithContacts: boolean("auto_share_with_contacts").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTrustedContactSchema = createInsertSchema(trustedContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTripShareLinkSchema = createInsertSchema(tripShareLinks).omit({
  id: true,
  createdAt: true,
  viewCount: true,
});

export const insertCountryEmergencyConfigSchema = createInsertSchema(countryEmergencyConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrustedContact = z.infer<typeof insertTrustedContactSchema>;
export type TrustedContact = typeof trustedContacts.$inferSelect;
export type InsertTripShareLink = z.infer<typeof insertTripShareLinkSchema>;
export type TripShareLink = typeof tripShareLinks.$inferSelect;
export type InsertCountryEmergencyConfig = z.infer<typeof insertCountryEmergencyConfigSchema>;
export type CountryEmergencyConfig = typeof countryEmergencyConfig.$inferSelect;

// =============================================
// PHASE 5: DISPUTES, REFUNDS & LEGAL RESOLUTION TABLES
// =============================================

// Phase 5 Enhanced Disputes - for legal resolution
export const phase5Disputes = pgTable("phase5_disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  initiatorRole: phase5InitiatorRoleEnum("initiator_role").notNull(),
  initiatorUserId: varchar("initiator_user_id").notNull(),
  accusedUserId: varchar("accused_user_id").notNull(),
  disputeType: phase5DisputeTypeEnum("dispute_type").notNull(),
  description: text("description").notNull(),
  evidenceMetadata: text("evidence_metadata"),
  status: phase5DisputeStatusEnum("status").default("OPEN").notNull(),
  adminNotes: text("admin_notes"),
  assignedAdminId: varchar("assigned_admin_id"),
  countryCode: varchar("country_code", { length: 3 }),
  currencyCode: varchar("currency_code", { length: 3 }),
  originalFare: decimal("original_fare", { precision: 10, scale: 2 }),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Phase 5 Refund Outcomes - tied to disputes
export const phase5RefundOutcomes = pgTable("phase5_refund_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id").notNull(),
  tripId: varchar("trip_id").notNull(),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  refundType: phase5RefundTypeEnum("refund_type").notNull(),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  originalPaymentSource: paymentSourceEnum("original_payment_source"),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  status: phase5RefundStatusEnum("status").default("PENDING").notNull(),
  driverPayoutSettled: boolean("driver_payout_settled").default(false),
  platformAbsorbed: boolean("platform_absorbed").default(false),
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chargeback Flags - tracks users with payment issues
export const chargebackFlags = pgTable("chargeback_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  chargebackCount: integer("chargeback_count").default(0).notNull(),
  lastChargebackAt: timestamp("last_chargeback_at"),
  isFlagged: boolean("is_flagged").default(false),
  isLocked: boolean("is_locked").default(false),
  lockReason: text("lock_reason"),
  lockedAt: timestamp("locked_at"),
  lockedBy: varchar("locked_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dispute Audit Log - immutable for legal readiness
export const disputeAuditLog = pgTable("dispute_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id"),
  refundId: varchar("refund_id"),
  chargebackId: varchar("chargeback_id"),
  userId: varchar("user_id"),
  actionType: disputeAuditActionEnum("action_type").notNull(),
  actionBy: varchar("action_by").notNull(),
  actionByRole: text("action_by_role"),
  decision: text("decision"),
  justification: text("justification"),
  previousState: text("previous_state"),
  newState: text("new_state"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for Phase 5
export const insertPhase5DisputeSchema = createInsertSchema(phase5Disputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  resolvedBy: true,
  assignedAdminId: true,
  adminNotes: true,
});

export const insertPhase5RefundOutcomeSchema = createInsertSchema(phase5RefundOutcomes).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  processedBy: true,
});

export const insertChargebackFlagSchema = createInsertSchema(chargebackFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lockedAt: true,
  lockedBy: true,
});

export const insertDisputeAuditLogSchema = createInsertSchema(disputeAuditLog).omit({
  id: true,
  createdAt: true,
});

// Phase 5 Types
export type InsertPhase5Dispute = z.infer<typeof insertPhase5DisputeSchema>;
export type Phase5Dispute = typeof phase5Disputes.$inferSelect;
export type InsertPhase5RefundOutcome = z.infer<typeof insertPhase5RefundOutcomeSchema>;
export type Phase5RefundOutcome = typeof phase5RefundOutcomes.$inferSelect;
export type InsertChargebackFlag = z.infer<typeof insertChargebackFlagSchema>;
export type ChargebackFlag = typeof chargebackFlags.$inferSelect;
export type InsertDisputeAuditLog = z.infer<typeof insertDisputeAuditLogSchema>;
export type DisputeAuditLog = typeof disputeAuditLog.$inferSelect;

// =============================================
// COMPLIANCE & STORE READINESS ENUMS
// =============================================

export const legalDocumentTypeEnum = pgEnum("legal_document_type", [
  "TERMS_OF_SERVICE",
  "PRIVACY_POLICY",
  "COMMUNITY_GUIDELINES",
  "REFUND_DISPUTE_POLICY",
]);

export const consentTypeEnum = pgEnum("consent_type", [
  "LOCATION_TRACKING",
  "CAMERA_USAGE",
  "BACKGROUND_SAFETY_MONITORING",
  "TERMS_ACCEPTANCE",
  "PRIVACY_ACCEPTANCE",
]);

export const auditCategoryEnum = pgEnum("audit_category", [
  "RIDE_LIFECYCLE",
  "PAYMENT_ATTEMPT",
  "REFUND_DECISION",
  "ADMIN_ACTION",
  "SAFETY_INCIDENT",
  "CONSENT_GRANTED",
  "CONSENT_REVOKED",
  "COMPLIANCE_CHECK",
  "KILL_SWITCH_TOGGLE",
  "LAUNCH_MODE_CHANGE",
]);

// =============================================
// COMPLIANCE & STORE READINESS TABLES
// =============================================

// Legal documents (versioned policy documents)
export const legalDocuments = pgTable("legal_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: legalDocumentTypeEnum("document_type").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User consent records (versioned, logged)
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  consentType: consentTypeEnum("consent_type").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  granted: boolean("granted").default(false).notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  countryCode: varchar("country_code", { length: 3 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Legal acknowledgements - logs disclaimer/legal acceptances
export const legalAcknowledgements = pgTable("legal_acknowledgements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  acknowledgementType: varchar("acknowledgement_type", { length: 50 }).notNull(),
  countryCode: varchar("country_code", { length: 10 }),
  metadata: text("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supportInteractions = pgTable("support_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userRole: varchar("user_role", { length: 30 }).notNull(),
  currentScreen: varchar("current_screen", { length: 100 }),
  userMessage: text("user_message").notNull(),
  supportResponse: text("support_response").notNull(),
  matchedTemplateId: varchar("matched_template_id", { length: 100 }),
  matchedCategory: varchar("matched_category", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supportConversations = pgTable("support_conversations", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  messageCount: integer("message_count").notNull().default(0),
  currentScreen: varchar("current_screen", { length: 255 }),
  escalated: boolean("escalated").notNull().default(false),
  escalatedAt: timestamp("escalated_at"),
  escalationTicketId: varchar("escalation_ticket_id"),
  resolvedWithoutHuman: boolean("resolved_without_human").notNull().default(true),
  country: varchar("country", { length: 10 }),
});

export const supportChatMessages = pgTable("support_chat_messages", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: varchar("conversation_id").notNull(),
  role: varchar("role", { length: 10 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupportConversationSchema = createInsertSchema(supportConversations).omit({ id: true, startedAt: true, lastMessageAt: true, messageCount: true, escalated: true, escalatedAt: true, escalationTicketId: true, resolvedWithoutHuman: true });
export const insertSupportChatMessageSchema = createInsertSchema(supportChatMessages).omit({ id: true, createdAt: true });
export type SupportConversation = typeof supportConversations.$inferSelect;
export type SupportChatMessage = typeof supportChatMessages.$inferSelect;
export type InsertSupportConversation = z.infer<typeof insertSupportConversationSchema>;
export type InsertSupportChatMessage = z.infer<typeof insertSupportChatMessageSchema>;

export const zibraConfig = pgTable("zibra_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export const zibraConfigAuditLogs = pgTable("zibra_config_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: varchar("config_key", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  changedBy: varchar("changed_by").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertZibraConfigSchema = createInsertSchema(zibraConfig).omit({ id: true, updatedAt: true });
export const insertZibraConfigAuditLogSchema = createInsertSchema(zibraConfigAuditLogs).omit({ id: true, createdAt: true });
export type ZibraConfig = typeof zibraConfig.$inferSelect;
export type InsertZibraConfig = z.infer<typeof insertZibraConfigSchema>;
export type ZibraConfigAuditLog = typeof zibraConfigAuditLogs.$inferSelect;
export type InsertZibraConfigAuditLog = z.infer<typeof insertZibraConfigAuditLogSchema>;

// Compliance audit log (immutable, exportable)
export const complianceAuditLog = pgTable("compliance_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: auditCategoryEnum("category").notNull(),
  userId: varchar("user_id"),
  actionBy: varchar("action_by"),
  actionByRole: varchar("action_by_role", { length: 50 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventData: text("event_data"), // JSON stringified
  tripId: varchar("trip_id"),
  paymentId: varchar("payment_id"),
  incidentId: varchar("incident_id"),
  disputeId: varchar("dispute_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  countryCode: varchar("country_code", { length: 3 }),
  isTestMode: boolean("is_test_mode").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Launch mode settings (SUPER_ADMIN only)
export const launchSettings = pgTable("launch_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: boolean("setting_value").default(false).notNull(),
  description: text("description"),
  lastChangedBy: varchar("last_changed_by"),
  lastChangedAt: timestamp("last_changed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Kill switch states (emergency controls)
export const killSwitchStates = pgTable("kill_switch_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  switchName: varchar("switch_name", { length: 100 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull().default("GLOBAL"),
  scopeCountryCode: varchar("scope_country_code", { length: 3 }),
  scopeSubregionCode: varchar("scope_subregion_code", { length: 10 }),
  isActive: boolean("is_active").default(false).notNull(),
  reason: text("reason"),
  activatedBy: varchar("activated_by"),
  activatedAt: timestamp("activated_at"),
  deactivatedBy: varchar("deactivated_by"),
  deactivatedAt: timestamp("deactivated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Test user flags (isolation tracking)
export const testUserFlags = pgTable("test_user_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  isTestUser: boolean("is_test_user").default(false).notNull(),
  testBadge: varchar("test_badge", { length: 50 }),
  excludeFromAnalytics: boolean("exclude_from_analytics").default(true).notNull(),
  excludeFromRevenue: boolean("exclude_from_revenue").default(true).notNull(),
  markedBy: varchar("marked_by"),
  markedAt: timestamp("marked_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// First app use compliance confirmation
export const complianceConfirmations = pgTable("compliance_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  confirmationType: varchar("confirmation_type", { length: 100 }).notNull(),
  confirmedAt: timestamp("confirmed_at").defaultNow().notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertUserConsentSchema = createInsertSchema(userConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertComplianceAuditLogSchema = createInsertSchema(complianceAuditLog).omit({
  id: true,
  createdAt: true,
});
export const insertLegalAcknowledgementSchema = createInsertSchema(legalAcknowledgements).omit({
  id: true,
  createdAt: true,
});
export const insertSupportInteractionSchema = createInsertSchema(supportInteractions).omit({
  id: true,
  createdAt: true,
});
export const insertLaunchSettingSchema = createInsertSchema(launchSettings).omit({
  id: true,
  createdAt: true,
});
export const insertKillSwitchStateSchema = createInsertSchema(killSwitchStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTestUserFlagSchema = createInsertSchema(testUserFlags).omit({
  id: true,
  createdAt: true,
});
export const insertComplianceConfirmationSchema = createInsertSchema(complianceConfirmations).omit({
  id: true,
  createdAt: true,
});

// Scheduled rating notifications table - delayed delivery for <3 star ratings
export const scheduledRatingNotifications = pgTable("scheduled_rating_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ratingId: varchar("rating_id").notNull(),
  tripId: varchar("trip_id").notNull(),
  recipientUserId: varchar("recipient_user_id").notNull(),
  recipientRole: notificationRoleEnum("recipient_role").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  sendAt: timestamp("send_at").notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScheduledRatingNotificationSchema = createInsertSchema(scheduledRatingNotifications).omit({
  id: true,
  sent: true,
  sentAt: true,
  createdAt: true,
});

export type InsertScheduledRatingNotification = z.infer<typeof insertScheduledRatingNotificationSchema>;
export type ScheduledRatingNotification = typeof scheduledRatingNotifications.$inferSelect;

// =============================================
// PHASE 3: ADMIN OVERRIDE CONTROL & SUPPORT SAFETY
// =============================================

export const adminOverrideActionEnum = pgEnum("admin_override_action", [
  "FORCE_LOGOUT",
  "RESET_SESSION",
  "RESTORE_AUTO_LOGIN",
  "ENABLE_DRIVER_ONLINE",
  "DISABLE_DRIVER_ONLINE",
  "CLEAR_CANCELLATION_FLAGS",
  "RESTORE_DRIVER_ACCESS",
  "CLEAR_RIDER_CANCELLATION_WARNING",
  "RESTORE_RIDE_ACCESS"
]);

export const adminOverrideStatusEnum = pgEnum("admin_override_status", ["active", "expired", "reverted"]);

export const adminOverrides = pgTable("admin_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetUserId: varchar("target_user_id").notNull(),
  adminActorId: varchar("admin_actor_id").notNull(),
  actionType: adminOverrideActionEnum("action_type").notNull(),
  overrideReason: text("override_reason").notNull(),
  status: adminOverrideStatusEnum("status").notNull().default("active"),
  overrideExpiresAt: timestamp("override_expires_at"),
  previousState: text("previous_state"),
  newState: text("new_state"),
  revertedAt: timestamp("reverted_at"),
  revertedBy: varchar("reverted_by"),
  revertReason: text("revert_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminOverrideAuditLog = pgTable("admin_override_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  overrideId: varchar("override_id"),
  adminActorId: varchar("admin_actor_id").notNull(),
  affectedUserId: varchar("affected_user_id").notNull(),
  actionType: adminOverrideActionEnum("action_type").notNull(),
  overrideReason: text("override_reason").notNull(),
  previousState: text("previous_state"),
  newState: text("new_state"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminOverrideSchema = createInsertSchema(adminOverrides).omit({ id: true, status: true, revertedAt: true, revertedBy: true, revertReason: true, createdAt: true });
export type InsertAdminOverride = z.infer<typeof insertAdminOverrideSchema>;
export type AdminOverride = typeof adminOverrides.$inferSelect;

export const insertAdminOverrideAuditLogSchema = createInsertSchema(adminOverrideAuditLog).omit({ id: true, createdAt: true });
export type InsertAdminOverrideAuditLog = z.infer<typeof insertAdminOverrideAuditLogSchema>;
export type AdminOverrideAuditLog = typeof adminOverrideAuditLog.$inferSelect;

// Phase 4 - User Analytics: New vs Returning User tracking
export const userAnalytics = pgTable("user_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull(),
  firstSessionAt: timestamp("first_session_at"),
  lastSessionAt: timestamp("last_session_at"),
  sessionCount: integer("session_count").notNull().default(0),
  lastActiveAt: timestamp("last_active_at"),
  firstRideAt: timestamp("first_ride_at"),
  firstTripAt: timestamp("first_trip_at"),
  totalRidesCompleted: integer("total_rides_completed").notNull().default(0),
  totalTripsCompleted: integer("total_trips_completed").notNull().default(0),
  activatedAt: timestamp("activated_at"),
  lastOnlineAt: timestamp("last_online_at"),
  onlineDaysLast7: integer("online_days_last_7").notNull().default(0),
  onlineDaysLast30: integer("online_days_last_30").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserAnalyticsSchema = createInsertSchema(userAnalytics).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserAnalytics = z.infer<typeof insertUserAnalyticsSchema>;
export type UserAnalytics = typeof userAnalytics.$inferSelect;

// Types
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertComplianceAuditLog = z.infer<typeof insertComplianceAuditLogSchema>;
export type ComplianceAuditLog = typeof complianceAuditLog.$inferSelect;
export type InsertLegalAcknowledgement = z.infer<typeof insertLegalAcknowledgementSchema>;
export type LegalAcknowledgement = typeof legalAcknowledgements.$inferSelect;
export type InsertSupportInteraction = z.infer<typeof insertSupportInteractionSchema>;
export type SupportInteraction = typeof supportInteractions.$inferSelect;
export type InsertLaunchSetting = z.infer<typeof insertLaunchSettingSchema>;
export type LaunchSetting = typeof launchSettings.$inferSelect;
export type InsertKillSwitchState = z.infer<typeof insertKillSwitchStateSchema>;
export type KillSwitchState = typeof killSwitchStates.$inferSelect;
export type InsertTestUserFlag = z.infer<typeof insertTestUserFlagSchema>;
export type TestUserFlag = typeof testUserFlags.$inferSelect;
export type InsertComplianceConfirmation = z.infer<typeof insertComplianceConfirmationSchema>;
export type ComplianceConfirmation = typeof complianceConfirmations.$inferSelect;

// =============================================
// PHASE 6: LAUNCH READINESS & SAFETY KILL-SWITCHES
// =============================================

export const systemModeEnum = pgEnum("system_mode", ["NORMAL", "LIMITED", "EMERGENCY"]);

export const vehicleTypeEnum = pgEnum("vehicle_type_supply", ["car", "bike"]);

export const killSwitchScopeEnum = pgEnum("kill_switch_scope", ["GLOBAL", "COUNTRY", "SUBREGION"]);

export const subregionTypeEnum = pgEnum("subregion_type", ["state", "province", "region", "county"]);

// Phase 9 - Driver Acquisition Automation
export const acquisitionChannelEnum = pgEnum("acquisition_channel", ["REFERRAL", "FLEET_OWNER", "PUBLIC_SIGNUP", "ADMIN_INVITED"]);
export const driverOnboardingStageEnum = pgEnum("driver_onboarding_stage", ["SIGNUP", "DOCUMENTS", "REVIEW", "FIRST_TRIP", "ACTIVE"]);
export const supplyAlertStatusEnum = pgEnum("supply_alert_status", ["ACTIVE", "RESOLVED", "EXPIRED"]);
export const acquisitionPauseStatusEnum = pgEnum("acquisition_pause_status", ["ACTIVE", "PAUSED"]);

export const stateLaunchConfigs = pgTable("state_launch_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 3 }).notNull().default("NG"),
  stateCode: varchar("state_code", { length: 5 }).notNull(),
  stateName: varchar("state_name", { length: 100 }).notNull(),
  subregionType: subregionTypeEnum("subregion_type").notNull().default("state"),
  stateEnabled: boolean("state_enabled").notNull().default(false),
  minOnlineDriversCar: integer("min_online_drivers_car").notNull().default(3),
  minOnlineDriversBike: integer("min_online_drivers_bike").notNull().default(2),
  minOnlineDriversKeke: integer("min_online_drivers_keke").notNull().default(1),
  maxPickupWaitMinutes: integer("max_pickup_wait_minutes").notNull().default(15),
  avgPickupTimeMinutes: decimal("avg_pickup_time_minutes", { precision: 5, scale: 1 }).default("0"),
  currentOnlineDriversCar: integer("current_online_drivers_car").notNull().default(0),
  currentOnlineDriversBike: integer("current_online_drivers_bike").notNull().default(0),
  currentOnlineDriversKeke: integer("current_online_drivers_keke").notNull().default(0),
  autoDisableOnWaitExceed: boolean("auto_disable_on_wait_exceed").notNull().default(true),
  lastUpdatedBy: varchar("last_updated_by"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemModeConfig = pgTable("system_mode_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  currentMode: systemModeEnum("current_mode").notNull().default("NORMAL"),
  scopeLevel: varchar("scope_level", { length: 20 }).notNull().default("GLOBAL"),
  scopeRef: varchar("scope_ref", { length: 10 }),
  reason: text("reason"),
  changedBy: varchar("changed_by"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStateLaunchConfigSchema = createInsertSchema(stateLaunchConfigs).omit({
  id: true,
  createdAt: true,
});
export type InsertStateLaunchConfig = z.infer<typeof insertStateLaunchConfigSchema>;
export type StateLaunchConfig = typeof stateLaunchConfigs.$inferSelect;

export const insertSystemModeConfigSchema = createInsertSchema(systemModeConfig).omit({
  id: true,
  createdAt: true,
});
export type InsertSystemModeConfig = z.infer<typeof insertSystemModeConfigSchema>;
export type SystemModeConfig = typeof systemModeConfig.$inferSelect;

export type LaunchReadinessStatus = {
  country: Country | null;
  systemMode: "NORMAL" | "LIMITED" | "EMERGENCY";
  systemModeReason: string | null;
  states: StateLaunchConfig[];
  killSwitches: KillSwitchState[];
  activeKillSwitchCount: number;
};

// =============================================
// PHASE 9: DRIVER ACQUISITION AUTOMATION
// =============================================

export const fleetOwners = pgTable("fleet_owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  companyName: varchar("company_name", { length: 200 }),
  countryCode: varchar("country_code", { length: 3 }).notNull().default("NG"),
  maxDrivers: integer("max_drivers").notNull().default(50),
  activeDrivers: integer("active_drivers").notNull().default(0),
  totalDriversInvited: integer("total_drivers_invited").notNull().default(0),
  bonusPerActivation: decimal("bonus_per_activation", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalBonusEarned: decimal("total_bonus_earned", { precision: 10, scale: 2 }).notNull().default("0.00"),
  suspended: boolean("suspended").notNull().default(false),
  suspendedReason: text("suspended_reason"),
  suspendedAt: timestamp("suspended_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const driverAcquisitions = pgTable("driver_acquisitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverUserId: varchar("driver_user_id").notNull().unique(),
  channel: acquisitionChannelEnum("channel").notNull(),
  referralCodeId: varchar("referral_code_id"),
  referredByUserId: varchar("referred_by_user_id"),
  fleetOwnerId: varchar("fleet_owner_id"),
  invitedByAdminId: varchar("invited_by_admin_id"),
  onboardingStage: driverOnboardingStageEnum("onboarding_stage").notNull().default("SIGNUP"),
  onboardingStartedAt: timestamp("onboarding_started_at").defaultNow(),
  documentsUploadedAt: timestamp("documents_uploaded_at"),
  reviewStartedAt: timestamp("review_started_at"),
  approvedAt: timestamp("approved_at"),
  firstTripAt: timestamp("first_trip_at"),
  activatedAt: timestamp("activated_at"),
  approvalTimeMinutes: integer("approval_time_minutes"),
  countryCode: varchar("country_code", { length: 3 }).notNull().default("NG"),
  stateCode: varchar("state_code", { length: 5 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const driverReferralRewards = pgTable("driver_referral_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: varchar("referrer_user_id").notNull(),
  referredDriverUserId: varchar("referred_driver_user_id").notNull(),
  referralCodeId: varchar("referral_code_id").notNull(),
  requiredTrips: integer("required_trips").notNull().default(5),
  completedTrips: integer("completed_trips").notNull().default(0),
  requiredWithinDays: integer("required_within_days").notNull().default(30),
  deadlineAt: timestamp("deadline_at").notNull(),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  expired: boolean("expired").notNull().default(false),
  fraudFlagged: boolean("fraud_flagged").notNull().default(false),
  fraudReason: text("fraud_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supplyAlerts = pgTable("supply_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 3 }).notNull(),
  stateCode: varchar("state_code", { length: 5 }).notNull(),
  status: supplyAlertStatusEnum("status").notNull().default("ACTIVE"),
  onlineDrivers: integer("online_drivers").notNull().default(0),
  avgPickupMinutes: decimal("avg_pickup_minutes", { precision: 5, scale: 1 }),
  failedRequests: integer("failed_requests").notNull().default(0),
  referralBoostTriggered: boolean("referral_boost_triggered").notNull().default(false),
  bonusTriggered: boolean("bonus_triggered").notNull().default(false),
  inactiveDriversNotified: integer("inactive_drivers_notified").notNull().default(0),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const acquisitionZoneControls = pgTable("acquisition_zone_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 3 }).notNull(),
  stateCode: varchar("state_code", { length: 5 }),
  status: acquisitionPauseStatusEnum("status").notNull().default("ACTIVE"),
  pausedByUserId: varchar("paused_by_user_id"),
  pauseReason: text("pause_reason"),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const driverAutoMessages = pgTable("driver_auto_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverUserId: varchar("driver_user_id").notNull(),
  messageType: varchar("message_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  countryCode: varchar("country_code", { length: 3 }),
  stateCode: varchar("state_code", { length: 5 }),
  delivered: boolean("delivered").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFleetOwnerSchema = createInsertSchema(fleetOwners).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFleetOwner = z.infer<typeof insertFleetOwnerSchema>;
export type FleetOwner = typeof fleetOwners.$inferSelect;

export const insertDriverAcquisitionSchema = createInsertSchema(driverAcquisitions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriverAcquisition = z.infer<typeof insertDriverAcquisitionSchema>;
export type DriverAcquisition = typeof driverAcquisitions.$inferSelect;

export const insertDriverReferralRewardSchema = createInsertSchema(driverReferralRewards).omit({ id: true, createdAt: true });
export type InsertDriverReferralReward = z.infer<typeof insertDriverReferralRewardSchema>;
export type DriverReferralReward = typeof driverReferralRewards.$inferSelect;

export const insertSupplyAlertSchema = createInsertSchema(supplyAlerts).omit({ id: true, createdAt: true });
export type InsertSupplyAlert = z.infer<typeof insertSupplyAlertSchema>;
export type SupplyAlert = typeof supplyAlerts.$inferSelect;

export const insertAcquisitionZoneControlSchema = createInsertSchema(acquisitionZoneControls).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAcquisitionZoneControl = z.infer<typeof insertAcquisitionZoneControlSchema>;
export type AcquisitionZoneControl = typeof acquisitionZoneControls.$inferSelect;

export const insertDriverAutoMessageSchema = createInsertSchema(driverAutoMessages).omit({ id: true, createdAt: true });
export type InsertDriverAutoMessage = z.infer<typeof insertDriverAutoMessageSchema>;
export type DriverAutoMessage = typeof driverAutoMessages.$inferSelect;

export type DriverAcquisitionAnalytics = {
  totalAcquired: number;
  byChannel: Record<string, number>;
  avgTimeToFirstTrip: number;
  referralConversionRate: number;
  fleetOwnerEffectiveness: number;
  retentionD7: number;
  retentionD30: number;
  costPerActivatedDriver: number;
  activeSupplyAlerts: number;
  onboardingPipeline: Record<string, number>;
};

// =============================================
// PHASE 10A: IN-APP Q&A & HELP CENTER
// =============================================

export const helpArticleAudienceEnum = pgEnum("help_article_audience", ["ALL", "RIDER", "DRIVER", "ADMIN"]);
export const helpArticleStatusEnum = pgEnum("help_article_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const helpCategories = pgTable("help_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  audience: helpArticleAudienceEnum("audience").notNull().default("ALL"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const helpArticles = pgTable("help_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => helpCategories.id),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  summary: text("summary"),
  content: text("content").notNull(),
  audience: helpArticleAudienceEnum("audience").notNull().default("ALL"),
  status: helpArticleStatusEnum("status").notNull().default("DRAFT"),
  tags: text("tags").array(),
  viewCount: integer("view_count").notNull().default(0),
  helpfulYes: integer("helpful_yes").notNull().default(0),
  helpfulNo: integer("helpful_no").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  countryCode: varchar("country_code", { length: 3 }),
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const helpSearchLogs = pgTable("help_search_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  query: text("query").notNull(),
  resultsCount: integer("results_count").notNull().default(0),
  clickedArticleId: varchar("clicked_article_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHelpCategorySchema = createInsertSchema(helpCategories).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHelpCategory = z.infer<typeof insertHelpCategorySchema>;
export type HelpCategory = typeof helpCategories.$inferSelect;

export const insertHelpArticleSchema = createInsertSchema(helpArticles).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, helpfulYes: true, helpfulNo: true });
export type InsertHelpArticle = z.infer<typeof insertHelpArticleSchema>;
export type HelpArticle = typeof helpArticles.$inferSelect;

export const insertHelpSearchLogSchema = createInsertSchema(helpSearchLogs).omit({ id: true, createdAt: true });
export type InsertHelpSearchLog = z.infer<typeof insertHelpSearchLogSchema>;
export type HelpSearchLog = typeof helpSearchLogs.$inferSelect;

export type HelpArticleWithCategory = HelpArticle & {
  categoryName?: string;
  categorySlug?: string;
};

// =============================================
// PHASE 11A: GROWTH, MARKETING & VIRALITY
// =============================================

export const riderReferralRewards = pgTable("rider_referral_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: varchar("referrer_user_id").notNull(),
  referredRiderUserId: varchar("referred_rider_user_id").notNull(),
  referralCodeId: varchar("referral_code_id").notNull(),
  firstRideCompleted: boolean("first_ride_completed").notNull().default(false),
  firstRideCompletedAt: timestamp("first_ride_completed_at"),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  fraudFlagged: boolean("fraud_flagged").notNull().default(false),
  fraudReason: text("fraud_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shareableMomentTypeEnum = pgEnum("shareable_moment_type", ["FIRST_RIDE", "MILESTONE_EARNINGS", "HIGH_RATING", "TRIP_COUNT_MILESTONE"]);

export const shareableMoments = pgTable("shareable_moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  momentType: shareableMomentTypeEnum("moment_type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  shared: boolean("shared").notNull().default(false),
  sharedAt: timestamp("shared_at"),
  dismissed: boolean("dismissed").notNull().default(false),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reactivationStatusEnum = pgEnum("reactivation_status", ["ACTIVE", "PAUSED", "ENDED"]);

export const reactivationRules = pgTable("reactivation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  targetRole: varchar("target_role", { length: 20 }).notNull(),
  inactiveDaysThreshold: integer("inactive_days_threshold").notNull().default(14),
  messageTitle: varchar("message_title", { length: 200 }).notNull(),
  messageBody: text("message_body").notNull(),
  incentiveType: varchar("incentive_type", { length: 50 }),
  incentiveValue: decimal("incentive_value", { precision: 10, scale: 2 }),
  countryCode: varchar("country_code", { length: 3 }),
  status: reactivationStatusEnum("status").notNull().default("ACTIVE"),
  triggerCount: integer("trigger_count").notNull().default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const growthSafetyControls = pgTable("growth_safety_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlType: varchar("control_type", { length: 50 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  countryCode: varchar("country_code", { length: 3 }),
  maxReferralRewardPerUser: integer("max_referral_reward_per_user"),
  maxDailyReferrals: integer("max_daily_referrals"),
  viralityEnabled: boolean("virality_enabled").notNull().default(true),
  shareMomentsEnabled: boolean("share_moments_enabled").notNull().default(true),
  reactivationEnabled: boolean("reactivation_enabled").notNull().default(true),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaignDetails = pgTable("campaign_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  targetAudience: varchar("target_audience", { length: 50 }),
  countryCode: varchar("country_code", { length: 3 }),
  subregion: varchar("subregion", { length: 100 }),
  incentiveType: varchar("incentive_type", { length: 50 }),
  incentiveValue: decimal("incentive_value", { precision: 10, scale: 2 }),
  incentiveRules: text("incentive_rules"),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attributionSourceEnum = pgEnum("attribution_source", ["REFERRAL", "CAMPAIGN", "ORGANIC", "ADMIN_INVITE"]);

export const marketingAttributions = pgTable("marketing_attributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  source: attributionSourceEnum("source").notNull().default("ORGANIC"),
  referralCodeId: varchar("referral_code_id"),
  campaignId: varchar("campaign_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRiderReferralRewardSchema = createInsertSchema(riderReferralRewards).omit({ id: true, createdAt: true });
export type InsertRiderReferralReward = z.infer<typeof insertRiderReferralRewardSchema>;
export type RiderReferralReward = typeof riderReferralRewards.$inferSelect;

export const insertShareableMomentSchema = createInsertSchema(shareableMoments).omit({ id: true, createdAt: true });
export type InsertShareableMoment = z.infer<typeof insertShareableMomentSchema>;
export type ShareableMoment = typeof shareableMoments.$inferSelect;

export const insertReactivationRuleSchema = createInsertSchema(reactivationRules).omit({ id: true, createdAt: true, updatedAt: true, triggerCount: true });
export type InsertReactivationRule = z.infer<typeof insertReactivationRuleSchema>;
export type ReactivationRule = typeof reactivationRules.$inferSelect;

export const insertGrowthSafetyControlSchema = createInsertSchema(growthSafetyControls).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthSafetyControl = z.infer<typeof insertGrowthSafetyControlSchema>;
export type GrowthSafetyControl = typeof growthSafetyControls.$inferSelect;

export const insertCampaignDetailSchema = createInsertSchema(campaignDetails).omit({ id: true, createdAt: true, currentRedemptions: true });
export type InsertCampaignDetail = z.infer<typeof insertCampaignDetailSchema>;
export type CampaignDetail = typeof campaignDetails.$inferSelect;

export const insertMarketingAttributionSchema = createInsertSchema(marketingAttributions).omit({ id: true, createdAt: true });
export type InsertMarketingAttribution = z.infer<typeof insertMarketingAttributionSchema>;
export type MarketingAttribution = typeof marketingAttributions.$inferSelect;

export type CampaignWithDetails = MarketingCampaign & {
  details?: CampaignDetail;
};

export const mileageSourceEnum = pgEnum("mileage_source", ["trip", "enroute"]);

export const driverMileageDaily = pgTable("driver_mileage_daily", {
  id: serial("id").primaryKey(),
  driverUserId: varchar("driver_user_id").notNull(),
  date: timestamp("date").notNull(),
  milesDriven: decimal("miles_driven", { precision: 10, scale: 2 }).notNull().default("0.00"),
  source: mileageSourceEnum("source").notNull().default("enroute"),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverMileageDailySchema = createInsertSchema(driverMileageDaily).omit({ id: true, createdAt: true });
export type InsertDriverMileageDaily = z.infer<typeof insertDriverMileageDailySchema>;
export type DriverMileageDaily = typeof driverMileageDaily.$inferSelect;

export const driverMileageLogs = pgTable("driver_mileage_logs", {
  id: serial("id").primaryKey(),
  driverUserId: varchar("driver_user_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  totalMilesOnline: decimal("total_miles_online", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalTripMiles: decimal("total_trip_miles", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalEnrouteMiles: decimal("total_enroute_miles", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverMileageLogSchema = createInsertSchema(driverMileageLogs).omit({ id: true, createdAt: true, lastUpdatedAt: true });
export type InsertDriverMileageLog = z.infer<typeof insertDriverMileageLogSchema>;
export type DriverMileageLog = typeof driverMileageLogs.$inferSelect;

export const driverMileageSessions = pgTable("driver_mileage_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  driverUserId: varchar("driver_user_id").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  lastLat: decimal("last_lat", { precision: 10, scale: 7 }),
  lastLng: decimal("last_lng", { precision: 10, scale: 7 }),
  lastUpdateAt: timestamp("last_update_at").defaultNow(),
  totalMilesAccumulated: decimal("total_miles_accumulated", { precision: 10, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverMileageSessionSchema = createInsertSchema(driverMileageSessions).omit({ id: true, createdAt: true });
export type InsertDriverMileageSession = z.infer<typeof insertDriverMileageSessionSchema>;
export type DriverMileageSession = typeof driverMileageSessions.$inferSelect;

// =============================================
// TAX STATEMENT DATA MODEL
// =============================================
export const taxClassificationEnum = pgEnum("tax_classification", ["independent_contractor", "self_employed", "other"]);
export const taxSummaryStatusEnum = pgEnum("tax_summary_status", ["draft", "finalized", "issued"]);
export const taxDocumentTypeEnum = pgEnum("tax_document_type", ["1099", "annual_statement", "country_equivalent"]);

export const driverTaxProfiles = pgTable("driver_tax_profiles", {
  id: serial("id").primaryKey(),
  driverUserId: varchar("driver_user_id").notNull(),
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  taxId: varchar("tax_id", { length: 200 }),
  country: varchar("country", { length: 3 }).notNull(),
  taxClassification: taxClassificationEnum("tax_classification").notNull().default("independent_contractor"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDriverTaxProfileSchema = createInsertSchema(driverTaxProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriverTaxProfile = z.infer<typeof insertDriverTaxProfileSchema>;
export type DriverTaxProfile = typeof driverTaxProfiles.$inferSelect;

export const driverTaxYearSummaries = pgTable("driver_tax_year_summaries", {
  id: serial("id").primaryKey(),
  driverUserId: varchar("driver_user_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  totalGrossEarnings: decimal("total_gross_earnings", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalTips: decimal("total_tips", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalIncentives: decimal("total_incentives", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalPlatformFees: decimal("total_platform_fees", { precision: 14, scale: 2 }).notNull().default("0.00"),
  totalMilesDriven: decimal("total_miles_driven", { precision: 12, scale: 2 }).notNull().default("0.00"),
  reportableIncome: decimal("reportable_income", { precision: 14, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  status: taxSummaryStatusEnum("status").notNull().default("draft"),
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: varchar("generated_by"),
  finalizedAt: timestamp("finalized_at"),
  finalizedBy: varchar("finalized_by"),
});

export const insertDriverTaxYearSummarySchema = createInsertSchema(driverTaxYearSummaries).omit({ id: true, generatedAt: true });
export type InsertDriverTaxYearSummary = z.infer<typeof insertDriverTaxYearSummarySchema>;
export type DriverTaxYearSummary = typeof driverTaxYearSummaries.$inferSelect;

export const driverTaxDocuments = pgTable("driver_tax_documents", {
  id: serial("id").primaryKey(),
  driverUserId: varchar("driver_user_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  documentType: taxDocumentTypeEnum("document_type").notNull(),
  version: integer("version").notNull().default(1),
  fileUrl: text("file_url"),
  isLatest: boolean("is_latest").notNull().default(true),
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: varchar("generated_by"),
});

export const insertDriverTaxDocumentSchema = createInsertSchema(driverTaxDocuments).omit({ id: true, generatedAt: true });
export type InsertDriverTaxDocument = z.infer<typeof insertDriverTaxDocumentSchema>;
export type DriverTaxDocument = typeof driverTaxDocuments.$inferSelect;

export const taxGenerationAuditLog = pgTable("tax_generation_audit_log", {
  id: serial("id").primaryKey(),
  driverUserId: varchar("driver_user_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  performedBy: varchar("performed_by").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaxGenerationAuditLogSchema = createInsertSchema(taxGenerationAuditLog).omit({ id: true, createdAt: true });
export type InsertTaxGenerationAuditLog = z.infer<typeof insertTaxGenerationAuditLogSchema>;
export type TaxGenerationAuditLog = typeof taxGenerationAuditLog.$inferSelect;

// =============================================
// COUNTRY-SPECIFIC TAX COMPLIANCE CONFIGURATION
// =============================================
export const taxDeliveryMethodEnum = pgEnum("tax_delivery_method", ["in_app", "email", "both"]);

export const countryTaxConfigs = pgTable("country_tax_configs", {
  id: serial("id").primaryKey(),
  countryCode: varchar("country_code", { length: 3 }).notNull().unique(),
  countryName: varchar("country_name", { length: 100 }).notNull(),
  taxDocumentsEnabled: boolean("tax_documents_enabled").notNull().default(true),
  documentType: varchar("document_type", { length: 100 }).notNull().default("annual_statement"),
  documentLabel: varchar("document_label", { length: 200 }).notNull().default("Annual Earnings & Tax Summary"),
  currency: varchar("currency", { length: 3 }).notNull(),
  deliveryMethod: taxDeliveryMethodEnum("delivery_method").notNull().default("in_app"),
  mileageDisclosureEnabled: boolean("mileage_disclosure_enabled").notNull().default(true),
  withholdingEnabled: boolean("withholding_enabled").notNull().default(false),
  complianceNotes: text("compliance_notes"),
  driverClassificationLabel: varchar("driver_classification_label", { length: 100 }).notNull().default("Independent Contractor"),
  reportableIncomeIncludesFees: boolean("reportable_income_includes_fees").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCountryTaxConfigSchema = createInsertSchema(countryTaxConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCountryTaxConfig = z.infer<typeof insertCountryTaxConfigSchema>;
export type CountryTaxConfig = typeof countryTaxConfigs.$inferSelect;

export type GrowthSafetyStatus = {
  viralityEnabled: boolean;
  shareMomentsEnabled: boolean;
  reactivationEnabled: boolean;
  maxReferralRewardPerUser: number | null;
  maxDailyReferrals: number | null;
  countryOverrides: GrowthSafetyControl[];
};

// =============================================
// SIMULATION CENTER
// =============================================
export const simulationRoleEnum = pgEnum("simulation_role", ["rider", "driver", "director", "admin"]);

export const simulationCodes = pgTable("simulation_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  role: simulationRoleEnum("role").notNull(),
  countryCode: varchar("country_code", { length: 3 }).notNull().default("NG"),
  city: varchar("city", { length: 100 }),
  driverTier: varchar("driver_tier", { length: 20 }),
  walletBalance: decimal("wallet_balance", { precision: 12, scale: 2 }).default("0.00"),
  ratingState: decimal("rating_state", { precision: 3, scale: 2 }).default("4.50"),
  cashEnabled: boolean("cash_enabled").notNull().default(true),
  reusable: boolean("reusable").notNull().default(false),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdBy: varchar("created_by").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSimulationCodeSchema = createInsertSchema(simulationCodes).omit({ id: true, createdAt: true, used: true, revokedAt: true });
export type InsertSimulationCode = z.infer<typeof insertSimulationCodeSchema>;
export type SimulationCode = typeof simulationCodes.$inferSelect;

export const simulationSessions = pgTable("simulation_sessions", {
  id: serial("id").primaryKey(),
  codeId: integer("code_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: simulationRoleEnum("role").notNull(),
  countryCode: varchar("country_code", { length: 3 }).notNull(),
  config: text("config"),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const insertSimulationSessionSchema = createInsertSchema(simulationSessions).omit({ id: true, createdAt: true, endedAt: true });
export type InsertSimulationSession = z.infer<typeof insertSimulationSessionSchema>;
export type SimulationSession = typeof simulationSessions.$inferSelect;

export const bankTransferStatusEnum = pgEnum("bank_transfer_status", [
  "pending", "processing", "completed", "failed", "flagged"
]);

export const bankTransfers = pgTable("bank_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  referenceCode: varchar("reference_code", { length: 50 }).notNull().unique(),
  bankName: varchar("bank_name", { length: 100 }),
  accountNumber: varchar("account_number", { length: 20 }),
  status: bankTransferStatusEnum("status").notNull().default("pending"),
  adminReviewedBy: varchar("admin_reviewed_by"),
  adminNotes: text("admin_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBankTransferSchema = createInsertSchema(bankTransfers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBankTransfer = z.infer<typeof insertBankTransferSchema>;
export type BankTransfer = typeof bankTransfers.$inferSelect;

export const riderInboxMessageTypeEnum = pgEnum("rider_inbox_message_type", [
  "trip_update",
  "payment_alert",
  "cancellation_notice",
  "promotion",
  "system_announcement",
  "marketing",
]);

export const riderInboxMessages = pgTable("rider_inbox_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  type: riderInboxMessageTypeEnum("type").notNull().default("system_announcement"),
  read: boolean("read").notNull().default(false),
  referenceId: varchar("reference_id"),
  referenceType: varchar("reference_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRiderInboxMessageSchema = createInsertSchema(riderInboxMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertRiderInboxMessage = z.infer<typeof insertRiderInboxMessageSchema>;
export type RiderInboxMessage = typeof riderInboxMessages.$inferSelect;

export const driverInboxMessageTypeEnum = pgEnum("driver_inbox_message_type", [
  "system_announcement",
  "trip_update",
  "payout_update",
  "approval_update",
  "safety_alert",
  "promotion",
]);

export const driverInboxMessages = pgTable("driver_inbox_messages", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: driverInboxMessageTypeEnum("type").notNull().default("system_announcement"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDriverInboxMessageSchema = createInsertSchema(driverInboxMessages).omit({
  id: true,
  read: true,
  createdAt: true,
});

export type InsertDriverInboxMessage = z.infer<typeof insertDriverInboxMessageSchema>;
export type DriverInboxMessage = typeof driverInboxMessages.$inferSelect;

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  driverAssigned: boolean("driver_assigned").notNull().default(true),
  driverArriving: boolean("driver_arriving").notNull().default(true),
  rideScheduledConfirmation: boolean("ride_scheduled_confirmation").notNull().default(true),
  cancellationPenalties: boolean("cancellation_penalties").notNull().default(true),
  walletLowBalance: boolean("wallet_low_balance").notNull().default(true),
  promotions: boolean("promotions").notNull().default(true),
  systemAnnouncements: boolean("system_announcements").notNull().default(true),
  permissionGranted: boolean("permission_granted").notNull().default(false),
  promptShownAt: timestamp("prompt_shown_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

export const cancellationFeeConfig = pgTable("cancellation_fee_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 3 }).notNull().default("NG"),
  cancellationFeeAmount: decimal("cancellation_fee_amount", { precision: 10, scale: 2 }).notNull().default("500.00"),
  scheduledPenaltyAmount: decimal("scheduled_penalty_amount", { precision: 10, scale: 2 }).notNull().default("750.00"),
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(3),
  scheduledCancelWindowMinutes: integer("scheduled_cancel_window_minutes").notNull().default(30),
  arrivedCancellationFeeAmount: decimal("arrived_cancellation_fee_amount", { precision: 10, scale: 2 }).notNull().default("800.00"),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCancellationFeeConfigSchema = createInsertSchema(cancellationFeeConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCancellationFeeConfig = z.infer<typeof insertCancellationFeeConfigSchema>;
export type CancellationFeeConfig = typeof cancellationFeeConfig.$inferSelect;

export const marketingMessages = pgTable("marketing_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  messageKey: varchar("message_key", { length: 100 }).notNull(),
  messageText: text("message_text").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertMarketingMessageSchema = createInsertSchema(marketingMessages).omit({
  id: true,
  sentAt: true,
});
export type InsertMarketingMessage = z.infer<typeof insertMarketingMessageSchema>;
export type MarketingMessage = typeof marketingMessages.$inferSelect;

export const savedPlaces = pgTable("saved_places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  address: text("address").notNull(),
  notes: text("notes"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSavedPlaceSchema = createInsertSchema(savedPlaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSavedPlace = z.infer<typeof insertSavedPlaceSchema>;
export type SavedPlace = typeof savedPlaces.$inferSelect;

// =============================================
// LOST ITEM PROTOCOL TABLES
// =============================================

// Lost Item Reports table
export const lostItemReports = pgTable("lost_item_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull(),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  itemType: varchar("item_type", { length: 50 }).notNull(),
  itemDescription: text("item_description").notNull(),
  urgency: varchar("urgency", { length: 20 }).notNull().default("standard"),
  returnMethod: varchar("return_method", { length: 50 }),
  status: varchar("status", { length: 30 }).notNull().default("reported"),
  driverHasItem: boolean("driver_has_item"),
  driverConfirmedAt: timestamp("driver_confirmed_at"),
  itemPhotoUrl: text("item_photo_url"),
  returnFeeAmount: decimal("return_fee_amount", { precision: 10, scale: 2 }),
  driverPayout: decimal("driver_payout", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  feeCollected: boolean("fee_collected").notNull().default(false),
  meetupLocation: text("meetup_location"),
  returnCompletedAt: timestamp("return_completed_at"),
  adminNotes: text("admin_notes"),
  hubId: varchar("hub_id"),
  hubDropOffPhotoUrl: text("hub_drop_off_photo_url"),
  expectedDropOffTime: timestamp("expected_drop_off_time"),
  hubConfirmedAt: timestamp("hub_confirmed_at"),
  hubPickedUpAt: timestamp("hub_picked_up_at"),
  hubServiceFee: decimal("hub_service_fee", { precision: 10, scale: 2 }),
  driverHubBonus: decimal("driver_hub_bonus", { precision: 10, scale: 2 }),
  communicationUnlocked: boolean("communication_unlocked").notNull().default(false),
  communicationUnlockedAt: timestamp("communication_unlocked_at"),
  communicationUnlockedBy: varchar("communication_unlocked_by"),
  riderPhoneVisible: boolean("rider_phone_visible").notNull().default(false),
  driverPhoneVisible: boolean("driver_phone_visible").notNull().default(false),
  disputeReason: text("dispute_reason"),
  resolvedByAdminId: varchar("resolved_by_admin_id"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLostItemReportSchema = createInsertSchema(lostItemReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLostItemReport = z.infer<typeof insertLostItemReportSchema>;
export type LostItemReport = typeof lostItemReports.$inferSelect;

// Lost Item Messages (in-app chat for lost item recovery)
export const lostItemMessages = pgTable("lost_item_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lostItemReportId: varchar("lost_item_report_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: varchar("sender_role", { length: 20 }).notNull(),
  message: text("message").notNull(),
  isSystemMessage: boolean("is_system_message").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLostItemMessageSchema = createInsertSchema(lostItemMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertLostItemMessage = z.infer<typeof insertLostItemMessageSchema>;
export type LostItemMessage = typeof lostItemMessages.$inferSelect;

// Lost Item Analytics (data intelligence logging)
export const lostItemAnalytics = pgTable("lost_item_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lostItemReportId: varchar("lost_item_report_id").notNull(),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  tripId: varchar("trip_id").notNull(),
  itemCategory: varchar("item_category", { length: 50 }).notNull(),
  outcome: varchar("outcome", { length: 30 }).notNull(),
  reportToResolutionHours: decimal("report_to_resolution_hours", { precision: 10, scale: 2 }),
  returnFeeApplied: decimal("return_fee_applied", { precision: 10, scale: 2 }),
  driverEarnings: decimal("driver_earnings", { precision: 10, scale: 2 }),
  areaCluster: varchar("area_cluster", { length: 100 }),
  countryCode: varchar("country_code", { length: 2 }),
  riderLostItemCount: integer("rider_lost_item_count"),
  driverReturnCount: integer("driver_return_count"),
  driverDenialCount: integer("driver_denial_count"),
  ageBracket: varchar("age_bracket", { length: 20 }),
  chatMessageCount: integer("chat_message_count").notNull().default(0),
  fraudSignalCount: integer("fraud_signal_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLostItemAnalyticsSchema = createInsertSchema(lostItemAnalytics).omit({
  id: true,
  createdAt: true,
});
export type InsertLostItemAnalytics = z.infer<typeof insertLostItemAnalyticsSchema>;
export type LostItemAnalytics = typeof lostItemAnalytics.$inferSelect;

// Lost Item Fee Config table
export const lostItemFeeConfig = pgTable("lost_item_fee_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  standardFee: decimal("standard_fee", { precision: 10, scale: 2 }).notNull().default("500.00"),
  urgentFee: decimal("urgent_fee", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  driverSharePercent: integer("driver_share_percent").notNull().default(75),
  platformSharePercent: integer("platform_share_percent").notNull().default(25),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLostItemFeeConfigSchema = createInsertSchema(lostItemFeeConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLostItemFeeConfig = z.infer<typeof insertLostItemFeeConfigSchema>;
export type LostItemFeeConfig = typeof lostItemFeeConfig.$inferSelect;

// =============================================
// ACCIDENT REPORT ENHANCEMENT TABLES
// =============================================

// Accident Reports table (extends incident system)
export const accidentReports = pgTable("accident_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  tripId: varchar("trip_id").notNull(),
  reporterId: varchar("reporter_id").notNull(),
  reporterRole: varchar("reporter_role", { length: 20 }).notNull(),
  isSafe: boolean("is_safe"),
  emergencyServicesNeeded: boolean("emergency_services_needed").notNull().default(false),
  emergencyServicesContacted: boolean("emergency_services_contacted").notNull().default(false),
  accidentSeverity: varchar("accident_severity", { length: 20 }).notNull(),
  photoEvidence: text("photo_evidence"),
  voiceNoteUrl: text("voice_note_url"),
  witnessContact: text("witness_contact"),
  witnessName: varchar("witness_name"),
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
  speedAtImpact: decimal("speed_at_impact", { precision: 6, scale: 2 }),
  adminReviewStatus: varchar("admin_review_status", { length: 30 }).notNull().default("pending"),
  adminReviewedBy: varchar("admin_reviewed_by"),
  adminReviewNotes: text("admin_review_notes"),
  driverReinstated: boolean("driver_reinstated").notNull().default(false),
  driverSafetyBadge: boolean("driver_safety_badge").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccidentReportSchema = createInsertSchema(accidentReports).omit({
  id: true,
  createdAt: true,
});
export type InsertAccidentReport = z.infer<typeof insertAccidentReportSchema>;
export type AccidentReport = typeof accidentReports.$inferSelect;

// =============================================
// INSURANCE PARTNER INTEGRATION
// =============================================

export const insurancePartners = pgTable("insurance_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  coverageType: varchar("coverage_type", { length: 50 }).notNull(),
  contactEmail: varchar("contact_email", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  claimUrl: text("claim_url"),
  apiEndpoint: text("api_endpoint"),
  activeRegions: text("active_regions"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInsurancePartnerSchema = createInsertSchema(insurancePartners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInsurancePartner = z.infer<typeof insertInsurancePartnerSchema>;
export type InsurancePartner = typeof insurancePartners.$inferSelect;

export const insuranceReferrals = pgTable("insurance_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accidentReportId: varchar("accident_report_id").notNull(),
  insurancePartnerId: varchar("insurance_partner_id").notNull(),
  referredBy: varchar("referred_by").notNull(),
  referredUserId: varchar("referred_user_id").notNull(),
  referredUserRole: varchar("referred_user_role", { length: 20 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("referred"),
  userOptedIn: boolean("user_opted_in").notNull().default(false),
  claimReference: varchar("claim_reference", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInsuranceReferralSchema = createInsertSchema(insuranceReferrals).omit({
  id: true,
  createdAt: true,
});
export type InsertInsuranceReferral = z.infer<typeof insertInsuranceReferralSchema>;
export type InsuranceReferral = typeof insuranceReferrals.$inferSelect;

// =============================================
// DRIVER ACCIDENT RELIEF FUND
// =============================================

export const driverReliefFund = pgTable("driver_relief_fund", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalPool: decimal("total_pool", { precision: 12, scale: 2 }).notNull().default("0.00"),
  cancellationFeePercent: integer("cancellation_fee_percent").notNull().default(10),
  lostItemFeePercent: integer("lost_item_fee_percent").notNull().default(5),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  isActive: boolean("is_active").notNull().default(true),
  minTrustScoreRequired: integer("min_trust_score_required").notNull().default(50),
  maxPayoutPerClaim: decimal("max_payout_per_claim", { precision: 10, scale: 2 }).notNull().default("50000.00"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDriverReliefFundSchema = createInsertSchema(driverReliefFund).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDriverReliefFund = z.infer<typeof insertDriverReliefFundSchema>;
export type DriverReliefFund = typeof driverReliefFund.$inferSelect;

export const reliefFundClaims = pgTable("relief_fund_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull(),
  accidentReportId: varchar("accident_report_id").notNull(),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  faultDetermination: varchar("fault_determination", { length: 30 }),
  driverTrustScoreAtTime: integer("driver_trust_score_at_time"),
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
  payoutWalletTxId: varchar("payout_wallet_tx_id"),
  expectedPayoutDate: timestamp("expected_payout_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReliefFundClaimSchema = createInsertSchema(reliefFundClaims).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReliefFundClaim = z.infer<typeof insertReliefFundClaimSchema>;
export type ReliefFundClaim = typeof reliefFundClaims.$inferSelect;

export const reliefFundContributions = pgTable("relief_fund_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: varchar("source", { length: 50 }).notNull(),
  sourceReferenceId: varchar("source_reference_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  contributedBy: varchar("contributed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReliefFundContributionSchema = createInsertSchema(reliefFundContributions).omit({
  id: true,
  createdAt: true,
});
export type InsertReliefFundContribution = z.infer<typeof insertReliefFundContributionSchema>;
export type ReliefFundContribution = typeof reliefFundContributions.$inferSelect;

// =============================================
// LOST ITEM FRAUD DETECTION
// =============================================

export const lostItemFraudSignals = pgTable("lost_item_fraud_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userRole: varchar("user_role", { length: 20 }).notNull(),
  signalType: varchar("signal_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("low"),
  description: text("description"),
  relatedReportId: varchar("related_report_id"),
  riskScore: integer("risk_score").notNull().default(0),
  autoResolved: boolean("auto_resolved").notNull().default(false),
  adminReviewed: boolean("admin_reviewed").notNull().default(false),
  adminReviewedBy: varchar("admin_reviewed_by"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLostItemFraudSignalSchema = createInsertSchema(lostItemFraudSignals).omit({
  id: true,
  createdAt: true,
});
export type InsertLostItemFraudSignal = z.infer<typeof insertLostItemFraudSignalSchema>;
export type LostItemFraudSignal = typeof lostItemFraudSignals.$inferSelect;

// =============================================
// SAFE RETURN HUB SYSTEM
// =============================================

export const safeReturnHubs = pgTable("safe_return_hubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("partner_station"),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull().default("NG"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  operatingHoursStart: varchar("operating_hours_start", { length: 5 }).default("08:00"),
  operatingHoursEnd: varchar("operating_hours_end", { length: 5 }).default("20:00"),
  contactPerson: varchar("contact_person", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  hasCctv: boolean("has_cctv").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  hubServiceFee: decimal("hub_service_fee", { precision: 10, scale: 2 }).default("0.00"),
  driverBonusReward: decimal("driver_bonus_reward", { precision: 10, scale: 2 }).default("200.00"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSafeReturnHubSchema = createInsertSchema(safeReturnHubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSafeReturnHub = z.infer<typeof insertSafeReturnHubSchema>;
export type SafeReturnHub = typeof safeReturnHubs.$inferSelect;

export const trainingAcknowledgements = pgTable("training_acknowledgements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
});

export const insertTrainingAcknowledgementSchema = createInsertSchema(trainingAcknowledgements).omit({ id: true, acknowledgedAt: true });
export type InsertTrainingAcknowledgement = z.infer<typeof insertTrainingAcknowledgementSchema>;
export type TrainingAcknowledgement = typeof trainingAcknowledgements.$inferSelect;

// =============================================
// PERFORMANCE & HEALTH ALERTS
// =============================================

export const performanceAlerts = pgTable("performance_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetUserId: varchar("target_user_id").notNull(),
  targetRole: varchar("target_role", { length: 50 }).notNull(),
  alertType: varchar("alert_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("warning"),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPerformanceAlertSchema = createInsertSchema(performanceAlerts).omit({ id: true, createdAt: true });
export type InsertPerformanceAlert = z.infer<typeof insertPerformanceAlertSchema>;
export type PerformanceAlert = typeof performanceAlerts.$inferSelect;

// =============================================
// PHASE 28: MULTI-CELL SUPPORT
// =============================================

export const directorCells = pgTable("director_cells", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  cellNumber: integer("cell_number").notNull(),
  cellName: varchar("cell_name", { length: 100 }),
  maxDrivers: integer("max_drivers").notNull().default(1300),
  maxCommissionableDrivers: integer("max_commissionable_drivers").notNull().default(1000),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDirectorCellSchema = createInsertSchema(directorCells).omit({ id: true, createdAt: true });
export type InsertDirectorCell = z.infer<typeof insertDirectorCellSchema>;
export type DirectorCell = typeof directorCells.$inferSelect;

// =============================================
// PHASE 30: DIRECTOR STAFF & TEAM ROLES
// =============================================

export const directorStaff = pgTable("director_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  staffUserId: varchar("staff_user_id").notNull(),
  staffRole: varchar("staff_role", { length: 50 }).notNull(),
  permissions: text("permissions"),
  approvedByAdmin: boolean("approved_by_admin").notNull().default(false),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDirectorStaffSchema = createInsertSchema(directorStaff).omit({ id: true, createdAt: true, approvedAt: true });
export type InsertDirectorStaff = z.infer<typeof insertDirectorStaffSchema>;
export type DirectorStaff = typeof directorStaff.$inferSelect;

// =============================================
// PHASE 31: ENHANCED AUDIT LOGS
// =============================================

export const directorActionLogs = pgTable("director_action_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull(),
  actorRole: varchar("actor_role", { length: 50 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id"),
  beforeState: text("before_state"),
  afterState: text("after_state"),
  metadata: text("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorActionLogSchema = createInsertSchema(directorActionLogs).omit({ id: true, createdAt: true });
export type InsertDirectorActionLog = z.infer<typeof insertDirectorActionLogSchema>;
export type DirectorActionLog = typeof directorActionLogs.$inferSelect;

// =============================================
// PHASE 32: ZIBRA COACHING LOGS
// =============================================

export const directorCoachingLogs = pgTable("director_coaching_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  coachingType: varchar("coaching_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorCoachingLogSchema = createInsertSchema(directorCoachingLogs).omit({ id: true, createdAt: true });
export type InsertDirectorCoachingLog = z.infer<typeof insertDirectorCoachingLogSchema>;
export type DirectorCoachingLog = typeof directorCoachingLogs.$inferSelect;

// =============================================
// DIRECTOR TRAINING & TERMS
// =============================================

export const directorTrainingModules = pgTable("director_training_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  moduleKey: varchar("module_key", { length: 50 }).notNull(),
  moduleTitle: varchar("module_title", { length: 200 }).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorTrainingModuleSchema = createInsertSchema(directorTrainingModules).omit({ id: true, createdAt: true });
export type InsertDirectorTrainingModule = z.infer<typeof insertDirectorTrainingModuleSchema>;
export type DirectorTrainingModule = typeof directorTrainingModules.$inferSelect;

export const directorTermsAcceptance = pgTable("director_terms_acceptance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  termsVersion: varchar("terms_version", { length: 20 }).notNull().default("1.0"),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const insertDirectorTermsAcceptanceSchema = createInsertSchema(directorTermsAcceptance).omit({ id: true, acceptedAt: true });
export type InsertDirectorTermsAcceptance = z.infer<typeof insertDirectorTermsAcceptanceSchema>;
export type DirectorTermsAcceptance = typeof directorTermsAcceptance.$inferSelect;

export const directorTrustScores = pgTable("director_trust_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull().unique(),
  score: integer("score").notNull().default(100),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"),
  driverComplaints: integer("driver_complaints").notNull().default(0),
  excessiveSuspensions: integer("excessive_suspensions").notNull().default(0),
  staffAbuseFlags: integer("staff_abuse_flags").notNull().default(0),
  missedCompliance: integer("missed_compliance").notNull().default(0),
  zibraAlerts: integer("zibra_alerts").notNull().default(0),
  adminWarnings: integer("admin_warnings").notNull().default(0),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorTrustScoreSchema = createInsertSchema(directorTrustScores).omit({ id: true, createdAt: true });
export type InsertDirectorTrustScore = z.infer<typeof insertDirectorTrustScoreSchema>;
export type DirectorTrustScore = typeof directorTrustScores.$inferSelect;

// =============================================
// PHASE 32B: DRIVER COACHING LOGS
// =============================================

export const driverCoachingLogs = pgTable("driver_coaching_logs", {
  id: serial("id").primaryKey(),
  driverUserId: varchar("driver_user_id", { length: 255 }).notNull(),
  coachingType: varchar("coaching_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverCoachingLogSchema = createInsertSchema(driverCoachingLogs).omit({ id: true, createdAt: true });
export type DriverCoachingLog = typeof driverCoachingLogs.$inferSelect;

// =============================================
// FUND ANOTHER WALLET
// =============================================

export const walletFundingStatusEnum = pgEnum("wallet_funding_status", ["pending", "completed", "declined", "failed"]);

export const walletFundingTransactions = pgTable("wallet_funding_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderUserId: varchar("sender_user_id").notNull(),
  receiverUserId: varchar("receiver_user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  status: walletFundingStatusEnum("status").notNull().default("completed"),
  senderRole: varchar("sender_role", { length: 30 }),
  receiverRole: varchar("receiver_role", { length: 30 }),
  countryCode: varchar("country_code", { length: 3 }),
  disclaimerAccepted: boolean("disclaimer_accepted").notNull().default(false),
  purpose: varchar("purpose", { length: 255 }),
  flagged: boolean("flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const walletFundingSettings = pgTable("wallet_funding_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dailyLimit: decimal("daily_limit", { precision: 10, scale: 2 }).notNull().default("50000.00"),
  monthlyLimit: decimal("monthly_limit", { precision: 10, scale: 2 }).notNull().default("500000.00"),
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }).notNull().default("100.00"),
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }).notNull().default("50000.00"),
  selfFundingAllowed: boolean("self_funding_allowed").notNull().default(false),
  repeatFundingThreshold: integer("repeat_funding_threshold").notNull().default(5),
  isEnabled: boolean("is_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWalletFundingTransactionSchema = createInsertSchema(walletFundingTransactions).omit({ id: true, createdAt: true });
export type InsertWalletFundingTransaction = z.infer<typeof insertWalletFundingTransactionSchema>;
export type WalletFundingTransaction = typeof walletFundingTransactions.$inferSelect;

export type WalletFundingSettings = typeof walletFundingSettings.$inferSelect;

// =============================================
// DIRECTOR FUNDING SYSTEM
// =============================================

export const directorFundingPurposeEnum = pgEnum("director_funding_purpose", [
  "ride_fuel_support",
  "network_availability_boost",
  "emergency_assistance",
  "temporary_balance_topup"
]);

export const directorFundingStatusEnum = pgEnum("director_funding_status", [
  "completed",
  "failed",
  "flagged",
  "reversed"
]);

export const directorFundingTransactions = pgTable("director_funding_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  driverUserId: varchar("driver_user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  purposeTag: directorFundingPurposeEnum("purpose_tag").notNull(),
  status: directorFundingStatusEnum("status").notNull().default("completed"),
  disclaimerAccepted: boolean("disclaimer_accepted").notNull().default(false),
  flagged: boolean("flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  ipAddress: varchar("ip_address", { length: 45 }),
  reversedAt: timestamp("reversed_at"),
  reversedBy: varchar("reversed_by"),
  reversalReason: text("reversal_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorFundingTransactionSchema = createInsertSchema(directorFundingTransactions).omit({ id: true, createdAt: true, reversedAt: true });
export type InsertDirectorFundingTransaction = z.infer<typeof insertDirectorFundingTransactionSchema>;
export type DirectorFundingTransaction = typeof directorFundingTransactions.$inferSelect;

export const directorFundingSettings = pgTable("director_funding_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isEnabled: boolean("is_enabled").notNull().default(true),
  perTransactionMin: decimal("per_transaction_min", { precision: 10, scale: 2 }).notNull().default("500.00"),
  perTransactionMax: decimal("per_transaction_max", { precision: 10, scale: 2 }).notNull().default("50000.00"),
  perDriverDailyLimit: decimal("per_driver_daily_limit", { precision: 10, scale: 2 }).notNull().default("50000.00"),
  perDriverWeeklyLimit: decimal("per_driver_weekly_limit", { precision: 10, scale: 2 }).notNull().default("200000.00"),
  perDriverMonthlyLimit: decimal("per_driver_monthly_limit", { precision: 10, scale: 2 }).notNull().default("500000.00"),
  perDirectorDailyLimit: decimal("per_director_daily_limit", { precision: 10, scale: 2 }).notNull().default("500000.00"),
  perDirectorWeeklyLimit: decimal("per_director_weekly_limit", { precision: 10, scale: 2 }).notNull().default("2000000.00"),
  perDirectorMonthlyLimit: decimal("per_director_monthly_limit", { precision: 10, scale: 2 }).notNull().default("5000000.00"),
  minDriversRequired: integer("min_drivers_required").notNull().default(10),
  repeatFundingThreshold: integer("repeat_funding_threshold").notNull().default(3),
  repeatFundingWindowHours: integer("repeat_funding_window_hours").notNull().default(24),
  fundingSuspensionEnabled: boolean("funding_suspension_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export type DirectorFundingSettings = typeof directorFundingSettings.$inferSelect;

export const directorFundingAcceptance = pgTable("director_funding_acceptance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userRole: varchar("user_role", { length: 30 }).notNull(),
  acceptedTermsVersion: varchar("accepted_terms_version", { length: 20 }).notNull().default("1.0"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DirectorFundingAcceptance = typeof directorFundingAcceptance.$inferSelect;

export const directorFundingSuspensions = pgTable("director_funding_suspensions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  reason: text("reason").notNull(),
  suspendedBy: varchar("suspended_by").notNull(),
  suspendedAt: timestamp("suspended_at").defaultNow().notNull(),
  liftedAt: timestamp("lifted_at"),
  liftedBy: varchar("lifted_by"),
  isActive: boolean("is_active").notNull().default(true),
});

export type DirectorFundingSuspension = typeof directorFundingSuspensions.$inferSelect;

export const directorFraudSignalTypeEnum = pgEnum("director_fraud_signal_type", [
  "artificial_activation", "short_session_inflation", "coordinated_cancellations",
  "coercion_reports", "excessive_funding_leverage", "abnormal_referral_clustering",
  "payout_spike_churn", "identity_mismatch", "suspicious_pattern"
]);

export const directorFraudResponseLevelEnum = pgEnum("director_fraud_response_level", [
  "level_1_soft_flag", "level_2_review_hold", "level_3_enforcement"
]);

export const directorFraudSignals = pgTable("director_fraud_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  signalType: directorFraudSignalTypeEnum("signal_type").notNull(),
  responseLevel: directorFraudResponseLevelEnum("response_level").notNull().default("level_1_soft_flag"),
  description: text("description").notNull(),
  evidence: text("evidence"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  detectedBy: varchar("detected_by").notNull().default("system"),
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  actionTaken: text("action_taken"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  escalatedToLevel: directorFraudResponseLevelEnum("escalated_to_level"),
  escalatedAt: timestamp("escalated_at"),
  resolvedAt: timestamp("resolved_at"),
});

export type DirectorFraudSignal = typeof directorFraudSignals.$inferSelect;

export const directorDisputeTypeEnum = pgEnum("director_dispute_type", [
  "payout_hold", "suspension", "driver_reassignment", "staff_restriction",
  "commission_adjustment", "cell_limit", "termination", "other"
]);

export const directorDisputeStatusEnum = pgEnum("director_dispute_status", [
  "submitted", "under_review", "admin_reviewed", "escalated", "clarification_requested", "resolved", "rejected", "appealed", "closed"
]);

export const directorDisputes = pgTable("director_disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  disputeType: directorDisputeTypeEnum("dispute_type").notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description").notNull(),
  evidenceNotes: text("evidence_notes"),
  status: directorDisputeStatusEnum("status").notNull().default("submitted"),
  assignedAdminId: varchar("assigned_admin_id"),
  adminReviewNotes: text("admin_review_notes"),
  adminReviewedAt: timestamp("admin_reviewed_at"),
  superAdminDecision: text("super_admin_decision"),
  superAdminDecisionBy: varchar("super_admin_decision_by"),
  superAdminDecisionAt: timestamp("super_admin_decision_at"),
  zibraSummary: text("zibra_summary"),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: varchar("related_entity_id"),
  appealSubmitted: boolean("appeal_submitted").default(false),
  appealReason: text("appeal_reason"),
  appealedAt: timestamp("appealed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export type DirectorDispute = typeof directorDisputes.$inferSelect;

export const directorDisputeMessages = pgTable("director_dispute_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: varchar("sender_role", { length: 30 }).notNull(),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DirectorDisputeMessage = typeof directorDisputeMessages.$inferSelect;

export const directorWindDowns = pgTable("director_wind_downs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  triggerReason: varchar("trigger_reason", { length: 100 }).notNull(),
  initiatedBy: varchar("initiated_by").notNull(),
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
  fundingDisabled: boolean("funding_disabled").notNull().default(true),
  staffAccessRevoked: boolean("staff_access_revoked").notNull().default(true),
  driversReassigned: boolean("drivers_reassigned").notNull().default(false),
  driversUnassigned: boolean("drivers_unassigned").notNull().default(false),
  pendingPayoutsResolved: boolean("pending_payouts_resolved").notNull().default(false),
  auditSealed: boolean("audit_sealed").notNull().default(false),
  driversAffectedCount: integer("drivers_affected_count").notNull().default(0),
  reassignedToDirectorId: varchar("reassigned_to_director_id"),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
});

export const directorPerformanceTierEnum = pgEnum("director_performance_tier", [
  "gold", "silver", "bronze", "at_risk"
]);

export const directorPerformanceScores = pgTable("director_performance_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  score: integer("score").notNull().default(0),
  tier: directorPerformanceTierEnum("tier").notNull().default("bronze"),
  driverActivityScore: integer("driver_activity_score").notNull().default(0),
  driverQualityScore: integer("driver_quality_score").notNull().default(0),
  driverRetentionScore: integer("driver_retention_score").notNull().default(0),
  complianceSafetyScore: integer("compliance_safety_score").notNull().default(0),
  adminFeedbackScore: integer("admin_feedback_score").notNull().default(0),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
});

export const insertDirectorPerformanceScoreSchema = createInsertSchema(directorPerformanceScores).omit({ id: true, calculatedAt: true });
export type DirectorPerformanceScore = typeof directorPerformanceScores.$inferSelect;

export const directorPerformanceWeights = pgTable("director_performance_weights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverActivityWeight: integer("driver_activity_weight").notNull().default(30),
  driverQualityWeight: integer("driver_quality_weight").notNull().default(25),
  driverRetentionWeight: integer("driver_retention_weight").notNull().default(20),
  complianceSafetyWeight: integer("compliance_safety_weight").notNull().default(15),
  adminFeedbackWeight: integer("admin_feedback_weight").notNull().default(10),
  goldThreshold: integer("gold_threshold").notNull().default(85),
  silverThreshold: integer("silver_threshold").notNull().default(70),
  bronzeThreshold: integer("bronze_threshold").notNull().default(55),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by"),
});

export type DirectorPerformanceWeights = typeof directorPerformanceWeights.$inferSelect;

export const directorIncentiveTypeEnum = pgEnum("director_incentive_type", [
  "increased_driver_cap", "priority_leads", "reduced_funding_restrictions", "visibility_boost"
]);

export const directorIncentives = pgTable("director_incentives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  incentiveType: directorIncentiveTypeEnum("incentive_type").notNull(),
  description: text("description").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  triggeredByScore: integer("triggered_by_score"),
  triggeredByTier: directorPerformanceTierEnum("triggered_by_tier"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by"),
  revokeReason: text("revoke_reason"),
});

export const insertDirectorIncentiveSchema = createInsertSchema(directorIncentives).omit({ id: true, appliedAt: true, revokedAt: true });
export type DirectorIncentive = typeof directorIncentives.$inferSelect;

export const directorRestrictionTypeEnum = pgEnum("director_restriction_type", [
  "freeze_new_drivers", "reduced_funding_limits", "admin_review_required", "growth_paused"
]);

export const directorRestrictions = pgTable("director_restrictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  restrictionType: directorRestrictionTypeEnum("restriction_type").notNull(),
  description: text("description").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  triggeredByScore: integer("triggered_by_score"),
  triggeredByTier: directorPerformanceTierEnum("triggered_by_tier"),
  liftedAt: timestamp("lifted_at"),
  liftedBy: varchar("lifted_by"),
  liftReason: text("lift_reason"),
});

export const insertDirectorRestrictionSchema = createInsertSchema(directorRestrictions).omit({ id: true, appliedAt: true, liftedAt: true });
export type DirectorRestriction = typeof directorRestrictions.$inferSelect;

export const directorPerformanceLogs = pgTable("director_performance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorUserId: varchar("director_user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  previousScore: integer("previous_score"),
  newScore: integer("new_score"),
  previousTier: varchar("previous_tier", { length: 20 }),
  newTier: varchar("new_tier", { length: 20 }),
  details: text("details"),
  performedBy: varchar("performed_by").notNull().default("system"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DirectorPerformanceLog = typeof directorPerformanceLogs.$inferSelect;

// =============================================
// DIRECTOR TERMINATION, SUCCESSION & CELL CONTINUITY
// =============================================

export const directorSuccessionTypeEnum = pgEnum("director_succession_type", [
  "reassign_to_director", "new_director", "platform_pool"
]);

export const directorTerminationTypeEnum = pgEnum("director_termination_type", [
  "expiration", "suspension", "termination"
]);

export const payoutDecisionEnum = pgEnum("payout_decision", [
  "release", "hold", "partial_release", "forfeit"
]);

export const directorSuccessions = pgTable("director_successions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departingDirectorId: varchar("departing_director_id").notNull(),
  terminationType: directorTerminationTypeEnum("termination_type").notNull(),
  terminationReason: text("termination_reason"),
  successionType: directorSuccessionTypeEnum("succession_type").notNull(),
  successorDirectorId: varchar("successor_director_id"),
  driversAffectedCount: integer("drivers_affected_count").notNull().default(0),
  driversReassignedCount: integer("drivers_reassigned_count").notNull().default(0),
  driversToPoolCount: integer("drivers_to_pool_count").notNull().default(0),
  staffDisabledCount: integer("staff_disabled_count").notNull().default(0),
  payoutDecision: payoutDecisionEnum("payout_decision").notNull().default("hold"),
  payoutAmount: varchar("payout_amount"),
  payoutReason: text("payout_reason"),
  initiatedBy: varchar("initiated_by").notNull(),
  approvedBy: varchar("approved_by"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  zibraSummary: text("zibra_summary"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorSuccessionSchema = createInsertSchema(directorSuccessions).omit({ id: true, createdAt: true, completedAt: true });
export type InsertDirectorSuccession = z.infer<typeof insertDirectorSuccessionSchema>;
export type DirectorSuccession = typeof directorSuccessions.$inferSelect;

export const directorTerminationTimeline = pgTable("director_termination_timeline", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  successionId: varchar("succession_id").notNull(),
  directorUserId: varchar("director_user_id").notNull(),
  stepName: varchar("step_name", { length: 50 }).notNull(),
  stepDescription: text("step_description"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DirectorTerminationTimeline = typeof directorTerminationTimeline.$inferSelect;

export const welcomeAnalytics = pgTable("welcome_analytics", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  eventType: varchar("event_type", { length: 30 }).notNull(),
  eventTarget: varchar("event_target", { length: 100 }),
  intent: varchar("intent", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWelcomeAnalyticsSchema = createInsertSchema(welcomeAnalytics).omit({ id: true, createdAt: true });
export type InsertWelcomeAnalytics = z.infer<typeof insertWelcomeAnalyticsSchema>;
export type WelcomeAnalytics = typeof welcomeAnalytics.$inferSelect;

// =============================================
// RIDER TRUST, LOYALTY & WALLET GROWTH
// =============================================

export const riderTrustTierEnum = pgEnum("rider_trust_tier", [
  "platinum", "gold", "standard", "limited"
]);

export const riderTrustScores = pgTable("rider_trust_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  score: integer("score").notNull().default(75),
  tier: riderTrustTierEnum("tier").notNull().default("standard"),
  reliabilityScore: integer("reliability_score").notNull().default(75),
  paymentBehaviorScore: integer("payment_behavior_score").notNull().default(75),
  conductSafetyScore: integer("conduct_safety_score").notNull().default(75),
  accountStabilityScore: integer("account_stability_score").notNull().default(75),
  adminFlagsScore: integer("admin_flags_score").notNull().default(100),
  completedRides: integer("completed_rides").notNull().default(0),
  totalRides: integer("total_rides").notNull().default(0),
  cancellations: integer("cancellations").notNull().default(0),
  walletFundedRides: integer("wallet_funded_rides").notNull().default(0),
  cashRides: integer("cash_rides").notNull().default(0),
  incidentReports: integer("incident_reports").notNull().default(0),
  disputeCount: integer("dispute_count").notNull().default(0),
  averageDriverRating: decimal("average_driver_rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  lastCalculatedAt: timestamp("last_calculated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RiderTrustScore = typeof riderTrustScores.$inferSelect;

export const riderTrustWeights = pgTable("rider_trust_weights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reliabilityWeight: integer("reliability_weight").notNull().default(35),
  paymentBehaviorWeight: integer("payment_behavior_weight").notNull().default(25),
  conductSafetyWeight: integer("conduct_safety_weight").notNull().default(20),
  accountStabilityWeight: integer("account_stability_weight").notNull().default(10),
  adminFlagsWeight: integer("admin_flags_weight").notNull().default(10),
  platinumThreshold: integer("platinum_threshold").notNull().default(85),
  goldThreshold: integer("gold_threshold").notNull().default(70),
  standardThreshold: integer("standard_threshold").notNull().default(50),
  gracePeriodPlatinum: integer("grace_period_platinum").notNull().default(5),
  gracePeriodGold: integer("grace_period_gold").notNull().default(4),
  gracePeriodStandard: integer("grace_period_standard").notNull().default(3),
  gracePeriodLimited: integer("grace_period_limited").notNull().default(2),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type RiderTrustWeights = typeof riderTrustWeights.$inferSelect;

export const riderLoyaltyIncentives = pgTable("rider_loyalty_incentives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  incentiveType: varchar("incentive_type", { length: 50 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  grantedBy: varchar("granted_by").notNull().default("system"),
  grantReason: text("grant_reason"),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RiderLoyaltyIncentive = typeof riderLoyaltyIncentives.$inferSelect;

export const riderTrustLogs = pgTable("rider_trust_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  previousScore: integer("previous_score"),
  newScore: integer("new_score"),
  previousTier: varchar("previous_tier", { length: 20 }),
  newTier: varchar("new_tier", { length: 20 }),
  details: text("details"),
  performedBy: varchar("performed_by").notNull().default("system"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RiderTrustLog = typeof riderTrustLogs.$inferSelect;

// =============================================
// THIRD-PARTY WALLET FUNDING SYSTEM
// =============================================

export const fundingRelationshipTypeEnum = pgEnum("funding_relationship_type", [
  "parent_child",
  "spouse_spouse",
  "friend_friend",
  "employer_employee",
  "organization_member",
]);

export const fundingRelationshipStatusEnum = pgEnum("funding_relationship_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
  "frozen",
]);

export const fundingRelationships = pgTable("funding_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funderUserId: varchar("funder_user_id").notNull(),
  recipientUserId: varchar("recipient_user_id").notNull(),
  relationshipType: fundingRelationshipTypeEnum("relationship_type").notNull(),
  status: fundingRelationshipStatusEnum("status").notNull().default("pending"),
  dailyLimit: decimal("daily_limit", { precision: 10, scale: 2 }),
  monthlyLimit: decimal("monthly_limit", { precision: 10, scale: 2 }),
  purposeTag: varchar("purpose_tag", { length: 100 }),
  totalFunded: decimal("total_funded", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currentMonthFunded: decimal("current_month_funded", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currentDayFunded: decimal("current_day_funded", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lastFundedAt: timestamp("last_funded_at"),
  lastResetDay: timestamp("last_reset_day"),
  lastResetMonth: timestamp("last_reset_month"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by"),
  frozenAt: timestamp("frozen_at"),
  frozenBy: varchar("frozen_by"),
  frozenReason: text("frozen_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFundingRelationshipSchema = createInsertSchema(fundingRelationships).omit({
  id: true, createdAt: true, updatedAt: true, totalFunded: true,
  currentMonthFunded: true, currentDayFunded: true, lastFundedAt: true,
  lastResetDay: true, lastResetMonth: true, acceptedAt: true, declinedAt: true,
  revokedAt: true, revokedBy: true, frozenAt: true, frozenBy: true, frozenReason: true,
});
export type InsertFundingRelationship = z.infer<typeof insertFundingRelationshipSchema>;
export type FundingRelationship = typeof fundingRelationships.$inferSelect;

export const fundingAbuseFlagTypeEnum = pgEnum("funding_abuse_flag_type", [
  "many_recipients_one_funder",
  "rapid_fund_spend_refund",
  "cross_country_anomaly",
  "repeated_cancellation_abuse",
  "unusual_amount_pattern",
  "velocity_alert",
]);

export const fundingAbuseFlags = pgTable("funding_abuse_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  relationshipId: varchar("relationship_id"),
  funderUserId: varchar("funder_user_id").notNull(),
  recipientUserId: varchar("recipient_user_id"),
  flagType: fundingAbuseFlagTypeEnum("flag_type").notNull(),
  severity: varchar("severity", { length: 10 }).notNull().default("medium"),
  details: text("details"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FundingAbuseFlag = typeof fundingAbuseFlags.$inferSelect;

export const thirdPartyFundingConfig = pgTable("third_party_funding_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 3 }).notNull().default("ALL"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  globalDailyLimit: decimal("global_daily_limit", { precision: 10, scale: 2 }).notNull().default("100000.00"),
  globalMonthlyLimit: decimal("global_monthly_limit", { precision: 12, scale: 2 }).notNull().default("1000000.00"),
  maxRelationshipsPerFunder: integer("max_relationships_per_funder").notNull().default(10),
  maxFundersPerRecipient: integer("max_funders_per_recipient").notNull().default(5),
  minFundingAmount: decimal("min_funding_amount", { precision: 10, scale: 2 }).notNull().default("100.00"),
  maxSingleFunding: decimal("max_single_funding", { precision: 10, scale: 2 }).notNull().default("50000.00"),
  sponsoredFundsPriority: boolean("sponsored_funds_priority").notNull().default(true),
  allowedUsages: text("allowed_usages").notNull().default("rides,cancellation_fees,lost_item_fees"),
  cashWithdrawalAllowed: boolean("cash_withdrawal_allowed").notNull().default(false),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ThirdPartyFundingConfig = typeof thirdPartyFundingConfig.$inferSelect;

export const fundingAuditLogs = pgTable("funding_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action", { length: 50 }).notNull(),
  actorUserId: varchar("actor_user_id").notNull(),
  targetUserId: varchar("target_user_id"),
  relationshipId: varchar("relationship_id"),
  transactionId: varchar("transaction_id"),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FundingAuditLog = typeof fundingAuditLogs.$inferSelect;

export const sponsoredBalances = pgTable("sponsored_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientUserId: varchar("recipient_user_id").notNull(),
  funderUserId: varchar("funder_user_id").notNull(),
  relationshipId: varchar("relationship_id").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalReceived: decimal("total_received", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalUsed: decimal("total_used", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lastTopUpAt: timestamp("last_top_up_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SponsoredBalance = typeof sponsoredBalances.$inferSelect;
