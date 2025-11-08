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
  const { data } = await api.post("/TeamMembership/addAthlete", {
    title,
    athleteId,
    passKey,
  });
  return data; // {} | { error }
}

// Athlete leaves a team by title
export async function leaveTeam(athleteId, title) {
  const { data } = await api.post("/TeamMembership/removeAthlete", {
    title,
    athleteId,
  });
  return data; // {} | { error }
}

// Converted to POST
export async function getTeamByCoach(coachId) {
  console.log("inside get team by coach");
  const { data } = await api.post("/TeamMembership/getTeamByCoach", {
    coachId,
  });
  return data; // Team | { error }
}

// Converted to POST
export async function getTeamByAthlete(athleteId) {
  console.log("inside get team by athlete");
  const { data } = await api.post("/TeamMembership/getTeamByAthlete", {
    athleteId,
  });
  return data; // Team | { error }
}

// Converted to POST
export async function getAthletesByTeam(teamId) {
  const { data } = await api.post("/TeamMembership/getAthletesByTeam", {
    teamId,
  });
  return data; // User[] | { error }
}

// Coach disbands a team they own
export async function deleteTeam(coachId, title) {
  const { data } = await api.post("/TeamMembership/deleteTeam", {
    coachId,
    title,
  });
  return data; // {} | { error }
}
