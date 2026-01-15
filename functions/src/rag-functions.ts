/**
 * Firebase Cloud Functions - RAG System Deployment
 * 
 * Este arquivo exporta os fluxos RAG como Cloud Functions chamáveis
 * com autenticação, autorização e App Check.
 */

import { onCallGenkit, hasClaim } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { indexDocumentFlow } from '../lib/ai/rag-flow';
import { processarPDF } from '../lib/ai/tools';

// Definir segredos necessários
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const qdrantUrl = defineSecret('QDRANT_URL');
const qdrantApiKey = defineSecret('QDRANT_API_KEY');

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
    authPolicy: hasClaim('email_verified'),
    
    // Enforce App Check para segurança adicional
    enforceAppCheck: true,
    consumeAppCheckToken: true, // Token único por chamada
    
    // CORS (opcional - ajuste conforme necessário)
    cors: ['https://seu-dominio.com'],
    
    // Limites de recursos
    memory: '512MB',
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
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    cors: ['https://seu-dominio.com'],
    memory: '1GB', // PDFs podem ser grandes
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
import { ai, qdrantRetriever } from '../lib/ai/genkit';
import { z } from 'zod';

const searchQdrantFlow = ai.defineFlow(
  {
    name: 'searchQdrant',
    inputSchema: z.object({
      query: z.string().min(1),
      numeroProcesso: z.string().optional(),
      limit: z.number().optional().default(5),
    }),
    outputSchema: z.array(z.any()),
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
    authPolicy: hasClaim('email_verified'),
    enforceAppCheck: true,
    cors: ['https://seu-dominio.com'],
    memory: '256MB',
    timeoutSeconds: 60,
  },
  searchQdrantFlow
);
