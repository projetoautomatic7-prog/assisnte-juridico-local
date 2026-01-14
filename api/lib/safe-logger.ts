/**
 * Utilitários para sanitização de logs e dados sensíveis
 * Remove informações confidenciais antes do logging
 * 
 * ATUALIZADO: Foco estrito em LGPD / PII
 */

export interface SanitizeOptions {
  maxLength?: number
  maskFields?: string[]
  removeFields?: string[]
}

/**
 * Campos sensíveis que devem ser mascarados ou removidos
 */
const SENSITIVE_FIELDS: string[] = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'auth',
  'credential',
  'oauth',
  'client_secret',
  'api_key',
  'access_token',
  'refresh_token',
  'bearer',
  'x-api-key',
  'x-auth-token'
]

/**
 * Campos que contêm dados pessoais (PII) - LGPD Compliance
 */
const PII_FIELDS: string[] = [
  'email',
  'cpf',
  'cnpj',
  'rg',
  'telefone',
  'celular',
  'endereco',
  'cep',
  'nome_completo',
  'data_nascimento',
  'numero_oab',
  'uf_oab',
  'clientname',
  'advogado',
  'teor', // Conteúdo de intimações pode conter PII
  'texto'
]

/**
 * Mascara uma string sensível (ex: CPF, OAB)
 */
export function maskSensitive(value: string, visibleChars: number = 4): string {
  if (!value) return '';
  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length)
  }

  const start = value.substring(0, visibleChars)
  const end = value.substring(value.length - visibleChars)
  const masked = '*'.repeat(8) // Máscara fixa para não revelar o tamanho original

  return `${start}${masked}${end}`
}

function isPrimitive(obj: unknown): boolean {
  return obj === null || obj === undefined || 
         typeof obj === 'number' || typeof obj === 'boolean'
}

function looksLikePII(str: string): boolean {
  // Regex simples para CPF
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(str)) return true;
  // Regex simples para E-mail
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return true;
  return false;
}

function sanitizeString(str: string): string {
  if (looksLikePII(str)) return maskSensitive(str);
  return str.length > 100 ? str.substring(0, 100) + '...' : str;
}

function shouldRemoveField(key: string, options: SanitizeOptions): boolean {
  const lowerKey = key.toLowerCase()
  return (
    options.removeFields?.includes(lowerKey) ||
    SENSITIVE_FIELDS.some(field => lowerKey.includes(field))
  )
}

function shouldMaskAsPII(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return PII_FIELDS.some(field => lowerKey.includes(field))
}

function sanitizeObjectFields(
  input: Record<string, unknown>,
  options: SanitizeOptions
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    if (shouldRemoveField(key, options)) continue

    if (shouldMaskAsPII(key)) {
      sanitized[key] = typeof value === 'string' ? maskSensitive(value) : '[PII REDACTED]'
      continue
    }

    sanitized[key] = sanitizeObject(value, options)
  }

  return sanitized
}

export function sanitizeObject(
  obj: unknown,
  options: SanitizeOptions = {}
): unknown {
  if (isPrimitive(obj)) return obj
  if (typeof obj === 'string') return sanitizeString(obj)

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options))
  }

  if (typeof obj === 'object') {
    return sanitizeObjectFields(obj as Record<string, unknown>, options)
  }

  return obj
}

export function sanitizeError(error: unknown): unknown {
  if (!error) return error
  return sanitizeObject(error, {
    removeFields: ['stack', 'cause'],
    maskFields: ['message']
  })
}

export class SafeLogger {
  private readonly context: string

  constructor(context: string) {
    this.context = context
  }

  private sanitizeArgs(args: unknown[]): unknown[] {
    return args.map(arg => sanitizeObject(arg))
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.context}] ${message}`, ...this.sanitizeArgs(args))
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.context}] ${message}`, ...this.sanitizeArgs(args))
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    const sanitizedError = error ? sanitizeError(error) : undefined
    console.error(`[${this.context}] ${message}`, sanitizedError, ...this.sanitizeArgs(args))
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] ${message}`, ...this.sanitizeArgs(args))
    }
  }
}
