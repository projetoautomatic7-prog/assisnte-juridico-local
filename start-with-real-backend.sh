#!/bin/bash
# Inicia FRONTEND + BACKEND REAL

echo "🚀 Iniciando com BACKEND REAL (Gemini AI)"
echo "==========================================="

# Parar processos antigos
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Backend real em background
nohup ./start-real-backend.sh > backend-real.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend REAL iniciado (PID: $BACKEND_PID)"
sleep 5

# Frontend
nohup npm run dev -- --host 0.0.0.0 --port 5000 > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"
echo ""
echo "📊 Status:"
sleep 3
lsof -i :3001 -i :5000 | grep LISTEN || echo "Aguardando..."
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5000"
echo "   Backend REAL: http://localhost:3001"
echo "   Cloud: https://5000-firebase-assisnte-juridico-1768313371073.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev/"
echo ""
echo "📋 Logs:"
echo "   Backend: tail -f backend-real.log"
echo "   Frontend: tail -f frontend.log"
