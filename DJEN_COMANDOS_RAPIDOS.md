# 🔥 DJEN Firebase - Comandos Rápidos

## 🚀 Deploy

```bash
# Deploy automático (recomendado)
bash deploy-djen-firebase.sh

# Deploy manual completo
firebase deploy

# Deploy apenas DJEN functions
firebase deploy --only functions:djenScheduler01h,functions:djenScheduler09h,functions:djenTriggerManual

# Deploy apenas hosting
firebase deploy --only hosting
```

## 🔑 Configurar Secrets

```bash
# OAB do advogado
firebase functions:secrets:set DJEN_OAB_NUMERO
# Digite: 184404

firebase functions:secrets:set DJEN_OAB_UF
# Digite: MG

firebase functions:secrets:set DJEN_ADVOGADO_NOME
# Digite: Thiago Bodevan Veiga

# Redis (opcional, mas recomendado)
firebase functions:secrets:set UPSTASH_REDIS_REST_URL
firebase functions:secrets:set UPSTASH_REDIS_REST_TOKEN

# Listar secrets configurados
firebase functions:secrets:list
```

## 🧪 Testar em Produção

```bash
# Status do sistema
curl https://sonic-terminal-474321-s1.web.app/api/djen/status

# Executar sincronização manual
curl -X POST https://sonic-terminal-474321-s1.web.app/api/djen/trigger-manual

# Buscar publicações
curl "https://sonic-terminal-474321-s1.web.app/api/djen/publicacoes?numeroOab=184404&ufOab=MG"
```

## 📊 Monitoramento

```bash
# Ver logs ao vivo
firebase functions:log --follow

# Logs de função específica
firebase functions:log --only djenScheduler09h

# Últimas 100 linhas
firebase functions:log -n 100

# Filtrar por erro
firebase functions:log | grep "ERROR"
```

## 🕐 Gerenciar Schedulers

```bash
# Listar jobs agendados
gcloud scheduler jobs list --project=sonic-terminal-474321-s1

# Executar manualmente um job
gcloud scheduler jobs run djenScheduler09h --project=sonic-terminal-474321-s1

# Ver detalhes de um job
gcloud scheduler jobs describe djenScheduler09h --project=sonic-terminal-474321-s1
```

## 🔍 Debug Local

```bash
# Iniciar emuladores
firebase emulators:start

# Testar functions localmente
firebase functions:shell

# No shell:
> djenScheduler09h()
> djenTriggerManual({data: {}})
```

## 📦 Gestão de Functions

```bash
# Listar functions ativas
firebase functions:list

# Deletar function específica
firebase functions:delete djenScheduler01h

# Verificar uso/custos
gcloud billing accounts list
```

## 🔧 Troubleshooting

```bash
# Limpar cache de build
cd functions && npm run build && cd ..

# Reinstalar dependências
cd functions && rm -rf node_modules package-lock.json && npm install && cd ..

# Forçar redeploy
firebase deploy --force

# Ver configuração atual
firebase functions:config:get

# Ver projeto ativo
firebase use
```

## 📝 Variáveis de Ambiente (Alternativa a Secrets)

```bash
# Definir variável
firebase functions:config:set djen.enabled=true

# Ver todas as variáveis
firebase functions:config:get

# Deletar variável
firebase functions:config:unset djen.enabled
```

## 🌍 URLs Produção

| Endpoint | URL |
|----------|-----|
| Status | https://sonic-terminal-474321-s1.web.app/api/djen/status |
| Sync Manual | https://sonic-terminal-474321-s1.web.app/api/djen-sync |
| Publicações | https://sonic-terminal-474321-s1.web.app/api/djen/publicacoes |
| Trigger | https://sonic-terminal-474321-s1.web.app/api/djen/trigger-manual |

## ⏰ Horários dos Schedulers

| Função | Horário BRT | Horário UTC | Cron |
|--------|-------------|-------------|------|
| djenScheduler01h | 01:00 | 04:00 | `0 4 * * *` |
| djenScheduler09h | 09:00 | 12:00 | `0 12 * * *` |

## 📞 Links Úteis

- **Console:** https://console.firebase.google.com/project/sonic-terminal-474321-s1
- **Hosting:** https://sonic-terminal-474321-s1.web.app
- **Docs DJEN:** https://comunicaapi.pje.jus.br/swagger/index.html
- **Firebase CLI:** https://firebase.google.com/docs/cli

## 🎯 Checklist Rápido

**Antes do deploy:**
- [ ] Secrets configurados
- [ ] Build local OK: `npm run build`
- [ ] Functions compilam: `cd functions && npm run build`

**Após deploy:**
- [ ] Teste status: `curl .../api/djen/status`
- [ ] Teste manual: `curl -X POST .../api/djen-sync`
- [ ] Ver logs: `firebase functions:log`
- [ ] Confirmar scheduler: `gcloud scheduler jobs list`
