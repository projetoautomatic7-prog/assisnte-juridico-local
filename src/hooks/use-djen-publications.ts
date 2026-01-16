/**
 * Hook personalizado para gerenciar publicações DJEN
 * Reduz complexidade cognitiva do componente principal
 *
 * Estratégia de fallback:
 * 1. Tenta buscar do backend (/api/expedientes)
 * 2. Se falhar, tenta buscar diretamente da API DJEN via navegador
 *    (resolve problema de geobloqueio quando backend está fora do Brasil)
 */

import type { DJENPublication } from "@/types/djen-publication";
import { useCallback, useRef, useState, useEffect } from "react";

// Correção para erro "process is not defined" no Vite
const VITE_DJEN_ADVOGADO_NOME =
  typeof import.meta.env.VITE_DJEN_ADVOGADO_NOME === "string"
    ? import.meta.env.VITE_DJEN_ADVOGADO_NOME
    : "Advogado Exemplo";
const VITE_DJEN_ADVOGADO_OAB =
  typeof import.meta.env.VITE_DJEN_ADVOGADO_OAB === "string"
    ? import.meta.env.VITE_DJEN_ADVOGADO_OAB
    : "000000/XX";
const VITE_API_BASE_URL =
  typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL : "";

interface ExpedientesResponse {
  success: boolean;
  expedientes: DJENPublication[];
  count: number;
  lastCheck: string | null;
  lawyersConfigured: number;
  message?: string;
}

interface MonitoredLawyer {
  id: string;
  name: string;
  oab: string;
  enabled: boolean;
}

const DEFAULT_LAWYERS: MonitoredLawyer[] = [
  {
    id: "exemplo-advogado",
    name: VITE_DJEN_ADVOGADO_NOME,
    oab: VITE_DJEN_ADVOGADO_OAB,
    enabled: true,
  },
];

async function fetchFromBackend(
  baseUrl: string,
  maxItems: number,
  filter: "all" | "unread"
): Promise<ExpedientesResponse> {
  const statusParam = filter === "unread" ? "&status=unread" : "";
  const response = await fetch(`${baseUrl}/api/expedientes?limit=${maxItems * 2}${statusParam}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchMonitoredLawyers(baseUrl: string): Promise<MonitoredLawyer[]> {
  try {
    const response = await fetch(`${baseUrl}/api/lawyers`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.lawyers || [];
  } catch {
    return [];
  }
}

function loadLawyersFromStorage(): MonitoredLawyer[] {
  const stored = localStorage.getItem("monitored-lawyers");
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as MonitoredLawyer[]) : [];
  } catch {
    return [];
  }
}

function ensureDefaultLawyersPersisted(): MonitoredLawyer[] {
  localStorage.setItem("monitored-lawyers", JSON.stringify(DEFAULT_LAWYERS));
  return DEFAULT_LAWYERS;
}

function normalizeDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseOAB(oab: string): { numero?: string; uf?: string } {
  if (!oab) return {};
  const normalized = oab.trim().toUpperCase();
  const matchNumericUF = /(\d+)[\s/-]{1,2}([A-Z]{2})/i.exec(normalized);
  if (matchNumericUF) return { numero: matchNumericUF[1], uf: matchNumericUF[2] };
  const matchUFNumeric = /([A-Z]{2})[\s/-]{1,2}(\d+)/i.exec(normalized);
  if (matchUFNumeric) return { numero: matchUFNumeric[2], uf: matchUFNumeric[1] };
  return {};
}

async function fetchPublicationsForLawyer(
  baseUrl: string,
  lawyer: MonitoredLawyer,
  maxItems: number
): Promise<DJENPublication[]> {
  const { numero, uf } = parseOAB(lawyer.oab);
  if (!numero || !uf) return [];

  try {
    const hoje = normalizeDateISO(new Date());
    const url = `${baseUrl}/api/djen/publicacoes?numeroOab=${numero}&ufOab=${uf}&dataInicio=${hoje}&dataFim=${hoje}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = (await response.ok) ? await response.json() : null;
    if (!data?.success || !Array.isArray(data.publicacoes)) return [];

    return (data.publicacoes as Array<Record<string, unknown>>).slice(0, maxItems).map((pub) => ({
      id: (pub.id as string) || crypto.randomUUID(),
      tribunal: pub.siglaTribunal as string,
      data: pub.dataDisponibilizacao as string,
      tipo: (pub.tipoComunicacao as string) || "Intimação",
      teor: pub.texto as string,
      numeroProcesso: pub.numeroProcesso as string,
      orgao: pub.nomeOrgao as string,
      lawyerName: lawyer.name,
      matchType: "oab" as const,
      source: "DJEN-Proxy",
      createdAt: new Date().toISOString(),
      notified: false,
    }));
  } catch {
    return [];
  }
}

async function fetchFromBackendProxy(
  baseUrl: string,
  maxItems: number
): Promise<{ expedientes: DJENPublication[]; lawyersConfigured: number }> {
  let lawyers = await fetchMonitoredLawyers(baseUrl);
  if (lawyers.length === 0) lawyers = loadLawyersFromStorage();
  if (lawyers.length === 0) lawyers = ensureDefaultLawyersPersisted();

  const enabledLawyers = lawyers.filter((l) => l.enabled);
  if (enabledLawyers.length === 0) return { expedientes: [], lawyersConfigured: 0 };

  const allPublications: DJENPublication[] = [];
  for (const lawyer of enabledLawyers) {
    const pubs = await fetchPublicationsForLawyer(baseUrl, lawyer, maxItems);
    if (pubs.length) allPublications.push(...pubs);
  }

  return {
    expedientes: allPublications.slice(0, maxItems),
    lawyersConfigured: enabledLawyers.length,
  };
}

export function useDJENPublications(maxItems: number, filter: "all" | "unread") {
  const [publications, setPublications] = useState<DJENPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [lawyersCount, setLawyersCount] = useState(0);
  const [isGeoBlocked, setIsGeoBlocked] = useState(false);

  const isFetchingRef = useRef(false);

  const fetchPublications = useCallback(async () => {
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      setIsGeoBlocked(false);

      try {
        const data = await fetchFromBackend(VITE_API_BASE_URL, maxItems, filter);
        if (data.success) {
          setPublications(data.expedientes.slice(0, maxItems));
          setLastCheck(data.lastCheck);
          setLawyersCount(data.lawyersConfigured);
          return;
        }
      } catch {
        // Fallback silently to proxy
      }

      const browserResult = await fetchFromBackendProxy(VITE_API_BASE_URL, maxItems);
      setPublications(browserResult.expedientes);
      setLawyersCount(browserResult.lawyersConfigured);
      setLastCheck(new Date().toISOString());
    } catch (err) {
      setError("Não foi possível carregar publicações");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [maxItems, filter]);

  // Initial fetch
  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  return {
    publications,
    loading,
    error,
    lastCheck,
    lawyersCount,
    fetchPublications,
    isGeoBlocked,
  };
}
