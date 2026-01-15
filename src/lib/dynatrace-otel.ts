/**
 * Dynatrace OpenTelemetry Configuration
 *
 * Configura exportação de traces, metrics e logs para Dynatrace
 * Usado pelo sistema de Evals para enviar métricas de qualidade em tempo real
 *
 * @see docs/STAGE_3_EVALS_PLANO_COMPLETO.md
 * @see DYNATRACE_SETUP.md
 */

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { trace, metrics, Span, Meter } from "@opentelemetry/api";

// ===========================
// Configuration
// ===========================

interface DynatraceConfig {
  tenant: string;
  apiToken: string;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  enabled: boolean;
}

function loadConfig(): DynatraceConfig {
  const config: DynatraceConfig = {
    tenant: process.env.DYNATRACE_TENANT || "",
    apiToken: process.env.DYNATRACE_API_TOKEN || "",
    serviceName: process.env.VITE_SERVICE_NAME || "assistente-juridico-evals",
    serviceVersion: process.env.VITE_SERVICE_VERSION || "1.0.0",
    environment: process.env.VITE_ENVIRONMENT || "development",
    enabled: process.env.VITE_ENABLE_TRACING === "otlp",
  };

  // Validação
  if (config.enabled && (!config.tenant || !config.apiToken)) {
    console.warn("⚠️  [Dynatrace] Missing tenant or API token. Tracing disabled.");
    config.enabled = false;
  }

  return config;
}

const config = loadConfig();

// ===========================
// Resource (Service Identity)
// ===========================

const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
  "service.namespace": "legal-ai",
  "service.instance.id": `${config.serviceName}-${process.pid}`,
});

// ===========================
// Trace Exporter (OpenTelemetry)
// ===========================

let tracerProvider: NodeTracerProvider | null = null;

if (config.enabled) {
  const traceExporter = new OTLPTraceExporter({
    url: `https://${config.tenant}/api/v2/otlp/v1/traces`,
    headers: {
      Authorization: `Api-Token ${config.apiToken}`,
    },
    timeoutMillis: 15000,
  });

  tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 1000,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
        maxExportBatchSize: 512,
      }),
    ],
  });

  tracerProvider.register();

  console.log("✅ [Dynatrace] Trace exporter initialized");
  console.log(`   Tenant: ${config.tenant}`);
  console.log(`   Service: ${config.serviceName} v${config.serviceVersion}`);
}

// ===========================
// Metrics Exporter
// ===========================

let meterProvider: MeterProvider | null = null;
let meter: Meter | null = null;

if (config.enabled) {
  const metricExporter = new OTLPMetricExporter({
    url: `https://${config.tenant}/api/v2/otlp/v1/metrics`,
    headers: {
      Authorization: `Api-Token ${config.apiToken}`,
    },
    timeoutMillis: 15000,
  });

  meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60000, // 1 minuto
      }),
    ],
  });

  metrics.setGlobalMeterProvider(meterProvider);
  meter = metrics.getMeter("eval-metrics", "1.0.0");

  console.log("✅ [Dynatrace] Metrics exporter initialized");
}

// ===========================
// Custom Metrics for Evals
// ===========================

export interface EvalMetrics {
  accuracy: number;
  relevance: number;
  completeness: number;
  latency_ms: number;
}

export class DynatraceEvalMetrics {
  private accuracyHistogram;
  private relevanceHistogram;
  private completenessHistogram;
  private latencyHistogram;
  private evalCounter;
  private regressionCounter;

  constructor() {
    if (!meter) {
      // Modo desabilitado - no-op
      this.accuracyHistogram = null;
      this.relevanceHistogram = null;
      this.completenessHistogram = null;
      this.latencyHistogram = null;
      this.evalCounter = null;
      this.regressionCounter = null;
      return;
    }

    // Histogramas para métricas de qualidade
    this.accuracyHistogram = meter.createHistogram("custom.eval.accuracy", {
      description: "Accuracy score of agent evals (0-1)",
      unit: "ratio",
    });

    this.relevanceHistogram = meter.createHistogram("custom.eval.relevance", {
      description: "Relevance score of agent evals (0-1)",
      unit: "ratio",
    });

    this.completenessHistogram = meter.createHistogram("custom.eval.completeness", {
      description: "Completeness score of agent evals (0-1)",
      unit: "ratio",
    });

    this.latencyHistogram = meter.createHistogram("custom.eval.latency_ms", {
      description: "Latency of agent execution in evals",
      unit: "ms",
    });

    // Contadores
    this.evalCounter = meter.createCounter("custom.eval.count", {
      description: "Total number of evals run",
      unit: "count",
    });

    this.regressionCounter = meter.createCounter("custom.eval.regression", {
      description: "Number of regressions detected",
      unit: "count",
    });
  }

  /**
   * Envia métricas de um eval para Dynatrace
   */
  recordEvalMetrics(
    agentName: string,
    metrics: EvalMetrics,
    attributes?: Record<string, string | number>
  ): void {
    if (!config.enabled) return;

    const baseAttrs = {
      agent: agentName,
      environment: config.environment,
      ...attributes,
    };

    // Registrar histogramas
    this.accuracyHistogram?.record(metrics.accuracy, baseAttrs);
    this.relevanceHistogram?.record(metrics.relevance, baseAttrs);
    this.completenessHistogram?.record(metrics.completeness, baseAttrs);
    this.latencyHistogram?.record(metrics.latency_ms, baseAttrs);

    // Incrementar contador
    this.evalCounter?.add(1, baseAttrs);

    console.log(`📊 [Dynatrace] Metrics sent for ${agentName}:`, {
      accuracy: (metrics.accuracy * 100).toFixed(1) + "%",
      relevance: (metrics.relevance * 100).toFixed(1) + "%",
      completeness: (metrics.completeness * 100).toFixed(1) + "%",
      latency_ms: metrics.latency_ms.toFixed(0) + "ms",
    });
  }

  /**
   * Registra detecção de regressão
   */
  recordRegression(agentName: string, metric: string, deltaPercent: number): void {
    if (!config.enabled) return;

    this.regressionCounter?.add(1, {
      agent: agentName,
      metric,
      delta_percent: deltaPercent,
    });

    console.warn(
      `⚠️  [Dynatrace] Regression detected: ${agentName} ${metric} (${deltaPercent.toFixed(1)}%)`
    );
  }

  /**
   * Envia métrica customizada
   */
  recordCustomMetric(
    name: string,
    value: number,
    attributes?: Record<string, string | number>
  ): void {
    if (!config.enabled || !meter) return;

    const counter = meter.createCounter(`custom.eval.${name}`, {
      description: `Custom metric: ${name}`,
    });

    counter.add(value, attributes);
  }
}

// ===========================
// Tracer Helpers
// ===========================

/**
 * Obtém tracer para criar spans
 */
export function getTracer(name: string, version?: string) {
  if (!config.enabled) {
    return trace.getTracer(name, version); // No-op tracer
  }
  return trace.getTracer(name, version || "1.0.0");
}

/**
 * Cria um span para um eval
 */
export function createEvalSpan(agentName: string, caseId: string, difficulty?: string): Span {
  const tracer = getTracer("eval-runner");

  return tracer.startSpan(`eval.${agentName}`, {
    attributes: {
      "eval.agent": agentName,
      "eval.case_id": caseId,
      "eval.difficulty": difficulty || "unknown",
      "eval.environment": config.environment,
    },
  });
}

// ===========================
// Graceful Shutdown
// ===========================

/**
 * Flush traces e metrics antes de encerrar
 */
export async function shutdown(): Promise<void> {
  if (!config.enabled) return;

  console.log("🔄 [Dynatrace] Shutting down...");

  const promises: Promise<void>[] = [];

  if (tracerProvider) {
    promises.push(tracerProvider.shutdown());
  }

  if (meterProvider) {
    promises.push(meterProvider.shutdown());
  }

  await Promise.all(promises);
  console.log("✅ [Dynatrace] Shutdown complete");
}

// Registrar handler de shutdown
process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

// ===========================
// Exports
// ===========================

export const dynatraceMetrics = new DynatraceEvalMetrics();

export default {
  getTracer,
  createEvalSpan,
  metrics: dynatraceMetrics,
  shutdown,
  isEnabled: () => config.enabled,
  getConfig: () => config,
};
