#!/bin/bash
# Servidor persistente que continua rodando

echo "🚀 Iniciando servidores em modo persistente..."

# Limpar processos antigos
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Iniciar em background com nohup
cd /home/user/assisnte-juridico-local
nohup npm run dev:with-api -- --host 0.0.0.0 --port 5000 > dev-server.log 2>&1 &

sleep 5

echo ""
echo "✅ Servidores iniciados!"
echo ""
echo "📊 Status:"
lsof -i :5000 -i :3001 | grep LISTEN || echo "   Aguardando inicialização..."
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5000"
echo "   Backend:  http://localhost:3001"
echo "   Cloud: https://5000-firebase-assisnte-juridico-1768313371073.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev/"
echo ""
echo "📋 Logs em tempo real:"
echo "   tail -f dev-server.log"
echo ""
echo "🛑 Para parar:"
echo "   ./stop-dev.sh"
