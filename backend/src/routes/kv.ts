import { Redis } from "@upstash/redis";
import { Router } from "express";

const router = Router();

// Redis configuration - Lazy initialization
let redis: Redis | null = null;
let isRedisInitialized = false;

function getRedisClient(): Redis | null {
  if (isRedisInitialized) return redis;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log("[KV] Redis configured");
  } else {
    console.warn("[KV] Redis not configured, using in-memory store");
  }

  isRedisInitialized = true;
  return redis;
}

// In-memory fallback
const memoryStore = new Map<string, unknown>();

// Default data (Configuration)
const DEFAULT_LAWYERS = [
  {
    id: "thiago-bodevan-veiga",
    name: "Thiago Bodevan Veiga",
    oab: "184404/MG",
    enabled: true,
    tribunals: [],
  },
];

// Initialize defaults
memoryStore.set("monitored-lawyers", DEFAULT_LAWYERS);

router.get("/:key", async (req, res) => {
  const { key } = req.params;
  const redisClient = getRedisClient();

  try {
    let value;
    if (redisClient) {
      value = await redisClient.get(key);
    } else {
      value = memoryStore.get(key);
    }

    // If not found, return null (don't mock)
    res.json({
      key,
      value: value || null,
      source: redisClient ? "redis" : "memory",
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[KV] Get Error for key '${key}':`, err.message, err.stack);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

router.post("/:key", async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const redisClient = getRedisClient();

  if (value === undefined) {
    return res.status(400).json({ error: "Value required" });
  }

  try {
    if (redisClient) {
      await redisClient.set(key, value);
    } else {
      memoryStore.set(key, value);
    }

    res.json({
      success: true,
      key,
      stored: true,
      source: redisClient ? "redis" : "memory",
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[KV] Set Error for key '${key}':`, err.message);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// Support query param style (GET /api/kv?key=...)
router.get("/", async (req, res) => {
  const key = req.query.key as string;
  const redisClient = getRedisClient();

  if (!key) {
    return res.status(400).json({ error: "Key required" });
  }

  try {
    let value;
    if (redisClient) {
      value = await redisClient.get(key);
    } else {
      value = memoryStore.get(key);
    }

    res.json({
      key,
      value: value || null,
      source: redisClient ? "redis" : "memory",
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[KV] Get Error for key '${key}':`, err.message, err.stack);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// Support POST /api/kv with body { key, value }
router.post("/", async (req, res) => {
  const { key, value, action, keys, entries } = req.body;
  const redisClient = getRedisClient();

  try {
    // Batch Get
    if (action === "batch-get" && Array.isArray(keys)) {
      const values: Record<string, unknown> = {};
      for (const k of keys) {
        if (redisClient) {
          values[k] = await redisClient.get(k);
        } else {
          values[k] = memoryStore.get(k);
        }
      }
      return res.json({ success: true, values });
    }

    // Batch Set
    if (action === "batch-set" && Array.isArray(entries)) {
      for (const entry of entries) {
        if (redisClient) {
          await redisClient.set(entry.key, entry.value);
        } else {
          memoryStore.set(entry.key, entry.value);
        }
      }
      return res.json({ success: true });
    }

    // Simple Set
    if (key && value !== undefined) {
      if (redisClient) {
        await redisClient.set(key, value);
      } else {
        memoryStore.set(key, value);
      }
      return res.json({ success: true });
    }

    res.status(400).json({ error: "Invalid request" });
  } catch (error) {
    const err = error as Error;
    console.error(`[KV] Post Error:`, err.message);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

export default router;
