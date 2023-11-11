#! /bin/bash

set -e

echo "Migrating the database"
pnpm prisma migrate deploy

echo "Starting 4 workers"

pnpm concurrently --kill-others "pnpm worker" "pnpm worker" "pnpm worker" "pnpm worker"
