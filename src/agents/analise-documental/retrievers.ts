/**
 * Retrievers para busca de documentos jurídicos similares
 * Baseado no padrão Google Agent Starter Pack (agentic_rag/retrievers.py)
 */

import { getGeminiApiKey, isGeminiConfigured } from "@/lib/gemini-config";
import {
  QdrantService,
  type SearchResult as QdrantSearchResult,
} from "@/lib/qdrant-service";
import type { AnaliseDocumentalInput } from "./validators";

const EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent";
export interface DocumentoJuridico {
  titulo: string;
  conteudo: string;
  relevancia: number;
  tipoDocumento: string;
  data: string;
  numeroProcesso?: string;
  partes?: string[];
  clausulasChave?: string[];
  tags?: string[];
}

export interface SearchResult {
  documentos: DocumentoJuridico[];
  totalFound: number;
  avgRelevance: number;
  query: string;
  executionTimeMs: number;
}

export interface DocumentSearchInput {
  texto: string;
  tipoDocumento?: string;
  limit?: number;
  relevanceThreshold?: number;
}

export class DocumentoRetriever {
  private readonly collectionName = "documentos_juridicos";
  private qdrantService: QdrantService | null = null;

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantKey = process.env.QDRANT_API_KEY;

    if (
      qdrantUrl &&
      qdrantKey &&
      typeof qdrantUrl === "string" &&
      typeof qdrantKey === "string"
    ) {
      try {
        this.qdrantService = new QdrantService({
          url: qdrantUrl,
          apiKey: qdrantKey,
          collectionName: this.collectionName,
          timeout: 30000,
        });
        console.log("✅ Qdrant connected:", {
          url: qdrantUrl,
          collection: this.collectionName,
        });
      } catch (error) {
        console.error("❌ Qdrant connection failed:", error);
      }
    } else {
      console.error("❌ Qdrant credentials not found");
    }
  }

  async search(input: DocumentSearchInput): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const embeddings = await this.generateEmbeddings(input.texto);
      const rawResults = await this.searchVectorDatabase(embeddings, input);
      const rankedDocumentos = this.reRankResults(
        rawResults,
        input.relevanceThreshold || 0.7,
      );
      const filteredDocumentos = this.filterByTipo(
        rankedDocumentos,
        input.tipoDocumento || "todos",
      );
      const finalDocumentos = filteredDocumentos.slice(0, input.limit || 10);

      const executionTimeMs = Date.now() - startTime;

      return {
        documentos: finalDocumentos,
        totalFound: filteredDocumentos.length,
        avgRelevance: this.calculateAverageRelevance(finalDocumentos),
        query: input.texto,
        executionTimeMs,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.name : "UnknownError";

      throw new Error(
        `Calling retrieval tool with query:\n\n${input.texto}\n\n` +
          `raised the following error:\n\n${errorType}: ${errorMessage}`,
      );
    }
  }

  async searchFromAnalise(
    input: AnaliseDocumentalInput,
  ): Promise<SearchResult> {
    return this.search({
      texto: input.documentoTexto.substring(0, 1000),
      tipoDocumento: input.tipoDocumento,
      limit: 5,
      relevanceThreshold: 0.6,
    });
  }

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

      const response = await fetch(
        `${EMBEDDING_API_URL}?key=${encodeURIComponent(apiKey)}`,
        {
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
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("❌ [Embeddings] Erro na API Gemini:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`,
        );
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

      return embeddings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        "❌ [Embeddings] Falha ao gerar embedding real:",
        errorMessage,
      );
      throw new Error(`Falha ao gerar embedding real: ${errorMessage}`);
    }
  }

  private async searchVectorDatabase(
    embeddings: number[],
    input: DocumentSearchInput,
  ): Promise<DocumentoJuridico[]> {
    if (!this.qdrantService) {
      throw new Error("Qdrant não configurado");
    }

    const qdrantResults = await this.qdrantService.search(
      embeddings,
      input.limit || 10,
    );
    return this.mapQdrantResultsToDocumentos(qdrantResults);
  }

  private mapQdrantResultsToDocumentos(
    results: QdrantSearchResult[],
  ): DocumentoJuridico[] {
    return results.map((result) => ({
      titulo: (result.payload.titulo as string) || "Sem título",
      conteudo: (result.payload.conteudo as string) || "Sem conteúdo",
      relevancia: result.score,
      tipoDocumento: (result.payload.tipoDocumento as string) || "genérico",
      data:
        (result.payload.data as string) ||
        new Date().toISOString().split("T")[0],
      numeroProcesso: result.payload.numeroProcesso as string | undefined,
      partes: (result.payload.partes as string[]) || [],
      clausulasChave: (result.payload.clausulasChave as string[]) || [],
      tags: (result.payload.tags as string[]) || [],
    }));
  }

  private reRankResults(
    documentos: DocumentoJuridico[],
    threshold: number,
  ): DocumentoJuridico[] {
    return documentos
      .filter((d) => d.relevancia >= threshold)
      .sort((a, b) => b.relevancia - a.relevancia);
  }

  private filterByTipo(
    documentos: DocumentoJuridico[],
    tipo: string,
  ): DocumentoJuridico[] {
    if (tipo === "todos" || tipo === "genérico") {
      return documentos;
    }

    return documentos.filter((d) => d.tipoDocumento === tipo);
  }

  private calculateAverageRelevance(documentos: DocumentoJuridico[]): number {
    if (documentos.length === 0) {
      return 0;
    }

    const sum = documentos.reduce((acc, d) => acc + d.relevancia, 0);
    return sum / documentos.length;
  }
}

export function formatDocumentos(documentos: DocumentoJuridico[]): string {
  if (documentos.length === 0) {
    return "Nenhum documento similar encontrado com os critérios especificados.";
  }

  return documentos
    .map((d, i) => {
      const lines = [
        `${i + 1}. **${d.titulo}**`,
        `Tipo: ${d.tipoDocumento}`,
        `Conteúdo: ${d.conteudo.substring(0, 150)}...`,
        `Relevância: ${(d.relevancia * 100).toFixed(0)}%`,
        `Data: ${d.data}`,
      ];

      if (d.numeroProcesso) {
        lines.push(`Processo: ${d.numeroProcesso}`);
      }

      if (d.partes && d.partes.length > 0) {
        lines.push(`Partes: ${d.partes.join(", ")}`);
      }

      if (d.clausulasChave && d.clausulasChave.length > 0) {
        lines.push(`Cláusulas-chave: ${d.clausulasChave.join(", ")}`);
      }

      if (d.tags && d.tags.length > 0) {
        lines.push(`Tags: ${d.tags.join(", ")}`);
      }

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}
