/**
 * Adaptador para o Plugin AI Assistant do CKEditor 5
 * Conecta o editor aos fluxos Genkit do backend.
 */
export const genkitCKEditorAdapter = {
  async request(prompt: string, context: any) {
    // O 'context' pode vir do Expediente selecionado na sua UI
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'redacao-peticoes',
        numeroProcesso: context.processNumber,
        message: prompt, // Instrução adicional do advogado via chat do editor
      }),
    });

    if (!response.ok) throw new Error('Falha ao gerar minuta via Genkit');

    const data = await response.json();

    // Retornamos o conteúdo para o editor
    return {
      answer: data.answer
    };
  }
};

// Exemplo de inicialização no seu componente React de Minutas:
/*
ClassicEditor.create(document.querySelector('#editor'), {
    plugins: [ AIAssistant, ... ],
    aiAssistant: { adapter: genkitCKEditorAdapter }
});
*/