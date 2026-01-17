/**
 * Tool Schemas Tests
 * Testa validação de inputs/outputs das ferramentas
 */

import { describe, test, expect } from "vitest";
import {
  LegalResearchToolSchema,
  DJENMonitorToolSchema,
  DocumentAnalysisToolSchema,
  PrazoCalculatorToolSchema,
  LegislationSearchToolSchema,
  validateToolInput,
  safeValidateToolInput,
  ToolValidationError,
} from "../schemas";

describe("Legal Research Tool Schema", () => {
  test("valida input correto", () => {
    const valid = {
      query: "danos morais consumidor inadimplência",
      tribunal: "TJSP",
      limit: 10,
    };

    expect(() => LegalResearchToolSchema.parse(valid)).not.toThrow();
  });

  test("usa defaults corretos", () => {
    const input = {
      query: "usucapião urbano prescrição aquisitiva",
    };

    const result = LegalResearchToolSchema.parse(input);
    expect(result.tribunal).toBe("todos");
    expect(result.limit).toBe(10);
    expect(result.relevanceThreshold).toBe(0.7);
  });

  test("rejeita query muito curta", () => {
    const invalid = {
      query: "curta", // menos de 10 caracteres
      tribunal: "STF",
    };

    expect(() => LegalResearchToolSchema.parse(invalid)).toThrow();
  });

  test("rejeita tribunal inválido", () => {
    const invalid = {
      query: "teste de query com mais de 10 caracteres",
      tribunal: "TRIBUNAL_INEXISTENTE",
    };

    expect(() => LegalResearchToolSchema.parse(invalid)).toThrow();
  });

  test("valida formato de data", () => {
    const valid = {
      query: "ação de despejo locação comercial",
      data_inicio: "2024-01-01",
      data_fim: "2024-12-31",
    };

    expect(() => LegalResearchToolSchema.parse(valid)).not.toThrow();
  });

  test("rejeita formato de data inválido", () => {
    const invalid = {
      query: "teste query com mais de dez caracteres",
      data_inicio: "01/01/2024", // formato errado
    };

    expect(() => LegalResearchToolSchema.parse(invalid)).toThrow();
  });
});

describe("DJEN Monitor Tool Schema", () => {
  test("valida input correto", () => {
    const valid = {
      oab_number: "SP123456",
      advogado_nome: "Dr. Pedro Silva",
      dias_retroativos: 7,
    };

    expect(() => DJENMonitorToolSchema.parse(valid)).not.toThrow();
  });

  test("usa defaults corretos", () => {
    const input = {
      oab_number: "MG184404",
      advogado_nome: "Dra. Maria Santos",
    };

    const result = DJENMonitorToolSchema.parse(input);
    expect(result.dias_retroativos).toBe(7);
    expect(result.auto_register).toBe(false);
  });

  test("rejeita formato OAB inválido", () => {
    const invalid = {
      oab_number: "123456", // falta UF
      advogado_nome: "Dr. João",
      dias_retroativos: 7,
    };

    expect(() => DJENMonitorToolSchema.parse(invalid)).toThrow(
      /Formato OAB inválido/,
    );
  });

  test("rejeita OAB com UF minúscula", () => {
    const invalid = {
      oab_number: "sp123456", // UF deve ser maiúscula
      advogado_nome: "Dr. João",
    };

    expect(() => DJENMonitorToolSchema.parse(invalid)).toThrow();
  });

  test("limita dias retroativos", () => {
    const invalid = {
      oab_number: "RJ987654",
      advogado_nome: "Dra. Ana",
      dias_retroativos: 50, // máximo 30
    };

    expect(() => DJENMonitorToolSchema.parse(invalid)).toThrow();
  });
});

describe("Document Analysis Tool Schema", () => {
  test("valida com document_url", () => {
    const valid = {
      document_url: "https://example.com/contrato.pdf",
      document_type: "pdf",
    };

    expect(() => DocumentAnalysisToolSchema.parse(valid)).not.toThrow();
  });

  test("valida com document_text", () => {
    const valid = {
      document_text: "Este é um contrato de prestação de serviços entre...",
      document_type: "txt",
    };

    expect(() => DocumentAnalysisToolSchema.parse(valid)).not.toThrow();
  });

  test("rejeita sem document_url nem document_text", () => {
    const invalid = {
      document_type: "pdf",
    };

    expect(() => DocumentAnalysisToolSchema.parse(invalid)).toThrow(
      /Deve fornecer document_url ou document_text/,
    );
  });

  test("usa defaults para flags de extração", () => {
    const input = {
      document_text: "Contrato de locação com várias cláusulas importantes",
      document_type: "txt",
    };

    const result = DocumentAnalysisToolSchema.parse(input);
    expect(result.extract_entities).toBe(true);
    expect(result.extract_clauses).toBe(true);
    expect(result.extract_dates).toBe(true);
    expect(result.extract_values).toBe(true);
  });

  test("rejeita tipo de documento inválido", () => {
    const invalid = {
      document_text: "Texto qualquer para análise",
      document_type: "exe", // tipo não suportado
    };

    expect(() => DocumentAnalysisToolSchema.parse(invalid)).toThrow();
  });

  test("rejeita URL inválida", () => {
    const invalid = {
      document_url: "not-a-valid-url",
      document_type: "pdf",
    };

    expect(() => DocumentAnalysisToolSchema.parse(invalid)).toThrow();
  });
});

describe("Prazo Calculator Tool Schema", () => {
  test("valida input correto", () => {
    const valid = {
      data_inicial: "2024-01-15",
      quantidade_dias: 15,
      tipo_prazo: "uteis",
    };

    expect(() => PrazoCalculatorToolSchema.parse(valid)).not.toThrow();
  });

  test("usa default para considerar_feriados", () => {
    const input = {
      data_inicial: "2024-01-01",
      quantidade_dias: 10,
      tipo_prazo: "corridos",
    };

    const result = PrazoCalculatorToolSchema.parse(input);
    expect(result.considerar_feriados).toBe(true);
  });

  test("rejeita formato de data inválido", () => {
    const invalid = {
      data_inicial: "15/01/2024", // formato errado
      quantidade_dias: 10,
      tipo_prazo: "uteis",
    };

    expect(() => PrazoCalculatorToolSchema.parse(invalid)).toThrow();
  });

  test("rejeita quantidade de dias zero", () => {
    const invalid = {
      data_inicial: "2024-01-01",
      quantidade_dias: 0,
      tipo_prazo: "corridos",
    };

    expect(() => PrazoCalculatorToolSchema.parse(invalid)).toThrow();
  });

  test("rejeita quantidade de dias excessiva", () => {
    const invalid = {
      data_inicial: "2024-01-01",
      quantidade_dias: 400, // máximo 365
      tipo_prazo: "uteis",
    };

    expect(() => PrazoCalculatorToolSchema.parse(invalid)).toThrow();
  });

  test("rejeita tipo de prazo inválido", () => {
    const invalid = {
      data_inicial: "2024-01-01",
      quantidade_dias: 10,
      tipo_prazo: "calendarios", // deve ser 'corridos' ou 'uteis'
    };

    expect(() => PrazoCalculatorToolSchema.parse(invalid)).toThrow();
  });
});

describe("Legislation Search Tool Schema", () => {
  test("valida input correto", () => {
    const valid = {
      query: "código civil",
      tipo: "lei",
      ano_inicio: 2002,
    };

    expect(() => LegislationSearchToolSchema.parse(valid)).not.toThrow();
  });

  test("usa default para tipo", () => {
    const input = {
      query: "direitos trabalhistas",
    };

    const result = LegislationSearchToolSchema.parse(input);
    expect(result.tipo).toBe("todos");
  });

  test("rejeita query muito curta", () => {
    const invalid = {
      query: "lei", // menos de 5 caracteres
    };

    expect(() => LegislationSearchToolSchema.parse(invalid)).toThrow();
  });

  test("limita ano mínimo a 1988", () => {
    const invalid = {
      query: "legislação antiga",
      ano_inicio: 1950, // antes da Constituição de 1988
    };

    expect(() => LegislationSearchToolSchema.parse(invalid)).toThrow();
  });

  test("limita ano máximo ao ano atual", () => {
    const invalid = {
      query: "legislação futura",
      ano_inicio: 2050, // ano no futuro
    };

    expect(() => LegislationSearchToolSchema.parse(invalid)).toThrow();
  });
});

describe("Tool Validation Helpers", () => {
  test("validateToolInput valida input correto", () => {
    const input = {
      query: "responsabilidade civil médica",
      tribunal: "STJ",
    };

    expect(() => validateToolInput("legal_research", input)).not.toThrow();
  });

  test("validateToolInput lança erro em input inválido", () => {
    const invalid = {
      query: "x", // muito curto
    };

    expect(() => validateToolInput("legal_research", invalid)).toThrow();
  });

  test("safeValidateToolInput retorna success=true para input válido", () => {
    const input = {
      oab_number: "SP123456",
      advogado_nome: "Dr. Pedro",
    };

    const result = safeValidateToolInput("djen_monitor", input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.oab_number).toBe("SP123456");
    }
  });

  test("safeValidateToolInput retorna success=false para input inválido", () => {
    const invalid = {
      oab_number: "INVALID",
      advogado_nome: "Dr. Pedro",
    };

    const result = safeValidateToolInput("djen_monitor", invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
    }
  });

  test("ToolValidationError cria erro customizado", () => {
    const error = new ToolValidationError(
      "legal_research",
      "query",
      "Query muito curta",
      "x",
    );

    expect(error.toolName).toBe("legal_research");
    expect(error.field).toBe("query");
    expect(error.message).toContain("Query muito curta");
    expect(error.name).toBe("ToolValidationError");
  });
});
