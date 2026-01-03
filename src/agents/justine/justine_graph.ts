import Anthropic from "@anthropic-ai/sdk";
import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export class JustineAgent extends LangGraphAgent {
  protected async run(state: AgentState, signal: AbortSignal): Promise<AgentState> {
    let current = updateState(state, { currentStep: "justine:start" });

    const task = (state.data.task as string) || "Analisar intimações e publicações do DJEN";

    try {
      const response = await anthropic.messages.create(
        {
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: `Você é Mrs. Justine, assistente jurídica especialista em análise de intimações e publicações processuais.

RESPONSABILIDADES:
- Analisar intimações do Diário de Justiça Eletrônico (DJEN)
- Extrair informações críticas (prazos, decisões, despachos)
- Identificar ações urgentes necessárias
- Classificar prioridade das publicações
- Detectar riscos de preclusão ou perda de prazo

DIRETRIZES:
- Seja precisa e detalhista na análise
- Destaque prazos peremptórios com urgência
- Cite artigos do CPC/15 relacionados aos prazos
- Use linguagem técnica mas clara
- Sempre mencione a data limite para manifestação
- Responda SEMPRE em português brasileiro`,
          messages: [
            {
              role: "user",
              content: task,
            },
          ],
        },
        {
          signal,
        }
      );

      const result =
        response.content[0].type === "text"
          ? response.content[0].text
          : "Resposta não textual recebida";

      current = updateState(current, {
        currentStep: "justine:intimations_extracted",
        data: {
          ...current.data,
          analysis: result,
          found: 1,
          usage: response.usage,
        },
        completed: true,
      });

      return this.addAgentMessage(current, result);
    } catch (error) {
      console.error("[Justine] Erro ao executar agente:", error);

      current = updateState(current, {
        currentStep: "justine:error",
        data: {
          ...current.data,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        completed: false,
      });

      return this.addAgentMessage(current, "Erro ao processar análise de intimações.");
    }
  }
}

export async function runJustine(data: Record<string, unknown> = {}): Promise<AgentState> {
  const agent = new JustineAgent();
  const initialState: AgentState = {
    messages: [],
    currentStep: "init",
    data,
    completed: false,
    retryCount: 0,
    maxRetries: 3,
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  };

  return agent.execute(initialState);
}
