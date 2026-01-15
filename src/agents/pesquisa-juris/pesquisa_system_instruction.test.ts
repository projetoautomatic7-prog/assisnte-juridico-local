import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiResponse } from "../../lib/gemini-service.js";
import * as GeminiService from "../../lib/gemini-service.js";
import { runPesquisaJuris } from "./pesquisa_graph.js";
import { PESQUISA_JURIS_SYSTEM_PROMPT } from "./templates.js";

// Mock do Gemini Service
vi.mock("../../lib/gemini-service", async (importOriginal) => {
  const actual = await importOriginal<typeof GeminiService>();
  return {
    ...actual,
    callGemini: vi.fn(),
  };
});

// Mock do Retriever para não chamar API externa/Banco
vi.mock("./retrievers", () => ({
  JurisprudenceRetriever: class {
    search() {
      return Promise.resolve({
        precedentes: [
          {
            tribunal: "TJSP",
            ementa: "Ementa de teste",
            data: "2023-01-01",
            titulo: "Acórdão 123",
            relevancia: 0.95,
            numero: "123456",
          },
        ],
        totalFound: 1,
        avgRelevance: 0.95,
        executionTimeMs: 50,
      });
    }
  },
  formatPrecedentes: () => "RESUMO DOS PRECEDENTES MOCKADOS",
}));

// Mock do Sentry/Tracing para evitar erros de alias @/
vi.mock("../../lib/sentry-gemini-integration-v2", () => ({
  createInvokeAgentSpan: vi.fn().mockImplementation(async (_config, _context, callback) => {
    return callback({
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
    });
  }),
}));

describe("Pesquisa Juris Agent - System Instruction Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve enviar systemInstruction separadamente para o Gemini", async () => {
    // 1. Setup do Mock
    const mockResponse: GeminiResponse = {
      text: "Análise da pesquisa realizada com sucesso.",
      metadata: { model: "gemini-2.5-pro" },
    };
    const callGeminiSpy = vi.mocked(GeminiService.callGemini).mockResolvedValue(mockResponse);

    const input = {
      tema: "Dano moral em voo atrasado",
      tribunal: "TJSP",
    };

    // 2. Execução
    await runPesquisaJuris(input);

    // 3. Verificação
    expect(callGeminiSpy).toHaveBeenCalled();

    // Verifica a última chamada (que deve ser a análise final)
    const calls = callGeminiSpy.mock.calls;
    const lastCall = calls[calls.length - 1];
    const [prompt, config] = lastCall;

    // O prompt do usuário NÃO deve conter a instrução do sistema
    expect(prompt).not.toContain(PESQUISA_JURIS_SYSTEM_PROMPT);

    // A config deve conter a systemInstruction correta
    expect(config?.systemInstruction).toBe(PESQUISA_JURIS_SYSTEM_PROMPT);
    expect(config?.temperature).toBe(0.3);
  });
});
