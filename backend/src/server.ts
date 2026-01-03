import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { inicializarTabelaExpedientes } from "./db/expedientes.js";
import agentsRouter from "./routes/agents.js";
import aiCommandsRouter from "./routes/ai-commands.js";
import djenRouter from "./routes/djen.js";
import kvRouter from "./routes/kv.js";
import llmStreamRouter from "./routes/llm-stream.js";
import llmRouter from "./routes/llm.js";
import minutasRouter from "./routes/minutas.js";
import sparkRouter from "./routes/spark.js";
import { iniciarSchedulerDJEN } from "./services/djen-scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend Error interface to include status
interface ErrorWithStatus extends Error {
  status?: number;
}

// Load environment variables
const envPath = path.resolve(__dirname, "../../.env.local");
console.log("Loading env from:", envPath);
dotenv.config({ path: envPath });
dotenv.config(); // Fallback to default .env if needed

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;

// Middleware - Allow all origins for Replit proxy
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
    env: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/api/spark", sparkRouter);
app.use("/api/kv", kvRouter);
app.use("/api/llm", llmRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/minutas", minutasRouter);
app.use("/api/ai", aiCommandsRouter);
app.use("/api/llm-stream", llmStreamRouter);
app.use("/api/djen", djenRouter);

// Serve static files in production
const isProduction = process.env.NODE_ENV === "production";
const distPath = path.resolve(__dirname, "../../dist");

if (isProduction) {
  console.log(`📂 Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// 404 handler for API routes
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "Not Found" });
  } else if (!isProduction) {
    res.status(404).json({ error: "Not Found" });
  }
});

// Error handling
app.use(
  (
    err: ErrorWithStatus,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    });
  }
);

// Start server - bind to 0.0.0.0 for network accessibility
app.listen(Number(PORT), "0.0.0.0", async () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);

  // Inicializar tabela de expedientes
  try {
    await inicializarTabelaExpedientes();
  } catch (error) {
    console.error(`❌ Erro ao inicializar banco de dados:`, error);
  }

  // Iniciar scheduler DJEN (apenas em produção ou se explicitamente habilitado)
  if (process.env.DJEN_SCHEDULER_ENABLED === "true") {
    iniciarSchedulerDJEN();
  } else {
    console.log(`ℹ️ DJEN Scheduler desabilitado (defina DJEN_SCHEDULER_ENABLED=true para ativar)`);
  }
});

export default app;
