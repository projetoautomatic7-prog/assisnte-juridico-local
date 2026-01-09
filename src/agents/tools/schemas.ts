/**
 * Tool Schemas - Structured Validation for Agent Tools
 *
 * Based on OpenAI Cookbook pattern: "Tool Use Disciplinado"
 * Validates tool inputs/outputs to prevent hallucinations
 *
 * @see docs/ETAPA_2_TOOL_USE_GUIA.md
 */

import { z } from "zod";

// ===========================
// 1. Legal Research Tool
// ===========================

/**
 * Schema para busca de jurisprudência no Qdrant
 * Usado por: PesquisaJurisAgent
 */
export const LegalResearchToolSchema = z.object({
  query: z.string().min(10, "Query deve ter no mínimo 10 caracteres").max(500, "Query muito longa"),
  tribunal: z
    .enum(
      [
        "STF",
        "STJ",
        "TST",
        "TSE",
        "STM",
        "TJSP",
        "TJRJ",
        "TJMG",
        "TJRS",
        "TJPR",
        "TRF1",
        "TRF2",
        "TRF3",
        "TRF4",
        "TRF5",
        "todos",
      ],
      {
        errorMap: () => ({ message: "Tribunal inválido" }),
      }
    )
    .default("todos"),
  data_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)")
    .optional(),
  data_fim: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)")
    .optional(),
  limit: z.number().min(1, "Limite mínimo: 1").max(20, "Limite máximo: 20").default(10),
  relevanceThreshold: z.number().min(0).max(1).default(0.7),
});

export type LegalResearchToolInput = z.infer<typeof LegalResearchToolSchema>;

/**
 * Output da tool de pesquisa jurisprudencial
 */
export const LegalResearchToolOutputSchema = z.object({
  precedentes: z.array(
    z.object({
      numero_processo: z.string(),
      tribunal: z.string(),
      data_julgamento: z.string(),
      ementa: z.string(),
      relevance_score: z.number().min(0).max(1),
    })
  ),
  total_found: z.number().min(0),
  avg_relevance: z.number().min(0).max(1),
  execution_time_ms: z.number().min(0),
});

export type LegalResearchToolOutput = z.infer<typeof LegalResearchToolOutputSchema>;

// ===========================
// 2. DJEN Monitor Tool
// ===========================

/**
 * Schema para monitoramento DJEN
 * Usado por: MonitorDJENAgent
 */
export const DJENMonitorToolSchema = z.object({
  oab_number: z.string().regex(/^[A-Z]{2}\d{6}$/, "Formato OAB inválido (ex: SP123456)"),
  advogado_nome: z.string().min(3, "Nome do advogado muito curto"),
  dias_retroativos: z.number().min(1).max(30, "Máximo 30 dias retroativos").default(7),
  tribunais: z
    .array(z.enum(["STF", "STJ", "TST", "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "todos"]))
    .optional(),
  auto_register: z.boolean().default(false),
});

export type DJENMonitorToolInput = z.infer<typeof DJENMonitorToolSchema>;

/**
 * Output da tool DJEN
 */
export const DJENMonitorToolOutputSchema = z.object({
  publicacoes: z.array(
    z.object({
      numero_processo: z.string(),
      tribunal: z.string(),
      data_publicacao: z.string(),
      tipo_movimento: z.string(),
      conteudo: z.string(),
      urgente: z.boolean(),
      prazo_dias: z.number().optional(),
    })
  ),
  total_publicacoes: z.number().min(0),
  publicacoes_urgentes: z.number().min(0),
  scan_timestamp: z.string(),
});

export type DJENMonitorToolOutput = z.infer<typeof DJENMonitorToolOutputSchema>;

// ===========================
// 3. Document Analysis Tool
// ===========================

/**
 * Schema para análise de documentos com OCR
 * Usado por: AnaliseDocumentalAgent
 */
export const DocumentAnalysisToolSchema = z
  .object({
    document_url: z.string().url("URL do documento inválida").optional(),
    document_text: z.string().min(10, "Texto do documento muito curto").optional(),
    document_type: z.enum(["pdf", "image", "docx", "txt"], {
      errorMap: () => ({ message: "Tipo de documento não suportado" }),
    }),
    extract_entities: z.boolean().default(true),
    extract_clauses: z.boolean().default(true),
    extract_dates: z.boolean().default(true),
    extract_values: z.boolean().default(true),
  })
  .refine((data) => data.document_url || data.document_text, {
    message: "Deve fornecer document_url ou document_text",
  });

export type DocumentAnalysisToolInput = z.infer<typeof DocumentAnalysisToolSchema>;

/**
 * Output da tool de análise documental
 */
export const DocumentAnalysisToolOutputSchema = z.object({
  entities: z.object({
    pessoas: z.array(
      z.object({
        nome: z.string(),
        cpf: z.string().optional(),
        papel: z.string(),
      })
    ),
    empresas: z.array(
      z.object({
        nome: z.string(),
        cnpj: z.string().optional(),
        papel: z.string(),
      })
    ),
  }),
  clausulas: z.array(z.string()).optional(),
  datas: z
    .array(
      z.object({
        data: z.string(),
        descricao: z.string(),
      })
    )
    .optional(),
  valores: z
    .array(
      z.object({
        valor: z.string(),
        descricao: z.string(),
      })
    )
    .optional(),
  resumo: z.string(),
});

export type DocumentAnalysisToolOutput = z.infer<typeof DocumentAnalysisToolOutputSchema>;

// ===========================
// 4. Prazo Calculator Tool
// ===========================

/**
 * Schema para cálculo de prazos processuais
 * Usado por: GestaoPrazosAgent
 */
export const PrazoCalculatorToolSchema = z.object({
  data_inicial: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (use YYYY-MM-DD)"),
  quantidade_dias: z
    .number()
    .min(1, "Quantidade de dias deve ser positiva")
    .max(365, "Máximo 365 dias"),
  tipo_prazo: z.enum(["corridos", "uteis"], {
    errorMap: () => ({ message: "Tipo de prazo deve ser 'corridos' ou 'uteis'" }),
  }),
  comarca: z.string().optional(),
  considerar_feriados: z.boolean().default(true),
});

export type PrazoCalculatorToolInput = z.infer<typeof PrazoCalculatorToolSchema>;

/**
 * Output da tool de cálculo de prazos
 */
export const PrazoCalculatorToolOutputSchema = z.object({
  data_final: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dias_corridos: z.number(),
  dias_uteis: z.number(),
  feriados_considerados: z
    .array(
      z.object({
        data: z.string(),
        nome: z.string(),
      })
    )
    .optional(),
  observacoes: z.array(z.string()).optional(),
});

export type PrazoCalculatorToolOutput = z.infer<typeof PrazoCalculatorToolOutputSchema>;

// ===========================
// 5. Legislation Search Tool
// ===========================

/**
 * Schema para busca de legislação
 * Usado por: ComplianceAgent
 */
export const LegislationSearchToolSchema = z.object({
  query: z.string().min(5, "Query muito curta").max(200, "Query muito longa"),
  tipo: z
    .enum(["lei", "decreto", "portaria", "instrucao_normativa", "resolucao", "todos"], {
      errorMap: () => ({ message: "Tipo de legislação inválido" }),
    })
    .default("todos"),
  ano_inicio: z
    .number()
    .min(1988, "Ano mínimo: 1988 (Constituição)")
    .max(new Date().getFullYear())
    .optional(),
  ano_fim: z.number().min(1988).max(new Date().getFullYear()).optional(),
  orgao_emissor: z.string().optional(),
});

export type LegislationSearchToolInput = z.infer<typeof LegislationSearchToolSchema>;

/**
 * Output da tool de busca de legislação
 */
export const LegislationSearchToolOutputSchema = z.object({
  resultados: z.array(
    z.object({
      numero: z.string(),
      tipo: z.string(),
      ano: z.number(),
      ementa: z.string(),
      data_publicacao: z.string(),
      orgao: z.string(),
      url: z.string().url().optional(),
      relevancia: z.number().min(0).max(1),
    })
  ),
  total_encontrado: z.number().min(0),
  filtros_aplicados: z.record(z.unknown()),
});

export type LegislationSearchToolOutput = z.infer<typeof LegislationSearchToolOutputSchema>;

// ===========================
// Tool Registry
// ===========================

/**
 * Registro de todas as tools com seus schemas
 */
export const TOOL_SCHEMAS = {
  legal_research: LegalResearchToolSchema,
  djen_monitor: DJENMonitorToolSchema,
  document_analysis: DocumentAnalysisToolSchema,
  prazo_calculator: PrazoCalculatorToolSchema,
  legislation_search: LegislationSearchToolSchema,
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;

/**
 * Valida input de uma tool
 * @throws ZodError se validação falhar
 */
export function validateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown
): z.infer<(typeof TOOL_SCHEMAS)[T]> {
  const schema = TOOL_SCHEMAS[toolName];
  return schema.parse(input);
}

/**
 * Valida input de uma tool (versão safe)
 */
export function safeValidateToolInput<T extends ToolName>(
  toolName: T,
  input: unknown
):
  | { success: true; data: z.infer<(typeof TOOL_SCHEMAS)[T]> }
  | { success: false; error: z.ZodError } {
  const schema = TOOL_SCHEMAS[toolName];
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Custom error para tool validation
 */
export class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public field: string,
    message: string,
    public receivedValue?: unknown
  ) {
    super(`[${toolName}] ${field}: ${message}`);
    this.name = "ToolValidationError";
  }

  static fromZodError(toolName: string, error: z.ZodError): ToolValidationError {
    const firstIssue = error.issues[0];
    return new ToolValidationError(
      toolName,
      firstIssue.path.join("."),
      firstIssue.message,
      firstIssue
    );
  }
}
