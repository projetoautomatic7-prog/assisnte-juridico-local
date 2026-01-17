import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTimelineSync } from "./use-timeline-sync";

function writeExpedientes(value: unknown) {
  localStorage.setItem("expedientes", JSON.stringify(value));
}

describe("useTimelineSync", () => {
  it("deve filtrar expedientes ignorando formatação", async () => {
    writeExpedientes([
      {
        id: "1",
        processId: "123456",
        numeroProcesso: "123.456",
        source: "djen",
        description: "Evento A",
        type: "intimacao",
        createdAt: new Date().toISOString(),
        metadata: {
          vara: "Vara 1",
          comarca: "Comarca 1",
          timestamp: Date.now(),
        },
      },
      {
        id: "2",
        processId: "999.999",
        numeroProcesso: "999.999",
        source: "djen",
        description: "Evento B",
        type: "intimacao",
        createdAt: new Date().toISOString(),
        metadata: {
          vara: "Vara 2",
          comarca: "Comarca 2",
          timestamp: Date.now(),
        },
      },
    ]);

    const { result } = renderHook(() =>
      useTimelineSync({ processId: "123456", autoRefresh: false }),
    );

    await waitFor(() => {
      expect(result.current.expedientes).toHaveLength(1);
    });

    expect(result.current.expedientes[0].id).toBe("1");
  });

  it("deve retornar vazio se não houver match", async () => {
    writeExpedientes([
      {
        id: "1",
        processId: "123456",
        numeroProcesso: "123.456",
        source: "djen",
        description: "Evento A",
        type: "intimacao",
        createdAt: new Date().toISOString(),
        metadata: {
          vara: "Vara 1",
          comarca: "Comarca 1",
          timestamp: Date.now(),
        },
      },
    ]);

    const { result } = renderHook(() =>
      useTimelineSync({ processId: "000000", autoRefresh: false }),
    );

    await waitFor(() => {
      expect(result.current.expedientes).toBeDefined();
    });

    expect(result.current.events).toHaveLength(0);
    expect(result.current.expedientes).toHaveLength(0);
  });
});
