// vite.config.ts
/// <reference types="vitest/config" />

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

import { phosphorIconOptimizer } from "./vite-icon-optimizer";

// Resolve robusto para ESM (funciona em Windows/Linux)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = process.env.PROJECT_ROOT || __dirname;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    phosphorIconOptimizer(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "inline",
      includeAssets: ["*.svg", "*.png", "*.ico"],
      manifest: {
        id: "/",
        name: "Assistente Jurídico PJe",
        short_name: "PJe Assistant",
        description:
          "Sistema inteligente de gestão jurídica com IA, monitoramento DJEN/DataJud e CRM de processos",
        theme_color: "#1e40af",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        screenshots: [
          {
            src: "/og-image.svg",
            sizes: "1200x630",
            type: "image/svg+xml",
            form_factor: "wide",
            label: "Assistente Jurídico Desktop",
          },
          {
            src: "/og-image.svg",
            sizes: "1200x630",
            type: "image/svg+xml",
            label: "Assistente Jurídico Mobile",
          },
        ],
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        mode: process.env.NODE_ENV === "production" ? "production" : "development",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern:
              /\/assets\/(MinutasManager|MinutasManagerV2|TiptapEditorV2|ProfessionalEditor|GoogleDocsEmbed|AcervoPJe|ProcessTimelineViewer|DashboardCharts|animation|three|dnd|files)-[a-zA-Z0-9]+\.js$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "lazy-chunks",
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 * 7 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/apis\.google\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "google-apis",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/_/, /^\/api/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(projectRoot, "src"),
      "@doist/todoist-api-typescript": resolve(projectRoot, "src/lib/todoist-stub.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@doist/todoist-api-typescript"],
  },
  server: {
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
          });
        },
      },
    },
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    watch: {
      ignored: [
        "**/pkg/**",
        "**/bin/**",
        "**/k8s/**",
        "**/backend/**",
        "**/Multi-Agent-Custom-Automation-Engine-Solution-Accelerator/**",
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/coverage/**",
        "**/.sonar-results/**",
        "**/tests/e2e/**",
      ],
    },
  },
  build: {
    cssMinify: "lightningcss",
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    minify: "esbuild",
    target: "es2020",
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        return deps.filter((dep) => {
          if (dep.includes("editor") || dep.includes("tiptap") || dep.includes("prosemirror")) {
            return false;
          }
          if (dep.includes("Minutas") || dep.includes("minutas")) {
            return false;
          }
          return true;
        });
      },
    },
    rollupOptions: {
      treeshake: {
        manualPureFunctions: [],
      },
      output: {
        hoistTransitiveImports: false,
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/scheduler") ||
            id.includes("@phosphor-icons/react")
          ) {
            return "react-vendor";
          }
          if (id.includes("@radix-ui")) {
            return "ui-vendor";
          }
          if (id.includes("framer-motion")) {
            return "animation";
          }
          if (id.includes("three")) {
            return "three";
          }
          if (id.includes("@dnd-kit")) {
            return "dnd";
          }
          if (id.includes("pdf") || id.includes("file-upload")) {
            return "files";
          }
          if (id.includes("date-fns")) {
            return "date-utils";
          }
          if (
            id.includes("clsx") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge")
          ) {
            return "css-utils";
          }
          if (id.includes("@sentry")) {
            return "sentry";
          }
          if (id.includes("sonner")) {
            return "toasts";
          }
          if (id.includes("sample-data")) {
            return "sample-data";
          }
          if (id.includes("@tiptap") && id.includes("extension-table")) {
            return "editor-table";
          }
          if (id.includes("@tiptap") && id.includes("extension-image")) {
            return "editor-media";
          }
          if (id.includes("@tiptap/starter-kit")) {
            return "editor-core";
          }
          return undefined;
        },
      },
    },
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    pool: "vmThreads",
    poolOptions: {
      vmThreads: {
        maxThreads: 1,
        minThreads: 1,
      },
    },
    fileParallelism: false,
    include: ["**/api/**/*.test.ts", "**/src/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["**/api/**/*.test.ts", "node"],
      ["**/src/lib/**/*.test.ts", "node"],
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["**/api/**/*.ts", "**/src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "*.config.ts",
        "*.config.js",
        "src/test/**",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "api/**/*.test.ts",
        "src/components/ui/**",
      ],
    },
    passWithNoTests: true,
  },
});
