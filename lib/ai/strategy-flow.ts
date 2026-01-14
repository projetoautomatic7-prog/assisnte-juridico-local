import { z } from 'zod';
import { AGENTS } from './agents-registry';
import { AgentResponseSchema, ai } from './genkit';
import { consultarProcessoPJe, registrarLogAgente } from './tools';

/**
 * Fluxo de Estratégia Processual
 * Utiliza Roteamento Condicional para adaptar a estratégia à fase do processo.
 */
export const strategyFlow = ai.defineFlow(
  {
    name: 'strategyFlow',
    inputSchema: z.object({ 
      numeroProcesso: z.string(),
      history: z.array(z.any()).optional()
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    const persona = AGENTS['estrategia-processual'];

    // 1. Obter dados reais do processo
    const processData = await consultarProcessoPJe.run({
      numeroProcesso: input.numeroProcesso
    });

    // 2. Roteamento Condicional: Classificar a fase/situação para decidir o caminho
    const classification = await ai.generate({
      prompt: `Com base nos dados deste processo, classifique a situação atual em um dos caminhos estratégicos: 
      'CONHECIMENTO' (produção de provas), 'RECURSAL' (instâncias superiores) ou 'EXECUCAO' (cobrança/satisfação).
      Dados: ${JSON.stringify(processData)}`,
      output: {
        schema: z.object({
          path: z.enum(['CONHECIMENTO', 'RECURSAL', 'EXECUCAO']),
          reasoning: z.string(),
        }),
      },
    });

    const path = classification.output?.path;
    let strategicPrompt = '';

    // 3. Execução baseada no roteamento
    if (path === 'EXECUCAO') {
      strategicPrompt = `O processo está em fase de EXECUÇÃO. Foque em ferramentas de penhora (SisbaJud, ReiteraJud), 
      localização de bens e satisfação do crédito.`;
    } else if (path === 'RECURSAL') {
      strategicPrompt = `O processo está em fase RECURSAL. Foque em teses de tribunais superiores (STJ/STF), 
      prequestionamento e busca de precedentes no Qdrant.`;
    } else {
      strategicPrompt = `O processo está em fase de CONHECIMENTO. Foque em instrução probatória, 
      audiências e teses de mérito fundamentadas.`;
    }

    // 4. Geração da Recomendação Final usando a Persona do Registro
    const finalStrategy = await ai.generate({
      system: persona.systemPrompt,
      messages: input.history,
      prompt: `
        Caminho Estratégico Identificado: ${path}
        Contexto Adicional: ${strategicPrompt}
        
        Analise os dados do processo e forneça a recomendação final:
        ${JSON.stringify(processData)}
      `,
      // O Agente de Estratégia pode usar ferramentas se o prompt do sistema permitir
      tools: [consultarProcessoPJe],
    });

    // 5. Telemetria e Log
    await registrarLogAgente.run({
      agentId: 'estrategia-processual',
      action: `strategy-path-${path}`,
      details: { path, analysis: finalStrategy.text }
    });

    return {
      answer: finalStrategy.text,
      usedTools: ['consultarProcessoPJe'],
      metadata: {
        processo: input.numeroProcesso,
        auditId: 'strategy-' + Date.now()
      }
    };
  }
);