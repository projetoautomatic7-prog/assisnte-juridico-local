# 🔍 INVESTIGAÇÃO COMPLETA: Integração DJEN

## 📊 RESUMO EXECUTIVO

**Data:** 15 de Janeiro de 2026  
**Status:** ✅ Sistema funcional com **DUPLICAÇÃO DE SCHEDULERS**  
**Risco:** ⚠️ Médio (possível processamento duplicado)

---

## 🎯 RESPOSTAS ÀS SUAS PERGUNTAS

### 1. **Em produção no Firebase, você usa o proxy do backend ou a função djenPublicacoes?**

**RESPOSTA:** Atualmente há **AMBOS configurados simultaneamente**:

#### 📍 **Firebase Functions (Produção Principal)**
```typescript
// functions/src/index.ts (linhas 19-25)
export {
  djenScheduler01h,     // ⏰ Scheduler 01:00
  djenScheduler09h,     // ⏰ Scheduler 09:00
  djenTriggerManual,    // 🔧 Trigger manual
  djenStatus,           // 📊 Status
  djenPublicacoes,      // 🔎 Proxy para frontend
} from "./djen-scheduler";
```

**Configuração no firebase.json:**
```json
{
  "source": "/api/djen/publicacoes",
  "function": "djenPublicacoes"  // ✅ Rota ativa
}
```

#### 📍 **Backend Node.js (Alternativo)**
```typescript
// backend/src/routes/djen.ts
router.get("/publicacoes", ...)  // 🔄 Proxy também implementado
router.post("/trigger-manual", ...) // Trigger alternativo
```

**⚠️ PROBLEMA:** Ambos estão ativos, mas apenas o Firebase é usado em produção (.env.production tem `VITE_API_BASE_URL=` vazio).

---

### 2. **O scheduler oficial deve ser o do backend (node-cron) ou o das Functions?**

**RESPOSTA:** Atualmente existem **DOIS SCHEDULERS PARALELOS**:

| Scheduler | Localização | Status | Horários |
|-----------|-------------|--------|----------|
| **Firebase Scheduler** | `functions/src/djen-scheduler.ts` | ✅ **PRODUÇÃO** | 01:00, 09:00 |
| **Node-Cron Backend** | `backend/src/services/djen-scheduler.ts` | ⚠️ **LOCAL/DEV** | 01:00, 09:00 |

#### 🔥 **Firebase Scheduler (Recomendado para Produção)**
```typescript
// functions/src/djen-scheduler.ts (linhas 169-186)
export const djenScheduler01h = onSchedule({
  schedule: "0 1 * * *",
  timeZone: "America/Sao_Paulo",
  region: "southamerica-east1", // ✅ Brasil (resolve geobloqueio)
  secrets: [DJEN_OAB_NUMERO, DJEN_OAB_UF, DJEN_ADVOGADO_NOME],
}, async (event) => { ... });
```

**Vantagens:**
- ✅ Região Brasil (sem geobloqueio da API CNJ)
- ✅ Serverless (sem necessidade de servidor rodando 24/7)
- ✅ Integração nativa com Firebase Secrets
- ✅ Escalável automaticamente

#### 🖥️ **Backend Node-Cron (Ideal para Desenvolvimento)**
```typescript
// backend/src/services/djen-scheduler.ts (linhas 130-163)
export function iniciarSchedulerDJEN() {
  cron.schedule("0 1 * * *", async () => { ... });
  cron.schedule("0 9 * * *", async () => { ... });
}
```

**Vantagens:**
- ✅ Logs diretos no console
- ✅ Acesso direto ao PostgreSQL
- ✅ Fácil debug local

**⚠️ PROBLEMA:** Ambos rodam simultaneamente se o backend estiver ativo!

---

### 3. **Quer forçar itensPorPagina=100 e pagina=1 conforme a doc para evitar truncamento?**

**RESPOSTA:** ✅ **JÁ ESTÁ IMPLEMENTADO EM `lib/api/djen-client.ts`**, mas **NÃO É USADO pelos schedulers**.

#### 📍 **Configuração Atual**

**Backend (NÃO usa paginação):**
```typescript
// backend/src/services/djen-api.ts (linhas 34-40)
const url = new URL(DJEN_API_URL);
url.searchParams.set("numeroOab", params.numeroOab);
url.searchParams.set("ufOab", params.ufOab);
url.searchParams.set("meio", "D");
url.searchParams.set("dataDisponibilizacaoInicio", params.dataInicio);
url.searchParams.set("dataDisponibilizacaoFim", params.dataFim);
// ❌ NÃO define itensPorPagina nem pagina
```

**Firebase Functions (NÃO usa paginação):**
```typescript
// functions/src/djen-scheduler.ts (linhas 46-51)
const url = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao");
url.searchParams.set("numeroOab", numeroOab);
url.searchParams.set("ufOab", ufOab);
url.searchParams.set("meio", "D");
url.searchParams.set("dataDisponibilizacaoInicio", dataInicio);
url.searchParams.set("dataDisponibilizacaoFim", dataFim || dataInicio);
// ❌ TAMBÉM não define itensPorPagina nem pagina
```

**Biblioteca API (TEM paginação, mas não é usada):**
```typescript
// lib/api/djen-client.ts (linhas 283-298)
function buildDJENQueryParams(tribunal: string, ctx: LawyerQueryContext): DJENQueryParams {
  const params: DJENQueryParams = {
    siglaTribunal: tribunal,
    dataDisponibilizacaoInicio: ctx.queryDataInicio,
    dataDisponibilizacaoFim: ctx.queryDataFim,
    itensPorPagina: 100,  // ✅ DEFINE 100
    pagina: 1,            // ✅ DEFINE 1
  };
  // ...
}
```

#### 📊 **Documentação Oficial da API DJEN**

Segundo `docs/DJEN_DOCUMENTATION.md`:

```
| pagina          | number | Não | Número da página (padrão: 1) | 1, 2 | ≥ 1 |
| itensPorPagina  | number | Não | Itens por página | 100 | 5 ou 100 |

Limitações de Resultado (máximo 10.000 itens):
- Pesquisas com 5 ou menos itensPorPagina
- Pesquisas com dataInicio ≠ dataFim
```

**⚠️ PROBLEMA:** Os schedulers do backend/Firebase **NÃO incluem** os parâmetros `itensPorPagina=100` e `pagina=1`, o que pode resultar em:
- Resposta limitada a poucos resultados
- Truncamento de dados
- Paginação não controlada

---

## 🔍 ANÁLISE DETALHADA

### 📂 **Arquivos Envolvidos**

| Arquivo | Função | Paginação? | Scheduler? |
|---------|--------|-----------|-----------|
| `backend/src/services/djen-api.ts` | Cliente API básico | ❌ Não | ❌ Não |
| `backend/src/services/djen-scheduler.ts` | Scheduler node-cron | ❌ Não | ✅ Sim |
| `backend/src/routes/djen.ts` | Proxy HTTP para frontend | ❌ Não | ❌ Não |
| `functions/src/djen-scheduler.ts` | Scheduler Firebase + Proxy | ❌ Não | ✅ Sim |
| `lib/api/djen-client.ts` | Cliente completo (não usado) | ✅ Sim | ❌ Não |
| `src/hooks/use-djen-publications.ts` | Hook React frontend | ❌ Não | ❌ Não |

### 🎯 **Fluxo em Produção (Firebase)**

```
Frontend → /api/djen/publicacoes → djenPublicacoes() (Firebase Function)
                                    ↓
                          buscarPublicacoesDJEN()
                                    ↓
                          ❌ NÃO passa itensPorPagina=100
                                    ↓
                          API CNJ (limite default desconhecido)
```

### 🎯 **Fluxo Alternativo (Backend Local)**

```
Frontend → http://localhost:3001/api/djen/publicacoes → backend/src/routes/djen.ts
                                                          ↓
                                                    buscarPublicacoesDJEN()
                                                          ↓
                                                    ❌ NÃO passa itensPorPagina=100
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **Duplicação de Schedulers** 🔴 **CRÍTICO**

- Firebase Scheduler roda às 01:00 e 09:00
- Backend node-cron roda às 01:00 e 09:00
- **Risco:** Processamento duplicado das mesmas publicações

**Solução Recomendada:**
- Em produção: **Desabilitar** backend scheduler (DJEN_SCHEDULER_ENABLED=false)
- Ou: Implementar lock distribuído (Redis) para evitar duplicação

### 2. **Falta de Paginação** 🟡 **MÉDIO**

- Schedulers não passam `itensPorPagina=100` e `pagina=1`
- API pode retornar apenas subset dos dados
- Sem loop de paginação para buscar todas as páginas

**Solução Recomendada:**
```typescript
// Adicionar aos schedulers:
url.searchParams.set("itensPorPagina", "100");
url.searchParams.set("pagina", "1");

// E implementar loop para páginas adicionais:
let pagina = 1;
let temMais = true;
while (temMais) {
  const pubs = await buscarPagina(pagina);
  if (pubs.length < 100) temMais = false;
  pagina++;
}
```

### 3. **Biblioteca djen-client.ts Não Utilizada** 🟡 **MÉDIO**

- `lib/api/djen-client.ts` tem implementação completa com paginação
- `functions/src/djen-scheduler.ts` reimplementa do zero
- Código duplicado e inconsistente

**Solução Recomendada:**
- Mover `lib/api/djen-client.ts` para pacote compartilhado
- Usar em backend e Firebase Functions

### 4. **Sem Persistência no Firebase Scheduler** 🟡 **MÉDIO**

```typescript
// functions/src/djen-scheduler.ts (linhas 133-142)
// TODO: Salvar no Firestore
// await admin.firestore().collection('expedientes').add({
//   numeroProcesso: pub.numeroProcesso,
//   ...
// });
```

**Atualmente:** Firebase Scheduler apenas busca e loga, **não persiste** no banco.

---

## ✅ CORREÇÕES A APLICAR (QUANDO DJEN ESTIVER FUNCIONANDO)

### **Mudança 1: Firebase Functions - Adicionar Paginação**

**Arquivo:** `functions/src/djen-scheduler.ts`  
**Linha:** ~50 (dentro da função `buscarPublicacoesDJEN`)

```typescript
// ANTES:
const url = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao");
url.searchParams.set("numeroOab", numeroOab);
url.searchParams.set("ufOab", ufOab);
url.searchParams.set("meio", "D");
url.searchParams.set("dataDisponibilizacaoInicio", dataInicio);
url.searchParams.set("dataDisponibilizacaoFim", dataFim || dataInicio);

// DEPOIS:
const url = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao");
url.searchParams.set("numeroOab", numeroOab);
url.searchParams.set("ufOab", ufOab);
url.searchParams.set("meio", "D");
url.searchParams.set("dataDisponibilizacaoInicio", dataInicio);
url.searchParams.set("dataDisponibilizacaoFim", dataFim || dataInicio);
url.searchParams.set("itensPorPagina", "100");  // ✅ ADICIONAR
url.searchParams.set("pagina", "1");             // ✅ ADICIONAR
```

---

### **Mudança 2: Backend - Adicionar Paginação**

**Arquivo:** `backend/src/services/djen-api.ts`  
**Linha:** ~40 (dentro da função `buscarPublicacoesDJEN`)

```typescript
// ANTES:
const url = new URL(DJEN_API_URL);
url.searchParams.set("numeroOab", params.numeroOab);
url.searchParams.set("ufOab", params.ufOab);
url.searchParams.set("meio", "D");
url.searchParams.set("dataDisponibilizacaoInicio", params.dataInicio);
url.searchParams.set("dataDisponibilizacaoFim", params.dataFim);

// DEPOIS:
const url = new URL(DJEN_API_URL);
url.searchParams.set("numeroOab", params.numeroOab);
url.searchParams.set("ufOab", params.ufOab);
url.searchParams.set("meio", "D");
url.searchParams.set("dataDisponibilizacaoInicio", params.dataInicio);
url.searchParams.set("dataDisponibilizacaoFim", params.dataFim);
url.searchParams.set("itensPorPagina", "100");  // ✅ ADICIONAR
url.searchParams.set("pagina", "1");             // ✅ ADICIONAR
```

---

### **Mudança 3: Backend Routes - Adicionar Paginação no Proxy**

**Arquivo:** `backend/src/routes/djen.ts`  
**Linha:** ~25 (dentro do handler GET `/publicacoes`)

```typescript
// ANTES:
const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?meio=D&numeroOab=${numeroOab}&ufOab=${ufOab}&dataDisponibilizacaoInicio=${dataInicioParam}&dataDisponibilizacaoFim=${dataFimParam}`;

// DEPOIS:
const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?meio=D&numeroOab=${numeroOab}&ufOab=${ufOab}&dataDisponibilizacaoInicio=${dataInicioParam}&dataDisponibilizacaoFim=${dataFimParam}&itensPorPagina=100&pagina=1`;
```

---

### **Mudança 4: Desabilitar Scheduler do Backend em Produção**

**Arquivo:** `.env` (backend)

```bash
# ADICIONAR/MODIFICAR:
DJEN_SCHEDULER_ENABLED=false  # ✅ Desabilitar para evitar duplicação com Firebase
```

**Arquivo:** `.env.production` (backend, se existir)

```bash
# ADICIONAR/MODIFICAR:
DJEN_SCHEDULER_ENABLED=false  # ✅ Desabilitar em produção
```

---

### **Mudança 5 (OPCIONAL): Implementar Loop de Paginação**

Se você espera mais de 100 publicações por dia, implemente loop:

**Arquivo:** `functions/src/djen-scheduler.ts`  
**Função:** `processarPublicacoes` (linha ~95)

```typescript
// ADICIONAR após linha 116 (antes do for loop):
let todasPublicacoes: DJENPublicacao[] = [];
let pagina = 1;
let temMais = true;

while (temMais) {
  const publicacoesPagina = await buscarPublicacoesDJEN(
    advogadoConfig.numeroOab,
    advogadoConfig.ufOab,
    dataHoje,
    dataHoje,
    pagina // passar número da página
  );
  
  if (publicacoesPagina.length === 0) break;
  
  todasPublicacoes.push(...publicacoesPagina);
  
  if (publicacoesPagina.length < 100) {
    temMais = false; // Última página
  } else {
    pagina++;
    await new Promise(r => setTimeout(r, 1000)); // Delay 1s entre páginas
  }
}

const publicacoes = todasPublicacoes;
// ... continua o código normal
```

---

## 📋 CHECKLIST DE AÇÕES

### ⚠️ **Quando DJEN estiver funcionando:**

- [ ] Aplicar Mudança 1: Paginação no Firebase Scheduler
- [ ] Aplicar Mudança 2: Paginação no Backend API
- [ ] Aplicar Mudança 3: Paginação no Backend Proxy
- [ ] Aplicar Mudança 4: Desabilitar scheduler do backend em prod
- [ ] Testar se paginação está funcionando:
  ```bash
  curl "https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=184404&ufOab=MG&meio=D&dataDisponibilizacaoInicio=2026-01-15&dataDisponibilizacaoFim=2026-01-15&itensPorPagina=100&pagina=1"
  ```
- [ ] (Opcional) Aplicar Mudança 5: Loop de paginação se necessário

### 🔧 **Melhorias Futuras (Médio Prazo)**
- [ ] Unificar código usando `lib/api/djen-client.ts`
- [ ] Implementar lock distribuído (Redis) para evitar duplicação
- [ ] Adicionar testes E2E para scheduler
- [ ] Dashboard de monitoramento de execuções
- [ ] Implementar persistência no Firestore (remover TODO)

### 📚 **Documentação**
- [ ] Atualizar `DJEN_SCHEDULER_COMPLETO.md` com info de paginação
- [ ] Documentar diferença Firebase vs Backend scheduler
- [ ] Adicionar diagrama de arquitetura ao README

---

## 📊 CONCLUSÃO

**Estado Atual:**
- ✅ Sistema funcional em produção (Firebase)
- ✅ Scheduler executando 2x/dia
- ⚠️ Paginação não implementada (risco de dados truncados)
- ⚠️ Dois schedulers rodando simultaneamente (risco de duplicação)
- ⚠️ Firebase não persiste no banco (apenas logs)

**Próximos Passos (quando DJEN funcionar):**
1. ✅ Adicionar parâmetros de paginação (`itensPorPagina=100`, `pagina=1`)
2. ✅ Desabilitar scheduler do backend em produção
3. 🔄 (Opcional) Implementar loop para múltiplas páginas
4. 🔄 (Futuro) Implementar persistência no Firestore

**Prioridade:** 🔴 **ALTA** (risco de dados truncados em dias com muitas publicações)

---

**Data da Investigação:** 15/01/2026  
**Investigador:** GitHub Copilot CLI  
**Status:** ✅ Investigação Completa - Nenhuma Alteração de Código Realizada  
**Aplicar quando:** DJEN estiver funcionando corretamente
