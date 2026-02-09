import { createHash } from "crypto";
import { storage } from "./storage";
import { 
  IDENTITY_ENGINE_LOCKED, 
  assertIdentityEngineLocked, 
  getIdentityConfig, 
  isValidIdTypeForCountry,
  canDriverGoOnline,
  canDriverAcceptRides,
  type GovernmentIdType 
} from "../shared/identity-config";

// Re-export for convenience
export { IDENTITY_ENGINE_LOCKED, assertIdentityEngineLocked };

// =============================================
// HASH UTILITIES (NEVER STORE RAW IDs)
// =============================================

export function hashIdentityDocument(documentNumber: string): string {
  return createHash("sha256").update(documentNumber.trim().toUpperCase()).digest("hex");
}

// =============================================
// IDENTITY SUBMISSION GUARDS
// =============================================

export interface IdentitySubmissionInput {
  userId: string;
  countryCode: string;
  governmentIdType: GovernmentIdType;
  governmentIdNumber: string; // Raw - will be hashed
  driverLicenseNumber?: string; // Raw - will be hashed (for drivers)
}

export interface IdentitySubmissionResult {
  allowed: boolean;
  code?: string;
  message?: string;
  duplicateOfUserId?: string;
}

export async function validateIdentitySubmission(
  input: IdentitySubmissionInput
): Promise<IdentitySubmissionResult> {
  // Assert engine is locked
  assertIdentityEngineLocked();

  // Validate ID type for country
  if (!isValidIdTypeForCountry(input.countryCode, input.governmentIdType)) {
    const config = getIdentityConfig(input.countryCode);
    return {
      allowed: false,
      code: "INVALID_ID_TYPE",
      message: `${input.governmentIdType} is not valid for ${input.countryCode}. Allowed types: ${config.allowedIdTypes.join(", ")}`,
    };
  }

  // Hash the government ID
  const governmentIdHash = hashIdentityDocument(input.governmentIdNumber);

  // Check for duplicate government ID
  const duplicateProfile = await storage.findUserByGovernmentIdHash(governmentIdHash);
  if (duplicateProfile && duplicateProfile.userId !== input.userId) {
    console.log(`[IDENTITY_GUARD] Duplicate government ID detected: userId=${input.userId}, duplicateOf=${duplicateProfile.userId}`);
    
    // Log the duplicate detection
    await storage.createIdentityAuditLog({
      userId: input.userId,
      actionType: "DUPLICATE_DETECTED",
      actionBy: "SYSTEM",
      actionDetails: JSON.stringify({
        governmentIdType: input.governmentIdType,
        countryCode: input.countryCode,
      }),
      countryCode: input.countryCode,
      governmentIdType: input.governmentIdType,
      duplicateOfUserId: duplicateProfile.userId,
    });

    return {
      allowed: false,
      code: "DUPLICATE_GOVERNMENT_ID",
      message: "This government ID is already registered to another user",
      duplicateOfUserId: duplicateProfile.userId,
    };
  }

  // Check for duplicate driver license (if provided)
  if (input.driverLicenseNumber) {
    const driverLicenseHash = hashIdentityDocument(input.driverLicenseNumber);
    const duplicateLicense = await storage.findUserByDriverLicenseHash(driverLicenseHash);
    
    if (duplicateLicense && duplicateLicense.userId !== input.userId) {
      console.log(`[IDENTITY_GUARD] Duplicate driver license detected: userId=${input.userId}, duplicateOf=${duplicateLicense.userId}`);
      
      await storage.createIdentityAuditLog({
        userId: input.userId,
        actionType: "DUPLICATE_DETECTED",
        actionBy: "SYSTEM",
        actionDetails: JSON.stringify({
          documentType: "DRIVER_LICENSE",
          countryCode: input.countryCode,
        }),
        countryCode: input.countryCode,
        duplicateOfUserId: duplicateLicense.userId,
      });

      return {
        allowed: false,
        code: "DUPLICATE_DRIVER_LICENSE",
        message: "This driver license is already registered to another user",
        duplicateOfUserId: duplicateLicense.userId,
      };
    }
  }

  return { allowed: true };
}

// =============================================
// DRIVER ONLINE/ACCEPT GUARDS
// =============================================

export interface DriverIdentityCheckResult {
  allowed: boolean;
  code?: string;
  message?: string;
  identityApproved: boolean;
  driverLicenseVerified: boolean;
}

export async function checkDriverCanGoOnline(userId: string): Promise<DriverIdentityCheckResult> {
  assertIdentityEngineLocked();

  const driverProfile = await storage.getDriverProfile(userId);
  if (driverProfile?.isTraining) {
    console.log(`[TRAINING_MODE] Bypassing identity check for training driver: userId=${userId}`);
    return {
      allowed: true,
      identityApproved: true,
      driverLicenseVerified: true,
    };
  }

  const profile = await storage.getUserIdentityProfile(userId);
  
  if (!profile) {
    return {
      allowed: false,
      code: "NO_IDENTITY_PROFILE",
      message: "Please complete identity verification before going online",
      identityApproved: false,
      driverLicenseVerified: false,
    };
  }

  const identityApproved = profile.identityStatus === "approved" && profile.identityVerified;
  const driverLicenseVerified = profile.driverLicenseVerified;

  const requirements = { identityApproved, driverLicenseVerified };
  
  if (!canDriverGoOnline(requirements)) {
    let message = "Identity verification incomplete. ";
    if (!identityApproved) {
      message += "Government ID not verified. ";
    }
    if (!driverLicenseVerified) {
      message += "Driver license not verified. ";
    }
    
    console.log(`[IDENTITY_GUARD] Driver cannot go online: userId=${userId}, identityApproved=${identityApproved}, licenseVerified=${driverLicenseVerified}`);
    
    return {
      allowed: false,
      code: "IDENTITY_INCOMPLETE",
      message: message.trim(),
      identityApproved,
      driverLicenseVerified,
    };
  }

  return {
    allowed: true,
    identityApproved,
    driverLicenseVerified,
  };
}

export async function checkDriverCanAcceptRide(userId: string): Promise<DriverIdentityCheckResult> {
  // Same requirements as going online
  return checkDriverCanGoOnline(userId);
}

// =============================================
// ADMIN VERIFICATION ACTIONS
// =============================================

export async function adminApproveIdentity(
  userId: string, 
  adminId: string
): Promise<{ success: boolean; message: string }> {
  assertIdentityEngineLocked();

  const profile = await storage.getUserIdentityProfile(userId);
  if (!profile) {
    return { success: false, message: "Identity profile not found" };
  }

  await storage.approveUserIdentity(userId, adminId);
  
  await storage.createIdentityAuditLog({
    userId,
    actionType: "APPROVAL",
    actionBy: adminId,
    actionDetails: JSON.stringify({ previousStatus: profile.identityStatus }),
    countryCode: profile.countryCode,
    governmentIdType: profile.governmentIdType,
  });

  console.log(`[IDENTITY_GUARD] Identity approved: userId=${userId}, adminId=${adminId}`);
  
  return { success: true, message: "Identity approved successfully" };
}

export async function adminRejectIdentity(
  userId: string, 
  adminId: string, 
  reason: string
): Promise<{ success: boolean; message: string }> {
  assertIdentityEngineLocked();

  const profile = await storage.getUserIdentityProfile(userId);
  if (!profile) {
    return { success: false, message: "Identity profile not found" };
  }

  await storage.rejectUserIdentity(userId, adminId, reason);
  
  await storage.createIdentityAuditLog({
    userId,
    actionType: "REJECTION",
    actionBy: adminId,
    actionDetails: JSON.stringify({ 
      previousStatus: profile.identityStatus,
      reason,
    }),
    countryCode: profile.countryCode,
    governmentIdType: profile.governmentIdType,
  });

  console.log(`[IDENTITY_GUARD] Identity rejected: userId=${userId}, adminId=${adminId}, reason=${reason}`);
  
  return { success: true, message: "Identity rejected" };
}

export async function adminVerifyDriverLicense(
  userId: string, 
  adminId: string
): Promise<{ success: boolean; message: string }> {
  assertIdentityEngineLocked();

  const profile = await storage.getUserIdentityProfile(userId);
  if (!profile) {
    return { success: false, message: "Identity profile not found" };
  }

  if (!profile.driverLicenseHash) {
    return { success: false, message: "No driver license on file" };
  }

  await storage.verifyDriverLicense(userId, adminId);
  
  await storage.createIdentityAuditLog({
    userId,
    actionType: "APPROVAL",
    actionBy: adminId,
    actionDetails: JSON.stringify({ 
      action: "DRIVER_LICENSE_VERIFIED",
      previouslyVerified: profile.driverLicenseVerified,
    }),
    countryCode: profile.countryCode,
  });

  console.log(`[IDENTITY_GUARD] Driver license verified: userId=${userId}, adminId=${adminId}`);
  
  return { success: true, message: "Driver license verified successfully" };
}
