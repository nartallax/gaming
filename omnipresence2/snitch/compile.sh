#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

i686-w64-mingw32-gcc -c snitch.c -Wall -Werror -O3 -m32 -lgdi32
i686-w64-mingw32-gcc -o snitch.exe snitch.o -O3 -lgdi32

rm snitch.o