#! /bin/bash

set -e
cd "$(dirname "$0")/../../.."


set -o allexport
source .env
set +o allexport

echo "Connecting to remote db"
DATABASE_URL=$REMOTE_DATABASE_URL pnpm prisma studio --port 5556