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

const TRIBUNAIS_VALIDOS = ["STF", "STJ", "TST", "todos"] as const;

export function validatePesquisaInput(data: Record<string, unknown>): PesquisaJurisInput {
  // Validar tema (obrigatório)
  const tema = data.tema as string | undefined;
  if (!tema) {
    throw new ValidationError("Campo 'tema' é obrigatório", "tema", tema);
  }

  if (typeof tema !== "string") {
    throw new ValidationError("Campo 'tema' deve ser uma string", "tema", tema);
  }

  if (tema.length < 3 || tema.length > 500) {
    throw new ValidationError("Campo 'tema' deve ter entre 3 e 500 caracteres", "tema", tema);
  }

  // Validar tribunal (opcional)
  const tribunal = (data.tribunal as string) || "todos";
  if (!TRIBUNAIS_VALIDOS.includes(tribunal as (typeof TRIBUNAIS_VALIDOS)[number])) {
    throw new ValidationError(
      `Campo 'tribunal' deve ser: ${TRIBUNAIS_VALIDOS.join(", ")}`,
      "tribunal",
      tribunal
    );
  }

  // Validar datas (opcional)
  const dataInicio = data.dataInicio as string | undefined;
  if (dataInicio && !isValidDate(dataInicio)) {
    throw new ValidationError(
      `Data de início inválida: '${dataInicio}'. Use formato YYYY-MM-DD`,
      "dataInicio",
      dataInicio
    );
  }

  const dataFim = data.dataFim as string | undefined;
  if (dataFim && !isValidDate(dataFim)) {
    throw new ValidationError(
      `Data final inválida: '${dataFim}'. Use formato YYYY-MM-DD`,
      "dataFim",
      dataFim
    );
  }

  // Validar limit (opcional)
  const limit = data.limit as number | undefined;
  if (limit !== undefined) {
    if (typeof limit !== "number" || limit < 1 || limit > 50) {
      throw new ValidationError("Campo 'limit' deve ser um número entre 1 e 50", "limit", limit);
    }
  }

  // Validar relevanceThreshold (opcional)
  const relevanceThreshold = data.relevanceThreshold as number | undefined;
  if (relevanceThreshold !== undefined) {
    if (
      typeof relevanceThreshold !== "number" ||
      relevanceThreshold < 0 ||
      relevanceThreshold > 1
    ) {
      throw new ValidationError(
        "Campo 'relevanceThreshold' deve ser um número entre 0 e 1",
        "relevanceThreshold",
        relevanceThreshold
      );
    }
  }

  return {
    tema,
    tribunal,
    dataInicio,
    dataFim,
    limit: limit || 10,
    relevanceThreshold: relevanceThreshold || 0.7,
  };
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
