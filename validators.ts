export interface MonitorInput {
  oab: string;
  uf?: string;
  dataPublicacao?: string;
  tribunal?: string;
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateMonitorInput(data: Record<string, unknown>): MonitorInput {
  if (!data.oab || typeof data.oab !== "string") {
    throw new ValidationError("oab", "O número da OAB é obrigatório para o monitoramento.");
  }

  // Validação simples de formato OAB (ex: 123456/SP ou 123456)
  const oabRegex = /^\d{1,7}(\/[A-Z]{2})?$/;
  if (!oabRegex.test(data.oab.replace(/\s/g, ""))) {
    throw new ValidationError("oab", "Formato de OAB inválido. Use '123456' ou '123456/UF'.");
  }

  return {
    oab: data.oab,
    uf: typeof data.uf === "string" ? data.uf : undefined,
    dataPublicacao: typeof data.dataPublicacao === "string" ? data.dataPublicacao : undefined,
    tribunal: typeof data.tribunal === "string" ? data.tribunal : undefined,
  };
}