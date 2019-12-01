import {CliTool} from "./cli_tool";

export class Xdotool extends CliTool {

	protected readonly toolName = "xdotool";
	
	/*
	async getWindowGeometry(envVars: {readonly [k: string]: string}, wid: number): Promise<WindowGeometry>{
		let raw = await this.call(["getwindowgeometry", wid + ""], envVars);
		let pairs = raw.split("\n")
			.slice(1)
			.map(_ => _.trim());
		let positionRaw = pairs.find(_ => _.toLowerCase().startsWith("position")),
			sizeRaw = pairs.find(_ => _.toLowerCase().startsWith("geometry"));

		if(!positionRaw || !sizeRaw)
			throw new Error("Unexpected output from xdotool: " + raw);
		
		let mPos = positionRaw.match(/(\-?\d+)\D+(\-?\d+)/) as string[];
		let mSize = sizeRaw.match(/(\-?\d+)\D+(\-?\d+)/) as string[];

		return {
			position: { x: parseInt(mPos[1]), y: parseInt(mPos[2]) },
			size: { x: parseInt(mSize[1]), y: parseInt(mSize[2]) }
		}
	}
	*/

	async windowActivate(envVars: {readonly [k: string]: string}, wid: number): Promise<void>{
		await this.call(["windowactivate", wid + ""], envVars)
	}

	async mouseMove(envVars: {readonly [k: string]: string}, wid: number, x: number, y: number): Promise<void>{
		await this.call(["mousemove", "--sync", "--window", wid + "", x + "", y + ""], envVars);
	}

	async click(envVars: {readonly [k: string]: string}, wid: number = -1, button: number = 1): Promise<void>{
		await this.call(wid < 0
				? ["click", button + ""]
				:["click", "--window", wid + "", button + ""], envVars)
	}

	async key(envVars: {readonly [k: string]: string}, key: string, wid?: number): Promise<void>{
		await this.call(wid? ["key", "--window", wid + "", key]: ["key", key], envVars)
	}

}

export const xdotool = new Xdotool();