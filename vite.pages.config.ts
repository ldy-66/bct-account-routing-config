import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/bct-account-routing-config/",
  root: "github-pages",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "github-pages/index.html",
        solutionTwo: "github-pages/solution-two.html",
        solutionThree: "github-pages/solution-three.html",
      },
    },
  },
});
