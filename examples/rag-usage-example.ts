/**
 * Exemplo Prático: Como usar o novo fluxo RAG no Assistente Jurídico
 * 
 * Este arquivo demonstra 3 cenários reais de uso:
 * 1. Indexar uma petição inicial longa
 * 2. Processar um PDF de sentença
 * 3. Buscar trechos relevantes usando o retriever
 */

import { indexDocumentFlow } from '../lib/ai/rag-flow';
import { processarPDF, indexarNoQdrant, pesquisarQdrant } from '../lib/ai/tools';

// ============================================
// Cenário 1: Indexar Petição Inicial Longa
// ============================================
async function exemploIndexarPeticao() {
  const peticaoCompleta = `
    EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE ...
    
    [... 5000 palavras de petição inicial ...]
    
    PROCESSO: 0001234-56.2024.8.13.0001
    
    Nestes termos, pede deferimento.
    Local, data.
    Advogado OAB/UF
  `;

  // O sistema automaticamente fragmenta em chunks de 500-1500 caracteres
  const resultado = await indexDocumentFlow({
    content: peticaoCompleta,
    metadata: {
      numeroProcesso: '0001234-56.2024.8.13.0001',
      tipo: 'petição_inicial',
      source: 'peticao-alimentos-2024.docx',
    },
  });

  console.log(`✅ Petição indexada em ${resultado.chunksIndexed} fragmentos`);
}

// ============================================
// Cenário 2: Processar PDF de Sentença
// ============================================
async function exemploProcessarPDF() {
  // Pode ser URL ou caminho local
  const resultado = await processarPDF({
    pdfUrl: '/uploads/sentencas/sentenca-123456.pdf',
    numeroProcesso: '0001234-56.2024.8.13.0001',
    tipo: 'sentença',
  });

  console.log(`✅ PDF processado:`);
  console.log(`   Texto extraído: ${resultado.extractedText.substring(0, 100)}...`);
  console.log(`   Fragmentos indexados: ${resultado.chunksIndexed}`);
}

// ============================================
// Cenário 3: Buscar Trechos Relevantes
// ============================================
async function exemploBuscarConteudo() {
  // A Justine agora pode fazer perguntas e receber apenas os trechos relevantes
  const resultados = await pesquisarQdrant({
    query: 'qual foi o valor da pensão alimentícia fixada?',
    numeroProcesso: '0001234-56.2024.8.13.0001',
    limit: 3,
  });

  console.log('📚 Trechos encontrados:');
  resultados.forEach((doc: any, i: number) => {
    console.log(`\n${i + 1}. [Score: ${doc.score}]`);
    console.log(`   ${doc.content.substring(0, 150)}...`);
  });
}

// ============================================
// Cenário 4: Uso Automático via indexarNoQdrant
// ============================================
async function exemploUsoAutomatico() {
  // A ferramenta agora detecta automaticamente se precisa de chunking
  
  // Texto curto (< 1500 chars): indexa direto
  await indexarNoQdrant({
    content: 'Jurisprudência sobre alimentos: STJ REsp 1234567...',
    metadata: { tipo: 'jurisprudencia', tribunal: 'STJ' },
  });

  // Texto longo (> 1500 chars): usa chunking automático
  await indexarNoQdrant({
    content: 'A' + ' muito longo...'.repeat(300), // > 1500 chars
    metadata: { 
      numeroProcesso: '0001234-56.2024.8.13.0001',
      tipo: 'acordo',
    },
  });
  // ↑ Esse será fragmentado automaticamente em múltiplos chunks
}

// ============================================
// Como a Justine Usa Internamente
// ============================================
console.log(`
🤖 Fluxo Interno da Justine (Mrs. Justine):

1. Cliente pergunta: "Como está o processo de alimentos?"

2. Justine usa pesquisarQdrant() para buscar:
   - Petição inicial (fragmentos relevantes)
   - Última sentença (trechos sobre valores)
   - Acordão de apelação (se houver)

3. Justine sintetiza apenas as partes relevantes e responde:
   "O processo 0001234-56.2024.8.13.0001 teve sentença proferida 
    em 15/01/2024, fixando alimentos em 30% do salário mínimo..."

💡 Economia de tokens: Enviou 300 tokens ao invés de 10.000!
`);

// Executar exemplos (descomente para testar)
// exemploIndexarPeticao();
// exemploProcessarPDF();
// exemploBuscarConteudo();
// exemploUsoAutomatico();
