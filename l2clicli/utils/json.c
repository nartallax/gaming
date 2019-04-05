#ifndef __L2CLICLI_JSONUTILS__
#define __L2CLICLI_JSONUTILS__

/* Утилиты работы с JSON */

#include<string.h>

#include "../libsrc/json/json.c"
#include "../libsrc/json/json-builder.c"
#include "./utils.c"

json_value* jsonValueByKey(json_value* obj, const char* key){
	for(int i = 0; i < obj->u.object.length; i++){
		if(!strcmp(obj->u.object.values[i].name, key))
			return obj->u.object.values[i].value;
	}
	exitWithError("Expected key not found in JSON object: \"%s\".", key);
	return NULL;
}

char* jsonEscapeString(byte* utf8str){
	json_value* jsonStr = json_string_new((char*)utf8str);
	char* result = malloc(json_measure(jsonStr));
	json_serialize(result, jsonStr);
	json_value_free(jsonStr);
	return result;
}

#endif