/**
 * Dynatrace OneAgent Integration
 *
 * Instrumenta o backend com Dynatrace OneAgent SDK para:
 * - Tracing distribuído
 * - Monitoramento de performance
 * - Rastreamento de chamadas customizadas
 * - Métricas dos agentes jurídicos
 *
 * Documentação: https://www.npmjs.com/package/@dynatrace/oneagent-sdk
 */

import * as dynatrace from '@dynatrace/oneagent-sdk';

// Verificar se Dynatrace está habilitado
const isDynatraceEnabled =
  process.env.NODE_ENV === 'production' ||
  process.env.DYNATRACE_ENABLED === 'true';

let dynatraceSDK: ReturnType<typeof dynatrace.createInstance> | null = null;

/**
 * Inicializa o Dynatrace OneAgent SDK
 */
export function initializeDynatrace() {
  if (!isDynatraceEnabled) {
    console.log('[Dynatrace] Desabilitado (não em produção)');
    return;
  }

  try {
    dynatraceSDK = dynatrace.createInstance();

    // Validar se OneAgent está instalado
    if (dynatraceSDK.getCurrentState() === dynatrace.SDKState.ACTIVE) {
      console.log('[Dynatrace] OneAgent SDK inicializado com sucesso');
      console.log('[Dynatrace] Estado:', dynatraceSDK.getCurrentState());
    } else {
      console.warn('[Dynatrace] OneAgent não está ativo. Estado:', dynatraceSDK.getCurrentState());
      console.warn('[Dynatrace] Certifique-se de que o OneAgent está instalado no servidor');
    }
  } catch (error) {
    console.error('[Dynatrace] Erro ao inicializar:', error);
  }
}

/**
 * Cria um trace customizado para operações de agentes
 *
 * @example
 * const tracer = traceAgentExecution('harvey-specter', 'process-task');
 * try {
 *   const result = await executeTask();
 *   tracer.end();
 *   return result;
 * } catch (error) {
 *   tracer.error(error);
 *   throw error;
 * }
 */
export function traceAgentExecution(agentId: string, operation: string) {
  if (!dynatraceSDK) {
    return {
      end: () => {},
      error: () => {},
      addTag: () => {},
    };
  }

  const tracer = dynatraceSDK.traceIncomingRemoteCall(
    `Agent.${agentId}`,
    operation,
    'Agents'
  );

  return {
    /**
     * Finaliza o trace com sucesso
     */
    end: () => {
      tracer.end();
    },

    /**
     * Marca o trace como erro
     */
    error: (error: Error) => {
      tracer.error(error);
      tracer.end();
    },

    /**
     * Adiciona tags customizadas
     */
    addTag: (key: string, value: string) => {
      tracer.addCustomAttribute(key, value, false);

  const url = provider === 'anthropic'
    ? 'https://api.anthropic.com/v1/messages'
    : 'https://generativelanguage.googleapis.com/v1beta/models';

  const tracer = dynatraceSDK.traceOutgoingRemoteCall(
    'POST',
    url,
    `LLM.${provider}`,
    model
  );

  // Adicionar metadados como custom attributes
  if (metadata?.agentId) {
    tracer.addCustomAttribute('agent.id', metadata.agentId, false);
  }
  if (metadata?.totalTokens) {
    tracer.addCustomAttribute('llm.tokens.total', metadata.totalTokens.toString(), false);
  }

  return {
    end: () => {
      tracer.end();
    },
    error: (error: Error) => {
      tracer.error(error);
      tracer.end();
    },
  };
}

/**
 * Rastreia operações de banco de dados
 */
export function traceDatabase(
  database: 'postgres' | 'qdrant' | 'redis',
  operation: string,
  statement?: string
) {
  if (!dynatraceSDK) {
    return {
      end: () => {},
      error: () => {},
    };
  }

  const tracer = dynatraceSDK.traceSQLDatabaseRequest(
    statement || operation,
    database
  );

  return {
    end: () => {
      tracer.end();
    },
    error: (error: Error) => {
      tracer.error(error);
      tracer.end();
    },
  };
}

/**
 * Obtém o SDK do Dynatrace (para uso avançado)
 */
export function getDynatraceSDK() {
  return dynatraceSDK;
}

/**
 * Verifica se Dynatrace está ativo
 */
export function isDynatraceActive(): boolean {
  return dynatraceSDK?.getCurrentState() === dynatrace.SDKState.ACTIVE;
}

export default dynatraceSDK;
