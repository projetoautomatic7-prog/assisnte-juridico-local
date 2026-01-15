import type { AgentState } from "../base/agent_state";
import { updateState } from "../base/agent_state";
import { LangGraphAgent } from "../base/langgraph_agent";
import { callGemini } from "@/lib/gemini-service";
import { createInvokeAgentSpan } from "@/lib/sentry-gemini-integration-v2";
import { validateMonitorInput, ValidationError } from "./validators";
import { MONITOR_SYSTEM_PROMPT, generateAnalysisPrompt, formatErrorMessage } from "./templates";
import { logStructuredError, logValidationError } from "../base/agent_logger";

export class MonitorDjenAgent extends LangGraphAgent {
  protected async run(state: AgentState, _signal: AbortSignal): Promise<AgentState> {
    return createInvokeAgentSpan(
      {
        agentName: "Monitor DJEN",
        system: "gemini",
        model: "gemini-2.5-pro",
        temperature: 0.1, // Baixa temperatura para análise precisa de dados
      },
      {
        sessionId: (state.data?.sessionId as string) || `monitor_session_${Date.now()}`,
        turn: state.retryCount + 1,
        messages: state.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      },
      async (span) => {
        let current = updateState(state, { currentStep: "monitor:validate" });

        try {
          // 1. Validação
          const validatedInput = validateMonitorInput(state.data || {});

          span?.setAttribute("monitor.oab", validatedInput.oab);
          if (validatedInput.tribunal) {
            span?.setAttribute("monitor.tribunal", validatedInput.tribunal);
          }

          // 2. Simulação de Busca (Em produção, aqui chamaria a API do DJEN/DataJud)
          // Como não temos a API real conectada neste contexto, simulamos o input de publicações
          // que viria de uma tool ou do próprio input do usuário para análise.
          const publicacoesRaw = (state.data?.publicacoes as string) || "Nenhuma publicação fornecida para análise.";

          // 3. Análise com IA
          current = updateState(current, { currentStep: "monitor:analyze" });

          const userPrompt = generateAnalysisPrompt(validatedInput.oab, publicacoesRaw);

          const response = await callGemini(userPrompt, {
            temperature: 0.1,
            maxOutputTokens: 2048,
            systemInstruction: MONITOR_SYSTEM_PROMPT,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          const result = response.text;

          current = updateState(current, {
            currentStep: "monitor:complete",
            data: {
              ...current.data,
              analise: result,
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
            logValidationError("Monitor DJEN", error.field, error.message);
          } else {
            logStructuredError("Monitor DJEN", errorType, errorMessage, {
              step: current.currentStep,
            });
          }

          span?.setStatus({ code: 2, message: errorMessage });

          return this.addAgentMessage(
            updateState(current, {
              currentStep: "monitor:error",
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

export async function runMonitorDjen(data: Record<string, unknown> = {}): Promise<AgentState> {
  const agent = new MonitorDjenAgent();
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
} get started or enter ? for help.Copilot uses AI, check for mistakes.

 ● Logged in as user: projetoautomatic7 - prog

 ● Connected to GitHub MCP Server

  > npx vitest run src / agents / justine / justine_system_instruction.test.ts
 ✓ Run vitest test for justine_system_instruction
   $ npx vitest run src / agents / justine / justine_system_instruction.test.ts
    └ 13 lines...

 ● The test file wasn't found. Let me check if it exists and locate the correct path:

 ✓ Glob "**/justine_system_instruction.test.ts"
   └ No matches found

 ✓ Glob "src/agents/justine/**/*.ts"
   └ 4 files found

 ● The file justine_system_instruction.test.ts doesn't exist. The justine agent has
tests in src / agents / justine / __tests__ / validators.test.ts.Would you like me to run
   that test file instead, or help you create the missing test file ?

 > teste deu certo ?

 ● Não, o teste não deu certo.O arquivo justine_system_instruction.test.ts não existe
   no projeto.

   O que foi encontrado:

- ❌ src / agents / justine / justine_system_instruction.test.ts - não existe
  - ✅ src / agents / justine / __tests__ / validators.test.ts - existe

   Você quer que eu:

- Execute o teste que existe: validators.test.ts ?
  - Ou crie o arquivo de teste que você tentou executar ?