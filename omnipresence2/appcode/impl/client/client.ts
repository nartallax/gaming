import {GameClient as IGameClient} from "interfaces/command";
import {AccountDefinition, GameClientDefinition} from "interfaces/config";
import {CharacterAction} from "interfaces/action";
import {DefBundle} from "impl/config";

export abstract class GameClient implements IGameClient {
	protected readonly config: DefBundle;
	private readonly nickname: string;
	private readonly clientName: string;

	get account(): AccountDefinition {
		return this.config.account(this.nickname)
	}

	get client(): GameClientDefinition {
		return this.config.client(this.clientName)
	}
	
	constructor(config: DefBundle, nickname: string, clientName: string){
		this.config = config;
		this.nickname = nickname;
		this.clientName = clientName;
	}

	abstract runAction(action: CharacterAction): Promise<boolean>;
}