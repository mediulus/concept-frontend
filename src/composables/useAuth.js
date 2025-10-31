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
      // 1) Firebase popup sign-in
      const cred = await signInWithGoogle();
      const tokenToSend = await cred.user.getIdToken();
      // 2) Call backend UserDirectory to upsert user using idToken
      const res = await loginWithGoogleIdToken(tokenToSend);
      if (res && !res.error && res.userId) {
        // Persist backend user id for API calls
        try {
          window.__tt_userId = res.userId;
          localStorage.setItem("tt_userId", res.userId);
        } catch {}
      }
      return res;
    },
  };
}
