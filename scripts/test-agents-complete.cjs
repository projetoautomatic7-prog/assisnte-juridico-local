#!/usr/bin/env node
/**
 * Script rápido para marcar uma tarefa como concluída ou com erro na função `/api/agents`.
 *
 * Uso:
 *   AGENTS_URL="https://southamerica-east1-<PROJECT>.cloudfunctions.net/agents" \
 *   TASK_ID="task-123" \
 *   node scripts/test-agents-complete.cjs
 *
 * Opcional: ERROR="mensagem" para marcar como failed.
 */

const AGENTS_URL = process.env.AGENTS_URL;
const TASK_ID = process.env.TASK_ID;
const ERROR = process.env.ERROR;

if (!AGENTS_URL || !TASK_ID) {
  console.error("Defina AGENTS_URL e TASK_ID. Opcional: ERROR.");
  process.exit(1);
}

async function completeTask() {
  const payload = {
    taskId: TASK_ID,
    result: ERROR
      ? undefined
      : {
          draft: "<p>Minuta gerada automaticamente (exemplo)</p>",
          processedAt: new Date().toISOString(),
        },
    error: ERROR || undefined,
  };

  const res = await fetch(`${AGENTS_URL}?action=complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  console.log("Complete response:", res.status, json);
}

completeTask().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
