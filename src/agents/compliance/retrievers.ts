/**
 * Retrievers para busca de normas e regulamentos
 * Baseado no padrão Google Agent Starter Pack (agentic_rag/retrievers.py)
 */

import { getGeminiApiKey, isGeminiConfigured } from "@/lib/gemini-config";
import { QdrantService, type SearchResult as QdrantSearchResult } from "@/lib/qdrant-service";
import type { ComplianceInput } from "./validators";

const EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent";
export interface NormaRegulamento {
  titulo: string;
  ementa: string;
  relevancia: number;
  tipo: "lei" | "decreto" | "portaria" | "resolução" | "instrução normativa" | "súmula";
  numero: string;
  dataPublicacao: string;
  orgaoEmissor: string;
  artigos: ArtigoNorma[];
  vigente: boolean;
  tags?: string[];
}

export interface ArtigoNorma {
  numero: string;
  caput: string;
  paragrafos?: string[];
  incisos?: string[];
}

export interface SearchResult {
  normas: NormaRegulamento[];
  totalFound: number;
  avgRelevance: number;
  query: string;
  executionTimeMs: number;
}

export interface NormaSearchInput {
  texto: string;
  tipoVerificacao?: string;
  limit?: number;
  relevanceThreshold?: number;
}

export class NormaRegulamentoRetriever {
  private readonly collectionName = "normas_regulamentos";
  private qdrantService: QdrantService | null = null;

  constructor() {
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

  async search(input: NormaSearchInput): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const embeddings = await this.generateEmbeddings(input.texto);
      const rawResults = await this.searchVectorDatabase(embeddings, input);
      const rankedNormas = this.reRankResults(rawResults, input.relevanceThreshold || 0.7);
      const filteredNormas = this.filterByTipoVerificacao(
        rankedNormas,
        input.tipoVerificacao || "todos"
      );
      const finalNormas = filteredNormas.slice(0, input.limit || 10);

      const executionTimeMs = Date.now() - startTime;

      return {
        normas: finalNormas,
        totalFound: filteredNormas.length,
        avgRelevance: this.calculateAverageRelevance(finalNormas),
        query: input.texto,
        executionTimeMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.name : "UnknownError";

      throw new Error(
        `Calling retrieval tool with query:\n\n${input.texto}\n\n` +
          `raised the following error:\n\n${errorType}: ${errorMessage}`
      );
    }
  }

  async searchFromCompliance(input: ComplianceInput): Promise<SearchResult> {
    return this.search({
      texto: input.documentoTexto.substring(0, 1000),
      tipoVerificacao: input.tipoVerificacao,
      limit: 10,
      relevanceThreshold: 0.5,
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

      return embeddings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ [Embeddings] Falha ao gerar embedding real:", errorMessage);
      throw new Error(`Falha ao gerar embedding real: ${errorMessage}`);
    }
  }

  private async searchVectorDatabase(
    embeddings: number[],
    input: NormaSearchInput
  ): Promise<NormaRegulamento[]> {
    if (!this.qdrantService) {
      throw new Error("Qdrant não configurado");
    }

    const qdrantResults = await this.qdrantService.search(embeddings, input.limit || 10);
    return this.mapQdrantResultsToNormas(qdrantResults);
  }

  private mapQdrantResultsToNormas(results: QdrantSearchResult[]): NormaRegulamento[] {
    return results.map((result) => ({
      titulo: (result.payload.titulo as string) || "Sem título",
      ementa: (result.payload.ementa as string) || "Sem ementa",
      relevancia: result.score,
      tipo: (result.payload.tipo as NormaRegulamento["tipo"]) || "lei",
      numero: (result.payload.numero as string) || "S/N",
      dataPublicacao:
        (result.payload.dataPublicacao as string) || new Date().toISOString().split("T")[0],
      orgaoEmissor: (result.payload.orgaoEmissor as string) || "Desconhecido",
      artigos: (result.payload.artigos as ArtigoNorma[]) || [],
      vigente: result.payload.vigente !== false,
      tags: (result.payload.tags as string[]) || [],
    }));
  }

  private reRankResults(normas: NormaRegulamento[], threshold: number): NormaRegulamento[] {
    return normas
      .filter((n) => n.relevancia >= threshold)
      .sort((a, b) => b.relevancia - a.relevancia);
  }

  private filterByTipoVerificacao(
    normas: NormaRegulamento[],
    tipoVerificacao: string
  ): NormaRegulamento[] {
    if (tipoVerificacao === "todos") {
      return normas;
    }

    const tipoToTagsMap: Record<string, string[]> = {
      lgpd: ["lgpd", "dados pessoais", "privacidade"],
      lavagem: ["lavagem", "PLD", "crime financeiro"],
      etica: ["ética", "conduta", "integridade"],
      tributario: ["tributário", "fiscal", "RFB"],
      trabalhista: ["trabalhista", "NR", "CLT"],
    };

    const relevantTags = tipoToTagsMap[tipoVerificacao] || [];

    if (relevantTags.length === 0) {
      return normas;
    }

    return normas.filter((n) => n.tags?.some((tag) => relevantTags.includes(tag.toLowerCase())));
  }

  private calculateAverageRelevance(normas: NormaRegulamento[]): number {
    if (normas.length === 0) {
      return 0;
    }

    const sum = normas.reduce((acc, n) => acc + n.relevancia, 0);
    return sum / normas.length;
  }
}

export function formatNormas(normas: NormaRegulamento[]): string {
  if (normas.length === 0) {
    return "Nenhuma norma ou regulamento encontrado com os critérios especificados.";
  }

  return normas
    .map((n, i) => {
      const lines = [
        `${i + 1}. **${n.titulo}**`,
        `Tipo: ${n.tipo.toUpperCase()} nº ${n.numero}`,
        `Ementa: ${n.ementa.substring(0, 150)}...`,
        `Relevância: ${(n.relevancia * 100).toFixed(0)}%`,
        `Órgão: ${n.orgaoEmissor} | Publicação: ${n.dataPublicacao}`,
        `Status: ${n.vigente ? "✅ Vigente" : "❌ Revogada"}`,
      ];

      if (n.artigos.length > 0) {
        lines.push(`Artigos relevantes:`);
        n.artigos.slice(0, 2).forEach((a) => {
          lines.push(`  - Art. ${a.numero}: ${a.caput.substring(0, 80)}...`);
        });
      }

      if (n.tags && n.tags.length > 0) {
        lines.push(`Tags: ${n.tags.join(", ")}`);
      }

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}
