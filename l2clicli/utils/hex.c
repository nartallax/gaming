#ifndef __L2CLICLI_HEXC__
#define __L2CLICLI_HEXC__

/* Конвертация бинарных данных в HEX-представление и обратно */

#include "utils.c"

byte hexNum(const char hex){
	switch(hex){
		case '0': return 0x0;
		case '1': return 0x1;
		case '2': return 0x2;
		case '3': return 0x3;
		case '4': return 0x4;
		case '5': return 0x5;
		case '6': return 0x6;
		case '7': return 0x7;
		case '8': return 0x8;
		case '9': return 0x9;
		case 'A':
		case 'a': return 0xa;
		case 'B':
		case 'b': return 0xb;
		case 'C':
		case 'c': return 0xc;
		case 'D':
		case 'd': return 0xd;
		case 'E':
		case 'e': return 0xe;
		case 'F':
		case 'f': return 0xf;
	}
	return 0;
}

char hexChar(const byte num){
	switch(num){
		case 0x0: return '0';
		case 0x1: return '1';
		case 0x2: return '2';
		case 0x3: return '3';
		case 0x4: return '4';
		case 0x5: return '5';
		case 0x6: return '6';
		case 0x7: return '7';
		case 0x8: return '8';
		case 0x9: return '9';
		case 0xa: return 'A';
		case 0xb: return 'B';
		case 0xc: return 'C';
		case 0xd: return 'D';
		case 0xe: return 'E';
		case 0xf: return 'F';
	}
	return '0';
}

byte* hexToBinary(const char* hex, const int length){
	byte* result = malloc(length / 2);
	for(int i = 0; i < length / 2; i ++){
		result[i] = (hexNum(hex[i * 2]) << 4) + (hexNum(hex[(i * 2) + 1]));
	}
	return result;
}

char* binaryToHex(const byte* binary, const int length){
	char* result = malloc((length * 2) + 1);
	result[length * 2] = 0;
	for(int i = 0; i < length; i++){
		byte b = binary[i];
		result[i * 2] = hexChar((b >> 4) & 0x0f);
		result[(i * 2) + 1] = hexChar(b & 0x0f);
	}
	return result;
}

#endif