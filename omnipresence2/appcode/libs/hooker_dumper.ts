import {CustomStdioLib} from "./custom_lib";
import {WinapiConstant} from "./winapi_constants";
import {log} from "impl/log";

const exePath = "./hooker_dumper/hooker_dumper.exe";

export interface KeyPress {
	up: boolean;
	vk: number;
	sc: number;
	char: string | null;
	/** string looking like ctrl+alt+shift+p */
	line: string | null;
	mods: {
		ctrl: number, 
		alt: number, 
		shift: number
	}
}

export class HookerDumper extends CustomStdioLib {
	protected readonly libName = "HookerDumper";

	private wineEnvVars: {readonly [k: string]: string} = {};
	private winId: number = -1;
	private handler: (e: KeyPress) => void = () => {};
	private restartOnShutdown = false;

	start(wineEnvVars: {readonly [k: string]: string}, winId: number, handler: (e: KeyPress) => void, restartOnShutdown?: boolean){
		this.wineEnvVars = wineEnvVars;
		this.winId = winId;
		this.handler = handler;
		this.restartOnShutdown = !!restartOnShutdown;
		log("Hooker dumper starting.");
		this.mustStop = false;
		this.launchExe(exePath, wineEnvVars, [winId + ""]);
	}

	private mustStop: boolean = false;
	stop(){
		this.mustStop = true;
		return super.stop();
	}

	protected onProcStarted(){
		this.proc.on("exit", () => {
			if(!this.mustStop && this.restartOnShutdown){
				this.start(this.wineEnvVars, this.winId, this.handler, this.restartOnShutdown);
			}
		});

		super.onProcStarted();
	}

	protected onLine(line: string){
		let data = JSON.parse(line) as KeyPress;
		let rev = WinapiConstant.vkReverse;
		let vks = WinapiConstant.vk;
		let mods = data.mods;
		data.char = data.vk in rev && rev[data.vk].length === 1? rev[data.vk]: null
		data.line = !(data.vk in rev)? null: 
			(mods.ctrl && data.vk !== vks.lctrl && data.vk !== vks.rctrl? 'ctrl+': '') +
			// alt частенько залипает. решено было не использовать его в хоткеях
			//(mods.alt && data.vk !== vks.lalt && data.vk !== vks.ralt? 'alt+': '') +
			(mods.shift && data.vk !== vks.lshift && data.vk !== vks.rshift? 'shift+': '') +
			rev[data.vk];
		this.handler(data);
	}

}