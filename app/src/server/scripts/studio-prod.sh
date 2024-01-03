#! /bin/bash

set -e
cd "$(dirname "$0")/../../.."


set -o allexport
source .env
set +o allexport

echo "Connecting to prod db"
DATABASE_URL=$PROD_DATABASE_URL pnpm prisma studio --port 5556