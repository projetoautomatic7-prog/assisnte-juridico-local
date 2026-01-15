# 🔴 Genkit em Produção - Monitoramento Oficial

## 📚 **Baseado na Documentação Oficial:**
https://firebase.google.com/docs/genkit/monitoring

---

## ✅ **Configuração Oficial do Genkit Monitoring**

### **O que é Genkit Monitoring?**
Dashboard oficial do Firebase para monitorar recursos Genkit em produção com:
- ✅ Métricas quantitativas (latência, erros, uso de tokens)
- ✅ Inspeção de traces (steps, inputs, outputs)
- ✅ Exportação de traces para avaliações

---

## 🚀 **Passo a Passo (Documentação Oficial)**

### **Pré-requisitos:**
1. ✅ Projeto Firebase no plano **Blaze** (pay-as-you-go)
2. ✅ Código Genkit pronto para deploy
3. ⚠️ Custos: Google Cloud Logging, Metrics e Trace (consulte preços)

---

### **Passo 1: Adicionar Plugin Firebase**

```bash
npm install @genkit-ai/firebase
```

**Opção A: Configuração via Variável de Ambiente (Simples)**
```bash
export ENABLE_FIREBASE_MONITORING=true
```

**Opção B: Configuração Programática (Recomendado para customização)**

Edite `functions/src/index.ts` ou seu arquivo principal Genkit:

```typescript
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Configuração padrão (recomendado para começar)
enableFirebaseTelemetry();

// OU com opções customizadas:
enableFirebaseTelemetry({
  forceDevExport: false, // true = exporta localmente (dev)
  metricExportIntervalMillis: 300_000, // 5 minutos (padrão)
});
```

---

### **Passo 2: Ativar APIs Necessárias**

No **Console do Google Cloud**, ative estas APIs:
1. ✅ **Cloud Logging API** - Para logs
2. ✅ **Cloud Trace API** - Para traces
3. ✅ **Cloud Monitoring API** - Para métricas

**URL:** https://console.cloud.google.com/apis/dashboard?project=sonic-terminal-474321-s1

---

### **Passo 3: Configurar Permissões (IAM)**

Atribua estas roles à **conta de serviço** que executa seu código:

| Role | Nome Técnico | Função |
|------|--------------|--------|
| **Monitoring Metrics Writer** | `roles/monitoring.metricWriter` | Escrever métricas |
| **Cloud Trace Agent** | `roles/cloudtrace.agent` | Enviar traces |
| **Logs Writer** | `roles/logging.logWriter` | Escrever logs |

**Para Cloud Functions:** Geralmente é `PROJECT_ID@appspot.gserviceaccount.com`

**Configurar em:** https://console.cloud.google.com/iam-admin/iam?project=sonic-terminal-474321-s1

---

### **Passo 4: (Opcional) Testar Localmente**

Para testar antes do deploy:

```typescript
// Em seu arquivo Genkit
enableFirebaseTelemetry({
  forceDevExport: true, // Exporta para dashboard mesmo localmente
});
```

**Autenticar com conta de serviço:**
```bash
gcloud auth application-default login --impersonate-service-account PROJECT_ID@appspot.gserviceaccount.com
```

**Executar localmente:**
```bash
genkit start -- npx tsx functions/src/index.ts
```

**Invocar um flow e aguardar 5 minutos** para ver métricas no dashboard.

---

### **Passo 5: Deploy e Visualização**

```bash
# Deploy
firebase deploy --only functions

# Aguardar primeira métrica (até 5 minutos)

# Acessar Dashboard
open https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit
```

---

## **Opção 2: Genkit Dev UI Remoto (Tunneling) 🌐**

### **O que é?**
Conectar seu **localhost:4000** (Genkit UI) ao app em produção via túnel.

### **Como Fazer:**

#### **1. Configurar Proxy no Projeto**
Arquivo: `lib/ai/genkit-production-proxy.ts`

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Habilitar telemetria remota
enableFirebaseTelemetry({
  projectId: 'sonic-terminal-474321-s1',
  forceDevExport: true, // Exportar para Dev UI local
});

export const ai = genkit({
  plugins: [googleAI()],
  // Conectar ao Cloud Functions em produção
  flowStateStore: {
    url: 'https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net',
  },
});
```

#### **2. Rodar Localmente Conectado à Produção**
```bash
# Terminal 1: Iniciar Genkit UI conectado à produção
GENKIT_ENV=production genkit start -- npx tsx lib/ai/genkit-production-proxy.ts

# Acesse: http://localhost:4000
# Agora você vê os flows rodando em produção!
```

---

## **Opção 3: OpenTelemetry + Google Cloud Trace 📊**

### **O que é?**
Sistema de observabilidade profissional da Google Cloud.

### **Como Ativar:**

#### **1. Configurar no Firebase**
Edite `lib/ai/observability.ts` (já existe):

```typescript
enableFirebaseTelemetry({
  autoInstrumentation: true,
  
  // Habilitar exportação para Cloud Trace
  forceDevExport: false, // Produção
  
  // Exportar métricas a cada 5 minutos
  metricExportIntervalMillis: 300_000,
});
```

#### **2. Deploy**
```bash
firebase deploy --only functions
```

#### **3. Acessar Cloud Trace**
```
https://console.cloud.google.com/traces/list?project=sonic-terminal-474321-s1
```

### **O que você vê:**
- ✅ **Flame graphs** de execução
- ✅ **Distributed tracing** (API calls)
- ✅ **Latência por região**
- ✅ **Span details** (cada etapa do flow)

---

## 🚀 **Implementação Imediata (Recomendado)**

### **Passo 1: Adicionar Flows ao Firebase Functions**

Edite `functions/src/index.ts`:

```typescript
import { onRequest } from "firebase-functions/v2/https";
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// Habilitar telemetria (automático)
enableFirebaseTelemetry({
  projectId: process.env.GCLOUD_PROJECT,
  forceDevExport: false,
});

const ai = genkit({
  plugins: [googleAI()],
});

// Exemplo: Flow de Análise Jurídica
const analisarProcessoFlow = ai.defineFlow(
  {
    name: 'analisarProcesso',
    inputSchema: z.object({ numeroProcesso: z.string() }),
    outputSchema: z.object({ resumo: z.string() }),
  },
  async (input) => {
    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Analise o processo ${input.numeroProcesso}...`,
    });
    return { resumo: response.text };
  }
);

// Expor flow como HTTP endpoint
export const analisarProcesso = onRequest(
  { region: 'southamerica-east1' },
  analisarProcessoFlow
);
```

### **Passo 2: Deploy**
```bash
firebase deploy --only functions:analisarProcesso
```

### **Passo 3: Acessar Monitoring**
```
https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit/flows
```

### **Passo 4: Testar**
```bash
curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/analisarProcesso \
  -H "Content-Type: application/json" \
  -d '{"numeroProcesso": "1234567-89.2024.8.07.0001"}'
```

---

## 📊 **Monitoramento em Tempo Real**

### **No Firebase Console você verá:**

```
┌─────────────────────────────────────────────────┐
│ 🔴 LIVE: Flow "analisarProcesso"               │
├─────────────────────────────────────────────────┤
│ ⏱️  Latência: 1.2s                              │
│ 📊 Execuções: 42 (hoje)                        │
│ ✅ Sucesso: 40 (95.2%)                          │
│ ❌ Erros: 2 (4.8%)                              │
│ 💰 Tokens: 15,840 (Gemini)                     │
├─────────────────────────────────────────────────┤
│ 📝 Última Execução:                             │
│ • Input: {"numeroProcesso": "1234..."}         │
│ • Output: {"resumo": "Processo civil..."}      │
│ • Tools: [searchDjen, qdrantRetriever]         │
│ • Duração: 1.15s                                │
└─────────────────────────────────────────────────┘
```

---

## 🎛️ **Adicionar Botão no Frontend para Ver Traces**

Arquivo: `src/components/GenkitMonitor.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function GenkitMonitor() {
  const genkitUrl = 
    "https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit/flows";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(genkitUrl, '_blank')}
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      Monitorar Genkit (Produção)
    </Button>
  );
}
```

---

## ⚙️ **Configuração já existente no projeto:**

### **Arquivo: `lib/ai/observability.ts`**
✅ **Já configurado com:**
- Firebase Telemetry habilitado
- Auto-instrumentação ativa
- Exportação de métricas e traces
- Logging customizado para RAG
- Métricas de PDF processing

### **Status Atual:**
```typescript
enableFirebaseTelemetry({
  autoInstrumentation: true,
  disableMetrics: false,
  disableTraces: false,
  forceDevExport: !isProduction, // Exporta local em dev
  metricExportIntervalMillis: 300_000, // 5min em produção
});
```

---

## 🔥 **Deploy Completo Agora**

```bash
# 1. Deploy functions com Genkit + Telemetria
firebase deploy --only functions

# 2. Aguardar 2 minutos (inicialização)

# 3. Acessar dashboard
open https://console.firebase.google.com/project/sonic-terminal-474321-s1/genkit

# 4. Executar um flow para gerar trace
curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual
```

---

## 📱 **Mobile/Web App com Traces Visíveis**

Você também pode **exibir traces no próprio app**:

```typescript
// Hook personalizado para buscar traces
export function useGenkitTraces(flowName: string) {
  const [traces, setTraces] = useState([]);
  
  useEffect(() => {
    const fetchTraces = async () => {
      const response = await fetch(
        `https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/genkit/traces?flow=${flowName}`
      );
      const data = await response.json();
      setTraces(data);
    };
    
    fetchTraces();
    const interval = setInterval(fetchTraces, 5000); // Atualiza a cada 5s
    return () => clearInterval(interval);
  }, [flowName]);
  
  return traces;
}
```

---

## ✅ **Resumo: O que fazer AGORA**

1. ✅ **Telemetria já está configurada** (`lib/ai/observability.ts`)
2. ⏳ **Deploy functions:** `firebase deploy --only functions`
3. ⏳ **Acessar dashboard:** Firebase Console > Genkit
4. ⏳ **Testar flow DJEN:** `curl djenTriggerManual`
5. ⏳ **Ver trace em tempo real** no dashboard

**Quer que eu prepare o deploy agora ou prefere ver o código primeiro?**
