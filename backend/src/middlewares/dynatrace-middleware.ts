/**
 * Express Middleware para Dynatrace
 *
 * Adiciona contexto de agentes jurídicos aos traces do Dynatrace
 * para facilitar análise de performance e debugging
 */

import { Request, Response, NextFunction } from 'express';
import { traceAgentExecution, isDynatraceActive } from '../dynatrace.js';

/**
 * Middleware que adiciona contexto de agentes aos traces
 * Deve ser aplicado ANTES das rotas de agentes
 */
export function dynatraceAgentMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip se Dynatrace não está ativo
  if (!isDynatraceActive()) {
    return next();
  }

  // Detectar se é requisição de agente
  const isAgentRequest = req.path.startsWith('/api/agents');
  const isLLMRequest = req.path.startsWith('/api/llm') || req.path.startsWith('/api/ai');

  if (!isAgentRequest && !isLLMRequest) {
    return next();
  }

  // Extrair ID do agente se disponível
  const agentId = req.body?.agentId || req.query.agentId || 'unknown';
  const taskId = req.body?.taskId || req.query.taskId;

  // Criar tracer customizado
  let tracer: ReturnType<typeof traceAgentExecution> | null = null;

  if (isAgentRequest) {
    tracer = traceAgentExecution(String(agentId), req.path);

    // Adicionar tags customizadas
    if (taskId) {
      tracer.addTag('task.id', String(taskId));
    }
    tracer.addTag('request.method', req.method);
    tracer.addTag('request.path', req.path);
  }

  // Wrapper para finalizar trace ao completar resposta
  const originalSend = res.send;
  res.send = function (data) {
    if (tracer) {
      // Verificar se houve erro
      if (res.statusCode >= 400) {
        const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Error'}`);
        tracer.error(error);
      } else {
        tracer.end();
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware específico para rastrear chamadas LLM
 */
export function dynatraceLLMMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isDynatraceActive()) {
    return next();
  }

  // Extrair metadados do LLM
  const model = req.body?.model || req.query.model || 'unknown';
  const provider = req.body?.provider ||
    (req.path.includes('anthropic') ? 'anthropic' : 'google-gemini') as 'anthropic' | 'google-gemini';

  const metadata = {
    agentId: req.body?.agentId,
    promptTokens: req.body?.promptTokens,
    completionTokens: req.body?.completionTokens,
    totalTokens: req.body?.totalTokens,
  };

  // traceLLMCall não está mais disponível
  // const tracer = traceLLMCall(String(model), provider, metadata);

  // Finalizar trace ao completar
  const originalSend = res.send;
  res.send = function (data) {
    // if (res.statusCode >= 400) {
    //   const error = new Error(`LLM API Error ${res.statusCode}`);
    //   tracer.error(error);
    // } else {
    //   tracer.end();
    // }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware para adicionar metadados customizados aos traces
 * Útil para correlacionar traces com dados de negócio
 */
export function addDynatraceBusinessContext(req: Request, res: Response, next: NextFunction) {
  if (!isDynatraceActive()) {
    return next();
  }

  // Adicionar contexto de negócio se disponível
  // Exemplo: ID do usuário, ID do processo, ID do cliente, etc.
  const userId = req.headers['x-user-id'] || req.body?.userId;
  const processId = req.body?.processId || req.query.processId;
  const clientId = req.body?.clientId || req.query.clientId;

  // Tags customizadas seriam adicionadas aqui
  // Note: Isso requer acesso ao tracer atual, que pode ser obtido via
  // contexto do Express ou variável de request

  // Armazenar contexto no request para uso posterior
  (req as any).dynatraceContext = {
    userId: userId ? String(userId) : undefined,
    processId: processId ? String(processId) : undefined,
    clientId: clientId ? String(clientId) : undefined,
  };

  next();
}

export default {
  dynatraceAgentMiddleware,
  dynatraceLLMMiddleware,
  addDynatraceBusinessContext,
};
