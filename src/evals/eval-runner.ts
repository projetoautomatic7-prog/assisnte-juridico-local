/**
 * Eval Runner - Sistema de Avaliação de Agentes
 *
 * Executa golden datasets contra os agentes e gera métricas de qualidade
 * Integração com Dynatrace para observabilidade em tempo real
 *
 * Baseado em OpenAI Cookbook: Evaluation Flywheel
 * @see docs/STAGE_3_EVALS_PLANO_COMPLETO.md
 */

import fs from "fs/promises";
import path from "path";
import { trace, context, SpanStatusCode } from "@opentelemetry/api";
import {
  calculateAccuracy,
  calculateRelevance,
  calculateCompleteness,
} from "./metrics/calculators";
import type { AgentState } from "@/agents/base/agent_state";

// ===========================
// Types & Interfaces
// ===========================

export interface EvalCase {
  id: string;
  input: Record<string, unknown>;
  expected_output: Record<string, unknown>;
  metadata?: {
    difficulty?: "easy" | "medium" | "hard";
    tags?: string[];
    description?: string;
  };
}

export interface EvalMetrics {
  accuracy: number; // 0-1: Quão preciso foi o resultado
  relevance: number; // 0-1: Quão relevante foi o conteúdo
  completeness: number; // 0-1: Quão completo foi o output
  latency_ms: number; // Tempo de execução
}

export interface EvalResult {
  case_id: string;
  agent_name: string;
  passed: boolean;
  metrics: EvalMetrics;
  actual_output: unknown;
  expected_output: unknown;
  timestamp: number;
  error?: string;
}

export interface EvalReport {
  agent_name: string;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  pass_rate: number;
  avg_metrics: EvalMetrics;
  results: EvalResult[];
  timestamp: number;
  duration_ms: number;
}

export interface RegressionCheck {
  detected: boolean;
  metric: string;
  baseline_value: number;
  current_value: number;
  delta_percent: number;
  threshold: number;
}

// ===========================
// Eval Runner Class
// ===========================

export class EvalRunner {
  private tracer = trace.getTracer("eval-runner", "1.0.0");
  private datasetsPath: string;

  constructor(datasetsPath?: string) {
    this.datasetsPath = datasetsPath || path.join(process.cwd(), "src/evals/datasets");
  }

  /**
   * Carrega golden dataset de um agente
   */
  async loadDataset(agentName: string): Promise<EvalCase[]> {
    const datasetPath = path.join(this.datasetsPath, agentName, "golden-cases.json");

    try {
      const content = await fs.readFile(datasetPath, "utf-8");
      const cases = JSON.parse(content) as EvalCase[];

      console.log(`📂 Loaded ${cases.length} cases for ${agentName}`);
      return cases;
    } catch (error) {
      console.error(`❌ Failed to load dataset for ${agentName}:`, error);
      throw new Error(`Dataset not found: ${datasetPath}`);
    }
  }

  /**
   * Executa um único caso de teste
   */
  async runCase(
    agentName: string,
    testCase: EvalCase,
    agentExecutor: (input: Record<string, unknown>) => Promise<AgentState>
  ): Promise<EvalResult> {
    return this.tracer.startActiveSpan(
      `eval.run_case`,
      {
        attributes: {
          "eval.agent": agentName,
          "eval.case_id": testCase.id,
          "eval.difficulty": testCase.metadata?.difficulty || "unknown",
        },
      },
      async (span) => {
        const startTime = Date.now();

        try {
          // Executar agente
          const result = await agentExecutor(testCase.input);
          const latency = Date.now() - startTime;

          // Extrair output estruturado se disponível
          const actualOutput =
            result.data?.structuredOutput || result.messages[result.messages.length - 1]?.content;

          // Calcular métricas
          const metrics: EvalMetrics = {
            accuracy: await calculateAccuracy(actualOutput, testCase.expected_output),
            relevance: await calculateRelevance(actualOutput, testCase.expected_output),
            completeness: await calculateCompleteness(actualOutput, testCase.expected_output),
            latency_ms: latency,
          };

          // Determinar se passou
          const passed =
            metrics.accuracy >= 0.85 &&
            metrics.relevance >= 0.9 &&
            metrics.completeness >= 0.95 &&
            metrics.latency_ms < 5000;

          // Atualizar span
          span.setAttributes({
            "eval.accuracy": metrics.accuracy,
            "eval.relevance": metrics.relevance,
            "eval.completeness": metrics.completeness,
            "eval.latency_ms": metrics.latency_ms,
            "eval.passed": passed,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          console.log(
            `${passed ? "✅" : "❌"} ${testCase.id}: accuracy=${(metrics.accuracy * 100).toFixed(1)}%, latency=${metrics.latency_ms}ms`
          );

          return {
            case_id: testCase.id,
            agent_name: agentName,
            passed,
            metrics,
            actual_output: actualOutput,
            expected_output: testCase.expected_output,
            timestamp: Date.now(),
          };
        } catch (error) {
          const latency = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });

          console.error(`❌ ${testCase.id} FAILED:`, errorMessage);

          return {
            case_id: testCase.id,
            agent_name: agentName,
            passed: false,
            metrics: {
              accuracy: 0,
              relevance: 0,
              completeness: 0,
              latency_ms: latency,
            },
            actual_output: null,
            expected_output: testCase.expected_output,
            timestamp: Date.now(),
            error: errorMessage,
          };
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Executa todos os casos de um agente
   */
  async runEval(
    agentName: string,
    agentExecutor: (input: Record<string, unknown>) => Promise<AgentState>,
    options?: {
      limit?: number;
      difficulty?: "easy" | "medium" | "hard";
    }
  ): Promise<EvalReport> {
    return this.tracer.startActiveSpan(
      `eval.run_agent`,
      {
        attributes: {
          "eval.agent": agentName,
        },
      },
      async (span) => {
        const startTime = Date.now();

        console.log(`\n🚀 Running evals for ${agentName}...`);

        try {
          // Carregar dataset
          let cases = await this.loadDataset(agentName);

          // Filtrar por dificuldade se especificado
          if (options?.difficulty) {
            cases = cases.filter((c) => c.metadata?.difficulty === options.difficulty);
          }

          // Limitar número de casos se especificado
          if (options?.limit) {
            cases = cases.slice(0, options.limit);
          }

          // Executar todos os casos
          const results: EvalResult[] = [];
          for (const testCase of cases) {
            const result = await this.runCase(agentName, testCase, agentExecutor);
            results.push(result);
          }

          // Calcular estatísticas
          const passedCases = results.filter((r) => r.passed).length;
          const failedCases = results.filter((r) => !r.passed).length;
          const passRate = passedCases / results.length;

          const avgMetrics: EvalMetrics = {
            accuracy: results.reduce((sum, r) => sum + r.metrics.accuracy, 0) / results.length,
            relevance: results.reduce((sum, r) => sum + r.metrics.relevance, 0) / results.length,
            completeness:
              results.reduce((sum, r) => sum + r.metrics.completeness, 0) / results.length,
            latency_ms: results.reduce((sum, r) => sum + r.metrics.latency_ms, 0) / results.length,
          };

          const duration = Date.now() - startTime;

          const report: EvalReport = {
            agent_name: agentName,
            total_cases: results.length,
            passed_cases: passedCases,
            failed_cases: failedCases,
            pass_rate: passRate,
            avg_metrics: avgMetrics,
            results,
            timestamp: Date.now(),
            duration_ms: duration,
          };

          // Atualizar span
          span.setAttributes({
            "eval.total_cases": report.total_cases,
            "eval.passed_cases": report.passed_cases,
            "eval.pass_rate": report.pass_rate,
            "eval.avg_accuracy": avgMetrics.accuracy,
            "eval.avg_latency_ms": avgMetrics.latency_ms,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          // Log resumo
          console.log(`\n📊 ${agentName} Eval Results:`);
          console.log(`   Total: ${report.total_cases}`);
          console.log(`   Passed: ${passedCases} (${(passRate * 100).toFixed(1)}%)`);
          console.log(`   Failed: ${failedCases}`);
          console.log(`   Avg Accuracy: ${(avgMetrics.accuracy * 100).toFixed(1)}%`);
          console.log(`   Avg Latency: ${avgMetrics.latency_ms.toFixed(0)}ms`);
          console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);

          return report;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Salva relatório em disco
   */
  async saveReport(report: EvalReport): Promise<string> {
    const reportsDir = path.join(process.cwd(), "src/evals/reports");
    await fs.mkdir(reportsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const filename = `${report.agent_name}-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`💾 Report saved: ${filepath}`);

    return filepath;
  }

  /**
   * Detecta regressão comparando com baseline
   */
  async detectRegression(
    current: EvalReport,
    baseline: EvalReport,
    threshold: number = -0.05 // -5%
  ): Promise<RegressionCheck[]> {
    const checks: RegressionCheck[] = [];

    // Verificar cada métrica
    const metrics: Array<keyof EvalMetrics> = ["accuracy", "relevance", "completeness"];

    for (const metric of metrics) {
      const currentValue = current.avg_metrics[metric];
      const baselineValue = baseline.avg_metrics[metric];
      const delta = (currentValue - baselineValue) / baselineValue;

      const detected = delta < threshold;

      checks.push({
        detected,
        metric,
        baseline_value: baselineValue,
        current_value: currentValue,
        delta_percent: delta * 100,
        threshold: threshold * 100,
      });

      if (detected) {
        console.warn(`⚠️  REGRESSION DETECTED in ${metric}:`);
        console.warn(`   Baseline: ${(baselineValue * 100).toFixed(1)}%`);
        console.warn(`   Current: ${(currentValue * 100).toFixed(1)}%`);
        console.warn(`   Delta: ${(delta * 100).toFixed(1)}%`);
      }
    }

    return checks;
  }

  /**
   * Carrega baseline anterior
   */
  async loadBaseline(agentName: string): Promise<EvalReport | null> {
    const baselinePath = path.join(
      process.cwd(),
      "src/evals/reports",
      `${agentName}-baseline.json`
    );

    try {
      const content = await fs.readFile(baselinePath, "utf-8");
      return JSON.parse(content) as EvalReport;
    } catch {
      console.log(`⚠️  No baseline found for ${agentName}`);
      return null;
    }
  }

  /**
   * Salva como baseline
   */
  async saveAsBaseline(report: EvalReport): Promise<void> {
    const baselinePath = path.join(
      process.cwd(),
      "src/evals/reports",
      `${report.agent_name}-baseline.json`
    );
    await fs.writeFile(baselinePath, JSON.stringify(report, null, 2));
    console.log(`📌 Saved as baseline: ${baselinePath}`);
  }
}

// ===========================
// Singleton Export
// ===========================

export const evalRunner = new EvalRunner();
export default evalRunner;
