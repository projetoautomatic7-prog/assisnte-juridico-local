# 🔍 Guia de Integração Dynatrace - Assistente Jurídico PJe

**Status:** ✅ Implementado
**Data:** 08 de Janeiro de 2026
**Versão:** 1.0.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes Implementados](#componentes-implementados)
4. [Configuração](#configuração)
5. [Uso](#uso)
6. [Benefícios](#benefícios)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O **Assistente Jurídico PJe** agora possui integração completa com **Dynatrace**, uma plataforma líder em APM (Application Performance Monitoring) e observabilidade. A integração permite:

- ✅ **Tracing distribuído** de todos os 15 agentes jurídicos
- ✅ **Monitoramento de performance** de chamadas LLM (Anthropic, Google Gemini)
- ✅ **Análise automática** com Davis AI
- ✅ **Rastreamento de banco de dados** (PostgreSQL, Qdrant, Redis)
- ✅ **Real User Monitoring (RUM)** via OpenTelemetry

---

## 🏗️ Arquitetura

### Frontend (React)
```
┌─────────────────────────────────────┐
│      React Application              │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  OpenTelemetry Web SDK       │  │
│  │  (src/lib/otel-integration)  │  │
│  └────────────┬─────────────────┘  │
│               │ HTTP OTLP           │
│               ▼                     │
│  ┌──────────────────────────────┐  │
│  │ Dynatrace OTLP Endpoint      │  │
│  │ {env-id}.live.dynatrace.com  │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Backend (Node.js/Express)
```
┌─────────────────────────────────────┐
│     Express Backend API             │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  OneAgent SDK                │  │
│  │  (@dynatrace/oneagent-sdk)   │  │
│  └────────────┬─────────────────┘  │
│               │                     │
│  ┌────────────▼─────────────────┐  │
│  │  Dynatrace Middleware        │  │
│  │  - Agent Context             │  │
│  │  - LLM Tracing               │  │
│  │  - DB Tracing                │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Dynatrace OneAgent  │
    │  (Container/Server)  │
    └──────────────────────┘
```

---

## 📦 Componentes Implementados

### 1. Backend - OneAgent SDK

**Arquivo:** `backend/src/dynatrace.ts`

Fornece funções para instrumentação customizada:

```typescript
import {
  traceAgentExecution,
  traceLLMCall,
  traceDatabase
} from './dynatrace';

// Rastrear execução de agente
const tracer = traceAgentExecution('harvey-specter', 'analyze-contract');
try {
  const result = await analyzeContract(data);
  tracer.end();
  return result;
} catch (error) {
  tracer.error(error);
  throw error;
}

// Rastrear chamada LLM
const llmTracer = traceLLMCall('claude-sonnet-4', 'anthropic', {
  agentId: 'harvey-specter',
  totalTokens: 1500
});
// ... código ...
llmTracer.end();
```

### 2. Backend - Middlewares Express

**Arquivo:** `backend/src/middlewares/dynatrace-middleware.ts`

- **dynatraceAgentMiddleware:** Rastreia todas requisições de agentes
- **dynatraceLLMMiddleware:** Rastreia especificamente chamadas LLM
- **addDynatraceBusinessContext:** Adiciona contexto de negócio (userId, processId, etc.)

```typescript
// Aplicado automaticamente em:
app.use(addDynatraceBusinessContext);
app.use(dynatraceAgentMiddleware);
app.use("/api/llm", dynatraceLLMMiddleware, llmRouter);
```

### 3. Frontend - OpenTelemetry Integration

**Arquivo:** `src/lib/otel-integration.ts`

Exporta traces do frontend para Dynatrace via OTLP:

```typescript
// Configuração automática via .env
VITE_OTLP_ENDPOINT=https://{env-id}.live.dynatrace.com/api/v2/otlp/v1/traces
VITE_DYNATRACE_API_TOKEN=dt0c01.XXXXXXXX
```

---

## ⚙️ Configuração

### Passo 1: Obter Credenciais Dynatrace

1. Acesse seu tenant Dynatrace
2. **Settings** → **Access tokens** → **Generate token**
3. Nome: `OpenTelemetry Trace Ingest`
4. Escopo: **✅ Ingest OpenTelemetry traces** (`openTelemetryTrace.ingest`)
5. Copie o token gerado (começa com `dt0c01.`)

### Passo 2: Configurar Variáveis de Ambiente

Edite `.env.local`:

```bash
# ============================================
# DYNATRACE CONFIGURATION
# ============================================

# Endpoint OTLP (Frontend)
VITE_OTLP_ENDPOINT=https://abc12345.live.dynatrace.com/api/v2/otlp/v1/traces

# API Token (Frontend)
VITE_DYNATRACE_API_TOKEN=dt0c01.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Environment ID (Frontend)
VITE_DYNATRACE_ENV_ID=abc12345

# Habilitar OneAgent SDK (Backend)
DYNATRACE_ENABLED=true
NODE_ENV=production
```

### Passo 3: Instalar OneAgent (Produção)

**Docker:**
```dockerfile
FROM node:22-alpine

# Instalar OneAgent
ENV DT_TENANT=abc12345
ENV DT_API_TOKEN=dt0c01.XXXXXXXX
ENV DT_API_URL=https://abc12345.live.dynatrace.com/api

RUN wget -O Dynatrace-OneAgent.sh "https://${DT_TENANT}.live.dynatrace.com/api/v1/deployment/installer/agent/unix/default/latest?Api-Token=${DT_API_TOKEN}&arch=x86&flavor=default" && \
    sh Dynatrace-OneAgent.sh

# ... resto do Dockerfile
```

**Railway/Vercel:**
```bash
# Configurar via dashboard do provedor
DT_TENANT=abc12345
DT_API_TOKEN=dt0c01.XXXXXXXX
DYNATRACE_ENABLED=true
```

### Passo 4: Verificar Instalação

```bash
# Backend
cd backend && npm install

# Iniciar servidor
npm run dev

# Verificar logs
[Dynatrace] OneAgent SDK inicializado com sucesso
[Dynatrace] Estado: ACTIVE
```

---

## 💡 Uso

### 1. Visualizar Traces no Dynatrace

1. Acesse seu tenant: `https://{env-id}.live.dynatrace.com`
2. **Distributed traces** → **Analyze traces**
3. Filtre por serviço: `assistente-juridico-pje`

### 2. Dashboards Recomendados

#### Dashboard de Agentes
```dql
// Dynatrace Query Language (DQL)
fetch dt.entity.service
| filter serviceName == "assistente-juridico-pje"
| fields agentId, duration, error
| summarize avg_duration = avg(duration), error_rate = countIf(error) by agentId
```

#### Dashboard de LLMs
```dql
fetch dt.entity.service
| filter serviceName == "assistente-juridico-pje"
| filter llm.provider != ""
| fields llm.model, llm.tokens.total, llm.provider
| summarize total_tokens = sum(llm.tokens.total) by llm.model
```

### 3. Alertas Automáticos

Configure alertas no Dynatrace:

- **Latência alta:** Agente demora > 5s
- **Taxa de erro:** Mais de 5% de falhas
- **Custo LLM:** Tokens > threshold
- **Disponibilidade:** Endpoint offline

---

## 🎁 Benefícios

### 1. Davis AI - Análise Automática

Davis AI detecta automaticamente:
- ⚠️ Anomalias de performance
- 🐛 Causa raiz de erros
- 📊 Padrões de uso anormais
- 💰 Custos de LLM elevados

### 2. Distributed Tracing Avançado

Visualize o caminho completo de uma requisição:

```
User Request
  ↓
Frontend (React)
  ↓
Backend API (/api/agents)
  ↓
Agent Orchestrator
  ↓ (parallel)
  ├─ Harvey Specter → Anthropic API
  ├─ Mrs. Justine → Google Gemini
  └─ Monitor DJEN → DJEN API
       ↓
  PostgreSQL Query
```

### 3. Real User Monitoring (RUM)

- 📱 Performance real dos usuários
- 🌍 Geolocalização
- 📊 Core Web Vitals
- ⚡ Apdex Score

### 4. Integração com Outros Sistemas

Dynatrace já se integra com:
- ✅ Azure Application Insights (via nosso setup existente)
- ✅ Datadog APM (via nosso setup existente)
- ✅ Sentry (error tracking)
- ✅ OpenTelemetry (padrão aberto)

---

## 🔧 Troubleshooting

### Problema: "OneAgent não está ativo"

**Solução:**
```bash
# Verificar se OneAgent está instalado
systemctl status oneagent

# Verificar logs
tail -f /var/log/dynatrace/oneagent/agent.log

# Reinstalar (se necessário)
wget -O /tmp/Dynatrace-OneAgent.sh "https://{env-id}.live.dynatrace.com/api/v1/deployment/installer/agent/unix/default/latest?Api-Token={token}"
sh /tmp/Dynatrace-OneAgent.sh
```

### Problema: "403 Forbidden" ao enviar traces

**Causa:** Token sem permissão `openTelemetryTrace.ingest`

**Solução:**
1. Settings → Access tokens
2. Edite o token
3. ✅ Habilite escopo "Ingest OpenTelemetry traces"
4. Salve e atualize `.env.local`

### Problema: Traces não aparecem no Dynatrace

**Checklist:**
- [ ] `VITE_OTLP_ENDPOINT` está correto?
- [ ] `VITE_DYNATRACE_API_TOKEN` está válido?
- [ ] Firewall permite HTTPS para `*.dynatrace.com`?
- [ ] Browser console mostra erros CORS?
- [ ] Backend está em produção (`NODE_ENV=production`)?

---

## 📚 Referências

- [Dynatrace OpenTelemetry](https://www.dynatrace.com/support/help/extend-dynatrace/opentelemetry/)
- [OneAgent SDK Node.js](https://www.npmjs.com/package/@dynatrace/oneagent-sdk)
- [Dynatrace DQL](https://www.dynatrace.com/support/help/how-to-use-dynatrace/dynatrace-query-language/)
- [Davis AI](https://www.dynatrace.com/platform/artificial-intelligence/)

---

## 🤝 Suporte

**Desenvolvido por:** Equipe Assistente Jurídico PJe
**Contato:** thiago@portprojeto.com.br
**Documentação:** `docs/DYNATRACE_INTEGRATION.md`

---

**Última atualização:** 08 de Janeiro de 2026
