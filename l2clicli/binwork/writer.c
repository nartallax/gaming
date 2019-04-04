#ifndef __L2CLICLI_BINWRITER__
#define __L2CLICLI_BINWRITER__

/* Класс, организующий последовательную запись в массив байт заранее неизвестной величины */

#include "../utils/utils.c"
#include "../utils/hex.c"

#define BINWRITER_BLOCK_SIZE 128

typedef struct {
	byte** dataBlocks;
	unsigned int size;
} Binwriter;

Binwriter* getBinwriter(){
	Binwriter* result = (Binwriter*)malloc(sizeof(Binwriter));
	result->dataBlocks = (byte**)malloc(sizeof(byte*) * 0);
	result->size = 0;
	return result;
}

void freeBinwriter(Binwriter* writer){
	int blockCount = writer->size / BINWRITER_BLOCK_SIZE + (writer->size % BINWRITER_BLOCK_SIZE? 1: 0);
	for(int i = 0; i < blockCount; i++)
		free(writer->dataBlocks[i]);
	free(writer->dataBlocks);
	free(writer);
}

byte* binwriterToByteArray(Binwriter* writer){
	byte* result = (byte*)malloc(writer->size);
	int pos = 0;
	int blockCount = writer->size / BINWRITER_BLOCK_SIZE + (writer->size % BINWRITER_BLOCK_SIZE? 1: 0);
	for(int blockNum = 0; blockNum < blockCount; blockNum++){
		byte* block = writer->dataBlocks[blockNum];
		for(int i = 0; i < BINWRITER_BLOCK_SIZE && pos < writer->size; i++)
			result[pos++] = block[i];
	}
	return result;
}

inline int binwriterBlocksCount(Binwriter* writer){
	return writer->size / BINWRITER_BLOCK_SIZE + (writer->size % BINWRITER_BLOCK_SIZE? 1: 0);
}

void binwriterEnsureBlockExistence(Binwriter* writer, int forwardCount){
	int blocksCount = binwriterBlocksCount(writer);
	int availableSize = (blocksCount * BINWRITER_BLOCK_SIZE) - writer->size;
	if(availableSize < forwardCount){
		int newBlocksCount = 0;
		while(availableSize < forwardCount){
			availableSize += BINWRITER_BLOCK_SIZE;
			newBlocksCount++;
		}

		byte** newBlocks = (byte**)malloc(sizeof(byte*) * (blocksCount + newBlocksCount));
		for(int i = 0; i < blocksCount; i++)
			newBlocks[i] = writer->dataBlocks[i];
		for(int i = 0; i < newBlocksCount; i++)
			newBlocks[blocksCount + i] = (byte*)malloc(BINWRITER_BLOCK_SIZE);
		free(writer->dataBlocks);
		writer->dataBlocks = newBlocks;
	}
}

void binwriterForceWriteByte(Binwriter* writer, byte b){
	writer->dataBlocks[writer->size / BINWRITER_BLOCK_SIZE][writer->size % BINWRITER_BLOCK_SIZE] = b;
	writer->size++;
}

void writeByte(Binwriter* writer, byte b){
	binwriterEnsureBlockExistence(writer, 1);
	binwriterForceWriteByte(writer, b);
}

void writeShort(Binwriter* writer, short s){
	binwriterEnsureBlockExistence(writer, 1);
	binwriterForceWriteByte(writer, (s >> 0) & 0xff);
	binwriterForceWriteByte(writer, (s >> 8) & 0xff);
}

void writeInt(Binwriter* writer, int i){
	binwriterEnsureBlockExistence(writer, 1);
	binwriterForceWriteByte(writer, (i >> 0) & 0xff);
	binwriterForceWriteByte(writer, (i >> 8) & 0xff);
	binwriterForceWriteByte(writer, (i >> 16) & 0xff);
	binwriterForceWriteByte(writer, (i >> 24) & 0xff);
}


/** occupiedLength здесь может (и будет) отличаться от длины строки
 *  нужно оно затем, что иногда в протоколе lineage 2 отводится фиксированное место под некоторые строки
 *  соответственно, если не влезло - обрезать, влезло - забить нулями остаток */
void writeString(Binwriter* writer, char* str, int occupiedLength){
	binwriterEnsureBlockExistence(writer, occupiedLength);

	int len = stringLength(str);
	if(len > occupiedLength)
		len = occupiedLength;
	for(int i = 0; i < len; i++)
		binwriterForceWriteByte(writer, str[i]);

	int freeLen = occupiedLength - len;
	for(int i = 0; i < freeLen; i++)
		binwriterForceWriteByte(writer, 0);
}

/** записать переданную строку, после каждого символа ставя \0, и заканчивая \0\0 */
void writeAsciiAsUtf16(Binwriter* writer, char* str, int length){
	binwriterEnsureBlockExistence(writer, (length * 2) + 2);

	for(int i = 0; i < length; i++){
		binwriterForceWriteByte(writer, str[i]);
		binwriterForceWriteByte(writer, 0);
	}

	binwriterForceWriteByte(writer, 0);
	binwriterForceWriteByte(writer, 0);
}

void writeHexAsBytes(Binwriter* writer, const char* hex){
	int length = stringLength(hex);
	byte* bin = hexToBinary(hex, length);
	binwriterEnsureBlockExistence(writer, length / 2);
	for(int i = 0; i < length / 2; i++)
		binwriterForceWriteByte(writer, bin[i]);
	free(bin);
}

#endif