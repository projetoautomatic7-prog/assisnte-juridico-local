import { z } from 'zod';
import { AGENTS, AgentId } from './agents-registry';
import { AgentResponseSchema, ai, mcpHost, upstashSessionStore } from './genkit';
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

    // Carrega ou cria a sessão persistente no Redis
    const session = await ai.loadSession(input.sessionId || `session-${input.agentId}`, {
      store: upstashSessionStore,
    });

    // Carrega ferramentas do MCP (Filesystem, etc)
    const mcpTools = await mcpHost.getActiveTools(ai);

    // Inicia o chat dentro da sessão (o histórico é gerenciado automaticamente)
    const chat = session.chat({
      system: persona.systemPrompt,
      tools: [...agentTools, ...mcpTools],
      config: { temperature: 0.7 },
    });

    const response = await chat.send(input.message, { resume: input.resume });

    return {
      answer: response.text,
      usedTools: response.toolCalls?.map(tc => tc.name),
      interrupts: response.interrupts, // Retorna interrupções para o frontend
    };
  }
);