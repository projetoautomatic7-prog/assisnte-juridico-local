import { ClassicEditor } from "ckeditor5";

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
  getActiveSelection(): { from: number; to: number } | null; // Approximate for CKEditor
  setActiveSelection(selection: { from: number; to: number } | null): void;
  getHtmlSchemaAwareness(): string;
}

// ===========================
// Implementation
// ===========================

class CkEditorAiToolkitImpl implements AiToolkit {
  private editor: ClassicEditor;
  private frozenSelection: NonNullable<
    ReturnType<ClassicEditor["model"]["document"]["selection"]["getFirstRange"]>
  > | null = null;

  constructor(editor: ClassicEditor) {
    this.editor = editor;
  }

  getHtmlSchemaAwareness(): string {
    // Generate a schema description based on available CKEditor plugins/features.
    // This helps the AI understand what HTML it can generate.
    
    const features: string[] = [];
    const plugins = this.editor.plugins;

    if (plugins.has('Bold')) features.push('Bold text (<strong>)');
    if (plugins.has('Italic')) features.push('Italic text (<em>)');
    if (plugins.has('Underline')) features.push('Underline (<u>)');
    if (plugins.has('Strikethrough')) features.push('Strikethrough (<s>)');
    if (plugins.has('Heading')) features.push('Headings (<h1>, <h2>, <h3>, <h4>)');
    if (plugins.has('List')) features.push('Bullet lists (<ul>) and Ordered lists (<ol>)');
    if (plugins.has('BlockQuote')) features.push('Block quotes (<blockquote>)');
    if (plugins.has('Link')) features.push('Links (<a href="...">)');
    if (plugins.has('Table')) features.push('Tables (<table>, <tr>, <td>, <th>)');
    if (plugins.has('Image')) features.push('Images (<img>)');
    if (plugins.has('HorizontalLine')) features.push('Horizontal rules (<hr>)');
    if (plugins.has('Code')) features.push('Inline code (<code>)');
    if (plugins.has('Subscript')) features.push('Subscript (<sub>)');
    if (plugins.has('Superscript')) features.push('Superscript (<sup>)');

    return `
The editor supports the following HTML elements and features. 
Please ONLY use these tags when generating content:

${features.map(f => `- ${f}`).join('\n')}

Standard HTML structural tags like <p>, <div>, <br> are always allowed.
Do not use unsupported tags like <video>, <iframe>, <canvas> or custom components not listed above.
`;
  }

  getActiveSelection() {
    // CKEditor doesn't use simple from/to offsets in the same way as Tiptap/ProseMirror across the whole doc.
    // However, for the interface, we return null to imply "use current selection".
    return null; 
  }

  setActiveSelection(selection: { from: number; to: number } | null) {
    if (selection === null) {
      this.frozenSelection = null;
      return;
    }

    const range = this.editor.model.document.selection.getFirstRange();
    this.frozenSelection = range ? range.clone() : null;
  }

  async executeTool(options: ExecuteToolOptions): Promise<ExecuteToolResult> {
    const { toolName, input } = options;
    
    try {
      // Map Tiptap tool names to CKEditor actions for compatibility
      if (toolName === "tiptapRead" || toolName === "read") {
        return this.handleRead(input);
      } else if (toolName === "tiptapEdit" || toolName === "edit") {
        return this.handleEdit(input);
      } else if (toolName === "tiptapReadSelection" || toolName === "readSelection") {
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
    
    // For streaming, we handle it as an edit.
    // Ideally, we should maintain a cursor/marker to append chunks.
    if (toolName === "tiptapEdit" || toolName === "edit") {
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

  private handleRead(_input: unknown): ExecuteToolResult {
    // input.from / input.to are Tiptap specific. 
    // CKEditor data retrieval is usually the whole document.
    const text = this.editor.getData();

    return {
      output: text,
      hasError: false,
      unknownTool: false,
      docChanged: false
    };
  }

  private handleReadSelection(_input: unknown): ExecuteToolResult {
    const model = this.editor.model;
    
    // Use frozen selection if available (Selection Awareness), otherwise current selection
    const ranges = this.frozenSelection
      ? [this.frozenSelection]
      : Array.from(model.document.selection.getRanges());

    let text = "";
    for (const range of ranges) {
      for (const item of range.getItems()) {
        const data = (item as { data?: unknown }).data;
        if (typeof data === "string") text += data;
      }
    }

    return {
      output: text,
      hasError: false,
      unknownTool: false,
      docChanged: false
    };
  }

  private handleEdit(input: unknown): ExecuteToolResult {
    const content =
      input && typeof input === "object" ? (input as Record<string, unknown>).content : undefined;

    if (typeof content !== "string" || content.trim().length === 0) {
       return {
         output: "No content provided for edit",
         hasError: true,
         unknownTool: false,
         docChanged: false
       };
    }

    this.editor.model.change(writer => {
      const viewFragment = this.editor.data.processor.toView(content);
      const modelFragment = this.editor.data.toModel(viewFragment);

      const targetSelection = this.frozenSelection
        ? writer.createSelection(this.frozenSelection)
        : this.editor.model.document.selection;

      // If we want to replace selection:
      if (!targetSelection.isCollapsed) {
         this.editor.model.deleteContent(targetSelection);
      }
      
      this.editor.model.insertContent(modelFragment, targetSelection);
    });

    return {
      output: "Content updated successfully",
      hasError: false,
      unknownTool: false,
      docChanged: true
    };
  }
}

/**
 * Creates an AI Toolkit instance for the given CKEditor instance.
 * @param editor The CKEditor instance
 * @returns The AI Toolkit
 */
export function getCkEditorAiToolkit(editor: ClassicEditor): AiToolkit {
  return new CkEditorAiToolkitImpl(editor);
}
