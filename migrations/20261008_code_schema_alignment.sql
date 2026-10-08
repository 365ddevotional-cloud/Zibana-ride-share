-- Apply to the restored destination database before starting this version.
-- Additive, repeatable; never resets or deletes existing records.
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'LOST_ITEM_RETURNED';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'LOST_ITEM_DENIED';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'ACCIDENT_REPORT_HONEST';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'ACCIDENT_SAFETY_CHECK_PASSED';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'LOST_ITEM_FRAUD_DETECTED';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'LOST_ITEM_RESOLVED';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'ACCIDENT_REPORT_FILED';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'ACCIDENT_SAFETY_COOPERATION';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'LOST_ITEM_HUB_DROPOFF';
ALTER TYPE behavior_signal_type ADD VALUE IF NOT EXISTS 'DISPUTE_RESOLVED';
ALTER TYPE referral_owner_role ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE director_dispute_type ADD VALUE IF NOT EXISTS 'driver_complaint';
ALTER TYPE director_dispute_type ADD VALUE IF NOT EXISTS 'unfair_treatment';
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS vehicle_year integer;
ALTER TABLE accident_reports ADD COLUMN IF NOT EXISTS insurance_claim_ref text;
ALTER TABLE accident_reports ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamp;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata text;
