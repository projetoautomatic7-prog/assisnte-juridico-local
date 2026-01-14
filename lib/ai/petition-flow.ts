import { z } from 'zod';
import { AGENTS } from './agents-registry';
import { AgentResponseSchema, ai } from './genkit';
import { consultarProcessoPJe, indexarNoQdrant, registrarLogAgente } from './tools';

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
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    const persona = AGENTS['redacao-peticoes'];
    let attempts = 0;
    let currentDraft = '';

    // 1. Obter contexto real do processo para fundamentação
    const processData = await consultarProcessoPJe.run({
      numeroProcesso: input.numeroProcesso
    });

    // 2. Geração Inicial (Optimizer - Turno 1)
    const initialResponse = await ai.generate({
      system: persona.systemPrompt,
      prompt: `Redija uma minuta de petição profissional para o processo ${input.numeroProcesso}. 
      Contexto atual dos autos: ${JSON.stringify(processData)}
      Instruções específicas do advogado: ${input.instrucoes || 'Seguir rito padrão para o andamento atual.'}`,
      tools: [consultarProcessoPJe],
    });
    currentDraft = initialResponse.text;

    // 3. Ciclo de Refinamento (Evaluator/Optimizer)
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

    // 4. Alimentar a Memória (Qdrant) com a petição finalizada
    await indexarNoQdrant.run({
      content: currentDraft,
      metadata: {
        type: 'petition-draft',
        processNumber: input.numeroProcesso,
        date: new Date().toISOString()
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
        auditId: 'v2-draft-' + Date.now()
      }
    };
  }
);