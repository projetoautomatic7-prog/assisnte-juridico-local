/**
 * Testes para agent-metrics.ts
 * Valida correção de memory leak no setInterval de cleanup
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metricsCollector, stopMetricsCleanup } from "./agent-metrics";

describe("AgentMetrics - Memory Leak Prevention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    stopMetricsCleanup(); // Garantir cleanup
  });

  it("deve limpar interval de cleanup automaticamente", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    // Chamar stop cleanup
    stopMetricsCleanup();

    // Verificar que clearInterval foi chamado
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("não deve falhar ao chamar stopMetricsCleanup múltiplas vezes", () => {
    expect(() => {
      stopMetricsCleanup();
      stopMetricsCleanup();
      stopMetricsCleanup();
    }).not.toThrow();
  });

  it("deve executar cleanup automaticamente a cada 5 minutos", () => {
    const cleanupSpy = vi.spyOn(metricsCollector, "cleanup");

    // Avançar 5 minutos
    vi.advanceTimersByTime(5 * 60 * 1000);

    // Verificar se cleanup foi chamado
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Avançar mais 5 minutos
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);

    cleanupSpy.mockRestore();
  });

  it("deve parar cleanup após stopMetricsCleanup()", () => {
    const cleanupSpy = vi.spyOn(metricsCollector, "cleanup");

    // Parar cleanup
    stopMetricsCleanup();

    // Avançar 10 minutos
    vi.advanceTimersByTime(10 * 60 * 1000);

    // Cleanup não deve ter sido chamado
    expect(cleanupSpy).not.toHaveBeenCalled();

    cleanupSpy.mockRestore();
  });
});
