import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild, command }) => ({
  plugins: [
    reactRouter(),
    tailwindcss(),
    // Security headers plugin
    {
      name: "security-headers",
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          // Content Security Policy
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://sdk.cashfree.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://*.clarity.ms https://static.cloudflareinsights.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' data: https: blob:; " +
              "connect-src 'self' https://*.supabase.co https://api.theplugmarket.in https://api.postalpincode.in https://checkout.razorpay.com https://api.cashfree.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.clarity.ms https://c.bing.com; " +
              "media-src 'self' https://*.supabase.co; " +
              "frame-src 'self' https://www.google.com; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          );

          // Prevent MIME type sniffing
          res.setHeader("X-Content-Type-Options", "nosniff");

          // Prevent clickjacking
          res.setHeader("X-Frame-Options", "SAMEORIGIN");

          // XSS Protection (legacy but still useful)
          res.setHeader("X-XSS-Protection", "1; mode=block");

          // Referrer Policy
          res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

          // Permissions Policy
          res.setHeader(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=(self)",
          );

          next();
        });
      },
    },
  ],
  server: {
    host: "localhost", // Changed from 0.0.0.0 for security
    port: 5173, // Default Vite port
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-router"],
  },
  // Bundle all deps into SSR build so the Vercel serverless function
  // doesn't need node_modules at runtime.
  // Only apply in production builds — in dev, Vite's SSR module runner
  // can't handle CJS packages (like React) bundled as ESM.
  ssr:
    command === "build"
      ? { noExternal: true }
      : undefined,
  // For production builds — React Router handles code splitting automatically
  build: {
    rollupOptions: isSsrBuild
      ? undefined
      : {
          output: {
            manualChunks(id) {
              if (id.includes("node_modules")) {
                if (
                  id.includes("/react/") ||
                  id.includes("/react-dom/") ||
                  id.includes("/react-router/")
                ) {
                  return "vendor-react";
                }
                if (id.includes("/@supabase/")) {
                  return "vendor-supabase";
                }
                if (id.includes("/@radix-ui/")) {
                  return "vendor-ui";
                }
              }
            },
          },
        },
  },
}));
