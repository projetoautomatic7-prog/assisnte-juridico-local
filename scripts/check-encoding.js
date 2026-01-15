#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Extensões de arquivos de texto que devem ser UTF-8
const EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".md",
  ".json",
  ".css",
  ".sh",
  ".txt",
  ".bat",
  ".ps1",
];
const IGNORE_DIRS = ["node_modules", "dist", ".git", "backups", "coverage", ".vite"];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const decoder = new TextDecoder("utf-8", { fatal: true });
let hasError = false;

console.log("🔍 Verificando integridade da codificação UTF-8...");

const files = getAllFiles(rootDir);
let checkedCount = 0;

for (const file of files) {
  const buffer = fs.readFileSync(file);
  try {
    // Tenta decodificar o buffer como UTF-8. Se houver caracteres inválidos, lançará erro.
    decoder.decode(buffer);
    checkedCount++;
  } catch (e) {
    const relativePath = path.relative(rootDir, file);
    console.error(`❌ Codificação inválida detectada: ${relativePath}`);
    hasError = true;
  }
}

if (hasError) {
  console.error("\n🛑 ERRO: Foram encontrados arquivos que não são UTF-8 válidos.");
  console.error("Isso geralmente causa caracteres corrompidos () na interface.");
  console.error(
    "💡 Dica: Abra os arquivos listados no VS Code e salve-os explicitamente com 'UTF-8'."
  );
  process.exit(1);
}

console.log(`✅ ${checkedCount} arquivos verificados e validados como UTF-8.\n`);
process.exit(0);
