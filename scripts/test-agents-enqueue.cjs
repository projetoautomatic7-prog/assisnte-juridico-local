#!/usr/bin/env node
/**
 * Script rápido para enfileirar uma tarefa de agente via Firebase Function `/api/agents`.
 *
 * Uso:
 *   AGENTS_URL="https://southamerica-east1-<PROJECT>.cloudfunctions.net/agents" node scripts/test-agents-enqueue.cjs
 *
 * Opcional: passe ACTION=dequeue para testar a ação de dequeue.
 */

const AGENTS_URL = process.env.AGENTS_URL;
const ACTION = process.env.ACTION || "enqueue";

if (!AGENTS_URL) {
  console.error("Defina AGENTS_URL (ex: https://southamerica-east1-<PROJECT>.cloudfunctions.net/agents)");
  process.exit(1);
}

async function enqueueSampleTask() {
  const task = {
    id: `task-${Date.now()}`,
    agentId: "redacao-peticoes",
    type: "draft_petition",
    priority: "medium",
    status: "queued",
    createdAt: new Date().toISOString(),
    data: {
      processNumber: "1234567-89.2024.5.02.0999",
      documentType: "contestacao",
      summary: "Elaborar contestação para ação de cobrança (teste)",
    },
  };

  const res = await fetch(`${AGENTS_URL}?action=enqueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });

  const json = await res.json().catch(() => ({}));
  console.log("Enqueue response:", res.status, json);
}

async function dequeueTask() {
  const res = await fetch(`${AGENTS_URL}?action=dequeue`, { method: "POST" });
  const json = await res.json().catch(() => ({}));
  console.log("Dequeue response:", res.status, json);
}

(async () => {
  if (ACTION === "dequeue") {
    await dequeueTask();
  } else {
    await enqueueSampleTask();
  }
})().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
