# Configuração Gemini CLI + Genkit MCP

## ⚠️ Problema Resolvido

Erro: `spawn genkit ENOENT` - Genkit não estava configurado corretamente no MCP.

## ✅ Solução Aplicada

Atualizado `mcp-config.json` para usar `npx genkit mcp`.

## 📝 Configuração MCP para VS Code

O arquivo `mcp-config.json` está configurado para **uso local no projeto**.

Para usar no **GitHub Copilot Chat**, você precisa configurar no VS Code:

### 1. Abra as configurações do VS Code
```
Ctrl+Shift+P (ou Cmd+Shift+P no Mac)
> Preferences: Open User Settings (JSON)
```

### 2. Adicione a configuração MCP
```json
{
  "github.copilot.chat.mcp.servers": {
    "sonarqube": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "SONARQUBE_TOKEN",
        "-e", "SONARQUBE_ORG",
        "-e", "TELEMETRY_DISABLED",
        "mcp/sonarqube"
      ],
      "env": {
        "SONARQUBE_TOKEN": "${env:SONARQUBE_TOKEN}",
        "SONARQUBE_ORG": "portprojetoautomacao-debug",
        "TELEMETRY_DISABLED": "true"
      }
    },
    "genkit": {
      "command": "npx",
      "args": ["-y", "genkit", "mcp"],
      "env": {
        "GENKIT_MODEL": "gemini-2.0-flash-exp"
      }
    }
  }
}
```

## 🎯 Modelos Gemini Disponíveis

Configure no `env.GENKIT_MODEL`:

- `gemini-2.0-flash-exp` - Rápido, experimental (default)
- `gemini-1.5-flash` - Rápido, estável
- `gemini-1.5-pro` - Mais inteligente, análises complexas
- `gemini-2.5-flash` - Mais novo (se disponível)
- `gemini-2.5-pro` - Premium (se disponível)

## 🔧 Testando a Configuração

```bash
# Testar Genkit MCP
npx genkit mcp --help

# Testar SonarQube MCP (requer Docker)
docker run -i --rm mcp/sonarqube --help
```

## 📚 Usar no Copilot Chat

Depois de configurar:

1. Recarregue o VS Code (`Ctrl+Shift+P` > `Developer: Reload Window`)
2. Abra o Copilot Chat (`Ctrl+Shift+I`)
3. Use `@workspace` para contexto do projeto
4. MCP servers são carregados automaticamente

## ⚡ Comandos Úteis

```bash
# Ver versão do Genkit
npx genkit --version

# Iniciar UI do Genkit
npm run genkit:ui

# Inicializar novo flow
npm run genkit:init
```

## 🐛 Troubleshooting

### Erro: "spawn genkit ENOENT"
✅ **Resolvido** - Usar `npx genkit mcp` ao invés de `genkit` diretamente.

### Erro: "high demand" no Gemini
- Aguarde alguns segundos
- Troque de modelo: `/model` no chat
- Use `gemini-1.5-flash` ao invés de `2.0-flash-exp`

### MCP não carrega
1. Verifique sintaxe JSON no settings
2. Recarregue VS Code
3. Veja logs: `Output` > `GitHub Copilot Chat`

## 📖 Documentação Oficial

- [Genkit MCP](https://firebase.google.com/docs/genkit/mcp)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Copilot Chat](https://docs.github.com/copilot/using-github-copilot/using-github-copilot-chat-in-your-ide)

## 🔐 Variáveis de Ambiente Necessárias

```bash
# Para SonarQube MCP
export SONARQUBE_TOKEN="seu-token-aqui"

# Para Genkit (se usar API keys)
export GOOGLE_API_KEY="sua-api-key"
export GEMINI_API_KEY="sua-api-key"
```

Adicione no `.env`:
```env
SONARQUBE_TOKEN=squ_***
GOOGLE_API_KEY=AI***
```
