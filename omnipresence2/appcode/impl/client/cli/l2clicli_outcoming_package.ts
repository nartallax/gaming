export type L2CliCliOutcomingPackage = AnswerJoinParty | LeaveParty | Action | RequestSkillList | MagicSkillUse | Cancel | ChangeWaitType | ActionUse | UseSpecialSkill | Appearing | RequestRestartPoint | AcceptResurrection | Evaluate | RequestItemList | UseItem;

export interface AnswerJoinParty {
	type: "AnswerJoinParty";
	ok: boolean;
}

export interface LeaveParty {
	type: "LeaveParty";
}

export interface Action {
	type: "Action";
	x: number;
	y: number;
	z: number;
	objId: number;
	shift: boolean;
}

export interface RequestSkillList {
	type: "RequestSkillList";
}

export interface MagicSkillUse {
	type: "MagicSkillUse";
	skillId: number;
	ctrl: boolean;
	shift: boolean;
}

export interface Cancel {
	type: "Cancel"
}

export interface ChangeWaitType {
	type: "ChangeWaitType"
	sit: boolean
}

export interface ActionUse {
	type: "ActionUse";
	actionId: number;
	ctrl: boolean;
	shift: boolean;
}

export interface UseSpecialSkill {
	type: "UseSpecialSkill";
	skillId: number;
}

export interface ValidatePosition {
	type: "ValidatePosition";
	x: number;
	y: number;
	z: number;
	heading: number;
}

export interface Appearing {
	type: "Appearing";
}

export interface RequestRestartPoint {
	type: "RequestRestartPoint";
	pointType: number;
}

export interface AcceptResurrection {
	type: "AcceptResurrection";
	id: number;
}

export interface Evaluate {
	type: "Evaluate";
	objId: number;
}

export interface RequestItemList {
	type: "RequestItemList"
}

export interface UseItem {
	type: "UseItem";
	objId: number;
}