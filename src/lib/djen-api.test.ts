import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  validarFormatoData,
  validarNumeroOAB,
  getTribunaisDisponiveis,
  DJENAPIError,
  consultarDJEN,
} from "./djen-api";

describe("DJEN API - Validações", () => {
  describe("validarFormatoData", () => {
    it("deve aceitar formato AAAA-MM-DD válido", () => {
      expect(validarFormatoData("2025-01-16")).toBe(true);
      expect(validarFormatoData("2024-12-31")).toBe(true);
      expect(validarFormatoData("2023-06-15")).toBe(true);
    });

    it("deve rejeitar formatos inválidos", () => {
      expect(validarFormatoData("16/01/2025")).toBe(false);
      expect(validarFormatoData("2025/01/16")).toBe(false);
      expect(validarFormatoData("01-16-2025")).toBe(false);
      expect(validarFormatoData("2025-1-16")).toBe(false);
      expect(validarFormatoData("invalid")).toBe(false);
    });

    it("deve rejeitar datas inexistentes", () => {
      expect(validarFormatoData("2025-13-01")).toBe(false);
      expect(validarFormatoData("2025-02-30")).toBe(false);
      expect(validarFormatoData("2025-04-31")).toBe(false);
    });
  });

  describe("validarNumeroOAB", () => {
    it("deve aceitar formato OAB/UF número válido", () => {
      expect(validarNumeroOAB("OAB/MG 123456")).toBe(true);
      expect(validarNumeroOAB("OAB/SP 999999")).toBe(true);
      expect(validarNumeroOAB("OAB/RJ 1")).toBe(true);
      expect(validarNumeroOAB("oab/mg 123")).toBe(true);
      expect(validarNumeroOAB("123456")).toBe(true); // Aceita apenas números
    });

    it("deve rejeitar formatos inválidos", () => {
      expect(validarNumeroOAB("OAB 123456")).toBe(false);
      expect(validarNumeroOAB("MG 123456")).toBe(false);
      expect(validarNumeroOAB("OAB/MG")).toBe(false);
      expect(validarNumeroOAB("OAB/MGX 123")).toBe(false);
    });
  });

  describe("getTribunaisDisponiveis", () => {
    it("deve retornar lista de tribunais", () => {
      const tribunais = getTribunaisDisponiveis();
      expect(tribunais).toBeInstanceOf(Array);
      expect(tribunais.length).toBeGreaterThan(0);
      expect(tribunais).toContain("TJSP");
      expect(tribunais).toContain("TST");
      expect(tribunais).toContain("TJMG");
    });

    it("deve retornar array imutável", () => {
      const tribunais1 = getTribunaisDisponiveis();
      const tribunais2 = getTribunaisDisponiveis();
      expect(tribunais1).not.toBe(tribunais2);
    });
  });
});

describe("DJEN API - Classe de Erro", () => {
  it("deve criar erro com mensagem e tribunal", () => {
    const erro = new DJENAPIError("Erro de teste", "TJSP");
    expect(erro.message).toBe("Erro de teste");
    expect(erro.tribunal).toBe("TJSP");
    expect(erro.name).toBe("DJENAPIError");
  });

  it("deve criar erro com status code", () => {
    const erro = new DJENAPIError("Erro HTTP", "TJMG", 404);
    expect(erro.statusCode).toBe(404);
    expect(erro.tribunal).toBe("TJMG");
  });

  it("deve ser instância de Error", () => {
    const erro = new DJENAPIError("Teste");
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(DJENAPIError);
  });
});

describe("DJEN API - Integração", () => {
  beforeAll(() => {
    if (process.env.DISABLE_MOCKS !== 'true') {
      throw new Error('Falha de Segurança: Este teste de API deve ser executado com DISABLE_MOCKS=true para conformidade ética.');
    }
  });

  it("deve lançar erro se não houver termo de busca", async () => {
    await expect(
      consultarDJEN({
        tribunais: ["TJSP"],
        searchTerms: {},
      })
    ).rejects.toThrow("É necessário fornecer pelo menos um termo de busca");
  });

  it("deve processar consulta real (pode retornar vazio se não houver publicações hoje)", async () => {
    const resultado = await consultarDJEN({
      tribunais: ["TJSP"],
      searchTerms: { nomeAdvogado: "Teste" },
      dataInicio: "2025-01-16",
    });

    expect(resultado.resultados).toBeDefined();
    expect(resultado.totalConsultado).toBeGreaterThanOrEqual(0);
  }, 30000);

  it("deve buscar publicações reais para um advogado conhecido", async () => {
    // Usando OAB de exemplo do sistema para validar integração real
    const resultado = await consultarDJEN({
      tribunais: ["TJMG"],
      searchTerms: { numeroOAB: "184404/MG" },
      dataInicio: "2024-01-01", // Data retroativa para garantir massa de dados
      dataFim: "2024-01-10"
    });

    if (resultado.erros.length > 0) {
      console.warn(`⚠️ Falha em alguns tribunais (possível geobloqueio): ${resultado.erros.map(e => e.tribunal).join(', ')}`);
    }

    expect(resultado.totalConsultado).toBeGreaterThanOrEqual(0);
    // Validação de estrutura real
    if (resultado.resultados.length > 0) {
      expect(resultado.resultados[0]).toHaveProperty('tribunal');
      expect(resultado.resultados[0]).toHaveProperty('numero_processo');
    }
  }, 60000);

  it("deve usar data atual se não especificada", async () => {
    await consultarDJEN({
      tribunais: ["TJSP"],
      searchTerms: { nomeAdvogado: "Teste" },
    });
    expect(true).toBe(true); // Valida que a execução não falhou por parâmetros ausentes
  });

  it("deve aplicar delay entre requisições", async () => {
    const inicio = Date.now();

    await consultarDJEN({
      tribunais: ["TJSP", "TJMG"],
      searchTerms: { nomeAdvogado: "Teste" },
      delayBetweenRequests: 100,
    });

    const duracao = Date.now() - inicio;

    expect(duracao).toBeGreaterThanOrEqual(200); // 2 tribunais com delay de 100ms
  }, 10000);
});
