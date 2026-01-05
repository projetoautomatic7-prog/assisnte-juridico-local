import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Observação: no config atual (pool=forks + singleFork), o cache de módulos pode
// vazar entre arquivos. Para manter o teste determinístico, registramos o mock
// de use-kv de forma hoisted e sempre reimportamos o hook após resetModules.
const hoisted = vi.hoisted(() => ({
  kvData: [
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
  ],
  setKv: vi.fn(),
}));

vi.mock("./use-kv", () => ({
  useKV: () => [hoisted.kvData, hoisted.setKv],
}));

async function loadHook() {
  // Importante: no config atual (pool=forks + singleFork), módulos podem ficar em cache
  // entre arquivos de teste. Resetar módulos aqui garante que o useKV leia do
  // mock recém-preparado para este teste.
  vi.resetModules();
  const mod = await import("./use-timeline-sync");
  return mod.useTimelineSync;
}

describe("useTimelineSync", () => {
  beforeEach(() => {
    hoisted.setKv.mockClear();
    hoisted.kvData = [
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
  });

  it("deve filtrar expedientes ignorando formatação (replaceAll)", async () => {
    const useTimelineSync = await loadHook();
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
    const useTimelineSync = await loadHook();
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
