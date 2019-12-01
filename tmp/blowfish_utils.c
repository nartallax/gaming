#ifndef __L2CLIBOT_BLOWFISH_UTILS__
#define __L2CLIBOT_BLOWFISH_UTILS__

#include "blowfish.c"
#include "utils.c"
#include "hex.c"

byte* getBlowfishKeyFromHex(const char* keyHex){
	int hexLength = stringLength(keyHex);
	int keyLength = (hexLength / 2) + 1;
	byte* keyBytes = hexToBinary(keyHex, hexLength);

	// дописываем в конец нулевой байт. так нужно.
	byte* keyBytes2 = (byte*)malloc(keyLength);
	for(int i = 0; i < keyLength - 1; i++)
		keyBytes2[i] = keyBytes[i];
	keyBytes2[keyLength] = 0;

	free(keyBytes);
	return keyBytes2;
}


BLOWFISH_CTX* createBlowfishContext(const byte* key){
	BLOWFISH_CTX* bfctx = (BLOWFISH_CTX*)malloc(sizeof(BLOWFISH_CTX));
	Blowfish_Init(bfctx, key, 21);
	return bfctx;
}

void blowfishDecryptAll(BLOWFISH_CTX* bfctx, byte* data, int length){
	if(length % 8){
		exitWithError("Blowfish decrypt(): data is not padded properly.");
	}

	for(int i = 0; i < length; i += 8){
		unsigned int l = (data[i + 0] << 0) | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24);
		unsigned int r = (data[i + 4] << 0) | (data[i + 5] << 8) | (data[i + 6] << 16) | (data[i + 7] << 24);
		
		Blowfish_Decrypt(bfctx, &l, &r);
		
		data[i + 0] = (l >> 0 ) & 0xff;
		data[i + 1] = (l >> 8 ) & 0xff;
		data[i + 2] = (l >> 16) & 0xff;
		data[i + 3] = (l >> 24) & 0xff;
		data[i + 4] = (r >> 0 ) & 0xff;
		data[i + 5] = (r >> 8 ) & 0xff;
		data[i + 6] = (r >> 16) & 0xff;
		data[i + 7] = (r >> 24) & 0xff;
	}
}

void blowfishEncryptAll(BLOWFISH_CTX* bfctx, byte* data, int length){
	if(length % 8){
		exitWithError("Blowfish encrypt(): data is not padded properly.");
	}

	for(int i = 0; i < length; i += 8){
		unsigned int l = (data[i + 0] << 0) | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24);
		unsigned int r = (data[i + 4] << 0) | (data[i + 5] << 8) | (data[i + 6] << 16) | (data[i + 7] << 24);
		
		Blowfish_Encrypt(bfctx, &l, &r);
		
		data[i + 0] = (l >> 0 ) & 0xff;
		data[i + 1] = (l >> 8 ) & 0xff;
		data[i + 2] = (l >> 16) & 0xff;
		data[i + 3] = (l >> 24) & 0xff;
		data[i + 4] = (r >> 0 ) & 0xff;
		data[i + 5] = (r >> 8 ) & 0xff;
		data[i + 6] = (r >> 16) & 0xff;
		data[i + 7] = (r >> 24) & 0xff;
	}
}

#endif