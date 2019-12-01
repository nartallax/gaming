#ifndef __L2CLIBOT_FROM_LOGIN_SERVER_PACKAGES__
#define __L2CLIBOT_FROM_LOGIN_SERVER_PACKAGES__

#include "../binreader.c"
#include "../blowfish_utils.c"
#include "../network.c"

char* decodeLoginInitPkg(Binreader* pkg){
	int expectedLength = 9;
	if(pkg->length != expectedLength){
		exitWithError("Unexpected payload length of Init package (got %i, expected %i). Binary protocol incompatible.", pkg->length, expectedLength);
	}
	int sessionId = readInt(pkg);
	int protocolVersion = readInt(pkg);
	int expectedProtocolVersion = 0x785a;
	if(protocolVersion != expectedProtocolVersion){
		exitWithError("Unexpected protocol version in Init package (got %i, expected %i). Binary protocol incompatible.", protocolVersion, expectedProtocolVersion);
	}
	
	return formatToString("{\"type\":\"Init\",\"sessionId\":%i,\"protocolVersion\":%i}", sessionId, protocolVersion);
}

char* decodeLoginLoginOkPkg(Binreader* pkg){
	int a = readInt(pkg);
	int b = readInt(pkg);
	return formatToString("{\"type\":\"LoginOk\",\"sessionKey\":[%i,%i]}", a, b);
}

char* decodeLoginLoginFailPkg(Binreader* pkg){
	const char* reason;
	switch(readByte(pkg)){
		case 0x01:	reason = "system_error";	break;
		case 0x02:	reason = "bad_password";	break;
		case 0x03:	reason = "bad_credentials";	break;
		case 0x04:	reason = "access_denied";	break;
		case 0x05:	reason = "bad_account_data";break;
		case 0x07:	reason = "already_used";	break;
		case 0x09:	reason = "banned";			break;
		case 0x10:	reason = "maintenance";		break;
		case 0x12:	reason = "expired";			break;
		case 0x13:	reason = "no_time_left";	break;
		default: 	reason = "unknown";			break;
	}
	return formatToString("{\"type\":\"LoginFail\",\"reason\":\"%s\"}", reason);
}

char* decodeLoginAccountBannedPkg(Binreader* pkg){
	const char* reason;
	switch(readByte(pkg)){
		case 0x01:	reason = "data_stealer";		break;
		case 0x08:	reason = "generic_violation";	break;
		case 0x10:	reason = "trial_expired";		break;
		case 0x20:	reason = "banned";				break;
		default: 	reason = "unknown";				break;
	}
	return formatToString("{\"type\":\"AccountBanned\",\"reason\":\"%s\"}", reason);
}

char* decodeLoginServerListPkg(Binreader* pkg){
	byte serverCount = readByte(pkg);
	readByte(pkg);
	char** servers = (char**)malloc(sizeof(char*) * serverCount);
	for(int i = 0; i < serverCount; i++){
		byte serverId = readByte(pkg);
		int ip = readInt(pkg);
		int port = readInt(pkg);
		byte ageLimit = readByte(pkg);
		byte isPvp = readByte(pkg);
		short online = readShort(pkg);
		short onlineLimit = readShort(pkg);
		byte isTest = readByte(pkg);
		servers[i] = formatToString(
			"{\"id\":%i,\"ip\":\"%i.%i.%i.%i\",\"port\":%i,\"ageLimit\":%i,\"isPvp\":%s,\"isTest\":%s,\"online\":%i,\"onlineLimit\":%i}", serverId, 
			(ip >> 0) & 0xff, (ip >> 8) & 0xff, (ip >> 16) & 0xff, (ip >> 24) & 0xff, 
			port, 
			ageLimit, isPvp? "true": "false", isTest? "true": "false", online, onlineLimit);
	}
	char* serverArr = joinStrings(servers, serverCount, ",");
	for(int i = 0; i < serverCount; i++)
		free(servers[i]);
	free(servers);
	char* result = formatToString("{\"type\":\"ServerList\",\"servers\":[%s]}", serverArr);
	free(serverArr);
	return result;
}

char* decodeLoginPlayOkPkg(Binreader* pkg){
	int a = readInt(pkg);
	int b = readInt(pkg);
	return formatToString("{\"type\":\"PlayOk\",\"sessionKey\":[%i,%i]}", a, b);
}

char* decodeLoginPlayFailPkg(Binreader* pkg){
	return formatToString("{\"type\":\"PlayFail\"}");
}

BLOWFISH_CTX* loginServerBlowfishDecodingContext;
int loginServerIsFirstPackage = 1;

void initBlowfishDecoder(const byte* key){
	if(loginServerBlowfishDecodingContext)
		free(loginServerBlowfishDecodingContext);
	loginServerBlowfishDecodingContext = createBlowfishContext(key);
	loginServerIsFirstPackage = 1;
}

char* decodeLoginServerPkg(byte* pkgBytes, const unsigned int length){
	if(loginServerIsFirstPackage){
		loginServerIsFirstPackage = 0;
	} else {
		blowfishDecryptAll(loginServerBlowfishDecodingContext, pkgBytes, length);
	}

	Binreader* pkg = getBinreader(pkgBytes, length);
	byte pkgType = readByte(pkg);
	char* result;
	switch(pkgType){
		case 0x00:	result = decodeLoginInitPkg(pkg);			break;
		case 0x01:	result = decodeLoginLoginFailPkg(pkg);		break;
		case 0x02:	result = decodeLoginAccountBannedPkg(pkg);	break;
		case 0x03:	result = decodeLoginLoginOkPkg(pkg);		break;
		case 0x04:	result = decodeLoginServerListPkg(pkg);		break;
		case 0x06:	result = decodeLoginPlayFailPkg(pkg);		break;
		case 0x07:	result = decodeLoginPlayOkPkg(pkg);			break;
		default: exitWithError("Unknown package type received from login server (%i).", pkgType);
	}
	free(pkg);
	return result;
}

#endif