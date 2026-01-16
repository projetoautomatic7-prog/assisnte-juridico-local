# 🚀 DEPLOY BACKEND PARA CLOUD RUN - GUIA RÁPIDO

## ✅ **Pré-requisitos Confirmados:**

- [x] `gcloud` CLI autenticado
- [x] Projeto: `sonic-terminal-474321-s1`
- [x] Dockerfile na raiz (frontend + backend)
- [x] Variáveis de ambiente configuradas em `.env.production`
- [x] Scripts de deploy criados

---

## 📋 **PASSO A PASSO:**

### **1. Exportar variáveis de ambiente**

```bash
source ./export-env-vars.sh
```

Ou manualmente:

```bash
export GEMINI_API_KEY="AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA"
export FRONTEND_URL="https://sonic-terminal-474321-s1.web.app"
export DJEN_OAB_NUMERO="184404"
export DJEN_OAB_UF="MG"
export DJEN_ADVOGADO_NOME="Thiago Bodevan Veiga"
```

### **2. Executar deploy**

```bash
./deploy-backend-cloud-run.sh
```

**Tempo estimado:** 5-10 minutos

O script vai:
- ✅ Habilitar APIs do Cloud Run
- ✅ Fazer build do container (frontend + backend)
- ✅ Deploy com `--min-instances 1` (sempre ligado 24h)
- ✅ Configurar todas as variáveis de ambiente
- ✅ Retornar URL do backend

### **3. Testar o backend deployado**

```bash
# Obter URL
SERVICE_URL=$(gcloud run services describe assistente-juridico-backend \
  --region southamerica-east1 \
  --format="value(status.url)")

# Health check
curl $SERVICE_URL/health

# Testar DJEN status
curl $SERVICE_URL/api/djen/status

# Testar LLM
curl -X POST $SERVICE_URL/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá, teste!"}'
```

### **4. Deploy do Firebase Hosting**

```bash
firebase deploy --only hosting
```

### **5. Testar integração completa**

```bash
# Via domínio Firebase
curl https://sonic-terminal-474321-s1.web.app/api/djen/status
curl https://sonic-terminal-474321-s1.web.app/health
```

---

## 🔧 **Variáveis Configuradas no Cloud Run:**

```env
NODE_ENV=production
PORT=8080
GEMINI_API_KEY=AIzaSy... (sua chave)
GEMINI_MODEL=gemini-2.0-flash-exp
FRONTEND_URL=https://sonic-terminal-474321-s1.web.app
DJEN_OAB_NUMERO=184404
DJEN_OAB_UF=MG
DJEN_ADVOGADO_NOME=Thiago Bodevan Veiga
DJEN_SCHEDULER_ENABLED=false
```

---

## 📊 **Arquitetura Final:**

```
┌─────────────────────────────────────────────┐
│  Firebase Hosting                           │
│  sonic-terminal-474321-s1.web.app          │
└──────────────────┬──────────────────────────┘
                   │
                   │ /api/** rewrite
                   ↓
┌─────────────────────────────────────────────┐
│  Cloud Run (24h ativo)                      │
│  assistente-juridico-backend                │
│  southamerica-east1                         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Express Server                     │   │
│  │  - /api/llm/*       (Gemini)       │   │
│  │  - /api/agents/*    (AI Agents)    │   │
│  │  - /api/djen/*      (Publicações)  │   │
│  │  - /api/editor/*    (Minutas)      │   │
│  │  - /api/minutas/*                  │   │
│  │  - /api/expedientes/*              │   │
│  │  - /api/lawyers/*                  │   │
│  │  - /api/qdrant/*    (Vector DB)    │   │
│  │  - /api/kv/*        (Key-Value)    │   │
│  │  - /api/rag/*       (RAG)          │   │
│  │  - /health                          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 💰 **Custos Estimados:**

- **Min instances = 1**: ~$10-15/mês
- **Memory 1Gi, CPU 1**: Adequado para Express + PostgreSQL
- **Sempre disponível**: Sem cold start
- **Free tier**: Primeiros 2 milhões de requests/mês grátis

---

## 🆘 **Troubleshooting:**

### **Build falha com erro TypeScript:**

```bash
cd backend
npm run build
# Corrigir erros antes do deploy
```

### **Deploy travou:**

```bash
# Ver logs do build
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

### **Backend retorna 502/503:**

```bash
# Ver logs do container
gcloud run services logs read assistente-juridico-backend \
  --region southamerica-east1 \
  --limit 50
```

### **CORS error no frontend:**

Verifique se `FRONTEND_URL` está correta no Cloud Run:

```bash
gcloud run services describe assistente-juridico-backend \
  --region southamerica-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### **DJEN não funciona:**

Verifique se as variáveis OAB estão configuradas:

```bash
curl https://assistente-juridico-backend-XXX.a.run.app/api/djen/status
```

---

## 🔄 **Atualizar Backend:**

```bash
# Fazer alterações no código
# Reexportar variáveis se necessário
source ./export-env-vars.sh

# Redeploy
./deploy-backend-cloud-run.sh
```

---

## 🔐 **Migrar para Secret Manager (Futuro):**

```bash
# Criar secret
echo -n "AIzaSy..." | gcloud secrets create GEMINI_API_KEY --data-file=-

# Dar permissão ao Cloud Run
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:$(gcloud run services describe assistente-juridico-backend \
    --region southamerica-east1 \
    --format='value(spec.template.spec.serviceAccountName)')" \
  --role="roles/secretmanager.secretAccessor"

# Deploy com secrets
gcloud run deploy assistente-juridico-backend \
  --source . \
  --region southamerica-east1 \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## 📚 **Documentação:**

- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Firebase Hosting Rewrites](https://firebase.google.com/docs/hosting/cloud-run)
- [Express on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)

---

**🎯 Pronto para deploy?** Execute: `./deploy-backend-cloud-run.sh`
