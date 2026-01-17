/**
 * Validação de inputs para o agente Harvey Specter
 */

export interface HarveyInput {
  task: string;
  urgency?: string;
  sessionId?: string;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public receivedValue: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateHarveyInput(
  data: Record<string, unknown>,
): HarveyInput {
  const task = data.task as string | undefined;
  if (!task) {
    throw new ValidationError("Campo 'task' é obrigatório", "task", task);
  }

  if (typeof task !== "string") {
    throw new ValidationError("Campo 'task' deve ser uma string", "task", task);
  }

  const urgency = data.urgency as string | undefined;

  return {
    task,
    urgency,
    sessionId: data.sessionId as string | undefined,
  };
}
