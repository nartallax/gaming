#ifndef __L2CLICLI_TO_GAME_SERVER_PACKAGES__
#define __L2CLICLI_TO_GAME_SERVER_PACKAGES__

/* Запись в бинарном виде и шифрование пакетов, отправляемых гейм-серверу */

#include "../binwork/writer.c"
#include "../utils/json.c"
#include "./game_server.c"

byte xorGameServerPackageBlock(byte* raw, int length, byte prevByte){
	for (int i = 0; i < length; i++){ 
		raw[i] ^= gameServerEncodeXorKey[i & 7] ^ prevByte;
		prevByte = raw[i];
	}
	return prevByte;
}

void xorGameServerPackageFinish(int length){
	updateGameServerXorKey(gameServerEncodeXorKey, length);
}

void xorGameServerPackage(byte* raw, int length){
	xorGameServerPackageBlock(raw, length, 0);
	xorGameServerPackageFinish(length);
}

void encodeGameProtocolVersionPkg(json_value* obj, Binwriter* writer){
	char* magicHex = "0907545603090b0107025454560700025556005100535704075508540107015300565556010605045103085108515604540655080209515601530655045300565653010902090151545109555609030407055504065504060904510108080605520604010754030652550655555101020454035554015751550552055407515155070253530052055207015400030505080605050603000d08010709035103075309510607540a50560252040555510253000854045256060209000803535601050055060856040d0607520607040a0601045404000502045400095253050401040505015251520d065108095453000d01020354530105030856540702540b06";
	int protocolVersion = jsonValueByKey(obj, "protocolVersion")->u.integer;

	writeByte(writer, 0x00);
	writeInt(writer, protocolVersion);
	writeHexAsBytes(writer, magicHex);
}

void encodeGameRequestAuthLoginPkg(json_value* obj, Binwriter* writer){
	json_value* loginJson = jsonValueByKey(obj, "login");
	char* login = loginJson->u.string.ptr;
	int loginLength = loginJson->u.string.length;

	json_value* sessionKeyAJson = jsonValueByKey(obj, "sessionKeyA");
	int sessionKeyA1 = sessionKeyAJson->u.array.values[0]->u.integer;
	int sessionKeyA2 = sessionKeyAJson->u.array.values[1]->u.integer;

	json_value* sessionKeyBJson = jsonValueByKey(obj, "sessionKeyB");
	int sessionKeyB1 = sessionKeyBJson->u.array.values[0]->u.integer;
	int sessionKeyB2 = sessionKeyBJson->u.array.values[1]->u.integer;

	writeByte(writer, 0x08);
	writeAsciiAsUtf16(writer, login, loginLength);
	writeInt(writer, sessionKeyB2);
	writeInt(writer, sessionKeyB1);
	writeInt(writer, sessionKeyA1);
	writeInt(writer, sessionKeyA2);
	writeInt(writer, 0x01);
}

void encodeGameCharacterSelectedPkg(json_value* obj, Binwriter* writer){
	int charIndex = jsonValueByKey(obj, "characterIndex")->u.integer;
	writeByte(writer, 0x0d);
	writeShort(writer, charIndex);
	writeInt(writer, 0);
	writeInt(writer, 0);
	writeInt(writer, 0);
	writeInt(writer, 0);
}

void encodeGameEnterWorldPkg(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x03);
	writeInt(writer, 0);
	writeInt(writer, 0);
	writeInt(writer, 0);
	writeInt(writer, 0);
}

void encodeGamePingResponsePkg(json_value* obj, Binwriter* writer){
	int pingId = jsonValueByKey(obj, "id")->u.integer;
	int ping = jsonValueByKey(obj, "ping")->u.integer;

	writeByte(writer, 0xa8);
	writeInt(writer, pingId);
	writeInt(writer, ping);
	writeInt(writer, 0x0800);
}

void encodeGameAnswerTradeRequest(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x44);
	writeInt(writer, jsonValueByKey(obj, "ok")->u.boolean? 1: 0);
}

void encodeGameAddTradeItem(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x16);
	writeInt(writer, jsonValueByKey(obj, "tradeId")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "objId")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "count")->u.integer);
}

void encodeGameTradeDone(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x17);
	writeInt(writer, jsonValueByKey(obj, "ok")->u.boolean? 1: 0);
}

void encodeGameAnswerJoinParty(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x2a);
	writeInt(writer, jsonValueByKey(obj, "ok")->u.boolean? 1: 0);
}

void encodeGameLeaveParty(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x2b);
}

void encodeGameAction(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x04);
	writeInt(writer, jsonValueByKey(obj, "objId")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "x")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "y")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "z")->u.integer);
	writeByte(writer, jsonValueByKey(obj, "shift")->u.boolean? 1: 0);
}

void encodeGameRequestSkillList(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x3f);
}

void encodeGameMagicSkillUse(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x2f);
	writeInt(writer, jsonValueByKey(obj, "skillId")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "ctrl")->u.boolean? 1: 0);
	writeInt(writer, jsonValueByKey(obj, "shift")->u.boolean? 1: 0);
}

void encodeGameChangeWaitType(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x1d);
	writeInt(writer, jsonValueByKey(obj, "sit")->u.boolean? 0: 1);
}

void encodeGameActionUse(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x45);
	writeInt(writer, jsonValueByKey(obj, "actionId")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "ctrl")->u.boolean? 1: 0);
	writeByte(writer, jsonValueByKey(obj, "shift")->u.boolean? 1: 0);
}

void encodeGameCancel(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x37);
	writeShort(writer, 0);
}

// TODO: понять, где еще этот пакет используется, и что он вообще значит
void encodeGameUseSpecialSkill(json_value* obj, Binwriter* writer){
	writeByte(writer, 0xaa);
	writeInt(writer, jsonValueByKey(obj, "skillId")->u.integer);
}

void encodeGameValidatePosition(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x48);
	writeInt(writer, jsonValueByKey(obj, "x")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "y")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "z")->u.integer);
	writeInt(writer, jsonValueByKey(obj, "heading")->u.integer);
	writeInt(writer, 0);
}

void encodeGameAppearing(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x30);
}

void encodeGameRequestRestartPoing(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x6d);
	writeInt(writer, jsonValueByKey(obj, "pointType")->u.integer);
}

void encodeGameAcceptResurrection(json_value* obj, Binwriter* writer){
	writeByte(writer, 0xc5);
	writeInt(writer, jsonValueByKey(obj, "id")->u.integer); // 1510 here
	writeInt(writer, 1);
}

void encodeGameEvaluate(json_value* obj, Binwriter* writer){
	writeByte(writer, 0xb9);
	writeInt(writer, jsonValueByKey(obj, "objId")->u.integer);
}

void encodeGameRequestItemList(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x0f);
}

void encodeGameUseItem(json_value* obj, Binwriter* writer){
	writeByte(writer, 0x14);
	writeInt(writer, jsonValueByKey(obj, "objId")->u.integer);
	writeInt(writer, 0);
}





Binwriter* encodeGameServerPkg(const char* pkgJson){
	json_value* obj = json_parse(pkgJson, stringLength(pkgJson));
	char* type = jsonValueByKey(obj, "type")->u.string.ptr;

	Binwriter* writer = getBinwriter();

	     if(!strcmp(type, "ProtocolVersion")) 		encodeGameProtocolVersionPkg(obj, writer);
	else if(!strcmp(type, "RequestAuthLogin"))		encodeGameRequestAuthLoginPkg(obj, writer);
	else if(!strcmp(type, "CharacterSelected"))		encodeGameCharacterSelectedPkg(obj, writer);
	else if(!strcmp(type, "EnterWorld"))			encodeGameEnterWorldPkg(obj, writer);
	else if(!strcmp(type, "PingResponse"))			encodeGamePingResponsePkg(obj, writer);

	else if(!strcmp(type, "AnswerTradeRequest"))	encodeGameAnswerTradeRequest(obj, writer);
	else if(!strcmp(type, "AddTradeItem"))			encodeGameAddTradeItem(obj, writer);
	else if(!strcmp(type, "TradeDone"))				encodeGameTradeDone(obj, writer);
	else if(!strcmp(type, "AnswerJoinParty"))		encodeGameAnswerJoinParty(obj, writer);
	else if(!strcmp(type, "LeaveParty"))			encodeGameLeaveParty(obj, writer);
	else if(!strcmp(type, "Action"))				encodeGameAction(obj, writer);
	else if(!strcmp(type, "RequestSkillList"))		encodeGameRequestSkillList(obj, writer);
	else if(!strcmp(type, "MagicSkillUse"))			encodeGameMagicSkillUse(obj, writer);
	else if(!strcmp(type, "ChangeWaitType"))		encodeGameChangeWaitType(obj, writer);
	else if(!strcmp(type, "ActionUse"))				encodeGameActionUse(obj, writer);
	else if(!strcmp(type, "Cancel"))				encodeGameCancel(obj, writer);
	else if(!strcmp(type, "UseSpecialSkill"))		encodeGameUseSpecialSkill(obj, writer);
	else if(!strcmp(type, "ValidatePosition"))		encodeGameValidatePosition(obj, writer);
	else if(!strcmp(type, "Appearing"))				encodeGameAppearing(obj, writer);
	else if(!strcmp(type, "RequestRestartPoint"))	encodeGameRequestRestartPoing(obj, writer);
	else if(!strcmp(type, "AcceptResurrection"))	encodeGameAcceptResurrection(obj, writer);
	else if(!strcmp(type, "Evaluate"))				encodeGameEvaluate(obj, writer);
	else if(!strcmp(type, "RequestItemList"))		encodeGameRequestItemList(obj, writer);
	else if(!strcmp(type, "UseItem"))				encodeGameUseItem(obj, writer);

	else {
		exitWithError("Unknown game server package type: \"%s\".", type);
	}

	{ // XOR-им пакет
		if(gameServerEncodeXorKey){
			int blockCount = binwriterBlocksCount(writer);
			byte prevByte = 0;
			for(int i = 0; i < blockCount; i++){
				int blockSize = i == blockCount - 1? writer->size % BINWRITER_BLOCK_SIZE: BINWRITER_BLOCK_SIZE;
				prevByte = xorGameServerPackageBlock(writer->dataBlocks[i], blockSize, prevByte);
			}
			xorGameServerPackageFinish(writer->size);
		}
	}

	json_value_free(obj);
	return writer;
}

Binwriter* vformatEncodeGameServerPkg(const char* formatString, va_list args){
	char* str = vformatToString(formatString, args);
	Binwriter* w = encodeGameServerPkg(str);
	free(str);
	return w;
}

Binwriter* formatEncodeGameServerPkg(const char* formatString, ...){
	va_list args;
    va_start(args, formatString);
	return vformatEncodeGameServerPkg(formatString, args);
}


#endif