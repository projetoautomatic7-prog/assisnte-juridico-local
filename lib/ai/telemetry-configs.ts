/**
 * Exemplos de Configuração de Telemetria para Diferentes Ambientes
 */

import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { AlwaysOnSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// =============================================
// DESENVOLVIMENTO (Local)
// =============================================
export function devTelemetryConfig() {
  enableFirebaseTelemetry({
    // Instrumentação completa
    autoInstrumentation: true,
    autoInstrumentationConfig: {
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    },

    // Tudo habilitado para debug
    disableMetrics: false,
    disableTraces: false,
    disableLoggingInputAndOutput: false, // Ver inputs/outputs

    // Exportar localmente
    forceDevExport: true,

    // Intervalos curtos para feedback rápido
    metricExportIntervalMillis: 10_000,  // 10 segundos
    metricExportTimeoutMillis: 10_000,

    // Capturar 100% dos traces
    sampler: new AlwaysOnSampler(),
  });
}

// =============================================
// STAGING (Pré-produção)
// =============================================
export function stagingTelemetryConfig() {
  enableFirebaseTelemetry({
    autoInstrumentation: true,
    autoInstrumentationConfig: {
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
    },

    disableMetrics: false,
    disableTraces: false,
    // Ainda capturar inputs/outputs para debug
    disableLoggingInputAndOutput: false,

    forceDevExport: false,

    // Intervalos médios
    metricExportIntervalMillis: 60_000,   // 1 minuto
    metricExportTimeoutMillis: 60_000,

    // Capturar 50% dos traces
    sampler: new TraceIdRatioBasedSampler(0.5),
  });
}

// =============================================
// PRODUÇÃO (Alta Performance)
// =============================================
export function productionTelemetryConfig() {
  enableFirebaseTelemetry({
    autoInstrumentation: true,
    autoInstrumentationConfig: {
      // Desabilitar instrumentações pesadas
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
    },

    disableMetrics: false,
    disableTraces: false,
    
    // ⚠️ IMPORTANTE: Desabilitar logging de I/O em produção por LGPD
    // Isso evita armazenar dados sensíveis de clientes
    disableLoggingInputAndOutput: true,

    forceDevExport: false,

    // Intervalos longos para reduzir custos
    metricExportIntervalMillis: 300_000,  // 5 minutos
    metricExportTimeoutMillis: 300_000,

    // Capturar 10% dos traces (reduz custo)
    sampler: new TraceIdRatioBasedSampler(0.1),
  });
}

// =============================================
// PRODUÇÃO (Alta Conformidade LGPD)
// =============================================
export function productionLGPDTelemetryConfig() {
  enableFirebaseTelemetry({
    autoInstrumentation: true,
    autoInstrumentationConfig: {
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
    },

    // Manter métricas e traces gerais
    disableMetrics: false,
    disableTraces: false,
    
    // ✅ SEM LOGS DE ENTRADA/SAÍDA (LGPD compliance)
    disableLoggingInputAndOutput: true,

    forceDevExport: false,

    metricExportIntervalMillis: 300_000,
    metricExportTimeoutMillis: 300_000,

    // Sample reduzido
    sampler: new TraceIdRatioBasedSampler(0.05), // 5%
  });
}

// =============================================
// DEBUGGING (Troubleshooting em Prod)
// =============================================
export function debuggingTelemetryConfig() {
  enableFirebaseTelemetry({
    autoInstrumentation: true,
    autoInstrumentationConfig: {},

    disableMetrics: false,
    disableTraces: false,
    
    // Temporariamente habilitar I/O para debug
    disableLoggingInputAndOutput: false,

    forceDevExport: true, // Ver logs localmente

    // Intervalos curtos
    metricExportIntervalMillis: 30_000,
    metricExportTimeoutMillis: 30_000,

    // Capturar tudo
    sampler: new AlwaysOnSampler(),
  });
}

// =============================================
// SOMENTE MÉTRICAS (Sem Traces)
// =============================================
export function metricsOnlyTelemetryConfig() {
  enableFirebaseTelemetry({
    autoInstrumentation: false, // Desabilitar para melhor performance

    disableMetrics: false,     // Métricas habilitadas
    disableTraces: true,       // ❌ Traces desabilitados
    disableLoggingInputAndOutput: true,

    forceDevExport: false,

    metricExportIntervalMillis: 300_000,
    metricExportTimeoutMillis: 300_000,
  });
}

// =============================================
// SOMENTE TRACES (Sem Métricas)
// =============================================
export function tracesOnlyTelemetryConfig() {
  enableFirebaseTelemetry({
    autoInstrumentation: true,

    disableMetrics: true,      // ❌ Métricas desabilitadas
    disableTraces: false,      // Traces habilitados
    disableLoggingInputAndOutput: true,

    forceDevExport: false,

    sampler: new TraceIdRatioBasedSampler(0.2), // 20%
  });
}

// =============================================
// SEM TELEMETRIA (Máxima Performance)
// =============================================
export function noTelemetryConfig() {
  enableFirebaseTelemetry({
    autoInstrumentation: false,
    disableMetrics: true,
    disableTraces: true,
    disableLoggingInputAndOutput: true,
  });
}

// =============================================
// AUTO CONFIGURAÇÃO BASEADA EM ENV
// =============================================
export function autoConfigureTelemetry() {
  const env = process.env.NODE_ENV || 'development';
  const lgpdMode = process.env.LGPD_STRICT === 'true';

  switch (env) {
    case 'production':
      if (lgpdMode) {
        productionLGPDTelemetryConfig();
        console.log('🔒 Telemetria: PRODUÇÃO + LGPD STRICT');
      } else {
        productionTelemetryConfig();
        console.log('🚀 Telemetria: PRODUÇÃO');
      }
      break;

    case 'staging':
      stagingTelemetryConfig();
      console.log('🧪 Telemetria: STAGING');
      break;

    case 'test':
      metricsOnlyTelemetryConfig(); // Testes não precisam de traces
      console.log('🧬 Telemetria: TESTE (apenas métricas)');
      break;

    default:
      devTelemetryConfig();
      console.log('💻 Telemetria: DESENVOLVIMENTO');
  }
}

// =============================================
// EXEMPLO DE USO
// =============================================

// No seu index.ts ou main.ts:
// import { autoConfigureTelemetry } from './telemetry-configs';
// autoConfigureTelemetry();

// Ou manualmente:
// import { productionLGPDTelemetryConfig } from './telemetry-configs';
// productionLGPDTelemetryConfig();
