/**
 * Genkit - Todos os Flows do Assistente Jurídico
 * 
 * Este arquivo carrega TODOS os flows reais do seu app para o Genkit UI
 * Para executar: npm run genkit:watch
 */

// Importa todos os flows do app
export { petitionFlow } from './petition-flow';
export { indexDocumentFlow } from './rag-flow';
export { justineFlow } from './justine-flow';
export { researchFlow } from './research-flow';
export { riskAnalysisFlow } from './risk-flow';
export { strategyFlow } from './strategy-flow';
export { agentFlow } from './agent-flow';

// Importa flows de agentes específicos se existirem
try {
  const agentFlow = require('./agent-flow');
  if (agentFlow) {
    module.exports = { ...module.exports, ...agentFlow };
  }
} catch (e) {
  // Ignora se não existir
}

console.log(`
✅ Flows do Assistente Jurídico carregados:
   1. petitionFlow - Redação de Petições
   2. indexDocumentFlow - Indexação RAG
   3. justineFlow - Orquestradora Justine
   4. researchFlow - Pesquisa Jurisprudencial
   5. riskAnalysisFlow - Análise de Risco
   6. strategyFlow - Estratégia Processual
   7. agentFlow - Agente Genérico

📊 Acesse: http://localhost:4000
`);
