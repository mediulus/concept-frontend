import { ref, onMounted, onUnmounted } from "vue";
import {
  auth,
  subscribeAuth,
  signInWithGoogle,
  signOutUser,
} from "../auth/firebase";
import { loginWithGoogleIdToken } from "../api/userDirectory";
import { GoogleAuthProvider } from "firebase/auth";

const currentUser = ref(null);
let unsub = null;

export function useAuth() {
  onMounted(() => {
    if (!unsub) {
      unsub = subscribeAuth((user) => {
        currentUser.value = user;
      });
    }
  });

  onUnmounted(() => {
    // keep listener alive across components in SPA; optional to unsubscribe here
  });

  return {
    user: currentUser,
    signInWithGoogle,
    signOutUser,
    auth,
    async signInWithGoogleAndRegister() {
      console.log("inside useAuth signInWithGoogleAndRegister");
      try {
        // 1) Firebase popup sign-in
        const cred = await signInWithGoogle();
        const tokenToSend = await cred.user.getIdToken();
        console.log("[useAuth] Got Firebase token, calling backend...");

        // 2) Call backend UserDirectory to upsert user using idToken
        const res = await loginWithGoogleIdToken(tokenToSend);
        console.log("[useAuth] Backend response:", res);

        if (res && !res.error && res.userId) {
          // Persist backend user id for API calls
          try {
            window.__tt_userId = res.userId;
            localStorage.setItem("tt_userId", res.userId);
            console.log("[useAuth] Saved backend userId:", res.userId);
          } catch (e) {
            console.error("[useAuth] Failed to save userId:", e);
          }
        } else if (res?.error) {
          console.error("[useAuth] Backend error:", res.error);
        }
        return res;
      } catch (error) {
        console.error("[useAuth] Sign-in error:", error);
        throw error;
      }
    },
  };
}
