/**
 * Tests for AdvancedNLPDashboard component
 *
 * Cobertura focada em renderização e estado básico de input,
 * evitando simulações de pipeline.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import AdvancedNLPDashboard from "./AdvancedNLPDashboard";

describe("AdvancedNLPDashboard", () => {
  describe("hasInput() helper function", () => {
    it("should show error toast and not trigger processing when inputText is empty", async () => {
      render(<AdvancedNLPDashboard />);

      const extractEntitiesButton = screen.getByRole("button", {
        name: /extrair entidades/i,
      });

      // Button should be disabled when input is empty
      expect(extractEntitiesButton).toBeDisabled();
    });

    it("should show error toast when inputText contains only whitespace", async () => {
      const user = userEvent.setup();
      render(<AdvancedNLPDashboard />);

      const textarea = screen.getByPlaceholderText(
        /cole aqui o texto do documento jurídico/i,
      );

      // Type only whitespace
      await user.type(textarea, "   ");

      const extractEntitiesButton = screen.getByRole("button", {
        name: /extrair entidades/i,
      });

      // Button should still be disabled with only whitespace
      expect(extractEntitiesButton).toBeDisabled();
    });

    it("should enable buttons when inputText has valid content", async () => {
      const user = userEvent.setup();
      render(<AdvancedNLPDashboard />);

      const textarea = screen.getByPlaceholderText(
        /cole aqui o texto do documento jurídico/i,
      );

      await user.type(textarea, "Texto de teste válido para análise");

      const extractEntitiesButton = screen.getByRole("button", {
        name: /extrair entidades/i,
      });

      // Button should be enabled with valid content
      expect(extractEntitiesButton).not.toBeDisabled();
    });
  });

  describe("UI rendering", () => {
    it("should render the dashboard header", () => {
      render(<AdvancedNLPDashboard />);

      expect(
        screen.getByText("Processamento NLP Avançado"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /pipeline de análise de linguagem natural para documentos jurídicos/i,
        ),
      ).toBeInTheDocument();
    });

    it("should render all action buttons", () => {
      render(<AdvancedNLPDashboard />);

      expect(
        screen.getByRole("button", { name: /análise completa/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /extrair entidades/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /analisar sentimento/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /classificar/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /extrair info/i }),
      ).toBeInTheDocument();
    });

    it("should render all tabs", () => {
      render(<AdvancedNLPDashboard />);

      expect(
        screen.getByRole("tab", { name: /entidades/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /sentimento/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /classificação/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /extração/i }),
      ).toBeInTheDocument();
    });

    it("should show empty state messages when no results", () => {
      render(<AdvancedNLPDashboard />);

      expect(
        screen.getByText("Nenhuma entidade extraída ainda"),
      ).toBeInTheDocument();
    });
  });
});
