#!/bin/bash
set -e

# Configurações (customize aqui)
PROJECT_ID="${GCP_PROJECT_ID:-assistente-juridico}"
CLUSTER_NAME="${GKE_CLUSTER_NAME:-assistente-cluster}"
REGION="${GKE_REGION:-us-central1}"
ZONE="${GKE_ZONE:-us-central1-a}"
MACHINE_TYPE="${GKE_MACHINE_TYPE:-e2-medium}"
NUM_NODES="${GKE_NUM_NODES:-3}"

echo "🚀 Configurando Google Kubernetes Engine..."
echo "Projeto: $PROJECT_ID"
echo "Cluster: $CLUSTER_NAME"
echo "Região: $REGION"

# 1. Configurar projeto
echo "📋 Configurando projeto GCP..."
gcloud config set project "$PROJECT_ID"

# 2. Habilitar APIs necessárias
echo "🔌 Habilitando APIs..."
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com

# 3. Criar cluster GKE
echo "⚙️ Criando cluster GKE (isso pode levar ~5 minutos)..."
if gcloud container clusters describe "$CLUSTER_NAME" --zone="$ZONE" &>/dev/null; then
    echo "✅ Cluster $CLUSTER_NAME já existe. Pulando criação."
else
    gcloud container clusters create "$CLUSTER_NAME" \
        --zone="$ZONE" \
        --num-nodes="$NUM_NODES" \
        --machine-type="$MACHINE_TYPE" \
        --enable-autoscaling \
        --min-nodes=1 \
        --max-nodes=5 \
        --enable-autorepair \
        --enable-autoupgrade \
        --addons=HorizontalPodAutoscaling,HttpLoadBalancing \
        --workload-pool="$PROJECT_ID.svc.id.goog"
    
    echo "✅ Cluster criado com sucesso!"
fi

# 4. Obter credenciais kubectl
echo "🔑 Configurando kubectl..."
gcloud container clusters get-credentials "$CLUSTER_NAME" --zone="$ZONE"

# 5. Verificar conexão
echo "✅ Verificando cluster..."
kubectl cluster-info
kubectl get nodes

echo ""
echo "🎉 Setup do cluster concluído!"
echo "Próximos passos:"
echo "1. Execute: ./scripts/gke-build-push.sh (build e push da imagem)"
echo "2. Execute: ./scripts/gke-deploy.sh (deploy da aplicação)"
