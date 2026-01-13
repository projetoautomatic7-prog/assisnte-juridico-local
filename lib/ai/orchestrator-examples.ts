// lib/ai/orchestrator-examples.ts
// Exemplos de uso do AgentOrchestrator em cenários reais

import { SimpleAgent, VolatileMemoryStore } from './core-agent';
import { HttpLlmClient } from './http-llm-client';
import { AGENTS, type AgentId } from './agents-registry';
import { AgentOrchestrator, OrchestrationPatterns } from './agent-orchestrator';
import { ALL_TOOLS } from './tools';
import type { GlobalToolContext } from './tools';

/**
 * Exemplo 1: Workflow de intimação (SEQUENTIAL)
 * Justin-e analisa → Gestão Prazos calcula → Cria tarefa
 */
export async function intimacaoWorkflow(baseContext: GlobalToolContext) {
  const llmClient = new HttpLlmClient({ baseUrl: baseContext.baseUrl + '/api/llm-proxy' });

  // Criar agentes necessários
  const agentsMap = new Map<string, SimpleAgent>();

  const justine = AGENTS['justine'];
  const gestaoPrazos = AGENTS['gestao-prazos'];

  agentsMap.set('justine', new SimpleAgent({
    llm: llmClient,
    tools: ALL_TOOLS,
    persona: justine,
    toolContext: baseContext,
    memoryStore: new VolatileMemoryStore()
  }));

  agentsMap.set('gestao-prazos', new SimpleAgent({
    llm: llmClient,
    tools: ALL_TOOLS,
    persona: gestaoPrazos,
    toolContext: baseContext,
    memoryStore: new VolatileMemoryStore()
  }));

  // Criar orquestrador SEQUENTIAL
  const orchestrator = new AgentOrchestrator(agentsMap, 'sequential');

  const tasks = OrchestrationPatterns.intimacaoWorkflow();
  const result = await orchestrator.orchestrate(tasks);

  console.log('\n=== WORKFLOW DE INTIMAÇÃO ===');
  console.log(`Status: ${result.success ? 'SUCESSO' : 'FALHA'}`);
  console.log(`Duração total: ${result.totalDuration}ms`);

  for (const trace of result.traces) {
    console.log(`\n[${trace.agentId}] Task: ${trace.taskId}`);
    console.log(`  Duração: ${trace.duration}ms`);
    if (trace.error) {
      console.log(`  Erro: ${trace.error}`);
    }
  }

  return result;
}

/**
 * Exemplo 2: Análise de caso (PARALLEL)
 * Múltiplos agentes analisam em paralelo
 */
export async function caseAnalysisParallel(caseId: string, baseContext: GlobalToolContext) {
  const llmClient = new HttpLlmClient({ baseUrl: baseContext.baseUrl + '/api/llm-proxy' });

  // Criar agentes para análise
  const agentsMap = new Map<string, SimpleAgent>();

  const riskAgent = AGENTS['analise-risco'];
  const researchAgent = AGENTS['pesquisa-juris'];
  const financialAgent = AGENTS['financeiro'];

  agentsMap.set('analise-risco', new SimpleAgent({
    llm: llmClient,
    tools: ALL_TOOLS,
    persona: riskAgent,
    toolContext: baseContext,
    memoryStore: new VolatileMemoryStore()
  }));

  agentsMap.set('pesquisa-juris', new SimpleAgent({
    llm: llmClient,
    tools: ALL_TOOLS,
    persona: researchAgent,
    toolContext: baseContext,
    memoryStore: new VolatileMemoryStore()
  }));

  agentsMap.set('financeiro', new SimpleAgent({
    llm: llmClient,
    tools: ALL_TOOLS,
    persona: financialAgent,
    toolContext: baseContext,
    memoryStore: new VolatileMemoryStore()
  }));

  // Criar orquestrador PARALLEL
  const orchestrator = new AgentOrchestrator(agentsMap, 'parallel');

  const tasks = OrchestrationPatterns.caseAnalysisParallel(caseId);
  const result = await orchestrator.orchestrate(tasks);

  console.log('\n=== ANÁLISE DE CASO (PARALELA) ===');
  console.log(`Caso: ${caseId}`);
  console.log(`Status: ${result.success ? 'SUCESSO' : 'FALHA'}`);
  console.log(`Duração total: ${result.totalDuration}ms`);
  console.log(`(Ganho vs. sequencial: ~${tasks.length}x mais rápido)`);

  return result;
}

export async function strategicReview(baseContext: GlobalToolContext) {
  const llmClient = new HttpLlmClient({ baseUrl: baseContext.baseUrl + '/api/llm-proxy' });

  const agentsMap = new Map<string, SimpleAgent>();

  const harvey = AGENTS['harvey'];
  const gestaoPrazos = AGENTS['gestao-prazos'];
  const monitorDjen = AGENTS['monitor-djen'];

  agentsMap.set('harvey', new SimpleAgent({
    llm: llmClient,
    tools: ALLSTOOLS,
    tools: ALL_TOOLS,
    persona: harvey,
    toolContext: baseCont