import { beforeAll, describe, expect, it } from 'vitest';
import { SimpleAgent, VolatileMemoryStore } from './core-agent';
import { HttpLlmClient } from './http-llm-client';

describe('SimpleAgent Resilience - Integração Real', () => {
  beforeAll(() => {
    if (process.env.DISABLE_MOCKS !== 'true') {
      throw new Error('Este teste requer DISABLE_MOCKS=true para garantir conformidade ética.');
    }
  });

  it('deve processar uma tarefa real usando o proxy de LLM sem simulação', async () => {
    // 1. Instanciar Client Real (apontando para o backend de dev)
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const llmClient = new HttpLlmClient({
      baseUrl: `${baseUrl}/api/llm-proxy`,
      timeout: 30000
    });

    // 2. MemoryStore Real (Volátil para teste)
    const memoryStore = new VolatileMemoryStore();

    // 3. Instanciar o Agente
    const agent = new SimpleAgent({
      llm: llmClient,
      tools: [], // Sem ferramentas necessárias para este teste
      persona: {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Agente de teste para validação de JSON',
        systemPrompt: 'Você é um agente de teste.',
        toolNames: []
      },
      toolContext: {},
      memoryStore: memoryStore
    });

    // 4. Executar
    const result = await agent.run('Responda apenas com a palavra "OK" em formato JSON final.');

    // 5. Asserções
    expect(result.answer).toBeDefined();
    expect(result.answer.toUpperCase()).toContain('OK');
    expect(result.steps).toBeGreaterThan(0);
    expect(result.totalDuration).toBeGreaterThan(0);
  }, 40000);
});