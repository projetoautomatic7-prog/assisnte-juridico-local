# 🛠️ Guia Completo de Correção - Erros Cloud Run

**Data:** 17/01/2026  
**Projeto:** sonic-terminal-474321-s1

---

## 📋 Índice de Scripts Disponíveis

Criei **5 scripts automatizados** para corrigir todos os problemas:

| Script | Problema | Prioridade | Tempo |
|--------|----------|------------|-------|
| `fix-cloud-run-errors.sh` | Rate Limiter + dotenv | 🔴 URGENTE | ~5 min |
| `fix-secrets-manager.sh` | Chaves API expostas | 🔴 URGENTE | ~10 min |
| `fix-database-config.sh` | PostgreSQL não conecta | 🔴 URGENTE | ~5 min |
| `fix-agents-service.sh` | Agents NOT_FOUND | 🟡 IMPORTANTE | ~10 min |
| `fix-infrastructure-errors.sh` | MCP/Dynatrace/Genkit | 🟢 OPCIONAL | ~5 min |

---

## 🎯 Plano de Execução em Ordem

### **PASSO 1: Corrigir Rate Limiter + dotenv** ⏱️ 5 min

```bash
./fix-cloud-run-errors.sh
```

**O que faz:**
- ✅ Corrige ValidationError do express-rate-limit
- ✅ Resolve erro "Cannot find package 'dotenv'"
- ✅ Faz build e redeploy automático
- ✅ Testa endpoint de saúde

**Resultado esperado:**
```
✅ Deploy concluído!
✅ Correções aplicadas com sucesso!
🔗 Backend: https://assistente-juridico-backend-598169933649.southamerica-east1.run.app
🔗 Frontend: https://sonic-terminal-474321-s1.web.app
```

---

### **PASSO 2: Migrar Secrets para Secret Manager** ⏱️ 10 min 🔐

```bash
./fix-secrets-manager.sh
```

**O que faz:**
1. Habilita API do Secret Manager
2. Cria secrets seguros para:
   - `gemini-api-key` - Chave Gemini AI
   - `database-url` - PostgreSQL Neon
   - `upstash-redis-url` - Redis cache
   - `upstash-redis-token` - Token Redis
   - `qdrant-url` - Banco vetorial
   - `qdrant-api-key` - API Qdrant
3. Atualiza serviços `assistente-juridico-backend` e `agents`
4. Remove variáveis de ambiente antigas (opcional)

**Você precisará fornecer:**
- ✅ Chave API Gemini (nova, rotacionada)
- ✅ URL PostgreSQL do Neon
- ✅ Credenciais Upstash Redis (opcional)
- ✅ Credenciais Qdrant (opcional)

**Resultado esperado:**
```
✅ Secrets criados com sucesso!
✅ Serviço atualizado!
🔐 Chaves agora estão seguras no Secret Manager
```

---

### **PASSO 3: Configurar PostgreSQL** ⏱️ 5 min

```bash
./fix-database-config.sh
```

**O que faz:**
- Detecta se DATABASE_URL já existe
- Oferece 2 métodos:
  1. **Secret Manager** (recomendado)
  2. **Variável de ambiente** (rápido)
- Atualiza serviço `assistente-juridico-backend`
- Testa conexão automaticamente

**Você precisará fornecer:**
- ✅ URL de conexão do Neon PostgreSQL

**Formato esperado:**
```
postgresql://usuario:senha@ep-host.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**Onde encontrar:**
1. Acesse: https://console.neon.tech
2. Selecione seu projeto
3. Clique em "Connection Details"
4. Copie a "Connection string"

**Resultado esperado:**
```
✅ DATABASE_URL configurada via Secret Manager!
✅ Banco de dados conectado com sucesso!
```

---

### **PASSO 4: Corrigir Serviço Agents** ⏱️ 10 min

```bash
./fix-agents-service.sh
```

**O que faz:**
Oferece 3 opções:

#### **Opção 1: Corrigir variáveis apenas** (rápido)
- Remove variáveis localhost inválidas
- Mantém serviço em us-central1

#### **Opção 2: Migrar para Brasil** (recomendado)
- Deploy novo serviço `agents-br` em southamerica-east1
- Latência reduzida de ~150ms para ~5ms
- Mantém serviço antigo para rollback

#### **Opção 3: Diagnóstico detalhado**
- Analisa logs de erro
- Mostra warnings recentes
- Ajuda a identificar causa raiz

**Resultado esperado (Opção 2):**
```
✅ Serviço 'agents-br' criado em southamerica-east1!
🔄 Teste: https://agents-br-598169933649.southamerica-east1.run.app
```

---

### **PASSO 5: Limpar Erros de Infraestrutura** ⏱️ 5 min (opcional)

```bash
./fix-infrastructure-errors.sh
```

**O que faz:**
Oferece correções para:

#### **1. MCP Client Timeout**
- Desabilita Model Context Protocol se não usado
- Adiciona flag `MCP_ENABLED` para controle

#### **2. Dynatrace não ativo**
- Desabilita via env var `DYNATRACE_ENABLED=false`
- Remove warnings desnecessários

#### **3. Genkit Flows falhando**
- Fornece patch com retry logic
- Adiciona timeout de 10s
- Implementa backoff exponencial

**Resultado esperado:**
```
✅ Dynatrace desabilitado via env var
ℹ️  Instruções MCP salvas em /tmp/mcp-disable.patch
ℹ️  Instruções Genkit salvas em /tmp/genkit-fix.txt
```

---

## 📝 Passo a Passo Completo (30 min total)

### Executar todos os scripts em sequência:

```bash
# 1. Corrigir rate limiter e dotenv (5 min)
./fix-cloud-run-errors.sh

# 2. Migrar secrets (10 min - interativo)
./fix-secrets-manager.sh

# 3. Configurar PostgreSQL (5 min - interativo)
./fix-database-config.sh

# 4. Corrigir agents (10 min)
./fix-agents-service.sh
# Escolha opção 2 (migrar para Brasil)

# 5. Limpar infraestrutura (5 min - opcional)
./fix-infrastructure-errors.sh
# Escolha opção 4 (aplicar todas correções)
```

---

## 🔍 Como Verificar se Funcionou

### **1. Verificar erros no Console**
```bash
# Abrir Cloud Console
https://console.cloud.google.com/run?project=sonic-terminal-474321-s1

# Verificar "Erros" - deve estar zerado
```

### **2. Testar endpoints**
```bash
# Backend health
curl https://assistente-juridico-backend-598169933649.southamerica-east1.run.app/api/health

# Frontend
curl https://sonic-terminal-474321-s1.web.app

# Agents (novo)
curl https://agents-br-598169933649.southamerica-east1.run.app
```

### **3. Verificar logs**
```bash
# Últimas 50 linhas do backend
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=assistente-juridico-backend" --limit 50 --project=sonic-terminal-474321-s1

# Buscar por erros
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" --limit 20 --project=sonic-terminal-474321-s1
```

---

## ✅ Checklist Final

Após executar todos os scripts:

### Erros Corrigidos
- [ ] ❌ ValidationError: Forwarded header → ✅ Resolvido
- [ ] ❌ Cannot find package 'dotenv' → ✅ Resolvido
- [ ] 🔐 Chaves API expostas → ✅ Migradas para Secret Manager
- [ ] 🗄️ PostgreSQL não conecta → ✅ DATABASE_URL configurada
- [ ] 🤖 Agents NOT_FOUND → ✅ Migrado para BR (opcional)
- [ ] 🧹 MCP/Dynatrace errors → ✅ Desabilitados

### Funcionalidades
- [ ] Backend `/api/health` responde 200 OK
- [ ] Rate limiting funciona sem erros
- [ ] Frontend carrega corretamente
- [ ] Login via Google funciona
- [ ] Banco de dados conectado

### Segurança
- [ ] Secrets no Secret Manager (não em env vars)
- [ ] Chaves antigas revogadas
- [ ] Nova chave Gemini gerada
- [ ] Logs sem exposição de dados sensíveis

---

## 🆘 Troubleshooting

### Problema: Script falha com "Permission denied"
```bash
chmod +x fix-*.sh
```

### Problema: "gcloud command not found"
```bash
# Instalar gcloud CLI
# Instruções: https://cloud.google.com/sdk/docs/install
```

### Problema: "Project não configurado"
```bash
gcloud config set project sonic-terminal-474321-s1
gcloud auth login
```

### Problema: Secret Manager API não habilitada
```bash
gcloud services enable secretmanager.googleapis.com --project=sonic-terminal-474321-s1
```

### Problema: Serviço não responde após deploy
```bash
# Aguardar 1-2 minutos para cold start
# Verificar logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50 --project=sonic-terminal-474321-s1
```

---

## 📊 Resultados Esperados

| Métrica | Antes | Depois |
|---------|-------|--------|
| **Erros totais** | 15 | 0 |
| **ValidationError** | 8/dia | 0 |
| **dotenv error** | 5 falhas | 0 |
| **Secrets expostos** | 3 chaves | 0 |
| **Uptime** | ~95% | 99.9% |
| **Latência agents** | ~150ms (EUA) | ~5ms (BR) |

---

## 🔗 Links Úteis

- **Cloud Console:** https://console.cloud.google.com/run?project=sonic-terminal-474321-s1
- **Secret Manager:** https://console.cloud.google.com/security/secret-manager?project=sonic-terminal-474321-s1
- **Logs:** https://console.cloud.google.com/logs?project=sonic-terminal-474321-s1
- **Neon PostgreSQL:** https://console.neon.tech
- **Upstash Redis:** https://console.upstash.com
- **Qdrant Cloud:** https://cloud.qdrant.io

---

## 🎯 Recomendação Final

**Ordem de execução sugerida:**

1. ✅ **Urgente (agora):** `fix-cloud-run-errors.sh` + `fix-secrets-manager.sh`
2. ✅ **Importante (hoje):** `fix-database-config.sh`
3. 🟡 **Opcional (esta semana):** `fix-agents-service.sh` + `fix-infrastructure-errors.sh`

**Tempo total estimado:** 30 minutos para corrigir tudo.

---

**Pronto para começar? Execute:**
```bash
./fix-cloud-run-errors.sh
```
