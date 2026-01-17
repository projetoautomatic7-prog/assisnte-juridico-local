# Correção do Erro 400 no Cloud Scheduler (Agentes)

Você está usando **Firebase Hosting (Frontend)** e **Cloud Run (Backend)**.

O erro `400 Bad Request` identificado nos logs vem do serviço chamado `agents`. Este serviço é uma **Cloud Function (Gen 2)** gerenciada pelo Firebase, que executa o código da pasta `functions/`.

O Cloud Scheduler está configurado para chamar esta função com a ação `process-queue`, mas o código da função não tinha implementação para essa ação.

## Correções Realizadas

1.  **Atualização da Cloud Function (`functions/src/agents.ts`):**
    - Adicionei a lógica para tratar a ação `process-queue`.
    - Agora a função sabe desenfileirar tarefas, instanciar o agente correto e salvar o resultado.
    - Isso resolve o erro 400 que aparece nos logs.

2.  **Atualização do Backend Principal (`backend/src/routes/agents.ts`):**
    - Por garantia, também adicionei a mesma lógica no seu backend Express principal (que roda no Cloud Run como `assistente-juridico-backend`).
    - Isso permite que você mude a arquitetura no futuro para centralizar tudo no backend, se desejar.

## Como Aplicar a Correção (Deploy)

Para corrigir o erro atual nos logs, você precisa atualizar a função `agents` no Firebase.

Execute no terminal:

```bash
firebase deploy --only functions:agents
```

Isso fará o upload do código corrigido da pasta `functions/` e atualizará o serviço `agents` no Google Cloud. A partir desse momento, o Cloud Scheduler receberá `200 OK`.

### Opcional: Atualizar o Backend Principal

Se você quiser atualizar também o seu backend principal (Node.js) com as melhorias de robustez:

```bash
cd backend
./deploy-cloud-run.sh
```
