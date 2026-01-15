/**
 * Configuração de Observabilidade e Logging para o Sistema RAG
 * 
 * Este arquivo configura o sistema de logging do Genkit para monitoramento
 * em desenvolvimento e produção.
 */

import { logger } from 'genkit/logging';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

/**
 * Configura telemetria do Firebase com opções otimizadas
 */
export function setupTelemetry() {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  enableFirebaseTelemetry({
    // Instrumentação automática habilitada
    autoInstrumentation: true,
    
    // Desabilitar instrumentações desnecessárias para reduzir overhead
    autoInstrumentationConfig: {
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
    },

    // Métricas e rastreamento habilitados
    disableMetrics: false,
    disableTraces: false,
    
    // Logging de entrada/saída (desabilitar em produção por LGPD se necessário)
    disableLoggingInputAndOutput: isProduction ? true : false,

    // Exportar telemetria local em desenvolvimento
    forceDevExport: !isProduction,

    // Intervalos otimizados
    metricExportIntervalMillis: isProduction ? 300_000 : 10_000, // 5min prod / 10s dev
    metricExportTimeoutMillis: isProduction ? 300_000 : 10_000,

    // Sampler: sempre capturar em dev, sample em produção se necessário
    // sampler: isProduction ? TraceIdRatioBasedSampler(0.1) : AlwaysOnSampler()
  });

  logger.info('[Telemetry] Firebase Telemetry configurado', {
    environment: env,
    exportingLocally: !isProduction,
    loggingIO: !isProduction,
  });
}

/**
 * Configura o nível de log baseado no ambiente
 */
export function setupLogging() {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    // Em produção, apenas info e acima
    logger.setLogLevel('info');
    logger.info('[Logging] Modo produção ativado - nível: info');
  } else if (env === 'test') {
    // Em testes, apenas warnings e erros
    logger.setLogLevel('warn');
  } else {
    // Em desenvolvimento, todos os logs
    logger.setLogLevel('debug');
    logger.info('[Logging] Modo desenvolvimento ativado - nível: debug');
  }
}

/**
 * Exemplo de uso do sistema de logging
 */
export function logExamples() {
  // Log de debug (apenas em desenvolvimento)
  logger.debug('Informação detalhada para debugging', {
    variable: 'valor',
    array: [1, 2, 3],
  });

  // Log de info (desenvolvimento e produção)
  logger.info('Operação iniciada', {
    operation: 'indexDocumentFlow',
    timestamp: new Date().toISOString(),
  });

  // Log de warning
  logger.warn('Situação não esperada mas recuperável', {
    reason: 'PDF sem texto',
    fallback: 'OCR será tentado',
  });

  // Log de erro
  logger.error('Erro crítico detectado', {
    error: 'Falha ao conectar com Qdrant',
    retryCount: 3,
    stack: new Error().stack,
  });
}

/**
 * Integração com Firebase Genkit Monitoring
 * 
 * Para habilitar monitoramento em produção:
 * 1. Instale o plugin: npm install @genkit-ai/firebase
 * 2. Configure no genkit.ts conforme exemplo abaixo
 * 3. Todos os logs serão automaticamente exportados para:
 *    - Firebase Console > Genkit Monitoring
 *    - OpenTelemetry exporters configurados
 */

/**
 * Métricas customizadas para o RAG
 */
export const ragMetrics = {
  /**
   * Registra métrica de indexação
   */
  logIndexation(params: {
    numeroProcesso: string;
    tipo: string;
    chunks: number;
    durationMs: number;
    success: boolean;
  }) {
    logger.info('[Metrics] RAG Indexation', {
      metric: 'rag.indexation',
      ...params,
      timestamp: Date.now(),
    });
  },

  /**
   * Registra métrica de busca
   */
  logSearch(params: {
    query: string;
    resultsCount: number;
    durationMs: number;
    averageScore: number;
  }) {
    logger.info('[Metrics] RAG Search', {
      metric: 'rag.search',
      ...params,
      timestamp: Date.now(),
    });
  },

  /**
   * Registra métrica de processamento de PDF
   */
  logPdfProcessing(params: {
    sizeBytes: number;
    pages: number;
    extractionTimeMs: number;
    indexationTimeMs: number;
    totalTimeMs: number;
  }) {
    logger.info('[Metrics] PDF Processing', {
      metric: 'pdf.processing',
      ...params,
      timestamp: Date.now(),
    });
  },
};

// Configurar telemetria e logging automaticamente ao importar
setupTelemetry();
setupLogging();

export default { setupTelemetry, setupLogging, logExamples, ragMetrics };
