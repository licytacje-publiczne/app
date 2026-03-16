import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      shared: resolve(__dirname, "../shared"),
    },
  },
  build: {
    outDir: "dist",
  },
  esbuild: {
    pure:
      mode === "production"
        ? ["console.log", "console.info", "console.debug", "console.trace"]
        : [],
  },
  server: {
    allowedHosts: [
      "localhost-vite.mobulum.xyz",
      "licytacje-publiczne.mobulum.com",
      "licytacje-publiczne.github.io",
    ],
  },
}));
