import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiResponse } from "../../lib/gemini-service.js";
import * as GeminiService from "../../lib/gemini-service.js";
import { runRedacao } from "./redacao_graph.js";
import { REDACAO_SYSTEM_PROMPT } from "./templates.js";

// Mock do Gemini Service
vi.mock("../../lib/gemini-service", async (importOriginal) => {
  const actual = await importOriginal<typeof GeminiService>();
  return {
    ...actual,
    callGemini: vi.fn(),
  };
});

// Mock dos templates para evitar dependência do arquivo real
vi.mock("@/lib/document-templates", () => ({
  documentTemplates: [
    { id: "template-teste", nome: "Teste", conteudo: "MODELO DE TESTE: {{variavel}}" },
  ],
}));

describe("Redação Agent - System Instruction Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve enviar systemInstruction separadamente para o Gemini", async () => {
    // 1. Setup do Mock
    const mockResponse: GeminiResponse = {
      text: "Minuta de petição inicial gerada com sucesso...",
      metadata: { model: "gemini-2.5-pro" },
    };
    const callGeminiSpy = vi.mocked(GeminiService.callGemini).mockResolvedValue(mockResponse);

    const input = {
      tipo: "Petição Inicial",
      detalhes: "Ação de cobrança de aluguéis atrasados. Valor R$ 5.000,00.",
      processo: "00000-00.2024.8.00.0000",
    };

    // 2. Execução
    await runRedacao(input);

    // 3. Verificação
    expect(callGeminiSpy).toHaveBeenCalledTimes(1);

    const [prompt, config] = callGeminiSpy.mock.calls[0];

    // O prompt do usuário NÃO deve conter a instrução do sistema
    expect(prompt).not.toContain(REDACAO_SYSTEM_PROMPT);

    // A config deve conter a systemInstruction correta
    expect(config?.systemInstruction).toBe(REDACAO_SYSTEM_PROMPT);
    expect(config?.temperature).toBe(0.5);
  });

  it("deve utilizar template quando fornecido", async () => {
    const mockResponse: GeminiResponse = {
      text: "Minuta baseada no template...",
      metadata: { model: "gemini-2.5-pro" },
    };
    const callGeminiSpy = vi.mocked(GeminiService.callGemini).mockResolvedValue(mockResponse);

    const input = {
      tipo: "Petição",
      detalhes: "Detalhes do caso",
      templateId: "template-teste",
    };

    await runRedacao(input);

    expect(callGeminiSpy).toHaveBeenCalledTimes(1);
    const [prompt] = callGeminiSpy.mock.calls[0];

    // Verifica se o conteúdo do template mockado foi inserido no prompt
    expect(prompt).toContain("MODELO DE TESTE: {{variavel}}");
  });
});
