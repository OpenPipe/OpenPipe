#!/bin/bash

set -e
cd "$(dirname "$0")/../"

npm install
pulumi up --stack=stage -f