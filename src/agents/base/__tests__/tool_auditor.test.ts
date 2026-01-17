/**
 * Tool Auditor Tests
 * Testa sistema de auditoria de tool calls
 */

import { describe, test, expect, beforeEach } from "vitest";
import {
  auditToolCall,
  getToolCallStats,
  getRecentToolCalls,
  getToolCallsBySession,
  getToolCallsByTool,
  clearToolAudits,
  executeToolWithAudit,
  __testing__,
} from "../tool_auditor";

describe("Tool Auditor", () => {
  beforeEach(() => {
    clearToolAudits();
  });

  test("registra tool call com sucesso", async () => {
    await auditToolCall({
      agent_id: "pesquisa-juris",
      tool_name: "legal_research",
      parameters: { query: "danos morais", tribunal: "STJ" },
      result: { precedentes: [], total_found: 0 },
      duration_ms: 150,
      timestamp: Date.now(),
      session_id: "session_123",
      success: true,
    });

    const recent = getRecentToolCalls(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].agent_id).toBe("pesquisa-juris");
    expect(recent[0].success).toBe(true);
  });

  test("registra tool call com erro", async () => {
    await auditToolCall({
      agent_id: "monitor-djen",
      tool_name: "djen_monitor",
      parameters: { oab_number: "SP123456" },
      error: "API timeout",
      duration_ms: 5000,
      timestamp: Date.now(),
      session_id: "session_456",
      success: false,
    });

    const recent = getRecentToolCalls(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].success).toBe(false);
    expect(recent[0].error).toBe("API timeout");
  });

  test("filtra por sessão", async () => {
    await auditToolCall({
      agent_id: "harvey",
      tool_name: "legal_research",
      parameters: {},
      duration_ms: 100,
      timestamp: Date.now(),
      session_id: "session_A",
      success: true,
    });

    await auditToolCall({
      agent_id: "harvey",
      tool_name: "legal_research",
      parameters: {},
      duration_ms: 120,
      timestamp: Date.now(),
      session_id: "session_B",
      success: true,
    });

    const sessionA = getToolCallsBySession("session_A");
    const sessionB = getToolCallsBySession("session_B");

    expect(sessionA).toHaveLength(1);
    expect(sessionB).toHaveLength(1);
    expect(sessionA[0].session_id).toBe("session_A");
  });

  test("filtra por tool", async () => {
    await auditToolCall({
      agent_id: "pesquisa-juris",
      tool_name: "legal_research",
      parameters: {},
      duration_ms: 100,
      timestamp: Date.now(),
      session_id: "session_1",
      success: true,
    });

    await auditToolCall({
      agent_id: "monitor-djen",
      tool_name: "djen_monitor",
      parameters: {},
      duration_ms: 200,
      timestamp: Date.now(),
      session_id: "session_2",
      success: true,
    });

    const legalResearch = getToolCallsByTool("legal_research");
    const djenMonitor = getToolCallsByTool("djen_monitor");

    expect(legalResearch).toHaveLength(1);
    expect(djenMonitor).toHaveLength(1);
    expect(legalResearch[0].tool_name).toBe("legal_research");
  });

  test("calcula estatísticas corretamente", async () => {
    // Adicionar 5 calls bem-sucedidos
    for (let i = 0; i < 5; i++) {
      await auditToolCall({
        agent_id: "pesquisa-juris",
        tool_name: "legal_research",
        parameters: {},
        duration_ms: 100 + i * 10,
        timestamp: Date.now(),
        session_id: `session_${i}`,
        success: true,
      });
    }

    // Adicionar 2 calls com erro
    for (let i = 0; i < 2; i++) {
      await auditToolCall({
        agent_id: "pesquisa-juris",
        tool_name: "legal_research",
        parameters: {},
        error: "Erro teste",
        duration_ms: 50,
        timestamp: Date.now(),
        session_id: `session_err_${i}`,
        success: false,
      });
    }

    const stats = await getToolCallStats("pesquisa-juris", 7);

    expect(stats).toHaveLength(1);
    expect(stats[0].tool_name).toBe("legal_research");
    expect(stats[0].total_calls).toBe(7);
    expect(stats[0].successful_calls).toBe(5);
    expect(stats[0].failed_calls).toBe(2);
    expect(stats[0].success_rate).toBeCloseTo(5 / 7, 2);
  });

  test("limita tamanho do storage", async () => {
    const maxSize = __testing__.storage["maxSize"];

    // Adicionar mais que o limite
    for (let i = 0; i < maxSize + 100; i++) {
      await auditToolCall({
        agent_id: "test",
        tool_name: "test_tool",
        parameters: {},
        duration_ms: 100,
        timestamp: Date.now(),
        session_id: `session_${i}`,
        success: true,
      });
    }

    const all = getRecentToolCalls(maxSize + 200);
    expect(all.length).toBeLessThanOrEqual(maxSize);
  });

  test("executeToolWithAudit registra sucesso", async () => {
    const mockExecutor = async (params: { query: string }) => {
      return { results: [`Result for ${params.query}`] };
    };

    const result = await executeToolWithAudit(
      "harvey",
      "legal_research",
      { query: "teste" },
      "session_test",
      mockExecutor,
    );

    expect(result.results).toHaveLength(1);

    const recent = getRecentToolCalls(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].success).toBe(true);
  });

  test("executeToolWithAudit registra erro", async () => {
    const mockExecutor = async () => {
      throw new Error("Erro simulado");
    };

    await expect(
      executeToolWithAudit(
        "harvey",
        "legal_research",
        { query: "teste" },
        "session_error",
        mockExecutor,
      ),
    ).rejects.toThrow("Erro simulado");

    const recent = getRecentToolCalls(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].success).toBe(false);
    expect(recent[0].error).toBe("Erro simulado");
  });

  test("clearToolAudits limpa o storage", async () => {
    await auditToolCall({
      agent_id: "test",
      tool_name: "test_tool",
      parameters: {},
      duration_ms: 100,
      timestamp: Date.now(),
      session_id: "session_test",
      success: true,
    });

    expect(getRecentToolCalls(10)).toHaveLength(1);

    clearToolAudits();

    expect(getRecentToolCalls(10)).toHaveLength(0);
  });

  test("calcula avg_duration_ms corretamente", async () => {
    const durations = [100, 200, 300, 400, 500];

    for (const duration of durations) {
      await auditToolCall({
        agent_id: "test",
        tool_name: "test_tool",
        parameters: {},
        duration_ms: duration,
        timestamp: Date.now(),
        session_id: "session_test",
        success: true,
      });
    }

    const stats = await getToolCallStats("test", 7);
    const avgExpected = durations.reduce((a, b) => a + b, 0) / durations.length;

    expect(stats[0].avg_duration_ms).toBe(avgExpected);
    expect(stats[0].min_duration_ms).toBe(100);
    expect(stats[0].max_duration_ms).toBe(500);
  });

  test("ordena estatísticas por total_calls", async () => {
    // Tool A: 5 calls
    for (let i = 0; i < 5; i++) {
      await auditToolCall({
        agent_id: "agent_a",
        tool_name: "tool_a",
        parameters: {},
        duration_ms: 100,
        timestamp: Date.now(),
        session_id: `session_${i}`,
        success: true,
      });
    }

    // Tool B: 10 calls
    for (let i = 0; i < 10; i++) {
      await auditToolCall({
        agent_id: "agent_b",
        tool_name: "tool_b",
        parameters: {},
        duration_ms: 100,
        timestamp: Date.now(),
        session_id: `session_${i}`,
        success: true,
      });
    }

    const stats = await getToolCallStats(undefined, 7);

    expect(stats).toHaveLength(2);
    expect(stats[0].tool_name).toBe("tool_b"); // Mais calls primeiro
    expect(stats[0].total_calls).toBe(10);
    expect(stats[1].tool_name).toBe("tool_a");
    expect(stats[1].total_calls).toBe(5);
  });
});
