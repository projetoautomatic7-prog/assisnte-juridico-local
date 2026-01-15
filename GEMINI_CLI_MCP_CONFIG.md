# Configuração Gemini CLI + Genkit MCP

## ⚠️ Problema Identificado e Resolvido

**Erro:** `spawn genkit ENOENT` - A CLI do Genkit não estava instalada globalmente.

## ✅ Solução Aplicada (15/01/2026)

1. ✅ **Instalado CLI do Genkit globalmente:**
   ```bash
   npm install -g genkit-cli
   ```

2. ✅ **Verificado instalação:**
   ```bash
   genkit --version
   # Output: 1.27.0
   ```

3. ✅ **Configurado `mcp-config.json` corretamente:**
   - Comando: `npx genkit mcp`
   - Modelo: `gemini-2.5-pro`

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
        "GEMINI_MODEL": "gemini-2.5-pro"
      }
    }
  }
}
```

## 🎯 Modelos Gemini Disponíveis

Configure no `env.GEMINI_MODEL`:

- `gemini-2.0-flash-exp` - Rápido, experimental (default)
- `gemini-1.5-flash` - Rápido, estável
- `gemini-1.5-pro` - Mais inteligente, análises complexas
- `gemini-2.5-flash` - Mais novo (se disponível)
- `gemini-2.5-pro` - Premium (se disponível)

## 🔧 Testando a Configuração

```bash
# Verificar instalação da CLI
genkit --version
# Expected: 1.27.0 ou superior

# Testar comando MCP
genkit mcp --help
# Expected: Usage: genkit mcp [options]

# Testar via npx (como no mcp-config.json)
npx genkit mcp --help

# Testar SonarQube MCP (requer Docker)
docker run -i --rm mcp/sonarqube --help
```

### ✅ Testes Realizados (15/01/2026)
- [x] CLI instalada globalmente
- [x] Comando `genkit mcp` funciona
- [x] Configuração MCP atualizada
- [x] Documentação sincronizada

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
1. Verifique 