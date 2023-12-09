#! /bin/bash

set -e

echo "Migrating the database"
pnpm prisma migrate deploy

echo "Starting the server"
pnpm start
