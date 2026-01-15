# 🔥 Configuração Firebase - Assistente Jurídico PJe

**Status**: ✅ Configuração Completa  
**Data**: 2026-01-15  
**Ambiente**: Produção + Staging + Development

---

## 📋 Arquivos Configurados

### 1. ✅ `firebase.json` (Configuração Principal)
Recursos configurados:
- **Hosting**: Cache otimizado, headers de segurança, rewrites para SPA
- **Functions**: Cloud Functions com Node.js 20, build automático
- **Firestore**: Regras de segurança e índices
- **Storage**: Regras para upload de arquivos
- **Emulators**: Ambiente local completo

### 2. ✅ `firestore.rules` (Segurança do Banco)
Coleções protegidas:
- `users` - Dados dos usuários (acesso restrito)
- `processos` - Processos jurídicos (apenas donos)
- `jurisprudencias` - Base de pesquisa (advogados verificados)
- `minutas` - Documentos gerados (privados)
- `prazos` - Gestão de deadlines (privados)
- `agentes_logs` - Auditoria dos agentes (admin only)
- `djen_publicacoes` - Diário eletrônico (advogados)
- `rate_limits` - Controle de uso (sistema)
- `feedback` - Melhorias (usuários autenticados)

### 3. ✅ `firestore.indexes.json` (Otimização de Queries)
Índices compostos para:
- Busca de processos por status e data
- Pesquisa de jurisprudências por relevância
- Filtro de minutas por tipo
- Ordenação de prazos por prioridade
- Logs dos agentes por usuário e data

### 4. ✅ `storage.rules` (Upload de Arquivos)
Estrutura de armazenamento:
- `/users/{userId}/avatar/` - Avatares públicos (5MB)
- `/users/{userId}/documents/` - Documentos privados (10MB)
- `/minutas/{userId}/{minutaId}/` - Petições geradas (PDF)
- `/processos/{userId}/{processoId}/anexos/` - Anexos de processos
- `/jurisprudencias/pdfs/` - PDFs de jurisprudência (público)
- `/backups/{userId}/` - Backups automáticos

### 5. ✅ `.firebaserc` (Ambientes)
Projetos configurados:
- `production` → sonic-terminal-474321-s1
- `staging` → assistente-juridico-staging
- `development` → assistente-juridico-dev

### 6. ✅ `firebase-deploy.sh` (Script de Deploy)
Features:
- Validação de variáveis de ambiente
- Execução automática de testes
- Build otimizado
- Deploy por ambiente
- Mensagens coloridas e logs

---

## 🚀 Como Usar

### Deploy para Produção
```bash
# Deploy completo (com testes)
npm run firebase:deploy

# Ou usando o script
./firebase-deploy.sh --env production
```

### Deploy para Staging
```bash
./firebase-deploy.sh --env staging
```

### Deploy para Development
```bash
./firebase-deploy.sh --env development --skip-tests
```

### Testar Localmente
```bash
# Iniciar emuladores
firebase emulators:start

# UI dos emuladores estará em:
# http://localhost:4000
```

### Comandos Úteis
```bash
# Alternar entre ambientes
firebase use production
firebase use staging
firebase use development

# Deploy apenas hosting
firebase deploy --only hosting

# Deploy apenas functions
firebase deploy --only functions

# Deploy apenas regras Firestore
firebase deploy --only firestore:rules

# Ver logs em tempo real
firebase functions:log --only api

# Criar canal de preview
npm run firebase:preview
```

---

## 🔒 Regras de Segurança

### Firestore - Hierarquia de Permissões

**Nível 1: Usuário**
- ✅ Leitura: próprio perfil
- ✅ Escrita: atualização de dados (exceto role/verified)
- ❌ Exclusão: apenas admin

**Nível 2: Advogado Verificado**
- ✅ Leitura: jurisprudências, processos relacionados
- ✅ Escrita: criar processos, minutas, prazos
- ❌ Exclusão: apenas próprios recursos

**Nível 3: Administrador**
- ✅ Leitura: tudo
- ✅ Escrita: gerenciar usuários, logs
- ✅ Exclusão: recursos de qualquer usuário

### Storage - Limites de Upload

| Tipo | Tamanho Máx | Formato Aceito |
|------|-------------|----------------|
| Avatar | 5 MB | image/* |
| Documento | 10 MB | application/pdf |
| Anexo Processo | 10 MB | PDF ou imagem |

---

## 📊 Índices Firestore

### Performance Otimizada Para:
1. **Processos**: busca por status + data (DESC)
2. **Jurisprudências**: filtro por tribunal + relevância (DESC)
3. **Minutas**: listagem por tipo + data (DESC)
4. **Prazos**: ordenação por prioridade + vencimento (ASC)
5. **Logs**: auditoria por agente + timestamp (DESC)

---

## 🔧 Configurações Avançadas

### Headers de Segurança (Hosting)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Cache-Control: max-age=31536000 (assets estáticos)
Cache-Control: no-cache (index.html)
```

### Cache Strategy
- **Assets estáticos** (JS/CSS/Images): 1 ano (immutable)
- **HTML**: sem cache (always fresh)
- **API calls**: revalidate on demand

### Funções Cloud (backend/)
- **Runtime**: Node.js 20
- **Build**: TypeScript automático
- **Lint**: pré-deploy validation
- **Ignore**: testes, coverage, node_modules

---

## 🌍 URLs dos Ambientes

### Produção
```
Web: https://sonic-terminal-474321-s1.web.app
API: https://sonic-terminal-474321-s1.web.app/api
```

### Staging (quando configurado)
```
Web: https://assistente-juridico-staging.web.app
API: https://assistente-juridico-staging.web.app/api
```

### Emuladores Locais
```
Hosting:   http://localhost:5000
Functions: http://localhost:5001
Firestore: http://localhost:8080
Auth:      http://localhost:9099
UI:        http://localhost:4000
```

---

## 📈 Monitoramento

### Firebase Console
- Performance Monitoring: ativado
- Crashlytics: ativado para web
- Analytics: eventos customizados dos agentes

### Métricas Importantes
- Tempo de resposta dos agentes
- Taxa de sucesso das buscas
- Erros de autenticação
- Uso de quota Firestore

---

## ⚠️ Avisos Importantes

### 🔴 NUNCA COMMITAR:
- ❌ Chaves de API reais
- ❌ Tokens de service account
- ❌ Arquivos `.env` com credenciais

### ✅ SEMPRE FAZER:
- ✅ Testar regras Firestore localmente
- ✅ Validar índices antes do deploy
- ✅ Monitorar custos no Firebase Console
- ✅ Fazer backup manual antes de deploy grande

---

## 🆘 Troubleshooting

### Problema: "Permission denied" no Firestore
**Solução**: Verificar se usuário está autenticado e tem permissões adequadas

### Problema: "Index not found"
**Solução**: Executar `firebase deploy --only firestore:indexes`

### Problema: Deploy trava no "functions"
**Solução**: Aumentar timeout no firebase.json ou usar `--force`

### Problema: Emuladores não iniciam
**Solução**: 
```bash
# Matar processos antigos
lsof -ti:5000 | xargs kill -9
lsof -ti:8080 | xargs kill -9

# Reiniciar
firebase emulators:start
```

---

## 📚 Recursos Adicionais

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Best Practices](https://firebase.google.com/docs/functions/tips)
- [Hosting Rewrites](https://firebase.google.com/docs/hosting/full-config#rewrites)

---

## ✅ Checklist de Deploy

Antes de cada deploy para produção:

- [ ] Testes passando (`npm test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Lint sem warnings (`npm run lint`)
- [ ] Regras Firestore validadas
- [ ] Índices atualizados
- [ ] Variáveis de ambiente configuradas
- [ ] Backup do banco de dados
- [ ] Comunicação com equipe
- [ ] Changelog atualizado

---

**Configurado por**: GitHub Copilot CLI  
**Data**: 2026-01-15  
**Versão**: 1.0.0  
**Próxima revisão**: Após 1000 usuários ativos
