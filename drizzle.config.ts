import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { schema } from './db';

export default defineConfig({
    out: './drizzle',
    schema: './db/schema/*',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    verbose: true,
    strict: true,
});
