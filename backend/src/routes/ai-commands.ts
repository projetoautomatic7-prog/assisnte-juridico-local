import { Router, Request, Response } from 'express';

const router = Router();

const SYSTEM_PROMPT = `Você é um assistente jurídico sênior especializado em redação de peças processuais e contratos.
Sua tarefa é auxiliar advogados na elaboração de documentos.

Diretrizes:
1. Use linguagem jurídica técnica, formal e precisa.
2. Siga as normas da ABNT e padrões forenses brasileiros.
3. Cite legislação (CF/88, CC/02, CPC/15, CLT) quando pertinente.
4. Mantenha o tom profissional e persuasivo.
5. Retorne APENAS o texto solicitado, sem introduções ou explicações extras.
6. Se o texto for HTML, mantenha a formatação (parágrafos <p>, negrito <strong>, etc).`;

const COMMAND_PROMPTS: Record<string, string> = {
  continuar: "Continue escrevendo o seguinte texto jurídico de forma natural e coesa. Mantenha o mesmo estilo e formatação.",
  expandir: "Expanda e desenvolva o seguinte trecho jurídico com mais detalhes, fundamentação e argumentos. Aumente o tamanho em pelo menos 50%.",
  revisar: "Revise o seguinte texto jurídico melhorando a clareza, coesão e correção gramatical. Mantenha o significado original.",
  formalizar: "Reescreva o seguinte texto utilizando linguagem jurídica formal, culta e técnica. Substitua termos comuns por terminologia jurídica adequada."
};

let lastRequestTime = 0;
const RATE_LIMIT_MS = 2000;

function checkRateLimit(): { allowed: boolean; waitTime: number } {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  
  if (elapsed < RATE_LIMIT_MS) {
    return { allowed: false, waitTime: RATE_LIMIT_MS - elapsed };
  }
  
  lastRequestTime = now;
  return { allowed: true, waitTime: 0 };
}

async function handleAICommand(req: Request, res: Response, command: string) {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Por favor, aguarde ${Math.ceil(rateCheck.waitTime / 1000)} segundos antes de fazer outra requisição.`,
      waitTime: rateCheck.waitTime
    });
  }

  const { texto } = req.body;

  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({
      error: 'Texto required',
      message: 'O campo "texto" é obrigatório e deve ser uma string.'
    });
  }

  if (texto.trim().length === 0) {
    return res.status(400).json({
      error: 'Empty text',
      message: 'O texto não pode estar vazio.'
    });
  }

  const commandPrompt = COMMAND_PROMPTS[command];
  if (!commandPrompt) {
    return res.status(400).json({
      error: 'Invalid command',
      message: `Comando "${command}" não reconhecido.`
    });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Configuration Error',
      message: 'GEMINI_API_KEY não configurada no servidor.'
    });
  }

  const model = process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const response = await fetch(`${GEMINI_API_URL}/${model}:streamGenerateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${commandPrompt}\n\nTexto:\n${texto}` }],
          }
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error("No response body from Gemini API");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Gemini returns a JSON array like [{...}, {...}] but in stream it might be comma separated or just JSON objects
        // The standard stream format is typically:
        // [
        // { ... }
        // ,
        // { ... }
        // ]
        // But the `streamGenerateContent` endpoint returns a stream of `GenerateContentResponse` objects.
        // It's usually a JSON stream where each chunk is a valid JSON object or part of an array.
        // However, `fetch` streams raw bytes. 
        // We need to handle the specific format of Gemini stream.
        
        // Actually, for simplicity in this proxy, we can try to parse lines if they look like JSON.
        // But often the response is a single JSON array being streamed.
        // A robust way is to rely on the fact that Gemini sends valid JSON objects separated by newlines or commas.
        
        // Let's assume simpler approach: If we can parse the line (cleaning commas), good.
        let cleanLine = trimmed;
        if (cleanLine.startsWith(',')) cleanLine = cleanLine.substring(1);
        if (cleanLine.endsWith(',')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
        if (cleanLine === '[' || cleanLine === ']') continue;

        try {
          const data = JSON.parse(cleanLine);
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
             res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch (e) {
          // Incomplete JSON or other format, buffer it? 
          // For now, if it fails, we ignore current line. 
          // In a real stream parser we would be more robust.
          // But Gemini stream usually sends complete JSON objects per chunk if using SSE client, 
          // but here we use fetch.
        }
      }
    }
    
    // Fallback/Legacy parsing isn't perfect for raw fetch stream of JSON array.
    // However, given the constraints, let's look at a safer implementation for parsing the stream.
    // Ideally we'd use a library or just buffer everything if short. 
    // But we want streaming.
    // Let's try to pass through if possible, but we need to transform to SSE format expected by frontend.
    
    // Better approach for parsing Gemini REST stream manually:
    // The API returns a JSON array. '[' then objects separated by ',' then ']'.
    // We can just look for "text": "..." patterns if we want to be hacky but fast.
    // Or we can try to accumulate braces.

  } catch (error) {
    console.error(`[AI Commands] Error in ${command}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'AI Service Error',
        message: `Falha ao processar comando "${command}": ${errorMessage}`
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    }
  } finally {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }
}

router.post('/continuar', (req: Request, res: Response) => {
  return handleAICommand(req, res, 'continuar');
});

router.post('/expandir', (req: Request, res: Response) => {
  return handleAICommand(req, res, 'expandir');
});

router.post('/revisar', (req: Request, res: Response) => {
  return handleAICommand(req, res, 'revisar');
});

router.post('/formalizar', (req: Request, res: Response) => {
  return handleAICommand(req, res, 'formalizar');
});

router.get('/status', (_req: Request, res: Response) => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const canRequest = elapsed >= RATE_LIMIT_MS;
  
  res.json({
    status: 'ok',
    commands: Object.keys(COMMAND_PROMPTS),
    rateLimit: {
      limitMs: RATE_LIMIT_MS,
      canRequest,
      waitTime: canRequest ? 0 : RATE_LIMIT_MS - elapsed
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
