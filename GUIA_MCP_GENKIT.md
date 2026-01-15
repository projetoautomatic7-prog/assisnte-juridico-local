# 🚀 Guia de Integração MCP + Genkit - Assistente Jurídico PJe

**Data:** 15 de Janeiro de 2026  
**Status:** ✅ Pacote `@genkit-ai/mcp` instalado e configurado

---

## 📦 O que foi instalado?

### 1. Pacote NPM
```bash
npm install @genkit-ai/mcp
```
✅ **Instalado:** 2139 pacotes + dependências

### 2. Configuração Genkit MCP
```bash
npx genkit init:ai-tools
```
✅ **Criado:**
- `GENKIT.md` - Guia de API e boas práticas
- `.gemini/settings.json` - Configuração Gemini CLI
- `.gemini/GENKIT.md` - Symlink para GENKIT.md

---

## 🎯 O que é MCP (Model Context Protocol)?

O **MCP** permite que assistentes de IA (como Gemini CLI, Claude, Cursor) interajam diretamente com seu projeto Genkit através de **ferramentas especializadas**:

### Ferramentas MCP disponíveis:
| Ferramenta | Função |
|-----------|---------|
| `get_usage_guide` | Busca guia detalhado do Genkit |
| `lookup_genkit_docs` | Consulta docs em genkit.dev |
| `list_flows` | Lista todos os fluxos do app |
| `run_flow` | Executa um fluxo com input |
| `get_trace` | Obtém trace por ID (debug) |

---

## 🔧 Como usar no seu projeto?

### 1. **Estrutura recomendada (novo código)**
```typescript
// lib/ai/mcp-genkit-example.ts
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

// Exemplo: Análise de Processo
export const analisarProcessoFlow = ai.defineFlow(
  {
    name: 'analisarProcesso',
    inputSchema: z.object({
      numeroProcesso: z.string(),
      tipo: z.enum(['civel', 'trabalhista', 'penal']),
    }),
    outputSchema: z.object({
      resumo: z.string(),
      prazos: z.array(z.string()),
      recomendacoes: z.array(z.string()),
    }),
  },
  async (input) => {
    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-pro'),
      prompt: `Analise o processo ${input.numeroProcesso} (${input.tipo})...`,
    });

    return {
      resumo: response.text,
      prazos: ['Prazo 1', 'Prazo 2'],
      recomendacoes: ['Rec 1', 'Rec 2'],
    };
  }
);
```

### 2. **Rodando com Genkit Developer UI**
```bash
# Terminal 1: Inicia Genkit Dev UI
genkit start -- npx tsx --watch lib/ai/mcp-genkit-example.ts

# Acesse: http://localhost:4000 (padrão)
```

### 3. **Usando com Gemini CLI**
```bash
# Gemini CLI agora reconhece automaticamente os fluxos Genkit
gemini chat

> Liste os fluxos disponíveis no meu projeto Genkit
> Execute o fluxo analisarProcesso com processo 0001234-56.2024.8.13.0000
```

---

## 📚 Modelos recomendados (do guia)

### Texto/Raciocínio Avançado
```typescript
model: googleAI.model('gemini-2.5-pro')      // Google
model: 'openai/gpt-4o'                       // OpenAI
model: 'deepseek/deepseek-reasoner'          // DeepSeek
```

### Chat Rápido
```typescript
model: googleAI.model('gemini-2.5-flash')    // Google (atual no projeto)
model: 'openai/gpt-4o-mini'                  // OpenAI
```

### TTS (Text-to-Speech)
```typescript
model: googleAI.model('gemini-2.5-flash-preview-tts')
```

### Geração de Imagens
```typescript
model: googleAI.model('imagen-4.0-generate-preview-06-06')
```

---

## 🏗️ Integração com o projeto atual

### Arquivos principais do projeto:
- `lib/ai/genkit.ts` - Configuração principal
- `lib/ai/justine-flow.ts` - Agente Justine
- `lib/ai/agent-flow.ts` - Flow genérico de agentes
- `src/agents/*/` - Agentes LangGraph

### Exemplo de integração híbrida:
```typescript
// lib/ai/hybrid-flow.ts
import { ai } from './genkit';
import { AGENTS } from './agents-registry';

export const hybridAnalysisFlow = ai.defineFlow(
  {
    name: 'hybridAnalysis',
    inputSchema: z.object({
      caseId: z.string(),
      agentId: z.string(),
    }),
  },
  async (input) => {
    // 1. Usa Genkit para análise inicial
    const genkitAnalysis = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: `Análise preliminar do caso ${input.caseId}`,
    });

    // 2. Encaminha para agente LangGraph especializado
    const langGraphAgent = AGENTS[input.agentId];
    const deepAnalysis = await langGraphAgent.execute({
      preliminaryAnalysis: genkitAnalysis.text,
      caseId: input.caseId,
    });

    return {
      preliminary: genkitAnalysis.text,
      detailed: deepAnalysis,
    };
  }
);
```

---

## ⚠️ Avisos importantes (do guia oficial)

### ❌ NÃO faça:
1. **Não rode `genkit start` através de assistentes IA** - Isso trava a thread
2. **Não use `any` ou mocks** - Siga as regras do projeto (strict typing, sem simulações)
3. **Não crie múltiplos arquivos de config** - Use estrutura single-file quando possível

### ✅ FAÇA:
1. **Consulte documentação** - Use MCP tools ou web search
2. **Siga estrutura do projeto** - Não altere arquitetura sem necessidade
3. **Use tipagem estrita** - Sempre defina schemas Zod

---

## 🧪 Testando a integração

### Teste 1: Listar fluxos
```bash
# Terminal 1
genkit start -- npx tsx --watch lib/ai/genkit.ts

# Terminal 2 (ou Gemini CLI)
curl http://localhost:4000/api/__health
```

### Teste 2: Executar flow via MCP
```bash
# Via Gemini CLI (se configurado)
gemini chat
> Execute o flow 'justineFlow' com expedienteId: '123'
```

### Teste 3: Trace de debug
```bash
# Acessar Dev UI
http://localhost:4000

# Buscar por trace ID após execução
```

---

## 📖 Recursos adicionais

- **Documentação oficial:** https://genkit.dev
- **Servidor MCP Genkit:** https://github.com/firebase/genkit/tree/main/js/mcp-server
- **Gemini CLI:** https://github.com/google/gemini-cli
- **Arquivo de contexto:** `GENKIT.md` (raiz do projeto)

---

## 🎓 Próximos passos sugeridos

1. ✅ **Concluído:** Instalar `@genkit-ai/mcp`
2. ✅ **Concluído:** Configurar `genkit init:ai-tools`
3. ⏳ **Pendente:** Criar flow Genkit de exemplo
4. ⏳ **Pendente:** Testar integração com Gemini CLI
5. ⏳ **Pendente:** Integrar com agentes LangGraph existentes
6. ⏳ **Pendente:** Configurar observabilidade (traces)

---

## 🐛 Troubleshooting

### Problema: `genkit start` não inicia
**Solução:** Verifique se o arquivo de entrada existe e está compilando
```bash
npx tsc --noEmit --skipLibCheck
```

### Problema: MCP tools não aparecem no Gemini CLI
**Solução:** Reinicie o Gemini CLI
```bash
gemini restart
```

### Problema: Flow não aparece na lista
**Solução:** Certifique-se de exportar o flow e de estar no arquivo correto
```typescript
export const myFlow = ai.defineFlow({ ... });
```

---

**Última atualização:** 15/01/2026 00:33 UTC  
**Versão Genkit:** 1.20.0  
**Status:** ✅ Pronto para uso
