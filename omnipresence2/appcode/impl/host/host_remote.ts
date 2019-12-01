import {HostCommand, CharacterCommand, CommandBus} from "interfaces/command";
import {NetworkMasterNode} from "impl/network/node_master";
import {HostAction, ConfigSyncAction} from "interfaces/action";
import {Host} from "./host";
import {GameClientRemote} from "impl/client/client_remote";
import {DefBundle} from "impl/config";

export class RemoteHost extends Host<GameClientRemote> {
	private readonly masterNode: NetworkMasterNode;

	constructor(config: DefBundle, hostName: string, commandBus: CommandBus, node: NetworkMasterNode){
		super(config, hostName, commandBus);
		this.masterNode = node;
		this.masterNode.registerHost(this);
	}

	runAction(action: HostAction): Promise<boolean> {
		if(action.type === "setChars"){
			this.setChars(action);
		}
		return this.masterNode.send(this.name, { name: this.name, action } as HostCommand);
	}

	protected createClient(clientName: string, nickname: string) {
		let client = new GameClientRemote(this.config, nickname, clientName, action => {
			return this.masterNode.send(this.name, { nick: nickname, action } as CharacterCommand)
		})
		return client
	}

	async syncConfig() {
		await this.masterNode.send(this.name, { 
			name: this.name,
			action: { 
				type: "configSync", 
				config: this.config.dto
			} as ConfigSyncAction 
		} as HostCommand);
	}
}