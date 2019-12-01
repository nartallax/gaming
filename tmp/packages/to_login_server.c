#ifndef __L2CLIBOT_TO_LOGIN_SERVER_PACKAGES__
#define __L2CLIBOT_TO_LOGIN_SERVER_PACKAGES__

#include<string.h>

#include "../utils.c"
#include "../json/json.h"
#include "../json_utils.c"
#include "../binwriter.c"
#include "../blowfish_utils.c"

BLOWFISH_CTX* loginServerBlowfishEncodingContext;

unsigned long loginServerPackageChecksum(const byte *pkgBytes, int length, unsigned long chksum){
	for(int i = 0; i < length; i += 4) 
		chksum ^= *((unsigned long *)&pkgBytes[i]);
	return chksum;
};

void initBlowfishEncoder(const byte* key){
	if(loginServerBlowfishEncodingContext)
		free(loginServerBlowfishEncodingContext);
	loginServerBlowfishEncodingContext = createBlowfishContext(key);
}

void encodeLoginRequestAuthLoginPkg(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x00);
	char* login = jsonValueByKey(obj, "login")->u.string.ptr;
	char* password = jsonValueByKey(obj, "password")->u.string.ptr;
	writeString(writer, login, 14);
	writeString(writer, password, 16);
	writeByte(writer, 0x08);
	for(int i = 0; i < 8; i++)
		writeByte(writer, 0);
}

void encodeLoginRequestServerLoginPkg(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x02);
	json_value* sessionKey = jsonValueByKey(obj, "sessionKey");
	writeInt(writer, sessionKey->u.array.values[0]->u.integer);
	writeInt(writer, sessionKey->u.array.values[1]->u.integer);
	writeByte(writer, jsonValueByKey(obj, "serverId")->u.integer);
}

void encodeLoginRequestServerListPkg(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x05);
	json_value* sessionKey = jsonValueByKey(obj, "sessionKey");
	writeInt(writer, sessionKey->u.array.values[0]->u.integer);
	writeInt(writer, sessionKey->u.array.values[1]->u.integer);
	writeInt(writer, 0x04);
}

Binwriter* encodeLoginServerPkg(const char* pkgJson){
	json_value* obj = json_parse(pkgJson, stringLength(pkgJson));
	char* type = jsonValueByKey(obj, "type")->u.string.ptr;

	Binwriter* writer = getBinwriter();

	if(!strcmp(type, "RequestAuthLogin")){
		encodeLoginRequestAuthLoginPkg(obj, writer);
	} else if(!strcmp(type, "RequestServerLogin")) {
		encodeLoginRequestServerLoginPkg(obj, writer);
	} else if(!strcmp(type, "RequestServerList")) {
		encodeLoginRequestServerListPkg(obj, writer);
	} else {
		exitWithError("Unknown login server package type: \"%s\".", type);
	}

	{ // дополняем основную длину пакета нулями до 8 байт (для шифрования)
		while(writer->size % 8)
			writeByte(writer, 0);
	}

	{ // считаем и дописываем чексумму
		unsigned long checksum = 0;
		int blockCount = binwriterBlocksCount(writer);
		for(int i = 0; i < blockCount; i++){
			int blockSize = i == blockCount - 1? writer->size % BINWRITER_BLOCK_SIZE: BINWRITER_BLOCK_SIZE;
			checksum = loginServerPackageChecksum(writer->dataBlocks[i], blockSize, checksum);
		}

		for(int i = 0; i < 8; i++){
			byte v = checksum & 0xff;
			checksum = checksum >> 8;
			writeByte(writer, v);
		}
	}
	
	{ // шифруем
		int blockCount = binwriterBlocksCount(writer);
		for(int i = 0; i < blockCount; i++){
			int blockSize = i == blockCount - 1? writer->size % BINWRITER_BLOCK_SIZE: BINWRITER_BLOCK_SIZE;
			blowfishEncryptAll(loginServerBlowfishEncodingContext, writer->dataBlocks[i], blockSize);
		}
	}

	json_value_free(obj);
	return writer;
}

Binwriter* vformatEncodeLoginServerPkg(const char* formatString, va_list args){
	char* str = vformatToString(formatString, args);
	Binwriter* w = encodeLoginServerPkg(str);
	free(str);
	return w;
}

Binwriter* formatEncodeLoginServerPkg(const char* formatString, ...){
	va_list args;
    va_start(args, formatString);
	return vformatEncodeLoginServerPkg(formatString, args);
}


#endif