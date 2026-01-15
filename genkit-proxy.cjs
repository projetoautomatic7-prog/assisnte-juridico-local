#!/usr/bin/env node
/**
 * Proxy reverso para expor Genkit UI externamente
 * Escuta em 0.0.0.0:5173 e redireciona para localhost:4000
 */

const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:4000',
  ws: true,
  changeOrigin: true
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(5173, '0.0.0.0', () => {
  console.log('✅ Genkit Proxy rodando em http://0.0.0.0:5173');
  console.log('🔗 Redirecionando para http://localhost:4000');
  console.log('🌐 Acesse via Cloud Workstation na porta 5173');
});

proxy.on('error', (err) => {
  console.error('Proxy error:', err);
});
