import { describe, test, expect } from "vitest";
import {
  RedacaoPeticoesOutputSchema,
  PesquisaJurisOutputSchema,
  AnaliseDocumentalOutputSchema,
  MonitorDJENOutputSchema,
  validateAgentOutput,
  StructuredOutputValidationError,
} from "./index";

// ============================================================================
// Redação de Petições
// ============================================================================

describe("RedacaoPeticoesOutputSchema", () => {
  test("valida petição inicial completa", () => {
    const valid = {
      peticao_completa:
        "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DE SÃO PAULO/SP\n\nJOÃO DA SILVA, brasileiro, casado, empresário, portador do CPF nº 123.456.789-00, residente e domiciliado na Rua das Flores, nº 100, São Paulo/SP, por seu advogado que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência, propor AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS E MATERIAIS em face de EMPRESA XYZ LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 12.345.678/0001-90, com sede na Av. Paulista, nº 1000, São Paulo/SP, pelos fatos e fundamentos jurídicos a seguir expostos...",
      tipo_documento: "peticao_inicial",
      partes: {
        requerente: "João da Silva",
        requerido: "Empresa XYZ LTDA",
        advogado: "Dr. Pedro Advogado",
        oab: "SP123456",
      },
      fundamentacao: [
        {
          artigo: "Art. 186",
          lei: "Código Civil",
          aplicacao:
            "Aquele que, por ação ou omissão voluntária, causar dano a outrem, comete ato ilícito",
        },
        {
          artigo: "Art. 927",
          lei: "Código Civil",
          ementa: "STJ - REsp 1234567",
          aplicacao: "Obrigação de indenizar quando há ato ilícito",
        },
      ],
      pedidos: [
        "Seja a presente ação julgada procedente",
        "Condenação da ré ao pagamento de R$ 50.000,00 a título de danos morais",
        "Condenação da ré ao pagamento das custas processuais e honorários advocatícios",
      ],
      valor_causa: 50000,
      documentos_anexos: [
        "Procuração",
        "Documentos pessoais",
        "Comprovante de residência",
        "Provas do dano",
      ],
      formatacao_adequada: true,
      revisao_ortografica: true,
    };

    const result = validateAgentOutput(RedacaoPeticoesOutputSchema, valid);
    expect(result.pedidos).toHaveLength(3);
    expect(result.fundamentacao).toHaveLength(2);
  });

  test("rejeita petição muito curta", () => {
    const invalid = {
      peticao_completa: "Petição muito curta",
      tipo_documento: "peticao_inicial",
      partes: { requerente: "João", requerido: "Maria" },
      fundamentacao: [{ artigo: "Art. 1", lei: "Lei", aplicacao: "Aplicação" }],
      pedidos: ["Pedido 1"],
      documentos_anexos: [],
      formatacao_adequada: true,
      revisao_ortografica: true,
    };

    expect(() => validateAgentOutput(RedacaoPeticoesOutputSchema, invalid)).toThrow();
  });

  test("rejeita pedidos vazios", () => {
    const invalid = {
      peticao_completa:
        "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DE SÃO PAULO/SP\n\nJOÃO DA SILVA, brasileiro, casado, empresário, portador do CPF nº 123.456.789-00, residente e domiciliado na Rua das Flores, nº 100, São Paulo/SP, por seu advogado que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência, propor AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS E MATERIAIS em face de EMPRESA XYZ LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 12.345.678/0001-90, com sede na Av. Paulista, nº 1000, São Paulo/SP, pelos fatos e fundamentos jurídicos a seguir expostos...",
      tipo_documento: "peticao_inicial",
      partes: { requerente: "João", requerido: "Maria" },
      fundamentacao: [{ artigo: "Art. 1", lei: "Lei", aplicacao: "Aplicação" }],
      pedidos: [], // Deve ter pelo menos 1
      documentos_anexos: [],
      formatacao_adequada: true,
      revisao_ortografica: true,
    };

    expect(() => validateAgentOutput(RedacaoPeticoesOutputSchema, invalid)).toThrow();
  });
});

// ============================================================================
// Pesquisa Jurisprudencial
// ============================================================================

describe("PesquisaJurisOutputSchema", () => {
  test("valida pesquisa com resultados", () => {
    const valid = {
      consulta_realizada: "danos morais consumidor",
      resultados: [
        {
          ementa: "CONSUMIDOR. DANOS MORAIS. FALHA NA PRESTAÇÃO DE SERVIÇO. DEVER DE INDENIZAR.",
          numero_processo: "1234567-89.2020.8.26.0100",
          tribunal: "TJSP",
          data_julgamento: "2023-05-15",
          relator: "Des. João Silva",
          relevancia: 0.95,
          dispositivo: "Recurso provido",
          tese_firmada: "Caracterizado dano moral in re ipsa",
        },
        {
          ementa: "CDC. DANO MORAL. INSCRIÇÃO INDEVIDA.",
          numero_processo: "9876543-21.2021.4.03.6100",
          tribunal: "TRF3",
          relevancia: 0.87,
        },
      ],
      analise_consolidada:
        "A jurisprudência consolidada dos tribunais superiores e tribunais de justiça estaduais é pacífica no sentido de reconhecer o dano moral in re ipsa em casos de falha na prestação de serviço que causem transtornos significativos ao consumidor.",
      tendencia_jurisprudencial: "favoravel",
      precedentes_vinculantes: [
        {
          tipo: "sumula_vinculante",
          numero: "54",
          enunciado:
            "Dano moral configurado em caso de inscrição indevida em cadastros de inadimplentes",
        },
      ],
      recomendacao_uso:
        "Utilizar os julgados do TJSP e TRF3 como fundamento para o pedido de indenização por danos morais, destacando a tendência favorável dos tribunais",
    };

    const result = validateAgentOutput(PesquisaJurisOutputSchema, valid);
    expect(result.resultados).toHaveLength(2);
    expect(result.tendencia_jurisprudencial).toBe("favoravel");
  });

  test("valida pesquisa sem resultados", () => {
    const valid = {
      consulta_realizada: "tema muito específico sem precedentes",
      resultados: [],
      analise_consolidada:
        "Não foram encontrados precedentes jurisprudenciais sobre o tema específico pesquisado. Recomenda-se argumentação baseada em princípios gerais do direito e legislação aplicável.",
      tendencia_jurisprudencial: "sem_precedentes",
      recomendacao_uso:
        "Na ausência de jurisprudência específica, fundamentar o pedido em princípios constitucionais e legislação pertinente",
    };

    expect(() => validateAgentOutput(PesquisaJurisOutputSchema, valid)).not.toThrow();
  });

  test("rejeita relevância fora do range", () => {
    const invalid = {
      consulta_realizada: "busca",
      resultados: [
        {
          ementa: "Ementa",
          numero_processo: "123",
          tribunal: "STJ",
          relevancia: 1.5, // Deve estar entre 0 e 1
        },
      ],
      analise_consolidada:
        "Análise completa com mais de 100 caracteres para passar na validação mínima do schema estabelecido.",
      tendencia_jurisprudencial: "favoravel",
      recomendacao_uso: "Recomendação",
    };

    expect(() => validateAgentOutput(PesquisaJurisOutputSchema, invalid)).toThrow();
  });
});

// ============================================================================
// Análise Documental
// ============================================================================

describe("AnaliseDocumentalOutputSchema", () => {
  test("valida análise de contrato", () => {
    const valid = {
      resumo_executivo:
        "Contrato de prestação de serviços entre as partes CONTRATANTE LTDA e CONTRATADA SA, com vigência de 12 meses, valor mensal de R$ 10.000,00, com cláusulas de rescisão e multas previstas.",
      tipo_documento: "contrato",
      entidades_extraidas: {
        pessoas: [
          {
            nome: "João Silva",
            cpf: "12345678901",
            papel: "Representante Legal CONTRATANTE",
          },
        ],
        empresas: [
          {
            razao_social: "CONTRATANTE LTDA",
            cnpj: "12345678000190",
            papel: "Contratante",
          },
          {
            razao_social: "CONTRATADA SA",
            cnpj: "98765432000110",
            papel: "Contratada",
          },
        ],
        datas_importantes: [
          {
            data: "2024-01-15",
            evento: "Assinatura do contrato",
          },
          {
            data: "2025-01-15",
            evento: "Término do contrato",
          },
        ],
        valores_monetarios: [
          {
            valor: 10000,
            moeda: "BRL",
            descricao: "Valor mensal de prestação de serviços",
          },
        ],
      },
      clausulas_criticas: [
        {
          clausula: "Cláusula 5ª - Rescisão",
          localizacao: "Cláusula 5ª",
          tipo: "risco_medio",
          observacao: "Multa rescisória de 3 meses pode ser alta para o contratante",
        },
      ],
      conformidade_legal: {
        status: "requer_ajustes",
        violacoes: [],
        recomendacoes: [
          "Incluir cláusula de mediação antes de arbitragem",
          "Especificar foro de eleição",
        ],
      },
      documentos_faltantes: ["Anexo I - Escopo de serviços detalhado"],
      pontos_atencao: ["Valor da multa rescisória", "Ausência de SLA definido"],
      proxima_acao: "Solicitar revisão das cláusulas 5ª e 8ª antes da assinatura",
    };

    const result = validateAgentOutput(AnaliseDocumentalOutputSchema, valid);
    expect(result.entidades_extraidas.empresas).toHaveLength(2);
    expect(result.conformidade_legal.status).toBe("requer_ajustes");
  });

  test("rejeita CPF inválido", () => {
    const invalid = {
      resumo_executivo:
        "Resumo executivo do documento analisado com mais de 100 caracteres para passar na validação mínima.",
      tipo_documento: "contrato",
      entidades_extraidas: {
        pessoas: [
          {
            nome: "João Silva",
            cpf: "123", // Deve ter 11 dígitos
            papel: "Representante",
          },
        ],
        empresas: [],
        datas_importantes: [],
        valores_monetarios: [],
      },
      clausulas_criticas: [],
      conformidade_legal: {
        status: "conforme",
        violacoes: [],
        recomendacoes: [],
      },
      documentos_faltantes: [],
      pontos_atencao: [],
      proxima_acao: "Ação sugerida",
    };

    expect(() => validateAgentOutput(AnaliseDocumentalOutputSchema, invalid)).toThrow();
  });
});

// ============================================================================
// Monitor DJEN
// ============================================================================

describe("MonitorDJENOutputSchema", () => {
  test("valida consulta DJEN com publicações", () => {
    const valid = {
      consulta_info: {
        oab: "SP123456",
        advogado: "Dr. Pedro Advogado",
        data_consulta: "2024-01-15T10:30:00",
        periodo_consultado: 7,
      },
      publicacoes: [
        {
          processo_numero: "1234567-89.2020.8.26.0100",
          data_publicacao: "2024-01-14",
          tipo_documento: "Intimação",
          conteudo_resumido:
            "Intimação para manifestação sobre documentos juntados pela parte contrária",
          prazo_fatal: "2024-01-29",
          dias_uteis_restantes: 10,
          urgente: false,
          tribunal: "TJSP",
        },
        {
          processo_numero: "9876543-21.2021.4.03.6100",
          data_publicacao: "2024-01-13",
          tipo_documento: "Sentença",
          conteudo_resumido: "Sentença de procedência do pedido",
          urgente: false,
          tribunal: "TRF3",
        },
      ],
      resumo: {
        total_publicacoes: 2,
        publicacoes_urgentes: 0,
        proximos_prazos: [
          {
            processo: "1234567-89.2020.8.26.0100",
            prazo: "2024-01-29",
            dias_restantes: 10,
          },
        ],
      },
      alertas: ["Processo 1234567: prazo de manifestação em 10 dias úteis"],
      proxima_consulta_sugerida: "2024-01-16 (diária recomendada)",
    };

    const result = validateAgentOutput(MonitorDJENOutputSchema, valid);
    expect(result.publicacoes).toHaveLength(2);
    expect(result.resumo.total_publicacoes).toBe(2);
  });

  test("rejeita OAB inválido", () => {
    const invalid = {
      consulta_info: {
        oab: "123456", // Deve estar no formato UU123456
        advogado: "Dr. Pedro",
        data_consulta: "2024-01-15T10:30:00",
        periodo_consultado: 7,
      },
      publicacoes: [],
      resumo: {
        total_publicacoes: 0,
        publicacoes_urgentes: 0,
        proximos_prazos: [],
      },
      alertas: [],
      proxima_consulta_sugerida: "Amanhã",
    };

    expect(() => validateAgentOutput(MonitorDJENOutputSchema, invalid)).toThrow();
  });

  test("valida consulta sem publicações", () => {
    const valid = {
      consulta_info: {
        oab: "MG184404",
        advogado: "Thiago Bodevan Veiga",
        data_consulta: "2024-01-15T10:30:00",
        periodo_consultado: 7,
      },
      publicacoes: [],
      resumo: {
        total_publicacoes: 0,
        publicacoes_urgentes: 0,
        proximos_prazos: [],
      },
      alertas: ["Nenhuma publicação encontrada no período"],
      proxima_consulta_sugerida: "2024-01-16 às 10:00",
    };

    expect(() => validateAgentOutput(MonitorDJENOutputSchema, valid)).not.toThrow();
  });
});
