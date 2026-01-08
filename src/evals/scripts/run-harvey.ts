#!/usr/bin/env tsx
/**
 * Run Harvey Evals
 *
 * Executa suite de evals para o agente Harvey e envia métricas para Dynatrace
 *
 * Usage:
 *   npm run eval:harvey
 *   npm run eval:harvey -- --limit=10 --difficulty=hard
 */

import { evalRunner } from "../eval-runner";
import { runHarvey } from "@/agents/harvey/harvey_graph";
import { dynatraceMetrics } from "@/lib/dynatrace-otel";
import type { AgentState } from "@/agents/base/agent_state";

async function main() {
  console.log("\n🎯 Running Harvey Evals...\n");

  // Parse args
  const args = process.argv.slice(2);
  const limit = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const difficulty = args.find((a) => a.startsWith("--difficulty="))?.split("=")[1] as
    | "easy"
    | "medium"
    | "hard"
    | undefined;

  const options = {
    limit: limit ? parseInt(limit, 10) : undefined,
    difficulty,
  };

  try {
    // Executar eval
    const report = await evalRunner.runEval(
      "harvey",
      async (input) => {
        // Wrapper para executar Harvey com os inputs do teste
        const result = await runHarvey(input);
        return result;
      },
      options
    );

    // Enviar métricas para Dynatrace
    dynatraceMetrics.recordEvalMetrics("harvey", report.avg_metrics, {
      total_cases: report.total_cases,
      pass_rate: report.pass_rate,
    });

    // Salvar relatório
    const filepath = await evalRunner.saveReport(report);
    console.log(`\n💾 Report saved: ${filepath}`);

    // Verificar se passou
    if (report.pass_rate < 0.9) {
      console.error(
        `\n❌ Harvey eval FAILED: pass rate ${(report.pass_rate * 100).toFixed(1)}% < 90%`
      );
      process.exit(1);
    }

    console.log(`\n✅ Harvey eval PASSED: ${report.passed_cases}/${report.total_cases} cases`);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Harvey eval ERROR:", error);
    process.exit(1);
  }
}

main();
