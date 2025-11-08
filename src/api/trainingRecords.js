import api from "./client";

export async function logDailyEntry(payload) {
  // payload: { userId, date, mileage, stress, sleep, restingHeartRate, exerciseHeartRate, perceivedExertion, notes }
  const { data } = await api.post("/TrainingRecords/logDailyEntry", payload);
  return data;
}

// Converted to POST (was GET with params)
export async function listEntries({ userId, from, to }) {
  const { data } = await api.post("/TrainingRecords/listEntries", {
    userId,
    from,
    to,
  });
  const raw = data?.entries ?? data ?? [];
  const entries = (Array.isArray(raw) ? raw : [])
    .map((e) => {
      const daySrc =
        e.day ?? e.date ?? e.dateStr ?? e.createdAt ?? e.updatedAt ?? null;
      const day = typeof daySrc === "string" ? daySrc.slice(0, 10) : null;

      const toNum = (v) =>
        v === null || v === undefined || v === "" ? null : Number(v);

      return {
        day,
        mileage: toNum(e.mileage),
        stress: toNum(e.stress),
        sleep: toNum(e.sleep),
        restingHeartRate: toNum(e.restingHeartRate),
        exerciseHeartRate: toNum(e.exerciseHeartRate),
        perceivedExertion: toNum(e.perceivedExertion),
        notes: e.notes ?? "",
      };
    })
    .filter((e) => !!e.day);

  return { entries };
}

// Converted to POST
export async function getTeamWeeklySummaries({ userId, date }) {
  const { data } = await api.post("/TrainingRecords/getTeamWeeklySummaries", {
    userId,
    date,
  });
  return data;
}
