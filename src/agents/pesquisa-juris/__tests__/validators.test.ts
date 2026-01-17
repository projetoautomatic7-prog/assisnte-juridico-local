import { describe, expect, it } from "vitest";
import { validatePesquisaInput, ValidationError } from "../validators";

describe("Pesquisa Jurisprudencial - Validators", () => {
  it("deve validar um input correto", () => {
    const input = {
      tema: "Dano moral por atraso de voo",
      tribunal: "STJ",
      limit: 20,
    };

    const result = validatePesquisaInput(input);

    expect(result).toEqual({
      tema: "Dano moral por atraso de voo",
      tribunal: "STJ",
      limit: 20,
      relevanceThreshold: 0.7, // Valor default
      dataInicio: undefined,
      dataFim: undefined,
    });
  });

  it("deve lançar erro se o tema estiver ausente", () => {
    expect(() => validatePesquisaInput({})).toThrow(ValidationError);
    expect(() => validatePesquisaInput({ tribunal: "STF" })).toThrow(
      /obrigatório/,
    );
  });

  it("deve lançar erro se o tema for muito curto", () => {
    expect(() => validatePesquisaInput({ tema: "Oi" })).toThrow(
      /entre 3 e 500/,
    );
  });

  it("deve aceitar tribunal 'todos' como default", () => {
    const result = validatePesquisaInput({ tema: "Habeas Corpus" });
    expect(result.tribunal).toBe("todos");
  });

  it("deve lançar erro para tribunal inválido", () => {
    expect(() =>
      validatePesquisaInput({ tema: "Teste", tribunal: "TJSP" }),
    ).toThrow(/Campo 'tribunal'/);
  });

  it("deve validar formato de data", () => {
    const input = {
      tema: "Teste",
      dataInicio: "2023-01-01",
    };
    const result = validatePesquisaInput(input);
    expect(result.dataInicio).toBe("2023-01-01");
  });

  it("deve lançar erro para data inválida", () => {
    expect(() =>
      validatePesquisaInput({ tema: "Teste", dataInicio: "01/01/2023" }),
    ).toThrow(/formato YYYY-MM-DD/);

    expect(() =>
      validatePesquisaInput({ tema: "Teste", dataInicio: "2023-13-01" }),
    ).toThrow(/inválida/);
  });

  it("deve validar limites numéricos", () => {
    expect(() => validatePesquisaInput({ tema: "Teste", limit: 0 })).toThrow(
      /entre 1 e 50/,
    );

    expect(() => validatePesquisaInput({ tema: "Teste", limit: 100 })).toThrow(
      /entre 1 e 50/,
    );
  });

  it("deve validar relevanceThreshold", () => {
    expect(() =>
      validatePesquisaInput({ tema: "Teste", relevanceThreshold: 1.5 }),
    ).toThrow(/entre 0 e 1/);

    const result = validatePesquisaInput({
      tema: "Teste",
      relevanceThreshold: 0.5,
    });
    expect(result.relevanceThreshold).toBe(0.5);
  });
});
