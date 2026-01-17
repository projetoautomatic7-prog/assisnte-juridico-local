# 🚀 Ambiente Local - Modo Produção

Este documento explica como rodar o ambiente local simulando produção.

## ✅ Ambiente Iniciado com Sucesso!

### 🌐 URLs Disponíveis

- **Frontend (Vite Dev):** http://localhost:5000
- **Backend (API Local):** http://127.0.0.1:3001

### 📦 Componentes Ativos

#### Frontend (Porta 5000)
- Servidor Vite em modo desenvolvimento
- Hot reload ativado
- Todas as funcionalidades frontend disponíveis

#### Backend (Porta 3001)
- API local simplificada
- Endpoints:
  - `/api/kv` - Key-Value store (in-memory)
  - `/api/expedientes` - Gestão de expedientes
  - `/api/pje-sync` - Sincronização PJe
  - `/api/observability` - Health checks

### 🔧 Como Iniciar

```bash
# Opção 1: Script npm (RECOMENDADO)
npm run dev:with-api

# Opção 2: Script bash completo com build
./start-local-production.sh
```

### 🛑 Como Parar

Pressione `Ctrl+C` no terminal onde o servidor está rodando.

### 📝 Notas Importantes

1. **Node.js:** Aviso sobre versão 20.18.1 é normal (funciona)
2. **Redis:** API local usa armazenamento em memória
3. **PostgreSQL:** Não necessário para desenvolvimento básico
4. **Hot Reload:** Mudanças no código recarregam automaticamente

### 🔄 Diferenças da Produção

| Aspecto | Local | Produção |
|---------|-------|----------|
| Frontend | Vite Dev (porta 5000) | Firebase Hosting |
| Backend | API local (porta 3001) | Cloud Run |
| Redis | In-memory | Upstash Redis |
| PostgreSQL | Opcional | Neon PostgreSQL |
| SSL | HTTP | HTTPS |

### 🎯 Quando Usar Cada Modo

- **`npm run dev:with-api`** → Desenvolvimento diário com hot reload
- **`./start-local-production.sh`** → Teste de build de produção local
- **Deploy real** → Cloud Run + Firebase para staging/produção

### 🐛 Troubleshooting

**Porta 5000 já em uso:**
```bash
# Matar processo na porta
kill $(lsof -t -i:5000)
npm run dev:with-api
```

**Porta 3001 já em uso:**
```bash
# Matar processo na porta
kill $(lsof -t -i:3001)
npm run dev:with-api
```

### ✅ Status Atual

```
✅ Frontend: http://localhost:5000 (ATIVO)
✅ Backend: http://127.0.0.1:3001 (ATIVO)
✅ Hot Reload: Habilitado
✅ API Local: Funcionando
```

Bom desenvolvimento! 🚀
