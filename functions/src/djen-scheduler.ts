/**
 * DJEN Scheduler - Firebase Functions
 * Monitora automaticamente publicações DJEN via Cloud Scheduler
 */

import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";

// Configuração do advogado (use Firebase Config ou Secret Manager em produção)
const ADVOGADO_CONFIG = {
  numeroOab: process.env.DJEN_OAB_NUMERO || "184404",
  ufOab: process.env.DJEN_OAB_UF || "MG",
  nome: process.env.DJEN_ADVOGADO_NOME || "Thiago Bodevan Veiga",
};

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
  dataInicio: string
): Promise<DJENPublicacao[]> {
  const url = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao");
  url.searchParams.set("numeroOab", numeroOab);
  url.searchParams.set("ufOab", ufOab);
  url.searchParams.set("meio", "D"); // D=Diário
  url.searchParams.set("dataDisponibilizacaoInicio", dataInicio);
  url.searchParams.set("dataDisponibilizacaoFim", dataInicio);

  logger.info(`[DJEN] Consultando API CNJ: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Assistente-Juridico-Firebase/1.0",
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
  const publicacoes: DJENPublicacao[] = (data.items || []).map((item: any) => ({
    id: item.id || item.numeroComunicacao || `${Date.now()}`,
    siglaTribunal: item.siglaTribunal || "",
    tipoComunicacao: item.tipoComunicacao || "",
    numeroProcesso: item.numero_processo || item.numeroProcesso || "",
    texto: item.texto || "",
    dataDisponibilizacao: item.data_disponibilizacao || item.dataDisponibilizacao || "",
    nomeOrgao: item.nomeOrgao || "",
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
  
  logger.info(`[DJEN] Iniciando processamento - ${dataHoje}`);
  logger.info(`[DJEN] Advogado: ${ADVOGADO_CONFIG.nome} (OAB/${ADVOGADO_CONFIG.ufOab} ${ADVOGADO_CONFIG.numeroOab})`);

  try {
    const publicacoes = await buscarPublicacoesDJEN(
      ADVOGADO_CONFIG.numeroOab,
      ADVOGADO_CONFIG.ufOab,
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
  },
  async (req, res) => {
    res.status(200).json({
      status: "ativo",
      timezone: "America/Sao_Paulo",
      horarios: ["01:00", "09:00"],
      advogadoPadrao: {
        nome: ADVOGADO_CONFIG.nome,
        oab: `${ADVOGADO_CONFIG.numeroOab}/${ADVOGADO_CONFIG.ufOab}`,
      },
      region: "southamerica-east1 (Brasil)",
    });
  }
);
