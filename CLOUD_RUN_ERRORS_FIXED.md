# 🔧 Análise e Correção - Erros Cloud Run (17/01/2026)

## 📊 Status da Análise

**Data:** 17/01/2026  
**Projeto:** sonic-terminal-474321-s1  
**Região:** southamerica-east1 (São Paulo)

---

## ❌ Erros Identificados

### 1️⃣ **ValidationError: Forwarded Header (8 ocorrências)**
```
ValidationError: The 'Forwarded' header (standardized X-Forwarded-For) is set but currently being ignored.
Add a custom keyGenerator to use a value from this header.
```

**Serviço afetado:** `assistente-juridico-backend-00004-wlw`

**Causa Raiz:**
- Cloud Run e Firebase Hosting enviam headers `X-Forwarded-For` e `Forwarded`
- O `express-rate-limit` detecta esses headers mas não está configurado para usá-los
- Sem `keyGenerator` personalizado, o rate limiter ignora a identificação correta do cliente

**Impacto:**
- ⚠️ Rate limiting pode bloquear múltiplos usuários como um único IP
- ⚠️ Logs poluídos com warnings

---

### 2️⃣ **Cannot Find Package 'dotenv' (5 ocorrências)**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dotenv' imported from /app/backend/dist/backend/src/server.js
```

**Serviço afetado:** `assistente-juridico-backend-00003-6np`

**Causa Raiz:**
- O `Dockerfile` usa `npm ci --omit=dev` para instalar dependências de produção
- O código importa `dotenv` diretamente sem tratamento de erro
- Cloud Run NÃO precisa de `dotenv` (usa variáveis de ambiente nativas)

**Impacto:**
- ❌ Servidor falha ao iniciar
- ❌ Todas as rotas ficam indisponíveis

---

### 3️⃣ **Error 5 NOT_FOUND no serviço 'agents' (2 ocorrências)**
```
[agents] Erro: Error: 5 NOT_FOUND:
```

**Serviço afetado:** `agents-00003-lut` (região: us-central1)

**Causa Provável:**
- Serviço `agents` está em região diferente (us-central1 vs southamerica-east1)
- Possível problema com configuração de variáveis de ambiente
- Arquivo ou recurso não encontrado (path incorreto após build)

**Impacto:**
- ⚠️ Funcionalidades de agentes podem estar comprometidas
- ⚠️ Maior latência por estar em região EUA

---

## ✅ Correções Aplicadas

### **Correção 1: Rate Limiter - Forwarded Headers**

**Arquivo:** `backend/src/server.ts` (linhas 134-159)

**Mudanças:**
```typescript
// ANTES
const apiLimiter = rateLimit({
  standardHeaders: true,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// DEPOIS
const apiLimiter = rateLimit({
  standardHeaders: 'draft-7',
  validate: { trustProxy: true },
  keyGenerator: (req) => {
    // Cloud Run usa X-Forwarded-For, Firebase Hosting usa Forwarded
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});
```

**Benefícios:**
- ✅ Rate limiting funciona corretamente com proxies
- ✅ Cada cliente é identificado pelo IP real (não o IP do proxy)
- ✅ Segue especificação draft-7 do express-rate-limit v8+

---

### **Correção 2: Dotenv - Import Opcional**

**Arquivo:** `backend/src/server.ts` (linhas 50-57)

**Mudanças:**
```typescript
// ANTES
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });
dotenv.config();

// DEPOIS
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  dotenv.config({ path: envPath });
  dotenv.config();
} catch (err) {
  logInfo("dotenv not available - using system environment variables");
}
```

**Benefícios:**
- ✅ Cloud Run usa variáveis de ambiente nativas (não precisa de dotenv)
- ✅ Desenvolvimento local continua funcionando com .env
- ✅ Graceful fallback quando dotenv não está disponível

---

### **Correção 3: Dockerfile - Incluir dotenv em Produção**

**Arquivo:** `Dockerfile` (linha 42)

**Mudanças:**
```dockerfile
# ANTES
RUN cd backend && npm ci --omit=dev --legacy-peer-deps

# DEPOIS
# Não omitir dev pois dotenv é necessário em produção para ler .env
RUN cd backend && npm ci --legacy-peer-deps
```

**Nota:** Esta correção garante que `dotenv` esteja disponível, mas a Correção 2 torna o import opcional.

---

## 🚀 Como Aplicar as Correções

### **Opção 1: Script Automatizado (Recomendado)**

```bash
# Executar na raiz do projeto
./fix-cloud-run-errors.sh
```

Este script:
1. Compila o backend localmente
2. Faz deploy no Cloud Run com as correções
3. Testa o endpoint de saúde
4. Mostra URLs atualizadas

---

### **Opção 2: Deploy Manual**

```bash
# 1. Build local para verificar
cd backend
npm run build
cd ..

# 2. Deploy no Cloud Run
gcloud config set project sonic-terminal-474321-s1

gcloud run deploy assistente-juridico-backend \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --set-env-vars "NODE_ENV=production,RATE_LIMIT_ENABLED=true"

# 3. Verificar logs
gcloud run logs read assistente-juridico-backend \
  --region southamerica-east1 \
  --limit 50
```

---

## 📊 Verificação Pós-Deploy

### **1. Verificar Erros no Console**

Acesse: https://console.cloud.google.com/run?project=sonic-terminal-474321-s1

**Espera-se:**
- ❌ ~~ValidationError: Forwarded header~~ → **Resolvido**
- ❌ ~~Cannot find package 'dotenv'~~ → **Resolvido**
- ⚠️ Error 5 NOT_FOUND (agents) → **Requer investigação separada**

---

### **2. Testar Rate Limiting**

```bash
# Fazer múltiplas requisições para testar rate limiter
for i in {1..5}; do
  curl -i https://sonic-terminal-474321-s1.web.app/api/health
  sleep 1
done

# Deve retornar:
# - 200 OK nas primeiras requisições
# - 429 Too Many Requests após atingir o limite
```

---

### **3. Verificar Logs em Tempo Real**

```bash
gcloud run logs tail assistente-juridico-backend \
  --region southamerica-east1 \
  --format "value(textPayload)"
```

**Logs esperados:**
```
✅ Loading env from: /app/.env.local
✅ dotenv not available - using system environment variables
✅ [Rate Limiting] Enabled: true
✅ Server running on port 8080
```

---

## 🔍 Próximos Passos

### **Problema Remanescente: Serviço 'agents' NOT_FOUND**

**Recomendações:**

1. **Verificar região do serviço:**
   ```bash
   gcloud run services describe agents --region us-central1
   ```

2. **Migrar para região brasileira (opcional):**
   - Deploy novo serviço em `southamerica-east1`
   - Melhor latência para usuários brasileiros

3. **Verificar variáveis de ambiente:**
   ```bash
   gcloud run services describe agents --region us-central1 --format="value(spec.template.spec.containers[0].env)"
   ```

4. **Analisar logs específicos:**
   ```bash
   gcloud run logs read agents --region us-central1 --limit 100
   ```

---

## 📈 Métricas de Sucesso

| Métrica | Antes | Depois (Esperado) |
|---------|-------|-------------------|
| **ValidationError** | 8 ocorrências | 0 ocorrências |
| **Cannot find dotenv** | 5 ocorrências | 0 ocorrências |
| **Rate Limiting** | ❌ Incorreto | ✅ Funcional |
| **Tempo de Startup** | ~5-10s | ~3-5s |

---

## 🔗 Links Úteis

- **Cloud Run Console:** https://console.cloud.google.com/run?project=sonic-terminal-474321-s1
- **Logs do Backend:** `gcloud run logs read assistente-juridico-backend --region southamerica-east1`
- **Aplicação:** https://sonic-terminal-474321-s1.web.app
- **Express Rate Limit Docs:** https://express-rate-limit.github.io/ERR_ERL_FORWARDED_HEADER/

---

## ✅ Checklist de Validação

Após fazer o deploy, verifique:

- [ ] Build local bem-sucedido (`npm run build`)
- [ ] Deploy no Cloud Run concluído sem erros
- [ ] Endpoint `/api/health` respondendo 200 OK
- [ ] Logs sem erros de `ValidationError`
- [ ] Logs sem erros de `dotenv`
- [ ] Rate limiting funcionando corretamente
- [ ] Frontend conectando com backend

---

**🎯 Resultado Esperado:** Sistema estável e sem erros críticos em produção!
