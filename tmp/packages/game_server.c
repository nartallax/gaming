#ifndef __L2CLIBOT_GAME_SERVER_PACKAGES__
#define __L2CLIBOT_GAME_SERVER_PACKAGES__

#define GAME_SERVER_XOR_KEY_SIZE 8

#include "../utils.c"

byte* gameServerDecodeXorKey = NULL;
byte* gameServerEncodeXorKey = NULL;

void resetGameServerXorKey(){
	if(gameServerDecodeXorKey)
		free(gameServerDecodeXorKey);
	gameServerDecodeXorKey = NULL;

	if(gameServerEncodeXorKey)
		free(gameServerEncodeXorKey);
	gameServerEncodeXorKey = NULL;
}

void setGameServerXorKey(int key){
	resetGameServerXorKey();
	gameServerDecodeXorKey = (byte*)malloc(GAME_SERVER_XOR_KEY_SIZE);
	gameServerDecodeXorKey[0] = (key >> 0) & 0xff;
	gameServerDecodeXorKey[1] = (key >> 8) & 0xff;
	gameServerDecodeXorKey[2] = (key >> 16) & 0xff;
	gameServerDecodeXorKey[3] = (key >> 24) & 0xff;
	gameServerDecodeXorKey[4] = 0xA1;
	gameServerDecodeXorKey[5] = 0x6C;
	gameServerDecodeXorKey[6] = 0x54;
	gameServerDecodeXorKey[7] = 0x87;

	gameServerEncodeXorKey = (byte*)malloc(GAME_SERVER_XOR_KEY_SIZE);
	for(int i = 0; i < GAME_SERVER_XOR_KEY_SIZE; i++){
		gameServerEncodeXorKey[i] = gameServerDecodeXorKey[i];
	}
}

void updateGameServerXorKey(byte* key, int length){
	long keyPart = 0;
	keyPart |= (key[0] << 0x00) & 0x000000ff;
	keyPart |= (key[1] << 0x08) & 0x0000ff00;
	keyPart |= (key[2] << 0x10) & 0x00ff0000;
	keyPart |= (key[3] << 0x18) & 0xff000000;
	keyPart += length;
	key[0] = (keyPart >> 0x00) & 0xff;
	key[1] = (keyPart >> 0x08) & 0xff;
	key[2] = (keyPart >> 0x10) & 0xff;
	key[3] = (keyPart >> 0x18) & 0xff;
}

#endif