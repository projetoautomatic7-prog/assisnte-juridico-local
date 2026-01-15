#!/bin/bash

# Cores para o terminal
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🚀 Iniciando bateria de testes E2E...${NC}"
npx playwright test

echo -e "${GREEN}📊 Testes concluídos. Iniciando servidor de relatório...${NC}"
echo -e "💡 Se você estiver em um ambiente remoto (Codespaces/Gitpod), certifique-se de que a porta 9323 esteja liberada."

# Inicia o servidor de relatório em todas as interfaces para permitir acesso externo
npx playwright show-report --port 9323 --host 0.0.0.0