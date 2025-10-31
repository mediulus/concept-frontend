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
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
