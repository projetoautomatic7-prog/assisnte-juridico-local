# Instruções de Configuração do Genkit

Estas instruções são para uso local no projeto Assistente Juridico PJe. Siga as regras do repo (modo manutencao, sem simulacao e LGPD/PII).

## 1) Dependencias (se necessario)

Se o projeto ainda nao tiver as dependencias instaladas:

```bash
npm install genkit @genkit-ai/google-genai
npm install -g genkit-cli
```

## 2) Variaveis de ambiente

Configure as chaves via env (nao hardcode). Exemplo no terminal:

```bash
export GEMINI_API_KEY="SUA_CHAVE_API_AQUI"
export VITE_GEMINI_API_KEY="SUA_CHAVE_API_AQUI"
export VITE_GEMINI_MODEL="gemini-2.5-pro"
```

## 3) Iniciar o Genkit UI

Use o comando adequado ao runtime do projeto. Exemplos:

```bash
genkit start -- npm run dev
```

Se preferir executar diretamente o arquivo TypeScript:

```bash
genkit start -- npx tsx --watch src/index.ts
```

Ao iniciar, o terminal exibira a URL do Genkit Dev UI. Acesse essa URL para inspecionar os flows.
