import { z } from 'zod';
import { AGENTS, AgentId } from './agents-registry';
import { AgentResponseSchema, ai } from './genkit';
import { ALL_TOOLS } from './tools';

/**
 * Este fluxo substitui o SimpleAgent.run() manual.
 * Ele carrega a persona do registro e mantém o prompt original.
 */
export const agentFlow = ai.defineFlow(
  {
    name: 'agentFlow',
    inputSchema: z.object({
      agentId: z.string(),
      message: z.string(),
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    const persona = AGENTS[input.agentId as AgentId];

    if (!persona) {
      throw new Error(`Agente ${input.agentId} não encontrado no registro.`);
    }

    // Filtramos as ferramentas reais que este agente específico tem permissão de usar
    // conforme definido no seu agents-registry.ts
    const agentTools = ALL_TOOLS.filter((t) =>
      persona.toolNames.includes(t.name)
    );

    const response = await ai.generate({
      model: 'gemini-2.0-flash', // Ou gemini-2.0-pro para o Harvey
      system: persona.systemPrompt, // ✅ SEU PROMPT PERSONALIZADO É MANTIDO AQUI
      prompt: input.message,
      tools: agentTools,
      config: { temperature: 0.7 },
    });

    return {
      answer: response.text,
      usedTools: response.toolCalls?.map(tc => tc.name),
    };
  }
);