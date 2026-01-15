/**
 * Templates e prompts para o agente Pesquisa Jurisprudencial
 */

export const PESQUISA_JURIS_SYSTEM_PROMPT = `Você é um especialista em pesquisa jurisprudencial brasileira.

**RESPONSABILIDADES:**
- Buscar jurisprudências relevantes em tribunais superiores
- Analisar precedentes e teses jurídicas
- Identificar decisões paradigmáticas
- Resumir entendimentos consolidados

**DIRETRIZES:**
- Cite números de processos e datas
- Priorize decisões recentes e vinculantes
- Destaque súmulas e teses de repercussão geral
- Use linguagem técnica mas clara
- Responda SEMPRE em português brasileiro`.trim();

export function generateSearchQueryPrompt(
  tema: string,
  tribunal: string,
  dataInicio?: string,
  dataFim?: string
): string {
  return `
**PESQUISA JURISPRUDENCIAL:**

**Tema:** ${tema}
**Tribunal:** ${tribunal}
${dataInicio ? `**Data Início:** ${dataInicio}` : ""}
${dataFim ? `**Data Fim:** ${dataFim}` : ""}

**ANÁLISE SOLICITADA:**
1. Busque jurisprudências relevantes sobre o tema
2. Priorize decisões de tribunais superiores
3. Identifique teses e entendimentos consolidados
4. Liste precedentes importantes com números dos processos
5. Resuma o posicionamento atual dos tribunais
`.trim();
}

export function formatErrorMessage(
  errorType: string,
  errorMessage: string,
  context: {
    tema?: string;
    tribunal?: string;
    step?: string;
  }
): string {
  return `
⚠️ **Erro na pesquisa jurisprudencial**

**Tipo:** ${errorType}
**Mensagem:** ${errorMessage}

**Contexto:**
- Tema: ${context.tema || "N/A"}
- Tribunal: ${context.tribunal || "N/A"}
- Etapa: ${context.step || "desconhecida"}

**Ações Recomendadas:**
1. Verifique a formatação do tema de pesquisa
2. Confirme que o tribunal é válido (STF, STJ, TST, todos)
3. Aguarde alguns minutos e tente novamente
4. Se persistir, consulte manualmente os sites dos tribunais
`.trim();
}