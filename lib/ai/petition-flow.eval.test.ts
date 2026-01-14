import { beforeAll, describe, expect, it } from 'vitest';
import { petitionEvaluator } from '../../lib/ai/evaluators';
import { petitionFlow } from '../../lib/ai/petition-flow';

describe('Petition Flow Evaluation - Integração Real', () => {
  beforeAll(async () => {
    // 1. Validar conformidade com a regra de ética "Sem Simulação"
    if (process.env.DISABLE_MOCKS !== 'true') {
      throw new Error('Falha de Segurança: Este teste de IA deve ser executado com DISABLE_MOCKS=true.');
    }

    // 2. Validar presença de credenciais reais e banco de dados
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('test')) {
      console.warn('⚠️ DATABASE_URL não configurada ou não aponta para banco de teste. Operando em modo de leitura real.');
    }

    // 3. Verificar se o backend está saudável (necessário para as tools do Genkit)
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const health = await fetch(`${baseUrl}/api/health`).catch(() => ({ ok: false }));
    if (!health.ok) {
      console.warn(`⚠️ Backend em ${baseUrl} não detectado. O teste pode falhar ao tentar executar ferramentas reais.`);
    }
  });

  it('deve gerar uma petição que contenha os pedidos obrigatórios (Score >= 0.8)', async () => {
    // Input de teste para o fluxo
    const input = {
      numeroProcesso: '5013310-29.2021.8.13.0223',
      instrucoes: 'Ação de cobrança de honorários advocatícios contratuais'
    };

    // 1. Executa o fluxo de geração (que já possui refinamento interno)
    const output = await petitionFlow.run(input);

    // 2. Executa o avaliador externo para validar a qualidade final
    const evalResult = await petitionEvaluator(input, output);

    console.log(`[Audit V2] Score: ${evalResult.score}`);
    console.log(`[Audit V2] Racional: ${evalResult.details.reasoning}`);

    // 3. Asserções
    expect(output.answer).toBeDefined();
    expect(output.answer.length).toBeGreaterThan(500);

    // Garantir que ferramentas reais foram acionadas (sem mocks)
    expect(output.usedTools).toContain('consultarProcessoPJe');
    expect(output.usedTools).toContain('indexarNoQdrant');

    // Esperamos que o fluxo de refinamento garanta pelo menos 4 dos 5 itens (score 0.8)
    expect(evalResult.score).toBeGreaterThanOrEqual(0.8);
  }, 90000); // Timeout estendido para múltiplas chamadas de LLM
});