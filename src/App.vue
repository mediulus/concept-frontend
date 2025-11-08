<script setup>
import NavBar from "./components/NavBar.vue";
import AuthGate from "./components/AuthGate.vue";
import ToastNotifications from "./components/ToastNotifications.vue";
import { useAuth } from "./composables/useAuth";

const { user } = useAuth();
</script>

<template>
  <ToastNotifications />
  <template v-if="user">
    <NavBar />
    <main>
      <router-view />
    </main>
  </template>
  <template v-else>
    <AuthGate />
  </template>
</template>

<style scoped>
main {
  padding: 16px; /* overall page padding under sticky nav */
}
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
