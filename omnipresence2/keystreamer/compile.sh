#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

i686-w64-mingw32-gcc -c keystreamer.c -Wall -Werror -O3 -m32
i686-w64-mingw32-gcc -o keystreamer.exe keystreamer.o -O3

rm keystreamer.o
