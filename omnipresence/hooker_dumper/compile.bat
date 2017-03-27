@echo off

rem C:\Dev-Cpp\bin\gcc.exe -c hooker_dumper_dll.c -Wall -Werror
rem C:\Dev-Cpp\bin\gcc.exe -shared -o hooker_dumper.dll hooker_dumper_dll.o
rem del hooker_dumper_dll.o

del hooker_dumper.exe 2> NUL
C:\Dev-Cpp\bin\gcc.exe -c hooker_dumper.c -Wall -Werror -O3 -m32
C:\Dev-Cpp\bin\gcc.exe -o hooker_dumper.exe hooker_dumper.o -O3
del hooker_dumper.o 2> NUL