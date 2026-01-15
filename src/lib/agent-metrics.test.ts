import { describe, expect, it } from "vitest";
import { stopMetricsCleanup } from "./agent-metrics";

describe("AgentMetrics - estabilidade básica", () => {
  it("não deve falhar ao chamar stopMetricsCleanup múltiplas vezes", () => {
    expect(() => {
      stopMetricsCleanup();
      stopMetricsCleanup();
      stopMetricsCleanup();
    }).not.toThrow();
  });
});
