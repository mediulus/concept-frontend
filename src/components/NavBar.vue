<script setup>
import { ref } from "vue";
import { useAuth } from "../composables/useAuth";
const { user, signInWithGoogleAndRegister, signOutUser } = useAuth();
const err = ref(null);

async function onGoogleSignIn() {
  console.log("inside onGoogleSignIn");
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
  <nav class="nav">
    <div class="nav-inner">
      <div class="nav-left">
        <router-link class="brand" to="/">
          <span class="logo-dot">TT</span>
          <span class="brand-text">TrainTogether</span>
        </router-link>
      </div>
      <div class="nav-right">
        <router-link class="pill" to="/log">Log</router-link>
        <router-link class="pill" to="/team-summaries"
          >Team Summaries</router-link
        >
        <router-link class="pill" to="/profile">Profile</router-link>
        <template v-if="user">
          <span class="user-name" v-if="user?.displayName">{{
            user.displayName
          }}</span>
          <button type="button" class="btn btn-ghost" @click="signOutUser">
            Sign out
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn btn-primary" @click="onGoogleSignIn">
            Sign in with Google
          </button>
          <span v-if="err" class="err">{{ err }}</span>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Layout: brand left, links/user right */
nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--color-accent);
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: saturate(180%) blur(8px);
  /* full-bleed background */
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  max-width: 1280px;
  margin: 0 auto;
}
nav a {
  text-decoration: none;
}
.nav-left {
  display: flex;
  align-items: center;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.logo-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #fff;
  color: var(--color-accent);
  font-weight: 900;
  font-size: 0.9rem;
}
.brand-text {
  font-size: 1rem;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pill {
  color: #fff;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.pill:hover {
  background: rgba(255, 255, 255, 0.14);
}
.user-name {
  color: #fff;
  opacity: 0.95;
  margin: 0 4px 0 8px;
}
.btn {
  margin-left: 4px;
}
.btn-primary {
  background: #fff;
  color: var(--color-accent);
}
.btn-primary:hover {
  background: #f3f3f3;
}
.btn-ghost {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.12);
}
.err {
  color: #ffd0d8;
  margin-left: 8px;
}
</style>
