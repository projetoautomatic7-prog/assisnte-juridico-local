#!/bin/bash
# Verificar status dos servidores

echo "📊 Status dos Servidores"
echo "========================"
echo ""

# Verificar processos
if lsof -i :5000 >/dev/null 2>&1; then
    echo "✅ Frontend (5000): ATIVO"
    curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" http://localhost:5000
else
    echo "❌ Frontend (5000): INATIVO"
fi

echo ""

if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ Backend (3001): ATIVO"
    curl -s http://localhost:3001/api/observability?action=health | jq -r '"   Status: " + .status' 2>/dev/null || echo "   Status: checking..."
else
    echo "❌ Backend (3001): INATIVO"
fi

echo ""
echo "🌐 URLs:"
echo "   https://5000-firebase-assisnte-juridico-1768313371073.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev/"
