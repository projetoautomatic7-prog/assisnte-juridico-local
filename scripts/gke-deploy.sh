#!/bin/bash
set -e

# Configurações
NAMESPACE="production"
SECRET_NAME="assistente-juridico-secrets"

echo "🚀 Deploy para GKE..."

# 1. Criar namespace (se não existir)
echo "📁 Criando namespace '$NAMESPACE'..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# 2. Criar secrets a partir de variáveis de ambiente
echo "🔐 Criando secrets..."

# Verificar variáveis obrigatórias
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ Erro: DATABASE_URL não definida."
    echo "Configure: export DATABASE_URL='postgresql://...'"
    exit 1
fi

# Criar secret
kubectl create secret generic "$SECRET_NAME" \
    --from-literal=database-url="$DATABASE_URL" \
    --from-literal=google-client-id="${VITE_GOOGLE_CLIENT_ID:-placeholder}" \
    --from-literal=google-api-key="${VITE_GOOGLE_API_KEY:-placeholder}" \
    --from-literal=todoist-api-key="${TODOIST_API_TOKEN:-placeholder}" \
    --from-literal=app-env="${VITE_APP_ENV:-production}" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secrets criados/atualizados."

# 3. Aplicar manifestos Kubernetes
echo "📦 Aplicando manifestos K8s..."

# Aplicar namespace e políticas de rede
if [[ -f "k8s/production/namespace.yaml" ]]; then
    kubectl apply -f k8s/production/namespace.yaml
fi

if [[ -f "k8s/production/network-policy.yaml" ]]; then
    kubectl apply -f k8s/production/network-policy.yaml
fi

if [[ -f "k8s/production/rbac.yaml" ]]; then
    kubectl apply -f k8s/production/rbac.yaml
fi

# Aplicar deployment principal
kubectl apply -f k8s/production-deployment.yaml

echo "✅ Manifestos aplicados."

# 4. Aguardar pods ficarem prontos
echo "⏳ Aguardando pods iniciarem..."
kubectl rollout status deployment/assistente-juridico -n "$NAMESPACE" --timeout=5m

# 5. Verificar status
echo ""
echo "📊 Status do deploy:"
kubectl get all -n "$NAMESPACE"

# 6. Obter IP externo do LoadBalancer (se existir)
echo ""
echo "🌐 Obtendo IP do LoadBalancer..."
EXTERNAL_IP=$(kubectl get service assistente-juridico -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pendente...")

if [[ "$EXTERNAL_IP" == "Pendente..." ]]; then
    echo "⏳ LoadBalancer ainda não tem IP externo. Execute novamente em 1-2 minutos:"
    echo "kubectl get service assistente-juridico -n $NAMESPACE"
else
    echo "✅ Aplicação disponível em: http://$EXTERNAL_IP"
fi

echo ""
echo "🎉 Deploy concluído!"
echo ""
echo "Comandos úteis:"
echo "- Ver logs: kubectl logs -f deployment/assistente-juridico -n $NAMESPACE"
echo "- Ver pods: kubectl get pods -n $NAMESPACE"
echo "- Escalar: kubectl scale deployment/assistente-juridico --replicas=5 -n $NAMESPACE"
