import { storage } from "./storage";

const POLL_INTERVAL_MS = 60 * 1000;
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

async function processScheduledRatingNotifications(): Promise<void> {
  try {
    const dueNotifications = await storage.getDueScheduledRatingNotifications();
    
    if (dueNotifications.length === 0) return;

    console.log(`[RATING SCHEDULER] Processing ${dueNotifications.length} due notification(s)`);

    for (const scheduled of dueNotifications) {
      try {
        await storage.createNotification({
          userId: scheduled.recipientUserId,
          role: scheduled.recipientRole,
          type: "info",
          title: scheduled.title,
          message: scheduled.message,
          referenceId: scheduled.tripId,
          referenceType: "rating_feedback",
        });

        await storage.markScheduledRatingNotificationSent(scheduled.id);
        console.log(`[RATING SCHEDULER] Delivered notification ${scheduled.id} to ${scheduled.recipientRole} ${scheduled.recipientUserId} (rating ${scheduled.ratingId})`);
      } catch (err) {
        console.error(`[RATING SCHEDULER] Failed to deliver notification ${scheduled.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[RATING SCHEDULER] Error polling scheduled notifications:", err);
  }
}

export function startRatingNotificationScheduler(): void {
  if (schedulerInterval) return;

  console.log("[RATING SCHEDULER] Started — polling every 60s for delayed rating notifications");
  schedulerInterval = setInterval(processScheduledRatingNotifications, POLL_INTERVAL_MS);

  processScheduledRatingNotifications();
}

export function stopRatingNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[RATING SCHEDULER] Stopped");
  }
}
