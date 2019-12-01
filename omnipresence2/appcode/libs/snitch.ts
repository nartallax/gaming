import {CustomQALib} from "./custom_lib";

export interface SizePair {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Rgb {
	r: number;
	g: number;
	b: number;
}

const exePath = "./snitch/snitch.exe";

export class Snitch extends CustomQALib {
	protected readonly libName = "Snitch";

	start(wineEnvVars: {readonly [k: string]: string}, winId: number){
		this.launchExe(exePath, wineEnvVars, [winId + ""]);
	}

	private zeroPad(num: number): string {
		let res = num + "";
		while(res.length < 6)
			res = "0" + res;
		return res;
	}

	async colorAt(x: number, y: number): Promise<Rgb>{
		return JSON.parse(await this.question("p" + this.zeroPad(x) + this.zeroPad(y)));;
	}

	async winRect(): Promise<Rect>{
		let result = JSON.parse(await this.question("s"));
		return result;
	}

}