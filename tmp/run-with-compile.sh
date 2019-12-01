#!/bin/bash


cd "$( dirname "${BASH_SOURCE[0]}" )"

set -e

./compile.sh

#DISPLAY=:0 WINEPREFIX=/home/nartallax/.winela2_64 wine c_sample.exe "$@"
./c_sample "$@"

