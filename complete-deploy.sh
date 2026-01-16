#!/bin/bash
set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"

echo "🔐 Configurando permissões IAM..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:scheduler-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker" \
  --condition=None

echo ""
echo "⏰ Criando/Atualizando Cloud Scheduler job..."
gcloud scheduler jobs create http agents-process-queue \
  --project="$PROJECT_ID" \
  --schedule="*/15 * * * *" \
  --uri="https://agents-tpicng6fpq-uc.a.run.app?action=process-queue" \
  --http-method=POST \
  --oidc-service-account-email="scheduler-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --location="$REGION" 2>/dev/null || \
gcloud scheduler jobs update http agents-process-queue \
  --project="$PROJECT_ID" \
  --schedule="*/15 * * * *" \
  --uri="https://agents-tpicng6fpq-uc.a.run.app?action=process-queue" \
  --http-method=POST \
  --oidc-service-account-email="scheduler-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --location="$REGION"

echo ""
echo "✅ Configuração completa!"
echo ""
echo "📊 Status dos recursos:"
gcloud scheduler jobs list --project="$PROJECT_ID" --location="$REGION" 2>/dev/null || echo "⚠️  Nenhum job encontrado"
