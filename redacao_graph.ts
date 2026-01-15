import { callGemini } from "@/lib/gemini-service";
import { createInvokeAgentSpan } from "@/lib/sentry-gemini-integration-v2";
import { logStructuredError, logValidationError } from "../base/agent_logger";
import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";
import { formatErrorMessage, generateDraftPrompt, REDACAO_SYSTEM_PROMPT } from "./templates";
import { validateRedacaoInput, ValidationError } from "./validators";

export class RedacaoAgent extends LangGraphAgent {
  protected async run(state: AgentState, _signal: AbortSignal): Promise<AgentState> {
    return createInvokeAgentSpan(
      {
        agentName: "Redação de Petições",
        system: "gemini",
        model: "gemini-2.5-pro",
        temperature: 0.5, // Equilíbrio entre criatividade e formalidade
      },
      {
        sessionId: (state.data?.sessionId as string) || `redacao_session_${Date.now()}`,
        turn: state.retryCount + 1,
        messages: state.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      },
      async (span) => {
        let current = updateState(state, { currentStep: "redacao:validate" });

        try {
          // 1. Validação
          const validatedInput = validateRedacaoInput(state.data || {});

          span?.setAttribute("redacao.tipo", validatedInput.tipo);
          if (validatedInput.processo) {
            span?.setAttribute("redacao.processo", validatedInput.processo);
          }

          // 2. Geração
          current = updateState(current, { currentStep: "redacao:generate" });

          const userPrompt = generateDraftPrompt(
            validatedInput.tipo,
            validatedInput.detalhes,
            validatedInput.processo
          );

          const response = await callGemini(userPrompt, {
            temperature: 0.5,
            maxOutputTokens: 8192, // Permitir textos longos
            systemInstruction: REDACAO_SYSTEM_PROMPT,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          const result = response.text;

          current = updateState(current, {
            currentStep: "redacao:complete",
            data: {
              ...current.data,
              minuta: result,
              usage: response.metadata,
            },
            completed: true,
          });

          span?.setStatus({ code: 1, message: "ok" });
          return this.addAgentMessage(current, result);

        } catch (error) {
          const errorType = error instanceof Error ? error.name : "UnknownError";
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (error instanceof ValidationError) {
            logValidationError("Redação de Petições", error.field, error.message);
          } else {
            logStructuredError("Redação de Petições", errorType, errorMessage, {
              step: current.currentStep,
            });
          }

          span?.setStatus({ code: 2, message: errorMessage });

          return this.addAgentMessage(
            updateState(current, {
              currentStep: "redacao:error",
              completed: false,
              error: errorMessage,
            }),
            formatErrorMessage(errorMessage)
          );
        }
      }
    );
  }
}

export async function runRedacao(data: Record<string, unknown> = {}): Promise<AgentState> {
  const agent = new RedacaoAgent();
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