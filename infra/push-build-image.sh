#!/bin/bash

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | xargs)
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


# Build the Docker image
docker build -t $IMAGE_FULL_NAME .

# Push the Docker image to GitHub Container Registry
docker push $IMAGE_FULL_NAME

echo "Docker image pushed to GitHub Container Registry"