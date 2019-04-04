#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

gcc -c main.c -Wall -Werror -O3 -fno-strict-aliasing
gcc -o l2clicli main.o -O3 -lm

rm main.o
