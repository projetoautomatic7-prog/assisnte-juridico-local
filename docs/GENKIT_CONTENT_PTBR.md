# Genkit - Geracao de Conteudo (PT-BR)

Este guia adapta a documentacao do Genkit ao contexto do Assistente Juridico PJe.
Regras do repo: modo manutencao, sem simulacao e LGPD/PII.

## Principios obrigatorios

- Use apenas dados reais do sistema/usuario (sem exemplos ficticios).
- Nao inclua textos simulados de saida ou respostas de modelo.
- Nao envie PII sem sanitizacao; evite logs com dados sensiveis.
- Configure modelos por variaveis de ambiente: `GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`.

## Configuracao basica

```ts
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model(process.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro'),
});
```

## generate() com dados reais

```ts
import { z } from 'genkit';

const LegalSummaryInputSchema = z.object({
  caseText: z.string().describe('Texto juridico real a ser analisado'),
  goal: z.string().describe('Objetivo do resumo'),
});

const LegalSummaryOutputSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
});

export async function summarizeLegalText(input: z.infer<typeof LegalSummaryInputSchema>) {
  const { output } = await ai.generate({
    model: googleAI.model(process.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro'),
    prompt: `Resuma o texto juridico a seguir focando em: ${input.goal}\n\n${input.caseText}`,
    output: { schema: LegalSummaryOutputSchema },
  });

  if (!output) {
    throw new Error('Resposta nao atende ao esquema.');
  }

  return output;
}
```

## Streaming (dados reais)

```ts
export const djenStreamingFlow = ai.defineFlow(
  {
    name: 'djenStreamingFlow',
    inputSchema: z.object({
      publicationText: z.string().describe('Publicacao real do DJEN'),
    }),
    streamSchema: z.string(),
    outputSchema: z.object({ summary: z.string() }),
  },
  async ({ publicationText }, { sendChunk }) => {
    const { stream, response } = ai.generateStream({
      model: googleAI.model(process.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro'),
      prompt: `Resuma a publicacao abaixo mantendo dados essenciais:\n\n${publicationText}`,
    });

    for await (const chunk of stream) {
      sendChunk(chunk.text);
    }

    const { text } = await response;
    return { summary: text };
  }
);
```

## Saida estruturada

```ts
const ExtractedFieldsSchema = z.object({
  numeroProcesso: z.string(),
  classe: z.string(),
  partes: z.array(z.string()),
});

const response = await ai.generate({
  model: googleAI.model(process.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro'),
  prompt: `Extraia campos do texto real do processo:\n\n${caseTextReal}`,
  output: { schema: ExtractedFieldsSchema },
});

if (!response.output) {
  throw new Error('Resposta nao atende ao esquema.');
}
```

## Middleware (boas praticas)

- Use retry/fallback apenas quando necessario e sem mudar o comportamento funcional.
- Evite logs completos do request/response para nao expor PII.

## Observabilidade e Dev UI

Use a interface do Genkit apenas com dados reais e sanitizados:

```bash
genkit start -- npm run dev
```

## Checklist rapido

- Dados reais e sanitizados
- Sem simulacao
- Sem PII em logs
- Modelos via env vars
