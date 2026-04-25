import { defineConfig } from "vite";

// Use relative asset paths so the build is hostable under any subdirectory
// (GitHub Pages publishes under /<repo-name>/) as well as under "/".
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
