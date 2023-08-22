#! /bin/bash

set -e
cd "$(dirname "$0")/.."
apt-get update
apt-get install -y htop psql