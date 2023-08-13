#! /bin/bash

set -e

cd "$(dirname "$0")/.."

source app/.env

docker build . --file app/Dockerfile