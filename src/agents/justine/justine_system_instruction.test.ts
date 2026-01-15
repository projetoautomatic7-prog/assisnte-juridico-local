import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeminiResponse } from '../../lib/gemini-service';
import * as GeminiService from '../../lib/gemini-service';
import { runJustine } from './justine_graph';
import { JUSTINE_SYSTEM_PROMPT } from './templates';

// Mock do Gemini Service para interceptar a chamada
vi.mock('../../lib/gemini-service', async (importOriginal) => {
  const actual = await importOriginal<typeof GeminiService>();
  return {
    ...actual,
    callGemini: vi.fn(),
  };
});

describe('Mrs. Justin-e Agent - System Instruction Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve enviar systemInstruction separadamente para o Gemini', async () => {
    // 1. Setup do Mock
    // Simulamos uma resposta JSON válida, já que a Justine sempre retorna JSON
    const mockResponse: GeminiResponse = {
      text: JSON.stringify({
        summary: "Intimação para apresentar contrarrazões.",
        priority: "alta",
        deadline: { days: 15, type: "úteis", endDate: "20/02/2026" },
        suggestedActions: ["Elaborar contrarrazões"]
      }),
      metadata: { model: 'gemini-2.5-pro' }
    };
    const callGeminiSpy = vi.mocked(GeminiService.callGemini).mockResolvedValue(mockResponse);

    const input = {
      content: 'Fica intimada a parte recorrida para apresentar contrarrazões ao recurso de apelação...',
      numeroProcesso: '1000000-00.2025.8.26.0100',
      tribunal: 'TJSP'
    };

    // 2. Execução
    await runJustine(input);

    // 3. Verificação
    expect(callGeminiSpy).toHaveBeenCalledTimes(1);
    const [prompt, config] = callGeminiSpy.mock.calls[0];

    // O prompt do usuário NÃO deve conter a instrução do sistema (agora separada)
    expect(prompt).not.toContain(JUSTINE_SYSTEM_PROMPT);

    // A config deve conter a systemInstruction correta
    expect(config?.systemInstruction).toBe(JUSTINE_SYSTEM_PROMPT);
  });
});