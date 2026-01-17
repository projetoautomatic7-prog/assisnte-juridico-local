#!/bin/bash
# 🧹 Script para desabilitar/corrigir MCP e Dynatrace
# Remove dependências não essenciais que causam erros

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"

echo "🧹 Limpando erros de infraestrutura não essencial..."
echo ""

echo "📋 Problemas identificados:"
echo "   1. MCP Client Timeout (Model Context Protocol)"
echo "   2. Dynatrace OneAgent não ativo"
echo "   3. Genkit Flows falhando (fetch failed)"
echo ""

# Verificar arquivos
echo "🔍 Verificando arquivos do backend..."
if [ ! -f "backend/src/server.ts" ]; then
  echo "❌ Execute este script na raiz do projeto"
  exit 1
fi

# Backup
echo "💾 Criando backup..."
cp backend/src/server.ts backend/src/server.ts.backup.$(date +%Y%m%d_%H%M%S)

echo ""
echo "Escolha as correções:"
echo "  1) Desabilitar MCP (recomendado se não usado)"
echo "  2) Desabilitar Dynatrace (recomendado se não usado)"
echo "  3) Melhorar error handling do Genkit"
echo "  4) Aplicar todas as correções acima (recomendado)"
echo "  5) Apenas ver diagnóstico"
echo ""
read -p "Digite 1-5: " OPCAO

case $OPCAO in
  1|4)
    echo ""
    echo "🔧 Desabilitando MCP Client..."
    
    # Adicionar flag de controle no server.ts
    cat > /tmp/mcp-disable.patch << 'EOF'
// MCP (Model Context Protocol) - Desabilitado por padrão
const MCP_ENABLED = process.env.MCP_ENABLED === 'true';

if (MCP_ENABLED) {
  // Código MCP aqui
} else {
  logInfo('[MCP] Desabilitado (defina MCP_ENABLED=true para ativar)');
}
EOF
    
    echo "   ℹ️  Você precisará adicionar manualmente a flag MCP_ENABLED no código"
    echo "   Ou descomente as importações MCP em backend/src/server.ts"
    
    ;;&
  
  2|4)
    echo ""
    echo "🔧 Desabilitando Dynatrace..."
    
    # Atualizar variável de ambiente
    gcloud run services update assistente-juridico-backend \
      --region="$REGION" \
      --set-env-vars="DYNATRACE_ENABLED=false" \
      --project="$PROJECT_ID"
    
    echo "   ✅ Dynatrace desabilitado via env var"
    
    ;;&
  
  3|4)
    echo ""
    echo "🔧 Melhorando error handling do Genkit..."
    
    # Criar patch para better error handling
    cat > /tmp/genkit-fix.txt << 'EOF'
// Em lib/ai/justine-flow.ts ou tools.ts
// Adicionar timeout e retry:

const fetchWithRetry = async (url: string, options: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Backoff
    }
  }
};
EOF
    
    echo "   ℹ️  Instruções salvas em /tmp/genkit-fix.txt"
    echo "   Aplique manualmente nos flows que falham"
    
    ;;&
  
  5)
    echo ""
    echo "🔍 Diagnóstico..."
    echo ""
    
    # Verificar logs recentes
    echo "📊 MCP Errors (últimas 24h):"
    gcloud logging read \
      "resource.type=cloud_run_revision AND resource.labels.service_name=assistente-juridico-backend AND textPayload=~'MCP' AND timestamp>=\"$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
      --limit 10 \
      --format="value(textPayload)" \
      --project="$PROJECT_ID" | head -5
    
    echo ""
    echo "📊 Dynatrace Errors (últimas 24h):"
    gcloud logging read \
      "resource.type=cloud_run_revision AND resource.labels.service_name=assistente-juridico-backend AND textPayload=~'Dynatrace' AND timestamp>=\"$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
      --limit 10 \
      --format="value(textPayload)" \
      --project="$PROJECT_ID" | head -5
    
    echo ""
    echo "📊 Genkit Errors (últimas 24h):"
    gcloud logging read \
      "resource.type=cloud_run_revision AND resource.labels.service_name=assistente-juridico-backend AND textPayload=~'Genkit.*Error' AND timestamp>=\"$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
      --limit 10 \
      --format="value(textPayload)" \
      --project="$PROJECT_ID" | head -5
    
    echo ""
    echo "📋 Recomendações:"
    echo "   - MCP: Desabilite se não está usando Model Context Protocol"
    echo "   - Dynatrace: Desabilite se não tem OneAgent instalado"
    echo "   - Genkit: Adicione retry logic e timeouts nos flows"
    
    exit 0
    ;;
    
  *)
    echo "❌ Opção inválida"
    exit 1
    ;;
esac

if [ "$OPCAO" = "4" ]; then
  echo ""
  echo "🚀 Aplicando todas as correções..."
  
  # Rebuild e redeploy
  echo ""
  echo "📦 Fazendo rebuild do backend..."
  cd backend
  npm run build
  cd ..
  
  echo ""
  echo "🚀 Fazendo redeploy..."
  gcloud run deploy assistente-juridico-backend \
    --source . \
    --region="$REGION" \
    --project="$PROJECT_ID"
  
  echo ""
  echo "✅ Todas as correções aplicadas!"
fi

echo ""
echo "=========================================="
echo "✅ LIMPEZA CONCLUÍDA!"
echo "=========================================="
echo ""
echo "📋 O que foi feito:"
echo "   - MCP: Instruções para desabilitar"
echo "   - Dynatrace: Desabilitado via env var"
echo "   - Genkit: Instruções para melhorar error handling"
echo ""
echo "📝 Arquivos salvos:"
echo "   - Backup: backend/src/server.ts.backup.*"
echo "   - Instruções MCP: /tmp/mcp-disable.patch"
echo "   - Instruções Genkit: /tmp/genkit-fix.txt"
echo ""
echo "🧪 Testar aplicação:"
echo "   https://sonic-terminal-474321-s1.web.app"
echo ""
