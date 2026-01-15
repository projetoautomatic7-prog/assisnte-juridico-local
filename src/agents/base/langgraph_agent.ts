import { AgentState, updateState } from "./agent_state";
import { logger } from "./agent_logger";

export abstract class LangGraphAgent {
  /**
   * Executa o agente com o estado inicial fornecido
   */
  public async execute(initialState: AgentState): Promise<AgentState> {
    let state = { ...initialState };
    const signal = new AbortController().signal; // Placeholder para cancelamento futuro

    try {
      logger.info("Iniciando execução do agente", {
        agentName: this.constructor.name,
        sessionId: state.data.sessionId as string,
      });

      state = await this.run(state, signal);

      logger.info("Execução do agente finalizada", {
        agentName: this.constructor.name,
        sessionId: state.data.sessionId as string,
        completed: state.completed,
      });

      return state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Erro fatal na execução do agente", {
        agentName: this.constructor.name,
        sessionId: state.data.sessionId as string,
        errorMessage,
      });

      return updateState(state, {
        error: errorMessage,
        completed: false, // Marca como não completado em caso de erro fatal
      });
    }
  }

  /**
   * Lógica principal do agente a ser implementada pelas subclasses
   */
  protected abstract run(state: AgentState, signal: AbortSignal): Promise<AgentState>;

  /**
   * Helper para adicionar mensagem do agente ao histórico
   */
  protected addAgentMessage(state: AgentState, content: string): AgentState {
    return updateState(state, {
      messages: [...state.messages, { role: "assistant", content }],
    });
  }
}
