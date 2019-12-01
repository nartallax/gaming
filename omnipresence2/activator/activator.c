/* утилита, регулярно рассылающая всем окнам с заголовком "Lineage II" сообщение WM_ACTIVATE */

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <unistd.h>
#include <windows.h>

void activate(HWND hwnd){
	PostMessage(hwnd, WM_ACTIVATE, 1, 0);
}

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam){
	char title[80];
	GetWindowText(hwnd,title,sizeof(title));
	if(strcmp(title, "Lineage II") == 0){
		activate(hwnd);
	}
	return TRUE;
}

void activateAll(){
	EnumWindows(EnumWindowsProc, 0);
}

int main(int argv, char** argc){
	while(1){
		activateAll();
		sleep(1);
	}
	
	
	return 0;
}
