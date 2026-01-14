import { Request, Response, Router } from "express";

const router = Router();
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// LLM routes - Interface para modelos de linguagem
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    const model = process.env.VITE_GEMINI_MODEL || "gemini-2.5-pro";
    const { message, temperature = 0.7 } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message required",
        message: "A message must be provided for chat completion",
      });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY não configurada" });
    }

    const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: String(message) }],
          },
        ],
        generationConfig: {
          temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: "LLM Service Error",
        message: `Gemini error: ${response.status}`,
        detail: errorText,
      });
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
      "";

    res.json({
      id: `chat_${Date.now()}`,
      model,
      message: {
        role: "assistant",
        content: text,
        timestamp: new Date().toISOString(),
      },
      usage: data?.usageMetadata || null,
      temperature,
      protected: true,
    });
  } catch (error) {
    console.error("LLM Chat Error:", error);
    res.status(500).json({
      error: "LLM Service Error",
      message: "Failed to process chat request",
    });
  }
});

router.post("/embeddings", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Text required",
        message: "Text must be provided for embeddings",
      });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY não configurada" });
    }

    const response = await fetch(
      `${GEMINI_API_URL}/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [{ text: String(text) }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: "Embeddings Service Error",
        message: `Gemini error: ${response.status}`,
        detail: errorText,
      });
    }

    const data = await response.json();
    const embedding = data?.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(502).json({
        error: "Embeddings Service Error",
        message: "Resposta inválida da API Gemini",
      });
    }

    res.json({
      model: "text-embedding-004",
      data: [
        {
          embedding,
          index: 0,
        },
      ],
      usage: {
        prompt_tokens: text.length,
        total_tokens: text.length,
      },
      timestamp: new Date().toISOString(),
      protected: true,
    });
  } catch (error) {
    console.error("Embeddings Error:", error);
    res.status(500).json({
      error: "Embeddings Service Error",
      message: "Failed to generate embeddings",
    });
  }
});

router.get("/models", (req, res) => {
  // Lista modelos disponíveis
  res.json({
    models: [
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        provider: "Google",
        capabilities: ["chat", "embeddings"],
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        provider: "Google",
        capabilities: ["chat"],
      },
      {
        id: "text-embedding-004",
        name: "Gemini Embedding",
        provider: "Google",
        capabilities: ["embeddings"],
      },
    ],
    timestamp: new Date().toISOString(),
    protected: true
  });
});

export default router;