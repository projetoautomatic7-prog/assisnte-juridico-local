import dotenv from "dotenv";
import path from "path";

// Load environment variables immediately
const envPath = path.resolve(process.cwd(), ".env.local");
// console.log(`[EnvLoader] Loading env from: ${envPath}`);
dotenv.config({ path: envPath });
dotenv.config(); // Fallback to .env
