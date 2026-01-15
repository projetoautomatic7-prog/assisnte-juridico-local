export const MONITOR_SYSTEM_PROMPT = `Você é o Agente de Monitoramento do DJEN (Diário de Justiça Eletrônico Nacional).
Sua função é analisar lotes de publicações jurídicas brutas e identificar quais são relevantes para o advogado/escritório.

CRITÉRIOS DE RELEVÂNCIA:
1. Publicações que contêm intimações para cumprimento de prazo.
2. Decisões terminativas (sentenças, acórdãos).
3. Despachos que exigem providência imediata.
4. Publicações onde o advogado monitorado figura como representante ativo.

Descarte publicações meramente informativas ou de processos arquivados, a menos que haja reativação.
Sua saída deve ser estruturada para facilitar a triagem pela Mrs. Justin-e.`;

export function generateAnalysisPrompt(oab: string, publicacoesRaw: string): string {
  return `Analise as publicações abaixo encontradas para a OAB ${oab}.
Identifique a relevância de cada uma e sugira a prioridade de triagem.

PUBLICAÇÕES ENCONTRADAS:
${publicacoesRaw}`;
}

export function formatErrorMessage(error: string): string {
  return `Erro no monitoramento do DJEN: ${error}`;
}