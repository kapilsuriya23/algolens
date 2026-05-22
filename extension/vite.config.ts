import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { copyFileSync, mkdirSync, existsSync, cpSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-extension-files",
      closeBundle() {
        copyFileSync("manifest.json", "dist/manifest.json");
        if (existsSync("public/icons")) {
          mkdirSync("dist/icons", { recursive: true });
          cpSync("public/icons", "dist/icons", { recursive: true });
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        background: resolve(__dirname, "src/background/background.ts"),
        content: resolve(__dirname, "src/content/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});