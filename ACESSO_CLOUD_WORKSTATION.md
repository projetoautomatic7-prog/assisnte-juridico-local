# ☁️ Acesso ao Assistente Jurídico - Cloud Workstation

## ✅ Servidor Rodando com Sucesso!

### 🌐 URLs de Acesso

**URL Principal (HTTPS via Cloud Workstation):**
```
https://5000-firebase-assisnte-juridico-1768313371073.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev/
```

**URLs Locais (dentro do Workstation):**
- Frontend: http://localhost:5000
- Backend API: http://127.0.0.1:3001
- Network: http://10.88.0.3:5000

### 📊 Status dos Serviços

```
✅ Vite Dev Server: ATIVO (porta 5000)
✅ Backend API: ATIVO (porta 3001)
✅ Host: 0.0.0.0 (aceita conexões externas)
✅ Protocolo: HTTP local / HTTPS externo
```

### 🔧 Servidor Configurado

O servidor está rodando com:
- **Host:** 0.0.0.0 (permite acesso externo)
- **Porta:** 5000 (exposta no Cloud Workstation)
- **HMR:** WebSocket configurado
- **API Local:** Porta 3001 (in-memory storage)

### 🚀 Como Foi Iniciado

```bash
npm run dev:with-api -- --host 0.0.0.0 --port 5000
```

### 🔄 Se Precisar Reiniciar

**Método Rápido (RECOMENDADO):**
```bash
./start-dev.sh
```

**Método Manual:**
```bash
# 1. Parar o servidor atual
# Ctrl+C no terminal

# 2. Reiniciar
npm run dev:with-api -- --host 0.0.0.0 --port 5000
```

### ⚠️ Importante: Erro 503

Se você ver o erro "503 Service Unavailable", significa que o servidor parou. Isso pode acontecer se:
- O terminal foi fechado
- Ocorreu um erro no servidor
- O processo foi interrompido

**Solução:** Execute `./start-dev.sh` para reiniciar tudo automaticamente.

### 📝 Notas Importantes

1. **Cloud Workstation:** Acesse via URL HTTPS fornecida pelo Google
2. **Hot Reload:** Funciona normalmente com HMR via WebSocket
3. **API Backend:** Endpoints disponíveis em `/api/*`
4. **Persistência:** Dados em memória (reinicia ao parar o servidor)

### 🔌 Endpoints da API Disponíveis

- `GET /api/observability?action=health` - Health check
- `POST /api/kv` - Key-value storage
- `GET /api/expedientes` - Lista expedientes
- `POST /api/pje-sync` - Sincronização PJe

### 🐛 Troubleshooting

**"Unable to forward your request":**
- ✅ **Resolvido!** Servidor configurado com `host: 0.0.0.0`

**Porta não acessível:**
```bash
# Verificar se porta 5000 está ativa
netstat -tulpn | grep 5000

# Deve mostrar: 0.0.0.0:5000 LISTEN
```

**Reiniciar do zero:**
```bash
# Matar processos
kill $(lsof -t -i:5000)
kill $(lsof -t -i:3001)

# Iniciar novamente
npm run dev:with-api -- --host 0.0.0.0 --port 5000
```

### ✅ Teste de Conectividade

```bash
# Dentro do Workstation
curl http://localhost:5000

# Deve retornar HTML do app
```

---

**Status:** 🟢 **ONLINE e ACESSÍVEL**

Acesse a URL do Cloud Workstation para usar o aplicativo! 🚀
