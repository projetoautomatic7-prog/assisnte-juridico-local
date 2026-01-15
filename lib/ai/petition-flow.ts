import { z } from 'zod';
import { AGENTS } from './agents-registry';
import { AgentResponseSchema, ai } from './genkit';
import { consultarProcessoPJe, indexarNoQdrant, pesquisarQdrant, registrarLogAgente } from './tools';

/**
 * Fluxo de Redação de Petições
 * Implementa o padrão de Refinamento Iterativo (Evaluator/Optimizer).
 */
export const petitionFlow = ai.defineFlow(
  {
    name: 'petitionFlow',
    inputSchema: z.object({
      numeroProcesso: z.string(),
      instrucoes: z.string().optional(),
      history: z.array(z.any()).optional(),
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input, { context }) => {
    const persona = AGENTS['redacao-peticoes'];
    let attempts = 0;
    let currentDraft = '';
    const auditId = (context?.auditId as string) || 'v2-draft-' + Date.now();

    // 1. Execução Paralela: Busca contexto do PJe e teses similares no Qdrant simultaneamente
    const { processData, internalKnowledge } = await ai.run('fetch-full-context', async () => {
      const [pje, qdrant] = await Promise.all([
        consultarProcessoPJe.run({ numeroProcesso: input.numeroProcesso }),
        pesquisarQdrant.run({ query: input.instrucoes || 'petição inicial' })
      ]);
      return { processData: pje, internalKnowledge: qdrant };
    });

    // 2. Geração Inicial (Optimizer - Turno 1)
    const initialResponse = await ai.generate({
      system: persona.systemPrompt,
      messages: input.history, // Injeta o histórico da sessão
      prompt: `Redija uma minuta de petição profissional para o processo ${input.numeroProcesso}. 
      
      CONTEXTO DOS AUTOS:
      ${JSON.stringify(processData)}
      
      CONHECIMENTO INTERNO (TESES SIMILARES):
      ${JSON.stringify(internalKnowledge)}
      
      Instruções específicas do advogado: ${input.instrucoes || 'Seguir rito padrão para o andamento atual.'}`,
      tools: [consultarProcessoPJe],
    });
    currentDraft = initialResponse.text;

    // 3. Ciclo de Refinamento (Evaluator/Optimizer)
    await ai.run('iterative-refinement', async () => {
      while (attempts < 2) {
        // O "Avaliador" critica a peça
        const evaluation = await ai.generate({
          prompt: `Você é um Revisor Jurídico Sênior. Critique a minuta de petição abaixo.
          Critérios:
          - Fundamentação legal sólida (CPC/15, CC/02, etc).
          - Clareza dos pedidos e causa de pedir.
          - Tom persuasivo e técnico.
          - Verificação de placeholders não preenchidos (ex: [NOME]).
          
          Minuta: ${currentDraft}`,
          output: {
            schema: z.object({
              isSatisfactory: z.boolean(),
              feedback: z.string().describe('Feedback detalhado para melhoria'),
            }),
          },
        });

        if (evaluation.output?.isSatisfactory) break;

        // O "Otimizador" (Agente original) refina com base no feedback
        const refined = await ai.generate({
          system: persona.systemPrompt,
          prompt: `Refine sua minuta de petição anterior com base nestas críticas: ${evaluation.output?.feedback}.
          Mantenha o que está bom e corrija os pontos apontados.
          Minuta anterior: ${currentDraft}`,
        });

        currentDraft = refined.text;
        attempts++;
      }
    });

    // 4. Alimentar a Memória (Qdrant) com a petição finalizada
    await indexarNoQdrant.run({
      content: currentDraft,
      metadata: {
        tipo: 'petition-draft',
        numeroProcesso: input.numeroProcesso,
      }
    });

    // 5. Registro e Telemetria
    await registrarLogAgente.run({
      agentId: 'redacao-peticoes',
      action: 'iterative-drafting',
      details: { numeroProcesso: input.numeroProcesso, attempts }
    });

    return {
      answer: currentDraft,
      steps: attempts + 1,
      usedTools: ['consultarProcessoPJe', 'indexarNoQdrant'],
      metadata: {
        processo: input.numeroProcesso,
        auditId
      }
    };
  }
);