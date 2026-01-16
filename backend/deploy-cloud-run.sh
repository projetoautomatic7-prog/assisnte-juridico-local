#!/bin/bash
# ============================================
# Deploy Backend para Cloud Run (24h ativo)
# ============================================

set -e

PROJECT_ID="sonic-terminal-474321-s1"
SERVICE_NAME="assistente-juridico-backend"
REGION="southamerica-east1"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Iniciando deploy do backend para Cloud Run..."
echo "📦 Projeto: $PROJECT_ID"
echo "🌎 Região: $REGION"
echo ""

# 1. Configurar projeto
echo "1️⃣ Configurando projeto gcloud..."
gcloud config set project "$PROJECT_ID"

# 2. Habilitar APIs necessárias
echo "2️⃣ Habilitando APIs do Cloud Run..."
gcloud services enable run.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet

# 3. Build e deploy
echo "3️⃣ Fazendo deploy do backend..."
echo "📂 Usando Dockerfile da raiz: $REPO_ROOT"

gcloud run deploy "$SERVICE_NAME" \
  --source "$REPO_ROOT" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --port 8080 \
  --quiet

# 4. Obter URL do serviço
echo ""
echo "✅ Deploy concluído!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
echo "🌐 URL do backend: $SERVICE_URL"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configurar variáveis de ambiente:"
echo "      gcloud run services update $SERVICE_NAME --set-env-vars GEMINI_API_KEY=sua-chave --region $REGION"
echo ""
echo "   2. Atualizar firebase.json para apontar para este serviço"
echo ""
echo "   3. Testar: curl $SERVICE_URL/health"
