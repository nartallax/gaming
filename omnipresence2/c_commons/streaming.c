const int intDigitsCount = 6;

int readIntByDigits(char* line, int start){
	char data[intDigitsCount];

	for(int i = 0; i < intDigitsCount; i++){
		data[i] = line[i + start];
	}

	return atoi(data);
}