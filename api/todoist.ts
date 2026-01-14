import { PrismaClient } from "@prisma/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Instância do Prisma Client (Singleton)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (process.env.API_SECRET_KEY && authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { action, ...args } = req.body || {};
    if (!action) return res.status(400).json({ error: "Ação obrigatória" });

    switch (action) {
      case "create-task":
        return await handleCreateTask(args, res);
      case "list-tasks":
        return await handleListTasks(args, res);
      default:
        return res.status(400).json({ error: "Ação não suportada" });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleCreateTask(args: any, res: VercelResponse) {
  const title = args.content || args.title;
  const { description, priority, dueDate } = args;
  if (!title) return res.status(400).json({ error: "Título obrigatório" });

  let priorityInt = 1;
  if (priority) {
    const p = String(priority).toLowerCase();
    if (p.includes("alta") || p.includes("urgente")) priorityInt = 4;
    else if (p.includes("media")) priorityInt = 3;
    else priorityInt = 2;
  }

  const newTask = await prisma.task.create({
    data: {
      title,
      description: description || "",
      priority: priorityInt,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "PENDING",
    },
  });

  return res.status(201).json({ ok: true, task: newTask });
}

async function handleListTasks(args: any, res: VercelResponse) {
  const tasks = await prisma.task.findMany({
    where: { status: { not: "COMPLETED" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return res.status(200).json({ ok: true, data: tasks });
}