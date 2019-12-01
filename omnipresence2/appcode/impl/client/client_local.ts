import {GameClient} from "./client";
import {log} from "impl/log";

export abstract class GameClientLocal extends GameClient {

	protected abstract doLogin(): Promise<void>;
	readonly abstract isLoggedIn: boolean;
	abstract close(): Promise<void>;

	async login(): Promise<void>{
		let retryCount = 0;
		while(true){
			try {
				retryCount++;
				if(retryCount > 1){
					await new Promise(ok => setTimeout(ok, 2500));
					log("Try #" + retryCount)
				}
				await this.doLogin();
				return;
			} catch(e){
				log("Failed to login: " + e.stack)
				try {
					await this.close();
				} catch(e){
					log("Failed to close: " + e)
				}
			}
		}
	}

}