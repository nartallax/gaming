import {HostAction} from "interfaces/action";
import {Host} from "./host";
import * as os from "os";
import {log} from "impl/log";
import {DefBundle} from "impl/config";
import {GameClientLocal} from "impl/client/client_local";
import {GameClientLinux} from "impl/client/client_linux";
import {Activator} from "libs/activator";
import {CustomGameClientDefinition} from "interfaces/config";
import {GameClientCLI} from "impl/client/cli/client_cli";

export class LocalHost extends Host<GameClientLocal> {

	private activator: Activator | null = null;

	private async tryStartActivator(){
		if(!this.activator){
			this.activator = await new Activator(); 
			this.activator.start(this.definition.wineEnvVars || {})
		}
	}

	async runAction(action: HostAction): Promise<boolean> {
		try {
			switch(action.type){
				case "launch":
					try {
						let notLoggedClients = this.clients.filter(_ => !_.isLoggedIn);
						for(let client of notLoggedClients){
							log("Logging in " + client.account.nickname);
							await client.login();
						}
						// мы стартуем активатор только после того, как все клиенты залогинены
						// это ускоряет процесс загрузки
						await this.tryStartActivator();
						log("Done logging in for host " + this.name)
						return true;
					} catch(e){
						log("Failed logging in for host " + this.name + ": " + e)
						return false;
					}
				case "configSync":
					this.config = new DefBundle(action.config.hosts, action.config.accounts, action.config.clients, this.config.constants);
					return true;

				case "setChars":
					for(let client of this.clients)
						await client.close();
					this.setChars(action);
					return true;

				case "shutdownClients":
					for(let client of this.clients)
						await client.close();
					return true;


				default: 
					console.error("Unknown action: " + JSON.stringify(action));
					return false;
			}
		} catch(e){
			log(e.stack);
			return false;
		}
	}

	protected createClient(clientName: string, nickname: string) {
		switch(os.platform()){
			case "linux":
				if((this.config.client(clientName) as CustomGameClientDefinition).token){
					return new GameClientCLI(this.config, nickname, clientName);
				} else {
					return new GameClientLinux(this.config, nickname, clientName);
				}
				
			/*
			case "win32":
				return new GameClientWindows(this.config, nickname, clientName);
			*/
			default:
				throw new Error("Platform not supported: \"" + os.platform() + "\".");
		}
	}
}