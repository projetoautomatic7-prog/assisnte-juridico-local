#!/bin/bash
# 🔐 Script para migrar chaves API para Google Secret Manager
# Corrige problema de exposição de secrets no Cloud Run

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"

echo "🔐 Migrando Secrets para Secret Manager..."
echo ""
echo "⚠️  IMPORTANTE: Você precisará fornecer os valores das chaves quando solicitado"
echo ""

# Habilitar API do Secret Manager
echo "📦 1. Habilitando Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"

echo ""
echo "🔑 2. Criando secrets (você será solicitado a inserir os valores)..."
echo ""

# Função para criar secret
create_secret() {
  local SECRET_NAME=$1
  local DESCRIPTION=$2
  
  echo "---"
  echo "📝 Criando secret: $SECRET_NAME"
  echo "   Descrição: $DESCRIPTION"
  echo ""
  
  # Verificar se já existe
  if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "   ⚠️  Secret já existe. Deseja atualizar? (s/n)"
    read -r RESPOSTA
    if [ "$RESPOSTA" = "s" ] || [ "$RESPOSTA" = "S" ]; then
      echo "   Digite o novo valor (será ocultado):"
      read -s SECRET_VALUE
      echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
        --data-file=- \
        --project="$PROJECT_ID"
      echo "   ✅ Secret atualizado"
    else
      echo "   ⏭️  Pulando..."
    fi
  else
    echo "   Digite o valor (será ocultado):"
    read -s SECRET_VALUE
    echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="$PROJECT_ID"
    echo "   ✅ Secret criado"
  fi
  
  # Dar permissão ao service account do Cloud Run
  gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --member="serviceAccount:598169933649-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet
  
  echo ""
}

# Criar todos os secrets necessários
create_secret "gemini-api-key" "Chave API do Google Gemini (AI)"
create_secret "database-url" "URL de conexão PostgreSQL (Neon)"
create_secret "upstash-redis-url" "URL REST do Upstash Redis"
create_secret "upstash-redis-token" "Token do Upstash Redis"
create_secret "qdrant-url" "URL do cluster Qdrant Cloud"
create_secret "qdrant-api-key" "API Key do Qdrant"

echo ""
echo "✅ Secrets criados com sucesso!"
echo ""

# Atualizar assistente-juridico-backend
echo "🚀 3. Atualizando serviço 'assistente-juridico-backend'..."
gcloud run services update assistente-juridico-backend \
  --region="$REGION" \
  --update-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --update-secrets="DATABASE_URL=database-url:latest" \
  --update-secrets="UPSTASH_REDIS_REST_URL=upstash-redis-url:latest" \
  --update-secrets="UPSTASH_REDIS_REST_TOKEN=upstash-redis-token:latest" \
  --update-secrets="QDRANT_URL=qdrant-url:latest" \
  --update-secrets="QDRANT_API_KEY=qdrant-api-key:latest" \
  --project="$PROJECT_ID"

echo ""
echo "✅ Serviço atualizado!"
echo ""

# Atualizar serviço agents
echo "🤖 4. Atualizando serviço 'agents'..."
gcloud run services update agents \
  --region="us-central1" \
  --update-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --update-secrets="GOOGLE_API_KEY=gemini-api-key:latest" \
  --update-secrets="DATABASE_URL=database-url:latest" \
  --update-secrets="UPSTASH_REDIS_REST_URL=upstash-redis-url:latest" \
  --update-secrets="UPSTASH_REDIS_REST_TOKEN=upstash-redis-token:latest" \
  --update-secrets="QDRANT_URL=qdrant-url:latest" \
  --update-secrets="QDRANT_API_KEY=qdrant-api-key:latest" \
  --project="$PROJECT_ID"

echo ""
echo "✅ Todos os serviços atualizados!"
echo ""

# Remover variáveis de ambiente antigas (opcional)
echo "🧹 5. Deseja remover as variáveis de ambiente antigas (secrets ficarão apenas no Secret Manager)? (s/n)"
read -r LIMPAR

if [ "$LIMPAR" = "s" ] || [ "$LIMPAR" = "S" ]; then
  echo "   🧹 Removendo variáveis antigas do backend..."
  gcloud run services update assistente-juridico-backend \
    --region="$REGION" \
    --remove-env-vars="GEMINI_API_KEY" \
    --project="$PROJECT_ID" \
    --quiet || true
  
  echo "   🧹 Removendo variáveis antigas do agents..."
  gcloud run services update agents \
    --region="us-central1" \
    --remove-env-vars="GEMINI_API_KEY,GOOGLE_API_KEY" \
    --project="$PROJECT_ID" \
    --quiet || true
  
  echo "   ✅ Variáveis antigas removidas"
fi

echo ""
echo "=========================================="
echo "✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================="
echo ""
echo "📋 Próximos passos:"
echo "   1. Acesse: https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID"
echo "   2. Verifique se todos os secrets estão criados"
echo "   3. Teste os serviços:"
echo "      - Backend: https://assistente-juridico-backend-598169933649.southamerica-east1.run.app/api/health"
echo "      - Frontend: https://sonic-terminal-474321-s1.web.app"
echo ""
echo "🔐 IMPORTANTE - Rotacionar chaves comprometidas:"
echo "   1. Acesse: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "   2. Revogue a chave antiga: AIzaSyCuSxHIBzV17ceCvexm8iddKXgBpt6PVU4"
echo "   3. Gere uma nova chave"
echo "   4. Execute: ./fix-secrets-rotate-keys.sh"
echo ""
