import {Scenario} from "interfaces/scenario";
import {ScenarioUtils} from "impl/scenario_utils";
import {log} from "impl/log";
import {Character} from "impl/character";
import {sleep} from "impl/sleep";
import {SkillName} from "impl/client/cli/skill_ids";

type PartyType = "spoil" | "test" | "rbkillers" | "rbkillers_a" | "rbkillers_b"

export class ScenarioImpl implements Scenario {

	constructor(args: string[]){
		this.scenarioType = args[0] as PartyType;
		let chars = this.characters;
		if(!chars)
			throw new Error("Unknown scenario type: " + this.scenarioType);
	}

	private readonly scenarioType: PartyType;// = "rbkillers";

	get characters(){
		return this.charactersFor(this.scenarioType)
	}

	charactersFor(type: PartyType): {nick: string, client: string}[]{
		switch(type){
			case "test": return [
				{nick: "CarePure", client: "secondary"},
				{nick: "Murchalquah", client: "secondary"},
				{nick: "Leidenfrost", client: "secondary"},
				//{nick: "SomeRandomTrash4", client: "secondary"},
				//{nick: "SomeRandomTrash5", client: "cli"}
			]
			case "rbkillers": return [
				{nick: "Nart", client: "main"},
				{nick: "CarePure", client: "secondary"},
				{nick: "Murchalquah", client: "secondary"},
				{nick: "Leidenfrost", client: "secondary"},

				{nick: "GrosseSchlange", 	client: "cli"},
				{nick: "BOBAHYC", 			client: "cli"},
				{nick: "Barseque", 			client: "cli"},
				{nick: "KucaKyky", 			client: "cli"},
				{nick: "4ebypatop",			client: "cli"},
				{nick: "Bepis", 			client: "cli"},

				{nick: "Wzhuhh", 			client: "cli"},
				{nick: "JrchiquePyani",		client: "cli"},
				{nick: "WedgeAmin",			client: "cli"},
				{nick: "Basovichok",		client: "cli"},
				{nick: "Gartangian",		client: "cli"},
				{nick: "i18nl10n", 			client: "cli"}
			]
			case "rbkillers_a": return this.charactersFor("rbkillers")
				.filter(x => x.nick === "Nart" || (!this.secondPartyChars.has(x.nick) && !this.rbBuffers.has(x.nick)))
				.map(x => ({...x, client: x.client === "main"? "main": "secondary"}))
			case "rbkillers_b": return this.charactersFor("rbkillers")
				.filter(x => x.nick === "Nart" || (this.secondPartyChars.has(x.nick) && !this.rbBuffers.has(x.nick)))
				.map(x => ({...x, client: x.client === "main"? "main": "secondary"}))				
			case "spoil": return [
				{nick: "BloodyCherry", client: "main"},
				{nick: "Corundr", client: "mundane"},
				{nick: "FullNatural", client: "secondary"},
				{nick: "TeaserPleaser", client: "secondary"},
				{nick: "MilaJovovich", client: "secondary"}
			]
		}
	}
	
	private secondPartyChars = new Set(["Leidenfrost", "CarePure", "Wzhuhh", "JrchiquePyani", "WedgeAmin", "Basovichok", "Gartangian", "i18nl10n"])
	private rbBuffers = new Set(["Leidenfrost", "CarePure", "Murchalquah"])

	async action(u: ScenarioUtils){
		log("Started with scenario.")

		u.delayAfterCommand = 200;

		let isSupport = (_: Character) => _.def.profession === "se" || _.def.profession === "pp" || _.def.profession === "ee";

		let mainChar = u.characters[0];
		let nukers = u.characters.filter(_ => _.def.profession === "sh");
		let supports = u.characters.filter(isSupport);
		let rechargers = supports.filter(_ => _.def.profession === "se" || _.def.profession === "ee");
		let drones = u.characters.slice(1);
		let nonSupportDrones = drones.filter(_ => !isSupport(_))
		let pp = u.characters.filter(_ => _.def.profession === "pp");

		let firstParty = this.scenarioType !== "rbkillers"? u.characters: u.characters.filter(_ => !this.secondPartyChars.has(_.nick));
		let secondParty = this.scenarioType !== "rbkillers"? []: u.characters.filter(_ => this.secondPartyChars.has(_.nick));

		let supportRR = u.roundRobin(supports);
		let rechargeRR = u.roundRobin(rechargers);
		let nukerPackRR = u.roundRobin((() => {
			let firstPartyNukers = firstParty.filter(_ => _.def.profession === "sh");
			let secondPartyNukers = secondParty.filter(_ => _.def.profession === "sh");
			return firstPartyNukers.length === 0 || secondPartyNukers.length === 0
				? [[...firstPartyNukers, ...secondPartyNukers]]
				: [firstPartyNukers, secondPartyNukers];
		})());

		let buff = async (char: Character, key: number) => {
			await u.seq(supports, _ => _.target(char), _ => _.useHotkey(key));
		}

		let buffAll = async () => {
			let buffOrder = drones.sort((a, b) => a.def.profession === "pp"? -1: b.def.profession === "pp"? 1: 0);
			for(let char of buffOrder){
				await buff(char, 7)
				await sleep(6000);
			}
			await buff(mainChar, 8)
		}

		let party = async () => {
			if(firstParty.length < 1 || secondParty.length < 1){
				let p = firstParty.length < 1? secondParty: firstParty;
				await p[0].partyWithMany(p.slice(1));
				return;
			}

			let firstPartyLeader = firstParty[0];
			let firstPartyLocals = firstParty.filter(_ => _.host.hostname === u.localHostname && _ !== firstPartyLeader);
			let firstPartyNonLocals = firstParty.filter(_ => _.host.hostname !== u.localHostname)
			await firstPartyLeader.partyWithMany(firstPartyLocals);
			await Promise.all([
				firstPartyLeader.partyWithMany(firstPartyNonLocals),
				secondParty[0].partyWithMany(secondParty.slice(1))
			]);
		}

		u.cli({
			"relog": () => u.relog(),
			"rehook": () => mainChar.rehook(),
			"unstuck": () => u.characters.forEach(_ => _.unstuck()),
			"party": async () => {
				await Promise.all(u.characters.map(_ => _.leave()));
				await sleep(250);
				party();
			},
			//"assist": () => drones.forEach(_ => _.assist()),
			"attack": () => drones.forEach(_ => _.attack()),
			"asstack": () => u.seq(drones, _ => _.assist(mainChar), _ => _.attack()),
			"eval": () => drones.forEach(_ => _.evaluate(mainChar)),
			"asseval": () => u.seq(drones, _ => _.assistEvaluate(mainChar)),
			"buff": () => buffAll(),
			"assbuffmage": () => u.seq(supports, _ => _.assist(mainChar), _ => _.useHotkey(7)),
			"assbuffwarr": () => u.seq(supports, _ => _.assist(mainChar), _ => _.useHotkey(8)),
			"tradenukers": async () => {
				for(let nuker of nukers){
					log("Trading with " + nuker.nick);
					await mainChar.tradeWith(nuker);
					await sleep(250);
					await mainChar.bringToFront();
					await sleep(10000);
					await nuker.confirmTrade();
				}
				await sleep(250);
				await mainChar.bringToFront();
			},
			"status": () => nukers.forEach(_ => _.printStatus()),
			"sendRawPackage": pkg => nukers.forEach(_ => _.sendRawPackage(JSON.parse(pkg.join(" ")))),
			"resAtCity": () => nukers.forEach(_ => _.resurrectAtCity())
		})

		let pickupModeInterval: any = null;
		let togglePickupMode = () => {
			if(pickupModeInterval){
				log("Pickup mode disabled.");
				clearInterval(pickupModeInterval);
				pickupModeInterval = null;
			} else {
				let chars = u.characters.filter(_ => _.def.profession === "cr");
				let vantageChar = u.characters.filter(_ => _.def.profession === "pp")[0];
				log("Pickup mode enabled; pickupping characters: " + chars.map(_ => _.nick).join(", "));
				pickupModeInterval = setInterval(() => {

					chars.forEach(async _ => {
						vantageChar && (await _.target(vantageChar));
						await _.pickup()
					});
				}, 500);
			}
		}

		let attackSkill: SkillName = "Twister";
		let contAttackInterval: any = null;
		let toggleContAttackInterval = async () => {
			if(contAttackInterval){
				log("Disable continuous attack.");
				clearInterval(contAttackInterval);
				contAttackInterval = null;
			} else {
				log("Enable continuous attack.");
				contAttackInterval = -1;
				await u.seq(nukers, _ => _.assist(mainChar));
				await sleep(u.delayAfterCommand);
				contAttackInterval = setInterval(() => {
					nukers.forEach(_ => {
						_.useSkill(attackSkill);
					})
				}, 750);
			}
		}

		await mainChar.bringToFront();
		await mainChar.setupHotkeys({
			"f1": () => u.seq(nukerPackRR.next(1)[0], _ => _.assist(mainChar), _ => _.useSkill(attackSkill)), // attack
			"shift+f1": () => toggleContAttackInterval(), 										// continious attack
			"f2": () => drones.forEach(_ => _.target(mainChar)), 								// follow
			"shift+f2": () => u.seq(supportRR, _ => _.assist(mainChar), _ => _.useHotkey(9)), 	// slow
			"f3": () => u.seq(supportRR, _ => _.target(mainChar), _ => _.useHotkey(1)),			// heal
			"shift+f3": () => u.seq(supportRR, _ => _.assist(mainChar), _ => _.useHotkey(1)),	// assist heal
			"f4": () => u.seq(rechargeRR, _ => _.target(mainChar), _ => _.useHotkey(2)),		// recharge
			"shift+f4": () => u.seq(rechargeRR, _ => _.assist(mainChar), _ => _.useHotkey(2)),	// assist recharge
			"shift+f5": () => nukers.forEach(_ => _.useHotkey(10)), 							// body-to-mind
			"shift+f6": () => pp.forEach(_ => _.useHotkey(10)), 								// berserker spirit assist
			
			"f10": () => buffAll(),																// buff
			"shift+f10": () => togglePickupMode(),												// pickup
			"f11": () => nonSupportDrones.forEach(_ => _.sitStand()),							// sitstand nonsupport
			"shift+f11": () => nonSupportDrones.forEach(_ => _.stand()),						// stand nonsupport
			"f12": () => supports.forEach(_ => _.sitStand()),									// sitstand support
			"shift+f12": () => supports.forEach(_ => _.stand()),								// stand support
			"shift+escape": () => drones.forEach(_ => _.cancelAction()),						// cancel all
		});

		await party();
		await mainChar.bringToFront();
		log("Everything is up and running.");
	}

}