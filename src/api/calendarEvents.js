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
  coachId,
}) {
  const toIso = (v) => (v instanceof Date ? v : new Date(v)).toISOString();
  const payload = {
    teamId,
    title,
    location,
    startTime: toIso(startTime),
    endTime: toIso(endTime),
    coachId,
  };
  if (description != null && description !== "")
    payload.description = description;
  if (link != null && link !== "") payload.link = link;

  const { data } = await api.post("/CalanderEvent/createEvent", payload);
  return data; // expected: { event } | { error }
}

// Converted to POST (was GET with query params)
export async function getEventsByDate({ teamId, day, month, year }) {
  console.log("API getEventsByDate called with:", { day, month, year });
  const { data } = await api.post("/CalanderEvent/getEventsByDate", {
    teamId,
    day,
    month,
    year,
  });
  if (!data || data.error) return data;
  const events = Array.isArray(data.events) ? data.events : [];
  const norm = events.map((e) => ({
    ...e,
    startTime: new Date(e.startTime),
    endTime: new Date(e.endTime),
  }));
  return { events: norm };
}
