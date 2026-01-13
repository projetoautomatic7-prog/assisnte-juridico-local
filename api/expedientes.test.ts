import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './expedientes';
import { requireApiKey } from './lib/auth.js';
import { rateLimitMiddleware } from './lib/rate-limit.js';

// Mock dependencies
vi.mock('@upstash/redis');
vi.mock('./lib/auth.js');
vi.mock('./lib/rate-limit.js');

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api/expedientes', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let jsonMock: any;
  let statusMock: any;
  let setHeaderMock: any;
  let redisGetMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Redis mock
    redisGetMock = vi.fn();
    // Mock implementation of Redis constructor
    (Redis as unknown as any).mockImplementation(() => ({
      get: redisGetMock,
    }));

    // Setup Request/Response mocks
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, end: vi.fn() });
    setHeaderMock = vi.fn();

    req = {
      method: 'GET',
      query: {},
      headers: {},
      url: '/api/expedientes',
    };

    res = {
      status: statusMock,
      setHeader: setHeaderMock,
      json: jsonMock,
      end: vi.fn(),
    } as unknown as VercelResponse;

    // Default auth mock
    (requireApiKey as any).mockReturnValue(true);

    // Default rate limit mock
    (rateLimitMiddleware as any).mockResolvedValue({
      allowed: true,
      headers: {},
    });
    
    // Environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('GET /api/expedientes returns list of publications', async () => {
    const mockPublications = [
      {
        id: '1',
        tipo: 'Intimação',
        teor: 'Conteúdo teste',
        createdAt: new Date().toISOString(),
        notified: false,
        lawyerId: 'lawyer1',
        lawyerName: 'Advogado Teste',
        tribunal: 'TJMG'
      },
    ];
    redisGetMock.mockResolvedValue(mockPublications);

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      count: 1,
      expedientes: expect.arrayContaining([
        expect.objectContaining({ id: '1', content: 'Conteúdo teste' })
      ])
    }));
  });

  it('GET /api/expedientes filters by lawyerId', async () => {
    req.query = { lawyerId: 'lawyer1' };
    const mockPublications = [
      { id: '1', lawyerId: 'lawyer1', createdAt: new Date().toISOString() },
      { id: '2', lawyerId: 'lawyer2', createdAt: new Date().toISOString() },
    ];
    redisGetMock.mockResolvedValue(mockPublications);

    await handler(req as VercelRequest, res as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      count: 1,
      expedientes: expect.arrayContaining([
        expect.objectContaining({ id: '1' })
      ])
    }));
    // Ensure id 2 is not present
    const expedientes = jsonMock.mock.calls[0][0].expedientes;
    expect(expedientes).toHaveLength(1);
    expect(expedientes[0].id).toBe('1');
  });

  it('POST /api/expedientes/sync triggers sync via cron', async () => {
    req.method = 'POST';
    req.query = { action: 'sync' };
    
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
      catch: () => {return {}},
    });

    await handler(req as VercelRequest, res as VercelResponse);

    expect(requireApiKey).toHaveBeenCalledWith(res, req, 'DJEN_SYNC_API_KEY');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/cron?action=djen-monitor'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('GET /api/expedientes?action=sync triggers sync (for cron)', async () => {
    req.method = 'GET';
    req.query = { action: 'sync' };
    
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
      catch: () => {return {}},
    });

    await handler(req as VercelRequest, res as VercelResponse);

    // Should behave like POST sync but allowed via GET for cron
    expect(requireApiKey).toHaveBeenCalledWith(res, req, 'DJEN_SYNC_API_KEY');
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('GET /api/expedientes?action=pending delegates to djen-sync', async () => {
    req.method = 'GET';
    req.query = { action: 'pending' };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ intimacao: { id: '123' } }),
    });

    await handler(req as VercelRequest, res as VercelResponse);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/djen-sync'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ mode: 'next-pending' })
      })
    );
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      intimacao: { id: '123' }
    }));
  });

  it('GET /api/expedientes filters by status=unread', async () => {
    req.query = { status: 'unread' };
    const mockPublications = [
      { id: '1', notified: true, createdAt: new Date().toISOString() },
      { id: '2', notified: false, createdAt: new Date().toISOString() },
    ];
    redisGetMock.mockResolvedValue(mockPublications);

    await handler(req as VercelRequest, res as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      count: 1,
    }));
    const expedientes = jsonMock.mock.calls[0][0].expedientes;
    expect(expedientes).toHaveLength(1);
    expect(expedientes[0].id).toBe('2');
  });

  it('POST /api/expedientes/sync returns 429 if rate limited', async () => {
    req.method = 'POST';
    req.url = '/api/expedientes/sync';
    (rateLimitMiddleware as any).mockResolvedValue({
      allowed: false,
      headers: { 'X-RateLimit-Reset': Date.now() + 1000 },
      error: 'Too many requests'
    });

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(429);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Too many requests' });
  });

  it('POST /api/expedientes/sync fails with invalid API key', async () => {
    req.method = 'POST';
    req.url = '/api/expedientes/sync';
    // Let the mock return false, and check that the handler respects it.
    (requireApiKey as any).mockImplementation(() => false);

    const result = await handler(req as VercelRequest, res as VercelResponse);

    // The requireApiKey mock is responsible for sending the response, so we
    // check that our handler correctly returns that response object.
    expect(result).toBe(res);
  });
  
  it('handles OPTIONS preflight request', async () => {
    req.method = 'OPTIONS';
    await handler(req as VercelRequest, res as VercelResponse);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
  });

  it('returns 500 if Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    
    // Reset the singleton so it has to re-initialize
    vi.resetModules();
    const handlerWithoutRedis = (await import('./expedientes')).default;

    await handlerWithoutRedis(req as VercelRequest, res as VercelResponse);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Upstash Redis not configured'
    }));
  });

  it('POST /api/expedientes/sync (path based) triggers sync', async () => {
    req.method = 'POST';
    req.url = '/api/expedientes/sync'; // No action query param
    
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
      catch: () => {return {}},
    });

    await handler(req as VercelRequest, res as VercelResponse);

    expect(requireApiKey).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('GET /api/expedientes sorts by date and respects limit', async () => {
    req.query = { limit: '1' };
    const mockPublications = [
      { id: '1', createdAt: new Date('2023-01-01').toISOString() },
      { id: '2', createdAt: new Date('2023-01-02').toISOString() },
    ];
    redisGetMock.mockResolvedValue(mockPublications);

    await handler(req as VercelRequest, res as VercelResponse);
    
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    const expedientes = jsonMock.mock.calls[0][0].expedientes;
    expect(expedientes).toHaveLength(1);
    expect(expedientes[0].id).toBe('2'); // The most recent one
  });

  it('GET /api/expedientes handles no publications found', async () => {
    redisGetMock.mockResolvedValue([]); // No publications in DB
    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      count: 0,
      expedientes: [],
    }));
  });
});
