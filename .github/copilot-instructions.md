# GitHub Copilot Instructions - Assistente Jurídico PJe + Genkit

## Project Context
Este é um sistema jurídico com IA que combina:
- **LangGraph** (agentes especializados)
- **Genkit** (flows e integração com LLMs)
- **MCP** (Model Context Protocol para assistentes IA)

## Genkit Integration Rules

### SEMPRE consulte:
1. `GENKIT.md` - API rules e best practices
2. `GUIA_MCP_GENKIT.md` - Guia de integração específico do projeto

### Modelo preferido:
- Use `gemini-2.5-flash` para chat rápido
- Use `gemini-2.5-pro` para análises complexas

### Estrutura de código:
- Flows Genkit: `lib/ai/*.ts`
- Agentes LangGraph: `src/agents/*/`
- **NÃO misture** arquitetura sem necessidade

### Comandos Genkit:
```bash
# ❌ NÃO execute diretamente (trava sessão):
genkit start

# ✅ INSTRUA o usuário a executar:
"Execute em terminal separado: genkit start -- npx tsx --watch lib/ai/genkit.ts"
```

## Compliance Rules (CRÍTICO)
- **SEM SIMULAÇÕES:** Proibido mock, stub, fake, dummy, synthetic data
- **LGPD:** Nunca remova filtros de PII
- **Tipagem estrita:** Evite `any` a todo custo

## Tech Stack
- TypeScript (strict mode)
- React 19 + Vite 7
- Genkit 1.20.0 + Google AI
- LangGraph + Anthropic Claude
- PostgreSQL (Neon) + Qdrant (vetorial)

Consulte `GUIA_MCP_GENKIT.md` para exemplos práticos.
