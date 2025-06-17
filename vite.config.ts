import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { config } from "dotenv";

// Load environment variables from .env file
config();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Define environment variables at build time
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
