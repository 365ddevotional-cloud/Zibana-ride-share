export function validIdentity(user: any): string | null {
  const id = user?.claims?.sub;
  return typeof id === "string" && id !== "dev-user" &&
    Number.isFinite(user.expires_at) && user.expires_at > Date.now() / 1000 ? id : null;
}
export function activeTrip(trip: any): boolean {
  return !!trip && ["accepted", "in_progress"].includes(trip.status);
}
export function tripParticipant(userId: string, trip: any): boolean {
  return !!trip && (trip.riderId === userId || trip.driverId === userId);
}
export function liveLink(link: any): boolean {
  return !!link && !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now();
}
export async function canTrack(userId: string, target: { driverId?: string; tripId?: string }): Promise<boolean> {
  const { storage } = await import("./storage");
  const roles = await storage.getAllUserRoles(userId);
  if (roles.some(r => r.role === "super_admin")) return true;
  if (roles.some(r => r.role === "admin") && (await storage.isAdminValid(userId)).valid) return true;
  if (target.tripId) return tripParticipant(userId, await storage.getTripById(target.tripId));
  if (!target.driverId) return false;
  if (target.driverId === userId && roles.some(r => r.role === "driver")) return true;
  const { db } = await import("./db");
  const { trips } = await import("@shared/schema");
  const { and, eq, inArray } = await import("drizzle-orm");
  const assigned = await db.select({ id: trips.id }).from(trips).where(and(
    eq(trips.riderId, userId), eq(trips.driverId, target.driverId),
    inArray(trips.status, ["accepted", "in_progress"]),
  )).limit(1);
  return assigned.length > 0;
}
export async function getLiveLink(token: string): Promise<any | null> {
  const { storage } = await import("./storage");
  const link = await storage.getEmergencyTrackingLink(token);
  if (!liveLink(link) || !link.tripId) return null;
  const trip = await storage.getTripById(link.tripId);
  return activeTrip(trip) && trip.driverId === link.driverId && trip.riderId === link.riderId ? link : null;
}
