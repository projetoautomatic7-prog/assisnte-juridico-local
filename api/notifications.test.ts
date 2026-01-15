import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './notifications';

// Mock dependencies
vi.mock('@upstash/redis');

describe('api/notifications', () => {
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
      method: 'GET',
      query: {},
      headers: {},
      url: '/api/notifications',
    };

    res = {
      status: statusMock,
      setHeader: setHeaderMock,
      json: jsonMock,
      end: vi.fn(),
    } as unknown as VercelResponse;
    
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('GET /api/notifications returns list', async () => {
    const mockQueue = [{ id: '1', title: 'Test', sent: false }];
    redisGetMock.mockResolvedValue(mockQueue);

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      notifications: mockQueue
    }));
  });

  it('POST /api/notifications/send adds to queue', async () => {
    req.method = 'POST';
    req.url = '/api/notifications/send';
    req.body = {
      title: 'New Notification',
      message: 'Hello',
      priority: 'high'
    };

    redisGetMock.mockResolvedValue([]); // Empty queue initially

    await handler(req as VercelRequest, res as VercelResponse);

    expect(redisSetMock).toHaveBeenCalledWith(
      'notification-queue',
      expect.arrayContaining([
        expect.objectContaining({
          title: 'New Notification',
          priority: 'high',
          status: expect.any(String)
        })
      ])
    );
    expect(statusMock).toHaveBeenCalledWith(200);
  });
});