import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";
import { callGemini } from "@/lib/gemini-service";
import { createInvokeAgentSpan } from "@/lib/sentry-gemini-integration-v2";

export class HarveyAgent extends LangGraphAgent {
  protected async run(state: AgentState, _signal: AbortSignal): Promise<AgentState> {
    return createInvokeAgentSpan(
      {
        agentName: "Harvey Specter",
        system: "gemini",
        model: "gemini-2.5-pro",
        temperature: 0.6,
      },
      {
        sessionId: (state.data?.sessionId as string) || `harvey_session_${Date.now()}`,
        turn: state.retryCount + 1,
        messages: state.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      },
      async (span) => {
        let current = updateState(state, { currentStep: "harvey:start" });

        const task = (state.data.task as string) || "Análise estratégica geral do escritório";

        span?.setAttribute("harvey.task", task);

        const systemPrompt = `Você é Harvey Specter, estrategista jurídico sênior.

RESPONSABILIDADES:
- Analisar estratégias jurídicas complexas
- Identificar riscos e oportunidades em processos
- Fornecer visão macro sobre casos jurídicos
- Sugerir táticas processuais eficazes

DIRETRIZES:
- Seja direto, confiante e objetivo
- Use terminologia jurídica precisa
- Cite legislação quando relevante (CF/88, CPC/15, CC/02)
- Pense como um advogado de elite
- Responda SEMPRE em português brasileiro

TAREFA:
${task}`;

        try {
          const response = await callGemini(systemPrompt, {
            temperature: 0.6,
            maxOutputTokens: 4096,
          });

          if (response.error) {
            span?.setAttribute("gen_ai.error", response.error);
            span?.setStatus({ code: 2, message: response.error });

            current = updateState(current, {
              currentStep: "harvey:error",
              data: {
                ...current.data,
                error: response.error,
              },
              completed: false,
            });

            return this.addAgentMessage(current, `Erro ao processar análise estratégica: ${response.error}`);
          }

          const result = response.text;

          span?.setAttribute("gen_ai.response.length", result.length);
          span?.setAttribute("gen_ai.usage.total_tokens", response.metadata?.totalTokens || 0);
          span?.setStatus({ code: 1, message: "ok" });

          current = updateState(current, {
            currentStep: "harvey:analysis_complete",
            data: {
              ...current.data,
              summary: result,
              usage: response.metadata,
            },
            completed: true,
          });

          return this.addAgentMessage(current, result);
        } catch (error) {
          console.error("[Harvey] Erro ao executar agente:", error);

          span?.setAttribute("gen_ai.error", error instanceof Error ? error.message : "Erro desconhecido");
          span?.setStatus({ code: 2, message: "error" });

          current = updateState(current, {
            currentStep: "harvey:error",
            data: {
              ...current.data,
              error: error instanceof Error ? error.message : "Erro desconhecido",
            },
            completed: false,
          });

          return this.addAgentMessage(current, "Erro ao processar análise estratégica.");
        }
      }
    );
  }
}

export async function runHarvey(data: Record<string, unknown> = {}): Promise<AgentState> {
  const agent = new HarveyAgent();
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
