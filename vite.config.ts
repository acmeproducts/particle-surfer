import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    target: "esnext",
  },
  resolve: { alias: { "@": "/src" } },

  // for github pages
  base: "/particle-surfer",
  // for itch.io
  // base: "/",
});
