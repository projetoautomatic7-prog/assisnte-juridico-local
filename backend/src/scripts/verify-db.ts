import dotenv from "dotenv";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function verifyDb() {
  console.log("🔍 Verifying database connection...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined in .env");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connection established successfully!");

    // Check tables
    console.log("🔍 Checking tables...");
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'doc')
    `);

    const tables = res.rows.map((r) => r.table_name);
    console.log("📂 Tables found:", tables.join(", "));

    const requiredTables = ["expedientes", "minutas"];
    const missingTables = requiredTables.filter((t) => !tables.includes(t));

    if (missingTables.length > 0) {
      console.error("❌ Missing required tables:", missingTables.join(", "));
      process.exit(1);
    } else {
      console.log("✅ All required tables found.");
    }

    // Insert test record into minutas
    console.log("✍️  Testing valid insert...");
    const testId = "00000000-0000-0000-0000-000000000001"; // Test UUID

    // Clean up previous test run if exists
    await client.query("DELETE FROM minutas WHERE id = $1", [testId]);

    await client.query(
      `
      INSERT INTO minutas (id, titulo, conteudo, tipo, status, autor)
      VALUES ($1, 'Test Minuta', 'Content test', 'outro', 'rascunho', 'Tester')
    `,
      [testId]
    );
    console.log("✅ Insert successful.");

    // Read back
    const readRes = await client.query("SELECT * FROM minutas WHERE id = $1", [testId]);
    if (readRes.rows.length === 1) {
      console.log("✅ Read successful.");
    } else {
      console.error("❌ Read failed.");
      process.exit(1);
    }

    // Clean up
    await client.query("DELETE FROM minutas WHERE id = $1", [testId]);
    console.log("✅ Clean up successful.");

    client.release();
    console.log("🎉 Database verification completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Database verification failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyDb();
