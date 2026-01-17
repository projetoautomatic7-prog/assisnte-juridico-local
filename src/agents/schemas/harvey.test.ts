import { describe, test, expect } from "vitest";
import {
  HarveyOutputSchema,
  validateAgentOutput,
  StructuredOutputValidationError,
} from "./index";

describe("HarveyOutputSchema", () => {
  test("valida output correto completo", () => {
    const valid = {
      analise_estrategica:
        "Análise completa do caso trabalhista envolvendo horas extras não pagas e assédio moral. O funcionário possui fortes evidências de vínculo empregatício não registrado durante 3 anos, com jornada de 12h/dia sem intervalos adequados.",
      acoes_recomendadas: [
        {
          acao: "Ajuizar Reclamação Trabalhista",
          prazo: "imediato",
          prioridade: "alta",
          fundamentacao: "CLT Art. 7º, XXIX - Prescrição bienal iminente",
        },
        {
          acao: "Reunir provas testemunhais",
          prazo: "curto_prazo",
          prioridade: "alta",
          fundamentacao: "Necessário comprovar vínculo empregatício",
        },
      ],
      riscos_identificados: [
        {
          risco: "Prescrição bienal",
          severidade: "alta",
          probabilidade: "alta",
          mitigacao: "Protocolar petição em até 5 dias úteis",
        },
        {
          risco: "Dificuldade probatória",
          severidade: "media",
          mitigacao:
            "Buscar testemunhas e documentos informais (WhatsApp, emails)",
        },
      ],
      fundamentacao_legal: [
        "CLT Art. 7º, XXIX (Prescrição)",
        "CLT Art. 59 (Horas Extras)",
        "CLT Art. 223-B (Danos Morais)",
      ],
      custo_estimado: {
        minimo: 3000,
        maximo: 8000,
        moeda: "BRL",
        detalhamento: "Custas processuais + honorários advocatícios",
      },
      proximos_passos: [
        "Reunir documentação disponível",
        "Identificar e contactar testemunhas",
        "Elaborar petição inicial",
        "Protocolar no prazo",
      ],
      observacoes_adicionais:
        "Caso com boas chances de êxito dado o conjunto probatório",
    };

    const result = validateAgentOutput(HarveyOutputSchema, valid);
    expect(result).toBeDefined();
    expect(result.acoes_recomendadas).toHaveLength(2);
    expect(result.riscos_identificados).toHaveLength(2);
  });

  test("valida output mínimo sem campos opcionais", () => {
    const minimal = {
      analise_estrategica:
        "Análise estratégica do caso com mais de 100 caracteres conforme exigido pelo schema de validação implementado.",
      acoes_recomendadas: [
        {
          acao: "Ação única",
          prazo: "medio_prazo",
          prioridade: "media",
          fundamentacao: "Fundamento legal básico",
        },
      ],
      riscos_identificados: [],
      fundamentacao_legal: ["Lei XYZ"],
      proximos_passos: ["Próximo passo"],
    };

    expect(() =>
      validateAgentOutput(HarveyOutputSchema, minimal),
    ).not.toThrow();
  });

  test("rejeita output sem análise estratégica", () => {
    const invalid = {
      acoes_recomendadas: [],
      riscos_identificados: [],
      fundamentacao_legal: [],
      proximos_passos: [],
    };

    expect(() => validateAgentOutput(HarveyOutputSchema, invalid)).toThrow(
      StructuredOutputValidationError,
    );
  });

  test("rejeita análise estratégica muito curta", () => {
    const invalid = {
      analise_estrategica: "Muito curto",
      acoes_recomendadas: [
        {
          acao: "Ação",
          prazo: "imediato",
          prioridade: "alta",
          fundamentacao: "Fund",
        },
      ],
      riscos_identificados: [],
      fundamentacao_legal: ["Lei"],
      proximos_passos: ["Passo"],
    };

    expect(() => validateAgentOutput(HarveyOutputSchema, invalid)).toThrow();
  });

  test("rejeita prazo inválido", () => {
    const invalid = {
      analise_estrategica:
        "Análise completa do caso com mais de 100 caracteres para passar na validação mínima do schema.",
      acoes_recomendadas: [
        {
          acao: "Ação",
          prazo: "urgentissimo", // Inválido
          prioridade: "alta",
          fundamentacao: "Fund",
        },
      ],
      riscos_identificados: [],
      fundamentacao_legal: ["Lei"],
      proximos_passos: ["Passo"],
    };

    expect(() => validateAgentOutput(HarveyOutputSchema, invalid)).toThrow();
  });

  test("rejeita custo estimado com moeda diferente de BRL", () => {
    const invalid = {
      analise_estrategica:
        "Análise completa do caso com mais de 100 caracteres para passar na validação mínima do schema.",
      acoes_recomendadas: [
        {
          acao: "Ação",
          prazo: "imediato",
          prioridade: "alta",
          fundamentacao: "Fund",
        },
      ],
      riscos_identificados: [],
      fundamentacao_legal: ["Lei"],
      custo_estimado: {
        minimo: 1000,
        maximo: 5000,
        moeda: "USD", // Deve ser BRL
      },
      proximos_passos: ["Passo"],
    };

    expect(() => validateAgentOutput(HarveyOutputSchema, invalid)).toThrow();
  });

  test("rejeita acoes_recomendadas vazio", () => {
    const invalid = {
      analise_estrategica:
        "Análise completa do caso com mais de 100 caracteres para passar na validação mínima do schema.",
      acoes_recomendadas: [], // Deve ter pelo menos 1
      riscos_identificados: [],
      fundamentacao_legal: ["Lei"],
      proximos_passos: ["Passo"],
    };

    expect(() => validateAgentOutput(HarveyOutputSchema, invalid)).toThrow();
  });

  test("StructuredOutputValidationError tem mensagem amigável", () => {
    const invalid = {
      analise_estrategica: "Curto",
      acoes_recomendadas: [],
      fundamentacao_legal: [],
      proximos_passos: [],
    };

    try {
      validateAgentOutput(HarveyOutputSchema, invalid);
      expect.fail("Deveria ter lançado erro");
    } catch (error) {
      expect(error).toBeInstanceOf(StructuredOutputValidationError);
      const friendlyMsg = (
        error as StructuredOutputValidationError
      ).getFriendlyMessage();
      expect(friendlyMsg).toContain("Erros de validação:");
    }
  });

  test("permite probabilidade opcional em riscos", () => {
    const valid = {
      analise_estrategica:
        "Análise completa do caso com mais de 100 caracteres para passar na validação mínima do schema estabelecido. Este texto garante tamanho suficiente.",
      acoes_recomendadas: [
        {
          acao: "Ação recomendada",
          prazo: "imediato",
          prioridade: "alta",
          fundamentacao: "Fundamentação legal completa",
        },
      ],
      riscos_identificados: [
        {
          risco: "Risco sem probabilidade",
          severidade: "media",
          mitigacao: "Estratégia de mitigação definida",
        },
        {
          risco: "Risco com probabilidade",
          severidade: "alta",
          probabilidade: "baixa",
          mitigacao: "Mitigação com probabilidade",
        },
      ],
      fundamentacao_legal: ["Lei nº 1234/2020"],
      proximos_passos: ["Primeiro passo definido"],
    };

    const result = validateAgentOutput(HarveyOutputSchema, valid);
    expect(result.riscos_identificados).toHaveLength(2);
    expect(result.riscos_identificados[0].probabilidade).toBeUndefined();
    expect(result.riscos_identificados[1].probabilidade).toBe("baixa");
  });
});
