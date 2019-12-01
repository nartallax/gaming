/* Утилита, выдающая ID активного в данный момент окна. если ID нет - создает и возвращает */

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <windows.h>

#include "../c_commons/winById.c"

long getUnusedWindowId(){
	while(1){
		long id = rand();
		HWND hwnd = winById(id);
		if(hwnd == NULL)
			return id;
	}
	return 0;
}

int main(int argv, char** argc){
	srand(time(NULL));
	
	HWND fg = GetForegroundWindow();
	
	long winId = GetWindowLong(fg, GWL_ID);
	if(winId == 0){
		winId = getUnusedWindowId();
		SetWindowLong(fg, GWL_ID, winId);
	}
	
	printf("%li\n", winId);
	
	return 0;
}
