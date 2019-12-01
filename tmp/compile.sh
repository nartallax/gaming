#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

gcc -c c_sample.c -Wall -Werror -O3 -fno-strict-aliasing
gcc -o c_sample c_sample.o -O3 -lm

rm c_sample.o
