/* функция получения HWND окна по его ID */

HWND winByIdSearchedHwnd;
long winByIdSearchedId = 0;
BOOL CALLBACK winByIdEnumWindowsProc(HWND hwnd, LPARAM lParam){
	long winId = GetWindowLong(hwnd, GWL_ID);
	if(winId == winByIdSearchedId){
		winByIdSearchedHwnd = hwnd;
	}
	return winByIdSearchedHwnd == NULL;
}

HWND winById(long id){
	winByIdSearchedHwnd = NULL;
	winByIdSearchedId = id;
	EnumWindows(winByIdEnumWindowsProc, 0);
	return winByIdSearchedHwnd;
}