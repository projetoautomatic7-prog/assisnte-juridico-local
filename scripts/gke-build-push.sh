#!/bin/bash
set -e

# Configurações
PROJECT_ID="${GCP_PROJECT_ID:-assistente-juridico}"
IMAGE_NAME="assistente-juridico"
IMAGE_TAG="${IMAGE_TAG:-latest}"
GCR_IMAGE="gcr.io/$PROJECT_ID/$IMAGE_NAME:$IMAGE_TAG"

echo "🐳 Build e Push da Imagem Docker para GCR..."
echo "Projeto: $PROJECT_ID"
echo "Imagem: $GCR_IMAGE"

# 1. Configurar Docker para GCR
echo "🔑 Configurando autenticação do Docker..."
gcloud auth configure-docker --quiet

# 2. Build da imagem
echo "🏗️ Building Docker image..."
docker build -t "$IMAGE_NAME:$IMAGE_TAG" .

# 3. Tag para GCR
echo "🏷️ Tagging image para GCR..."
docker tag "$IMAGE_NAME:$IMAGE_TAG" "$GCR_IMAGE"

# 4. Push para GCR
echo "📤 Pushing para Google Container Registry..."
docker push "$GCR_IMAGE"

# 5. Atualizar manifesto K8s com a imagem correta
echo "📝 Atualizando k8s/production-deployment.yaml..."
MANIFEST_FILE="k8s/production-deployment.yaml"

if [[ -f "$MANIFEST_FILE" ]]; then
    # Backup do manifesto original
    cp "$MANIFEST_FILE" "$MANIFEST_FILE.bak"
    
    # Substituir a imagem no manifesto
    sed -i.tmp "s|image:.*|image: $GCR_IMAGE|g" "$MANIFEST_FILE"
    rm -f "$MANIFEST_FILE.tmp"
    
    echo "✅ Manifesto atualizado com imagem: $GCR_IMAGE"
else
    echo "⚠️ Arquivo $MANIFEST_FILE não encontrado. Pule este passo se estiver usando manifestos personalizados."
fi

echo ""
echo "✅ Build e push concluídos!"
echo "Imagem disponível em: $GCR_IMAGE"
echo ""
echo "Próximo passo:"
echo "Execute: ./scripts/gke-deploy.sh"
