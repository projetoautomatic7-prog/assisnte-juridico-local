import { z } from 'zod';
import { ai, qdrantRetriever } from './genkit';
import { indexDocumentFlow } from './rag-flow';
import { GenkitError } from 'genkit/beta';
import { logger } from 'genkit/logging';

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3001';

export const buscarIntimacaoPendente = ai.defineTool(
  {
    name: 'buscarIntimacaoPendente',
    description: 'Busca a próxima intimação pendente de análise no sistema.',
    inputSchema: z.object({ mode: z.string().optional() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/djen/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'next-pending', ...input }),
    });
    if (!res.ok) throw new Error(`Erro ao buscar intimação: ${res.statusText}`);
    return res.json();
  }
);

export const criarTarefa = ai.defineTool(
  {
    name: 'criarTarefa',
    description: 'Cria uma tarefa jurídica no sistema Todoist/CRM.',
    inputSchema: z.object({
      content: z.string(),
      due_string: z.string().optional(),
      priority: z.number().optional(),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/todoist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-task', ...input }),
    });
    return res.json();
  }
);

export const calcularPrazos = ai.defineTool(
  {
    name: 'calcularPrazos',
    description: 'Calcula prazos processuais considerando feriados e dias úteis.',
    inputSchema: z.object({
      startDate: z.string(),
      days: z.number(),
      type: z.enum(['úteis', 'corridos']),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/deadline/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }
);

export const consultarProcessoPJe = ai.defineTool(
  {
    name: 'consultarProcessoPJe',
    description: 'Consulta dados de um processo pelo número CNJ.',
    inputSchema: z.object({ numeroProcesso: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/legal-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'consultar-processo', ...input }),
    });
    return res.json();
  }
);

export const enviarMensagemWhatsApp = ai.defineTool(
  {
    name: 'enviarMensagemWhatsApp',
    description: 'Envia mensagem via WhatsApp.',
    inputSchema: z.object({ numero: z.string(), mensagem: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ number: input.numero, textMessage: { text: input.mensagem } }),
    });
    return res.json();
  }
);

export const registrarLogAgente = ai.defineTool(
  {
    name: 'registrarLogAgente',
    description: 'Registra log de execução para auditoria.',
    inputSchema: z.object({ agentId: z.string(), action: z.string(), details: z.any() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/kv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log-agent', payload: input }),
    });
    return res.json();
  }
);

export const buscarJurisprudenciaDataJud = ai.defineTool(
  {
    name: 'buscarJurisprudenciaDataJud',
    description: 'Busca jurisprudência e precedentes atualizados no DataJud/CNJ.',
    inputSchema: z.object({ query: z.string(), tribunal: z.string().optional() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/legal-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search-jurisprudence', ...input }),
    });
    return res.json();
  }
);

export const pesquisarQdrant = ai.defineTool(
  {
    name: 'pesquisarQdrant',
    description: 'Consulta a base de conhecimento interna (Qdrant) por teses e precedentes já salvos.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const docs = await ai.retrieve({
      retriever: qdrantRetriever,
      query: input.query,
      options: { limit: 5 }
    });
    return docs;
  }
);

export const indexarNoQdrant = ai.defineTool(
  {
    name: 'indexarNoQdrant',
    description: 'Salva uma tese ou jurisprudência relevante no Qdrant com fragmentação automática para uso futuro.',
    inputSchema: z.object({
      content: z.string().min(1, 'Conteúdo não pode ser vazio'),
      metadata: z.object({
        numeroProcesso: z.string(),
        tipo: z.string(),
        source: z.string().optional(),
      })
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    try {
      return await indexDocumentFlow.run(input);
    } catch (error) {
      if (error instanceof GenkitError) {
        throw error;
      }
      throw new GenkitError({
        status: 'INTERNAL',
        message: 'Erro ao indexar documento no Qdrant',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Ferramenta para processar e indexar documentos PDF.
 * Extrai texto, fragmenta e indexa automaticamente no Qdrant.
 */
export const processarPDF = ai.defineTool(
  {
    name: 'processarPDF',
    description: 'Processa um arquivo PDF jurídico, extrai o texto e indexa no Qdrant com fragmentação inteligente.',
    inputSchema: z.object({
      pdfUrl: z.string().url('URL inválida').or(z.string().min(1)).describe('URL ou caminho do arquivo PDF'),
      numeroProcesso: z.string().min(1, 'Número do processo é obrigatório'),
      tipo: z.string().describe('Tipo do documento: petição, sentença, acordão, etc.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      extractedText: z.string(),
      chunksIndexed: z.number(),
      error: z.string().optional(),
    }),
  },
  async (input) => {
    const startTime = Date.now();
    
    logger.info('[PDF] Iniciando processamento de PDF', {
      pdfUrl: input.pdfUrl,
      numeroProcesso: input.numeroProcesso,
      tipo: input.tipo,
    });

    try {
      // 1. Importar pdf-parse dinamicamente
      logger.debug('[PDF] Carregando biblioteca pdf-parse');
      const pdfParse = (await import('pdf-parse')).default;
      
      // 2. Baixar ou ler o PDF
      let pdfBuffer: Buffer;
      try {
        if (input.pdfUrl.startsWith('http')) {
          logger.info('[PDF] Baixando PDF via HTTP', { url: input.pdfUrl });
          const response = await fetch(input.pdfUrl);
          if (!response.ok) {
            logger.error('[PDF] Erro ao baixar PDF', {
              status: response.status,
              statusText: response.statusText,
            });
            throw new GenkitError({
              status: 'NOT_FOUND',
              message: 'Não foi possível baixar o PDF',
              detail: `HTTP ${response.status}: ${response.statusText}`,
            });
          }
          pdfBuffer = Buffer.from(await response.arrayBuffer());
          logger.info('[PDF] PDF baixado com sucesso', { 
            sizeBytes: pdfBuffer.length,
            sizeMB: (pdfBuffer.length / 1024 / 1024).toFixed(2),
          });
        } else {
          logger.info('[PDF] Lendo PDF do sistema de arquivos', { path: input.pdfUrl });
          const fs = await import('fs/promises');
          pdfBuffer = await fs.readFile(input.pdfUrl);
          logger.info('[PDF] PDF lido com sucesso', { sizeBytes: pdfBuffer.length });
        }
      } catch (error) {
        if (error instanceof GenkitError) throw error;
        logger.error('[PDF] Erro ao acessar arquivo PDF', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw new GenkitError({
          status: 'NOT_FOUND',
          message: 'Arquivo PDF não encontrado ou inacessível',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
      
      // 3. Extrair texto do PDF
      let extractedText: string;
      let pdfMetadata: any;
      try {
        logger.debug('[PDF] Iniciando extração de texto');
        const extractStart = Date.now();
        const pdfData = await pdfParse(pdfBuffer);
        const extractDuration = Date.now() - extractStart;
        
        extractedText = pdfData.text;
        pdfMetadata = pdfData.metadata;
        
        logger.info('[PDF] Texto extraído com sucesso', {
          textLength: extractedText.length,
          pages: pdfData.numpages,
          extractionTimeMs: extractDuration,
          metadata: pdfMetadata,
        });
        
        if (!extractedText || extractedText.trim().length === 0) {
          logger.warn('[PDF] PDF não contém texto extraível', {
            pages: pdfData.numpages,
          });
          throw new GenkitError({
            status: 'INVALID_ARGUMENT',
            message: 'PDF não contém texto extraível',
            detail: 'O arquivo pode estar protegido ou conter apenas imagens',
          });
        }
      } catch (error) {
        if (error instanceof GenkitError) throw error;
        logger.error('[PDF] Falha ao extrair texto do PDF', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw new GenkitError({
          status: 'INTERNAL',
          message: 'Falha ao extrair texto do PDF',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
      
      // 4. Indexar usando o fluxo RAG
      logger.info('[PDF] Iniciando indexação via RAG', {
        textLength: extractedText.length,
      });
      
      const result = await indexDocumentFlow.run({
        content: extractedText,
        metadata: {
          numeroProcesso: input.numeroProcesso,
          tipo: input.tipo,
          source: input.pdfUrl,
        }
      });
      
      const totalDuration = Date.now() - startTime;
      logger.info('[PDF] Processamento de PDF concluído', {
        success: result.success,
        chunksIndexed: result.chunksIndexed,
        totalDurationMs: totalDuration,
        numeroProcesso: input.numeroProcesso,
      });
      
      return {
        success: result.success,
        extractedText: extractedText.substring(0, 500) + '...', // Retorna amostra
        chunksIndexed: result.chunksIndexed,
      };
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      if (error instanceof GenkitError) {
        logger.error('[PDF] Erro conhecido ao processar PDF', {
          status: error.status,
          message: error.message,
          durationMs: totalDuration,
        });
        throw error;
      }
      
      logger.error('[PDF] Erro inesperado ao processar PDF', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: totalDuration,
      });
      
      throw new GenkitError({
        status: 'INTERNAL',
        message: 'Erro inesperado ao processar PDF',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export const indexarAnaliseCaso = ai.defineTool(
  {
    name: 'indexarAnaliseCaso',
    description: 'Salva o resumo e a estratégia de um caso analisado no Qdrant para consulta futura.',
    inputSchema: z.object({
      numeroProcesso: z.string(),
      resumo: z.string(),
      estrategia: z.string().optional()
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/qdrant/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Processo: ${input.numeroProcesso}\nResumo: ${input.resumo}\nEstratégia: ${input.estrategia || 'N/A'}`,
        metadata: { type: 'case-analysis', processNumber: input.numeroProcesso, date: new Date().toISOString() }
      }),
    });
    return res.json();
  }
);

export const ALL_TOOLS = [
  buscarIntimacaoPendente,
  criarTarefa,
  calcularPrazos,
  consultarProcessoPJe,
  enviarMensagemWhatsApp,
  registrarLogAgente,
  buscarJurisprudenciaDataJud,
  pesquisarQdrant,
  indexarNoQdrant,
  indexarAnaliseCaso,
  processarPDF,
];
