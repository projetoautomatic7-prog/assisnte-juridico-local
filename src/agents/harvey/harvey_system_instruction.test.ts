import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeminiResponse } from '../../lib/gemini-service.js';
import * as GeminiService from '../../lib/gemini-service.js';
import { runHarvey } from './harvey_graph.js';
import { HARVEY_SYSTEM_PROMPT } from './templates.js';

// Mock do Gemini Service para interceptar a chamada
vi.mock('../../lib/gemini-service', async (importOriginal) => {
  const actual = await importOriginal<typeof GeminiService>();
  return {
    ...actual,
    callGemini: vi.fn(),
  };
});

describe('Harvey Agent - System Instruction Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve enviar systemInstruction separadamente para o Gemini', async () => {
    // 1. Setup do Mock
    const mockResponse: GeminiResponse = {
      text: 'Análise realizada com sucesso pelo Harvey.',
      metadata: { model: 'gemini-2.5-pro' }
    };
    const callGeminiSpy = vi.mocked(GeminiService.callGemini).mockResolvedValue(mockResponse);

    const input = {
      task: 'Revisar contrato de prestação de serviços',
      urgency: 'high'
    };

    // 2. Execução
    await runHarvey(input);

    // 3. Verificação
    expect(callGeminiSpy).toHaveBeenCalledTimes(1);

    const [prompt, config] = callGeminiSpy.mock.calls[0];

    // O prompt do usuário NÃO deve conter a instrução do sistema (agora separada)
    expect(prompt).not.toContain(HARVEY_SYSTEM_PROMPT);

    // A config deve conter a systemInstruction correta
    expect(config?.systemInstruction).toBe(HARVEY_SYSTEM_PROMPT);
    expect(config?.temperature).toBe(0.7);
  });
});