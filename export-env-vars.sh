#!/bin/bash
# ============================================
# HELPER: Exportar variáveis do .env.production
# ============================================

set -a
source .env.production
set +a

export GEMINI_API_KEY="${GEMINI_API_KEY:-$VITE_GEMINI_API_KEY}"
export FRONTEND_URL="${FRONTEND_URL:-https://sonic-terminal-474321-s1.web.app}"
export DJEN_OAB_NUMERO="${DJEN_OAB_NUMERO:-184404}"
export DJEN_OAB_UF="${DJEN_OAB_UF:-MG}"
export DJEN_ADVOGADO_NOME="${DJEN_ADVOGADO_NOME:-Thiago Bodevan Veiga}"

echo "✅ Variáveis exportadas:"
echo "   GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."
echo "   FRONTEND_URL: $FRONTEND_URL"
echo "   DJEN_OAB_NUMERO: $DJEN_OAB_NUMERO"
echo "   DJEN_OAB_UF: $DJEN_OAB_UF"
echo "   DJEN_ADVOGADO_NOME: $DJEN_ADVOGADO_NOME"
echo ""
echo "Agora execute: ./deploy-backend-cloud-run.sh"
