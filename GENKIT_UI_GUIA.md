# 🎨 Genkit Dev UI - Interface de Teste dos Agentes

## 🚀 **Como Iniciar (SUPER SIMPLES)**

### **Comando Rápido:**
```bash
npm run genkit:watch
```

**Ou:**
```bash
npm run genkit:ui
```

**Aguarde ~10 segundos** e acesse: **http://localhost:4000**

---

## 🎯 **O Que Você Verá no Genkit UI**

### **Interface Visual:**
```
┌────────────────────────────────────────────────────────┐
│ Genkit Developer UI                                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│  📋 Flows Disponíveis:                                │
│                                                         │
│  1. ⚖️  petitionFlow             [Run Flow]           │
│     Redação de Petições                                │
│                                                         │
│  2. 📚 indexDocumentFlow          [Run Flow]           │
│     Indexação RAG (Qdrant)                            │
│                                                         │
│  3. 🤖 justineFlow                [Run Flow]           │
│     Orquestradora Justine                             │
│                                                         │
│  4. 🔍 researchFlow               [Run Flow]           │
│     Pesquisa Jurisprudencial                          │
│                                                         │
│  5. 📊 riskAnalysisFlow           [Run Flow]           │
│     Análise de Risco                                  │
│                                                         │
│  6. 🎯 strategyFlow               [Run Flow]           │
│     Estratégia Processual                             │
│                                                         │
│  7. 🔧 agentFlow                  [Run Flow]           │
│     Agente Genérico                                   │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## ✨ **Como Testar um Agente (Passo a Passo)**

### **1. Clique em "Run Flow" ao lado do flow desejado**

### **2. Preencha o Input (JSON)**

**Exemplo - Análise de Texto Jurídico:**
```json
{
  "texto": "AÇÃO DE COBRANÇA. PROCEDÊNCIA. APELAÇÃO DA RÉ. CONHECIMENTO E IMPROVIMENTO.",
  "tipo": "sentenca"
}
```

### **3. Clique em "Run"**

### **4. Veja o Resultado em Tempo Real:**
```
✅ Execution completed (2.3s)

📤 Output:
{
  "resumo": "Sentença julgou procedente ação de cobrança...",
  "pontosPrincipais": [
    "Procedência da ação",
    "Apelação da ré improvida",
    "Condenação mantida"
  ],
  "recomendacoes": [
    "Aguardar trânsito em julgado",
    "Preparar fase de execução"
  ]
}

📊 Trace:
  └─ generate (2.1s)
      ├─ model: gemini-2.0-flash-exp
      ├─ tokens: 156 input / 89 output
      └─ cost: $0.0002
```

---

## 🧪 **Flows Disponíveis (Detalhes)**

### **1. petitionFlow - Redação de Petições**
**Input:**
```json
{
  "tipo": "peticao_inicial",
  "partes": {
    "autor": "João Silva",
    "reu": "Empresa XYZ Ltda"
  },
  "fatos": "Cliente sofreu acidente no estabelecimento...",
  "pedidos": [
    "Condenação ao pagamento de R$ 50.000,00",
    "Condenação em custas processuais"
  ]
}
```

---

### **2. indexDocumentFlow - Indexação RAG**
**Input:**
```json
{
  "numeroProcesso": "1234567-89.2024.8.07.0001",
  "tipo": "sentenca",
  "conteudo": "PODER JUDICIÁRIO. Sentença que julga procedente..."
}
```

---

### **3. justineFlow - Orquestradora**
**Input:**
```json
{
  "tarefa": "Analisar processo 1234567-89.2024.8.07.0001",
  "contexto": "Processo trabalhista de rescisão indireta"
}
```

---

### **4. researchFlow - Pesquisa**
**Input:**
```json
{
  "query": "jurisprudência sobre prescrição quinquenal",
  "tribunal": "STJ",
  "limit": 5
}
```

---

### **5. consultaRapida (Genkit Demo)**
**Input (string simples):**
```
"Qual o prazo para contestação em ação de despejo?"
```

---

## 🎬 **Scripts Disponíveis**

| Comando | Descrição |
|---------|-----------|
| `npm run genkit:watch` | Inicia Genkit UI (recarrega automático) |
| `npm run genkit:ui` | Mesmo que genkit:watch |
| `npm run genkit:init` | Inicializa novo projeto Genkit |

---

## 🔧 **Troubleshooting**

### **Problema: Porta 4000 já em uso**
```bash
# Matar processo na porta 4000
npx kill-port 4000

# Tentar novamente
npm run genkit:watch
```

### **Problema: Flows não aparecem**
```bash
# Verificar se arquivo existe
ls lib/ai/genkit-all-flows.ts

# Recarregar
npm run genkit:watch
```

### **Problema: Erro de API Key**
Verifique se o `.env` tem:
```bash
GEMINI_API_KEY=AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
GOOGLE_API_KEY=AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
```

---

## 🌐 **URLs Importantes**

| Serviço | URL |
|---------|-----|
| **Genkit Dev UI** | http://localhost:4000 |
| **Health Check** | http://localhost:4000/api/__health |
| **Flows List** | http://localhost:4000/api/flows |

---

## 📝 **Exemplo de Uso Completo**

### **1. Iniciar Genkit:**
```bash
npm run genkit:watch
```

### **2. Acessar:**
```
http://localhost:4000
```

### **3. Selecionar Flow:**
- Clique em "consultaRapida"

### **4. Inserir Input:**
```
"Como calcular honorários sucumbenciais?"
```

### **5. Run e Ver Resultado:**
```
✅ Resposta:
"Os honorários sucumbenciais são calculados com base no 
valor da condenação, seguindo os percentuais do artigo 85
do CPC..."

⏱️ Tempo: 1.8s
💰 Custo: $0.0001
```

---

## 🚀 **Atalhos Rápidos**

```bash
# Iniciar Genkit
npm run genkit:watch

# Em outro terminal, testar via cURL
curl -X POST http://localhost:4000/api/flows/consultaRapida/run \
  -H "Content-Type: application/json" \
  -d '{"data": "Qual o prazo prescricional?"}'
```

---

## 🎉 **Pronto! É Só Executar**

```bash
npm run genkit:watch
```

**Aguarde aparecer:**
```
✅ Genkit Demo inicializado com 7 flows
📊 Acesse: http://localhost:4000
```

**Depois abra no navegador e teste seus agentes!** 🚀
