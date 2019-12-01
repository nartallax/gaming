import {CustomLib} from "./custom_lib";

const activatorPath = "./activator/activator.exe";

export class Activator extends CustomLib {
	protected readonly libName = "Activator";

	start(wineEnvVars: {readonly [k: string]: string}){
		this.launchExe(activatorPath, wineEnvVars);
	}
}