#!/bin/bash

# Exit on error
set -e

# Change to the directory of this script
cd "$(dirname "$0")"

export MODAL_ENVIRONMENT="dev"

# List of all apps to be deployed
declare -a apps=("src/inference_server/main.py" "src/trainer/main.py")

for app in "${apps[@]}"; do
  echo "Running $app..."
  poetry run modal serve "$app" &
done