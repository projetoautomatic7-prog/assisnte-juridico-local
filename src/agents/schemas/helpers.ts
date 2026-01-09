/**
 * Helper Functions para Structured Outputs
 *
 * Funções reutilizáveis para parsing e formatação de structured outputs
 * dos agentes jurídicos.
 *
 * Baseado em: OpenAI Cookbook - Structured Outputs Multi-Agent
 */

import { z } from "zod";
import { validateAgentOutput, StructuredOutputValidationError } from "./index";

/**
 * Extrai JSON de uma resposta de LLM que pode conter markdown
 */
export function extractJSON(text: string): string {
  // Tentar extrair JSON de blocos markdown
  const markdownMatch = text.match(/```json\s*\n?([\s\S]*?)\n?```/);
  if (markdownMatch) {
    return markdownMatch[1].trim();
  }

  // Tentar encontrar objeto JSON no texto
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // Retornar texto original se não encontrar JSON
  return text;
}

/**
 * Tenta parsear e validar output estruturado, com fallback
 */
export function parseStructuredOutput<T extends z.ZodType>(
  schema: T,
  responseText: string,
  agentName: string
): {
  success: boolean;
  data?: z.infer<T>;
  rawText: string;
  useStructuredFormat: boolean;
} {
  try {
    const jsonText = extractJSON(responseText);
    const parsedJson = JSON.parse(jsonText);
    const validatedData = validateAgentOutput(schema, parsedJson);

    return {
      success: true,
      data: validatedData,
      rawText: responseText,
      useStructuredFormat: true,
    };
  } catch (error) {
    console.warn(`[${agentName}] Structured output parsing failed:`, error);

    return {
      success: false,
      rawText: responseText,
      useStructuredFormat: false,
    };
  }
}

/**
 * Formata lista como markdown
 */
export function formatList(items: string[], ordered: boolean = true): string {
  return items.map((item, i) => `${ordered ? `${i + 1}.` : "-"} ${item}`).join("\n");
}

/**
 * Formata seção com título
 */
export function formatSection(title: string, content: string, emoji?: string): string {
  const titleWithEmoji = emoji ? `${emoji} ${title}` : `## ${title}`;
  return `${titleWithEmoji}\n\n${content}\n`;
}

/**
 * Formata tabela simples
 */
export function formatTable(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const dataRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");

  return `${headerRow}\n${separator}\n${dataRows}`;
}

/**
 * Formata valor monetário em BRL
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata data ISO para PT-BR
 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("pt-BR");
  } catch {
    return isoDate;
  }
}

/**
 * Badge de prioridade/severidade
 */
export function formatBadge(level: "alta" | "media" | "baixa", label: string): string {
  const emoji = {
    alta: "🔴",
    media: "🟡",
    baixa: "🟢",
  };

  return `${emoji[level]} **${label}**`;
}
