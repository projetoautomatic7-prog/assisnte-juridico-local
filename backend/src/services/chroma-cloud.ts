/**
 * Chroma Cloud Service - Semantic search on repo collection
 * Consulta a collection indexada do repositório no Chroma Cloud
 */

import { CloudClient, type Collection, type Where, type WhereDocument } from "chromadb";

interface ChromaConfig {
  apiKey: string;
  tenant: string;
  database: string;
  collectionName: string;
}

interface SearchResult {
  id: string;
  document: string;
  metadata: Record<string, unknown>;
  distance: number;
}

interface SemanticSearchOptions {
  query: string;
  nResults?: number;
  whereMetadata?: Where;
  whereDocument?: WhereDocument;
}

class ChromaCloudService {
  private client: CloudClient | null = null;
  private collection: Collection | null = null;
  private config: ChromaConfig | null = null;
  private clientPromise: Promise<CloudClient> | null = null;
  private collectionPromise: Promise<Collection> | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const apiKey = process.env.CHROMA_API_KEY || process.env.CHROMA_CLOUD_API_KEY;
    const tenant = process.env.CHROMA_TENANT;
    const database = process.env.CHROMA_DATABASE;
    const collectionName = process.env.CHROMA_COLLECTION_NAME;

    if (!apiKey || !tenant || !database || !collectionName) {
      console.warn(
        "[Chroma Cloud] Missing configuration (CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE, CHROMA_COLLECTION_NAME). RAG disabled."
      );
      return;
    }

    this.config = {
      apiKey,
      tenant,
      database,
      collectionName,
    };

    console.log(`[Chroma Cloud] Config loaded - DB: ${database}, Collection: ${collectionName}`);
  }

  private async ensureClient(): Promise<CloudClient> {
    if (!this.config) {
      throw new Error("Chroma Cloud not configured");
    }

    if (this.client) {
      return this.client;
    }

    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = (async () => {
      this.client = new CloudClient({
        apiKey: this.config!.apiKey,
        tenant: this.config!.tenant,
        database: this.config!.database,
      });
      console.log("[Chroma Cloud] Client initialized");
      this.clientPromise = null;
      return this.client;
    })();

    return this.clientPromise;
  }

  private async ensureCollection(): Promise<Collection> {
    if (!this.config) {
      throw new Error("Chroma Cloud not configured");
    }

    if (this.collection) {
      return this.collection;
    }

    if (this.collectionPromise) {
      return this.collectionPromise;
    }

    this.collectionPromise = (async () => {
      const client = await this.ensureClient();
      try {
        this.collection = await client.getCollection({
          name: this.config!.collectionName,
        });
        console.log(`[Chroma Cloud] Collection "${this.config!.collectionName}" loaded`);
        this.collectionPromise = null;
        return this.collection;
      } catch (err) {
        this.collectionPromise = null;
        console.error("[Chroma Cloud] Failed to get collection:", err);
        throw new Error(`Collection "${this.config!.collectionName}" not found`);
      }
    })();

    return this.collectionPromise;
  }

  /**
   * Semantic search on repo collection
   */
  async search(options: SemanticSearchOptions): Promise<SearchResult[]> {
    const { query, nResults = 5, whereMetadata, whereDocument } = options;

    if (!this.config) {
      throw new Error(
        "Chroma Cloud not configured. Check CHROMA_API_KEY/CHROMA_TENANT/CHROMA_DATABASE."
      );
    }

    try {
      const collection = await this.ensureCollection();

      const result = await collection.query({
        queryTexts: [query],
        nResults,
        ...(whereMetadata ? { where: whereMetadata } : {}),
        ...(whereDocument ? { whereDocument } : {}),
      });

      if (!result.ids || !result.ids[0] || result.ids[0].length === 0) {
        return [];
      }

      const results: SearchResult[] = [];
      for (let i = 0; i < result.ids[0].length; i++) {
        results.push({
          id: result.ids[0][i],
          document: result.documents[0]?.[i] || "",
          metadata: (result.metadatas[0]?.[i] as Record<string, unknown>) || {},
          distance: result.distances?.[0]?.[i] ?? 1.0,
        });
      }

      console.log(`[Chroma Cloud] Search returned ${results.length} results for: "${query}"`);
      return results;
    } catch (err) {
      console.error("[Chroma Cloud] Search error:", err);
      throw err;
    }
  }

  /**
   * List all collections (for debugging)
   */
  async listCollections(): Promise<string[]> {
    try {
      const client = await this.ensureClient();
      const collections = await client.listCollections();
      return collections.map((c) => c.name);
    } catch (err) {
      console.error("[Chroma Cloud] Failed to list collections:", err);
      return [];
    }
  }

  /**
   * Get collection count (if available)
   */
  async getCollectionCount(): Promise<number> {
    try {
      const collection = await this.ensureCollection();
      const count = await collection.count();
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }
}

// Singleton
export const chromaCloud = new ChromaCloudService();
