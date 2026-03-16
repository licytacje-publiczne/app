import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "spa-fallback",
      closeBundle() {
        // GitHub Pages serves 404.html for unknown routes — copy index.html
        copyFileSync(resolve(__dirname, "dist/index.html"), resolve(__dirname, "dist/404.html"));
      },
    },
  ],
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
