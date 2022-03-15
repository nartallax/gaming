import * as cp from "child_process";
import * as rl from "readline";
import {GameClientLocal} from "../client_local";
import {CustomGameClientDefinition} from "interfaces/config";
import {log} from "impl/log";
import {Readable, Writable} from "stream";
import {L2CliCliIncomingPackage, UserInfo, ItemList, StatUpdate} from "./l2clicli_incoming_package";
import {CharacterAction} from "interfaces/action";
import {L2CliCliOutcomingPackage} from "./l2clicli_outcoming_package";
import {skillIds} from "./skill_ids";
import {ItemName, itemIds, getItemName} from "./item_ids";
import {sleep} from "impl/sleep";

interface CharData {
	nick: string;
	target: number | null;
}

const shotItemNames: ItemName[] = [
	"Soulshot: No Grade",	"Spiritshot: No Grade",	"Blessed Spiritshot: No Grade",
	"Soulshot: D-grade",	"Spiritshot: D-grade",	"Blessed Spiritshot: D Grade",
	"Soulshot: C-grade",	"Spiritshot: C-grade",	"Blessed Spiritshot: C Grade",
	"Soulshot: B-grade",	"Spiritshot: B-grade",	"Blessed Spiritshot: B Grade",
	"Soulshot: A-grade",	"Spiritshot: A-grade",	"Blessed Spiritshot: A Grade",
	"Soulshot: S-grade",	"Spiritshot: S-grade",	"Blessed Spiritshot: S Grade"
]
const shotItemIds = new Set<number>(shotItemNames.map(_ => itemIds[_][0]));

export class GameClientCLI extends GameClientLocal {

	private proc: cp.ChildProcess | null = null;

	private get customClient(): CustomGameClientDefinition {
		let cl = this.client as CustomGameClientDefinition;
		if(!cl.token)
			throw new Error("Wrong client selected for client definition: " + JSON.stringify(cl));
		return cl;
	}

	protected async doLogin(): Promise<void>{
		this.close();

		let cl = this.customClient;
		let proc = this.proc = cp.spawn(
			"./l2clicli", 
			[
				"--auth-host", cl.authHost,
				"--auth-port", cl.authPort + "",
				"--login", this.account.login,
				"--password", this.account.password,
				"--nick", this.account.nickname,
				"--token", cl.token,
				"--protocol", cl.protocol + "",
				"--server-id", cl.serverId + ""
			]
		);

		proc.on("exit", (code, signal) => {
			log("Process exited with " + (signal? "signal " + signal: "code " + code));
			this.proc = null;
			this.close();
		});

		this.nickObjIdMap = new Map();
		this.objIdNickMap = new Map();
		this.knownSkills = new Set()

		rl.createInterface({input: proc.stdout as Readable}).on("line", line => {
			let pkg: L2CliCliIncomingPackage;
			try {
				pkg = JSON.parse(line);
			} catch(e){
				log("Failed to parse incoming package: " + line);
				return;
			}

			this.processPackageFromClient(pkg);
		});

		(proc.stderr as Readable).on("data", data => log("L2CliCli stderr: " + (data instanceof Buffer? data.toString("utf8"): data)))

		await this.waitForPackage("CharacterSelected");
		await this.refreshSkillList();
		await this.refreshInventory();
		await this.useShots();
	}

	get isLoggedIn(): boolean {
		return !!this.proc;
	}

	async close(): Promise<void>{
		if(this.proc){
			this.proc.kill();
			return;
		}
	}

	private nickObjIdMap = new Map<string, number>();
	private objIdNickMap = new Map<number, CharData>();
	private userInfo: UserInfo | null = null;
	private itemList: ItemList | null = null
	private equipList: number[] | null = null; // itemIDs of equipped on startup
	private shotIds: number[] | null = null; // objectIDs of all the soulshots/spiritshots in inventory
	private knownSkills = new Set<number>();
	private processPackageFromClient(pkg: L2CliCliIncomingPackage){
		if(this.packageWaiters[pkg.type]){
			let waiters = this.packageWaiters[pkg.type];
			delete this.packageWaiters[pkg.type];
			waiters.forEach(_ => _());
		}
		//console.log(JSON.stringify(pkg));
		switch(pkg.type){
			case "CharInfo":{
				let old = this.objIdNickMap.get(pkg.objId);
				if(old){
					this.nickObjIdMap.delete(old.nick);
				}
				this.objIdNickMap.set(pkg.objId, {nick: pkg.nick, target: null});
				this.nickObjIdMap.set(pkg.nick, pkg.objId);
				break;
			}
			case "DeleteObject":{
				let old = this.objIdNickMap.get(pkg.objId);
				if(old){
					this.nickObjIdMap.delete(old.nick);
				}
				this.objIdNickMap.delete(pkg.objId);
				break;
			}
			case "TargetChanged":{
				let entry = this.objIdNickMap.get(pkg.objId);
				if(entry)
					entry.target = pkg.targetId;
				break;
			}
			case "TargetCleared":{
				let entry = this.objIdNickMap.get(pkg.objId);
				if(entry)
					entry.target = null;
				break;
			}
			case "SkillList":{
				this.knownSkills = new Set<number>(pkg.skills.map(_ => _.id));
				break;
			}
			case "UserInfo":{
				if(!this.userInfo){
					this.userInfo = {...pkg};
				} else {
					this.userInfo.objId = pkg.objId; // just in case
					this.updateUserInfo({stat: "hpmax", value: pkg.hpMax})
					this.updateUserInfo({stat: "mpmax", value: pkg.mpMax})
					this.updateUserInfo({stat: "mp", value: pkg.mp})
					this.updateUserInfo({stat: "hp", value: pkg.hp});
					this.updateUserInfo({stat: "exp", value: pkg.exp});
					this.updateUserInfo({stat: "lvl", value: pkg.lvl});
				}
				break;
			}
			case "StatusUpdate":{
				let u = this.userInfo as UserInfo;
				if(u && pkg.objId === u.objId){
					pkg.stats.forEach(stat => this.updateUserInfo(stat));
				}
				break;
			}
			case "TeleportToLocation":{
				let u = this.userInfo as UserInfo;
				if(u && pkg.objId === u.objId){
					u.x = pkg.x;
					u.y = pkg.y;
					u.z = pkg.z;
				}
				break;
			}
			case "MoveToLocation":{
				let u = this.userInfo as UserInfo;
				if(u && pkg.objId === u.objId){
					u.x = pkg.dest.x;
					u.y = pkg.dest.y;
					u.z = pkg.dest.z;
				}
				break;
			}
			case "ObjectMovement":{
				let u = this.userInfo as UserInfo;
				if(u && pkg.objId === u.objId){
					u.x = pkg.x;
					u.y = pkg.y;
					u.z = pkg.z;
				}
				break;
			}
			case "ResurrectAttempt":{
				this.sendPackage({type: "AcceptResurrection", id: pkg.id});
				break;
			}
			case "ItemList":{
				this.itemList = pkg;
				if(!this.equipList){
					this.equipList = this.itemList.items.filter(_ => _.equpped).map(_ => _.itemId);
				}
				this.shotIds = this.itemList.items.filter(_ => shotItemIds.has(_.itemId)).map(_ => _.objId);
				break;
			}
		}
	}

	private sendPackage(pkg: L2CliCliOutcomingPackage): Promise<boolean>{
		let stdout = (this.proc as cp.ChildProcess).stdin as Writable;
		return new Promise((ok, bad) => {
			try {
				stdout.write(JSON.stringify(pkg) + "\n", "utf8", () => ok(true));
			} catch(e){ bad(e) }
		})
	}

	private packageWaiters = {} as {[k: string]: (() => void)[]};
	private async waitForPackage(type: string){
		return new Promise(ok => {
			(this.packageWaiters[type] = (this.packageWaiters[type] || [])).push(ok);
		})
	}

	private async refreshInventory(){
		let waiter = this.waitForPackage("ItemList");
		await this.sendPackage({type: "RequestItemList"});
		await waiter;
	}

	private async refreshSkillList(){
		let waiter = this.waitForPackage("SkillList");
		await this.sendPackage({type: "RequestSkillList"});
		await waiter;
	}

	private objIdByNick(nick: string): number | null {
		let obj = this.nickObjIdMap.get(nick);
		if(!obj){
			log("Failed to interact with " + nick + ": unknown object.");
			return null;
		}
		return obj
	}

	private charDataByNick(nick: string): CharData | null {
		let objId = this.objIdByNick(nick);
		let charData = !objId? null: this.objIdNickMap.get(objId);
		if(!charData){
			log("Failed to interact with " + nick + ": no char data record.");
			return null;
		}
		return charData;
	}

	private async useShots(){
		if(this.shotIds){
			for(let id of this.shotIds)
				await this.sendPackage({type: "UseItem", objId: id})
		}
	}

	private mpDecreaseWaiters = [] as (() => void)[];
	private waitDecreaseMp(){
		return new Promise(ok => this.mpDecreaseWaiters.push(ok));
	}

	private updateUserInfo(update: StatUpdate){
		let u = this.userInfo;
		if(u){
			switch(update.stat){
				case "lvl": 	u.lvl = update.value;		break;
				case "exp":		u.exp = update.value;		break;
				case "hp": 		u.hp = update.value; 		break;
				case "hpmax":	u.hpMax = update.value; 	break;
				case "mpmax":	u.mpMax = update.value;		break;
				case "mp":
					let isDecrease = u.mp < update.value;
					u.mp = update.value;
					if(isDecrease && this.mpDecreaseWaiters.length > 0){
						let ws = this.mpDecreaseWaiters;
						this.mpDecreaseWaiters = [];
						ws.forEach(_ => _());
					}
					break;
			}
		}
	}

	async runAction(action: CharacterAction): Promise<boolean>{
		switch(action.type){
			// impossible by definition
			case "bringToFront":	log("You cannot bring CLI client to front."); 		return false;
			case "hotkeys":  	 	log("You cannot setup hotkeys in CLI client."); 	return false;
			case "hotkey": 			log("You cannot use hotkeys in CLI client.");		return false;
			case "rehook": 			log("You cannot setup hotkeys in CLI client.");		return false;

			// impossible yet, just because i'm lazy 
			case "acceptTrade":		log("Cannot accept trade yet.");							return false;			
			case "chat":			log("Console client tried to chat: " + action.content);		return false;
			case "confirmTrade":	log("Cannot confirm trade yet.");							return false;

			case "acceptParty": 	return await this.sendPackage({ type: "AnswerJoinParty", ok: true })
			case "cancelAction":	return await this.sendPackage({ type: "Cancel" });
			case "sitStand":		return await this.sendPackage({ type: "ActionUse", actionId: 0, shift: false, ctrl: false })
			case "stand":			return await this.sendPackage({ type: "ChangeWaitType", sit: false })
			case "leave":			return await this.sendPackage({ type: "LeaveParty" })
			case "unstuck": {
				setTimeout(() => {
					this.sendPackage({ type: "Appearing" })
				}, ((5 * 60) + 5) * 1000)
				return await this.sendPackage({ type: "UseSpecialSkill", skillId: 0x34 })
			}
			case "resurrectAtCity":{
				setTimeout(() => {
					this.sendPackage({ type: "Appearing" })
				}, 5 * 1000);
				return await this.sendPackage({ type: "RequestRestartPoint", pointType: 0 })
			}

			case "useSkill":{
				let knownSkills = skillIds[action.skillName].filter(_ => this.knownSkills.has(_));
				switch(knownSkills.length){
					case 0:
						log("This character knowns no skill \"" + action.skillName + "\"");
						return false;
					case 1:

						// damn spiritshots! and it's not even covering soulshots
						await this.useShots();
						await sleep(25);
						(async () => {
							await this.waitDecreaseMp();
							await this.useShots();
							await this.waitDecreaseMp();
							await this.useShots();
						})();
						let count = 4;
						let i = setInterval(() => {
							if(!(--count)){
								clearInterval(i);
							}
							this.useShots();
						}, 1000);

						return await this.sendPackage({ type: "MagicSkillUse", skillId: knownSkills[0], ctrl: false, shift: false });
					default:
						log("This character knowns more than one skill \"" + action.skillName + "\"");
						return false;
				}
			}

			case "target":{ 
				let objId = this.objIdByNick(action.target);
				return !objId? false: 
					await this.sendPackage({ type: "Action", objId: objId, x: 0, y: 0, z: 0, shift: false })
			}

			case "assist":{
				let charData = this.charDataByNick(action.target);
				if(!charData || !charData.target)
					return false;
				return await this.sendPackage({ type: "Action", objId: charData.target, x: 0, y: 0, z: 0, shift: false });
			}

			case "printStatus":{
				await this.refreshInventory();
				let u = this.userInfo as UserInfo;
				if(!u)
					log("Failed to print status: no userinfo recorded.");
				else
					log(whitepad(u.nick, 30)
						+ " lvl: " + whitepad(u.lvl, 2)
						+ " hp: " + whitepad(u.hp, 5) + " / " + whitepad(u.hpMax, 5)
						+ " mp: " + whitepad(u.mp, 5) + " / " + whitepad(u.mpMax, 5)
						+ " shots: " + (!this.itemList || !this.shotIds? []: this.shotIds.map(objId => {
							let item = (this.itemList as ItemList).items.find(_ => _.objId === objId);
							if(!item)
								return null;
							let itemName = getItemName(item.itemId);
							return whitepad(item.count, 5) + " x " + itemName
						}).filter(_ => !!_)).join(", ")
					);
				return true;
			}

			case "sendRawPackage": return await this.sendPackage(action.package);

			case "evaluate":{
				let objId = this.objIdByNick(action.target);
				return !objId? false: 
					await this.sendPackage({ type: "Evaluate", objId: objId })
			}

			case "assistEvaluate":{
				let charData = this.charDataByNick(action.target);
				if(!charData || !charData.target)
					return false;
				return await this.sendPackage({ type: "Evaluate", objId: charData.target })
			}

			default: 
				log("Unknown action type: \"" + (action as CharacterAction).type + "\"");
				return false;
		}
	}
	

}

function whitepad(value: any, n: number): string {
	let v = value + ""
	while(v.length < n){
		v += " ";
	}
	return v;
}