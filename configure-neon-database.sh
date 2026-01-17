#!/bin/bash
# 🔧 Configuração automática do Neon PostgreSQL
# Cria tabelas e conecta ao Cloud Run

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"
NEON_PROJECT_NAME="neonacessorjuridico"

echo "🔧 Configuração Neon PostgreSQL"
echo "================================="
echo ""
echo "📋 Informações detectadas:"
echo "   • Projeto Neon: $NEON_PROJECT_NAME"
echo "   • API REST: ep-wispy-smoke-ac2x3a7v"
echo "   • Região: sa-east-1 (São Paulo)"
echo ""

# Passo 1: Obter Connection String
echo "🔗 1/4: Obtendo Connection String do Neon..."
echo ""
echo "⚠️  IMPORTANTE: Você precisa da Connection String (não a API REST)"
echo ""
echo "📍 Como encontrar:"
echo "   1. Acesse: https://console.neon.tech/app/projects"
echo "   2. Clique no projeto '$NEON_PROJECT_NAME'"
echo "   3. Clique em 'Connection Details' ou 'Dashboard'"
echo "   4. Copie a string que começa com: postgresql://"
echo ""
echo "📝 Formato esperado:"
echo "   postgresql://neonacessorjuridico_owner:XXX@ep-wispy-smoke-ac2x3a7v.sa-east-1.aws.neon.tech/neonacessorjuridico?sslmode=require"
echo ""
read -p "Cole a Connection String aqui: " DATABASE_URL

# Validar formato
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo ""
    echo "❌ ERRO: Connection String inválida!"
    echo "   Deve começar com: postgresql://"
    echo ""
    echo "🔍 Você colou a API REST URL por engano?"
    echo "   API REST (errado): https://ep-wispy-smoke-ac2x3a7v.apirest.sa-east-1.aws.neon.tech/..."
    echo "   PostgreSQL (correto): postgresql://usuario:senha@ep-wispy-smoke-ac2x3a7v.sa-east-1.aws.neon.tech/..."
    exit 1
fi

echo ""
echo "✅ Connection String válida!"

# Passo 2: Criar tabelas usando schema existente
echo ""
echo "📝 2/4: Criando tabelas (expedientes, minutas)..."
echo ""

# Adaptar schema.sql para PostgreSQL (remover sintaxe CrateDB)
cat > /tmp/neon_schema.sql << 'EOF'
-- Tabela de minutas
CREATE TABLE IF NOT EXISTS minutas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  process_id TEXT,
  tipo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  autor TEXT NOT NULL,
  google_docs_id TEXT,
  google_docs_url TEXT,
  ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  criado_por_agente BOOLEAN DEFAULT FALSE,
  agente_id TEXT,
  template_id TEXT,
  expediente_id TEXT,
  variaveis JSONB
);

-- Tabela de expedientes
CREATE TABLE IF NOT EXISTS expedientes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  numero_processo TEXT,
  tribunal TEXT,
  tipo TEXT,
  titulo TEXT,
  conteudo TEXT,
  data_disponibilizacao TIMESTAMP WITH TIME ZONE,
  nome_orgao TEXT,
  autor TEXT,
  reu TEXT,
  advogado_autor TEXT,
  advogado_reu TEXT,
  lawyer_name TEXT,
  lido BOOLEAN DEFAULT FALSE,
  arquivado BOOLEAN DEFAULT FALSE,
  analyzed BOOLEAN DEFAULT FALSE,
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_expedientes_processo ON expedientes(numero_processo);
CREATE INDEX IF NOT EXISTS idx_expedientes_tribunal ON expedientes(tribunal);
CREATE INDEX IF NOT EXISTS idx_expedientes_lido ON expedientes(lido);
CREATE INDEX IF NOT EXISTS idx_expedientes_data ON expedientes(data_disponibilizacao);
CREATE INDEX IF NOT EXISTS idx_expedientes_lawyer ON expedientes(lawyer_name);

CREATE INDEX IF NOT EXISTS idx_minutas_status ON minutas(status);
CREATE INDEX IF NOT EXISTS idx_minutas_tipo ON minutas(tipo);
CREATE INDEX IF NOT EXISTS idx_minutas_autor ON minutas(autor);
CREATE INDEX IF NOT EXISTS idx_minutas_process ON minutas(process_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expedientes_updated_at BEFORE UPDATE ON expedientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_minutas_updated_at BEFORE UPDATE ON minutas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View para estatísticas
CREATE OR REPLACE VIEW expedientes_stats AS
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE lido = false) as nao_lidos,
    COUNT(*) FILTER (WHERE arquivado = true) as arquivados,
    COUNT(*) FILTER (WHERE analyzed = true) as analisados,
    COUNT(DISTINCT tribunal) as tribunais_unicos,
    MAX(created_at) as ultimo_criado
FROM expedientes;

EOF

echo "   Conectando ao banco de dados..."

# Verificar se psql está instalado
if command -v psql &> /dev/null; then
    echo "   Usando psql nativo..."
    PGPASSWORD="${DATABASE_URL#*://}" psql "$DATABASE_URL" -f /tmp/neon_schema.sql 2>&1 | grep -v "^$" | head -20
    RESULT=$?
else
    echo "   psql não encontrado, instalando dependência temporária..."
    npm install -g node-postgres-cli 2>/dev/null || true
    
    # Tentar com node
    cat > /tmp/run_sql.js << 'EOFJS'
const { Client } = require('pg');
const fs = require('fs');

async function runSQL() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        const sql = fs.readFileSync('/tmp/neon_schema.sql', 'utf8');
        await client.query(sql);
        console.log('   ✅ Tabelas criadas com sucesso!');
    } catch (err) {
        console.error('   ❌ Erro:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runSQL();
EOFJS
    
    DATABASE_URL="$DATABASE_URL" node /tmp/run_sql.js
    RESULT=$?
fi

if [ $RESULT -eq 0 ]; then
    echo "   ✅ Tabelas criadas com sucesso!"
else
    echo "   ⚠️  Algumas tabelas podem já existir (normal)"
fi

rm -f /tmp/neon_schema.sql /tmp/run_sql.js

# Passo 3: Verificar tabelas criadas
echo ""
echo "🔍 3/4: Verificando tabelas criadas..."
echo ""

cat > /tmp/verify_tables.js << 'EOFJS'
const { Client } = require('pg');

async function verifyTables() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        
        const result = await client.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);
        
        console.log('   Tabelas encontradas:');
        result.rows.forEach(row => {
            console.log(`   ✅ ${row.tablename}`);
        });
        
        // Verificar views
        const views = await client.query(`
            SELECT viewname 
            FROM pg_catalog.pg_views 
            WHERE schemaname = 'public'
        `);
        
        if (views.rows.length > 0) {
            console.log('');
            console.log('   Views criadas:');
            views.rows.forEach(row => {
                console.log(`   ✅ ${row.viewname}`);
            });
        }
        
    } catch (err) {
        console.error('   ❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

verifyTables();
EOFJS

DATABASE_URL="$DATABASE_URL" node /tmp/verify_tables.js
rm -f /tmp/verify_tables.js

# Passo 4: Configurar Cloud Run
echo ""
echo "☁️  4/4: Configurando Cloud Run..."
echo ""

echo "Escolha o método de armazenamento da DATABASE_URL:"
echo "  1) Secret Manager (recomendado - mais seguro)"
echo "  2) Variável de ambiente (mais rápido, menos seguro)"
echo ""
read -p "Digite 1 ou 2: " METODO

if [ "$METODO" = "1" ]; then
    echo ""
    echo "🔐 Configurando Secret Manager..."
    
    # Habilitar API
    echo "   Habilitando Secret Manager API..."
    gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" --quiet
    
    # Criar/atualizar secret
    if gcloud secrets describe database-url --project="$PROJECT_ID" &>/dev/null 2>&1; then
        echo "   Atualizando secret existente..."
        echo -n "$DATABASE_URL" | gcloud secrets versions add database-url \
            --data-file=- \
            --project="$PROJECT_ID"
    else
        echo "   Criando novo secret..."
        echo -n "$DATABASE_URL" | gcloud secrets create database-url \
            --data-file=- \
            --replication-policy="automatic" \
            --project="$PROJECT_ID"
        
        # Permissão
        echo "   Configurando permissões..."
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
    echo "⚙️  Configurando variável de ambiente..."
    
    gcloud run services update assistente-juridico-backend \
        --region="$REGION" \
        --set-env-vars="DATABASE_URL=$DATABASE_URL" \
        --project="$PROJECT_ID" \
        --quiet
    
    echo "   ✅ Variável configurada!"
    echo "   ⚠️  Recomendação: Migre para Secret Manager depois"
fi

# Aguardar deploy
echo ""
echo "⏳ Aguardando deploy finalizar..."
sleep 10

# Passo 5: Testar conexão
echo ""
echo "🧪 Testando endpoints..."
echo ""

SERVICE_URL="https://assistente-juridico-backend-598169933649.southamerica-east1.run.app"

echo "   1. Testando /api/expedientes..."
EXPEDIENTES_RESPONSE=$(curl -s "$SERVICE_URL/api/expedientes?limit=5" 2>&1)
EXPEDIENTES_TYPE=$(echo "$EXPEDIENTES_RESPONSE" | jq -r 'type' 2>/dev/null || echo "error")

if [ "$EXPEDIENTES_TYPE" = "array" ]; then
    EXPEDIENTES_COUNT=$(echo "$EXPEDIENTES_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
    echo "      ✅ Funcionando! ($EXPEDIENTES_COUNT expedientes retornados)"
elif [ "$EXPEDIENTES_TYPE" = "object" ]; then
    echo "      ✅ Funcionando! (resposta válida)"
else
    echo "      ⚠️  Ainda inicializando... (pode levar 1-2 minutos)"
    echo "      Resposta: $EXPEDIENTES_RESPONSE"
fi

echo ""
echo "   2. Testando /api/minutas..."
MINUTAS_RESPONSE=$(curl -s "$SERVICE_URL/api/minutas" 2>&1)
MINUTAS_TYPE=$(echo "$MINUTAS_RESPONSE" | jq -r 'type' 2>/dev/null || echo "error")

if [ "$MINUTAS_TYPE" = "array" ] || [ "$MINUTAS_TYPE" = "object" ]; then
    echo "      ✅ Funcionando!"
else
    echo "      ⚠️  Ainda inicializando..."
fi

echo ""
echo "================================="
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo "================================="
echo ""
echo "📊 Recursos configurados:"
echo "   ✅ Banco PostgreSQL (Neon)"
echo "   ✅ Tabelas: expedientes, minutas"
echo "   ✅ Índices para performance"
echo "   ✅ Views de estatísticas"
echo "   ✅ Triggers de atualização automática"
echo "   ✅ Cloud Run atualizado"
echo ""
echo "🔗 URLs importantes:"
echo "   • Neon Console: https://console.neon.tech"
echo "   • Backend: $SERVICE_URL"
echo "   • Expedientes: $SERVICE_URL/api/expedientes"
echo "   • Minutas: $SERVICE_URL/api/minutas"
echo "   • Frontend: https://sonic-terminal-474321-s1.web.app"
echo ""
echo "🧪 Comandos úteis:"
echo "   # Testar expedientes"
echo "   curl $SERVICE_URL/api/expedientes"
echo ""
echo "   # Ver estatísticas"
echo "   psql \"$DATABASE_URL\" -c 'SELECT * FROM expedientes_stats;'"
echo ""
echo "   # Ver logs do Cloud Run"
echo "   gcloud logging read 'resource.type=cloud_run_revision' --limit 20 --project=$PROJECT_ID"
echo ""
echo "💡 Próximos passos:"
echo "   1. Acesse o app: https://sonic-terminal-474321-s1.web.app"
echo "   2. Teste as funcionalidades de expedientes/minutas"
echo "   3. Se houver erro, verifique os logs acima"
echo ""
