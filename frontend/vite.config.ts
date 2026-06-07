import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Mirror the "@/*" -> "./src/*" mapping from tsconfig so Vite, the dev
      // server, and Vitest all resolve the alias at runtime.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the FastAPI backend in dev so we don't have to worry
      // about CORS or hardcoding origins in the client. The /api prefix is kept
      // and handled by the backend (it strips it before routing), so dev and the
      // bundled single-origin deployment behave identically.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    css: false,
  },
});
