import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { z } from "zod";

export const ai = genkit({
  plugins: [googleAI()],
  model: process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || "gemini-2.0-flash",
});

/**
 * Recuperador Semântico (Retriever) para o Qdrant.
 * Utiliza busca vetorial para encontrar contextos jurídicos relevantes.
 */
export const qdrantRetriever = ai.defineRetriever(
  {
    name: "qdrant/legalRetriever",
    configSchema: z.object({
      limit: z.number().optional(),
      filter: z.unknown().optional(),
    }),
  },
  async (query, options) => {
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3001";
    const response = await fetch(`${baseUrl}/api/qdrant/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query.text,
        limit: options.limit || 5,
        filter: options.filter,
      }),
    });
    const result = await response.json();
    return { documents: result.documents || [] };
  }
);
