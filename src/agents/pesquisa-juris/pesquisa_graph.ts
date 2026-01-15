import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";
import { callGemini } from "@/lib/gemini-service";
import { createInvokeAgentSpan } from "@/lib/sentry-gemini-integration-v2";
import { validatePesquisaInput, ValidationError } from "./validators";
import { JurisprudenceRetriever, formatPrecedentes, type SearchResult } from "./retrievers";
import {
  PESQUISA_JURIS_SYSTEM_PROMPT,
  generateSearchQueryPrompt,
  formatErrorMessage,
} from "./templates";
import { logAgentExecution, logStructuredError, logValidationError } from "../base/agent_logger";

export class PesquisaJurisAgent extends LangGraphAgent {
  private readonly retriever: JurisprudenceRetriever;

  constructor() {
    super();
    this.retriever = new JurisprudenceRetriever();
  }

  protected async run(state: AgentState, _signal: AbortSignal): Promise<AgentState> {
    return createInvokeAgentSpan(
      {
        agentName: "Pesquisa Jurisprudencial",
        system: "gemini",
        model: "gemini-2.5-pro",
        temperature: 0.3,
      },
      {
        sessionId: (state.data?.sessionId as string) || `pesquisa_session_${Date.now()}`,
        turn: state.retryCount + 1,
        messages: state.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      },
      async (span) => {
        let current = updateState(state, { currentStep: "pesquisa:validate" });

        try {
          // 1. Validação de inputs
          const validatedInput = validatePesquisaInput(state.data || {});

          logAgentExecution("Pesquisa Jurisprudencial", "input_validated", {
            tema: validatedInput.tema,
            tribunal: validatedInput.tribunal,
            limit: validatedInput.limit,
          });

          span?.setAttribute("pesquisa.tema", validatedInput.tema);
          span?.setAttribute("pesquisa.tribunal", validatedInput.tribunal || "todos");

          // 2. Busca (Retrieval)
          current = updateState(current, { currentStep: "pesquisa:retrieve" });

          logAgentExecution("Pesquisa Jurisprudencial", "searching_database");

          const searchResults: SearchResult = await this.retriever.search(validatedInput);
          const { precedentes, totalFound, avgRelevance, executionTimeMs } = searchResults;
          const tribunaisEncontrados = [...new Set(precedentes.map((p) => p.tribunal))];

          span?.setAttribute("pesquisa.results_count", totalFound);
          span?.setAttribute("pesquisa.avg_relevance", avgRelevance);
          span?.setAttribute("pesquisa.execution_time_ms", executionTimeMs);

          logAgentExecution("Pesquisa Jurisprudencial", "search_completed", {
            totalFound,
            avgRelevance,
            executionTimeMs,
          });

          // 3. Análise (Generation)
          current = updateState(current, { currentStep: "pesquisa:analyze" });

          const contextData = formatPrecedentes(precedentes);
          const userPrompt = generateSearchQueryPrompt(
            validatedInput.tema,
            validatedInput.tribunal || "todos",
            validatedInput.dataInicio,
            validatedInput.dataFim
          );

          const prompt = `CONTEXTO JURISPRUDENCIAL ENCONTRADO:\n${contextData}\n\nSOLICITAÇÃO DO USUÁRIO:\n${userPrompt}`;

          const response = await callGemini(prompt, {
            temperature: 0.3,
            maxOutputTokens: 4096,
            systemInstruction: PESQUISA_JURIS_SYSTEM_PROMPT,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          const result = response.text;

          current = updateState(current, {
            currentStep: "pesquisa:complete",
            data: {
              ...current.data,
              summary: result,
              precedentes: precedentes,
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
            logValidationError("Pesquisa Jurisprudencial", error.field, error.message, error.receivedValue);
          } else {
            logStructuredError("Pesquisa Jurisprudencial", errorType, errorMessage, {
              tema: (state.data?.tema as string) || undefined,
              step: current.currentStep,
            });
          }

          span?.setStatus({ code: 2, message: errorMessage });

          const errorMsg = formatErrorMessage(errorType, errorMessage, {
            tema: (state.data?.tema as string),
            tribunal: (state.data?.tribunal as string),
            step: current.currentStep,
          });

          return this.addAgentMessage(
            updateState(current, {
              currentStep: "pesquisa:error",
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

export async function runPesquisaJuris(data: Record<string, unknown> = {}): Promise<AgentState> {
  const agent = new PesquisaJurisAgent();
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
