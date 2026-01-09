/**
 * Tool Call Auditor
 *
 * Sistema de auditoria para chamadas de ferramentas dos agentes
 * Registra todas as invocações, parâmetros, resultados e erros
 *
 * Baseado no padrão OpenAI Cookbook: Tool Use Disciplinado
 * @see docs/ETAPA_2_TOOL_USE_GUIA.md
 */

import { logAgentExecution, logStructuredError } from "./agent_logger";
import type { ToolName } from "../tools/schemas";

/**
 * Interface para auditoria de tool calls
 */
export interface ToolCallAudit {
  agent_id: string;
  tool_name: ToolName | string;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration_ms: number;
  timestamp: number;
  session_id: string;
  success: boolean;
  validation_passed?: boolean;
  hallucination_detected?: boolean;
}

/**
 * Estatísticas de tool calls
 */
export interface ToolCallStats {
  tool_name: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_duration_ms: number;
  max_duration_ms: number;
  min_duration_ms: number;
  success_rate: number;
  last_call_timestamp?: number;
}

/**
 * In-memory storage para auditoria (simplificado)
 * Em produção, usar PostgreSQL ou similar
 */
class ToolAuditStorage {
  private audits: ToolCallAudit[] = [];
  private readonly maxSize = 10000;

  add(audit: ToolCallAudit): void {
    this.audits.push(audit);

    // Limitar tamanho (FIFO)
    if (this.audits.length > this.maxSize) {
      this.audits.shift();
    }
  }

  getAll(): ToolCallAudit[] {
    return [...this.audits];
  }

  getByAgent(agentId: string): ToolCallAudit[] {
    return this.audits.filter((a) => a.agent_id === agentId);
  }

  getByTool(toolName: string): ToolCallAudit[] {
    return this.audits.filter((a) => a.tool_name === toolName);
  }

  getBySession(sessionId: string): ToolCallAudit[] {
    return this.audits.filter((a) => a.session_id === sessionId);
  }

  getRecent(limit: number = 100): ToolCallAudit[] {
    return this.audits.slice(-limit);
  }

  getStats(agentId?: string, days: number = 7): ToolCallStats[] {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = this.audits.filter((a) => {
      const matchesAgent = !agentId || a.agent_id === agentId;
      const matchesTime = a.timestamp >= cutoffTime;
      return matchesAgent && matchesTime;
    });

    const byTool = new Map<string, ToolCallAudit[]>();
    for (const audit of filtered) {
      const existing = byTool.get(audit.tool_name) || [];
      existing.push(audit);
      byTool.set(audit.tool_name, existing);
    }

    const stats: ToolCallStats[] = [];
    for (const [toolName, audits] of byTool.entries()) {
      const successful = audits.filter((a) => a.success);
      const durations = audits.map((a) => a.duration_ms);

      stats.push({
        tool_name: toolName,
        total_calls: audits.length,
        successful_calls: successful.length,
        failed_calls: audits.length - successful.length,
        avg_duration_ms: durations.reduce((a, b) => a + b, 0) / durations.length,
        max_duration_ms: Math.max(...durations),
        min_duration_ms: Math.min(...durations),
        success_rate: successful.length / audits.length,
        last_call_timestamp: Math.max(...audits.map((a) => a.timestamp)),
      });
    }

    return stats.sort((a, b) => b.total_calls - a.total_calls);
  }

  clear(): void {
    this.audits = [];
  }
}

// Singleton storage
const storage = new ToolAuditStorage();

/**
 * Audita uma chamada de tool
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * try {
 *   const result = await executeTool(params);
 *   await auditToolCall({
 *     agent_id: "pesquisa-juris",
 *     tool_name: "legal_research",
 *     parameters: params,
 *     result,
 *     duration_ms: Date.now() - start,
 *     timestamp: Date.now(),
 *     session_id: "session_123",
 *     success: true,
 *   });
 * } catch (error) {
 *   await auditToolCall({
 *     agent_id: "pesquisa-juris",
 *     tool_name: "legal_research",
 *     parameters: params,
 *     error: error.message,
 *     duration_ms: Date.now() - start,
 *     timestamp: Date.now(),
 *     session_id: "session_123",
 *     success: false,
 *   });
 * }
 * ```
 */
export async function auditToolCall(audit: ToolCallAudit): Promise<void> {
  try {
    // Salvar no storage
    storage.add(audit);

    // Log estruturado
    logAgentExecution(audit.agent_id, "tool_call_audited", {
      tool: audit.tool_name,
      success: audit.success,
      duration_ms: audit.duration_ms,
      validation_passed: audit.validation_passed,
      hallucination: audit.hallucination_detected,
    });

    // Se falhou, logar erro
    if (!audit.success && audit.error) {
      logStructuredError(audit.agent_id, "ToolExecutionError", audit.error, {
        tool: audit.tool_name,
        parameters: audit.parameters,
      });
    }

    // Detectar anomalias (opcional)
    await detectAnomalies(audit);
  } catch (error) {
    console.error("Failed to audit tool call:", error);
  }
}

/**
 * Obtém estatísticas de tool calls
 *
 * @param agentId - Filtrar por agente (opcional)
 * @param days - Dias retroativos (default: 7)
 */
export async function getToolCallStats(
  agentId?: string,
  days: number = 7
): Promise<ToolCallStats[]> {
  return storage.getStats(agentId, days);
}

/**
 * Obtém auditorias recentes
 */
export function getRecentToolCalls(limit: number = 100): ToolCallAudit[] {
  return storage.getRecent(limit);
}

/**
 * Obtém auditorias por sessão
 */
export function getToolCallsBySession(sessionId: string): ToolCallAudit[] {
  return storage.getBySession(sessionId);
}

/**
 * Obtém auditorias por tool
 */
export function getToolCallsByTool(toolName: string): ToolCallAudit[] {
  return storage.getByTool(toolName);
}

/**
 * Limpa histórico de auditorias (uso em testes)
 */
export function clearToolAudits(): void {
  storage.clear();
}

/**
 * Wrapper para executar tool com auditoria automática
 *
 * @example
 * ```typescript
 * const result = await executeToolWithAudit(
 *   "pesquisa-juris",
 *   "legal_research",
 *   { query: "danos morais", tribunal: "STJ" },
 *   "session_123",
 *   async (params) => {
 *     return await searchLegalDatabase(params);
 *   }
 * );
 * ```
 */
export async function executeToolWithAudit<TInput, TOutput>(
  agentId: string,
  toolName: ToolName | string,
  parameters: TInput,
  sessionId: string,
  executor: (params: TInput) => Promise<TOutput>,
  options?: {
    validateInput?: boolean;
    validateOutput?: boolean;
  }
): Promise<TOutput> {
  const startTime = Date.now();
  const timestamp = Date.now();

  try {
    // Executar tool
    const result = await executor(parameters);
    const duration = Date.now() - startTime;

    // Auditar sucesso
    await auditToolCall({
      agent_id: agentId,
      tool_name: toolName,
      parameters: parameters as Record<string, unknown>,
      result,
      duration_ms: duration,
      timestamp,
      session_id: sessionId,
      success: true,
      validation_passed: options?.validateInput,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Auditar falha
    await auditToolCall({
      agent_id: agentId,
      tool_name: toolName,
      parameters: parameters as Record<string, unknown>,
      error: errorMessage,
      duration_ms: duration,
      timestamp,
      session_id: sessionId,
      success: false,
      validation_passed: options?.validateInput,
    });

    throw error;
  }
}

/**
 * Detecta anomalias em tool calls
 * (simplificado - em produção usar ML)
 */
async function detectAnomalies(audit: ToolCallAudit): Promise<void> {
  const recentCalls = storage.getByTool(audit.tool_name).slice(-50);

  if (recentCalls.length < 10) {
    return; // Dados insuficientes
  }

  // Calcular média e desvio padrão de duração
  const durations = recentCalls.map((a) => a.duration_ms);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const stdDev = Math.sqrt(
    durations.map((d) => Math.pow(d - avg, 2)).reduce((a, b) => a + b, 0) / durations.length
  );

  // Detectar outliers (> 3 desvios padrão)
  if (audit.duration_ms > avg + 3 * stdDev) {
    logStructuredError(audit.agent_id, "ToolAnomalyDetected", "Tool call muito lento", {
      tool: audit.tool_name,
      duration_ms: audit.duration_ms,
      avg_duration_ms: avg,
      threshold_ms: avg + 3 * stdDev,
    });
  }

  // Detectar taxa de erro alta
  const recentFailures = recentCalls.filter((a) => !a.success).length;
  const failureRate = recentFailures / recentCalls.length;

  if (failureRate > 0.3) {
    // > 30% de falhas
    logStructuredError(
      audit.agent_id,
      "ToolHighFailureRate",
      `Taxa de erro alta: ${(failureRate * 100).toFixed(1)}%`,
      {
        tool: audit.tool_name,
        failure_rate: failureRate,
        recent_calls: recentCalls.length,
      }
    );
  }
}

/**
 * Exporta storage para testes
 */
export const __testing__ = {
  storage,
};
