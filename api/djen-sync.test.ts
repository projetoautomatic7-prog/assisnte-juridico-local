import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './djen-sync';

// Mock dependencies
vi.mock('@upstash/redis');
vi.mock('@sentry/node', () => ({
  startSpan: vi.fn((_, cb) => cb({ setAttribute: vi.fn(), setStatus: vi.fn() })),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api/djen-sync', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let jsonMock: any;
  let statusMock: any;
  let setHeaderMock: any;
  let redisGetMock: any;
  let redisSetMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    redisGetMock = vi.fn();
    redisSetMock = vi.fn();
    (Redis as unknown as any).mockImplementation(function(this: any) {
      this.get = redisGetMock;
      this.set = redisSetMock;
      return this;
    });
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, end: vi.fn() });
    setHeaderMock = vi.fn();

    req = {
      method: 'POST',
      headers: {},
      url: '/api/djen-sync',
    };
    res = {
      status: statusMock,
      setHeader: setHeaderMock,
      json: jsonMock,
      end: vi.fn(),
    } as unknown as VercelResponse;

    process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock';
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('should sync publications for monitored lawyers', async () => {
    const mockLawyers = [{
      id: 'l1',
      name: 'Test Lawyer',
      oab: '123456/SP',
      enabled: true,
      tribunals: ['TJSP']
    }];

    redisGetMock.mockResolvedValue(mockLawyers);

    // Mock DJEN API response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        count: 1,
        items: [{
          id: 1,
          data_disponibilizacao: '2025-01-01',
          siglaTribunal: 'TJSP',
          tipoComunicacao: 'Intimação',
          texto: 'Conteúdo da intimação teste',
          numero_processo: '0000000-00.2025.8.26.0000',
          destinatarioadvogados: [{
            advogado: { nome: 'Test Lawyer', numero_oab: '123456', uf_oab: 'SP' }
          }]
        }]
      }),
      headers: { get: () => null }
    });

    await handler(req as VercelRequest, res as VercelResponse);

    // Verifica se salvou a publicação no Redis
    expect(redisSetMock).toHaveBeenCalledWith(
      expect.stringContaining('publications'),
      expect.arrayContaining([
        expect.objectContaining({
          djenId: 1,
          tribunal: 'TJSP',
          teor: 'Conteúdo da intimação teste'
        })
      ])
    );

    expect(statusMock).toHaveBeenCalledWith(200);
  });
});