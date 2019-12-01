import {CommandBus as ICommandBus, Host, GameClient} from "../interfaces/command";
import {HostAction, CharacterAction} from "interfaces/action";

export class CommandBus implements ICommandBus {

	private readonly _hosts = new Map<string, Host>();
	private readonly clients = new Map<string, GameClient>();

	get hosts(): ReadonlyArray<Host>{
		return [...this._hosts.values()]
	}

	registerHost(host: Host): void {
		this._hosts.set(host.name, host);
		host.clients.forEach(client => this.clients.set(client.account.nickname, client));
	}

	runHostAction(hostName: string, action: HostAction): Promise<boolean> {
		let host = this._hosts.get(hostName);
		if(!host)
			throw new Error("Host not found: \"" + hostName + "\"");
		return host.runAction(action);
	}

	runCharacterAction(nick: string, action: CharacterAction): Promise<boolean> {
		let client = this.clients.get(nick);
		if(!client)
			throw new Error("Unknown client: \"" + nick + "\".");
		return client.runAction(action);
	}
}