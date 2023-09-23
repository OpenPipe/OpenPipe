#! /bin/bash

set -e

cd "$(dirname "$0")"

rm -rf open_pipe_internal_api_client open-pipe-internal-api-client

poetry run openapi-python-client generate --path ./openapi.json

rm -rf trainer/api_client 
mv open-pipe-internal-api-client/open_pipe_internal_api_client trainer/api_client
rm -rf open-pipe-internal-api-client