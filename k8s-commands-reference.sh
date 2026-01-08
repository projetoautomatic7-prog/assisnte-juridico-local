#!/bin/bash
# Quick Reference - Kubernetes Commands
# Assistente Jurídico PJe

# ═══════════════════════════════════════════════════════════════
# 🚀 DEPLOY RÁPIDO
# ═══════════════════════════════════════════════════════════════

# Deploy desenvolvimento com verificação
./deploy-k8s.sh dev -v

# Deploy produção
./deploy-k8s.sh production -v

# Deploy todos os ambientes
./deploy-k8s.sh all

# Dry-run (simular sem aplicar)
./deploy-k8s.sh dev --dry-run

# Rollback
./deploy-k8s.sh production --rollback

# ═══════════════════════════════════════════════════════════════
# 📊 MONITORAMENTO
# ═══════════════════════════════════════════════════════════════

# Ver todos os pods
kubectl get pods -n desenvolvimento -l app=assistente-juridico

# Logs em tempo real
kubectl logs -n desenvolvimento -l app=assistente-juridico -f --tail=100

# Logs de pod específico
kubectl logs -n desenvolvimento <pod-name> -f

# Descrever pod (troubleshooting)
kubectl describe pod -n desenvolvimento <pod-name>

# Ver eventos recentes
kubectl get events -n desenvolvimento --sort-by='.lastTimestamp' | tail -20

# ═══════════════════════════════════════════════════════════════
# 📈 MÉTRICAS E AUTOSCALING
# ═══════════════════════════════════════════════════════════════

# Ver uso de CPU/Memory
kubectl top pods -n desenvolvimento

# Status do HPA
kubectl get hpa -n desenvolvimento
kubectl describe hpa assistente-juridico-hpa -n desenvolvimento

# Ver histórico de scaling
kubectl get events -n desenvolvimento | grep HPA

# Forçar scale manual
kubectl scale deployment/assistente-juridico-deployment --replicas=5 -n desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 🔄 DEPLOYMENTS E ROLLOUTS
# ═══════════════════════════════════════════════════════════════

# Ver status do deployment
kubectl rollout status deployment/assistente-juridico-deployment -n desenvolvimento

# Ver histórico de rollouts
kubectl rollout history deployment/assistente-juridico-deployment -n desenvolvimento

# Rollback para versão anterior
kubectl rollout undo deployment/assistente-juridico-deployment -n desenvolvimento

# Rollback para revisão específica
kubectl rollout undo deployment/assistente-juridico-deployment -n desenvolvimento --to-revision=2

# Forçar restart (sem downtime)
kubectl rollout restart deployment/assistente-juridico-deployment -n desenvolvimento

# Pausar rollout
kubectl rollout pause deployment/assistente-juridico-deployment -n desenvolvimento

# Retomar rollout
kubectl rollout resume deployment/assistente-juridico-deployment -n desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 🌐 INGRESS E NETWORKING
# ═══════════════════════════════════════════════════════════════

# Ver ingress
kubectl get ingress -n desenvolvimento
kubectl describe ingress assistente-juridico-ingress -n desenvolvimento

# Ver serviços
kubectl get services -n desenvolvimento

# Port-forward para teste local
kubectl port-forward -n desenvolvimento service/assistente-juridico-service 8080:80

# Port-forward pod específico
kubectl port-forward -n desenvolvimento <pod-name> 8080:3001

# Ver network policies
kubectl get networkpolicies -n desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 🔐 SECRETS E CONFIGMAPS
# ═══════════════════════════════════════════════════════════════

# Listar secrets
kubectl get secrets -n desenvolvimento

# Ver detalhes de secret (base64)
kubectl get secret assistente-juridico-secrets -n desenvolvimento -o yaml

# Decodificar secret
kubectl get secret assistente-juridico-secrets -n desenvolvimento -o jsonpath='{.data.app-env}' | base64 -d

# Listar ConfigMaps
kubectl get configmaps -n desenvolvimento

# Ver ConfigMap
kubectl describe configmap assistente-juridico-config -n desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 🐛 DEBUG E TROUBLESHOOTING
# ═══════════════════════════════════════════════════════════════

# Shell interativo no pod
kubectl exec -it -n desenvolvimento deployment/assistente-juridico-deployment -- /bin/sh

# Executar comando no pod
kubectl exec -n desenvolvimento deployment/assistente-juridico-deployment -- ls -la

# Copiar arquivo do pod
kubectl cp desenvolvimento/<pod-name>:/app/file.txt ./file.txt

# Copiar arquivo para o pod
kubectl cp ./file.txt desenvolvimento/<pod-name>:/tmp/file.txt

# Health check manual
kubectl exec -n desenvolvimento deployment/assistente-juridico-deployment -- wget -qO- http://localhost:3001/health

# Ver logs do container anterior (crashed)
kubectl logs -n desenvolvimento <pod-name> --previous

# Ver todos os recursos do namespace
kubectl get all -n desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 🔧 MANUTENÇÃO
# ═══════════════════════════════════════════════════════════════

# Deletar pod (será recriado automaticamente)
kubectl delete pod -n desenvolvimento <pod-name>

# Deletar todos os pods (serão recriados)
kubectl delete pods -n desenvolvimento -l app=assistente-juridico

# Forçar pull de nova imagem
kubectl set image deployment/assistente-juridico-deployment -n desenvolvimento \
  assistente-juridico=assistente-juridico-p:v1.2.3

# Atualizar env var
kubectl set env deployment/assistente-juridico-deployment -n desenvolvimento \
  NODE_ENV=production

# Ver detalhes de deployment
kubectl describe deployment assistente-juridico-deployment -n desenvolvimento

# Editar deployment (abre editor)
kubectl edit deployment assistente-juridico-deployment -n desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 📦 NAMESPACES
# ═══════════════════════════════════════════════════════════════

# Listar todos os namespaces
kubectl get namespaces

# Ver recursos de um namespace
kubectl get all -n desenvolvimento

# Criar namespace
kubectl create namespace desenvolvimento

# Deletar namespace (cuidado!)
kubectl delete namespace desenvolvimento

# Mudar namespace padrão
kubectl config set-context --current --namespace=desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 🔍 INFORMAÇÕES DO CLUSTER
# ═══════════════════════════════════════════════════════════════

# Info do cluster
kubectl cluster-info

# Ver nodes
kubectl get nodes
kubectl describe node <node-name>

# Ver contextos
kubectl config get-contexts

# Mudar contexto
kubectl config use-context <context-name>

# Ver usuário atual
kubectl config current-context

# Ver API versions disponíveis
kubectl api-versions

# Ver recursos disponíveis
kubectl api-resources

# ═══════════════════════════════════════════════════════════════
# 🎯 SKAFFOLD (Desenvolvimento)
# ═══════════════════════════════════════════════════════════════

# Modo desenvolvimento (hot-reload)
skaffold dev

# Deploy único
skaffold run

# Deploy com port-forward
skaffold run --port-forward

# Build sem deploy
skaffold build

# Deletar recursos
skaffold delete

# Debug mode
skaffold debug

# ═══════════════════════════════════════════════════════════════
# 📝 KUSTOMIZE
# ═══════════════════════════════════════════════════════════════

# Ver configuração final (sem aplicar)
kubectl kustomize k8s/

# Aplicar com kustomize
kubectl apply -k k8s/

# Aplicar ambiente específico
kubectl apply -k k8s/dev/
kubectl apply -k k8s/qa/
kubectl apply -k k8s/production/

# Deletar com kustomize
kubectl delete -k k8s/

# ═══════════════════════════════════════════════════════════════
# 🧪 TESTES E VALIDAÇÃO
# ═══════════════════════════════════════════════════════════════

# Validar manifests (sem aplicar)
kubectl apply --dry-run=client -f k8s/deployment.yaml

# Validar todos os manifestos
kubectl apply --dry-run=client -f k8s/

# Lint com kubeval (se instalado)
kubeval k8s/*.yaml

# Lint com kube-score (se instalado)
kube-score score k8s/*.yaml

# ═══════════════════════════════════════════════════════════════
# 🚨 EMERGÊNCIA / HOTFIX
# ═══════════════════════════════════════════════════════════════

# Escalar para 0 (parar aplicação)
kubectl scale deployment/assistente-juridico-deployment --replicas=0 -n production

# Escalar de volta
kubectl scale deployment/assistente-juridico-deployment --replicas=3 -n production

# Rollback imediato
kubectl rollout undo deployment/assistente-juridico-deployment -n production

# Deletar pods problemáticos
kubectl delete pod -n production -l app=assistente-juridico --force --grace-period=0

# Ver quota e limits
kubectl describe resourcequota -n production
kubectl describe limitrange -n production

# ═══════════════════════════════════════════════════════════════
# 📊 MÉTRICAS AVANÇADAS
# ═══════════════════════════════════════════════════════════════

# Ver uso de recursos por pod
kubectl top pods -n desenvolvimento --sort-by=memory
kubectl top pods -n desenvolvimento --sort-by=cpu

# Ver uso de recursos por node
kubectl top nodes

# Ver PDB status
kubectl get pdb -n desenvolvimento
kubectl describe pdb assistente-juridico-pdb -n desenvolvimento

# Ver endpoints
kubectl get endpoints -n desenvolvimento

# ═══════════════════════════════════════════════════════════════
# 🔄 BACKUP E RESTORE
# ═══════════════════════════════════════════════════════════════

# Exportar todos os recursos (backup)
kubectl get all -n desenvolvimento -o yaml > backup-desenvolvimento.yaml

# Backup de secrets
kubectl get secrets -n desenvolvimento -o yaml > secrets-backup.yaml

# Restore
kubectl apply -f backup-desenvolvimento.yaml

# ═══════════════════════════════════════════════════════════════
# 📚 HELP E DOCUMENTAÇÃO
# ═══════════════════════════════════════════════════════════════

# Help de comando
kubectl explain pods
kubectl explain deployment.spec

# Documentação detalhada
kubectl explain deployment.spec.template --recursive

# Versão do kubectl
kubectl version

# Ver help de deploy-k8s.sh
./deploy-k8s.sh --help

# ═══════════════════════════════════════════════════════════════
# FIM - Quick Reference
# ═══════════════════════════════════════════════════════════════
