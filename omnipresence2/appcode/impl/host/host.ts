import {HostDefinition} from "interfaces/config";
import {GameClient, Host as IHost, CommandBus} from "interfaces/command";
import {HostAction, SetCharsAction} from "interfaces/action";
import {DefBundle} from "impl/config";

export abstract class Host<C extends GameClient = GameClient> implements IHost {
	protected config: DefBundle;
	protected hostName: string;
	protected commandBus: CommandBus;
	get definition(): HostDefinition {
		let host = this.config.hosts.find(_ => _.name === this.hostName || _.hostname === this.hostName);
		if(!host)
			throw new Error("Unknown host: \"" + this.hostName + "\"");
		return host;
	}

	get name(): string {
		let def = this.definition;
		return def.name || def.hostname;
	}

	clients = [] as C[]

	constructor(config: DefBundle, hostName: string, commandBus: CommandBus){
		this.config = config;
		this.hostName = hostName;
		this.commandBus = commandBus;
	}

	spawnClient(client: string, nickname: string): void {
		this.clients.push(this.createClient(client, nickname));
	}

	protected setChars(action: SetCharsAction){
		action.chars.forEach(char => this.spawnClient(char.client, char.nick));
		this.commandBus.registerHost(this);
	}

	protected abstract createClient(client: string, nickname: string): C;
	abstract runAction(action: HostAction): Promise<boolean>;
}