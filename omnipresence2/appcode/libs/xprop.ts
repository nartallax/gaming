import {CliTool} from "./cli_tool";

export class Xprop extends CliTool {

	protected readonly toolName = "xprop"

	async pidOfWin(envVars: {readonly [k: string]: string}, wid: number): Promise<number | null>{
		let raw = await this.call(["-id", wid + ""], envVars);
		let line = raw.split("\n").filter(_ => _.startsWith("_NET_WM_PID"))[0]
		return !line? null: parseInt((line.match(/(\d+)/) as string[])[1]);
	}

}

export const xprop = new Xprop();