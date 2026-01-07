# Instruções do projeto (Assistente Jurídico PJe)

## Objetivo
Este repositório está em **modo MANUTENÇÃO**: priorizar estabilidade, correção de bugs e segurança.

## Regras obrigatórias
- **Proibido** qualquer tipo de simulação: *stub*, *mock*, *fake*, *dummy*, *synthetic data*, *test doubles* (inclusive em testes). Use apenas dados e integrações reais.
- **LGPD / PII**: nunca expor, logar ou enviar dados sensíveis (CPF, e-mail, telefone, etc.) sem sanitização.
- Evitar mudanças grandes: aplicar correções pequenas, seguras e verificáveis.

## Padrões de código
- Código (nomes de variáveis/funções/classes) em **Inglês**.
- UI e textos para usuário em **Português (PT-BR)**.
- TypeScript em modo estrito (evitar `any`).

## O que entregar ao propor uma correção
- Explicar o bug e o risco.
- Alterar o mínimo necessário.
- Garantir que build/testes não quebrem.
