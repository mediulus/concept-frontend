import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
const enableDevtools = process.env.VUE_DEVTOOLS === "true";

export default defineConfig({
  plugins: [
    vue(),
    // Opt-in only: enable with VUE_DEVTOOLS=true env var
    ...(enableDevtools ? [vueDevTools()] : []),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  // resolve: {
  //   alias: {
  //     "@": fileURLToPath(new URL("./src", import.meta.url)),
  //   },
  // },
});
