#ifndef __L2CLICLI_NETWORK__
#define __L2CLICLI_NETWORK__

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
//#include <winsock2.h>
//#include <windows.h>
#include <netinet/in.h>
#include <netdb.h> 
#include <arpa/inet.h>

#include "../utils/utils.c"
#include "../binwork/writer.c"

int reverseIpByteOrder(int ip){
	byte a = ip & 0xff, b = (ip >> 8) & 0xff, c = (ip >> 16) & 0xff, d = (ip >> 24) & 0xff;
	return (a << 24) | (b << 16) | (c << 8) | d;
}

int ipByHostname(const char* hostname){
	struct sockaddr whereto;
	memset(&whereto, 0, sizeof(struct sockaddr));

	struct sockaddr_in* to = (struct sockaddr_in *)&whereto;
	to->sin_family = AF_INET;
	
	// если это прямо IP в строке - то его и возвращаем
	to->sin_addr.s_addr = inet_addr(hostname);
	if (to->sin_addr.s_addr != -1)
		return reverseIpByteOrder(to->sin_addr.s_addr);

	struct hostent* hp = gethostbyname(hostname);
	if (!hp)
		exitWithError("Unknown host %s\n", hostname);

	to->sin_family = hp->h_addrtype;
	for(int i = 0; hp->h_aliases[i]; i++){
		printf("ALIAS[%i]: %s\n", i, hp->h_aliases[i]);
	}
	for(int i = 0; hp->h_addr_list[i]; i++){
		return 
			((byte)hp->h_addr_list[i][3]) << 0x00
			| (((byte)hp->h_addr_list[i][2]) << 0x08)
			| (((byte)hp->h_addr_list[i][1]) << 0x10)
			| (((byte)hp->h_addr_list[i][0]) << 0x18);
	}

	exitWithError("No IP address found for host %s\n", hostname);
	return 0;
}

int openTcpConnection(const char* hostname, int port){
	int fd = socket(AF_INET, SOCK_STREAM, 0);
	if (fd < 0) 
        exitWithError("Failed to open TCP socket.");
	
	int ip = ipByHostname(hostname);
	

	struct sockaddr_in serverAddr;
	memset((char *) &serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
	serverAddr.sin_addr.s_addr = reverseIpByteOrder(ip);
	serverAddr.sin_port = htons(port);

	//printf("Connecting to: %i.%i.%i.%i:%i\n", (ip >> 24) & 0xff, (ip >> 16) & 0xff, (ip >> 8) & 0xff, ip & 0xff, port);
	int connectResult = connect(fd, (struct sockaddr *)&serverAddr, sizeof(serverAddr));
	if(connectResult < 0) 
		exitWithError("Failed to connect to server %s:%i", hostname, port);
	
	//printf("Connected\n");
	return fd;
}

void closeTcpConnection(int fd){
	close(fd);
}

void readFromSocket(int fd, char* buffer, int bytesToRead){
	int bytesRead = 0;
	do {
		int readRes = recv(fd, buffer + bytesRead, bytesToRead - bytesRead, 0);
		if(readRes < 0)
			exitWithError("Failed to write into TCP socket: error code %i", readRes);
		bytesRead += readRes;
	} while(bytesRead < bytesToRead);
}

int readPackage(int fd, char* buffer, int bufferSize){
	char size[2];
	readFromSocket(fd, size, 2);
	int length = ((((byte)size[1]) << 8) | ((byte)size[0])) - 2; // 2 for size itself
	if(length > bufferSize)
		exitWithError("Buffer is too small for package! Package size = %i, buffer size = %i", length, bufferSize);
	readFromSocket(fd, buffer, length);
	return length;
}

void writeIntoSocket(int fd, char* data, int length){
	int bytesWritten = 0;
	do {
		int writeResult = send(fd, data + bytesWritten, length - bytesWritten, 0);
		if(writeResult < 0)
			exitWithError("Failed to write into TCP socket: error code %i", writeResult);
		bytesWritten += writeResult;
	} while(bytesWritten < length);
}

void writePackage(int fd, Binwriter* writer){
	char size[2];
	short sizeNum = writer->size + 2; // 2 for size itself
	size[0] = (sizeNum >> 0x00) & 0xff;
	size[1] = (sizeNum >> 0x08) & 0xff;
	writeIntoSocket(fd, size, 2);
	char* result = (char*)binwriterToByteArray(writer);
	writeIntoSocket(fd, result, writer->size); 
	free(result);
}

#endif