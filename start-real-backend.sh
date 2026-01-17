#!/bin/bash
# BACKEND REAL com Gemini AI

echo "🚀 Iniciando BACKEND REAL (não mock)"
echo "====================================="

# Carregar variáveis
source .env.production

# Setar variáveis obrigatórias
export GEMINI_API_KEY=AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
export PORT=3001
export NODE_ENV=development
export FRONTEND_URL=http://localhost:5000

echo "✅ GEMINI_API_KEY configurado"
echo "✅ Porta: 3001"
echo ""

# Iniciar backend real
cd backend
node dist/backend/src/server.js
