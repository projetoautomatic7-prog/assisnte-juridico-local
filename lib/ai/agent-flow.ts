import { z } from 'zod';
import { AGENTS, AgentId } from './agents-registry.js';
import { AgentResponseSchema, ai, mcpHost, upstashSessionStore } from './genkit.js';
import { ALL_TOOLS } from './tools.js';

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
      sessionId: z.string().optional(),
      resume: z.any().optional(), // Suporte para retomar interrupções
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

    const mcpTools: any[] = []; // await mcpHost.getActiveTools(ai);

    // Genkit API mudou - usar generate diretamente
    const response = await ai.generate({
      model: 'gemini-2.0-flash',
      system: persona.systemPrompt,
      prompt: input.message,
      tools: [...agentTools, ...mcpTools],
      config: { temperature: 0.7 },
    } as any);

    return {
      answer: response.text,
      usedTools: (response as any).toolCalls?.map((tc: any) => tc.name),
      interrupts: (response as any).interrupts, // Retorna interrupções para o frontend
    };
  }
);