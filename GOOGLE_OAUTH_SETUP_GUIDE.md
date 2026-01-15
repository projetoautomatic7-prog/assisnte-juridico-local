# 🔐 Configuração OAuth - Google Docs/Calendar

## ⚡ PASSO A PASSO (5 minutos)

### 1️⃣ Acesse o Google Cloud Console

**Link direto:**
https://console.cloud.google.com/apis/credentials/oauthclient/572929400457-lufh2hv2dt7129mikbr1e9k5h1copv4s.apps.googleusercontent.com

Se o link não funcionar, siga este caminho:
1. Acesse: https://console.cloud.google.com
2. Selecione projeto: **sonic-terminal-474321-s1**
3. Menu → **APIs & Services** → **Credentials**
4. Clique no Client ID: **572929400457-lufh2hv2dt7129mikbr1e9k5h1copv4s**

---

### 2️⃣ Editar Client ID

Você verá uma tela com o título: **"OAuth 2.0 Client ID"**

Clique no botão **"EDIT"** (ícone de lápis) no topo da página.

---

### 3️⃣ Adicionar "Authorized JavaScript origins"

Role até a seção: **"Authorized JavaScript origins"**

Clique em **"+ ADD URI"** e adicione CADA uma dessas URLs:

```
https://sonic-terminal-474321-s1.web.app
```

Clique em **"+ ADD URI"** novamente:

```
https://sonic-terminal-474321-s1.firebaseapp.com
```

Para desenvolvimento local (opcional), adicione também:

```
http://localhost:3000
```

```
http://localhost:5173
```

---

### 4️⃣ Adicionar "Authorized redirect URIs"

Role até a seção: **"Authorized redirect URIs"**

Clique em **"+ ADD URI"** e adicione CADA uma dessas URLs:

```
https://sonic-terminal-474321-s1.web.app/oauth2callback
```

Clique em **"+ ADD URI"** novamente:

```
https://sonic-terminal-474321-s1.firebaseapp.com/oauth2callback
```

Para desenvolvimento local (opcional):

```
http://localhost:3000/oauth2callback
```

```
http://localhost:5173/oauth2callback
```

---

### 5️⃣ Salvar

**IMPORTANTE:** Role até o final da página e clique no botão **"SAVE"** (azul).

Aguarde a mensagem de confirmação: **"Client ID updated"**

---

### 6️⃣ Habilitar APIs Necessárias

Agora você precisa habilitar as APIs que o app usa:

#### A. Google Docs API
1. Acesse: https://console.cloud.google.com/apis/library/docs.googleapis.com
2. Clique em **"ENABLE"**
3. Aguarde confirmação

#### B. Google Drive API
1. Acesse: https://console.cloud.google.com/apis/library/drive.googleapis.com
2. Clique em **"ENABLE"** (se não estiver habilitada)
3. Aguarde confirmação

#### C. Google Calendar API
1. Acesse: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
2. Clique em **"ENABLE"**
3. Aguarde confirmação

---

## ✅ Verificação

### Teste se funcionou:

1. **Limpe o cache do navegador:**
   - Pressione `Ctrl + Shift + Delete` (Windows/Linux)
   - Ou `Cmd + Shift + Delete` (Mac)
   - Marque "Cookies" e "Cached files"
   - Clique em "Clear data"

2. **Acesse o app:**
   https://sonic-terminal-474321-s1.web.app

3. **Teste Google Docs:**
   - Vá para a seção de **"Minutas"** ou **"Editor"**
   - Clique em **"Conectar Google Docs"** ou **"Conectar Google Drive"**
   - Deve abrir um popup do Google pedindo autorização
   - Selecione sua conta Google
   - Autorize o acesso

4. **Se funcionar:**
   - ✅ Você verá seus documentos do Google Docs
   - ✅ Poderá criar/editar documentos
   - ✅ Poderá sincronizar com Google Calendar

5. **Se der erro "redirect_uri_mismatch":**
   - ❌ Verifique se salvou as configurações no Google Console
   - ❌ Verifique se copiou as URLs exatamente como mostrado acima
   - ❌ Aguarde 5 minutos (mudanças podem demorar para propagar)

---

## 🔍 Checklist Final

Antes de testar, confirme:

- [ ] Adicionei `https://sonic-terminal-474321-s1.web.app` em JavaScript origins
- [ ] Adicionei `https://sonic-terminal-474321-s1.firebaseapp.com` em JavaScript origins
- [ ] Adicionei `https://sonic-terminal-474321-s1.web.app/oauth2callback` em Redirect URIs
- [ ] Adicionei `https://sonic-terminal-474321-s1.firebaseapp.com/oauth2callback` em Redirect URIs
- [ ] Cliquei em **SAVE** no final da página
- [ ] Habilitei Google Docs API
- [ ] Habilitei Google Drive API
- [ ] Habilitei Google Calendar API
- [ ] Limpei cache do navegador
- [ ] Testei no app

---

## 📞 Links Rápidos

| Recurso | Link |
|---------|------|
| **OAuth Config** | https://console.cloud.google.com/apis/credentials/oauthclient/572929400457-lufh2hv2dt7129mikbr1e9k5h1copv4s.apps.googleusercontent.com |
| **Google Docs API** | https://console.cloud.google.com/apis/library/docs.googleapis.com |
| **Google Drive API** | https://console.cloud.google.com/apis/library/drive.googleapis.com |
| **Google Calendar API** | https://console.cloud.google.com/apis/library/calendar-json.googleapis.com |
| **Seu App** | https://sonic-terminal-474321-s1.web.app |
| **Firebase Console** | https://console.firebase.google.com/project/sonic-terminal-474321-s1 |

---

## 🆘 Troubleshooting

### Erro: "redirect_uri_mismatch"
**Causa:** URI não configurada ou erro de digitação  
**Solução:** Volte ao passo 4 e verifique se as URIs estão EXATAMENTE como mostrado

### Erro: "Access blocked: This app's request is invalid"
**Causa:** APIs não habilitadas  
**Solução:** Volte ao passo 6 e habilite as 3 APIs

### Erro: "The OAuth client was not found"
**Causa:** Client ID incorreto ou projeto errado  
**Solução:** Verifique se está no projeto correto (sonic-terminal-474321-s1)

### Nada acontece ao clicar "Conectar"
**Causa:** JavaScript origins não configurado  
**Solução:** Volte ao passo 3 e adicione os JavaScript origins

---

## ✨ Pronto!

Após configurar, o Google Docs/Calendar funcionará perfeitamente no seu app! 🚀

**Teste agora:** https://sonic-terminal-474321-s1.web.app
