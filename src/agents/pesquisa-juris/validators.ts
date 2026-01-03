/**
 * Validação de inputs para o agente Pesquisa Jurisprudencial
 * Baseado no padrão Google Agent Starter Pack
 */

export interface PesquisaJurisInput {
  tema: string;
  tribunal?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  relevanceThreshold?: number;
}

const TRIBUNAIS_VALIDOS = ["STF", "STJ", "TST", "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "todos"] as const;
type TribunalValido = typeof TRIBUNAIS_VALIDOS[number];

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public receivedValue: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Valida os inputs para pesquisa jurisprudencial
 * 
 * @param data - Dados recebidos do usuário
 * @returns Inputs validados e normalizados
 * @throws {ValidationError} Se validação falhar
 * 
 * @example
 * ```typescript
 * const validated = validatePesquisaInput({
 *   tema: "direito à greve",
 *   tribunal: "STF"
 * });
 * // { tema: "direito à greve", tribunal: "STF", dataInicio: "2020-01-01", ... }
 * ```
 */
export function validatePesquisaInput(data: Record<string, unknown>): PesquisaJurisInput {
  // Validar tema (obrigatório)
  const tema = data.tema;

  if (!tema) {
    throw new ValidationError(
      "Campo 'tema' é obrigatório",
      "tema",
      tema
    );
  }

  if (typeof tema !== "string") {
    throw new ValidationError(
      "Campo 'tema' deve ser uma string",
      "tema",
      tema
    );
  }

  if (tema.length < 3) {
    throw new ValidationError(
      "Campo 'tema' deve ter pelo menos 3 caracteres",
      "tema",
      tema
    );
  }

  if (tema.length > 500) {
    throw new ValidationError(
      "Campo 'tema' não pode exceder 500 caracteres (recebido: " + tema.length + ")",
      "tema",
      tema
    );
  }

  // Validar tribunal (opcional)
  const tribunal = data.tribunal as string | undefined;
  if (tribunal && !TRIBUNAIS_VALIDOS.includes(tribunal as TribunalValido)) {
    throw new ValidationError(
      `Tribunal inválido: '${tribunal}'. Valores aceitos: ${TRIBUNAIS_VALIDOS.join(", ")}`,
      "tribunal",
      tribunal
    );
  }

  // Validar dataInicio (opcional)
  const dataInicio = data.dataInicio as string | undefined;
  if (dataInicio && !isValidDate(dataInicio)) {
    throw new ValidationError(
      `Data inválida: '${dataInicio}'. Use formato YYYY-MM-DD`,
      "dataInicio",
      dataInicio
    );
  }

  // Validar dataFim (opcional)
  const dataFim = data.dataFim as string | undefined;
  if (dataFim && !isValidDate(dataFim)) {
    throw new ValidationError(
      `Data inválida: '${dataFim}'. Use formato YYYY-MM-DD`,
      "dataFim",
      dataFim
    );
  }

  // Validar intervalo de datas
  if (dataInicio && dataFim && new Date(dataInicio) > new Date(dataFim)) {
    throw new ValidationError(
      `dataInicio (${dataInicio}) não pode ser posterior a dataFim (${dataFim})`,
      "dataInicio",
      { dataInicio, dataFim }
    );
  }

  // Validar limit (opcional)
  const limit = data.limit as number | undefined;
  if (limit !== undefined) {
    if (typeof limit !== "number" || !Number.isInteger(limit)) {
      throw new ValidationError(
        "Campo 'limit' deve ser um número inteiro",
        "limit",
        limit
      );
    }

    if (limit < 1) {
      throw new ValidationError(
        "Campo 'limit' deve ser maior que 0",
        "limit",
        limit
      );
    }

    if (limit > 50) {
      throw new ValidationError(
        "Campo 'limit' não pode exceder 50 (performance)",
        "limit",
        limit
      );
    }
  }

  // Validar relevanceThreshold (opcional)
  const relevanceThreshold = data.relevanceThreshold as number | undefined;
  if (relevanceThreshold !== undefined) {
    if (typeof relevanceThreshold !== "number") {
      throw new ValidationError(
        "Campo 'relevanceThreshold' deve ser um número",
        "relevanceThreshold",
        relevanceThreshold
      );
    }

    if (relevanceThreshold < 0 || relevanceThreshold > 1) {
      throw new ValidationError(
        "Campo 'relevanceThreshold' deve estar entre 0 e 1",
        "relevanceThreshold",
        relevanceThreshold
      );
    }
  }

  // Retornar inputs validados com defaults
  return {
    tema,
    tribunal: tribunal || "todos",
    dataInicio: dataInicio || getDefaultStartDate(),
    dataFim: dataFim || getCurrentDate(),
    limit: limit ? Math.min(limit, 50) : 10,
    relevanceThreshold: relevanceThreshold ?? 0.7,
  };
}

/**
 * Valida formato de data YYYY-MM-DD
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Retorna data padrão de início (5 anos atrás)
 */
function getDefaultStartDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 5);
  return date.toISOString().split("T")[0];
}

/**
 * Retorna data atual no formato YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}
