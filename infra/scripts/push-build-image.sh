#!/bin/bash

set -e
cd "$(dirname "$0")/../"

# Load environment variables from .env file. remove any lines starting with #
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else 
    echo ".env file not found"
    exit 1
fi

# Define image variables
IMAGE_FULL_NAME="ghcr.io/openpipe/deploy-infra:latest"

# Check if required variables are set
if [ -z "$GITHUB_USERNAME" ] || [ -z "$GITHUB_PAT" ]; then
    echo "GITHUB_USERNAME and GITHUB_PAT must be set in the .env file."
    exit 1
fi

# Login to GitHub Container Registry
echo $GITHUB_PAT | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

docker buildx create --use


# Build the Docker image
docker buildx build --platform linux/amd64,linux/arm64 -t $IMAGE_FULL_NAME --push .

echo "Docker image pushed to GitHub Container Registry"
