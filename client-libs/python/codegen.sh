#! /bin/bash

set -e

cd "$(dirname "$0")"

poetry run openapi-python-client generate --path ../openapi.json

rm -rf openpipe/api_client
mv open-pipe-api-client/open_pipe_api_client openpipe/api_client
rm -rf open-pipe-api-client