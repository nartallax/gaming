import {GameClientLocal} from "./client_local";
import {CharacterAction} from "interfaces/action";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";
import {log} from "impl/log";
import {xdotool} from "libs/xdotool";;
import {HookerDumper, KeyPress} from "libs/hooker_dumper";
import {Keystreamer} from "libs/keystreamer";
import {Affinator} from "libs/affinator";
import {xprop} from "libs/xprop";
import {xwininfo, WindowWithTitle} from "libs/xwininfo";
import {fgwinid} from "libs/fgwinid";
import {HostDefinition, OriginalGameClientDefinition} from "interfaces/config";
import {Snitch, Rgb, Rect} from "libs/snitch";

function sleep(ms: number): Promise<void>{
	return new Promise(ok => setTimeout(ok, ms));
}

const procCountByCore = {} as {[k: string]: number};

export class GameClientLinux extends GameClientLocal {

	private pid: number = -1;
	private ownedProcCores: number[] | null = null;
	private wid: number = -1; // window id in X system
	private wwid: number = -1; // window id in winapi system
	private proc: cp.ChildProcess | null = null;
	private keylogger: HookerDumper | null = null;
	private keystreamer: Keystreamer | null = null;
	private snitch: Snitch | null = null;

	get isLoggedIn(): boolean{
		return this.pid > 0
	}

	private async searchWindows(pid: number, titlePattern: RegExp): Promise<WindowWithTitle[]>{
		let wins = await xwininfo.windowsByTitle(this.envVars, titlePattern);
		let winsAndPids = await Promise.all(wins.map(async win => ({ win, pid: await xprop.pidOfWin(this.envVars, win.wid) })))
		let interestingWins = winsAndPids.filter(_ => _.pid === pid);
		return interestingWins.map(_ => _.win);
	}

	private get host(): HostDefinition {
		let host = this.config.hosts.find(_ => (_.name || _.hostname) === this.client.host);
		if(!host)
			throw new Error("Fail: no host found for client definition. Try explicitly add or remove some host names.")
		return host;
	}


	private get envVars(): {readonly [k: string]: string} {
		return this.host.envVars || {};
	}

	private get wineEnvVars(): {readonly [k: string]: string} {
		return { ...this.envVars, ...(this.host.wineEnvVars || {}) };
	}

	private get originalClient(): OriginalGameClientDefinition {
		let cl = this.client as OriginalGameClientDefinition;
		if(!cl.path)
			throw new Error("Wrong client selected for client definition: " + JSON.stringify(cl));
		return cl;
	}

	protected async doLogin(){
		await this.close(); // just in case, for cleanup

		let cl = this.originalClient;

		let optionBackupPath = path.join(path.dirname(cl.path), "Option.ini.backup");
		if(fs.existsSync(optionBackupPath))
			fs.copyFileSync(optionBackupPath, path.join(path.dirname(cl.path), "Option.ini"));

		let proc = this.proc = cp.spawn(
			cl.runner || "wine", 
			cl.runner? [...(cl.cliArgs || []), "wine", cl.path]: [...(cl.cliArgs || []), cl.path],  
			{
				env: {
					...(cl.env || {}),
					...this.wineEnvVars
				}
			}
		);

		proc.on("exit", code => {
			log("Process exited with code " + code);
			this.proc = null;
			this.close();
		})

		this.pid = proc.pid;
		//log("Started proc: " + this.pid);

		(cl.afterStart || []).forEach(_ => {
			cp.execFile(_.command, (_.args || []).map(x => x === "$PID"? this.pid + "": x), err => {
				if(err)
					console.error(err);
			})
		});

		this.wid = await this.waitClientWindowToOpen();

		await sleep(500);
		await this.updateWinId();
		await Promise.all([
			await this.setupKeystreamer(),
			await this.setupSnitch(),
			await this.setProcAffinity()
		]);
		await this.runLoginProcess();

		if(this.hotkeys){
			await this.setupHotkeys(this.hotkeys);
		}
		return;
	}

	private async updateWinId(){
		this.wwid = await fgwinid.run(this.wineEnvVars);
		//log("WinApi window id = " + this.wwid);
	}

	private waitClientWindowToOpen(): Promise<number>{
		return new Promise((ok, bad) => {
			let countRemaining = 60;
			let interval = setInterval(async () => {
				try {
					countRemaining--;
					if(countRemaining < 0){
						throw new Error("Window failed to open in time.");
					}

					//log("Searching windows...");
					let wins = await this.searchWindows(this.pid, /^Warning|Lineage II/);
					//log("Found windows for PID: " + wins.map(_ => _.title).join(", "));

					let warning = wins.find(_ => _.title === "Warning")
					if(warning){
						//log("Detected warning window.");
						/*
						await sleep(250);
						let winId = await fgwinid.run(this.wineEnvVars);
						log("winID: " + winId)
						let ks = new Keystreamer();
						ks.start(this.wineEnvVars, winId);
						await sleep(250);
						await ks.sendKeyString("{enter down}");
						await sleep(250);
						await ks.sendKeyString("{enter up}");
						await sleep(250);
						await ks.stop();
						*/
						xdotool.key(this.envVars, "Return");
					}

					let client = wins.find(_ => _.title === "Lineage II");
					if(client){
						//log("Found target window, done waiting.");
						clearInterval(interval);
						ok(client.wid);
						return;
					}
				} catch(e){
					log("Failure during waiting of game window to open: " + e);
					clearInterval(interval);
					bad(e);
				}
			}, 1000);
		})
	}

	/*
	private async pixelUnderCursor(){
		let res = grabc(this.envVars);
		await sleep(100);
		await xdotool.click(this.envVars)
		let pixel = await res;
		return pixel;
	}*/
	private pixelAt(x: number, y: number){
		return (this.snitch as Snitch).colorAt(x, y);
	}

	private async waitForCondition(condition: () => Promise<boolean>, count: number = 50, interval: number = 500): Promise<void>{
		while(count-->0){
			if(await condition())
				return;
			await sleep(interval);
		}
		throw new Error("Too much waiting.");
	}

	private waitPixelColorOutOfBounds(x: number, y: number, lower: Rgb, upper: Rgb): Promise<void>{
		return this.waitForCondition(async () => {
			let c = await this.pixelAt(x, y);
			return c.r < lower.r || c.g < lower.g || c.b < lower.b || c.r > upper.r || c.g > upper.g || c.b > upper.b
		})
	}

	private waitPixelColorNotEqual(x: number, y: number, now: Rgb): Promise<void>{
		return this.waitForCondition(async () => {
			let c = await this.pixelAt(x, y);
			return c.r !== now.r || c.g !== now.g || c.b !== now.b
		})
	}

	private waitPixelColorInBounds(x: number, y: number, lower: Rgb, upper: Rgb): Promise<void>{
		return this.waitForCondition(async () => {
			let c = await this.pixelAt(x, y);
			return (c.r >= lower.r && c.r <= upper.r) && (c.g >= lower.g && c.g <= upper.g) && (c.b >= lower.b && c.b <= upper.b);
		})
	}

	private formAffinityMask(cores: number[]): number{
		let mask = 0, map = {} as {[k: string]: boolean}, max = 0;
		
		cores.forEach(i => {
			(i > max) && (max = i);
			map[i] = true;
		})
		
		for(var i = max; i >= 0; i--){
			mask *= 2;
			map[i] && (mask += 1);
		}

		return mask;
	}

	private async setProcAffinity(){
		if(this.originalClient.affinity && this.originalClient.affinity.length > 0){
			let availCores = this.originalClient.affinity;
			let ownedCoresCount = this.originalClient.acquiredCores || 1;
			let ownedCores = [...availCores].sort((a, b) => (procCountByCore[a] || 0) - (procCountByCore[b] || 0)).slice(0, ownedCoresCount);
			let mask = this.formAffinityMask(ownedCores);
			ownedCores.forEach(_ => procCountByCore[_] = (procCountByCore[_] || 0) + 1);
			this.ownedProcCores = ownedCores;
			log("Setting affinity mask: " + mask + " (core: " + ownedCores.join(", ") + ")");
			new Affinator().runFor(this.wineEnvVars, mask);
			await sleep(1000);
		}		
	}

	private async setupKeylogger(onKey: (press: KeyPress) => void){
		if(!this.keylogger){
			this.keylogger = new HookerDumper();
			this.keylogger.start(this.wineEnvVars, this.wwid, onKey, true);
			await sleep(1000);
		}
	}

	private async setupKeystreamer(){
		if(!this.keystreamer){
			this.keystreamer = new Keystreamer();
			this.keystreamer.start(this.wineEnvVars, this.wwid);
			await sleep(1000);
		}
	}

	private async setupSnitch(){
		if(!this.snitch){
			this.snitch = new Snitch();
			this.snitch.start(this.wineEnvVars, this.wwid);
			await sleep(1000);
		}
	}

	private sendKeys(keyString: string){
		if(this.keystreamer){
			this.keystreamer.sendKeyString(keyString);
		}
	}

	private async runLoginProcess(){
		log("Found game window: " + this.wid);
		let winSize = await this.windowGeometry;

		// двигаем мышу над окошко "системная ошибка" и ждем, пока оно появится вместо темноты, кликаем
		let x = (winSize.w / 2) - 10;
		let y = (winSize.h / 2) + 20
		await this.waitPixelColorOutOfBounds(x, y, {r: 0, g: 0, b: 0}, {r: 5, g: 5, b: 5});
		await this.bringToFront();
		await sleep(250);
		await this.mouseMove(x, y);
		await sleep(250);
		await this.click();
		await sleep(2250);

		// запоминаем цвет характерной кнопки
		x = (winSize.w / 2) + 30;
		y = (winSize.h / 2) - 10
		let color = await this.pixelAt(x, y);

		// фокусим поле логина, вводим
		await this.mouseMove(winSize.w / 2, (winSize.h / 2) - 60);
		await sleep(100);
		await this.click();
		await sleep(100);
		this.sendKeys(this.account.login);

		// фокусим поле пароля, вводим
		await this.mouseMove(winSize.w / 2, (winSize.h / 2) - 40);
		await sleep(100);
		await this.click();
		await sleep(100);
		this.sendKeys(this.account.password + "{enter}");

		// ждем следующего экрана
		await this.waitPixelColorNotEqual(x, y, color);
		
		// запоминаем цвет кнопки, ждем следующего экрана
		x = (winSize.w / 2)
		y = (winSize.h / 2)
		color = await this.pixelAt(x, y);
		this.sendKeys("{enter}")
		await this.waitPixelColorNotEqual(x, y, color);

		// жмем "войти" и ждем появления плашки персонажа в углу
		this.sendKeys("{enter}")
		await this.waitPixelColorInBounds(5, 10, { r: 11, g: 20, b: 47 }, { r: 21, g: 30, b: 57 });
		await sleep(1000);

		if(this.originalClient.simpleGraph){
			this.sendKeys("{home}")
		}
	}
	
	async close(){
		if(this.proc){
			this.proc.kill();
			await this.waitForCondition(async () => !this.proc)
		}
		if(this.keylogger){
			this.keylogger.stop();
			this.keylogger = null;
		}
		if(this.keystreamer){
			this.keystreamer.stop();
			this.keystreamer = null;
		}
		if(this.snitch){
			this.snitch.stop();
			this.snitch = null;
		}
		if(this.ownedProcCores){
			this.ownedProcCores.forEach(_ => procCountByCore[_] -= 1);
		}
		this.pid = -1;
		this.wid = -1;
		this.wwid = -1;
		return;
	}

	private hotkeys: {readonly [k: string]: () => void} | null = null;
	private async setupHotkeys(hotkeys: {readonly [k: string]: () => void}){
		this.hotkeys = hotkeys;
		await this.setupKeylogger(e => {
			if(!e.up && e.line && e.line in hotkeys){
				hotkeys[e.line]();
			}
		});
	}

	private async click(){
		await xdotool.click(this.envVars, this.wid)
	}

	private async mouseMove(x: number, y: number){
		await xdotool.mouseMove(this.envVars, this.wid, x, y);
	}

	private async bringToFront(){
		await xdotool.windowActivate(this.envVars, this.wid);
		//(this.keystreamer as Keystreamer).bringToFront();
	}

	private get windowGeometry(): Promise<Rect>{
		return (this.snitch as Snitch).winRect();
	}

	async runAction(action: CharacterAction): Promise<boolean>{
		switch(action.type){
			case "hotkeys":
				await this.setupHotkeys(action.hotkeys)
				return true;
			case "hotkey":
				this.sendKeys("{f" + action.slot + "}");
				/*
				let vk: number;
				switch(action.slot){
					case 10: vk = 48; break;
					case 11: vk = 189; break;
					case 12: vk = 187; break;
					default: vk = 48 + action.slot; break;
				}
				
				//log("Sending: " + vk);
				(this.keystreamer as Keystreamer).sendKey(vk, true);
				(this.keystreamer as Keystreamer).sendKey(vk, false);
				*/
				return true;
			case "chat":
				this.sendKeys("{enter}" + action.content + "{enter}")
				return true;
			case "acceptParty":
			case "acceptTrade":
				await this.bringToFront();
				let winSize = await this.windowGeometry;
				await sleep(1000);
				await this.mouseMove(580, winSize.h - 80);
				await sleep(250);
				await this.click();
				await sleep(250);
				await this.mouseMove(450, winSize.h - 40);
				await sleep(250);
				await this.click();
				await sleep(250);
				return true;
			case "bringToFront":
				await this.bringToFront();
				return true;
			case "cancelAction":
				await this.sendKeys("{escape}");
				return true;
			case "rehook":
				if(this.hotkeys && this.keylogger){
					this.keylogger.stop();
					this.keylogger = null;
					await sleep(3000);
					await this.updateWinId();
					this.setupHotkeys(this.hotkeys);
				}
				return true;
			case "confirmTrade": {
				await this.bringToFront();
				let winSize = await this.windowGeometry;
				await sleep(1000);
				await this.mouseMove(winSize.w - 200, 380);
				await sleep(250);
				await this.click();
				await sleep(250);
				return true
			}
			case "target": 		return await this.runAction({ type: "chat", content: "/target " + action.target })
			case "useSkill":	return await this.runAction({ type: "chat", content: "/useskill " + action.skillName })
			case "sitStand": 	return await this.runAction({ type: "chat", content: "/sitstand" })
			case "stand": 		return await this.runAction({ type: "chat", content: "/stand" })
			case "leave":		return await this.runAction({ type: "chat", content: "/leave" })
			case "unstuck":		return await this.runAction({ type: "chat", content: "/unstuck" })
			case "assist":{
				await this.runAction({ type: "target", target: action.target });
				await sleep(250);
				return await this.runAction({ type: "chat", content: "/assist" });
			}
			case "printStatus":
				log("Non-CLI clients are not able to print status.");
				return false;
			case "sendRawPackage":
				log("Non-CLI clients are not able to send raw packages.");
				return false;
			case "resurrectAtCity":
				log("Non-CLI clients are not able to resurrect at city.");
				return false;
			case "evaluate":
				await this.runAction({ type: "target", target: action.target })
				await sleep(500);
				await this.runAction({ type: "chat", content: "/evaluate" })
				return true;
			case "assistEvaluate":
				await this.runAction({ type: "assist", target: action.target })
				await sleep(500);
				await this.runAction({ type: "chat", content: "/evaluate" })
				return true;
			default: 
				console.error("Unknown action type: \"" + (action as CharacterAction).type + "\"");
				return false;
		}
	}

	

}