import { useKV } from "@/hooks/use-kv";
import { metricsCollector } from "@/lib/agent-metrics";
import {
  canResumeAfterHuman,
  initializeAgents,
  shouldPauseForHuman,
  type Agent,
  type AgentTask,
  type AgentTaskResult,
} from "@/lib/agents";
import { executeHybridTask, hasHybridVersion } from "@/lib/hybrid-agents-integration";
import { processTaskWithRealAI, processTaskWithStreamingAI } from "@/lib/real-agent-client";
import { validateAgentTask } from "@/schemas/agent.schema";
import { useCallback, useEffect, useRef, useState } from "react";

import { trackAgentTask, trackError } from "@/lib/azure-insights";

import { endSpan, startAgentSpan } from "@/lib/tracing";

// ===========================
// Type Aliases
// ===========================

type ActivityResult = "success" | "warning" | "error";

interface ActivityLogEntry {
  id: string;
  agentId: string;
  timestamp: string;
  action: string;
  result: ActivityResult;
}

export interface AgentActionLog {
  agentId: string;
  action: string;
  details?: Record<string, unknown>;
  timestamp: string;
  success: boolean;
  durationMs?: number;
}

export interface MemoryItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ===========================
// Helper Functions
// ===========================

function updateAgentInList(
  agents: Array<Agent>,
  agentId: string,
  updates: Partial<Agent>
): Array<Agent> {
  return agents.map((a) => (a.id === agentId ? { ...a, ...updates } : a));
}

function updateTaskInQueue(
  tasks: Array<AgentTask>,
  taskId: string,
  updates: Partial<AgentTask>
): Array<AgentTask> {
  return tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
}

function getQueuedTasksForAgent(queue: Array<AgentTask>, agentId: string): Array<AgentTask> {
  return queue.filter(
    (t) => t.agentId === agentId && t.status === "queued" && canResumeAfterHuman(t)
  );
}

function sortTasksByPriority(tasks: Array<AgentTask>): Array<AgentTask> {
  const order: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return tasks.sort((a, b) => order[a.priority] - order[b.priority]);
}

const AGENTS_DATA_VERSION = 7;

export function useAutonomousAgents() {
  useKV<number>("agents-data-version", AGENTS_DATA_VERSION);

  const [agents, setAgents] = useKV<Array<Agent>>("autonomous-agents", initializeAgents());
  const [taskQueue, setTaskQueue] = useKV<Array<AgentTask>>("agent-task-queue", []);
  const [completedTasks, setCompletedTasks] = useKV<Array<AgentTask>>("completed-agent-tasks", []);
  const [activityLog, setActivityLog] = useKV<Array<ActivityLogEntry>>("agent-activity-log", []);

  const [serverLogs, setServerLogs] = useState<Array<AgentActionLog>>([]);
  const [legalMemory, setLegalMemory] = useState<Array<MemoryItem>>([]);
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  const [useStreaming, setUseStreaming] = useState(true);

  const processingRef = useRef<Set<string>>(new Set());
  const isInitializingRef = useRef(false);
  const agentsRef = useRef(agents);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // Prevenir loop infinito na inicialização
  useEffect(() => {
    if (!agentsRef.current || agentsRef.current.length === 0) {
      setAgents(initializeAgents());
      return;
    }

    // Garante que a quantidade de agentes seja sempre a definida em `initializeAgents` (15).
    // O log `Pasted-er-responded-with-a-status-of-404...` mostra que o sistema entra em loop
    // com 16 agentes, indicando que a verificação ` < 15` era insuficiente.
    if (agentsRef.current.length !== 15 && !isInitializingRef.current) {
      isInitializingRef.current = true;
      console.log(`[Agents] Quantidade incorreta (${agentsRef.current.length}) → reinicializando`);
      setAgents(initializeAgents());
      const timer = setTimeout(() => {
        isInitializingRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [setAgents]); // Dependência em length removida

  const fetchServerData = useCallback(async () => {
    try {
      const resLogs = await fetch("/api/agents?action=logs").catch(() => null);
      if (resLogs?.ok) {
        const data = await resLogs.json();
        if (Array.isArray(data.logs)) setServerLogs(data.logs);
      }

      const resMem = await fetch("/api/agents?action=memory").catch(() => null);
      if (resMem?.ok && resMem.headers.get("content-type")?.includes("application/json")) {
        const data = await resMem.json();
        if (Array.isArray(data.memory)) setLegalMemory(data.memory);
      }
    } catch (error) {
      console.debug("[Agents] Sync error:", error);
    }
  }, []);

  useEffect(() => {
    fetchServerData();
    const interval = setInterval(fetchServerData, 60_000);
    return () => clearInterval(interval);
  }, [fetchServerData]);

  const logActivity = useCallback(
    (agentId: string, action: string, result: ActivityResult = "success") => {
      setActivityLog((current) => {
        const log = {
          id: crypto.randomUUID(),
          agentId,
          timestamp: new Date().toISOString(),
          action,
          result,
        };
        return [log, ...(current || [])].slice(0, 100);
      });
    },
    [setActivityLog]
  );

  const processNextTask = useCallback(
    async (agent: Agent) => {
      if (processingRef.current.has(agent.id) || !agent.enabled || agent.status === "paused")
        return;

      const queue = getQueuedTasksForAgent(taskQueue || [], agent.id);
      if (queue.length === 0) {
        if (agent.status !== "idle") {
          setAgents((current) =>
            updateAgentInList(current || [], agent.id, { status: "idle", currentTask: undefined })
          );
        }
        return;
      }

      const task = queue[0];
      if (shouldPauseForHuman(agent, task)) {
        if (agent.status !== "waiting_human") {
          setAgents((current) =>
            updateAgentInList(current || [], agent.id, {
              status: "waiting_human",
              currentTask: task,
            })
          );
        }
        return;
      }

      processingRef.current.add(agent.id);
      const startTime = Date.now();

      setTaskQueue((current) =>
        updateTaskInQueue(current || [], task.id, {
          status: "processing",
          startedAt: new Date().toISOString(),
        })
      );
      setAgents((current) =>
        updateAgentInList(current || [], agent.id, { status: "processing", currentTask: task })
      );

      const agentSpan = startAgentSpan(agent.id, agent.name, {
        attributes: { "task.id": task.id },
      });

      try {
        let result: AgentTaskResult;
        if (hasHybridVersion(agent.id)) {
          result = await executeHybridTask(agent.id, task);
        } else if (useStreaming) {
          result = await processTaskWithStreamingAI(task, agent, {
            onChunk: (chunk) => {
              setStreamingContent((prev) => ({
                ...prev,
                [agent.id]: (prev[agent.id] || "") + chunk,
              }));
            },
            onComplete: () => {
              setStreamingContent((prev) => {
                const { [agent.id]: _, ...rest } = prev;
                return rest;
              });
            },
            onError: (err) => logActivity(agent.id, `Erro: ${err.message}`, "error"),
          });
        } else {
          result = await processTaskWithRealAI(task, agent);
        }

        const duration = Date.now() - startTime;
        metricsCollector.recordMetric({
          agentId: agent.id,
          timestamp: Date.now(),
          duration,
          success: true,
          taskType: task.type,
        });

        trackAgentTask(agent.id, task.type, "COMPLETED", duration);
        await endSpan(agentSpan, "ok");

        const completed = {
          ...task,
          status: "completed" as const,
          completedAt: new Date().toISOString(),
          result,
        };
        setTaskQueue((current) => (current || []).filter((t) => t.id !== task.id));
        setCompletedTasks((current) => [completed, ...(current || [])].slice(0, 500));
        setAgents((current) =>
          updateAgentInList(current || [], agent.id, {
            lastActivity: `Concluído: ${task.type}`,
            status: "idle",
          })
        );
        logActivity(agent.id, `Concluído: ${task.type}`, "success");
      } catch (err) {
        const duration = Date.now() - startTime;
        metricsCollector.recordMetric({
          agentId: agent.id,
          timestamp: Date.now(),
          duration,
          success: false,
          taskType: task.type,
        });
        trackAgentTask(agent.id, task.type, "FAILED", duration, String(err));
        trackError(err instanceof Error ? err : new Error(String(err)), { agentId: agent.id });
        await endSpan(agentSpan, "error", String(err));

        setTaskQueue((current) =>
          updateTaskInQueue(current || [], task.id, { status: "failed", error: String(err) })
        );
        logActivity(agent.id, `Erro: ${task.type}`, "error");
      } finally {
        processingRef.current.delete(agent.id);
      }
    },
    [taskQueue, useStreaming, setAgents, setTaskQueue, setCompletedTasks, logActivity]
  );

  const processRef = useRef(processNextTask);
  useEffect(() => {
    processRef.current = processNextTask;
  }, [processNextTask]);

  useEffect(() => {
    const loop = () => {
      const enabled = (agentsRef.current || []).filter(
        (a) => a.enabled && a.status !== "paused" && a.status !== "processing"
      );
      enabled.forEach((a) => processRef.current(a));
    };
    const interval = setInterval(loop, 10000); // Aumentado para 10s para estabilidade
    return () => clearInterval(interval);
  }, []);

  const toggleAgent = useCallback(
    (id: string) => {
      setAgents((current) =>
        (current || []).map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
      );
    },
    [setAgents]
  );

  const addTask = useCallback(
    (task: AgentTask) => {
      const validation = validateAgentTask(task);
      if (validation.isValid && validation.data) {
        setTaskQueue((current) =>
          sortTasksByPriority([...(current || []), validation.data as unknown as AgentTask])
        );
      }
    },
    [setTaskQueue]
  );

  return {
    agents: agents || [],
    taskQueue: taskQueue || [],
    completedTasks: completedTasks || [],
    activityLog: activityLog || [],
    serverLogs,
    legalMemory,
    streamingContent,
    isStreamingEnabled: useStreaming,
    addTask,
    toggleAgent,
    toggleStreaming: () => setUseStreaming((v) => !v),
    refreshServerData: fetchServerData,
    setAgents,
  };
}
