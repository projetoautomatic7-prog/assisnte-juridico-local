
import { Redis } from "@upstash/redis";

/**
 * Service for reliable, atomic task queue management using Redis.
 * Eliminates race conditions present in "get-modify-set" patterns.
 */
export class QueueService {
  private redis: Redis | null = null;
  private queueKey: string;
  private processingKey: string;

  constructor(queueName: string = "agent-task-queue") {
    this.queueKey = queueName;
    this.processingKey = `${queueName}:processing`;
  }

  private getRedis(): Redis {
    if (this.redis) return this.redis;

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return this.redis;
    } else {
      console.warn("[QueueService] Redis credentials missing.");
      throw new Error("Redis credentials missing");
    }
  }

  /**
   * Atomically adds a task to the end of the queue.
   */
  async enqueue(task: any): Promise<number> {
    try {
      const redis = this.getRedis();
      const taskStr = JSON.stringify(task);
      const length = await redis.rpush(this.queueKey, taskStr);
      return length;
    } catch (error) {
      console.error("[QueueService] Enqueue error:", error);
      throw error;
    }
  }

  /**
   * Atomically removes and returns the first task from the queue.
   */
  async dequeue(): Promise<any | null> {
    try {
      const redis = this.getRedis();
      const taskStr = await redis.lpop<string>(this.queueKey);
      
      if (!taskStr) return null;

      return JSON.parse(taskStr);
    } catch (error) {
      console.error("[QueueService] Dequeue error:", error);
      throw error;
    }
  }

  /**
   * Gets the queue length
   */
  async length(): Promise<number> {
    const redis = this.getRedis();
    return await redis.llen(this.queueKey);
  }

  /**
   * Peeks at the first N items without removing them
   */
  async peek(count: number = 10): Promise<any[]> {
    try {
      const redis = this.getRedis();
      const items = await redis.lrange(this.queueKey, 0, count - 1);
      return items.map((item: string) => JSON.parse(item));
    } catch (error) {
      console.error("[QueueService] Peek error:", error);
      return [];
    }
  }

  /**
   * Clears the queue (Use with caution)
   */
  async clear(): Promise<void> {
    const redis = this.getRedis();
    await redis.del(this.queueKey);
  }
}

// Singleton instance for the default queue
export const agentQueue = new QueueService("agent-task-queue");
