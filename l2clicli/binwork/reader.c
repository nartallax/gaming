#ifndef __L2CLICLI_BINREADER__
#define __L2CLICLI_BINREADER__

/* Класс, организующий последовательное чтение массива байт */

#include "../utils/utils.c"

typedef struct {
	const byte* data;
	unsigned int position;
	unsigned int length;
} Binreader;

Binreader* getBinreader(const byte* data, const unsigned int length){
	Binreader* result = (Binreader*)malloc(sizeof(Binreader));
	result->position = 0;
	result->data = data;
	result->length = length;
	return result;
}

byte readByte(Binreader* reader){
	return reader->data[reader->position++];
}

char readChar(Binreader* reader){
	return reader->data[reader->position++];
}

short readShort(Binreader* reader){
	byte a = readByte(reader);
	byte b = readByte(reader);
	return (b << 8) | a;
}

int readInt(Binreader* reader){
	byte a = readByte(reader);
	byte b = readByte(reader);
	byte c = readByte(reader);
	byte d = readByte(reader);
	return (d << 24) | (c << 16) | (b << 8) | a;
}

char* readUtf16StringAsAscii(Binreader* reader){
	int charLength = 0;
	int pos = reader->position;
	while(reader->data[pos + (charLength * 2)] || reader->data[pos + (charLength * 2) + 1])
		charLength++;
	char* result = (char*)malloc(charLength + 1);
	for(int i = 0; i < charLength; i++)
		result[i] = reader->data[pos + (i * 2)];
	result[charLength] = 0;
	reader->position += (charLength * 2) + 2;
	return result;
}

double readDouble(Binreader* reader){
	union { double d; char b[8]; } bytes;
	for(int i = 0; i < 8; i++)
		bytes.b[i] = readByte(reader);
	return bytes.d;
}

#endif