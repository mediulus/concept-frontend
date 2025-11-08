import api from "./client";

// Edit an existing event
export async function editEvent({ eventId, updates, coachId }) {
  const payload = { eventId, updates, coachId };
  const { data } = await api.post("/CalanderEvent/editEvent", payload);
  return data; // {} | { error }
}

// Delete an existing event
export async function deleteEvent({ eventId, coachId }) {
  const { data } = await api.post("/CalanderEvent/deleteEvent", {
    eventId,
    coachId,
  });
  return data; // {} | { error }
}
