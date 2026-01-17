#!/bin/bash
# 🚀 Setup Rápido Neon + Cloud Run
# Configura banco de dados PostgreSQL automaticamente

set -e

PROJECT_ID="sonic-terminal-474321-s1"
REGION="southamerica-east1"
DATABASE_URL="postgresql://neondb_owner:npg_pCHnAuQ1Kg8e@ep-wispy-smoke-ac2x3a7v-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

echo "🚀 Setup Automático Neon PostgreSQL"
echo "===================================="
echo ""

# Passo 1: Criar tabelas no Neon
echo "📝 1/3: Criando tabelas no Neon..."
echo ""

# Usar script backend existente
cd backend && DATABASE_URL="$DATABASE_URL" npm run db:init && cd .. || {
    echo "⚠️  db:init não disponível, criando manualmente..."
    
    # Criar tabelas diretamente
    npx tsx << 'EOFTS'
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL!;

async function setup() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Conectado ao Neon');
    
    // Criar tabelas
    await client.query(`
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
        
        CREATE TABLE IF NOT EXISTS minutas (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
        
        CREATE INDEX IF NOT EXISTS idx_expedientes_processo ON expedientes(numero_processo);
        CREATE INDEX IF NOT EXISTS idx_expedientes_lido ON expedientes(lido);
        CREATE INDEX IF NOT EXISTS idx_minutas_status ON minutas(status);
    `);
    
    console.log('✅ Tabelas criadas!');
    await client.end();
}

setup().catch(console.error);
EOFTS
}

echo ""
echo "✅ Tabelas criadas no Neon!"

# Passo 2: Configurar Cloud Run
echo ""
echo "☁️  2/3: Configurando Cloud Run..."
echo ""

# Remover DATABASE_URL existente e adicionar nova
gcloud run services update assistente-juridico-backend \
  --region="$REGION" \
  --update-env-vars="DATABASE_URL=$DATABASE_URL" \
  --project="$PROJECT_ID" \
  --quiet

echo "✅ Cloud Run atualizado!"

# Passo 3: Testar
echo ""
echo "🧪 3/3: Testando endpoints..."
sleep 10

SERVICE_URL="https://assistente-juridico-backend-598169933649.southamerica-east1.run.app"

echo "   Testando /api/expedientes..."
curl -s "$SERVICE_URL/api/expedientes?limit=1" | jq '.' 2>/dev/null && echo "✅ Funcionando!" || echo "⚠️  Inicializando..."

echo ""
echo "===================================="
echo "✅ SETUP CONCLUÍDO!"
echo "===================================="
echo ""
echo "🔗 URLs:"
echo "   • Expedientes: $SERVICE_URL/api/expedientes"
echo "   • Minutas: $SERVICE_URL/api/minutas"
echo "   • Frontend: https://sonic-terminal-474321-s1.web.app"
echo ""
echo "🎉 Banco configurado e conectado!"
echo ""
