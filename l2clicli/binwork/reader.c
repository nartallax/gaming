#ifndef __L2CLICLI_BINREADER__
#define __L2CLICLI_BINREADER__

/* Класс, организующий последовательное чтение массива байт */

#include "../utils/utils.c"
#include "../utils/utf.c"

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
	/*
	if(reader->position >= reader->length){
		fprintf(stderr, "Attempt to read past package end!\n");
		return 0;
	}
	*/
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

// not including trailing \0\0
int binreaderGetUtf16StringLength(Binreader* reader){
	// for now, let's assume it's 2 bytes per char always
	int charLength = 0;
	int pos = reader->position;
	while(pos + (charLength * 2) + 1 < reader->length 
		&& (reader->data[pos + (charLength * 2)] || reader->data[pos + (charLength * 2) + 1])){
		charLength++;
	}
	/*
	if(pos + (charLength * 2) + 1 == reader->length){
		fprintf(stderr, "Attempt to read past package end!\n");
		return 0;
	}
	*/
	return charLength;
}

void skipUtf16String(Binreader* reader){
	reader->position += (binreaderGetUtf16StringLength(reader) + 1) * 2;
}

char* readBytes(Binreader* reader, int length){
	char* result = (char*)malloc(length);
	memcpy(result, reader->data + reader->position, length);
	reader->position += length;
	return result;
}

// same as readBytes, but no copying is present; returned pointer points to part of the same array as reader->data
const char* sliceBytes(Binreader* reader, int length){
	char* result = (char*)reader->data + reader->position;
	reader->position += length;
	return result;
}

byte* readUtf16StringInUtf8(Binreader* reader){
	int charLength = binreaderGetUtf16StringLength(reader);
	byte* result = utf16ToUtf8(reader->data + reader->position, charLength);
	reader->position += (charLength + 1) * 2;
	return result;
}

char* readUtf16InJsonEncoded(Binreader* reader){
	byte* utf8 = readUtf16StringInUtf8(reader);
	char* result = jsonEscapeString(utf8);
	free(utf8);
	return result;
}

double readDouble(Binreader* reader){
	union { double d; char b[8]; } bytes;
	for(int i = 0; i < 8; i++)
		bytes.b[i] = readByte(reader);
	return bytes.d;
}

#endif