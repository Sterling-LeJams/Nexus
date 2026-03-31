import "dotenv/config";

// --------------------------------
// --- App Configuration ---
// --------------------------------

export const config = {
  apsClientId: requireEnv("APS_CLIENT_ID"),
  apsClientSecret: requireEnv("APS_CLIENT_SECRET"),
  apsCallbackUrl:
    process.env["APS_CALLBACK_URL"] ?? "http://localhost:3001/api/acc/callback",
  apsBucket:
    process.env["APS_BUCKET"] ??
    `${requireEnv("APS_CLIENT_ID").toLowerCase()}-nexus`,
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceKey: requireEnv("SUPABASE_SERVICE_KEY"),
  databaseUrl: requireEnv("DATABASE_URL"),
  port: Number(process.env["PORT"] ?? "3001"),
  frontendUrl: process.env["FRONTEND_URL"] ?? "http://localhost:5173",
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
