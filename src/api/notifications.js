import api from "./client";

/**
 * Sends a notification email to all athletes on the sender's team.
 * @param {object} payload - The notification payload.
 * @param {string} payload.senderId - The ID of the user sending the notification.
 * @param {string[]} payload.eventIds - An array of event IDs to include in the notification.
 * @param {string} [payload.additionalMessage=""] - An optional message to append to the email.
 * @returns {Promise<{status: string} | {error: string}>}
 */
export async function sendNotificationToTeam({
  senderId,
  eventIds,
  additionalMessage = "",
}) {
  console.log("inside sendNotificationToTeam");
  const payload = { senderId, eventIds, additionalMessage };
  // Backend route uses the actual concept action: /api/Notification/create
  const { data } = await api.post("/Notification/create", payload);
  return data;
}
