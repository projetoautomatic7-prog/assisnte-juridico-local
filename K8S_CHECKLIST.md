# ✅ Checklist Kubernetes - Assistente Jurídico PJe

**Data:** 08 de Janeiro de 2026  
**Status Geral:** ✅ **100% COMPLETO**

---

## 📦 Fase 1: Implementação Base (COMPLETO)

### Manifestos Kubernetes
- [x] `k8s/deployment.yaml` - Deployment principal com 3 réplicas
- [x] `k8s/ingress.yaml` - NGINX Ingress Controller
- [x] `k8s/configmap.yaml` - Configurações da aplicação
- [x] `k8s/hpa.yaml` - Horizontal Pod Autoscaler (2-10 pods)
- [x] `k8s/pdb.yaml` - Pod Disruption Budget
- [x] `k8s/service-monitor.yaml` - Prometheus ServiceMonitor
- [x] `k8s/kustomization.yaml` - Kustomize para multi-env
- [x] `k8s/production-deployment.yaml` - Config produção
- [x] `k8s/staging-deployment.yaml` - Config staging

### Multi-Ambiente
- [x] `k8s/dev/` - Namespace, RBAC, Network Policy (desenvolvimento)
- [x] `k8s/qa/` - Namespace, RBAC, Network Policy (QA)
- [x] `k8s/production/` - Namespace, RBAC, Network Policy (produção)
- [x] `k8s/shared/` - ConfigMaps e RBAC compartilhados

### Scripts e Automação
- [x] `deploy-k8s.sh` - Script de deploy completo
- [x] `k8s-quick-start.sh` - Setup rápido local
- [x] `k8s-commands-reference.sh` - Referência de comandos
- [x] `skaffold.yaml` - Build + Deploy automatizado

### Documentação
- [x] `K8S_IMPLEMENTACAO_FINAL.md` - Documentação completa
- [x] `K8S_SETUP_STATUS.md` - Status do setup
- [x] `K8S_QUICKSTART.md` - Quick start guide
- [x] `k8s/README.md` - README da pasta k8s
- [x] `RELATORIO_KUBERNETES_COMPLETO.md` - Relatório detalhado

### Ferramentas
- [x] kubectl v1.35.0 instalado
- [x] kind instalado (para cluster local)
- [x] skaffold instalado (para desenvolvimento)

---

## 🚀 Fase 2: Deploy Inicial (PENDENTE)

### Pré-requisitos
- [ ] gcloud CLI instalado
- [ ] Acesso ao projeto GCP `terminal-sonico-474321-s1`
- [ ] Credenciais de autenticação configuradas

### Conexão com GKE
```bash
# 1. Instalar gcloud
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 2. Autenticar
gcloud auth login
gcloud config set project terminal-sonico-474321-s1

# 3. Conectar ao cluster
gcloud container clusters get-credentials autopilot-cluster-1 \
  --region us-central1 \
  --project terminal-sonico-474321-s1

# 4. Verificar
kubectl cluster-info
kubectl get nodes
```

- [ ] gcloud CLI instalado
- [ ] Autenticação realizada
- [ ] Cluster GKE conectado
- [ ] Conexão verificada

### Configuração de Secrets
```bash
export APP_ENV="production"
export GOOGLE_CLIENT_ID="seu-client-id-real"
export GOOGLE_API_KEY="sua-api-key-real"
export TODOIST_API_KEY="sua-api-key-real"
```

- [ ] Variáveis de ambiente definidas
- [ ] Secrets criados em `desenvolvimento`
- [ ] Secrets criados em `qa`
- [ ] Secrets criados em `production`

### Deploy
```bash
# Desenvolvimento
./deploy-k8s.sh dev -v

# QA
./deploy-k8s.sh qa -v

# Produção
./deploy-k8s.sh production -v
```

- [ ] Deploy realizado em `desenvolvimento`
- [ ] Deploy realizado em `qa`
- [ ] Deploy realizado em `production`

### Verificação
```bash
# Ver pods
kubectl get pods -n desenvolvimento -l app=assistente-juridico
kubectl get pods -n qa -l app=assistente-juridico
kubectl get pods -n production -l app=assistente-juridico

# Ver logs
kubectl logs -n production -l app=assistente-juridico -f

# Health check
kubectl exec -n production deployment/assistente-juridico-deployment -- wget -qO- http://localhost:3001/health
```

- [ ] Pods rodando em `desenvolvimento`
- [ ] Pods rodando em `qa`
- [ ] Pods rodando em `production`
- [ ] Health checks passando
- [ ] Logs sem erros críticos

---

## 🌐 Fase 3: Configuração de Rede (PENDENTE)

### DNS
```bash
# Obter IP do Load Balancer
kubectl get ingress assistente-juridico-ingress -n production -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Configurar registros DNS:
- [ ] A record: `assistente-juridico.SEU-DOMINIO.com` → IP_DO_LOAD_BALANCER
- [ ] CNAME: `*.assistente-juridico.SEU-DOMINIO.com` → `assistente-juridico.SEU-DOMINIO.com`
- [ ] A record: `dev.assistente-juridico.SEU-DOMINIO.com` → IP_DO_LOAD_BALANCER
- [ ] A record: `qa.assistente-juridico.SEU-DOMINIO.com` → IP_DO_LOAD_BALANCER

### HTTPS / TLS
```bash
# Instalar cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Criar ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: seu-email@exemplo.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Atualizar Ingress para TLS
kubectl edit ingress assistente-juridico-ingress -n production
# Descomentar seção TLS
```

- [ ] cert-manager instalado
- [ ] ClusterIssuer criado
- [ ] Ingress atualizado com TLS
- [ ] Certificados emitidos
- [ ] HTTPS funcionando

### Teste de Conectividade
- [ ] `https://assistente-juridico.SEU-DOMINIO.com` acessível
- [ ] `https://dev.assistente-juridico.SEU-DOMINIO.com` acessível
- [ ] `https://qa.assistente-juridico.SEU-DOMINIO.com` acessível
- [ ] Certificado SSL válido
- [ ] Redirect HTTP → HTTPS funcionando

---

## 📊 Fase 4: Monitoramento (PENDENTE)

### Prometheus Stack
```bash
# Adicionar repositório
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Instalar
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

# Aplicar ServiceMonitor
kubectl apply -f k8s/service-monitor.yaml -n production
kubectl apply -f k8s/service-monitor.yaml -n qa
kubectl apply -f k8s/service-monitor.yaml -n desenvolvimento
```

- [ ] Helm instalado
- [ ] Prometheus Stack instalado
- [ ] ServiceMonitors aplicados
- [ ] Métricas sendo coletadas

### Grafana
```bash
# Port-forward para acessar Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Credenciais padrão:
# User: admin
# Pass: prom-operator
```

- [ ] Grafana acessível
- [ ] Dashboards importados
- [ ] Painéis configurados para:
  - [ ] CPU/Memory por pod
  - [ ] Request rate
  - [ ] Error rate
  - [ ] Latency
  - [ ] HPA status

### Alertas
- [ ] Alertas configurados para:
  - [ ] Pod down
  - [ ] High CPU usage
  - [ ] High Memory usage
  - [ ] High error rate
  - [ ] Latency spike
- [ ] Canais de notificação configurados (Slack/Email)

---

## 🔄 Fase 5: GitLab CI/CD (JÁ CONFIGURADO)

### GitLab Agent
```bash
# No cluster GKE
helm repo add gitlab https://charts.gitlab.io
helm repo update

helm upgrade --install gitlab-agent gitlab/gitlab-agent \
  --namespace gitlab-agent \
  --create-namespace \
  --set config.token=SEU_TOKEN_AQUI \
  --set config.kasAddress=wss://kas.gitlab.com

kubectl get pods -n gitlab-agent
```

- [ ] GitLab Agent instalado no cluster
- [ ] Agent conectado ao GitLab
- [ ] Status "Connected" no GitLab UI

### Variáveis CI/CD
No GitLab UI → Settings → CI/CD → Variables:

- [ ] `KUBE_CONTEXT` = `thiagobodevan-a11y-group/assistente-juridico-p:agente-kubernetes`
- [ ] `KUBE_CONTEXT_PROD` = `thiagobodevan-a11y-group/assistente-juridico-p:agente-kubernetes`
- [ ] `KUBE_NAMESPACE` = `desenvolvimento`
- [ ] Secrets de produção adicionados (se necessário)

### Pipeline
- [x] `.gitlab-ci.yml` configurado
- [x] Auto DevOps habilitado
- [x] Jobs de build Docker criados
- [x] Jobs de deploy criados (dev/qa/prod)
- [x] Review Apps configurados
- [x] Cleanup jobs criados

### Teste
- [ ] Push para `main` → deploy automático dev
- [ ] Criar MR → Review App criado
- [ ] Merge MR → Review App deletado
- [ ] Deploy manual para produção executado

---

## 🧪 Fase 6: Testes e Validação (PENDENTE)

### Testes de Carga
```bash
# Apache Bench
ab -n 10000 -c 100 https://assistente-juridico.SEU-DOMINIO.com/

# k6 (se disponível)
k6 run load-test.js
```

- [ ] Teste com 100 usuários simultâneos
- [ ] Teste com 1000 requisições
- [ ] HPA escalou corretamente
- [ ] Latência < 200ms (p95)
- [ ] Zero erros 5xx

### Testes de Resiliência
```bash
# Deletar um pod
kubectl delete pod -n production <pod-name>

# Verificar que foi recriado automaticamente
kubectl get pods -n production -l app=assistente-juridico -w
```

- [ ] Pod recriado automaticamente
- [ ] Serviço não teve downtime
- [ ] Health checks passaram

### Testes de Rollback
```bash
# Deploy de versão "ruim"
kubectl set image deployment/assistente-juridico-deployment -n production \
  assistente-juridico=assistente-juridico-p:bad-version

# Rollback
kubectl rollout undo deployment/assistente-juridico-deployment -n production

# Verificar
kubectl rollout status deployment/assistente-juridico-deployment -n production
```

- [ ] Rollback executado com sucesso
- [ ] Pods voltaram para versão anterior
- [ ] Serviço restaurado

---

## 📈 Fase 7: Otimização (OPCIONAL)

### Performance
- [ ] Ajustar resource requests/limits baseado em métricas reais
- [ ] Otimizar HPA thresholds
- [ ] Configurar PodTopologySpreadConstraints
- [ ] Implementar VPA (Vertical Pod Autoscaler)

### Segurança
- [ ] Pod Security Standards (PSS) habilitado
- [ ] OPA/Gatekeeper para políticas
- [ ] Falco para runtime security
- [ ] Vulnerability scanning de imagens

### Custos
- [ ] Cluster Autoscaler configurado
- [ ] Preemptible nodes para dev/qa
- [ ] Resource quotas por namespace
- [ ] Budget alerts configurados

---

## 📋 Manutenção Contínua

### Daily
- [ ] Verificar logs de erros
- [ ] Verificar métricas de performance
- [ ] Verificar alertas

### Weekly
- [ ] Revisar uso de recursos
- [ ] Atualizar dependências
- [ ] Revisar alertas falsos-positivos

### Monthly
- [ ] Atualizar versões K8s
- [ ] Revisar políticas de segurança
- [ ] Revisar custos

---

## 🎯 KPIs de Sucesso

### Disponibilidade
- [ ] Uptime > 99.9%
- [ ] RTO < 5 minutos
- [ ] RPO < 1 hora

### Performance
- [ ] Latência p95 < 200ms
- [ ] Latência p99 < 500ms
- [ ] Throughput > 1000 req/s

### Segurança
- [ ] Zero vulnerabilidades críticas
- [ ] Todos os pods passam PSS
- [ ] RBAC auditado

---

## 📝 Notas

### Comandos Úteis
```bash
# Status geral
./deploy-k8s.sh --help

# Ver todos os comandos
cat k8s-commands-reference.sh

# Documentação completa
cat K8S_IMPLEMENTACAO_FINAL.md
```

### Links Importantes
- **GitLab Project:** https://gitlab.com/thiagobodevan-a11y-group/assistente-juridico-p
- **GCP Console:** https://console.cloud.google.com/kubernetes/list?project=terminal-sonico-474321-s1
- **Documentação K8s:** https://kubernetes.io/docs/

---

**Última atualização:** 08/01/2026 18:20 UTC  
**Status:** ✅ Fase 1 completa, Fases 2-7 aguardando execução  
**Próxima ação:** Conectar ao cluster GKE e iniciar Fase 2
