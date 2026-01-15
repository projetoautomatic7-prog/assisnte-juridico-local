import { z } from 'zod';
import { AgentResponseSchema, ai, askLawyer, upstashSessionStore } from './genkit';
import { petitionFlow } from './petition-flow';
import { researchFlow } from './research-flow';
import { riskAnalysisFlow } from './risk-flow';
import { strategyFlow } from './strategy-flow';
import { buscarIntimacaoPendente, calcularPrazos, consultarProcessoPJe, criarTarefa, indexarAnaliseCaso } from './tools';

/**
 * Ferramentas de Especialistas encapsuladas para a Justine
 */
const runRiskAnalysis = ai.defineTool(
  { name: 'runRiskAnalysis', description: 'Aciona o Agente de Risco para análise financeira.', inputSchema: z.object({ numeroProcesso: z.string() }), outputSchema: z.any() },
  async (i) => riskAnalysisFlow(i)
);

const runStrategy = ai.defineTool(
  { name: 'runStrategy', description: 'Aciona o Agente de Estratégia para definir o próximo passo processual.', inputSchema: z.object({ numeroProcesso: z.string() }), outputSchema: z.any() },
  async (i) => strategyFlow(i)
);

const runPetitionDraft = ai.defineTool(
  { name: 'runPetitionDraft', description: 'Aciona o Agente de Redação para criar uma minuta.', inputSchema: z.object({ numeroProcesso: z.string(), instrucoes: z.string() }), outputSchema: z.any() },
  async (i) => petitionFlow(i)
);

const runResearch = ai.defineTool(
  { name: 'runResearch', description: 'Pesquisa jurisprudência e popula a base de conhecimento.', inputSchema: z.object({ tema: z.string() }), outputSchema: z.any() },
  async (i) => researchFlow(i)
);

export const justineFlow = ai.defineFlow(
  {
    name: 'justineFlow',
    inputSchema: z.object({
      expedienteId: z.string(),
      numeroProcesso: z.string().optional(),
      sessionId: z.string().optional(),
      resume: z.any().optional(),
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    // Execução Paralela: Busca dados do processo e intimações simultaneamente
    const contextData = await ai.run('initial-investigation', async () => {
      const [processo, intimação] = await Promise.all([
        input.numeroProcesso ? consultarProcessoPJe.run({ numeroProcesso: input.numeroProcesso }) : Promise.resolve(null),
        buscarIntimacaoPendente.run({ expedienteId: input.expedienteId })
      ]);
      return { processo, intimação };
    });

    // Carrega a sessão persistente vinculada ao expediente
    const session = await ai.loadSession(input.sessionId || `justine-${input.expedienteId}`, {
      store: upstashSessionStore
    });

    // Carrega ferramentas do MCP (Filesystem, etc)
    const mcpTools = await mcpHost.getActiveTools(ai);

    const chat = session.chat({
      system: `Você é Mrs. Justin-e, a Supervisora Autônoma da Controladoria Jurídica.
      Sua missão é processar expedientes e garantir que todas as providências sejam tomadas.

      PROTOCOLO DE INVESTIGAÇÃO (OBRIGATÓRIO):
      1. Se faltar alguma informação (número do processo, data, teor), você DEVE usar 'consultarProcessoPJe' ou 'buscarIntimacaoPendente' para tentar sanar a dúvida sozinho.
      2. Analise o histórico de andamentos para entender o contexto antes de decidir.
      3. Use 'askLawyer' APENAS em último caso, quando:
         - A informação não existe em nenhum sistema digital.
         - Existe uma contradição insolúvel nos autos.
         - A decisão exige um juízo de valor puramente humano/subjetivo.

      REGRAS DE ACIONAMENTO:
      - Risco alto/valor da causa elevado -> runRiskAnalysis.
      - Fase complexa (Recursal/Execução) -> runStrategy.
      - Necessidade de fundamentação ou tese nova -> runResearch.
      - Necessidade de peticionar -> runPetitionDraft.
      
      Sempre finalize:
      1. Criando as tarefas no Todoist.
      2. Indexando a análise do caso no Qdrant usando 'indexarAnaliseCaso' para memória futura.
      3. Registrando o log.`,
      tools: [
        buscarIntimacaoPendente,
        consultarProcessoPJe,
        calcularPrazos,
        criarTarefa,
        runRiskAnalysis,
        runStrategy,
        runResearch,
        runPetitionDraft,
        askLawyer,
        indexarAnaliseCaso,
        ...mcpTools
      ],
    });

    const response = await chat.send({
      resume: input.resume,
      prompt: `Processe o expediente ID: ${input.expedienteId}. 
      Dados obtidos: ${JSON.stringify(contextData)}
      Instrução atual: Analise e distribua as tarefas necessárias.`,
    });

    return {
      answer: response.text,
      usedTools: response.toolCalls?.map(tc => tc.name),
      interrupts: response.interrupts,
    };
  }
);