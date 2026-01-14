import { Redis } from "@upstash/redis";
import { ChatMessage, MemoryStore } from "./core-agent";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const UpstashMemoryStore: MemoryStore = {
  async load(sessionId: string): Promise<ChatMessage[]> {
    try {
      const history = await redis.get<ChatMessage[]>(`agent-memory:${sessionId}`);
      return history || [];
    } catch (e) {
      console.error("Erro ao carregar memória do Redis:", e);
      return [];
    }
  },
  async save(sessionId: string, history: ChatMessage[]): Promise<void> {
    await redis.set(`agent-memory:${sessionId}`, history.slice(-20), { ex: 86400 }); // Expira em 24h
  },
};