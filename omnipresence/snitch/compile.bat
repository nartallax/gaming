@echo off

set COMPILER="C:\Program Files\mingw-w64\x86_64-7.1.0-posix-seh-rt_v5-rev2\mingw64\bin\gcc.exe"

del snitch.dll 2> NUL
del snitch.exe 2> NUL

%COMPILER% -c snitch.c -Wall -Werror -O3 -m64
%COMPILER% -shared -o snitch.dll snitch.o -O3 -lgdi32
rem %COMPILER% -o snitch.exe snitch.o -O3 -lgdi32


del snitch.o 2> NUL
rem del snitch.o 2> NUL
