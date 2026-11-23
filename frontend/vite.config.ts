/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Where the dev server forwards /api and /uploads (the NestJS API).
  const apiTarget = env.VITE_DEV_API_TARGET || "http://localhost:3003";

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      /*
       * Same-origin in development, exactly like production behind nginx
       * (ADR-003): the browser only ever talks to :5173, so auth cookies are
       * first-party and `{slug}.localhost:5173` storefronts work.
       * `changeOrigin: false` keeps the original Host header for the API.
       */
      proxy: {
        "/api": { target: apiTarget, changeOrigin: false },
        "/uploads": { target: apiTarget, changeOrigin: false },
        // Per-host SEO files, mapped like nginx does in production (PUB-08).
        "^/sitemap\\.xml$": {
          target: apiTarget,
          changeOrigin: false,
          rewrite: () => "/api/v1/public/seo/sitemap.xml",
        },
        "^/robots\\.txt$": {
          target: apiTarget,
          changeOrigin: false,
          rewrite: () => "/api/v1/public/seo/robots.txt",
        },
      },
    },
    build: {
      sourcemap: false,
      rolldownOptions: {
        output: {
          /*
           * Vendor libraries get their own long-lived, cacheable chunks.
           * Higher priority claims a module first: a group also takes its
           * dependencies, so React must be claimed before forms or radix
           * would pull it in and every page would then load that group.
           * Admin-only libraries (forms, drag and drop) stay out of the
           * chunks the storefront downloads.
           */
          codeSplitting: {
            groups: [
              {
                name: "react",
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
                priority: 50,
              },
              {
                name: "query",
                test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
                priority: 40,
              },
              {
                name: "forms",
                test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
                priority: 30,
              },
              { name: "dnd", test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/, priority: 30 },
              {
                name: "radix",
                test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
                priority: 20,
              },
              // Fonts stay with the entry CSS.
              {
                name: "vendor",
                test: /[\\/]node_modules[\\/](?!@fontsource)/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
