#include <windows.h>

void printLastError(char* action){
	LPSTR messageBuffer = 0;
	int errorCode = GetLastError();
	FormatMessage(
		FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS, 
		NULL, errorCode, MAKELANGID(LANG_ENGLISH, SUBLANG_ENGLISH_US), (LPSTR)&messageBuffer, 0, NULL);
		
	if(messageBuffer){
		fprintf(stderr, "Failed to %s: error %s\n", action, messageBuffer);
		fflush(stderr);
		LocalFree(messageBuffer);
	} else {
		fprintf(stderr, "Failed to %s: unknown error, code %i\n", action, errorCode);
		fflush(stderr);
	}
}