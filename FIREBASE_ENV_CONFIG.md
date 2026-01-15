# 🔥 Configuração de Variáveis - Firebase

## ✅ Status Atual

### Configurado:
- ✓ GEMINI_API_KEY (Firebase Secret)
- ✓ GOOGLE_API_KEY (Firebase Secret)
- ✓ .env.production criado
- ✓ functions/.env criado
- ✓ Deploy script criado

### Ainda precisa configurar:
- ⚠️ VITE_GOOGLE_CLIENT_ID (Google OAuth)
- ⚠️ VITE_API_BASE_URL (Backend API)
- 📝 DATABASE_URL (PostgreSQL - quando necessário)
- 📝 REDIS_URL (Upstash - quando necessário)

---

## 🚀 Deploy com Novas Variáveis

```bash
# Opção 1: Script automático
./firebase-redeploy.sh

# Opção 2: Manual
NODE_ENV=production npm run build
firebase deploy --only hosting
```

---

## 🔧 Resolver Erros do Console

### Erro 1: Google Docs não configurado
```
[GoogleDocs] ERROR: Credenciais do Google Docs não configuradas
```

**Solução:**
1. Acesse: https://console.cloud.google.com/apis/credentials?project=sonic-terminal-474321-s1
2. Clique em **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Tipo: **Web application**
4. Adicione **Authorized JavaScript origins:**
   - https://sonic-terminal-474321-s1.web.app
   - http://localhost:3000 (para dev)
5. Copie o **Client ID** gerado
6. Adicione ao `.env.production`:
   ```bash
   VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI.apps.googleusercontent.com
   ```
7. Rebuild: `./firebase-redeploy.sh`

---

### Erro 2: Backend localhost:3001 não acessível
```
[AI Commands] ⚠️ Falha de conexão com http://localhost:3001
```

**Causa:** Firebase Hosting não pode acessar `localhost`

**Soluções:**

#### Opção A: Firebase Functions (Recomendado)
```bash
# 1. Deploy functions
cd functions
npm install
cd ..
firebase deploy --only functions

# 2. Atualizar .env.production
VITE_API_BASE_URL=https://us-central1-sonic-terminal-474321-s1.cloudfunctions.net
```

#### Opção B: Railway
```bash
# 1. Instalar Railway CLI
npm i -g @railway/cli

# 2. Login e deploy
railway login
railway init
railway up

# 3. Obter URL
railway status

# 4. Atualizar .env.production com a URL do Railway
```

#### Opção C: Render
1. Acesse: https://render.com
2. New → Web Service
3. Conecte este repo
4. Build: `npm install && npm run build`
5. Start: `npm run start`
6. Copie a URL gerada

---

### Erro 3: OpenTelemetry warnings (Opcional)
```
[OpenTelemetry] ⚠️ OTLP desabilitado
```

**Para ignorar:** Já está desabilitado por padrão, apenas warnings informativos.

**Para habilitar (opcional):**
```bash
# Adicionar ao .env.production
VITE_ENABLE_OTEL=true
VITE_OTLP_ENDPOINT=https://seu-endpoint-datadog-ou-honeycomb
```

---

## 📝 Comandos Úteis

### Ver secrets configurados
```bash
firebase functions:secrets:access GEMINI_API_KEY
```

### Adicionar novo secret
```bash
echo "valor_secreto" | firebase functions:secrets:set NOME_SECRET --data-file /dev/stdin
```

### Ver logs do Firebase
```bash
firebase hosting:channel:deploy preview
firebase functions:log
```

---

## 🔐 Segurança

**✅ Boas práticas implementadas:**
- Secrets via Firebase Secrets (não via .env)
- PII filtering habilitado
- CORS configurado

**⚠️ NUNCA commitar:**
- `.env` (já no .gitignore)
- `.env.production` com valores reais
- `functions/.env`

---

## 📞 Suporte

Se tiver dúvidas sobre alguma configuração, consulte:
- Firebase: https://firebase.google.com/docs
- Google Cloud: https://console.cloud.google.com
- Projeto: https://console.firebase.google.com/project/sonic-terminal-474321-s1
