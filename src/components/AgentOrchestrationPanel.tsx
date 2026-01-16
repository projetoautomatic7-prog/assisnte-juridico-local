/**
 * Agent Orchestration Panel
 *
 * Painel de monitoramento e controle da orquestração de múltiplos agentes
 * Conecta com a arquitetura V2: ReAct, Circuit Breakers, Traces
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getActiveEditorToolkit } from "@/lib/active-editor-toolkit";

// Helper: mapeia tipo de trace para variant do Badge (S3358)
function getTraceVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "final") return "default";
  if (type === "action") return "secondary";
  return "outline";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractToolCalls(payload: unknown): Array<{ name: string; input: unknown }> {
  if (!isRecord(payload)) return [];

  const candidates: unknown[] = [];
  const direct = payload.toolCall ?? payload.tool_call;
  if (direct) candidates.push(direct);

  const list = payload.toolCalls ?? payload.tool_calls;
  if (Array.isArray(list)) candidates.push(...list);

  const parsed: Array<{ name: string; input: unknown }> = [];
  for (const c of candidates) {
    if (!isRecord(c)) continue;
    const name = c.name;
    if (typeof name !== "string" || name.trim().length === 0) continue;
    parsed.push({ name, input: c.input ?? {} });
  }

  return parsed;
}

interface CircuitBreakerStatus {
  name: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failures: number;
  successes: number;
  isHealthy: boolean;
  timeSinceLastFailure: number | null;
}

type CircuitBreakerState = CircuitBreakerStatus["state"];

interface AgentTrace {
  timestamp: string;
  step: number;
  type: "thought" | "action" | "observation" | "final";
  content: string;
  toolUsed?: string;
  duration?: number;
  error?: string;
}

interface AgentExecution {
  agentId: string;
  agentName: string;
  steps: number;
  usedTools: string[];
  answer: string;
  traces: AgentTrace[];
  totalDuration: number;
  executionTimeMs: number;
  timestamp: string;
}

interface OrchestrationMetrics {
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  };
  breakers: CircuitBreakerStatus[];
  timestamp: string;
}

export default function AgentOrchestrationPanel() {
  const [metrics, setMetrics] = useState<OrchestrationMetrics | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("justine");
  const [execution, setExecution] = useState<AgentExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isFetchingRef = useRef(false);

  const agents = [
    { id: "harvey", name: "Harvey Specter", icon: "👨‍⚖️", color: "text-purple-600" },
    { id: "justine", name: "Mrs. Justin-e", icon: "🤖", color: "text-blue-600" },
    { id: "monitor-djen", name: "Monitor DJEN", icon: "📰", color: "text-green-600" },
    { id: "gestao-prazos", name: "Gestão Prazos", icon: "⏰", color: "text-orange-600" },
    { id: "analise-risco", name: "Análise Risco", icon: "⚠️", color: "text-red-600" },
  ];

  const fetchMetrics = useCallback(async (): Promise<void> => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const response = await fetch("/api/observability?action=circuit-breakers");
      if (!response.ok) {
        console.error(
          `[AgentOrchestrationPanel] Falha ao buscar métricas: HTTP ${response.status} ${response.statusText}`
        );
        return;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        console.error("[AgentOrchestrationPanel] Resposta não-JSON em /api/observability");
        return;
      }
      const data = await response.json();
      if (data?.summary && data?.breakers) {
        setMetrics(data as OrchestrationMetrics);
      }
    } catch (error) {
      console.error("Erro ao buscar métricas:", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const executeAgent = async (agentId: string, message?: string) => {
    setLoading(true);
    setSelectedAgent(agentId);
    try {
      const response = await fetch("/api/agents?action=process-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: {
            id: `task-${Date.now()}`,
            agentId,
            type: "analyze_document",
            priority: "medium",
            status: "queued",
            createdAt: new Date().toISOString(),
            data: {
              message: message || "Execute sua rotina automática",
              sessionId: `session-${Date.now()}`,
            },
          },
          agent: {
            id: agentId,
            name: agents.find((a) => a.id === agentId)?.name || agentId,
            type: "analyzer",
            status: "active",
            enabled: true,
          },
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("Resposta não-JSON do endpoint /api/agents");
        }
        const data = await response.json();

        const toolCalls = extractToolCalls(data?.result);
        const editorToolCalls = toolCalls.filter((tc) => tc.name === "editor_tool");
        if (editorToolCalls.length > 0) {
          const toolkit = getActiveEditorToolkit();
          if (!toolkit) {
            toast.warning("Agente solicitou edição, mas nenhum editor está ativo no momento.");
          } else {
            try {
              toolkit.setActiveSelection?.({ from: 0, to: 0 });
              for (const call of editorToolCalls) {
                const input = isRecord(call.input) ? call.input : {};
                const action = typeof input.action === "string" ? input.action : "edit";
                const result = await toolkit.executeTool({ toolName: action, input });
                if (result.hasError) {
                  toast.error(`Falha ao aplicar alteração no editor: ${result.output}`);
                }
              }
              toast.success("Alterações do agente aplicadas no editor.");
            } catch (error) {
              console.error("[AgentOrchestrationPanel] Falha ao aplicar tool-calls no editor:", error);
              toast.error("Falha ao aplicar alterações do agente no editor.");
            } finally {
              toolkit.setActiveSelection?.(null);
            }
          }
        }

        const agentName = agents.find((a) => a.id === agentId)?.name || agentId;
        const processingTime = data.processingTime ?? 0;
        setExecution({
          agentId,
          agentName,
          steps: 1,
          usedTools: data.result?.toolsUsed || ["gemini-2.5-pro"],
          answer: data.result?.analysis || data.result?.message || "Sucesso",
          traces: [
            {
              timestamp: new Date().toISOString(),
              step: 1,
              type: "final",
              content: data.result?.analysis || "OK",
              duration: processingTime,
            },
          ],
          totalDuration: processingTime,
          executionTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        });
        toast.success(`${agentName} executado!`);
      }
    } catch (error) {
      console.error("[AgentOrchestrationPanel] Erro ao executar agente:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao executar agente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  const getStateColor = (state: CircuitBreakerState) => {
    switch (state) {
      case "CLOSED":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "HALF_OPEN":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
      case "OPEN":
        return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  const getStateIcon = (state: CircuitBreakerState) => {
    switch (state) {
      case "CLOSED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "HALF_OPEN":
        return <AlertTriangle className="h-4 w-4" />;
      case "OPEN":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Orquestração de Agentes
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh((prev) => !prev)}>
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
          <Button onClick={fetchMetrics} size="sm">
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
          <TabsTrigger value="traces">Traces</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{agent.icon}</span>
                    <span className={agent.color}>{agent.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => executeAgent(agent.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading && selectedAgent === agent.id ? "Rodando..." : "Executar"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="circuit-breakers" className="space-y-4">
          {metrics && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{metrics.summary.total}</p>
                  </div>
                  <div className="text-green-600">
                    <p className="text-xs">OK</p>
                    <p className="text-2xl font-bold">{metrics.summary.healthy}</p>
                  </div>
                  <div className="text-yellow-600">
                    <p className="text-xs">Degradado</p>
                    <p className="text-2xl font-bold">{metrics.summary.degraded}</p>
                  </div>
                  <div className="text-red-600">
                    <p className="text-xs">Off</p>
                    <p className="text-2xl font-bold">{metrics.summary.down}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {metrics.breakers.map((breaker) => (
                    <div
                      key={breaker.name}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={getStateColor(breaker.state)}>
                          {getStateIcon(breaker.state)} {breaker.state}
                        </Badge>
                        <span className="text-sm font-medium">{breaker.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        F:{breaker.failures} S:{breaker.successes}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="traces" className="space-y-4">
          {execution ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{execution.agentName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                  {execution.answer}
                </div>
                <div className="space-y-2">
                  {execution.traces.map((trace) => (
                    <div
                      key={`${trace.timestamp}-${trace.step}`}
                      className="p-2 border-l-2 border-primary bg-muted/30 text-xs"
                    >
                      <Badge variant={getTraceVariant(trace.type)} className="mr-2">
                        {trace.type}
                      </Badge>
                      {trace.content}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Sem execuções recentes</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
