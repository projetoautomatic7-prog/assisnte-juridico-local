/**
 * Validação de inputs para o agente Monitor DJEN
 * Baseado no padrão Google Agent Starter Pack
 */

export interface MonitorDJENInput {
  lawyerOAB?: string;
  courts?: string[];
  startDate?: string;
  endDate?: string;
  autoRegister?: boolean;
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

const VALID_COURTS = ["STF", "STJ", "TST", "TSE", "STM", "TRF1", "TRF2", "TRF3", "TRF4", "TRF5"] as const;

/**
 * Valida os inputs para monitoramento do DJEN
 * 
 * @param data - Dados recebidos do usuário
 * @returns Inputs validados e normalizados
 * @throws {ValidationError} Se validação falhar
 * 
 * @example
 * ```typescript
 * const validated = validateMonitorDJENInput({
 *   lawyerOAB: "MG 184404",
 *   courts: ["STF", "STJ"]
 * });
 * ```
 */
export function validateMonitorDJENInput(data: Record<string, unknown>): MonitorDJENInput {
  // Validar lawyerOAB (opcional)
  const lawyerOAB = data.lawyerOAB as string | undefined;
  if (lawyerOAB) {
    if (typeof lawyerOAB !== "string") {
      throw new ValidationError(
        "Campo 'lawyerOAB' deve ser uma string",
        "lawyerOAB",
        lawyerOAB
      );
    }

    // Formato esperado: "UF NUMERO" (ex: "MG 184404")
    const oabPattern = /^[A-Z]{2}\s+\d{3,7}$/;
    if (!oabPattern.test(lawyerOAB)) {
      throw new ValidationError(
        "Campo 'lawyerOAB' deve estar no formato 'UF NUMERO' (ex: 'MG 184404')",
        "lawyerOAB",
        lawyerOAB
      );
    }
  }

  // Validar courts (opcional)
  const courts = data.courts as string[] | undefined;
  if (courts) {
    if (!Array.isArray(courts)) {
      throw new ValidationError(
        "Campo 'courts' deve ser um array",
        "courts",
        courts
      );
    }

    if (courts.length === 0) {
      throw new ValidationError(
        "Campo 'courts' não pode ser um array vazio",
        "courts",
        courts
      );
    }

    const invalidCourts = courts.filter(c => !VALID_COURTS.includes(c as typeof VALID_COURTS[number]));
    if (invalidCourts.length > 0) {
      throw new ValidationError(
        `Tribunais inválidos: ${invalidCourts.join(", ")}. Valores aceitos: ${VALID_COURTS.join(", ")}`,
        "courts",
        invalidCourts
      );
    }
  }

  // Validar startDate (opcional)
  const startDate = data.startDate as string | undefined;
  if (startDate && !isValidDate(startDate)) {
    throw new ValidationError(
      `Data inválida: '${startDate}'. Use formato YYYY-MM-DD`,
      "startDate",
      startDate
    );
  }

  // Validar endDate (opcional)
  const endDate = data.endDate as string | undefined;
  if (endDate && !isValidDate(endDate)) {
    throw new ValidationError(
      `Data inválida: '${endDate}'. Use formato YYYY-MM-DD`,
      "endDate",
      endDate
    );
  }

  // Validar intervalo de datas
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new ValidationError(
      `startDate (${startDate}) não pode ser posterior a endDate (${endDate})`,
      "startDate",
      { startDate, endDate }
    );
  }

  // Validar autoRegister (opcional)
  const autoRegister = data.autoRegister;
  if (autoRegister !== undefined && typeof autoRegister !== "boolean") {
    throw new ValidationError(
      "Campo 'autoRegister' deve ser um boolean",
      "autoRegister",
      autoRegister
    );
  }

  return {
    lawyerOAB,
    courts,
    startDate,
    endDate,
    autoRegister: autoRegister === true,
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
