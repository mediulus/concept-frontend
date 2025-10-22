<script setup>
import { ref } from "vue";
import { useAuth } from "../composables/useAuth";
const { user, signInWithGoogleAndRegister, signOutUser } = useAuth();
const err = ref(null);

async function onGoogleSignIn() {
  err.value = null;
  try {
    const res = await signInWithGoogleAndRegister();
    if (res?.error) err.value = res.error;
  } catch (e) {
    err.value = e?.response?.data?.error || e?.message || "Sign-in failed";
  }
}
</script>

<template>
  <nav>
    <router-link to="/">TrainTogether</router-link>
    |
    <router-link to="/log">log</router-link>
    |
    <router-link to="/profile">profile</router-link>
    |
    <span v-if="user">
      <span v-if="user?.displayName">{{ user.displayName }}</span>
      <button type="button" @click="signOutUser">Sign out</button>
    </span>
    <span v-else>
      <button type="button" @click="onGoogleSignIn">Sign in with Google</button>
      <span v-if="err" style="color: crimson; margin-left: 8px">{{ err }}</span>
    </span>
  </nav>
</template>

<style scoped>
/* Keep it extremely simple */
nav {
  padding: 8px 0;
}
nav a {
  margin: 0 6px;
}
button {
  margin-left: 8px;
}
</style>
