#! /bin/bash

set -e

cd "$(dirname "$0")/../.."

docker build . --file app/Dockerfile --tag "openpipe-prod"

# Run the image
docker run --env-file app/.env -it --entrypoint "/bin/bash" "openpipe-prod"