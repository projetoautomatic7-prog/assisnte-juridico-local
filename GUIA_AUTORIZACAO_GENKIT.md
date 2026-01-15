# 🔐 Guia de Autorização e Segurança - Genkit + Assistente Jurídico PJe

**Data:** 15 de Janeiro de 2026  
**Baseado em:** Documentação oficial Genkit - Authorization & Integrity

---

## 📋 Visão Geral

Este guia mostra como proteger os **flows Genkit** no projeto com:
- ✅ **Autenticação de usuários** (quem está chamando)
- ✅ **Autorização** (o que pode fazer)
- ✅ **Integridade do cliente** (App Check)
- ✅ **Proteção de dados sensíveis** (LGPD)

---

## 🎯 Cenários de Proteção

### 1. **Flow com Verificação de UID (auto-acesso)**

Um usuário só pode acessar seus próprios dados.

```typescript
// lib/ai/flows/protected-flow.ts
import { genkit, z, UserFacingError } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

/**
 * Flow protegido: Usuário só acessa seus próprios processos
 */
export const minhasIntimacoes = ai.defineFlow(
  {
    name: 'minhasIntimacoes',
    inputSchema: z.object({
      userId: z.string().describe('ID do usuário'),
      dataInicio: z.string().optional(),
    }),
    outputSchema: z.array(
      z.object({
        numeroProcesso: z.string(),
        dataPublicacao: z.string(),
        prazo: z.string(),
      })
    ),
  },
  async (input, { context }) => {
    // 1. Verificar se usuário está autenticado
    if (!context.auth) {
      throw new UserFacingError('UNAUTHENTICATED', 'Autenticação necessária');
    }

    // 2. Verificar se o userId corresponde ao usuário autenticado
    if (input.userId !== context.auth.uid) {
      throw new UserFacingError(
        'PERMISSION_DENIED',
        'Você só pode acessar suas próprias intimações'
      );
    }

    // 3. Buscar intimações do usuário
    const intimacoes = await buscarIntimacoesPorUsuario(input.userId, input.dataInicio);

    return intimacoes;
  }
);
```

**Testando:**
```bash
# ❌ Erro: Authorization required
await minhasIntimacoes({ userId: 'user-123' });

# ❌ Erro: Você só pode acessar suas próprias intimações
await minhasIntimacoes.run(
  { userId: 'user-123' },
  { context: { auth: { uid: 'user-456' } } }
);

# ✅ Sucesso
await minhasIntimacoes.run(
  { userId: 'user-123' },
  { context: { auth: { uid: 'user-123' } } }
);
```

---

### 2. **Flow com Verificação de Roles (admin)**

Apenas administradores podem executar certas operações.

```typescript
// lib/ai/flows/admin-flow.ts
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

/**
 * Flow protegido: Apenas admins podem listar todos os usuários
 */
export const listarTodosUsuarios = ai.defineFlow(
  {
    name: 'listarTodosUsuarios',
    inputSchema: z.object({
      limite: z.number().optional().default(50),
    }),
    outputSchema: z.array(
      z.object({
        uid: z.string(),
        email: z.string(),
        nome: z.string(),
      })
    ),
  },
  async (input, { context }) => {
    const auth = ai.currentContext()?.auth;

    // Verificar se é admin (Firebase Auth coloca claims em auth.token)
    if (!auth?.token?.admin) {
      throw new UserFacingError(
        'PERMISSION_DENIED',
        'Apenas administradores podem listar usuários'
      );
    }

    // Buscar usuários
    const usuarios = await buscarUsuarios(input.limite);

    return usuarios;
  }
);
```

---

### 3. **Flow com Firebase Functions + App Check**

Proteção completa: autenticação + integridade do cliente.

```typescript
// backend/src/functions/protected-functions.ts
import { genkit, z } from 'genkit';
import { onCallGenkit } from 'firebase-functions/https';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI()],
});

/**
 * Flow para análise de processos (protegido)
 */
const analisarProcessoFlow = ai.defineFlow(
  {
    name: 'analisarProcesso',
    inputSchema: z.object({
      numeroProcesso: z.string(),
      tipo: z.enum(['civel', 'trabalhista', 'penal']),
    }),
    outputSchema: z.object({
      resumo: z.string(),
      probabilidadeVitoria: z.number().min(0).max(1),
      recomendacoes: z.array(z.string()),
    }),
  },
  async (input, { context }) => {
    // Acesso ao contexto de autenticação Firebase
    const userId = context.auth?.uid;
    
    if (!userId) {
      throw new UserFacingError('UNAUTHENTICATED', 'Login necessário');
    }

    // Verificar se usuário tem acesso ao processo
    const temAcesso = await verificarAcessoProcesso(userId, input.numeroProcesso);
    
    if (!temAcesso) {
      throw new UserFacingError('PERMISSION_DENIED', 'Sem acesso a este processo');
    }

    // Analisar processo com Gemini
    const response = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'),
      prompt: `Analise o processo ${input.numeroProcesso} do tipo ${input.tipo}...`,
    });

    return {
      resumo: response.text,
      probabilidadeVitoria: 0.75,
      recomendacoes: ['Rec 1', 'Rec 2'],
    };
  }
);

/**
 * Exporta como Cloud Function com proteção completa
 */
export const analisarProcesso = onCallGenkit(
  {
    // 1. Exigir email verificado E ser admin
    authPolicy: (auth) => 
      auth?.token?.['email_verified'] && auth?.token?.['admin'],

    // 2. Firebase App Check (integridade do cliente)
    enforceAppCheck: true,
    consumeAppCheckToken: true, // Proteção contra replay

    // 3. Acesso IAM privado (apenas usuários autorizados)
    invoker: 'private',
  },
  analisarProcessoFlow
);
```

---

### 4. **Flow com Express.js + API Key**

Para APIs REST fora do Firebase.

```typescript
// backend/src/api/flow-routes.ts
import express from 'express';
import { expressHandler } from '@genkit-ai/express';
import { apiKey } from 'genkit/context';
import { analisarTextoJuridicoFlow } from '../flows/analise-flow';

const app = express();

/**
 * Endpoint protegido por API Key
 */
app.post(
  '/api/flows/analisar-texto',
  expressHandler(analisarTextoJuridicoFlow, {
    contextProvider: apiKey(process.env.API_KEY_SECRET),
  })
);

/**
 * Endpoint com validação customizada
 */
app.post('/api/flows/gerar-minuta', async (req, res) => {
  // Validação manual de token JWT
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token || !validarToken(token)) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Extrair contexto do token
  const userId = extrairUserId(token);

  // Executar flow com contexto
  const result = await gerarMinutaFlow.run(req.body, {
    context: {
      auth: { uid: userId },
    },
  });

  res.json(result);
});

app.listen(3001, () => {
  console.log('✅ API protegida rodando na porta 3001');
});
```

---

## 🔧 Integração com o Projeto Atual

### Opção 1: Usar contexto do Google OAuth existente

O projeto já tem Google OAuth configurado. Podemos reutilizar:

```typescript
// lib/ai/flows/integration-example.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
});

/**
 * Flow que usa o contexto de auth do Google OAuth
 */
export const flowComAuthGoogle = ai.defineFlow(
  {
    name: 'flowComAuthGoogle',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.string(),
  },
  async (input, { context }) => {
    // O contexto já vem do middleware Express (src/App.tsx)
    const userEmail = context.auth?.email;
    
    if (!userEmail) {
      throw new UserFacingError('UNAUTHENTICATED', 'Login Google necessário');
    }

    // Continuar com a lógica...
    return `Resposta para ${userEmail}: ${input.query}`;
  }
);
```

### Opção 2: Middleware Express customizado

```typescript
// backend/src/middlewares/genkit-auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyGoogleToken } from '../services/auth-service';

/**
 * Middleware para injetar contexto de auth nos flows Genkit
 */
export async function genkitAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar token Google OAuth
    const decoded = await verifyGoogleToken(token);

    // Injetar no contexto da requisição
    req.genkitContext = {
      auth: {
        uid: decoded.sub,
        email: decoded.email,
        email_verified: decoded.email_verified,
      },
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Usar nas rotas de flows
app.post('/api/flows/:flowName', genkitAuthMiddleware, async (req, res) => {
  const flow = flows[req.params.flowName];
  
  const result = await flow.run(req.body, {
    context: req.genkitContext,
  });

  res.json(result);
});
```

---

## 🧪 Testando no Genkit Dev UI

### Via Interface (http://localhost:4000)

1. Acesse o flow na UI
2. Clique na aba **"Auth JSON"**
3. Insira o contexto:

```json
{
  "uid": "user-123",
  "email": "usuario@example.com",
  "admin": true,
  "email_verified": true
}
```

### Via CLI

```bash
genkit flow:run minhasIntimacoes \
  '{"userId": "user-123"}' \
  --context '{"auth": {"uid": "user-123", "email_verified": true}}'
```

---

## 🛡️ Boas Práticas de Segurança

### 1. **Nunca confie apenas no input**
❌ **ERRADO:**
```typescript
async (input) => {
  // NUNCA confiar no userId do input sem validar
  return await buscarDados(input.userId);
}
```

✅ **CORRETO:**
```typescript
async (input, { context }) => {
  if (input.userId !== context.auth?.uid) {
    throw new UserFacingError('PERMISSION_DENIED', 'Acesso negado');
  }
  return await buscarDados(input.userId);
}
```

### 2. **Sanitizar dados antes de enviar ao LLM**
```typescript
import { sanitizePII } from '@/utils/lgpd-compliance';

const response = await ai.generate({
  model: googleAI.model('gemini-2.0-flash-exp'),
  prompt: sanitizePII(input.texto), // Remove CPF, email, etc.
});
```

### 3. **Usar rate limiting**
```typescript
import rateLimit from 'express-rate-limit';

const flowRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 requisições por IP
  message: 'Muitas requisições. Tente novamente mais tarde.',
});

app.post('/api/flows/analisar', flowRateLimiter, expressHandler(flow));
```

### 4. **Logs de auditoria**
```typescript
async (input, { context }) => {
  // Registrar quem executou o flow
  await auditLog.create({
    userId: context.auth?.uid,
    flowName: 'analisarProcesso',
    input: input.numeroProcesso,
    timestamp: new Date(),
  });

  // Continuar com a lógica...
}
```

---

## 📚 Referências

- [Documentação oficial Genkit - Authorization](https://genkit.dev/docs/authorization)
- [Firebase Auth + Genkit](https://firebase.google.com/docs/auth)
- [Express.js + Genkit](https://genkit.dev/docs/platforms/express)
- `GUIA_MCP_GENKIT.md` - Guia de integração do projeto

---

## 🎯 Próximos Passos

1. ✅ **Criar flow protegido de exemplo**
2. ⏳ Integrar com Google OAuth existente
3. ⏳ Implementar middleware de autorização
4. ⏳ Testar no Genkit Dev UI com contexto
5. ⏳ Adicionar logs de auditoria
6. ⏳ Configurar rate limiting nas rotas

---

**Última atualização:** 15/01/2026 00:47 UTC  
**Segurança:** ✅ Conformidade LGPD mantida  
**Status:** 📖 Guia pronto para implementação
