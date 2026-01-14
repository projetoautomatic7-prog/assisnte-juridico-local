import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { agentFlow } from '../lib/ai/agent-flow';
import { justineFlow } from '../lib/ai/justine-flow';
import { petitionFlow } from '../lib/ai/petition-flow';
import { researchFlow } from '../lib/ai/research-flow';
import { riskAnalysisFlow } from '../lib/ai/risk-flow';
import { strategyFlow } from '../lib/ai/strategy-flow';

/**
 * Registro de fluxos para evitar switch-case extenso
 */
const FLOW_REGISTRY: Record<string, any> = {
  'justine': justineFlow,
  'analise-risco': riskAnalysisFlow,
  'estrategia-processual': strategyFlow,
  'redacao-peticoes': petitionFlow,
  'pesquisa-juris': researchFlow,
};

/**
 * Endpoint unificado para execução de agentes e fluxos Genkit.
 */
export default async function handler(
  req: Request,
  res: Response
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, expedienteId, numeroProcesso, message, resume } = req.body;

  // ID de Auditoria Único para conformidade V2
  const auditId = uuidv4();
  console.log(`[AgentExecution] Start | ID: ${auditId} | Agent: ${agentId}`);

  try {
    const flow = FLOW_REGISTRY[agentId];
    let result;

    // Se houver um payload de 'resume', retomamos o fluxo pausado (Human-in-the-loop)
    if (resume) {
      if (flow) {
        result = await flow(null, { resume });
      } else {
        throw new Error(`Fluxo ${agentId} não encontrado para retomada.`);
      }
    } else if (flow) {
      // Mapeamento dinâmico de inputs baseado no agente
      let input: any = { numeroProcesso, instrucoes: message };
      if (agentId === 'justine') input = { expedienteId, numeroProcesso };
      if (agentId === 'pesquisa-juris') input = { tema: message }; // O input message vira o tema da pesquisa

      result = await flow(input);
    } else {
      // Fallback para o fluxo genérico se o ID não estiver no registro
      result = await agentFlow({ agentId, message: message || 'Análise solicitada' });
    }

    return res.status(200).json({
      success: true,
      agentId,
      timestamp: new Date().toISOString(),
      ...result,
      metadata: {
        ...result?.metadata,
        auditId,
        environment: process.env.NODE_ENV,
        model: process.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
      }
    });

  } catch (error: any) {
    // Log detalhado para o Sentry/Datadog
    console.error(`[Genkit Error] AuditID: ${auditId} | Agent: ${agentId}`, {
      message: error.message,
      stack: error.stack,
      type: error.name
    });

    return res.status(500).json({
      error: 'Falha na execução do agente',
      auditId,
      // Não expor stack trace em produção, apenas a mensagem
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno no processamento da IA'
    });
  }
}