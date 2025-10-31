import api from "./client";

// Coach creates a team
export async function createTeam(coachId, title, passKey) {
  const { data } = await api.post("/TeamMembership/createTeam", {
    coachId,
    title,
    passKey,
  });
  return data; // { newTeam } | { error }
}

// Athlete joins a team by title + passKey
export async function joinTeam(athleteId, title, passKey) {
  const { data } = await api.post("/TeamMembership/joinTeam", {
    athleteId,
    title,
    passKey,
  });
  return data; // {} | { error }
}

// Athlete leaves a team by title
export async function leaveTeam(athleteId, title) {
  const { data } = await api.post("/TeamMembership/leaveTeam", {
    athleteId,
    title,
  });
  return data; // {} | { error }
}

// Query helpers
export async function getTeamByCoach(coachId) {
  const { data } = await api.get("/TeamMembership/getTeamByCoach", {
    params: { coachId },
  });
  return data; // Team | { error }
}

export async function getTeamByAthlete(athleteId) {
  const { data } = await api.get("/TeamMembership/getTeamByAthlete", {
    params: { athleteId },
  });
  return data; // Team | { error }
}

export async function getAthletesByTeam(teamId) {
  const { data } = await api.get("/TeamMembership/getAthletesByTeam", {
    params: { teamId },
  });
  return data; // User[] | { error }
}
