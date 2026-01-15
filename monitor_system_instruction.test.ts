import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeminiResponse } from '../../lib/gemini-service';
import * as GeminiService from '../../lib/gemini-service';
import { runMonitorDjen } from './monitor_graph';
import { MONITOR_SYSTEM_PROMPT } from './templates';

// Mock do Gemini Service
vi.mock('../../lib/gemini-service', async (importOriginal) => {
  const actual = await importOriginal<typeof GeminiService>();
  return {
    ...actual,
    callGemini: vi.fn(),
  };
});

describe('Monitor DJEN Agent - System Instruction Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve enviar systemInstruction separadamente para o Gemini', async () => {
    // 1. Setup do Mock
    const mockResponse: GeminiResponse = {
      text: 'Análise de publicações concluída. 2 publicações relevantes encontradas.',
      metadata: { model: 'gemini-2.5-pro' }
    };
    const callGeminiSpy = vi.mocked(GeminiService.callGemini).mockResolvedValue(mockResponse);

    const input = {
      oab: '123456/SP',
      publicacoes: 'Publicação 1: Intimação para pagamento... Publicação 2: Arquivamento...'
    };

    // 2. Execução
    await runMonitorDjen(input);

    // 3. Verificação
    expect(callGeminiSpy).toHaveBeenCalledTimes(1);

    const [prompt, config] = callGeminiSpy.mock.calls[0];

    // O prompt do usuário NÃO deve conter a instrução do sistema
    expect(prompt).not.toContain(MONITOR_SYSTEM_PROMPT);

    // A config deve conter a systemInstruction correta
    expect(config?.systemInstruction).toBe(MONITOR_SYSTEM_PROMPT);
    // Temperatura deve ser baixa para análise de dados
    expect(config?.temperature).toBe(0.1);
  });
});