import { PrismaClient } from "@prisma/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Instância do Prisma Client (Singleton)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permite CORS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Segurança: Validação de Token
  const authHeader = req.headers.authorization;
  if (process.env.API_SECRET_KEY && authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized: Token inválido ou ausente." });
  }

  try {
    const { action, ...args } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: "Campo 'action' é obrigatório." });
    }

    switch (action) {
      case "create-task":
        return await handleCreateTask(args, res);

      case "list-tasks":
        return await handleListTasks(args, res);

      default:
        return res.status(400).json({ error: `Ação '${action}' não suportada.` });
    }
  } catch (error: any) {
    console.error("[/api/todoist] Erro:", error);
    return res.status(500).json({
      error: "Erro interno no gerenciador de tarefas.",
      details: error.message,
    });
  }
}

async function handleCreateTask(args: any, res: VercelResponse) {
  // Aceita 'content' (padrão Todoist) ou 'title'
  const title = args.content || args.title;
  const { description, priority, dueDate, processNumber } = args;

  if (!title) {
    return res.status(400).json({ error: "Título da tarefa é obrigatório." });
  }

  // Normaliza prioridade (1 a 4, onde 4 é urgente)
  let priorityInt = 1;
  if (priority) {
    if (typeof priority === "string") {
      const p = priority.toLowerCase();
      if (p.includes("alta") || p.includes("high") || p.includes("urgente")) priorityInt = 4;
      else if (p.includes("media") || p.includes("medium")) priorityInt = 3;
      else priorityInt = 2;
    } else {
      priorityInt = Number(priority);
    }
  }

  try {
    // Criação no Banco de Dados Local via Prisma
    // Certifique-se de ter o model 'Task' ou 'Tarefa' no seu schema.prisma
    const newTask = await prisma.task.create({
      data: {
        title: title,
        description: description || "",
        priority: priorityInt,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "PENDING", // Status inicial
        // Se você tiver um campo para vincular ao processo:
        // processNumber: processNumber || null
      },
    });

    return res.status(201).json({
      ok: true,
      source: "database-local",
      id: newTask.id,
      task: newTask,
    });
  } catch (error: any) {
    console.error("Erro ao criar tarefa no DB:", error);
    return res.status(500).json({ error: "Erro ao salvar tarefa no banco.", details: error.message });
  }
}

async function handleListTasks(args: any, res: VercelResponse) {
  // Lista tarefas pendentes (exemplo simples)
  const tasks = await prisma.task.findMany({
    where: { status: { not: "COMPLETED" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return res.status(200).json({
    ok: true,
    source: "database-local",
    data: tasks,
  });
}