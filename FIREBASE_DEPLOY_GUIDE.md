# Guia de Deploy - Sistema RAG no Firebase

Este guia explica como implantar o sistema RAG no Firebase Cloud Functions.

## 📋 Pré-requisitos

- [ ] Projeto Firebase criado
- [ ] Plano Blaze ativado (necessário para Cloud Functions)
- [ ] Firebase CLI instalada (`npm install -g firebase-tools`)
- [ ] Autenticação configurada no Firebase
- [ ] App Check habilitado (recomendado)

## 🚀 Passo a Passo

### 1. Configurar Projeto Firebase

```bash
# Fazer login
firebase login

# Ir para o diretório do projeto
cd /home/user/assisnte-juridico-local

# Inicializar Firebase (se ainda não foi feito)
firebase init functions

# Selecionar:
# - TypeScript
# - ESLint (opcional)
# - Instalar dependências
```

### 2. Configurar Segredos (API Keys)

```bash
# Gemini API Key
firebase functions:secrets:set GEMINI_API_KEY
# Cole: AIzaSyAlqvDyAboF9Qt5b24CstCsReG5Mjm3Xjo

# Qdrant URL
firebase functions:secrets:set QDRANT_URL
# Cole a URL do seu Qdrant

# Qdrant API Key
firebase functions:secrets:set QDRANT_API_KEY
# Cole a chave da API do Qdrant

# Listar segredos configurados
firebase functions:secrets:access GEMINI_API_KEY
```

### 3. Configurar Autenticação

No Firebase Console:

1. Vá em **Authentication**
2. Clique em **Get Started**
3. Habilite os provedores desejados:
   - ✅ Google
   - ✅ Email/Password
   - ✅ Outros conforme necessário

### 4. Configurar App Check (Recomendado)

No Firebase Console:

1. Vá em **App Check**
2. Clique em **Get Started**
3. Configure o provedor:
   - **reCAPTCHA v3** para web
   - **App Attest** para iOS
   - **Play Integrity** para Android

### 5. Ajustar CORS

Edite `functions/src/rag-functions.ts`:

```typescript
cors: ['https://seu-dominio.com', 'https://seu-app.web.app']
```

Ou para desenvolvimento local:

```typescript
cors: true // Permite todos os domínios (apenas dev!)
```

### 6. Instalar Dependências

```bash
cd functions
npm install firebase-functions firebase-admin
npm install llm-chunk pdf-parse
npm install genkit @genkit-ai/google-genai
```

### 7. Deploy

```bash
# Deploy apenas as funções
firebase deploy --only functions

# Ou deploy completo (hosting + functions)
firebase deploy
```

### 8. Testar o Deploy

Após o deploy, você verá as URLs das funções:

```
✔  functions[indexDocument(us-central1)]: Successful create operation.
Function URL: https://us-central1-seu-projeto.cloudfunctions.net/indexDocument

✔  functions[processPDF(us-central1)]: Successful create operation.
Function URL: https://us-central1-seu-projeto.cloudfunctions.net/processPDF

✔  functions[searchQdrant(us-central1)]: Successful create operation.
Function URL: https://us-central1-seu-projeto.cloudfunctions.net/searchQdrant
```

## 📱 Usando as Funções no Client

### JavaScript (Web)

```javascript
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Configurar Firebase
const app = initializeApp({
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
});

const functions = getFunctions(app);
const auth = getAuth(app);

// 1. Autenticar usuário
await signInWithPopup(auth, new GoogleAuthProvider());

// 2. Chamar função para indexar documento
const indexDocument = httpsCallable(functions, 'indexDocument');
const result = await indexDocument({
  content: "Conteúdo do documento...",
  metadata: {
    numeroProcesso: "0001234-56.2024.8.13.0001",
    tipo: "petição",
    source: "peticao.pdf"
  }
});

console.log(result.data);
// { success: true, chunksIndexed: 12 }

// 3. Chamar função para processar PDF
const processPDF = httpsCallable(functions, 'processPDF');
const pdfResult = await processPDF({
  pdfUrl: "https://exemplo.com/sentenca.pdf",
  numeroProcesso: "0001234-56.2024.8.13.0001",
  tipo: "sentença"
});

console.log(pdfResult.data);
// { success: true, chunksIndexed: 8, extractedText: "..." }

// 4. Buscar no Qdrant
const searchQdrant = httpsCallable(functions, 'searchQdrant');
const searchResult = await searchQdrant({
  query: "valor da pensão alimentícia",
  numeroProcesso: "0001234-56.2024.8.13.0001",
  limit: 5
});

console.log(searchResult.data);
// [ { content: "...", score: 0.95 }, ... ]
```

### React/Next.js

```typescript
import { useAuth } from '@/hooks/useAuth';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function DocumentUploader() {
  const { user } = useAuth();
  const functions = getFunctions();

  const handleUpload = async (file: File) => {
    if (!user) {
      alert('Faça login primeiro');
      return;
    }

    // Ler arquivo como texto
    const text = await file.text();

    // Chamar função
    const indexDocument = httpsCallable(functions, 'indexDocument');
    const result = await indexDocument({
      content: text,
      metadata: {
        numeroProcesso: "0001234-56.2024.8.13.0001",
        tipo: "petição",
        source: file.name
      }
    });

    console.log('Indexado:', result.data);
  };

  return (
    <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
  );
}
```

## 🔍 Monitoramento

### Firebase Console

1. Vá em **Functions**
2. Selecione a função
3. Clique em **Logs** ou **Metrics**

### Logs em Tempo Real

```bash
firebase functions:log --only indexDocument
```

### Genkit Developer UI (Local)

```bash
cd functions
genkit start -- npx tsx --watch src/index.ts
```

Acesse: http://localhost:4000

## 🧪 Teste Local com Emuladores

```bash
# Iniciar emuladores
genkit start -- firebase emulators:start --inspect-functions

# Em outro terminal, chamar a função
curl http://localhost:5001/seu-projeto/us-central1/indexDocument \
  -H "Content-Type: application/json" \
  -d '{"data":{"content":"teste","metadata":{"numeroProcesso":"123","tipo":"teste"}}}'
```

## ⚙️ Configurações Avançadas

### Limites de Recursos

Edite em `rag-functions.ts`:

```typescript
{
  memory: '2GB',           // Mais memória para PDFs grandes
  timeoutSeconds: 540,     // 9 minutos max
  minInstances: 1,         // Instâncias sempre ativas (evita cold start)
  maxInstances: 100,       // Escala automática
}
```

### Região

```typescript
import { region } from 'firebase-functions';

export const indexDocument = region('southamerica-east1')
  .https.onCallGenkit({ ... }, indexDocumentFlow);
```

### VPC Connector (para Qdrant privado)

```typescript
{
  vpcConnector: 'projects/SEU_PROJETO/locations/us-central1/connectors/seu-connector',
  vpcConnectorEgressSettings: 'PRIVATE_RANGES_ONLY'
}
```

## 🔒 Segurança

### Custom Claims (Autorização Avançada)

```typescript
// Verificar se usuário é advogado
authPolicy: (auth) => {
  return auth?.token?.email_verified && 
         auth?.token?.advogado === true;
}

// Ou usar helper
import { hasAllClaims } from 'firebase-functions/https';
authPolicy: hasAllClaims('email_verified', 'advogado')
```

### Rate Limiting

Considere usar Firebase Extensions:
- **Limit User Actions** - Limita ações por usuário
- **Monitor App Check** - Detecta uso anormal

## 📊 Custos Estimados

Cloud Functions (Blaze Plan):
- **Invocações:** $0.40 por milhão
- **GB-seg:** $0.0000025 por GB-segundo
- **GHz-seg:** $0.0000100 por GHz-segundo
- **Rede:** $0.12 por GB

Exemplo: 10.000 indexações/mês
- Invocações: $0.004
- Compute: ~$2.50
- **Total: ~$2.50/mês**

## ✅ Checklist de Deploy

- [ ] Projeto Firebase criado e plano Blaze ativo
- [ ] Segredos configurados (GEMINI_API_KEY, QDRANT_*)
- [ ] Autenticação habilitada
- [ ] App Check configurado
- [ ] CORS ajustado para seu domínio
- [ ] Função deployada com sucesso
- [ ] Testado com cliente web/mobile
- [ ] Logs monitorados no console
- [ ] Alertas configurados (opcional)

## 🆘 Troubleshooting

### "Missing or insufficient permissions"
→ Verifique se o usuário está autenticado e tem email verificado

### "CORS policy blocked"
→ Adicione seu domínio na lista `cors: [...]`

### "Function timeout"
→ Aumente `timeoutSeconds` ou otimize o processamento

### "Secret not found"
→ Certifique-se de ter configurado: `firebase functions:secrets:set NOME_SEGREDO`

---

**Documentação completa:** https://firebase.google.com/docs/functions  
**Genkit + Firebase:** https://firebase.google.com/docs/genkit/deploy-firebase
