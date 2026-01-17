#!/bin/bash
# Script para testar endpoints do backend

BASE_URL="https://assistente-juridico-backend-tpicng6fpq-rj.a.run.app"

echo "🧪 Testando Endpoints do Backend"
echo "================================="
echo ""

# Teste 1: Health check
echo "1️⃣ Testing /health..."
HEALTH=$(curl -s -w "\n%{http_code}" "$BASE_URL/health" 2>&1)
HTTP_CODE=$(echo "$HEALTH" | tail -1)
BODY=$(echo "$HEALTH" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
else
  echo "   ❌ STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
fi

echo ""

# Teste 2: DJEN Status
echo "2️⃣ Testing /api/djen/status..."
DJEN=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/djen/status" 2>&1)
HTTP_CODE=$(echo "$DJEN" | tail -1)
BODY=$(echo "$DJEN" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
else
  echo "   ⚠️  STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
fi

echo ""

# Teste 3: Spark Status
echo "3️⃣ Testing /api/spark/status..."
SPARK=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/spark/status" 2>&1)
HTTP_CODE=$(echo "$SPARK" | tail -1)
BODY=$(echo "$SPARK" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
else
  echo "   ⚠️  STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
fi

echo ""

# Teste 4: Observability
echo "4️⃣ Testing /api/observability..."
OBS=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/observability" 2>&1)
HTTP_CODE=$(echo "$OBS" | tail -1)
BODY=$(echo "$OBS" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
else
  echo "   ⚠️  STATUS: $HTTP_CODE"
  echo "   RESPONSE: $BODY"
fi

echo ""

# Teste 5: Frontend
echo "5️⃣ Testing Frontend (Firebase)..."
FRONT=$(curl -s -I https://sonic-terminal-474321-s1.web.app 2>&1 | grep HTTP)
echo "   $FRONT"

echo ""
echo "================================="
echo "✅ Testes concluídos!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Se /health retornou 200 → Backend OK ✅"
echo "   2. Se outros endpoints falharam → Pode ser normal (requer auth/config)"
echo "   3. Execute: ./fix-database-config.sh (SE usar /api/expedientes ou /api/minutas)"
echo "   4. Execute: ./fix-secrets-manager.sh (Opcional - boa prática de segurança)"
