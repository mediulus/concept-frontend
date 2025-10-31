import api from "./client";

/**
 * Calls backend UserDirectory.loginWithGoogleIdToken
 * Body can be { idToken } or string, backend accepts both; we send object.
 */
export async function loginWithGoogleIdToken(idToken) {
  console.log("inside loginWithGoogleIdToken");
  const { data } = await api.post("/UserDirectory/loginWithGoogleIdToken", {
    idToken,
  });
  return data; // { userId, needsName, needsRole } | { error }
}

export async function editUserMileage(userId, newMileage) {
  console.log("inside editUserMileage");
  const { data } = await api.post("/UserDirectory/editUserMileage", {
    userId,
    newMileage,
  });
  return data;
}

export async function editUserRole(userId, role) {
  console.log("inside editUserRole");
  const { data } = await api.post("/UserDirectory/editUserRole", {
    userId,
    role,
  });
  return data;
}

export async function getUser(userId) {
  const { data } = await api.get(`/UserDirectory/getUser`, {
    params: { userId },
  });
  return data; // User | { error }
}

export async function editUserGender(userId, gender) {
  console.log("inside editUserGender");
  const { data } = await api.post("/UserDirectory/editUserGender", {
    userId,
    gender,
  });
  return data;
}
