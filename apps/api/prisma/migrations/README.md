# Migrations

The initial migration is generated on your machine rather than committed
pre-built, because it must be produced by the same Prisma version you run.

```bash
# 1. generate the migration without applying it
pnpm db:migrate:create --name init

# 2. append the constraints Prisma cannot express
cat apps/api/prisma/sql/init-extras.sql >> apps/api/prisma/migrations/*_init/migration.sql

# 3. apply it, then seed
pnpm db:migrate
pnpm db:seed
```

Step 2 is not optional. `init-extras.sql` contains the generated `searchVector`
column, the trigram indexes, the partial unique indexes and every `CHECK`
constraint. The services written from phase 4 onward assume all of them exist —
without them, concurrent checkouts oversell and search returns nothing.

Once appended, the SQL is part of the committed migration, so `prisma migrate
reset`, CI and production deploys all get it automatically. Later migrations are
ordinary `pnpm db:migrate` runs.
