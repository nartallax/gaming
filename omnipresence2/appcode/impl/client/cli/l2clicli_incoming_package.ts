export type L2CliCliIncomingPackage = { type: string } & CharacterSelected | CharInfo | DeleteObject | PartyRequest | TargetChanged | TargetCleared | ActionAcknowledge | ActionFail | SkillList | UserInfo | StatusUpdate | TeleportToLocation | MoveToLocation | ObjectMovement | ResurrectAttempt | ItemList;

export interface CharacterSelected {
	type: "CharacterSelected";
	nick: string;
	hp: number;
	mp: number;
	sp: number;
	exp: number;
	lvl: number;
}

export interface CharInfo {
	type: "CharInfo";
	x: number;
	y: number;
	z: number;
	heading: number;
	objId: number;
	nick: string;
	race: number;
	sex: number;
	class: number;
}

export interface DeleteObject {
	type: "DeleteObject";
	objId: number;
}

export interface PartyRequest {
	type: "PartyRequest";
	from: string;
}

export interface TargetChanged {
	type: "TargetChanged";
	objId: number;
	targetId: number;
	x: number;
	y: number;
	z: number;
}

export interface TargetCleared {
	type: "TargetCleared";
	objId: number;
	x: number;
	y: number;
	z: number;
}

export interface ActionAcknowledge {
	type: "ActionAcknowledge";
	targetId: number;
}

export interface ActionFail {
	type: "ActionFail";
}

export interface SkillList {
	type: "SkillList";
	skills: {
		id: number;
		lvl: number;
		passive: boolean;
	}[];
}

export interface UserInfo {
	type: "UserInfo";
	nick: string;
	objId: number;
	x: number;
	y: number;
	z: number;
	lvl: number;
	exp: number;
	hpMax: number;
	hp: number;
	mpMax: number;
	mp: number;
}

export interface StatUpdate {
	stat: "lvl" | "exp" | "str" | "dex" | "con" | "int" | "wit" | "men" | "hp" | "hpmax" | "mp" | "mpmax" | "sp" | "weight" | "weightmax" | "patk" | "patkspd" | "pdef" | "evasion" | "accuracy" | "critical" | "matk" | "matkspd" | "mdef" | "pvp" | "karma" | "cp" | "cpmax" | "unknown";
		value: number;
}

export interface StatusUpdate {
	type: "StatusUpdate";
	objId: number;
	stats: StatUpdate[];
}

export interface TeleportToLocation {
	type: "TeleportToLocation";
	objId: number;
	x: number;
	y: number;
	z: number;
}

export interface MoveToLocation {
	type: "MoveToLocation";
	objId: number;
	dest: {x: number; y: number; z: number};
	cur: {x: number; y: number; z: number};
}

export interface ObjectMovement {
	type: "ObjectMovement";
	objId: number;
	x: number;
	y: number;
	z: number;
}

export interface ResurrectAttempt {
	type: "ResurrectAttempt";
	from: string;
	id: number;
}

export interface ItemList {
	type: "ItemList";
	openInventory: boolean;
	items: {
		objId: number;
		itemId: number;
		equpped: number;
		enchantLevel: number;
		count: number;
	}[];
}