#ifndef __L2CLIBOT_FROM_GAME_SERVER_PACKAGES__
#define __L2CLIBOT_FROM_GAME_SERVER_PACKAGES__

#include "../utils.c"
#include "../json/json.h"
#include "../json_utils.c"
#include "../binreader.c"
#include "./game_server.c"

void unxorGameServerPackage(byte* input, int length){
	int prevByte = 0;
	for(int i = 0; i < length; i++){
		byte b = input[i];
		input[i] ^= gameServerDecodeXorKey[i & 7] ^ prevByte;
		prevByte = b;
	}

	updateGameServerXorKey(gameServerDecodeXorKey, length);
}

char* decodeGameCryptInitPackage(Binreader* pkg){
	readByte(pkg); // first byte skip
	int xorKey = readInt(pkg);
	return formatToString("{\"type\":\"CryptInit\",\"xorKey\":%i}", xorKey);
}

char* decodeGameCharacterListPackage(Binreader* pkg){
	int count = readInt(pkg);
	char** chs = (char**)malloc(sizeof(char*) * count);
	for(int i = 0; i < count; i++){
		char* name = readUtf16StringAsAscii(pkg);
		readInt(pkg); // id
		free(readUtf16StringAsAscii(pkg)); // title? login?
		pkg->position += (4 * 60) + (8 * 4);
		int lastUsed = readInt(pkg);
		readByte(pkg);
		chs[i] = formatToString("{\"nick\":\"%s\",\"lastUsed\":%s}", name, lastUsed? "true": "false");
		free(name);
	}

	char* chArr = joinStrings(chs, count, ",");
	for(int i = 0; i < count; i++)
		free(chs[i]);
	free(chs);

	return formatToString("{\"type\":\"CharacterList\",\"characters\":[%s]}", chArr);
}

char* decodeGameCharacterSelectedPackage(Binreader* pkg){
	char* name = readUtf16StringAsAscii(pkg);
	readInt(pkg); // id
	free(readUtf16StringAsAscii(pkg)); // title
	pkg->position += 4 * 10;
	double hp = readDouble(pkg);
	double mp = readDouble(pkg);
	int sp = readInt(pkg);
	int exp = readInt(pkg);
	int lvl = readInt(pkg);
	char* result = formatToString(
		"{\"type\":\"CharacterSelected\",\"name\":\"%s\",\"hp\":%f,\"mp\":%f,\"sp\":%i,\"exp\":%i,\"lvl\":%i}",
		name, hp, mp, sp, exp, lvl
	);
	free(name);
	return result;
}

char* decodeGameSSQInfoPackage(Binreader* pkg){
	char* winner;
	switch(readShort(pkg)){
		case 258:	winner = "dawn";	break;
		case 257:	winner = "dusk";	break;
		case 256:	winner = "none";	break;
		default:	winner = "unknown";	break;
	}
	return formatToString("{\"type\":\"SSQInfo\",\"winner\":\"%s\"}", winner);
}

char* decodeGamePingRequestPackage(Binreader* pkg){
	int id = readInt(pkg);
	return formatToString("{\"type\":\"Ping\",\"id\":%i}", id);
}

char* decodeGameUnknownPackage(Binreader* pkg, byte type){
	return formatToString("{\"type\":\"Unknown\",\"id\":%i}", type);
}

char* decodeGameServerPkg(byte* pkgBytes, int length){
	if(gameServerDecodeXorKey){
		unxorGameServerPackage(pkgBytes, length);
	}

	Binreader* pkg = getBinreader(pkgBytes, length);

	char* result;
	byte pkgType = readByte(pkg);
	switch(pkgType){
		case 0x00:	result = decodeGameCryptInitPackage(pkg);			break;
		case 0x13:	result = decodeGameCharacterListPackage(pkg);		break;
		case 0x15:	result = decodeGameCharacterSelectedPackage(pkg);	break;
		case 0xf8:	result = decodeGameSSQInfoPackage(pkg);				break;
		case 0xd3:	result = decodeGamePingRequestPackage(pkg);			break;
		default: 	result = decodeGameUnknownPackage(pkg, pkgType);	break;
	}
	
	free(pkg);
	return result;
}

#endif