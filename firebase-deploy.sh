#!/bin/bash
# Script de deploy para Firebase com validações

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando deploy Firebase${NC}"

# Função para validar ambiente
validate_env() {
    if [ -z "$GOOGLE_API_KEY" ]; then
        echo -e "${RED}❌ GOOGLE_API_KEY não configurada${NC}"
        exit 1
    fi
    
    if [ -z "$VITE_GOOGLE_API_KEY" ]; then
        echo -e "${RED}❌ VITE_GOOGLE_API_KEY não configurada${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Variáveis de ambiente validadas${NC}"
}

# Função para executar testes
run_tests() {
    echo -e "${YELLOW}🧪 Executando testes...${NC}"
    npm run test:run || {
        echo -e "${RED}❌ Testes falharam${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ Testes passaram${NC}"
}

# Função para build
build_app() {
    echo -e "${YELLOW}🔨 Construindo aplicação...${NC}"
    npm run build || {
        echo -e "${RED}❌ Build falhou${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ Build concluído${NC}"
}

# Função para deploy
deploy_firebase() {
    local ENV=${1:-production}
    
    echo -e "${YELLOW}📦 Fazendo deploy para ${ENV}...${NC}"
    
    case $ENV in
        production)
            firebase use production
            firebase deploy --only hosting:production -m "Deploy production $(date +%Y-%m-%d_%H:%M:%S)"
            ;;
        staging)
            firebase use staging
            firebase deploy --only hosting:staging -m "Deploy staging $(date +%Y-%m-%d_%H:%M:%S)"
            ;;
        development)
            firebase use development
            firebase deploy --only hosting:development -m "Deploy development $(date +%Y-%m-%d_%H:%M:%S)"
            ;;
        *)
            echo -e "${RED}❌ Ambiente inválido: $ENV${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
}

# Execução do pipeline
main() {
    local ENVIRONMENT=${1:-production}
    local SKIP_TESTS=${2:-false}
    
    echo ""
    echo "================================================"
    echo "  Deploy Firebase - Assistente Jurídico"
    echo "  Ambiente: $ENVIRONMENT"
    echo "================================================"
    echo ""
    
    validate_env
    
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    else
        echo -e "${YELLOW}⚠️  Testes pulados (--skip-tests)${NC}"
    fi
    
    build_app
    deploy_firebase "$ENVIRONMENT"
    
    echo ""
    echo -e "${GREEN}🎉 Deploy finalizado com sucesso!${NC}"
    echo ""
}

# Processar argumentos
ENVIRONMENT="production"
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -h|--help)
            echo "Uso: ./firebase-deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --env ENV       Ambiente de deploy (production|staging|development)"
            echo "  --skip-tests        Pula execução dos testes"
            echo "  -h, --help          Mostra esta ajuda"
            echo ""
            echo "Exemplos:"
            echo "  ./firebase-deploy.sh"
            echo "  ./firebase-deploy.sh --env staging"
            echo "  ./firebase-deploy.sh --env development --skip-tests"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opção desconhecida: $1${NC}"
            exit 1
            ;;
    esac
done

main "$ENVIRONMENT" "$SKIP_TESTS"
