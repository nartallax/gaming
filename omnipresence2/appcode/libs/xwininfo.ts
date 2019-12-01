import {CliTool} from "./cli_tool";

export interface WindowWithTitle {
	wid: number;
	title: string;
}

export class Xwininfo extends CliTool {

	protected readonly toolName = "xwininfo"

	async windowsByTitle(envVars: {readonly [k: string]: string}, pattern: RegExp): Promise<WindowWithTitle[]> {
		let raw = await this.call(["-tree", "-root"], envVars);
		let result = [] as WindowWithTitle[];
		raw.split('\n').forEach(line => {
			line = line.trim();
			let parts = line.match(/^(0x[\dabcdefABCDEF]+)\s+(\"[^"]+\")/)
			if(!parts)
				return;
			let title = parts[2].substr(1, parts[2].length - 2);
			if(title.match(pattern))
				result.push({
					title: title,
					wid: parseInt(parts[1], 16)
				});
		})
		return result;
	}

}

export const xwininfo = new Xwininfo();