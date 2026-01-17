export interface ActiveEditorToolkitExecuteOptions {
  toolName: string;
  input: unknown;
  chunkSize?: number;
  reviewOptions?: unknown;
}

export interface ActiveEditorToolkitExecuteResult {
  output: string;
  hasError: boolean;
  unknownTool: boolean;
  docChanged: boolean;
}

export interface ActiveEditorToolkit {
  executeTool(
    options: ActiveEditorToolkitExecuteOptions,
  ): Promise<ActiveEditorToolkitExecuteResult>;
  setActiveSelection?: (selection: { from: number; to: number } | null) => void;
  getHtmlSchemaAwareness?: () => string;
}

let activeEditorToolkit: ActiveEditorToolkit | null = null;

export function setActiveEditorToolkit(
  toolkit: ActiveEditorToolkit | null,
): void {
  activeEditorToolkit = toolkit;
}

export function getActiveEditorToolkit(): ActiveEditorToolkit | null {
  return activeEditorToolkit;
}

export function clearActiveEditorToolkit(toolkit?: ActiveEditorToolkit): void {
  if (!toolkit) {
    activeEditorToolkit = null;
    return;
  }

  if (activeEditorToolkit === toolkit) {
    activeEditorToolkit = null;
  }
}
