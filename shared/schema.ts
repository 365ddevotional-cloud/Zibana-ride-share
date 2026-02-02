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
export const paymentSourceEnum = pgEnum("payment_source", ["TEST_WALLET", "MAIN_WALLET", "CARD", "BANK"]);

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider profiles table
// Payment method enum for riders
export const paymentMethodEnum = pgEnum("payment_method", ["WALLET", "TEST_WALLET", "CARD"]);

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
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("NGN"),
  estimatedTaxAmount: decimal("estimated_tax_amount", { precision: 10, scale: 2 }),
});

// Phase 22 - Enhanced Rides table with full Uber/Lyft-style lifecycle
export const rides = pgTable("rides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  driverId: varchar("driver_id"),
  status: rideStatusEnum("status").notNull().default("requested"),
  
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
  paymentsEnabled: boolean("payments_enabled").notNull().default(false),
  paymentProvider: varchar("payment_provider", { length: 50 }),
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
