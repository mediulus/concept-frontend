import { createRouter, createWebHistory } from "vue-router";

import Home from "../pages/Home.vue";
import Log from "../pages/Log.vue";
import Profile from "../pages/Profile.vue";
import TeamSummaries from "../pages/TeamSummaries.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/log", name: "log", component: Log },
    { path: "/profile", name: "profile", component: Profile },
    {
      path: "/team-summaries",
      name: "team-summaries",
      component: TeamSummaries,
    },
  ],
});

export default router;
