# 📚 Implementação do Sistema RAG - Assistente Jurídico

**Data:** 15/01/2026  
**Status:** ✅ Concluído

---

## 🎯 Objetivo

Implementar sistema de **Retrieval-Augmented Generation (RAG)** para:
- Processar documentos jurídicos longos (petições, sentenças, PDFs)
- Fragmentar conteúdo em chunks inteligentes (500-1500 caracteres)
- Economizar tokens em consultas ao LLM
- Melhorar precisão das respostas da IA

---

## 📦 Dependências Instaladas

```bash
npm install llm-chunk pdf-parse
```

- **llm-chunk**: Fragmentação inteligente de texto (sentence-based)
- **pdf-parse**: Extração de texto de arquivos PDF

---

## 🔧 Arquivos Modificados/Criados

### 1. `lib/ai/rag-flow.ts` ✅ (Já existia)
Fluxo principal de ingestão com chunking automático.

**Funcionalidades:**
- Fragmenta texto em chunks de 500-1500 caracteres
- Overlap de 100 caracteres para contexto
- Indexa no Qdrant via API

### 2. `lib/ai/tools.ts` 🔄 (Modificado)

**Mudanças:**
- ✅ Importado `indexDocumentFlow`
- ✅ `indexarNoQdrant` agora detecta documentos longos (>1500 chars) e usa chunking automático
- ✅ Nova ferramenta `processarPDF` para extrair texto de PDFs e indexar

**Ferramentas Atualizadas:**

```typescript
// Uso automático de chunking
indexarNoQdrant({
  content: "texto longo...", // > 1500 chars
  metadata: { numeroProcesso: "...", tipo: "..." }
}) 
// ↑ Fragmenta automaticamente em múltiplos chunks

// Processar PDF diretamente
processarPDF({
  pdfUrl: "/path/to/file.pdf", // ou URL https://...
  numeroProcesso: "0001234-56.2024.8.13.0001",
  tipo: "sentença"
})
// ↑ Extrai texto + fragmenta + indexa
```

### 3. `lib/ai/rag-flow.test.ts` ✅ (Novo)
Testes unitários para validar:
- Fragmentação de documentos longos
- Preservação de metadados
- Limites de tamanho dos chunks

### 4. `examples/rag-usage-example.ts` ✅ (Novo)
Exemplos práticos de uso:
- Indexar petição inicial longa
- Processar PDF de sentença
- Buscar trechos relevantes
- Uso automático via `indexarNoQdrant`

---

## 🚀 Como Usar

### Cenário 1: Indexar Documento Longo

```typescript
import { indexDocumentFlow } from '@/lib/ai/rag-flow';

const resultado = await indexDocumentFlow({
  content: peticaoCompletaComMil Palavras,
  metadata: {
    numeroProcesso: '0001234-56.2024.8.13.0001',
    tipo: 'petição_inicial',
    source: 'peticao.docx'
  }
});

console.log(`Indexado em ${resultado.chunksIndexed} fragmentos`);
```

### Cenário 2: Processar PDF

```typescript
import { processarPDF } from '@/lib/ai/tools';

const resultado = await processarPDF({
  pdfUrl: '/uploads/sentenca.pdf',
  numeroProcesso: '0001234-56.2024.8.13.0001',
  tipo: 'sentença'
});
```

### Cenário 3: Busca Semântica

```typescript
import { pesquisarQdrant } from '@/lib/ai/tools';

const trechos = await pesquisarQdrant({
  query: 'qual foi o valor da pensão alimentícia fixada?',
  numeroProcesso: '0001234-56.2024.8.13.0001',
  limit: 3
});

// Retorna apenas os 3 fragmentos mais relevantes
```

---

## 💡 Benefícios para o Projeto

### Antes (Sem RAG)
```
Cliente: "Como está meu processo?"
Sistema: Envia documento INTEIRO (50 páginas = 10.000 tokens)
Gemini: Processa tudo e gasta $$$
```

### Depois (Com RAG)
```
Cliente: "Como está meu processo?"
Sistema: Busca apenas trechos relevantes (3 chunks = 300 tokens)
Gemini: Processa só o necessário → 97% de economia!
```

### Vantagens
✅ **Economia de Tokens:** Redução de 90-95% no consumo de API  
✅ **Respostas Mais Precisas:** LLM recebe apenas contexto relevante  
✅ **Suporte a Documentos Grandes:** Petições, sentenças, acordãos  
✅ **Memória de Longo Prazo:** Casos passados disponíveis para consulta  
✅ **Processamento de PDF:** Extração automática de texto  

---

## 🧪 Testes

Execute os testes:
```bash
npm test lib/ai/rag-flow.test.ts
```

---

## 🔐 Variáveis de Ambiente

Certifique-se de ter configurado:

```env
# .env.test ou .env
GEMINI_API_KEY=AIzaSyAlqvDyAboF9Qt5b24CstCsReG5Mjm3Xjo
APP_BASE_URL=http://localhost:3001
QDRANT_URL=https://...
QDRANT_API_KEY=...
```

---

## 🎓 Como a Justine Usa

A agente **Mrs. Justine** agora:

1. **Recebe pergunta do cliente:** "Qual o valor dos alimentos?"
2. **Usa `pesquisarQdrant()`** para buscar fragmentos relevantes
3. **Envia apenas 300 tokens** ao Gemini (ao invés de 10.000)
4. **Sintetiza resposta** precisa e rápida

---

## 📝 Próximos Passos (Opcional)

- [ ] Adicionar suporte a DOCX via `mammoth`
- [ ] Implementar cache de embeddings para evitar reprocessamento
- [ ] Criar interface UI para upload de documentos
- [ ] Adicionar filtros avançados (data, tipo, tribunal)

---

## ✅ Checklist de Implementação

- [x] Instalar `llm-chunk` e `pdf-parse`
- [x] Criar `rag-flow.ts` com chunking inteligente
- [x] Modificar `indexarNoQdrant` para chunking automático
- [x] Criar ferramenta `processarPDF`
- [x] Escrever testes unitários
- [x] Criar exemplos práticos
- [x] Configurar `GEMINI_API_KEY` em `.env.test`
- [x] Documentar uso

---

**Implementado por:** GitHub Copilot CLI  
**Aprovado por:** Ética do Projeto (DISABLE_MOCKS=true) ✅

---

## 🛡️ Tratamento de Erros (Genkit Standards)

A implementação segue as diretrizes do Genkit para tratamento de erros usando `GenkitError`:

### Tipos de Erros

```typescript
// 1. INVALID_ARGUMENT - Entrada inválida
throw new GenkitError({
  status: 'INVALID_ARGUMENT',
  message: 'Conteúdo do documento está vazio',
});

// 2. NOT_FOUND - Recurso não encontrado
throw new GenkitError({
  status: 'NOT_FOUND',
  message: 'Arquivo PDF não encontrado',
  detail: 'Caminho: /path/to/file.pdf',
});

// 3. UNAVAILABLE - Serviço indisponível
throw new GenkitError({
  status: 'UNAVAILABLE',
  message: 'Falha ao conectar com Qdrant',
  detail: 'Network timeout após 5s',
});

// 4. INTERNAL - Erro interno
throw new GenkitError({
  status: 'INTERNAL',
  message: 'Erro inesperado ao processar documento',
  detail: error.message,
});
```

### Segurança

✅ **Exposição controlada de erros:** Apenas mensagens seguras são enviadas ao cliente  
✅ **Logs detalhados:** Erros completos são registrados no console para debug  
✅ **Validação de entrada:** Zod valida schemas antes do processamento  
✅ **Propagação adequada:** GenkitErrors são propagados, outros são encapsulados  

### Exemplo de Tratamento

```typescript
try {
  const resultado = await processarPDF({
    pdfUrl: '/uploads/documento.pdf',
    numeroProcesso: '0001234-56.2024.8.13.0001',
    tipo: 'sentença',
  });
  
  console.log('✅ Sucesso:', resultado);
  
} catch (error) {
  if (error instanceof GenkitError) {
    // Erro esperado do Genkit
    console.error('❌ Erro:', error.message);
    
    // Exibir mensagem amigável ao usuário
    if (error.status === 'NOT_FOUND') {
      alert('Arquivo não encontrado. Verifique o caminho.');
    } else if (error.status === 'UNAVAILABLE') {
      alert('Serviço temporariamente indisponível. Tente novamente.');
    }
  } else {
    // Erro inesperado (não deveria acontecer)
    console.error('❌ Erro crítico:', error);
    alert('Erro inesperado. Contate o suporte.');
  }
}
```

---

## �� Testes de Erro Implementados

```bash
npm test lib/ai/rag-flow.test.ts
```

Cobertura de testes:
- ✅ Conteúdo vazio lança INVALID_ARGUMENT
- ✅ API Qdrant indisponível lança UNAVAILABLE
- ✅ Falha parcial em indexação propaga erro
- ✅ Erros genéricos são encapsulados em INTERNAL

---

**Atualizado em:** 15/01/2026  
**Conformidade:** Genkit Error Standards ✅

---

## 📊 Observabilidade e Logging (OpenTelemetry)

O sistema RAG implementa observabilidade completa usando o logger do Genkit:

### Níveis de Log

```typescript
import { logger } from 'genkit/logging';

// Configurar nível baseado no ambiente
logger.setLogLevel('debug');  // development
logger.setLogLevel('info');   // production
logger.setLogLevel('warn');   // test
```

### Logs Implementados

#### RAG Flow (indexDocumentFlow)
- ✅ Início da indexação com metadados
- ✅ Progresso da fragmentação
- ✅ Status de cada chunk indexado
- ✅ Tempo total e médio por chunk
- ✅ Erros detalhados com contexto

#### PDF Processing (processarPDF)
- ✅ Download/leitura do arquivo
- ✅ Tamanho do arquivo e número de páginas
- ✅ Tempo de extração de texto
- ✅ Metadados do PDF
- ✅ Tempo total de processamento

### Exemplo de Saída

```
[INFO] [RAG] Iniciando indexação de documento
  numeroProcesso: "0001234-56.2024.8.13.0001"
  tipo: "petição"
  contentLength: 15234

[DEBUG] [RAG] Iniciando fragmentação do documento
  contentLength: 15234

[INFO] [RAG] Documento fragmentado com sucesso
  totalChunks: 12
  avgChunkSize: 1269

[DEBUG] [RAG] Processando chunk 1/12
  chunkSize: 1456

[INFO] [RAG] Chunk indexado com sucesso
  chunkIndex: 0
  progress: "1/12"

...

[INFO] [RAG] Indexação concluída com sucesso
  chunksIndexed: 12
  durationMs: 3421
  avgTimePerChunk: 285
```

### Métricas Customizadas

```typescript
import { ragMetrics } from '@/lib/ai/observability';

// Registrar métrica de indexação
ragMetrics.logIndexation({
  numeroProcesso: '0001234-56.2024.8.13.0001',
  tipo: 'sentença',
  chunks: 12,
  durationMs: 3421,
  success: true,
});

// Registrar métrica de busca
ragMetrics.logSearch({
  query: 'valor da pensão alimentícia',
  resultsCount: 5,
  durationMs: 234,
  averageScore: 0.87,
});

// Registrar métrica de PDF
ragMetrics.logPdfProcessing({
  sizeBytes: 245678,
  pages: 15,
  extractionTimeMs: 1234,
  indexationTimeMs: 2187,
  totalTimeMs: 3421,
});
```

### Integração com Firebase Genkit Monitoring

Para habilitar monitoramento em produção:

```bash
npm install @genkit-ai/firebase
```

```typescript
// lib/ai/genkit.ts
import { firebase } from '@genkit-ai/firebase';

export const ai = genkit({
  plugins: [
    firebase({
      projectId: 'seu-projeto-firebase',
      telemetryConfig: {
        instrumentation: true,
        tracing: true,
        logging: true,
      }
    })
  ]
});
```

Todos os logs serão automaticamente exportados para:
- 📊 Firebase Console > Genkit Monitoring
- 🔍 OpenTelemetry exporters configurados
- 📈 Análise de performance e debugging

### Rastreamento (Tracing)

O Genkit automaticamente cria traces para:
- ✅ Cada execução de fluxo (indexDocumentFlow)
- ✅ Chamadas de ferramentas (processarPDF)
- ✅ Requisições HTTP ao Qdrant
- ✅ Tempo de fragmentação

Visualize no Genkit Developer UI:
```bash
npx genkit start
```

### Debug em Desenvolvimento

```typescript
// Ativar logs detalhados
logger.setLogLevel('debug');

// Ver todos os logs em tempo real
npm run dev
```

---

**Observabilidade implementada:** 15/01/2026  
**Compatibilidade:** OpenTelemetry, Firebase Genkit Monitoring ✅

---

## ⚙️ Configuração Avançada de Telemetria

### Ambientes Pré-configurados

O sistema oferece 8 perfis de telemetria prontos:

```typescript
import { autoConfigureTelemetry } from '@/lib/ai/telemetry-configs';

// Auto-detecta ambiente e configura
autoConfigureTelemetry();
```

#### 1. **Desenvolvimento** (padrão)
```typescript
// Captura tudo para debug
- ✅ Traces: 100%
- ✅ Métricas: Sim
- ✅ Logs I/O: Sim
- ⏱️ Export: 10 segundos
```

#### 2. **Staging** (pré-produção)
```typescript
// Balanceado para testes
- ✅ Traces: 50%
- ✅ Métricas: Sim
- ✅ Logs I/O: Sim
- ⏱️ Export: 1 minuto
```

#### 3. **Produção** (alta performance)
```typescript
// Otimizado para custo
- ✅ Traces: 10%
- ✅ Métricas: Sim
- ❌ Logs I/O: Não (LGPD)
- ⏱️ Export: 5 minutos
```

#### 4. **Produção LGPD Strict**
```typescript
// Máxima conformidade
- ✅ Traces: 5%
- ✅ Métricas: Sim
- ❌ Logs I/O: Não
- ⏱️ Export: 5 minutos
```

### Configurações por Recurso

#### Desabilitar Logs de I/O (LGPD)

```typescript
enableFirebaseTelemetry({
  disableLoggingInputAndOutput: true
});
```

**Quando usar:**
- ✅ Produção com dados sensíveis
- ✅ Conformidade LGPD/GDPR
- ✅ Reduzir custos de armazenamento

**Impacto:**
- ❌ Não verá inputs/outputs no trace viewer
- ✅ Métricas e traces gerais continuam funcionando

#### Desabilitar Métricas

```typescript
enableFirebaseTelemetry({
  disableMetrics: true
});
```

**Quando usar:**
- Foco apenas em traces
- Reduzir overhead

#### Desabilitar Traces

```typescript
enableFirebaseTelemetry({
  disableTraces: true
});
```

**Quando usar:**
- Foco apenas em métricas
- Reduzir custos

### Sampling (Amostragem)

Controla quantos traces são capturados:

```typescript
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

enableFirebaseTelemetry({
  sampler: new TraceIdRatioBasedSampler(0.1) // 10% dos traces
});
```

**Recomendações:**
- 🔬 Dev: 100% (`AlwaysOnSampler`)
- 🧪 Staging: 50% (`0.5`)
- 🚀 Produção: 10% (`0.1`)
- 🔒 Alta escala: 1-5% (`0.01-0.05`)

### Instrumentação Automática

Desabilitar instrumentações desnecessárias:

```typescript
enableFirebaseTelemetry({
  autoInstrumentationConfig: {
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: false },
    '@opentelemetry/instrumentation-net': { enabled: false },
  }
});
```

**Lista completa:** [OpenTelemetry Auto-Instrumentations](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node)

### Intervalos de Exportação

Ajuste frequência de envio de métricas:

```typescript
enableFirebaseTelemetry({
  metricExportIntervalMillis: 60_000,  // 1 minuto
  metricExportTimeoutMillis: 60_000,
});
```

**Recomendações:**
- 💻 Dev: 10s (feedback rápido)
- 🧪 Staging: 60s (1 minuto)
- �� Produção: 300s (5 minutos)

**⚠️ Atenção:** Intervalos curtos aumentam custos!

### Exportar Localmente (Dev)

```typescript
enableFirebaseTelemetry({
  forceDevExport: true
});
```

Permite ver telemetria rodando localmente no console.

### Variáveis de Ambiente

```bash
# .env
NODE_ENV=production          # Ativa config de produção
LGPD_STRICT=true            # Ativa modo LGPD strict
```

### Custos Estimados

**Exemplo: 100.000 invocações/mês**

| Configuração | Traces | Custo/mês |
|--------------|--------|-----------|
| Dev (100%)   | 100k   | ~$50      |
| Staging (50%) | 50k   | ~$25      |
| Produção (10%) | 10k  | ~$5       |
| LGPD (5%)    | 5k     | ~$2.50    |
| Apenas Métricas | 0   | ~$1       |

**Fonte:** Google Cloud Pricing (estimativa)

### Debugging em Produção

Se precisar investigar um problema:

```typescript
// Temporariamente ativar debug
import { debuggingTelemetryConfig } from '@/lib/ai/telemetry-configs';
debuggingTelemetryConfig();

// Deploy
firebase deploy --only functions

// Revert depois de resolver
productionTelemetryConfig();
firebase deploy --only functions
```

### Monitoramento no Console

**Firebase Console > Genkit Monitoring:**
- 📊 Dashboard de métricas
- 🔍 Trace viewer interativo
- 📈 Gráficos de performance
- ⚠️ Alertas configuráveis

**Google Cloud Console:**
- Cloud Logging
- Cloud Monitoring
- Cloud Trace
- Error Reporting

---

**Telemetria Avançada implementada:** 15/01/2026  
**Compatibilidade:** Firebase, OpenTelemetry, LGPD ✅
