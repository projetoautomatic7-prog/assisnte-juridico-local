# 🤖 GitHub Copilot CLI - Setup Completo

## ✅ Status: INSTALADO E CONFIGURADO

### 📦 Versão
- **Copilot CLI:** v0.0.382
- **Data:** 15/01/2026

### 🔑 Autenticação
Token configurado automaticamente via `GH_TOKEN`.

### 🚀 Iniciar

**Linux/Container:**
```bash
./start-copilot.sh
```

**Manualmente:**
```bash
export GH_TOKEN="<SEU_TOKEN_AQUI>"
copilot
```

**Windows:**
```powershell
$env:GH_TOKEN="<SEU_TOKEN_AQUI>"
copilot
```

---

## 🔥 Firebase - Desenvolvimento Local

### Emulators Configurados (Janeiro 2026)

| Serviço | Endereço | Status |
|---------|----------|--------|
| **Emulator UI** | http://127.0.0.1:4000 | ✅ Ativo |
| **Hosting** | http://127.0.0.1:5000 | ✅ Ativo |
| **Firestore** | http://127.0.0.1:8080 | ✅ Ativo |
| **Auth** | http://127.0.0.1:9099 | ✅ Ativo |
| **Functions** | http://127.0.0.1:5001 | ✅ Ativo |
| **Storage** | http://127.0.0.1:9199 | ✅ Ativo |

### Comandos Firebase

```bash
# Iniciar emulators
npm run firebase:emulators

# Deploy produção
npm run firebase:deploy

# Deploy staging
npm run firebase:deploy:staging

# Deploy apenas regras
npm run firebase:deploy:rules

# Deploy apenas functions
npm run firebase:deploy:functions
```

### Estrutura Firestore

**9 Coleções Protegidas:**

1. `users` - Perfis de usuários
2. `processos` - Processos jurídicos
3. `jurisprudencias` - Base de pesquisa vetorial
4. `minutas` - Documentos gerados
5. `prazos` - Gestão de deadlines
6. `agentes_logs` - Auditoria dos agentes IA
7. `djen_publicacoes` - Diário eletrônico
8. `rate_limits` - Controle de uso API
9. `feedback` - Melhorias do sistema

**Regras de Segurança:** Ver [firestore.rules](firestore.rules)  
**Índices Otimizados:** Ver [firestore.indexes.json](firestore.indexes.json)

### Cloud Functions Disponíveis

**Funções HTTP:**
- `helloWorld` - Health check

**Triggers Firestore:**
- `onUserCreate` - Inicialização de rate limits

**Agendadas (Cron):**
- `scheduledBackup` - Backup diário (3AM)
- `resetRateLimits` - Reset diário (meia-noite)

### Storage - Upload de Arquivos

**Limites Configurados:**

| Tipo | Tamanho Máx | Formato |
|------|-------------|---------|
| Avatar | 5 MB | image/* |
| Documento | 10 MB | application/pdf |
| Anexo | 10 MB | PDF ou imagem |

**Estrutura de pastas:**
```
/users/{userId}/avatar/        - Avatares públicos
/users/{userId}/documents/     - Documentos privados
/minutas/{userId}/{minutaId}/  - Petições geradas
/processos/{userId}/anexos/    - Anexos de processos
/backups/{userId}/             - Backups automáticos
```

### Documentação Firebase

📖 [Configuração Completa](FIREBASE_CONFIG_README.md)  
📖 [Correções Emulators](FIREBASE_EMULATOR_FIX.md)  
📖 [Deploy Guide](FIREBASE_DEPLOY_GUIDE.md)

---

## 📋 Comandos Copilot CLI

| Comando | Descrição |
|---------|-----------|
| `/model` | Trocar modelo IA (Claude 4.5, GPT-5) |
| `/help` | Ajuda completa |
| `/fix` | Corrigir bugs |
| `/test` | Gerar testes |
| `/explain` | Explicar código |
| `/issue` | Gerenciar GitHub issues |
| `/pr` | Gerenciar pull requests |

### 📚 Documentação Completa
Veja [COPILOT_CLI_GUIA.md](./COPILOT_CLI_GUIA.md)

### ⚠️ Modo MANUTENÇÃO
Foco em correção de bugs - evite adicionar features complexas.

---

## 🧪 Testes - Agente Pesquisa Jurisprudencial

### Status dos Testes (Janeiro 2026)

**Testes Unitários:**
- ✅ validators.test.ts - 9/9 passando
- ✅ retrievers.test.ts - 3/3 passando

**Testes de Integração:**
- ⚠️ retrievers.integration.test.ts - 2/8 (aguarda rede Gemini API)

**Comandos:**
```bash
# Testes unitários
npm test -- src/agents/pesquisa-juris/__tests__/validators.test.ts --run
npm test -- src/agents/pesquisa-juris/__tests__/retrievers.test.ts --run

# Testes de integração (requer internet)
npm test -- src/agents/pesquisa-juris/__tests__/retrievers.integration.test.ts --run
```

📖 [Relatório Completo de Testes](IMPLEMENTACAO_TESTES_COMPLETA.md)

---

## 🎯 Contexto do Projeto

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 7
- **Backend**: Node.js 20 + Express
- **IA**: Google Gemini + LangGraph + Genkit
- **DB**: PostgreSQL (Neon) + Qdrant (vetorial) + Firestore
- **Cache**: Redis (Upstash)
- **Deploy**: Firebase + Vercel + Railway

### Arquitetura de Agentes
- **LangGraph**: 15 agentes especializados
- **Genkit**: Flows e integração com LLMs
- **MCP**: Model Context Protocol

### Compliance
- ✅ LGPD (Lei 13.709/2018)
- ✅ PII Filtering automático
- ✅ Auditoria de dados sensíveis

---

*Atualizado: 15/01/2026 - Firebase Emulators + Testes Completos*

**Pronto para uso!** Execute `./start-copilot.sh` e comece a codificar com IA.
