/**
 * API Backend Completo - Firebase Cloud Function
 * 
 * Esta função encapsula todo o Express do backend/ como uma Cloud Function,
 * permitindo que todas as rotas /api/** funcionem no Firebase.
 */

import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import express from "express";
import cors from "cors";

// Configuração global
setGlobalOptions({
  region: "southamerica-east1",
  maxInstances: 10,
  memory: "512MiB",
  timeoutSeconds: 300,
});

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "firebase-functions-api",
  });
});

// Importar rotas do backend (ajustar paths conforme necessário)
// Por enquanto, vou criar endpoints básicos para testar

// LLM Routes
app.post("/llm/chat", async (req, res) => {
  try {
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
    const apiKey = process.env.GEMINI_API_KEY || "";
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
    const { message, temperature = 0.7 } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
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
        generationConfig: { temperature },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: "LLM Service Error",
        detail: errorText,
      });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    res.json({ response: text, model });
  } catch (error: any) {
    console.error("LLM error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Editor Routes (placeholder)
app.post("/editor/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }
    
    // Implementar análise de texto aqui
    res.json({
      status: "success",
      analysis: {
        wordCount: text.split(/\s+/).length,
        charCount: text.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Minutas Routes (placeholder)
app.get("/minutas", (_req, res) => {
  res.json({
    status: "success",
    minutas: [],
    message: "Endpoint migrado para Cloud Functions",
  });
});

// KV Store (placeholder - usar Firestore ao invés de Redis)
app.get("/kv/:key", async (req, res) => {
  res.json({
    key: req.params.key,
    value: null,
    message: "Use Firestore para storage persistente",
  });
});

// Qdrant (placeholder)
app.post("/qdrant/search", async (req, res) => {
  res.json({
    status: "success",
    results: [],
    message: "Endpoint em migração",
  });
});

// Catch-all para rotas não implementadas
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    message: "Esta rota ainda não foi migrada para Cloud Functions",
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  });
});

// Exportar como Cloud Function
export const api = onRequest(app);
