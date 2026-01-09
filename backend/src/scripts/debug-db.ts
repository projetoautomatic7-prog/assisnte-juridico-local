import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function debugDb() {
  console.log("🔍 Debugging database initialization...");

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  console.log("✅ Connection established.");

  try {
    // 1. Test Minutas Schema
    console.log("\n--- Testing 'minutas' schema ---");
    const schemaPath = path.resolve(__dirname, "../db/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    // Split by semicolon, but careful with embedded semicolons (simple split for now)
    const queries = schemaSql
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    for (const [index, query] of queries.entries()) {
      console.log(`\nExecuting Query #${index + 1}:`);
      console.log(query.substring(0, 100) + "...");
      try {
        await client.query(query);
        console.log("✅ Success");
      } catch (err: any) {
        console.error("❌ Failed:", err.message);
        if (err.internalQuery) console.error("Internal Query:", err.internalQuery);
      }
    }

    // 2. Test Expedientes Schema (Manually extracted from expedientes.ts)
    console.log("\n--- Testing 'expedientes' schema ---");
    const expedientesQuery = `
    CREATE TABLE IF NOT EXISTS expedientes (
      id TEXT PRIMARY KEY,
      numero_processo VARCHAR(255) NOT NULL,
      tribunal VARCHAR(50),
      tipo VARCHAR(100),
      titulo TEXT,
      conteudo TEXT,
      data_disponibilizacao DATE,
      nome_orgao VARCHAR(255),
      autor TEXT,
      reu TEXT,
      advogado_autor TEXT,
      advogado_reu TEXT,
      lawyer_name VARCHAR(255),
      lido BOOLEAN DEFAULT false,
      arquivado BOOLEAN DEFAULT false,
      analyzed BOOLEAN DEFAULT false,
      priority VARCHAR(20) DEFAULT 'high',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `;

    try {
      console.log("\nExecuting Expedientes Create Table:");
      await client.query(expedientesQuery);
      console.log("✅ Success");
    } catch (err: any) {
      console.error("❌ Failed:", err.message);
    }
  } catch (err) {
    console.error("❌ Fatal error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

debugDb();
