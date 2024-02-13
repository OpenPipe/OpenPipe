#!/bin/bash

# Exit on error
set -e

# Change to the directory of this script
cd "$(dirname "$0")"

# Default environment
ENV="dev"

# List of valid environments
VALID_ENVS=("dev" "prod")

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --env=*)
      ENV="${arg#*=}"
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Check if the provided environment is valid
if [[ ! " ${VALID_ENVS[@]} " =~ " ${ENV} " ]]; then
  echo "Error: Invalid environment '$ENV'. Valid environments are ${VALID_ENVS[*]}."
  exit 1
fi

# Echo the current environment
echo "Deploying in environment: $ENV"

# List of all apps to be deployed
declare -a apps=("src.trainer.main" "src.lora_inference.main" "src.inference_server.main")

# Deploy all apps
for app in "${apps[@]}"; do
  echo "Deploying $app..."
  MODAL_ENVIRONMENT="$ENV" poetry run modal deploy "$app"
done
