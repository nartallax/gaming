import {CommandBus} from "interfaces/command";
import {AccountDefinition, GameClientDefinition, HostDefinition} from "interfaces/config";
import {ChatAction, CharacterAction, HotkeyAction, SetupHotkeysAction, BringToFrontAction, CancelActionAction, RehookAction, ConfirmTradeAction, AcceptPartyAction, AcceptTradeAction, SitStandAction, StandAction, AssistAction, UseSkillAction, TargetAction, LeaveAction, PrintStatusAction, UnstuckAction, SendRawPackageAction, ResurrectAtCity, EvaluateAction, AssistEvaluateAction} from "interfaces/action";
import {sleep} from "./sleep";
import {DefBundle} from "./config";
import {SkillName} from "./client/cli/skill_ids";
import {L2CliCliOutcomingPackage} from "./client/cli/l2clicli_outcoming_package";

function nick(charOrNick: string | Character){
	return typeof(charOrNick) === "string"? charOrNick: charOrNick.def.nickname;
}

/** Через этот объект пользователь из сценария может управлять конкретным персонажем
 * Все, для чего нужен этот объект - формировать action-ы и передавать их в CommandBus */
export class Character {
	private readonly bus: CommandBus;
	private readonly config: DefBundle;
	private readonly accountName: string;
	private readonly clientName: string;

	get nick(): string { return this.def.nickname; }

	get def(): AccountDefinition { return this.config.account(this.accountName) }
	get client(): GameClientDefinition { return this.config.client(this.clientName) }
	get host(): HostDefinition { return this.config.host(this.client.host) }

	private run<A extends CharacterAction>(action: A){
		return this.bus.runCharacterAction(this.def.nickname, action);
	}

	constructor(config: DefBundle, account: string, client: string, bus: CommandBus){
		this.bus = bus;
		this.config = config;
		this.accountName = account;
		this.clientName = client;
	}

	async partyWith(otherChar: Character){
		await this.chat("/invite " + nick(otherChar));
		await sleep(500);
		await otherChar.acceptParty();
		await sleep(500);
	}

	async tradeWith(otherChar: Character){
		await this.target(otherChar);
		await sleep(250);
		await this.trade();
		await otherChar.acceptTrade();
	}

	async partyWithMany(chars: Character[]){
		for(let char of chars)
			await this.partyWith(char);
	}

	rehook(){ return this.run<RehookAction>({type: "rehook" }) }
	bringToFront(){ return this.run<BringToFrontAction>({type: "bringToFront"}) }
	setupHotkeys(hotkeys: { readonly [line: string]: () => void}){
		return this.run<SetupHotkeysAction>({type: "hotkeys", hotkeys })
	}
	cancelAction(){ 					return this.run<CancelActionAction>({type: "cancelAction"}) }
	useHotkey(slot: number){		 	return this.run<HotkeyAction>({type: "hotkey", slot}) }
	acceptParty(){ 						return this.run<AcceptPartyAction>({ type: "acceptParty" }) }
	acceptTrade(){ 						return this.run<AcceptTradeAction>({ type: "acceptTrade" }) }
	chat(str: string){ 					return this.run<ChatAction>({ type: "chat", content: str }) }
	confirmTrade(){ 					return this.run<ConfirmTradeAction>({ type: "confirmTrade" }) }
	leave(){ 							return this.run<LeaveAction>({ type: "leave" }) }
	sitStand(){ 						return this.run<SitStandAction>({ type: "sitStand" }) }
	assist(char: Character | string){ 	return this.run<AssistAction>({ type: "assist", target: nick(char) }) }
	target(char: Character | string){	return this.run<TargetAction>({ type: "target", target: nick(char) }) }
	useSkill(skill: SkillName){ 		return this.run<UseSkillAction>({ type: "useSkill", skillName: skill }) }
	stand(){ 							return this.run<StandAction>({ type: "stand" }) }
	printStatus(){ 						return this.run<PrintStatusAction>({ type: "printStatus" }) }
	unstuck(){ 							return this.run<UnstuckAction>({ type: "unstuck" }) }
	resurrectAtCity(){ 					return this.run<ResurrectAtCity>({ type: "resurrectAtCity" }) }
	evaluate(target: Character | string){
		return this.run<EvaluateAction>({ type: "evaluate", target: nick(target) })
	}
	assistEvaluate(target: Character | string){
		return this.run<AssistEvaluateAction>({ type: "assistEvaluate", target: nick(target) }) 
	}

	sendRawPackage(pkg: L2CliCliOutcomingPackage){
		return this.run<SendRawPackageAction>({ type: "sendRawPackage", package: pkg }) 
	}
	
	attack(){ return this.chat("/attack") }
	trade(){ return this.chat("/trade") }
	pickup(){ return this.chat("/pickup") }
	
	
}