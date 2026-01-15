/**
 * Testes de integração para retrievers.ts
 * Testes com Qdrant real (quando disponível)
 * Seguindo padrão de testes do Google Agent Starter Pack
 */

import { beforeEach, describe, expect, it } from "vitest";
import { JurisprudenceRetriever } from "../retrievers";
import type { PesquisaJurisInput } from "../validators";

describe("JurisprudenceRetriever - Integração Real", () => {
  let retriever: JurisprudenceRetriever;
  const hasQdrantConfig = !!(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);

  beforeEach(() => {
    retriever = new JurisprudenceRetriever();
  });

  describe("✅ Configuração e Conexão", () => {
    it("deve instanciar corretamente", () => {
      expect(retriever).toBeInstanceOf(JurisprudenceRetriever);
    });

    it("deve conectar ao Qdrant quando configurado", { skip: !hasQdrantConfig }, () => {
      expect(retriever).toHaveProperty("qdrantService");
    });
  });

  describe("✅ Busca Real com Qdrant", () => {
    it("deve buscar jurisprudência sobre direito à greve no STF", 
       { skip: !hasQdrantConfig, timeout: 30000 }, 
       async () => {
        const input: PesquisaJurisInput = {
          tema: "direito à greve servidores públicos",
          tribunal: "STF",
          dataInicio: "2020-01-01",
          dataFim: "2024-12-31",
          limit: 10,
          relevanceThreshold: 0.6,
        };

        const result = await retriever.search(input);

        expect(result).toHaveProperty("precedentes");
        expect(result).toHaveProperty("totalFound");
        expect(result).toHaveProperty("avgRelevance");
        expect(result).toHaveProperty("query", input.tema);
        expect(result).toHaveProperty("executionTimeMs");

        expect(Array.isArray(result.precedentes)).toBe(true);
        expect(result.executionTimeMs).toBeGreaterThan(0);

        // Se encontrou resultados, validar estrutura
        if (result.precedentes.length > 0) {
          const p = result.precedentes[0];
          expect(p).toHaveProperty("titulo");
          expect(p).toHaveProperty("ementa");
          expect(p).toHaveProperty("relevancia");
          expect(p).toHaveProperty("tribunal");
          expect(p).toHaveProperty("data");
          expect(p.tribunal).toBe("STF");
          expect(p.relevancia).toBeGreaterThanOrEqual(0.6);
        }
      }
    );

    it("deve buscar em todos os tribunais", 
       { skip: !hasQdrantConfig, timeout: 30000 }, 
       async () => {
        const input: PesquisaJurisInput = {
          tema: "adicional de insalubridade",
          tribunal: "todos",
          dataInicio: "2020-01-01",
          dataFim: "2024-12-31",
          limit: 5,
          relevanceThreshold: 0.7,
        };

        const result = await retriever.search(input);

        expect(result.precedentes.length).toBeLessThanOrEqual(5);
        expect(result.query).toBe(input.tema);

        // Resultados podem vir de diferentes tribunais
        if (result.precedentes.length > 0) {
          result.precedentes.forEach((p) => {
            expect(p.relevancia).toBeGreaterThanOrEqual(0.7);
            expect(["STF", "STJ", "TST"]).toContain(p.tribunal);
          });
        }
      }
    );

    it("deve respeitar filtro de relevância", 
       { skip: !hasQdrantConfig, timeout: 30000 }, 
       async () => {
        const input: PesquisaJurisInput = {
          tema: "dano moral",
          tribunal: "todos",
          limit: 20,
          relevanceThreshold: 0.85, // Alta relevância
          dataInicio: "2020-01-01",
          dataFim: "2024-12-31",
        };

        const result = await retriever.search(input);

        // Todos os resultados devem ter relevância >= 0.85
        result.precedentes.forEach((p) => {
          expect(p.relevancia).toBeGreaterThanOrEqual(0.85);
        });

        // Relevância média deve ser >= threshold
        if (result.precedentes.length > 0) {
          expect(result.avgRelevance).toBeGreaterThanOrEqual(0.85);
        }
      }
    );

    it("deve ordenar por relevância decrescente", 
       { skip: !hasQdrantConfig, timeout: 30000 }, 
       async () => {
        const input: PesquisaJurisInput = {
          tema: "prescrição trabalhista",
          tribunal: "TST",
          limit: 10,
          relevanceThreshold: 0.5,
          dataInicio: "2020-01-01",
          dataFim: "2024-12-31",
        };

        const result = await retriever.search(input);

        // Validar ordenação
        for (let i = 1; i < result.precedentes.length; i++) {
          expect(result.precedentes[i - 1].relevancia).toBeGreaterThanOrEqual(
            result.precedentes[i].relevancia
          );
        }
      }
    );
  });

  describe("✅ Tratamento de Erros", () => {
    it("deve lançar erro se Qdrant não estiver configurado", 
       { skip: hasQdrantConfig }, 
       async () => {
        const input: PesquisaJurisInput = {
          tema: "teste sem qdrant",
          tribunal: "todos",
          limit: 5,
          relevanceThreshold: 0.7,
          dataInicio: "2020-01-01",
          dataFim: "2024-12-31",
        };

        await expect(retriever.search(input)).rejects.toThrow(/Qdrant não configurado/);
      }
    );

    it("deve lidar com temas muito específicos (sem resultados)", 
       { skip: !hasQdrantConfig, timeout: 30000 }, 
       async () => {
        const input: PesquisaJurisInput = {
          tema: "xyzabc123 termo inexistente jurídico impossível",
          tribunal: "todos",
          limit: 10,
          relevanceThreshold: 0.9,
          dataInicio: "2020-01-01",
          dataFim: "2024-12-31",
        };

        const result = await retriever.search(input);

        // Deve retornar resultado vazio, não erro
        expect(result.precedentes).toEqual([]);
        expect(result.totalFound).toBe(0);
        expect(result.avgRelevance).toBe(0);
      }
    );
  });
});
