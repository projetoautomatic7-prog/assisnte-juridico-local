#!/bin/bash
# ============================================
# DEPLOY BACKEND COMPLETO - CLOUD RUN 24H
# ============================================

set -euo pipefail

PROJECT_ID="sonic-terminal-474321-s1"
SERVICE_NAME="assistente-juridico-backend"
REGION="southamerica-east1"
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "ERRO: GEMINI_API_KEY nao definida."
  echo "Defina antes de executar:"
  echo "  export GEMINI_API_KEY=SEU_VALOR"
  exit 1
fi

if [[ -z "${FRONTEND_URL:-}" ]]; then
  echo "ERRO: FRONTEND_URL nao definida."
  echo "Defina antes de executar:"
  echo "  export FRONTEND_URL=https://sonic-terminal-474321-s1.web.app"
  exit 1
fi

if [[ -z "${DJEN_OAB_NUMERO:-}" ]]; then
  echo "ERRO: DJEN_OAB_NUMERO nao definido."
  echo "Defina antes de executar:"
  echo "  export DJEN_OAB_NUMERO=SEU_NUMERO"
  exit 1
fi

if [[ -z "${DJEN_OAB_UF:-}" ]]; then
  echo "ERRO: DJEN_OAB_UF nao definido."
  echo "Defina antes de executar:"
  echo "  export DJEN_OAB_UF=UF"
  exit 1
fi

if [[ -z "${DJEN_ADVOGADO_NOME:-}" ]]; then
  echo "ERRO: DJEN_ADVOGADO_NOME nao definido."
  echo "Defina antes de executar:"
  echo "  export DJEN_ADVOGADO_NOME=\"Nome do Advogado\""
  exit 1
fi

FRONTEND_URL="${FRONTEND_URL}"
DJEN_SCHEDULER_ENABLED="${DJEN_SCHEDULER_ENABLED:-false}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-pro}"

echo "🚀 Deploy Backend Express para Cloud Run (24h ativo)"
echo "=================================================="
echo "📦 Projeto: $PROJECT_ID"
echo "🌎 Regiao: Sao Paulo (southamerica-east1)"
echo "⏰ Min Instances: 1 (sempre ligado)"
echo ""

echo "1️⃣ Configurando projeto..."
gcloud config set project "$PROJECT_ID"

echo ""
echo "2️⃣ Habilitando APIs necessarias..."
gcloud services enable run.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet

echo ""
echo "3️⃣ Fazendo deploy do backend..."
echo "   (Isso pode levar 5-10 minutos...)"
echo ""

# 1. Build da imagem usando o arquivo específico (gcloud run deploy não aceita --dockerfile diretamente com source)
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME" --dockerfile "$REPO_ROOT/Dockerfile.backend" "$REPO_ROOT"

# 2. Deploy no Cloud Run a partir da imagem gerada
gcloud run deploy "$SERVICE_NAME" \
  --image "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --port 8080 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=8080" \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --set-env-vars "GEMINI_MODEL=${GEMINI_MODEL}" \
  --set-env-vars "FRONTEND_URL=${FRONTEND_URL}" \
  --set-env-vars "DJEN_OAB_NUMERO=${DJEN_OAB_NUMERO}" \
  --set-env-vars "DJEN_OAB_UF=${DJEN_OAB_UF}" \
  --set-env-vars "DJEN_ADVOGADO_NOME=${DJEN_ADVOGADO_NOME}" \
  --set-env-vars "DJEN_SCHEDULER_ENABLED=${DJEN_SCHEDULER_ENABLED}" \
  --quiet

echo ""
echo "✅ Deploy concluido!"
echo ""

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
echo "🌐 URL do backend: $SERVICE_URL"
echo ""
echo "📋 Proximos passos:"
echo ""
echo "   1. Testar o backend:"
echo "      curl $SERVICE_URL/health"
echo ""
echo "   2. Atualizar firebase.json com:"
echo "      \"rewrites\": [{\"source\": \"/api/**\", \"run\": {\"serviceId\": \"${SERVICE_NAME}\", \"region\": \"${REGION}\"}}]"
echo ""
echo "   3. Deploy do hosting:"
echo "      firebase deploy --only hosting"
echo ""
echo "💰 Custo estimado: ~$10-15/mes (instancia sempre ligada)"
echo ""
