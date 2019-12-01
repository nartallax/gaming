import {CustomLib} from "./custom_lib";

const affinatorPath = "./affinator/affinator.exe";

export class Affinator extends CustomLib {
	protected readonly libName = "Affinator";

	runFor(wineEnvVars: {readonly [k: string]: string}, mask: number){
		this.launchExe(affinatorPath, wineEnvVars, [mask + ""]);
	}
}