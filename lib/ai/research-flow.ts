import { z } from 'zod';
import { ai, AgentResponseSchema } from './genkit';
import { AGENTS } from './agents-registry';

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
    // Na V2, esta chamada será substituída por um crawler real ou API paga.
    return {
      ementas: [`Precedente vinculante sobre ${input.tema}: Entendimento consolidado favorável à tese...`],
      links: ['https://www.stj.jus.br/jurisprudencia/exemplo']
    };
  }
);

export const researchFlow = ai.defineFlow(
  {
    name: 'researchFlow',
    inputSchema: z.object({
      tema: z.string(),
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    const persona = AGENTS['pesquisa-juris'];
    const response = await ai.generate({
      system: persona.systemPrompt,
      prompt: `Realize uma pesquisa jurisprudencial exaustiva sobre: ${input.tema}`,
      tools: [buscarJurisprudencia],
    });

    return { answer: response.text };
  }
);