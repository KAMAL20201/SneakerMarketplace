import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://sdk.cashfree.com https://www.google.com https://www.gstatic.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' data: https: blob:; " +
              "connect-src 'self' https://*.supabase.co https://api.postalpincode.in https://checkout.razorpay.com https://api.cashfree.com; " +
              "frame-src 'self' https://www.google.com; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';"
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
            "camera=(), microphone=(), geolocation=(), payment=(self)"
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
  },
  // For production builds
  build: {
    // Optimize bundle size
    target: "esnext",
    minify: "terser",
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Better code splitting for performance
        manualChunks: {
          // Core React libraries
          react: ["react", "react-dom"],
          // Router
          router: ["react-router"],
          // UI components
          radix: [
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-popover",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          // Supabase
          supabase: ["@supabase/supabase-js"],
          // Forms
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
        },
        // Optimize asset file names
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    // Improve compression
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
});
