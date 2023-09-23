#! /bin/bash

set -e

cd "$(dirname "$0")"

rm -rf open_pipe_docker_api_client open-pipe-docker-api-client

poetry run openapi-python-client generate --path ./openapi.json

rm -rf docker_client/api_client 
mv open-pipe-docker-api-client/open_pipe_docker_api_client docker_client/api_client
rm -rf open-pipe-docker-api-client