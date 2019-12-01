#ifndef __L2CLIBOT_JSONUTILS__
#define __L2CLIBOT_JSONUTILS__

#include<string.h>

#include "json/json.c"
#include "utils.c"

json_value* jsonValueByKey(json_value* obj, const char* key){
	for(int i = 0; i < obj->u.object.length; i++){
		if(!strcmp(obj->u.object.values[i].name, key))
			return obj->u.object.values[i].value;
	}
	exitWithError("Expected key not found in JSON object: \"%s\".", key);
	return NULL;
}

#endif