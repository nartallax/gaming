/* Утилита, позволяющая слать выбранному окну нажатия клавиш */

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <unistd.h>
#include <windows.h>

#include "../c_commons/winById.c"
#include "../c_commons/streaming.c"

int main(int argv, char** argc){	
	if(argv < 2){
		fprintf(stderr, "Expected window ID as second parameter.\n");
		return 1;
	}
	
	long targetWindowId = (long)atoi(argc[1]);
	HWND targetHwnd = winById(targetWindowId);
	if(targetHwnd == NULL){
		fprintf(stderr, "Target window not found (ID = %li)\n", targetWindowId);
		return 1;
	}
	
	char line[80];
	while(1){
		if(fgets(line, 80, stdin)){
			switch(line[0]){
				case 'c':{ // character to type
					int charCode = readIntByDigits(line, 1);
					PostMessage(targetHwnd, WM_CHAR, charCode, 0);
					break;
				}
				case 'k':{ // some key
					int vk = readIntByDigits(line, 1);
					int sc = MapVirtualKey(vk, 0);
					int down = line[1 + intDigitsCount] == '1';
					PostMessage(targetHwnd, down? WM_KEYDOWN: WM_KEYUP, vk, sc << 16);
					break;
				}
				case 'f':{ // bring-to-front
					SetForegroundWindow(targetHwnd);
					BringWindowToTop(targetHwnd);
					break;
				}
			}
		}
	}
	
	
	return 0;
}
