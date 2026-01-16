import { z } from 'zod';
import { ai } from './genkit';

/**
 * Avaliador de Conformidade de Pedidos
 * Verifica se a petição gerada cumpre os requisitos essenciais do CPC/15.
 */
export const petitionEvaluator = ai.defineEvaluator(
  {
    name: 'petitionEvaluator',
    displayName: 'Validador de Pedidos Obrigatórios',
    definition:
      'Avalia se uma petição jurídica contém todos os elementos obrigatórios (citação, procedência, provas, valor da causa, custas/honorários).',
  },
  async (input, output) => {
    const result = await ai.generate({
      prompt: `Você é um Auditor Jurídico Sênior. Sua tarefa é avaliar se a petição gerada contém todos os elementos obrigatórios de uma peça processual no Brasil.
      
      Critérios de Avaliação:
      1. Pedido de citação da parte ré.
      2. Pedido de procedência total da ação.
      3. Especificação das provas que pretende produzir.
      4. Indicação do valor da causa.
      5. Pedido de condenação em custas e honorários.
      
      Petição a avaliar:
      ${output.answer}
      
      Retorne um score de 0 a 1, onde:
      - 1.0: Todos os 5 itens estão presentes e claros.
      - 0.8: 4 itens presentes.
      - 0.6: 3 itens presentes.
      - 0.4: 2 itens presentes.
      - 0.2: 1 item presente.
      - 0.0: Nenhum item identificado.
      
      Forneça também uma justificativa curta para a nota.`,
      output: {
        schema: z.object({
          score: z.number().min(0).max(1),
          reasoning: z.string(),
        }),
      },
    });

    const score = result.output?.score ?? 0;
    return {
      testCaseId: input.testCaseId ?? 'petition-evaluator',
      evaluation: {
        status: score >= 0.6 ? 'PASS' : 'FAIL',
        score,
        details: { reasoning: result.output?.reasoning ?? 'Erro na análise' },
      },
    };
  }
);
