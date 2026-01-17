/**
 * Testes para useAutoMinuta hook
 * Valida o processamento em batch de múltiplas tarefas
 */

import type { AgentTask } from "@/lib/agents";
import type { Minuta } from "@/types";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAutoMinuta } from "./use-auto-minuta";

function writeStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

describe("useAutoMinuta", () => {
  beforeEach(() => {
    localStorage.clear();
    writeStorage("minutas", []);
    writeStorage("completed-agent-tasks", []);
    localStorage.removeItem("processed-petition-tasks");
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Processamento em Batch", () => {
    it("deve processar múltiplas tarefas completadas em batch", async () => {
      const tasks: AgentTask[] = [
        {
          id: "task-1",
          agentId: "redacao-peticoes",
          type: "DRAFT_PETITION",
          status: "completed",
          priority: "medium",
          createdAt: new Date().toISOString(),
          result: {
            success: true,
            message: "Petição criada",
            data: { draft: "Conteúdo da petição 1" },
          },
          data: { documentType: "Petição Inicial" },
        },
        {
          id: "task-2",
          agentId: "redacao-peticoes",
          type: "DRAFT_PETITION",
          status: "completed",
          priority: "medium",
          createdAt: new Date().toISOString(),
          result: {
            success: true,
            message: "Petição criada",
            data: { draft: "Conteúdo da petição 2" },
          },
          data: { documentType: "Petição" },
        },
        {
          id: "task-3",
          agentId: "redacao-peticoes",
          type: "DRAFT_PETITION",
          status: "completed",
          priority: "medium",
          createdAt: new Date().toISOString(),
          result: {
            success: true,
            message: "Petição criada",
            data: { draft: "Conteúdo da petição 3" },
          },
          data: { documentType: "Contestação" },
        },
      ];

      writeStorage("completed-agent-tasks", tasks);

      const { result } = renderHook(() => useAutoMinuta());

      await waitFor(() => {
        expect(result.current.minutasTotal).toBe(3);
      });

      expect(result.current.processedTasksCount).toBe(3);
      expect(result.current.minutasCriadasPorAgente).toBe(3);

      const processed = JSON.parse(
        localStorage.getItem("processed-petition-tasks") ?? "[]",
      ) as string[];

      expect(processed).toEqual(
        expect.arrayContaining(["task-1", "task-2", "task-3"]),
      );

      const storedMinutas = JSON.parse(
        localStorage.getItem("minutas") ?? "[]",
      ) as Minuta[];
      expect(storedMinutas).toHaveLength(3);
    });
  });

  describe("Tratamento de Erros", () => {
    it("não deve atualizar estado se nenhuma minuta for criada", async () => {
      const tasks: AgentTask[] = [
        {
          id: "task-no-draft",
          agentId: "redacao-peticoes",
          type: "DRAFT_PETITION",
          status: "completed",
          priority: "medium",
          createdAt: new Date().toISOString(),
          result: {
            success: true,
            message: "OK",
            data: {},
          },
          data: { documentType: "Petição" },
        },
      ];

      writeStorage("completed-agent-tasks", tasks);

      const { result } = renderHook(() => useAutoMinuta());

      await waitFor(() => {
        expect(result.current.minutasTotal).toBe(0);
      });

      expect(localStorage.getItem("processed-petition-tasks")).toBeNull();
    });
  });

  describe("Estatísticas", () => {
    it("deve retornar estatísticas corretas", () => {
      const minutasWithStats: Minuta[] = [
        {
          id: "11111111-1111-4111-8111-111111111111",
          titulo: "Minuta 1",
          conteudo: "Conteúdo",
          tipo: "peticao",
          status: "pendente-revisao",
          criadoPorAgente: true,
          criadoEm: "2025-01-01T00:00:00.000Z",
          atualizadoEm: "2025-01-01T00:00:00.000Z",
          autor: "Agente Redação (IA)",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          titulo: "Minuta 2",
          conteudo: "Conteúdo",
          tipo: "peticao",
          status: "finalizada",
          criadoPorAgente: true,
          criadoEm: "2025-01-02T00:00:00.000Z",
          atualizadoEm: "2025-01-02T00:00:00.000Z",
          autor: "Agente Redação (IA)",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          titulo: "Minuta 3",
          conteudo: "Conteúdo",
          tipo: "peticao",
          status: "rascunho",
          criadoPorAgente: false,
          criadoEm: "2025-01-03T00:00:00.000Z",
          atualizadoEm: "2025-01-03T00:00:00.000Z",
          autor: "Advogado",
        },
      ];

      writeStorage("minutas", minutasWithStats);

      const { result } = renderHook(() => useAutoMinuta());

      expect(result.current.minutasTotal).toBe(3);
      expect(result.current.minutasPendentesRevisao).toBe(1);
      expect(result.current.minutasCriadasPorAgente).toBe(2);
    });
  });
});
