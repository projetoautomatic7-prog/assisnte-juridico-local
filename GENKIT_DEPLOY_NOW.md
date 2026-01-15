# 🚀 DEPLOY GENKIT AGORA - Tudo Pronto!

## ✅ **Status: Pronto para Deploy**

### **O que você já fez:**
- ✅ 3 APIs ativadas (Logging, Trace, Monitoring)
- ✅ 3 Roles IAM configuradas
- ✅ Código Genkit configurado (`lib/ai/observability.ts`)
- ✅ Plugin Firebase instalado

---

## 🎯 **Comandos para Executar AGORA**

### **1. Deploy das Functions com Genkit**

```bash
cd /home/user/assisnte-juridico-local
firebase deploy --only functions
```

**Aguarde:** ~3-5 minutos para o deploy completar

---

### **2. Testar um Flow (DJEN)**

```bash
curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "mensagem": "Processamento DJEN executado",
  "dados": { "total": 3, "processadas": 3 }
}
```

---

### **3. Aguardar Métricas (5 minutos)**

O Genkit exporta métricas **a cada 5 minutos** por padrão.

Após executar o flow, aguarde e então acesse:
```
https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit
```

---

### **4. Verificar se está funcionando**

**Ver logs em tempo real:**
```bash
firebase functions:log --only djenTriggerManual
```

**Ou no Console:**
```
https://console.cloud.google.com/logs/query?project=sonic-terminal-474321-s1
```

Procure por: `[Telemetry] Firebase Telemetry configurado`

---

## 📊 **O que você verá no Dashboard**

Após 5 minutos, o dashboard mostrará:

```
┌────────────────────────────────────────┐
│ Flow: djenTriggerManual                │
├────────────────────────────────────────┤
│ Execuções: 1                           │
│ Latência média: 2.5s                   │
│ Taxa de sucesso: 100%                  │
│ Tokens usados: 1,200 (Gemini)         │
├────────────────────────────────────────┤
│ Última execução:                       │
│ • Timestamp: 2026-01-15 19:45:00      │
│ • Duration: 2.3s                       │
│ • Status: Success ✅                   │
│ • Input: { }                           │
│ • Output: { sucesso: true, ... }      │
└────────────────────────────────────────┘
```

**Clique em qualquer execução para ver:**
- Trace completo (cada step)
- Input/Output detalhado
- Tempo de cada operação
- Erros (se houver)

---

## 🔧 **Troubleshooting Rápido**

### **Problema: Dashboard vazio após 5 minutos**

**Verificar logs de erro:**
```bash
gcloud logging read "severity>=ERROR" --limit 20 --project=sonic-terminal-474321-s1
```

**Verificar se telemetria está ativa:**
```bash
firebase functions:log --only djenTriggerManual | grep Telemetry
```

Deve aparecer: `[Telemetry] Firebase Telemetry configurado`

---

### **Problema: "Permission denied" nos logs**

**Verificar roles IAM:**
```bash
gcloud projects get-iam-policy sonic-terminal-474321-s1 \
  --flatten="bindings[].members" \
  --filter="bindings.members:*@appspot.gserviceaccount.com" \
  --format="table(bindings.role)"
```

Deve mostrar:
```
roles/monitoring.metricWriter
roles/cloudtrace.agent
roles/logging.logWriter
```

---

## 🎉 **Pronto! Só executar os comandos**

```bash
# 1. Deploy
firebase deploy --only functions

# 2. Testar
curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual

# 3. Aguardar 5 minutos

# 4. Acessar dashboard
open https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit
```

---

**Tudo pronto! Execute o deploy e me avise quando terminar.** 🚀
