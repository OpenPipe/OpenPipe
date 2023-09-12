#!/usr/bin/env bash

# # Adapted from https://github.com/openai/openai-node/blob/master/build

# set -exuo pipefail

# rm -rf dist /tmp/openpipe-build-dist

# mkdir /tmp/openpipe-build-dist

# cp -rp * /tmp/openpipe-build-dist

# # Rename package name in package.json
# python3 -c "
# import json
# with open('/tmp/openpipe-build-dist/package.json', 'r') as f:
#     data = json.load(f)
# data['name'] = 'openpipe'
# with open('/tmp/openpipe-build-dist/package.json', 'w') as f:
#     json.dump(data, f, indent=4)
# "

# rm -rf /tmp/openpipe-build-dist/node_modules
# mv /tmp/openpipe-build-dist dist

# # build to .js files
# (cd dist && pnpm rollup -c)

set -exuo pipefail

rm -rf dist

pnpm rollup -c

# Move the contents of /dist/src to /dist
mv dist/src/* dist

# copy the package.json file to /dist
cp package.json dist

python3 -c "
import json

# Load the package.json file
with open('dist/package.json', 'r') as file:
    data = json.load(file)

# Change the names
data['name'] = 'openpipe'

# Write the changes back to the package.json file
with open('dist/package.json', 'w') as file:
    json.dump(data, file, indent=2)
"

(cd dist && yalc publish)
(cd ../../app && yalc add openpipe)

python3 -c "
import json

# Load the package.json file
with open('dist/package.json', 'r') as file:
    data = json.load(file)

# Revert the names
data['name'] = 'openpipe-dev'

# Write the changes back to the package.json file
with open('dist/package.json', 'w') as file:
    json.dump(data, file, indent=2)
"

(cd ../../app && pnpm install)