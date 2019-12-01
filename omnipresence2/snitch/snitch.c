/*
утилита для сбора всякой информации с графического окна Lineage II
*/

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <unistd.h>
#include <windows.h>

#include "../c_commons/winById.c"
#include "../c_commons/streaming.c"

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

float mpAmount(HDC dc){
	return findBarState(dc, mpY, mpRLimit);
}

float hpAmount(HDC dc){
	return findBarState(dc, hpY, hpRLimit);
}

// возвращает состояния полосок, упакованных в один инт
int getBarState(HWND target){
	HDC dc = GetDC(target);
	return (((int)(hpAmount(dc) * 0xfff)) << 12) | (int)(mpAmount(dc) * 0xfff);
}

int floatToInt(float f){
	return (int)(f * 0xfff);
}

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

	HDC dc = GetDC(targetHwnd);
	
	char line[80];
	while(1){
		if(fgets(line, 80, stdin)) {
			switch(line[0]){
				case 'h':{ // hp
					fprintf(stdout, "%i\n", floatToInt(hpAmount(dc)));
					break;
				}
				case 'm':{ // hp
					fprintf(stdout, "%i\n", floatToInt(mpAmount(dc)));
					break;
				}
				case 'p':{ // color at point
					int x = readIntByDigits(line, 1);
					int y = readIntByDigits(line, 1 + intDigitsCount);
					COLORREF color = GetPixel(dc, x, y);
					int r = GetRValue(color);
					int g = GetGValue(color);
					int b = GetBValue(color);
					fprintf(stdout, "{\"r\":%i,\"g\":%i,\"b\":%i}\n", r, g, b);
					break;
				}
				case 's':{ // window size
					RECT rect;
					GetWindowRect(targetHwnd, &rect);
					fprintf(stdout, "{\"x\":%li,\"y\":%li,\"w\":%li,\"h\":%li}\n", 
						rect.left, rect.top, 
						rect.right - rect.left, rect.bottom - rect.top);
					break;
				}
			}
		}
	}

	return 0;
}
