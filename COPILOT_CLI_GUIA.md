# 🤖 GitHub Copilot CLI - Guia Completo
## Assistente Jurídico PJe

---

## 🚀 Início Rápido

### Executar no Dev Container (Linux)
```bash
./start-copilot.sh
```

### Executar Manualmente
```bash
export GH_TOKEN="<SEU_TOKEN_AQUI>"
copilot
```

### Windows (PowerShell)
```powershell
$env:GH_TOKEN="<SEU_TOKEN_AQUI>"
copilot
```

---

## 📋 Comandos de Barra (Slash Commands)

### Configuração e Sistema
- `/model` - Escolher modelo de IA (Claude Sonnet 4.5, Claude Sonnet 4, GPT-5)
- `/help` - Mostrar ajuda completa
- `/login` - Fazer login interativo (não necessário com token configurado)
- `/feedback` - Enviar feedback confidencial para o GitHub
- `/clear` - Limpar histórico da conversa
- `/exit` ou `/quit` - Sair do Copilot CLI

### Trabalhando com Código
- `/explain` - Explicar código selecionado
- `/fix` - Corrigir bugs no código
- `/optimize` - Otimizar código
- `/refactor` - Refatorar código
- `/test` - Gerar testes unitários
- `/doc` - Gerar documentação

### Integração GitHub
- `/issue` - Criar ou buscar issues
- `/pr` - Criar ou gerenciar pull requests
- `/repo` - Informações do repositório
- `/commit` - Sugerir mensagens de commit

---

## 🎯 Casos de Uso - Assistente Jurídico PJe

### 1. Correção de Bugs (Modo Manutenção - Prioridade)
```
Você: Encontrei um erro no arquivo src/components/MinutasEditor.tsx
      na linha 234. O estado não está atualizando corretamente.

Copilot: [Analisa o código e sugere correção]

Você: /fix
```

### 2. Análise de Código TypeScript
```
Você: Analise o arquivo src/lib/gemini-service.ts e sugira melhorias
      de tipagem e tratamento de erros.

Copilot: [Fornece análise detalhada com sugestões]
```

### 3. Testes Automatizados
```
Você: Preciso de testes unitários para src/hooks/use-djen-publications.ts
      usando Vitest.

Copilot: /test
```

---

## 🔧 Versão Instalada

- **Copilot CLI:** v0.0.375
- **Data Instalação:** 07/01/2026
- **Status:** ✅ Configurado e Autenticado

---

## ⚙️ Recursos Disponíveis

✅ Claude Sonnet 4.5 (modelo padrão)
✅ Claude Sonnet 4
✅ GPT-5
✅ Integração GitHub (issues, PRs, repos)
✅ Análise de código TypeScript/React
✅ Geração de testes Vitest/Playwright
✅ Context awareness do workspace

---

## 📚 Documentação

- Guia oficial: https://docs.github.com/copilot/using-github-copilot/using-github-copilot-in-the-command-line
- Repositório: https://github.com/github/copilot-cli
- Changelog: https://github.com/github/copilot-cli/blob/main/changelog.md

---

**Modo MANUTENÇÃO Ativo** - Foco em correção de bugs e estabilidade
