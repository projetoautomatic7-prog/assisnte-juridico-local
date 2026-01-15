import { googleAI } from '@genkit-ai/google-genai';
import { Redis } from '@upstash/redis';
import { createMcpHost } from '@genkit-ai/mcp';
import { genkit } from 'genkit/beta'; // Usando beta para suporte a Chat/Sessions
import { devLocalStateStore } from 'genkit/dev';
import { z } from 'zod';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const isRedisConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const REDIS_TIMEOUT = 5000; // 5 segundos para evitar travamentos por latência ou conexão morta

/**
 * Memória local volátil para fallback caso o Redis esteja offline.
 * Nota: Em ambientes serverless, isso persiste apenas enquanto a instância estiver ativa.
 */
const volatileFallbackStore = new Map<string, any>();

/**
 * Implementação de StateStore para Upstash Redis com Fallback.
 * Essencial para que o fluxo 'askLawyer' (Human-in-the-loop) funcione em produção.
 */
const upstashStateStore = {
  async load(key: string): Promise<any> {
    let timeoutId: any;
    try {
      const state = await Promise.race([
        redis.get(`genkit:state:${key}`),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Redis Timeout')), REDIS_TIMEOUT);
        })
      ]);
      if (state) return state;
    } catch (error) {
      console.error(`[RedisStateStore] Falha no Redis ao carregar (chave: ${key}). Tentando memória local.`, error);
    } finally {
      clearTimeout(timeoutId);
    }
    // Tenta recuperar da memória local da instância caso o Redis falhe ou não encontre o estado
    return volatileFallbackStore.get(key);
  },
  async save(key: string, state: any): Promise<void> {
    let timeoutId: any;
    try {
      // Armazena o estado por 7 dias para dar tempo ao advogado de responder
      await Promise.race([
        redis.set(`genkit:state:${key}`, state, { ex: 604800 }),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Redis Timeout')), REDIS_TIMEOUT);
        })
      ]);
    } catch (error) {
      console.error(`[RedisStateStore] Falha no Redis ao salvar (chave: ${key}). Salvando em memória local.`, error);
      // Fallback para memória local para evitar perda imediata de estado no turno atual
      volatileFallbackStore.set(key, state);
    } finally {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Implementação de SessionStore para Upstash Redis.
 * Gerencia histórico de chat e estado da sessão automaticamente.
 */
export const upstashSessionStore = {
  async get(sessionId: string): Promise<any> {
    try {
      const data = await redis.get(`genkit:session:${sessionId}`);
      return data || undefined;
    } catch (error) {
      console.error(`[RedisSessionStore] Erro ao carregar sessão ${sessionId}:`, error);
      return undefined;
    }
  },
  async save(sessionId: string, sessionData: any): Promise<void> {
    try {
      // Expira em 30 dias de inatividade
      await redis.set(`genkit:session:${sessionId}`, sessionData, { ex: 2592000 });
    } catch (error) {
      console.error(`[RedisSessionStore] Erro ao salvar sessão ${sessionId}:`, error);
    }
  }
};

export const ai = genkit({
  plugins: [googleAI()],
  model: process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash',
  stateStore: (process.env.NODE_ENV === 'production' && isRedisConfigured) ? upstashStateStore : devLocalStateStore(),
});

/**
 * Recuperador Semântico (Retriever) para o Qdrant.
 * Utiliza busca vetorial para encontrar contextos jurídicos relevantes.
 */
export const qdrantRetriever = ai.defineRetriever(
  {
    name: 'qdrant/legalRetriever',
    configSchema: z.object({
      limit: z.number().optional(),
      filter: z.any().optional(),
    }),
  },
  async (query, options) => {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/qdrant/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

/**
 * Host MCP para integração de ferramentas externas (Filesystem, etc)
 */
export const mcpHost = createMcpHost({
  name: 'legal-assistant-mcp',
  mcpServers: {
    fs: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    },
  },
});

/**
 * Tool Real: Busca no DJEN (Diário da Justiça Eletrônico)
 * Substitui qualquer simulação por chamada à API real configurada na V2.
 */
export const searchDjenTool = ai.defineTool(
  {
    name: 'searchDjen',
    description: 'Busca publicações e intimações reais no DJEN para um processo específico.',
    inputSchema: z.object({
      numeroProcesso: z.string().describe('O número do processo no formato CNJ (ex: 1234567-89.2024.8.07.0001)'),
      dataDesde: z.string().optional().describe('Data inicial para a busca em formato ISO'),
    }),
    outputSchema: z.object({
      publicacoes: z.array(z.any()).optional(),
      total: z.number(),
      message: z.string().optional(),
    }),
  },
  async (input, { context, interrupt, resumed }) => {
    // Validação de segurança via contexto (canal lateral)
    if (process.env.NODE_ENV === 'production' && !context?.auth) {
      throw new Error('Acesso negado: Ferramenta de busca requer autenticação.');
    }

    // Exemplo de Interrupção: Se não houver data, pede confirmação
    if (!input.dataDesde && resumed?.confirmado !== true) {
      interrupt({
        question: "Você não definiu uma data inicial. A busca no DJEN pode retornar muitos resultados. Deseja continuar mesmo assim?",
        metadata: { numeroProcesso: input.numeroProcesso }
      });
    }

    if (resumed?.confirmado === false) {
      return { total: 0, message: "Busca cancelada pelo usuário." };
    }

    console.log(`[Audit] Busca realizada pelo usuário: ${context?.auth?.uid || 'system'}`);

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/djen/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Erro na busca DJEN: ${response.statusText}`);
    return response.json();
  }
);

// Interrupção para intervenção humana (Human-in-the-loop)
export const askLawyer = ai.defineInterrupt(
  {
    name: 'askLawyer',
    description: 'Solicita esclarecimento ou aprovação do advogado humano.',
    inputSchema: z.object({ question: z.string(), context: z.string().optional() }),
    outputSchema: z.string(),
  },
);

// Schema compartilhado para respostas dos agentes
export const AgentResponseSchema = z.object({
  answer: z.string().describe('Resposta final do agente para o usuário'),
  steps: z.number().optional(),
  usedTools: z.array(z.string()).optional().describe('Lista de ferramentas reais executadas'),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.object({
    processo: z.string().optional(),
    tribunal: z.string().optional(),
    urgencia: z.enum(['baixa', 'media', 'alta']).optional(),
    auditId: z.string().describe('ID único para rastreamento na V2'),
  }).optional(),
});