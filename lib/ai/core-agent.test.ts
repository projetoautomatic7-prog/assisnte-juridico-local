import { describe, expect, it, vi } from 'vitest';
import { SimpleAgent, type LlmClient } from './core-agent';

describe('SimpleAgent Resilience', () => {
  it('deve recuperar-se de uma resposta JSON inválida do LLM', async () => {
    // 1. Mock do LLM Client
    // Primeira chamada: Retorna lixo (não JSON)
    // Segunda chamada: Retorna JSON válido (correção)
    const mockLlm: LlmClient = {
      chat: vi.fn()
        .mockResolvedValueOnce('Isto não é um JSON válido, é apenas texto.')
        .mockResolvedValueOnce(JSON.stringify({
          action: 'final',
          answer: 'Recuperado com sucesso após erro de JSON.'
        }))
    };

    // 2. Mock do MemoryStore para isolamento
    const mockMemoryStore = {
      load: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined)
    };

    // 3. Instanciar o Agente
    const agent = new SimpleAgent({
      llm: mockLlm,
      tools: [], // Sem ferramentas necessárias para este teste
      persona: {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Agente de teste para validação de JSON',
        systemPrompt: 'Você é um agente de teste.',
        toolNames: []
      },
      toolContext: {},
      memoryStore: mockMemoryStore
    });

    // 4. Executar
    const result = await agent.run('Teste de robustez JSON');

    // 5. Asserções
    expect(result.answer).toBe('Recuperado com sucesso após erro de JSON.');
    expect(mockLlm.chat).toHaveBeenCalledTimes(2); // Garante que houve retry

    // Verifica se o erro foi registrado nos traces de observabilidade
    const errorTrace = result.traces.find(t => t.type === 'observation' && t.error);
    expect(errorTrace).toBeDefined();
    expect(errorTrace?.content).toContain('Resposta inválida');
    expect(errorTrace?.error).toBeTruthy();
  });
});