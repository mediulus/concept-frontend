import api from "./client";

/**
 * Sends a notification email to all athletes on the sender's team.
 * @param {object} payload - The notification payload.
 * @param {string} payload.senderId - The ID of the user sending the notification.
 * @param {string[]} payload.eventIds - An array of event IDs to include in the notification.
 * @param {string} [payload.additionalMessage=""] - An optional message to append to the email.
 * @param {string|Date} [payload.scheduledAt] - An optional time to schedule the notification for.
 * @returns {Promise<{ok: boolean, id: string} | {error: string}>}
 */
export async function sendNotificationToTeam({ senderId, eventIds, additionalMessage = "", scheduledAt }) {
  const payload = { senderId, eventIds, additionalMessage };
  if (scheduledAt) {
    const d = scheduledAt instanceof Date ? scheduledAt.toISOString() : String(scheduledAt);
    payload.scheduledAt = d;
  }
  const { data } = await api.post("/Notifications/sendNow", payload);
  return data;
}
