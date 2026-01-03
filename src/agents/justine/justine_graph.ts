import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";
import { callGemini } from "@/lib/gemini-service";
import { createInvokeAgentSpan } from "@/lib/sentry-gemini-integration-v2";

export class JustineAgent extends LangGraphAgent {
  protected async run(state: AgentState, _signal: AbortSignal): Promise<AgentState> {
    return createInvokeAgentSpan(
      {
        agentName: "Mrs. Justine",
        system: "gemini",
        model: "gemini-2.5-pro",
        temperature: 0.3,
      },
      {
        sessionId: (state.data?.sessionId as string) || `justine_session_${Date.now()}`,
        turn: state.retryCount + 1,
        messages: state.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      },
      async (span) => {
        let current = updateState(state, { currentStep: "justine:start" });

        const task = (state.data.task as string) || "Analisar intimações e publicações do DJEN";

        span?.setAttribute("justine.task", task);

        const systemPrompt = `Você é Mrs. Justine, assistente jurídica especialista em análise de intimações e publicações processuais.

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
- Responda SEMPRE em português brasileiro

TAREFA:
${task}`;

        try {
          const response = await callGemini(systemPrompt, {
            temperature: 0.3,
            maxOutputTokens: 4096,
          });

          if (response.error) {
            span?.setAttribute("gen_ai.error", response.error);
            span?.setStatus({ code: 2, message: response.error });

            current = updateState(current, {
              currentStep: "justine:error",
              data: {
                ...current.data,
                error: response.error,
              },
              completed: false,
            });

            return this.addAgentMessage(current, `Erro ao processar análise de intimações: ${response.error}`);
          }

          const result = response.text;

          span?.setAttribute("gen_ai.response.length", result.length);
          span?.setAttribute("gen_ai.usage.total_tokens", response.metadata?.totalTokens || 0);
          span?.setStatus({ code: 1, message: "ok" });

          current = updateState(current, {
            currentStep: "justine:intimations_extracted",
            data: {
              ...current.data,
              analysis: result,
              found: 1,
              usage: response.metadata,
            },
            completed: true,
          });

          return this.addAgentMessage(current, result);
        } catch (error) {
          console.error("[Justine] Erro ao executar agente:", error);

          span?.setAttribute("gen_ai.error", error instanceof Error ? error.message : "Erro desconhecido");
          span?.setStatus({ code: 2, message: "error" });

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
    );
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
