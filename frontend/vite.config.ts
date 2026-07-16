import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = (env.VITE_BACKEND_URL || env.BACKEND_URL || "https://api.healthytouch24.com").replace(/\/+$/, "");

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) =>
            assetInfo.name?.endsWith(".mjs")
              ? "assets/[name]-[hash].js"
              : "assets/[name]-[hash][extname]",
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
