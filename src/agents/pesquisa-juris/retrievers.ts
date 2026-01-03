/**
 * Retrievers para busca de jurisprudência
 * Baseado no padrão Google Agent Starter Pack (agentic_rag/retrievers.py)
 */

import type { PesquisaJurisInput } from "./validators";

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

  /**
   * Executa busca de precedentes com re-ranking por relevância
   * 
   * @param input - Parâmetros de busca validados
   * @returns Resultados com precedentes ordenados por relevância
   * @throws {Error} Se Qdrant não estiver disponível
   * @throws {Error} Se embeddings falharem
   */
  async search(input: PesquisaJurisInput): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // 1. Gerar embeddings para o tema
      const embeddings = await this.generateEmbeddings(input.tema);

      // 2. Buscar documentos similares no Qdrant
      const rawResults = await this.searchVectorDatabase(embeddings, input);

      // 3. Re-ranking: filtrar por relevância e ordenar
      const rankedPrecedentes = this.reRankResults(rawResults, input.relevanceThreshold || 0.7);

      // 4. Filtrar por tribunal se especificado
      const filteredPrecedentes = this.filterByTribunal(rankedPrecedentes, input.tribunal || "todos");

      // 5. Limitar resultados
      const finalPrecedentes = filteredPrecedentes.slice(0, input.limit || 10);

      const executionTimeMs = Date.now() - startTime;

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
   * Gera embeddings usando modelo text-embedding (simulado)
   * Em produção, usar Google Vertex AI ou similar
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    // TODO: Implementar integração real com modelo de embeddings
    // Por enquanto, simular embedding
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Simular vetor de 768 dimensões (padrão para text-embedding-005)
    return Array.from({ length: 768 }, () => Math.random());
  }

  /**
   * Busca na base vetorial Qdrant (simulado)
   * Em produção, usar cliente Qdrant real
   */
  private async searchVectorDatabase(
    embeddings: number[],
    input: PesquisaJurisInput
  ): Promise<Precedente[]> {
    // TODO: Implementar integração real com Qdrant
    // Por enquanto, simular resultados
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Dados simulados
    const mockPrecedentes: Precedente[] = [
      {
        titulo: "STF - Tema 1234 - Direito à greve",
        ementa: "É constitucional o exercício do direito de greve no serviço público, desde que observadas as limitações previstas em lei...",
        relevancia: 0.92,
        tribunal: "STF",
        data: "2023-05-15",
        numeroProcesso: "RE 654432",
        relator: "Min. Roberto Barroso",
        tags: ["direito constitucional", "greve", "serviço público"],
      },
      {
        titulo: "STJ - REsp 987654 - Adicional de insalubridade",
        ementa: "O adicional de insalubridade deve ser calculado sobre o salário base do empregado, conforme art. 192 da CLT...",
        relevancia: 0.85,
        tribunal: "STJ",
        data: "2023-08-22",
        numeroProcesso: "REsp 987654/SP",
        relator: "Min. Maria Isabel Gallotti",
        tags: ["direito do trabalho", "insalubridade", "CLT"],
      },
      {
        titulo: "TST - RR 555666 - Horas extras",
        ementa: "Configurada a prestação de horas extras habituais, devem ser consideradas no cálculo das verbas rescisórias...",
        relevancia: 0.78,
        tribunal: "TST",
        data: "2024-02-10",
        numeroProcesso: "RR 555666-12.2023.5.02.0000",
        relator: "Min. Augusto César Leite de Carvalho",
        tags: ["direito do trabalho", "horas extras", "rescisão"],
      },
      {
        titulo: "STF - ADI 5555 - Reforma Trabalhista",
        ementa: "São constitucionais as alterações promovidas pela Lei 13.467/2017...",
        relevancia: 0.72,
        tribunal: "STF",
        data: "2022-11-05",
        numeroProcesso: "ADI 5555",
        relator: "Min. Gilmar Mendes",
        tags: ["direito do trabalho", "reforma trabalhista", "constitucionalidade"],
      },
      {
        titulo: "TRF3 - AC 123456 - Acidente de trabalho",
        ementa: "Demonstrada a culpa do empregador no acidente de trabalho, é devida a indenização por danos morais...",
        relevancia: 0.68,
        tribunal: "TRF3",
        data: "2024-01-20",
        numeroProcesso: "AC 0123456-12.2023.4.03.6100",
        relator: "Des. Federal Carlos Muta",
        tags: ["direito do trabalho", "acidente de trabalho", "danos morais"],
      },
    ];

    return mockPrecedentes;
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
