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
#include <Windows.h>

#define KEY_ALT_BITMASK 	0x01
#define KEY_SHIFT_BITMASK 	0x02
#define KEY_CTRL_BITMASK 	0x04
#define KEY_CAPS_BITMASK 	0x08
#define KEY_SCROLL_BITMASK 	0x10

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

int getSpecialKeyState(){
	char state[256];
	GetKeyState(0);
	GetKeyboardState(state);
	
	return
		(state[VK_MENU] & 0x80?		KEY_ALT_BITMASK: 	0) |
		(state[VK_CONTROL] & 0x80?	KEY_CTRL_BITMASK:	0) |
		(state[VK_SHIFT] & 0x80? 	KEY_SHIFT_BITMASK:	0) |
		(state[VK_CAPITAL] & 0x01?	KEY_CAPS_BITMASK:	0) |
		(state[VK_SCROLL] & 0x01? 	KEY_SCROLL_BITMASK:	0);
}

const char* getSpecialKeyJsonFormat = "{\"ctrl\": %i, \"alt\": %i, \"shift\": %i, \"caps\": %i, \"scroll\": %i, \"extended\": %i, \"injected\": %i}";
char* getSpecialKeyJson(BOOL isExtended, BOOL isInjected){
	int state = getSpecialKeyState();
	char* result = malloc(strlen(getSpecialKeyJsonFormat) + 10);
	sprintf(result, getSpecialKeyJsonFormat, 
		state & KEY_CTRL_BITMASK? 1: 0, 
		state & KEY_ALT_BITMASK? 1: 0, 
		state & KEY_SHIFT_BITMASK? 1: 0, 
		state & KEY_CAPS_BITMASK? 1: 0,
		state & KEY_SCROLL_BITMASK? 1: 0,
		isExtended? 1: 0,
		isInjected? 1: 0
	);
	return result;
}


typedef struct {
	HWND hwnd;
	DWORD pid, tid;
	char* title;
} WinShortDescription;

WinShortDescription* currentWindow = NULL;

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

const char* winShortDescriptionToJsonPattern = "{\"title\": \"%s\", \"pid\": %li, \"tid\": %li, \"hwnd\": %li}";
char* winShortDescriptionToJson(WinShortDescription* desc){
	if(!desc){
		char* result = malloc(sizeof(char) * 5);
		memcpy(result, "null", 5);
		return result;
	}
	
	char* escapedTitle = jsonEscapeString(desc->title);
	char* result = malloc(sizeof(char) * (strlen(winShortDescriptionToJsonPattern) + 300));
	int sprintfResult = sprintf(result, winShortDescriptionToJsonPattern, escapedTitle, desc->pid, desc->tid, desc->hwnd);
	if(sprintfResult < 0){
		printLastError("format winShortDescription");
		return NULL;
	}
	
	free(escapedTitle);
	return result;
}

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
	
	if(isProcessed){
		PKBDLLHOOKSTRUCT p = (PKBDLLHOOKSTRUCT)lParam;
		BOOL isExtended = p->flags & LLKHF_EXTENDED;
		BOOL isInjected = p->flags & LLKHF_INJECTED;
		char* mods = getSpecialKeyJson(isExtended, isInjected);
		WinShortDescription* currentWin = describeForegroundWindow();
		char* window = winShortDescriptionToJson(currentWin);
		free(currentWin);
		printf("{\"type\": \"key\", \"direction\": \"%s\", \"mods\": %s, \"vk\": %li, \"sc\": %li, \"window\": %s}\n", isDown? "down": "up", mods, p->vkCode, p->scanCode, window);
		fflush(stdout);
		free(mods);
		free(window);
	}
	
	return CallNextHookEx(0, code, wParam, lParam);
}

BOOL installKeyboardHook(){ return SetWindowsHookEx(WH_KEYBOARD_LL, onKeyboardEvent, 0, 0)? TRUE: FALSE; }

void onForegroundWindowChanged(HWINEVENTHOOK hook, DWORD event, HWND hwnd,	
                         LONG idObject, LONG idChild,
                         DWORD dwEventThread, DWORD dwmsEventTime){
						
	WinShortDescription* oldWindow = currentWindow;
	currentWindow = describeWindow(hwnd);
	
	char* oldDescJson = winShortDescriptionToJson(oldWindow);
	char* newDescJson = winShortDescriptionToJson(currentWindow);
	
	printf("{\"type\": \"foreground_window_change\", \"from\": %s, \"to\": %s}\n", oldDescJson, newDescJson);
	fflush(stdout);
	
	free(oldDescJson);
	free(newDescJson);
	free(oldWindow);
}

BOOL installWindowChangeHook(){ 
	return SetWinEventHook(EVENT_SYSTEM_FOREGROUND, 
		EVENT_SYSTEM_FOREGROUND, 0, 
		onForegroundWindowChanged, 0, 0, 
		WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS)? TRUE: FALSE;
}

int main(int argv, char** argc){
	MSG msg;
	PeekMessage(&msg, 0, 0, 0, 0); // creating a thread-related message queue to avoid strange bugs
	
	if(!installKeyboardHook()){
		printLastError("install keyboard hook");
		return 1;
	}
	/*
	if(!installWindowChangeHook()){
		printLastError("install window change hook");
		return 1;
	}
	*/
	currentWindow = describeForegroundWindow();
	while(GetMessage(&msg, 0, 0, 0)); // nothing to do with them; just infinite loop
	
	return 0;
}
