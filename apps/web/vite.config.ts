import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The dev server proxies the API and the /s capability links to the local
// Airlock API (default :8787), so `bun run dev` in apps/web mirrors how the
// production single-image deployment serves the SPA and API from one origin.
const apiTarget = process.env.AIRLOCK_API_BASE_URL ?? "http://localhost:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/s": { target: apiTarget, changeOrigin: true }
    }
  },
  build: {
    outDir: "dist"
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"]
  }
});
