import * as cp from "child_process";

export abstract class CliTool {

	protected abstract readonly toolName: string;
	protected call(args: string[], envVars?: {readonly [k: string]: string}): Promise<string>{
		return new Promise((ok, bad) => {
			cp.execFile(this.toolName, args, {env: envVars}, (err, stdout) => {
				err? bad(err): ok(stdout);
			})
		})
	}

}