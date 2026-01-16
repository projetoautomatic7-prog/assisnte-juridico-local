import { Editor } from "@tiptap/react";

// ===========================
// Type Definitions
// ===========================

export interface ReviewOptions {
  mode?: "disabled" | "review" | "preview";
  diffMode?: "detailed" | "full";
  showAsDiff?: boolean;
  diffPosition?: "before" | "after";
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  threadData?: Record<string, unknown>;
  commentData?: Record<string, unknown>;
}

export interface ExecuteToolOptions {
  toolName: string;
  input: unknown;
  chunkSize?: number;
  reviewOptions?: ReviewOptions;
}

export interface ExecuteToolResult {
  output: string;
  hasError: boolean;
  unknownTool: boolean;
  docChanged: boolean;
}

export interface StreamToolOptions {
  toolCallId: unknown;
  toolName: string;
  input: unknown;
  hasFinished?: boolean;
  chunkSize?: number;
  reviewOptions?: ReviewOptions;
}

export interface StreamToolResult {
  output: string;
  hasError: boolean;
  unknownTool: boolean;
  docChanged: boolean;
}

export interface AiToolkit {
  executeTool(options: ExecuteToolOptions): Promise<ExecuteToolResult>;
  streamTool(options: StreamToolOptions): Promise<StreamToolResult>;
  getActiveSelection(): { from: number; to: number } | null;
  setActiveSelection(selection: { from: number; to: number } | null): void;
  getHtmlSchemaAwareness(options?: HtmlSchemaAwarenessOptions): string;
}

export interface HtmlSchemaAwarenessOptions {
  customNodes?: Array<{
    name: string;
    tag?: string;
    description?: string;
    attributes?: Array<{
      attr: string;
      value?: string;
      description?: string;
    }>;
  }>;
}

// ===========================
// Implementation
// ===========================

class AiToolkitImpl implements AiToolkit {
  private editor: Editor;
  private _activeSelection: { from: number; to: number } | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  getActiveSelection(): { from: number; to: number } | null {
    return this._activeSelection;
  }

  setActiveSelection(selection: { from: number; to: number } | null): void {
    this._activeSelection = selection;
  }

  getHtmlSchemaAwareness(options?: HtmlSchemaAwarenessOptions): string {
    const schema = this.editor.schema;
    const nodeNames: string[] = [];
    const markNames: string[] = [];

    schema.spec.nodes.forEach((_spec, name) => {
      nodeNames.push(name);
    });
    schema.spec.marks.forEach((_spec, name) => {
      markNames.push(name);
    });

    const tagHints: Record<string, string> = {
      paragraph: "<p>",
      heading: "<h1>-<h6>",
      bulletList: "<ul>",
      orderedList: "<ol>",
      listItem: "<li>",
      blockquote: "<blockquote>",
      codeBlock: "<pre><code>",
      horizontalRule: "<hr>",
      hardBreak: "<br>",
      image: "<img>",
      taskList: "<ul data-type=\"taskList\">",
      taskItem: "<li data-type=\"taskItem\">",
    };

    const allowedNodes = nodeNames
      .map((name) => `${name}${tagHints[name] ? ` (use ${tagHints[name]})` : ""}`)
      .join(", ");
    const allowedMarks = markNames.join(", ") || "nenhuma marca adicional";

    const custom = (options?.customNodes || [])
      .map((node) => {
        const attrs =
          node.attributes
            ?.map((attr) => {
              const value = attr.value ? `="${attr.value}"` : "";
              return `attr: ${attr.attr}${value} - ${attr.description || "sem descrição"}`;
            })
            .join("; ") || "sem atributos obrigatórios";
        return `Custom node "${node.name}"${node.tag ? ` (tag ${node.tag})` : ""}: ${
          node.description || "sem descrição fornecida"
        }. Atributos: ${attrs}.`;
      })
      .join("\n");

    const tableUnsupported =
      !nodeNames.includes("table") && !nodeNames.includes("tableCell")
        ? "Não gere tabelas (<table>) nem células de tabela."
        : "";

    return [
      "Gere apenas HTML compatível com o esquema do editor Tiptap.",
      `Nós suportados: ${allowedNodes}.`,
      `Marcas suportadas: ${allowedMarks}.`,
      tableUnsupported,
      custom ? `Nós customizados:\n${custom}` : "",
      "Use apenas tags listadas; se não tiver certeza, devolva texto simples ou explique que o elemento não é suportado.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async executeTool(options: ExecuteToolOptions): Promise<ExecuteToolResult> {
    const { toolName, input } = options;

    try {
      if (toolName === "tiptapRead") {
        return this.handleRead(input);
      } else if (toolName === "tiptapEdit") {
        return this.handleEdit(input);
      } else if (toolName === "tiptapReadSelection") {
        return this.handleReadSelection(input);
      }

      return {
        output: `Unknown tool: ${toolName}`,
        hasError: true,
        unknownTool: true,
        docChanged: false
      };
    } catch (error) {
      return {
        output: error instanceof Error ? error.message : "Error executing tool",
        hasError: true,
        unknownTool: false,
        docChanged: false
      };
    }
  }

  async streamTool(options: StreamToolOptions): Promise<StreamToolResult> {
    const { toolName, input } = options;

    if (toolName === "tiptapEdit") {
      return this.handleEdit(input);
    }

    // Fallback to executeTool
    return this.executeTool({
      toolName,
      input,
      chunkSize: options.chunkSize,
      reviewOptions: options.reviewOptions
    });
  }

  // --- Tool Handlers ---

  private handleRead(input: unknown): ExecuteToolResult {
    const maybe = (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const from = maybe.from;
    const to = maybe.to;
    let text = "";

    if (typeof from === "number" && typeof to === "number") {
      text = this.editor.state.doc.textBetween(from, to, "\n");
    } else {
      text = this.editor.getText();
    }

    return {
      output: text,
      hasError: false,
      unknownTool: false,
      docChanged: false
    };
  }

  private handleReadSelection(_input: unknown): ExecuteToolResult {
    // Use activeSelection if set, otherwise editor selection
    const selection = this._activeSelection 
      ? { from: this._activeSelection.from, to: this._activeSelection.to }
      : { from: this.editor.state.selection.from, to: this.editor.state.selection.to };
      
    const text = this.editor.state.doc.textBetween(selection.from, selection.to, "\n");

    return {
      output: text,
      hasError: false,
      unknownTool: false,
      docChanged: false
    };
  }

  private handleEdit(input: unknown): ExecuteToolResult {
    const maybe = (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const content = maybe.content;
    const from = maybe.from;
    const to = maybe.to;

    if (typeof content !== "string" || content.trim().length === 0) {
       return {
         output: "No content provided for edit",
         hasError: true,
         unknownTool: false,
         docChanged: false
       };
    }

    const range = (typeof from === "number" && typeof to === "number")
      ? { from, to }
      : this._activeSelection || this.editor.state.selection;

    // Use chain to preserve focus or handle history
    this.editor.chain()
      .focus()
      .setTextSelection(range)
      .deleteSelection() // remove existing content in range
      .insertContent(content)
      .run();

    return {
      output: "Content updated successfully",
      hasError: false,
      unknownTool: false,
      docChanged: true
    };
  }
}

/**
 * Creates an AI Toolkit instance for the given editor.
 * @param editor The Tiptap editor instance
 * @returns The AI Toolkit
 */
export function getAiToolkit(editor: Editor): AiToolkit {
  return new AiToolkitImpl(editor);
}
