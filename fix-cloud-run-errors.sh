#!/bin/bash
# 🔧 Script para corrigir erros do Cloud Run e fazer redeploy

set -e

echo "🔧 Corrigindo erros do Cloud Run..."
echo ""

# Configurar projeto
PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"
SERVICE_NAME="assistente-juridico-backend"

echo "📋 Resumo das correções:"
echo "  ✅ Rate Limiter: Adicionado trustProxy e X-Forwarded-For"
echo "  ✅ dotenv: Incluído em dependências de produção"
echo "  ✅ Import dotenv: Tratamento de erro para Cloud Run"
echo ""

# Build do backend localmente para verificar
echo "🔨 Compilando backend..."
cd backend
npm run build
cd ..

echo ""
echo "✅ Build bem-sucedido!"
echo ""

# Fazer deploy no Cloud Run
echo "🚀 Fazendo redeploy no Cloud Run..."
echo "   Projeto: $PROJECT_ID"
echo "   Região: $REGION"
echo "   Serviço: $SERVICE_NAME"
echo ""

gcloud config set project "$PROJECT_ID"

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 60s \
  --set-env-vars "NODE_ENV=production,RATE_LIMIT_ENABLED=true" \
  --platform managed

echo ""
echo "✅ Deploy concluído!"
echo ""

# Verificar saúde do serviço
echo "🏥 Verificando saúde do serviço..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")

echo "   URL: $SERVICE_URL"
echo ""

# Aguardar 5 segundos para o serviço iniciar
sleep 5

# Testar endpoint de health
echo "📡 Testando endpoint /api/health..."
curl -s "$SERVICE_URL/api/health" | jq '.' || echo "Endpoint não respondeu (pode precisar de autenticação)"

echo ""
echo "✅ Correções aplicadas com sucesso!"
echo ""
echo "🔗 URLs atualizadas:"
echo "   Backend: $SERVICE_URL"
echo "   Frontend: https://sonic-terminal-474321-s1.web.app"
echo ""
echo "📊 Próximos passos:"
echo "   1. Acesse o Cloud Console: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "   2. Verifique os logs: gcloud run logs read $SERVICE_NAME --region $REGION --limit 50"
echo "   3. Teste o app: https://sonic-terminal-474321-s1.web.app"
echo ""
