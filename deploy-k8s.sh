#!/bin/bash
set -euo pipefail

# Script de deploy para Kubernetes
# Suporta múltiplos ambientes: dev, qa, production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="${SCRIPT_DIR}/k8s"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função de ajuda
show_help() {
    cat << EOF
🚀 Deploy Kubernetes - Assistente Jurídico

Uso: $0 [AMBIENTE] [OPÇÕES]

AMBIENTES:
    dev         Deploy para desenvolvimento (namespace: desenvolvimento)
    qa          Deploy para QA (namespace: qa)
    production  Deploy para produção (namespace: production)
    local       Deploy local com kind
    all         Deploy para todos os ambientes

OPÇÕES:
    -h, --help              Mostra esta ajuda
    -d, --dry-run           Simula o deploy sem aplicar
    -v, --verify            Verifica os recursos após deploy
    -r, --rollback          Faz rollback para versão anterior
    --skip-secrets          Não cria secrets
    --skip-build            Não faz build da imagem
    --image TAG             Usa tag específica da imagem (default: latest)

EXEMPLOS:
    $0 dev                  # Deploy para desenvolvimento
    $0 production -v        # Deploy para produção e verifica
    $0 local --image v1.2.3 # Deploy local com tag específica
    $0 all --dry-run        # Simula deploy em todos os ambientes

EOF
}

# Parse argumentos
ENVIRONMENT=""
DRY_RUN=false
VERIFY=false
ROLLBACK=false
SKIP_SECRETS=false
SKIP_BUILD=false
IMAGE_TAG="latest"

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|qa|production|local|all)
            ENVIRONMENT="$1"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verify)
            VERIFY=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        --skip-secrets)
            SKIP_SECRETS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --image)
            IMAGE_TAG="$2"
            shift 2
            ;;
        *)
            log_error "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validar ambiente
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Ambiente não especificado"
    show_help
    exit 1
fi

# Verificar kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl não encontrado. Instale: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Função para mapear ambiente para namespace
get_namespace() {
    case $1 in
        dev)
            echo "desenvolvimento"
            ;;
        qa)
            echo "qa"
            ;;
        production)
            echo "production"
            ;;
        local)
            echo "default"
            ;;
        *)
            echo "default"
            ;;
    esac
}

# Função para verificar cluster
check_cluster() {
    log_info "Verificando conexão com cluster..."
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Não foi possível conectar ao cluster Kubernetes"
        exit 1
    fi
    
    local context=$(kubectl config current-context)
    log_success "Conectado ao cluster: $context"
}

# Função para criar namespace
create_namespace() {
    local namespace=$1
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Criaria namespace: $namespace"
        return
    fi
    
    if kubectl get namespace "$namespace" &> /dev/null; then
        log_info "Namespace '$namespace' já existe"
    else
        log_info "Criando namespace: $namespace"
        kubectl create namespace "$namespace"
        log_success "Namespace criado"
    fi
}

# Função para criar secrets
create_secrets() {
    local namespace=$1
    
    if [[ "$SKIP_SECRETS" == true ]]; then
        log_warning "Pulando criação de secrets"
        return
    fi
    
    log_info "Configurando secrets para namespace: $namespace"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Criaria secrets no namespace: $namespace"
        return
    fi
    
    # Verificar se secret já existe
    if kubectl get secret assistente-juridico-secrets -n "$namespace" &> /dev/null; then
        log_warning "Secret 'assistente-juridico-secrets' já existe em $namespace"
        read -p "Deseja recriar? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            return
        fi
        kubectl delete secret assistente-juridico-secrets -n "$namespace"
    fi
    
    # Criar secret (valores devem vir de variáveis de ambiente ou arquivo)
    kubectl create secret generic assistente-juridico-secrets \
        --namespace="$namespace" \
        --from-literal=app-env="${APP_ENV:-production}" \
        --from-literal=google-client-id="${GOOGLE_CLIENT_ID:-}" \
        --from-literal=google-api-key="${GOOGLE_API_KEY:-}" \
        --from-literal=todoist-api-key="${TODOIST_API_KEY:-}"
    
    log_success "Secrets criados"
}

# Função para build da imagem
build_image() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warning "Pulando build da imagem"
        return
    fi
    
    log_info "Fazendo build da imagem: assistente-juridico-p:${IMAGE_TAG}"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Faria build da imagem"
        return
    fi
    
    if command -v docker &> /dev/null; then
        docker build -t "assistente-juridico-p:${IMAGE_TAG}" -f "${SCRIPT_DIR}/Dockerfile" "${SCRIPT_DIR}"
        log_success "Imagem construída"
    else
        log_warning "Docker não disponível, pulando build"
    fi
}

# Função para aplicar manifestos
apply_manifests() {
    local namespace=$1
    local env=$2
    
    log_info "Aplicando manifestos para ambiente: $env (namespace: $namespace)"
    
    local kubectl_args="apply -n $namespace"
    if [[ "$DRY_RUN" == true ]]; then
        kubectl_args="apply --dry-run=client -n $namespace"
    fi
    
    # Aplicar manifestos base
    kubectl $kubectl_args -f "${K8S_DIR}/deployment.yaml"
    kubectl $kubectl_args -f "${K8S_DIR}/ingress.yaml"
    kubectl $kubectl_args -f "${K8S_DIR}/configmap.yaml"
    kubectl $kubectl_args -f "${K8S_DIR}/hpa.yaml"
    kubectl $kubectl_args -f "${K8S_DIR}/pdb.yaml"
    
    # Aplicar manifestos específicos do ambiente
    if [[ -d "${K8S_DIR}/${env}" ]]; then
        kubectl $kubectl_args -f "${K8S_DIR}/${env}/"
    fi
    
    # Aplicar shared resources
    if [[ -d "${K8S_DIR}/shared" ]]; then
        kubectl $kubectl_args -f "${K8S_DIR}/shared/"
    fi
    
    if [[ "$DRY_RUN" == false ]]; then
        log_success "Manifestos aplicados"
    else
        log_info "[DRY-RUN] Manifestos validados"
    fi
}

# Função para verificar deployment
verify_deployment() {
    local namespace=$1
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Pulando verificação"
        return
    fi
    
    log_info "Verificando deployment..."
    
    kubectl rollout status deployment/assistente-juridico-deployment -n "$namespace" --timeout=5m
    
    log_info "Status dos pods:"
    kubectl get pods -n "$namespace" -l app=assistente-juridico
    
    log_success "Deployment verificado"
}

# Função para rollback
do_rollback() {
    local namespace=$1
    
    log_warning "Fazendo rollback do deployment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Faria rollback"
        return
    fi
    
    kubectl rollout undo deployment/assistente-juridico-deployment -n "$namespace"
    kubectl rollout status deployment/assistente-juridico-deployment -n "$namespace"
    
    log_success "Rollback concluído"
}

# Função principal de deploy
deploy_environment() {
    local env=$1
    local namespace=$(get_namespace "$env")
    
    log_info "=========================================="
    log_info "Iniciando deploy para: $env"
    log_info "Namespace: $namespace"
    log_info "Image tag: $IMAGE_TAG"
    log_info "=========================================="
    
    check_cluster
    create_namespace "$namespace"
    create_secrets "$namespace"
    
    if [[ "$ROLLBACK" == true ]]; then
        do_rollback "$namespace"
        return
    fi
    
    build_image
    apply_manifests "$namespace" "$env"
    
    if [[ "$VERIFY" == true ]]; then
        verify_deployment "$namespace"
    fi
    
    log_success "Deploy concluído para: $env"
}

# Executar deploy
if [[ "$ENVIRONMENT" == "all" ]]; then
    for env in dev qa production; do
        deploy_environment "$env"
        echo
    done
else
    deploy_environment "$ENVIRONMENT"
fi

log_success "✨ Script finalizado com sucesso!"
