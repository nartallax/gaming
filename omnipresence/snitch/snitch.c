/*
утилита для сбора всякой информации с графического окна Lineage II
*/

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <unistd.h>
#include <Windows.h>

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


//TODO: cache here?
HDC dcOf(HWND target){ return GetDC(target); }

int goodHpR = 170,// badHpR = 88,
	goodMpR = 5, //badMpR = 19,
	hpY = 42, mpY = 56,
	barStart = 16, barEnd = 165,
	hpRLimit = 135, //higher is good
	mpRLimit = -13;	//higher is bad
	

float findBarState(HDC dc, int y, int limitR){
	int start = barStart, end = barEnd;
	int i = 10;
	while(i-->0){
		int r = GetRValue(GetPixel(dc, end, y));
		int dist = end - start;
		int isGood = limitR > 0? r > limitR: r < -limitR;
		//fprintf(stdout, "r at %i,%i is %i; good = %i\n", start, end, r, isGood);
		if(isGood){
			start = end;
			end += dist / 2;
		} else {
			end -= (dist / 2) + 1;
		}
		
		if(end <= barStart){
			end = barStart;
			break;
		} else if(end >= barEnd){
			end = barEnd;
			break;
		} else if(end < start){
			break;
		}
	}
	
	return (float)(end - barStart) / (float)(barEnd - barStart);
}

// возвращает состояния полосок, упакованных в один инт
int getBarState(HWND target){
	HDC dc = dcOf(target);
	
	float hp = findBarState(dc, hpY, hpRLimit),
		mp = findBarState(dc, mpY, mpRLimit);
	
	return (((int)(hp * 0xfff)) << 12) | (int)(mp * 0xfff);
}

int main(int argv, char** argc){
	//fprintf(stdout, "%p\n", GetForegroundWindow());
	//fprintf(stdout, "%i\n", getBarState((HWND)16189480));
	
	return 0;
}
