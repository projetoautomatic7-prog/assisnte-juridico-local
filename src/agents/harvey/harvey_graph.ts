import { callGemini } from "@/lib/gemini-service";
import { createInvokeAgentSpan } from "@/lib/sentry-gemini-integration-v2";
import { logStructuredError, logValidationError } from "../base/agent_logger";
import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";
import { formatErrorMessage, generateAnalysisPrompt, HARVEY_SYSTEM_PROMPT } from "./templates";
import { validateHarveyInput, ValidationError } from "./validators";

export class HarveyAgent extends LangGraphAgent {
  protected async run(state: AgentState, _signal: AbortSignal): Promise<AgentState> {
    return createInvokeAgentSpan(
      {
        agentName: "Harvey Specter",
        system: "gemini",
        model: "gemini-2.5-pro",
        temperature: 0.7,
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
        let current = updateState(state, { currentStep: "harvey:validate" });

        try {
          // 1. Validação de inputs
          const validatedInput = validateHarveyInput(state.data || {});

          span?.setAttribute("harvey.task", validatedInput.task.substring(0, 100));
          span?.setAttribute("harvey.urgency", validatedInput.urgency || "medium");

          // 2. Análise (Generation)
          current = updateState(current, { currentStep: "harvey:analyze" });

          const userPrompt = generateAnalysisPrompt(validatedInput.task, validatedInput.urgency);

          const response = await callGemini(userPrompt, {
            temperature: 0.7,
            maxOutputTokens: 4096,
            systemInstruction: HARVEY_SYSTEM_PROMPT,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          const result = response.text;

          current = updateState(current, {
            currentStep: "harvey:complete",
            data: {
              ...current.data,
              summary: result,
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
            logValidationError("Harvey Specter", error.field, error.message, error.receivedValue);
          } else {
            logStructuredError("Harvey Specter", errorType, errorMessage, {
              task: (state.data?.task as string) || undefined,
              step: current.currentStep,
            });
          }

          span?.setStatus({ code: 2, message: errorMessage });

          const errorMsg = formatErrorMessage(errorType, errorMessage, {
            task: state.data?.task,
            step: current.currentStep,
          });

          return this.addAgentMessage(
            updateState(current, {
              currentStep: "harvey:error",
              completed: false,
              error: errorMessage,
            }),
            errorMsg
          );
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
