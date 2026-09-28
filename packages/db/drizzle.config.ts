import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./supabase/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:54322/postgres",
  },
} satisfies Config;
