# ✅ Checklist: Ativar Genkit Monitoring no Firebase

**Projeto:** sonic-terminal-474321-s1  
**Documentação:** https://firebase.google.com/docs/genkit/monitoring

---

## 📋 **Status da Configuração**

### ✅ **Passo 1: Plugin Firebase**
- [x] `@genkit-ai/firebase` instalado
- [x] `enableFirebaseTelemetry()` configurado em `lib/ai/observability.ts`
- [x] Auto-instrumentação habilitada

---

### ⏳ **Passo 2: Ativar APIs (Você precisa fazer)**

Acesse: https://console.cloud.google.com/apis/dashboard?project=sonic-terminal-474321-s1

**Ative estas APIs:**
- [ ] **Cloud Logging API**
- [ ] **Cloud Trace API**
- [ ] **Cloud Monitoring API**

**Como ativar:**
1. Clique em "+ ENABLE APIS AND SERVICES"
2. Busque cada API pelo nome
3. Clique em "Enable"

---

### ⏳ **Passo 3: Configurar Permissões IAM (Você precisa fazer)**

Acesse: https://console.cloud.google.com/iam-admin/iam?project=sonic-terminal-474321-s1

**Encontre a conta de serviço:**
- Nome: `sonic-terminal-474321-s1@appspot.gserviceaccount.com`
- Descrição: "App Engine default service account"

**Adicione estas roles:**
1. [ ] **Monitoring Metrics Writer** (`roles/monitoring.metricWriter`)
2. [ ] **Cloud Trace Agent** (`roles/cloudtrace.agent`)
3. [ ] **Logs Writer** (`roles/logging.logWriter`)

**Como adicionar:**
1. Clique no ✏️ (editar) ao lado da conta de serviço
2. Clique "+ ADD ANOTHER ROLE"
3. Selecione cada role da lista
4. Clique "Save"

---

### ✅ **Passo 4: Código Configurado**

**Arquivo:** `lib/ai/observability.ts`

```typescript
enableFirebaseTelemetry({
  autoInstrumentation: true,
  disableMetrics: false,
  disableTraces: false,
  forceDevExport: !isProduction, // Dev exporta local
  metricExportIntervalMillis: 300_000, // 5 minutos
});
```

**Status:** ✅ Já configurado e pronto para produção

---

### ⏳ **Passo 5: Deploy e Teste**

```bash
# 1. Deploy das functions
firebase deploy --only functions

# 2. Invocar um flow (ex: DJEN)
curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual

# 3. Aguardar até 5 minutos

# 4. Acessar dashboard
open https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit
```

---

## 🎯 **URLs Importantes**

| Serviço | URL |
|---------|-----|
| **Genkit Dashboard** | https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit |
| **APIs Console** | https://console.cloud.google.com/apis/dashboard?project=sonic-terminal-474321-s1 |
| **IAM Permissions** | https://console.cloud.google.com/iam-admin/iam?project=sonic-terminal-474321-s1 |
| **Cloud Logging** | https://console.cloud.google.com/logs?project=sonic-terminal-474321-s1 |
| **Cloud Trace** | https://console.cloud.google.com/traces?project=sonic-terminal-474321-s1 |

---

## ⚠️ **Troubleshooting**

### **Problema: Métricas não aparecem após 5 minutos**

1. **Verifique permissões IAM:**
   ```bash
   gcloud projects get-iam-policy sonic-terminal-474321-s1 \
     --flatten="bindings[].members" \
     --filter="bindings.members:*@appspot.gserviceaccount.com"
   ```

2. **Verifique logs de erro:**
   ```bash
   gcloud logging read "severity>=ERROR" --limit 50 --project=sonic-terminal-474321-s1
   ```

3. **Teste autenticação:**
   ```bash
   gcloud auth application-default login --impersonate-service-account sonic-terminal-474321-s1@appspot.gserviceaccount.com
   ```

### **Problema: "Permission denied" ao acessar dashboard**

- Sua conta precisa ter role `roles/firebase.viewer` no projeto
- Adicione em: https://console.cloud.google.com/iam-admin/iam

---

## 💰 **Custos Estimados**

O Genkit Monitoring usa serviços pagos do Google Cloud:

| Serviço | Free Tier | Custo após Free Tier |
|---------|-----------|----------------------|
| Cloud Logging | 50 GB/mês | $0.50/GB |
| Cloud Trace | 2.5M spans/mês | $0.20/1M spans |
| Cloud Monitoring | 150 MB métricas | $0.2582/MiB |

**Estimativa:** ~$5-20/mês para uso moderado (< 1000 execuções/dia)

Ver preços: https://cloud.google.com/stackdriver/pricing

---

## ✅ **Próximos Passos**

1. ⏳ Ativar 3 APIs no Google Cloud Console
2. ⏳ Adicionar 3 roles IAM à conta de serviço
3. ⏳ Deploy: `firebase deploy --only functions`
4. ⏳ Testar: `curl djenTriggerManual`
5. ⏳ Aguardar 5 minutos e acessar dashboard

**Tudo pronto no código! Faltam apenas as configurações no Console.**
