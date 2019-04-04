#ifndef __L2CLICLI_LOGIN__
#define __L2CLICLI_LOGIN__

/* Процедура логина. Возвращает файловый дескриптор сокета, подключенного к гейм-серверу */

#include "../utils/utils.c"
#include "../utils/network.c"

void checkPackageType(json_value* pkg, const char* expectedType){
	char* type = jsonValueByKey(pkg, "type")->u.string.ptr;
	if(strcmp(type, expectedType))
		exitWithError("Incorrect package type received! Expected %s, got %s", expectedType, type);
}

int performLogin(const char* authServerAddress, 
				int authServerPort, 
				int serverId, 
				const char* login, 
				const char* password, 
				const char* nickname, 
				const char* tokenHex, 
				int protocolVersion){

	byte* key = getBlowfishKeyFromHex(tokenHex);
	initBlowfishEncoder(key);
	initBlowfishDecoder(key);
	free(key);

	int fd = openTcpConnection(authServerAddress, authServerPort);

	json_value* initPkg = readDecodeParsePkg(fd, 1);
	checkPackageType(initPkg, "Init");
	json_value_free(initPkg);

	formatEncodeSendPkg(fd, 1,
		"{\"type\":\"RequestAuthLogin\",\"login\":\"%s\",\"password\":\"%s\"}", login, 	password
	);

	json_value* loginOk = readDecodeParsePkg(fd, 1);
	checkPackageType(loginOk, "LoginOk");
	json_value* sessionKeyA = jsonValueByKey(loginOk, "sessionKey");
	int sessionKeyA1 = sessionKeyA->u.array.values[0]->u.integer;
	int sessionKeyA2 = sessionKeyA->u.array.values[1]->u.integer;
	json_value_free(loginOk);
	
	formatEncodeSendPkg(fd, 1,
		"{\"type\":\"RequestServerList\",\"sessionKey\":[%i,%i]}", sessionKeyA1, sessionKeyA2
	);

	json_value* serverList = readDecodeParsePkg(fd, 1);
	checkPackageType(serverList, "ServerList");
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
		fprintf(stderr, "Server with requested ID (which is %i) not found. List of all available servers:\n", serverId);

		for(int i = 0; i < serverCount; i++){
			json_value* server = servers->u.array.values[i];
			int id = jsonValueByKey(server, "id")->u.integer;
			char* ip = jsonValueByKey(server, "ip")->u.string.ptr;
			int port = jsonValueByKey(server, "port")->u.integer;
			int ageLimit = jsonValueByKey(server, "ageLimit")->u.integer;
			int isPvp = jsonValueByKey(server, "isPvp")->u.boolean;
			int isTest = jsonValueByKey(server, "isTest")->u.boolean;
			int online = jsonValueByKey(server, "online")->u.integer;
			int onlineLimit = jsonValueByKey(server, "onlineLimit")->u.integer;

			printf(
				"ID: %i, address: %s:%i, online: %i/%i, age limit: %i, test: %s, pvp: %s\n", 
				id, ip, port, online, onlineLimit, ageLimit, isTest? "yes": "no", isPvp? "yes": "no"
			);
		}
		exit(0);
	}
		
	json_value_free(serverList);

	formatEncodeSendPkg(fd, 1,
		"{\"type\":\"RequestServerLogin\",\"sessionKey\":[%i,%i],\"serverId\":%i}", sessionKeyA1, sessionKeyA2, serverId
	);
	
	json_value* playOk = readDecodeParsePkg(fd, 1);
	checkPackageType(playOk, "PlayOk");
	json_value* sessionKeyB = jsonValueByKey(loginOk, "sessionKey");
	int sessionKeyB1 = sessionKeyB->u.array.values[0]->u.integer;
	int sessionKeyB2 = sessionKeyB->u.array.values[1]->u.integer;
	json_value_free(playOk);
	
	closeTcpConnection(fd);

	resetGameServerXorKey();
	fd = openTcpConnection(serverAddress, serverPort);
	free(serverAddress);
	
	formatEncodeSendPkg(fd, 0,
		"{\"type\":\"ProtocolVersion\",\"protocolVersion\":%i}", protocolVersion
	);

	json_value* cryptInit = readDecodeParsePkg(fd, 0);
	checkPackageType(cryptInit, "CryptInit");
	int xorKey = jsonValueByKey(cryptInit, "xorKey")->u.integer;
	json_value_free(cryptInit);

	setGameServerXorKey(xorKey);

	formatEncodeSendPkg(fd, 0,
		"{\"type\":\"RequestAuthLogin\",\"login\":\"%s\",\"sessionKeyA\":[%i,%i],\"sessionKeyB\":[%i,%i]}", 
		login, 
		sessionKeyA1, sessionKeyA2, sessionKeyB1, sessionKeyB2
	);

	json_value* charList = readDecodeParsePkg(fd, 0);
	checkPackageType(charList, "CharacterList");
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
	json_value_free(charList);

	formatEncodeSendPkg(fd, 0, "{\"type\":\"CharacterSelected\",\"characterIndex\":%i}", charIndex);

	char* nextPkgStr;
	json_value* nextPkg;
	while(1){
		nextPkgStr = readDecodePkg(fd, 0);
		nextPkg = json_parse(nextPkgStr, stringLength(nextPkgStr));
		char* type = jsonValueByKey(nextPkg, "type")->u.string.ptr;

		if(!strcmp(type, "SSQInfo")){
			free(nextPkgStr);
			json_value_free(nextPkg);
			continue;
		}

		if(!strcmp(type, "CharacterSelected")){
			json_value_free(nextPkg);
			break;
		}

		exitWithError("Incorrect package type received! Expected SSQInfo or CharacterSelected, got %s", type);
	}

	formatEncodeSendPkg(fd, 0, "{\"type\":\"EnterWorld\"}");
	
	printf("%s\n", nextPkgStr);

	return fd;
}

#endif