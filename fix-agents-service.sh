#!/bin/bash
# 🤖 Script para corrigir serviço 'agents' NOT_FOUND
# Migra para região Brasil e corrige configurações

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION_OLD="us-central1"
REGION_NEW="southamerica-east1"

echo "🤖 Corrigindo serviço 'agents'..."
echo ""

echo "📊 Análise do problema:"
echo "   ❌ Região atual: us-central1 (EUA) - Latência ~150ms"
echo "   ❌ Variáveis localhost inválidas"
echo "   ❌ gRPC NOT_FOUND errors"
echo ""
echo "✅ Solução:"
echo "   1. Manter serviço atual (Firebase Functions)"
echo "   2. Corrigir variáveis de ambiente"
echo "   3. Opcional: Migrar para southamerica-east1"
echo ""

# Verificar serviço atual
echo "🔍 Verificando serviço atual..."
gcloud run services describe agents \
  --region="$REGION_OLD" \
  --format="value(status.url)" \
  --project="$PROJECT_ID"

echo ""
echo "Escolha a ação:"
echo "  1) Corrigir apenas variáveis de ambiente (rápido)"
echo "  2) Migrar para região Brasil + corrigir variáveis (recomendado)"
echo "  3) Analisar logs detalhados (diagnóstico)"
echo "  4) Cancelar"
echo ""
read -p "Digite 1, 2, 3 ou 4: " OPCAO

case $OPCAO in
  1)
    echo ""
    echo "🔧 Corrigindo variáveis de ambiente..."
    echo ""
    
    # Remover variáveis localhost inválidas
    gcloud run services update agents \
      --region="$REGION_OLD" \
      --remove-env-vars="REDIS_URL,QDRANT_URL" \
      --set-env-vars="DATABASE_URL=" \
      --project="$PROJECT_ID"
    
    echo ""
    echo "✅ Variáveis corrigidas!"
    echo "   ℹ️  Se precisar de Redis/Qdrant, configure via Secret Manager"
    ;;
    
  2)
    echo ""
    echo "🚀 Migrando para região Brasil..."
    echo ""
    
    # Deploy novo serviço em southamerica-east1
    echo "📦 1. Fazendo deploy em southamerica-east1..."
    
    # Verificar se functions/src/agents.ts existe
    if [ ! -f "functions/src/agents.ts" ]; then
      echo "❌ Arquivo functions/src/agents.ts não encontrado"
      echo "   Execute na raiz do projeto"
      exit 1
    fi
    
    # Build das functions
    cd functions
    npm install --legacy-peer-deps
    npm run build
    cd ..
    
    # Deploy via Cloud Run (não Firebase Functions)
    gcloud run deploy agents-br \
      --source ./functions \
      --region="$REGION_NEW" \
      --platform managed \
      --allow-unauthenticated \
      --memory 512Mi \
      --cpu 1 \
      --timeout 60s \
      --min-instances 0 \
      --max-instances 10 \
      --set-env-vars="GCLOUD_PROJECT=$PROJECT_ID,NODE_ENV=production" \
      --project="$PROJECT_ID"
    
    echo ""
    echo "✅ Serviço 'agents-br' criado em southamerica-east1!"
    echo ""
    echo "🔄 Próximos passos:"
    echo "   1. Testar novo serviço: https://agents-br-598169933649.southamerica-east1.run.app"
    echo "   2. Atualizar frontend para usar nova URL"
    echo "   3. Após validar, deletar serviço antigo:"
    echo "      gcloud run services delete agents --region=$REGION_OLD --project=$PROJECT_ID"
    ;;
    
  3)
    echo ""
    echo "🔍 Analisando logs detalhados..."
    echo ""
    
    # Buscar erros específicos
    echo "📊 Últimos erros (últimas 2 horas):"
    gcloud logging read \
      "resource.type=cloud_run_revision AND resource.labels.service_name=agents AND severity>=ERROR AND timestamp>=\"$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
      --limit 50 \
      --format="table(timestamp,severity,textPayload)" \
      --project="$PROJECT_ID"
    
    echo ""
    echo "⚠️  Últimos warnings (últimas 1 hora):"
    gcloud logging read \
      "resource.type=cloud_run_revision AND resource.labels.service_name=agents AND severity=WARNING AND timestamp>=\"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
      --limit 20 \
      --format="table(timestamp,textPayload)" \
      --project="$PROJECT_ID"
    
    echo ""
    echo "📋 Análise:"
    echo "   Execute novamente este script e escolha opção 1 ou 2"
    ;;
    
  4)
    echo "⏭️  Operação cancelada"
    exit 0
    ;;
    
  *)
    echo "❌ Opção inválida"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "✅ CORREÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
echo "📋 URLs dos serviços:"
echo "   - Agents (EUA): https://agents-598169933649.us-central1.run.app"
echo "   - Backend (BR): https://assistente-juridico-backend-598169933649.southamerica-east1.run.app"
echo "   - Frontend: https://sonic-terminal-474321-s1.web.app"
echo ""
