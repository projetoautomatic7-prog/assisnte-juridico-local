/**
 * Tipos compartilhados do Todoist usados no frontend.
 *
 * Observação: chamadas reais devem ser feitas via /api/todoist.
 */

export function getTaskUrl(taskId: string): string {
  return `https://todoist.com/app/task/${taskId}`;
}

export function getProjectUrl(projectId: string): string {
  return `https://todoist.com/app/project/${projectId}`;
}

/**
 * Compat type para código antigo — agora é só um alias de Task[]
 * (no SDK oficial, getTasks retorna Task[])
 */
export type GetTasksResponse = Task[];

export interface Task {
  id: string;
  content: string;
  description?: string;
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  order?: number;
  labels?: string[];
  priority?: number;
  dueString?: string;
  dueDate?: string;
  dueDatetime?: string;
  dueLang?: string;
  assigneeId?: string;
  url?: string;
  commentCount?: number;
  isCompleted?: boolean;
  createdAt?: string;
  userId?: string;
  addedByUid?: string | null;
  assignedByUid?: string | null;
  responsibleUid?: string | null;
  syncId?: string | null;
  completedAt?: string | null;
  isCollapsed?: boolean;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  parentId?: string;
  order?: number;
  commentCount?: number;
  isShared?: boolean;
  isFavorite?: boolean;
  isInboxProject?: boolean;
  isTeamInbox?: boolean;
  viewStyle?: string;
  url?: string;
}

export interface Section {
  id: string;
  projectId: string;
  order: number;
  name: string;
}

export interface Comment {
  id: string;
  taskId?: string;
  projectId?: string;
  content: string;
  postedAt: string;
  attachment?: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    resourceType: string;
  };
}

export interface Label {
  id: string;
  name: string;
  color: string;
  order: number;
  isFavorite: boolean;
}
