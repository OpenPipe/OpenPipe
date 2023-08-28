#!/usr/bin/env bash

# Adapted from https://github.com/openai/openai-node/blob/master/build

set -exuo pipefail

rm -rf dist /tmp/openpipe-build-dist

mkdir /tmp/openpipe-build-dist

cp -rp * /tmp/openpipe-build-dist

mv /tmp/openpipe-build-dist dist
rm -rf dist/node_modules

# build to .js files
(cd dist && npm exec tsc -- --noEmit false)
