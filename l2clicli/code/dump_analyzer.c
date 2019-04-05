#ifndef __L2CLICLI_DUMPANALYZER__
#define __L2CLICLI_DUMPANALYZER__

#include <stdio.h>
#include "../code/login.c"

int dumpAnalysingGameServer = 0;

void dumpDoWithOutgoingPackage(char* hex){
	int len = stringLength(hex);
	byte* bin = hexToBinary(hex, len);
	if(dumpAnalysingGameServer){
		if(gameServerEncodeXorKey){
			unxorGameServerPackage(bin, len / 2, gameServerEncodeXorKey);
		}
	} else {
		blowfishDecryptAll(loginServerBlowfishEncodingContext, bin, len / 2);
	}
	char* hex2 = binaryToHex(bin, len / 2);
	printf(">%s\n", hex2);
	free(bin);
	free(hex2);
}

void dumpDoWithIncomingPackage(char* hex){
	int len = stringLength(hex);
	byte* bin = hexToBinary(hex, len);
	char* decoded;
	if(dumpAnalysingGameServer){
		decoded = decodeGameServerPkg(bin, len / 2);
		json_value* v = json_parse(decoded, stringLength(decoded));
		if(!strcmp(jsonValueByKey(v, "type")->u.string.ptr, "CryptInit")){
			int xorKey = jsonValueByKey(v, "xorKey")->u.integer;
			setGameServerXorKey(xorKey);
		}
		json_value_free(v);
	} else {
		decoded = decodeLoginServerPkg(bin, len / 2);
	}
	free(bin);
	printf("<%s\n", decoded);
}

void runAsDumpAnalyzer(char* tokenHex){
	byte* keyBin = getBlowfishKeyFromHex(tokenHex);
	initBlowfishDecoder(keyBin);
	initBlowfishEncoder(keyBin);
	free(keyBin);

	char* lineBuffer = (char*)malloc(0xffff);
	printf("Starting to analyze dump.\n");
	fflush(stdout);
	while(1){
		size_t size = 0xffff;
		int charCount = getline(&lineBuffer, &size, stdin);
		if(charCount < 0)
			exitWithError("Failed to getline().");
		lineBuffer[charCount - 1] = 0; // newline -> string termination
		switch(lineBuffer[0]){
			case '>': 	dumpDoWithOutgoingPackage(lineBuffer + 1);	break;
			case '<':	dumpDoWithIncomingPackage(lineBuffer + 1);	break;
			case 'F':
				resetGameServerXorKey();
				dumpAnalysingGameServer = 1;
				printf("Toggled to game server dump analysis mode.\n");
				break;
		}
		fflush(stdout);
	}
}


#endif