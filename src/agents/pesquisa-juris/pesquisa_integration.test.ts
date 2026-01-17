import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiResponse } from "../../lib/gemini-service.js";
import * as GeminiService from "../../lib/gemini-service.js";
import { runPesquisaJuris } from "./pesquisa_graph.js";

// Mock do Gemini Service
vi.mock("../../lib/gemini-service", async (importOriginal) => {
  const actual = await importOriginal<typeof GeminiService>();
  return {
    ...actual,
    callGemini: vi.fn(),
  };
});

// Mock do Retriever para simular busca no banco de dados
vi.mock("./retrievers", () => ({
  JurisprudenceRetriever: class {
    async search(_query: any) {
      return {
        precedentes: [
          {
            titulo: "Recurso Especial 12345",
            ementa: "DANO MORAL. VOO ATRASADO. INDENIZAÇÃO DEVIDA.",
            tribunal: "STJ",
            data: "2023-10-15",
            relevancia: 0.98,
            numero: "REsp 12345",
          },
        ],
        totalFound: 1,
        avgRelevance: 0.98,
        executionTimeMs: 100,
      };
    }
  },
  formatPrecedentes: (precedentes: any[]) => JSON.stringify(precedentes),
}));

// Mock do Sentry/Tracing
vi.mock("../../lib/sentry-gemini-integration-v2", () => ({
  createInvokeAgentSpan: vi
    .fn()
    .mockImplementation(async (_config, _context, callback) => {
      return callback({
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
      });
    }),
}));

describe("Integração: Agente de Pesquisa Jurisprudencial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve executar o fluxo completo: validação -> busca -> análise", async () => {
    // 1. Setup do Mock do Gemini para a etapa de análise
    const mockAnalysisResponse: GeminiResponse = {
      text: "Com base na jurisprudência encontrada do STJ, o dano moral é devido em casos de atraso de voo excessivo.",
      metadata: { model: "gemini-2.5-pro" },
    };
    const callGeminiSpy = vi
      .mocked(GeminiService.callGemini)
      .mockResolvedValue(mockAnalysisResponse);

    // 2. Input do usuário
    const inputData = {
      tema: "Atraso de voo dano moral",
      tribunal: "STJ",
    };

    // 3. Execução do Agente
    const resultState = await runPesquisaJuris(inputData);

    // 4. Verificações
    expect(resultState.completed).toBe(true);
    expect(resultState.currentStep).toBe("pesquisa:complete");

    // Verifica se o resultado contém a análise do Gemini
    const lastMessage = resultState.messages[resultState.messages.length - 1];
    expect(lastMessage.content).toBe(mockAnalysisResponse.text);
    expect(lastMessage.role).toBe("assistant");

    // Verifica se o Gemini foi chamado corretamente (com systemInstruction)
    expect(callGeminiSpy).toHaveBeenCalledTimes(1);
    const [prompt, config] = callGeminiSpy.mock.calls[0];

    expect(prompt).toContain("REsp 12345"); // O prompt deve conter os dados recuperados
    expect(config?.systemInstruction).toBeDefined();
  });
});
