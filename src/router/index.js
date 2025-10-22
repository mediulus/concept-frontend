import { createRouter, createWebHistory } from "vue-router";

import Home from "../pages/Home.vue";
import Log from "../pages/Log.vue";
import Profile from "../pages/Profile.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/log", name: "log", component: Log },
    { path: "/profile", name: "profile", component: Profile },
  ],
});

export default router;
