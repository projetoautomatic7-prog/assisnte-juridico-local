/**
 * Wrapper de compatibilidade Sentry → Dynatrace
 */

// Mock dynatrace object for compatibility
const dynatrace = {
  captureError: (error: Error, context?: Record<string, unknown>) => {},
  trackEvent: (name: string, data?: Record<string, any>) => {},
  setUser: (id: string, email?: string) => {},
  startTrace: (name: string, context?: Record<string, any>) => () => {},
};

// ============================================================================
// TYPES - Compatibilidade com Sentry SDK
// ============================================================================

export type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

export interface Span {
  finish(): void;
  end?(): void; // Alias para finish()
  setTag(key: string, value: string): void;
  setData(key: string, value: unknown): void;
  setStatus(status: string | { code: number; message?: string }): void;
  spanContext?(): { traceId?: string; spanId?: string };
}

export interface Scope {
  setTag(key: string, value: string | number): void;
  setContext(name: string, context: Record<string, unknown>): void;
  setUser(user: { id?: string; email?: string; username?: string } | null): void;
  clear?(): void;
}

// ============================================================================
// CORE METHODS
// ============================================================================

export function captureException(error: Error | string, context?: Record<string, unknown>): void {
  const errorObj = typeof error === "string" ? new Error(error) : error;
  dynatrace.captureError(errorObj, context);
}

export function captureMessage(
  message: string,
  level?:
    | string
    | { level?: SeverityLevel; tags?: Record<string, string>; extra?: Record<string, unknown> }
): void {
  const logLevel = typeof level === "string" ? level : level?.level || "info";
  dynatrace.trackEvent("log", { message, level: logLevel });
}

export function setUser(user: { id?: string; email?: string; username?: string } | null): void {
  if (!user) return;
  dynatrace.setUser(user.id || user.username || "unknown", user.email);
}

export function setContext(name: string, context: Record<string, unknown>): void {
  Object.entries(context).forEach(([key, value]) => {
    dynatrace.trackEvent(`context.${name}`, { [key]: value });
  });
}

export function setTag(key: string, value: string): void {
  dynatrace.trackEvent("tag", { [key]: value });
}

export function addBreadcrumb(breadcrumb: any): void {
  dynatrace.trackEvent("breadcrumb", breadcrumb);
}

export function startTransaction(context: {
  name: string;
  op?: string;
  attributes?: Record<string, unknown>;
}): Span {
  const endTrace = dynatrace.startTrace(context.name, {
    operation: context.op || "transaction",
    ...context.attributes,
  });

  const span: Span = {
    finish: () => endTrace(),
    end: () => endTrace(),
    setTag: (key: string, value: string) => setTag(key, value),
    setData: (key: string, value: unknown) => {},
    setStatus: (status: string | { code: number; message?: string }) => {},
    spanContext: () => ({ traceId: undefined, spanId: undefined }),
  };

  return span;
}

export function startSpan(
  context: { name: string; op?: string; attributes?: Record<string, unknown> },
  callback: (span: Span) => any
): any {
  const endTrace = dynatrace.startTrace(context.name);
  const span: Span = {
    finish: () => endTrace(),
    end: () => endTrace(),
    setTag: (key: string, value: string) => setTag(key, value),
    setData: (key: string, value: unknown) => {},
    setStatus: (status: string | { code: number; message?: string }) => {},
    spanContext: () => ({ traceId: undefined, spanId: undefined }),
  };
  const result = callback(span);
  return result;
}

export function startInactiveSpan(context: {
  name: string;
  op?: string;
  attributes?: Record<string, unknown>;
}): Span {
  const endTrace = dynatrace.startTrace(context.name);
  return {
    finish: () => endTrace(),
    end: () => endTrace(),
    setTag: (key: string, value: string) => setTag(key, value),
    setData: (key: string, value: unknown) => {},
    setStatus: (status: string | { code: number; message?: string }) => {},
    spanContext: () => ({ traceId: undefined, spanId: undefined }),
  };
}

export function withScope(callback: (scope: Scope) => void): void {
  const scope: Scope = {
    setTag: (key: string, value: string | number) => setTag(key, String(value)),
    setContext: (name: string, context: Record<string, unknown>) => setContext(name, context),
    setUser: (user) => setUser(user),
    clear: () => {},
  };
  callback(scope);
}

export function configureScope(callback: (scope: Scope) => void): void {
  withScope(callback);
}

export function getCurrentScope(): Scope {
  return {
    setTag: (key: string, value: string | number) => setTag(key, String(value)),
    setContext: (name: string, context: Record<string, unknown>) => setContext(name, context),
    setUser: (user) => setUser(user),
    clear: () => {},
  };
}

export async function flush(timeout?: number): Promise<boolean> {
  return true;
}

export async function close(timeout?: number): Promise<boolean> {
  return true;
}

// Métodos que podem não existir mas não causam erro
export const init = (config?: any) => {};
export const browserTracingIntegration = (options?: any) => ({});
export const replayIntegration = (options?: any) => ({});
export const consoleLoggingIntegration = (options?: any) => ({});
export const getActiveSpan = (): Span | null => null;
export const metrics = {
  increment: (name: string, value?: number) => {},
  gauge: (name: string, value: number) => {},
  distribution: (name: string, value: number) => {},
  count: (name: string, value?: number) => {},
};

// Exporta compatibilidade com import * as Sentry
export const Sentry = {
  captureException,
  captureMessage,
  setUser,
  setContext,
  setTag,
  addBreadcrumb,
  startTransaction,
  startSpan,
  startInactiveSpan,
  withScope,
  configureScope,
  flush,
  close,
  init,
  browserTracingIntegration,
  replayIntegration,
  consoleLoggingIntegration,
  getCurrentScope,
  getActiveSpan,
  metrics,
};

export default Sentry;
export { dynatrace };
// Types já exportados acima (interface Span, interface Scope, type SeverityLevel)
