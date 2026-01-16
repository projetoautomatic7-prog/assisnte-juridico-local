
import { Redis } from "@upstash/redis";

/**
 * Service for reliable, atomic task queue management using Redis.
 * Eliminates race conditions present in "get-modify-set" patterns.
 */
export class QueueService {
  private redis: Redis;
  private queueKey: string;
  private processingKey: string;

  constructor(queueName: string = "agent-task-queue") {
    // Initialize Redis client
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      console.warn("[QueueService] Redis credentials missing. Queue will fail.");
      throw new Error("Redis credentials missing");
    }

    this.queueKey = queueName;
    this.processingKey = `${queueName}:processing`;
  }

  /**
   * Atomically adds a task to the end of the queue.
   */
  async enqueue(task: any): Promise<number> {
    try {
      // Use RPUSH for atomic append
      // We store the task as a JSON string
      const taskStr = JSON.stringify(task);
      const length = await this.redis.rpush(this.queueKey, taskStr);
      return length;
    } catch (error) {
      console.error("[QueueService] Enqueue error:", error);
      throw error;
    }
  }

  /**
   * Atomically removes and returns the first task from the queue.
   * Moves it to a 'processing' list for reliability (optional but recommended).
   * For now, we'll stick to simple LPOP to match the current complexity, 
   * but ideally, RPOPLPUSH (or LMOVE) should be used.
   */
  async dequeue(): Promise<any | null> {
    try {
      // Simple LPOP: Removes and returns first element
      const taskStr = await this.redis.lpop<string>(this.queueKey);
      
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
    return await this.redis.llen(this.queueKey);
  }

  /**
   * Peeks at the first N items without removing them
   */
  async peek(count: number = 10): Promise<any[]> {
    try {
      // LRANGE 0 count-1
      const items = await this.redis.lrange(this.queueKey, 0, count - 1);
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
    await this.redis.del(this.queueKey);
  }
}

// Singleton instance for the default queue
export const agentQueue = new QueueService("agent-task-queue");
