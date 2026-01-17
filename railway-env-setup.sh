#!/bin/bash
# Script para configurar variáveis de ambiente no Railway
# Execute: chmod +x railway-env-setup.sh && ./railway-env-setup.sh

set -e

echo "🚂 Configurando variáveis de ambiente no Railway..."
echo ""
echo "⚠️  IMPORTANTE: Você precisa ter o Railway CLI instalado e autenticado"
echo "    - Instalar: npm i -g @railway/cli"
echo "    - Login: railway login"
echo ""

# Verificar se railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI não encontrado!"
    echo "   Instale com: npm i -g @railway/cli"
    exit 1
fi

# Verificar autenticação
if ! railway status &> /dev/null; then
    echo "❌ Você não está autenticado no Railway!"
    echo "   Execute: railway login"
    exit 1
fi

echo "✅ Railway CLI encontrado e autenticado!"
echo ""

# ============================================
# 1. VARIÁVEIS ESSENCIAIS (OBRIGATÓRIAS)
# ============================================

echo "📋 CONFIGURANDO VARIÁVEIS ESSENCIAIS..."

# Node.js
railway variables set NODE_ENV=production
echo "✅ NODE_ENV=production"

railway variables set PORT=3001
echo "✅ PORT=3001"

# ============================================
# 2. DATABASE (PostgreSQL - Neon/Railway)
# ============================================

echo ""
echo "🗄️  CONFIGURANDO DATABASE..."
read -p "Digite sua DATABASE_URL (PostgreSQL): " DATABASE_URL
railway variables set DATABASE_URL="$DATABASE_URL"
echo "✅ DATABASE_URL configurada"

# ============================================
# 3. GEMINI API (Google AI)
# ============================================

echo ""
echo "🤖 CONFIGURANDO GEMINI API..."
read -p "Digite sua GEMINI_API_KEY (ou pressione Enter para pular): " GEMINI_KEY
if [ ! -z "$GEMINI_KEY" ]; then
    railway variables set VITE_GEMINI_API_KEY="$GEMINI_KEY"
    railway variables set GEMINI_API_KEY="$GEMINI_KEY"
    echo "✅ GEMINI_API_KEY configurada"
else
    echo "⏭️  Pulado"
fi

# ============================================
# 4. UPSTASH REDIS (Key-Value Store)
# ============================================

echo ""
echo "📦 CONFIGURANDO UPSTASH REDIS..."
read -p "Digite sua UPSTASH_REDIS_REST_URL (ou pressione Enter para pular): " REDIS_URL
if [ ! -z "$REDIS_URL" ]; then
    railway variables set UPSTASH_REDIS_REST_URL="$REDIS_URL"
    read -p "Digite o UPSTASH_REDIS_REST_TOKEN: " REDIS_TOKEN
    railway variables set UPSTASH_REDIS_REST_TOKEN="$REDIS_TOKEN"
    echo "✅ Upstash Redis configurado"
else
    echo "⏭️  Pulado"
fi

# ============================================
# 5. DATADOG APM (Monitoring)
# ============================================

echo ""
echo "📊 CONFIGURANDO DATADOG APM..."
read -p "Digite sua DD_API_KEY (ou pressione Enter para pular): " DD_KEY
if [ ! -z "$DD_KEY" ]; then
    railway variables set DD_API_KEY="$DD_KEY"
    railway variables set DD_SERVICE="assistente-juridico-api"
    railway variables set DD_ENV="production"
    railway variables set DD_SITE="datadoghq.com"
    railway variables set DD_TRACE_ENABLED="true"
    railway variables set DD_LOGS_INJECTION="true"
    railway variables set DD_PROFILING_ENABLED="false"
    echo "✅ Datadog APM configurado"
else
    echo "⏭️  Pulado"
fi

# ============================================
# 7. SENTRY (Error Tracking)
# ============================================

echo ""
echo "🐛 CONFIGURANDO SENTRY..."
read -p "Digite seu VITE_SENTRY_DSN (ou pressione Enter para pular): " SENTRY_DSN
if [ ! -z "$SENTRY_DSN" ]; then
    railway variables set VITE_SENTRY_DSN="$SENTRY_DSN"
    railway variables set VITE_APP_VERSION="1.0.0"
    railway variables set VITE_ENABLE_PII_FILTERING="true"
    echo "✅ Sentry configurado"
else
    echo "⏭️  Pulado"
fi

# ============================================
# 8. RATE LIMITING (Opcional)
# ============================================

echo ""
echo "🛡️  CONFIGURANDO RATE LIMITING..."
railway variables set RATE_LIMIT_ENABLED="true"
railway variables set RATE_LIMIT_MAX_REQUESTS="100"
railway variables set AI_RATE_LIMIT_MAX_REQUESTS="30"
railway variables set RATE_LIMIT_WINDOW_MS="900000"
echo "✅ Rate Limiting configurado (100 req/15min API, 30 req/15min IA)"

# ============================================
# 9. DJEN SCHEDULER (Opcional)
# ============================================

echo ""
echo "⏰ CONFIGURANDO DJEN SCHEDULER..."
read -p "Habilitar scheduler DJEN? (s/N): " ENABLE_DJEN
if [ "$ENABLE_DJEN" = "s" ] || [ "$ENABLE_DJEN" = "S" ]; then
    railway variables set DJEN_SCHEDULER_ENABLED="true"
    read -p "Digite o número da OAB: " OAB_NUM
    railway variables set DJEN_OAB_NUMERO="$OAB_NUM"
    read -p "Digite a UF da OAB: " OAB_UF
    railway variables set DJEN_OAB_UF="$OAB_UF"
    read -p "Digite o nome do advogado: " ADV_NOME
    railway variables set DJEN_ADVOGADO_NOME="$ADV_NOME"
    railway variables set TZ="America/Sao_Paulo"
    echo "✅ DJEN Scheduler habilitado"
else
    railway variables set DJEN_SCHEDULER_ENABLED="false"
    echo "⏭️  DJEN Scheduler desabilitado"
fi

# ============================================
# 10. FRONTEND URL
# ============================================

echo ""
echo "🌐 CONFIGURANDO FRONTEND URL..."
read -p "Digite a URL do frontend (ex: https://seu-app.vercel.app): " FRONTEND_URL
if [ ! -z "$FRONTEND_URL" ]; then
    railway variables set FRONTEND_URL="$FRONTEND_URL"
    echo "✅ FRONTEND_URL configurada"
else
    railway variables set FRONTEND_URL="http://localhost:5173"
    echo "✅ FRONTEND_URL configurada (localhost)"
fi

# ============================================
# RESUMO
# ============================================

echo ""
echo "═══════════════════════════════════════════"
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo "═══════════════════════════════════════════"
echo ""
echo "📋 Variáveis configuradas:"
railway variables
echo ""
echo "🚀 Para redeployar com as novas variáveis:"
echo "   railway up --detach"
echo ""
echo "📊 Para ver logs em tempo real:"
echo "   railway logs -f"
echo ""
echo "🌐 Para abrir o app no navegador:"
echo "   railway open"
echo ""
