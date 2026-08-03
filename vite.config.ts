import { defineConfig } from "vite";

// Relative base so zo.pub / GitHub Pages subpaths load JS/CSS correctly.
export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5177,
  },
});
