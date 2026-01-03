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

    res.json({
      success: true,
      mode: "langgraph",
      agentId,
      executionTime,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const executionTime = performance.now() - startTime;
    hybridStats.totalExecutions++;
    hybridStats.traditionalExecutions++;
    hybridStats.successRate = (successCount / hybridStats.totalExecutions) * 100;

    res.status(500).json({
      success: false,
      mode: "traditional",
      agentId,
      executionTime,
      error: error instanceof Error ? error.message : "Unknown error",
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
  const agentHealthChecks: Record<string, {
    status: string;
    circuitBreaker?: string;
    errorRate?: number;
    degradedRate?: number;
    avgLatencyMs?: number;
    lastError?: { code: string; message: string; recoverable?: boolean };
  }> = {};

  for (const agentId of Object.keys(HYBRID_AGENT_REGISTRY)) {
    agentHealthChecks[agentId] = {
      status: "available",
      circuitBreaker: "closed",
      errorRate: 0,
      degradedRate: 0,
      avgLatencyMs: 0,
    };
  }

  const totalExecutions = hybridStats.totalExecutions;
  const successRate = hybridStats.successRate || 100;
  const errorRate = totalExecutions > 0 ? (1 - successRate / 100) : 0;

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (successRate < 50) {
    overallStatus = "unhealthy";
  } else if (successRate < 90) {
    overallStatus = "degraded";
  }

  const unhealthyAgents = Object.entries(agentHealthChecks)
    .filter(([_, health]) => health.status === "unhealthy")
    .map(([id]) => id);

  const degradedAgents = Object.entries(agentHealthChecks)
    .filter(([_, health]) => health.status === "degraded")
    .map(([id]) => id);

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
