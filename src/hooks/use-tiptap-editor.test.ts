import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTiptapEditor } from "./use-tiptap-editor";

describe("useTiptapEditor", () => {
  it("retorna editor null quando não há contexto nem editor fornecido", () => {
    const { result } = renderHook(() => useTiptapEditor());
    expect(result.current.editor).toBeNull();
  });
});
