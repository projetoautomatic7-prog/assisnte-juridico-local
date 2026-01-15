/**
 * Hook para criar minutas automaticamente quando agentes de redação completam tarefas
 *
 * Este hook monitora tarefas completadas pelo agente 'redacao-peticoes' e
 * automaticamente cria minutas no sistema com status 'pendente-revisao'
 *
 * ✨ REFATORADO: Usa minuta-service.ts centralizado
 */

import { useKV } from "@/hooks/use-kv";
import type { AgentTask } from "@/lib/agents";
import { createMinutaFromAgentTask } from "@/services/minuta-service";
import type { Minuta } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function useAutoMinuta() {
  const [minutas, setMinutas] = useKV<Minuta[]>("minutas", []);
  const [completedTasks] = useKV<AgentTask[]>("completed-agent-tasks", []);

  // Rastrear tarefas já processadas para evitar duplicatas
  const processedTasksRef = useRef<Set<string>>(new Set());
  // Track count in state to safely return from hook
  const [processedTasksCount, setProcessedTasksCount] = useState(0);

  // Carregar tarefas já processadas do localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("processed-petition-tasks");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        processedTasksRef.current = new Set(parsed);
        setProcessedTasksCount(parsed.length);
      }
    } catch (e) {
      console.error("[AutoMinuta] Erro ao carregar tarefas processadas:", e);
    }
  }, []);

  // Monitorar tarefas completadas do agente de redação
  useEffect(() => {
    if (!completedTasks || completedTasks.length === 0) return;

    // Filtrar tarefas de redação completadas que ainda não foram processadas
    const petitionTasks = completedTasks.filter(
      (task) =>
        task.agentId === "redacao-peticoes" &&
        task.type === "DRAFT_PETITION" &&
        task.status === "completed" &&
        task.result?.data?.draft &&
        !processedTasksRef.current.has(task.id)
    );

    if (petitionTasks.length === 0) return;

    const newMinutas: Minuta[] = [];

    for (const task of petitionTasks) {
      try {
        const newMinuta = createMinutaFromAgentTask(task);
        if (newMinuta) {
          newMinutas.push(newMinuta);
          processedTasksRef.current.add(task.id);
          toast.success(`📝 Nova minuta criada pelo Agente de Redação!`, {
            description: newMinuta.titulo,
            duration: 8000,
          });
        }
      } catch (error) {
        console.error("[AutoMinuta] Erro ao criar minuta:", error);
      }
    }

    if (newMinutas.length > 0) {
      setMinutas((current) => [...(current || []), ...newMinutas]);
      localStorage.setItem(
        "processed-petition-tasks",
        JSON.stringify([...processedTasksRef.current])
      );
      setProcessedTasksCount(processedTasksRef.current.size);
    }
  }, [completedTasks?.length, setMinutas]); // Dependência em length para estabilidade

  const stats = useMemo(
    () => ({
      minutasTotal: minutas?.length || 0,
      minutasPendentesRevisao: minutas?.filter((m) => m.status === "pendente-revisao").length || 0,
      minutasCriadasPorAgente: minutas?.filter((m) => m.criadoPorAgente).length || 0,
      processedTasksCount,
    }),
    [minutas?.length, processedTasksCount]
  );

  return stats;
}
