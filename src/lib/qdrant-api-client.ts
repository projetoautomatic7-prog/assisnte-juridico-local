import type { QdrantClient, QdrantPoint, SearchResult } from "./qdrant-service";

export class QdrantApiClient implements QdrantClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || "";
  }

  async search(
    vector: number[],
    limit: number = 10,
    filter?: Record<string, unknown>,
  ): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseUrl}/api/qdrant/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vector, limit, filter }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant search failed: ${response.status}`);
    }

    const data = await response.json();
    return (data?.result || []) as SearchResult[];
  }

  async upsert(points: QdrantPoint[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/qdrant/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    });

    if (!response.ok) {
      throw new Error(`Qdrant upsert failed: ${response.status}`);
    }
  }
}
