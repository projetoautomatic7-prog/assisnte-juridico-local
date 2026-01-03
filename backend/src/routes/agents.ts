import { Request, Response, Router } from "express";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Imports dinâmicos dos agentes (evita problemas de path com ESM)
let runHarvey: any;
let runJustine: any;

// Carregar agentes de forma assíncrona
async function loadAgents() {
  try {
    // Path relativo a partir de backend/src/routes → workspace root
    const agentsPath = resolve(__dirname, "../../../src/agents");

    const harveyModule = await import(`${agentsPath}/harvey/harvey_graph.js`);
    runHarvey = harveyModule.runHarvey;

    const justineModule = await import(`${agentsPath}/justine/justine_graph.js`);
    runJustine = justineModule.runJustine;

    console.log("[Agents] ✅ Agentes reais carregados (Harvey + Justine)");
  } catch (error) {
    console.error("[Agents] ❌ Erro ao carregar agentes:", error);
    console.warn("[Agents] ⚠️  Usando modo stub (IA desabilitada)");
  }
}

// Carregar agentes na inicialização
loadAgents();

const router = Router();

const HYBRID_AGENT_REGISTRY: Record<string, string> = {
  "harvey-specter": "langgraph-custom",
  "mrs-justine": "langgraph-custom",
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

interface HybridStats {
  totalExecutions: number;
  langGraphExecutions: number;
  traditionalExecutions: number;
  hybridExecutions: number;
  successRate: number;
  averageExecutionTime: number;
}

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

type ExecutionOutcome = "success" | "failure" | "degraded";

interface AgentMetrics {
  executions: number;
  successes: number;
  failures: number;
  degradedExecutions: number;
  totalLatencyMs: number;
  lastSuccess?: number;
  lastFailure?: number;
  lastDegradation?: number;
  lastError?: { code: string; message: string; recoverable?: boolean };
  circuitBreakerState: "closed" | "open" | "half-open";
}

const perAgentMetrics: Map<string, AgentMetrics> = new Map();

function getAgentMetrics(agentId: string): AgentMetrics {
  if (!perAgentMetrics.has(agentId)) {
    perAgentMetrics.set(agentId, {
      executions: 0,
      successes: 0,
      failures: 0,
      degradedExecutions: 0,
      totalLatencyMs: 0,
      circuitBreakerState: "closed",
    });
  }
  return perAgentMetrics.get(agentId)!;
}

function recordAgentExecution(
  agentId: string,
  outcome: ExecutionOutcome,
  latencyMs: number,
  error?: { code: string; message: string; recoverable?: boolean }
): void {
  const metrics = getAgentMetrics(agentId);

  metrics.executions++;
  metrics.totalLatencyMs += latencyMs;

  switch (outcome) {
    case "success":
      metrics.successes++;
      metrics.lastSuccess = Date.now();
      break;
    case "degraded":
      metrics.degradedExecutions++;
      metrics.lastDegradation = Date.now();
      if (error) metrics.lastError = error;
      break;
    case "failure":
      metrics.failures++;
      metrics.lastFailure = Date.now();
      if (error) metrics.lastError = error;
      break;
  }

  const failureRate = metrics.executions > 0 ? metrics.failures / metrics.executions : 0;
  if (failureRate > 0.5) {
    metrics.circuitBreakerState = "open";
  } else if (failureRate > 0.1 || metrics.degradedExecutions > 3) {
    metrics.circuitBreakerState = "half-open";
  } else {
    metrics.circuitBreakerState = "closed";
  }
}

function getAgentHealthStatus(agentId: string): {
  status: "healthy" | "degraded" | "unhealthy";
  circuitBreaker: "closed" | "open" | "half-open";
  errorRate: number;
  degradedRate: number;
  avgLatencyMs: number;
  lastError?: { code: string; message: string; recoverable?: boolean };
} {
  const metrics = getAgentMetrics(agentId);

  const errorRate = metrics.executions > 0 ? metrics.failures / metrics.executions : 0;
  const degradedRate = metrics.executions > 0 ? metrics.degradedExecutions / metrics.executions : 0;
  const avgLatencyMs = metrics.executions > 0 ? metrics.totalLatencyMs / metrics.executions : 0;

  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (errorRate > 0.5) {
    status = "unhealthy";
  } else if (errorRate > 0.1 || degradedRate > 0.3) {
    status = "degraded";
  }

  return {
    status,
    circuitBreaker: metrics.circuitBreakerState,
    errorRate,
    degradedRate,
    avgLatencyMs,
    lastError: metrics.lastError,
  };
}

router.get("/list", (_req: Request, res: Response) => {
  const agents = Object.entries(HYBRID_AGENT_REGISTRY).map(([id, type]) => ({
    agentId: id,
    type,
    status: "available",
  }));

  res.json({
    success: true,
    agents,
    total: agents.length,
    timestamp: new Date().toISOString(),
  });
});

router.get("/stats", (_req: Request, res: Response) => {
  res.json({
    success: true,
    stats: hybridStats,
    timestamp: new Date().toISOString(),
  });
});

router.post("/execute", async (req: Request, res: Response) => {
  const startTime = performance.now();
  const { agentId, task, config } = req.body;

  if (!agentId || !task) {
    return res.status(400).json({
      success: false,
      error: "agentId and task are required",
    });
  }

  if (!(agentId in HYBRID_AGENT_REGISTRY)) {
    return res.status(404).json({
      success: false,
      error: `Agent '${agentId}' not found`,
    });
  }

  const executionConfig = {
    enableLangGraph: true,
    enableTraditional: true,
    coordinationMode: config?.coordinationMode || "parallel",
    timeoutMs: config?.timeoutMs || 30000,
  };

  console.log(
    `[Hybrid] Executing task for ${agentId} with mode: ${executionConfig.coordinationMode}`
  );

  try {
    let result;

    // Executar agente real baseado no ID
    if (agentId === "harvey-specter" && runHarvey) {
      const agentResult = await runHarvey({ task });
      result = {
        completed: agentResult.completed,
        message: agentResult.messages[agentResult.messages.length - 1]?.content || "No response",
        data: agentResult.data,
        steps: agentResult.messages.length,
        aiPowered: true,
      };
    } else if (agentId === "mrs-justine" && runJustine) {
      const agentResult = await runJustine({ task });
      result = {
        completed: agentResult.completed,
        message: agentResult.messages[agentResult.messages.length - 1]?.content || "No response",
        data: agentResult.data,
        steps: agentResult.messages.length,
        aiPowered: true,
      };
    } else {
      // Outros agentes ainda são stubs
      result = {
        completed: true,
        message: `Task executed by ${agentId} (stub)`,
        data: { task, note: "Este agente ainda não foi implementado com IA real" },
        aiPowered: false,
      };
    }

    const executionTime = performance.now() - startTime;
    executionTimes.push(executionTime);
    successCount++;
    hybridStats.totalExecutions++;
    hybridStats.langGraphExecutions++;
    hybridStats.successRate = (successCount / hybridStats.totalExecutions) * 100;
    hybridStats.averageExecutionTime =
      executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;

    const isDegraded = result.data?.degraded === true || result.data?.fallbackUsed === true;
    const outcome: ExecutionOutcome = isDegraded ? "degraded" : "success";

    recordAgentExecution(
      agentId,
      outcome,
      executionTime,
      isDegraded && result.data?.structuredError ? {
        code: result.data.structuredError.code || "UNKNOWN",
        message: result.data.structuredError.message || "Unknown error",
        recoverable: result.data.structuredError.recoverable,
      } : undefined
    );

    res.json({
      success: true,
      mode: "langgraph",
      agentId,
      executionTime,
      result,
      degraded: isDegraded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const executionTime = performance.now() - startTime;
    hybridStats.totalExecutions++;
    hybridStats.traditionalExecutions++;
    hybridStats.successRate = (successCount / hybridStats.totalExecutions) * 100;

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    recordAgentExecution(agentId, "failure", executionTime, {
      code: "EXECUTION_ERROR",
      message: errorMessage,
      recoverable: true,
    });

    res.status(500).json({
      success: false,
      mode: "traditional",
      agentId,
      executionTime,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/orchestrate", async (req: Request, res: Response) => {
  const startTime = performance.now();
  const { agents, task, maxRounds = 5, timeout = 30000 } = req.body;

  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    return res.status(400).json({
      success: false,
      error: "agents array is required",
    });
  }

  if (!task) {
    return res.status(400).json({
      success: false,
      error: "task is required",
    });
  }

  console.log(
    `[Orchestrator] Running orchestration with ${agents.length} agents, max ${maxRounds} rounds`
  );

  const messages: Array<{ role: string; content: string; timestamp: number }> = [];

  for (const agentId of agents) {
    if (agentId in HYBRID_AGENT_REGISTRY) {
      messages.push({
        role: agentId,
        content: `Agent ${agentId} processed task: ${typeof task === "string" ? task.substring(0, 100) : JSON.stringify(task).substring(0, 100)}...`,
        timestamp: Date.now(),
      });
    }
  }

  const executionTime = performance.now() - startTime;

  res.json({
    success: true,
    messages,
    rounds: 1,
    duration: executionTime,
    agentsUsed: agents.filter((a: string) => a in HYBRID_AGENT_REGISTRY),
    timestamp: new Date().toISOString(),
  });
});

router.post("/reset-stats", (_req: Request, res: Response) => {
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

  res.json({
    success: true,
    message: "Stats reset successfully",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health", async (_req: Request, res: Response) => {
  const agentHealthChecks: Record<string, ReturnType<typeof getAgentHealthStatus>> = {};

  for (const agentId of Object.keys(HYBRID_AGENT_REGISTRY)) {
    agentHealthChecks[agentId] = getAgentHealthStatus(agentId);
  }

  const totalExecutions = hybridStats.totalExecutions;
  const successRate = hybridStats.successRate || 100;
  const errorRate = totalExecutions > 0 ? (1 - successRate / 100) : 0;

  const unhealthyAgents = Object.entries(agentHealthChecks)
    .filter(([_, health]) => health.status === "unhealthy")
    .map(([id]) => id);

  const degradedAgents = Object.entries(agentHealthChecks)
    .filter(([_, health]) => health.status === "degraded")
    .map(([id]) => id);

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (unhealthyAgents.length > 0 || successRate < 50) {
    overallStatus = "unhealthy";
  } else if (degradedAgents.length > 0 || successRate < 90) {
    overallStatus = "degraded";
  }

  const overallHealth = {
    status: overallStatus,
    totalAgents: Object.keys(HYBRID_AGENT_REGISTRY).length,
    activeAgents: Object.keys(agentHealthChecks).length,
    unhealthyAgents,
    degradedAgents,
    stats: {
      ...hybridStats,
      errorRate,
    },
    agents: agentHealthChecks,
    geminiConfigValid: !!process.env.VITE_GEMINI_API_KEY || !!process.env.GEMINI_API_KEY,
    environmentHealth: {
      geminiApiKey: !!process.env.VITE_GEMINI_API_KEY || !!process.env.GEMINI_API_KEY,
      upstashRedis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      djenSchedulerEnabled: process.env.DJEN_SCHEDULER_ENABLED === "true",
    },
    timestamp: new Date().toISOString(),
  };

  res.json({
    success: true,
    ...overallHealth,
  });
});

export default router;
