import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    target: "esnext",
  },
  resolve: { alias: { "@": "/src" } },

  // also change the base in main.ts
  // for github pages
  base: "/particle-surfer",
  // for itch.io
  // base: "/",
});
