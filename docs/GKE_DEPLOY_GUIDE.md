# 🚀 Guia de Deploy no Google Kubernetes Engine (GKE)

## Pré-requisitos

1. **Conta Google Cloud** com billing habilitado
2. **gcloud CLI** instalado: https://cloud.google.com/sdk/docs/install
3. **kubectl** instalado: `gcloud components install kubectl`
4. **Docker Desktop** rodando (para build local)

## Passo 1: Configuração Inicial do GCP

```bash
# 1. Login no GCP
gcloud auth login

export GCP_PROJECT_ID="sonic-terminal-474321-s1"
gcloud projects create $GCP_PROJECT_ID --name="Assistente Jurídico"

# 3. Habilitar billing (via console: https://console.cloud.google.com/billing)

# 4. Configurar projeto padrão
gcloud config set project $GCP_PROJECT_ID
```

## Passo 2: Configurar Variáveis de Ambiente

Crie um arquivo `.env.gke` (não commitar!):

```bash
# Obrigatórias
export GCP_PROJECT_ID="sonic-terminal-474321-s1"
export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Opcionais (substituir placeholders se usar)
export VITE_GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
export VITE_GOOGLE_API_KEY="AIza..."
export TODOIST_API_TOKEN="..."
export VITE_APP_ENV="production"
```

Carregar variáveis:
```bash
source .env.gke
```

## Passo 3: Criar Cluster GKE

```bash
chmod +x scripts/gke-*.sh
./scripts/gke-setup-cluster.sh
```

**Tempo:** ~5 minutos  
**Custo:** ~$75/mês (3 nós e2-medium)

## Passo 4: Build e Push da Imagem

```bash
./scripts/gke-build-push.sh
```

Isso vai:
1. Build da imagem Docker localmente
2. Fazer push para Google Container Registry (gcr.io)
3. Atualizar manifesto K8s com a imagem correta

## Passo 5: Deploy da Aplicação

```bash
./scripts/gke-deploy.sh
```

Isso vai:
1. Criar secrets no K8s a partir das env vars
2. Aplicar manifestos (deployment, service, network policies)
3. Aguardar pods ficarem prontos
4. Exibir IP externo do LoadBalancer

## Passo 6: Acessar Aplicação

Após ~2 minutos, obter IP externo:

```bash
kubectl get service assistente-juridico -n production
```

Acesse: `http://<EXTERNAL-IP>`

## Comandos Úteis

### Ver logs em tempo real
```bash
kubectl logs -f deployment/assistente-juridico -n production
```

### Ver pods
```bash
kubectl get pods -n production
```

### Escalar aplicação
```bash
kubectl scale deployment/assistente-juridico --replicas=5 -n production
```

### Update da aplicação (após mudanças no código)
```bash
# Rebuild e push
./scripts/gke-build-push.sh

# Forçar rolling update
kubectl rollout restart deployment/assistente-juridico -n production
```

### Deletar tudo (cuidado!)
```bash
kubectl delete namespace production
gcloud container clusters delete assistente-cluster --zone=us-central1-a
```

## Troubleshooting

### Pods em CrashLoopBackOff
```bash
# Ver logs do pod
kubectl logs <pod-name> -n production

# Verificar secrets
kubectl get secrets -n production
kubectl describe secret assistente-juridico-secrets -n production
```

### LoadBalancer sem IP externo
Aguarde 2-5 minutos. Se persistir:
```bash
kubectl describe service assistente-juridico -n production
```

### Conexão com banco falha
Verifique se `DATABASE_URL` no secret está correta:
```bash
kubectl get secret assistente-juridico-secrets -n production -o jsonpath='{.data.database-url}' | base64 -d
```

## Custos Estimados (GCP)

- **Cluster GKE** (3x e2-medium): ~$60/mês
- **LoadBalancer**: ~$15/mês
- **Tráfego de rede**: Variável
- **Container Registry**: ~$0.10/GB

**Total:** ~$75-100/mês

### Reduzir custos
- Use cluster menor: `--num-nodes=1 --machine-type=e2-small`
- Use Cloud Run (serverless) em vez de GKE
- Use Autopilot GKE (paga apenas pods)
