#!/bin/bash
# Script de inicialização rápida do ambiente dev

echo "🚀 Iniciando Assistente Jurídico - Ambiente Dev"
echo "=============================================="

# Limpar processos antigos nas portas
echo "🧹 Limpando processos antigos..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

sleep 2

# Iniciar servidor
echo ""
echo "🔥 Iniciando servidores..."
echo "   Frontend: http://localhost:5000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "   Cloud Workstation URL:"
echo "   https://5000-firebase-assisnte-juridico-1768313371073.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev/"
echo ""

npm run dev:with-api -- --host 0.0.0.0 --port 5000
