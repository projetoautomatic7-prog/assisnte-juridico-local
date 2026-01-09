# AGENTS.md (Codex / agentes)

> **Fonte de verdade do projeto:** `.github/copilot-instructions.md`.
>
> O Codex/Agentes devem sempre carregar e obedecer primeiro as regras globais do usuário (se existirem) e, neste repositório, estas regras.

## Contexto rápido do repositório

- Projeto: **Assistente Jurídico PJe** (gestão jurídica com IA)
- Status: **MODO MANUTENÇÃO** (prioridade: estabilidade, correção de bugs, hardening)
- Stack: React + TypeScript + Vite (frontend) | Node/Express + TypeScript (backend) | Vitest/Playwright (testes)
- **LGPD/PII:** nunca enfraquecer filtros/sanitização

## Regras inegociáveis (sem exceção)

- **Proibido simulação:** não usar *stub/mock/fake/dummy/synthetic data/test doubles* **em código de produção e em testes**.
- **Sem features novas:** só correções/ajustes de manutenção, a menos que o usuário peça explicitamente.
- **Sem segredos em commits:** nunca inserir chaves/tokens reais no repo.

## Variáveis de ambiente (Gemini)

Este repo já usa placeholders em `.env`.

- Backend: `GEMINI_API_KEY`
- Frontend (Vite): `VITE_GEMINI_API_KEY`
- Modelo (frontend): `VITE_GEMINI_MODEL` (padrão atual no repo: `gemini-2.5-pro`)

Se precisar testar um modelo novo (ex.: `gemini-3-flash-preview`), **faça apenas via env** (não hardcode), mantendo compatibilidade.

## Como trabalhar (checklist operacional)

Ao modificar código (principalmente TypeScript/React):

1. **Type-check:** `npx tsc --noEmit --skipLibCheck`
2. **Lint:** `npm run lint`
3. **Testes:** `npm run test:run` (e/ou os suites específicos afetados)

Se mexer em rotas/API do backend, rode também `npm run test:api`.

## Estilo e consistência

- Código (nomes de variáveis/funções): **Inglês**
- UI e comentários explicativos: **PT-BR**
- TypeScript strict: evitar `any`

## Escopo de mudanças

- Prefira mudanças pequenas, revisáveis e com impacto controlado.
- Não refatore grandes áreas sem necessidade (modo manutenção).
