import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePJeDocumentSync } from "./use-pje-document-sync";

describe("usePJeDocumentSync", () => {
  it("deve inicializar com estado padrão quando chrome API não está disponível", () => {
    const { result } = renderHook(() => usePJeDocumentSync());

    expect(result.current.documentosPendentes).toEqual([]);
    expect(result.current.documentosProcessados).toEqual([]);
    expect(result.current.carregando).toBe(false);
    expect(result.current.extensaoAtivaNoTab).toBe(false);
  });
});
