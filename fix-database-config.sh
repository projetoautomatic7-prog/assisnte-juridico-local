#!/bin/bash
# 🔧 Script para corrigir banco de dados PostgreSQL
# Configura DATABASE_URL correta para Neon

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"

echo "🔧 Configurando PostgreSQL (Neon) no Cloud Run..."
echo ""

# Verificar se já tem DATABASE_URL configurada
CURRENT_DB=$(gcloud run services describe assistente-juridico-backend \
  --region="$REGION" \
  --format="value(spec.template.spec.containers[0].env[?(@.name=='DATABASE_URL')].value)" \
  --project="$PROJECT_ID" 2>/dev/null || echo "")

if [ -n "$CURRENT_DB" ] && [ "$CURRENT_DB" != "postgresql://user:pass@host:5432/db" ]; then
  echo "✅ DATABASE_URL já está configurada:"
  echo "   $CURRENT_DB"
  echo ""
  echo "Deseja atualizar? (s/n)"
  read -r RESPOSTA
  if [ "$RESPOSTA" != "s" ] && [ "$RESPOSTA" != "S" ]; then
    echo "⏭️  Mantendo configuração atual"
    exit 0
  fi
fi

echo ""
echo "📋 Você precisará da URL de conexão do Neon PostgreSQL"
echo ""
echo "🔍 Onde encontrar:"
echo "   1. Acesse: https://console.neon.tech"
echo "   2. Selecione seu projeto"
echo "   3. Clique em 'Connection Details'"
echo "   4. Copie a 'Connection string' (postgresql://...)"
echo ""
echo "📝 Formato esperado:"
echo "   postgresql://usuario:senha@host.neon.tech:5432/nomedb?sslmode=require"
echo ""

# Opção 1: Usar Secret Manager (recomendado)
echo "Escolha o método de configuração:"
echo "  1) Secret Manager (recomendado - mais seguro)"
echo "  2) Variável de ambiente (menos seguro)"
echo ""
read -p "Digite 1 ou 2: " METODO

if [ "$METODO" = "1" ]; then
  echo ""
  echo "🔐 Usando Secret Manager..."
  echo ""
  
  # Criar/atualizar secret
  echo "Digite a DATABASE_URL (será ocultada):"
  read -s DATABASE_URL
  
  # Verificar se secret existe
  if gcloud secrets describe database-url --project="$PROJECT_ID" &>/dev/null; then
    echo ""
    echo "Atualizando secret existente..."
    echo -n "$DATABASE_URL" | gcloud secrets versions add database-url \
      --data-file=- \
      --project="$PROJECT_ID"
  else
    echo ""
    echo "Criando novo secret..."
    echo -n "$DATABASE_URL" | gcloud secrets create database-url \
      --data-file=- \
      --replication-policy="automatic" \
      --project="$PROJECT_ID"
    
    # Dar permissão
    gcloud secrets add-iam-policy-binding database-url \
      --member="serviceAccount:598169933649-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT_ID"
  fi
  
  # Atualizar serviço
  echo ""
  echo "📦 Atualizando serviço..."
  gcloud run services update assistente-juridico-backend \
    --region="$REGION" \
    --update-secrets="DATABASE_URL=database-url:latest" \
    --project="$PROJECT_ID"
  
  echo ""
  echo "✅ DATABASE_URL configurada via Secret Manager!"
  
else
  echo ""
  echo "⚠️  Usando variável de ambiente (menos seguro)..."
  echo ""
  echo "Digite a DATABASE_URL:"
  read -s DATABASE_URL
  
  # Atualizar serviço
  echo ""
  echo "📦 Atualizando serviço..."
  gcloud run services update assistente-juridico-backend \
    --region="$REGION" \
    --set-env-vars="DATABASE_URL=$DATABASE_URL" \
    --project="$PROJECT_ID"
  
  echo ""
  echo "✅ DATABASE_URL configurada!"
  echo "⚠️  Recomendação: Migre para Secret Manager depois com ./fix-secrets-manager.sh"
fi

echo ""
echo "🧪 Testando conexão com banco..."
echo ""

# Testar endpoint de health (que inicializa o DB)
sleep 5
SERVICE_URL="https://assistente-juridico-backend-598169933649.southamerica-east1.run.app"

HEALTH_CHECK=$(curl -s "$SERVICE_URL/api/health" | jq -r '.database // "error"' 2>/dev/null || echo "error")

if [ "$HEALTH_CHECK" = "connected" ] || [ "$HEALTH_CHECK" = "ok" ]; then
  echo "✅ Banco de dados conectado com sucesso!"
elif [ "$HEALTH_CHECK" = "error" ]; then
  echo "⚠️  Não foi possível verificar conexão (endpoint pode estar protegido)"
  echo "   Verifique manualmente em: $SERVICE_URL/api/health"
else
  echo "❌ Erro ao conectar com banco de dados"
  echo "   Status: $HEALTH_CHECK"
  echo ""
  echo "🔍 Verificar logs:"
  echo "   gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=assistente-juridico-backend' --limit 20 --project=$PROJECT_ID"
fi

echo ""
echo "📋 Próximos passos:"
echo "   1. Verificar logs: gcloud logging read 'resource.type=cloud_run_revision' --limit 50 --project=$PROJECT_ID"
echo "   2. Testar aplicação: https://sonic-terminal-474321-s1.web.app"
echo "   3. Se houver erro, verifique a DATABASE_URL no Neon"
echo ""
