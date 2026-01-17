#!/bin/bash
# ============================================
# START LOCAL - SIMULA PRODUÇÃO
# Backend local (porta 3001) + Frontend (porta 5173)
# ============================================

set -e

echo "🚀 Iniciando ambiente local de produção..."
echo "=========================================="

# 1. Verificar variáveis de ambiente
if [ ! -f .env.production ]; then
    echo "❌ Arquivo .env.production não encontrado!"
    exit 1
fi

echo "✅ Carregando variáveis de ambiente..."
source .env.production

# 2. Build do backend
echo ""
echo "📦 Building backend..."
cd backend
npm install --quiet
npm run build
cd ..

# 3. Build do frontend  
echo ""
echo "📦 Building frontend..."
NODE_ENV=production npm run build

# 4. Iniciar backend (porta 3001)
echo ""
echo "🔥 Iniciando backend na porta 3001..."
cd backend
PORT=3001 node dist/backend/src/server.js &
BACKEND_PID=$!
cd ..

sleep 3

# 5. Iniciar frontend (preview do build)
echo ""
echo "🌐 Iniciando frontend na porta 5173..."
npm run preview -- --port 5173 &
FRONTEND_PID=$!

echo ""
echo "✅ Ambiente local de produção iniciado!"
echo "=========================================="
echo "📱 Frontend: http://localhost:5173"
echo "🔌 Backend:  http://localhost:3001"
echo ""
echo "Para parar, pressione Ctrl+C"
echo ""

# Cleanup ao sair
cleanup() {
    echo ""
    echo "🛑 Parando servidores..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ Servidores parados!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Aguardar
wait
