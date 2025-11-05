import api from "./client";

// Matches CalanderEventConcept.createEvent signature.
// Sends startTime/endTime as ISO strings.
export async function createEvent({
  teamId,
  startTime,
  endTime,
  location,
  title,
  description,
  link,
}) {
  const toIso = (v) => (v instanceof Date ? v : new Date(v)).toISOString();
  const payload = {
    teamId,
    title,
    location,
    startTime: toIso(startTime),
    endTime: toIso(endTime),
  };
  if (description != null && description !== "")
    payload.description = description;
  if (link != null && link !== "") payload.link = link;

  const { data } = await api.post("/CalanderEvent/createEvent", payload);
  return data; // expected: { event } | { error }
}

// Fetch all events for a given day (month is 1-12)
export async function getEventsByDate({ teamId, day, month, year }) {
  console.log("API getEventsByDate called with:", { day, month, year });
  const { data } = await api.get("/CalanderEvent/getEventsByDate", {
    params: { teamId, day, month, year },
  });
  if (!data || data.error) return data;
  const events = Array.isArray(data.events) ? data.events : [];
  // Normalize times to Date objects in the client
  const norm = events.map((e) => ({
    ...e,
    startTime: new Date(e.startTime),
    endTime: new Date(e.endTime),
  }));
  return { events: norm };
}
