/**
 * Flow Protegido - Exemplo de Autorização no Genkit
 * 
 * Este arquivo demonstra diferentes níveis de proteção:
 * 1. Verificação de autenticação básica
 * 2. Verificação de UID (auto-acesso)
 * 3. Verificação de roles (admin)
 * 
 * Para testar:
 * genkit start -- npx tsx --watch lib/ai/flows/protected-flow.ts
 */

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Tipo customizado para erros amigáveis ao usuário
class UserFacingError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
  ],
});

/**
 * FLOW 1: Autenticação Básica
 * Apenas requer que o usuário esteja autenticado
 */
export const consultaPublica = ai.defineFlow(
  {
    name: 'consultaPublica',
    inputSchema: z.object({
      pergunta: z.string().describe('Pergunta jurídica'),
    }),
    outputSchema: z.string(),
  },
  async (input, { context }) => {
    // Verificar apenas se está autenticado
    if (!context.auth) {
      throw new UserFacingError('UNAUTHENTICATED', 'Você precisa estar logado para fazer consultas');
    }

    console.log(`✅ Usuário autenticado: ${context.auth.uid || 'unknown'}`);

    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'),
      prompt: `Responda de forma objetiva e profissional:\n\n${input.pergunta}`,
      config: { temperature: 0.3 },
    });

    return response.text;
  }
);

/**
 * FLOW 2: Auto-Acesso (UID)
 * Usuário só pode acessar seus próprios dados
 */
export const minhasIntimacoes = ai.defineFlow(
  {
    name: 'minhasIntimacoes',
    inputSchema: z.object({
      userId: z.string().describe('ID do usuário'),
      dataInicio: z.string().optional().describe('Data inicial (YYYY-MM-DD)'),
    }),
    outputSchema: z.array(
      z.object({
        numeroProcesso: z.string(),
        dataPublicacao: z.string(),
        prazo: z.string(),
        resumo: z.string(),
      })
    ),
  },
  async (input, { context }) => {
    // 1. Verificar autenticação
    if (!context.auth) {
      throw new UserFacingError('UNAUTHENTICATED', 'Autenticação necessária');
    }

    // 2. Verificar se userId corresponde ao usuário autenticado
    if (input.userId !== context.auth.uid) {
      throw new UserFacingError(
        'PERMISSION_DENIED',
        'Você só pode acessar suas próprias intimações'
      );
    }

    console.log(`✅ Acesso autorizado para usuário: ${input.userId}`);

    // 3. Simular busca de intimações (em produção, buscar do banco)
    const intimacoesMock = [
      {
        numeroProcesso: '0001234-56.2024.8.13.0001',
        dataPublicacao: '2024-01-10',
        prazo: '15 dias',
        resumo: 'Intimação para apresentar contestação',
      },
      {
        numeroProcesso: '0007890-12.2024.8.13.0001',
        dataPublicacao: '2024-01-12',
        prazo: '10 dias',
        resumo: 'Intimação para cumprimento de sentença',
      },
    ];

    return intimacoesMock;
  }
);

/**
 * FLOW 3: Verificação de Roles (Admin)
 * Apenas administradores podem executar
 */
export const relatorioGeral = ai.defineFlow(
  {
    name: 'relatorioGeral',
    inputSchema: z.object({
      periodo: z.enum(['hoje', 'semana', 'mes']),
      tipo: z.enum(['intimacoes', 'processos', 'usuarios']),
    }),
    outputSchema: z.object({
      total: z.number(),
      detalhes: z.array(z.record(z.string())),
      geradoEm: z.string(),
    }),
  },
  async (input, { context }) => {
    // 1. Verificar autenticação
    if (!context.auth) {
      throw new UserFacingError('UNAUTHENTICATED', 'Autenticação necessária');
    }

    // 2. Verificar se é admin
    // Firebase Auth coloca claims customizados em auth.token
    const isAdmin = context.auth.token?.['admin'] === true;

    if (!isAdmin) {
      throw new UserFacingError(
        'PERMISSION_DENIED',
        'Apenas administradores podem gerar relatórios gerais'
      );
    }

    console.log(`✅ Acesso admin autorizado para: ${context.auth.uid}`);

    // 3. Gerar relatório (mock)
    return {
      total: 42,
      detalhes: [
        { nome: 'Item 1', valor: '10' },
        { nome: 'Item 2', valor: '32' },
      ],
      geradoEm: new Date().toISOString(),
    };
  }
);

/**
 * FLOW 4: Contexto Compartilhado
 * Demonstra uso de ai.currentContext() em funções auxiliares
 */
async function buscarDadosProtegidos(numeroProcesso: string) {
  // Recuperar contexto em qualquer lugar do código
  const context = ai.currentContext();
  const userId = context?.auth?.uid;

  if (!userId) {
    throw new UserFacingError('UNAUTHENTICATED', 'Contexto de autenticação não encontrado');
  }

  console.log(`📂 Buscando dados do processo ${numeroProcesso} para usuário ${userId}`);

  // Simular verificação de acesso no banco de dados
  const temAcesso = true; // Em produção: await verificarAcessoUsuarioProcesso(userId, numeroProcesso)

  if (!temAcesso) {
    throw new UserFacingError('PERMISSION_DENIED', 'Sem acesso a este processo');
  }

  return {
    numeroProcesso,
    autor: 'João Silva',
    reu: 'Empresa XYZ',
    status: 'Em andamento',
  };
}

export const consultarProcesso = ai.defineFlow(
  {
    name: 'consultarProcesso',
    inputSchema: z.object({
      numeroProcesso: z.string(),
    }),
    outputSchema: z.object({
      numeroProcesso: z.string(),
      autor: z.string(),
      reu: z.string(),
      status: z.string(),
      analise: z.string(),
    }),
  },
  async (input, { context }) => {
    if (!context.auth) {
      throw new UserFacingError('UNAUTHENTICATED', 'Login necessário');
    }

    // Função auxiliar usa ai.currentContext() internamente
    const dadosProcesso = await buscarDadosProtegidos(input.numeroProcesso);

    // Analisar com Gemini
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'),
      prompt: `Analise o processo: ${JSON.stringify(dadosProcesso)}`,
    });

    return {
      ...dadosProcesso,
      analise: response.text,
    };
  }
);

// Logs de inicialização
console.log('✅ Flows Protegidos carregados:');
console.log('   1. consultaPublica - Requer autenticação básica');
console.log('   2. minhasIntimacoes - Requer UID correspondente');
console.log('   3. relatorioGeral - Requer role admin');
console.log('   4. consultarProcesso - Usa contexto compartilhado');
console.log('\n📚 Para testar com autenticação:');
console.log('   genkit flow:run minhasIntimacoes \'{"userId": "user-123"}\' --context \'{"auth": {"uid": "user-123"}}\'');
console.log('\n🌐 Genkit Dev UI: http://localhost:4000');
console.log('   Use a aba "Auth JSON" para simular autenticação');
