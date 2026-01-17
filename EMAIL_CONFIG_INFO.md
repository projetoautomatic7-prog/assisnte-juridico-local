# Configuração de Emails (Resend)

**Serviço:** Resend (https://resend.com)
**API Key:** Configurada em `.env.local`
**Remetente:** `onboarding@resend.dev` (Modo de teste)
**Email Verificado:** `thiagobodevanadvocacia@gmail.com`

## Templates Disponíveis

O sistema já possui templates HTML embutidos em `api/lib/email-service.ts` para:

1.  **Notificações Gerais** (`sendNotificationEmail`)
2.  **Alertas Urgentes** (`sendUrgentDeadlineAlert`)
    *   Assunto: 🚨 URGENTE: Prazo crítico...
    *   Cor: Vermelho/Alerta
3.  **Resumo Diário** (`sendDailySummaryEmail`)
    *   Assunto: 📊 Resumo Diário...
    *   Dados: Processos monitorados, prazos, documentos gerados.

## Notas Importantes

*   Em modo de teste ("onboarding"), emails só podem ser enviados para `thiagobodevanadvocacia@gmail.com`.
*   Para enviar para outros emails ou usar um remetente personalizado (ex: `contato@seu-dominio.com`), é necessário verificar o domínio no painel do Resend.
