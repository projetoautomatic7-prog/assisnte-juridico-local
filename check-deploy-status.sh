#!/bin/bash

echo "🔍 CHECKLIST COMPLETO DO DEPLOY"
echo "================================"
echo ""

echo "1️⃣ Função agents deployada?"
curl -s "https://agents-tpicng6fpq-uc.a.run.app?action=status" | jq -r 'if .ok then "✅ Sim - " + .updatedAt else "❌ Não" end'
echo ""

echo "2️⃣ Hosting deployado?"
curl -sI "https://sonic-terminal-474321-s1.web.app" | grep -q "200 OK" && echo "✅ Sim" || echo "❌ Não"
echo ""

echo "3️⃣ Cloud Scheduler configurado?"
gcloud scheduler jobs describe agents-process-queue --location=southamerica-east1 --project=sonic-terminal-474321-s1 --format="value(state)" 2>/dev/null | grep -q "ENABLED" && echo "✅ Sim - ENABLED" || echo "❌ Não"
echo ""

echo "4️⃣ Firestore database existe?"
gcloud firestore databases describe --database="(default)" --project=sonic-terminal-474321-s1 --format="value(name)" 2>/dev/null | grep -q "default" && echo "✅ Sim" || echo "❌ Não"
echo ""

echo "5️⃣ Service account criada?"
gcloud iam service-accounts describe scheduler-agents@sonic-terminal-474321-s1.iam.gserviceaccount.com --project=sonic-terminal-474321-s1 --format="value(email)" 2>/dev/null | grep -q "@" && echo "✅ Sim" || echo "❌ Não"
echo ""

echo "6️⃣ Permissões IAM configuradas?"
gcloud projects get-iam-policy sonic-terminal-474321-s1 --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:scheduler-agents@sonic-terminal-474321-s1.iam.gserviceaccount.com AND bindings.role:roles/cloudfunctions.invoker" 2>/dev/null | grep -q "cloudfunctions.invoker" && echo "✅ Sim" || echo "❌ Não"
echo ""

echo "7️⃣ Frontend buildado?"
test -f "dist/index.html" && echo "✅ Sim" || echo "❌ Não"
echo ""

echo "8️⃣ Variáveis de ambiente configuradas?"
test -f ".env" && echo "✅ .env existe" || echo "⚠️  .env não encontrado"
grep -q "VITE_AGENTS_API_URL" .env 2>/dev/null && echo "✅ VITE_AGENTS_API_URL configurada" || echo "⚠️  VITE_AGENTS_API_URL não configurada"
echo ""

echo "================================"
echo "📋 RESUMO DOS RECURSOS"
echo "================================"
echo ""
echo "🔗 URLs:"
echo "   Web App: https://sonic-terminal-474321-s1.web.app"
echo "   Função agents: https://agents-tpicng6fpq-uc.a.run.app"
echo ""
echo "⏰ Cloud Scheduler jobs:"
gcloud scheduler jobs list --location=southamerica-east1 --project=sonic-terminal-474321-s1 --format="table(ID,SCHEDULE,STATE)" 2>/dev/null
echo ""
