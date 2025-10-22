import api from "./client";

/**
 * Calls backend UserDirectory.loginWithGoogleIdToken
 * Body can be { idToken } or string, backend accepts both; we send object.
 */
export async function loginWithGoogleIdToken(idToken) {
  const { data } = await api.post("/UserDirectory/loginWithGoogleIdToken", {
    idToken,
  });
  return data; // { userId, needsName, needsRole } | { error }
}
