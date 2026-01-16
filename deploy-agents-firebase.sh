#!/bin/bash
set -e

# Configurar variáveis do projeto/region
PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"

echo "🚀 Iniciando deploy da função agents no Firebase..."
echo "📦 Projeto: $PROJECT_ID"
echo "🌎 Região: $REGION"
echo ""

# Deploy só da função agents
echo "1️⃣ Fazendo deploy da função agents..."
firebase deploy --only functions:agents --project "$PROJECT_ID"

echo ""
echo "2️⃣ Criando service account para o Scheduler..."
# Criar service account para o Scheduler (se não existir)
gcloud iam service-accounts create scheduler-agents \
  --display-name="Scheduler Agents" \
  --project="$PROJECT_ID" 2>/dev/null || echo "Service account já existe, continuando..."

echo ""
echo "3️⃣ Configurando permissões IAM..."
# Dar permissão de invocar functions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:scheduler-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker" \
  --condition=None

echo ""
echo "4️⃣ Configurando Cloud Scheduler (a cada 15 minutos)..."
# Criar job do Cloud Scheduler para processar a fila a cada 15 min
gcloud scheduler jobs create http agents-process-queue \
  --project="$PROJECT_ID" \
  --schedule="*/15 * * * *" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/agents?action=process-queue" \
  --http-method=POST \
  --oidc-service-account-email="scheduler-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --location="$REGION" 2>/dev/null || \
gcloud scheduler jobs update http agents-process-queue \
  --project="$PROJECT_ID" \
  --schedule="*/15 * * * *" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/agents?action=process-queue" \
  --http-method=POST \
  --oidc-service-account-email="scheduler-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --location="$REGION"

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "🔗 URLs disponíveis:"
echo "   - Web App: https://sonic-terminal-474321-s1.web.app"
echo "   - Function: https://$REGION-$PROJECT_ID.cloudfunctions.net/agents"
echo ""
echo "📝 Para testar manualmente:"
echo "   AGENTS_URL=\"https://$REGION-$PROJECT_ID.cloudfunctions.net/agents\" node scripts/test-agents-enqueue.cjs"
echo "   ACTION=dequeue AGENTS_URL=\"https://$REGION-$PROJECT_ID.cloudfunctions.net/agents\" node scripts/test-agents-enqueue.cjs"
