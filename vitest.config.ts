import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import fs from "node:fs";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer .env.test; fallback to .env.local then .env (sem placeholders)
for (const envFile of [".env.test", ".env.local", ".env"]) {
  const envPath = path.resolve(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    // Aumentar timeout para testes de performance e integração
    testTimeout: 600000, // 10 minutos para testes de integração
    hookTimeout: 60000, // 1 minuto para hooks
    // Estabilidade > performance: evita limite de memória dos worker threads (ERR_WORKER_OUT_OF_MEMORY)
    pool: "forks",
    singleFork: true,
    // Ajustar concorrência baseado em ambiente para estabilidade
    maxConcurrency: 1,
    // ✅ Isolar testes no CI para melhor confiabilidade
    isolate: !!process.env.CI,
    // ✅ Suporte a sharding para execução paralela
    // Use --shard=1/4 --shard=2/4 etc nos comandos
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "api/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.{git,cache,output,temp}/**",
      "tests/e2e/**",
    ],
    // reporters will be handled via a separate converter script (vitest json -> SARIF)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/", "**/*.d.ts", "**/*.config.*", "**/mockData", "dist/"],
    },
    // Configurar para usar .env.test
    env: {
      NODE_ENV: "test",
      VITEST: "true",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
