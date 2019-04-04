#ifndef __L2CLICLI_NETWORKUTILS__
#define __L2CLICLI_NETWORKUTILS__

#include "../utils/utils.c"
#include "../utils/json.c"
#include "../code/network.c"
#include "../packages/from_login_server.c"
#include "../packages/to_login_server.c"
#include "../packages/from_game_server.c"
#include "../packages/to_game_server.c"

char* readDecodePkg(int fd, int isLoginServer){
	static byte* buffer = NULL;
	if(!buffer)
		buffer = (byte*)malloc(0xffff);
	int length = readPackage(fd, (char*)buffer, 0xffff);

	/*
	char* hex = binaryToHex(buffer, length);
	printf("Raw package bytes: %s\n", hex);
	free(hex);
	*/

	if(isLoginServer)
		return decodeLoginServerPkg(buffer, length);
	else
		return decodeGameServerPkg(buffer, length);
}

json_value* readDecodeParsePkg(int fd, int isLoginServer){
	char* pkgString = readDecodePkg(fd, isLoginServer);
	//printf("Decoded package: %s\n", pkgString);
	json_value* result = json_parse(pkgString, stringLength(pkgString));
	free(pkgString);
	return result;
}

void formatEncodeSendPkg(int fd, int isLoginServer, const char* formatString, ...){
	va_list args;
    va_start(args, formatString);
	Binwriter* writer;
	if(isLoginServer)
		writer = vformatEncodeLoginServerPkg(formatString, args);
	else
		writer = vformatEncodeGameServerPkg(formatString, args);
	writePackage(fd, writer);
	freeBinwriter(writer);
}

#endif