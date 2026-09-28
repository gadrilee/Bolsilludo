import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// This is a placeholder for the DB connection logic
// The actual connection string will come from the environment in the API layer

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:54322/postgres";
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from './schema';
