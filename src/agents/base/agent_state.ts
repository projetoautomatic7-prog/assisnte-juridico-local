export interface AgentMessage {
  role: string;
  content: string;
}

export interface AgentState {
  messages: AgentMessage[];
  currentStep: string;
  data: Record<string, unknown>;
  completed: boolean;
  retryCount: number;
  maxRetries: number;
  startedAt: number;
  lastUpdatedAt: number;
  error?: string;
}

export function updateState(
  currentState: AgentState,
  updates: Partial<AgentState>,
): AgentState {
  return {
    ...currentState,
    ...updates,
    lastUpdatedAt: Date.now(),
  };
}
