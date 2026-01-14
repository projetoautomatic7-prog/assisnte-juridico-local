import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Segurança: Verifica se a chamada vem do Vercel Cron
  // (O Vercel injeta o header Authorization se CRON_SECRET estiver configurado)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Determina a URL base da aplicação para chamadas internas
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const host = process.env.APP_HOST || "localhost:3001";
    const baseUrl = `${protocol}://${host}`;

    // Log com horário de Brasília para facilitar debug
    const brtTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    console.log(`[Cron] 🕒 Iniciando rotina agendada... (Base: ${baseUrl}) | Hora BRT: ${brtTime}`);

    const results: any = {};

    // 1. Monitoramento DJEN (Executa às 01:00 e 09:00 BRT)
    try {
      console.log("[Cron] 🚀 Disparando sincronização do DJEN...");

      // Chama o endpoint existente via HTTP para garantir isolamento e rate limits
      const djenRes = await fetch(`${baseUrl}/api/djen-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // O endpoint djen-sync é público/protegido por rate-limit, então OK chamar sem token extra por enquanto
      });

      results.djen = await djenRes.json();
      console.log("[Cron] ✅ DJEN Sync finalizado:", results.djen);
    } catch (err: any) {
      console.error("[Cron] ❌ Falha no DJEN Sync:", err);
      results.djen = { error: err.message };
    }

    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error: any) {
    console.error("[Cron] 💥 Erro fatal no Cron:", error);
    return res.status(500).json({ error: error.message });
  }
}