/* Утилита, позволяющая назначить процессу, окно которого сейчас активно, выбранную маску доступности процессоров */

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <unistd.h>
#include <windows.h>

int main(int argv, char** argc){	
	if(argv < 2){
		fprintf(stderr, "No affinity mask supplied.");
		return 1;
	}
	
	HWND hwnd = GetForegroundWindow();
	DWORD dwPID;
	GetWindowThreadProcessId(hwnd, &dwPID);
	
	int mask = (int)atoi(argc[1]);
	
	HANDLE handle = OpenProcess(PROCESS_SET_INFORMATION, FALSE, dwPID);
	SetProcessAffinityMask(handle, mask);
	CloseHandle(handle);
	
	return 0;
}
