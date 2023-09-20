#!/usr/bin/env bash

set -exuo pipefail

rm -rf dist

npx tsup

# copy the package.json file to /dist
cp package.json dist

# copy the README.md file to /dist
cp README.md dist

python3 -c "
import json

# Load the package.json file
with open('dist/package.json', 'r') as file:
    data = json.load(file)

# Change the names
data['name'] = 'openpipe'

# Copy all keys from publishConfig to root
data.update(data['publishConfig'])

# Write the changes back to the package.json file
with open('dist/package.json', 'w') as file:
    json.dump(data, file, indent=2)
"

(cd dist && yalc publish)
