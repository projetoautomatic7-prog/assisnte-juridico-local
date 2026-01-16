import { z } from "zod";
import { ai } from "./genkit.js";
import { chunk } from "llm-chunk";
import { GenkitError } from "genkit";
import { logger } from "genkit/logging";

/**
 * Fluxo para processar e indexar documentos jurídicos no Qdrant.
 * Suporta PDFs e textos longos com fragmentação inteligente.
 */
export const indexDocumentFlow = ai.defineFlow(
  {
    name: "indexDocumentFlow",
    inputSchema: z.object({
      content: z.string().min(1, "Conteúdo não pode ser vazio").describe("Conteúdo textual do documento"),
      metadata: z.object({
        numeroProcesso: z.string(),
        tipo: z.string(),
        source: z.string().optional(),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      chunksIndexed: z.number(),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    const startTime = Date.now();

    logger.info("[RAG] Iniciando indexação de documento", {
      numeroProcesso: input.metadata.numeroProcesso,
      tipo: input.metadata.tipo,
      contentLength: input.content.length,
    });

    try {
      if (!input.content || input.content.trim().length === 0) {
        logger.warn("[RAG] Conteúdo vazio detectado", { metadata: input.metadata });
        throw new GenkitError({
          status: "INVALID_ARGUMENT",
          message: "Conteúdo do documento está vazio",
        });
      }

      let chunks: string[];
      try {
        logger.debug("[RAG] Iniciando fragmentação do documento", {
          contentLength: input.content.length,
        });

        chunks = chunk(input.content, {
          minLength: 500,
          maxLength: 1500,
          splitter: "sentence",
          overlap: 100,
        });

        logger.info("[RAG] Documento fragmentado com sucesso", {
          totalChunks: chunks.length,
          avgChunkSize: Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length),
        });
      } catch (error) {
        logger.error("[RAG] Falha ao fragmentar documento", { error });
        throw new GenkitError({
          status: "INTERNAL",
          message: "Falha ao fragmentar documento",
          detail: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }

      const documents = chunks.map((text, index) => {
        logger.debug(`[RAG] Processando chunk ${index + 1}/${chunks.length}`, {
          chunkSize: text.length,
        });
        return {
          text,
          metadata: {
            ...input.metadata,
            chunkIndex: index,
            totalChunks: chunks.length,
            indexedAt: new Date().toISOString(),
          },
        };
      });

      const baseUrl = process.env.APP_BASE_URL || "http://localhost:3001";
      let indexedCount = 0;

      logger.info("[RAG] Iniciando indexação no Qdrant", {
        totalDocuments: documents.length,
        qdrantUrl: baseUrl,
      });

      for (const doc of documents) {
        try {
          const response = await fetch(`${baseUrl}/api/qdrant/upsert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: doc.text,
              metadata: doc.metadata || {},
            }),
          });

          if (!response.ok) {
            logger.error("[RAG] Erro HTTP ao indexar chunk", {
              status: response.status,
              statusText: response.statusText,
              chunkIndex: doc.metadata?.chunkIndex,
            });
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          indexedCount++;
          logger.debug("[RAG] Chunk indexado com sucesso", {
            chunkIndex: doc.metadata?.chunkIndex,
            progress: `${indexedCount}/${documents.length}`,
          });
        } catch (error) {
          logger.error(`[RAG] Erro ao indexar chunk ${indexedCount + 1}`, {
            error: error instanceof Error ? error.message : String(error),
            chunkIndex: indexedCount,
          });
          throw new GenkitError({
            status: "UNAVAILABLE",
            message: "Falha ao conectar com o banco vetorial Qdrant",
            detail: error instanceof Error ? error.message : "Erro de rede",
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info("[RAG] Indexação concluída com sucesso", {
        chunksIndexed: indexedCount,
        durationMs: duration,
        avgTimePerChunk: Math.round(duration / indexedCount),
        numeroProcesso: input.metadata.numeroProcesso,
      });

      return {
        success: true,
        chunksIndexed: indexedCount,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof GenkitError) {
        logger.error("[RAG] Erro conhecido durante indexação", {
          status: error.status,
          message: error.message,
          durationMs: duration,
        });
        throw error;
      }

      logger.error("[RAG] Erro inesperado ao processar documento", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: duration,
      });

      throw new GenkitError({
        status: "INTERNAL",
        message: "Erro inesperado ao processar documento",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
