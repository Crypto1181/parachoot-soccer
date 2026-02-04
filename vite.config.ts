import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Always use root path for Capacitor builds
  base: "/",
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/sportsrc": {
        target: "https://api.sportsrc.org",
        changeOrigin: true,
        rewrite: (path) => {
          // Remove /api/sportsrc prefix, so /api/sportsrc/v2 becomes /v2
          const rewritten = path.replace(/^\/api\/sportsrc/, "");
          console.log(`[Proxy] Rewriting ${path} to ${rewritten}`);
          return rewritten;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[Proxy] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[Proxy] Proxying ${req.method} ${req.url}`);
          });
        },
      },
      "/api/westream": {
        target: "https://westream.su",
        changeOrigin: true,
        secure: true,
        ws: false,
        rewrite: (path) => {
          // Remove /api/westream prefix, so /api/westream/matches/live becomes /matches/live
          const rewritten = path.replace(/^\/api\/westream/, "");
          console.log(`[Proxy WeStream] Rewriting ${path} to ${rewritten}`);
          return rewritten;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[Proxy WeStream] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Remove headers that might cause issues
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            console.log(`[Proxy WeStream] Proxying ${req.method} ${req.url} to westream.su`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Add CORS headers to response
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept';
            console.log(`[Proxy WeStream] Response ${proxyRes.statusCode} for ${req.url}`);
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
