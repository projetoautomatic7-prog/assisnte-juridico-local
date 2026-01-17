#!/bin/bash
# HÍBRIDO: Backend REAL (Gemini IA) + Mock para dados

echo "🚀 Iniciando Backend HÍBRIDO"
echo "================================"
echo "✅ IA: Backend REAL (Gemini)"
echo "✅ Dados: Mock (sem PostgreSQL)"
echo ""

# Parar tudo
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
sleep 2

# 1. Backend REAL na porta 3002 (com wrapper que carrega .env)
echo "🔥 Iniciando backend REAL (porta 3002)..."
cd backend
PORT=3002 nohup ./start-with-env.sh > ../backend-ai.log 2>&1 &
cd ..
sleep 3

# 2. Proxy híbrido na porta 3001
echo "🔀 Iniciando proxy híbrido (porta 3001)..."
nohup node scripts/hybrid-proxy.cjs > proxy.log 2>&1 &
sleep 2

# 3. Frontend
echo "🌐 Iniciando frontend (porta 5000)..."
nohup npm run dev -- --host 0.0.0.0 --port 5000 > frontend.log 2>&1 &

sleep 3
echo ""
echo "📊 Status:"
lsof -i :3001 -i :3002 -i :5000 | grep LISTEN || echo "Aguardando..."
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5000"
echo "   Proxy: http://localhost:3001 (híbrido)"
echo "   Backend IA: http://localhost:3002 (real)"
