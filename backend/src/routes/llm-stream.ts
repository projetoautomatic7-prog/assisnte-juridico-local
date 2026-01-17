import { Router } from "express";

const router = Router();
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

router.post("/", async (req, res) => {
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
  console.log("[LLM Stream] Request received");

  if (!GEMINI_API_KEY) {
    console.error("[LLM Stream] GEMINI_API_KEY not configured");
    // Don't set SSE headers for error responses
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada" });
  }

  const { messages, temperature, max_tokens } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages deve ser um array não vazio" });
  }

  // Validate messages structure
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ 
        error: "Cada mensagem deve ter 'role' e 'content'",
        receivedMessage: msg 
      });
    }
  }

  const systemMessage = messages.find((m: any) => m.role === "system");
  const userMessages = messages.filter((m: any) => m.role !== "system");

  if (userMessages.length === 0) {
    return res.status(400).json({ error: "Pelo menos uma mensagem de usuário é necessária" });
  }

  const geminiBody: any = {
    contents: userMessages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content) }],
    })),
    generationConfig: {
      temperature: temperature || 0.7,
      maxOutputTokens: max_tokens || 2000,
    },
  };

  if (systemMessage) {
    geminiBody.systemInstruction = {
      parts: [{ text: String(systemMessage.content) }],
    };
  }

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Using streamGenerateContent for real streaming
    const geminiUrl = `${GEMINI_API_URL}/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] Error ${response.status}: ${errorText}`);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: `Gemini error: ${response.status}` })}\n\n`
      );
      res.end();
      return;
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const extractJsonObject = (input: string): { json: string; endIndex: number } | null => {
      const startIndex = input.indexOf("{");
      if (startIndex === -1) return null;
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let i = startIndex; i < input.length; i += 1) {
        const char = input[i];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === '"') {
            inString = false;
          }
          continue;
        }
        if (char === '"') {
          inString = true;
        } else if (char === "{") {
          depth += 1;
        } else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            return { json: input.slice(startIndex, i + 1), endIndex: i + 1 };
          }
        }
      }

      return null;
    };

    const emitContent = (text: string, tokens?: { prompt?: number; completion?: number; total?: number }) => {
      if (!text) return;
      res.write(
        `data: ${JSON.stringify({
          type: "content",
          content: text,
          tokens: tokens
            ? {
                prompt: tokens.prompt || 0,
                completion: tokens.completion || 0,
                total: tokens.total || 0,
              }
            : undefined,
        })}\n\n`
      );
    };

    let pendingTokens: { prompt?: number; completion?: number; total?: number } | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const extracted = extractJsonObject(buffer);
        if (!extracted) break;

        buffer = buffer.slice(extracted.endIndex);

        try {
          const parsed = JSON.parse(extracted.json);
          const text =
            parsed?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
            "";
          const usage = parsed?.usageMetadata;

          if (usage) {
            pendingTokens = {
              prompt: usage.promptTokenCount,
              completion: usage.candidatesTokenCount,
              total: usage.totalTokenCount,
            };
          }

          if (text) {
            emitContent(text);
          }
        } catch (parseError) {
          console.error("[LLM Stream] Failed to parse stream chunk:", parseError);
        }
      }
    }

    if (pendingTokens) {
      res.write(
        `data: ${JSON.stringify({
          type: "content",
          content: "",
          tokens: pendingTokens,
        })}\n\n`
      );
    }

    res.write(`data: ${JSON.stringify({ type: "done", provider: "gemini" })}\n\n`);
    res.end();
  } catch (error) {
    console.error("[LLM Stream] Exception:", error);
    res.write(`data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`);
    res.end();
  }
});

export default router;
