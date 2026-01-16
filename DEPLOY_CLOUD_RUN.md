# Deploy do backend 24h (Cloud Run) + Firebase Hosting

Este projeto tem um backend Node/Express (`backend/`) que roda como servidor. Para manter o servidor “sempre ligado” (min. 1 instância), use **Google Cloud Run** e faça o Firebase Hosting encaminhar `/api/**` para o serviço.

## Pré-requisitos

- Projeto GCP/Firebase: `sonic-terminal-474321-s1`
- `gcloud` instalado e autenticado
- O backend deve escutar `process.env.PORT` (já está em `backend/src/server.ts`)

## 1) Deploy no Cloud Run (1 instância mínima)

Execute na raiz do repo (usa o `Dockerfile` da raiz):

```bash
gcloud config set project sonic-terminal-474321-s1

gcloud run deploy assistente-juridico-backend \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --min-instances 1
```

## 2) Variáveis de ambiente (Cloud Run)

Configure as variáveis no serviço do Cloud Run (não use `VITE_` aqui — elas são do build do frontend):

```bash
gcloud run services update assistente-juridico-backend \
  --region southamerica-east1 \
  --set-env-vars NODE_ENV=production,GEMINI_API_KEY=COLOQUE_SUA_CHAVE_AQUI
```

Variáveis comuns (exemplos, não use valores reais no repo):

- `GEMINI_API_KEY` (obrigatória para endpoints de IA)
- `DJEN_OAB_NUMERO`, `DJEN_OAB_UF`, `DJEN_ADVOGADO_NOME` (se usar DJEN via backend)
- `RATE_LIMIT_ENABLED` / `AI_RATE_LIMIT_MAX_REQUESTS` (opcionais)

## 3) Encaminhar `/api/**` do Firebase Hosting para o Cloud Run

No `firebase.json`, use:

```json
{
  "source": "/api/**",
  "run": {
    "serviceId": "assistente-juridico-backend",
    "region": "southamerica-east1"
  }
}
```

Depois:

```bash
firebase deploy --only hosting
```

## 4) Observação (CORS)

Se o frontend chamar o backend via domínio do Firebase (`*.web.app`/`*.firebaseapp.com`), o backend precisa permitir essas origens.
O `backend/src/server.ts` já está ajustado para permitir:
- `sonic-terminal-474321-s1.web.app`
- `sonic-terminal-474321-s1.firebaseapp.com`
- canais preview `sonic-terminal-474321-s1--*.web.app`
