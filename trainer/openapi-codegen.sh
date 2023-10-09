#! /bin/bash

set -e

cd "$(dirname "$0")"

rm -rf open_pipe_internal_api_client open-pipe-internal-api-client

poetry run openapi-python-client generate --url http://localhost:3000/api/internal/v1/openapi.json

rm -rf ./src/api_client 
mv open-pipe-internal-api-client/open_pipe_internal_api_client ./src/api_client
rm -rf open-pipe-internal-api-client