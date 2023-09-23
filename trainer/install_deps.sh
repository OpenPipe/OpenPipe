#! /bin/bash

set -e

cd "$(dirname "$0")"

# create the venv if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating venv..."
    python3 -m venv .venv
fi

echo "Activating venv..."
source .venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

if [ ! -d ".axolotl" ]; then
    echo "Installing axolotl..."
    git clone https://github.com/OpenAccess-AI-Collective/axolotl.git .axolotl
    (cd .axolotl && git checkout 67b9888 && pip install -e .)
fi

echo "Dependencies installed."