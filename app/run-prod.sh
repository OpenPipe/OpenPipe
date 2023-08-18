#! /bin/bash

set -e

echo "Migrating the database"
pnpm prisma migrate deploy

echo "Migrating promptConstructors"
pnpm tsx src/promptConstructor/migrate.ts

echo "Starting the server"

pnpm start
