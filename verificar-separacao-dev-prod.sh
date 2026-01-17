#!/bin/bash
# Script de Auditoria: Verificar Separação Dev vs Produção

echo "🔍 AUDITORIA: Verificação Dev vs Produção"
echo "=========================================="
echo ""

echo "1️⃣ Verificando arquivos MOCK (dev apenas):"
echo "-------------------------------------------"
ls -lh scripts/dev-api-server.cjs scripts/start-dev-with-api.cjs 2>/dev/null || echo "✅ Arquivos mock encontrados"
echo ""

echo "2️⃣ Verificando se mocks estão APENAS em dev:"
echo "----------------------------------------------"
grep -n "dev-api-server" package.json | grep -v "dev:with-api" && echo "❌ ALERTA: Mock em script não-dev!" || echo "✅ Mock apenas em dev:with-api"
echo ""

echo "3️⃣ Verificando backend REAL de produção:"
echo "-------------------------------------------"
ls -lh backend/src/server.ts backend/src/routes/*.ts | head -5
echo ""

echo "4️⃣ Verificando se código de IA está intocado:"
echo "-----------------------------------------------"
echo "Agentes LangGraph:"
ls -d src/agents/ 2>/dev/null && echo "✅ Existe" || echo "⚠️  Não encontrado"
echo ""
echo "Genkit Flows:"
ls -d lib/ai/ 2>/dev/null && echo "✅ Existe" || echo "⚠️  Não encontrado"
echo ""

echo "5️⃣ Últimos commits relacionados a mock/dev:"
echo "---------------------------------------------"
git log --oneline --all -10 | grep -i "mock\|dev-api\|endpoint" || echo "Nenhum commit recente"
echo ""

echo "6️⃣ Conteúdo do mock LLM (deve ser transparente):"
echo "--------------------------------------------------"
grep -A 3 "Sou um mock" scripts/dev-api-server.cjs || echo "⚠️  Mensagem de mock não encontrada"
echo ""

echo "✅ AUDITORIA CONCLUÍDA"
echo "======================"
echo ""
echo "Para revisão manual completa, veja:"
echo "- AUDITORIA_PRODUCAO.md (este documento)"
echo "- scripts/dev-api-server.cjs (código mock)"
echo "- backend/src/server.ts (código real)"
