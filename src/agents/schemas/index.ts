/**
 * Structured Output Schemas para Agentes Jurídicos
 *
 * Implementação baseada no OpenAI Cookbook:
 * - examples/Structured_outputs_multi_agent.ipynb
 * - Garante outputs previsíveis e parseáveis
 * - Validação automática com Zod
 *
 * @see docs/PLANO_COOKBOOK_AGENTES_PERFEITOS.md
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS PRINCIPAIS DOS AGENTES
// ============================================================================

// ----------------------------------------------------------------------------
// Harvey Specter - Estratégia Jurídica
// ----------------------------------------------------------------------------

export const HarveyOutputSchema = z.object({
  analise_estrategica: z
    .string()
    .min(100)
    .describe("Análise estratégica completa do caso jurídico"),

  acoes_recomendadas: z
    .array(
      z.object({
        acao: z.string().describe("Descrição da ação recomendada"),
        prazo: z.enum(["imediato", "curto_prazo", "medio_prazo", "longo_prazo"]),
        prioridade: z.enum(["alta", "media", "baixa"]),
        fundamentacao: z.string().describe("Justificativa legal/estratégica"),
      })
    )
    .min(1)
    .describe("Lista de ações estratégicas"),

  riscos_identificados: z
    .array(
      z.object({
        risco: z.string().describe("Descrição do risco"),
        severidade: z.enum(["alta", "media", "baixa"]),
        probabilidade: z.enum(["alta", "media", "baixa"]).optional(),
        mitigacao: z.string().describe("Estratégia de mitigação"),
      })
    )
    .describe("Riscos do caso"),

  prazo_processual: z.string().optional().describe("Prazo crítico se houver"),

  fundamentacao_legal: z.array(z.string()).min(1).describe("Base legal da estratégia"),

  custo_estimado: z
    .object({
      minimo: z.number().positive(),
      maximo: z.number().positive(),
      moeda: z.literal("BRL"),
      detalhamento: z.string().optional(),
    })
    .optional()
    .describe("Estimativa de custos"),

  proximos_passos: z.array(z.string()).min(1).describe("Checklist de próximas ações"),

  observacoes_adicionais: z.string().optional(),
});

export type HarveyOutput = z.infer<typeof HarveyOutputSchema>;

// ============================================================================
// UTILITIES E VALIDADORES
// ============================================================================

/**
 * Valida e parseia output estruturado de um agente
 */
export function validateAgentOutput<T extends z.ZodType>(schema: T, output: unknown): z.infer<T> {
  try {
    return schema.parse(output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Validation Error:", JSON.stringify(error.errors, null, 2));
      throw new StructuredOutputValidationError(
        "Falha na validação do output estruturado",
        error.errors
      );
    }
    throw error;
  }
}

/**
 * Tenta parsear output com fallback
 */
export function safeParseAgentOutput<T extends z.ZodType>(
  schema: T,
  output: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(output);
  return result;
}

/**
 * Erro customizado para falhas de validação
 */
export class StructuredOutputValidationError extends Error {
  constructor(
    message: string,
    public validationErrors: z.ZodIssue[]
  ) {
    super(message);
    this.name = "StructuredOutputValidationError";
  }

  /**
   * Retorna mensagem amigável dos erros
   */
  getFriendlyMessage(): string {
    const errors = this.validationErrors.map((err) => {
      const path = err.path.join(".");
      return "• " + path + ": " + err.message;
    });
    return "Erros de validação:\n" + errors.join("\n");
  }
}

// ----------------------------------------------------------------------------
// Redação de Petições
// ----------------------------------------------------------------------------

export const RedacaoPeticoesOutputSchema = z.object({
  peticao_completa: z.string().min(500).describe("Petição formatada e completa em Markdown"),

  tipo_documento: z.enum([
    "peticao_inicial",
    "contestacao",
    "replica",
    "apelacao",
    "agravo",
    "recurso_especial",
    "recurso_extraordinario",
    "embargos_declaracao",
    "peticao_intermediaria",
    "requerimento",
  ]),

  partes: z.object({
    requerente: z.string(),
    requerido: z.string(),
    advogado: z.string().optional(),
    oab: z.string().optional(),
  }),

  fundamentacao: z
    .array(
      z.object({
        artigo: z.string().describe("Ex: Art. 927"),
        lei: z.string().describe("Ex: Código Civil"),
        ementa: z.string().optional().describe("Jurisprudência se houver"),
        aplicacao: z.string().describe("Como se aplica ao caso"),
      })
    )
    .min(1),

  pedidos: z.array(z.string()).min(1).describe("Pedidos finais da petição"),

  valor_causa: z.number().positive().optional(),

  documentos_anexos: z.array(z.string()).describe("Lista de documentos a anexar"),

  formatacao_adequada: z.boolean().describe("Verificação de formatação"),

  revisao_ortografica: z.boolean().describe("Texto está revisado"),
});

export type RedacaoPeticoesOutput = z.infer<typeof RedacaoPeticoesOutputSchema>;

// ----------------------------------------------------------------------------
// Pesquisa Jurisprudencial
// ----------------------------------------------------------------------------

export const PesquisaJurisOutputSchema = z.object({
  consulta_realizada: z.string().describe("Query de busca executada"),

  resultados: z
    .array(
      z.object({
        ementa: z.string().describe("Ementa do julgado"),
        numero_processo: z.string(),
        tribunal: z.string().describe("Ex: STJ, TJSP"),
        data_julgamento: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        relator: z.string().optional(),
        relevancia: z.number().min(0).max(1).describe("Score de similaridade"),
        dispositivo: z.string().optional().describe("Parte dispositiva"),
        tese_firmada: z.string().optional(),
        link: z.string().url().optional(),
      })
    )
    .min(0)
    .max(20)
    .describe("Jurisprudências encontradas"),

  analise_consolidada: z.string().min(100).describe("Análise dos julgados encontrados"),

  tendencia_jurisprudencial: z
    .enum(["favoravel", "desfavoravel", "dividida", "sem_precedentes"])
    .describe("Tendência geral dos tribunais"),

  precedentes_vinculantes: z
    .array(
      z.object({
        tipo: z.enum(["sumula_vinculante", "tema_repercussao_geral", "tema_recursos_repetitivos"]),
        numero: z.string(),
        enunciado: z.string(),
      })
    )
    .optional(),

  recomendacao_uso: z.string().describe("Como usar essas jurisprudências no caso"),
});

export type PesquisaJurisOutput = z.infer<typeof PesquisaJurisOutputSchema>;

// ----------------------------------------------------------------------------
// Análise Documental
// ----------------------------------------------------------------------------

export const AnaliseDocumentalOutputSchema = z.object({
  resumo_executivo: z.string().min(100).describe("Resumo do documento analisado"),

  tipo_documento: z.enum([
    "contrato",
    "peticao",
    "sentenca",
    "acordao",
    "procuracao",
    "escritura",
    "outro",
  ]),

  entidades_extraidas: z.object({
    pessoas: z.array(
      z.object({
        nome: z.string(),
        cpf: z
          .string()
          .regex(/^\d{11}$/)
          .optional(),
        papel: z.string().describe("Ex: Contratante, Testemunha"),
      })
    ),
    empresas: z.array(
      z.object({
        razao_social: z.string(),
        cnpj: z
          .string()
          .regex(/^\d{14}$/)
          .optional(),
        papel: z.string().optional(),
      })
    ),
    datas_importantes: z.array(
      z.object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        evento: z.string().describe("Ex: Assinatura, Vencimento"),
      })
    ),
    valores_monetarios: z.array(
      z.object({
        valor: z.number(),
        moeda: z.string().default("BRL"),
        descricao: z.string(),
      })
    ),
    processos_citados: z
      .array(
        z.object({
          numero: z.string(),
          tribunal: z.string().optional(),
        })
      )
      .optional(),
  }),

  clausulas_criticas: z.array(
    z.object({
      clausula: z.string(),
      localizacao: z.string().describe("Ex: Cláusula 5ª"),
      tipo: z.enum(["risco_alto", "risco_medio", "risco_baixo", "favoravel", "neutro"]),
      observacao: z.string(),
    })
  ),

  conformidade_legal: z.object({
    status: z.enum(["conforme", "nao_conforme", "requer_ajustes"]),
    violacoes: z.array(z.string()).describe("Violações detectadas"),
    recomendacoes: z.array(z.string()).describe("Ajustes sugeridos"),
  }),

  documentos_faltantes: z.array(z.string()).describe("Documentos que deveriam estar presentes"),

  pontos_atencao: z.array(z.string()).describe("Itens que merecem atenção especial"),

  proxima_acao: z.string().describe("O que fazer com este documento"),
});

export type AnaliseDocumentalOutput = z.infer<typeof AnaliseDocumentalOutputSchema>;

// ----------------------------------------------------------------------------
// Monitor DJEN
// ----------------------------------------------------------------------------

export const MonitorDJENOutputSchema = z.object({
  consulta_info: z.object({
    oab: z.string().regex(/^[A-Z]{2}\d{6}$/),
    advogado: z.string(),
    data_consulta: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
    periodo_consultado: z.number().describe("Dias retroativos"),
  }),

  publicacoes: z
    .array(
      z.object({
        processo_numero: z.string(),
        processo_link: z.string().url().optional(),
        data_publicacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        tipo_documento: z.string().describe("Ex: Intimação, Citação, Sentença"),
        conteudo_resumido: z.string(),
        prazo_fatal: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        dias_uteis_restantes: z.number().optional(),
        urgente: z.boolean().describe("Se prazo <= 5 dias úteis"),
        tribunal: z.string().optional(),
      })
    )
    .describe("Publicações encontradas"),

  resumo: z.object({
    total_publicacoes: z.number(),
    publicacoes_urgentes: z.number(),
    proximos_prazos: z.array(
      z.object({
        processo: z.string(),
        prazo: z.string(),
        dias_restantes: z.number(),
      })
    ),
  }),

  alertas: z.array(z.string()).describe("Avisos importantes"),

  proxima_consulta_sugerida: z.string().describe("Quando consultar novamente"),
});

export type MonitorDJENOutput = z.infer<typeof MonitorDJENOutputSchema>;

// ============================================================================
// EXPORTS CONSOLIDADOS
// ============================================================================

export const AGENT_SCHEMAS = {
  harvey: HarveyOutputSchema,
  redacao_peticoes: RedacaoPeticoesOutputSchema,
  pesquisa_juris: PesquisaJurisOutputSchema,
  analise_documental: AnaliseDocumentalOutputSchema,
  monitor_djen: MonitorDJENOutputSchema,
} as const;

export type AgentSchemaType = keyof typeof AGENT_SCHEMAS;

/**
 * Obtém schema de um agente pelo ID
 */
export function getAgentSchema(agentId: string): z.ZodType | undefined {
  const normalizedId = agentId.replace(/-/g, "_") as AgentSchemaType;
  return AGENT_SCHEMAS[normalizedId];
}

/**
 * Parse structured output com validação
 * Usado pelos agentes para processar respostas da LLM
 */
export function parseStructuredOutput<T extends z.ZodType>(
  schema: T,
  rawOutput: string | object
): z.infer<T> {
  try {
    // Se for string, tenta parsear como JSON
    const parsed = typeof rawOutput === "string" ? JSON.parse(rawOutput) : rawOutput;

    // Valida com o schema
    return validateAgentOutput(schema, parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Falha ao parsear JSON: ${error.message}`);
    }
    throw error;
  }
}
