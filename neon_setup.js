const { Client } = require('pg');
const fs = require('fs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_pCHnAuQ1Kg8e@ep-wispy-smoke-ac2x3a7v-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function setupDatabase() {
    console.log('🔗 Conectando ao Neon PostgreSQL...');
    
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('✅ Conectado ao banco de dados!');
        console.log('');
        
        const sql = fs.readFileSync('neon_schema.sql', 'utf8');
        
        console.log('📝 Criando tabelas...');
        await client.query(sql);
        
        console.log('✅ Tabelas criadas com sucesso!');
        console.log('');
        
        // Verificar tabelas criadas
        console.log('🔍 Verificando tabelas criadas:');
        const result = await client.query(`
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);
        
        result.rows.forEach(row => {
            console.log(`   ✅ ${row.tablename}`);
        });
        
        console.log('');
        console.log('✅ Setup do banco concluído!');
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setupDatabase();
