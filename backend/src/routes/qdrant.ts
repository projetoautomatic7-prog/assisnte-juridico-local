import { Router } from "express";

const router = Router();

const QDRANT_DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION_NAME || "legal_docs";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function getQdrantConfig() {
  const url = process.env.QDRANT_URL || "";
  const apiKey = process.env.QDRANT_API_KEY || "";
  return { url, apiKey };
}

function assertQdrantConfigured() {
  const { url, apiKey } = getQdrantConfig();
  if (!url || !apiKey) {
    throw new Error("QDRANT_URL ou QDRANT_API_KEY não configurado");
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const response = await fetch(
    `${GEMINI_API_URL}/text-embedding-004:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini embedding error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const embedding = data?.embedding?.values;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Resposta inválida da API Gemini");
  }

  return embedding;
}

router.post("/search", async (req, res) => {
  try {
    assertQdrantConfigured();
    const { url: QDRANT_URL, apiKey: QDRANT_API_KEY } = getQdrantConfig();

    const { query, vector, limit, filter, collectionName } = req.body as {
      query?: string;
      vector?: number[];
      limit?: number;
      filter?: Record<string, unknown>;
      collectionName?: string;
    };

    if ((!query || query.trim().length === 0) && !Array.isArray(vector)) {
      return res.status(400).json({ error: "Informe query ou vector para busca" });
    }

    const collection = collectionName || QDRANT_DEFAULT_COLLECTION;
    const embedding = Array.isArray(vector) ? vector : await generateEmbedding(String(query));
    const requestedLimit = typeof limit === "number" ? limit : 10;
    const safeLimit = Math.min(Math.max(requestedLimit, 1), 50);

    const response = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": QDRANT_API_KEY,
      },
      body: JSON.stringify({
        vector: embedding,
        limit: safeLimit,
        filter,
        with_payload: true,
        with_vector: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: "Qdrant error", detail: errorText });
    }

    const data = await response.json();
    return res.json({ result: data.result || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return res.status(500).json({ error: "Qdrant search failed", message });
  }
});

router.post("/upsert", async (req, res) => {
  try {
    assertQdrantConfigured();
    const { url: QDRANT_URL, apiKey: QDRANT_API_KEY } = getQdrantConfig();

    const { points, content, metadata, id, collectionName } = req.body as {
      points?: Array<{ id: string | number; vector: number[]; payload: Record<string, unknown> }>;
      content?: string;
      metadata?: Record<string, unknown>;
      id?: string | number;
      collectionName?: string;
    };

    let upsertPoints = points;

    if (!upsertPoints) {
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Informe points ou content para upsert" });
      }

      const embedding = await generateEmbedding(content);
      upsertPoints = [
        {
          id: id ?? `qdrant_${Date.now()}`,
          vector: embedding,
          payload: {
            content,
            metadata: metadata || {},
            createdAt: new Date().toISOString(),
          },
        },
      ];
    }

    const collection = collectionName || QDRANT_DEFAULT_COLLECTION;

    const response = await fetch(`${QDRANT_URL}/collections/${collection}/points`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": QDRANT_API_KEY,
      },
      body: JSON.stringify({ points: upsertPoints }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: "Qdrant error", detail: errorText });
    }

    return res.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return res.status(500).json({ error: "Qdrant upsert failed", message });
  }
});

export default router;
