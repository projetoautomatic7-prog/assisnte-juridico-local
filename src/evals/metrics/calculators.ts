/**
 * Metric Calculators - Cálculo de métricas de qualidade
 *
 * Implementa 3 métricas principais:
 * 1. Accuracy: Precisão estrutural (campos corretos)
 * 2. Relevance: Relevância semântica (conteúdo similar)
 * 3. Completeness: Completude (todos campos presentes)
 */

// ===========================
// 1. Accuracy (Precisão)
// ===========================

/**
 * Calcula accuracy comparando estrutura e valores
 *
 * Algoritmo:
 * - Compara cada campo do expected com actual
 * - Conta matches (valor idêntico ou muito similar)
 * - Retorna: matches / total_fields
 *
 * @returns número entre 0-1 (0% a 100% de precisão)
 */
export async function calculateAccuracy(actual: unknown, expected: unknown): Promise<number> {
  if (typeof actual !== "object" || typeof expected !== "object") {
    return actual === expected ? 1.0 : 0.0;
  }

  if (actual === null || expected === null) {
    return actual === expected ? 1.0 : 0.0;
  }

  const expectedObj = expected as Record<string, unknown>;
  const actualObj = actual as Record<string, unknown>;

  let totalFields = 0;
  let matches = 0;

  for (const [key, expectedValue] of Object.entries(expectedObj)) {
    totalFields++;

    const actualValue = actualObj[key];

    // Comparar valores
    if (isMatch(actualValue, expectedValue)) {
      matches++;
    } else if (typeof expectedValue === "string" && typeof actualValue === "string") {
      // Comparação fuzzy para strings (permite pequenas diferenças)
      const similarity = calculateStringSimilarity(actualValue, expectedValue);
      if (similarity > 0.8) {
        matches += similarity;
      }
    } else if (Array.isArray(expectedValue) && Array.isArray(actualValue)) {
      // Comparação de arrays
      const arraySim = calculateArraySimilarity(actualValue, expectedValue);
      matches += arraySim;
    }
  }

  return totalFields > 0 ? matches / totalFields : 0;
}

/**
 * Verifica se dois valores são considerados equivalentes
 */
function isMatch(actual: unknown, expected: unknown): boolean {
  // Valores primitivos
  if (actual === expected) return true;

  // Ambos null/undefined
  if ((actual === null || actual === undefined) && (expected === null || expected === undefined)) {
    return true;
  }

  // Números (com tolerância de 0.01%)
  if (typeof actual === "number" && typeof expected === "number") {
    const diff = Math.abs(actual - expected);
    const relative = diff / Math.max(Math.abs(expected), 1);
    return relative < 0.0001;
  }

  // Strings (case-insensitive, trim)
  if (typeof actual === "string" && typeof expected === "string") {
    return actual.trim().toLowerCase() === expected.trim().toLowerCase();
  }

  // Booleanos
  if (typeof actual === "boolean" && typeof expected === "boolean") {
    return actual === expected;
  }

  return false;
}

/**
 * Calcula similaridade entre strings (Levenshtein distance normalizado)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Levenshtein distance (edit distance)
 */
function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calcula similaridade entre arrays
 */
function calculateArraySimilarity(arr1: unknown[], arr2: unknown[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1.0;
  if (arr1.length === 0 || arr2.length === 0) return 0.0;

  // Conta quantos items de arr2 estão em arr1
  let matches = 0;
  for (const expected of arr2) {
    for (const actual of arr1) {
      if (isMatch(actual, expected)) {
        matches++;
        break;
      }
    }
  }

  return matches / arr2.length;
}

// ===========================
// 2. Relevance (Relevância)
// ===========================

/**
 * Calcula relevância semântica do conteúdo
 *
 * Algoritmo simplificado (sem embeddings):
 * - Extrai palavras-chave importantes do expected
 * - Verifica quantas aparecem no actual
 * - Retorna: keywords_found / total_keywords
 *
 * TODO: Implementar com embeddings reais (OpenAI/Gemini) para melhor precisão
 *
 * @returns número entre 0-1 (0% a 100% de relevância)
 */
export async function calculateRelevance(actual: unknown, expected: unknown): Promise<number> {
  // Converter para strings
  const actualStr = JSON.stringify(actual).toLowerCase();
  const expectedStr = JSON.stringify(expected).toLowerCase();

  // Extrair keywords importantes (palavras com 4+ caracteres, excluindo stopwords)
  const stopwords = new Set([
    "para",
    "com",
    "sem",
    "por",
    "de",
    "da",
    "do",
    "em",
    "na",
    "no",
    "ao",
    "aos",
    "das",
    "dos",
  ]);

  const keywords = expectedStr
    .split(/\W+/)
    .filter((word) => word.length >= 4 && !stopwords.has(word))
    .filter((word, index, self) => self.indexOf(word) === index); // unique

  if (keywords.length === 0) return 1.0;

  // Contar quantas keywords aparecem no actual
  const foundKeywords = keywords.filter((kw) => actualStr.includes(kw));

  return foundKeywords.length / keywords.length;
}

// ===========================
// 3. Completeness (Completude)
// ===========================

/**
 * Calcula completude verificando se todos os campos obrigatórios estão presentes
 *
 * Algoritmo:
 * - Lista todos os campos do expected
 * - Verifica se existem no actual
 * - Retorna: fields_present / total_fields
 *
 * @returns número entre 0-1 (0% a 100% de completude)
 */
export async function calculateCompleteness(actual: unknown, expected: unknown): Promise<number> {
  if (typeof expected !== "object" || expected === null) {
    return actual !== null && actual !== undefined ? 1.0 : 0.0;
  }

  if (typeof actual !== "object" || actual === null) {
    return 0.0;
  }

  const expectedObj = expected as Record<string, unknown>;
  const actualObj = actual as Record<string, unknown>;

  const requiredFields = Object.keys(expectedObj);
  if (requiredFields.length === 0) return 1.0;

  let presentFields = 0;

  for (const field of requiredFields) {
    const actualValue = actualObj[field];

    // Campo está presente se:
    // 1. Existe e não é null/undefined
    // 2. Ou é array vazio (mas existe)
    // 3. Ou é string vazia (mas existe)
    if (actualValue !== null && actualValue !== undefined) {
      presentFields++;
    } else if (Array.isArray(actualValue) && actualValue.length === 0) {
      // Array vazio conta como presente (mas pode afetar accuracy)
      presentFields++;
    } else if (typeof actualValue === "string" && actualValue === "") {
      // String vazia conta como presente (mas pode afetar accuracy)
      presentFields++;
    }
  }

  return presentFields / requiredFields.length;
}

// ===========================
// Helpers
// ===========================

/**
 * Calcula todas as métricas de uma vez
 */
export async function calculateAllMetrics(
  actual: unknown,
  expected: unknown
): Promise<{
  accuracy: number;
  relevance: number;
  completeness: number;
}> {
  const [accuracy, relevance, completeness] = await Promise.all([
    calculateAccuracy(actual, expected),
    calculateRelevance(actual, expected),
    calculateCompleteness(actual, expected),
  ]);

  return { accuracy, relevance, completeness };
}

/**
 * Formata métrica como porcentagem
 */
export function formatMetric(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Determina se métricas passam nos thresholds
 */
export function metricsPass(
  metrics: {
    accuracy: number;
    relevance: number;
    completeness: number;
  },
  thresholds: {
    accuracy: number;
    relevance: number;
    completeness: number;
  } = {
    accuracy: 0.85,
    relevance: 0.9,
    completeness: 0.95,
  }
): boolean {
  return (
    metrics.accuracy >= thresholds.accuracy &&
    metrics.relevance >= thresholds.relevance &&
    metrics.completeness >= thresholds.completeness
  );
}
