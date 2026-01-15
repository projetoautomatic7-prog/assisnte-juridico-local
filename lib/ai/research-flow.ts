import { z } from 'zod';
import { AGENTS } from './agents-registry.js';
import { AgentResponseSchema, ai } from './genkit.js';

/**
 * Tool para busca de jurisprudência.
 * Integra com APIs de tribunais ou serviços de busca jurídica.
 */
export const buscarJurisprudencia = ai.defineTool(
  {
    name: 'buscarJurisprudencia',
    description: 'Busca jurisprudência e precedentes nos tribunais superiores (STF, STJ).',
    inputSchema: z.object({
      tema: z.string().describe('O tema jurídico para pesquisa'),
      tribunal: z.string().optional().describe('Tribunal específico (ex: STJ)'),
    }),
    outputSchema: z.object({
      ementas: z.array(z.string()),
      links: z.array(z.string()).optional(),
    }),
  },
  async (input) => {
    const res = await fetch(`${process.env.APP_BASE_URL}/api/legal-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search-jurisprudence', query: input.tema, tribunal: input.tribunal }),
    });

    if (!res.ok) throw new Error('Falha na consulta real de jurisprudência (DataJud)');
    const data = await res.json();
    return data;
  }
);

export const researchFlow = ai.defineFlow(
  {
    name: 'researchFlow',
    inputSchema: z.object({
      tema: z.string(),
      history: z.array(z.any()).optional()
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    const persona = AGENTS['pesquisa-juris'];
    const response = await ai.generate({
      system: persona.systemPrompt,
      messages: input.history,
      prompt: `Realize uma pesquisa jurisprudencial exaustiva sobre: ${input.tema}`,
      tools: [buscarJurisprudencia],
    });

    return {
      answer: response.text,
      usedTools: (response as any).toolCalls?.map((tc: any) => tc.name)
    };
  }
);