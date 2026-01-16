# Guia de Configuração Vercel - DJEN API Integration

## ✅ Status da Implementação

Todos os arquivos necessários estão implementados e funcionais:

### 📂 Arquivos da API
- ✅ `api/djen-sync.ts` - Sincronização manual e automática com DJEN
- ✅ `api/cron.ts` - Job agendado para verificação automática
- ✅ `api/expedientes.ts` - Listagem de publicações armazenadas
- ✅ `api/lawyers.ts` - Gerenciamento de advogados monitorados

### 🎨 Componentes Frontend
- ✅ `src/components/DJENPublicationsWidget.tsx` - Widget de publicações
- ✅ `src/components/ExpedientePanel.tsx` - Painel completo de expedientes

### ⚙️ Configuração
- ✅ `vercel.json` - Configuração Vercel (CRIADO AGORA)

---

## 🔑 Variáveis de Ambiente Obrigatórias

Configure estas variáveis no painel da Vercel:

### Essenciais (Obrigatórias)
```bash
# Upstash Redis - Armazenamento de publicações
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Região e timezone
TZ=America/Sao_Paulo
```

### Opcionais (Recomendadas)
```bash
# Google Gemini - Análise de intimações com IA
VITE_GOOGLE_API_KEY=xxx
# ou
GEMINI_API_KEY=xxx

# Resend - Notificações por email
RESEND_API_KEY=re_xxx
NOTIFICATION_EMAIL=seu@email.com

# Segurança (recomendado para produção)
CRON_SECRET=seu-token-secreto-aqui
DJEN_SYNC_API_KEY=outro-token-para-api

# Base URL da aplicação
APP_BASE_URL=https://seu-app.vercel.app
```

---

## 🕐 Cron Jobs Configurados

O arquivo `vercel.json` está configurado com 2 verificações diárias:

### Horários (UTC → BRT)
- **12:00 UTC** = **09:00 BRT** (Manhã - após publicação dos diários)
- **20:00 UTC** = **17:00 BRT** (Tarde - verificação adicional)

### Como Funciona
```javascript
// O Vercel chama automaticamente:
POST /api/cron?action=djen-monitor

// Que internamente executa:
POST /api/djen-sync
```

---

## 🌍 Configuração de Região

**IMPORTANTE:** A API DJEN do CNJ bloqueia requisições de fora do Brasil.

O `vercel.json` está configurado com:
```json
{
  "regions": ["gru1"]  // São Paulo, Brasil
}
```

### Regiões Válidas no Brasil
- `gru1` - São Paulo (Recomendado)
- `gru` - São Paulo (Legacy)

---

## 🧪 Testando a Integração

### 1. Verificar Status do Sistema
```bash
curl https://seu-app.vercel.app/api/status
```

**Resposta esperada:**
```json
{
  "status": "ativo",
  "timezone": "America/Sao_Paulo",
  "horarios": ["01:00", "09:00"],
  "advogadoPadrao": {
    "nome": "Thiago Bodevan Veiga",
    "oab": "184404/MG"
  }
}
```

### 2. Sincronizar Manualmente (Force)
```bash
curl -X POST https://seu-app.vercel.app/api/djen-sync
```

**Resposta esperada:**
```json
{
  "ok": true,
  "message": "Encontradas X novas publicações",
  "result": {
    "lawyersChecked": 1,
    "publicationsFound": 3,
    "newPublications": 3,
    "duration": "1234ms"
  }
}
```

### 3. Listar Publicações
```bash
curl https://seu-app.vercel.app/api/expedientes
```

**Resposta esperada:**
```json
{
  "success": true,
  "expedientes": [...],
  "count": 3,
  "lastCheck": "2026-01-16T01:00:00.000Z",
  "lawyersConfigured": 1
}
```

### 4. Gerenciar Advogados
```bash
# Listar advogados monitorados
curl https://seu-app.vercel.app/api/lawyers

# Adicionar novo advogado
curl -X POST https://seu-app.vercel.app/api/lawyers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nome do Advogado",
    "oab": "184404/MG",
    "email": "email@exemplo.com",
    "tribunals": ["TJMG", "TRT3", "STJ"]
  }'
```

---

## 🏗️ Deploy na Vercel

### Passo 1: Instalar Vercel CLI
```bash
npm i -g vercel
```

### Passo 2: Login
```bash
vercel login
```

### Passo 3: Deploy
```bash
vercel --prod
```

### Passo 4: Configurar Variáveis
No dashboard da Vercel:
1. Acesse seu projeto
2. Settings → Environment Variables
3. Adicione as variáveis listadas acima
4. Redeploy: `vercel --prod`

---

## 📊 Monitoramento

### Logs no Vercel
```bash
# Via CLI
vercel logs

# Via Dashboard
https://vercel.com/seu-projeto/logs
```

### Sentry (Se configurado)
O endpoint `api/djen-sync.ts` está instrumentado com Sentry AI Monitoring V2.

---

## ⚠️ Troubleshooting

### Erro 403 - Geobloqueio
**Problema:** API DJEN retorna 403 Forbidden
**Solução:** Verificar se a função está na região `gru1`

```bash
# Verificar região atual
vercel inspect seu-app.vercel.app

# Redeployar forçando região
vercel --prod --force
```

### Erro 429 - Rate Limit
**Problema:** Muitas requisições em curto período
**Solução:** O sistema já implementa cooldown de 60 segundos

### Redis não conecta
**Problema:** Variáveis UPSTASH não configuradas
**Solução:** 
1. Criar conta em https://upstash.com
2. Criar novo Redis database
3. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
4. Adicionar na Vercel

---

## 🎯 Caso de Sucesso Comprovado

**Data:** 27/11/2025
**Advogado:** Thiago Bodevan Veiga - OAB/MG 184.404
**Tribunais:** TJMG, TRT3, TST, STJ, TRF1, TRF6

### Resultados
- ✅ 3 intimações capturadas automaticamente
- ✅ Widget funcionando no dashboard
- ✅ Processos identificados corretamente:
  - `5005240-57.2020.8.13.0223` - Execução de Título Extrajudicial
  - `5005573-67.2024.8.13.0223` - Intimação
  - `0012850-68.2024.8.13.0338` - Intimação

---

## 📞 Suporte

- **Documentação DJEN:** https://comunicaapi.pje.jus.br/swagger/index.html
- **Documentação Vercel Crons:** https://vercel.com/docs/cron-jobs
- **Upstash Redis:** https://docs.upstash.com/redis

---

## ✅ Checklist Pré-Deploy

- [ ] `vercel.json` criado com região `gru1`
- [ ] Variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` configuradas
- [ ] Timezone `TZ=America/Sao_Paulo` configurada
- [ ] Testar sincronização manual: `POST /api/djen-sync`
- [ ] Verificar logs no Vercel após primeiro cron job
- [ ] Adicionar advogados para monitoramento via `POST /api/lawyers`
- [ ] Testar componentes frontend no dashboard

---

**🚀 Sua integração DJEN está pronta para produção!**
