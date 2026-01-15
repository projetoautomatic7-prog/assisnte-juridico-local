import { Redis } from "@upstash/redis";
import { ChatMessage, InMemoryMemoryStore, MemoryStore } from "./core-agent";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const UpstashMemoryStore: MemoryStore = {
  async load(sessionId: string): Promise<ChatMessage[]> {
    if (!hasRedis) return InMemoryMemoryStore.load(sessionId);
    try {
      const history = await redis.get<ChatMessage[]>(`agent-memory:${sessionId}`);
      return history || [];
    } catch (e) {
      console.error("Erro ao carregar memória do Redis:", e);
      return [];
    }
  },
  async save(sessionId: string, history: ChatMessage[]): Promise<void> {
    if (!hasRedis) return InMemoryMemoryStore.save(sessionId, history);
    try {
      await redis.set(`agent-memory:${sessionId}`, history.slice(-20), { ex: 86400 }); // Expira em 24h
    } catch (e) {
      console.error("Erro ao salvar memória no Redis, usando fallback local:", e);
      await InMemoryMemoryStore.save(sessionId, history);
    }
  },
};