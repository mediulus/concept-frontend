<script setup>
import { ref } from "vue";
import { useAuth } from "../composables/useAuth";

const { signInWithGoogleAndRegister } = useAuth();
const err = ref("");

async function onSignIn() {
  err.value = "";
  try {
    const res = await signInWithGoogleAndRegister();
    if (res?.error) err.value = res.error;
  } catch (e) {
    err.value = e?.response?.data?.error || e?.message || "Sign-in failed";
  }
}
</script>

<template>
  <div class="gate">
    <!-- Top-left brand, same design as NavBar -->
    <div class="brand-corner">
      <div class="brand">
        <span class="logo-dot">TT</span>
        <span class="brand-text">TrainTogether</span>
      </div>
    </div>

    <!-- Center sign-in panel -->
    <div class="panel">
      <button class="btn" type="button" @click="onSignIn">
        Sign in with Google
      </button>
      <p v-if="err" class="err">{{ err }}</p>
    </div>
  </div>
</template>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--color-accent);
  color: #fff;
  z-index: 9999;
}
.brand-corner {
  position: absolute;
  top: 10px;
  left: 16px;
}
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 24px;
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
  font-size: 1.9rem;
  font-family: "Racing Sans One", cursive, sans-serif;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.btn {
  background: #fff;
  color: var(--color-accent);
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 800;
  cursor: pointer;
}
.btn:hover {
  background: #f3f3f3;
}
.err {
  color: #ffd0d8;
  margin-top: 4px;
}
</style>
