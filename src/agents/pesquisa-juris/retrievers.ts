/**
 * Retrievers para busca de jurisprudência
 * Baseado no padrão Google Agent Starter Pack (agentic_rag/retrievers.py)
 */

import { getGeminiApiKey, isGeminiConfigured } from "@/lib/gemini-config";
import { QdrantService, type SearchResult as QdrantSearchResult } from "@/lib/qdrant-service";
import type { PesquisaJurisInput } from "./validators";

const EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent";
const EMBEDDING_DIMENSION = 768;

export interface Precedente {
  titulo: string;
  ementa: string;
  relevancia: number;
  tribunal: string;
  data: string;
  numeroProcesso?: string;
  relator?: string;
  tags?: string[];
}

export interface SearchResult {
  precedentes: Precedente[];
  totalFound: number;
  avgRelevance: number;
  query: string;
  executionTimeMs: number;
}

/**
 * Retriever para busca de jurisprudência em base vetorial (Qdrant)
 *
 * @example
 * ```typescript
 * const retriever = new JurisprudenceRetriever();
 * const results = await retriever.search({
 *   tema: "direito à greve",
 *   tribunal: "STF",
 *   limit: 10
 * });
 * ```
 */
export class JurisprudenceRetriever {
  private readonly collectionName = "jurisprudencias";
  private readonly qdrantService: QdrantService | null = null;

  constructor() {
    // ✅ Conectar Qdrant real se credenciais disponíveis
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantKey = process.env.QDRANT_API_KEY;

    if (qdrantUrl && qdrantKey && typeof qdrantUrl === "string" && typeof qdrantKey === "string") {
      try {
        this.qdrantService = new QdrantService({
          url: qdrantUrl,
          apiKey: qdrantKey,
          collectionName: this.collectionName,
          timeout: 30000,
        });
        console.log("✅ Qdrant connected:", { url: qdrantUrl, collection: this.collectionName });
      } catch (error) {
        console.error("❌ Qdrant connection failed:", error);
      }
    } else {
      console.error("❌ Qdrant credentials not found");
    }
  }

  /**
   * Executa busca de precedentes com re-ranking por relevância
   *
   * @param input - Parâmetros de busca validados
   * @returns Resultados com precedentes ordenados por relevância
   * @throws {Error} Se Qdrant não estiver disponível
   * @throws {Error} Se embeddings falharem
   */
  async search(input: PesquisaJurisInput): Promise<SearchResult> {
    const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const startTime = nowMs();

    try {
      // 1. Gerar embeddings para o tema
      const embeddings = await this.generateEmbeddings(input.tema);

      // 2. Buscar documentos similares no Qdrant
      const rawResults = await this.searchVectorDatabase(embeddings, input);

      // 3. Re-ranking: filtrar por relevância e ordenar
      const rankedPrecedentes = this.reRankResults(rawResults, input.relevanceThreshold || 0.7);

      // 4. Filtrar por tribunal se especificado
      const filteredPrecedentes = this.filterByTribunal(
        rankedPrecedentes,
        input.tribunal || "todos"
      );

      // 5. Limitar resultados
      const finalPrecedentes = filteredPrecedentes.slice(0, input.limit || 10);

      // Em execuções muito rápidas (especialmente com fallback), o delta pode ser < 1ms.
      // Garantimos valor mínimo 1ms para manter consistência e evitar flakiness em CI.
      const executionTimeMs = Math.max(1, Math.round(nowMs() - startTime));

      return {
        precedentes: finalPrecedentes,
        totalFound: filteredPrecedentes.length,
        avgRelevance: this.calculateAverageRelevance(finalPrecedentes),
        query: input.tema,
        executionTimeMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.name : "UnknownError";

      // Estruturar erro seguindo padrão Google
      throw new Error(
        `Calling retrieval tool with query:\n\n${input.tema}\n\n` +
          `raised the following error:\n\n${errorType}: ${errorMessage}`
      );
    }
  }

  /**
   * Gera embeddings usando Google Gemini Text Embedding API
   * Modelo: text-embedding-004 (768 dimensões)
   * Gera embeddings via Gemini API
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    if (!isGeminiConfigured()) {
      throw new Error("Gemini API não configurada para embeddings");
    }

    try {
      const apiKey = getGeminiApiKey();
      const startTime = Date.now();

      console.log("🔄 [Embeddings] Gerando embedding real via Gemini API...", {
        textLength: text.length,
        model: "text-embedding-004",
      });

      const response = await fetch(`${EMBEDDING_API_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("❌ [Embeddings] Erro na API Gemini:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const embeddings = data?.embedding?.values;

      if (!embeddings || !Array.isArray(embeddings)) {
        console.error("❌ [Embeddings] Resposta inválida da API:", data);
        throw new Error("Invalid embedding response from Gemini API");
      }

      const elapsedMs = Date.now() - startTime;
      console.log("✅ [Embeddings] Embedding gerado com sucesso:", {
        dimension: embeddings.length,
        elapsedMs,
      });

      if (embeddings.length !== EMBEDDING_DIMENSION) {
        console.warn(
          `⚠️ [Embeddings] Dimensão inesperada: ${embeddings.length} (esperado: ${EMBEDDING_DIMENSION})`
        );
      }

      return embeddings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        "❌ [Embeddings] Falha ao gerar embedding real:",
        errorMessage
      );
      throw new Error(`Falha ao gerar embedding real: ${errorMessage}`);
    }
  }

  /**
   * Busca na base vetorial Qdrant
   * Busca na base vetorial Qdrant
   */
  private async searchVectorDatabase(
    embeddings: number[],
    input: PesquisaJurisInput
  ): Promise<Precedente[]> {
    if (!this.qdrantService) {
      throw new Error("Qdrant não configurado");
    }

    const qdrantResults = await this.qdrantService.search(embeddings, input.limit || 10);
    return this.mapQdrantResultsToPrecedentes(qdrantResults);
  }

  /**
   * Mapeia resultados do Qdrant para interface Precedente
   */
  private mapQdrantResultsToPrecedentes(results: QdrantSearchResult[]): Precedente[] {
    return results.map((result) => ({
      titulo: (result.payload.titulo as string) || "Sem título",
      ementa: (result.payload.ementa as string) || "Sem ementa",
      relevancia: result.score,
      tribunal: (result.payload.tribunal as string) || "Desconhecido",
      data: (result.payload.data as string) || new Date().toISOString().split("T")[0],
      numeroProcesso: result.payload.numeroProcesso as string | undefined,
      relator: result.payload.relator as string | undefined,
      tags: (result.payload.tags as string[]) || [],
    }));
  }


  /**
   * Re-ranking: filtra e ordena por relevância
   * Baseado em compressor.compress_documents() do Google
   */
  private reRankResults(precedentes: Precedente[], threshold: number): Precedente[] {
    return precedentes
      .filter((p) => p.relevancia >= threshold)
      .sort((a, b) => b.relevancia - a.relevancia);
  }

  /**
   * Filtra precedentes por tribunal
   */
  private filterByTribunal(precedentes: Precedente[], tribunal: string): Precedente[] {
    if (tribunal === "todos") {
      return precedentes;
    }

    return precedentes.filter((p) => p.tribunal === tribunal);
  }

  /**
   * Calcula relevância média dos resultados
   */
  private calculateAverageRelevance(precedentes: Precedente[]): number {
    if (precedentes.length === 0) {
      return 0;
    }

    const sum = precedentes.reduce((acc, p) => acc + p.relevancia, 0);
    return sum / precedentes.length;
  }
}

/**
 * Formata precedentes para exibição
 *
 * @param precedentes - Lista de precedentes a formatar
 * @returns String formatada com precedentes
 *
 * @example
 * ```typescript
 * const formatted = formatPrecedentes(results.precedentes);
 * // "1. **STF - RE 654432**\nEmenta: ...\nRelevância: 92%\n\n2. ..."
 * ```
 */
export function formatPrecedentes(precedentes: Precedente[]): string {
  if (precedentes.length === 0) {
    return "Nenhum precedente encontrado com os critérios especificados.";
  }

  return precedentes
    .map((p, i) => {
      const lines = [
        `${i + 1}. **${p.tribunal} - ${p.numeroProcesso || p.titulo}**`,
        `Ementa: ${p.ementa}`,
        `Relevância: ${(p.relevancia * 100).toFixed(0)}%`,
        `Data: ${p.data}`,
      ];

      if (p.relator) {
        lines.push(`Relator: ${p.relator}`);
      }

      if (p.tags && p.tags.length > 0) {
        lines.push(`Tags: ${p.tags.join(", ")}`);
      }

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}
