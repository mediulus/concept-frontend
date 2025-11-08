import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import config from "./firebaseConfig.js";

// Initialize Firebase
const app = initializeApp(config);

// Auth
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// Request OpenID scopes so the credential contains an OIDC idToken
provider.addScope("openid");
provider.addScope("email");
provider.addScope("profile");
// Optional: force account chooser for clarity during dev
provider.setCustomParameters({ prompt: "select_account" });

export function signInWithGoogle() {
  // Popup sign-in keeps it simple for this demo
  console.log("inside signInWithGoogle");
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  // Clear stored user ID
  try {
    delete window.__tt_userId;
    localStorage.removeItem("tt_userId");
  } catch {}

  return signOut(auth);
}

export function subscribeAuth(callback) {
  // returns unsubscribe
  return onAuthStateChanged(auth, callback);
}
