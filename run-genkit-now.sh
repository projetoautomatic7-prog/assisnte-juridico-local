#!/bin/bash
# Carregar variáveis de ambiente
if [ -f .env.production ]; then
    source .env.production
elif [ -f .env.local ]; then
    source .env.local
elif [ -f .env ]; then
    source .env
fi

echo "🚀 Iniciando Genkit Dev UI..."
echo "API Key: ${GEMINI_API_KEY:0:20}..."
npm exec genkit -- start -- npx tsx --watch lib/ai/genkit-all-flows.ts
