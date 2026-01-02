import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_LAWYERS = [
  {
    id: "thiago-bodevan-veiga",
    name: "Thiago Bodevan Veiga",
    oab: "184404/MG",
    enabled: true,
    tribunals: [],
  },
];

const kvStore: Record<string, unknown> = {
  "monitored-lawyers": DEFAULT_LAWYERS,
};

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function devApiPlugin(): Plugin {
  return {
    name: "dev-api-plugin",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        
        if (!url.startsWith("/api/")) {
          return next();
        }

        if (url.startsWith("/api/lawyers")) {
          sendJson(res, {
            success: true,
            lawyers: DEFAULT_LAWYERS,
          });
          return;
        }

        if (url.startsWith("/api/expedientes")) {
          sendJson(res, {
            success: true,
            expedientes: [],
            count: 0,
            lastCheck: new Date().toISOString(),
            lawyersConfigured: DEFAULT_LAWYERS.length,
            message: "Nenhuma publicação encontrada",
          });
          return;
        }

        if (url.startsWith("/api/kv")) {
          if (req.method === "POST") {
            const body = await parseBody(req);
            const action = body.action as string;

            if (action === "batch-get") {
              const keys = (body.keys as string[]) || [];
              const values: Record<string, unknown> = {};
              for (const key of keys) {
                if (kvStore[key] !== undefined) {
                  values[key] = kvStore[key];
                }
              }
              sendJson(res, { success: true, values });
              return;
            }

            if (action === "batch-set") {
              const entries = (body.entries as Array<{ key: string; value: unknown }>) || [];
              for (const entry of entries) {
                kvStore[entry.key] = entry.value;
              }
              sendJson(res, { success: true });
              return;
            }

            if (action === "get") {
              const key = body.key as string;
              sendJson(res, { success: true, value: kvStore[key] ?? null });
              return;
            }

            if (action === "set") {
              const key = body.key as string;
              kvStore[key] = body.value;
              sendJson(res, { success: true });
              return;
            }
          }

          sendJson(res, { success: true, values: {} });
          return;
        }

        if (url.startsWith("/api/djen-sync")) {
          sendJson(res, {
            ok: true,
            result: {
              newPublications: 0,
            },
            message: "Sincronização via navegador concluída",
          });
          return;
        }

        if (url.startsWith("/api/llm-stream")) {
          if (!GEMINI_API_KEY) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "VITE_GEMINI_API_KEY não configurada" }));
            return;
          }

          const body = await parseBody(req);
          const messages = (body.messages as Array<{ role: string; content: string }>) || [];

          const systemMessage = messages.find((m) => m.role === "system");
          const userMessages = messages.filter((m) => m.role !== "system");

          const geminiUrl = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

          interface GeminiRequestBody {
            contents: Array<{ role: string; parts: Array<{ text: string }> }>;
            systemInstruction?: { parts: Array<{ text: string }> };
            generationConfig: {
              temperature: number;
              maxOutputTokens: number;
            };
          }

          const geminiBody: GeminiRequestBody = {
            contents: userMessages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            generationConfig: {
              temperature: (body.temperature as number) || 0.7,
              maxOutputTokens: (body.max_tokens as number) || 2000,
            },
          };

          if (systemMessage) {
            geminiBody.systemInstruction = {
              parts: [{ text: systemMessage.content }],
            };
          }

          try {
            const geminiRes = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(geminiBody),
            });

            if (!geminiRes.ok) {
              const errorText = await geminiRes.text();
              console.error("[Gemini] Erro:", geminiRes.status, errorText);
              res.writeHead(geminiRes.status, { "Content-Type": "text/event-stream" });
              res.write(`data: ${JSON.stringify({ type: "error", message: `Gemini error: ${geminiRes.status}` })}\n\n`);
              res.end();
              return;
            }

            interface GeminiResponse {
              candidates?: Array<{
                content?: {
                  parts?: Array<{ text?: string }>;
                };
              }>;
              usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
              };
            }

            const data = (await geminiRes.json()) as GeminiResponse;
            const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
            const usage = data.usageMetadata;

            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            });

            res.write(
              `data: ${JSON.stringify({
                type: "content",
                content: text,
                tokens: {
                  prompt: usage?.promptTokenCount || 0,
                  completion: usage?.candidatesTokenCount || 0,
                  total: usage?.totalTokenCount || 0,
                },
              })}\n\n`
            );

            res.write(`data: ${JSON.stringify({ type: "done", provider: "gemini" })}\n\n`);
            res.end();
          } catch (error) {
            console.error("[Gemini] Exception:", error);
            res.writeHead(500, { "Content-Type": "text/event-stream" });
            res.write(`data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`);
            res.end();
          }
          return;
        }

        next();
      });
    },
  };
}
