import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as authSchema from './schema/auth';
import * as contentSchema from './schema/content';

// Create a connection pool for better performance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);

export const schema = {
    ...authSchema,
    ...contentSchema,
};

export type Schema = typeof schema;

// Export the pool for direct queries if needed
export { pool };