# 🎉 Deploy Firebase - Configuração Completa

## ✅ Status: DEPLOY CONCLUÍDO

**URL Live:** https://sonic-terminal-474321-s1.web.app

---

## 🔐 Credenciais Configuradas

### Google OAuth Client ID
```
572929400457-lufh2hv2dt7129mikbr1e9k5h1copv4s.apps.googleusercontent.com
```

### Gemini API Key (IDX)
```
AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
```

### Firebase Secrets
- ✅ GEMINI_API_KEY (version 2)
- ✅ GOOGLE_API_KEY (version 2)
- ✅ GOOGLE_CLIENT_ID (version 1)

---

## ⚠️ AÇÃO NECESSÁRIA: Configure URIs Autorizadas

Para o Google Docs e Calendar funcionarem, você PRECISA configurar as URIs autorizadas:

### 1. Acesse o Google Cloud Console:
https://console.cloud.google.com/apis/credentials/oauthclient/572929400457-lufh2hv2dt7129mikbr1e9k5h1copv4s.apps.googleusercontent.com

### 2. Adicione em "Authorized JavaScript origins":
```
https://sonic-terminal-474321-s1.web.app
https://sonic-terminal-474321-s1.firebaseapp.com
http://localhost:3000
http://localhost:5173
```

### 3. Adicione em "Authorized redirect URIs":
```
https://sonic-terminal-474321-s1.web.app/oauth2callback
https://sonic-terminal-474321-s1.firebaseapp.com/oauth2callback
http://localhost:3000/oauth2callback
http://localhost:5173/oauth2callback
```

### 4. Clique em **"SAVE"** (no final da página)

### 5. Habilite as APIs necessárias:
Acesse: https://console.cloud.google.com/apis/library

Habilite:
- ✅ Google Docs API
- ✅ Google Drive API
- ✅ Google Calendar API

---

## 📝 Erros Resolvidos

### ✅ Corrigidos neste deploy:
- `[GoogleDocs] ERROR: Credenciais do Google Docs não configuradas` → **RESOLVIDO**
- `VITE_GOOGLE_CLIENT_ID faltando` → **RESOLVIDO**
- `VITE_GEMINI_API_KEY faltando` → **RESOLVIDO**

### ⚠️ Ainda precisa resolver:
- `[AI Commands] Falha de conexão com http://localhost:3001` → Precisa backend API

---

## 🚀 Próximos Passos (Opcional)

### Para resolver o erro do backend (localhost:3001):

#### Opção A: Firebase Functions (Recomendado)
```bash
# 1. Deploy functions
firebase deploy --only functions

# 2. Atualizar .env.production
VITE_API_BASE_URL=https://us-central1-sonic-terminal-474321-s1.cloudfunctions.net

# 3. Rebuild e redeploy
./firebase-redeploy.sh
```

#### Opção B: Railway (Mais Rápido)
```bash
# 1. Instalar Railway
npm i -g @railway/cli

# 2. Deploy
railway login
railway init
railway up

# 3. Pegar URL
railway status

# 4. Atualizar .env.production com a URL
# 5. Rebuild e redeploy
```

---

## 🔍 Verificar Deploy

### 1. Teste o site:
https://sonic-terminal-474321-s1.web.app

### 2. Abra o Console do navegador (F12):
- ✅ Os erros de Google Docs devem ter sumido
- ⚠️ Ainda terá erro de localhost:3001 (opcional de resolver)

### 3. Teste Google Docs/Calendar:
- Vá para a funcionalidade de Minutas
- Clique em "Conectar Google Docs"
- Deve abrir popup de autorização

---

## 📦 Arquivos Atualizados

```
✅ .env (desenvolvimento)
✅ .env.production (produção)
✅ functions/.env (Firebase Functions)
✅ firebase.json (restore original)
```

---

## 🔄 Para Fazer Novo Deploy

### Manualmente:
```bash
NODE_ENV=production npm run build
firebase deploy --only hosting
```

### Com o script:
```bash
./firebase-redeploy.sh
```

---

## 🆘 Troubleshooting

### Erro: "Acesso negado ao Google Docs"
**Causa:** URIs não configuradas no Google Console  
**Solução:** Siga o passo "AÇÃO NECESSÁRIA" acima

### Erro: "Invalid Client ID"
**Causa:** Client ID incorreto ou APIs não habilitadas  
**Solução:** 
1. Verifique se copiou o Client ID corretamente
2. Habilite Google Docs/Drive/Calendar API

### Erro: "localhost:3001 não acessível"
**Causa:** Backend não deployado  
**Solução:** Deploy backend via Railway ou Firebase Functions (opcional)

---

## 📞 Links Úteis

- Firebase Console: https://console.firebase.google.com/project/sonic-terminal-474321-s1
- Google Cloud Console: https://console.cloud.google.com
- OAuth Config: https://console.cloud.google.com/apis/credentials
- API Library: https://console.cloud.google.com/apis/library
- Site Live: https://sonic-terminal-474321-s1.web.app

---

## ✨ Sucesso!

Seu app está no ar com:
- ✅ Google OAuth configurado
- ✅ Gemini AI integrado
- ✅ PWA habilitado
- ✅ Build otimizado

**Configure as URIs autorizadas e teste!** 🚀
