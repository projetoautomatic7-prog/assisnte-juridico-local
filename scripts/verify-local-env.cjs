const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log("🔍 Verificando configuração do ambiente LOCAL...\n");

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

let envConfig = {};

if (fs.existsSync(envLocalPath)) {
    console.log("✅ .env.local encontrado");
    const localConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    envConfig = { ...localConfig };
} else {
    console.error("❌ .env.local NÃO encontrado!");
}

if (fs.existsSync(envPath)) {
    console.log("✅ .env encontrado (fallback)");
    const defaultConfig = dotenv.parse(fs.readFileSync(envPath));
    envConfig = { ...defaultConfig, ...envConfig }; // .env.local overrides .env
}

const REQUIRED_VARS = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'QDRANT_URL',
    'QDRANT_API_KEY',
    'RESEND_API_KEY',
    'VITE_SENTRY_DSN',
    'VITE_GEMINI_API_KEY'
];

let hasErrors = false;

console.log("\n📋 Verificando Variáveis Críticas:");

REQUIRED_VARS.forEach(key => {
    const value = envConfig[key];
    if (value && value.length > 0 && !value.includes("placeholder") && !value.includes("sua_chave")) {
        // Simple masking for display
        const masked = value.length > 10 ? value.substring(0, 5) + '...' + value.substring(value.length - 4) : '*****';
        console.log(`✅ ${key}: Configurado (${masked})`);
    } else {
        console.error(`❌ ${key}: AUSENTE ou INVÁLIDO`);
        hasErrors = true;
    }
});

console.log("\n---------------------------------------------------");
if (hasErrors) {
    console.log("⚠️  Existem problemas na configuração do ambiente.");
} else {
    console.log("🚀 Ambiente configurado corretamente! Pronto para reiniciar.");
}
console.log("---------------------------------------------------\n");
