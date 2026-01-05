import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock hoisted - garante que seja aplicado antes de qualquer import no worker
const { mockKvData, mockSetKv } = vi.hoisted(() => {
  const data = [
    {
      id: "1",
      processId: "123.456",
      numeroProcesso: "123.456",
      source: "djen",
    },
    {
      id: "2",
      processId: "999.999",
      numeroProcesso: "999.999",
      source: "djen",
    },
  ];
  return {
    mockKvData: data,
    mockSetKv: vi.fn(),
  };
});

// Mock aplicado em nível de módulo antes de imports
vi.mock("./use-kv", () => ({
  useKV: () => [mockKvData, mockSetKv],
}));

describe("useTimelineSync", () => {
  it("deve filtrar expedientes ignorando formatação (replaceAll)", async () => {
    const { useTimelineSync } = await import("./use-timeline-sync");
    // Simula um processId com formatação diferente mas mesmos dígitos
    const { result } = renderHook(() =>
      useTimelineSync({ processId: "123456", autoRefresh: false })
    );

    // Aguardar processamento com timeout de 5 segundos
    // (o foco do teste é o filtro por número de processo, independente da transformação da timeline)
    await waitFor(
      () => {
        expect(result.current.expedientes).toHaveLength(1);
      },
      { timeout: 5000 }
    );

    // Deve encontrar o expediente "123.456" porque "123456" == "123456" (após replaceAll(/\D/g, ""))
    expect(result.current.expedientes[0].id).toBe("1");
  });

  it("deve retornar vazio se não houver match", async () => {
    const { useTimelineSync } = await import("./use-timeline-sync");
    const { result } = renderHook(() =>
      useTimelineSync({ processId: "000000", autoRefresh: false })
    );

    // Aguardar processamento
    await waitFor(
      () => {
        expect(result.current.events).toBeDefined();
      },
      { timeout: 5000 }
    );

    expect(result.current.events).toHaveLength(0);
    expect(result.current.expedientes).toHaveLength(0);
  });
});
