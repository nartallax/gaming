/**
 * Немного о том, откуда брать токен для Blowfish
 * Он зашит в engine.dll
 * Для его извлечения существует прога EngineExt, но у меня она не завелась
 * Поэтому можно сдампить engine.dll с помощью, например, LordPE
 */

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L
#define _GNU_SOURCE

#include <sys/select.h>
#include <stdio.h>
#include <unistd.h>

#include "utils/utils.c"
#include "utils/hex.c"
#include "utils/network.c"
#include "code/cli.c"
#include "code/login.c"
#include "code/dump_analyzer.c"

void doWithPackageFromServer(char* pkgStr, int fd){
	json_value* pkg = json_parse(pkgStr, stringLength(pkgStr));
	char* pkgType = jsonValueByKey(pkg, "type")->u.string.ptr;
	if(!strcmp(pkgType, "Ping")){
		int pingId = jsonValueByKey(pkg, "id")->u.integer;
		formatEncodeSendPkg(fd, 0, "{\"type\":\"PingResponse\",\"id\":%i,\"ping\":%i}", pingId, 100);
	} else {
		printf("%s\n", pkgStr);
	}
	json_value_free(pkg);
}

void doWithPackageToServer(const char* pkgStr, int fd){
	Binwriter* pkg = encodeGameServerPkg(pkgStr);
	writePackage(fd, pkg);
	freeBinwriter(pkg);
}

void mainLoop(int fd){
	fd_set master;
	fd_set read_fds;

	FD_ZERO(&master);
	FD_ZERO(&read_fds);

	FD_SET(0,&master);
	FD_SET(fd,&master);

	char* lineBuffer = (char*)malloc(0xffff); // just in case
	while(1){
		read_fds = master;
		if(select(fd + 1, &read_fds, NULL, NULL, NULL) < 0)
			exitWithError("Failed to select() on stdin and socket.");

		if(FD_ISSET(fd, &read_fds)){
			char* pkg = readDecodePkg(fd, 0);
			doWithPackageFromServer(pkg, fd);
			free(pkg);
			fflush(stdout);
		}

		if(FD_ISSET(0, &read_fds)){
			size_t size = 0xffff;
			int charCount = getline(&lineBuffer, &size, stdin);
			lineBuffer[charCount - 1] = 0; // newline -> string termination
			doWithPackageToServer(lineBuffer, fd);
		}
	}
}



void run(Cli* cli){
	int isHelp = cli->argc < 2 || cliFlag(cli, "-h") || cliFlag(cli, "--help") || cliFlag(cli, "-help");
	if(isHelp){
		fprintf(stderr, "\
Lineage II Command-Line Interface Client\n\n\
Mandatory options:\n\
--auth-host:     Auth server hostname or IP-address. IPv4 supported.\n\
--auth-port:     Auth server port number.\n\
--login:         Login of account.\n\
--password:      Password of account.\n\
--nick:          Nickname of character on the account.\n\
--token:         Token, which is used as Blowfish encryption key.\n\
--protocol:      Protocol version number.\n\
--server-id:     ID of game server. If not supplied - print server list and exit.\n\n\
Other options:\n\
-h, --help:      Display this text and exit.\n\
--dump-mode:     Toggles dump analysis mode. Meant to be used with decodePackages tool.\n\
");
		exit(0);
	}

	int isDumpAnalysis = cliFlag(cli, "--dump-mode");
	if(isDumpAnalysis){
		runAsDumpAnalyzer(cliArgVal(cli, "--token"));
		return;
	}

	char* authHost = cliArgVal(cli, "--auth-host");
	int authPort = atoi(cliArgVal(cli, "--auth-port")); // 2106
	int serverId = atoi(cliArgValOrDefault(cli, "--server-id", "-1"));
	char* login = cliArgVal(cli, "--login");
	char* password = cliArgVal(cli, "--password");
	char* nick = cliArgVal(cli, "--nick");
	char* token = cliArgVal(cli, "--token"); // 5F3B352E5D39342D33313D3D2D257854215E5B24
	int protocol = atoi(cliArgVal(cli, "--protocol")); // 656

	free(cli);

	int fd = performLogin(authHost, authPort, serverId, login, password, nick, token, protocol);

	mainLoop(fd);
}

int main(int argc, char* argv[]){
	/*
	char* str = "B5BDC0482FADFEFFCFD60300E8F1FFFF08000000";
	int l = stringLength(str);
	byte* bin = hexToBinary(str, l);
	Binreader* reader = getBinreader(bin, l / 2);
	printf("%i\n", readInt(reader));
	printf("%i\n", readInt(reader));
	printf("%i\n", readInt(reader));
	printf("%i\n", readInt(reader));
	printf("%i\n", readInt(reader));
	*/
	Cli* cli = getCli(argc, argv);
	run(cli);

	return 0;
}