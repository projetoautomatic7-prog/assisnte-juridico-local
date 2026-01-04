/**
 * Testes para use-pje-realtime-sync.ts
 * Valida correção de memory leak no timeout dentro de setInterval
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePJERealTimeSync } from "./use-pje-realtime-sync";

describe("usePJERealTimeSync - Memory Leak Prevention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock window.postMessage
    global.window.postMessage = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("deve limpar timeout ao desmontar hook", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { unmount } = renderHook(() => usePJERealTimeSync());

    // Avançar 30s para disparar connectionCheckInterval
    vi.advanceTimersByTime(30000);

    // Desmontar hook
    unmount();

    // clearTimeout deve ter sido chamado para limpar timeout pendente
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("deve limpar timeout anterior ao criar novo no connectionCheckInterval", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    renderHook(() => usePJERealTimeSync());

    // Avançar 30s - primeiro check
    vi.advanceTimersByTime(30000);
    const firstCallCount = clearTimeoutSpy.mock.calls.length;

    // Avançar mais 30s - segundo check
    vi.advanceTimersByTime(30000);
    const secondCallCount = clearTimeoutSpy.mock.calls.length;

    // Deve ter chamado clearTimeout mais vezes no segundo check
    // (limpando o timeout anterior)
    expect(secondCallCount).toBeGreaterThan(firstCallCount);
  });

  it("deve limpar interval ao desmontar", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { unmount } = renderHook(() => usePJERealTimeSync());

    unmount();

    // clearInterval deve ter sido chamado
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("não deve vazar timeouts em múltiplos ciclos de connectionCheck", () => {
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    renderHook(() => usePJERealTimeSync());

    // Executar 5 ciclos de connectionCheck (30s cada)
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(30000);
    }

    // Número de clearTimeout deve ser próximo ao número de setTimeout
    // (menos 1 porque o último timeout criado ainda está ativo)
    const setTimeoutCalls = setTimeoutSpy.mock.calls.length;
    const clearTimeoutCalls = clearTimeoutSpy.mock.calls.length;

    // Cada ciclo cria 1 timeout, e limpa o anterior
    // Então após 5 ciclos: 5 setTimeout, 4 clearTimeout
    expect(clearTimeoutCalls).toBeGreaterThanOrEqual(setTimeoutCalls - 2);
  });

  it("deve enviar PING inicial ao montar", () => {
    const postMessageSpy = vi.spyOn(window, "postMessage");

    renderHook(() => usePJERealTimeSync());

    // Verificar que postMessage foi chamado com PING
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PING",
      }),
      window.location.origin
    );
  });
});
