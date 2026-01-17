import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { agentFlow } from '../../../lib/ai/agent-flow.js';
import { ai, redis } from '../../../lib/ai/genkit.js';
import { justineFlow } from '../../../lib/ai/justine-flow.js';
import { petitionFlow } from '../../../lib/ai/petition-flow.js';
import { researchFlow } from '../../../lib/ai/research-flow.js';
import { riskAnalysisFlow } from '../../../lib/ai/risk-flow.js';
import { strategyFlow } from '../../../lib/ai/strategy-flow.js';
import { agentQueueProcessor } from '../services/agent-queue-processor.js';

const router = Router();

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
async function agentsHandler(req: Request, res: Response) {
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
        result = await flow(null, { context: { auditId } } as any);
      } else {
        throw new Error(`Fluxo ${agentId} não encontrado para retomada.`);
      }
    }
    // 2. Execução de Fluxos Registrados
    else if (flow) {
      let input: any = { numeroProcesso, instrucoes: message, history };

      // Mapeamento específico por agente
      if (agentId === 'justine') input = { expedienteId, numeroProcesso, history };
      else if (agentId === 'pesquisa-juris') input = { tema: message, history };

      result = await flow(input, { context: { auditId, startTime: Date.now(), sessionId } });
    }
    // 3. Fallback para fluxo genérico
    else {
      result = await agentFlow({ agentId: agentId as any, message: message || 'Análise solicitada' });
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

// GET endpoints para status dos agentes
router.get('/', async (req: Request, res: Response) => {
  const { action } = req.query;

  try {
    // Verificar se Redis está disponível
    const isRedisAvailable = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    switch (action) {
      case 'list':
        // Retorna lista de agentes disponíveis
        let agents = [];
        let queued = [];
        let completed = [];
        
        if (isRedisAvailable) {
          try {
            agents = await redis.get<any[]>('agents:list') || [];
            queued = await redis.get<any[]>('agents:queue') || [];
            completed = await redis.get<any[]>('agents:completed') || [];
          } catch (redisError) {
            console.warn('[Agents] Redis error, using empty arrays:', redisError);
          }
        }
        
        return res.json({ ok: true, agents, queued, completed });

      case 'logs':
        // Retorna logs dos agentes
        let logs = [];
        
        if (isRedisAvailable) {
          try {
            logs = await redis.get<any[]>('agents:logs') || [];
          } catch (redisError) {
            console.warn('[Agents] Redis error, using empty array:', redisError);
          }
        }
        
        return res.json({ logs });

      case 'memory':
        // Retorna memória dos agentes
        let memory = [];
        
        if (isRedisAvailable) {
          try {
            memory = await redis.get<any[]>('agents:memory') || [];
          } catch (redisError) {
            console.warn('[Agents] Redis error, using empty array:', redisError);
          }
        }
        
        return res.json({ memory });

      default:
        return res.status(400).json({ error: 'Invalid action. Use: list, logs, or memory' });
    }
  } catch (error: any) {
    console.error('[Agents GET] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST endpoint para execução de agentes
router.post('/', async (req: Request, res: Response) => {
  const { action } = req.query;

  // Handle process-queue action (Cron/Cloud Scheduler)
  if (action === 'process-queue') {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    // Auth check: Must have Bearer token matching CRON_SECRET or be in dev mode
    const isAuth = (cronSecret && authHeader === `Bearer ${cronSecret}`) || 
                   (!cronSecret && process.env.NODE_ENV === 'development');

    if (!isAuth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await agentQueueProcessor.processQueue();
      return res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[Agents Queue] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Fallback to standard agent execution handler
  return agentsHandler(req, res);
});

export default router;