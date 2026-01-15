/**
 * Genkit Demo - Exemplo simples para testar a integração MCP
 * 
 * Para executar:
 * genkit start -- npx tsx --watch lib/ai/genkit-demo.ts
 */

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Configuração básica do Genkit
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});

/**
 * Flow 1: Análise Jurídica Simples
 */
export const analisarTextoJuridicoFlow = ai.defineFlow(
  {
    name: 'analisarTextoJuridico',
    inputSchema: z.object({
      texto: z.string().describe('Texto jurídico para analisar'),
      tipo: z.enum(['peticao', 'contrato', 'sentenca']).describe('Tipo do documento'),
    }),
    outputSchema: z.object({
      resumo: z.string(),
      pontosPrincipais: z.array(z.string()),
      recomendacoes: z.array(z.string()),
    }),
  },
  async (input) => {
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'),
      prompt: `
Você é um assistente jurídico especializado.

Analise o seguinte documento do tipo "${input.tipo}":

${input.texto}

Forneça:
1. Um resumo objetivo
2. Os pontos principais (3-5 itens)
3. Recomendações práticas (2-3 itens)
      `.trim(),
      config: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    });

    // Parse simples da resposta
    const texto = response.text;
    const linhas = texto.split('\n').filter(l => l.trim());

    return {
      resumo: linhas[0] || 'Análise concluída',
      pontosPrincipais: linhas.slice(1, 4).map(l => l.replace(/^[*-]\s*/, '')),
      recomendacoes: linhas.slice(4, 6).map(l => l.replace(/^[*-]\s*/, '')),
    };
  }
);

/**
 * Flow 2: Geração de Minuta
 */
export const gerarMinutaFlow = ai.defineFlow(
  {
    name: 'gerarMinuta',
    inputSchema: z.object({
      tipo: z.enum(['peticao_inicial', 'contestacao', 'recurso']),
      partes: z.object({
        autor: z.string(),
        reu: z.string().optional(),
      }),
      fatos: z.string().describe('Descrição dos fatos'),
      pedidos: z.array(z.string()).describe('Lista de pedidos'),
    }),
    outputSchema: z.string().describe('Minuta gerada'),
  },
  async (input) => {
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'),
      prompt: `
Você é um advogado especializado em redação jurídica.

Gere uma ${input.tipo} com as seguintes informações:

**Partes:**
- Autor: ${input.partes.autor}
${input.partes.reu ? `- Réu: ${input.partes.reu}` : ''}

**Fatos:**
${input.fatos}

**Pedidos:**
${input.pedidos.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Forneça uma minuta completa e profissional seguindo as normas processuais brasileiras.
      `.trim(),
      config: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    });

    return response.text;
  }
);

/**
 * Flow 3: Consulta Rápida
 */
export const consultaRapidaFlow = ai.defineFlow(
  {
    name: 'consultaRapida',
    inputSchema: z.string().describe('Pergunta jurídica'),
    outputSchema: z.string().describe('Resposta'),
  },
  async (pergunta) => {
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'),
      prompt: `Você é um assistente jurídico. Responda de forma clara e objetiva:\n\n${pergunta}`,
      config: {
        temperature: 0.5,
        maxOutputTokens: 1000,
      },
    });

    return response.text;
  }
);

console.log('✅ Genkit Demo inicializado com 3 flows:');
console.log('   1. analisarTextoJuridico');
console.log('   2. gerarMinuta');
console.log('   3. consultaRapida');
console.log('\n📊 Acesse: http://localhost:4000');
