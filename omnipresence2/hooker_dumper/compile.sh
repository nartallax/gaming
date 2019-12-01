#!/bin/bash

cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

i686-w64-mingw32-gcc -c hooker_dumper.c -Wall -Werror -O3 -m32
i686-w64-mingw32-gcc -o hooker_dumper.exe hooker_dumper.o -O3

rm hooker_dumper.o
