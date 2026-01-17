import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { Minuta, Process } from "../../types";
import MinutasManager from "../MinutasManager";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function seedLocalStorage(minutas: Minuta[], processes: Process[]) {
  localStorage.setItem("minutas", JSON.stringify(minutas));
  localStorage.setItem("processes", JSON.stringify(processes));
}

describe("MinutasManager - renderização básica", () => {
  beforeEach(() => {
    const mockMinutas: Minuta[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        titulo: "Petição Inicial - Processo 123",
        tipo: "peticao",
        conteudo:
          "<p>Esta é uma petição inicial de teste com mais de 200 caracteres para validar o preview no modo grid. O conteúdo deve ser truncado e mostrar apenas os primeiros 200 caracteres com reticências no final.</p>",
        status: "rascunho",
        criadoEm: "2025-12-01T10:00:00Z",
        atualizadoEm: "2025-12-01T10:00:00Z",
        autor: "user@example.com",
        criadoPorAgente: true,
        agenteId: "redacao-peticoes",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        titulo: "Contestação - Processo 456",
        tipo: "peticao",
        conteudo: "<p>Conteúdo curto</p>",
        status: "em-revisao",
        criadoEm: "2025-12-02T10:00:00Z",
        atualizadoEm: "2025-12-02T10:00:00Z",
        autor: "user@example.com",
        criadoPorAgente: false,
      },
    ];

    const mockProcesses: Process[] = [
      {
        id: "1",
        numeroCNJ: "1234567-89.2024.5.02.0999",
        titulo: "Processo de Teste",
        autor: "João Silva",
        reu: "Empresa XYZ",
        comarca: "São Paulo",
        vara: "1ª Vara Cível",
        status: "ativo",
        fase: "conhecimento",
        dataDistribuicao: "2024-01-01",
        prazos: [],
        dataUltimaMovimentacao: "2024-01-10",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-10T00:00:00Z",
      },
    ];

    seedLocalStorage(mockMinutas, mockProcesses);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("deve renderizar no modo grid por padrão", () => {
    renderWithProviders(<MinutasManager />);

    const gridButton = screen.getByLabelText("Visualização em grade");
    expect(gridButton).toHaveClass("bg-secondary");
  });

  it("deve exibir preview de conteúdo no grid", () => {
    renderWithProviders(<MinutasManager />);

    const previewElement = screen.getByText(
      /Esta é uma petição inicial de teste/,
    );
    expect(previewElement).toBeInTheDocument();
  });

  it("deve exibir badge IA quando minuta foi criada por agente", () => {
    renderWithProviders(<MinutasManager />);

    const iaBadges = screen.queryAllByText(/IA/i);
    expect(iaBadges.length).toBeGreaterThan(0);
  });
});
