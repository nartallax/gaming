import {HostDefinition, DefinitionBundle} from "interfaces/config";
import * as os from "os";
import {Command} from "interfaces/command";

function hostDef(config: DefinitionBundle, name: string){
	let hostDef = config.hosts.find(_ => _.hostname === name);
	if(!hostDef)
		throw new Error("Host definition not found for current hostname: " + name);
	return hostDef;
}

/** Общий класс сетевой ноды. Конкретные классы определяют поведение и возможности (мастер/слейв) */
export abstract class NetworkNode {
	protected readonly config: DefinitionBundle;
	protected get port(): number { return this.config.constants.netPort } 
	protected readonly host: HostDefinition;

	constructor(config: DefinitionBundle){
		this.config = config;
		this.host = hostDef(config, os.hostname());
	}

	abstract start(): Promise<void>;

	static isMaster(config: DefinitionBundle): boolean {
		let host = hostDef(config, os.hostname());
		return !!host.isMaster;
	}
}

/** Сообщение от мастера к слейву */
export interface CommandMessage {
	command: Command;
	id: number;
}

/** Сообщение от слейва к мастеру */
export interface ConfirmationMessage {
	id: number;
	success: boolean;
}