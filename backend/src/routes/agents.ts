import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ai, redis } from '../../../lib/ai/genkit.js';
import { agentFlow } from '../../../lib/ai/agent-flow.js';
import { justineFlow } from '../../../lib/ai/justine-flow.js';
import { petitionFlow } from '../../../lib/ai/petition-flow.js';
import { researchFlow } from '../../../lib/ai/research-flow.js';
import { riskAnalysisFlow } from '../../../lib/ai/risk-flow.js';
import { strategyFlow } from '../../../lib/ai/strategy-flow.js';

/**
 * Registro de fluxos Genkit para roteamento dinâmico
 */
const FLOW_REGISTRY: Record<string, ReturnType<typeof ai.defineFlow>> = {
  'justine': justineFlow,
  'analise-risco': riskAnalysisFlow,
  'estrategia-processual': strategyFlow,
  'redacao-peticoes': petitionFlow,
  'pesquisa-juris': researchFlow,
};

/**
 * Handler unificado para execução de agentes.
 * Suporta execução inicial e retomada (Human-in-the-loop).
 */
export async function agentsHandler(req: Request, res: Response) {
  const { agentId, expedienteId, numeroProcesso, message, resume, sessionId: reqSessionId } = req.body;
  const auditId = uuidv4();
  
  if (!agentId && !resume) {
    return res.status(400).json({ error: "Campo 'agentId' é obrigatório." });
  }

  // Gerar ou recuperar ID de sessão para o histórico
  const sessionId = reqSessionId || `chat:${agentId}:${expedienteId || numeroProcesso || 'global'}`;
  const historyKey = `genkit:history:${sessionId}`;

  console.log(`[AgentExecution] Start | ID: ${auditId} | Agent: ${agentId}`);

  try {
    const flow = FLOW_REGISTRY[agentId as string];
    let result;
    
    // Carregar histórico do Redis
    const history = await redis.get<any[]>(historyKey) || [];

    // 1. Lógica de Retomada (Resume)
    if (resume) {
      if (flow) {
        result = await flow(null, { resume, context: { auditId } });
      } else {
        throw new Error(`Fluxo ${agentId} não encontrado para retomada.`);
      }
    }
    // 2. Execução de Fluxos Registrados
    else if (flow) {
      let input: any = { numeroProcesso, instrucoes: message, history };

      // Mapeamento específico por agente
      if (agentId === 'justine') input = { expedienteId, numeroProcesso };
      else if (agentId === 'pesquisa-juris') input = { tema: message, history };

      result = await flow(input, { context: { auditId, startTime: Date.now(), sessionId } });
    }
    // 3. Fallback para fluxo genérico
    else {
      result = await agentFlow({ agentId: agentId as any, message: message || 'Análise solicitada', history });
    }

    // Salvar histórico atualizado (Mensagem do Usuário + Resposta da IA)
    if (result.answer && message) {
      const updatedHistory = [
        ...history,
        { role: 'user', content: [{ text: message }] },
        { role: 'model', content: [{ text: result.answer }] }
      ].slice(-20); // Manter apenas as últimas 20 interações para economizar contexto
      
      await redis.set(historyKey, updatedHistory, { ex: 86400 }); // TTL de 24h
    }

    return res.status(200).json({
      success: true,
      agentId,
      timestamp: new Date().toISOString(),
      ...result,
      metadata: {
        ...result?.metadata,
        auditId,
        latency: Date.now() - (result?.metadata?.startTime || Date.now()),
        environment: process.env.NODE_ENV || 'development',
        model: process.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
      }
    });

  } catch (error: any) {
    console.error(`[Genkit Error] AuditID: ${auditId} | Agent: ${agentId}`, {
      message: error.message,
      stack: error.stack,
      type: error.name || 'UnknownError'
    });

    const isDev = process.env.NODE_ENV !== 'production';

    return res.status(500).json({
      error: 'Falha na execução do agente',
      auditId,
      details: isDev ? error.message : 'Erro interno no processamento da IA',
      type: error.name || 'InternalError'
    });
  }
}

export default agentsHandler;