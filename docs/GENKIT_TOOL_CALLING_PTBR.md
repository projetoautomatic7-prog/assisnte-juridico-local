# Genkit - Chamada de Ferramentas (PT-BR)

Guia adaptado ao Assistente Juridico PJe.
Regras do repo: modo manutencao, sem simulacao e LGPD/PII.

## Principios obrigatorios

- Use apenas dados reais do sistema/usuario (sem exemplos ficticios).
- Nao inclua saidas simuladas.
- Nao exponha PII; sanitize antes de enviar ao modelo ou registrar logs.
- Use env vars (`GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`) e nao hardcode.

## Visao geral

A chamada de ferramentas permite que o modelo solicite a execucao de funcoes no seu app.
Isso e util quando o LLM precisa de dados reais (ex.: DJEN, processos, minutas) ou quando
voce quer garantir determinismo em passos sensiveis.

## Definindo ferramentas (com dados reais)

```ts
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model(process.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro'),
});

const getProcessSummary = ai.defineTool(
  {
    name: 'getProcessSummary',
    description: 'Busca um resumo real de um processo existente no sistema',
    inputSchema: z.object({
      processId: z.string().describe('ID real do processo'),
    }),
    outputSchema: z.object({
      summary: z.string(),
      lastUpdate: z.string(),
    }),
  },
  async ({ processId }) => {
    return await fetchProcessSummaryFromDb(processId);
  },
);
```

## Usando ferramentas com generate()

```ts
const response = await ai.generate({
  prompt: 'Responda com base no resumo real do processo.',
  tools: [getProcessSummary],
});
```

## Prompt com ferramentas (exemplo de uso)

```ts
const processPrompt = ai.definePrompt(
  {
    name: 'processPrompt',
    tools: [getProcessSummary],
  },
  'Analise o processo {{processId}} e destaque pontos criticos.',
);

const response = await processPrompt({ processId: PROCESSO_REAL_ID });
```

## Streaming com ferramentas

```ts
const { stream } = ai.generateStream({
  prompt: 'Analise o processo e envie um resumo progressivo.',
  tools: [getProcessSummary],
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

## Limitando iteracoes com maxTurns

Use `maxTurns` para evitar loops excessivos e controlar custo/latencia:

```ts
const response = await ai.generate({
  prompt: 'Reuna informacoes reais do processo e da minuta associada.',
  tools: [getProcessSummary, getDraftByProcessId],
  maxTurns: 6,
});
```

## Ferramentas dinamicas (com cautela)

Ferramentas dinamicas nao aparecem no Dev UI e devem ser usadas apenas quando
necessario. Elas ainda precisam trabalhar com dados reais.

```ts
import { tool } from 'genkit';

ai.defineFlow('processFlow', async () => {
  const getProcess = tool(
    {
      name: 'getProcess',
      description: 'Busca dados reais do processo',
      inputSchema: z.object({ processId: z.string() }),
      outputSchema: z.object({ data: z.string() }),
    },
    async ({ processId }) => {
      return await fetchProcessRaw(processId);
    },
  );

  const { text } = await ai.generate({
    prompt: 'Analise o processo informado.',
    tools: [getProcess],
  });

  return text;
});
```

## Interrupcoes (confirmacao humana)

Use interrupcoes para acoes sensiveis (ex.: protocolar peticao, enviar notificacao).
Isso permite pedir confirmacao humana antes de continuar.

## Observacoes de LGPD/PII

- Nunca envie dados sensiveis sem sanitizacao.
- Evite logs de entradas/saidas completas do modelo.
- Registre apenas metadados minimos necessarios.

