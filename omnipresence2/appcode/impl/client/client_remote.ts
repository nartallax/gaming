import {CharacterAction} from "interfaces/action";
import {GameClient} from "./client";
import {DefBundle} from "impl/config";

export class GameClientRemote extends GameClient {
	private readonly send: (action: CharacterAction) => Promise<boolean>;

	constructor(config: DefBundle, nickname: string, clientName: string, send: (action: CharacterAction) => Promise<boolean>){
		super(config, nickname, clientName);
		this.send = send;
	}

	runAction(action: CharacterAction): Promise<boolean>{
		return this.send(action);
	}
	

}