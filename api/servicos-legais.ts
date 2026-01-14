import { PrismaClient } from "@prisma/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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
    const { action, numeroProcesso } = req.body || {};
    if (action === "consultar-processo") {
      const processo = await prisma.processo.findFirst({
        where: { numero: numeroProcesso }
      });

      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });

      return res.status(200).json({
        ok: true,
        data: {
          numero: processo.numero,
          classe: (processo as any).classe || "Procedimento Comum",
          assunto: (processo as any).assunto || "Cível",
          tribunal: (processo as any).tribunal || "TJ",
          status: (processo as any).status || "Ativo",
          ultimoAndamento: {
            data: new Date().toISOString(),
            descricao: (processo as any).ultimoAndamento || "Processo em tramitação"
          }
        }
      });
    }
    return res.status(400).json({ error: "Ação inválida" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}