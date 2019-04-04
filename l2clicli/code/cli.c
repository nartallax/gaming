#ifndef __L2CLICLI_CLI__
#define __L2CLICLI_CLI__

#include <string.h>
#include "../utils/utils.c"

typedef struct {
	int argc;
	char** argv;
} Cli;

Cli* getCli(int argc, char** argv){
	Cli* res = (Cli*)malloc(sizeof(Cli));
	res->argc = argc;
	res->argv = argv;
	return res;
}

int cliFlag(Cli* cli, char* name){
	for(int i = 0; i < cli->argc; i++){
		if(!strcmp(name, cli->argv[i]))
			return 1;
	}
	return 0;
}

char* cliArgValOrDefault(Cli* cli, char* name, char* dflt){
	for(int i = 0; i < cli->argc; i++){
		if(!strcmp(name, cli->argv[i])){
			if(i == cli->argc - 1)
				exitWithError("Expected value after command-line key \"%s\"", cli->argv[i]);
			return cli->argv[i + 1];
		}
	}
	return dflt;
}

char* cliArgVal(Cli* cli, char* name){
	char* res = cliArgValOrDefault(cli, name, NULL);
	if(!res)
		exitWithError("Required command-line key is not present: \"%s\"", name);
	return res;
}

#endif