#!/usr/bin/env bash

# Adapted from https://github.com/openai/openai-node/blob/master/build

set -exuo pipefail

rm -rf dist /tmp/openpipe-build-dist

mkdir /tmp/openpipe-build-dist

cp -rp * /tmp/openpipe-build-dist

# Rename package name in package.json
python3 -c "
import json
with open('/tmp/openpipe-build-dist/package.json', 'r') as f:
    data = json.load(f)
data['name'] = 'openpipe'
with open('/tmp/openpipe-build-dist/package.json', 'w') as f:
    json.dump(data, f, indent=4)
"

rm -rf /tmp/openpipe-build-dist/node_modules
mv /tmp/openpipe-build-dist dist

# build to .js files
(cd dist && pnpm rollup -c)
