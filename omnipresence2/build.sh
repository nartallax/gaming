#!/bin/bash

rm -rf js 2> /dev/null
set -e
node ../../ts-bundler/main.js --tsconfig ./tsconfig.json --entry-point main --entry-point-function run --fancy --environment node > omnipresence.js
rm -rf js
