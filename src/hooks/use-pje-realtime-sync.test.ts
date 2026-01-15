import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePJERealTimeSync } from "./use-pje-realtime-sync";

function waitForPing(): Promise<MessageEvent> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Timeout aguardando PING"));
    }, 1000);

    function handler(event: MessageEvent) {
      const data = event.data as { type?: string };
      if (data?.type === "PING") {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handler);
        resolve(event);
      }
    }

    window.addEventListener("message", handler);
  });
}

describe("usePJERealTimeSync", () => {
  it("deve emitir PING ao montar", async () => {
    const pingPromise = waitForPing();
    renderHook(() => usePJERealTimeSync());

    const messageEvent = await pingPromise;
    expect((messageEvent.data as { type?: string }).type).toBe("PING");
  });

  it("deve montar e desmontar sem erros", () => {
    const { unmount } = renderHook(() => usePJERealTimeSync());
    expect(() => unmount()).not.toThrow();
  });
});
