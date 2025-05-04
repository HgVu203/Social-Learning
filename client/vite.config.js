import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    hmr: {
      // Khắc phục lỗi socket connection
      overlay: false,
      clientPort: 3000,
    },
  },
  resolve: {
    extensions: [".jsx", ".js", ".ts", ".tsx", ".json"],
    alias: {
      "@codemirror/state": resolve(__dirname, "node_modules/@codemirror/state"),
      howler: resolve(__dirname, "node_modules/howler"),
    },
  },
  optimizeDeps: {
    include: ["@codemirror/state", "howler", "use-sound"],
    force: true,
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
