import { storage } from "./storage";
import type { Notification, RideOffer, Ride } from "@shared/schema";

const RIDE_OFFER_TIMEOUT_SECONDS = 10;

export interface RideOfferNotification {
  offerId: string;
  rideId: string;
  pickupLocation: string;
  dropoffLocation: string;
  estimatedFare: string;
  expiresAt: Date;
  remainingSeconds: number;
}

export const notificationService = {
  async sendRideOfferToDrivers(ride: Ride, nearbyDriverIds: string[]): Promise<RideOffer[]> {
    const offers: RideOffer[] = [];
    const expiresAt = new Date(Date.now() + RIDE_OFFER_TIMEOUT_SECONDS * 1000);
    
    // PAIRING BLOCK ENFORCEMENT: Get blocked drivers for this rider
    const blockedDrivers = await storage.getBlockedDriversForRider(ride.riderId);
    const blockedDriverSet = new Set(blockedDrivers);

    for (const driverId of nearbyDriverIds) {
      // PAIRING BLOCK ENFORCEMENT: Skip blocked drivers (absolute exclusion)
      if (blockedDriverSet.has(driverId)) {
        console.log(`[PAIRING BLOCK] Skipping blocked driver ${driverId} for rider ${ride.riderId}`);
        continue;
      }
      
      const driver = await storage.getDriverProfile(driverId);
      if (!driver || driver.status !== "approved" || !driver.isOnline) continue;

      const existingOffer = await storage.getPendingRideOfferForDriver(driverId);
      if (existingOffer) continue;

      const offer = await storage.createRideOffer({
        rideId: ride.id,
        driverId,
        status: "pending",
        offerExpiresAt: expiresAt,
      });

      await storage.createNotification({
        userId: driverId,
        role: "driver",
        title: "New Ride Request",
        message: `Pickup: ${ride.pickupAddress}\nDropoff: ${ride.dropoffAddress}`,
        type: "ride_offer",
        referenceId: offer.id,
        referenceType: "ride_offer",
        playSound: true,
        expiresAt,
      });

      await storage.createRideAuditLog({
        rideId: ride.id,
        action: "ride_offer_sent",
        actorId: "system",
        actorRole: "system",
        metadata: JSON.stringify({ driverId, offerId: offer.id }),
      });

      offers.push(offer);
    }

    return offers;
  },

  async notifyRider(riderId: string, type: Notification["type"], title: string, message: string, rideId?: string): Promise<void> {
    await storage.createNotification({
      userId: riderId,
      role: "rider",
      title,
      message,
      type,
      referenceId: rideId,
      referenceType: rideId ? "ride" : undefined,
      playSound: type === "safety_check",
    });
  },

  async notifyDriver(driverId: string, type: Notification["type"], title: string, message: string, rideId?: string): Promise<void> {
    await storage.createNotification({
      userId: driverId,
      role: "driver",
      title,
      message,
      type,
      referenceId: rideId,
      referenceType: rideId ? "ride" : undefined,
      playSound: type === "safety_check",
    });
  },

  async onRideAccepted(ride: Ride, driverId: string): Promise<void> {
    await storage.expirePendingOffersForRide(ride.id, driverId);

    const driver = await storage.getDriverProfile(driverId);
    const driverName = driver?.fullName || "Your driver";
    const rating = driver?.averageRating ? parseFloat(driver.averageRating) : null;

    await this.notifyRider(
      ride.riderId,
      "ride_accepted",
      "Driver Accepted!",
      `${driverName}${rating ? ` (${rating.toFixed(1)} rating)` : ""} has accepted your ride.`,
      ride.id
    );
  },

  async onDriverEnRoute(ride: Ride): Promise<void> {
    if (!ride.driverId) return;
    const driver = await storage.getDriverProfile(ride.driverId);
    
    await this.notifyRider(
      ride.riderId,
      "driver_en_route",
      "Driver On the Way",
      `${driver?.fullName || "Your driver"} is heading to pick you up.`,
      ride.id
    );
  },

  async onDriverArrived(ride: Ride): Promise<void> {
    await this.notifyRider(
      ride.riderId,
      "driver_arrived",
      "Driver Has Arrived",
      "Your driver has arrived at the pickup location. Please head out.",
      ride.id
    );
  },

  async onWaitingStarted(ride: Ride): Promise<void> {
    await this.notifyRider(
      ride.riderId,
      "waiting_started",
      "Driver is Waiting",
      "Your driver is waiting for you. Waiting charges may apply after 2 minutes.",
      ride.id
    );
  },

  async onRideStarted(ride: Ride): Promise<void> {
    await this.notifyRider(
      ride.riderId,
      "ride_started",
      "Trip Started",
      "Your trip has begun. Enjoy your ride!",
      ride.id
    );
  },

  async onRideCompleted(ride: Ride, fareAmount?: string): Promise<void> {
    const fareMsg = fareAmount ? ` Total fare: $${fareAmount}` : "";
    
    await this.notifyRider(
      ride.riderId,
      "ride_completed",
      "Trip Completed",
      `Your trip has been completed.${fareMsg}`,
      ride.id
    );

    if (ride.driverId) {
      await this.notifyDriver(
        ride.driverId,
        "ride_completed",
        "Trip Completed",
        `Trip completed successfully.${fareMsg}`,
        ride.id
      );
    }
  },

  async onRideCancelled(ride: Ride, cancelledBy: string, compensationEligible?: boolean, compensation?: string): Promise<void> {
    if (cancelledBy === "rider" && ride.driverId) {
      const compMsg = compensationEligible && compensation 
        ? ` You will receive $${compensation} compensation.` 
        : "";
      
      await this.notifyDriver(
        ride.driverId,
        "ride_cancelled",
        "Ride Cancelled",
        `The rider has cancelled the trip.${compMsg}`,
        ride.id
      );
    } else if (cancelledBy === "driver") {
      await this.notifyRider(
        ride.riderId,
        "ride_cancelled",
        "Ride Cancelled",
        "Your driver has cancelled the trip. We're finding you a new driver.",
        ride.id
      );
    }
  },

  async onSafetyCheckTriggered(ride: Ride): Promise<void> {
    await this.notifyRider(
      ride.riderId,
      "safety_check",
      "Safety Check",
      "Are you safe? We noticed the vehicle has stopped for a while.",
      ride.id
    );

    if (ride.driverId) {
      await this.notifyDriver(
        ride.driverId,
        "safety_check",
        "Safety Check",
        "Are you safe? The system detected an extended stop.",
        ride.id
      );
    }
  },

  async onIdleStopAlert(ride: Ride): Promise<void> {
    await this.notifyRider(
      ride.riderId,
      "idle_alert",
      "Vehicle Stopped",
      "Your vehicle has been stationary for 4 minutes. Are you safe?",
      ride.id
    );

    if (ride.driverId) {
      await this.notifyDriver(
        ride.driverId,
        "idle_alert",
        "Idle Alert",
        "Vehicle has been stationary for 4 minutes. Please confirm you're safe.",
        ride.id
      );
    }

    await storage.createRideAuditLog({
      rideId: ride.id,
      action: "idle_stop_alert",
      actorId: "system",
      actorRole: "system",
      metadata: JSON.stringify({ triggeredAt: new Date().toISOString() }),
    });
  },

  async onWaitingCompensationStarted(ride: Ride): Promise<void> {
    if (!ride.driverId) return;
    
    await this.notifyDriver(
      ride.driverId,
      "compensation_notice",
      "Waiting Compensation Started",
      "Paid waiting time has begun. You will be compensated for waiting.",
      ride.id
    );
  },

  async onRiderNoShowAllowed(ride: Ride): Promise<void> {
    if (!ride.driverId) return;
    
    await this.notifyDriver(
      ride.driverId,
      "info",
      "No-Show Option Available",
      "You can now mark this trip as a no-show if the rider doesn't appear.",
      ride.id
    );
  },
};
