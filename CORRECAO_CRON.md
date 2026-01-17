### Correção da Tarefa do Cloud Scheduler

Para resolver o erro '400 Bad Request', a tarefa no Google Cloud Scheduler que aciona o serviço 'agents' precisa ser atualizada.

**1. URL de Destino:**

   - A URL utilizada na tarefa do Cloud Scheduler deve ser alterada para apontar para o endpoint correto.

   - **URL Incorreta:** `https://[seu-servico].run.app/`
   - **URL Correta:** `https://[seu-servico].run.app/api/agents?action=process-queue`

**2. Cabeçalho de Autenticação:**

   - Um cabeçalho de autenticação é necessário para que a requisição seja autorizada.

   - Adicione o seguinte cabeçalho à sua tarefa no Cloud Scheduler:
     - **Chave:** `Authorization`
     - **Valor:** `Bearer [SEU_CRON_SECRET]`

Substitua `[SEU_CRON_SECRET]` pelo valor da sua variável de ambiente `CRON_SECRET`.
