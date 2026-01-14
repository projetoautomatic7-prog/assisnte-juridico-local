import { z } from 'zod';
import { ai } from './genkit';

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3001';

export const buscarIntimacaoPendente = ai.defineTool(
  {
    name: 'buscarIntimacaoPendente',
    description: 'Busca a próxima intimação pendente de análise no sistema.',
    inputSchema: z.object({ mode: z.string().optional() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/djen/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'next-pending', ...input }),
    });
    if (!res.ok) throw new Error(`Erro ao buscar intimação: ${res.statusText}`);
    return res.json();
  }
);

export const criarTarefa = ai.defineTool(
  {
    name: 'criarTarefa',
    description: 'Cria uma tarefa jurídica no sistema Todoist/CRM.',
    inputSchema: z.object({
      content: z.string(),
      due_string: z.string().optional(),
      priority: z.number().optional(),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/todoist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-task', ...input }),
    });
    return res.json();
  }
);

export const calcularPrazos = ai.defineTool(
  {
    name: 'calcularPrazos',
    description: 'Calcula prazos processuais considerando feriados e dias úteis.',
    inputSchema: z.object({
      startDate: z.string(),
      days: z.number(),
      type: z.enum(['úteis', 'corridos']),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/deadline/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }
);

export const consultarProcessoPJe = ai.defineTool(
  {
    name: 'consultarProcessoPJe',
    description: 'Consulta dados de um processo pelo número CNJ.',
    inputSchema: z.object({ numeroProcesso: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/legal-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'consultar-processo', ...input }),
    });
    return res.json();
  }
);

export const enviarMensagemWhatsApp = ai.defineTool(
  {
    name: 'enviarMensagemWhatsApp',
    description: 'Envia mensagem via WhatsApp.',
    inputSchema: z.object({ numero: z.string(), mensagem: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ number: input.numero, textMessage: { text: input.mensagem } }),
    });
    return res.json();
  }
);

export const registrarLogAgente = ai.defineTool(
  {
    name: 'registrarLogAgente',
    description: 'Registra log de execução para auditoria.',
    inputSchema: z.object({ agentId: z.string(), action: z.string(), details: z.any() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/kv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log-agent', payload: input }),
    });
    return res.json();
  }
);

export const buscarJurisprudenciaDataJud = ai.defineTool(
  {
    name: 'buscarJurisprudenciaDataJud',
    description: 'Busca jurisprudência e precedentes atualizados no DataJud/CNJ.',
    inputSchema: z.object({ query: z.string(), tribunal: z.string().optional() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/legal-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search-jurisprudence', ...input }),
    });
    return res.json();
  }
);

export const pesquisarQdrant = ai.defineTool(
  {
    name: 'pesquisarQdrant',
    description: 'Consulta a base de conhecimento interna (Qdrant) por teses e precedentes já salvos.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/qdrant/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        limit: 5 // Limite de segurança para contexto de IA
      }),
    });
    if (!res.ok) throw new Error(`Erro na busca Qdrant: ${res.statusText}`);
    return res.json();
  }
);

export const indexarNoQdrant = ai.defineTool(
  {
    name: 'indexarNoQdrant',
    description: 'Salva uma tese ou jurisprudência relevante no Qdrant para uso futuro.',
    inputSchema: z.object({ content: z.string(), metadata: z.any() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/qdrant/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }
);

export const indexarAnaliseCaso = ai.defineTool(
  {
    name: 'indexarAnaliseCaso',
    description: 'Salva o resumo e a estratégia de um caso analisado no Qdrant para consulta futura.',
    inputSchema: z.object({ 
      numeroProcesso: z.string(), 
      resumo: z.string(), 
      estrategia: z.string().optional() 
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const res = await fetch(`${BASE_URL}/api/qdrant/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Processo: ${input.numeroProcesso}\nResumo: ${input.resumo}\nEstratégia: ${input.estrategia || 'N/A'}`,
        metadata: { type: 'case-analysis', processNumber: input.numeroProcesso, date: new Date().toISOString() }
      }),
    });
    return res.json();
  }
);

export const ALL_TOOLS = [
  buscarIntimacaoPendente,
  criarTarefa,
  calcularPrazos,
  consultarProcessoPJe,
  enviarMensagemWhatsApp,
  registrarLogAgente,
  buscarJurisprudenciaDataJud,
  pesquisarQdrant,
  indexarNoQdrant,
  indexarAnaliseCaso,
];
