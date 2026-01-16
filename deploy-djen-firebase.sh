#!/bin/bash
# 🔥 Script de Deploy Rápido - DJEN Firebase
# Execute: bash deploy-djen-firebase.sh

set -e

echo "🔥 Deploy DJEN para Firebase - Produção"
echo "========================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está logado no Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ Erro: Você não está logado no Firebase${NC}"
    echo "Execute: firebase login"
    exit 1
fi

# Verificar projeto atual
PROJETO_ATUAL=$(firebase use 2>&1 | grep "Now using" | awk '{print $4}' || echo "desconhecido")
echo -e "${YELLOW}📦 Projeto atual:${NC} $PROJETO_ATUAL"
echo ""

# Confirmar deploy
read -p "Continuar com deploy? (s/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Deploy cancelado."
    exit 0
fi

echo ""
echo "📋 Verificando configuração..."

# Verificar secrets necessários
SECRETS_REQUIRED=("DJEN_OAB_NUMERO" "DJEN_OAB_UF" "DJEN_ADVOGADO_NOME")
MISSING_SECRETS=()

for secret in "${SECRETS_REQUIRED[@]}"; do
    if ! firebase functions:secrets:list 2>&1 | grep -q "$secret"; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Secrets ausentes: ${MISSING_SECRETS[*]}${NC}"
    echo ""
    echo "Configure com:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "  firebase functions:secrets:set $secret"
    done
    echo ""
    read -p "Configurar agora? (s/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        for secret in "${MISSING_SECRETS[@]}"; do
            firebase functions:secrets:set "$secret"
        done
    else
        echo "Deploy cancelado. Configure os secrets primeiro."
        exit 1
    fi
fi

echo -e "${GREEN}✅ Secrets configurados${NC}"
echo ""

# Build das functions
echo "🔨 Compilando functions..."
cd functions
npm run build
cd ..
echo -e "${GREEN}✅ Build concluído${NC}"
echo ""

# Build do projeto
echo "🔨 Compilando projeto..."
npm run build
echo -e "${GREEN}✅ Build do projeto concluído${NC}"
echo ""

# Deploy
echo "🚀 Iniciando deploy..."
firebase deploy --only functions:djenScheduler01h,functions:djenScheduler09h,functions:djenTriggerManual,functions:djenStatus,functions:djenPublicacoes,hosting

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
    echo ""
    echo "🧪 Teste a integração:"
    echo ""
    echo "# Status"
    echo "curl https://$PROJETO_ATUAL.web.app/api/djen/status"
    echo ""
    echo "# Trigger manual"
    echo "curl -X POST https://$PROJETO_ATUAL.web.app/api/djen/trigger-manual"
    echo ""
    echo "# Ver logs"
    echo "firebase functions:log --only djenScheduler09h"
    echo ""
else
    echo -e "${RED}❌ Erro no deploy${NC}"
    exit 1
fi
