import {CustomLib} from "./custom_lib";

const exePath = "./fgwinid/fgwinid.exe";

export class Fgwinid extends CustomLib {

	protected readonly libName = "FgWinID";

	async run(wineEnvVars: { readonly [k: string]: string }): Promise<number>{
		let stdout = await this.launchExe(exePath, wineEnvVars, []);
		let stdoutStr = typeof(stdout) === "string"? stdout: stdout.toString("utf8");
		return parseInt(stdoutStr);
	}

}

export const fgwinid = new Fgwinid();