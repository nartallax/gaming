import {DefinitionBundle, HostDefinition, AccountDefinition, GameClientDefinition, ConstantsDefinition} from "interfaces/config";
import {hostsConfig} from "hosts";
import {accountsConfig} from "accounts";
import {clientsConfig} from "clients";
import {constantsConfig} from "consts";
import * as os from "os";

export class DefBundle implements DefinitionBundle {
	readonly hosts: ReadonlyArray<HostDefinition>;
	readonly clients: ReadonlyArray<GameClientDefinition>;
	readonly accounts: ReadonlyArray<AccountDefinition>;
	readonly constants: ConstantsDefinition;

	constructor(
		hosts: ReadonlyArray<HostDefinition>, 
		accounts: ReadonlyArray<AccountDefinition>,
		clients: ReadonlyArray<GameClientDefinition>,
		constants: ConstantsDefinition
		){
			this.hosts = hosts;
			this.accounts = accounts;
			this.clients = clients;
			this.constants = constants;
		}
	
	get dto(): DefinitionBundle {
		return {
			hosts: this.hosts,
			accounts: this.accounts,
			clients: this.clients,
			constants: this.constants
		}
	}

	host(name: string): HostDefinition {
		let def = this.hosts.find(_ => _.name === name || _.hostname === name);
		if(!def)
			throw new Error("Host definition not found for name: " + name);
		return def;
	}

	account(nick: string): AccountDefinition {
		let def = this.accounts.find(_ => _.nickname === nick);
		if(!def)
			throw new Error("Account definition not found for nick: " + nick);
		return def;
	}

	client(name: string): GameClientDefinition {
		let def = this.clients.find(_ => _.name === name);
		if(!def)
			throw new Error("Client definition not found for name: " + name);
		return def;
	}

	get localHostname(): string { return os.hostname() }
	
	get localHostDef(): HostDefinition {
		return this.host(this.localHostname);
	}

}

export const config = new DefBundle(hostsConfig, accountsConfig, clientsConfig, constantsConfig);