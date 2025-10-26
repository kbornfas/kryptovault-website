import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type PluginOption } from "vite";

const plugins: PluginOption[] = [react()];

// https://vite.dev/config/
export default defineConfig({
  plugins,
  base: '/kryptovault-website/', // GitHub Pages base path
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
});
