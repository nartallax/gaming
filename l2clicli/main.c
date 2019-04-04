/**
 * Немного о том, откуда брать токен для Blowfish
 * Он зашит в engine.dll
 * Для его извлечения существует прога EngineExt, но у меня она не завелась
 * Поэтому можно сдампить engine.dll с помощью, например, LordPE
 */

#define _WIN32_WINNT 0x0500
#define WINVER 0x0501
#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <unistd.h>

#include "utils/utils.c"
#include "utils/hex.c"
#include "utils/network.c"
#include "code/cli.c"
#include "code/login.c"

int main(int argc, char* argv[]){
	Cli* cli = getCli(argc, argv);
	int isHelp = argc < 2 || cliFlag(cli, "-h") || cliFlag(cli, "--help") || cliFlag(cli, "-help");
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
-h, --help:      display this text and exit.\n\
");
		exit(0);
	}

	char* authHost = cliArgVal(cli, "--auth-host");
	int authPort = atoi(cliArgVal(cli, "--auth-port")); // 2106
	int serverId = atoi(cliArgValOrDefault(cli, "--server-id", "-1"));
	char* login = cliArgVal(cli, "--login");
	char* password = cliArgVal(cli, "--password");
	char* nick = cliArgVal(cli, "--nick");
	char* token = cliArgVal(cli, "--token"); // 5F3B352E5D39342D33313D3D2D257854215E5B24
	int protocol = atoi(cliArgVal(cli, "--protocol")); // 656
	int fd = performLogin(authHost, authPort, serverId, login, password, nick, token, protocol);

	while(1){
		char* pkgStr = readDecodePkg(fd, 0);
		json_value* pkg = json_parse(pkgStr, stringLength(pkgStr));
		char* pkgType = jsonValueByKey(pkg, "type")->u.string.ptr;
		if(!strcmp(pkgType, "Ping")){
			int pingId = jsonValueByKey(pkg, "id")->u.integer;
			formatEncodeSendPkg(fd, 0, "{\"type\":\"PingResponse\",\"id\":%i,\"ping\":%i}", pingId, 100);
		} else {
			printf("%s\n", pkgStr);
		}
		free(pkgStr);
		json_value_free(pkg);
	}

	return 0;
}