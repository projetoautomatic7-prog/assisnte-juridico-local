#!/bin/bash
set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"
SERVICE="assistente-juridico-backend"

# URL do Pooler (recomendado para Cloud Run)
DB_URL="postgresql://neondb_owner:npg_pCHnAuQ1Kg8e@ep-wispy-smoke-ac2x3a7v-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

echo "🔐 Atualizando DATABASE_URL via Secret Manager..."

# Verificar se secret existe
if gcloud secrets describe database-url --project=$PROJECT_ID &>/dev/null; then
  echo "✅ Secret existe - atualizando versão..."
  echo -n "$DB_URL" | gcloud secrets versions add database-url \
    --project=$PROJECT_ID \
    --data-file=-
else
  echo "➕ Criando novo secret..."
  echo -n "$DB_URL" | gcloud secrets create database-url \
    --project=$PROJECT_ID \
    --data-file=- \
    --replication-policy="automatic"
fi

echo ""
echo "🚀 Forçando novo deployment do Cloud Run..."
gcloud run services update $SERVICE \
  --project=$PROJECT_ID \
  --region=$REGION \
  --update-env-vars="FORCE_UPDATE=$(date +%s)" \
  --quiet

echo ""
echo "✅ DATABASE_URL configurada com sucesso!"
echo "⏱️  Aguarde 30 segundos para o Cloud Run reiniciar..."
