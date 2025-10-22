<script setup>
import { useAuth } from "../composables/useAuth";
const { user } = useAuth();
</script>

<template>
  <div>
    <h1>Profile</h1>
    <div v-if="!user">You are not signed in.</div>
    <div v-else>
      <p><strong>Name:</strong> {{ user.displayName }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
    </div>
  </div>
</template>
