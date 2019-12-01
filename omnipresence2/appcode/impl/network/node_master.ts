import * as net from "net";
import {NetworkNode, CommandMessage, ConfirmationMessage} from "./node";
import {DefinitionBundle} from "interfaces/config";
import {sendJsonMessage, receiveJsonMessages} from "./binary_protocol";
import {log} from "impl/log";
import {Command, Host} from "interfaces/command";

/** Класс, позволяющий рассылать сообщения по сети */
export class NetworkMasterNode extends NetworkNode {

	private readonly remotes = new Map<string, RemoteNode>();
	private readonly usedHosts = new Set<Host>();

	constructor(config: DefinitionBundle){
		super(config);
	}

	registerHost(host: Host){
		this.usedHosts.add(host)
	}

	start(): Promise<void>{
		return new Promise(async (ok, bad) => {
			try {
				for(let host of this.usedHosts){
					let socket = new net.Socket();
					socket.on("close", () => {
						log("Slave disconnected: " + host.name)
					})
					await new Promise(ok => socket.connect(this.port, host.definition.ip || host.definition.hostname, ok));
					log("Slave connected: " + host.name)
					this.remotes.set(host.name, new RemoteNode(socket));
				}
				ok();
			} catch(e){ bad(e) }
		})
	}

	send(hostName: string, command: Command): Promise<boolean> {
		let remote = this.remotes.get(hostName);
		if(!remote)
			throw new Error("Required host not found: \"" + hostName + "\".");
		return remote.send(command);
	}
}

class RemoteNode {
	private readonly handlers = new Map<number, (success: boolean) => void>();
	private idCounter: number = 0;
	private readonly socket: net.Socket;

	constructor(socket: net.Socket){
		this.socket = socket;
		receiveJsonMessages(socket, msg => this.processMessage(msg));
	}

	private processMessage(message: ConfirmationMessage){
		try {
			let handler = this.handlers.get(message.id);
			this.handlers.delete(message.id);
			if(this.handlers.size === 0)
				this.idCounter = 0;
			(handler as ((success: boolean) => void))(message.success);
		} catch(e){
			log("Failed to process incoming confirmation message:")
			log(e.stack);
		}
	}

	send(command: Command): Promise<boolean>{
		return new Promise((ok, bad) => {
			try {
				let message: CommandMessage = { id: this.idCounter++, command };
				sendJsonMessage(this.socket, message);
				this.handlers.set(message.id, ok);
			} catch(e){ bad(e) }
		})
	}

	
}