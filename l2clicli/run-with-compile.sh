#!/bin/bash


cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

./compile.sh
./l2clicli "$@"

