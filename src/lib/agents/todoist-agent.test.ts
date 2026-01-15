import { describe, expect, it } from "vitest";
import { todoistAgent } from "./todoist-agent";

describe("TodoistAgent - comportamento mínimo", () => {
  it("deve aceitar evento desconhecido sem lançar erro", async () => {
    await expect(
      todoistAgent.processWebhookEvent({
        event_name: "unknown:event",
        event_data: { id: "1", content: "Evento desconhecido" },
      })
    ).resolves.toBeUndefined();
  });
});
