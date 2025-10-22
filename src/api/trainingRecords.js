import api from "./client";

export async function logDailyEntry(payload) {
  // payload: { userId, date, mileage, stress, sleep, restingHeartRate, exerciseHeartRate, perceivedExertion, notes }
  const { data } = await api.post("/TrainingRecords/logDailyEntry", payload);
  return data;
}

export async function listEntries({ userId, from, to }) {
  const { data } = await api.post("/TrainingRecords/listEntries", {
    userId,
    from,
    to,
  });
  return data; // { entries } | { error }
}
