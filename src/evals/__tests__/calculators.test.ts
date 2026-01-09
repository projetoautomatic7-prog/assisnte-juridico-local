/**
 * Testes para Metric Calculators
 */

import { describe, test, expect } from "vitest";
import {
  calculateAccuracy,
  calculateRelevance,
  calculateCompleteness,
  calculateAllMetrics,
  metricsPass,
} from "../metrics/calculators";

describe("Metric Calculators", () => {
  describe("calculateAccuracy", () => {
    test("retorna 1.0 para objetos idênticos", async () => {
      const obj = { a: 1, b: "test", c: true };
      const accuracy = await calculateAccuracy(obj, obj);
      expect(accuracy).toBe(1.0);
    });

    test("retorna 0.5 para 50% de campos corretos", async () => {
      const actual = { a: 1, b: "wrong" };
      const expected = { a: 1, b: "correct" };
      const accuracy = await calculateAccuracy(actual, expected);
      expect(accuracy).toBeGreaterThan(0.4);
      expect(accuracy).toBeLessThan(0.6);
    });

    test("ignora case e whitespace em strings", async () => {
      const actual = { name: "  João Silva  " };
      const expected = { name: "joão silva" };
      const accuracy = await calculateAccuracy(actual, expected);
      expect(accuracy).toBe(1.0);
    });

    test("compara arrays corretamente", async () => {
      const actual = { items: ["a", "b", "c"] };
      const expected = { items: ["a", "b"] };
      const accuracy = await calculateAccuracy(actual, expected);
      expect(accuracy).toBe(1.0); // tem todos os items esperados
    });

    test("tolera pequenas diferenças numéricas", async () => {
      const actual = { value: 100.001 };
      const expected = { value: 100.0 };
      const accuracy = await calculateAccuracy(actual, expected);
      expect(accuracy).toBe(1.0);
    });
  });

  describe("calculateRelevance", () => {
    test("retorna 1.0 para conteúdo idêntico", async () => {
      const obj = { text: "advogado trabalhista rescisão contrato" };
      const relevance = await calculateRelevance(obj, obj);
      expect(relevance).toBe(1.0);
    });

    test("detecta palavras-chave importantes", async () => {
      const actual = {
        estrategia: "Entrar com ação trabalhista para rescisão de contrato",
      };
      const expected = {
        estrategia: "Ação trabalhista rescisão contrato CLT",
      };
      const relevance = await calculateRelevance(actual, expected);
      expect(relevance).toBeGreaterThan(0.6); // deve encontrar maioria das keywords
    });

    test("retorna menor valor para conteúdo não relacionado", async () => {
      const actual = { text: "gato cachorro pássaro" };
      const expected = { text: "advogado processo judicial sentença" };
      const relevance = await calculateRelevance(actual, expected);
      expect(relevance).toBeLessThan(0.3);
    });
  });

  describe("calculateCompleteness", () => {
    test("retorna 1.0 quando todos os campos estão presentes", async () => {
      const actual = { a: 1, b: 2, c: 3 };
      const expected = { a: 1, b: 2 };
      const completeness = await calculateCompleteness(actual, expected);
      expect(completeness).toBe(1.0);
    });

    test("retorna 0.5 quando metade dos campos está ausente", async () => {
      const actual = { a: 1 };
      const expected = { a: 1, b: 2 };
      const completeness = await calculateCompleteness(actual, expected);
      expect(completeness).toBe(0.5);
    });

    test("retorna 0.0 quando nenhum campo está presente", async () => {
      const actual = { x: 1 };
      const expected = { a: 1, b: 2 };
      const completeness = await calculateCompleteness(actual, expected);
      expect(completeness).toBe(0.0);
    });

    test("aceita arrays vazios como presentes", async () => {
      const actual = { items: [] };
      const expected = { items: ["a", "b"] };
      const completeness = await calculateCompleteness(actual, expected);
      expect(completeness).toBe(1.0); // campo existe (mas accuracy será baixo)
    });
  });

  describe("calculateAllMetrics", () => {
    test("calcula todas as métricas simultaneamente", async () => {
      const actual = {
        estrategia: "Ação trabalhista rescisão",
        fundamento: ["CLT art. 477"],
        valor: "R$ 10.000",
      };
      const expected = {
        estrategia: "Ação trabalhista para rescisão contratual",
        fundamento: ["CLT art. 477", "CLT art. 468"],
        valor: "R$ 10.000",
      };

      const metrics = await calculateAllMetrics(actual, expected);

      expect(metrics).toHaveProperty("accuracy");
      expect(metrics).toHaveProperty("relevance");
      expect(metrics).toHaveProperty("completeness");

      expect(metrics.accuracy).toBeGreaterThan(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);

      expect(metrics.relevance).toBeGreaterThan(0);
      expect(metrics.relevance).toBeLessThanOrEqual(1);

      expect(metrics.completeness).toBeGreaterThan(0);
      expect(metrics.completeness).toBeLessThanOrEqual(1);
    });
  });

  describe("metricsPass", () => {
    test("retorna true quando todas as métricas passam", () => {
      const metrics = {
        accuracy: 0.9,
        relevance: 0.95,
        completeness: 0.98,
      };

      expect(metricsPass(metrics)).toBe(true);
    });

    test("retorna false quando uma métrica falha", () => {
      const metrics = {
        accuracy: 0.8, // abaixo de 0.85
        relevance: 0.95,
        completeness: 0.98,
      };

      expect(metricsPass(metrics)).toBe(false);
    });

    test("aceita thresholds customizados", () => {
      const metrics = {
        accuracy: 0.7,
        relevance: 0.75,
        completeness: 0.8,
      };

      const passed = metricsPass(metrics, {
        accuracy: 0.65,
        relevance: 0.7,
        completeness: 0.75,
      });

      expect(passed).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("lida com null/undefined graciosamente", async () => {
      const accuracy1 = await calculateAccuracy(null, null);
      expect(accuracy1).toBe(1.0);

      const accuracy2 = await calculateAccuracy(null, { a: 1 });
      expect(accuracy2).toBe(0.0);

      const completeness = await calculateCompleteness(null, { a: 1 });
      expect(completeness).toBe(0.0);
    });

    test("lida com objetos vazios", async () => {
      const accuracy = await calculateAccuracy({}, {});
      expect(accuracy).toBe(0); // sem campos para comparar

      const completeness = await calculateCompleteness({}, {});
      expect(completeness).toBe(1.0); // sem campos obrigatórios
    });

    test("lida com valores primitivos", async () => {
      const accuracy1 = await calculateAccuracy(42, 42);
      expect(accuracy1).toBe(1.0);

      const accuracy2 = await calculateAccuracy("test", "test");
      expect(accuracy2).toBe(1.0);

      const accuracy3 = await calculateAccuracy(true, false);
      expect(accuracy3).toBe(0.0);
    });
  });
});
