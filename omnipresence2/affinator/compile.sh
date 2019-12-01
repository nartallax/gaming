#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

i686-w64-mingw32-gcc -c affinator.c -Wall -Werror -O3 -m32
i686-w64-mingw32-gcc -o affinator.exe affinator.o -O3

rm affinator.o
