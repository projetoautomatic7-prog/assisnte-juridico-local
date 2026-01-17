#!/bin/bash

# Script para iniciar Backend e Frontend na Cloud Workstation
set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando serviços do Assistente Jurídico PJe${NC}\n"

# 1. Parar serviços existentes
echo -e "${YELLOW}1. Parando serviços existentes...${NC}"
lsof -ti:3001 2>/dev/null | xargs -r kill 2>/dev/null || true
lsof -ti:5000 2>/dev/null | xargs -r kill 2>/dev/null || true
sleep 2

# 2. Iniciar Backend (porta 3001)
echo -e "${YELLOW}2. Iniciando Backend (porta 3001)...${NC}"
cd /home/user/assisnte-juridico-local
node backend/dist/backend/src/server.js > backend-real.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# 3. Verificar Backend
if curl -s http://localhost:3001/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend rodando em http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Erro ao iniciar Backend${NC}"
    tail -30 backend-real.log
    exit 1
fi

# 4. Iniciar Frontend (porta 5000)
echo -e "${YELLOW}3. Iniciando Frontend (porta 5000)...${NC}"
npm run dev -- --host 0.0.0.0 --port 5000 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 5

# 5. Verificar Frontend
if curl -s http://localhost:5000 | grep -q "Assistente"; then
    echo -e "${GREEN}✅ Frontend rodando em http://localhost:5000${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend pode estar iniciando...${NC}"
fi

# 6. Exibir URLs de acesso
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Serviços Iniciados com Sucesso!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}\n"

WEB_HOST="${WEB_HOST:-firebase-assisnte-juridico-1768313371073.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev}"

echo -e "📱 ${YELLOW}Frontend:${NC}"
echo -e "   https://5000-${WEB_HOST}\n"

echo -e "🔧 ${YELLOW}Backend:${NC}"
echo -e "   https://3001-${WEB_HOST}\n"

echo -e "🔍 ${YELLOW}Health Check:${NC}"
echo -e "   https://3001-${WEB_HOST}/health\n"

echo -e "${GREEN}════════════════════════════════════════${NC}\n"

# 7. Monitorar logs
echo -e "${YELLOW}Monitorando logs (Ctrl+C para sair)...${NC}\n"
tail -f backend-real.log frontend.log
