/**
 * DJEN Scheduler - Firebase Functions
 * Monitora automaticamente publicações DJEN via Cloud Scheduler
 */

import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";

const DJEN_OAB_NUMERO = defineSecret("DJEN_OAB_NUMERO");
const DJEN_OAB_UF = defineSecret("DJEN_OAB_UF");
const DJEN_ADVOGADO_NOME = defineSecret("DJEN_ADVOGADO_NOME");

function resolveAdvogadoConfig() {
  const numeroOab = DJEN_OAB_NUMERO.value() || process.env.DJEN_OAB_NUMERO || "";
  const ufOab = DJEN_OAB_UF.value() || process.env.DJEN_OAB_UF || "";
  const nome = DJEN_ADVOGADO_NOME.value() || process.env.DJEN_ADVOGADO_NOME || "";

  return {
    numeroOab,
    ufOab,
    nome,
  };
}

interface DJENPublicacao {
  id: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  numeroProcesso: string;
  texto: string;
  dataDisponibilizacao: string;
  nomeOrgao: string;
}

/**
 * Busca publicações na API oficial do CNJ
 */
async function buscarPublicacoesDJEN(
  numeroOab: string,
  ufOab: string,
  dataInicio: string,
  dataFim?: string
): Promise<DJENPublicacao[]> {
  const url = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao");
  url.searchParams.set("numeroOab", numeroOab);
  url.searchParams.set("ufOab", ufOab);
  url.searchParams.set("meio", "D"); // D=Diário
  url.searchParams.set("dataDisponibilizacaoInicio", dataInicio);
  url.searchParams.set("dataDisponibilizacaoFim", dataFim || dataInicio);

  logger.info(`[DJEN] Consultando API CNJ: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "PJe-DataCollector/1.0",
    },
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 451) {
      throw new Error(
        `API bloqueada geograficamente (${response.status}). ` +
        `Firebase Functions deve estar na região southamerica-east1.`
      );
    }
    throw new Error(`API DJEN retornou ${response.status}`);
  }

  const data = await response.json();
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  const publicacoes: DJENPublicacao[] = items.map((item: any) => ({
    id:
      item.idExpediente ||
      item.id ||
      item.numeroComunicacao ||
      `${item.numeroProcesso || item.numero_processo || "djen"}-${Date.now()}`,
    siglaTribunal: item.siglaTribunal || item.sigla_tribunal || "",
    tipoComunicacao: item.tipoComunicacao || item.tipo_comunicacao || "",
    numeroProcesso: item.numeroProcesso || item.numero_processo || "",
    texto: item.teor || item.texto || item.inteiroTeor || item.inteiro_teor || "",
    dataDisponibilizacao:
      item.dataDisponibilizacao || item.data_disponibilizacao || new Date().toISOString(),
    nomeOrgao: item.nomeOrgao || item.nome_orgao || "",
  }));

  logger.info(`[DJEN] ${publicacoes.length} publicações encontradas`);
  return publicacoes;
}

/**
 * Processa publicações DJEN
 */
async function processarPublicacoes(): Promise<{
  sucesso: boolean;
  total: number;
  processadas: number;
  erros: number;
}> {
  const dataHoje = new Date().toISOString().split("T")[0];
  
  const advogadoConfig = resolveAdvogadoConfig();
  if (!advogadoConfig.numeroOab || !advogadoConfig.ufOab) {
    throw new Error("DJEN_OAB_NUMERO e DJEN_OAB_UF precisam estar configurados.");
  }

  logger.info(`[DJEN] Iniciando processamento - ${dataHoje}`);
  logger.info(
    `[DJEN] Advogado: ${advogadoConfig.nome || "Nao informado"} (OAB/${advogadoConfig.ufOab} ${advogadoConfig.numeroOab})`
  );

  try {
    const publicacoes = await buscarPublicacoesDJEN(
      advogadoConfig.numeroOab,
      advogadoConfig.ufOab,
      dataHoje
    );

    if (publicacoes.length === 0) {
      logger.info("[DJEN] Nenhuma publicação nova hoje");
      return { sucesso: true, total: 0, processadas: 0, erros: 0 };
    }

    let processadas = 0;
    let erros = 0;

    for (const pub of publicacoes) {
      try {
        logger.info(`[DJEN] Processando: ${pub.numeroProcesso} - ${pub.tipoComunicacao}`);
        
        // TODO: Salvar no Firestore
        // await admin.firestore().collection('expedientes').add({
        //   numeroProcesso: pub.numeroProcesso,
        //   tribunal: pub.siglaTribunal,
        //   tipo: pub.tipoComunicacao,
        //   conteudo: pub.texto,
        //   dataDisponibilizacao: pub.dataDisponibilizacao,
        //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // });

        processadas++;
        logger.info(`[DJEN] ✅ Processado: ${pub.numeroProcesso}`);
      } catch (error) {
        erros++;
        logger.error(`[DJEN] ❌ Erro ao processar ${pub.numeroProcesso}:`, error);
      }

      // Delay entre publicações (evitar sobrecarga)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info(`[DJEN] Finalizado: ${processadas} processadas, ${erros} erros`);
    return { sucesso: true, total: publicacoes.length, processadas, erros };
  } catch (error) {
    logger.error("[DJEN] Erro geral:", error);
    throw error;
  }
}

/**
 * ⏰ SCHEDULER AUTOMÁTICO
 * Executa às 01:00 e 09:00 (horário de Brasília)
 * 
 * Para ativar: firebase deploy --only functions:djenScheduler01h,functions:djenScheduler09h
 */
export const djenScheduler01h = onSchedule(
  {
    schedule: "0 1 * * *", // Diariamente às 01:00
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1", // 🌍 Importante: usar região Brasil
    secrets: [DJEN_OAB_NUMERO, DJEN_OAB_UF, DJEN_ADVOGADO_NOME],
  },
  async (event) => {
    logger.info("[DJEN Scheduler 01h] Iniciando execução automática");
    try {
      const resultado = await processarPublicacoes();
      logger.info("[DJEN Scheduler 01h] Concluído:", resultado);
    } catch (error) {
      logger.error("[DJEN Scheduler 01h] Erro:", error);
      throw error;
    }
  }
);

export const djenScheduler09h = onSchedule(
  {
    schedule: "0 9 * * *", // Diariamente às 09:00
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    secrets: [DJEN_OAB_NUMERO, DJEN_OAB_UF, DJEN_ADVOGADO_NOME],
  },
  async (event) => {
    logger.info("[DJEN Scheduler 09h] Iniciando execução automática");
    try {
      const resultado = await processarPublicacoes();
      logger.info("[DJEN Scheduler 09h] Concluído:", resultado);
    } catch (error) {
      logger.error("[DJEN Scheduler 09h] Erro:", error);
      throw error;
    }
  }
);

/**
 * 🔘 ENDPOINT MANUAL (para testes)
 * Acesse: https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual
 * 
 * Para ativar: firebase deploy --only functions:djenTriggerManual
 */
export const djenTriggerManual = onRequest(
  {
    cors: true,
    region: "southamerica-east1",
    maxInstances: 1, // Evitar múltiplas execuções simultâneas
    secrets: [DJEN_OAB_NUMERO, DJEN_OAB_UF, DJEN_ADVOGADO_NOME],
  },
  async (req, res) => {
    logger.info("[DJEN Manual] Execução manual solicitada");
    
    try {
      const resultado = await processarPublicacoes();
      res.status(200).json({
        sucesso: true,
        mensagem: "Processamento DJEN executado com sucesso",
        dados: resultado,
      });
    } catch (error: any) {
      logger.error("[DJEN Manual] Erro:", error);
      res.status(500).json({
        sucesso: false,
        mensagem: "Erro ao processar DJEN",
        erro: error.message,
      });
    }
  }
);

/**
 * 📊 STATUS (verifica configuração)
 * Acesse: https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenStatus
 */
export const djenStatus = onRequest(
  {
    cors: true,
    region: "southamerica-east1",
    secrets: [DJEN_OAB_NUMERO, DJEN_OAB_UF, DJEN_ADVOGADO_NOME],
  },
  async (req, res) => {
    const advogadoConfig = resolveAdvogadoConfig();
    res.status(200).json({
      status: "ativo",
      timezone: "America/Sao_Paulo",
      horarios: ["01:00", "09:00"],
      advogadoPadrao: {
        nome: advogadoConfig.nome || "Nao informado",
        oab: `${advogadoConfig.numeroOab}/${advogadoConfig.ufOab}`,
      },
      region: "southamerica-east1 (Brasil)",
    });
  }
);

/**
 * 🔎 PUBLICACOES (proxy para o frontend)
 * Acesse: https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenPublicacoes
 */
export const djenPublicacoes = onRequest(
  {
    cors: true,
    region: "southamerica-east1",
  },
  async (req, res) => {
    try {
      const numeroOab = String(req.query.numeroOab || "");
      const ufOab = String(req.query.ufOab || "");
      if (!numeroOab || !ufOab) {
        res.status(400).json({
          success: false,
          error: "Parâmetros numeroOab e ufOab são obrigatórios",
        });
        return;
      }

      const hoje = new Date().toISOString().split("T")[0];
      const dataInicio = String(req.query.dataInicio || hoje);
      const dataFim = String(req.query.dataFim || dataInicio);

      const publicacoes = await buscarPublicacoesDJEN(numeroOab, ufOab, dataInicio, dataFim);

      res.status(200).json({
        success: true,
        publicacoes,
        count: publicacoes.length,
      });
      return;
    } catch (error: any) {
      logger.error("[DJEN Publicacoes] Erro:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Erro ao consultar DJEN",
      });
      return;
    }
  }
);
