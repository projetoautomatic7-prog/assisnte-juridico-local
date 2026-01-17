
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connection string fornecida pelo usuário
const DATABASE_URL = 'postgresql://neondb_owner:npg_pCHnAuQ1Kg8e@ep-wispy-smoke-ac2x3a7v-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function applySchema() {
  console.log('🔌 Conectando ao Neon PostgreSQL...');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Necessário para Neon em alguns ambientes
  });

  try {
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    // Ler arquivo schema.sql
    const schemaPath = path.join(__dirname, 'backend/src/db/schema.sql');
    console.log(`📂 Lendo schema de: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executando SQL...');
    await client.query(schemaSql);
    
    console.log('✅ Schema aplicado com sucesso!');
    
    // Verificar tabelas criadas
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Tabelas encontradas:', res.rows.map(r => r.table_name).join(', '));

  } catch (err) {
    console.error('❌ Erro ao aplicar schema:', err);
  } finally {
    await client.end();
  }
}

applySchema();
