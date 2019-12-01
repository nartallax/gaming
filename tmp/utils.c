#ifndef __L2CLIBOT_UTILSC__
#define __L2CLIBOT_UTILSC__

#include <stdlib.h>
#include <stdarg.h>

typedef unsigned char byte;

int stringLength(const char* str){
	int length = 0;
	while(str[length]) length++;
	return length;
}

char* vformatToString(const char* formatString, va_list args){
	va_list vcopy;
	va_copy(vcopy, args);
	int bufsz = vsnprintf(NULL, 0, formatString, vcopy);
	va_end(vcopy);
	char* buf = malloc(bufsz + 1);
	vsnprintf(buf, bufsz + 1, formatString, args);
	buf[bufsz] = 0;
	return buf;
}

char* formatToString(const char* formatString, ...){
	va_list args;
    va_start(args, formatString);
	return vformatToString(formatString, args);
	va_end(args);
}

void exitWithError(const char* errorFormatString, ...){
	va_list args;
    va_start(args, errorFormatString);

	int l = stringLength(errorFormatString);
	char* resFormat = (char*)malloc(l + 2);
	for(int i = 0; i < l; i++){
		resFormat[i] = errorFormatString[i];
	}
	resFormat[l + 0] = '\n';
	resFormat[l + 1] = '\0';

	vfprintf(stderr, resFormat, args);
	exit(1);
}

char* joinStrings(char** strings, int count, const char* inbetween){
	if(count == 0){
		char* result = malloc(0);
		return result;
	}

	int betweenLength = stringLength(inbetween);
	int* lens = (int*)malloc(sizeof(int) * count);
	int totalLength = (count - 1) * betweenLength;
	for(int i = 0; i < count; i++){
		int l = stringLength(strings[i]);
		lens[i] = l;
		totalLength += l;
	}

	char* result = malloc(totalLength + 1);
	result[totalLength] = '\0';
	int pos = 0;
	for(int i = 0; i < count; i++){
		const char* s = strings[i];
		int l = lens[i];
		for(int k = 0; k < l; k++)
			result[pos++] = s[k];
		if(i != count - 1){
			for(int k = 0; k < betweenLength; k++)
				result[pos++] = inbetween[k];
		}
	}
	return result;
}

#endif