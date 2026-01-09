# Kubernetes Configuration - Assistente Jurídico PJe

Este diretório contém todos os manifestos Kubernetes para deploy do Assistente Jurídico PJe em múltiplos ambientes.

## 📁 Estrutura

```
k8s/
├── README.md                    # Este arquivo
├── deployment.yaml              # Deployment principal (3 réplicas)
├── ingress.yaml                 # NGINX Ingress Controller
├── configmap.yaml               # Configurações da aplicação
├── hpa.yaml                     # Horizontal Pod Autoscaler (2-10 pods)
├── pdb.yaml                     # Pod Disruption Budget
├── service-monitor.yaml         # Prometheus ServiceMonitor
├── kustomization.yaml           # Kustomize para multi-env
├── production-deployment.yaml   # Configuração específica de produção
├── staging-deployment.yaml      # Configuração específica de staging
├── dev/
│   ├── namespace.yaml          # Namespace: desenvolvimento
│   ├── rbac.yaml              # RBAC para dev
│   └── network-policy.yaml    # Network policy dev
├── qa/
│   ├── namespace.yaml          # Namespace: qa
│   ├── rbac.yaml              # RBAC para QA
│   └── network-policy.yaml    # Network policy QA
├── production/
│   ├── namespace.yaml          # Namespace: production
│   ├── rbac.yaml              # RBAC para produção
│   └── network-policy.yaml    # Network policy produção
└── shared/
    ├── configmaps.yaml         # ConfigMaps compartilhados
    └── rbac-security.yaml      # RBAC security policies
```

## 🚀 Quick Start

### Opção 1: Script Automatizado (Recomendado)

```bash
# Deploy desenvolvimento
../deploy-k8s.sh dev -v

# Deploy produção
../deploy-k8s.sh production -v

# Deploy todos os ambientes
../deploy-k8s.sh all
```

### Opção 2: kubectl direto

```bash
# Criar namespace
kubectl create namespace desenvolvimento

# Criar secrets
kubectl create secret generic assistente-juridico-secrets \
  --namespace=desenvolvimento \
  --from-literal=app-env=development \
  --from-literal=google-client-id=$GOOGLE_CLIENT_ID \
  --from-literal=google-api-key=$GOOGLE_API_KEY \
  --from-literal=todoist-api-key=$TODOIST_API_KEY

# Aplicar manifestos
kubectl apply -f configmap.yaml -n desenvolvimento
kubectl apply -f deployment.yaml -n desenvolvimento
kubectl apply -f ingress.yaml -n desenvolvimento
kubectl apply -f hpa.yaml -n desenvolvimento
kubectl apply -f pdb.yaml -n desenvolvimento
```

### Opção 3: Kustomize

```bash
# Dev
kubectl apply -k dev/

# QA
kubectl apply -k qa/

# Production
kubectl apply -k production/
```

### Opção 4: Skaffold (Desenvolvimento)

```bash
# Hot-reload mode
skaffold dev

# Single deploy
skaffold run --port-forward
```

## 📊 Recursos Implementados

### ✅ Alta Disponibilidade
- **Min replicas:** 2 pods
- **Max replicas:** 10 pods (HPA)
- **Pod Disruption Budget:** min 1 pod sempre disponível
- **Health checks:** liveness + readiness

### ✅ Autoscaling
- **Trigger:** CPU >70% ou Memory >80%
- **Scale up:** Rápido (100% em 15s)
- **Scale down:** Gradual (5min estabilização)

### ✅ Segurança
- **Network Policies:** Isolamento entre namespaces
- **RBAC:** Least privilege por ambiente
- **Secrets:** Gerenciados via Kubernetes Secrets
- **Resource Limits:** CPU e Memory definidos

### ✅ Monitoring
- **Prometheus:** ServiceMonitor configurado
- **Metrics:** Endpoint `/metrics` na porta 9090
- **Scrape interval:** 30 segundos

## 🎯 Arquivos Principais

### deployment.yaml
Deployment principal com:
- 3 réplicas
- Health checks (liveness/readiness)
- Resource requests/limits
- Secrets montados como env vars

### ingress.yaml
NGINX Ingress com:
- CORS habilitado
- WebSocket support
- Wildcard para Review Apps
- Preparado para TLS/HTTPS

### hpa.yaml
Horizontal Pod Autoscaler:
- Min: 2 pods, Max: 10 pods
- CPU target: 70%
- Memory target: 80%

### pdb.yaml
Pod Disruption Budget:
- Min available: 1 pod
- Garante zero downtime

### configmap.yaml
Configurações da aplicação:
- NODE_ENV, PORT, LOG_LEVEL
- Feature flags
- Rate limiting
- CORS settings

## 🔍 Comandos Úteis

```bash
# Ver pods
kubectl get pods -n desenvolvimento -l app=assistente-juridico

# Ver logs
kubectl logs -n desenvolvimento -l app=assistente-juridico -f

# Ver métricas
kubectl top pods -n desenvolvimento

# Status HPA
kubectl get hpa -n desenvolvimento

# Port-forward
kubectl port-forward -n desenvolvimento service/assistente-juridico-service 8080:80

# Health check
curl http://localhost:8080/health
```

Ver mais comandos em: `../k8s-commands-reference.sh`

## 🌐 Ambientes

### Desenvolvimento
- **Namespace:** `desenvolvimento`
- **URL:** `dev.assistente-juridico.com`
- **Replicas:** 2-5 pods

### QA
- **Namespace:** `qa`
- **URL:** `qa.assistente-juridico.com`
- **Replicas:** 2-5 pods

### Produção
- **Namespace:** `production`
- **URL:** `assistente-juridico.com`
- **Replicas:** 3-10 pods

### Review Apps (GitLab)
- **Namespace:** `review-{branch-name}`
- **URL:** `review-{branch}.assistente-juridico.com`
- **Replicas:** 1-2 pods

## 📋 Pré-requisitos

### Ferramentas
- [x] kubectl v1.35+
- [x] Acesso ao cluster GKE
- [ ] Skaffold (opcional, para dev)
- [ ] Kustomize (opcional, embutido no kubectl)

### Secrets Necessários
```bash
export APP_ENV="production"
export GOOGLE_CLIENT_ID="seu-client-id"
export GOOGLE_API_KEY="sua-api-key"
export TODOIST_API_KEY="sua-api-key"
```

## 🔧 Troubleshooting

### Pods em CrashLoopBackOff
```bash
kubectl logs -n desenvolvimento <pod-name> --previous
kubectl describe pod -n desenvolvimento <pod-name>
```

### Ingress não funciona
```bash
kubectl get ingress -n desenvolvimento
kubectl describe ingress assistente-juridico-ingress -n desenvolvimento
```

### HPA não escala
```bash
kubectl get hpa -n desenvolvimento
kubectl describe hpa assistente-juridico-hpa -n desenvolvimento
kubectl top pods -n desenvolvimento
```

### Secrets não carregam
```bash
kubectl get secrets -n desenvolvimento
kubectl describe secret assistente-juridico-secrets -n desenvolvimento
```

## 📚 Documentação

- **Implementação completa:** `../K8S_IMPLEMENTACAO_FINAL.md`
- **Setup status:** `../K8S_SETUP_STATUS.md`
- **Quick start:** `../K8S_QUICKSTART.md`
- **Comandos:** `../k8s-commands-reference.sh`

## 🤝 GitLab CI/CD

Este projeto tem integração com GitLab Auto DevOps:
- Build Docker automático
- Deploy para dev/qa/production
- Review Apps automáticos para MRs
- Cleanup de ambientes temporários

Ver: `../.gitlab-ci.yml`

## 🎓 Próximos Passos

1. ✅ Conectar ao cluster GKE
2. ✅ Configurar secrets
3. ✅ Fazer primeiro deploy
4. ⏳ Configurar DNS
5. ⏳ Habilitar HTTPS (cert-manager)
6. ⏳ Configurar Prometheus/Grafana

---

**Última atualização:** 08 de Janeiro de 2026  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para produção
