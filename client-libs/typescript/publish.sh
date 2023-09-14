#!/usr/bin/env bash

# Adapted from https://github.com/openai/openai-node/blob/master/build

set -exuo pipefail

./build.sh

(cd dist && pnpm publish --access public --no-git-checks)
