import { describe, it, expect } from "vitest";
import { QdrantService } from "@/lib/qdrant-service";
import type { QdrantPoint } from "@/lib/qdrant-service";

describe("QdrantService - validações sem rede", () => {
  it("deve rejeitar vetor com dimensão incorreta no search", async () => {
    const q = new QdrantService({
      url: "http://localhost:6333",
      apiKey: "test",
      collectionName: "test",
      timeout: 1000,
    });

    (q as unknown as { collectionVectorSize?: number }).collectionVectorSize = 3;

    await expect(q.search([1, 2], 5)).rejects.toThrow("Vector must have exactly 3 dimensions");
  });

  it("deve rejeitar payloads inválidos no upsert", async () => {
    const q = new QdrantService({
      url: "http://localhost:6333",
      apiKey: "test",
      collectionName: "test",
      timeout: 1000,
    });

    (q as unknown as { collectionVectorSize?: number }).collectionVectorSize = 4;

    const badPointMissingId = {
      vector: [1, 2, 3, 4],
      payload: { text: "ok" },
    } as unknown as QdrantPoint;

    const badPointNullPayload = {
      id: "1",
      vector: [1, 2, 3, 4],
      payload: null,
    } as unknown as QdrantPoint;

    const badPointWrongVector = {
      id: "2",
      vector: [1, 2],
      payload: { text: "ok" },
    } as unknown as QdrantPoint;

    await expect(q.upsert([] as unknown as QdrantPoint[])).rejects.toThrow(
      "Points must be a non-empty array"
    );
    await expect(q.upsert([badPointMissingId])).rejects.toThrow(/missing id/i);
    await expect(q.upsert([badPointNullPayload])).rejects.toThrow(/invalid payload/i);
    await expect(q.upsert([badPointWrongVector])).rejects.toThrow(/dimensions/);
  });
});
