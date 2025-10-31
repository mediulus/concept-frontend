import api from "./client";

// Edit an existing event
export async function editEvent({ eventId, updates }) {
  const payload = { eventId, updates };
  const { data } = await api.post("/CalanderEvent/editEvent", payload);
  return data; // {} | { error }
}

// Delete an existing event
export async function deleteEvent({ eventId }) {
  const { data } = await api.post("/CalanderEvent/deleteEvent", { eventId });
  return data; // {} | { error }
}
