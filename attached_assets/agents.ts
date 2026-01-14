import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { ai } from '../../lib/ai/genkit';
import { justineFlow } from '../../lib/ai/justine-flow';
import { petitionFlow } from '../../lib/ai/petition-flow';
import { riskAnalysisFlow } from '../../lib/ai/risk-flow';
import { strategyFlow } from '../../lib/ai/strategy-flow';
import { researchFlow } from '../../lib/ai/research-flow';
import { agentFlow } from '../../lib/ai/agent-flow';

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
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, expedienteId, numeroProcesso, message, resume } = req.body;

  // ID de Auditoria Único para conformidade V2
  const auditId = uuidv4();
  console.log(`[AgentExecution] Start | ID: ${auditId} | Agent: ${agentId}`);

  try {
    let result;

    // Se houver um payload de 'resume', retomamos o fluxo pausado (Human-in-the-loop)
    if (resume) {
      const flow = FLOW_REGISTRY[agentId];
      if (flow) {
        result = await flow(null, { resume }); // Retoma o fluxo usando o ID de estado enviado no payload
        return res.status(200).json(result);
      }
    }

    const flow = FLOW_REGISTRY[agentId];

    if (flow) {
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
        environment: process.env.NODE_ENV
      }
    });

  } catch (error: any) {
    console.error(`[Genkit Error] AuditID: ${auditId} | Agent: ${agentId}`, {
      message: error.message,
      stack: error.stack,
      type: error.name
    });

    return res.status(500).json({
      error: 'Falha na execução do agente',
      auditId,
      details: error.message
    });
  }
}