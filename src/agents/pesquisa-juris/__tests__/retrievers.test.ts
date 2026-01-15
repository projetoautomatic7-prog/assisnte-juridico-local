import { beforeEach, describe, expect, it, vi } from "vitest";
import { JurisprudenceRetriever, formatPrecedentes } from "../retrievers";

// Mock das dependências externas
vi.mock("@/lib/gemini-config", () => ({
  getGeminiApiKey: () => "fake-api-key",
  isGeminiConfigured: () => true,
}));

describe("Pesquisa Jurisprudencial - Retrievers", () => {
  let retriever: JurisprudenceRetriever;

  beforeEach(() => {
    // Limpar mocks antes de cada teste
    vi.clearAllMocks();
    retriever = new JurisprudenceRetriever();
  });

  describe("formatPrecedentes", () => {
    it("deve formatar lista vazia corretamente", () => {
      const result = formatPrecedentes([]);
      expect(result).toContain("Nenhum precedente encontrado");
    });

    it("deve formatar precedentes corretamente", () => {
      const precedentes = [
        {
          titulo: "Recurso Especial 123",
          ementa: "Dano moral configurado.",
          relevancia: 0.95,
          tribunal: "STJ",
          data: "2023-10-15",
          numeroProcesso: "REsp 1.234.567",
          relator: "Min. Fulano",
          tags: ["Civil", "Dano Moral"],
        },
      ];

      const result = formatPrecedentes(precedentes);

      expect(result).toContain("**STJ - REsp 1.234.567**");
      expect(result).toContain("Ementa: Dano moral configurado.");
      expect(result).toContain("Relevância: 95%");
      expect(result).toContain("Relator: Min. Fulano");
      expect(result).toContain("Tags: Civil, Dano Moral");
    });
  });

  // Testes de integração simulada (mockando fetch e Qdrant)
  // Nota: Em um ambiente real, configuraríamos mocks mais complexos para o QdrantService
  it("deve instanciar o retriever corretamente", () => {
    expect(retriever).toBeInstanceOf(JurisprudenceRetriever);
  });
});