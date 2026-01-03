import Anthropic from "@anthropic-ai/sdk";
import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export class HarveyAgent extends LangGraphAgent {
  protected async run(state: AgentState, signal: AbortSignal): Promise<AgentState> {
    let current = updateState(state, { currentStep: "harvey:start" });

    const task = (state.data.task as string) || "Análise estratégica geral do escritório";

    try {
      const response = await anthropic.messages.create(
        {
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: `Você é Harvey Specter, estrategista jurídico sênior.

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
        currentStep: "harvey:analysis_complete",
        data: {
          ...current.data,
          summary: result,
          usage: response.usage,
        },
        completed: true,
      });

      return this.addAgentMessage(current, result);
    } catch (error) {
      console.error("[Harvey] Erro ao executar agente:", error);

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
