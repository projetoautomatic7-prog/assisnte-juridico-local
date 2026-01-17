/**
 * Hook personalizado para gerenciar sincronização DJEN
 * Reduz complexidade cognitiva do componente principal
 */

import { useState } from "react";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  message?: string;
  newPublications?: number;
  rateLimited?: boolean;
}

export function useDJENSync() {
  const [syncing, setSyncing] = useState(false);

  const executeSync = async (): Promise<SyncResult> => {
    const baseUrl =
      typeof import.meta.env.VITE_API_BASE_URL === "string"
        ? import.meta.env.VITE_API_BASE_URL
        : "";
    const triggerUrl =
      typeof import.meta.env.VITE_DJEN_TRIGGER_URL === "string"
        ? import.meta.env.VITE_DJEN_TRIGGER_URL
        : "";
    const syncUrl =
      triggerUrl || (baseUrl ? `${baseUrl}/api/djen-sync` : "/api/djen/trigger-manual");
    let response;
    try {
      response = await fetch(syncUrl, {
        method: "POST",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Failed to fetch") && baseUrl.includes("localhost")) {
        console.warn(
          `[DJEN Sync] ⚠️ Falha de conexão com ${baseUrl}.\n` +
            `Se você está rodando em ambiente Cloud (Replit/Vercel), 'localhost' não funcionará.\n` +
            `Configure VITE_API_BASE_URL no .env com a URL pública do backend.`
        );
      }
      throw error;
    }

    // Rate limit
    if (response.status === 429) {
      const data = await response.json();
      return {
        success: false,
        rateLimited: true,
        message: data.message || "Tente novamente em alguns segundos",
      };
    }

    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}` };
    }

    const result = await response.json();

    if (result.ok) {
      return {
        success: true,
        newPublications: result.result?.newPublications || 0,
      };
    }

    if (result.sucesso) {
      return {
        success: true,
        newPublications: result.dados?.processadas || 0,
      };
    }

    return {
      success: false,
      message: result.error || result.message || result.mensagem || "Erro na sincronização",
    };
  };

  const showSyncToast = (result: SyncResult): void => {
    if (result.rateLimited) {
      toast.warning("Aguarde antes de sincronizar", {
        description: result.message,
      });
      return;
    }

    if (result.success) {
      toast.success("Sincronização concluída", {
        description:
          result.newPublications && result.newPublications > 0
            ? `${result.newPublications} novas publicações encontradas`
            : "Nenhuma nova publicação",
      });
      return;
    }

    toast.error("Falha na sincronização", {
      description: result.message || "Erro desconhecido",
    });
  };

  const handleSync = async (onSuccess?: () => void | Promise<void>) => {
    setSyncing(true);

    try {
      const result = await executeSync();
      showSyncToast(result);

      if (result.success && onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("[DJENWidget] Sync error:", err);
      toast.error("Falha na sincronização", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncing,
    handleSync,
  };
}
