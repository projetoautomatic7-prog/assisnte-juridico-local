/**
 * Retrievers para busca de templates e padrões contratuais
 * Baseado no padrão Google Agent Starter Pack (agentic_rag/retrievers.py)
 */

import { getGeminiApiKey, isGeminiConfigured } from "@/lib/gemini-config";
import { QdrantService, type SearchResult as QdrantSearchResult } from "@/lib/qdrant-service";
import type { RevisaoContratualInput } from "./validators";

const EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent";
export interface TemplateContratual {
  titulo: string;
  descricao: string;
  relevancia: number;
  tipoContrato: string;
  clausulasPadrao: ClausulaPadrao[];
  versao: string;
  ultimaAtualizacao: string;
  fonte?: string;
  tags?: string[];
}

export interface ClausulaPadrao {
  numero: string;
  titulo: string;
  texto: string;
  obrigatoria: boolean;
  comentarios?: string;
}

export interface SearchResult {
  templates: TemplateContratual[];
  totalFound: number;
  avgRelevance: number;
  query: string;
  executionTimeMs: number;
}

export interface TemplateSearchInput {
  texto: string;
  tipoContrato?: string;
  limit?: number;
  relevanceThreshold?: number;
}

export class TemplateContratualRetriever {
  private readonly collectionName = "contratos_templates";
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

  async search(input: TemplateSearchInput): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      const embeddings = await this.generateEmbeddings(input.texto);
      const rawResults = await this.searchVectorDatabase(embeddings, input);
      const rankedTemplates = this.reRankResults(rawResults, input.relevanceThreshold || 0.7);
      const filteredTemplates = this.filterByTipo(rankedTemplates, input.tipoContrato || "todos");
      const finalTemplates = filteredTemplates.slice(0, input.limit || 10);

      const executionTimeMs = Date.now() - startTime;

      return {
        templates: finalTemplates,
        totalFound: filteredTemplates.length,
        avgRelevance: this.calculateAverageRelevance(finalTemplates),
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

  async searchFromRevisao(input: RevisaoContratualInput): Promise<SearchResult> {
    return this.search({
      texto: input.contratoTexto.substring(0, 1000),
      tipoContrato: input.tipoContrato,
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
    input: TemplateSearchInput
  ): Promise<TemplateContratual[]> {
    if (!this.qdrantService) {
      throw new Error("Qdrant não configurado");
    }

    const qdrantResults = await this.qdrantService.search(embeddings, input.limit || 10);
    return this.mapQdrantResultsToTemplates(qdrantResults);
  }

  private mapQdrantResultsToTemplates(results: QdrantSearchResult[]): TemplateContratual[] {
    return results.map((result) => ({
      titulo: (result.payload.titulo as string) || "Sem título",
      descricao: (result.payload.descricao as string) || "Sem descrição",
      relevancia: result.score,
      tipoContrato: (result.payload.tipoContrato as string) || "outro",
      clausulasPadrao: (result.payload.clausulasPadrao as ClausulaPadrao[]) || [],
      versao: (result.payload.versao as string) || "1.0",
      ultimaAtualizacao:
        (result.payload.ultimaAtualizacao as string) || new Date().toISOString().split("T")[0],
      fonte: result.payload.fonte as string | undefined,
      tags: (result.payload.tags as string[]) || [],
    }));
  }

  private reRankResults(templates: TemplateContratual[], threshold: number): TemplateContratual[] {
    return templates
      .filter((t) => t.relevancia >= threshold)
      .sort((a, b) => b.relevancia - a.relevancia);
  }

  private filterByTipo(templates: TemplateContratual[], tipo: string): TemplateContratual[] {
    if (tipo === "todos" || tipo === "outro") {
      return templates;
    }

    return templates.filter((t) => t.tipoContrato === tipo);
  }

  private calculateAverageRelevance(templates: TemplateContratual[]): number {
    if (templates.length === 0) {
      return 0;
    }

    const sum = templates.reduce((acc, t) => acc + t.relevancia, 0);
    return sum / templates.length;
  }
}

export function formatTemplates(templates: TemplateContratual[]): string {
  if (templates.length === 0) {
    return "Nenhum template contratual encontrado com os critérios especificados.";
  }

  return templates
    .map((t, i) => {
      const lines = [
        `${i + 1}. **${t.titulo}**`,
        `Tipo: ${t.tipoContrato}`,
        `Descrição: ${t.descricao}`,
        `Relevância: ${(t.relevancia * 100).toFixed(0)}%`,
        `Versão: ${t.versao} | Atualizado em: ${t.ultimaAtualizacao}`,
        `Cláusulas padrão: ${t.clausulasPadrao.length}`,
      ];

      if (t.fonte) {
        lines.push(`Fonte: ${t.fonte}`);
      }

      if (t.clausulasPadrao.length > 0) {
        lines.push(`Cláusulas principais:`);
        t.clausulasPadrao.slice(0, 3).forEach((c) => {
          lines.push(`  - ${c.numero}. ${c.titulo}${c.obrigatoria ? " (obrigatória)" : ""}`);
        });
      }

      if (t.tags && t.tags.length > 0) {
        lines.push(`Tags: ${t.tags.join(", ")}`);
      }

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}
