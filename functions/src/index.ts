/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { AGENTS } from "./agents-registry";
import { InMemoryMemoryStore, SimpleAgent } from "./core-agent";
import { HttpLlmClient } from "./http-llm-client";
import { AGENT_TOOLS, GlobalToolContext } from "./tools";

// DJEN Scheduler - Importar funções
export {
  djenScheduler01h,
  djenScheduler09h,
  djenTriggerManual,
  djenStatus,
  djenPublicacoes,
} from "./djen-scheduler";

// Agents (Firestore-backed queue)
export { agents } from "./agents";

// API Backend Completo (todas as rotas /api/**)
export { api } from "./api";

setGlobalOptions({ maxInstances: 10 });

export const agentsLegacy = onRequest({ cors: true }, async (req, res) => {
  try {
    const { agentId, message, sessionId } = req.body;

    if (!agentId) {
      res.status(400).json({ error: "Campo 'agentId' é obrigatório." });
      return;
    }

    const persona = AGENTS[agentId];
    if (!persona) {
      res.status(404).json({ error: `Agente '${agentId}' não encontrado.` });
      return;
    }

    const llm = new HttpLlmClient({
      baseUrl: process.env.LLM_PROXY_URL || "https://assistente-juridico-github.vercel.app/api/llm-proxy",
    });

    const ctx: GlobalToolContext = {
      baseUrl: process.env.APP_BASE_URL || "https://assistente-juridico-github.vercel.app",
      evolutionApiUrl: process.env.EVOLUTION_API_URL || "",
      evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
    };

    const agent = new SimpleAgent({
      llm,
      tools: AGENT_TOOLS,
      persona,
      toolContext: ctx,
      sessionId: sessionId || `session-${agentId}`,
      memoryStore: InMemoryMemoryStore,
    });

    const result = await agent.run(message || "Execute sua rotina padrão.");
    res.status(200).json({ ok: true, agentId, ...result });
  } catch (err: any) {
    logger.error("Erro no agente:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
