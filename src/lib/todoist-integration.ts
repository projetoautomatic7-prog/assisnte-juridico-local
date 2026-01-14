/**
 * Integração do Todoist AI com o Assistente Jurídico PJe
 *
 * Este arquivo fornece funções wrapper para usar o cliente Todoist
 * no contexto do assistente jurídico, permitindo gerenciar tarefas relacionadas
 * a processos judiciais, prazos e atividades jurídicas.
 *
 * @note As chamadas reais ao Todoist são feitas via endpoints /api/todoist.
 */

import type { Task } from "@/lib/todoist-types";

// Prioridade no Todoist: 4 (Vermelho/Urgente) a 1 (Branco/Normal)
type Priority = 1 | 2 | 3 | 4;

interface LegalTaskInput {
  content: string;
  description?: string;
  dueDate?: string;
  priority?: Priority;
  labels?: string[];
  projectId?: string;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

async function callTodoist<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${baseUrl}/api/todoist?action=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Todoist API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Wrapper para adicionar tarefas jurídicas ao Todoist
 *
 * @param tasks Array de tarefas a adicionar
 * @example
 * await addLegalTasks([{
 *   content: "Elaborar contestação - Processo 1234567-89.2024.8.09.0000",
 *   description: "Prazo: 15 dias úteis",
 *   dueDate: "2024-12-15",
 *   priority: 4
 * }])
 */
export async function addLegalTasks(tasks: LegalTaskInput[]): Promise<Task[]> {
  const createdTasks: Task[] = [];
  for (const task of tasks) {
    const response = await callTodoist<{ ok: boolean; task: Task }>("addTask", {
      content: task.content,
      description: task.description,
      dueString: task.dueDate,
      priority: task.priority,
      labels: task.labels,
      projectId: task.projectId,
    });
    const created = response.task;
    createdTasks.push(created);
  }

  return createdTasks;
}

/**
 * Busca tarefas de uma data específica
 *
 * @param date Data no formato YYYY-MM-DD
 * @example
 * const tasks = await findLegalTasksByDate("2024-12-15");
 */
export async function findLegalTasksByDate(date: string): Promise<Task[]> {
  const response = await callTodoist<{ ok: boolean; tasks: Task[] }>("getTasks", {
    filter: date,
  });
  return response.tasks;
}

/**
 * Busca tarefas com filtro customizado
 *
 * @param searchText Texto para buscar nas tarefas ou filtro Todoist
 * @example
 * const urgentTasks = await searchLegalTasks("@processo & p1");
 */
export async function searchLegalTasks(searchText: string): Promise<Task[]> {
  const response = await callTodoist<{ ok: boolean; tasks: Task[] }>("getTasks", {
    filter: searchText,
  });
  return response.tasks;
}

/**
 * Atualiza uma tarefa existente
 *
 * @param taskId ID da tarefa no Todoist
 * @param updates Atualizações a aplicar
 */
export async function updateLegalTask(
  taskId: string,
  updates: {
    content?: string;
    description?: string;
    dueDate?: string;
    priority?: Priority;
    labels?: string[];
  }
) {
  const { dueDate, ...rest } = updates;
  const response = await callTodoist<{ ok: boolean; task: Task }>("updateTask", {
    id: taskId,
    ...rest,
    dueString: dueDate,
  });
  return response.task;
}

/**
 * Marca uma tarefa como concluída
 *
 * @param taskId ID da tarefa no Todoist
 */
export async function completeLegalTask(taskId: string) {
  return await callTodoist<{ ok: boolean; message: string }>("closeTask", { id: taskId });
}

/**
 * Cria uma tarefa a partir de um prazo processual
 *
 * @param processNumber Número do processo
 * @param taskType Tipo de tarefa (ex: "Contestação", "Recurso", "Alegações Finais")
 * @param deadline Data limite (YYYY-MM-DD)
 * @param description Descrição adicional
 */
export async function createTaskFromDeadline(
  processNumber: string,
  taskType: string,
  deadline: string,
  description?: string
) {
  const taskContent = `${taskType} - Processo ${processNumber}`;
  const taskDescription = description
    ? `${description}\n\nProcesso: ${processNumber}`
    : `Processo: ${processNumber}`;

  return await addLegalTasks([
    {
      content: taskContent,
      description: taskDescription,
      dueDate: deadline,
      priority: 4, // Alta prioridade para prazos processuais
      labels: ["processo", "prazo", taskType.toLowerCase()],
    },
  ]);
}

/**
 * Busca todas as tarefas relacionadas a um processo específico
 *
 * @param processNumber Número do processo
 */
export async function findTasksByProcess(processNumber: string) {
  return await searchLegalTasks(processNumber);
}

/**
 * Cria tarefas para um novo processo judicial
 *
 * @param processData Dados do processo
 */
export async function createProcessTasks(processData: {
  number: string;
  type: string;
  deadlines: Array<{
    type: string;
    date: string;
    description?: string;
  }>;
}) {
  const tasks: LegalTaskInput[] = processData.deadlines.map((deadline) => ({
    content: `${deadline.type} - Processo ${processData.number}`,
    description: `${deadline.description || ""}\n\nProcesso: ${
      processData.number
    }\nTipo: ${processData.type}`,
    dueDate: deadline.date,
    priority: 4 as Priority,
    labels: ["processo", "prazo", deadline.type.toLowerCase()],
  }));

  return await addLegalTasks(tasks);
}

/**
 * Obtém tarefas de hoje
 */
export async function getTodayTasks() {
  const today = new Date().toISOString().split("T")[0];
  return await findLegalTasksByDate(today);
}

/**
 * Obtém tarefas urgentes (próximos 3 dias)
 */
export async function getUrgentTasks() {
  const response = await callTodoist<{ ok: boolean; tasks: Task[] }>("getTasks", {
    filter: "3 days",
  });
  return response.tasks;
}

/**
 * Verifica se o Todoist está configurado no backend
 */
export async function checkTodoistConfig(): Promise<boolean> {
  const response = await callTodoist<{ ok: boolean; configured: boolean }>("checkConfig");
  return response.configured === true;
}

/**
 * Exporta as ferramentas configuradas para uso com LLMs
 * (compatível com Vercel AI SDK e similares)
 */
/**
 * Ferramentas do Todoist para integração com agentes IA.
 *
 * @note As funções do @doist/todoist-ai não estão disponíveis no client-side.
 * Use os endpoints /api/todoist-* para operações reais.
 *
 * @param _client Cliente TodoistApi (não utilizado no stub)
 * @returns Objeto com ferramentas mockadas
 */
export function getTodoistTools() {
  return {
    findTasksByDate: {
      name: "findTasksByDate",
      execute: (input: { date: string }) => findLegalTasksByDate(input.date),
    },
    addTasks: {
      name: "addTasks",
      execute: (input: { tasks: LegalTaskInput[] }) => addLegalTasks(input.tasks),
    },
    findTasks: {
      name: "findTasks",
      execute: (input: { query: string }) => searchLegalTasks(input.query),
    },
    updateTasks: {
      name: "updateTasks",
      execute: (input: { id: string; updates: Parameters<typeof updateLegalTask>[1] }) =>
        updateLegalTask(input.id, input.updates),
    },
    completeTasks: {
      name: "completeTasks",
      execute: (input: { id: string }) => completeLegalTask(input.id),
    },
  };
}
