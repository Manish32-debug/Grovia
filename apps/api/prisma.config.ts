import path from 'node:path';
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration. Lives here rather than in package.json#prisma,
 * which is deprecated in Prisma 6 and removed in 7.
 *
 * `dotenv/config` is imported explicitly because the config file is loaded
 * before Prisma reads .env, and DATABASE_URL must already be set.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed/index.ts',
  },
});
