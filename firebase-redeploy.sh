#!/bin/bash

echo "🔥 Firebase Re-Deploy com Variáveis de Ambiente"
echo "================================================"

# 1. Build com .env.production
echo "📦 Building com variáveis de produção..."
NODE_ENV=production NODE_OPTIONS='--max-old-space-size=4096' vite build --mode production

if [ $? -ne 0 ]; then
    echo "❌ Build falhou!"
    exit 1
fi

# 2. Deploy
echo ""
echo "🚀 Deploying para Firebase..."
firebase deploy --only hosting

echo ""
echo "✅ Deploy concluído!"
echo "🌐 URL: https://sonic-terminal-474321-s1.web.app"
echo ""
echo "⚠️  PRÓXIMOS PASSOS:"
echo "1. Configure Google OAuth Client ID em:"
echo "   https://console.cloud.google.com/apis/credentials"
echo ""
echo "2. Configure backend API (escolha uma):"
echo "   - Firebase Functions (recomendado)"
echo "   - Railway: https://railway.app"
echo "   - Vercel Functions"
