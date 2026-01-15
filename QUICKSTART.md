# 🚀 Quick Start - Assistente Jurídico PJe

**Guia rápido para começar a desenvolver em 5 minutos**

---

## 📦 Pré-requisitos

- Node.js 20+
- npm ou yarn
- Git
- Firebase CLI (opcional, para emulators)

---

## 🔥 Setup Rápido

### 1. Clone e Instale

```bash
git clone <repo-url>
cd assistente-juridico-local
npm install
```

### 2. Configure Variáveis de Ambiente

```bash
# Copie o template
cp .env.example .env

# Edite .env e adicione suas chaves:
# - VITE_GOOGLE_API_KEY (obrigatório)
# - QDRANT_URL e QDRANT_API_KEY (opcional, para pesquisa)
# - DATABASE_URL (opcional, para produção)
```

### 3. Escolha seu Ambiente

#### Opção A: Desenvolvimento Local Simples

```bash
npm run dev
# Acesse: http://localhost:5173
```

#### Opção B: Desenvolvimento com Firebase Emulators (Recomendado)

```bash
# Instalar Firebase CLI (primeira vez)
npm install -g firebase-tools

# Iniciar emulators
npm run firebase:emulators

# Acesse:
# - App: http://127.0.0.1:5000
# - Emulator UI: http://127.0.0.1:4000
```

#### Opção C: Docker (Ambiente Completo)

```bash
# Windows
./scripts/setup-local-docker.ps1

# Linux/Mac
docker-compose up -d
npm run dev
```

---

## 🧪 Testar

```bash
# Testes unitários
npm test

# Testes específicos do agente de pesquisa
npm test -- src/agents/pesquisa-juris/__tests__/ --run

# Testes E2E
npm run test:e2e
```

---

## 🔧 Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento (Vite) |
| `npm run build` | Build para produção |
| `npm run lint` | Verificar código |
| `npm run format` | Formatar código |
| `npm test` | Executar testes |
| `npm run firebase:emulators` | Firebase local |

---

## 🌐 Firebase Emulators (Desenvolvimento Local)

### Serviços Disponíveis

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Emulator UI** | http://127.0.0.1:4000 | Interface visual |
| **Hosting** | http://127.0.0.1:5000 | App frontend |
| **Firestore** | http://127.0.0.1:8080 | Banco NoSQL |
| **Auth** | http://127.0.0.1:9099 | Autenticação |
| **Functions** | http://127.0.0.1:5001 | Cloud Functions |
| **Storage** | http://127.0.0.1:9199 | Upload arquivos |

### Como Usar

1. **Inicie os emulators:**
   ```bash
   npm run firebase:emulators
   ```

2. **Acesse a UI:**
   http://127.0.0.1:4000

3. **Teste o app:**
   http://127.0.0.1:5000

4. **Interaja com Firestore:**
   - Crie documentos em `users`, `processos`, `minutas`
   - Veja dados em tempo real na UI
   - Teste regras de segurança

---

## 📚 Estrutura do Projeto

```
assistente-juridico-local/
├── src/                      # Código frontend (React)
│   ├── agents/              # 15 agentes IA especializados
│   │   ├── pesquisa-juris/  # Agente de pesquisa jurisprudencial
│   │   ├── redacao-peticoes/
│   │   └── ...
│   ├── components/          # Componentes React
│   └── lib/                 # Utilitários e configs
│
├── backend/                 # API Express (backend próprio)
│   └── src/
│
├── functions/               # Cloud Functions (Firebase)
│   └── src/index.ts
│
├── firestore.rules          # Regras de segurança Firestore
├── firestore.indexes.json   # Índices otimizados
├── storage.rules            # Regras upload arquivos
│
└── tests/                   # Testes E2E e integração
```

---

## 🎯 Agentes IA Disponíveis

1. **Harvey** - Orquestrador principal
2. **Justine** - Pesquisa jurisprudencial
3. **Redação Petições** - Gerador de documentos
4. **Análise Documental** - OCR e análise
5. **Gestão Prazos** - Deadlines e alertas
6. **Monitor DJEN** - Diário eletrônico
7. **Financeiro** - Gestão de honorários
8. ... e mais 8 agentes especializados

---

## 🔐 Coleções Firestore

Quando usar Firebase Emulators, estas coleções estão disponíveis:

| Coleção | Descrição | Acesso |
|---------|-----------|--------|
| `users` | Perfis usuários | Próprio usuário |
| `processos` | Processos jurídicos | Privado (dono) |
| `jurisprudencias` | Base de pesquisa | Advogados verificados |
| `minutas` | Documentos gerados | Privado (dono) |
| `prazos` | Gestão deadlines | Privado (dono) |
| `agentes_logs` | Logs auditoria | Admin only |
| `djen_publicacoes` | Diário eletrônico | Advogados |
| `rate_limits` | Controle uso | Sistema |
| `feedback` | Melhorias | Usuários auth |

---

## 🐛 Troubleshooting

### Erro: "Port 5173 already in use"

```bash
# Matar processo na porta
lsof -ti:5173 | xargs kill -9
```

### Erro: "GOOGLE_API_KEY not found"

```bash
# Verificar .env
cat .env | grep GOOGLE_API_KEY

# Se vazio, adicionar:
echo "VITE_GOOGLE_API_KEY=sua_chave_aqui" >> .env
```

### Erro: "Firestore emulator not starting"

```bash
# Verificar portas
lsof -i:8080
lsof -i:4000

# Matar se necessário
lsof -ti:8080 | xargs kill -9

# Reiniciar
npm run firebase:emulators
```

### Erro: "Module not found"

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Documentação Completa

- 📘 [README Principal](README.md)
- 📗 [Configuração Firebase](FIREBASE_CONFIG_README.md)
- 📙 [Guia Copilot CLI](COPILOT_CLI_README.md)
- 📕 [Testes Implementados](IMPLEMENTACAO_TESTES_COMPLETA.md)
- 📔 [Correções Emulators](FIREBASE_EMULATOR_FIX.md)

---

## 🆘 Precisa de Ajuda?

1. Consulte a documentação acima
2. Verifique [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
3. Abra uma issue no GitHub
4. Use GitHub Copilot CLI: `copilot`

---

**🎉 Pronto! Agora você está pronto para desenvolver.**

*Atualizado: 15/01/2026*
