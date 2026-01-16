#!/usr/bin/env node

/**
 * Script de validação de variáveis de ambiente pré-build.
 * Garante que as chaves críticas para o Assistente Jurídico PJe estejam presentes.
 */

import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Validar versão do Node.js
// A validação manual foi removida pois o script não lidava corretamente com strings complexas de versão (ex: ^20.19.0 || >=22.12.0)
// O NPM/Yarn já deve alertar sobre incompatibilidades de engines.

// Tenta carregar o dotenv se disponível (útil para build local)
try {
  const { config } = await import("dotenv");
  config({ path: path.join(rootDir, ".env") });
  config({ path: path.join(rootDir, ".env.local") });
} catch (e) {
  // Em ambientes de CI/CD como Vercel, as variáveis já estão no process.env
}

const MANDATORY_VARS = [
  // "VITE_GEMINI_API_KEY", // Verificaremos manualmente para permitir um OU outro
  // "GEMINI_API_KEY",
  // "UPSTASH_REDIS_REST_URL",
  // "UPSTASH_REDIS_REST_TOKEN",
  // "DATABASE_URL",
  "VITE_GOOGLE_CLIENT_ID" // Adicionado como essencial para o frontend
];

console.log("🔍 Validando ambiente de build...");

const missing = MANDATORY_VARS.filter((key) => !process.env[key]);

// Verificação especial para chaves de API (aceita VITE_ ou padrão)
if (!process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
  missing.push("VITE_GEMINI_API_KEY (ou GEMINI_API_KEY)");
}

// Backend keys - Warn only for frontend build
const BACKEND_KEYS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "DATABASE_URL"];
const missingBackend = BACKEND_KEYS.filter(key => !process.env[key]);
if (missingBackend.length > 0) {
  console.warn("⚠️  Aviso: Variáveis de backend ausentes (pode afetar funcionalidades server-side se não injetadas no runtime):");
  missingBackend.forEach(key => console.warn(`   - ${key}`));
}

if (missing.length > 0) {
  console.error("\n❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias ausentes:");
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error(
    "\n💡 Verifique seu arquivo .env ou o painel de segredos do seu provedor de deploy.\n"
  );
  process.exit(1);
}

// Validação básica do formato da chave Gemini
const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (geminiKey && !geminiKey.startsWith('AIza')) {
  console.warn('⚠️  AVISO: A chave da API Gemini não parece seguir o formato padrão (AIza...). Verifique se está correta.');
}

/**
 * Testa a conexão com o Upstash Redis via REST API
 */
async function testRedisConnection(url, token) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const data = JSON.stringify(["PING"]);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
      };

      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const result = JSON.parse(body);
            resolve(result.result === "PONG");
          } catch {
            resolve(false);
          }
        });
      });
      req.on("error", () => resolve(false));
      req.write(data);
      req.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Testa a conexão com o PostgreSQL (Neon)
 */
async function testPostgresConnection(connectionString) {
  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
    });

    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return true;
  } catch (error) {
    console.error(`   DEBUG: ${error.message}`);
    return false;
  }
}

// Pular validação de conectividade em build (Firebase Hosting)
if (process.env.CI !== 'true' && process.env.FIREBASE_DEPLOY !== 'true') {
  console.log("📡 Verificando conectividade com Redis...");
  const isRedisOk = await testRedisConnection(
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!isRedisOk) {
    console.warn(
      "⚠️ AVISO: Não foi possível conectar ao Redis. Deploy continuará."
    );
  }

  console.log("🗄️ Verificando conectividade com PostgreSQL...");
  const isPostgresOk = await testPostgresConnection(process.env.DATABASE_URL);

  if (!isPostgresOk) {
    console.warn(
      "⚠️ AVISO: Não foi possível conectar ao PostgreSQL. Deploy continuará."
    );
  }
} else {
  console.log("⏭️ Pulando verificação de conectividade (modo CI/Deploy)");
}

console.log("✅ Todas as verificações de ambiente passaram!");
process.exit(0);