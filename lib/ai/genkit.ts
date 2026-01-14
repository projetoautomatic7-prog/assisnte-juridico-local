import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { devLocalStateStore } from 'genkit/dev';
import { z } from 'zod';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'gemini-2.0-flash',
  stateStore: devLocalStateStore(), // Habilita persistência local para retomar fluxos pausados
});

/**
 * Tool Real: Busca no DJEN (Diário da Justiça Eletrônico)
 * Substitui qualquer simulação por chamada à API real configurada na V2.
 */
export const searchDjenTool = ai.defineTool(
  {
    name: 'searchDjen',
    description: 'Busca publicações e intimações reais no DJEN para um processo específico.',
    inputSchema: z.object({
      numeroProcesso: z.string().describe('O número do processo no formato CNJ (ex: 1234567-89.2024.8.07.0001)'),
      dataDesde: z.string().optional().describe('Data inicial para a busca em formato ISO'),
    }),
    outputSchema: z.object({
      publicacoes: z.array(z.any()),
      total: z.number(),
    }),
  },
  async (input) => {
    const response = await fetch(`${process.env.APP_BASE_URL}/api/djen/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response.json();
  }
);

// Interrupção para intervenção humana (Human-in-the-loop)
export const askLawyer = ai.defineInterrupt(
  {
    name: 'askLawyer',
    description: 'Solicita esclarecimento ou aprovação do advogado humano.',
    inputSchema: z.object({ question: z.string(), context: z.string().optional() }),
    outputSchema: z.string(),
  },
);

// Schema compartilhado para respostas dos agentes
export const AgentResponseSchema = z.object({
  answer: z.string().describe('Resposta final do agente para o usuário'),
  steps: z.number().optional(),
  usedTools: z.array(z.string()).optional().describe('Lista de ferramentas reais executadas'),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.object({
    processo: z.string().optional(),
    tribunal: z.string().optional(),
    urgencia: z.enum(['baixa', 'media', 'alta']).optional(),
    auditId: z.string().describe('ID único para rastreamento na V2'),
  }).optional(),
});