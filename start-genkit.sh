#!/bin/bash
# Supervisor para manter Genkit + Proxy rodando

export GEMINI_API_KEY=AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
export GOOGLE_API_KEY=AIzaSyAqoXGdqPaWGvkW5mnl4DAiYETg8Ls8mNA
export GEMINI_MODEL=gemini-2.0-flash-exp

echo "🚀 Iniciando Genkit + Proxy..."
echo "✅ API Key configurada: ${GEMINI_API_KEY:0:20}..."
echo ""

# Limpar processos antigos
echo "🧹 Limpando processos antigos..."
lsof -ti :4000 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null
sleep 2

# Iniciar Genkit
echo "▶️  Iniciando Genkit com TODOS os flows do app..."
npm exec genkit -- start -- npx tsx --watch lib/ai/genkit-all-flows.ts > /tmp/genkit.log 2>&1 &
GENKIT_PID=$!

sleep 8

# Verificar se Genkit iniciou
if ! lsof -i :4000 >/dev/null 2>&1; then
  echo "❌ Genkit falhou ao iniciar. Veja: /tmp/genkit.log"
  exit 1
fi

echo "✅ Genkit rodando (PID: $GENKIT_PID)"

# Iniciar Proxy
echo "▶️  Iniciando Proxy na porta 5173..."
node genkit-proxy.cjs > /tmp/proxy.log 2>&1 &
PROXY_PID=$!

sleep 3

# Verificar se Proxy iniciou
if ! lsof -i :5173 >/dev/null 2>&1; then
  echo "❌ Proxy falhou ao iniciar. Veja: /tmp/proxy.log"
  kill $GENKIT_PID 2>/dev/null
  exit 1
fi

echo "✅ Proxy rodando (PID: $PROXY_PID)"
echo ""
echo "🎉 Sistema iniciado com sucesso!"
echo ""
echo "📊 Status:"
echo "  • Genkit: localhost:4000 (PID: $GENKIT_PID)"
echo "  • Proxy: 0.0.0.0:5173 (PID: $PROXY_PID)"
echo ""
echo "🌐 Acesse:"
echo "  https://5173-firebase-assisnte-juridico-1768313371073.cluster-hkcruqmgzbd2aqcdnktmz6k7ba.cloudworkstations.dev/"
echo ""
echo "📋 Logs:"
echo "  tail -f /tmp/genkit.log"
echo "  tail -f /tmp/proxy.log"
echo ""
echo "🛑 Para parar:"
echo "  kill $GENKIT_PID $PROXY_PID"
