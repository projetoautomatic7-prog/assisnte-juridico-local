import { describe, it, expect, vi } from 'vitest';
import { indexDocumentFlow } from './rag-flow';
import { GenkitError } from '@genkit-ai/core';

describe('RAG Flow - Ingestão de Documentos', () => {
  it('deve fragmentar documento longo em chunks', async () => {
    // Mock do fetch para evitar chamada real à API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const documentoLongo = 'Lorem ipsum '.repeat(200); // ~2400 caracteres
    
    const resultado = await indexDocumentFlow.run({
      content: documentoLongo,
      metadata: {
        numeroProcesso: '0001234-56.2024.8.13.0001',
        tipo: 'petição',
        source: 'teste.pdf',
      },
    });

    expect(resultado.success).toBe(true);
    expect(resultado.chunksIndexed).toBeGreaterThan(1);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('deve preservar metadados em todos os chunks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock;

    await indexDocumentFlow.run({
      content: 'Texto curto. '.repeat(150),
      metadata: {
        numeroProcesso: '0001234-56.2024.8.13.0001',
        tipo: 'sentença',
      },
    });

    // Verifica se todos os chunks têm os metadados
    const calls = fetchMock.mock.calls;
    calls.forEach(call => {
      const body = JSON.parse(call[1].body);
      expect(body.metadata.numeroProcesso).toBe('0001234-56.2024.8.13.0001');
      expect(body.metadata.tipo).toBe('sentença');
      expect(body.metadata.indexedAt).toBeDefined();
    });
  });

  it('deve respeitar limites de tamanho do chunk', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock;

    const documentoGrande = 'A '.repeat(3000); // 6000 caracteres

    await indexDocumentFlow.run({
      content: documentoGrande,
      metadata: {
        numeroProcesso: 'TESTE',
        tipo: 'teste',
      },
    });

    // Cada chunk deve ter entre 500 e 1500 caracteres
    const calls = fetchMock.mock.calls;
    calls.forEach(call => {
      const body = JSON.parse(call[1].body);
      expect(body.content.length).toBeGreaterThanOrEqual(400); // com margem
      expect(body.content.length).toBeLessThanOrEqual(1600); // com overlap
    });
  });

  it('deve lançar GenkitError quando conteúdo está vazio', async () => {
    await expect(
      indexDocumentFlow.run({
        content: '',
        metadata: {
          numeroProcesso: 'TESTE',
          tipo: 'teste',
        },
      })
    ).rejects.toThrow(GenkitError);
  });

  it('deve lançar GenkitError quando API do Qdrant falha', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(
      indexDocumentFlow.run({
        content: 'Teste de erro. '.repeat(100),
        metadata: {
          numeroProcesso: 'TESTE',
          tipo: 'teste',
        },
      })
    ).rejects.toThrow(GenkitError);
  });

  it('deve retornar erro no output quando indexação parcial falha', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });
    });

    await expect(
      indexDocumentFlow.run({
        content: 'Texto longo. '.repeat(300),
        metadata: {
          numeroProcesso: 'TESTE',
          tipo: 'teste',
        },
      })
    ).rejects.toThrow(GenkitError);
  });
});
