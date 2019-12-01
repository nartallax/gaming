#ifndef __L2CLICLI_FROM_GAME_SERVER_PACKAGES__
#define __L2CLICLI_FROM_GAME_SERVER_PACKAGES__

/* Дешифровка и парсинг пакетов, приходящих от гейм-сервера */

#include "../utils/utils.c"
#include "../utils/hex.c"
#include "../binwork/reader.c"
#include "./game_server.c"

void unxorGameServerPackage(byte* input, int length, byte* xorKey){
	int prevByte = 0;
	for(int i = 0; i < length; i++){
		byte b = input[i];
		input[i] ^= xorKey[i & 7] ^ prevByte;
		prevByte = b;
	}

	updateGameServerXorKey(xorKey, length);
}

char* decodeGameCryptInitPackage(Binreader* pkg){
	readByte(pkg); // first byte skip
	int xorKey = readInt(pkg);
	return formatToString("{\"type\":\"CryptInit\",\"xorKey\":%i}", xorKey);
}

char* decodeGameCharacterListPackage(Binreader* pkg){
	int count = readInt(pkg);
	char** chs = (char**)malloc(sizeof(char*) * count);
	for(int i = 0; i < count; i++){
		char* name = readUtf16InJsonEncoded(pkg);
		readInt(pkg); // id
		skipUtf16String(pkg); // title? login?
		pkg->position += (4 * 60) + (8 * 4);
		int lastUsed = readInt(pkg);
		readByte(pkg);
		chs[i] = formatToString("{\"nick\":%s,\"lastUsed\":%s}", name, lastUsed? "true": "false");
		free(name);
	}

	char* chArr = joinStrings(chs, count, ",");
	for(int i = 0; i < count; i++)
		free(chs[i]);
	free(chs);

	return formatToString("{\"type\":\"CharacterList\",\"characters\":[%s]}", chArr);
}

char* decodeGameCharacterSelectedPackage(Binreader* pkg){
	char* name = readUtf16InJsonEncoded(pkg);
	readInt(pkg); // id
	skipUtf16String(pkg); // title
	pkg->position += 4 * 10;
	double hp = readDouble(pkg);
	double mp = readDouble(pkg);
	int sp = readInt(pkg);
	int exp = readInt(pkg);
	int lvl = readInt(pkg);
	char* result = formatToString(
		"{\"type\":\"CharacterSelected\",\"nick\":%s,\"hp\":%f,\"mp\":%f,\"sp\":%i,\"exp\":%i,\"lvl\":%i}",
		name, hp, mp, sp, exp, lvl
	);
	free(name);
	return result;
}

char* decodeGameMoveToLocation(Binreader* pkg){
	int objId = readInt(pkg), 
		dx = readInt(pkg), dy = readInt(pkg), dz = readInt(pkg), 
		cx = readInt(pkg), cy = readInt(pkg), cz = readInt(pkg);
	return formatToString(
		"{\"type\":\"MoveToLocation\",\"objId\":%i,\"dest\":{\"x\":%i,\"y\":%i,\"z\":%i},\"cur\":{\"x\":%i,\"y\":%i,\"z\":%i}}",
		objId, dx, dy, dz, cx, cy, cz
	);
}

char* decodeGameSSQInfoPackage(Binreader* pkg){
	char* winner;
	switch(readShort(pkg)){
		case 258:	winner = "dawn";	break;
		case 257:	winner = "dusk";	break;
		case 256:	winner = "none";	break;
		default:	winner = "unknown";	break;
	}
	return formatToString("{\"type\":\"SSQInfo\",\"winner\":\"%s\"}", winner);
}

char* decodeGamePingRequestPackage(Binreader* pkg){
	int id = readInt(pkg);
	return formatToString("{\"type\":\"Ping\",\"id\":%i}", id);
}

char* decodeGameUnknownPackage(Binreader* pkg, byte type){
	char* hex = binaryToHex(pkg->data, pkg->length);
	char* result = formatToString("{\"type\":\"Unknown\",\"hex\":\"%s\"}", hex);
	free(hex);
	return result;
}

char* decodeGameCharInfo(Binreader* pkg){
	int x = readInt(pkg), y = readInt(pkg), z = readInt(pkg), heading = readInt(pkg), objId = readInt(pkg);
	char* name = readUtf16InJsonEncoded(pkg);
	int race = readInt(pkg), sex = readInt(pkg), classId = readInt(pkg);
	char* result = formatToString(
		"{\"type\":\"CharInfo\",\"x\":%i,\"y\":%i,\"z\":%i,\"heading\":%i,\"objId\":%i,\"nick\":%s,\"race\":%i,\"sex\":%i,\"class\":%i}",
		x, y, z, heading, objId, name, race, sex, classId
	);
	free(name);
	return result;
}

char* decodeGameSpawnItem(Binreader* pkg){
	int objId = readInt(pkg), itemId = readInt(pkg), x = readInt(pkg), y = readInt(pkg), z = readInt(pkg), stackable = readInt(pkg), count = readInt(pkg);
	return formatToString(
		"{\"type\":\"SpawnItem\",\"objId\":%i,\"itemId\":%i,\"x\":%i,\"y\":%i,\"z\":%i,\"stackable\":%s,\"count\":%i}",
		objId, itemId, x, y, z, stackable? "true": "false", count
	);
}

char* decodeGameDropItem(Binreader* pkg){
	int sourceObjId = readInt(pkg), objId = readInt(pkg), itemId = readInt(pkg), x = readInt(pkg), y = readInt(pkg), z = readInt(pkg), stackable = readInt(pkg), count = readInt(pkg);
	return formatToString(
		"{\"type\":\"DropItem\",\"sourceObjId\":%i,\"objId\":%i,\"itemId\":%i,\"x\":%i,\"y\":%i,\"z\":%i,\"stackable\":%s,\"count\":%i}",
		sourceObjId, objId, itemId, x, y, z, stackable? "true": "false", count
	);
}

char* decodeGameDeleteObject(Binreader* pkg){
	int objId = readInt(pkg);
	return formatToString("{\"type\":\"DeleteObject\",\"objId\":%i}", objId);
}

char* decodeGameTradeRequest(Binreader* pkg){
	int objId = readInt(pkg);
	return formatToString("{\"type\":\"TradeRequest\",\"objId\":%i}", objId);
}

char* decodeGamePartyRequest(Binreader* pkg){
	char* from = readUtf16InJsonEncoded(pkg);
	char* result = formatToString("{\"type\":\"PartyRequest\",\"from\":%s}", from);
	free(from);
	return result;
}

char* decodeGameNpcInfo(Binreader* pkg){
	int objId = readInt(pkg), npcTypeId = readInt(pkg), attackable = readInt(pkg), x = readInt(pkg), y = readInt(pkg), z = readInt(pkg), heading = readInt(pkg);
	return formatToString(
		"{\"type\":\"NpcInfo\",\"objId\":%i,\"npcTypeId\":%i,\"attackable\":%s,\"x\":%i,\"y\":%i,\"z\":%i,\"heading\":%i}",
		objId, npcTypeId, attackable? "true": "false", x, y, z, heading
	);
}

char* decodeGameSay2(Binreader* pkg){
	int objId = readInt(pkg), messageType = readInt(pkg);
	char* source = readUtf16InJsonEncoded(pkg);
	char* message = readUtf16InJsonEncoded(pkg);

	char* messageTypeStr;
	switch(messageType){
		case 0x00: messageTypeStr = "General";		break;
		case 0x01: messageTypeStr = "Shout";		break;
		case 0x02: messageTypeStr = "Whisper";		break;
		case 0x03: messageTypeStr = "Party";		break;
		case 0x04: messageTypeStr = "Clan";			break;
		case 0x08: messageTypeStr = "Trade";		break;
		case 0x09: messageTypeStr = "Alliance";		break;
		case 0x0a: messageTypeStr = "Announcement";	break;
		default:   messageTypeStr = "Unknown";		break;
	}

	char* result = formatToString(
		"{\"type\":\"Say2\",\"objId\":%i,\"messageType\":\"%s\",\"source\":%s,\"message\":%s}",
		objId, messageTypeStr, source, message
	);

	free(source);
	free(message);
	return result;
}

char* decodeGameUserInfo(Binreader* pkg){
	int x = readInt(pkg), y = readInt(pkg), z = readInt(pkg);
	readInt(pkg);
	int objId = readInt(pkg);
	char* nick = readUtf16InJsonEncoded(pkg);
	pkg->position += 3 * 4; // race, sex, class
	int lvl = readInt(pkg), exp = readInt(pkg);
	pkg->position += 6 * 4; // str, dex etc
	int maxHP = readInt(pkg), hp = readInt(pkg), maxMP = readInt(pkg), mp = readInt(pkg);
	// пока что все. но там еще много всякого
	char* result = formatToString(
		"{\"type\":\"UserInfo\",\"nick\":%s,\"objId\":%i,\"x\":%i,\"y\":%i,\"z\":%i,\"lvl\":%i,\"exp\":%i,\"hpMax\":%i,\"hp\":%i,\"mpMax\":%i,\"mp\":%i}",
		nick, objId, x, y, z, lvl, exp, maxHP, hp, maxMP, mp
	);
	free(nick);
	return result;
}

char* decodeGameStatusUpdate(Binreader* pkg){
	int objId = readInt(pkg), count = readInt(pkg);
	char** stats = (char**)malloc(sizeof(char*) * count);
	for(int i = 0; i < count; i++){
		int statType = readInt(pkg), statValue = readInt(pkg);
		char* statTypeStr;
		switch(statType){
			case 0x01:	statTypeStr = "lvl";		break;
			case 0x02:	statTypeStr = "exp";		break;
			case 0x03:	statTypeStr = "str";		break;
			case 0x04:	statTypeStr = "dex";		break;
			case 0x05:	statTypeStr = "con";		break;
			case 0x06:	statTypeStr = "int";		break;
			case 0x07:	statTypeStr = "wit";		break;
			case 0x08:	statTypeStr = "men";		break;
			case 0x09:	statTypeStr = "hp";			break;
			case 0x0a:	statTypeStr = "hpmax";		break;
			case 0x0b:	statTypeStr = "mp";			break;
			case 0x0c:	statTypeStr = "mpmax";		break;
			case 0x0d:	statTypeStr = "sp";			break;
			case 0x0e:	statTypeStr = "weight";		break;
			case 0x0f:	statTypeStr = "weightmax";	break;
			case 0x11:	statTypeStr = "patk";		break;
			case 0x12:	statTypeStr = "patkspd";	break;
			case 0x13:	statTypeStr = "pdef";		break;
			case 0x14:	statTypeStr = "evasion";	break;
			case 0x15:	statTypeStr = "accuracy";	break;
			case 0x16:	statTypeStr = "critical";	break;
			case 0x17:	statTypeStr = "matk";		break;
			case 0x18:	statTypeStr = "matkspd";	break;
			case 0x19:	statTypeStr = "mdef";		break;
			case 0x1a:	statTypeStr = "pvp";		break;
			case 0x1b:	statTypeStr = "karma";		break;
			case 0x21:	statTypeStr = "cp";			break;
			case 0x22:	statTypeStr = "cpmax";		break;
			default:	statTypeStr = "unknown";	break;
		}
		stats[i] = formatToString("{\"stat\":\"%s\",\"value\":%i}", statTypeStr, statValue);
	}

	char* statArr = joinStrings(stats, count, ",");
	for(int i = 0; i < count; i++)
		free(stats[i]);
	free(stats);

	char* result = formatToString("{\"type\":\"StatusUpdate\",\"objId\":%i,\"stats\":[%s]}", objId, statArr);
	free(statArr);
	return result;
}

char* decodeGameTargetChanged(Binreader* pkg){
	int objId = readInt(pkg), targetId = readInt(pkg), x = readInt(pkg), y = readInt(pkg), z = readInt(pkg);
	return formatToString(
		"{\"type\":\"TargetChanged\",\"objId\":%i,\"targetId\":%i,\"x\":%i,\"y\":%i,\"z\":%i}",
		objId, targetId, x, y, z
	);
}

char* decodeGameTargetCleared(Binreader* pkg){
	int objId = readInt(pkg), x = readInt(pkg), y = readInt(pkg), z = readInt(pkg);
	return formatToString(
		"{\"type\":\"TargetCleared\",\"objId\":%i,\"x\":%i,\"y\":%i,\"z\":%i}",
		objId, x, y, z
	);
}

char* decodeGameTradeConfirmed(Binreader* pkg){
	return formatToString("{\"type\":\"TradeConfirmed\"}");
}

char* decodeGameTradeFinished(Binreader* pkg){
	int isOk = readInt(pkg);
	return formatToString(
		"{\"type\":\"TradeFinished\",\"ok\":%s}",
		isOk == 1? "true": "false" // false is 2, unexpected
	);
}

char* decodeGameTradeStarted(Binreader* pkg){
	readInt(pkg); // ???
	int tradeId = readInt(pkg);
	readInt(pkg); // ???
	char* nick = readUtf16InJsonEncoded(pkg);
	char* result = formatToString("{\"type\":\"TradeStarted\",\"tradeId\":%i,\"nick\":%s}", tradeId, nick);
	free(nick);
	return result;
}

char* decodeGameActionAcknowledge(Binreader* pkg){
	int targetId = readInt(pkg);
	return formatToString("{\"type\":\"ActionAcknowledge\",\"targetId\":%i}", targetId);
}

char* decodeGameActionFail(Binreader* pkg){
	return formatToString("{\"type\":\"ActionFail\"}");
}

char* decodeGameSkillList(Binreader* pkg){
	int skillCount = readInt(pkg);
	char** skills = (char**)malloc(sizeof(char*) * skillCount);
	for(int i = 0; i < skillCount; i++){
		int isPassive = readInt(pkg), level = readInt(pkg), id = readInt(pkg);
		skills[i] = formatToString("{\"id\":%i,\"lvl\":%i,\"passive\":%s}", id, level, isPassive? "true": "false");
	}

	char* skillArr = joinStrings(skills, skillCount, ",");
	for(int i = 0; i < skillCount; i++)
		free(skills[i]);
	free(skills);

	char* result = formatToString("{\"type\":\"SkillList\",\"skills\":[%s]}", skillArr);
	free(skillArr);
	return result;
}

char* decodeGameTeleportToLocation(Binreader* pkg){
	int objId = readInt(pkg), x = readInt(pkg), y = readInt(pkg), z = readInt(pkg);
	return formatToString(
		"{\"type\":\"TeleportToLocation\",\"objId\":%i,\"x\":%i,\"y\":%i,\"z\":%i}",
		objId, x, y, z
	);
}

char* decodeGameObjectMovement(Binreader* pkg){
	int objId = readInt(pkg), x = readInt(pkg), y = readInt(pkg), z = readInt(pkg); // one more int, dunno what it does
	return formatToString(
		"{\"type\":\"ObjectMovement\",\"objId\":%i,\"x\":%i,\"y\":%i,\"z\":%i}",
		objId, x, y, z
	);
}

char* decodeGameResurrectAttempt(Binreader* pkg){
	int id = readInt(pkg); // resurrection ID? is this a thing? seems so
	pkg->position += 2 * 4; // what are these ints?
	char* nick = readUtf16InJsonEncoded(pkg);
	// one more trailing int
	char* result = formatToString("{\"type\":\"ResurrectAttempt\",\"from\":%s,\"id\":%i}", nick, id);
	free(nick);
	return result;
}

char* decodeGameItemList(Binreader* pkg){
	short openInventory = readShort(pkg);
	short itemCount = readShort(pkg);

	char** items = (char**)malloc(sizeof(char*) * itemCount);
	for(int i = 0; i < itemCount; i++){
		readShort(pkg); // itemtype1, useless 
		int objectId = readInt(pkg);
		int itemId = readInt(pkg);
		int count = readInt(pkg);
		readShort(pkg); // itemtype2, useless
		readShort(pkg); // ???
		short isEquipped = readShort(pkg);
		readInt(pkg); // body part (?)
		short enchantLevel = readShort(pkg);
		readShort(pkg); // ???
		items[i] = formatToString(
			"{\"objId\":%i,\"itemId\":%i,\"equipped\":%s,\"enchantLevel\":%i,\"count\":%i}",
			objectId, itemId, isEquipped? "true": "false", enchantLevel, count
		);
	}

	char* itemArr = joinStrings(items, itemCount, ",");
	for(int i = 0; i < itemCount; i++)
		free(items[i]);
	free(items);

	char* result = formatToString(
		"{\"type\":\"ItemList\",\"openInventory\":%s,\"items\":[%s]}",
		openInventory? "true": "false", itemArr
	);
	free(itemArr);
	return result;
}




char* decodeGameServerPkg(byte* pkgBytes, int length){
	if(gameServerDecodeXorKey){
		unxorGameServerPackage(pkgBytes, length, gameServerDecodeXorKey);
	}

	Binreader* pkg = getBinreader(pkgBytes, length);

	char* result;
	byte pkgType = readByte(pkg);

	//fprintf(stderr, "DECODE %s\n", binaryToHex(pkgBytes, length));
	//fflush(stderr);

	switch(pkgType){
		case 0x00:	result = decodeGameCryptInitPackage(pkg);			break;
		case 0x01:	result = decodeGameMoveToLocation(pkg);				break;
		case 0x03:	result = decodeGameCharInfo(pkg);					break;
		case 0x04:	result = decodeGameUserInfo(pkg);					break;
		//case 0x06:	result = decodeGameObjectDied(pkg);					break; // first int is definitely objId of dying object
		case 0x0b:	result = decodeGameSpawnItem(pkg);					break;
		case 0x0c:	result = decodeGameDropItem(pkg);					break;
		case 0x0e:	result = decodeGameStatusUpdate(pkg);				break; // sometimes just don't happen
		case 0x12:	result = decodeGameDeleteObject(pkg);				break;
		case 0x13:	result = decodeGameCharacterListPackage(pkg);		break;
		case 0x15:	result = decodeGameCharacterSelectedPackage(pkg);	break;
		case 0x16:	result = decodeGameNpcInfo(pkg);					break;
		case 0x1b:	result = decodeGameItemList(pkg);					break;
		//case 0x21:	result = decodeGameTradeItemAdded(pkg);				break; 
		case 0x22:	result = decodeGameTradeFinished(pkg);				break;
		case 0x25:	result = decodeGameActionFail(pkg);					break;
		case 0x29:	result = decodeGameTargetChanged(pkg);				break;
		case 0x2a:	result = decodeGameTargetCleared(pkg);				break;
		case 0x38:	result = decodeGameTeleportToLocation(pkg);			break;
		case 0x39:	result = decodeGamePartyRequest(pkg);				break;
		case 0x47:	result = decodeGameObjectMovement(pkg);				break; // why not MoveToLocation? dunno.
		case 0x4a:	result = decodeGameSay2(pkg);						break;
		case 0x58:	result = decodeGameSkillList(pkg);					break;
		case 0x5e:	result = decodeGameTradeRequest(pkg);				break;
		//case 0x64:	result = decodeGameTradeStarted(pkg);				break;// it's not only tradestarted; it has many purposes
		case 0x7c:	result = decodeGameTradeConfirmed(pkg);				break;// it's also not only tradeconfirmed
		case 0xa6:	result = decodeGameActionAcknowledge(pkg);			break; // is it TargetChange?
		//case 0xb9:	result = decodeGamePrivateStoreMsgBuy(pkg);			break;
		//case 0x9c:	result = decodeGamePrivateStoreMsgSell(pkg);		break;
		case 0xf8:	result = decodeGameSSQInfoPackage(pkg);				break;
		case 0xd3:	result = decodeGamePingRequestPackage(pkg);			break;
		case 0xed:	result = decodeGameResurrectAttempt(pkg);			break;
		default: 	result = decodeGameUnknownPackage(pkg, pkgType);	break;
	}
	
	free(pkg);
	return result;
}

#endif