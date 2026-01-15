#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

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

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const win1252Decoder = new TextDecoder("windows-1252");
const encoder = new TextEncoder();

console.log("🛠️  Iniciando conversão automática para UTF-8...");

const files = getAllFiles(rootDir);
let fixedCount = 0;

for (const file of files) {
  const buffer = fs.readFileSync(file);
  try {
    // Tenta ver se já é UTF-8
    utf8Decoder.decode(buffer);
  } catch (e) {
    // Se falhar, assume-se que é Windows-1252 e converte
    const relativePath = path.relative(rootDir, file);
    console.log(`Converting: ${relativePath}`);

    try {
      const content = win1252Decoder.decode(buffer);
      const utf8Buffer = encoder.encode(content);

      // Sobrescreve o arquivo com o novo buffer UTF-8
      fs.writeFileSync(file, utf8Buffer);
      fixedCount++;
    } catch (err) {
      console.error(`❌ Erro ao converter ${relativePath}: ${err.message}`);
    }
  }
}

if (fixedCount > 0) {
  console.log(`\n✅ Sucesso! ${fixedCount} arquivos foram convertidos para UTF-8.`);
  console.log("Recomenda-se rodar 'npm run lint:fix' agora para garantir a consistência.");
} else {
  console.log("\n✨ Nenhum arquivo com encoding incorreto foi encontrado.");
}

process.exit(0);
