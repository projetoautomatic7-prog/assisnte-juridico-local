#!/usr/bin/env node
// Proxy Híbrido SEM dependências externas

const http = require("http");
const PORT = 3001;

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // IA endpoints → Proxy para backend REAL (porta 3002)
  if (url.includes("/llm-stream") || url.includes("/llm-proxy") || url.includes("/ai-commands")) {
    console.log(`[Proxy] IA → Backend REAL: ${url}`);
    const options = {
      hostname: "localhost",
      port: 3002,
      path: url,
      method: req.method,
      headers: req.headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on("error", (e) => {
      console.error(`[Proxy] Erro ao conectar backend: ${e.message}`);
      res.writeHead(502);
      res.end("Backend IA não disponível");
    });
    
    req.pipe(proxyReq);
    return;
  }
  
  // Dados endpoints → Mock
  console.log(`[Proxy] Dados → Mock: ${url}`);
  
  if (url.startsWith("/api/expedientes")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      success: true,
      expedientes: [],
      message: "Mock - PostgreSQL não conectado"
    }));
    return;
  }
  
  if (url.startsWith("/api/kv")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      success: true, 
      data: [],
      message: "Mock - KV não configurado"
    }));
    return;
  }
  
  if (url.startsWith("/api/djen/publicacoes")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      success: true, 
      publicacoes: [],
      message: "Mock - API DJEN bloqueada geograficamente"
    }));
    return;
  }
  
  if (url.startsWith("/api/lawyers")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      success: true,
      lawyers: [],
      message: "Mock - PostgreSQL não conectado"
    }));
    return;
  }
  
  // Default: Proxy para backend real
  const options = {
    hostname: "localhost",
    port: 3002,
    path: url,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on("error", (e) => {
    console.error(`[Proxy] Erro: ${e.message}`);
    res.writeHead(502);
    res.end("Backend não disponível");
  });
  
  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`🔀 Proxy Híbrido rodando na porta ${PORT}`);
  console.log(`   IA → Backend REAL (3002)`);
  console.log(`   Dados → Mock`);
});
