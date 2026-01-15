/**
 * Cliente para API do DJEN (Diário de Justiça Eletrônico Nacional)
 * Documentação: https://comunicaapi.pje.jus.br/
 */

const DJEN_API_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";

interface DJENPublicacao {
  id: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  numeroProcesso: string;
  texto: string;
  dataDisponibilizacao: string;
  nomeOrgao: string;
}

interface BuscarPublicacoesParams {
  numeroOab: string;
  ufOab: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
}

/**
 * Busca publicações do DJEN para um advogado específico
 *
 * ATENÇÃO: A API do CNJ só aceita requisições originadas do Brasil.
 * Requisições de fora do país retornam erro 403/451 (geobloqueio).
 */
export async function buscarPublicacoesDJEN(
  params: BuscarPublicacoesParams
): Promise<DJENPublicacao[]> {
  const url = new URL(DJEN_API_URL);
  url.searchParams.set("numeroOab", params.numeroOab);
  url.searchParams.set("ufOab", params.ufOab);
  url.searchParams.set("meio", "D"); // D=Diário, E=Eletrônico
  url.searchParams.set("dataDisponibilizacaoInicio", params.dataInicio);
  url.searchParams.set("dataDisponibilizacaoFim", params.dataFim);
  url.searchParams.set("itensPorPagina", "100");
  url.searchParams.set("pagina", "1");

  console.log(`📡 Buscando DJEN: ${url.toString()}`);

  try {
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
          `API bloqueada geograficamente (erro ${response.status}). ` +
            `A API do CNJ só aceita requisições do Brasil.`
        );
      }
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Resposta não está em formato JSON. Verifique os cabeçalhos da requisição.");
    }

    const data: unknown = await response.json();

    const rawItems: Array<Record<string, unknown>> = Array.isArray(data)
      ? (data as Array<Record<string, unknown>>)
      : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
        ? ((data as { items: Array<Record<string, unknown>> }).items as Array<Record<string, unknown>>)
        : [];

    const publicacoes: DJENPublicacao[] = rawItems.map((item) => {
      const id =
        (typeof item.idExpediente === "string" && item.idExpediente) ||
        (typeof item.id === "number" ? String(item.id) : typeof item.id === "string" ? item.id : "") ||
        (typeof item.numeroComunicacao === "number" ? String(item.numeroComunicacao) : "") ||
        (typeof item.numeroProcesso === "string" && item.numeroProcesso) ||
        (typeof item.numero_processo === "string" && item.numero_processo) ||
        `djen-${Date.now()}`;

      return {
        id,
        siglaTribunal:
          (typeof item.siglaTribunal === "string" && item.siglaTribunal) ||
          (typeof item.sigla_tribunal === "string" && item.sigla_tribunal) ||
          "",
        tipoComunicacao:
          (typeof item.tipoComunicacao === "string" && item.tipoComunicacao) ||
          (typeof item.tipo_comunicacao === "string" && item.tipo_comunicacao) ||
          "",
        numeroProcesso:
          (typeof item.numeroProcesso === "string" && item.numeroProcesso) ||
          (typeof item.numero_processo === "string" && item.numero_processo) ||
          "",
        texto:
          (typeof item.teor === "string" && item.teor) ||
          (typeof item.texto === "string" && item.texto) ||
          (typeof item.inteiroTeor === "string" && item.inteiroTeor) ||
          (typeof item.inteiro_teor === "string" && item.inteiro_teor) ||
          "",
        dataDisponibilizacao:
          (typeof item.dataDisponibilizacao === "string" && item.dataDisponibilizacao) ||
          (typeof item.data_disponibilizacao === "string" && item.data_disponibilizacao) ||
          (typeof item.datadisponibilizacao === "string" && item.datadisponibilizacao) ||
          new Date().toISOString(),
        nomeOrgao:
          (typeof item.nomeOrgao === "string" && item.nomeOrgao) ||
          (typeof item.nome_orgao === "string" && item.nome_orgao) ||
          "",
      };
    });

    console.log(`✅ DJEN API: ${publicacoes.length} publicações encontradas`);
    return publicacoes;
  } catch (error) {
    console.error(`❌ Erro ao buscar DJEN:`, error);
    throw error;
  }
}
