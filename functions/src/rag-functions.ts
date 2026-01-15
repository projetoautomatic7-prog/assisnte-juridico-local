/**
 * Firebase Cloud Functions - RAG System Deployment
 * 
 * Este arquivo exporta os fluxos RAG como Cloud Functions chamáveis
 * com autenticação, autorização e App Check.
 */

import { onCallGenkit, hasClaim } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { indexDocumentFlow } from "./rag-flow.js";
import { processarPDF } from "./tools.js";
import { ai, qdrantRetriever } from "./genkit.js";
import { z } from "zod";

// Definir segredos necessários
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const qdrantUrl = defineSecret("QDRANT_URL");
const qdrantApiKey = defineSecret("QDRANT_API_KEY");

/**
 * Cloud Function: Indexar Documento
 * 
 * Processa e indexa documentos jurídicos com fragmentação automática.
 * 
 * @auth Requer usuário autenticado com email verificado
 * @appCheck Obrigatório
 */
export const indexDocument = onCallGenkit(
  {
    // Segredos necessários para a função
    secrets: [geminiApiKey, qdrantUrl, qdrantApiKey],
    
    // Política de autorização: usuário deve ter email verificado
    authPolicy: hasClaim("email_verified"),
    
    // Enforce App Check para segurança adicional
    enforceAppCheck: true,
    consumeAppCheckToken: true, // Token único por chamada
    
    // CORS (opcional - ajuste conforme necessário)
    cors: ["https://seu-dominio.com"],
    
    // Limites de recursos
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutos para documentos grandes
  },
  indexDocumentFlow
);

/**
 * Cloud Function: Processar PDF
 * 
 * Baixa/lê PDF, extrai texto e indexa automaticamente.
 * 
 * @auth Requer usuário autenticado com email verificado
 * @appCheck Obrigatório
 */
export const processPDF = onCallGenkit(
  {
    secrets: [geminiApiKey, qdrantUrl, qdrantApiKey],
    authPolicy: hasClaim("email_verified"),
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    cors: ["https://seu-dominio.com"],
    memory: "1GiB", // PDFs podem ser grandes
    timeoutSeconds: 540, // 9 minutos
  },
  processarPDF
);

/**
 * Cloud Function: Buscar no Qdrant
 * 
 * Realiza busca semântica no banco vetorial.
 * 
 * @auth Requer usuário autenticado
 */
const searchQdrantFlow = ai.defineFlow(
  {
    name: "searchQdrant",
    inputSchema: z.object({
      query: z.string().min(1),
      numeroProcesso: z.string().optional(),
      limit: z.number().optional().default(5),
    }),
    outputSchema: z.array(z.unknown()),
  },
  async (input) => {
    const docs = await ai.retrieve({
      retriever: qdrantRetriever,
      query: input.query,
      options: { 
        limit: input.limit,
        // Filtro por processo se fornecido
        ...(input.numeroProcesso && {
          where: { numeroProcesso: input.numeroProcesso }
        })
      }
    });
    return docs;
  }
);

export const searchQdrant = onCallGenkit(
  {
    secrets: [geminiApiKey, qdrantUrl, qdrantApiKey],
    authPolicy: hasClaim("email_verified"),
    enforceAppCheck: true,
    cors: ["https://seu-dominio.com"],
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  searchQdrantFlow
);
