# 🔴 CORREÇÃO: Erro "SyntaxError: Unexpected token '<'"

## 📊 Problema Identificado

**Erro no Console:**
```
[DJENWidget] Sync error: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

**Causa Raiz:** 
Firebase Functions **NÃO estão deployadas**, mas as rotas estão configuradas no `firebase.json`.

---

## 🔍 Diagnóstico

### ✅ O que está correto:

1. **firebase.json** tem as rotas:
```json
{
  "source": "/api/djen/trigger-manual",
  "function": "djenTriggerManual"
}
```

2. **Functions buildadas localmente:**
```bash
functions/lib/djen-scheduler.js ✅
functions/lib/index.js ✅
```

3. **Código do frontend** correto:
```typescript
const syncUrl = "/api/djen/trigger-manual";
```

### ❌ O que está errado:

**Firebase Hosting não encontra a Function** → retorna `index.html` (fallback) → Frontend tenta parsear HTML como JSON → **SyntaxError**

---

## ✅ SOLUÇÃO RÁPIDA

### Opção 1: Deploy Completo (Recomendado)

```bash
firebase deploy
```

Isso vai deployar:
- ✅ Hosting (frontend)
- ✅ Functions (backend DJEN)
- ✅ Firestore rules
- ✅ Storage rules

**Tempo estimado:** 3-5 minutos

---

### Opção 2: Deploy Apenas Functions (Mais Rápido)

```bash
firebase deploy --only functions
```

Isso vai deployar:
- ✅ djenScheduler01h
- ✅ djenScheduler09h
- ✅ djenTriggerManual ⬅️ **Esta é a que está faltando**
- ✅ djenStatus
- ✅ djenPublicacoes
- ✅ agents

**Tempo estimado:** 1-2 minutos

---

### Opção 3: Deploy de Function Específica (Debugging)

```bash
firebase deploy --only functions:djenTriggerManual
```

**Tempo estimado:** 30-60 segundos

---

## 🧪 Como Testar Após Deploy

### 1. Verificar se a Function está ativa:

```bash
curl https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenStatus
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
  },
  "region": "southamerica-east1 (Brasil)"
}
```

---

### 2. Testar trigger manual:

```bash
curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "mensagem": "Processamento DJEN executado com sucesso",
  "dados": {
    "total": 0,
    "processadas": 0,
    "erros": 0
  }
}
```

---

### 3. Testar no navegador (Frontend):

1. Abra o app: `https://sonic-terminal-474321-s1.web.app`
2. Vá até o widget DJEN
3. Clique no botão **"Sincronizar"**
4. ✅ Não deve mais aparecer o erro `SyntaxError`
5. ✅ Deve aparecer toast: "Sincronização concluída"

---

## 🔧 Configurações Necessárias (Se Ainda Não Fez)

### 1. Firebase Secrets (Obrigatórios)

As Functions precisam das variáveis de ambiente como **Secrets**:

```bash
# 1. Definir secrets
firebase functions:secrets:set DJEN_OAB_NUMERO
# Digite: 184404

firebase functions:secrets:set DJEN_OAB_UF
# Digite: MG

firebase functions:secrets:set DJEN_ADVOGADO_NOME
# Digite: Thiago Bodevan Veiga
```

---

### 2. Verificar Region (Importante para API DJEN)

Edite `functions/src/djen-scheduler.ts` e confirme:

```typescript
export const djenScheduler01h = onSchedule({
  region: "southamerica-east1", // ✅ DEVE ser Brasil
  // ...
});
```

**Por quê?** API do CNJ (DJEN) tem geobloqueio e só aceita requisições do Brasil.

---

## 📋 Checklist de Deploy

Antes de fazer deploy, verifique:

- [ ] ✅ Functions buildadas: `cd functions && npm run build`
- [ ] ✅ Secrets configurados: `firebase functions:secrets:access DJEN_OAB_NUMERO`
- [ ] ✅ Region correta: `southamerica-east1`
- [ ] ✅ Firebase CLI autenticado: `firebase login`
- [ ] ✅ Projeto correto: `firebase use sonic-terminal-474321-s1`

**Então execute:**

```bash
firebase deploy --only functions
```

---

## 🐛 Troubleshooting

### Erro: "Failed to create function"

**Causa:** Secrets não configurados

**Solução:**
```bash
firebase functions:secrets:set DJEN_OAB_NUMERO
firebase functions:secrets:set DJEN_OAB_UF
firebase functions:secrets:set DJEN_ADVOGADO_NOME
```

---

### Erro: "Permission denied"

**Causa:** Usuário não tem permissão no projeto Firebase

**Solução:**
```bash
firebase login --reauth
firebase use sonic-terminal-474321-s1
```

---

### Deploy demora muito (>10 minutos)

**Causa:** Primeira vez deployando Functions grandes

**Solução:** Normal na primeira vez. Próximos deploys serão mais rápidos.

---

### Erro persiste após deploy

**Causa:** Cache do navegador

**Solução:**
1. Limpar cache do browser (Ctrl+Shift+Del)
2. Hard refresh (Ctrl+Shift+R)
3. Ou testar em aba anônima

---

## 📊 Verificação Final

Após deploy bem-sucedido, você deve ver no Firebase Console:

1. **Functions** → Lista de functions deployadas:
   - ✅ djenScheduler01h
   - ✅ djenScheduler09h
   - ✅ djenTriggerManual
   - ✅ djenStatus
   - ✅ djenPublicacoes

2. **Logs** → Últimas execuções (pode estar vazio se nunca rodou)

3. **Hosting** → URL ativo:
   - `https://sonic-terminal-474321-s1.web.app`

---

## 🎯 Resumo da Correção

| O que estava errado | Como corrigir |
|---------------------|---------------|
| ❌ Functions não deployadas | ✅ `firebase deploy --only functions` |
| ❌ Frontend chamando rota inexistente | ✅ Deploy das Functions cria as rotas |
| ❌ HTML retornado em vez de JSON | ✅ Function responde JSON após deploy |

---

## ⏱️ Tempo Total Estimado

- **Configurar secrets:** 2 minutos
- **Build functions:** 30 segundos
- **Deploy functions:** 2 minutos
- **Teste:** 1 minuto

**Total:** ~5 minutos

---

## 📞 Próximos Passos

Após corrigir este erro:

1. ✅ Aplicar correções de paginação (arquivo `INVESTIGACAO_DJEN_PAGINACAO.md`)
2. ✅ Testar schedulers automáticos (01:00 e 09:00)
3. ✅ Monitorar logs no Firebase Console

---

**Data:** 15/01/2026  
**Status:** 🔴 Functions não deployadas - Deploy necessário  
**Prioridade:** 🔴 ALTA (app não funciona sem isso)
