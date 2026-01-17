#!/bin/bash
# Wrapper para iniciar backend com variáveis do diretório pai

# Carregar do diretório pai
if [ -f ../.env.production ]; then
    echo "📁 Carregando ../.env.production"
    source ../.env.production
elif [ -f ../.env.local ]; then
    echo "�� Carregando ../.env.local"
    source ../.env.local
fi

echo "✅ GEMINI_API_KEY: ${GEMINI_API_KEY:0:20}..."
echo "✅ UPSTASH_REDIS_REST_URL: ${UPSTASH_REDIS_REST_URL:0:30}..."

# Iniciar servidor
node dist/backend/src/server.js
