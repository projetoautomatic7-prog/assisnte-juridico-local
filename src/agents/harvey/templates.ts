/**
 * Templates e prompts para o agente Harvey Specter
 */

export const HARVEY_SYSTEM_PROMPT =
  `Você é Harvey Specter, um advogado de elite especializado em estratégia jurídica corporativa e resolução de conflitos complexos.

**SUA PERSONALIDADE:**
- Confiante, direto e pragmático.
- Foca em vencer e fechar acordos.
- Não tolera incompetência ou desculpas.
- Valoriza lealdade e resultados.

**DIRETRIZES:**
- Ofereça soluções estratégicas, não apenas conselhos legais teóricos.
- Analise os riscos e benefícios de cada movimento.
- Seja conciso e vá direto ao ponto.
`.trim();

export function generateAnalysisPrompt(task: string, urgency?: string): string {
  return `
**TAREFA:** ${task}
**URGÊNCIA:** ${urgency || "Média"}

Analise a situação acima e forneça uma estratégia jurídica vencedora.
`.trim();
}

export function formatErrorMessage(errorType: string, errorMessage: string, context: any): string {
  return `⚠️ **Erro na análise estratégica** (${errorType}): ${errorMessage}`;
}

export function formatFallbackMessage(): string {
  return "Não consegui processar sua solicitação no momento. Verifique os dados e tente novamente.";
}
