import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './cron';

// Mock dependencies
vi.mock('@upstash/redis');

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api/cron', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let jsonMock: any;
  let statusMock: any;
  let redisGetMock: any;
  let redisSetMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    redisGetMock = vi.fn();
    redisSetMock = vi.fn();
    (Redis as unknown as any).mockImplementation(() => ({
      get: redisGetMock,
      set: redisSetMock,
    }));

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock, end: vi.fn() });

    req = {
      method: 'POST',
      query: {},
      headers: {
        'x-vercel-cron': 'true', // Simula chamada autorizada pelo Vercel Cron
      },
      url: '/api/cron',
    };

    res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as VercelResponse;

    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('should return 401 if unauthorized', async () => {
    req.headers = {}; // Remove auth header
    await handler(req as VercelRequest, res as VercelResponse);
    expect(statusMock).toHaveBeenCalledWith(401);
  });

  it('should return 400 for invalid action', async () => {
    req.query = { action: 'invalid-action' };
    await handler(req as VercelRequest, res as VercelResponse);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('action=daily-reset should reset agent counters', async () => {
    req.query = { action: 'daily-reset' };

    const mockAgents = [
      { id: 'agent1', tasksToday: 5, enabled: true },
      { id: 'agent2', tasksToday: 10, enabled: true }
    ];

    // Mock getAgents e getCompletedTasks
    redisGetMock.mockResolvedValueOnce(mockAgents);
    redisGetMock.mockResolvedValueOnce([]);

    await handler(req as VercelRequest, res as VercelResponse);

    expect(redisSetMock).toHaveBeenCalledWith(
      'autonomous-agents',
      expect.arrayContaining([
        expect.objectContaining({ id: 'agent1', tasksToday: 0 }),
        expect.objectContaining({ id: 'agent2', tasksToday: 0 })
      ])
    );
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('action=process-agent-queue should process pending tasks', async () => {
    req.query = { action: 'process-agent-queue' };

    const mockQueue = [
      { id: 'task1', status: 'pending', agentId: 'agent1' }
    ];
    const mockAgents = [{ id: 'agent1', enabled: true }];

    // Mock sequence of redis calls
    redisGetMock.mockImplementation((key: string) => {
      if (key === 'agent-task-queue') return Promise.resolve(mockQueue);
      if (key === 'autonomous-agents') return Promise.resolve(mockAgents);
      return Promise.resolve(null);
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true })
    });

    await handler(req as VercelRequest, res as VercelResponse);

    // Verifica se delegou o processamento para a API de agentes
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/agents?action=process-task'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('task1')
      })
    );

    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('action=djen-monitor should run successfully', async () => {
    req.query = { action: 'djen-monitor' };
    
    const mockLawyers = [{ id: 'l1', name: 'Test Lawyer', oab: '123', enabled: true }];
    redisGetMock.mockImplementation((key: string) => {
      if (key === 'monitored-lawyers') return Promise.resolve(mockLawyers);
      return Promise.resolve(null);
    });

    // Mock DJEN response
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: () => Promise.resolve({ items: [] })
    });

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      message: 'DJEN monitor cron executed successfully'
    }));
  });
});