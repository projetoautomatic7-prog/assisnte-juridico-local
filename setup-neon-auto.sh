#!/bin/bash
# 🚀 Setup automático de PostgreSQL com Neon (gratuito)
# Cria banco, configura tabelas e conecta ao Cloud Run

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"

echo "🚀 Setup Automático PostgreSQL + Neon"
echo "======================================"
echo ""
echo "📋 Este script irá:"
echo "   1. Criar conta gratuita no Neon (se necessário)"
echo "   2. Criar banco de dados PostgreSQL"
echo "   3. Configurar tabelas (expedientes, minutas)"
echo "   4. Conectar ao Cloud Run"
echo ""
echo "⏱️  Tempo estimado: 5 minutos"
echo ""
read -p "Pressione ENTER para começar..."

# Passo 1: Instalar Neon CLI (se não estiver instalado)
echo ""
echo "📦 1/5: Verificando Neon CLI..."
if ! command -v neon &> /dev/null; then
    echo "   Instalando Neon CLI..."
    npm install -g neonctl
else
    echo "   ✅ Neon CLI já instalado"
fi

echo ""
echo "🔐 2/5: Autenticação no Neon"
echo ""
echo "   Você será redirecionado para o navegador para login."
echo "   Use sua conta Google ou GitHub (gratuito, sem cartão)."
echo ""
read -p "Pressione ENTER para abrir o navegador..."

# Autenticar
neon auth

echo ""
echo "🗄️  3/5: Criando projeto e banco de dados..."
echo ""

# Criar projeto (se não existir)
PROJECT_NAME="assistente-juridico-db"
NEON_PROJECT=$(neon projects list --output json 2>/dev/null | jq -r ".[] | select(.name==\"$PROJECT_NAME\") | .id" || echo "")

if [ -z "$NEON_PROJECT" ]; then
    echo "   Criando novo projeto '$PROJECT_NAME'..."
    NEON_PROJECT=$(neon projects create --name "$PROJECT_NAME" --output json | jq -r '.id')
    echo "   ✅ Projeto criado: $NEON_PROJECT"
else
    echo "   ✅ Projeto já existe: $NEON_PROJECT"
fi

# Obter connection string
echo ""
echo "   Obtendo connection string..."
DATABASE_URL=$(neon connection-string "$NEON_PROJECT" --role-name neondb_owner)

if [ -z "$DATABASE_URL" ]; then
    echo "   ❌ Erro ao obter DATABASE_URL"
    echo ""
    echo "   Execute manualmente:"
    echo "   1. Acesse: https://console.neon.tech"
    echo "   2. Copie a Connection String"
    echo "   3. Execute: ./fix-database-config.sh"
    exit 1
fi

echo "   ✅ DATABASE_URL obtida!"

# Passo 4: Criar tabelas
echo ""
echo "📝 4/5: Criando tabelas (expedientes, minutas)..."
echo ""

# Salvar temporariamente para criar schema
export DATABASE_URL="$DATABASE_URL"

# Criar schema usando psql ou node
cat > /tmp/create_schema.sql << 'EOF'
-- Tabela de expedientes
CREATE TABLE IF NOT EXISTS expedientes (
  id SERIAL PRIMARY KEY,
  numero_processo VARCHAR(50),
  tribunal VARCHAR(100),
  tipo VARCHAR(100),
  titulo TEXT,
  conteudo TEXT,
  data_disponibilizacao TIMESTAMP,
  nome_orgao VARCHAR(255),
  autor VARCHAR(255),
  reu VARCHAR(255),
  advogado_autor VARCHAR(255),
  advogado_reu VARCHAR(255),
  lawyer_name VARCHAR(255),
  lido BOOLEAN DEFAULT false,
  arquivado BOOLEAN DEFAULT false,
  analyzed BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de minutas
CREATE TABLE IF NOT EXISTS minutas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  tipo VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_expedientes_processo ON expedientes(numero_processo);
CREATE INDEX IF NOT EXISTS idx_expedientes_lido ON expedientes(lido);
CREATE INDEX IF NOT EXISTS idx_expedientes_data ON expedientes(data_disponibilizacao);
CREATE INDEX IF NOT EXISTS idx_minutas_tipo ON minutas(tipo);
EOF

# Executar schema
echo "   Conectando ao banco..."
npx pg-query "$DATABASE_URL" -f /tmp/create_schema.sql 2>/dev/null || {
    # Fallback: usar psql se disponível
    if command -v psql &> /dev/null; then
        psql "$DATABASE_URL" -f /tmp/create_schema.sql
    else
        echo "   ⚠️  Instalando dependência temporária..."
        npm install -g pg-query-cli
        npx pg-query "$DATABASE_URL" -f /tmp/create_schema.sql
    fi
}

rm /tmp/create_schema.sql

echo "   ✅ Tabelas criadas!"

# Passo 5: Configurar Cloud Run
echo ""
echo "☁️  5/5: Configurando Cloud Run..."
echo ""

echo "   Escolha o método de armazenamento:"
echo "   1) Secret Manager (recomendado - mais seguro)"
echo "   2) Variável de ambiente (mais rápido)"
echo ""
read -p "   Digite 1 ou 2: " METODO

if [ "$METODO" = "1" ]; then
    echo ""
    echo "   🔐 Configurando Secret Manager..."
    
    # Habilitar API
    gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" --quiet
    
    # Criar/atualizar secret
    if gcloud secrets describe database-url --project="$PROJECT_ID" &>/dev/null; then
        echo "   Atualizando secret..."
        echo -n "$DATABASE_URL" | gcloud secrets versions add database-url \
            --data-file=- \
            --project="$PROJECT_ID"
    else
        echo "   Criando secret..."
        echo -n "$DATABASE_URL" | gcloud secrets create database-url \
            --data-file=- \
            --replication-policy="automatic" \
            --project="$PROJECT_ID"
        
        # Permissão
        gcloud secrets add-iam-policy-binding database-url \
            --member="serviceAccount:598169933649-compute@developer.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            --project="$PROJECT_ID" \
            --quiet
    fi
    
    # Atualizar Cloud Run
    echo "   Atualizando Cloud Run..."
    gcloud run services update assistente-juridico-backend \
        --region="$REGION" \
        --update-secrets="DATABASE_URL=database-url:latest" \
        --project="$PROJECT_ID" \
        --quiet
    
    echo "   ✅ Secret Manager configurado!"
    
else
    echo ""
    echo "   ⚙️  Configurando variável de ambiente..."
    
    gcloud run services update assistente-juridico-backend \
        --region="$REGION" \
        --set-env-vars="DATABASE_URL=$DATABASE_URL" \
        --project="$PROJECT_ID" \
        --quiet
    
    echo "   ✅ Variável configurada!"
fi

# Testar conexão
echo ""
echo "🧪 Testando conexão..."
sleep 5

SERVICE_URL="https://assistente-juridico-backend-598169933649.southamerica-east1.run.app"
EXPEDIENTES=$(curl -s "$SERVICE_URL/api/expedientes?limit=1" | jq -r 'type' 2>/dev/null || echo "error")

if [ "$EXPEDIENTES" = "array" ] || [ "$EXPEDIENTES" = "object" ]; then
    echo "   ✅ /api/expedientes funcionando!"
else
    echo "   ⚠️  Ainda conectando... (pode levar 1-2 minutos)"
fi

echo ""
echo "======================================"
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo "======================================"
echo ""
echo "📊 Recursos criados:"
echo "   ✅ Banco PostgreSQL (Neon)"
echo "   ✅ Tabelas: expedientes, minutas"
echo "   ✅ Cloud Run atualizado"
echo ""
echo "🔗 URLs importantes:"
echo "   • Neon Console: https://console.neon.tech/app/projects/$NEON_PROJECT"
echo "   • Backend: $SERVICE_URL"
echo "   • Frontend: https://sonic-terminal-474321-s1.web.app"
echo ""
echo "🧪 Testar agora:"
echo "   curl $SERVICE_URL/api/expedientes"
echo "   curl $SERVICE_URL/api/minutas"
echo ""
echo "📋 Plano Neon Gratuito:"
echo "   • 0.5 GB armazenamento"
echo "   • 10 GB transferência/mês"
echo "   • Sem necessidade de cartão"
echo ""
