# 🔧 Correções Firebase Emulators

**Data**: 2026-01-15  
**Status**: ✅ Resolvido

---

## ⚠️ Problemas Identificados

### 1. IPv6 (::1) não disponível
**Erro**: `EADDRNOTAVAIL: address not available ::1:PORT`  
**Causa**: Sistema sem suporte IPv6 ativo

**Solução aplicada**:
```json
{
  "emulators": {
    "auth": {
      "host": "127.0.0.1",  // ← Explicitamente IPv4
      "port": 9099
    },
    // ... outros emuladores
  }
}
```

### 2. Backend Functions não encontrado
**Erro**: `backend/dist/server.js does not exist`  
**Causa**: Configuração apontava para `backend/` mas Firebase Functions usa `functions/`

**Solução aplicada**:
```json
{
  "functions": [
    {
      "source": "functions",  // ← Corrigido de "backend"
      "codebase": "default",
      "runtime": "nodejs20"
    }
  ]
}
```

---

## ✅ Configuração Final

### Arquivos Atualizados

**firebase.json**:
- ✅ Hosts explícitos IPv4 (127.0.0.1)
- ✅ Source functions corrigido
- ✅ Hub port configurado

### Estrutura Correta
```
project/
├── functions/          ← Cloud Functions (Firebase)
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── backend/           ← API Express (Backend próprio)
    ├── src/
    ├── dist/
    └── package.json
```

---

## 🚀 Comandos Atualizados

### Iniciar Emulators
```bash
# Inicia todos os emuladores
npm run firebase:emulators

# Acesse:
# UI: http://127.0.0.1:4000
# Hosting: http://127.0.0.1:5000
# Firestore: http://127.0.0.1:8080
```

### Build Functions
```bash
cd functions
npm install
npm run build
```

### Testar Functions Localmente
```bash
# Com emuladores rodando
curl http://127.0.0.1:5001/sonic-terminal-474321-s1/us-central1/helloWorld
```

---

## 📊 Status dos Emulators

| Emulator | Host | Port | Status |
|----------|------|------|--------|
| UI | 127.0.0.1 | 4000 | ✅ Rodando |
| Auth | 127.0.0.1 | 9099 | ✅ Rodando |
| Functions | 127.0.0.1 | 5001 | ✅ Rodando |
| Firestore | 127.0.0.1 | 8080 | ✅ Rodando |
| Hosting | 127.0.0.1 | 5000 | ✅ Rodando |
| Storage | 127.0.0.1 | 9199 | ✅ Rodando |

---

## 🔍 Troubleshooting

### Problema: "Port already in use"
```bash
# Matar processos em portas específicas
lsof -ti:5000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

### Problema: "Functions not loading"
```bash
# Reinstalar dependências
cd functions
rm -rf node_modules
npm install
npm run build
```

### Problema: "Firestore rules not applied"
```bash
# Recarregar regras
firebase deploy --only firestore:rules
```

---

## 📝 Notas Importantes

1. **IPv6 Desabilitado**: Todos os emuladores usam apenas IPv4 (127.0.0.1)
2. **Functions Separado**: Firebase Functions em `functions/`, backend Express em `backend/`
3. **Build Necessário**: Sempre rodar `npm run build` em `functions/` antes de deploy
4. **Credenciais**: ADC (Application Default Credentials) detectadas - cuidado com produção

---

## ✅ Checklist Pós-Correção

- [x] IPv4 configurado explicitamente
- [x] Source functions corrigido
- [x] Dependencies instaladas
- [x] Build functions executado
- [x] Emulators iniciando corretamente
- [x] UI acessível em http://127.0.0.1:4000
- [x] Hosting servindo arquivos do /dist

---

**Corrigido por**: GitHub Copilot CLI  
**Próxima revisão**: Após primeiro deploy em produção
