/**
 * Немного о том, откуда брать токен для Blowfish
 * Он зашит в engine.dll
 * Для его извлечения существует прога EngineExt, но у меня она не завелась
 * Поэтому можно сдампить engine.dll с помощью, например, LordPE
 */

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#define MAX_PACKAGE_SIZE 0xffff

#include <stdio.h>
#include <unistd.h>

#include "utils.c"
#include "blowfish_utils.c"
#include "hex.c"
#include "packages/from_login_server.c"
#include "packages/to_login_server.c"
#include "packages/from_game_server.c"
#include "packages/to_game_server.c"
#include "network.c"

const char* defaultKeyHex = "5F3B352E5D39342D33313D3D2D257854215E5B24";

char* bytesAsChars(byte* bytes, int length){
	char* result = (char*)malloc(length + 1);
	for(int i = 0; i < length; i ++){
		result[i] = bytes[i];
	}
	result[length] = 0;
	return result;
}

void testKey(const char* source, int keyNum){
	
	/*
	BLOWFISH_CTX* bfctx = (BLOWFISH_CTX*)malloc(sizeof(BLOWFISH_CTX));
	char* key = keys[keyNum];
	byte* keyBytes = hexToBinary(key, stringLength(key));

	byte* keyBytes2 = (byte*)malloc(21);
	for(int i = 0; i < 20; i++)
		keyBytes2[i] = keyBytes[i];
	keyBytes2[20] = 0;
	*/
/*
	char* key = keysRaw[keyNum];

	Blowfish_Init(bfctx, (byte*)key, 21);

	int hexLen = stringLength(source);
	byte* bin = hexToBinary(source, hexLen);
	bfDecryptAll(bfctx, bin, hexLen / 2);
	char* hex = binaryToHex(bin, hexLen / 2);
	//printf("%i: %s %s\n", keyNum, hex, bytesAsChars(bin, hexLen / 2));
	printf("%i: %s\n", keyNum, hex);
	//printf("%i: %s\n\n", keyNum, bytesAsChars(bin, hexLen / 2));

	free(bfctx);
	free(bin);
	free(hex);
	//free(keyBytes);
	*/
}

void printHexLoginPackage(char* pkgHex){
	int l = stringLength(pkgHex);
	byte* pkgBytes = hexToBinary(pkgHex, l);
	char* decoded = decodeLoginServerPkg(pkgBytes, l / 2);
	printf("%s\n", decoded);
	free(pkgBytes);
	free(decoded);
}

void printBlowfishDecoded(BLOWFISH_CTX* ctx, char* pkgHex){
	int l = stringLength(pkgHex);
	byte* pkgBytes = hexToBinary(pkgHex, l);
	blowfishDecryptAll(ctx, pkgBytes, l / 2);
	char* hex2 = binaryToHex(pkgBytes, l / 2);
	printf("%s\n", hex2);
	free(pkgBytes);
	free(hex2);
}

void printEncodedLoginServerPackage(const char* pkgJson){
	Binwriter* w = encodeLoginServerPkg(pkgJson);
	byte* res = binwriterToByteArray(w);
	char* hex = binaryToHex(res, w->size);
	printf("%s\n", hex);
	free(hex);
	free(res);
	free(w);
}

char* readDecodePkg(int fd, int isLoginServer){
	static byte* buffer = NULL;
	if(!buffer)
		buffer = (byte*)malloc(MAX_PACKAGE_SIZE);
	int length = readPackage(fd, (char*)buffer, MAX_PACKAGE_SIZE);

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
	printf("Decoded package: %s\n", pkgString);
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

// protocolVersion = 656
int performLogin(const char* authServerAddress, int authServerPort, int serverId, const char* login, const char* password, const char* nickname, const char* tokenHex, int protocolVersion){
	byte* key = getBlowfishKeyFromHex(tokenHex);
	initBlowfishEncoder(key);
	initBlowfishDecoder(key);
	free(key);

	int fd = openTcpConnection(authServerAddress, authServerPort);
	printf("DEBUG: connected to auth server\n");

	json_value_free(readDecodeParsePkg(fd, 1)); // Init package - worthless
	printf("DEBUG: Got Init package\n");

	formatEncodeSendPkg(fd, 1,
		"{\"type\":\"RequestAuthLogin\",\"login\":\"%s\",\"password\":\"%s\"}", login, 	password
	);

	printf("DEBUG: Sent RequestAuthLogin\n");
	
	json_value* loginOk = readDecodeParsePkg(fd, 1);
	json_value* sessionKeyA = jsonValueByKey(loginOk, "sessionKey");
	int sessionKeyA1 = sessionKeyA->u.array.values[0]->u.integer;
	int sessionKeyA2 = sessionKeyA->u.array.values[1]->u.integer;
	json_value_free(loginOk);

	printf("DEBUG: got session key A %i %i\n", sessionKeyA1, sessionKeyA2);
	
	formatEncodeSendPkg(fd, 1,
		"{\"type\":\"RequestServerList\",\"sessionKey\":[%i,%i]}", sessionKeyA1, sessionKeyA2
	);

	printf("DEBUG: sent RequestServerList\n");

	json_value* serverList = readDecodeParsePkg(fd, 1);
	json_value* servers = jsonValueByKey(serverList, "servers");
	int serverCount = servers->u.array.length;
	char* serverAddress = NULL;
	int serverPort = 0;
	for(int i = 0; i < serverCount; i++){
		json_value* server = servers->u.array.values[i];
		int id = jsonValueByKey(server, "id")->u.integer;
		if(id == serverId){
			json_value* ip = jsonValueByKey(server, "ip");
			serverAddress = (char*)malloc(ip->u.string.length + 1);
			strcpy(serverAddress, ip->u.string.ptr);

			serverPort = jsonValueByKey(server, "port")->u.integer;
			break;
		}
	}
	if(!serverAddress || !serverPort){
		exitWithError("Server with id = %i not found.", serverId);
	}
	printf("DEBUG: found game server %s:%i\n", serverAddress, serverPort);
	json_value_free(serverList);

	formatEncodeSendPkg(fd, 1,
		"{\"type\":\"RequestServerLogin\",\"sessionKey\":[%i,%i],\"serverId\":%i}", sessionKeyA1, sessionKeyA2, serverId
	);
	
	//receive PlayOk package
	json_value* playOk = readDecodeParsePkg(fd, 1);
	json_value* sessionKeyB = jsonValueByKey(loginOk, "sessionKey");
	int sessionKeyB1 = sessionKeyB->u.array.values[0]->u.integer;
	int sessionKeyB2 = sessionKeyB->u.array.values[1]->u.integer;
	printf("DEBUG: got session key B %i %i\n", sessionKeyB1, sessionKeyB2);
	json_value_free(playOk);
	
	printf("DEBUG: disconnected from auth server\n");
	closeTcpConnection(fd);

	resetGameServerXorKey();
	fd = openTcpConnection(serverAddress, serverPort);
	free(serverAddress);
	printf("DEBUG: connected to game server\n");
	
	formatEncodeSendPkg(fd, 0,
		"{\"type\":\"ProtocolVersion\",\"protocolVersion\":%i}", protocolVersion
	);

	json_value* cryptInit = readDecodeParsePkg(fd, 0);
	int xorKey = jsonValueByKey(cryptInit, "xorKey")->u.integer;
	json_value_free(cryptInit);
	printf("DEBUG: got xor key %i\n", xorKey);

	setGameServerXorKey(xorKey);

	formatEncodeSendPkg(fd, 0,
		"{\"type\":\"RequestAuthLogin\",\"login\":\"%s\",\"sessionKeyA\":[%i,%i],\"sessionKeyB\":[%i,%i]}", 
		login, 
		sessionKeyA1, sessionKeyA2, sessionKeyB1, sessionKeyB2
	);

	json_value* charList = readDecodeParsePkg(fd, 0);
	json_value* characters = jsonValueByKey(charList, "characters");
	int charIndex = -1;
	for(int i = 0; i < characters->u.array.length; i++){
		json_value* character = characters->u.array.values[i];
		char* charNick = jsonValueByKey(character, "nick")->u.string.ptr;
		if(!strcmp(charNick, nickname)){
			charIndex = i;
			break;
		}
	}
	if(charIndex < 0)
		exitWithError("Failed to find char with nickname \"%s\" on account \"%s\"", nickname, login);
	printf("DEBUG: found char %s at index %i\n", nickname, charIndex);
	json_value_free(charList);

	formatEncodeSendPkg(fd, 0, "{\"type\":\"CharacterSelected\",\"characterIndex\":%i}", charIndex);

	json_value* nextPkg = readDecodeParsePkg(fd, 0);
	char* nextPkgName = jsonValueByKey(nextPkg, "type")->u.string.ptr;
	if(!strcmp(nextPkgName, "SSQInfo")){
		printf("DEBUG: seven seals winner is %s\n", jsonValueByKey(nextPkg, "winner")->u.string.ptr);
		json_value_free(nextPkg);
		nextPkg = readDecodeParsePkg(fd, 0);
	}
	json_value_free(nextPkg); // have no use for CharacterSelected package from server... maybe store initial hp/mp from there?

	formatEncodeSendPkg(fd, 0, "{\"type\":\"EnterWorld\"}");
	
	while(1){
		char* pkgStr = readDecodePkg(fd, 0);
		json_value* pkg = json_parse(pkgStr, stringLength(pkgStr));
		char* pkgType = jsonValueByKey(pkg, "type")->u.string.ptr;
		if(!strcmp(pkgType, "Ping")){
			int pingId = jsonValueByKey(pkg, "id")->u.integer;
			printf("DEBUG: got ping %i", pingId);
			formatEncodeSendPkg(fd, 0, "{\"type\":\"PingResponse\",\"id\":%i,\"ping\":%i}", pingId, 100);
		} else {
			printf("%s\n", pkgStr);
		}
		free(pkgStr);
		json_value_free(pkg);
	}

	return fd;
}

void printDecodeGameServerPackage(char* hex){
	int l = stringLength(hex);
	byte* bin = hexToBinary(hex, l);
	char* result = decodeGameServerPkg(bin, l / 2);
	printf("%s\n", result);
	free(result);
	free(bin);
}

void printEncodeGameServerPackage(char* json){
	Binwriter* w = encodeGameServerPkg(json);
	byte* b = binwriterToByteArray(w);
	char* hex = binaryToHex(b, w->size);
	printf("%s\n", hex);
	freeBinwriter(w);
	free(b);
	free(hex);
}

int main(const int argv, const char* argc[]){
	byte* key = getBlowfishKeyFromHex(defaultKeyHex);
	initBlowfishEncoder(key);
	initBlowfishDecoder(key);

/*
	BLOWFISH_CTX* ctx = createBlowfishContext(key);
	char* requestAuthLoginHex = "c5d6657db3ae132c664f5ec6498046a6ca375c9ea1aaf29343c634406dae0a7641616f5c4bbd6fa5ab3f53b97ee96031";
	char* requestServerListHex = "55a00f14996e85eefb4708879b8d277c651c7e321de46f5d";
	char* requestServerLoginHex = "c9605c2e2e2fc3de8311f19f8134f034d0b55d5f322491d0";

	printBlowfishDecoded(ctx, requestAuthLoginHex);
	printBlowfishDecoded(ctx, requestServerListHex);
	printBlowfishDecoded(ctx, requestServerLoginHex);
	*/
/*
	printEncodedLoginServerPackage("{\"type\":\"RequestAuthLogin\",\"login\":\"satanail\",\"password\":\"satanail\"}");
	printEncodedLoginServerPackage("{\"type\":\"RequestServerList\",\"sessionKey\":[94241,1145966423]}");
	printEncodedLoginServerPackage("{\"type\":\"RequestServerLogin\",\"sessionKey\":[94241,1145966423],\"serverId\":1}");
	*/

/*
	printHexLoginPackage("00452da4115a780000");
	printHexLoginPackage("db4abbb37cbf8252ddd0eb122178b490f049b5713701d09a41616f5c4bbd6fa512fb0bdacfa1beedac54dd7a2e6f2ae7");
	printHexLoginPackage("aba217ad2bc0d5f80b9ec3d076ec21327099946240dd1b077a093e2f5c8340d33713a77dbc86f28577c6076ff14d4a8915773c332b705d7f");
	printHexLoginPackage("639872e0c31a6e19eba8e891aa4d2b15386bc0d835c1ef22");
*/
	
	/*
	setGameServerXorKey(28239);
	printDecodeGameServerPackage("5c30303091aefa125d5e5e3b9aa4f0165959593d9c9fcb216e545426878ade2a65636363c26feb6d223f3f5effe7b3551a1a1a7bdadf8b602f414160b1dc880f402e2e2e8fe3b7307f111110b1dd891c533d3d3c9df1a544bfd1d13f3e520611ac3dc2b90cceddbb8ebcfcfc5d3165e22d004040e18dd95e117f7f7edfb3e7602f414141e08cd85f107e7e7edfb3e7602f414141e08cd85f107e7e7edfb3e7602f414141e08cd85f107e7e7edfb3e7602f414141e08cd85f107e7e7edfb3e7602f4141c4101c4acd82ececec4d2175754f4143cb1f1345c28de3e3e3422e7afdb2dcdcdc7d1145c28de3e3e3422e7afdb2dcdcdc7d1145c28de3e3e3422e7afdb2dcdc9d35590d8ac5ababab0a6632cf84eaea9134580c8bc4aaaaaa0b6733b4fb95959534580c8bc4aaaaaa0b6733b4fb95959534580c8b84b6f6f6573b6fe8270a4a4aeb87d34609676767c6aafe79650b6464a8c4f5726f016060afc3f374543a5757a2cee86f412f5c5c95f99f185739fb2b8be7c04769077373b3dfe5624c224b4b86eabe3957494848e985d15619777777d6baee6926484848e985d15618767676d155ff8717969595dc43e89045b22bb28a7f74b3cf92a192005f488fc0aeaeae0f6337b0fe909090315d098ec1afafaf0e6236b1fe909090315d098ec1afafaf0e6236b1fe909090315d098ec1afafaf0e6236b1fe909090315d098ec1afafaf0e6236b1fe909090315d098e4b50303293ffab2c630d0d0d20390d884a51313392feaa2d620c0c0cadc195125d33333392feaa2d620c0c0cadc195125d33333392feaa2d620c0c0cadc195121c7b7b7bdab6e2652a4444449ff7a324107a7a7adbb7e3642b454545e488dc5b147a7a7adbb7e3642b454545e488dc5b8e79e07941b4bf7804596a59cb9483440b656565c4a8fc7b355b5b5bfa");
	*/
	
	/*
	printUnxoredPackage("c8c8c8a9081044a2627f7f1ebfbaee05c5b6b697462b7f4080f3f3d2036e3af815c2d3d2731f4b");
	printUnxoredPackage("ea9898983955018661121212b3df8b0ceb9898");
	printUnxoredPackage("2a5151");
	printUnxoredPackage("9e");
	printUnxoredPackage("fd8e8e8e2f4317906e1d1d1dbcd08403fd");
	*/
	/*
	char* init = "00570f4e445a780000";
	char* loginOk = "c4b3299a8d346e349b7d4f35527f058df049b5713701d09a41616f5c4bbd6fa541616f5c4bbd6fa5c91adf566bd756c3";
	char* serverList = "aba217ad2bc0d5f88f7c76ce5a59fd247099946240dd1b077a093e2f5c8340d33713a77dbc86f2850fe969d1215d318c3cc118f6dbf4e6ae";
	char* playOk = "15f4d553f97442892c7adb32f157e63e88d7e8936b56be15";

	printHexLoginPackage(init);
	printHexLoginPackage(loginOk);
	printHexLoginPackage(serverList);
	printHexLoginPackage(playOk);
	*/
/*
	setGameServerXorKey(0x000073c0);
	printEncodeGameServerPackage("{\"type\":\"RequestAuthLogin\",\"login\":\"satanail\",\"sessionKeyA\":[94241,295972165],\"sessionKeyB\":[184,94241]}");
	printEncodeGameServerPackage("{\"type\":\"CharacterSelected\",\"characterIndex\":1}");
	*/


	performLogin(
		"auth.draconic.ru", 2106,
		1,
		"satanail", "satanail",
		"SomeRandomTrash2", defaultKeyHex, 656
	);

	return 0;
}