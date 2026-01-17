# 🔍 Análise Cloud Assist - Serviço Agents (Erro 400)

**Data:** 17/01/2026 às 14:00 UTC  
**Serviço:** agents (Cloud Run / Firebase Functions Gen2)  
**Região:** us-central1

---

## 🚨 Problema Identificado pelo Cloud Assist

### Erro Principal
```
HTTP 400 Bad Request
User-Agent: Google-Cloud-Scheduler
Request Method: POST
URL: https://agents-tpicng6fpq-uc.a.run.app?action=process-queue
```

**Causa Raiz:**
A Cloud Function `agents` está rejeitando requisições do Cloud Scheduler porque:
1. A função espera um formato específico (possivelmente Eventarc)
2. O Scheduler envia `POST` com query param `?action=process-queue`
3. Não há handler no código para processar esse tipo de requisição

---

## 📊 Métricas Anômalas (Últimas 34 horas)

| Métrica | Aumento | Severidade |
|---------|---------|------------|
| **Latência (99p)** | +3280.60% | 🔴 CRÍTICO |
| **CPU (99p)** | +158.25% | 🔴 CRÍTICO |
| **Memória (99p)** | +33.14% | 🟡 ALTO |
| **Request Count** | +41.61% | 🟡 ALTO |
| **Logs de erro** | +742 ocorrências | 🔴 CRÍTICO |

**Período:** 16/01/2026 03:30 UTC → 17/01/2026 13:30 UTC

---

## 🔍 Análise Técnica

### 1. Configuração da Função

```yaml
Nome: agents
Tipo: HTTP Trigger (Firebase Functions Gen2)
Região: us-central1
URL: https://agents-tpicng6fpq-uc.a.run.app
Runtime: nodejs20
Memória: 256Mi
CPU: 1 core
Timeout: 60s
Trigger: cloudfunctions.googleapis.com/trigger-type: HTTP_TRIGGER
```

### 2. Requisição do Cloud Scheduler

```http
POST https://agents-tpicng6fpq-uc.a.run.app?action=process-queue HTTP/1.1
User-Agent: Google-Cloud-Scheduler
Content-Type: application/json
```

**Resposta:**
```
HTTP/1.1 400 Bad Request
```

### 3. Código Atual da Função

**Problema identificado:**
O código em `functions/src/agents.ts` não tem handler para query param `action=process-queue`.

```typescript
// Código atual (linha 101+)
export const agents = onRequest(async (req, res) => {
  try {
    withCors(res);
    
    const method = req.method?.toUpperCase();
    
    if (method === "OPTIONS") {
      return res.status(204).send("");
    }
    
    if (method === "GET") {
      // Handler para GET
      // ...
    }
    
    if (method === "POST") {
      // Handler para POST - MAS não verifica query params!
      const { taskId, agentId, type, priority, data } = req.body;
      // ...
    }
    
    // ❌ Sem handler para Scheduler - retorna erro implícito
  } catch (error) {
    // ...
  }
});
```

---

## ✅ Soluções Propostas

### Solução 1: Corrigir Código da Função (RECOMENDADO)

**Adicionar handler para Cloud Scheduler:**

```typescript
export const agents = onRequest(
  { 
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60 
  },
  async (req, res) => {
    try {
      // ✅ NOVO: Handler para Cloud Scheduler
      const userAgent = req.headers['user-agent'] || '';
      const isScheduler = userAgent.includes('Google-Cloud-Scheduler');
      const action = req.query.action as string;

      if (isScheduler && action === 'process-queue') {
        console.log('[agents] Processing queue via Cloud Scheduler');
        
        // Processar fila de agentes
        const task = await dequeueTask();
        if (task) {
          // Executar tarefa
          await processAgentTask(task);
          await completeTask(task.id, { result: { processed: true } });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Queue processed successfully',
          timestamp: new Date().toISOString()
        });
      }

      // Código existente (GET, POST, etc.)
      withCors(res);
      
      const method = req.method?.toUpperCase();
      
      if (method === "OPTIONS") {
        return res.status(204).send("");
      }
      
      // ... resto do código
    } catch (error) {
      console.error('[agents] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Função auxiliar para processar tarefas
async function processAgentTask(task: AgentTask) {
  console.log(`[agents] Processing task ${task.id} of type ${task.type}`);
  // Implementar lógica de processamento aqui
}
```

**Como aplicar:**
```bash
# 1. Editar arquivo
code functions/src/agents.ts

# 2. Adicionar código acima

# 3. Build e deploy
cd functions
npm run build
firebase deploy --only functions:agents

# 4. Testar
gcloud scheduler jobs run <JOB_NAME> --location=us-central1 --project=sonic-terminal-474321-s1
```

---

### Solução 2: Reconfigurar Cloud Scheduler

**Opção A: Enviar payload no body (não query param)**

```bash
# Reconfigurar job existente
gcloud scheduler jobs update http <JOB_NAME> \
  --location=us-central1 \
  --uri="https://agents-tpicng6fpq-uc.a.run.app" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"action":"process-queue"}' \
  --project=sonic-terminal-474321-s1
```

**Opção B: Criar novo job (se não existir)**

```bash
gcloud scheduler jobs create http process-agent-queue \
  --location=us-central1 \
  --schedule="*/15 * * * *" \
  --uri="https://agents-tpicng6fpq-uc.a.run.app" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"action":"process-queue"}' \
  --project=sonic-terminal-474321-s1
```

---

### Solução 3: Desabilitar Cloud Scheduler (Temporário)

**Se o processamento de fila não for necessário:**

```bash
# Listar jobs
gcloud scheduler jobs list --location=us-central1 --project=sonic-terminal-474321-s1

# Pausar job específico
gcloud scheduler jobs pause <JOB_NAME> --location=us-central1 --project=sonic-terminal-474321-s1

# Retomar depois
gcloud scheduler jobs resume <JOB_NAME> --location=us-central1 --project=sonic-terminal-474321-s1
```

---

## 🚀 Script Automatizado

Criei um script para facilitar a correção:

```bash
./fix-cloud-scheduler-agents.sh
```

**Opções disponíveis:**
1. Corrigir código da função (gera patch)
2. Reconfigurar Cloud Scheduler
3. Desabilitar Cloud Scheduler
4. Ver logs detalhados (diagnóstico)
5. Aplicar correção completa (recomendado)

---

## 🧪 Como Testar Após Correção

### 1. Testar função diretamente

```bash
curl -X POST "https://agents-tpicng6fpq-uc.a.run.app?action=process-queue" \
  -H "User-Agent: Google-Cloud-Scheduler" \
  -H "Content-Type: application/json"
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Queue processed successfully",
  "timestamp": "2026-01-17T14:00:00.000Z"
}
```

### 2. Verificar logs

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=agents AND textPayload=~'Processing queue'" \
  --limit 10 \
  --project=sonic-terminal-474321-s1
```

### 3. Testar via Cloud Scheduler

```bash
# Executar job manualmente
gcloud scheduler jobs run <JOB_NAME> --location=us-central1 --project=sonic-terminal-474321-s1

# Verificar resultado
gcloud scheduler jobs describe <JOB_NAME> --location=us-central1 --project=sonic-terminal-474321-s1
```

---

## 📊 Impacto Esperado Após Correção

| Métrica | Antes | Depois (Esperado) |
|---------|-------|-------------------|
| Erro 400 | 742 ocorrências | 0 |
| Latência (99p) | +3280% | Normal |
| CPU (99p) | +158% | Normal |
| Memória (99p) | +33% | Normal |
| Logs de erro | HIGH | ZERO |

---

## 🔗 Links Úteis

### Google Cloud Console
- **Cloud Assist Investigation:** [Ver investigação completa](https://console.cloud.google.com/run/detail/us-central1/agents?project=sonic-terminal-474321-s1)
- **Gemini Code Editor:** [Ver sugestão de código](https://console.cloud.google.com/run/detail/us-central1/agents/source?project=sonic-terminal-474321-s1)
- **Cloud Scheduler:** [Gerenciar jobs](https://console.cloud.google.com/cloudscheduler?project=sonic-terminal-474321-s1)
- **Logs Explorer:** [Ver logs](https://console.cloud.google.com/logs/query?project=sonic-terminal-474321-s1)

### Documentação Google Cloud
- [Manage cron jobs - Cloud Scheduler](https://cloud.google.com/scheduler/docs/creating)
- [HTTP Functions - Firebase](https://firebase.google.com/docs/functions/http-events)
- [Cloud Run Troubleshooting](https://cloud.google.com/run/docs/troubleshooting)

---

## ✅ Checklist de Correção

### Antes de Aplicar
- [ ] Backup do código: `cp functions/src/agents.ts functions/src/agents.ts.backup`
- [ ] Verificar jobs ativos: `gcloud scheduler jobs list`
- [ ] Revisar logs atuais

### Durante a Correção
- [ ] Adicionar handler para Cloud Scheduler no código
- [ ] Build sem erros: `npm run build`
- [ ] Deploy bem-sucedido: `firebase deploy --only functions:agents`

### Após a Correção
- [ ] Testar função diretamente com curl
- [ ] Executar job do Scheduler manualmente
- [ ] Verificar logs sem erro 400
- [ ] Monitorar métricas por 24h

---

## 🎯 Recomendação Final

**Ação recomendada:** Solução 1 (Corrigir código da função)

**Motivos:**
1. ✅ Solução definitiva - não volta a quebrar
2. ✅ Mantém funcionalidade do Scheduler
3. ✅ Melhor práticas de código
4. ✅ Fácil de testar e validar

**Tempo estimado:** 15 minutos

**Comando para começar:**
```bash
./fix-cloud-scheduler-agents.sh
# Escolha opção 5 (Correção completa)
```

---

**🔍 Análise baseada em investigação automática do Google Cloud Assist**
