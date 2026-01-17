
import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";
import { createMinutaFromAgentTask } from "../../../api/lib/minuta-service-backend.js";
import { agentQueue } from "./queue-service.js";

// ===== Types & Enums (Ported from api/agents.ts) =====

export enum AgentTaskType {
  ANALYZE_DOCUMENT = "analyze_document",
  ANALYZE_INTIMATION = "analyze_intimation",
  MONITOR_DJEN = "monitor_djen",
  CALCULATE_DEADLINE = "calculate_deadline",
  DRAFT_PETITION = "draft_petition",
  CHECK_DATAJUD = "check_datajud",
  ORGANIZE_FILES = "organize_files",
  RESEARCH_PRECEDENTS = "research_precedents",
  RISK_ANALYSIS = "risk_analysis",
  CONTRACT_REVIEW = "contract_review",
  CLIENT_COMMUNICATION = "client_communication",
  BILLING_ANALYSIS = "billing_analysis",
  CASE_STRATEGY = "case_strategy",
  LEGAL_TRANSLATION = "legal_translation",
  COMPLIANCE_CHECK = "compliance_check",
}

export enum TaskStatus {
  QUEUED = "queued",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: AgentTaskType;
  status: TaskStatus;
  data: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
  timeout?: number;
}

// ===== Prompts (Simplified) =====

const SYSTEM_PROMPTS: Record<string, string> = {
  // Simplificado - usar mapeamento mais robusto se necessário
  default: `Você é um assistente jurídico especializado. Analise a solicitação e retorne JSON estruturado.`,
};

function getUserPrompt(task: AgentTask): string {
  // Simplificação: apenas serializa os dados
  return `Processe a seguinte tarefa jurídica do tipo ${task.type}:\n\n${JSON.stringify(task.data, null, 2)}\n\nRetorne JSON.`;
}

// ===== Gemini Helper =====

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.VITE_GEMINI_MODEL || "gemini-1.5-pro";
  
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
        ],
        generationConfig: { temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

function parseGeminiResponse(text: string): Record<string, unknown> {
  try {
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return JSON.parse(clean.substring(start, end + 1));
    }
    return { raw: text };
  } catch {
    return { raw: text };
  }
}

// ===== Queue Processor =====

export class AgentQueueProcessor {
  private redis: Redis | null = null;

  private getRedis(): Redis | null {
    if (this.redis) return this.redis;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return this.redis;
    }
    return null;
  }

  async processQueue(limit: number = 5): Promise<{ processed: number; failed: number; results: any[] }> {
    const results = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < limit; i++) {
      const task = await agentQueue.dequeue();
      if (!task) break;

      try {
        console.log(`[QueueProcessor] Processing task ${task.id}`);
        
        // 1. AI Processing
        const systemPrompt = SYSTEM_PROMPTS.default;
        const userPrompt = getUserPrompt(task);
        const aiResponse = await callGemini(systemPrompt, userPrompt);
        const resultData = parseGeminiResponse(aiResponse);

        // 2. Update Task
        task.status = TaskStatus.COMPLETED;
        task.result = resultData;
        task.completedAt = new Date().toISOString();

        // 3. Save Minuta (if petition)
        if (task.type === AgentTaskType.DRAFT_PETITION) {
          await this.saveMinuta(task);
        }

        // 4. Archive Task (Optional: save to completed list in Redis)
        // await this.archiveTask(task);

        results.push({ id: task.id, status: "completed" });
        processed++;
      } catch (error: any) {
        console.error(`[QueueProcessor] Task ${task.id} failed:`, error);
        task.status = TaskStatus.FAILED;
        task.error = error.message;
        results.push({ id: task.id, status: "failed", error: error.message });
        failed++;
      }
    }

    return { processed, failed, results };
  }

  private async saveMinuta(task: AgentTask): Promise<void> {
    try {
      const minuta = createMinutaFromAgentTask({
        id: task.id,
        agentId: task.agentId,
        data: task.data,
        result: { data: task.result },
      });

      if (!minuta) return;

      const redis = this.getRedis();
      if (!redis) return;

      await redis.set(`minuta:${minuta.id}`, minuta);
      await redis.rpush("minutas:ids", minuta.id);
      
      console.log(`[QueueProcessor] Minuta saved: ${minuta.id}`);
    } catch (error) {
      console.error("[QueueProcessor] Failed to save minuta:", error);
    }
  }
}

export const agentQueueProcessor = new AgentQueueProcessor();
