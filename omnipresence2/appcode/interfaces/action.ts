import {DefinitionBundle} from "./config";
import {SkillName} from "impl/client/cli/skill_ids";
import {L2CliCliOutcomingPackage} from "impl/client/cli/l2clicli_outcoming_package";

/** Действие. Не привязано к конкретному клиенту/хосту */
export type Action = HostAction | CharacterAction



export type HostAction = ConfigSyncAction | SetCharsAction | LaunchAction | ShutdownClientsAction

export interface ConfigSyncAction {
	type: "configSync";
	config: DefinitionBundle;
}

export interface SetCharsAction {
	type: "setChars";
	chars: {nick: string, client: string}[];
}

export interface LaunchAction {
	type: "launch";
}

export interface ShutdownClientsAction {
	type: "shutdownClients";
}


export type CharacterAction = ChatAction | SetupHotkeysAction | HotkeyAction | BringToFrontAction | CancelActionAction | RehookAction | ConfirmTradeAction | UseSkillAction | TargetAction | AcceptPartyAction | AcceptTradeAction | SitStandAction | StandAction | AssistAction | LeaveAction | PrintStatusAction | UnstuckAction | SendRawPackageAction | ResurrectAtCity | EvaluateAction | AssistEvaluateAction;

export interface ChatAction {
	type: "chat";
	content: string;
}

/** Несериализуемое действие - может быть исполнено только на мастере */
export interface SetupHotkeysAction {
	type: "hotkeys";
	hotkeys: {readonly [line: string]: () => void}
}

export interface HotkeyAction {
	type: "hotkey";
	slot: number;
}

export interface UseSkillAction {
	type: "useSkill";
	skillName: SkillName;
}

export interface TargetAction {
	type: "target";
	target: string;
}

export interface AssistAction {
	type: "assist";
	target: string;
}

export interface SendRawPackageAction {	
	type: "sendRawPackage";
	package: L2CliCliOutcomingPackage;
}

export interface EvaluateAction {	
	type: "evaluate";
	target: string;
}

export interface AssistEvaluateAction {	
	type: "assistEvaluate";
	target: string;
}

export interface BringToFrontAction {	type: "bringToFront" }
export interface CancelActionAction {	type: "cancelAction" }
export interface RehookAction {			type: "rehook" }
export interface ConfirmTradeAction { 	type: "confirmTrade" }
export interface AcceptPartyAction { 	type: "acceptParty" }
export interface AcceptTradeAction { 	type: "acceptTrade" }
export interface SitStandAction { 		type: "sitStand" }
export interface StandAction { 			type: "stand" }
export interface LeaveAction { 			type: "leave" }
export interface PrintStatusAction {	type: "printStatus" }
export interface UnstuckAction {		type: "unstuck" }
export interface ResurrectAtCity {		type: "resurrectAtCity" }