import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { Process } from "../../types";
import ProcessosView from "../ProcessosView";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ProcessosView - renderização básica", () => {
  beforeEach(() => {
    const mockProcesses: Process[] = [
      {
        id: "1",
        numeroCNJ: "1234567-89.2024.5.02.0999",
        titulo: "Ação Trabalhista - João Silva",
        autor: "João Silva",
        reu: "Empresa ABC Ltda",
        comarca: "São Paulo",
        vara: "1ª Vara do Trabalho",
        status: "ativo",
        fase: "conhecimento",
        dataDistribuicao: "2024-01-15",
        dataUltimaMovimentacao: "2024-12-01",
        valor: 50000,
        prazos: [],
        createdAt: "2024-01-15T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
      },
      {
        id: "2",
        numeroCNJ: "9876543-21.2024.5.02.0888",
        titulo: "Ação de Cobrança - Maria Santos",
        autor: "Maria Santos",
        reu: "Banco XYZ S/A",
        comarca: "Rio de Janeiro",
        vara: "2ª Vara Cível",
        status: "arquivado",
        fase: "execucao",
        dataDistribuicao: "2023-06-10",
        valor: 15000,
        prazos: [],
        dataUltimaMovimentacao: "2023-07-01",
        createdAt: "2023-06-10T00:00:00Z",
        updatedAt: "2023-07-01T00:00:00Z",
      },
    ];

    localStorage.setItem("processes", JSON.stringify(mockProcesses));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("deve exibir cards de estatísticas principais", () => {
    renderWithProviders(<ProcessosView />);

    expect(screen.getAllByText(/Total/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ativos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Arquivados/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Valor Total/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prazos/i).length).toBeGreaterThan(0);
  });

  it("deve renderizar processos na lista", () => {
    renderWithProviders(<ProcessosView />);

    expect(screen.getByText(/João Silva/i)).toBeInTheDocument();
    expect(screen.getByText(/Maria Santos/i)).toBeInTheDocument();
  });
});
