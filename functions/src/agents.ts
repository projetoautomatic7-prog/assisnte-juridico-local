import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Evita múltiplas inicializações em funções paralelas
if (getApps().length === 0) {
  initializeApp();
}

type AgentTaskType =
  | "analyze_document"
  | "analyze_intimation"
  | "monitor_djen"
  | "calculate_deadline"
  | "draft_petition"
  | "check_datajud"
  | "organize_files"
  | "research_precedents"
  | "risk_analysis"
  | "contract_review"
  | "client_communication"
  | "billing_analysis"
  | "case_strategy"
  | "legal_translation"
  | "compliance_check";

type TaskPriority = "low" | "medium" | "high" | "critical";
type TaskStatus = "queued" | "processing" | "completed" | "failed";

interface AgentTask {
  id: string;
  agentId: string;
  type: AgentTaskType;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  data: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

const COLLECTIONS = {
  QUEUE: "agent-task-queue",
  COMPLETED: "completed-agent-tasks",
  AGENTS: "autonomous-agents",
} as const;

function withCors(res: Parameters<ReturnType<typeof onRequest>>[1]): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function enqueueTask(task: AgentTask) {
  const db = getFirestore();
  await db.collection(COLLECTIONS.QUEUE).doc(task.id).set(task);
}

async function dequeueTask(): Promise<AgentTask | null> {
  const db = getFirestore();
  const snap = await db
    .collection(COLLECTIONS.QUEUE)
    .where("status", "==", "queued")
    .orderBy("createdAt", "asc")
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const task = doc.data() as AgentTask;
  await doc.ref.update({
    status: "processing",
    startedAt: new Date().toISOString(),
  });
  return { ...task, status: "processing", startedAt: new Date().toISOString() };
}

async function completeTask(taskId: string, payload: { result?: unknown; error?: string }) {
  const db = getFirestore();
  const docRef = db.collection(COLLECTIONS.QUEUE).doc(taskId);
  const doc = await docRef.get();
  if (!doc.exists) return;

  const task = doc.data() as AgentTask;
  const completed: AgentTask = {
    ...task,
    status: payload.error ? "failed" : "completed",
    completedAt: new Date().toISOString(),
    result: payload.result as Record<string, unknown> | undefined,
    error: payload.error,
  };

  const batch = db.batch();
  batch.set(db.collection(COLLECTIONS.COMPLETED).doc(taskId), completed);
  batch.delete(docRef);
  await batch.commit();
}

async function getStatus() {
  const db = getFirestore();
  const [queuedSnap, completedSnap, agentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.QUEUE).get(),
    db.collection(COLLECTIONS.COMPLETED).get(),
    db.collection(COLLECTIONS.AGENTS).get(),
  ]);

  return {
    queued: queuedSnap.size,
    completed: completedSnap.size,
    agentsConfigured: agentsSnap.size,
    updatedAt: Timestamp.now().toDate().toISOString(),
  };
}

async function listData() {
  const db = getFirestore();
  const [queuedSnap, completedSnap, agentsSnap] = await Promise.all([
    db
      .collection(COLLECTIONS.QUEUE)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get(),
    db
      .collection(COLLECTIONS.COMPLETED)
      .orderBy("completedAt", "desc")
      .limit(200)
      .get(),
    db.collection(COLLECTIONS.AGENTS).get(),
  ]);

  return {
    queued: queuedSnap.docs.map((d) => d.data()),
    completed: completedSnap.docs.map((d) => d.data()),
    agents: agentsSnap.docs.map((d) => d.data()),
    updatedAt: Timestamp.now().toDate().toISOString(),
  };
}

export const agents = onRequest(async (req, res) => {
  withCors(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const action = (req.query.action as string | undefined) || req.body?.action;

  try {
    if (req.method === "GET" && action === "status") {
      const status = await getStatus();
      res.status(200).json({ ok: true, ...status });
      return;
    }

    if (req.method === "GET" && action === "list") {
      const data = await listData();
      res.status(200).json({ ok: true, ...data });
      return;
    }

    if (req.method === "POST" && action === "enqueue") {
      const task = req.body as AgentTask;
      await enqueueTask(task);
      res.status(200).json({ ok: true, message: "Task enfileirada", taskId: task.id });
      return;
    }

    if (req.method === "POST" && action === "dequeue") {
      const task = await dequeueTask();
      res.status(200).json({ ok: true, task });
      return;
    }

    if (req.method === "POST" && action === "complete") {
      const { taskId, result, error } = req.body as {
        taskId?: string;
        result?: unknown;
        error?: string;
      };
      if (!taskId) {
        res.status(400).json({ ok: false, error: "taskId é obrigatório" });
        return;
      }
      await completeTask(taskId, { result, error });
      res.status(200).json({ ok: true, taskId });
      return;
    }

    res.status(400).json({ ok: false, error: "Ação inválida ou método não suportado" });
  } catch (error) {
    console.error("[agents] Erro:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro interno",
    });
  }
});
