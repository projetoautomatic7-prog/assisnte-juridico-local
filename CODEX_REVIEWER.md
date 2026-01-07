# Revisor do Codex (PR Review com IA)

Este repositório possui um workflow do GitHub Actions que executa o **Codex Reviewer** e publica um comentário automático no Pull Request com:
- resumo do PR
- sugestões de melhoria
- potenciais bugs/riscos

## Como acionar

O workflow roda **somente** quando um PR recebe o label:
- `codex-review`

Passo a passo:
1. Abra um Pull Request
2. Adicione o label `codex-review`
3. Aguarde a execução do workflow **Codex PR Review** em *Actions*

## Secrets necessários (obrigatório)

Configure no GitHub:
- Settings → Secrets and variables → Actions → New repository secret

Secrets:
- `OPENAI_API_KEY` (obrigatório)
- `BOT_GH_TOKEN` (opcional) — se existir, será usado para comentar no PR; caso contrário usa `GITHUB_TOKEN`

## Observações

- O workflow foi criado em modo **MANUTENÇÃO** (foco em correções pequenas e seguras).
- Não commit de chaves: nenhuma chave deve existir no repositório.

## Arquivo do workflow

- `.github/workflows/codex-reviewer.yml`
