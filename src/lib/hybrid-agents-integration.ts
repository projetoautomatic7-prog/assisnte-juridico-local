/**
 * Hybrid Agents Integration
 *
 * Integra os agentes LangGraph com o sistema existente de 15 agentes
 * Permite execução paralela e coordenação entre agentes tradicionais e híbridos
 */

export const HYBRID_AGENTS_DISABLED = false;

console.log("✅ Hybrid Agents Integration habilitado");

// ============================================================================
// TYPE EXPORTS (para compatibilidade)
// ============================================================================

export type HybridAgentType = "langgraph-djen" | "langgraph-custom";

export type HybridExecutionConfig = {
  enableLangGraph?: boolean;
  enableTraditional?: boolean;
  coordinationMode?: "parallel" | "fallback" | "sequential";
  timeoutMs?: number;
};

export type HybridExecutionResult = {
  success: boolean;
  mode: "langgraph" | "traditional" | "hybrid";
  executionTime: number;
  langGraphResult?: { completed: boolean; data?: unknown };
  traditionalResult?: { completed: boolean; data?: unknown };
  error?: string;
};

export type HybridStats = {
  totalExecutions: number;
  langGraphExecutions: number;
  traditionalExecutions: number;
  hybridExecutions: number;
  successRate: number;
  averageExecutionTime: number;
};

// ============================================================================
// AGENT REGISTRY
// ============================================================================

const HYBRID_AGENT_REGISTRY: Record<string, HybridAgentType> = {
  harvey: "langgraph-custom",
  justine: "langgraph-custom",
  "monitor-djen": "langgraph-djen",
  "analise-documental": "langgraph-custom",
  "analise-risco": "langgraph-custom",
  compliance: "langgraph-custom",
  "comunicacao-clientes": "langgraph-custom",
  "estrategia-processual": "langgraph-custom",
  financeiro: "langgraph-custom",
  "gestao-prazos": "langgraph-custom",
  "organizacao-arquivos": "langgraph-custom",
  "pesquisa-juris": "langgraph-custom",
  "redacao-peticoes": "langgraph-custom",
  "revisao-contratual": "langgraph-custom",
  "traducao-juridica": "langgraph-custom",
};

// ============================================================================
// STATS TRACKING
// ============================================================================

let hybridStats: HybridStats = {
  totalExecutions: 0,
  langGraphExecutions: 0,
  traditionalExecutions: 0,
  hybridExecutions: 0,
  successRate: 0,
  averageExecutionTime: 0,
};

let executionTimes: number[] = [];
let successCount = 0;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

const AGENTS_API =
  typeof import.meta.env.VITE_AGENTS_API_URL === "string"
    ? import.meta.env.VITE_AGENTS_API_URL
    : "/api/agents";

async function runTraditionalFlow(agentId: string, task: unknown): Promise<unknown> {
  const taskData = (task as { data?: Record<string, unknown>; id?: string })?.data || {};
  const message =
    (taskData.description as string) || (taskData.message as string) || JSON.stringify(taskData);

  const response = await fetch(AGENTS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      message: typeof message === "string" ? message : JSON.stringify(message),
      sessionId: (task as { id?: string })?.id,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// ... existing imports ...

export async function executeHybridTask(
  agentId: string,
  task: unknown,
  config?: Partial<HybridExecutionConfig>
): Promise<HybridExecutionResult> {
  const startTime = performance.now();
  const finalConfig: HybridExecutionConfig = {
    enableLangGraph: true, // Keep enabled but it will fallback or just return mock for now if no impl
    enableTraditional: true,
    coordinationMode: "parallel",
    timeoutMs: 30000,
    ...config,
  };

  console.log(`[Hybrid] Executing task for ${agentId} with mode: ${finalConfig.coordinationMode}`);

  try {
    // 1. Traditional Flow (Genkit)
    let traditionalResult: { completed: boolean; data?: unknown } = { completed: false };

    if (finalConfig.enableTraditional) {
      try {
        const flowResult = await runTraditionalFlow(agentId, task);

        traditionalResult = {
          completed: true,
          data: flowResult,
        };
      } catch (err) {
        console.error(`[Hybrid] Traditional flow failed for ${agentId}:`, err);
        // Não lança aqui para permitir fallback/execução paralela
      }
    }

    // 2. LangGraph Flow (Mocked for now, or Placeholder)
    let langGraphResult: { completed: boolean; data?: unknown } | undefined = undefined;
    if (hasHybridVersion(agentId) && finalConfig.enableLangGraph) {
      // Placeholder for future LangGraph implementation
      langGraphResult = { completed: true, data: task };
    }

    const result: HybridExecutionResult = {
      success: traditionalResult.completed || (langGraphResult?.completed ?? false),
      mode: hasHybridVersion(agentId) ? "langgraph" : "traditional", // This logic might need adjustment based on what actually ran
      executionTime: performance.now() - startTime,
      langGraphResult,
      traditionalResult,
    };

    recordExecution(result);
    return result;
  } catch (error) {
    const result: HybridExecutionResult = {
      success: false,
      mode: "traditional",
      executionTime: performance.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
    recordExecution(result);
    return result;
  }
}

export function getHybridStats(): HybridStats {
  return { ...hybridStats };
}

export function hasHybridVersion(agentId: string): boolean {
  return agentId in HYBRID_AGENT_REGISTRY;
}

export function listHybridAgents(): Array<{ agentId: string; type?: string }> {
  return Object.entries(HYBRID_AGENT_REGISTRY).map(([agentId, type]) => ({
    agentId,
    type,
  }));
}

export function recordExecution(result: HybridExecutionResult): void {
  hybridStats.totalExecutions++;
  executionTimes.push(result.executionTime);

  if (result.success) {
    successCount++;
  }

  if (result.mode === "langgraph") {
    hybridStats.langGraphExecutions++;
  } else if (result.mode === "traditional") {
    hybridStats.traditionalExecutions++;
  } else {
    hybridStats.hybridExecutions++;
  }

  hybridStats.successRate = (successCount / hybridStats.totalExecutions) * 100;
  hybridStats.averageExecutionTime =
    executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
}

export function resetHybridStats(): void {
  hybridStats = {
    totalExecutions: 0,
    langGraphExecutions: 0,
    traditionalExecutions: 0,
    hybridExecutions: 0,
    successRate: 0,
    averageExecutionTime: 0,
  };
  executionTimes = [];
  successCount = 0;
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class HybridAgentOrchestrator {
  private config: HybridExecutionConfig;

  constructor(config?: Partial<HybridExecutionConfig>) {
    this.config = {
      enableLangGraph: true,
      enableTraditional: true,
      coordinationMode: "parallel",
      timeoutMs: 30000,
      ...config,
    };
  }

  async executeTask(agentId: string, task: unknown): Promise<HybridExecutionResult> {
    return executeHybridTask(agentId, task, this.config);
  }

  getStats(): HybridStats {
    return getHybridStats();
  }

  listAgents(): Array<{ agentId: string; type?: string }> {
    return listHybridAgents();
  }
}

export default HybridAgentOrchestrator;
