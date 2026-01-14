import { PrismaClient } from "@prisma/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Instância do Prisma Client (Singleton para evitar múltiplas conexões em serverless/dev)
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Interface para tipagem básica do retorno de processo
 */
interface ProcessoData {
  numero: string;
  classe: string;
  assunto: string;
  tribunal: string;
  partes: {
    autor: string;
    reu: string;
    advogados: string[];
  };
  ultimoAndamento: {
    data: string;
    descricao: string;
  };
  status: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permite CORS se necessário (opcional, dependendo da config do Vercel)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // 1. Segurança: Validação de Token (Bearer Token)
  // Certifique-se de definir API_SECRET_KEY no seu arquivo .env
  const authHeader = req.headers.authorization;
  if (process.env.API_SECRET_KEY && authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized: Token inválido ou ausente." });
  }

  try {
    const { action, numeroProcesso, ...args } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: "Campo 'action' é obrigatório." });
    }

    switch (action) {
      case "consultar-processo":
        return await handleConsultarProcesso(numeroProcesso, res);

      // Futuramente você pode adicionar: case "criar-tarefa": ...

      default:
        return res.status(400).json({ error: `Ação '${action}' não suportada.` });
    }
  } catch (error: any) {
    console.error("[/api/servicos-legais] Erro:", error);
    return res.status(500).json({
      error: "Erro interno no servidor de serviços legais.",
      details: error.message,
    });
  }
}

async function handleConsultarProcesso(numeroProcesso: string, res: VercelResponse) {
  if (!numeroProcesso) {
    return res.status(400).json({ error: "Campo 'numeroProcesso' é obrigatório para esta ação." });
  }

  try {
    // 2. Integração Real: Busca no Banco de Dados Local (PostgreSQL via Prisma)
    // Ajuste 'prisma.processo' conforme o nome do seu modelo no schema.prisma
    const processoDb = await prisma.processo.findFirst({
      where: { numero: numeroProcesso },
      // Inclua relacionamentos se necessário (ex: partes, andamentos)
      // include: { partes: true } 
    });

    if (processoDb) {
      // Mapeia o retorno do banco para a interface ProcessoData
      // (Use 'as any' ou tipagem correta se os campos do DB forem diferentes)
      const data: ProcessoData = {
        numero: processoDb.numero,
        classe: (processoDb as any).classe || "Não informada",
        assunto: (processoDb as any).assunto || "Não informado",
        tribunal: (processoDb as any).tribunal || "Não informado",
        partes: {
          // Exemplo de mapeamento simples
          autor: (processoDb as any).autor || "Autor no DB",
          reu: (processoDb as any).reu || "Réu no DB",
          advogados: [], // Preencher se tiver tabela relacionada
        },
        ultimoAndamento: {
          data: new Date().toISOString().split("T")[0],
          descricao: (processoDb as any).ultimoAndamento || "Consulte os autos",
        },
        status: (processoDb as any).status || "Ativo",
      };

      return res.status(200).json({
        ok: true,
        source: "database-local",
        data: data,
      });
    }

    // Se não encontrar no banco
    return res.status(404).json({ error: "Processo não encontrado no banco de dados local." });

  } catch (error: any) {
    console.error("Erro ao buscar no banco de dados:", error);
    return res.status(500).json({
      error: "Erro de conexão com o banco de dados.",
      details: error.message
    });
  }
}