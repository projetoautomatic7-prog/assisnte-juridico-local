#!/bin/bash
# 🔧 Script para corrigir problema Cloud Scheduler + Agents
# Baseado na análise do Google Cloud Assist

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="us-central1"
FUNCTION_NAME="agents"

echo "🔍 Análise do Cloud Assist - Problema Identificado"
echo "=================================================="
echo ""
echo "❌ Problema: Cloud Function 'agents' retorna 400 Bad Request"
echo ""
echo "📊 Métricas Anômalas (últimas 34 horas):"
echo "   - Latência (99p): +3280% 🔴"
echo "   - CPU (99p): +158% 🔴"
echo "   - Memória (99p): +33% 🟡"
echo "   - Logs de erro: +742 ocorrências 🔴"
echo ""
echo "🔍 Causa Raiz:"
echo "   O Cloud Scheduler envia requisição HTTP POST com ?action=process-queue"
echo "   mas a função espera um formato diferente (possivelmente Eventarc)"
echo ""

# Verificar configuração atual
echo "📋 1. Verificando configuração atual..."
echo ""

# Listar jobs do Cloud Scheduler
echo "🕐 Jobs do Cloud Scheduler:"
gcloud scheduler jobs list --location="$REGION" --project="$PROJECT_ID" 2>&1 || {
  echo "   ⚠️  Nenhum job encontrado em $REGION"
  echo "   Tentando todas as regiões..."
  gcloud scheduler jobs list --project="$PROJECT_ID" 2>&1 || echo "   ❌ Nenhum job encontrado"
}

echo ""

# Descrever função
echo "🤖 Configuração da Cloud Function 'agents':"
gcloud run services describe "$FUNCTION_NAME" --region="$REGION" --project="$PROJECT_ID" --format="table(metadata.name,status.url,spec.template.spec.containers[0].env[?(@.name=='FUNCTION_TARGET')].value)" 2>&1 | head -10

echo ""
echo "=========================================="
echo "💡 SOLUÇÕES DISPONÍVEIS"
echo "=========================================="
echo ""
echo "Escolha a correção:"
echo "  1) Corrigir código da função para aceitar requisição do Scheduler"
echo "  2) Reconfigurar Cloud Scheduler para formato correto"
echo "  3) Desabilitar Cloud Scheduler (se não necessário)"
echo "  4) Ver logs detalhados (diagnóstico)"
echo "  5) Aplicar correção completa (recomendado)"
echo ""
read -p "Digite 1-5: " OPCAO

case $OPCAO in
  1)
    echo ""
    echo "🔧 Correção 1: Atualizar código da função"
    echo ""
    echo "📝 A função precisa aceitar requisições HTTP com query param ?action=process-queue"
    echo ""
    
    # Backup do arquivo
    if [ -f "functions/src/agents.ts" ]; then
      cp functions/src/agents.ts functions/src/agents.ts.backup.$(date +%Y%m%d_%H%M%S)
      echo "   ✅ Backup criado: functions/src/agents.ts.backup.*"
    fi
    
    echo ""
    echo "📋 Código sugerido para functions/src/agents.ts:"
    cat << 'EOF'

// Adicionar handler para Cloud Scheduler
export const agents = onRequest(
  { 
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60 
  },
  async (req, res) => {
    try {
      // Verificar se é requisição do Cloud Scheduler
      const isScheduler = req.headers['user-agent']?.includes('Google-Cloud-Scheduler');
      const action = req.query.action as string;

      if (isScheduler && action === 'process-queue') {
        // Processar fila de agentes
        await processAgentQueue();
        return res.status(200).json({ 
          success: true, 
          message: 'Queue processed successfully' 
        });
      }

      // Handler HTTP normal
      withCors(res);
      
      const method = req.method?.toUpperCase();
      
      if (method === "OPTIONS") {
        return res.status(204).send("");
      }
      
      if (method === "GET") {
        // ... resto do código GET
      }
      
      if (method === "POST") {
        // ... resto do código POST
      }
      
      res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
      console.error('[agents] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

async function processAgentQueue() {
  // Lógica para processar fila
  console.log('[agents] Processing queue via Cloud Scheduler');
  // Adicione aqui a lógica de processamento
}
EOF
    
    echo ""
    echo "📝 Instruções:"
    echo "   1. Edite functions/src/agents.ts"
    echo "   2. Adicione o código sugerido acima"
    echo "   3. Execute: cd functions && npm run build"
    echo "   4. Execute: firebase deploy --only functions:agents"
    ;;
    
  2)
    echo ""
    echo "🔧 Correção 2: Reconfigurar Cloud Scheduler"
    echo ""
    
    # Verificar se existe job
    JOBS=$(gcloud scheduler jobs list --location="$REGION" --project="$PROJECT_ID" --format="value(name)" 2>/dev/null || echo "")
    
    if [ -z "$JOBS" ]; then
      echo "❌ Nenhum job encontrado. Deseja criar um novo?"
      echo ""
      read -p "Digite 's' para criar ou 'n' para cancelar: " CREATE
      
      if [ "$CREATE" = "s" ] || [ "$CREATE" = "S" ]; then
        echo ""
        echo "📝 Criando job do Cloud Scheduler..."
        
        FUNCTION_URL=$(gcloud run services describe "$FUNCTION_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)" 2>&1)
        
        gcloud scheduler jobs create http process-agent-queue \
          --location="$REGION" \
          --schedule="*/15 * * * *" \
          --uri="$FUNCTION_URL" \
          --http-method=POST \
          --headers="Content-Type=application/json" \
          --message-body='{"action":"process-queue"}' \
          --project="$PROJECT_ID"
        
        echo ""
        echo "✅ Job criado: process-agent-queue"
        echo "   Executa a cada 15 minutos"
      fi
    else
      echo "📋 Jobs existentes:"
      echo "$JOBS"
      echo ""
      read -p "Digite o nome do job para reconfigurar: " JOB_NAME
      
      if [ -n "$JOB_NAME" ]; then
        echo ""
        echo "🔧 Reconfigurando job $JOB_NAME..."
        
        FUNCTION_URL=$(gcloud run services describe "$FUNCTION_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)" 2>&1)
        
        gcloud scheduler jobs update http "$JOB_NAME" \
          --location="$REGION" \
          --uri="$FUNCTION_URL" \
          --http-method=POST \
          --headers="Content-Type=application/json" \
          --message-body='{"action":"process-queue"}' \
          --project="$PROJECT_ID"
        
        echo ""
        echo "✅ Job reconfigurado!"
      fi
    fi
    ;;
    
  3)
    echo ""
    echo "🔧 Correção 3: Desabilitar Cloud Scheduler"
    echo ""
    
    JOBS=$(gcloud scheduler jobs list --location="$REGION" --project="$PROJECT_ID" --format="value(name)" 2>/dev/null || echo "")
    
    if [ -z "$JOBS" ]; then
      echo "✅ Nenhum job encontrado - já está desabilitado"
    else
      echo "📋 Jobs ativos:"
      echo "$JOBS"
      echo ""
      read -p "Digite o nome do job para pausar (ou 'all' para todos): " JOB_NAME
      
      if [ "$JOB_NAME" = "all" ]; then
        for job in $JOBS; do
          gcloud scheduler jobs pause "$job" --location="$REGION" --project="$PROJECT_ID"
          echo "   ⏸️  Job $job pausado"
        done
      elif [ -n "$JOB_NAME" ]; then
        gcloud scheduler jobs pause "$JOB_NAME" --location="$REGION" --project="$PROJECT_ID"
        echo "   ⏸️  Job $JOB_NAME pausado"
      fi
    fi
    ;;
    
  4)
    echo ""
    echo "🔍 Correção 4: Logs detalhados"
    echo ""
    
    echo "📊 Últimos erros 400 (últimas 2 horas):"
    gcloud logging read \
      "resource.type=cloud_run_revision AND resource.labels.service_name=agents AND httpRequest.status=400 AND timestamp>=\"$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
      --limit 10 \
      --format="table(timestamp,httpRequest.requestMethod,httpRequest.requestUrl,httpRequest.userAgent,httpRequest.status)" \
      --project="$PROJECT_ID"
    
    echo ""
    echo "📊 Logs de WARNING/ERROR (últimas 1 hora):"
    gcloud logging read \
      "resource.type=cloud_run_revision AND resource.labels.service_name=agents AND severity>=WARNING AND timestamp>=\"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
      --limit 20 \
      --format="value(textPayload,jsonPayload.message)" \
      --project="$PROJECT_ID" | head -30
    ;;
    
  5)
    echo ""
    echo "🚀 Correção 5: Aplicar correção completa"
    echo ""
    
    echo "Esta correção irá:"
    echo "  1. Pausar jobs do Cloud Scheduler"
    echo "  2. Criar patch de correção para a função"
    echo "  3. Fornecer instruções de deploy"
    echo ""
    read -p "Continuar? (s/n): " CONFIRMA
    
    if [ "$CONFIRMA" = "s" ] || [ "$CONFIRMA" = "S" ]; then
      # Pausar jobs
      echo ""
      echo "⏸️  Pausando jobs do Cloud Scheduler..."
      JOBS=$(gcloud scheduler jobs list --location="$REGION" --project="$PROJECT_ID" --format="value(name)" 2>/dev/null || echo "")
      if [ -n "$JOBS" ]; then
        for job in $JOBS; do
          gcloud scheduler jobs pause "$job" --location="$REGION" --project="$PROJECT_ID" 2>/dev/null && echo "   ✅ $job pausado"
        done
      fi
      
      # Criar patch
      echo ""
      echo "📝 Criando patch de correção..."
      cat > /tmp/agents-scheduler-fix.patch << 'PATCH_EOF'
// Adicionar no início da função agents em functions/src/agents.ts

export const agents = onRequest(
  { 
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60 
  },
  async (req, res) => {
    try {
      // CORREÇÃO: Handler para Cloud Scheduler
      const userAgent = req.headers['user-agent'] || '';
      const isScheduler = userAgent.includes('Google-Cloud-Scheduler');
      const action = req.query.action as string;

      if (isScheduler && action === 'process-queue') {
        console.log('[agents] Processing queue via Cloud Scheduler');
        // Processar fila de agentes aqui
        return res.status(200).json({ 
          success: true, 
          message: 'Queue processed successfully',
          timestamp: new Date().toISOString()
        });
      }

      // Rest of your existing code...
      withCors(res);
      
      // ... resto do código
    } catch (error) {
      console.error('[agents] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
PATCH_EOF
      
      echo "   ✅ Patch salvo em /tmp/agents-scheduler-fix.patch"
      
      echo ""
      echo "=========================================="
      echo "📋 PRÓXIMOS PASSOS MANUAIS"
      echo "=========================================="
      echo ""
      echo "1. Editar função:"
      echo "   code functions/src/agents.ts"
      echo "   # Aplique o patch de /tmp/agents-scheduler-fix.patch"
      echo ""
      echo "2. Build e deploy:"
      echo "   cd functions"
      echo "   npm run build"
      echo "   firebase deploy --only functions:agents"
      echo ""
      echo "3. Reativar Cloud Scheduler:"
      for job in $JOBS; do
        echo "   gcloud scheduler jobs resume $job --location=$REGION --project=$PROJECT_ID"
      done
      echo ""
      echo "4. Testar manualmente:"
      echo "   gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID"
      echo ""
    fi
    ;;
    
  *)
    echo "❌ Opção inválida"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "✅ SCRIPT CONCLUÍDO"
echo "=========================================="
echo ""
echo "📊 Resumo das métricas problemáticas:"
echo "   - Latência: 3280% acima do normal"
echo "   - CPU: 158% acima do normal"
echo "   - Memória: 33% acima do normal"
echo "   - Erros 400: 742 ocorrências"
echo ""
echo "🔗 Links úteis:"
echo "   - Cloud Assist: https://console.cloud.google.com/run/detail/$REGION/$FUNCTION_NAME?project=$PROJECT_ID"
echo "   - Gemini Code Editor: https://console.cloud.google.com/run/detail/$REGION/$FUNCTION_NAME/source?project=$PROJECT_ID"
echo "   - Cloud Scheduler: https://console.cloud.google.com/cloudscheduler?project=$PROJECT_ID"
echo ""
