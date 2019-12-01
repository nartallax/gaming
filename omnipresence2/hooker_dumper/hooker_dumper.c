/*
небольшая утилитка, позволяющая забыть о мучениях с хуками... ну, на время
выводит в stdout в JSON-е все события нажатия клавиш и смены foreground окон, по одному JSON-объекту на строчке

hooker - шлюха, dumper - самосвал; so be this util called шмаровоз!
*/

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <unistd.h>
#include <windows.h>

#include "../c_commons/winById.c"
#include "../c_commons/printLastError.c"

char* jsonEscapeString(char* raw){
	int rawLen = strlen(raw);
	int newLen = rawLen;
	int i, j = 0;
	for(i = 0; i < rawLen; i++){
		if(raw[i] == '"' || raw[i] == '\\') newLen++;
	}
	
	char* result = malloc(sizeof(char) * (newLen + 1));
	for(i = 0; i < rawLen; i++){
		if(raw[i] == '"'){
			result[j++] = '\\';
			result[j++] = '"';
		} else if(raw[i] == '\\'){
			result[j++] = '\\';
			result[j++] = '\\';
		} else {
			result[j++] = raw[i];
		}
	}
	
	result[j++] = '\0';
	
	return result;
}

int ctrlDown = 0;
int altDown = 0;
int shiftDown = 0;

const char* getSpecialKeyJsonFormat = "{\"ctrl\":%i,\"alt\":%i,\"shift\":%i}";
char* getSpecialKeyJson(){
	char* result = malloc(strlen(getSpecialKeyJsonFormat) + 10);
	sprintf(result, getSpecialKeyJsonFormat, ctrlDown, altDown, shiftDown);
	return result;
}


typedef struct {
	HWND hwnd;
	DWORD pid, tid;
	char* title;
} WinShortDescription;

WinShortDescription* createDescription(HWND hwnd, DWORD pid, DWORD tid, char* title){
	WinShortDescription* result = malloc(sizeof(WinShortDescription));
	result->hwnd = hwnd;
	result->pid = pid;
	result->tid = tid;
	result->title = title;
	return result;
}

char* getTitleFrom(HWND hwnd){ 
	char* titleBuffer = malloc(sizeof(char) * 256);
	GetWindowText(hwnd, titleBuffer, 256);
	return titleBuffer;
} 

WinShortDescription* describeWindow(HWND hwnd){
	if(!hwnd) return NULL;
	
	DWORD pid;
	DWORD tid = GetWindowThreadProcessId(hwnd, &pid);
	if(!tid || !pid){
		printLastError("acquire PID and TID by HWND");
		return NULL;
	}
	
	return createDescription(hwnd, pid, tid, getTitleFrom(hwnd));
}

WinShortDescription* describeForegroundWindow(){ return describeWindow(GetForegroundWindow()); }

HWND targetHwnd;
LRESULT CALLBACK onKeyboardEvent(int code, WPARAM wParam, LPARAM lParam) {
	BOOL isProcessed = FALSE;
	BOOL isDown = FALSE;
	switch(wParam){
		case WM_KEYDOWN:
		case WM_SYSKEYDOWN:
			isProcessed = TRUE;
			isDown = TRUE;
			break;
		case WM_KEYUP:
		case WM_SYSKEYUP:
			isProcessed = TRUE;
			isDown = FALSE;
			break;
	}
	
	PKBDLLHOOKSTRUCT p = (PKBDLLHOOKSTRUCT)lParam;
	if(isProcessed){
		switch(p->vkCode){
			case VK_SHIFT:
			case VK_LSHIFT:
			case VK_RSHIFT:
				shiftDown = isDown? 1: 0;
				break;
			case VK_CONTROL:
			case VK_LCONTROL:
			case VK_RCONTROL:
				ctrlDown = isDown? 1: 0;
				break;
			case VK_MENU:
			case VK_LMENU:
			case VK_RMENU:
				altDown = isDown? 1: 0;
				break;
		}
		
		HWND fgHwnd = GetForegroundWindow();
		isProcessed = isProcessed && targetHwnd == fgHwnd;
	}
	
	if(isProcessed){
		char* mods = getSpecialKeyJson();
		printf("{\"up\":%s,\"mods\":%s,\"vk\":%li,\"sc\":%li}\n", isDown? "false": "true", mods, p->vkCode, p->scanCode);
		fflush(stdout);
		free(mods);
		
		if((p->vkCode >= 0x70 && p->vkCode <= 0x7b) || (shiftDown && p->vkCode == 0x1b)){
			// не пропускаем дальше f1-f12 и shift+esc
			return 1;
		}
	}
	
	return CallNextHookEx(0, code, wParam, lParam);
}

BOOL installKeyboardHook(){ return SetWindowsHookEx(WH_KEYBOARD_LL, onKeyboardEvent, 0, 0)? TRUE: FALSE; }

int main(int argv, char** argc){
	if(argv < 2){
		fprintf(stderr, "Expected window ID as second parameter.\n");
		return 1;
	}
	
	long targetWindowId = (long)atoi(argc[1]);
	targetHwnd = winById(targetWindowId);
	if(targetHwnd == NULL){
		fprintf(stderr, "Target window not found (ID = %li)\n", targetWindowId);
		return 1;
	}
	
	MSG msg;
	PeekMessage(&msg, 0, 0, 0, 0); // creating a thread-related message queue to avoid strange bugs
	
	if(!installKeyboardHook()){
		printLastError("install keyboard hook");
		return 1;
	}
	
	while(GetMessage(&msg, 0, 0, 0)); // nothing to do with them; just infinite loop
	
	return 0;
}
