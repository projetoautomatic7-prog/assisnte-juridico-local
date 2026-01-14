import { z } from 'zod';
import { AGENTS } from './agents-registry';
import { AgentResponseSchema, ai } from './genkit';
import { consultarProcessoPJe, registrarLogAgente } from './tools';

export const riskAnalysisFlow = ai.defineFlow(
  {
    name: 'riskAnalysisFlow',
    inputSchema: z.object({ 
      numeroProcesso: z.string(),
      history: z.array(z.any()).optional()
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    const persona = AGENTS['analise-risco'];
    let attempts = 0;
    let currentAnalysis = '';

    // 1. Geração Inicial usando o Prompt Personalizado do Registro
    const initialResponse = await ai.generate({
      system: persona.systemPrompt,
      messages: input.history,
      prompt: `Realize a análise de risco completa para o processo ${input.numeroProcesso}`,
      tools: [consultarProcessoPJe],
    });
    currentAnalysis = initialResponse.text;

    // 2. Refinamento Iterativo (Padrão Agentivo)
    while (attempts < 2) {
      const critique = await ai.generate({
        prompt: `Avalie se esta análise de risco é conservadora o suficiente e se considerou impactos financeiros. 
        Análise: ${currentAnalysis}`,
        output: {
          schema: z.object({
            isSatisfactory: z.boolean(),
            suggestions: z.string(),
          }),
        },
      });

      if (critique.output?.isSatisfactory) break;

      const refined = await ai.generate({
        system: persona.systemPrompt,
        prompt: `Refine sua análise anterior com base nestas sugestões: ${critique.output?.suggestions}. 
        Análise original: ${currentAnalysis}`,
      });

      currentAnalysis = refined.text;
      attempts++;
    }

    await registrarLogAgente.run({ agentId: 'analise-risco', action: 'risk-analysis', details: currentAnalysis });

    return {
      answer: currentAnalysis,
      steps: attempts + 1,
      usedTools: ['consultarProcessoPJe']
    };
  }
);